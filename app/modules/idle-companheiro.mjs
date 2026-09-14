/* O POKEMON QUE ANDA COM O JOGADOR (camada 4).
 *
 * Separado do idle-mundo.mjs quando ele passou de 600 linhas pela terceira vez.
 * A divisao e por responsabilidade: aquele arquivo e a CAMERA e o CHAO; este e
 * UM ATOR, com folha propria, grade propria e regra propria de alinhamento.
 *
 * A prova de que sao coisas diferentes esta no historico: este arquivo mudou de
 * fonte de arte quatro vezes (PokeAPI moderno, GBA estatico, GIF animado, folha
 * de caminhada do PMDCollab) sem que a camera precisasse saber de nada.
 */
import { $ } from './dom.mjs';
import { PACK } from './motor.mjs';
import { gradeDe } from './caminhada-dados.mjs';
import { vivos, molduraDe, sondarFolha } from './vivos.mjs';
import { animDoMomento, aSondar, marcarFolha } from './folha-viva.mjs';

/* A MESMA PASTA QUE A ARENA USA. Endereco de arte e tema, e usar o mesmo
   garante que o idle nunca mostre uma criatura com desenho diferente. */
const PMD_SPRITE = '../assets/raw_githubusercontent_com/PMDCollab/SpriteCollab/master/sprite';

/* Quem acompanha vem de FORA. Ler a equipe daqui faria este arquivo conhecer o
   estado do idle, e ai ele deixaria de ser um ator e viraria mais uma copia da
   regra — que e o que a divisao existe para evitar. */
let dexAcompanhando = null;
export function acompanhar(dex) { dexAcompanhando = dex; }

/* QUEM A CENA ESTA DESENHANDO AGORA, exposto para o portao Q5 poder afirmar
   sobre isso. Sem ele, a unica forma de testar "a sprite do bioma e a do
   Pokemon que foi a campo" seria comparar pixels de sprite — e comparar pixels
   responde "mudou?" e nao "e o certo?". */
export const quemAcompanha = () => dexAcompanhando;

/* A SOMBRA e desenhada no canvas por quem chama, porque ela precisa ficar
   DEBAIXO da criatura sem depender de z-index. */
export function esconder(chave) {
  const v = vivos.get(chave);
  if (v) v.moldura.style.display = 'none';
}
/* ══ O POKÉMON QUE ANDA JUNTO ══════════════════════════════════════════════
 *
 * ── TRÊS TENTATIVAS ERRADAS, E POR QUE CADA UMA ERROU ────────────────────
 *
 * O dono teve de repetir a mesma coisa quatro vezes. Vale escrever por que eu
 * não ouvi, para não repetir:
 *
 *   1. SPRITE MODERNO DO POKEAPI, estático, 32×32 num quadro com moldura
 *      transparente. "não da nem pra ver, ta parecendo que o treinador cagou o
 *      bulbassauro". Era arte de outra era, e pequena demais.
 *
 *   2. SPRITE DE GBA + PULO INVENTADO POR MIM. "todo pokémon é um sapo? ou um
 *      canguru??" — eu impus UM movimento a criaturas que têm movimentos
 *      próprios.
 *
 *   3. GIF ANIMADO DA ARENA. "VOCÊ CONTINUA TRAZENDO UM GIF SE BALANÇANDO."
 *      Certo de novo: o GIF de batalha foi desenhado para uma criatura PARADA
 *      num campo de batalha. Ele respira no lugar. Nenhum ajuste de tamanho
 *      transforma um retrato que balança num bicho que caminha.
 *
 * ── O QUE A PRÉVIA USAVA, E ESTAVA NO REPOSITÓRIO O TEMPO TODO ───────────
 *
 * `Walk-Anim.png` do PMDCollab: folha de **8 linhas × 4 colunas**. Cada linha é
 * uma direção — baixo, baixo-dir, dir, cima-dir, cima, cima-esq, esq, baixo-esq
 * — e cada coluna é um quadro do passo. Vista de cima, com direção, feita para
 * andar. É exatamente o que o treinador tem, para a outra metade da cena.
 *
 * As 146 folhas estão em disco (`tools/baixar-caminhada.mjs`).
 *
 * ── O TAMANHO DO QUADRO SAI DA FOLHA ─────────────────────────────────────
 *
 * `largura/4` e `altura/8`. A prévia tinha uma tabela de setenta linhas escrita
 * à mão com o tamanho de cada espécie — e uma tabela dessas dessincroniza no
 * dia em que uma folha nova chegar com outro tamanho. Aqui não há tabela.
 *
 * ── E É UM ELEMENTO, NÃO UM DESENHO ──────────────────────────────────────
 *
 * Pelo mesmo motivo do bloco anterior: quem tem animação própria vira elemento.
 * Aqui a animação é um `steps(4)` de CSS sobre `background-position-x`, que o
 * navegador toca sozinho — e PARA quando a criatura para, coisa que um GIF não
 * sabe fazer.
 */
