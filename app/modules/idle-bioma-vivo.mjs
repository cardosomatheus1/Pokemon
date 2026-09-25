/* O QUE O BIOMA FAZ SOZINHO — cachoeira, luz e detalhe vivo (camada 4).
 *
 * Saiu do `idle-mundo.mjs` quando ele passou de 600 linhas pela quarta vez, e a
 * divisão é por RESPONSABILIDADE — que aqui cai numa linha limpa:
 *
 *     idle-mundo        A JANELA e os ATORES — câmera, zoom, altura, o
 *                       treinador, o companheiro, os selvagens
 *     idle-bioma-vivo   O LUGAR — o que se mexe sem que ninguém peça: a água
 *                       correndo, a espuma, os pontos de luz
 *
 * A prova de que a linha é de responsabilidade e não de tamanho: nada aqui sabe
 * de run, de cena, de criatura nem de jogador. Entra a planta e o instante, sai
 * pintura.
 *
 * ── E ELE É O ARQUIVO QUE A REGRA PERMANENTE DO PROJETO PROTEGE ──────────
 *
 * O `CLAUDE.md` tem uma regra que é do dono e não tem prazo:
 *
 *   > "a intenção sempre o cenário de bioma idle se parecer o mais vivo
 *   >  possível — pense que muitas pessoas vão largar por horas nessa tela"
 *
 * É este arquivo. Todo bloco que passa perto dele procura uma melhoria, mesmo
 * que o escopo seja outro — e ter isso num lugar só, com o porquê ao lado, é o
 * que impede a próxima de ser procurada em três.
 */
import { T } from './mundo.mjs';
/* As PARTÍCULAS são a vida do lugar — folha, poeira, fagulha. Elas vieram
   junto porque quem as semeia e move é este arquivo. */
import { vidaDe, semear, mover, opacidade, mistura, VIDA_QUE_BRILHA } from './particulas.mjs';

/* A SEMENTE DO BIOMA: cada lugar tem a própria vida, e ela não pode mudar
   quando o relógio muda. Copiada do `idle-mundo.mjs` na divisão — uma linha, e
   importá-la de lá criaria um ciclo entre os dois. */
const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 131, 7) >>> 0;
import { veiaEm } from './relevo.mjs';

/* ══ A VIDA DO BIOMA, DESENHADA ════════════════════════════════════════════
 *
 * As partículas vivem em coordenadas de MUNDO, e não de tela. É o que faz elas
 * ficarem paradas em relação ao chão quando a câmera anda — vaga-lume que
 * acompanha a câmera não é vaga-lume, é sujeira na lente.
 *
 * O QUE ELAS SÃO está em `particulas.mjs`, que roda em Node e tem teste. Aqui
 * só se pinta o que aquele módulo respondeu, como no resto deste arquivo. */
let vidaPs = null, vidaTipo = null, vidaArea = null, vidaAnterior = 0;

export function prepararVida(planta) {
  vidaTipo = vidaDe(planta.bioma);
  vidaArea = { largura: planta.cols * T, altura: planta.rows * T,
               margem: planta.margem * T };
  vidaPs = semear(sementeDe(planta.bioma), vidaTipo, vidaArea);
  vidaAnterior = 0;
}

function pontoDeLuz(g, x, y, P, forca = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, 7 * forca);
  gr.addColorStop(0, P.luz); gr.addColorStop(1, 'transparent');
  g.fillStyle = gr;
  g.fillRect(x - 8, y - 8, 16, 16);
  g.fillStyle = P.luzNucleo;
  g.fillRect(x, y, 1, 1);
}

/* ── A CACHOEIRA CORRE ─────────────────────────────────────────────────────
 *
 * Palavra do dono: *"criar vida e movimento para as cachoeiras, uma cachoeira
 * estática não é uma cachoeira"*. Ele tem razão, e o motivo é mais forte que
 * estética: água é a única coisa numa cena que o olho SABE que se move. Parada,
 * ela não lê como água mal desenhada — lê como pedra azul.
 *
 * ── POR QUE ELA NÃO PODIA SE MEXER ANTES ─────────────────────────────────
 *
 * O mundo é pintado UMA VEZ por bioma, fora da tela, e copiado a cada quadro:
 * repintar 1.232 tiles por quadro para desenhar uma janela de 300 seria pagar o
 * chão inteiro para animar uma coluna. A cachoeira nasceu ali dentro, junto do
 * chão, e por isso herdou o congelamento.
 *
 * A divisão que este projeto já usa resolve sozinha: **quem tem animação
 * própria vira elemento; quem eu animo fica no canvas** — e o canvas certo é o
 * que roda a cada quadro, não o que é pintado uma vez.
 *
 * Então a cachoeira ficou partida em duas, e a partição é a mesma que a fauna
 * já tem: a PEDRA, a lâmina e o corpo continuam no mundo pintado (não mudam); as
 * VEIAS e a espuma da poça saem de lá e passam a ser desenhadas por quadro.
 *
 * ── O MOVIMENTO É DESLIZAMENTO, E NÃO PARTÍCULA ──────────────────────────
 *
 * Gota que cai seria o caminho óbvio e é o errado num pixel art de 16 px: em
 * escala de cartucho a gota some. O que lê como água correndo é a VEIA CLARA
 * deslizando para baixo e reentrando por cima — o mesmo truque das cachoeiras
 * do GBA, e o mesmo que faz uma esteira parecer esteira.
 *
 * A espuma da poça pulsa em contrafase às veias: quando a veia chega embaixo, a
 * poça abre. É a mesma contrafase do bicho que boia no lago, pelo mesmo motivo —
 * em fase, os dois viram um pulso só e a água some da leitura.
 */
