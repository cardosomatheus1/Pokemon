/* PROGRESSÃO NO SERVIDOR (F1.10) — perfil, desafios, trilha de login, resgate.
 *
 * Fronteira: guarda o que o jogador conquistou e decide o que ele recebe. As
 * REGRAS de emissão moram no `engine/emissao.mjs`, que é puro e não conhece
 * banco; aqui é onde elas encontram os fatos.
 *
 * ── O QUE ESTE MÓDULO EXISTE PARA TORNAR IMPOSSÍVEL ────────────────────────
 *
 * Até o F1.10 a progressão morava no `localStorage`. Duas consequências, e as
 * duas são do §5.10:
 *
 *   1. limpar o navegador apagava semanas de jogo;
 *   2. forjar progresso era editar um JSON — nível 40 em dez segundos.
 *
 * A segunda é a que decide o desenho: **o cliente nunca diz quanto progrediu.**
 * Ele diz o que FEZ — apostou, venceu, entrou — e o servidor deriva. Uma rota
 * que aceitasse `progresso: 999` seria a mesma edição de JSON com mais passos.
 *
 * ── O RELÓGIO É DAQUI, E ISSO É UM ITEM DE SABOTAGEM ───────────────────────
 *
 * "Farmar login streak manipulando fuso horário" é um dos ataques declarados do
 * bloco. Nenhuma função aqui recebe data do cliente: o dia sai de `agora`, que
 * é injetado pelo servidor, e a trilha é uma SÉRIE de dias no banco — não um
 * contador que alguém incrementa. Sequência se recalcula dos fatos; contador se
 * empurra.
 */
import { randomUUID } from 'node:crypto';
import {
  recompensaDeDesafio, avaliarResgate, semanaDe,
  ORCAMENTO_LOGIN_SEMANAL, RESGATE_VALOR,
} from '../engine/emissao.mjs';

export const ERRO_PROGRESSAO = {
  DESAFIO:   'desafio_invalido',
  JA_PAGO:   'desafio_ja_pago',
  NAO_FEITO: 'desafio_incompleto',
  RESGATE:   'resgate_negado',
};

const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

/* O DIA SAI DO SERVIDOR, SEMPRE. `toISOString` é UTC, e UTC é o que impede a
   troca de fuso de virar um dia novo. Um jogador em Kiritimati e outro em
   Honolulu têm o mesmo "hoje" aqui — o que se perde em conveniência se ganha
   em não haver 26 horas de dia por conta. */
