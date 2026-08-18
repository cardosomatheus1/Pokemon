/* Instância do motor para o app.
 *
 * O motor não conhece o tema desde o F0.4: ele recebe um ContentPack. A
 * ligação acontece UMA vez, aqui, e todo o resto do app importa deste módulo.
 *
 * Trocar de tema é trocar a linha do `import` abaixo — é essa a promessa da
 * Content Layer, e é aqui que ela se cumpre ou não.
 */
import { criarMotor, CONF, rng, newSeed, statAt, stormRate } from '../../engine/engine.mjs';
import pack from '../../content/pokemon_kanto_v1.mjs';

export const M = criarMotor(pack);

export const {
  elenco, efeito, dano, simular, montarElenco, atribuirGolpes,
  sortearPool, sortearClima, aplicarClima, nomeExibido, slugExterno, sprite,
  tipoCor, tipoNome,
} = M;
export { CONF, rng, newSeed, statAt, stormRate, pack };

/* Nome e símbolo da moeda vêm do pack: são identidade do tema, não do motor. */
export const MOEDA = M.moeda.nome;
export const CUR   = M.moeda.simbolo;

/* Apelidos herdados. O F0.4 renomeou as funções para português e para nomes
   que não citam a franquia; manter os antigos evita reescrever 11 módulos num
   bloco cujo escopo é a Content Layer, não renomeação. Some no F0.5. */
export const KANTO_DEX      = elenco;
export const KANTO_DEX_FULL = pack.especies;
export const CHART          = pack.tipos.efetividade;
export const TCOLOR         = pack.tipos.cores;
export const TIPO_PT        = pack.tipos.nomes;
export const buildRoster    = montarElenco;
export const simulate       = simular;
export const pickLineup     = sortearPool;
export const rollWeather    = sortearClima;
export const applyWeather   = aplicarClima;
export const displayName    = nomeExibido;
export const showdownSlug   = slugExterno;
export const spriteURL      = sprite;
