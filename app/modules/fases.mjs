/* Fases — apostas, contagem, batalha, resultado.
 *
 * Fronteira: é a máquina de estados da rodada, e o único lugar que muda
 * S.state. Chama todo o resto; por isso é a camada mais alta antes do laço. */

import { $, log } from './dom.mjs';
import { emReais, registrarAposta } from './carteira.mjs';
import { CONF, CUR, MOEDA, aplicarClima, sortearPool, rng, sortearClima, simular } from './motor.mjs';
import { tiposDaPool } from '../../engine/engine.mjs';
/* A árvore de sementes não passa pela ligação do motor: ela não depende de
   ContentPack nenhum. É infraestrutura, como o DOM. */
import { derivar, novaRaiz, sementes } from '../../engine/seed.mjs';
import { passivoVazio } from '../../engine/exposicao.mjs';
import { abrirRodada, revelar } from '../../engine/commit.mjs';
import { emitir } from './telemetria.mjs';
import { S } from './estado.mjs';
import { coreo, enfeite, semearVisual } from './sorte.mjs';
import { arenaDaRodada } from './arenas.mjs';
import { buildEntities, overlay, preloadSheets, selRing } from './rodada.mjs';
import { buildPickList, computeOdds, refreshOddsTable } from './odds.mjs';
import { bursts, fxs, sched, shots } from './efeitos.mjs';
import { conferirAbates, conferirColocacao, limparPodio, mostrarPodio, renderKillfeed, renderPodio, resetKillfeed } from './killfeed.mjs';
import { darXP, recordBetPlaced, recordBetResult, saveProfile, tituloDe } from './perfil.mjs';
import { ensureDaily, progDesafio } from './desafios.mjs';
import { entryRings, puffs } from './render.mjs';
import { hideWeatherBadge, initWeatherFx, showWeatherBadge } from './clima.mjs';
import { imgTag } from './sprites.mjs';
import { music, sfx } from './audio.mjs';
import { posSelRing, reiniciarMovimento } from './coreografia.mjs';
import { atualizarSaldo } from './controles.mjs';
import { creditarRecompensa, pagarAposta, perderAposta } from './banco.mjs';
import { updatePlate } from './eventos.mjs';
import { placeBet } from './aposta.mjs';
import { renderBattleBanner } from './banner.mjs';
import { atualizarEu, atualizarFase, relogio } from './faixa.mjs';
import { renderMeuLutador } from './meu-lutador.mjs';
import { margemConfigurada } from './adm.mjs';
import { colocacaoDe, ordemDeQuedas } from './colocacao.mjs';

/* ------------------------- FASES ------------------------- */
function setPhase(s){
  S.state = s; S.clock = 0;
  /* A fase é declarada num lugar só, na faixa fixa. Antes o jogador tinha de
     sintetizá-la de quatro pistas espalhadas e contraditórias — ver L-029. */
  atualizarFase();
  relogio();
  renderMeuLutador();   // a zona de ação troca de modo junto com a fase
  refreshOddsTable();   // e a lista de lutadores também
  /* Controle morto não fica na tela ligado. Durante a luta não há rodada para
     iniciar, e um botão aceso sugerindo que há é o mesmo tipo de contradição
     que fazia a fase ter quatro pistas discordantes (L-029). */
  const iniciar = $('#btnStart');
  if (iniciar) iniciar.disabled = (s === 'countdown' || s === 'fighting');
}

/* newRound() é assíncrona (espera o Monte Carlo). Sem essa trava, o
   frame() dispara ela de novo a cada tick enquanto `clock` continuar
   subindo em 'result' — e como `state` só muda pra 'betting' quando o
   computeOdds() da PRIMEIRA chamada finalmente resolve, dá pra empilhar
   dezenas de chamadas concorrentes, cada uma pisando no `fighters`/
   `ents` global da outra. Foi isso que causou o raio negativo esporádico
   no anel do vencedor: `ents` e `fighters` ficavam temporariamente
   dessincronizados no meio da troca. */