export const diaDe = agora => new Date(agora).toISOString().slice(0, 10);
const diaAnterior = dia => {
  const d = new Date(dia + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/* ── PERFIL ────────────────────────────────────────────────────────────────*/

/* A CURVA DE NÍVEL É A MESMA DO CLIENTE, e ela precisa ser: o jogador vê o
   nível na tela antes de o servidor responder, e ver 12 virar 11 é pior que
   esperar. A fonte é o `engine`, não uma cópia. */
export const XP_POR_NIVEL = 500;
export const nivelDe = xp => 1 + Math.floor(Math.max(0, xp) / XP_POR_NIVEL);

export function perfilDe(db, { userId, agora = Date.now() }) {
  let p = db.prepare(`SELECT * FROM player_profile WHERE user_id = ?`).get(userId);
  if (!p) {
    db.prepare(`INSERT INTO player_profile (user_id, xp, criado_em, visto_em)
                VALUES (?, 0, ?, ?)`).run(userId, agora, agora);
    p = db.prepare(`SELECT * FROM player_profile WHERE user_id = ?`).get(userId);
  }
  return { ...p, nivel: nivelDe(p.xp) };
}

/* XP SÓ SOBE POR FATO, e o fato tem nome. `motivo` não é decoração: sem ele o
   painel do F1.11 não distingue XP de aposta de XP de desafio, e a curva de
   progressão vira um número sem origem. */
export function darXP(db, { userId, quanto, motivo, agora = Date.now() }) {
  if (!Number.isInteger(quanto) || quanto <= 0) throw erro('xp_invalido', 'XP precisa ser inteiro positivo');
  if (!motivo) throw erro('xp_invalido', 'XP sem motivo não é auditável');
  perfilDe(db, { userId, agora });
  db.prepare(`UPDATE player_profile SET xp = xp + ?, visto_em = ? WHERE user_id = ?`)
    .run(quanto, agora, userId);
  return perfilDe(db, { userId, agora });
}

/* ── DESAFIOS ──────────────────────────────────────────────────────────────*/

/* O pool é do CONTEÚDO, e chega de fora: o motor é agnóstico ao tema e uma
   lista de tipos aqui dentro seria identificador da franquia no servidor. */
export const POOL_PADRAO = [
  { tipo: 'apostar',      alvo: 3 },
  { tipo: 'vencer',       alvo: 1 },
  { tipo: 'assistir',     alvo: 5 },
  { tipo: 'variedade',    alvo: 3 },
  { tipo: 'aposta_alta',  alvo: 1 },
];

/* Três por dia, sorteados de forma DETERMINÍSTICA por (conta, dia). Sortear com
   `Math.random` faria o mesmo dia render desafios diferentes a cada consulta —
   e o jogador que recarregasse a página veria a lista trocar. */
function sorteioDoDia(userId, dia, n = 3) {
  let h = 2166136261;
  for (const c of userId + '|' + dia) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const fora = [], usados = new Set();
  for (let i = 0; i < n; i++) {
    let k = (h >>> 0) % POOL_PADRAO.length;
    while (usados.has(k)) k = (k + 1) % POOL_PADRAO.length;
    usados.add(k); fora.push(POOL_PADRAO[k]);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
  }
  return fora;
}

export function desafiosDe(db, { userId, agora = Date.now() }) {
  const dia = diaDe(agora);
  const existentes = db.prepare(
    `SELECT * FROM challenges WHERE user_id = ? AND dia = ? ORDER BY slot`).all(userId, dia);
  if (existentes.length) return existentes;

  const inserir = db.prepare(
    `INSERT INTO challenges (user_id, dia, slot, tipo, alvo) VALUES (?, ?, ?, ?, ?)`);
  sorteioDoDia(userId, dia).forEach((d, i) => inserir.run(userId, dia, i, d.tipo, d.alvo));
  return db.prepare(`SELECT * FROM challenges WHERE user_id = ? AND dia = ? ORDER BY slot`)
    .all(userId, dia);
}

/* O CLIENTE DIZ O QUE FEZ, NUNCA QUANTO PROGREDIU.
 *
 * `registrarFeito(db, {userId, tipo})` soma UM ao progresso dos desafios
 * daquele tipo. Não existe caminho para escrever `progresso` diretamente — e é
 * essa ausência que responde ao item "forjar progresso de desafio pelo cliente"
 * da sabotagem do bloco. */
export function registrarFeito(db, { userId, tipo, agora = Date.now() }) {
  const dia = diaDe(agora);
  desafiosDe(db, { userId, agora });
  const alvos = db.prepare(
    `SELECT * FROM challenges WHERE user_id = ? AND dia = ? AND tipo = ? AND concluido_em IS NULL`)
    .all(userId, dia, tipo);
  for (const d of alvos) {
    const novo = Math.min(d.alvo, d.progresso + 1);
    const fechou = novo >= d.alvo ? agora : null;
    db.prepare(`UPDATE challenges SET progresso = ?, concluido_em = ?
                 WHERE user_id = ? AND dia = ? AND slot = ?`)
      .run(novo, fechou, userId, dia, d.slot);
  }
  return desafiosDe(db, { userId, agora });
}

const concluidosNaSemana = (db, userId, agora) => db.prepare(
  `SELECT COUNT(*) AS n FROM challenges
    WHERE user_id = ? AND concluido_em IS NOT NULL AND dia >= ?`)
  .get(userId, primeiroDiaDaSemana(agora)).n;

/* A semana do orçamento é a MESMA que o `engine/emissao.mjs` usa — `semanaDe`
   é dele. Duas definições de semana fariam o teto de emissão valer para uma e
   não para a outra. */
function primeiroDiaDaSemana(agora) {
  const d = new Date(agora);
  const dow = (d.getUTCDay() + 6) % 7;            // segunda = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export const emitidoNaSemana = (db, userId, agora) => {
  const desde = primeiroDiaDaSemana(agora);
  const desafios = db.prepare(
    `SELECT COALESCE(SUM(pago_em IS NOT NULL), 0) AS n FROM challenges
      WHERE user_id = ? AND dia >= ?`).get(userId, desde).n;
  const login = db.prepare(
    `SELECT COALESCE(SUM(pcb), 0) AS s FROM login_streak WHERE user_id = ? AND dia >= ?`)
    .get(userId, desde).s;
  const resgate = db.prepare(
    `SELECT COALESCE(SUM(valor), 0) AS s FROM rescue_grants
      WHERE user_id = ? AND semana = ? AND concedido = 1`)
    .get(userId, semanaDe(new Date(agora).toISOString())).s;
  return { desafios, login, resgate, rotineiro: resgate + desafios };
};

/* ── A TRILHA DE LOGIN ─────────────────────────────────────────────────────
 *
 * Uma linha por dia em que a conta apareceu. A SEQUÊNCIA é recalculada dos
 * fatos, andando para trás dia a dia — nunca guardada como número.
 *
 * A diferença importa e é o item "farmar streak manipulando fuso" da
 * sabotagem: um `dias_seguidos INTEGER` que alguém incrementa não distingue
 * sete dias seguidos de sete logins, e qualquer troca de relógio no cliente
 * viraria um dia novo. Aqui o dia sai de `agora`, do servidor, e a linha é
 * única por (conta, dia) — entrar dez vezes no mesmo dia é uma linha só. */
export function sequenciaDeLogin(db, { userId, agora = Date.now() }) {
  const dias = new Set(db.prepare(
    `SELECT dia FROM login_streak WHERE user_id = ? ORDER BY dia DESC LIMIT 60`)
    .all(userId).map(r => r.dia));
  let n = 0, cursor = diaDe(agora);
  while (dias.has(cursor)) { n++; cursor = diaAnterior(cursor); }
  return n;
}

/* A trilha de 7 dias do §5.10. O valor por dia sai do orçamento de login e é
   dividido pela trilha — não é um número escolhido à mão, e por isso não pode
   sair de sincronia com o Estudo. */
export const TRILHA_DIAS = 7;
export const LOGIN_POR_DIA = Math.floor(ORCAMENTO_LOGIN_SEMANAL / TRILHA_DIAS);

export function registrarLogin(db, { userId, agora = Date.now() }) {
  const dia = diaDe(agora);
  const ja = db.prepare(`SELECT 1 FROM login_streak WHERE user_id = ? AND dia = ?`)
    .get(userId, dia);
  if (ja) return { creditou: 0, sequencia: sequenciaDeLogin(db, { userId, agora }), repetido: true };

  /* O TETO É POR SEMANA, e o de login é dele. Sem esta conta, quem entrasse
     todo dia por oito semanas receberia oito vezes o orçamento — o teto do
     documento vale por semana, não por trilha. */
  const { login } = emitidoNaSemana(db, userId, agora);
  const cabe = Math.max(0, ORCAMENTO_LOGIN_SEMANAL - login);
  const pcb = Math.min(LOGIN_POR_DIA, cabe);

  db.prepare(`INSERT INTO login_streak (user_id, dia, pcb, criado_em) VALUES (?, ?, ?, ?)`)
    .run(userId, dia, pcb, agora);
  return { creditou: pcb, sequencia: sequenciaDeLogin(db, { userId, agora }), repetido: false };
}

/* ── O RESGATE DO §28.8 ────────────────────────────────────────────────────
 *
 * A DECISÃO NÃO MORA AQUI. `avaliarResgate` é do `engine/emissao.mjs`, é pura,
 * e não recebe a perda — é por isso que a regra do valor fixo não pode ser
 * quebrada por descuido. Este módulo só junta os fatos e grava o veredito.
 *
 * GRAVA ATÉ A RECUSA, com o motivo. Sem isso, "por que este jogador não
 * recebeu?" não tem resposta, e o §4.7 pede `rescue_grant_blocked_by_policy`
 * como evento — evento sem registro é número sem auditoria. */
export function pedirResgate(db, { userId, saldoTotal, protecaoAtiva = false,
                                   sinaisDeRisco = 0, agora = Date.now() }) {
  const semana = semanaDe(new Date(agora).toISOString());
  const u = db.prepare(`SELECT ruina_em FROM users WHERE id = ?`).get(userId);
  const recebidos = db.prepare(
    `SELECT COUNT(*) AS n FROM rescue_grants
      WHERE user_id = ? AND semana = ? AND concedido = 1`).get(userId, semana).n;

  const v = avaliarResgate({
    saldoTotal, ruinaEm: u?.ruina_em ?? NaN, agora,
    recebidosNaSemana: recebidos,
    jaEmitidoNaSemana: emitidoNaSemana(db, userId, agora).rotineiro,
    protecaoAtiva, sinaisDeRisco,
  });

  db.prepare(`INSERT INTO rescue_grants (id, user_id, semana, concedido, valor, motivo, criado_em)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), userId, semana, v.conceder ? 1 : 0, v.valor, v.motivo, agora);
  return v;
}

/* A RUÍNA É UM INSTANTE, e quem a marca é quem vê o saldo chegar a zero. Marcar
   de novo a cada consulta reiniciaria o cooldown para sempre — quem está
   zerado consulta o saldo o tempo todo. */
export function marcarRuina(db, { userId, saldoTotal, agora = Date.now() }) {
  const u = db.prepare(`SELECT ruina_em FROM users WHERE id = ?`).get(userId);
  if (saldoTotal > 0) {
    if (u?.ruina_em != null)
      db.prepare(`UPDATE users SET ruina_em = NULL WHERE id = ?`).run(userId);
    return null;
  }
  if (u?.ruina_em != null) return u.ruina_em;
  db.prepare(`UPDATE users SET ruina_em = ? WHERE id = ?`).run(agora, userId);
  return agora;
}

export { primeiroDiaDaSemana, RESGATE_VALOR };
