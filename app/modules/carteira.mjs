/* Carteira — saldo, fichas de aposta, compra simulada e histórico.
 *
 * Fronteira: é o único módulo que escreve saldo. Em V1 vira a fachada do
 * ledger do servidor, e por isso todo acesso já passa por aqui. */

import { placeBet } from './aposta.mjs';
import { $ } from './dom.mjs';
import { CUR, MOEDA } from './motor.mjs';
import { S } from './estado.mjs';
import { alternarSom, music , somLigado } from './audio.mjs';
import { atualizarSaldo } from './controles.mjs';
import { APOSTA_MIN, creditarCompra, modoServidor, saldo, valorAposta } from './banco.mjs';
import { closeModal, openModal } from './navegacao.mjs';
import { newRound, startFight } from './fases.mjs';
import { saveProfile } from './perfil.mjs';
import { PACK } from './motor.mjs';
import { decompor, desenharCedula } from './cedula.mjs';
import { dexURL } from './sprites.mjs';

/* =====================================================================
   COMPRA DE POKÉCASH — SIMULAÇÃO
   ---------------------------------------------------------------------
   100% simulado: clicar credita na hora, sem cobrança nenhuma. Serve
   pra testar a régua de preços antes de existir gateway de verdade.
   ===================================================================== */
/* =====================================================================
   POKÉCASH — a moeda do jogo
   ---------------------------------------------------------------------
   Conversão direta e linear: 10 PokéCash = R$ 1,00. Sem bônus por
   pacote nesta versão (a pedido) — o pacote maior não rende mais por
   real do que o menor, então a escolha é só de conveniência, não de
   vantagem. Quando entrar promoção, é aqui que ela nasce.

   Manter a taxa numa constante (e não espalhar números pelo código) é
   o que permite mexer no câmbio depois sem caçar valor solto em vinte
   lugares.                                                            */
const PC_POR_REAL = 10;

/* O `R$` SAIU DE TODA ANOTAÇÃO DE POKÉCASH (V1.20, decisão do dono do projeto).
 *
 * Cada ficha dizia "50 / R$ 5,00", o saldo dizia "1.000 / R$ 100,00", e o
 * retorno dizia "263 (R$ 26,30)". Três consequências, e nenhuma delas era o que
 * a tradução queria fazer:
 *
 *   · ensinava uma taxa fixa de 10 PC = R$ 1,00 como se fosse parte da regra;
 *   · fazia a PERDA ser sentida em reais, que é precisamente o que uma moeda
 *     simulada não deveria conseguir fazer (Spec §P1 e cap. 28);
 *   · repetia o mesmo número duas vezes em cada ficha, gastando a linha de baixo
 *     do cartão com informação que não muda a decisão de ninguém.
 *
 * O que SOBRA em reais é a única coisa que não é anotação: o **preço dos
 * pacotes** da loja simulada. Ali o real não traduz um saldo — ele é o produto,
 * e a tela já se declara simulada em cima. Tirar o preço da loja não deixaria a
 * moeda mais simulada; deixaria a loja sem preço.
 *
 * A constante fica porque a loja precisa dela. É a mesma lição de sempre: a taxa
 * mora num lugar só. */
/* Sem uso desde que a anotação saiu. Fica DELETADA e não comentada: função
   exportada que ninguém chama é convite para a anotação voltar sem decisão. */

/* SEM `loading="lazy"` NAS NOTAS, e isso e decisao (D-068).
   Sao cinco JPEG pequenos que aparecem SEMPRE que a tela de aposta abre: o
   adiamento nao economiza nada e cobra caro. Imagem preguicosa numa vista
   escondida nunca entra na fila do navegador — fica `complete === false` para
   sempre — e o jogador que troca de aba encontra a ficha vazia por um quadro.
   Foi tambem o que travou o portao visual por 300 s (D-069). */
const NOTA = {
  50: 'nota-50PC', 100: 'nota-100PC', 300: 'nota-300PC',
  500: 'nota-500PC', 1000: 'nota-1kPC',
};

const DEPOSIT_PACKAGES = [
  { brl:5,   pc:50   },
  { brl:10,  pc:100  },
  { brl:30,  pc:300  },
  { brl:50,  pc:500  },
  { brl:100, pc:1000 },
];

function loadDeposits(){
  try { return JSON.parse(localStorage.getItem('ar_deposits')) || []; } catch(e) { return []; }
}
function saveDeposits(list){ localStorage.setItem('ar_deposits', JSON.stringify(list)); }

