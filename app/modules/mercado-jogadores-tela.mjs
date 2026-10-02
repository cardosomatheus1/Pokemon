/* A TELA DO MARKET (ST-14.13 · E14 · spec E14 §10.2) — camada 4, só pinta.
 *
 * A quarta aba da Pokédex, ao lado das Trocas: comprar e vender é sobre a
 * coleção. Tudo o que a tela ESCREVE sai de `mercado-jogadores-dados.mjs`
 * (camada 0) e da resposta do servidor — nenhum preço, saldo ou taxa nasce
 * aqui. O teste dos 3 segundos é a régua: a busca no alto, o brilhante dito
 * em palavra e não só em cor, o preço TOTAL como o número maior do cartão, e
 * um botão principal por vista.
 *
 * A COMPRA tem uma chave por TENTATIVA: nasce ao abrir a confirmação e é a
 * mesma em todo reenvio. Um timeout reenvia a mesma — o servidor devolve o
 * recibo, e nunca cobra duas vezes. Desabilitar o duplo clique é cortesia;
 * a garantia é a chave.
 */
import { api } from './api.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { estiloItem } from './itens-icone.mjs';
import { nomesDe } from './itens-nome.mjs';
import { confirmar as perguntar } from './dialogo.mjs';
import { escapar as esc } from './grafico.mjs';
import { introDoMercado } from './guia-dados.mjs';
import { nivelDe } from '../../engine/nivel-criatura.mjs';
import { separarOfertaveis, itensNegociaveis } from './trocas-dados.mjs';
import { abasDoMercado, ORDENS_MERCADO, consultaDaBusca, cartaoDoAnuncio, previaDoAnuncio, previaDaCompra, serieDoAnuncio,
         linhasDoHistorico, textoDaRecusaDoMercado, novaChaveDeCompra,
         itensDoLivro, previaDaOrdem, previaDaVendaParaOrdens, linhaDaMinhaOrdem, linhasDoLivro, novaChaveDeOrdem,
         criteriosDoFormulario, previaDaOrdemDeCriatura, queServem, vendaParaOrdemDeCriatura } from './mercado-jogadores-dados.mjs';
import { textoDosCriterios } from '../../engine/criterios-mercado.mjs';

const nomeDoItem = nomesDe(PACK);
const nomeDaEspecie = dex => nomeExibido((PACK.especies ?? []).find(e => e.dex === dex)?.n ?? `#${dex}`);
const NOMES = { nomeDaEspecie, nomeDoItem };
const NATUREZAS = (PACK.naturezas ?? []).map(n => n[0]);

const M = { aba: 'criaturas', f: { ordem: 'recente' }, lista: [], proximo: null, carregando: false, estado: null,
            aberto: null, historico: null, compra: null, recibo: null, meus: null, venda: null, colecao: null, msg: null, ocupado: false,
            /* ST-14.11A: a aba das ordens de compra — o item escolhido, o livro dele, as minhas, e as duas fichas */
            ord: { item: null, livro: null, minhas: [], q: '', p: '', vq: '', vmin: '', chave: null, chaveVenda: null, ok: null,
                   /* ST-14.11B: as ordens de criatura — a lista aberta, a ficha de pedir, e a escolha de quem vender a cada ordem */
                   tipo: 'item', criaturas: [], cf: {}, escolha: {} } };
const corpo = () => document.getElementById('mercadoCorpo');

/* ── CARREGAR ─────────────────────────────────────────────────────────── */
export async function abrirMercado() {
  if (!api.temSessao()) { pintar(); return; }
  const e = await api.get('/api/player-market/estado');
  M.estado = e.ok ? e.corpo : null;
  if (!e.ok) M.msg = textoDaRecusaDoMercado(e);
  await mostrarAba(M.aba);
}

async function mostrarAba(aba) {
  Object.assign(M, { aba, aberto: null, compra: null, recibo: null, msg: null });
  if (aba === 'ordens') { await carregarOrdens(); await carregarColecao(); return; }
  if (aba === 'meus' || aba === 'compras') {
    const r = await api.get('/api/player-market/meus');
    M.meus = r.ok ? r.corpo : { anuncios: [], compras: [] };
    if (!r.ok) M.msg = textoDaRecusaDoMercado(r);
    pintar(); return;
  }
  await buscar();
}

async function buscar({ mais = false } = {}) {
  M.carregando = true; if (!mais) { M.lista = []; M.proximo = null; } pintar();
  const r = await api.get(`/api/player-market/busca?${consultaDaBusca({ ...M.f, categoria: M.aba, cursor: mais ? M.proximo : null })}`);
  M.carregando = false;
  if (r.ok) { M.lista = mais ? [...M.lista, ...r.corpo.anuncios] : r.corpo.anuncios; M.proximo = r.corpo.proximo; }
  else M.msg = textoDaRecusaDoMercado(r);
  pintar();
}

