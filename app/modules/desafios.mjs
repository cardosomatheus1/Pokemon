/* Desafios diários — três por dia, iguais para todos.
 *
 * Fronteira: mede o que aconteceu e paga recompensa não transferível. */

import { S } from './estado.mjs';
import { tipoNomes, rng } from './motor.mjs';
import { atualizarSaldo } from './controles.mjs';
import { creditarRecompensa, saldoBonus } from './banco.mjs';
import { recompensaDeDesafio, semanaDe } from '../../engine/emissao.mjs';
import { saveProfile } from './perfil.mjs';

/* =====================================================================
   DESAFIOS DIÁRIOS
   ---------------------------------------------------------------------
   3 por dia, sorteados de forma determinística pela DATA — todo mundo
   pega os mesmos três no mesmo dia, e recarregar a página não permite
   "rerolar" até vir um fácil. Vira meia-noite, entram três novos e o
   progresso zera.

   RECOMPENSA: XP SEMPRE, PC-B POR MARCO SEMANAL — e a mudança é o D-007.

   O campo `dia` de cada desafio virou HISTÓRICO. Ele pagava PC-B a cada
   conclusão, três vezes ao dia, ~25 cada: **~525 PC-B por semana**, contra
   um orçamento de 30 no Estudo Econômico. Dezessete vezes e meia.

   Não foi descuido — a calibragem de 75/dia é da v0.7, ANTERIOR ao Estudo,
   e estava comentada aqui como decisão de UX. O que mudou foi o Estudo
   passar a existir, com 10 mil agentes × 52 semanas mostrando emissão
   irrestrita levando a oferta de PC-B de 2,0 M para 26,4 M.

   Baixar 525 para 30 dividido por 21 desafios daria 1,4 por desafio —
   poeira ao lado de uma aposta mínima de 50. Então o PC-B saiu do desafio
   e foi para um MARCO SEMANAL: doze conclusões pagam o orçamento inteiro
   de uma vez. Mesma conta, e a recompensa volta a ser sentida.

   O XP continua por desafio, sempre, sem teto — ele não é moeda.

   A regra mora em `engine/emissao.mjs`, e o teto de saldo mora com ela.
   ===================================================================== */
const DESAFIO_POOL = [
  {id:'rodadas',  txt:'Participe de {n} rodada{s}',            metas:[3,5,8], xp:60},
  {id:'vitorias', txt:'Vença {n} rodada{s}',                   metas:[1,2,3], xp:120},
  {id:'tipo',     txt:'Aposte {n}x em Pokémon de {t}',         metas:[2,3,5], xp:80},
  {id:'derrote',  txt:'Derrote {n} Pokémon de {t}',            metas:[2,3,5], xp:100},
  {id:'azarao',   txt:'Aposte {n}x num azarão (odd ≥ 4)',      metas:[1,2,3], xp:110},
  {id:'sobrevive',txt:'Termine no top 3 da arena {n}x',        metas:[1,2,3], xp:100},
  {id:'variedade',txt:'Aposte em {n} Pokémon diferentes',      metas:[3,4,6], xp:80},
  {id:'clima',    txt:'Dispute {n} rodada{s} com clima ativo', metas:[2,3,4], xp:70},
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
      xp: base.xp,
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
        /* O XP É POR DESAFIO E NÃO TEM TETO. Ele não é moeda: não entra no
           orçamento do Estudo, não sai da carteira de ninguém, e é o que faz o
           desafio continuar valendo a pena antes de o marco fechar. */
        S.profile.xp += c.xp;
        S.profile.dailyDone = (S.profile.dailyDone || 0) + 1;
        pagarMarcoSemanal(c);
      }
      concluidos.push(c);
    }
  }
  saveProfile(S.profile);
  return concluidos;
}

/* ── O MARCO SEMANAL (D-007) ──────────────────────────────────────────────
 *
 * A DECISÃO de quanto pagar é do `engine/emissao.mjs` — pura, testável no Node,
 * e a mesma que o servidor vai ler. Aqui só se conta o que aconteceu e se aplica
 * o que ela responder.
 *
 * O contador é POR SEMANA ISO, e não por sete dias corridos: com janela
 * deslizante, quem joga sábado e domingo fecha dois marcos em três dias, e o
 * orçamento semanal vira quinzenal na prática. */
function estadoDaSemana(){
  const sem = semanaDe(hojeStr());
  if (!S.profile.semana || S.profile.semana.id !== sem)
    S.profile.semana = { id: sem, concluidos: 0, emitido: 0 };
  return S.profile.semana;
}

function pagarMarcoSemanal(){
  const w = estadoDaSemana();
  w.concluidos++;
  const r = recompensaDeDesafio({
    concluidosNaSemana: w.concluidos,
    jaEmitidoNaSemana:  w.emitido,
    saldoPcB:           saldoBonus(),
  });
  if (r.pcB > 0){
    creditarRecompensa('CHALLENGE_REWARD', r.pcB, 'marco-semanal:' + w.id);
    w.emitido += r.pcB;
    atualizarSaldo();
  }
  /* O SUBSTITUTO NÃO É SILÊNCIO. O Estudo é explícito: "Nunca mostrar como se o
     usuário tivesse perdido uma recompensa". Quem desenha a tela lê este campo;
     enquanto a tela não existir, ele fica no perfil para não se perder. */
  if (r.substituto) w.ultimoSubstituto = { tipo: r.substituto, motivo: r.motivo };
  saveProfile(S.profile);
  return r;
}

export {
  ensureDaily,
  progDesafio,
  pagarMarcoSemanal,
  estadoDaSemana,
};
