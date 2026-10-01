/* Q1/Q2/Q3 · E14 · AS TAXAS, A QUEIMA E OS RECIBOS (ST-14.8)
 *
 * Os exemplos da spec §11 fecham exatamente; a taxa é inteira (BigInt, sem
 * float), tem mínimo de 1 PC uma vez só, queima — não é crédito de ninguém — e
 * a versão da política que a cobrou fica gravada no lançamento.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, reservarP2PNoBanco, reconciliarNoBanco, emTransacao } from '../server/carteira.mjs';
import { cobrarTaxaDeAnuncio, liquidarPontaDaTroca } from '../server/taxas-mercado.mjs';
import { taxa, taxaParcial, previewTrade, previewAnuncio, hashDaPolitica, POLITICA_PILOTO } from '../engine/taxas-mercado.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const a = conta('tx1'), b = conta('tx2');
  for (const u of [a, b]) creditar(db, { userId: u, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 5000, idem: `pc-t:${u}`, agora: AGORA });
  return { db, a, b };
};

export async function suite() {
  const s = criarSuite('e14-taxas');

  s.teste('os exemplos da spec §11 fecham', () => {
    const a1000 = previewAnuncio({ preco: 1000 });
    igual(`${a1000.taxaAnuncio}|${a1000.taxaVenda}|${a1000.recebe}|${a1000.liquido}`, '5|20|980|975', 'anúncio de 1.000');
    const a100 = previewAnuncio({ preco: 100 });
    igual(`${a100.taxaAnuncio}|${a100.taxaVenda}`, '1|2', 'anúncio de 100 (3% efetivos, não 2,5%)');
    const t1 = previewTrade({ valorA: 1000 });
    igual(`${t1.a.reservar}|${t1.a.taxa}|${t1.queima}`, '1010|10|10', 'A envia 1.000: paga 1.010, queima 10');
    const t2 = previewTrade({ valorA: 1000, valorB: 400 });
    igual(`${t2.a.taxa}|${t2.b.taxa}|${t2.queima}`, '10|4|14', 'duas pontas cobradas separadas, sem compensar');
    const t0 = previewTrade({});
    igual(`${t0.ok}|${t0.queima}`, 'true|0', 'criatura por criatura pagou taxa');
  });

  s.teste('os limiares: zero, mínimo de 1, o ceil exato e os mínimos de produto', () => {
    igual([taxa(0, 200), taxa(1, 200), taxa(49, 200), taxa(50, 200), taxa(51, 200), taxa(4999, 200), taxa(5000, 200), taxa(5001, 200)].join(','),
      '0,1,1,1,2,100,100,101', 'a taxa nos limiares de arredondamento');
    /* O mínimo é da FÓRMULA da spec: base positiva paga ao menos 1 PC, mesmo
       numa política de 0 bps — sem ele, uma configuração zerada abriria
       anúncio de graça e sem custo para spam. */
    igual(taxa(100, 0), 1, 'a base positiva com 0 bps saiu sem o mínimo');
    igual(previewAnuncio({ preco: 99 }).ok, false, 'anúncio abaixo do bruto mínimo');
    igual(previewTrade({ valorA: 99 }).ok, false, 'lado monetário abaixo do mínimo');
    for (const ruim of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, '100'])
      ok(recusa(() => taxa(ruim, 200)), `bruto inválido aceito: ${ruim}`);
  });

  s.teste('inteiro máximo seguro: BigInt exato, sem o erro de float', () => {
    /* Um bruto perto do máximo em que o ceil do float erra por 1 PC (achado
       por busca: 2% de 9.007.199.254.740.551). */
    const M = 9_007_199_254_740_551;
    const exato = ((BigInt(M) * 200n + 9999n) / 10000n).toString();
    igual(String(taxa(M, 200)), exato, 'a taxa perto do máximo seguro');
    igual(String(Math.ceil(M * 200 / 10000)) === exato, false, 'o caso não distingue float de BigInt — o teste não mede nada');
    igual(String(taxa(Number.MAX_SAFE_INTEGER, 9999)), ((BigInt(Number.MAX_SAFE_INTEGER) * 9999n + 9999n) / 10000n).toString(), 'a taxa do máximo seguro');
  });

  s.teste('as parcelas somam a taxa do total, com o mínimo cobrado uma vez', () => {
    const fills = [30, 30, 30, 10, 400, 500];
    let acumulado = 0, soma = 0;
    for (const f of fills) { soma += taxaParcial(acumulado, acumulado + f, 200); acumulado += f; }
    igual(`${soma}|${taxa(acumulado, 200)}`, `${taxa(1000, 200)}|20`, 'a soma das parcelas não é a taxa do total');
    igual(fills.map(f => taxa(f, 200)).reduce((a, b) => a + b, 0) > soma, true, 'o mínimo por fill não cobraria a mais — o teste não mede nada');
  });

  s.teste('a política tem versão e impressão digital; a oferta antiga cobra a dela', () => {
    const nova = { ...POLITICA_PILOTO, versao: 'taxas-v2', tradeBps: 300 };
    ok(hashDaPolitica(nova) !== hashDaPolitica(POLITICA_PILOTO), 'políticas diferentes, a mesma impressão');
    igual(previewTrade({ valorA: 1000, politica: POLITICA_PILOTO }).a.taxa, 10, 'a política gravada na oferta');
    igual(previewTrade({ valorA: 1000, politica: nova }).a.taxa, 30, 'a política nova');
    igual(hashDaPolitica({ ...POLITICA_PILOTO }), hashDaPolitica(POLITICA_PILOTO), 'a mesma política, impressões diferentes');
  });

  s.teste('servidor: a taxa do anúncio queima do PC-T, com a versão no lançamento', () => {
    const { db, a } = novo();
    const r = cobrarTaxaDeAnuncio(db, { userId: a, preco: 1000, ref: 'an-1', idem: 'an-1:taxa', agora: AGORA });
    igual(`${r.ok}|${r.taxa}|${saldos(db, a).transferivel}`, 'true|5|4995', 'a taxa do anúncio');
    const l = db.prepare(`SELECT type, amount, memo FROM wallet_ledger WHERE user_id = ? AND type = 'PLAYER_MARKET_LISTING_FEE'`).get(a);
    igual(`${l.amount}|${l.memo}`, `-5|${POLITICA_PILOTO.versao}:${hashDaPolitica()}`, 'o lançamento da taxa');
    igual(cobrarTaxaDeAnuncio(db, { userId: a, preco: 1000, ref: 'an-1', idem: 'an-1:taxa', agora: AGORA }).ok, true, 'o retry da taxa');
    igual(saldos(db, a).transferivel, 4995, 'o retry cobrou de novo');
    igual(reconciliarNoBanco(db, a).length, 0, 'a carteira não reconcilia depois da taxa');
  });

  s.teste('servidor: a ponta da troca queima a taxa do reservado, e ninguém a recebe', () => {
    const { db, a, b } = novo();
    const p = previewTrade({ valorA: 1000 });
    const total = () => saldos(db, a).transferivel + saldos(db, a).reservado_transferivel + saldos(db, b).transferivel + saldos(db, b).reservado_transferivel;
    const antes = total();
    emTransacao(db, () => {
      reservarP2PNoBanco(db, { userId: a, valor: p.a.reservar, ref: 'tr-1', agora: AGORA });
      const r = liquidarPontaDaTroca(db, { de: a, para: b, valor: 1000, ref: 'tr-1', agora: AGORA });
      if (!r.ok) throw new Error(r.motivo);
    });
    igual(`${saldos(db, a).transferivel}|${saldos(db, a).reservado_transferivel}|${saldos(db, b).transferivel}|${antes - total()}`, '3990|0|6000|10', 'a troca de 1.000');
    const fee = db.prepare(`SELECT type, memo FROM wallet_ledger WHERE user_id = ? AND type = 'DIRECT_TRADE_FEE'`).get(a);
    igual(fee?.memo, `${POLITICA_PILOTO.versao}:${hashDaPolitica()}`, 'a taxa da troca sem o tipo ou a versão');
    igual(`${reconciliarNoBanco(db, a).length}|${reconciliarNoBanco(db, b).length}`, '0|0', 'as carteiras não reconciliam depois da troca');
    /* A oferta gravou uma política de 3%: a liquidação cobra a DELA. */
    const nova = { ...POLITICA_PILOTO, versao: 'taxas-v2', tradeBps: 300 };
    emTransacao(db, () => {
      reservarP2PNoBanco(db, { userId: b, valor: 1030, ref: 'tr-2', agora: AGORA });
      const r = liquidarPontaDaTroca(db, { de: b, para: a, valor: 1000, ref: 'tr-2', agora: AGORA, politica: nova });
      if (!r.ok) throw new Error(r.motivo);
    });
    igual(db.prepare(`SELECT memo FROM wallet_ledger WHERE user_id = ? AND type = 'DIRECT_TRADE_FEE'`).get(b)?.memo, `taxas-v2:${hashDaPolitica(nova)}`, 'a liquidação cobrou a política de hoje, e não a da oferta');
    igual(saldos(db, b).reservado_transferivel, 0, 'a taxa de 3% não saiu inteira do reservado');
  });

  s.teste('servidor: sem PC-T elegível não há taxa de anúncio', () => {
    const { db } = novo();
    const pobre = cadastrar(db, { username: 'tx3', email: 'tx3@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    const antes = JSON.stringify(saldos(db, pobre));
    igual(`${cobrarTaxaDeAnuncio(db, { userId: pobre, preco: 1000, ref: 'an-2', idem: 'an-2:taxa', agora: AGORA }).ok}|${JSON.stringify(saldos(db, pobre)) === antes}`, 'false|true', 'cobrou a taxa sem PC-T (do bônus de cadastro?)');
    /* E a conta com concessão LEGADA no PC-T: tem saldo, mas não é elegível
       (ST-14.0B) — a taxa de anúncio também não sai dele. */
    const legado = cadastrar(db, { username: 'tx4', email: 'tx4@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    creditar(db, { userId: legado, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: 'legado', agora: AGORA });
    igual(`${cobrarTaxaDeAnuncio(db, { userId: legado, preco: 1000, ref: 'an-3', idem: 'an-3:taxa', agora: AGORA }).ok}|${saldos(db, legado).transferivel}`, 'false|1000', 'a taxa saiu do PC-T legado');
  });

  return s;
}
