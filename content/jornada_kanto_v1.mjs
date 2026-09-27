/* A JORNADA DE KANTO — os nós em ordem (ST-10.11; os ginásios da ST-10.13 a
 * 10.16 entram aqui, cada um com a insígnia e a lição).
 *
 * Cada nó aponta um RIVAL de `treinadores_kanto_v1.mjs`. O primeiro é o
 * Caçador da Rota 1. ~~Vencível pelo inicial no nível 5 (medido na ST-10.10).~~
 * Corrigido na ST-10.12: a ST-10.10 mediu com OS TRÊS iniciais juntos (99,8%);
 * o inicial SOZINHO no nível 5 vence 0–4% — é o D-125, dono ST-10.13.
 *
 * `cena` é o que enfeita o nó no mapa (ST-10.12): árvores, rochas, ou nada. */
export const JORNADA = [
  { id: 'rota1',    nome: 'Rota 1',            rival: 'rota1' },
  { id: 'floresta', nome: 'Floresta',          rival: 'insetos', cena: 'arvores' },
  { id: 'rota22',   nome: 'Rota 22',           rival: 'rival1' },
  { id: 'pedra',    nome: 'Caminho da Pedra',  rival: 'pedra', cena: 'rochas' },
];