let roundPending = false;
async function newRound(){
  if (roundPending) return;
  roundPending = true;
  S.champ = -1; S.evPtr = 0; S.battleT = 0; S.myBet = null; S.released = false;
  shots.length = 0; bursts.length = 0; puffs.length = 0;
  fxs.length = 0; sched.length = 0; S.shake = 0; entryRings.length = 0;
  $('#arena').style.transform = '';
  $('#betInfo').innerHTML = 'Escolha um lutador na arena durante a fase de apostas.';
  hideWeatherBadge();
  initWeatherFx(null);   // sem efeito nenhum até o clima ser revelado em startFight()
  $('#stormBadge').classList.remove('show');
  $('#koToast').classList.remove('show');   // aviso de KO da rodada anterior
  $('#streakToast').className = '';         // aviso de killstreak da anterior
  limparPodio();

  // O clima já é sorteado agora — mas em segredo: nada de badge, efeito
  // visual ou bônus de stat ainda (isso só acontece em startFight, depois
  // que as apostas fecham). A única pegada dele aqui é garantir que a
  // pool sorteada tenha pelo menos 1 lutador do tipo favorecido — ex.:
  // Sol Forte garante 1 Pokémon de Fogo na pool — sem revelar ao
  // apostador qual clima é nem que a garantia existe.
  /* --- A RAIZ DA RODADA (Spec §P3) ---------------------------------
     Um número, e a rodada inteira sai dele: clima, elenco, preço, layout,
     ordem de entrada e batalha. Antes do F0.5 eram cinco Math.random
     soltos, e nada disso era reconstituível — nem por quem escreveu o
     jogo. Guardar `S.seeds.raiz` é guardar a rodada.

     A raiz vem do CSPRNG (ver engine/seed.mjs). É a única coisa aqui que
     não pode ser previsível: quem adivinha a raiz sabe o vencedor antes
     de a aposta abrir.                                              */
  S.seeds = sementes(novaRaiz());
  /* --- COMMIT-REVEAL (Spec §4.5) ------------------------------------
     O compromisso é publicado AGORA, antes de qualquer aposta. A raiz e o
     sal só saem depois que a rodada acaba. É o que permite a alguém
     conferir que o resultado já estava decidido — sem precisar confiar. */
  const rodada = await abrirRodada(S.seeds.raiz);
  S.commit = rodada.publico;
  S.segredoRodada = rodada.segredo;

  /* --- A POOL VEM PRIMEIRO, E O CLIMA DEPOIS (F0.11) -----------------
     Era o contrário: sorteava-se o clima e a pool era obrigada a conter
     um lutador do tipo favorecido. A garantia vazava — ver um único
     lutador de Gelo entre 12 é evidência de Nevasca, e o clima só devia
     ser conhecido depois que as apostas fecham. Invertida a ordem, a
     pool não sabe do clima e não tem o que vazar; a garantia continua
     valendo porque o clima é sorteado só entre os que a pool suporta. */
  S.fighters = sortearPool(S.seeds.elenco);
  S.weather = sortearClima(S.seeds.ambiente, tiposDaPool(S.fighters));

  /* A ARENA, AO CONTRÁRIO DO CLIMA, É ANUNCIADA DE CARA.
     Ela sai do ramo `visual` (§P3) e não dá bônus nenhum: esconder um cenário
     que não muda preço só tiraria da tela informação inócua. O clima continua
     em segredo até `startFight`, porque aquele mexe em stat. */
  arenaDaRodada(S.seeds.visual);

  overlay.classList.remove('hide');
  overlay.innerHTML = `<div class="banner">calculando odds…</div>`;

  // As odds saem SEM o clima — o Monte Carlo roda sobre os stats crus,
  // sem o bônus climático (mesmo o clima já estando sorteado em segredo
  // acima). Ele só é revelado depois que as apostas fecham (ver
  // startFight). É de propósito: ninguém aposta sabendo do bônus
  // climático de antemão.
  S.odds = await computeOdds(S.fighters, CONF.SIMS, undefined, S.seeds.raiz, margemConfigurada());
  /* Passivo zerado a cada rodada: o teto do §4.4.6 é POR RODADA. */
  S.passivo = passivoVazio(S.odds, CONF);

  semearVisual(S.seeds.visual); reiniciarMovimento();
  buildEntities(S.seeds.visual);

  preloadSheets();
  refreshOddsTable();
  S.ents.forEach(updatePlate);
  resetKillfeed();          // placar zerado com a pool nova
  atualizarEu();            // avatar e nível na faixa
  renderBattleBanner();     // vitrine do jogador no perfil

  log(`<span class="l-sys">&gt; nova rodada · commit ${S.commit.commit.slice(0,16)}… · 12 sorteados de 76</span>`);
  emitir('round_viewed', { commit: S.commit.commit });

  /* O OVERLAY NÃO REPETE MAIS A LISTA. Ele mostrava oito dos doze lutadores,
     por cima da arena e sem dizer que faltavam quatro, enquanto a lista
     completa ficava ao lado sem ser clicável — a mais visível não era a
     acionável. Agora ele só diz o que fazer, e some rápido. */
  /* UMA instrução, e ela aponta para onde a lista de fato está. Havia duas
     frases discordantes: o painel dizia "escolha na arena", o canvas dizia
     "escolha na lista →" — e em uma coluna a seta apontava para o lado errado. */
  overlay.innerHTML = `<div class="banner">Escolha seu lutador na lista de odds</div>`;
  $('#pickList').addEventListener('click', ev => {
    const row = ev.target.closest('.pick'); if (!row) return;
    placeBet(+row.dataset.i, row);
  });
  setPhase('betting');
  roundPending = false;
}

