/* A ARTE DO MUNDO DO MAPA, EM PIXEL (ST-10.22b · L-209) — arte NOSSA.
 *
 *   node tools/pixel-arte.mjs        regrava arte/mapa/*.svg e arte/clima/*.svg
 *
 * A fonte de cada peça é a grade abaixo, um caractere por pixel, e a paleta
 * dela: é o que se edita. O SVG sai com `crispEdges`, um <rect> por corrida
 * de pixels da mesma cor na linha — lê como pixel em qualquer escala, sem
 * arquivo binário no repositório.
 *
 * A folha de terceiros (`pret`) só tem a árvore e a rocha do mapa. O que
 * faltava para o mapa ter REGIÕES — a casa da cidade, a flor, o junco do
 * pântano, a pedra do planalto, a torre da usina — é desenhado aqui, na
 * paleta da era (contorno escuro, três tons por material, luz de cima à
 * esquerda). A regra de cópia do CLAUDE.md: a referência é o tile de Kanto;
 * a nossa diferença é a janela e a torre acesas no neon da interface.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const K = '#1d2a1a';                      // o contorno da era, quase preto esverdeado
const PECAS = {
  casa_vermelha: {
    paleta: { k: K, r: '#d4503a', R: '#f07a5e', d: '#8f2c20', w: '#f2e8cc', s: '#cdbf9a', b: '#6fd8ff', B: '#2f86b8', D: '#5a3a22', c: '#8a7a5a' },
    grade: [
      '................',
      '...kkkkkkkkkk...',
      '..kRRRRRRRRRRk..',
      '.kRrrrrrrrrrrrk.',
      'krrrrrrrrrrrrrrk',
      'krrrrrrrrrrrrrrk',
      'kddddddddddddddk',
      '.kwwwwwwwwwwwwk.',
      '.kwkkkwwwwkkkwk.',
      '.kwkbkwwwwkbkwk.',
      '.kwkBkwkkwkBkwk.',
      '.kwwwwwkDkwwwwk.',
      '.kssssskDksssssk',
      '.kkkkkkkkkkkkkk.',
      '..cccccccccccc..',
      '................',
    ],
  },
  casa_azul: {
    paleta: { k: K, r: '#3f64c8', R: '#6a8fe8', d: '#27417f', w: '#f2e8cc', s: '#cdbf9a', b: '#6fd8ff', B: '#2f86b8', D: '#5a3a22', c: '#8a7a5a' },
    grade: 'casa_vermelha',
  },
  flores: {
    paleta: { g: '#2f7d2a', G: '#57a83f', r: '#ff5a6a', R: '#ffd0d6', y: '#ffd23f', Y: '#fff3b0', w: '#ffffff', o: '#e08a1a' },
    grade: [
      '................',
      '..R.............',
      '.RrR......Y.....',
      '..R......YyY....',
      '..g.......Y..w..',
      '..g..G....g.wow.',
      '.Gg.......g..w..',
      '..g..w...Gg..g..',
      '....wow......g..',
      '.....w..R....gG.',
      '.....g.RrR......',
      '....Gg..R.......',
      '.....g..g..G....',
      '........gG......',
      '................',
      '................',
    ],
  },
  junco: {
    paleta: { k: K, b: '#7a4a24', B: '#a8683a', g: '#3f7a2e', G: '#6fae4a' },
    grade: [
      '................',
      '....k.....k.....',
      '...kbk...kbk..k.',
      '...kBk...kBk.kbk',
      '...kbk...kbk.kBk',
      '...kbk...kbk.kbk',
      '....g.....g...g.',
      '....g.....g...g.',
      '...Gg....gG..Gg.',
      '...gg.G..g...g..',
      '..G.g.g.Gg..Gg..',
      '..g.g.g.g.g.g.g.',
      '.G..g..gg..gg...',
      '.g..g..g...g....',
      '................',
      '................',
    ],
  },
  pilar: {
    paleta: { k: K, p: '#9a8fb8', P: '#c9bfe8', d: '#5f567f', a: '#3a3552' },
    grade: [
      '................',
      '....kkkkkkkk....',
      '...kPPPPPPPPk...',
      '...kdddddddk....',
      '....kPppppdk....',
      '....kPppppdk....',
      '....kPpkppdk....',
      '....kPppppdk....',
      '....kPpppkdk....',
      '....kPppppdk....',
      '....kPppppdk....',
      '...kPPppppddk...',
      '..kPPPpppppddk..',
      '..kdddddddddak..',
      '...aaaaaaaaaa...',
      '................',
    ],
  },
  /* A torre da usina: aço, e o fio aceso no neon da interface — é a peça do
     mapa que diz "aqui mora o Elétrico" antes do nome. */
  torre: {
    paleta: { k: K, m: '#8e96a6', M: '#c4ccd8', d: '#555d6d', n: '#2ff0ff', N: '#b8fcff', y: '#ffd23f' },
    grade: [
      '.......kk.......',
      '..nNnnkMMknnNn..',
      '......kmmk......',
      '.....kMmmdk.....',
      '....kyMmmdyk....',
      '.....kMkkdk.....',
      '.....kMmmdk.....',
      '....kMmkkmdk....',
      '....kMk..kdk....',
      '...kMmk..kmdk...',
      '...kMkkkkkkdk...',
      '..kMmk....kmdk..',
      '..kMk......kdk..',
      '.kMmk......kmdk.',
      '.kkkk......kkkk.',
      '................',
    ],
  },
  casa_verde: {
    paleta: { k: K, r: '#3f9a4a', R: '#6cc46e', d: '#256b30', w: '#f2e8cc', s: '#cdbf9a', b: '#6fd8ff', B: '#2f86b8', D: '#5a3a22', c: '#8a7a5a' },
    grade: 'casa_vermelha',
  },
  casa_roxa: {
    paleta: { k: K, r: '#8a58c8', R: '#b48ae8', d: '#5a3490', w: '#f2e8cc', s: '#cdbf9a', b: '#6fd8ff', B: '#2f86b8', D: '#5a3a22', c: '#8a7a5a' },
    grade: 'casa_vermelha',
  },
  /* A árvore redonda e o pinheiro: a parede e a floresta deixam de ser a
     mesma árvore do `pret` em fileira (Q7 da ST-10.22b). */
  arvore: {
    paleta: { k: K, g: '#3f8a34', G: '#6cbf4a', d: '#255c22', t: '#6a4424', T: '#8e5e32' },
    grade: [
      '.....kkkkkk.....',
      '...kkGGGGggkk...',
      '..kGGGGggggggk..',
      '.kGGGggggggddgk.',
      '.kGGgggggggddgk.',
      'kGGggggGgggddddk',
      'kGgggggggggddddk',
      'kgggggggggdddddk',
      'kggGgggggddddddk',
      '.kgggggddddddgk.',
      '.kdgggdddddddk..',
      '..kkddddddkkk...',
      '....kkTtkk......',
      '......Ttk.......',
      '.....kTtk.......',
      '....kkkkkk......',
    ],
  },
  pinheiro: {
    paleta: { k: K, g: '#2f7a3a', G: '#58a85a', d: '#1c5028', t: '#6a4424' },
    grade: [
      '.......kk.......',
      '......kGgk......',
      '.....kGggdk.....',
      '....kGgggddk....',
      '.....kGgddk.....',
      '....kGggdddk....',
      '...kGgggddddk...',
      '..kGgggdddddk...',
      '....kGgddddk....',
      '...kGgggddddk...',
      '..kGggggdddddk..',
      '.kGgggggddddddk.',
      '.kkkkkkkkkkkkkk.',
      '.......td.......',
      '......kttk......',
      '................',
    ],
  },
  /* O braseiro da Liga: pedra do planalto e a chama no neon da interface. Os
     pilares lisos liam como lápides (Q7 da ST-10.22b). */
  braseiro: {
    paleta: { k: K, p: '#9a8fb8', P: '#c9bfe8', d: '#5f567f', n: '#2ff0ff', N: '#dcfeff', b: '#1a8fb8' },
    grade: [
      '.......nN.......',
      '......nNNn......',
      '.....nnNNbn.....',
      '....bnnNNnnb....',
      '....bnnnnnnb....',
      '..kkkkkkkkkkkk..',
      '..kPPPPPPPPPdk..',
      '...kPpppppddk...',
      '....kkPpdkk.....',
      '.....kPpdk......',
      '.....kPpdk......',
      '.....kPpdk......',
      '....kPPpddk.....',
      '...kPPppdddk....',
      '...kkkkkkkkk....',
      '................',
    ],
  },
  /* ── OS MARCOS DAS CIDADES (ST-10.22b, 3ª rodada do Q7: "toda cidade é o
     mesmo molde — duas casas espelhadas"). Um por cidade, 16 × 24 ou 24 × 24. */
  farol: {   // Vermilion, o porto
    paleta: { k: K, w: '#f4f0e6', W: '#ffffff', r: '#d4503a', d: '#9a9488', y: '#ffe066', Y: '#fff6c0', n: '#2ff0ff', s: '#6a6e78' },
    grade: [
      '......kkkk......',
      '.....kYyyYk.....',
      '....nkyYYykn....',
      '.....kkkkkk.....',
      '......krrk......',
      '.....kWwwdk.....',
      '.....krrrrk.....',
      '.....kWwwdk.....',
      '....krrrrrrk....',
      '....kWwwwwdk....',
      '....kWwkkwdk....',
      '....krrrrrrk....',
      '...kWwwwwwwdk...',
      '...kWwwwwwwdk...',
      '...krrrrrrrrk...',
      '..kWwwwkkwwwdk..',
      '..kWwwwkkwwwdk..',
      '..krrrrrrrrrrk..',
      '.kssssssssssssk.',
      '.kkkkkkkkkkkkkk.',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  torre_silph: {   // Saffron, a cidade: a torre de vidro com o letreiro neon
    paleta: { k: K, g: '#8fa6c8', G: '#c6d6ee', d: '#58688a', b: '#6fd8ff', B: '#2f86b8', n: '#2ff0ff', N: '#dcfeff', m: '#ff4fd8' },
    grade: [
      '.......kk.......',
      '.......nk.......',
      '....kkkkkkkk....',
      '....kGGGGggk....',
      '....kGbGbGdk....',
      '....kGBgBgdk....',
      '....kmmmmmmk....',
      '....kGbGbGdk....',
      '...kkGBgBgdkk...',
      '...kGGbGbGgdk...',
      '...kGGBgBgddk...',
      '...knnnNNnnnk...',
      '...kGGbGbGgdk...',
      '...kGGBgBgddk...',
      '...kGGbGbGgdk...',
      '..kkGGBgBgddkk..',
      '..kGGGbGbGgddk..',
      '..kGGGBgBgdddk..',
      '..kGGGbGbGgddk..',
      '..kGGGGkkgdddk..',
      '..kGGGGkkgdddk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
  },
  loja: {   // Celadon, a loja de departamentos
    paleta: { k: K, w: '#f2e8cc', s: '#cdbf9a', r: '#3fae6a', R: '#6cd49a', b: '#6fd8ff', B: '#2f86b8', D: '#5a3a22', y: '#ffd23f' },
    grade: [
      '..kkkkkkkkkkkk..',
      '..kRRRRRRRRRRk..',
      '..krrrrrrrrrrk..',
      '..kwwwwwwwwwsk..',
      '..kwbkbkbkbksk..',
      '..kwBkBkBkBksk..',
      '..kwwwwwwwwwsk..',
      '..kwbkbkbkbksk..',
      '..kwBkBkBkBksk..',
      '..kwwwwwwwwwsk..',
      '..kwbkbkbkbksk..',
      '..kwBkBkBkBksk..',
      '..kyyyyyyyyyyk..',
      '..kwwwwwwwwwsk..',
      '..kwbkbkkbkbsk..',
      '..kwBkBDDkBksk..',
      '..kwwwwDDwwwsk..',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  museu: {   // Pewter, o museu (a pedra e o fóssil)
    paleta: { k: K, p: '#b8b0a0', P: '#dcd6c8', d: '#7a7466', r: '#8a6a3e', w: '#f2e8cc', D: '#5a3a22' },
    grade: [
      '........................',
      '...........kk...........',
      '.........kkPPkk.........',
      '.......kkPPPPPPkk.......',
      '.....kkPPPPPPPPPPkk.....',
      '...kkPPPPPPPPPPPPPPkk...',
      '..kddddddddddddddddddk..',
      '..kkkkkkkkkkkkkkkkkkkk..',
      '...kPkkPkkPkkPkkPkkPk...',
      '...kPdkPdkPdkPdkPdkPk...',
      '...kPdkPdkPdkPdkPdkPk...',
      '...kPdkPdkPkkPdkPdkPk...',
      '...kPdkPdkPDDPdkPdkPk...',
      '...kPdkPdkPDDPdkPdkPk...',
      '..kkkkkkkkkkkkkkkkkkkk..',
      '.kppppppppppppppppppppk.',
      '.kkkkkkkkkkkkkkkkkkkkkk.',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
  vulcao: {   // Cinnabar, o cone
    paleta: { k: K, r: '#6a4638', R: '#8e5e48', d: '#3a2520', o: '#ff6a1a', y: '#ffd23f', Y: '#fff2a8', s: '#bdb4b0' },
    grade: [
      '........ss..............',
      '......s..ss..s..........',
      '........s...s...........',
      '.........kkkk...........',
      '........kYyyok..........',
      '.......kryooodk.........',
      '......kRroooddk.........',
      '......kRrrordddk........',
      '.....kRRrrrodddk........',
      '.....kRrrrrrodddk.......',
      '....kRRrrrrroddddk......',
      '....kRrrrrrrrodddk......',
      '...kRRrrrrrrrrddddk.....',
      '...kRrrrrrrrrrodddk.....',
      '..kRRrrrrrrrrrrddddk....',
      '..kRrrrrrrrrrrrrddddk...',
      '.kRRrrrrrrrrrrrrdddddk..',
      '.kkkkkkkkkkkkkkkkkkkkk..',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
  portao_safari: {   // Fuchsia, o portão da zona safári
    paleta: { k: K, t: '#8e5e32', T: '#b07a44', d: '#5a3a22', g: '#3f8a34', G: '#6cbf4a', y: '#ffd23f', w: '#f2e8cc' },
    grade: [
      '........................',
      '..kkk..............kkk..',
      '..kTk..kkkkkkkkkk..kTk..',
      '..kTkkkyyyyyyyyyykkkTk..',
      '..kTtkkywkwwkwkwykktTk..',
      '..kTtkkyyyyyyyyyykktTk..',
      '..kTtkkkkkkkkkkkkkktTk..',
      '..kTtk............ktTk..',
      '..kTtk............ktTk..',
      '.GkTtkG..........GktTkG.',
      'GGkTtkGG........GGktTkGG',
      'gGkTtkGg........gGktTkGg',
      'ggkkkkgg........ggkkkkgg',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
  palacio: {   // a Liga: o salão do planalto, com a cúpula acesa
    paleta: { k: K, p: '#9a8fb8', P: '#c9bfe8', d: '#5f567f', n: '#2ff0ff', N: '#dcfeff', y: '#ffd23f', D: '#2a2440' },
    grade: [
      '...........kk...........',
      '..........kNNk..........',
      '.........knNNnk.........',
      '........knnNNnnk........',
      '.......kknnnnnnkk.......',
      '......kPPPPPPPPPPk......',
      '..kk..kPdddddddddk..kk..',
      '.kPPk.kPPPPPPPPPPk.kPPk.',
      '.kPdkkkkkkkkkkkkkkkkPdk.',
      '.kPdkPPPPPPPPPPPPPPkPdk.',
      '.kPdkPdkPdkkkPdkPdkkPdk.',
      '.kPdkPdkPdkyykPdkPdkPdk.',
      '.kPdkPdkPdkyykPdkPdkPdk.',
      '.kPdkPdkPdkDDkPdkPdkPdk.',
      '.kPdkPdkPdkDDkPdkPdkPdk.',
      'kkkkkkkkkkkkkkkkkkkkkkkk',
      'kPPPPPPPPPPPPPPPPPPPPPPk',
      'kkkkkkkkkkkkkkkkkkkkkkkk',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  },
};

/* ST-5.16 (L-194): os ÍCONES DE CLIMA, arte NOSSA — os emojis de sistema
 * (☀️ 🌬️ ⛅ ❄️ 🌧️) destoavam do tema pixel/neon, e cada sistema os desenha de um
 * jeito. 12 × 12, contorno escuro onde a peça fica sobre painel escuro; o vento
 * e a névoa sem contorno (são ar). Saem em arte/clima/, quadrados (sem aparar). */
const CLIMAS = {
  neutro: {
    paleta: { k: '#1f2a3a', o: '#f0901a', Y: '#ffe45a', w: '#e8eef6', c: '#aebccc' },
    grade: [
      '.......kk...',
      '......kook..',
      '.....koYYok.',
      '....koYYYYok',
      '...kwwwwYYok',
      '..kkwwwwwok.',
      '.kwwwwwwwwwk',
      'kwwwwwwwwwwk',
      'kwwwwwwwwwwk',
      'kcccccccccck',
      '.kkkkkkkkkk.',
      '............',
    ],
  },
  sol: {
    paleta: { k: '#6a3a00', o: '#f0901a', Y: '#ffe45a', y: '#ffc42a' },
    grade: [
      '.....y......',
      '.....y......',
      '..y.kkkk.y..',
      '...kooook...',
      '..kooYYook..',
      '..koYYYYok..',
      'yykoYYYYokyy',
      '..kooYYook..',
      '...kooook...',
      '..y.kkkk.y..',
      '......y.....',
      '......y.....',
    ],
  },
  chuva: {
    paleta: { k: '#1f2a3a', g: '#9aa8ba', G: '#6f7d90', b: '#6fd0ff', B: '#2f86b8' },
    grade: [
      '....kggkk...',
      '..kkgggggk..',
      '.kggggggggk.',
      'kggggggggggk',
      'kggggggggggk',
      'kGGGGGGGGGGk',
      '.kkkkkkkkkk.',
      '............',
      '...b..b..b..',
      '...B..B..B..',
      '..b..b..b...',
      '..B..B..B...',
    ],
  },
  vento: {
    paleta: { w: '#eaf8ff', c: '#8fe3ff' },
    grade: [
      '............',
      '.......ww...',
      'wwwwwww..w..',
      '.........w..',
      '.......ww...',
      '............',
      'cccccccccc..',
      '..........c.',
      '.........c..',
      '............',
      '.wwwwww.....',
      '............',
    ],
  },
  neve: {
    paleta: { c: '#8fe3ff', w: '#eaf8ff', W: '#ffffff' },
    grade: [
      '.....c......',
      '..c..w..c...',
      '...w.w.w....',
      '....www.....',
      '.c..www..c..',
      'cwwwwWwwwwc.',
      '.c..www..c..',
      '....www.....',
      '...w.w.w....',
      '..c..w..c...',
      '.....c......',
      '............',
    ],
  },
  tempestade: {
    paleta: { k: '#12161f', d: '#8a93a6', D: '#5f6878', y: '#ffe45a' },
    grade: [
      '....kddkk...',
      '..kkdddddk..',
      '.kddddddddk.',
      'kddddddddddk',
      'kddddddddddk',
      'kDDDDDDDDDDk',
      '.kkkkkkkkkk.',
      '.......y....',
      '......y.....',
      '.....yyy....',
      '......y.....',
      '.....y......',
    ],
  },
  nevoa: {
    paleta: { p: '#b07ae0', P: '#8a52c8' },
    grade: [
      '............',
      '............',
      '............',
      '..pPppPppPp.',
      '............',
      'pPppPppPp...',
      '............',
      '...ppPppPppP',
      '............',
      '.ppPppPppP..',
      '............',
      '............',
    ],
  },
  polen: {
    paleta: { k: '#5a2a48', y: '#f5b8d8', o: '#ffd84a' },
    grade: [
      '............',
      '.y..kkkk....',
      '...kyyyyk.y.',
      '..kkyyyykk..',
      '.kyykyykyyk.',
      '.kyyyooyyyk.',
      '.kyyyooyyyk.',
      '.kyykyykyyk.',
      '..kkyyyykk..',
      '...kyyyyk...',
      '.y..kkkk..y.',
      '............',
    ],
  },
};

function gravar(pecas, pasta, { apara = true, bloco = 'ST-10.22b' } = {}) {
  const PASTA = new URL(`../arte/${pasta}/`, import.meta.url);
  mkdirSync(PASTA, { recursive: true });
  for (const [nome, peca] of Object.entries(pecas)) {
    const cheia = typeof peca.grade === 'string' ? pecas[peca.grade].grade : peca.grade;
    /* Linhas vazias no pé saem: o marco se apoia no ponto dele pela base. O
       ícone de clima não apara — é quadrado, e fica numa linha de texto. */
    const grade = apara ? cheia.slice(0, cheia.length - [...cheia].reverse().findIndex(l => /[^.]/.test(l))) : cheia;
    /* ST-10.22b: o marco de cada cidade é maior que uma casa — a grade pode ter
       outro tamanho, desde que retangular. */
    const L = grade[0].length, A = grade.length;
    if (grade.some(l => l.length !== L)) throw new Error(`${nome}: a grade não é retangular (${grade.map(l => l.length).join(',')})`);
    const rects = [];
    grade.forEach((linha, y) => {
      for (let x = 0; x < L;) {
        const ch = linha[x];
        let fim = x + 1;
        while (fim < L && linha[fim] === ch) fim++;
        if (ch !== '.') {
          const cor = peca.paleta[ch];
          if (!cor) throw new Error(`${nome}: cor '${ch}' fora da paleta (linha ${y})`);
          rects.push(`<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${cor}"/>`);
        }
        x = fim;
      }
    });
    writeFileSync(new URL(`${nome}.svg`, PASTA),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}" width="${L * 2}" height="${A * 2}" shape-rendering="crispEdges">\n`
      + `<!-- ${nome} — arte nossa (${bloco}), gerada por tools/pixel-arte.mjs; edite a grade lá. -->\n${rects.join('\n')}\n</svg>\n`);
    console.log(`arte/${pasta}/${nome}.svg  ${rects.length} corridas`);
  }
}
gravar(PECAS, 'mapa');
gravar(CLIMAS, 'clima', { apara: false, bloco: 'ST-5.16' });
