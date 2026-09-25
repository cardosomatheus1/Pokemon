/* Carteira com proveniência e ledger append-only — Spec §5.5.
 *
 * O saldo deixa de ser um número. Passa a ser quatro buckets com origem
 * declarada, e toda mudança nasce de um lançamento no ledger.
 *
 * POR QUE ISSO IMPORTA ANTES DE EXISTIR SERVIDOR: o §5.5 fecha uma brecha
 * econômica concreta — *"nenhum payout pode transformar silenciosamente PC-B em
 * PC-T"*. Sem proveniência, as odds da Arena viram conversor automático de bônus
 * gratuito em saldo transferível, e todo o orçamento de PC-B do §7 do Estudo de
 * Economia vaza para a ponta que custa dinheiro de verdade.
 *
 * ESTE ARQUIVO É PURO. Sem DOM, sem localStorage, sem relógio. Persistir é
 * problema de quem chama; em F1.4 a mesma estrutura vira tabela no servidor, e
 * é essa a razão de fazer local agora — vira troca de implementação, não
 * reescrita.
 *
 * `balance` nunca é editado direto. A única forma de mexer em saldo é
 * `lancar`, e `reconciliar` recalcula tudo pelo ledger para provar.
 */

/* Os buckets do §5.5, mais o `comprado` do bloco 1.26. `pendente` é PC-T
   comprado e ainda sob hold: não entra em mercado transferível enquanto não
   liquidar. */
export const BUCKETS = ['transferivel', 'pendente', 'bonus', 'competitivo', 'comprado'];

/* ── O CADEADO: `comprado` NÃO COMPRA PODER (bloco 1.26) ──────────────────
 * O medo do dono, e ele está certo — a citação vai PARAFRASEADA porque a
 * original nomeia a franquia, e o §0.3 não deixa isso entrar no motor:
 *
 *   > o cara doa não sei quanto e no primeiro dia tem dinheiro pra deixar a
 *   > criatura boostada fortona
 * pedra cobra presença* — é contornável: quem comprasse muito zeraria a coluna
 * do dinheiro em todos os degraus de uma vez.
 *
 *     comprado com dinheiro real   APOSTA  ·  COSMÉTICO
 *     ganho jogando                livre, inclusive PODER
 *
 * **O cadeado se abre GANHANDO.** Comprar dá tentativas; o poder vem do que se
 * ganhou. É a linha do dono — *"GANHANDO, o seu LUCRO SE SOMA À CARTEIRA"* — e
 * ela é elegante: o dinheiro entra no jogo e o progresso continua conquistado.
 *
 * Esta é a peça do §P5 escrita como código em vez de como intenção. Ela não
 * proíbe comprar; proíbe comprar VANTAGEM.
 */
export const BUCKETS_LIVRES = ['transferivel', 'bonus', 'competitivo'];

/* Para que serve cada propósito de gasto, e quais baldes ele aceita.
 *
 * `poder` é o único que recusa o `comprado`, e essa é a ÚNICA recusa nova. O
 * resto continua exatamente como era — um cadeado que mudasse o comportamento
 * de tudo seria uma reforma disfarçada de proteção. */
export const PROPOSITOS = {
  aposta:    BUCKETS,          /* tudo, inclusive o comprado */
  cosmetico: BUCKETS,          /* tudo — cosmético não é poder */
  poder:     BUCKETS_LIVRES,   /* NUNCA o comprado */
};

export const aceitaBalde = (proposito, bucket) =>
  (PROPOSITOS[proposito] ?? BUCKETS_LIVRES).includes(bucket);

/* ORDEM DE CONSUMO: bônus, comprado, competitivo, transferível.
 *
 * O §5.5 não a define, e escolher é obrigatório — sem ordem, `stake_breakdown`
 * é indeterminado.
 *
 * `bonus` continua na frente pelo motivo de sempre: é dinheiro da casa, e gastar
 * o que o jogador não pôs dinheiro para ter faz o saldo dele durar mais.
 *
 * `comprado` entra LOGO DEPOIS, e isso é decisão deste bloco:
 *
 *   > Se o livre fosse gasto primeiro, o jogador acabaria com uma bolsa só de
 *   > saldo restrito — e a sensação seria de estar sendo PUNIDO por ter
 *   > comprado, que é o oposto do que se quer.
 *
 * Gastando o restrito antes do livre, o cadeado se dissolve com o uso.
 *
 * `pendente` fica FORA da ordem: PC-T sob hold não pode ser apostado (§5.5).
 * Registrado como lacuna L-024, porque a decisão é econômica e não tem dono. */
