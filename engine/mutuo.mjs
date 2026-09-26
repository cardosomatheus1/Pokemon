/* A APURAÇÃO MÚTUA — o bolo onde a casa não toma posição (ST-12.1 · F2.1).
 *
 * Entram as entradas do bolo, quem venceu o mercado e dois parâmetros; sai
 * quanto cada entrada recebe e para onde vai cada moeda que ninguém recebe.
 * Nenhum import, nenhum banco, nenhum relógio: é conta, e mora no motor pela
 * mesma razão que `calibracao` e `preco`.
 *
 * Por que existe (Spec §6.2): com odd fixa `1/p · (1 − m)`, toda aposta rende
 * o mesmo valor esperado — ler a Arena melhor não paga. No bolo mútuo o preço
 * é formado por quem aposta, e quem lê melhor que os OUTROS ganha deles.
 *
 * ── A INVARIANTE ──────────────────────────────────────────────────────────
 *
 *   Σ pagamentos + taxa + resíduo + tesouraria == bruto
 *
 * Em inteiros, sempre. Mais que o bruto é a casa pagando do caixa (passivo
 * estrutural, que o §6.4 fixa em zero); menos é dinheiro sumindo sem destino.
 *
 * ── AS QUATRO DECISÕES QUE ESTE ARQUIVO DECLARA ──────────────────────────
 *
 * 1. A TAXA SAI EM PONTOS-BASE, E ARREDONDA PARA BAIXO.
 *    `0.29 × 100` é 28,999… em ponto flutuante: o piso ingênuo cobraria 28 com
 *    29% na tela. A taxa vira inteiro de pontos-base antes da conta, e o piso
 *    fica a favor do jogador.
 *
 * 2. O RATEIO É PISO, E O QUE SOBRA É RESÍDUO DECLARADO.
 *    Cada acertador recebe ⌊líquido × entrada / Σ entradas acertadoras⌋. O
 *    que o piso deixa (menos de 1 por entrada) vai ao resíduo, que o ledger
 *    lança como `MARKET_RESIDUE` (§6.11). Distribuir o resto "a quem chegou
 *    primeiro" seria uma regra de ordem que ninguém leu antes de entrar.
 *
 * 3. NINGUÉM ACERTOU: O DESTINO É PARÂMETRO, EXIBIDO ANTES (§6.4).
 *    `devolver` reparte o líquido entre todas as entradas, na proporção;
 *    `tesouraria` leva o líquido inteiro, e ele aparece no campo `tesouraria`
 *    — nunca misturado à taxa, porque os dois têm lançamentos diferentes.
 *
 * 4. ENTRADA INVÁLIDA É RECUSADA, NUNCA CONSERTADA.
 *    Mesma regra de `calibracao`: `erros()` devolve a lista, e `apurar` lança.
 *    Liquidação com dado estranho não liquida.
 */

export const SEM_ACERTO = Object.freeze({ DEVOLVER: 'devolver', TESOURARIA: 'tesouraria' });

/* 8% — igual à margem medida do mercado principal (§6.2: 0,89 a 0,93 de
   retorno). Com taxa menor o bolo vira a escolha óbvia; maior, a odd fixa. */
export const TAXA_PADRAO = 0.08;
/* Taxa acima disto não é taxa, é confisco — e quase sempre é erro de unidade
   (8 em vez de 0,08). */
const TAXA_MAX = 0.5;

const BP = 10000;
const pontosBase = taxa => Math.round(taxa * BP);

export function erros({ entradas, taxa, semAcerto, selecoes } = {}) {
  const e = [];
  if (typeof taxa !== 'number' || !Number.isFinite(taxa) || taxa < 0 || taxa > TAXA_MAX)
    e.push(`taxa inválida: ${taxa}`);
  if (!Object.values(SEM_ACERTO).includes(semAcerto)) e.push(`destino "sem acerto" desconhecido: ${semAcerto}`);
  if (!Array.isArray(entradas)) return [...e, 'entradas não é lista'];
  const validas = selecoes ? new Set(selecoes) : null;
  const ids = new Set();
  for (const x of entradas) {
    if (!x || (typeof x.id !== 'string' && typeof x.id !== 'number')) { e.push('entrada sem id'); continue; }
    if (ids.has(x.id)) e.push(`id repetido: ${x.id}`);
    ids.add(x.id);
    if (typeof x.valor !== 'number' || !Number.isSafeInteger(x.valor) || x.valor <= 0)
      e.push(`entrada ${x.id}: valor inválido ${x.valor}`);
    if (validas && !validas.has(x.selecao)) e.push(`entrada ${x.id}: seleção inexistente ${x.selecao}`);
  }
  return e;
}

/* ⌊a × b / c⌋ exato: com bolos de 10⁸ e entradas de 10⁶ o produto passa do
   inteiro seguro de um Number. */
const proporcao = (a, b, c) => Number(BigInt(a) * BigInt(b) / BigInt(c));

export function apurar({ entradas, vencedoras, taxa, semAcerto, selecoes }) {
  const problemas = erros({ entradas, taxa, semAcerto, selecoes });
  if (problemas.length) throw new Error(`bolo recusado: ${problemas.join('; ')}`);

  const bruto = entradas.reduce((a, x) => a + x.valor, 0);
  const taxaV = Math.floor(bruto * pontosBase(taxa) / BP);
  const liquido = bruto - taxaV;
  const pagamentos = Object.fromEntries(entradas.map(x => [x.id, 0]));
  const ganham = new Set(vencedoras ?? []);
  const certas = entradas.filter(x => ganham.has(x.selecao));

  if (!entradas.length)
    return { bruto: 0, taxa: 0, liquido: 0, pagamentos, residuo: 0, tesouraria: 0,
             destino: 'vazio', acertadores: 0, contemplados: 0 };

  let destino, base;
  if (certas.length) { destino = 'acertadores'; base = certas; }
  else if (semAcerto === SEM_ACERTO.DEVOLVER) { destino = 'devolucao'; base = entradas; }
  else {
    return { bruto, taxa: taxaV, liquido, pagamentos, residuo: 0, tesouraria: liquido,
             destino: 'tesouraria', acertadores: 0, contemplados: 0 };
  }

  const somaBase = base.reduce((a, x) => a + x.valor, 0);
  let pago = 0;
  for (const x of base) {
    const v = proporcao(liquido, x.valor, somaBase);
    pagamentos[x.id] = v;
    pago += v;
  }
  return { bruto, taxa: taxaV, liquido, pagamentos, residuo: liquido - pago, tesouraria: 0,
           destino, acertadores: certas.length, contemplados: base.length };
}
