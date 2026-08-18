/* Q1/Q3/Q6 · SEED RAIZ — uma rodada inteira reconstituível a partir de um número.
 *
 * A Spec §P3 manda toda rodada nascer de `roundSeed`, com cinco derivações:
 * elenco, ambiente, batalha, visual e recompensa. O protótipo tinha o oposto:
 * cinco `Math.random()` independentes, e nenhuma rodada reproduzível.
 *
 * Três afirmações:
 *
 *   1. Determinismo — a mesma raiz reproduz elenco, clima, layout, batalha e
 *      ordem de entrada, byte a byte. É o Q3.
 *   2. Independência — duas derivações nunca coincidem, e mudar um bit da raiz
 *      muda todas as cinco. Sub-seed repetida é correlação escondida entre
 *      coisas que deveriam ser independentes.
 *   3. Imprevisibilidade — a raiz não sai do relógio, nem de contador, nem da
 *      rodada anterior. É o Q6, e é o que separa "aleatório" de "adivinhável":
 *      quem prevê a raiz sabe o vencedor antes de apostar.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { RAMOS, derivar, derivarIndice, novaRaiz, sementes } from '../engine/seed.mjs';
import { criarMotor } from '../engine/engine.mjs';
import packKanto from '../content/pokemon_kanto_v1.mjs';
/* A reconstrução mora em arquivo próprio porque o portão Q5 importa a MESMA
   fonte dentro do Chromium — é assim que "dois ambientes JS distintos" vira
   comparação de verdade, e não de dois códigos parecidos. */
import { digital, rodada } from './rodada-digital.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';

const E = criarMotor(packKanto);

