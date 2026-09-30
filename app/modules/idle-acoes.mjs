/* AS ESCRITAS DO IDLE, COM E SEM CONTA (ST-13.5b · E13 · DEC-17) — camada 4.
 *
 * A tela chama uma função só por ação, e é aqui que se decide ONDE ela
 * acontece. Sem conta, a de sempre, no save do aparelho. Com conta, a rota
 * nomeada do servidor — que reconfere a regra e sorteia com a raiz DELE — e
 * depois a conta inteira é relida para dentro do mesmo objeto que a tela
 * segura: o `salvarE` que vem em seguida grava a conta, e não o estado velho.
 *
 * Recusa do servidor vira o mesmo `Error` das funções locais, com a frase
 * dele: a tela já sabe mostrar isso na faixa de recado.
 *
 * Nesta parte: a inicial, a expedição, a colheita e o lance. A run, a coleção
 * e a jornada vêm na 13.5c–e.
 */
import { api as apiPadrao } from './api.mjs';
import { carregar, escolherInicial, iniciarExpedicao, colher, lancarBola } from './idle-dados.mjs';
import { idleNoServidor, lanceDaConta } from './idle-conta.mjs';
import { sincronizarIdleDaConta } from './idle-servidor.mjs';

function ondeFaz({ api = apiPadrao, deposito = globalThis.localStorage, conta } = {}) {
  return { api, deposito, conta: conta ?? idleNoServidor(api.temSessao()) };
}

async function naConta(e, rota, corpo, { api, deposito }) {
  const r = await api.post(rota, corpo);
  if (!r.ok) throw new Error(r.corpo?.erro ?? 'o servidor não respondeu — nada mudou, tente de novo');
  await sincronizarIdleDaConta({ api, deposito });
  Object.assign(e, carregar(deposito));   // o `carregar` devolve a forma inteira: nada fica do velho
  return r.corpo;
}

export async function inicialNa(e, pack, dex, agora, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return escolherInicial(e, pack, dex, agora);
  return (await naConta(e, '/api/idle/inicial', { dex }, o)).criatura;
}

export async function expedicaoNa(e, { pack, bioma, perfil, equipe, agora, estagio = 1 }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return iniciarExpedicao(e, { pack, bioma, perfil, equipe, agora, estagio });
  return (await naConta(e, '/api/idle/expedicao', { bioma, perfil, equipe, estagio }, o)).expedicao;
}

/* A colheita do servidor responde no mesmo formato da do aparelho — as duas
   são `engine/colheita.mjs` —, e é ela que o painel do saque pinta. */
export async function colherNa(e, { pack, id, agora }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return colher(e, { pack, id, agora });
  return naConta(e, '/api/idle/colher', { expedicao: id }, o);
}

export async function lancarNa(e, { pack, chave, bola, agora }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return lancarBola(e, { pack, chave, bola, agora });
  return lanceDaConta(await naConta(e, '/api/idle/lancar', { chave, bola }, o));
}
