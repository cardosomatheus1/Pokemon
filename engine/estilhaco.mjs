/* O ESTILHAÇO — a Essência ganha uso (bloco 1.29, camada 0).
 *
 * ── O BURACO QUE ELE FECHA, MEDIDO ANTES DE MEXER ────────────────────────
 *
 * `tools/medir-drops.mjs`, 20.000 Vigílias:
 *
 *     Essência   52,85% de tudo que cai   ·   9,197 por Vigília
 *
 * **Metade de tudo que o jogo entregava não servia para nada.** Não era um
 * item esquecido: era a maior torneira do jogo despejando em terra. O dono
 * cobrou por escrito: *"hoje se dropam as essências mas até momento sem uso"*.
 *
 * ── AS DUAS DECISÕES DIFÍCEIS SÃO DELE, E ESTÃO CERTAS ───────────────────
 *
 *     SETE PARTES viram um item   um held item comprado direto tornaria a
 *                                 expedição desnecessária. Sete partes fazem
 *                                 a essência virar PROGRESSO VISÍVEL sem
 *                                 tirar o motivo de sair a campo
 *     o estilhaço é SORTEADO      "escolher tiraria a frustração; sortear
 *                                 mantém a paciência como custo real"
 *
 * ── E O SORTEIO SÓ FECHA PORQUE O BOLO É DO BIOMA ────────────────────────
 *
 * Medindo, apareceu o nó: com os itens todos no mesmo bolo, juntar SETE IGUAIS
 * por sorteio puro é o problema do colecionador de figurinhas. Meses para o
 * primeiro item, e "paciência" vira desistência.
 *
 * A saída estava na primeira linha da ficha do próprio dono:
 *
 *   > "HELD ITEMS DALI — mostra o que cai naquele bioma; a aba vira mapa da rota"
 *
 * O bolo é o do BIOMA. Com um ou dois itens por rota, sete iguais é
 * alcançável — e **ONDE farmar vira a decisão de verdade**, que é exatamente o
 * que a aba promete. Sortear continua custando paciência sem custar meses.
 *
 * ── E ELE NÃO CONHECE NENHUM ITEM ────────────────────────────────────────
 *
 * Este arquivo recebe o catálogo por argumento. Quem é "Rocha Gélida" e o que
 * é "gelo" é TEMA, e o §0.3 é claro sobre onde esses nomes moram.
 */

/* Sete, e o número é do dono. Menos tornaria a expedição dispensável; mais
   faria a primeira montagem demorar tanto que ninguém veria a segunda. */
export const PARTES = 7;

/* ── A CURVA, APROVADA PELO DONO EM 09/09/2026 ───────────────────────────
 *
 * Ela é ancorada em DIAS DE FARM e não em gosto — que é o que a **L-135**
 * cobra do preço da loja, e vale igual aqui.
 *
 *     faixa        por estilhaço    sete partes     dias de farm
 *     comum              10               70            ~3
 *     incomum            15              105            ~4,5
 *     raro               25              175            ~7,6
 *     muitoRaro          45              315           ~13,7
 *     lendário           80              560           ~24
 *
 * A mira é: um item RARO custa cerca de uma semana, um MUITO RARO cerca de
 * duas. Abaixo disso a essência para de ser moeda de paciência; acima, o item
 * deixa de ser objetivo e vira paisagem.
 */
export const POR_ESTILHACO = {
  comum: 10, incomum: 15, raro: 25, muitoRaro: 45, lendario: 80,
};

/* ── A RENDA DE UM DIA, MEDIDA ───────────────────────────────────────────
 *
 * Ela é o denominador da âncora, e por isso mora aqui em vez de ficar num
 * comentário: o teste divide por ela, e um número que só existe em prosa não
 * pode ser afirmado.
 *
 *     9,197   essências por Vigília       medido em 20.000 Vigílias
 *     ~12     encontros por Vigília
 *     30      encontros de teto por dia   (§P5, o piso — ele sobe com a dex)
 *     ≈ 2,5   Vigílias por dia  ⟹  ~23 essências por dia
 *
 * O teto SOBE com o registro de espécies, então este é o número de quem está
 * começando. Calibrar pelo piso é calibrar pelo pior caso, que é o certo:
 * quem já subiu o teto chega mais cedo, e ninguém fica de fora. */
export const DIAS_DE_FARM = {
  ESSENCIA_POR_VIGILIA: 9.197,
  VIGILIAS_POR_DIA: 2.5,
  ESSENCIA_POR_DIA: 23,
};

/* A faixa desconhecida cai na mais barata — nunca em zero. De graça é o pior
   preço: ele apaga a decisão em vez de facilitá-la. */
export const custoDoEstilhaco = faixa =>
  POR_ESTILHACO[faixa] ?? POR_ESTILHACO.comum;

/* UMA conta e não duas: o preço do item é derivado do preço da parte. Dois
   números para o mesmo preço divergem no dia em que um for calibrado. */
export const custoDoItem = faixa => PARTES * custoDoEstilhaco(faixa);

