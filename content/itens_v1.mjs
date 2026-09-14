/* O CATÁLOGO DE ITENS (bloco 1.12, camada de conteúdo).
 *
 * Nomes e funções vêm dos dois PDFs que o dono mandou — extraídos do TEXTO
 * deles, não digitados de memória. Os dois arquivos são byte a byte idênticos;
 * conferido.
 *
 * ── AS QUATRO PORTAS, E A REGRA QUE AS SEPARA ────────────────────────────
 *
 * O dono pediu a análise e foi explícito sobre o que ela precisa entregar:
 *
 *   > "A LOJA MONETIZADA PRECISA VIRAR LUCRO, MESMO QUE BARATO, NEM QUE UM
 *   >  OUTFIT CUSTE APENAS 5 REAIS"
 *
 * Ele está certo, e a regra abaixo existe para que a loja possa vender MUITO
 * sem que o jogo precise vender vantagem. Ela é a linha do §P5, escrita como
 * critério aplicável a cada item:
 *
 *   > **A loja de dinheiro real vende o que se VÊ e o que se ESCOLHE. Nunca o
 *   > que DECIDE uma batalha, e nunca o que ANDA MAIS RÁPIDO.**
 *
 * Em consequência, cada item deste catálogo tem uma `porta`:
 *
 *     drop       cai da expedição. Bioma, estágio e raridade decidem.
 *     troca      compra-se com ESSÊNCIA — o material farmado (L-095).
 *     bau        recompensa de andar da Torre (L-090).
 *     loja       PokéCoin, a moeda de PvE. Também farmada.
 *     dinheiro   loja monetizada. SÓ cosmético, e nenhum item desta lista.
 *
 * ── POR QUE NENHUM ITEM DESTA LISTA VAI PARA A LOJA DE DINHEIRO ─────────
 *
 * Porque todos eles decidem batalha. Uma Choice Band vendida por cinco reais é
 * 50% de ataque comprado, e num jogo em que o que se farma é vendável isso é
 * dinheiro comprando dinheiro — o §P5 inteiro caindo por um item.
 *
 * **Mas há dinheiro nesta lista, e ele é maior que vender o item.** O que a
 * loja pode vender é a APARÊNCIA:
 *
 *   > Vende-se a SKIN do item, nunca o item.
 *
 * Uma Poké Ball com acabamento próprio, que captura exatamente igual, é
 * cosmético puro — e cosmético é o que mais vende em jogos deste formato,
 * porque o jogador compra identidade e não poder. Quem comprou não ganha nada
 * de quem não comprou, então ninguém precisa comprar para competir, e por isso
 * mesmo mais gente compra por gosto.
 *
 * É a mesma diferença que separa uma loja que dura de uma que queima a base.
 *
 * ── E A DISTRIBUIÇÃO É POR RARIDADE, COMO A DAS CRIATURAS ───────────────
 *
 * Cada item tem uma `faixa` que usa os MESMOS nomes da raridade do elenco
 * (`comum`, `incomum`, `raro`, `muitoRaro`). Assim o estágio filtra item pelo
 * mesmo critério que filtra criatura — sem tabela nova, sem regra nova, e sem
 * dois conceitos de "raro" no mesmo jogo.
 *
 * ── DE ONDE VEM O ÍCONE, E O QUE EU SEI DE VERDADE ──────────────────────
 *
 * `icone` é o índice na folha do dono, normalizada em 32 px por
 * `tools/normalizar-itens.mjs`, na MESMA ordem dela (23 colunas).
 *
 * `comoAchei` registra COMO cada índice foi determinado, porque a honestidade
 * aqui vale mais que a aparência de certeza:
 *
 *     medido    `tools/casar-itens.mjs` casou a referência do PDF com a célula,
 *               com margem folgada, e eu confirmei olhando o par
 *     olhado    identifiquei na folha ampliada, por forma inconfundível
 *     ordem     deduzido da ordem canônica do bloco, ancorado em vizinhos que
 *               foram medidos ou olhados
 *     falta     ainda não identificado — usa o ícone de reserva e aparece na
 *               tela de conferência
 *
 * Eu já errei duas vezes tentando identificar por posição, e uma delas declarei
 * a Poké Ball errada. **Identificação por posição é um palpite com aparência de
 * método** — então ela fica marcada como o que é.
 */

