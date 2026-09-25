/* TELEMETRIA DO SERVIDOR (F1.11) — o capítulo 17, e a parte que não se amostra.
 *
 * ── A REGRA QUE DEFINE ESTE MÓDULO ─────────────────────────────────────────
 *
 * O §4.7 fecha a lista de eventos de proteção assim:
 *
 *     "Nenhum destes eventos pode ser amostrado — são registro de
 *      conformidade, não métrica de produto."
 *
 * Amostragem é a otimização óbvia de qualquer telemetria com volume: guarda 1
 * em 100 e a conta cai 99%. Para métrica de produto isso é certo. Para registro
 * de conformidade é a diferença entre poder responder "este jogador recebeu o
 * aviso?" e ter que dizer "provavelmente".
 *
 * Por isso a proteção não é uma convenção nem um comentário: `PROTECAO` é uma
 * lista fechada, `amostravel` é coluna do banco, e `emitir` RECUSA amostrar
 * quando o nome está na lista. O dia em que alguém ligar amostragem para conter
 * custo, esses eventos passam inteiros — sem ninguém precisar lembrar.
 *
 * ── OS CAMPOS OBRIGATÓRIOS ─────────────────────────────────────────────────
 *
 * O §4.7 nomeia sete. Nem todo evento usa todos — `limit_type` não faz sentido
 * num `cooloff_started` —, mas cada evento declara os SEUS, e emitir sem eles é
 * recusado. Campo obrigatório que chega vazio é pior que campo ausente: o
 * painel soma zero e ninguém percebe.
 */
import { randomUUID } from 'node:crypto';

/* A LISTA É O CONTRATO DO DOCUMENTO, copiada dele e conferida contra ele por
   `test/telemetria-servidor.mjs`. Encolher esta lista é o defeito, e é por isso
   que o teste lê o §4.7 em vez de comparar com uma cópia. */
export const PROTECAO = [
  'age_declaration_submitted', 'age_verification_passed', 'age_verification_failed',
  'limit_set', 'limit_increase_requested', 'limit_increase_applied',
  'limit_decrease_applied', 'limit_blocked_action',
  'reality_check_shown', 'reality_check_acknowledged', 'session_limit_reached',
  'cooloff_started', 'self_exclusion_started', 'self_exclusion_expired',
  'self_exclusion_reentry_blocked',
  'risk_signal_raised', 'risk_intervention_shown', 'net_position_viewed',
  'rescue_grant_issued', 'rescue_grant_blocked_by_policy',
];

const DE_PROTECAO = new Set(PROTECAO);

/* Os campos que cada evento de proteção precisa carregar. O §4.7 lista sete no
   total; aqui cada evento declara os que fazem sentido nele. Declarar por
   evento — e não exigir os sete em todos — é o que impede o preenchimento
   automático com `null`, que satisfaria a regra e não responderia nada. */
export const OBRIGATORIOS = {
  limit_set:                      ['user_id', 'limit_type', 'limit_value', 'window'],
  limit_increase_requested:       ['user_id', 'limit_type', 'limit_value'],
  limit_increase_applied:         ['user_id', 'limit_type', 'limit_value'],
  limit_decrease_applied:         ['user_id', 'limit_type', 'limit_value'],
  limit_blocked_action:           ['user_id', 'limit_type', 'action_blocked'],
  session_limit_reached:          ['user_id', 'limit_type'],
  reality_check_shown:            ['user_id'],
  reality_check_acknowledged:     ['user_id'],
  cooloff_started:                ['user_id', 'window'],
  self_exclusion_started:         ['user_id', 'window'],
  self_exclusion_expired:         ['user_id'],
  self_exclusion_reentry_blocked: ['user_id', 'action_blocked'],
  risk_signal_raised:             ['user_id', 'signal_type'],
  risk_intervention_shown:        ['user_id', 'intervention_id'],
  net_position_viewed:            ['user_id'],
  rescue_grant_issued:            ['user_id'],
  rescue_grant_blocked_by_policy: ['user_id', 'action_blocked'],
  age_declaration_submitted:      ['user_id'],
  age_verification_passed:        ['user_id'],
  age_verification_failed:        ['user_id'],
};

export const ERRO_TELEMETRIA = {
  CAMPO:      'campo_obrigatorio_ausente',
  AMOSTRAGEM: 'evento_de_protecao_nao_se_amostra',
  LOTE:       'lote_de_eventos_grande_demais',
};

/* ── O QUE O CLIENTE PODE RELATAR (ST-7.1a) ─────────────────────────────────
 *
 * Lista FECHADA: o que só o navegador sabe (o idle mora nele) e a presença do
 * dia. Aposta e compra NÃO estão aqui — quem as anota é o servidor, no
 * instante em que elas acontecem; aceitar do cliente seria deixar ele dizer
 * quanto apostou. */
export const DO_CLIENTE = ['session_started', 'run_harvested', 'expedition_harvested'];
export const LOTE_MAXIMO = 50;

const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

export const ehDeProtecao = nome => DE_PROTECAO.has(nome);

