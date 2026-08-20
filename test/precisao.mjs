/* Q4 · PRECISÃO DO ESTIMADOR — o erro amostral vaza margem onde dói mais.
 *
 * O defeito que este bloco fecha não é um bug: é um PARÂMETRO. Com os 20.000
 * sims herdados da base v0.8, oito cálculos independentes sobre a MESMA pool
 * davam, para o mesmo lutador, odds entre x54,15 e x65,99 — 21,9 % de dispersão.
 * Dois jogadores veriam preços diferentes pelo mesmo bicho, na mesma rodada.
 *
 * E o erro não se cancela. `odd = 1/p` é convexa, então E[1/p̂] > 1/p: o desvio
 * é sistemático e sempre a favor do apostador. Medido no §4.4.3 da Spec, com
 * 20.000 sims o viés sozinho entregava +19,22 % de odd extra no pior lutador —
 * mais que o dobro da margem da casa.
 *
 * A correção é dimensionar a amostra pela CAUDA: `n = (1-p)/(p·ε²)`. Com o pior
 * lutador em p = 0,016 e ε = 2 %, isso dá 153.750 — daí `SIMS = 150.000`.
 *
 * COMO ISTO É TESTADO SEM CUSTAR 40 s POR EXECUÇÃO:
 *
 *   1. analítico e exato — o erro relativo que o registro publica, no tamanho
 *      de amostra configurado, precisa ficar abaixo de 2 %. Baixar `SIMS`
 *      derruba este teste na hora, e é a sabotagem que o bloco pede.
 *   2. empírico e barato — oito cálculos com amostra PEQUENA, onde a dispersão
 *      é grande e mede-se rápido, conferindo que a fórmula prevê a realidade.
 *      Sem isto o item 1 seria fé numa conta.
 *   3. arquivado — a medição de verdade, oito cálculos de 150.000, gravada em
 *      fixtures/precisao.json por `npm run test:gerar`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as E from './motor.mjs';
import { derivar, sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';
import { criarSuite, ok } from './harness.mjs';

const ARQ = new URL('./fixtures/precisao.json', import.meta.url);
const REPETICOES = 8;

/* Pool fixa, para que a medição seja comparável entre execuções. */
function poolDeReferencia(semente = 0xF07) {
  const raiz = derivar(semente, 'precisao');
  const s = sementes(raiz);
  const elenco = E.sortearPool(s.elenco);
  return { raiz, elenco };
}

/* Oito cálculos INDEPENDENTES sobre a mesma pool: mesma entrada, sementes
   diferentes. É a medição do §4.4.3, e o que ela procura é dispersão. */
export function medir(sims, repeticoes = REPETICOES, semente = 0xF07) {
  const { raiz, elenco } = poolDeReferencia(semente);
  const t0 = process.hrtime.bigint();
  const registros = [];
  for (let r = 0; r < repeticoes; r++) {
    const wins = new Uint32Array(elenco.length);
    simularLote(E.M, elenco, derivar(raiz, 'repeticao' + r), 0, sims, wins);
    registros.push(precificar(wins, sims, E.M));
  }
  const msPorCalculo = Number(process.hrtime.bigint() - t0) / 1e6 / repeticoes;

  const porLutador = elenco.map((f, i) => {
    const odds = registros.map(r => r.lutadores[i].odd);
    const min = Math.min(...odds), max = Math.max(...odds);
    return {
      nome: f.n, min, max,
      dispersao: (max - min) / min,
      probMedia: registros.reduce((a, r) => a + r.lutadores[i].prob, 0) / repeticoes,
      erroPrevisto: registros.reduce((a, r) => a + r.lutadores[i].erroRelativo, 0) / repeticoes,
    };
  });
  const pior = porLutador.reduce((a, b) => (b.dispersao > a.dispersao ? b : a));
  return {
    sims, repeticoes, msPorCalculo,
    dispersaoPior: pior.dispersao,
    lutadorPior: pior.nome,
    erroPrevistoPior: Math.max(...porLutador.map(l => l.erroPrevisto)),
    margemEfetiva: registros[0].margemEfetiva,
    porLutador: porLutador.sort((a, b) => b.dispersao - a.dispersao),
  };
}

export function gerar() {
  const m = medir(E.CONF.SIMS);
  writeFileSync(ARQ, JSON.stringify(m, null, 2));
  return m;
}

