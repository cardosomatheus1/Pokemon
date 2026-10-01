/* A TROCA NA TELA, DECIDIDA FORA DELA (ST-14.7b · E14 · spec E14 §9) — camada 0.
 *
 * A tela da troca (`trocas-tela.mjs`) só pinta. Tudo o que ela escreve sai
 * daqui, puro e testável em Node: em que ETAPA a troca está do ponto de vista
 * de quem olha, qual é o próximo botão, o que cada lado leva, e o motivo de
 * uma recusa em palavras — "chegou numa troca há pouco, livre às 14:32", e
 * não "ASSET_COOLDOWN".
 *
 * A REGRA da troca mora no servidor (`server/trocas.mjs`); aqui só se lê o
 * que ele devolveu. Nenhuma função daqui decide se um ativo pode ir — a tela
 * mostra a resposta da política única, e o servidor confere de novo.
 */
import { negociavelPelaOrigem } from '../../engine/proveniencia.mjs';
import { VINCULO_DA_ORIGEM } from '../../engine/negociabilidade.mjs';

/* ── A ETAPA ──────────────────────────────────────────────────────────────
 * Uma por estado × o que EU já fiz × o que o OUTRO já fez. A ação é a única
 * coisa que a tela oferece como botão principal; `null` quando é esperar. */
export function etapaDaTroca(d, agora = Date.now()) {
  if (!d) return { etapa: 'nenhuma', titulo: 'Nenhuma troca aberta', acao: null };
  const fim = { SETTLED: 'Troca concluída', CANCELLED: 'Troca cancelada', EXPIRED: 'Troca vencida', BLOCKED: 'Troca bloqueada pela revisão' };
  if (fim[d.estado]) return { etapa: 'encerrada', titulo: fim[d.estado], acao: null, final: d.estado };
  const vazia = !contarLado(d.meu) && !contarLado(d.dele);
  if (d.estado === 'OFFERED') {
    if (d.conviteExpiraEm != null && d.conviteExpiraEm <= agora) return { etapa: 'encerrada', titulo: 'O convite venceu', acao: null, final: 'EXPIRED' };
    if (vazia) return { etapa: 'montar', titulo: 'Monte a troca', acao: 'editar', aviso: 'Pelo menos um lado precisa oferecer alguma coisa.' };
    if (d.meu.pronto && !d.dele.pronto) return { etapa: 'esperando', titulo: `Esperando ${d.outro} ficar pronto`, acao: null,
      aviso: 'Nada seu está preso ainda: só trava quando os dois disserem pronto.' };
    return { etapa: 'revisar', titulo: d.dele.pronto ? `${d.outro} está pronto — revise e diga pronto` : 'Revise e diga pronto', acao: 'pronto' };
  }
  /* LOCKED: o relógio do lock é o que a tela conta para trás. */
  const resta = Math.max(0, Math.ceil(((d.lockExpiraEm ?? agora) - agora) / 1000));
  if (resta === 0) return { etapa: 'encerrada', titulo: 'O tempo para confirmar acabou', acao: null, final: 'EXPIRED' };
  if (d.meu.confirmado) return { etapa: 'esperando', titulo: `Esperando ${d.outro} confirmar`, acao: null, resta };
  return { etapa: 'confirmar', titulo: 'Tudo travado — confira e confirme', acao: 'confirmar', resta,
           aviso: 'Confirmar move os dois lados de uma vez. Qualquer mudança agora solta tudo e volta à revisão.' };
}

export const contarLado = l => (l?.criaturas?.length ?? 0) + (l?.itens?.length ?? 0) + (l?.moeda ? 1 : 0);

/* "0:42", e não 42 — o lock é de cinco minutos, e a pessoa lê minutos. */
export const relogio = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ── O QUE CADA LADO LEVA ─────────────────────────────────────────────────
 * Linhas prontas para a tela, na ordem da revisão: criatura (com o selo de
 * brilhante, o nível e a natureza — o que entra no hash é o que se lê), item
 * e PC-T com a taxa ao lado. `nomeDaEspecie` e `nomeDoItem` vêm do pack. */
export function linhasDoLado(lado, { nomeDaEspecie = d => `#${d}`, nomeDoItem = id => id } = {}) {
  const out = [];
  for (const c of lado?.criaturas ?? []) {
    if (c.sumiu) { out.push({ tipo: 'criatura', texto: 'uma criatura que não está mais na conta', alerta: true }); continue; }
    out.push({ tipo: 'criatura', dex: c.dex, shiny: !!c.shiny,
               texto: `${c.shiny ? '✦ ' : ''}${nomeDaEspecie(c.dex)} · nv ${c.nivel}${c.natureza ? ` · ${c.natureza}` : ''}` });
  }
  for (const i of lado?.itens ?? []) out.push({ tipo: 'item', itemId: i.itemId, texto: `${i.quantidade}× ${nomeDoItem(i.itemId)}` });
  if (lado?.moeda) out.push({ tipo: 'moeda', texto: `${lado.moeda} PC-T`, nota: lado.taxa ? `+${lado.taxa} de taxa (queima)` : null });
  return out;
}

/* ── O MOTIVO, EM PALAVRAS ────────────────────────────────────────────────
 * A recusa do servidor traz `codigo`, `reason_code`, às vezes `detalhe` (no
 * texto do erro) e `available_at`. A frase diz o QUÊ e, quando existe,
 * QUANDO — a Spec §28.3 pede as duas. */
