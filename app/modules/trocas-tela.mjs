/* A TELA DA TROCA (ST-14.7b · E14 · spec E14 §9) — camada 4, só pinta.
 *
 * A terceira aba da Pokédex, ao lado de "Minha Coleção": a troca é sobre a
 * coleção, e a barra de cima continua com os modos de jogo. Tudo o que esta
 * tela ESCREVE sai de `trocas-dados.mjs` (camada 0): a etapa, o botão, as
 * linhas de cada lado, o motivo da recusa. Aqui só entram os ícones, o HTML
 * e as chamadas à API — e a API confere tudo de novo no servidor.
 *
 * A MESA tem dois lados, lado a lado, com o mesmo peso: o que você manda à
 * esquerda, o que chega à direita — é a leitura de uma troca em qualquer
 * jogo, e a nossa diferença está no que fica DITO na mesa: o que trava e
 * quando, quanto queima de taxa, e que só os dois prontos prendem alguma
 * coisa. A cobrança que os jogos de troca não fazem é a confirmação do que
 * se VIU: mudou depois de você olhar, a sua confirmação não vale.
 */
import { api } from './api.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { estiloItem } from './itens-icone.mjs';
import { nomesDe } from './itens-nome.mjs';
import { confirmar as perguntar } from './dialogo.mjs';
import { escapar as esc } from './grafico.mjs';
import { nivelDe } from '../../engine/nivel-criatura.mjs';
import { etapaDaTroca, linhasDoLado, textoDaRecusa, ofertaDaSelecao, linhaDaLista, relogio,
         separarOfertaveis, itensNegociaveis } from './trocas-dados.mjs';

const nomeDoItem = nomesDe(PACK);
const nomeDaEspecie = dex => nomeExibido((PACK.especies ?? []).find(e => e.dex === dex)?.n ?? `#${dex}`);
const NOMES = { nomeDaEspecie, nomeDoItem };

const T = { lista: [], ligada: false, motivo: null, pct: 0, aberta: null, d: null,
            editando: false, sel: null, colecao: null, msg: null, ocupado: false };
const corpo = () => document.getElementById('trocasCorpo');
const visivel = () => {
  const aba = document.getElementById('pdxAbaTrocas');
  return !!aba && !aba.hidden && document.getElementById('viewPokedex')?.classList.contains('on');
};

/* ── CARREGAR ─────────────────────────────────────────────────────────── */
export async function abrirTrocas() {
  if (!api.temSessao()) { pintar(); return; }
  await recarregar();
}

async function recarregar(id = T.aberta) {
  const r = await api.get('/api/trocas');
  if (!r.ok) { T.msg = textoDaRecusa(r); pintar(); return; }
  Object.assign(T, { lista: r.corpo.trocas ?? [], ligada: !!r.corpo.ligada, motivo: r.corpo.motivo, pct: r.corpo.pctElegivel ?? 0 });
  T.aberta = id ?? T.lista.find(t => t.estado === 'OFFERED' || t.estado === 'LOCKED')?.id ?? null;
  const d = T.aberta ? await api.get(`/api/trocas/detalhe?id=${encodeURIComponent(T.aberta)}`) : null;
  T.d = d?.ok ? d.corpo : null;
  if (!T.d || !['OFFERED', 'LOCKED'].includes(T.d.estado)) T.editando = false;
  pintar();
}

async function agir(rota, corpoDoPedido, { depois } = {}) {
  if (T.ocupado) return;
  T.ocupado = true; pintar();
  const r = await api.post(rota, corpoDoPedido);
  T.ocupado = false;
  T.msg = r.ok ? null : textoDaRecusa(r);
  if (r.ok) depois?.(r.corpo);
  await recarregar(r.ok && r.corpo?.id ? r.corpo.id : T.aberta);
}

