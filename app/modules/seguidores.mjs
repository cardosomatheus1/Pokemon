/* QUEM VEM ATRÁS (ST-2.33b) — camada 0.
 *
 * O 7º relato: *"só o líder anda, sem os outros dois membros do time"*. A run
 * leva até três, e o mapa mostrava um. O resto do time segue o líder como no
 * gênero: cada um pisa onde o da frente pisou, um passo atrás.
 *
 * O rastro é o caminho que o líder já fez, com a distância acumulada em cada
 * ponto. Seguir pelo caminho, e não por uma posição fixa atrás dele, é o que
 * faz a fila contornar a água e a árvore pelo mesmo lugar que o líder — uma
 * posição fixa cortaria o canto e pisaria na margem.
 */
import { direcaoDe } from './vida.mjs';

/* px de mundo entre um seguidor e o próximo: perto o bastante para ler como
   fila, longe o bastante para os pés não se sobreporem */
export const PASSO_DO_SEGUIDOR = 30;   /* 22 no 1º desenho: na captura, os três se sobrepunham */
export const SEGUIDORES_MAX = 2;

/* Um salto maior que isto num quadro é troca de bioma ou de cena, e não
   caminhada: o rastro recomeça, senão o seguidor atravessaria o mapa. */
const SALTO = 120;
/* O rastro guarda só o pedaço que os seguidores usam, mais folga: numa aba
   aberta por horas ele não pode crescer sem fim. */
const GUARDA = (SEGUIDORES_MAX + 1) * PASSO_DO_SEGUIDOR + 40;

export function registrarNoRastro(rastro, p) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return rastro ?? [];
  const ult = rastro?.at(-1);
  if (!ult) return [{ x: p.x, y: p.y, dir: p.dir ?? 'baixo', d: 0 }];
  const passo = Math.hypot(p.x - ult.x, p.y - ult.y);
  if (passo > SALTO) return [{ x: p.x, y: p.y, dir: p.dir ?? 'baixo', d: 0 }];
  if (passo < 0.5) return rastro;
  const novo = [...rastro, { x: p.x, y: p.y, dir: p.dir ?? ult.dir, d: ult.d + passo }];
  const corte = novo.at(-1).d - GUARDA;
  let i = 0;
  while (i < novo.length - 2 && novo[i + 1].d < corte) i++;
  return i ? novo.slice(i) : novo;
}

/* Onde pisam os `n` de trás. O k-ésimo fica k passos atrás do líder ao longo
   do rastro; rastro curto demais, ele espera no começo — parado, e não
   andando no lugar. */
export function posicoesDoRastro(rastro, n, passo = PASSO_DO_SEGUIDOR) {
  if (!rastro?.length || !(n > 0)) return [];
  const fim = rastro.at(-1).d;
  const saida = [];
  for (let k = 1; k <= n; k++) {
    const alvo = fim - k * passo;
    if (alvo <= rastro[0].d) {
      saida.push({ x: rastro[0].x, y: rastro[0].y, dir: rastro[0].dir, andando: false, distancia: Math.max(0, alvo) });
      continue;
    }
    let i = 1;
    while (i < rastro.length - 1 && rastro[i].d < alvo) i++;
    const a = rastro[i - 1], b = rastro[i], t = (alvo - a.d) / Math.max(1e-9, b.d - a.d);
    saida.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
                 dir: direcaoDe(b.x - a.x, b.y - a.y), andando: true, distancia: alvo });
  }
  return saida;
}
