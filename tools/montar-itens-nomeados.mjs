/* A FOLHA DE ÍCONES DOS ITENS QUE O JOGO USA HOJE.
 *
 * ── POR QUE UMA FOLHA NOVA, e não a de 391 ───────────────────────────────
 *
 * A folha do Brilliant Diamond tem 391 ícones e **nenhum nome**. Descobri a
 * ordem das dezesseis primeiras casas olhando, e conferi de novo ampliando 4×:
 * Master, Ultra, Great, Poké, Safari, Net, Dive, Nest, Repeat, Timer, Luxury,
 * Premier, Dusk, Heal, Quick, Cherish. A Poké Ball sai ALARANJADA no render do
 * BDSP — eu a tomei por errada uma vez, e não estava.
 *
 * Nas pedras a ordem não é confiável: procurei em quatro faixas e não achei, e o
 * casamento por assinatura de cor não discrimina. Então: **cada fonte onde ela
 * é confiável.** Bolas da folha; pedras dos ícones do PDF, conferidas uma a uma;
 * e o Elo de Ligação, que é NOSSO, de `arte/itens/elo.svg`.
 *
 * ── O RECORTE PADRÃO VALE PARA TODA FONTE, E ESSA É A CORREÇÃO ───────────
 *
 * A primeira versão desta ferramenta aparava e centralizava as PEDRAS, e copiava
 * as BOLAS cruas, 1:1. O dono viu na mochila antes de eu ver no código:
 *
 *     "olha como está ultrabll qualidade saiu péssima"
 *
 * A Ultra Ball não estava borrada — estava **pequena**. Medido depois: bola
 * ocupava 44% do quadro de 48 px, pedra ocupava 82%. Lado a lado, a bola parece
 * 40% menor e mais fraca, e o olho lê isso como baixa qualidade.
 *
 * A lição é a de sempre neste projeto, chegando por mais uma porta: **regra
 * aplicada a UMA fonte não é regra, é coincidência.** Agora há um caminho só —
 * `preparar()` — e toda peça passa por ele, venha de onde vier.
 *
 * ── E O FUNDO SAI POR PREENCHIMENTO, NÃO POR IGUALDADE ───────────────────
 *
 * Cada imagem do PDF traz o cinza da página E um pedaço da linha azul da grade.
 * Apagar "todo pixel claro" comeria o brilho branco de DENTRO da pedra — que é
 * justamente o que faz uma pedra parecer pedra. Então o vazio é achado por
 * preenchimento a partir da BORDA: só sai o fundo que encosta na moldura.
 *
 * ── A SAÍDA É NOMEADA ────────────────────────────────────────────────────
 *
 * Uma casa por item DO PACK, na ordem que o pack declara. O app não indexa por
 * "posição na folha de terceiro": indexa por item. É a mesma fronteira dos
 * ícones de cabeça — lá a chave é a dex, aqui é o id.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';
const LADO = 48, COLUNAS = 8;

/* Quanto do quadro a peça ocupa depois de aparada. 0,88 deixa ~3 px de folga de
   cada lado: sem ela dois ícones vizinhos se encostam e a lista perde o ritmo;
   com folga demais eles voltam a parecer pequenos. */
const OCUPACAO = 0.88;

/* `folha` = casa na folha do BD; `pdf` = png extraído; `nosso` = arte deste
   projeto, que mora em arte/ e nunca em assets/ (ver arte/README.md). */
const FONTES = [
  { id: 'poke',       de: 'folha', casa: 3 },
  { id: 'great',      de: 'folha', casa: 2 },
  { id: 'ultra',      de: 'folha', casa: 1 },
  { id: 'mestra',     de: 'folha', casa: 0 },
  { id: 'fogo',       de: 'pdf',   n: 1 },
  { id: 'agua',       de: 'pdf',   n: 2 },
  { id: 'trovao',     de: 'pdf',   n: 3 },
  { id: 'folha',      de: 'pdf',   n: 4 },
  { id: 'lua',        de: 'pdf',   n: 5 },
  { id: 'sol',        de: 'pdf',   n: 6 },
  { id: 'brilho',     de: 'pdf',   n: 7 },
  { id: 'crepusculo', de: 'pdf',   n: 8 },
  { id: 'aurora',     de: 'pdf',   n: 9 },
  { id: 'oval',       de: 'pdf',   n: 10 },
  { id: 'elo',        de: 'nosso', arq: 'arte/itens/elo.svg' },
  { id: 'pokecoin',   de: 'nosso', arq: 'arte/moedas/pokecoin.png' },
  { id: 'essencia',   de: 'nosso', arq: 'arte/itens/essencia.svg' },
];

