/* Q4 · MARGEM REALIZADA POR GRUPO DE TIPO — o clima entra no preço.
 *
 * O defeito que este bloco fecha: até o F0.5 o Monte Carlo rodava sobre stats
 * CRUS e a batalha rodava com o bônus climático. Os dois discordavam, e a
 * discordância não era simétrica — ela favorecia sempre o mesmo grupo.
 *
 * Medido em 150 rodadas × 3.000 simulações, antes da correção:
 *
 *   tipo buffável     -0,61 %   (a casa PAGAVA para aceitar essas apostas)
 *   resto            +14,96 %
 *   diferença        -15,58 pontos, com 8 % declarados
 *
 * O clima não era surpresa: era desconto, e quem soubesse disso apostava só em
 * Fogo, Água, Voador e Gelo.
 *
 * O AGRUPAMENTO É PELO OBSERVÁVEL, e isso é a parte que importa do teste.
 * Agrupar pelo clima que de fato saiu mede uma vantagem que ninguém consegue
 * usar — o clima só é revelado depois que as apostas fecham. O que o apostador
 * vê na hora de apostar é o TIPO do lutador. É essa a fatia que precisa ter a
 * margem da casa, e nenhuma outra.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as E from './motor.mjs';
import { derivar, derivarIndice, sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';
import { criarSuite, ok } from './harness.mjs';

const ARQ = new URL('./fixtures/margem.json', import.meta.url);

/* O bloco pede 300 rodadas × 8.000 simulações. A suíte roda um lote menor —
   suficiente para o intervalo de confiança separar 8 % de 15 % — e a medição
   grande fica no arquivo, regravada com `npm run test:gerar`. */
const RODADAS = 70, SIMS = 2500, VERDADE = 3000;

const TIPOS_BUFFAVEIS = new Set(E.pack.clima.filter(c => c.type).map(c => c.type));

const media = a => a.reduce((x, y) => x + y, 0) / a.length;
const desvio = a => { const m = media(a); return Math.sqrt(media(a.map(x => (x - m) ** 2))); };
/* meia-largura do intervalo de 95 % da MÉDIA */
const ic95 = a => 1.96 * desvio(a) / Math.sqrt(a.length);

export function medir(rodadas = RODADAS, sims = SIMS, verdade = VERDADE, semente = 0xF06) {
  const grupos = { buffavel: [], neutro: [] };
  for (let r = 0; r < rodadas; r++) {
    const raiz = derivar(semente, 'rodada' + r);
    const s = sementes(raiz);
    const clima  = E.sortearClima(s.ambiente);
    const elenco = E.sortearPool(clima.type, s.elenco);

    /* o preço que o jogador vê */
    const wins = new Uint32Array(elenco.length);
    simularLote(E, elenco, raiz, 0, sims, wins);
    const preco = precificar(wins, sims, E.CONF.MARGIN);

    /* a verdade: a luta real acontece com o clima real */
    const real = clima.type ? E.aplicarClima(elenco, clima) : elenco;
    const vitorias = new Uint32Array(elenco.length);
    for (let i = 0; i < verdade; i++) {
      const w = E.simular(real, derivarIndice(raiz, 'verdade', i), false);
      if (w >= 0) vitorias[w]++;
    }

    elenco.forEach((f, i) => {
      /* margem realizada de uma aposta unitária: 1 - p_verdadeiro × odd */
      const margem = 1 - (vitorias[i] / verdade) * preco[i].odd;
      grupos[f.types.some(t => TIPOS_BUFFAVEIS.has(t)) ? 'buffavel' : 'neutro'].push(margem);
    });
  }
  const todas = [...grupos.buffavel, ...grupos.neutro];
  return {
    rodadas, sims, verdade,
    buffavel: { n: grupos.buffavel.length, margem: media(grupos.buffavel), ic95: ic95(grupos.buffavel) },
    neutro:   { n: grupos.neutro.length,   margem: media(grupos.neutro),   ic95: ic95(grupos.neutro) },
    geral:    { n: todas.length, margem: media(todas), ic95: ic95(todas) },
    diferenca: media(grupos.buffavel) - media(grupos.neutro),
  };
}

/* A medição ARQUIVADA usa os números que o bloco pede — 300 rodadas × 8.000
   simulações. Ela é cara (minutos), então roda só em `npm run test:gerar`; a
   suíte roda o lote curto a cada execução e confere que o resultado continua
   compatível com o arquivado. */
