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

/* Os quatro buckets do §5.5. `pendente` é PC-T comprado e ainda sob hold: não
   entra em mercado transferível enquanto não liquidar. */
export const BUCKETS = ['transferivel', 'pendente', 'bonus', 'competitivo'];

/* ORDEM DE CONSUMO: bônus, competitivo, transferível.
 *
 * O §5.5 não a define, e escolher é obrigatório — sem ordem, `stake_breakdown`
 * é indeterminado. Gasta-se primeiro o que o jogador não pôs dinheiro para ter:
 * o saldo dele próprio dura mais. E como o payout preserva a origem, apostar
 * bônus devolve bônus — que é exatamente a brecha que o §5.5 fecha.
 *
 * `pendente` fica FORA da ordem: PC-T sob hold não pode ser apostado (§5.5).
 * Registrado como lacuna L-024, porque a decisão é econômica e não tem dono. */
export const ORDEM_CONSUMO = ['bonus', 'competitivo', 'transferivel'];

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
  'PC_T_PURCHASE_CLEARED', 'ADMIN_ADJUSTMENT',
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
export function reservar(w, valor, ref) {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: 'valor inválido' };
  if (valor > totalDisponivel(w)) return { ok: false, motivo: 'saldo insuficiente' };

  const composicao = {};
  let falta = valor;
  for (const b of ORDEM_CONSUMO) {
    if (falta <= 0) break;
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
  };
  const lancamentos = [];
  let ganhoLiquido = 0;
  for (const [b, n] of Object.entries(composicao)) {
    const retorno = Math.floor(n * odd);
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
