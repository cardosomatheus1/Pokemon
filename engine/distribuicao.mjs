/* A ARITMÉTICA DA DISTRIBUIÇÃO — percentil, Gini, share do topo e razão.
 *
 * Entra uma lista de números, sai um número. Nenhum import, nenhum banco,
 * nenhum tema: é conta, e mora aqui porque `engine/` já é onde vivem `preco` e
 * `carteira` — a economia do jogo, separada da tela e do servidor.
 *
 * ── AS TRÊS DECISÕES QUE ESTE ARQUIVO TOMA E PRECISA DECLARAR ──────────────
 *
 * 1. PERCENTIL É POR POSTO, e não por interpolação. O número responde a uma
 *    pergunta sobre dinheiro de gente — "qual o saldo do jogador na mediana" —
 *    e o posto devolve um saldo que alguém realmente tem. A interpolação
 *    devolveria a média entre dois jogadores: um valor que ninguém tem,
 *    apresentado ao operador como se fosse a carteira de alguém.
 *
 * 2. AUSÊNCIA É `null`, NUNCA ZERO. "a mediana é 0" e "não há jogador
 *    nenhum" são fatos opostos, e desenhados iguais o operador lê o segundo
 *    como o primeiro. Todo caminho sem dado devolve `null` e deixa a tela
 *    decidir como dizer isso.
 *
 * 3. DIVISÃO POR ZERO NÃO VIRA `Infinity` NEM `NaN`. Um painel de auditoria que
 *    mostra `NaN` falha justamente no dia em que alguém foi olhá-lo.
 */

/* Só números finitos entram na conta. Um `null` no meio da lista viraria `0` na
   ordenação e mentiria para baixo em todas as quatro funções. */
const limpos = v => (Array.isArray(v) ? v : []).filter(Number.isFinite);

/* PERCENTIL POR POSTO MAIS PRÓXIMO.
   posto = ceil(p × n), preso em [1, n]. `p = 0` daria posto 0, que não existe:
   o menor valor é o percentil 0. */
export function percentil(valores, p) {
  const v = limpos(valores).sort((a, b) => a - b);
  if (!v.length) return null;
  const posto = Math.min(v.length, Math.max(1, Math.ceil(p * v.length)));
  return v[posto - 1];
}

/* GINI na forma ordenada:  G = 2·Σ(i·xᵢ)/(n·Σx) − (n+1)/n,  com i de 1 a n.
   O máximo numa população finita é (n−1)/n, e não 1 — quem tem tudo também é
   contado na população. */
export function gini(valores) {
  const v = limpos(valores).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return 0;
  const total = v.reduce((a, x) => a + x, 0);
  /* Ninguém tem nada. A desigualdade de uma população sem dinheiro é zero — e
     dizer `NaN` aqui seria trocar um fato por um defeito aparente. */
  if (total <= 0) return 0;
  let ponderado = 0;
  for (let i = 0; i < n; i++) ponderado += (i + 1) * v[i];
  return (2 * ponderado) / (n * total) - (n + 1) / n;
}

/* SHARE DO TOPO: que fatia do total está nas maiores `fracao` carteiras.
   O topo é arredondado PARA CIMA: com 5 carteiras, "top 1%" é 0,05 carteira, e
   zero carteiras devolveria 0 dizendo "o topo não tem nada", que é falso. Uma
   carteira é a menor amostra honesta do topo. */
export function shareDoTopo(valores, fracao) {
  const v = limpos(valores).sort((a, b) => b - a);
  const n = v.length;
  if (!n) return 0;
  const total = v.reduce((a, x) => a + x, 0);
  if (total <= 0) return 0;
  const k = Math.min(n, Math.max(1, Math.ceil(fracao * n)));
  let topo = 0;
  for (let i = 0; i < k; i++) topo += v[i];
  return topo / total;
}

/* RAZÃO com denominador zero declarado como AUSÊNCIA.
   `Infinity` é o valor tecnicamente correto e o pior possível aqui: o painel
   desenharia uma barra infinita para "ainda não houve sink nenhum", que é um
   fato perfeitamente saudável no primeiro dia de operação. */
export function razao(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}
