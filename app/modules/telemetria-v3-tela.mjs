/* OS EVENTOS DA V3, LIGADOS AOS GESTOS — camada 4 (ST-9.18).
 *
 * Nenhuma tela ganhou uma linha por causa da telemetria: os gestos de evoluir,
 * dar doce e soltar são ouvidos na CAPTURA do clique (antes do dono deles) e
 * relatados pela diferença do save depois dele; o comparador, pelo `toggle`
 * do painel de golpes. A Pokédex chama `consultouDossie` quando a ficha
 * mostra um dossiê aberto.
 *
 * `relatar` não lança e sem conta não manda nada — o jogo local continua
 * sendo o jogo local. O conjunto `enviadas` só poupa rede: quem garante que o
 * reenvio não duplica é a chave, no servidor.
 */
import { api } from './api.mjs';
import { PACK } from './motor.mjs';
import { S } from './estado.mjs';
import { carregar } from './idle-dados.mjs';
import { relatar } from './telemetria-servidor.mjs';
import { eventoDoDossie, eventoDoComparador, eventosDoGesto } from './telemetria-v3.mjs';

const enviadas = new Set();
function enviar(eventos) {
  const novos = eventos.filter(e => !enviadas.has(e.chave));
  for (const e of novos) enviadas.add(e.chave);
  if (novos.length) relatar(api, novos);
}

export function consultouDossie(dex) {
  enviar([eventoDoDossie({ dex, rodada: S.rodadaId ?? null, antesDeApostar: S.state === 'betting' && !S.myBet, agora: Date.now() })]);
}

document.addEventListener('click', ev => {
  const b = ev.target.closest?.('[data-evoluir],[data-dar-doce],[data-soltar]');
  if (!b) return;
  const id = b.dataset.evoluir ?? b.dataset.darDoce ?? b.dataset.soltar;
  let antes;
  try { antes = carregar(); } catch { return; }
  /* O dono do clique grava de forma síncrona; o save de depois está pronto
     no próximo giro. */
  setTimeout(() => {
    try { enviar(eventosDoGesto(PACK, antes, carregar(), { id, agora: Date.now() })); } catch { /* telemetria nunca derruba */ }
  }, 0);
}, true);

document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (!d?.matches?.('details[data-golpes-de]') || !d.open) return;
  try {
    const c = carregar().criaturas.find(x => x.id === d.dataset.golpesDe);
    if (c) enviar([eventoDoComparador({ id: c.id, dex: c.dex, agora: Date.now() })]);
  } catch { /* idem */ }
}, true);
