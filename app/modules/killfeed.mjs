/* KillFeed — ranking de abates ao vivo e o pódio do fim.
 *
 * Fronteira: conta o que aconteceu na linha do tempo. Não paga nada, não
 * mexe em carteira. O pódio só exibe a odd que a rodada já registrou. */

import { $, log } from './dom.mjs';
import { dexImg } from './sprites.mjs';
import { S } from './estado.mjs';

/* =====================================================================
   KILLFEED — ranking de abates da rodada
   ---------------------------------------------------------------------
   COMO A PRECISÃO É GARANTIDA (é o ponto crítico deste sistema):

   1. Existe UMA única origem de verdade — a lista de eventos que o
      simulate() produziu. O placar mostrado na tela é montado a partir
      dela, evento por evento, conforme o replay chega em cada um.
   2. Um abate só conta quando o evento é de ATAQUE e derrubou alguém:
      `!ev.storm && !ev.streak && ev.ko`. Os eventos de killstreak
      carregam o índice do atacante (`a`) mas NÃO são abates — contá-los
      dobraria o placar de quem mais mata, que é justamente quem gera
      killstreak. Foi o primeiro erro que este desenho evita.
   3. Morte por tempestade não tem autor: ninguém a executou. Ela entra
      num contador separado ("arena"), nunca no crédito de um lutador.
   4. Cada evento é aplicado uma vez só — o ponteiro do replay (`evPtr`)
      nunca anda para trás.
   5. E, ao fim da rodada, `conferirAbates()` recalcula o placar do zero
      a partir dos eventos e compara com o que foi somado ao vivo. Se
      houver qualquer divergência, ela aparece no log em vez de passar
      despercebida. Um contador incremental sem essa conferência é uma
      dessincronia esperando para acontecer.
   ===================================================================== */
let kills = [];          // abates por lutador (índice = posição na pool)
let killsArena = 0;      // mortes sem autor (tempestade)
let kfOrdem = [];        // ordem de chegada, para desempate estável

function resetKillfeed(){
  kills = new Array(S.fighters.length).fill(0);
  killsArena = 0;
  kfOrdem = [];
  renderKillfeed();
}

/* Registra UM abate. `autor` null = morte da arena (tempestade). */
function marcarAbate(autor, vitima){
  if (autor === null || autor === undefined){ killsArena++; }
  else {
    kills[autor] = (kills[autor] || 0) + 1;
    if (!kfOrdem.includes(autor)) kfOrdem.push(autor);   // quem chegou antes ao placar
  }
  renderKillfeed(autor);
}

/* Ordena por abates (desc); empate resolve por quem marcou primeiro, e
   depois pela posição na pool — assim a lista não fica "dançando" a
   cada render entre lutadores empatados. */
function rankingAbates(){
  return S.fighters.map((f, i) => ({f, i, k: kills[i] || 0}))
    .sort((a, b) => b.k - a.k
      || (kfOrdem.indexOf(a.i) + 1 || 99) - (kfOrdem.indexOf(b.i) + 1 || 99)
      || a.i - b.i);
}

function renderKillfeed(destacar){
  const lista = $('#kfList'); if (!lista) return;
  if (!S.fighters.length){ lista.innerHTML = ''; return; }
  const rank = rankingAbates();

  lista.innerHTML = rank.map((r, pos) => {
    const vivo = S.ents[r.i] ? S.ents[r.i].alive : true;
    const medal = r.k > 0 && pos < 3 ? ' m' + (pos + 1) : '';
    const meu = S.myBet && S.myBet.idx === r.i ? ' mine' : '';
    return `<div class="kfrow${medal}${r.k ? '' : ' zero'}${vivo ? '' : ' dead'}${meu}" data-i="${r.i}">
      <span class="pos">${r.k > 0 && pos < 3 ? ['🥇','🥈','🥉'][pos] : (pos + 1) + 'º'}</span>
      <span class="face">${dexImg(r.f.dex, r.f.n)}</span>
      <span class="nm">${r.f.n}</span>
      <span class="ko">${r.k}<small> ab</small></span>
    </div>`;
  }).join('');

  const total = kills.reduce((a, b) => a + b, 0);
  $('#kfTotal').textContent = total + (killsArena ? ' +' + killsArena + ' arena' : '');

  $('#kfNote').innerHTML = killsArena
    ? `<b>${killsArena}</b> queda(s) pela tempestade não entram no ranking — não têm autor.`
    : 'O ranking zera a cada nova rodada.';

  // pulso na linha de quem acabou de abater
  if (destacar !== null && destacar !== undefined){
    const el = lista.querySelector(`.kfrow[data-i="${destacar}"]`);
    if (el){ void el.offsetWidth; el.classList.add('pulse'); }
  }
}

/* Conferência de fim de rodada: recalcula tudo do zero a partir dos
   eventos e compara com o placar acumulado ao vivo. */
function conferirAbates(){
  const ref = new Array(S.fighters.length).fill(0);
  let refArena = 0;
  for (const ev of S.battle.events){
    if (ev.storm){ for (const h of ev.hits) if (h.ko) refArena++; continue; }
    if (ev.streak) continue;
    if (ev.ko) ref[ev.a]++;
  }
  const bate = refArena === killsArena && ref.every((v, i) => v === kills[i]);
  if (!bate){
    log('<span class="l-crit">⚠️ divergência no placar de abates — corrigido pelo registro da simulação.</span>');
    kills = ref; killsArena = refArena;
    renderKillfeed();
  }
  // invariante: abates + quedas da arena = mortos da rodada
  const mortos = S.ents.filter(e => !e.alive).length;
  const soma = ref.reduce((a, b) => a + b, 0) + refArena;
  if (soma !== mortos)
    console.warn('killfeed: soma de abates', soma, 'difere de lutadores caídos', mortos);
  return bate;
}

/* Pódio do fim da rodada: top 3 abatedores com a odd que cada um tinha
   quando as apostas fecharam. Mostra o que rendeu o quê. */
function mostrarPodio(){
  const rank = rankingAbates().filter(r => r.k > 0).slice(0, 3);
  const box = $('#kfList');
  if (!box || !rank.length) return;
  const oddDe = i => { const o = S.odds.find(x => x.idx === i); return o ? 'x' + o.odd.toFixed(2) : '—'; };
  box.insertAdjacentHTML('afterend', `
    <div class="kfpodium" id="kfPodium">
      <div class="t">Pódio de abates da rodada</div>
      ${rank.map((r, p) => `
        <div class="kfpod">
          <span class="md">${['🥇','🥈','🥉'][p]}</span>
          <span class="i"><b>${r.f.n}</b><span>${r.k} abate${r.k > 1 ? 's' : ''}${
            r.i === S.champ ? ' · venceu a rodada' : ''}</span></span>
          <span class="od">${oddDe(r.i)}</span>
        </div>`).join('')}
    </div>`);
}

function limparPodio(){ const p = $('#kfPodium'); if (p) p.remove(); }

export {
  conferirAbates,
  limparPodio,
  marcarAbate,
  mostrarPodio,
  renderKillfeed,
  resetKillfeed,
};
