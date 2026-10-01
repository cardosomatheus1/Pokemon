/* A POLÍTICA ÚNICA DE NEGOCIABILIDADE E USO (ST-14.5 · E14 · spec E14 §§4, 7) — camada 0.
 *
 * Toda pergunta "este ativo pode ir para a troca / o mercado / ser solto /
 * evoluir agora?" passa por AQUI, e só por aqui. Cada caminho decidindo por
 * conta própria é como uma regra se perde: o inicial bloqueado na troca e
 * liberado no mercado, o cooldown medido no relógio do cliente, o `comprado`
 * esquecido num dos lados.
 *
 * A resposta tem sempre a mesma forma — `{ allowed, reason_code, available_at,
 * detalhe }` —, e o servidor a pergunta tanto na reserva quanto na liquidação
 * (ST-14.6/14.7). O cliente só MOSTRA o motivo: botão desabilitado não é
 * proteção.
 *
 * O módulo é puro: recebe os FATOS (de quem é, de onde veio, onde está, quando
 * chegou), e o servidor (`server/elegibilidade.mjs`) é quem os lê do banco.
 * É também o que torna o defeito plantado aqui um mutante de Node, e não de
 * navegador.
 *
 * A ORDEM DAS RECUSAS é parte do contrato, e ela vai do que não depende do
 * ativo ao que depende:
 *
 *   NOT_OWNER           não é seu — ou não existe (os dois iguais, para não
 *                       enumerar o que é dos outros)
 *   FEATURE_DISABLED    a troca/o mercado estão desligados
 *   ACCOUNT_RESTRICTED  a conta está em pausa ou autoexclusão
 *   ASSET_BOUND         preso por REGRA (inicial, lendário, missão) ou pela
 *                       ORIGEM (bônus, legado, teste) — não passa nunca
 *   ASSET_BUSY          em atividade (expedição, run) ou reservado
 *   ASSET_COOLDOWN      chegou há pouco; `available_at` diz quando passa
 *
 * e, para o que se conta: INSUFFICIENT_ITEMS, INSUFFICIENT_FUNDS.
 */
import { negociavelPelaOrigem } from './proveniencia.mjs';
import { p2pLiberado } from './feature-flags.mjs';

export const RAZAO = Object.freeze({
  NOT_OWNER: 'NOT_OWNER', FEATURE: 'FEATURE_DISABLED', CONTA: 'ACCOUNT_RESTRICTED',
  BOUND: 'ASSET_BOUND', BUSY: 'ASSET_BUSY', COOLDOWN: 'ASSET_COOLDOWN',
  ITENS: 'INSUFFICIENT_ITEMS', FUNDOS: 'INSUFFICIENT_FUNDS', DESCONHECIDO: 'ASSET_UNKNOWN',
});

/* AS AÇÕES, cada uma com o que a bloqueia. Negociar pede bandeira, conta
   livre, ativo livre e fora de atividade. Os USOS pedem só que o ativo não
   esteja reservado — evoluir uma criatura em expedição é jogo normal —, e
   soltar também a quer fora de atividade, que é a regra de hoje da coleção.
   Ação que ninguém classificou é RECUSADA ao perguntar (o `throw`), e não
   liberada: é o mesmo lado seguro do `podeAgir` da proteção. */
export const ACOES = Object.freeze({
  trade:     Object.freeze({ negocia: true, bandeira: 'p2p_trade_enabled', atividade: true }),
  market:    Object.freeze({ negocia: true, bandeira: 'player_market_enabled', atividade: true }),
  soltar:    Object.freeze({ negocia: false, atividade: true }),
  evoluir:   Object.freeze({ negocia: false, atividade: false }),
  treinar:   Object.freeze({ negocia: false, atividade: false }),
  expedicao: Object.freeze({ negocia: false, atividade: false }),
  usar:      Object.freeze({ negocia: false, atividade: false }),
});

/* Baseline da spec §7: captura verificada sem cooldown extra; recebida de
   outro jogador, 10 min. O cooldown LIMITA CIRCULAÇÃO, não valida origem — por
   isso ele vem depois do ASSET_BOUND, e nunca o substitui. */
export const COOLDOWN_RECEBIDA_MS = 10 * 60_000;

