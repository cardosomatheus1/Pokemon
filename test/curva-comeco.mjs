/* Q1/Q3/Q4 · A CURVA DO COMEÇO (ST-2.23)
 *
 * O relato do dono, depois de 26 minutos focado em progressão: "o Bulbasaur
 * está só no nível 4, nada evoluiu, não cheguei a nenhum chefe; o próximo nó
 * da Jornada (Floresta) mostra 0% de chance; não tem nada para fazer a não ser
 * repetir as mesmas rotas". Medido antes:
 *
 *   a Floresta (insetos 6/6/7) contra o Bulbasaur 7 com dois do nível 5: 16%
 *   — e com as capturas do nível 1, 0% em qualquer nível do inicial
 *   a vitória na Jornada não dava XP a quem lutou
 *   toda captura nascia no nível 1 (L-233)
 *
 * Três alavancas, as três medidas aqui:
 *
 *   a luta ensina        a primeira vitória dá 6 XP por nível do rival a cada
 *                        um que lutou; a repetição, 10%
 *   a captura nasce      dois níveis acima da porta do estágio (no 1: nível 3),
 *                        e nunca abaixo do nível da forma
 *   o degrau             a Floresta passa a 5/5/6
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { xpParaNivel, nivelDe } from '../engine/nivel-criatura.mjs';
import { xpDaLuta, PVE } from '../engine/recompensa-pve.mjs';
import { nivelDeNascer, NASCE_ACIMA_DA_PORTA, nivelParaExistir } from '../engine/estagios.mjs';
import { contaDaLuta, chanceDaLuta } from '../app/modules/jornada-conta.mjs';
import { lutarNaJornadaLocal } from '../app/modules/jornada-local.mjs';
import { fraseDoPagamento } from '../app/modules/jornada-dados.mjs';
import { lancarBola } from '../app/modules/idle-lance.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { treinador } from '../app/modules/treino-dados.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa, lancarPendente, criaturasDaConta } from '../server/idle.mjs';
import { novaRun, avancarRun } from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor, contaDaRun } from '../app/modules/avanco-conta.mjs';
import { lutarNaConta } from '../server/jornada.mjs';

const T0 = Date.UTC(2026, 9, 1, 12);
const cria = (dex, nivel, i, extra = {}) => ({ id: `c${i}-${dex}`, dex, nivel, xp: xpParaNivel(nivel), iv: [15, 15, 15, 15, 15, 15],
                                                natureza: 'Hardy', naCaixa: false, criadaEm: i, ...extra });
const criaturas = t => t.map(([d, n], i) => cria(d, n, i));
const chance = (t, id) => chanceDaLuta({ pack: PACK, criaturas: criaturas(t), id }).p;
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

export function suite() {
  const s = criarSuite('curva-comeco');

  s.teste('a luta ensina: 6 XP por nível do rival na primeira, 10% na repetição, nada na derrota', () => {
    igual(PVE.XP_POR_NIVEL_DO_RIVAL, 6, 'a régua');
    const rival = [{ nivel: 5 }, { nivel: 5 }, { nivel: 6 }];
    igual(xpDaLuta({ timeB: rival, venceu: true, primeiraVez: true }), 96, 'a primeira vitória na Floresta');
    igual(xpDaLuta({ timeB: rival, venceu: true, primeiraVez: false }), 10, 'a repetição');
    igual(xpDaLuta({ timeB: rival, venceu: false, primeiraVez: true }), 0, 'a derrota deu XP');
  });

  s.teste('a conta da luta credita o XP a cada um que lutou — e a quem ficou de fora, não', () => {
    const time = criaturas([[4, 14], [7, 14], [1, 14], [16, 3], [19, 3]]);
    let c = null;
    for (let sem = 1; sem < 40 && !c?.recompensa?.xp; sem++) c = contaDaLuta({ pack: PACK, criaturas: time, jornada: null, id: 'rota1', semente: sem, dia: 1 });
    ok(c?.ok && c.recompensa.xp === 30, `a vitória na Rota 1 não deu 30 XP: ${c?.recompensa?.xp}`);
    const ids = Object.keys(c.credito.xp);
    igual(ids.length, 3, 'não foram três os creditados');
    ok(ids.every(id => ['c0-4', 'c1-7', 'c2-1'].includes(id)), `creditou quem não lutou: ${ids}`);
    ok(/\+30 XP para cada um que lutou/.test(fraseDoPagamento(PACK, c.recompensa, { depois: true })), 'a frase do fim não diz o XP');
  });

  s.teste('sem conta, a vitória grava o XP no aparelho', () => {
    const d = memoria();
    const e = D.VAZIO(); e.criaturas = criaturas([[4, 14]]); D.salvar(e, d);
    let r = null;
    for (let sem = 1; sem < 40 && !(r?.ok && r.resultado?.vencedor === 'A'); sem++) r = lutarNaJornadaLocal({ pack: PACK, id: 'rota1', semente: sem, agora: T0 }, d);
    igual(D.carregar(d).criaturas[0].xp, xpParaNivel(14) + 30, 'o XP da vitória não foi gravado');
  });

  s.teste('com conta, a vitória grava o XP no servidor, na mesma transação', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const u = cadastrar(db, { username: 'cc', email: 'cc@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const c = gerar(db, { userId: u, pack: PACK, dex: 4, origem: 'inicial' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(14), c.id);
    let r = null;
    for (let i = 0; i < 40 && !r?.venceu; i++) r = lutarNaConta(db, { userId: u, pack: PACK, id: 'rota1', chaveIdem: `luta-curva-${i}`, agora: T0, semente: i + 1 });
    const x = db.prepare(`SELECT xp, nivel FROM criaturas WHERE id = ?`).get(c.id);
    igual(x.xp, xpParaNivel(14) + 30, 'o servidor não gravou o XP da vitória');
    igual(x.nivel, nivelDe(x.xp), 'o nível gravado não acompanha o XP');
  });

  s.teste('a captura nasce dois acima da porta do estágio, e nunca abaixo da forma', () => {
    igual(NASCE_ACIMA_DA_PORTA, 2, 'a régua');
    igual([1, 2, 3, 4].map(e => nivelDeNascer(PACK, 16, e)).join(','), '3,14,21,33', 'a base nos quatro estágios');
    igual(nivelDeNascer(PACK, 11, 1), Math.max(3, nivelParaExistir(PACK, 11)), 'o Metapod do estágio 1 nasce abaixo da forma');
    ok(nivelDeNascer(PACK, 11, 1) >= 7, 'o Metapod nasce antes de existir');
  });

  s.teste('sem conta, a captura nasce no nível do estágio — o da run e o da expedição', () => {
    const e = D.VAZIO(); e.bolsa.ultra = 99;
    let capt = null;
    for (let i = 0; i < 60 && !capt; i++) {
      e.encontros.push({ chave: `k${i}`, expedicao: null, origem: 'avanco', dex: 16, raridade: 'comum', bioma: 'campo', estagio: 2, em: T0 });
      const r = lancarBola(e, { pack: PACK, chave: `k${i}`, bola: 'ultra', agora: T0 });
      if (r.capturou) capt = r.criatura;
    }
    ok(capt, 'nenhuma captura');
    igual(nivelDe(capt.xp), 14, 'a captura da run do estágio 2 não nasceu no 14');
  });

  s.teste('o encontro da run leva o estágio dela', () => {
    const elenco = elencoDoEstagio(PACK, 'campo', 2);
    const eq = [paraOMotor(PACK, { id: 'c1', dex: PACK.iniciais[0], nivel: 30 })];
    let run = novaRun({ bioma: 'campo', estagio: 2, equipe: ['c1'], raiz: 'enc-est', agora: T0 });
    for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
    const c = contaDaRun(PACK, { run, criaturas: [cria(PACK.iniciais[0], 30, 1, { id: 'c1' })], motor: eq, avancos: [], raiz: 'r', agora: run.fim.em });
    ok(c.pendentes.length > 0, 'a run não deixou encontro');
    ok(c.pendentes.every(p => p.estagio === 2), `o encontro não leva o estágio: ${JSON.stringify(c.pendentes[0])}`);
  });

  s.teste('com conta, a captura nasce no nível do estágio de onde o encontro veio', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const u = cadastrar(db, { username: 'cn', email: 'cn@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    db.prepare(`INSERT INTO runs (id, user_id, pack_id, estado_json, iniciada_em, colhida_em, semente) VALUES ('r3', ?, ?, '{"estagio":3}', ?, ?, 's')`).run(u, PACK.id, T0, T0);
    creditarBolsa(db, u, 'ultra', 99);
    let r = null;
    for (let i = 0; i < 60 && !r?.capturou; i++) {
      db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, run_id, dex, raridade, bioma, em) VALUES (?, ?, 'avanco', 'r3', 16, 'comum', 'campo', ?)`).run(`q${i}`, u, T0);
      r = lancarPendente(db, { userId: u, pack: PACK, chave: `q${i}`, bola: 'ultra', agora: T0 });
    }
    ok(r?.capturou, 'nenhuma captura');
    igual(criaturasDaConta(db, u).find(c => c.id === r.criatura.id).nivel, 21, 'a captura da run do estágio 3 não nasceu no 21');
  });

  s.teste('o degrau: a Floresta é vencível pelo time do começo, e o inicial sozinho ainda não', () => {
    igual(treinador(PACK, 'insetos').time.map(c => c.nivel).join('/'), '5/5/6', 'a Floresta');
    ok(chance([[1, 7], [16, 5], [19, 5]], 'floresta') > 0.6, 'o Bulbasaur 7 com dois do nível 5 ainda não vence a Floresta');
    ok(chance([[4, 8], [16, 7], [19, 7]], 'floresta') > 0.9, 'um trio do começo deixou de vencer');
    ok(chance([[1, 6]], 'floresta') < 0.1, 'o inicial sozinho no 6 vence a Floresta — o degrau virou atropelo');
  });

  return s;
}