/* Destaca em TODO lugar o lutador em que você apostou: a placa no HUD
   (contorno dourado + pokébola), o próprio bicho na arena (brilho) e o
   anel dourado no chão. Roda a cada aposta — inclusive na troca, que
   precisa apagar a marcação anterior. */
function startFight(){
  /* D-008 · A APOSTA SÓ ENTRA NA ESTATÍSTICA AGORA, quando a janela fecha.
     Era contada a cada clique: trocar de lutador três vezes contava três
     apostas e triplicava o total apostado no perfil. Com o cancelamento do
     V1.15 ficaria pior — contaria aposta que o jogador desfez. O defeito é
     nosso e veio do v0.8; a v1.0 do porte já o tinha corrigido assim. */
  if (S.myBet) recordBetPlaced(S.myBet.amount, S.fighters[S.myBet.idx]);

  setPhase('countdown');
  overlay.innerHTML = `<div id="count">3</div>`;

  // O clima já foi sorteado em segredo lá em newRound() — só pra garantir
  // 1 lutador do tipo certo na pool. A revelação de verdade (badge, efeito
  // visual, bônus nos stats) e a batalha DE VERDADE só nascem agora,
  // depois que as apostas fecharam — é o que garante que as odds
  // mostradas na fase anterior não conheciam o bônus climático.
  initWeatherFx(S.weather);
  const battleFighters = aplicarClima(S.fighters, S.weather);
  const seed = S.seeds.batalha;
  S.battle = simular(battleFighters, seed, true);
  S.battle.seed = seed; S.battle.stormWarned = false;
  /* Fluxo visual próprio para a luta, derivado do ramo visual — a mesma raiz
     reproduz a coreografia, e ela continua independente da batalha. */
  semearVisual(derivar(S.seeds.visual, 'luta')); reiniciarMovimento();

  S.evPtr = 0; S.battleT = 0;
  S.ents.forEach(e => { e.atkQueue = []; e.atkPtr = 0; });
  // dá a cada lutador a lista dos ataques que ELE vai desferir, com hora
  // marcada. É o que a coreografia consulta para se posicionar antes.
  for (const ev of S.battle.events){
    if (ev.storm || ev.streak) continue;   // não são ataques: não entram na coreografia
    S.ents[ev.a].atkQueue.push({ t: ev.t, d: ev.d,
                               melee: S.fighters[ev.a].moves[ev.m].fx === 'melee' });
  }

  showWeatherBadge(S.weather);
  log(`<span class="l-sys">&gt; ${S.weather.emoji} clima revelado: <b>${S.weather.name}</b> — ${S.weather.desc}</span>`);
  log(`<span class="l-sys">&gt; combate sorteado · duração prevista ${S.battle.duration.toFixed(1)}s</span>`);
  emitir('battle_started');

  music(true);
}

/* Entrada UM DE CADA VEZ (não os 12 juntos): pra cada lutador, primeiro
   aparece o anel+brilho no chão (telegrafo), e só depois — com a bola
   ainda fechada até esse instante — ela abre com o clarão de sempre.
   A ordem é embaralhada com o fluxo de coreografia, então
   o "show" de entrada também é reproduzível igual ao resto da batalha,
   mesmo sendo puramente cosmético e não afetar quem vence.            */
