/* A ESTRUTURA DO MAPA (ST-10.22c4) — camada 0, sem DOM.
 *
 * O Q7 da c3 disse que o que segurava a nota era estrutura, e não acabamento:
 *
 *   o celular   uma FECHADURA — a janela mostra 5 de 18 nós, sem o começo nem
 *               o fim. O SMW mostra o mundo inteiro; aqui o mapa não cabe em
 *               pé, então o que cabe é um MINIMAPA: a trilha inteira numa
 *               linha, com você nela e o troféu na ponta
 *   o mundo     colcha de manchas sobre grama, nada que as ligue. O RIO é o
 *               que liga: nasce na borda, passa entre duas cidades por baixo
 *               da estrada (a estrada vira ponte) e deságua entre as voltas
 *
 * Os dois são dados que a tela pinta. O rio é declarado no pack (`rio` no nó
 * DEPOIS do qual ele corta a estrada), e não aqui: nenhum nome de lugar mora
 * fora do ContentPack. */

const r1 = v => Math.round(v * 10) / 10;

/* O MINIMAPA: cada nó numa posição `t` de 0 a 100, na ordem do caminho, e até
   onde se andou. Caminho vencido de ponta a ponta anda tudo. */
export function miniMapa(mapa) {
  const nos = mapa?.nos ?? [], ult = Math.max(1, nos.length - 1);
  const pontos = nos.map((n, i) => ({ id: n.id, curto: n.curto ?? n.nome ?? n.id, tipo: n.tipo, estado: n.estado, final: !!n.final, t: r1((100 * i) / ult) }));
  const atual = pontos.find(p => p.estado === 'atual');
  return { pontos, andado: atual ? atual.t : 100 };
}

/* O RIO: nasce na borda de cima, desce serpenteando, cruza a estrada no MEIO
   do trecho entre o nó que o declara e o seguinte, e deságua um pouco abaixo
   — entre as duas voltas do caminho, sem tocar a de baixo. Em unidades do
   mapa deitado (0–100); em pé, a tela troca x e y, como faz com a estrada. */
export const DESCIDA_DA_FOZ = 16;
export function rioDoMapa(mapa) {
  const nos = mapa?.nos ?? [];
  return nos.flatMap((a, i) => {
    const b = nos[i + 1];
    if (!a.rio || !b) return [];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const pontos = [{ x: r1(m.x - 1.8), y: 0 }, { x: r1(m.x + 1.4), y: r1(m.y * 0.4) }, { x: r1(m.x - 0.9), y: r1(m.y * 0.75) },
      { x: r1(m.x), y: r1(m.y) }, { x: r1(m.x + 1.2), y: r1(m.y + DESCIDA_DA_FOZ * 0.5) }, { x: r1(m.x - 0.4), y: r1(m.y + DESCIDA_DA_FOZ) }];
    /* ST-10.22d: a PONTE fica onde o rio cruza a estrada — o meio do trecho. */
    return [{ entre: [a.id, b.id], pontos, foz: pontos.at(-1), ponte: { x: r1(m.x), y: r1(m.y) } }];
  });
}