function renderDeposit(){
  /* A NOTA APARECE NA CARTEIRA TAMBEM, e nao so nas fichas de aposta.

     Pedido do dono: *"as notas ficaram otimas no local de sua aposta, porem
     precisam tambem aparecer na carteira"*. E os valores batem por construcao
     — os pacotes sao 50/100/300/500/1000, a mesma escada das fichas, e as
     cinco notas que ele desenhou sao exatamente essas.

     Aqui o numero FICA escrito, ao contrario da ficha: o pacote precisa dizer
     duas coisas que a nota nao diz — quanto custa em real e quanto rende por
     real. A nota entra como identidade, e nao como informacao.

     ── A ORDEM VISUAL INVERTEU, a pedido do dono ──────────────────────────

       > "o valor mais chamativo que esta em real precisa ser na verdade para
       >  o PokeCash [...] precisa dar sensacao de que ele esta comprando MUITO
       >  porem barato"

     O produto na frente e o preco depois e comercio normal — toda loja de
     aplicativo lista "1.000 moedas" grande e o preco menor.

     O QUE NAO MUDA, e e por isso que esta escrito aqui: o preco continua
     inteiro, legivel e no mesmo cartao. Este produto tem um capitulo de
     protecao ao jogador (§28) e uma consulta regulatoria aberta (§0.5.1);
     encolher preco ate virar letra miuda e a versao disto que cruza a linha,
     e ela nao entra por descuido de CSS. Destacar o que se leva: sim.
     Esconder o que se paga: nao. */
  $('#pkgList').innerHTML = DEPOSIT_PACKAGES.map((p,i) => `
    <div class="pkg comNota" data-i="${i}">
      <img class="pkgNota" src="../arte/moedas/${NOTA[p.pc]}.jpg" alt="">
      <div>
        <div class="pcGrande">${CUR} ${p.pc.toLocaleString('pt-BR')}</div>
        <div class="bonus">${(p.pc / p.brl).toFixed(0)} ${MOEDA} por real</div>
      </div>
      <div class="price">R$ ${p.brl.toFixed(2).replace('.',',')}</div>
    </div>`).join('');

  $('#depHist').innerHTML = renderHistDep(4);
}

function simulateDeposit(pkg){
  creditarCompra(pkg.pc, 'pacote:' + pkg.brl); atualizarSaldo();
  const list = loadDeposits();
  list.push({ date: Date.now(), brl: pkg.brl, pc: pkg.pc });
  saveDeposits(list);
  renderDeposit();
  atualizarSaldo();
  $('#depToast').textContent = `✅ Simulado: +${CUR} ${pkg.pc.toLocaleString('pt-BR')} creditados.`;
  $('#depToast').classList.remove('show'); void $('#depToast').offsetWidth; $('#depToast').classList.add('show');
}

/* --------------------------------------------------------------------
   HISTÓRICO — apostas e depósitos
   --------------------------------------------------------------------
   Guardado no perfil, limitado às últimas 120 entradas de cada tipo.
   O limite existe porque localStorage é pequeno e um histórico infinito
   acabaria estourando a cota justamente de quem mais joga.            */
const HIST_MAX = 120;

function registrarAposta(reg){
  if (!S.profile.histBets) S.profile.histBets = [];
  S.profile.histBets.push(reg);
  if (S.profile.histBets.length > HIST_MAX) S.profile.histBets = S.profile.histBets.slice(-HIST_MAX);
  saveProfile(S.profile);
}

const dataHora = t => new Date(t).toLocaleString('pt-BR',
  {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});

function renderHistApostas(ganhos){
  const lista = (S.profile.histBets || []).filter(b => !!b.won === ganhos).reverse();
  if (!lista.length)
    return `<div class="tiny" style="padding:10px 2px">Nenhuma ${ganhos ? 'vitória' : 'derrota'} registrada ainda.</div>`;
  const soma = lista.reduce((a,b) => a + (ganhos ? (b.payout - b.amount) : b.amount), 0);
  return `<div class="histsum ${ganhos ? 'up' : 'down'}">
      <span>${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}</span>
      <b>${ganhos ? '+' : '−'}${CUR} ${soma.toLocaleString('pt-BR')}</b>
    </div>` +
    lista.map(b => `
    <div class="hrow2 ${ganhos ? 'up' : 'down'}">
      <div class="l">
        <b>${b.mon}</b>
        <span>${dataHora(b.t)} · x${(b.odd||1).toFixed(2)}${b.pos ? ' · ' + b.pos + 'º lugar' : ''}</span>
      </div>
      <div class="r">
        <b>${ganhos ? '+' : '−'}${CUR} ${(ganhos ? b.payout - b.amount : b.amount).toLocaleString('pt-BR')}</b>
        <span>apostou ${CUR} ${b.amount.toLocaleString('pt-BR')}</span>
      </div>
    </div>`).join('');
}

