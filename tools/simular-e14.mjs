/* SIMULAR A ECONOMIA ENTRE JOGADORES — o relatório da ST-14.15.
 *
 *   node tools/simular-e14.mjs [semente]
 *     padrão: semente 42; escreve docs/e14/SIMULACAO_E14.md
 *
 * Roda os quatro cenários obrigatórios do `engine/simulador-e14.mjs` e duas
 * varreduras de SENSIBILIDADE (a detecção de contas ligadas no abuso, e a
 * taxa shiny no equilíbrio), e escreve o relatório com o que a spec cobra:
 * parâmetros, semente, máquina, duração e limites.
 *
 * É SENSIBILIDADE, NÃO PREVISÃO — e o relatório diz isso no topo. Nenhum
 * jogador real passou por estes números.
 */
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { simularE14, CENARIOS } from '../engine/simulador-e14.mjs';

const semente = Number(process.argv[2] ?? 42);
const pct = x => `${(100 * x).toFixed(1)}%`;
const n = x => (x == null ? '—' : Math.round(x).toLocaleString('pt-BR'));

const t0 = performance.now();
const cenarios = Object.keys(CENARIOS).map(c => simularE14(c, { semente }));
const deteccao = [[0, false], [0.5, false], [0.9, false], [0.5, true], [0.9, true]]
  .map(([d, congelaAoDetectar]) => simularE14('abuso_contas_novas', { semente, deteccaoLigadas: d, congelaAoDetectar }));
const shiny = [1 / 4000, 1 / 2000, 1 / 500].map(s => simularE14('equilibrio', { semente, shiny: s }));
const duracao = performance.now() - t0;

const linhas = [];
const L = s => linhas.push(s);
L('# Simulação da economia entre jogadores (ST-14.15 · gate C)');
L('');
L('> **Sensibilidade, não previsão.** Os números abaixo são consequência das hipóteses de cada cenário.');
L('> Nenhum jogador real passou por eles, e nenhum preço daqui é "o preço sustentável" — a spec E14 proíbe');
L('> declarar isso a partir de um simulador. Gerado por `node tools/simular-e14.mjs ' + semente + '`.');
L('');
L('## Execução');
L('');
L(`- semente: \`${semente}\` (a mesma semente devolve o mesmo relatório, byte a byte, fora esta seção)`);
L(`- máquina: ${os.cpus()[0]?.model ?? '?'} · ${os.cpus().length} núcleos · ${os.platform()} · Node ${process.version}`);
L(`- duração: ${duracao.toFixed(0)} ms para ${cenarios.length + deteccao.length + shiny.length} execuções`);
L(`- política de taxas: \`${cenarios[0].parametros.politica}\` (a mesma função que o servidor cobra)`);
L('');
L('## Os quatro cenários');
L('');
L('| cenário | usuários | emissão | queima | circulante | top 10% | HHI | anúncios | vendas | venda/anúncio | mediana | shiny | furo | mint P2P |');
L('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of cenarios)
  L(`| ${r.cenario} | ${r.parametros.usuarios + r.parametros.sybils} | ${n(r.emissao)} | ${n(r.queima)} | ${n(r.circulante)} | ${pct(r.concentracao.top10)} | ${r.concentracao.hhi.toFixed(4)} | ${r.mercado.anuncios} | ${r.mercado.vendas} | ${pct(r.mercado.vendaPorAnuncio)} | ${n(r.mercado.medianaPreco)} | ${r.shiny.estoque} | ${r.furoDeConservacao} | ${r.mintP2P} |`);
L('');
L('`furo` e `mint P2P` têm de ser **zero** em todo cenário: o primeiro é emissão − queima − gasto − circulante;');
L('o segundo, o que entrou por passagem entre jogadores menos o que saiu. Qualquer outro número é o simulador errado.');
L('');
L('## Sensibilidade · abuso de contas novas × detecção de conta ligada');
L('');
L('| detecção | ao detectar | tentativas | passaram | bloqueadas | volume do funil | fatia da principal | top 10% |');
L('|---|---|---|---|---|---|---|---|');
for (const r of deteccao)
  L(`| ${pct(r.parametros.deteccaoLigadas)} | ${r.parametros.congelaAoDetectar ? 'congela a conta' : 'recusa a tentativa'} | ${r.funil.tentado} | ${r.funil.passou} | ${r.funil.bloqueado} | ${n(r.funil.volume)} | ${pct(r.principal.fatia)} | ${pct(r.concentracao.top10)} |`);
L('');
L('Leitura, nas hipóteses deste cenário: a taxa de venda (2%) queima pouco do que o funil passa — **a taxa não');
L('é a defesa contra contas novas.** E recusar só a TENTATIVA quase não muda o volume: a conta nova junta mais um');
L('dia de PC-T e tenta de novo, com um valor maior. O que derruba o funil é a detecção que **congela a conta**');
L('(o congelamento da ST-14.14), porque aí o PC-T que ela juntou para de procurar caminho. O funil é PC-T de fonte');
L('aprovada que cada conta ganhou jogando: ele não cria moeda, concentra a que existe.');
L('');
L('## Sensibilidade · equilíbrio × taxa shiny');
L('');
L('| taxa shiny | shiny nascidos | anúncios | vendas | mediana |');
L('|---|---|---|---|---|');
for (const r of shiny)
  L(`| 1/${Math.round(1 / r.parametros.shiny)} | ${r.shiny.nascidos} | ${r.mercado.anuncios} | ${r.mercado.vendas} | ${n(r.mercado.medianaPreco)} |`);
L('');
L('## Parâmetros por cenário');
L('');
for (const r of cenarios) {
  const { politica, ...p } = r.parametros;
  L(`- **${r.cenario}**: ${Object.entries(p).map(([k, v]) => `${k}=${typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(5) : v}`).join(', ')}`);
}
L('');
L('## Limites do modelo');
L('');
L('- Encontros independentes e taxas fixas; sem sazonalidade, sem abandono, sem curva de aprendizado.');
L('- O comprador olha só o anúncio mais barato; o vendedor não reprecifica (só o especulador revende, a +30%).');
L('- Uma espécie shiny vale o mesmo que outra: `precoRef` não varia por espécie nem por potencial.');
L('- O PC-T por dia é uma constante por conta; o gasto em sinks do jogo é uma fração fixa dele.');
L('- Não há troca direta (só Market): a troca não emite nem queima além da própria taxa, e o gate C a cobre no');
L('  teste ponta a ponta (`test/e14-economia.mjs`), não aqui.');
L('- A bola de captura garantida entra por uma chance diária, não pelas fontes reais do pack.');
L('');
writeFileSync(new URL('../docs/e14/SIMULACAO_E14.md', import.meta.url), linhas.join('\n'));
console.log(`docs/e14/SIMULACAO_E14.md · ${cenarios.length + deteccao.length + shiny.length} execuções · ${duracao.toFixed(0)} ms`);
