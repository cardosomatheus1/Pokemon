/* OS EVENTOS DA V4, MONTADOS — camada 0 (ST-10.20 · F4.9 · §8.15).
 *
 * Três fatos da jornada, cada um com a CHAVE do próprio fato — o reenvio não
 * duplica (o servidor ignora a chave repetida, ST-7.1a):
 *
 *   pve_iniciado      a luta: o nó, a chance EXIBIDA antes dela, o preset, o
 *                     time (as espécies) e se venceu. Chave: o nó e a semente
 *                     — a luta gravada é uma só (`jornada-local`)
 *   ginasio_vencido   a insígnia, uma vez por ginásio
 *   p_exibida         a chance que o painel mostrou, mesmo sem lutar: é o que
 *                     separa "olhou 6% e desistiu" de "nunca viu o ginásio".
 *                     Uma por nó, time, preset e dia
 *
 * O TIME REFEITO não sai daqui: o servidor o deriva da sequência de lutas.
 * Um fato a menos que o cliente pode inventar.
 *
 * Os campos respeitam o que o servidor aceita (`receberDoCliente`): número,
 * booleano e texto de até 40 caracteres — as espécies vão como "7,16,143".
 */
const dia = agora => Math.floor((agora - 3 * 3600e3) / 86400e3);
const especies = timeA => (timeA ?? []).map(c => Number(c.dex)).filter(Number.isFinite).sort((a, b) => a - b);
/* Assinatura curta do time (espécie e nível): outro nível é outro time. */
function assinatura(timeA) {
  let h = 5381;
  for (const ch of (timeA ?? []).map(c => `${c.dex}@${c.nivel}`).sort().join('|')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export const eventoDaLuta = ({ no, semente, p, preset, timeA, venceu, agora }) => ({
  nome: 'pve_iniciado', chave: `pve:${no}:${semente}`,
  campos: { em: agora, no: String(no), p: Math.round(Number(p) * 1000) / 1000, preset: String(preset ?? 'balanced'),
            venceu: venceu === true, tamanho: (timeA ?? []).length, especies: especies(timeA).join(',').slice(0, 40) },
});

export const eventoDoGinasio = ({ no, insignia, agora }) => ({
  nome: 'ginasio_vencido', chave: `gin:${no}`, campos: { em: agora, no: String(no), insignia: String(insignia ?? '') },
});

export const eventoDaChance = ({ no, p, preset, timeA, agora }) => ({
  nome: 'p_exibida', chave: `p:${no}:${dia(agora)}:${preset}:${assinatura(timeA)}`,
  campos: { em: agora, no: String(no), p: Math.round(Number(p) * 1000) / 1000, preset: String(preset ?? 'balanced') },
});
