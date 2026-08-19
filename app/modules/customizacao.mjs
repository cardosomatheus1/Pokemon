/* Customização — avatar, banner e cenário.
 *
 * Fronteira: puramente cosmética. Nada aqui toca probabilidade nem economia. */

import { $ } from './dom.mjs';
import { CUR, elenco, especies, tipoCores, tipoNomes, nomeExibido, slugExterno } from './motor.mjs';
import { DEPOSIT_PACKAGES, simulateDeposit } from './carteira.mjs';
import { PROFILE_DEFAULT, loadProfile, nivelDe, progressoNivel, saveProfile, tituloDe, topOf } from './perfil.mjs';
import { S } from './estado.mjs';
import { TEMAS, aplicarTema, temaAtual } from './tema.mjs';
import { TYPE_BADGES, renderBadges } from './medalhas.mjs';
import { dexImg, dexURL } from './sprites.mjs';
import { ensureDaily } from './desafios.mjs';
import { goView, renderSession } from './navegacao.mjs';
import { atualizarSaldo } from './controles.mjs';
import { reiniciarCarteira, saldo } from './banco.mjs';

/* =====================================================================
   CUSTOMIZAÇÃO — avatar e banner
   ---------------------------------------------------------------------
   Nada de asset novo: os avatares de treinador vêm da mesma fonte de
   sprites que o jogo já usa, os de Pokémon são os retratos que já estão
   na tela, e os cenários do banner são gradiente CSS puro. Se um sprite
   de treinador não existir na fonte, o onerror troca por um Pokémon —
   assim a customização nunca aparece quebrada.
   ===================================================================== */
const TRAINER_AVATARS = [
  {id:'red',      nm:'Red'},      {id:'blue',     nm:'Blue'},
  {id:'leaf',     nm:'Leaf'},     {id:'lance',    nm:'Lance'},
  {id:'brock',    nm:'Brock'},    {id:'misty',    nm:'Misty'},
  {id:'erika',    nm:'Erika'},    {id:'sabrina',  nm:'Sabrina'},
  {id:'koga',     nm:'Koga'},     {id:'blaine',   nm:'Blaine'},
  {id:'giovanni', nm:'Giovanni'}, {id:'ltsurge',  nm:'Surge'},
  {id:'oak',      nm:'Oak'},      {id:'agatha',   nm:'Agatha'},
  {id:'bruno',    nm:'Bruno'},    {id:'lorelei',  nm:'Lorelei'},
];
const BANNER_SCENES = [
  {id:'praia',   nm:'Praia'},   {id:'floresta', nm:'Floresta'},
  {id:'oceano',  nm:'Oceano'},  {id:'vulcao',   nm:'Vulcão'},
  {id:'ceu',     nm:'Céu'},     {id:'caverna',  nm:'Caverna'},
  {id:'noite',   nm:'Noite'},   {id:'campeao',  nm:'Campeão'},
];
const trainerURL = id => `https://play.pokemonshowdown.com/sprites/trainers/${id}.png`;

/* Retratos da Pokédex: mesma história das folhas da arena — o raw do
   GitHub cai/é bloqueado, então a CDN vem primeiro e o Showdown fecha a
   fila como terceira infraestrutura independente. */
/* Ordem restaurada: o endereço original primeiro (é o que sempre
   funcionou), espelho e Showdown só como resgate dentro do <img>. */



/* <img> que tenta os espelhos em cadeia e termina no Showdown. Sem
   isso, uma fonte fora do ar deixa a grade inteira com ícone quebrado —
   foi exatamente o que aconteceu na v0.6. */


/* slug do lutador a partir do número da dex — o último espelho da
   cadeia (Showdown) indexa por nome, não por número */
function slugDoDex(dex){
  const e = especies.find(p => p.dex === dex);
  return e ? e.n : 'pikachu';
}

function avatarURL(){
  const a = S.profile.avatar || PROFILE_DEFAULT.avatar;
  return a.kind === 'mon' ? dexURL(a.id) : trainerURL(a.id);
}

/* Pokémon oferecidos na customização: os 76 do elenco ativo, com os
   que você mais usou na frente — customizar com o seu predileto é o
   caminho mais provável. */
function customMons(){
  const favs = Object.keys(S.profile.mons);
  return elenco.slice().sort((a,b) => {
    const na = S.profile.mons[nomeExibido(a.n)] || 0, nb = S.profile.mons[nomeExibido(b.n)] || 0;
    return nb - na || a.dex - b.dex;
  });
}