/* `amostra` é a fração que se GUARDA: 1 guarda tudo, 0.01 guarda um em cem.
 * Para evento de proteção o parâmetro é IGNORADO — e o teste cobra que passar
 * 0 continue gravando. Recusar com exceção seria pior: quem ligou amostragem
 * global veria o serviço quebrar, e a tentação seria tirar o evento da lista. */
export function emitir(db, { nome, userId = null, roundId = null, campos = {}, chave = null,
                             amostra = 1, sorteio = Math.random, agora = Date.now() }) {
  const protecao = ehDeProtecao(nome);

  if (protecao) {
    const exigidos = OBRIGATORIOS[nome] || ['user_id'];
    const presentes = { user_id: userId, ...campos };
    for (const c of exigidos)
      if (presentes[c] === undefined || presentes[c] === null || presentes[c] === '')
        throw erro(ERRO_TELEMETRIA.CAMPO,
          `evento \`${nome}\` sem o campo obrigatório \`${c}\` (§4.7)`);
  } else if (amostra < 1 && sorteio() >= amostra) {
    /* Métrica de produto pode ser amostrada, e é aqui que isso acontece. A
       assimetria é o bloco inteiro: um lado é custo, o outro é conformidade. */
    return null;
  }

  const id = randomUUID();
  /* COM CHAVE, O REPETIDO É IGNORADO e devolve o id do primeiro (ST-7.1a). */
  const r = db.prepare(`INSERT OR IGNORE INTO telemetry_events
                          (id, nome, user_id, round_id, amostravel, campos, criado_em, chave)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, nome, userId, roundId, protecao ? 0 : 1, JSON.stringify(campos), agora, chave);
  if (r.changes === 0 && chave != null)
    return db.prepare(`SELECT id FROM telemetry_events WHERE user_id IS ? AND nome = ? AND chave = ?`)
      .get(userId, nome, chave)?.id ?? null;
  return id;
}

/* ── O RELATO DO CLIENTE (ST-7.1a) ──────────────────────────────────────────
 *
 * O usuário vem da SESSÃO (parâmetro), nunca do corpo. Cada evento precisa de
 * nome da lista e de chave — sem chave, reenviar duplicaria. Os campos são
 * achatados: só número, booleano e texto curto; objeto e `user_id` no meio dos
 * campos são descartados, porque campo livre vindo do cliente é por onde o
 * banco enche de lixo. */
const CAMPO_OK = v => typeof v === 'number' ? Number.isFinite(v)
  : typeof v === 'boolean' || (typeof v === 'string' && v.length <= 40);
export function receberDoCliente(db, { userId, eventos, agora = Date.now() }) {
  const lista = Array.isArray(eventos) ? eventos : [];
  if (lista.length > LOTE_MAXIMO)
    throw erro(ERRO_TELEMETRIA.LOTE, `no máximo ${LOTE_MAXIMO} eventos por relato`);
  let aceitos = 0, recusados = 0;
  for (const ev of lista) {
    const chave = typeof ev?.chave === 'string' && ev.chave.length <= 80 ? ev.chave : null;
    if (!DO_CLIENTE.includes(ev?.nome) || !chave) { recusados++; continue; }
    const campos = Object.fromEntries(Object.entries(ev.campos ?? {})
      .filter(([k, v]) => k !== 'user_id' && k.length <= 30 && CAMPO_OK(v)).slice(0, 12));
    anotar(db, { nome: ev.nome, userId, chave, campos, agora });
    aceitos++;
  }
  return { aceitos, recusados };
}

/* ── ANOTAR: EMITIR SEM PODER DERRUBAR A DECISÃO (R21, fecha o D-034) ──────
 *
 * `emitir` lança — e tem que lançar: é assim que evento sem campo obrigatório
 * é recusado em vez de entrar pela metade.
 *
 * Mas quem chama nos módulos de proteção está no meio de uma DECISÃO já
 * tomada. Uma pausa que falha porque o registro dela falhou é o pior desenho
 * possível: o evento existe para PROVAR que a proteção funcionou, e viraria a
 * coisa que a impede. A ordem é decidir, executar, registrar — e a terceira
 * não pode desfazer as duas primeiras.
 *
 * ── POR QUE ENGOLIR AQUI NÃO ESCONDE DEFEITO ──────────────────────────────
 *
 * Porque a validação continua sendo cobrada, só que pelo outro lado: os testes
 * de comportamento do `test/telemetria-ligada.mjs` exigem que o evento ESTEJA
 * no banco com os campos certos. Um campo obrigatório faltando faz `emitir`
 * lançar, este `catch` engole, o evento não aparece — e o teste falha dizendo
 * "não gerou evento".
 *
 * O que se engole aqui é falha de INFRAESTRUTURA em produção, que é
 * exatamente o caso em que a proteção precisa continuar valendo.
 */
export function anotar(db, args) {
  try { return emitir(db, args); }
  catch { return null; }
}

export const eventosDe = (db, { nome, desde = 0, ate = Number.MAX_SAFE_INTEGER }) =>
  db.prepare(`SELECT * FROM telemetry_events
               WHERE nome = ? AND criado_em >= ? AND criado_em <= ? ORDER BY criado_em`)
    .all(nome, desde, ate);