const hora = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const CONTA = {
  pausa: 'sua conta está em pausa',
  congelada: 'a negociação desta conta está em revisão',
  conciliacao: 'a conferência da economia achou uma diferença nesta conta — a equipe está olhando',
  mesma_conta: 'não dá para trocar com a própria conta',
  conta_ligada: 'esta conta está ligada à sua (mesmo aparelho ou rede) — a troca entre elas não existe',
};

export function textoDaRecusa(r = {}) {
  const corpo = r.corpo ?? r;
  if (r.indisponivel) return 'Sem conexão com o servidor — tente de novo.';
  const msg = String(corpo?.erro ?? '');
  switch (corpo?.reason_code) {
    case 'FEATURE_DISABLED': return 'As trocas ainda estão desligadas — elas abrem no lançamento da troca entre jogadores.';
    case 'ASSET_COOLDOWN': return corpo.available_at ? `Chegou numa troca há pouco — livre às ${hora(corpo.available_at)}.` : 'Esta criatura ainda está em espera.';
    case 'ASSET_BUSY': return 'Está ocupado: em expedição, na run ou preso em outra oferta.';
    case 'ASSET_BOUND': return 'Este item ou criatura não pode ser trocado (vínculo de origem).';
    case 'CAPACITY_EXCEEDED': return /ativos/.test(msg) ? 'No máximo 20 coisas de cada lado.' : 'Já existe uma troca aberta — termine ou cancele antes.';
    case 'INSUFFICIENT_FUNDS': return 'PC-T insuficiente para o valor mais a taxa.';
    case 'INSUFFICIENT_ITEMS': return 'Você não tem essa quantidade livre.';
    case 'NOT_OWNER': return 'Isto não é mais seu.';
    case 'OFFER_EXPIRED': return 'O prazo desta troca acabou.';
    case 'OFFER_NOT_ACTIVE': return 'Esta troca não tem mais nada travado.';
    case 'ACCOUNT_RESTRICTED': {
      const k = Object.keys(CONTA).find(x => msg.includes(x));
      return k ? `Não dá: ${CONTA[k]}.` : 'Uma das contas não pode negociar agora.';
    }
  }
  switch (corpo?.codigo) {
    case 'TROCA_REVISAO_VELHA': return 'A troca mudou enquanto você olhava — revise de novo.';
    case 'TROCA_HASH': return 'O que está na troca não é o que você viu — revise de novo.';
    case 'TROCA_NAO_ENCONTRADA': return 'Troca não encontrada.';
    case 'TROCA_CONTRAPARTE': return 'Não existe conta com esse nome.';
    case 'TROCA_VAZIA': return 'Pelo menos um lado precisa oferecer alguma coisa.';
    case 'TROCA_ESTADO': return 'A troca já mudou de estado — recarregue.';
    case 'TROCA_OFERTA_INVALIDA': return msg || 'Oferta inválida.';
  }
  return msg || 'Não deu certo.';
}

/* ── O MEU LADO, MONTADO NA TELA ──────────────────────────────────────────
 * A seleção da tela vira o corpo da API — e só isto: o servidor normaliza e
 * confere de novo. Quantidade zero some; PC-T vazio é zero. */
export function ofertaDaSelecao({ criaturas = [], itens = {}, moeda = 0 } = {}) {
  return {
    criaturas: [...new Set(criaturas)],
    itens: Object.entries(itens).filter(([, q]) => Number.isSafeInteger(q) && q > 0).map(([itemId, quantidade]) => ({ itemId, quantidade })),
    moeda: Number.isSafeInteger(moeda) && moeda > 0 ? moeda : 0,
  };
}

/* ── O QUE A TELA OFERECE PARA MONTAR ─────────────────────────────────────
 * A coleção inteira não é oferecível: o inicial e a criatura de raid são
 * presos pela regra de produto, e a de origem restrita (bônus, revisão) pela
 * proveniência. A tela separa as duas listas para não oferecer um botão que
 * o servidor vai recusar — e diz QUANTAS ficaram de fora, e por quê. O
 * servidor continua sendo quem decide (ocupada, em cooldown, reservada). */
export function separarOfertaveis(criaturas = []) {
  const ofertaveis = [], presas = [];
  for (const c of criaturas)
    (VINCULO_DA_ORIGEM[c.origem] || !negociavelPelaOrigem(c.proveniencia ?? 'verified_earned') ? presas : ofertaveis).push(c);
  return { ofertaveis, presas };
}

/* Os itens: só o LIVRE dos lotes de classe que negocia, somado por item. */
export function itensNegociaveis(lotes = {}) {
  return Object.entries(lotes)
    .map(([itemId, ls]) => ({ itemId, livre: (ls ?? []).filter(l => negociavelPelaOrigem(l.classe)).reduce((a, l) => a + (l.quantidade ?? 0), 0) }))
    .filter(i => i.livre > 0);
}

/* A linha da lista "minhas trocas". */
export function linhaDaLista(t) {
  const r = { OFFERED: 'em montagem', LOCKED: 'travada — confirmar', SETTLED: 'concluída', CANCELLED: 'cancelada', EXPIRED: 'vencida', BLOCKED: 'bloqueada' };
  return { id: t.id, texto: `${t.papel === 'criador' ? 'para' : 'de'} ${t.outro}`, estado: r[t.estado] ?? t.estado, aberta: t.estado === 'OFFERED' || t.estado === 'LOCKED' };
}
