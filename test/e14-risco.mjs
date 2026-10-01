/* Q1/Q3/Q6 · E14 · A PROTEÇÃO ANTES DE NEGOCIAR (ST-14.14 · spec E14 §§7, 13)
 *
 * O aceite da ficha, em quatro frases:
 *
 *   congelar é do operador `economia`, com motivo, confirmação e auditoria —
 *   e a conta congelada não oferta, e o que ela já prendeu NÃO SOLTA sozinho
 *   nunca a própria conta, nunca a ligada
 *   uma troca aberta, dez anúncios, vinte ativos por lado
 *   a captura acima da banda conta pelo EVENTO, e não pelo dono de hoje
 *
 * E o kill switch: desligar a bandeira não prende ninguém — liberar continua.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar } from '../server/carteira.mjs';
import { criarOperador, ERRO_ADMIN } from '../server/admin.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { reservarOferta, liberarOferta, expirarVencidas, holdsAtivos } from '../server/reservas.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { congelar, descongelar, congelada, exigirPodeOfertar, ERRO_RISCO } from '../server/risco-mercado-jogadores.mjs';
import { avaliarLimites, avaliarContraparte, LIMITES_P2P } from '../engine/risco-mercado.mjs';
import { varrerSuspeitas, suspeitasAbertas } from '../server/antifraude.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const H = 3_600_000;
const CHECKPOINT = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const BANDEIRAS_P2P = ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'];
const ligar = (db, valor = 1) => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of BANDEIRAS_P2P)
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, ?, ?, 'teste')
                ON CONFLICT (nome) DO UPDATE SET ligada = excluded.ligada`).run(n, valor, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
};
function cena() {
  const db = abrirBanco(':memory:'); migrar(db); ligar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const [uid, outro, ligado] = ['risco1', 'risco2', 'risco3'].map(conta);
  const criaturas = Array.from({ length: 22 }, () => gerar(db, { userId: uid, pack: PACK, dex: 16 }).id);
  creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 300, idem: 'pc-r', agora: AGORA });
  const eco = criarOperador(db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
  const sup = criarOperador(db, { email: 'sup@x.test', papel: 'suporte', agora: AGORA }).id;
  return { db, uid, outro, ligado, criaturas, eco, sup };
}
const reservar = (c, id, ativos, { tipo = 'trade', contraparte, userId = c.uid } = {}) =>
  reservarOferta(c.db, { userId, pack: PACK, dono: { tipo, id, ...(contraparte ? { contraparte } : {}) }, ativos,
                         expiraEm: AGORA + 24 * H, agora: AGORA, checkpoint: CHECKPOINT });
const congelarJa = (c, userId = c.uid) => congelar(c.db, { operadorId: c.eco, userId, motivo: 'revisão de fraude', confirmado: true, agora: AGORA });

export async function suite() {
  const s = criarSuite('e14-risco');

  s.teste('a camada 0: os limites da spec §7 e a contraparte', () => {
    igual(`${LIMITES_P2P.trade}|${LIMITES_P2P.market}|${LIMITES_P2P.ativosPorLado}`, '1|10|20', 'os baselines do piloto');
    ok(avaliarLimites({ tipo: 'trade', abertas: 0, ativosNaOferta: 20 }).allowed, 'vinte ativos e nenhuma troca aberta foi recusado');
    igual(avaliarLimites({ tipo: 'trade', abertas: 0, ativosNaOferta: 21 }).detalhe, 'ativos_por_lado', 'o vigésimo primeiro ativo');
    igual(avaliarLimites({ tipo: 'trade', abertas: 1, ativosNaOferta: 1 }).detalhe, 'trade_abertas', 'a segunda troca aberta');
    ok(avaliarLimites({ tipo: 'market', abertas: 9, ativosNaOferta: 1 }).allowed, 'o décimo anúncio foi recusado');
    igual(avaliarLimites({ tipo: 'market', abertas: 10, ativosNaOferta: 1 }).reason_code, 'CAPACITY_EXCEEDED', 'o décimo primeiro anúncio');
    ok(recusa(() => avaliarLimites({ tipo: 'ativosPorLado', abertas: 0, ativosNaOferta: 1 })), 'um tipo que não é oferta ganhou limite');
    ok(recusa(() => avaliarLimites({ tipo: 'leilao', abertas: 0, ativosNaOferta: 1 })), 'um tipo desconhecido passou sem limite');
    igual(avaliarContraparte({ userId: 'a', outroId: 'a' }).detalhe, 'mesma_conta', 'a troca consigo mesmo');
    igual(avaliarContraparte({ userId: 'a', outroId: 'b', ligadas: ['b'] }).detalhe, 'conta_ligada', 'a troca com a conta ligada');
    ok(avaliarContraparte({ userId: 'a', outroId: 'c', ligadas: ['b'] }).allowed, 'a contraparte livre foi recusada');
    ok(avaliarContraparte({ userId: 'a', outroId: null }).allowed, 'o anúncio sem comprador foi recusado');
  });

  s.teste('congelar é do papel economia, com motivo, confirmação e auditoria — e uma vez só', () => {
    const c = cena();
    const aud = () => c.db.prepare(`SELECT acao, alvo, de, para, motivo FROM admin_auditoria WHERE acao LIKE 'p2p.%' ORDER BY criado_em, rowid`).all();
    igual(recusa(() => congelar(c.db, { operadorId: c.sup, userId: c.uid, motivo: 'x', confirmado: true, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_PAPEL, 'o suporte congelou');
    igual(recusa(() => congelar(c.db, { operadorId: c.eco, userId: c.uid, motivo: '  ', confirmado: true, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_MOTIVO, 'congelou sem motivo');
    igual(recusa(() => congelar(c.db, { operadorId: c.eco, userId: c.uid, motivo: 'x', confirmado: false, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_CONFIRMAR, 'congelou sem confirmação');
    ok(!congelada(c.db, c.uid) && aud().length === 0, 'a recusa deixou a conta congelada ou auditou o que não aconteceu');
    congelarJa(c);
    ok(congelada(c.db, c.uid), 'a conta não ficou congelada');
    igual(recusa(() => congelarJa(c))?.codigo, ERRO_RISCO.JA, 'congelou duas vezes');
    igual(recusa(() => descongelar(c.db, { operadorId: c.sup, userId: c.uid, motivo: 'x', confirmado: true, agora: AGORA + H }))?.codigo, ERRO_ADMIN.SEM_PAPEL, 'o suporte descongelou');
    descongelar(c.db, { operadorId: c.eco, userId: c.uid, motivo: 'revisada, limpa', confirmado: true, agora: AGORA + H });
    ok(!congelada(c.db, c.uid), 'a conta não descongelou');
    igual(recusa(() => descongelar(c.db, { operadorId: c.eco, userId: c.uid, motivo: 'x', confirmado: true, agora: AGORA + 2 * H }))?.codigo, ERRO_RISCO.NAO, 'descongelou o que não estava congelado');
    const linhas = aud();
    /* A auditoria é gravada ANTES de executar: a tentativa duplicada também
       fica — é exatamente a que interessa depois. */
    igual(linhas.map(l => l.acao).join(), 'p2p.congelar,p2p.congelar,p2p.descongelar,p2p.descongelar', 'a auditoria das ações');
    igual(`${linhas[0].alvo}|${linhas[0].de}|${linhas[0].para}|${linhas[0].motivo}`, `${c.uid}|livre|congelada|revisão de fraude`, 'a linha de auditoria');
    const hist = c.db.prepare(`SELECT motivo, por, levantado_por FROM p2p_congelamentos WHERE user_id = ?`).all(c.uid);
    igual(`${hist.length}|${hist[0].por}|${hist[0].levantado_por}`, `1|${c.eco}|${c.eco}`, 'o congelamento não guarda quem pôs e quem tirou');
    /* um congelamento ativo por conta, pelo BANCO */
    congelarJa(c);
    ok(/UNIQUE/.test(recusa(() => c.db.prepare(`INSERT INTO p2p_congelamentos (user_id, motivo, por, em) VALUES (?, 'y', ?, ?)`).run(c.uid, c.eco, AGORA))?.message ?? ''), 'o banco aceitou dois congelamentos ativos');
    ok(/CHECK/.test(recusa(() => c.db.prepare(`INSERT INTO p2p_congelamentos (user_id, motivo, por, em) VALUES (?, '', ?, ?)`).run(c.outro, c.eco, AGORA))?.message ?? ''), 'o banco aceitou congelamento sem motivo');
  });

  s.teste('a conta congelada: a política diz em revisão, não oferta, e o que prendeu fica preso até descongelar', () => {
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.criaturas[0]], moeda: 50 });
    congelarJa(c);
    const p = elegibilidadeDaCriatura(c.db, { userId: c.uid, pack: PACK, id: c.criaturas[1], acao: 'trade', agora: AGORA, checkpoint: CHECKPOINT });
    igual(`${p.reason_code}|${p.detalhe}`, 'ACCOUNT_RESTRICTED|congelada', 'a política única não sabe do congelamento');
    /* A PORTA DA OFERTA recusa sozinha — e não só porque a política de cada
       ativo também recusa: a oferta só de moeda, ou a de amanhã com um ativo
       que a política não cubra, passa por ela. */
    igual(recusa(() => exigirPodeOfertar(c.db, { userId: c.uid, tipo: 'market', ativosNaOferta: 1 }))?.codigo, ERRO_RISCO.RECUSADA, 'a porta da oferta não sabe do congelamento');
    const nova = recusa(() => reservar(c, 'm-1', { criaturas: [c.criaturas[1]] }, { tipo: 'market' }));
    igual(nova?.reason_code, 'ACCOUNT_RESTRICTED', `a conta congelada reservou: ${nova?.message}`);
    igual(holdsAtivos(c.db, { tipo: 'market', id: 'm-1' }).length, 0, 'a recusa deixou reserva');
    /* O QUE ESTÁ EM REVISÃO NÃO SAI DO ESCROW SOZINHO: nem o cancelamento,
       nem o vencimento — soltar seria devolver o que a revisão segura. */
    liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA + H });
    expirarVencidas(c.db, { agora: AGORA + 48 * H });
    igual(holdsAtivos(c.db, { tipo: 'trade', id: 'of-1' }).length, 2, 'a reserva da conta congelada soltou');
    descongelar(c.db, { operadorId: c.eco, userId: c.uid, motivo: 'limpa', confirmado: true, agora: AGORA + 49 * H });
    expirarVencidas(c.db, { agora: AGORA + 50 * H });
    igual(holdsAtivos(c.db, { tipo: 'trade', id: 'of-1' }).length, 0, 'descongelada, a reserva vencida não soltou');
  });

  s.teste('nunca a própria conta, nunca a ligada, nunca a congelada do outro lado', () => {
    const c = cena();
    igual(recusa(() => reservar(c, 'of-a', { criaturas: [c.criaturas[0]] }, { contraparte: c.uid }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a troca consigo mesmo');
    ligarContas(c.db, { userId: c.uid, outroId: c.ligado, sinal: 'dispositivo', agora: AGORA });
    const lig = recusa(() => reservar(c, 'of-b', { criaturas: [c.criaturas[0]] }, { contraparte: c.ligado }));
    ok(lig?.reason_code === 'ACCOUNT_RESTRICTED' && /conta_ligada/.test(lig.message), `a troca com a conta ligada: ${lig?.message}`);
    congelarJa(c, c.outro);
    igual(recusa(() => reservar(c, 'of-c', { criaturas: [c.criaturas[0]] }, { contraparte: c.outro }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a troca com a conta congelada');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM asset_holds`).get().n, 0, 'uma recusa deixou reserva');
    descongelar(c.db, { operadorId: c.eco, userId: c.outro, motivo: 'limpa', confirmado: true, agora: AGORA });
    igual(reservar(c, 'of-d', { criaturas: [c.criaturas[0]] }, { contraparte: c.outro }).ids.length, 1, 'a contraparte livre foi recusada');
  });

  s.teste('uma troca aberta, dez anúncios, vinte ativos por lado — e liberar devolve a vaga', () => {
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.criaturas[0]] });
    igual(recusa(() => reservar(c, 'of-2', { criaturas: [c.criaturas[1]] }))?.reason_code, 'CAPACITY_EXCEEDED', 'a segunda troca aberta');
    /* o limite conta OFERTAS, e não reservas: o primeiro anúncio prende duas
       criaturas e continua sendo um */
    reservar(c, 'm-0', { criaturas: [c.criaturas[1], c.criaturas[12]] }, { tipo: 'market' });
    for (let k = 1; k < 10; k++) reservar(c, `m-${k}`, { criaturas: [c.criaturas[1 + k]] }, { tipo: 'market' });
    igual(recusa(() => reservar(c, 'm-10', { criaturas: [c.criaturas[11]] }, { tipo: 'market' }))?.reason_code, 'CAPACITY_EXCEEDED', 'o décimo primeiro anúncio');
    liberarOferta(c.db, { dono: { tipo: 'market', id: 'm-0' }, agora: AGORA });
    igual(reservar(c, 'm-10', { criaturas: [c.criaturas[11]] }, { tipo: 'market' }).ids.length, 1, 'liberar não devolveu a vaga');
    liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA });
    /* vinte e um ativos de um lado: dez criaturas + a moeda + dez repetidas
       não contam em dobro — a criatura repetida é UMA */
    const vinte = c.criaturas.slice(12, 22);
    igual(recusa(() => exigirPodeOfertar(c.db, { userId: c.uid, tipo: 'trade', ativosNaOferta: 21 }))?.reason_code, 'CAPACITY_EXCEEDED', 'vinte e um ativos');
    igual(reservar(c, 'of-3', { criaturas: [...vinte, ...vinte], moeda: 10 }).ids.length, 11, 'onze ativos (dez repetidos) foram recusados');
  });

  s.teste('o kill switch não prende ninguém: bandeira desligada recusa ofertar e deixa liberar', () => {
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.criaturas[0]] });
    ligar(c.db, 0);
    ok(recusa(() => reservar(c, 'm-1', { criaturas: [c.criaturas[1]] }, { tipo: 'market' })), 'ofertou com a bandeira desligada');
    liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA });
    igual(holdsAtivos(c.db, { tipo: 'trade', id: 'of-1' }).length, 0, 'a bandeira desligada prendeu a reserva');
  });

  s.teste('a captura acima da banda conta pelo EVENTO: soltar não apaga, receber não é capturar', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const T = Date.now();
    const u = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T }).id;
    const [farm, recebe] = ['farmCap', 'recebeCap'].map(u);
    const acao = (user, t) => db.prepare(`INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json, custo, iniciada_em, termina_em, colhida_em, semente, encontros)
                                          VALUES (?, ?, 'p', 'floresta', 'batida', '[]', 0, ?, ?, ?, 'x', 0)`).run(`${user}-${t}`, user, t, t + 1, t + 1);
    acao(farm, T - H); acao(recebe, T - 2 * H);
    const ids = Array.from({ length: 150 }, () => gerar(db, { userId: farm, pack: PACK, dex: 16 }).id);
    /* metade "solta" e metade "passada" a outra conta: a troca muda o dono,
       e o evento de nascimento continua dizendo quem capturou */
    db.prepare(`UPDATE criaturas SET user_id = ? WHERE id IN (SELECT id FROM criaturas WHERE user_id = ? LIMIT 75)`).run(recebe, farm);
    db.prepare(`DELETE FROM criaturas WHERE user_id = ?`).run(farm);
    igual(db.prepare(`SELECT COUNT(*) n FROM criaturas WHERE user_id = ?`).get(farm).n, 0, 'a cena: o farm ficou com criaturas');
    igual(ids.length, 150, 'a cena');
    varrerSuspeitas(db, { agora: T });
    const cap = suspeitasAbertas(db).filter(x => x.sinal === 'captura');
    igual(cap.map(x => x.conta_a).join(), farm, `a captura acima da banda: ${JSON.stringify(cap)}`);
  });

  s.teste('pela porta: só o operador congela; a sessão de jogador não chega', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => AGORA });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const { definirCredencial, entrarOperador, segredoTotp, codigoTotp } = await import('../server/admin-auth.mjs');
      const sessao = papel => {
        const op = criarOperador(srv.db, { email: `${papel}@x.test`, papel, agora: AGORA });
        const seg = segredoTotp(), senha = 'senha-de-operador-bem-longa-1';
        definirCredencial(srv.db, { operadorId: op.id, senha, segredoTotp: seg, agora: AGORA });
        return { authorization: `Bearer ${entrarOperador(srv.db, { email: op.email, senha, codigo: codigoTotp(seg, AGORA), agora: AGORA }).token}` };
      };
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(),
        body: JSON.stringify({ username: 'Risco0', email: 'risco0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const alvo = srv.db.prepare(`SELECT id FROM users WHERE email = 'risco0@x.test'`).get().id;
      const pedir = (cab, corpo) => fetch(url('/api/admin/p2p/congelamento'), { method: 'POST', headers: Hd(cab), body: JSON.stringify({ userId: alvo, motivo: 'revisão', confirmado: true, ...corpo }) });
      igual((await pedir({ authorization: `Bearer ${cad.sessao}` }, { congelar: true })).status, 401, 'a sessão de jogador congelou');
      igual((await pedir({}, { congelar: true })).status, 401, 'sem sessão nenhuma');
      igual((await pedir(sessao('suporte'), { congelar: true })).status, 403, 'o suporte congelou pela porta');
      const eco = sessao('economia');
      igual((await pedir(eco, { congelar: true, confirmado: false })).status, 400, 'congelou pela porta sem confirmação');
      igual((await pedir(eco, { congelar: true })).status, 200, 'a economia não congelou pela porta');
      ok(congelada(srv.db, alvo), 'a porta disse 200 e não congelou');
      igual((await pedir(eco, { congelar: true })).status, 400, 'congelou duas vezes pela porta');
      igual((await pedir(eco, { congelar: false })).status, 200, 'não descongelou pela porta');
      ok(!congelada(srv.db, alvo), 'a porta disse 200 e não descongelou');
    } finally { await srv.fechar(); }
  });

  s.teste('a migração sobe e desce limpa', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'risco-st14.14');
    ok(m, 'a migração não existe');
    igual(MIGRACOES.at(-1).nome, 'risco-st14.14', 'a migração não está no fim — a lista é append-only');
    const tem = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'p2p_congelamentos'`).get().n;
    m.desce(db); igual(tem(), 0, 'a descida deixou restos');
    m.sobe(db); igual(tem(), 1, 'a subida não refez');
  });

  return s;
}