function renderHistDep(limite){
  const lista = loadDeposits().slice(-(limite || HIST_MAX)).reverse();
  if (!lista.length) return '<div class="tiny" style="padding:10px 2px">Nenhum depósito simulado ainda.</div>';
  const total = lista.reduce((a,d) => a + (d.pc || d.diamonds || 0), 0);
  return `<div class="histsum up"><span>${lista.length} depósito(s)</span>
      <b>+${CUR} ${total.toLocaleString('pt-BR')}</b></div>` +
    lista.map(d => `
    <div class="hrow2 up">
      <div class="l"><b>R$ ${d.brl.toFixed(2).replace('.',',')}</b><span>${dataHora(d.date)}</span></div>
      <div class="r"><b>+${CUR} ${(d.pc || d.diamonds || 0).toLocaleString('pt-BR')}</b><span>simulado</span></div>
    </div>`).join('');
}


/* =====================================================================
   VALORES DE APOSTA
   ---------------------------------------------------------------------
   As fichas usam a mesma escada dos pacotes de compra (50/100/300/500/
   1000), com o equivalente em reais embaixo, para o apostador ver o que
   está pondo em jogo na moeda que ele conhece. Aposta mínima = 50, que
   é o menor pacote.

   Ficha maior que o saldo aparece desabilitada em vez de sumir: some
   com a opção e a pessoa não entende por que a grade mudou; desabilitada
   ela mostra que existe e que falta saldo.                            */
const CHIP_VALUES = [50, 100, 300, 500, 1000];

/* A ARTE DE CADA NOTA. O dono desenhou as cinco, e elas sao a razao de as
   fichas serem justamente estes valores — a arte veio primeiro.

   A NOTA E A FICHA, E O NUMERO VOLTA POR CIMA — e a segunda parte foi
   aprendida olhando. Tirei o numero porque ele ja esta impresso na arte; na
   tela, com a ficha em ~110x45 px, o valor impresso e ilegivel e as cinco
   notas viram cinco retangulos iguais. A ficha deixou de fazer o trabalho
   dela, que e dizer QUANTO.

   O numero volta como SELO no canto, e nao centralizado: assim ele responde
   a pergunta sem cobrir o desenho que motivou trocar a ficha por uma nota. */


/* MUDAR O VALOR REAPLICA A APOSTA, quando já existe uma.
 *
 * As fichas mudavam `S.chipVal` e mais nada. O valor apostado, o retorno e o
 * teto exibidos vinham de `placeBet`, que só roda ao clicar no LUTADOR — então
 * quem escolhia o Pokémon e depois trocava de ficha via os números do valor
 * ANTIGO, e precisava clicar no Pokémon de novo para a tela contar a verdade.
 *
 * `placeBet` com o mesmo índice é exatamente o que o clique no lutador faz: ela
 * devolve o passivo da aposta anterior, reavalia o teto do §4.4.6 e regrava o
 * ticket. Chamar a mesma função é o que garante que trocar de ficha e trocar de
 * lutador não sigam caminhos diferentes — dois caminhos para a mesma operação é
 * como um deles fica para trás.
 *
 * Sem aposta viva não há o que reaplicar, e a ficha é só uma escolha guardada.
 */
function reaplicarAposta(){
  if (!S.myBet) return;
  const linha = document.querySelector(`.pick[data-i="${S.myBet.idx}"]`);
  placeBet(S.myBet.idx, linha);
}

function atualizarFichas(){
  const row = $('#chipRow'); if (!row) return;
  row.innerHTML = CHIP_VALUES.map(v => `
      <button class="chip nota ${S.chipVal === v ? 'on' : ''} ${v > saldo() ? 'off' : ''}"
              data-v="${v}" title="${v.toLocaleString('pt-BR')} ${MOEDA}">
        <img src="../arte/moedas/${NOTA[v]}.jpg" alt="${v} ${MOEDA}">
        <b>${v.toLocaleString('pt-BR')}</b>
      </button>`).join('') +
    `<button class="chip ${S.chipVal === 'max' ? 'on' : ''} ${saldo() < APOSTA_MIN ? 'off' : ''}" data-v="max">
        <b>Tudo</b><span>${saldo().toLocaleString('pt-BR')} ${MOEDA}</span></button>`;

  row.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    if (b.classList.contains('off')) return;
    S.chipVal = b.dataset.v === 'max' ? 'max' : +b.dataset.v;
    const inp = $('#betCustom'); if (inp) inp.value = '';
    atualizarFichas();
    reaplicarAposta();
  });

  const dica = $('#chipHint');
  if (dica){
    const v = valorAposta();
    dica.innerHTML = saldo() < APOSTA_MIN
      ? `Saldo abaixo da aposta mínima de ${CUR} ${APOSTA_MIN}. Complete um desafio diário ou compre ${MOEDA}.`
      : `Apostando <b>${CUR} ${v.toLocaleString('pt-BR')}</b> por rodada.`;
  }
}

