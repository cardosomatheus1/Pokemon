/* Perfil do treinador — identidade, XP, nível e títulos.
 *
 * Fronteira: guarda quem o jogador é e o quanto ele progrediu. Não sabe
 * apostar. XP vem de participação, nunca do valor apostado. */

import { S } from './estado.mjs';
import { nivelDe, progressoNivel, xpParaNivel } from './progressao.mjs';
import { ensureDaily } from './desafios.mjs';

/* =====================================================================
   PERFIL DO JOGADOR
   ---------------------------------------------------------------------
   Sem servidor, "perfil" aqui é o que dá pra fazer no cliente: tudo em
   localStorage. Não é autenticação — é o suficiente pra prototipar a
   experiência de "sua conta" antes de existir backend.

   O schema cresceu (avatar, banner, contagem por Pokémon e por tipo),
   então loadProfile() faz MIGRAÇÃO: quem já jogava não perde o histórico
   quando os campos novos aparecem — os que faltam entram com valor
   padrão em vez de zerar o perfil inteiro.
   ===================================================================== */
const PROFILE_DEFAULT = {
  name:'Treinador', since:0, betsCount:0, winsCount:0,
  totalBet:0, totalWon:0, totalLost:0, biggestWin:0,
  mons:{},        // quantas vezes apostou em cada Pokémon
  types:{},       // idem por tipo (um dual-type conta nos dois)
  winMons:{},     // vitórias por Pokémon
  avatar:{kind:'trainer', id:'red'},
  banner:{scene:'praia', dex:9},
  xp:0,           // experiência acumulada do treinador
  pin:null,       // PIN local opcional (não é segurança de verdade)
  histBets:[],    // histórico de apostas (ganhos e perdas)
  daily:null,     // desafios do dia (ver rollDaily)
  dailyDone:0,    // desafios concluídos no total (histórico)
};
function loadProfile(){
  let p;
  try { p = JSON.parse(localStorage.getItem('ar_profile')); } catch(e) {}
  if (!p || typeof p !== 'object') p = {};
  // migração campo a campo: preserva o que já existe, completa o resto
  for (const k in PROFILE_DEFAULT){
    if (p[k] === undefined || p[k] === null){
      const d = PROFILE_DEFAULT[k];
      p[k] = (typeof d === 'object') ? JSON.parse(JSON.stringify(d)) : d;
    }
  }
  if (!p.since) p.since = Date.now();
  return p;
}
function saveProfile(p){ localStorage.setItem('ar_profile', JSON.stringify(p)); }


function recordBetPlaced(amount, fighter){
  S.profile.betsCount++; S.profile.totalBet += amount;
  if (fighter){
    S.profile.mons[fighter.n] = (S.profile.mons[fighter.n] || 0) + 1;
    for (const t of fighter.types) S.profile.types[t] = (S.profile.types[t] || 0) + 1;
    // lista de Pokémon distintos apostados HOJE (desafio de variedade)
    const d = ensureDaily();
    if (!d.mons) d.mons = [];
    if (!d.mons.includes(fighter.n)) d.mons.push(fighter.n);
  }
  saveProfile(S.profile);
}
function recordBetResult(won, amount, payout, fighter){
  if (won){
    S.profile.winsCount++; S.profile.totalWon += payout;
    if (payout > S.profile.biggestWin) S.profile.biggestWin = payout;
    if (fighter) S.profile.winMons[fighter.n] = (S.profile.winMons[fighter.n] || 0) + 1;
  } else {
    S.profile.totalLost += amount;
  }
  saveProfile(S.profile);
}

/* topo de um dicionário {chave: contagem} */
function topOf(obj){
  let k = null, v = 0;
  for (const key in obj) if (obj[key] > v){ v = obj[key]; k = key; }
  return k ? {k, v} : null;
}

/* =====================================================================
   NÍVEL DO TREINADOR
   ---------------------------------------------------------------------
   A ideia central: o jogador precisa sentir progresso MESMO PERDENDO.
   Se só vitória desse XP, quem está numa maré ruim vê a barra parada
   justo na hora em que mais precisaria de um motivo pra continuar — e
   aí o sistema empurra pra perseguir perda, que é exatamente o que não
   se quer numa casa de apostas.

   Por isso o XP vem de PARTICIPAR, com bônus por desempenho:

     • 10 XP   — por rodada disputada (piso: sempre entra)
     • +25 XP  — se o seu lutador venceu
     • +0..15  — pelo desempenho dele: quanto foi longe na rodada
                 (sobreviveu a quantos dos 11 adversários)
     • +5 XP   — se o seu lutador era azarão (odd ≥ 4) e sobreviveu
                 além da metade do elenco

   Note que o XP NÃO cresce com o valor apostado. Isso é de propósito:
   atrelar progresso ao tamanho da aposta transforma o nível num
   incentivo a apostar alto, que é o oposto de um sistema saudável.
   Quem aposta 10 e quem aposta 10.000 sobe igual.

   A curva é quadrática suave: nível N exige 100·N^1,5 de XP no total.
   Dá níveis rápidos no começo (recompensa imediata) e desacelera
   depois, sem virar parede.
   ===================================================================== */
/* A curva de nível saiu para `progressao.mjs` — pura, e testável sem DOM.
   Ver a nota lá, e o defeito D-006. */

/* Título do treinador por faixa de nível — recompensa simbólica que já
   existe de graça e dá identidade ao progresso. */
const TITULOS = [
  [1,'Novato'], [5,'Aprendiz'], [10,'Treinador'], [18,'Veterano'],
  [28,'Ás da Arena'], [40,'Elite'], [55,'Campeão'], [75,'Lenda'],
];
function tituloDe(n){
  let t = TITULOS[0][1];
  for (const [min, nome] of TITULOS) if (n >= min) t = nome;
  return t;
}

/* Concede XP e devolve o detalhamento, pra tela de fim de rodada poder
   mostrar de onde veio cada pedaço. */
function darXP(partes){
  const antes = progressoNivel(S.profile.xp);
  const total = partes.reduce((a,p) => a + p.xp, 0);
  S.profile.xp += total;
  const depois = progressoNivel(S.profile.xp);
  saveProfile(S.profile);
  return {partes, total, antes, depois, subiu: depois.nivel > antes.nivel};
}

export {
  PROFILE_DEFAULT,
  nivelDe,
  progressoNivel,
  xpParaNivel,
  darXP,
  loadProfile,
  recordBetPlaced,
  recordBetResult,
  saveProfile,
  tituloDe,
  topOf,
};
