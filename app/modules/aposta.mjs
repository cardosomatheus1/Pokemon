/* A APOSTA — escolher, reajustar e cancelar.
 *
 * Saiu de `fases.mjs` no V1.15, e por RESPONSABILIDADE, não por tamanho: as
 * fases são a máquina de estados da rodada; a aposta é o único ponto do app em
 * que dinheiro do jogador encontra o teto de exposição do §4.4.6. São dois
 * assuntos com regras próprias, e o cancelamento acrescentou um terceiro
 * caminho a cada um deles.
 *
 * Fronteira: decide se a aposta cabe, move dinheiro pela fachada do banco e
 * mexe no passivo da rodada. Não sabe o que é uma fase, não inicia batalha, não
 * paga resultado — o pagamento continua em `fases.mjs`, junto do fim da rodada.
 */
import { $ } from './dom.mjs';
import { APOSTA_MIN, emReais, valorAposta } from './carteira.mjs';
import { CONF, CUR, MOEDA } from './motor.mjs';
import { avaliarAposta, liberarTicket, registrarTicket } from '../../engine/exposicao.mjs';
import { emitir } from './telemetria.mjs';
import { S } from './estado.mjs';
import { selRing } from './rodada.mjs';
import { atualizarSaldo } from './controles.mjs';
import { devolverAposta, reservarAposta } from './banco.mjs';
import { posSelRing } from './coreografia.mjs';
import { renderKillfeed } from './killfeed.mjs';
import { renderBattleBanner } from './banner.mjs';

function markMyPlate(){
  S.ents.forEach((e,i) => {
    const meu = !!S.myBet && S.myBet.idx === i;
    e.plate.classList.toggle('mine', meu);
    e.el.classList.toggle('mine', meu);
  });
  if (selRing) selRing.classList.toggle('on', !!S.myBet);
  posSelRing();
  renderKillfeed();         // marca a sua linha no ranking de abates
  renderBattleBanner();     // e o banner mostra o lutador em que você apostou
}

function placeBet(idx, row){
  if (S.state !== 'betting') return;
  const pedido = valorAposta();
  if (pedido < APOSTA_MIN){
    $('#betInfo').innerHTML = `<b>Saldo insuficiente.</b> A aposta mínima é ${CUR} ${APOSTA_MIN} `
      + `(${emReais(APOSTA_MIN)}). Complete um desafio diário ou compre ${MOEDA}.`;
    return;
  }

  /* --- TETOS DE EXPOSIÇÃO (Spec §4.4.6) -----------------------------
     O corte acontece AQUI, antes de confirmar — nunca no settlement. E
     quando corta, diz qual limite, quanto cabe e por quê: o §4.4.6
     proíbe rejeição silenciosa, e o portão Q5 do F0.8 captura a
     mensagem na tela.

     A troca de aposta devolve o passivo da anterior antes de avaliar a
     nova; senão trocar de lutador dez vezes encheria o passivo de todos
     eles sem nenhuma aposta viva.                                     */
  if (S.myBet) liberarTicket(S.passivo, S.myBet.idx, S.myBet.amount, S.myBet.odd);
  const veredito = avaliarAposta(S.odds, S.passivo, idx, pedido, CONF);
  if (!veredito.aceito){
    if (S.myBet) registrarTicket(S.passivo, S.myBet.idx, S.myBet.amount, S.myBet.odd);   // desfaz a devolução
    $('#betInfo').innerHTML = `<b>${veredito.mensagem}</b>`;
    return;
  }
  const amount = veredito.valor;

  /* Troca de aposta: a reserva anterior volta INTEIRA aos buckets de onde saiu
     (§5.5) antes de a nova ser reservada. Devolver "o valor" em vez da
     composição transformaria bônus em transferível a cada troca. */
  if (S.myBet) devolverAposta(S.myBet.composicao, 'aposta');
  const reserva = reservarAposta(amount, 'aposta');
  if (!reserva.ok){
    if (S.myBet) reservarAposta(S.myBet.amount, 'aposta');   // desfaz a devolução
    S.passivo[idx] -= 0;
    $('#betInfo').innerHTML = `<b>Saldo insuficiente.</b>`;
    return;
  }
  const o = S.odds.lutadores.find(x => x.idx === idx);
  emitir(S.myBet ? 'bet_changed' : 'bet_selected', { lutador: S.fighters[idx].n, odd: o.odd });
  S.myBet = {idx, amount, odd:o.odd, composicao: reserva.composicao};
  emitir('bet_confirmed', { valor: amount, odd: o.odd, composicao: reserva.composicao });
  registrarTicket(S.passivo, idx, amount, o.odd);
  atualizarSaldo();
  /* `recordBetPlaced` NÃO entra aqui — ver D-008 e a chamada em `startFight`.
     Contar no clique conta aposta trocada e aposta cancelada. */
  markMyPlate();
  document.querySelectorAll('.pick').forEach(p => p.classList.toggle('sel', +p.dataset.i === idx));
  const corte = veredito.cortado
    ? `<br><span class="tiny" id="avisoCorte" style="color:var(--gold)">${veredito.mensagem}</span>`
    : '';
  $('#betInfo').innerHTML =
    `<b>${CUR} ${amount.toLocaleString('pt-BR')}</b> em <b>${S.fighters[idx].n}</b> (x${o.odd.toFixed(2)})<br>
     retorno se vencer: <b style="color:var(--gold)">${CUR} ${Math.floor(amount*o.odd).toLocaleString('pt-BR')}</b>
     <span class="tiny">(${emReais(Math.floor(amount*o.odd))})</span>${corte}
     <button class="btn cancelBet" id="btnCancelBet">✕ Cancelar aposta e ficar de fora</button>`;
  $('#btnCancelBet').onclick = cancelarAposta;
}