const ENTRY = { RING_LEAD: 0.35, STAGGER: 0.18 };
function entryTotalTime(n){ return (n-1) * ENTRY.STAGGER + ENTRY.RING_LEAD + 0.5; }

/* --- L-005 ---------------------------------------------------------------
   A entrada era agendada com setTimeout, ou seja, em tempo de parede. A fase
   avança por `S.clock`, que soma o delta do requestAnimationFrame limitado a
   0,05 s por quadro. As duas fontes andam juntas enquanto o navegador entrega
   60 quadros por segundo — e separam no instante em que ele estrangula a aba,
   que é justamente quando alguém deixa o jogo em segundo plano.

   O sintoma era a pokébola abrindo antes de o relógio da fase chegar lá: a
   animação terminava e o jogo continuava em contagem.

   Agora a entrada é uma fila consumida pelo mesmo `S.clock` que decide o fim
   da contagem. Uma fonte de tempo só. */
const filaEntrada = [];   // {t: segundos após o início da entrada, fn}

function releaseAll(){
  S.released = true;
  filaEntrada.length = 0;
  const order = S.ents.slice();
  for (let i=order.length-1;i>0;i--){ const j=(coreo()*(i+1))|0; [order[i],order[j]]=[order[j],order[i]]; }

  order.forEach((e, i) => {
    const delayRing = i * ENTRY.STAGGER;
    filaEntrada.push({ t: delayRing, fn: () => {
      entryRings.push({x:e.x, y:e.y, age:0, life:ENTRY.RING_LEAD});
      sfx('beep');
    }});
    filaEntrada.push({ t: delayRing + ENTRY.RING_LEAD, fn: () => {
      bursts.push({x:e.x, y:e.y-7, col:'#ffffff', r:20, life:.45, age:0, seed:enfeite()*6});
      e.el.classList.remove('ball');
      e.el.classList.add('opening');
    }});
    /* a classe `opening` dura o que a animação CSS dura, então essa é a única
       marcação que continua em tempo de parede — é o relógio do CSS. */
    filaEntrada.push({ t: delayRing + ENTRY.RING_LEAD + 0.46, fn: () => {
      e.el.classList.remove('opening');
    }});
  });

  log('<span class="l-sys">&gt; ⚔ AS POKÉBOLAS COMEÇAM A ABRIR, UMA A UMA — VALENDO!</span>');
}

/* Consome a fila de entrada contra o relógio da fase. `desde` é o instante em
   que a entrada começou, em `S.clock`. */
function passoEntrada(desde){
  if (!filaEntrada.length) return;
  const t = S.clock - desde;
  for (let i = filaEntrada.length - 1; i >= 0; i--)
    if (filaEntrada[i].t <= t){ const f = filaEntrada[i].fn; filaEntrada.splice(i,1); f(); }
}

/* Frases de incentivo na derrota — sorteadas pra não repetir a mesma
   linha toda rodada e cansar rápido. */
const CHEER_LINES = [
  'Boa sorte na próxima, treinador!',
  'Todo campeão já perdeu uma. Bora de novo!',
  'A próxima pokébola pode ser a certa.',
  'Foi por pouco. Recupera na próxima rodada!',
  'Treinador de verdade levanta e volta pra arena.',
];

/* Colocação do lutador na rodada, lida da ordem de eliminação: o
   primeiro a cair é o 12º, o último a cair é o 2º, quem sobra é o 1º.
   É o que dá o "desempenho" do XP — assim quem escolheu bem e foi
   longe ganha mais do que quem caiu de cara, mesmo os dois perdendo. */
/* A posição final sai da MESMA travessia que alimenta o quadro ao vivo
   (`colocacao.mjs`). Havia aqui uma segunda cópia do laço.
   
   Ela não estava errada — conferido: o evento de killstreak do nosso motor é
   `{t, streak, a, lvl, kind, dur, mult}`, sem `ko` e sem `d`, então a cópia
   daqui nunca contou um anúncio de sequência como queda. O problema era ser
   uma cópia: duas travessias do mesmo dado divergem no dia em que o formato do
   evento mudar, e a que estiver errada será a que ninguém olha. A versão única
   ainda protege explicitamente contra os dois casos (`streak` e queda
   repetida), em vez de depender do formato continuar como está. */
