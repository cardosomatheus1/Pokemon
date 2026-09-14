/* O PINCEL DO RELEVO — lago, fenda, cachoeira, duna, moita e sucata.
 *
 * Saiu do `mundo.mjs` no 1.15, e nao por gosto: com a trilha curva o arquivo
 * passou de 600 linhas, que e o teto do `test/modulos.mjs`.
 *
 * A costura e limpa porque a divisao ja existia — `acidentes()` DECIDE onde
 * cada coisa cai, em `relevo.mjs`, e sempre foi testavel em Node. O que sai
 * daqui e so o traco: o `fillRect` que transforma a decisao em pixel.
 *
 *     A decisao e pura; o traco e fino. Este arquivo e o traco.
 */
import { T } from './mundo.mjs';
import { trinca, veio, ambienteDe, temParede } from './relevo.mjs';

/* A elipse a mao: `ctx.ellipse` existe, e nao no OffscreenCanvas de toda
   versao. O traco proprio custa cinco linhas e nao tem versao. */
export function elipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ── O PINCEL DO RELEVO ────────────────────────────────────────────────────
 *
 * Percorre os acidentes e desenha. Não decide nada — a decisão está em
 * `relevo.mjs`, que roda em Node e tem teste. É a mesma divisão que governa
 * este arquivo desde o 1.3a.
 *
 * TUDO É `fillRect` E ELIPSE, sem imagem e sem filtro. Não é limitação: é o que
 * mantém o relevo na mesma era do chão. Uma sombra borrada ou um gradiente
 * suave ao lado de pixel de 16 denuncia na hora — foi o defeito nº 4 das
 * prévias antigas, e o dono reprovou duas vezes. */
