/* AS LINHAS EVOLUTIVAS — quem vira quem, e sob que condição (bloco 1.1, §7.9).
 *
 * Fronteira: entra um pack e uma instância, sai "em que ela pode virar agora".
 * Puro, sem DOM, sem estado e sem tema. As linhas são DADO do pack, como manda
 * o §0.3 — este arquivo não sabe o nome de nenhuma criatura.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A condição é uma TABELA de campos comparáveis, e não um `switch` de casos.**
 *
 * O jeito óbvio seria `por: 'nivel' | 'pedra' | 'troca'` e três ramos de código.
 * Funciona hoje e cobra caro amanhã: o dono do projeto fixou que acrescentar uma
 * geração tem de ser MUDAR DADO, não mudar código — e a Gen 2 traz evolução por
 * afinidade, por hora do dia, por item segurado. Cada uma seria um ramo novo.
 *
 * Aqui a aresta declara o que EXIGE, e o motor só sabe comparar:
 *
 *     { de: 1,  para: 2,  exige: { nivel: 16 } }
 *     { de: 30, para: 31, exige: { item: 'lua' } }
 *     { de: 64, para: 65, exige: { item: 'elo' } }
 *
 * `exige` é conjunção: TODAS as chaves têm de valer. Uma evolução da Gen 2 que
 * peça nível 30 E afinidade alta já cabe hoje — `{ nivel: 30, vinculo: 220 }` —
 * sem uma linha deste arquivo mudar. É por isso que `vinculo` está na instância
 * desde o começo, mesmo sem uso: era este o uso.
 *
 * Chave que o motor não conhece NÃO libera a evolução — e o teste do pack grita.
 * O contrário (ignorar o desconhecido e evoluir assim mesmo) daria evolução de
 * graça no dia em que alguém escrevesse `vinculoo` no dado, e uma criatura
 * evoluída de graça é preço de mercado errado.
 *
 * ── A TROCA VIROU O ELO DE LIGAÇÃO ────────────────────────────────────────
 *
 * No material de origem, quatro linhas evoluem POR TROCA entre dois
 * jogadores. Aqui não há troca — e não vai haver, porque troca livre é a porta
 * dos fundos do mercado: dois jogadores combinando fora do jogo furam qualquer
 * regra de preço que o §25 imponha.
 *
 * Então essas quatro passam a exigir um ITEM, o **Elo de Ligação**. É a nossa
 * diferença nomeada (CLAUDE.md, "Ao copiar de outro jogo"): a raridade que a
 * troca dava vira raridade de item, que o jogo CONTROLA — a fidelidade da linha
 * evolutiva fica de pé, e o preço dela deixa de depender de dois estranhos
 * combinando algo que não podemos ver.
 */

/* Os campos que o motor sabe comparar. Numéricos são "pelo menos"; `item` é
   presença na bolsa. Acrescentar um campo aqui é acrescentar uma FAMÍLIA de
   evoluções possíveis, e é a única razão para este arquivo mudar. */
export const CONDICOES = {
  nivel:   (inst, alvo) => (inst?.nivel ?? 0) >= alvo,
  vinculo: (inst, alvo) => (inst?.vinculo ?? 0) >= alvo,
  item:    (inst, alvo, ctx) => (ctx?.itens ?? []).includes(alvo),
};

/* As chaves que a aresta pede e o motor não conhece. Vazio é o normal. */
export const exigenciasDesconhecidas = exige =>
  Object.keys(exige ?? {}).filter(k => !(k in CONDICOES));

/* Para onde esta espécie pode ir. Pode ser mais de um — e é: uma linha que se
   abre em três é conteúdo, não anomalia. */
export const saidasDe = (pack, dex) =>
  (pack.evolucoes ?? []).filter(e => e.de === dex);

/* De onde ela veio. No máximo uma — o teste do pack garante isso, porque duas
   entradas dariam duas bases para a mesma criatura e o registro não fecharia. */
export const entradaDe = (pack, dex) =>
  (pack.evolucoes ?? []).find(e => e.para === dex) ?? null;

/* A base da linha. O teto de passos existe para que um dado com ciclo devolva
   resposta errada em vez de travar o jogo — e o teste de ciclo é que reprova. */
export function baseDe(pack, dex, teto = 8) {
  let atual = dex;
  for (let i = 0; i < teto; i++) {
    const e = entradaDe(pack, atual);
    if (!e) return atual;
    atual = e.de;
  }
  return atual;
}

/* Em que estágio ela está: 1 é base. */
export function estagioDe(pack, dex, teto = 8) {
  let atual = dex, n = 1;
  for (let i = 0; i < teto; i++) {
    const e = entradaDe(pack, atual);
    if (!e) return n;
    atual = e.de; n++;
  }
  return n;
}

/* A linha inteira a partir da base — tudo que é alcançável, inclusive os ramos.
   É o que o registro vai desenhar. */
export function linhaDe(pack, dex) {
  const raiz = baseDe(pack, dex);
  const vistos = new Set([raiz]);
  const fila = [raiz];
  while (fila.length) {
    for (const e of saidasDe(pack, fila.shift()))
      if (!vistos.has(e.para)) { vistos.add(e.para); fila.push(e.para); }
  }
  return [...vistos];
}

/* As evoluções que ESTA instância pode fazer AGORA, com o que ela tem.
   `ctx.itens` é a bolsa do jogador. */
export function evolucoesDisponiveis(pack, inst, ctx = {}) {
  return saidasDe(pack, inst?.especie).filter(e => {
    if (exigenciasDesconhecidas(e.exige).length) return false;
    return Object.entries(e.exige ?? {})
      .every(([k, v]) => CONDICOES[k](inst, v, ctx));
  });
}

/* EVOLUIR PRESERVA TUDO MENOS A ESPÉCIE. Esta linha é econômica, não técnica.
 *
 * O potencial é sorteado UMA vez, na captura, e viaja pela linha inteira sem
 * mudar. É o que faz um filhote de potencial alto valer dinheiro: quem compra
 * está comprando o número, e o número tem de ser o mesmo depois de evoluir.
 *
 * Se evoluir re-sorteasse — ou só empurrasse os ocultos para cima — o mercado
 * inteiro perderia o pé: ninguém pagaria por um filhote bom se o resultado final
 * fosse decidido depois da venda. E o caminho contrário seria pior: quem vende
 * evoluído estaria vendendo um sorteio que o comprador não viu acontecer.
 *
 * `forma` e `potencial` saem dos ocultos, então acompanham sozinhos. O nível NÃO
 * é reposto: evoluir não é renascer. */
export function evoluir(inst, aresta) {
  return { ...inst, especie: aresta.para };
}
