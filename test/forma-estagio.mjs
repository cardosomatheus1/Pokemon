/* Q1/Q3 · A FORMA EVOLUÍDA SÓ SE PEGA NO ESTÁGIO DO NÍVEL DELA (ST-2.13)
 *
 * O dono, olhando o time de um amigo que acabou de começar: formas já
 * evoluídas, com nível baixo, "avançando rápido dos treinadores — acho que não
 * tá tão equilibrado". Medido: em toda rota os chefes do estágio 1 são segundas
 * formas, e o encontro que a vitória deixava era o próprio chefe; a expedição
 * do estágio 1 também sorteava evoluídas.
 *
 * A regra mora em `engine/estagios.mjs` (camada 0): cada estágio é uma faixa
 * de níveis, e a forma só se pega no estágio cuja faixa alcança o nível em que
 * ela evolui. A run troca o encontro pela forma do estágio (a contagem fica); a
 * expedição tira a forma do elenco (a prévia e o sorteio leem o mesmo elenco).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { nivelParaExistir, capturavelNoEstagio, formaDoEstagio, tetoDoEstagio, cabeNoEstagio,
         NIVEL_SEM_NIVEL, ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import { elencoDoBioma } from '../engine/bioma.mjs';
import { elencoDoEstagio as elencoDaRota } from '../engine/elenco-estagio.mjs';
import { elencoDoEstagio, previaDeEncontros, sortearEncontros } from '../engine/expedicao.mjs';
import { entradaDe } from '../engine/evolucao.mjs';
import { contaDaRun } from '../app/modules/avanco-conta.mjs';
import { semente } from '../engine/instancia.mjs';

const AGORA = Date.UTC(2026, 9, 1, 12);
const biomas = () => PACK.biomas.map(b => b.id ?? b.key);
/* As linhas são lidas do pack, e não escritas aqui: o motor não sabe nomes, e
   o teste vale para qualquer pack que tenha linhas de três formas. */
const evos = () => PACK.evolucoes ?? [];
const porNivel = () => evos().filter(e => Number(e.exige?.nivel) > 0);
const tresFormas = () => evos().filter(e => entradaDe(PACK, e.de) && Number(e.exige?.nivel) > 0
                                          && Number(entradaDe(PACK, e.de).exige?.nivel) > 0);

