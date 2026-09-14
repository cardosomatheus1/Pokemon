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
/* O SOM COMECA DESLIGADO. SEMPRE. Sem memoria, sem excecao.

   Palavra do dono: *"o botao do som fica mutado, o player ativa se quiser,
   ponto final"*. Eu tinha proposto lembrar a escolha entre visitas; ele cortou,
   e a regra simples e a certa — som e uma coisa que o jogador LIGA, nunca uma
   que ele descobre tocando.

   ── E A ARENA SO SOA NA ARENA ─────────────────────────────────────────

   *"Eu nao posso ta na aba da rota ouvindo os hitbox da arena"*. Hitbox e
   SFX, e nao trilha — parar so a musica deixaria os efeitos da luta tocando
   por cima da tela das rotas. Por isso a trava e UMA e vale para os dois:
   a casa de cada som. A navegacao diz que vista esta na tela; quem toca
   passa por ela.

   **A trava virou POR SOM no 1.23**, e nao mais um booleano de vista: ver
   `CASA_DO_SOM`, logo abaixo. A queixa acima continua sendo a razao dela. */
/* ── A TRAVA É POR SOM, E NÃO POR VISTA (1.23) ─────────────────────────
   Ela era `arenaVisivel`: um booleano, e o nome deixou de ser verdade no dia
   em que a captura ganhou som — a aba de Rotas não é a arena, e a trava a
   emudecia.

   A primeira correção foi grossa demais: eu abri a trava para as duas vistas,
   e com isso o **hitbox da arena voltou a tocar na aba das rotas** — que é
   exatamente a queixa que fez esta trava existir. O teste do Q5 pegou.

     > A pergunta certa nunca foi *"esta vista toca som?"*. É **"este som
     > pertence a esta vista?"**

   Então cada som declara a casa dele. O padrão é a ARENA: um efeito novo que
   ninguém classificou fica preso onde a trava já era conservadora, e some da
   tela errada em vez de vazar para ela.

   A TRILHA continua sendo só da arena, e por outro motivo — música de batalha
   em tela de farm seria outra coisa, não um vazamento. */
const CASA_DO_SOM = {
  hit: 'viewArena', super: 'viewArena', crit: 'viewArena', miss: 'viewArena',
  ko: 'viewArena', beep: 'viewArena', streak: 'viewArena',
  levelup: 'viewArena', win: 'viewArena',
  balanco: 'viewIdle', capturou: 'viewIdle', fugiu: 'viewIdle',
};
let vistaAtual = 'viewArena';
function verVista(id){
  vistaAtual = id;
  if (id !== 'viewArena') music(false);
}
/* O padrão é a arena — ver a nota acima sobre som novo não classificado. */
const casaDe = kind => CASA_DO_SOM[kind] ?? 'viewArena';

/* ── O PREDICADO É UM SÓ, E A SONDA PASSA POR ELE ─────────────────────
 *
 * A primeira versão tinha DOIS caminhos para a mesma pergunta: `sfx` decidia
 * por conta própria, e `soaAgora` — que é por onde o portão Q5 pergunta —
 * repetia a decisão com outras palavras.
 *
 * O Q2 pegou: quatro sabotagens da trava passaram VERDES, porque o teste media
 * um caminho e o defeito morava no outro.
 *
 *   > **Medir onde o defeito não pode aparecer não é medir** — e a forma mais
 *   > fácil de cair nisso é ter duas funções que "fazem a mesma coisa".
 *
 * É a mesma lição do `orfaosDe` no 1.22: a auto-verificação tem de percorrer o
 * caminho da afirmação, e não um parecido. */
const podeSoar = kind => soundEnabled && casaDe(kind) === vistaAtual;
let ac = null, musicOn = false, soundEnabled = false;
function audio(){ if (!ac) ac = new (window.AudioContext||window.webkitAudioContext)(); return ac; }

function tone(freq, dur, type='square', vol=.06, when=0, casa='viewArena'){
  /* A TRAVA MORA AQUI, na raiz: todo SFX passa por `tone`. Poe-la so em `sfx`
     deixaria de fora qualquer efeito futuro que chame `tone` direto.

     E a casa entra como ARGUMENTO com padrao arena: quem chamar `tone` sem
     dizer de onde e fica preso na arena, que e o lado seguro do erro. */
  if (!soundEnabled || casa !== vistaAtual) return;
  const c = audio(), t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .02);
}