/* CANCELAR A APOSTA — devolve o valor e o passivo, e só durante a janela.
 *
 * Existe porque clicar num lutador era irreversível: quem clicasse por impulso
 * ficava obrigado a apostar naquela rodada, ou a trocar para outro que também
 * não queria. Proteção do jogador é requisito, não conformidade (Spec cap. 28).
 *
 * BOTÃO EXPLÍCITO, e não "clicar de novo no mesmo lutador". A v1.0 do porte fez
 * assim e teve de consertar a ordem das checagens, porque com a ficha "Tudo" o
 * saldo ia a zero e o clique caía no "saldo insuficiente" antes de alcançar o
 * cancelamento — o dinheiro parecia ter sumido. A nossa interface de fichas usa
 * o clique no mesmo lutador para REAJUSTAR o valor, que é ação normal aqui, e
 * empilhar cancelar em cima disso traria a ambiguidade de volta.
 *
 * O botão nunca depende de saldo, e é isso que preserva a lição dele: desfazer
 * não pode exigir ter dinheiro.
 *
 * DUAS DEVOLUÇÕES, e as duas são obrigatórias:
 *   passivo   `liberarTicket` — sem isso o mercado daquele lutador fica travado
 *             o resto da rodada por causa de uma aposta que não existe mais
 *   carteira  `devolverAposta` pela COMPOSIÇÃO, não pelo valor — devolver "o
 *             valor" transformaria bônus em transferível a cada cancelamento,
 *             que é exatamente o que a proveniência do §5.5 impede
 */
function cancelarAposta(){
  if (S.state !== 'betting' || !S.myBet) return;
  const { idx, amount, odd, composicao } = S.myBet;
  liberarTicket(S.passivo, idx, amount, odd);
  devolverAposta(composicao, 'cancelamento');
  S.myBet = null;
  emitir('bet_cancelled', { lutador: S.fighters[idx].n, odd, valor: amount });
  atualizarSaldo();
  markMyPlate();
  document.querySelectorAll('.pick').forEach(p => p.classList.remove('sel'));
  $('#betInfo').innerHTML = 'Aposta cancelada — valor devolvido. '
    + 'Você pode escolher outro lutador ou ficar de fora desta rodada.';
}

export {
  cancelarAposta,
  markMyPlate,
  placeBet,
};
