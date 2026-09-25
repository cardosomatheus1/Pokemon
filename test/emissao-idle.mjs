/* Q4 · O MAPA DE EMISSÃO DO IDLE (ST-3.3, INT-01) — fixture de MEDIÇÃO.
 *
 * O REV-14 da Revisão 2.0: "teto de encontros é apresentado como proteção
 * suficiente da economia; a run sem encontros ainda paga itens e moeda — a
 * emissão de outros recursos fica sem limite explicitado". Ninguém sabia QUANTO.
 *
 * Aqui se mede, pelo MOTOR do jogo — as mesmas funções que a tela chama —,
 * quanto cada perfil de jogador tira por DIA, em dois estágios:
 *
 *   casual     1 criatura · uma Vigília à noite + 2 Avanços de dia
 *   diario     3 criaturas · uma na Vigília; as outras duas, 4 Avanços cada
 *   maratona   6 criaturas · 8 Avanços cada (o teto da stamina: 8 × 23 <= 192)
 *
 * Sete dias, sementes fixas: o resultado é DETERMINÍSTICO, e a suíte compara
 * byte a byte com a fixture. Mudou a economia de propósito → `--gerar
 * --so=emissao-idle`, com o número velho e o novo na mensagem do commit. Mudou
 * sem querer → vermelho. É a regra das fixtures de medição (margem.json).
 *
 * E a outra metade do aceite: todo recurso que aparece no mapa tem, em
 * `TETOS`, OU o limite que o segura OU a justificativa de não ter — escrita. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as A from '../app/modules/avanco-estado.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { DIAS_DE_FARM } from '../engine/estilhaco.mjs';

const ARQ = new URL('./fixtures/emissao-idle.json', import.meta.url);
const H = 3600e3, DIA = 24 * H, T0 = Date.UTC(2026, 8, 1, 3);   /* 00h de Brasília */
const DIAS = 7;

export const PERFIS = {
  casual:   { criaturas: 1, avancos: 2, vigilia: true },
  diario:   { criaturas: 3, avancos: 4, vigilia: true },
  maratona: { criaturas: 6, avancos: 8, vigilia: false },
};

/* O QUE SEGURA CADA RECURSO, escrito. A suíte cobra uma linha por recurso
   medido: recurso novo sem linha aqui é emissão sem ninguém ter pensado nela. */
export const TETOS = {
  encontros: 'TETO: 30 por dia + o bônus da coleção (MARCOS_ENCONTROS; o veterano medido tem 50), janela móvel (D-052, §P5) — e a run colhida pesa nele desde o ST-1.1',
  xp:        'sem teto próprio: a stamina (192/dia/criatura) e a curva de nível seguram',
  pokecoin:  'SEM TETO — medido aqui; decisão pendente (L-185, DEC-14)',
  essencia:  'SEM TETO — muito acima da calibragem do Estilhaço (23/dia); decisão pendente (L-185, DEC-14)',
  poke:      'sem teto: consumível, gasto no lance',
  great:     'sem teto: consumível, gasto no lance',
  ultra:     'sem teto: consumível, gasto no lance',
  estilhaco: 'partes de item: 1·2·3 por unidade de baú até o estágio 3 (ST-3.1); sete montam um item',
  item:      'item inteiro só no estágio 4 (ST-3.1)',
};

const chaveDoRecurso = k => (k.startsWith('est:') ? 'estilhaco' : (TETOS[k] ? k : 'item'));