async function abrirAnuncio(id) {
  const r = await api.get(`/api/player-market/anuncio?id=${encodeURIComponent(id)}`);
  if (!r.ok) { M.msg = textoDaRecusaDoMercado(r); pintar(); return; }
  Object.assign(M, { aberto: r.corpo, compra: null, recibo: null, historico: null, msg: null });
  pintar();
  const serie = serieDoAnuncio(r.corpo);
  if (serie) { const h = await api.get(`/api/player-market/historico?${serie}`); M.historico = h.ok ? h.corpo : null; pintar(); }
}

/* ── PINTAR ───────────────────────────────────────────────────────────── */
const icone = (c, tam = 48) => {
  const est = c.tipo === 'item' ? estiloItem(c.itemId, Math.round(tam * 0.75)) : estiloIcone(PACK, c.dex, tam);
  return est ? `<span class="mkIcone" style="${est}"></span>` : '<span class="mkIcone"></span>';
};

const cartao = a => {
  const c = cartaoDoAnuncio(a, NOMES);
  return `<button class="mkCartao${c.shiny ? ' mkBrilha' : ''}" data-mk-abrir="${esc(c.id)}">
    ${icone(c)}<b class="mkTitulo">${esc(c.titulo)}</b>
    <span class="mkDetalhe">${c.shiny ? '<span class="mkSelo">brilhante</span> ' : ''}${esc(c.detalhe)}</span>
    <span class="mkPreco">${esc(c.preco)}</span>${c.porUnidade ? `<span class="mkUnit">${esc(c.porUnidade)}</span>` : ''}
    <span class="mkVendedor">de ${esc(c.vendedor)}</span></button>`;
};

