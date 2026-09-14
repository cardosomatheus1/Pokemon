/* AS CAIXAS DE AREIA DO Q2 — criação, preservação e remoção.
 *
 * Extraído de `test/sabotagem.mjs` no bloco 0.3, para fechar o `D-036`. Lá a
 * remoção era uma linha no fim do caminho feliz, e por isso:
 *
 *   · o portão que ABORTA saía antes dela, e as caixas ficavam;
 *   · a `CAIXA_BASE` sai da lista por um `pop()`, então nunca era removida —
 *     nem no caminho feliz. Toda execução vazava pelo menos uma.
 *
 * Medido em 29/08, antes: **120 caixas órfãs, 3,25 GB**. A ficha do D-036 tinha
 * registrado 75 e 4,9 GB em 24/08, e o número só cresce.
 *
 * O CUSTO NÃO É O DISCO. O portão que está rodando disputa I/O com os restos
 * dos que não terminaram: a execução do R23 levou 31 min contra os 10 a 15
 * normais, com 75 cópias do repositório no mesmo diretório temporário. E aí os
 * defeitos se alimentam — mais lento dá mais janela para a instabilidade que
 * fez abortar aparecer de novo.
 *
 * ── POR QUE ISTO É UM MÓDULO, E NÃO CÓDIGO SOLTO NO SCRIPT ────────────────
 *
 * Porque a ficha do D-036 pede um teste, e o teste que ela descreve — "rodar o
 * portão de um jeito que aborte e conferir que o temporário não ganhou caixa" —
 * custa minutos e depende de sinal, que no Windows o Node não entrega de forma
 * confiável quando o processo é morto de fora.
 *
 * A regra em si é pequena e determinística: o que preservar, o que remover, e o
 * que é velho o bastante para ser órfão. Num módulo ela se testa em
 * milissegundos, com diretórios de mentira e carimbos de tempo escolhidos. O
 * que fica sem teste direto é o GANCHO — que `process.on('exit')` chama isto —,
 * e esse é coberto por defeito plantado. Ver a `L-056`.
 */
import { readdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';

export const PREFIXO = 'pokearena-sabotagem-';

/* SEIS HORAS, e o número é uma decisão, não um arredondamento.
 *
 * Apagar toda caixa antiga na entrada tem um custo que não é óbvio: a última
 * caixa preservada por um aborto pode ser justamente a que alguém está
 * investigando agora — o próprio portão imprime `reproduza com: cd <caixa>`.
 *
 * Seis horas é longo o bastante para uma investigação caber e curto o bastante
 * para o disco não acumular semanas. Quem quiser guardar por mais tempo copia a
 * caixa para fora do temporário, que é o que se faz com qualquer coisa que se
 * queira guardar num diretório chamado `Temp`. */
export const IDADE_DE_ORFA_MS = 6 * 60 * 60 * 1000;

/* Remove as caixas desta execução, menos as preservadas.
 *
 * NUNCA LANÇA. Ela roda de dentro de `process.on('exit')`, e uma exceção ali
 * troca o código de saída do portão — o que faria uma limpeza malsucedida
 * parecer um portão reprovado. Falhar em apagar é um problema; mentir sobre o
 * veredito do portão é outro, maior. */
export function limparCaixas(caixas, preservadas = new Set()) {
  let n = 0;
  for (const c of caixas) {
    if (!c || preservadas.has(c)) continue;
    try { rmSync(c, { recursive: true, force: true }); n++; } catch { /* ver acima */ }
  }
  return n;
}

/* Remove as caixas de execuções ANTERIORES que já passaram da idade.
 *
 * Consertar o vazamento não recupera as que já existem, e são elas que estão
 * ocupando o disco hoje — por isso esta função roda na ENTRADA do portão, e não
 * na saída.
 *
 * `agora` entra por parâmetro para o teste poder escolher o tempo em vez de
 * esperar seis horas. É a mesma razão pela qual o scheduler recebe `relogio()`,
 * e o `D-005` registra o preço de não fazer isso. */
export function limparOrfas(dir, { agora = Date.now(), idadeMs = IDADE_DE_ORFA_MS } = {}) {
  const removidas = [];
  let nomes;
  try { nomes = readdirSync(dir); }
  catch { return removidas; }   /* sem temporário legível não se aborta o portão */

  for (const nome of nomes) {
    if (!nome.startsWith(PREFIXO)) continue;
    const caminho = join(dir, nome);
    try {
      if (agora - statSync(caminho).mtimeMs < idadeMs) continue;
      rmSync(caminho, { recursive: true, force: true });
      removidas.push(nome);
    } catch { /* outra execução pode estar usando; deixa quieto */ }
  }
  return removidas;
}

/* Só para o teste: envelhecer um diretório sem esperar. Vive aqui, e não no
   teste, porque `utimesSync` com a unidade errada é o tipo de detalhe que se
   erra uma vez por arquivo — em segundos, e não em milissegundos. */
export function envelhecer(caminho, ms) {
  const t = (Date.now() - ms) / 1000;
  utimesSync(caminho, t, t);
}
