/* O CONTRATO DA API — a única fonte do formato que atravessa a rede (F1.1).
 *
 * Fronteira: declara a versão, os caminhos e a forma das respostas. Não sabe
 * servir HTTP, não abre banco, não conhece o motor.
 *
 * POR QUE A VERSÃO É OBRIGATÓRIA EM TODA REQUISIÇÃO DE API.
 *
 * O produto se vende por odd auditável, e "auditável" pressupõe que quem
 * conferiu e quem publicou estavam falando do mesmo formato. No dia em que o
 * servidor mudar a forma de um ticket e um cliente antigo continuar aberto numa
 * aba, a diferença tem que aparecer no HANDSHAKE — não no meio de uma aposta,
 * silenciosamente, com o campo novo chegando como `undefined`.
 *
 * O `/saude` é a ÚNICA exceção, e ela é declarada: ele existe para o
 * balanceador, que não conhece o contrato. Um health check que exigisse versão
 * derrubaria a instância inteira do pool a cada mudança de contrato.
 */

/* Uma string, não um número: `'1'` e `1` chegam iguais num cabeçalho HTTP, e
   comparar tipos diferentes é como uma versão errada passa. */
export const API_VERSAO = '1';

/* As versões que este servidor ACEITA. Hoje uma; quando houver duas, a de trás
   sai daqui no dia em que sair do ar — e não antes. */
export const VERSOES_ACEITAS = [API_VERSAO];

export const CABECALHO_VERSAO = 'x-api-versao';

/* Caminhos livres de versão. Lista fechada e curta de propósito: cada entrada
   aqui é uma superfície que o contrato não protege. */
export const SEM_VERSAO = ['/saude'];

export const versaoAceita = v => typeof v === 'string' && VERSOES_ACEITAS.includes(v);

/* Os códigos de erro são do CONTRATO, não do HTTP. O cliente decide o que fazer
   por eles; o status HTTP é para o proxy. Erro sem código é erro que o cliente
   só sabe tratar lendo texto em português, e texto muda. */
export const ERROS = {
  VERSAO_AUSENTE:      'versao_ausente',
  VERSAO_INCOMPATIVEL: 'versao_incompativel',
  ENTRADA_INVALIDA:    'entrada_invalida',
  NAO_ENCONTRADO:      'nao_encontrado',
  /* F1.13: a superfície ganhou rotas privadas, e a recusa por sessão precisa de
     código próprio. Sem ele o cliente não distingue "entre de novo" de "esse
     pedido está errado", e trata as duas do mesmo jeito — que é reenviar. */
  NAO_AUTORIZADO:      'nao_autorizado',
  INTERNO:             'interno',
};
