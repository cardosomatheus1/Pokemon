/* Q1/Q3/Q6/Q8 · APOSTA, LOCK E SETTLEMENT (F1.7).
 *
 * É o bloco que fecha o ciclo econômico no servidor, e é onde as duas
 * invariantes do §4.6 que a suíte lista como "ainda não verificáveis" passam a
 * ser verificáveis:
 *
 *     · payout ocorre uma única vez
 *     · aposta fechada não pode ser alterada
 *
 * AS REGRAS DO §5.6, e o que cada uma custa se cair:
 *
 *   UMA POSIÇÃO POR USUÁRIO      duas posições é o jogador cobrindo os doze e
 *                                saindo sempre no lucro
 *   TROCA LIVRE ANTES DO LOCK    trocar é UPDATE, não INSERT — a diferença é a
 *                                mesma de cima
 *   ODD CONGELADA NO TICKET      pagar com a odd de hoje uma aposta de ontem é
 *                                inventar preço depois do fato
 *   NADA APÓS O LOCK             cem milissegundos depois já é o resultado
 *                                conhecido
 *   SETTLEMENT IDEMPOTENTE       "reprocessar a rodada" não pode pagar de novo
 *
 * E o Q6: a odd NUNCA vem do cliente, e ninguém aposta em nome de outro.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, reconciliarNoBanco } from '../server/carteira.mjs';
import { criarScheduler, ESTADOS, FASE_MS } from '../server/scheduler.mjs';
import { apostar, cancelar, liquidarRodada, ERRO_APOSTA } from '../server/aposta.mjs';

const SIMS_TESTE = 600;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cenario({ saldo = 1000 } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = Date.UTC(2026, 0, 15);
  const sched = criarScheduler({ db, sims: SIMS_TESTE, relogio: () => agora });
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora });
  creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                 valor: saldo, idem: 'seed', agora });
  const r = sched.abrirRodada();
  return { db, sched, u, r, avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

/* Um slot que existe na rodada, com a odd que o servidor gravou. */
const slotComOdd = (db, roundId, slot = 0) =>
  db.prepare(`SELECT slot, species_id, offered_odd FROM round_fighters
              WHERE round_id=? AND slot=?`).get(roundId, slot);

