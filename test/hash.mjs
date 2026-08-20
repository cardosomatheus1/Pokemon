/* Q1/Q6 · SHA-256 nosso, conferido contra o padrão e contra a plataforma (F1.15).
 *
 * ── O QUE PRECISA SER PROVADO, E CONTRA QUEM ───────────────────────────────
 *
 * Escrever um hash à mão só é aceitável se houver contra o que conferir. Aqui
 * há dois juízes independentes, e eles não têm como estar errados juntos:
 *
 *   1. os **vetores oficiais** do padrão (FIPS 180-4 e o NESSIE), escritos à
 *      mão neste arquivo — se a implementação passar neles, ela é SHA-256;
 *   2. o **`crypto.subtle` da própria plataforma**, sobre entrada aleatória —
 *      se as duas concordarem em mil entradas quaisquer, não sobra caso.
 *
 * O segundo é o que pega o erro que o primeiro não pega: vetor fixo não
 * exercita preenchimento de tamanhos variados, e é no preenchimento que uma
 * implementação de SHA-256 costuma errar — na fronteira dos 56 bytes, onde o
 * bloco extra nasce.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { sha256Hex, sha256Palavras } from '../engine/hash.mjs';

/* Os vetores do padrão. Copiados do documento, não gerados por nós — gerar com
   a própria implementação seria a implementação se aprovando. */
const VETORES = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
   '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ['abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
   'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1'],
];

export async function suite() {
  const s = criarSuite('hash');

  s.teste('os vetores oficiais do padrão batem', () => {
    for (const [entrada, esperado] of VETORES)
      igual(sha256Hex(entrada), esperado,
        `SHA-256(${JSON.stringify(entrada.slice(0, 24))}${entrada.length > 24 ? '…' : ''}) ` +
        `não é o do padrão. Se este teste falha, o que está aqui não é SHA-256, ` +
        `e nada que dependa dele vale.`);
  });

  s.teste('um milhão de "a" bate com o padrão', () => {
    igual(sha256Hex('a'.repeat(1_000_000)),
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
      'o vetor longo do padrão falhou — é o que exercita muitos blocos seguidos');
  });

  /* ── O JUIZ INDEPENDENTE ───────────────────────────────────────────────── */

  s.teste('concorda com o `crypto.subtle` da plataforma em 500 entradas', async () => {
    const sub = globalThis.crypto?.subtle;
    ok(sub, 'não há `crypto.subtle` neste ambiente — o juiz independente sumiu');
    const cod = new TextEncoder();
    /* Tamanhos escolhidos EM VOLTA DE 56 e 64, que é onde o preenchimento cria
       ou não cria bloco extra. Uma implementação errada quase sempre erra ali,
       e quase nunca erra em 3 bytes. */
    const tamanhos = [0, 1, 2, 3, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129];
    let n = 0;
    for (const t of tamanhos) {
      for (let r = 0; r < 32; r++) {
        let texto = '';
        for (let i = 0; i < t; i++) texto += String.fromCharCode(33 + ((i * 7 + r * 13) % 90));
        const meu = sha256Hex(texto);
        const dela = [...new Uint8Array(await sub.digest('SHA-256', cod.encode(texto)))]
          .map(b => b.toString(16).padStart(2, '0')).join('');
        igual(meu, dela,
          `divergência com a plataforma em ${t} bytes (amostra ${r}). É a ` +
          `fronteira do preenchimento: em ${t} bytes o padrão ${t % 64 >= 56 ? 'CRIA' : 'não cria'} ` +
          `um bloco extra, e é exatamente ali que uma implementação erra.`);
        n++;
      }
    }
    ok(n === tamanhos.length * 32, `só ${n} comparações rodaram`);
  });

  s.teste('a saída em palavras é a mesma coisa que a saída em hex', () => {
    const p = sha256Palavras('pokearena');
    const hex = [...p].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
    igual(hex, sha256Hex('pokearena'),
      'as duas portas do módulo discordam — uma delas está convertendo errado');
    igual(p.length, 8, 'a saída não tem oito palavras de 32 bits');
  });

  /* ── UTF-8, e não código de caractere ─────────────────────────────────── */

  s.teste('texto fora do ASCII é medido em UTF-8', async () => {
    /* Se a implementação tratasse cada caractere como um byte, `é` viraria um
       byte em vez de dois e o hash divergiria de qualquer outra ferramenta. O
       rótulo do `derivar` é ASCII hoje; amanhã pode não ser.

       O valor esperado vem do `crypto.subtle`, e NÃO escrito à mão: um hash
       que eu digitasse aqui sem ter como conferir seria eu inventando a
       resposta — que é o oposto do que este arquivo existe para fazer. Os
       vetores de cima podem ser escritos à mão porque estão publicados no
       padrão; este não está. */
    const sub = globalThis.crypto?.subtle;
    ok(sub, 'não há `crypto.subtle` neste ambiente');
    const cod = new TextEncoder();
    for (const texto of ['é', 'ação', '日本', '🎲 aposta', 'ÿ'.repeat(60)]) {
      const dela = [...new Uint8Array(await sub.digest('SHA-256', cod.encode(texto)))]
        .map(b => b.toString(16).padStart(2, '0')).join('');
      igual(sha256Hex(texto), dela,
        `\`${texto.slice(0, 12)}\` divergiu: o texto não foi codificado em UTF-8 ` +
        `antes de ser medido, ou foi medido caractere a caractere.`);
    }
  });

  return s;
}
