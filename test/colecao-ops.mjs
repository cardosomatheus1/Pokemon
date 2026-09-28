/* Q1/Q3/Q6 · AS OPERAÇÕES DA COLEÇÃO NO SERVIDOR (ST-13.3a · E13 · L-210)
 *
 * A AFIRMAÇÃO CENTRAL é de identidade: a mesma sequência de mover, trocar,
 * soltar e escolher foco, no aparelho e no servidor, é aceita ou recusada com
 * a MESMA frase, e deixa a coleção no mesmo estado — quem está na caixa, quem
 * existe, o foco e o descanso, e o doce que as soltas viraram.
 *
 * E o que a L-210 pedia: a captura com a equipe cheia cai na caixa, e a
 * expedição e a run recusam quem está nela — pela porta HTTP, com o de outro
 * jogador invisível.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, creditarBolsa, lancarPendente, criaturasDaConta, bolsaDe } from '../server/idle.mjs';
import { comecarRun } from '../server/run.mjs';
import { moverNaConta, trocarNaConta, soltarNaConta, escolherFocoNaConta, trocarGolpeNaConta, evoluirNaConta, darDoceNaConta } from '../server/colecao.mjs';
import { docesDe } from '../server/doce.mjs';
import { criarServidor } from '../server/servidor.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { soltarCriatura, darDoce } from '../app/modules/doce-dados.mjs';
import { ordemDaTroca } from '../app/modules/colecao-regras.mjs';
import { escolher, MS_DE_TROCA } from '../engine/foco.mjs';
import { xpParaNivel, nivelDe } from '../engine/nivel-criatura.mjs';
import { alternarGolpe, padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { aplicar as aplicarEvolucao } from '../app/modules/evolucao-idle.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 10);
const H = 3600_000;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Oito criaturas nos dois lados: seis ativas e duas na caixa; níveis mistos
   (o foco pede o 12). */
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'col', email: 'col@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const e = D.VAZIO();
  const ids = [1, 4, 7, 10, 13, 16, 19, 25].map((dex, i) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura' });
    const xp = i % 2 ? xpParaNivel(15) : xpParaNivel(5);
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = ?, criada_em = ? WHERE id = ?`).run(xp, i >= 6 ? 1 : 0, T0 + i, c.id);
    e.criaturas.push({ id: c.id, dex, iv: c.iv, natureza: c.natureza.nome, exemplar: c.exemplar, xp, nivel: 1, vinculo: 0,
                       foco: null, stamina: 100, staminaEm: T0, origem: 'captura', criadaEm: T0 + i, naCaixa: i >= 6 });
    return c.id;
  });
  return { db, u, e, ids };
}

const estadoServidor = (db, u) => ({
  criaturas: criaturasDaConta(db, u).map(c => [c.id, c.naCaixa, c.foco ?? null, c.descansaAte ?? null]),
  doces: docesDe(db, u),
});
const estadoAparelho = e => ({
  criaturas: e.criaturas.map(c => [c.id, !!c.naCaixa, c.foco ?? null, c.descansaAte ?? null]),
  doces: Object.fromEntries(Object.entries(e.doces ?? {}).filter(([, n]) => n > 0)),
});

/* Os dois lados da mesma operação — cada um devolve a mensagem da recusa, ou 'ok'. */
const OPS = {
  mover: (c, { id, caixa }) => [
    recusa(() => moverNaConta(c.db, { userId: c.u, id, paraCaixa: caixa }))?.message ?? 'ok',
    recusa(() => D.mover(c.e, id, caixa))?.message ?? 'ok'],
  trocar: (c, { sai, entra }) => {
    const sv = recusa(() => trocarNaConta(c.db, { userId: c.u, sai, entra }))?.message ?? 'ok';
    /* o aparelho troca numa gravação só (time-local): falhou no meio, nada muda */
    const copia = structuredClone(c.e);
    const ap = recusa(() => { for (const [id, p] of ordemDaTroca(copia.criaturas, sai, entra)) D.mover(copia, id, p); })?.message ?? 'ok';
    if (ap === 'ok') c.e.criaturas = copia.criaturas;
    return [sv, ap];
  },
  soltar: (c, { id, agora }) => {
    const sv = recusa(() => soltarNaConta(c.db, { userId: c.u, pack: PACK, id, agora }))?.message ?? 'ok';
    const r = soltarCriatura(c.e, { pack: PACK, id, ondeAventura: D.ondeAventura });
    return [sv, r.ok ? 'ok' : r.motivo];
  },
  foco: (c, { id, foco, agora }) => {
    const sv = recusa(() => escolherFocoNaConta(c.db, { userId: c.u, id, foco, agora }))?.message ?? 'ok';
    const alvo = c.e.criaturas.find(x => x.id === id);
    const ap = recusa(() => {
      if (!alvo) throw new Error('esta criatura não existe');
      const novo = escolher({ ...D.hidratar(alvo) }, foco, agora);
      Object.assign(alvo, { foco: novo.foco, focoEm: novo.focoEm, descansaAte: novo.descansaAte });
    })?.message ?? 'ok';
    return [sv, ap];
  },
};

export async function suite() {
  const s = criarSuite('colecao-ops');

  s.teste('identidade: a mesma sequência de mover, trocar, soltar e foco dá a mesma resposta e o mesmo estado nos dois lados', () => {
    const c = cena();
    const [a, b, cc, d, e5, f, g, h] = c.ids;
    /* f sai em expedição nos dois lados: ir para a caixa pode, soltar não */
    iniciar(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [f], agora: T0 });
    D.iniciarExpedicao(c.e, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [f], agora: T0 });
    const passos = [
      ['mover', { id: f, caixa: true }],
      ['soltar', { id: f, agora: T0 }],                   // em aventura: recusa
      ['mover', { id: f, caixa: false }],
      ['mover', { id: g, caixa: false }],                 // equipe cheia: recusa
      ['trocar', { sai: a, entra: g }],                   // cheia: tira antes de pôr
      ['soltar', { id: b, agora: T0 }],                   // não está na caixa
      ['soltar', { id: a, agora: T0 }],                   // na caixa: vira doce
      ['soltar', { id: a, agora: T0 }],                   // já foi
      ['foco', { id: cc, foco: 'batedor', agora: T0 }],   // nível 5: recusa
      ['foco', { id: b, foco: 'batedor', agora: T0 }],    // nível 15: a primeira é grátis
      ['foco', { id: b, foco: 'sortudo', agora: T0 + H }],             // troca: descansa
      ['foco', { id: b, foco: 'guia', agora: T0 + 2 * H }],            // descansando: recusa
      ['foco', { id: b, foco: 'guia', agora: T0 + H + MS_DE_TROCA + 1 }],
      ['foco', { id: b, foco: 'inexistente', agora: T0 + 99 * H }],
      ['mover', { id: cc, caixa: true }], ['mover', { id: d, caixa: true }], ['mover', { id: e5, caixa: true }],
      ['mover', { id: f, caixa: true }], ['mover', { id: g, caixa: true }],
      ['mover', { id: b, caixa: true }],                  // a última: a equipe não fica vazia
      ['trocar', { sai: b, entra: h }],                   // um ativo: põe antes de tirar
      ['soltar', { id: b, agora: T0 }],                   // b foi para a caixa na troca
      ['mover', { id: 'nao-existe', caixa: true }],
    ];
    const respostas = [];
    for (const [op, arg] of passos) {
      const [sv, ap] = OPS[op](c, arg);
      igual(sv, ap, `${op} ${JSON.stringify(arg)}: o servidor e o aparelho responderam diferente`);
      igual(JSON.stringify(estadoServidor(c.db, c.u)), JSON.stringify(estadoAparelho(c.e)), `${op} ${JSON.stringify(arg)}: o estado divergiu`);
      respostas.push(sv === 'ok');
    }
    ok(respostas.filter(Boolean).length >= 8 && respostas.filter(x => !x).length >= 6, 'a sequência não exercitou aceites e recusas o bastante');
    ok(Object.keys(estadoServidor(c.db, c.u).doces).length > 0, 'soltar não virou doce');
  });

  s.teste('identidade dos golpes: ligar e desligar dá a mesma resposta e o mesmo moveset nos dois lados (ST-13.3b)', () => {
    const c = cena();
    const id = c.ids[1];   // dex 4, nível 15
    const liberados = padraoDoMoveset(PACK, 4, 15);   // os do nível dela: desligar e religar
    const outro = (PACK.golpes.water ?? [])[0]?.n;
    const [l0, l1] = liberados;
    /* desliga, tenta esvaziar, religa, e as recusas: outro tipo, inexistente e o
       VAZIO — que a regra aceitava (o `find` devolvia o próprio vazio) */
    const passos = [l0, l1, l0, outro, 'inexistente', undefined, l1, l1];
    let aceitos = 0, recusados = 0;
    for (const nome of passos) {
      const sv = recusa(() => trocarGolpeNaConta(c.db, { userId: c.u, pack: PACK, id, nome }))?.message ?? 'ok';
      const alvo = c.e.criaturas.find(x => x.id === id);
      const r = alternarGolpe(PACK, D.hidratar(alvo), nome);
      if (r.ok) alvo.golpes = r.golpes;
      igual(sv, r.ok ? 'ok' : r.motivo, `o golpe ${nome}: responderam diferente`);
      const g = criaturasDaConta(c.db, c.u).find(x => x.id === id).golpes ?? null;
      igual(JSON.stringify(g), JSON.stringify(alvo.golpes ?? null), `o golpe ${nome}: o moveset divergiu`);
      if (sv === 'ok') aceitos++; else recusados++;
      if (nome === undefined) ok(sv !== 'ok', 'o golpe vazio entrou no moveset');
    }
    ok(aceitos >= 3 && recusados >= 2, `a sequência não exercitou aceites (${aceitos}) e recusas (${recusados})`);
  });

  s.teste('identidade da evolução: por nível, por pedra (consumida), pelo ramo escolhido, e as recusas (ST-13.3b)', () => {
    const c = cena();
    const nova = (dex, xp) => {
      const g = gerar(c.db, { userId: c.u, pack: PACK, dex });
      c.db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = 1 WHERE id = ?`).run(xp, g.id);
      c.e.criaturas.push({ id: g.id, dex, iv: g.iv, natureza: g.natureza.nome, exemplar: g.exemplar, xp,
                           nivel: nivelDe(xp), vinculo: 0, foco: null, stamina: 100, staminaEm: T0, origem: 'captura', criadaEm: T0, naCaixa: true });
      return g.id;
    };
    const carmander = nova(4, xpParaNivel(16)), cedo = nova(4, xpParaNivel(10)), pika = nova(25, 0), eevee = nova(133, 0);
    for (const [item, n] of [['trovao', 2], ['agua', 1]]) { creditarBolsa(c.db, c.u, item, n); c.e.bolsa[item] = n; }
    const casos = [[carmander, null], [cedo, null], [pika, null], [eevee, 135], [eevee, 134], [pika, null], [eevee, null]];
    let aceitos = 0;
    for (const [id, alvo] of casos) {
      const sv = recusa(() => evoluirNaConta(c.db, { userId: c.u, pack: PACK, id, alvo }))?.message ?? 'ok';
      const i = c.e.criaturas.findIndex(x => x.id === id);
      const ap = recusa(() => {
        const r = aplicarEvolucao(PACK, c.e.criaturas[i], c.e.bolsa, alvo);
        if (r.consome && (c.e.bolsa[r.consome] ?? 0) > 0) c.e.bolsa[r.consome] -= 1;
        c.e.criaturas[i] = r.criatura;
      })?.message ?? 'ok';
      igual(sv, ap, `evoluir ${id.slice(0, 6)} para ${alvo}: responderam diferente`);
      const sc = criaturasDaConta(c.db, c.u).find(x => x.id === id);
      igual(JSON.stringify([sc.dex, sc.exclusivos ?? null]), JSON.stringify([c.e.criaturas[i].dex, c.e.criaturas[i].exclusivos ?? null]), 'a criatura evoluída divergiu');
      const bs = Object.fromEntries(bolsaDe(c.db, c.u).map(b => [b.item_id, b.quantidade]));
      igual(JSON.stringify([bs.trovao ?? 0, bs.agua ?? 0]), JSON.stringify([c.e.bolsa.trovao ?? 0, c.e.bolsa.agua ?? 0]), 'a pedra consumida divergiu');
      if (sv === 'ok') aceitos++;
    }
    igual(aceitos, 3, 'os aceites esperados: Charmander no 16, Pikachu com a pedra, Eevee pelo Trovão');
    igual(Object.fromEntries(bolsaDe(c.db, c.u).map(b => [b.item_id, b.quantidade])).trovao, undefined, 'duas evoluções por Trovão e a pedra sobrou');
  });

  s.teste('identidade do doce: gastar da linha, no máximo o que se tem, nada no nível máximo, e a mesma chave gasta uma vez (ST-13.3c)', () => {
    const c = cena();
    const [a, b] = c.ids;                       // dex 1 (linha 1) e dex 4 (linha 4)
    const linhaA = 1, linhaB = 4;
    for (const [linha, n] of [[linhaA, 5], [linhaB, 2]]) {
      c.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, ?, ?)`).run(c.u, linha, n);
      c.e.doces[linha] = n;
    }
    const topo = c.ids[2];
    c.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(100), topo);
    c.e.criaturas.find(x => x.id === topo).xp = xpParaNivel(100);
    const passos = [[a, 2], [a, 9], [a, 1], [b, 1], [b, 5], [topo, 1], ['nao-existe', 1]];
    let k = 0, aceitos = 0;
    for (const [id, quantos] of passos) {
      const chave = `pedido-${++k}-abc`;
      const sv = recusa(() => darDoceNaConta(c.db, { userId: c.u, pack: PACK, id, quantos, chaveIdem: chave, agora: T0 }));
      const r = darDoce(c.e, { pack: PACK, id, quantos });
      igual(sv?.message ?? 'ok', r.ok ? 'ok' : r.motivo, `doce ${quantos} para ${id.slice(0, 6)}: responderam diferente`);
      igual(JSON.stringify(estadoServidor(c.db, c.u).doces), JSON.stringify(Object.fromEntries(Object.entries(c.e.doces).filter(([, n]) => n > 0))), 'o saldo divergiu');
      const xs = criaturasDaConta(c.db, c.u).map(x => [x.id, x.xp]), xa = c.e.criaturas.map(x => [x.id, x.xp]);
      igual(JSON.stringify(xs), JSON.stringify(xa), 'o XP divergiu');
      if (!sv) aceitos++;
    }
    igual(aceitos, 4, 'os aceites: 2 e o resto da linha A (3), 1 da linha B, e o último da B');
    /* a MESMA chave, de novo: devolve o que gastou, e não gasta */
    const antes = JSON.stringify(estadoServidor(c.db, c.u));
    const de_novo = darDoceNaConta(c.db, { userId: c.u, pack: PACK, id: a, quantos: 1, chaveIdem: 'pedido-1-abc', agora: T0 });
    ok(de_novo.repetido && de_novo.gastos === 2, `a mesma chave: ${JSON.stringify(de_novo)}`);
    igual(JSON.stringify(estadoServidor(c.db, c.u)), antes, 'a mesma chave gastou de novo');
    ok(recusa(() => darDoceNaConta(c.db, { userId: c.u, pack: PACK, id: a, quantos: 1, chaveIdem: 'x', agora: T0 })), 'chave curta aceita');
  });

  s.teste('a migração manda para a caixa quem passava de seis ativas, pela ordem de chegada', async () => {
    const { MIGRACOES } = await import('../server/banco.mjs');
    const db = abrirBanco(':memory:'); migrar(db, MIGRACOES.findIndex(m => m.nome === 'colecao-st13.3a'));
    const u = cadastrar(db, { username: 'mig', email: 'mig@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const ids = [1, 4, 7, 10, 13, 16, 19, 25].map((dex, i) => {
      const c = gerar(db, { userId: u, pack: PACK, dex });
      db.prepare(`UPDATE criaturas SET criada_em = ? WHERE id = ?`).run(T0 + (7 - i), c.id);   // a última gerada é a mais antiga
      return c.id;
    });
    migrar(db);
    const naCaixa = db.prepare(`SELECT id FROM criaturas WHERE user_id = ? AND na_caixa = 1 ORDER BY criada_em`).all(u).map(x => x.id);
    igual(JSON.stringify(naCaixa.sort()), JSON.stringify([ids[0], ids[1]].sort()), 'as duas mais novas não foram para a caixa');
  });

  s.teste('a captura com a equipe cheia cai na caixa; a expedição e a run recusam quem está nela', () => {
    const c = cena();
    const box = c.ids[6];
    ok(/caixa/.test(recusa(() => iniciar(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [box], agora: T0 }))?.message ?? ''), 'a expedição levou quem está na caixa');
    ok(/caixa/.test(recusa(() => comecarRun(c.db, { userId: c.u, pack: PACK, bioma: 'floresta', equipe: [box], agora: T0 }))?.message ?? ''), 'a run levou quem está na caixa');
    c.db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, run_id, dex, raridade, bioma, em) VALUES ('k1', ?, 'avanco', NULL, 16, 'comum', 'floresta', ?)`).run(c.u, T0);
    creditarBolsa(c.db, c.u, 'ultra', 50);
    let r;
    for (let i = 0; i < 40 && !r?.capturou; i++) {
      c.db.prepare(`UPDATE encontros_pendentes SET resolvido_em = NULL WHERE chave = 'k1'`).run();
      r = lancarPendente(c.db, { userId: c.u, pack: PACK, chave: 'k1', bola: 'ultra', agora: T0 });
    }
    ok(r.capturou, 'nenhuma captura em 40 lances de Ultra num comum');
    igual(criaturasDaConta(c.db, c.u).find(x => x.id === r.criatura.id).naCaixa, true, 'a captura com a equipe cheia não caiu na caixa');
  });

  s.teste('pela porta: as quatro operações, o de outro jogador invisível, e o pedido torto', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    const pedir = (caminho, corpo, sessao) => fetch(`http://127.0.0.1:${porta}${caminho}`, { method: 'POST', headers: {
      [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${sessao}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      const contas = [];
      for (const nome of ['Caixa0', 'Caixa1']) {
        const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
          body: JSON.stringify({ username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
        contas.push({ sessao: cad.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id });
      }
      const [a, b] = contas;
      const ids = [1, 4].map(dex => gerar(srv.db, { userId: a.id, pack: PACK, dex }).id);
      srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(14), ids[0]);
      igual((await pedir('/api/idle/mover', { id: ids[1], caixa: true }, a.sessao)).status, 200, 'mover para a caixa');
      igual((await pedir('/api/idle/mover', { id: ids[0], caixa: true }, a.sessao)).status, 400, 'a equipe ficou vazia');
      /* 0, e não "sim": lido como falso, tiraria da caixa — e isso seria aceito
         (o S1642 passou pela primeira versão, com "sim"). */
      igual((await pedir('/api/idle/mover', { id: ids[1], caixa: 0 }, a.sessao)).status, 400, 'caixa em número');
      igual((await pedir('/api/idle/mover', { id: ids[0], caixa: true }, b.sessao)).status, 404, 'B moveu a criatura de A');
      igual((await pedir('/api/idle/trocar', { sai: ids[0], entra: ids[1] }, a.sessao)).status, 200, 'a troca');
      igual((await pedir('/api/idle/foco', { id: ids[0], foco: 'batedor' }, a.sessao)).status, 200, 'o foco');
      igual((await pedir('/api/idle/foco', { id: ids[0], foco: 'batedor' }, b.sessao)).status, 404, 'B escolheu o foco de A');
      igual((await pedir('/api/idle/soltar', { id: ids[0] }, b.sessao)).status, 404, 'B soltou a criatura de A');
      const sol = await pedir('/api/idle/soltar', { id: ids[0] }, a.sessao);
      igual(sol.status, 200, `soltar: ${JSON.stringify(sol.corpo)}`);
      ok(sol.corpo.doce > 0, 'soltar não pagou doce');
      igual((await pedir('/api/idle/soltar', { id: ids[0] }, a.sessao)).status, 404, 'soltou duas vezes');
      igual(JSON.stringify(docesDe(srv.db, b.id)), '{}', 'o doce foi para outro');
      /* os golpes e a evolução pela porta (ST-13.3b) */
      const pk = gerar(srv.db, { userId: a.id, pack: PACK, dex: 25 }).id;
      igual((await pedir('/api/idle/golpe', { id: pk, nome: 7 }, a.sessao)).status, 400, 'golpe em número');
      /* a recusa tem de ser a da ROTA (tipo), e não a do domínio por acaso —
         o S1647 passou pela primeira versão, que só olhava o status */
      const txt = await pedir('/api/idle/evoluir', { id: pk, alvo: '26' }, a.sessao);
      igual(`${txt.status} ${txt.corpo?.erro}`, '400 evolução inválida', 'alvo em texto');
      igual((await pedir('/api/idle/evoluir', { id: pk }, a.sessao)).status, 400, 'evoluiu sem a pedra');
      creditarBolsa(srv.db, a.id, 'trovao', 1);
      igual((await pedir('/api/idle/evoluir', { id: pk }, b.sessao)).status, 404, 'B evoluiu a criatura de A');
      const ev = await pedir('/api/idle/evoluir', { id: pk, alvo: 26 }, a.sessao);
      igual(ev.status, 200, `evoluir: ${JSON.stringify(ev.corpo)}`);
      igual(ev.corpo.para, 26, 'a espécie depois');
      /* dar doce pela porta (ST-13.3c): a linha nunca vem do corpo */
      srv.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, 25, 3)`).run(a.id);
      igual((await pedir('/api/idle/doce', { id: pk, quantos: 0, chaveIdem: 'chave-doce-1' }, a.sessao)).status, 400, 'zero doce');
      igual((await pedir('/api/idle/doce', { id: pk, quantos: 1, chaveIdem: 'chave-doce-1' }, b.sessao)).status, 404, 'B deu o doce de A');
      const dd = await pedir('/api/idle/doce', { id: pk, quantos: 2, chaveIdem: 'chave-doce-1', linha: 1, species_id: 1 }, a.sessao);
      igual(dd.status, 200, `dar doce: ${JSON.stringify(dd.corpo)}`);
      igual(docesDe(srv.db, a.id)[25], 1, 'o doce saiu de outra linha');
    } finally { await srv.fechar(); }
  });

  return s;
}
