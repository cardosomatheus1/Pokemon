/* QUANDO VOLTA O QUE VALE (ST-2.27a · DEC-28 · DEC-30 · L-243 · L-244) — camada 0.
 *
 * O dono: "não quero o cara entrando no jogo por 1h e deixando 23h parado".
 * O teto de encontros continua a janela de 24 h (a DEC-30 mediu o balde e o
 * recusou: nenhum ritmo deixava o dia como estava). O que muda é que o "não"
 * passa a ter HORA: o próximo encontro volta quando o mais antigo sai da
 * janela, e a equipe sai quando o mais cansado tiver a stamina da run.
 *
 * Só contas de tempo, e a frase. A tela pinta.
 */
import { staminaAgora, REGEN_POR_HORA, TETO_ENCONTROS } from '../../engine/expedicao.mjs';
import { STAMINA_DO_AVANCO } from '../../engine/avanco.mjs';
import { relogioDoMundo } from './hora-do-dia.mjs';

const H = 3600_000, DIA = 24 * H;

/* A primeira hora, de agora em diante, em que o teto comporta `precisa`
   encontros. A janela é a do teto: cada lançamento sai dela 24 h depois de
   colhido. `reservado` é o que já está comprometido e ainda não foi colhido
   (a run aberta, as expedições em campo). `null` quando nunca cabe. */
export function quandoVoltaEncontro(lancamentos, agora, { teto = TETO_ENCONTROS, reservado = 0, precisa = 1 } = {}) {
  const dentro = (lancamentos ?? []).filter(x => Number.isFinite(x?.colhidaEm) && x.colhidaEm > agora - DIA && x.colhidaEm <= agora
    && Number.isFinite(x.encontros) && x.encontros > 0);
  let usados = dentro.reduce((a, x) => a + x.encontros, 0);
  const cabe = () => teto - reservado - usados >= precisa;
  if (cabe()) return agora;
  for (const x of [...dentro].sort((a, b) => a.colhidaEm - b.colhidaEm)) {
    usados -= x.encontros;
    if (cabe()) return x.colhidaEm + DIA;
  }
  return null;
}

/* A hora em que TODOS da equipe têm a stamina da run: a do mais cansado. */
export function quandoCabeRun(membros, agora, { custo = STAMINA_DO_AVANCO, regen = REGEN_POR_HORA } = {}) {
  if (!membros?.length) return null;
  const falta = Math.max(...membros.map(m => Math.max(0, custo - staminaAgora(m, agora))));
  return falta <= 0 ? agora : agora + Math.ceil(falta / regen * H);
}

/* A hora no relógio do mundo (Brasília), e "amanhã" quando passa do dia. */
function hora(ts, agora) {
  const d = new Date(relogioDoMundo(ts)), hoje = new Date(relogioDoMundo(agora));
  const hm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return d.getUTCDate() !== hoje.getUTCDate() ? `amanhã às ${hm}` : `às ${hm}`;
}

/* A frase: só o que ainda NÃO está disponível. `null` quando tudo já está. */
export function fraseDaVolta({ encontro = null, run = null } = {}, agora) {
  const partes = [];
  if (Number.isFinite(encontro) && encontro > agora) partes.push(`o próximo encontro volta ${hora(encontro, agora)}`);
  if (Number.isFinite(run) && run > agora) partes.push(`a equipe pode sair de novo ${hora(run, agora)}`);
  if (!partes.length) return null;
  const f = partes.join(' · ');
  return f[0].toUpperCase() + f.slice(1) + '.';
}
