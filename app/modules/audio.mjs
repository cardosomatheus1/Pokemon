/* Áudio — efeitos sintetizados em WebAudio e a trilha de fundo.
 *
 * Fronteira: som não sabe regra. Recebe "toque isto" e toca.
 * Sem arquivo de terceiro versionado — os efeitos são sintetizados. */

import { S } from './estado.mjs';
import { log } from './dom.mjs';

/* ------------------------- ÁUDIO (WebAudio, sem arquivos) -------------------------
   Chiptune próprio + efeitos sintetizados. Sem iframe do YouTube: o navegador
   bloqueia autoplay e, num produto de verdade, música com dono é problema.
--------------------------------------------------------------------------------- */
// som ligado por padrão; o navegador só libera de fato depois do
// primeiro clique, e o listener mais abaixo cuida disso
let ac = null, musicOn = false, soundEnabled = true;
function audio(){ if (!ac) ac = new (window.AudioContext||window.webkitAudioContext)(); return ac; }

function tone(freq, dur, type='square', vol=.06, when=0){
  if (!soundEnabled) return;
  const c = audio(), t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .02);
}

function sfx(kind){
  if (!soundEnabled) return;
  if (kind === 'hit')       tone(220, .09, 'square', .05);
  else if (kind === 'super'){ tone(420, .08, 'square', .06); tone(620, .10, 'square', .05, .05); }
  else if (kind === 'crit') { tone(150, .16, 'sawtooth', .08); tone(90, .22, 'square', .06, .06); }
  else if (kind === 'miss')  tone(160, .07, 'triangle', .04);
  else if (kind === 'ko')   { tone(300,.10,'square',.06); tone(200,.12,'square',.05,.10); tone(110,.28,'square',.05,.21); }
  else if (kind === 'beep')  tone(760, .09, 'square', .07);
  else if (kind === 'streak'){ [392,523,659,880].forEach((f,i)=>tone(f,.13,'square',.075,i*.07)); tone(196,.3,'sawtooth',.05); }
  else if (kind === 'levelup'){ [523,659,784,1047,1319].forEach((f,i)=>tone(f,.15,'square',.08,i*.09)); }
  else if (kind === 'win')  [523,659,784,1047].forEach((f,i)=>tone(f,.16,'square',.07,i*.12));
}

/* ------------------------- TRILHA ------------------------- */
/* Arquivo em battle-theme.mp3 (raiz do projeto, junto do index.html),
   entrando junto com a contagem regressiva e saindo em fade no final.

   HISTÓRICO DO BUG (por que este bloco é tão defensivo): navegador
   nenhum deixa um <audio> com arquivo começar sozinho antes de o
   usuário encostar na página, e `startFight()` pode ser disparado pelo
   PRÓPRIO CRONÔMETRO, sem gesto nenhum por trás. Os efeitos de combate
   nunca sofreram disso porque são WebAudio puro (osciladores), que não
   passam pela mesma trava — daí o sintoma clássico: "os ataques soam,
   a música não".

   A versão anterior desbloqueava a faixa no primeiro clique e depois
   só mexia em volume/currentTime, apostando que a reprodução JAMAIS
   seria interrompida. É uma aposta que às vezes se perde: basta o
   navegador suspender a mídia em segundo plano, o seek de `currentTime`
   falhar num arquivo ainda sem buffer, ou o elemento chegar ao fim sem
   o loop reengatar — e como nada verificava se o áudio estava mesmo
   rodando, ele ficava mudo até recarregar a página.

   Agora nada é presumido. `music(true)` VERIFICA e reata a reprodução,
   e um watchdog roda a cada segundo: se era pra estar tocando e não
   está, ele tenta de novo. Qualquer clique/tecla/toque também tenta
   destravar. É redundante de propósito — som é a parte do sistema em
   que o navegador tem a última palavra, então a estratégia é insistir
   em vez de supor.                                                     */
const bgm = document.getElementById('bgm');
let fadeTimer = null, bgmReady = false, bgmWant = false;
let bgmAvisou = false;   // já contou no log que a trilha entrou?