function posicaoFinal(idx){
  if (idx === S.champ) return 1;
  const pos = colocacaoDe(idx, ordemDeQuedas(S.battle.events), S.fighters.length);
  return pos === null ? 2 : pos;             // sobreviveu ao tempo, mas não venceu
}

/* O desafio de variedade não é incremental: ele conta quantos Pokémon
   DIFERENTES entraram nas suas apostas hoje, então é recalculado da
   lista em vez de somar +1 por rodada. */
function atualizaVariedade(){
  const d = ensureDaily();
  const n = (d.mons || []).length;
  for (const c of d.lista){
    if (c.id !== 'variedade' || c.feito) continue;
    c.prog = Math.min(c.meta, n);
    if (c.prog >= c.meta && !c.pago){
      c.feito = true; c.pago = true;
      S.profile.xp += c.xp; creditarRecompensa('CHALLENGE_REWARD', c.dia, 'desafio:' + c.id); atualizarSaldo();
      emitir('challenge_completed', { desafio: c.id });
      S.profile.dailyDone = (S.profile.dailyDone || 0) + 1;
    }
  }
  saveProfile(S.profile);
}

/* Bloco de XP do fim de rodada: barra, de onde veio cada ponto, aviso
   de nível novo e desafios concluídos naquela rodada. Aparece igual na
   vitória e na derrota — é justamente o ponto do sistema: perder
   também move a barra. */
function blocoXP(info, feitos){
  if (!info) return '';
  const p = info.depois;
  const larguraAntes = info.subiu ? 0 : info.antes.pct;
  const linhas = info.partes.map(x => `<li>${x.n}<b>+${x.xp}</b></li>`).join('');
  const desafios = (feitos && feitos.length)
    ? `<div class="dailydone">${feitos.map(c =>
        `✅ <b>${c.txt}</b> — +${c.xp} XP e +${CUR} ${c.dia}`).join('<br>')}</div>` : '';
  return `
    <div class="xpbox">
      <div class="xphead">
        <span>Nv. <b>${p.nivel}</b> · ${tituloDe(p.nivel)}</span>
        <span class="gain">+${info.total} XP</span>
      </div>
      <div class="xpbar"><i style="width:${larguraAntes.toFixed(1)}%"
        data-to="${p.pct.toFixed(1)}"></i></div>
      <div class="xpsub">${p.atual} / ${p.fim - p.ini} XP para o nível ${p.nivel+1}</div>
      ${info.subiu ? `<div class="lvlup">⬆️ SUBIU PARA O NÍVEL ${p.nivel}! — ${tituloDe(p.nivel)}</div>` : ''}
      <ul class="xplist">${linhas}</ul>
      ${desafios}
    </div>`;
}

/* a barra só anima depois de entrar na tela, senão o CSS não vê a
   transição (largura inicial e final no mesmo frame) */
function animaXP(){
  const b = document.querySelector('.xpbar i');
  if (!b) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    b.style.width = b.dataset.to + '%';
  }));
}

