/* AT6-05 · camada 4. Números do log, sem nova simulação ou atribuição causal.
   ST-2.33: uma tabela de dois lados — a lista crua sem classe era o que o dono
   via como "sem estilo". Quem decide o lado melhor é `linhasDoResumo`. */
import {resumoDaBatalha,linhasDoResumo} from './resumo-batalha.mjs';
export function htmlDoResumo(linha){
  if(!linha?.passos?.length)return '';
  const celula=(v,eu)=>`<td class="adNum${eu?' rbMelhor':''}">${v}</td>`;
  return `<details class="rbResumo"><summary>Como foi a batalha</summary>
    <table class="adTabela rbTabela"><thead><tr><th></th><th class="adNum">Seu time</th><th class="adNum">Rival</th></tr></thead><tbody>
    ${linhasDoResumo(resumoDaBatalha(linha)).map(l=>`<tr><td class="adCampo">${l.rotulo}</td>${celula(l.a,l.melhor==='A')}${celula(l.b,l.melhor==='B')}</tr>`).join('')}
    </tbody></table>
    <p class="evpNota">Fatos dos golpes registrados, não a causa isolada do resultado. HP retirado exclui dano excedente ao nocaute.</p></details>`;
}
