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
import { retornoLiquidoEstimado } from '../../engine/resultado.mjs';
import { APOSTA_MIN, valorAposta } from './banco.mjs';
import { CONF, CUR, MOEDA } from './motor.mjs';
import { avaliarAposta, liberarTicket, registrarTicket } from '../../engine/exposicao.mjs';
import { emitir } from './telemetria.mjs';
import { S } from './estado.mjs';
import { selRing } from './rodada.mjs';
import { atualizarSaldo } from './controles.mjs';
import { devolverAposta, reservarAposta, modoServidor, hidratar } from './banco.mjs';
import { api } from './api.mjs';
import { posSelRing } from './coreografia.mjs';
import { renderKillfeed } from './killfeed.mjs';
import { renderBattleBanner } from './banner.mjs';

/* A CHAMADA CENTRAL DIZ O QUE ESTÁ VALENDO, E MUDA QUANDO O ESTADO MUDA.
 *
 * Duas coisas erradas de uma vez, medidas pelo crítico cego (L-030, itens 6 e a
 * segunda metade do 1):
 *
 *   · o painel dizia "escolha um lutador **na arena**" e o canvas dizia
 *     "escolha seu lutador **na lista de odds**". Duas instruções para a mesma
 *     ação, apontando para lugares diferentes, na mesma tela;
 *   · e nenhuma das duas mudava depois da aposta confirmada. O jogador via a
 *     linha do Magneton acesa, o retorno calculado, o botão de cancelar — e o
 *     centro da tela ainda mandando ele escolher.
 *
 * Instrução que não sai depois de cumprida ensina que a tela não está prestando
 * atenção. Aqui ela passa a ser derivada do estado, num lugar só, e quem muda o
 * estado chama isto. */
function atualizarCTA(){
  const overlay = $('#overlay'); if (!overlay) return;
  const banner = overlay.querySelector('.banner') || overlay;
  if (S.state !== 'betting'){ overlay.classList.remove('on'); return; }
  if (S.myBet){
    const f = S.fighters[S.myBet.idx];
    banner.innerHTML =
      `<b>${f.n}</b> é a sua aposta · x${S.myBet.odd.toFixed(2)}` +
      `<i>toque em outro para trocar</i>`;
    overlay.classList.add('apostado');
  } else {
    banner.innerHTML = 'Escolha seu lutador na lista de odds<i>a rodada corre sozinha depois</i>';
    overlay.classList.remove('apostado');
  }
}

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

/* ── A APOSTA EM MODO SERVIDOR (F1.14) ──────────────────────────────────────
 *
 * O cliente deixa de decidir qualquer coisa sobre dinheiro. Ele manda slot e
 * valor, e o servidor responde — com o ticket ou com a recusa. Os tetos do
 * §4.4.6, os limites do §28.3 e a pausa do §28.4 são conferidos LÁ, que é o
 * único lugar onde conferir significa alguma coisa.
 *
 * ── SILÊNCIO NÃO É RECUSA, E AQUI ISSO CUSTA CARO ──────────────────────────
 *
 * O `api.mjs` distingue "o servidor recusou" de "o servidor não respondeu"
 * porque a tela de proteção dizia "entre na sua conta" para quem não tinha
 * backend nenhum. Na aposta o erro equivalente é pior nos dois sentidos:
 * dizer "recusada" quando a rede caiu faz o jogador tentar de novo — e a
 * primeira pode ter chegado. Duas apostas por causa de uma mensagem.
 *
 * Então falha de rede tem texto próprio, e ele NÃO convida a repetir.
 */
