/* O MARKET NA TELA, DECIDIDO FORA DELA (ST-14.13 · E14 · spec E14 §10.2) — camada 0.
 *
 * A tela do Market (`mercado-jogadores-tela.mjs`) só pinta. Daqui saem, puros
 * e testáveis em Node: a categoria e os filtros viram a busca da API; cada
 * anúncio vira o cartão (o preço TOTAL sempre, e o por unidade quando é
 * lote); quem anuncia vê taxa e líquido ANTES de confirmar; quem compra vê o
 * total e o PC-T elegível; e cada recusa vira frase.
 *
 * Nenhum preço, saldo ou taxa nasce aqui por simulação: a prévia do anúncio
 * usa a MESMA função do servidor (`engine/taxas-mercado.mjs`), e o servidor
 * confere tudo de novo — o que a tela mostra é o que ele vai cobrar.
 */
import { previewAnuncio } from '../../engine/taxas-mercado.mjs';
import { previewOrdem, casarVenda, taxasDosFills, MINIMO_FILL } from '../../engine/matching-mercado-jogadores.mjs';
import { tipoDoItem } from '../../engine/negociabilidade.mjs';
import { FAIXAS_POTENCIAL, faixaDoPotencial } from '../../engine/historico-precos.mjs';

/* As abas da spec §10.2. O nome das criaturas é o do PACK (`rotulos`): o
   Market não sabe de que franquia é o tema. */
export const abasDoMercado = (rotulos = {}) => [
  ['criaturas', rotulos.criaturas ?? 'Criaturas'], ['bolas', 'Bolas'], ['essencias', 'Essências'], ['materiais', 'Materiais'], ['itens', 'Itens'],
  ['ordens', 'Ordens de compra'], ['meus', 'Minhas ofertas'], ['compras', 'Minhas compras'],
];
export const ORDENS_MERCADO = Object.freeze([['recente', 'Mais novos'], ['preco', 'Mais baratos'], ['preco_desc', 'Mais caros']]);

/* A busca: só o que foi preenchido vira parâmetro, e o cursor vai junto. */
export function consultaDaBusca({ categoria, dex, shiny, nivelMin, natureza, potencialMin, precoMax, ordem = 'recente', cursor } = {}) {
  const p = new URLSearchParams();
  const por = (k, v) => { if (v != null && v !== '' && !Number.isNaN(v)) p.set(k, String(v)); };
  por('categoria', categoria); por('dex', dex); por('nivelMin', nivelMin); por('natureza', natureza);
  por('potencialMin', potencialMin); por('precoMax', precoMax); por('ordem', ordem); por('cursor', cursor);
  if (shiny === true) p.set('shiny', 'sim'); else if (shiny === false) p.set('shiny', 'nao');
  p.set('limite', '24');
  return p.toString();
}

/* O CARTÃO: o total é o número grande; o por unidade aparece no lote. */
export function cartaoDoAnuncio(a, { nomeDaEspecie = d => `#${d}`, nomeDoItem = id => id } = {}) {
  const r = a.retrato ?? {};
  const lote = a.tipo === 'item';
  const unit = lote && a.quantidade > 1 ? Math.floor(a.preco / a.quantidade) : null;
  return {
    id: a.id, tipo: a.tipo, shiny: !!r.shiny, dex: r.dex ?? null, itemId: a.itemId ?? r.itemId ?? null,
    titulo: lote ? `${a.quantidade}× ${nomeDoItem(a.itemId ?? r.itemId)}` : `${r.shiny ? '✦ ' : ''}${nomeDaEspecie(r.dex)}`,
    detalhe: lote ? (a.quantidade > 1 ? 'lote fechado — leva tudo' : '1 unidade')
                  : [`nv ${r.nivel ?? '?'}`, r.natureza, r.potencial != null ? `potencial ${r.potencial}` : null].filter(Boolean).join(' · '),
    preco: `${a.preco} PC-T`, porUnidade: unit != null ? `${unit} cada` : null,
    vendedor: a.vendedor,
  };
}

/* ANTES DE ANUNCIAR: a taxa que queima agora, a que queima na venda, e o
   líquido. `null` com o motivo quando o preço não pode. */
export function previaDoAnuncio(preco) {
  if (!Number.isSafeInteger(preco) || preco <= 0) return { ok: false, motivo: 'Diga o preço em PC-T inteiros.' };
  const p = previewAnuncio({ preco });
  if (!p.ok) return { ok: false, motivo: `${p.motivo}.` };
  return { ok: true, linhas: [
    ['Preço do anúncio', `${p.preco} PC-T`],
    ['Taxa para anunciar (sai agora, não volta)', `${p.taxaAnuncio} PC-T`],
    ['Taxa na venda', `${p.taxaVenda} PC-T`],
    ['Você recebe se vender', `${p.recebe} PC-T`],
  ], taxaAnuncio: p.taxaAnuncio, recebe: p.recebe };
}

