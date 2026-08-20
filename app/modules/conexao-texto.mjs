/* O TEXTO DA CONEXÃO (F1.14, §5.9) — o que o jogador lê quando a sala cai.
 *
 * Separado da tela porque é PURO: não toca DOM, não chama rede, não importa
 * nada além dos nomes dos estados. É a mesma razão de `protecao-texto.mjs`
 * existir — a exigência aqui é sobre TEXTO, e texto se confere em
 * milissegundos em vez de num Chromium.
 *
 * ── AS TRÊS PERGUNTAS, E ELAS SÃO DIFERENTES ───────────────────────────────
 *
 *     conectando   está vindo?        → espere
 *     sem rede     é culpa minha?     → não, e o dinheiro está guardado
 *     no ar        posso jogar?       → sim, e a tela não diz nada
 *
 * A distância entre "conectando" e "sem rede" é a distância entre esperança e
 * diagnóstico. Quem não tem essa distinção fecha a aba achando que o produto
 * travou — e o §5.9 existe justamente porque queda e volta são normais.
 *
 * ── A LIÇÃO QUE O F1.13 PAGOU, NA VERSÃO GRAVE ─────────────────────────────
 *
 * **Silêncio não é recusa.** O `api.mjs` distingue as duas porque a tela de
 * proteção dizia "você precisa entrar na sua conta" para quem não tinha
 * servidor nenhum do outro lado. Aqui o erro equivalente é pior: sugerir que a
 * aposta se perdeu quando o que caiu foi a rede. A aposta está no servidor, o
 * settlement é dele, e o jogador que apostar de novo por medo aposta duas
 * vezes.
 */
import { ESTADO_SALA } from './sala.mjs';

/* Os estados que ocupam tela. Declarado como lista para que o teste possa
   cobrar que ela e a função concordem — derivar não pode dessincronizar. */
export const ESTADOS_VISIVEIS = [ESTADO_SALA.CONECTANDO, ESTADO_SALA.SEM_REDE];

const TEXTOS = {
  [ESTADO_SALA.NO_AR]: {
    titulo: 'Ao vivo',
    frase: 'Você está na sala.',
    /* NÃO VISÍVEL, e isso é decisão. Aviso que fica sempre é aviso que ninguém
       lê, e ele rouba espaço da rodada — que é o produto. O normal não se
       anuncia. */
    visivel: false,
    tentando: false,
  },

  [ESTADO_SALA.CONECTANDO]: {
    titulo: 'Conectando',
    frase: 'Entrando na sala. Isso costuma levar um instante.',
    visivel: true,
    tentando: true,
  },

  [ESTADO_SALA.SEM_REDE]: {
    titulo: 'Sem conexão',
    /* AS TRÊS COISAS QUE ESTA FRASE PRECISA CARREGAR, e nenhuma é opcional:
       que a tentativa continua, que o dinheiro está guardado, e que a aposta
       em andamento sobrevive. Elas respondem, nessa ordem, "desisti?", "perdi
       meu saldo?" e "perdi a rodada?" — que são as três perguntas de quem cai
       no meio de uma aposta, e todas as três têm resposta boa. */
    frase: 'Não conseguimos falar com o servidor. Continuamos tentando — sua ' +
           'aposta e seu saldo estão guardados lá, e voltam com a conexão.',
    visivel: true,
    tentando: true,
  },

  [ESTADO_SALA.PARADA]: {
    titulo: 'Fora da sala',
    frase: 'Você não está acompanhando nenhuma rodada agora.',
    visivel: false,
    tentando: false,
  },
};

/* ESTADO DESCONHECIDO NÃO DEIXA A TELA MUDA.
 *
 * Um estado novo na sala e ninguém lembrou do texto: sem este ramo, a tela fica
 * em branco exatamente no momento em que o jogador mais precisa de uma palavra.
 * O padrão é o mais conservador dos três — assume que algo está errado e que
 * continuamos tentando, que é o pior caso e a resposta segura. */
const DESCONHECIDO = {
  titulo: 'Reconectando',
  frase: 'Alguma coisa fora do esperado com a conexão. Continuamos tentando — ' +
         'sua aposta e seu saldo estão no servidor.',
  visivel: true,
  tentando: true,
};

export const textoDaConexao = estado => TEXTOS[estado] ?? DESCONHECIDO;
