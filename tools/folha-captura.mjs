/* A BOLA QUE ABRE E FECHA VIRA UMA FOLHA DE SPRITES (bloco 1.23).
 *
 * ── A REFERÊNCIA, E O QUE ELA REALMENTE TEM ──────────────────────────────
 *
 * O dono plantou `catchpokeball.gif` na pasta sem avisar, para ver se eu
 * notaria. Ele tem **119 quadros de 800×600, 30 ms cada, 3,57 s**. E o que ele
 * mostra não é o que eu teria construído de memória:
 *
 *     0–12     bola fechada
 *     16–28    ABRE — as duas metades se separam
 *     33–65    ACHATADA em três linhas: o estado de "está dentro"
 *     69–81    remonta
 *     81–118   fechada de novo
 *
 * **Não há chacoalhada, e não há final.** É um abre-e-fecha limpo. Eu só sei
 * disso porque montei a folha de contato (`tools/contato-gif.mjs`) e OLHEI —
 * e a diferença entre "conheço o padrão" e "vi a referência" é exatamente esta.
 *
 * ── POR QUE NÃO USAR O GIF DIRETO, E A RAZÃO NÃO É PESO ──────────────────
 *
 * No 1.20 o argumento foi peso: 5,71 MB para um selo de 20 px. Aqui o gif tem
 * 225 KB e tocaria uma vez — peso não decide.
 *
 *   > **Um gif toca reto e tem UM final. A captura tem DOIS.**
 *
 * A animação precisa PARAR na bola fechada enquanto a chacoalhada corre, e
 * depois ramificar: trava (pegou) ou abre de novo (fugiu). Gif não pausa, não
 * ramifica e não volta atrás. A tira dá as três coisas de graça.
 *
 * E a chacoalhada — que o L-115 chama de "a animação inteira", porque a PAUSA
 * entre os balanços é o suspense — não está no gif. Ela é construída por cima,
 * em transformação CSS, sobre o quadro fechado.
 *
 * ── A COR DE CADA BOLA SAI DA NOSSA PRÓPRIA ARTE ─────────────────────────
 *
 * O requisito do dono é literal: *"jogar uma Great e ver a animação da Ultra é
 * pior que não ter animação nenhuma — a arte tem de casar com o objeto usado"*.
 *
 * A referência é uma Poké Ball vermelha. Pintar de azul "porque Great Ball é
 * azul" seria eu inventando a cor. Então a cor é **amostrada do ícone de item
 * que o jogo já usa** — `assets/icones/itens.png`, nas casas que o catálogo do
 * pack declara (poke 3, great 2, ultra 1).
 *
 *     O resgate busca a mesma coisa em outro endereço, nunca outra coisa.
 *
 * O que sai não é o padrão exato da série — a nossa bola é a arte de linha do
 * dono recolorida, e não a listra do cartucho. **A diferença tem nome**, que é
 * o que a regra de cópia deste projeto exige: a nossa lê a bola pela COR CHEIA
 * da metade de cima, e não pelo desenho da listra, porque a 128 px em movimento
 * a listra vira ruído e a cor cheia se lê num quadro.
 *
 * Uso:
 *   node tools/folha-captura.mjs [--lado 128]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME;
const FONTE = process.env.CAPTURA_GIF ||
  'C:/Users/gdult/OneDrive/Documentos/PokeArena/ÍCONES GERAIS/catchpokeball.gif';

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : p;
};
const LADO = arg('lado', 128);

/* ── OS QUADROS SÃO ESCOLHIDOS, E NÃO AMOSTRADOS POR IGUAL ────────────────
 *
 * Um terço do gif é a bola ACHATADA parada (33–65). Amostrar por igual gastaria
 * oito casas da tira desenhando o mesmo quadro, e deixaria a abertura — que é
 * onde o movimento está — com três.
 *
 * Duas metades de 12, e a tira é simétrica de propósito: a mesma casa serve
 * para abrir e para fechar quando a captura falha. */
const ABRIR  = [0, 8, 14, 17, 19, 21, 23, 25, 27, 29, 31, 33];
const FECHAR = [64, 67, 69, 71, 73, 75, 77, 79, 82, 86, 90, 95];
const QUADROS = [...ABRIR, ...FECHAR];

