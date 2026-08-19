/* Q1 · O PORTÃO CONFERE A SI MESMO.
 *
 * O V1.14 gastou 19 dos 53 minutos de portão numa classe só de erro, e as duas
 * vezes pelo mesmo motivo: a sabotagem só descobre que um defeito está
 * quebrado DEPOIS de montar caixa de areia e rodar a suíte inteira.
 *
 *   · a lista de arquivos não conhecia dois módulos novos  → morreu no defeito
 *     70, sete minutos jogados fora
 *   · o S15 tinha perdido a âncora quando o desenho semeado saiu do render.mjs
 *     → doze minutos para descobrir o que se lê em 0,1 s
 *
 * As duas informações são estáticas. Este arquivo testa as funções que as
 * extraem antes de qualquer sandbox existir.
 *
 * POR QUE ISTO É TESTE E NÃO SÓ CÓDIGO: um pré-voo que deixa passar é PIOR que
 * nenhum, porque dá a impressão de que as âncoras foram conferidas. O defeito
 * S79 planta exatamente isso.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { conferirAncoras, filtrarTocados } from './ancoras.mjs';

/* Leitor injetado: o teste não pode depender do conteúdo real dos módulos,
   senão passa a falhar toda vez que alguém edita uma linha do jogo. */
const leitor = mapa => f => {
  if (!(f in mapa)) throw new Error(`ENOENT ${f}`);
  return mapa[f];
};

