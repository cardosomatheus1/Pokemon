/* AS ROTAS (F1.13) — a superfície HTTP sobre os módulos que já existem.
 *
 * Fronteira: traduz pedido em chamada de domínio e resposta em JSON. Não decide
 * regra de negócio nenhuma; toda regra já mora no módulo que ela chama. Uma rota
 * que decide algo é uma regra que passa a existir em dois lugares — e o lugar
 * que o cliente alcança é sempre o mais fácil de esquecer.
 *
 * ── A REGRA QUE ORGANIZA O ARQUIVO INTEIRO ─────────────────────────────────
 *
 *     **rota nova nasce PRIVADA.**
 *
 * A sessão é conferida no despacho, para TODAS, e a lista `ROTAS_PUBLICAS` é a
 * exceção declarada. O contrário — cada rota conferindo a própria sessão — é o
 * desenho em que a rota nova nasce aberta, porque quem a escreveu não sabia que
 * precisava lembrar. É a mesma razão de os cabeçalhos de segurança serem
 * aplicados no ponto de saída e da versão do contrato ser conferida antes do
 * roteamento: garantia que depende de lembrança é garantia ausente.
 *
 * ── E O USUÁRIO SAI DA SESSÃO, NUNCA DO PEDIDO ─────────────────────────────
 *
 * Nenhuma rota lê `userId` do corpo ou da query. O `userId` é o que a sessão
 * assinada diz, e mais nada. Aceitá-lo do cliente "para o admin poder consultar"
 * é entregar a carteira de qualquer um a quem souber um id — e o painel
 * administrativo do F1.11 tem autenticação própria, por decisão do §28.10.
 */
import { ERROS } from './contrato.mjs';
import { lerSessao, abrirSessao, cadastrar, entrar, ERRO_AUTH } from './auth.mjs';
import { saldos, ledgerDe, creditar } from './carteira.mjs';
import { SALDO_INICIAL } from '../engine/carteira.mjs';
import { apostar, cancelar, ERRO_APOSTA } from './aposta.mjs';
import { definirLimite, confirmarAumento, limitesDe, pedidosDe, TIPOS_LIMITE,
         ERRO_LIMITE } from './limites.mjs';
import { pausar, pausaAtiva, pedirReentrada, concederReentrada, realityCheck,
         confirmarRealityCheck, DURACOES, TIPOS_PAUSA, ERRO_PROTECAO } from './protecao.mjs';

/* AS PÚBLICAS, e cada uma com motivo. Quem ainda não entrou precisa poder criar
   sessão; o estado da rodada é público por desenho (§4.5 — o commit tem que ser
   conferível por qualquer um). Fora isso, nada. */
export const ROTAS_PUBLICAS = [
  'POST /api/auth/cadastrar',
  'POST /api/auth/entrar',
  'POST /api/auth/recuperar',
  'POST /api/auth/redefinir',
  'GET /api/rodada',
  'GET /api/rodada/preco',
  'GET /api/rodada/digital',
];

const erro = (status, codigo, mensagem, extra) =>
  ({ status, corpo: { codigo, erro: mensagem, ...extra } });

/* O erro do DOMÍNIO vira status HTTP por uma tabela, e não por adivinhação.
   Sem ela, um `catch` genérico devolveria 500 para "saldo insuficiente" — e
   500 é "o servidor quebrou", que é uma mentira com custo: o cliente tenta de
   novo, o operador investiga, e o jogador não descobre o que fazer. */
const STATUS_DE = {
  [ERRO_AUTH?.DADOS ?? 'x']: 400,
  [ERRO_LIMITE.BLOQUEADO]: 403,
  [ERRO_LIMITE.COOLDOWN]: 403,
  [ERRO_LIMITE.TIPO]: 400,
  [ERRO_LIMITE.VALOR]: 400,
  [ERRO_LIMITE.SEM_PEDIDO]: 404,
  [ERRO_PROTECAO.PAUSADO]: 403,
  [ERRO_PROTECAO.EM_VIGOR]: 403,
  [ERRO_PROTECAO.TIPO]: 400,
  [ERRO_PROTECAO.DURACAO]: 400,
  [ERRO_PROTECAO.SEM_PEDIDO]: 404,
  [ERRO_APOSTA.JANELA_FECHADA]: 409,
  [ERRO_APOSTA.SLOT]: 400,
  [ERRO_APOSTA.VALOR]: 400,
  [ERRO_APOSTA.SALDO]: 402,
  [ERRO_APOSTA.TETO]: 400,
  [ERRO_APOSTA.CONTA]: 403,
  [ERRO_APOSTA.SEM_APOSTA]: 404,
  [ERRO_APOSTA.RODADA]: 409,
};

