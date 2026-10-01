/* A ANTIFRAUDE NO SERVIDOR — a varredura e o registro (ST-13.6 · §7.19 · L-050).
 *
 * Lê o que o banco JÁ guarda — os instantes em que cada conta iniciou
 * expedição, começou run e jogou bola, e as capturas — e registra suspeita
 * com o número que a sustenta. NUNCA pune e NUNCA liga contas sozinha: quem
 * decide é o operador (`ligarContas`), e a suspeita fica aberta até ele olhar.
 *
 * Uma suspeita por par e por sinal (a chave única): varrer de novo atualiza o
 * número, e não empilha. O par que o operador já ligou não é acusado — ele já
 * é uma pessoa para a Liga e para a proteção.
 */
import { suspeitas, capturaNaBanda, DETECTOR } from '../engine/antifraude.mjs';
import { contasLigadas } from './protecao.mjs';
import { paresComMesmoSinal } from '../engine/sinais.mjs';
import { apagarVencidos, todosOsSinais } from './sinais.mjs';

const DIA = 86400e3;

function temposPorConta(db, de) {
  const linhas = db.prepare(`
    SELECT user_id AS u, iniciada_em AS t FROM expedicoes WHERE iniciada_em > ?
    UNION ALL SELECT user_id, iniciada_em FROM runs WHERE iniciada_em > ?
    UNION ALL SELECT user_id, resolvido_em FROM encontros_pendentes WHERE resolvido_em > ?`).all(de, de, de);
  const por = new Map();
  for (const l of linhas) { if (!por.has(l.u)) por.set(l.u, []); por.get(l.u).push(l.t); }
  return [...por].map(([user, tempos]) => ({ user, tempos }));
}

function registrar(db, { a, b = '', sinal, medida, agora }) {
  const [x, y] = b ? [a, b].sort() : [a, ''];
  const r = db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, conta_b, sinal, medida_json, criada_em)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (conta_a, conta_b, sinal) DO UPDATE SET medida_json = excluded.medida_json`)
    .run(x, y, sinal, JSON.stringify(medida), agora);
  return r.changes && !db.prepare(`SELECT 1 FROM suspeitas_antifraude WHERE conta_a = ? AND conta_b = ? AND sinal = ? AND criada_em < ?`).get(x, y, sinal, agora);
}

export function varrerSuspeitas(db, { agora, dias = 7 }) {
  const de = agora - dias * DIA;
  let novas = 0;
  const contas = temposPorConta(db, de);
  for (const s of suspeitas(contas, DETECTOR)) {
    if (contasLigadas(db, s.a).includes(s.b)) continue;
    if (registrar(db, { a: s.a, b: s.b, sinal: 'horario', medida: { coincidem: s.coincidem, fracao: s.fracao, janelaMs: DETECTOR.janelaMs }, agora })) novas++;
  }
  /* A CAPTURA ACIMA DA BANDA, por jogador-dia ativo. Com o sorteio no
     servidor e o teto de encontros, acima da banda é defeito ou fraude. */
  for (const { user, tempos } of contas) {
    const diasAtivos = new Set(tempos.map(t => Math.floor(t / DIA))).size;
    /* ST-14.14: pelo EVENTO imutável — quem capturou, quando —, e não por
       `criaturas.user_id` de hoje: soltar não apaga a captura, e comprar ou
       receber numa troca não é capturar. */
    const capturas = db.prepare(`SELECT COUNT(*) AS n FROM criaturas_historico WHERE evento = 'nasceu' AND detalhe = 'captura' AND user_id = ? AND em > ?`).get(user, de).n;
    const b = capturaNaBanda({ capturas, dias: Math.max(1, diasAtivos) });
    if (b.acima && registrar(db, { a: user, sinal: 'captura', medida: { ...b, capturas, dias: diasAtivos }, agora })) novas++;
  }
  /* O APARELHO E A REDE (ST-13.8 · DEC-19): contas com a mesma assinatura nos
     últimos 30 dias. Antes, o que venceu sai — a retenção é a do dono. */
  apagarVencidos(db, agora);
  for (const p of paresComMesmoSinal(todosOsSinais(db), agora)) {
    if (contasLigadas(db, p.a).includes(p.b)) continue;
    if (registrar(db, { a: p.a, b: p.b, sinal: p.classe, medida: { classe: p.classe, retencaoDias: 30 }, agora })) novas++;
  }
  return { novas, contas: contas.length };
}

export const suspeitasAbertas = db =>
  db.prepare(`SELECT * FROM suspeitas_antifraude WHERE revisada_em IS NULL ORDER BY criada_em, conta_a`).all();
