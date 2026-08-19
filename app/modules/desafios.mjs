/* Desafios diários — três por dia, iguais para todos.
 *
 * Fronteira: mede o que aconteceu e paga recompensa não transferível. */

import { S } from './estado.mjs';
import { tipoNomes, rng } from './motor.mjs';
import { atualizarSaldo } from './controles.mjs';
import { creditarRecompensa } from './banco.mjs';
import { saveProfile } from './perfil.mjs';

/* =====================================================================
   DESAFIOS DIÁRIOS
   ---------------------------------------------------------------------
   3 por dia, sorteados de forma determinística pela DATA — todo mundo
   pega os mesmos três no mesmo dia, e recarregar a página não permite
   "rerolar" até vir um fácil. Vira meia-noite, entram três novos e o
   progresso zera.

   Recompensa: XP + um bônus pequeno de PokéCash. Recalibrado na v0.7,
   quando o câmbio passou a existir: os valores antigos davam ~400 por
   dia, que na moeda nova equivale a R$ 40 diários de graça — mais do
   que qualquer pacote de compra pequeno, o que tornaria o depósito
   irrelevante. Agora os três somam ~75 (R$ 7,50), pouco mais de uma
   aposta mínima: empurrão pra voltar no dia seguinte, não fonte de
   renda que dispense apostar.
   ===================================================================== */
const DESAFIO_POOL = [
  {id:'rodadas',  txt:'Participe de {n} rodada{s}',            metas:[3,5,8], xp:60,  dia:20},
  {id:'vitorias', txt:'Vença {n} rodada{s}',                   metas:[1,2,3], xp:120, dia:30},
  {id:'tipo',     txt:'Aposte {n}x em Pokémon de {t}',         metas:[2,3,5], xp:80,  dia:25},
  {id:'derrote',  txt:'Derrote {n} Pokémon de {t}',            metas:[2,3,5], xp:100, dia:25},
  {id:'azarao',   txt:'Aposte {n}x num azarão (odd ≥ 4)',      metas:[1,2,3], xp:110, dia:30},
  {id:'sobrevive',txt:'Termine no top 3 da arena {n}x',        metas:[1,2,3], xp:100, dia:25},
  {id:'variedade',txt:'Aposte em {n} Pokémon diferentes',      metas:[3,4,6], xp:80,  dia:25},
  {id:'clima',    txt:'Dispute {n} rodada{s} com clima ativo', metas:[2,3,4], xp:70,  dia:20},
];
const TIPOS_DESAFIO = ['fire','water','grass','electric','psychic','rock','poison','flying','ground','bug'];

const hojeStr = () => new Date().toISOString().slice(0,10);

function rollDaily(){
  // seed derivada da data: mesmo dia -> mesmos desafios, sempre
  const d = hojeStr();
  let h = 0; for (let i=0;i<d.length;i++) h = (h*31 + d.charCodeAt(i)) | 0;
  const R = rng(Math.abs(h) + 991);

  const pool = DESAFIO_POOL.slice();
  const escolhidos = [];
  for (let i=0;i<3 && pool.length;i++){
    const idx = (R() * pool.length) | 0;
    const base = pool.splice(idx,1)[0];
    const meta = base.metas[(R() * base.metas.length) | 0];
    const tipo = (base.id === 'tipo' || base.id === 'derrote')
      ? TIPOS_DESAFIO[(R() * TIPOS_DESAFIO.length) | 0] : null;
    escolhidos.push({
      id: base.id, meta, tipo, prog: 0, feito: false, pago: false,
      xp: base.xp, dia: base.dia,
      txt: base.txt.replace('{n}', meta).replace('{s}', meta === 1 ? '' : 's')
                   .replace('{t}', tipo ? (tipoNomes[tipo]||tipo) : ''),
    });
  }
  return {data: d, lista: escolhidos};
}

function ensureDaily(){
  if (!S.profile.daily || S.profile.daily.data !== hojeStr()){
    S.profile.daily = rollDaily();
    saveProfile(S.profile);
  }
  return S.profile.daily;
}

/* Avança um desafio. `quanto` permite somar mais de 1 de uma vez.
   Devolve a lista dos que foram concluídos AGORA, pra avisar na tela. */
function progDesafio(id, quanto, tipo){
  const d = ensureDaily();
  const concluidos = [];
  for (const c of d.lista){
    if (c.id !== id || c.feito) continue;
    if (c.tipo && tipo !== c.tipo) continue;
    c.prog = Math.min(c.meta, c.prog + (quanto || 1));
    if (c.prog >= c.meta){
      c.feito = true;
      if (!c.pago){
        c.pago = true;
        S.profile.xp += c.xp;
        creditarRecompensa('CHALLENGE_REWARD', c.dia, 'desafio:' + c.id); atualizarSaldo();
        S.profile.dailyDone = (S.profile.dailyDone || 0) + 1;
      }
      concluidos.push(c);
    }
  }
  saveProfile(S.profile);
  return concluidos;
}

export {
  ensureDaily,
  progDesafio,
};