export const ORDEM_CONSUMO = ['bonus', 'comprado', 'competitivo', 'transferivel'];

/* O SALDO COM QUE UMA CONTA COMEÇA.
 *
 * Estava só em `app/modules/banco.mjs`, e ficou visível no F1.13: quando o
 * cliente parou de usar o banco local e passou a falar com o servidor, conta
 * nova nasceu com zero e o jogo não começava. O número é o mesmo da v0.8 — é
 * porte, não decisão nova —, e ele sobe para o motor porque agora tem DOIS
 * leitores, e dois leitores com cópias é como se dessincroniza.
 *
 * O Estudo Econômico mede a ruína a partir dele: 1.000 PC com aposta mínima de
 * 50 sempre no favorito arruina em 100% das simulações, mediana de 128 rodadas.
 * Mexer aqui é mexer naquela medição, e o §28.8 depende dela. */
export const SALDO_INICIAL = 1000;

/* Tipos do §5.5 que a v0.9 usa. A lista completa da Spec cobre Liga, Exchange e
   compra com dinheiro real, que não existem nesta versão — usar um tipo que o
   produto ainda não tem seria inventar histórico. */
export const TIPOS = [
  'WELCOME_GRANT', 'DAILY_REWARD', 'CHALLENGE_REWARD',
  /* F1.10 · o `rescue grant` do §0.4 e do §28.8. A rota que o credita nasceu no
     F1.10 usando este tipo, e ele NÃO estava aqui — o crédito teria lançado
     `tipo desconhecido` na primeira concessão real. Achado pelo painel do
     F1.11, que soma faucets por tipo: o teste do painel creditou um resgate e
     o ledger recusou.

     Vale registrar a forma, porque ela se repete: a rota estava certa, a lista
     estava certa para o que existia antes, e ninguém liga uma na outra. É
     "testar a peça não testa o encaixe" pela sétima vez. */
  'RESCUE_GRANT',
  'BET_RESERVE', 'BET_RELEASE', 'BET_LOSS',
  'BET_PAYOUT_TRANSFERABLE', 'BET_PAYOUT_BONUS', 'BET_PAYOUT_COMPETITIVE',
  /* O pagamento de uma aposta feita com saldo COMPRADO: a aposta volta
     comprada, o LUCRO cai livre. Ver `liquidarGanho`. */
  'BET_PAYOUT_PURCHASED',
  'PC_T_PURCHASE_CLEARED', 'ADMIN_ADJUSTMENT',
  /* ── A LOJA DE COSMÉTICO (1.31) ─────────────────────────────────────────
   *
   * Tipo PRÓPRIO, e não `BET_LOSS` reaproveitado. A primeira forma que me
   * ocorreu foi reusar `reservar` + `liquidarPerda`: o dinheiro sai igual e
   * não precisaria de linha nova aqui.
   *
   * Ela está errada, e o erro é de AUDITORIA e não de saldo:
   *
   *   > Um livro que registra a compra de um traje como aposta perdida conta
   *   > uma história falsa sobre para onde o dinheiro do jogador foi. O saldo
   *   > bate e a explicação mente — a pior combinação possível num ledger.
   *
   * O §25.2 é sobre exatamente isto: o que aconteceu tem de poder ser refeito
   * a partir do que está gravado. E a `ref` carrega a peça (`loja:familia:id`),
   * então "o que ele comprou" também se refaz. */
  'COSMETIC_PURCHASE',
];

const zerado = () => Object.fromEntries(BUCKETS.map(b => [b, 0]));

export function carteiraVazia() {
  return {
    disponivel: zerado(),
    reservado:  zerado(),
    vitalicio:  { ganho: 0, perdido: 0, recompensas: 0 },
    ledger: [],
    seq: 0,
  };
}

const ehInteiroPositivo = v => typeof v === 'number' && Number.isInteger(v) && v > 0;

/* O ÚNICO ponto que muda saldo. Recebe os deltas por bucket e grava a entrada
 * antes de aplicar; se qualquer bucket fosse ficar negativo, nada acontece.
 *
 * `deltas` = { disponivel: {bucket: n}, reservado: {bucket: n} }, com n de
 * qualquer sinal. */