// fallback de caminho: se battle-theme.mp3 não existir na raiz, tenta
// audio/battle-theme.mp3 antes de desistir — cobre os dois jeitos mais
// comuns de organizar a pasta do projeto.
const BGM_SOURCES = ['battle-theme.mp3', 'audio/battle-theme.mp3'];
let bgmSrcTry = 0;
bgm.addEventListener('error', () => {
  bgmSrcTry++;
  if (bgmSrcTry < BGM_SOURCES.length){ bgm.src = BGM_SOURCES[bgmSrcTry]; bgm.load(); }
  else log(`<span class="l-sys">⚠️ trilha não encontrada — coloque <b>battle-theme.mp3</b> na mesma pasta do index.html. Os efeitos de combate seguem normais.</span>`);
});
if (bgm.error) bgm.dispatchEvent(new Event('error'));

/* o loop nativo do <audio> falha quando o servidor não manda Range e o
   `duration` vira Infinity; este é o cinto de segurança */
bgm.addEventListener('ended', () => {
  if (bgmWant){ try { bgm.currentTime = 0; } catch(e) {} bgm.play().catch(()=>{}); }
});

function fadeTo(alvo, ms, aoFim){
  clearInterval(fadeTimer); fadeTimer = null;
  const de = bgm.volume, passos = Math.max(1, Math.round(ms/40));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    bgm.volume = Math.max(0, Math.min(1, de + (alvo-de) * i/passos));
    if (i >= passos){ clearInterval(fadeTimer); fadeTimer = null; if (aoFim) aoFim(); }
  }, 40);
}

/* Tenta pôr o arquivo pra rodar. Chamado em TODA interação do usuário e
   também pelo watchdog — nunca desiste em definitivo, porque a permissão
   pode chegar a qualquer momento. */
function tentarTocar(comFade){
  const p = bgm.play();
  if (p && p.then){
    p.then(() => {
      bgmReady = true;
      if (bgmWant){
        if (comFade) fadeTo(S.musicVol, 400); else bgm.volume = S.musicVol;
        if (!bgmAvisou){ bgmAvisou = true; log('<span class="l-sys">🎵 trilha de batalha tocando.</span>'); }
      }
    }).catch(() => { /* sem gesto do usuário ainda — o watchdog tenta de novo */ });
  } else {
    bgmReady = true;   // navegadores antigos, sem Promise em play()
    if (bgmWant && !comFade) bgm.volume = S.musicVol;
  }
}

function music(on){
  musicOn = on && soundEnabled;
  bgmWant = musicOn;

  if (!musicOn){ fadeTo(0, 600); return; }   // silencia, não pausa

  // volta pro começo da faixa a cada rodada (se o arquivo já permite)
  if (bgm.readyState > 0){ try { bgm.currentTime = 0; } catch(e) {} }
  bgm.volume = 0;
  fadeTo(S.musicVol, 500);
  // e — o ponto que faltava — GARANTE que está de fato tocando
  if (bgm.paused) tentarTocar(false);
}

/* Watchdog: uma vez por segundo, se era pra estar tocando e não está,
   tenta de novo. É o que faz a trilha se recuperar sozinha de qualquer
   interrupção, em vez de ficar muda até recarregar a página. */
setInterval(() => {
  if (!bgmWant || !soundEnabled) return;
  if (bgm.paused) tentarTocar(true);
  else if (bgm.volume < 0.01 && !fadeTimer) bgm.volume = S.musicVol;
}, 1000);

// qualquer interação do usuário é uma chance de destravar o áudio
['pointerdown','keydown','touchstart'].forEach(ev =>
  document.addEventListener(ev, () => {
    if (ac) ac.resume();
    if (!bgmReady || (bgmWant && bgm.paused)) tentarTocar(true);
  }, {passive:true}));


/* Som e volume são estado interno deste módulo. O painel de controles precisa
   mexer neles, e binding importado não aceita atribuição — então a fronteira é
   uma função, não uma variável. */
function alternarSom(){
  soundEnabled = !soundEnabled;
  if (soundEnabled) audio().resume(); 
  return soundEnabled;
}
function somLigado(){ return soundEnabled; }

/* Mudar o volume no meio de um fade tem que cancelar o fade, senão o valor
   novo é sobrescrito pelo passo seguinte da transição. */
function aplicarVolume(v){
  if (!musicOn) return;
  clearInterval(fadeTimer); fadeTimer = null;
  bgm.volume = v;
}

export {
  alternarSom,
  aplicarVolume,
  audio,
  bgm,
  music,
  musicOn,
  sfx,
  somLigado,
};
