/* Fases — apostas, contagem, batalha, resultado.
 *
 * Fronteira: é a máquina de estados da rodada, e o único lugar que muda
 * S.state. Chama todo o resto; por isso é a camada mais alta antes do laço. */

import { $, log } from './dom.mjs';
import { registrarAposta } from './carteira.mjs';
import { CONF, CUR, MOEDA, aplicarClima, sortearPool, rng, sortearClima, simular } from './motor.mjs';
import { tiposDaPool } from '../../engine/engine.mjs';
/* A árvore de sementes não passa pela ligação do motor: ela não depende de
   ContentPack nenhum. É infraestrutura, como o DOM. */
import { derivar, novaRaiz, sementes } from '../../engine/seed.mjs';
import { passivoVazio } from '../../engine/exposicao.mjs';
import { resultadoDaAposta, rotuloLiquido } from '../../engine/resultado.mjs';
import { abrirRodada, revelar } from '../../engine/commit.mjs';
import { emitir } from './telemetria.mjs';
import { S } from './estado.mjs';
import { modoServidor, hidratar } from './banco.mjs';
import { arvoreConferida, esperarAbertura, oddsDoServidor, rodadaViva } from './modo-servidor.mjs';
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
import { atualizarCTA, placeBet } from './aposta.mjs';
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
  /* A grade de vida dorme na aposta e acorda quando a luta começa (L-030,
     item 2). Aqui e não em `startFight` porque `setPhase` é o único lugar que
     conhece TODAS as transições — inclusive a volta para 'betting'. */
  $('#hud')?.classList.toggle('dormindo', s === 'betting');
  /* Em coluna única a ORDEM dos blocos muda com a fase: na aposta a lista vem
     primeiro (é a única ação da tela), na luta a arena volta para cima. Ver a
     nota longa no CSS — em 420 px a lista ficava fora da dobra. */
  document.querySelector('.app')?.classList.toggle('luta', s === 'fighting' || s === 'result');
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
  /* UMA instrução, e ela aponta para onde a lista de fato está — ver
     `atualizarCTA` em aposta.mjs, que é quem manda no que a arena diz. */
  /* SEM DIREÇÃO NO TEXTO. "ao lado" é verdade em três das quatro larguras: em
     420 px a lista desce para baixo do canvas, e a instrução passa a apontar
     para o lugar errado. É o mesmo defeito que o V1.16 removeu da seta do
     overlay, voltando pela porta do texto. */
  $('#betInfo').innerHTML = 'Escolha um lutador na lista para entrar na rodada.';
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
  /* ── MODO SERVIDOR: A RODADA VEM DA SALA (F1.14) ───────────────────
   *
   * A bifurcação é UMA, e fica aqui. Espalhar `if (modoServidor())` pelo
   * corpo da função criaria caminhos meio-migrados — o defeito que este
   * bloco inteiro existe para não ter.
   *
   * O que muda entre os dois modos é só a ORIGEM dos números. Depois
   * deste bloco, o resto de `newRound` é idêntico: mesma pool, mesma
   * arena, mesma tabela de odds, mesmo desenho.
   *
   * A ESPERA NÃO TEM SAÍDA DE EMERGÊNCIA. `esperarAbertura()` espera
   * para sempre se for preciso, e é de propósito: cair para o sorteio
   * local quando a rede some é o primeiro item da sabotagem declarada
   * do bloco. Quem conta isso ao jogador é a tela de conexão. */
  if (modoServidor()) {
    const r = await esperarAbertura();
    S.rodadaId = r.id;
    S.commit = { commit: r.commit };
    /* O SEGREDO É DO SERVIDOR. Guardar `null` e não um objeto vazio: quem
       tentar revelar do cliente falha alto em vez de publicar nada. */
    S.segredoRodada = null;
    /* ÁRVORE PARCIAL, e a ausência é a garantia. Só os dois ramos
       cosméticos chegam com a janela aberta; `ambiente` e `batalha` só
       existem depois do fechamento, quando a raiz é revelada. Um `S.seeds`
       completo aqui seria o cliente sabendo o clima antes da hora. */
    S.seeds = { elenco: r.sementeElenco, visual: r.sementeVisual };
    S.fighters = sortearPool(S.seeds.elenco);
    S.weather = null;
    S.odds = oddsDoServidor(r);
    S.travaEm = r.travaEm;
    S.passivo = passivoVazio(S.odds, CONF);
    overlay.classList.remove('hide');
    overlay.innerHTML = `<div class="banner"></div>`;
    return montarCena();
  }

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

  return montarCena();
}

