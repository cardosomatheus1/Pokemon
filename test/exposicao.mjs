/* Q1/Q3/Q6 · TETOS DE EXPOSIÇÃO — o primeiro parâmetro de uma casa de apostas.
 *
 * A Spec §4.4.6 abre com o diagnóstico: *"a v1.3 não define teto de odd, teto de
 * payout, nem limite de passivo por rodada. Os termos `max_odd`, `cap de
 * payout`, `liability` e `exposure` não aparecem em nenhum dos três documentos
 * do conjunto. Numa casa de apostas isso é o primeiro parâmetro definido."*
 *
 * A magnitude: o pior lutador tem odd justa x62. Sem teto, UM ticket de 5.000
 * gera passivo de 287.500 numa rodada.
 *
 * O INSTRUMENTO É TETO DE PAYOUT, NÃO TETO DE ODD, e isso é decisão de desenho
 * com número: um teto de odd em x20 transforma a margem declarada de 8 % em
 * 68 % no azarão — contradiz o P1 e o discurso de transparência que o produto
 * usa como diferencial. Teto de payout preserva a odd e limita só o tamanho da
 * aposta: `stake_max_i = payout_max / odd_i`.
 *
 * As três regras que os testes abaixo afirmam, do §4.4.6:
 *   · o corte é aplicado ANTES de confirmar, nunca no settlement;
 *   · a interface mostra o stake máximo e o MOTIVO — nunca rejeita em silêncio;
 *   · nenhum teto é aplicado retroativamente a ticket já confirmado.
 */