/* ── AS PORTAS QUE O ESTILHAÇO ABRE ──────────────────────────────────────
 *
 * `troca` e `drop` — e é literalmente a primeira linha da ficha do dono:
 *
 *   > "HELD ITEMS DALI — mostra o que cai naquele bioma"
 *
 * O baú fica DE FORA. Os itens de `bau` são a recompensa do estágio limpo no
 * Avanço (§7.22.8), e dar a eles uma segunda porta esvaziaria o baú: a run
 * deixaria de ter o que entregar, e "falhar custa o baú" pararia de custar.
 *
 * ── E FOI A SABOTAGEM QUE ACHOU O TAMANHO CERTO DO BOLO ──────────────────
 *
 * A primeira versão levava só `troca`, e o resultado foi **um item por
 * bioma**. Sabotando o sorteio para devolver sempre o primeiro do bolso, a
 * suíte ficou VERDE — e ela estava certa: com um item só, não existe sorteio.
 *
 *   > Uma decisão de desenho que o código não consegue exercer não é uma
 *   > decisão: é um comentário. E a do dono era clara — "sortear mantém a
 *   > paciência como custo real".
 *
 * Com `drop` junto, cada rota tem dois ou três, e o sorteio volta a existir
 * sem chegar perto do colecionador de figurinhas. */
export const PORTAS = ['troca', 'drop'];

/* O que se pode estilhaçar naquele bioma. `fonte` e `porta` são do catálogo
   do tema — o motor só filtra. */
export const bolsoDoBioma = (itens, bioma) =>
  (itens ?? []).filter(i => PORTAS.includes(i?.porta) && i.fonte === bioma);

/* ── O SORTEIO ──────────────────────────────────────────────────────────
 *
 * Determinístico a partir da semente, como tudo neste projeto (§P3). Sem isso
 * o jogador aprenderia a recarregar a página até vir a parte que falta — e a
 * paciência que o desenho cobra viraria paciência com o botão F5.
 *
 * Devolve `null` quando o bioma não tem bolso, em vez de lançar: farmar numa
 * rota sem porta é normal, e uma exceção ali derrubaria a colheita inteira por
 * causa de uma torneira vazia.
 */
export function sortearEstilhaco(sorte, { itens = [], bioma = null } = {}) {
  const bolso = bolsoDoBioma(itens, bioma);
  if (!bolso.length) return null;
  const r = typeof sorte === 'function' ? sorte() : Number(sorte) || 0;
  const i = Math.min(bolso.length - 1, Math.floor(Math.abs(r) * bolso.length));
  return bolso[i];
}

/* ── A TROCA, E A RECUSA QUE DIZ QUANTO FALTA ───────────────────────────
 *
 * É o D-067 na porta do material: ter saldo na tela e ouvir "não" é a pior
 * forma de ensinar uma regra. */
export function podeTrocar({ faixa = 'comum', essencia = 0 } = {}) {
  const custo = custoDoEstilhaco(faixa);
  if (essencia < custo)
    return { pode: false, custo, faltam: custo - essencia,
             motivo: `faltam ${custo - essencia} de Essência para este estilhaço` };
  return { pode: true, custo };
}

/* ── O QUE JÁ DÁ PARA MONTAR, E O QUE FALTA ─────────────────────────────
 *
 * As DUAS listas, e a segunda é a que importa: sem "faltam três", o jogador
 * não sabe se está perto — e não saber se está perto é o que faz ele parar.
 *
 * Entra um mapa `{ idDoItem: quantasPartes }`. */
export function montaveis(partes = {}) {
  const prontos = [], faltando = [];
  for (const [id, n] of Object.entries(partes ?? {})) {
    const quantas = Math.max(0, Math.floor(Number(n) || 0));
    if (quantas >= PARTES) prontos.push({ id, quantas, montaveis: Math.floor(quantas / PARTES) });
    else if (quantas > 0) faltando.push({ id, quantas, faltam: PARTES - quantas });
  }
  /* Ordenado por quem está MAIS PERTO: a lista responde "o que eu pego a
     seguir" sem o jogador ter de comparar sete linhas. */
  faltando.sort((a, b) => a.faltam - b.faltam);
  return { prontos, faltando };
}

/* ── MONTAR ──────────────────────────────────────────────────────────────
 *
 * Sete partes DO MESMO item. É o coração da coisa: sete estilhaços quaisquer
 * não são um item, senão bastaria acumular volume e o bioma pararia de
 * importar.
 *
 * Consome exatamente sete e devolve a sobra — deixar a sobra sumir junto seria
 * cobrar do jogador partes que ele não usou. */
export function montar(lista = []) {
  const conta = {};
  for (const id of lista ?? []) conta[id] = (conta[id] ?? 0) + 1;
  const [id, n] = Object.entries(conta).find(([, q]) => q >= PARTES) ?? [];
  if (!id) return { montou: false, consumiu: 0, sobra: (lista ?? []).length };
  return { montou: true, id, consumiu: PARTES, sobra: n - PARTES };
}