function usarValorPersonalizado(){
  const inp = $('#betCustom');
  const v = Math.floor(+inp.value || 0);
  const dica = $('#chipHint');
  if (v < APOSTA_MIN){
    dica.innerHTML = `<span style="color:var(--red)">A aposta mínima é ${CUR} ${APOSTA_MIN}.</span>`;
    return;
  }
  if (v > saldo()){
    dica.innerHTML = `<span style="color:var(--red)">Saldo insuficiente: você tem ${CUR} ${saldo().toLocaleString('pt-BR')}.</span>`;
    return;
  }
  S.chipVal = v;
  atualizarFichas();
  /* O valor personalizado é a mesma decisão da ficha, por outro caminho — e
     precisa reaplicar igual, senão o defeito volta só por esta porta. */
  reaplicarAposta();
}

$('#btnCustomBet').onclick = usarValorPersonalizado;
$('#betCustom').addEventListener('keydown', e => { if (e.key === 'Enter') usarValorPersonalizado(); });

function abrirCarteira(){
  atualizarSaldo();
  $('#histGanhos').innerHTML = renderHistApostas(true);
  $('#histPerdas').innerHTML = renderHistApostas(false);
  $('#histDep').innerHTML    = renderHistDep();

  // resumo do topo: quanto entrou, quanto saiu, saldo do período
  const h = S.profile.histBets || [];
  const ganho  = h.filter(b => b.won).reduce((a,b) => a + (b.payout - b.amount), 0);
  const perda  = h.filter(b => !b.won).reduce((a,b) => a + b.amount, 0);
  const dep    = loadDeposits().reduce((a,d) => a + (d.pc || d.diamonds || 0), 0);
  const liq    = ganho - perda;
  $('#wSum').innerHTML = `
    <div class="wcard up"><span>Ganhos</span><b>+${CUR} ${ganho.toLocaleString('pt-BR')}</b><i>${MOEDA}</i></div>
    <div class="wcard down"><span>Perdas</span><b>−${CUR} ${perda.toLocaleString('pt-BR')}</b><i>${MOEDA}</i></div>
    <div class="wcard ${liq>=0?'up':'down'}"><span>Resultado</span>
      <b>${liq>=0?'+':'−'}${CUR} ${Math.abs(liq).toLocaleString('pt-BR')}</b><i>${MOEDA}</i></div>
    <div class="wcard"><span>Depositado</span><b>${CUR} ${dep.toLocaleString('pt-BR')}</b><i>${MOEDA}</i></div>`;
  renderNotas();
  openModal('#walletModal');
}
$('#btnWallet').onclick = abrirCarteira;
$('#btnWalletDep').onclick = () => { closeModal('#walletModal'); renderDeposit(); openModal('#depositModal'); };
document.querySelectorAll('#walletModal .tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('#walletModal .tab').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('#walletModal .pane').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); $('#' + b.dataset.wpane).classList.add('on');
});

$('#btnStart').onclick = () => {
  /* D-114: no modo servidor quem decide a rodada é o servidor. O botão some
     (CSS), e o clique recusa por baixo — antes ele levava a tela à contagem
     no meio da janela e o jogador ficava sem poder apostar. */
  if (modoServidor()) return;
  if (S.state === 'betting') startFight();
  else if (S.state === 'result' || S.state === 'idle') newRound();
};
$('#btnAuto').onclick = e => { S.auto = !S.auto; e.target.textContent = 'Auto: ' + (S.auto ? 'ON' : 'OFF'); e.target.classList.toggle('on', S.auto); };
/* O BOTAO NASCE MOSTRANDO O ESTADO, e nao assumindo ligado. Um botao que diz
   🔊 com o som mudo e a mesma mentira do rotulo do zoom. */
{ const b = $('#btnSound'); if (b) b.textContent = somLigado() ? '🔊' : '🔇'; }
$('#btnSound').onclick = e => {
  const ligado = alternarSom();
  e.target.textContent = ligado ? '🔊' : '🔇';
  if (ligado){ if (S.state === 'countdown' || S.state === 'fighting') music(true); }
  else music(false);
};
/* A barra de volume saiu da tela no R4 — marcada com X no mockup do dono. O
   `S.musicVol` continua existindo e sendo aplicado no boot: quem manda no
   volume agora é o sistema, e o botão de mudo continua ligando e desligando.
   O ouvinte foi embora com o elemento, e não ficou um `$('#vol')` sem guarda:
   `null.oninput` derrubaria o módulo inteiro no carregamento, junto com tudo
   que ele exporta — que é o defeito clássico da remoção pela metade. */
