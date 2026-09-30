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
 * `IDLE_NA_CONTA` fica DESLIGADA até a última parte da ST-13.5 (a 13.5e): as
 * escritas passam ao servidor uma parte por vez, e o jogo com conta só muda
 * quando todas estiverem prontas.
 */
import { camposDaJornada } from '../../engine/jornada.mjs';

export const IDLE_NA_CONTA = false;
export const idleNoServidor = temSessao => IDLE_NA_CONTA && !!temSessao;

/* O que o `carregar` do aparelho guarda da conta: o relógio, o teto e o
   estágio que o servidor mandou, e se a última leitura falhou. */
export function camposDaConta(cru) {
  const c = cru?.conta;
  if (!c || typeof c !== 'object') return { conta: null };
  return { conta: { agora: Number.isFinite(c.agora) ? c.agora : null, teto: c.teto ?? null, estagio: c.estagio ?? null, desatualizado: c.desatualizado === true } };
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
    avancos: [],
    run: srv.run ?? null,
    ...camposDaJornada({ jornada: srv.jornada }),
    doces: doces ?? local.doces ?? {},
    conta: { agora, teto: srv.teto ?? null, estagio: srv.estagio ?? null, desatualizado: false },
  };
}

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
