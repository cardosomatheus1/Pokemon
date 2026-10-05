/* A RUN DO AVANÇO NO SERVIDOR (ST-13.2c1 · E13 · Spec §7.22, §P2).
 *
 * O ESTADO da run é o mesmo objeto que o save guarda, e a conta é a mesma
 * (`app/modules/avanco-conta.mjs`, camada 0). O que muda é QUEM segura o
 * relógio: aqui, o do servidor.
 *
 * ── AVANÇAR ANTES DE MEXER ───────────────────────────────────────────────
 *
 * No aparelho, a tela sincroniza a run a cada quadro; então toda ação do
 * jogador (poção, recuo, colheita) acontece sobre a run já avançada até
 * aquele instante. Aqui não há quadro: a run avança a cada PEDIDO que a toca,
 * e ANTES de qualquer escrita que mude o que ela lê. A equipe da run é lida
 * com o nível de AGORA (`equipeDoMotor`), então a colheita de uma expedição —
 * que treina quem ficou no banco, e quem está na run fica no banco — avança a
 * run primeiro: as waves que já passaram lutaram com o nível de antes, como
 * no aparelho.
 *
 * ── UMA RUN ABERTA POR CONTA ─────────────────────────────────────────────
 *
 * "Aberta" é não colhida, e o banco garante (índice único parcial). O
 * aparelho deixa começar outra por cima de uma run terminada e não colhida, e
 * o saque dela some; aqui a recusa manda colher antes — perder saque por
 * clicar na ordem errada não é decisão de jogo.
 */
import { randomUUID } from 'node:crypto';
import { novaRaiz } from '../engine/seed.mjs';
import { emCurso, recuarRun } from '../engine/run-avanco.mjs';
import { podeAvancar, cabeAvanco, STAMINA_DO_AVANCO, curaDe } from '../engine/avanco.mjs';
import { EQUIPE_MAX } from '../engine/expedicao.mjs';
import { estagioAberto, nivelDoEstagio, estagioMaximo } from '../engine/estagios.mjs';
import { equipeDoMotor, runComecada, runNoInstante, runCurada, contaDaRun, bancoDaRun } from '../app/modules/avanco-conta.mjs';
import { exigirSemReserva } from './reservas.mjs';
import { criaturasDaConta, estadoDoTeto, emCampo, creditarBolsa, debitarBolsa, creditarRegistro, quantosNaBolsa, shinyDoEncontro } from './idle.mjs';

