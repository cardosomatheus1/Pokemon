/* A LIGA DE PREVISÃO NO SERVIDOR (R36) — Spec §6.8 e §6.10.
 *
 * Ranking por CALIBRAÇÃO, **sem stake e sem risco econômico**. Nada aqui toca
 * `carteiras` nem `wallet_ledger`, e é de propósito: previsão que pagasse seria
 * outro produto, com outro enquadramento regulatório. Por não movimentar valor,
 * a Liga é a única via competitiva que não depende do checkpoint do §25.1.
 *
 * ── A DIVISÃO DE TRABALHO ─────────────────────────────────────────────────
 *
 * A CONTA mora em `engine/calibracao.mjs`: pura, sem banco, testada sozinha.
 * Este arquivo é o que a conta não pode saber — quem disse o quê, quando, se a
 * rodada ainda estava aberta, e quais contas são a mesma pessoa.
 *
 * ── AS TRÊS REGRAS DO §6.8, E ONDE CADA UMA VIVE ─────────────────────────
 *
 *   "volume de previsões não substitui qualidade no ranking"
 *       Resolvida no motor (R31): média encolhida para a população, com
 *       amostra mínima. Aqui só se guarda `sample_size`.
 *
 *   "previsão liquidada não reabre"
 *       Duas guardas, e as duas precisam existir. O `UNIQUE` do esquema impede
 *       a segunda previsão da mesma rodada; `pontuarRodada` recusa reescrever
 *       linha que já tem nota. Só o `UNIQUE` deixaria a nota ser recalculada;
 *       só a checagem em código deixaria a corrida entre dois pedidos gravar
 *       duas linhas.
 *
 *   "contas ligadas não somam"
 *       Reusa `identidade_ligada` e `contasLigadas()`, que já existem para a
 *       autoexclusão valer por PESSOA (§28.4). Inventar uma segunda noção de
 *       "ligada" criaria duas respostas para a mesma pergunta, e elas
 *       divergiriam no primeiro dia em que alguém editasse uma.
 *
 * ── A JANELA: PREVISÃO SÓ COM A RODADA ABERTA ────────────────────────────
 *
 * Depois de `travada`, o elenco e as odds estão publicados e a batalha já foi
 * decidida pelo commit da semente. Aceitar previsão ali não é medir leitura: é
 * medir quem consegue mandar um POST depois do fato. A janela é a MESMA da
 * aposta, e pelo mesmo motivo.
 */
import { randomUUID } from 'node:crypto';
import { brier, erros as errosDaDistribuicao, ranquear,
         AMOSTRA_MINIMA, VERSAO_PONTUACAO } from '../engine/calibracao.mjs';
import { contasLigadas } from './protecao.mjs';

export const ERRO_LIGA = {
  RODADA: 'liga/rodada',
  JANELA: 'liga/janela',
  DISTRIBUICAO: 'liga/distribuicao',
  REPETIDA: 'liga/repetida',
  LIQUIDADA: 'liga/liquidada',
};

function erro(codigo, mensagem) {
  const e = new Error(mensagem);
  e.codigo = codigo;
  return e;
}

/* O único mercado da V2. Fica numa constante e não literal espalhado porque o
   §6.10 já prevê outros (`market_kind`), e a hora de descobrir que o valor foi
   escrito de três jeitos é a hora de acrescentar o segundo. */
export const MERCADO_VENCEDOR = 'vencedor';

/* ─── registrar uma previsão ─────────────────────────────────────────────── */

