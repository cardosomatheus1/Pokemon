/* Q1/Q3 · A JORNADA: MOTOR E PROGRESSO (ST-10.11 · F4.5 · Spec §8.7)
 *
 * Nós em ordem; insígnia fora de ordem recusada; repetir não dá a insígnia de
 * novo; perder não tira nada; o resultado vem sempre da simulação semeada; e o
 * progresso é aditivo no save.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { aberto, noAtual, lutarNo, camposDaJornada, progressoVazio, nosDa } from '../engine/jornada.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { lutarNaJornadaLocal } from '../app/modules/jornada-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const T = Date.UTC(2026, 8, 1, 15);
const time = l => l.map(([dex, nivel]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) }));
const FORTE = time([[6, 60], [9, 60]]), FRACO = time([[10, 3]]);
/* Um pack de teste com um ginásio no meio. */
const P = { ...pack, jornada: [{ id: 'a', rival: 'rota1' }, { id: 'g', rival: 'pedra', insignia: 'rocha' }, { id: 'c', rival: 'rival1' }] };
const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                                     natureza: 'Hardy', origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa: false });
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

export function suite() {
  const s = criarSuite('jornada');

  s.teste('em ordem: só abre o nó cujos anteriores foram vencidos', () => {
    const p = progressoVazio();
    ok(aberto(P, p, 'a') && !aberto(P, p, 'g') && !aberto(P, p, 'c'), 'a ordem');
    igual(noAtual(P, p).id, 'a', 'o nó atual');
    ok(aberto(P, { vencidos: ['a'], insignias: [] }, 'g'), 'o segundo não abriu depois do primeiro');
    igual(noAtual(P, { vencidos: ['a', 'g', 'c'] }), null, 'a jornada acabada');
  });

  s.teste('insígnia fora de ordem é recusada', () => {
    let msg = '';
    try { lutarNo(P, progressoVazio(), 'g', FORTE, FRACO, { semente: 1 }); } catch (e) { msg = e.message; }
    ok(/fora de ordem/.test(msg), 'lutou pelo ginásio antes da hora');
    msg = '';
    try { lutarNo(P, progressoVazio(), 'a', FORTE, FRACO, { semente: 1.5 }); } catch (e) { msg = e.message; }
    ok(/semente/.test(msg), 'lutou sem semente inteira');
  });

  s.teste('vencer dá a insígnia uma vez; repetir não dá de novo; perder não tira nada', () => {
    const p1 = lutarNo(P, progressoVazio(), 'a', FORTE, FRACO, { semente: 7 }).progresso;
    const g1 = lutarNo(P, p1, 'g', FORTE, FRACO, { semente: 7 });
    igual(g1.ganhouInsignia, 'rocha', 'a insígnia');
    ok(g1.primeiraVez, 'primeira vez');
    const g2 = lutarNo(P, g1.progresso, 'g', FORTE, FRACO, { semente: 8 });
    igual(g2.ganhouInsignia, null, 'a insígnia veio de novo');
    igual(g2.progresso.insignias.join(), 'rocha', 'insígnia duplicada');
    ok(!g2.primeiraVez, 'repetir contou como primeira vez');
    const perde = lutarNo(P, g1.progresso, 'g', FRACO, FORTE, { semente: 9 });
    igual(perde.resultado.vencedor, 'B', 'o fraco venceu');
    igual(JSON.stringify(perde.progresso), JSON.stringify(g1.progresso), 'perder mexeu no progresso');
    /* Perder num nó NOVO não o marca vencido nem dá insígnia. */
    const novoPerdido = lutarNo(P, p1, 'g', FRACO, FORTE, { semente: 9 });
    ok(!novoPerdido.progresso.vencidos.includes('g') && novoPerdido.ganhouInsignia === null, 'a derrota contou como vitória');
    /* O progresso de entrada não é tocado. */
    igual(p1.insignias.length, 0, 'o motor mutou o progresso que recebeu');
  });

  s.teste('o resultado vem da simulação semeada, e de nada mais', () => {
    const A = time([[4, 8], [16, 7]]), B = time([[19, 6], [16, 6]]);
    for (let k = 1; k <= 20; k++) {
      const r = lutarNo(P, progressoVazio(), 'a', A, B, { semente: k });
      igual(r.resultado.vencedor, simular(P, A, B, k).vencedor, `semente ${k}: outro resultado`);
      igual(JSON.stringify(r.resultado), JSON.stringify(lutarNo(P, progressoVazio(), 'a', A, B, { semente: k }).resultado), 'a mesma semente deu outra luta');
    }
  });

  s.teste('o progresso é aditivo no save', () => {
    igual(JSON.stringify(camposDaJornada({})), '{"jornada":{"vencidos":[],"insignias":[],"xpRepeticao":{"dia":null,"pago":0,"ultimo":null},"pve":{"dia":null,"pago":0,"nos":[],"chefes":[]}}}', 'save antigo');
    igual(JSON.stringify(camposDaJornada({ jornada: { vencidos: ['a', 'a', 3], insignias: 'x' } })),
      '{"jornada":{"vencidos":["a","3"],"insignias":[],"xpRepeticao":{"dia":null,"pago":0,"ultimo":null},"pve":{"dia":null,"pago":0,"nos":[],"chefes":[]}}}', 'lixo no save');
    const d = deposito();
    const e = VAZIO(); e.criaturas = [cria('x', 6, 60)];
    salvar(e, d);
    igual(lutarNaJornadaLocal({ pack: P, id: 'g', semente: 3 }, d).ok, false, 'fora de ordem gravou');
    const r = lutarNaJornadaLocal({ pack: P, id: 'a', semente: 3 }, d);
    ok(r.ok && r.resultado.vencedor === 'A', `a luta local: ${JSON.stringify(r).slice(0, 120)}`);
    igual(JSON.stringify({ vencidos: carregar(d).jornada.vencidos, insignias: carregar(d).jornada.insignias }), '{"vencidos":["a"],"insignias":[]}', 'o progresso não ficou no save');
    igual(JSON.stringify(r.resultado), JSON.stringify(simular(P, r.timeA, r.timeB, 3)), 'a luta local não é a simulação com a semente escolhida');
  });

  s.teste('o conteúdo: todo nó aponta um rival que existe, ids únicos', () => {
    const ids = nosDa(pack).map(n => n.id);
    igual(new Set(ids).size, ids.length, 'id repetido');
    for (const n of nosDa(pack)) ok((pack.treinadores ?? []).some(t => t.id === n.rival), `o nó ${n.id} aponta um rival que não existe`);
    igual(nosDa(pack)[0].rival, 'rota1', 'o primeiro nó não é a Rota 1');
    ok(/semente = crypto\.getRandomValues/.test(readFileSync(new URL('../app/modules/jornada-local.mjs', import.meta.url), 'utf8')),
      'a semente não é escolhida antes da gravação');
  });

  return s;
}
