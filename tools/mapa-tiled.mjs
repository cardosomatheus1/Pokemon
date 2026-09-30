/* O MAPA DA JORNADA NO TILED (ST-10.23 · L-217).
 *
 * O desenho do mapa mora em texto (`content/mapa_kanto_v1.mjs`) — legível,
 * versionável, e editável à mão. Esta ferramenta o leva ao Tiled
 * (mapeditor.org, livre), para repintar com o mouse, e o traz de volta:
 *
 *   node tools/mapa-tiled.mjs exportar   → mapa-tiled/kanto-deitado.tmj,
 *                                           kanto-emPe.tmj e o tileset PNG
 *   node tools/mapa-tiled.mjs importar   → reescreve content/mapa_kanto_v1.mjs
 *
 * No Tiled, cada desenho tem três camadas de tile (chão, altura, obra) e uma
 * de objetos com o traço do rio. O tileset é de CORES — uma casa por material,
 * altura e obra —, gerado aqui mesmo com o zlib do Node (dependência zero):
 * serve para desenhar o arranjo; a arte de verdade é a do jogo.
 *
 * `paraTiled` e `deTiled` são puras e fazem a ida e a volta sem perder nada
 * — o teste da `jornada-desenho` confere a volta completa. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { LEGENDA } from '../app/modules/jornada-desenho.mjs';
import { COR_DO_CHAO } from '../app/modules/jornada-chao.mjs';

const CASA = 16;
/* As casas do tileset, em ordem: os chãos da legenda, as quatro alturas, as obras. */
export const CASAS = Object.freeze([
  ...Object.keys(LEGENDA).map(ch => ({ camada: 'chao', ch, cor: COR_DO_CHAO[LEGENDA[ch]] })),
  ...['0', '1', '2', '3'].map((ch, k) => ({ camada: 'altura', ch, cor: ['#202830', '#58606a', '#98a0aa', '#e0e6ee'][k] })),
  { camada: 'obra', ch: '.', cor: '#00000000' }, { camada: 'obra', ch: 'H', cor: '#b07a3e' }, { camada: 'obra', ch: '/', cor: '#e8d6a8' },
]);
const gid = (camada, ch) => CASAS.findIndex(k => k.camada === camada && k.ch === ch) + 1;

export function paraTiled(desenho, { lado = 'deitado', tileset = 'kanto-tiles.png' } = {}) {
  const lin = desenho.chao.length, col = desenho.chao[0].length;
  const camada = (nome, linhas, id) => ({
    id, name: nome, type: 'tilelayer', x: 0, y: 0, width: col, height: lin, opacity: nome === 'chao' ? 1 : 0.6, visible: true,
    data: linhas.flatMap(r => [...r].map(ch => gid(nome, ch))),
  });
  /* O rio em pixels do Tiled: deitado, x% nas colunas; em pé, y% nas colunas. */
  const px = p => (lado === 'emPe' ? { x: (p.y / 100) * col * CASA, y: (p.x / 100) * lin * CASA } : { x: (p.x / 100) * col * CASA, y: (p.y / 100) * lin * CASA });
  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    width: col, height: lin, tilewidth: CASA, tileheight: CASA, infinite: false, nextlayerid: 5, nextobjectid: 2,
    properties: [{ name: 'lado', type: 'string', value: lado }],
    tilesets: [{ firstgid: 1, name: 'kanto', image: tileset, imagewidth: CASAS.length * CASA, imageheight: CASA, tilewidth: CASA, tileheight: CASA, tilecount: CASAS.length, columns: CASAS.length, margin: 0, spacing: 0 }],
    layers: [
      camada('chao', desenho.chao, 1), camada('altura', desenho.altura, 2), camada('obra', desenho.obra, 3),
      { id: 4, name: 'rio', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown',
        objects: [{ id: 1, name: 'rio', type: '', x: 0, y: 0, rotation: 0, visible: true, width: 0, height: 0, polyline: (desenho.rio ?? []).map(px) }] },
    ],
  };
}

