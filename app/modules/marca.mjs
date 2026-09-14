/* A MARCA, PARTIDA EM DUAS.
 *
 * O letrado do projeto desenha o nome em duas peças com tratamentos
 * diferentes: a primeira em branco com brilho, a segunda em gradiente
 * recortado. Isso é `<i>` e `<b>` no HTML, e o CSS já existe desde a
 * identidade visual — ver `.letrado` no `index.html`.
 *
 * ── POR QUE UMA FUNÇÃO, E NÃO `<i>Poké</i><b>Arena</b>` NO HTML ────────────
 *
 * Porque o nome NÃO é nosso para escrever. O `CLAUDE.md` fecha a questão numa
 * linha: "Manter o motor agnóstico ao tema. Nenhum identificador da franquia
 * fora do ContentPack." O nome vem de `ROTULOS.arena`, e o pack é quem o
 * declara — hoje `PokéArena`, amanhã outro.
 *
 * Escrever as duas metades à mão no HTML seria trazer o identificador de volta
 * para dentro do app, e o teste `test/conteudo.mjs` existe justamente para
 * pegar esse vazamento. A função parte o que o pack deu.
 *
 * ── ONDE PARTIR ───────────────────────────────────────────────────────────
 *
 * Na ÚLTIMA maiúscula que não seja a primeira letra. `PokéArena` → `Poké` +
 * `Arena`, que é exatamente a divisão que o desenho da marca usa. Nome de uma
 * palavra só, sem maiúscula interna, volta inteiro na primeira peça e a segunda
 * fica vazia — o letrado continua desenhando, com um tratamento em vez de dois.
 *
 * É uma regra tipográfica, não uma tabela de nomes: uma tabela precisaria ser
 * atualizada a cada pack, e ninguém lembraria.
 */
export function partirMarca(nome) {
  const s = String(nome ?? '');
  let corte = 0;
  for (let i = s.length - 1; i > 0; i--) {
    const c = s[i];
    if (c === c.toUpperCase() && c !== c.toLowerCase()) { corte = i; break; }
  }
  return corte > 0
    ? { um: s.slice(0, corte), dois: s.slice(corte) }
    : { um: s, dois: '' };
}

/* ══════════════════════════════════════════════════════════════════════════
 * A ARTE DA MARCA (R26)
 *
 * O dono desenhou a marca — símbolo, letrado e os dois juntos. Ela substitui o
 * desenho em CSS onde estiver declarada.
 *
 * ── POR QUE O CSS FICA ─────────────────────────────────────────────────────
 *
 * Porque nem todo pack tem arte. O `original_v1` não tem, e um dia terá a dele.
 * Um pack sem `marca` continua desenhando o nome com `.letrado`, que é a mesma
 * peça que sempre existiu — a arte é um ACRÉSCIMO, não uma dependência.
 *
 * Isto não é cautela genérica: é a diferença entre "o tema novo abre sem marca"
 * e "o tema novo abre com o nome escrito à mão pela tipografia da casa".
 *
 * ── O QUE CADA PEÇA RESOLVE ────────────────────────────────────────────────
 *
 *   logo          o símbolo sozinho — cabe onde não há largura para o nome
 *   letrado       o nome desenhado — a barra do topo, onde o símbolo já está
 *   logoLetrado   as duas juntas — o herói, onde há espaço para a marca inteira
 *
 * O `alt` sai do rótulo do pack, e não de um texto fixo: leitor de tela e busca
 * leem o nome do tema em uso, não o nome que estava aqui quando o código foi
 * escrito.
 */

/* Caminho relativo ao `app/`, que é de onde o `index.html` é servido. O pack
   declara a partir da RAIZ do projeto — ele não sabe (nem deve saber) de que
   pasta a página é carregada. */
const daRaiz = caminho => '../' + String(caminho).replace(/^\.\.\//, '');

/* Devolve o HTML da marca, ou `null` quando o pack não declara arte — e `null`
   é a resposta certa, não uma string vazia: quem chama precisa distinguir "não
   há arte" de "há arte e ela é nada", para poder cair no letrado em CSS. */
export function marcaEmArte(pack, peça = 'letrado', extra = '') {
  const marca = pack?.marca;
  if (!marca) return null;
  const src = marca[peça] ?? marca.letrado ?? marca.logo;
  if (!src) return null;
  const nome = pack?.rotulos?.arena ?? 'Arena';
  return `<img class="marcaArte" src="${daRaiz(src)}" alt="${nome}" ${extra}>`;
}

/* O CAMINHO DE SEMPRE, como STRING — simétrico ao `marcaEmArte`.
 *
 * As duas metades do nome, cada uma na sua peça: `<i>` recebe o tratamento em
 * branco com brilho, `<b>` o gradiente recortado. É o desenho da marca, e ele
 * depende de as duas peças existirem — texto solto no elemento perde os dois
 * tratamentos e o letrado vira uma linha comum.
 *
 * Devolver string em vez de escrever no elemento é o que torna este caminho
 * testável: a sabotagem `S334` passou ilesa uma vez justamente porque ele só
 * roda quando o pack NÃO tem arte, e o pack em uso tem — nenhum teste o
 * alcançava. Agora ele é uma função que devolve texto, e texto se confere.
 *
 * O ESCAPE é obrigatório porque o nome vem do pack, que é dado: um pack com
 * `<` no nome injetaria markup na barra do topo. */
const escapar = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function marcaEmLetrado(pack) {
  const p = partirMarca(pack?.rotulos?.arena ?? 'Arena');
  return `<i>${escapar(p.um)}</i><b>${escapar(p.dois)}</b>`;
}

/* Desenha a marca no elemento: a arte do pack quando houver, e o letrado em
   CSS quando não houver. Devolve qual dos dois caminhos foi usado, para quem
   chama poder ajustar o layout — as duas peças ocupam espaços diferentes. */
export function pintarMarca(el, pack, peça = 'letrado') {
  if (!el) return null;
  const arte = marcaEmArte(pack, peça);
  if (arte) { el.innerHTML = arte; return 'arte'; }
  el.innerHTML = marcaEmLetrado(pack);
  return 'css';
}
