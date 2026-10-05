import { treinarOffline, estadoTreinoOffline } from './treino-offline.mjs';
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
import { garantirKitInicial } from './idle.mjs';
import { lotesLivres } from './inventario.mjs';
import { bolsaDe, registroDe, emCampo, estadoDoTeto, lancamentosDoTeto, especiesVistas, pendentesDe,
         iniciar, colher, lancarPendente, escolherInicial } from './idle.mjs';
import { staminaAgora, restamEncontros, vagasPor, EQUIPE_MAX, tetoDeEncontros } from '../engine/expedicao.mjs';
import { ENCONTROS_POR_AVANCO } from '../engine/avanco.mjs';
import { quandoVoltaEncontro, reservadoForaDaRun } from '../app/modules/volta-dados.mjs';
import { sincronizarRun, comecarRun, pocaoNaRun, recuarNaRun, colherRun } from './run.mjs';
import { moverNaConta, trocarNaConta, soltarNaConta, escolherFocoNaConta, trocarGolpeNaConta, evoluirNaConta, darDoceNaConta } from './colecao.mjs';
import { estagioMaximo, proximoEstagio } from '../engine/estagios.mjs';
import { lutarNaConta, jornadaDaConta } from './jornada.mjs';
import { lojaDoIdleNaConta, ACOES_DA_LOJA } from './loja-idle.mjs';
import { marcasDe, jaPossuiuDe, marcarVistasDaRodada, missoesDaConta, resgatarMissaoNaConta } from './escada.mjs';
import { linhaDaExpedicao, linhaDaRun, historicoDoDisco, HISTORICO_MAX } from '../app/modules/historico-dados.mjs';

/* As ESCRITAS permitidas sob `/api/idle`, por nome. */
export const OPERACOES_DO_IDLE = Object.freeze([
  'POST /api/idle/treino', 'POST /api/idle/inicial', 'POST /api/idle/expedicao', 'POST /api/idle/colher', 'POST /api/idle/lancar',
  /* A run do Avanço (ST-13.2c2). */
  'POST /api/idle/run', 'POST /api/idle/run/pocao', 'POST /api/idle/run/recuar', 'POST /api/idle/run/colher',
  /* A coleção (ST-13.3a): a caixa, a troca, soltar e o foco. */
  'POST /api/idle/mover', 'POST /api/idle/trocar', 'POST /api/idle/soltar', 'POST /api/idle/foco',
  /* Os golpes e a evolução (ST-13.3b). */
  'POST /api/idle/golpe', 'POST /api/idle/evoluir',
  /* Dar doce (ST-13.3c). */
  'POST /api/idle/doce',
  /* A luta da jornada (ST-13.7): a semente, o time e o fato são do servidor. */
  'POST /api/idle/jornada/lutar',
  /* A loja do idle (ST-13.9a · D-136): comprar, vender, estilhaçar, montar. */
  'POST /api/idle/loja',
  /* A escada e a semana (ST-13.9b): a rodada assistida e o resgate da missão. */
  'POST /api/idle/vistas', 'POST /api/idle/missao',
]);

/* A criatura como o cliente a lê: sem a semente dos ocultos e sem o dono. */
const paraCliente = (c, stamina) => ({
  id: c.id, dex: c.especie, iv: c.iv, potencial: c.potencial, natureza: c.natureza.nome,
  exemplar: c.exemplar, nivel: c.nivel, xp: c.xp ?? 0, vinculo: c.vinculo, foco: c.foco,
  naCaixa: !!c.naCaixa, descansaAte: c.descansaAte ?? null,
  ...(c.golpes ? { golpes: c.golpes } : {}), ...(c.exclusivos ? { exclusivos: c.exclusivos } : {}),
  ...(stamina != null ? { stamina } : {}), origem: c.origem, criadaEm: c.criadaEm,
  /* ST-14.0D: o shiny da instância e a origem dela — a coleção mostra os dois
     (e a política de troca decide pela origem, no servidor). */
  shiny: !!c.shiny, proveniencia: c.proveniencia,
});
const expedicaoParaCliente = (x, agora) => ({
  id: x.id, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio, equipe: JSON.parse(x.equipe_json),
  iniciadaEm: x.iniciada_em, terminaEm: x.termina_em, pronta: x.termina_em <= agora,
});

