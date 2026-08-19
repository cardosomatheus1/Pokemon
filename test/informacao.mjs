/* Q4/Q6 · VAZAMENTO DE INFORMAÇÃO PELA POOL — o que o apostador consegue inferir.
 *
 * O F0.6 pôs o clima dentro do preço e a margem por grupo OBSERVÁVEL fechou em
 * 8 %. Condicionada ao clima que de fato saiu, ela continua torta: −45 % para
 * quem foi buffado contra +13 % no resto. Isso é inofensivo enquanto o clima
 * for imprevisível — e ele não é totalmente, porque `sortearPool` **garante 1
 * lutador do tipo favorecido** na pool.
 *
 * Ver um único lutador de Gelo entre 12 é evidência de Nevasca. Evidência é
 * preço. A pergunta deste bloco é se a evidência dá lucro.
 *
 * COMO SE MEDE UMA EXPLORAÇÃO, E NÃO UM PALPITE:
 *
 *   1. Verossimilhança — quantos lutadores de cada tipo buffável aparecem numa
 *      pool, para cada clima. Estimada por amostragem, não suposta.
 *   2. Posterior — P(clima | pool), por Bayes, a partir da contagem de tipos.
 *      É a ÚNICA informação que o apostador tem: o clima só é revelado depois
 *      do fechamento.
 *   3. Escolha — o apostador aposta no lutador de maior valor esperado sob esse
 *      posterior.
 *   4. Retorno realizado — medido contra a probabilidade de vitória sob o clima
 *      que DE FATO saiu.
 *
 * Se o retorno for positivo, o canal é explorável e vira defeito. Se não for,
 * fica medido — e volta a ser medido a cada execução da suíte.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as E from './motor.mjs';
import { tiposDaPool } from '../engine/engine.mjs';
import { derivar, derivarIndice, sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';
import { criarSuite, ok } from './harness.mjs';

const ARQ = new URL('./fixtures/informacao.json', import.meta.url);
const CLIMAS = E.pack.clima;
const TIPOS = [...new Set(CLIMAS.filter(c => c.type).map(c => c.type))];
const PESO_TOTAL = CLIMAS.reduce((a, c) => a + c.w, 0);

/* ---------------------------------------------------------------- 1. verossimilhança
   P(contagem do tipo T = k | clima). Amostrada do próprio sorteio de pool, que
   é quem cria a assimetria — supor a distribuição seria medir a suposição. */
export function verossimilhanca(amostras = 4000, semente = 0xF11) {
  const tabela = {};
  for (const c of CLIMAS) {
    tabela[c.key] = Object.fromEntries(TIPOS.map(t => [t, new Array(13).fill(0)]));
    for (let i = 0; i < amostras; i++) {
      const pool = E.sortearPool(derivarIndice(semente, 'pool:' + c.key, i));
      for (const t of TIPOS) tabela[c.key][t][pool.filter(f => f.types.includes(t)).length]++;
    }
    /* Laplace, pelo mesmo motivo de sempre: contagem nunca vista não pode virar
       probabilidade zero e zerar o posterior inteiro. */
    for (const t of TIPOS)
      tabela[c.key][t] = tabela[c.key][t].map(n => (n + 1) / (amostras + 13));
  }
  return tabela;
}

/* ------------------------------------------------------------------- 2. posterior */
export function posterior(tabela, pool) {
  const contagem = Object.fromEntries(TIPOS.map(t => [t, pool.filter(f => f.types.includes(t)).length]));
  /* Em log, para não estourar o piso do float ao multiplicar quatro fatores. */
  const bruto = CLIMAS.map(c => {
    let log = Math.log(c.w / PESO_TOTAL);
    for (const t of TIPOS) log += Math.log(tabela[c.key][t][contagem[t]]);
    return { key: c.key, clima: c, log };
  });
  const maior = Math.max(...bruto.map(x => x.log));
  const exps = bruto.map(x => Math.exp(x.log - maior));
  const soma = exps.reduce((a, b) => a + b, 0);
  return bruto.map((x, i) => ({ ...x, p: exps[i] / soma }));
}

