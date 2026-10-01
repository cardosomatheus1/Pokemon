/* EVOLUIR QUE CUSTA UM GOLPE, OU QUE PRENDE — o clique em dois tempos (ST-10.3 · §7.10 · ST-14.3d).
 *
 * Camada 4. Quando evoluir AGORA perde um golpe exclusivo, o primeiro clique
 * no selo só ARMA: ele passa a dizer o que se perde e pede o segundo. Evoluir
 * é irreversível, e perder um golpe por um esbarrão é o mesmo defeito que o
 * soltar em dois tempos (ST-9.8) existe para evitar.
 *
 * Ouvido na CAPTURA do clique, antes do dono (o `idle-tela`, na bolha): no
 * primeiro clique a propagação para aqui; no segundo o clique segue e a
 * evolução acontece onde sempre aconteceu. A decisão (o que se perde) é do
 * `engine/exclusivos.mjs`.
 */
import { PACK } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { perdidosAoEvoluir } from '../../engine/exclusivos.mjs';
import { avisoDaPedra, textoDoArmeDaEvolucao } from './prende-dados.mjs';

document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-evoluir]');
  if (!b || b.dataset.armado === '1') return;          // o segundo clique segue para o dono
  let c = null, E = null;
  try { E = carregar(); c = E.criaturas.find(x => x.id === b.dataset.evoluir); } catch { return; }
  /* ST-14.3d: a pedra de lote preso também arma — o texto diz as duas coisas. */
  const texto = c ? textoDoArmeDaEvolucao(perdidosAoEvoluir(PACK, c), avisoDaPedra(PACK, c, E.bolsa, E.lotes)) : null;
  if (!texto) return;
  ev.stopImmediatePropagation();
  ev.preventDefault();
  b.dataset.armado = '1';
  b.classList.add('armado');
  b.textContent = texto;
}, true);
