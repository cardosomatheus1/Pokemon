/* OS ADVERSÁRIOS DE TREINO — Kanto (ST-10.7; a jornada da ST-10.11 estende).
 *
 * Os primeiros rivais do caminho, para o Team Builder ter contra quem medir a
 * chance antes de a jornada existir. Cada um é um time pequeno, com nível de
 * começo de rota: o primeiro combate tem de ser VENCÍVEL por quem acabou de
 * escolher o inicial, e o terceiro já pede pensar no tipo.
 *
 * Os golpes não vêm daqui: cada criatura rival luta com o padrão do moveset no
 * nível dela, o mesmo que o jogador recebe — o rival não tem golpe que o
 * jogador não pudesse ter.
 *
 * `ow` é a folha de andar do treinador no mapa da jornada (ST-10.12): nome de
 * ARQUIVO de arte, como a gente dos biomas — por isso mora no pack, e não no
 * motor. */
export const TREINADORES = [
  { id: 'rota1',  nome: 'Caçador da Rota 1',        onde: 'Rota 1',            time: [{ dex: 19, nivel: 4 }, { dex: 16, nivel: 5 }], ow: 'youngster' },
  { id: 'insetos', nome: 'Colecionadora de Insetos', onde: 'Floresta',          time: [{ dex: 10, nivel: 6 }, { dex: 13, nivel: 6 }, { dex: 11, nivel: 7 }], ow: 'lass' },
  { id: 'rival1', nome: 'O Rival',                   onde: 'Rota 22',           time: [{ dex: 16, nivel: 9 }, { dex: 7, nivel: 9 }], ow: 'camper' },
  { id: 'pedra',  nome: 'Montanhista',               onde: 'caminho da Pedra', time: [{ dex: 74, nivel: 10 }, { dex: 27, nivel: 11 }, { dex: 95, nivel: 12 }], ow: 'hiker' },
];
