/* A VITRINE — o catálogo do que é cosmético e do que se compra (camada 0).
 *
 * Pedido do dono, e ele fechou o escopo na frase:
 *
 *   > "vai criar as abas da loja, outfits, banners, avatar, efeito de nome
 *   >  etc. FILTRE tudo que temos hoje de cosmético e você vai adicionar a
 *   >  essa loja"
 *
 * ── ELA NÃO PRECISA DE ARTE NOVA: PRECISA DE VITRINE ─────────────────────
 *
 * Contado, e não estimado (L-148): **115 peças cosméticas já construídas** —
 * 9 outfits, 64 de banner, 23 avatares, 5 arenas. A loja é a porta que faltava.
 *
 * ── POR QUE ISTO É MOTOR, E SEM UM NOME DE FRANQUIA DENTRO ───────────────
 *
 * Este arquivo não conhece nenhuma peça. Ele recebe as FAMÍLIAS por argumento
 * e devolve um catálogo plano — quem sabe o que é um "banner" e quem é "Red" é
 * o tema, e o §0.3 é claro sobre onde esses nomes moram.
 *
 * O ganho não é purismo: é que a mesma função serve o pack original quando ele
 * chegar, sem uma linha a mais.
 */

/* ── A PROCEDÊNCIA MORA AQUI, E NÃO EM CADA FAMÍLIA ──────────────────────
 *
 * Ela nasceu no acervo de trajes, e é exatamente o filtro que o dono pediu: o
 * dado já sabia dizer o que se compra. O que faltava era o mesmo campo nas
 * outras quatro famílias — e a L-148 já mandou COPIAR daqui em vez de
 * inventar:
 *
 *   > Uma segunda forma de dizer "isto se compra" seria a sexta ocorrência do
 *   > padrão que este projeto mais paga: duas verdades sobre a mesma coisa.
 */
export const PROCEDENCIAS = ['padrao', 'loja', 'fragmento', 'missao', 'npc'];

/* O que uma conta pode receber sem passar pela loja. `npc` fica de fora
   porque é peça de personagem, e não recompensa. */
export const CONCEDIVEIS = ['padrao', 'loja', 'fragmento', 'missao'];

export const procedenciaValida = p => PROCEDENCIAS.includes(p);

/* ── O PREÇO, E ELE É UMA RECOMENDAÇÃO ESCRITA ANTES DE CONSTRUIR ────────
 *
 * A **L-135** está aberta desde 03/09: os preços da loja nunca passaram pelo
 * estudo de economia, e ela continua aberta depois deste bloco. O que muda é
 * que ela deixa de esperar um número no ar e passa a ter um para julgar.
 *
 * ── O PRINCÍPIO, porque um número sem princípio não se discute ──────────
 *
 *   > O preço de um cosmético é proporcional à SUPERFÍCIE que ele ocupa e ao
 *   > TEMPO que ele fica na tela.
 *
 * Um avatar é um retrato pequeno; um traje é o boneco que anda pelo bioma por
 * horas. Cobrar o mesmo pelos dois seria dizer que o jogador compra "um item",
 * e ele não compra: ele compra o quanto de tela vira dele.
 *
 * ── A ÂNCORA, e ela é medida e não escolhida ────────────────────────────
 *
 * Uma conta nova nasce com **1.000** de saldo (`SALDO_INICIAL`, motor da
 * carteira). Com esta tabela ela compra UMA peça pequena ou UMA arena — e não
 * um armário inteiro.
 *
 *   > Uma loja que se esvazia na primeira sessão não é uma loja: é um
 *   > tutorial. E uma peça que ninguém alcança não é preço: é enfeite.
 *
 * A faixa de 250 a 1.250 põe a peça mais barata ao alcance do primeiro dia e a
 * mais cara a alguns dias de jogo. É a forma da curva que o estudo tem de
 * julgar — não os dígitos.
 */
export const PRECO_BASE = 250;

export const PESO_DA_FAMILIA = {
  avatar:   1,     /* o retrato: pequeno, e presente o tempo todo */
  moldura:  1.5,   /* a borda do banner */
  efeito:   2,     /* o efeito do banner */
  nome:     3,     /* o efeito de nome — a família nova */
  cena:     3,     /* o fundo do banner: o que mais muda a identidade */
  arena:    4,     /* ela pinta a batalha inteira — a maior superfície */
  outfit:   5,     /* o boneco no mundo, e ele anda na tela por horas */
};

export const precoDe = familia =>
  Math.round(PRECO_BASE * (PESO_DA_FAMILIA[familia] ?? 1));

