/* Instância do motor usada pelos testes.
 *
 * O motor deixou de conhecer o tema no F0.4: ele recebe um ContentPack. Este
 * arquivo faz a ligação uma vez, para que as suítes escrevam `simular(...)` em
 * vez de repetir a fábrica.
 *
 * Os apelidos herdados saíram no F0.5 junto com os do app (L-020). As fixtures
 * não mudam com isso: nome de função não é comportamento, e os goldens provam.
 */
import { criarMotor, CONF, rng, statAt, stormRate } from '../engine/engine.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';

const M = criarMotor(pack);

export const {
  elenco, efeito, dano, simular, montarElenco, atribuirGolpes,
  sortearPool, sortearClima, aplicarClima, nomeExibido, slugExterno, sprite,
} = M;
export { CONF, rng, statAt, stormRate, pack, M };

export const especies    = pack.especies;
export const efetividade = pack.tipos.efetividade;
