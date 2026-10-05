/* O SERVIDOR DO IDLE (bloco 1.2d, §P2, §P3, §25.2, §28).
 *
 * Fronteira: este arquivo é o ÚNICO caminho por onde uma expedição sai, volta,
 * ou vira item na bolsa. A conta não mora aqui — ela é `engine/expedicao.mjs`,
 * `engine/captura.mjs` e `engine/drops.mjs`, puros e testados sozinhos. Aqui
 * fica o que precisa de banco: o tempo, a posse e a memória.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A semente do saque é sorteada NA COLHEITA.**
 *
 * Se ela nascesse com a expedição, o resultado existiria no banco durante oito
 * horas antes de o jogador colher — e quem o visse poderia cancelar a expedição
 * ruim. Sorteada na colheita, não há janela: no instante em que o resultado
 * existe, ele já é do jogador.
 *
 * O banco torna isso estrutural, e não uma promessa:
 *
 *     CHECK ((colhida_em IS NULL) = (semente IS NULL))
 *
 * Semente sem colheita é um estado que o banco RECUSA.
 *
 * ── A COLHEITA É IDEMPOTENTE, E POR ISSO É UMA TRANSAÇÃO ─────────────────
 *
 * Dois cliques no botão, dois requests em voo, uma reconexão no meio: qualquer
 * um deles colheria duas vezes. O saque dobraria, e nada reprovaria — a
 * expedição continuaria parecendo uma expedição.
 *
 * A defesa é o `UPDATE ... WHERE colhida_em IS NULL` decidir quem venceu, e não
 * um `SELECT` antes. Ler e depois escrever deixa a janela aberta entre as duas;
 * escrever com a condição fecha no próprio banco. É a mesma forma do payout
 * único do §4.6, e pelo mesmo motivo.
 *
 * ── O SERVIDOR RECONFERE TUDO QUE O CLIENTE JÁ CONFERIU (§P2) ────────────
 *
 * Stamina, teto diário, vagas simultâneas, bola na bolsa. O cliente confere
 * para desenhar o botão; quem decide é este arquivo. Num jogo onde criatura é
 * vendável, um `fetch` forjado não é trapaça — é dinheiro.
 */
import { nivelDeNascer } from '../engine/estagios.mjs';
import { randomUUID } from 'node:crypto';
import { novaRaiz, derivar } from '../engine/seed.mjs';
import { semente } from '../engine/instancia.mjs';
import {
  PERFIS, TETO_DIARIO, TETO_ENCONTROS, cabeExpedicao, restamEncontros,
  SIMULTANEAS_INICIAIS, SIMULTANEAS_MAX, EQUIPE_MAX,
  STAMINA_MAX, staminaAgora, podeEnviar, custoDe,
} from '../engine/expedicao.mjs';
import { chanceDe, tentar, DURACAO_BONUS_MS } from '../engine/captura.mjs';
import { baseDe } from '../engine/evolucao.mjs';
import { contaDaColheita } from '../engine/colheita.mjs';
import { estagioAberto, estagioMaximo, nivelDoEstagio } from '../engine/estagios.mjs';
import { nivelDe } from '../engine/nivel-criatura.mjs';
import { gerar as gerarCriatura } from './criaturas.mjs';
import { naRun, sincronizarRun } from './run.mjs';
import { equipeCheiaEm } from '../app/modules/colecao-regras.mjs';
import { ENCONTROS_POR_AVANCO } from '../engine/avanco.mjs';
import { regraDoShiny, sortearShiny } from '../engine/shiny.mjs';
import { exigirSemReserva } from './reservas.mjs';

/* O SHINY DO ENCONTRO (ST-14.1): sorteado aqui, no servidor, quando o encontro
   é gravado — com raiz NOVA do CSPRNG, e não da semente da colheita, que vai
   na resposta ao jogador. Exportado para a run gravar os dela pela mesma
   regra. */
export const shinyDoEncontro = pack => sortearShiny(semente(derivar(novaRaiz(), 'shiny')), regraDoShiny(pack));

const DIA_MS = 24 * 3600_000;

/* Os erros que a ROTA traduz em status (ST-13.2b). "Ainda não terminou" é
   conflito com o estado, e não pedido errado: 409 manda esperar, 400 mandaria
   corrigir o pedido — e o pedido estava certo. */