export function lancar(w, tipo, deltas, ref) {
  if (!TIPOS.includes(tipo)) throw new Error(`tipo de lançamento desconhecido: ${tipo}`);

  const proposta = { disponivel: { ...w.disponivel }, reservado: { ...w.reservado } };
  for (const conta of ['disponivel', 'reservado'])
    for (const [b, n] of Object.entries(deltas[conta] ?? {})) {
      if (!BUCKETS.includes(b)) throw new Error(`bucket desconhecido: ${b}`);
      if (!Number.isFinite(n)) throw new Error(`delta inválido em ${conta}.${b}: ${n}`);
      proposta[conta][b] += n;
    }

  /* Saldo negativo é invariante da Spec §4.6, não detalhe de implementação. O
     lançamento é recusado inteiro — meia transação é pior que nenhuma. */
  for (const conta of ['disponivel', 'reservado'])
    for (const b of BUCKETS)
      if (proposta[conta][b] < 0)
        return { ok: false, motivo: `${conta}.${b} ficaria em ${proposta[conta][b]}` };

  const entrada = {
    seq: ++w.seq, tipo, ref: ref ?? null,
    deltas: { disponivel: { ...(deltas.disponivel ?? {}) }, reservado: { ...(deltas.reservado ?? {}) } },
  };
  w.ledger.push(entrada);
  w.disponivel = proposta.disponivel;
  w.reservado  = proposta.reservado;
  return { ok: true, entrada };
}

export function creditar(w, tipo, bucket, valor, ref) {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: 'valor inválido' };
  return lancar(w, tipo, { disponivel: { [bucket]: valor } }, ref);
}

/* A CARTEIRA COMO PROJEÇÃO DE SALDOS (F1.14).
 *
 * No modo servidor o cliente não CONSTRÓI carteira: ele recebe os saldos
 * prontos e precisa de um objeto com a forma que o resto do app já lê. Montar
 * isso na fachada seria a fachada conhecendo o formato interno — que é
 * exatamente o que `test/carteira.mjs` proíbe, e com razão: foi assim que a
 * regra da carteira vazou para dez lugares na v0.7.
 *
 * NÃO TEM LEDGER, e a ausência é honesta: o ledger de verdade está no servidor
 * e pode ter milhares de linhas. Uma projeção sem ledger diz "não sei o
 * histórico"; uma projeção com ledger inventado mentiria sobre ele.
 */
export function carteiraDeSaldos(saldos = {}) {
  const w = carteiraVazia();
  for (const b of BUCKETS) {
    const d = saldos[b], r = saldos['reservado_' + b];
    if (Number.isInteger(d) && d >= 0) w.disponivel[b] = d;
    if (Number.isInteger(r) && r >= 0) w.reservado[b] = r;
  }
  w.projecao = true;   /* quem ler sabe que o ledger não está aqui */
  return w;
}

export const totalDisponivel = w =>
  ORDEM_CONSUMO.reduce((a, b) => a + w.disponivel[b], 0);

export const totalReservado = w =>
  BUCKETS.reduce((a, b) => a + w.reservado[b], 0);

/* Reserva `valor` seguindo a ordem de consumo e devolve o `stake_breakdown` do
 * §5.5. O ticket nunca grava só `stake = 100`; grava de onde os 100 saíram. */
/* ── QUANTO CABE PARA UM PROPÓSITO ───────────────────────────────────────
 *
 * `poder` não enxerga o `comprado`, e por isso o total dele é MENOR que o saldo
 * na tela. Essa diferença é o cadeado, e a tela precisa poder mostrá-la — sem
 * esta função ela teria de refazer a conta, e duas contas do mesmo saldo é
 * exatamente como se divergem. */
export const disponivelPara = (w, proposito = 'aposta') =>
  ORDEM_CONSUMO.filter(b => aceitaBalde(proposito, b))
    .reduce((a, b) => a + (w.disponivel[b] ?? 0), 0);

/* ── O QUE A LOJA DE COSMÉTICO GASTA (1.31) ─────────────────────────────
 *
 * Um lançamento SÓ, e não reserva-depois-liquida: a compra de um traje não tem
 * o meio-tempo que a aposta tem. Reservar para liquidar em seguida inventaria
 * um instante em que o dinheiro não é de ninguém, e é nesse instante que um
 * recarregamento de página deixaria saldo preso.
 *
 * O propósito é `cosmetico`, que aceita TODOS os baldes — inclusive o
 * comprado. É o outro lado do cadeado do 1.26: comprado não vira PODER, e
 * cosmético não é poder. Trancá-lo aqui trancaria o jogador fora da única
 * coisa que ele de fato pode comprar.
 *
 * A ORDEM DE CONSUMO é a mesma da aposta. Duas ordens no mesmo saldo fariam o
 * bônus sumir por caminhos diferentes conforme a porta, e o jogador não tem
 * como saber qual delas está certa.
 */
