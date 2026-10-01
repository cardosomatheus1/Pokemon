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
 * A inicial, a expedição, a colheita e o lance (13.5b); a run do Avanço
 * (13.5c); a caixa pelo cartão, a evolução e o foco (13.5d) — as outras
 * escritas da coleção gravam direto no disco, e moram em `colecao-acoes.mjs`.
 * A jornada vem na 13.5e.
 *
 * A RUN ANDA NO APARELHO NOS DOIS CASOS: a cena é refeita da raiz a cada
 * quadro (§7.22.16), e a raiz da conta é a do servidor. O que passa por aqui
 * são só as quatro decisões — começar, a poção, recuar e colher.
 */
import { api as apiPadrao } from './api.mjs';
import { carregar, escolherInicial, iniciarExpedicao, colher, lancarBola, mover } from './idle-dados.mjs';
import { aplicar as aplicarEvolucao } from './evolucao-idle.mjs';
import { escolher as escolherFoco } from '../../engine/foco.mjs';
import { comecarAvanco, recuar, usarPocao, colherAvancoDaRun } from './avanco-estado.mjs';
import { idleNoServidor, lanceDaConta, mensagemDoConflito } from './idle-conta.mjs';
import { sincronizarIdleDaConta } from './idle-servidor.mjs';
import { comprar as comprarNaLoja, vender as venderNaLoja } from '../../engine/loja.mjs';
import { estilhacarNaBolsa, montarNaBolsa } from '../../engine/estilhaco.mjs';
import { idDoMaterial } from '../../engine/economia-idle.mjs';
import { derivar } from '../../engine/seed.mjs';
import { semente } from '../../engine/instancia.mjs';

function ondeFaz({ api = apiPadrao, deposito = globalThis.localStorage, conta } = {}) {
  return { api, deposito, conta: conta ?? idleNoServidor(api.temSessao()) };
}

async function naConta(e, rota, corpo, { api, deposito }) {
  const r = await api.post(rota, corpo);
  /* O 409 é a conta que mudou por outro caminho — a run que o servidor já
     fechou, por exemplo (D-145). A tela relê antes de dizer, ou continuaria
     mostrando o que não existe mais. */
  if (r.status === 409) {
    await sincronizarIdleDaConta({ api, deposito });
    Object.assign(e, carregar(deposito));
    throw new Error(mensagemDoConflito(r.corpo));
  }
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

/* ── A RUN DO AVANÇO (ST-13.5c) ── */
export async function comecarNa(e, { pack, bioma, estagio, equipe, agora }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return comecarAvanco(e, { pack, bioma, estagio, equipe, agora });
  return (await naConta(e, '/api/idle/run', { bioma, estagio, equipe }, o)).run;
}

export async function recuarNa(e, agora, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return recuar(e, agora);
  return (await naConta(e, '/api/idle/run/recuar', {}, o)).run;
}

export async function pocaoNa(e, { pack, item, agora }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return usarPocao(e, { pack, item, agora });
  const r = await naConta(e, '/api/idle/run/pocao', { item }, o);
  return { curou: r.curou, item: r.item };
}

/* A COLHEITA DA RUN acontece no quadro em que ela acaba (`pintarRun`), que é
   síncrono. Sem conta ela CONTINUA síncrona — o saque e o quadro saem no
   mesmo quadro, como sempre; com conta, a resposta é uma promessa, e a tela
   espera por ela. A run colhida volta no formato do aparelho: a do servidor
   é a mesma `contaDaRun`. */
export function colherRunNa(e, { pack, agora }, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return colherAvancoDaRun(e, { pack, agora });
  return naConta(e, '/api/idle/run/colher', { run: e.run?.id }, o).then(r => r.run);
}

/* ── A COLEÇÃO QUE A ABA SEGURA (ST-13.5d) ── */
export async function moverNaTela(e, id, paraCaixa, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return mover(e, id, paraCaixa);
  return naConta(e, '/api/idle/mover', { id, caixa: paraCaixa }, o);
}

/* A EVOLUÇÃO devolve o antes e o depois, que a animação alterna. No aparelho
   a pedra é consumida aqui — quem decide é `aplicar` (ST-13.3b), e aqui só se
   escreve no save; na conta, o servidor consome na mesma transação. */
export async function evoluirNa(e, pack, i, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) {
    const r = aplicarEvolucao(pack, e.criaturas[i], e.bolsa);
    if (r.consome && (e.bolsa[r.consome] ?? 0) > 0) e.bolsa[r.consome] -= 1;
    e.criaturas[i] = r.criatura;
    return r;
  }
  const r = await naConta(e, '/api/idle/evoluir', { id: e.criaturas[i]?.id }, o);
  return { de: r.de, para: r.para, consome: r.consome ?? null };
}

/* O FOCO devolve a criatura nova, como `escolher` — a janela do foco a
   entrega a quem a abriu. Com conta, a criatura é a relida da conta. */
export async function focoNa(e, c, foco, agora, opcoes) {
  const o = ondeFaz(opcoes);
  if (!o.conta) return escolherFoco(c, foco, agora);
  await naConta(e, '/api/idle/foco', { id: c.id, foco }, o);
  return e.criaturas.find(x => x.id === c.id) ?? null;
}

/* ── A LOJA DO IDLE (ST-13.9a · D-136) ────────────────────────────────────
 * Comprar, vender, estilhaçar e montar. Morava na tela, escrevendo só no
 * save — e com conta a leitura seguinte trazia a bolsa do servidor, e a
 * compra sumia. As contas são as do motor nos dois casos; com conta, o
 * servidor as refaz e sorteia o estilhaço com a raiz DELE. A resposta tem a
 * mesma forma nos dois, e é ela que a faixa de recado lê. */
export async function lojaNa(e, { pack, acao, id, quantos = 1, bioma = null }, opcoes) {
  const o = ondeFaz(opcoes);
  if (o.conta) return naConta(e, '/api/idle/loja', { acao, id, quantos, bioma }, o);
  if (acao === 'comprar') {
    const r = comprarNaLoja(e, { pack, id, quantos });
    e.bolsa = r.estado.bolsa;
    return { acao, id, levou: r.levou, gasto: r.gasto };
  }
  if (acao === 'vender') {
    const r = venderNaLoja(e, { pack, id, quantos });
    e.bolsa = r.estado.bolsa;
    return { acao, id, deu: r.deu, recebeu: r.recebeu };
  }
  if (acao === 'estilhacar') {
    /* A semente do aparelho sai do CONTADOR gravado (1.29): recarregar a
       página não sorteia de novo. Ele só anda quando a troca acontece. */
    const r = estilhacarNaBolsa(e.bolsa, { catalogo: pack.catalogo ?? [], material: idDoMaterial(pack), id, bioma,
                                           sorte: semente(derivar((e.estilhacos ?? 0) + 1, 'estilhaco:' + bioma)) });
    e.bolsa = r.bolsa;
    e.estilhacos = (e.estilhacos ?? 0) + 1;
    return { acao, id, sorteado: { id: r.sorteado.id, nome: r.sorteado.nome }, custo: r.custo, partes: r.partes };
  }
  if (acao === 'montar') { e.bolsa = montarNaBolsa(e.bolsa, id).bolsa; return { acao, id }; }
  throw new Error('ação de loja desconhecida');
}
