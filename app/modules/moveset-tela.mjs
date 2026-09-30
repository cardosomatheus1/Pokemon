/* ESCOLHER OS GOLPES — o clique (ST-9.12 · F3.6).
 *
 * Camada 4. A regra (até 4, sem repetir, só o que o nível liberou) mora em
 * `moveset-dados.mjs`; aqui só se grava, com a revisão da ST-3.2, e se
 * repinta — reabrindo o painel da criatura, que a repintura fecharia.
 */
import { PACK } from './motor.mjs';
import { carregar, salvar } from './idle-dados.mjs';
import { alternarGolpe } from './moveset-dados.mjs';
import { renderIdle } from './idle-tela.mjs';
import { naContaOu } from './colecao-acoes.mjs';   // ST-13.5d: com conta, pelo servidor

export function trocarGolpe(id, nome, deposito = globalThis.localStorage) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const e = carregar(deposito);
    const c = e.criaturas.find(x => x.id === id);
    if (!c) return { ok: false, motivo: 'esta criatura não existe' };
    const r = alternarGolpe(PACK, c, nome);
    if (!r.ok) return r;
    c.golpes = r.golpes;
    if (salvar(e, deposito)) return r;
  }
  return { ok: false, motivo: 'outra aba gravou ao mesmo tempo — tente de novo' };
}

if (typeof document !== 'undefined') document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-golpe][data-cria]');
  if (!b) return;
  const r = await naContaOu('/api/idle/golpe', { id: b.dataset.cria, nome: b.dataset.golpe }, d => trocarGolpe(b.dataset.cria, b.dataset.golpe, d));
  if (!r.ok) { b.title = r.motivo; b.classList.add('recusado'); return; }
  renderIdle();
  for (const d of document.querySelectorAll(`[data-golpes-de="${b.dataset.cria}"]`)) d.open = true;
});
