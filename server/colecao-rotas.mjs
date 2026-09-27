/* A COLEÇÃO NO SERVIDOR (ST-13.1 · E13 · Spec §7.14, §P2).
 *
 * `server/idle.mjs` e `server/criaturas.mjs` são transacionais desde o 1.2d e
 * NÃO TINHAM ROTA: a coleção de quem tem conta morava só no navegador, e um
 * navegador limpo a levava junto. Esta é a primeira porta — e ela só LÊ.
 *
 * ── A REGRA DO ÉPICO, NA FORMA DE UMA LISTA ──────────────────────────────
 *
 * Com conta, o servidor é a fonte de verdade. A forma de isso não virar
 * promessa é a escrita existir SÓ como operação nomeada — iniciar, colher,
 * lançar, dar doce, evoluir —, cada uma reconferindo a regra no servidor.
 * NUNCA um `PUT /api/idle` com o save inteiro: esse caminho seria o cliente
 * declarando quantas criaturas tem, e o §P2 inteiro cairia por ele.
 *
 * `OPERACOES_DO_IDLE` é a lista fechada dessas escritas; o teste confere que
 * nenhuma rota sob `/api/idle` existe fora dela. Nasce vazia: as operações
 * chegam na ST-13.2 (a colheita) e na ST-13.3 (XP, evolução, golpes, doce).
 *
 * ── O QUE A LEITURA NÃO DEVOLVE ──────────────────────────────────────────
 *
 *   semente   a raiz dos ocultos é a chave da AUDITORIA (`conferir`), e o
 *             cliente não precisa dela para nada — o save local nem a lê
 *   dono      a rota já é de quem pediu; o id do usuário não viaja à toa
 *   outro pack  o `dex` 25 de um pack não é o 25 do outro — a coleção é a do
 *             pack que o produto carrega
 *
 * E o RELÓGIO é o do servidor: a stamina sai de `staminaAgora` no `agora`
 * dele, e o `agora` vai junto na resposta — é por ele que a ST-13.5 vai
 * contar o tempo das expedições sem confiar no relógio do aparelho.
 */
import PACK from '../content/escolhido.mjs';
import { doJogador } from './criaturas.mjs';
import { bolsaDe, registroDe, emCampo, estadoDoTeto } from './idle.mjs';
import { staminaAgora, restamEncontros } from '../engine/expedicao.mjs';
import { estagioMaximo, proximoEstagio } from '../engine/estagios.mjs';

/* As ESCRITAS permitidas sob `/api/idle`, por nome. Vazia na ST-13.1. */
export const OPERACOES_DO_IDLE = Object.freeze([]);

export function colecaoDe(db, { userId, agora, pack = PACK }) {
  const stamina = new Map(db.prepare(`SELECT id, stamina, stamina_em FROM criaturas WHERE user_id = ?`)
    .all(userId).map(l => [l.id, { stamina: l.stamina, staminaEm: l.stamina_em }]));
  const criaturas = doJogador(db, userId, pack)
    .filter(c => c.pack === pack.id)
    .map(c => ({
      id: c.id, dex: c.especie, iv: c.iv, potencial: c.potencial, natureza: c.natureza.nome,
      exemplar: c.exemplar, nivel: c.nivel, vinculo: c.vinculo, foco: c.foco,
      stamina: Math.round(staminaAgora(stamina.get(c.id), agora)),
      origem: c.origem, criadaEm: c.criadaEm,
    }));
  const expedicoes = emCampo(db, userId).map(x => ({
    id: x.id, bioma: x.bioma, perfil: x.perfil, equipe: JSON.parse(x.equipe_json),
    iniciadaEm: x.iniciada_em, terminaEm: x.termina_em, pronta: x.termina_em <= agora,
  }));
  return {
    pack: pack.id, agora, criaturas,
    registro: registroDe(db, userId, pack.id).map(r => ({ dex: r.dex, fragmentos: r.fragmentos, vistoEm: r.visto_em })),
    bolsa: Object.fromEntries(bolsaDe(db, userId).map(b => [b.item_id, b.quantidade])),
    expedicoes,
    teto: { restam: restamEncontros(estadoDoTeto(db, userId, agora)) },
    estagio: { aberto: estagioMaximo(criaturas), proximo: proximoEstagio(criaturas) },
  };
}

export function rotasDaColecao() {
  return {
    'GET /api/idle': ({ db, userId, agora }) => ({ corpo: colecaoDe(db, { userId, agora }) }),
  };
}
