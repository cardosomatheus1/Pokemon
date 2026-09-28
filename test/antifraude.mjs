/* Q1/Q4/Q6/Q9 · A ANTIFRAUDE MÍNIMA DA CAPTURA (ST-13.6 · Spec §7.19, §7.21 · L-050, L-197)
 *
 * Fixture de MEDIÇÃO (`test/fixtures/antifraude.json`), como a de emissão:
 *
 *   a BANDA de captura — capturas por jogador-dia, pela simulação do idle com a
 *   bola jogada em todo encontro (o mesmo simulador da fixture de emissão)
 *   a TAXA DE DETECÇÃO do detector de horário, com fraude PLANTADA numa
 *   população semeada: 60 jogadores normais, 10 casais que jogam na mesma
 *   rotina (o falso positivo que importa) e 8 fazendas de três contas, em três
 *   graus de rajada — e o falso positivo, que tem de ser zero
 *
 * E o servidor: a varredura registra a suspeita com o número que a sustenta,
 * uma vez por par, nunca pune, e não acusa quem o operador já ligou.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { semente } from '../engine/instancia.mjs';
import { derivar } from '../engine/seed.mjs';
import { suspeitas, coincidencias, capturaNaBanda, BANDA_DE_CAPTURA, DETECTOR, DETECCAO_MEDIDA } from '../engine/antifraude.mjs';
import { umPerfil, PERFIS } from './emissao-idle.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar as gerarCriatura } from '../server/criaturas.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { varrerSuspeitas, suspeitasAbertas } from '../server/antifraude.mjs';
import { relatorioDoPiloto } from '../server/piloto.mjs';
import { lancarBola } from '../app/modules/idle-lance.mjs';
import PACK from '../content/escolhido.mjs';

const ARQ = new URL('./fixtures/antifraude.json', import.meta.url);
const DIA = 86400e3, H = 3600e3, MIN = 60e3;
export const RAJADAS = [0.8, 0.5, 0.3];
const RAIZES = ['a', 'b', 'c', 'd', 'e'];

/* A POPULAÇÃO SEMEADA. A fazenda: a primeira conta age; as outras seguem, 80%
   das vezes, em RAJADA (5–40 s depois) com a probabilidade `rajada`, e com
   folga (1–20 min) no resto. O casal: duas pessoas de verdade na mesma rotina
   (8h, 13h, 21h), cada uma com ±10 min de desvio. */
export function populacao(raiz, { rajada, dias = 7 } = {}) {
  const r = semente(derivar(raiz, 'antifraude:populacao'));
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return u - 3; };
  const contas = [];
  for (let i = 0; i < 60; i++) {
    const t = [];
    for (let d = 0; d < dias; d++) { const k = 3 + Math.floor(r() * 8); for (let j = 0; j < k; j++) t.push(d * DIA + 7 * H + r() * 16 * H); }
    contas.push({ user: `n${i}`, tempos: t, grupo: null, tipo: 'normal' });
  }
  for (let c = 0; c < 10; c++) {
    const a = [], b = [];
    for (let d = 0; d < dias; d++) for (const ancora of [8, 13, 21]) {
      const t0 = d * DIA + ancora * H;
      for (let j = 0; j < 2; j++) { a.push(t0 + gauss() * 10 * MIN); b.push(t0 + gauss() * 10 * MIN); }
    }
    contas.push({ user: `c${c}a`, tempos: a, grupo: `c${c}`, tipo: 'casal' }, { user: `c${c}b`, tempos: b, grupo: `c${c}`, tipo: 'casal' });
  }
  for (let f = 0; f < 8; f++) {
    const ts = [[], [], []];
    for (let d = 0; d < dias; d++) {
      const k = 3 + Math.floor(r() * 8);
      for (let j = 0; j < k; j++) {
        const t = d * DIA + 7 * H + r() * 16 * H;
        ts.forEach((l, c) => { if (c === 0) l.push(t); else if (r() < 0.8) l.push(t + (r() < rajada ? 5000 + r() * 35000 : MIN + r() * 20 * MIN)); });
      }
    }
    ts.forEach((tempos, c) => contas.push({ user: `f${f}c${c}`, tempos, grupo: `f${f}`, tipo: 'fazenda' }));
  }
  return contas;
}