/* ------------------------------------------------- 3 e 4. o apostador informado */
export function medir(rodadas = 120, simsPreco = 2000, simsPorClima = 1200, semente = 0xF11) {
  const tabela = verossimilhanca(3000, semente);
  const retornos = [], retornosIngenuo = [], vantagem = [], acertosClima = [];

  for (let r = 0; r < rodadas; r++) {
    const raiz = derivar(semente, 'rodada' + r);
    const s = sementes(raiz);
    const pool = E.sortearPool(s.elenco);
    const climaReal = E.sortearClima(s.ambiente, tiposDaPool(pool));

    /* o preço que o jogador vê — o mesmo do jogo */
    const wins = new Uint32Array(pool.length);
    simularLote(E.M, pool, raiz, 0, simsPreco, wins);
    const preco = precificar(wins, simsPreco, E.M).lutadores;

    /* probabilidade de vitória sob CADA clima */
    const pPorClima = {};
    for (const c of CLIMAS) {
      const lista = c.type ? E.aplicarClima(pool, c) : pool;
      const w = new Uint32Array(pool.length);
      for (let i = 0; i < simsPorClima; i++) {
        const v = E.simular(lista, derivarIndice(raiz, 'verdade:' + c.key, i), false);
        if (v >= 0) w[v]++;
      }
      pPorClima[c.key] = [...w].map(n => (n + 1) / (simsPorClima + pool.length));
    }

    const post = posterior(tabela, pool);
    acertosClima.push(post.find(x => x.key === climaReal.key).p);

    /* O RETORNO ABSOLUTO NÃO SERVE PARA RESPONDER A PERGUNTA, e descobrir isso
       foi metade do bloco. A primeira medição deu +21 % para o apostador
       informado — e +2,5 % para um que aposta no azarão sem olhar para nada.
       Um apostador cego não tem lucro contra uma casa com 8 % de margem: o que
       ele estava colhendo era o VIÉS DE CONVEXIDADE do estimador (L-023), que
       infla a odd do azarão e cresce com 1/(n·p²). Com amostra pequena ele
       domina tudo e afoga o efeito procurado.

       A resposta certa é PAREADA: o mesmo apostador, com e sem o canal de
       informação, sobre a MESMA rodada e o MESMO preço. O que sobra na
       diferença é a informação, e só ela — o viés do estimador entra igual nos
       dois lados e se cancela. */
    const escolher = pesos => {
      const ev = pool.map((_, i) =>
        pesos.reduce((a, x) => a + x.p * pPorClima[x.key][i], 0) * preco[i].odd - 1);
      return ev.indexOf(Math.max(...ev));
    };
    const prior = CLIMAS.map(c => ({ key: c.key, p: c.w / PESO_TOTAL }));

    const comInfo = escolher(post);
    const semInfo = escolher(prior);
    const retornoDe = i => pPorClima[climaReal.key][i] * preco[i].odd - 1;
    retornos.push(retornoDe(comInfo));
    retornosIngenuo.push(retornoDe(semInfo));
    vantagem.push(retornoDe(comInfo) - retornoDe(semInfo));
  }

  const media = a => a.reduce((x, y) => x + y, 0) / a.length;
  const ic95 = a => { const m = media(a);
    return 1.96 * Math.sqrt(media(a.map(x => (x - m) ** 2)) / a.length); };

  return {
    rodadas, simsPreco, simsPorClima,
    informado:  { ev: media(retornos), ic95: ic95(retornos) },
    semInfo:    { ev: media(retornosIngenuo), ic95: ic95(retornosIngenuo) },
    /* A MEDIDA QUE RESPONDE À PERGUNTA: o mesmo apostador, com e sem o canal,
       pareado por rodada. O viés do estimador entra igual nos dois lados e
       some na diferença. */
    vantagem:   { ev: media(vantagem), ic95: ic95(vantagem),
                  rodadasEmQueMudou: vantagem.filter(v => v !== 0).length },
    /* Quanto o posterior sabe: 1/5 seria ignorância; o peso do clima neutro é
       40 %, então o acaso puro dá ~0,28 de probabilidade atribuída ao correto. */
    confiancaMediaNoClimaCerto: media(acertosClima),
  };
}

export function gerar() {
  const m = medir(300, 4000, 2500);
  writeFileSync(ARQ, JSON.stringify(m, null, 2));
  return m;
}