export function gastarCosmetico(w, valor, ref) {
  const plano = planoDoGasto(w.disponivel, valor, 'cosmetico');
  if (!plano.ok) return plano;
  return lancar(w, 'COSMETIC_PURCHASE', { disponivel: plano.deltas }, ref);
}

/* ── DE QUAIS BALDES SAI UM GASTO — puro, e o MESMO no cliente e no servidor ──
 *
 * Nasceu dentro do `gastarCosmetico` e saiu no E4 (ST-4.2): a compra de
 * cosmético passou a acontecer no servidor, e duas ordens de consumo — uma
 * aqui, outra lá — fariam o bônus sumir por caminhos diferentes conforme a
 * porta. `disponivel` é `{ bucket: saldo }`; balde ausente vale zero. */
export function planoDoGasto(disponivel, valor, proposito) {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: 'valor inválido' };
  const d = disponivel ?? {};
  /* A MESMA conta do `disponivelPara`: só os baldes da ordem de consumo — o
     `pendente` nunca é gasto. */
  const cabe = ORDEM_CONSUMO.filter(b => aceitaBalde(proposito, b))
                            .reduce((a, b) => a + Math.max(0, d[b] ?? 0), 0);
  if (valor > cabe) return { ok: false, motivo: `faltam ${valor - cabe}`, falta: valor - cabe };
  const deltas = {};
  let falta = valor;
  for (const b of ORDEM_CONSUMO) {
    if (falta <= 0) break;
    if (!aceitaBalde(proposito, b)) continue;
    const usa = Math.min(falta, Math.max(0, d[b] ?? 0));
    if (usa > 0) { deltas[b] = -usa; falta -= usa; }
  }
  return { ok: true, deltas };
}

export function reservar(w, valor, ref, proposito = 'aposta') {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: 'valor inválido' };
  /* ── A RECUSA DIZ O PORQUÊ, E NÃO SÓ "NÃO" ────────────────────────────
   *
   * Ter 900 na tela e ouvir "saldo insuficiente" ao gastar 500 num boost é o
   * D-067 na porta do dinheiro — a pior forma de ensinar uma regra. A frase
   * separa as duas causas: falta saldo, ou o saldo que existe está trancado. */
  const cabe = disponivelPara(w, proposito);
  if (valor > cabe) {
    const trancado = totalDisponivel(w) - cabe;
    return { ok: false, motivo: trancado > 0 && valor <= totalDisponivel(w)
      ? `${trancado} do seu saldo foi COMPRADO, e comprado não vira poder — ` +
        'ganhe apostando para liberá-lo'
      : 'saldo insuficiente' };
  }

  const composicao = {};
  let falta = valor;
  for (const b of ORDEM_CONSUMO) {
    if (falta <= 0) break;
    if (!aceitaBalde(proposito, b)) continue;
    const usa = Math.min(falta, w.disponivel[b]);
    if (usa > 0) { composicao[b] = usa; falta -= usa; }
  }
  const deltas = { disponivel: {}, reservado: {} };
  for (const [b, n] of Object.entries(composicao)) { deltas.disponivel[b] = -n; deltas.reservado[b] = n; }
  const r = lancar(w, 'BET_RESERVE', deltas, ref);
  return r.ok ? { ok: true, composicao } : r;
}

/* Devolve uma reserva intacta — troca de aposta, rodada cancelada. */
export function liberar(w, composicao, ref) {
  const deltas = { disponivel: {}, reservado: {} };
  for (const [b, n] of Object.entries(composicao)) { deltas.disponivel[b] = n; deltas.reservado[b] = -n; }
  return lancar(w, 'BET_RELEASE', deltas, ref);
}

/* Aposta perdida: o reservado some. Não volta para disponível. */
export function liquidarPerda(w, composicao, ref) {
  const deltas = { reservado: {} };
  let total = 0;
  for (const [b, n] of Object.entries(composicao)) { deltas.reservado[b] = -n; total += n; }
  const r = lancar(w, 'BET_LOSS', deltas, ref);
  if (r.ok) w.vitalicio.perdido += total;
  return r;
}

/* Aposta ganha: PAYOUT HERDA A ORIGEM DA STAKE (§5.5).
 *
 * Stake mista paga proporcional, e cada parcela volta ao bucket de onde saiu.
 * É esta função que impede a Arena de virar conversor de bônus em saldo
 * transferível — e por isso ela lança um tipo POR BUCKET, não um só: um ledger
 * que diz "BET_PAYOUT" sem dizer em quê não prova nada depois. */
