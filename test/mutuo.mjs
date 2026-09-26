/* Q1/Q3 · O MOTOR DE APURAÇÃO MÚTUA (ST-12.1 · F2.1 · Spec §6.4)
 *
 * No bolo mútuo a casa não toma posição: retira a taxa e reparte o resto entre
 * quem acertou, na proporção da entrada. A invariante que sustenta a fase:
 *
 *   Σ pagamentos + taxa + resíduo + tesouraria == bolo bruto
 *
 * sempre, em inteiros, sem exceção de arredondamento. Se ela cai, a casa está
 * pagando do próprio caixa (passivo > 0) ou ficando com dinheiro que ninguém
 * declarou (o resíduo que "some"). As duas coisas são o que o §6.4 proíbe.
 *
 * Este arquivo testa só a CONTA. Qual mercado, qual rodada, qual carteira —
 * isso é da ST-12.2 em diante.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import { apurar, erros, repartirPorBalde, SEM_ACERTO, TAXA_PADRAO } from '../engine/mutuo.mjs';

const soma = o => Object.values(o).reduce((a, b) => a + b, 0);
const fecha = r => soma(r.pagamentos) + r.taxa + r.residuo + r.tesouraria;

/* Um bolo aleatório, mas reproduzível: 1 a 500 entradas, 1 a 10⁶ cada, em
   até 12 seleções. */
function bolo(rnd) {
  const n = 1 + Math.floor(rnd() * 500), sel = 1 + Math.floor(rnd() * 12);
  const entradas = Array.from({ length: n }, (_, i) => ({
    id: `e${i}`, selecao: Math.floor(rnd() * sel), valor: 1 + Math.floor(rnd() ** 3 * 1e6) }));
  const vencedoras = rnd() < 0.15 ? [Math.floor(rnd() * sel), Math.floor(rnd() * sel)] : [Math.floor(rnd() * (sel + 2))];
  return { entradas, vencedoras };
}