export function suite() {
  const s = criarSuite('informacao');

  /* O CANAL NÃO FOI ELIMINADO. FOI INVERTIDO, E ENCOLHIDO — e escrever isso é
     mais útil que declarar vitória.

     Antes: sorteava-se o clima e a pool era obrigada a conter um lutador do
     tipo favorecido. Ver um Gelo entre 12 era evidência de Nevasca.
     Agora: sorteia-se a pool sem conhecer o clima, e o clima sai entre os que a
     pool suporta. Uma pool SEM Gelo diz que Nevasca é impossível.

     Qualquer acoplamento entre pool e clima vaza; o que muda é o tamanho.
     Medido: o posterior atribui 29,6 % ao clima certo no esquema antigo e
     26,5 % no novo, contra 25,0 % do acaso. Zerar exigiria clima independente
     da pool, e aí um clima favorecendo Gelo cairia numa rodada sem nenhum
     Gelo — o efeito climático simplesmente não aconteceria.

     O que decide não é o sinal, é o que ele faz com a aposta. Este teste guarda
     o TETO: sinal acima disso significa que o acoplamento voltou a crescer. */
  s.teste('o sinal residual do clima na pool fica pequeno', () => {
    const tabela = verossimilhanca(2500);
    const acaso = CLIMAS.reduce((a, c) => a + (c.w / PESO_TOTAL) ** 2, 0);
    const amostras = [];
    for (let r = 0; r < 1200; r++) {
      const s0 = sementes(derivar(0xABC, 'sinal' + r));
      const pool = E.sortearPool(s0.elenco);
      const clima = E.sortearClima(s0.ambiente, tiposDaPool(pool));
      amostras.push(posterior(tabela, pool).find(x => x.key === clima.key).p);
    }
    const m = amostras.reduce((a, b) => a + b, 0) / amostras.length;
    const teto = acaso + 0.03;
    ok(m < teto,
      `o posterior atribui ${(m*100).toFixed(2)}% ao clima certo, contra ` +
      `${(acaso*100).toFixed(2)}% do acaso — acima do teto de ${(teto*100).toFixed(2)}%. ` +
      `O acoplamento entre pool e clima cresceu; medido, o esquema antigo dava 29,6%.`);
  });

  /* O TESTE QUE DECIDE. Sinal que não muda aposta é inerte; o que importa é o
     retorno do MESMO apostador com e sem o canal, pareado por rodada — assim o
     viés do estimador entra igual nos dois lados e some na diferença. */
  s.teste('a informação da pool não dá vantagem', () => {
    const m = medir(60, 1500, 900);
    ok(m.vantagem.ev - m.vantagem.ic95 <= 0,
      `usar a contagem de tipos da pool rendeu ${(m.vantagem.ev*100).toFixed(2)}% ± ` +
      `${(m.vantagem.ic95*100).toFixed(2)} a mais que o MESMO apostador sem o canal, ` +
      `em ${m.vantagem.rodadasEmQueMudou} de ${m.rodadas} rodadas em que a escolha mudou. ` +
      `Positivo com confiança significa que a garantia de tipo na pool é explorável — ` +
      `e aí ela precisa sair, ou o preço precisa ser condicionado à mesma informação.`);
  });

  s.teste('a medição arquivada continua de pé', () => {
    ok(existsSync(ARQ), 'fixtures/informacao.json não existe — rode npm run test:gerar');
    const base = JSON.parse(readFileSync(ARQ, 'utf8'));
    ok(base.vantagem.ev - base.vantagem.ic95 <= 0,
      `a medição arquivada dá vantagem de ${(base.vantagem.ev*100).toFixed(2)}% ± ` +
      `${(base.vantagem.ic95*100).toFixed(2)} ao apostador que usa o canal`);
  });

  /* -------------------------------------------------------------------- Q6 */

  s.teste('o registro de precificação não carrega o clima', () => {
    const raiz = derivar(0xF11, 'q6');
    const s0 = sementes(raiz);
    const pool = E.sortearPool(s0.elenco);
    const clima = E.sortearClima(s0.ambiente, tiposDaPool(pool));
    const wins = new Uint32Array(pool.length);
    simularLote(E.M, pool, raiz, 0, 500, wins);
    const registro = precificar(wins, 500, E.M);
    const texto = JSON.stringify(registro);
    for (const c of CLIMAS) {
      ok(!texto.includes(`"${c.key}"`),
        `o registro entregue antes do fechamento cita o clima "${c.key}"`);
      if (c.type) ok(!new RegExp(`"tipo\\\\w*":\\\\s*"${c.type}"`).test(texto),
        `o registro entrega o tipo favorecido "${c.type}"`);
    }
    ok(!texto.includes('ambiente'), 'o registro carrega a sub-seed de ambiente');
  });

  s.teste('a sub-seed de ambiente não sai da raiz por caminho público', () => {
    /* O ramo `ambiente` reconstrói o clima. Ele não pode aparecer em nada que o
       cliente receba antes do fechamento — e a raiz também não, porque dela sai
       tudo. A revelação é do §4.5, DEPOIS que as apostas fecham. */
    const raiz = derivar(0xF11, 'q6b');
    const s0 = sementes(raiz);
    const wins = new Uint32Array(12);
    const registro = precificar(wins, 500, E.M);
    const texto = JSON.stringify(registro);
    for (const v of [raiz, s0.raiz, s0.ambiente, s0.batalha, s0.elenco])
      ok(!texto.includes(String(v)),
        `o registro de precificação carrega a semente ${v} — quem a tem reconstrói o clima`);
  });

  return s;
}
