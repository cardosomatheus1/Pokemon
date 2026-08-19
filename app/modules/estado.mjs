/* Estado compartilhado da rodada e do treinador.
 *
 * Existe porque 19 variáveis mutáveis eram escritas de mais de uma parte do
 * script. Em módulos ES não se atribui a um binding importado, então cada uma
 * dessas variáveis bloquearia a separação do bloco F0.3.
 *
 * A regra que isso impõe, e que é o ganho de verdade: **toda mutação de estado
 * que atravessa fronteira de módulo passa por `S`, e é visível aqui.** O que
 * não está neste arquivo é local do módulo que declara.
 *
 * Não é um "objeto global de conveniência". Entrar aqui exige a mesma pergunta
 * do F1.4: quem escreve, quando, e o que mais depende disso. A lista curta é o
 * ponto — se ela crescer sem justificativa, a fronteira está errada.
 *
 * Em V1 este objeto vira a fronteira natural com o servidor: `rodada` e
 * `aposta` deixam de ser locais e passam a ser estado confirmado pelo backend.
 */
export const S = {
  /* --- rodada ------------------------------------------------------------ */
  /* A raiz da rodada e seus cinco ramos (Spec §P3). Entram aqui porque são
     reatribuídos a cada rodada e lidos por precificação, montagem e batalha —
     três módulos. Guardar a raiz é guardar a rodada: em V1 ela é o que a casa
     publica no reveal do §25.2, e o que qualquer um usa para recalcular o
     preço que viu na tela. */
  seeds:    null,     // {raiz, elenco, ambiente, batalha, visual, recompensa}

  state:    'boot',   // boot | betting | countdown | fighting | result
  clock:    0,        // relógio da fase atual
  battleT:  0,        // relógio do replay
  fighters: [],       // elenco da rodada, com stats já calculados
  odds:     null,     // registro de precificação da rodada (Spec §4.4.5)
  battle:   null,     // {winner, events, duration}
  evPtr:    0,        // ponteiro de leitura da linha do tempo
  champ:    -1,
  weather:  null,     // clima revelado no início da luta
  released: false,    // false = pokébolas ainda fechadas no chão

  /* --- apresentação ------------------------------------------------------ */
  shake:    0,        // tremor de tela, 0 a 1
  /* `ents` entrou no F0.3b, e a justificativa é a mesma dos outros: é
     REATRIBUÍDO (`S.ents = []` a cada montagem de rodada), e apresentação
     precisa lê-lo. Binding importado não aceita atribuição. Os arrays de
     efeito — shots, bursts, fxs, sched — NÃO estão aqui de propósito: são
     `const` que só sofrem push, e push atravessa binding importado sem
     problema. A diferença é reatribuição, não mutação. */
  ents:     [],       // entidades em cena: posição, elemento, hp

  /* --- aposta e carteira ------------------------------------------------- */
  bal:      0,        // saldo em PokéCash; carregado no boot
  chipVal:  50,       // ficha selecionada; mínimo = menor pacote
  myBet:    null,     // {idx, amount, odd}

  /* --- preferências e sessão --------------------------------------------- */
  auto:     true,     // encadeia rodadas sozinho
  speed:    1,        // velocidade do replay; só existe no painel Dev
  musicVol: 0.5,
  profile:  null,     // perfil do treinador; carregado no boot
};