/* A GEOMETRIA DA VEIA MORA EM `relevo.mjs`, camada 0 — foi a extracao que a
   tornou afirmavel, do mesmo jeito que o piso do zoom. Aqui fica so o traco. */
export const ESPUMA_MS = 1400;

/* ── A PLANTA ENTRA POR ARGUMENTO (D-089) ────────────────────────────────
 *
 * Na divisão, estas funções ficaram lendo o `plantaAtual` do `idle-mundo.mjs` —
 * uma `let` de módulo que não veio junto. O resultado foi `plantaAtual is not
 * defined` a cada quadro, e a cena inteira parou: zero placas, zero números,
 * zero efeitos.
 *
 * E a suíte ficou VERDE. O `test/origem` varre símbolos CHAMADOS — `foo(...)` —
 * e não variáveis apenas LIDAS, então o buraco passou pelo portão que existe
 * exatamente para essa classe de erro.
 *
 *   > Estado de módulo lido de fora é acoplamento invisível: ele não aparece em
 *   > nenhum `import`, então nenhuma varredura o segue quando o arquivo se
 *   > divide.
 *
 * A correção não é reexportar a variável: é o pintor RECEBER o que ele pinta.
 * Assim a dependência fica escrita na assinatura, e a próxima divisão não tem
 * como perdê-la. */
