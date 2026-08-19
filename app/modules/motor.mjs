/* Instância do motor para o app.
 *
 * O motor não conhece o tema desde o F0.4: ele recebe um ContentPack. A
 * ligação acontece UMA vez, aqui, e todo o resto do app importa deste módulo.
 *
 * Trocar de tema é trocar a linha do `import` abaixo — é essa a promessa da
 * Content Layer, e é aqui que ela se cumpre ou não.
 *
 * O F0.5 tirou daqui os treze apelidos herdados (`KANTO_DEX`, `simulate`,
 * `pickLineup`…) que a Content Layer havia deixado para trás — a lacuna L-020.
 * Eles serviam para não misturar renomeação com troca de arquitetura no mesmo
 * bloco; ficar com eles seria carregar o nome da franquia de volta para dentro
 * de um módulo que promete independência de tema.
 */
import { criarMotor, CONF, VERSAO, rng, statAt, stormRate, tiposDaPool } from '../../engine/engine.mjs';
import pack from '../../content/pokemon_kanto_v1.mjs';

export const M = criarMotor(pack);

export const {
  elenco, efeito, dano, simular, montarElenco, atribuirGolpes,
  sortearPool, sortearClima, aplicarClima, nomeExibido, slugExterno, sprite,
  tipoCor, tipoNome,
} = M;
export { CONF, rng, statAt, stormRate, tiposDaPool, pack };
export const VERSAO_MOTOR = VERSAO;

/* Dado do pack que a interface lê direto. Não são apelidos: são as tabelas
   inteiras, e quem as consome (customização, painel de tipos) precisa
   percorrer, não consultar item a item. */
export const especies    = pack.especies;
export const efetividade = pack.tipos.efetividade;
export const tipoCores   = pack.tipos.cores;
export const tipoNomes   = pack.tipos.nomes;

/* Nome e símbolo da moeda vêm do pack: são identidade do tema, não do motor. */
export const MOEDA = M.moeda.nome;
export const CUR   = M.moeda.simbolo;