export const ERRO_IDLE = Object.freeze({
  SEM_EXPEDICAO: 'IDLE_SEM_EXPEDICAO', NAO_TERMINOU: 'IDLE_NAO_TERMINOU',
  SEM_ENCONTRO: 'IDLE_SEM_ENCONTRO', SEM_BOLA: 'IDLE_SEM_BOLA', INICIAL: 'IDLE_INICIAL',
});
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

/* ── A LEITURA DA EQUIPE ───────────────────────────────────────────────────
 *
 * As criaturas vêm do banco com a stamina no formato (valor, instante), e o
 * motor as recebe no formato que ele conhece. A conversão mora aqui, e é a
 * única — duas conversões seriam duas verdades sobre o mesmo número. */
function equipeDe(db, userId, ids) {
  if (!ids?.length) return [];
  /* UMA CONSULTA POR MEMBRO, e não um `IN` de aridade variável.
   *
   * A primeira versão montava `IN (${marcas})` com uma marca por id, e o portão
   * do `banco-servidor` reprovou — com razão. As marcas vinham do TAMANHO do
   * array e nunca do cliente, então era seguro hoje; o problema é que o padrão
   * fica indistinguível de injeção de verdade, e quem editar isto amanhã não
   * tem como saber pelo código qual das duas coisas está olhando.
   *
   * A equipe tem no máximo três membros. Três consultas preparadas custam nada
   * e não têm como ser lidas errado — e a ordem sai certa de graça, que o `IN`
   * não garantia. */
  const q = db.prepare(`SELECT id, stamina, stamina_em FROM criaturas
                          WHERE user_id = ? AND id = ?`);
  return ids.map(id => {
    const l = q.get(userId, id);
    return l ? { id: l.id, stamina: l.stamina, staminaEm: l.stamina_em } : null;
  }).filter(Boolean);
}

/* Quantas expedições este jogador CONCLUIU nas últimas 24 h.
 *
 * JANELA MÓVEL, e não "hoje" de calendário. Meia-noite fixa daria a todo mundo
 * uma virada em que o teto zera — e quem descobre passa a jogar em volta dela,
 * o que é o oposto de um idle. */
export const concluidasHoje = (db, userId, agora) =>
  db.prepare(`SELECT COUNT(*) AS n FROM expedicoes
               WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?`)
    .get(userId, agora - DIA_MS).n;

/* QUANTOS ENCONTROS JÁ SAÍRAM HOJE (D-052). É o que o teto conta — não a
   contagem de expedições. Mesma janela móvel de 24 h, pelo mesmo motivo. */
/* AS RUNS COLHIDAS ENTRAM NA MESMA SOMA (D-107, ST-13.2c1): o teto não
   precisa saber de que modo o encontro veio. */
export const encontrosHoje = (db, userId, agora) =>
  db.prepare(`SELECT COALESCE(SUM(encontros), 0) AS n FROM (
                SELECT encontros FROM expedicoes WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?
                UNION ALL SELECT encontros FROM runs WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?)`)
    .get(userId, agora - DIA_MS, userId, agora - DIA_MS).n;

/* Os lançamentos da janela (quando, quantos) — para a hora em que o próximo
   encontro volta (ST-2.27a): a conta é a do aparelho, `quandoVoltaEncontro`. */
export const lancamentosDoTeto = (db, userId, agora) =>
  db.prepare(`SELECT colhida_em AS colhidaEm, encontros FROM expedicoes WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?
              UNION ALL SELECT colhida_em AS colhidaEm, encontros FROM runs WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?`)
    .all(userId, agora - DIA_MS, userId, agora - DIA_MS);

/* O estado que o motor lê: só o que JÁ ACONTECEU — na MESMA forma do
   `estadoDoTeto` do cliente (ST-13.2a). A primeira versão mandava só a lista de
   perfis: a reserva ignorava o tamanho da equipe (L-140, a Vigília de três
   reserva mais) e o teto ignorava os marcos do registro (1.19) — o servidor
   recusaria o que o cliente deixa, e deixaria o que o §P5 recusa. */