async function abrirEditor() {
  const r = await api.get('/api/idle');
  if (!r.ok) { T.msg = textoDaRecusa(r); pintar(); return; }
  T.colecao = { criaturas: r.corpo.criaturas ?? [], lotes: r.corpo.lotes ?? {} };
  const meu = T.d?.meu ?? {};
  T.sel = { criaturas: (meu.criaturas ?? []).map(c => c.id), itens: Object.fromEntries((meu.itens ?? []).map(i => [i.itemId, i.quantidade])), moeda: meu.moeda ?? 0 };
  T.editando = true;
  pintar();
}

/* ── PINTAR ───────────────────────────────────────────────────────────── */
const icone = (dex, tam = 34) => {
  const est = estiloIcone(PACK, dex, tam);
  return est ? `<span class="trIcone" style="${est}"></span>` : `<span class="trIcone tiny">#${dex}</span>`;
};
const iconeItem = id => { const est = estiloItem(id, 24); return est ? `<span class="trIconeItem" style="${est}"></span>` : ''; };

function ladoHtml(titulo, lado, { meu }) {
  const linhas = linhasDoLado(lado, NOMES);
  const selos = [lado?.pronto ? '<span class="trSelo">pronto ✓</span>' : '', lado?.confirmado ? '<span class="trSelo trSeloOk">confirmou ✓</span>' : ''].join('');
  return `<section class="trLado ${meu ? 'trMeu' : 'trDele'}">
    <header><b>${esc(titulo)}</b>${selos}</header>
    ${linhas.length ? `<ul>${linhas.map(l => `<li class="trL-${l.tipo}${l.alerta ? ' trAlerta' : ''}${l.shiny ? ' trBrilha' : ''}">
        ${l.tipo === 'criatura' && l.dex ? icone(l.dex) : l.tipo === 'item' ? iconeItem(l.itemId) : '<span class="trMoeda">PC</span>'}
        <span>${esc(l.texto)}${l.nota ? `<small>${esc(l.nota)}</small>` : ''}</span></li>`).join('')}</ul>`
      : `<p class="trVazio">${meu ? 'Nada ainda — monte o seu lado.' : 'Nada — se ficar assim, é uma doação para você.'}</p>`}
  </section>`;
}

function editorHtml() {
  const { ofertaveis, presas } = separarOfertaveis(T.colecao?.criaturas);
  const itens = itensNegociaveis(T.colecao?.lotes);
  const sel = T.sel;
  return `<div class="trEditor">
    <h4>O seu lado <span class="tiny">até 20 coisas · só o que é seu e está livre</span></h4>
    ${ofertaveis.length ? `<div class="trGrade">${ofertaveis.map(c => `<button type="button" class="trEscolha${sel.criaturas.includes(c.id) ? ' on' : ''}${c.shiny ? ' trBrilha' : ''}" data-tr-cri="${esc(c.id)}"
        aria-pressed="${sel.criaturas.includes(c.id)}">${icone(c.dex, 40)}<b>${c.shiny ? '✦ ' : ''}${esc(nomeDaEspecie(c.dex))}</b><span>nv ${Math.max(c.nivel ?? 1, nivelDe(c.xp ?? 0))}</span></button>`).join('')}</div>`
      : '<p class="trVazio">Nenhuma criatura que possa ir para troca.</p>'}
    ${presas.length ? `<p class="tiny">${presas.length} presa${presas.length === 1 ? '' : 's'} pela origem não aparece${presas.length === 1 ? '' : 'm'} aqui — o inicial, as de raid e as que vieram de bônus não vão para troca.</p>` : ''}
    ${itens.length ? `<div class="trItens">${itens.map(i => `<label class="trItem">${iconeItem(i.itemId)}<span>${esc(nomeDoItem(i.itemId))}</span>
        <input type="number" min="0" max="${i.livre}" step="1" value="${sel.itens[i.itemId] ?? 0}" data-tr-item="${esc(i.itemId)}"><small>de ${i.livre}</small></label>`).join('')}</div>` : ''}
    <label class="trPct"><span>PC-T</span><input type="number" min="0" step="1" value="${sel.moeda || ''}" placeholder="0" data-tr-pct>
      <small>elegível: ${T.pct} · mínimo 100 · +1% de taxa, que queima</small></label>
    <div class="trAcoes"><button class="btn gold" data-tr-salvar ${T.ocupado ? 'disabled' : ''}>Salvar o meu lado</button>
      <button class="btn" data-tr-fechar>Desistir</button></div>
  </div>`;
}

