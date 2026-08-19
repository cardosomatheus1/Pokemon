/* Precificação — o Monte Carlo fatiado e o painel de odds.
 *
 * Fronteira: transforma elenco em preço. Não conhece aposta nem carteira.
 * A fatia de 12 ms existe para não travar a animação; em aba oculta roda de
 * uma vez, senão quem abre a página em segundo plano nunca vê as odds saírem. */

import { $ } from './dom.mjs';
import { CONF, CUR, M } from './motor.mjs';
import { precificar, simularLote } from '../../engine/preco.mjs';
import { avaliarAposta } from '../../engine/exposicao.mjs';
import { S } from './estado.mjs';
import { ordemDeQuedas, rankingColocacao } from './colocacao.mjs';
import { abatesDe } from './killfeed.mjs';
import { imgTag } from './sprites.mjs';

/* ------------------------- ODDS (MONTE CARLO) -------------------------
   Roda CONF.SIMS batalhas e transforma frequência de vitória em odd.
   Em produção isso roda no servidor, uma vez, antes de abrir as apostas.
   `raiz` é a semente-raiz da rodada (Spec §P3). Cada simulação recebe uma
   sub-seed derivada do índice, e não uma semente aleatória: com isso o preço
   deixa de ser irreproduzível. Duas execuções da mesma rodada dão a MESMA
   tabela de odds, que é o que o §25.2 precisa para alguém auditar o preço
   depois de a rodada acabar.

   Desde o F0.6 cada simulação sorteia o próprio clima (§4.3). O clima da luta
   real segue secreto até as apostas fecharem — o que mudou é que o preço passa
   a saber que ele existe.
---------------------------------------------------------------------- */
function computeOdds(fighters, sims, onProgress, raiz, margem){
  return new Promise(resolve => {
    const wins = new Uint32Array(fighters.length);
    let done = 0;
    function step(){
      // Em aba oculta o requestAnimationFrame não roda. Se ficássemos só
      // nele, quem abrisse a página em segundo plano nunca via as odds
      // saírem. Então: escondido, roda tudo de uma vez; visível, roda em
      // fatias de 12 ms para não travar a animação.
      //
      // O tamanho da fatia NÃO afeta o resultado: cada simulação tem sub-seed
      // derivada do próprio índice (engine/preco.mjs), não de um sorteio.
      if (document.hidden){
        simularLote(M, fighters, raiz, done, sims, wins);
        done = sims;
      } else {
        const t0 = performance.now();
        while (done < sims && performance.now() - t0 < 12){
          const ate = Math.min(sims, done + 200);
          simularLote(M, fighters, raiz, done, ate, wins);
          done = ate;
        }
      }
      if (onProgress) onProgress(done / sims);
      if (done < sims) requestAnimationFrame(step);
      /* A margem da rodada vem de fora — do painel de ADM, quando ele declara
         uma. `undefined` faz `precificar` cair na do motor. Ela vai gravada no
         registro do §4.4.5 e é a MESMA que a tela mostra: o painel muda o
         preço, nunca cria odd secreta. */
      else resolve(precificar(wins, sims, M, { margem }));
    }
    step();
  });
}

/* A LISTA DE LUTADORES — UMA, com os doze, em dois modos.
 *
 * Eram TRÊS listas dos mesmos doze: `ODDS AO VIVO` (não clicável, 12 linhas),
 * o cartão `QUEM VENCE?` (clicável, 8 linhas, sem dizer que faltavam 4) e
 * `ABATES`. A mais visível não era a clicável, e nenhuma mostrava a chance.
 *
 *   APOSTA  retrato · nome · PROBABILIDADE com margem de erro · odd · limite
 *   LUTA    posição · retrato · nome · vida · odd · abates
 *
 * A PROBABILIDADE ENTRA AQUI, e é a mudança que mais importa do bloco. O
 * produto se vende por odd auditável, e o `p 5,96 % ± 1,01 %` por lutador — que
 * o §4.4.5 já calcula e grava no registro — só aparecia no painel de ADM. A
 * tela do cliente mostrava "100 %" em doze linhas, que é VIDA e não chance, e
 * lê como defeito.
 */