function umPerfil(nome, p, estagio) {
  const e = D.VAZIO();
  /* SEMENTES FIXAS nas criaturas: a inicial "escolhida" sorteia potencial, e um
     sorteio aqui tornaria a fixture impossível de comparar. */
  const doPack = (kanto.especies ?? []).slice(0, p.criaturas);
  for (const x of doPack)
    e.criaturas.push(D.criarCriatura(kanto, x.dex, 'captura', T0, String(x.dex).padStart(12, 'e') + 'm0'));
  /* O VETERANO do estágio 3 tem a coleção que abre o estágio; o do 1 não. */
  if (estagio > 1) {
    for (const c of e.criaturas) c.xp = 9_999_999;
    e.registro = Object.fromEntries((kanto.especies ?? []).map(x => [x.dex, 3]));
  }
  const antes = { ...e.bolsa };
  const xp0 = e.criaturas.reduce((a, c) => a + (c.xp || 0), 0);
  let runs = 0, vigilias = 0, recusadas = 0, encontros = 0;
  for (let d = 0; d < DIAS; d++) {
    let agora = T0 + d * DIA;
    const [primeira, ...resto] = e.criaturas;
    /* A VIGÍLIA PODE SER RECUSADA PELO TETO — e isso é dado, não erro: os
       Avanços da véspera ainda pesam na janela móvel (ST-1.1). O mapa conta. */
    if (p.vigilia) {
      if (D.cabeExpedicao(D.estadoDoTeto(e, agora, kanto), 'vigilia', 1)) {
        const x = D.iniciarExpedicao(e, { pack: kanto, bioma: 'campo', perfil: 'vigilia',
                                          equipe: [primeira.id], agora, estagio });
        D.colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `${nome}:${estagio}:v${d}` });
        encontros += x.encontros ?? 0;
        vigilias++;
      } else recusadas++;
    }
    agora += 9 * H;
    const quem = p.vigilia && resto.length ? resto : e.criaturas;
    for (let r = 0; r < p.avancos; r++) for (const c of quem) {
      const raiz = `${nome}:${estagio}:${d}:${r}:${c.dex}`;
      if (A.porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora })) continue;
      A.comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora, raiz });
      agora += 20 * 60e3;
      A.sincronizar(e, { pack: kanto, agora });
      const run = A.colherAvancoDaRun(e, { pack: kanto, agora, raiz: raiz + ':c' });
      encontros += run.encontros ?? 0;
      e.encontros = [];          /* o quadro da run some ao começar outra (L-166) */
      runs++;
    }
  }
  const porDia = {};
  for (const [k, v] of Object.entries(e.bolsa)) {
    const dd = v - (antes[k] ?? 0);
    if (!dd) continue;
    const r = chaveDoRecurso(k);
    porDia[r] = +((porDia[r] ?? 0) + dd / DIAS).toFixed(2);
  }
  porDia.xp = +((e.criaturas.reduce((a, c) => a + (c.xp || 0), 0) - xp0) / DIAS).toFixed(1);
  porDia.encontros = +(encontros / DIAS).toFixed(2);
  return { runsPorDia: +(runs / DIAS).toFixed(2), vigiliasPorDia: +(vigilias / DIAS).toFixed(2),
           vigiliasRecusadasPeloTeto: recusadas, porDia };
}

export function medir() {
  const fora = { dias: DIAS, perfis: {} };
  for (const [nome, p] of Object.entries(PERFIS))
    fora.perfis[nome] = { estagio1: umPerfil(nome, p, 1), estagio3: umPerfil(nome, p, 3) };
  return fora;
}

export function gerar() {
  const m = medir();
  writeFileSync(ARQ, JSON.stringify(m, null, 1) + '\n');
  return m;
}

export function suite() {
  const s = criarSuite('emissao-idle');

  s.teste('o mapa de emissão existe, e é o que o motor produz hoje', () => {
    ok(existsSync(ARQ), 'sem test/fixtures/emissao-idle.json — rode node test/run.mjs --gerar --so=emissao-idle');
    const guardado = JSON.parse(readFileSync(ARQ, 'utf8'));
    const agora = medir();
    igual(JSON.stringify(agora), JSON.stringify(guardado),
      'A EMISSÃO DO IDLE MUDOU. Se foi de propósito, regrave (--gerar --so=emissao-idle) e ' +
      'ponha o número velho e o novo na mensagem do commit; se não foi, é regressão de economia');
  });

  s.teste('todo recurso medido tem teto ou justificativa escritos', () => {
    const guardado = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : medir();
    const vistos = new Set();
    for (const p of Object.values(guardado.perfis))
      for (const est of Object.values(p)) for (const k of Object.keys(est.porDia)) vistos.add(k);
    const semLinha = [...vistos].filter(k => !TETOS[k]);
    igual(semLinha.join(', '), '',
      'recurso emitido sem ninguém ter escrito o que o segura — é o REV-14 voltando');
  });

  s.teste('o mapa é determinístico — duas medições dão o mesmo número', () => {
    igual(JSON.stringify(umPerfil('casual', PERFIS.casual, 1)),
          JSON.stringify(umPerfil('casual', PERFIS.casual, 1)),
      'duas medições iguais deram números diferentes: há sorteio fora das sementes');
  });

  /* O ACHADO, travado: a curva do Estilhaço foi calibrada com 23 de Essência
     por DIA (DIAS_DE_FARM). O Avanço emite muito mais. Este teste AFIRMA o
     achado de propósito — fica vermelho no dia em que a emissão for
     recalibrada, e aí a L-185 e a DEC-14 fecham. */
  s.teste('L-185 (afirma o achado): o maratona tira mais de 3× a Essência calibrada', () => {
    const guardado = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : medir();
    const ess = guardado.perfis.maratona.estagio1.porDia.essencia ?? 0;
    ok(ess > 3 * DIAS_DE_FARM.ESSENCIA_POR_DIA,
      `o maratona tira ${ess}/dia contra ${DIAS_DE_FARM.ESSENCIA_POR_DIA} calibrados — se a emissão foi ` +
      'recalibrada, feche a L-185 e inverta este teste');
  });

  return s;
}
