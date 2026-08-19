/* Controles — botões e sliders do painel lateral e do modo Dev.
 *
 * Fronteira: traduz clique em chamada. Não guarda regra. */

import { $ } from './dom.mjs';
import { S } from './estado.mjs';
import { atualizarFichas, emReais } from './carteira.mjs';
import { saldo } from './banco.mjs';
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
  const br = $('#balBrl'); if (br) br.textContent = emReais(s);
  const wb = $('#wBal'); if (wb) wb.textContent = fmt;
  const wr = $('#wBalBrl'); if (wr) wr.textContent = emReais(s);
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