function buildPickList(){
  const rows = S.odds.lutadores.slice().sort((a,b) => a.odd - b.odd);
  return rows.map(o => {
    const f = S.fighters[o.idx];
    /* §4.4.6: a interface mostra o stake máximo daquele lutador e, quando o
       mercado fecha por passivo, diz isso — nunca rejeita em silêncio. O
       limite é consultado ao vivo porque ele encolhe conforme o passivo sobe. */
    const v = S.passivo ? avaliarAposta(S.odds, S.passivo, o.idx, 1, CONF) : null;
    const fechado = v && !v.aceito;
    const cabe = v && v.aceito ? v.limite : 0;
    const meu = S.myBet && S.myBet.idx === o.idx;
    return `<div class="pick ${fechado ? 'fechado' : ''} ${meu ? 'sel' : ''}" data-i="${o.idx}">
      ${imgTag(f)}
      <span class="n">${f.n}</span>
      <span class="p" title="chance de vencer, medida em ${S.odds.sims.toLocaleString('pt-BR')} simulações">${
        (o.prob*100).toFixed(1)}%<i>±${(o.erroRelativo*100).toFixed(1)}</i></span>
      <span class="o">x${o.odd.toFixed(2)}</span>
      <span class="lim tiny">${fechado ? 'mercado fechado'
        : `até ${CUR} ${cabe.toLocaleString('pt-BR')}`}</span>
    </div>`;
  }).join('');
}

/* O MESMO componente, durante a luta. A ordem passa a ser a colocação — é a
   única pergunta viva quando não há nenhuma ação disponível. */
function buildLiveList(){
  const ordem = ordemDeQuedas(S.battle ? S.battle.events.slice(0, S.evPtr) : []);
  const rank = rankingColocacao(S.fighters.length, ordem,
    i => { const e = S.ents[i]; return e ? e.hp / S.fighters[i].maxHp : 1; });
  const fim = S.state === 'result';
  return rank.map(r => {
    const f = S.fighters[r.i], o = S.odds.lutadores[r.i];
    const meu = S.myBet && S.myBet.idx === r.i;
    const top = r.pos <= 3, fechado = fim || !r.vivo;
    return `<div class="pick viva ${r.vivo ? '' : 'fechado'} ${meu ? 'sel' : ''}" data-i="${r.i}">
      <span class="pos">${top && fechado ? ['🥇','🥈','🥉'][r.pos-1] : r.pos + 'º'}</span>
      ${imgTag(f)}
      <span class="n">${f.n}</span>
      <span class="p">${r.vivo ? Math.round(r.hp*100) + '%' : 'K.O.'}</span>
      <span class="o">${o ? 'x'+o.odd.toFixed(2) : ''}</span>
      <span class="lim tiny">${abatesDe(r.i)} ab</span>
    </div>`;
  }).join('');
}

/* Desenha a lista no modo certo para a fase, e ajusta o cabeçalho. Um só ponto
   de entrada: quem chama não precisa saber em que fase está. */
function refreshOddsTable(){
  const alvo = $('#pickList'); if (!alvo || !S.odds) return;
  const naLuta = S.state === 'fighting' || S.state === 'result';
  alvo.innerHTML = naLuta ? buildLiveList() : buildPickList();
  alvo.classList.toggle('naLuta', naLuta);

  const t = $('#listaTtl'), sub = $('#listaSub');
  if (t)   t.textContent = naLuta ? 'Colocação' : 'Quem vence?';
  if (sub) sub.textContent = naLuta
    ? (S.state === 'result' ? 'encerrada' : `${S.fighters.length - vivos()} fora`)
    : `${S.fighters.length} lutadores`;

  /* O rodapé mostra a margem EFETIVA e o pior erro relativo. É o §4.4.1 na
     tela: overround diferente do configurado não pode ficar escondido, e o erro
     do estimador é o que separa "a casa cobra 8 %" de "a casa cobra 8 % com uma
     barra de erro que você não vê". */
  const R = S.odds;
  const nota = $('#oddNote');
  if (nota) nota.textContent =
    `${(R.sims/1000)|0}k simulações · casa ${(R.margemEfetiva*100).toFixed(1)}% · ` +
    `erro máx ${(R.erroPior*100).toFixed(1)}%`;
}

const vivos = () => (S.ents || []).filter(e => e.alive).length;

export {
  buildLiveList,
  buildPickList,
  computeOdds,
  refreshOddsTable,
};