/* Quem passa por aqui é conteúdo de TEMA. O motor nunca lê este arquivo. */

export const PORTAS = ['drop', 'troca', 'bau', 'loja', 'dinheiro'];
export const FAIXAS = ['comum', 'incomum', 'raro', 'muitoRaro'];

/* ── AS PEDRAS EVOLUTIVAS ─────────────────────────────────────────────────
 *
 * Porta ÚNICA: `drop`. Decisão do dono, registrada antes: pedra evolutiva não
 * se compra, em moeda nenhuma. É o que faz escolher a rota importar — a pedra
 * de uma linha cai num lugar só, e comprar tiraria o mapa da decisão.
 *
 * `fonte` é o bioma onde ela cai, e ela é a razão de o bioma existir. */
export const PEDRAS = [
  { id: 'fogo',       nome: 'Pedra do Fogo',   en: 'Fire Stone',    icone: 73,  comoAchei: 'medido',
    faixa: 'raro', porta: 'drop', fonte: 'vulcao',
    texto: 'Evolui certas espécies, como Vulpix, Eevee e Growlithe.' },
  { id: 'agua',       nome: 'Pedra da Água',   en: 'Water Stone',   icone: 75,  comoAchei: 'medido',
    faixa: 'raro', porta: 'drop', fonte: 'praia',
    texto: 'Evolui certas espécies, como Poliwhirl, Shellder e Eevee.' },
  { id: 'trovao',     nome: 'Pedra do Trovão', en: 'Thunder Stone', icone: 74,  comoAchei: 'ordem',
    faixa: 'raro', porta: 'drop', fonte: 'campo',
    texto: 'Evolui certas espécies, como Pikachu e Eevee.' },
  { id: 'folha',      nome: 'Pedra das Folhas', en: 'Leaf Stone',   icone: 76,  comoAchei: 'olhado',
    faixa: 'raro', porta: 'drop', fonte: 'floresta',
    texto: 'Evolui certas espécies, como Weepinbell e Exeggcute.' },
  { id: 'lua',        nome: 'Pedra da Lua',    en: 'Moon Stone',    icone: 72,  comoAchei: 'ordem',
    faixa: 'raro', porta: 'drop', fonte: 'montanha',
    texto: 'Evolui certas espécies, como Clefairy e Jigglypuff.' },
  { id: 'sol',        nome: 'Pedra do Sol',    en: 'Sun Stone',     icone: 71,  comoAchei: 'medido',
    faixa: 'raro', porta: 'drop', fonte: 'deserto',
    texto: 'Evolui certas espécies, como Gloom e Sunkern.' },
  { id: 'brilho',     nome: 'Pedra Brilhante', en: 'Shiny Stone',   icone: 94,  comoAchei: 'medido',
    faixa: 'muitoRaro', porta: 'drop', fonte: 'oasis',
    texto: 'Uma pedra brilhante que evolui espécies específicas como Togetic e Roselia.' },
  { id: 'crepusculo', nome: 'Pedra do Crepúsculo', en: 'Dusk Stone', icone: 95, comoAchei: 'medido',
    faixa: 'muitoRaro', porta: 'drop', fonte: 'ruina',
    texto: 'Uma pedra escura que evolui espécies específicas como Murkrow e Misdreavus.' },
  { id: 'aurora',     nome: 'Pedra da Aurora', en: 'Dawn Stone',    icone: 96,  comoAchei: 'medido',
    faixa: 'muitoRaro', porta: 'drop', fonte: 'gelo',
    texto: 'Uma pedra radiante que evolui espécies específicas como Kirlia (macho) e Snorunt (fêmea).' },
  { id: 'oval',       nome: 'Pedra Oval',      en: 'Oval Stone',    icone: 97,  comoAchei: 'ordem',
    faixa: 'muitoRaro', porta: 'drop', fonte: 'estufa',
    texto: 'Faz a Happiny evoluir se segurada ao subir de nível durante o dia.' },
];