const b64 = (p, mime = 'image/png') =>
  `data:${mime};base64,` + readFileSync(p).toString('base64');
const achaPdf = n => {
  const base = join(RAIZ, 'tools/previas/_pdf/cor');
  for (const d of ['45x44', '44x44', '45x45', '44x45']) {
    const f = join(base, `img-${String(n).padStart(2, '0')}-${d}.png`);
    if (existsSync(f)) return f;
  }
  return null;
};

const pecas = FONTES.map(f => {
  if (f.de === 'folha') return { ...f, dados: null };
  if (f.de === 'nosso') {
    const p = join(RAIZ, f.arq);
    if (!existsSync(p)) throw new Error(`falta a arte nossa de "${f.id}": ${f.arq}`);
    /* O MIME VEM DA EXTENSAO, e nao do RAMO. Arte nossa pode ser vetor (o Elo)
       ou bitmap (a moeda), e mandar um PNG rotulado como SVG faz a imagem
       falhar em silencio — o `onerror` dispara e a peca some do quadro. */
    const mime = p.toLowerCase().endsWith('.svg') ? 'image/svg+xml'
               : p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg') ? 'image/jpeg'
               : 'image/png';
    return { ...f, dados: b64(p, mime) };
  }
  const p = achaPdf(f.n);
  if (!p) throw new Error(`falta o png do PDF para "${f.id}" (n=${f.n}). ` +
    'Rode tools/_imgpdf.mjs sobre o PDF Corrigido antes.');
  return { ...f, dados: b64(p) };
});

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

