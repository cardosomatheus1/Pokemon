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
