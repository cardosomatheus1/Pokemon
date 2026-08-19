/* AS 24 POKÉBOLAS — catálogo puro, e o sorteio da rodada.
 *
 * Antes do V1.15 a arena usava doze cores fixas, atribuídas por índice: o
 * lutador 0 sempre na vermelha, o 1 sempre na azul. Funcionava e era chato — a
 * mesma fila de cores em toda rodada.
 *
 * Agora são 24 modelos e a rodada usa 12 deles, sem repetir, então nunca
 * aparecem duas iguais na mesma arena. Cada modelo tem um SINAL que o
 * diferencia — as listras da Ultra, o M da Master, o aro da Premier —, e é isso
 * que permite reconhecer o modelo num desenho de 13 pixels. Cor sozinha não
 * chega: a Timer e a Premier são as duas quase brancas.
 *
 * SEM ARTE NOVA: tudo é vetor no canvas, zero byte baixado.
 *
 * O SORTEIO SAI DA ÁRVORE DE SEMENTES (§P3), num rótulo próprio do ramo
 * `visual` — irmão de `arena`, `coreografia` e `enfeite`. Consumir do fluxo de
 * enfeite faria uma partícula nova trocar as bolas da rodada; `Math.random`
 * quebraria a reprodutibilidade que o F0.5 comprou.
 */
import { rng } from './motor.mjs';
import { derivar } from '../../engine/seed.mjs';

export const BALLS = [
  { n:'Poké',     top:'#e5443b', ac:'#ffffff', sinal:'liso'   },
  { n:'Great',    top:'#3f6fd8', ac:'#e5443b', sinal:'faixas' },
  { n:'Ultra',    top:'#22262b', ac:'#f0c419', sinal:'faixas' },
  { n:'Master',   top:'#7b3fa0', ac:'#ef94b8', sinal:'M'      },
  { n:'Premier',  top:'#f7f7f7', ac:'#e5443b', sinal:'aro'    },
  { n:'Dusk',     top:'#1f6b46', ac:'#e5443b', sinal:'dusk'   },
  { n:'Luxury',   top:'#1a1a1a', ac:'#f0c419', sinal:'luxo'   },
  { n:'Timer',    top:'#f2f2f2', ac:'#e5443b', sinal:'faixas' },
  { n:'Quick',    top:'#4fb3d9', ac:'#f0c419', sinal:'raio'   },
  { n:'Heal',     top:'#ef94b8', ac:'#f0c419', sinal:'aro'    },
  { n:'Net',      top:'#2f8f9d', ac:'#1b4d57', sinal:'rede'   },
  { n:'Dive',     top:'#63d7ff', ac:'#2b7fa8', sinal:'gotas'  },
  { n:'Nest',     top:'#a8d05a', ac:'#7a9a3a', sinal:'folha'  },
  { n:'Repeat',   top:'#f0c419', ac:'#e5443b', sinal:'aro'    },
  { n:'Love',     top:'#f2a2d8', ac:'#e04a8a', sinal:'coracao'},
  { n:'Friend',   top:'#8fbf5a', ac:'#e5443b', sinal:'ponto'  },
  { n:'Moon',     top:'#2b3a6b', ac:'#f5e07a', sinal:'lua'    },
  { n:'Level',    top:'#e08030', ac:'#f7d9a0', sinal:'faixas' },
  { n:'Cherish',  top:'#b3300f', ac:'#f0c419', sinal:'ponto'  },
  { n:'Beast',    top:'#4ec2c2', ac:'#f2f2f2', sinal:'gotas'  },
  { n:'Safari',   top:'#7a8a4a', ac:'#4f5c2e', sinal:'rede'   },
  { n:'Fast',     top:'#f5d24a', ac:'#e5443b', sinal:'raio'   },
  { n:'Heavy',    top:'#4a5a8a', ac:'#9fb0d8', sinal:'faixas' },
  { n:'Dream',    top:'#f2b6e0', ac:'#8f5ab0', sinal:'lua'    },
];
/* Doze modelos distintos para a rodada, na ordem em que serão usados.
   Embaralha os 24 e corta — assim a ausência de repetição é estrutural, e não
   depende de um laço de "sorteia de novo se já saiu". */
export function sortearBolas(sementeVisual, quantas = 12) {
  const R = rng(derivar(sementeVisual, 'bolas'));
  const idx = BALLS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, quantas).map(i => BALLS[i]);
}
