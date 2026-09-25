/* O RELATO DO CLIENTE PARA O SERVIDOR — camada 0 (ST-7.1a, OBS-01).
 *
 * O idle mora no navegador, e até aqui o que acontecia nele morria nele: o
 * buffer de eventos do cliente ficava em memória e nunca saía. Para o piloto,
 * isso quer dizer medir a arena e não medir a parte do jogo que fica aberta
 * por horas.
 *
 * ── RELATA O ESTADO, E NÃO O CLIQUE ────────────────────────────────────────
 *
 * Nenhum `onclick` ganha uma linha de telemetria. O que sai daqui é o DIA,
 * lido do estado que já está salvo: as runs e as expedições colhidas nas
 * últimas 24 h, cada uma com a chave do próprio fato (`run:<colhidaEm>`,
 * `exp:<id>`). Reenviar o mesmo dia não duplica nada — o servidor ignora a
 * chave repetida —, e por isso o relato pode sair em qualquer momento
 * (colheita, login) sem contar o mesmo fato duas vezes. Quem clicou em outra
 * aba, ou jogou sem rede, aparece no próximo relato.
 *
 * ── TELEMETRIA NUNCA DERRUBA O JOGO ───────────────────────────────────────
 *
 * `relatar` não lança, e sem conta real não manda nada: sem sessão não há de
 * quem ser o evento, e o jogo local continua sendo o jogo local. */

const DIA_MS = 86400e3;
const recente = (colhidaEm, agora) =>
  Number.isFinite(colhidaEm) && colhidaEm > agora - DIA_MS && colhidaEm <= agora;

export function eventosDoEstado(e, agora) {
  const runs = (e?.avancos ?? [])
    .filter(r => recente(r?.colhidaEm, agora))
    .map(r => ({ nome: 'run_harvested', chave: `run:${r.colhidaEm}`,
                 campos: { bioma: String(r.bioma ?? ''), estagio: r.estagio ?? 0, encontros: r.encontros ?? 0 } }));
  const exps = (e?.expedicoes ?? [])
    .filter(x => x?.id && recente(x.colhidaEm, agora))
    .map(x => ({ nome: 'expedition_harvested', chave: `exp:${x.id}`,
                 campos: { bioma: String(x.bioma ?? ''), perfil: String(x.perfil ?? ''), encontros: x.encontros ?? 0 } }));
  /* O teto do servidor é 50 por relato; o dia normal fica muito abaixo. */
  return [...runs, ...exps].slice(-50);
}

export async function relatar(api, eventos) {
  if (!api?.temSessao?.() || !eventos?.length) return false;
  try {
    const r = await api.post('/api/telemetria', { eventos });
    return !!r?.ok;
  } catch { return false; }
}

/* A chave da presença: um `session_started` por dia de Brasília. */
export const diaDaSessao = agora => `dia:${Math.floor((agora - 3 * 3600e3) / DIA_MS)}`;
