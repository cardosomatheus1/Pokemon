/* Q1/Q3/Q4 · DAR DOCE SOBE O NÍVEL (ST-9.10 · F3.4 · Spec §7.9, §7.18)
 *
 * O doce da LINHA vira XP da criatura, a uma taxa fixada pela medição: o teto
 * de doce de um dia rende no máximo 25% do XP diário do perfil casual.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { darDoce } from '../app/modules/doce-dados.mjs';
import { darDoceLocal } from '../app/modules/doce-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { XP_POR_DOCE, TETO_APOSTAS_COM_DOCE, DOCE_VITORIA } from '../engine/doce.mjs';
import { xpParaNivel, NIVEL_MAX } from '../engine/nivel-criatura.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/emissao-idle.json', import.meta.url), 'utf8'));
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const cria = (id, dex, xp = 0) => ({ id, dex, nivel: 1, xp, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                                     origem: 'captura', stamina: 100, staminaEm: 0, criadaEm: 0 });

export function suite() {
  const s = criarSuite('doce-nivel');

  s.teste('o doce da linha vira XP; doce de outra linha não serve; o doce é descontado', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 5)];            // Charmeleon: linha do Charmander (4)
    e.doces = { 1: 50 };                     // só doce do Bulbasaur
    igual(darDoce(e, { pack, id: 'a' }).ok, false, 'aceitou doce de outra linha');
    igual(e.doces[1], 50, 'o doce de outra linha foi gasto');
    e.doces[4] = 5;
    const r = darDoce(e, { pack, id: 'a', quantos: 3 });
    ok(r.ok && r.gastos === 3 && r.xp === 3 * XP_POR_DOCE, `dar 3: ${JSON.stringify(r)}`);
    igual(e.criaturas[0].xp, 3 * XP_POR_DOCE, 'o XP não entrou');
    igual(e.doces[4], 2, 'o doce não foi descontado');
    igual(darDoce(e, { pack, id: 'a', quantos: 99 }).gastos, 2, 'deu mais doce do que tinha');
    ok(!(4 in e.doces), 'o pote vazio ficou com zero guardado');
  });

  s.teste('o nível respeita NIVEL_MAX: no topo, recusa sem gastar', () => {
    const e = VAZIO();
    e.criaturas = [cria('t', 4, xpParaNivel(NIVEL_MAX))];
    e.doces = { 4: 10 };
    igual(darDoce(e, { pack, id: 't' }).ok, false, 'deu doce no nível máximo');
    igual(e.doces[4], 10, 'gastou doce no nível máximo');
  });

  s.teste('a taxa sai da medição: o teto do dia rende no máximo 25% do XP diário do casual', () => {
    const casual = FIXTURE.perfis.casual.estagio1.porDia;
    const noTeto = TETO_APOSTAS_COM_DOCE * DOCE_VITORIA * XP_POR_DOCE;
    ok(noTeto <= 0.25 * casual.xp, `o doce rende ${noTeto} XP/dia, mais que 25% dos ${casual.xp} do casual`);
    ok(noTeto >= 0.1 * casual.xp, `o doce rende ${noTeto} XP/dia — menos de 10% do casual, não é sentido`);
    for (const p of Object.values(FIXTURE.perfis)) for (const est of Object.values(p))
      igual(est.porDia.xpDoce, noTeto, 'a fixture não tem a coluna do doce, ou ela não é a conta');
  });

  s.teste('grava com a revisão, e a tela liga o botão', () => {
    const d = deposito();
    const e = VAZIO(); e.criaturas = [cria('a', 4)]; e.doces = { 4: 2 };
    salvar(e, d);
    ok(darDoceLocal({ pack, id: 'a' }, d).ok, 'dar doce não gravou');
    const depois = carregar(d);
    igual(depois.doces[4], 1, 'o doce não saiu do save');
    igual(depois.criaturas[0].xp, XP_POR_DOCE, 'o XP não entrou no save');
    ok(/closest\('\[data-dar-doce\]'\)/.test(fonte('../app/modules/doce-tela.mjs')), 'o botão de dar doce não tem clique');
    ok(/data-dar-doce="\$\{c\.id\}"/.test(fonte('../app/modules/idle-paineis.mjs')), 'o Centro não mostra dar doce');
  });

  return s;
}
