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
import { nivelDe } from '../../engine/nivel-criatura.mjs';
import { separarOfertaveis, itensNegociaveis } from './trocas-dados.mjs';
import { abasDoMercado, ORDENS_MERCADO, consultaDaBusca, cartaoDoAnuncio, previaDoAnuncio, previaDaCompra, serieDoAnuncio,
         linhasDoHistorico, textoDaRecusaDoMercado, novaChaveDeCompra } from './mercado-jogadores-dados.mjs';

const nomeDoItem = nomesDe(PACK);
const nomeDaEspecie = dex => nomeExibido((PACK.especies ?? []).find(e => e.dex === dex)?.n ?? `#${dex}`);
const NOMES = { nomeDaEspecie, nomeDoItem };
const NATUREZAS = (PACK.naturezas ?? []).map(n => n[0]);

const M = { aba: 'criaturas', f: { ordem: 'recente' }, lista: [], proximo: null, carregando: false, estado: null,
            aberto: null, historico: null, compra: null, recibo: null, meus: null, venda: null, colecao: null, msg: null, ocupado: false };
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

function pintar() {
  const alvo = corpo(); if (!alvo) return;
  if (!api.temSessao()) {
    alvo.innerHTML = `<div class="trMesa trComo"><h4>Market entre treinadores</h4><p>Comprar e vender precisa de conta: o Market acontece no servidor, com cada venda conferida. Entre ou crie a sua conta no topo da tela.</p></div>`;
    return;
  }
  const desligado = M.estado && !M.estado.ligada ? `<p class="trAviso" role="status">${esc(textoDaRecusaDoMercado({ corpo: { reason_code: M.estado.motivo?.reason_code } }))}</p>` : '';
  const loja = M.aba !== 'meus' && M.aba !== 'compras';
  alvo.innerHTML = `${desligado}
    <nav class="mkAbas" aria-label="categorias do Market">${abasDoMercado(PACK.rotulos).map(([id, r]) => `<button class="pdxAba${id === M.aba ? ' on' : ''}" data-mk-aba="${id}">${esc(r)}</button>`).join('')}</nav>
    ${loja ? filtrosHtml() : ''}
    ${detalheHtml()}
    ${loja ? (M.carregando && !M.lista.length ? '<p class="mkVazio">Carregando…</p>'
      : M.lista.length ? `<div class="mkGrade">${M.lista.map(cartao).join('')}</div>${M.proximo ? '<button class="btn mkMais" data-mk-mais>Carregar mais</button>' : ''}`
      : '<p class="mkVazio">Nenhum anúncio nesta busca.</p>') : listaMeusHtml()}
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
  const v = ev.target.closest?.('[data-mk-v]');
  if (v) { M.venda = { ...(M.venda ?? {}), [v.dataset.mkV]: v.value }; if (v.dataset.mkV !== 'preco') pintar(); else { const el = document.querySelector('#mkVenda'); if (el) el.outerHTML = vendaHtml(); } }
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
  if (ev.target.id === 'mkVenda') {
    ev.preventDefault();
    const v = M.venda ?? {}, [tipo, id] = String(v.ativo ?? '').split(/:(.*)/s);
    const ativo = tipo === 'c' ? { criaturaId: id } : { itemId: id, quantidade: Math.floor(Number(v.quantidade) || 1) };
    const r = await postar('/api/player-market/anunciar', { ativo, preco: Math.floor(Number(v.preco)) });
    if (r.ok) { M.venda = null; await mostrarAba('meus'); await carregarColecao(); } else pintar();
  }
});
