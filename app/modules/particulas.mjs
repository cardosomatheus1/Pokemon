/* A VIDA DO BIOMA — o que se mexe no ar de cada lugar (camada 0).
 *
 * Portado da prévia `tools/previas/direcoes.html`, que o dono aprovou e depois
 * teve de me lembrar duas vezes que existia:
 *
 *   "é exatamente oque você tinha feito poxa, só olhas nos registros, brasa
 *    subindo do vulcão, praia a agua correndo, vagalumes..."
 *
 * Ele estava certo. A prévia era um HTML solto e o código morreu lá. Um módulo
 * é o que impede isso de acontecer de novo: agora a vida do bioma tem casa,
 * teste e um lugar de onde a aba a importa.
 *
 * ── CADA BIOMA TEM UMA VIDA PRÓPRIA ───────────────────────────────────────
 *
 * E isso não é enfeite: é o que faz "o mundo tem luz própria" deixar de ser uma
 * cor e virar comportamento.
 *
 *   vagalume   sobe devagar, some e reacende noutro lugar
 *   brasa      sobe rápido, esfria de laranja para vermelho e apaga
 *   neve       cai em diagonal, com brilho no cristal parado
 *   plancton   pulsa DENTRO da água, sem sair dela
 *   polen      atravessa a tela na horizontal, sem subir
 *   poeira     redemoinho baixo e rasteiro
 *   bolha      sobe da água em coluna e estoura na margem
 *   esporo     nuvem lenta que atravessa em diagonal
 *   arco       NÃO brilha: estala. Aparece dois quadros e some
 *
 * O teste que eu apliquei para aceitar um bioma novo, e que continua valendo:
 * **se a vida dele pudesse ser trocada pela de outro sem perder nada, o bioma
 * não tinha razão de existir.**
 *
 * ── A ÁGUA ANDA ───────────────────────────────────────────────────────────
 *
 * Duas linhas de reflexo que deslizam. É o movimento que faz o olho aceitar que
 * aquilo é líquido, e custa duas chamadas de `fillRect` por linha. Sem isso a
 * água é uma faixa azul, e uma faixa azul parada lê como parede.
 *
 * ── O ESTADO É DE QUEM CHAMA ──────────────────────────────────────────────
 *
 * `semear` devolve a lista de partículas e `mover` a avança um passo. Nada aqui
 * guarda estado global — é o que permite testar mil passos em Node e afirmar
 * que a brasa nunca desce, que o plâncton nunca sai da água e que o vaga-lume
 * reacende em vez de sumir para sempre.
 */

/* Qual vida cada bioma tem. Mora aqui e não no ContentPack porque não é
   identificador de franquia: "brasa" é um comportamento de partícula, e o pack
   original vai ter vulcão também. O que o pack diz é a COR; o que este arquivo
   diz é o movimento. */
export const VIDA_POR_BIOMA = {
  floresta: 'vagalume', praia: 'plancton', campo: 'polen',
  montanha: 'poeira', gelo: 'neve', vulcao: 'brasa', deserto: 'poeira',
  oasis: 'vagalume', ruina: 'bolha', estufa: 'esporo', ferrovelho: 'arco',
};

/* ── QUANTAS, E POR QUE OS NÚMEROS SUBIRAM ────────────────────────────────
 *
 * Brasa e arco são muitos e pequenos; esporo é pouco e grande. Um número só
 * para todos deixaria metade dos biomas vazia e a outra metade poluída.
 *
 * ── A DENSIDADE ACOMPANHA A ÁREA, e é isto que estava faltando ───────────
 *
 * Os números foram calibrados quando a cena era 15×10 tiles — 240×160 px. O
 * 1.5c cresceu o mundo para 44×28, ou 704×448: **oito vezes a área**. Os mesmos
 * dezoito vaga-lumes que enchiam a prévia viraram dezoito pontos perdidos num
 * campo oito vezes maior.
 *
 * Foi exatamente o que o dono viu, comparando com a prévia de dois dias antes:
 *
 *   > "os cenários ficaram legais, mas ainda volto a dizer dá pra melhorar, os
 *   >  da prévia tinham mais riquezas de detalhes, a caverna de gelo de fato
 *   >  tinha bastante floco de neve caindo, o vulcão as brasas realmente subiam,
 *   >  tinham um pouco mais de vagalume"
 *
 * Ele não estava pedindo partícula nova: estava vendo a MESMA partícula
 * diluída. É o mesmo defeito que `densidadeDe` já tinha corrigido para os
 * detalhes do chão, no bloco em que o mundo cresceu — e que ninguém aplicou
 * aqui. Uma correção que se faz num lugar e não no irmão dele.
 *
 * ── E POR QUE NÃO OITO VEZES ─────────────────────────────────────────────
 *
 * Porque a regra dele é a outra metade: *"não é pra você poluir os biomas"* e
 * *"não precisa nada SUPER LOTADO"*. Oito vezes devolveria a densidade da
 * prévia num campo que o jogador percorre inteiro, e o que era ambiente viraria
 * neblina.
 *
 * ~2,6× é o meio-termo, e tem razão de ser: é a raiz de oito, a escala que
 * mantém a densidade constante ao longo de UMA LINHA da tela em vez de na área
 * inteira. A câmera mostra uma janela, não o mapa — o que o olho conta é
 * quantas partículas cruzam o campo de visão, e isso é linear, não quadrático.
 */
