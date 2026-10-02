/* Q1/Q3 · O TIME APRENDE JUNTO, E O TETO NÃO ZERA A RUN (ST-2.26)
 *
 * O relato do dono, 30 min focado em progressão:
 *
 *   "Só quem está em campo sobe de nível. Com um slot só, o XP vai quase todo
 *    pro Bulbasaur. O Kakuna e o Bellsprout ficaram parados no 7 e no 5, e por
 *    isso nenhum inseto chega ao nível 10 pra evoluir."
 *
 *   "O limite diário de encontros zera a run sem avisar. Depois que ele bate,
 *    uma run rendeu só +2 XP e nenhuma moeda."
 *
 * O segundo é defeito (D-148): o L-151 manda a run seguir rendendo depois do
 * teto, e a conta pagava o XP pelos encontros QUE VALEM — zero. O XP passa a
 * ser do que aconteceu na run; a moeda segue a calibrada (DEC-27: cheia, ela
 * triplicava a emissão do maratona).
 *
 * O primeiro é desenho: quem está no time e não foi a campo aprende metade
 * (`XP_DO_BANCO`) — sem stamina, sem vínculo, sem encontro.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { novaRun, avancarRun, resultadoDa } from '../engine/run-avanco.mjs';
import { encontrosDe } from '../engine/avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor, contaDaRun, XP_DO_BANCO } from '../app/modules/avanco-conta.mjs';

const T0 = Date.UTC(2026, 9, 2, 12);
const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: xpParaNivel(nivel), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy',
                                    naCaixa: false, criadaEm: 1, stamina: 100, staminaEm: T0, vinculo: 3 });
function runFeita(semEncontros) {
  const elenco = elencoDoEstagio(PACK, 'floresta', 1);
  const eq = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 12 })];
  let run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz: 'aprende', agora: T0 });
  run.semEncontros = semEncontros;
  for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
  return { run, eq };
}
const conta = (run, eq, banco = []) => contaDaRun(PACK, { run, criaturas: [cria('a', 1, 12)], banco, motor: eq, avancos: [], raiz: 'r', agora: run.fim.em });

export function suite() {
  const s = criarSuite('time-aprende');

  s.teste('D-148 · DEC-27 · com o teto batido, a run paga o mesmo XP — a moeda segue a calibrada, e a captura some', () => {
    const { run, eq } = runFeita(false);
    const com = conta(run, eq), sem = conta({ ...run, semEncontros: true }, eq);
    ok(encontrosDe(resultadoDa(run)).length > 0, 'a run de prova não teve encontros');
    igual(sem.rendeu.xp, com.rendeu.xp, `o XP caiu com o teto: ${com.rendeu.xp} → ${sem.rendeu.xp}`);
    ok(sem.rendeu.moedas < com.rendeu.moedas, `a moeda depois do teto saiu da calibração (DEC-14): ${com.rendeu.moedas} → ${sem.rendeu.moedas}`);
    igual(sem.pendentes.length, 0, 'com o teto batido, a run deixou encontros para capturar');
    igual(sem.encontros, 0, 'com o teto batido, a run conta encontros no teto do dia');
    ok(com.pendentes.length > 0, 'sem teto, a run não deixou encontros');
  });

  s.teste('o banco aprende metade, sem stamina e sem vínculo', () => {
    igual(XP_DO_BANCO, 0.5, 'a fração do banco');
    const { run, eq } = runFeita(false);
    const c = conta(run, eq, [cria('k', 14, 7), cria('b', 69, 5)]);
    const xpCampo = c.rendeu.xp;
    const k = c.credito.find(x => x.id === 'k'), b = c.credito.find(x => x.id === 'b');
    ok(k && b, 'o banco não recebeu crédito');
    igual(k.xp - xpParaNivel(7), Math.round(xpCampo * XP_DO_BANCO), 'o Kakuna do banco não aprendeu a metade');
    igual(k.vinculo, 3, 'o banco ganhou vínculo sem ter ido');
    ok(!c.stamina.some(x => x.id === 'k' || x.id === 'b'), 'o banco pagou stamina sem ter ido');
    ok(c.rendeu.subiram.every(s => ['a', 'k', 'b'].includes(s.id)), 'subiu alguém que não é do time');
  });

  s.teste('quem chama a conta passa o banco: o time fora da run, sem a caixa', async () => {
    const { readFileSync } = await import('node:fs');
    const est = readFileSync(new URL('../app/modules/avanco-estado.mjs', import.meta.url), 'utf8');
    const srv = readFileSync(new URL('../server/run.mjs', import.meta.url), 'utf8');
    ok(/banco: bancoDaRun\(/.test(est), 'sem conta, a colheita não passa o banco');
    ok(/banco: bancoDaRun\(/.test(srv), 'com conta, a colheita não passa o banco');
    const { bancoDaRun } = await import('../app/modules/avanco-conta.mjs');
    const col = [cria('a', 1, 9), cria('k', 14, 7), { ...cria('x', 10, 3), naCaixa: true }];
    igual(bancoDaRun(col, { equipe: ['a'] }).map(c => c.id).join(','), 'k', 'o banco não é o time fora da run');
  });

  return s;
}
