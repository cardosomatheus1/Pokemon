/* Q1/Q3 · ARENAS — a arena sai da raiz da rodada, e não muda a batalha.
 *
 * O bloco V1.14 traz cinco cenários da v1.0 do porte. A parte que desenha só
 * se testa no navegador (Q5); a parte que pode estar ERRADA é a escolha, e
 * essa é aritmética pura:
 *
 *   1. sai da árvore de sementes, não de `Math.random` — senão "a mesma raiz
 *      reproduz a rodada" (Spec §P3) volta a ser falso para metade da tela, e
 *      a auditoria do §25.2 não fecha.
 *   2. sai de um RAMO PRÓPRIO, não do fluxo de enfeite — senão acrescentar uma
 *      partícula troca a arena da rodada.
 *   3. NÃO sai do ramo `batalha` — a arena é anunciada durante a aposta, e o
 *      ramo da batalha fica fechado até o revelar do §4.5.
 *   4. é cosmética: nenhuma arena entra em `simular`.
 */
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import { ARENAS, VEU_MAX, sortearArena, arenaPorChave } from '../app/modules/arenas-dados.mjs';
import { semearVisual, coreo, enfeite } from '../app/modules/sorte.mjs';
import { derivar, sementes } from '../engine/seed.mjs';
import { rng, simular } from '../app/modules/motor.mjs';
import { elenco, montarElenco } from '../app/modules/motor.mjs';
import { elencoDeterministico } from './harness.mjs';
import { readFileSync, readdirSync } from 'node:fs';

const CAMPOS = ['key', 'nome', 'emoji', 'peso', 'poeira'];