/* ── OS HELD ITEMS ────────────────────────────────────────────────────────
 *
 * Todos DECIDEM BATALHA, e por isso nenhum deles tem porta `dinheiro`. Eles se
 * distribuem entre as três portas que custam TEMPO, e a escolha de qual porta é
 * o desenho econômico deste bloco:
 *
 *     drop    o que o jogador acha jogando, e que faz o farm ter surpresa
 *     troca   o que ele DECIDE buscar, gastando Essência — a porta do
 *             jogador que sabe o que quer
 *     bau     o que só a Torre dá, e que é a razão de subir
 *
 * A regra de repartição: **quanto mais o item muda uma batalha, mais longe da
 * sorte ele fica.** Um Leftovers cai; um Focus Sash se troca; um Choice item
 * vem da Torre. Assim o poder é conquistado por decisão, e não por sorte — e um
 * jogador azarado nunca fica para trás de um sortudo.
 */
export const HELD = [
  /* ── O que CAI: efeito pequeno, presença constante ─────────────────── */
  { id: 'leftovers', nome: 'Restos', en: 'Leftovers', icone: 371, comoAchei: 'nosso',
    faixa: 'incomum', porta: 'drop', fonte: 'estufa',
    texto: 'Restaura passivamente 1/16 do HP máximo a cada final de turno.' },
  { id: 'shellbell', nome: 'Sino-Concha', en: 'Shell Bell', icone: 239, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'drop', fonte: 'praia',
    texto: 'Restaura o HP do usuário em 1/8 de todo o dano causado ao adversário.' },
  { id: 'muscleband', nome: 'Faixa Muscular', en: 'Muscle Band', icone: 372, comoAchei: 'nosso',
    faixa: 'incomum', porta: 'drop', fonte: 'campo',
    texto: 'Aumenta levemente (10%) a força de ataques físicos.' },
  { id: 'wiseglasses', nome: 'Óculos do Sábio', en: 'Wise Glasses', icone: 250, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'drop', fonte: 'ruina',
    texto: 'Aumenta levemente (10%) a força de ataques especiais.' },
  { id: 'destinyknot', nome: 'Nó do Destino', en: 'Destiny Knot', icone: 233, comoAchei: 'olhado',
    faixa: 'raro', porta: 'drop', fonte: 'oasis',
    texto: 'Se o usuário for atingido por Attract, o adversário também sofre a condição.' },
  { id: 'blacksludge', nome: 'Lodo Negro', en: 'Black Sludge', icone: 234, comoAchei: 'olhado',
    faixa: 'raro', porta: 'drop', fonte: 'ferrovelho',
    texto: 'Cura Pokémon do tipo Poison (1/16 por turno) e fere qualquer outro tipo.' },

  /* ── As ROCHAS DE CLIMA: trocadas, porque são escolha e não sorte ──────
     Elas só valem para quem montou um time em volta de um clima. Cair no farm
     faria o jogador receber a rocha errada dezenas de vezes antes da certa —
     e a decepção repetida ensina que o saque não importa. */
  { id: 'icyrock', nome: 'Rocha Gélida', en: 'Icy Rock', icone: 235, comoAchei: 'olhado',
    faixa: 'raro', porta: 'troca', fonte: 'gelo', /* o Granizo dura mais onde ele já cai */
    texto: 'Aumenta a duração do clima Granizo de 5 para 8 turnos.' },
  { id: 'smoothrock', nome: 'Rocha Lisa', en: 'Smooth Rock', icone: 236, comoAchei: 'medido',
    faixa: 'raro', porta: 'troca', fonte: 'deserto', /* a Tempestade de Areia é a do deserto */
    texto: 'Aumenta a duração do clima Tempestade de Areia de 5 para 8 turnos.' },
  { id: 'heatrock', nome: 'Rocha Quente', en: 'Heat Rock', icone: 237, comoAchei: 'medido',
    faixa: 'raro', porta: 'troca', fonte: 'vulcao', /* o Dia Ensolarado, e o calor vem daqui */
    texto: 'Aumenta a duração do clima Dia Ensolarado de 5 para 8 turnos.' },
  { id: 'damprock', nome: 'Rocha Úmida', en: 'Damp Rock', icone: 238, comoAchei: 'medido',
    faixa: 'raro', porta: 'troca', fonte: 'praia', /* a Dança da Chuva, e a água é da costa */
    texto: 'Aumenta a duração do clima Dança da Chuva de 5 para 8 turnos.' },

  /* ── Os ORBES: trocados. Efeito grande, e sempre uma TROCA ──────────── */
  { id: 'lifeorb', nome: 'Orbe da Vida', en: 'Life Orb', icone: 373, comoAchei: 'nosso',
    faixa: 'muitoRaro', porta: 'troca', fonte: 'ruina', /* poder que cobra HP: o preço combina com a ruína */
    texto: 'Aumenta o dano em 30%, mas o usuário perde 10% do HP máximo ao atacar.' },
  { id: 'flameorb', nome: 'Orbe de Chamas', en: 'Flame Orb', icone: 226, comoAchei: 'olhado',
    faixa: 'raro', porta: 'troca', fonte: 'oasis', /* a queimadura, e o oásis é o calor sem o vulcão */
    texto: 'Aplica Queimadura ao próprio usuário no fim do primeiro turno.' },
  { id: 'toxicorb', nome: 'Orbe Tóxico', en: 'Toxic Orb', icone: 225, comoAchei: 'olhado',
    faixa: 'raro', porta: 'troca', fonte: 'ferrovelho', /* o veneno mora onde já mora o Lodo Negro */
    texto: 'Envenena severamente o próprio usuário no fim do primeiro turno.' },

  /* ── O que POUPA TEMPO: trocado, e com TETO DE USO (L-096) ───────────
     O dono foi explícito: *"o exp share só pode ser usado em 1 run"*. São os
     únicos itens que aceleram progressão, e por isso são os únicos com teto —
     sem ele, eles deixam de ser uma escolha e viram obrigação. */
  { id: 'luckyegg', nome: 'Ovo da Sorte', en: 'Lucky Egg', icone: 374, comoAchei: 'nosso',
    faixa: 'muitoRaro', porta: 'troca', fonte: 'estufa', /* XP e criação — a estufa já guarda a Pedra Oval */ usosPorRun: 1,
    texto: 'Aumenta a experiência ganha em 50%.' },
  { id: 'expshare', nome: 'Compartilhador de Exp.', en: 'Exp. Share', icone: 185, comoAchei: 'medido',
    faixa: 'raro', porta: 'troca', fonte: 'floresta', /* o bioma INICIAL leva o item que o novato mais usa */ usosPorRun: 1,
    texto: 'Garante experiência mesmo a quem não participou ativamente da batalha.' },
  { id: 'machobrace', nome: 'Bracelete Macho', en: 'Macho Brace', icone: 218, comoAchei: 'olhado',
    faixa: 'raro', porta: 'troca', fonte: 'montanha', /* treino pesado, e a montanha é onde ele dói */
    texto: 'Dobra os EVs ganhos, mas reduz a Velocidade pela metade enquanto segurado.' },

  /* ── O que vem da TORRE: o poder que decide, e que se CONQUISTA ───────
     Os Choice e os Focus são os itens que mais mudam uma batalha, e por isso
     são os que menos podem depender de sorte. Só a Torre os dá — e subir a
     Torre é a única coisa do jogo que não se pode farmar dormindo. */
  { id: 'choiceband', nome: 'Faixa da Escolha', en: 'Choice Band', icone: 242, comoAchei: 'olhado',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 4,
    texto: 'Aumenta o Ataque em 50%, mas prende o Pokémon ao primeiro golpe escolhido.' },
  { id: 'choicespecs', nome: 'Óculos da Escolha', en: 'Choice Specs', icone: 220, comoAchei: 'olhado',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 6,
    texto: 'Aumenta o Ataque Especial em 50%, mas prende o Pokémon ao primeiro golpe.' },
  { id: 'choicescarf', nome: 'Lenço da Escolha', en: 'Choice Scarf', icone: 375, comoAchei: 'nosso',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 8,
    texto: 'Aumenta a Velocidade em 50%, mas prende o Pokémon ao primeiro golpe.' },
  { id: 'focusband', nome: 'Faixa do Foco', en: 'Focus Band', icone: 376, comoAchei: 'nosso',
    faixa: 'raro', porta: 'bau', andarMinimo: 3,
    texto: 'Dá 10% de chance de sobreviver a um golpe fatal, restando com 1 HP.' },
  { id: 'focussash', nome: 'Faixa Firme', en: 'Focus Sash', icone: 377, comoAchei: 'nosso',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 10,
    texto: 'Com HP cheio, sobrevive garantidamente a um golpe fatal com 1 HP. Consumido no uso.' },
];

