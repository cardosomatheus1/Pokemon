/* PRÉ-VOO DO PORTÃO Q2 — o que se lê em 0,1 s não se descobre em 12 min.
 *
 * A sabotagem monta caixa de areia, planta o defeito e roda a suíte. Se o
 * defeito não pôde ser plantado, tudo isso foi trabalho para nada — e a
 * descoberta chega depois, no relatório, misturada com os defeitos que
 * realmente escaparam.
 *
 * O V1.14 pagou essa conta duas vezes no mesmo bloco:
 *
 *   · a lista de arquivos era escrita à mão e não conhecia dois módulos novos.
 *     A execução morreu com TypeError no defeito 70. Sete minutos.
 *   · o S15 plantava a remoção de um `import` do `render.mjs`, e o bloco tinha
 *     movido esse import para outro módulo. O defeito continuava na lista,
 *     verde, provando nada. Doze minutos para descobrir.
 *
 * Os dois são estáticos. Este arquivo os extrai antes de qualquer sandbox.
 *
 * O LEITOR É INJETADO de propósito. Sem isso, testar esta função exigiria
 * arquivos de verdade no disco, e o teste passaria a falhar toda vez que
 * alguém editasse uma linha do jogo — o que faria dele um obstáculo, não uma
 * rede. Ver `test/portao.mjs`.
 */

/* Quatro coisas tornam um defeito plantado inútil, e nenhuma delas aparece
   como falha: todas aparecem como VERDE, que é o pior jeito de falhar. */
export function conferirAncoras(defeitos, ler) {
  const problemas = [];
  const vistos = new Set();

  for (const d of defeitos) {
    if (vistos.has(d.id))
      problemas.push({ id: d.id, arquivo: d.arquivo, tipo: 'ID REPETIDO',
        detalhe: 'dois defeitos com o mesmo id — o relatório vira ambíguo' });
    vistos.add(d.id);

    /* `de === para` roda a suíte inteira, duas vezes, para provar que nada
       muda. É o defeito que sempre "escapa", e por construção. */
    if (d.de === d.para) {
      problemas.push({ id: d.id, arquivo: d.arquivo, tipo: 'INÓCUO',
        detalhe: '`de` e `para` são iguais — o defeito não altera nada' });
      continue;
    }

    let src;
    try { src = ler(d.arquivo); }
    catch (e) {
      problemas.push({ id: d.id, arquivo: d.arquivo, tipo: 'ARQUIVO ILEGÍVEL',
        detalhe: String(e.message || e).split('\n')[0] });
      continue;
    }

    /* Contar, e não só perguntar se existe. Âncora que casa em dois lugares
       planta no PRIMEIRO — que pode não ser o pretendido, e aí o defeito passa
       a testar outra coisa sem ninguém saber. */
    const n = src.split(d.de).length - 1;
    if (n === 0)
      problemas.push({ id: d.id, arquivo: d.arquivo, tipo: 'ÂNCORA AUSENTE',
        detalhe: `o trecho não existe mais — ${resumir(d.de)}` });
    else if (n > 1)
      problemas.push({ id: d.id, arquivo: d.arquivo, tipo: 'ÂNCORA AMBÍGUA',
        detalhe: `casa ${n} vezes; planta na primeira — ${resumir(d.de)}` });
  }
  return problemas;
}

const resumir = s => {
  const t = String(s).replace(/\n/g, '\\n');
  return t.length > 60 ? `"${t.slice(0, 60)}…"` : `"${t}"`;
};

/* MODO INCREMENTAL — roda só os defeitos que o bloco pode ter afetado.
 *
 * Serve à CONSTRUÇÃO, nunca ao fechamento: um bloco que mexe no `render.mjs`
 * pode quebrar um defeito ancorado na `coreografia.mjs`, e só a execução
 * completa vê isso. Quem chama é responsável por dizer, alto, que o relatório
 * é parcial — ver o aviso em `sabotagem.mjs`.
 *
 * SEM ARQUIVOS, DEVOLVE TUDO. É a direção segura: filtro que devolve demais
 * custa tempo, filtro que devolve de menos entrega relatório verde sobre
 * defeito que ninguém plantou. `git diff` vazio não pode virar portão vazio.
 */
export function filtrarTocados(defeitos, arquivos) {
  if (!arquivos || arquivos.length === 0) return defeitos.slice();
  const alvo = new Set(arquivos);
  return defeitos.filter(d => alvo.has(d.arquivo));
}