export function colecaoDe(db, { userId, agora, pack = PACK }) {
  /* A RUN AVANÇA PRIMEIRO (ST-13.2c2): a leitura é um dos pedidos que a tocam,
     e o que ela devolve é a run no relógio do servidor. Vai COM a raiz: o
     aparelho encena as waves e o clima a partir dela (§7.22.16 — quem fecha a
     aba recebe a mesma run de quem fica olhando). O que ela decide já estava
     decidido no começo; o saque sai da raiz da COLHEITA, que nasce depois. */
  /* o kit de quem começou antes de ele existir: uma vez, e a fonte trava (ST-2.12) */
  garantirKitInicial(db, { userId, pack, agora });
  const aberta = sincronizarRun(db, { userId, pack, agora });
  const stamina = new Map(db.prepare(`SELECT id, stamina, stamina_em FROM criaturas WHERE user_id = ?`)
    .all(userId).map(l => [l.id, { stamina: l.stamina, staminaEm: l.stamina_em }]));
  const criaturas = doJogador(db, userId, pack)
    .filter(c => c.pack === pack.id)
    .map(c => paraCliente(c, Math.round(staminaAgora(stamina.get(c.id), agora))));
  const expedicoes = emCampo(db, userId).map(x => expedicaoParaCliente(x, agora));
  const avancos = db.prepare(`SELECT colhida_em, encontros, resultado_json FROM runs
                               WHERE user_id = ? AND colhida_em > ? ORDER BY colhida_em`)
    .all(userId, agora - 2 * DIA_MS).map(l => {
      const r = JSON.parse(l.resultado_json ?? '{}');
      return { colhidaEm: l.colhida_em, encontros: l.encontros ?? 0, bioma: r.bioma, estagio: r.estagio,
               moedas: r.rendeu?.moedas ?? 0, xp: r.rendeu?.xp ?? 0 };
    });
  return {
    pack: pack.id, agora, criaturas, treinoOffline: estadoTreinoOffline(db,userId),
    registro: registroDe(db, userId, pack.id).map(r => ({ dex: r.dex, fragmentos: r.fragmentos, vistoEm: r.visto_em })),
    bolsa: Object.fromEntries(bolsaDe(db, userId).map(b => [b.item_id, b.quantidade])),
    /* OS LOTES (ST-14.0D · L-224): por item, na ordem em que o débito os gasta,
       só a classe e o que está livre — a tela avisa antes do lance que prende. */
    lotes: lotesLivres(db, userId),
    expedicoes,
    run: aberta.run ? { id: aberta.id, ...aberta.run } : null,
    /* Os encontros que esperam bola — a chave é o que o lance manda. */
    encontros: pendentesDe(db, userId),
    /* As runs colhidas (ST-13.5c), como o aparelho as guarda em `e.avancos`:
       o teto, o rendimento do dia (DEC-14) e o relato do piloto leem delas.
       A janela é a da conta da run no servidor (dois dias): o dia do mundo
       pode começar antes das últimas 24 h. */
    avancos,
    /* O que JÁ SAIU hoje POR EXPEDIÇÃO (ST-13.5b/c): as colhidas não descem
       ao aparelho, e sem este número o teto dele contaria o dia cheio. As
       runs ficam de fora — elas descem em `avancos`, e contariam duas vezes. */
    teto: (t => ({ restam: restamEncontros(t),
      hoje: t.encontrosHoje - avancos.filter(a => a.colhidaEm > agora - DIA_MS).reduce((n, a) => n + a.encontros, 0),
      /* ST-2.27a: QUANDO o próximo encontro de uma run volta — o servidor vê
         as expedições colhidas, que não descem ao aparelho. */
      voltaEm: quandoVoltaEncontro(lancamentosDoTeto(db, userId, agora), agora,
        { teto: tetoDeEncontros(t.vistas, t.total), reservado: reservadoForaDaRun(t), precisa: ENCONTROS_POR_AVANCO }) }))(estadoDoTeto(db, userId, agora, pack)),
    estagio: { aberto: estagioMaximo(criaturas), proximo: proximoEstagio(criaturas) },
    /* A jornada (ST-13.7): o que o servidor venceu por ela. */
    jornada: jornadaDaConta(db, userId).jornada,
    /* O HISTÓRICO (1.28 · L-141): as últimas colheitas dos dois modos, montadas
       da resposta que cada uma GRAVOU — nada se sorteia de novo na leitura. */
    historico: historicoDe(db, userId, pack, criaturas),
    /* A ESCADA E A SEMANA (ST-13.9b · D-136): as marcas da Arena, o "já
       possuiu" e as missões — antes, só no aparelho. */
    marcas: marcasDe(db, userId),
    jaPossuiu: jaPossuiuDe(db, userId, pack.id),
    missoes: missoesDaConta(db, { userId, pack, agora }).missoes,
  };
}

