/* Q1/Q3 · O DOCE CAI NA APOSTA E NA DUPLICATA, SEM CONTA (ST-9.8 · F3.8 · Spec §7.8, §7.6, §28.5)
 *
 * A liquidação local credita o doce da LINHA no save do idle, uma vez por
 * rodada mesmo com duas abas; soltar uma criatura da caixa vira doce, sem
 * descer a escada; e o doce não vira festa numa derrota.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { aplicarDoceDaAposta, soltarCriatura, doceAoSoltar, textoDoDoce, camposDoDoce } from '../app/modules/doce-dados.mjs';
import { creditarDoceLocal, soltarLocal } from '../app/modules/doce-local.mjs';
import { VAZIO, carregar, salvar, ondeAventura } from '../app/modules/idle-dados.mjs';
import { degrauDe, marcasVazias } from '../app/modules/pokedex-estado.mjs';
import { DOCE_VITORIA, DOCE_DERROTA } from '../engine/doce.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const T = Date.UTC(2026, 8, 1, 15);
const CHARIZARD = 6, CHARMANDER = 4;
const cria = (id, dex, extra = {}) => ({ id, dex, nivel: 5, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1],
                                         natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, ...extra });

export function suite() {
  const s = criarSuite('doce-local');

  s.teste('a aposta credita o doce da LINHA: 3 na vitória, 1 na derrota, uma vez por rodada', () => {
    const e = VAZIO();
    igual(JSON.stringify(aplicarDoceDaAposta(e, { pack, chave: 'r1', dex: CHARIZARD, venceu: true, agora: T })),
      JSON.stringify({ quantidade: DOCE_VITORIA, linha: CHARMANDER }), 'vitória');
    aplicarDoceDaAposta(e, { pack, chave: 'r2', dex: CHARIZARD, venceu: false, agora: T + 1 });
    igual(e.doces[CHARMANDER], DOCE_VITORIA + DOCE_DERROTA, 'a derrota não rendeu o doce reduzido');
    ok(aplicarDoceDaAposta(e, { pack, chave: 'r2', dex: CHARIZARD, venceu: false, agora: T + 2 }).repetida, 'a mesma rodada creditou de novo');
    igual(e.doces[CHARMANDER], DOCE_VITORIA + DOCE_DERROTA, 'a repetida mexeu no pote');
    for (let i = 3; i <= 12; i++) aplicarDoceDaAposta(e, { pack, chave: `r${i}`, dex: CHARIZARD, venceu: true, agora: T + i });
    igual(e.doces[CHARMANDER], DOCE_VITORIA * 9 + DOCE_DERROTA, 'o teto de 10 por dia não segurou');
    /* Save antigo: nasce com o pote vazio; lixo não vira doce. */
    igual(JSON.stringify(camposDoDoce({ doces: { 4: 2, 5: -1, 6: 'x' } }).doces), '{"4":2}', 'o save aceitou doce inválido');
  });

  s.teste('duas abas: a rodada é creditada uma vez só', () => {
    const d = deposito();
    salvar(VAZIO(), d);
    const args = { pack, chave: 'rodada-x', dex: CHARIZARD, venceu: true, agora: T };
    /* A aba A carregou ANTES da B gravar; ao gravar, esbarra na revisão. */
    const abaA = carregar(d);
    igual(creditarDoceLocal(args, d).quantidade, DOCE_VITORIA, 'a aba B não creditou');
    aplicarDoceDaAposta(abaA, args);
    igual(salvar(abaA, d), false, 'a aba A gravou por cima da B — a revisão da ST-3.2 não segurou');
    /* E o caminho real da aba A (recarrega e tenta): acha a rodada anotada. */
    ok(creditarDoceLocal(args, d).repetida, 'a segunda aba creditou de novo');
    igual(carregar(d).doces[CHARMANDER], DOCE_VITORIA, 'o pote dobrou');
  });

  s.teste('a outra aba grava NO MEIO: a gravação recusa, relê e acha a rodada', () => {
    const d = deposito();
    salvar(VAZIO(), d);
    const args = { pack, chave: 'rodada-y', dex: CHARIZARD, venceu: true, agora: T };
    /* O depósito "da outra aba": na primeira leitura desta, a outra credita
       e grava — entre o carregar e o salvar daqui. */
    let intrometeu = false;
    const vivo = { getItem: k => {
      const v = d.getItem(k);
      if (!intrometeu) { intrometeu = true; const outra = carregar(d); aplicarDoceDaAposta(outra, args); salvar(outra, d); }
      return v;
    }, setItem: (k, v) => d.setItem(k, v) };
    const r = creditarDoceLocal(args, vivo);
    ok(intrometeu && r.repetida, `a gravação não releu depois do conflito: ${JSON.stringify(r)}`);
    igual(carregar(d).doces[CHARMANDER], DOCE_VITORIA, 'o pote não tem exatamente um crédito');
  });

  s.teste('soltar: só da caixa, nunca em aventura; vira doce da linha; a escada não desce', () => {
    const d = deposito();
    const e = VAZIO();
    e.criaturas = [cria('a', CHARIZARD, { naCaixa: true }), cria('b', 7), cria('c', CHARMANDER, { naCaixa: true })];
    e.expedicoes = [{ id: 'x', bioma: 'floresta', perfil: 'trilha', equipe: ['c'], iniciadaEm: T, terminaEm: T + 1, colhidaEm: null }];
    salvar(e, d);
    igual(soltarLocal({ pack, id: 'b' }, d).ok, false, 'soltou quem está na equipe');
    igual(soltarLocal({ pack, id: 'c' }, d).ok, false, 'soltou quem está em expedição');
    igual(soltarLocal({ pack, id: 'zz' }, d).ok, false, 'soltou quem não existe');
    const r = soltarLocal({ pack, id: 'a' }, d);
    ok(r.ok && r.doce === doceAoSoltar(pack, CHARIZARD) && r.doce > 0 && r.linha === CHARMANDER, `soltar: ${JSON.stringify(r)}`);
    const depois = carregar(d);
    ok(!depois.criaturas.some(c => c.id === 'a'), 'a criatura continua na caixa');
    igual(depois.doces[CHARMANDER], r.doce, 'o doce não foi para a linha');
    /* Era o último Charizard: a Pokédex continua em CAPTURADA (ST-9.2). */
    igual(degrauDe(pack, depois, CHARIZARD, marcasVazias()), 'capturada', 'soltar o último desceu a escada');
    igual(soltarCriatura(depois, { pack, id: 'c', ondeAventura }).ok, false, 'a regra pura deixou soltar em expedição');
  });

  s.teste('o resultado: o doce é neutro, e com conta quem credita é o servidor', () => {
    igual(textoDoDoce({ quantidade: 3, linha: 4 }, 'Charmander'), '+3 doces da linha do Charmander', 'frase');
    igual(textoDoDoce({ quantidade: 1, linha: 4 }, 'Charmander'), '+1 doce da linha do Charmander', 'singular');
    igual(textoDoDoce({ quantidade: 0, repetida: true }, 'x'), null, 'a rodada repetida ganhou frase');
    const tela = fonte('../app/modules/resultado-tela.mjs');
    ok(/modoServidor\(\) \? null : creditarDoceLocal\(/.test(tela), 'o cliente credita doce com conta — dois créditos');
    igual((tela.match(/\$\{blocoDoce\}/g) ?? []).length, 3, 'o doce não está nos três desfechos');
    /* A festa continua perguntando só ao resultado econômico (§28.5). */
    ok(/if \(res\.comemora\)\{/.test(tela) && (tela.match(/dropConfetti\(\$/g) ?? []).length === 1, 'o doce mexeu na festa');
    ok(/import '\.\/modules\/doce-tela\.mjs';/.test(fonte('../app/index.html')), 'o clique de soltar não é carregado');
  });

  return s;
}
