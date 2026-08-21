/* O CLIENTE DE API (F1.13) — a única porta do app para o servidor.
 *
 * Fronteira: monta a requisição, declara a versão do contrato, carrega a sessão
 * e devolve `{ ok, status, corpo }`. **Não sabe regra nenhuma.** Nenhum limite,
 * nenhum saldo, nenhuma odd é decidido aqui — tudo isso mora no servidor, e o
 * cliente é do jogador.
 *
 * ── DUAS COISAS QUE ESTE ARQUIVO NUNCA FAZ ─────────────────────────────────
 *
 * **Não lança.** Um `throw` no meio de um clique derruba a tela inteira, e o app
 * é offline-first: o servidor pode simplesmente não estar lá. Falha de rede vira
 * `{ ok: false, indisponivel: true }`, e quem chamou decide o que mostrar.
 *
 * **Não confunde recusa com silêncio.** `ok: false` com status é o servidor
 * dizendo não; `indisponivel: true` é não ter havido conversa. São situações
 * diferentes para o jogador — a primeira tem motivo, a segunda tem que dizer
 * "tente de novo" — e uma tela que as trata igual mente numa das duas.
 */
import { API_VERSAO, CABECALHO_VERSAO } from '../../server/contrato.mjs';

const CHAVE_SESSAO = 'ar_sessao';

export function criarApi({ base = '', armazem = globalThis.localStorage } = {}) {
  const ler = () => { try { return armazem?.getItem(CHAVE_SESSAO) || null; } catch { return null; } };
  const gravar = t => { try { t ? armazem?.setItem(CHAVE_SESSAO, t) : armazem?.removeItem(CHAVE_SESSAO); } catch { /* modo privativo */ } };

  let sessao = ler();

  async function chamar(metodo, caminho, corpo) {
    let r;
    try {
      r = await fetch(base + caminho, {
        method: metodo,
        headers: {
          [CABECALHO_VERSAO]: API_VERSAO,
          ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
          ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      });
    } catch (e) {
      /* SEM CONVERSA. Não é recusa: é ausência de resposta, e a tela precisa
         poder dizer isso com essas palavras. */
      return { ok: false, indisponivel: true, status: 0, corpo: null, motivo: String(e?.message || e) };
    }
    let dados = null;
    try { dados = await r.json(); } catch { /* tratado logo abaixo */ }

    /* RESPOSTA SEM JSON É SILÊNCIO, E NÃO RECUSA — e a diferença apareceu ao
       OLHAR a tela, não em teste nenhum.
       
       O app é servido por um servidor de arquivos estático quando não há
       backend no ar. Um `GET /api/limites` ali devolve **404 em HTML**, e a
       primeira versão deste módulo tratava isso como resposta: a tela de
       proteção dizia "você precisa entrar na sua conta" para quem não tinha
       servidor nenhum do outro lado.
       
       Dizer a coisa errada ali é caro: quem abre aquela tela foi se proteger, e
       "entre na sua conta" o manda tentar de novo em vez de avisar que o
       problema não é dele. Toda rota da nossa API responde JSON — inclusive os
       erros, que carregam `codigo`. Sem JSON, não foi a nossa API que
       respondeu. */
    if (dados === null)
      return { ok: false, indisponivel: true, status: r.status, corpo: null,
               motivo: 'resposta sem JSON — não foi a API que respondeu' };

    /* A sessão que vier numa resposta passa a valer. Um `authorization` que o
       app monte à mão em outro lugar seria uma segunda fonte da mesma verdade. */
    if (dados?.sessao) { sessao = dados.sessao; gravar(sessao); }
    return { ok: r.ok, status: r.status, corpo: dados };
  }

  return {
    get:  (c)    => chamar('GET', c),
    post: (c, b) => chamar('POST', c, b ?? {}),
    temSessao: () => !!sessao,
    /* A SESSÃO EM SI, para quem não passa por aqui. O `sala.mjs` abre o fluxo
       com o próprio `fetch` — ele precisa de streaming, que esta fachada não
       faz — e sem isto ele conectaria sem autenticação. Não é um vazamento:
       é a MESMA sessão, lida do mesmo lugar, em vez de uma segunda cópia
       guardada em outro canto. */
    sessaoAtual: () => sessao,
    esquecerSessao: () => { sessao = null; gravar(null); },
  };
}

/* A instância do app. Base vazia: o cliente é servido pelo mesmo domínio, e por
   isso não precisa de CORS — que é a razão de a lista de origens do servidor
   nascer vazia.

   `let` e não `const` porque o teste precisa apontá-la para um servidor em porta
   efêmera. A alternativa seria cada módulo receber a api por parâmetro, e aí
   dez módulos ganhariam um argumento que só o teste usa — desenho torcido para
   agradar ao teste. */
export let api = criarApi({});

/* Reaponta a instância do app. Chamado pelo boot quando houver base
   configurável, e pelo teste para falar com um servidor efêmero. */
export function configurarApi(opcoes) {
  api = criarApi(opcoes);
  return api;
}
