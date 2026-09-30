/* Q1/Q6 · AS BANDEIRAS DE FEATURE (ST-11.9 · Spec §15.3, §25.1)
 *
 * O aceite da ficha, em três frases:
 *
 *   tudo que move valor NASCE DESLIGADO
 *   LIGAR exige o marcador do §25.1 — no padrão do `ARTE_EMPRESTADA_DE`
 *   toda mudança é AUDITADA, inclusive a recusada
 *
 * E a porta que a bandeira fecha de verdade: `league_enabled` desligada
 * recusa a partida e a busca (503), sem mexer no que já foi jogado.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { criarOperador } from '../server/admin.mjs';
import { bandeiraLigada, bandeiras, mudarBandeira, exigirBandeira, ERRO_BANDEIRA } from '../server/feature-flags.mjs';
import { BANDEIRAS, CHECKPOINT_25_1, checkpointValido, recusaDaMudanca, estadoDa } from '../engine/feature-flags.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 9, 1, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const doc = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const VALOR = Object.keys(BANDEIRAS).filter(n => BANDEIRAS[n].valor);

export async function suite() {
  const s = criarSuite('feature-flags');

  s.teste('o catálogo do §15.3: o que move DINHEIRO nasce desligado; o stake de moeda simulada, liberado pelo dono', () => {
    /* 10 do §15.3 + 2 da E14 (Spec §31, ST-14.0B2): a troca e o Market de jogadores. */
    igual(Object.keys(BANDEIRAS).length, 12, 'o catálogo não é o do §15.3 + E14');
    igual(VALOR.sort().join(), 'cashout_enabled,competitive_exchange_enabled,league_stake_enabled,p2p_trade_enabled,p2p_transfer_enabled,player_market_enabled,real_value_currency_enabled,season_pass_enabled', 'as de valor');
    /* DEC-16 (o dono, 30/09: "Pode ligar"): o stake da Liga move só moeda
       SIMULADA — bônus, sem saque, sem transferência. Ele é liberado pela
       decisão dele; o §25.1 continua cobrando tudo que toca dinheiro real. */
    const liberadas = VALOR.filter(n => BANDEIRAS[n].liberadaPor);
    igual(liberadas.join(), 'league_stake_enabled', 'bandeira de valor liberada sem ser o stake de moeda simulada');
    for (const n of VALOR) igual(BANDEIRAS[n].padrao, !!BANDEIRAS[n].liberadaPor, `${n}: o padrão não segue a liberação`);
    for (const n of liberadas) {
      ok(checkpointValido(BANDEIRAS[n].liberadaPor), `${n} liberada por "${BANDEIRAS[n].liberadaPor}", que não nomeia decisão`);
      const linha = doc('../docs/ROADMAP.md').split('\n').find(l => l.includes(`**${BANDEIRAS[n].liberadaPor}**`));
      ok(linha && /moeda simulada/.test(linha), `${BANDEIRAS[n].liberadaPor} não está nas decisões do ROADMAP dizendo "moeda simulada"`);
    }
    for (const n of ['cashout_enabled', 'real_value_currency_enabled', 'p2p_transfer_enabled', 'competitive_exchange_enabled', 'p2p_trade_enabled', 'player_market_enabled']) ok(!BANDEIRAS[n].liberadaPor, `${n} liberada sem o §25.1 — é dinheiro real`);
    igual(estadoDa('league_enabled', undefined, null), true, 'a Liga nasce desligada');
    igual(estadoDa('nao_existe', 1, 'DEC-99'), false, 'a bandeira desconhecida lê ligada');
  });

  s.teste('ligar valor exige o marcador do §25.1; desligar nunca exige', () => {
    ok(/§25\.1/.test(recusaDaMudanca('p2p_transfer_enabled', true, null) ?? ''), 'ligou a transferência sem o checkpoint');
    ok(/§25\.1/.test(recusaDaMudanca('p2p_transfer_enabled', true, 'ok') ?? ''), 'um marcador que não nomeia decisão valeu');
    igual(recusaDaMudanca('p2p_transfer_enabled', true, 'DEC-31'), null, 'o marcador preenchido não liberou');
    igual(recusaDaMudanca('p2p_transfer_enabled', false, null), null, 'desligar exigiu o checkpoint');
    /* O stake de moeda simulada: a decisão do dono basta para ligar, e desligar continua livre. */
    igual(recusaDaMudanca('league_stake_enabled', true, null), null, 'o stake liberado pela DEC-16 pediu o checkpoint do dinheiro real');
    igual(recusaDaMudanca('league_stake_enabled', false, null), null, 'desligar o stake exigiu algo');
    igual(`${estadoDa('league_stake_enabled', undefined, null)}|${estadoDa('league_stake_enabled', 0, null)}|${estadoDa('league_stake_enabled', 1, null)}`, 'true|false|true', 'o stake: nasce ligado, o operador desliga, e religa');
    igual(recusaDaMudanca('league_enabled', false, null), null, 'a bandeira de produto exigiu o checkpoint');
    ok(recusaDaMudanca('league_enabled', 'sim', null), 'um estado que não é booleano passou');
    ok(!checkpointValido('DEC-') && checkpointValido('DEC-02'), 'a forma do marcador');
    /* A linha gravada ligada sem o marcador (o banco de outra época) lê desligada. */
    igual(estadoDa('cashout_enabled', 1, null), false, 'a linha gravada ligou o saque por fora');
    igual(estadoDa('cashout_enabled', 1, 'DEC-31'), true, 'com o marcador, a linha gravada não vale');
  });

  s.teste('o marcador, quando preenchido, aponta uma decisão escrita (o padrão do ARTE_EMPRESTADA_DE)', () => {
    if (CHECKPOINT_25_1 === null) return ok(true);
    ok(checkpointValido(CHECKPOINT_25_1), `CHECKPOINT_25_1 = ${CHECKPOINT_25_1} não nomeia uma decisão`);
    const linha = doc('../docs/ROADMAP.md').split('\n').find(l => l.includes(CHECKPOINT_25_1) && /25\.1/.test(l));
    ok(linha, `${CHECKPOINT_25_1} não está no ROADMAP com o §25.1 — o marcador sem registro liga o dinheiro no escuro`);
  });

  function cena() {
    const db = abrirBanco(':memory:'); migrar(db);
    const dono = criarOperador(db, { email: 'dono@x.test', papel: 'dono', agora: T0 });
    const eco = criarOperador(db, { email: 'eco@x.test', papel: 'economia', agora: T0 });
    return { db, dono, eco };
  }
  const auditoria = db => db.prepare(`SELECT acao, alvo, de, para, motivo FROM admin_auditoria WHERE acao = 'bandeira.definir' ORDER BY criado_em, rowid`).all();

  s.teste('no servidor: o dono muda, com motivo e confirmação, e o registro guarda de e para', () => {
    const c = cena();
    const muda = (x = {}) => mudarBandeira(c.db, { operadorId: c.dono.id, nome: 'league_enabled', ligada: false, motivo: 'manutenção', confirmado: true, agora: T0, ...x });
    igual(recusa(() => muda({ operadorId: c.eco.id }))?.codigo, 'papel_insuficiente', 'o papel economia mudou uma bandeira');
    igual(recusa(() => muda({ motivo: ' ' }))?.codigo, 'motivo_obrigatorio', 'mudou sem motivo');
    igual(recusa(() => muda({ confirmado: false }))?.codigo, 'confirmacao_obrigatoria', 'mudou sem confirmar');
    igual(recusa(() => muda({ nome: 'x_enabled' }))?.codigo, 'acao_desconhecida', 'mudou uma bandeira que não existe');
    igual(bandeiraLigada(c.db, 'league_enabled'), true, 'uma recusa mudou a bandeira');
    igual(JSON.stringify(muda()), '{"nome":"league_enabled","ligada":false}', 'o dono não desligou');
    igual(bandeiraLigada(c.db, 'league_enabled'), false, 'o estado gravado não é o lido');
    igual(recusa(() => exigirBandeira(c.db, 'league_enabled'))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a porta não fechou');
    muda({ ligada: true, agora: T0 + 1 });
    igual(JSON.stringify(auditoria(c.db).map(a => `${a.alvo}:${a.de}>${a.para}`)), '["league_enabled:true>false","league_enabled:false>true"]', 'o registro de/para');
  });

  s.teste('ligar o dinheiro sem o checkpoint é recusado — e a TENTATIVA fica registrada', () => {
    const c = cena();
    const tenta = () => mudarBandeira(c.db, { operadorId: c.dono.id, nome: 'cashout_enabled', ligada: true, motivo: 'testar', confirmado: true, agora: T0 });
    igual(recusa(tenta)?.codigo, ERRO_BANDEIRA.RECUSADA, 'o dono ligou o saque sem o §25.1');
    igual(bandeiraLigada(c.db, 'cashout_enabled'), false, 'o saque ficou ligado');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM feature_flags`).get().n, 0, 'a recusa gravou estado');
    igual(JSON.stringify(auditoria(c.db).map(a => `${a.alvo}:${a.para}`)), '["cashout_enabled:true"]', 'a tentativa recusada não ficou registrada');
    /* Com o marcador, liga — e a leitura sem ele (o código de hoje) continua desligada. */
    mudarBandeira(c.db, { operadorId: c.dono.id, nome: 'cashout_enabled', ligada: true, motivo: 'checkpoint feito', confirmado: true, agora: T0 + 1, checkpoint: 'DEC-31' });
    igual(`${bandeiraLigada(c.db, 'cashout_enabled', 'DEC-31')}|${bandeiraLigada(c.db, 'cashout_enabled')}`, 'true|false', 'o estado com e sem o marcador');
    /* No painel, de valor ligado só o stake de moeda simulada — nunca dinheiro real sem o marcador. */
    igual(bandeiras(c.db).filter(b => b.ligada && b.valor).map(b => b.nome).join(), 'league_stake_enabled', 'o painel mostra dinheiro real ligado sem o marcador');
  });

  s.teste('o stake da Liga (DEC-16): nasce ligado, o dono desliga na hora e religa sem checkpoint', () => {
    const c = cena();
    igual(bandeiraLigada(c.db, 'league_stake_enabled'), true, 'o stake liberado pelo dono nasce desligado');
    mudarBandeira(c.db, { operadorId: c.dono.id, nome: 'league_stake_enabled', ligada: false, motivo: 'pausa', confirmado: true, agora: T0 });
    igual(bandeiraLigada(c.db, 'league_stake_enabled'), false, 'a porta de emergência não fechou o stake');
    mudarBandeira(c.db, { operadorId: c.dono.id, nome: 'league_stake_enabled', ligada: true, motivo: 'volta', confirmado: true, agora: T0 + 1 });
    igual(bandeiraLigada(c.db, 'league_stake_enabled'), true, 'religar o stake pediu o checkpoint do dinheiro real');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'bandeiras-st11.9');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'feature_flags'`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 1, 'a subida não refez');
  });

  s.teste('pela porta: o operador lê e muda; a Liga desligada recusa a partida com 503', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const H = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const { definirCredencial, entrarOperador, segredoTotp, codigoTotp } = await import('../server/admin-auth.mjs');
      const op = criarOperador(srv.db, { email: 'dono@x.test', papel: 'dono', agora: T0 });
      const seg = segredoTotp(), senha = 'senha-de-operador-bem-longa-1';
      definirCredencial(srv.db, { operadorId: op.id, senha, segredoTotp: seg, agora: T0 });
      const { token } = entrarOperador(srv.db, { email: op.email, senha, codigo: codigoTotp(seg, T0), agora: T0 });
      const adm = { authorization: `Bearer ${token}` };
      igual((await fetch(url('/api/admin/bandeiras'), { headers: H() })).status, 401, 'as bandeiras sem operador');
      const lista = await fetch(url('/api/admin/bandeiras'), { headers: H(adm) }).then(r => r.json());
      igual(lista.bandeiras.find(b => b.nome === 'league_enabled')?.ligada, true, 'a lista pela porta');
      const saque = await fetch(url('/api/admin/bandeira'), { method: 'POST', headers: H(adm), body: JSON.stringify({ nome: 'cashout_enabled', ligada: true, motivo: 'x', confirmado: true }) });
      igual(saque.status, 409, 'o saque sem o §25.1 pela porta');
      const stake = await fetch(url('/api/admin/bandeira'), { method: 'POST', headers: H(adm), body: JSON.stringify({ nome: 'league_stake_enabled', ligada: false, motivo: 'pausa', confirmado: true }) });
      igual(stake.status, 200, 'o dono não desliga o stake pela porta');
      const off = await fetch(url('/api/admin/bandeira'), { method: 'POST', headers: H(adm), body: JSON.stringify({ nome: 'league_enabled', ligada: false, motivo: 'manutenção', confirmado: true }) });
      igual(off.status, 200, 'o dono não desligou a Liga pela porta');
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: H(),
        body: JSON.stringify({ username: 'Flag0', email: 'flag0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const jog = { authorization: `Bearer ${cad.sessao}` };
      for (const [rota, corpo] of [['/api/equipe/partida', { meu: 'a', adversario: 'b', chaveIdem: 'flag-000001' }], ['/api/equipe/buscar', { meu: 'a', chaveIdem: 'flag-000002' }]]) {
        const r = await fetch(url(rota), { method: 'POST', headers: H(jog), body: JSON.stringify(corpo) });
        const b = await r.json();
        igual(`${r.status}|${b.codigo}`, `503|${ERRO_BANDEIRA.DESLIGADA}`, `${rota} com a Liga desligada`);
      }
    } finally { await srv.fechar(); }
  });

  return s;
}
