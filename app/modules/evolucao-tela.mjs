/* A TRANSIÇÃO DE EVOLUÇÃO (bloco 1.21, camada 4).
 *
 * ── POR QUE ELA É REQUISITO, E NÃO ENFEITE ───────────────────────────────
 *
 * Palavra do dono, e o argumento é dele:
 *
 *   > "Pokémon que não tem uma tela de evolução nem mínima que seja não é um
 *   >  Pokémon, essa tela de transição de evolução reina desde os primórdios da
 *   >  franquia"
 *
 * E há um motivo de desenho além do temático: **este projeto quase não tem
 * momentos.** A crítica que chegou de fora foi exatamente essa — *"muito
 * linear, site de velho"*. Quase tudo acontece em linha: clica, muda, segue.
 * A evolução é um dos poucos acontecimentos que o jogo tem, e passar por ele
 * sem parar é jogar fora a coisa mais fácil de fazer o jogador sentir.
 *
 * ── A REFERÊNCIA, E O QUE EU NÃO VI ──────────────────────────────────────
 *
 * O dono mandou um vídeo comparando as animações da franquia e escolheu a do
 * **Omega Ruby / Alpha Sapphire**. Eu consigo buscar a PÁGINA do vídeo — o
 * título é *"Pokémon Game: Evolution of Starter Evolution Animations"* — e
 * **não consigo ver os quadros**. Digo isto porque a diferença entre "conheço o
 * padrão" e "vi a referência" é o que este projeto não deixa passar.
 *
 * O que está construído, do padrão que eu conheço, para ele corrigir olhando:
 *
 *     1. a cena ESCURECE e o mundo sai de foco
 *     2. a criatura vira SILHUETA branca sobre o escuro
 *     3. anéis de luz pulsam para fora, e ela ALTERNA entre as duas formas —
 *        devagar no começo, cada vez mais rápido
 *     4. um estouro branco cobre a tela
 *     5. a forma nova aparece com faíscas, e o nome é escrito
 *
 * ── O PASSO 3 É A ANIMAÇÃO INTEIRA ───────────────────────────────────────
 *
 * A alternância acelerando é o que faz a coisa funcionar. Sem ela, o resto é um
 * flash com o sprite trocado — e é exatamente por isso que as animações antigas
 * da série, que o dono dispensou, parecem pobres: elas piscam, não aceleram.
 *
 * A aceleração é geométrica: cada troca dura `RAZAO` vezes a anterior. Linear
 * daria uma rampa que o olho lê como "está travando"; geométrica lê como
 * "está chegando".
 *
 * ── VESTIDO NO TEMA ──────────────────────────────────────────────────────
 *
 * Os anéis saem na cor do TIPO da criatura, e não numa cor fixa: assim um
 * Charmeleon evolui em laranja e um Ivysaur em verde, e a transição pertence
 * àquela criatura em vez de ser um cartão genérico.
 */
/* SEM `sprites.mjs`. Ele toca `document` na carga, e importá-lo tornaria esta
   tela impossível de conferir em Node — a suíte morreria no import, antes de
   qualquer afirmação. É a mesma lição do HUD (1.17):

       A decisão é pura; o traço é fino.

   Os `<img>` saem com `src` vazio e quem tem DOM os preenche. */
import { PACK, nomeExibido } from './motor.mjs';

/* ── OS TEMPOS ────────────────────────────────────────────────────────────
 *
 * Somados, ~5,2 s. É longo de propósito e curto o bastante para não irritar na
 * décima evolução: há como pular a qualquer momento, e pular é UM clique.
 *
 * `TROCAS` é quantas vezes a forma alterna. Doze é o número em que a aceleração
 * se percebe como aceleração; com seis ela parece só rápida no fim. */
export const MS_ESCURECER = 700;
export const MS_SILHUETA = 900;
export const TROCAS = 12;
export const MS_PRIMEIRA_TROCA = 420;
export const RAZAO = 0.82;
export const MS_ESTOURO = 520;
export const MS_REVELACAO = 1600;

/* Quanto dura a alternância inteira: a soma de uma progressão geométrica. */
export const msDaAlternancia = () => {
  let t = 0, passo = MS_PRIMEIRA_TROCA;
  for (let i = 0; i < TROCAS; i++) { t += passo; passo *= RAZAO; }
  return Math.round(t);
};

export const msTotal = () =>
  MS_ESCURECER + MS_SILHUETA + msDaAlternancia() + MS_ESTOURO + MS_REVELACAO;

/* A cor do tipo. O pack declara as cores de tipo desde a arena; reusá-las é o
   que faz a transição pertencer àquela criatura. */
export const corDoTipo = dex => {
  const e = (PACK.especies ?? []).find(x => x.dex === dex);
  const t = (e?.t ?? [])[0];
  return PACK.tipos?.cores?.[t] ?? 'var(--ac, #5ee7ff)';
};

const espDe = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* ── O DESENHO ────────────────────────────────────────────────────────────
 *
 * Devolve o HTML da cena. Puro: recebe os dois dex e devolve texto, então dá
 * para conferir a estrutura sem navegador — a animação em si é CSS. */
export function montar(de, para) {
  return `
    <div class="evoCena" style="--corEvo:${corDoTipo(para)}">
      <div class="evoAneis" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="evoPalco">
        <img class="evoForma evoDe"   src="" alt="" data-dex="${de}">
        <img class="evoForma evoPara" src="" alt="" data-dex="${para}">
      </div>
      <div class="evoEstouro" aria-hidden="true"></div>
      <p class="evoTexto" role="status"></p>
      <button class="evoPular" type="button" data-evo-pular="1">pular</button>
    </div>`;
}

/* As frases, na ordem em que aparecem. Escritas aqui e não no CSS porque texto
   é conteúdo, e conteúdo não mora em folha de estilo. */
export const falaDe = (fase, de, para) => {
  const a = nomeExibido(espDe(de).n), b = nomeExibido(espDe(para).n);
  if (fase === 'silhueta') return `${a} está evoluindo!`;
  if (fase === 'revelacao') return `${a} evoluiu para ${b}!`;
  return '';
};
