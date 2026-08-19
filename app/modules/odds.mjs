/* Precificação — o Monte Carlo fatiado e o painel de odds.
 *
 * Fronteira: transforma elenco em preço. Não conhece aposta nem carteira.
 * A fatia de 12 ms existe para não travar a animação; em aba oculta roda de
 * uma vez, senão quem abre a página em segundo plano nunca vê as odds saírem. */

import { $ } from './dom.mjs';
import { CONF, CUR, M } from './motor.mjs';
import { precificar, simularLote } from '../../engine/preco.mjs';
import { avaliarAposta } from '../../engine/exposicao.mjs';
import { S } from './estado.mjs';
import { imgTag } from './sprites.mjs';

/* ------------------------- ODDS (MONTE CARLO) -------------------------
   Roda CONF.SIMS batalhas e transforma frequência de vitória em odd.
   Em produção isso roda no servidor, uma vez, antes de abrir as apostas.
   `raiz` é a semente-raiz da rodada (Spec §P3). Cada simulação recebe uma
   sub-seed derivada do índice, e não uma semente aleatória: com isso o preço
   deixa de ser irreproduzível. Duas execuções da mesma rodada dão a MESMA
   tabela de odds, que é o que o §25.2 precisa para alguém auditar o preço
   depois de a rodada acabar.

   Desde o F0.6 cada simulação sorteia o próprio clima (§4.3). O clima da luta
   real segue secreto até as apostas fecharem — o que mudou é que o preço passa
   a saber que ele existe.
---------------------------------------------------------------------- */
function computeOdds(fighters, sims, onProgress, raiz){
  return new Promise(resolve => {
    const wins = new Uint32Array(fighters.length);
    let done = 0;
    function step(){
      // Em aba oculta o requestAnimationFrame não roda. Se ficássemos só
      // nele, quem abrisse a página em segundo plano nunca via as odds
      // saírem. Então: escondido, roda tudo de uma vez; visível, roda em
      // fatias de 12 ms para não travar a animação.
      //
      // O tamanho da fatia NÃO afeta o resultado: cada simulação tem sub-seed
      // derivada do próprio índice (engine/preco.mjs), não de um sorteio.
      if (document.hidden){
        simularLote(M, fighters, raiz, done, sims, wins);
        done = sims;
      } else {
        const t0 = performance.now();
        while (done < sims && performance.now() - t0 < 12){
          const ate = Math.min(sims, done + 200);
          simularLote(M, fighters, raiz, done, ate, wins);
          done = ate;
        }
      }
      if (onProgress) onProgress(done / sims);
      if (done < sims) requestAnimationFrame(step);
      else resolve(precificar(wins, sims, M));
    }
    step();
  });
}






/* ------------------------- PAINEL DE ODDS ------------------------- */
function refreshOddsTable(){
  const body = $('#oddsBody');
  const rows = S.odds.lutadores.slice().sort((a,b) => a.odd - b.odd);
  body.innerHTML = rows.map(o => {
    const e = S.ents[o.idx], f = S.fighters[o.idx];
    const dead = e && !e.alive;
    const hpPct = e ? Math.round(e.hp / f.maxHp * 100) : 100;
    return `<tr class="${dead ? 'out':''}">
      <td>${f.n}</td>
      <td class="hpc">${dead ? '—' : hpPct+'%'}</td>
      <td class="od">${dead ? 'OUT' : 'x'+o.odd.toFixed(2)}</td>
    </tr>`;
  }).join('');
  /* O rodapé passa a mostrar a margem EFETIVA e o pior erro relativo. É o
     §4.4.1 na tela: overround diferente do configurado não pode ficar
     escondido, e o erro do estimador é o que separa "a casa cobra 8 %" de
     "a casa cobra 8 % com uma barra de erro que você não vê". */
  const R = S.odds;
  $('#oddNote').textContent =
    `${(R.sims/1000)|0}k sims · casa ${(R.margemEfetiva*100).toFixed(1)}% · ` +
    `erro máx ${(R.erroPior*100).toFixed(1)}%`;
}

function buildPickList(){
  const rows = S.odds.lutadores.slice().sort((a,b) => a.odd - b.odd);
  return rows.map(o => {
    const f = S.fighters[o.idx];
    /* §4.4.6: a interface mostra o stake máximo daquele lutador e, quando o
       mercado fecha por passivo, diz isso — nunca rejeita em silêncio. O
       limite é consultado ao vivo porque ele encolhe conforme o passivo sobe. */
    const v = S.passivo ? avaliarAposta(S.odds, S.passivo, o.idx, 1, CONF) : null;
    const fechado = v && !v.aceito;
    const cabe = v && v.aceito ? v.limite : 0;
    return `<div class="pick ${fechado ? 'fechado' : ''}" data-i="${o.idx}">
      ${imgTag(f)}
      <span class="n">${f.n}</span>
      <span class="o">x${o.odd.toFixed(2)}</span>
      <span class="lim tiny">${fechado ? 'mercado fechado'
        : `até ${CUR} ${cabe.toLocaleString('pt-BR')}`}</span>
    </div>`;
  }).join('');
}

export {
  buildPickList,
  computeOdds,
  refreshOddsTable,
};
