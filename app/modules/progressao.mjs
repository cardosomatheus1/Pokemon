/* A progressão do treinador, reexportada do motor.
 *
 * A REGRA MUDOU DE CASA NO BLOCO 0.1, E ESTE ARQUIVO EXISTE PARA QUE ISSO NÃO
 * TENHA CUSTADO NADA A QUEM A USA.
 *
 * Ao fechar o `D-045`, a liquidação no servidor passou a conceder o XP da
 * rodada. Com dois donos, a regra não podia mais morar dentro de `app/`: o
 * servidor não pode importar da interface, e reimplementar a curva do outro
 * lado é o erro que o §7.11 descreve — duas implementações divergem no primeiro
 * ajuste, e aqui a divergência apareceria como um XP na tela de resultado e
 * outro no perfil depois de recarregar.
 *
 * Então a aritmética foi para `engine/progressao.mjs`, que é onde mora o que os
 * dois lados compartilham, e este arquivo virou a porta de entrada dela para as
 * telas. `banner.mjs`, `faixa.mjs`, `perfil.mjs` e `resultado-tela.mjs`
 * continuam importando daqui, com os mesmos nomes, sem saber que algo mudou.
 *
 * NÃO ACRESCENTE REGRA AQUI. Um cálculo que nasça neste arquivo é um cálculo
 * que o servidor não tem — e é exatamente a dessincronia que o bloco 0.1
 * existiu para fechar.
 */
export {
  xpParaNivel, nivelDe, progressoNivel,
  XP_RODADA, XP_ABATE_ANTIGO, XP_VITORIA_ANTIGA,
  xpDeAbates, xpDaRodada,
} from '../../engine/progressao.mjs';