function finish(){
  S.champ = S.battle.winner;
  setPhase('result');
  // o loop de balões só roda na fase 'fighting'; sem isso o último
  // ataque fica com o balão travado na tela até a rodada seguinte
  S.ents.forEach(e => { e.bub.classList.remove('on'); e.bubbleUntil = -1; });
  const f = S.fighters[S.champ];
  log(`<span class="l-win">🏆 ${f.n} venceu a rodada!</span>`);
  // som coerente com o SEU resultado: jingle só quando não é derrota
  music(false); sfx(S.myBet && S.myBet.idx !== S.champ ? 'ko' : 'win');

  /* ---- XP e desafios: só valem se você entrou na rodada ----
     `minhaPos` é declarada AQUI, no escopo da função, e não dentro do
     if abaixo. Foi exatamente esse o bug da v0.7: a colocação estava
     num `const` dentro do bloco, e o ramo de derrota — que é outro
     bloco — tentava lê-la. Dava ReferenceError bem no meio do finish(),
     antes de desenhar o overlay: o resultado é que a tela de campeão e
     a de K.O. nunca apareciam e a derrota não era gravada no histórico,
     porque a função morria antes de chegar lá. */
  let xpInfo = null, feitos = [], minhaPos = 0;
  /* O try existe por causa da lição acima: XP e desafios são o EXTRA da
     rodada; a tela de resultado e o registro no histórico são o
     essencial. Antes, um erro no extra derrubava o essencial junto. Se
     algo falhar aqui, o jogador ainda vê quem venceu e quanto ganhou ou
     perdeu — e o erro vai pro console em vez de sumir em silêncio. */
  try {
  if (S.myBet){
    const venceu = S.myBet.idx === S.champ;
    // colocação: quantos dos 12 ele sobreviveu (1º = 12 posições)
    const pos = minhaPos = posicaoFinal(S.myBet.idx);
    const sobrevividos = 12 - pos;                    // 0..11
    const partes = [{ n:'Rodada disputada', xp:10 }];
    if (venceu) partes.push({ n:'Vitória', xp:25 });
    const desemp = Math.round((sobrevividos / 11) * 15);
    if (desemp > 0) partes.push({ n:`Desempenho (${pos}º lugar)`, xp:desemp });
    if (S.myBet.odd >= 4 && pos <= 6) partes.push({ n:'Azarão que foi longe', xp:5 });
    xpInfo = darXP(partes);

    // desafios
    feitos = feitos.concat(progDesafio('rodadas', 1));
    if (venceu) feitos = feitos.concat(progDesafio('vitorias', 1));
    if (pos <= 3) feitos = feitos.concat(progDesafio('sobrevive', 1));
    if (S.weather && S.weather.type) feitos = feitos.concat(progDesafio('clima', 1));
    for (const t of S.fighters[S.myBet.idx].types) feitos = feitos.concat(progDesafio('tipo', 1, t));
    if (S.myBet.odd >= 4) feitos = feitos.concat(progDesafio('azarao', 1));
    // "derrote X de tipo Y": conta os abates que o SEU lutador fez
    const abates = S.battle.events.filter(e => !e.storm && !e.streak && e.ko && e.a === S.myBet.idx);
    for (const ab of abates)
      for (const t of S.fighters[ab.d].types) feitos = feitos.concat(progDesafio('derrote', 1, t));
    // variedade: quantos Pokémon distintos já foram apostados hoje
    atualizaVariedade();
    if (xpInfo.subiu) sfx('levelup');
  }
  } catch(err){
    console.error('falha ao apurar XP/desafios desta rodada:', err);
  }

  // confere o placar de abates contra o registro da simulação e fecha
  // a rodada com o pódio dos três que mais abateram
  conferirAbates();
  conferirColocacao();   // mesma conferência, para a colocação
  renderBattleBanner();  // vitória/derrota no banner, já com a colocação fechada
  mostrarPodio();
  /* §4.7: o desfecho da rodada e o do SEU palpite são eventos diferentes.
     `player_pick_ko` é o que permite medir frustração sem perguntar nada. */
  emitir('battle_completed', { campeao: S.fighters[S.champ]?.n ?? null,
                               duracao: +(S.battle?.duration ?? 0).toFixed(2) });
  if (S.myBet) emitir('player_pick_ko', { acertou: S.myBet.idx === S.champ });
  else emitir('bet_skipped');
  emitir('result_viewed');
  /* REVEAL (§4.5): a raiz e o sal saem só agora, com a rodada encerrada. */
  if (S.segredoRodada) S.reveal = revelar(S.segredoRodada);

  overlay.classList.remove('hide');

  if (S.myBet && S.myBet.idx === S.champ){
    /* ---------- VITÓRIA ---------- */
    const win = Math.floor(S.myBet.amount * S.myBet.odd);
    const lucro = win - S.myBet.amount;
    /* Payout herda a origem da stake (§5.5): o que foi apostado em bônus volta
       como bônus. É isto que impede a Arena de virar conversor de bônus
       gratuito em saldo transferível. */
    pagarAposta(S.myBet.composicao, S.myBet.odd, 'aposta'); atualizarSaldo();
    recordBetResult(true, S.myBet.amount, win, f);
    $('#betInfo').innerHTML = `<b style="color:var(--green)">Ganhou ${CUR} ${win.toLocaleString('pt-BR')}!</b> (${emReais(win)})`;
    registrarAposta({t:Date.now(), mon:f.n, amount:S.myBet.amount, odd:S.myBet.odd,
                     won:true, payout:win, pos:1});
    log(`<span class="l-win">💵 +${win.toLocaleString('pt-BR')} ${MOEDA} (x${S.myBet.odd.toFixed(2)}) — lucro de ${lucro.toLocaleString('pt-BR')}!</span>`);

    overlay.innerHTML = `<div id="winBox" class="win">
        <div class="trophy">🏆</div>
        <div class="moneybag">💰</div>
        ${imgTag(f)}
        <div class="banner" style="margin-top:8px">${f.n} venceu!</div>
        <div class="payout">+${CUR} ${win.toLocaleString('pt-BR')}
          <small>x${S.myBet.odd.toFixed(2)} · lucro de ${lucro.toLocaleString('pt-BR')} ${MOEDA} (${emReais(lucro)})</small>
        </div>
        ${blocoXP(xpInfo, feitos)}
      </div>`;
    dropConfetti($('#winBox')); animaXP();

  } else if (S.myBet){
    /* ---------- DERROTA ---------- */
    /* A stake perdida sai do RESERVADO e não volta para disponível. Antes do
       F0.9 ela já tinha sido debitada do saldo na hora da aposta e ninguém
       fechava o lançamento — o dinheiro simplesmente sumia do ledger. */
    perderAposta(S.myBet.composicao, 'aposta'); atualizarSaldo();
    // mostra o SEU lutador caído, não o vencedor: o que interessa aqui
    // é "o que aconteceu com o meu", e o vencedor vira só uma linha.
    const meu = S.fighters[S.myBet.idx];
    recordBetResult(false, S.myBet.amount, 0, meu);
    $('#betInfo').innerHTML = `<b style="color:var(--red)">Perdeu ${CUR} ${S.myBet.amount.toLocaleString('pt-BR')}.</b>`;
    registrarAposta({t:Date.now(), mon:meu.n, amount:S.myBet.amount, odd:S.myBet.odd,
                     won:false, payout:0, pos:minhaPos});
    log(`<span class="l-ko">💸 −${S.myBet.amount.toLocaleString('pt-BR')} ${MOEDA} · você tinha ${meu.n}</span>`);

    const cheer = CHEER_LINES[(enfeite()*CHEER_LINES.length)|0];
    overlay.innerHTML = `<div id="winBox" class="lose">
        ${imgTag(meu)}
        <div class="kostamp">K.O.</div>
        <div class="banner" style="margin-top:8px">${f.n} venceu a rodada</div>
        <div class="loss">−${CUR} ${S.myBet.amount.toLocaleString('pt-BR')}
          <small>você tinha ${meu.n}</small>
        </div>
        <div class="cheer">${cheer}</div>
        ${blocoXP(xpInfo, feitos)}
      </div>`;
    animaXP();

  } else {
    /* ---------- SEM APOSTA (só assistindo) ---------- */
    overlay.innerHTML = `<div id="winBox" class="win">
        <div class="trophy">🏆</div>
        ${imgTag(f)}
        <div class="banner" style="margin-top:8px">${f.n} venceu!</div>
        <div class="neutral">Você não apostou nesta rodada.</div>
      </div>`;
    dropConfetti($('#winBox'));
  }
  refreshOddsTable();
}

/* Confete: 10 tiras coloridas geradas na hora, com atraso e posição
   aleatórios, que se removem sozinhas ao fim da animação. Em CSS puro
   ficariam todas idênticas e caindo juntas — é a variação que vende a
   ideia de "explosão". */
const CONFETTI_COLORS = ['#f5c542','#46c96a','#e5484d','#63d7ff','#c77dff','#ff9f4a'];
function dropConfetti(box){
  if (!box) return;
  for (let i=0;i<10;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = (6 + enfeite()*88) + '%';
    c.style.background = CONFETTI_COLORS[(enfeite()*CONFETTI_COLORS.length)|0];
    c.style.animationDelay = (enfeite()*0.45).toFixed(2) + 's';
    c.style.animationDuration = (1.2 + enfeite()*0.7).toFixed(2) + 's';
    box.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

export {
  entryTotalTime,
  finish,
  newRound,
  passoEntrada,
  releaseAll,
  setPhase,
  startFight,
};
