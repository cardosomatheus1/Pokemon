/* A SEPARAÇÃO DAS PLACAS — camada 0. Saiu do `avanco-geometria.mjs` na
   ST-2.33b, quando ganhou os sprites como obstáculo e o arquivo passou de 600
   linhas: é uma responsabilidade só (onde cada placa cabe), e quem a usa
   continua importando de lá. */
/* ── SEPARAR O QUE SE ENCOSTA — a geometria do D-081 ──────────────────────
 *
 * As placas de nome e vida têm largura fixa e se centram no lutador. O desenho
 * do A4g manda o selvagem ATÉ o companheiro para brigar, então dois lutadores
 * encostados são duas placas no mesmo lugar — sempre, e exatamente no instante
 * em que o jogador mais quer ler as duas.
 *
 * ── POR QUE A CONTA MORA AQUI, E NÃO JUNTO DOS ELEMENTOS ────────────────
 *
 * Porque ela é geometria pura, e geometria pura neste projeto tem teste sem
 * navegador. A primeira versão morava no `avanco-hud.mjs`, misturada com
 * `style.transform` — e o portão Q2 provou o custo: o defeito plantado que
 * DESLIGA a aplicação passou, porque nenhum teste conseguia olhar o resultado
 * sem montar um DOM.
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém. Separar a conta do desenho é o que a torna afirmável.
 *
 * ── SEPARAR, E NUNCA ESCONDER ───────────────────────────────────────────
 *
 * Sumir com a de baixo resolveria a sobreposição perdendo informação — e a
 * perdida seria a do bicho que está apanhando. Todo ponto que entra, sai.
 *
 * A ordem é de cima para baixo, e ela importa: resolvida na ordem de chegada,
 * duas placas trocariam de lugar quando um mob nascesse, e a troca é mais
 * difícil de ler que a sobreposição. */
export const VOLTAS_DA_SEPARACAO = 8;

/* ── E SEM COBRIR O BICHO DOS OUTROS (ST-2.33b) ──────────────────────────
 *
 * O 7º relato: *"os nomes ficam por cima dos sprites"*. A placa mora no pé do
 * dono, e com dois bichos um sobre o outro ela caía em cima do de baixo. Com
 * os sprites como `obstaculos`, cada placa escolhe entre o pé e o alto da
 * cabeça (`topo`) do próprio dono o lugar que menos cobre os OUTROS — o
 * dono ela pode tocar, é dele que ela fala. Sem `topo` e sem obstáculos, o
 * comportamento é o de antes. */
const sobra = (x, y, L, A, o) =>
  Math.max(0, Math.min(x + L / 2, o.x + o.w) - Math.max(x - L / 2, o.x)) *
  Math.max(0, Math.min(y + A, o.y + o.h) - Math.max(y, o.y));

export function separarPontos(pontos, { largura, altura, obstaculos = [] } = {}) {
  const L = Number(largura) || 0;
  const A = Number(altura) || 0;
  const fila = [...(pontos ?? [])]
    .filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.y - b.y);

  const postos = [];
  for (const p of fila) {
    const outros = (obstaculos ?? []).filter(o => o && o.chave !== p.chave);
    const custo = y => outros.reduce((s, o) => s + sobra(p.x, y, L, A, o), 0) +
      postos.reduce((s, q) => s + sobra(p.x, y, L, A, { x: q.x - L / 2, y: q.y, w: L, h: A }), 0);
    const candidatos = Number.isFinite(p.topo) ? [p.y, p.topo - A] : [p.y];
    let y = candidatos.reduce((m, c) => (custo(c) < custo(m) ? c : m), candidatos[0]);
    /* O TETO DE VOLTAS existe porque a lista é curta e isto roda por quadro:
       com quatro lutadores nunca chega perto, e num caso patológico é melhor
       uma placa encostada que um quadro travado. */
    for (let volta = 0; volta < VOLTAS_DA_SEPARACAO; volta++) {
      const bateu = postos.find(q => Math.abs(q.x - p.x) < L && Math.abs(q.y - y) < A);
      if (!bateu) break;
      /* PARA BAIXO: a placa já mora abaixo do sprite, e é a única direção que
         não atravessa o bicho que ela descreve. */
      y = bateu.y + A;
    }
    postos.push({ ...p, y });
  }
  return postos;
}

