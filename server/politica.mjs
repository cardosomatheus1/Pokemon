/* POLÍTICA MONETÁRIA — as séries do §10.9 que faltavam (R20, fecha o F1.11).
 *
 * ── O QUE JÁ EXISTIA, E POR QUE ISTO É UM ARQUIVO NOVO ─────────────────────
 *
 * `painelEconomico` (F1.11) entrega faucets, sinks, circulação, divergência e
 * passivo. Está certo e não foi tocado. Este arquivo acrescenta as nove séries
 * restantes que TÊM FONTE no banco, e reexporta o que aquele já dava, para que
 * a tela tenha um objeto só de onde ler.
 *
 * ── A REGRA, E ELA VALE PARA TUDO AQUI: SAI DO LEDGER ──────────────────────
 *
 * Inclusive a distribuição. Percentis e Gini seriam muito mais baratos lidos da
 * tabela `carteiras`, que já guarda o saldo pronto — e é exatamente por isso
 * que não são.
 *
 * O painel existe para descobrir que o cache está errado. Um Gini bonito
 * calculado sobre saldos adulterados não é apenas inútil: ele CERTIFICA a
 * adulteração, com aparência de rigor estatístico. A única consulta a
 * `carteiras` no sistema continua sendo a que COMPARA cache e ledger, e ela
 * mora no `painelEconomico`.
 *
 * ── AS TRÊS SÉRIES QUE NÃO ESTÃO AQUI, E ISSO É DECISÃO ────────────────────
 *
 * O §10.9 pede também League volume/rake, P2P volume/fee e Exchange
 * requested/paid/pending. Esses mercados chegam na V2 — não há tabela, não há
 * linha, não há o que somar.
 *
 * Devolvê-las como zero seria pior que omiti-las. Num painel de auditoria,
 * `0` significa "medi e deu nada"; a ausência de dado significa "não medi". Na
 * tela as duas se leem igual, e a primeira é uma afirmação sobre a economia que
 * ninguém verificou. Quando os mercados existirem, as séries entram — com o
 * bloco delas, e com a sabotagem delas.
 */
import { BUCKETS } from './banco.mjs';
import { painelEconomico } from './admin.mjs';
import { percentil, gini, shareDoTopo, razao } from '../engine/distribuicao.mjs';

const DIA = 86_400_000;

/* O STAKE BRONZE SAI DA SPEC (tabela de tiers da Liga), e não da minha memória.
   Duas séries do §10.9 são medidas NELE — o overhang e a fatia abaixo de 1 e 5
   stakes. Um número errado aqui não quebra nada: só faz as duas medirem outra
   coisa, calmamente. `test/politica.mjs` confere contra o documento. */
export const STAKE_BRONZE = 50;

/* Os baldes do banco são o PC-T, PC-B e PC-C do documento. O `pendente` não é
   moeda do jogador — é dinheiro reservado em aposta aberta —, então fica fora
   das séries POR JOGADOR e continua aparecendo na circulação. */
const JOGAVEIS = ['transferivel', 'bonus', 'competitivo'];

