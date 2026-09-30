/* ST-10.23 (L-217) · O MAPA DESENHADO À MÃO.
 *
 * Cinco rodadas de Q7 cego (barra: o mapa do SMW) deixaram o "mundo" em 3–5
 * com o chão decidido por proximidade — "retalhos gerados". O chão passa a
 * ser um DESENHO no ContentPack (`content/mapa_kanto_v1.mjs`), e a borda
 * entre dois chãos sai do AUTOTILE POR CANTOS (a grade dupla / marching
 * squares): cada peça de 16 px lê os quatro cantos à volta e pinta, de cada
 * material, uma máscara arredondada com contorno — a curva do SMW, e não o
 * degrau. Tudo isso é camada 0 (`jornada-desenho.mjs`); a tela só pinta. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { mapaDaJornada } from '../app/modules/jornada-dados.mjs';
import { MATERIAIS, CELULA } from '../app/modules/jornada-chao.mjs';
import { paraTiled, deTiled, tilesetPng, arquivoDoMapa, CASAS } from '../tools/mapa-tiled.mjs';
import { larguraDaEstrada, faceDoPenhasco, CORES_DA_ESTRADA, trechosDaEstrada, setasNaEstrada, curvaDaEstrada, obrasNaEstrada, casasDaEstrada, pedrasNoChao, CHAO_QUE_ABRE, FOLGA_DA_CLAREIRA } from '../app/modules/jornada-estrada.mjs';
import { LEGENDA, ORDEM, lerDesenho, celulaEm, noDesenho, gradeDoDesenho, mascara, camadas, bitsDeAltura } from '../app/modules/jornada-desenho.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('jornada-desenho');
  const desenhos = pack.mapaJornada ?? {};

  s.teste('o desenho do pack é legível: camadas do mesmo tamanho, todo caractere na legenda', () => {
    ok(Object.values(LEGENDA).every(m => MATERIAIS.includes(m)), 'a legenda aponta material sem tile');
    igual(new Set(Object.values(ORDEM)).size, Object.keys(ORDEM).length, 'dois materiais com a mesma ordem — a camada de cima fica ambígua');
    ok(ORDEM.agua < ORDEM.grama, 'a água por cima da terra — a costa sai sem margem');
    for (const lado of ['deitado', 'emPe']) {
      const cru = desenhos[lado];
      ok(cru, `o pack sem o desenho ${lado}`);
      const d = lerDesenho(cru);
      ok(d.col >= 20 && d.lin >= 20, `o desenho ${lado} pequeno demais: ${d.col}×${d.lin}`);
      for (const r of cru.chao) ok([...r].every(ch => LEGENDA[ch]), `${lado}: caractere fora da legenda em "${r}"`);
      for (const r of cru.altura) ok(/^[0-3]+$/.test(r), `${lado}: altura fora de 0–3 em "${r}"`);
      for (const r of cru.obra) ok(/^[.H/]+$/.test(r), `${lado}: obra desconhecida em "${r}"`);
    }
    let erro = null;
    try { lerDesenho({ chao: ['..', '..'], altura: ['00'], obra: ['..', '..'] }); } catch (e) { erro = e; }
    ok(erro, 'camadas de tamanhos diferentes passaram caladas');
  });

  s.teste('cada nó pisa no chão da sua região, o rio vai da nascente ao mar, e a estrada cruza a água por ponte', () => {
    for (const [lado, emPe] of [['deitado', false], ['emPe', true]]) {
      const d = lerDesenho(desenhos[lado]), m = mapaDaJornada(pack, { vencidos: [] }, { emPe });
      /* O desenho está no espaço dos nós: deitado, colunas = x e linhas = y; em pé, o contrário. */
      const em = n => (emPe ? celulaEm(d, n.y / 100, n.x / 100) : celulaEm(d, n.x / 100, n.y / 100));
      for (const n of m.nos) ok([n.regiao, 'praca'].includes(em(n).mat), `${lado}: o nó ${n.id} pisa em ${em(n).mat}, e não em ${n.regiao}`);
      /* O rio é UM corpo d'água que toca a borda de cima e a de baixo (ou a do fim do caminho). */
      const agua = new Set(), fila = [];
      d.mat[0].forEach((mt, c) => { if (mt === 'agua') { agua.add(`0,${c}`); fila.push([0, c]); } });
      while (fila.length) {
        const [l, c] = fila.pop();
        for (const [dl, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${l + dl},${c + dc}`;
          if (!agua.has(k) && d.mat[l + dl]?.[c + dc] === 'agua') { agua.add(k); fila.push([l + dl, c + dc]); }
        }
      }
      const naBorda = k => { const [l, c] = k.split(',').map(Number); return l === d.lin - 1 || (l > 0 && (c === 0 || c === d.col - 1)); };
      ok(agua.size > 0 && [...agua].some(naBorda), `${lado}: o rio nasce na borda de cima e não chega ao mar na outra borda — acaba no meio do mapa`);
      /* Onde a estrada passa sobre a água, há ponte. */
      for (const [a, b] of m.nos.slice(1).map((n, i) => [m.nos[i], n])) {
        for (let t = 0; t <= 60; t++) {
          const n = { x: a.x + ((b.x - a.x) * t) / 60, y: a.y + ((b.y - a.y) * t) / 60 }, k = em(n);
          if (k.mat === 'agua') ok(k.obra === 'H', `${lado}: a estrada de ${a.id} a ${b.id} atravessa a água sem ponte`);
        }
      }
      /* A Liga é alta: o Campeão no degrau de cima. */
      ok(em(m.nos.find(n => n.id === 'campeao')).alt >= 3 && em(m.nos.find(n => n.id === 'lance')).alt >= 2, `${lado}: a Liga não está no alto`);
      ok(desenhos[lado].rio?.length >= 4, `${lado}: o desenho sem o traço do rio — a cena não sabe onde ele passa`);
    }
  });

  s.teste('a amostra: deitado cobre a caixa; em pé respeita a faixa de 70 px em cima e 40 embaixo', () => {
    const d = lerDesenho({ chao: ['.~', 'P:'], altura: ['01', '23'], obra: ['.H', '/.'] });
    igual(celulaEm(d, 0.9, 0.1).mat, 'agua', 'a coluna da direita, em cima');
    igual(`${celulaEm(d, 0.1, 0.9).mat}/${celulaEm(d, 0.1, 0.9).alt}/${celulaEm(d, 0.1, 0.9).obra}`, 'planalto/2//', 'a célula de baixo à esquerda');
    igual(celulaEm(d, -1, 5).mat, 'planalto', 'fora do desenho não é a borda mais perto');
    igual(noDesenho(100, 170, { largura: 400, altura: 1110, emPe: true }).join(), '0.25,0.1', 'em pé o caminho começa 70 px abaixo do topo');
    igual(noDesenho(100, 50, { largura: 400, altura: 200, emPe: false }).join(), '0.25,0.25', 'deitado o desenho cobre a caixa');
    const g = gradeDoDesenho(d, { largura: 64, altura: 64 });
    igual(`${g.mat.length}x${g.mat[0].length}`, `${64 / CELULA}x${64 / CELULA}`, 'a grade não cobre a caixa');
    igual(g.mat[0][3], 'agua', 'a grade não amostra o desenho');
    igual(g.obra[0][3], 'H', 'a ponte some na amostra');
    /* A AMOSTRA SUAVE: a borda entre dois chãos segue a curva, e não a casa do
       desenho — um círculo desenhado em casas grossas sai redondo na caixa, e
       não um octógono em degraus (Q7 da ST-10.23, 1ª rodada). */
    const disco = lerDesenho({ chao: [...Array(12).keys()].map(l => [...Array(12).keys()].map(c => (Math.hypot(c + 0.5 - 6, l + 0.5 - 6) < 4 ? ':' : '.')).join('')),
      altura: Array(12).fill('0'.repeat(12)), obra: Array(12).fill('.'.repeat(12)) });
    const fina = gradeDoDesenho(disco, { largura: 192, altura: 192, celula: 4, oscila: 0 });
    let fora = 0, total = 0;
    fina.mat.forEach((linha, l) => linha.forEach((m, c) => { total++; const r = Math.hypot((c + 0.5) * 4 - 96, (l + 0.5) * 4 - 96); if ((r < 58) !== (m === 'praia') && Math.abs(r - 64) > 10) fora++; }));
    ok(fora === 0, `a amostra suave não segue o círculo: ${fora} de ${total} casas longe da borda com o chão errado`);
    const bruta = gradeDoDesenho(disco, { largura: 192, altura: 192, celula: 4, oscila: 0, suave: false });
    const quinas = g2 => g2.mat.filter((linha, l) => linha.filter((m, c) => m === 'praia' && linha[c + 1] !== 'praia' && g2.mat[l + 1]?.[c] !== 'praia').length).length;
    ok(quinas(fina) > quinas(bruta), 'a borda suave tem tão poucos degraus quanto a bruta — não é curva');
    /* A OSCILAÇÃO: a borda treme como traço à mão, e a mesma caixa dá sempre o mesmo mapa. */
    const t1 = gradeDoDesenho(disco, { largura: 192, altura: 192, celula: 4 }), t2 = gradeDoDesenho(disco, { largura: 192, altura: 192, celula: 4 });
    igual(JSON.stringify(t1.mat), JSON.stringify(t2.mat), 'o mapa muda de uma pintura para outra');
    ok(JSON.stringify(t1.mat) !== JSON.stringify(fina.mat), 'a borda não oscila — o traço sai de compasso');
    /* A ponte não oscila: ela fica onde a estrada cruza a água. */
    const ponte = lerDesenho({ chao: ['..~..'], altura: ['00000'], obra: ['..H..'] });
    const gp = gradeDoDesenho(ponte, { largura: 50, altura: 10, celula: 2 });
    ok(gp.obra[2].slice(10, 15).every(o => o === 'H') && gp.obra[2].slice(0, 8).every(o => o === '.'), 'a ponte saiu do lugar da estrada');
  });

  s.teste('o autotile: cada canto arredondado, a borda com contorno, a água por baixo', () => {
    const idx = (x, y) => y * CELULA + x;
    igual(mascara(0).filter(Boolean).length, 0, 'sem canto, peça vazia');
    const cheia = mascara(15);
    ok(cheia.every(v => v === 1), 'os quatro cantos: peça cheia e SEM contorno por dentro');
    const tl = mascara(1);
    ok(tl[idx(0, 0)] && tl[idx(6, 0)] && !tl[idx(12, 0)] && !tl[idx(15, 15)], 'um canto: o quarto de círculo no canto dele');
    ok(tl[idx(4, 4)] && !tl[idx(8, 8)], 'o quarto de círculo não é quadrado — a diagonal corta antes');
    ok(tl.some(v => v === 2) && tl[idx(0, 0)] === 1, 'a borda arredondada sem contorno — ou o contorno no miolo');
    /* O espelho: o canto de cima à direita é o de cima à esquerda refletido. */
    const tr = mascara(2);
    ok([...Array(CELULA * CELULA).keys()].every(i => tr[i] === tl[Math.floor(i / CELULA) * CELULA + (CELULA - 1 - (i % CELULA))]), 'os cantos não são simétricos');
    /* Dois cantos vizinhos viram uma faixa contínua; dois opostos, duas ilhas (a ambiguidade do marching squares, resolvida a favor do chão de baixo). */
    const faixa = mascara(1 | 2);
    ok([...Array(CELULA).keys()].every(x => faixa[idx(x, 2)]), 'dois cantos de cima não fazem uma faixa');
    ok(!mascara(1 | 4)[idx(8, 8)], 'os cantos opostos se ligam pelo meio');
    /* As camadas: o chão de baixo cheio, e cada chão acima com os cantos que são dele ou de cima. */
    const g = { mat: [['grama', 'planalto'], ['agua', 'planalto']] };
    igual(JSON.stringify(camadas(g, 1, 1)), JSON.stringify([{ mat: 'agua', bits: 15 }, { mat: 'grama', bits: 1 | 2 | 4 }, { mat: 'planalto', bits: 2 | 4 }]), 'as camadas do canto');
    igual(JSON.stringify(camadas({ mat: [['grama']] }, 0, 0)), JSON.stringify([{ mat: 'grama', bits: 15 }]), 'fora da grade não é a borda mais perto');
    igual(bitsDeAltura({ alt: [[0, 2], [3, 1]] }, 1, 1, 2), 2 | 8, 'a altura por cantos');
  });

  s.teste('a tela pinta o desenho pelo autotile e troca o rio antigo pelo desenhado', () => {
    const pinta = semComentario(fonte('../app/modules/jornada-desenho-tela.mjs')), tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/gradeDoDesenho\(/.test(pinta) && /camadas\(/.test(pinta) && /mascara\(/.test(pinta) && /bitsDeAltura\(/.test(pinta), 'o pintor não usa as decisões da camada 0');
    ok(/obra\[l\]\[c\] === 'H'/.test(pinta) && /obra\[l\]\[c\] === '\/'/.test(pinta), 'o pintor esquece a ponte ou a escada');
    ok(/for \(let nivel = 1; nivel <= 3; nivel\+\+\)/.test(pinta), 'o pintor esquece um degrau de altura — o penhasco some');
    ok(/const desenho = PACK\.mapaJornada\?\.\[pintadoEmPe \? 'emPe' : 'deitado'\]/.test(tela), 'a tela não escolhe o desenho pela orientação');
    ok(/const rios = desenho \? \[\] : rioDoMapa\(mapa\)/.test(tela), 'o rio antigo continua por cima do desenhado');
    ok(/pintarChao\(alvo, mapa, desenho, pintadoEmPe\)/.test(tela), 'a tela não passa o desenho ao chão');
    ok(/desenho \? \[desenho\.rio\] : rios\.map\(r => r\.pontos\)/.test(tela), 'a cena não desvia do rio desenhado');
  });

  /* A FERRAMENTA DO TILED: o desenho vai ao editor livre e volta sem perder
     nada — o dono repinta o mapa com o mouse, e o jogo lê o texto de sempre. */
  s.teste('o mapa vai ao Tiled e volta igual, e o tileset é um PNG de verdade', () => {
    for (const lado of ['deitado', 'emPe']) {
      const d = desenhos[lado], tmj = paraTiled(d, { lado });
      igual(`${tmj.width}x${tmj.height}`, `${d.chao[0].length}x${d.chao.length}`, `${lado}: o .tmj com outro tamanho`);
      igual(tmj.layers.map(l => l.name).join(), 'chao,altura,obra,rio', `${lado}: as camadas do Tiled`);
      ok(tmj.layers[0].data.every(g => g >= 1 && g <= CASAS.length), `${lado}: casa fora do tileset`);
      const volta = deTiled(JSON.parse(JSON.stringify(tmj)));
      igual(volta.lado, lado, 'o lado se perde na volta');
      for (const k of ['chao', 'altura', 'obra']) igual(volta.desenho[k].join('\n'), d[k].join('\n'), `${lado}: a camada ${k} muda na volta`);
      igual(JSON.stringify(volta.desenho.rio), JSON.stringify(d.rio), `${lado}: o traço do rio muda na volta`);
    }
    const png = tilesetPng();
    igual([...png.subarray(0, 8)].join(), '137,80,78,71,13,10,26,10', 'o tileset não é PNG');
    igual(png.readUInt32BE(16), CASAS.length * 16, 'o PNG sem uma casa por material');
    /* Os .tmj versionados são os do desenho de hoje — o dono abre no Tiled o
       mapa que o jogo mostra, e não um de três blocos atrás. */
    for (const lado of ['deitado', 'emPe']) {
      igual(fonte(`../mapa-tiled/kanto-${lado}.tmj`), JSON.stringify(paraTiled(desenhos[lado], { lado }), null, 1), `mapa-tiled/kanto-${lado}.tmj velho — rode node tools/mapa-tiled.mjs exportar`);
    }
    igual(readFileSync(new URL('../mapa-tiled/kanto-tiles.png', import.meta.url)).toString('base64'), png.toString('base64'), 'o tileset versionado velho');
    /* E a reescrita do conteúdo guarda o cabeçalho e devolve o mesmo mapa. */
    const texto = fonte('../content/mapa_kanto_v1.mjs');
    igual(arquivoDoMapa(texto, desenhos), texto, 'reescrever o arquivo com o mesmo mapa muda o arquivo');
  });

  s.teste('ST-10.24 · a estrada é chão: o andado e o próximo, a curva, as obras, a escala', () => {
    const P = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 50 }, { x: 300, y: 50 }];
    const t = trechosDaEstrada(P, 1);
    igual(`${t.andado.length}|${t.proximo.length}|${t.andado.at(-1) === t.proximo[0]}|${t.proximo[1] === P[2]}`, '2|2|true|true', 'o próximo não é só o trecho do atual ao nó seguinte');
    igual(`${trechosDaEstrada(P, -1).andado.length}|${trechosDaEstrada(P, -1).proximo.length}`, '4|0', 'com tudo vencido, sobra estrada por andar');
    igual(`${trechosDaEstrada(P, 0).andado.length}|${trechosDaEstrada(P, 0).proximo.length}`, '0|2', 'antes do primeiro, um trecho de um ponto só virou estrada');
    igual(trechosDaEstrada(P, 3).proximo.length, 0, 'no último nó há próximo');
    igual(trechosDaEstrada([P[0]], 0).andado.length, 0, 'um nó só virou estrada');
    /* A seta: só a do trecho próximo. */
    igual(JSON.stringify(setasNaEstrada(['a', 'b', 'c'], 1)), '["b"]', 'fica seta fora do trecho próximo');
    igual(setasNaEstrada(['a', 'b'], -1).length, 0, 'com tudo vencido, sobra seta');
    /* A curva: passa pelos nós, ondula entre eles, e é a mesma sempre. */
    const c = curvaDaEstrada(P);
    const passa = q => c.some(p => Math.hypot(p.x - q.x, p.y - q.y) < 0.01);
    ok(P.every(passa), 'a curva não passa pelos nós');
    const meio = c.filter(p => p.x > 40 && p.x < 60);
    ok(meio.some(p => Math.abs(p.y) > 2) && meio.every(p => Math.abs(p.y) <= 12.5), 'a estrada é reta entre os nós (ou ondula demais)');
    igual(JSON.stringify(curvaDaEstrada(P)), JSON.stringify(c), 'a curva muda de uma pintura para outra');
    ok(c.every((p, k) => !k || Math.hypot(p.x - c[k - 1].x, p.y - c[k - 1].y) <= 6), 'a curva tem buraco entre amostras');
    /* As obras: ponte sobre a água, uma escada por troca de altura, no sentido da estrada. */
    const reta = [0, 4, 8, 12, 16, 20].map(x => ({ x, y: 10 }));
    const o = obrasNaEstrada(reta, { matEm: p => (p.x >= 8 && p.x <= 12 ? 'agua' : 'grama'), altEm: p => (p.x >= 16 ? 1 : 0) });
    igual(o.map(x => `${x.tipo}@${x.x}`).join(), 'ponte@8,ponte@12,escada@16', 'as obras não saem de onde a estrada cruza a água e a altura');
    ok(o.filter(x => x.tipo === 'ponte').every(x => x.dx === 1 && x.dy === 0 && x.y === 10), 'a ponte perdeu o lugar ou o sentido da estrada');
    /* Duas subidas de verdade, sem ponte entre elas, são duas escadas; a borda que treme (a menos de 12 px) é uma só. */
    const longa = Array.from({ length: 21 }, (_, k) => ({ x: k * 4, y: 10 }));
    const duas = obrasNaEstrada(longa, { matEm: () => 'grama', altEm: p => (p.x >= 60 ? 2 : p.x >= 20 ? 1 : 0) });
    igual(duas.map(x => `${x.tipo}@${x.x}`).join(), 'escada@20,escada@60', 'a segunda subida ficou sem escada (a regra engolia a escada depois de outra)');
    const treme = obrasNaEstrada(longa, { matEm: () => 'grama', altEm: p => (p.x === 20 || p.x >= 28 ? 1 : 0) });
    igual(treme.filter(x => x.tipo === 'escada').length, 1, 'a borda que treme virou várias escadas');
    /* A estrada na grade: as casas a até `raio` da curva, dentro da grade. */
    /* O ponto (20, 20) é o centro da casa 2,2; as quatro vizinhas de lado ficam a 8 px, as de quina a 11,3. */
    const casas = casasDaEstrada([{ x: 20, y: 20 }], { celula: 8, raio: 9, col: 10, lin: 10 });
    igual([...casas].sort().join(' '), '1,2 2,1 2,2 2,3 3,2', 'as casas da estrada não são as a até o raio da curva');
    igual(casasDaEstrada([{ x: 2, y: 2 }], { celula: 8, raio: 20, col: 2, lin: 2 }).size, 4, 'a estrada saiu da grade');
    /* A escala: 10 px de penhasco no celular, 22 em 1920. */
    igual(`${faceDoPenhasco(400)}|${faceDoPenhasco(1000)}|${faceDoPenhasco(1400)}|${faceDoPenhasco(1860)}`, '10|14|18|22', 'o penhasco não cresce com a escala');
    ok(larguraDaEstrada(400) < larguraDaEstrada(1860) && larguraDaEstrada(400) >= 8, 'a estrada não cresce com a escala');
    ok(CORES_DA_ESTRADA.alfaDoProximo > 0.3 && CORES_DA_ESTRADA.alfaDoProximo < 0.8, 'o próximo não está apagado (ou sumiu)');
    /* A tela. */
    const pintor = semComentario(fonte('../app/modules/jornada-desenho-tela.mjs'));
    ok(/FACE = faceDoPenhasco\(w\)/.test(pintor), 'o penhasco voltou a ter altura fixa');
    ok(/if \(estrada\) \{\s*const curvas = pintarEstrada/.test(pintor), 'o chão com a estrada medida não pinta a estrada');
    const iFace = pintor.indexOf('faixa(FACE, ROCHA[nivel])'), iEstrada = pintor.indexOf('pintarEstrada(ctx, estrada, { w, h, C, lin, col })'), iObra = pintor.indexOf('pintarObras(ctx, obrasNaEstrada(curvas.andado, chao)');
    ok(iFace > 0 && iEstrada > iFace && iObra > iEstrada, 'a estrada não fica entre os penhascos e as obras');
    ok(/const pts = curvaDaEstrada\(nos\);/.test(pintor), 'a estrada voltou a ser reta');
    ok(/andado: trecho\(andado, false\), proximo: trecho\(proximo, true\)/.test(pintor) && /globalAlpha = apagado \? cor\.alfaDoProximo : 1/.test(pintor), 'o próximo não é a mesma estrada, apagada');
    ok(/const casas = casasDaEstrada\(pts, \{ celula: C, raio, col, lin \}\);/.test(pintor) && /const m = mascara\(bits, C\), px = c2\.getImageData\(0, 0, C, C\);[\s\S]{0,260}m\[k\] === 2\) \{ px\.data\[k \* 4\] = br/.test(pintor) && /px\.data\[k \* 4 \+ q\] \* 0\.72/.test(pintor), 'a estrada não é pintada na grade pelo autotile do chão (voltou a ser fita)');
    const chao = semComentario(fonte('../app/modules/jornada-chao-tela.mjs'));
    ok(/pintarDesenho\(tela, caixa, lerDesenho\(desenho\), emPe, await carregar\(\), trechosDaEstrada\(nos, iAtual\)\)/.test(chao), 'o chão desenhado não recebe a estrada');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/const estradaSvg = empe => \(desenho \? '' : trilha\(empe\)\);/.test(tela), 'com o desenho, a estrada ainda é traço SVG por cima');
    ok(/desenho \? setasNaEstrada\(setasDoCaminho\(mapa\)/.test(tela), 'com o desenho, as setas do futuro fechado voltaram');
    ok(/if \(el\.classList\.contains\('jnMarco'\)\) el\.style\.setProperty\('--dx', el\.dataset\.dx0\);/.test(tela), 'o marco volta a sumir quando esbarra');
    const seta = (fonte('../app/index.html').match(/\.jnSeta\{[^}]*\}/) ?? [''])[0];
    ok(seta && !/var\(--neon\)/.test(seta), 'a seta do trecho fechado usa o ciano do PRÓXIMO');
  });

  s.teste('ST-10.25 · a composição: o contorno em duas oitavas, a clareira, as pedras, o nó trancado, a lava, a escala', () => {
    /* O contorno: a onda larga e o grão fino, por padrão. */
    const fonteDesenho = semComentario(fonte('../app/modules/jornada-desenho.mjs'));
    ok(/const PECA = 4;/.test(semComentario(fonte('../app/modules/jornada-desenho-tela.mjs'))), 'a peça voltou a 8 px (a curva em degraus regulares — "bordas hexagonais")');
    ok(/oscila = 0\.75, grao = 0\.3/.test(fonteDesenho) && /grao \* 2 \* \(ruido\(x, y, 3, 0\.9\) - 0\.5\)/.test(fonteDesenho), 'o contorno voltou a uma onda só (as manchas hexagonais)');
    /* As pedras: só no miolo de rocha, fora do que a estrada abriu, e sempre as mesmas. */
    const mat = Array.from({ length: 30 }, (_, l) => Array.from({ length: 60 }, (_, c) => (c < 30 ? 'planalto' : 'grama')));
    const p1 = pedrasNoChao(mat), p2 = pedrasNoChao(mat);
    ok(p1.length > 3, `o planalto grande ficou sem relevo (${p1.length} pedras)`);
    igual(JSON.stringify(p1), JSON.stringify(p2), 'as pedras mudam de uma pintura para outra');
    ok(p1.every(p => p.c >= 1 && p.c <= 28), 'pedra na borda da rocha (cortada) ou fora dela');
    igual(pedrasNoChao(mat, { longe: () => false }).length, 0, 'pedra em cima da estrada');
    /* Sem sorte: uma faixa de rocha de três casas, pedra em toda casa possível —
       só a coluna do meio é miolo. */
    const faixa = Array.from({ length: 6 }, () => Array.from({ length: 8 }, (_, c) => (c >= 3 && c <= 5 ? 'pedra' : 'grama')));
    const nela = pedrasNoChao(faixa, { raridade: 1 });
    ok(nela.length > 0 && nela.every(p => p.c === 4), `pedra fora do miolo da rocha: ${JSON.stringify(nela.map(p => p.c))}`);
    ok(CHAO_QUE_ABRE.has('floresta') && CHAO_QUE_ABRE.has('bosque') && !CHAO_QUE_ABRE.has('pedra') && FOLGA_DA_CLAREIRA > 0, 'a mata não abre clareira (ou a rocha abre)');
    /* A tela: a clareira em grama pelo autotile, antes dos penhascos; as pedras longe da estrada. */
    const pintor = semComentario(fonte('../app/modules/jornada-desenho-tela.mjs'));
    const iClareira = pintor.indexOf("peca('grama', bits"), iPedra = pintor.indexOf('pedrasNoChao(g.mat'), iFace = pintor.indexOf('faixa(FACE, ROCHA[nivel])');
    ok(iClareira > 0 && iPedra > iClareira && iFace > iPedra, 'a clareira e as pedras não vêm antes dos penhascos');
    ok(/CHAO_QUE_ABRE\.has\(g\.mat\[l\]\?\.\[c\]\)/.test(pintor), 'a clareira abre em qualquer chão, e não só na mata');
    ok(/longe: \(l, c\) => !aberta\.has\(`\$\{l\},\$\{c\}`\)/.test(pintor), 'as pedras caem em cima da estrada');
    /* O CSS: o trancado sem ninguém, a lava em pixel, a escala. */
    const css = fonte('../app/index.html');
    const lava = css.match(/\.jnLago\.jn-lava::after\{[^}]*\}/)?.[0] ?? '';
    ok(lava && !/radial-gradient/.test(lava) && /steps\(/.test(lava), 'a lava voltou ao gradiente liso (sem pixel)');
    ok(/\.jnEu\{scale:\.78;transform-origin:50% 100%\}/.test(css) && /\.jnOw\{scale:\.8;transform-origin:50% 100%\}/.test(css), 'o jogador e o treinador voltaram maiores que as casas');
  });

  return s;
}