export function deTiled(tmj) {
  const lado = tmj.properties?.find(p => p.name === 'lado')?.value ?? 'deitado';
  const { width: col, height: lin } = tmj;
  const linhas = nome => {
    const d = tmj.layers.find(l => l.name === nome)?.data ?? [];
    return [...Array(lin).keys()].map(l => d.slice(l * col, (l + 1) * col).map(g => CASAS[g - 1]?.camada === nome ? CASAS[g - 1].ch : (nome === 'chao' ? '.' : nome === 'altura' ? '0' : '.')).join(''));
  };
  const um = v => Math.round(v * 10) / 10;
  const pts = tmj.layers.find(l => l.name === 'rio')?.objects?.[0]?.polyline ?? [];
  const rio = pts.map(p => (lado === 'emPe' ? { x: um((p.y / (lin * CASA)) * 100), y: um((p.x / (col * CASA)) * 100) } : { x: um((p.x / (col * CASA)) * 100), y: um((p.y / (lin * CASA)) * 100) }));
  return { lado, desenho: { rio, chao: linhas('chao'), altura: linhas('altura'), obra: linhas('obra') } };
}

/* O tileset de cores num PNG, sem dependência: RGBA cru, filtro 0 por linha, deflate. */
export function tilesetPng() {
  const w = CASAS.length * CASA, h = CASA, cru = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    cru[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const k = CASAS[Math.floor(x / CASA)], hex = k.cor.slice(1).padEnd(8, 'f');
      const borda = x % CASA === 0 || y === 0;          // a grade fina ajuda a contar casas
      const [r, g, b, a] = [0, 2, 4, 6].map(i => parseInt(hex.slice(i, i + 2), 16));
      cru.set(borda && a ? [r * 0.8, g * 0.8, b * 0.8, a] : [r, g, b, a], y * (w * 4 + 1) + 1 + x * 4);
    }
  }
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo), tam = Buffer.alloc(4), crc = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])) >>> 0);
    return Buffer.concat([tam, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(cru)), bloco('IEND', Buffer.alloc(0))]);
}

const CONTEUDO = new URL('../content/mapa_kanto_v1.mjs', import.meta.url), PASTA = new URL('../mapa-tiled/', import.meta.url);

/* Reescreve só o objeto do mapa no arquivo de conteúdo — o cabeçalho fica. */
export function arquivoDoMapa(texto, mapas) {
  const bloco = (nome, linhas) => `    ${nome}: [\n${linhas.map(l => `      '${l}',`).join('\n')}\n    ],\n`;
  const corpo = Object.entries(mapas).map(([lado, d]) => `  ${lado}: {\n    rio: [${d.rio.map(p => `{ x: ${p.x}, y: ${p.y} }`).join(', ')}],\n${bloco('chao', d.chao)}${bloco('altura', d.altura)}${bloco('obra', d.obra)}  },\n`).join('');
  return `${texto.slice(0, texto.indexOf('export const MAPA_DA_JORNADA'))}export const MAPA_DA_JORNADA = {\n${corpo}};\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { MAPA_DA_JORNADA } = await import(CONTEUDO);
  if (process.argv[2] === 'exportar') {
    mkdirSync(PASTA, { recursive: true });
    writeFileSync(new URL('kanto-tiles.png', PASTA), tilesetPng());
    for (const [lado, d] of Object.entries(MAPA_DA_JORNADA)) writeFileSync(new URL(`kanto-${lado}.tmj`, PASTA), JSON.stringify(paraTiled(d, { lado }), null, 1));
    console.log(`exportado para ${PASTA.pathname} — abra os .tmj no Tiled`);
  } else if (process.argv[2] === 'importar') {
    const mapas = Object.fromEntries(Object.keys(MAPA_DA_JORNADA).map(lado => {
      const { desenho } = deTiled(JSON.parse(readFileSync(new URL(`kanto-${lado}.tmj`, PASTA), 'utf8')));
      return [lado, desenho];
    }));
    writeFileSync(CONTEUDO, arquivoDoMapa(readFileSync(CONTEUDO, 'utf8'), mapas));
    console.log('content/mapa_kanto_v1.mjs reescrito a partir do Tiled — rode a suíte');
  } else console.log('uso: node tools/mapa-tiled.mjs exportar | importar');
}
