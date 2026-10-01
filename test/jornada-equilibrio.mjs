/* Q1/Q3 · A JORNADA PEDE O NÍVEL DO NÓ (ST-2.16)
 *
 * O dono: "eu achei fácil demais, ele avançou super rápido". Medido antes:
 *
 *   o time de seis luta INTEIRO — todos batem a cada turno — contra treinadores
 *   de um a três: seis bases no nível 8 venciam o Brock (2, nos níveis 12 e
 *   14) em 100%, e o time do amigo (níveis 1 a 6) vencia o Rival em 83%
 *
 *   o Lt. Surge só tem golpe elétrico: um Geodude no nível 3, SOZINHO, vencia
 *   o time dele (21 a 24) em 100% — quem não tem golpe que pegue ficava parado
 *
 * Duas regras, as duas medidas:
 *
 *   QUANTOS LUTAM   no máximo 3, ou tantos quantos o treinador trouxer se
 *                   forem mais (`quantosLutam`). Os ginásios foram calibrados
 *                   com times de referência de até 3 (o Campeão, 6 × 6), e
 *                   nenhuma medição deles muda por isto
 *   QUEM LUTA       os mais fortes do time, com quem serve à lição do nó na
 *                   frente (`lutadoresDoNo`) — o imune da aula de imunidade
 *                   não fica no banco por ter power baixo
 *   O ÚLTIMO RECURSO quem não tem golpe que pegue em ninguém usa um golpe sem
 *                   tipo, de poder 50 (`ULTIMO_RECURSO`), em vez de ficar
 *                   parado. A imunidade continua valendo muito; o nível volta
 *                   a valer também
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { quantosLutam, LUTAM_NO_MINIMO } from '../engine/jornada.mjs';
import { simular, ULTIMO_RECURSO, VERSAO_TBE } from '../engine/treino-batalha.mjs';
import { chanceDeVencer } from '../engine/treino-preco.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { entradasDoTime, rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { lutadoresDoNo, chanceDaLuta, contaDaLuta } from '../app/modules/jornada-conta.mjs';
import { fraseDosLutadores } from '../app/modules/jornada-dados.mjs';

const cria = (dex, nivel, i) => ({ id: `c${i}-${dex}`, dex, nivel, xp: xpParaNivel(nivel), iv: [15, 15, 15, 15, 15, 15],
                                   natureza: 'Hardy', naCaixa: false, criadaEm: i });
const criaturas = t => t.map(([d, n], i) => cria(d, n, i));
const no = id => PACK.jornada.find(n => n.id === id);
const rivalDoNo = id => rivalDe(PACK, treinador(PACK, no(id).rival));
const chance = (t, id) => chanceDaLuta({ pack: PACK, criaturas: criaturas(t), id }).p;
const AMIGO = [[4, 6], [12, 5], [17, 4], [67, 1], [74, 3], [56, 3]];   // o time do print
const SEIS_NV8 = [[4, 8], [16, 8], [19, 8], [10, 8], [21, 8], [56, 8]];

export function suite() {
  const s = criarSuite('jornada-equilibrio');

  s.teste('quantos lutam: no mínimo 3, ou tantos quantos o treinador trouxer', () => {
    igual(LUTAM_NO_MINIMO, 3, 'o mínimo');
    igual([1, 2, 3, 5, 6].map(quantosLutam).join(','), '3,3,3,5,6', 'a conta');
    igual(quantosLutam(undefined), 3, 'sem número, o mínimo');
  });

  s.teste('quem luta: os mais fortes, na ordem do time; time pequeno luta inteiro', () => {
    const A = entradasDoTime(PACK, { criaturas: criaturas([[19, 3], [4, 12], [16, 4], [7, 11], [10, 2], [25, 10]]) });
    const L = lutadoresDoNo(PACK, A, no('rota22'), rivalDoNo('rota22'));
    igual(L.map(e => e.dex).join(','), '4,7,25', 'não são os três mais fortes, na ordem do time');
    const tres = A.slice(0, 3);
    igual(lutadoresDoNo(PACK, tres, no('rota22'), rivalDoNo('rota22')), tres, 'o time de três não lutou inteiro');
    /* Giovanni traz cinco: lutam cinco */
    igual(lutadoresDoNo(PACK, A, no('viridian'), rivalDoNo('viridian')).length, 5, 'contra cinco, não lutaram cinco');
  });

  s.teste('quem serve à lição vai na frente, mesmo com power baixo', () => {
    const A = entradasDoTime(PACK, { criaturas: criaturas([[4, 20], [16, 20], [19, 20], [21, 20], [74, 12]]) });
    const L = lutadoresDoNo(PACK, A, no('vermilion'), rivalDoNo('vermilion'));
    ok(L.some(e => e.dex === 74), `o imune ficou no banco na aula de imunidade: ${L.map(e => e.dex)}`);
    igual(L.length, 3, 'lutaram mais que três');
  });

  s.teste('a luta e a chance usam os mesmos lutadores', () => {
    const c = contaDaLuta({ pack: PACK, criaturas: criaturas(SEIS_NV8), jornada: null, id: 'rota1', semente: 7, dia: 1 });
    ok(c.ok, c.motivo);
    igual(c.timeA.length, 3, 'a luta da Rota 1 não teve três dos seis');
    const A = entradasDoTime(PACK, { criaturas: criaturas(SEIS_NV8) });
    igual(JSON.stringify(c.timeA), JSON.stringify(lutadoresDoNo(PACK, A, no('rota1'), rivalDoNo('rota1'))), 'a luta escolheu outros');
  });

  s.teste('o caso do dono: o começo deixa de ser atropelo', () => {
    ok(chance(AMIGO, 'rota22') < 0.2, `o time do amigo ainda vence o Rival: ${chance(AMIGO, 'rota22')}`);
    ok(chance(SEIS_NV8, 'pewter') < 0.2, `seis bases no nível 8 ainda vencem o Brock: ${chance(SEIS_NV8, 'pewter')}`);
    /* e o começo continua possível: o primeiro passo e a floresta */
    ok(chance([[4, 5]], 'rota1') > 0.6, 'o inicial sozinho no nível 5 deixou de vencer a Rota 1');
    ok(chance([[4, 8], [16, 7], [19, 7]], 'floresta') > 0.9, 'um trio do começo deixou de vencer a Floresta');
    ok(chance([[7, 12], [16, 12], [19, 12]], 'pewter') > 0.8, 'um trio com Squirtle no nível 12 deixou de vencer o Brock');
  });

  s.teste('o último recurso: ninguém fica parado, e a imunidade continua valendo', () => {
    const surge = rivalDoNo('vermilion');
    const geodude = lv => entradasDoTime(PACK, { criaturas: criaturas([[74, lv]]) });
    const p3 = chanceDeVencer(PACK, geodude(3), surge, { raiz: 1, sims: 200 }).p;
    ok(p3 < 0.05, `um Geodude no nível 3 sozinho ainda vence o Lt. Surge: ${p3}`);
    const r = simular(PACK, geodude(20), surge, 11);
    ok(r.eventos.some(e => e.de.startsWith('B') && e.golpe === ULTIMO_RECURSO.n && e.dano > 0), 'o rival sem golpe que pegue não usou o último recurso');
    /* a imunidade ainda vale: o imune no nível do ginásio vence */
    const p22 = chanceDeVencer(PACK, entradasDoTime(PACK, { criaturas: criaturas([[74, 22], [4, 22], [16, 22]]) }), surge, { raiz: 1, sims: 200 }).p;
    ok(p22 > 0.8, `o imune no nível do ginásio deixou de vencer: ${p22}`);
    /* e numa luta comum ele não aparece */
    const comum = simular(PACK, entradasDoTime(PACK, { criaturas: criaturas([[4, 10]]) }), rivalDoNo('rota1'), 3);
    ok(!comum.eventos.some(e => e.golpe === ULTIMO_RECURSO.n), 'o último recurso apareceu numa luta em que todo golpe pega');
    ok(VERSAO_TBE !== 'tbe-1', 'a regra da luta mudou e a versão das regras não');
  });

  s.teste('a tela diz quem luta, e quantos ficam de fora', () => {
    igual(fraseDosLutadores(['Charmander', 'Pidgeotto', 'Butterfree'], { sobram: 3, rival: 2 }),
          'Lutam 3 contra 2: Charmander, Pidgeotto e Butterfree — os mais fortes do seu time (3 ficam de fora).',
          'a frase dos lutadores');
    igual(fraseDosLutadores(['Charmander'], { sobram: 0, rival: 1 }), null, 'o time inteiro luta e a frase apareceu');
    /* a tela calcula a chance, a lição e a correção com os MESMOS lutadores */
    const tela = readFileSync(new URL('../app/modules/jornada-tela.mjs', import.meta.url), 'utf8');
    ok(/A = lutadoresDoNo\(PACK, todos, no, rival\)/.test(tela), 'a chance da tela não usa os lutadores do nó');
    ok(/fraseDosLutadores\(A\.map/.test(tela), 'a tela não diz quem luta');
  });

  return s;
}
