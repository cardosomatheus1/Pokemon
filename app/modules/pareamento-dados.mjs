/* O PAREAMENTO DA LIGA (ST-11.3 · F5.1 · Spec §9.5) — camada 0.
 *
 * Puro: entram o meu time (rating e power), os times publicados dos outros
 * (o último snapshot de cada conta, com o rating dela), os meus adversários
 * recentes e as contas ligadas à minha; sai o adversário — ou `null`, e aí o
 * bot. As regras, na ordem em que cortam:
 *
 *   NUNCA eu, NUNCA uma conta ligada à minha (§9.12: parear contas ligadas é
 *            a porta do win-trading)
 *   NUNCA um time congelado com outras regras (ele não luta — ST-11.2)
 *   A DIFERENÇA de rating até `difRating`, e o power na faixa de ±`faixaPower`
 *   NÃO REPETIR os últimos `janelaRepeticao` adversários
 *
 * Entre os que sobram, o mais perto em rating, depois em power, depois pelo id
 * — determinístico: a mesma fila dá o mesmo par, e o teste consegue dizer por
 * que foi aquele.
 *
 * O BOT (§9.5: "bots identificados podem preencher early population, sem
 * fingir que são humanos"): um treinador da jornada, o de power mais perto do
 * meu, ROTULADO — `bot: true` e o nome do treinador. A partida contra ele não
 * mexe no Liga MMR (o servidor a grava à parte): se mexesse, farmar bot
 * inflaria o rating.
 */
import { motivoDaVersao } from './partida-dados.mjs';
import { conteudoDaLuta } from './snapshot-dados.mjs';
import { rivalDe } from './treino-dados.mjs';
import { powerDe } from '../../engine/time.mjs';
import { VERSAO_TBE } from '../../engine/treino-batalha.mjs';

export const PAREAMENTO = Object.freeze({ difRating: 300, faixaPower: 0.35, janelaRepeticao: 3 });

/* `evitar`: quem está em COOLDOWN comigo (ST-11.8) — o par que se enfrentou
   há pouco não se enfrenta de novo, nem pela busca. */
export function escolherAdversario({ pack, eu, candidatos, recentes = [], ligadas = [], evitar = [], limites = PAREAMENTO }) {
  const fora = new Set([eu.user, ...ligadas, ...evitar, ...recentes.slice(0, limites.janelaRepeticao)]);
  const dentro = (candidatos ?? []).filter(c => !fora.has(c.user)
    && !motivoDaVersao(pack, c.snapshot)
    && Math.abs(c.rating - eu.rating) <= limites.difRating
    && c.snapshot.power >= eu.power * (1 - limites.faixaPower) && c.snapshot.power <= eu.power * (1 + limites.faixaPower));
  dentro.sort((a, b) => Math.abs(a.rating - eu.rating) - Math.abs(b.rating - eu.rating)
    || Math.abs(a.snapshot.power - eu.power) - Math.abs(b.snapshot.power - eu.power)
    || (a.snapshot.id < b.snapshot.id ? -1 : 1));
  return dentro[0] ?? null;
}

/* O time de um treinador da jornada no formato do snapshot — para lutar pelo
   mesmo `confrontoDaLiga`. O chefe lendário não entra na fila: ele é raid. */
export function snapshotDoBot(pack, t) {
  const time = rivalDe(pack, t).map(e => ({ ...e, power: powerDe(pack, e, e.golpes).total }));
  return { id: `bot:${t.id}`, bot: true, nome: t.nome, preset: 'balanced', time, power: time.reduce((a, x) => a + x.power, 0),
           versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(pack) };
}
export function botPara(pack, eu) {
  const bots = (pack?.treinadores ?? []).filter(t => !(t.time ?? []).some(x => x.vidaX)).map(t => snapshotDoBot(pack, t));
  bots.sort((a, b) => Math.abs(a.power - eu.power) - Math.abs(b.power - eu.power) || (a.id < b.id ? -1 : 1));
  return bots[0] ?? null;
}
