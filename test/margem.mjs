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
import { tiposDaPool } from '../engine/engine.mjs';
import { derivar, derivarIndice, sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';
import { criarSuite, ok, igual } from './harness.mjs';

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
    const elenco = E.sortearPool(s.elenco);
    const clima  = E.sortearClima(s.ambiente, tiposDaPool(elenco));

    /* o preço que o jogador vê */
    const wins = new Uint32Array(elenco.length);
    simularLote(E, elenco, raiz, 0, sims, wins);
    const preco = precificar(wins, sims, E.M).lutadores;

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
  /* PREGUIÇOSO DE PROPÓSITO. Antes a medição rodava ao CONSTRUIR a suíte, e
     construir a suíte acontece antes de qualquer teste correr — então os 13 s
     deste lote eram pagos mesmo quando a execução parava na primeira falha, lá
     na segunda suíte. Com a sabotagem rodando a suíte 112 vezes, isso sozinho
     custava 24 minutos de trabalho jogado fora. */
  let medido = null;
  const M = () => (medido ??= medir());

  s.teste('a diferença entre grupos de tipo cabe no ruído', () => {
    /* Soma dos dois intervalos: se a diferença medida cabe nela, os dois grupos
       são indistinguíveis com esta amostra. Antes da correção a diferença era
       de 15,58 pontos contra um ruído de ~3 — não cabia nem de longe. */
    const ruido = M().buffavel.ic95 + M().neutro.ic95;
    ok(Math.abs(M().diferenca) <= ruido,
      `buffável ${(M().buffavel.margem*100).toFixed(2)}% ± ${(M().buffavel.ic95*100).toFixed(2)}, ` +
      `resto ${(M().neutro.margem*100).toFixed(2)}% ± ${(M().neutro.ic95*100).toFixed(2)}: ` +
      `diferença de ${(M().diferenca*100).toFixed(2)} pontos contra ruído de ${(ruido*100).toFixed(2)}. ` +
      `O clima voltou a ficar fora do preço?`);
  });

  s.teste('nenhum grupo de tipo tem margem negativa', () => {
    for (const g of ['buffavel', 'neutro'])
      ok(M()[g].margem + M()[g].ic95 > 0,
        `o grupo ${g} tem margem ${(M()[g].margem*100).toFixed(2)}% ± ${(M()[g].ic95*100).toFixed(2)} — ` +
        `a casa paga para aceitar essas apostas`);
  });

  s.teste('a margem geral fica perto da configurada', () => {
    const alvo = E.CONF.MARGIN;
    /* Folga de 3 pontos além do intervalo: o estimador 1/p̂ é convexo, então a
       margem realizada fica sistematicamente ABAIXO da configurada. É o viés
       de Jensen, medido em +19,22 % no pior lutador com 20.000 simulações, e
       corrigi-lo é escopo do F0.7 — não deste bloco. */
    ok(Math.abs(M().geral.margem - alvo) <= M().geral.ic95 + 0.03,
      `margem geral ${(M().geral.margem*100).toFixed(2)}% ± ${(M().geral.ic95*100).toFixed(2)} ` +
      `contra ${(alvo*100).toFixed(0)}% configurados`);
  });

  s.teste('o preço não deixou de responder ao clima', () => {
    /* O contrário do teste de cima: se `simularLote` parasse de sortear clima,
       os dois grupos voltariam a divergir. Este teste mede direto — mesmo
       elenco, um lote com clima e outro sem — e exige que os placares
       DIFIRAM. Um preço que ignora o clima é indistinguível do de antes. */
    const raiz = derivar(0xF06, 'controle');
    const s0 = sementes(raiz);
    const elenco = E.sortearPool(s0.elenco);
    const clima = E.sortearClima(s0.ambiente, tiposDaPool(elenco));
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

  /* S55 escapou de duas redes antes desta, e o motivo de cada escape ensina
     onde o teste tinha que estar.
     · A margem estatística absorve a divergência: ela só aparece em pools às
       quais falta um tipo buffável, e a tolerância engole.
     · Conferir `sortearClima(semente, tipos)` direto não serve: o defeito está
       em `simularLote` ESQUECER de passar `tipos`, e o teste passava `tipos`
       ele mesmo. Testava a função certa pelo caminho errado.

     O que prova é comparar o lote real com uma REFERÊNCIA condicionada,
     escrita aqui. Mesmas sub-seeds, mesma pool: os placares têm que bater
     exatamente. E é preciso uma pool à qual FALTE um tipo buffável, senão
     condicionar e não condicionar dão a mesma coisa e o teste é vazio. */
  s.teste('o lote de preço sorteia clima condicionado à pool', () => {
    const TIPOS_BUFF = [...TIPOS_BUFFAVEIS];
    let achou = null;
    for (let r = 0; r < 400 && !achou; r++) {
      const semente = derivar(0xF06, 'pool-incompleta' + r);
      const elenco = E.sortearPool(semente);
      const tipos = tiposDaPool(elenco);
      if (TIPOS_BUFF.some(t => !tipos.has(t))) achou = { semente, elenco, tipos };
    }
    ok(achou, 'nenhuma pool sem algum tipo buffável em 400 sorteios — o teste ficaria vazio');
    const { elenco, tipos } = achou;
    const raiz = derivar(0xF06, 'lote-condicionado');

    const real = new Uint32Array(elenco.length);
    simularLote(E.M, elenco, raiz, 0, 600, real);

    /* referência: exatamente o que simularLote deve fazer */
    const ref = new Uint32Array(elenco.length);
    for (let i = 0; i < 600; i++) {
      const c = E.sortearClima(derivarIndice(raiz, 'ambiente', i), tipos);
      const lista = c.type ? E.aplicarClima(elenco, c) : elenco;
      const w = E.simular(lista, derivarIndice(raiz, 'simulacao', i), false);
      if (w >= 0) ref[w]++;
    }
    igual(real.join(','), ref.join(','),
      `o lote de preço divergiu da referência condicionada numa pool sem ` +
      `${TIPOS_BUFF.filter(t => !tipos.has(t)).join('/')}. Preço e luta voltaram a ` +
      `ver distribuições de clima diferentes — é o defeito que o F0.6 fechou.`);
  });

  s.teste('a medição arquivada continua de pé', () => {
    ok(existsSync(ARQ), 'fixtures/margem.json não existe — rode npm run test:gerar');
    const base = JSON.parse(readFileSync(ARQ, 'utf8'));
    ok(Math.abs(base.diferenca) < 0.04,
      `a medição arquivada tem diferença de ${(base.diferenca*100).toFixed(2)} pontos entre grupos`);
    ok(Math.abs(M().diferenca - base.diferenca) < 0.06,
      `a diferença entre grupos saiu de ${(base.diferenca*100).toFixed(2)} para ` +
      `${(M().diferenca*100).toFixed(2)} pontos desde a última gravação`);
  });

  return s;
}