/* ── A CENA, QUE É IGUAL NOS DOIS MODOS ─────────────────────────────────────
 *
 * Extraída no F1.14. O que difere entre jogar sozinho e jogar contra o
 * servidor é só a ORIGEM dos números — pool, odds, arena, commit. Depois que
 * eles existem, montar a tela é a mesma coisa, e ter duas cópias disto era o
 * jeito mais rápido de as duas divergirem sem ninguém notar.
 */
function montarCena(){
  /* A ARENA, AO CONTRÁRIO DO CLIMA, É ANUNCIADA DE CARA.
     Ela sai do ramo `visual` (§P3) e não dá bônus nenhum: esconder um cenário
     que não muda preço só tiraria da tela informação inócua. O clima continua
     em segredo até `startFight`, porque aquele mexe em stat.

     MORAVA NOS DOIS CAMINHOS, e virou uma chamada só no F1.14 — montar a arena
     é montar a cena. A duplicata também deixava a âncora do defeito S78
     ambígua, que é o pré-voo avisando que havia duas fontes para a mesma
     decisão. */
  arenaDaRodada(S.seeds.visual);

  semearVisual(S.seeds.visual); reiniciarMovimento();
  buildEntities(S.seeds.visual);

  preloadSheets();
  refreshOddsTable();
  S.ents.forEach(updatePlate);
  resetKillfeed();          // placar zerado com a pool nova
  atualizarEu();            // avatar e nível na faixa
  renderBattleBanner();     // vitrine do jogador no perfil

  /* O TICKER TEM DUAS LINHAS E A FRASE NÃO CABIA. Saía "· 12 sorteados de" e
     acabava ali, sem elipse e sem fim — frase truncada lê como defeito. O hash
     de commit inteiro também não é para o apostador: ele existe para auditar
     (§4.5), e a tela de Regras é que explica como. Oito dígitos bastam para
     conferir, e a ordem inverte para o que muda primeiro ficar visível. */
  log(`<span class="l-sys">&gt; nova rodada · 12 de 76 lutadores · commit ${S.commit.commit.slice(0,8)}</span>`);
  emitir('round_viewed', { commit: S.commit.commit });

  /* O OVERLAY NÃO REPETE MAIS A LISTA. Ele mostrava oito dos doze lutadores,
     por cima da arena e sem dizer que faltavam quatro, enquanto a lista
     completa ficava ao lado sem ser clicável — a mais visível não era a
     acionável. Agora ele só diz o que fazer, e some rápido. */
  /* UMA instrução, e ela aponta para onde a lista de fato está. Havia duas
     frases discordantes: o painel dizia "escolha na arena", o canvas dizia
     "escolha na lista →" — e em uma coluna a seta apontava para o lado errado. */
  overlay.innerHTML = '<div class="banner"></div>';
  setPhase('betting');          // antes do CTA: ele lê S.state
  atualizarCTA();
  $('#pickList').addEventListener('click', ev => {
    const row = ev.target.closest('.pick'); if (!row) return;
    placeBet(+row.dataset.i, row);
  });
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

  /* ── MODO SERVIDOR: A ÁRVORE SÓ FICA COMPLETA AGORA (F1.14) ─────────
   *
   * Durante a janela, `S.seeds` tinha só os dois ramos cosméticos — é o
   * §4.5 valendo: o cliente não pode conhecer o clima nem a batalha antes
   * de as apostas fecharem. O reveal chega junto com a fase `travada`, e
   * é aqui que a árvore inteira nasce.
   *
   * O CLIENTE CONFERE O QUE JÁ TINHA. Se a raiz revelada não reproduzir a
   * mesma semente de elenco que ele usou para desenhar a pool, o servidor
   * mostrou uma rodada e jogou outra — e essa é a única hora em que dá
   * para perceber. Falhar alto aqui é melhor que animar uma luta que não
   * corresponde ao que foi apostado. */
  if (modoServidor()) {
    const r = rodadaViva();
    const raiz = r?.revelado?.raiz;
    if (!raiz) { log('<span class="l-sys">&gt; aguardando o servidor revelar a rodada…</span>'); return; }
    /* A CONFERÊNCIA MORA NO `modo-servidor.mjs` — ver o comentário de lá.
       Aqui só se decide o que o jogador vê quando ela falha. */
    const completa = arvoreConferida(raiz, S.seeds.elenco);
    if (!completa) {
      log('<span class="l-sys">&gt; a rodada revelada não é a que foi mostrada — recarregue</span>');
      emitir('reveal_divergente', { commit: S.commit?.commit });
      return;
    }
    S.seeds = completa;
    S.weather = sortearClima(S.seeds.ambiente, tiposDaPool(S.fighters));
  }

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

export {
  entryTotalTime,
  newRound,
  passoEntrada,
  releaseAll,
  setPhase,
  startFight,
};
