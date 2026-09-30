/* ST-10.22e · O MAPA COMO GRADE DE TILES.
 *
 * Cinco rodadas de Q7 (barra: o mapa do SMW) descreveram o mesmo teto: o
 * mundo era regiões pousadas sobre um tapete de grama — manchas, e não um
 * lugar. Aqui o chão INTEIRO é uma grade de células de 32 px (o tile 16 × 16
 * em 2×), e cada célula é decidida em camada 0: o chão do nó mais perto
 * dentro de um raio, com a borda em ruído; grama fora; mar em volta do vulcão.
 * A transição (o chão de mais precedência invade a borda do vizinho) e a face
 * de penhasco (o chão mais alto sobre o mais baixo) também são decisões
 * daqui; a tela só pinta. */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { mapaDaJornada, REGIOES } from '../app/modules/jornada-dados.mjs';
import { gradeDoChao, transicoes, cantos, margens, temFace, MATERIAIS, CELULA } from '../app/modules/jornada-chao.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('jornada-chao');

  s.teste('cada célula é o chão do nó mais perto; longe é grama; o vulcão é ilha', () => {
    const nos = [{ x: 100, y: 100, regiao: 'praia' }, { x: 420, y: 130, regiao: 'vulcao' }];
    const g = gradeDoChao(nos, { largura: 640, altura: 320, raio: 90 });
    igual(`${g.length}x${g[0].length}`, `${Math.ceil(320 / CELULA)}x${Math.ceil(640 / CELULA)}`, 'a grade não cobre o mapa');
    igual(g[Math.floor(100 / CELULA)][Math.floor(100 / CELULA)], 'praia', 'a célula do nó não é o chão dele');
    igual(g[Math.floor(130 / CELULA)][Math.floor(420 / CELULA)], 'vulcao', 'a célula do vulcão não é vulcão');
    igual(g[9][0], 'grama', 'longe de todo nó não é grama');
    ok(g.flat().includes('agua') && g.flat().filter(m => m === 'agua').length * CELULA ** 2 < 40 * 32 * 32, 'o vulcão sem mar em volta — ou o mar engoliu o mapa');
    /* A mancha: a poça de lava que a tela pôs longe do nó reclama o chão de vulcão em volta dela. */
    const lava = { x: 560, y: 260, regiao: 'vulcao', raio: 40 };
    const cl = [Math.floor(lava.y / CELULA), Math.floor(lava.x / CELULA)];
    igual(g[cl[0]][cl[1]], 'grama', 'o lugar da poça já era vulcão sem a mancha — o teste não prova nada');
    igual(gradeDoChao(nos, { largura: 640, altura: 320, raio: 90, manchas: [lava] })[cl[0]][cl[1]], 'vulcao', 'a lava boia na grama');
    igual(JSON.stringify(gradeDoChao(nos, { largura: 640, altura: 320, raio: 90 })), JSON.stringify(g), 'a grade muda de uma pintura para outra');
    /* A borda é orgânica: a fronteira da praia não é um círculo perfeito. */
    const n = g.flat().filter(m => m === 'praia').length, ideal = Math.PI * (90 / CELULA) ** 2;
    ok(n > ideal * 0.6 && n < ideal * 1.6, `a praia do tamanho errado: ${n} células, ideal ~${Math.round(ideal)}`);
    /* ...e é o ruído que a entorta: num chão grande (raio de 240 px), o
       compasso puro erra em pelo menos oito casas — sem ruído, erra em zero. */
    const gg = gradeDoChao([{ x: 320, y: 320, regiao: 'praia' }], { largura: 640, altura: 640, raio: 240 });
    let torto = 0;
    gg.forEach((linha, l) => linha.forEach((m, c) => { const dentro = Math.hypot((c + 0.5) * CELULA - 320, (l + 0.5) * CELULA - 320) < 240; if (dentro !== (m === 'praia')) torto++; }));
    ok(torto >= 8, `a fronteira da praia é um círculo de compasso (${torto} casas fora do círculo)`);
  });

  s.teste('o chão de mais precedência invade a borda do vizinho; o mais alto tem face', () => {
    const g = [['praia', 'grama'], ['planalto', 'grama']];
    igual(JSON.stringify(transicoes(g, 1, 0)), JSON.stringify({ esq: 'praia' }), 'a grama não recebe a borda da praia');
    igual(JSON.stringify(transicoes(g, 0, 0)), JSON.stringify({ baixo: 'planalto' }), 'a praia não recebe a borda do planalto, que tem mais precedência');
    ok(temFace([['planalto'], ['grama']], 0, 0) && !temFace([['grama'], ['planalto']], 0, 0), 'a face de penhasco no lado errado');
    ok(!temFace([['planalto']], 0, 0), 'a face na última linha, sem nada abaixo');
    /* O CANTO: o degrau vira rampa — o vizinho de mais precedência toma o canto em que os dois lados são ele. */
    const deg = [['pedra', 'pedra'], ['pedra', 'grama']];
    igual(JSON.stringify(cantos(deg, 1, 1)), JSON.stringify({ ce: 'pedra' }), 'o degrau não vira rampa');
    igual(JSON.stringify(cantos([['grama', 'grama'], ['grama', 'pedra']], 1, 1)), '{}', 'o chão de menos precedência toma o canto');
    igual(JSON.stringify(cantos([['pedra', 'praia'], ['pedra', 'grama']], 1, 1)), '{}', 'dois vizinhos diferentes tomaram o canto');
    igual(JSON.stringify(cantos([['agua', 'agua'], ['agua', 'grama']], 1, 1)), '{}', 'a água toma canto — ela tem margem');
    /* A água tem MARGEM (espuma do lado da terra), e não franja: nem a água pontilha a grama, nem a grama a água. */
    const mar = [['grama', 'agua', 'praia'], ['agua', 'agua', 'agua']];
    igual(margens(mar, 0, 1).join(), 'cima', 'a espuma fora do lado da terra');
    igual(margens(mar, 1, 0).join(), 'esq,dir', 'a espuma fora do lado da terra, com dois lados');
    igual(margens(mar, 1, 1).join(), '', 'espuma no meio do mar');
    igual(margens(mar, 0, 0).join(), '', 'a terra ganhou espuma');
    igual(JSON.stringify(transicoes(mar, 0, 0)), '{}', 'a água pontilha a grama');
    ok(!temFace([['grama'], ['grama']], 0, 0) && !temFace([['pedra'], ['vulcao']], 0, 0), 'a face entre dois chãos da mesma altura');
  });

  s.teste('o mapa real: todo chão tem tile, e cada região do pack aparece', () => {
    const m = mapaDaJornada(pack, { vencidos: [] });
    const nos = m.nos.map(n => ({ x: n.x * 18.6, y: n.y * 6, regiao: n.regiao }));
    const g = gradeDoChao(nos, { largura: 1860, altura: 600 });
    const usados = new Set(g.flat());
    for (const mat of usados) ok(MATERIAIS.includes(mat) && existsSync(new URL(`../arte/chao/${mat}.svg`, import.meta.url)), `o chão ${mat} sem tile`);
    for (const r of new Set(m.nos.map(n => n.regiao).filter(Boolean))) ok(usados.has(r), `a região ${r} some da grade`);
    ok(usados.has('grama'), 'a grama sumiu — nada liga as regiões');
  });

  /* O que a ST-10.22b pedia das manchas, agora sobre a grade: os nós
     SEGUIDOS da mesma região viram UM chão (a Liga é um planalto, e não cinco
     bolhas), e todo nó fica dentro do próprio chão. */
  s.teste('os nós seguidos da mesma região são um chão só, e cada nó pisa no seu', () => {
    for (const r of REGIOES) ok(MATERIAIS.includes(r), `a região ${r} sem material na grade`);
    const m = mapaDaJornada(pack, { vencidos: [] });
    const nos = m.nos.map(n => ({ id: n.id, x: n.x * 18.6, y: n.y * 6, regiao: n.regiao }));
    const g = gradeDoChao(nos, { largura: 1860, altura: 600 });
    const celula = n => [Math.floor(n.y / CELULA), Math.floor(n.x / CELULA)];
    for (const n of nos) { const [l, c] = celula(n); igual(g[l][c], n.regiao, `o nó ${n.id} não pisa no próprio chão`); }
    /* A mancha conexa de um nó: o mesmo material, andando pelas quatro vizinhas. */
    const mancha = n => {
      const [l0, c0] = celula(n), vistos = new Set([`${l0},${c0}`]), fila = [[l0, c0]];
      while (fila.length) {
        const [l, c] = fila.pop();
        for (const [dl, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${l + dl},${c + dc}`;
          if (!vistos.has(k) && g[l + dl]?.[c + dc] === n.regiao) { vistos.add(k); fila.push([l + dl, c + dc]); }
        }
      }
      return vistos;
    };
    const liga = nos.filter(n => n.regiao === 'planalto'), mesa = mancha(liga[0]);
    ok(liga.length >= 5 && liga.every(n => mesa.has(celula(n).join())), 'a Liga em pedaços — o planalto não é uma peça só');
    const [pedra, pewter] = ['pedra', 'pewter'].map(id => nos.find(n => n.id === id));
    ok(mancha(pedra).has(celula(pewter).join()), 'a pedra e Pewter em dois chãos');
  });

  /* ST-10.22f (L-216): a praça do ginásio é CHÃO da grade (calçamento, com
     transição e canto), e não o pedestal oval em CSS carimbado sobre o
     terreno; e o mar de Cinnabar desce até a borda do mapa — as poças soltas
     na borda de baixo liam como água que não se liga a nada. */
  s.teste('ST-10.22f: a praça é chão da grade, e o mar do vulcão chega à borda', () => {
    ok(MATERIAIS.includes('praca') && existsSync(new URL('../arte/chao/praca.svg', import.meta.url)), 'a praça sem material ou sem tile');
    const nos = [{ x: 100, y: 100, regiao: 'campo' }, { x: 420, y: 130, regiao: 'vulcao' }];
    const g = gradeDoChao(nos, { largura: 640, altura: 320, raio: 90, manchas: [{ x: 100, y: 100, regiao: 'praca', raio: 30 }] });
    igual(g[Math.floor(100 / CELULA)][Math.floor(100 / CELULA)], 'praca', 'o ginásio sem praça no chão');
    igual(g[Math.floor(100 / CELULA)][Math.floor(170 / CELULA)], 'campo', 'a praça engoliu a região');
    const col = Math.floor(420 / CELULA), fundo = g.length - 1;
    igual(g[fundo][col], 'agua', 'o mar do vulcão não chega à borda de baixo');
    let l = fundo; while (l > 0 && g[l][col] === 'agua') l--;
    ok(g.slice(l + 1).every(linha => linha[col] === 'agua') && ['vulcao', 'agua'].includes(g[l][col]), 'o mar da borda não encosta na ilha');
    igual(g[fundo][Math.floor(100 / CELULA)], 'grama', 'o mar desceu longe do vulcão');
    /* Nenhuma casa de água sozinha: o mar é um corpo só, e não pingos. */
    /* Os casos são os que MEDIDOS davam pingos antes da limpeza (a largura do celular, com o vulcão perto da borda). */
    for (const [larg, alt, raio, fx] of [[392, 320, 90, 0.3], [420, 320, 90, 0.3], [420, 420, 60, 0.5], [640, 320, 90, 0.66]]) {
      const gg = gradeDoChao([{ x: 100, y: 100, regiao: 'campo' }, { x: larg * fx, y: alt * 0.4, regiao: 'vulcao' }], { largura: larg, altura: alt, raio });
      const soltas = gg.flatMap((linha, l) => linha.map((m, c) => m === 'agua' && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dl, dc]) => gg[l + dl]?.[c + dc] !== 'agua'))).filter(Boolean).length;
      igual(soltas, 0, `${larg} × ${alt}: casa de água solta na terra`);
    }
    const pinta = semComentario(fonte('../app/modules/jornada-chao-tela.mjs')), html = fonte('../app/index.html');
    ok(/querySelectorAll\('\.jnPos\.jnT-ginasio'\)/.test(pinta) && /regiao: 'praca'/.test(pinta), 'a tela não põe a praça sob o ginásio');
    ok(!/\.jnT-ginasio::before\{/.test(html), 'o pedestal oval em CSS continua por cima do chão');
  });

  s.teste('a tela pinta a grade num canvas, e as manchas de região saíram', () => {
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/<canvas class="jnChao"/.test(tela) && /pintarChao\(alvo, mapa, desenho, pintadoEmPe\)/.test(tela), 'a tela não pinta o chão em grade');
    ok(!/jnRegiao/.test(tela), 'as manchas de região continuam na tela');
    const pinta = semComentario(fonte('../app/modules/jornada-chao-tela.mjs'));
    ok(/gradeDoChao\(/.test(pinta) && /transicoes\(/.test(pinta) && /cantos\(/.test(pinta) && /margens\(/.test(pinta) && /temFace\(/.test(pinta) && /drawImage\(/.test(pinta), 'o canvas não usa as decisões da camada 0');
    /* A célula pinta o QUARTO do tile que lhe cabe — o tile inteiro por célula repetia a textura a cada 16 px. */
    ok(/drawImage\(img\[m\], sx, sy, TILE \/ q, TILE \/ q,/.test(pinta) && /sx = \(c % q\) \* \(TILE \/ q\), sy = \(l % q\) \* \(TILE \/ q\)/.test(pinta), 'o tile inteiro espremido em cada célula');
    ok(/querySelectorAll\('\.jnLago\.jn-lava'\)/.test(pinta) && /gradeDoChao\(nos, \{ largura: w, altura: h, manchas \}\)/.test(pinta), 'a poça de lava não reclama o chão');
    ok(/\.jnChao\{[^}]*image-rendering:pixelated/.test(fonte('../app/index.html')) && /imageSmoothingEnabled = false/.test(pinta), 'o canvas do chão sem pixel nítido');
    /* A medida é RELATIVA à caixa do mapa: em coordenada de página, o chão sai deslocado do nó pela rolagem e pelo cabeçalho. */
    ok(/x: r\.left - r0\.left, y: r\.top - r0\.top/.test(pinta), 'o chão medido na página, e não no mapa');
    /* Ao virar a tela o mapa muda de tamanho: o chão pinta de novo, ou fica a grade velha esticada. */
    ok(/afastarCena\(a\); pintarChao\(a, /.test(tela), 'o chão não repinta no redimensionamento');
    /* O chão fica POR BAIXO do caminho e dos nós: vem antes deles no mapa. */
    ok(tela.indexOf('<canvas class="jnChao"') < tela.indexOf('<svg class="jnCaminho'), 'o chão por cima do caminho');
  });

  return s;
}