export function liquidarGanho(w, composicao, odd, ref) {
  if (!Number.isFinite(odd) || odd <= 0) return { ok: false, motivo: 'odd inválida' };
  const TIPO_POR_BUCKET = {
    transferivel: 'BET_PAYOUT_TRANSFERABLE',
    bonus:        'BET_PAYOUT_BONUS',
    competitivo:  'BET_PAYOUT_COMPETITIVE',
    pendente:     'BET_PAYOUT_TRANSFERABLE',
    comprado:     'BET_PAYOUT_PURCHASED',
  };
  const lancamentos = [];
  let ganhoLiquido = 0;
  for (const [b, n] of Object.entries(composicao)) {
    const retorno = Math.floor(n * odd);
    /* ── O CADEADO SE ABRE GANHANDO (1.26) ─────────────────────────────
     *
     * Palavra do dono: *"GANHANDO, o seu LUCRO SE SOMA À CARTEIRA; PERDENDO,
     * ELE PERDE O DINHEIRO"*.
     *
     * A APOSTA volta ao balde de onde saiu — o `comprado` continua comprado, e
     * quem apostou e recuperou não lavou nada. **O LUCRO cai livre.**
     *
     *     apostou 100 comprado a 2,5x  ->  100 volta comprado · 150 livre
     *
     * É a diferença entre comprar VANTAGEM e comprar TENTATIVAS. Comprar dá
     * tentativas; o poder vem do que se ganhou — e ganhar tem risco, que é o
     * que impede isto de virar uma casa de câmbio.
     *
     * O `bonus` NÃO faz isso, e a diferença é o dono do dinheiro: bônus é
     * dinheiro da casa, e convertê-lo em livre é a brecha que o §5.5 fecha.
     * `comprado` é dinheiro que o jogador pagou — a trava dele é sobre PODER,
     * e não sobre saída. */
    if (b === 'comprado' && retorno > n) {
      const lucro = retorno - n;
      const r = lancar(w, TIPO_POR_BUCKET[b],
        { disponivel: { comprado: n, transferivel: lucro }, reservado: { comprado: -n } }, ref);
      if (!r.ok) return r;
      lancamentos.push(r.entrada);
      ganhoLiquido += lucro;
      continue;
    }
    const r = lancar(w, TIPO_POR_BUCKET[b], { disponivel: { [b]: retorno }, reservado: { [b]: -n } }, ref);
    if (!r.ok) return r;
    lancamentos.push(r.entrada);
    ganhoLiquido += retorno - n;
  }
  w.vitalicio.ganho += ganhoLiquido;
  return { ok: true, lancamentos };
}

/* RECONCILIAÇÃO — recalcula tudo pelo ledger e compara com o que está guardado.
 *
 * É o que transforma "saldo adulterado" em "saldo adulterado E DETECTADO". Um
 * atacante local determinado também reescreve o ledger, e nenhuma reconciliação
 * resolve isso: a defesa de verdade é o ledger viver no servidor, em F1.4. O
 * que esta função entrega é que a adulteração ingênua — mexer no número — não
 * passe em silêncio.
 */
export function reconciliar(w) {
  const calc = { disponivel: zerado(), reservado: zerado() };
  let seq = 0;
  const problemas = [];
  for (const e of w.ledger) {
    if (e.seq !== ++seq) problemas.push(`sequência quebrada: esperava ${seq}, veio ${e.seq}`);
    if (!TIPOS.includes(e.tipo)) problemas.push(`entrada ${e.seq} com tipo desconhecido: ${e.tipo}`);
    for (const conta of ['disponivel', 'reservado'])
      for (const [b, n] of Object.entries(e.deltas[conta] ?? {})) calc[conta][b] += n;
  }
  for (const conta of ['disponivel', 'reservado'])
    for (const b of BUCKETS)
      if (calc[conta][b] !== w[conta][b])
        problemas.push(`${conta}.${b}: guardado ${w[conta][b]}, ledger diz ${calc[conta][b]}`);

  return { ok: problemas.length === 0, problemas, calculado: calc };
}

/* Reconstrói os saldos a partir do ledger. Usada quando a reconciliação acusa
   divergência: o ledger é a fonte, o saldo guardado é cache. */
export function reconstruir(w) {
  const { calculado } = reconciliar(w);
  w.disponivel = calculado.disponivel;
  w.reservado  = calculado.reservado;
  return w;
}