function renderBanner(){
  const b = S.profile.banner || PROFILE_DEFAULT.banner;
  $('#profBanner').innerHTML =
    `<div class="scene sc-${b.scene}"></div>
     ${dexImg(b.dex, slugDoDex(b.dex), 'class="mon"')}
     <div class="shade"></div>`;
  const av = $('#profAvatar');
  av.src = avatarURL();
  av.onerror = () => {
    av.onerror = () => { av.onerror = null; av.src = trainerURL('red'); };
    av.src = `https://play.pokemonshowdown.com/sprites/gen5/${slugExterno(slugDoDex(
      (S.profile.avatar && S.profile.avatar.kind === 'mon') ? S.profile.avatar.id : 25))}.png`;
  };
}

function renderCustom(){
  const a = S.profile.avatar || PROFILE_DEFAULT.avatar;
  const b = S.profile.banner || PROFILE_DEFAULT.banner;
  const mons = customMons();

  $('#pickTrainer').innerHTML = TRAINER_AVATARS.map(t => `
    <div class="opt ${a.kind==='trainer'&&a.id===t.id?'on':''}" data-av="trainer" data-id="${t.id}">
      <img src="${trainerURL(t.id)}" alt="" onerror="this.closest('.opt').remove()">
      <div class="cap">${t.nm}</div>
    </div>`).join('');

  $('#pickMon').innerHTML = mons.map(m => `
    <div class="opt ${a.kind==='mon'&&+a.id===m.dex?'on':''}" data-av="mon" data-id="${m.dex}">
      ${dexImg(m.dex, m.n, 'loading="lazy"')}
      <div class="cap">${nomeExibido(m.n)}</div>
    </div>`).join('');

  $('#pickScene').innerHTML = BANNER_SCENES.map(s => `
    <div class="opt ${b.scene===s.id?'on':''}" data-scene="${s.id}">
      <div class="swatch sc-${s.id}"></div>
      <div class="cap">${s.nm}</div>
    </div>`).join('');

  $('#pickBannerMon').innerHTML = mons.map(m => `
    <div class="opt ${+b.dex===m.dex?'on':''}" data-bmon="${m.dex}">
      ${dexImg(m.dex, m.n, 'loading="lazy"')}
      <div class="cap">${nomeExibido(m.n)}</div>
    </div>`).join('');
}

function renderDaily(){
  const d = ensureDaily();
  $('#dailyList').innerHTML = d.lista.map(c => {
    const pct = Math.min(100, (c.prog / c.meta) * 100);
    return `<div class="chal ${c.feito ? 'ok' : ''}">
      <div class="top">
        <span class="txt">${c.feito ? '✅ ' : ''}${c.txt}</span>
        <span class="cnt">${c.prog}/${c.meta}</span>
      </div>
      <div class="pg"><i style="width:${pct.toFixed(0)}%"></i></div>
      <div class="rw">Recompensa: <b>+${c.xp} XP</b> e <b>${CUR} ${c.dia}</b></div>
    </div>`;
  }).join('') +
  `<div class="tiny" style="margin-top:8px">Desafios concluídos no total:
     <b style="color:var(--gold)">${S.profile.dailyDone || 0}</b></div>`;
}

