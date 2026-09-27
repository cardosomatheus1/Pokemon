/* O BANCO — o que acontece com quem NÃO foi (bloco A4e, camada 3).
 *
 * O dono batizou a aba com dois nomes, e os dois são de propósito:
 *
 *     ROTA OFF      a expedição. Quem SAIU rende encontro, item, XP e moeda.
 *     TRAINER OFF   o banco. Quem FICOU treina, e não rende encontro nenhum.
 *
 * São dois modos, e não um com um multiplicador — a distinção mora no motor,
 * em `engine/ausente.mjs`, com o porquê. Este arquivo é a cola: ele pega o que
 * o motor calculou e escreve na coleção.
 *
 * ── POR QUE ELE SAIU DO `idle-dados.mjs` ──────────────────────────────────
 *
 * Porque são perguntas diferentes, e o arquivo estava respondendo as duas:
 *
 *     idle-dados    A EXPEDIÇÃO — quem foi, para onde, e o que ela trouxe
 *     idle-banco    O BANCO — quem ficou, e o que o tempo fez por ele
 *
 * A divisão é por RESPONSABILIDADE e não por tamanho, que é a regra do
 * `test/modulos.mjs`. O limite de 600 linhas foi só quem perguntou primeiro.
 */
/* O CRÉDITO DO TREINO saiu daqui na ST-13.2a: ele é parte do que a colheita
   paga, e a colheita é uma conta só (`engine/colheita.mjs`) que o cliente e o
   servidor chamam. Fica aqui a pergunta que só a TELA faz. */

/* ── QUEM ESTÁ NO BANCO AGORA ─────────────────────────────────────────────
 *
 * A pergunta que a tela faz. Ela não é "quem está na caixa": a caixa é uma
 * arrumação do jogador, e o banco é um ESTADO — está no banco quem não está
 * em nenhuma expedição aberta, esteja na equipe ativa ou guardado.
 *
 * A distinção importa porque é ela que faz a tela dizer a verdade: um jogador
 * com seis na equipe e uma Batida de dois vê QUATRO treinando, e não zero. */
export function noBanco(criaturas = [], emCampo = []) {
  const fora = new Set(emCampo.flatMap(x => x?.equipe ?? []));
  return (criaturas ?? []).filter(c => c?.id != null && !fora.has(c.id));
}