/* ── AS BOLAS ─────────────────────────────────────────────────────────────
 *
 * Porta `loja`, em PokéCoin — a moeda de PvE, que também é farmada. Bola é
 * consumível de rotina: fazer o jogador esperar um drop para poder capturar
 * transformaria a mecânica central do idle numa espera.
 *
 * A Master Ball é a exceção e não está à venda em porta nenhuma: uma captura
 * garantida comprável é o §P5 no seu caso mais puro. Ela vem do baú da Torre,
 * uma vez, no fim. */
export const BOLAS_EXTRA = [
  { id: 'quick', nome: 'Quick Ball', en: 'Quick Ball', icone: 14, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'loja', preco: 600, mult: 1.6,
    texto: 'Mecanicamente perfeita no primeiro turno, com 5× a taxa de captura comum.' },
  { id: 'dusk', nome: 'Dusk Ball', en: 'Dusk Ball', icone: 12, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'loja', preco: 700, mult: 1.8,
    texto: 'Muito eficaz em ambientes noturnos ou cavernas.' },
  { id: 'mestra', nome: 'Master Ball', en: 'Master Ball', icone: 0, comoAchei: 'olhado',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 13, mult: 999,
    texto: 'A bola definitiva. Captura o alvo sem possibilidade de falha.' },
];

