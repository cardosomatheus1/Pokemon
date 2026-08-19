/* Q1/Q3/Q6/Q8 · CARTEIRA COM PROVENIÊNCIA — o saldo deixa de ser um número.
 *
 * O §5.5 fecha uma brecha econômica concreta: *"nenhum payout pode transformar
 * silenciosamente PC-B em PC-T"*. Sem proveniência, as odds da Arena viram
 * conversor automático de bônus gratuito em saldo transferível, e o orçamento
 * de PC-B do Estudo de Economia vaza inteiro para a ponta que custa dinheiro.
 *
 * O teste central deste arquivo é esse: apostar bônus devolve BÔNUS.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { semTexto } from './modulos.mjs';
import {
  BUCKETS, ORDEM_CONSUMO, TIPOS, carteiraVazia, creditar, lancar, liberar,
  liquidarGanho, liquidarPerda, reconciliar, reconstruir, reservar,
  totalDisponivel, totalReservado,
} from '../engine/carteira.mjs';

/* PRNG do próprio teste: os lotes aleatorizados precisam ser reproduzíveis. */
const rng = n => { let a = n >>> 0; return () => (a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x80000000; };

function comSaldo(t = 1000, b = 500, c = 200) {
  const w = carteiraVazia();
  if (t) creditar(w, 'PC_T_PURCHASE_CLEARED', 'transferivel', t, 'setup');
  if (b) creditar(w, 'CHALLENGE_REWARD', 'bonus', b, 'setup');
  if (c) creditar(w, 'ADMIN_ADJUSTMENT', 'competitivo', c, 'setup');
  return w;
}

export function suite() {
  const s = criarSuite('carteira');

  /* ------------------------------------------------------- Q1 estrutura */

  s.teste('a carteira nasce com os quatro buckets do §5.5', () => {
    const w = carteiraVazia();
    for (const b of BUCKETS) {
      igual(w.disponivel[b], 0, `bucket ${b} não nasce zerado em disponível`);
      igual(w.reservado[b], 0, `bucket ${b} não nasce zerado em reservado`);
    }
    igual(w.ledger.length, 0, 'a carteira nasce com ledger sujo');
  });

  s.teste('o ledger é append-only e sequencial', () => {
    const w = comSaldo();
    const antes = w.ledger.length;
    reservar(w, 100, 'r1');
    ok(w.ledger.length === antes + 1, 'a reserva não gerou entrada no ledger');
    /* nenhuma entrada anterior pode ter mudado */
    w.ledger.forEach((e, i) => igual(e.seq, i + 1, `a entrada ${i} está fora de sequência`));
    for (const e of w.ledger) ok(TIPOS.includes(e.tipo), `tipo fora da lista: ${e.tipo}`);
  });

  s.teste('nenhum lançamento acontece sem entrada no ledger', () => {
    const w = comSaldo();
    const R = rng(11);
    for (let i = 0; i < 300; i++) {
      const antesLedger = w.ledger.length;
      const antesSaldo = JSON.stringify(w.disponivel) + JSON.stringify(w.reservado);
      const valor = Math.floor(R() * 400) + 1;
      const r = R() < 0.5 ? reservar(w, valor, 'x') : creditar(w, 'DAILY_REWARD', 'bonus', valor, 'x');
      const depoisSaldo = JSON.stringify(w.disponivel) + JSON.stringify(w.reservado);
      if (depoisSaldo !== antesSaldo)
        ok(w.ledger.length > antesLedger, 'o saldo mudou sem entrada no ledger');
      if (!r.ok) igual(w.ledger.length, antesLedger, 'lançamento recusado deixou entrada no ledger');
    }
  });

  /* --------------------------------------------- Q1 stake_breakdown */

  s.teste('a reserva grava a composição, não só o total', () => {
    const w = comSaldo(1000, 500, 200);
    const r = reservar(w, 900, 'ticket-1');
    ok(r.ok, `reserva de 900 recusada: ${r.motivo}`);
    /* ordem de consumo: bônus, competitivo, transferível */
    igual(r.composicao.bonus, 500, 'a composição não gastou o bônus primeiro');
    igual(r.composicao.competitivo, 200, 'a composição não gastou o competitivo em seguida');
    igual(r.composicao.transferivel, 200, 'a composição não completou com transferível');
    const soma = Object.values(r.composicao).reduce((a, b) => a + b, 0);
    igual(soma, 900, 'a composição não soma o total apostado');
  });

  s.teste('a ordem de consumo protege o saldo transferível', () => {
    const w = comSaldo(1000, 500, 0);
    reservar(w, 300, 't');
    igual(w.disponivel.transferivel, 1000,
      'apostar 300 com 500 de bônus disponível encostou no transferível');
    igual(w.disponivel.bonus, 200, 'o bônus não foi consumido primeiro');
    ok(ORDEM_CONSUMO.indexOf('transferivel') === ORDEM_CONSUMO.length - 1,
      'transferível precisa ser o ÚLTIMO da ordem de consumo');
  });

  /* ------------------------------------ Q3 o payout herda a origem (§5.5) */

  s.teste('apostar bônus devolve BÔNUS, nunca transferível', () => {
    const w = comSaldo(0, 1000, 0);
    const r = reservar(w, 500, 'ticket');
    igual(r.composicao.bonus, 500, 'a stake não saiu do bônus');
    liquidarGanho(w, r.composicao, 4, 'ticket');
    igual(w.disponivel.transferivel, 0,
      'apostar BÔNUS creditou TRANSFERÍVEL. É exatamente a brecha que o §5.5 fecha: ' +
      'as odds da Arena virariam conversor automático de bônus em saldo sacável.');
    igual(w.disponivel.bonus, 2500, 'o payout em bônus não bate (500 x 4 + 500 que sobraram)');
  });

  s.teste('stake mista paga proporcional, cada parte na origem', () => {
    const w = comSaldo(1000, 300, 0);
    const r = reservar(w, 800, 'ticket');   // 300 bônus + 500 transferível
    igual(r.composicao.bonus, 300, 'composição errada');
    igual(r.composicao.transferivel, 500, 'composição errada');
    liquidarGanho(w, r.composicao, 2, 'ticket');
    igual(w.disponivel.bonus, 600, 'o payout do bônus não é 300 x 2');
    igual(w.disponivel.transferivel, 500 + 1000, 'o payout transferível não é 500 x 2 + 500 que ficaram');
  });

  s.teste('o ledger diz em QUAL bucket cada payout caiu', () => {
    const w = comSaldo(500, 500, 0);
    const r = reservar(w, 700, 'ticket');
    liquidarGanho(w, r.composicao, 3, 'ticket');
    const tipos = w.ledger.filter(e => e.ref === 'ticket' && e.tipo.startsWith('BET_PAYOUT'))
                          .map(e => e.tipo).sort();
    igual(tipos.join(','), 'BET_PAYOUT_BONUS,BET_PAYOUT_TRANSFERABLE',
      'o ledger registrou payout sem dizer em qual moeda — não prova nada depois');
  });

  s.teste('aposta perdida some do reservado e não volta para disponível', () => {
    const w = comSaldo(1000, 0, 0);
    const r = reservar(w, 400, 'ticket');
    const antes = w.disponivel.transferivel;
    liquidarPerda(w, r.composicao, 'ticket');
    igual(w.disponivel.transferivel, antes, 'a aposta perdida voltou para o saldo');
    igual(totalReservado(w), 0, 'a aposta perdida ficou presa no reservado');
    igual(w.vitalicio.perdido, 400, 'o vitalício não registrou a perda');
  });

  s.teste('troca de aposta devolve a reserva intacta', () => {
    const w = comSaldo(1000, 500, 0);
    const antes = { ...w.disponivel };
    const r = reservar(w, 700, 'ticket');
    liberar(w, r.composicao, 'ticket');
    for (const b of BUCKETS)
      igual(w.disponivel[b], antes[b], `o bucket ${b} não voltou ao valor original`);
    igual(totalReservado(w), 0, 'sobrou reserva depois da liberação');
  });

  /* --------------------------------------------- Q3 saldo nunca negativo */

  s.teste('saldo nunca fica negativo, em 5.000 operações aleatórias', () => {
    const w = comSaldo(2000, 1000, 500);
    const R = rng(2026);
    const abertas = [];
    for (let i = 0; i < 5000; i++) {
      const dado = R();
      if (dado < 0.45) {
        const r = reservar(w, Math.floor(R() * 900) + 1, 'i' + i);
        if (r.ok) abertas.push(r.composicao);
      } else if (dado < 0.7 && abertas.length) {
        const c = abertas.pop();
        R() < 0.5 ? liquidarPerda(w, c, 'x') : liquidarGanho(w, c, 1 + R() * 8, 'x');
      } else if (dado < 0.8 && abertas.length) {
        liberar(w, abertas.pop(), 'x');
      } else {
        creditar(w, 'DAILY_REWARD', 'bonus', Math.floor(R() * 100) + 1, 'x');
      }
      for (const conta of ['disponivel', 'reservado'])
        for (const b of BUCKETS)
          ok(w[conta][b] >= 0, `${conta}.${b} ficou em ${w[conta][b]} na operação ${i}`);
    }
    ok(reconciliar(w).ok, 'a reconciliação divergiu depois do lote: ' +
       reconciliar(w).problemas.join('; '));
  });

  /* O TESTE DA PEÇA, não do encaixe. O lote aleatório acima passa pela API
     alta — `reservar` já recusa antes de tentar —, então remover a checagem de
     negativo dentro de `lancar` não muda nada por aquele caminho. Foi o defeito
     S49, que escapou por isso. A guarda precisa ser exercitada onde ela mora. */
  s.teste('lançar direto nunca deixa bucket negativo', () => {
    const w = comSaldo(100, 50, 0);
    for (const [conta, bucket, delta] of [
      ['disponivel', 'transferivel', -101], ['disponivel', 'bonus', -51],
      ['reservado', 'transferivel', -1],    ['disponivel', 'competitivo', -1],
      ['disponivel', 'pendente', -1],
    ]) {
      const antes = JSON.stringify({ d: w.disponivel, r: w.reservado });
      const ledgerAntes = w.ledger.length;
      const r = lancar(w, 'ADMIN_ADJUSTMENT', { [conta]: { [bucket]: delta } }, 'x');
      ok(!r.ok, `${conta}.${bucket} aceitou ${delta} e ficaria negativo`);
      igual(JSON.stringify({ d: w.disponivel, r: w.reservado }), antes,
        `a recusa de ${conta}.${bucket} mexeu no saldo`);
      igual(w.ledger.length, ledgerAntes, `a recusa de ${conta}.${bucket} gravou no ledger`);
    }
    /* e um lançamento que zera EXATAMENTE precisa passar — a borda é <= 0, não < 0 */
    ok(lancar(w, 'ADMIN_ADJUSTMENT', { disponivel: { transferivel: -100 } }, 'x').ok,
      'zerar um bucket foi recusado; a guarda é para negativo, não para zero');
    igual(w.disponivel.transferivel, 0, 'o bucket não zerou');
  });

  s.teste('reservar mais do que existe é recusado, e não deixa rastro', () => {
    const w = comSaldo(100, 0, 0);
    const antesLedger = w.ledger.length;
    const r = reservar(w, 101, 'x');
    ok(!r.ok, 'reserva acima do saldo foi aceita');
    igual(w.ledger.length, antesLedger, 'a recusa gravou entrada no ledger');
    igual(w.disponivel.transferivel, 100, 'a recusa mexeu no saldo');
  });

  s.teste('valores inválidos não passam', () => {
    const w = comSaldo();
    for (const v of [0, -1, 1.5, NaN, Infinity, '100', null, undefined]) {
      ok(!reservar(w, v, 'x').ok, `reserva de ${String(v)} foi aceita`);
      ok(!creditar(w, 'DAILY_REWARD', 'bonus', v, 'x').ok, `crédito de ${String(v)} foi aceito`);
    }
  });

  /* ------------------------------------------------ Q6 reconciliação */

  s.teste('a reconciliação bate com o ledger', () => {
    const w = comSaldo();
    const r = reservar(w, 600, 'x');
    liquidarGanho(w, r.composicao, 2.5, 'x');
    const rec = reconciliar(w);
    ok(rec.ok, `divergiu sem ninguém ter mexido: ${rec.problemas.join('; ')}`);
  });

  s.teste('saldo adulterado é DETECTADO, não aceito em silêncio', () => {
    const w = comSaldo();
    w.disponivel.transferivel += 1000000;          // o ataque ingênuo
    const rec = reconciliar(w);
    ok(!rec.ok, 'inflar o saldo direto passou pela reconciliação');
    ok(rec.problemas.some(p => p.includes('transferivel')),
      `a reconciliação não apontou o bucket adulterado: ${rec.problemas.join('; ')}`);
    /* e o ledger é a fonte: reconstruir devolve o número honesto */
    reconstruir(w);
    igual(w.disponivel.transferivel, 1000, 'reconstruir pelo ledger não desfez a adulteração');
  });

  s.teste('entrada apagada do ledger é detectada', () => {
    const w = comSaldo();
    reservar(w, 200, 'x');
    w.ledger.splice(1, 1);                          // some com uma entrada
    const rec = reconciliar(w);
    ok(!rec.ok, 'apagar entrada do ledger passou despercebido');
    ok(rec.problemas.some(p => /sequência/.test(p)),
      `a quebra de sequência não foi apontada: ${rec.problemas.join('; ')}`);
  });

  s.teste('tipo de lançamento inventado é recusado', () => {
    const w = comSaldo();
    let lancou = true;
    try { lancar(w, 'CONVERTE_BONUS_EM_DINHEIRO', { disponivel: { transferivel: 999 } }, 'x'); }
    catch { lancou = false; }
    ok(!lancou, 'um tipo fora da lista do §5.5 foi aceito no ledger');
    igual(w.disponivel.transferivel, 1000, 'o lançamento inválido mexeu no saldo');
  });

  /* ---------------------------------------------------- Q8 concorrência */

  s.teste('duas apostas no mesmo saldo não gastam o mesmo PC duas vezes', () => {
    /* O ataque: ler o saldo, decidir que cabe, e confirmar as duas. A defesa é
       a reserva ser atômica — decidir e debitar no mesmo lançamento. */
    const w = comSaldo(1000, 0, 0);
    const a = reservar(w, 700, 'a');
    const b = reservar(w, 700, 'b');
    ok(a.ok, 'a primeira reserva foi recusada');
    ok(!b.ok, 'as duas reservas de 700 passaram com 1.000 de saldo');
    igual(totalDisponivel(w) + totalReservado(w), 1000, 'o total mudou sozinho');
  });

  s.teste('mil reservas concorrentes nunca ultrapassam o saldo', () => {
    const w = comSaldo(10000, 0, 0);
    const R = rng(77);
    let reservado = 0;
    for (let i = 0; i < 1000; i++) {
      const v = Math.floor(R() * 300) + 1;
      const r = reservar(w, v, 'i' + i);
      if (r.ok) reservado += v;
      igual(totalDisponivel(w) + totalReservado(w), 10000,
        `o total saiu de 10.000 na volta ${i}`);
    }
    igual(totalReservado(w), reservado, 'o reservado não bate com a soma das reservas aceitas');
    ok(reservado <= 10000, `foram reservados ${reservado} de um saldo de 10.000`);
  });

  /* ------------------------------------- o critério de saída do bloco */

  /* *"Nenhum ponto do código escreve saldo sem passar pela API"* é uma
     afirmação sobre o REPOSITÓRIO, não sobre uma função — então o teste varre
     o repositório. Sem ele, o próximo bloco reintroduz um `S.bal += x` e a
     suíte inteira continua verde. */
  s.teste('só a fachada da carteira toca em dinheiro', () => {
    const DIR = new URL('../app/modules/', import.meta.url);
    const arquivos = readdirSync(DIR).filter(f => f.endsWith('.mjs') && f !== 'banco.mjs');
    /* A varredura alcança `test/` desde o F0.10, e não é zelo: o defeito D-004
       sobreviveu exatamente ali. Um `S.bal = x` num teste é atribuição a campo
       que ninguém lê — JavaScript válido, silencioso, e o teste passa a medir
       outra coisa. */
    const TESTE = new URL('./', import.meta.url);
    const fontes = [...arquivos.map(f => [f, readFileSync(new URL(f, DIR), 'utf8')]),
                    ['app/index.html', readFileSync(new URL('../app/index.html', import.meta.url), 'utf8')],
                    ...readdirSync(TESTE).filter(f => f.endsWith('.mjs'))
                      .map(f => ['test/' + f, readFileSync(new URL(f, TESTE), 'utf8')])];
    for (const [nome, bruto] of fontes) {
      /* Mascarar texto antes de varrer: o próprio enunciado destes testes cita
         `S.bal` para explicar a regra, e uma varredura crua acusaria a
         explicação. Regra que não sabe se distinguir da própria descrição não
         serve. */
      const txt = semTexto(bruto);
      ok(!/S\.carteira\s*(?:=[^=]|\.\w+\s*[-+]?=)/.test(txt),
        `${nome} escreve em S.carteira direto. Quem move dinheiro é banco.mjs — ` +
        `o §5.5 exige lançamento no ledger para toda mudança de saldo.`);
      ok(!/\bS\.bal\b/.test(txt),
        `${nome} ainda usa S.bal, que sumiu no F0.9`);
      ok(!/localStorage\.\w+\(\s*['"]ar_(bal|carteira)/.test(txt),
        `${nome} persiste saldo direto no localStorage, sem passar pelo ledger`);
    }
  });

  s.teste('a fachada não reimplementa a regra da carteira', () => {
    const banco = readFileSync(new URL('../app/modules/banco.mjs', import.meta.url), 'utf8');
    ok(/from '\.\.\/\.\.\/engine\/carteira\.mjs'/.test(banco),
      'banco.mjs não importa a carteira do motor — a regra de proveniência ' +
      'precisa viver num lugar só, para F1.4 ser troca de implementação');
    for (const proibido of ['disponivel[', 'reservado[', 'ledger.push'])
      ok(!banco.includes(proibido),
        `banco.mjs mexe em ${proibido} direto; isso é regra, e regra é do motor`);
  });

  return s;
}
