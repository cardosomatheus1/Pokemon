/* Q1/Q3 · AS FOLHAS DOS TRAJES ESTÃO NA ORDEM QUE O MUNDO LÊ (D-141)
 *
 * O dono, olhando as Rotas no telefone: "o boneco não caminha, fica de costas
 * se movimentando, não vira de frente". O motor estava certo; a FOLHA do traje
 * padrão ("Urbano", `boystandard.png`) tinha as costas e o perfil trocados — a
 * esteira recebeu as três vistas numa ordem e as declarou noutra. Andando de
 * lado (quase toda a trilha), o boneco mostrava as COSTAS e deslizava.
 *
 * O que trava é uma propriedade do DESENHO, e não um byte: frente e costas são
 * quase simétricas da esquerda para a direita; o perfil é a vista MENOS
 * simétrica das três. Medido em todos os trajes de três vistas: o quadro 2 é
 * sempre o mais assimétrico — e no `boystandard` quebrado era o quadro 1.
 *
 * Sem dependência: o PNG é lido aqui (8 bits, RGBA, sem entrelaçamento — o que
 * a esteira grava), e a leitura recusa o que não for isso, em vez de medir
 * errado em silêncio. */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { criarSuite, ok, igual } from './harness.mjs';
import { ACERVO } from '../app/modules/outfit-acervo.mjs';

export function lerPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  let p = 8, w = 0, h = 0, prof = 0, tipo = 0, entrel = 0;
  const idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; tipo = d[9]; entrel = d[12]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    p += 12 + n;
  }
  if (prof !== 8 || tipo !== 6 || entrel !== 0) throw new Error(`PNG fora do formato da esteira (prof ${prof}, tipo ${tipo}, entrel ${entrel})`);
  const cru = inflateSync(Buffer.concat(idat)), bpp = 4, linha = w * bpp;
  const px = Buffer.alloc(h * linha);
  for (let y = 0; y < h; y++) {
    const f = cru[y * (linha + 1)], src = cru.subarray(y * (linha + 1) + 1, (y + 1) * (linha + 1));
    for (let x = 0; x < linha; x++) {
      const a = x >= bpp ? px[y * linha + x - bpp] : 0, b = y ? px[(y - 1) * linha + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * linha + x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      px[y * linha + x] = (src[x] + pred) & 255;
    }
  }
  return { w, h, alfa: (x, y) => px[(y * w + x) * 4 + 3] };
}

/* Quanto o quadro k difere do próprio espelho: pixels opacos sem par do outro
   lado, sobre os opacos. Frente e costas ~0; o perfil, o maior dos três. */
export function assimetria(img, k) {
  const q = Math.floor(img.w / 9);
  let tot = 0, dif = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < q; x++) {
    const o = img.alfa(k * q + x, y) > 0, m = img.alfa(k * q + (q - 1 - x), y) > 0;
    tot += o; dif += o !== m;
  }
  return dif / Math.max(1, tot);
}

const arquivo = rel => new URL('../app/' + rel, import.meta.url);   // a folha é relativa ao app/index.html

export function suite() {
  const s = criarSuite('outfit-folhas');

  s.teste('a leitura do PNG reconhece uma folha de nove quadros', () => {
    const img = lerPng(readFileSync(arquivo(ACERVO[0].folha)));
    igual(img.w % 9, 0, 'a folha do traje padrão não tem nove quadros');
    ok(img.h > 20, 'a folha do traje padrão veio sem altura');
  });

  s.teste('D-141: em todo traje de três vistas, o quadro 2 é o perfil (o mais assimétrico)', () => {
    const tres = ACERVO.filter(o => (o.vistas ?? 3) >= 3);
    ok(tres.length >= 5, 'o acervo perdeu os trajes de três vistas');
    for (const o of tres) {
      const img = lerPng(readFileSync(arquivo(o.folha)));
      const [f, c, p] = [0, 1, 2].map(k => assimetria(img, k));
      ok(p > c && p > f, `${o.id}: o quadro 2 não é o perfil (frente ${f.toFixed(2)} · costas ${c.toFixed(2)} · perfil ${p.toFixed(2)}) — o boneco anda de lado mostrando as costas`);
      /* e os passos seguem a vista: o passo de perfil (7) é perfil, o de costas (5) não */
      ok(assimetria(img, 7) > assimetria(img, 5), `${o.id}: os passos de costas e de perfil estão trocados`);
    }
  });

  s.teste('o traje que todo jogador novo veste é de três vistas', () => {
    igual(ACERVO[0].id, 'boystandard', 'o traje padrão mudou — confira a folha dele');
    igual(ACERVO[0].vistas, 3, 'o traje padrão perdeu as vistas');
  });

  return s;
}