export function cachoeirasVivas(g, cam, t, planta) {
  const plantaAtual = planta;
  if (!plantaAtual) return;
  const P = plantaAtual.paleta;
  const AGC = P.cascataClaro ?? P.massaClaro;
  const ESP = P.cascataEspuma ?? P.espuma;

  for (const a of (plantaAtual.relevo ?? [])) {
    if (a.forma !== 'cachoeira') continue;
    const meio = a.x + a.w / 2;
    const x0 = Math.round(meio - cam.x), y0 = Math.round(a.y - cam.y);
    if (x0 < -60 || x0 > 900) continue;

    /* AS VEIAS. Três colunas fora do centro, cada uma com a própria fase — em
       fase elas viram uma barra descendo, que é um elevador e não uma queda. */

    for (const [k, desl, larg, alpha] of [[0, -0.26, 1, 0.34], [1, 0.19, 1, 0.28], [2, 0, 2, 0.6]]) {
      const { yA, yB, visivel } = veiaEm(a, k, t);
      if (!visivel) continue;
      g.globalAlpha = alpha;
      g.fillStyle = AGC;
      const largFaixa = a.w * (1 + 0.35 * (yA / Math.max(1, a.h)));
      g.fillRect(Math.round(x0 + largFaixa * desl), Math.round(y0 + yA),
                 larg, Math.ceil(yB - yA));
    }
    g.globalAlpha = 1;

    /* A POÇA, em contrafase: mais aberta quando a veia bate embaixo. */
    const pulso = 0.5 - 0.5 * Math.cos(2 * Math.PI * ((t / ESPUMA_MS) % 1));
    const base = y0 + a.h, largBase = a.w * 1.35;
    for (const [k, alpha] of [[0.62, 0.55], [0.95, 0.32], [1.3, 0.16]]) {
      g.globalAlpha = alpha * (0.7 + 0.3 * pulso);
      g.fillStyle = ESP;
      g.beginPath();
      g.ellipse(x0, base + k * 2, largBase * k * (0.9 + 0.18 * pulso),
                3 + k * 1.6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

/* ── A LUZ DO LUGAR ATRAVESSA A NOITE (1.34) ──────────────────────────────
 *
 * Chamada DEPOIS da tinta da hora, no canvas de cima, e é essa ordem que a
 * primeira tentativa errou: a tinta vinha por cima de tudo, e a noite apagava
 * justamente o vaga-lume e a brasa — o que o dono pediu que ficasse MAIS forte.
 *
 * Aqui só as vidas que SÃO luz (`VIDA_QUE_BRILHA`, camada 0) ganham um halo em
 * `lighter`, na mesma posição em que o `desenharVida` as pôs neste quadro. A
 * intensidade vem de fora — `brilhoNoturno`, também camada 0 —, e de dia ela é
 * zero: o cenário diurno que o dono aprovou não muda um pixel.
 *
 * O halo é desenhado aqui e não pelo `pontoDeLuz`, de propósito: aquele pinta
 * num quadrado fixo de 16 px, e um raio maior que 8 sai CORTADO em quadrado —
 * exatamente o tipo de defeito que só aparece para quem olha.
 *
 * Devolve quantos halos saíram. "A função rodou" e "saiu pixel" são perguntas
 * diferentes — foi essa confusão que custou o 1.27c. */
/* A planta do último quadro, para o halo usar a MESMA cor de luz do bioma. */
let plantaVida = null;
export function brilhoDaVida(g, cam, W, H, t, intensidade) {
  if (!g || !vidaPs || !(intensidade > 0) || !VIDA_QUE_BRILHA.has(vidaTipo)) return 0;
  /* Medido olhando a captura da 1h: com 9 + 7 e alfa 0,75 os halos existiam e
     sumiam no escuro — liam como sujeira clara, não como luz. O dono pediu
     o efeito MAIS FORTE à noite, e fraco não é mais forte. */
  const raio = 10 + 10 * intensidade;
  let n = 0;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const p of vidaPs) {
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
    if (x < -raio || y < -raio || x > W + raio || y > H + raio) continue;
    const a = opacidade(p, vidaTipo, t, vidaArea);
    if (a <= 0.05) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, raio);
    const P = plantaVida?.paleta;
    gr.addColorStop(0, P?.luz ?? 'rgba(255,240,180,.8)');
    gr.addColorStop(1, 'transparent');
    g.globalAlpha = Math.min(1, a * 1.0 * intensidade);
    g.fillStyle = gr;
    g.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    n++;
  }
  g.restore();
  return n;
}

export function desenharVida(g, cam, W, H, t, planta) {
  plantaVida = planta;
  const plantaAtual = planta;
  if (!vidaPs || !plantaAtual) return;
  const P = plantaAtual.paleta;
  /* `dt` em quadros de 60 Hz: sem isto a cena corre ao dobro num monitor de
     144 Hz, e é o tipo de defeito que só aparece na máquina do outro. */
  const dt = vidaAnterior ? Math.min(3, (t - vidaAnterior) / 16.67) : 1;
  vidaAnterior = t;
  mover(vidaPs, vidaTipo, vidaArea, t, dt);

  for (const p of vidaPs) {
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
    if (x < -12 || y < -12 || x > W + 12 || y > H + 12) continue;   // fora da câmera
    const a = opacidade(p, vidaTipo, t, vidaArea);
    if (a <= 0.01) continue;
    g.globalAlpha = Math.min(1, a);
    if (vidaTipo === 'arco') {
      /* O ARCO ESTALA: uma linha quebrada de cinco segmentos, e não um ponto.
         Ele é a única vida que desenha FORMA, porque eletricidade tem direção. */
      g.strokeStyle = P.luzNucleo; g.lineWidth = 1;
      let cx = x, cy = y;
      for (let k = 0; k < 5; k++) {
        const nx = cx + (mistura(Math.round(t / 90) + k, p.f * 1000 | 0) - 0.5) * 9;
        const ny = cy - 3 - mistura(k, Math.round(t / 90)) * 4;
        g.beginPath(); g.moveTo(cx | 0, cy | 0); g.lineTo(nx | 0, ny | 0); g.stroke();
        cx = nx; cy = ny;
      }
      pontoDeLuz(g, x, y, P, 1.1);
    } else if (vidaTipo === 'brasa') {
      g.fillStyle = a > 0.5 ? P.luzNucleo : P.acento;
      g.fillRect(x, y, 1, 1);
      g.globalAlpha = a * 0.5;
      pontoDeLuz(g, x, y, P, 0.5);
    } else if (vidaTipo === 'neve' || vidaTipo === 'polen') {
      g.fillStyle = vidaTipo === 'neve' ? P.luzNucleo : P.acento;
      g.fillRect(x, y, 1, 1);
    } else if (vidaTipo === 'poeira') {
      g.fillStyle = P.claro;
      g.fillRect(x, y, 2, 1);
    } else if (vidaTipo === 'bolha') {
      g.fillStyle = P.espuma; g.fillRect(x, y, 1, 1);
      g.fillStyle = P.luzNucleo; g.fillRect(x + 1, y - 1, 1, 1);
    } else {
      pontoDeLuz(g, x, y, P, vidaTipo === 'esporo' ? 0.55 : 0.8);
    }
    g.globalAlpha = 1;
  }

  /* A ÁGUA ANDA. Duas linhas de reflexo que deslizam — é o movimento que faz o
     olho aceitar que aquilo é líquido. Sem isso a água é uma faixa azul, e uma
     faixa azul parada lê como parede. */
  const MARG = vidaArea.margem, MW = vidaArea.largura;
  g.globalAlpha = 0.35;
  g.fillStyle = P.massaClaro;
  for (let wy = MARG + 8; wy < vidaArea.altura; wy += 11) {
    const off = (t / 34 + wy * 7) % (MW + 40) - 20;
    g.fillRect(Math.round(off - cam.x), wy - cam.y, 9, 1);
    g.fillRect(Math.round(((off + MW / 2) % MW) - cam.x), wy + 4 - cam.y, 6, 1);
  }
  g.globalAlpha = 1;
}