function renderProfile(){
  const winRate = S.profile.betsCount ? Math.round(S.profile.winsCount/S.profile.betsCount*100) : 0;
  const desde = new Date(S.profile.since).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric'});
  const saldoLiq = S.profile.totalWon - S.profile.totalLost;

  $('#profName').value = S.profile.name;
  $('#profNameShow').textContent = S.profile.name;
  $('#profSince').textContent = 'Treinador desde ' + desde;

  const np = progressoNivel(S.profile.xp || 0);
  $('#profLvl').innerHTML =
    `<span class="tag">NV ${np.nivel}</span><span class="ttl">${tituloDe(np.nivel)} · ${np.atual}/${np.fim-np.ini} XP</span>`;
  $('#profXpBar').innerHTML = `<i style="width:${np.pct.toFixed(1)}%"></i>`;

  renderBanner();

  // destaques: Pokémon e tipo mais apostados
  const favMon = topOf(S.profile.mons), favType = topOf(S.profile.types);
  const dexOf = nm => { const e = elenco.find(p => nomeExibido(p.n) === nm); return e ? e.dex : 25; };
  $('#profHighlights').innerHTML =
    (favMon
      ? `<div class="hi">${dexImg(dexOf(favMon.k), slugDoDex(dexOf(favMon.k)))}
           <div class="t"><b>${favMon.k}</b><span>parceiro · ${favMon.v}x apostado</span></div></div>`
      : `<div class="hi"><div class="t"><b>—</b><span>ainda sem parceiro</span></div></div>`) +
    (favType
      ? `<div class="hi"><div class="tdot" style="background:${tipoCores[favType.k]||'#555'}">${
           (TYPE_BADGES.find(b=>b.t===favType.k)||{ico:'●'}).ico}</div>
           <div class="t"><b>${tipoNomes[favType.k] || favType.k}</b><span>tipo favorito · ${favType.v}x</span></div></div>`
      : `<div class="hi"><div class="t"><b>—</b><span>ainda sem tipo favorito</span></div></div>`);

  $('#profStats').innerHTML = `
    <div class="stat-box"><b>${saldo().toLocaleString('pt-BR')}</b><span>${CUR} saldo atual</span></div>
    <div class="stat-box"><b>NV ${nivelDe(S.profile.xp||0)}</b><span>${tituloDe(nivelDe(S.profile.xp||0))}</span></div>
    <div class="stat-box"><b>${S.profile.betsCount}</b><span>rodadas disputadas</span></div>
    <div class="stat-box"><b>${S.profile.winsCount}</b><span>vitórias</span></div>
    <div class="stat-box"><b>${winRate}%</b><span>taxa de acerto</span></div>
    <div class="stat-box"><b>${S.profile.biggestWin.toLocaleString('pt-BR')}</b><span>maior prêmio</span></div>
    <div class="stat-box"><b>${S.profile.totalBet.toLocaleString('pt-BR')}</b><span>total apostado</span></div>
    <div class="stat-box" style="grid-column:1/-1;color:${saldoLiq>=0?'var(--green)':'var(--red)'}">
      <b style="color:inherit">${saldoLiq>=0?'+':''}${saldoLiq.toLocaleString('pt-BR')}</b>
      <span>saldo líquido de apostas</span></div>`;

  renderBadges();
  renderDaily();
  renderCustom();
  /* Seletor de tema. Cada opção mostra as duas cores do próprio tema, e não um
     nome — quem escolhe pele escolhe pelo olho. */
  const alvoTema = $('#pickTema');
  if (alvoTema){
    const atual = temaAtual();
    alvoTema.innerHTML = TEMAS.map(t => `
      <button class="tema-op ${t.id === atual ? 'on' : ''}" data-tema="${t.id}"
              style="--t1:${t.c1};--t2:${t.c2};--tbg:${t.bg}" title="${t.nm}">
        <span class="tema-am"></span><span class="tema-nm">${t.nm}</span>
      </button>`).join('');
  }

}


/* --------- customização: avatar, cenário e Pokémon do banner ---------
   Um só listener no modal inteiro (delegação): as grades são recriadas a
   cada render, então prender o clique em cada opção daria listener órfão
   toda vez que a lista fosse redesenhada. */
$('#profileModal').addEventListener('click', ev => {
  /* Tema primeiro: ele não é `.opt` porque não guarda nada no perfil — a
     escolha mora em `ar_tema`, e vale para o navegador inteiro, não para a
     conta. Trocar de treinador não devia trocar a pele do site. */
  const opTema = ev.target.closest('.tema-op');
  if (opTema){
    aplicarTema(opTema.dataset.tema);
    for (const b of $('#pickTema').children) b.classList.toggle('on', b === opTema);
    return;
  }
  const opt = ev.target.closest('.opt');
  if (!opt) return;
  if (opt.dataset.av)          S.profile.avatar = {kind:opt.dataset.av, id: opt.dataset.av==='mon' ? +opt.dataset.id : opt.dataset.id};
  else if (opt.dataset.scene)  S.profile.banner = {...S.profile.banner, scene: opt.dataset.scene};
  else if (opt.dataset.bmon)   S.profile.banner = {...S.profile.banner, dex: +opt.dataset.bmon};
  else return;
  saveProfile(S.profile);
  renderBanner(); renderSession();
  // marca a opção escolhida sem redesenhar a grade inteira (não perde o scroll)
  const grid = opt.parentElement;
  grid.querySelectorAll('.opt').forEach(o => o.classList.remove('on'));
  opt.classList.add('on');
});

$('#btnProfReset').onclick = () => {
  if (!confirm('Resetar todo o perfil e o saldo?')) return;
  localStorage.removeItem('ar_profile'); localStorage.removeItem('ar_deposits');
  reiniciarCarteira(); atualizarSaldo();
  S.profile = loadProfile(); localStorage.removeItem('ar_session');
  renderProfile(); renderSession(); goView('viewHome');
};
$('#pkgList').addEventListener('click', e => {
  const row = e.target.closest('.pkg'); if (!row) return;
  simulateDeposit(DEPOSIT_PACKAGES[+row.dataset.i]);
});

export {
  avatarURL,
  renderProfile,
  trainerURL,
};