export const QUANTAS = {
  vagalume: 46, brasa: 66, neve: 78, plancton: 42, polen: 36,
  poeira: 32, bolha: 36, esporo: 40, arco: 18,
};

/* A cena de referência dos números acima. Cena maior pede mais; menor, menos —
   e a raiz é o mesmo argumento do bloco acima. */
export const AREA_REF = 704 * 448;

export function quantas(tipo, area) {
  const base = QUANTAS[tipo] ?? 14;
  const a = Math.max(1, (area?.largura ?? 704) * (area?.altura ?? 448));
  return Math.max(4, Math.round(base * Math.sqrt(a / AREA_REF)));
}

export const vidaDe = biomaId => VIDA_POR_BIOMA[biomaId] ?? 'polen';

/* ── AS VIDAS QUE SÃO LUZ (1.34) ──────────────────────────────────────────
 *
 * À noite elas recebem halo DEPOIS da tinta da hora, e atravessam o escuro. As
 * outras escurecem junto com a cena, porque não emitem nada.
 *
 * A lista é do dono antes de ser minha — *"a brasa do vulcão acesa, o floco de
 * neve brilhando"* (L-124) — mais as que já nascem como luz: vaga-lume,
 * plâncton, esporo e o arco do ferro-velho. Poeira e bolha ficam fora: poeira
 * acesa no escuro não é luz, é a tela suja com halo. */
export const VIDA_QUE_BRILHA = new Set(['brasa', 'neve', 'vagalume', 'plancton', 'esporo', 'arco']);

/* A mesma mistura sem estado do `vida.mjs`: partícula sorteada com `Math.random`
   é partícula que o teste não consegue reproduzir, e a aba do idle tem teste
   que proíbe sorteio. */
export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ONDE CADA VIDA NASCE. Nem toda partícula pode começar em qualquer lugar: uma
   bolha que nasce no céu cai para a água no primeiro passo, e o teste flagrou
   isso como "bolha que desce é pedra". Semear na região certa poupa o primeiro
   segundo de cena errada — e cena errada no primeiro segundo é a que o jogador
   vê ao abrir a aba. */
const BERCO = {
  bolha:    (r, a) => a.margem + r * (a.altura - a.margem),
  plancton: (r, a) => a.margem + r * (a.altura - a.margem),
  brasa:    (r, a) => a.altura * 0.15 + r * (a.margem - a.altura * 0.15),
};

export function semear(semente, tipo, area) {
  const { largura, altura } = area;
  const n = quantas(tipo, area);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = k => mistura(semente + i * 977, k);
    out.push({
      x: r(1) * largura,
      y: (BERCO[tipo] ?? ((v) => v * altura))(r(2), area),
      f: r(3),                       // fase própria, para não piscarem juntas
      v: 0.3 + r(4) * 0.9,           // velocidade
    });
  }
  return out;
}

/* UM PASSO. `dt` em quadros de 60 Hz, para a cena não acelerar em monitor de
   144 Hz — foi o tipo de coisa que só aparece na máquina do outro. */