export function suite() {
  const s = criarSuite('mutuo');

  s.teste('passivo zero: em 10.000 bolos a conta fecha no bruto, sem pagamento negativo', () => {
    const rnd = rngTeste(20260926);
    let semAcerto = 0, empates = 0;
    for (let k = 0; k < 10000; k++) {
      const { entradas, vencedoras } = bolo(rnd);
      const modo = k % 2 ? SEM_ACERTO.DEVOLVER : SEM_ACERTO.TESOURARIA;
      const r = apurar({ entradas, vencedoras, taxa: TAXA_PADRAO, semAcerto: modo });
      const bruto = entradas.reduce((a, e) => a + e.valor, 0);
      igual(r.bruto, bruto, 'o bruto não é a soma das entradas');
      igual(fecha(r), bruto, `bolo ${k}: pagamentos + taxa + resíduo + tesouraria ≠ bruto — a casa pagou ou sumiu com dinheiro`);
      igual(Object.keys(r.pagamentos).length, entradas.length, 'uma entrada ficou sem linha de pagamento — o ledger não teria o que lançar');
      for (const v of Object.values(r.pagamentos))
        ok(Number.isInteger(v) && v >= 0, `pagamento inválido: ${v}`);
      ok(Number.isInteger(r.residuo) && r.residuo >= 0 && r.residuo < Math.max(1, r.contemplados),
        `resíduo ${r.residuo} com ${r.contemplados} contemplados — o piso perde menos de 1 por entrada`);
      ok(soma(r.pagamentos) <= r.liquido, 'pagou mais que o líquido');
      if (!r.acertadores) semAcerto++;
      if (new Set(vencedoras).size > 1) empates++;
    }
    ok(semAcerto > 100 && empates > 100, `a amostra não exercitou os casos raros: ${semAcerto} sem acerto, ${empates} empates`);
  });

  s.teste('quem perdeu recebe zero; quem acertou divide o líquido pela entrada', () => {
    const r = apurar({ taxa: 0.1, semAcerto: SEM_ACERTO.DEVOLVER, vencedoras: [2], entradas: [
      { id: 'a', selecao: 2, valor: 300 }, { id: 'b', selecao: 2, valor: 100 }, { id: 'c', selecao: 5, valor: 600 }] });
    igual(r.taxa, 100, 'taxa de 10% de 1000');
    igual(r.liquido, 900, 'líquido');
    igual(r.pagamentos.c, 0, 'quem perdeu recebeu — o líquido foi repartido entre todos');
    igual(r.pagamentos.a, 675, '3/4 do líquido');
    igual(r.pagamentos.b, 225, '1/4 do líquido');
    igual(r.destino, 'acertadores', 'destino');
    igual(r.acertadores, 2, 'contagem de acertadores');
  });

  s.teste('entradas iguais na mesma seleção recebem o mesmo', () => {
    const r = apurar({ taxa: TAXA_PADRAO, semAcerto: SEM_ACERTO.DEVOLVER, vencedoras: [1], entradas: [
      { id: 'a', selecao: 1, valor: 7 }, { id: 'b', selecao: 1, valor: 7 }, { id: 'c', selecao: 1, valor: 7 },
      { id: 'd', selecao: 0, valor: 50 }] });
    ok(r.pagamentos.a === r.pagamentos.b && r.pagamentos.b === r.pagamentos.c, JSON.stringify(r.pagamentos));
    igual(fecha(r), 71, 'a conta não fechou');
  });

  s.teste('um só acertador recebe o bruto menos a taxa, e nunca mais que isso', () => {
    const r = apurar({ taxa: TAXA_PADRAO, semAcerto: SEM_ACERTO.DEVOLVER, vencedoras: [3], entradas: [
      { id: 'x', selecao: 3, valor: 10 }, { id: 'y', selecao: 4, valor: 990 }] });
    igual(r.pagamentos.x, 1000 - 80, 'o único acertador não levou o líquido inteiro');
    igual(r.residuo, 0, 'um acertador não deixa resíduo');
  });

  s.teste('ninguém acertou: "devolver" reparte o líquido por todos; "tesouraria" leva o líquido, declarado', () => {
    const entradas = [{ id: 'a', selecao: 0, valor: 200 }, { id: 'b', selecao: 1, valor: 600 }, { id: 'c', selecao: 1, valor: 200 }];
    const d = apurar({ entradas, vencedoras: [9], taxa: 0.05, semAcerto: SEM_ACERTO.DEVOLVER });
    igual(d.destino, 'devolucao', 'destino da devolução');
    igual(d.pagamentos.a, 190, 'devolução proporcional, menos a taxa');
    igual(d.pagamentos.b, 570, 'devolução proporcional, menos a taxa');
    igual(d.tesouraria, 0, 'devolução mandou algo à tesouraria');
    const t = apurar({ entradas, vencedoras: [9], taxa: 0.05, semAcerto: SEM_ACERTO.TESOURARIA });
    igual(t.destino, 'tesouraria', 'destino da tesouraria');
    igual(soma(t.pagamentos), 0, 'com destino tesouraria alguém recebeu');
    igual(t.tesouraria, 950, 'o líquido não foi à tesouraria — sumiu');
    igual(fecha(t), 1000, 'a conta não fechou');
  });

  s.teste('a taxa arredonda para baixo, a favor do jogador, e sem erro de ponto flutuante', () => {
    igual(apurar({ entradas: [{ id: 'a', selecao: 0, valor: 99 }], vencedoras: [0], taxa: 0.08,
                   semAcerto: SEM_ACERTO.DEVOLVER }).taxa, 7, '8% de 99 é 7,92 → 7');
    /* 0,29 × 100 dá 28,999999999999996 em ponto flutuante: o piso ingênuo
       cobraria 28 e a taxa exibida (29%) não seria a cobrada. */
    igual(apurar({ entradas: [{ id: 'a', selecao: 0, valor: 100 }], vencedoras: [0], taxa: 0.29,
                   semAcerto: SEM_ACERTO.DEVOLVER }).taxa, 29, 'a taxa saiu do ponto flutuante, não da conta');
  });

  s.teste('o resíduo da divisão tem destino declarado e nunca some', () => {
    const r = apurar({ taxa: 0, semAcerto: SEM_ACERTO.DEVOLVER, vencedoras: [0], entradas: [
      { id: 'a', selecao: 0, valor: 1 }, { id: 'b', selecao: 0, valor: 1 }, { id: 'c', selecao: 0, valor: 1 },
      { id: 'd', selecao: 1, valor: 1 }] });
    igual(r.pagamentos.a, 1, '4/3 → 1');
    igual(r.residuo, 1, 'o que sobra do piso é o resíduo');
    igual(fecha(r), 4, 'a conta não fechou');
  });

  s.teste('bolo vazio não inventa nada', () => {
    const r = apurar({ entradas: [], vencedoras: [0], taxa: TAXA_PADRAO, semAcerto: SEM_ACERTO.DEVOLVER });
    igual(r.bruto + r.taxa + r.residuo + r.tesouraria, 0, 'bolo vazio produziu dinheiro');
    igual(r.destino, 'vazio', 'destino do bolo vazio');
  });

  s.teste('entrada inválida é recusada, nunca "consertada"', () => {
    const base = { vencedoras: [0], taxa: TAXA_PADRAO, semAcerto: SEM_ACERTO.DEVOLVER, selecoes: [0, 1] };
    const casos = {
      'valor zero':           [{ id: 'a', selecao: 0, valor: 0 }],
      'valor negativo':       [{ id: 'a', selecao: 0, valor: -5 }],
      'valor fracionário':    [{ id: 'a', selecao: 0, valor: 2.5 }],
      'valor como texto':     [{ id: 'a', selecao: 0, valor: '10' }],
      'seleção inexistente':  [{ id: 'a', selecao: 7, valor: 10 }],
      'id repetido':          [{ id: 'a', selecao: 0, valor: 10 }, { id: 'a', selecao: 1, valor: 10 }],
    };
    for (const [nome, entradas] of Object.entries(casos)) {
      ok(erros({ ...base, entradas }).length > 0, `${nome}: erros() não reclamou`);
      let lancou = false;
      try { apurar({ ...base, entradas }); } catch { lancou = true; }
      ok(lancou, `${nome}: apurar aceitou`);
    }
    for (const taxa of [-0.1, 0.6, NaN, '0.08'])
      ok(erros({ ...base, taxa, entradas: [] }).length > 0, `taxa ${taxa} aceita`);
    ok(erros({ ...base, semAcerto: 'casa', entradas: [] }).length > 0, 'destino "sem acerto" desconhecido aceito');
    igual(erros({ ...base, entradas: [{ id: 'a', selecao: 1, valor: 10 }] }).length, 0, 'entrada válida recusada');
  });

  s.teste('o pagamento volta pelos baldes da entrada, e a sobra do piso fica no balde que mais pôs', () => {
    igual(JSON.stringify(repartirPorBalde({ bonus: 70, transferivel: 30 }, 250)), '{"bonus":175,"transferivel":75}',
      'o pagamento não seguiu a composição — bônus virou transferível');
    const r = repartirPorBalde({ transferivel: 1, bonus: 2 }, 10);
    igual(r.bonus + r.transferivel, 10, 'a repartição não fecha no pagamento');
    igual(r.bonus, 7, 'a sobra do piso não foi ao balde que mais pôs');
    igual(JSON.stringify(repartirPorBalde({ bonus: 40 }, 0)), '{"bonus":0}', 'perda não é zero');
    const rnd = rngTeste(7);
    for (let k = 0; k < 2000; k++) {
      const comp = { bonus: Math.floor(rnd() * 500), transferivel: 1 + Math.floor(rnd() * 500), pendente: Math.floor(rnd() * 50) };
      const pag = Math.floor(rnd() * 5000);
      igual(Object.values(repartirPorBalde(comp, pag)).reduce((a, x) => a + x, 0), pag, `caso ${k} não fecha`);
    }
  });

  s.teste('a conta é pura: sem relógio, sem sorteio, sem import', () => {
    const f = readFileSync(new URL('../engine/mutuo.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok(!/Math\.random|Date\.|performance\./.test(f), 'o motor lê relógio ou sorteia');
    ok(!/^\s*import\b/m.test(f), 'o motor importa algo — a conta deixa de ser só conta');
  });

  return s;
}
