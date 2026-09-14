/* AS CINCO FAIXAS DE RARIDADE — fonte única (bloco 1.23, camada 0).
 *
 * ── O QUE ESTAVA ERRADO, E ERA PIOR QUE "SEM TRATAMENTO" ─────────────────
 *
 * A L-116 registrou que o `lendario` não tinha tratamento visual. Medindo para
 * corrigir, achei algo pior: **três telas definiam a cor das faixas, e as três
 * discordavam.**
 *
 *     faixa        Pokédex     prévia da rota   cartão do encontro
 *     comum        #9fb2c9     #5a6c82          rgba(150,170,190,.35)
 *     incomum      #5efc8d     #3fb98a          rgba( 90,230,160,.42)
 *     raro         #5ee7ff     #4aa8ff          rgba(120,190,255,.55)
 *     muitoRaro    #c08bff     #a76bff          rgba(200,140,255,.60)
 *     lendario     #ff6b6b     #ffc107          var(--gold)
 *
 * ── E O `lendario` MUDAVA DE FAIXA CONFORME O TEMA ───────────────────────
 *
 * Duas das três telas pintavam a faixa mais rara de DOURADO, e uma delas com
 * `var(--gold)` — que neste projeto **não é dourado e não é fixo**:
 *
 *     tema padrão    --gold: #00e5ff   ciano   -> lê como `raro`
 *     tema shadow    --gold: #b57bff   roxo    -> lê como `muitoRaro`
 *
 * A coisa mais rara do jogo — **uma vaga no mapa inteiro** — estava vestindo a
 * cor de outra faixa, e trocava de faixa quando o jogador trocava de tema.
 *
 *   > **Raridade é informação, não decoração.** O tema pode repintar a moldura;
 *   > ele não pode repintar o significado.
 *
 * Por isso as cores daqui são FIXAS e não saem de variável de tema. É a mesma
 * razão pela qual o preço não muda de cor com o tema.
 *
 * ── O PEDIDO DO DONO NÃO É TROCAR A PALETA. É FAZER A PALETA APARECER ────
 *
 *   > "o comum pode se manter um cinza mas com melhor visualização, intenção de
 *   >  fato é realce e destaque para as cores"
 *
 * As cores existiam e eram aplicadas em `border-color` com opacidade de 0,35 a
 * 0,60, numa borda de 1 px sobre fundo escuro. **A informação estava lá e o
 * olho não a alcançava.**
 *
 * ── O BRILHO É A SEGUNDA ESCALA, E ELE CARREGA A RARIDADE SOZINHO ────────
 *
 * Cinco matizes numa rampa fria-para-quente já são muitos para o olho separar
 * de relance, e duas delas encostam no acento da interface em algum tema. Então
 * a raridade é dita DUAS vezes, por eixos independentes:
 *
 *     comum       matiz neutro   ·  brilho ZERO
 *     incomum     verde          ·  brilho curto
 *     raro        azul           ·  brilho médio
 *     muitoRaro   roxo           ·  brilho forte
 *     lendario    vermelho       ·  brilho forte + PULSO
 *
 * **A ausência de brilho no comum é a informação**, e não uma economia: o comum
 * é o fundo contra o qual todo o resto se destaca. E o pulso existe só no
 * `lendario` porque ele tem UMA vaga no mapa inteiro — a única coisa que se
 * mexe na grade é a única coisa que quase nunca aparece.
 *
 * ── E O DOURADO FICA LIVRE PARA O SHINY ──────────────────────────────────
 *
 * Tirar o dourado do `lendario` devolve a cor a quem ela serve melhor: o shiny,
 * que é ORTOGONAL à raridade (um comum pode ser shiny) e hoje ganha só um `✦`.
 * Duas escalas cruzadas dão mais combinações que uma escala mais longa — que é
 * também o argumento contra criar um sexto degrau "épico".
 */

/* A ordem importa: ela é a que a tela usa para ordenar legenda e filtro, e
   derivá-la de `Object.keys` amarraria a ordem à de escrita do objeto. */
export const FAIXAS = ['comum', 'incomum', 'raro', 'muitoRaro', 'lendario'];

export const RARIDADE = {
  comum:     { cor: '#a2adb8', brilho: 0,  pulso: false, rotulo: 'comum' },
  incomum:   { cor: '#43e08a', brilho: 8,  pulso: false, rotulo: 'incomum' },
  raro:      { cor: '#4d9dff', brilho: 13, pulso: false, rotulo: 'raro' },
  /* ── O ROXO É FUNDO, E NÃO CLARO, POR MEDIÇÃO ─────────────────────────
     A primeira escolha foi `#c264ff`, e o teste reprovou: ela fica a **26** do
     acento do tema shadow (`#b57bff`). Seria o defeito do `lendario` de novo,
     entrando pela porta do vizinho — "muito raro" leria como "selecionado".

     Um roxo mais CLARO fugia para perto do `raro`; então ele foi para o fundo.
     A presença não vem do claro — vem do brilho, que é a segunda escala. É
     exatamente para isso que ela existe. */
  muitoRaro: { cor: '#9333ea', brilho: 18, pulso: false, rotulo: 'muito raro' },
  lendario:  { cor: '#ff5a4d', brilho: 22, pulso: true,  rotulo: 'lendário' },
};

/* Faixa desconhecida cai no comum, e não em `undefined`: uma faixa nova no pack
   apareceria sem cor nenhuma, que é exatamente o estado do qual o `lendario`
   está saindo neste bloco. */
export const daFaixa = f => RARIDADE[f] ?? RARIDADE.comum;
export const corDa = f => daFaixa(f).cor;

/* ── A COR EM `rgb()` SEPARADO ────────────────────────────────────────────
 *
 * O CSS precisa da cor E dos canais: `rgba(var(--rarRGB), .12)` é como um fundo
 * suave sai da mesma cor da borda sem escrever a cor duas vezes. Escrever duas
 * é como as três telas divergiram para começo de conversa. */
export function canaisDe(f) {
  const h = corDa(f).replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

/* As variáveis que a tela põe no elemento. Uma função, e não um `style` escrito
   em cada chamador: o dia em que entrar uma sexta variável, ela entra aqui. */
export function estiloDa(f) {
  const r = daFaixa(f);
  return `--rar:${r.cor};--rarRGB:${canaisDe(f).join(',')};--rarBrilho:${r.brilho}px`;
}

/* A classe que liga o pulso. Só o `lendario` tem, e por isso ela é uma pergunta
   e não uma lista. */
export const classeDa = f => `rar rar-${FAIXAS.includes(f) ? f : 'comum'}`;