function deteccao(rajada) {
  let tp = 0, casais = 0, outros = 0, pares = 0, paresFazenda = 0;
  for (const raiz of RAIZES) {
    const pop = populacao(raiz, { rajada });
    const g = Object.fromEntries(pop.map(c => [c.user, c]));
    for (const x of suspeitas(pop)) {
      const [A, B] = [g[x.a], g[x.b]];
      if (A.grupo && A.grupo === B.grupo && A.tipo === 'fazenda') tp++;
      else if (A.grupo && A.grupo === B.grupo) casais++;
      else outros++;
    }
    paresFazenda += 8 * 3; pares += pop.length * (pop.length - 1) / 2 - 8 * 3;
  }
  return { rajada, deteccao: +(tp / paresFazenda).toFixed(3), falsoPositivo: +((casais + outros) / pares).toFixed(6), casaisAcusados: casais };
}

export function medir() {
  const banda = {};
  for (const [nome, p] of Object.entries(PERFIS))
    banda[nome] = { estagio1: umPerfil(nome, p, 1, { lancar: true }), estagio3: umPerfil(nome, p, 3, { lancar: true }) };
  return { banda, detector: DETECTOR, deteccao: RAJADAS.map(deteccao) };
}
export function gerar() {
  const m = medir();
  writeFileSync(ARQ, JSON.stringify(m, null, 1) + '\n');
  return m;
}