const folhaBD = b64(join(RAIZ, 'assets/icones/itens.png'));
const r = await pg.evaluate(async ({ pecas, folhaBD, LADO, COLUNAS, OCUPACAO }) => {
  const carregar = src => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => rej(new Error('nao carregou'));
    i.src = src;
  });
  const bd = await carregar(folhaBD);
  const COLS_BD = 12;

  const linhas = Math.ceil(pecas.length / COLUNAS);
  const c = document.createElement('canvas');
  c.width = COLUNAS * LADO; c.height = linhas * LADO;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';

  const tmp = document.createElement('canvas');
  const gt = tmp.getContext('2d', { willReadFrequently: true });

  /* ── LIMPAR O FUNDO, A PARTIR DA BORDA ────────────────────────────────
     Uma fila que começa em toda a moldura e só anda por pixel que PAREÇA
     fundo. O branco de dentro da pedra não encosta na borda, então fica. */
  const limparBorda = (d, w, h) => {
    /* AS CHAVES SAEM DA PRÓPRIA BORDA DA PEÇA, e não de uma constante.
       A primeira versão tinha dois limiares fixos — "cinza claro" e "azul de
       grade" — e duas peças escaparam: a Pedra da Lua e a Oval ficaram com a
       caixa inteira, porque o cinza delas é alguns tons mais escuro que o das
       outras. Limiar fixo contra material digitalizado é sempre isso: acerta a
       maioria e mente sobre o resto.

       O anel de 1 px em volta é fundo por CONSTRUÇÃO — nenhum ícone encosta na
       moldura. As cores que se repetem ali são, por definição, as cores do
       fundo DESTA peça. */
    /* DOIS ANÉIS, E O SEGUNDO É O QUE FECHOU A CONTA.
       Medido nas seis peças: a moldura azul ocupa ~23% do anel externo, e o
       papel cinza aparece nele entre 11% e 22% — dependendo só da espessura da
       moldura naquela digitalização. Com piso em 12%, três pedras perdiam o
       cinza por um ponto percentual e voltavam com a caixa inteira.

       O anel de dentro (recuo 4) cai SEMPRE no papel: a moldura tem 2 a 3 px e
       o ícone é centrado e menor. Ele não é um limiar mais frouxo — é uma
       amostra num lugar onde a resposta é conhecida por construção. */
    const anelEm = r => {
      const a = [];
      if (w - 2 * r < 6 || h - 2 * r < 6) return a;
      for (let x = r; x < w - r; x++) a.push([x, r], [x, h - 1 - r]);
      for (let y = r; y < h - r; y++) a.push([r, y], [w - 1 - r, y]);
      return a;
    };
    const anel = [...anelEm(0), ...anelEm(4)];

    /* Só cor que DOMINA a moldura vira chave. Uma ponta solta de ícone que
       encostasse na borda não pode virar autorização para apagar, e o contorno
       escuro de uma pedra também não. */
    const DOMINIO = 0.08;
    const chavesDaBorda = () => {
      const conta = new Map();
      let vivos = 0;
      for (const par of anel) {
        const i = (par[1] * w + par[0]) * 4;
        if (d[i + 3] < 24) continue;
        vivos++;
        /* degraus de 16, para o ruído de compressão não virar 400 cores */
        const ch = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
        const e = conta.get(ch) ?? { n: 0, r: 0, g: 0, b: 0 };
        e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
        conta.set(ch, e);
      }
      /* O piso é sobre o que AINDA está vivo no anel, e não sobre o anel
         inteiro. Depois da primeira camada quase toda a moldura já é
         transparente: medido contra `anel.length`, o cinza do papel nunca
         alcançava os 12% e a segunda camada nunca era removida. */
      const piso = Math.max(3, Math.round(vivos * DOMINIO));
      return [...conta.values()].filter(e => e.n >= piso)
        .map(e => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]);
    };

    /* ── O FUNDO VEM EM CAMADAS, E UMA PASSADA SÓ ENXERGA A PRIMEIRA ────
       Cada imagem do PDF é: moldura AZUL da grade, papel CINZA por dentro, e o
       ícone no meio. Uma passada só derruba o azul e para no cinza — foi
       exatamente o que aconteceu, e a Pedra do Fogo voltou com 44% de pixel
       claro. Então a passada se repete, redescobrindo a chave na borda que
       ficou exposta, até parar de achar fundo. */
    const PASSADAS = 4;
    for (let volta = 0; volta < PASSADAS; volta++) {
      const CHAVES = chavesDaBorda();
      if (!CHAVES.length) break;
      const TOL = 30;
      const fundo = i => {
        if (d[i + 3] < 24) return true;
        for (const k of CHAVES)
          if (Math.abs(d[i] - k[0]) <= TOL && Math.abs(d[i + 1] - k[1]) <= TOL &&
              Math.abs(d[i + 2] - k[2]) <= TOL) return true;
        return false;
      };
      /* ── O PREENCHIMENTO É ENCADEADO, E É O QUE FAZ ELE FUNCIONAR ─────
         Entre o azul da grade e o cinza do papel existe uma faixa esmaecida —
         a compressão fazendo a transição. Ela não casa com NENHUMA das duas
         chaves, e o preenchimento simples morria exatamente ali: por isso a
         Pedra do Fogo voltava com o quadro inteiro enquanto a da Água saía
         limpa. A diferença entre as duas era só a espessura da moldura.

         Então cada pixel tem DUAS chances: parecer com uma chave do fundo, ou
         parecer com o VIZINHO que o trouxe. A segunda desce a rampa suave até
         o fim; e ela para no contorno escuro do ícone, que é um degrau, não
         uma rampa — que é justamente o que um contorno é. */
      const PASSO_SUAVE = 26;
      const visto = new Uint8Array(w * h);
      const fila = [];
      const perto = (i, j, t) =>
        Math.abs(d[i] - d[j]) <= t && Math.abs(d[i + 1] - d[j + 1]) <= t &&
        Math.abs(d[i + 2] - d[j + 2]) <= t;
      for (let x = 0; x < w; x++) { fila.push([x, 0, -1], [x, h - 1, -1]); }
      for (let y = 0; y < h; y++) { fila.push([0, y, -1], [w - 1, y, -1]); }
      let tirou = 0;
      while (fila.length) {
        const par = fila.pop(), x = par[0], y = par[1], veioDe = par[2];
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const k = y * w + x;
        if (visto[k]) continue;
        const i = k * 4;
        const jaVazio = d[i + 3] < 24;
        if (!jaVazio && !fundo(i) &&
            !(veioDe >= 0 && d[veioDe + 3] >= 24 && perto(i, veioDe, PASSO_SUAVE)))
          continue;
        visto[k] = 1;
        const cor = jaVazio ? veioDe : i;
        if (!jaVazio) { d[i + 3] = 0; tirou++; }
        fila.push([x + 1, y, cor], [x - 1, y, cor], [x, y + 1, cor], [x, y - 1, cor]);
      }
      if (!tirou) break;
    }

    /* ── A MOLDURA SAI POR ELIMINAÇÃO, e não por cor ─────────────────────
       Sobrava sempre um fio de 1 px da grade azul nas quinas — fino demais
       para dominar o anel, e fatal do mesmo jeito: é ELE que vira a caixa de
       aparo, e a peça sai menor dentro de um quadro cheio de nada.

       Nenhum ícone encosta na moldura nesta folha; isso é construção, não
       sorte. Então os 2 px de fora saem sem perguntar de que cor são. */
    /* 3 px, e não 2: na folha do BD o fio da grade fica a dois pixels da
       quina, então limpar dois deixava exatamente ele para trás — e era ele
       que virava a caixa de aparo. As bolas ocupam 44% da célula, centradas;
       três pixels de folga não encostam em nenhuma. */
    /* ── UM ÍCONE É UM OBJETO SÓ ──────────────────────────────────────
       A arte da moeda veio com dois pingos escuros soltos perto da borda —
       resíduo da chave do JPEG original. A 32 px eles somem no ruído; a 64 px,
       não. E o mesmo vai voltar em toda arte nova que passar por chavagem.

       O piso é RELATIVO ao maior componente, e não absoluto: "descarte menos de
       20 px" quebraria no dia em que alguém pedisse um ícone pequeno. É a mesma
       lição do limiar fixo que deixou três pedras para trás algumas linhas
       acima — proporção sobrevive à mudança de escala, número solto não. */
    const PISO_COMPONENTE = 0.005;
    const marca = new Int32Array(w * h).fill(-1);
    const tam = [];
    for (let y0 = 0; y0 < h; y0++) for (let x0 = 0; x0 < w; x0++) {
      const k0 = y0 * w + x0;
      if (marca[k0] >= 0 || d[k0 * 4 + 3] < 24) continue;
      const id = tam.length; let n = 0;
      const fila = [[x0, y0]];
      marca[k0] = id;
      while (fila.length) {
        const [px, py] = fila.pop(); n++;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nk = ny * w + nx;
          if (marca[nk] >= 0 || d[nk * 4 + 3] < 24) continue;
          marca[nk] = id; fila.push([nx, ny]);
        }
      }
      tam.push(n);
    }
    const maior = Math.max(0, ...tam);
    if (maior > 0) {
      const piso = maior * PISO_COMPONENTE;
      for (let k = 0; k < w * h; k++)
        if (marca[k] >= 0 && tam[marca[k]] < piso) d[k * 4 + 3] = 0;
    }

    const MOLDURA = 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (x < MOLDURA || y < MOLDURA || x >= w - MOLDURA || y >= h - MOLDURA)
        d[(y * w + x) * 4 + 3] = 0;
    /* A FRANJA. O JPEG e o PDF deixam meia-borda entre a peça e o fundo; sem
       esta passada toda pedra fica com um halo cinza que só aparece sobre a
       interface escura — que é exatamente onde a mochila vive. */
    const copia = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (copia[i + 3] === 0) continue;
      let vizinhoVazio = false;
      for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dd[0], ny = y + dd[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (copia[(ny * w + nx) * 4 + 3] === 0) { vizinhoVazio = true; break; }
      }
      if (!vizinhoVazio) continue;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      if (R > 186 && G > 186 && B > 186 &&
          Math.max(R, G, B) - Math.min(R, G, B) < 34) d[i + 3] = 0;
    }
  };

  /* ── O CAMINHO ÚNICO ──────────────────────────────────────────────────
     Toda peça entra aqui, venha da folha, do PDF ou de arte/. É o que garante
     que bola e pedra saiam do MESMO tamanho — a correção que o dono pediu ao
     ver a Ultra Ball encolhida. */
  const medir = (fonte, sx, sy, sw, sh, limpar) => {
    tmp.width = sw; tmp.height = sh;
    gt.clearRect(0, 0, sw, sh);
    gt.drawImage(fonte, sx, sy, sw, sh, 0, 0, sw, sh);
    const im = gt.getImageData(0, 0, sw, sh);
    if (limpar) { limparBorda(im.data, sw, sh); gt.putImageData(im, 0, 0); }
    const d = im.data;
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] < 24) continue;
      if (x < ax) ax = x; if (x > bx) bx = x;
      if (y < ay) ay = y; if (y > by) by = y;
    }
    if (bx < 0) return null;
    return { ax, ay, lw: bx - ax + 1, lh: by - ay + 1 };
  };

  const rel = [];
  for (let i = 0; i < pecas.length; i++) {
    const p = pecas[i];
    const dx = (i % COLUNAS) * LADO, dy = Math.floor(i / COLUNAS) * LADO;

    let fonte, sx = 0, sy = 0, sw, sh, limpar;
    if (p.de === 'folha') {
      fonte = bd; sw = LADO; sh = LADO;
      sx = (p.casa % COLS_BD) * LADO; sy = Math.floor(p.casa / COLS_BD) * LADO;
      /* MESMO A FOLHA DO BD PASSA. Ela veio normalizada, mas com ~1.000 px de
         resíduo azul da grade nas quinas — invisível a olho nu e fatal aqui: o
         aparo mediria o RESÍDUO em vez da bola, e a bola sairia menor dentro de
         um quadro cheio. Foi o que aconteceu na primeira tentativa da correção. */
      limpar = true;
    } else {
      const im = await carregar(p.dados);
      fonte = im;
      sw = im.naturalWidth; sh = im.naturalHeight;
      /* SÓ VETOR PASSA PELO REDIMENSIONAMENTO DE 192. Bitmap já vem na
         resolução que tem: rasterizar de novo só perderia nitidez. */
      if (p.de === 'nosso' && p.dados.startsWith('data:image/svg')) {
        /* Vetor: rasterizo grande e deixo o navegador reduzir com a qualidade
           dele. De 192 para 48 dá borda limpa; desenhar direto em 48 dá escada. */
        const A = 192;
        const escala = document.createElement('canvas');
        escala.width = A; escala.height = A;
        escala.getContext('2d').drawImage(im, 0, 0, A, A);
        fonte = escala; sw = A; sh = A;
      }
      limpar = true;
    }

    const cx = medir(fonte, sx, sy, sw, sh, limpar);
    if (!cx) { rel.push({ id: p.id, erro: 'peca vazia' }); continue; }

    const alvo = LADO * OCUPACAO;
    const esc = Math.min(alvo / cx.lw, alvo / cx.lh);
    const w = Math.round(cx.lw * esc), h = Math.round(cx.lh * esc);
    /* Quando limpei, o desenho sem fundo está no `tmp` e a origem é local;
       quando não limpei, leio da fonte e somo o deslocamento da casa. */
    const dest = limpar ? tmp : fonte;
    const ox = limpar ? cx.ax : sx + cx.ax;
    const oy = limpar ? cx.ay : sy + cx.ay;
    g.drawImage(dest, ox, oy, cx.lw, cx.lh,
      dx + Math.round((LADO - w) / 2), dy + Math.round((LADO - h) / 2), w, h);
    rel.push({ id: p.id, ocupa: Math.round(Math.max(w, h) / LADO * 100) });
  }

  /* Mede o resultado, para o relatório não ser "ficou bom" e sim um número. */
  const dd = g.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < rel.length; i++) {
    const cx0 = (i % COLUNAS) * LADO, cy0 = Math.floor(i / COLUNAS) * LADO;
    let op = 0, claro = 0;
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const k = ((cy0 + y) * c.width + (cx0 + x)) * 4;
      if (dd[k + 3] < 24) continue;
      op++;
      if (dd[k] > 205 && dd[k + 1] > 205 && dd[k + 2] > 205) claro++;
    }
    rel[i].opaco = Math.round(op / (LADO * LADO) * 100);
    rel[i].claro = op ? Math.round(claro / op * 100) : 0;
  }
  return { png: c.toDataURL('image/png'), linhas, rel };
}, { pecas, folhaBD, LADO, COLUNAS, OCUPACAO });

