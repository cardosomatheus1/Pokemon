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


/* ── A SUÍTE EM PARALELO (T14, 25/09/2026) ────────────────────────────────
 *
 * As ~150 suítes rodavam em FILA, num processo só, numa máquina de quatro
 * núcleos. Medido em 25/09, sem navegador: 190 s de parede, 203 s de CPU — um
 * núcleo trabalhando e três olhando.
 *
 * As três decisões que isso exige moram aqui, e não no `run.mjs`, pelo motivo
 * de sempre (D-059, D-103): o `run.mjs` é ponto de entrada e não se importa;
 * regra escrita lá não tem como ser observada de fora.
 *
 * ── QUANDO NÃO PARALELIZAR, e cada caso tem razão própria ────────────────
 *
 *   pararCedo    é a pergunta binária da sabotagem: "alguma fica vermelha?".
 *                A resposta depende da ORDEM por custo; em paralelo a primeira
 *                falha que chega não é a mais barata, e o captor do índice
 *                mudaria de nome sem o comportamento mudar
 *   emSandbox    o Q2 já roda 2 caixas em paralelo, meio núcleo cada. Mais
 *                processos por caixa é o D-100 de volta: a máquina afogada
 *                reprova por falta de CPU, e o portão lê isso como captura
 *   so           o recorte é o laço de construção — uma ou duas suítes, e o
 *                custo de subir trabalhador passaria o de rodar
 *   serial       a recusa explícita (`TESTE_SERIAL=1`), para medir e comparar
 *
 * Um núcleo fica para o processo principal, que dirige o Chromium. */
export function trabalhadoresDaSuite({ nucleos, pararCedo, emSandbox, so, serial, pedido }) {
  if (serial || pararCedo || emSandbox) return 0;
  if (so && so.length) return 0;
  const teto = Math.max(0, (nucleos | 0) - 1);
  const n = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, teto || 1) : Math.min(teto, 4);
  return n >= 2 ? n : 0;          /* um trabalhador só é a fila de antes, mais cara */
}

/* A ORDEM EM QUE AS SUÍTES SÃO ENTREGUES AOS TRABALHADORES.
 *
 * A fila é dinâmica — cada trabalhador pede a próxima quando termina —, então a
 * ordem não decide QUEM roda o quê, só o fim: a mais cara entregue por último
 * deixa três trabalhadores ociosos esperando por ela. As caras vão primeiro.
 *
 * O custo é um PALPITE com data, e errar não custa cobertura: todas rodam de
 * qualquer jeito. Número documentado envelhece (D-059) — por isso ele só ordena,
 * e nunca decide o que roda. Medido em 25/09/2026, segundos, sem navegador. */
export const CUSTO_MEDIDO = {
  margem: 15.2, paridade: 14.9, informacao: 14.9, progressao: 11.3,
  invariantes: 5.8, concorrencia: 4.0, modulos: 3.3, portao: 3.2, rotas: 2.0,
  auth: 1.9, protecao: 1.8, 'aposta-servidor': 1.8, precisao: 1.7, servidor: 1.7,
  'liga-servidor': 1.5, 'admin-auth': 1.5, limites: 1.3, politica: 1.2,
};
export function ordemDeEntrega(nomes, custo = CUSTO_MEDIDO) {
  const pos = new Map(nomes.map((n, i) => [n, i]));
  return nomes.slice().sort((a, b) =>
    ((custo[b] ?? 0) - (custo[a] ?? 0)) || (pos.get(a) - pos.get(b)));
}

/* O QUE FOI PEDIDO E NÃO VOLTOU — o S109 com outra roupa.
 *
 * Em fila, uma suíte que some é uma linha a menos no relatório. Em paralelo há
 * mais portas para ela sumir: o trabalhador morre, a mensagem se perde, dois
 * trabalhadores listam suítes diferentes. Qualquer uma delas devolveria VERDE
 * tendo olhado menos — a falha mais silenciosa deste arnês.
 *
 * Então a agregação é conferida contra o que o processo principal montou, nos
 * dois sentidos: suíte esperada sem resultado, e resultado de suíte que ninguém
 * esperava (que quer dizer que as duas montagens divergiram). Qualquer uma das
 * duas ABORTA; não avisa e segue. */
export function agregacaoIncompleta({ esperadas, recebidas }) {
  const vieram = new Map();
  for (const n of recebidas || []) vieram.set(n, (vieram.get(n) || 0) + 1);
  const faltando = (esperadas || []).filter(n => !vieram.has(n));
  const intrusas = [...vieram.keys()].filter(n => !(esperadas || []).includes(n));
  const repetidas = [...vieram].filter(([, k]) => k > 1).map(([n]) => n);
  return { faltando, intrusas, repetidas,
           ok: !faltando.length && !intrusas.length && !repetidas.length };
}