async function apostarNoServidor(idx, pedido) {
  const r = await api.post('/api/aposta', { slot: idx, valor: pedido });

  if (r.indisponivel) {
    $('#betInfo').innerHTML =
      `<b>Não consegui falar com o servidor.</b><br>` +
      `<span class="tiny">A aposta pode ou não ter sido registrada — não repita. ` +
      `Assim que a conexão voltar, o que valeu aparece aqui.</span>`;
    return;
  }
  if (!r.ok) {
    /* A MENSAGEM É A DO SERVIDOR, e não uma tradução nossa. Ele é quem sabe
       qual limite, quanto falta e quando volta (§28.3), e reescrever aqui
       criaria uma segunda fonte que envelhece calada. */
    $('#betInfo').innerHTML = `<b>${r.corpo?.erro || 'Aposta recusada.'}</b>`;
    return;
  }

  const t = r.corpo;
  /* A CARTEIRA VEM DO SERVIDOR DEPOIS DE CADA APOSTA. Descontar aqui e
     confiar seria o cliente virando fonte de dinheiro de novo — e a reserva
     por bucket (§5.5) é do ledger de lá. */
  await hidratar();
  /* OS NOMES SÃO OS DA ROTA. Ela devolve `valor` e `composicao`; chamar de
     `stake` aqui foi um `undefined` que derrubou o banner inteiro no primeiro
     clique — e nenhum teste de módulo o pegou, porque cada lado estava certo
     sozinho. `test/rotas.mjs` agora cobra que o ticket traga o que o cliente
     lê, derivando a lista deste arquivo. */
  S.myBet = { idx, amount: t.valor, odd: t.odd, composicao: t.composicao, ticket: t.id };
  emitir('bet_confirmed', { valor: t.valor, odd: t.odd, composicao: t.composicao });
  atualizarSaldo();
  markMyPlate();
  atualizarCTA();
  document.querySelectorAll('.pick').forEach(p => p.classList.toggle('sel', +p.dataset.i === idx));
  $('#betInfo').innerHTML =
    `<b>${CUR} ${t.valor.toLocaleString('pt-BR')}</b> em <b>${S.fighters[idx].n}</b> (x${t.odd.toFixed(2)})<br>
     retorno se vencer: <b style="color:var(--gold)">${CUR} ${Math.floor(t.valor * t.odd).toLocaleString('pt-BR')}</b>
     <span class="tiny">(lucro de ${CUR} ${retornoLiquidoEstimado(t.valor, t.odd).toLocaleString('pt-BR')})</span>
     <button class="btn cancelBet" id="btnCancelBet">✕ Cancelar aposta e ficar de fora</button>`;
  $('#btnCancelBet').onclick = cancelarAposta;
}

async function placeBet(idx, row){
  if (S.state !== 'betting') return;
  const pedido = valorAposta();
  if (pedido < APOSTA_MIN){
    $('#betInfo').innerHTML = `<b>Saldo insuficiente.</b> A aposta mínima é ${CUR} ${APOSTA_MIN} `
      + `. Complete um desafio diário ou compre ${MOEDA}.`;
    return;
  }

  /* O MODO DECIDE QUEM DECIDE, e a bifurcação é uma linha só, num lugar só.
     Espalhar `if (modoServidor())` pelo corpo abaixo criaria caminhos
     meio-migrados — o defeito que o bloco inteiro existe para não ter. */
  if (modoServidor()) return apostarNoServidor(idx, pedido);

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
  atualizarCTA();
  document.querySelectorAll('.pick').forEach(p => p.classList.toggle('sel', +p.dataset.i === idx));
  const corte = veredito.cortado
    ? `<br><span class="tiny" id="avisoCorte" style="color:var(--gold)">${veredito.mensagem}</span>`
    : '';
  $('#betInfo').innerHTML =
    `<b>${CUR} ${amount.toLocaleString('pt-BR')}</b> em <b>${S.fighters[idx].n}</b> (x${o.odd.toFixed(2)})<br>
     retorno se vencer: <b style="color:var(--gold)">${CUR} ${Math.floor(amount*o.odd).toLocaleString('pt-BR')}</b>
     <span class="tiny">(lucro de ${CUR} ${retornoLiquidoEstimado(amount, o.odd).toLocaleString('pt-BR')})</span>
${corte}
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
async function cancelarAposta(){
  if (S.state !== 'betting' || !S.myBet) return;

  if (modoServidor()) {
    const r = await api.post('/api/aposta/cancelar', {});
    if (r.indisponivel) {
      $('#betInfo').innerHTML =
        `<b>Não consegui falar com o servidor.</b><br>` +
        `<span class="tiny">Sua aposta continua como está. Tente de novo quando a ` +
        `conexão voltar — ela não se perde.</span>`;
      return;
    }
    if (!r.ok) { $('#betInfo').innerHTML = `<b>${r.corpo?.erro || 'Não deu para cancelar.'}</b>`; return; }
    await hidratar();
    const cancelada = S.myBet;
    S.myBet = null;
    emitir('bet_cancelled', { lutador: S.fighters[cancelada.idx]?.n, odd: cancelada.odd, valor: cancelada.amount });
    atualizarSaldo();
    markMyPlate();
    atualizarCTA();
    document.querySelectorAll('.pick').forEach(p => p.classList.remove('sel'));
    $('#betInfo').innerHTML = 'Aposta cancelada — valor devolvido. '
      + 'Você pode escolher outro lutador ou ficar de fora desta rodada.';
    return;
  }

  const { idx, amount, odd, composicao } = S.myBet;
  liberarTicket(S.passivo, idx, amount, odd);
  devolverAposta(composicao, 'cancelamento');
  S.myBet = null;
  emitir('bet_cancelled', { lutador: S.fighters[idx].n, odd, valor: amount });
  atualizarSaldo();
  markMyPlate();
  atualizarCTA();
  document.querySelectorAll('.pick').forEach(p => p.classList.remove('sel'));
  $('#betInfo').innerHTML = 'Aposta cancelada — valor devolvido. '
    + 'Você pode escolher outro lutador ou ficar de fora desta rodada.';
}

export {
  atualizarCTA,
  cancelarAposta,
  markMyPlate,
  placeBet,
};
