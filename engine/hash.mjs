/* SHA-256, síncrono e sem dependência (F1.15).
 *
 * ── POR QUE ESCREVER UM HASH À MÃO, num projeto que evita fazer isso ───────
 *
 * `engine/commit.mjs` já usa SHA-256 — pela WebCrypto, que é **assíncrona**.
 * Isso serve para o commit-reveal, que acontece uma vez por rodada. Não serve
 * para `derivar()`, que roda dentro do laço de quadro do cliente e dentro do
 * Monte Carlo: tornar a derivação assíncrona espalharia `await` por todo o
 * motor para responder uma pergunta puramente aritmética.
 *
 * `node:crypto` resolveria no servidor e não no navegador, e o motor é o mesmo
 * dos dois lados — é essa igualdade que a paridade do F1.1 mede.
 *
 * **Isto não é criptografia caseira.** É a implementação de um padrão
 * publicado, com teste contra os vetores oficiais do NIST E contra o
 * `crypto.subtle` da própria plataforma, nos dois ambientes. Inventar uma
 * função de mistura nova é que seria caseiro; SHA-256 tem uma resposta certa e
 * qualquer um pode conferir se esta é ela.
 *
 * ── POR QUE O PROJETO PRECISA DISSO ────────────────────────────────────────
 *
 * O **D-018**: a raiz de 32 bits cabe numa varredura, e a pool publicada a
 * determina. A raiz passa a ter 128 bits, e derivar 128 bits em cinco ramos
 * exige uma função em que conhecer um ramo não devolva a raiz. O splitmix32 de
 * hoje é **bijetivo** — publicar um ramo devolveria a raiz em O(1).
 */

/* As 64 constantes do padrão: parte fracionária da raiz cúbica dos 64 primeiros
   primos. Escritas por extenso e não computadas — computá-las custaria mais
   linhas do que a tabela, e a tabela se confere contra o documento. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const gira = (x, n) => (x >>> n) | (x << (32 - n));

/* Bytes → 8 palavras de 32 bits. O `Uint32Array` de trabalho é alocado UMA vez
   por chamada e não por bloco: o caminho quente do `derivar` chama isto a cada
   ramo, e alocar 64 palavras por bloco de 64 bytes seria lixo puro. */
export function sha256Bytes(bytes) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);

  /* Preenchimento do padrão: um bit 1, zeros até 56 mod 64, e o comprimento em
     BITS num inteiro de 64 bits big-endian. */
  const n = bytes.length;
  const total = (((n + 8) >> 6) + 1) << 6;      // múltiplo de 64 que cabe n + 1 + 8
  const m = new Uint8Array(total);
  m.set(bytes);
  m[n] = 0x80;
  /* O comprimento em bits pode passar de 2^32 num arquivo grande; aqui as
     entradas são pequenas, mas escrever as duas metades custa duas linhas e
     evita um limite escondido. */
  const bits = n * 8;
  const alto = Math.floor(bits / 0x100000000);
  const baixo = bits >>> 0;
  m[total - 8] = (alto >>> 24) & 0xff; m[total - 7] = (alto >>> 16) & 0xff;
  m[total - 6] = (alto >>> 8) & 0xff;  m[total - 5] = alto & 0xff;
  m[total - 4] = (baixo >>> 24) & 0xff; m[total - 3] = (baixo >>> 16) & 0xff;
  m[total - 2] = (baixo >>> 8) & 0xff;  m[total - 1] = baixo & 0xff;

  const w = new Uint32Array(64);
  for (let bloco = 0; bloco < total; bloco += 64) {
    for (let i = 0; i < 16; i++) {
      const j = bloco + i * 4;
      w[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = gira(w[i - 15], 7) ^ gira(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = gira(w[i - 2], 17) ^ gira(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = gira(e, 6) ^ gira(e, 11) ^ gira(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = gira(a, 2) ^ gira(a, 13) ^ gira(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  return h;
}

const COD = new TextEncoder();

/* Texto → as oito palavras. É o que `derivar` usa: ele quer bits, não hex. */
export const sha256Palavras = texto => sha256Bytes(COD.encode(texto));

/* Texto → hex de 64 caracteres. Para quem precisa comparar ou publicar. */
export function sha256Hex(texto) {
  const h = sha256Palavras(texto);
  let s = '';
  for (const p of h) s += (p >>> 0).toString(16).padStart(8, '0');
  return s;
}
