/* O INVENTÁRIO POR LOTE (ST-14.0C · E14 · spec E14 §4.3).
 *
 * Cada crédito na bolsa vira um LOTE — quantidade, classe de origem, fonte —,
 * e a tabela `bolsa` passa a ser a PROJEÇÃO (a soma dos lotes), escrita na
 * mesma chamada: tudo o que já lia a bolsa continua lendo, sem mudar.
 *
 * O débito consome o lote MAIS ANTIGO primeiro (dentro da classe, quando quem
 * chama escolhe uma) e devolve de que classes saiu — é isso que deixa o
 * derivado herdar a origem (`maisRestrita`). A quantidade é sempre inteira e
 * positiva, também nas chamadas internas: um débito negativo seria crédito
 * disfarçado.
 */
import { classeValida } from '../engine/proveniencia.mjs';

const inteiroPositivo = n => Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER;

export function creditarBolsa(db, userId, itemId, quantidade, { classe = 'verified_earned', fonte = null, agora = Date.now() } = {}) {
  if (!inteiroPositivo(quantidade)) throw new Error('crédito tem de ser positivo');
  if (!classeValida(classe)) throw new Error(`classe de origem desconhecida: ${classe}`);
  db.prepare(`INSERT INTO bolsa_lotes (user_id, item_id, quantidade, classe, fonte, criado_em) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, itemId, quantidade, classe, fonte, agora);
  db.prepare(`INSERT INTO bolsa (user_id, item_id, quantidade) VALUES (?,?,?)
              ON CONFLICT (user_id, item_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade`)
    .run(userId, itemId, quantidade);
}

/* O débito, lote a lote. A GUARDA É A SOMA DOS LOTES (a fonte), e ela vem
   antes de mexer em qualquer coisa: sem saldo, nada muda e a resposta é
   `false`. O CHECK da `bolsa` continua como a última defesa (S571). Com saldo,
   `{ classes }` — o que é verdadeiro para quem só pergunta "deu?". */
const LOTES_DO_ITEM = `SELECT id, quantidade, classe FROM bolsa_lotes WHERE user_id = ? AND item_id = ? AND quantidade > 0 ORDER BY criado_em, id`;
const LOTES_DA_CLASSE = `SELECT id, quantidade, classe FROM bolsa_lotes WHERE user_id = ? AND item_id = ? AND quantidade > 0 AND classe = ? ORDER BY criado_em, id`;
export function debitarBolsa(db, userId, itemId, quantidade, { classe = null } = {}) {
  if (!inteiroPositivo(quantidade)) return false;
  const lotes = classe ? db.prepare(LOTES_DA_CLASSE).all(userId, itemId, classe) : db.prepare(LOTES_DO_ITEM).all(userId, itemId);
  if (lotes.reduce((a, l) => a + l.quantidade, 0) < quantidade) return false;
  /* AS DUAS TÊM DE COBRIR. Lote e projeção andam juntos por este serviço, mas
     quem escreve na `bolsa` por fora (a descida de um save, um teste, um
     operador) os separa — e o débito que só olhasse o lote gastaria uma bola
     que a bolsa diz não existir. Foi o que a sabotagem pegou na ST-14.0C: a
     bolsa zerada e o lance sem bola capturando. A projeção vai primeiro, para
     a recusa não deixar lote nenhum mexido. */
  if (!db.prepare(`UPDATE bolsa SET quantidade = quantidade - ? WHERE user_id = ? AND item_id = ? AND quantidade >= ?`)
    .run(quantidade, userId, itemId, quantidade).changes) return false;
  const classes = new Set();
  let falta = quantidade;
  for (const l of lotes) {
    if (!falta) break;
    const usa = Math.min(falta, l.quantidade);
    db.prepare(`UPDATE bolsa_lotes SET quantidade = quantidade - ? WHERE id = ?`).run(usa, l.id);
    classes.add(l.classe); falta -= usa;
  }
  return { classes };
}

const LOTES_DA_CONTA = `SELECT item_id, quantidade, classe, fonte FROM bolsa_lotes WHERE user_id = ? ORDER BY criado_em, id`;
const LOTES_DA_CONTA_ITEM = `SELECT item_id, quantidade, classe, fonte FROM bolsa_lotes WHERE user_id = ? AND item_id = ? ORDER BY criado_em, id`;
export const lotesDe = (db, userId, itemId = null) =>
  itemId ? db.prepare(LOTES_DA_CONTA_ITEM).all(userId, itemId) : db.prepare(LOTES_DA_CONTA).all(userId);

/* O que a tela precisa saber dos lotes: por item, na ORDEM DO DÉBITO (o mais
   antigo primeiro), a classe e o que está livre. Sem fonte nem id — a fonte é
   do servidor e da auditoria. */
const LOTES_LIVRES = `SELECT item_id, classe, quantidade - reservada AS livre FROM bolsa_lotes
                       WHERE user_id = ? AND quantidade - reservada > 0 ORDER BY criado_em, id`;
export function lotesLivres(db, userId) {
  const r = {};
  for (const l of db.prepare(LOTES_LIVRES).all(userId)) (r[l.item_id] ??= []).push({ classe: l.classe, quantidade: l.livre });
  return r;
}

/* A conciliação: a bolsa é a soma dos lotes, item a item. Vazio = fecha. */
export function conferirInventario(db, userId) {
  const soma = new Map(db.prepare(`SELECT item_id, SUM(quantidade) s FROM bolsa_lotes WHERE user_id = ? GROUP BY item_id`).all(userId).map(l => [l.item_id, l.s]));
  const problemas = [];
  for (const b of db.prepare(`SELECT item_id, quantidade FROM bolsa WHERE user_id = ?`).all(userId))
    if ((soma.get(b.item_id) ?? 0) !== b.quantidade) problemas.push(`${b.item_id}: bolsa ${b.quantidade}, lotes ${soma.get(b.item_id) ?? 0}`);
  for (const [item, s] of soma)
    if (s > 0 && !db.prepare(`SELECT 1 FROM bolsa WHERE user_id = ? AND item_id = ?`).get(userId, item)) problemas.push(`${item}: lotes ${s}, bolsa sem linha`);
  return problemas;
}