export function suite() {
  const s = criarSuite('aposta-servidor');

  /* --- o caminho feliz ---------------------------------------------------- */

  s.teste('apostar reserva o dinheiro e grava a composição no ticket', () => {
    const c = cenario();
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                              valor: 100, agora: c.agoraDe() });
    ok(t && t.id, 'a aposta não foi criada');
    igual(saldos(c.db, c.u.id).transferivel, 900, 'o dinheiro não saiu do disponível');
    const linha = c.db.prepare(`SELECT * FROM bets WHERE id=?`).get(t.id);
    ok(linha.stake_breakdown, 'o ticket não gravou o stake_breakdown do §5.5');
    igual(JSON.parse(linha.stake_breakdown).transferivel, 100, 'a composição está errada');
  });

  /* --- a odd NUNCA vem do cliente (Q6) ----------------------------------- */

  s.teste('a odd do ticket é a que o SERVIDOR gravou, não a que o cliente mandou', () => {
    const c = cenario();
    const oficial = slotComOdd(c.db, c.r.id, 0).offered_odd;
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100,
                              odd: 999, agora: c.agoraDe() });
    igual(t.odd, oficial,
      `o ticket saiu com odd ${t.odd}; a gravada na rodada é ${oficial}. A odd veio ` +
      `do cliente — e o cliente escolheria 999 em toda aposta.`);
  });

  s.teste('apostar em slot que não existe é recusado', () => {
    const c = cenario();
    for (const slot of [-1, 12, 99, 1.5, null, '0'])
      ok(recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot,
        valor: 100, agora: c.agoraDe() })), `slot ${String(slot)} foi aceito`);
  });

  /* --- §5.6: UMA posição, e trocar é UPDATE ------------------------------ */

  s.teste('trocar de lutador ATUALIZA a posição, não cria uma segunda', () => {
    const c = cenario();
    const a = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    const b = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 3, valor: 100, agora: c.agoraDe() });
    const quantas = c.db.prepare(`SELECT COUNT(*) n FROM bets WHERE user_id=? AND round_id=?`)
      .get(c.u.id, c.r.id).n;
    igual(quantas, 1,
      `${quantas} apostas do mesmo usuário na mesma rodada. Com duas, o jogador ` +
      `cobre os doze lutadores e sai sempre no lucro.`);
    igual(b.id, a.id, 'a troca criou um ticket novo em vez de atualizar o existente');
    igual(b.slot, 3, 'a troca não mudou o lutador');
    /* E o dinheiro da primeira voltou: trocar não pode custar duas reservas. */
    igual(saldos(c.db, c.u.id).transferivel, 900, 'a troca cobrou duas vezes');
  });

  s.teste('trocar para um valor MAIOR reserva a diferença, e para menor devolve', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 300, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 700, 'o aumento não reservou a diferença');
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 50, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 950, 'a redução não devolveu a diferença');
  });

  s.teste('cancelar devolve o dinheiro e some com o ticket ativo', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    cancelar(c.db, { sched: c.sched, userId: c.u.id, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 1000, 'o cancelamento não devolveu');
    const viva = c.db.prepare(`SELECT COUNT(*) n FROM bets WHERE user_id=? AND status='aberta'`)
      .get(c.u.id).n;
    igual(viva, 0, 'o ticket cancelado continua aberto');
  });

  /* --- O LOCK ------------------------------------------------------------- */

  /* A INVARIANTE "APOSTA FECHADA NÃO PODE SER ALTERADA", do §4.6. */
  s.teste('nada é aceito DEPOIS do lock — nem 1 ms depois', () => {
    const c = cenario();
    c.avancar(FASE_MS.APOSTA + 1);
    c.sched.tick();
    const e = recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                                           valor: 100, agora: c.agoraDe() }));
    ok(e, 'aposta aceita com a janela FECHADA — a semente já foi revelada, o ' +
          'resultado já é conhecido, e isso é apostar no passado');
    igual(e.codigo, ERRO_APOSTA.JANELA_FECHADA, `código veio "${e.codigo}"`);
  });

  s.teste('a aposta feita ANTES do lock não pode ser alterada DEPOIS', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + 1); c.sched.tick();
    ok(recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 5,
      valor: 100, agora: c.agoraDe() })), 'trocou de lutador depois do lock');
    ok(recusa(() => cancelar(c.db, { sched: c.sched, userId: c.u.id, agora: c.agoraDe() })),
      'cancelou depois do lock — quem viu o resultado sairia da aposta perdedora');
    const linha = c.db.prepare(`SELECT slot_apostado, status FROM bets WHERE user_id=?`).get(c.u.id);
    igual(linha.slot_apostado, 0, 'o lutador mudou depois do lock');
  });

  s.teste('o lock CONGELA a odd que o ticket já tinha', () => {
    const c = cenario();
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    const oddNaAposta = t.odd;
    c.avancar(FASE_MS.APOSTA + 1); c.sched.tick();
    const linha = c.db.prepare(`SELECT odd, status FROM bets WHERE id=?`).get(t.id);
    igual(linha.odd, oddNaAposta,
      'a odd do ticket mudou no lock. Pagar com a odd de hoje uma aposta de ontem ' +
      'é inventar preço depois do fato.');
    igual(linha.status, 'travada', `o status ficou "${linha.status}" depois do lock`);
  });

  /* --- SETTLEMENT --------------------------------------------------------- */

  s.teste('quem apostou no campeão recebe com a odd do TICKET', () => {
    const c = cenario();
    /* Descobre o campeão antes de apostar. Só o TESTE pode fazer isso — é o
       ponto do commit-reveal que ninguém mais consiga. */
    const campeao = c.sched.espiarCampeao(c.r.id);
    const vencedor = c.db.prepare(
      `SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`).get(c.r.id, campeao);
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: vencedor.slot,
                              valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });

    const esperado = Math.floor(100 * t.odd);
    igual(saldos(c.db, c.u.id).transferivel, 900 + esperado,
      `o payout não bate com a odd do ticket (x${t.odd})`);
    igual(c.db.prepare(`SELECT status, payout FROM bets WHERE id=?`).get(t.id).status, 'ganha',
      'o ticket vencedor não foi marcado como ganho');
  });

  s.teste('quem apostou em outro perde a reserva, e ela não volta', () => {
    const c = cenario();
    const campeao = c.sched.espiarCampeao(c.r.id);
    const perdedor = c.db.prepare(
      `SELECT slot FROM round_fighters WHERE round_id=? AND species_id<>? LIMIT 1`)
      .get(c.r.id, campeao);
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: perdedor.slot, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 900, 'a aposta perdida voltou para o disponível');
    igual(saldos(c.db, c.u.id).reservado_transferivel, 0, 'a aposta perdida ficou reservada');
  });

  /* A INVARIANTE "PAYOUT OCORRE UMA ÚNICA VEZ", do §4.6. */
  s.teste('liquidar a MESMA rodada cinco vezes paga UMA vez', () => {
    const c = cenario();
    const campeao = c.sched.espiarCampeao(c.r.id);
    const v = c.db.prepare(`SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
      .get(c.r.id, campeao);
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: v.slot, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    for (let i = 0; i < 5; i++)
      liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 900 + Math.floor(100 * t.odd),
      'pagou mais de uma vez — é a invariante "payout ocorre uma única vez" do §4.6');
    igual(reconciliarNoBanco(c.db, c.u.id).length, 0, 'o ledger não fecha depois da repetição');
  });

  s.teste('liquidar antes do fim da rodada é recusado PELO MOTIVO CERTO', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    const e = recusa(() => liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() }));
    ok(e, 'liquidou uma rodada que ainda não terminou');
    /* PELO MOTIVO CERTO, e a precisão importa: a primeira versão só conferia
       que ALGUM erro aconteceu, e o erro que acontecia era "terminou sem
       campeão" — a checagem de status podia sumir inteira sem o teste notar.
       Duas guardas seguidas e um teste que aceita qualquer uma delas é um
       teste que cobre só a segunda. */
    ok(/ainda não terminou/.test(e.message),
      `a recusa veio por "${e.message}" e não pela FASE da rodada. A guarda de ` +
      `status pode ter sumido, com a de campeão nulo cobrindo por acidente.`);
  });

  /* ISOLA A CHAVE DE IDEMPOTÊNCIA DO FILTRO DE STATUS.
   *
   * O settlement tem duas redes: só processa tickets `travada`, e a chave da
   * carteira é derivada do ticket. Sabotar uma deixa a outra cobrindo — é o
   * mesmo padrão registrado na L-032, e as duas sabotagens passaram.
   *
   * Este teste desarma a PRIMEIRA de propósito, revertendo o status à mão, e
   * pergunta se a segunda segura. É o cenário real de "alguém reprocessou a
   * rodada depois de mexer numa coluna", que é exatamente quando pagar duas
   * vezes acontece de verdade. */
  s.teste('reverter o status do ticket à mão NÃO faz o payout acontecer de novo', () => {
    const c = cenario();
    const campeao = c.sched.espiarCampeao(c.r.id);
    const v = c.db.prepare(`SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
      .get(c.r.id, campeao);
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: v.slot, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });
    const depoisDoPrimeiro = saldos(c.db, c.u.id).transferivel;

    /* Desarma o filtro de status e liquida de novo. */
    c.db.prepare(`UPDATE bets SET status='travada' WHERE id=?`).run(t.id);
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() + 1 });

    igual(saldos(c.db, c.u.id).transferivel, depoisDoPrimeiro,
      'pagou de novo com o status revertido. A chave de idempotência da carteira ' +
      'é a rede que não depende de uma COLUNA estar certa — e é a invariante ' +
      '"payout ocorre uma única vez" do §4.6.');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger
                        WHERE user_id=? AND type LIKE 'BET_PAYOUT%'`).get(c.u.id).n, 1,
      'dois lançamentos de payout no ledger para o mesmo ticket');
  });

  /* --- Q6 e os tetos do F0.8 --------------------------------------------- */

  s.teste('o teto de payout por ticket é aplicado NO SERVIDOR', () => {
    const c = cenario({ saldo: 10_000_000 });
    const e = recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                                           valor: 9_000_000, agora: c.agoraDe() }));
    ok(e, 'aposta que estoura o MAX_PAYOUT_POR_TICKET foi aceita. O teto do F0.8 ' +
          'existia só no cliente, e o cliente é do jogador.');
  });

  s.teste('não dá para apostar em nome de outro usuário', () => {
    const c = cenario();
    const outro = cadastrar(c.db, { username: 'b', email: 'b@exemplo.test',
      senha: 'senha-longa-o-bastante-2', nascimento: '1990-01-01', agora: c.agoraDe() });
    /* O outro não tem saldo: se a reserva saísse da carteira errada, passaria. */
    const e = recusa(() => apostar(c.db, { sched: c.sched, userId: outro.id, slot: 0,
                                           valor: 100, agora: c.agoraDe() }));
    ok(e, 'apostou 100 com saldo 0 — a reserva saiu da carteira de outro usuário');
    igual(saldos(c.db, c.u.id).transferivel, 1000, 'o saldo da vítima mudou');
  });

  s.teste('conta congelada não aposta', () => {
    const c = cenario();
    c.db.prepare(`UPDATE users SET status='congelado' WHERE id=?`).run(c.u.id);
    ok(recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
      valor: 100, agora: c.agoraDe() })),
      'conta congelada apostou — a barreira do §28.2 não alcança a aposta');
  });

  /* --- Q8: settlement concorrente ---------------------------------------- */

  s.teste('dois settlements intercalados da mesma rodada não duplicam nada', () => {
    const c = cenario();
    const campeao = c.sched.espiarCampeao(c.r.id);
    const v = c.db.prepare(`SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
      .get(c.r.id, campeao);
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: v.slot, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    /* Dois "processos" alternando, que é o que a intercalação de transações
       consegue reproduzir num runtime síncrono — ver a L-032. */
    for (let i = 0; i < 10; i++)
      liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() + i });
    igual(saldos(c.db, c.u.id).transferivel, 900 + Math.floor(100 * t.odd), 'pagou mais de uma vez');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE user_id=? AND type LIKE 'BET_PAYOUT%'`)
      .get(c.u.id).n, 1, 'mais de um lançamento de payout no ledger');
  });

  return s;
}
