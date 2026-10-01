/* O CENÁRIO DA LUTA (ST-2.17) — camada 0, puro.
 *
 * O dono, olhando a luta da jornada: "a tela das batalhas tá só 2 cores, sem
 * detalhe nenhum, tá bem feia". Era um degradê azul sobre um verde liso — o
 * mesmo na Rota 1 e no vulcão de Cinnabar.
 *
 * A referência é o fundo de batalha dos portáteis: um horizonte que diz ONDE
 * se está, e uma plataforma de chão sob cada lutador. O que eles não têm, e a
 * nossa tem: o lugar é o MESMO do mapa — o chão é a textura da região do nó
 * (`arte/chao`), as peças são as do mapa (`arte/mapa`), e quem venceu a Rota
 * 22 no mapa luta na Rota 22. E a interface continua neon por cima: o mundo é
 * GBA, a moldura não.
 *
 * As camadas, de trás para a frente:
 *
 *   céu        dois tons e a luz do lugar (sol, brasa do vulcão, neon da cidade)
 *   colinas    duas faixas de relevo, a de trás mais clara (a névoa da
 *              distância), desenhadas por pontos — o horizonte não é reto
 *   horizonte  as peças do lugar, pequenas e com névoa
 *   chão       a textura da região, escurecendo para a frente
 *   plataforma a elipse sob cada lutador, com borda — é onde ele PISA
 *   frente     uma peça grande no canto de baixo à direita, cortada pela
 *              borda: é ela que põe o palco DENTRO do lugar, e não sobre ele
 *   partícula  o ar do lugar: pólen, folha, brasa, faísca, névoa
 *
 * Tudo sai de uma semente: a mesma luta, o mesmo cenário (o replay não troca
 * de árvore no meio); outra luta, outro arranjo do mesmo lugar.
 */
const ARTE = '../arte';
/* O chão da LUTA não é sempre o chão do MAPA: na floresta e no bosque o tile
   do mapa é a copa vista de cima, e os lutadores pisavam nas árvores (Q5). Lá
   o chão é a grama do sub-bosque; as árvores ficam no horizonte. */
const peca = nome => `${ARTE}/mapa/${nome}.svg`;
const chao = nome => `${ARTE}/chao/${nome}.svg`;

/* O ar de cada lugar. `anim` escolhe o movimento no CSS (`pveParticula`). */
export const PARTICULAS = Object.freeze({
  polen:  { cor: '#fff3a6', anim: 'flutua', tam: 3 },
  folha:  { cor: '#7cc460', anim: 'cai', tam: 4 },
  petala: { cor: '#f4a6cf', anim: 'cai', tam: 4 },
  poeira: { cor: '#e2d6bc', anim: 'flutua', tam: 2 },
  espuma: { cor: '#ffffff', anim: 'sobe', tam: 3 },
  nevoa:  { cor: '#d6e6dc', anim: 'flutua', tam: 14 },
  neon:   { cor: '#6fd8ff', anim: 'pisca', tam: 3 },
  brasa:  { cor: '#ff8a3a', anim: 'sobe', tam: 3 },
  faisca: { cor: '#fff36a', anim: 'pisca', tam: 3 },
  brilho: { cor: '#ffe9a8', anim: 'pisca', tam: 3 },
});

/* Onde o céu é aberto e de dia, passam nuvens; no vulcão, na cidade à noite,
   na usina, na mata fechada e no pântano, não. */
export const COM_NUVENS = Object.freeze(['campo', 'bosque', 'pedra', 'praia', 'jardim', 'planalto']);

/* Uma linha por região do mapa (`REGIOES`). `luz` é o brilho do céu;
   `colinas`, a de trás e a da frente; `fundo`, as peças do horizonte (a
   semente escolhe a ordem); `frente`, a peça grande do canto. */