export function suite() {
  const s = criarSuite('forma-estagio');

  s.teste('o nível em que a forma passa a existir: a base é 1; a evoluída, o da evolução', () => {
    const e = porNivel()[0];
    igual(nivelParaExistir(PACK, e.de) <= Number(e.exige.nivel), true, 'a forma de antes pede mais que a de depois');
    igual(nivelParaExistir(PACK, e.para), Math.max(Number(e.exige.nivel), nivelParaExistir(PACK, e.de)), 'a forma de depois');
    const base = (PACK.especies ?? []).find(x => !entradaDe(PACK, x.dex));
    igual(nivelParaExistir(PACK, base.dex), 1, 'a base não é nível 1');
    /* A terceira forma pede o MAIOR dos dois — e não o último lido. */
    const t = tresFormas().find(x => Number(entradaDe(PACK, x.de).exige.nivel) !== Number(x.exige.nivel));
    ok(t, 'o pack perdeu as linhas de três formas');
    igual(nivelParaExistir(PACK, t.para), Math.max(Number(t.exige.nivel), Number(entradaDe(PACK, t.de).exige.nivel)),
      'a terceira forma não pede o maior nível da linha');
    /* Pedra e troca não têm nível: valem o `NIVEL_SEM_NIVEL`. */
    const pedra = evos().find(x => !(Number(x.exige?.nivel) > 0) && !entradaDe(PACK, x.de));
    ok(pedra, 'o pack perdeu a evolução sem nível');
    igual(nivelParaExistir(PACK, pedra.para), NIVEL_SEM_NIVEL, 'a evolução por pedra virou nível 1');
  });

  s.teste('cada estágio é uma faixa: até a porta do seguinte; o último não tem teto', () => {
    igual([1, 2, 3, 4].map(tetoDoEstagio).join(','), '12,19,31,Infinity', 'o teto dos estágios');
    igual(tetoDoEstagio(ESTAGIOS_POR_BIOMA), Infinity, 'o último estágio tem teto');
    for (const e of porNivel()) {
      const n = nivelParaExistir(PACK, e.para);
      for (let k = 1; k <= ESTAGIOS_POR_BIOMA; k++)
        igual(capturavelNoEstagio(PACK, e.para, k), n <= tetoDoEstagio(k), `o ${e.para} (nível ${n}) no estágio ${k}`);
    }
  });

  s.teste('a forma do estágio desce a linha até caber, e a base sempre cabe', () => {
    for (const e of evos()) for (let k = 1; k <= ESTAGIOS_POR_BIOMA; k++) {
      const f = formaDoEstagio(PACK, e.para, k);
      ok(capturavelNoEstagio(PACK, f, k), `o ${e.para} no estágio ${k} virou ${f}, que também não cabe`);
      if (capturavelNoEstagio(PACK, e.para, k)) igual(f, e.para, `o ${e.para} cabia no estágio ${k} e foi trocado`);
      /* desce pela PRÓPRIA linha: f é um ancestral do que se viu */
      else ok([e.de, entradaDe(PACK, e.de)?.de].includes(f), `o ${e.para} no estágio ${k} virou ${f}, fora da linha dele`);
    }
    const t = tresFormas().find(x => !capturavelNoEstagio(PACK, x.para, 1) && capturavelNoEstagio(PACK, x.de, 1));
    if (t) igual(formaDoEstagio(PACK, t.para, 1), t.de, 'desceu além do necessário');
  });

  s.teste('o caso do dono: nenhum chefe evoluído do estágio 1 vira encontro evoluído', () => {
    let chefesEvoluidos = 0;
    for (const b of biomas()) {
      const rota = elencoDaRota(PACK, b, 1);
      const chefes = (rota?.chefes ?? rota?.boss ?? []).map(x => x?.dex ?? x).filter(Number.isFinite);
      const dexes = [...chefes, ...(rota?.comuns ?? []).map(x => x?.dex ?? x)].filter(Number.isFinite);
      const run = { raiz: `r-${b}`, bioma: b, estagio: 1, wave: 3, hpNaWave: 50, equipe: [],
                    abates: dexes.map(dex => ({ dex })) };
      const c = contaDaRun(PACK, { run, criaturas: [], motor: null, avancos: [], raiz: 1, agora: AGORA });
      igual(c.pendentes.length, new Set(dexes).size, `${b}: a troca mudou a contagem de encontros`);
      for (const p of c.pendentes) ok(capturavelNoEstagio(PACK, p.dex, 1), `${b}: o ${p.dex} ficou esperando bola no estágio 1`);
      chefesEvoluidos += chefes.filter(d => !capturavelNoEstagio(PACK, d, 1)).length;
      /* o registro continua vendo quem LUTOU */
      igual(c.fragmentos.map(f => f.dex).join(','), [...new Set(dexes)].join(','), `${b}: o registro perdeu quem lutou`);
    }
    ok(chefesEvoluidos > 0, 'nenhum chefe do estágio 1 é evoluído — o teste não exerceu a troca');
  });

  s.teste('a run fora do estágio 1 deixa a forma que cabe nele, e a raridade é a dela', () => {
    const e = porNivel().find(x => !capturavelNoEstagio(PACK, x.para, 1) && capturavelNoEstagio(PACK, x.para, 3));
    const run = (estagio) => ({ raiz: 'r', bioma: biomas()[0], estagio, wave: 2, hpNaWave: 40, equipe: [], abates: [{ dex: e.para }] });
    const no = k => contaDaRun(PACK, { run: run(k), criaturas: [], motor: null, avancos: [], raiz: 1, agora: AGORA }).pendentes[0];
    igual(no(3).dex, e.para, 'no estágio 3 a forma cabia e foi trocada');
    const p1 = no(1);
    igual(p1.dex, formaDoEstagio(PACK, e.para, 1), 'no estágio 1 a forma não foi trocada');
    const especie = (PACK.especies ?? []).find(x => x.dex === p1.dex);
    ok(especie, 'a forma trocada não existe no pack');
  });

  s.teste('a expedição só sorteia o que cabe no estágio — e a prévia mostra o mesmo', () => {
    for (const b of biomas()) for (let k = 1; k <= ESTAGIOS_POR_BIOMA; k++) {
      const lista = elencoDoEstagio(PACK, b, null, k);
      for (const e of lista) ok(capturavelNoEstagio(PACK, e.dex, k), `${b}/${k}: o ${e.dex} no elenco da expedição`);
      const previa = previaDeEncontros({ pack: PACK, bioma: b, perfil: 'vigilia', estagio: k });
      igual(previa.map(x => x.dex).sort().join(','), lista.map(x => x.dex).sort().join(','), `${b}/${k}: a prévia diverge do elenco`);
      const rnd = semente(`exp-${b}-${k}`);
      for (let i = 0; i < 20; i++) for (const e of sortearEncontros(rnd, { pack: PACK, bioma: b, perfil: 'vigilia', estagio: k }))
        ok(capturavelNoEstagio(PACK, e.dex, k), `${b}/${k}: o sorteio trouxe o ${e.dex}`);
    }
    /* e a regra MORDE: o elenco cru do estágio 1 tinha evoluída fora da faixa,
       e ela saiu (medido na ST-2.13: em toda rota) */
    for (const b of biomas()) {
      const cru = elencoDoBioma(PACK, b).filter(e => cabeNoEstagio(e.raridade, 1));
      ok(cru.some(e => !capturavelNoEstagio(PACK, e.dex, 1)), `${b}: o estágio 1 cru já não tinha evoluída — o teste não exerce a regra`);
      igual(elencoDoEstagio(PACK, b, null, 1).length, cru.filter(e => capturavelNoEstagio(PACK, e.dex, 1)).length,
        `${b}: a expedição tirou mais (ou menos) que as fora da faixa`);
    }
  });

  return s;
}