function filtrosHtml() {
  const f = M.f, criaturas = M.aba === 'criaturas';
  const sel = (nome, opcoes, atual) => `<select data-mk-f="${nome}">${opcoes.map(([v, r]) => `<option value="${esc(v)}"${String(atual ?? '') === String(v) ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
  return `<form class="mkFiltros" id="mkFiltros" autocomplete="off">
    ${criaturas ? `<label>Espécie<input data-mk-f="especie" list="mkEspecies" value="${esc(f.especie ?? '')}" placeholder="qualquer"></label>
      <datalist id="mkEspecies">${(PACK.especies ?? []).map(e => `<option value="${esc(nomeExibido(e.n))}">`).join('')}</datalist>
      <label>Brilhante${sel('shiny', [['', 'todos'], ['nao', 'normal'], ['sim', 'brilhante']], f.shiny === true ? 'sim' : f.shiny === false ? 'nao' : '')}</label>
      <label>Nível mín.<input type="number" min="1" max="100" data-mk-f="nivelMin" value="${esc(f.nivelMin ?? '')}"></label>
      <label>Natureza${sel('natureza', [['', 'qualquer'], ...NATUREZAS.map(n => [n, n])], f.natureza)}</label>
      <label>Potencial mín.<input type="number" min="0" max="100" data-mk-f="potencialMin" value="${esc(f.potencialMin ?? '')}"></label>` : ''}
    <label>Preço máx.<input type="number" min="0" data-mk-f="precoMax" value="${esc(f.precoMax ?? '')}"></label>
    <label>Ordem${sel('ordem', ORDENS_MERCADO, f.ordem)}</label>
    <button class="btn gold">Buscar</button></form>`;
}

function detalheHtml() {
  const a = M.aberto; if (!a) return '';
  const c = cartaoDoAnuncio(a, NOMES), r = a.retrato ?? {}, meu = a.liquido != null;
  const hist = linhasDoHistorico(M.historico);
  const comprar = M.recibo ? `<p class="mkOk" role="status">Comprado — ${esc(c.titulo)} já está na sua coleção.</p>`
    : M.compra ? (() => {
        const p = previaDaCompra(a, M.estado?.pctElegivel, NOMES);
        return `<div class="mkConfirma"><b>${esc(p.titulo)}</b><dl>${p.linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          ${p.aviso ? `<p class="mkAviso">${esc(p.aviso)}</p>` : ''}
          <div class="mkAcoes"><button class="btn gold" data-mk-confirmar ${p.cobre && !M.ocupado ? '' : 'disabled'}>Confirmar a compra</button><button class="btn" data-mk-voltar>Voltar</button></div></div>`;
      })()
    : meu ? `<p class="tiny">Seu anúncio · você recebe ${a.liquido} PC-T se vender (taxa de venda ${a.taxaVenda}).</p>`
    : `<div class="mkAcoes"><button class="btn gold" data-mk-comprar ${M.estado?.ligada ? '' : 'disabled'}>Comprar por ${a.preco} PC-T</button></div>`;
  return `<section class="mkAberto${c.shiny ? ' mkBrilha' : ''}">
    <button class="mkFechar" data-mk-fechar aria-label="fechar">×</button>
    <div class="mkAbertoTopo">${icone(c, 72)}<div><h4>${esc(c.titulo)}${c.shiny ? ' <span class="mkSelo">brilhante</span>' : ''}</h4>
      <p class="mkDetalhe">${esc(c.detalhe)}${r.exemplar ? ' · exemplar' : ''}</p><p class="mkPreco">${esc(c.preco)}${c.porUnidade ? ` <small>${esc(c.porUnidade)}</small>` : ''}</p>
      <p class="tiny">de ${esc(c.vendedor)} · vence ${new Date(a.expiraEm).toLocaleString('pt-BR')}</p></div></div>
    ${r.golpes?.length ? `<p class="tiny">Golpes: ${r.golpes.map(g => esc(String(g))).join(', ')}</p>` : ''}
    <div class="mkHist"><b>Preço desta série</b> <span class="tiny">${M.historico ? `${esc(M.historico.janela?.fuso ?? 'UTC')}, 7 dias` : ''}</span>
      ${hist.length ? `<dl>${hist.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '<p class="tiny">carregando…</p>'}
      ${M.historico && !M.historico.suficiente ? `<p class="tiny">Sem mediana: ${esc(M.historico.motivo ?? 'amostra insuficiente')}.</p>` : ''}</div>
    ${comprar}</section>`;
}

function vendaHtml() {
  const v = M.venda ?? {}; const { ofertaveis } = separarOfertaveis(M.colecao?.criaturas ?? []);
  const itens = itensNegociaveis(M.colecao?.lotes ?? {});
  const p = previaDoAnuncio(Number(v.preco));
  return `<form class="mkVenda" id="mkVenda" autocomplete="off"><h4>Anunciar <span class="tiny">preço total fechado · 24 h</span></h4>
    <label>O quê<select data-mk-v="ativo"><option value="">escolha…</option>
      ${ofertaveis.map(c => `<option value="c:${esc(c.id)}"${v.ativo === `c:${c.id}` ? ' selected' : ''}>${c.shiny ? '✦ ' : ''}${esc(nomeDaEspecie(c.dex))} · nv ${Math.max(c.nivel ?? 1, nivelDe(c.xp ?? 0))}</option>`).join('')}
      ${itens.map(i => `<option value="i:${esc(i.itemId)}"${v.ativo === `i:${i.itemId}` ? ' selected' : ''}>${esc(nomeDoItem(i.itemId))} (até ${i.livre})</option>`).join('')}</select></label>
    ${String(v.ativo ?? '').startsWith('i:') ? `<label>Quantidade<input type="number" min="1" data-mk-v="quantidade" value="${esc(v.quantidade ?? 1)}"></label>` : ''}
    <label>Preço total (PC-T)<input type="number" min="100" step="1" data-mk-v="preco" value="${esc(v.preco ?? '')}" placeholder="mínimo 100"></label>
    ${v.preco ? (p.ok ? `<dl class="mkPrevia">${p.linhas.map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl>` : `<p class="mkAviso">${esc(p.motivo)}</p>`) : ''}
    <button class="btn gold" ${v.ativo && p.ok && M.estado?.ligada && !M.ocupado ? '' : 'disabled'}>Anunciar${p.ok ? ` (paga ${p.taxaAnuncio} agora)` : ''}</button></form>`;
}

function listaMeusHtml() {
  if (M.aba === 'compras') {
    const c = M.meus?.compras ?? [];
    return c.length ? `<ul class="mkMinhas">${c.map(a => `<li>${icone(cartaoDoAnuncio(a, NOMES), 36)}<b>${esc(cartaoDoAnuncio(a, NOMES).titulo)}</b><span>${a.preco} PC-T</span><span class="tiny">${new Date(a.recibo?.compradoEm ?? 0).toLocaleString('pt-BR')}</span></li>`).join('')}</ul>`
      : '<p class="mkVazio">Nenhuma compra ainda.</p>';
  }
  const meus = M.meus?.anuncios ?? [];
  const estado = { ACTIVE: 'à venda', SOLD: 'vendido', CANCELLED: 'cancelado', EXPIRED: 'vencido', BLOCKED: 'bloqueado' };
  return `${vendaHtml()}${meus.length ? `<ul class="mkMinhas">${meus.map(a => `<li>${icone(cartaoDoAnuncio(a, NOMES), 36)}<b>${esc(cartaoDoAnuncio(a, NOMES).titulo)}</b>
      <span>${a.preco} PC-T · recebe ${a.liquido}</span><span class="mkEstado mkE-${a.estado}">${estado[a.estado] ?? a.estado}</span>
      ${a.estado === 'ACTIVE' ? `<button class="btn" data-mk-cancelar="${esc(a.id)}">Cancelar</button>` : ''}</li>`).join('')}</ul>` : '<p class="mkVazio">Nenhum anúncio seu.</p>'}`;
}

/* ── AS ORDENS DE COMPRA (ST-14.11A) ─────────────────────────────────────
 * O livro do item escolhido (agregado por preço — quem pediu não aparece),
 * "quero comprar" e "vender para quem compra" lado a lado, e as minhas
 * ordens embaixo. Toda conta é da camada 0; as prévias se repintam sozinhas,
 * sem tirar o foco do campo que se está digitando. */
const itemDaAba = () => M.ord.item ?? itensDoLivro(PACK, nomeDoItem)[0]?.id ?? null;
const tenhoLivre = id => itensNegociaveis(M.colecao?.lotes ?? {}).find(i => i.itemId === id)?.livre ?? 0;
const inteiro = v => (v === '' || v == null ? NaN : Math.floor(Number(v)));
function previasDasOrdens() {
  const item = itemDaAba();
  const c = previaDaOrdem({ quantidade: inteiro(M.ord.q), precoUnit: inteiro(M.ord.p), elegivel: M.estado?.pctElegivel });
  const v = previaDaVendaParaOrdens({ niveis: M.ord.livro?.niveis ?? [], quantidade: inteiro(M.ord.vq), precoMinimo: inteiro(M.ord.vmin), tenho: tenhoLivre(item) });
  const dl = p => `<dl class="mkPrevia">${p.linhas.map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl>`;
  return {
    compra: (M.ord.q || M.ord.p) ? (c.ok ? `${dl(c)}<p class="tiny mkNota">${esc(c.nota)}</p>${c.aviso ? `<p class="mkAviso">${esc(c.aviso)}</p>` : ''}` : `<p class="mkAviso">${esc(c.motivo)}</p>`) : '',
    podeComprar: c.ok && c.cobre && M.estado?.ligada && !M.ocupado, reserva: c.ok ? c.reserva : null,
    venda: (M.ord.vq || M.ord.vmin) ? (v.ok ? dl(v) : `<p class="mkAviso">${esc(v.motivo)}</p>`) : '',
    podeVender: v.ok && M.estado?.ligada && !M.ocupado,
  };
}
const dexDoNome = nome => (PACK.especies ?? []).find(e => nomeExibido(e.n).toLowerCase() === nome.toLowerCase())?.dex ?? null;
function previaDaCriatura() {
  const cf = M.ord.cf ?? {}, c = criteriosDoFormulario(cf, PACK, dexDoNome);
  const p = c.ok ? previaDaOrdemDeCriatura({ criterios: c.criterios, preco: inteiro(cf.preco), elegivel: M.estado?.pctElegivel, nomeDaEspecie }) : c;
  const tocou = Object.values(cf).some(v => v !== '' && v != null);
  return { c, p, html: !tocou ? '' : p.ok ? `<dl class="mkPrevia">${p.linhas.map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl><p class="tiny mkNota mkAceite">${esc(p.nota)}</p>${p.aviso ? `<p class="mkAviso">${esc(p.aviso)}</p>` : ''}`
    : `<p class="mkAviso">${esc(p.motivo)}</p>`, pode: p.ok && p.cobre && M.estado?.ligada && !M.ocupado };
}
function ordensDeCriaturaHtml(minhasHtml) {
  const cf = M.ord.cf ?? {}, pv = previaDaCriatura(), minhasCriaturas = M.colecao?.criaturas ?? [];
  const { ofertaveis } = separarOfertaveis(minhasCriaturas);
  const abertas = M.ord.criaturas ?? [];
  const sel = (k, opcoes) => `<select data-mk-c="${k}">${opcoes.map(([v, r]) => `<option value="${esc(v)}"${String(cf[k] ?? '') === String(v) ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
  return `<div class="mkOrdFichas">
      <div class="mkVenda mkOrdAbertas"><h4>Quem procura uma criatura <span class="tiny">venda uma sua que cumpra tudo</span></h4>
        ${abertas.length ? `<ul class="mkOrdLista">${abertas.map(o => {
          const servem = queServem(ofertaveis, o.criterios, PACK), v = vendaParaOrdemDeCriatura(o), escolhida = M.ord.escolha[o.id] ?? servem[0]?.id ?? '';
          return `<li><b>${esc(textoDosCriterios(o.criterios, nomeDaEspecie))}</b><span class="mkPreco">${o.preco} PC-T</span>
            ${servem.length ? `<label class="mkOrdServe">Sua<select data-mk-escolha="${esc(o.id)}">${servem.map(c => `<option value="${esc(c.id)}"${c.id === escolhida ? ' selected' : ''}>${c.shiny ? '✦ ' : ''}${esc(nomeDaEspecie(c.dex))} · nv ${Math.max(c.nivel ?? 1, nivelDe(c.xp ?? 0))} · pot ${c.potencial ?? '?'}</option>`).join('')}</select></label>
              <button class="btn gold" data-mk-ord-vcria="${esc(o.id)}" ${M.estado?.ligada && !M.ocupado ? '' : 'disabled'}>Vender · recebe ${v.liquido}</button>`
              : '<span class="tiny">nenhuma sua serve</span>'}</li>`; }).join('')}</ul>` : '<p class="mkVazio">Ninguém está procurando criatura agora.</p>'}
      </div>
      <form class="mkVenda" id="mkOrdCriatura" autocomplete="off"><h4>Quero uma criatura <span class="tiny">uma só · 3 dias</span></h4>
        <label>Espécie<input data-mk-c="especie" list="mkEspeciesOrd" value="${esc(cf.especie ?? '')}" placeholder="qual?"></label>
        <datalist id="mkEspeciesOrd">${(PACK.especies ?? []).map(e => `<option value="${esc(nomeExibido(e.n))}">`).join('')}</datalist>
        <label>Brilhante${sel('shiny', [['', 'tanto faz'], ['nao', 'normal'], ['sim', 'brilhante']])}</label>
        <label>Nível mín.<input type="number" min="1" max="100" data-mk-c="nivelMin" value="${esc(cf.nivelMin ?? '')}"></label>
        <label>Nível máx.<input type="number" min="1" max="100" data-mk-c="nivelMax" value="${esc(cf.nivelMax ?? '')}"></label>
        <label>Natureza${sel('natureza', [['', 'qualquer'], ...NATUREZAS.map(n => [n, n])])}</label>
        <label>Potencial mín.<input type="number" min="0" max="100" data-mk-c="potencialMin" value="${esc(cf.potencialMin ?? '')}"></label>
        <label>Pago até<input type="number" min="100" step="1" data-mk-c="preco" value="${esc(cf.preco ?? '')}" placeholder="PC-T"></label>
        <div class="mkOrdPrev" data-mk-prev="criatura">${pv.html}</div>
        <button class="btn gold" data-mk-ord-ccria ${pv.pode ? '' : 'disabled'}>Criar ordem</button></form>
    </div>
    ${M.ord.ok ? `<p class="mkOk" role="status">${esc(M.ord.ok)}</p>` : ''}
    ${minhasHtml}`;
}
function minhasOrdensHtml() {
  const minhas = (M.ord.minhas ?? []).map(o => ({ o, l: linhaDaMinhaOrdem(o, nomeDoItem, nomeDaEspecie) }));
  return `<h4 class="mkOrdMinhasT">Minhas ordens</h4>
    ${minhas.length ? `<ul class="mkMinhas">${minhas.map(({ o, l }) => `<li>${icone(o.tipo === 'criatura' ? { tipo: 'criatura', dex: o.criterios?.dex } : { tipo: 'item', itemId: o.itemId }, 32)}<b>${esc(l.titulo)}</b>
        <span>${esc(l.progresso)}</span><span class="tiny">${esc(l.detalhe)}</span><span class="mkEstado mkE-${l.classe}">${esc(l.estado)}</span>
        ${l.aberta ? `<button class="btn" data-mk-ord-cancelar="${esc(l.id)}">Cancelar</button>` : ''}</li>`).join('')}</ul>` : '<p class="mkVazio">Nenhuma ordem sua.</p>'}`;
}
function ordensHtml() {
  const tipos = `<nav class="mkOrdTipos" aria-label="o que comprar">${[['item', 'Itens'], ['criatura', PACK.rotulos?.criaturas ?? 'Criaturas']].map(([id, r]) =>
    `<button class="pdxAba${M.ord.tipo === id ? ' on' : ''}" data-mk-ord-tipo="${id}">${esc(r)}</button>`).join('')}</nav>`;
  if (M.ord.tipo === 'criatura') return `<section class="mkOrdens">${tipos}${ordensDeCriaturaHtml(minhasOrdensHtml())}</section>`;
  const itens = itensDoLivro(PACK, nomeDoItem), item = itemDaAba(), livro = linhasDoLivro(M.ord.livro), tenho = tenhoLivre(item), p = previasDasOrdens();
  return `<section class="mkOrdens">${tipos}
    <div class="mkOrdTopo"><label>Item<select data-mk-o="item">${itens.map(i => `<option value="${esc(i.id)}"${i.id === item ? ' selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></label>
      ${icone({ tipo: 'item', itemId: item }, 44)}
      <div class="mkOrdLivro"><b>Quem está comprando ${esc(nomeDoItem(item))}</b>
        ${livro.length ? `<ul>${livro.map((l, i) => `<li${i === 0 ? ' class="mkMelhor"' : ''}>${esc(l)}</li>`).join('')}</ul>` : '<p class="mkVazio">Ninguém está comprando agora — seja o primeiro.</p>'}</div></div>
    <div class="mkOrdFichas">
      <form class="mkVenda" id="mkOrdCompra" autocomplete="off"><h4>Quero comprar <span class="tiny">enche aos poucos · 3 dias</span></h4>
        <label>Quantas<input type="number" min="1" step="1" data-mk-o="q" value="${esc(M.ord.q)}"></label>
        <label>Pago até (cada)<input type="number" min="1" step="1" data-mk-o="p" value="${esc(M.ord.p)}" placeholder="PC-T"></label>
        <div class="mkOrdPrev" data-mk-prev="compra">${p.compra}</div>
        <button class="btn gold" data-mk-ord-criar ${p.podeComprar ? '' : 'disabled'}>Criar ordem${p.reserva ? ` (prende ${p.reserva})` : ''}</button></form>
      <form class="mkVenda" id="mkOrdVenda" autocomplete="off"><h4>Vender para quem compra <span class="tiny">você tem ${tenho} livre${tenho === 1 ? '' : 's'}</span></h4>
        <label>Quantas<input type="number" min="1" max="${tenho}" step="1" data-mk-o="vq" value="${esc(M.ord.vq)}"></label>
        <label>Aceito no mínimo (cada)<input type="number" min="1" step="1" data-mk-o="vmin" value="${esc(M.ord.vmin)}" placeholder="${esc(M.ord.livro?.melhor ?? 'PC-T')}"></label>
        <div class="mkOrdPrev" data-mk-prev="venda">${p.venda}</div>
        <button class="btn gold" data-mk-ord-vender ${p.podeVender ? '' : 'disabled'}>Vender agora</button></form>
    </div>
    ${M.ord.ok ? `<p class="mkOk" role="status">${esc(M.ord.ok)}</p>` : ''}
    ${minhasOrdensHtml()}
  </section>`;
}
function repintarPrevias() {
  const p = previasDasOrdens(), q = sel => document.querySelector(sel);
  if (q('[data-mk-prev="criatura"]')) { const pv = previaDaCriatura(); q('[data-mk-prev="criatura"]').innerHTML = pv.html; const b = q('[data-mk-ord-ccria]'); if (b) b.disabled = !pv.pode; }
  if (q('[data-mk-prev="compra"]')) q('[data-mk-prev="compra"]').innerHTML = p.compra;
  if (q('[data-mk-prev="venda"]')) q('[data-mk-prev="venda"]').innerHTML = p.venda;
  const bc = q('[data-mk-ord-criar]'), bv = q('[data-mk-ord-vender]');
  if (bc) { bc.disabled = !p.podeComprar; bc.textContent = `Criar ordem${p.reserva ? ` (prende ${p.reserva})` : ''}`; }
  if (bv) bv.disabled = !p.podeVender;
}
async function carregarOrdens() {
  const item = itemDaAba();
  const r = await api.get(`/api/player-market/buy-orders${item ? `?item=${encodeURIComponent(item)}` : ''}`);
  if (r.ok) { M.ord.livro = r.corpo.livro; M.ord.minhas = r.corpo.minhas ?? []; M.ord.criaturas = r.corpo.criaturas ?? []; } else M.msg = textoDaRecusaDoMercado(r);
  pintar();
}

function pintar() {
  const alvo = corpo(); if (!alvo) return;
  if (!api.temSessao()) {
    alvo.innerHTML = `<div class="trMesa trComo"><h4>Mercado entre treinadores</h4><p>Comprar e vender precisa de conta: o Mercado acontece no servidor, com cada venda conferida. Entre ou crie a sua conta no topo da tela.</p></div>`;
    return;
  }
  const desligado = M.estado && !M.estado.ligada ? `<p class="trAviso" role="status">${esc(textoDaRecusaDoMercado({ corpo: { reason_code: M.estado.motivo?.reason_code } }))}</p>` : '';
  const loja = M.aba !== 'meus' && M.aba !== 'compras' && M.aba !== 'ordens';
  alvo.innerHTML = `${desligado}
    <p class="mkIntro">${esc(introDoMercado(PACK))} <button class="guiaQ" type="button" data-guia-secao="mercado">como funciona →</button></p>
    <nav class="mkAbas" aria-label="categorias do Mercado">${abasDoMercado(PACK.rotulos).map(([id, r]) => `<button class="pdxAba${id === M.aba ? ' on' : ''}" data-mk-aba="${id}">${esc(r)}</button>`).join('')}</nav>
    ${loja ? filtrosHtml() : ''}
    ${detalheHtml()}
    ${loja ? (M.carregando && !M.lista.length ? '<p class="mkVazio">Carregando…</p>'
      : M.lista.length ? `<div class="mkGrade">${M.lista.map(cartao).join('')}</div>${M.proximo ? '<button class="btn mkMais" data-mk-mais>Carregar mais</button>' : ''}`
      : '<p class="mkVazio">Nenhum anúncio nesta busca.</p>') : M.aba === 'ordens' ? ordensHtml() : listaMeusHtml()}
    ${M.msg ? `<p class="trMsg" role="alert">${esc(M.msg)}</p>` : ''}`;
}

/* ── OUVIR ────────────────────────────────────────────────────────────── */
async function postar(rota, corpoDoPedido) {
  M.ocupado = true; pintar();
  const r = await api.post(rota, corpoDoPedido);
  M.ocupado = false;
  M.msg = r.ok ? null : textoDaRecusaDoMercado(r);
  return r;
}

document.addEventListener('click', async ev => {
  if (!ev.target.closest?.('#mercadoCorpo')) return;
  const t = ev.target;
  const aba = t.closest('[data-mk-aba]'); if (aba) { await mostrarAba(aba.dataset.mkAba); if (aba.dataset.mkAba === 'meus') await carregarColecao(); return; }
  const abrir = t.closest('[data-mk-abrir]'); if (abrir) { await abrirAnuncio(abrir.dataset.mkAbrir); return; }
  if (t.closest('[data-mk-fechar]')) { M.aberto = null; pintar(); return; }
  if (t.closest('[data-mk-mais]')) { await buscar({ mais: true }); return; }
  if (t.closest('[data-mk-comprar]')) { M.compra = { chave: novaChaveDeCompra() }; pintar(); return; }
  if (t.closest('[data-mk-voltar]')) { M.compra = null; pintar(); return; }
  if (t.closest('[data-mk-confirmar]') && M.aberto && M.compra && !M.ocupado) {
    const a = M.aberto;
    const r = await postar('/api/player-market/comprar', { id: a.id, versao: a.versao, preco: a.preco, chave: M.compra.chave });
    if (r.ok) {
      M.recibo = r.corpo; M.compra = null;
      /* o vendido sai da vitrine na hora, e o PC-T elegível cai */
      const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo;
      await buscar(); return;
    }
    else if (!r.indisponivel) M.compra = null;   // sem conversa: a MESMA chave fica para o reenvio
    pintar(); return;
  }
  /* ST-14.11A: as ordens. A chave é da TENTATIVA, como a da compra. */
  if (t.closest('[data-mk-ord-criar]') && !M.ocupado) {
    ev.preventDefault();
    const q = inteiro(M.ord.q), pu = inteiro(M.ord.p), prev = previaDaOrdem({ quantidade: q, precoUnit: pu, elegivel: M.estado?.pctElegivel });
    if (!prev.ok || !await perguntar(`Criar a ordem: ${q} × ${nomeDoItem(itemDaAba())} a até ${pu} cada? Ficam presos ${prev.reserva} PC-T, e a taxa de ${prev.taxa} não volta.`, { ok: 'Criar a ordem', cancelar: 'Voltar' })) return;
    M.ord.chave ??= novaChaveDeOrdem();
    const r = await postar('/api/player-market/buy-orders/create', { itemId: itemDaAba(), quantidade: q, precoUnit: pu, chave: M.ord.chave });
    if (r.ok) {
      Object.assign(M.ord, { q: '', p: '', chave: null, ok: r.corpo.executado ? `Ordem criada — ${r.corpo.executado} já chegaram de um lote anunciado mais barato.` : 'Ordem criada — ela enche conforme alguém vende.' });
      const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo;
      await carregarOrdens(); await carregarColecao(); return;
    }
    if (!r.indisponivel) M.ord.chave = null;
    pintar(); return;
  }
  if (t.closest('[data-mk-ord-vender]') && !M.ocupado) {
    ev.preventDefault();
    M.ord.chaveVenda ??= novaChaveDeOrdem();
    const r = await postar('/api/player-market/buy-orders/fill', { itemId: itemDaAba(), quantidade: inteiro(M.ord.vq), precoMinimo: inteiro(M.ord.vmin), chave: M.ord.chaveVenda });
    if (r.ok) {
      Object.assign(M.ord, { vq: '', vmin: '', chaveVenda: null, ok: `Vendido: ${r.corpo.vendido} por ${r.corpo.liquido} PC-T (taxa ${r.corpo.taxaVenda}).` });
      const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo;
      await carregarOrdens(); await carregarColecao(); return;
    }
    if (!r.indisponivel) M.ord.chaveVenda = null;
    pintar(); return;
  }
  const tipo = t.closest('[data-mk-ord-tipo]');
  if (tipo) { Object.assign(M.ord, { tipo: tipo.dataset.mkOrdTipo, ok: null }); pintar(); return; }
  if (t.closest('[data-mk-ord-ccria]') && !M.ocupado) {
    ev.preventDefault();
    const pv = previaDaCriatura();
    if (!pv.p.ok || !await perguntar(`Criar a ordem: ${pv.p.texto}, até ${inteiro(M.ord.cf.preco)} PC-T? Você aceita QUALQUER exemplar que cumpra tudo isto — ele chega sem outra confirmação. A taxa de ${pv.p.taxa} não volta.`, { ok: 'Criar a ordem', cancelar: 'Voltar' })) return;
    M.ord.chave ??= novaChaveDeOrdem();
    const r = await postar('/api/player-market/buy-orders/create-creature', { criterios: pv.c.criterios, preco: inteiro(M.ord.cf.preco), chave: M.ord.chave });
    if (r.ok) {
      Object.assign(M.ord, { cf: {}, chave: null, ok: 'Ordem criada — ela é atendida quando alguém vender uma que cumpra tudo.' });
      const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo;
      await carregarOrdens(); return;
    }
    if (!r.indisponivel) M.ord.chave = null;
    pintar(); return;
  }
  const vcria = t.closest('[data-mk-ord-vcria]');
  if (vcria && !M.ocupado) {
    const o = (M.ord.criaturas ?? []).find(x => x.id === vcria.dataset.mkOrdVcria);
    const id = M.ord.escolha[o?.id] ?? queServem(separarOfertaveis(M.colecao?.criaturas ?? []).ofertaveis, o?.criterios, PACK)[0]?.id;
    const c = (M.colecao?.criaturas ?? []).find(x => x.id === id), v = o ? vendaParaOrdemDeCriatura(o) : null;
    if (!o || !c || !await perguntar(`Vender ${c.shiny ? '✦ ' : ''}${nomeDaEspecie(c.dex)} (nv ${Math.max(c.nivel ?? 1, nivelDe(c.xp ?? 0))}) para esta ordem por ${v.preco} PC-T? Você recebe ${v.liquido} (taxa ${v.taxaVenda}) e ela sai da sua coleção.`, { ok: 'Vender', cancelar: 'Voltar' })) return;
    M.ord.chaveVenda ??= novaChaveDeOrdem();
    const r = await postar('/api/player-market/buy-orders/fill-creature', { id: o.id, criaturaId: c.id, chave: M.ord.chaveVenda });
    if (r.ok) {
      Object.assign(M.ord, { chaveVenda: null, ok: `Vendido: ${nomeDaEspecie(c.dex)} por ${r.corpo.liquido} PC-T.` });
      const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo;
      await carregarOrdens(); await carregarColecao(); return;
    }
    if (!r.indisponivel) M.ord.chaveVenda = null;
    pintar(); return;
  }
  const ocanc = t.closest('[data-mk-ord-cancelar]');
  if (ocanc && await perguntar('Cancelar esta ordem? O PC-T que ainda está preso volta para você; o que já foi comprado fica, e a taxa de criação não volta.', { ok: 'Cancelar a ordem', cancelar: 'Voltar' })) {
    const r = await postar('/api/player-market/buy-orders/cancel', { id: ocanc.dataset.mkOrdCancelar });
    if (r.ok) { M.ord.ok = 'Ordem cancelada — o restante voltou.'; const e = await api.get('/api/player-market/estado'); if (e.ok) M.estado = e.corpo; await carregarOrdens(); } else pintar();
    return;
  }
  const canc = t.closest('[data-mk-cancelar]');
  if (canc && await perguntar('Cancelar este anúncio? O que estava à venda volta para você — a taxa de anúncio não volta.', { ok: 'Cancelar o anúncio', cancelar: 'Voltar' })) {
    const r = await postar('/api/player-market/cancelar', { id: canc.dataset.mkCancelar });
    if (r.ok) await mostrarAba('meus'); else pintar();
  }
});

async function carregarColecao() {
  const r = await api.get('/api/idle');
  M.colecao = r.ok ? { criaturas: r.corpo.criaturas ?? [], lotes: r.corpo.lotes ?? {} } : null;
  pintar();
}

document.addEventListener('input', ev => {
  const o = ev.target.closest?.('[data-mk-o]');
  if (o && o.dataset.mkO !== 'item') { M.ord[o.dataset.mkO] = o.value; M.ord.ok = null; repintarPrevias(); return; }
  const cfc = ev.target.closest?.('[data-mk-c]');
  if (cfc) { M.ord.cf = { ...(M.ord.cf ?? {}), [cfc.dataset.mkC]: cfc.value }; M.ord.ok = null; repintarPrevias(); return; }
  const v = ev.target.closest?.('[data-mk-v]');
  if (v) { M.venda = { ...(M.venda ?? {}), [v.dataset.mkV]: v.value }; if (v.dataset.mkV !== 'preco') pintar(); else { const el = document.querySelector('#mkVenda'); if (el) el.outerHTML = vendaHtml(); } }
});

document.addEventListener('change', async ev => {
  const o = ev.target.closest?.('#mercadoCorpo [data-mk-o="item"]');
  if (o) { Object.assign(M.ord, { item: o.value, vq: '', vmin: '', ok: null }); await carregarOrdens(); }
  const esc0 = ev.target.closest?.('#mercadoCorpo [data-mk-escolha]');
  if (esc0) M.ord.escolha[esc0.dataset.mkEscolha] = esc0.value;
});

document.addEventListener('submit', async ev => {
  if (ev.target.id === 'mkFiltros') {
    ev.preventDefault();
    const val = k => ev.target.querySelector(`[data-mk-f="${k}"]`)?.value ?? '';
    const especie = val('especie').trim().toLowerCase();
    const dex = especie ? (PACK.especies ?? []).find(e => nomeExibido(e.n).toLowerCase() === especie)?.dex ?? -1 : null;
    M.f = { ordem: val('ordem') || 'recente', precoMax: val('precoMax'), nivelMin: val('nivelMin'), natureza: val('natureza'), potencialMin: val('potencialMin'),
            especie: val('especie'), dex: dex === -1 ? null : dex, shiny: val('shiny') === 'sim' ? true : val('shiny') === 'nao' ? false : null };
    if (dex === -1) { M.msg = 'Não conheço essa espécie.'; M.lista = []; pintar(); return; }
    M.aberto = null; await buscar(); return;
  }
  if (ev.target.id === 'mkOrdCompra' || ev.target.id === 'mkOrdVenda' || ev.target.id === 'mkOrdCriatura') { ev.preventDefault(); ev.target.querySelector('.btn:not([disabled])')?.click(); return; }
  if (ev.target.id === 'mkVenda') {
    ev.preventDefault();
    const v = M.venda ?? {}, [tipo, id] = String(v.ativo ?? '').split(/:(.*)/s);
    const ativo = tipo === 'c' ? { criaturaId: id } : { itemId: id, quantidade: Math.floor(Number(v.quantidade) || 1) };
    const r = await postar('/api/player-market/anunciar', { ativo, preco: Math.floor(Number(v.preco)) });
    if (r.ok) { M.venda = null; await mostrarAba('meus'); await carregarColecao(); } else pintar();
  }
});