function sfx(kind){
  if (!podeSoar(kind)) return;
  /* Dentro de um `sfx`, todo `tone` herda a casa daquele efeito — assim a
     lista de notas nao repete o nome da vista doze vezes. */
  const som = (f, d, ty, v, w) => tone(f, d, ty, v, w, casaDe(kind));
  if (kind === 'hit')       som(220, .09, 'square', .05);
  else if (kind === 'super'){ som(420, .08, 'square', .06); som(620, .10, 'square', .05, .05); }
  else if (kind === 'crit') { som(150, .16, 'sawtooth', .08); som(90, .22, 'square', .06, .06); }
  else if (kind === 'miss')  som(160, .07, 'triangle', .04);
  else if (kind === 'ko')   { som(300,.10,'square',.06); som(200,.12,'square',.05,.10); som(110,.28,'square',.05,.21); }
  else if (kind === 'beep')  som(760, .09, 'square', .07);
  else if (kind === 'streak'){ [392,523,659,880].forEach((f,i)=>som(f,.13,'square',.075,i*.07)); som(196,.3,'sawtooth',.05); }
  else if (kind === 'levelup'){ [523,659,784,1047,1319].forEach((f,i)=>som(f,.15,'square',.08,i*.09)); }
  else if (kind === 'win')  [523,659,784,1047].forEach((f,i)=>som(f,.16,'square',.07,i*.12));
  /* ── OS TRÊS SONS DA CAPTURA (1.23) ───────────────────────────────────
     Pedido do dono: *"poderiam ter sons marcando quando fugir similar um som
     frustrante e ao capturar som similar ou igual realmente quando se captura"*.

     Sintetizados, e não baixados: o projeto tem zero dependência e zero arquivo
     de som além da trilha. Três osciladores custam nada e cabem no mesmo
     `tone` que a arena já usa há dezoito blocos.

     O BALANÇO é o que faltava para a tensão ser OUVIDA. Sem ele os três
     balanços são mímica: a pausa entre eles é o suspense, e uma pausa sem som
     antes e depois é só ausência. */
  else if (kind === 'balanco') { som(320, .05, 'square', .045); som(240, .06, 'triangle', .03, .03); }
  /* A TRAVA: o clique seco e, em cima dele, a tríade que sobe. O clique é o
     que diz "fechou"; a tríade é o que diz "é seu". Separá-los faz o momento
     ter DOIS tempos, que é o que uma nota só não consegue. */
  else if (kind === 'capturou') {
    som(1180, .045, 'square', .085);
    [659, 880, 1175, 1568].forEach((f, i) => som(f, .17, 'square', .075, .06 + i * .075));
    som(330, .40, 'triangle', .045, .06);
  }
  /* A FUGA CAI, e cai em serra: o timbre áspero é metade da frustração. Duas
     notas descendo com a segunda mais longa — a última é a que fica, e é ela
     que soa como "acabou e não foi". */
  else if (kind === 'fugiu') {
    som(392, .13, 'sawtooth', .06);
    som(311, .16, 'sawtooth', .055, .10);
    som(233, .34, 'sawtooth', .05, .22);
    som(116, .30, 'square', .035, .24);
  }
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
  /* O aviso de trilha ausente saiu do log do jogador no V1.16: era instrução de
     instalação dirigida a um desenvolvedor, na mesma tela em que se pede
     confiança nas odds — e aparecia truncado no ticker de duas linhas. Quem
     precisa dele é quem roda o projeto, e para isso o console serve. */
  else console.info('battle-theme.mp3 ausente — os efeitos de combate seguem normais.');
});

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

/* A CONDICAO QUE TODO SOM CONSULTA, exposta para o portao Q5 poder afirmar
   sobre ela. Sem isto, a unica forma de testar "o hitbox nao toca na aba das
   rotas" seria escutar — e escutar nao e um teste. */
/* "ESTE som tocaria agora?" Recebe o NOME do efeito — e não a vista — porque é
   assim que ela passa pelo mesmo `podeSoar` que o `sfx` usa. O padrão é `hit`,
   que é o hitbox da arena: exatamente o som da queixa que originou a trava. */
function soaAgora(kind = 'hit'){ return podeSoar(kind); }

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
  soaAgora,
  somLigado,
  verVista,
};
