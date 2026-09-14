/* A LOJA — o que ela vende, o que ela paga, e as duas trocas (bloco 1.25).
 *
 * ── ONDE ELA MORA, E POR QUÊ ─────────────────────────────────────────────
 *
 * No motor, e não no app: comprar e vender mexem em SALDO, e saldo é a coisa
 * que este projeto mais protege. A mesma função tem de servir ao navegador hoje
 * e ao servidor no dia em que ele for ligado — foi assim que a carteira e a
 * expedição foram feitas, e é o que torna aquele dia uma troca de persistência
 * em vez de uma reescrita.
 *
 * Nenhum identificador de tema aqui (§0.3): a loja recebe o pack e pergunta.
 *
 * ── O QUE ELA VENDE VEM DO CATÁLOGO, E NÃO DE UMA LISTA PRÓPRIA ──────────
 *
 * `porta: 'loja'` já existia no catálogo desde o 1.12, com preço. Escrever aqui
 * uma segunda lista seria a mesma forma que já custou três correções neste mês —
 * o nome do item em três telas, a cor das faixas em três telas, a casa da bola
 * em dois arquivos.
 *
 *   > Quem sabe o número é quem o declara. Todo o resto pergunta.
 *
 * ── O QUE ELA PAGA É UMA REGRA, E NÃO UM PREÇO POR ITEM ──────────────────
 *
 * Dezenove itens caem de expedição e nenhum tem preço de compra. Escrever
 * dezenove números à mão seria dezenove lugares para desequilibrar o jogo, e
 * nenhum deles com um motivo escrito ao lado.
 *
 * Então o preço de venda sai de DUAS fontes, nesta ordem:
 *
 *     tem preço de compra   ->  paga uma FRAÇÃO dele
 *     não tem               ->  paga o valor da FAIXA de raridade
 *
 * A fração existe para a loja não ser uma torneira: comprar e vender o mesmo
 * item tem de ser prejuízo, ou o jogador farma dinheiro clicando duas vezes.
 *
 * ── E A VENDA NÃO PODE VIRAR IMPRESSORA ──────────────────────────────────
 *
 * O teto diário de encontros é o que limita quantos itens entram por dia — a
 * venda herda esse limite e não cria um novo. Mas os VALORES aqui ainda não
 * passaram pelo estudo de economia; eles são a primeira calibragem, escolhida
 * para ser conservadora, e a L-135 registra a conta que falta.
 */

/* A loja paga 40% do preço de compra. Abaixo disso a venda vira desprezível e
   o jogador acumula lixo; acima de 50% a dupla compra-vende deixa de ser
   prejuízo em qualquer arredondamento. */
export const FRACAO_DE_VENDA = 0.4;

/* O valor de quem não tem preço de compra, por faixa. Eles saem da mesma escala
   de raridade que a expedição usa, e a razão entre degraus é ~2,5 — a mesma
   ordem de grandeza da queda de peso entre faixas, para o preço acompanhar a
   dificuldade em vez de contrariá-la. */
export const VALOR_DA_FAIXA = {
  comum: 30, incomum: 75, raro: 190, muitoRaro: 480, lendario: 1200,
};

const item = (pack, id) => (pack?.catalogo ?? []).find(i => i.id === id) ?? null;

/* ── O QUE A LOJA VENDE ─────────────────────────────────────────────────
 *
 * Ordenado por preço, do mais barato para o mais caro: uma vitrine é lida de
 * cima para baixo, e a decisão do jogador quase sempre é "o que cabe no que eu
 * tenho". Ordem alfabética faria ele procurar. */
export function aVenda(pack) {
  return (pack?.catalogo ?? [])
    .filter(i => i.porta === 'loja' && Number.isFinite(i.preco) && i.preco > 0)
    .sort((a, b) => a.preco - b.preco);
}

export const precoDeCompra = (pack, id) => {
  const i = item(pack, id);
  return i && i.porta === 'loja' && Number.isFinite(i.preco) ? i.preco : null;
};

