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
import { TETO_APOSTAS_COM_DOCE, DOCE_VITORIA, XP_POR_DOCE } from '../engine/doce.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as A from '../app/modules/avanco-estado.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { DIAS_DE_FARM } from '../engine/estilhaco.mjs';
import { fatorDoRendimento, runsNoDia, diaDoMundo, comRendimento, falaDoRendimento,
         FUSO_DO_RENDIMENTO_MIN, RUNS_CHEIAS, PISO_DO_RENDIMENTO } from '../engine/avanco.mjs';
import { FUSO_DO_MUNDO_MIN } from '../app/modules/hora-do-dia.mjs';
import { recompensaPve, PVE, tipoDoNo } from '../engine/recompensa-pve.mjs';
import { chanceDe } from '../engine/captura.mjs';

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
  xpDoce:    'TETO: 10 apostas com doce por dia × 3 × XP_POR_DOCE — no máximo 25% do XP diário do casual (ST-9.10)',
  pokecoin:  'rendimento decrescente por run no dia do mundo: 6 cheias, depois ×0,75 por run, piso de 5% (ST-3.6, DEC-14)',
  essencia:  'o mesmo rendimento decrescente da moeda (ST-3.6, DEC-14); o maratona caiu de 8,7× para ~2,5× a calibragem',
  poke:      'sem teto: consumível, gasto no lance',
  great:     'sem teto: consumível, gasto no lance',
  ultra:     'sem teto: consumível, gasto no lance',
  estilhaco: 'partes de item: 1·2·3 por unidade de baú até o estágio 3 (ST-3.1); sete montam um item',
  item:      'item inteiro só no estágio 4 (ST-3.1)',
};

const chaveDoRecurso = k => (k.startsWith('est:') ? 'estilhaco' : (TETOS[k] ? k : 'item'));

/* `lancar` (ST-13.6): o mesmo dia, com a bola jogada em cada encontro — a
   melhor que a bolsa tiver com chance. É a medição da BANDA de captura (L-197),
   e fica fora da fixture de emissão, que mede o que ENTRA, e não o que sobra. */
const BOLAS_DA_MELHOR = ['ultra', 'great', 'poke'];
/* A CAPTURA ESPERADA, e não a sorteada: a soma das chances de cada lance, com
   a bola gasta como no jogo. O lance do aparelho deriva a raiz da chave do
   encontro, e a chave carrega o id da expedição — que o aparelho sorteia com
   `Math.random`. Medir pelo sorteio deu 5,86, 5,43 e 5,00 em três execuções;
   a esperança é o número, sem o ruído. */
function lancarTudo(e) {
  let n = 0;
  for (const en of e.encontros) {
    const bola = BOLAS_DA_MELHOR.find(b => (e.bolsa[b] ?? 0) > 0 && chanceDe(kanto, { raridade: en.raridade, bola: b }));
    if (!bola) continue;
    n += chanceDe(kanto, { raridade: en.raridade, bola });
    e.bolsa[bola] -= 1;
  }
  e.encontros = [];
  return n;
}

export function umPerfil(nome, p, estagio, { lancar = false } = {}) {
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
  let runs = 0, vigilias = 0, recusadas = 0, encontros = 0, capturas = 0;
  /* Os que JOGAM são os do começo: a captura aumenta a caixa, e quem chegou
     não entra na rotina — senão o maratona com lances rodaria mais runs. */
  const iniciais = [...e.criaturas];
  for (let d = 0; d < DIAS; d++) {
    let agora = T0 + d * DIA;
    const [primeira, ...resto] = iniciais;
    /* A VIGÍLIA PODE SER RECUSADA PELO TETO — e isso é dado, não erro: os
       Avanços da véspera ainda pesam na janela móvel (ST-1.1). O mapa conta. */
    if (p.vigilia) {
      if (D.cabeExpedicao(D.estadoDoTeto(e, agora, kanto), 'vigilia', 1)) {
        const x = D.iniciarExpedicao(e, { pack: kanto, bioma: 'campo', perfil: 'vigilia',
                                          equipe: [primeira.id], agora, estagio });
        D.colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `${nome}:${estagio}:v${d}` });
        encontros += x.encontros ?? 0;
        if (lancar) capturas += lancarTudo(e);
        vigilias++;
      } else recusadas++;
    }
    agora += 9 * H;
    const quem = p.vigilia && resto.length ? resto : iniciais;
    for (let r = 0; r < p.avancos; r++) for (const c of quem) {
      const raiz = `${nome}:${estagio}:${d}:${r}:${c.dex}`;
      if (A.porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora })) continue;
      A.comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora, raiz });
      agora += 20 * 60e3;
      A.sincronizar(e, { pack: kanto, agora });
      const run = A.colherAvancoDaRun(e, { pack: kanto, agora, raiz: raiz + ':c' });
      encontros += run.encontros ?? 0;
      if (lancar) capturas += lancarTudo(e);
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
  /* A COLUNA DO DOCE (ST-9.10): o XP que o doce pode dar num dia, no teto —
     10 apostas × 3 doces × XP_POR_DOCE. Igual em todo perfil: o doce vem da
     aposta, e não do idle. */
  porDia.xpDoce = TETO_APOSTAS_COM_DOCE * DOCE_VITORIA * XP_POR_DOCE;
  if (lancar) return { capturasPorDia: +(capturas / DIAS).toFixed(2), encontrosPorDia: porDia.encontros };
  return { runsPorDia: +(runs / DIAS).toFixed(2), vigiliasPorDia: +(vigilias / DIAS).toFixed(2),
           vigiliasRecusadasPeloTeto: recusadas, porDia };
}

