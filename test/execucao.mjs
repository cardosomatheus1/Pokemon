/* COMO UM MUTANTE É MEDIDO — o contrato de execução do portão (D-101).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, E É UMA LIÇÃO CARA ──────────────────────
 *
 * O `test/fecho.mjs` punha `test/sabotagem.mjs` no ARNES, e o ARNES entra no
 * fecho de TODA suíte. Ou seja: o portão era dependência de si mesmo, e
 * qualquer edição nele invalidava os 991 vereditos de uma vez.
 *
 * O comentário que justificava isso dizia, sobre o harness e a sabotagem:
 * *"Os dois mudam raramente."* Em 14/09 a `sabotagem.mjs` mudou TRÊS vezes — e
 * as três por causa do custo do portão. Cada correção do custo custava o portão
 * inteiro: 991 reavaliações, ~7 h na máquina de medição.
 *
 *     Consertar o portão exigia pagar o portão, e o que se estava consertando
 *     era justamente o preço dele.
 *
 * ── O QUE MUDA UM VEREDITO, E O QUE NÃO MUDA ─────────────────────────────
 *
 * Nem tudo na `sabotagem.mjs` pode mudar a resposta "esta suíte pega este
 * mutante?". A separação é a mesma do D-098 — orquestrar não é julgar:
 *
 *     MUDA      como o filho é invocado: bandeiras, ambiente, recorte, teto
 *     NÃO MUDA  quantas caixas em paralelo, limpeza de sandbox, relatório,
 *               contabilidade de cache, pré-voo, ordem da fila
 *
 * O que MUDA mora aqui, e é isto que fica no ARNES. O resto fica na
 * `sabotagem.mjs`, e mexer nele deixa de custar 991 reavaliações.
 *
 * ── A RESSALVA, PORQUE ELA É REAL ────────────────────────────────────────
 *
 * O D-100 mostrou que o número de trabalhadores PODE mudar um veredito: com a
 * máquina afogada, a suíte reprova por falta de CPU e o portão lê `PEGOU`.
 * Isso é um DEFEITO, e a resposta certa é não afogar a máquina — não invalidar
 * o cache toda vez que alguém ajusta a concorrência. Veredito que depende da
 * carga não é veredito, e nenhuma chave de cache conserta isso.
 */
import { execFile } from 'node:child_process';

/* O teto por mutante é do PORTÃO e não do teste: dez minutos é o limite entre
   "demorou" e "não vai voltar". Ele muda o veredito — estourar conta como
   VERMELHO —, então mora aqui e não na sabotagem. */
export const TETO_MUTANTE_MS = 10 * 60 * 1000;

/* AS SUÍTES QUE PRECISAM DE NAVEGADOR (T3).
 *
 * A segunda passada — a que responde "só o navegador pega?" — rodava a suíte
 * INTEIRA de novo, com Chromium. As 21 suítes baratas já tinham saído verdes na
 * primeira passada, e rodá-las outra vez não podia mudar a resposta: elas não
 * enxergam o navegador. Agora ela roda só as seis que enxergam.
 *
 * A lista é a mesma do `run.mjs`, e as duas TÊM que fechar. Escrevi este
 * comentário dizendo que uma divergência deixaria "a coluna pego por pobre, não
 * errada", e estava errado: o Q2 completo mostrou o `S59` — o vazamento de rede
 * — voltando como PASSOU, porque eu tinha deixado o `sem-rede` de fora. É o
 * portão que pegou o vazamento de avatar do V1.15. Suíte que não roda não é
 * cobertura fraca: é ausência de cobertura com relatório verde. */
export const SUITES_NAVEGADOR = 'visual,visual-luta,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,sem-backend,rodada-completa,contraste,outfit-canvas';

export function rodar(caixa, semGolden, comVisual, recorte = null, estreita = false) {
  const env = { ...process.env,
    ...(estreita ? { SABOTAGEM_ESTREITA: '1' } : {}),
    /* Marca a caixa de areia. Um teste que confira as âncoras da lista real
       ficaria vermelho para TODOS os defeitos aqui dentro — o `de` do defeito
       plantado deixou de existir por construção —, e a coluna "pego por"
       perderia o sentido. Ver a explicação longa em test/portao.mjs. */
    EM_SANDBOX: '1',
    PARAR_CEDO: comVisual ? '' : '1',
    ...(semGolden ? { SEM_GOLDEN: '1' } : {}),
    ...(comVisual ? {} : { SEM_VISUAL: '1' }) };
  return new Promise(res => {
    const args = recorte ? ['test/run.mjs', `--so=${recorte}`]
              : comVisual ? ['test/run.mjs', `--so=${SUITES_NAVEGADOR}`]
              : ['test/run.mjs'];
    /* TETO DE TEMPO POR MUTANTE, e ele é do PORTÃO e não do teste.
     *
     * Até o F1.14 nenhum defeito plantado travava: todos falhavam ou passavam.
     * O primeiro que travou foi o S234 — a sala fantasma do cliente reconectava
     * para sempre, e `servidor.close()` esperava uma conexão SSE que, por
     * definição, não termina. A execução ficou pendurada, sem saída e sem
     * veredito.
     *
     * A causa era de produção e foi consertada (ver `servidor.mjs`), mas a
     * lacuna do portão não: **um portão que pendura é pior que um vermelho**.
     * Vermelho tem endereço; pendurado consome a máquina até alguém notar, e
     * mata o valor de rodar o portão sem olhar.
     *
     * Estourar o teto conta como VERMELHO, e é a resposta certa: o mutante
     * mudou o comportamento a ponto de a suíte não terminar. O `killSignal`
     * é explícito porque o padrão (`SIGTERM`) não derruba um Chromium travado.
     *
     * O teto é generoso — dez minutos é mais que o dobro da suíte completa com
     * navegador na máquina mais lenta que este projeto já mediu. Ele não é uma
     * medida de desempenho; é o limite entre "demorou" e "não vai voltar". */
    execFile('node', args, { encoding:'utf8', env, cwd:caixa, maxBuffer: 32*1024*1024,
                             timeout: TETO_MUTANTE_MS, killSignal: 'SIGKILL' },
      (err, stdout, stderr) => res({
        vermelha: !!err,
        pendurou: err?.killed === true,
        saida: (stdout||'') + (stderr||'') +
               (err?.killed ? `\n  [portão] a suíte não terminou em ${TETO_MUTANTE_MS/60000} min — conta como VERMELHO\n` : ''),
      }));
  });
}
