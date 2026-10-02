/* O GUIA NA TELA (ST-2.24) — pinta `guiaDoJogo` na página "Como funciona".
 *
 * A decisão de O QUE dizer mora em `guia-dados.mjs`; aqui só se pinta e se
 * liga a navegação. Dois tipos de botão, os dois por atributo:
 *
 *   data-goto + data-guia-aba   "ir para": a aba lembrada da vista é gravada
 *                               ANTES da navegação, e a vista abre nela
 *   data-guia-secao             "o que é isto?": de qualquer tela para a seção
 *                               do guia
 */
import { PACK } from './motor.mjs';
import { guiaDoJogo } from './guia-dados.mjs';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* A aba lembrada de cada vista com sub-abas — a mesma chave que ela lê ao abrir. */
const CHAVE_DA_ABA = { pdx: 'ar_pdx_aba', treino: 'ar_treino_aba' };

export function pintarGuia() {
  const alvo = document.getElementById('guiaCorpo');
  if (!alvo) return;
  const g = guiaDoJogo(PACK);
  alvo.innerHTML = `
    <nav class="guiaIndice" aria-label="o que tem no guia">${g.map(x => `<a href="#guia-${x.id}" data-guia-secao="${x.id}">${esc(x.titulo)}</a>`).join('')}</nav>
    ${g.map(x => `
    <section class="guiaSecao" id="guia-${x.id}">
      <h3>${esc(x.titulo)}</h3>
      <p class="guiaResumo">${esc(x.resumo)}</p>
      <dl class="guiaItens">${x.itens.map(i => `<div><dt>${esc(i.termo)}</dt><dd>${esc(i.texto)}</dd></div>`).join('')}</dl>
      <div class="guiaIr">${x.ir.map(i => `<button class="btn" type="button" data-goto="${i.view}"${i.aba ? ` data-guia-aba="${i.aba}"` : ''}${
        i.clica ? ` data-guia-clica="${esc(i.clica)}"` : ''}${i.rola ? ` data-guia-rola="${esc(i.rola)}"` : ''}>${esc(i.rotulo)} →</button>`).join('')}</div>
    </section>`).join('')}`;
}

export function irParaSecao(id) {
  const nav = document.querySelector('.nav[data-view="viewHow"]');
  if (nav && !document.getElementById('viewHow')?.classList.contains('on')) nav.click();
  setTimeout(() => document.getElementById(`guia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

/* Na fase de CAPTURA: a aba lembrada tem de estar gravada antes de o ouvinte
   da navegação abrir a vista. */
document.addEventListener('click', ev => {
  const aba = ev.target.closest?.('[data-guia-aba]');
  if (aba) {
    const [vista, nome] = aba.dataset.guiaAba.split(':');
    try { if (CHAVE_DA_ABA[vista]) localStorage.setItem(CHAVE_DA_ABA[vista], nome); } catch { /* privativo */ }
  }
  /* ST-2.25: o destino DENTRO da vista — abrir a Loja, rolar até o Centro.
     Depois da navegação, que a vista precisa existir na tela primeiro. */
  const destino = ev.target.closest?.('[data-guia-clica], [data-guia-rola]');
  if (destino) {
    const { guiaClica: clica, guiaRola: rola } = destino.dataset;
    setTimeout(() => {
      if (clica) document.querySelector(clica)?.click();
      if (rola) document.querySelector(rola)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }
  const secao = ev.target.closest?.('[data-guia-secao]');
  if (secao) { ev.preventDefault(); irParaSecao(secao.dataset.guiaSecao); }
}, true);