/* ── O CATÁLOGO PLANO ────────────────────────────────────────────────────
 *
 * Entra um objeto `{ familia: [peças] }`, sai uma lista só. A loja precisa
 * perguntar "o que está à venda" UMA vez, e não uma vez por família — com uma
 * pergunta por família, acrescentar a sexta significa lembrar de seis lugares.
 *
 * `procedencia` ausente vale `padrao`, e isso é decisão: uma peça que ninguém
 * marcou não pode aparecer à venda por descuido. O silêncio é o lado seguro.
 */
export function catalogoDaVitrine(familias = {}) {
  const saida = [];
  for (const [familia, pecas] of Object.entries(familias)) {
    for (const p of pecas ?? []) {
      if (p?.id == null) continue;
      const procedencia = procedenciaValida(p.procedencia) ? p.procedencia : 'padrao';
      saida.push({
        familia, id: String(p.id), nome: p.nome ?? p.nm ?? String(p.id),
        procedencia, preco: precoDe(familia),
        /* A CARA DA PEÇA vem junto, e como DESCRITOR: o motor não monta
           marcação. Ninguém compra aparência sem ver a aparência — um preço
           sem produto é uma decisão que o jogador não tem como tomar. */
        arte: p.arte ?? null,
      });
    }
  }
  return saida;
}

/* O que a loja mostra: só o que foi DECLARADO comprável. */
export const aVendaNaVitrine = catalogo =>
  (catalogo ?? []).filter(p => p.procedencia === 'loja');

/* ── QUANTO A LOJA INTEIRA CUSTA ─────────────────────────────────────────
 *
 * Serve ao estudo da L-135 e à tela ao mesmo tempo: quem olha a vitrine quer
 * saber quanto falta para ter tudo, e quem calibra quer saber quantas horas de
 * jogo isso representa. Um número que responde as duas perguntas não precisa
 * ser calculado duas vezes. */
export const custoDaVitrine = catalogo =>
  aVendaNaVitrine(catalogo).reduce((a, p) => a + p.preco, 0);

/* ── O QUE JÁ É DELE ─────────────────────────────────────────────────────
 *
 * A posse é uma lista de chaves `familia:id`, e não um objeto por família:
 * cinco listas paralelas são cinco lugares para uma delas ficar para trás.
 */
export const chaveDa = p => `${p.familia}:${p.id}`;

export const temNaConta = (posse, p) =>
  (posse ?? []).includes(chaveDa(p));

/* ── PODE COMPRAR? E A RECUSA DIZ O PORQUÊ ───────────────────────────────
 *
 * Três negativas diferentes, e nenhuma delas é "não":
 *
 *     já é seu        comprar de novo seria cobrar duas vezes pelo mesmo
 *     não está à venda a peça existe e a porta dela é outra (missão, fragmento)
 *     falta saldo     e a tela diz quanto falta, não só que faltou
 *
 * É a mesma forma da recusa da carteira, e pelo mesmo motivo: ter saldo na
 * tela e ouvir "não" é o D-067 na porta do dinheiro.
 */
/* `contaOnline` (ST-1.3, D-108): com conta real a posse não tem onde ficar —
   o servidor não tem tabela de cosmético, e a carteira de lá devolve o saldo no
   próximo `hidratar()`. Vender assim é dar a peça. A recusa vem DEPOIS de "já
   tem" (o jogador precisa continuar sabendo o que é dele) e ANTES do saldo
   (dizer "faltam 40" para uma compra que não vai acontecer seria mentir). Ela
   some quando o E4 der à posse um lugar no servidor. */
export const MOTIVO_CONTA_ONLINE =
  'com conta online a boutique ainda não vende: a peça precisa de um lugar na sua conta, e ele está em construção';

export function podeComprar(catalogo, { familia, id, posse = [], saldo = 0, contaOnline = false }) {
  const peca = (catalogo ?? []).find(p => p.familia === familia && p.id === String(id));
  if (!peca) return { pode: false, motivo: 'essa peça não existe na vitrine' };
  if (peca.procedencia !== 'loja')
    return { pode: false, peca,
             motivo: `esta peça não se compra: ela vem de ${peca.procedencia}` };
  if (temNaConta(posse, peca))
    return { pode: false, peca, motivo: 'você já tem esta peça' };
  if (contaOnline)
    return { pode: false, peca, fechada: true, motivo: MOTIVO_CONTA_ONLINE };
  if (saldo < peca.preco)
    return { pode: false, peca, faltam: peca.preco - saldo,
             motivo: `faltam ${peca.preco - saldo} para esta peça` };
  return { pode: true, peca };
}
