/* Medalhas — reconhecimento permanente, em quatro níveis.
 *
 * Fronteira: só lê estatística acumulada; não emite moeda. */

import { $ } from './dom.mjs';
import { S } from './estado.mjs';
import { topOf } from './perfil.mjs';

/* =====================================================================
   MEDALHAS
   ---------------------------------------------------------------------
   Cada medalha é uma métrica + 4 degraus. O nível sai sozinho da
   estatística: nada é "concedido" em lugar nenhum do código, então não
   existe estado extra pra dessincronizar — recalcular a partir do
   perfil sempre dá o mesmo resultado. Visualmente o degrau muda cor,
   contorno e brilho (bronze → prata → ouro → diamante), que é o
   "evoluir" pedido, sem precisar de arte nova pra cada nível.
   ===================================================================== */
const TIER_NAMES = ['', 'BRONZE', 'PRATA', 'OURO', 'DIAMANTE'];
const TYPE_BADGES = [
  {t:'fire',    ico:'🔥', nm:'Chama'},
  {t:'water',   ico:'💧', nm:'Cascata'},
  {t:'grass',   ico:'🌿', nm:'Folha'},
  {t:'electric',ico:'⚡', nm:'Trovão'},
  {t:'psychic', ico:'🔮', nm:'Mente'},
  {t:'fighting',ico:'🥊', nm:'Punho'},
  {t:'rock',    ico:'🪨', nm:'Rocha'},
  {t:'ghost',   ico:'👻', nm:'Alma'},
  {t:'ice',     ico:'❄️', nm:'Gelo'},
  {t:'dragon',  ico:'🐉', nm:'Dragão'},
];
function badgeList(){
  const out = [];
  const push = (ico, nm, val, steps) => {
    let tier = 0;
    for (let i=0;i<steps.length;i++) if (val >= steps[i]) tier = i+1;
    const prox = tier < steps.length ? steps[tier] : null;
    const ant  = tier > 0 ? steps[tier-1] : 0;
    const pct  = prox ? Math.min(100, ((val-ant)/(prox-ant))*100) : 100;
    out.push({ico, nm, val, tier, prox, pct});
  };

  push('🏆', 'Vitórias',        S.profile.winsCount,  [1, 10, 50, 200]);
  push('🎯', 'Rodadas',         S.profile.betsCount,  [5, 25, 100, 500]);
  push('💰', 'Total apostado',  S.profile.totalBet,   [1000, 10000, 50000, 250000]);
  push('💵', 'Maior prêmio',    S.profile.biggestWin, [500, 2500, 10000, 50000]);

  const liq = S.profile.totalWon - S.profile.totalLost;
  push('📈', 'Saldo positivo',  Math.max(0, liq),   [1, 2000, 20000, 100000]);

  // medalha do Pokémon predileto
  const fav = topOf(S.profile.mons);
  if (fav) push('⭐', 'Parceiro: ' + fav.k, fav.v, [5, 20, 60, 150]);

  // medalhas por tipo: só aparecem depois da primeira aposta naquele tipo
  for (const b of TYPE_BADGES){
    const n = S.profile.types[b.t] || 0;
    if (n > 0) push(b.ico, b.nm, n, [10, 50, 150, 400]);
  }
  return out;
}

function renderBadges(){
  const list = badgeList();
  $('#badgeGrid').innerHTML = list.map(b => `
    <div class="badge t${b.tier}" title="${b.nm}: ${b.val.toLocaleString('pt-BR')}${b.prox ? ' / ' + b.prox.toLocaleString('pt-BR') : ' — máximo'}">
      ${b.tier ? `<span class="tier">${TIER_NAMES[b.tier]}</span>` : ''}
      <span class="ico">${b.ico}</span>
      <span class="nm">${b.nm}</span>
      <div class="pg"><i style="width:${b.pct.toFixed(0)}%"></i></div>
    </div>`).join('');
}

export {
  TYPE_BADGES,
  renderBadges,
};
