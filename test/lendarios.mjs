/* Q1/Q2/Q3 · CHEFES E LENDÁRIOS (ST-10.18 · F4.8 · Spec §8.12 · L-057)
 *
 * "Lendários não entram como captura comum" (§8.12), e a decisão do dono na
 * L-057: FORA da Arena e FORA do idle — são chefes; o chefe NÃO dropa o
 * lendário, dropa ESSÊNCIA da espécie. Aqui:
 *
 *   · os cinco moram numa lista à parte (`pack.lendarios`), e nunca na de
 *     espécies — tudo que itera espécie (bioma, Pokédex, shiny, loja) segue
 *     sem vê-los, e não há como virar captura comum por acidente;
 *   · nunca no elenco da Arena, nunca num bioma;
 *   · a luta de treino os conhece (`especieDe`), e o chefe da campanha paga
 *     recompensa CONTROLADA: essência da espécie no máximo uma vez por dia, a
 *     moeda sob o mesmo teto do PvE, e NENHUMA criatura nova no save;
 *   · a regra do idle fica escrita como "não é captura comum": a faixa de
 *     raridade mais alta pesa no máximo 1,5% — e ela é de RARIDADE, não de
 *     lendário (o Dragonite está nela, e é espécie comum do elenco).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { especieDe } from '../engine/especie.mjs';
import { especiesDoBioma, raridadeDe } from '../engine/bioma.mjs';
import { montarLutador, simular } from '../engine/treino-batalha.mjs';
import { recompensaPve, diaVazio, PVE } from '../engine/recompensa-pve.mjs';
import { movesetDoRival, padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { lutarNaJornadaLocal } from '../app/modules/jornada-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { mapaDaJornada, fraseDoNo, pagamentoDoNo, fraseDoPagamento } from '../app/modules/jornada-dados.mjs';
import { readFileSync } from 'node:fs';
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

const OS_CINCO = [144, 145, 146, 150, 151];
const T = Date.UTC(2026, 8, 1, 15);
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                                     natureza: 'Hardy', origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa: false });

export function suite() {
  const s = criarSuite('lendarios');

  s.teste('os cinco moram à parte: nunca nas espécies, nunca na Arena, nunca num bioma', () => {
    igual((pack.lendarios ?? []).map(l => l.dex).join(), OS_CINCO.join(), 'os cinco lendários do pack');
    for (const d of OS_CINCO) {
      ok(!pack.especies.some(e => e.dex === d), `${d} está nas espécies — vira captura comum`);
      ok(!pack.elenco.includes(d), `${d} está no elenco da Arena`);
      for (const b of pack.biomas ?? []) ok(!especiesDoBioma(pack, b.id).some(e => e.dex === d), `${d} mora no bioma ${b.id}`);
    }
    for (const l of pack.lendarios) ok(l.n && l.t?.length && l.s?.length === 6, `${l.dex}: ficha incompleta`);
  });

  s.teste('a regra do idle: a faixa mais rara pesa no máximo 1,5% — "não é captura comum"', () => {
    const topo = pack.raridade.at(-1);
    igual(topo[0], 'lendario', 'a última faixa de raridade');
    ok(topo[2] <= 0.015, `a faixa mais rara pesa ${topo[2]} no sorteio`);
    /* E ela é de RARIDADE: quem cai nela é espécie comum do pack (Dragonite,
       pela força), e nenhum dos cinco — eles nem entram na conta. */
    const naFaixa = pack.especies.filter(e => raridadeDe(pack, e) === 'lendario').map(e => e.dex);
    ok(naFaixa.every(d => !OS_CINCO.includes(d)), 'um dos cinco caiu na faixa de raridade do idle');
  });

  s.teste('a luta de treino conhece os cinco — e só ela', () => {
    for (const d of OS_CINCO) {
      igual(especieDe(pack, d)?.dex, d, `especieDe não acha o ${d}`);
      const f = montarLutador(pack, { dex: d, nivel: 50, golpes: movesetDoRival(pack, d, 50) }, 'B', 0);
      ok(f.maxHp > 0 && f.golpes.length >= 1, `${d}: não monta para a luta`);
    }
    igual(especieDe(pack, 4)?.dex, 4, 'as espécies comuns continuam achadas');
    igual(especieDe(pack, 9999), null, 'espécie inventada');
  });

  s.teste('o chefe da campanha: um lendário, sem treinador de carne e osso', () => {
    const chefes = pack.jornada.filter(n => n.chefe);
    ok(chefes.length >= 1, 'a jornada não tem chefe');
    for (const n of chefes) {
      const t = treinador(pack, n.rival);
      ok(t.time.every(x => OS_CINCO.includes(x.dex)), `${n.id}: o chefe não é lendário`);
      ok(!n.insignia, `${n.id}: chefe dando insígnia de ginásio`);
      igual(t.essencia, t.time[0].dex, `${n.id}: a essência não é a da espécie do chefe`);
    }
  });

  s.teste('a recompensa controlada: essência no máximo 1 por dia, a moeda sob o teto, e nunca a criatura', () => {
    const CH = { id: 'c', chefe: true, essencia: 145 };
    const p1 = recompensaPve({ no: CH, venceu: true, primeiraVez: true, dia: 1, hoje: diaVazio(1), linhas: [4] });
    igual(p1.essencias?.['145'], 1, 'a primeira vitória não dá a essência');
    igual(p1.pokecoin, PVE.PRIMEIRA.chefe, 'a moeda da primeira vitória do chefe');
    igual(Object.keys(p1.doces).length, 0, 'o chefe dá doce de linha (a essência é a recompensa)');
    let h = p1.hoje, essencias = 0;
    for (let k = 0; k < 50; k++) {
      const r = recompensaPve({ no: CH, venceu: true, primeiraVez: false, dia: 1, hoje: h, linhas: [] });
      essencias += r.essencias?.['145'] ?? 0; h = r.hoje;
    }
    igual(essencias, 0, 'o mesmo dia deu essência de novo');
    const amanha = recompensaPve({ no: CH, venceu: true, primeiraVez: false, dia: 2, hoje: h, linhas: [] });
    igual(amanha.essencias?.['145'], 1, 'o dia seguinte não dá a essência do dia');
    ok(amanha.pokecoin <= PVE.TETO_DIARIO, 'a moeda do chefe passa do teto');
    /* No save: nenhuma criatura nova, a essência na bolsa da espécie. */
    const d = deposito(), e = VAZIO();
    e.criaturas = [cria('x', 6, 90), cria('y', 111, 90)];
    salvar(e, d);
    const P = { ...pack, jornada: [{ id: 'usina', rival: 'zapdos', chefe: true }] };
    const r = lutarNaJornadaLocal({ pack: P, id: 'usina', semente: 2, agora: T }, d);
    igual(r.resultado.vencedor, 'A', 'o time forte perdeu para o chefe');
    const depois = carregar(d);
    igual(depois.criaturas.length, 2, 'o chefe virou criatura no save');
    igual(depois.bolsa['essencia:145'], 1, 'a essência não foi para a bolsa');
  });

  s.teste('o mapa desenha o LENDÁRIO no nó do chefe, e diz o que ele paga', () => {
    const m = mapaDaJornada(pack, { vencidos: pack.jornada.slice(0, -1).map(n => n.id), insignias: [] });
    const no = m.nos.find(n => n.tipo === 'chefe');
    ok(no, 'o nó do chefe não é do tipo chefe');
    igual(no.lendario, 145, 'o mapa não sabe qual lendário desenhar');
    igual(no.essencia, 145, 'o mapa não sabe qual essência o chefe paga');
    igual(no.ow, null, 'o chefe ganhou folha de treinador');
    ok(/essência dele — uma por dia\. Ele nunca vira criatura sua/.test(fraseDoNo(no, 'Zapdos')), 'a frase do chefe');
    const promessa = fraseDoPagamento(pack, pagamentoDoNo(no, null, 1));
    ok(/800 PokéCoin · 2 Ultra Ball · 1 essência de Zapdos/.test(promessa), `a promessa do chefe: ${promessa}`);
    const tela = fonte('../app/modules/jornada-tela.mjs');
    ok(/n\.lendario \? `<b class="jnLend">\$\{dexImg\(n\.lendario/.test(tela), 'a tela não desenha o lendário no mapa');
  });

  s.teste('a vida de chefe: multiplica SÓ a vida, com limite, e só o chefe a tem', () => {
    const base = { dex: 145, nivel: 50, golpes: ['Thunderbolt'] };
    const a = montarLutador(pack, base, 'B', 0), b = montarLutador(pack, { ...base, vidaX: 3 }, 'B', 0);
    ok(b.maxHp >= 3 * a.maxHp - 3 && b.maxHp <= 3 * a.maxHp + 3, `a vida de chefe não é 3× (${a.maxHp} → ${b.maxHp})`);
    igual(`${b.atk}/${b.def}/${b.spa}/${b.spd}/${b.spe}`, `${a.atk}/${a.def}/${a.spa}/${a.spd}/${a.spe}`, 'o chefe ganhou mais que vida');
    igual(montarLutador(pack, { ...base, vidaX: 99 }, 'B', 0).maxHp, a.maxHp, 'vida de chefe sem limite');
    for (const t of pack.treinadores) for (const x of t.time)
      ok(!x.vidaX || pack.jornada.some(n => n.chefe && n.rival === t.id), `${t.id}: vida de chefe em quem não é chefe`);
    igual(rivalDe(pack, treinador(pack, 'zapdos'))[0].vidaX, 3, 'o rival de treino perde a vida de chefe');
  });

  s.teste('o chefe é chefe: a composição decide, e o time cheio vence', () => {
    const B = rivalDe(pack, treinador(pack, 'zapdos'));
    const T = l => l.map(([dex, nivel]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) }));
    const p = l => resumo(lote(pack, T(l), B, 1, 0, 1000)).p;
    ok(p([[112, 45], [6, 45], [130, 45]]) < 0.5, 'o trio com dois fracos a Elétrico/Voador vence o chefe');
    ok(p([[76, 45], [65, 45], [91, 45]]) > 0.8, 'o trio que pensou a composição perde para o chefe');
    ok(p([[6, 50], [130, 50], [112, 50], [143, 50], [59, 50], [65, 50]]) > 0.9, 'o time cheio de nível 50 perde para o chefe');
  });

  s.teste('o chefe se mede: a dificuldade do simulador tem a linha dele', () => {
    const t = treinador(pack, 'zapdos');
    const B = rivalDe(pack, t);
    const r = simular(pack, [{ dex: 6, nivel: 20, golpes: movesetDoRival(pack, 6, 20) }], B, 1);
    igual(r.vencedor, 'B', 'um Charizard 20 vence o chefe — ele não é chefe');
  });

  return s;
}
