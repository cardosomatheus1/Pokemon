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
  state:    'boot',   // boot | betting | countdown | fighting | result
  clock:    0,        // relógio da fase atual
  battleT:  0,        // relógio do replay
  fighters: [],       // elenco da rodada, com stats já calculados
  odds:     [],       // resultado do Monte Carlo
  battle:   null,     // {winner, events, duration}
  evPtr:    0,        // ponteiro de leitura da linha do tempo
  champ:    -1,
  weather:  null,     // clima revelado no início da luta
  released: false,    // false = pokébolas ainda fechadas no chão

  /* --- apresentação ------------------------------------------------------ */
  shake:    0,        // tremor de tela, 0 a 1
  moveRng:  null,     // PRNG da coreografia; semeado em cada rodada

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
