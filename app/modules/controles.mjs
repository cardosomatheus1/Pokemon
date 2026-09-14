/* Controles — botões e sliders do painel lateral e do modo Dev.
 *
 * Fronteira: traduz clique em chamada. Não guarda regra. */

import { $ } from './dom.mjs';
import { MOEDA } from './motor.mjs';
import { S } from './estado.mjs';
import { atualizarFichas } from './carteira.mjs';
import { saldo, travado } from './banco.mjs';
import { closeModal, renderSession } from './navegacao.mjs';
import { renderProfile } from './customizacao.mjs';
import { saveProfile } from './perfil.mjs';

/* ------------------------- CONTROLES ------------------------- */
/* `saveBal` sumiu no F0.9. Persistir virou responsabilidade de banco.mjs, que
   grava junto com o lançamento no ledger — salvar saldo sem lançamento é
   exatamente o que o §5.5 proíbe. O que sobrou aqui é redesenhar. */

/* Um só lugar redesenha o saldo — carteira, cabeçalho e o equivalente em
   reais. Antes só o número da esquerda era atualizado, e agora que o
   valor aparece em quatro lugares isso viraria dessincronia garantida. */
function atualizarSaldo(){
  const s = saldo();
  const fmt = s.toLocaleString('pt-BR');
  const el = $('#bal'); if (el) el.textContent = fmt;
  /* O saldo é PokéCash e só. Ver a nota longa em carteira.mjs. */
  const br = $('#balBrl'); if (br) br.textContent = MOEDA;
  const wb = $('#wBal'); if (wb) wb.textContent = fmt;
  const wr = $('#wBalBrl'); if (wr) wr.textContent = MOEDA;
  /* ── O CADEADO PRECISA APARECER (1.26) ────────────────────────────────
   *
   * Um saldo trancado que o jogador não vê é um saldo que ele acha que
   * PERDEU — e a primeira recusa de boost viraria um relato de bug.
   *
   * O selo só existe quando existe restrito: um cadeado permanente na tela
   * viraria mobília, e mobília não avisa nada. E ele diz o número, porque
   * "parte do seu saldo" não deixa ninguém planejar. */
  const t = travado();
  const cad = $('#balTrava');
  if (cad) {
    cad.hidden = t <= 0;
    cad.textContent = t > 0 ? `🔒 ${t.toLocaleString('pt-BR')}` : '';
    cad.title = t > 0
      ? `${t.toLocaleString('pt-BR')} de PokéCash comprado: serve para APOSTA e ` +
        'COSMÉTICO, e não compra poder. Ganhando uma aposta, o lucro cai livre.'
      : '';
  }
  atualizarFichas();
}


/* --------- perfil e depósito --------- */
/* os botões de perfil/depósito agora nascem dentro de renderSession(),
   junto do chip do treinador — por isso não há listener fixo aqui. */
$('#profileModal').addEventListener('click', e => { if (e.target.id === 'profileModal') closeModal('#profileModal'); });
$('#depositModal').addEventListener('click', e => { if (e.target.id === 'depositModal') closeModal('#depositModal'); });
$('#btnProfSave').onclick = () => {
  const v = $('#profName').value.trim().slice(0,18) || 'Treinador';
  S.profile.name = v; saveProfile(S.profile); renderProfile(); renderSession();
};

/* --------- abas do perfil --------- */
document.querySelectorAll('#profileModal .tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('#profileModal .tab').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('#profileModal .pane').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $('#' + b.dataset.pane).classList.add('on');
});

export {
  atualizarSaldo,
};
