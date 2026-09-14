/* Q1/Q3/Q6 · A LIGA DE PREVISÃO NO SERVIDOR (R36) — Spec §6.8 e §6.10.
 *
 * ── O QUE ESTE ARQUIVO GUARDA ─────────────────────────────────────────────
 *
 * A conta já tem suíte própria (`test/calibracao.mjs`, R31): Brier, encolhimento
 * e ranking, tudo puro. Aqui é o que a conta não pode saber — quem disse o quê,
 * quando, se a rodada ainda estava aberta, e quais contas são a mesma pessoa.
 *
 * As três regras do §6.8 são o esqueleto da suíte, e cada uma tem um jeito
 * próprio de falhar em silêncio:
 *
 *   "previsão liquidada não reabre"
 *       falha quando alguém reprocessa uma rodada e as notas mudam. Ninguém vê,
 *       porque a tabela continua com o mesmo número de linhas.
 *
 *   "contas ligadas não somam"
 *       falha quando a pessoa abre cinco contas e fica com a de melhor sorte. A
 *       tela fica linda: um ranking cheio de gente calibrada.
 *
 *   "volume não substitui qualidade"
 *       já resolvida no motor; aqui só se confere que o servidor não a desfaz
 *       ao montar os competidores.
 *
 * ── E A REGRA QUE NÃO ESTÁ NO §6.8, MAS DECIDE TUDO ──────────────────────
 *
 * Previsão só com a rodada ABERTA. Depois de travada, o elenco e as odds estão
 * publicados e a batalha já foi decidida pelo commit da semente: aceitar
 * previsão ali não mede leitura, mede quem consegue mandar um POST depois do
 * fato. É a mesma janela da aposta, e é Q6 — não é conveniência, é a diferença
 * entre um ranking de calibração e um ranking de latência.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { criarScheduler, FASE_MS } from '../server/scheduler.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { AMOSTRA_MINIMA, VERSAO_PONTUACAO, brier } from '../engine/calibracao.mjs';
import { ERRO_LIGA, minhasPrevisoes, pontuarRodada, rankingDaTemporada,
         registrarPrevisao } from '../server/liga.mjs';

const SIMS_TESTE = 600;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cenario({ jogadores = 1 } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = Date.UTC(2026, 0, 15);
  const sched = criarScheduler({ db, sims: SIMS_TESTE, relogio: () => agora });
  const us = Array.from({ length: jogadores }, (_, i) =>
    cadastrar(db, { username: `j${i}`, email: `j${i}@exemplo.test`,
                    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora }));
  const r = sched.abrirRodada();
  return { db, sched, us, u: us[0], r,
           avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

/* Quantos lutadores a rodada publicou. A distribuição é sobre ELES, e o número
   vem da tabela — não é constante do produto. */
const nDaRodada = (db, roundId) =>
  db.prepare(`SELECT COUNT(*) AS n FROM round_fighters WHERE round_id=?`).get(roundId).n;

const uniforme = n => Array.from({ length: n }, () => 1 / n);

/* LEVA A RODADA ATÉ O FIM PELO CAMINHO REAL, e não escrevendo o estado no
 * banco.
 *
 * A primeira versão deste auxiliar fazia `UPDATE rounds SET status='encerrada'`
 * direto. Funcionava para uma rodada e quebrava na segunda: o scheduler guarda
 * a rodada ATUAL em memória, e o `UPDATE` não a alcança — `abrirRodada` recusava
 * com "já existe rodada em andamento".
 *
 * Escrever o estado à mão também mediria menos: o campeão passaria a ser o que
 * o teste escolheu, e não o que a batalha produziu. Deixando o scheduler
 * encerrar, a pontuação é conferida contra o desfecho DE VERDADE.
 *
 * Devolve o slot que venceu, para o teste comparar a nota. */
