/* Q1/Q3 · A APOSTA MUDA QUEM APARECE NAS ROTAS (ST-9.6 · F3.8 · Spec §7.3)
 *
 * `pesoComBonus` existia desde o 1.2 e ninguém o chamava. Religado: apostar
 * numa espécie deixa a LINHA dela ×4 mais pesada no sorteio de encontro por
 * 6 h — sem mudar quantos encontros há, sem mudar a chance de captura, e
 * igual para 50 ou 5.000.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { sortearEncontros, previaDeEncontros, pesosDoSorteio, elencoDoEstagio } from '../engine/expedicao.mjs';
import { viesFinal } from '../engine/estagios.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import { DURACAO_BONUS_MS, PESO_APOSTADA } from '../engine/captura.mjs';
import { baseDe } from '../engine/evolucao.mjs';
import { semente } from '../engine/instancia.mjs';
import { derivarIndice } from '../engine/seed.mjs';
import { bonusDaAposta, registrarBonus, carregarBonus, CHAVE_BONUS } from '../app/modules/bonus-arena.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { apostar } from '../server/aposta.mjs';
import { bonusDoServidor } from '../server/idle.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const BIOMA = 'floresta', PERFIL = 'trilha', T = Date.UTC(2026, 8, 1, 12);
/* A linha do Caterpie (10 → 11 → 12) mora na floresta desde o estágio 1. */
const CATERPIE = 10;