const DIA_MS = 24 * 3600_000;
export const ERRO_RUN = Object.freeze({ SEM_RUN: 'RUN_SEM_RUN', EM_CURSO: 'RUN_EM_CURSO', ABERTA: 'RUN_ABERTA' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

const ler = l => (l ? { ...l, run: JSON.parse(l.estado_json) } : null);
export const runAberta = (db, userId) =>
  ler(db.prepare(`SELECT * FROM runs WHERE user_id = ? AND colhida_em IS NULL`).get(userId));

/* As runs colhidas que o rendimento do dia lê (ST-3.6) — o dia do mundo cabe
   em dois dias corridos para trás. */
const avancosDe = (db, userId, agora) =>
  db.prepare(`SELECT colhida_em AS colhidaEm FROM runs WHERE user_id = ? AND colhida_em > ?`)
    .all(userId, agora - 2 * DIA_MS);

const motorDe = (db, userId, pack, run) => equipeDoMotor(pack, run, criaturasDaConta(db, userId));

function gravar(db, id, run) {
  db.prepare(`UPDATE runs SET estado_json = ?, terminada_em = ? WHERE id = ?`)
    .run(JSON.stringify(run), run.fim?.em ?? null, id);
}

/* ── O RELÓGIO ────────────────────────────────────────────────────────────
 * Avança a run aberta até `agora`, e grava se algo aconteceu. Devolve a run
 * (ou `null`), e o que aconteceu desde a última consulta — o log de quem volta. */
export function sincronizarRun(db, { userId, pack, agora }) {
  const a = runAberta(db, userId);
  if (!a) return { run: null, aconteceu: [] };
  if (!emCurso(a.run)) return { run: a.run, aconteceu: [], id: a.id };
  const r = runNoInstante(pack, a.run, motorDe(db, userId, pack, a.run), agora);
  if (r.aconteceu.length || (a.run.combate && JSON.stringify(r.run) !== a.estado_json)) gravar(db, a.id, r.run);
  return { run: r.run, aconteceu: r.aconteceu, id: a.id };
}

/* Quem está numa run que ainda acontece — a outra metade da L-162. */
export function naRun(db, { userId, pack, agora }) {
  const { run } = sincronizarRun(db, { userId, pack, agora });
  return new Set(emCurso(run) ? run.equipe : []);
}

/* ── COMEÇAR ──────────────────────────────────────────────────────────────
 * As mesmas recusas do `porQueNaoAvancar`, na mesma ordem, e as que a porta
 * HTTP abriria (a mesma criatura duas vezes, a criatura de outro). */
export function comecarRun(db, { userId, pack, bioma, estagio = 1, equipe, agora, raiz = novaRaiz() }) {
  if (runAberta(db, userId)) throw falha(ERRO_RUN.ABERTA, 'há uma run aberta — colha-a antes de começar outra');
  if (!equipe?.length) throw new Error('Escolha ao menos uma criatura');
  if (equipe.length > EQUIPE_MAX || new Set(equipe).size !== equipe.length) throw new Error('equipe inválida');
  if (!(pack?.biomas ?? []).some(b => b.id === bioma)) throw new Error('Escolha uma rota');
  const colecao = criaturasDaConta(db, userId);
  const est = Math.max(1, Math.floor(Number(estagio) || 1));
  if (!estagioAberto(colecao, est))
    throw new Error(`O estágio ${est} pede uma criatura no nível ${nivelDoEstagio(est)}, e a sua melhor está no ${estagioMaximo(colecao)}º`);
  const membros = equipe.map(id => colecao.find(c => c.id === id)).filter(Boolean);
  if (membros.length !== equipe.length) throw new Error('Criatura que não existe na equipe');
  for (const id of equipe) exigirSemReserva(db, id);   // ST-14.6: a reservada não entra na run
  const guardadas = membros.filter(c => c.naCaixa).length;
  if (guardadas) throw new Error(`${guardadas} criatura(s) estão na caixa — tire-as antes`);
  const fora = new Set(emCampo(db, userId).flatMap(x => JSON.parse(x.equipe_json)));
  if (equipe.some(id => fora.has(id))) throw new Error('esta criatura já está numa expedição — recolha-a antes');
  const { pode, semStamina } = podeAvancar(membros, agora);
  if (!pode) throw new Error(`${semStamina.length} criatura(s) sem os ${STAMINA_DO_AVANCO} de stamina que um avanço custa`);

  /* O contrato do momento em que ele entrou (L-151): a mesma pergunta do
     aviso — `cabeAvanco` já soma a reserva desta run (D-128, ST-2.5). Aqui não
     há run aberta (a recusa acima), então o estado já está sem ela. */
  const semEncontros = !cabeAvanco(estadoDoTeto(db, userId, agora, pack));
  const run = runComecada(pack, { bioma, estagio: est, equipe, raiz, agora, semEncontros,
                                  motor: equipeDoMotor(pack, { equipe }, colecao) });
  const id = randomUUID();
  db.exec('BEGIN');
  try {
    /* O QUADRO DA RUN ANTERIOR SAI (L-166): os pendentes dela, e só eles. */
    db.prepare(`UPDATE encontros_pendentes SET resolvido_em = ?, resolucao = 'descarte' WHERE user_id = ? AND origem = 'avanco' AND resolvido_em IS NULL`)
      .run(agora, userId);
    db.prepare(`INSERT INTO runs (id, user_id, pack_id, estado_json, iniciada_em) VALUES (?,?,?,?,?)`)
      .run(id, userId, pack.id, JSON.stringify(run), agora);
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
  return { id, run };
}

/* ── A POÇÃO ──────────────────────────────────────────────────────────────
 * O item sai da bolsa na MESMA transação que grava a cura — nunca a poção e a
 * vida juntas, nem a vida sem a poção. */
export function pocaoNaRun(db, { userId, pack, item, agora }) {
  const { run, id } = sincronizarRun(db, { userId, pack, agora });
  if (!emCurso(run)) throw falha(ERRO_RUN.SEM_RUN, 'não há run em curso');
  const cura = curaDe(pack, item);
  if (!cura) throw new Error('esse item não restaura vida');
  if (quantosNaBolsa(db, userId, item) < 1) throw new Error('você não tem esse item');
  const { run: nova, curou } = runCurada(pack, run, motorDe(db, userId, pack, run), { cura, agora });
  db.exec('BEGIN');
  try {
    if (!debitarBolsa(db, userId, item, 1)) throw new Error('você não tem esse item');
    gravar(db, id, nova);
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
  return { curou, item, run: nova };
}

/* ── RECUAR ── fica o que caiu, perde-se o baú (§7.22.8). */
export function recuarNaRun(db, { userId, pack, agora }) {
  const { run, id } = sincronizarRun(db, { userId, pack, agora });
  if (!emCurso(run)) throw falha(ERRO_RUN.SEM_RUN, 'não há run em curso');
  const nova = recuarRun(run, agora, { pack });
  gravar(db, id, nova);
  return nova;
}

/* ── COLHER ───────────────────────────────────────────────────────────────
 * A conta é `contaDaRun`, a do aparelho. A guarda é a da expedição: o UPDATE
 * com `colhida_em IS NULL` decide quem venceu, e a semente nasce aqui. */
export function colherRun(db, { userId, pack, agora, raiz = novaRaiz() }) {
  const { run, id } = sincronizarRun(db, { userId, pack, agora });
  if (!run) throw falha(ERRO_RUN.SEM_RUN, 'não há run para colher');
  if (emCurso(run)) throw falha(ERRO_RUN.EM_CURSO, 'a run ainda está acontecendo');

  const colecao = criaturasDaConta(db, userId);
  const c = contaDaRun(pack, {
    run, motor: equipeDoMotor(pack, run, colecao), avancos: avancosDe(db, userId, agora), raiz, agora,
    criaturas: (run.equipe ?? []).map(k => colecao.find(x => x.id === k)).filter(Boolean),
    banco: bancoDaRun(colecao, run),   // ST-2.26: o time aprende junto
  });
  const colhida = { ...run, colhidaEm: agora, semente: String(raiz), encontros: c.encontros, rendeu: c.rendeu };

  db.exec('BEGIN');
  try {
    const r = db.prepare(`UPDATE runs SET colhida_em = ?, semente = ?, encontros = ?, estado_json = ?, resultado_json = ?
                           WHERE id = ? AND colhida_em IS NULL`)
      .run(agora, String(raiz), c.encontros, JSON.stringify(colhida), JSON.stringify(colhida), id);
    if (r.changes === 0) throw new Error('esta run já foi colhida');
    const st = db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ? AND user_id = ?`);
    for (const k of c.stamina) st.run(k.stamina, k.staminaEm, k.id, userId);
    const xp = db.prepare(`UPDATE criaturas SET xp = ?, nivel = ?, vinculo = ? WHERE id = ? AND user_id = ?`);
    for (const k of c.credito) xp.run(k.xp, k.nivel, k.vinculo, k.id, userId);
    for (const [chave, n] of Object.entries(c.bolsa)) if (n > 0) creditarBolsa(db, userId, chave, n, { fonte: `run:${id}`, agora });
    const pend = db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, run_id, dex, raridade, bioma, em, is_shiny, shiny_versao)
                             VALUES (?,?,'avanco',?,?,?,?,?,?,?)`);
    for (const p of c.pendentes) {
      const s = shinyDoEncontro(pack);
      pend.run(p.chave, userId, id, p.dex, p.raridade, p.bioma, p.em, s.shiny ? 1 : 0, s.versao);
    }
    for (const f of c.fragmentos) creditarRegistro(db, userId, pack.id, f.dex, f.n, agora);
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
  return colhida;
}
