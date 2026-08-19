/* A árvore de sementes da rodada — Spec §P3.
 *
 * Toda rodada nasce de UM número, a raiz. Dele descem cinco sub-seeds
 * independentes: elenco, ambiente, batalha, visual e recompensa. Guardar a
 * raiz é guardar a rodada inteira.
 *
 * Antes do F0.5 eram cinco `Math.random()` soltos, e nada era reproduzível:
 * nem a pool, nem o clima, nem as simulações que formam o preço. Isso
 * não é detalhe de arrumação — é o que impede a auditoria do §25.2, onde a
 * casa publica o compromisso antes e a raiz depois, e qualquer um recalcula.
 *
 * DUAS FONTES, PROPÓSITOS OPOSTOS:
 *
 *   novaRaiz()   imprevisível. Vem do CSPRNG da plataforma. Ninguém, nem quem
 *                escreveu isto, consegue adivinhar a próxima.
 *   derivar()    previsível de propósito. Dada a raiz, qualquer um chega às
 *                mesmas cinco sub-seeds e reconstrói a rodada.
 *
 * Confundir as duas é o modo de falha clássico: raiz derivada do relógio ou de
 * um contador é adivinhável, e aí o apostador sabe o vencedor antes de apostar.
 */

/* Finalizador do splitmix32. Um passo, avalanche completa — virar um bit da
   entrada vira metade dos bits da saída, que é exatamente o que o teste mede. */
function misturar(x) {
  x = (x + 0x9E3779B9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21F0AAAD);
  x = Math.imul(x ^ (x >>> 15), 0x735A2D97);
  return (x ^ (x >>> 15)) >>> 0;
}

/* FNV-1a de 32 bits sobre o rótulo. Rótulo é texto porque o nome do ramo é a
   documentação: `derivar(raiz, 'batalha')` diz o que está sendo derivado, e
   um índice numérico não diria. */
function hashRotulo(s) {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* Duas misturas, não uma: `misturar(raiz ^ hash)` deixaria pares (raiz,rótulo)
   diferentes caindo no mesmo ponto sempre que o XOR coincidisse. Misturar a
   raiz ANTES separa os dois espaços. */
export function derivar(raiz, rotulo) {
  return misturar(misturar(raiz >>> 0) ^ hashRotulo(String(rotulo)));
}

/* Sub-seed indexada, para as simulações do Monte Carlo. O rótulo é
   derivado uma vez e o índice entra misturado — evita um hash de string por
   no caminho quente sem abrir mão da dispersão. */
export function derivarIndice(raiz, rotulo, i) {
  return misturar(derivar(raiz, rotulo) ^ misturar(i >>> 0));
}

/* Os cinco ramos do §P3.
 *
 * A derivação é por RÓTULO, não por posição, e isso é decisão de projeto: um
 * ramo novo (ou um reordenamento) não move os outros, então as rodadas já
 * publicadas continuam recalculáveis. Fosse por posição — `derivar(raiz, i)` —
 * inserir `recompensa` antes de `visual` reescreveria todas as rodadas
 * passadas e a auditoria do §25.2 deixaria de fechar. */
export const RAMOS = ['elenco', 'ambiente', 'batalha', 'visual', 'recompensa'];

/* Devolve a árvore inteira, raiz inclusive. A raiz vem junto de propósito: ela
   é o que se guarda, se publica e se audita, e separá-la dos ramos em dois
   campos convidava a guardar um sem o outro. */
export function sementes(raiz) {
  const out = { raiz: raiz >>> 0 };
  for (const r of RAMOS) out[r] = derivar(raiz, r);
  return out;
}

/* A raiz é a única coisa neste arquivo que NÃO pode ser reproduzível.
 *
 * Sem fallback de propósito. `Math.random()` não é criptográfico e nenhum
 * navegador ou runtime que este jogo suporta fica sem `crypto.getRandomValues`
 * — cair para um gerador fraco em silêncio seria trocar imprevisibilidade por
 * disponibilidade num lugar onde há dinheiro simulado em jogo. Falha alto.
 */
export function novaRaiz() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function')
    throw new Error('sem CSPRNG: a raiz da rodada não pode sair de Math.random');
  return c.getRandomValues(new Uint32Array(1))[0] >>> 0;
}