writeFileSync(join(RAIZ, 'assets/icones/itens-jogo.png'),
  Buffer.from(r.png.split(',')[1], 'base64'));
await b.close();

console.log(`${pecas.length} itens -> ${COLUNAS}x${r.linhas} de ${LADO}px -> assets/icones/itens-jogo.png\n`);
console.log('item          ocupa%  opaco%  claro%');
for (const x of r.rel)
  console.log(x.id.padEnd(12), String(x.ocupa ?? '-').padStart(6),
              String(x.opaco ?? '-').padStart(7), String(x.claro ?? '-').padStart(7),
              x.erro ? '  <- ' + x.erro : '');

/* O portão desta ferramenta. Ela existe para que TODA peça saia do mesmo
   tamanho; se a variação voltar, ela grita em vez de gravar em silêncio. */
const ocup = r.rel.map(x => x.ocupa).filter(Number.isFinite);
const faixa = Math.max(...ocup) - Math.min(...ocup);
console.log(`\nocupacao: ${Math.min(...ocup)}% a ${Math.max(...ocup)}% (variacao ${faixa} pp)`);
if (faixa > 14) {
  console.error('\nRECUSADO: as pecas sairam de tamanhos diferentes demais.\n' +
    'Foi este defeito que o dono viu na Ultra Ball - bola em 44% ao lado de ' +
    'pedra em 82%. Uma peca menor que as vizinhas nao e lida como "menor": e ' +
    'lida como pior.');
  process.exit(1);
}
