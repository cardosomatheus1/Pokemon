/* Commit-reveal — Spec §4.5.
 *
 * Antes das apostas a casa publica `commit`. Depois da rodada revela a raiz, e
 * qualquer um confere que o resultado já estava decidido antes de alguém
 * apostar. É o que separa "confie em nós" de "verifique você mesmo".
 *
 * O SAL NÃO É ENFEITE, E ESSE É O PONTO MAIS IMPORTANTE DESTE ARQUIVO.
 * A raiz tem 32 bits. `SHA256(raiz)` sozinho seria invertível por força bruta
 * em segundos — 4,3 bilhões de tentativas é trabalho de laptop —, e aí o
 * "compromisso" entregaria a semente antes da aposta em vez de escondê-la. O
 * sal de 128 bits é o que torna o espaço de busca impraticável. Publicar
 * commit sem sal seria publicar o resultado.
 *
 * O ESQUEMA DEFINITIVO EXIGE REVISÃO CRIPTOGRÁFICA. A Spec é explícita: *"o
 * objetivo da v0.9 é criar interfaces, não inventar segurança caseira"*. O que
 * está aqui é o protocolo — publicar, revelar, conferir — com um esquema
 * defensável, não uma construção auditada. Em V1 isso passa por revisão antes
 * de valer dinheiro simulado de terceiros.
 */

const TAM_SAL = 16;   // 128 bits

const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('sem WebCrypto: o commit-reveal não pode ser improvisado');
  return c.subtle;
}

/* Sal por rodada, do mesmo CSPRNG da raiz. Novo a cada rodada de propósito:
   sal fixo faria commits de rodadas diferentes com a mesma raiz colidirem, e
   um atacante montaria uma tabela. */
export function novoSal() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function')
    throw new Error('sem CSPRNG: o sal do commit não pode sair de Math.random');
  return hex(c.getRandomValues(new Uint8Array(TAM_SAL)));
}

/* A mensagem comprometida. Formato explícito e separado por `|` para que dois
   pares (raiz, sal) diferentes nunca produzam a mesma string. */
const mensagem = (raiz, sal) => `pokearena|v1|${(raiz >>> 0).toString(16)}|${sal}`;

export async function comprometer(raiz, sal) {
  if (!Number.isInteger(raiz) || raiz < 0 || raiz > 0xFFFFFFFF)
    throw new Error(`raiz inválida para commit: ${raiz}`);
  if (typeof sal !== 'string' || sal.length < TAM_SAL * 2)
    throw new Error('sal ausente ou curto demais: sem ele o commit é invertível por força bruta');
  const dados = new TextEncoder().encode(mensagem(raiz, sal));
  return hex(new Uint8Array(await subtle().digest('SHA-256', dados)));
}

/* Confere um reveal contra o commit publicado. Comparação em tempo constante:
   não porque haja segredo a proteger aqui, mas porque a função vira servidor em
   V1 e comparação com curto-circuito é a porta clássica. */
export async function conferir(commit, raiz, sal) {
  let esperado;
  try { esperado = await comprometer(raiz, sal); } catch { return false; }
  if (typeof commit !== 'string' || commit.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= commit.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

/* O pacote que a rodada publica ANTES das apostas, e o que ela revela depois.
   São dois objetos separados de propósito: o que se publica cedo não pode ter
   campo nenhum que o reveal traria. */
export async function abrirRodada(raiz) {
  const sal = novoSal();
  return { publico: { commit: await comprometer(raiz, sal), esquema: 'SHA256|v1' },
           segredo: { raiz, sal } };
}

export const revelar = segredo => ({ raiz: segredo.raiz, sal: segredo.sal });