export const estadoDoTeto = (db, userId, agora, pack = null) => ({
  encontrosHoje: encontrosHoje(db, userId, agora),
  emCampo: emCampo(db, userId).map(x => ({ perfil: x.perfil, membros: JSON.parse(x.equipe_json).length })),
  vistas: pack ? especiesVistas(db, userId, pack.id) : 0,
  total: (pack?.especies ?? []).length || undefined,
  /* A RUN ABERTA RESERVA até ser colhida (D-107) — como `e.run` no aparelho. */
  reservas: db.prepare(`SELECT 1 FROM runs WHERE user_id = ? AND colhida_em IS NULL`).get(userId)
    ? [ENCONTROS_POR_AVANCO] : [],
});

/* VER É TER ENCONTRADO OU TER NA CAIXA (1.22, D-075) — a inicial nunca passou
   por encontro, e conta. A mesma união do `vistosDe` do cliente. */
export const especiesVistas = (db, userId, packId) =>
  db.prepare(`SELECT COUNT(*) AS n FROM (
                SELECT dex FROM registro WHERE user_id = ? AND pack_id = ?
                UNION SELECT dex FROM criaturas WHERE user_id = ? AND pack_id = ?)`)
    .get(userId, packId, userId, packId).n;

/* As criaturas do jogador no formato que a CONTA lê (o do save): o XP, e não o
   nível, porque o nível é derivado dele. */
export const criaturasDaConta = (db, userId) =>
  db.prepare(`SELECT id, dex, xp, vinculo, foco, treinado_ate, stamina, stamina_em, na_caixa, foco_em, descansa_ate,
                      golpes_json, exclusivos_json, o_hp, o_atq, o_def, o_spa, o_spd, o_vel, natureza
               FROM criaturas WHERE user_id = ? ORDER BY criada_em, id`).all(userId)
    .map(l => ({ id: l.id, dex: l.dex, xp: l.xp, nivel: nivelDe(l.xp), vinculo: l.vinculo, foco: l.foco,
                 iv: [l.o_hp,l.o_atq,l.o_def,l.o_spa,l.o_spd,l.o_vel], natureza: l.natureza,
                 stamina: l.stamina, staminaEm: l.stamina_em, naCaixa: l.na_caixa === 1,
                 ...(l.foco_em != null ? { focoEm: l.foco_em } : {}),
                 ...(l.descansa_ate != null ? { descansaAte: l.descansa_ate } : {}),
                 ...(l.golpes_json ? { golpes: JSON.parse(l.golpes_json) } : {}),
                 ...(l.exclusivos_json ? { exclusivos: JSON.parse(l.exclusivos_json) } : {}),
                 ...(l.treinado_ate != null ? { treinadoAte: l.treinado_ate } : {}) }));

export const emCampo = (db, userId) =>
  db.prepare(`SELECT * FROM expedicoes WHERE user_id = ? AND colhida_em IS NULL
               ORDER BY termina_em`).all(userId);

/* ── INICIAR ───────────────────────────────────────────────────────────────
 *
 * O TETO SAI DA CONSTANTE DO MOTOR, sempre. Ver o §P5 no `engine/expedicao.mjs`:
 * a loja da L-066 vai vender boost de stamina, e boost que levantasse o teto
 * seria dinheiro comprando dinheiro. Aqui não há por onde receber outro número. */
