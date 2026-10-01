/* OS EVENTOS DA V4, LIGADOS À JORNADA — camada 4 (ST-10.20).
 *
 * A jornada chama `relatarChance` quando a chance do painel termina de ser
 * calculada — o evento é montado na camada 0 (`telemetria-v4.mjs`). A LUTA e
 * o GINÁSIO não são mais relatados daqui (ST-13.5f · L-208): com conta, o
 * servidor luta e os anota como fato; sem conta, não havia para quem relatar.
 * `relatar` não lança e sem conta não manda nada: o jogo local continua sendo
 * o jogo local. O conjunto `enviadas` só poupa rede; quem garante que o
 * reenvio não duplica é a chave, no servidor.
 */
import { api } from './api.mjs';
import { relatar } from './telemetria-servidor.mjs';
import { eventoDaChance } from './telemetria-v4.mjs';

const enviadas = new Set();
function enviar(eventos) {
  const novos = eventos.filter(e => !enviadas.has(e.chave));
  for (const e of novos) enviadas.add(e.chave);
  if (novos.length) relatar(api, novos);
}

export function relatarChance({ no, p, preset, timeA }) {
  try { enviar([eventoDaChance({ no, p, preset, timeA, agora: Date.now() })]); } catch { /* telemetria nunca derruba */ }
}
