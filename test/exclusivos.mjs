/* Q1/Q3 · EVOLUIR OU ESPERAR (ST-10.3 · F3.5 · Spec §7.10)
 *
 * Cada linha tem um golpe que só a forma de antes aprende, a partir de um
 * nível ACIMA do da evolução. Evoluir antes o torna inalcançável; depois, o
 * golpe fica — inclusive através da segunda evolução. A Arena continua
 * idêntica (P4), o padrão do moveset não muda sozinho, e o selo de evoluir
 * avisa e pede dois cliques quando evoluir custa um golpe.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { criarMotor } from '../engine/engine.mjs';
import { baseDe, saidasDe } from '../engine/evolucao.mjs';
import { problemasDosExclusivos, exclusivosDe, avisoDeEvolucao, perdidosAoEvoluir, guardadosAoEvoluir } from '../engine/exclusivos.mjs';
import { aplicar } from '../app/modules/evolucao-idle.mjs';
import { liberados, movesetValido, padraoDoMoveset, golpesDaCriatura, alternarGolpe } from '../app/modules/moveset-dados.mjs';
import { simular } from '../engine/treino-batalha.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cria = (dex, nivel, extra = {}) => ({ id: 'x', dex, nivel, xp: 0, vinculo: 0, foco: null, iv: [9, 9, 9, 9, 9, 9],
                                            natureza: 'Bold', origem: 'captura', ...extra });

export function suite() {
  const s = criarSuite('exclusivos');

  s.teste('o conteúdo: toda linha tem o seu, é de fato exclusivo, e pede ESPERAR', () => {
    igual(problemasDosExclusivos(pack).join(' | '), '', 'o conteúdo tem problema');
    const bases = new Set(pack.evolucoes.map(e => baseDe(pack, e.de)));
    for (const b of bases) {
      const formas = [b, ...pack.evolucoes.filter(e => baseDe(pack, e.de) === b).map(e => e.de)];
      ok(formas.some(d => exclusivosDe(pack, d).length), `a linha de ${b} não tem exclusivo`);
    }
    igual(bases.size, 54, 'o número de linhas mudou — revise o conteúdo');
    for (const [k, lista] of Object.entries(pack.exclusivos)) {
      const porNivel = saidasDe(pack, Number(k)).map(e => e.exige?.nivel).filter(Number.isFinite);
      for (const x of lista) for (const n of porNivel)
        ok(x.nivel > n, `${x.n} de ${k} abre no ${x.nivel}, e a forma evolui no ${n} — não há o que esperar`);
    }
    /* A regra do conteúdo morde: um exclusivo alcançável pela forma final é recusado. */
    const ruim = { ...pack, exclusivos: { 4: [{ n: 'Flamethrower', nivel: 22 }] } };
    ok(problemasDosExclusivos(ruim).some(p => /alcançável/.test(p)), 'um golpe que a forma final aprende passou como exclusivo');
  });

  s.teste('evoluir ANTES do nível: o golpe fica inalcançável para sempre', () => {
    const cedo = aplicar(pack, cria(4, 16), {}).criatura;
    igual(cedo.dex, 5, 'não evoluiu');
    ok(!cedo.exclusivos, 'guardou o que não aprendeu');
    for (const nivel of [16, 22, 50, 100])
      ok(!liberados(pack, 5, nivel, cedo.exclusivos).includes('Dragon Claw'), `a forma seguinte alcança Dragon Claw no ${nivel}`);
    igual(movesetValido(pack, 5, 60, ['Dragon Claw'], cedo.exclusivos).ok, false, 'o moveset aceitou o golpe perdido');
  });

  s.teste('evoluir DEPOIS: o golpe fica, e atravessa a segunda evolução', () => {
    const c = cria(4, 22);
    ok(liberados(pack, 4, 22).includes('Dragon Claw') && !liberados(pack, 4, 21).includes('Dragon Claw'), 'o nível não abre o golpe');
    const meio = aplicar(pack, c, {}).criatura;
    igual(JSON.stringify(meio.exclusivos), '["Dragon Claw"]', 'não guardou');
    ok(movesetValido(pack, 5, 22, ['Dragon Claw', 'Fire Punch'].filter(n => liberados(pack, 5, 22, meio.exclusivos).includes(n)),
                     meio.exclusivos).ok, 'o guardado não vale no moveset');
    /* A segunda: no 36 ela evolui sem o Crunch (abre no 42) — leva o que tinha, perde o que não abriu. */
    const fim = aplicar(pack, { ...meio, nivel: 36 }, {}).criatura;
    igual(fim.dex, 6, 'a segunda evolução');
    igual(JSON.stringify(fim.exclusivos), '["Dragon Claw"]', 'perdeu o guardado, ou guardou o que não abriu');
    const r = alternarGolpe(pack, { ...fim, golpes: ['Flamethrower'] }, 'Dragon Claw');
    ok(r.ok && r.golpes.includes('Dragon Claw'), `a forma final não escolhe o guardado: ${JSON.stringify(r)}`);
    /* E ele luta: o treino o acha pelo nome. */
    const luta = simular(pack, [{ dex: 6, nivel: 40, golpes: ['Dragon Claw'] }], [{ dex: 9, nivel: 40, golpes: ['Surf'] }], 3);
    ok(luta.eventos.some(e => e.de === 'A0' && e.golpe === 'Dragon Claw'), 'o exclusivo não luta no treino');
    igual(JSON.stringify(guardadosAoEvoluir(pack, { dex: 5, nivel: 42, exclusivos: ['Dragon Claw'] })), '["Dragon Claw","Crunch"]', 'os dois');
  });

  s.teste('o padrão do moveset não muda sozinho, e o save antigo continua valendo', () => {
    for (const [k, lista] of Object.entries(pack.exclusivos)) for (const x of lista) {
      const padrao = padraoDoMoveset(pack, Number(k), x.nivel);
      ok(!padrao.includes(x.n), `o padrão de ${k} no ${x.nivel} ganhou ${x.n} sozinho`);
    }
    const velha = cria(6, 40, { golpes: ['Flamethrower', 'Air Slash'] });
    igual(golpesDaCriatura(pack, velha).join(), 'Flamethrower,Air Slash', 'a criatura sem o campo perdeu o moveset');
  });

  s.teste('o aviso: o que se perde, e nada quando não se perde', () => {
    ok(/Dragon Claw \(nível 22\)/.test(avisoDeEvolucao(pack, cria(4, 16)) ?? ''), `aviso: ${avisoDeEvolucao(pack, cria(4, 16))}`);
    igual(avisoDeEvolucao(pack, cria(4, 22)), null, 'avisou sem perda');
    igual(avisoDeEvolucao(pack, cria(6, 50)), null, 'forma final');
    igual(perdidosAoEvoluir(pack, cria(1, 16)).map(x => x.n).join(), 'Mud Shot', 'o que se perde');
  });

  s.teste('a Arena continua idêntica (P4)', () => {
    const com = criarMotor(pack), sem = criarMotor({ ...pack, exclusivos: undefined });
    const nomes = m => m.montarElenco(pack.elenco.map(d => pack.especies.find(e => e.dex === d))).map(f => f.moves.map(g => g.n).join('/')).join('|');
    igual(nomes(com), nomes(sem), 'os golpes da Arena mudaram com os exclusivos');
    ok(!/exclusivo/.test(semComentario(fonte('../engine/engine.mjs'))), 'a Arena lê exclusivos');
  });

  s.teste('a tela: o selo avisa, o clique arma antes de evoluir, e o exclusivo leva a marca', () => {
    const selo = semComentario(fonte('../app/modules/idle-equipe.mjs'));
    ok(/const aviso = avisoDeEvolucao\(PACK, c\);/.test(selo) && /pronta\$\{aviso \? ' perde' : ''\}/.test(selo), 'o selo não avisa');
    const tela = semComentario(fonte('../app/modules/exclusivos-tela.mjs'));
    ok(/if \(!b \|\| b\.dataset\.armado === '1'\) return;/.test(tela) && /ev\.stopImmediatePropagation\(\);/.test(tela)
       && /\}, true\);\s*$/.test(tela), 'o primeiro clique não para a evolução');
    ok(/perdidosAoEvoluir\(PACK, c\)/.test(tela), 'a tela decide o que se perde');
    ok(/import '\.\/modules\/exclusivos-tela\.mjs';/.test(fonte('../app/index.html')), 'o módulo não é carregado');
    ok(/liberados\(PACK, c\.dex, c\.nivel, c\.exclusivos\)/.test(fonte('../app/modules/idle-paineis.mjs'))
       && /excl\.has\(n\) \? ' excl' : ''/.test(fonte('../app/modules/idle-paineis.mjs')), 'o painel não mostra os guardados, ou não os marca');
  });

  return s;
}
