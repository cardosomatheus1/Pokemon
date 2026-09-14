/* OS HABITANTES DO BIOMA — os moradores que não interagem (camada 4).
 *
 * Separado do `idle-mundo.mjs` quando ele passou de 600 linhas pela segunda
 * vez, e de novo por responsabilidade: aquele arquivo é a CÂMERA e o ATOR; este
 * é o ELENCO DE FUNDO. A prova é que a câmera funciona sem este arquivo, e este
 * não sabe o que é zoom.
 *
 * Eles não andam: piscam, batem asa, respiram no lugar — e é por isso que o
 * quadro deles vem do RELÓGIO, enquanto o do treinador e o do companheiro vem
 * da DISTÂNCIA. A regra é a mesma dos dois lados: a fase segue aquilo que a
 * criatura de fato faz.
 *
 * QUEM habita cada bioma vem do ContentPack (§0.3). Este arquivo só sabe pôr
 * uma tira de quadros no lugar certo, com a profundidade certa.
 */
import { PACK } from './motor.mjs';
import { T } from './mundo.mjs';
import { vivos, molduraDe } from './vivos.mjs';
import { povoar, adornar, quadroDoHabitante, boiar } from './fauna.mjs';
import { decorar, recorteCel, LADO, LARGURA_FOLHA, ALTURA_FOLHA } from './decoracao.mjs';

/* SÃO ELEMENTOS, e não desenho no canvas, pelo mesmo motivo do companheiro:
   um deles (a árvore, a rocha) precisa ficar NA FRENTE do personagem, e
   profundidade por `z-index` é uma linha — por ordem de `drawImage` seria uma
   reordenação a cada quadro. */
/* A PASTA `alfa/` é a mesma arte COM O FUNDO TIRADO. Parte dos PNGs do cartucho
   guarda a cor de transparência como cor de verdade — no GBA quem decidia o que
   era vazio era o hardware, e não o arquivo. Sem isto, cada árvore de Cut
   aparece dentro de um quadrado ciano, e o Skitty numa caixa rosa. Metade do
   acervo já vem com alfa (os da expansão), o que confunde mais do que se
   estivessem todos errados. Ver `tools/chavear-overworld.mjs`. */
const OW_ARTE = '../assets/raw_githubusercontent_com/pret/pokeemerald/alfa';

let habitantes = [], adornos = [], decors = [];

export function prepararHabitantes(planta) {
  /* some com os do bioma anterior; sem isto a praia herda os moradores da
     floresta e ninguém entende por quê */
  for (const [k, v] of vivos) if (k !== 'comp') v.moldura.remove(), vivos.delete(k);
  habitantes = povoar(planta, PACK, T);
  adornos = adornar(planta, PACK, T);
  decors = decorar(planta, T);
}

/* ── O ANEL DE AGUA ────────────────────────────────────────────────────────
 *
 * O corpo sobe e desce; a agua fica no lugar e ABRE quando ele afunda. E essa
 * separacao que faz ler "dentro da agua" em vez de "em cima da agua" — sem
 * ela, um Slowpoke subindo e descendo parece um Slowpoke pulando, que e
 * exatamente a leitura que o dono reprovou quatro vezes no companheiro.
 *
 * ── TRES CAMADAS, E A PRIMEIRA E A QUE FAZ O TRABALHO ────────────────────
 *
 * A versao anterior tinha so os dois arcos claros, e MEDIDA na tela ela dava
 * 12 pixels claros num quadro inteiro: existia no codigo e nao existia no olho.
 * Foi a segunda metade do Q5 que pegou — a suite estava verde.
 *
 *   1. o POCO   uma elipse escura sob o corpo. E a agua deslocada, e e o que
 *               assenta o bicho DENTRO dela; sem ele os arcos ficam soltos e
 *               leem como decalque no chao
 *   2. a BORDA  o arco claro na linha da agua, onde o corpo entra
 *   3. a ONDA   um segundo arco, mais largo e mais fraco, que e o que se
 *               espalha — e o unico que muda de tamanho com a boia
 *
 * A cor nao e branco puro: e um branco puxado para o azul do ceu refletido.
 * Branco puro sobre agua GBA le como brilho de metal.
 *
 * Vai no canvas do ator, e nao no elemento: o anel e NOSSO desenho, e vale aqui
 * a mesma divisao do resto da cena — quem tem animacao propria vira elemento,
 * quem eu animo fica no canvas. */