export function gerar() {
  const m = medir(300, 8000, 8000);
  writeFileSync(ARQ, JSON.stringify(m, null, 2));
  return m;
}

export function suite() {
  const s = criarSuite('margem');
  const m = medir();

  s.teste('a diferença entre grupos de tipo cabe no ruído', () => {
    /* Soma dos dois intervalos: se a diferença medida cabe nela, os dois grupos
       são indistinguíveis com esta amostra. Antes da correção a diferença era
       de 15,58 pontos contra um ruído de ~3 — não cabia nem de longe. */
    const ruido = m.buffavel.ic95 + m.neutro.ic95;
    ok(Math.abs(m.diferenca) <= ruido,
      `buffável ${(m.buffavel.margem*100).toFixed(2)}% ± ${(m.buffavel.ic95*100).toFixed(2)}, ` +
      `resto ${(m.neutro.margem*100).toFixed(2)}% ± ${(m.neutro.ic95*100).toFixed(2)}: ` +
      `diferença de ${(m.diferenca*100).toFixed(2)} pontos contra ruído de ${(ruido*100).toFixed(2)}. ` +
      `O clima voltou a ficar fora do preço?`);
  });

  s.teste('nenhum grupo de tipo tem margem negativa', () => {
    for (const g of ['buffavel', 'neutro'])
      ok(m[g].margem + m[g].ic95 > 0,
        `o grupo ${g} tem margem ${(m[g].margem*100).toFixed(2)}% ± ${(m[g].ic95*100).toFixed(2)} — ` +
        `a casa paga para aceitar essas apostas`);
  });

  s.teste('a margem geral fica perto da configurada', () => {
    const alvo = E.CONF.MARGIN;
    /* Folga de 3 pontos além do intervalo: o estimador 1/p̂ é convexo, então a
       margem realizada fica sistematicamente ABAIXO da configurada. É o viés
       de Jensen, medido em +19,22 % no pior lutador com 20.000 simulações, e
       corrigi-lo é escopo do F0.7 — não deste bloco. */
    ok(Math.abs(m.geral.margem - alvo) <= m.geral.ic95 + 0.03,
      `margem geral ${(m.geral.margem*100).toFixed(2)}% ± ${(m.geral.ic95*100).toFixed(2)} ` +
      `contra ${(alvo*100).toFixed(0)}% configurados`);
  });

  s.teste('o preço não deixou de responder ao clima', () => {
    /* O contrário do teste de cima: se `simularLote` parasse de sortear clima,
       os dois grupos voltariam a divergir. Este teste mede direto — mesmo
       elenco, um lote com clima e outro sem — e exige que os placares
       DIFIRAM. Um preço que ignora o clima é indistinguível do de antes. */
    const raiz = derivar(0xF06, 'controle');
    const s0 = sementes(raiz);
    const clima = E.sortearClima(s0.ambiente);
    const elenco = E.sortearPool(clima.type, s0.elenco);
    const comClima = new Uint32Array(elenco.length);
    simularLote(E, elenco, raiz, 0, 1500, comClima);
    const semClima = new Uint32Array(elenco.length);
    for (let i = 0; i < 1500; i++) {
      const w = E.simular(elenco, derivarIndice(raiz, 'simulacao', i), false);
      if (w >= 0) semClima[w]++;
    }
    ok(comClima.join(',') !== semClima.join(','),
      'o lote com clima deu exatamente o mesmo placar do lote sem clima — ' +
      'o sorteio de clima do Monte Carlo sumiu');
  });

  s.teste('a medição arquivada continua de pé', () => {
    ok(existsSync(ARQ), 'fixtures/margem.json não existe — rode npm run test:gerar');
    const base = JSON.parse(readFileSync(ARQ, 'utf8'));
    ok(Math.abs(base.diferenca) < 0.04,
      `a medição arquivada tem diferença de ${(base.diferenca*100).toFixed(2)} pontos entre grupos`);
    ok(Math.abs(m.diferenca - base.diferenca) < 0.06,
      `a diferença entre grupos saiu de ${(base.diferenca*100).toFixed(2)} para ` +
      `${(m.diferenca*100).toFixed(2)} pontos desde a última gravação`);
  });

  return s;
}
