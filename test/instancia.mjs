/* Q1/Q3/Q4 · A INSTÂNCIA DO JOGADOR (bloco 1.1, Spec §7.9 e §7.17).
 *
 * É a fundação do sub-jogo inteiro. Aqui nasce o que o mercado vai precificar
 * dois blocos adiante — e por isso o que se mede não é só "a função devolve um
 * número", é a FORMA DA DISTRIBUIÇÃO.
 *
 * ── O QUE ESTE ARQUIVO AFIRMA ─────────────────────────────────────────────
 *
 *   1. a geração é DETERMINÍSTICA a partir da semente (P3)
 *   2. o Potencial é a soma de seis ocultos, e a curva tem a forma medida
 *   3. a Natureza é uma das 25 canônicas, e é FIXA
 *   4. a Forma agrupa os seis em três leituras, sem perder o total
 *   5. o encontro EXEMPLAR existe, na taxa declarada, e alarga a cauda
 *   6. nada disso depende de saldo, de valor apostado nem de compra (§7.5)
 *   7. NENHUM número de espécie está no código — o critério da Gen 2
 *
 * ── POR QUE A DISTRIBUIÇÃO TEM TESTE, E NÃO SÓ A FUNÇÃO ───────────────────
 *
 * Porque o desenho ORIGINAL passava em qualquer teste de função e estava
 * errado: seis uniformes davam Potencial ≥ 90 em 0,01% — um em dez mil — e em
 * trinta dias de jogo ninguém passava de 81. O topo do mercado nunca ganharia
 * estoque, e a faixa "excepcional" seria rótulo decorativo.
 *
 * A prévia (`tools/previas/captura.html`) pegou isso ANTES de virar código, e
 * o dono aprovou `exemplar 4% · piso 20`. Este arquivo é o que impede esse
 * valor de mudar sem alguém perceber.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  semente, gerarInstancia, EXEMPLAR,
  OCULTO_MAX, N_OCULTOS, potencialDe, SEM_NATUREZA,
} from '../engine/instancia.mjs';
/* A TABELA VEM DO PACK, e o teste a busca de lá de propósito: se ela voltar
   para o motor, este import quebra e o bloco não fecha. */
import pack from '../content/pokemon_kanto_v1.mjs';
const NATUREZAS = pack.naturezas;

/* Uma amostra grande o bastante para a cauda aparecer. 20 mil é o mesmo
   tamanho que a prévia usa, e é o que faz a fração de 90+ ter dígito. */
const AMOSTRA = 20_000;

function amostrar(n = AMOSTRA, conf) {
  const rnd = semente(4242);
  const out = [];
  for (let i = 0; i < n; i++)
    out.push(gerarInstancia(rnd, { naturezas: NATUREZAS, ...(conf ? { exemplarConf: conf } : {}) }));
  return out;
}
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length * p)]; };