/* As linhas pelas mesmas funções do aparelho. A espécie de quem foi sai da
   coleção de agora; quem foi solta depois some da equipe da linha, e a linha
   continua. Uma linha que não se monta (resposta antiga, torta) fica de fora:
   o histórico é leitura, e não pode derrubar o `GET /api/idle`. */
function historicoDe(db, userId, pack, criaturas) {
  const dexDe = id => criaturas.find(c => c.id === id)?.dex;
  const linhas = [];
  const tentar = f => { try { linhas.push(f()); } catch { /* fica de fora */ } };
  for (const x of db.prepare(`SELECT id, bioma, perfil, estagio, equipe_json, iniciada_em, termina_em, colhida_em, resultado_json
                                FROM expedicoes WHERE user_id = ? AND colhida_em IS NOT NULL AND resultado_json IS NOT NULL
                               ORDER BY colhida_em DESC LIMIT ?`).all(userId, HISTORICO_MAX))
    tentar(() => linhaDaExpedicao({ id: x.id, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio, equipe: JSON.parse(x.equipe_json),
      iniciadaEm: x.iniciada_em, terminaEm: x.termina_em, colhidaEm: x.colhida_em }, JSON.parse(x.resultado_json), { pack, dexDe }));
  for (const r of db.prepare(`SELECT resultado_json FROM runs WHERE user_id = ? AND colhida_em IS NOT NULL AND resultado_json IS NOT NULL
                               ORDER BY colhida_em DESC LIMIT ?`).all(userId, HISTORICO_MAX))
    tentar(() => linhaDaRun(JSON.parse(r.resultado_json), { pack, dexDe }));
  return historicoDoDisco(linhas);
}

const DIA_MS = 24 * 3600_000;
const texto = v => (typeof v === 'string' && v.length > 0 && v.length <= 80 ? v : null);
const recusa = mensagem => ({ status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: mensagem } });

