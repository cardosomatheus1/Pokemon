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
import { precoForaDaCurva, giroAnomalo, LIMIARES_ALERTA } from '../engine/alerta-mercado.mjs';
import { faixaDoPotencial, precoUnitario } from '../engine/historico-precos.mjs';
import { historicoDaSerie } from './mercado-jogadores-historico.mjs';
import PACK from '../content/escolhido.mjs';

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
  novas += varrerMercado(db, { de, agora });
  return { novas, contas: contas.length };
}

/* ── O MERCADO (ST-14.14d · L-227) ─────────────────────────────────────────
 * PREÇO: cada venda da janela contra a mediana da SUA série nos 7 dias antes
 * dela (`historicoDaSerie`, a mesma régua da tela — com as exclusões e sem as
 * contas sob suspeita). A suspeita é do PAR (quem vendeu, quem comprou).
 * GIRO: vendas + compras + trocas liquidadas da conta na janela, contra as
 * criaturas que ela tem. */
const VENDAS_DA_JANELA = [
  'SELECT f.id, f.tipo, f.dex, f.item_id, f.shiny, f.preco, f.quantidade, f.vendedor_id, f.comprador_id, f.em, l.potencial',
  'FROM player_market_fills f JOIN player_market_listings l ON l.id = f.listing_id',
  'WHERE f.em > ? AND f.id NOT IN (SELECT fill_id FROM player_market_fills_exclusoes)',
].join(' ');
const OPERACOES = [
  'SELECT u, COUNT(*) AS n FROM (',
  'SELECT vendedor_id AS u FROM player_market_fills WHERE em > ?',
  'UNION ALL SELECT comprador_id FROM player_market_fills WHERE em > ?',
  "UNION ALL SELECT criador_id FROM trocas WHERE estado = 'SETTLED' AND encerrada_em > ?",
  "UNION ALL SELECT contraparte_id FROM trocas WHERE estado = 'SETTLED' AND encerrada_em > ?",
  ') GROUP BY u',
].join(' ');

function varrerMercado(db, { de, agora }) {
  let novas = 0;
  for (const f of db.prepare(VENDAS_DA_JANELA).all(de)) {
    const faixa = f.tipo === 'criatura' ? faixaDoPotencial(f.potencial) : null;
    if (f.tipo === 'criatura' && faixa == null) continue;
    const serie = f.tipo === 'item' ? { tipo: 'item', itemId: f.item_id } : { tipo: 'criatura', dex: f.dex, shiny: !!f.shiny, faixa };
    const h = historicoDaSerie(db, { pack: PACK, serie, agora: f.em - 1 });
    const fora = precoForaDaCurva({ unitario: precoUnitario(f), mediana: h.mediana7d });
    if (fora && registrar(db, { a: f.vendedor_id, b: f.comprador_id, sinal: 'preco',
                                medida: { venda: f.id, unitario: precoUnitario(f), mediana: h.mediana7d, razao: fora.razao, serie, fator: LIMIARES_ALERTA.fator }, agora })) novas++;
  }
  const tamanho = u => db.prepare(`SELECT COUNT(*) AS n FROM criaturas WHERE user_id = ?`).get(u).n;
  for (const o of db.prepare(OPERACOES).all(de, de, de, de)) {
    const g = giroAnomalo({ operacoes: o.n, tamanho: tamanho(o.u) });
    if (g && registrar(db, { a: o.u, sinal: 'giro', medida: { ...g, dias: Math.round((agora - de) / DIA) }, agora })) novas++;
  }
  return novas;
}

export const suspeitasAbertas = db =>
  db.prepare(`SELECT * FROM suspeitas_antifraude WHERE revisada_em IS NULL ORDER BY criada_em, conta_a`).all();
