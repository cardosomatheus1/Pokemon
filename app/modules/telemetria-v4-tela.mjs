/* OS EVENTOS DA V4, LIGADOS À JORNADA — camada 4 (ST-10.20).
 *
 * A jornada chama duas funções: `relatarLuta` depois da luta gravada, e
 * `relatarChance` quando a chance do painel termina de ser calculada. Nenhuma
 * decide nada — os eventos são montados na camada 0 (`telemetria-v4.mjs`).
 * `relatar` não lança e sem conta não manda nada: o jogo local continua sendo
 * o jogo local. O conjunto `enviadas` só poupa rede; quem garante que o
 * reenvio não duplica é a chave, no servidor.
 */
import { api } from './api.mjs';
import { relatar } from './telemetria-servidor.mjs';
import { eventoDaLuta, eventoDoGinasio, eventoDaChance } from './telemetria-v4.mjs';

const enviadas = new Set();
function enviar(eventos) {
  const novos = eventos.filter(e => !enviadas.has(e.chave));
  for (const e of novos) enviadas.add(e.chave);
  if (novos.length) relatar(api, novos);
}

export function relatarLuta(r, { no, p, preset, insignia }) {
  try {
    const agora = Date.now();
    enviar([eventoDaLuta({ no, semente: r.semente, p, preset, timeA: r.timeA, venceu: r.resultado?.vencedor === 'A', agora }),
            ...(r.ganhouInsignia ? [eventoDoGinasio({ no, insignia: insignia ?? r.ganhouInsignia, agora })] : [])]);
  } catch { /* telemetria nunca derruba */ }
}

export function relatarChance({ no, p, preset, timeA }) {
  try { enviar([eventoDaChance({ no, p, preset, timeA, agora: Date.now() })]); } catch { /* idem */ }
}
