/* O HUD DA CENA — bloco 1.17.
 *
 * O que estes testes protegem não é "o HUD aparece". É o conjunto de coisas que
 * fazem ele ACRESCENTAR em vez de atrapalhar, que foi a condição do pedido:
 *
 *   o medidor PARADO      barra em zero quando não há expedição ensina que o
 *                         medidor é enfeite — é a lição do número que nunca anda
 *   a mochila ARBITRÁRIA  mostrar os primeiros da bolsa é mostrar a ordem de
 *                         inserção, que é acidente e não informação
 *   o HUD que COBRE       o meio da cena é por onde o treinador anda
 *   o palco que ENGOLE    a largura do palco decide o piso do zoom, e foi ela
 *                         que comeu os níveis 1x e 2x
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  EQUIPE_NO_HUD, ITENS_NO_HUD, faltaCurto, progressoDa, itensDoHud, montar,
} from '../app/modules/idle-hud.mjs';
import { janela, niveis } from '../app/modules/viewport.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = () => readFileSync(join(RAIZ, 'app/index.html'), 'utf8');

const T0 = 1_000_000_000;
const exp = (ini, fim) => ({ iniciadaEm: ini, terminaEm: fim });

export function suite() {
  const s = criarSuite('idle-hud');

  /* ── O MEDIDOR SÓ EXISTE QUANDO TEM O QUE MEDIR ────────────────────────── */

  s.teste('sem expedição, a barra SOME — não fica em zero', () => {
    /* Um medidor parado em zero ensina o jogador que o medidor é enfeite, e
       aí ele para de olhar o medidor que importa. Mesma lição do 1.14: um
       número que nunca anda ensina que o número é falso. */
    igual(progressoDa(null, T0), null, 'sem expedição devia devolver nulo');
    igual(progressoDa({}, T0), null, 'expedição sem datas devia devolver nulo');
    igual(progressoDa(exp(T0, T0), T0), null,
      'duração zero devia devolver nulo, e não divisão por zero');

    const vazio = montar({ expedicao: null, equipe: [], bolsa: {}, cor: '#fff', agora: T0 });
    ok(!/hudBarra/.test(vazio), 'a barra apareceu sem expedição nenhuma');
  });

  s.teste('o progresso anda de 0 a 1 e não passa disso', () => {
    const x = exp(T0, T0 + 1000);
    igual(progressoDa(x, T0), 0, 'no começo devia ser zero');
    igual(progressoDa(x, T0 + 500), 0.5, 'no meio devia ser metade');
    igual(progressoDa(x, T0 + 1000), 1, 'no fim devia ser um');
    igual(progressoDa(x, T0 + 9999), 1,
      'depois do fim passou de 1 — a barra sairia do trilho');
    igual(progressoDa(x, T0 - 9999), 0, 'antes do começo ficou negativo');
  });

  s.teste('o tempo é dito em palavra de gente', () => {
    /* "restam 6000000 ms" não é informação. */
    igual(faltaCurto(0), 'pronta', 'zero devia dizer que acabou');
    igual(faltaCurto(-5000), 'pronta', 'tempo negativo devia dizer que acabou');
    igual(faltaCurto(60000), '1min', 'um minuto');
    igual(faltaCurto(59 * 60000), '59min', 'menos de uma hora fica em minutos');
    igual(faltaCurto(100 * 60000), '1h40', 'uma hora e quarenta');
    igual(faltaCurto(120 * 60000), '2h', 'hora cheia não mostra os minutos');
  });

  /* ── A MOCHILA MOSTRA O QUE IMPORTA, E NÃO O QUE VEIO PRIMEIRO ─────────── */

  s.teste('a moeda vem sempre na frente, e o resto pela QUANTIDADE', () => {
    /* A ordem de inserção da bolsa é acidente de implementação. A quantidade é
       informação, e "quanto eu tenho de moeda" é a pergunta mais feita de
       relance — por isso ela não disputa a ordenação: ela abre. */
    const bolsa = { poke: 3, essencia: 90, pokecoin: 1240, ultra: 1, fogo: 12 };
    const fora = itensDoHud(bolsa, 'pokecoin');
    igual(fora[0][0], 'pokecoin', 'a moeda não veio na frente');
    const resto = fora.slice(1).map(x => x[0]);
    igual(resto.join(','), 'essencia,fogo,poke,ultra',
      'o resto não está ordenado pela quantidade');
  });

  s.teste('a mochila do HUD não estoura o canto', () => {
    const bolsa = {};
    for (let i = 0; i < 40; i++) bolsa[`x${i}`] = i + 1;
    igual(itensDoHud(bolsa, 'pokecoin').length, ITENS_NO_HUD,
      'o canto passou do limite — mais que isso vira parede sobre o mundo');
    igual(itensDoHud({}, 'pokecoin').length, 0, 'bolsa vazia devia dar lista vazia');
    igual(itensDoHud(null, 'pokecoin').length, 0, 'bolsa nula devia dar lista vazia');
    /* Quantidade zero não é "tem zero": é NÃO TEM. Mostrar zero ocupa o canto
       com a informação menos útil que existe. */
    igual(itensDoHud({ poke: 0, fogo: 2 }, 'pokecoin').map(x => x[0]).join(','), 'fogo',
      'um item com zero apareceu no HUD');
  });

  s.teste('a equipe do HUD tem teto, e o teto é o meio da cena', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({ dex: i + 1, nivel: 5, stamina: 50 }));
    const saida = montar({ expedicao: null, equipe: muitos, bolsa: {}, cor: '#fff', agora: T0 });
    const quantos = (saida.match(/hudCria/g) ?? []).length;
    ok(quantos <= EQUIPE_NO_HUD * 2,   /* cada um gera a classe uma vez no span */
      `o HUD desenhou ${quantos} marcas de criatura para um teto de ${EQUIPE_NO_HUD}`);
  });

  s.teste('o HUD mora nos CANTOS, e o meio fica livre', () => {
    /* A condição do pedido foi "sem atrapalhar em nada", e atrapalhar tem
       endereço: o meio da cena é por onde o treinador anda. Todas as caixas
       são ancoradas em canto — nenhuma centraliza. */
    const h = html().replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [classe, lados] of [
      ['hudAlto', ['left', 'top']],
      ['hudBaixoE', ['left', 'bottom']],
      ['hudBaixoD', ['right', 'bottom']],
    ]) {
      const m = h.match(new RegExp(`\\.${classe}\\{([^}]*)\\}`));
      ok(m, `a caixa .${classe} sumiu do CSS`);
      for (const lado of lados)
        ok(new RegExp(`(^|;)${lado}:`).test(m[1]),
          `.${classe} não está ancorada em "${lado}" — ela pode cair no meio da cena`);
    }
    ok(/#idleHud\{[^}]*pointer-events:none/.test(h),
      'o HUD captura clique — ele ficaria por cima do palco e comeria o arraste');
  });

  /* ── O PALCO, QUE É O QUE DESTRAVA O ZOOM ──────────────────────────────── */

  s.teste('o palco tem TETO de largura, e é ele que devolve o zoom out', () => {
    /* A queixa do dono eram DUAS frases — "a tela está muito grande" e "quero
       mais zoom out" — e uma correção só. O piso do zoom é
       `largura_do_palco / 704`, então um palco de 1841 px não tem zoom out
       para dar: não existe ampliação menor que 2,62 que ainda preencha. */
    const h = html().replace(/\/\*[\s\S]*?\*\//g, '');
    const m = h.match(/#idlePalco\{([^}]*)\}/);
    ok(m, 'o palco sumiu do CSS');
    ok(/width:min\(/.test(m[1]),
      'o palco voltou a não ter teto de largura — sem teto, o piso do zoom sobe ' +
      'com a tela e os níveis baixos somem de novo');
    ok(/resize:both/.test(m[1]), 'a alça perdeu um dos eixos');
  });

  s.teste('em toda janela sobram pelo menos CINCO níveis de zoom', () => {
    /* Antes: 1841 px de palco davam piso 2,62 e só quatro níveis, começando em
       2,65. Este teste é a régua que impede aquilo de voltar. */
    for (const [vw, vh] of [[1920, 1080], [1440, 900], [1194, 1022], [1100, 800]]) {
      const palco = Math.min(vw - 80, 1041, vh * 0.91);
      const j = janela({ cx: palco, cy: palco / (704 / 448), mundoW: 704, mundoH: 448, zoom: 3 });
      const n = niveis(j.piso);
      ok(n.length >= 5,
        `em ${vw}x${vh} o palco fica com ${Math.round(palco)}px, piso ${j.piso.toFixed(2)}x ` +
        `e só ${n.length} níveis (${n.join(', ')}) — o zoom out sumiu de novo`);
      ok(j.piso < 1.6,
        `em ${vw}x${vh} o piso ficou em ${j.piso.toFixed(2)}x — o palco voltou a ` +
        'ser largo demais para o mundo que ele mostra');
    }
  });

  return s;
}
