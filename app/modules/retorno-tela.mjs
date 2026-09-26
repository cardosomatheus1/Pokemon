/* O CARTÃO "DESDE A SUA ÚLTIMA VISITA" NA INÍCIO (ST-9.17 · §7.16, §13).
 *
 * Camada 4: pinta o que `retorno-dados.mjs` devolve. O cartão é calculado UMA
 * vez, ao abrir, contra a foto da visita anterior — e só DEPOIS a foto desta
 * visita é gravada. A foto é regravada ao sair (pagehide): o que o jogador viu
 * acontecer com a aba aberta não é novidade na próxima vez.
 *
 * In-app e só ao abrir (§13): nenhum relógio, nenhuma notificação por rodada.
 */
import { $ } from './dom.mjs';
import { dexImg } from './sprites.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { carregarMarcas } from './pokedex-estado.mjs';
import { cartaoDeRetorno, fotoDaVisita, haQuanto } from './retorno-dados.mjs';

const CHAVE = 'ar_retorno';
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); } catch { return null; } };

const CARTAO = cartaoDeRetorno({ pack: PACK, estado: carregar(), marcas: carregarMarcas(), anterior: ler(),
                                 agora: Date.now(), nomeDe: nomeExibido });
/* Só agora, com o cartão lido: gravar antes apagaria a novidade. */
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(fotoDaVisita(carregar(), Date.now()))); } catch { /* privativo */ } };
gravar();
addEventListener('pagehide', gravar);

export const temRetorno = () => !!CARTAO;

export function pintarRetorno() {
  const alvo = $('#retorno');
  if (!alvo) return;
  if (!CARTAO) { alvo.hidden = true; return; }
  alvo.hidden = false;
  alvo.innerHTML = `
    <div class="rtTopo"><h3>Desde a sua última visita</h3><span class="tiny">${haQuanto(Date.now() - CARTAO.desde)}</span>
      <button class="rtFechar" data-retorno-fechar aria-label="Fechar">×</button></div>
    <ul class="rtLista">${CARTAO.itens.map(i => `<li class="rt-${i.tipo}">${i.dex ? dexImg(i.dex, '', 'class="rtSprite"') : '<span class="rtSprite"></span>'}<span>${i.texto}</span></li>`).join('')}</ul>
    <button class="btn gold" data-goto="${CARTAO.proximo.goto}">${CARTAO.proximo.texto} →</button>`;
}

document.addEventListener('click', ev => {
  if (ev.target.closest('[data-retorno-fechar]')) { const a = $('#retorno'); if (a) a.hidden = true; }
});

pintarRetorno();
