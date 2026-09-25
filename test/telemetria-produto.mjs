/* Q1/Q6/Q9 · A TELEMETRIA MÍNIMA DO PILOTO (ST-7.1a, OBS-01).
 *
 * O cliente juntava eventos num buffer em MEMÓRIA e nunca os mandava: o piloto
 * com amigos não mediria nada do idle, que é justamente a parte que mora só no
 * navegador. E o servidor só emitia os eventos de proteção — aposta e compra
 * não deixavam rastro de produto.
 *
 * O que este arquivo trava:
 *
 *   o evento repetido conta UMA vez   chave por usuário+evento, índice único
 *   o cliente não inventa evento      lista fechada; nome fora dela é 400
 *   o cliente não diz quem ele é      o usuário vem da SESSÃO, nunca do corpo
 *   o servidor anota o que ele faz    compra e aposta, com a chave do próprio fato
 *   a retenção D1/D7 sai do banco     coorte pelo dia de cadastro (Brasília)
 *   o cliente relata o ESTADO         o dia de runs e expedições, com chave
 *                                     determinística — reenviar não duplica
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { emitir, receberDoCliente, DO_CLIENTE, ERRO_TELEMETRIA } from '../server/telemetria.mjs';
import { retencao } from '../server/coorte.mjs';
import { comprar } from '../server/cosmeticos.mjs';
import { catalogo } from '../app/modules/cosmeticos.mjs';
import { eventosDoEstado, relatar } from '../app/modules/telemetria-servidor.mjs';

const DIA = 86400e3;
const T0 = Date.UTC(2026, 8, 1, 15);   // meio-dia de Brasília
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

function banco() {
  const db = abrirBanco(':memory:'); migrar(db);
  return db;
}
function conta(db, nome, agora = T0) {
  return cadastrar(db, { username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1',
                         nascimento: '1990-01-01', agora }).id;
}
const linhas = (db, nome) => db.prepare('SELECT * FROM telemetry_events WHERE nome = ?').all(nome);

export function suite() {
  const s = criarSuite('telemetria-produto');

  s.teste('o mesmo evento com a mesma chave conta UMA vez', () => {
    const db = banco(); const u = conta(db, 'a');
    const a = emitir(db, { nome: 'run_harvested', userId: u, chave: 'run:1', campos: { estagio: 1 }, agora: T0 });
    const b = emitir(db, { nome: 'run_harvested', userId: u, chave: 'run:1', campos: { estagio: 1 }, agora: T0 + 5 });
    igual(linhas(db, 'run_harvested').length, 1, 'o reenvio contou duas vezes');
    igual(a, b, 'o reenvio não devolveu o id do evento que já existia');
    emitir(db, { nome: 'run_harvested', userId: u, chave: 'run:2', agora: T0 });
    igual(linhas(db, 'run_harvested').length, 2, 'uma chave nova foi engolida');
  });

  s.teste('o cliente só relata o que está na lista, e o usuário vem da sessão', () => {
    const db = banco(); const u = conta(db, 'b'), outro = conta(db, 'c');
    const r = receberDoCliente(db, { userId: u, agora: T0, eventos: [
      { nome: 'run_harvested', chave: 'run:9', campos: { estagio: 2, user_id: outro, lixo: { a: 1 } } },
      { nome: 'bet_placed', chave: 'x', campos: {} },
    ] });
    igual(r.aceitos, 1, 'o cliente relatou um evento de SERVIDOR (bet_placed) e ele foi aceito');
    igual(r.recusados, 1, 'a recusa não foi contada');
    const [l] = linhas(db, 'run_harvested');
    igual(l.user_id, u, 'o evento ficou com outro usuário');
    const campos = JSON.parse(l.campos);
    ok(!('user_id' in campos) && !('lixo' in campos), `campos fora do formato entraram: ${l.campos}`);
    ok(DO_CLIENTE.includes('session_started') && !DO_CLIENTE.includes('bet_placed'), 'a lista do cliente está errada');
  });

  s.teste('o lote do cliente tem teto, e evento sem chave é recusado', () => {
    const db = banco(); const u = conta(db, 'd');
    const muitos = Array.from({ length: 80 }, (_, i) => ({ nome: 'run_harvested', chave: 'r' + i, campos: {} }));
    let erro = null;
    try { receberDoCliente(db, { userId: u, agora: T0, eventos: muitos }); } catch (e) { erro = e; }
    igual(erro?.codigo, ERRO_TELEMETRIA.LOTE, 'um lote de 80 eventos foi aceito — o cliente enche o banco');
    const r = receberDoCliente(db, { userId: u, agora: T0, eventos: [{ nome: 'run_harvested', campos: {} }] });
    igual(r.aceitos, 0, 'evento sem chave foi aceito — reenviar duplicaria');
  });

  s.teste('a compra de cosmético é anotada pelo SERVIDOR, uma vez por compra', () => {
    const db = banco(); const u = conta(db, 'e');
    creditar(db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: 'w', agora: T0 });
    const peca = catalogo().find(p => p.familia === 'moldura' && p.procedencia === 'loja');
    comprar(db, { userId: u, familia: 'moldura', id: peca.id, chaveIdem: 'k', agora: T0 });
    comprar(db, { userId: u, familia: 'moldura', id: peca.id, chaveIdem: 'k', agora: T0 });
    const l = linhas(db, 'cosmetic_purchased');
    igual(l.length, 1, `a compra foi anotada ${l.length} vez(es)`);
    igual(JSON.parse(l[0].campos).preco, peca.preco, 'o evento não traz o preço cobrado');
    ok(/anotar\(db, \{ nome: 'bet_placed'/.test(fonte('../server/rotas.mjs')), 'a aposta não é anotada pelo servidor');
  });

  s.teste('a retenção D1/D7 sai do banco, por coorte de cadastro', () => {
    const db = banco();
    const a = conta(db, 'r1'), b = conta(db, 'r2'); conta(db, 'r3');
    emitir(db, { nome: 'session_started', userId: a, chave: 'd1', agora: T0 + DIA });
    emitir(db, { nome: 'session_started', userId: b, chave: 'd7', agora: T0 + 7 * DIA });
    const r = retencao(db, { agora: T0 + 10 * DIA });
    const c = r.coortes[0];
    igual(c.n, 3, 'a coorte do dia não tem os três cadastros');
    igual(c.d1, 1, 'D1 não contou quem voltou no dia seguinte');
    igual(c.d7, 1, 'D7 não contou quem voltou no sétimo dia');
    igual(retencao(db, { agora: T0 + 3 * DIA }).coortes[0].d7, null,
      'D7 de uma coorte que ainda não fez sete dias saiu como zero — é "ainda não", e não "ninguém"');
    ok(/retencao\(/.test(fonte('../server/politica.mjs')), 'o painel do operador não mostra a retenção');
  });

  s.teste('o cliente relata o ESTADO do dia, com chave determinística', () => {
    const e = { avancos: [{ colhidaEm: T0 - 3600e3, encontros: 4, bioma: 'floresta', estagio: 2 },
                          { colhidaEm: T0 - 2 * DIA, encontros: 1, bioma: 'praia', estagio: 1 }],
                expedicoes: [{ id: 'x1', colhidaEm: T0 - 60e3, bioma: 'campo', perfil: 'vigilia', encontros: 3 },
                             { id: 'x2', colhidaEm: null, bioma: 'campo', perfil: 'trilha' }] };
    const ev = eventosDoEstado(e, T0);
    igual(ev.map(x => x.chave).sort().join(','), `exp:x1,run:${T0 - 3600e3}`,
      'o relato não é o dia de runs e expedições COLHIDAS, com a chave do próprio fato');
    igual(JSON.stringify(eventosDoEstado(e, T0)), JSON.stringify(ev), 'duas leituras do mesmo estado deram relatos diferentes');
  });

  s.teste('sem sessão o cliente não manda nada; com sessão, manda e engole falha', async () => {
    const chamadas = [];
    const semConta = { temSessao: () => false, post: async (...a) => chamadas.push(a) };
    igual(await relatar(semConta, [{ nome: 'session_started', chave: 'd' }]), false, 'relatou sem conta');
    igual(chamadas.length, 0, 'sem conta, saiu um pedido');
    const comConta = { temSessao: () => true, post: async () => { throw new Error('rede'); } };
    igual(await relatar(comConta, [{ nome: 'session_started', chave: 'd' }]), false,
      'uma falha de rede no relato derrubou quem chamou — telemetria nunca pode quebrar o jogo');
    const t = fonte('../app/modules/avanco-tela.mjs'), p = fonte('../app/modules/perfil-dados.mjs');
    ok(/relatar\(api, eventosDoEstado\(/.test(t), 'a colheita da run não relata o dia');
    ok(/relatar\(api, \[\{ nome: 'session_started'/.test(p) && /relatar\(api, eventosDoEstado\(/.test(p),
      'o login não relata a sessão nem põe o dia em dia');
  });

  return s;
}
