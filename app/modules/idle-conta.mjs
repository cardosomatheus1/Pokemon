/* COM CONTA, O IDLE É DA CONTA (ST-13.5 · E13 · DEC-17) — camada 0.
 *
 * O save do aparelho continua sendo o que as telas leem; com conta ele vira
 * CACHE do servidor. `idleDaConta` põe a resposta do `GET /api/idle` no
 * formato do aparelho — é a única ponte, para que as funções de leitura de
 * sempre (stamina, pronta, vistos, criaturas hidratadas) respondam sobre a
 * conta sem saber de onde o estado veio.
 *
 * A DEC-17 do dono ("quem já tinha perde"): nada do save antigo do aparelho
 * sobe para a conta. Da leitura, o que é da CONTA vem inteiro do servidor; do
 * aparelho fica só o que é do aparelho (as missões da semana, o contador de
 * estilhaços, a revisão do save).
 *
 * `IDLE_NA_CONTA` ficou DESLIGADA até a última parte da ST-13.5: as escritas
 * passaram ao servidor uma parte por vez (13.5a–d), e a chave LIGOU na 13.5e,
 * com todas prontas. Ela continua existindo como a porta de volta: desligada,
 * o jogo com conta volta a jogar no aparelho.
 */
import { camposDaJornada } from '../../engine/jornada.mjs';

export const IDLE_NA_CONTA = true;
export const idleNoServidor = temSessao => IDLE_NA_CONTA && !!temSessao;

/* O que o `carregar` do aparelho guarda da conta: o relógio, o teto e o
   estágio que o servidor mandou, e se a última leitura falhou. */
export function camposDaConta(cru) {
  const c = cru?.conta;
  if (!c || typeof c !== 'object') return { conta: null };
  /* O teto volta do disco como NÚMEROS inteiros não negativos: `hoje` entra
     na soma do teto do aparelho, e é campo lido de onde o jogador escreve. */
  const n = v => (Number.isInteger(v) && v >= 0 ? v : 0);
  const teto = c.teto && typeof c.teto === 'object' ? { restam: n(c.teto.restam), hoje: n(c.teto.hoje) } : null;
  return { conta: { agora: Number.isFinite(c.agora) ? c.agora : null, teto, estagio: c.estagio ?? null, desatualizado: c.desatualizado === true } };
}

export function idleDaConta(local, srv, { doces = null } = {}) {
  const agora = srv.agora;
  return {
    ...local,
    /* A stamina: o servidor manda o valor no relógio DELE; o aparelho guarda o
       par valor e instante — o instante é o do servidor. */
    criaturas: (srv.criaturas ?? []).map(c => ({ ...c, staminaEm: agora })),
    /* Só as expedições em campo descem; as colhidas ficam no servidor, e o teto
       do dia vem pronto em `conta.teto`. */
    expedicoes: (srv.expedicoes ?? []).map(x => ({ id: x.id, pack: srv.pack, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio,
      equipe: [...(x.equipe ?? [])], custo: null, iniciadaEm: x.iniciadaEm, terminaEm: x.terminaEm, colhidaEm: null, semente: null })),
    bolsa: { ...(srv.bolsa ?? {}) },
    /* O registro: lista no servidor, objeto `{ dex: fragmentos }` no aparelho. */
    registro: Object.fromEntries((srv.registro ?? []).map(r => [r.dex, r.fragmentos])),
    encontros: (srv.encontros ?? []).map(k => ({ ...k, origem: k.origem ?? 'expedicao', expedicao: k.expedicao ?? null })),
    /* As runs colhidas nos últimos dois dias, no formato do lançamento do
       teto (`lancarRunNoTeto`) — o rendimento do dia e o teto leem delas. */
    avancos: (srv.avancos ?? []).map(a => ({ colhidaEm: a.colhidaEm, encontros: a.encontros ?? 0, bioma: a.bioma, estagio: a.estagio, moedas: a.moedas ?? 0, xp: a.xp ?? 0 })),
    run: srv.run ?? null,
    ...camposDaJornada({ jornada: srv.jornada }),
    doces: doces ?? local.doces ?? {},
    conta: { agora, teto: srv.teto ?? null, estagio: srv.estagio ?? null, desatualizado: false },
  };
}

/* O LANCE DA CONTA no formato do lance do aparelho: o servidor não diz se a
   criatura foi para a caixa — a criatura diz. */
export const lanceDaConta = r => ({ ...r, foiParaCaixa: !!r?.criatura?.naCaixa });

/* O aviso da tela: só quando a última leitura da conta falhou. */
export const avisoDaConta = e => (e?.conta?.desatualizado ? 'Sem conexão com o servidor: a sua coleção pode estar desatualizada.' : null);

/* Pinta o aviso nos nós que a tela passar (as duas abas do farm): o texto
   quando é verdade, escondido quando deixa de ser. Sem DOM aqui — a tela
   entrega os nós, e a decisão fica testável em Node. */
export function pintarAvisoDaConta(nos, e) {
  const texto = avisoDaConta(e);
  for (const n of nos) { n.textContent = texto ?? ''; n.hidden = !texto; }
  return texto;
}
