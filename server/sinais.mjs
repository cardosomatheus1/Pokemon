/* OS SINAIS DE APARELHO E REDE NO SERVIDOR (ST-13.8 · L-050 · DEC-19).
 *
 * A cada pedido autenticado, grava — por conta e por classe — a ASSINATURA do
 * número do aparelho (cabeçalho `x-aparelho`) e a do IP: HMAC-SHA256 com o
 * segredo do servidor, com um rótulo por classe. O valor em claro nunca chega
 * ao banco, e sem o segredo a tabela não se liga a pessoa nenhuma.
 *
 *   A ESCRITA É RALA   a mesma conta e o mesmo sinal regravam no máximo a cada
 *                      10 min — o pedido não paga uma escrita cada vez
 *   O VENCIDO SAI      o que passou de 30 dias é apagado aqui e na varredura
 *   NUNCA QUEBRA       sinal é acessório: um erro aqui não derruba o pedido
 *
 * Quem transforma assinatura repetida em suspeita é `server/antifraude.mjs`,
 * e quem decide é o operador.
 */
import { createHmac } from 'node:crypto';
import { aparelhoValido, ipNormalizado, RETENCAO_DIAS } from '../engine/sinais.mjs';

const DIA = 86400e3, RALO = 10 * 60e3;

const assinar = (segredo, classe, valor) => createHmac('sha256', segredo).update(`sinais:${classe}:${valor}`).digest('hex');

export function registrarSinais(db, { userId, req, segredo, agora }) {
  if (!userId || !segredo) return;
  const aparelho = req?.headers?.['x-aparelho'], ip = ipNormalizado(req?.socket?.remoteAddress);
  const sinais = [
    ...(aparelhoValido(aparelho) ? [['aparelho', aparelho]] : []),
    ...(ip ? [['rede', ip]] : []),
  ];
  const visto = db.prepare(`SELECT visto_em FROM sinais_conta WHERE user_id = ? AND classe = ? AND assinatura = ?`);
  const grava = db.prepare(`INSERT INTO sinais_conta (user_id, classe, assinatura, visto_em) VALUES (?, ?, ?, ?)
                            ON CONFLICT (user_id, classe, assinatura) DO UPDATE SET visto_em = excluded.visto_em`);
  for (const [classe, valor] of sinais) {
    const assinatura = assinar(segredo, classe, valor), antes = visto.get(userId, classe, assinatura)?.visto_em;
    if (antes === undefined || agora - antes >= RALO) grava.run(userId, classe, assinatura, agora);
  }
  apagarVencidos(db, agora);
}

/* Apaga o que venceu — e só escreve quando HÁ o que apagar: o relatório do
   piloto abre o banco só para leitura e varre, e a varredura não pode quebrar
   num banco sem nada vencido. */
export function apagarVencidos(db, agora) {
  const limite = agora - RETENCAO_DIAS * DIA;
  if (!db.prepare(`SELECT 1 FROM sinais_conta WHERE visto_em < ? LIMIT 1`).get(limite)) return;
  db.prepare(`DELETE FROM sinais_conta WHERE visto_em < ?`).run(limite);
}

export const sinaisDe = (db, userId) => db.prepare(`SELECT classe, assinatura, visto_em FROM sinais_conta WHERE user_id = ? ORDER BY classe`).all(userId);

export const todosOsSinais = db => db.prepare(`SELECT user_id AS user, classe, assinatura, visto_em AS visto FROM sinais_conta`).all();