function anel(g, cx, cy, raio) {
  g.save();

  /* 1 · O POCO — a agua que o corpo empurrou para baixo */
  g.fillStyle = 'rgba(8,26,44,.34)';
  g.beginPath();
  g.ellipse(cx, cy, raio * 0.78, raio * 0.30, 0, 0, Math.PI * 2);
  g.fill();

  /* 2 e 3 · A BORDA e a ONDA */
  g.lineWidth = 1;
  for (const [k, a] of [[0.74, 0.62], [1, 0.30]]) {
    g.strokeStyle = `rgba(214,240,255,${a})`;
    g.beginPath();
    g.ellipse(cx, cy, raio * k, raio * k * 0.36, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

/* ── AS PEÇAS DE DECORAÇÃO ─────────────────────────────────────────────────
 *
 * São ELEMENTOS, e não desenho no canvas, pela mesma razão dos habitantes: uma
 * parte delas precisa ficar NA FRENTE do personagem (a fogueira, o toco, o
 * boneco de neve), e profundidade por `z-index` é uma linha — por ordem de
 * `drawImage` seria uma reordenação a cada quadro.
 *
 * ── A ESCALA É O QUE RESOLVE A DIFERENÇA DE ERA ──────────────────────────
 *
 * A folha é 3DS: 64 px, sombreado suave. O cenário é GBA. Reduzidas a ~20 px
 * elas leem como PROP PRÉ-RENDERIZADO, que é coisa que a era GBA usava — o que
 * denuncia arte de outra era não é ela ser suave, é ela ser grande o bastante
 * para a suavidade aparecer.
 *
 * Por isso `image-rendering: auto` AQUI e só aqui: `pixelated` numa redução de
 * 64 para 20 px joga fora dois terços das linhas e devolve serrilhado sujo. O
 * chão continua duro; o prop reduzido, não.
 *
 * ── E CADA UMA TEM SOMBRA ────────────────────────────────────────────────
 *
 * A mesma lição da sucata, e ela é a diferença entre a peça estar NA cena e
 * estar SOBRE ela: sem sombra, arte suave sobre pixel duro lê como adesivo.
 * As de chão (`chao`) não têm — elas SÃO chão, e sombra de chão sobre chão é
 * uma mancha sem causa.
 */
/* A versao CHAVEADA: a folha original tem a grade teal desenhada nela, e
   recortada crua cada peca sai com risco verde na borda. Ver
    — o interior das celulas ja vinha com alfa; so a
   grade era opaca. */
const DECOR_FOLHA = '../assets/icones/decor-amie-alfa.png';

function desenharDecor(g, cam, escala, yTreinador) {
  for (const [i, d] of decors.entries()) {
    const v = molduraDe('d' + i, DECOR_FOLHA);
    if (!v) continue;
    const r = recorteCel(d.cel);
    const k = d.tam / LADO;
    const L = d.tam * escala;

    /* a sombra vai no canvas, sob a peça — quem não é chão a recebe */
    if (!d.chao && g) {
      g.globalAlpha = 0.28;
      g.fillStyle = '#000';
      g.beginPath();
      g.ellipse(d.x - cam.x, d.y - cam.y - 1, d.tam * 0.30, d.tam * 0.13, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }

    v.moldura.style.display = '';
    v.moldura.style.width = L + 'px';
    v.moldura.style.height = L + 'px';
    v.moldura.style.transform =
      `translate(${(d.x - cam.x) * escala - L / 2}px, ${(d.y - cam.y) * escala - L}px)`;
    /* CHÃO fica atrás de tudo; o resto usa a mesma profundidade por Y do resto
       da cena, e `frente` força a peça a passar na frente dos pés. */
    v.moldura.style.zIndex = d.chao ? 0 : (d.frente || d.y > yTreinador ? 4 : 1);
    v.img.style.width = (LARGURA_FOLHA * k * escala) + 'px';
    v.img.style.height = (ALTURA_FOLHA * k * escala) + 'px';
    v.img.style.marginLeft = (-r.x * k * escala) + 'px';
    v.img.style.marginTop = (-r.y * k * escala) + 'px';
    v.img.style.imageRendering = 'auto';
    v.img.style.animation = 'none';
  }
}

export function desenharHabitantes(g, cam, escala, t, yTreinador) {
  for (const [i, h] of habitantes.entries()) {
    const v = molduraDe('h' + i, `${OW_ARTE}/${h.arq}.png`);
    if (!v || !v.folha) continue;
    const quadros = Math.max(1, Math.round(v.folha.w / h.qw));
    const q = quadroDoHabitante(h, t, quadros);
    const Lt = h.qw * escala, At = h.qh * escala;
    /* QUEM ESTA NO LAGO BOIA, e a agua reage em contrafase. Ver `boiar`. */
    const { dy, raio } = boiar(h, t);
    if (h.boia && g) anel(g, h.x - cam.x, h.y - cam.y - 2, raio);
    v.moldura.style.display = '';
    v.moldura.style.width = Lt + 'px';
    v.moldura.style.height = At + 'px';
    v.moldura.style.transform =
      `translate(${(h.x - cam.x) * escala - Lt / 2}px, ${(h.y + dy - cam.y) * escala - At}px)`;
    v.moldura.style.zIndex = h.y <= yTreinador ? 1 : 3;
    v.img.style.width = (Lt * quadros) + 'px';
    v.img.style.height = At + 'px';
    v.img.style.marginLeft = (-q * Lt) + 'px';
    v.img.style.marginTop = '0px';
    v.img.style.animation = 'none';
  }
  for (const [i, a] of adornos.entries()) {
    const v = molduraDe('a' + i, `${OW_ARTE}/${a.arq}.png`);
    if (!v || !v.folha) continue;
    const quadros = Math.max(1, Math.round(v.folha.w / a.qw));
    const Lt = a.qw * escala, At = a.qh * escala;
    v.moldura.style.display = '';
    v.moldura.style.width = Lt + 'px';
    v.moldura.style.height = At + 'px';
    v.moldura.style.transform =
      `translate(${(a.x - cam.x) * escala}px, ${(a.y - cam.y) * escala - At}px)`;
    /* O PROP NA FRENTE é o que dá profundidade — em overworld de verdade alguma
       coisa sempre passa na frente dos pés. */
    v.moldura.style.zIndex = a.frente ? 4 : 1;
    v.img.style.width = (Lt * quadros) + 'px';
    v.img.style.height = At + 'px';
    v.img.style.marginLeft = '0px';
    v.img.style.marginTop = '0px';
    v.img.style.animation = 'none';
  }

  desenharDecor(g, cam, escala, yTreinador);
}