/* ── A COLUNA PvE (ST-10.17) ───────────────────────────────────────────────
   O que a jornada paga por dia, pelo MOTOR da recompensa (`recompensaPve`),
   com a jornada já vencida: só repetição — a primeira vitória de cada nó paga
   uma vez na vida do save, e fica medida à parte (`primeiraVezInteira`).
   Quantas lutas cada perfil repete por dia, e em quantos nós distintos: */
export const PERFIS_PVE = {
  casual:   { lutas: 3, nos: 1 },
  diario:   { lutas: 10, nos: 3 },
  maratona: { lutas: 100, nos: 8 },
};
function colunaPve() {
  const col = {};
  for (const [nome, p] of Object.entries(PERFIS_PVE)) {
    let hoje = null, soma = 0;
    for (let d = 0; d < DIAS; d++) for (let k = 0; k < p.lutas; k++) {
      const r = recompensaPve({ no: { id: `n${k % p.nos}`, ginasio: k % p.nos === p.nos - 1 && p.nos > 1 }, venceu: true, primeiraVez: false, dia: d, hoje, linhas: [] });
      hoje = r.hoje; soma += r.pokecoin;
    }
    col[nome] = { lutasPorDia: p.lutas, nosDistintos: p.nos, pokecoinPorDia: +(soma / DIAS).toFixed(2) };
  }
  const nos = kanto.jornada ?? [];
  col.primeiraVezInteira = { nos: nos.length, ginasios: nos.filter(n => n.insignia).length, chefes: nos.filter(n => n.chefe).length,
    ligas: nos.filter(n => n.liga).length, pokecoin: nos.reduce((a, n) => a + PVE.PRIMEIRA[tipoDoNo(n)], 0) };
  return col;
}

