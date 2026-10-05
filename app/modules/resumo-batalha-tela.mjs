/* AT6-05 · camada 4. Números do log, sem nova simulação ou atribuição causal. */
import {resumoDaBatalha} from './resumo-batalha.mjs';
const CAMPOS={tentativas:'Golpes registrados',hpRetirado:'HP retirado',erros:'Erros',criticos:'Críticos',
  superEfetivos:'Super efetivos',resistidos:'Resistidos',imunidades:'Imunidades',nocautes:'Nocautes'};
export function htmlDoResumo(linha){
  if(!linha?.passos?.length)return '';
  const r=resumoDaBatalha(linha);
  return `<details><summary>Como foi a batalha</summary>
    ${[['A','Seu time'],['B','Rival']].map(([lado,nome])=>`<div><strong>${nome}</strong><ul>${Object.entries(CAMPOS).map(([k,rotulo])=>`<li>${rotulo}: ${r[lado][k]}</li>`).join('')}</ul></div>`).join('')}
    <p>Fatos dos golpes registrados, não a causa isolada do resultado. HP retirado exclui dano excedente ao nocaute.</p></details>`;
}
