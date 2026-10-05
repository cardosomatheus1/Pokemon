/* Q1/Q3 · O JOGADOR ESCOLHE OS QUATRO GOLPES (ST-9.12 · F3.6 · Spec §7.11, §8.6)
 *
 * Até quatro, sem repetir, só entre os que o nível liberou; save antigo
 * recebe o padrão. E o moveset não toca em nada que decide resultado (P4): a
 * Arena escolhe pelos golpes dela, e a wave do Avanço tem o mesmo poder com
 * qualquer moveset — ele só decide QUAL nome o balão mostra.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { padraoDoMoveset, movesetValido, golpesDaCriatura, alternarGolpe, liberados, listaDaEspecie, GOLPES_MAX } from '../app/modules/moveset-dados.mjs';
import { repertorio } from '../engine/repertorio.mjs';
import { roteiroDaWave } from '../engine/roteiro-wave.mjs';
import { composicaoDaWave, resolverWave } from '../engine/wave.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const CHARMANDER = 4;

export function suite() {
  const s = criarSuite('moveset');

  s.teste('o padrão começa pelo que o balão já mostrava; save antigo recebe o padrão', () => {
    const doTipo = repertorio(40, listaDaEspecie(pack, CHARMANDER)).map(g => g.n).slice(-GOLPES_MAX);
    const padrao = padraoDoMoveset(pack, CHARMANDER, 40);
    igual(JSON.stringify(padrao.slice(0, doTipo.length)), JSON.stringify(doTipo), 'o padrão não começa pelos do tipo');
    igual(padrao.length, Math.min(GOLPES_MAX, liberados(pack, CHARMANDER, 40).length), 'o padrão não completou quatro');
    ok(movesetValido(pack, CHARMANDER, 40, padrao).ok, 'o padrão é inválido');
    igual(JSON.stringify(golpesDaCriatura(pack, { dex: CHARMANDER, nivel: 40 })), JSON.stringify(padrao),
      'a criatura sem campo não recebeu o padrão');
    ok(padraoDoMoveset(pack, CHARMANDER, 1).length >= 1, 'no nível 1 não sobrou golpe nenhum');
  });

  s.teste('a regra: até 4, sem repetir, só do tipo e só o que o nível liberou', () => {
    const quarenta = liberados(pack, CHARMANDER, 40);
    ok(quarenta.length >= 5, `o Charmander 40 conhece poucos golpes (${quarenta.length}) — o teste de 5 não distinguiria`);
    ok(movesetValido(pack, CHARMANDER, 40, quarenta.slice(0, 4)).ok, 'quatro válidos recusados');
    igual(movesetValido(pack, CHARMANDER, 40, quarenta.slice(0, 5)).ok, false, 'aceitou 5 golpes');
    igual(movesetValido(pack, CHARMANDER, 40, [quarenta[0], quarenta[0]]).ok, false, 'aceitou golpe repetido');
    igual(movesetValido(pack, CHARMANDER, 40, []).ok, false, 'aceitou moveset vazio');
    const deAgua = (pack.golpes.water ?? []).find(g => !liberados(pack, CHARMANDER, 100).includes(g.n))?.n;
    ok(deAgua, 'não achei golpe de água fora do alcance do Charmander');
    igual(movesetValido(pack, CHARMANDER, 40, [deAgua]).ok, false, 'aceitou golpe de outro tipo');
    const todos = listaDaEspecie(pack, CHARMANDER).map(g => g.n);
    const acima = todos.find(n => !liberados(pack, CHARMANDER, 1).includes(n));
    igual(movesetValido(pack, CHARMANDER, 1, [acima]).ok, false, 'aceitou golpe acima do nível');
    /* Um moveset gravado que deixou de valer cai no padrão, e não cala o balão. */
    igual(JSON.stringify(golpesDaCriatura(pack, { dex: CHARMANDER, nivel: 1, golpes: [acima] })),
      JSON.stringify(padraoDoMoveset(pack, CHARMANDER, 1)), 'o moveset inválido não caiu no padrão');
    /* Alternar respeita o teto: o quinto não entra. */
    const c = { dex: CHARMANDER, nivel: 40, golpes: quarenta.slice(0, 4) };
    igual(alternarGolpe(pack, c, quarenta[4]).ok, false, 'o quinto golpe entrou');
    igual(JSON.stringify(alternarGolpe(pack, c, quarenta[0]).golpes), JSON.stringify(quarenta.slice(1, 4)), 'tirar um golpe');
  });

  s.teste('P4: a wave tem o MESMO poder com qualquer moveset — só o índice do nome muda', () => {
    const elenco = elencoDoEstagio(pack, 'floresta', 1);
    for (let k = 0; k < 20; k++) {
      const r = resolverWave(rngTeste(900 + k), { elenco, wave: 1 + (k % 5), estagio: 1, hp: 100,
                                                   equipe: [{ nivel: 15, forca: 318, vinculo: 0, foco: null }] });
      const comp = composicaoDaWave(rngTeste(900 + k), { elenco, wave: 1 + (k % 5) });
      const sem = x => JSON.stringify(x, (key, v) => (key === 'golpe' ? undefined : v));
      const um = roteiroDaWave(rngTeste(1900 + k), { comp, venceu: r.venceu, dano: r.dano, golpesMeus: 1 });
      const quatro = roteiroDaWave(rngTeste(1900 + k), { comp, venceu: r.venceu, dano: r.dano, golpesMeus: 4 });
      igual(sem(um), sem(quatro), `wave ${k}: o moveset mudou o roteiro além do nome`);
    }
  });

  s.teste('P4: a Arena não lê o moveset; o Avanço usa o escolhido no balão e no efeito', () => {
    for (const f of ['../engine/engine.mjs', '../engine/preco.mjs', '../app/modules/odds.mjs', '../app/modules/fases.mjs',
                     '../server/scheduler.mjs', '../engine/luta-rodada.mjs'])
      ok(!/moveset/.test(fonte(f)), `${f} lê o moveset — ele virou mecânica da Arena`);
    const cena = fonte('../app/modules/avanco-cena.mjs');
    igual((cena.match(/golpeDe\(meu\.dex, golpe\.nome \?\? golpe\.golpe, golpe\.nivel \?\? cena\.nivelMeu, cena\.golpesMeu\)/g) ?? []).length, 3,
      'um dos três lugares do nosso golpe (balão, efeito, projétil) ignora o moveset');
    const estado = fonte('../app/modules/avanco-estado.mjs');
    ok(/golpesMeus: quantosGolpes\(pack, equipe\[0\]\?\.dex, equipe\[0\]\?\.nivel, meusGolpes\)/.test(estado),
      'o motor sorteia o índice num tamanho diferente do moveset — o nome sairia errado');
    ok(/import '\.\/modules\/moveset-tela\.mjs';/.test(fonte('../app/index.html')), 'o clique dos golpes não é carregado');
  });

  return s;
}