/* O controle de velocidade do replay saiu da tela do jogador no V1.16 e vive no
   painel de ADM. Ele mostrava a um apostador que a velocidade da luta é
   ajustável localmente, na mesma tela em que se aposta — e o `?.` existe porque
   o elemento só está no DOM quando o painel está aberto. */
const ligarVelocidade = () => {
  const el = $('#spd'); if (!el) return;
  el.oninput = e => { S.speed = +e.target.value; $('#spdVal').textContent = S.speed.toFixed(1) + 'x'; };
};
ligarVelocidade();

/* O "+1.000 de teste" saiu da tela do jogador no V1.16 e vive no painel de ADM.
   Um botão que cria dinheiro do nada, ao lado do saldo, é o oposto do que a
   proveniência do §5.5 promete — mesmo sendo moeda simulada. */

export {
  ligarVelocidade,
  DEPOSIT_PACKAGES,
  atualizarFichas,
  registrarAposta,
  renderDeposit,
  simulateDeposit,
};

/* ── O SALDO COMO NOTAS (R28) ──────────────────────────────────────────────
 *
 * A carteira mostrava um número. Agora mostra o que uma carteira mostra: as
 * notas que você tem, quantas de cada. Isso não muda regra nenhuma — o saldo é
 * o mesmo —, mas dá PESO ao dinheiro. Um número sobe e desce; um maço de notas
 * se vê encolher.
 *
 * O RESTO É DITO. Saldo de 1.437 são uma nota de mil, quatro de cem e o resto
 * em moedas. Engolir os 37 faria a soma das notas discordar do saldo logo
 * acima — e a carteira estaria mentindo em silêncio sobre o próprio número.
 *
 * A LISTA DE NOTAS VEM DO PACK, e é ele quem diz quais criaturas aparecem em
 * cada valor. Um pack sem notas declaradas não desenha nenhuma, e a carteira
 * continua sendo a carteira: as notas são acréscimo, não dependência.
 */
function renderNotas(){
  const alvo = $('#wNotas');
  if (!alvo) return;
  const declaradas = PACK?.moeda?.notas;
  if (!declaradas || !declaradas.length){ alvo.innerHTML = ''; return; }

  const porValor = new Map(declaradas.map(n => [n.valor, n.dex]));
  const { notas, resto } = decompor(saldo(), [...porValor.keys()]);
  const tem = Object.entries(notas).sort((a, b) => b[0] - a[0]);

  if (!tem.length && !resto){
    /* Carteira vazia não desenha maço vazio: ela diz que está vazia. */
    alvo.innerHTML = `<div class="wnVazia">Sem ${MOEDA} na carteira.</div>`;
    return;
  }

  alvo.innerHTML =
    `<div class="wnTitulo">No seu bolso</div>
     <div class="wnMaco">` +
    tem.map(([v, quantas]) => {
      const dex = porValor.get(+v);
      /* A ARTE DO DONO VENCE A DESENHADA.  continua existindo e
         continua sendo a reserva: ela cobre qualquer valor, inclusive os que
         ele ainda nao desenhou. Apagar o gerador seria trocar cobertura total
         por cinco arquivos — e no dia de um valor novo a carteira ficaria com
         um buraco em vez de uma nota generica. */
      const arte = NOTA[+v];
      return `<div class="wnItem">
        ${arte
          ? `<img class="wnArte" src="../arte/moedas/${arte}.jpg" alt="${v} ${MOEDA}">`
          : desenharCedula({ valor: +v, dex, moeda: MOEDA, retrato: dexURL(dex) })}
        <span class="wnQtd">×${quantas}</span>
      </div>`;
    }).join('') +
    `</div>` +
    (resto ? `<div class="wnResto">e mais ${CUR} ${resto.toLocaleString('pt-BR')} em moedas</div>` : '');
}