/* ── O QUE A LOJA PAGA ──────────────────────────────────────────────────
 *
 * `null` quando o item não pode ser vendido — e não zero. A distinção importa
 * na tela: "não compro isto" e "compro por zero" são frases diferentes, e um
 * zero desenhado como preço ensina o jogador que o item é lixo quando ele pode
 * ser a peça de uma evolução. */
export function precoDeVenda(pack, id) {
  const i = item(pack, id);
  if (!i) return null;
  const compra = precoDeCompra(pack, id);
  if (compra != null) return Math.max(1, Math.floor(compra * FRACAO_DE_VENDA));
  const v = VALOR_DA_FAIXA[i.faixa];
  return Number.isFinite(v) ? v : null;
}

/* Tudo que a loja aceita, com o preço — inclusive o que o jogador NÃO tem.
 *
 * É a boa ideia que o dono teve: **um catálogo que mostra o que você ainda não
 * tem, com o preço, transforma a loja num mapa de objetivos.** Quem vê que a
 * Pedra do Fogo vale 480 sabe o que procurar antes de tê-la. */
export function aceita(pack) {
  return (pack?.catalogo ?? [])
    .map(i => ({ ...i, valor: precoDeVenda(pack, i.id) }))
    .filter(i => i.valor != null)
    .sort((a, b) => b.valor - a.valor);
}

/* ── AS DUAS TROCAS ─────────────────────────────────────────────────────
 *
 * As duas RECUSAM em vez de corrigir, e devolvem um novo estado em vez de mutar
 * — mesma forma do `creditar` e do `aplicar` da evolução. Corrigir em silêncio
 * (comprar 3 quando só cabem 2) é o que faz um jogador desconfiar do próprio
 * saldo, e é o oposto do que a Spec §P1 pede.
 */
const moedaDe = pack => pack?.moedaPve?.id ?? 'moeda';
const quantosDe = (bolsa, id) => Math.max(0, Math.floor(Number(bolsa?.[id]) || 0));

export function comprar(estado, { pack, id, quantos = 1 }) {
  const n = Math.floor(Number(quantos) || 0);
  if (n <= 0) throw new Error('a quantidade precisa ser pelo menos 1');
  const preco = precoDeCompra(pack, id);
  if (preco == null) throw new Error('esta loja não vende este item');
  const moeda = moedaDe(pack);
  const saldo = quantosDe(estado?.bolsa, moeda);
  const total = preco * n;
  if (saldo < total)
    throw new Error(`faltam ${total - saldo} para levar ${n}`);
  const bolsa = { ...(estado?.bolsa ?? {}) };
  bolsa[moeda] = saldo - total;
  bolsa[id] = quantosDe(bolsa, id) + n;
  return { estado: { ...estado, bolsa }, gasto: total, levou: n };
}

export function vender(estado, { pack, id, quantos = 1 }) {
  const n = Math.floor(Number(quantos) || 0);
  if (n <= 0) throw new Error('a quantidade precisa ser pelo menos 1');
  const valor = precoDeVenda(pack, id);
  if (valor == null) throw new Error('esta loja não compra este item');
  const moeda = moedaDe(pack);
  if (id === moeda) throw new Error('não dá para vender a própria moeda');
  const tem = quantosDe(estado?.bolsa, id);
  if (tem < n) throw new Error(`você tem ${tem}, e não ${n}`);
  const bolsa = { ...(estado?.bolsa ?? {}) };
  bolsa[id] = tem - n;
  bolsa[moeda] = quantosDe(bolsa, moeda) + valor * n;
  return { estado: { ...estado, bolsa }, recebeu: valor * n, deu: n };
}

/* Quanto cabe no bolso, para a tela poder oferecer "levar o máximo" sem
   perguntar duas vezes ao motor. */
export const cabemQuantos = (estado, { pack, id }) => {
  const preco = precoDeCompra(pack, id);
  if (!preco) return 0;
  return Math.floor(quantosDe(estado?.bolsa, moedaDe(pack)) / preco);
};
