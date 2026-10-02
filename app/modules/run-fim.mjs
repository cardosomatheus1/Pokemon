/* O FIM DA RUN (ST-2.22c, D-146) — camada 0, puro.
 *
 * O dono, jogando como quem chega: "a run falhou e perdi tudo: XP, capturas e
 * histórico". Não tinha perdido — o servidor guardava tudo, e a linha do
 * histórico dizia "caiu na wave 8". O que faltava era a tela DIZER: o painel
 * da run some quando ela acaba, e o saque entrava calado (XP e moeda pulavam,
 * e o jogador leu o pulo como erro de saldo).
 *
 * Duas decisões moram aqui, e a tela só pinta:
 *
 *   quando tentar de novo   a colheita que o servidor recusou ("a run ainda
 *                           está acontecendo" — o aparelho viu a queda um
 *                           fio antes) volta a ser pedida, com espera
 *                           crescente e teto
 *   o que dizer             onde a run acabou, o que ficou, e o que se perdeu
 *                           — a regra do §7.22.8 em uma frase: falhar custa o
 *                           baú, nunca o farm
 */
import { WAVES } from '../../engine/wave.mjs';

export const ESPERA_DA_COLHEITA_MS = 1500;
export const ESPERA_MAX_MS = 30_000;
export const esperaDaColheita = n => Math.min(ESPERA_MAX_MS, ESPERA_DA_COLHEITA_MS * 2 ** Math.max(0, Math.floor(Number(n) || 0)));

const inteiro = v => Math.max(0, Math.floor(Number(v) || 0));

function oQueFicou(r, moeda) {
  const xp = inteiro(r.rendeu?.xp), m = inteiro(r.rendeu?.moedas);
  const enc = Array.isArray(r.encontros) ? r.encontros.length : inteiro(r.encontros);
  const partes = [];
  if (xp) partes.push(`+${xp} XP`);
  if (m) partes.push(`+${m} ${moeda}`);
  if (enc) partes.push(`${enc} ${enc === 1 ? 'encontro esperando' : 'encontros esperando'} a bola`);
  if (!partes.length) return null;
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}

/* ST-2.26: o dono — "o limite diário de encontros zera a run sem avisar".
   A run com o teto do dia batido paga XP, moeda e baú, mas não deixa
   encontro: o fim diz por quê, no mesmo lugar em que diz o que ficou. */
const teto = r => (r?.semEncontros
  ? ' O limite de encontros de hoje já tinha sido atingido: a run pagou o XP inteiro, a moeda com parte dos encontros e nenhuma criatura para capturar — ele volta amanhã.'
  : '');

export function fraseDoFim(r, { moeda = 'moedas', nomeDe = () => null } = {}) {
  if (!r?.fim) return null;
  const wave = Math.min(WAVES, Math.max(1, inteiro(r.wave) || 1));
  const ficou = oQueFicou(r, moeda);
  const subiram = (r.rendeu?.subiram ?? [])
    .map(s => { const n = nomeDe(s.id); return n ? `${n} subiu para o nível ${inteiro(s.para)}` : null; })
    .filter(Boolean);
  const subida = subiram.length ? ` ${subiram.join('; ')}.` : '';
  if (r.fim.motivo === 'limpou')
    return `Estágio limpo! ${ficou ? `${ficou}, e o baú do estágio.` : 'O baú do estágio é seu.'}${subida}${teto(r)}`;
  const onde = r.fim.motivo === 'recuou' ? `Você recuou na wave ${wave} de ${WAVES}.` : `A equipe caiu na wave ${wave} de ${WAVES}.`;
  const resto = ficou ? ` Ficou com o que farmou: ${ficou}.` : ' Desta vez não deu para farmar nada.';
  return `${onde}${resto} Só o baú do estágio ficou para trás.${subida}${teto(r)}`;
}
