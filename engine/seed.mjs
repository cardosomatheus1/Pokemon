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

import { sha256Palavras } from './hash.mjs';

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
/* ── A VERSÃO DA RAIZ É O TIPO DELA (F1.15) ─────────────────────────────────
 *
 * O D-018 mediu o custo de uma raiz de 32 bits: a pool publicada de doze
 * lutadores entre 76 carrega ~74 bits de informação sobre ela, então a pool não
 * estreita o espaço da raiz — ela o DETERMINA. Varrer 2^32 leva ~59 min num
 * núcleo, e o mapa não depende da rodada, então o custo é de uma vez só. Com a
 * janela de aposta aberta, dava para saber o campeão.
 *
 * A raiz nova tem **128 bits**, e vem como hex de 32 caracteres. Os RAMOS
 * continuam de 32 bits, e isso é decisão medida: o que quebrava não era a
 * largura do ramo, era os cinco descerem de um segredo varrível. Recuperar
 * `sementeElenco` por força bruta continua possível e passa a não levar a lugar
 * nenhum — ela não devolve a raiz, e portanto não devolve o ramo da batalha.
 *
 * ── POR QUE A FUNÇÃO ENTENDE OS DOIS FORMATOS ──────────────────────────────
 *
 * Toda rodada já publicada tem raiz numérica, e o §25.2 exige que ela continue
 * recalculável PARA SEMPRE — a auditoria é o produto. Uma função que só
 * entendesse o formato novo quebraria a auditoria retroativamente, que é
 * exatamente um dos itens de sabotagem que este bloco declara.
 *
 * Então o tipo é a versão: `number` é o esquema antigo, `string` é o novo. Não
 * há bandeira, não há configuração, e não há como esquecer de passá-la — a
 * própria raiz diz como ela deve ser lida.
 *
 * ── E POR QUE O CAMINHO ANTIGO NÃO PODE SER "CONSERTADO" ───────────────────
 *
 * `misturar()` é BIJETIVA — é o finalizador do splitmix32, e cada passo se
 * desfaz. Com raiz numérica, publicar qualquer semente de ramo devolve a raiz
 * em O(1) (confirmado em 200.000/200.000 casos ao medir o D-018). Ela fica
 * porque as rodadas antigas precisam dela, e não porque ela sirva. */
export function derivar(raiz, rotulo) {
  if (typeof raiz === 'string') return derivarLargo(raiz, rotulo);
  return misturar(misturar(raiz >>> 0) ^ hashRotulo(String(rotulo)));
}

/* O caminho da raiz larga. SHA-256 do par, e os 32 bits de cima do resultado.
 *
 * MEMOIZADO, e o número que exige isso é concreto:
 * `derivarIndice(raiz,'simulacao',i)` roda **154.000 vezes por rodada** dentro
 * do `engine/preco.mjs`. Um SHA-256 por índice trocaria milissegundos por
 * segundos no cálculo de odd. O hash caro roda uma vez por (raiz, rótulo) —
 * cinco vezes por rodada — e a expansão por índice continua sendo a mistura
 * barata de sempre.
 *
 * É seguro: os 154.000 não são segredo, eles precisam estar bem espalhados.
 * Quem precisa ser imprevisível é a raiz, e ela agora tem 128 bits. */
const cacheRamo = new Map();
const CACHE_MAX = 64;          // cinco ramos por rodada; 64 cobre a dúzia viva

function derivarLargo(raiz, rotulo) {
  const chave = raiz + ':' + rotulo;
  const guardado = cacheRamo.get(chave);
  if (guardado !== undefined) return guardado;
  const v = sha256Palavras(chave)[0] >>> 0;
  /* Descarte simples por tamanho: o cache existe para o caminho quente de UMA
     rodada, e guardar rodada velha só ocupa memória. */
  if (cacheRamo.size >= CACHE_MAX) cacheRamo.clear();
  cacheRamo.set(chave, v);
  return v;
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
  /* A RAIZ ENTRA COMO VEIO. Antes ela era normalizada com `>>> 0`, que numa
     raiz larga a transformaria em `0` em silêncio — e a árvore inteira sairia
     igual para qualquer rodada. É o primeiro item da sabotagem deste bloco. */
  const out = { raiz: typeof raiz === 'string' ? raiz : raiz >>> 0 };
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
export const BITS_RAIZ = 128;
const PALAVRAS_RAIZ = BITS_RAIZ / 32;

/* 128 BITS, e em hex. O D-018 é a razão do tamanho; o hex é a razão do formato:
   ele atravessa JSON, coluna TEXT e query string sem conversão, e compara com
   `===`. Um `BigInt` não serializa em JSON, e um array de palavras convidaria
   cada camada a serializá-lo do seu jeito. */
export function novaRaiz() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function')
    throw new Error('sem CSPRNG: a raiz da rodada não pode sair de Math.random');
  const p = c.getRandomValues(new Uint32Array(PALAVRAS_RAIZ));
  let s = '';
  for (const x of p) s += (x >>> 0).toString(16).padStart(8, '0');
  return s;
}

/* Uma raiz é do formato novo se for hex de 32 caracteres. Usado pelas rotas,
   que recebem texto e precisam decidir sem adivinhar. */
export const RAIZ_LARGA = /^[0-9a-f]{32}$/;
/* A COLUNA GUARDA TEXTO, E ESTA É A ÚNICA FUNÇÃO QUE O LÊ DE VOLTA.
 *
 * `round_seed_reveal` é TEXT desde o F1.2, e cada leitor decidia sozinho como
 * converter — `Number(...)` espalhado por testes e por quem audita. Com a raiz
 * larga, `Number('1bfd…')` é `NaN`, e o sintoma é o pior possível: o commit não
 * confere e a auditoria acusa o servidor de ter mentido.
 *
 * O tipo é a versão (ver `derivar`), então quem lê precisa aplicar a MESMA
 * regra que quem escreve. Uma função, um lugar. */
export const lerRaiz = txt =>
  (typeof txt === 'string' && RAIZ_LARGA.test(txt)) ? txt : Number(txt);

export const raizValida = v =>
  (typeof v === 'string' && RAIZ_LARGA.test(v)) ||
  (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xFFFFFFFF);
