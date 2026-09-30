/* AS ESCRITAS DA COLEÇÃO, COM E SEM CONTA (ST-13.5d · E13 · DEC-17) — camada 4.
 *
 * O time (tirar, pôr, trocar), soltar, dar doce e os golpes gravam DIRETO no
 * save do aparelho, com a revisão da ST-3.2, e devolvem `{ ok, motivo }` —
 * a tela repinta lendo do disco. Com conta, a mesma pergunta vai à rota
 * nomeada do servidor, a conta é relida para o disco, e a resposta vem na
 * mesma forma: a tela não precisa saber onde a escrita aconteceu.
 *
 * As escritas que mexem no estado que a aba do idle SEGURA em memória (a
 * caixa pelo cartão, a evolução e o foco) moram em `idle-acoes.mjs`, que relê
 * a conta para dentro desse objeto.
 */
import { api as apiPadrao } from './api.mjs';
import { idleNoServidor } from './idle-conta.mjs';
import { sincronizarIdleDaConta } from './idle-servidor.mjs';
import { moverLocal, trocarLocal } from './time-local.mjs';
import { soltarLocal, darDoceLocal } from './doce-local.mjs';

function ondeFaz({ api = apiPadrao, deposito = globalThis.localStorage, conta } = {}) {
  return { api, deposito, conta: conta ?? idleNoServidor(api.temSessao()) };
}

/* A recusa do servidor vira `{ ok: false, motivo }` com a frase dele — a
   mesma forma da recusa do aparelho, que a tela já sabe mostrar. */
async function pelaConta(rota, corpo, { api, deposito }) {
  const r = await api.post(rota, corpo);
  if (!r.ok) return { ok: false, motivo: r.corpo?.erro ?? 'o servidor não respondeu — nada mudou, tente de novo' };
  await sincronizarIdleDaConta({ api, deposito });
  return { ...r.corpo, ok: true };
}

/* Para a escrita cuja versão do aparelho mora numa tela (os golpes): a tela
   passa a função dela, e esta decide qual das duas roda. */
export async function naContaOu(rota, corpo, local, opcoes) {
  const o = ondeFaz(opcoes);
  return o.conta ? pelaConta(rota, corpo, o) : local(o.deposito);
}

export const moverNa = ({ id, paraCaixa }, opcoes) =>
  naContaOu('/api/idle/mover', { id, caixa: paraCaixa }, d => moverLocal({ id, paraCaixa }, d), opcoes);

export const trocarNa = ({ sai, entra }, opcoes) =>
  naContaOu('/api/idle/trocar', { sai, entra }, d => trocarLocal({ sai, entra }, d), opcoes);

export const soltarNa = ({ pack, id }, opcoes) =>
  naContaOu('/api/idle/soltar', { id }, d => soltarLocal({ pack, id }, d), opcoes);

/* A CHAVE DO PEDIDO torna o doce idempotente no servidor: o clique que se
   repete porque a resposta se perdeu não gasta o doce duas vezes. */
export const chaveDoPedido = (id, agora = Date.now(), sorte = Math.random()) =>
  `doce-${String(id).replace(/[^\w-]/g, '').slice(0, 24)}-${agora.toString(36)}-${Math.floor(sorte * 36 ** 6).toString(36)}`;

export const darDoceNa = ({ pack, id }, opcoes) =>
  naContaOu('/api/idle/doce', { id, quantos: 1, chaveIdem: chaveDoPedido(id) }, d => darDoceLocal({ pack, id }, d), opcoes);
