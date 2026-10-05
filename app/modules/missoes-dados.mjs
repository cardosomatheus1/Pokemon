/* Camada 0: projeção dos desafios persistidos, sem progresso local. */
const TEXTOS={explorar:'Conclua uma exploração ou Avanço com encontros',treinar:'Receba XP de treino do banco',jornada:'Vença um duelo na jornada',apostar:'Participe de rodadas',vencer:'Vença uma rodada',assistir:'Assista às rodadas',variedade:'Participe com espécies diferentes'};
export const desafiosParaTela=rows=>({lista:(rows??[]).map(d=>({id:`${d.dia}:${d.slot}`,txt:TEXTOS[d.tipo]??'Objetivo do dia',meta:d.alvo,prog:d.progresso,feito:d.concluido_em!=null,xp:null})),servidor:true});
