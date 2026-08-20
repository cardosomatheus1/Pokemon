/* CONFIGURAÇÃO POR AMBIENTE (F1.1).
 *
 * Fronteira: lê o ambiente e devolve a configuração já validada. Não serve
 * requisição, não guarda estado.
 *
 * A REGRA QUE GOVERNA ESTE ARQUIVO: em produção, segredo ausente é ERRO DE
 * PARTIDA, não um padrão silencioso. Segredo padrão em produção é como quase
 * toda sessão forjável começa — não por alguém tê-lo escolhido, mas por
 * ninguém ter notado que ele veio de graça.
 *
 * Em desenvolvimento existe padrão, porque exigir configuração para rodar o
 * projeto local é atrito que ninguém paga por muito tempo. Mas ele é:
 *   · SORTEADO a cada processo, e não escrito no código. Segredo fixo em
 *     repositório é segredo publicado, e a distância entre "é só de
 *     desenvolvimento" e produção é uma variável de ambiente esquecida;
 *   · AVISADO em voz alta.
 */
import { randomBytes } from 'node:crypto';

const AMBIENTES = ['producao', 'homologacao', 'desenvolvimento', 'teste'];

/* Tamanho mínimo do segredo de sessão. 32 bytes é o piso para HMAC-SHA256 sem
   alongamento — abaixo disso a chave é o elo curto. */
const MIN_SEGREDO = 32;

export function lerConfig(env = process.env, avisar = console.warn) {
  const ambiente = env.AMBIENTE || 'desenvolvimento';
  if (!AMBIENTES.includes(ambiente))
    throw new Error(`AMBIENTE desconhecido: "${ambiente}". Conhecidos: ${AMBIENTES.join(', ')}`);

  const producao = ambiente === 'producao' || ambiente === 'homologacao';

  let segredoSessao = env.SEGREDO_SESSAO || '';
  if (producao) {
    if (!segredoSessao)
      throw new Error('SEGREDO_SESSAO ausente. Em produção o segredo não tem padrão — ' +
                      'segredo padrão em produção é sessão forjável de graça.');
    if (segredoSessao.length < MIN_SEGREDO)
      throw new Error(`SEGREDO_SESSAO tem ${segredoSessao.length} caracteres; ` +
                      `o mínimo é ${MIN_SEGREDO}.`);
  } else if (!segredoSessao) {
    segredoSessao = randomBytes(32).toString('hex');
    avisar(`[config] segredo de sessão SORTEADO para este processo (ambiente ` +
           `"${ambiente}"). É padrão de desenvolvimento: as sessões morrem quando ` +
           `o processo reiniciar, e isso é de propósito.`);
  }

  /* CORS: lista explícita, e vazia por padrão. Nunca `*` — ver o teste. */
  const origens = (env.ORIGENS_PERMITIDAS || '')
    .split(',').map(x => x.trim()).filter(Boolean);
  if (producao && origens.length === 0)
    avisar('[config] ORIGENS_PERMITIDAS vazia em produção: nenhuma origem ' +
           'cruzada será aceita. Se o cliente roda em outro domínio, ele vai falhar.');

  return {
    ambiente,
    producao,
    segredoSessao,
    origens,
    /* Caminho do banco. `:memory:` em teste porque suíte que escreve em disco
       não roda em paralelo consigo mesma — e o T3 acabou de comprar paralelo. */
    banco: env.BANCO || (ambiente === 'teste' ? ':memory:' : 'dados/pokearena.db'),
    /* `|| 8080` engoliria `PORTA=0`, que é pedido legítimo de porta efêmera —
       e é justamente o que um orquestrador manda quando ele escolhe a porta. */
    porta: env.PORTA === undefined || env.PORTA === '' ? 8080 : Number(env.PORTA),
  };
}