export function politicaMonetaria(db, {
  desde = 0, ate = Number.MAX_SAFE_INTEGER, agora = Date.now(),
} = {}) {
  const base = painelEconomico(db, { desde, ate });

  /* ── DAU E WAU: PESSOAS, NÃO LINHAS ─────────────────────────────────────
     `COUNT(*)` aqui é a sabotagem mais barata do arquivo: um jogador que jogou
     vinte rodadas viraria vinte usuários ativos, o denominador infla, e M/DAU
     pareceria saudável justamente quando a base encolheu. */
  const ativos = janela => db.prepare(
    `SELECT COUNT(DISTINCT user_id) AS n FROM player_activity
      WHERE criado_em >= ? AND criado_em <= ?`).get(agora - janela, agora).n;
  const dau = ativos(DIA), wau = ativos(7 * DIA);

  /* ── MOEDA POR USUÁRIO ATIVO ────────────────────────────────────────────*/
  const porDau = {}, porWau = {};
  for (const b of JOGAVEIS) {
    porDau[b] = razao(base.emCirculacao[b] ?? 0, dau);
    porWau[b] = razao(base.emCirculacao[b] ?? 0, wau);
  }

  /* ── FSR: FAUCETS SOBRE SINKS, NESTA ORDEM ──────────────────────────────
     Invertido, o número continua plausível e diz o contrário: "drenando"
     quando está inflando. Por balde, porque a política de cada um é diferente
     — bônus nasce para ser gasto, transferível não. */
  const porBalde = db.prepare(
    `SELECT bucket,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS entrou,
            SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS saiu
       FROM wallet_ledger WHERE created_at >= ? AND created_at <= ?
      GROUP BY bucket`).all(desde, ate);

  const fsr = {}, fluxo = {};
  for (const b of BUCKETS) fluxo[b] = { entrou: 0, saiu: 0 };
  for (const r of porBalde) fluxo[r.bucket] = { entrou: r.entrou, saiu: r.saiu };
  for (const b of BUCKETS) fsr[b] = razao(fluxo[b].entrou, fluxo[b].saiu);

  /* ── VELOCIDADE: volume gasto sobre circulação MÉDIA da janela ───────────
     A média entre as duas pontas, e não o saldo final. Usar só o final faria a
     velocidade despencar em toda janela que termina logo depois de um faucet
     grande — o denominador salta e o número mente sobre a atividade. */
  const circulacaoEm = quando => {
    const m = {};
    for (const b of BUCKETS) m[b] = 0;
    for (const r of db.prepare(
      `SELECT bucket, COALESCE(SUM(amount), 0) AS s FROM wallet_ledger
        WHERE created_at <= ? GROUP BY bucket`).all(quando)) m[r.bucket] = r.s;
    return m;
  };
  const inicio = circulacaoEm(desde), fim = base.emCirculacao;
  const velocidade = {};
  for (const b of JOGAVEIS)
    velocidade[b] = razao(fluxo[b].saiu, ((inicio[b] ?? 0) + (fim[b] ?? 0)) / 2);

  /* ── ARENA: VOLUME E EDGE REALIZADO ─────────────────────────────────────
     SÓ APOSTA LIQUIDADA. Somar as abertas conta como lucro da casa o dinheiro
     que ainda pode virar prêmio: a margem aparente sobe e ninguém desconfia.
     `settled_at IS NOT NULL` é a condição honesta — `status <> 'aberta'`
     dependeria de a lista de status nunca ganhar um valor novo. */
  const a = db.prepare(
    `SELECT COALESCE(SUM(stake), 0) AS volume,
            COALESCE(SUM(COALESCE(payout, 0)), 0) AS pago,
            COUNT(*) AS n
       FROM bets
      WHERE settled_at IS NOT NULL AND settled_at >= ? AND settled_at <= ?`)
    .get(desde, ate);

  const arena = {
    volume: a.volume, pago: a.pago, liquidadas: a.n,
    /* Sem rodada liquidada o edge é AUSENTE, não zero: zero diria "a casa não
       ficou com nada", e o fato é que não houve rodada. */
    edgeRealizado: a.n === 0 ? null : razao(a.volume - a.pago, a.volume),
  };

  /* ── DISTRIBUIÇÃO: A PARTE QUE MAIS TENTA LER O CACHE ────────────────────
     Saldo jogável de cada jogador, somado do ledger. O `pendente` fica fora:
     dinheiro presa em aposta aberta não é poder de compra, e incluí-lo faria a
     desigualdade oscilar com o volume de apostas em vez de com a riqueza. */
  const saldos = db.prepare(
    `SELECT user_id, COALESCE(SUM(amount), 0) AS saldo
       FROM wallet_ledger
      WHERE created_at <= ? AND bucket IN ('transferivel', 'bonus', 'competitivo')
      GROUP BY user_id`).all(ate).map(r => r.saldo);

  const mediana = percentil(saldos, 0.50);
  const abaixoDe = quantos => saldos.length
    ? saldos.filter(v => v < quantos * STAKE_BRONZE).length / saldos.length : null;

  const distribuicao = {
    carteiras: saldos.length,
    p10: percentil(saldos, 0.10),
    p50: mediana,
    p90: percentil(saldos, 0.90),
    gini: gini(saldos),
    topo1: shareDoTopo(saldos, 0.01),
    topo10: shareDoTopo(saldos, 0.10),
    abaixoDe1Stake: abaixoDe(1),
    abaixoDe5Stakes: abaixoDe(5),
    /* Monetary Overhang Index — saldo mediano jogável em stakes Bronze. O
       §10.9 o pede enquanto não houver mercado aberto, que é exatamente o
       nosso caso até a V2. */
    overhang: mediana === null ? null : mediana / STAKE_BRONZE,
  };

  return { ...base, dau, wau, porDau, porWau, fsr, fluxo, velocidade, arena,
           distribuicao, stakeBronze: STAKE_BRONZE };
}
