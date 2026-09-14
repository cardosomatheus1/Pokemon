/* Q1 · AS CAIXAS DE AREIA DO Q2 (bloco 0.3, fecha o D-036).
 *
 * O portão Q2 copia o repositório para caixas de areia em `tmpdir()`. A remoção
 * delas vivia numa linha no FIM do caminho feliz, e por isso:
 *
 *   · aborto saía antes dela e as caixas ficavam;
 *   · a `CAIXA_BASE` sai da lista por um `pop()` e nunca era removida — nem
 *     quando dava tudo certo. Toda execução vazava pelo menos uma.
 *
 * Medido em 29/08, antes da correção: 120 caixas órfãs, 3,25 GB.
 *
 * O que se mede aqui é a REGRA — o que preservar, o que remover, o que já é
 * velho o bastante. O gancho que a chama (`process.on('exit')`) é coberto por
 * defeito plantado, e a `L-056` registra por que não há teste direto dele.
 */
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarSuite, ok, igual } from './harness.mjs';
import { limparCaixas, limparOrfas, envelhecer, PREFIXO, IDADE_DE_ORFA_MS } from './caixas.mjs';

/* Um temporário PRÓPRIO por teste, e não o `tmpdir()` de verdade.
 *
 * Apontar estes testes para o temporário real os faria apagar as caixas de um
 * portão rodando em paralelo — e um teste que sabota a execução vizinha é pior
 * que teste ausente. */
const areia = () => mkdtempSync(join(tmpdir(), 'pokearena-t-caixas-'));

function caixaFalsa(raiz, sufixo = Math.random().toString(36).slice(2, 8)) {
  const c = join(raiz, PREFIXO + sufixo);
  mkdirSync(c, { recursive: true });
  /* Com conteúdo: `rmSync` sem `recursive` funciona em diretório vazio e falha
     em diretório cheio, e é o segundo caso que acontece de verdade. */
  mkdirSync(join(c, 'app'), { recursive: true });
  writeFileSync(join(c, 'app', 'index.html'), '<!-- caixa -->');
  return c;
}

export function suite() {
  const s = criarSuite('caixas');

  s.teste('limparCaixas remove todas as caixas da execução', () => {
    const raiz = areia();
    try {
      const cs = [caixaFalsa(raiz), caixaFalsa(raiz), caixaFalsa(raiz)];
      igual(limparCaixas(cs), 3, 'não removeu as três');
      for (const c of cs) ok(!existsSync(c), `${c} sobreviveu à limpeza`);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  /* A CAIXA QUE O ABORTO QUER MOSTRAR NÃO PODE SUMIR.
     O portão imprime `reproduza com: cd <caixa>` quando aborta, e essa linha é
     o diagnóstico inteiro. Uma limpeza cega apagaria exatamente o que se quer
     olhar quando deu errado — e transformaria a instrução numa mentira. */
  s.teste('limparCaixas NÃO remove a caixa preservada para diagnóstico', () => {
    const raiz = areia();
    try {
      const guardar = caixaFalsa(raiz), some1 = caixaFalsa(raiz), some2 = caixaFalsa(raiz);
      igual(limparCaixas([guardar, some1, some2], new Set([guardar])), 2,
        'removeu quantidade diferente das duas não preservadas');
      ok(existsSync(guardar),
        'a caixa preservada foi apagada. O aborto imprime "reproduza com: cd ' +
        '<caixa>" e a instrução passaria a apontar para um diretório que não existe.');
      ok(!existsSync(some1) && !existsSync(some2), 'as outras duas ficaram');
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  /* A `CAIXA_BASE` É O VAZAMENTO DO CAMINHO FELIZ, e por isso tem teste
     próprio: ela sai da lista por um `pop()` no `sabotagem.mjs`, então quem
     limpasse só a lista deixaria uma caixa por execução BEM-SUCEDIDA. */
  s.teste('uma caixa fora da lista principal também é removida', () => {
    const raiz = areia();
    try {
      const lista = [caixaFalsa(raiz)];
      const base = caixaFalsa(raiz);          // o `pop()` do portão
      limparCaixas([...lista, base]);
      ok(!existsSync(base),
        'a caixa base sobreviveu. É o vazamento que acontecia mesmo quando o ' +
        'portão terminava bem — uma caixa por execução, para sempre.');
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  s.teste('limparCaixas nunca lança, mesmo com caminho que não existe', () => {
    /* Ela roda de dentro de `process.on('exit')`. Uma exceção ali troca o
       código de saída do portão, e uma limpeza malsucedida passaria a parecer
       um portão REPROVADO. */
    const r = limparCaixas([join(tmpdir(), PREFIXO + 'nao-existe-mesmo'), null, undefined]);
    igual(typeof r, 'number', 'devolveu algo que não é contagem');
  });

  /* --- as órfãs de execuções anteriores ----------------------------------- */

  s.teste('limparOrfas remove o que já passou da idade', () => {
    const raiz = areia();
    try {
      const velha = caixaFalsa(raiz, 'velha');
      envelhecer(velha, IDADE_DE_ORFA_MS + 60_000);
      const removidas = limparOrfas(raiz);
      igual(removidas.length, 1, `removeu ${removidas.length} em vez de 1`);
      ok(!existsSync(velha), 'a caixa velha ficou');
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  /* A METADE QUE PROTEGE QUEM ESTÁ INVESTIGANDO. Sem ela, abrir o portão
     apagaria a caixa que o aborto anterior preservou — e a pessoa que foi olhar
     voltaria para um diretório vazio. */
  s.teste('limparOrfas NÃO remove caixa recente', () => {
    const raiz = areia();
    try {
      const nova = caixaFalsa(raiz, 'nova');
      igual(limparOrfas(raiz).length, 0, 'removeu uma caixa recente');
      ok(existsSync(nova),
        'a caixa recém-criada foi apagada. Ela pode ser a que o último aborto ' +
        'preservou, e alguém pode estar dentro dela agora.');
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  s.teste('limparOrfas ignora diretório que não é caixa', () => {
    const raiz = areia();
    try {
      const alheio = join(raiz, 'coisa-de-outra-pessoa');
      mkdirSync(alheio); envelhecer(alheio, IDADE_DE_ORFA_MS * 10);
      igual(limparOrfas(raiz).length, 0, 'apagou diretório que não é caixa de areia');
      ok(existsSync(alheio),
        `apagou ${alheio}. Este código roda no temporário do sistema, onde mora ` +
        `coisa de todo mundo — o prefixo é a única coisa que separa "nosso" de ` +
        `"de alguém".`);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  s.teste('limparOrfas devolve lista vazia quando o diretório não existe', () => {
    igual(limparOrfas(join(tmpdir(), 'pokearena-nao-existe-de-jeito-nenhum')).length, 0,
      'lançou ou devolveu algo inesperado — sem temporário legível o portão não ' +
      'pode abortar: limpeza é conveniência, não requisito da sabotagem');
  });

  return s;
}
