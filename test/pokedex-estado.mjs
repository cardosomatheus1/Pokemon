/* Q1/Q3 · A ESCADA DE INFORMAÇÃO DA POKÉDEX (ST-9.2 · F3.10 · Spec §7.4)
 *
 * Vista → encontrada → capturada → dominada, e o que cada degrau libera no
 * dossiê. Monotônica (soltar ou evoluir nunca desce), aditiva no save, e sem
 * mexer nas vagas nem no teto de encontros do idle.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { degrauDe, escadaDe, registroDaLinha, marcarVistas, marcarEncontrada, sincronizarPossuidas,
         camposDaEscada, DEGRAUS, LIBERA, marcasVazias, carregarMarcas, gravarMarcas, vistosNaPokedex } from '../app/modules/pokedex-estado.mjs';
import { VAZIO, carregar, salvar, especiesVistas, vagasDe } from '../app/modules/idle-dados.mjs';
import { tetoDeEncontros } from '../engine/expedicao.mjs';
import { linhaDe, baseDe } from '../engine/evolucao.mjs';

const CHARIZARD = 6, CHARMANDER = 4;
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

export function suite() {
  const s = criarSuite('pokedex-estado');

  s.teste('a escada sobe degrau por degrau, e cada um diz o que falta', () => {
    const e = VAZIO(), m = marcasVazias();
    igual(degrauDe(pack, e, CHARIZARD, m), 'desconhecida', 'sem nada');
    marcarVistas(m, [CHARIZARD]);
    igual(degrauDe(pack, e, CHARIZARD, m), 'vista', 'vista na Arena');
    ok(/aposte/.test(escadaDe(pack, e, CHARIZARD, m).falta), 'a vista não diz o que falta');
    marcarEncontrada(m, CHARIZARD);
    igual(degrauDe(pack, e, CHARIZARD, m), 'encontrada', 'apostou');
    e.criaturas.push({ id: 'c1', dex: CHARIZARD });
    igual(degrauDe(pack, e, CHARIZARD, m), 'capturada', 'tem um');
    const { alvo } = registroDaLinha(pack, e, CHARIZARD);
    ok(alvo > 0, 'a linha não tem alvo de registro');
    e.registro[CHARMANDER] = alvo;   // o registro é da LINHA: fragmentos da base contam
    igual(degrauDe(pack, e, CHARIZARD, m), 'dominada', 'registro da linha completo não domina');
    igual(escadaDe(pack, e, CHARIZARD, m).falta, null, 'o último degrau ainda pede algo');
    igual(JSON.stringify(escadaDe(pack, e, CHARIZARD, m).liberado),
      JSON.stringify([...LIBERA.vista, ...LIBERA.encontrada, ...LIBERA.capturada, ...LIBERA.dominada]), 'liberado cumulativo');
  });

  s.teste('monotônica: soltar a última não desce, e ENCONTRADA exige aposta — aparecer não basta', () => {
    const e = VAZIO();
    e.criaturas.push({ id: 'c1', dex: CHARIZARD });
    sincronizarPossuidas(e);
    e.criaturas = [];                                   // soltou
    igual(degrauDe(pack, e, CHARIZARD), 'capturada', 'soltar a última desceu o degrau');
    const v = VAZIO(), mv = marcasVazias();
    marcarVistas(mv, [CHARIZARD, CHARIZARD]);
    igual(degrauDe(pack, v, CHARIZARD, mv), 'vista', 'aparecer virou encontrar');
    const d = VAZIO();
    d.registro[CHARMANDER] = 999;
    igual(degrauDe(pack, d, CHARIZARD), 'desconhecida', 'dominada sem nunca ter possuído');
  });

  s.teste('a gravação sincroniza "já possuiu"; um save antigo carrega sem perda', () => {
    /* Salvar, SOLTAR, salvar de novo, recarregar: o caso em que só a gravação
       lembra. Recarregar com a criatura ainda na caixa não distingue nada — o
       `carregar` a remonta das criaturas (achado pelo S1308). */
    const dep = deposito();
    const e = VAZIO();
    e.criaturas.push({ id: 'c1', dex: CHARIZARD });
    salvar(e, dep);
    e.criaturas = [];
    salvar(e, dep);
    const lido = carregar(dep);
    ok(lido.jaPossuiu.includes(CHARIZARD), 'soltou, gravou, recarregou — e "já possuiu" esqueceu');
    igual(degrauDe(pack, lido, CHARIZARD), 'capturada', 'o degrau desceu depois de soltar e recarregar');
    const antigo = deposito();
    antigo.setItem('ar_idle', JSON.stringify({ v: 1, criaturas: [{ id: 'x', dex: 25 }], registro: { 25: 3 } }));
    const velho = carregar(antigo);
    ok(velho.registro[25] === 3 && velho.criaturas.length === 1, 'o save antigo perdeu dados');
    igual(JSON.stringify(velho.jaPossuiu), '[25]', 'o save antigo não ganhou "já possuiu"');
    const c = camposDaEscada({ criaturas: [{ id: 'x', dex: 25 }] }, [{ id: 'x', dex: 25 }]);
    igual(JSON.stringify(c), JSON.stringify({ jaPossuiu: [25] }), 'campos de save antigo');
    /* As marcas da Arena na chave PRÓPRIA — gravar não mexe na revisão do idle. */
    const d2 = deposito();
    const idle = VAZIO(); salvar(idle, d2);
    const rev = JSON.parse(d2.getItem('ar_idle')).rev;
    const mm = carregarMarcas(d2); marcarVistas(mm, [CHARIZARD]); gravarMarcas(mm, d2);
    igual(JSON.parse(d2.getItem('ar_idle')).rev, rev, 'gravar as marcas da Arena subiu a revisão do idle');
    ok(carregarMarcas(d2).vistas.includes(CHARIZARD), 'a marca não voltou do depósito');
    ok(vistosNaPokedex(idle, mm).has(CHARIZARD), 'a Pokédex não conta o que a Arena mostrou');
  });

  s.teste('vagas e teto de encontros NÃO mudam com 100 rodadas assistidas', () => {
    const e = VAZIO();
    e.registro[CHARMANDER] = 2;
    const total = pack.especies.length;
    const [vagas, vistas, teto] = [vagasDe(e), especiesVistas(e), tetoDeEncontros(especiesVistas(e), total)];
    const m = marcasVazias();
    for (let k = 0; k < 100; k++) marcarVistas(m, pack.especies.slice(k % 60, k % 60 + 12).map(x => x.dex));
    Object.assign(e, { vistasArena: m.vistas });   // nem se alguém as puser no save
    igual(`${vagasDe(e)}/${especiesVistas(e)}/${tetoDeEncontros(especiesVistas(e), total)}`, `${vagas}/${vistas}/${teto}`,
      'ver na Arena mexeu nas vagas ou no teto do idle');
  });

  s.teste('a linha de registro: base e evoluções somadas contra o alvo da raridade da base', () => {
    const linha = linhaDe(pack, CHARIZARD);
    ok(linha.includes(CHARMANDER) && linha.includes(CHARIZARD), 'linha do Charizard');
    igual(baseDe(pack, CHARIZARD), CHARMANDER, 'base do Charizard');
    const e = VAZIO();
    e.registro[CHARMANDER] = 1; e.registro[5] = 2;
    igual(registroDaLinha(pack, e, CHARIZARD).fragmentos, 3, 'a linha não somou');
    igual(DEGRAUS[0], 'desconhecida', 'degraus');
  });

  return s;
}
