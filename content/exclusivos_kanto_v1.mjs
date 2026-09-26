/* OS GOLPES EXCLUSIVOS DA FORMA PRÉ-EVOLUÍDA — Kanto (ST-10.3 · Spec §7.10).
 *
 * "Evoluir ou esperar": cada linha tem um golpe (dois nos iniciais e no
 * dragão) que SÓ a forma de antes aprende, e só a partir de um nível ACIMA
 * daquele em que ela já poderia evoluir — o nível da evolução + 6. Quem evolui
 * na primeira chance perde o golpe para sempre; quem espera o aprende e o leva
 * para a forma final. Nas evoluções por pedra, o nível é 20.
 *
 * O golpe é de um tipo que NENHUMA forma seguinte da linha alcança (nem pelo
 * próprio tipo, nem pela reserva) — é isso que o faz exclusivo, e o teste de
 * conteúdo cobra. Todo golpe já existe no pack: o treino o acha pelo nome.
 *
 * Chave: o dex da forma que APRENDE. */
export const EXCLUSIVOS = {
  1:   [{ n: 'Mud Shot', nivel: 22 }],        // o bulbo que se enterra
  2:   [{ n: 'Body Press', nivel: 38 }],
  4:   [{ n: 'Dragon Claw', nivel: 22 }],     // o dragão que a forma final esquece
  5:   [{ n: 'Crunch', nivel: 42 }],
  7:   [{ n: 'Ice Fang', nivel: 22 }],
  8:   [{ n: 'Iron Tail', nivel: 42 }],
  10:  [{ n: 'Magical Leaf', nivel: 13 }],    // a lagarta que come folha
  13:  [{ n: 'Knock Off', nivel: 13 }],
  16:  [{ n: 'Mud Shot', nivel: 24 }],        // a areia no olho
  19:  [{ n: 'Crunch', nivel: 26 }],
  21:  [{ n: 'Payback', nivel: 26 }],
  23:  [{ n: 'Crunch', nivel: 28 }],
  27:  [{ n: 'X-Scissor', nivel: 32 }],
  29:  [{ n: 'Crunch', nivel: 22 }],
  32:  [{ n: 'Megahorn', nivel: 22 }],        // o chifre
  41:  [{ n: 'Bite', nivel: 28 }],
  43:  [{ n: 'Moonblast', nivel: 27 }],       // a flor da lua
  46:  [{ n: 'Dig', nivel: 30 }],
  48:  [{ n: 'Psyshock', nivel: 37 }],
  50:  [{ n: 'Rock Tomb', nivel: 32 }],
  52:  [{ n: 'Payback', nivel: 34 }],
  54:  [{ n: 'Psychic', nivel: 39 }],         // a dor de cabeça que a forma final perde
  56:  [{ n: 'Payback', nivel: 34 }],
  60:  [{ n: 'Psyshock', nivel: 31 }],        // a espiral que hipnotiza
  63:  [{ n: 'Dazzling Gleam', nivel: 22 }],
  66:  [{ n: 'Rock Tomb', nivel: 34 }],
  69:  [{ n: 'Bug Bite', nivel: 27 }],        // a planta que come inseto
  72:  [{ n: 'Ice Beam', nivel: 36 }],
  74:  [{ n: 'Iron Head', nivel: 31 }],
  77:  [{ n: 'Megahorn', nivel: 46 }],
  79:  [{ n: 'Iron Tail', nivel: 43 }],
  81:  [{ n: 'Signal Beam', nivel: 36 }],
  84:  [{ n: 'Zen Headbutt', nivel: 37 }],    // duas cabeças
  86:  [{ n: 'Iron Head', nivel: 40 }],
  88:  [{ n: 'Knock Off', nivel: 44 }],
  92:  [{ n: 'Dark Pulse', nivel: 31 }],
  96:  [{ n: 'Shadow Ball', nivel: 32 }],     // o que come sonho
  98:  [{ n: 'X-Scissor', nivel: 34 }],
  100: [{ n: 'Flash Cannon', nivel: 36 }],
  104: [{ n: 'Shadow Claw', nivel: 34 }],
  109: [{ n: 'Flamethrower', nivel: 41 }],
  111: [{ n: 'Megahorn', nivel: 48 }],
  116: [{ n: 'Dragon Pulse', nivel: 38 }],    // o cavalo-marinho que quer ser dragão
  118: [{ n: 'Megahorn', nivel: 39 }],
  129: [{ n: 'Outrage', nivel: 26 }],         // o fraco que carrega a fúria
  138: [{ n: 'Ice Beam', nivel: 46 }],
  140: [{ n: 'X-Scissor', nivel: 46 }],
  147: [{ n: 'Surf', nivel: 36 }],
  148: [{ n: 'Thunderbolt', nivel: 61 }],
  25:  [{ n: 'Iron Tail', nivel: 20 }],
  35:  [{ n: 'Meteor Mash', nivel: 20 }],
  37:  [{ n: 'Shadow Ball', nivel: 20 }],
  39:  [{ n: 'Psychic', nivel: 20 }],
  58:  [{ n: 'Crunch', nivel: 20 }],
  90:  [{ n: 'Iron Head', nivel: 20 }],
  102: [{ n: 'Ancient Power', nivel: 20 }],
  120: [{ n: 'Thunderbolt', nivel: 20 }],
  133: [{ n: 'Moonblast', nivel: 20 }],
};
