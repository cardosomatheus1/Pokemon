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
 * nenhuma rota sob `/api/idle` existe fora dela. Nasceu vazia na ST-13.1; a
 * ST-13.2b trouxe a inicial, a expedição, a colheita e o lance. Toda escrita
 * usa o `agora` do SERVIDOR: um instante no corpo do pedido é ignorado, e é
 * por isso que relógio adiantado não colhe antes.
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
import { bolsaDe, registroDe, emCampo, estadoDoTeto, especiesVistas, pendentesDe,
         iniciar, colher, lancarPendente, escolherInicial } from './idle.mjs';
import { staminaAgora, restamEncontros, vagasPor, EQUIPE_MAX } from '../engine/expedicao.mjs';
import { estagioMaximo, proximoEstagio } from '../engine/estagios.mjs';

/* As ESCRITAS permitidas sob `/api/idle`, por nome. */
export const OPERACOES_DO_IDLE = Object.freeze([
  'POST /api/idle/inicial', 'POST /api/idle/expedicao', 'POST /api/idle/colher', 'POST /api/idle/lancar',
]);

/* A criatura como o cliente a lê: sem a semente dos ocultos e sem o dono. */
const paraCliente = (c, stamina) => ({
  id: c.id, dex: c.especie, iv: c.iv, potencial: c.potencial, natureza: c.natureza.nome,
  exemplar: c.exemplar, nivel: c.nivel, vinculo: c.vinculo, foco: c.foco,
  ...(stamina != null ? { stamina } : {}), origem: c.origem, criadaEm: c.criadaEm,
});
const expedicaoParaCliente = (x, agora) => ({
  id: x.id, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio, equipe: JSON.parse(x.equipe_json),
  iniciadaEm: x.iniciada_em, terminaEm: x.termina_em, pronta: x.termina_em <= agora,
});

export function colecaoDe(db, { userId, agora, pack = PACK }) {
  const stamina = new Map(db.prepare(`SELECT id, stamina, stamina_em FROM criaturas WHERE user_id = ?`)
    .all(userId).map(l => [l.id, { stamina: l.stamina, staminaEm: l.stamina_em }]));
  const criaturas = doJogador(db, userId, pack)
    .filter(c => c.pack === pack.id)
    .map(c => paraCliente(c, Math.round(staminaAgora(stamina.get(c.id), agora))));
  const expedicoes = emCampo(db, userId).map(x => expedicaoParaCliente(x, agora));
  return {
    pack: pack.id, agora, criaturas,
    registro: registroDe(db, userId, pack.id).map(r => ({ dex: r.dex, fragmentos: r.fragmentos, vistoEm: r.visto_em })),
    bolsa: Object.fromEntries(bolsaDe(db, userId).map(b => [b.item_id, b.quantidade])),
    expedicoes,
    /* Os encontros que esperam bola — a chave é o que o lance manda. */
    encontros: pendentesDe(db, userId),
    teto: { restam: restamEncontros(estadoDoTeto(db, userId, agora, pack)) },
    estagio: { aberto: estagioMaximo(criaturas), proximo: proximoEstagio(criaturas) },
  };
}

const texto = v => (typeof v === 'string' && v.length > 0 && v.length <= 80 ? v : null);
const recusa = mensagem => ({ status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: mensagem } });

export function rotasDaColecao(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/idle': ({ db, userId, agora }) => ({ corpo: colecaoDe(db, { userId, agora }) }),

    'POST /api/idle/inicial': ({ db, corpo, userId }) => {
      if (!Number.isInteger(corpo?.dex)) return recusa('dex inválido');
      return tentar(() => ({ criatura: paraCliente(escolherInicial(db, { userId, pack: PACK, dex: corpo.dex })) }));
    },

    /* As vagas saem do registro do SERVIDOR (1.19), como o teto. */
    'POST /api/idle/expedicao': ({ db, corpo, userId, agora }) => {
      const { bioma, perfil, equipe, estagio = 1 } = corpo ?? {};
      if (!texto(bioma) || !texto(perfil) || !Array.isArray(equipe) || equipe.length > EQUIPE_MAX
          || !equipe.every(texto) || !Number.isInteger(estagio)) return recusa('expedição inválida');
      return tentar(() => ({ expedicao: expedicaoParaCliente(iniciar(db, {
        userId, pack: PACK, bioma, perfil, equipe, estagio, agora,
        limiteSimultaneas: vagasPor(especiesVistas(db, userId, PACK.id)) }), agora) }));
    },

    /* IDEMPOTENTE: a expedição já colhida devolve a resposta GRAVADA na
       colheita — o cliente que perdeu a resposta no caminho a recebe de novo,
       e nada é creditado duas vezes. */
    'POST /api/idle/colher': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.expedicao);
      const x = id && db.prepare(`SELECT colhida_em, resultado_json FROM expedicoes WHERE id = ? AND user_id = ?`).get(id, userId);
      if (!x) return { status: 404, corpo: { codigo: 'IDLE_SEM_EXPEDICAO', erro: 'expedição não existe' } };
      if (x.colhida_em != null)
        return { corpo: { ...(x.resultado_json ? JSON.parse(x.resultado_json) : { expedicao: id }), repetido: true } };
      return tentar(() => colher(db, { id, pack: PACK, agora }));
    },

    'POST /api/idle/lancar': ({ db, corpo, userId, agora }) => {
      const chave = texto(corpo?.chave), bola = texto(corpo?.bola);
      if (!chave || !bola) return recusa('lance inválido');
      return tentar(() => {
        const r = lancarPendente(db, { userId, pack: PACK, chave, bola, agora });
        return { ...r, criatura: r.criatura ? paraCliente(r.criatura) : null };
      });
    },
  };
}
