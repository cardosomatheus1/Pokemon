import { readFileSync } from 'node:fs';
/* Q1/Q3 · OS HABITANTES DO BIOMA (bloco 1.5f).
 *
 * ── O QUE ESTE MÓDULO PODE ESTRAGAR ───────────────────────────────────────
 *
 * Nada trava, nada lança, nada fica vermelho. O que ele estraga é a LEITURA da
 * cena — e essa é a classe que a suíte inteira não pega sozinha:
 *
 *   um Lapras na grama         o bioma perde a coerência que o dono exigiu
 *   um Machop boiando          idem, do outro lado
 *   três bichos na trilha      lê como obstáculo, não como morador
 *   todos piscando junto       o cenário vira letreiro de LED
 *   posição diferente a cada   um morador que muda de lugar é um fantasma
 *   abertura da aba
 *
 * A regra do dono está no ContentPack, em palavras: *"você precisa se atentar
 * aos detalhes onde cada coisa combina em qual bioma"*. Aqui ela vira número.
 *
 * ── A FRONTEIRA QUE ESTA SUÍTE TAMBÉM GUARDA ─────────────────────────────
 *
 * QUEM habita cada bioma é tema e mora no pack (§0.3) — a primeira versão do
 * módulo trazia a lista para `app/` e o portão `conteudo` reprovou. O teste do
 * pack confere a lista; este confere a COLOCAÇÃO.
 */
import { naTrilha, trilhaEm } from '../app/modules/composicao.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import { FAIXAS, ONDES, povoar, adornar, quadroDoHabitante, mistura,
         boiar, BOIA_AMPLITUDE, BOIA_PERIODO } from '../app/modules/fauna.mjs';
import { dentroDe } from '../app/modules/relevo.mjs';
import { plantaDo } from '../app/modules/mundo.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const T = 16;
const plantas = () => (kanto.biomas ?? []).map(b => plantaDo(kanto, b.id, {}));