const sim = Object.freeze({ allowed: true, reason_code: null, available_at: null, detalhe: null });
const nao = (reason_code, detalhe = null, available_at = null) => ({ allowed: false, reason_code, available_at, detalhe });

function regraDa(acao) {
  const r = ACOES[acao];
  if (!r) throw new Error(`ação sem regra de negociabilidade: ${acao}`);
  return r;
}

/* O que vale para qualquer ativo antes de olhar o ativo. */
function daConta(regra, conta) {
  if (!regra.negocia) return null;
  const b = conta?.bandeiras ?? {};
  if (!p2pLiberado(n => b[n], regra.bandeira)) return nao(RAZAO.FEATURE, regra.bandeira);
  if (conta?.pausada) return nao(RAZAO.CONTA, 'pausa');
  if (conta?.congelada) return nao(RAZAO.CONTA, 'congelada');   // ST-14.14: em revisão
  if (conta?.emDivergencia) return nao(RAZAO.CONTA, 'conciliacao');   // ST-14.16: o escrow não fecha
  return null;
}

/* ── A CRIATURA ──
 * Fatos: `{ existe, dono, origem, lendario, proveniencia, emAtividade,
 * reservada, recebidaEm }` e o `userId` de quem pergunta.
 *
 * DUAS RESTRIÇÕES DIFERENTES, e a spec §4.3 pede que não se confundam: a do
 * PRÓPRIO ativo (o inicial é preso por regra de produto) e a da ORIGEM que se
 * propaga (a bola de bônus prende a captura). A primeira não contamina o farm
 * que o inicial fez; a segunda contamina o derivado. Aqui só se LÊ as duas —
 * a propagação já foi gravada na `proveniencia` quando o derivado nasceu. */
export const VINCULO_DA_ORIGEM = Object.freeze({ inicial: 'inicial', raid: 'raid' });

export function avaliarCriatura({ userId, criatura: c, conta, acao, agora }) {
  const regra = regraDa(acao);
  if (!c?.existe || c.dono !== userId) return nao(RAZAO.NOT_OWNER);
  const daC = daConta(regra, conta);
  if (daC) return daC;
  if (regra.negocia) {
    const vinculo = VINCULO_DA_ORIGEM[c.origem] ?? (c.lendario ? 'lendario' : null);
    if (vinculo) return nao(RAZAO.BOUND, vinculo);
    if (!negociavelPelaOrigem(c.proveniencia)) return nao(RAZAO.BOUND, c.proveniencia);
  }
  if (c.reservada) return nao(RAZAO.BUSY, 'reservada');
  if (regra.atividade && c.emAtividade) return nao(RAZAO.BUSY, 'atividade');
  if (regra.negocia && c.recebidaEm != null) {
    const livre = c.recebidaEm + COOLDOWN_RECEBIDA_MS;
    if (agora < livre) return nao(RAZAO.COOLDOWN, 'recebida', livre);
  }
  return sim;
}

/* ── O ITEM ──
 * Por LOTE: o que negocia é a soma dos lotes de classe negociável, menos o que
 * já está reservado. O item em si também pode ser preso pelo catálogo — a
 * moeda PvE nunca sai da conta, e o que o pack marca `negociavel: false` (uma
 * fonte ainda sem orçamento aprovado) também não.
 *
 * `tipoDoItem` responde com o pack, e não com uma lista de ids aqui: o motor
 * não conhece nome de item nenhum. */
export function tipoDoItem(pack, itemId) {
  const id = String(itemId ?? '');
  if (id === pack?.moedaPve?.id) return { tipo: 'moeda', negociavel: false, detalhe: 'moeda_pve' };
  if (id === pack?.material?.id) return { tipo: 'material', negociavel: true };
  const base = id.startsWith('est:') ? id.slice(4) : id;
  const item = (pack?.catalogo ?? []).find(i => i.id === base) ?? (pack?.bolas ?? []).find(b => b.id === base);
  if (!item) return null;
  if (item.negociavel === false) return { tipo: id === base ? 'item' : 'estilhaco', negociavel: false, detalhe: 'fonte_nao_aprovada' };
  return { tipo: id === base ? 'item' : 'estilhaco', negociavel: true };
}

