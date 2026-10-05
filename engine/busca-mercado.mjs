/* A BUSCA DO MARKET, DECIDIDA FORA DO BANCO (ST-14.10 · E14 · spec E14 §10.2) — camada 0.
 *
 * O que a busca ACEITA mora aqui, puro: os filtros (cada um com tipo e
 * faixa), a ordem (uma LISTA FECHADA — nada do pedido vira SQL), o cursor
 * (chave de ordenação + id, com a ordem dentro, para não servir a página de
 * uma ordem na outra) e a categoria de cada item. O servidor só traduz o que
 * saiu daqui em `?`.
 *
 * O CURSOR É DE TECLADO (keyset), e não de deslocamento: "depois de (preço,
 * id)". Num conjunto estável ele não repete nem pula; com anúncios entrando
 * no meio, um anúncio novo ANTES do cursor não aparece nesta passada — a
 * tela recarrega do começo para ver o que chegou, e é isso que ela promete,
 * e não um retrato congelado que este código não tem.
 */
export const CATEGORIAS = Object.freeze(['criaturas', 'bolas', 'essencias', 'materiais', 'itens']);

/* A categoria de um item do pack — gravada no anúncio, para o índice. */
export function categoriaDoItem(pack, itemId) {
  const id = String(itemId ?? '');
  if ((pack?.bolas ?? []).some(b => b.id === id)) return 'bolas';
  if (id === pack?.material?.id) return 'essencias';
  if (id.startsWith('est:')) return 'materiais';
  return 'itens';
}

/* A ORDEM: só estas, e cada uma diz a coluna e o sentido. O id desempata no
   mesmo sentido — é o que torna o cursor único. */
export const ORDENS = Object.freeze({
  recente:    Object.freeze({ coluna: 'criado_em', desc: true }),
  preco:      Object.freeze({ coluna: 'preco', desc: false }),
  preco_desc: Object.freeze({ coluna: 'preco', desc: true }),
});
export const LIMITE_PADRAO = 20, LIMITE_MAX = 50;

export const ERRO_BUSCA = 'BUSCA_INVALIDA';
const falha = msg => Object.assign(new Error(msg), { codigo: ERRO_BUSCA });

const inteiro = (v, min, max, nome) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw falha(`${nome} fora da faixa`);
  return n;
};
const curto = (v, max, nome) => {
  if (v == null || v === '') return null;
  const s = String(v);
  if (s.length > max || !/^[\w:\-.]+$/u.test(s)) throw falha(`${nome} inválido`);
  return s;
};

/* O pedido (um objeto com `get`, como o `URLSearchParams`) vira a busca. */
export function normalizarBusca(q) {
  const get = k => (typeof q?.get === 'function' ? q.get(k) : q?.[k]);
  const categoria = get('categoria') || null;
  if (categoria && !CATEGORIAS.includes(categoria)) throw falha('categoria desconhecida');
  const ordem = get('ordem') || 'recente';
  if (!Object.hasOwn(ORDENS, ordem)) throw falha('ordem desconhecida');
  const shiny = get('shiny');
  if (shiny != null && shiny !== '' && shiny !== 'sim' && shiny !== 'nao') throw falha('shiny é "sim" ou "nao"');
  const b = {
    categoria, ordem,
    dex: inteiro(get('dex'), 1, 10_000, 'espécie'),
    itemId: curto(get('item'), 40, 'item'),
    shiny: shiny === 'sim' ? true : shiny === 'nao' ? false : null,
    nivelMin: inteiro(get('nivelMin'), 1, 100, 'nível mínimo'),
    nivelMax: inteiro(get('nivelMax'), 1, 100, 'nível máximo'),
    natureza: curto(get('natureza'), 20, 'natureza'),
    potencialMin: inteiro(get('potencialMin'), 0, 1000, 'potencial mínimo'),
    precoMin: inteiro(get('precoMin'), 0, Number.MAX_SAFE_INTEGER, 'preço mínimo'),
    precoMax: inteiro(get('precoMax'), 0, Number.MAX_SAFE_INTEGER, 'preço máximo'),
    limite: inteiro(get('limite'), 1, LIMITE_MAX, 'limite') ?? LIMITE_PADRAO,
  };
  b.cursor = decodificarCursor(get('cursor'), ordem);
  const tipo=curto(get('tipo'),20,'tipo');if(tipo)b.tipo=tipo;
  const ivMin=inteiro(get('ivMin'),0,31,'IV mínimo'),ivStat=get('ivStat');
  if(ivMin!==null||ivStat){
    if(!['hp','atq','def','spa','spd','vel'].includes(ivStat)||ivMin===null)throw falha('escolha atributo e IV mínimo');
    b.ivStat=ivStat;b.ivMin=ivMin;
  }
  if(b.nivelMin!==null&&b.nivelMax!==null&&b.nivelMin>b.nivelMax)throw falha('nível mínimo maior que máximo');
  return b;
}

/* ── O CURSOR ── base64url de [ordem, valor, id]. A ordem vai dentro: o
   cursor de "mais barato" não pode continuar uma lista "mais recente".
   `btoa`/`atob` e não `Buffer`: a camada 0 roda no navegador também, e o
   conteúdo é ASCII (nomes de ordem, inteiros, ids). */
const b64url = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = s => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
export function codificarCursor(ordem, valor, id) {
  return b64url(JSON.stringify([ordem, valor, id]));
}

export function decodificarCursor(texto, ordem) {
  if (texto == null || texto === '') return null;
  let v;
  try { v = JSON.parse(deB64url(String(texto))); } catch { throw falha('cursor inválido'); }
  if (!Array.isArray(v) || v.length !== 3 || v[0] !== ordem || !Number.isSafeInteger(v[1]) || typeof v[2] !== 'string' || !v[2] || v[2].length > 64)
    throw falha('cursor inválido');
  return { valor: v[1], id: v[2] };
}