export function rotasDaColecao(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/idle': ({ db, userId, agora }) => ({ corpo: colecaoDe(db, { userId, agora }) }),

    'POST /api/idle/treino': ({ db, userId, agora }) => tentar(() => treinarOffline(db,{userId,pack:PACK,agora})),

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

    /* ── A RUN DO AVANÇO (ST-13.2c2) ─────────────────────────────────────
       O corpo traz a INTENÇÃO (onde, quão fundo, quem); a raiz, o instante e
       o contrato do teto são do servidor — um `raiz` ou `semEncontros` no
       corpo é ignorado, como o `agora` da expedição. */
    'POST /api/idle/run': ({ db, corpo, userId, agora }) => {
      const { bioma, equipe, estagio = 1 } = corpo ?? {};
      if (!texto(bioma) || !Array.isArray(equipe) || !equipe.length || equipe.length > EQUIPE_MAX
          || !equipe.every(texto) || !Number.isInteger(estagio)) return recusa('run inválida');
      return tentar(() => {
        const r = comecarRun(db, { userId, pack: PACK, bioma, estagio, equipe, agora });
        return { run: { id: r.id, ...r.run } };
      });
    },

    'POST /api/idle/run/pocao': ({ db, corpo, userId, agora }) => {
      const item = texto(corpo?.item);
      if (!item) return recusa('poção inválida');
      return tentar(() => {
        const r = pocaoNaRun(db, { userId, pack: PACK, item, agora });
        return { curou: r.curou, item: r.item, run: r.run };
      });
    },

    'POST /api/idle/run/recuar': ({ db, userId, agora }) =>
      tentar(() => ({ run: recuarNaRun(db, { userId, pack: PACK, agora }) })),

    /* IDEMPOTENTE pela run: a já colhida devolve a resposta GRAVADA. O id vem
       da leitura (`run.id`), como o da expedição. */
    'POST /api/idle/run/colher': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.run);
      const x = id && db.prepare(`SELECT colhida_em, resultado_json FROM runs WHERE id = ? AND user_id = ?`).get(id, userId);
      if (!x) return { status: 404, corpo: { codigo: 'RUN_SEM_RUN', erro: 'run não existe' } };
      if (x.colhida_em != null) return { corpo: { run: JSON.parse(x.resultado_json), repetido: true } };
      return tentar(() => ({ run: colherRun(db, { userId, pack: PACK, agora }) }));
    },

    /* ── A COLEÇÃO (ST-13.3a) ── a regra é a de `colecao-regras.mjs`. */
    'POST /api/idle/mover': ({ db, corpo, userId }) => {
      const id = texto(corpo?.id);
      if (!id || typeof corpo?.caixa !== 'boolean') return recusa('movimento inválido');
      return tentar(() => moverNaConta(db, { userId, id, paraCaixa: corpo.caixa }));
    },

    'POST /api/idle/trocar': ({ db, corpo, userId }) => {
      const sai = texto(corpo?.sai), entra = texto(corpo?.entra);
      if (!sai || !entra || sai === entra) return recusa('troca inválida');
      return tentar(() => trocarNaConta(db, { userId, sai, entra }));
    },

    'POST /api/idle/soltar': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.id);
      if (!id) return recusa('criatura inválida');
      return tentar(() => soltarNaConta(db, { userId, pack: PACK, id, agora }));
    },

    'POST /api/idle/foco': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.id), foco = texto(corpo?.foco);
      if (!id || !foco) return recusa('foco inválido');
      return tentar(() => escolherFocoNaConta(db, { userId, id, foco, agora }));
    },

    /* ── OS GOLPES E A EVOLUÇÃO (ST-13.3b) ── as funções do aparelho. */
    'POST /api/idle/golpe': ({ db, corpo, userId }) => {
      const id = texto(corpo?.id), nome = texto(corpo?.nome);
      if (!id || !nome) return recusa('golpe inválido');
      return tentar(() => trocarGolpeNaConta(db, { userId, pack: PACK, id, nome }));
    },

    'POST /api/idle/evoluir': ({ db, corpo, userId }) => {
      const id = texto(corpo?.id);
      const alvo = corpo?.alvo == null ? null : corpo.alvo;
      if (!id || (alvo !== null && !Number.isInteger(alvo))) return recusa('evolução inválida');
      return tentar(() => evoluirNaConta(db, { userId, pack: PACK, id, alvo }));
    },

    /* ── DAR DOCE (ST-13.3c) ── a quantidade é um pedido, e o saldo é do
       livro: a linha nunca vem do corpo. */
    'POST /api/idle/doce': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.id), quantos = corpo?.quantos ?? 1;
      if (!id || !Number.isInteger(quantos) || quantos < 1 || quantos > 999) return recusa('doce inválido');
      return tentar(() => darDoceNaConta(db, { userId, pack: PACK, id, quantos, chaveIdem: corpo?.chaveIdem, agora }));
    },

    /* A LUTA DA JORNADA (ST-13.7): o corpo traz o nó, o preset e a chave do
       pedido; a semente é do servidor (uma `semente` no corpo é ignorada). */
    'POST /api/idle/jornada/lutar': ({ db, corpo, userId, agora }) => {
      const no = texto(corpo?.no), preset = corpo?.preset ?? 'balanced';
      if (!no || typeof preset !== 'string') return recusa('luta inválida');
      return tentar(() => lutarNaConta(db, { userId, pack: PACK, id: no, preset, chaveIdem: corpo?.chaveIdem, agora }));
    },

    /* A LOJA DO IDLE (ST-13.9a · D-136): o corpo traz a INTENÇÃO — a ação, o
       item, quantos e a rota do estilhaço; preço, saldo e sorteio são daqui. */
    'POST /api/idle/loja': ({ db, corpo, userId }) => {
      const acao = corpo?.acao, id = texto(corpo?.id), quantos = corpo?.quantos ?? 1;
      const bioma = corpo?.bioma == null ? null : texto(corpo.bioma);
      if (!ACOES_DA_LOJA.includes(acao) || !id || !Number.isInteger(quantos) || quantos < 1 || quantos > 999) return recusa('pedido de loja inválido');
      if (acao === 'estilhacar' && !(PACK.biomas ?? []).some(b => b.id === bioma)) return recusa('rota desconhecida');
      return tentar(() => lojaDoIdleNaConta(db, { userId, pack: PACK, acao, id, quantos, bioma }));
    },

    /* A RODADA ASSISTIDA (ST-13.9b): o corpo traz a rodada, e o servidor
       marca os lutadores DELA — a lista de espécies nunca vem do navegador. */
    'POST /api/idle/vistas': ({ db, corpo, userId, agora }) => {
      const rodada = texto(corpo?.rodada);
      if (!rodada) return recusa('rodada inválida');
      return tentar(() => marcarVistasDaRodada(db, { userId, rodada, agora }));
    },

    /* O RESGATE DA MISSÃO (ST-13.9b): o prêmio vai para a bolsa da conta. */
    'POST /api/idle/missao': ({ db, corpo, userId, agora }) => {
      const id = texto(corpo?.id);
      if (!id) return recusa('missão inválida');
      return tentar(() => resgatarMissaoNaConta(db, { userId, pack: PACK, id, agora }));
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
