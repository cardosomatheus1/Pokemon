/* KillFeed — ranking de abates ao vivo e o pódio do fim.
 *
 * Fronteira: conta o que aconteceu na linha do tempo. Não paga nada, não
 * mexe em carteira. O pódio só exibe a odd que a rodada já registrou. */

import { $, log } from './dom.mjs';
import { dexImg } from './sprites.mjs';
import { S } from './estado.mjs';
import { ordemDeQuedas, rankingColocacao } from './colocacao.mjs';

/* =====================================================================
   KILLFEED — ranking de abates da rodada
   ---------------------------------------------------------------------
   COMO A PRECISÃO É GARANTIDA (é o ponto crítico deste sistema):

   1. Existe UMA única origem de verdade — a lista de eventos que o
      simular() produziu. O placar mostrado na tela é montado a partir
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
/* Ordem de ELIMINAÇÃO — o primeiro a cair é o último colocado.
   Vive aqui, e não num módulo próprio, por decisão de projeto: ela precisa vir
   do MESMO gancho que credita o abate. Dois contadores paralelos divergem, e a
   divergência só aparece na tela do jogador. A aritmética é do `colocacao.mjs`,
   que é puro e testável no Node; o que mora aqui é o acúmulo ao vivo. */
let ordemQuedas = [];

function resetKillfeed(){
  kills = new Array(S.fighters.length).fill(0);
  killsArena = 0;
  kfOrdem = [];
  ordemQuedas = [];
  renderKillfeed();
  renderPodio();
}

/* Registra UM abate. `autor` null = morte da arena (tempestade). */
function marcarAbate(autor, vitima){
  /* Queda e abate saem da MESMA chamada: se um registrou, o outro registrou.
     Morte por tempestade não tem autor, mas tira o lutador da arena — por isso
     a ordem de quedas é atualizada antes do `if`, e não dentro dele. */
  if (vitima !== undefined && vitima !== null && !ordemQuedas.includes(vitima))
    ordemQuedas.push(vitima);
  if (autor === null || autor === undefined){ killsArena++; }
  else {
    kills[autor] = (kills[autor] || 0) + 1;
    if (!kfOrdem.includes(autor)) kfOrdem.push(autor);   // quem chegou antes ao placar
  }
  renderKillfeed(autor);
  renderPodio();
}

/* O quadro de colocação, do 1º ao 12º.
 *
 * O TROFÉU SÓ APARECE COM A POSIÇÃO FECHADA — no fim da rodada, ou para quem já
 * caiu, cuja colocação não muda mais. Entre os vivos a ordem é prévia por vida
 * restante, e o rótulo diz "em disputa" em vez de vender previsão como
 * resultado. */
function renderPodio(){
  const lista = $('#pdList'); if (!lista) return;
  if (!S.fighters.length){ lista.innerHTML = ''; return; }
  const fim = S.state === 'result';
  const rank = rankingColocacao(S.fighters.length, ordemQuedas,
    i => { const e = S.ents[i]; return e ? e.hp / S.fighters[i].maxHp : 1; });

  lista.innerHTML = rank.map(r => {
    const f = S.fighters[r.i];
    const top = r.pos <= 3;
    const fechado = fim || !r.vivo;
    const tro = top && fechado ? `<span class="tro t${r.pos}">🏆</span>` : `<span class="pos">${r.pos}º</span>`;
    const campeao = fim && r.pos === 1 ? ' campeao' : '';
    return `<div class="pdrow${top && fechado ? ' p' + r.pos : ''}${r.vivo ? '' : ' caiu'}${campeao}${
        S.myBet && S.myBet.idx === r.i ? ' mine' : ''}" data-i="${r.i}">
      ${tro}
      <span class="face">${dexImg(f.dex, f.n)}</span>
      <span class="nm">${f.n}${campeao ? ' <b class="crown">👑</b>' : ''}</span>
      <span class="st">${r.vivo ? (fim ? '' : Math.round(r.hp * 100) + '%') : 'K.O.'}</span>
    </div>`;
  }).join('');

  const caidos = ordemQuedas.length;
  const tot = $('#pdTotal'); if (tot) tot.textContent = fim ? 'encerrada' : (caidos ? caidos + ' fora' : 'em disputa');
  const nota = $('#pdNote'); if (nota) nota.innerHTML = fim
    ? `Campeão: <b style="color:var(--gold)">${S.fighters[rank[0].i]?.n ?? '—'}</b>.`
    : 'Do 1º ao 12º, atualizado conforme caem.';
}

/* Conferência de fim de rodada, igual à dos abates: recalcula a ordem do zero a
   partir dos eventos e compara com a acumulada ao vivo. Divergência vai para o
   log em vez de passar despercebida — contador incremental sem conferência é
   dessincronia esperando acontecer. */
function conferirColocacao(){
  const ref = ordemDeQuedas(S.battle.events);
  const bate = ref.length === ordemQuedas.length && ref.every((v, i) => v === ordemQuedas[i]);
  if (!bate){
    log('<span class="l-crit">⚠️ divergência na colocação — corrigida pelo registro da simulação.</span>');
    ordemQuedas = ref;
  }
  /* REGRA 8, o empate por tempestade: quando ela derruba todos no mesmo
     instante, o campeão também consta entre os caídos — ele foi declarado
     vencedor pelo desempate por vida. Sai da lista de quedas e assume o topo,
     senão nenhuma linha ficaria em 1º. */
  const kc = ordemQuedas.indexOf(S.champ);
  if (kc !== -1) ordemQuedas.splice(kc, 1);
  renderPodio();
  return bate;
}

/* Ordena por abates (desc); empate resolve por quem marcou primeiro, e
   depois pela posição na pool — assim a lista não fica "dançando" a
   cada render entre lutadores empatados. */
/* Abates de UM lutador. Exposto porque a lista de lutadores (odds.mjs) mostra a
   coluna de abates durante a luta, e o placar continua sendo daqui — não existe
   uma segunda contagem do outro lado. */
const abatesDe = i => kills[i] || 0;

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
      <span class="face">${dexImg(r.f.dex, r.f.sp)}</span>
      <span class="nm">${r.f.n}</span>
      <span class="ko">${r.k}<small> ab</small></span>
    </div>`;
  }).join('');

  const total = kills.reduce((a, b) => a + b, 0);
  const tot = $('#kfTotal'); if (tot) tot.textContent = total + (killsArena ? ' +' + killsArena + ' arena' : '');

  const nota = $('#kfNote'); if (nota) nota.innerHTML = killsArena
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
  const box = $('#kfList'); if (!box) return;
  if (!box || !rank.length) return;
  const oddDe = i => { const o = S.odds.lutadores.find(x => x.idx === i); return o ? 'x' + o.odd.toFixed(2) : '—'; };
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
  abatesDe,
  conferirAbates,
  conferirColocacao,
  limparPodio,
  marcarAbate,
  mostrarPodio,
  renderPodio,
  renderKillfeed,
  resetKillfeed,
};