/* ── AS BOLAS QUE O PACK JÁ DECLARA, com o ícone delas ────────────────────
 *
 * `poke`, `great` e `ultra` moram em `pack.bolas` desde o 1.1, porque o motor
 * precisa do multiplicador. O que faltava era o DESENHO — e ele mora aqui, com
 * os outros, para haver um lugar só onde se pergunta "que cara tem este item".
 *
 * ── A CASA 3 É A CERTA, E EU ERREI DUAS VEZES ATÉ VOLTAR PARA ELA ───────
 *
 * A ordem da linha 0 é a canônica: Master, Ultra, Great, **Poké**. Ela estava
 * certa desde sempre.
 *
 * O que me tirou dela foi a cor. Ao pôr a bola numa animação de 340 px no 1.23,
 * a metade de cima da casa 3 mediu `rgb(234,138,61)` — laranja. O dono viu e
 * pediu fidelidade: *"se é vermelho é vermelho e não laranja"*.
 *
 * Troquei para a casa 15, que mede `rgb(236,66,52)`. **E a casa 15 não é uma
 * Poké Ball**: ela é vermelha INTEIRA, sem a base branca. O dono corrigiu:
 * *"a pokebola original é vermelha preta e branca"*.
 *
 * ── O ERRO NÃO FOI DEIXAR DE OLHAR. FOI OLHAR NO TAMANHO ERRADO ─────────
 *
 * Eu desenhei as duas primeiras fileiras e olhei — a **64 px**. Nesse tamanho a
 * faixa vermelha escura da casa 15 lê como preta e o brilho lê como branco, e
 * ela vira uma Poké Ball convincente. A **160 px** a diferença é gritante.
 *
 *   > O `CLAUDE.md` já manda **olhar na proporção real**. Olhar num tamanho
 *   > onde a diferença não cabe é o mesmo que não olhar — e é pior, porque
 *   > deixa a sensação de ter conferido.
 *
 * A cor quente da casa 3 é qualidade de arte, e não casa errada. O dono pediu a
 * troca da folha inteira: *"a qualidade dos itens está EXTREMAMENTE RUIM"*. É a
 * L-137, e é lá que a cor se resolve — não trocando de casa. */
