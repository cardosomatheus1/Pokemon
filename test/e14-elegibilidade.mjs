/* Q1/Q3/Q6 · E14 · A POLÍTICA ÚNICA DE NEGOCIABILIDADE E USO (ST-14.5)
 *
 * Uma pergunta só — "este ativo pode ir para a troca, o mercado, ser solto,
 * evoluir agora?" — e uma resposta só: `{ allowed, reason_code, available_at }`.
 * A tabela abaixo é parametrizada de propósito: cada linha é um caso de
 * produto (o inicial, o farm, a bola de bônus, a moeda PvE, o `comprado`), com
 * positivos e negativos lado a lado, e a fronteira do cooldown nos dois lados
 * do milissegundo.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa } from '../server/idle.mjs';
import { creditar } from '../server/carteira.mjs';
import { pausar } from '../server/protecao.mjs';
import { soltarNaConta } from '../server/colecao.mjs';
import { elegibilidadeDaCriatura, elegibilidadeDoItem, elegibilidadeDoPreso, elegibilidadeDaMoeda } from '../server/elegibilidade.mjs';
import { avaliarCriatura, avaliarItem, avaliarMoeda, avaliarPreso, tipoDoItem, ACOES, COOLDOWN_RECEBIDA_MS, RAZAO } from '../engine/negociabilidade.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const LIGADAS = { p2p_transfer_enabled: true, p2p_trade_enabled: true, player_market_enabled: true };
const CONTA = { pausada: false, bandeiras: LIGADAS };
const CRIATURA = { existe: true, dono: 'eu', origem: 'captura', lendario: false, proveniencia: 'verified_earned', emAtividade: false, reservada: false, recebidaEm: null };
const r = x => `${x.allowed}|${x.reason_code}|${x.detalhe}`;
const CHECKPOINT = 'DEC-99';   // o formato que `checkpointValido` aceita — só no teste

const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid: conta('ele1'), outro: conta('ele2') };
};
/* A bandeira gravada ligada sem passar pelo admin — o mesmo atalho do
   `liga-stake`: o que se testa aqui é a política, não a porta do operador. */
