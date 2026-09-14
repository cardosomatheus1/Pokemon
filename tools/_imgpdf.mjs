/* EXTRAI AS IMAGENS DE UM PDF DE PÁGINAS GERADAS, e as grava como PNG.
 *
 * O PDF guarda cada imagem como um objeto com `/Subtype /Image` e um filtro.
 * Aqui todas são `FlateDecode` — bitmap cru comprimido com deflate, que é
 * exatamente o que o PNG usa no `IDAT`. Então dá para reaproveitar os bytes:
 * inflar, acrescentar o byte de filtro por linha que o PNG exige, deflar de
 * novo e embrulhar nos quatro pedaços de um PNG mínimo.
 *
 * Existe para eu conseguir LER o que o dono mandou sem pedir a ele vinte
 * capturas de tela — o painel deste navegador baixa PDF em vez de renderizar.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const arq = process.argv[2];
const saida = process.argv[3] || 'tools/previas/_pdf/img';
const b = fs.readFileSync(arq);
const s = b.toString('latin1');
fs.mkdirSync(saida, { recursive: true });

const crcTab = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTab[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const pedaco = (tipo, dados) => {
  const t = Buffer.from(tipo, 'latin1');
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, c]);
};

function png(larg, alt, canais, cru, jaFiltrado) {
  /* o PNG quer um byte de filtro (0 = nenhum) no começo de cada linha */
  const linha = larg * canais;
  let comFiltro;
  if (jaFiltrado) {
    comFiltro = cru.slice(0, (linha + 1) * alt);   /* ja vem no formato do PNG */
  } else {
    comFiltro = Buffer.alloc((linha + 1) * alt);
    for (let y = 0; y < alt; y++) {
      comFiltro[y * (linha + 1)] = 0;
      cru.copy(comFiltro, y * (linha + 1) + 1, y * linha, (y + 1) * linha);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(larg, 0); ihdr.writeUInt32BE(alt, 4);
  ihdr[8] = 8;                                  // bits por canal
  ihdr[9] = canais === 1 ? 0 : canais === 3 ? 2 : 6;   // cinza / RGB / RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(comFiltro, { level: 6 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

let n = 0, pulados = 0;
const re = /<<([^>]*?\/Subtype\s*\/Image[\s\S]*?)>>\s*stream\r?\n/g;
let m;
while ((m = re.exec(s))) {
  const dict = m[1];
  const num = k => { const x = dict.match(new RegExp(`/${k}\\s+(\\d+)`)); return x ? +x[1] : null; };
  const larg = num('Width'), alt = num('Height'), bpc = num('BitsPerComponent') ?? 8;
  const cinza = /\/DeviceGray/.test(dict);
  const rgb = /\/DeviceRGB/.test(dict);
  const ini = m.index + m[0].length;
  const fim = s.indexOf('endstream', ini);
  if (!larg || !alt || bpc !== 8 || (!cinza && !rgb)) { pulados++; continue; }

  let cru;
  try { cru = zlib.inflateSync(Buffer.from(s.slice(ini, fim), 'latin1')); }
  catch { pulados++; continue; }

  const canais = rgb ? 3 : 1;
  /* ── O PREDITOR MUDA TUDO ────────────────────────────────────────────
     `/DecodeParms /Predictor 15` quer dizer que o PDF aplicou os MESMOS
     filtros de linha do PNG antes de comprimir. Entao o resultado do inflate
     JA e o corpo de um IDAT: cada linha comeca com o byte de filtro.

     Tratado como bitmap cru — que foi a primeira versao — o byte de filtro
     entra como se fosse cor, cada linha desliza um pixel, e a imagem sai como
     RUIDO. Foi exatamente o que apareceu na conferencia. */
  const pred = /\/Predictor\s+(\d+)/.exec(dict);
  const jaFiltrado = pred && +pred[1] >= 10;
  const esperado = jaFiltrado ? (larg * canais + 1) * alt : larg * alt * canais;
  if (cru.length < esperado) { pulados++; continue; }
  const nome = path.join(saida, `img-${String(++n).padStart(2, '0')}-${larg}x${alt}.png`);
  fs.writeFileSync(nome, png(larg, alt, canais, cru, jaFiltrado));
}
console.log(`gravadas ${n} · puladas ${pulados} → ${saida}`);