/* ANTES DE COMPRAR: o total, o que chega, e se o PC-T elegível cobre. */
export function previaDaCompra(a, elegivel, nomes) {
  const c = cartaoDoAnuncio(a, nomes);
  const cobre = Number.isFinite(elegivel) && elegivel >= a.preco;
  return { titulo: `Comprar ${c.titulo}`, total: a.preco, cobre,
           linhas: [['Você paga', `${a.preco} PC-T`], ['Você recebe', a.tipo === 'item' ? `${a.quantidade} unidade${a.quantidade === 1 ? '' : 's'} (o lote inteiro)` : c.titulo],
                    ['Seu PC-T elegível', `${elegivel ?? '?'} PC-T`]],
           aviso: cobre ? null : 'PC-T elegível insuficiente para este anúncio.' };
}

/* A série do histórico de um anúncio de criatura: shiny E faixa, sempre. */
export function serieDoAnuncio(a) {
  const r = a.retrato ?? {};
  if (a.tipo === 'item') return `item=${encodeURIComponent(a.itemId ?? r.itemId)}`;
  const f = faixaDoPotencial(r.potencial);
  return f == null ? null : `dex=${r.dex}&shiny=${r.shiny ? 'sim' : 'nao'}&faixa=${f}`;
}
export const rotuloDaFaixa = f => (FAIXAS_POTENCIAL[f] ? `potencial ${FAIXAS_POTENCIAL[f][0]}–${FAIXAS_POTENCIAL[f][1]}` : '');

/* O HISTÓRICO em linhas: fato sempre; agregado só com amostra. */
export function linhasDoHistorico(h) {
  if (!h) return [];
  const l = [['Última venda', h.ultimaVenda ? `${Math.round(h.ultimaVenda.precoUnitario)} PC-T` : 'nenhuma ainda'],
             ['Menor anúncio', h.menorAnuncio != null ? `${Math.round(h.menorAnuncio)} PC-T` : '—'],
             ['Vendas em 7 dias', String(h.n7d)]];
  if (h.suficiente) l.push(['Mediana 7 dias', `${Math.round(h.mediana7d)} PC-T`], ['Volume 7 dias', `${h.volume7d.pct} PC-T · ${h.volume7d.unidades} un.`]);
  return l;
}

/* A RECUSA EM PALAVRAS — a do Market; a das contas é a mesma das trocas. */
export function textoDaRecusaDoMercado(r = {}) {
  const c = r.corpo ?? r;
  if (r.indisponivel) return 'Sem conexão com o servidor — a compra NÃO foi feita; tente de novo (a mesma tentativa, sem cobrar duas vezes).';
  switch (c?.codigo) {
    case 'ANUNCIO_ESTADO': return /vendido/.test(c.erro ?? '') ? 'Alguém comprou antes — este anúncio já foi vendido.' : 'Este anúncio não está mais à venda.';
    case 'ANUNCIO_DESATUALIZADO': return 'O anúncio mudou desde que você abriu — recarregue e confira.';
    case 'ANUNCIO_NAO_ENCONTRADO': return 'Anúncio não encontrado.';
    case 'ANUNCIO_ENTRADA': return c.erro || 'Anúncio inválido.';
    case 'BUSCA_INVALIDA': return 'A busca tem um filtro inválido.';
  }
  switch (c?.reason_code) {
    case 'FEATURE_DISABLED': return 'O Market ainda está desligado — ele abre no lançamento da economia entre jogadores.';
    case 'INSUFFICIENT_FUNDS': return 'PC-T elegível insuficiente.';
    case 'OFFER_EXPIRED': return 'O prazo deste anúncio acabou.';
    case 'CAPACITY_EXCEEDED': return 'Você já tem 10 anúncios ativos — cancele um antes.';
    case 'ASSET_COOLDOWN': return 'Chegou numa troca há pouco — espere o fim do intervalo para anunciar.';
    case 'ASSET_BUSY': return 'Está ocupado: em expedição, na run ou preso em outra oferta.';
    case 'ASSET_BOUND': return 'Isto não pode ir ao Market (vínculo de origem).';
    case 'NO_MATCH': return 'Ninguém paga isso agora — baixe o preço mínimo, ou espere uma ordem nova.';
    case 'ACCOUNT_RESTRICTED': return /mesma_conta/.test(c.erro ?? '') ? 'Este anúncio é seu.' : /conta_ligada/.test(c.erro ?? '') ? 'Esta conta está ligada à de quem vende — a compra entre elas não existe.' : 'Uma das contas não pode negociar agora.';
  }
  return c?.erro || 'Não deu certo.';
}

/* A chave da compra é DA TENTATIVA: nasce ao abrir a confirmação e é a mesma
   em todo reenvio — o timeout reenvia a mesma, e o servidor devolve o recibo
   em vez de cobrar de novo. */
