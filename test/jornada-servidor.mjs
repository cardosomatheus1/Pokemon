/* Q1/Q3/Q6/Q9 · A LUTA DA JORNADA NO SERVIDOR (ST-13.7 · E13 · L-208)
 *
 * A AFIRMAÇÃO CENTRAL é de identidade: a mesma sequência de lutas, com as
 * mesmas sementes, no aparelho e no servidor, é aceita ou recusada com a MESMA
 * frase, sai com o mesmo vencedor, e deixa o mesmo progresso, a mesma bolsa e
 * o mesmo doce — inclusive o teto do dia do PvE, a repetição e a virada do
 * dia. E a chance que o servidor anota é a que a tela mostrou.
 *
 * Em volta dela, o que só o servidor tem: a chave do pedido (o reenvio não
 * luta de novo), a revisão (duas lutas ao mesmo tempo não pagam a primeira
 * vez duas vezes), os fatos da V4 com `origem: 'servidor'`, e o gate que
 * prefere o fato ao relato.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { bolsaDe } from '../server/idle.mjs';
import { trocarGolpeNaConta } from '../server/colecao.mjs';
import { lutarNaConta, jornadaDaConta, ERRO_JORNADA } from '../server/jornada.mjs';
import { docesDe } from '../server/doce.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { OPERACOES_DO_IDLE } from '../server/colecao-rotas.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { alternarGolpe, padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { idDaMoeda } from '../engine/economia-idle.mjs';
import { lutarNaJornadaLocal } from '../app/modules/jornada-local.mjs';
import { chanceDaLuta, contaDaLuta } from '../app/modules/jornada-conta.mjs';
import { entradasDoTime } from '../app/modules/treino-dados.mjs';
import { chanceDeVencer } from '../engine/treino-preco.mjs';
import { fatosDaJornada } from '../engine/gate-v4.mjs';
import { nosDa } from '../engine/jornada.mjs';
import { gateDaV4Servidor } from '../server/gate-v4.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 10);
const H = 3600_000;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

/* Sete criaturas nos dois lados: seis na equipe e uma na caixa (que não luta);
   o Charmander com um golpe tirado, para o moveset guardado lutar. */
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'jn', email: 'jn@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const e = D.VAZIO();
  const ids = [[4, 16], [7, 15], [1, 15], [25, 14], [16, 13], [19, 12], [6, 36]].map(([dex, nivel], i) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = ?, criada_em = ? WHERE id = ?`).run(xpParaNivel(nivel), i === 6 ? 1 : 0, T0 + i, c.id);
    e.criaturas.push({ id: c.id, dex, iv: c.iv, natureza: c.natureza.nome, exemplar: c.exemplar, xp: xpParaNivel(nivel), nivel: 1, vinculo: 0,
                       foco: null, stamina: 100, staminaEm: T0, origem: 'captura', criadaEm: T0 + i, naCaixa: i === 6 });
    return c.id;
  });
  const d = deposito();
  const tirar = padraoDoMoveset(PACK, 4, 16)[0];
  const r = alternarGolpe(PACK, D.hidratar(e.criaturas[0]), tirar);
  if (r.ok) { e.criaturas[0].golpes = r.golpes; trocarGolpeNaConta(db, { userId: u, pack: PACK, id: ids[0], nome: tirar }); }
  D.salvar(e, d);
  return { db, u, d, ids };
}

const lado = (c, e0) => {
  const e = D.carregar(c.d);
  const bolsa = Object.fromEntries(Object.entries(e.bolsa ?? {}).map(([k, n]) => [k, n - (e0.bolsa?.[k] ?? 0)]).filter(([, n]) => n));
  return { jornada: e.jornada, bolsa, doces: Object.fromEntries(Object.entries(e.doces ?? {}).filter(([, n]) => n > 0)) };
};
const doServidor = c => ({
  jornada: jornadaDaConta(c.db, c.u).jornada,
  bolsa: Object.fromEntries(bolsaDe(c.db, c.u).filter(b => b.quantidade).map(b => [b.item_id, b.quantidade])),
  doces: Object.fromEntries(Object.entries(docesDe(c.db, c.u)).map(([k, n]) => [String(k), n])),
});
const ordenado = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

/* A sequência: a rota, a mesma rota (repetição), fora de ordem, o caminho até
   o Brock, o Brock com outro preset, e a virada do dia. */
const SEQUENCIA = [
  { id: 'rota1', semente: 11, agora: T0 },
  { id: 'rota1', semente: 12, agora: T0 + H },
  { id: 'pewter', semente: 13, agora: T0 + H },
  { id: 'floresta', semente: 14, agora: T0 + 2 * H },
  { id: 'rota22', semente: 15, agora: T0 + 2 * H },
  { id: 'pedra', semente: 16, agora: T0 + 3 * H },
  { id: 'pewter', semente: 17, agora: T0 + 3 * H, preset: 'aggressive' },
  { id: 'pewter', semente: 18, agora: T0 + 4 * H, preset: 'defensive' },
  { id: 'rota1', semente: 19, agora: T0 + 4 * H },
  { id: 'floresta', semente: 20, agora: T0 + 4 * H },
  { id: 'rota1', semente: 21, agora: T0 + 30 * H },
  { id: 'nao-existe', semente: 22, agora: T0 + 30 * H },
];

export function suite() {
  const s = criarSuite('jornada-servidor');

  s.teste('a identidade: a mesma luta, a mesma frase, o mesmo progresso, bolsa e doce', () => {
    const c = cena(), e0 = D.carregar(c.d);
    let n = 0, venceu = 0;
    for (const [i, p] of SEQUENCIA.entries()) {
      const k = `luta-${String(i).padStart(4, '0')}`;
      const sv = (() => { try { return lutarNaConta(c.db, { userId: c.u, pack: PACK, id: p.id, preset: p.preset, chaveIdem: k, agora: p.agora, semente: p.semente }); }
                          catch (x) { return { ok: false, motivo: x.message }; } })();
      const ap = lutarNaJornadaLocal({ pack: PACK, id: p.id, preset: p.preset, semente: p.semente, agora: p.agora }, c.d);
      igual(sv.ok ? 'ok' : sv.motivo, ap.ok ? 'ok' : ap.motivo, `passo ${i} (${p.id}): a resposta`);
      if (sv.ok && ap.ok) {
        n++; if (sv.venceu) venceu++;
        igual(sv.vencedor, ap.resultado.vencedor, `passo ${i}: o vencedor`);
        igual(JSON.stringify(sv.timeA), JSON.stringify(ap.timeA), `passo ${i}: o time`);
        igual(`${sv.primeiraVez}|${sv.ganhouInsignia}`, `${ap.primeiraVez}|${ap.ganhouInsignia}`, `passo ${i}: primeira vez e insígnia`);
      }
      igual(ordenado(doServidor(c)), ordenado(lado(c, e0)), `passo ${i} (${p.id}): o estado`);
    }
    /* A sequência tem de ter exercido o que diz: vitórias, uma derrota ou
       insígnia, e a repetição que paga menos. */
    ok(n >= 8 && venceu >= 5, `a sequência lutou pouco: ${n} lutas, ${venceu} vitórias`);
    ok(doServidor(c).jornada.pve.dia != null && doServidor(c).jornada.vencidos.includes('floresta'), 'o progresso não andou');
  });

  s.teste('a caixa não luta, e os golpes guardados lutam', () => {
    const c = cena();
    const r = lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'caixa-0001', agora: T0, semente: 5 });
    igual(r.timeA.length, 6, 'o time não é a equipe de seis');
    ok(!r.timeA.some(x => x.dex === 6), 'quem está na caixa lutou');
    const golpes = D.carregar(c.d).criaturas[0].golpes;
    ok(Array.isArray(golpes) && golpes.length, 'a cena não guardou golpe');
    igual(JSON.stringify(r.timeA[0].golpes), JSON.stringify(golpes), 'o moveset guardado no servidor não lutou');
  });

  s.teste('a chance do fato é a da tela: a mesma raiz, o mesmo time, o mesmo preset', () => {
    const c = cena(), e = D.carregar(c.d);
    for (const preset of ['balanced', 'focus']) {
      const r = lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', preset, chaveIdem: `chance-${preset}`, agora: T0, semente: 7 });
      /* a tela: `lote(PACK, A, rival, RAIZ, ...)` com A = entradasDoTime(save) */
      const tela = chanceDeVencer(PACK, entradasDoTime(PACK, e), r.timeB, { raiz: 1, preset }).p;
      igual(r.p, tela, `a chance anotada (${preset}) não é a que a tela mostrou`);
      igual(chanceDaLuta({ pack: PACK, criaturas: e.criaturas, id: 'rota1', preset }).p, tela, 'a conta da chance diverge');
    }
    igual(chanceDaLuta({ pack: PACK, criaturas: [], id: 'rota1' }), null, 'sem time, chance inventada');
  });

  s.teste('o reenvio devolve a luta gravada, e não luta nem paga de novo', () => {
    const c = cena();
    const a = lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'idem-00001', agora: T0, semente: 9 });
    const antes = ordenado(doServidor(c));
    const b = lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'idem-00001', agora: T0 + H, semente: 99 });
    igual(b.repetido, true, 'o reenvio não disse que era repetido');
    igual(`${b.semente}|${b.vencedor}`, `${a.semente}|${a.vencedor}`, 'o reenvio lutou de novo');
    igual(ordenado(doServidor(c)), antes, 'o reenvio pagou de novo');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM lutas_jornada`).get().n, 1, 'duas lutas gravadas');
    for (const chave of [undefined, 'curta', 'x'.repeat(65), 'com espaço aqui'])
      igual(recusa(() => lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: chave, agora: T0 }))?.codigo, ERRO_JORNADA.CHAVE, `chave ${chave}`);
    igual(recusa(() => lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', preset: 'turbo', chaveIdem: 'preset-0001', agora: T0 }))?.codigo,
          ERRO_JORNADA.PRESET, 'preset desconhecido');
  });

  s.teste('a revisão: a jornada que mudou entre ler e gravar recusa a luta, e nada é pago', () => {
    for (const primeira of [true, false]) {
      const c = cena();
      if (!primeira) lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'antes-0001', agora: T0, semente: 3 });
      const antes = ordenado(doServidor(c)), lutas = c.db.prepare(`SELECT COUNT(*) AS n FROM lutas_jornada`).get().n;
      /* Outra luta grava no meio: logo antes da escrita da revisão. */
      const intruso = new Proxy(c.db, { get(t, k) {
        if (k === 'prepare') return sql => {
          if (/INSERT INTO jornadas/.test(sql)) t.prepare(`INSERT INTO jornadas (user_id, progresso_json, revisao, atualizada_em) VALUES (?, '{}', 0, 0)`).run(c.u);
          if (/UPDATE jornadas/.test(sql)) t.prepare(`UPDATE jornadas SET revisao = revisao + 1 WHERE user_id = ?`).run(c.u);
          return t.prepare(sql);
        };
        const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
      } });
      const x = recusa(() => lutarNaConta(intruso, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'meio-00001', agora: T0 + H, semente: 4 }));
      igual(x?.codigo, ERRO_JORNADA.CONFLITO, `${primeira ? 'a primeira' : 'a segunda'} luta gravou por cima`);
      if (primeira) c.db.prepare(`DELETE FROM jornadas WHERE user_id = ?`).run(c.u);
      igual(ordenado(doServidor(c)), antes, 'a luta recusada pagou');
      igual(c.db.prepare(`SELECT COUNT(*) AS n FROM lutas_jornada`).get().n, lutas, 'a luta recusada foi gravada');
    }
  });

  s.teste('os fatos da V4 nascem da luta, com origem servidor e a chave própria', () => {
    const c = cena();
    let ganhou = null, i = 0;
    for (const id of ['rota1', 'floresta', 'rota22', 'pedra'])
      lutarNaConta(c.db, { userId: c.u, pack: PACK, id, chaveIdem: `fato-${id}-01`, agora: T0, semente: 31 });
    /* o relato do aparelho com a chave dele chega ANTES: não pode ocupar a vaga */
    c.db.prepare(`INSERT INTO telemetry_events (id, nome, user_id, amostravel, campos, criado_em, chave) VALUES ('rel', 'ginasio_vencido', ?, 1, '{"no":"pewter"}', ?, 'gin:pewter')`).run(c.u, T0);
    for (let s = 40; s < 60 && !ganhou; s++) {
      const r = lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'pewter', chaveIdem: `fato-pewter-${s}`, agora: T0 + H, semente: s });
      i++; if (r.ganhouInsignia) ganhou = r;
    }
    ok(ganhou, 'o Brock não caiu em 20 tentativas — a cena não exerce o ginásio');
    const ev = c.db.prepare(`SELECT nome, chave, campos FROM telemetry_events WHERE user_id = ? AND json_extract(campos, '$.origem') = 'servidor'`).all(c.u)
      .map(l => ({ ...l, c: JSON.parse(l.campos) }));
    const lutas = ev.filter(e => e.nome === 'pve_iniciado');
    igual(lutas.length, 4 + i, 'uma luta sem fato, ou fato sem luta');
    ok(lutas.every(e => e.chave.startsWith('srv:pve:') && Number.isFinite(e.c.p) && e.c.tamanho === 6), 'o fato da luta sem chave própria, chance ou time');
    igual(JSON.stringify(lutas.map(e => e.c.venceu).slice(0, 4)), '[true,true,true,true]', 'o fato não diz se venceu');
    const gin = ev.filter(e => e.nome === 'ginasio_vencido');
    igual(gin.length, 1, 'o ginásio vencido não virou fato (ou virou duas vezes)');
    igual(`${gin[0].chave}|${gin[0].c.insignia}`, `srv:gin:pewter|${ganhou.ganhouInsignia}`, 'o fato do ginásio');
  });

  s.teste('o gate: o fato vence o relato do mesmo jogador, e o relato de quem não tem fato fica', () => {
    const ev = [
      { nome: 'pve_iniciado', user: 'a', c: { no: 'rota1', venceu: true, origem: 'servidor' } },
      { nome: 'pve_iniciado', user: 'a', c: { no: 'rota1', venceu: true } },
      { nome: 'ginasio_vencido', user: 'a', c: { no: 'pewter' } },
      { nome: 'pve_iniciado', user: 'b', c: { no: 'rota1', venceu: false } },
      { nome: 'p_exibida', user: 'a', c: { no: 'rota1' } },
    ];
    const r = fatosDaJornada(ev);
    igual(JSON.stringify(r.eventos.map(e => `${e.user}:${e.nome}:${e.c.origem ?? 'rel'}`)),
      '["a:pve_iniciado:servidor","a:ginasio_vencido:rel","b:pve_iniciado:rel","a:p_exibida:rel"]', 'o que fica');
    igual(JSON.stringify(r.origem), '{"servidor":1,"relato":1}', 'a conta de cada lado');
    /* O ginásio de `a` fica: o fato do servidor é por NOME — ter a luta no
       servidor não apaga o relato de um ginásio que ele ainda não anotou. */
    const c = cena();
    lutarNaConta(c.db, { userId: c.u, pack: PACK, id: 'rota1', chaveIdem: 'gate-00001', agora: T0, semente: 2 });
    c.db.prepare(`INSERT INTO telemetry_events (id, nome, user_id, amostravel, campos, criado_em, chave) VALUES ('r1', 'pve_iniciado', ?, 1, '{"no":"rota1","venceu":true,"p":0.5,"tamanho":6}', ?, 'pve:rota1:2')`).run(c.u, T0);
    const g = gateDaV4Servidor(c.db, { agora: T0 + H });
    igual(g.kpis.lutas, 1, 'o relato somou com o fato');
    igual(JSON.stringify(g.kpis.origemDasLutas), '{"servidor":1,"relato":0}', 'o gate não diz de onde vieram as lutas');
  });

  s.teste('a conta é pura: a mesma entrada, a mesma saída, e nada muda na entrada', () => {
    const c = cena(), e = D.carregar(c.d);
    const entrada = { pack: PACK, criaturas: e.criaturas, jornada: null, id: 'rota1', preset: 'balanced', semente: 8, dia: 100 };
    const foto = JSON.stringify(entrada.criaturas);
    const a = contaDaLuta(entrada), b = contaDaLuta(entrada);
    igual(JSON.stringify(a), JSON.stringify(b), 'a conta não é determinística');
    igual(JSON.stringify(entrada.criaturas), foto, 'a conta mexeu nas criaturas');
    igual(a.resultado.vencedor, 'A', 'a cena perde a rota 1');
    igual(JSON.stringify(a.credito.bolsa), JSON.stringify({ [idDaMoeda(PACK)]: 200, poke: 2 }), 'a primeira vitória da rota não paga o da tabela');
    igual(contaDaLuta({ ...entrada, semente: 'x' }).motivo, 'a luta de jornada precisa de semente', 'sem semente, lutou');
    igual(contaDaLuta({ ...entrada, criaturas: [] }).motivo, 'o time está vazio', 'time vazio lutou');
    /* O CHEFE paga a essência da espécie dele, na bolsa com a chave — nunca a
       criatura (L-057). Um time forte, com o caminho até a Usina vencido. */
    const nos = nosDa(PACK), usina = nos.findIndex(n => n.chefe);
    const fortes = [6, 9, 3, 26, 18, 22].map((dex, i) => ({ id: `f${i}`, dex, xp: xpParaNivel(70), naCaixa: false,
      iv: [15, 15, 15, 15, 15, 15], natureza: e.criaturas[0].natureza }));
    const caminho = { vencidos: nos.slice(0, usina).map(n => n.id), insignias: [] };
    let chefe = null;
    for (let sem = 1; sem < 30 && !chefe?.recompensa.essencias?.['145']; sem++)
      chefe = contaDaLuta({ pack: PACK, criaturas: fortes, jornada: caminho, id: nos[usina].id, semente: sem, dia: 100 });
    igual(chefe?.recompensa.essencias?.['145'], 1, 'o chefe não caiu em 30 tentativas — a cena não exerce a essência');
    igual(chefe.credito.bolsa['essencia:145'], 1, 'a essência do chefe não foi creditada na bolsa');
    ok(!Object.keys(chefe.credito.bolsa).some(k => /^\d+$/.test(k)), 'o chefe pagou uma criatura');
  });

  s.teste('pela porta: a semente é do servidor, a leitura traz a jornada, e o de outro jogador é outro', async () => {
    igual(OPERACOES_DO_IDLE.includes('POST /api/idle/jornada/lutar'), true, 'a rota não está na lista fechada');
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    const pedir = (metodo, caminho, corpo, sessao) => fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
      [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${sessao}`, 'content-type': 'application/json' }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
      .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      const contas = [];
      for (const nome of ['Jorn0', 'Jorn1']) {
        const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
          body: JSON.stringify({ username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
        contas.push({ sessao: cad.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id });
      }
      const [a, b] = contas;
      for (const dex of [4, 7, 1]) srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(15), gerar(srv.db, { userId: a.id, pack: PACK, dex }).id);
      const l1 = await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', chaveIdem: 'porta-0001', semente: 3 }, a.sessao);
      igual(l1.status, 200, `a luta: ${JSON.stringify(l1.corpo)?.slice(0, 160)}`);
      const l2 = await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', chaveIdem: 'porta-0002', semente: 3 }, a.sessao);
      ok(!(l1.corpo.semente === 3 && l2.corpo.semente === 3), 'a semente do corpo foi usada');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', chaveIdem: 'porta-0001' }, a.sessao)).corpo.repetido, true, 'o reenvio pela porta');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 'pewter', chaveIdem: 'porta-0003' }, a.sessao)).status, 400, 'fora de ordem pela porta');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', preset: 'turbo', chaveIdem: 'porta-0004' }, a.sessao)).corpo?.codigo, ERRO_JORNADA.PRESET, 'preset pela porta');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', chaveIdem: 'x' }, a.sessao)).corpo?.codigo, ERRO_JORNADA.CHAVE, 'chave pela porta');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 7, chaveIdem: 'porta-0005' }, a.sessao)).status, 400, 'nó em número');
      igual((await pedir('POST', '/api/idle/jornada/lutar', { no: 'rota1', chaveIdem: 'porta-0006' }, b.sessao)).corpo?.erro, 'o time está vazio', 'B lutou com o time de A');
      const la = (await pedir('GET', '/api/idle', null, a.sessao)).corpo, lb = (await pedir('GET', '/api/idle', null, b.sessao)).corpo;
      igual(JSON.stringify(la.jornada?.vencidos), '["rota1"]', 'a leitura não traz a jornada');
      igual(lb.jornada, null, 'B vê a jornada de A');
    } finally { await srv.fechar(); }
  });

  return s;
}