export const CENARIOS = Object.freeze({
  campo:    { ceu: ['#6fb8e8', '#cdeaf6'], luz: 'rgba(255,244,196,.65)', colinas: ['#94c96a', '#6aa84c'], chao: 'campo', piso: 'grama',
              fundo: ['arvore', 'arvore', 'flores', 'casa_vermelha'], frente: ['arvore'], particula: 'polen' },
  floresta: { ceu: ['#2c5636', '#7fae78'], luz: 'rgba(214,255,170,.4)', colinas: ['#3f7a38', '#24502a'], chao: 'grama', piso: 'bosque',
              fundo: ['pinheiro', 'arvore', 'pinheiro', 'pinheiro', 'arvore'], frente: ['pinheiro'], particula: 'folha' },
  bosque:   { ceu: ['#5b8db4', '#bfdcc6'], luz: 'rgba(255,240,200,.45)', colinas: ['#5f9548', '#3d6f33'], chao: 'grama', piso: 'campo',
              fundo: ['arvore', 'pinheiro', 'arvore', 'flores'], frente: ['arvore'], particula: 'folha' },
  pedra:    { ceu: ['#8aa4c0', '#e2d8c4'], luz: 'rgba(255,236,200,.5)', colinas: ['#a59b8a', '#7c7366'], chao: 'pedra', piso: 'pedra',
              fundo: ['rocha', 'pilar', 'rocha', 'museu'], frente: ['rocha'], particula: 'poeira' },
  praia:    { ceu: ['#4fb0e8', '#c4ecf7'], luz: 'rgba(255,250,214,.7)', colinas: ['#5fb8e4', '#2f86c0'], chao: 'praia', piso: 'praia',
              fundo: ['farol', 'junco', 'casa_azul', 'junco'], frente: ['junco'], particula: 'espuma' },
  jardim:   { ceu: ['#86c6ee', '#f4dcee'], luz: 'rgba(255,226,240,.6)', colinas: ['#82c464', '#58a04a'], chao: 'jardim', piso: 'grama',
              fundo: ['loja', 'arvore', 'flores', 'flores'], frente: ['flores'], particula: 'petala' },
  pantano:  { ceu: ['#46596a', '#a3b6a6'], luz: 'rgba(200,230,210,.35)', colinas: ['#4f6c48', '#2f4a33'], chao: 'pantano', piso: 'pantano',
              fundo: ['junco', 'portao_safari', 'junco', 'arvore'], frente: ['junco'], particula: 'nevoa' },
  cidade:   { ceu: ['#2e2f6a', '#c08ccc'], luz: 'rgba(111,216,255,.45)', colinas: ['#55597a', '#383c58'], chao: 'cidade', piso: 'praca',
              fundo: ['torre_silph', 'casa_azul', 'casa_roxa', 'loja'], frente: ['pilar'], particula: 'neon' },
  vulcao:   { ceu: ['#2e1414', '#d4623a'], luz: 'rgba(255,140,60,.55)', colinas: ['#6a3024', '#3e1a14'], chao: 'vulcao', piso: 'pedra',
              fundo: ['vulcao', 'braseiro', 'rocha', 'rocha'], frente: ['braseiro'], particula: 'brasa' },
  usina:    { ceu: ['#1b2538', '#56688a'], luz: 'rgba(255,243,106,.35)', colinas: ['#444e64', '#2a3245'], chao: 'usina', piso: 'usina',
              fundo: ['torre', 'pilar', 'torre', 'pilar'], frente: ['pilar'], particula: 'faisca' },
  planalto: { ceu: ['#4f64ac', '#e6cdea'], luz: 'rgba(255,233,168,.6)', colinas: ['#8a8fac', '#62678a'], chao: 'planalto', piso: 'praca',
              fundo: ['palacio', 'bandeira', 'pilar', 'bandeira'], frente: ['bandeira'], particula: 'brilho' },
});

/* As coordenadas: o céu, as colinas e o horizonte vivem na FAIXA DO CÉU, de
   0 (topo) a 100 (a linha do horizonte), com altura fixa em pixels no CSS
   (maior no largo, menor no celular) — em porcentagem do palco, o horizonte
   descia com o número de lutadores e o rival ficava pisando no céu. A frente
   vive no PALCO inteiro (0–100 de cima a baixo). */
const hash = s => [...String(s ?? '')].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);
function sorteio(semente) {                       // mulberry32: pequeno e reprodutível
  let a = hash(semente) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r1 = n => Math.round(n * 10) / 10;

export function cenarioDaLuta(regiao, semente = 0) {
  const nome = CENARIOS[regiao] ? regiao : 'campo';
  const c = CENARIOS[nome];
  const R = sorteio(`${nome}:${semente}`);
  /* As colinas: nove pontos de 0 a 100%, a de trás mais alta. */
  const colina = (base, amp) => Array.from({ length: 9 }, (_, i) => [r1(i * 12.5), r1(base - amp * R())]);
  /* O horizonte: as peças espalhadas, com folga entre elas, o pé um pouco
     abaixo da linha (elas estão NO chão, não sobre a linha). */
  /* DUAS fileiras: a de trás menor e mais apagada (a distância), a da frente
     maior — um palco de 1.400 px com quatro peças era um horizonte vazio. */
  const fileira = (lista, longe) => lista.map((arte, i) => {
    const x = 4 + (i + 0.5) * (92 / lista.length) + (R() - 0.5) * (longe ? 10 : 8);
    return longe ? { arte: peca(arte), x: r1(x), y: r1(98 + R() * 2), h: r1(30 + R() * 8), longe: true }
                 : { arte: peca(arte), x: r1(x), y: r1(101 + R() * 5), h: r1(42 + R() * 16), longe: false };
  });
  const tras = [...c.fundo, ...c.fundo].sort(() => R() - 0.5);
  const frenteDoFundo = [...c.fundo].sort(() => R() - 0.5);
  const fundo = [...fileira(tras, true), ...fileira(frenteDoFundo, false)];
  /* A frente vai no pé do palco, ENTRE as duas colunas (a do jogador à
     esquerda, a dos rivais à direita, que desce até o pé): é o único lugar
     do largo em que ela não cobre ninguém. No celular o CSS a leva ao canto
     de baixo à direita, que lá fica livre. */
  const frente = c.frente.map(arte => ({ arte: peca(arte), x: r1(36 + R() * 10), y: r1(104 + R() * 4), h: r1(32 + R() * 8) }));
  const nuvens = COM_NUVENS.includes(nome)
    ? Array.from({ length: 4 }, (_, i) => ({ x: r1(i * 25 + R() * 18), y: r1(8 + R() * 30), escala: r1(0.7 + R() * 0.8), dur: Math.round(70 + R() * 60) }))
    : [];
  const lista = Array.from({ length: 14 }, () => ({
    x: r1(R() * 100), y: r1(10 + R() * 80), atraso: r1(R() * 6), dur: r1(5 + R() * 5), escala: r1(0.6 + R() * 0.8) }));
  return {
    regiao: nome, ceu: [...c.ceu], luz: c.luz,
    colinas: [{ cor: c.colinas[0], pontos: colina(78, 30) }, { cor: c.colinas[1], pontos: colina(98, 18) }],
    chao: chao(c.chao), piso: chao(c.piso), fundo, frente, nuvens,
    particula: { tipo: c.particula, ...PARTICULAS[c.particula], lista },
  };
}