export const BOLAS_DO_PACK = [
  { id: 'poke', nome: 'Poké Ball', en: 'Poké Ball', icone: 3, comoAchei: 'olhado',
    faixa: 'comum', porta: 'loja', preco: 200,
    texto: 'A bola comum. Serve para a maioria das capturas do dia a dia.' },
  { id: 'great', nome: 'Great Ball', en: 'Great Ball', icone: 2, comoAchei: 'olhado',
    faixa: 'comum', porta: 'loja', preco: 350,
    texto: 'Uma bola melhor que a comum, com taxa de captura mais alta.' },
  { id: 'ultra', nome: 'Ultra Ball', en: 'Ultra Ball', icone: 1, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'loja', preco: 500,
    texto: 'Alto desempenho: taxa de captura duas vezes melhor que a comum.' },
];

export const POCOES = [
  /* ── AS POÇÕES (bloco A3, §7.22.7) ────────────────────────────────────
   *
   * A linha é a canônica dos jogos, por pedido do dono — Poção, Super, Hiper e
   * Máxima —, e os ícones são o borrifador clássico: as células 17 a 20, as
   * últimas da primeira fileira da folha. Ele apontou onde estavam; eu ampliei
   * e conferi antes de escrever o índice, que é o que faltou nas duas vezes em
   * que a Poké Ball saiu errada.
   *
   * ── O CAMPO QUE O MOTOR LÊ É UM SÓ: `cura` ───────────────────────────
   *
   * Quanto de HP o item devolve dentro de um avanço. O motor sabe que existe
   * item que restaura; QUAIS itens fazem isso é decisão do tema (§0.3), e um
   * pack sem poção nenhuma continua jogável.
   *
   * ── OS NÚMEROS SÃO PROPORCIONAIS AO DANO MEDIDO, E NÃO AO DOS JOGOS ──
   *
   * Pedido do dono: *"os danos de combate precisam ser coniventes com a cura,
   * pra não acabar ficando desproporcional"*. Então eles saem de MEDIÇÃO, e não
   * da tabela original — a barra lá tem centenas de pontos, a nossa tem 100.
   *
   * Medido em 300 runs por estágio, na porta de cada um:
   *
   *     wave vencida     ~5 HP
   *     wave perdida    ~15 HP
   *     a RUN INTEIRA   ~95 HP   de uma barra de 100
   *
   * A proporção da série original foi mantida sobre a nossa barra:
   *
   *     Poção     20   desfaz UMA derrota e sobra pouco    (20% da barra)
   *     Super     50   metade da run                        (50%)
   *     Hiper     80   quase a run inteira                  (80%)
   *     Máxima   cheia o que salva a run já perdida
   *
   * A `test/avanco` afirma a relação, e não os números: se alguém mexer no dano
   * das waves, o teste recalcula e reclama. **É assim que cura e dano ficam
   * amarrados** — dois números escritos lado a lado divergem no dia em que um
   * deles for ajustado sozinho.
   *
   * ── E A MÁXIMA NÃO SE COMPRA ─────────────────────────────────────────
   *
   * Ela é a única de BAÚ, e isso liga duas peças do §7.22: falhar custa o baú, e
   * o baú paga o item que salva a próxima tentativa. Com preço, ter dinheiro
   * passaria a ser a estratégia; sem preço, chegar na décima wave é.
   *
   * Nenhuma das quatro pode entrar na loja de dinheiro real — a regra das
   * quatro portas é literal: *a loja monetizada vende o que se VÊ e o que se
   * ESCOLHE, nunca o que DECIDE uma batalha*. Poção decide batalha. */
  { id: 'pocao', nome: 'Poção', en: 'Potion', icone: 17, comoAchei: 'olhado',
    faixa: 'comum', porta: 'loja', preco: 150, cura: 20,
    texto: 'Devolve 20 de vida durante um avanço — o bastante para desfazer uma wave perdida.' },
  { id: 'superpocao', nome: 'Super Poção', en: 'Super Potion', icone: 18, comoAchei: 'olhado',
    faixa: 'incomum', porta: 'loja', preco: 500, cura: 50,
    texto: 'Devolve 50 de vida. Metade da barra: é a que se guarda para a wave do chefe.' },
  { id: 'hiperpocao', nome: 'Hiper Poção', en: 'Hyper Potion', icone: 19, comoAchei: 'olhado',
    faixa: 'raro', porta: 'loja', preco: 1400, cura: 80,
    texto: 'Devolve 80 de vida — quase o custo de um avanço inteiro.' },
  { id: 'pocaomaxima', nome: 'Poção Máxima', en: 'Max Potion', icone: 20, comoAchei: 'olhado',
    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 3, cura: 999,
    texto: 'Enche a vida inteira. Não se compra: sai do baú de um estágio limpo, e é o que salva a run seguinte.' },
];