export function pintarRelevo(ctx, planta, lista) {
  const P = planta.paleta;
  for (const a of lista) {
    switch (a.forma) {

      /* O LAGO. Três anéis: a margem clara que assenta ele no chão, a água, e
         um brilho no canto de cima — a luz sempre vem do mesmo lado nesta cena,
         e é a coerência da luz que faz um punhado de elipses virar volume. */
      case 'lago': {
        ctx.fillStyle = P.areia;
        elipse(ctx, a.x, a.y, a.rx + 3, a.ry + 3);
        ctx.fillStyle = P.massa;
        elipse(ctx, a.x, a.y, a.rx, a.ry);
        ctx.fillStyle = P.massaEsc;
        elipse(ctx, a.x, a.y + a.ry * 0.25, a.rx * 0.72, a.ry * 0.55);
        ctx.fillStyle = P.massaClaro;
        elipse(ctx, a.x - a.rx * 0.3, a.y - a.ry * 0.4, a.rx * 0.3, a.ry * 0.18);
        break;
      }

      /* A FENDA. Uma trinca com luz por baixo, quando o bioma pede: é a lava do
         vulcão e o gelo rachado da caverna, a MESMA forma com paleta diferente.
         O dono pediu as duas no mesmo fôlego, e elas são a mesma coisa.

         ── POR QUE ELA FOI REFEITA ────────────────────────────────────────

         A versão anterior punha CINCO retângulos de 2 px separados por 5 a 7 px
         de nada. No código eram degraus; na tela, no tamanho em que o jogador
         vê, eram pontos costurados — um tracejado. A suíte estava verde: o que
         faltava não era teste, era a afirmação de que os pedaços se tocam.

         Agora os pontos vêm de `trinca()` (camada 0, testada) e o pincel só
         liga. Três camadas, e a ordem importa:

           1. o BRILHO por baixo, quando `luz` — a lava/o gelo iluminado
           2. o NÚCLEO escuro, que é o buraco. Sem ele a trinca é um risco
              DESENHADO no chão em vez de uma falta de chão
           3. a QUINA clara, deslocada 1 px para cima: é a borda levantada do
              lado que pegou a luz, e é ela que dá relevo a uma linha chapada */
      case 'fenda': {
        const pts = trinca(a);
        const traco = (cor, dx, dy, mult, alpha) => {
          ctx.strokeStyle = cor;
          ctx.globalAlpha = alpha;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 1; i < pts.length; i++) {
            ctx.lineWidth = Math.max(0.6, ((pts[i].w + pts[i - 1].w) / 2) * mult);
            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x + dx, pts[i - 1].y + dy);
            ctx.lineTo(pts[i].x + dx, pts[i].y + dy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        };

        if (a.luz) {
          traco(P.luzNucleo, 0, 0, 3.0, 0.14);   // o clarão largo
          traco(P.acento, 0, 0, 1.9, 0.42);      // o halo
        }
        traco(P.baseEsc, 0, 0, 1.0, 0.92);       // o buraco
        if (a.luz) traco(P.luzNucleo, 0, 0, 0.42, 0.95);  // a brasa/o gelo dentro
        traco(P.claro, 0, -1, 0.5, 0.30);        // a quina levantada
        break;
      }

      /* A CACHOEIRA. Um veio que desce e ENTRA na água, com espuma na base.

         ── POR QUE ELA FOI REFEITA ────────────────────────────────────────

         Era um `fillRect` de largura constante parado no meio da cena. Na
         prévia da ruína saiu como uma coluna teal de canto vivo, sem vir de
         lugar nenhum e sem cair em lugar nenhum — o item mais "protótipo" do
         acervo inteiro. A barra do dono para isto está escrita: *"veja uma
         maneira que fique bonita e harmônica, não com cara de amadora"*.

         O que faltava não era detalhe, era CAUSA: a água não vinha de lugar
         nenhum e não batia em nada.

           VEM DE CIMA   a lâmina e a sombra sob ela, na borda de saída
           ABRE AO CAIR  ~35% mais larga embaixo, por `veio()` — coluna de
                         largura fixa é cano, não queda
           BATE EM ALGO  a poça de espuma na base, elíptica, com dois anéis.
                         É ela que prova que a água chegou ao chão em vez de
                         simplesmente terminar
           TEM VOLUME    as faixas verticais claras não são simétricas: água
                         caindo nunca é um degradê regular */
      case 'cachoeira': {
        const meio = a.x + a.w / 2;
        const faixas = veio(a);

        /* A ÁGUA DA QUEDA TEM COR PRÓPRIA, e não a `massa` do bioma.

           `massa` é a massa de água DO FUNDO da cena — e nem todo bioma tem
           uma. Na montanha ela é marrom, porque ali serve de sombra e de poço;
           a cachoeira saiu marrom junto e virou um PILAR DE PEDRA na prévia.
           Água da cor do chão não é água.

           Onde o pack não declara `cascata`, a `massa` continua valendo — na
           ruína ela É água de verdade, e trocar seria mudar o que já está certo. */
        const AG  = P.cascata ?? P.massa;
        const AGE = P.cascataEsc ?? P.massaEsc;
        const AGC = P.cascataClaro ?? P.massaClaro;
        const ESP = P.cascataEspuma ?? P.espuma;

        for (const f of faixas) {
          ctx.fillStyle = AGE;
          ctx.fillRect(Math.round(f.x), Math.round(f.y), Math.round(f.w), Math.ceil(f.alt));
          ctx.fillStyle = AG;
          ctx.fillRect(Math.round(f.x) + 1, Math.round(f.y),
                       Math.max(1, Math.round(f.w) - 2), Math.ceil(f.alt));
        }
        /* AS VEIAS E A POCA SAIRAM DAQUI. Elas agora sao desenhadas por
           QUADRO, em `cachoeirasVivas` (idle-mundo), porque o mundo e pintado
           uma vez so por bioma — e agua parada nao le como agua, le como pedra
           azul. O que fica aqui e o que nao se mexe: a pedra, a lamina e o
           corpo da queda. Ver a nota longa la. */
        /* A PEDRA DE ONDE A ÁGUA SAI. Sem ela a queda começa no ar, e foi essa
           a primeira coisa que o olho reclamou na prévia da ruína: uma coluna
           que não vinha de lugar nenhum. A pedra é mais LARGA que o veio e tem
           quina clara em cima — é a beira do desnível, e ela existe para a água
           ter causa. */
        const pw = a.w + 14, px0 = Math.round(meio - pw / 2);
        ctx.fillStyle = P.baseEsc;
        ctx.fillRect(px0, a.y - 9, pw, 9);
        ctx.fillStyle = P.base;
        ctx.fillRect(px0 + 1, a.y - 9, pw - 2, 6);
        ctx.fillStyle = P.claro;
        ctx.fillRect(px0 + 2, a.y - 9, pw - 4, 1);
        /* e o RASGO por onde ela passa, que é o que faz a pedra ter buraco em
           vez de a água atravessar pedra maciça */
        ctx.fillStyle = AGE;
        ctx.fillRect(Math.round(a.x) - 1, a.y - 4, Math.round(a.w) + 2, 4);

        /* A LÂMINA e a sombra que ela projeta: a beira por onde a água sai. */
        ctx.fillStyle = AGC;
        ctx.fillRect(a.x - 2, a.y - 2, a.w + 4, 3);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = AGE;
        ctx.fillRect(a.x - 2, a.y + 1, a.w + 4, 2);
        ctx.globalAlpha = 1;

        break;
      }

      /* A DUNA. Duas linhas paralelas com deslocamento — uma sozinha lê como
         risco, duas lêem como onda. */
      case 'duna': {
        ctx.fillStyle = P.claro;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.x, a.y, a.w, 1);
        ctx.fillRect(a.x + 3, a.y + 2, Math.max(2, a.w - 6), 1);
        ctx.globalAlpha = 1;
        break;
      }

      /* A MOITA. Tufo escuro em três blocos de alturas diferentes; blocos
         iguais viram um retângulo e um retângulo não é mato. */
      case 'moita': {
        const b = Math.max(3, Math.round(a.w / 3));
        ctx.fillStyle = P.baseEsc;
        ctx.fillRect(a.x, a.y - b, b, b);
        ctx.fillRect(a.x + b, a.y - b * 1.6, b, b * 1.6);
        ctx.fillRect(a.x + b * 2, a.y - b * 0.8, b, b * 0.8);
        ctx.fillStyle = P.acento;
        ctx.fillRect(a.x + b, a.y - b * 1.6, b, 1);
        break;
      }

      /* A SUCATA. A única forma RETA da lista, e é de propósito: o ferro-velho
         é o único lugar desta cena que foi feito por gente. */
      case 'sucata': {
        /* A SOMBRA VEM PRIMEIRO, e e ela que assenta a placa no chao. Sem ela
           as chapas do ferro-velho leem como ADESIVOS colados na cena — foi a
           ultima das seis formas a ainda parecer plana, olhada na previa. Duas
           camadas: a difusa, deslocada, e a linha dura embaixo, que e o
           contato. Sombra so difusa faz a peca flutuar; so dura, faz recorte. */
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = '#000';
        ctx.fillRect(a.x + 2, a.y + 2, a.w, a.h);
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.x + 1, a.y + a.h, a.w, 1);
        ctx.globalAlpha = 1;

        ctx.fillStyle = P.baseEsc;
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = P.claro;
        ctx.fillRect(a.x, a.y, a.w, 1);
        ctx.fillStyle = P.acento;
        ctx.fillRect(a.x + a.w - 2, a.y + 1, 2, Math.max(1, a.h - 1));
        /* a FERRUGEM na quina de baixo: chapa velha nao tem quatro quinas
           limpas, e e esse detalhe que a separa de um retangulo cinza. */
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = P.trilhaEsc;
        ctx.fillRect(a.x, a.y + a.h - 1, Math.max(2, Math.round(a.w * 0.55)), 1);
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  /* POR ÚLTIMO, e é a razão de ele funcionar: o ambiente é um VÉU sobre a cena
     pronta. Aplicado antes, o relevo seria desenhado por cima dele e a caverna
     teria teto claro com rocha escura em cima — o oposto. */
  ambientar(ctx, planta);
}


/* ── O AMBIENTE: A LUZ QUE DIZ QUE LUGAR É ESTE ────────────────────────────
 *
 * Depois do relevo, da fauna e dos NPCs, os onze cenários ainda pareciam um só.
 * Olhando a caverna de gelo, o vulcão e a ruína lado a lado na prévia, a causa
 * ficou óbvia e não era falta de enfeite:
 *
 *     todos eram um CAMPO PLANO ILUMINADO POR IGUAL, em cores diferentes.
 *
 * Um lugar não se distingue pelos objetos que tem. Se distingue pela LUZ. Uma
 * caverna tem teto; um vulcão é iluminado DE BAIXO, pela lava, e não pelo céu;
 * uma ruína afogada tem coluna d'água por cima. Nenhuma dessas três coisas é um
 * enfeite que se acrescenta — são o que faz o lugar ser aquele lugar.
 *
 * Vale a queixa do dono como barra: *"atualmente todos cenários são basicamente
 * iguais, dá pra se fazer uma diferença visual neles"*.
 *
 * ── E QUEM NÃO ESTÁ NA TABELA NÃO GANHA NADA ─────────────────────────────
 *
 * Floresta, praia e campo são lugares de CÉU ABERTO. Escurecê-los para que
 * "fiquem diferentes" seria enfeite pelo enfeite — a diferença tem de vir do
 * que o lugar é, e não da vontade de que ele pareça outro. A ausência deles na
 * tabela é decisão, e o teste afirma isso de propósito.
 *
 * O gradiente é vertical e o degrau é suave; a vinheta lateral só acompanha
 * quem tem teto, porque caverna sem parede é campo escuro em cima, e o olho
 * lê isso como nuvem. */
export function ambientar(ctx, planta) {
  const amb = ambienteDe(planta.bioma);
  if (!amb) return;
  /* `larg`/`alt` e nao `W`/`H`: maiuscula curta neste projeto e nome de
     modulo, e o portao de camadas leu o `H` local como o `H` do render. */
  const larg0 = planta.cols * T, alt = planta.rows * T;
  const P = planta.paleta;

  const cor = amb.tom === 'acento' ? P.acento
            : amb.tom === 'claro'  ? P.claro
            : P.massaEsc;

  const g = ctx.createLinearGradient(0, amb.de * alt, 0, amb.para * alt);
  g.addColorStop(0, corCom(cor, amb.forca));
  g.addColorStop(1, corCom(cor, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, larg0, alt);

  if (!temParede(planta.bioma)) return;
  /* AS PAREDES. Mais estreitas que o teto de propósito: parede larga come a
     cena, e o que se quer é a moldura, não o túnel. */
  const larg = Math.round(larg0 * 0.13);
  for (const [x0, x1] of [[0, larg], [larg0, larg0 - larg]]) {
    const gl = ctx.createLinearGradient(x0, 0, x1, 0);
    gl.addColorStop(0, corCom(cor, amb.forca * 0.78));
    gl.addColorStop(1, corCom(cor, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(Math.min(x0, x1), 0, larg, alt);
  }
}

/* `#rrggbb` + alfa -> `rgba(...)`. O pack guarda cor sólida; o véu precisa de
   transparência, e converter aqui evita uma segunda cor na paleta que teria de
   ser mantida em onze lugares. */
function corCom(hex, alfa) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alfa})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}
