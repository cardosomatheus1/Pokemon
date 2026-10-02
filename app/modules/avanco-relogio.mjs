/* O RELÓGIO DA RUN — camada 0: o que o cabeçalho escreve sobre o tempo.
 *
 * O dono, olhando a aba no telefone: "não tem o tempo de cada volta, pra
 * saber quando [as criaturas] vão aparecer". O relógio existia — contava o fim
 * da WAVE —, mas sem rótulo, e a pergunta dele é outra: quando entra o
 * PRÓXIMO selvagem. O roteiro da wave sabe (`proximaEntrada`, no motor); esta
 * linha só diz.
 *
 *   alguém de pé        "⚔ selvagem em campo"   — a pergunta já se respondeu
 *   vem mais um         "próximo selvagem em 0:07"
 *   não vem mais ninguém "a wave termina em 0:12" — e depois começa a próxima
 *
 * O fim da wave vai sempre junto: é o "quanto falta" que o relógio grande
 * conta, agora com nome. */

import { EQUIPE_MAX } from '../../engine/expedicao.mjs';

/* D-156: o cabeçalho da equipe da run. Dividia a equipe pelas VAGAS DE
   EXPEDIÇÃO (`vagasDe`) — outra régua —, e saía "3 de 2 vaga(s)". A equipe
   da run tem o teto dela. */
export const rotuloDaEquipeDaRun = n => `${n} de ${EQUIPE_MAX} na equipe`;

/* mm:ss. A run dura ~40 min e a wave 2 a 4; hora cheia seria ruído, e segundos
   sem minutos deixariam de responder "quanto falta". */
export const relogioDaWave = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* m:ss, sem o zero da frente — é a forma de uma frase, e não de um mostrador. */
const curto = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function textoDoProximo(cn) {
  if (!cn) return '';
  const fim = `a wave termina em ${curto(cn.restam)}`;
  if (cn.emCena?.some(m => !m.chegando)) return `<b>⚔ selvagem em campo</b> · ${fim}`;
  if (cn.emCena?.length) return `<b>selvagem chegando</b> · ${fim}`;
  if (cn.proximaEntrada != null) return `<b>próximo selvagem em ${curto(cn.proximaEntrada)}</b> · ${fim}`;
  return `<b>${fim}</b> · depois começa a próxima`;
}
