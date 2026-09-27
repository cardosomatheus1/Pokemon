/* A JORNADA DE KANTO — os nós em ordem (ST-10.11; os ginásios da ST-10.13 a
 * 10.16 entram aqui, cada um com a insígnia e a lição).
 *
 * Cada nó aponta um RIVAL de `treinadores_kanto_v1.mjs`. O primeiro é o
 * Caçador da Rota 1. ~~Vencível pelo inicial no nível 5 (medido na ST-10.10).~~
 * Corrigido na ST-10.12: a ST-10.10 mediu com OS TRÊS iniciais juntos (99,8%);
 * o inicial SOZINHO no nível 5 vencia 0–4% — o D-125. Consertado na ST-10.13:
 * o Caçador passou a um Rattata 5, e o inicial sozinho vence 89–97%.
 *
 * O GINÁSIO ensina UMA interação (Spec §8.1.2), e a `licao` diz qual — o
 * painel do nó a mostra antes da luta. A dificuldade é MEDIDA
 * (`tools/medir-ginasios.mjs` → `test/fixtures/ginasios.json`): o time que
 * ignora a lição perde a maior parte das vezes, e o que a aplica vence.
 *
 * `cena` é o que enfeita o nó no mapa (ST-10.12): árvores, rochas, ou nada. */
export const JORNADA = [
  { id: 'rota1',    nome: 'Rota 1',            rival: 'rota1' },
  { id: 'floresta', nome: 'Floresta',          rival: 'insetos', cena: 'arvores' },
  { id: 'rota22',   nome: 'Rota 22',           rival: 'rival1' },
  { id: 'pedra',    nome: 'Caminho da Pedra',  rival: 'pedra', cena: 'rochas' },
  { id: 'pewter',   nome: 'Ginásio de Pewter', rival: 'brock', insignia: 'rocha', insigniaNome: 'Insígnia Rocha', cena: 'rochas',
    licao: { ensina: 'fraqueza de tipo', tipo: 'Pedra', dica: 'Pedra apanha em dobro de Água e de Planta — e aguenta Fogo, Voador e Normal.' } },
  /* `mostra: 'vel'`: o painel põe a velocidade do seu mais rápido ao lado da
     de cada rival — a lição tem de estar na tela, e não só no texto. */
  { id: 'cerulean', nome: 'Ginásio de Cerulean', rival: 'misty', insignia: 'cascata', insigniaNome: 'Insígnia Cascata', cena: 'agua',
    licao: { ensina: 'a velocidade decide trocas apertadas', tipo: 'Água', mostra: 'vel',
             dica: 'Quando os dois caem em poucos golpes, quem age antes vence. Passe a velocidade do Starmie.' } },
  /* `mostra: 'imune'` com `tipoGolpe`: o painel diz quem do seu time o tipo
     não toca. O porto de Vermilion tem água (a mesma cena de Cerulean). */
  { id: 'vermilion', nome: 'Ginásio de Vermilion', rival: 'surge', insignia: 'trovao', insigniaNome: 'Insígnia Trovão', cena: 'agua',
    licao: { ensina: 'imunidade', tipo: 'Elétrico', tipoGolpe: 'electric', mostra: 'imune',
             dica: 'Terrestre não é tocado por Elétrico: dano zero, o golpe todo perdido. Um imune no time vale mais que força.' } },
  /* ST-10.19a: na ordem do material de origem — Erika e Koga ANTES da
     Sabrina (29 → 42 → 43). Save que já venceu a Sabrina não perde nada: o
     que foi vencido segue vencido, e o próximo nó passa a ser a Erika. */
  { id: 'celadon',  nome: 'Ginásio de Celadon', rival: 'erika', insignia: 'arcoiris', insigniaNome: 'Insígnia Arco-Íris', cena: 'arvores',
    licao: { ensina: 'resistência: quem apanha pouco', tipo: 'Planta', mostra: 'resiste', tiposGolpe: ['grass', 'poison'],
             dica: 'Os golpes dela são de Planta e Venenoso. Quem resiste aos dois apanha metade — e dura o dobro.' } },
  { id: 'fuchsia',  nome: 'Ginásio de Fuchsia', rival: 'koga', insignia: 'alma', insigniaNome: 'Insígnia Alma',
    licao: { ensina: 'o preset certo: derrube a ameaça primeiro', tipo: 'Venenoso', mostra: 'preset', presetCerto: 'defensive',
             dica: 'Dois tanques e uma ameaça. Espalhar dano deixa a ameaça bater o tempo todo; o preset Defensivo derruba ela primeiro.' } },
  { id: 'saffron',  nome: 'Ginásio de Saffron', rival: 'sabrina', insignia: 'pantano', insigniaNome: 'Insígnia Pântano',
    licao: { ensina: 'físico contra especial', tipo: 'Psíquico', mostra: 'categoria',
             dica: 'As criaturas dela aguentam golpe especial e quebram com golpe físico: bata pelo lado fraco.' } },
  /* ST-10.18 · o CHEFE: um lendário (§8.12, L-057). Não dá insígnia; paga a
     essência da espécie, uma por dia, e nunca a criatura. */
  { id: 'usina',    nome: 'Usina Abandonada', rival: 'zapdos', chefe: true },
];
