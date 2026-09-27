/* Q1/Q3/Q4 · RECOMPENSAS PvE SEM TORNEIRA (ST-10.17 · F4.7 · Spec §8.10, §8.11, §10.4)
 *
 * A primeira vitória paga cheio (PokéCoin, bolas, doce da linha usada — a
 * insígnia e a área já são do motor da jornada); a repetição paga reduzido,
 * com bônus de diversidade e TETO DIÁRIO; a derrota não paga nem tira. Nunca
 * PokéCash: as chaves pagas são a moeda do treinador, bolas e doces.
 *
 * O aceite do plano: 100 repetições não passam do teto.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { recompensaPve, diaVazio, PVE, tipoDoNo } from '../engine/recompensa-pve.mjs';
import { porcentagemExibida } from '../engine/treino-preco.mjs';
import { pagamentoDoNo, fraseDoPagamento } from '../app/modules/jornada-dados.mjs';
import { fraseDoResultado } from '../app/modules/pve-dados.mjs';
import { camposDaJornada } from '../engine/jornada.mjs';
import { lutarNaJornadaLocal } from '../app/modules/jornada-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const ROTA = { id: 'r', ginasio: false }, GIN = { id: 'g', ginasio: true };
const T = Date.UTC(2026, 8, 1, 15);
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                                     natureza: 'Hardy', origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa: false });

export function suite() {
  const s = criarSuite('recompensa-pve');

  s.teste('a primeira vitória paga cheio; o ginásio paga mais que a rota', () => {
    const r = recompensaPve({ no: ROTA, venceu: true, primeiraVez: true, dia: 10, hoje: diaVazio(10), linhas: [4, 16] });
    igual(r.motivo, 'primeira', 'o motivo');
    igual(r.pokecoin, PVE.PRIMEIRA.rota, 'a moeda da primeira vitória de rota');
    igual(JSON.stringify(r.bolas), JSON.stringify(PVE.BOLAS.rota), 'as bolas');
    igual(JSON.stringify(r.doces), '{"4":1,"16":1}', 'um doce por linha usada');
    const g = recompensaPve({ no: GIN, venceu: true, primeiraVez: true, dia: 10, hoje: diaVazio(10), linhas: [7] });
    ok(g.pokecoin > r.pokecoin, 'o ginásio não paga mais que a rota');
    /* ST-10.19c: a Liga paga como o chefe — sem a essência, e com doce. */
    const l = recompensaPve({ no: { id: 'l', liga: true }, venceu: true, primeiraVez: true, dia: 10, hoje: diaVazio(10), linhas: [7] });
    igual(l.pokecoin, PVE.PRIMEIRA.liga, 'a moeda da primeira vitória da Liga');
    ok(PVE.PRIMEIRA.liga > PVE.PRIMEIRA.ginasio, 'a Liga não paga mais que o ginásio');
    igual(JSON.stringify(l.bolas), JSON.stringify(PVE.BOLAS.liga), 'as bolas da Liga');
    igual(Object.keys(l.essencias).length, 0, 'a Liga deu essência');
    igual(tipoDoNo({ liga: true }), 'liga', 'o tipo do nó da Liga');
    igual(tipoDoNo({ insignia: 'x' }) + tipoDoNo({ ginasio: true }) + tipoDoNo({ chefe: true }) + tipoDoNo({}), 'ginasioginasiochefe' + 'rota', 'o tipo de cada nó');
    igual(JSON.stringify(r.hoje), JSON.stringify(diaVazio(10)), 'a primeira vitória gastou o teto das repetições');
    /* Doce: no máximo três linhas, e sem repetir linha. */
    igual(Object.keys(recompensaPve({ no: ROTA, venceu: true, primeiraVez: true, dia: 1, hoje: diaVazio(1), linhas: [1, 1, 4, 7, 25, 16] }).doces).join(), '1,4,7', 'as linhas do doce');
  });

  s.teste('a derrota não paga nem tira', () => {
    const h = { dia: 3, pago: 40, nos: ['r'] };
    const r = recompensaPve({ no: ROTA, venceu: false, primeiraVez: false, dia: 3, hoje: h, linhas: [4] });
    igual(r.motivo, 'derrota', 'o motivo');
    igual(r.pokecoin + Object.keys(r.bolas).length + Object.keys(r.doces).length, 0, 'a derrota pagou');
    igual(JSON.stringify(r.hoje), JSON.stringify(h), 'a derrota mexeu no dia');
  });

  s.teste('a repetição paga reduzido, e a diversidade paga mais — sem passar do máximo', () => {
    const um = recompensaPve({ no: ROTA, venceu: true, primeiraVez: false, dia: 5, hoje: diaVazio(5), linhas: [4] });
    igual(um.motivo, 'repeticao', 'o motivo');
    igual(um.pokecoin, Math.round(PVE.PRIMEIRA.rota * PVE.FRACAO_REPETICAO), 'a repetição paga a fração');
    igual(Object.keys(um.bolas).length + Object.keys(um.doces).length, 0, 'a repetição paga bola ou doce');
    /* Três nós diferentes no dia: o terceiro paga com o bônus. */
    let h = diaVazio(5);
    for (const id of ['a', 'b']) h = recompensaPve({ no: { id, ginasio: false }, venceu: true, primeiraVez: false, dia: 5, hoje: h, linhas: [] }).hoje;
    const terceiro = recompensaPve({ no: { id: 'c', ginasio: false }, venceu: true, primeiraVez: false, dia: 5, hoje: h, linhas: [] });
    igual(terceiro.pokecoin, Math.round(um.pokecoin * Math.min(PVE.DIVERSIDADE_MAX, 1 + PVE.DIVERSIDADE * 2)), 'o bônus de diversidade');
    const mesmo = recompensaPve({ no: { id: 'a', ginasio: false }, venceu: true, primeiraVez: false, dia: 5, hoje: h, linhas: [] });
    ok(mesmo.pokecoin < terceiro.pokecoin, 'repetir o MESMO nó paga como variar');
    /* Muitos nós: o bônus para no máximo. */
    let hh = diaVazio(6);
    for (let i = 0; i < 12; i++) hh = { ...hh, nos: [...hh.nos, `n${i}`] };
    igual(recompensaPve({ no: { id: 'z', ginasio: false }, venceu: true, primeiraVez: false, dia: 6, hoje: hh, linhas: [] }).pokecoin,
      Math.round(um.pokecoin * PVE.DIVERSIDADE_MAX), 'o bônus passou do máximo');
  });

  s.teste('o aceite: 100 repetições não passam do teto — e o dia seguinte começa limpo', () => {
    for (const no of [ROTA, GIN]) {
      let h = diaVazio(9), soma = 0, depoisDoTeto = 0;
      for (let k = 0; k < 100; k++) {
        const r = recompensaPve({ no: { ...no, id: `${no.id}${k % 5}` }, venceu: true, primeiraVez: false, dia: 9, hoje: h, linhas: [] });
        soma += r.pokecoin; h = r.hoje;
        if (r.motivo === 'teto') { depoisDoTeto++; igual(r.pokecoin, 0, 'o teto pagou'); }
      }
      ok(soma <= PVE.TETO_DIARIO, `${no.id}: 100 repetições pagaram ${soma}, o teto é ${PVE.TETO_DIARIO}`);
      igual(soma, PVE.TETO_DIARIO, `${no.id}: o teto não é alcançável — a repetição nunca rende o que promete`);
      ok(depoisDoTeto > 0, 'o teto nunca foi alcançado');
      igual(h.pago, soma, 'o dia não soma o que pagou');
      const amanha = recompensaPve({ no, venceu: true, primeiraVez: false, dia: 10, hoje: h, linhas: [] });
      ok(amanha.pokecoin > 0 && amanha.hoje.dia === 10 && amanha.hoje.pago === amanha.pokecoin, 'o dia seguinte herdou o teto de ontem');
    }
  });

  s.teste('nunca PokéCash: só a moeda do treinador, bolas e doces', () => {
    const src = fonte('../engine/recompensa-pve.mjs');
    ok(!/pc-?b|pokecash|carteira|banco/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'a recompensa PvE fala de PokéCash');
    const permitidas = new Set((pack.bolas ?? []).map(b => b.id));
    for (const no of [ROTA, GIN]) {
      const r = recompensaPve({ no, venceu: true, primeiraVez: true, dia: 1, hoje: diaVazio(1), linhas: [4] });
      ok(Object.keys(r.bolas).every(k => permitidas.has(k)), `${no.id}: paga bola que o pack não tem`);
      igual(Object.keys(r).filter(k => !['motivo', 'pokecoin', 'bolas', 'doces', 'essencias', 'hoje', 'teto'].includes(k)).join(), '', 'uma chave de pagamento nova');
    }
    const local = fonte('../app/modules/jornada-local.mjs');
    ok(!/banco\.mjs|creditarRecompensa|pagarAposta/.test(local), 'a luta da jornada toca a carteira da Arena');
  });

  s.teste('o save: a vitória grava o pagamento na MESMA gravação da luta, e o dia é aditivo', () => {
    igual(JSON.stringify(camposDaJornada({}).jornada.pve), JSON.stringify(diaVazio(null)), 'save antigo sem o dia do PvE');
    igual(JSON.stringify(camposDaJornada({ jornada: { pve: { dia: 'x', pago: -3, nos: 'y' } } }).jornada.pve), JSON.stringify(diaVazio(null)), 'lixo no dia do PvE');
    const d = deposito(), e = VAZIO();
    e.criaturas = [cria('x', 6, 60)];
    salvar(e, d);
    const P = { ...pack, jornada: [{ id: 'a', rival: 'rota1' }, { id: 'g', rival: 'brock', insignia: 'rocha' }] };
    const r1 = lutarNaJornadaLocal({ pack: P, id: 'a', semente: 3, agora: T }, d);
    igual(r1.recompensa.motivo, 'primeira', 'a primeira vitória');
    const s1 = carregar(d);
    igual(s1.bolsa[pack.moedaPve.id], PVE.PRIMEIRA.rota, 'a moeda não foi para a bolsa');
    igual(s1.bolsa.poke, PVE.BOLAS.rota.poke, 'as bolas não foram para a bolsa');
    igual(s1.doces['4'], 1, 'o doce da linha do Charizard (base Charmander)');
    const r2 = lutarNaJornadaLocal({ pack: P, id: 'a', semente: 4, agora: T }, d);
    igual(r2.recompensa.motivo, 'repeticao', 'a repetição');
    igual(carregar(d).bolsa[pack.moedaPve.id], PVE.PRIMEIRA.rota + r2.recompensa.pokecoin, 'a repetição não somou');
    igual(carregar(d).jornada.pve.pago, r2.recompensa.pokecoin, 'o dia do PvE não foi gravado');
    /* ST-10.19c: a luta local num nó da Liga paga como a Liga. */
    const d2 = deposito(), e2 = VAZIO();
    e2.criaturas = [cria('y', 6, 90), cria('z', 131, 90)];
    salvar(e2, d2);
    const PL = { ...pack, jornada: [{ id: 'l', rival: 'rota1', liga: true }] };
    const rl = lutarNaJornadaLocal({ pack: PL, id: 'l', semente: 3, agora: T }, d2);
    igual(rl.recompensa.pokecoin, PVE.PRIMEIRA.liga, 'a luta local da Liga não paga como a Liga');
  });

  s.teste('a tela promete o que a luta paga: o mesmo motor antes e depois', () => {
    const rota = { id: 'r', tipo: 'rota', estado: 'atual' }, gin = { id: 'g', tipo: 'ginasio', estado: 'vencido' };
    igual(pagamentoDoNo({ ...rota, estado: 'trancado' }, null, 1), null, 'nó trancado prometeu pagamento');
    igual(pagamentoDoNo(rota, null, 1).pokecoin, PVE.PRIMEIRA.rota, 'a promessa da primeira vitória');
    igual(pagamentoDoNo(gin, { dia: 1, pago: 0, nos: [] }, 1).pokecoin, Math.round(PVE.PRIMEIRA.ginasio * PVE.FRACAO_REPETICAO), 'a promessa da revanche');
    igual(pagamentoDoNo(gin, { dia: 1, pago: PVE.TETO_DIARIO, nos: ['x'] }, 1).motivo, 'teto', 'a promessa no teto');
    ok(/primeira vitória paga 200 PokéCoin · 2 Poké Ball/.test(fraseDoPagamento(pack, pagamentoDoNo(rota, null, 1))), 'a frase da primeira');
    ok(/vale como treino/.test(fraseDoPagamento(pack, pagamentoDoNo(gin, { dia: 1, pago: PVE.TETO_DIARIO, nos: [] }, 1))), 'a frase do teto');
    const depois = recompensaPve({ no: GIN, venceu: true, primeiraVez: false, dia: 2, hoje: { dia: 2, pago: 30, nos: ['a'] }, linhas: [] });
    igual(fraseDoPagamento(pack, depois, { depois: true }), `Ganhou ${depois.pokecoin} PokéCoin (hoje: ${30 + depois.pokecoin} de ${PVE.TETO_DIARIO}).`, 'a frase do fim da luta');
    const tela = fonte('../app/modules/jornada-tela.mjs');
    ok(/fraseDoPagamento\(PACK, pagamentoDoNo\(no, carregar\(\)\.jornada\?\.pve, diaDoMundo\(Date\.now\(\)\)\)\)/.test(tela), 'o painel não diz o que o nó paga');
    ok(/fraseDoPagamento\(PACK, r\.recompensa, \{ depois: true \}\)/.test(tela), 'o fim da luta não diz o que pagou');
  });

  s.teste('D-126 consertado: lote não unânime nunca mostra 100% nem 0%', () => {
    igual([1, 0.9995, 0.995, 0.994, 0.5, 0.006, 0.0005, 0].map(porcentagemExibida).join(), '100%,>99%,>99%,99%,50%,1%,<1%,0%', 'a porcentagem exibida');
    igual(fraseDoResultado({ vencedor: 'A', turnos: 3 }, { p: 0.9995, erro: 0.0005, sims: 2000 }).texto, 'A chance antes da luta era >99% (±1).', 'o resultado');
    igual(fraseDoResultado({ vencedor: 'B', turnos: 3 }, { p: 0.9995, erro: 0.0005, sims: 2000 }).texto,
      'A chance antes da luta era >99% (±1): em 1 de cada 100 lutas assim, o rival vence.', 'a derrota rara não vira "em 0 de cada 100"');
    for (const f of ['jornada-tela', 'treino-tela', 'pve-tela'])
      ok(!/arredondarNeutro\([^)]*\* 100\)\}?%/.test(fonte(`../app/modules/${f}.mjs`)), `${f} ainda arredonda a chance direto para a tela`);
  });

  return s;
}