export const novaChaveDeCompra = (rand = Math.random) => `compra-${Date.now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;


/* ── AS ORDENS DE COMPRA (ST-14.11A) ──────────────────────────────────────
 * Uma ordem diz "quero N, pago até P cada". A tela tem três coisas a dizer,
 * e as três saem daqui: o que a ordem PRENDE e o que custa para nascer; o
 * que quem tem o item recebe se vender para o livro agora; e, das minhas
 * ordens, quanto já veio e quanto ainda está preso. */

/* Os itens que o livro aceita: o que negocia, na ordem do pack. */
export function itensDoLivro(pack, nomeDoItem = id => id) {
  const ids = [...(pack?.bolas ?? []).map(b => b.id), ...(pack?.catalogo ?? []).map(i => i.id), ...(pack?.material ? [pack.material.id] : [])];
  return [...new Set(ids)].filter(id => tipoDoItem(pack, id)?.negociavel).map(id => ({ id, nome: nomeDoItem(id) }));
}

export function previaDaOrdem({ quantidade, precoUnit, elegivel }) {
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || !Number.isSafeInteger(precoUnit) || precoUnit <= 0)
    return { ok: false, motivo: 'Diga quantas unidades e o preço máximo por unidade, em PC-T inteiros.' };
  const p = previewOrdem({ quantidade, precoUnit });
  if (!p.ok) return { ok: false, motivo: `${p.motivo}.` };
  const cobre = Number.isFinite(elegivel) && elegivel >= p.total;
  return { ok: true, cobre, reserva: p.reserva, taxa: p.taxaCriacao, linhas: [
    ['Fica preso até encher', `${p.reserva} PC-T (${quantidade} × ${precoUnit})`],
    ['Taxa para criar (sai agora, não volta)', `${p.taxaCriacao} PC-T`],
    ['Sai do seu PC-T agora', `${p.total} PC-T`],
  ], nota: 'Enche aos poucos, de vários vendedores. Se achar um lote anunciado mais barato, compra na hora e devolve a diferença. Cancelar devolve o que ainda não encheu.',
     aviso: cobre ? null : 'PC-T elegível insuficiente para prender esta ordem.' };
}

/* QUANTO VENDO PARA O LIVRO AGORA — uma ESTIMATIVA a partir do livro
   agregado por preço (a tela não vê as ordens uma a uma; o servidor casa
   ordem por ordem e confere o mínimo de cada pedaço). A taxa é a do
   acumulado, a mesma conta do servidor. */
export function previaDaVendaParaOrdens({ niveis = [], quantidade, precoMinimo, tenho = 0 }) {
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || !Number.isSafeInteger(precoMinimo) || precoMinimo <= 0)
    return { ok: false, motivo: 'Diga quantas unidades e o menor preço por unidade que você aceita.' };
  if (quantidade > tenho) return { ok: false, motivo: `Você tem ${tenho} para vender.` };
  const livro = niveis.map((n, i) => ({ id: `n${i}`, seq: i, precoUnit: n.precoUnit, restante: n.quantidade, compradorId: null }));
  const fills = taxasDosFills(casarVenda({ livro, vendedorId: '__eu__', oferta: quantidade, precoMinimo, minimo: MINIMO_FILL }));
  if (!fills.length) return { ok: false, motivo: 'Ninguém paga isso agora — baixe o preço mínimo, ou espere uma ordem nova.' };
  const soma = k => fills.reduce((a, f) => a + f[k], 0);
  const vende = soma('quantidade');
  return { ok: true, vende, linhas: [
    ['Vende agora', `${vende} de ${quantidade}${vende < quantidade ? ' (o resto fica com você)' : ''}`],
    ['Preço', fills.map(f => `${f.quantidade} × ${f.precoUnit}`).join(' + ')],
    ['Taxa de venda', `${soma('taxaVenda')} PC-T`],
    ['Você recebe (estimativa)', `${soma('liquido')} PC-T`],
  ] };
}

const ESTADO_DA_ORDEM = { ACTIVE: 'aberta', FILLED: 'cheia', CANCELLED: 'cancelada', EXPIRED: 'vencida', BLOCKED: 'bloqueada' };
export function linhaDaMinhaOrdem(o, nomeDoItem = id => id) {
  return {
    id: o.id, aberta: o.estado === 'ACTIVE', estado: ESTADO_DA_ORDEM[o.estado] ?? o.estado, classe: o.estado,
    titulo: `${nomeDoItem(o.itemId)} · até ${o.precoUnit} cada`,
    progresso: `${o.executado} de ${o.quantidade} compradas`,
    detalhe: [o.pago ? `pagou ${o.pago} PC-T` : null, o.liberado ? `${o.liberado} voltaram (lote mais barato)` : null,
              o.reservado ? `${o.reservado} PC-T presos` : null].filter(Boolean).join(' · ') || 'nada comprado ainda',
  };
}

export const linhasDoLivro = livro => (livro?.niveis ?? []).map(n => `${n.quantidade} un. a ${n.precoUnit} cada${n.ordens > 1 ? ` (${n.ordens} ordens)` : ''}`);
export const novaChaveDeOrdem = (rand = Math.random) => `ordem-${Date.now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
