/* QUAL FOLHA O BICHO USA AGORA — camada 0, sem DOM.
 *
 * ── O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR (D-091) ───────────────
 *
 * O dono cobrou a mesma tela por três dias:
 *
 *   > "as sprites continuam bugadas sem sair os efeitos de ataque, e os
 *   >  pokémon selvagem ficam sumindo as sprite"
 *
 * A escolha da folha era esta linha, dentro da cena:
 *
 *     const anim = batendo && grade.a ? 'a' : (apanhando && grade.h ? 'h' : 'w');
 *
 * `grade` é a TABELA do PMD, e ela tem `a` e `h` para as 146 espécies. O que
 * havia em disco eram 76. Então o bicho trocava para uma folha que não existe,
 * o `background-image` vinha vazio, e ele SUMIA no instante exato em que batia
 * ou apanhava — enquanto a placa de nome, que é outro elemento, continuava lá.
 * É por isso que as capturas do dono mostram "Jigglypuff 0/100" pairando sobre
 * o nada.
 *
 *   > A tabela diz o que a arte PODERIA ter. Só o carregamento diz o que ela
 *   > TEM. Perguntar à tabela é perguntar a quem não sabe.
 *
 * ── ENTÃO A ESCOLHA PASSA A DEPENDER DO QUE CARREGOU ─────────────────────
 *
 * `marcarFolha(url, deu)` guarda o veredito de cada endereço, e `animDoMomento`
 * só usa a folha do momento quando o veredito é `true`. Três estados, e os três
 * importam:
 *
 *     true        carregou      -> pode usar
 *     false       não existe    -> cai na caminhada, para sempre
 *     undefined   ninguém sabe  -> cai na caminhada, ATÉ a sonda responder
 *
 * O terceiro é o que impede o buraco de um quadro: enquanto a resposta não
 * chega, o bicho continua o bicho. Degradar para o que já estava certo é
 * sempre melhor que mostrar vazio — e vazio, aqui, é a criatura sumindo.
 *
 * ── E POR QUE ISTO NÃO MORA NA CENA ──────────────────────────────────────
 *
 * Porque lá ele morreria junto do `style.backgroundImage`, e conta colada em
 * estilo inline só pode ser conferida com navegador. Este bloco é a sétima vez
 * que essa lição aparece; ela já custou seis defeitos plantados que escaparam
 * do portão Q2, todos pelo mesmo motivo:
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * Aqui a decisão é uma função de dados para dados. A parte que precisa de
 * navegador — pedir a imagem e ver se ela veio — é uma linha só, do lado de
 * fora, e ela não decide nada.
 */

/* A folha que sempre existe. As 146 espécies têm `Walk-Anim.png`, e é ela que
   sustenta o corpo do bicho quando qualquer outra falta. */
export const FOLHA_BASE = 'w';

/* endereço -> carregou? `undefined` quer dizer "ainda não perguntei", e a
   diferença entre isso e `false` é o que evita o buraco de um quadro. */
const veredito = new Map();

export function marcarFolha(url, deu) { veredito.set(String(url), !!deu); }
export const vereditoDa = url => veredito.get(String(url));
export function esquecerFolhas() { veredito.clear(); }
export const quantasFolhas = () => veredito.size;

/* Quantas foram REPROVADAS. É o número que a esteira mostra: uma folha
   reprovada não é erro — é arte que a origem não tem — mas dezenas delas
   querem dizer que o `npm run assets` não passou por aqui. */
export const quantasFaltam = () => [...veredito.values()].filter(v => !v).length;

/* ── A ESCOLHA ────────────────────────────────────────────────────────────
 *
 * `batendo` vence `apanhando`: quem bate e apanha no mesmo quadro está
 * atacando, e é o ataque que o jogador precisa ler. A ordem inversa faria o
 * golpe do bicho desaparecer toda vez que ele levasse um no mesmo instante —
 * que é justamente o caso comum de um duelo. */
export function animDoMomento(momento, grade, urlDe, saber = vereditoDa) {
  const { batendo = false, apanhando = false } = momento ?? {};
  const querida = batendo ? 'a' : apanhando ? 'h' : FOLHA_BASE;
  if (querida === FOLHA_BASE) return FOLHA_BASE;
  /* A tabela ainda vale como PRIMEIRO filtro — ela diz quantos quadros a folha
     tem, e sem essa entrada não há como recortá-la. Ela só deixou de ser a
     ÚLTIMA palavra. */
  if (!grade?.[querida]) return FOLHA_BASE;
  return saber(urlDe(querida)) === true ? querida : FOLHA_BASE;
}

/* ── O QUE A CENA PRECISA PEDIR ANTES DE PRECISAR ─────────────────────────
 *
 * Um bicho que entra na wave vai bater em poucos segundos. Perguntar pela
 * folha só no golpe garante que o PRIMEIRO golpe saia com a caminhada — e o
 * primeiro golpe de cada bicho é metade dos golpes de uma wave de quatro.
 *
 * Então a cena sonda ao ENTRAR, e no golpe a resposta já está guardada. Esta
 * função diz quais endereços valem sondar: os que a tabela promete e sobre os
 * quais ninguém perguntou ainda. */
export function aSondar(grade, urlDe, saber = vereditoDa) {
  const fila = [];
  for (const k of ['a', 'h']) {
    if (!grade?.[k]) continue;
    const url = urlDe(k);
    if (saber(url) === undefined) fila.push(url);
  }
  return fila;
}