const DIR_PMD = { baixo: 0, dir: 2, cima: 4, esq: 6 };

/* A PATA ALTERNA A CADA 7 px DE CHÃO. O treinador usa 8 e tem duas poses; a
   criatura tem de três a oito, entao um passo um pouco mais curto distribui os
   quadros sem a caminhada virar corrida. */
const PASSO_BICHO = 7;

/* ── ONDE FICAM OS PÉS DENTRO DO QUADRO ───────────────────────────────────
 *
 * O quadro do PMD tem FOLGA embaixo. Ela existe porque a mesma grade serve
 * animações em que a criatura sobe — um ataque, um pulo — e o desenho parado
 * fica na parte de cima do quadro.
 *
 * Posicionando pelo fundo do QUADRO, os pés ficam flutuando e a sombra aparece
 * solta lá embaixo. Foi o que o dono viu: "os pokémon tem sobra embaixo".
 *
 * A correção é medir onde o desenho realmente termina — uma vez por espécie —
 * e alinhar por AÍ. A mesma medida dá a largura real, que é o tamanho certo da
 * sombra: um Onix não pode ter a sombra de um Diglett. */
const pesDe = new Map();

function caixaDoQuadro(img, fw, fh) {
  const c = document.createElement('canvas');
  c.width = fw; c.height = fh;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);   // quadro 0 da linha 0
  let x0 = fw, x1 = -1, y1 = -1;
  try {
    const d = g.getImageData(0, 0, fw, fh).data;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++)
      if (d[(y * fw + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
  } catch { /* canvas manchado: cai no quadro inteiro */ }
  if (x1 < 0) return { base: fh - 1, larg: fw, meio: fw / 2 };
  return { base: y1, larg: x1 - x0 + 1, meio: (x0 + x1 + 1) / 2 };
}

/* As três folhas que o PMD publica, na chave curta que a cena usa. Uma tabela
   e não um `if`: quando a folha de "dormindo" entrar (o bicho parado por
   horas na tela de fundo), ela é uma linha aqui e nada mais. */
const ANIM_DO_COMBATE = { w: 'Walk', a: 'Attack', h: 'Hurt' };

export function desenharCompanheiro(g, p, cam, dirTreinador, escala, sombra) {
  const dex = dexAcompanhando;
  if (dex == null) { esconder('comp'); return null; }
  const grade = gradeDe(dex);
  if (!grade) { esconder('comp'); return null; }
  const id = String(dex).padStart(4, '0');
  /* ── A FOLHA DO MOMENTO, e não sempre a de caminhada ───────────────────
     Correção do dono: *"não consigo visualizar os ataques do meu pokémon"*.

     Ele passava a luta inteira na folha de CAMINHADA — andava no lugar
     enquanto o HP do topo caía. A posição vem de fora (`posicaoDoMeu`), e
     agora a ANIMAÇÃO vem junto: quem sabe se ele está batendo é a batalha,
     não o desenhador.

     Fora do duelo `p.anim` não vem, e o padrão é o de sempre — nenhum
     caminho antigo muda de significado. */
  /* ── E ELA SÓ ENTRA SE CARREGOU (D-091) ────────────────────────────
     O MESMO defeito que fazia o selvagem sumir valia aqui, e pela mesma
     razão: `ANIM_DO_COMBATE[p.anim]` traduz a chave, e traduzir não é
     conferir. Setenta espécies não tinham `Attack-Anim.png` em disco, e o
     companheiro do jogador — o bicho que ele escolheu — sumia exatamente no
     golpe dele. A decisão mora em `folha-viva.mjs`, e é a mesma para os dois
     lados da luta: duas regras para o mesmo sumiço seriam dois consertos. */
  const urlDaAnim = k => `${PMD_SPRITE}/${id}/${ANIM_DO_COMBATE[k]}-Anim.png`;
  const disponiveis = { w: true, a: true, h: true };
  for (const u of aSondar(disponiveis, urlDaAnim)) sondarFolha(u, marcarFolha);
  const chave = animDoMomento(
    { batendo: p.anim === 'a', apanhando: p.anim === 'h' }, disponiveis, urlDaAnim);
  const anim = ANIM_DO_COMBATE[chave] ?? 'Walk';
  const v = molduraDe('comp', urlDaAnim(chave));
  if (!v || !v.folha) { esconder('comp'); return null; }
  v.moldura.style.display = '';

  /* O QUADRO VEM DA TABELA GERADA, e o NÚMERO DE COLUNAS vem da folha dividida
     por ele. Foi o erro que custou uma rodada: assumir quatro colunas para todo
     mundo mostrava um quadro e meio por janela — dois Bulbasaurs colados. */
  const { fw, fh, ticks } = grade;
  const colunas = Math.max(1, Math.round(v.folha.w / fw));

  if (!pesDe.has(dex)) pesDe.set(dex, caixaDoQuadro(v.img, fw, fh));
  const pes = pesDe.get(dex);

  const Lt = fw * escala, At = fh * escala;
  /* A SOMBRA ACOMPANHA A LARGURA REAL e fica sob os PÉS, não sob o quadro. */
  sombra(g,
    Math.round(p.x - cam.x + (pes.meio - fw / 2)),
    Math.round(p.y - cam.y),
    pes.larg * 0.42);

  /* A DIREITA NÃO É ESPELHADA AQUI. A folha do PMD TEM as oito direções, e usar
     a linha certa sai melhor: um Charmander espelhado põe a chama do rabo no
     lado errado, e um Machop troca o braço que ele levanta. */
  const linha = DIR_PMD[p.dir] ?? 0;
  v.moldura.style.width = Lt + 'px';
  v.moldura.style.height = At + 'px';
  /* alinhado pelos PÉS: o fundo do quadro fica ABAIXO do chão, na medida exata
     da folga que aquela espécie tem */
  v.moldura.style.transform =
    `translate(${(p.x - cam.x) * escala - (pes.meio * escala)}px, ` +
    `${(p.y - cam.y) * escala - (pes.base + 1) * escala}px)`;
  v.img.style.width = (Lt * colunas) + 'px';
  v.img.style.height = (At * 8) + 'px';
  v.img.style.marginTop = (-linha * At) + 'px';
  /* O QUADRO SAI DA DISTÂNCIA PERCORRIDA — e não de uma animação de CSS.
   *
   * A animação declarativa não pegou, e mesmo se pegasse estaria errada: ela
   * corre no relógio, e no relógio a pata e o chão andam em ritmos
   * independentes. É o mesmo defeito dos pulinhos do treinador, e a mesma
   * correção — que este arquivo já aplica ao treinador desde o 1.5c.
   *
   * Dirigir o quadro daqui também resolve o que o dono continuava vendo — "o
   * Pokémon precisa mexer as patinhas igual o boneco treinador se mexe": parado
   * o bicho fica no quadro 0, andando ele troca de pata a cada `PASSO_BICHO`
   * pixels de chão. Nada de estado, nada de `animationPlayState`, nada que
   * dependa do navegador querer tocar uma animação. */
  const quadro = p.andando
    ? Math.floor(p.distancia / PASSO_BICHO) % colunas
    : 0;
  v.img.style.marginLeft = (-quadro * Lt) + 'px';
  v.img.style.animation = 'none';
  return p.y;
}

