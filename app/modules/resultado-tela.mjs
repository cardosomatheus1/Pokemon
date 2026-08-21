/* A TELA DE RESULTADO — quem venceu, quanto você fez, e o que ganhou (F1.14).
 *
 * Fronteira: desenha o fim da rodada. Não decide fase, não sorteia nada, não
 * fala com servidor — recebe o estado pronto e o traduz em tela.
 *
 * ── POR QUE ISTO SAIU DE `fases.mjs` ───────────────────────────────────────
 *
 * O `fases.mjs` é a máquina de estados da rodada: ele decide QUANDO cada coisa
 * acontece. A tela de resultado decide COMO uma delas aparece — XP, medalhas,
 * desafios, pódio, confete. São duas responsabilidades, e elas só estavam
 * juntas porque nasceram juntas.
 *
 * A conta de linhas do `test/modulos.mjs` foi o gatilho, e o teste diz a coisa
 * certa: **dividir por responsabilidade, não por tamanho.** O corte aqui é o
 * mesmo que alguém faria sem contar linha nenhuma.
 *
 * ── O `try` QUE PARECE MEDROSO E NÃO É ─────────────────────────────────────
 *
 * XP e desafios são o EXTRA da rodada; a tela de resultado e o registro no
 * histórico são o essencial. Na v0.7 um `ReferenceError` no extra derrubava o
 * essencial junto: a tela de campeão nunca aparecia e a derrota não era
 * gravada, porque a função morria antes de chegar lá.
 */