function encerrarRodada(c, roundId) {
  c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
  c.sched.tick(); c.sched.tick(); c.sched.tick();
  const r = c.db.prepare(
    `SELECT status, champion_species_id FROM rounds WHERE id=?`).get(roundId);
  if (r.status !== 'encerrada')
    throw new Error(`a rodada terminou em "${r.status}" — o auxiliar precisa de revisão`);
  const f = c.db.prepare(
    `SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
    .get(roundId, r.champion_species_id);
  return f.slot;
}

export function suite() {
  const s = criarSuite('liga-servidor');

  /* ═══ o caminho feliz ════════════════════════════════════════════════════ */

  s.teste('a previsão é gravada com o que o jogador disse, no texto em que disse', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const d = uniforme(n);
    const p = registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                        distribuicao: d, agora: c.agoraDe() });
    ok(p && p.id, 'a previsão não foi criada');
    const linha = c.db.prepare(`SELECT * FROM predictions WHERE id=?`).get(p.id);
    igual(JSON.parse(linha.distribution_json).length, n, 'a distribuição gravada mudou de tamanho');
    /* SEM NOTA AO NASCER. `score` nulo é "ainda não liquidada"; zero é a NOTA
       PERFEITA em Brier, e usá-lo como ausência poria quem nunca foi pontuado
       no topo do ranking. */
    igual(linha.score, null, 'a previsão nasceu com nota');
    igual(linha.scoring_version, null, 'a previsão nasceu com versão de pontuação');
  });

  /* ═══ Q6 · a janela ══════════════════════════════════════════════════════ */

  s.teste('previsão depois do travamento é recusada', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    c.db.prepare(`UPDATE rounds SET status='travada' WHERE id=?`).run(c.r.id);
    const e = recusa(() => registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                                     distribuicao: uniforme(n), agora: c.agoraDe() }));
    ok(e, 'a previsão passou com a rodada travada');
    igual(e.codigo, ERRO_LIGA.JANELA,
      'a recusa não é de janela — o cliente não vai saber que basta esperar a próxima');
  });

  /* A JANELA É CONFERIDA PELOS DOIS LADOS, e este teste é o segundo deles: o
     status pode estar atrasado em relação ao relógio se o scheduler ainda não
     passou. Sem esta conferência, existe uma fresta entre o instante do
     `locks_at` e o instante em que alguém marca `travada`. */
  s.teste('previsão depois do relógio de travamento é recusada mesmo com o status atrasado', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const trava = c.db.prepare(`SELECT betting_locks_at FROM rounds WHERE id=?`)
      .get(c.r.id).betting_locks_at;
    c.avancar(trava - c.agoraDe() + 1);
    igual(c.db.prepare(`SELECT status FROM rounds WHERE id=?`).get(c.r.id).status, 'aberta',
      'a rodada já mudou de status sozinha — este teste precisa da fresta para valer');
    const e = recusa(() => registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                                     distribuicao: uniforme(n), agora: c.agoraDe() }));
    ok(e && e.codigo === ERRO_LIGA.JANELA,
      'a fresta entre o relógio e o status deixou passar uma previsão');
  });

  /* ═══ a distribuição é recusada, nunca consertada ════════════════════════ */

  s.teste('distribuição inválida é recusada, e nada é gravado', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const ruim = uniforme(n).map((x, i) => (i === 0 ? x + 0.3 : x));   // soma 1,3
    const e = recusa(() => registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                                     distribuicao: ruim, agora: c.agoraDe() }));
    ok(e && e.codigo === ERRO_LIGA.DISTRIBUICAO, `a distribuição que soma 1,3 passou: ${e}`);
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM predictions`).get().n, 0,
      'a distribuição inválida foi GRAVADA — normalizar depois seria pontuar o ' +
      'jogador por uma opinião que ele não teve');
  });

  s.teste('distribuição de tamanho diferente do elenco é recusada', () => {
    const c = cenario();
    const e = recusa(() => registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                                     distribuicao: [0.5, 0.5], agora: c.agoraDe() }));
    ok(e && e.codigo === ERRO_LIGA.DISTRIBUICAO,
      'uma distribuição de 2 passou numa rodada de doze lutadores');
  });

  /* ═══ §6.8 · previsão liquidada não reabre ═══════════════════════════════ */

  s.teste('uma previsão por rodada, e a segunda é recusada', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                              distribuicao: uniforme(n), agora: c.agoraDe() });
    const e = recusa(() => registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                                     distribuicao: uniforme(n), agora: c.agoraDe() }));
    ok(e && e.codigo === ERRO_LIGA.REPETIDA,
      'a segunda previsão da mesma rodada passou. Quem manda doze previsões fica ' +
      'com a melhor delas depois, que é o oposto de medir calibração.');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM predictions`).get().n, 1,
      'ficaram duas linhas para a mesma rodada');
  });

  s.teste('a nota sai da mesma conta do motor, e viaja com a versão', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const d = uniforme(n);
    const p = registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                        distribuicao: d, agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    const rp = pontuarRodada(c.db, c.r.id, c.agoraDe());
    igual(rp.pontuadas, 1, 'a previsão não foi pontuada');
    const linha = c.db.prepare(`SELECT * FROM predictions WHERE id=?`).get(p.id);
    dentro(linha.score, brier(d, venc), 1e-12,
      'a nota gravada não é a que o motor calcula para a mesma distribuição');
    igual(linha.scoring_version, VERSAO_PONTUACAO,
      'a nota foi gravada sem a versão da fórmula — ninguém saberá sob qual regra ela nasceu');
    ok(linha.scored_at, 'a nota foi gravada sem o instante da liquidação');
  });

  /* A REGRA CENTRAL DO §6.8, e ela falha em SILÊNCIO: reprocessar uma rodada
     não pode mudar nota nenhuma. A tabela continua com o mesmo número de
     linhas, e a classificação de uma temporada fechada muda por baixo. */
  s.teste('reprocessar a rodada não mexe em nota nenhuma', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const p = registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                        distribuicao: uniforme(n), agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());
    const antes = c.db.prepare(`SELECT score, scored_at, scoring_version FROM predictions WHERE id=?`)
      .get(p.id);

    c.avancar(60_000);
    const segunda = pontuarRodada(c.db, c.r.id, c.agoraDe());
    igual(segunda.pontuadas, 0, 'a segunda liquidação pontuou de novo');
    const depois = c.db.prepare(`SELECT score, scored_at, scoring_version FROM predictions WHERE id=?`)
      .get(p.id);
    igual(depois.score, antes.score, 'a nota mudou ao reprocessar');
    igual(depois.scored_at, antes.scored_at, 'o instante da liquidação foi reescrito');
  });

  /* AS DUAS GUARDAS DA IDEMPOTÊNCIA, e por que o teste é sobre a CONSTRUÇÃO.
   *
   * `pontuarRodada` filtra `score IS NULL` em dois lugares — no `SELECT` que
   * escolhe o que pontuar e no `UPDATE` que grava. O Q2 plantou a remoção de
   * cada uma (`S467`, `S468`) e as duas PASSARAM no teste de comportamento
   * acima, porque cada guarda sozinha já segura o reprocessamento.
   *
   * Isso não as torna redundantes: elas cobrem coisas diferentes.
   *
   *   o `SELECT`  é o contrato legível da função — "eu só olho o que falta" —
   *               e o que faz reprocessar uma rodada antiga custar nada;
   *   o `UPDATE`  é a CORRIDA. Duas chamadas simultâneas leem a mesma lista de
   *               pendentes; sem o filtro na gravação, a segunda reescreve
   *               `scored_at` e `scoring_version` de notas que a primeira
   *               acabou de dar.
   *
   * A corrida não cabe num teste síncrono contra SQLite em memória, e inventar
   * um teste que finge simulá-la seria pior que este: ele passaria sem provar
   * nada. Asserção estreita e honesta vale mais que larga e falsa — é a mesma
   * decisão registrada no `test/banner.mjs` sobre a colocação ao vivo.
   *
   * O que este teste guarda é que ninguém remova UMA delas achando que "a
   * outra cobre". Cobre hoje, no caminho de uma chamada por vez. */
  s.teste('a idempotência tem as duas guardas, e não uma que basta', () => {
    const fonte = readFileSync(new URL('../server/liga.mjs', import.meta.url), 'utf8');
    const corpo = fonte.slice(fonte.indexOf('export function pontuarRodada'),
                              fonte.indexOf('/* ─── o ranking'));
    ok(corpo.length > 200, 'não achei o corpo de `pontuarRodada`');

    const leitura = corpo.match(/SELECT id, distribution_json[\s\S]*?\.all\(roundId\)/);
    ok(leitura && /score IS NULL/.test(leitura[0]),
      'o `SELECT` de `pontuarRodada` deixou de filtrar `score IS NULL`. Reprocessar ' +
      'uma rodada antiga passa a recalcular Brier de tudo que já foi pontuado, e o ' +
      'contrato da função deixa de ser legível no próprio SQL.');

    const gravacao = corpo.match(/UPDATE predictions SET[\s\S]*?`\)/);
    ok(gravacao && /score IS NULL/.test(gravacao[0]),
      'o `UPDATE` de `pontuarRodada` deixou de exigir `score IS NULL`. Duas ' +
      'liquidações simultâneas leem a mesma lista de pendentes, e a segunda ' +
      'reescreve `scored_at` e `scoring_version` de notas que a primeira acabou ' +
      'de dar — a classificação de uma temporada muda por baixo, sem erro nenhum.');
  });

  s.teste('rodada não encerrada não pode ser pontuada', () => {
    const c = cenario();
    const e = recusa(() => pontuarRodada(c.db, c.r.id, c.agoraDe()));
    ok(e && e.codigo === ERRO_LIGA.RODADA,
      'uma rodada aberta foi pontuada — a nota sairia de um campeão que ainda não existe');
  });

  /* ═══ §6.8 · contas ligadas não somam ════════════════════════════════════
   *
   * O modo de falha é bonito na tela: um ranking cheio de gente calibrada, que
   * é uma pessoa só com cinco contas. */

  s.teste('contas ligadas entram no ranking como um competidor só', () => {
    const c = cenario({ jogadores: 3 });
    const [a, b, terceiro] = c.us;
    ligarContas(c.db, { userId: a.id, outroId: b.id, sinal: 'dispositivo', agora: c.agoraDe() });

    /* Uma previsão liquidada para cada um dos três. */
    const n = nDaRodada(c.db, c.r.id);
    for (const u of c.us)
      registrarPrevisao(c.db, { userId: u.id, roundId: c.r.id,
                                distribuicao: uniforme(n), agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());

    const linhas = rankingDaTemporada(c.db, 'atual', { agora: c.agoraDe() });
    igual(linhas.length, 2,
      `o ranking saiu com ${linhas.length} competidores para três contas, das quais ` +
      `duas são a mesma pessoa`);
    const grupo = linhas.find(l => l.id === a.id || l.id === b.id);
    igual(grupo.contasNoGrupo, 2,
      'a linha do grupo não diz quantas contas ele tem — a pessoa procuraria a ' +
      'outra linha sem entender por que sumiu');
    ok(linhas.some(l => l.id === terceiro.id), 'a conta não-ligada sumiu do ranking');
  });

  /* QUAL CONTA REPRESENTA O GRUPO, e por que essa escolha e não a outra.
   *
   * A de MAIOR AMOSTRA. Escolher a de MELHOR NOTA transformaria multi-conta em
   * VANTAGEM: abrir cinco contas, prever com todas, ficar com a que deu sorte —
   * que é exatamente o farm que o §6.8 proíbe e que o §1546 da Spec descreve.
   *
   * Com a maior amostra o incentivo inverte: espalhar previsões entre contas
   * DIVIDE a evidência do grupo e piora a posição. */
  s.teste('quem representa o grupo é a conta de maior amostra, e não a de melhor sorte', () => {
    const c = cenario({ jogadores: 2 });
    const [a, b] = c.us;
    ligarContas(c.db, { userId: a.id, outroId: b.id, sinal: 'dispositivo', agora: c.agoraDe() });

    /* `a` prevê em três rodadas; `b` em uma só. Depois as NOTAS são fixadas
       para que as duas regras DISCORDEM sem sombra de dúvida: `b` fica com a
       melhor média e `a` com a maior amostra.
     *
     * ── POR QUE AS NOTAS SÃO FIXADAS, E NÃO JOGADAS ────────────────────
     *
     * A primeira versão deste teste dava a `b` uma previsão de certeza no slot
     * 0 e torcia para que ela acertasse. Quando a batalha escolhia outro slot,
     * a média de `b` piorava, `a` passava a ser o melhor pelos DOIS critérios,
     * e a mutação `S470` escapava — o teste ficava verde sem provar nada.
     *
     * Quem está sob teste aqui é a ESCOLHA DO REPRESENTANTE, não a pontuação;
     * a pontuação já tem os testes dela logo acima. Fixar as notas isola o que
     * se quer medir e tira o desfecho da batalha da conta. */
    const criar = (userId, rodada, d) =>
      registrarPrevisao(c.db, { userId, roundId: rodada, distribuicao: d, agora: c.agoraDe() });

    const n = nDaRodada(c.db, c.r.id);
    criar(a.id, c.r.id, uniforme(n));
    criar(b.id, c.r.id, uniforme(n));
    encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());

    /* Mais duas rodadas só para `a`, para ele ficar com a maior amostra.
       Pelo caminho real do scheduler: forçar `encerrada` no banco deixaria a
       rodada ATUAL viva na memória dele, e a abertura seguinte seria recusada
       com "já existe rodada em andamento". */
    for (let k = 0; k < 2; k++) {
      const r2 = c.sched.abrirRodada();
      const n2 = nDaRodada(c.db, r2.id);
      criar(a.id, r2.id, uniforme(n2));
      encerrarRodada(c, r2.id);
      pontuarRodada(c.db, r2.id, c.agoraDe());
    }

    /* `a`: três notas de 1,2 -> média 1,2 e amostra 3
       `b`: uma nota de 0,1  -> média 0,1 e amostra 1
       Pela MELHOR NOTA, `b` representa. Pela MAIOR AMOSTRA, `a`. */
    c.db.prepare(`UPDATE predictions SET score = 1.2 WHERE user_id = ?`).run(a.id);
    c.db.prepare(`UPDATE predictions SET score = 0.1 WHERE user_id = ?`).run(b.id);

    const linhas = rankingDaTemporada(c.db, 'atual', { agora: c.agoraDe() });
    igual(linhas.length, 1, 'o grupo não foi colapsado numa linha só');
    igual(linhas[0].id, a.id,
      'o grupo foi representado pela conta de MELHOR NOTA. Assim, abrir contas ' +
      'e ficar com a de sorte vira estratégia — que é o farm que o §6.8 proíbe.');
    igual(linhas[0].amostra, 3, 'a amostra do grupo não é a da conta que o representa');
  });

  /* O fecho transitivo: A–B e B–C fazem de A, B e C uma pessoa só. Sem ele, a
     terceira conta contorna — e é o que o comentário de `contasLigadas` já
     registra para a autoexclusão. */
  s.teste('a ligação é transitiva: A-B e B-C colapsam os três', () => {
    const c = cenario({ jogadores: 3 });
    const [a, b, d] = c.us;
    ligarContas(c.db, { userId: a.id, outroId: b.id, sinal: 'dispositivo', agora: c.agoraDe() });
    ligarContas(c.db, { userId: b.id, outroId: d.id, sinal: 'rede', agora: c.agoraDe() });
    const n = nDaRodada(c.db, c.r.id);
    for (const u of c.us)
      registrarPrevisao(c.db, { userId: u.id, roundId: c.r.id,
                                distribuicao: uniforme(n), agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());
    const linhas = rankingDaTemporada(c.db, 'atual', { agora: c.agoraDe() });
    igual(linhas.length, 1,
      `três contas ligadas em cadeia viraram ${linhas.length} competidores. Sem o ` +
      `fecho, a terceira conta contorna — e três contas é o segundo passo óbvio ` +
      `de quem já deu o primeiro.`);
  });

  /* ═══ o que a pessoa vê sobre si (§6.9) ══════════════════════════════════ */

  s.teste('o perfil de leitura mostra a amostra e o quanto falta para ranquear', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                              distribuicao: uniforme(n), agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());
    const meu = minhasPrevisoes(c.db, c.u.id);
    igual(meu.amostra, 1, 'a amostra não bate');
    igual(meu.faltaParaRanquear, AMOSTRA_MINIMA - 1,
      'o perfil não diz quanto falta para entrar no ranking — a pessoa fica ' +
      'procurando a própria linha sem saber por que ela não está lá');
    ok(meu.brierMedio !== null, 'a nota média não foi calculada');
  });

  /* A REGRA DE HONESTIDADE DO §28.5 APLICADA AQUI: a lista traz acerto E erro.
     Devolver só as melhores deixaria a tela mais bonita e a ferramenta inútil —
     "mostrar só os acertos transforma a ferramenta de aprendizado em máquina de
     autoengano", nas palavras do próprio §6.9. */
  s.teste('o perfil de leitura não esconde as previsões ruins', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const certeza = i => Array.from({ length: n }, (_, k) => (k === i ? 1 : 0));

    /* ── ESTE TESTE SE DECLARAVA DETERMINÍSTICO E NÃO ERA (D-048) ──────────
     *
     * A versão anterior fazia duas previsões de certeza, em slots diferentes,
     * em DUAS RODADAS, com este raciocínio no comentário:
     *
     *     "o que dá é garantir que PELO MENOS UMA das duas erre"
     *
     * Isso valeria na MESMA rodada, onde só um slot pode vencer. Em duas
     * rodadas independentes as duas podem estar certas: o campeão da primeira
     * ser o slot 0 e o da segunda ser o slot 1. Aí nenhuma nota é 2, o teste
     * não consegue provar o que afirma, e reprova.
     *
     * Estruturalmente são ~0,083 × 0,083 ≈ 0,7% das execuções — a mesma ordem
     * de grandeza do D-044, e baixo o bastante para 40 execuções isoladas
     * voltarem todas verdes. Ele apareceu abortando um `npm run portoes`, que é
     * exatamente onde instabilidade custa caro.
     *
     * A CORREÇÃO É DEPENDER DE UM FATO ESTABELECIDO, e não de um sorteado. O
     * teste espia o campeão — só o TESTE pode, é o ponto do commit-reveal que
     * ninguém mais consiga — e crava a certeza num slot QUE NÃO É ELE. O erro
     * passa a ser garantido por construção, a nota 2 também, e basta UMA
     * rodada. */
    const campeao = c.sched.espiarCampeao(c.r.id);
    const slotCampeao = c.db.prepare(
      `SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
      .get(c.r.id, campeao).slot;
    const slotErrado = slotCampeao === 0 ? 1 : 0;

    registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                              distribuicao: certeza(slotErrado), agora: c.agoraDe() });
    encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());

    /* A SEGUNDA PREVISÃO CONTINUA EXISTINDO, e o motivo é outro: a asserção
       final é que a lista mostra AS DUAS e que a amostra conta 2. Uma previsão
       só provaria que a ruim aparece, e não que ela não é escondida no meio das
       outras — que é o que o §6.9 exige. Esta pode acertar ou errar; o teste
       não depende disso. */
    c.avancar(600_000);
    const r2 = c.sched.abrirRodada();
    const n2 = nDaRodada(c.db, r2.id);
    registrarPrevisao(c.db, { userId: c.u.id, roundId: r2.id,
                              distribuicao: Array.from({ length: n2 }, (_, k) => (k === 1 ? 1 : 0)),
                              agora: c.agoraDe() });
    encerrarRodada(c, r2.id);
    pontuarRodada(c.db, r2.id, c.agoraDe());

    const meu = minhasPrevisoes(c.db, c.u.id);
    igual(meu.previsoes.length, 2, 'uma das previsões sumiu da lista');

    /* A ASSERÇÃO É SOBRE A PREVISÃO QUE O TESTE GARANTIU RUIM, e não sobre "uma
       das duas". `notas.some(x => x === 2)` deixava a segunda previsão — que
       pode acertar ou errar — satisfazer o teste sozinha; com isso a asserção
       ficava verde mesmo quando a primeira acertava, e o teste voltava a
       depender do sorteio por outro caminho.
       Achado sabotando o conserto do D-048: trocar `slotErrado` por
       `slotCampeao` deixava a suíte VERDE, o que provava que a asserção não
       media o que o nome dela promete. */
    const ruim = meu.previsoes.find(p => p.round_id === c.r.id);
    ok(ruim, 'a previsão da primeira rodada sumiu da lista');
    igual(ruim.score, 2,
      `a previsão cravada num slot que NÃO venceu tirou nota ${ruim.score}, e a ` +
      `nota máxima do Brier é 2. Uma certeza errada é a pior previsão possível — ` +
      `se ela não aparece com a nota que merece, o perfil de leitura está ` +
      `escondendo o que o §6.9 existe para mostrar.`);
    igual(meu.amostra, 2, 'a amostra não conta as duas');
  });

  /* ═══ Q6 · nada aqui move dinheiro ═══════════════════════════════════════
   *
   * A Liga é a única via competitiva que não depende do checkpoint do §25.1, e
   * a razão é exatamente esta: ela não movimenta valor. No dia em que uma linha
   * de ledger nascer daqui, isso deixa de ser verdade — e o teste é o que
   * transforma "não deve" em "não pode sem alguém ver". */
  s.teste('registrar e pontuar não escrevem no ledger nem na carteira', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const antes = {
      ledger: c.db.prepare(`SELECT COUNT(*) AS n FROM wallet_ledger`).get().n,
      carteira: c.db.prepare(`SELECT COUNT(*) AS n FROM carteiras`).get().n,
    };
    registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                              distribuicao: uniforme(n), agora: c.agoraDe() });
    const venc = encerrarRodada(c, c.r.id);
    pontuarRodada(c.db, c.r.id, c.agoraDe());
    rankingDaTemporada(c.db, 'atual', { agora: c.agoraDe() });
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM wallet_ledger`).get().n, antes.ledger,
      'a Liga escreveu no ledger. Sem stake é o que a mantém fora do §25.1.');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM carteiras`).get().n, antes.carteira,
      'a Liga mexeu na carteira');
  });

  /* ═══ o esquema guarda o que o código promete ════════════════════════════ */

  s.teste('nota e versão andam juntas, por CHECK e não por disciplina', () => {
    const c = cenario();
    const n = nDaRodada(c.db, c.r.id);
    const p = registrarPrevisao(c.db, { userId: c.u.id, roundId: c.r.id,
                                        distribuicao: uniforme(n), agora: c.agoraDe() });
    const e = recusa(() => c.db.prepare(`UPDATE predictions SET score=0.5 WHERE id=?`).run(p.id));
    ok(e, 'o banco aceitou nota sem versão de pontuação — ninguém saberá sob qual ' +
          'regra ela nasceu, e é para isso que `scoring_version` existe');
  });

  return s;
}