export function suite() {
  const s = criarSuite('semente');

  /* ------------------------------------------------------- Q3 determinismo */

  s.teste('a mesma raiz reproduz a rodada inteira', () => {
    for (const raiz of [1, 7, 0xC0FFEE, 0xFFFFFFFF, 123456789]) {
      const a = digital(raiz);
      const b = digital(raiz);
      igual(a === b, true, `raiz ${raiz} produziu duas rodadas diferentes`);
    }
  });

  s.teste('raízes diferentes produzem rodadas diferentes', () => {
    const vistos = new Set();
    for (let raiz = 1; raiz <= 60; raiz++) vistos.add(digital(raiz));
    ok(vistos.size === 60, `60 raízes geraram só ${vistos.size} rodadas distintas`);
  });

  s.teste('o elenco não depende de nada além da sub-seed de elenco', () => {
    /* Se `sortearPool` ainda tivesse Math.random dentro, esta chamada repetida
       daria pools diferentes. É o teste que a sabotagem de F0.5 tem que virar
       vermelho ao reintroduzir um único Math.random no caminho. */
    for (const semente of [1, 99, 0xABCDEF]) {
      const a = E.sortearPool(null, semente).map(f => f.dex).join(',');
      const b = E.sortearPool(null, semente).map(f => f.dex).join(',');
      igual(a, b, `sortearPool com a semente ${semente} não é determinístico`);
    }
  });

  s.teste('a garantia de clima continua valendo com semente fixa', () => {
    for (const c of packKanto.clima) {
      if (!c.type) continue;
      for (let semente = 1; semente <= 40; semente++) {
        const pool = E.sortearPool(c.type, semente);
        ok(pool.some(f => f.types.includes(c.type)),
          `clima ${c.key} com semente ${semente} sorteou pool sem o tipo favorecido`);
      }
    }
  });

  /* ----------------------------------------------------- Q1 independência */

  s.teste('a árvore tem os cinco ramos da Spec §P3', () => {
    igual(RAMOS.join(','), 'elenco,ambiente,batalha,visual,recompensa',
      'os ramos não são os cinco do §P3');
    const s0 = sementes(12345);
    igual(s0.raiz, 12345, 'a árvore não devolve a própria raiz');
    for (const r of RAMOS)
      ok(Number.isInteger(s0[r]) && s0[r] >= 0 && s0[r] <= 0xFFFFFFFF,
        `o ramo ${r} não é um uint32`);
  });

  s.teste('duas derivações nunca coincidem', () => {
    for (let raiz = 0; raiz < 4000; raiz++) {
      const s0 = sementes(raiz);
      const vals = RAMOS.map(r => s0[r]);
      ok(new Set(vals).size === RAMOS.length,
        `raiz ${raiz}: dois ramos com a mesma sub-seed (${vals.join(',')})`);
    }
  });

  /* Derivação por rótulo, não por posição. Se `sementes` passasse a derivar
     pelo índice do ramo, este teste fica vermelho — e é ele que protege as
     rodadas já publicadas de mudarem quando um ramo novo entrar na lista. */
  s.teste('cada ramo vale exatamente derivar(raiz, nome do ramo)', () => {
    for (const raiz of [0, 1, 4242, 0xFEEDFACE]) {
      const s0 = sementes(raiz);
      for (const r of RAMOS)
        igual(s0[r], derivar(raiz, r), `o ramo ${r} da raiz ${raiz} não veio do rótulo`);
    }
  });

  s.teste('a ordem dos ramos não muda nenhum ramo', () => {
    const direto = sementes(777);
    const invertido = {};
    for (const r of [...RAMOS].reverse()) invertido[r] = derivar(777, r);
    for (const r of RAMOS)
      igual(direto[r], invertido[r],
        `o ramo ${r} mudou ao inverter a ordem — a derivação virou posicional`);
  });

  s.teste('nenhum ramo é igual à raiz', () => {
    for (let raiz = 0; raiz < 4000; raiz++) {
      const s0 = sementes(raiz);
      for (const r of RAMOS)
        ok(s0[r] !== raiz, `raiz ${raiz}: o ramo ${r} devolveu a própria raiz`);
    }
  });

  /* Um bit da raiz precisa mexer em TODOS os ramos. Sem isso, duas rodadas
     com raízes vizinhas compartilhariam elenco ou clima — e a raiz deixaria de
     ser uma raiz para virar uma etiqueta. */
  s.teste('um bit da raiz muda todos os ramos', () => {
    for (let bit = 0; bit < 32; bit++) {
      for (const base of [0, 1, 0x5A5A5A5A, 0xFFFFFFFF]) {
        const a = sementes(base >>> 0);
        const b = sementes((base ^ (1 << bit)) >>> 0);
        for (const r of RAMOS)
          ok(a[r] !== b[r], `bit ${bit} da raiz ${base}: o ramo ${r} não mudou`);
      }
    }
  });

  /* Avalanche: virar um bit da entrada tem que virar ~metade dos bits da saída.
     Abaixo disso, sub-seeds vizinhas geram fluxos correlacionados. */
  s.teste('a derivação avalancha', () => {
    let soma = 0, n = 0;
    for (let raiz = 0; raiz < 500; raiz++)
      for (let bit = 0; bit < 32; bit++) {
        const a = derivar(raiz, 'batalha');
        const b = derivar(raiz ^ (1 << bit), 'batalha');
        let x = (a ^ b) >>> 0, c = 0;
        while (x) { c += x & 1; x >>>= 1; }
        soma += c; n++;
      }
    const media = soma / n;
    ok(media > 14 && media < 18,
      `distância de Hamming média ${media.toFixed(2)} de 32 — a derivação não avalancha`);
  });

  s.teste('as sub-seeds indexadas do Monte Carlo não repetem', () => {
    const vistos = new Set();
    for (let i = 0; i < 20000; i++) vistos.add(derivarIndice(0xDEADBEEF, 'simulacao', i));
    /* 20.000 sorteios em 2^32: pelo aniversário, ~0,05 colisões esperadas.
       Mais de 5 significa derivação com estrutura, não com dispersão. */
    ok(20000 - vistos.size <= 5,
      `${20000 - vistos.size} colisões em 20.000 sub-seeds de simulação`);
  });

  s.teste('o Monte Carlo de duas raízes distintas não compartilha sub-seed', () => {
    const a = new Set(), b = [];
    for (let i = 0; i < 5000; i++) a.add(derivarIndice(1, 'simulacao', i));
    for (let i = 0; i < 5000; i++) b.push(derivarIndice(2, 'simulacao', i));
    const comuns = b.filter(x => a.has(x)).length;
    ok(comuns <= 5, `${comuns} sub-seeds compartilhadas entre duas raízes`);
  });

  /* -------------------------------------------- Q3 o preço é reproduzível */

  /* Até o F0.5 o Monte Carlo sorteava cada simulação com Math.random, e a
     tabela de odds era irreproduzível: duas execuções da MESMA rodada davam
     preços diferentes. Isso torna o §25.2 impossível — não adianta revelar a
     raiz se o preço não sai dela. */
  s.teste('a mesma raiz produz a mesma tabela de odds', () => {
    const { elenco } = rodada(2026);
    const a = new Uint32Array(elenco.length), b = new Uint32Array(elenco.length);
    simularLote(E.simular, elenco, 2026, 0, 800, a);
    simularLote(E.simular, elenco, 2026, 0, 800, b);
    igual(a.join(','), b.join(','), 'dois lotes idênticos deram placares diferentes');
    const pa = precificar(a, 800, 0.08), pb = precificar(b, 800, 0.08);
    igual(JSON.stringify(pa), JSON.stringify(pb), 'a mesma contagem gerou preços diferentes');
  });

  /* O app fatia o Monte Carlo em pedaços de 12 ms para não travar a animação.
     Se o tamanho da fatia mudasse o resultado, o preço dependeria da máquina
     de quem abriu a página — e duas pessoas veriam odds diferentes na mesma
     rodada. */
  s.teste('o tamanho da fatia não muda o preço', () => {
    const { elenco } = rodada(31337);
    const inteiro = new Uint32Array(elenco.length);
    simularLote(E.simular, elenco, 31337, 0, 900, inteiro);
    for (const fatia of [1, 7, 100, 450]) {
      const partido = new Uint32Array(elenco.length);
      for (let de = 0; de < 900; de += fatia)
        simularLote(E.simular, elenco, 31337, de, Math.min(900, de + fatia), partido);
      igual(partido.join(','), inteiro.join(','),
        `fatia de ${fatia} deu placar diferente de uma execução inteira`);
    }
  });

  s.teste('raízes diferentes dão tabelas de odds diferentes', () => {
    const { elenco } = rodada(5);
    const a = new Uint32Array(elenco.length), b = new Uint32Array(elenco.length);
    simularLote(E.simular, elenco, 111, 0, 600, a);
    simularLote(E.simular, elenco, 222, 0, 600, b);
    ok(a.join(',') !== b.join(','), 'duas raízes deram exatamente o mesmo placar');
  });

  s.teste('a odd sai da frequência com margem e suavização', () => {
    const wins = new Uint32Array([50, 30, 20, 0]);
    const p = precificar(wins, 100, 0.08);
    /* Laplace: (0+1)/(100+4) — quem não venceu nenhuma não vira odd infinita */
    igual(p[3].prob, 1 / 104, 'a suavização de Laplace saiu do lugar');
    igual(p[0].prob, 51 / 104, 'a probabilidade não bate com a contagem');
    igual(p[0].odd, +((104 / 51) * 0.92).toFixed(2), 'a margem não foi aplicada');
    ok(p.every(x => x.odd >= 1.05), 'alguma odd ficou abaixo do piso de 1,05');
  });

  /* ------------------------------------------------- Q6 imprevisibilidade */

  s.teste('a raiz não sai de um contador', () => {
    const r = Array.from({ length: 3000 }, novaRaiz);
    const difs = new Set();
    for (let i = 1; i < r.length; i++) difs.add((r[i] - r[i-1]) | 0);
    ok(difs.size > 2900, `só ${difs.size} diferenças distintas em 3.000 raízes — parece contador`);
    let crescentes = 0;
    for (let i = 1; i < r.length; i++) if (r[i] > r[i-1]) crescentes++;
    const frac = crescentes / (r.length - 1);
    ok(frac > 0.4 && frac < 0.6, `${(frac*100).toFixed(1)}% das raízes crescem — sequência ordenada`);
  });

  s.teste('a raiz não sai do relógio', () => {
    /* Raízes tiradas no mesmo milissegundo precisam ser diferentes; e a raiz
       não pode conter o tempo. Se contivesse, raízes seguidas ficariam
       próximas em valor — é isso que a distância mede. */
    const inicio = Date.now();
    while (Date.now() === inicio) { /* espera a virada, para ter o milissegundo inteiro */ }
    const t0 = Date.now();
    const r = [];
    while (Date.now() === t0 && r.length < 2000) r.push(novaRaiz());
    ok(r.length >= 50, `só ${r.length} raízes num milissegundo inteiro`);
    ok(new Set(r).size === r.length, 'duas raízes iguais no mesmo milissegundo');
    let perto = 0;
    for (let i = 1; i < r.length; i++) if (Math.abs(r[i] - r[i-1]) < 0x10000) perto++;
    ok(perto / (r.length - 1) < 0.05,
      `${perto} de ${r.length-1} raízes seguidas a menos de 2^16 de distância — o relógio vazou`);
  });

  s.teste('a raiz tem os 32 bits vivos', () => {
    const uns = new Array(32).fill(0), N = 4000;
    for (let i = 0; i < N; i++) {
      const v = novaRaiz();
      for (let b = 0; b < 32; b++) if ((v >>> b) & 1) uns[b]++;
    }
    uns.forEach((c, b) => ok(c / N > 0.44 && c / N < 0.56,
      `o bit ${b} vale 1 em ${(c/N*100).toFixed(1)}% das raízes — não é uniforme`));
  });

  s.teste('a raiz não repete em 20.000 sorteios', () => {
    const vistos = new Set();
    for (let i = 0; i < 20000; i++) vistos.add(novaRaiz());
    ok(20000 - vistos.size <= 5, `${20000 - vistos.size} raízes repetidas em 20.000`);
  });

  /* A rodada anterior é pública: seeds reveladas fazem parte do commit-reveal
     (Spec §25.2). Se a próxima raiz fosse derivável delas, o esquema inteiro
     cairia — dá para prever o vencedor antes de apostar. */
  s.teste('a raiz não é derivável da rodada anterior', () => {
    for (let i = 0; i < 2000; i++) {
      const anterior = novaRaiz();
      const s0 = sementes(anterior);
      const proxima = novaRaiz();
      const previsoes = [
        anterior, (anterior + 1) >>> 0, derivar(anterior, 'raiz'), derivar(anterior, 'proxima'),
        ...RAMOS.map(r => s0[r]), ...RAMOS.map(r => derivar(s0[r], r)),
      ];
      ok(!previsoes.includes(proxima),
        `a raiz ${proxima} saiu da rodada anterior ${anterior}`);
    }
  });

  return s;
}
