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
    licao: { ensina: 'resistência — quem apanha pouco', tipo: 'Planta', mostra: 'resiste', tiposGolpe: ['grass', 'poison'],
             dica: 'Os golpes dela são de Planta e Venenoso. Quem resiste aos dois apanha metade — e dura o dobro.' } },
  { id: 'fuchsia',  nome: 'Ginásio de Fuchsia', rival: 'koga', insignia: 'alma', insigniaNome: 'Insígnia Alma',
    licao: { ensina: 'o preset certo — derrube a ameaça primeiro', tipo: 'Venenoso', mostra: 'preset', presetCerto: 'defensive',
             dica: 'Dois tanques e uma ameaça. Espalhar dano deixa a ameaça bater o tempo todo; o preset Defensivo derruba ela primeiro.' } },
  { id: 'saffron',  nome: 'Ginásio de Saffron', rival: 'sabrina', insignia: 'pantano', insigniaNome: 'Insígnia Pântano',
    licao: { ensina: 'físico contra especial', tipo: 'Psíquico', mostra: 'categoria',
             dica: 'As criaturas dela aguentam golpe especial e quebram com golpe físico: bata pelo lado fraco.' } },
  /* ST-10.19b · os dois últimos ginásios antes do chefe. */
  { id: 'cinnabar', nome: 'Ginásio de Cinnabar', rival: 'blaine', insignia: 'vulcao', insigniaNome: 'Insígnia Vulcão', cena: 'agua',
    licao: { ensina: 'derrube quem está caindo — um a menos bate a menos', tipo: 'Fogo', mostra: 'preset', presetCerto: 'aggressive',
             porque: 'termina o ferido: um a menos bate a menos',
             dica: 'Os quatro dele batem forte até cair. Espalhar dano deixa os quatro batendo; terminar o ferido tira um da luta mais cedo.' } },
  { id: 'viridian', nome: 'Ginásio de Viridian', rival: 'giovanni', insignia: 'terra', insigniaNome: 'Insígnia Terra', cena: 'arvores',
    licao: { ensina: 'o tipo duplo — os dois tipos contam', tipo: 'Terrestre', mostra: 'duplo',
             dica: 'Quatro dos cinco dele têm dois tipos, e o golpe conta com os dois: Lutador bate Pedra, mas o Venenoso do Nidoking corta pela metade — e corta a Planta também. Água e Gelo batem nos dois lados.' } },
  /* ST-10.18 · o CHEFE: um lendário (§8.12, L-057). Não dá insígnia; paga a
     essência da espécie, uma por dia, e nunca a criatura. */
  { id: 'usina',    nome: 'Usina Abandonada', rival: 'zapdos', chefe: true },
  /* ST-10.19c · A LIGA: a Elite Four e o Campeão. A Liga não ensina lição
     nova — REVISA uma de ginásio (`revisa`), num nível de fim de jogo, e o
     Campeão dá a última: o preset não é receita. Sem insígnia; `selo` é o
     nome do degrau no mapa. */
  { id: 'lorelei',  nome: 'Lorelei', rival: 'lorelei', liga: true, selo: 'Elite Four',
    licao: { ensina: 'o preset certo — derrube a ameaça primeiro', revisa: 'fuchsia', tipo: 'Gelo', mostra: 'preset', presetCerto: 'defensive',
             dica: 'A Jynx bate forte e cai fácil. Espalhar dano a deixa batendo a luta inteira; derrubá-la primeiro vira a luta — o que o Koga ensinou.' } },
  { id: 'bruno',    nome: 'Bruno', rival: 'bruno', liga: true, selo: 'Elite Four',
    licao: { ensina: 'imunidade', revisa: 'vermilion', tipo: 'Lutador', tipoGolpe: 'fighting', mostra: 'imune',
             dica: 'Fantasma não é tocado por Lutador nem por Normal: três dos cinco dele batem no vazio. Um imune no time vale mais que força — o que o Surge ensinou.' } },
  { id: 'agatha',   nome: 'Agatha', rival: 'agatha', liga: true, selo: 'Elite Four',
    licao: { ensina: 'físico contra especial', revisa: 'saffron', tipo: 'Fantasma', mostra: 'categoria',
             dica: 'As criaturas dela aguentam golpe especial e quebram com físico — e golpe Normal não toca Fantasma. O que a Sabrina ensinou.' } },
  { id: 'lance',    nome: 'Lance', rival: 'lance', liga: true, selo: 'Elite Four',
    licao: { ensina: 'resistência — quem apanha pouco', revisa: 'celadon', tipo: 'Dragão', mostra: 'resiste', tiposGolpe: ['dragon', 'flying'],
             dica: 'Os golpes dele são de Dragão e de Voador. Aço resiste aos dois, e o Elétrico ainda resiste ao Voador — o que a Erika ensinou.' } },
  { id: 'campeao',  nome: 'Campeão', rival: 'campeao', liga: true, final: true, selo: 'a final',
    licao: { ensina: 'não persiga o ferido — o preset certo depende de quem está do outro lado', tipo: 'de tudo', mostra: 'preset', presetCerto: 'balanced', presetErrado: 'aggressive', prova: 'derrubados',
             porque: 'o maior dano a cada golpe — contra seis fortes, atalho perde',
             dica: 'O Agressivo venceu o Blaine. Aqui, contra seis, ele gasta golpe terminando quem já ia cair e deixa o resto batendo. Nenhum preset vence sempre: o número muda com quem está do outro lado.' } },
];
