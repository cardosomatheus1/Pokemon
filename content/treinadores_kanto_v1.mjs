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
  /* ST-10.13 · D-125: era Rattata 4 + Pidgey 5, e o inicial SOZINHO no nível
     5 vencia 0–4%. Um Rattata 5: o inicial vence 89–97% — uma luta, e não um
     muro (medido: tools/medir-ginasios.mjs, fixture ginasios.json). */
  { id: 'rota1',  nome: 'Caçador da Rota 1',        onde: 'Rota 1',            time: [{ dex: 19, nivel: 5 }], ow: 'youngster' },
  { id: 'insetos', nome: 'Colecionadora de Insetos', onde: 'Floresta',          time: [{ dex: 10, nivel: 6 }, { dex: 13, nivel: 6 }, { dex: 11, nivel: 7 }], ow: 'lass' },
  { id: 'rival1', nome: 'O Rival',                   onde: 'Rota 22',           time: [{ dex: 16, nivel: 9 }, { dex: 7, nivel: 9 }], ow: 'camper' },
  { id: 'pedra',  nome: 'Montanhista',               onde: 'caminho da Pedra', time: [{ dex: 74, nivel: 10 }, { dex: 27, nivel: 11 }, { dex: 95, nivel: 12 }], ow: 'hiker' },
  /* ST-10.13 · o primeiro ginásio: a aula é FRAQUEZA DE TIPO (Spec §8.1.2). */
  { id: 'brock',  nome: 'Brock',                     onde: 'Ginásio de Pewter', time: [{ dex: 74, nivel: 12 }, { dex: 95, nivel: 14 }], ow: 'expert_m' },
  /* ST-10.14 · o segundo ginásio: a aula é VELOCIDADE. O Starmie (59 de
     velocidade no 21) é o eixo — quem o passa bate primeiro. */
  { id: 'misty',  nome: 'Misty',                     onde: 'Ginásio de Cerulean', time: [{ dex: 120, nivel: 18 }, { dex: 121, nivel: 21 }], ow: 'swimmer_f' },
  /* ST-10.15 · o terceiro ginásio: a aula é IMUNIDADE — um time todo elétrico. */
  { id: 'surge',  nome: 'Lt. Surge',                 onde: 'Ginásio de Vermilion', time: [{ dex: 100, nivel: 21 }, { dex: 25, nivel: 18 }, { dex: 26, nivel: 24 }], ow: 'sailor' },
  /* ST-10.19a · Erika: a aula é RESISTÊNCIA — Planta e Veneno, e quem resiste
     aos dois apanha pouco. Níveis do material de origem. */
  { id: 'erika',  nome: 'Erika',                     onde: 'Ginásio de Celadon', time: [{ dex: 71, nivel: 29 }, { dex: 114, nivel: 24 }, { dex: 45, nivel: 29 }], ow: 'picnicker' },
  /* ST-10.19a · Koga: a aula é o PRESET — dois tanques e uma ameaça frágil
     (Venomoth 42). Espalhar dano (Balanced) deixa a ameaça bater o tempo
     todo; derrubá-la primeiro (Defensive) vira a luta. Medido. */
  { id: 'koga',   nome: 'Koga',                      onde: 'Ginásio de Fuchsia', time: [{ dex: 89, nivel: 38 }, { dex: 49, nivel: 42 }, { dex: 110, nivel: 38 }], ow: 'black_belt' },
  /* ST-10.16 · o quarto ginásio: a aula é FÍSICO × ESPECIAL. Os três aguentam
     golpe especial e quebram com físico (defesa < defesa especial). */
  { id: 'sabrina', nome: 'Sabrina',                  onde: 'Ginásio de Saffron', time: [{ dex: 64, nivel: 38 }, { dex: 122, nivel: 37 }, { dex: 65, nivel: 43 }], ow: 'beauty' },
  /* ST-10.18 · o chefe da campanha: um lendário sozinho, sem treinador. A
     `essencia` é o que a vitória paga dele (L-057) — nunca a criatura.
     `vidaX: 3` é a vida de chefe: sozinho e sem ela, um trio de nível 45
     vencia 90%+ mesmo contra um Zapdos 65. Medido com ela, no 50: o trio que
     tem dois fracos a Elétrico/Voador vence 25%, o que pensou a composição
     98%, e um time cheio de nível 50, 100%. */
  { id: 'zapdos', nome: 'Zapdos', onde: 'Usina Abandonada', time: [{ dex: 145, nivel: 50, vidaX: 3 }], ow: null, essencia: 145 },
];
