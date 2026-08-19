/* A FAIXA DE ESTADO — fase, relógio e saldo, fixos no topo.
 *
 * As três perguntas que um apostador faz antes de qualquer outra estavam
 * espalhadas e se contradiziam. O crítico cego mediu (L-029): "quanto tempo
 * falta" tirou nota 1 em 1920 e 0 em 1100 e 420; "o que está acontecendo",
 * nota 1 a 2. Os motivos, na ordem em que doíam:
 *
 *   · o relógio era um sufixo de ~7 px (`QUEM VENCE? — 29s`) dentro de um
 *     cabeçalho decorativo, DENTRO do canvas, sem barra e sem rótulo — o menor
 *     texto de uma tela com tipografia display sobrando em cinco lugares;
 *   · a fase tinha quatro pistas espalhadas e CONTRADITÓRIAS: o rótulo
 *     `APOSTAS`, a pílula "Escolha seu lutador!", o banner dizendo
 *     "ASSISTINDO ESTA RODADA" (o oposto), e um botão "Iniciar rodada" que
 *     sugeria que nada tinha começado;
 *   · e nas larguras menores tudo isso saía da tela junto com o canvas.
 *
 * O NÚMERO É GRANDE E A BARRA EXISTE DE PROPÓSITO, e isso não é urgência
 * artificial — é o contrário dela. Prazo previsível REDUZ ansiedade: quem sabe
 * que tem 23 segundos decide com calma, quem não sabe decide com medo ou é
 * surpreendido. Proteção do jogador é requisito (Spec cap. 28), e aqui ela se
 * cumpre mostrando mais, não menos.
 */
import { $ } from './dom.mjs';
import { CONF } from './motor.mjs';
import { S } from './estado.mjs';
import { avatarURL, tituloDe, trainerURL } from './perfil.mjs';
import { progressoNivel } from './progressao.mjs';
import { PADRAO_BANNER, cosmeticoValido } from './banner-dados.mjs';

const NOME_DA_FASE = {
  betting:   'APOSTAS',
  countdown: 'PREPARAR',
  fighting:  'AO VIVO',
  result:    'RESULTADO',
};

/* Quanto falta, e de quê. A fase de aposta conta para baixo; a luta conta o
   tempo decorrido, porque ali não há prazo nenhum a cumprir — o jogador só
   assiste, e um relógio regressivo sugeriria uma ação que não existe. */
function relogio(){
  const seg = $('#faSeg'), barra = $('#faBarra'), caixa = barra?.parentElement;
  if (!seg || !barra) return;

  if (S.state === 'betting'){
    const resta = Math.max(0, CONF.BET_WINDOW - S.clock);
    seg.textContent = resta.toFixed(0) + 's';
    barra.style.width = (resta / CONF.BET_WINDOW * 100) + '%';
    /* Abaixo de 10 s o vermelho entra. É informação e não pressão: é o aviso
       que permite ao jogador DESISTIR a tempo, não o que o apressa a apostar. */
    const curto = resta <= 10;
    caixa?.classList.toggle('curto', curto);
    seg.classList.toggle('curto', curto);
    return;
  }
  caixa?.classList.remove('curto'); seg.classList.remove('curto');
  if (S.state === 'fighting'){
    seg.textContent = S.clock.toFixed(1) + 's';
    barra.style.width = Math.min(100, S.clock / CONF.MAX_TIME * 100) + '%';
    return;
  }
  seg.textContent = S.state === 'result' ? '—' : '…';
  barra.style.width = '100%';
}

/* Quem é o jogador. Substitui o banner de 340 px que a tela principal gastava
   para mostrar arte estática — ele continua inteiro no perfil, que é onde
   alguém de fato o olha. */
function atualizarEu(){
  const img = $('#faAvatar');
  if (img){
    img.src = avatarURL();
    img.onerror = () => { img.onerror = null; img.src = trainerURL('red'); };
  }
  const np = progressoNivel(S.profile?.xp || 0);
  const nome = $('#faNome'), nv = $('#faNv'), cena = $('#faixa .fa-cena');
  if (nome){
    nome.textContent = S.profile?.name || 'Treinador';
    /* O EFEITO DE NOME E O CENÁRIO VESTEM A FAIXA. O banner de 340 px saiu da
       tela principal no V1.16 — respondia zero das cinco perguntas do teste dos
       3 segundos —, mas os cosméticos que o jogador escolheu não podem sumir
       com ele. Cosmético que não aparece é conquista que não existe. */
    const bb = S.profile?.battle || PADRAO_BANNER;
    nome.className = 'bnNome ef-' + cosmeticoValido('efeito', bb.efeito);
    if (cena) cena.className = 'fa-cena cn-' + cosmeticoValido('cena', bb.cena);
  }
  if (nv)   nv.textContent = `NV ${np.nivel} · ${tituloDe(np.nivel)}`;
}

function atualizarFase(){
  const el = $('#phase');
  if (el) el.textContent = NOME_DA_FASE[S.state] || '—';
}

export { atualizarEu, atualizarFase, relogio };
