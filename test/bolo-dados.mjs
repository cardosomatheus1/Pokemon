/* Q1 · O BOLO NA TELA: A CONTA E OS TEXTOS (ST-12.6 · F2.3 · §6.3, §6.13, §28.5)
 *
 * O que a tela do bolo diz é decidido aqui, em camada 0. Quatro regras:
 *
 *   "SE FECHASSE AGORA", NUNCA "VOCÊ RECEBE"   o retorno do bolo se move
 *   NUNCA PROMETE MAIS QUE O POSSÍVEL          o bolo inteiro menos a taxa
 *   TROCAR NÃO SOMA                            a minha entrada antiga sai da conta
 *   RECEBER MENOS QUE ENTROU NÃO É FESTA       §28.5
 */
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import { linhasDoBolo, estimativaDaMinha, textoDaEstimativa, textoDaLinha, textoDasRegras,
         erroDaEntrada, linhasDoResultado, textoDaMinhaPaga, TEXTO_SEM_CONTA } from '../app/modules/bolo-dados.mjs';
import { REGRA_ABATES } from '../engine/mercado-abates.mjs';

const nomes = Array.from({ length: 12 }, (_, i) => `L${i}`);
function mercado(totais, { minha = null, taxa = 0.08, semAcerto = 'devolver' } = {}) {
  const selecoes = totais.map((total, selecao) => ({ selecao, total, entradas: total ? 1 : 0 }));
  return { fase: 'aberto', taxa, semAcerto, regra: REGRA_ABATES, bruto: totais.reduce((a, b) => a + b, 0),
           selecoes, minha };
}