export function mover(ps, tipo, area, t, dt = 1) {
  /* Nomes por extenso: `larg` e `alt` colidem com os exports do render.mjs e o
     conferidor de modulos le declaracao multipla como simbolo global (D-053). */
  const larg = area.largura, alt = area.altura, marg = area.margem;
  const solta = (p, i) => {          // renasce noutro lugar, sem sortear
    p.x = mistura(Math.round(t) + i * 31, 5) * larg;
  };
  ps.forEach((p, i) => {
    switch (tipo) {
      case 'vagalume':
        p.y -= p.v * 0.28 * dt;
        p.x += Math.sin(t / 700 + p.f * 9) * 0.35 * dt;
        if (p.y < 0) { p.y = marg; solta(p, i); }
        break;
      case 'brasa':
        p.y -= p.v * 0.85 * dt;
        p.x += Math.sin(t / 300 + p.f * 11) * 0.5 * dt;
        if (p.y < alt * 0.15) { p.y = marg - mistura(i, 7) * 40; solta(p, i); }
        break;
      case 'neve':
        p.y += p.v * 0.42 * dt;
        p.x += (Math.sin(t / 900 + p.f * 6) * 0.5 + 0.2) * dt;
        if (p.y > marg) { p.y = 0; solta(p, i); }
        break;
      case 'plancton':
        /* PRESO NA ÁGUA. Ele não sobe: a faixa dele é definida pela margem, e é
           por isso que plâncton num bioma sem água não faria sentido. */
        p.y = marg + 6 + p.f * Math.max(0, alt - marg - 12);
        p.x += p.v * 0.18 * dt;
        if (p.x > larg) p.x = 0;
        break;
      case 'polen':
        p.x += p.v * 0.5 * dt;
        p.y += Math.sin(t / 800 + p.f * 5) * 0.25 * dt;
        if (p.x > larg) { p.x = -4; p.y = mistura(i, 9) * marg; }
        break;
      case 'poeira':
        p.x += p.v * 0.7 * dt;
        p.y += Math.sin(t / 500 + p.f * 7) * 0.2 * dt;
        if (p.x > larg) { p.x = -4; p.y = marg - mistura(i, 11) * 70; }
        break;
      case 'bolha':
        p.y -= p.v * 0.5 * dt;
        if (p.y < marg - 10) { p.y = alt; solta(p, i); }
        break;
      case 'esporo':
        p.x += p.v * 0.24 * dt;
        p.y -= p.v * 0.10 * dt;
        if (p.x > larg || p.y < 0) { p.x = -6; p.y = marg * (0.4 + mistura(i, 13) * 0.6); }
        break;
      case 'arco': {
        const fase = (t / 1000 + p.f * 7) % 3;
        if (fase > 2.9) { solta(p, i); p.y = 40 + mistura(i, 17) * Math.max(1, marg - 60); }
        break;
      }
    }
  });
  return ps;
}

/* Quanto uma partícula aparece agora — 0 a 1. Separado do movimento porque o
   desenho pergunta isso a cada quadro e o movimento só avança uma vez. */
export function opacidade(p, tipo, t, area) {
  switch (tipo) {
    case 'vagalume': return 0.35 + 0.65 * Math.abs(Math.sin(t / 520 + p.f * 7));
    case 'brasa': {
      const alto = area.altura * 0.15;
      return Math.max(0, (p.y - alto) / Math.max(1, area.margem - alto));
    }
    case 'neve':     return 0.55 + 0.45 * Math.sin(t / 600 + p.f * 8);
    case 'plancton': return 0.25 + 0.75 * Math.abs(Math.sin(t / 430 + p.f * 13));
    case 'polen':    return 0.40 + 0.40 * Math.sin(t / 700 + p.f * 9);
    case 'poeira':   return 0.18 + 0.22 * Math.sin(t / 600 + p.f * 4);
    case 'bolha':    return p.y > area.margem ? 0.7 : 0.7 * Math.max(0, (p.y - (area.margem - 10)) / 10);
    case 'esporo':   return 0.30 + 0.30 * Math.sin(t / 1100 + p.f * 6);
    /* O ARCO NÃO BRILHA: ESTALA. Ele fica apagado a maior parte do tempo, e é
       essa ausência que faz o ferro-velho parecer perigoso em vez de festivo. */
    case 'arco':     return ((t / 1000 + p.f * 7) % 3) < 0.12 ? 1 : 0;
    default:         return 0.5;
  }
}
