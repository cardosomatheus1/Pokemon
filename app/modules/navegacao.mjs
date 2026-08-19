/* Navegação e sessão — troca de telas, cadastro, login, modais.
 *
 * Fronteira: decide o que está visível. O PIN é fachada e está documentado
 * como tal; autenticação de verdade é da V1. */

import { $ } from './dom.mjs';
import { CUR } from './motor.mjs';
import { S } from './estado.mjs';
import { simsLongo } from './sims.mjs';
import { emitir } from './telemetria.mjs';
import { saldo } from './banco.mjs';
import { renderProfile } from './customizacao.mjs';
import { avatarURL, trainerURL } from './perfil.mjs';
import { progressoNivel, saveProfile, tituloDe } from './perfil.mjs';
import { renderDeposit } from './carteira.mjs';

/* =====================================================================
   NAVEGAÇÃO E SESSÃO
   ---------------------------------------------------------------------
   As views são trocadas por classe, sem recarregar a página — quando
   existir servidor, cada uma vira uma rota sem reescrever o conteúdo.
   A "sessão" é local: o treinador mora no localStorage. O PIN não é
   segurança de verdade (e o texto na tela diz isso) — é só para o fluxo
   de login existir e poder ser trocado por autenticação real depois.
   ===================================================================== */
function goView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id));
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('on', b.dataset.view === id));
  window.scrollTo({top:0, behavior:'smooth'});
  if (id === 'viewHome') renderHero();
}
document.querySelectorAll('.nav').forEach(b => b.onclick = () => goView(b.dataset.view));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]');
  if (g) goView(g.dataset.goto);
});

function renderHero(){
  const np = progressoNivel(S.profile.xp || 0);
  const el = $('#heroStats'); if (!el) return;
  el.innerHTML = sessaoAtiva()
    ? `<div><b>NV ${np.nivel}</b><span>${tituloDe(np.nivel)}</span></div>
       <div><b>${S.profile.betsCount}</b><span>rodadas</span></div>
       <div><b>${S.profile.winsCount}</b><span>vitórias</span></div>
       <div><b>${saldo().toLocaleString('pt-BR')}</b><span>${CUR} saldo</span></div>`
    : `<div><b>76</b><span>lutadores</span></div>
       <div><b>12</b><span>por rodada</span></div>
       <div><b>${simsLongo()}</b><span>simulações/odd</span></div>
       <div><b>30s</b><span>para apostar</span></div>`;
}

const sessaoAtiva = () => localStorage.getItem('ar_session') === '1';

function renderSession(){
  const box = $('#sessionBox');
  if (sessaoAtiva()){
    const np = progressoNivel(S.profile.xp || 0);
    box.innerHTML =
      `<div class="who-chip" id="chipProfile" title="Abrir perfil">
         <img src="${avatarURL()}" alt="" onerror="this.onerror=null;this.src='${trainerURL('red')}'">
         <div class="i"><b>${S.profile.name}</b><span>NV ${np.nivel}</span></div>
       </div>
       <button class="tbtn" id="btnDeposit2">💵</button>
       <button class="tbtn" id="btnLogout" title="Sair">⏻</button>`;
    $('#chipProfile').onclick = () => { renderProfile(); openModal('#profileModal'); };
    $('#btnDeposit2').onclick = () => { renderDeposit(); openModal('#depositModal'); };
    $('#btnLogout').onclick = () => {
      if (!confirm('Sair da conta? O treinador continua salvo neste navegador.')) return;
      localStorage.removeItem('ar_session'); renderSession(); renderHero(); goView('viewHome');
    };
  } else {
    box.innerHTML = `<button class="tbtn" id="btnLogin">Entrar</button>
                     <button class="tbtn gold" id="btnSignup">Criar treinador</button>`;
    $('#btnLogin').onclick  = () => abrirAuth('login');
    $('#btnSignup').onclick = () => abrirAuth('signup');
  }
  renderHero();
}

let authMode = 'signup';
function abrirAuth(modo){
  authMode = modo;
  const existe = !!localStorage.getItem('ar_profile');
  $('#authTtl').childNodes[0].nodeValue = modo === 'signup' ? 'Criar treinador ' : 'Entrar ';
  $('#btnAuthGo').textContent = modo === 'signup' ? 'Criar treinador' : 'Entrar';
  $('#btnAuthSwap').textContent = modo === 'signup' ? 'Já tenho conta' : 'Criar uma conta';
  $('#authAgeRow').style.display = modo === 'signup' ? 'flex' : 'none';
  $('#authMsg').textContent = '';
  $('#authName').value = modo === 'login' && existe ? S.profile.name : '';
  $('#authPin').value = '';
  openModal('#authModal');
}
$('#btnAuthSwap').onclick = () => abrirAuth(authMode === 'signup' ? 'login' : 'signup');

$('#btnAuthGo').onclick = () => {
  const nome = $('#authName').value.trim().slice(0,18);
  const pin  = $('#authPin').value.trim();
  const msg  = $('#authMsg');
  if (!nome){ msg.textContent = 'Escolha um nome de treinador.'; return; }
  if (pin && !/^\d{4}$/.test(pin)){ msg.textContent = 'O PIN precisa ter 4 dígitos.'; return; }

  if (authMode === 'signup'){
    if (!$('#authAge').checked){ msg.textContent = 'É preciso confirmar a declaração acima.'; return; }
    S.profile.name = nome;
    S.profile.pin = pin || null;
    if (!S.profile.since) S.profile.since = Date.now();
    saveProfile(S.profile);
  } else {
    if (S.profile.pin && S.profile.pin !== pin){ msg.textContent = 'PIN incorreto.'; return; }
    if (nome.toLowerCase() !== (S.profile.name||'').toLowerCase()){
      msg.textContent = 'Não existe treinador com esse nome neste navegador.'; return;
    }
  }
  localStorage.setItem('ar_session','1');
  closeModal('#authModal');
  renderSession();
  goView('viewArena');
};
$('#btnHeroSignup').onclick = () => abrirAuth(sessaoAtiva() ? 'login' : 'signup');


/* --------- modais genéricos --------- */
/* L-015: os botões de fechar usavam `onclick` embutido no HTML, que não
   enxerga escopo de módulo — o app precisava expor `window.closeModal` só
   para isso. Um ouvinte delegado resolve, e some com a variável global. */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-fechar]');
  if (b) closeModal(b.dataset.fechar);
});
function openModal(id){
  $(id).classList.add('show');
  /* §4.7: abrir perfil e carteira são eventos próprios. Medir o que o jogador
     OLHA, e não só o que ele aposta, é o que separa produto de cassino. */
  if (id === '#profileModal') emitir('profile_opened');
  if (id === '#walletModal')  emitir('wallet_opened');
}
function closeModal(id){ $(id).classList.remove('show'); }

export {
  closeModal,
  goView,
  openModal,
  renderSession,
  sessaoAtiva,
};
