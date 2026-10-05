/* Camada 4. Só pinta a comparação no Avanço assistido; Rota OFF tem outro
   motor. O botão reaproveita a escolha de bioma e não inicia/gasta uma run. */
import {orientacaoAvanco,textoDaOrientacao} from './orientacao-avanco.mjs';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function pintarOrientacaoAvanco(pack,estado,escolha,alvo){
  if(!alvo)return;
  const r=orientacaoAvanco(pack,estado,escolha);
  alvo.hidden=false;
  const sugerida=r.sugestao;
  alvo.innerHTML=`<strong>${r.bloqueio?'Antes de avançar':'Orientação para esta equipe'}</strong><br>`+
    esc(textoDaOrientacao(pack,r))+
    (sugerida&&sugerida.bioma!==escolha.bioma
      ?` <button type="button" class="btn" data-bioma="${esc(sugerida.bioma)}" data-orientacao-rota>Comparar ${esc(sugerida.rotulo)}</button>`:'');
}
