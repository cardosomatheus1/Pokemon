/* Camada 0: a informação exibida vem do mesmo catálogo consumido pela TBE. */
import {golpeTreinador} from '../../engine/catalogo-golpes.mjs';
import {REGRAS} from '../../engine/treino-batalha.mjs';
export function fichaDoGolpe(pack,nome){
  const g=golpeTreinador(pack,nome);if(!g)return null;
  const categoria=g.cat==='fis'?'físico':'especial',precisao=Math.round(g.acc*100);
  const resumo=`${categoria} · poder ${g.p} · acerto ${precisao}%`;
  return {nome:g.n,tipo:g.t,categoria,poder:g.p,precisao,efeitos:[...g.efeitos],resumo,
    descricao:`${resumo}. Sem efeitos adicionais. Chance de crítico ${REGRAS.CRITICO*100}% (dano ×${REGRAS.MULT_CRITICO}).`};
}
