/* A POSSE DE COSMÉTICO, COM AUTORIDADE NO SERVIDOR (E4 · INT-02).
 *
 * Até o E4 a posse morava no navegador: limpar o navegador levava o que o
 * jogador comprou (L-055), e com conta real a boutique debitava a carteira LOCAL
 * e entregava de graça (D-108). A ST-1.3 fechou a compra com sessão; aqui ela
 * reabre, do lado certo.
 *
 * ── O CATÁLOGO É O MESMO DA VITRINE, E NÃO UMA CÓPIA ─────────────────────
 *
 * `catalogo()` vem do `app/modules/cosmeticos.mjs` (camada 0, puro, sem DOM):
 * o servidor precifica e valida pela MESMA lista que a tela mostra. Duas
 * listas — uma para desenhar, outra para cobrar — divergiriam no dia em que
 * alguém mexesse numa, e a divergência seria cobrar por uma peça que a tela não
 * vende. O preço que o cliente mandar é ignorado por construção: nenhuma função
 * daqui o recebe.
 *
 * ── O QUE ESTE ARQUIVO NÃO FAZ ──────────────────────────────────────────
 *
 * Ele não conhece baldes nem ordem de consumo: pede o plano ao motor
 * (`planoDoGasto`) e o débito à carteira (`gastar`), que é o único ponto de
 * escrita do dinheiro. O que ele acrescenta é a posse, dentro da mesma
 * transação. */
import { catalogo as catalogoDaVitrine } from '../app/modules/cosmeticos.mjs';
import { planoDoGasto } from '../engine/carteira.mjs';
import { gastar, saldos } from './carteira.mjs';
import { anotar } from './telemetria.mjs';

export const ERRO_COSMETICO = {
  DESCONHECIDA: 'peca_desconhecida',
  NAO_A_VENDA:  'nao_a_venda',
  SALDO:        'saldo_insuficiente',
  NAO_POSSUI:   'nao_possui',
  CHAVE:        'chave_invalida',
};

const chave = p => `${p.familia}:${p.id}`;
const acha = (cat, familia, id) => cat.find(p => p.familia === familia && p.id === id) ?? null;

/* O PADRÃO de graça, como no cliente (`posseInicial`) — e o traje junto, que
   no cliente tem acervo próprio (L-157) e aqui entra na mesma lista (ST-4.4).
   Só `padrao`: `fragmento` e `missao` se GANHAM, e dá-los de graça seria o
   defeito latente que o mapa do E4 achou no `posseInicial`. */
const base = cat => cat.filter(p => p.procedencia === 'padrao').map(chave);

export function posseDe(db, userId, cat = catalogoDaVitrine()) {
  const comprados = db.prepare(`SELECT familia, item_id FROM cosmetic_ownership WHERE user_id = ?`)
    .all(userId).map(r => `${r.familia}:${r.item_id}`);
  return [...new Set([...base(cat), ...comprados])];
}

export function equipadosDe(db, userId) {
  return Object.fromEntries(db.prepare(`SELECT familia, item_id FROM cosmetic_equipped WHERE user_id = ?`)
    .all(userId).map(r => [r.familia, r.item_id]));
}

const recusa = (codigo, motivo) => ({ ok: false, codigo, motivo });

/* ── A COMPRA (ST-4.2) ────────────────────────────────────────────────────
 *
 * UMA transação: débito, lançamento e posse — ou nenhum dos três. A chave de
 * idempotência é do CLIENTE (uma por clique), e a posse é a segunda rede:
 * comprar de novo o que já é seu devolve a mesma resposta, sem lançamento. */
export function comprar(db, { userId, familia, id, chaveIdem, agora = Date.now(),
                              catalogo: cat = catalogoDaVitrine() }) {
  const k = String(chaveIdem ?? '');
  if (!k || k.length > 80) return recusa(ERRO_COSMETICO.CHAVE, 'pedido sem chave de repetição');
  const peca = acha(cat, familia, id);
  if (!peca) return recusa(ERRO_COSMETICO.DESCONHECIDA, 'peça desconhecida');
  if (peca.procedencia !== 'loja') return recusa(ERRO_COSMETICO.NAO_A_VENDA, 'esta peça não está à venda');

  const jaTem = d => !!d.prepare(`SELECT 1 FROM cosmetic_ownership
                                  WHERE user_id = ? AND familia = ? AND item_id = ?`).get(userId, familia, id);
  if (jaTem(db)) return { ok: true, repetida: true, peca: chave(peca) };

  const disp = saldos(db, userId);
  const plano = planoDoGasto(disp, peca.preco, 'cosmetico');
  if (!plano.ok) return recusa(ERRO_COSMETICO.SALDO, plano.motivo);

  const r = gastar(db, {
    userId, tipo: 'COSMETIC_PURCHASE', deltas: plano.deltas,
    ref: chave(peca), refTipo: 'cosmetico', idem: `cosm-${userId}-${k}`, agora,
    /* Conferido de novo DENTRO da transação: entre a leitura acima e o
       `BEGIN IMMEDIATE`, outro pedido pode ter comprado a mesma peça. */
    antes: d => (jaTem(d) ? { ok: true, repetida: true } : undefined),
    depois: d => d.prepare(`INSERT INTO cosmetic_ownership (user_id, familia, item_id, origem, adquirido_em)
                            VALUES (?, ?, ?, 'loja', ?)`).run(userId, familia, id, agora),
  });
  if (!r.ok) return recusa(r.motivo === 'saldo_insuficiente' ? ERRO_COSMETICO.SALDO : r.motivo, r.motivo);
  /* O FATO VAI PARA A TELEMETRIA (ST-7.1a), com a chave da própria compra: a
     repetição não gera evento, porque ela não gerou compra. */
  if (!r.repetida) anotar(db, { nome: 'cosmetic_purchased', userId, chave: `cosm-${k}`, agora,
                                campos: { familia, id: String(id), preco: peca.preco } });
  return { ok: true, repetida: !!r.repetida, peca: chave(peca), preco: peca.preco };
}

/* ── EQUIPAR EXIGE POSSE (ST-4.3) ─────────────────────────────────────────
 *
 * `id: null` limpa o slot — o jogador escolheu algo que não é do catálogo (o
 * retrato de uma criatura, por exemplo), e o servidor não tem opinião sobre
 * isso. A roupa de NPC nunca é vestível: não entra na base e não se compra. */
export function equipar(db, { userId, familia, id, catalogo: cat = catalogoDaVitrine() }) {
  if (id === null || id === undefined) {
    db.prepare(`DELETE FROM cosmetic_equipped WHERE user_id = ? AND familia = ?`).run(userId, familia);
    return { ok: true, equipados: equipadosDe(db, userId) };
  }
  const peca = acha(cat, familia, id);
  if (!peca) return recusa(ERRO_COSMETICO.DESCONHECIDA, 'peça desconhecida');
  if (!posseDe(db, userId, cat).includes(chave(peca)))
    return recusa(ERRO_COSMETICO.NAO_POSSUI, 'esta peça ainda não é sua');
  db.prepare(`INSERT INTO cosmetic_equipped (user_id, familia, item_id) VALUES (?, ?, ?)
              ON CONFLICT (user_id, familia) DO UPDATE SET item_id = excluded.item_id`)
    .run(userId, familia, id);
  return { ok: true, equipados: equipadosDe(db, userId) };
}