const ligar = (db, nomes = Object.keys(LIGADAS)) => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of nomes) db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, 1, ?, 'teste')`).run(n, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
};

export async function suite() {
  const s = criarSuite('e14-elegibilidade');

  s.teste('motor · a criatura: tabela de positivos e negativos, na ordem do contrato', () => {
    const casos = [
      ['farm verificado passa na troca',                {},                                         'trade',  'true|null|null'],
      ['farm verificado passa no mercado',              {},                                         'market', 'true|null|null'],
      ['recebida em troca liquidada passa',             { proveniencia: 'p2p_verified' },           'trade',  'true|null|null'],
      ['de outro jogador',                              { dono: 'ele' },                            'trade',  'false|NOT_OWNER|null'],
      ['inexistente é igual a de outro',                { existe: false },                          'trade',  'false|NOT_OWNER|null'],
      ['o inicial é preso por regra',                   { origem: 'inicial' },                      'trade',  'false|ASSET_BOUND|inicial'],
      ['o inicial é preso também no mercado',           { origem: 'inicial' },                      'market', 'false|ASSET_BOUND|inicial'],
      ['o lendário é preso por regra',                  { lendario: true },                         'trade',  'false|ASSET_BOUND|lendario'],
      ['a criatura de evento é presa por regra',        { origem: 'raid' },                         'trade',  'false|ASSET_BOUND|raid'],
      ['a bola de bônus prende a captura',              { proveniencia: 'promotional_bound' },      'trade',  'false|ASSET_BOUND|promotional_bound'],
      ['o legado não negocia',                          { proveniencia: 'legacy_unverified' },      'market', 'false|ASSET_BOUND|legacy_unverified'],
      ['em revisão não negocia',                        { proveniencia: 'admin_review' },           'trade',  'false|ASSET_BOUND|admin_review'],
      ['de teste não negocia',                          { proveniencia: 'test_only' },              'trade',  'false|ASSET_BOUND|test_only'],
      ['em expedição ou run não entra na troca',        { emAtividade: true },                      'trade',  'false|ASSET_BUSY|atividade'],
      ['reservada não entra de novo',                   { reservada: true },                        'market', 'false|ASSET_BUSY|reservada'],
      ['o inicial EVOLUI — preso não é parado',         { origem: 'inicial' },                      'evoluir','true|null|null'],
      ['a criatura de bônus evolui',                    { proveniencia: 'promotional_bound' },      'evoluir','true|null|null'],
      ['em expedição evolui (é jogo normal)',           { emAtividade: true },                      'evoluir','true|null|null'],
      ['reservada NÃO evolui',                          { reservada: true },                        'evoluir','false|ASSET_BUSY|reservada'],
      ['em expedição não se solta',                     { emAtividade: true },                      'soltar', 'false|ASSET_BUSY|atividade'],
      ['reservada não se solta',                        { reservada: true },                        'soltar', 'false|ASSET_BUSY|reservada'],
      ['a de outro não se solta',                       { dono: 'ele' },                            'soltar', 'false|NOT_OWNER|null'],
    ];
    const erros = [];
    for (const [nome, fatos, acao, esperado] of casos) {
      const v = r(avaliarCriatura({ userId: 'eu', criatura: { ...CRIATURA, ...fatos }, conta: CONTA, acao, agora: AGORA }));
      if (v !== esperado) erros.push(`${nome}: ${v} ≠ ${esperado}`);
    }
    igual(erros.join(' | '), '', 'a política da criatura');
  });

  s.teste('motor · bandeira e conta vêm antes do ativo; a bandeira compõe com a de transferência', () => {
    const v = (conta, acao = 'trade') => r(avaliarCriatura({ userId: 'eu', criatura: CRIATURA, conta, acao, agora: AGORA }));
    igual(v({ pausada: false, bandeiras: {} }), 'false|FEATURE_DISABLED|p2p_trade_enabled', 'tudo desligado');
    igual(v({ pausada: false, bandeiras: { ...LIGADAS, p2p_transfer_enabled: false } }), 'false|FEATURE_DISABLED|p2p_trade_enabled', 'a troca ligada sem a transferência');
    igual(v({ pausada: false, bandeiras: { ...LIGADAS, player_market_enabled: false } }, 'market'), 'false|FEATURE_DISABLED|player_market_enabled', 'o mercado desligado');
    igual(v({ pausada: false, bandeiras: { ...LIGADAS, player_market_enabled: false } }, 'trade'), 'true|null|null', 'desligar o mercado desligou a troca');
    igual(v({ pausada: true, bandeiras: LIGADAS }), 'false|ACCOUNT_RESTRICTED|pausa', 'a conta em pausa negocia');
    igual(v({ pausada: true, bandeiras: {} }, 'evoluir'), 'true|null|null', 'a pausa do jogo de aposta parou a coleção');
    let erro = null;
    try { avaliarCriatura({ userId: 'eu', criatura: CRIATURA, conta: CONTA, acao: 'inventada', agora: AGORA }); } catch (e) { erro = e.message; }
    ok(/sem regra/.test(erro ?? ''), 'a ação que ninguém classificou foi respondida');
  });

  s.teste('motor · o cooldown de quem chegou: a fronteira nos dois lados do milissegundo', () => {
    const chegou = AGORA - COOLDOWN_RECEBIDA_MS;
    const em = agora => avaliarCriatura({ userId: 'eu', criatura: { ...CRIATURA, proveniencia: 'p2p_verified', recebidaEm: chegou }, conta: CONTA, acao: 'trade', agora });
    const antes = em(AGORA - 1);
    igual(`${antes.allowed}|${antes.reason_code}|${antes.available_at === AGORA}`, 'false|ASSET_COOLDOWN|true', 'um milissegundo antes do fim do cooldown');
    igual(em(AGORA).allowed, true, 'no fim do cooldown');
    igual(COOLDOWN_RECEBIDA_MS, 600_000, 'a baseline da spec §7 é 10 min');
    /* O cooldown limita circulação; nunca libera o que a origem prende. */
    igual(avaliarCriatura({ userId: 'eu', criatura: { ...CRIATURA, origem: 'inicial', recebidaEm: chegou }, conta: CONTA, acao: 'trade', agora: AGORA + 1 }).reason_code, 'ASSET_BOUND', 'o cooldown vencido liberou o inicial');
    igual(avaliarCriatura({ userId: 'eu', criatura: { ...CRIATURA, recebidaEm: AGORA }, conta: CONTA, acao: 'evoluir', agora: AGORA }).allowed, true, 'o cooldown parou um uso');
  });

  s.teste('motor · o item por lote e pelo catálogo', () => {
    const lote = (quantidade, classe = 'verified_earned', reservada = 0) => ({ quantidade, classe, reservada });
    const pedra = PACK.catalogo.find(i => i.porta === 'drop' && i.id !== PACK.material.id && i.id !== PACK.moedaPve.id).id;
    /* A fonte sem orçamento aprovado: um item de teste marcado pelo pack. A
       bola garantida tinha essa marca até a ST-14.4 dar orçamento à fonte
       dela — agora ela negocia pelo lote, como as outras. */
    const PACK_PRESO = { ...PACK, catalogo: [...PACK.catalogo, { id: 'preso-teste', faixa: 'raro', porta: 'drop', negociavel: false }] };
    const preso = 'preso-teste';
    const garantida = PACK.catalogo.find(i => i.guaranteed_capture === true)?.id;
    const v = (itemId, q, lotes, acao = 'trade') => r(avaliarItem({ pack: PACK_PRESO, itemId, quantidade: q, lotes, conta: CONTA, acao }));
    const casos = [
      ['bola do farm',                       [PACK.bolas[0].id, 3, [lote(5)]],                                  'true|null|null'],
      ['pedra do farm',                      [pedra, 1, [lote(1)]],                                             'true|null|null'],
      ['material do farm',                   [PACK.material.id, 10, [lote(10)]],                               'true|null|null'],
      ['estilhaço do farm',                  [`est:${pedra}`, 2, [lote(3)]],                                   'true|null|null'],
      ['só conta o lote limpo',              [PACK.bolas[0].id, 3, [lote(2), lote(5, 'promotional_bound')]],   'false|ASSET_BOUND|origem'],
      ['nem o legado',                       [PACK.bolas[0].id, 1, [lote(4, 'legacy_unverified')]],            'false|ASSET_BOUND|origem'],
      ['o reservado não conta',              [PACK.bolas[0].id, 3, [lote(4, 'verified_earned', 2)]],           'false|ASSET_BUSY|reservada'],
      ['não tem',                            [PACK.bolas[0].id, 9, [lote(4)]],                                  'false|INSUFFICIENT_ITEMS|null'],
      ['a moeda PvE nunca',                  [PACK.moedaPve.id, 1, [lote(500)]],                               'false|ASSET_BOUND|moeda_pve'],
      ['a fonte sem orçamento aprovado',     [preso, 1, [lote(1)]],                                            'false|ASSET_BOUND|fonte_nao_aprovada'],
      ['a garantida com fonte aprovada',     [garantida, 1, [lote(1)]],                                        'true|null|null'],
      ['item que o pack não conhece',        ['inventado', 1, [lote(1)]],                                      'false|ASSET_UNKNOWN|null'],
      ['quantidade quebrada',                [PACK.bolas[0].id, 1.5, [lote(4)]],                               'false|INSUFFICIENT_ITEMS|quantidade'],
      ['USAR a bola de bônus pode',          [PACK.bolas[0].id, 1, [lote(1, 'promotional_bound')], 'usar'],   'true|null|null'],
      ['usar o reservado não',               [PACK.bolas[0].id, 2, [lote(2, 'verified_earned', 1)], 'usar'], 'false|ASSET_BUSY|reservada'],
    ];
    ok(garantida, 'o pack não tem bola garantida');
    const erros = casos.map(([nome, args, esp]) => [nome, v(...args), esp]).filter(([, a, b]) => a !== b).map(([n, a, b]) => `${n}: ${a} ≠ ${b}`);
    igual(erros.join(' | '), '', 'a política do item');
    igual(tipoDoItem(PACK, 'est:inventado'), null, 'estilhaço de item que não existe');
  });

  s.teste('motor · a moeda: só PC-T elegível; bônus, comprado, competitivo e o legado nunca', () => {
    const v = (bucket, valor, elegivel, saldo = elegivel) => r(avaliarMoeda({ bucket, valor, elegivel, saldo, conta: CONTA, acao: 'trade' }));
    const casos = [
      [['transferivel', 50, 100], 'true|null|null'],
      [['transferivel', 50, 10], 'false|INSUFFICIENT_FUNDS|null'],
      [['transferivel', 50, 0, 100], 'false|ASSET_BOUND|pc_t_legado'],
      [['bonus', 50, 100], 'false|ASSET_BOUND|bonus'],
      [['comprado', 50, 100], 'false|ASSET_BOUND|comprado'],
      [['competitivo', 50, 100], 'false|ASSET_BOUND|competitivo'],
      [['transferivel', 0, 100], 'false|INSUFFICIENT_FUNDS|valor'],
    ];
    igual(casos.map(([a, e]) => v(...a) === e ? '' : `${a.join(',')}: ${v(...a)}`).filter(Boolean).join(' | '), '', 'a política da moeda');
    igual(r(avaliarPreso({ tipo: 'doce', conta: CONTA, acao: 'trade' })), 'false|ASSET_BOUND|doce', 'o doce negocia (L-222)');
    igual(r(avaliarPreso({ tipo: 'cosmetico', conta: CONTA, acao: 'market' })), 'false|ASSET_BOUND|cosmetico', 'o cosmético negocia');
    igual(Object.keys(ACOES).filter(a => ACOES[a].negocia).join(','), 'trade,market', 'as ações que negociam');
  });

  s.teste('servidor · o inicial preso, o farm livre, a criatura em expedição ocupada, a de outro negada', () => {
    const { db, uid, outro } = novo();
    ligar(db);
    const ini = gerar(db, { userId: uid, pack: PACK, dex: PACK.iniciais[0], origem: 'inicial' });
    const farm = gerar(db, { userId: uid, pack: PACK, dex: 16 });
    const bonus = gerar(db, { userId: uid, pack: PACK, dex: 19, proveniencia: 'promotional_bound' });
    const dele = gerar(db, { userId: outro, pack: PACK, dex: 16 });
    const v = (id, acao = 'trade', u = uid) => r(elegibilidadeDaCriatura(db, { userId: u, pack: PACK, id, acao, agora: AGORA, checkpoint: CHECKPOINT }));
    igual([v(ini.id), v(farm.id), v(bonus.id), v(dele.id), v('nao-existe')].join(' / '),
      'false|ASSET_BOUND|inicial / true|null|null / false|ASSET_BOUND|promotional_bound / false|NOT_OWNER|null / false|NOT_OWNER|null', 'a criatura no banco');
    db.prepare(`INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json, custo, iniciada_em, termina_em)
                VALUES ('x1', ?, ?, 'floresta', 'batida', ?, 0, ?, ?)`).run(uid, PACK.id, JSON.stringify([farm.id]), AGORA, AGORA + 3600_000);
    igual(`${v(farm.id)} / ${v(farm.id, 'evoluir')}`, 'false|ASSET_BUSY|atividade / true|null|null', 'a expedição não ocupou, ou ocupou demais');
    /* Mudar de dono não lava a origem: a mesma linha, outro dono, a mesma classe. */
    db.prepare(`UPDATE criaturas SET user_id = ? WHERE id = ?`).run(outro, bonus.id);
    igual(v(bonus.id, 'trade', outro), 'false|ASSET_BOUND|promotional_bound', 'mudar de dono lavou a origem');
  });

  s.teste('servidor · sem bandeira nada negocia; a pausa prende a conta; o relógio é do servidor', () => {
    const { db, uid } = novo();
    const farm = gerar(db, { userId: uid, pack: PACK, dex: 16 });
    igual(elegibilidadeDaCriatura(db, { userId: uid, pack: PACK, id: farm.id, acao: 'trade', agora: AGORA }).reason_code, 'FEATURE_DISABLED', 'negociou com as bandeiras de fábrica');
    ligar(db);
    igual(elegibilidadeDaCriatura(db, { userId: uid, pack: PACK, id: farm.id, acao: 'trade', agora: AGORA }).reason_code, 'FEATURE_DISABLED', 'a bandeira de valor ligou sem o checkpoint');
    pausar(db, { userId: uid, tipo: 'cooloff', duracao: '24h', agora: AGORA });
    igual(elegibilidadeDaCriatura(db, { userId: uid, pack: PACK, id: farm.id, acao: 'trade', agora: AGORA + 1, checkpoint: CHECKPOINT }).reason_code, 'ACCOUNT_RESTRICTED', 'a conta em pausa negociou');
    const t = readFileSync(new URL('../server/elegibilidade.mjs', import.meta.url), 'utf8');
    ok(!/Date\.now\(\)/.test(t), 'a elegibilidade lê um relógio que não é o do chamador no servidor');
  });

  s.teste('servidor · item, doce e moeda pela mesma política', () => {
    const { db, uid } = novo();
    ligar(db);
    creditarBolsa(db, uid, 'poke', 3, { fonte: 'colheita:x1' });
    creditarBolsa(db, uid, 'poke', 5, { classe: 'promotional_bound', fonte: 'teste' });
    const it = q => r(elegibilidadeDoItem(db, { userId: uid, pack: PACK, itemId: 'poke', quantidade: q, acao: 'trade', agora: AGORA, checkpoint: CHECKPOINT }));
    igual(`${it(3)} / ${it(4)} / ${it(9)}`, 'true|null|null / false|ASSET_BOUND|origem / false|INSUFFICIENT_ITEMS|null', 'o item no banco');
    igual(r(elegibilidadeDoPreso(db, { userId: uid, tipo: 'doce', acao: 'trade', agora: AGORA, checkpoint: CHECKPOINT })), 'false|ASSET_BOUND|doce', 'o doce no banco');
    creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 200, idem: 'pc-t', agora: AGORA });
    const m = (bucket, valor) => r(elegibilidadeDaMoeda(db, { userId: uid, bucket, valor, acao: 'trade', agora: AGORA, checkpoint: CHECKPOINT }));
    igual(`${m('transferivel', 150)} / ${m('transferivel', 250)} / ${m('bonus', 10)} / ${m('comprado', 10)}`,
      'true|null|null / false|INSUFFICIENT_FUNDS|null / false|ASSET_BOUND|bonus / false|ASSET_BOUND|comprado', 'a moeda no banco');
  });

  s.teste('soltar pergunta à política: em expedição recusa com o motivo de sempre', () => {
    const { db, uid } = novo();
    gerar(db, { userId: uid, pack: PACK, dex: 1, origem: 'inicial' });
    const c = gerar(db, { userId: uid, pack: PACK, dex: 16 });
    db.prepare(`UPDATE criaturas SET na_caixa = 1 WHERE id = ?`).run(c.id);
    db.prepare(`INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json, custo, iniciada_em, termina_em)
                VALUES ('x1', ?, ?, 'floresta', 'batida', ?, 0, ?, ?)`).run(uid, PACK.id, JSON.stringify([c.id]), AGORA, AGORA + 3600_000);
    let erro = null;
    try { soltarNaConta(db, { userId: uid, pack: PACK, id: c.id, agora: AGORA }); } catch (e) { erro = e.message; }
    ok(erro && db.prepare(`SELECT 1 FROM criaturas WHERE id = ?`).get(c.id), `soltou a criatura em expedição: ${erro}`);
    ok(/elegibilidadeDaCriatura\(db, \{[^}]*acao: 'soltar'/.test(readFileSync(new URL('../server/colecao.mjs', import.meta.url), 'utf8')), 'soltar não pergunta à política única');
  });

  return s;
}