/* ── AS CASAS VÊM DO CATÁLOGO, E NÃO ESCRITAS AQUI ───────────────────────
 *
 * Elas estavam escritas à mão: `[['poke', 3], ['great', 2], ['ultra', 1]]`. No
 * dia em que o catálogo corrigiu a Poké Ball de 3 para 15 — a casa 3 é laranja,
 * a 15 é a vermelha —, a tira continuou saindo laranja e **nada reclamou**.
 *
 *   > Duas verdades sobre o mesmo número não divergem no dia em que são
 *   > escritas. Divergem no dia em que uma das duas é corrigida.
 *
 * É a terceira vez neste mês que a mesma forma aparece: o nome do item em três
 * telas (D-074), a cor das faixas em três telas (1.23), e agora a casa da bola
 * em dois arquivos. A correção é sempre a mesma — quem sabe o número é quem o
 * declara, e todo o resto pergunta. */
const { BOLAS_DO_PACK } = await import(pathToFileURL(join(RAIZ, 'content/itens_v1.mjs')).href);
const ORDEM = ['poke', 'great', 'ultra'];
const BOLAS = ORDEM.map(id => {
  const b = (BOLAS_DO_PACK ?? []).find(x => x.id === id);
  if (!b || !Number.isInteger(b.icone))
    throw new Error(`o catálogo não declara a casa de "${id}" — a tira sairia com a bola errada`);
  return [id, b.icone];
});

const gif = 'data:image/gif;base64,' + readFileSync(FONTE).toString('base64');
const itens = 'data:image/png;base64,' +
  readFileSync(join(RAIZ, 'assets/icones/itens.png')).toString('base64');

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
/* `ImageDecoder` (WebCodecs) só existe em origem segura — `about:blank` não é
   uma. Mesma solução do `folha-pokebola.mjs`, e pela mesma razão. */
