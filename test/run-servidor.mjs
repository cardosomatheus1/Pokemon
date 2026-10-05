/* Q1/Q3/Q8 · A RUN DO AVANÇO É UMA CONTA SÓ (ST-13.2c1 · E13 · Spec §7.22)
 *
 * A AFIRMAÇÃO CENTRAL é de identidade: a mesma run — a mesma raiz, a mesma
 * equipe, as mesmas poções e o mesmo recuo nos mesmos instantes — termina
 * IGUAL no save do aparelho e no banco do servidor, depois de cada ação, e a
 * colheita paga igual: a run colhida, a bolsa, a stamina e o XP de quem foi, os
 * pendentes e o registro.
 *
 * No aparelho a tela sincroniza a cada quadro; aqui o teste sincroniza o
 * aparelho antes de cada ação, que é o que o quadro faz. O servidor sincroniza
 * sozinho, antes de mexer — e é isso que está sendo provado.
 *
 * E as recusas que a porta abriria: a criatura numa expedição não entra na
 * run e vice-versa, uma run aberta por conta, poção com a barra cheia, colher
 * antes do fim e colher duas vezes.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, colher, creditarBolsa, bolsaDe, registroDe, estadoDoTeto } from '../server/idle.mjs';
import { comecarRun, sincronizarRun, pocaoNaRun, recuarNaRun, colherRun } from '../server/run.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import * as A from '../app/modules/avanco-estado.mjs';
import { STAMINA_MAX, restamEncontros } from '../engine/expedicao.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { leituraDoClima, falaDoClima } from '../app/modules/avanco-clima.mjs';

const T0 = Date.UTC(2026, 8, 27, 13);
const MIN = 60_000;
const raizDe = k => (0x5eed000 + k).toString(16).padStart(32, '0');
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Os dois lados com as mesmas quatro criaturas e as mesmas poções. */
function cena({ xp = [0, 0, 0, 0] } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'run', email: 'run@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const e = D.VAZIO();
  const ids = [1, 4, 7, 25].map((dex, i) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'inicial', raiz: raizDe(900+i) });
    db.prepare(`UPDATE criaturas SET xp = ?, nivel = ?, stamina = ?, stamina_em = ?, criada_em = ? WHERE id = ?`)
      .run(xp[i], 1, STAMINA_MAX, T0 - 60 * MIN, T0 - 60 * MIN + i, c.id);
    e.criaturas.push({ id: c.id, dex, iv: c.iv, natureza: c.natureza.nome, exemplar: c.exemplar, xp: xp[i], nivel: 1,
                       vinculo: 0, foco: null, stamina: STAMINA_MAX, staminaEm: T0 - 60 * MIN, origem: 'inicial', criadaEm: T0 - 60 * MIN + i });
    return c.id;
  });
  for (const [item, n] of [['pocao', 5], ['superpocao', 2]]) { creditarBolsa(db, u, item, n); e.bolsa[item] = n; }
  return { db, u, e, ids };
}

