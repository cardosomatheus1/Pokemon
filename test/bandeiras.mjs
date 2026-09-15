/* AS BANDEIRAS DA LINHA DE COMANDO, COMO DECISÃO PURA (camada 0).
 *
 * Um arquivo só para uma função de três linhas parece exagero até se ler o
 * D-059, que é a razão de ele existir.
 *
 * ── O DEFEITO QUE ORIGINOU ISTO ──────────────────────────────────────────
 *
 * A decisão "esta execução precisa de Chromium?" morava solta no meio do
 * `run.mjs`, entre a montagem das suítes e a filtragem delas:
 *
 *     const precisaNavegador = !SO || SO.some(n => COM_NAVEGADOR.includes(n));
 *
 * Ela consultava `--so` e esquecia `--sem-navegador`. Resultado: `npm run
 * rapido` subia os CINCO Chromium e, trinta e sete linhas depois, removia do
 * resultado toda suíte que precisaria deles. Cinco navegadores sobiam, mediam,
 * e ninguém lia. **3 min 30 s por execução, onde o `CLAUDE.md` documentava 7 s.**
 *
 * O defeito não tinha sintoma: a suíte ficava verde, com a contagem certa. Só o
 * relógio sabia — e ninguém olha o relógio de um comando chamado `rapido`.
 *
 * ── POR QUE VIRAR MÓDULO, E NÃO SÓ CORRIGIR A LINHA ──────────────────────
 *
 * Porque a linha corrigida no lugar continuaria sem teste. `run.mjs` é o ponto
 * de entrada: importá-lo de uma suíte executa a suíte inteira, e a única outra
 * forma de observar a decisão de fora seria cronometrar — que é medir o efeito
 * e não a regra, e devolveria um teste lento e instável.
 *
 * Extraída, ela vira tabela-verdade: quatro casos, microssegundos, e um defeito
 * plantado que a devolve à forma antiga fica VERMELHO na hora.
 *
 * É a mesma correção que `caixas.mjs` recebeu pela mesma razão, e o comentário
 * de lá diz igual: a regra é pequena e determinística; num módulo ela se testa
 * em milissegundos.
 */

/* Precisa subir Chromium?
 *
 *   semNavegador   a bandeira é uma RECUSA, e recusa vence tudo. Ela existe
 *                  exatamente para não pagar navegador; se ela não puder
 *                  impedir a partida, ela não serve para nada.
 *   so             sem `--so`, roda tudo, e "tudo" inclui as que precisam.
 *                  Com `--so`, só se alguma das nomeadas estiver na lista.
 */
export function precisaNavegador({ so, semNavegador, comNavegador }) {
  if (semNavegador) return false;
  if (!so || !so.length) return true;
  return so.some(n => (comNavegador ?? []).includes(n));
}


/* ── E O BOOLEANO ERA GROSSO DEMAIS (D-098, bloco T9) ─────────────────────
 *
 * O D-059 consertou a decisão de estar ERRADA. Ficou de pé que ela é do TIPO
 * errado: `precisaNavegador` responde sim/não, e o `run.mjs` traduzia o "sim"
 * em **subir as sete sondas** — cada uma com Chromium e boot próprios.
 *
 *     --so=visual   ->  roda 7 sondas, usa 1, descarta 6
 *
 * MEDIDO em 14/09, e é o número que explica o custo do portão:
 *
 *     visual, 4 larguras     226 s
 *     visual, 1 largura      152 s     <- cortar 3 larguras poupa só 33%
 *
 * Os ~127 s que sobram não são largura: são as seis sondas que ninguém leu. E
 * o portão paga isso POR MUTANTE de navegador — 294 dos 981 defeitos.
 *
 * A pergunta certa não é "precisa de navegador?" e sim **"de QUAIS sondas?"**.
 * Booleano não tem como responder isso, e é por isso que a correção é o tipo e
 * não a linha. Mesmo remédio do D-059: a regra vira tabela e ganha teste.
 */

/* Qual sonda cada suíte CONSOME. Três suítes leem o resultado da mesma sonda —
   `rodada-viva` e `contraste` vivem do que a `rodar()` já capturou —, e é
   justamente por isso que a relação precisa estar escrita: ela não é 1 para 1,
   então derivá-la do nome daria errado nos três casos. */
