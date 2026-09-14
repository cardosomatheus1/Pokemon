/* Q1/Q6/Q9 · AS SÉRIES DE POLÍTICA MONETÁRIA (R20 — P1.1, fecha o F1.11)
 *
 * O `painelEconomico` (F1.11) já entregava faucets, sinks, circulação,
 * divergência e passivo. O §10.9 pede nove séries além dessas, e são elas que
 * este arquivo cobra.
 *
 * ── A REGRA QUE ORGANIZA TODOS OS TESTES DAQUI ─────────────────────────────
 *
 * Tudo sai do LEDGER. Inclusive a distribuição — percentis, Gini, share do
 * topo —, que seria muito mais barata de ler da tabela `carteiras`.
 *
 * A razão é a mesma que fez o painel original recalcular a circulação: o cache
 * pode estar errado, e o painel existe para descobrir isso. Um Gini bonito
 * calculado sobre saldos adulterados é pior que Gini nenhum — ele CERTIFICA a
 * adulteração. O teste `a distribuição ignora o cache adulterado` é o que prova
 * que a regra vale, e é o teste mais importante deste arquivo.
 *
 * ── O QUE ESTE ARQUIVO DELIBERADAMENTE NÃO TESTA ───────────────────────────
 *
 * League rake, P2P fee e Exchange. As três séries restantes do §10.9 não têm
 * tabela na V1 — esses mercados chegam na V2. Testar o zero que elas devolvem
 * hoje seria congelar a ausência como se fosse medida.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, reservarNoBanco } from '../server/carteira.mjs';
import { politicaMonetaria, STAKE_BRONZE } from '../server/politica.mjs';

const DIA = 86_400_000;
const AGORA = Date.parse('2026-03-02T12:00:00Z');
const perto = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

const spec = () => readFileSync(
  new URL('../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md', import.meta.url), 'utf8');

function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  return { db, n: 0 };
}
function jogador(c, nome) {
  return cadastrar(c.db, { username: nome, email: `${nome}@exemplo.test`,
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA });
}
/* Dinheiro na mão de alguém, pelo caminho de verdade — o ledger. */
function dar(c, u, valor, { bucket = 'transferivel', tipo = 'WELCOME_GRANT', quando = AGORA } = {}) {
  creditar(c.db, { userId: u.id, tipo, bucket, valor, idem: `i${c.n++}`, agora: quando });
}
/* Atividade, que é o que DAU e WAU contam. */
function ativo(c, u, quando) {
  c.db.prepare(`INSERT INTO player_activity (id, user_id, tipo, valor, criado_em)
                VALUES (?, ?, 'rodada', 1, ?)`).run(`a${c.n++}`, u.id, quando);
}
/* Uma aposta já liquidada, pelo mesmo caminho que `test/protecao.mjs` usa. */
function aposta(c, u, { stake, payout, status = 'perdida', quando = AGORA }) {
  const id = `r${c.n++}`;
  c.db.prepare(
    `INSERT INTO rounds (id, status, round_seed_commit, engine_version, content_version,
                         betting_opens_at, betting_locks_at, environment)
     VALUES (?, 'encerrada', 'x', 'v', 'v', ?, ?, 'teste')`).run(id, quando, quando + 30_000);
  c.db.prepare(
    `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd,
                       status, payout, created_at, settled_at)
     VALUES (?, ?, ?, 0, 1, ?, 2.0, ?, ?, ?, ?)`)
    .run(`b${c.n++}`, u.id, id, stake, status, payout, quando,
         /* `settled_at` só existe para aposta LIQUIDADA — é ele que separa "a
            casa já ficou com isto" de "isto ainda pode virar prêmio". A
            primeira versão deste ajudante carimbava a data em todas, inclusive
            na aberta, e o teste do edge acusou 1000 onde o certo era 200. O
            código estava certo; a fixture é que descrevia um estado que o
            banco nunca produz. */
         status === 'aberta' ? null : quando);
}

