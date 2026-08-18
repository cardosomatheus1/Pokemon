/* Instância do motor usada pelos testes.
 *
 * O motor deixou de conhecer o tema no F0.4: ele recebe um ContentPack. Este
 * arquivo faz a ligação uma vez, para que as suítes continuem escrevendo
 * `E.simular(...)` em vez de repetir a fábrica.
 *
 * Os nomes antigos ficam disponíveis como apelidos porque as fixtures e os
 * goldens foram gravados com eles — trocar nome de função não pode passar por
 * mudança de comportamento.
 */
import { criarMotor, CONF, rng, newSeed, statAt, stormRate } from '../engine/engine.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';

const M = criarMotor(pack);

export const {
  elenco, efeito, dano, simular, montarElenco, atribuirGolpes,
  sortearPool, sortearClima, aplicarClima, nomeExibido, slugExterno, sprite,
} = M;
export { CONF, rng, newSeed, statAt, stormRate, pack, M };

/* apelidos herdados, para as suítes gravadas antes do F0.4 */
export const KANTO_DEX     = elenco;
export const KANTO_DEX_FULL= pack.especies;
export const CHART         = pack.tipos.efetividade;
export const buildRoster   = montarElenco;
export const simulate      = simular;
export const effect        = efeito;
export const assignMoves   = atribuirGolpes;
export const pickLineup    = sortearPool;
export const rollWeather   = sortearClima;
export const applyWeather  = aplicarClima;
export const displayName   = nomeExibido;
export const showdownSlug  = slugExterno;