const srv = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset="utf-8"><title>folha</title>');
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`);

const saida = await pg.evaluate(async ({ gif, itens, QUADROS, BOLAS, LADO }) => {
  const bin = Uint8Array.from(atob(gif.split(',')[1]), c => c.charCodeAt(0));
  const dec = new ImageDecoder({ data: bin, type: 'image/gif' });
  await dec.tracks.ready;
  const total = dec.tracks.selectedTrack.frameCount;

  /* ── A COR DE CADA BOLA, AMOSTRADA DO ÍCONE QUE O JOGO JÁ USA ───────────
     A casa vem do catálogo do pack; a cor é a MAIS FREQUENTE da metade de
     cima do ícone, ignorando o contorno escuro e o branco. Mediana seria pior:
     numa arte de poucas cores, a moda é a cor cheia e a mediana é uma mistura
     que não existe em pixel nenhum. */
  const folhaItens = new Image();
  folhaItens.src = itens;
  await folhaItens.decode();
  const COLUNAS = 23, CELA = 32;
  const ci = document.createElement('canvas');
  ci.width = folhaItens.width; ci.height = folhaItens.height;
  ci.getContext('2d').drawImage(folhaItens, 0, 0);
  const gi = ci.getContext('2d');

  const corDaBola = casa => {
    const cx = (casa % COLUNAS) * CELA, cy = Math.floor(casa / COLUNAS) * CELA;
    const d = gi.getImageData(cx, cy, CELA, Math.floor(CELA * 0.42)).data;
    const conta = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, bl, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 200) continue;
      const luz = (r + g + bl) / 3;
      if (luz < 40 || luz > 225) continue;          /* contorno e branco fora */
      const k = `${r >> 3},${g >> 3},${bl >> 3}`;
      const v = conta.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      v.n++; v.r += r; v.g += g; v.b += bl; conta.set(k, v);
    }
    let melhor = null;
    for (const v of conta.values()) if (!melhor || v.n > melhor.n) melhor = v;
    if (!melhor) return null;
    return [Math.round(melhor.r / melhor.n), Math.round(melhor.g / melhor.n),
            Math.round(melhor.b / melhor.n)];
  };

  const cores = BOLAS.map(([id, casa]) => ({ id, casa, cor: corDaBola(casa) }));

  const c = document.createElement('canvas');
  c.width = LADO * QUADROS.length; c.height = LADO * BOLAS.length;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';

  /* ── O RECORTE É MEDIDO, E NÃO O QUADRADO DO MEIO ──────────────────────
   *
   * A primeira versão recortava o quadrado central de 600×600 do quadro de
   * 800×600. Medido depois: **a bola ocupava 9,3% da casa** — ela é pequena
   * dentro do quadro, e a casa saía quase toda vazia. Ampliar isso na tela
   * daria uma bola borrada cercada de nada.
   *
   * Então uma passada mede a CAIXA que a arte de fato ocupa, unindo todos os
   * quadros escolhidos: a abertura é alta e a achatada é larga, e o recorte
   * tem de caber nas duas ou a animação pula de tamanho no meio.
   *
   *   > Recortar por suposição centra o nada. Recortar pela medida centra a
   *   > arte, e o número diz qual dos dois aconteceu. */
  const medir = document.createElement('canvas');
  const gm = medir.getContext('2d', { willReadFrequently: true });
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
  for (const q of QUADROS) {
    const { image } = await dec.decode({ frameIndex: q % total });
    medir.width = image.displayWidth; medir.height = image.displayHeight;
    gm.clearRect(0, 0, medir.width, medir.height);
    gm.drawImage(image, 0, 0);
    const dm = gm.getImageData(0, 0, medir.width, medir.height).data;
    /* A arte é escura sobre branco: "tinta" é qualquer pixel que não seja o
       branco do fundo. Limiar generoso — contorno suavizado conta como tinta. */
    for (let y = 0; y < medir.height; y++)
      for (let x = 0; x < medir.width; x++) {
        const i = (y * medir.width + x) * 4;
        if (dm[i] > 236 && dm[i + 1] > 236 && dm[i + 2] > 236) continue;
        if (x < x1) x1 = x; if (x > x2) x2 = x;
        if (y < y1) y1 = y; if (y > y2) y2 = y;
      }
    image.close?.();
  }
  /* Quadrado, centrado na caixa medida, com 6% de folga para o contorno não
     encostar na borda da casa. */
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const meio = Math.max(x2 - x1, y2 - y1) / 2 * 1.06;
  const rec = { x: cx - meio, y: cy - meio, l: meio * 2 };

  for (let linha = 0; linha < BOLAS.length; linha++)
    for (let k = 0; k < QUADROS.length; k++) {
      const { image } = await dec.decode({ frameIndex: QUADROS[k] % total });
      g.drawImage(image, rec.x, rec.y, rec.l, rec.l,
                  k * LADO, linha * LADO, LADO, LADO);
      image.close?.();
    }

  /* ── O FUNDO BRANCO SAI, E O VERMELHO VIRA A COR DA BOLA ────────────────
     Uma passada só sobre a folha inteira. O branco do fundo é chapado e o
     contorno é azul-escuro, então separar os três é comparação simples — a arte
     de linha é o que torna isto seguro, e por isso o comentário diz que é. */
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], vd = px[i + 1], az = px[i + 2];
    const linha = Math.floor(Math.floor(i / 4 / c.width) / LADO);
    const alvo = cores[Math.min(linha, cores.length - 1)].cor;
    /* BRANCO -> transparente. O fundo e o miolo claro da bola são o mesmo
       branco, então o corte é por ALAGAMENTO da borda, feito abaixo. */
    if (alvo && r > 150 && vd < r * 0.62 && az < r * 0.62) {
      /* VERMELHO -> a cor da bola, preservando o brilho relativo do pixel para
         a sombra e o realce da arte não sumirem. */
      const f = r / 232;
      px[i]     = Math.min(255, Math.round(alvo[0] * f));
      px[i + 1] = Math.min(255, Math.round(alvo[1] * f));
      px[i + 2] = Math.min(255, Math.round(alvo[2] * f));
    }
  }
  g.putImageData(d, 0, 0);

  /* Alagamento a partir das quatro bordas de CADA casa: o branco de fora vira
     transparente, o branco de dentro da bola fica. Mesma técnica do 1.20, e a
     tolerância é apertada pelo mesmo motivo — com folga ela atravessa o
     contorno suavizado e come a metade clara da bola. */
  const d2 = g.getImageData(0, 0, c.width, c.height);
  const p2 = d2.data;
  const W = c.width;
  for (let linha = 0; linha < BOLAS.length; linha++)
    for (let k = 0; k < QUADROS.length; k++) {
      const x0 = k * LADO, y0 = linha * LADO;
      const em = (x, y) => ((y0 + y) * W + (x0 + x)) * 4;
      const k0 = [p2[em(0, 0)], p2[em(0, 0) + 1], p2[em(0, 0) + 2]];
      const perto = i => Math.abs(p2[i] - k0[0]) < 12 &&
                         Math.abs(p2[i + 1] - k0[1]) < 12 &&
                         Math.abs(p2[i + 2] - k0[2]) < 12;
      const fila = [], visto = new Uint8Array(LADO * LADO);
      for (let x = 0; x < LADO; x++) { fila.push([x, 0], [x, LADO - 1]); }
      for (let y = 0; y < LADO; y++) { fila.push([0, y], [LADO - 1, y]); }
      while (fila.length) {
        const [x, y] = fila.pop();
        if (x < 0 || y < 0 || x >= LADO || y >= LADO) continue;
        const p = y * LADO + x;
        if (visto[p]) continue;
        const i = em(x, y);
        if (!perto(i)) continue;
        visto[p] = 1; p2[i + 3] = 0;
        fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  g.putImageData(d2, 0, 0);

  /* OCUPAÇÃO MEDIDA, e não confiada. Se o alagamento comer a bola, isto cai —
     foi assim que o 1.20 descobriu que a tolerância de 26 apagava metade. */
  const oc = [];
  for (let linha = 0; linha < BOLAS.length; linha++) {
    let op = 0, tot = 0;
    for (let y = 0; y < LADO; y++)
      for (let x = 0; x < LADO; x++) {
        const i = ((linha * LADO + y) * W + x) * 4;
        tot++; if (p2[i + 3] > 20) op++;
      }
    oc.push(+(op / tot * 100).toFixed(1));
  }
  return { png: c.toDataURL('image/png').split(',')[1],
           cores: cores.map(x => ({ id: x.id, cor: x.cor })), oc, total,
           casas: QUADROS.length, rec: [Math.round(rec.x), Math.round(rec.y), Math.round(rec.l)] };
}, { gif, itens, QUADROS, BOLAS, LADO });

const destino = join(RAIZ, 'assets/icones/bola-captura.png');
mkdirSync(dirname(destino), { recursive: true });
const png = Buffer.from(saida.png, 'base64');
writeFileSync(destino, png);
await b.close(); srv.close();

console.log(`${saida.total} quadros no gif -> ${saida.casas} casas x ${BOLAS.length} bolas`);
for (const c of saida.cores)
  console.log(`  ${c.id.padEnd(6)} cor amostrada do ícone: rgb(${c.cor?.join(', ') ?? '—'})`);
console.log(`  recorte medido: ${saida.rec[2]}x${saida.rec[2]} em (${saida.rec[0]}, ${saida.rec[1]})`);
console.log(`  ocupação por linha: ${saida.oc.join('% · ')}%`);
console.log(`  ${destino} — ${(png.length / 1024).toFixed(0)} KB`);

/* ── AS CORES SAEM DAQUI, E NÃO SÃO REESCRITAS À MÃO ─────────────────────
 *
 * A cena precisa da cor de cada bola para tingir o feixe de luz — e é
 * justamente no meio da abertura que a arte fica BRANCA, sem identidade
 * nenhuma. A luz na cor da bola devolve a identidade exatamente onde ela
 * some.
 *
 * Escrever os três hex à mão em `captura-tela.mjs` criaria a segunda verdade
 * que este projeto persegue: o dia em que a folha de ícones mudasse, a tira
 * mudaria e o feixe não. Então a ferramenta que MEDE é a que escreve. */
const hex = c => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
writeFileSync(join(RAIZ, 'app/modules/bola-cores.mjs'),
  `/* GERADO por \`tools/folha-captura.mjs\` — não editar à mão.
 *
 * A cor de cada bola, AMOSTRADA do ícone que o jogo já usa
 * (\`assets/icones/itens.png\`, nas casas que o catálogo do pack declara).
 * Ela tinge o feixe de luz da captura, porque no meio da abertura a arte da
 * bola fica branca e a identidade some justo ali.
 *
 * Regerar junto com \`assets/icones/bola-captura.png\`: as duas saem da mesma
 * medição, e separá-las seria criar duas verdades sobre a mesma cor. */
export const CORES_DA_BOLA = {
${saida.cores.map(c => `  ${c.id}: '${hex(c.cor)}',`).join('\n')}
};
export const corDaBola = id => CORES_DA_BOLA[id] ?? CORES_DA_BOLA.poke;
`);
console.log('  app/modules/bola-cores.mjs regravado');
