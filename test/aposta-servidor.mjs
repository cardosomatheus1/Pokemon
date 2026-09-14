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
import { CONF } from '../engine/engine.mjs';
import { perfilDe, desafiosDe } from '../server/progressao.mjs';
import { xpDaRodada } from '../engine/progressao.mjs';

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
  const baratos = maisBaratos(db, r.id);
  return { db, sched, u, r, fav: baratos[0].slot, fav2: baratos[1].slot,
           avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

/* Um slot que existe na rodada, com a odd que o servidor gravou. */
const slotComOdd = (db, roundId, slot = 0) =>
  db.prepare(`SELECT slot, species_id, offered_odd FROM round_fighters
              WHERE round_id=? AND slot=?`).get(roundId, slot);

/* OS SLOTS DA RODADA, DO MAIS BARATO PARA O MAIS CARO — e o porquê é o D-044.
 *
 * Apostar valor FIXO num slot FIXO faz o teste depender da odd SORTEADA: o teto
 * por bilhete do §4.4.6 recusa a aposta quando `valor × odd` passa de 50.000, e
 * a raiz da rodada sai do CSPRNG, então a odd muda a cada execução. O teste
 * reprovava de vez em quando por um motivo que não tem nada a ver com o que ele
 * afirma — e chegou a abortar um portão Q2 inteiro.
 *
 * Medido em 150 rodadas com `sims=600`, que é a configuração desta suíte:
 *
 *     odd do FAVORITO      mediana  4,17   máximo    7,13
 *     odd do slot 0        mediana 12,51   máximo  187,68
 *     MAIOR odd da rodada  mediana 46,92   máximo  563,04
 *
 *     apostando 300 no slot 0     1 rodada de 150 reprova
 *     apostando 300 no favorito   0 de 150
 *
 * O favorito é o mais caro que a suíte pode apostar com folga: 300 × 7,13 = 2139
 * contra um teto de 50.000, e são 24× de margem contra o x167 que faria reprovar.
 * O teste passa a depender de um fato ESTÁVEL — "existe um favorito" — em vez de
 * um sorteado. Não há `ODD_MAX` no engine (`engine.mjs`), então a cauda de cima
 * é aberta e nenhum valor fixo é seguro por construção.
 *
 * QUEM NÃO USA ISTO, DE PROPÓSITO: o teste do teto (aposta 9.000.000 para
 * ESTOURAR o teto — trocar o slot ali apagaria a única cobertura do §4.4.6 no
 * servidor) e os de settlement, que precisam apostar no CAMPEÃO ou num PERDEDOR
 * porque é isso que eles afirmam. */
const maisBaratos = (db, roundId) =>
  db.prepare(`SELECT slot, offered_odd FROM round_fighters
              WHERE round_id=? ORDER BY offered_odd ASC, slot ASC`).all(roundId);

export function suite() {
  const s = criarSuite('aposta-servidor');

  /* --- o caminho feliz ---------------------------------------------------- */

  s.teste('apostar reserva o dinheiro e grava a composição no ticket', () => {
    const c = cenario();
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav,
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
    const oficial = slotComOdd(c.db, c.r.id, c.fav).offered_odd;
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100,
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
    const a = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
    const b = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav2, valor: 100, agora: c.agoraDe() });
    const quantas = c.db.prepare(`SELECT COUNT(*) n FROM bets WHERE user_id=? AND round_id=?`)
      .get(c.u.id, c.r.id).n;
    igual(quantas, 1,
      `${quantas} apostas do mesmo usuário na mesma rodada. Com duas, o jogador ` +
      `cobre os doze lutadores e sai sempre no lucro.`);
    igual(b.id, a.id, 'a troca criou um ticket novo em vez de atualizar o existente');
    igual(b.slot, c.fav2, 'a troca não mudou o lutador');
    /* E o dinheiro da primeira voltou: trocar não pode custar duas reservas. */
    igual(saldos(c.db, c.u.id).transferivel, 900, 'a troca cobrou duas vezes');
  });

  s.teste('trocar para um valor MAIOR reserva a diferença, e para menor devolve', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 300, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 700, 'o aumento não reservou a diferença');
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 50, agora: c.agoraDe() });
    igual(saldos(c.db, c.u.id).transferivel, 950, 'a redução não devolveu a diferença');
  });

  s.teste('cancelar devolve o dinheiro e some com o ticket ativo', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
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
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + 1); c.sched.tick();
    ok(recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav2,
      valor: 100, agora: c.agoraDe() })), 'trocou de lutador depois do lock');
    ok(recusa(() => cancelar(c.db, { sched: c.sched, userId: c.u.id, agora: c.agoraDe() })),
      'cancelou depois do lock — quem viu o resultado sairia da aposta perdedora');
    const linha = c.db.prepare(`SELECT slot_apostado, status FROM bets WHERE user_id=?`).get(c.u.id);
    igual(linha.slot_apostado, c.fav, 'o lutador mudou depois do lock');
  });

  s.teste('o lock CONGELA a odd que o ticket já tinha', () => {
    const c = cenario();
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
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
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
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

  /* --- A PONTA DE SERVIDOR DO CIRCUITO DA PROGRESSÃO (bloco 0.1, D-045) --- */

  /* Por que MORA AQUI, e não em `progressao-ligada.mjs`: a afirmação é sobre o
     que a LIQUIDAÇÃO faz, e este é o arquivo onde a rodada se liquida à mão,
     com relógio controlado. Medir isto contra um servidor de verdade obrigaria
     a esperar uma rodada terminar em tempo de parede — e teste que espera
     relógio é a origem do D-033 e do D-044.

     A REGRA É A DO §5.10: o jogador não declara progresso, o servidor DERIVA do
     que ele fez. Nenhuma rota nova precisa existir para isto — a liquidação já
     sabe quem apostou, em quem, e se ganhou. */
  s.teste('liquidar a rodada dá XP a quem apostou, e o servidor DERIVA o valor', () => {
    const c = cenario();
    igual(perfilDe(c.db, { userId: c.u.id }).xp, 0, 'o perfil não nasceu zerado');

    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });

    ok(perfilDe(c.db, { userId: c.u.id }).xp > 0,
      'o XP continua zero depois de uma rodada liquidada em que o jogador apostou. ' +
      'É o D-045 pela ponta do servidor: `darXP` existe, é testado, e a liquidação ' +
      'nunca o chama — então a rota `/api/perfil` devolve fielmente um perfil que ' +
      'nunca cresce, e ligar o cliente nela não adiantaria nada.');
  });

  /* A OUTRA METADE, e ela é a que o §7.8 vai reusar: o desafio anda com o FATO.
     Se só o XP subisse, os desafios diários continuariam sendo coisa do cliente
     — que é metade do D-045 de pé. */
  /* ── ESTE TESTE JÁ NASCEU INSTÁVEL UMA VEZ, E A CORREÇÃO É O ASSUNTO ──────
   *
   * A primeira versão somava o progresso de TODOS os desafios do dia e exigia
   * que a soma subisse. Parecia inofensivo e era o D-044 outra vez, pior:
   *
   *     `desafiosDe` sorteia TRÊS dos cinco tipos do POOL_PADRAO, de forma
   *     determinística por (conta, dia) — e a conta é um UUID novo a cada
   *     execução. Medido em 300 sorteios com a data fixa desta suíte:
   *
   *         com `apostar` no sorteio    175
   *         SEM `apostar` no sorteio    125     ← o teste reprovava aqui
   *
   * Quatro execuções em dez, contra as 0,7% do D-044. Ele reprovou na primeira
   * suíte completa em que rodou, e foi assim que apareceu.
   *
   * A CORREÇÃO É A MESMA DE LÁ: fazer o teste depender de um fato que ele
   * ESTABELECE, e não de um sorteado. A linha do desafio é inserida aqui, com
   * tipo conhecido — `desafiosDe` só sorteia quando não existe nada para o dia,
   * então a inserção manda. O teste passa a afirmar o que ele diz afirmar: a
   * liquidação faz andar o desafio DAQUELE tipo. */
  s.teste('liquidar a rodada faz o desafio de apostar andar', () => {
    const c = cenario();
    const dia = new Date(c.agoraDe()).toISOString().slice(0, 10);
    c.db.prepare(`INSERT INTO challenges (user_id, dia, slot, tipo, alvo) VALUES (?,?,?,?,?)`)
      .run(c.u.id, dia, 0, 'apostar', 3);

    const doTipo = () => desafiosDe(c.db, { userId: c.u.id, agora: c.agoraDe() })
      .find(d => d.tipo === 'apostar');
    igual(doTipo().progresso, 0, 'o desafio não nasceu zerado');

    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });

    igual(doTipo().progresso, 1,
      'o desafio de apostar não andou depois da liquidação. `registrarFeito` não ' +
      'é chamado por ela, e os desafios seguem sendo contados no cliente — onde o ' +
      'teto de emissão do Estudo Econômico não vale.');
  });

  /* A GUARDA DO `dex`, E POR QUE ELA PRECISOU DE UM TESTE QUE FORÇA A DIVERGÊNCIA.
   *
   * A liquidação confere `meu.dex === t.species_id` antes de conceder. Hoje a
   * conferência NUNCA falha: o índice do array de resultado é o índice na pool,
   * e ele coincide com o `slot` porque `precificar` preserva a ordem (`idx: i`).
   *
   * Foi por isso que o Q2 pegou o `S514` — remover a guarda não mudava nada
   * observável, e nenhum teste reprovava. Uma guarda sem teste é uma guarda que
   * o próximo refactor apaga por parecer morta, e ela existe justamente para o
   * dia em que alguém ordenar a lista de preços por odd: aí o XP e o desafio
   * iriam para o lutador errado, calados.
   *
   * O teste força o desalinhamento à mão — troca a espécie gravada no slot
   * apostado — e exige que a liquidação RECUSE conceder. É o único jeito de
   * medir uma guarda cujo gatilho ainda não existe no código. */
  s.teste('a liquidação NÃO concede quando o slot aponta para outra espécie', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav, valor: 100, agora: c.agoraDe() });

    /* DESALINHA O SLOT DO BILHETE, e não a tabela — a primeira versão deste
       teste mexia em `round_fighters` e ficou vermelha por engano: o
       `resultadoDaRodada` deriva o `dex` da SIMULAÇÃO, a partir da raiz, e não
       lê aquela tabela. Corrompê-la não desalinha nada.
       O que uma reordenação de `precificar` produziria é exatamente isto: o
       bilhete guarda a espécie comprada, e o `slot` dele deixa de apontar para
       ela no array indexado pela pool. */
    const outroSlot = (c.fav + 1) % 12;
    c.db.prepare(`UPDATE bets SET slot_apostado=? WHERE user_id=?`)
      .run(outroSlot, c.u.id);

    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });

    igual(perfilDe(c.db, { userId: c.u.id }).xp, 0,
      'a liquidação concedeu XP com o slot apontando para outra espécie. Sem a ' +
      'conferência do `dex`, uma reordenação da lista de preços paga XP e desafio ' +
      'ao lutador errado — e não há teste vermelho para avisar. XP a menos é ' +
      'defeito com endereço; XP ao lutador errado é ruído que ninguém rastreia.');
  });

  /* A IDEMPOTÊNCIA DO XP, e ela precisa de teste próprio porque a defesa dele
     não é a mesma da carteira.
     O saldo sobrevive a um reprocessamento pela chave derivada do ticket, e a
     `L-032` registra que duas redes independentes são o desenho certo. O XP não
     tem ledger para se defender sozinho — ele é uma coluna que só sobe. A rede
     é `settled_at`, e este teste é o que impede alguém de removê-la achando que
     o filtro de status já bastava. Mesmo cenário do teste de payout logo acima:
     alguém reprocessou a rodada depois de mexer numa coluna. */
  s.teste('reverter o status do ticket à mão NÃO concede o XP de novo', () => {
    const c = cenario();
    const campeao = c.sched.espiarCampeao(c.r.id);
    const v = c.db.prepare(`SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`)
      .get(c.r.id, campeao);
    const t = apostar(c.db, { sched: c.sched, userId: c.u.id, slot: v.slot, valor: 100, agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() });
    const xpDepoisDoPrimeiro = perfilDe(c.db, { userId: c.u.id }).xp;
    ok(xpDepoisDoPrimeiro > 0, 'a primeira liquidação não deu XP nenhum');

    /* O VALOR EXATO, E NÃO SÓ "SUBIU" — exigência do Q2, e ela pegou um buraco.
     *
     * A primeira versão comparava apenas o XP antes e depois da SEGUNDA
     * liquidação. O `S515` — uma segunda concessão acrescentada dentro do mesmo
     * ramo — acontece na PRIMEIRA, então os dois lados da comparação já vinham
     * inflados e o teste ficava verde com o defeito plantado.
     *
     * Aqui o esperado é derivado do mesmo resultado da rodada que a liquidação
     * usou. Isso não prova a FÓRMULA (os dois lados chamariam a mesma função se
     * ela estivesse errada) — prova a LIGAÇÃO, que é o que este teste afirma:
     * concedeu uma vez, com as parcelas daquela rodada, e nada além. */
    const meu = c.sched.resultadoDaRodada(c.r.id)[v.slot];
    const esperado = xpDaRodada({ venceu: true, pos: meu.pos, abates: meu.abates, odd: t.odd })
      .reduce((a, p) => a + p.xp, 0);
    igual(xpDepoisDoPrimeiro, esperado,
      `a liquidação concedeu ${xpDepoisDoPrimeiro} de XP e as parcelas da rodada ` +
      `somam ${esperado}. Sobrando, alguém concede duas vezes; faltando, uma ` +
      `parcela se perdeu no caminho entre a tela e o servidor.`);

    c.db.prepare(`UPDATE bets SET status='travada' WHERE id=?`).run(t.id);
    liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agoraDe() + 1 });

    igual(perfilDe(c.db, { userId: c.u.id }).xp, xpDepoisDoPrimeiro,
      'o XP foi concedido de novo com o status revertido. `settled_at` é a única ' +
      'rede do XP — ele é uma coluna que só sobe, sem ledger para reconciliar ' +
      'depois, e um reprocessamento acidental inflaria o nível de quem estava por perto.');
  });

  /* --- Q6 e os tetos do F0.8 --------------------------------------------- */

  /* A REDE QUE IMPEDE O D-044 DE VOLTAR.
   *
   * O conserto foi trocar slot FIXO por favorito, e conserto assim se desfaz
   * sozinho: basta o próximo bloco escrever `slot: 0` outra vez e a suíte volta
   * a reprovar em uma execução de cento e cinquenta — raro o bastante para
   * ninguém ligar o vermelho ao commit que o trouxe.
   *
   * Este teste não afirma o conserto. Afirma a MARGEM, que é o que o conserto
   * comprou: o maior valor que esta suíte aposta (300) contra a odd do favorito
   * tem de caber no teto com folga larga. Se alguém baixar a folga — mexendo no
   * teto, na precificação ou no valor apostado — ele fica vermelho AQUI, com
   * endereço, em vez de vermelho lá adiante, às vezes.
   *
   * A folga exigida é 10×, e o número não é redondo por acaso: medido em 150
   * rodadas, a odd do favorito ficou entre x1,28 e x7,13, e 300 × 7,13 = 2.139
   * contra o teto de 50.000 — 23× de folga. Exigir 10× reprova bem antes de a
   * suíte voltar a ser instável, e não reprova por variação normal do sorteio. */
  s.teste('a aposta no favorito cabe no teto com folga de 10× — a rede do D-044', () => {
    const c = cenario();
    const odd = slotComOdd(c.db, c.r.id, c.fav).offered_odd;
    const retorno = Math.floor(300 * odd);
    ok(retorno * 10 <= CONF.MAX_PAYOUT_POR_TICKET,
      `apostar 300 no favorito (x${odd.toFixed(2)}) devolveria ${retorno}, e o teto ` +
      `por bilhete é ${CONF.MAX_PAYOUT_POR_TICKET}. A folga caiu para ` +
      `${(CONF.MAX_PAYOUT_POR_TICKET / retorno).toFixed(1)}× — abaixo de 10×, esta ` +
      `suíte volta a depender da odd sorteada, que é o D-044.`);
    /* E a aposta precisa mesmo ser ACEITA: a folga acima é aritmética, e
       aritmética verde com a aposta recusada seria a folga certa medida contra
       um caminho que ninguém percorre. */
    ok(apostar(c.db, { sched: c.sched, userId: c.u.id, slot: c.fav,
                       valor: 300, agora: c.agoraDe() }).id,
      'a aposta de 300 no favorito foi recusada, apesar da folga contra o teto');
  });

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