/* ── O QUE É NOSSO, E MORA NO FIM DA FOLHA ────────────────────────────────
 *
 * O Elo de Ligação, a Essência e o PokéCoin são arte DESTE projeto — não vieram
 * de folha nenhuma. `normalizar-itens.mjs` os acrescenta no fim, numa linha
 * extra, para que exista **um espaço de índice só**.
 *
 * A alternativa era uma segunda folha com um sinalizador de qual usar, e ela
 * paga o preço duas vezes: uma no código que escolhe, outra no dia em que
 * alguém esquecer de escolher. */
export const NOSSOS = [
  { id: 'elo', nome: 'Elo de Ligação', en: 'Linking Cord', icone: 368, comoAchei: 'nosso',
    faixa: 'muitoRaro', porta: 'drop', fonte: 'ferrovelho',
    texto: 'Substitui a troca entre jogadores: evolui as linhas que precisariam dela.' },
  { id: 'essencia', nome: 'Essência', en: 'Essence', icone: 369, comoAchei: 'nosso',
    faixa: 'comum', porta: 'drop',
    texto: 'O material do farm. Troca-se por itens que dinheiro nenhum compra.' },
  { id: 'pokecoin', nome: 'PokéCoin', en: 'PokéCoin', icone: 370, comoAchei: 'nosso',
    faixa: 'comum', porta: 'drop',
    texto: 'O dinheiro do PvE. Pago por encontro, e gasto na loja de bolas.' },
];

export const TODOS = [...PEDRAS, ...HELD, ...BOLAS_EXTRA, ...BOLAS_DO_PACK,
                     ...POCOES, ...NOSSOS];

/* Quantos itens ainda não têm ícone confirmado. A tela de conferência lê isto,
   e o número aparece no relatório do bloco — para que "falta identificar seis"
   nunca vire "está pronto". */
export const SEM_ICONE = TODOS.filter(i => i.comoAchei === 'falta').map(i => i.id);
