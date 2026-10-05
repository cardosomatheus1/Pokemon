/* AT6-05 · camada 4. Detalhe legível sem hover, sem ação financeira. */
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const campo=x=>`<li><b>${esc(x.campo)}</b>: Publicado ${esc(x.antes)} → Atual ${esc(x.depois)}</li>`;
export function htmlDaComparacao(r){
  if(!r?.mudou)return '';
  if(!r.compativel)return `<p class="leAviso">${esc(r.aviso)}</p>`;
  const globais=r.mudancas.filter(x=>x.campo!=='Ordem');
  const ordem=r.mudancas.some(x=>x.campo==='Ordem')?'<p>A composição ou a ordem dos membros mudou.</p>':'';
  return `<details class="leAviso"><summary>Ver alterações ainda não publicadas</summary>
    <p>${esc(r.aviso)}</p>${ordem}${globais.length?`<ul>${globais.map(campo).join('')}</ul>`:''}
    ${r.membros.map(m=>`<div><strong>${esc((m.depois??m.antes).nome)}</strong><ul>${m.mudancas.map(campo).join('')}</ul></div>`).join('')}
    </details>`;
}
