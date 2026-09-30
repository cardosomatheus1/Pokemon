/* O QUADRO DO HISTÓRICO (1.28 · L-141 · L-109) — camada 4, só pinta.
 *
 * Tudo o que ele escreve já vem decidido de `cartaoDoHistorico` (camada 0):
 * o título, o tempo, os números, quem enfrentou e o resultado. Aqui só entram
 * os ícones (folha de cabeças e de itens) e o HTML.
 *
 * O MESMO quadro nas duas abas do farm (`nosDois`): Rotas e Rota OFF contam a
 * mesma história — duas listas seriam duas versões dela.
 */
import { nosDois } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { estiloItem } from './itens-icone.mjs';
import { nomesDe } from './itens-nome.mjs';
import { PERFIS } from '../../engine/expedicao.mjs';
import { idDoMaterial } from '../../engine/economia-idle.mjs';
import { cartaoDoHistorico, resumoDoHistorico } from './historico-dados.mjs';

import { escapar as esc } from './grafico.mjs';
const nomeDoItem = nomesDe(PACK);
const nomeDaEspecie = dex => nomeExibido((PACK.especies ?? []).find(e => e.dex === dex)?.n ?? `#${dex}`);
const nomeDoBioma = id => (PACK.biomas ?? []).find(b => b.id === id)?.rotulo ?? id ?? '?';

const cabeca = (dex, tam = 28) => {
  const est = estiloIcone(PACK, dex, tam);
  return est ? `<span class="histCabeca" style="${est}" title="${esc(nomeDaEspecie(dex))}"></span>` : `<span class="histCabeca tiny">#${dex}</span>`;
};
const item = i => {
  const est = estiloItem(i.id, 22);
  return `<span class="histItem" title="${esc(nomeDoItem(i.id))}${i.daBatalha ? ` (${i.daBatalha} das batalhas)` : ''}">` +
    (est ? `<span class="histItemIcone" style="${est}"></span>` : `<span class="tiny">${esc(nomeDoItem(i.id))}</span>`) +
    `×${i.n}</span>`;
};

function linhaHtml(c) {
  const vs = c.vs.length
    ? `<div class="histVs"><span class="histLado">${c.equipe.map(d => cabeca(d, 24)).join('')}</span><b>VS</b>
         <ul>${c.vs.map(b => `<li class="${b.venceu ? 'histVenceu' : 'histPerdeu'}">${esc(b.nome)} <span class="tiny">${esc(b.nivel)}</span> — ${b.resultado}</li>`).join('')}</ul></div>`
    : '';
  return `<li><details class="histLinha hist-${c.tipo}">
    <summary>
      <span class="histModo">${esc(c.modo)}</span>
      <b class="histTitulo">${esc(c.titulo)}</b>
      <span class="tiny histQuando">${esc(c.quando)} · durou ${esc(c.duracao)}</span>
      <span class="histNums"><b>+${c.xp}</b> XP · <b>+${c.moedas}</b> moedas · <b>${c.encontros}</b> encontro${c.encontros === 1 ? '' : 's'}${c.lutas ? ` · ${esc(c.lutas)}` : ''}</span>
      <span class="histItens">${c.itens.map(item).join('')}</span>
    </summary>
    <div class="histDetalhe">
      ${c.detalheRun ? `<p class="tiny">${esc(c.detalheRun)}</p>` : ''}
      ${c.especies.length ? `<p class="tiny">O que apareceu:</p><div class="histEspecies">${c.especies.map(d => cabeca(d)).join('')}</div>` : '<p class="tiny">Nenhum encontro nesta volta.</p>'}
      ${vs}
    </div>
  </details></li>`;
}

export function pintarHistorico(E, agora = Date.now()) {
  const linhas = E?.historico ?? [];
  const r = resumoDoHistorico(linhas);
  const ctx = { agora, nomeDoBioma, rotuloDoPerfil: p => PERFIS[p]?.rotulo ?? p, material: idDoMaterial(PACK) };
  const html = `<h3>Histórico <span class="tiny">${linhas.length
      ? `as últimas ${r.voltas} volta${r.voltas === 1 ? '' : 's'} · +${r.xp} XP · +${r.moedas} moedas · ${r.encontros} encontros${r.lutas ? ` · ${r.vitorias}/${r.lutas} batalhas vencidas` : ''}`
      : 'o que cada volta rendeu'}</span></h3>
    ${linhas.length
      ? `<ul class="histLista">${linhas.map(l => linhaHtml(cartaoDoHistorico(l, ctx))).join('')}</ul>`
      : '<p class="tiny">Nenhuma volta colhida ainda. Cada expedição e cada run colhida entra aqui: o que apareceu, o que caiu, quem você enfrentou, quanto XP e quanto tempo.</p>'}`;
  for (const alvo of nosDois('Historico')) alvo.innerHTML = html;
}