export function registrarPrevisao(db, { userId, roundId, distribuicao,
                                        mercado = MERCADO_VENCEDOR,
                                        agora = Date.now() }) {
  const rodada = db.prepare(
    `SELECT status, betting_locks_at FROM rounds WHERE id = ?`).get(roundId);
  if (!rodada) throw erro(ERRO_LIGA.RODADA, 'rodada desconhecida');

  /* A JANELA, e ela é conferida pelos DOIS lados. O status pode estar atrasado
     em relação ao relógio se o scheduler ainda não passou; o relógio pode estar
     à frente do status se alguém adiantar a máquina. Exigir os dois fecha a
     fresta entre eles — mesma decisão do fecho de aposta no F1.7. */
  if (rodada.status !== 'aberta')
    throw erro(ERRO_LIGA.JANELA, 'a rodada não está aberta para previsão');
  if (agora >= rodada.betting_locks_at)
    throw erro(ERRO_LIGA.JANELA, 'a janela de previsão já fechou');

  /* QUANTOS RESULTADOS ESTA RODADA TEM. A distribuição é sobre os lutadores
     DESTA rodada, e o número não é constante do produto: vem da tabela. */
  const { n } = db.prepare(
    `SELECT COUNT(*) AS n FROM round_fighters WHERE round_id = ?`).get(roundId);
  if (!n) throw erro(ERRO_LIGA.RODADA, 'a rodada ainda não tem elenco publicado');

  /* A DISTRIBUIÇÃO É RECUSADA, NUNCA NORMALIZADA. Normalizar inventaria uma
     opinião que o jogador não teve e depois o pontuaria por ela — ver a
     decisão 3 do cabeçalho de `engine/calibracao.mjs`. */
  const problemas = errosDaDistribuicao(distribuicao, n);
  if (problemas.length)
    throw erro(ERRO_LIGA.DISTRIBUICAO, problemas.join(' · '));

  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO predictions (id, round_id, user_id, market_kind,
                                distribution_json, created_at)
       VALUES (?,?,?,?,?,?)`)
      .run(id, roundId, userId, mercado, JSON.stringify(distribuicao), agora);
  } catch (e) {
    /* O `UNIQUE` do esquema é quem de fato segura a segunda previsão, inclusive
       contra duas requisições no mesmo instante. Conferir antes com um SELECT
       seria uma corrida com nome bonito. */
    if (String(e).includes('UNIQUE'))
      throw erro(ERRO_LIGA.REPETIDA, 'já existe previsão sua para esta rodada');
    throw e;
  }
  return { id, roundId, mercado, criadaEm: agora };
}

/* ─── liquidar ───────────────────────────────────────────────────────────── */

/* Pontua todas as previsões de uma rodada encerrada.
 *
 * IDEMPOTENTE POR CONSTRUÇÃO: o `WHERE score IS NULL` é o que faz a segunda
 * chamada não mexer em nada. É a regra "previsão liquidada não reabre" escrita
 * onde ela não pode ser esquecida — e não numa checagem que quem chama precisa
 * lembrar de fazer.
 *
 * Recalcular seria pior do que parece: a nota de ontem foi dada sob a fórmula
 * de ontem, e o jogador jogou sob ela. É a mesma razão de `scoring_version`
 * existir. */
export function pontuarRodada(db, roundId, agora = Date.now()) {
  const rodada = db.prepare(
    `SELECT status, champion_species_id FROM rounds WHERE id = ?`).get(roundId);
  if (!rodada) throw erro(ERRO_LIGA.RODADA, 'rodada desconhecida');
  if (rodada.status !== 'encerrada')
    throw erro(ERRO_LIGA.RODADA, 'só rodada encerrada pode ser pontuada');
  if (rodada.champion_species_id === null)
    throw erro(ERRO_LIGA.RODADA, 'a rodada encerrou sem campeão registrado');

  /* O DESFECHO É UM ÍNDICE NA DISTRIBUIÇÃO, e a distribuição é indexada por
     SLOT. Traduzir espécie -> slot aqui, e não guardar o slot vencedor na
     rodada, porque o campeão já está gravado por espécie e duas fontes para o
     mesmo fato é como elas divergem. */
  const vencedor = db.prepare(
    `SELECT slot FROM round_fighters WHERE round_id = ? AND species_id = ?`)
    .get(roundId, rodada.champion_species_id);
  if (!vencedor) throw erro(ERRO_LIGA.RODADA, 'o campeão não está no elenco da rodada');

  const pendentes = db.prepare(
    `SELECT id, distribution_json FROM predictions
      WHERE round_id = ? AND score IS NULL`).all(roundId);

  const gravar = db.prepare(
    `UPDATE predictions SET score = ?, scored_at = ?, scoring_version = ?
      WHERE id = ? AND score IS NULL`);

  let pontuadas = 0, invalidas = 0;
  for (const p of pendentes) {
    let d = null;
    try { d = JSON.parse(p.distribution_json); } catch (e) { d = null; }
    const nota = brier(d, vencedor.slot);
    /* DISTRIBUIÇÃO QUE NÃO PONTUA FICA SEM NOTA, e não com nota ruim.
       Ela só chega aqui se tiver sido gravada por uma versão anterior com
       validação mais frouxa — e inventar uma nota para ela seria pontuar o
       jogador por algo que o servidor de hoje nem aceitaria. Ela some do
       ranking por não ter nota, que é o efeito honesto. */
    if (nota === null) { invalidas++; continue; }
    pontuadas += gravar.run(nota, agora, VERSAO_PONTUACAO, p.id).changes;
  }
  return { roundId, pontuadas, invalidas, vencedorSlot: vencedor.slot };
}

/* ─── o ranking da temporada ─────────────────────────────────────────────── */

/* Junta as previsões liquidadas por jogador, COLAPSA contas ligadas, e entrega
 * ao motor para ordenar.
 *
 * ── POR QUE O COLAPSO ACONTECE AQUI, E NÃO NO MOTOR ─────────────────────
 *
 * "Quais contas são a mesma pessoa" é um fato do BANCO, não da aritmética. O
 * motor recebe uma lista de competidores e ordena; quem decide o que conta como
 * um competidor é este arquivo.
 *
 * ── QUAL CONTA REPRESENTA O GRUPO ────────────────────────────────────────
 *
 * A de MAIOR AMOSTRA, e não a de melhor nota. Escolher a melhor nota
 * transformaria multi-conta em VANTAGEM: bastaria abrir cinco contas, prever
 * com todas e ficar com a que deu sorte — que é exatamente o farm que o §6.8
 * proíbe e que o §1546 da Spec descreve.
 *
 * Escolher a de maior amostra tem a propriedade oposta: espalhar previsões
 * entre contas PIORA o resultado, porque a evidência do grupo fica dividida.
 * O incentivo aponta para uma conta só, que é o comportamento desejado.
 */
export function rankingDaTemporada(db, seasonId, { agora = Date.now() } = {}) {
  /* A TEMPORADA RECORTA POR `scored_at`, e não por `created_at`: o que entra na
     temporada é o que foi LIQUIDADO nela. Previsão feita no último minuto de
     uma temporada e liquidada na seguinte pertence à seguinte — senão a
     classificação de uma temporada fechada mudaria depois de fechada. */
  const linhas = db.prepare(
    `SELECT user_id, COUNT(*) AS amostra, SUM(score) AS soma
       FROM predictions
      WHERE score IS NOT NULL AND scoring_version = ?
      GROUP BY user_id`).all(VERSAO_PONTUACAO);

  /* O COLAPSO. `contasLigadas` faz o fecho transitivo — o comentário dela
     registra por quê: "sem o fecho, a terceira conta contorna, e três contas é
     o segundo passo óbvio de quem já deu o primeiro". Vale igual aqui. */
  const porUsuario = new Map(linhas.map(l => [l.user_id, l]));
  const jaVisto = new Set();
  const competidores = [];
  for (const l of linhas) {
    if (jaVisto.has(l.user_id)) continue;
    const grupo = [l.user_id, ...contasLigadas(db, l.user_id)];
    for (const u of grupo) jaVisto.add(u);
    const doGrupo = grupo.map(u => porUsuario.get(u)).filter(Boolean);
    /* A de maior amostra representa; empate desempata pelo id, para que duas
       leituras da mesma temporada devolvam a mesma linha. */
    const dono = doGrupo.sort((a, b) =>
      b.amostra - a.amostra || String(a.user_id).localeCompare(String(b.user_id)))[0];
    competidores.push({
      id: dono.user_id,
      amostra: dono.amostra,
      soma: dono.soma,
      /* Quantas contas o grupo tem, para a tela poder dizer que houve colapso.
         Esconder isso faria a pessoa procurar as outras linhas sem entender. */
      contasNoGrupo: grupo.filter(u => porUsuario.has(u)).length,
    });
  }

  const ordenado = ranquear(competidores);

  /* MATERIALIZA em `calibration_ratings`. A tabela é cache legível pelo painel
     e pela tela; a VERDADE continua sendo `predictions`, e é dela que este
     cálculo sempre parte. Cache que vira fonte é a próxima classe de defeito —
     é o que o comentário de `protection_status` já registra neste banco. */
  const upsert = db.prepare(
    `INSERT INTO calibration_ratings (user_id, season_id, sample_size, score, rank, updated_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT (user_id, season_id) DO UPDATE SET
       sample_size = excluded.sample_size, score = excluded.score,
       rank = excluded.rank, updated_at = excluded.updated_at`);
  for (const l of ordenado)
    upsert.run(l.id, seasonId, l.amostra, l.nota, l.posto, agora);

  return ordenado;
}

/* O que uma pessoa vê sobre si — o começo do "perfil de leitura" do §6.9.
 *
 * A REGRA DE HONESTIDADE DO §28.5 VALE AQUI: acerto e erro com o mesmo
 * destaque, e o tamanho da amostra visível. Devolver só as melhores previsões
 * transformaria a ferramenta de aprendizado em máquina de autoengano — e é uma
 * tentação real, porque a lista fica mais bonita. */
export function minhasPrevisoes(db, userId, { limite = 50 } = {}) {
  const linhas = db.prepare(
    `SELECT id, round_id, market_kind, distribution_json, created_at,
            score, scored_at, scoring_version
       FROM predictions WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?`).all(userId, limite);

  const liquidadas = linhas.filter(l => l.score !== null);
  const soma = liquidadas.reduce((a, l) => a + l.score, 0);
  const amostra = liquidadas.length;

  return {
    previsoes: linhas,
    amostra,
    /* A média CRUA aqui, e a encolhida no ranking. Nesta tela o jogador quer
       saber como ELE foi; no ranking, como ele se compara. São perguntas
       diferentes e o número honesto para cada uma é diferente. */
    brierMedio: amostra ? soma / amostra : null,
    faltaParaRanquear: Math.max(0, AMOSTRA_MINIMA - amostra),
  };
}