export function suite() {
  const s = criarSuite('antifraude');
  const guardado = () => JSON.parse(readFileSync(ARQ, 'utf8'));

  s.teste('a medição existe, e é o que o motor produz hoje', () => {
    ok(existsSync(ARQ), 'sem test/fixtures/antifraude.json — rode node test/run.mjs --gerar --so=antifraude');
    igual(JSON.stringify(medir()), JSON.stringify(guardado()),
      'A MEDIÇÃO DA ANTIFRAUDE MUDOU. Se foi de propósito, regrave e ponha o velho e o novo no commit');
  });

  s.teste('a banda do motor sai da medição (L-197): meio abaixo do menor, um quarto acima do maior', () => {
    const v = Object.values(guardado().banda).flatMap(p => Object.values(p).map(e => e.capturasPorDia));
    igual(BANDA_DE_CAPTURA.min, Math.floor(Math.min(...v) * 0.5 * 10) / 10, 'o piso da banda');
    igual(BANDA_DE_CAPTURA.max, Math.ceil(Math.max(...v) * 1.25 * 10) / 10, 'o teto da banda');
    for (const x of v) ok(x >= BANDA_DE_CAPTURA.min && x <= BANDA_DE_CAPTURA.max, `um perfil medido (${x}) fora da própria banda`);
  });

  s.teste('a taxa de detecção é CONHECIDA e o motor a declara; nenhum casal nem jogador normal acusado', () => {
    const d = guardado().deteccao;
    const medida = { ...Object.fromEntries(d.map(x => [`rajada${Math.round(x.rajada * 100)}`, x.deteccao])),
                     falsoPositivo: Math.max(...d.map(x => x.falsoPositivo)) };
    igual(JSON.stringify(DETECCAO_MEDIDA), JSON.stringify(medida), 'a taxa que o motor declara não é a medida');
    for (const x of d) { igual(x.falsoPositivo, 0, `falso positivo na rajada ${x.rajada}`); igual(x.casaisAcusados, 0, 'casal acusado'); }
    ok(d.find(x => x.rajada === 0.8).deteccao >= 0.9, 'a fazenda em rajada escapa ao detector');
  });

  s.teste('as peças do detector: coincidências, a fração da conta menor, e a banda por conta', () => {
    igual(coincidencias([0, 100_000, 200_000], [30_000, 500_000]), 1, 'coincidência na janela');
    igual(coincidencias([0], [61_000]), 0, 'fora da janela contou');
    const muitas = Array.from({ length: 20 }, (_, i) => i * H);
    igual(suspeitas([{ user: 'a', tempos: muitas }, { user: 'b', tempos: muitas.map(t => t + 10_000) }]).length, 1, 'o par em rajada');
    igual(suspeitas([{ user: 'a', tempos: muitas.slice(0, 11) }, { user: 'b', tempos: muitas.slice(0, 11) }]).length, 0, 'onze coincidências acusaram');
    const muitoAtiva = Array.from({ length: 2000 }, (_, i) => i * 30_000);
    igual(suspeitas([{ user: 'a', tempos: muitoAtiva }, { user: 'b', tempos: muitas.concat(muitas.map(t => t + 3 * H)) }]).length, 1,
      'a conta muito ativa coincide em número com todo mundo — e a fração da MENOR decide');
    ok(capturaNaBanda({ capturas: 30 * 7, dias: 7 }).acima, 'trinta por dia não está acima da banda');
    ok(!capturaNaBanda({ capturas: 10 * 7, dias: 7 }).acima, 'dez por dia está acima da banda');
  });

  s.teste('o servidor: a suspeita fica registrada com o número, uma vez por par; o ligado pelo operador não é acusado; nada é punido', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const T0 = Date.UTC(2026, 8, 20, 10);
    const u = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const [a, b, c, d, e] = ['farmA', 'farmB', 'honesto', 'ligadoA', 'ligadoB'].map(u);
    const acao = (user, t) => db.prepare(`INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json, custo, iniciada_em, termina_em, colhida_em, semente, encontros)
                                          VALUES (?, ?, 'p', 'floresta', 'batida', '[]', 0, ?, ?, ?, 'x', 0)`).run(`${user}-${t}`, user, t, t + 1, t + 1);
    for (let k = 0; k < 20; k++) {
      const t = T0 + k * 5 * H;
      acao(a, t); acao(b, t + 15_000); acao(d, t + 3 * H); acao(e, t + 3 * H + 8_000);
      acao(c, T0 + k * 5 * H + 2 * H + k * 997);
    }
    ligarContas(db, { userId: d, outroId: e, sinal: 'dispositivo', agora: T0 });
    /* e a captura acima da banda: 150 capturas em cinco dias ativos, 30 por dia */
    for (let k = 0; k < 150; k++) { const x = gerarCriatura(db, { userId: c, pack: PACK, dex: 16 }); db.prepare(`UPDATE criaturas SET criada_em = ? WHERE id = ?`).run(T0 + 90 * H, x.id); }
    const agora = T0 + 100 * H;
    /* O RELATÓRIO VARRE — é por ele que o operador vê (nunca silenciosa); a
       primeira versão deste teste varria antes e o S1661 passou. */
    const rel = relatorioDoPiloto(db, { agora });
    igual(rel.antifraude.abertas.length, 2, 'o relatório do piloto não varreu nem mostrou as suspeitas');
    const r = rel.antifraude;
    const abertas = suspeitasAbertas(db);
    igual(abertas.length, 2, `as suspeitas: ${JSON.stringify(abertas)}`);
    const par = abertas.find(x => x.sinal === 'horario');
    igual([par.conta_a, par.conta_b].sort().join(), [a, b].sort().join(), 'o par suspeito');
    ok(JSON.parse(par.medida_json).coincidem >= 12, 'a suspeita sem o número que a sustenta');
    ok(abertas.some(x => x.sinal === 'captura' && x.conta_a === c), 'a captura acima da banda não foi registrada');
    igual(r.novas, 2, 'a varredura não disse quantas novas');
    varrerSuspeitas(db, { agora: agora + H });
    igual(suspeitasAbertas(db).length, 2, 'a segunda varredura duplicou');
    igual(db.prepare(`SELECT COUNT(*) AS n FROM identidade_ligada`).get().n, 1, 'a varredura ligou contas sozinha — é o operador quem decide');

  });

  /* ── D-129 (afirma o defeito) ─────────────────────────────────────────
     Achado ao medir a banda: o lance do aparelho faz `Number(semente)` da
     colheita, e a semente é texto hexadecimal — sempre NaN, e a raiz de todo
     lance vira a mesma, qualquer que seja a colheita. Fica vermelho quando a
     ST-13.5 consertar. */
  s.teste('D-129 (afirma o defeito): o lance do aparelho ignora a semente da colheita', () => {
    const padrao = semente => Array.from({ length: 40 }, (_, i) => {
      const e = { encontros: [{ chave: `x:${i}`, expedicao: 'x', dex: 16, raridade: 'comum' }], bolsa: { poke: 1 },
                  expedicoes: [{ id: 'x', semente }], criaturas: [] };
      return lancarBola(e, { pack: PACK, chave: `x:${i}`, bola: 'poke', agora: 0 }).capturou ? 1 : 0;
    }).join('');
    const [a, b] = [padrao('aa'.repeat(16)), padrao('bb'.repeat(16))];
    ok(a.includes('1') && a.includes('0'), 'o lance não varia nem entre encontros — o teste não mede nada');
    igual(a, b, 'D-129 consertado? duas colheitas diferentes deram lances diferentes');
  });

  return s;
}
