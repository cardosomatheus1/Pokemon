/* QUE ITENS CAEM, E COM QUE FREQUÊNCIA (bloco 1.25).
 *
 * Pergunta do dono, e ela é boa: *"esses itens realmente estão com chance de
 * drop? Como está esse rate de item a item?"*
 *
 * A resposta honesta não sai de ler a tabela — sai de RODAR o motor. A tabela
 * declara pesos por CLASSE; qual item cada classe vira depende do bioma, do
 * estágio e da raridade, e o único jeito de saber o número final é sortear
 * muitas vezes e contar.
 *
 *   > Ler a tabela diz o que foi PROJETADO. Rodar diz o que ACONTECE — e o
 *   > interessante costuma estar na diferença.
 *
 * Uso:
 *   node tools/medir-drops.mjs [--expedicoes 20000] [--perfil vigilia]
 */
import { PERFIS } from '../engine/expedicao.mjs';
import { sortearItens, TABELA, ITENS_POR_PERFIL } from '../engine/drops.mjs';
import { ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const N = Number(arg('expedicoes', 20000));
const PERFIL = arg('perfil', 'vigilia');
const ESTAGIO = Number(arg('estagio', 4));
/* ── O BIOMA IMPORTA MAIS QUE TUDO, E POR ISSO ELE E ARGUMENTO ─────────
   Sorteando o bioma, a taxa de cada pedra sai DILUIDA entre onze — e o numero
   que aparece nao e o que jogador nenhum vive. Ele farma UM lugar.

     Uma media sobre lugares onde a coisa nao existe nao e a media de nada. */
const BIOMA = arg('bioma', null);

/* Um gerador simples e reprodutível: a medição tem de dar o mesmo número duas
   vezes, ou ela não é medição. */
let s = 0x9e3779b9;
const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;

const biomas = BIOMA ? [BIOMA] : (pack.biomas ?? []).map(b => b.id);
const nomeDe = id => (pack.catalogo ?? []).find(i => i.id === id)?.nome
  ?? (pack.bolas ?? []).find(b => b.id === id)?.rotulo
  ?? (pack.itens ?? []).find(i => i.id === id)?.rotulo
  ?? (id === pack.moedaPve?.id ? pack.moedaPve.nome : null)
  ?? (id === pack.material?.id ? pack.material.nome : null)
  ?? id;
const faixaDe = id => (pack.catalogo ?? []).find(i => i.id === id)?.faixa ?? '—';

const conta = new Map();
const porBioma = new Map();
let saques = 0;

for (let i = 0; i < N; i++) {
  const bioma = biomas[Math.floor(rnd() * biomas.length) % biomas.length];
  const teto = ESTAGIOS_POR_BIOMA?.[bioma] ?? 4;
  const est = Math.min(ESTAGIO, teto);
  const itens = sortearItens(rnd, { pack, bioma, perfil: PERFIL, estagio: est });
  for (const it of itens) {
    const id = it.id ?? it.classe;
    const q = it.quantidade ?? 1;
    conta.set(id, (conta.get(id) ?? 0) + q);
    saques += q;
    if (!porBioma.has(id)) porBioma.set(id, new Set());
    porBioma.get(id).add(bioma);
  }
}

/* Tudo que o catálogo diz que CAI, para a lista mostrar também o que NÃO caiu.
   Um item declarado como drop e que nunca sai é o achado que esta ferramenta
   existe para produzir — e ele some de uma lista que só mostra o que apareceu. */
const declarados = (pack.catalogo ?? []).filter(i => i.porta === 'drop').map(i => i.id);
const bolas = (pack.bolas ?? []).map(b => b.id);
const todos = [...new Set([...conta.keys(), ...declarados, ...bolas])];

const linhas = todos.map(id => ({
  id, nome: nomeDe(id), faixa: faixaDe(id),
  n: conta.get(id) ?? 0,
  pct: ((conta.get(id) ?? 0) / Math.max(1, saques)) * 100,
  biomas: (porBioma.get(id) ?? new Set()).size,
  declarado: declarados.includes(id),
})).sort((a, b) => b.pct - a.pct);

const porExp = saques / N;
console.log(`\nMEDIDO — ${N.toLocaleString('pt-BR')} expedições de ${PERFIL}, estágio ${ESTAGIO}`);
console.log(`${saques.toLocaleString('pt-BR')} itens sorteados · ${porExp.toFixed(1)} por expedição\n`);
console.log('  %       por exped.  biomas  faixa       item');
console.log('  ' + '─'.repeat(74));
for (const l of linhas) {
  const marca = l.n === 0 ? '  ← NUNCA CAIU' : '';
  console.log(
    `  ${l.pct.toFixed(2).padStart(6)}%  ${(l.pct / 100 * porExp).toFixed(3).padStart(8)}  ` +
    `${String(l.biomas).padStart(5)}   ${l.faixa.padEnd(10)}  ${l.nome}${marca}`);
}

const nunca = linhas.filter(l => l.n === 0);
console.log('\n  ' + '─'.repeat(74));
console.log(`  itens distintos que caíram: ${linhas.filter(l => l.n > 0).length}`);
console.log(`  declarados como drop e que NUNCA caíram: ${nunca.length}` +
  (nunca.length ? ' — ' + nunca.map(l => l.nome).join(', ') : ''));
console.log('\n  a tabela de CLASSES declara:');
const somaPeso = TABELA.reduce((a, t) => a + t.peso, 0);
for (const t of TABELA)
  console.log(`    ${t.classe.padEnd(12)} peso ${String(t.peso).padStart(3)}  = ${(t.peso / somaPeso * 100).toFixed(1)}%`);
console.log(`\n  saques por expedição, por perfil:`);
for (const [p, [a, b]] of Object.entries(ITENS_POR_PERFIL))
  console.log(`    ${p.padEnd(9)} ${a}–${b}  em ${PERFIS[p]?.minutos} min`);