/* Converte a exceção do domínio em resposta. O `limite` e a `pausa` viajam
   junto: a Spec §28.3 pede que a recusa diga QUAL, QUANTO e QUANDO, e é aqui
   que a UI lê isso. Devolver só o código faria a tela ter que recalcular — e
   ela não tem como. */
function daExcecao(e) {
  const status = STATUS_DE[e?.codigo] ?? 400;
  return erro(status, e?.codigo ?? ERROS.ENTRADA_INVALIDA, e?.message ?? 'pedido inválido',
    { ...(e?.limite ? { limite: e.limite } : {}), ...(e?.pausa ? { pausa: e.pausa } : {}) });
}

const inteiro = v => (typeof v === 'number' && Number.isInteger(v) ? v : null);

/* ── AS ROTAS ──────────────────────────────────────────────────────────────
 *
 * Cada uma recebe `{ db, sched, sala, corpo, query, userId, agora, config }`.
 * `userId` já vem resolvido da sessão pelo despacho — a rota não tem como
 * lê-lo de outro lugar, porque ele não está em `corpo` nem em `query` para ela.
 */
export const ROTAS = {

  /* --- autenticação ----------------------------------------------------- */

  'POST /api/auth/cadastrar': ({ db, corpo, agora, config }) => {
    try {
      /* Campo a campo, e não `...corpo`: espalhar deixaria o cliente mandar
         `status: 'ativo'` numa conta que a barreira de idade congelaria. */
      const u = cadastrar(db, { username: corpo?.username, email: corpo?.email,
                                senha: corpo?.senha, nascimento: corpo?.nascimento, agora });
      /* A CONTA NASCE JOGÁVEL. O grant existia só no cliente
         (`app/modules/banco.mjs`), e o F1.13 revelou o buraco na primeira
         execução: com o cliente falando com o servidor, conta nova nascia com
         zero e não havia como apostar.

         A chave de idempotência é o próprio id da conta: reenviar o cadastro
         não credita duas vezes, e o id é único por construção. */
      creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                     valor: SALDO_INICIAL, idem: `welcome-${u.id}`, agora });
      return { status: 201,
               corpo: { id: u.id, sessao: sessaoDe(config, u.id, agora),
                        saldos: saldos(db, u.id) } };
    } catch (e) { return daExcecao(e); }
  },

  /* A RESPOSTA É A MESMA PARA CONTA QUE EXISTE E PARA CONTA QUE NÃO EXISTE.
     Diferença de status, de corpo ou de tempo entrega a lista de clientes —
     o `auth.mjs` já calcula o hash contra um fantasma para igualar o TEMPO;
     aqui a obrigação é igualar a RESPOSTA. */
  'POST /api/auth/entrar': ({ db, corpo, agora, config }) => {
    try {
      const u = entrar(db, { email: corpo?.email, senha: corpo?.senha, agora });
      return { corpo: { id: u.id, sessao: sessaoDe(config, u.id, agora) } };
    } catch {
      /* UMA RESPOSTA SÓ, para credencial errada e para conta que não existe —
         e para conta congelada também. O `auth.mjs` já iguala o TEMPO
         calculando o hash contra um fantasma; igualar a RESPOSTA é obrigação
         desta camada, e é ela que impede a tela de login de virar consulta.

         O `catch` sem variável é de propósito: qualquer distinção que eu
         fizesse aqui entre os erros voltaria a diferenciar os casos. */
      return erro(401, ERROS.NAO_AUTORIZADO, 'e-mail ou senha não conferem');
    }
  },

  /* --- rodada (pública) -------------------------------------------------- */

  'GET /api/rodada': ({ sched }) => {
    const r = sched.rodadaAtual();
    if (!r) return { corpo: { rodada: null } };
    /* `paraCliente` é a lista branca do F1.5: o que sai daqui é o que ele
       nomeia, e a semente não está nela enquanto a janela está aberta. */
    return { corpo: { rodada: sched.paraCliente() } };
  },

  /* --- carteira ---------------------------------------------------------- */

  'GET /api/carteira': ({ db, userId }) =>
    ({ corpo: { userId, saldos: saldos(db, userId) } }),

  'GET /api/carteira/ledger': ({ db, userId }) =>
    ({ corpo: { userId, lancamentos: ledgerDe(db, userId).slice(-200) } }),

  /* --- aposta ------------------------------------------------------------ */

  /* `odd` NÃO É LIDA DO CORPO, e a ausência é a defesa. Ela pode vir no JSON —
     não há como impedir o cliente de mandar —, e ela é descartada aqui, no
     ponto onde alguém a leria por engano. A odd do ticket sai de
     `round_fighters`, gravada na abertura da rodada. */
  'POST /api/aposta': ({ db, sched, corpo, userId, agora }) => {
    try {
      const t = apostar(db, { sched, userId, slot: inteiro(corpo?.slot),
                              valor: inteiro(corpo?.valor), agora });
      return { corpo: t };
    } catch (e) { return daExcecao(e); }
  },

  'POST /api/aposta/cancelar': ({ db, sched, userId, agora }) => {
    try { return { corpo: cancelar(db, { sched, userId, agora }) }; }
    catch (e) { return daExcecao(e); }
  },

  /* --- limites (§28.3) --------------------------------------------------- */

  'GET /api/limites': ({ db, userId, agora }) =>
    ({ corpo: { tipos: TIPOS_LIMITE, limites: limitesDe(db, userId, agora),
                pedidos: pedidosDe(db, userId) } }),

  /* O CORPO É LIDO CAMPO A CAMPO, e nunca espalhado com `...corpo`.
     Espalhar deixaria `cooldownMs`, `efetivoEm` e `vigente` chegarem ao
     domínio vindos do cliente — e a Spec §28.3 proíbe encurtar o cooldown por
     qualquer canal. Pela rota, "qualquer canal" é um campo a mais no JSON. */
  'POST /api/limites': ({ db, corpo, userId, agora }) => {
    try {
      return { corpo: definirLimite(db, { userId, tipo: corpo?.tipo,
                                          valor: corpo?.valor === null ? null : inteiro(corpo?.valor),
                                          agora }) };
    } catch (e) { return daExcecao(e); }
  },

  'POST /api/limites/confirmar': ({ db, corpo, userId, agora }) => {
    try { return { corpo: confirmarAumento(db, { userId, tipo: corpo?.tipo, agora }) }; }
    catch (e) { return daExcecao(e); }
  },

  /* --- proteção (§28.4 a §28.6) ------------------------------------------ */

  'GET /api/protecao': ({ db, userId, agora }) => ({
    corpo: {
      pausa: pausaAtiva(db, userId, agora),
      duracoes: DURACOES, tipos: TIPOS_PAUSA,
        realityCheck: realityCheck(db, { userId, agora }),
    },
  }),

  'POST /api/protecao/pausar': ({ db, corpo, userId, agora }) => {
    try {
      return { corpo: pausar(db, { userId, tipo: corpo?.tipo, duracao: corpo?.duracao,
                                   agora, origem: 'player' }) };
    } catch (e) { return daExcecao(e); }
  },

  'POST /api/protecao/reality-check': ({ db, userId, agora }) =>
    ({ corpo: confirmarRealityCheck(db, { userId, agora }) }),

  /* NÃO EXISTE `POST /api/protecao/encerrar`, e a ausência é a garantia. A
     autoexclusão é irreversível durante o período (§28.4). O que existe é o
     par PEDIR/CONCEDER, e `concederReentrada` recusa enquanto o prazo corre —
     a rota não tem como pular isso porque a conferência mora no módulo. */
  'POST /api/protecao/reentrada': ({ db, userId, agora }) => {
    try { return { corpo: pedirReentrada(db, { userId, agora }) }; }
    catch (e) { return daExcecao(e); }
  },

  'POST /api/protecao/reentrada/confirmar': ({ db, userId, agora }) => {
    try { return { corpo: concederReentrada(db, { userId, agora }) }; }
    catch (e) { return daExcecao(e); }
  },
};

const sessaoDe = (config, userId, agora) =>
  abrirSessao({ segredo: config.segredoSessao, userId, agora });

export function usuarioDa(req, config, agora) {
  const cab = req.headers.authorization || '';
  const token = cab.startsWith('Bearer ') ? cab.slice(7) : null;
  if (!token) return null;
  const s = lerSessao({ segredo: config.segredoSessao, token, agora });
  return s?.userId ?? null;
}