import * as E from './motor.mjs';
import { tiposDaPool } from '../engine/engine.mjs';
import { derivar, sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';
import { avaliarAposta, liberarTicket, passivoVazio, registrarTicket, passivoDaRodada } from '../engine/exposicao.mjs';
import { MARGEM_MAX } from '../engine/preco.mjs';
import { criarSuite, ok, igual } from './harness.mjs';

const APOSTA_MIN = 50;

/* Pool com preço de verdade — os tetos mordem em função da ODD, então usar
   odds inventadas testaria outra coisa. Lote curto: o que importa aqui é a
   forma do preço, não a precisão dele. */
function rodadaComPreco(semente = 0xF08) {
  const raiz = derivar(semente, 'exposicao');
  const s = sementes(raiz);
  const elenco = E.sortearPool(s.elenco);
  const clima = E.sortearClima(s.ambiente, tiposDaPool(elenco));
  const wins = new Uint32Array(elenco.length);
  simularLote(E.M, elenco, raiz, 0, 3000, wins);
  return { elenco, registro: precificar(wins, 3000, E.M) };
}

export function suite() {
  const s = criarSuite('exposicao');
  const CONF = E.CONF;
  /* Preguiçoso de propósito: construir a suíte não pode custar simulação. Ver
     a nota em test/margem.mjs — a sabotagem roda a suíte mais de cem vezes, e
     medição paga na construção é paga mesmo quando a execução para antes. */
  let cache = null;
  const reg = () => (cache ??= rodadaComPreco().registro);

  s.teste('os dois tetos existem e o de rodada é dez vezes o de ticket', () => {
    ok(CONF.MAX_PAYOUT_POR_TICKET > 0, 'MAX_PAYOUT_POR_TICKET não existe');
    igual(CONF.MAX_LIABILITY_POR_RODADA, 10 * CONF.MAX_PAYOUT_POR_TICKET,
      'o §4.4.6 define o passivo por rodada como 10x o payout por ticket');
  });

  s.teste('o registro publica o stake máximo por lutador', () => {
    for (const l of reg().lutadores) {
      ok(Number.isFinite(l.stakeMax) && l.stakeMax > 0, `${l.idx} sem stakeMax`);
      /* stake_max_i = payout_max / odd_i, arredondado para baixo: arredondar
         para cima deixaria o payout estourar o teto por centavos. */
      igual(l.stakeMax, Math.floor(CONF.MAX_PAYOUT_POR_TICKET / l.odd),
        `o stakeMax de ${l.idx} não é floor(payout_max / odd)`);
      ok(l.stakeMax * l.odd <= CONF.MAX_PAYOUT_POR_TICKET,
        `apostar o stakeMax em ${l.idx} já estoura o teto de payout`);
    }
    /* Quem paga mais aceita menos: é a forma do instrumento. */
    const ordenado = [...reg().lutadores].sort((a, b) => a.odd - b.odd);
    for (let i = 1; i < ordenado.length; i++)
      ok(ordenado[i].stakeMax <= ordenado[i-1].stakeMax,
        'odd maior precisa ter stake máximo menor ou igual');
  });

  s.teste('o registro declara os dois tetos aplicados', () => {
    igual(reg().tetoPayoutPorTicket, CONF.MAX_PAYOUT_POR_TICKET,
      'o registro não diz qual teto de payout valeu nesta rodada');
    igual(reg().tetoPassivoPorRodada, CONF.MAX_LIABILITY_POR_RODADA,
      'o registro não diz qual teto de passivo valeu nesta rodada');
  });

  /* ------------------------------------------------ o corte, antes de tudo */

  s.teste('aposta dentro do teto passa inteira', () => {
    const p = passivoVazio(reg(), CONF);
    const alvo = reg().lutadores.reduce((a, b) => (b.odd < a.odd ? b : a));  // favorito
    const r = avaliarAposta(reg(), p, alvo.idx, 100, CONF);
    ok(r.aceito, `aposta de 100 no favorito recusada: ${r.mensagem}`);
    igual(r.valor, 100, 'a aposta foi cortada sem precisar');
    igual(r.cortado, false, 'aposta dentro do teto marcada como cortada');
  });

  s.teste('aposta acima do teto é CORTADA, não recusada', () => {
    const p = passivoVazio(reg(), CONF);
    const azarao = reg().lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    const pedido = azarao.stakeMax * 3;
    const r = avaliarAposta(reg(), p, azarao.idx, pedido, CONF);
    ok(r.aceito, 'a aposta foi recusada em vez de cortada — o §4.4.6 manda cortar');
    igual(r.cortado, true, 'o corte aconteceu e não foi sinalizado');
    igual(r.valor, azarao.stakeMax, 'o corte não parou no stake máximo');
    igual(r.motivo, 'MAX_PAYOUT_POR_TICKET', 'o motivo do corte não foi nomeado');
  });

  /* O portão Q5 do bloco: "a mensagem precisa dizer qual limite, quanto cabe e
     por quê. Rejeição silenciosa reprova o bloco." Aqui a checagem é do
     CONTEÚDO da mensagem; a captura na tela é do teste visual. */
  s.teste('a mensagem de corte diz qual limite, quanto cabe e por quê', () => {
    const p = passivoVazio(reg(), CONF);
    const azarao = reg().lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    const r = avaliarAposta(reg(), p, azarao.idx, azarao.stakeMax * 5, CONF);
    const m = r.mensagem;
    ok(typeof m === 'string' && m.length > 0, 'corte sem mensagem — rejeição silenciosa');
    ok(m.includes(String(azarao.stakeMax)) || m.includes(azarao.stakeMax.toLocaleString('pt-BR')),
      `a mensagem não diz QUANTO cabe (${azarao.stakeMax}): "${m}"`);
    ok(/payout|retorno/i.test(m), `a mensagem não diz POR QUÊ: "${m}"`);
    ok(m.includes(String(CONF.MAX_PAYOUT_POR_TICKET))
       || m.includes(CONF.MAX_PAYOUT_POR_TICKET.toLocaleString('pt-BR')),
      `a mensagem não diz QUAL limite: "${m}"`);
  });

  /* -------------------------------------------------- passivo por rodada */

  s.teste('o passivo acumula por lutador, não por rodada inteira', () => {
    const p = passivoVazio(reg(), CONF);
    const a = reg().lutadores[0], b = reg().lutadores[1];
    registrarTicket(p, a.idx, 100, a.odd);
    registrarTicket(p, b.idx, 100, b.odd);
    ok(Math.abs(p[a.idx] - 100 * a.odd) < 1e-9, 'o passivo do lutador 0 não bate');
    ok(Math.abs(p[b.idx] - 100 * b.odd) < 1e-9, 'o passivo do lutador 1 não bate');
    /* O passivo DA RODADA é o pior caso: quanto a casa paga se vencer o
       lutador mais caro. Somar tudo superestimaria — só um vence. */
    igual(passivoDaRodada(p), Math.max(...p), 'o passivo da rodada não é o pior caso');
  });

  s.teste('o mercado de um lutador fecha ao saturar o passivo', () => {
    const p = passivoVazio(reg(), CONF);
    const alvo = reg().lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    /* enche o passivo dele até o teto, ticket a ticket */
    let voltas = 0;
    while (voltas++ < 1000) {
      const r = avaliarAposta(reg(), p, alvo.idx, alvo.stakeMax, CONF);
      if (!r.aceito) break;
      registrarTicket(p, alvo.idx, r.valor, alvo.odd);
    }
    const r = avaliarAposta(reg(), p, alvo.idx, APOSTA_MIN, CONF);
    ok(!r.aceito, 'o mercado não fechou depois de saturar o passivo');
    igual(r.motivo, 'MAX_LIABILITY_POR_RODADA', 'o fechamento não nomeou o limite');
    ok(/fechad|esgotad|saturad/i.test(r.mensagem),
      `o fechamento de mercado não é explicado: "${r.mensagem}"`);
    ok(p[alvo.idx] <= CONF.MAX_LIABILITY_POR_RODADA,
      `o passivo do lutador chegou a ${p[alvo.idx]}, acima do teto`);
    /* e os OUTROS mercados continuam abertos: o teto é por lutador */
    const outro = reg().lutadores.find(l => l.idx !== alvo.idx);
    ok(avaliarAposta(reg(), p, outro.idx, APOSTA_MIN, CONF).aceito,
      'fechar um mercado fechou os outros junto');
  });

  /* ------------------------------------------------------------------ Q3 */

  /* A SONDA DE BORDA. O lote aleatório abaixo cobre a faixa larga, mas quase
     nunca cai exatamente em `stakeMax + 1` — e foi por isso que o defeito S42,
     que afrouxa o teto em UMA unidade, passou despercebido na primeira rodada
     de sabotagem. Erro de limite não se pega por amostragem; se pega pedindo
     exatamente o limite, e exatamente um a mais. */
  s.teste('pedir um a mais que o stake máximo é cortado, em todos os lutadores', () => {
    for (const l of reg().lutadores) {
      const p = passivoVazio(reg(), CONF);
      const exato = avaliarAposta(reg(), p, l.idx, l.stakeMax, CONF);
      igual(exato.valor, l.stakeMax, `pedir exatamente o stake máximo de ${l.idx} foi cortado`);
      igual(exato.cortado, false, `o stake máximo exato de ${l.idx} foi marcado como corte`);

      const umAMais = avaliarAposta(reg(), p, l.idx, l.stakeMax + 1, CONF);
      igual(umAMais.valor, l.stakeMax,
        `pedi ${l.stakeMax + 1} em x${l.odd.toFixed(2)} e passaram ${umAMais.valor}`);
      igual(umAMais.cortado, true, `o corte de um a mais em ${l.idx} não foi sinalizado`);
      ok(umAMais.valor * l.odd <= CONF.MAX_PAYOUT_POR_TICKET + 1e-9,
        `${umAMais.valor} em x${l.odd.toFixed(2)} pagaria ${(umAMais.valor*l.odd).toFixed(2)}, ` +
        `acima do teto de ${CONF.MAX_PAYOUT_POR_TICKET}`);
    }
  });

  /* A mesma sonda na outra borda: o passivo da rodada. */
  s.teste('pedir um a mais que o espaço restante no passivo é cortado', () => {
    for (const l of reg().lutadores) {
      const p = passivoVazio(reg(), CONF);
      /* deixa espaço para menos de um ticket cheio */
      const espaco = Math.floor(l.stakeMax / 2);
      p[l.idx] = CONF.MAX_LIABILITY_POR_RODADA - espaco * l.odd;
      const r = avaliarAposta(reg(), p, l.idx, espaco + 1, CONF);
      ok(r.aceito, `mercado fechou com espaço para ${espaco}`);
      ok(p[l.idx] + r.valor * l.odd <= CONF.MAX_LIABILITY_POR_RODADA + 1e-9,
        `pedi ${espaco + 1} e passaram ${r.valor}: o passivo iria a ` +
        `${(p[l.idx] + r.valor*l.odd).toFixed(0)}, acima de ${CONF.MAX_LIABILITY_POR_RODADA}`);
    }
  });

  s.teste('nenhum ticket confirmado excede MAX_PAYOUT_POR_TICKET', () => {
    const p = passivoVazio(reg(), CONF);
    const R = (n => { let a = n; return () => (a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x80000000; })(7);
    for (let i = 0; i < 4000; i++) {
      const idx = (R() * reg().lutadores.length) | 0;
      const pedido = Math.floor(R() * 200000) + 1;
      const r = avaliarAposta(reg(), p, idx, pedido, CONF);
      if (!r.aceito) continue;
      const odd = reg().lutadores[idx].odd;
      ok(r.valor * odd <= CONF.MAX_PAYOUT_POR_TICKET + 1e-9,
        `ticket de ${r.valor} em x${odd} pagaria ${r.valor*odd}, acima do teto`);
      registrarTicket(p, idx, r.valor, odd);
    }
  });

  s.teste('nenhuma rodada excede MAX_LIABILITY_POR_RODADA', () => {
    const p = passivoVazio(reg(), CONF);
    const R = (n => { let a = n; return () => (a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x80000000; })(99);
    for (let i = 0; i < 6000; i++) {
      const idx = (R() * reg().lutadores.length) | 0;
      const r = avaliarAposta(reg(), p, idx, Math.floor(R() * 90000) + 1, CONF);
      if (r.aceito) registrarTicket(p, idx, r.valor, reg().lutadores[idx].odd);
      ok(passivoDaRodada(p) <= CONF.MAX_LIABILITY_POR_RODADA + 1e-9,
        `passivo da rodada chegou a ${passivoDaRodada(p)}, acima do teto`);
    }
  });

  /* ------------------------------------------------------------------ Q6 */

  s.teste('não dá para burlar o teto dividindo em vários tickets', () => {
    /* O ataque óbvio: se o teto fosse por ticket e o passivo não acumulasse,
       bastaria repetir o stake máximo até o infinito. */
    const p = passivoVazio(reg(), CONF);
    const alvo = reg().lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    let total = 0;
    for (let i = 0; i < 500; i++) {
      const r = avaliarAposta(reg(), p, alvo.idx, alvo.stakeMax, CONF);
      if (!r.aceito) break;
      registrarTicket(p, alvo.idx, r.valor, alvo.odd);
      total += r.valor;
    }
    ok(total * alvo.odd <= CONF.MAX_LIABILITY_POR_RODADA + 1e-9,
      `500 tickets no stake máximo geraram passivo de ${(total*alvo.odd).toFixed(0)}`);
  });

  s.teste('stake negativo, zero, NaN e Infinity não passam', () => {
    const p = passivoVazio(reg(), CONF);
    for (const v of [-1, -100000, 0, NaN, Infinity, -Infinity, '500', null, undefined]) {
      const r = avaliarAposta(reg(), p, 0, v, CONF);
      ok(!r.aceito, `stake ${String(v)} foi aceito`);
      ok(r.motivo === 'VALOR_INVALIDO', `stake ${String(v)} recusado pelo motivo errado: ${r.motivo}`);
    }
  });

  s.teste('lutador inexistente não gera aposta', () => {
    const p = passivoVazio(reg(), CONF);
    for (const idx of [-1, 999, 1.5, NaN, null, undefined, '0'])
      ok(!avaliarAposta(reg(), p, idx, 100, CONF).aceito,
        `aposta aceita no lutador inexistente ${String(idx)}`);
  });

  /* A corrida do §4.4.6: duas confirmações no mesmo lutador, no último
     instante. A defesa é a avaliação ser PURA e o passivo ser lido no momento
     do registro — quem avalia contra um passivo velho e registra contra o novo
     é exatamente o que abre a brecha. */
  s.teste('duas confirmações no mesmo instante não estouram o teto', () => {
    const p = passivoVazio(reg(), CONF);
    const alvo = reg().lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    /* enche até faltar espaço para um ticket e meio */
    const cabe = Math.floor((CONF.MAX_LIABILITY_POR_RODADA * 0.9) / alvo.odd);
    registrarTicket(p, alvo.idx, cabe, alvo.odd);
    /* duas avaliações contra o MESMO passivo — é a corrida */
    const a = avaliarAposta(reg(), p, alvo.idx, alvo.stakeMax, CONF);
    const b = avaliarAposta(reg(), p, alvo.idx, alvo.stakeMax, CONF);
    /* e as duas confirmações acontecendo em sequência. `registrarTicket`
       precisa recusar a segunda se ela não couber mais. */
    const ok1 = registrarTicket(p, alvo.idx, a.valor, alvo.odd);
    const depoisDaPrimeira = p[alvo.idx];
    const ok2 = registrarTicket(p, alvo.idx, b.valor, alvo.odd);
    ok(ok1, 'a primeira confirmação foi recusada');
    ok(p[alvo.idx] <= CONF.MAX_LIABILITY_POR_RODADA + 1e-9,
      `a corrida estourou o teto: passivo ${p[alvo.idx].toFixed(0)} contra ` +
      `${CONF.MAX_LIABILITY_POR_RODADA}. A confirmação precisa reconferir o passivo, ` +
      `não confiar na avaliação anterior.`);
    /* As duas avaliações foram feitas contra o MESMO passivo, então as duas
       "cabiam". A segunda confirmação tem que ser recusada — e recusa é
       recusa: não pode deixar rastro no passivo. */
    ok(!ok2, 'as duas confirmações passaram; a segunda avaliou contra passivo velho');
    igual(p[alvo.idx], depoisDaPrimeira,
      'a confirmação recusada mexeu no passivo mesmo assim');
  });

  s.teste('nenhum teto é aplicado retroativamente a ticket confirmado', () => {
    const p = passivoVazio(reg(), CONF);
    const alvo = reg().lutadores[0];
    registrarTicket(p, alvo.idx, alvo.stakeMax, alvo.odd);
    const antes = p[alvo.idx];
    /* teto derrubado no meio da rodada — o ticket confirmado não muda */
    const apertado = { ...CONF, MAX_PAYOUT_POR_TICKET: 10, MAX_LIABILITY_POR_RODADA: 100 };
    const r = avaliarAposta(reg(), p, alvo.idx, 1000, apertado);
    ok(!r.aceito, 'o teto novo não vale para aposta NOVA');
    igual(p[alvo.idx], antes,
      'o passivo do ticket já confirmado mudou quando o teto apertou — ' +
      'o §4.4.6 proíbe aplicação retroativa');
  });

  /* --- CANCELAR APOSTA (V1.15) -------------------------------------------
   *
   * Cancelar é o oposto exato de confirmar, e o perigo mora nos dois sentidos:
   *
   *   liberar de menos  → o passivo daquele lutador nunca volta, e o mercado
   *                       dele fica travado pelo resto da rodada por causa de
   *                       uma aposta que não existe mais
   *   liberar de mais   → abre espaço que não foi devolvido, e o teto do
   *                       §4.4.6 vaza pela porta do cancelamento
   *
   * O ida-e-volta EXATO é o que fecha os dois de uma vez.                  */

  s.teste('liberar desfaz registrar exatamente, em cem valores diferentes', () => {
    const r = reg();
    for (const l of r.lutadores) {
      const p = passivoVazio(r, CONF);
      const base = p[l.idx];
      for (let k = 1; k <= 100; k++) {
        const v = Math.max(1, Math.floor(l.stakeMax * k / 100));
        ok(registrarTicket(p, l.idx, v, l.odd), `ticket ${v} recusado no preparo`);
        liberarTicket(p, l.idx, v, l.odd);
        igual(p[l.idx], base,
          `passivo de ${l.nome} não voltou ao valor original depois de liberar ${v}`);
      }
    }
  });

  s.teste('cancelar reabre o mercado com exatamente o mesmo limite de antes', () => {
    const r = reg();
    const alvo = r.lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    const p = passivoVazio(r, CONF);

    const limiteInicial = avaliarAposta(r, p, alvo.idx, 1e9, CONF).limite;
    /* satura o lutador até o mercado dele fechar */
    let posto = 0;
    while (true) {
      const v = avaliarAposta(r, p, alvo.idx, 1e9, CONF);
      if (!v.aceito) break;
      registrarTicket(p, alvo.idx, v.valor, alvo.odd); posto += v.valor;
    }
    ok(!avaliarAposta(r, p, alvo.idx, 1, CONF).aceito, 'o mercado não chegou a fechar');

    liberarTicket(p, alvo.idx, posto, alvo.odd);
    const depois = avaliarAposta(r, p, alvo.idx, 1e9, CONF);
    ok(depois.aceito, 'o mercado continuou fechado depois de cancelar tudo');
    igual(depois.limite, limiteInicial,
      'o limite depois do cancelamento não bate com o de antes da aposta');
  });

  /* Erro de ponto flutuante ao longo de uma rodada com muitas trocas poderia
     deixar o passivo em -1e-12. Negativo é espaço que não existe. */
  s.teste('o passivo nunca fica negativo, nem liberando mais do que foi posto', () => {
    const r = reg();
    const p = passivoVazio(r, CONF);
    const l = r.lutadores[0];
    registrarTicket(p, l.idx, 100, l.odd);
    liberarTicket(p, l.idx, 100, l.odd);
    liberarTicket(p, l.idx, 999999, l.odd);       // liberação indevida
    ok(p[l.idx] >= 0, `passivo ficou em ${p[l.idx]}`);
    igual(p[l.idx], 0, 'liberar a mais deveria travar em zero, não abrir crédito');
  });

  /* Mesma guarda de `registrarTicket`, e pelo mesmo motivo: guarda que se pode
     esquecer não é guarda. Ver o D-004 e o teste da corrida acima. */
  /* --- C1: A MARGEM DA RODADA (V1.15) ------------------------------------
     O painel de ADM mexe na margem, e ela vai gravada no registro do §4.4.5.
     O risco é o painel criar odd secreta: mostrar 8 % ao lado das odds e
     precificar com outra coisa. O registro é a prova, e estes testes afirmam
     que ele não mente. */
  s.teste('a margem declarada na rodada é a que o registro publica', () => {
    const { elenco: el } = rodadaComPreco();
    const wins = new Float64Array(el.length).fill(100);
    for (const m of [0, 0.02, 0.08, 0.15, 0.5]) {
      const r = precificar(wins, 1200, E.M, { margem: m });
      igual(r.margemConfigurada, m, `o registro publicou margem diferente da declarada (${m})`);
    }
  });

  s.teste('margem maior aperta a odd de todo lutador, sem exceção', () => {
    const { elenco: el } = rodadaComPreco();
    const wins = new Float64Array(el.length).fill(0).map((_, i) => 50 + i * 17);
    const baixa = precificar(wins, 1200, E.M, { margem: 0.02 }).lutadores;
    const alta  = precificar(wins, 1200, E.M, { margem: 0.20 }).lutadores;
    for (let i = 0; i < baixa.length; i++)
      ok(alta[i].odd <= baixa[i].odd,
        `lutador ${i}: odd subiu com margem maior (${alta[i].odd} > ${baixa[i].odd})`);
  });

  /* Margem inválida não pode virar preço. Negativa faz a casa PAGAR para
     operar; >= 1 zera toda odd; e o campo do painel é digitado por humano. */
  s.teste('margem inválida cai no padrão, nunca em preço absurdo', () => {
    const { elenco: el } = rodadaComPreco();
    const wins = new Float64Array(el.length).fill(100);
    const padrao = precificar(wins, 1200, E.M).margemConfigurada;
    igual(padrao, E.CONF.MARGIN, 'sem opção, a margem deixou de ser a do motor');
    for (const ruim of [-0.1, 1, 1.5, NaN, Infinity, '0.2', null, undefined, MARGEM_MAX + 0.01])
      igual(precificar(wins, 1200, E.M, { margem: ruim }).margemConfigurada, padrao,
        `margem ${String(ruim)} não caiu no padrão`);
  });

  s.teste('a margem efetiva do registro acompanha a configurada', () => {
    const { elenco: el } = rodadaComPreco();
    const wins = new Float64Array(el.length).fill(0).map((_, i) => 40 + i * 23);
    let anterior = -1;
    for (const m of [0.02, 0.08, 0.20]) {
      const r = precificar(wins, 4000, E.M, { margem: m });
      ok(r.margemEfetiva > anterior,
        `margem efetiva não subiu ao subir a configurada (${m}: ${r.margemEfetiva})`);
      anterior = r.margemEfetiva;
    }
  });

  s.teste('liberar num passivo sem teto falha alto', () => {
    let lancou = false;
    try { liberarTicket(new Float64Array(3), 0, 10, 2); } catch { lancou = true; }
    ok(lancou, 'liberou num passivo que não veio de passivoVazio');
  });

  /* A TROCA DE APOSTA É UM CANCELAMENTO SEGUIDO DE UMA CONFIRMAÇÃO, e trocar
     dez vezes não pode acumular passivo de dez lutadores. */
  s.teste('trocar de lutador dez vezes deixa passivo em um só', () => {
    const r = reg();
    const p = passivoVazio(r, CONF);
    let atual = null;
    for (let k = 0; k < 10; k++) {
      const l = r.lutadores[k % r.lutadores.length];
      const v = Math.min(200, l.stakeMax);
      if (atual) liberarTicket(p, atual.idx, atual.valor, atual.odd);
      registrarTicket(p, l.idx, v, l.odd);
      atual = { idx: l.idx, valor: v, odd: l.odd };
    }
    const comPassivo = [...p].filter(v => v > 0).length;
    igual(comPassivo, 1, `${comPassivo} lutadores com passivo depois de dez trocas`);
  });

  return s;
}