/* ── T14 · O Q2 DO BLOCO: o que ESTE bloco pode ter quebrado ──────────────
 *
 * O portão com cache reavaliava todo defeito cuja CHAVE mudou, e a chave inclui
 * o fecho da suíte captora. Mexer num arquivo que muitas suítes leem — o pack de
 * conteúdo, o `index.html`, um utilitário de teste — muda o fecho de centenas.
 *
 *     medido 25/09   o 1.33 tocou 32 arquivos
 *                    defeitos ANCORADOS neles       147
 *                    defeitos com a chave mudada    589     -> horas de portão
 *
 * Os 442 de diferença não foram plantados em nada que o bloco tocou. Eles
 * respondem a outra pergunta: "algum teste antigo e distante ficou decorativo?"
 * — o S15 do V1.14. Essa pergunta continua sendo feita, no Q2 COMPLETO (tag, ou
 * fatiado entre máquinas). O que muda é que ela deixa de travar o fecho de cada
 * bloco. Decisão do dono, 25/09/2026: "os testes precisam ser minutos".
 *
 * As três pilhas, e cada defeito cai em exatamente uma:
 *
 *   avaliar   ancorado em arquivo tocado, ou sem veredito guardado (defeito
 *             novo, ou que nunca foi pego). É o que o bloco pode ter quebrado
 *   reusar    a chave inteira confere: nada de que ele depende mudou. É a
 *             mesma garantia de sempre, sem aproximação
 *   adiar     só o fecho mudou. Fica para o Q2 completo, e o relatório CONTA —
 *             adiado não é pego, e não pode aparecer como pego */
/* ── T14c · TOCADO É O TRECHO, E NÃO O ARQUIVO (25/09/2026) ───────────────
 *
 * O 1.32b pôs uma legenda no `app/index.html`, e o Q2 do bloco passou a
 * avaliar TODO defeito ancorado nele — 130 mutantes, quase todos de navegador,
 * ~2,7 h. O arquivo tem milhares de linhas; a mudança, trinta. Um defeito
 * ancorado a mil linhas da mudança responde à mesma pergunta que o de fecho
 * mudado ("algo distante ficou decorativo?"), e vai para a mesma pilha: ADIADO,
 * contado, respondido no Q2 completo.
 *
 * `trechos` é arquivo -> lista de [início, fim] das linhas que o bloco mudou
 * (numeração do arquivo ATUAL), ou 'todo' para arquivo novo. Sem `trechos`, o
 * comportamento é o de antes: o arquivo inteiro conta como tocado. `ler` dá o
 * texto atual, para achar a linha da âncora. A margem cobre a vizinhança: a
 * regra CSS ao lado da que mudou é tocada; a do outro lado do arquivo, não. */
export const MARGEM_DO_TRECHO = 25;

export function trechosDoDiff(textoDiff) {
  const fora = new Map();
  let arq = null;
  for (const l of String(textoDiff ?? '').split('\n')) {
    const m = /^\+\+\+ (?:b\/)?(.+)$/.exec(l);
    if (m) { arq = m[1] === '/dev/null' ? null : m[1]; if (arq && !fora.has(arq)) fora.set(arq, []); continue; }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h && arq) {
      const ini = Number(h[1]), n = h[2] === undefined ? 1 : Number(h[2]);
      fora.get(arq).push([ini, ini + Math.max(n, 1) - 1]);
    }
  }
  return fora;
}

function linhasDaAncora(texto, de) {
  const i = String(texto ?? '').indexOf(de);
  if (i < 0) return null;
  const ini = texto.slice(0, i).split('\n').length;
  return [ini, ini + String(de).split('\n').length - 1];
}

function trechoTocado(d, trechos, ler) {
  const t = trechos.get(d.arquivo);
  if (t === 'todo') return true;
  if (!t) return false;
  const a = linhasDaAncora(ler(d.arquivo), d.de);
  if (!a) return true;                     /* âncora que não acho: na dúvida, avalia */
  return t.some(([i, f]) => a[0] <= f + MARGEM_DO_TRECHO && a[1] >= i - MARGEM_DO_TRECHO);
}

export function escopoDoBloco({ defeitos, tocados, temVeredito, chaveConfere, trechos = null, ler = null }) {
  const alvo = new Set(tocados || []);
  const avaliar = [], reusar = [], adiar = [];
  const tocado = d => alvo.has(d.arquivo) && (!trechos || !ler || trechoTocado(d, trechos, ler));
  for (const d of defeitos) {
    if (tocado(d) || !temVeredito(d)) avaliar.push(d);
    else if (chaveConfere(d)) reusar.push(d);
    else adiar.push(d);
  }
  return { avaliar, reusar, adiar };
}

/* ── T14 · O Q2 COMPLETO EM FATIAS ────────────────────────────────────────
 *
 * O Q2 frio custou 453 min numa máquina (T13, 16/09). A fatia divide os
 * defeitos em N partes DISJUNTAS e que cobrem tudo, para N máquinas ou N
 * sessões rodarem ao mesmo tempo; o cache é mesclado por id, então as fatias
 * juntam sozinhas. A partição é pelo ÍNDICE na lista, e não por sorteio: a
 * mesma fatia pede sempre os mesmos defeitos, e fatia repetida reaproveita. */
export function fatiar(defeitos, k, n) {
  if (!(n >= 1) || !(k >= 1) || k > n) throw new Error(`fatia inválida: ${k}/${n}`);
  return defeitos.filter((_, i) => i % n === k - 1);
}
