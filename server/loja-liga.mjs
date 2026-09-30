/* A LOJA DA LIGA NO SERVIDOR (ST-11.7c · Spec §9.11).
 *
 * O catálogo é o de `engine/loja-liga.mjs`; aqui mora a compra. UMA transação:
 * o débito dos League Points, o crédito do item (a bolsa, ou o doce da linha)
 * e o lançamento no livro do doce — ou nenhum dos três.
 *
 * A chave de repetição é do CLIENTE (uma por clique), como a da boutique
 * (`cosmeticos.mjs`): repetir o pedido devolve a mesma resposta, e não compra
 * de novo. O preço que o cliente mandar é ignorado por construção — nenhuma
 * função daqui o recebe.
 *
 * E a regra do §10.12 vale aqui também: este arquivo não importa a carteira.
 * Os pontos compram coisa do jogo; nunca viram PokéCash, nem de volta.
 */
import { catalogoDaLoja, itemDaLoja, podeComprar } from '../engine/loja-liga.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { saldoDePontos, debitarPontos, compradosNaTemporada } from './pontos-liga.mjs';
import { creditarBolsa, criaturasDaConta } from './idle.mjs';
import { exigirBandeira } from './feature-flags.mjs';
import { anotar } from './telemetria.mjs';
import PACK from '../content/escolhido.mjs';
import { catalogo as catalogoDaVitrine } from '../app/modules/cosmeticos.mjs';

export const ERRO_LOJA_LIGA = Object.freeze({
  CHAVE: 'LOJA_LIGA_CHAVE_INVALIDA',
  ITEM: 'LOJA_LIGA_ITEM_DESCONHECIDO',
  LINHA: 'LOJA_LIGA_LINHA_INVALIDA',
  RECUSADA: 'LOJA_LIGA_RECUSADA',
});

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}
const falha = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });
const CHAVE_OK = /^[\w-]{8,64}$/;
const refDo = item => `loja:${item.id}`;

/* As peças que a vitrine marcou como da Liga (ST-11.7d): o catálogo é o MESMO
   que a tela mostra, como na boutique (`cosmeticos.mjs`). */
const cosmeticosDaLiga = () => catalogoDaVitrine().filter(p => p.procedencia === 'liga');
const jaTemPeca = (db, userId, item) => item.tipo === 'cosmetico' &&
  !!db.prepare(`SELECT 1 FROM cosmetic_ownership WHERE user_id = ? AND familia = ? AND item_id = ?`).get(userId, item.alvo.familia, item.alvo.id);

/* As linhas de doce que a conta pode comprar: as das criaturas que ela TEM.
   Doce de uma linha que ela não tem seria doce parado. */
function linhasDaConta(db, userId, pack) {
  const vistas = new Map();
  for (const c of criaturasDaConta(db, userId)) {
    const linha = chaveDoDoce(pack, c.dex);
    if (linha != null && !vistas.has(linha)) vistas.set(linha, { linha, nome: (pack.especies ?? []).find(e => e.dex === linha)?.n ?? String(linha) });
  }
  return [...vistas.values()].sort((a, b) => a.linha - b.linha);
}

/* A LEITURA da loja: o saldo, cada item com o que falta do limite, e as linhas de doce. */
export function lojaDaConta(db, { userId, agora, pack = PACK }) {
  const temporada = temporadaDe(agora).numero, saldo = saldoDePontos(db, userId);
  const itens = catalogoDaLoja(pack, cosmeticosDaLiga()).map(item => {
    const comprados = compradosNaTemporada(db, userId, refDo(item), temporada);
    const jaTem = jaTemPeca(db, userId, item);
    const pode = podeComprar(item, { saldo, comprados, jaTem });
    return { id: item.id, tipo: item.tipo, alvo: item.alvo, nome: item.nome, mult: item.mult ?? null, arte: item.arte ?? null, jaTem, preco: item.preco, quantidade: item.quantidade,
             limite: item.limite, comprados, pode: pode.ok, motivo: pode.ok ? null : pode.motivo };
  });
  return { temporada, saldo, itens, linhas: linhasDaConta(db, userId, pack) };
}

/* A COMPRA. `linha` só para o doce. */
export function comprarNaLoja(db, { userId, item: id, linha = null, chaveIdem, agora, pack = PACK }) {
  exigirBandeira(db, 'league_enabled');
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_LOJA_LIGA.CHAVE, 'pedido sem chave de repetição');
  const idem = `compra:${userId}:${chaveIdem}`;
  const item = itemDaLoja(pack, id, cosmeticosDaLiga());
  if (!item) throw falha(ERRO_LOJA_LIGA.ITEM, 'esse item não está na loja');
  return emTransacao(db, () => {
    /* A MESMA CHAVE, A MESMA RESPOSTA: a compra já está no livro. */
    const ja = db.prepare(`SELECT ref FROM liga_pontos WHERE idem = ?`).get(idem);
    if (ja) return { ok: true, repetida: true, item: ja.ref.replace(/^loja:/, ''), saldo: saldoDePontos(db, userId) };
    let alvo = item.alvo;
    if (item.tipo === 'doce') {
      alvo = Number(linha);
      if (!linhasDaConta(db, userId, pack).some(l => l.linha === alvo)) throw falha(ERRO_LOJA_LIGA.LINHA, 'escolha uma linha que você tem');
    }
    const temporada = temporadaDe(agora).numero;
    const pode = podeComprar(item, { saldo: saldoDePontos(db, userId), comprados: compradosNaTemporada(db, userId, refDo(item), temporada),
                                     jaTem: jaTemPeca(db, userId, item) });
    if (!pode.ok) throw falha(ERRO_LOJA_LIGA.RECUSADA, pode.motivo);
    debitarPontos(db, { userId, valor: item.preco, ref: refDo(item), idem, agora });
    if (item.tipo === 'bola') creditarBolsa(db, userId, alvo, item.quantidade);
    else if (item.tipo === 'cosmetico')
      /* A POSSE, na mesma transação do débito — e com a origem que diz de onde veio. */
      db.prepare(`INSERT INTO cosmetic_ownership (user_id, familia, item_id, origem, adquirido_em) VALUES (?, ?, ?, 'liga', ?)`)
        .run(userId, item.alvo.familia, item.alvo.id, agora);
    else {
      db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, ?, ?, 'liga', ?, ?)`)
        .run(userId, alvo, item.quantidade, idem, agora);
      db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, ?, ?)
                  ON CONFLICT (user_id, species_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade`).run(userId, alvo, item.quantidade);
    }
    anotar(db, { nome: 'liga_loja_compra', userId, chave: idem, agora, campos: { item: item.id, preco: item.preco } });
    return { ok: true, repetida: false, item: item.id, alvo, quantidade: item.quantidade, saldo: saldoDePontos(db, userId) };
  });
}

export function rotasDaLojaLiga(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/equipe/loja': ({ db, userId, agora }) => ({ corpo: lojaDaConta(db, { userId, agora }) }),
    'POST /api/equipe/loja/comprar': ({ db, corpo, userId, agora }) => {
      if (typeof corpo?.item !== 'string') return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'item inválido' } };
      return tentar(() => comprarNaLoja(db, { userId, item: corpo.item, linha: corpo.linha ?? null, chaveIdem: corpo.chaveIdem, agora }));
    },
  };
}
