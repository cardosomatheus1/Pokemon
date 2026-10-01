/* A BUSCA DO MARKET (ST-14.10 · E14 · spec E14 §10.2).
 *
 * O que a busca aceita foi decidido em `engine/busca-mercado.mjs`; aqui ela
 * vira consulta — e a consulta é montada com PEDAÇOS FIXOS deste arquivo e
 * `?` para cada valor. Nada do pedido entra no texto do SQL: nem o filtro,
 * nem a ordem (que é uma das três da lista fechada), nem o cursor.
 *
 * Sempre: só ATIVO e no prazo (a disponibilidade não espera o varredor), e
 * sempre o pack — o 25 de um pack não é o 25 do outro. Filtros são E.
 */
import { ORDENS, codificarCursor } from '../engine/busca-mercado.mjs';
import { publico } from './mercado-jogadores.mjs';

const FILTROS = [
  ['categoria',    'AND categoria = ?'],
  ['dex',          'AND dex = ?'],
  ['itemId',       'AND item_id = ?'],
  ['nivelMin',     'AND nivel >= ?'],
  ['nivelMax',     'AND nivel <= ?'],
  ['natureza',     'AND natureza = ?'],
  ['potencialMin', 'AND potencial >= ?'],
  ['precoMin',     'AND preco >= ?'],
  ['precoMax',     'AND preco <= ?'],
];
/* O cursor e a ordem, por ordem: o SQL de cada uma é um texto fixo. */
const POR_ORDEM = {
  recente:    { depois: 'AND (criado_em < ? OR (criado_em = ? AND id < ?))', ordenar: 'ORDER BY criado_em DESC, id DESC' },
  preco:      { depois: 'AND (preco > ? OR (preco = ? AND id > ?))',         ordenar: 'ORDER BY preco ASC, id ASC' },
  preco_desc: { depois: 'AND (preco < ? OR (preco = ? AND id < ?))',         ordenar: 'ORDER BY preco DESC, id DESC' },
};

export function montarBusca({ pack, agora, busca: b }) {
  const partes = [`SELECT * FROM player_market_listings WHERE estado = 'ACTIVE' AND pack_id = ? AND expira_em > ?`];
  const args = [pack.id, agora];
  for (const [campo, sql] of FILTROS) if (b[campo] != null) { partes.push(sql); args.push(b[campo]); }
  if (b.shiny != null) { partes.push('AND shiny = ?'); args.push(b.shiny ? 1 : 0); }
  const o = POR_ORDEM[b.ordem];
  if (b.cursor) { partes.push(o.depois); args.push(b.cursor.valor, b.cursor.valor, b.cursor.id); }
  partes.push(o.ordenar, 'LIMIT ?');
  args.push(b.limite + 1);
  return { sql: partes.join(' '), args };
}

export function buscarAnuncios(db, { pack, agora, busca }) {
  const { sql, args } = montarBusca({ pack, agora, busca });
  const linhas = db.prepare(sql).all(...args);
  const pagina = linhas.slice(0, busca.limite);
  const ultimo = pagina.at(-1);
  const coluna = ORDENS[busca.ordem].coluna;
  return {
    anuncios: pagina.map(a => publico(db, a)),
    proximo: linhas.length > busca.limite && ultimo ? codificarCursor(busca.ordem, ultimo[coluna], ultimo.id) : null,
  };
}
