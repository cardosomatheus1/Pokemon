/* SOLTAR NA CAIXA — o clique, com confirmação (ST-9.8 · F3.8 · §7.6).
 *
 * Camada 4. O primeiro clique ARMA o botão ("confirmar: +2 doce"); o segundo
 * solta. Soltar é irreversível, e um clique só perderia criatura por um
 * esbarrão. A decisão (quem pode ser solta, quanto doce) mora em
 * `doce-dados.mjs`; a gravação, em `doce-local.mjs`. Quem repinta é o idle.
 *
 * O `index.html` importa este módulo: sem o import ele nunca é CARREGADO, e o
 * botão ficaria na tela sem fazer nada.
 */
import { PACK } from './motor.mjs';
import { soltarNa, darDoceNa } from './colecao-acoes.mjs';   // ST-13.5d: com conta, pelo servidor
import { renderIdle } from './idle-tela.mjs';

document.addEventListener('click', async ev => {
  /* ST-9.10: dar doce não pede confirmação — ele não tira nada que não volte
     (é o doce da própria linha virando nível). */
  const d = ev.target.closest('[data-dar-doce]');
  if (d) {
    const r = await darDoceNa({ pack: PACK, id: d.dataset.darDoce });
    if (r?.ok === false) { d.textContent = r.motivo; return; }
    renderIdle();
    return;
  }
  /* ST-5.12 (L-195): o soltar armado ganha um CANCELAR à vista — antes ele
     só desarmava quando a tela repintava, e desistir de um gesto
     irreversível não pode depender de esperar. */
  const cancelar = ev.target.closest('[data-soltar-cancelar]');
  if (cancelar) {
    const alvo = cancelar.parentElement?.querySelector(`[data-soltar="${cancelar.dataset.soltarCancelar}"]`);
    if (alvo) { alvo.dataset.armado = '0'; alvo.classList.remove('armado'); alvo.textContent = alvo.dataset.rotulo ?? alvo.textContent; }
    cancelar.remove();
    return;
  }
  const b = ev.target.closest('[data-soltar]');
  if (!b) return;
  if (b.dataset.armado !== '1') {
    b.dataset.armado = '1';
    b.dataset.rotulo = b.textContent.trim();
    b.classList.add('armado');
    b.textContent = `confirmar: soltar (+${b.dataset.doce} doce)`;
    b.insertAdjacentHTML('afterend', `<button class="idleSoltarCancelar" data-soltar-cancelar="${b.dataset.soltar}">cancelar</button>`);
    return;
  }
  const r = await soltarNa({ pack: PACK, id: b.dataset.soltar });
  if (r?.ok === false) { b.textContent = r.motivo; b.dataset.armado = '0'; b.classList.remove('armado'); return; }
  renderIdle();
});