export function medir() {
  const fora = { dias: DIAS, perfis: {} };
  for (const [nome, p] of Object.entries(PERFIS))
    fora.perfis[nome] = { estagio1: umPerfil(nome, p, 1), estagio3: umPerfil(nome, p, 3) };
  fora.pve = colunaPve();
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

  /* A coluna PvE tem o teto escrito, e ele segura: nenhum perfil tira mais
     que o teto diário, e nem o maratona passa de 15% do que o casual colhe
     no idle — repetir nó ajuda, e não vira a fonte principal. */
  s.teste('ST-10.17: a coluna PvE do mapa — o teto diário segura todo perfil', () => {
    const guardado = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : medir();
    ok(guardado.pve, 'o mapa de emissão não tem a coluna PvE');
    const casualIdle = guardado.perfis.casual.estagio1.porDia.pokecoin;
    for (const nome of Object.keys(PERFIS_PVE)) {
      const v = guardado.pve[nome].pokecoinPorDia;
      ok(v <= PVE.TETO_DIARIO, `${nome}: o PvE paga ${v}/dia, o teto é ${PVE.TETO_DIARIO}`);
      ok(v <= 0.15 * casualIdle, `${nome}: o PvE paga ${v}/dia, mais de 15% dos ${casualIdle} do casual no idle`);
    }
    ok(guardado.pve.maratona.pokecoinPorDia === PVE.TETO_DIARIO, 'o maratona não bate no teto — as 100 lutas não foram medidas');
  });

  s.teste('o mapa é determinístico — duas medições dão o mesmo número', () => {
    igual(JSON.stringify(umPerfil('casual', PERFIS.casual, 1)),
          JSON.stringify(umPerfil('casual', PERFIS.casual, 1)),
      'duas medições iguais deram números diferentes: há sorteio fora das sementes');
  });

  /* ── A L-185 FECHADA (ST-3.6, DEC-14) ─────────────────────────────────
     O teste que AFIRMAVA o achado (maratona > 3× a Essência calibrada) foi
     invertido: medido em 25/09, o maratona foi de 199,6 para ~57 por dia
     (8,7× → 2,5× os 23 calibrados), o diário de 40 para ~37, e o casual não
     mudou um centésimo. */
  s.teste('ST-3.6: o maratona fica abaixo de 3× a Essência calibrada, e o diário abaixo de 2×', () => {
    const guardado = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : medir();
    const cal = DIAS_DE_FARM.ESSENCIA_POR_DIA;
    for (const est of ['estagio1', 'estagio3']) {
      const m = guardado.perfis.maratona[est].porDia.essencia ?? 0;
      const d = guardado.perfis.diario[est].porDia.essencia ?? 0;
      ok(m < 3 * cal, `o maratona (${est}) tira ${m}/dia contra ${cal} calibrados — o rendimento não morde`);
      ok(d < 2 * cal, `o diário (${est}) tira ${d}/dia contra ${cal} calibrados`);
    }
  });

  s.teste('ST-3.6: as primeiras runs do dia pagam inteiras — o casual não sente nada', () => {
    for (let n = 1; n <= RUNS_CHEIAS; n++) igual(fatorDoRendimento(n), 1, `a ${n}ª run do dia já perdeu rendimento`);
    ok(fatorDoRendimento(RUNS_CHEIAS + 1) < 1, 'a run além das cheias pagou inteira — não há rendimento decrescente');
    for (let n = RUNS_CHEIAS + 1; n < 60; n++)
      ok(fatorDoRendimento(n + 1) <= fatorDoRendimento(n), `o rendimento SUBIU da ${n}ª para a ${n + 1}ª run`);
    ok(PISO_DO_RENDIMENTO > 0 && fatorDoRendimento(1000) === PISO_DO_RENDIMENTO,
      'a run tardia não para no piso — run que não paga nada ensina a não jogar');
    ok(PERFIS.casual.avancos * PERFIS.casual.criaturas <= RUNS_CHEIAS,
      'o perfil casual passou do número de runs cheias — a DEC-14 prometeu que ele não sente');
  });

  s.teste('ST-3.6: o dia é o do calendário em Brasília — a regularidade não é punida', () => {
    igual(FUSO_DO_RENDIMENTO_MIN, FUSO_DO_MUNDO_MIN, 'o motor e a tela discordam sobre o fuso do mundo');
    const meiaNoite = Date.UTC(2026, 8, 2, 3);          // 00h de Brasília
    igual(diaDoMundo(meiaNoite - 60000) + 1, diaDoMundo(meiaNoite + 60000), '23h59 e 00h01 caíram no mesmo dia');
    /* Ontem no MESMO horário não conta hoje — era o defeito da janela móvel. */
    const ontem = [{ colhidaEm: meiaNoite + 9 * 3600e3 - 86400e3 }, { colhidaEm: meiaNoite + 9.3 * 3600e3 - 86400e3 }];
    igual(runsNoDia(ontem, meiaNoite + 9 * 3600e3), 0, 'as runs de ontem, no mesmo horário, contaram hoje');
    igual(runsNoDia([{ colhidaEm: meiaNoite + 60000 }], meiaNoite + 3600e3), 1, 'a run de hoje não contou');
  });

  s.teste('ST-3.6: o arredondamento semeado guarda a média, e a tela avisa antes', () => {
    let soma = 0;
    for (let i = 0; i < 1000; i++) soma += comRendimento(1, 0.3, i / 1000);
    igual(soma, 300, 'o arredondamento não guarda a média — 1 × 0,3 em mil runs devia somar 300');
    /* DEC-29c: a frase leva o time (o dia do time); três, como o diário. */
    igual(falaDoRendimento(RUNS_CHEIAS, 3), null, 'a tela avisou de rendimento numa run que paga inteira');
    ok(/7ª run de hoje/.test(falaDoRendimento(RUNS_CHEIAS + 1, 3) ?? '') && /75%/.test(falaDoRendimento(RUNS_CHEIAS + 1, 3)),
      `a frase não diz a posição e a porcentagem: ${falaDoRendimento(RUNS_CHEIAS + 1, 3)}`);
    ok(/falaDoRendimento\(runsNoDia\(/.test(readFileSync(new URL('../app/modules/avanco-tela.mjs', import.meta.url), 'utf8')),
      'a tela não mostra o rendimento antes da run — ele cairia sem aviso');
  });

  /* D-151 — AFIRMADO DE PROPÓSITO. Os perfis guardam as runs por dia de quando
     a stamina regenerava 8/h (192/dia/criatura → 8 runs). Desde a DEC-24 (20/h)
     e a DEC-29 (30/h) o teto real é outro, e esta medição não vê a regeneração:
     a DEC-29 passou com a fixture intocada. Fica VERMELHO quando a ST-2.27
     derivar as runs do motor — aí este teste vira o que afirma o conserto. */
  s.teste('D-151 (afirmado de propósito): o maratona ainda mede 8 runs por criatura, de quando a stamina era 8/h', async () => {
    const { REGEN_POR_HORA } = await import('../engine/expedicao.mjs');
    const { STAMINA_DO_AVANCO } = await import('../engine/avanco.mjs');
    igual(PERFIS.maratona.avancos, 8, 'D-151 consertado? a medição passou a derivar as runs — atualize o teste e o DEFEITOS');
    ok(Math.floor(24 * REGEN_POR_HORA / STAMINA_DO_AVANCO) > PERFIS.maratona.avancos, 'a regeneração voltou a caber em 8 runs');
  });

  return s;
}
