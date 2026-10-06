/* Camada 4. Só apresenta a decisão pura; os botões usam a navegação existente. */
import {linhasDaPrevia} from './preparacao-dados.mjs';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function htmlObjetivoArena(r){
  if(!r)return '';
  return `<aside class="leAviso"><strong>${esc(r.titulo)}</strong><p>${esc(r.texto)}</p><button class="btn" data-goto="${esc(r.acao.view)}"${r.acao.aba?` data-guia-aba="${esc(r.acao.aba)}"`:''}>${esc(r.acao.rotulo)}</button></aside>`;
}
/* ST-2.33: a prévia vira uma tabela Antes | Depois com o sentido de cada
   mudança, sob um título com as duas formas. O que saía era um parágrafo por
   campo, sem classe, dentro de um <p> — "Antes 31 → Depois 35" solto. */
const sinal=l=>l.delta==null?'':`<i class="${l.sentido==='sobe'?'adSobe':l.sentido==='desce'?'adDesce':''}">${l.delta>0?'+':''}${l.delta}</i>`;
/* `arte(dex)` vem de quem chama: este módulo fica sem DOM, e a prova dele roda em Node. */
export function htmlPrevisoesEvolucao(planos,arte=()=>''){
  if(!planos?.length)return '';
  return `<details class="evpPrevia"><summary>Antes e Depois da evolução</summary>${planos.map(p=>{
    const linhas=linhasDaPrevia(p);
    return `<section><div class="evpForma">${arte(p.de)}<b>→</b>${arte(p.para)}<h4>${esc(p.nome)}</h4><span class="evpConsome">${p.consome?`consome 1 ${esc(p.consome)}`:'não consome item'}</span></div>${
      linhas.length?`<table class="adTabela"><thead><tr><th></th><th class="adNum">Antes</th><th class="adNum">Depois</th><th></th></tr></thead><tbody>${linhas.map(l=>`<tr><td class="adCampo">${esc(l.campo)}</td><td class="adNum">${esc(l.antes)}</td><td class="adNum">${esc(l.depois)}</td><td class="adNum">${sinal(l)}</td></tr>`).join('')}</tbody></table>`
      :'<p class="evpNota">A ficha não pôde ser comparada.</p>'}${p.preservados.length?`<p class="evpNota">Exclusivos preservados: ${p.preservados.map(esc).join(', ')}.</p>`:''}</section>`;}).join('')}<p class="evpNota">Prévia sem consumo. A evolução preserva identidade, XP e IVs; atributos maiores não garantem vitória.</p></details>`;
}