export const SONDA_DA_SUITE = {
  'visual':          'rodar',
  'visual-luta':     'luta',
  'rodada-viva':     'rodar',
  'contraste':       'rodar',
  'visual-base':     'base',
  'ambientes':       'digitais',
  'tema-cedo':       'temaCedo',
  'sem-rede':        'semRede',
  'sem-backend':     'semBackend',
  'rodada-completa': 'rodadaCompleta',
  'outfit-canvas':   'outfitCanvas',
};

/* As sondas que ESTA execução precisa subir.
 *
 *   semNavegador   continua sendo recusa, e recusa vence tudo: conjunto vazio.
 *   sem `--so`     roda tudo, e "tudo" são todas as sondas.
 *   com `--so`     só as sondas das suítes nomeadas.
 *
 * DEVOLVE UM `Set`, e a coerência com `precisaNavegador` é lei: conjunto vazio
 * se e só se o booleano é falso. Há teste para isso — se as duas discordarem,
 * ou sobe navegador que ninguém usa (o D-059 de volta), ou uma suíte é montada
 * sem a sonda dela, que é o S109 e é pior. */
export function sondasNecessarias({ so, semNavegador, comNavegador }) {
  if (!precisaNavegador({ so, semNavegador, comNavegador })) return new Set();
  const pedidas = (!so || !so.length) ? Object.keys(SONDA_DA_SUITE) : so;
  const fora = new Set();
  for (const n of pedidas) if (SONDA_DA_SUITE[n]) fora.add(SONDA_DA_SUITE[n]);
  return fora;
}


/* ── QUE SUÍTE A SONDA PROMETEU, E NÃO ENTREGOU (D-103) ────────────────────
 *
 * Cortar sondas é a maior economia do portão e a forma mais fácil de uma suíte
 * sumir calada — o S109. As guardas contra isso nasceram no T9 e no T10, dentro
 * do `run.mjs`, e o Q2 de 15/09 mostrou que elas eram DECORATIVAS: os defeitos
 * plantados `S996` e `S998` desligam as duas, e nada ficou vermelho.
 *
 * A razão é a mesma do D-059, e o remédio também. `run.mjs` é ponto de entrada:
 * importá-lo de uma suíte EXECUTA a suíte inteira, então a única forma de
 * observar a decisão de fora seria provocar um `process.exit` — que nenhum
 * teste faz. Guarda que não dá para observar é guarda que ninguém testa.
 *
 * Extraída, ela vira tabela: entra um estado, sai a lista de suítes que a sonda
 * prometeu e a montagem não entregou. Microssegundos, e o defeito que a desliga
 * fica vermelho na hora.
 *
 *   sondas        as sondas que ESTA execução subiu
 *   montadas      os nomes das suítes que a montagem produziu
 *   temAssets     sem assets locais a `sem-rede` não roda, e a ausência é
 *                 legítima e já anunciada
 *
 * `outfit-canvas` nunca é cobrada: ela não está na fila das sondas — tem
 * gatilho próprio, porque subir Chromium para ela no `rapido` custaria a
 * execução inteira. */
export function suitesPrometidasENaoEntregues(
  { sondas, montadas, temAssets, comNavegador = Object.keys(SONDA_DA_SUITE) }) {
  if (!sondas || !sondas.size) return [];
  const naoCobrar = new Set([...(temAssets ? [] : ['sem-rede']), 'outfit-canvas']);
  const feitas = new Set(montadas || []);
  return comNavegador
    .filter(n => sondas.has(SONDA_DA_SUITE[n]) && !naoCobrar.has(n))
    .filter(n => !feitas.has(n));
}

/* O par da função acima, para o outro lado da mesma promessa: sonda que SUBIU e
   não devolveu resultado. Era uma lista literal no `run.mjs`, e o `S998` provou
   que ela também não tinha quem a observasse.

   `resultados` é um mapa sonda -> o que ela devolveu. Sonda pedida cujo
   resultado é nulo é aborto, não aviso: a suíte a jusante leria `null` e
   passaria por vazia. */
export function sondasSemResultado({ sondas, resultados }) {
  if (!sondas || !sondas.size) return [];
  return [...sondas].filter(s => s in (resultados || {}) && !resultados[s]);
}