export function iniciar(db, { userId, pack, bioma, perfil, equipe, agora, estagio = 1,
                              limiteSimultaneas = SIMULTANEAS_INICIAIS }) {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);
  if (!(pack?.biomas ?? []).some(b => b.id === bioma))
    throw new Error(`o bioma "${bioma}" não existe no pack ${pack?.id}`);
  if (!equipe?.length) throw new Error('expedição sem equipe');
  /* A MESMA CRIATURA DUAS VEZES passaria na contagem abaixo (cada id acha a
     sua linha) e renderia como equipe de dois — o multiplicador de
     concentração pago por uma criatura só (ST-13.2b). */
  if (new Set(equipe).size !== equipe.length) throw new Error('a mesma criatura duas vezes na equipe');
  if (equipe.length > EQUIPE_MAX)
    throw new Error(`a equipe tem ${equipe.length}, e o teto é ${EQUIPE_MAX}`);

  /* AS CRIATURAS TÊM DE SER DO JOGADOR. `equipeDe` filtra por `user_id`, então
     mandar o id de outro devolve menos linhas — e a contagem denuncia. */
  const membros = equipeDe(db, userId, equipe);
  if (membros.length !== equipe.length)
    throw new Error('a equipe tem criatura que não é sua ou não existe');
  /* ST-14.6: a criatura reservada numa troca ou num anúncio não sai em
     expedição — voltaria mudada (XP, stamina) para a liquidação. */
  for (const id of equipe) exigirSemReserva(db, id);
  /* SÓ QUEM ESTÁ NA EQUIPE ATIVA VAI A CAMPO (ST-13.3a): mandar da caixa
     faria dela um segundo bolso sem custo, e os seis deixariam de ser escolha. */
  const guardadas = equipe.filter(id => db.prepare(`SELECT na_caixa FROM criaturas WHERE id = ?`).get(id)?.na_caixa === 1).length;
  if (guardadas) throw new Error(`${guardadas} criatura(s) estão na caixa — tire-as antes`);

  /* O ESTÁGIO É CONFERIDO AQUI, como no cliente (1.10): pedir um estágio
     acima do que a coleção abre é RECUSADO, venha o pedido de onde vier. */
  const est = Math.max(1, Math.floor(Number(estagio) || 1));
  const colecao = criaturasDaConta(db, userId);
  if (!estagioAberto(colecao, est))
    throw new Error(`o estágio ${est} pede uma criatura no nível ${nivelDoEstagio(est)}, ` +
      `e a sua melhor está no ${estagioMaximo(colecao)}º`);

  /* QUEM JÁ ESTÁ EM CAMPO NÃO SAI DE NOVO (L-162 no cliente). Sem isto, uma
     criatura com stamina para duas Batidas estaria em duas expedições ao
     mesmo tempo, rendendo nas duas. */
  const fora = new Set(emCampo(db, userId).flatMap(x => JSON.parse(x.equipe_json)));
  if (equipe.some(id => fora.has(id))) throw new Error('uma das escolhidas já está em expedição — recolha-a antes');
  /* E QUEM ESTÁ NUMA RUN QUE AINDA ACONTECE (ST-13.2c1) — o outro sentido. */
  const avancando = naRun(db, { userId, pack, agora });
  if (equipe.some(id => avancando.has(id))) throw new Error('uma das escolhidas já está no avanço — recolha-a antes');

  const { pode, semStamina } = podeEnviar(membros, perfil, agora);
  if (!pode) throw new Error(`sem stamina: ${semStamina.join(', ')}`);

  if (!cabeExpedicao(estadoDoTeto(db, userId, agora, pack), perfil, membros.length))
    throw new Error(
      `o teto diário de ${TETO_ENCONTROS} encontros não comporta mais uma ` +
      `${p.rotulo} — restam ${restamEncontros(estadoDoTeto(db, userId, agora, pack))}`);

  const vagas = Math.min(limiteSimultaneas, SIMULTANEAS_MAX);
  if (emCampo(db, userId).length >= vagas)
    throw new Error(`já há expedição em campo, e o limite é ${vagas}`);

  const id = randomUUID();
  const custo = custoDe(perfil, membros.length);

  /* TRANSAÇÃO: debitar a stamina e criar a expedição são a mesma decisão.
     Uma sem a outra é expedição de graça ou stamina queimada à toa. */
  db.exec('BEGIN');
  try {
    for (const c of membros) {
      const restante = Math.max(0, staminaAgora(c, agora) - p.custo);
      db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`)
        .run(Math.round(restante), agora, c.id);
    }
    db.prepare(`
      INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json,
                              custo, iniciada_em, termina_em, estagio)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, userId, pack.id, bioma, perfil, JSON.stringify(equipe),
           custo, agora, agora + p.minutos * 60_000, est);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  return db.prepare(`SELECT * FROM expedicoes WHERE id = ?`).get(id);
}