export function suite() {
  const s = criarSuite('portao');

  s.teste('âncora presente uma vez: nenhum problema', () => {
    const probs = conferirAncoras(
      [{ id:'X1', arquivo:'a.mjs', de:'const teto = 50;', para:'const teto = 51;' }],
      leitor({ 'a.mjs': 'linha\nconst teto = 50;\noutra\n' }));
    igual(probs.length, 0, `problemas inesperados: ${JSON.stringify(probs)}`);
  });

  /* O caso do S15: o trecho onde o defeito morava deixou de existir. O defeito
     continua na lista, verde, provando nada. */
  s.teste('âncora ausente é apontada, com o id', () => {
    const probs = conferirAncoras(
      [{ id:'X2', arquivo:'a.mjs', de:"import { rng } from './motor.mjs';\n", para:'' }],
      leitor({ 'a.mjs': 'nada aqui\n' }));
    igual(probs.length, 1, 'âncora ausente passou');
    igual(probs[0].id, 'X2', 'problema sem id');
    ok(/AUSENTE/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  /* Âncora que casa em dois lugares planta o defeito no PRIMEIRO, que pode não
     ser o pretendido — e aí o defeito testa outra coisa sem ninguém saber. */
  s.teste('âncora ambígua é apontada, com a contagem', () => {
    const probs = conferirAncoras(
      [{ id:'X3', arquivo:'a.mjs', de:'peso:20', para:'peso:0' }],
      leitor({ 'a.mjs': 'peso:20 e peso:20 de novo' }));
    igual(probs.length, 1, 'âncora ambígua passou');
    ok(/AMBÍGUA/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
    ok(/2/.test(probs[0].detalhe), `detalhe sem a contagem: "${probs[0].detalhe}"`);
  });

  /* O caso que matou a execução #1: arquivo que a lista de defeitos nomeia e
     ninguém consegue ler. Antes isso era um TypeError no defeito 70. */
  s.teste('arquivo ilegível é apontado, e não derruba a conferência', () => {
    const probs = conferirAncoras(
      [{ id:'X4', arquivo:'sumiu.mjs', de:'x', para:'y' },
       { id:'X5', arquivo:'a.mjs',     de:'x', para:'y' }],
      leitor({ 'a.mjs': 'x' }));
    igual(probs.length, 1, `esperado só o ilegível, veio ${JSON.stringify(probs)}`);
    ok(/ILEGÍVEL/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  /* Defeito que não muda nada roda a suíte inteira para provar zero. */
  s.teste('defeito que não altera nada é apontado', () => {
    const probs = conferirAncoras(
      [{ id:'X6', arquivo:'a.mjs', de:'igual', para:'igual' }],
      leitor({ 'a.mjs': 'igual' }));
    igual(probs.length, 1, 'defeito inócuo passou');
    ok(/INÓCUO/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  s.teste('id repetido é apontado — dois defeitos com o mesmo nome no relatório', () => {
    const probs = conferirAncoras(
      [{ id:'X7', arquivo:'a.mjs', de:'a', para:'b' },
       { id:'X7', arquivo:'a.mjs', de:'b', para:'c' }],
      leitor({ 'a.mjs': 'a b' }));
    ok(probs.some(p => /REPETIDO/.test(p.tipo)), `nenhum id repetido apontado: ${JSON.stringify(probs)}`);
  });

  /* --- o filtro do modo incremental ------------------------------------- */

  s.teste('o filtro devolve só os defeitos dos arquivos tocados', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }, { id:'B', arquivo:'y.mjs' }, { id:'C', arquivo:'x.mjs' }];
    igual(filtrarTocados(D, ['x.mjs']).map(d => d.id).join(''), 'AC', 'filtro errado');
  });

  /* A DIREÇÃO PERIGOSA É ESVAZIAR, não alargar.
     Filtro que devolve demais custa tempo; filtro que devolve de menos entrega
     um relatório verde sobre defeito que ninguém plantou. */
  s.teste('arquivo tocado sem defeito nenhum devolve lista vazia, e isso é visível', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }];
    igual(filtrarTocados(D, ['docs/LEIAME.md']).length, 0, 'filtro casou o que não devia');
  });

  s.teste('sem arquivos tocados o filtro devolve tudo — nunca um silêncio verde', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }, { id:'B', arquivo:'y.mjs' }];
    igual(filtrarTocados(D, []).length, 2, 'lista vazia de arquivos esvaziou os defeitos');
  });

  /* --- o pré-voo contra a lista DE VERDADE -------------------------------
   *
   * Os testes acima usam dados sintéticos, porque testar contra o arquivo real
   * falharia a cada edição do jogo. Este é o oposto: roda o pré-voo sobre a
   * lista viva, e é ele que teria pego o S15 no V1.14.
   *
   * NÃO RODA DENTRO DA CAIXA DE AREIA DA SABOTAGEM, e a razão é séria.
   *
   * A sabotagem planta um defeito trocando `de` por `para` no arquivo. Dentro
   * da caixa, portanto, o `de` daquele defeito DEIXOU de existir — e este
   * teste o acusaria como âncora ausente. Ou seja: qualquer defeito plantado
   * ficaria vermelho aqui, por construção, e o relatório do Q2 passaria a
   * dizer "pego por portao" para os 82. A coluna "pego por" existe justamente
   * para revelar área com cobertura fraca; um teste que pega tudo por
   * tautologia apaga essa informação.
   *
   * Descoberto pela própria sabotagem, na primeira execução depois de escrever
   * este arquivo: S79, S80, S81 e S82 vieram todos com "pego por portao",
   * inclusive o S82, que mexe em `run.mjs` e não tem nada a ver com âncora.
   *
   * O pulo é DECISÃO, não esquecimento: dentro da caixa a âncora perturbada é
   * o comportamento esperado. Fora dela o teste roda sempre, e a sabotagem
   * ainda faz a mesma conferência no seu próprio pré-voo, antes de montar
   * caixa nenhuma. Não há janela sem cobertura. */
  if (process.env.EM_SANDBOX === '1') {
    console.log('  · portao: conferência da lista real pulada (caixa de areia da sabotagem)');
    return s;
  }
  /* D-010 · AFIRMA O DEFEITO DE PROPÓSITO — ver docs/DEFEITOS.md.
   *
   * O limite da linha de base é `média > 3` OU `pico > 60`. O V1.15 acrescentou
   * à tela da arena um card inteiro de colocação — doze linhas com retrato,
   * nome e estado — e a diferença medida foi **média 0,85 · pico 56**: 7 % sob
   * o limite, num componente inteiro.
   *
   * Não é que o portão seja cego à periferia: uma mudança GROSSEIRA na mesma
   * coluna (cinco colunas da amostra achatadas em cinza) marca pico 123 e
   * reprova. O que ele não separa é COMPONENTE NOVO de RUÍDO quando o
   * componente respeita a paleta em volta — e respeitar a paleta é exatamente o
   * que um card bem desenhado faz.
   *
   * Este teste reproduz a magnitude MEDIDA e exige que ela passe. Fica vermelho
   * no dia em que o portão ficar mais fino — que é como o T2 descobre que
   * fechou. Mesmo padrão do D-001 e do D-003.
   *
   * Puro: perturba um vetor em memória, sem navegador. */
  s.teste('D-010 · um componente inteiro cabe sob o limite da linha de base', async () => {
    const { compararBase } = await import('./visual.mjs');
    const { readFileSync } = await import('node:fs');
    const base = JSON.parse(readFileSync(
      new URL('./fixtures/visual-base.json', import.meta.url), 'utf8'));
    const LADO = 32, alvo = 'arena@largo';
    const alterada = { ...base, [alvo]: base[alvo].slice() };
    const v = alterada[alvo];

    /* Magnitude do V1.15, reconstruída: um punhado de pixels na coluna da
       direita mexendo até 56 pontos, o resto intocado. Dá média ~0,85 — que é o
       que um card novo em paleta parecida produz. */
    let mexidos = 0;
    for (let y = 0; y < LADO && mexidos < 15; y += 2){
      const i = (y * LADO + (LADO - 3)) * 3;
      for (let c = 0; c < 3; c++) v[i + c] = Math.min(255, v[i + c] + 56);
      mexidos++;
    }

    let som = 0, pico = 0;
    for (let i = 0; i < v.length; i++){
      const d = Math.abs(v[i] - base[alvo][i]); som += d; if (d > pico) pico = d;
    }
    const media = som / v.length;
    ok(pico >= 50 && media < 3,
      `a perturbação sintética (média ${media.toFixed(2)}, pico ${pico}) não reproduz mais a ` +
      `magnitude medida no V1.15 (média 0,85, pico 56) — reescreva o teste antes de confiar nele`);

    const falhas = compararBase(alterada, base);
    ok(falhas.length === 0,
      `a linha de base PEGOU a magnitude que o card do V1.15 produziu: ${falhas.join(' · ')}.\n` +
      `      Isso é BOM — o D-010 foi corrigido. Tire este teste e marque o defeito\n` +
      `      como corrigido em docs/DEFEITOS.md.`);
  });

  s.teste('a lista real de defeitos não tem âncora perdida, ambígua ou inócua', async () => {
    const { DEFEITOS } = await import('./defeitos-plantados.mjs');
    const { readFileSync } = await import('node:fs');
    const raiz = new URL('../', import.meta.url).pathname;
    const probs = conferirAncoras(DEFEITOS, f => readFileSync(raiz + f, 'utf8'));
    ok(probs.length === 0,
      `${probs.length} defeito(s) plantado(s) sem valor:\n      ` +
      probs.map(p => `${p.id} [${p.tipo}] ${p.arquivo} — ${p.detalhe}`).join('\n      '));
  });

  return s;
}
