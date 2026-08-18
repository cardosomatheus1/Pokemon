/* Precificação — o Monte Carlo fatiado e o painel de odds.
 *
 * Fronteira: transforma elenco em preço. Não conhece aposta nem carteira.
 * A fatia de 12 ms existe para não travar a animação; em aba oculta roda de
 * uma vez, senão quem abre a página em segundo plano nunca vê as odds saírem. */

import { $ } from './dom.mjs';
import { CONF, newSeed, simulate } from './motor.mjs';
import { S } from './estado.mjs';
import { imgTag } from './sprites.mjs';

/* ------------------------- ODDS (MONTE CARLO) -------------------------
   Roda CONF.SIMS batalhas e transforma frequência de vitória em odd.
   Em produção isso roda no servidor, uma vez, antes de abrir as apostas.
---------------------------------------------------------------------- */
function computeOdds(fighters, sims, onProgress){
  return new Promise(resolve => {
    const wins = new Uint32Array(fighters.length);
    let done = 0;
    function step(){
      // Em aba oculta o requestAnimationFrame não roda. Se ficássemos só
      // nele, quem abrisse a página em segundo plano nunca via as odds
      // saírem. Então: escondido, roda tudo de uma vez; visível, roda em
      // fatias de 12 ms para não travar a animação.
      if (document.hidden){
        for (; done < sims; done++){
          const w = simulate(fighters, newSeed(), false);
          if (w >= 0) wins[w]++;
        }
      } else {
        const t0 = performance.now();
        while (done < sims && performance.now() - t0 < 12){
          const w = simulate(fighters, newSeed(), false);
          if (w >= 0) wins[w]++;
          done++;
        }
      }
      if (onProgress) onProgress(done / sims);
      if (done < sims) requestAnimationFrame(step);
      else {
        const out = fighters.map((f,i) => {
          // suavização de Laplace: ninguém fica com probabilidade 0
          const p = (wins[i] + 1) / (sims + fighters.length);
          const fair = 1 / p;
          return {
            idx: i, wins: wins[i], prob: p,
            fair: +fair.toFixed(2),
            odd: Math.max(1.05, +(fair * (1 - CONF.MARGIN)).toFixed(2)),
          };
        });
        resolve(out);
      }
    }
    step();
  });
}






/* ------------------------- PAINEL DE ODDS ------------------------- */
function refreshOddsTable(){
  const body = $('#oddsBody');
  const rows = S.odds.slice().sort((a,b) => a.odd - b.odd);
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
  $('#oddNote').textContent = `${CONF.SIMS/1000}k sims · ${(CONF.MARGIN*100)|0}% casa`;
}

function buildPickList(){
  const rows = S.odds.slice().sort((a,b) => a.odd - b.odd);
  return rows.map(o => {
    const f = S.fighters[o.idx];
    return `<div class="pick" data-i="${o.idx}">
      ${imgTag(f)}
      <span class="n">${f.n}</span>
      <span class="o">x${o.odd.toFixed(2)}</span>
    </div>`;
  }).join('');
}

export {
  buildPickList,
  computeOdds,
  refreshOddsTable,
};