const doServidor = (db, u) => ({
  bolsa: Object.fromEntries(bolsaDe(db, u).map(b => [b.item_id, b.quantidade]).sort()),
  registro: Object.fromEntries(registroDe(db, u, PACK.id).map(r => [r.dex, r.fragmentos])),
  criaturas: db.prepare(`SELECT id, xp, nivel, vinculo, stamina, stamina_em FROM criaturas WHERE user_id = ? ORDER BY criada_em`).all(u)
    .map(l => [l.id, l.xp, l.nivel, l.vinculo, l.stamina, l.stamina_em]),
  pendentes: db.prepare(`SELECT chave, dex, raridade FROM encontros_pendentes WHERE user_id = ? AND origem = 'avanco' AND resolvido_em IS NULL ORDER BY chave`).all(u)
    .map(l => [l.chave, l.dex, l.raridade]),
});
const doAparelho = e => ({
  bolsa: Object.fromEntries(Object.entries(e.bolsa).filter(([, n]) => n > 0).sort()),
  registro: e.registro,
  criaturas: e.criaturas.map(c => [c.id, c.xp, c.nivel, c.vinculo, c.stamina, c.staminaEm]),
  pendentes: e.encontros.filter(p => p.origem === 'avanco').map(p => [p.chave, p.dex, p.raridade]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
});

/* Roda uma linha do tempo nos dois lados, e compara depois de cada passo. */
function rodar(c, { equipe, estagio = 1, bioma = 'floresta', raiz, passos, colherEm, raizColheita, t0 = T0 }) {
  const sv = comecarRun(c.db, { userId: c.u, pack: PACK, bioma, estagio, equipe, agora: t0, raiz });
  const ap = A.comecarAvanco(c.e, { pack: PACK, bioma, estagio, equipe, agora: t0, raiz });
  igual(JSON.stringify(sv.run), JSON.stringify(ap), 'a run começou diferente');
  const log = [];
  for (const [t, acao, item] of passos) {
    const agora = t0 + t * MIN;
    A.sincronizar(c.e, { pack: PACK, agora });
    let rs = null, ra = null;
    if (acao === 'sync') rs = sincronizarRun(c.db, { userId: c.u, pack: PACK, agora }).run;
    if (acao === 'pocao') {
      const es = recusa(() => pocaoNaRun(c.db, { userId: c.u, pack: PACK, item, agora }));
      const ea = recusa(() => A.usarPocao(c.e, { pack: PACK, item, agora }));
      igual(es?.message ?? 'curou', ea?.message ?? 'curou', `t=${t}: a poção ${item} foi aceita num lado só`);
      log.push(es ? 'pocao-recusada' : 'pocao');
      rs = sincronizarRun(c.db, { userId: c.u, pack: PACK, agora }).run;
    }
    if (acao === 'recuar') {
      const es = recusa(() => recuarNaRun(c.db, { userId: c.u, pack: PACK, agora }));
      const ea = A.recuar(c.e, agora);
      igual(!es, !!ea, `t=${t}: o recuo foi aceito num lado só`);
      log.push('recuou');
      rs = sincronizarRun(c.db, { userId: c.u, pack: PACK, agora }).run;
    }
    ra = c.e.run;
    igual(JSON.stringify(rs), JSON.stringify(ra), `t=${t} (${acao}): a run divergiu`);
  }
  const agora = t0 + colherEm * MIN;
  A.sincronizar(c.e, { pack: PACK, agora });
  const cs = colherRun(c.db, { userId: c.u, pack: PACK, agora, raiz: raizColheita });
  const ca = A.colherAvancoDaRun(c.e, { pack: PACK, agora, raiz: raizColheita });
  igual(JSON.stringify(cs), JSON.stringify(ca), 'a run colhida divergiu');
  igual(JSON.stringify(doServidor(c.db, c.u)), JSON.stringify(doAparelho(c.e)), 'o que a colheita escreveu divergiu');
  igual(restamEncontros(estadoDoTeto(c.db, c.u, agora, PACK)), restamEncontros(D.estadoDoTeto(c.e, agora, PACK)), 'o teto depois da colheita divergiu');
  return { fim: cs.fim?.motivo, bau: cs.rendeu?.bau, log };
}

export function suite() {
  const s = criarSuite('run-servidor');

  s.teste('identidade: a mesma run termina e paga IGUAL no aparelho e no servidor — caiu, limpou, recuou, com poção', () => {
    const fins = new Set(); let baus = 0, pocoes = 0, casos = 0;
    const cenarios = [
      { xp: [0, 0, 0, 0], equipe: [0], passos: [[.11, 'pocao', 'pocao'], [5, 'sync'], [12, 'sync'], [30, 'sync']], colherEm: 90 },
      { xp: [xpParaNivel(30), xpParaNivel(30), xpParaNivel(28), 0], equipe: [0, 1, 2], passos: [[2, 'pocao', 'pocao'], [8, 'sync'], [20, 'sync']], colherEm: 120 },
      { xp: [xpParaNivel(10), xpParaNivel(9), 0, 0], equipe: [0, 1], passos: [[4, 'sync'], [9, 'pocao', 'superpocao'], [14, 'pocao', 'pocao'], [21, 'sync']], colherEm: 100 },
      { xp: [xpParaNivel(14), 0, 0, 0], equipe: [0], passos: [[1, 'sync'], [2, 'recuar']], colherEm: 3 },
      { xp: [xpParaNivel(22), xpParaNivel(20), 0, 0], equipe: [0, 1], estagio: 2, passos: [[3, 'sync'], [15, 'pocao', 'superpocao'], [25, 'sync']], colherEm: 150 },
    ];
    for (const [i, cen] of cenarios.entries()) for (let k = 0; k < 4; k++) {
      const c = cena({ xp: cen.xp });
      const r = rodar(c, { ...cen, equipe: cen.equipe.map(j => c.ids[j]), raiz: raizDe(10 * i + k), raizColheita: raizDe(1000 + 10 * i + k) });
      fins.add(r.fim); if (r.bau) baus++; pocoes += r.log.filter(x => x === 'pocao').length; casos++;
    }
    for (const f of ['hp', 'limpou', 'recuou']) ok(fins.has(f), `nenhuma run terminou por "${f}" — o caso não foi comparado (${[...fins]})`);
    ok(baus > 0, 'nenhuma run abriu o baú — o baú não foi comparado');
    ok(pocoes > 0, 'nenhuma poção foi aceita — a cura não foi comparada');
  });

  s.teste('sete runs no mesmo dia: o rendimento decrescente (ST-3.6) e o quadro que a run nova limpa (L-166) são os mesmos', () => {
    const c = cena({ xp: [xpParaNivel(25), 0, 0, 0] });
    const fatores = [];
    for (let k = 0; k < 7; k++) {
      /* stamina cheia a cada volta, nos dois lados — a pergunta aqui é o dia */
      c.db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`).run(STAMINA_MAX, T0 + k * 30 * MIN, c.ids[0]);
      Object.assign(c.e.criaturas[0], { stamina: STAMINA_MAX, staminaEm: T0 + k * 30 * MIN });
      rodar(c, { equipe: [c.ids[0]], raiz: raizDe(500 + k), raizColheita: raizDe(600 + k), t0: T0 + k * 30 * MIN,
                 passos: [[2, 'sync']], colherEm: 25 });
      fatores.push(c.db.prepare(`SELECT resultado_json AS j FROM runs WHERE user_id = ? ORDER BY iniciada_em DESC LIMIT 1`).get(c.u).j);
    }
    const f = fatores.map(j => JSON.parse(j).rendeu.rendimento.fator);
    ok(f[6] < f[0], `o rendimento não caiu na 7ª run do dia: ${f.join(', ')}`);
  });

  s.teste('a expedição colhida no meio da run treina quem está nela, e a run segue igual nos dois lados', () => {
    /* A quarta no 20 é a âncora do teto do banco (ST-2.31): sem ela, a da run
       seria a mais forte e o banco não a levaria ao 12. */
    const c = cena({ xp: [xpParaNivel(12) - 1, xpParaNivel(8), 0, xpParaNivel(20)] });
    const x = iniciar(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.ids[1]], agora: T0 - 40 * MIN });
    const xa = D.iniciarExpedicao(c.e, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.ids[1]], agora: T0 - 40 * MIN });
    const raiz = raizDe(77);
    comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[0]], agora: T0, raiz });
    A.comecarAvanco(c.e, { pack: PACK, bioma: 'floresta', equipe: [c.ids[0]], agora: T0, raiz });
    const agora = T0 + 10 * MIN, rx = raizDe(78);
    A.sincronizar(c.e, { pack: PACK, agora });
    colher(c.db, { id: x.id, pack: PACK, agora, raiz: rx });
    D.colher(c.e, { pack: PACK, id: xa.id, agora, raiz: rx, bonus: null });
    const nivel = c.db.prepare(`SELECT nivel FROM criaturas WHERE id = ?`).get(c.ids[0]).nivel;
    igual(nivel, 12, 'quem estava na run não subiu de nível treinando no banco — o caso não mede nada');
    igual(JSON.stringify(sincronizarRun(c.db, { userId: c.u, pack: PACK, agora }).run), JSON.stringify(c.e.run), 'a run divergiu na colheita da expedição');
    const fim = T0 + 120 * MIN;
    A.sincronizar(c.e, { pack: PACK, agora: fim });
    igual(JSON.stringify(sincronizarRun(c.db, { userId: c.u, pack: PACK, agora: fim }).run), JSON.stringify(c.e.run),
      'a run divergiu depois do nível novo');
  });

  s.teste('as recusas: ocupada nos dois sentidos, uma run aberta, poção cheia, colher antes e colher duas vezes; o teto conta a run', () => {
    const c = cena({ xp: [xpParaNivel(12), 0, 0, 0] });
    iniciar(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.ids[1]], agora: T0 });
    D.iniciarExpedicao(c.e, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.ids[1]], agora: T0 });
    ok(recusa(() => comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[1]], agora: T0 })), 'a criatura da expedição entrou na run');
    ok(recusa(() => comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[0], c.ids[0]], agora: T0 })), 'a mesma criatura duas vezes na run');
    comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[0]], agora: T0, raiz: raizDe(5) });
    A.comecarAvanco(c.e, { pack: PACK, bioma: 'floresta', equipe: [c.ids[0]], agora: T0, raiz: raizDe(5) });
    ok(/cheia/.test(recusa(() => pocaoNaRun(c.db, { userId: c.u, pack: PACK, item: 'pocao', agora: T0 }))?.message ?? ''), 'a poção com a barra cheia');
    igual(bolsaDe(c.db, c.u).find(b => b.item_id === 'pocao').quantidade, 5, 'a poção recusada foi debitada');
    igual(restamEncontros(estadoDoTeto(c.db, c.u, T0, PACK)), restamEncontros(D.estadoDoTeto(c.e, T0, PACK)), 'o teto com a run aberta');
    /* A recusa tem de ser a da RUN, e não a das vagas (a outra expedição
       ocupa a única) — o S1620 passou pela primeira versão deste teste. */
    const ocupada = recusa(() => iniciar(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.ids[0]], agora: T0 + MIN,
                                                 limiteSimultaneas: 4 }));
    ok(/avanço/.test(ocupada?.message ?? ''), `a criatura da run saiu em expedição: ${ocupada?.message}`);
    const aberta = recusa(() => comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[2]], agora: T0 + MIN }));
    ok(aberta && /aberta/.test(aberta.message), `duas runs abertas: ${aberta?.message}`);
    ok(/acontecendo/.test(recusa(() => colherRun(c.db, { userId: c.u, pack: PACK, agora: T0 + 2 * MIN }))?.message ?? ''), 'colheu a run em curso');
    colherRun(c.db, { userId: c.u, pack: PACK, agora: T0 + 200 * MIN });
    ok(/não há run/.test(recusa(() => colherRun(c.db, { userId: c.u, pack: PACK, agora: T0 + 201 * MIN }))?.message ?? ''), 'colheu a run duas vezes');
  });

  /* ── OS DOIS DEFEITOS QUE A EXTRAÇÃO ACHOU, CONSERTADOS (ST-2.5) ──────
     Os testes que os AFIRMAVAM viraram o aceite — nos dois lados, porque a
     conta é uma só. */
  s.teste('D-127 consertado: o bônus de clima vale no Avanço para quem é do tipo — no aparelho e no servidor', () => {
    let casavam = 0, valeram = 0, fora = 0;
    for (let k = 0; k < 120; k++) for (const dex of PACK.iniciais) {
      const e = D.VAZIO(); D.escolherInicial(e, PACK, dex, T0 - 1000);
      const run = A.comecarAvanco(e, { pack: PACK, bioma: 'floresta', estagio: 1, equipe: [e.criaturas[0].id], agora: T0, raiz: raizDe(3000 + k) });
      const l = leituraDoClima(PACK, run, A.equipeDaRun(e, PACK, run));
      const tipos = PACK.especies.find(x => x.dex === dex).t;
      const casa = l && (l.bonus.tipos ?? []).some(t => tipos.includes(t));
      if (casa) { casavam++; if (l.bonus.quantos > 0) valeram++; } else if (l?.bonus.quantos > 0) fora++;
    }
    ok(casavam > 0, 'nenhuma run com a inicial do tipo do clima — o teste não mede nada');
    igual(valeram, casavam, `${valeram} de ${casavam} runs com o tipo do clima receberam o bônus`);
    igual(fora, 0, 'o bônus valeu para quem não é do tipo');
    /* E o servidor lê a mesma equipe: a identidade acima já compara o
       `rendeu.clima` byte a byte, e aqui fica o caso de quem aproveita. */
    const c = cena({ xp: [xpParaNivel(8), 0, 0, 0] });
    let achou = null;
    for (let k = 0; k < 200 && !achou; k++) {
      const r = comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [c.ids[0]], agora: T0 + k * 300 * MIN, raiz: raizDe(4000 + k) });
      const cs = colherRun(c.db, { userId: c.u, pack: PACK, agora: T0 + k * 300 * MIN + 200 * MIN });
      if (cs.rendeu.clima?.quantos > 0) achou = cs;
      void r;
    }
    ok(achou, 'nenhuma run do servidor recebeu o bônus de clima em 200 tentativas');
    /* E o cartão diz DE QUEM é o bônus (1.32: "o clima MAIS quem o aproveita"). */
    const e = D.VAZIO(); D.escolherInicial(e, PACK, 4, T0 - 1000);
    const run = A.comecarAvanco(e, { pack: PACK, bioma: 'floresta', equipe: [e.criaturas[0].id], agora: T0, raiz: 'r1' });
    const fala = falaDoClima(leituraDoClima(PACK, run, A.equipeDaRun(e, PACK, run)));
    igual(fala.estado, 'ativo', 'o Sol de r1 não rende para o Charmander');
    ok(/graças a Charmander/.test(fala.frase), `o cartão do clima não diz de quem é o bônus: "${fala.frase}"`);
  });

  s.teste('D-128 consertado: o aviso e a run concordam — a reserva da run conta uma vez, nos dois lados', () => {
    for (let feitos = 10; feitos <= 30; feitos++) {
      const e = D.VAZIO(); D.escolherInicial(e, PACK, PACK.iniciais[0], T0 - 1000);
      e.avancos = [{ colhidaEm: T0 - 1000, encontros: feitos }];
      const aviso = A.avisoDoTeto(e, { pack: PACK, agora: T0 });
      const run = A.comecarAvanco(e, { pack: PACK, bioma: 'floresta', equipe: [e.criaturas[0].id], agora: T0 });
      igual(run.semEncontros, aviso !== null, `com ${feitos} feitos o aviso diz "${aviso ? 'sem encontros' : 'cabe'}" e a run nasceu ${run.semEncontros ? 'sem' : 'com'} encontros`);
    }
  });

  return s;
}