/* ── COLHER ────────────────────────────────────────────────────────────────
 *
 * Devolve o que a expedição trouxe: os encontros (que ainda precisam de bola) e
 * os itens (que já entraram na bolsa).
 *
 * A IDEMPOTÊNCIA É DO BANCO. O `UPDATE ... WHERE colhida_em IS NULL` é quem
 * decide o vencedor entre dois pedidos simultâneos; quem perder vê zero linhas
 * alteradas e sai sem colher. Um `SELECT` antes do `UPDATE` deixaria a janela
 * entre os dois aberta, e é exatamente por ali que um saque dobra. */
/* O BÔNUS DA ARENA COM CONTA (ST-9.6): a aposta mais recente que não foi
   cancelada — a mesma regra do cliente, lida de onde a aposta de verdade
   mora. Nem `stake` nem `odd` entram na consulta: o bônus é da ESCOLHA. */
export function bonusDoServidor(db, userId, pack) {
  const b = db.prepare(`SELECT species_id, created_at FROM bets WHERE user_id = ? AND status != 'cancelada'
                         ORDER BY created_at DESC LIMIT 1`).get(userId);
  return b ? { linha: baseDe(pack, b.species_id), ate: b.created_at + DURACAO_BONUS_MS } : null;
}

export function colher(db, { id, pack, agora, raiz = novaRaiz() }) {
  const exp = db.prepare(`SELECT * FROM expedicoes WHERE id = ?`).get(id);
  if (!exp) throw falha(ERRO_IDLE.SEM_EXPEDICAO, 'expedição não existe');
  if (agora < exp.termina_em) throw falha(ERRO_IDLE.NAO_TERMINOU, 'a expedição ainda não terminou');
  /* A RUN AVANÇA ANTES (ST-13.2c1): esta colheita treina quem ficou no
     banco, e quem está na run fica no banco — as waves que já passaram lutaram
     com o nível de antes, como no aparelho, que sincroniza a cada quadro. */
  sincronizarRun(db, { userId: exp.user_id, pack, agora });

  db.exec('BEGIN');
  try {
    const r = db.prepare(`UPDATE expedicoes SET colhida_em = ?, semente = ?
                           WHERE id = ? AND colhida_em IS NULL`)
      .run(agora, String(raiz), id);
    if (r.changes === 0) { db.exec('ROLLBACK'); throw new Error('esta expedição já foi colhida'); }

    /* A CONTA É A DO CLIENTE (ST-13.2a): `engine/colheita.mjs`, a mesma
       função, com a raiz sorteada aqui e o bônus da aposta lido do banco. */
    const x = { id, bioma: exp.bioma, perfil: exp.perfil, estagio: exp.estagio,
                equipe: JSON.parse(exp.equipe_json), iniciadaEm: exp.iniciada_em, terminaEm: exp.termina_em };
    const estadoTreino = db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(exp.user_id);
    const c = contaDaColheita({ pack, expedicao: x, criaturas: criaturasDaConta(db, exp.user_id),
      raiz, bonus: bonusDoServidor(db, exp.user_id, pack), agora,
      treinoOffline: estadoTreino ? JSON.parse(estadoTreino.estado_json) : null });

    for (const [chave, n] of Object.entries(c.bolsa)) creditarBolsa(db, exp.user_id, chave, n, { fonte: `colheita:${id}`, agora });
    /* O nível é escrito junto com o XP, pela mesma conta — duas escritas
       separadas seriam o nível e o XP podendo discordar no banco. */
    const escrever = db.prepare(`UPDATE criaturas SET xp = ?, nivel = ?, vinculo = ?,
                                   treinado_ate = COALESCE(?, treinado_ate)
                                  WHERE id = ? AND user_id = ?`);
    for (const k of c.credito) escrever.run(k.xp, k.nivel, k.vinculo, k.treinadoAte ?? null, k.id, exp.user_id);
    /* O FRAGMENTO CAI NO ENCONTRO, e não na captura (1.2b). */
    for (const f of c.fragmentos) creditarRegistro(db, exp.user_id, exp.pack_id, f.dex, f.n, agora);
    const pendente = db.prepare(`INSERT INTO encontros_pendentes
      (chave, user_id, expedicao_id, dex, raridade, bioma, em, is_shiny, shiny_versao) VALUES (?,?,?,?,?,?,?,?,?)`);
    /* O shiny vai para o BANCO, e não para a resposta: a resposta da colheita
       é a mesma conta do aparelho (a identidade da ST-13.2a), e o shiny é
       decisão só do servidor. O jogador o vê na releitura da conta. */
    for (const p of c.pendentes) {
      const s = shinyDoEncontro(pack);
      pendente.run(p.chave, exp.user_id, id, p.dex, p.raridade, p.bioma, p.em, s.shiny ? 1 : 0, s.versao);
    }

    const resposta = { expedicao: id, semente: String(raiz), encontros: c.pendentes, itens: c.itens,
      moedas: c.moedas, xp: c.xp, vinculo: c.vinculo, subiram: c.subiram, npc: c.npc, treino: c.treino };
    /* O TOTAL sorteado vai para o teto (D-052, 1.7b) e a resposta fica
       gravada, os dois DENTRO da transação que marcou a colheita: uma queda
       entre as escritas deixaria encontros de graça no teto, ou uma colheita
       sem o que ela pagou. */
    db.prepare(`UPDATE expedicoes SET encontros = ?, resultado_json = ? WHERE id = ?`)
      .run(c.total, JSON.stringify(resposta), id);

    db.exec('COMMIT');
    return resposta;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

/* ── A BOLSA ───────────────────────────────────────────────────────────────
 *
 * `UPSERT` numa linha só. Ler-somar-escrever seria a mesma janela de corrida da
 * colheita, e aqui ela custaria itens duplicados a cada colheita concorrente. */
/* A BOLSA É POR LOTE desde a ST-14.0C (`inventario.mjs`): o crédito diz a
   classe e a fonte, o débito diz de que classes saiu. Reexportadas daqui para
   quem já importava deste arquivo. */
export { creditarBolsa, debitarBolsa } from './inventario.mjs';
import { creditarBolsa, debitarBolsa } from './inventario.mjs';
import { maisRestrita } from '../engine/proveniencia.mjs';

export const bolsaDe = (db, userId) =>
  db.prepare(`SELECT item_id, quantidade FROM bolsa
               WHERE user_id = ? AND quantidade > 0 ORDER BY item_id`).all(userId);

export const quantosNaBolsa = (db, userId, itemId) =>
  db.prepare(`SELECT quantidade FROM bolsa WHERE user_id = ? AND item_id = ?`)
    .get(userId, itemId)?.quantidade ?? 0;

/* ── O REGISTRO ──────────────────────────────────────────────────────────────
 *
 * Guarda FRAGMENTOS e não porcentagem: a porcentagem sai do alvo da faixa, que
 * é dado do pack e pode ser rebalanceado. Guardar a porcentagem congelaria o
 * balanço de hoje na conta de todo mundo. */
export function creditarRegistro(db, userId, packId, dex, quantos, agora) {
  db.prepare(`
    INSERT INTO registro (user_id, pack_id, dex, fragmentos, visto_em) VALUES (?,?,?,?,?)
    ON CONFLICT (user_id, pack_id, dex)
    DO UPDATE SET fragmentos = fragmentos + excluded.fragmentos, visto_em = excluded.visto_em`)
    .run(userId, packId, dex, quantos, agora);
}

export const registroDe = (db, userId, packId) =>
  db.prepare(`SELECT dex, fragmentos, visto_em FROM registro
               WHERE user_id = ? AND pack_id = ? ORDER BY dex`).all(userId, packId);

/* ── O LANCE ───────────────────────────────────────────────────────────────
 *
 * A bola é debitada ANTES do sorteio, e é debitada mesmo quando a captura
 * falha. A ordem importa: sortear primeiro e debitar depois abriria a janela em
 * que um erro entre as duas deixaria a captura de graça.
 *
 * O SORTEIO É DO SERVIDOR (§P2). O cliente manda a intenção — qual encontro,
 * qual bola — e recebe o que saiu. */
export function lancar(db, { userId, pack, dex, raridade, bola, agora,
                              raiz = novaRaiz() }) {
  if (!chanceDe(pack, { raridade, bola }))
    throw new Error(`não há chance para ${raridade} com a bola ${bola}`);
  const gasto = debitarBolsa(db, userId, bola, 1);
  if (!gasto)
    throw new Error(`não há ${bola} na bolsa`);

  const r = tentar(semente(derivar(raiz, 'lance')), pack, { raridade, bola });
  const criatura = r.capturou
    ? gerarCriatura(db, { userId, pack, dex, origem: 'captura', proveniencia: maisRestrita([...gasto.classes]) })
    : null;
  return { ...r, dex, criatura, semente: String(raiz) };
}

/* ── O LANCE PELA CHAVE DO ENCONTRO (ST-13.2b) ────────────────────────────
 *
 * O `lancar` acima recebe o dex e a raridade de quem chama — servia enquanto
 * ninguém de fora chamava. Pela rota, isso seria o cliente dizendo "joguei a
 * bola num Mewtwo comum". Aqui o cliente manda só a CHAVE do encontro que a
 * colheita gravou, e a bola; o resto vem do banco.
 *
 * UM ENCONTRO, UM LANCE — como no aparelho, onde o encontro sai da fila acerte
 * ou erre. A marca `resolvido_em` é decidida na cláusula, como a colheita.
 *
 * E A RAIZ DO LANCE É NOVA, do servidor. No aparelho ela deriva da semente da
 * colheita; aqui essa semente vai na resposta da colheita, e derivar dela
 * deixaria o cliente saber, antes de lançar, qual bola acerta — escolher a
 * bola deixaria de ser decisão. */
/* O estágio de onde o encontro veio (ST-2.23): o da run fica no estado dela,
   o da expedição numa coluna. Sem nenhum dos dois, o estágio 1. */
function estagioDoEncontro(db, en) {
  const e = en.run_id
    ? db.prepare(`SELECT json_extract(estado_json, '$.estagio') AS e FROM runs WHERE id = ?`).get(en.run_id)?.e
    : en.expedicao_id ? db.prepare(`SELECT estagio AS e FROM expedicoes WHERE id = ?`).get(en.expedicao_id)?.e : null;
  return Number(e) || 1;
}

export function lancarPendente(db, { userId, pack, chave, bola, agora, raiz = novaRaiz() }) {
  /* O DONO é conferido aqui, e só aqui; QUEM VENCE o lance é decidido na
     cláusula do UPDATE, e só lá. Uma guarda em cada lugar, e não as duas
     nos dois: repetida, a falha de uma seria coberta pela outra por acidente
     (o S564 da ST-13.2a), e o teste não saberia qual das duas o protege. */
  const en = db.prepare(`SELECT * FROM encontros_pendentes WHERE chave = ? AND user_id = ?`).get(chave, userId);
  if (!en) throw falha(ERRO_IDLE.SEM_ENCONTRO, 'esse encontro não está mais aqui');
  /* O RETRY DEVOLVE O RECIBO (ST-14.1). Quem lançou e não recebeu a resposta
     (a rede caiu depois do commit) pede de novo: recebe o MESMO lance — mesma
     bola, mesmo resultado, a mesma criatura —, e nunca uma segunda tentativa,
     nem com outra bola. Só o dono chega aqui: o SELECT acima é por usuário. */
  if (en.recibo_json) return { ...JSON.parse(en.recibo_json), repetida: true };
  if (!chanceDe(pack, { raridade: en.raridade, bola }))
    throw new Error(`a bola ${bola} não tem chance contra um ${en.raridade}`);

  db.exec('BEGIN');
  try {
    const r = db.prepare(`UPDATE encontros_pendentes SET resolvido_em = ?
                           WHERE chave = ? AND resolvido_em IS NULL`).run(agora, chave);
    if (!r.changes) throw falha(ERRO_IDLE.SEM_ENCONTRO, 'esse encontro não está mais aqui');
    const gasto = debitarBolsa(db, userId, bola, 1);
    if (!gasto) throw falha(ERRO_IDLE.SEM_BOLA, `não há ${bola} na bolsa`);
    const t = tentar(semente(derivar(raiz, 'lance')), pack, { raridade: en.raridade, bola });
    /* A CAPTURA NUNCA É RECUSADA por equipe cheia: vai para a caixa. */
    const paraCaixa = equipeCheiaEm(criaturasDaConta(db, userId));
    /* A captura herda a origem da bola (ST-14.0C): bola presa, criatura presa. */
    const criatura = t.capturou ? gerarCriatura(db, { userId, pack, dex: en.dex, origem: 'captura', encontroChave: chave,
                                                      proveniencia: maisRestrita([...gasto.classes]), shiny: en.is_shiny === 1,
                                                      nivel: nivelDeNascer(pack, en.dex, estagioDoEncontro(db, en)) }) : null;
    if (criatura && paraCaixa) {
      db.prepare(`UPDATE criaturas SET na_caixa = 1 WHERE id = ?`).run(criatura.id);
      criatura.naCaixa = true;
    }
    /* O RECIBO NA MESMA TRANSAÇÃO que debitou a bola e criou a criatura:
       gravado depois, uma queda entre os dois deixaria o lance feito e o
       retry sem resposta. */
    const recibo = { ...t, chave, dex: en.dex, raridade: en.raridade, shiny: en.is_shiny === 1, criatura };
    db.prepare(`UPDATE encontros_pendentes SET resolucao = ?, recibo_json = ? WHERE chave = ?`)
      .run(t.capturou ? 'captura' : 'falha', JSON.stringify(recibo), chave);
    db.exec('COMMIT');
    return recibo;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

export const pendentesDe = (db, userId) =>
  db.prepare(`SELECT chave, origem, expedicao_id AS expedicao, dex, raridade, bioma, em, is_shiny FROM encontros_pendentes
               WHERE user_id = ? AND resolvido_em IS NULL ORDER BY em, chave`).all(userId)
    .map(({ is_shiny, ...e }) => ({ ...e, shiny: is_shiny === 1 }));

/* A INICIAL, uma vez por conta (ST-13.2b) — sem ela, a conta nova não tem
   quem mandar a campo. A mesma regra do aparelho: só entre as do pack, e só
   com a coleção vazia. */
export function escolherInicial(db, { userId, pack, dex }) {
  if (!(pack?.iniciais ?? []).includes(dex)) throw falha(ERRO_IDLE.INICIAL, `o ${dex} não é uma das iniciais`);
  if (db.prepare(`SELECT 1 FROM criaturas WHERE user_id = ? LIMIT 1`).get(userId))
    throw falha(ERRO_IDLE.INICIAL, 'a criatura inicial só se escolhe uma vez');
  const c = gerarCriatura(db, { userId, pack, dex, origem: 'inicial' });
  garantirKitInicial(db, { userId, pack });
  return c;
}

/* ── O KIT DE QUEM COMEÇA (ST-2.12) ─────────────────────────────────────────
 * Dez bolas e três poções (`pack.kitInicial`), como PRESENTE: a classe é
 * `promotional_bound` — usa, não troca nem anuncia (E14) — e a fonte marca de
 * onde veio. UMA VEZ por conta, e a fonte é a trava: chamar de novo não credita
 * nada. Por isso a mesma função serve a quem escolheu a inicial ANTES do kit
 * existir — a leitura da coleção a chama, e a conta antiga recebe uma vez. */
export const FONTE_DO_KIT = 'kit-inicial';
export function garantirKitInicial(db, { userId, pack, agora = Date.now() }) {
  const kit = pack?.kitInicial ?? {};
  if (!Object.keys(kit).length) return false;
  if (!db.prepare(`SELECT 1 FROM criaturas WHERE user_id = ? LIMIT 1`).get(userId)) return false;
  if (db.prepare(`SELECT 1 FROM bolsa_lotes WHERE user_id = ? AND fonte = ? LIMIT 1`).get(userId, FONTE_DO_KIT)) return false;
  for (const [item, n] of Object.entries(kit))
    creditarBolsa(db, userId, item, n, { classe: 'promotional_bound', fonte: FONTE_DO_KIT, agora });
  return true;
}

/* A stamina de uma criatura, agora — para a tela e para a decisão de quem
   mandar. Sai da MESMA função do motor; uma segunda conta aqui seria a
   armadilha do §7.11. */
export function staminaDe(db, id, agora) {
  const l = db.prepare(`SELECT stamina, stamina_em FROM criaturas WHERE id = ?`).get(id);
  if (!l) return 0;
  return staminaAgora({ stamina: l.stamina, staminaEm: l.stamina_em }, agora);
}

export { STAMINA_MAX, TETO_DIARIO };