export function suite() {
  const s = criarSuite('bolo-dados');

  s.teste('o bolo por lutador: fatia do total e quanto pagaria por moeda se fechasse agora', () => {
    const e = linhasDoBolo(mercado([300, 100, 0, ...Array(9).fill(0)]), nomes);
    igual(e.bruto, 400, 'bruto');
    igual(e.linhas[0].fatia, 0.75, 'fatia do L0');
    igual(e.linhas[1].paga, (400 - 32) / 100, 'L1 paga o líquido ÷ o que tem nele');
    igual(e.linhas[2].paga, null, 'lutador sem entrada ganhou um multiplicador inventado');
    igual(textoDaLinha(e.linhas[2]), '—', 'linha vazia');
    ok(/paga x3,68 agora/.test(textoDaLinha(e.linhas[1])), `a linha não diz "agora": ${textoDaLinha(e.linhas[1])}`);
    ok(!/até/.test(textoDaLinha(e.linhas[1])), 'a linha voltou a soar como teto');
  });

  s.teste('a minha entrada hipotética entra na conta — e trocar tira a antiga', () => {
    const m = mercado([300, 100, ...Array(10).fill(0)], { minha: { selecao: 0, valor: 100 } });
    const e = linhasDoBolo(m, nomes, { selecao: 1, valor: 50 });
    igual(e.bruto, 350, 'trocar somou a entrada antiga à nova');
    igual(e.linhas[0].total, 200, 'a entrada antiga continuou no L0');
    igual(e.linhas[1].total, 150, 'a nova não entrou no L1');
    igual(e.topo, 'bolo: 400', 'o topo mostra o bolo hipotético, e não o que já está lá');
    ok(e.linhas[1].minha && !e.linhas[0].minha, 'a marca "minha" ficou na linha errada');
    ok(/^100 \+50 seus/.test(textoDaLinha(e.linhas[1])), `a linha não diz que o total inclui a minha: ${textoDaLinha(e.linhas[1])}`);
    const sem = linhasDoBolo(m, nomes);
    ok(sem.linhas[0].minha && sem.bruto === 400, 'sem escolha nova, a minha atual não aparece');
  });

  s.teste('a estimativa nunca passa do bolo inteiro menos a taxa, e diz que muda', () => {
    const rnd = rngTeste(3);
    for (let k = 0; k < 3000; k++) {
      const tot = Array.from({ length: 12 }, () => (rnd() < 0.4 ? 0 : Math.floor(rnd() * 5000)));
      const sel = Math.floor(rnd() * 12), valor = 1 + Math.floor(rnd() * 3000);
      const e = linhasDoBolo(mercado(tot), nomes, { selecao: sel, valor });
      const r = estimativaDaMinha(e, valor);
      const teto = e.bruto - Math.floor(e.bruto * 0.08);
      ok(r !== null && r <= teto, `caso ${k}: estimativa ${r} passou do possível ${teto}`);
      ok(r >= 0, `caso ${k}: estimativa negativa`);
    }
    const e = linhasDoBolo(mercado([100, ...Array(11).fill(0)]), nomes, { selecao: 0, valor: 100 });
    const t = textoDaEstimativa(e, 100);
    ok(/se fechasse agora/.test(t) && /muda/.test(t), `a estimativa soa como promessa: ${t}`);
    ok(/de volta \(lucro/.test(t), `a estimativa não diz se é retorno ou lucro: ${t}`);
    ok(!/você recebe|garantid/i.test(t), `a estimativa promete: ${t}`);
    igual(estimativaDaMinha(linhasDoBolo(mercado(Array(12).fill(0)), nomes), 10), null, 'sem entrada, inventou retorno');
  });

  s.teste('as regras vêm antes: empate, zero abate, taxa e o destino "sem acerto"', () => {
    const r = textoDasRegras(mercado(Array(12).fill(0))).join(' ');
    ok(/empatados/.test(r), 'a regra de empate não aparece');
    ok(/nenhum abate/.test(r), 'a regra do zero não aparece');
    ok(/Taxa de 8%/.test(r), `a taxa não aparece: ${r}`);
    ok(/volta a todos/.test(r), 'o destino "devolver" não aparece');
    ok(/tesouraria/.test(textoDasRegras(mercado(Array(12).fill(0), { semAcerto: 'tesouraria' })).join(' ')),
      'o destino "tesouraria" não aparece');
    ok(/muda até o fechamento/.test(r), 'as regras não dizem que o retorno se move');
    ok(/conta/.test(TEXTO_SEM_CONTA) && /jogadores/.test(TEXTO_SEM_CONTA), 'sem conta, o texto não explica o bolo');
  });

  s.teste('a entrada é conferida antes do pedido', () => {
    igual(erroDaEntrada({ selecao: null, valor: 10, saldo: 100 }), 'escolha em quem', 'sem seleção');
    igual(erroDaEntrada({ selecao: 1, valor: 0, saldo: 100 }), 'valor inválido', 'valor zero');
    igual(erroDaEntrada({ selecao: 1, valor: 2.5, saldo: 100 }), 'valor inválido', 'valor fracionário');
    igual(erroDaEntrada({ selecao: 1, valor: 101, saldo: 100 }), 'saldo insuficiente', 'saldo');
    igual(erroDaEntrada({ selecao: 0, valor: 100, saldo: 100 }), null, 'entrada válida recusada');
  });

  s.teste('o resultado: o que o bolo pagou ao lado do que o modelo dava; e perder pouco não é festa', () => {
    const res = { bruto: 500, vencedoras: [3], simulacoes: 20000,
                  selecoes: Array.from({ length: 12 }, (_, i) => ({ selecao: i, pagou: i === 3 ? 4.1 : null, modelo: i === 3 ? 0.2 : 0.05 })) };
    const r = linhasDoResultado(res, nomes);
    ok(/L3: o bolo pagou x4,10/.test(r.linhas[0]) && /modelo dava 20% de chance/.test(r.linhas[0]), r.linhas[0]);
    const vazio = linhasDoResultado({ ...res, selecoes: res.selecoes.map(x => ({ ...x, pagou: null })), semAcerto: 'devolver' }, nomes);
    ok(/L3 liderou os abates e ninguém estava nele/.test(vazio.linhas[0]) && /modelo dava 20%/.test(vazio.linhas[0]),
      `o líder sem entrada não foi nomeado: ${vazio.linhas[0]}`);
    ok(/voltou a todos/.test(vazio.linhas.at(-1)), 'o destino "sem acerto" não foi dito');
    const semNinguem = linhasDoResultado({ ...res, bruto: 0, selecoes: res.selecoes.map(x => ({ ...x, pagou: null })) }, nomes);
    ok(/Ninguém entrou/.test(semNinguem.linhas.at(-1)) && !semNinguem.linhas.some(l => /voltou a todos/.test(l)),
      `bolo vazio disse que voltou a todos: ${semNinguem.linhas}`);
    ok(/Nenhum abate/.test(linhasDoResultado({ ...res, vencedoras: [] }, nomes).linhas[0]), 'sem abate, nada dito');
    ok(!r.linhas.some(l => /sem acerto/i.test(l)), 'com acerto, o resultado falou em "sem acerto"');
    const onde = linhasDoResultado({ ...res, selecoes: res.selecoes.map(x => ({ ...x, total: x.selecao === 3 ? 100 : x.selecao === 5 ? 400 : 0 })) }, nomes);
    ok(onde.linhas.some(l => l === 'O bolo estava em: L5 80% · L3 20%.'), `onde estava o bolo: ${onde.linhas}`);
    igual(textoDaMinhaPaga({ entrou: 100, recebeu: 92 }).tom, 'neutro', 'receber 92 de 100 virou vitória');
    ok(!/recebeu|ganh/i.test(textoDaMinhaPaga({ entrou: 100, recebeu: 92 }).texto), 'o texto de 92 de 100 comemora');
    igual(textoDaMinhaPaga({ entrou: 100, recebeu: 0 }).tom, 'perdeu', 'perda');
    igual(textoDaMinhaPaga({ entrou: 100, recebeu: 410 }).tom, 'ganhou', 'ganho');
    igual(textoDaMinhaPaga({ entrou: 0, recebeu: 0 }), null, 'quem não entrou recebeu texto');
  });

  return s;
}