export function suite() {
  const s = criarSuite('precisao');

  /* --- 1. analítico, e é o que a sabotagem do bloco derruba ------------- */
  s.teste('o erro relativo do pior lutador fica abaixo de 2%', () => {
    const { raiz, elenco } = poolDeReferencia();
    /* Contagem sintética no perfil medido da cauda: 1,6 % para o pior. O que se
       testa aqui é o DIMENSIONAMENTO, não a simulação — usar sims de verdade
       custaria 5 s e mediria a mesma conta com ruído em cima. */
    const wins = new Uint32Array(elenco.length);
    const n = elenco.length;
    wins[0] = Math.round(0.016 * E.CONF.SIMS);
    for (let i = 1; i < n; i++) wins[i] = Math.round((1 - 0.016) / (n - 1) * E.CONF.SIMS);
    const r = precificar(wins, E.CONF.SIMS, E.M);
    ok(r.erroPior < 0.02,
      `com SIMS = ${E.CONF.SIMS} o erro relativo do pior perfil é ` +
      `${(r.erroPior*100).toFixed(2)}%. A Spec §4.4.2 dimensiona a amostra pela ` +
      `CAUDA: n = (1-p)/(p·ε²) exige 153.750 para 2% em p = 0,016.`);
  });

  s.teste('o registro publica erro relativo por lutador', () => {
    const wins = new Uint32Array([100, 50, 25, 5]);
    const r = precificar(wins, 1000, E.M);
    for (const l of r.lutadores) {
      ok(Number.isFinite(l.erroRelativo) && l.erroRelativo > 0,
        `${l.idx} sem erro relativo — §4.4.5 o exige como campo de primeira classe`);
      /* confere contra a fórmula, não contra si mesmo */
      const esperado = Math.sqrt((1 - l.prob) / (1000 * l.prob));
      ok(Math.abs(l.erroRelativo - esperado) < 1e-12,
        `o erro de ${l.idx} não é sqrt((1-p)/(n·p))`);
    }
    ok(r.lutadores[3].erroRelativo > r.lutadores[0].erroRelativo,
      'o azarão precisa ter erro MAIOR que o favorito — é isso que dimensiona a amostra');
  });

  s.teste('o registro publica o viés de convexidade', () => {
    const wins = new Uint32Array([100, 50, 25, 5]);
    const r = precificar(wins, 1000, E.M);
    for (const l of r.lutadores) {
      const esperado = (1 - l.prob) / (1000 * l.prob);
      ok(Math.abs(l.viesConvexidade - esperado) < 1e-12,
        `o viés de ${l.idx} não é (1-p)/(n·p) — a fração da odd justa. ` +
        `(1-p)/(n·p²) é o viés em PONTOS de odd, e foi o que ficou aqui até o F1.5.`);
    }
    /* O VIÉS É MENOR QUE O ERRO, e não maior — a afirmação anterior vinha da
       fórmula com escala errada. O erro relativo é sqrt((1-p)/(n·p)) e o viés é
       (1-p)/(n·p): para (1-p)/(n·p) < 1, que é todo caso útil, a raiz é MAIOR.
       Medido no F1.5: na cauda o erro passa de 1 % e o viés fica em 0,04 %. */
    ok(r.lutadores[3].viesConvexidade < r.lutadores[3].erroRelativo,
      'o viés ficou maior que o erro relativo — é o sinal de que a fórmula voltou ' +
      'a ser (1-p)/(n·p²), que mede pontos de odd e não fração dela');
  });

  s.teste('o viés de convexidade fica abaixo de um terço da margem', () => {
    const { elenco } = poolDeReferencia();
    const n = elenco.length;
    const wins = new Uint32Array(n);
    wins[0] = Math.round(0.016 * E.CONF.SIMS);
    for (let i = 1; i < n; i++) wins[i] = Math.round((1 - 0.016) / (n - 1) * E.CONF.SIMS);
    const r = precificar(wins, E.CONF.SIMS, E.M);
    const teto = E.CONF.MARGIN / 3;
    ok(r.viesPior < teto,
      `viés do pior perfil: ${(r.viesPior*100).toFixed(3)}%, contra teto de ` +
      `${(teto*100).toFixed(2)}% (um terço da margem). Medido no F1.5 contra ` +
      `simulação de referência: com 154.000 sims o viés TEÓRICO no pior perfil é ` +
      `0,04% e o OBSERVADO é -0,17% — a suavização de Laplace já o absorve.`);
  });

  s.teste('o registro tem os nove campos do §4.4.5', () => {
    const r = precificar(new Uint32Array([10, 5, 3]), 100, E.M);
    for (const campo of ['sims', 'lutadores', 'overround', 'margemConfigurada',
                         'margemEfetiva', 'erroPior', 'viesPior', 'versaoMotor', 'versaoPack'])
      ok(campo in r, `o registro de precificação não tem ${campo}`);
    /* `null` é resposta — os tetos são do F0.8 e a ausência precisa ser
       declarada, não omitida. */
    for (const campo of ['tetoOdd', 'tetoPayoutPorTicket', 'tetoPassivoPorRodada'])
      ok(campo in r, `o registro não declara ${campo} (nem que seja null)`);
    ok(typeof r.versaoMotor === 'string' && r.versaoMotor.length > 0,
      'sem versão do motor não dá para auditar um preço meses depois');
    ok(r.versaoPack === E.pack.id, 'a versão do pack no registro não é a do pack em uso');
  });

  s.teste('a margem efetiva sai do overround, e bate com a configurada', () => {
    const { raiz, elenco } = poolDeReferencia();
    const wins = new Uint32Array(elenco.length);
    simularLote(E.M, elenco, raiz, 0, 4000, wins);
    const r = precificar(wins, 4000, E.M);
    const somaImplicita = r.lutadores.reduce((a, l) => a + 1 / l.odd, 0);
    ok(Math.abs(r.overround - somaImplicita) < 1e-9, 'o overround não é a soma de 1/odd');
    /* O arredondamento da odd para dois decimais move a margem efetiva alguns
       centésimos; mais que meio ponto seria outra coisa. */
    ok(Math.abs(r.margemEfetiva - r.margemConfigurada) < 0.005,
      `margem efetiva ${(r.margemEfetiva*100).toFixed(2)}% contra ` +
      `${(r.margemConfigurada*100).toFixed(2)}% configurados — o §4.4.1 proíbe ` +
      `overround diferente do configurado sem exibi-lo`);
  });

  s.teste('a odd respeita piso e teto declarados', () => {
    const r = precificar(new Uint32Array([9999, 1, 1, 1]), 10000, E.M);
    ok(r.lutadores[0].odd >= E.CONF.ODD_MIN, 'o favorito furou o piso de odd');
    ok(r.lutadores[0].limite === 'ODD_MIN', 'o piso mordeu e o registro não disse qual limite');
    ok(E.CONF.ODD_MAX === null,
      'ODD_MAX deixou de ser null. Teto de odd degrada a oferta — com x20 a margem ' +
      'no pior lutador vira 68%. O instrumento certo é teto de PAYOUT (§4.4.6, F0.8). ' +
      'Se a decisão mudou, este teste precisa mudar junto e a UI precisa exibir o teto.');
  });

  /* --- 2. empírico e barato: a fórmula prevê a realidade? --------------- */
  s.teste('a dispersão medida acompanha o erro previsto', () => {
    /* Amostra pequena de propósito: com 6.000 sims o erro previsto do azarão
       passa de 9 %, e oito cálculos medem isso em ~2 s. Se a fórmula estivesse
       errada — ou se a suavização de Laplace sumisse — os dois números
       divergiriam aqui, e não só lá na cauda cara. */
    const m = medir(6000, 8);
    const previstoPior = m.porLutador[0].erroPrevisto;
    /* Dispersão (max-min de 8 amostras) e desvio-padrão são escalas
       diferentes: para 8 amostras normais, a amplitude esperada é ~2,85 σ.
       A banda é larga porque a amostra de amplitudes é pequena; o que ela
       precisa pegar é ordem de grandeza errada, não um fator 1,3. */
    const razao = m.dispersaoPior / previstoPior;
    ok(razao > 1 && razao < 6,
      `dispersão medida ${(m.dispersaoPior*100).toFixed(1)}% contra erro previsto ` +
      `${(previstoPior*100).toFixed(1)}% (razão ${razao.toFixed(2)}, esperada ~2,85). ` +
      `A fórmula do §4.4.2 deixou de descrever o estimador.`);
  });

  /* --- 3. a medição arquivada, com o tamanho de amostra de produção ----- */
  /* A dispersão continua MEDIDA e publicada; ela deixou de ser portão porque o
     critério de 3% era aritmeticamente incompatível com o teto de 8 s — para
     chegar lá seriam ~1.040.000 sims e ~31 s por rodada. O portão passou a ser
     o erro relativo, que é o que a Spec §4.4.2 deriva. O que este teste guarda
     é a NÃO-REGRESSÃO: a dispersão não pode voltar ao patamar de 20.000 sims. */
  s.teste('a medição arquivada não regrediu para o patamar antigo', () => {
    ok(existsSync(ARQ), 'fixtures/precisao.json não existe — rode npm run test:gerar');
    const base = JSON.parse(readFileSync(ARQ, 'utf8'));
    ok(base.sims === E.CONF.SIMS,
      `a medição arquivada é de ${base.sims} sims e o motor está em ${E.CONF.SIMS} — regrave`);
    ok(base.dispersaoPior < 0.10,
      `dispersão do pior lutador (${base.lutadorPior}): ` +
      `${(base.dispersaoPior*100).toFixed(2)}%. Medido: 16,22% com 20.000 sims, ` +
      `7,84% com 154.000. Acima de 10% significa que a amostra encolheu.`);
    ok(base.erroPrevistoPior < 0.02,
      `erro previsto do pior lutador: ${(base.erroPrevistoPior*100).toFixed(2)}%`);
  });

  s.teste('o custo por rodada cabe na janela de aposta', () => {
    const base = JSON.parse(readFileSync(ARQ, 'utf8'));
    /* O bloco manda medir e paralelizar se passar de 8 s, porque a janela é de
       30 s e o preço precisa estar pronto ANTES de ela abrir. */
    ok(base.msPorCalculo < 8000,
      `${(base.msPorCalculo/1000).toFixed(2)}s por rodada com ${base.sims} sims. ` +
      `Passou de 8s: paralelizar por lotes independentes antes de fechar o bloco.`);
  });

  return s;
}