import { $, log } from './dom.mjs';
import { CUR, MOEDA } from './motor.mjs';
import { S } from './estado.mjs';
import { emitir } from './telemetria.mjs';
import { resultadoDaAposta, rotuloLiquido } from '../../engine/resultado.mjs';
import { modoServidor, hidratar } from './banco.mjs';
import { creditarRecompensa, pagarAposta, perderAposta } from './banco.mjs';
import { atualizarSaldo } from './controles.mjs';
import { overlay } from './rodada.mjs';
import { enfeite } from './sorte.mjs';
import { music, sfx } from './audio.mjs';
import { darXP, recordBetResult, saveProfile, tituloDe } from './perfil.mjs';
import { progDesafio } from './desafios.mjs';
import { conferirAbates, conferirColocacao, mostrarPodio } from './killfeed.mjs';
import { colocacaoDe, ordemDeQuedas } from './colocacao.mjs';
import { imgTag } from './sprites.mjs';
import { renderBattleBanner } from './banner.mjs';
import { refreshOddsTable } from './odds.mjs';
import { registrarAposta } from './carteira.mjs';
import { ensureDaily } from './desafios.mjs';
import { revelar } from '../../engine/commit.mjs';
import { setPhase } from './fases.mjs';

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

  /* ── MODO SERVIDOR: A CARTEIRA VOLTA DO SETTLEMENT (F1.14) ─────────
   *
   * O settlement é do servidor e já aconteceu — ele roda no relógio dele,
   * não no da animação. O cliente não credita nem debita nada: pede o
   * saldo e mostra.
   *
   * SEM `await`, de propósito. A tela de resultado desenha AGORA, com a
   * projeção que já existe, e o número se corrige quando a resposta
   * chegar. Esperar a rede para mostrar quem venceu deixaria a tela
   * parada em cima do momento mais esperado da rodada — e, sem rede,
   * parada para sempre. */
  if (modoServidor()) hidratar().then(atualizarSaldo);
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

  if (S.myBet){
    /* ── §28.5: A FESTA PERGUNTA AO RESULTADO ECONÔMICO, NÃO AO PALPITE ────
     *
     * Antes deste bloco a condição era `S.myBet.idx === S.champ` — "acertei o
     * campeão?". São perguntas diferentes, e é a diferença entre elas que o
     * §28.5 existe para nomear: com `floor(30 × 1,03)` o jogador acerta o
     * campeão, recebe os mesmos 30 de volta, e a tela soltava confete.
     *
     * A decisão sai de `resultadoDaAposta`, no motor, e não daqui. Há outras
     * três superfícies com a mesma pergunta — KillFeed, histórico e carteira —
     * e a quarta ainda vai ser escrita. */
    const acertou = S.myBet.idx === S.champ;
    const retorno = acertou ? Math.floor(S.myBet.amount * S.myBet.odd) : 0;
    const res = resultadoDaAposta({ aposta: S.myBet.amount, retorno });

    /* ── QUEM LIQUIDA, E É UM SÓ (F1.14) ─────────────────────────────
     *
     * Sozinho, o app liquida a própria aposta: o ledger local é a verdade e
     * estes dois lançamentos a fecham.
     *
     * Contra o servidor, ELE já liquidou — no relógio dele, e antes desta
     * animação terminar. Lançar aqui também seria o cliente virando uma
     * segunda fonte de dinheiro, que é precisamente o que este bloco existe
     * para eliminar. E o pior é que na maior parte das vezes os dois números
     * COINCIDIRIAM: o defeito só apareceria no dia em que divergissem, com o
     * jogador vendo um saldo que não é o dele.
     *
     * Foi assim que ele foi achado — o defeito plantado S259, que tira a
     * reidratação, passava numa execução e era pego na seguinte. A instabilidade
     * era o duplo lançamento acertando por acaso. */
    if (modoServidor()) {
      /* O saldo chega pelo `hidratar()` do fim desta função. Até ele voltar, a
         tela mostra a projeção de antes — e é por isso que ele não tem `await`:
         a tela de resultado desenha agora, e o número se corrige em seguida. */
    } else if (acertou){
      /* Payout herda a origem da stake (§5.5): o que foi apostado em bônus volta
         como bônus. É isto que impede a Arena de virar conversor de bônus
         gratuito em saldo transferível. */
      pagarAposta(S.myBet.composicao, S.myBet.odd, 'aposta');
    } else {
      /* A stake perdida sai do RESERVADO e não volta para disponível. Antes do
         F0.9 ela já tinha sido debitada do saldo na hora da aposta e ninguém
         fechava o lançamento — o dinheiro simplesmente sumia do ledger. */
      perderAposta(S.myBet.composicao, 'aposta');
    }
    atualizarSaldo();

    const alvo = acertou ? f : S.fighters[S.myBet.idx];
    recordBetResult(acertou, S.myBet.amount, retorno, alvo);
    registrarAposta({t:Date.now(), mon:alvo.n, amount:S.myBet.amount, odd:S.myBet.odd,
                     won:acertou, payout:retorno, pos: acertou ? 1 : minhaPos});

    /* O LÍQUIDO EM DESTAQUE E O BRUTO EM SEGUNDO PLANO, nesta ordem e em todos
       os três desfechos: "o valor exibido na tela de resultado é o líquido". */
    $('#betInfo').innerHTML = res.comemora
      ? `<b style="color:var(--green)">${rotuloLiquido(res.liquido)} ${MOEDA} no saldo.</b>`
      : `<b style="color:var(--red)">${rotuloLiquido(res.liquido)} ${MOEDA} no saldo.</b>`;

    if (res.comemora){
      /* ---------- GANHO ECONÔMICO — e só aqui há coreografia ---------- */
      log(`<span class="l-win">💵 ${rotuloLiquido(res.liquido)} ${MOEDA} (x${S.myBet.odd.toFixed(2)}) — retorno de ${retorno.toLocaleString('pt-BR')}</span>`);
      overlay.innerHTML = `<div id="winBox" class="win">
          <div class="trophy">🏆</div>
          <div class="moneybag">💰</div>
          ${imgTag(f)}
          <div class="banner" style="margin-top:8px">${f.n} venceu!</div>
          <div class="payout">${rotuloLiquido(res.liquido)} ${CUR}
            <small>retorno de ${CUR} ${retorno.toLocaleString('pt-BR')} sobre ${CUR} ${S.myBet.amount.toLocaleString('pt-BR')} · x${S.myBet.odd.toFixed(2)}</small>
          </div>
          ${blocoXP(xpInfo, feitos)}
        </div>`;
      dropConfetti($('#winBox'));

    } else if (acertou){
      /* ---------- ACERTOU E NÃO GANHOU ----------
       * O caso que não existia na tela e é a razão do §28.5. Sem festa, sem
       * "quase lá" — o §28.7 proíbe linguagem que sugira que o resultado é
       * influenciável —, e com o número que importa em destaque. */
      log(`<span class="l-ko">↩︎ ${rotuloLiquido(res.liquido)} ${MOEDA} · retorno igual ou menor que a aposta</span>`);
      /* MOLDURA PRÓPRIA, e não a da derrota. Reusar `lose` pintava o líquido
         zero de vermelho de perda — e zero não é perda, é o dinheiro de volta.
         Exagerar para o lado pessimista é errar do mesmo jeito. Ver L-037. */
      overlay.innerHTML = `<div id="winBox" class="devolvido">
          ${imgTag(f)}
          <div class="banner" style="margin-top:8px">${f.n} venceu!</div>
          <div class="liquido${res.liquido < 0 ? ' negativo' : ''}">${rotuloLiquido(res.liquido)} ${CUR}
            <small>Você apostou ${CUR} ${S.myBet.amount.toLocaleString('pt-BR')} e recebeu ${
              CUR} ${retorno.toLocaleString('pt-BR')} — ${
              res.desfecho === 'devolvido' ? 'o mesmo valor de volta'
                                           : 'menos do que apostou'}.</small>
          </div>
          ${blocoXP(xpInfo, feitos)}
        </div>`;

    } else {
      /* ---------- DERROTA ---------- */
      // mostra o SEU lutador caído, não o vencedor: o que interessa aqui
      // é "o que aconteceu com o meu", e o vencedor vira só uma linha.
      const meu = alvo;
      log(`<span class="l-ko">💸 ${rotuloLiquido(res.liquido)} ${MOEDA} · você tinha ${meu.n}</span>`);
      const cheer = CHEER_LINES[(enfeite()*CHEER_LINES.length)|0];
      overlay.innerHTML = `<div id="winBox" class="lose">
          ${imgTag(meu)}
          <div class="kostamp">K.O.</div>
          <div class="banner" style="margin-top:8px">${f.n} venceu a rodada</div>
          <div class="loss">${rotuloLiquido(res.liquido)} ${CUR}
            <small>você tinha ${meu.n}</small>
          </div>
          <div class="cheer">${cheer}</div>
          ${blocoXP(xpInfo, feitos)}
        </div>`;
    }
    animaXP();

  } else {
    /* ---------- SEM APOSTA (só assistindo) ---------- */
    overlay.innerHTML = `<div id="winBox" class="win">
        <div class="trophy">🏆</div>
        ${imgTag(f)}
        <div class="banner" style="margin-top:8px">${f.n} venceu!</div>
        <div class="neutral">Você não apostou nesta rodada.</div>
      </div>`;
    /* SEM CONFETE AQUI, e é decisão do F1.9. Quem não apostou não ganhou nada,
       e a festa depois de uma rodada pulada é o produto dizendo "você perdeu a
       festa" — que é a família de mensagem que o §28.7 proíbe. */
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

export { finish, posicaoFinal };
