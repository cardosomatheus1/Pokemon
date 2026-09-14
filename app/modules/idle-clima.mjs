/* O CLIMA NA CENA — o desenho, e só ele.
 *
 * Toda a aritmética mora em `clima-particulas.mjs`, camada 0. Aqui só existe
 * `ctx.fillRect` e `ctx.arc`, e isso é deliberado: o que estiver escrito neste
 * arquivo só pode ser conferido com um navegador aberto, e o projeto já pagou
 * seis defeitos plantados escapando do portão por essa razão exata.
 *
 * ── E A COORDENADA É A DO CANVAS ─────────────────────────────────────────
 *
 * O D-092 é de ontem e custou três dias ao dono: o estouro do golpe era
 * posicionado em pixels de TELA — `(x - cam.x) * escala` — e pintado num canvas
 * que mede o MUNDO. Com o zoom em 3x, tudo caía ao triplo da distância da
 * câmera, fora da janela. E o contador dizia "413 desenhos".
 *
 *   > Contador conta CHAMADA. Ele não olha para a tela.
 *
 * Aqui não há conversão nenhuma a errar: a partícula nasce em coordenadas da
 * JANELA (0..W, 0..H), que é exatamente o espaço do canvas. Não é sorte — é a
 * razão de `particulasDe` receber largura e altura em vez de posição de mundo.
 *
 * ── E ELE NÃO ACOMPANHA A CÂMERA, DE PROPÓSITO ───────────────────────────
 *
 * Chuva presa ao mundo desliza quando o treinador anda, e lê como textura de
 * chão em movimento. Chuva presa à JANELA cai reta enquanto o mundo passa por
 * trás — que é como chuva se comporta para quem está debaixo dela.
 */
import { particulasDe, veuDe, ehTipo } from './clima-particulas.mjs';

/* ── O VÉU, POR BAIXO DOS ATORES ──────────────────────────────────────────
 *
 * No canvas do MUNDO, antes de tudo o que se mexe. É a decisão que a Arena já
 * tomou e o comentário de lá explica: os lutadores continuam legíveis porque a
 * cor passa por baixo deles. Um véu por cima escurece o próprio bicho, e o
 * jogador perde o que veio ver. */
export function veuDoClima(g, tipo, W, H) {
  if (!g || !ehTipo(tipo)) return false;
  const cor = veuDe(tipo);
  if (!cor) return false;
  g.save();
  g.fillStyle = cor;
  g.fillRect(0, 0, W, H);
  g.restore();
  return true;
}

/* ── AS PARTÍCULAS, POR CIMA DE TUDO ──────────────────────────────────────
 *
 * Chuva, neve e vento caem NA FRENTE dos lutadores — de novo a decisão da
 * Arena, e de novo porque é assim na vida real. O sol e a névoa são luz e não
 * corpo, então eles entram com `lighter` e `soft` em vez de traço.
 *
 * Devolve QUANTAS foram desenhadas. É o número que a esteira lê, e ele existe
 * porque "a função rodou" não é a mesma pergunta que "saiu pixel" — foi
 * exatamente essa confusão que custou o 1.27c inteiro. */
export function desenharClima(g, tipo, W, H, t) {
  if (!g || !ehTipo(tipo)) return 0;
  const ps = particulasDe(tipo, t, W, H);
  if (!ps.length) return 0;

  g.save();
  let n = 0;

  if (tipo === 'sol') {
    g.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(255,225,150,${p.a})`);
      grad.addColorStop(1, 'rgba(255,225,150,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      n++;
    }
  } else if (tipo === 'nevoa') {
    for (const p of ps) {
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(170,110,200,${p.a * 0.5})`);
      grad.addColorStop(1, 'rgba(170,110,200,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      n++;
    }
  } else if (tipo === 'vento') {
    g.lineCap = 'round';
    for (const p of ps) {
      g.strokeStyle = `rgba(230,245,235,${p.a})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(p.x, p.y);
      /* A INCLINAÇÃO VEM DA FASE, e não é fixa: rajadas todas paralelas leem
         como listras de interface, e não como ar em movimento. */
      g.lineTo(p.x + p.r, p.y + p.r * p.v * 0.2);
      g.stroke();
      n++;
    }
  } else if (tipo === 'chuva') {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(180,215,255,0.55)';
    g.lineWidth = 1.1;
    for (const p of ps) {
      g.globalAlpha = p.a;
      g.beginPath();
      /* A GOTA CAI INCLINADA porque cair reta lê como estática de TV. O
         deslocamento é proporcional ao comprimento, então gota longa (rápida)
         inclina mais — que é o que a velocidade faz de verdade. */
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.r * 0.25, p.y + p.r);
      g.stroke();
      n++;
    }
    g.globalAlpha = 1;
  } else {                      /* neve e pólen: corpo redondo */
    const cor = tipo === 'neve' ? '255,255,255' : '245,225,120';
    for (const p of ps) {
      g.fillStyle = `rgba(${cor},${p.a})`;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      n++;
    }
  }

  g.restore();
  desenhadas += n;
  return n;
}

/* ── E O CONTADOR QUE A ESTEIRA LÊ ────────────────────────────────────────
 *
 * Ele NÃO prova que o clima aparece — o D-092 é a prova de que contador não
 * prova nada disso. Ele responde outra pergunta, e essa sim é útil: a cena
 * chegou a chamar o desenho? Zero aqui com clima sorteado quer dizer que a
 * ligação quebrou, e três zeros juntos foi o que salvou o D-089.
 *
 * Quem afirma que saiu PIXEL é o teste de camada 0 sobre `particulasDe` mais a
 * foto que a esteira tira. Os dois, e nunca este número sozinho. */
let desenhadas = 0;
export const contagemDoClima = () => desenhadas;
export const zerarContagemDoClima = () => { desenhadas = 0; };