function mesaHtml() {
  const d = T.d;
  if (!d) return `<div class="trMesa trComo">
    <h4>Como a troca funciona</h4>
    <ol><li><b>Cada um monta o seu lado</b> — criaturas, bolas e PC-T. Qualquer mudança zera os "pronto".</li>
      <li><b>Os dois dizem pronto</b> — só então tudo trava, por 5 minutos. Antes disso, nada de ninguém fica preso.</li>
      <li><b>Os dois confirmam o que viram</b> — os dois lados mudam de dono juntos. Se algo mudou depois de você olhar, a sua confirmação não vale.</li></ol>
    <p class="tiny">Quem manda PC-T paga 1% de taxa, que sai do jogo. Quem recebe uma criatura espera 10 minutos para trocá-la de novo.</p>
  </div>`;
  const e = etapaDaTroca(d);
  const aberta = d.estado === 'OFFERED' || d.estado === 'LOCKED';
  const principal = { pronto: 'Estou pronto', confirmar: 'Confirmar a troca', editar: 'Montar o meu lado' }[e.acao];
  return `<div class="trMesa">
    <div class="trEtapa trEt-${e.etapa}"><b>${esc(e.titulo)}</b>
      ${e.resta != null ? `<span class="trRelogio" id="trRelogio" title="tempo para confirmar">${relogio(e.resta)}</span>` : ''}
      <span class="tiny">revisão ${d.revisao}</span></div>
    ${e.aviso ? `<p class="trAvisoEtapa">${esc(e.aviso)}</p>` : ''}
    <div class="trLados">${ladoHtml('Você manda', d.meu, { meu: true })}<span class="trSeta" aria-hidden="true">⇄</span>${ladoHtml(`${d.outro} manda`, d.dele, { meu: false })}</div>
    ${T.editando ? editorHtml() : ''}
    ${aberta && !T.editando ? `<div class="trAcoes">
      ${principal ? `<button class="btn gold" data-tr-acao="${e.acao}" ${T.ocupado ? 'disabled' : ''}>${principal}</button>` : ''}
      ${e.acao !== 'editar' ? '<button class="btn" data-tr-acao="editar">Mudar o meu lado</button>' : ''}
      <button class="btn trCancelar" data-tr-cancelar>Cancelar a troca</button></div>` : ''}
    ${d.recibo ? `<p class="tiny trRecibo">Recibo ${esc(d.recibo.id.slice(0, 8))} · revisão ${d.recibo.revisao} · política ${esc(d.recibo.politica)}</p>` : ''}
  </div>`;
}

function pintar() {
  const alvo = corpo(); if (!alvo) return;
  if (!api.temSessao()) {
    alvo.innerHTML = `<div class="trMesa trComo"><h4>Trocas entre treinadores</h4>
      <p>Trocar precisa de conta: a troca acontece no servidor, com os dois lados conferidos. Entre ou crie a sua conta no topo da tela.</p></div>`;
    return;
  }
  const desligada = T.ligada ? '' : `<p class="trAviso" role="status">${esc(textoDaRecusa({ corpo: { reason_code: T.motivo?.reason_code, erro: T.motivo?.detalhe ?? '' } }))}</p>`;
  alvo.innerHTML = `${desligada}
    <div class="trCorpo">
      <aside class="trColuna">
        <form id="trNova" class="trNova" autocomplete="off">
          <label for="trNome">Trocar com</label>
          <div><input id="trNome" maxlength="40" placeholder="nome do treinador" ${T.ligada ? '' : 'disabled'}>
          <button class="btn gold" ${T.ligada && !T.ocupado ? '' : 'disabled'}>Convidar</button></div>
        </form>
        <h4>Minhas trocas</h4>
        ${T.lista.length ? `<ul class="trLista">${T.lista.map(linhaDaLista).map(l => `<li><button class="trLinha${l.id === T.aberta ? ' on' : ''}${l.aberta ? ' trAberta' : ''}" data-tr-abrir="${esc(l.id)}">
            <b>${esc(l.texto)}</b><span>${esc(l.estado)}</span></button></li>`).join('')}</ul>`
          : '<p class="trVazio">Nenhuma troca ainda.</p>'}
      </aside>
      ${mesaHtml()}
    </div>
    ${T.msg ? `<p class="trMsg" role="alert">${esc(T.msg)}</p>` : ''}`;
}

