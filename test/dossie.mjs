/* Q1/Q3/Q4 · O DOSSIÊ DA ARENA (ST-9.1 · F3.9 · Spec §7.12)
 *
 * "Informação não é probabilidade": o dossiê diz o que cada espécie FAZ na
 * Arena, medido offline sobre lutas de raiz fixa pelo MESMO caminho da luta
 * paga (D-119), e nenhum módulo de preço ou de luta o lê.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import { criarMotor } from '../engine/engine.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { medirDossie, finalizarDossie, dossieValido, impressaoDoElenco, acumularRodada, rodadaDoDossie, CAI_CEDO } from '../engine/dossie.mjs';
import { lutaDaRodada } from '../engine/luta-rodada.mjs';
import { sementes, derivarIndice } from '../engine/seed.mjs';
import { gerarDossie, comoModulo } from '../tools/gerar-dossie.mjs';
import ARQUIVADO from '../content/dossie_pokemon_kanto_v1.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

/* Toda taxa, média ou contagem sai junto do seu n. */
function semN(obj, caminho = '') {
  const faltas = [];
  if (obj && typeof obj === 'object') {
    if (('taxa' in obj || 'media' in obj || 'contagem' in obj) && !Number.isInteger(obj.n)) faltas.push(caminho);
    for (const [k, v] of Object.entries(obj)) faltas.push(...semN(v, `${caminho}.${k}`));
  }
  return faltas;
}