export function suite() {
  const s = criarSuite('politica');

  /* ── O STAKE BRONZE SAI DO DOCUMENTO ───────────────────────────────────*/

  /* O §10.9 mede duas séries EM STAKES BRONZE: o overhang e a fatia abaixo de
     1 e 5 stakes. Se a constante aqui divergir da tabela da Spec, as duas séries
     ficam erradas em silêncio — o número continua saindo, medindo outra coisa.
     Por isso ela é conferida contra o documento, e não contra a minha memória. */
  s.teste('o stake Bronze é o da tabela da Spec, e não um número meu', () => {
    const linha = spec().split('\n').find(l => /^\|\s*Bronze\s*\|/.test(l));
    ok(linha, 'a linha do tier Bronze sumiu da Spec — a constante perdeu a fonte');
    const valor = Number(linha.split('|')[2].replace(/[^\d]/g, ''));
    igual(STAKE_BRONZE, valor,
      `STAKE_BRONZE é ${STAKE_BRONZE} e a Spec diz ${valor}. As duas séries ` +
      `medidas em stakes Bronze estariam erradas sem avisar.`);
  });

  /* ── DAU E WAU ─────────────────────────────────────────────────────────*/

  /* A SABOTAGEM ÓBVIA É CONTAR LINHAS. Um jogador que joga vinte rodadas vira
     vinte "usuários ativos", o denominador infla, e M/DAU parece saudável
     justamente quando a base encolheu. */
  s.teste('DAU conta usuários distintos, e não lançamentos', () => {
    const c = cenario(); const u = jogador(c, 'ana');
    for (let i = 0; i < 20; i++) ativo(c, u, AGORA - i * 60_000);
    igual(politicaMonetaria(c.db, { agora: AGORA }).dau, 1,
      'vinte atividades de UMA pessoa viraram mais de um usuário ativo');
  });

  s.teste('DAU é de 24 h e WAU é de 7 dias', () => {
    const c = cenario();
    const a = jogador(c, 'ana'), b = jogador(c, 'bia'), d = jogador(c, 'dan');
    ativo(c, a, AGORA - 2 * 3_600_000);      // hoje
    ativo(c, b, AGORA - 3 * DIA);            // esta semana, não hoje
    ativo(c, d, AGORA - 30 * DIA);           // fora das duas janelas
    const p = politicaMonetaria(c.db, { agora: AGORA });
    igual(p.dau, 1, 'o DAU pegou gente de fora das 24 h');
    igual(p.wau, 2, 'o WAU não é de 7 dias');
    ok(p.wau >= p.dau, 'WAU menor que DAU é impossível');
  });

  /* ── A JANELA ──────────────────────────────────────────────────────────*/

  /* `>` no lugar de `>=` perde o primeiro lançamento de cada janela. É o tipo
     de erro que some no ruído: some 1 de N linhas, e ninguém confere. */
  /* A ASSERÇÃO PRECISA CAIR NA CONSULTA CERTA, e a primeira versão não caía: ela
     conferia `emCirculacao`, que vem do `painelEconomico` e usa `created_at <=
     ate` sem borda inferior. A janela com `desde` é a do FLUXO por balde — e a
     sabotagem S373 passou ilesa até este teste apontar para ela. */
  s.teste('a janela inclui as duas pontas', () => {
    const c = cenario(); const u = jogador(c, 'ana');
    dar(c, u, 500, { quando: AGORA });
    const p = politicaMonetaria(c.db, { desde: AGORA, ate: AGORA, agora: AGORA });
    igual(p.fluxo.transferivel.entrou, 500,
      'o lançamento exatamente na borda de baixo da janela foi descartado');
  });

  /* ── FSR ───────────────────────────────────────────────────────────────*/

  /* FSR = faucets/sinks. Invertido, o número continua plausível — e diz o
     contrário: "a economia está drenando" quando ela está inflando. */
  s.teste('FSR é faucets sobre sinks, nesta ordem', () => {
    const c = cenario(); const u = jogador(c, 'ana');
    dar(c, u, 1000);
    reservarNoBanco(c.db, { userId: u.id, valor: 250, ref: 'r1', agora: AGORA });
    const p = politicaMonetaria(c.db, { agora: AGORA });
    ok(perto(p.fsr.transferivel, 1000 / 250),
      `FSR deu ${p.fsr.transferivel}, esperado 4 (1000 entrou, 250 saiu). ` +
      `Se deu 0,25, a razão está invertida.`);
  });

  s.teste('FSR sem sink nenhum é null, e não infinito', () => {
    const c = cenario(); const u = jogador(c, 'ana');
    dar(c, u, 1000);
    igual(politicaMonetaria(c.db, { agora: AGORA }).fsr.transferivel, null,
      'sem sink o FSR virou número — o painel desenharia uma barra infinita');
  });

  /* ── O EDGE REALIZADO, que é o gráfico de favorecimento ────────────────*/

  /* A conta é (apostado − pago) / apostado, e SÓ sobre apostas liquidadas.
     Somar as abertas conta o dinheiro que ainda pode virar prêmio como se já
     fosse lucro da casa: a margem aparente sobe e ninguém desconfia. */
  s.teste('o edge realizado só conta aposta liquidada', () => {
    const c = cenario(); const u = jogador(c, 'ana');
    dar(c, u, 100_000);
    aposta(c, u, { stake: 100, payout: 0,   status: 'perdida' });
    aposta(c, u, { stake: 100, payout: 180, status: 'ganha'   });
    /* Uma aposta AINDA ABERTA, de valor grande, para a sabotagem aparecer. */
    aposta(c, u, { stake: 800, payout: null, status: 'aberta' });

    const p = politicaMonetaria(c.db, { agora: AGORA });
    igual(p.arena.volume, 200,
      `o volume deu ${p.arena.volume}; a aposta aberta de 800 entrou na conta`);
    igual(p.arena.pago, 180, 'o pago não bate');
    ok(perto(p.arena.edgeRealizado, (200 - 180) / 200),
      `edge deu ${p.arena.edgeRealizado}, esperado 0,10`);
  });

  s.teste('sem aposta liquidada o edge é null, e não zero', () => {
    const c = cenario();
    igual(politicaMonetaria(c.db, { agora: AGORA }).arena.edgeRealizado, null,
      'zero diria "a casa não ficou com nada"; o fato é que não houve rodada');
  });

  /* ── DISTRIBUIÇÃO ──────────────────────────────────────────────────────*/

  s.teste('percentis, Gini e topo saem do saldo de cada jogador', () => {
    const c = cenario();
    /* Cinco carteiras: 10, 20, 30, 40, 50 — mediana 30, e a maior é 50/150. */
    [10, 20, 30, 40, 50].forEach((v, i) => dar(c, jogador(c, `p${i}`), v));
    const d = politicaMonetaria(c.db, { agora: AGORA }).distribuicao;
    igual(d.p50, 30, 'a mediana não bate');
    igual(d.p10, 10, 'o p10 não bate');
    igual(d.p90, 50, 'o p90 não bate');
    ok(perto(d.topo10, 50 / 150), `top 10% deu ${d.topo10}, esperado 1/3`);
    ok(d.gini > 0, 'cinco saldos diferentes e o Gini deu zero');
  });

  /* O TESTE MAIS IMPORTANTE DESTE ARQUIVO. Mesma prova que o painel original
     usa para a circulação, aplicada à distribuição: adulterar o CACHE e exigir
     que o número não se mexa. Um Gini lido de `carteiras` certificaria a
     adulteração com aparência de rigor. */
  s.teste('a distribuição ignora o cache adulterado', () => {
    const c = cenario();
    const alvo = jogador(c, 'ana');
    dar(c, alvo, 10);
    [20, 30].forEach((v, i) => dar(c, jogador(c, `p${i}`), v));
    const antes = politicaMonetaria(c.db, { agora: AGORA }).distribuicao;

    c.db.prepare(`UPDATE carteiras SET saldo = 9_999_999
                   WHERE user_id = ? AND bucket = 'transferivel'`).run(alvo.id);
    const depois = politicaMonetaria(c.db, { agora: AGORA }).distribuicao;

    igual(depois.p50, antes.p50, 'a mediana seguiu o cache adulterado');
    ok(perto(depois.gini, antes.gini),
      'o Gini seguiu o cache adulterado — a distribuição não lê o ledger');
  });

  /* % abaixo de 1 e de 5 stakes Bronze. Com stake 50: abaixo de 50 e de 250. */
  s.teste('a fatia abaixo de 1 e 5 stakes Bronze bate com a conta', () => {
    const c = cenario();
    /* 4 carteiras: 10 e 40 estão abaixo de 1 stake; 10, 40 e 200 abaixo de 5. */
    [10, 40, 200, 900].forEach((v, i) => dar(c, jogador(c, `p${i}`), v));
    const d = politicaMonetaria(c.db, { agora: AGORA }).distribuicao;
    ok(perto(d.abaixoDe1Stake, 2 / 4), `abaixo de 1 stake deu ${d.abaixoDe1Stake}`);
    ok(perto(d.abaixoDe5Stakes, 3 / 4), `abaixo de 5 stakes deu ${d.abaixoDe5Stakes}`);
  });

  s.teste('o overhang é a mediana em stakes Bronze', () => {
    const c = cenario();
    [100, 150, 200].forEach((v, i) => dar(c, jogador(c, `p${i}`), v));
    const p = politicaMonetaria(c.db, { agora: AGORA });
    ok(perto(p.distribuicao.overhang, 150 / STAKE_BRONZE),
      `overhang deu ${p.distribuicao.overhang}, esperado mediana 150 / 50 = 3`);
  });

  /* ── MOEDA POR USUÁRIO ATIVO ───────────────────────────────────────────*/

  s.teste('M por DAU divide circulação por gente, não por lançamento', () => {
    const c = cenario();
    const a = jogador(c, 'ana'), b = jogador(c, 'bia');
    dar(c, a, 300); dar(c, a, 300);   // dois lançamentos, uma pessoa
    dar(c, b, 400);
    ativo(c, a, AGORA); ativo(c, b, AGORA);
    const p = politicaMonetaria(c.db, { agora: AGORA });
    igual(p.dau, 2, 'o DAU não conta pessoas');
    ok(perto(p.porDau.transferivel, 1000 / 2),
      `M_T/DAU deu ${p.porDau.transferivel}, esperado 500`);
  });

  s.teste('sem ninguém ativo, M por DAU é null e não uma divisão por zero', () => {
    const c = cenario();
    dar(c, jogador(c, 'ana'), 500);
    igual(politicaMonetaria(c.db, { agora: AGORA }).porDau.transferivel, null,
      'dividiu por zero e chamou o resultado de métrica');
  });

  /* ── O QUE FICA DE FORA, E ISSO É CONTRATO ─────────────────────────────*/

  /* Se alguém acrescentar League/P2P/Exchange devolvendo zero, este teste cai.
     Zero num painel de auditoria não é "ainda não aconteceu": é "medi e deu
     nada", e as duas coisas se leem igual na tela. */
  s.teste('as três séries sem fonte na V1 NÃO são inventadas', () => {
    const p = politicaMonetaria(cenario().db, { agora: AGORA });
    for (const ausente of ['league', 'p2p', 'exchange'])
      ok(!(ausente in p),
        `\`${ausente}\` apareceu no painel. Esses mercados só existem na V2 — ` +
        `um mostrador alimentado por tabela inexistente ensina o operador a ` +
        `confiar num número que não mede nada.`);
  });

  return s;
}