/* ── OUVIR ────────────────────────────────────────────────────────────── */
document.addEventListener('click', async ev => {
  if (!ev.target.closest?.('#trocasCorpo')) return;
  const abrir = ev.target.closest('[data-tr-abrir]');
  if (abrir) { T.editando = false; T.msg = null; await recarregar(abrir.dataset.trAbrir); return; }
  const cri = ev.target.closest('[data-tr-cri]');
  if (cri && T.sel) {
    const id = cri.dataset.trCri, l = T.sel.criaturas;
    T.sel.criaturas = l.includes(id) ? l.filter(x => x !== id) : [...l, id];
    pintar(); return;
  }
  if (ev.target.closest('[data-tr-fechar]')) { T.editando = false; pintar(); return; }
  if (ev.target.closest('[data-tr-salvar]') && T.d) {
    await agir('/api/trocas/oferta', { id: T.d.id, ativos: ofertaDaSelecao(T.sel) }, { depois: () => { T.editando = false; } });
    return;
  }
  if (ev.target.closest('[data-tr-cancelar]') && T.d) {
    if (await perguntar(`Cancelar a troca com ${T.d.outro}? O que estiver travado volta para cada um.`, { ok: 'Cancelar a troca', cancelar: 'Voltar' }))
      await agir('/api/trocas/cancelar', { id: T.d.id });
    return;
  }
  const acao = ev.target.closest('[data-tr-acao]')?.dataset.trAcao;
  if (acao === 'editar') { await abrirEditor(); return; }
  if (acao === 'pronto' && T.d) { await agir('/api/trocas/pronto', { id: T.d.id, revisao: T.d.revisao }); return; }
  if (acao === 'confirmar' && T.d) { await agir('/api/trocas/confirmar', { id: T.d.id, revisao: T.d.revisao, hash: T.d.hash }); return; }
});

document.addEventListener('input', ev => {
  if (!T.sel) return;
  const item = ev.target.closest?.('[data-tr-item]');
  if (item) { T.sel.itens[item.dataset.trItem] = Math.max(0, Math.floor(Number(item.value) || 0)); return; }
  if (ev.target.matches?.('[data-tr-pct]')) T.sel.moeda = Math.max(0, Math.floor(Number(ev.target.value) || 0));
});

document.addEventListener('submit', async ev => {
  if (ev.target.id !== 'trNova') return;
  ev.preventDefault();
  const nome = document.getElementById('trNome')?.value.trim();
  if (!nome) return;
  await agir('/api/trocas', { contraparte: nome, ativos: {} });
  if (T.d && T.d.papel === 'criador' && !T.msg) await abrirEditor();
});

/* O RELÓGIO DO LOCK anda sozinho; e a mesa aberta repinta a cada 5 s para
   mostrar o que o outro fez — menos quando você está montando o seu lado,
   para a tela não apagar a seleção no meio. */
setInterval(() => {
  if (!visivel() || T.d?.estado !== 'LOCKED') return;
  const e = etapaDaTroca(T.d), el = document.getElementById('trRelogio');
  if (el && e.resta != null) el.textContent = relogio(e.resta);
}, 1000);
setInterval(() => { if (visivel() && T.d && !T.editando && !T.ocupado && ['OFFERED', 'LOCKED'].includes(T.d.estado)) recarregar(); }, 5000);