export function suite() {
  const s = criarSuite('arenas');

  s.teste('o catálogo tem as cinco arenas do porte, com chave única', () => {
    igual(ARENAS.length, 5, 'quantidade de arenas');
    const chaves = new Set(ARENAS.map(a => a.key));
    igual(chaves.size, 5, 'chaves distintas');
    for (const a of ARENAS)
      for (const c of CAMPOS)
        ok(a[c] !== undefined && a[c] !== '', `arena ${a.key} sem campo ${c}`);
  });

  /* Peso zero não é "arena rara": é arena que nunca sai, e nada na tela avisa.
     O teste existe porque o modo de falha é silencioso. */
  s.teste('nenhuma arena é inalcançável — todo peso é positivo', () => {
    for (const a of ARENAS) ok(a.peso > 0, `arena ${a.key} com peso ${a.peso}`);
  });

  s.teste('a mesma semente visual dá sempre a mesma arena', () => {
    for (let i = 0; i < 500; i++) {
      const v = derivar(i * 2654435761, 'visual');
      igual(sortearArena(v).key, sortearArena(v).key, `arena instável na semente ${i}`);
    }
  });

  /* O RECÁLCULO INDEPENDENTE é o que amarra a arena ao rótulo.
     Repetir a chamada só prova que a função é determinística — ela seria
     determinística em `derivar(v,'batalha')` também. Aqui a expectativa é
     construída de fora, a partir do rótulo que a decisão de projeto escolheu. */
  s.teste("a arena sai do rótulo 'arena' do ramo visual, e de nenhum outro", () => {
    const total = ARENAS.reduce((a, x) => a + x.peso, 0);
    const esperada = v => {
      let r = rng(derivar(v, 'arena'))() * total;
      for (const a of ARENAS) { r -= a.peso; if (r <= 0) return a.key; }
      return ARENAS[0].key;
    };
    let divergentes = 0;
    for (let i = 0; i < 400; i++) {
      const v = derivar(i * 40503 + 7, 'visual');
      if (sortearArena(v).key !== esperada(v)) divergentes++;
    }
    igual(divergentes, 0, 'arenas fora do rótulo esperado');
  });

  /* Um rótulo irmão precisa dar OUTRA coisa. Sem isto, `derivar(v,'arena')`
     poderia ter virado `derivar(v,'enfeite')` numa troca de string e o teste
     de cima passaria — ele recalcula com o mesmo rótulo que o código usa. */
  s.teste('trocar o rótulo mudaria a arena — os ramos não coincidem', () => {
    let iguais = 0;
    const total = ARENAS.reduce((a, x) => a + x.peso, 0);
    const porSemente = sem => {
      let r = rng(sem)() * total;
      for (const a of ARENAS) { r -= a.peso; if (r <= 0) return a.key; }
      return ARENAS[0].key;
    };
    for (let i = 0; i < 400; i++) {
      const v = derivar(i * 99991 + 3, 'visual');
      if (sortearArena(v).key === porSemente(derivar(v, 'enfeite'))) iguais++;
    }
    /* Com cinco arenas equiprováveis, dois ramos independentes coincidem em
       ~1/5 dos casos por acaso. Coincidir SEMPRE é o defeito. */
    ok(iguais < 400 * 0.45, `ramos 'arena' e 'enfeite' coincidem em ${iguais}/400 — provável mesmo rótulo`);
  });

  s.teste('as cinco saem, na proporção dos pesos', () => {
    const N = 20000, conta = Object.fromEntries(ARENAS.map(a => [a.key, 0]));
    for (let i = 0; i < N; i++) conta[sortearArena(derivar(i, 'visual')).key]++;
    const total = ARENAS.reduce((a, x) => a + x.peso, 0);
    for (const a of ARENAS) {
      ok(conta[a.key] > 0, `arena ${a.key} nunca saiu em ${N} rodadas`);
      /* Tolerância larga de propósito: o teste procura peso ignorado, não
         qualidade de PRNG — isso é trabalho do test/semente.mjs. */
      dentro(conta[a.key] / N, a.peso / total, 0.02, `frequência de ${a.key}`);
    }
  });

  /* A LIÇÃO REPETIDA (S30, S53, S65, S69): testar a peça não testa o encaixe.
     Aqui o encaixe é com `sorte.mjs`. Se o sorteio da arena consumir do fluxo
     de coreografia ou de enfeite, a arena passa a mexer no MOVIMENTO — e o
     defeito aparece como lutador entrando em ordem diferente, num lugar onde
     ninguém vai procurar arena. */
  s.teste('sortear a arena não move a coreografia nem o enfeite', () => {
    const v = derivar(20260819, 'visual');
    semearVisual(v);
    const limpo = { c: [], e: [] };
    for (let i = 0; i < 40; i++) { limpo.c.push(coreo()); limpo.e.push(enfeite()); }

    semearVisual(v);
    const sujo = { c: [], e: [] };
    for (let i = 0; i < 40; i++) {
      sortearArena(v);                     // intercalado de propósito
      sujo.c.push(coreo()); sortearArena(v); sujo.e.push(enfeite());
    }
    igual(sujo.c.join(','), limpo.c.join(','), 'fluxo da coreografia deslocado');
    igual(sujo.e.join(','), limpo.e.join(','), 'fluxo de enfeite deslocado');
  });

  /* Q3 · A ARENA É COSMÉTICA.
     Prova binária: a batalha sai de `S.seeds.batalha` e a arena de `visual`.
     Duas raízes escolhidas para dar ARENAS DIFERENTES com o MESMO elenco e o
     mesmo ramo de batalha produzem a mesma batalha, golpe a golpe. */
  s.teste('trocar a arena não muda a batalha', () => {
    const time = elencoDeterministico(elenco, montarElenco, 4242);
    const chaves = new Set();
    let batalha = null, conferidas = 0;
    for (let i = 0; i < 300 && conferidas < 60; i++) {
      const arv = sementes(i * 2246822519 + 11);
      const k = sortearArena(arv.visual).key;
      const w = simular(time, 0xC0FFEE, false);   // ramo batalha FIXO
      if (batalha === null) batalha = w;
      igual(w, batalha, `batalha mudou junto com a arena (${k})`);
      chaves.add(k); conferidas++;
    }
    ok(chaves.size >= 3, `só ${chaves.size} arenas distintas na amostra — teste sem força`);
  });

  /* Nenhum arquivo do motor pode conhecer BIOMA. É a fronteira do §P3 e da
     Content Layer: o motor é agnóstico à apresentação.

     A varredura procura as chaves e os nomes do catálogo, não a palavra
     "arena" — o motor usa "arena" desde sempre no sentido de campo de batalha
     (`ARENA_SIZE`, o dano de tempestade "em toda a arena"), e proibir a palavra
     transformaria o teste num obstáculo a renomear em vez de um invariante.
     O que não pode aparecer é `vulcao`, `Coliseu`, `Campo Gelado`: bioma dentro
     do motor é bioma que pode virar bônus de dano. */
  s.teste('o motor não sabe o que é um bioma', () => {
    const dir = new URL('../engine/', import.meta.url);
    /* A busca é por bioma USADO — chave entre aspas, chave como campo de
       objeto, ou o nome de exibição inteiro. Procurar a palavra solta daria
       falso positivo em prosa: o `engine.mjs` explica killstreak como "bola de
       neve", e um teste que proíbe metáfora vira obstáculo, não invariante. */
    const padroes = ARENAS.flatMap(a => [
      [new RegExp(`(['"\`])${a.key}\\1`), `a chave "${a.key}"`],
      [new RegExp(`\\b${a.key}\\s*:`),      `o campo ${a.key}:`],
      [new RegExp(a.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `o nome "${a.nome}"`],
    ]);
    for (const f of readdirSync(dir).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, dir), 'utf8');
      for (const [re, oque] of padroes)
        ok(!re.test(txt), `engine/${f} menciona ${oque}`);
      ok(!/arenas-dados|arenas\.mjs/.test(txt), `engine/${f} importa o catálogo de arenas`);
    }
  });

  s.teste('arenaPorChave devolve a arena, e null para chave inexistente', () => {
    igual(arenaPorChave('vulcao').nome, 'Cratera Vulcânica', 'chave conhecida');
    igual(arenaPorChave('lua'), null, 'chave inexistente');
  });

  /* O módulo de dados não pode encostar no DOM: ele é importado pelo Node
     nesta suíte, e um `document` no topo derrubaria a importação inteira. */
  s.teste('o catálogo não toca o DOM', () => {
    const txt = readFileSync(new URL('../app/modules/arenas-dados.mjs', import.meta.url), 'utf8');
    ok(!/\bdocument\b|\bwindow\b/.test(txt), 'arenas-dados.mjs referencia o DOM');
  });

  /* A pintura precisa cobrir o catálogo inteiro — chave sem pintura é rodada
     que abre com a arena em branco, e chave a mais é código morto. */
  s.teste('cada arena do catálogo tem pintura, e nenhuma sobra', () => {
    const txt = readFileSync(new URL('../app/modules/arenas.mjs', import.meta.url), 'utf8');
    const bloco = txt.match(/const PINTURA\s*=\s*\{([\s\S]*?)\n\}/);
    ok(bloco, 'arenas.mjs sem o mapa PINTURA');
    const pintadas = new Set([...bloco[1].matchAll(/^\s*(\w+)\s*:/gm)].map(m => m[1]));
    for (const a of ARENAS) ok(pintadas.has(a.key), `arena ${a.key} sem pintura`);
    igual(pintadas.size, ARENAS.length, 'pinturas sem arena correspondente');
  });

  /* --- o véu de cor (L-027) --------------------------------------------- */

  /* O QUE ESTE TESTE PROTEGE NÃO É O VÉU: É O CONTRASTE.
   *
   * Um véu forte é a maneira mais fácil de dar unidade cromática ao conjunto e
   * a mais fácil de tornar o campo ilegível — e quase ninguém reprova, porque
   * fica bonito. O item 9 da L-030 é exatamente essa reclamação vindo da
   * variante shiny: paleta alternativa com menos contraste contra o piso da
   * cratera. Subir o véu para "unificar melhor" agravaria o item que ele
   * deveria ajudar.
   *
   * Por isso o teto é regra e não convenção, e ele é medido: acima de ~0,10 de
   * alfa em `soft-light` a diferença de luminância entre o lutador e o piso cai
   * abaixo do que o olho separa a 22 px de sprite. */
  s.teste('toda arena tem véu, e nenhum passa do teto', () => {
    for (const a of ARENAS){
      ok(typeof a.brilho === 'string' && /^#[0-9a-f]{6}$/i.test(a.brilho),
        `arena ${a.key} sem cor de véu válida (veio "${a.brilho}")`);
      ok(typeof a.veu === 'number' && a.veu > 0,
        `arena ${a.key} com véu ${a.veu} — véu zerado é campo declarado e não construído, ` +
        `que é literalmente a L-027 de volta`);
      ok(a.veu <= VEU_MAX,
        `arena ${a.key} com véu ${a.veu}, acima do teto de ${VEU_MAX}. ` +
        `Véu forte une o conjunto comendo o contraste entre o lutador e o piso — ` +
        `ver o item 9 da L-030.`);
    }
  });

  /* `mix-blend-mode` é o que faz o véu unificar em vez de tingir. `multiply`
     apagaria as sombras do chão e `overlay` estouraria os claros do gelo — os
     dois foram testados no bloco e os dois pioram o que o véu veio resolver. */
  s.teste('o modo de mistura do véu é declarado e é um dos aceitos', () => {
    const ACEITOS = ['soft-light', 'overlay', 'color', 'hue'];
    for (const a of ARENAS)
      ok(ACEITOS.includes(a.mistura),
        `arena ${a.key} com mistura "${a.mistura}" — fora de ${ACEITOS.join('/')}`);
  });

  /* O véu tem que estar LIGADO. Um campo no catálogo que nenhuma linha lê é a
     forma exata da L-027: documentado e não construído. */
  s.teste('a pintura aplica o véu que o catálogo declara', () => {
    const txt = readFileSync(new URL('../app/modules/arenas.mjs', import.meta.url), 'utf8');
    ok(/--veuCor/.test(txt) && /--veuAlfa/.test(txt) && /--veuMistura/.test(txt),
      'arenas.mjs não aplica as três propriedades do véu');
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    ok(/id="veuArena"/.test(html), 'a camada do véu não existe na página');
    ok(/#veuArena\{[^}]*pointer-events:none/.test(html),
      'a camada do véu recebe clique — ela pinta a cena, não participa da interação');
  });

  return s;
}
