/* Camada 4. Só apresenta a decisão pura; os botões usam a navegação existente. */
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function htmlObjetivoArena(r){
  if(!r)return '';
  return `<aside class="leAviso"><strong>${esc(r.titulo)}</strong><p>${esc(r.texto)}</p><button class="btn" data-goto="${esc(r.acao.view)}"${r.acao.aba?` data-guia-aba="${esc(r.acao.aba)}"`:''}>${esc(r.acao.rotulo)}</button></aside>`;
}
export function htmlPrevisoesEvolucao(planos){
  if(!planos?.length)return '';
  return `<details class="leAviso"><summary>Antes e Depois da evolução</summary>${planos.map(p=>`<section><h4>${esc(p.nome)}</h4><p>${p.consome?`Consome 1 ${esc(p.consome)}.`:'Não consome item.'}</p>${p.comparacao?.compativel?p.comparacao.membros.flatMap(m=>m.mudancas).map(c=>`<p><strong>${esc(c.campo)}</strong>: Antes ${esc(c.antes)} → Depois ${esc(c.depois)}</p>`).join(''):'<p>A ficha não pôde ser comparada.</p>'}${p.preservados.length?`<p>Exclusivos preservados: ${p.preservados.map(esc).join(', ')}.</p>`:''}</section>`).join('')}<p>Prévia sem consumo. A evolução preserva identidade, XP e IVs; atributos maiores não garantem vitória.</p></details>`;
}