export async function suite() {
  const s = criarSuite('bonus-arena');

  s.teste('10.000 sorteios: a linha apostada sobe ~×4, e o total de encontros é idêntico', () => {
    const bonus = { linha: CATERPIE, ate: T + 1 };
    let sem = 0, com = 0, totalSem = 0, totalCom = 0;
    for (let i = 0; i < 10000; i++) {
      const a = sortearEncontros(semente(derivarIndice('bonus-arena', 'enc', i)), { pack, bioma: BIOMA, perfil: PERFIL });
      const b = sortearEncontros(semente(derivarIndice('bonus-arena', 'enc', i)), { pack, bioma: BIOMA, perfil: PERFIL, bonus, agora: T });
      totalSem += a.length; totalCom += b.length;
      igual(a.length, b.length, `sorteio ${i}: o bônus mudou QUANTOS encontros`);
      sem += a.filter(e => baseDe(pack, e.dex) === CATERPIE).length;
      com += b.filter(e => baseDe(pack, e.dex) === CATERPIE).length;
    }
    /* O esperado sai da prévia: com fatia p, a linha vira 4p/(1+3p). */
    const p = previaDeEncontros({ pack, bioma: BIOMA, perfil: PERFIL }).filter(e => baseDe(pack, e.dex) === CATERPIE)
      .reduce((a, e) => a + e.chance / 100, 0);
    const esperado = PESO_APOSTADA / (1 + (PESO_APOSTADA - 1) * p);
    ok(p > 0, 'a linha do Caterpie não mora na floresta — o teste não mede nada');
    ok(Math.abs(com / sem - esperado) / esperado < 0.1, `a linha subiu ×${(com / sem).toFixed(2)}, esperado ×${esperado.toFixed(2)}`);
    igual(totalCom, totalSem, 'o total de encontros mudou');
  });

  s.teste('×4 exato no peso, só na linha, e a prévia diz o mesmo que o sorteio', () => {
    const lista = elencoDoEstagio(pack, BIOMA, null, 1);
    const vies = viesFinal(PERFIS[PERFIL].vies, 1);
    const sem = pesosDoSorteio(pack, lista, vies), com = pesosDoSorteio(pack, lista, vies, { linha: CATERPIE, ate: T + 1 }, T);
    lista.forEach((e, i) => igual(com[i] / sem[i], baseDe(pack, e.dex) === CATERPIE ? PESO_APOSTADA : 1, `peso de ${e.dex}`));
    const previa = previaDeEncontros({ pack, bioma: BIOMA, perfil: PERFIL, bonus: { linha: CATERPIE, ate: T + 1 }, agora: T });
    const total = com.reduce((a, b) => a + b, 0);
    for (const e of previa) {
      const i = lista.findIndex(x => x.dex === e.dex);
      ok(Math.abs(e.chance - com[i] / total * 100) < 1e-9, `a prévia de ${e.dex} não é o peso do sorteio`);
      igual(e.daArena, baseDe(pack, e.dex) === CATERPIE, `${e.dex}: marca da Arena errada`);
    }
  });

  s.teste('expira em 6 h, e não acumula', () => {
    const d = deposito();
    registrarBonus(pack, 12, T, d);   // aposta no Butterfree: a linha é a do Caterpie
    const b = carregarBonus(d);
    igual(JSON.stringify(b), JSON.stringify({ linha: CATERPIE, ate: T + DURACAO_BONUS_MS }), 'o bônus não é da linha, por 6 h');
    const lista = elencoDoEstagio(pack, BIOMA, null, 1);
    const i = lista.findIndex(e => baseDe(pack, e.dex) === CATERPIE);
    const peso = agora => pesosDoSorteio(pack, lista, 0, carregarBonus(d), agora)[i] / pesosDoSorteio(pack, lista, 0)[i];
    igual(peso(T + DURACAO_BONUS_MS - 1), PESO_APOSTADA, 'o bônus acabou antes das 6 h');
    igual(peso(T + DURACAO_BONUS_MS), 1, 'o bônus passou das 6 h');
    /* Apostar de novo na mesma linha recomeça as 6 h — não soma 12, e o peso
       continua ×4, não ×16. */
    registrarBonus(pack, CATERPIE, T + 3600_000, d);
    igual(carregarBonus(d).ate, T + 3600_000 + DURACAO_BONUS_MS, 'a segunda aposta somou as horas');
    igual(peso(T + 3600_000), PESO_APOSTADA, 'o peso acumulou');
    /* E uma aposta em OUTRA linha substitui: um bônus por vez. */
    registrarBonus(pack, 1, T + 7200_000, d);
    igual(carregarBonus(d).linha, 1, 'a aposta nova não substituiu a anterior');
    d.setItem(CHAVE_BONUS, '{lixo');
    igual(carregarBonus(d), null, 'um bônus corrompido virou bônus');
  });

  s.teste('a escolha, nunca o tamanho: 50 e 5.000 dão o mesmo bônus — no cliente e no servidor', async () => {
    igual(bonusDaAposta.length, 3, 'o bônus passou a receber mais que (pack, dex, agora)');
    ok(!/valor|stake|odd/.test(semComentario(fonte('../app/modules/bonus-arena.mjs'))), 'o módulo do bônus lê valor');
    ok(/registrarBonus\(PACK, S\.fighters\[idx\]\.dex, Date\.now\(\)\);/.test(fonte('../app/modules/aposta.mjs')), 'a aposta não registra o bônus');
    const corpo = semComentario(fonte('../server/idle.mjs')).split('export function bonusDoServidor')[1].split('\n}')[0];
    ok(!/stake|odd|payout/.test(corpo), 'o bônus do servidor lê o tamanho da aposta');
    let t = T;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    try {
      const r = srv.sched.abrirRodada();
      /* O favorito: 5.000 nele cabe no teto por bilhete (§4.4.6). */
      const slot = srv.db.prepare(`SELECT slot FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(r.id).slot;
      const [a, b] = [50, 5000].map((valor, i) => {
        const id = cadastrar(srv.db, { username: `b${i}`, email: `b${i}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: t }).id;
        creditar(srv.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 10000, idem: `w${id}`, agora: t });
        apostar(srv.db, { sched: srv.sched, userId: id, slot, valor, agora: t });
        return bonusDoServidor(srv.db, id, pack);
      });
      const especie = srv.db.prepare(`SELECT species_id FROM bets LIMIT 1`).get().species_id;
      ok(a && a.linha === baseDe(pack, especie), `o bônus do servidor não é da linha apostada (${a?.linha} × ${especie})`);
      igual(JSON.stringify(a), JSON.stringify(b), '50 e 5.000 deram bônus diferentes');
      igual(a.ate, t + DURACAO_BONUS_MS, 'o bônus do servidor não dura 6 h');
    } finally { await srv.fechar(); }
  });

  s.teste('a colheita pesa o bônus; o teto e a captura não o recebem', () => {
    const colheita = semComentario(fonte('../app/modules/idle-colheita.mjs'));
    ok(/bonus = carregarBonus\(\)/.test(colheita) && /membros: quantosForam,\s*bonus, agora \}\)/.test(colheita), 'a colheita local não pesa o bônus');
    ok(/bonus: bonusDoServidor\(db, exp\.user_id, pack\), agora/.test(semComentario(fonte('../server/idle.mjs'))), 'a colheita do servidor não pesa o bônus');
    for (const f of ['../app/modules/idle-colheita.mjs', '../server/idle.mjs'])
      ok(!/(chanceDe|tentar|tetoDeEncontros)\([^)]*bonus/.test(semComentario(fonte(f))), `${f}: o bônus chegou à captura ou ao teto`);
    ok(/previaDeEncontros\(\{ pack: PACK, bioma, perfil, estagio, bonus, agora: Date\.now\(\) \}\)/.test(fonte('../app/modules/idle-estagios.mjs')),
      'a prévia da rota não mostra o bônus que a colheita vai pesar');
  });

  return s;
}