export function suite() {
  const s = criarSuite('instancia');

  /* --- P3: a semente manda ------------------------------------------------ */

  s.teste('a mesma semente devolve exatamente a mesma instância', () => {
    const a = gerarInstancia(semente(7), { naturezas: NATUREZAS });
    const b = gerarInstancia(semente(7), { naturezas: NATUREZAS });
    igual(JSON.stringify(a), JSON.stringify(b),
      'duas chamadas com a mesma semente divergiram. Sem isto a rodada não é ' +
      'reproduzível, e o §P3 vale para a captura tanto quanto para a batalha.');
  });

  s.teste('sementes diferentes divergem', () => {
    const a = gerarInstancia(semente(7), { naturezas: NATUREZAS });
    const b = gerarInstancia(semente(8), { naturezas: NATUREZAS });
    ok(JSON.stringify(a) !== JSON.stringify(b),
      'duas sementes diferentes deram a mesma instância — o gerador está preso');
  });

  /* --- a forma do dado ---------------------------------------------------- */

  s.teste('os seis ocultos ficam na faixa, e o Potencial é a soma deles', () => {
    for (const p of amostrar(400)) {
      igual(p.iv.length, N_OCULTOS, 'o número de valores ocultos mudou');
      for (const v of p.iv)
        ok(v >= 0 && v <= OCULTO_MAX, `valor oculto ${v} fora de 0..${OCULTO_MAX}`);
      igual(p.potencial, potencialDe(p.iv),
        'o Potencial não é a soma dos ocultos — o cartão passaria a mentir sobre ' +
        'o que o jogador tem, e é ele que vai ao anúncio do mercado');
      ok(p.potencial >= 0 && p.potencial <= 100, `Potencial ${p.potencial} fora de 0..100`);
    }
  });

  s.teste('a Natureza é uma das 25 canônicas', () => {
    const nomes = new Set(NATUREZAS.map(n => n[0]));
    igual(NATUREZAS.length, 25, 'o conjunto de naturezas deixou de ter 25');
    const vistas = new Set();
    for (const p of amostrar(3000)) {
      ok(nomes.has(p.natureza.nome), `natureza desconhecida: ${p.natureza.nome}`);
      vistas.add(p.natureza.nome);
    }
    ok(vistas.size >= 20,
      `só ${vistas.size} naturezas apareceram em 3.000 sorteios. Se o sorteio ` +
      `favorece algumas, duas coisas quebram de uma vez: a fidelidade ao jogo e ` +
      `o preço no mercado, que depende de a natureza certa ser rara.`);
  });

  /* AS CINCO NEUTRAS EXISTEM E VALEM MENOS. É a primeira coisa que dá preço
     diferente a dois Pokémon com o mesmo Potencial, e some sem ninguém notar
     se alguém "arrumar" a tabela. */
  s.teste('as cinco naturezas neutras continuam existindo', () => {
    const neutras = NATUREZAS.filter(n => n[1] === null);
    igual(neutras.length, 5,
      `${neutras.length} naturezas neutras em vez de 5. Elas existem no jogo ` +
      `original e são o que faz duas instâncias de mesmo Potencial terem preços ` +
      `diferentes.`);
    for (const n of neutras)
      igual(n[2], null, `${n[0]} sobe nada e desce alguma coisa — não é neutra`);
  });

  s.teste('a natureza que sobe um eixo sempre desce OUTRO', () => {
    for (const [nome, sobe, desce] of NATUREZAS) {
      if (sobe === null) continue;
      ok(desce !== null, `${nome} sobe ${sobe} e não desce nada — é bônus puro`);
      ok(sobe !== desce, `${nome} sobe e desce o mesmo eixo`);
    }
  });

  s.teste('a Forma agrupa os seis em três leituras', () => {
    for (const p of amostrar(200)) {
      for (const eixo of ['ofensiva', 'defesa', 'velocidade']) {
        const v = p.forma[eixo];
        ok(v >= 0 && v <= 100, `forma.${eixo} = ${v}, fora de 0..100`);
      }
    }
  });

  /* --- Q4: A CURVA, e é o teste que o desenho anterior reprovaria ---------- */

  s.teste('§Q4 · sem exemplar, a curva é uma sineta estreita — e isso é medido', () => {
    const pot = amostrar(AMOSTRA, { chance: 0, piso: 0 }).map(p => p.potencial);
    const mediana = pct(pot, .5);
    ok(mediana >= 45 && mediana <= 55,
      `mediana ${mediana}, esperada perto de 50 — soma de seis uniformes tende ao centro`);
    const noventa = pot.filter(v => v >= 90).length / pot.length;
    ok(noventa < .005,
      `${(noventa*100).toFixed(2)}% de 90+ SEM exemplar. Este teste existe para ` +
      `documentar por que o exemplar precisou existir: sem ele a cauda é fina ` +
      `demais e o topo do mercado nunca ganha estoque.`);
  });

  s.teste('§Q4 · com exemplar 4%/piso 20, a cauda alarga na medida aprovada', () => {
    const pot = amostrar(AMOSTRA).map(p => p.potencial);
    const mediana = pct(pot, .5), p99 = pct(pot, .99);
    const noventa = pot.filter(v => v >= 90).length;

    ok(mediana >= 45 && mediana <= 56,
      `a mediana foi para ${mediana}. O exemplar deve alargar a CAUDA sem mover ` +
      `o meio — se o jogador comum passa a tirar 70, o 90 deixa de valer.`);
    ok(p99 >= 80 && p99 <= 92,
      `p99 = ${p99}, esperado perto de 85. Foi este número que subiu de 78 para ` +
      `85 quando o exemplar entrou, e é ele que dá anúncio de mercado.`);
    const umEm = Math.round(pot.length / Math.max(1, noventa));
    ok(umEm >= 250 && umEm <= 1600,
      `um 90+ a cada ${umEm} capturas. Medido na aprovação: ~690. Muito mais ` +
      `raro e o topo não tem estoque; muito mais comum e ele deixa de ser topo.`);
  });

  s.teste('§Q4 · o exemplar acontece na taxa declarada', () => {
    const inst = amostrar(AMOSTRA);
    const taxa = inst.filter(p => p.exemplar).length / inst.length;
    const alvo = EXEMPLAR.chance;
    ok(Math.abs(taxa - alvo) < alvo * .25,
      `${(taxa*100).toFixed(2)}% de exemplares contra ${(alvo*100).toFixed(1)}% ` +
      `declarados. Raridade declarada tem de bater com a medida — é o que o §7.6 ` +
      `exige, e sem isso o anúncio do jogo é propaganda.`);
  });

  /* O PISO É POR VALOR OCULTO, E NÃO NO TOTAL. Se fosse no total, todo exemplar
     sairia igual e o mercado teria um item só em vez de uma faixa. */
  s.teste('o exemplar tem PISO por valor oculto, e não Potencial fixo', () => {
    const ex = amostrar(AMOSTRA).filter(p => p.exemplar);
    ok(ex.length > 100, `só ${ex.length} exemplares na amostra — pouco para medir`);
    for (const p of ex)
      for (const v of p.iv)
        ok(v >= EXEMPLAR.piso,
          `exemplar com valor oculto ${v}, abaixo do piso ${EXEMPLAR.piso}`);
    const distintos = new Set(ex.map(p => p.potencial));
    ok(distintos.size > 8,
      `os exemplares tiveram só ${distintos.size} Potenciais distintos. Se o piso ` +
      `fosse aplicado no TOTAL, todo exemplar sairia igual — e o mercado passaria ` +
      `a ter um item só em vez de uma faixa.`);
  });

  /* --- §7.5: a captura não olha para o bolso ------------------------------ */

  s.teste('a geração NÃO aceita saldo, aposta nem compra', () => {
    const fonte = gerarInstancia.toString();
    for (const proibido of ['saldo', 'aposta', 'valor', 'compra', 'pago', 'vip'])
      ok(!new RegExp(`\\b${proibido}\\b`, 'i').test(fonte),
        `\`${proibido}\` aparece na geração. O §7.5 é explícito: a taxa não pode ` +
        `depender de saldo, de valor apostado nem de compra — e a forma mais ` +
        `segura de garantir isso é a função não ter como saber.`);
  });

  return s;
}