export function avaliarItem({ pack, itemId, quantidade, lotes, conta, acao }) {
  const regra = regraDa(acao);
  const q = Number(quantidade);
  if (!Number.isInteger(q) || q <= 0) return nao(RAZAO.ITENS, 'quantidade');
  const tipo = tipoDoItem(pack, itemId);
  if (!tipo) return nao(RAZAO.DESCONHECIDO);
  const daC = daConta(regra, conta);
  if (daC) return daC;
  const livre = l => Math.max(0, (l.quantidade ?? 0) - (l.reservada ?? 0));
  const todos = lotes ?? [];
  const tem = todos.reduce((a, l) => a + (l.quantidade ?? 0), 0);
  if (!regra.negocia) {
    if (tem < q) return nao(RAZAO.ITENS);
    return todos.reduce((a, l) => a + livre(l), 0) >= q ? sim : nao(RAZAO.BUSY, 'reservada');
  }
  if (!tipo.negociavel) return nao(RAZAO.BOUND, tipo.detalhe);
  const limpos = todos.filter(l => negociavelPelaOrigem(l.classe));
  if (limpos.reduce((a, l) => a + livre(l), 0) >= q) return sim;
  if (limpos.reduce((a, l) => a + (l.quantidade ?? 0), 0) >= q) return nao(RAZAO.BUSY, 'reservada');
  if (tem >= q) return nao(RAZAO.BOUND, 'origem');
  return nao(RAZAO.ITENS);
}

/* ── A CONTA, sem ativo (ST-14.7) ──
 * Quem só RECEBE numa troca (a doação) não oferece ativo nenhum — e mesmo
 * assim a conta dele precisa poder negociar: em pausa, congelada ou com a
 * bandeira desligada, ela não entra na troca nem do lado que ganha. */
export function avaliarConta({ conta, acao }) {
  return daConta(regraDa(acao), conta) ?? sim;
}

/* ── O QUE NUNCA NEGOCIA, pelo tipo ──
 * Doce (L-222: intransferível na v1 — `candy_ledger` não tem lote ainda) e
 * cosmético de progressão ou legado (spec §7). Perguntar devolve o motivo,
 * em vez de cada tela inventar o seu. */
export const PRESOS_PELO_TIPO = Object.freeze({ doce: 'doce', cosmetico: 'cosmetico' });

export function avaliarPreso({ tipo, conta, acao }) {
  const regra = regraDa(acao);
  if (!PRESOS_PELO_TIPO[tipo]) throw new Error(`tipo sem regra de negociabilidade: ${tipo}`);
  const daC = daConta(regra, conta);
  if (daC) return daC;
  return regra.negocia ? nao(RAZAO.BOUND, PRESOS_PELO_TIPO[tipo]) : sim;
}

/* ── A MOEDA ──
 * Só o PC-T ELEGÍVEL entra na troca entre jogadores (spec §7). Bônus, PC-C,
 * Pending e `comprado` nunca — e o `comprado` está escrito na lista de
 * propósito, porque é o bucket que existe no esquema sem fonte ainda (DEC-03)
 * e o primeiro a ser esquecido quando ganhar uma. `elegivel` é o que
 * `pcTElegivel` devolveu (zero para a conta com concessão legada no PC-T);
 * `saldo`, o PC-T bruto — é ele que separa "não tem" de "tem, mas está preso". */
export const BUCKETS_P2P = Object.freeze(['transferivel']);

export function avaliarMoeda({ bucket, valor, elegivel, saldo, conta, acao }) {
  const regra = regraDa(acao);
  if (!regra.negocia) throw new Error(`a moeda não tem uso fora da troca: ${acao}`);
  const v = Number(valor);
  if (!Number.isInteger(v) || v <= 0) return nao(RAZAO.FUNDOS, 'valor');
  const daC = daConta(regra, conta);
  if (daC) return daC;
  if (!BUCKETS_P2P.includes(bucket)) return nao(RAZAO.BOUND, bucket);
  if ((elegivel ?? 0) >= v) return sim;
  if ((saldo ?? 0) >= v) return nao(RAZAO.BOUND, 'pc_t_legado');
  return nao(RAZAO.FUNDOS);
}