export function suite() {
  const s = criarSuite('dossie');

  s.teste('regerar com a mesma raiz dá o arquivo idêntico byte a byte', () => {
    igual(comoModulo(gerarDossie(E.M, 400)), comoModulo(gerarDossie(E.M, 400)), 'o dossiê não se refaz pela raiz');
  });

  s.teste('o arquivado vale para este motor e este elenco; qualquer mudança de balanço o recusa', () => {
    ok(dossieValido(ARQUIVADO, E.M), `o dossiê arquivado é de outra versão (motor ${ARQUIVADO.engineVersion}, elenco ${ARQUIVADO.contentVersion}) — rode tools/gerar-dossie.mjs`);
    ok(!dossieValido({ ...ARQUIVADO, engineVersion: 'outra' }, E.M), 'versão de motor divergente aceita');
    /* Uma espécie QUE LUTA na Arena (o Bulbasaur, por exemplo, não luta: mudar
       o stat dele não muda a Arena, e a impressão corretamente não muda). */
    const alvo = E.M.elenco[0].dex;
    const especies = pack.especies.map(e => (e.dex === alvo ? { ...e, s: [...e.s.slice(0, -1), e.s.at(-1) + 1] } : e));
    const fora = pack.especies.find(e => !E.M.elenco.some(x => x.dex === e.dex));
    const soFora = pack.especies.map(e => (e === fora ? { ...e, s: [...e.s.slice(0, -1), e.s.at(-1) + 1] } : e));
    igual(impressaoDoElenco(criarMotor({ ...pack, especies: soFora })), impressaoDoElenco(E.M),
      'mudar quem não luta na Arena invalidou o dossiê');
    const outro = criarMotor({ ...pack, especies });
    ok(impressaoDoElenco(outro) !== impressaoDoElenco(E.M), 'um stat mudou e a impressão do elenco não');
    igual(ARQUIVADO.rodadas, 200000, 'o arquivado não é o de 200.000 rodadas');
  });

  s.teste('um lote novo, de outra raiz, bate com o arquivado dentro do erro', () => {
    const lote = finalizarDossie(medirDossie(E.M, { raiz: 'dossie-conferencia', rodadas: 6000 }));
    let conferidas = 0;
    for (const [dex, e] of Object.entries(lote)) {
      const a = ARQUIVADO.especies[dex];
      ok(a, `a espécie ${dex} não está no arquivado`);
      if (e.vitoria.n < 400) continue;
      const p = a.vitoria.taxa;
      const ep = Math.sqrt(p * (1 - p) / e.vitoria.n);
      ok(Math.abs(e.vitoria.taxa - p) <= 4 * ep + 0.01, `${dex}: vitória ${e.vitoria.taxa.toFixed(3)} no lote, ${p.toFixed(3)} arquivada`);
      conferidas++;
    }
    ok(conferidas >= 40, `poucas espécies conferidas (${conferidas})`);
  });

  s.teste('cada número vem com o seu n; cai cedo, clima e rival estão lá', () => {
    igual(JSON.stringify(semN(ARQUIVADO.especies)), '[]', 'campo sem n no dossiê arquivado');
    /* E no que o código produz AGORA — o arquivado não muda quando o código muda. */
    igual(JSON.stringify(semN(finalizarDossie(medirDossie(E.M, { raiz: 'dossie-n', rodadas: 60 })))), '[]', 'campo sem n no dossiê gerado');
    const e = Object.values(ARQUIVADO.especies)[0];
    ok(Object.keys(e.porClima).some(k => k !== 'neutro'), 'nenhum clima além do neutro — o clima não entrou na luta');
    ok(e.rival.com.n + e.rival.sem.n === e.n, 'rival com + sem ≠ aparições');
    const soma = Object.values(e.posicoes.contagem).reduce((a, b) => a + b, 0);
    igual(soma, e.n, 'as posições não somam as aparições');
    igual(CAI_CEDO, 3, 'cai cedo = três primeiros a cair');
  });

  s.teste('tempestade não é abate; a posição é a do motor', () => {
    const pool = E.sortearPool(7);
    const batalha = { winner: 0, events: [{ storm: true, hits: [{ i: 1, ko: true }] }, { a: 0, d: 2, ko: true }] };
    const acc = acumularRodada(E.M, {}, { pool: pool.slice(0, 3), clima: { key: 'neutro' }, batalha });
    igual(acc[pool[0].dex].abates, 1, 'o golpe não contou');
    igual(acc[pool[1].dex].abates, 0, 'a vítima da tempestade ganhou abate');
    igual(acc[pool[0].dex].posicoes[1], 1, 'o campeão não ficou em 1º');
    /* O caso do D-118: a tempestade derruba os três, e o campeão (desempate por
       vida) também está entre os caídos. Um só 1º, e o último a cair é o 2º. */
    const todos = { winner: 0, events: [{ storm: true, hits: [{ i: 0, ko: true }, { i: 1, ko: true }, { i: 2, ko: true }] }] };
    const acc2 = acumularRodada(E.M, {}, { pool: pool.slice(0, 3), clima: { key: 'neutro' }, batalha: todos });
    igual(`${acc2[pool[0].dex].posicoes[1]}/${acc2[pool[2].dex].posicoes[2]}`, '1/1', 'posição fora da conta do motor (D-118)');
  });

  s.teste('a rodada do dossiê é a luta paga: com o clima, rodada por rodada', () => {
    let mudou = 0;
    for (let k = 0; k < 120; k++) {
      const r = rodadaDoDossie(E.M, 'dossie-clima', k);
      const t0 = sementes(derivarIndice('dossie-clima', 'dossie', k));
      const pago = lutaDaRodada(E.M, { pool: r.pool, ambiente: t0.ambiente, batalha: t0.batalha });
      igual(r.batalha.winner, pago.batalha.winner, `rodada ${k}: o dossiê mediu outra luta`);
      if (E.simular(r.pool, t0.batalha, false) !== pago.batalha.winner) mudou++;
    }
    ok(mudou > 10, `o clima quase não mudou o campeão (${mudou}/120) — o teste não distinguiria a luta sem clima`);
  });

  s.teste('nenhum módulo de preço ou de luta lê o dossiê', () => {
    for (const f of ['../engine/preco.mjs', '../engine/engine.mjs', '../engine/luta-rodada.mjs', '../server/rodada.mjs',
                     '../server/scheduler.mjs', '../server/aposta.mjs', '../server/mercado.mjs', '../app/modules/odds.mjs',
                     '../app/modules/fases.mjs'])
      ok(!/dossie/.test(fonte(f)), `${f} importa o dossiê — informação virando probabilidade`);
    ok(/from '\.\/luta-rodada\.mjs'/.test(fonte('../engine/dossie.mjs')), 'o dossiê não usa a luta paga (D-119)');
    ok(/abatesNosEventos/.test(fonte('../engine/dossie.mjs')) && !/\.storm|\.ko\b/.test(fonte('../engine/dossie.mjs').replace(/\/\*[\s\S]*?\*\//g, '')),
      'o dossiê conta abates por conta própria');
  });

  return s;
}