export function suite() {
  const s = criarSuite('fauna');

  /* ── 1 · CADA UM NA SUA FAIXA ───────────────────────────────────────── */

  s.teste('quem é de água fica NA água, e quem é de terra fica FORA dela', () => {
    for (const pl of plantas()) {
      for (const h of povoar(pl, kanto, T)) {
        const linha = h.y / T - 1;
        if (h.onde === 'agua')
          ok(linha > pl.margem,
            `em "${pl.bioma}", um habitante de água caiu na linha ${linha}, e a água ` +
            `começa depois de ${pl.margem}. Um Lapras na grama e um Machop boiando ` +
            `são a mesma falha vista dos dois lados.`);
        if (h.onde === 'grama' || h.onde === 'trilha')
          ok(linha < pl.margem,
            `em "${pl.bioma}", um habitante de terra caiu na linha ${linha}, dentro ` +
            `da água (margem ${pl.margem})`);
      }
    }
  });

  s.teste('a grama NÃO inclui a trilha', () => {
    for (const pl of plantas()) {
      const [y0, y1] = FAIXAS.grama(pl);
      ok(y1 < pl.caminho,
        `em "${pl.bioma}" a faixa de grama vai até ${y1} e a trilha começa em ` +
        `${pl.caminho}. Bicho parado no meio da estrada lê como obstáculo, não ` +
        `como morador — três dos quatro da floresta ficaram enfileirados na areia ` +
        `antes desta correção.`);
      ok(y1 >= y0, `a faixa de grama de "${pl.bioma}" ficou invertida`);
    }
  });

  s.teste('quem é da trilha fica NA trilha', () => {
    for (const pl of plantas())
      for (const h of povoar(pl, kanto, T).filter(x => x.onde === 'trilha')) {
        /* A TRILHA CURVA (1.15). Quem é da trilha SEGUE a curva — parado na
           antiga linha reta, o habitante apareceria no meio do mato. */
        const linha = h.y / T - 1, col = Math.floor(h.x / T);
        const aqui = trilhaEm(pl.trilha, col, pl.caminho);
        ok(naTrilha(pl.trilha, col, linha, pl.caminho),
          `em "${pl.bioma}" um habitante de trilha caiu na linha ${linha}, e na ` +
          `coluna ${col} a trilha é ${aqui}-${aqui + 1}`);
      }
  });

  s.teste('ninguém sai pelas bordas do mundo', () => {
    for (const pl of plantas())
      for (const h of povoar(pl, kanto, T)) {
        ok(h.x - h.qw / 2 >= 0 && h.x + h.qw / 2 <= pl.cols * T,
          `em "${pl.bioma}", um habitante saiu pela lateral (x=${Math.round(h.x)})`);
        ok(h.y - h.qh >= 0, `em "${pl.bioma}", um habitante saiu pelo topo`);
      }
  });

  /* ── 2 · O LUGAR É SEMPRE O MESMO LUGAR ─────────────────────────────── */

  s.teste('o mesmo bioma abre com os mesmos moradores nos mesmos lugares', () => {
    for (const pl of plantas()) {
      const a = povoar(pl, kanto, T), b = povoar(pl, kanto, T);
      igual(a.map(h => `${h.arq}@${h.x},${h.y}`).join(';'),
            b.map(h => `${h.arq}@${h.x},${h.y}`).join(';'),
        `"${pl.bioma}" povoou diferente em duas chamadas. Um morador que muda de ` +
        'lugar a cada abertura é um fantasma — e numa prévia que muda sozinha o ' +
        'dono não consegue dizer "esse aqui sai".');
    }
  });

  s.teste('biomas diferentes não têm a mesma coreografia', () => {
    const assinaturas = plantas().map(pl =>
      povoar(pl, kanto, T).map(h => `${h.x},${h.y}`).join(';'));
    igual(new Set(assinaturas).size, assinaturas.length,
      'dois biomas povoaram nas MESMAS posições. Repetido, vira papel de parede.');
  });

  /* ── 3 · CADA UM COM A SUA FASE ─────────────────────────────────────── */

  s.teste('os habitantes não trocam de quadro todos juntos', () => {
    for (const pl of plantas()) {
      const hs = povoar(pl, kanto, T);
      if (hs.length < 2) continue;
      const fases = new Set(hs.map(h => quadroDoHabitante(h, 1234, 3)));
      ok(fases.size > 1,
        `em "${pl.bioma}" todos os ${hs.length} habitantes estão no mesmo quadro. ` +
        'Sem fase própria o bioma inteiro pisca junto e vira letreiro.');
    }
  });

  s.teste('o quadro nunca sai da tira', () => {
    const pl = plantas()[0];
    for (const h of povoar(pl, kanto, T))
      for (const n of [1, 3, 6, 9])
        for (const t of [0, 999, 12345, 1e6]) {
          const q = quadroDoHabitante(h, t, n);
          ok(q >= 0 && q < n,
            `quadro ${q} fora de [0,${n}) — desenharia pedaço do vizinho`);
        }
  });

  /* ── 4 · OS PROPS ───────────────────────────────────────────────────── */

  s.teste('nenhum prop cai na trilha nem na água', () => {
    for (const pl of plantas())
      for (const a of adornar(pl, kanto, T)) {
        const linha = a.y / T - 1;
        ok(linha !== pl.caminho && linha !== pl.caminho + 1,
          `em "${pl.bioma}" um prop caiu na trilha — chão pisado é chão limpo`);
        ok(linha < pl.margem,
          `em "${pl.bioma}" um prop caiu na água (linha ${linha})`);
      }
  });

  s.teste('algum prop fica NA FRENTE, em pelo menos um bioma', () => {
    const frente = plantas().reduce((a, pl) =>
      a + adornar(pl, kanto, T).filter(x => x.frente).length, 0);
    ok(frente > 0,
      'nenhum prop ficou na camada da frente. Em overworld de verdade alguma ' +
      'coisa sempre passa na frente dos pés, e é isso que faz o personagem estar ' +
      'DENTRO da cena em vez de sobre ela.');
  });

  /* ── 5 · A LISTA DO PACK É COERENTE ─────────────────────────────────── */

  s.teste('todo bioma do pack tem habitantes, e são poucos', () => {
    for (const b of (kanto.biomas ?? [])) {
      const lista = kanto.fauna?.[b.id] ?? [];
      ok(lista.length >= 3,
        `"${b.id}" tem ${lista.length} habitantes. Bioma vazio é mapa, não lugar.`);
      ok(lista.length <= 6,
        `"${b.id}" tem ${lista.length} habitantes. A regra do dono é curadoria, ` +
        'não volume: cenário cheio de criatura não parece vivo, parece zoológico ' +
        '— e some com o traje, que é o que o jogador escolheu.');
    }
  });

  s.teste('todo habitante declara uma faixa que existe', () => {
    for (const [bioma, lista] of Object.entries(kanto.fauna ?? {}))
      for (const f of lista)
        ok(ONDES.includes(f.onde),
          `em "${bioma}", "${f.arq}" declara a faixa "${f.onde}", que não existe. ` +
          'Sem faixa válida ele cai na grama e o bioma perde a coerência.');
  });

  s.teste('o que está fora do pack não aparece na lista dele', () => {
    const fora = new Set(kanto.faunaFora ?? []);
    for (const [bioma, lista] of Object.entries(kanto.fauna ?? {}))
      for (const f of lista)
        ok(!fora.has(f.arq),
          `"${f.arq}" está na lista de "${bioma}" E na lista de fora do pack. ` +
          'Num pack de Kanto, arte de outra região denuncia — e o dono é o ' +
          'primeiro a notar esse tipo de coisa.');
  });


  /* ── 5 · QUEM ESTÁ DENTRO DO LAGO ───────────────────────────────────────
   *
   * O pedido do dono foi literal, e tem duas metades: *"um laguinho no meio com
   * um pokémon de água se refrescando"*. O lago chegou no 1.5j; o morador é
   * esta parte, e sem ele o lago é uma poça decorativa.
   *
   * O modo de falha que estes testes existem para impedir é UM SÓ, e é o mesmo
   * que o dono já nomeou noutro contexto — *"nada de Staryu no meio da
   * floresta"*: um bicho de água pousado na grama porque o bioma daquela vez
   * não sorteou lago nenhum. É pior que não ter o bicho. */

  s.teste('quem é do lago cai DENTRO do lago, e não na margem dele', () => {
    for (const pl of plantas()) {
      const lagos = (pl.relevo ?? []).filter(a => a.forma === 'lago');
      for (const h of povoar(pl, kanto, T).filter(x => x.onde === 'lago')) {
        ok(lagos.some(l => dentroDe(l, h.x, h.y)),
          `em "${pl.bioma}", "${h.arq}" é do lago e caiu em (${h.x}, ${h.y}), ` +
          `que não está dentro de nenhum dos ${lagos.length} lagos. Um Psyduck ` +
          'na grama ao lado da água lê como bicho perdido, não como morador.');
      }
    }
  });

  s.teste('bioma sem lago não recebe morador de lago em terra firme', () => {
    for (const pl of plantas()) {
      const seco = { ...pl, relevo: [] };
      igual(povoar(seco, kanto, T).filter(x => x.onde === 'lago').length, 0,
        `"${pl.bioma}" sem lago mesmo assim colocou alguém em faixa de lago. ` +
        'Sem água, o morador de água some — ele não desce para a grama.');
    }
  });

  s.teste('planta sem relevo nenhum não inventa um lago para pôr o bicho', () => {
    for (const pl of plantas()) {
      const nu = { ...pl }; delete nu.relevo;
      igual(povoar(nu, kanto, T).filter(x => x.onde === 'lago').length, 0,
        `"${pl.bioma}" sem campo \`relevo\` produziu morador de lago. O módulo ` +
        'estaria adivinhando onde a água está, e ela não estaria lá.');
    }
  });

  s.teste('todo bioma que tem lago tem alguém dentro dele', () => {
    for (const pl of plantas()) {
      if (!(pl.relevo ?? []).some(a => a.forma === 'lago')) continue;
      ok(povoar(pl, kanto, T).some(h => h.onde === 'lago'),
        `"${pl.bioma}" tem lago e ninguém dentro. O pedido do dono era o par: ` +
        'o laguinho E o bicho se refrescando nele. Água parada e vazia no meio ' +
        'do mapa lê como buraco no cenário.');
    }
  });


  s.teste('o morador do lago não fica no centro exato dele', () => {
    let vistos = 0;
    const raios = [];
    for (const pl of plantas()) {
      const lagos = (pl.relevo ?? []).filter(a => a.forma === 'lago');
      for (const h of povoar(pl, kanto, T).filter(x => x.onde === 'lago')) {
        const l = lagos.find(x => dentroDe(x, h.x, h.y)) ?? lagos[0];
        const dx = (h.x - l.x) / l.rx, dy = (h.y - l.y) / l.ry;
        const d = Math.hypot(dx, dy);
        vistos++;
        raios.push(d);
        ok(d > 0.02,
          `em "${pl.bioma}", "${h.arq}" caiu a ${d.toFixed(3)} do centro do lago — ` +
          'ou seja, no centro. Centralizado ele lê como alfinete marcando a água, ' +
          'e não como bicho que estava ali. É a diferença entre pôr na cena e morar nela.');
      }
    }
    ok(vistos >= 3, `só ${vistos} moradores de lago no acervo inteiro; esperava ao menos 3.`);
    ok(new Set(raios.map(r => r.toFixed(2))).size > 1,
      'todos os moradores de lago caíram à mesma distância do centro. ' +
      'Distância única é um anel desenhado, não uma colocação.');
  });

  /* ── 6 · A BOIA ─────────────────────────────────────────────────────────
   *
   * "Se refrescando" é um verbo, e verbo precisa de movimento. Um sprite parado
   * sobre a água lê como sprite CAÍDO na água — foi exatamente a leitura que o
   * dono deu ao companheiro estático, quatro vezes seguidas.
   *
   * A fase vem do RELÓGIO, como a de todo habitante, e não da distância: quem
   * boia não anda. É a mesma regra que separa `quadroDoHabitante` do
   * `quadroDe` do treinador. */

  s.teste('quem boia sobe E desce — não fica só subindo', () => {
    const h = { boia: true, fase: 0 };
    let alto = false, baixo = false;
    for (let t = 0; t < BOIA_PERIODO; t += 40) {
      const { dy } = boiar(h, t);
      if (dy < -0.4) alto = true;
      if (dy > 0.4) baixo = true;
      ok(Math.abs(dy) <= BOIA_AMPLITUDE + 1e-9,
        `a boia saiu ${dy.toFixed(2)} px, além da amplitude ${BOIA_AMPLITUDE}. ` +
        'Passando disso o bicho descola da água em vez de balançar nela.');
    }
    ok(alto && baixo,
      'a boia não cobriu os dois lados do ciclo em um período inteiro. ' +
      'Movimento de um lado só não é boiar, é subir.');
  });

  s.teste('quem não é do lago não boia', () => {
    for (const t of [0, 137, 991, 2399]) {
      igual(boiar({ boia: false }, t).dy, 0,
        'um habitante de terra recebeu deslocamento de boia. Um Machop ' +
        'oscilando na grama é o mesmo erro do Lapras na grama, mais sutil.');
      igual(boiar(undefined, t).dy, 0, 'boiar(undefined) precisa ser inerte.');
    }
  });

  s.teste('a onda é mais larga quando o corpo afunda', () => {
    const h = { boia: true, fase: 0 };
    let maiorRaio = -Infinity, dyNoMaior = 0;
    let menorRaio = Infinity, dyNoMenor = 0;
    for (let t = 0; t < BOIA_PERIODO; t += 20) {
      const { dy, raio } = boiar(h, t);
      if (raio > maiorRaio) { maiorRaio = raio; dyNoMaior = dy; }
      if (raio < menorRaio) { menorRaio = raio; dyNoMenor = dy; }
    }
    ok(dyNoMaior > dyNoMenor,
      `a onda mais larga (raio ${maiorRaio.toFixed(2)}) apareceu com o corpo em ` +
      `${dyNoMaior.toFixed(2)} e a mais estreita com ele em ${dyNoMenor.toFixed(2)}. ` +
      'Em fase, onda e corpo viram um só pulso e a água some da leitura: ' +
      'é o afundar que empurra a água para fora.');
    ok(maiorRaio > menorRaio,
      'o raio da onda não varia. Anel de tamanho fixo lê como sombra, e ' +
      'sombra debaixo d\'água não explica nada.');
  });

  s.teste('a fase separa dois moradores de lago no mesmo instante', () => {
    const a = boiar({ boia: true, fase: 0 }, 600);
    const b = boiar({ boia: true, fase: 0.5 }, 600);
    ok(Math.abs(a.dy - b.dy) > 0.5,
      'dois bichos com fases opostas boiaram juntos. Sincronia é o defeito ' +
      'que a suíte já pegou na piscada dos habitantes do vulcão — cenário ' +
      'inteiro no mesmo compasso vira letreiro de LED.');
  });

  /* ══ ST-2.4 · A FAUNA SABE QUE É NOITE (L-184) ════════════════════════
   * O 1.33 fez a WAVE noturna; os moradores de enfeite continuavam os mesmos,
   * acordados, sob a lua. A regra é a MESMA tabela do elenco
   * (`preferenciasDaNoite`), para os dois nunca discordarem: quem a noite
   * desfavorece dorme; quem ela favorece, ou é neutro, segue acordado. */
  s.teste('ST-2.4: quem a noite desfavorece dorme; quem ela favorece, não', async () => {
    const { dormeANoite, tiposDoMorador } = await import('../app/modules/fauna.mjs');
    ok(dormeANoite(kanto, ['bug']), 'um inseto ficou acordado à noite');
    ok(dormeANoite(kanto, ['normal', 'flying']), 'o Pidgey (normal) ficou acordado');
    igual(dormeANoite(kanto, ['ghost']), false, 'o fantasma dormiu — ele é da noite');
    igual(dormeANoite(kanto, ['grass', 'poison']), false, 'o Oddish dormiu — o veneno é da noite, e favorecer vence');
    igual(dormeANoite(kanto, ['water']), false, 'o neutro dormiu');
    igual(dormeANoite({}, ['bug']), false, 'sem tabela no pack, alguém dormiu — a regra inventou dado');
    ok(tiposDoMorador(kanto, 'ow_pidgey').includes('normal'), 'o morador não achou a própria espécie');
    igual(tiposDoMorador(kanto, 'ow_inexistente').length, 0, 'morador sem espécie ganhou tipo');
    const src = readFileSync(new URL('../app/modules/fauna.mjs', import.meta.url), 'utf8');
    ok(/preferenciasDaNoite/.test(src), 'a fauna tem regra de noite própria — ela e o elenco vão discordar');
  });

  s.teste('ST-2.4: o povoamento carrega o tipo de cada morador', () => {
    const planta = plantaDo(kanto, 'floresta');
    const hs = povoar(planta, kanto, 16);
    ok(hs.length > 0 && hs.every(h => Array.isArray(h.tipos)), 'o morador saiu sem a lista de tipos');
    ok(hs.some(h => h.tipos.length), 'nenhum morador da floresta achou a própria espécie');
  });

  s.teste('ST-2.4: quem dorme fica parado, e o "Zz" sobe e some em ciclo', async () => {
    const { zzDoHabitante } = await import('../app/modules/fauna.mjs');
    const h = { fase: 0.3 };
    for (let t = 0; t < 5000; t += 137) igual(quadroDoHabitante(h, t, 3, true), 0, 'quem dorme continuou animando');
    ok(new Set([0, 300, 600, 900].map(t => quadroDoHabitante(h, t, 3, false))).size > 1, 'acordado, o morador parou');
    const a = zzDoHabitante(h, 0), b = zzDoHabitante(h, 1000);
    ok(a.alfa >= 0 && a.alfa <= 1 && b.alfa >= 0 && b.alfa <= 1, 'o alfa do Zz saiu de [0, 1]');
    ok(b.dy !== a.dy, 'o Zz não sobe');
  });

  s.teste('ST-2.4: a tela pergunta à fauna se é noite, e pelo relógio do MUNDO', () => {
    const hab = readFileSync(new URL('../app/modules/idle-habitantes.mjs', import.meta.url), 'utf8');
    ok(/dormeANoite\(/.test(hab) && /zzDoHabitante\(/.test(hab), 'os habitantes não dormem na tela');
    ok(/if \(periodoEm\(agoraDoMundo\) === 'noite'\) desenharSono\(gb,/.test(
         readFileSync(new URL('../app/modules/idle-mundo.mjs', import.meta.url), 'utf8')),
      'o "Zz" não sai no canvas do brilho — sob a luz da noite o escuro o engole');
    const mundo = readFileSync(new URL('../app/modules/idle-mundo.mjs', import.meta.url), 'utf8');
    ok(/desenharHabitantes\([^;]*periodoEm\(agoraDoMundo\) === 'noite'\)/.test(mundo),
      'o mundo não diz aos habitantes que é noite — ou diz por outro relógio que não o da luz');
    igual((mundo.match(/relogioDoMundo\(Date\.now\(\)\)/g) ?? []).length, 1,
      'o mundo lê o relógio mais de uma vez por quadro — a fauna e a luz podem discordar, e o S1021 escapa');
  });
  return s;
}
