/* Q1/Q3/Q8/Q9 · E14 · EXPIRAÇÃO, RESTART E CONCILIAÇÃO (ST-14.16 · spec E14 §§8, 13, 15)
 *
 * O aceite da ficha:
 *
 *   restart não perde nem duplica — o que foi gravado antes do crash está lá,
 *   o que não foi gravado não prendeu nada, e o que venceu durante a queda
 *   volta ao dono UMA vez, pela passada de sempre
 *   a oferta vence INTEIRA (a entidade e todas as reservas, junto)
 *   o prazo vale mesmo com o varredor atrasado
 *   liberar e vencer ao mesmo tempo dão um resultado só
 *   a conciliação escreve o que não fecha e NÃO conserta; a conta em
 *   divergência para de ofertar; fechar não ajusta, e a diferença que
 *   continua reabre
 *   desligar a bandeira não prende patrimônio
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { creditarBolsa } from '../server/idle.mjs';
import { criarOperador, ERRO_ADMIN } from '../server/admin.mjs';
import { reservarOferta, liberarOferta, expirarVencidas, expirarOferta, holdsAtivos, ofertaVigente, exigirVigente } from '../server/reservas.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { congelar } from '../server/risco-mercado-jogadores.mjs';
import { conciliarEconomia, divergenciasAbertas, divergenciasDaEconomia, emDivergencia, fecharDivergencia } from '../server/conciliacao-economia.mjs';
import { passoEconomia, criarWorkerEconomia, TENTATIVAS } from '../server/economia-worker.mjs';
import { conferirCopia, copiar } from '../server/copia.mjs';
import { criarServidor } from '../server/servidor.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const H = 3_600_000;
const CHECKPOINT = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const ligar = (db, valor = 1) => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, ?, ?, 'teste')
                ON CONFLICT (nome) DO UPDATE SET ligada = excluded.ligada`).run(n, valor, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
};
function cena(arquivo = ':memory:') {
  const db = abrirBanco(arquivo); migrar(db); ligar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const [uid, outro] = ['recup1', 'recup2'].map(conta);
  const criaturas = Array.from({ length: 6 }, () => gerar(db, { userId: uid, pack: PACK, dex: 16 }).id);
  creditarBolsa(db, uid, 'poke', 5, { fonte: 'colheita:x', agora: AGORA });
  creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 300, idem: 'pc-rec', agora: AGORA });
  return { db, uid, outro, criaturas };
}
const reservar = (c, id, ativos, { tipo = 'market', expiraEm = AGORA + 5 * H, db = c.db } = {}) =>
  reservarOferta(db, { userId: c.uid, pack: PACK, dono: { tipo, id }, ativos, expiraEm, agora: AGORA, checkpoint: CHECKPOINT });
const devolucoes = (db, uid) => db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE user_id = ? AND type = 'P2P_RELEASE'`).get(uid).n;
const eventos = (db, estado) => db.prepare(`SELECT COUNT(*) n FROM asset_holds_eventos WHERE evento = ?`).get(estado).n;
const RAIZ = new URL('..', import.meta.url).href;
const filho = codigo => spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', codigo], { encoding: 'utf8' });

export async function suite() {
  const s = criarSuite('e14-recuperacao');

  s.teste('a oferta vence inteira, uma vez, e o prazo vale com o varredor atrasado', () => {
    const c = cena();
    reservar(c, 'm-1', { criaturas: [c.criaturas[0]], itens: [{ itemId: 'poke', quantidade: 2 }], moeda: 50 });
    const dono = { tipo: 'market', id: 'm-1' };
    ok(ofertaVigente(c.db, { dono, agora: AGORA + 5 * H - 1 }), 'a oferta no prazo não está vigente');
    /* O VARREDOR NÃO PASSOU — e mesmo assim quem vai consumir vê o prazo. */
    ok(!ofertaVigente(c.db, { dono, agora: AGORA + 5 * H }), 'a oferta vencida segue vigente sem o varredor');
    igual(recusa(() => exigirVigente(c.db, { dono, agora: AGORA + 5 * H }))?.reason_code, 'OFFER_EXPIRED', 'a aceitação da oferta vencida');
    igual(holdsAtivos(c.db, dono).length, 3, 'olhar o prazo soltou alguma coisa');
    /* E a bandeira desligada não prende: o varredor devolve igual. */
    ligar(c.db, 0);
    const p = passoEconomia(c.db, { agora: AGORA + 6 * H });
    igual(`${p.expiradas}|${p.ofertas}`, '3|1', 'a passada não venceu a oferta inteira');
    igual(holdsAtivos(c.db, dono).length, 0, 'sobrou reserva da oferta vencida');
    igual(c.db.prepare(`SELECT reservada FROM bolsa_lotes WHERE user_id = ? AND item_id = 'poke'`).get(c.uid).reservada, 0, 'o lote não voltou');
    igual(saldos(c.db, c.uid).transferivel, 300, 'o PC-T não voltou');
    const de = devolucoes(c.db, c.uid);
    passoEconomia(c.db, { agora: AGORA + 7 * H });
    expirarVencidas(c.db, { agora: AGORA + 8 * H });
    igual(`${devolucoes(c.db, c.uid)}|${de}|${eventos(c.db, 'expirada')}`, '1|1|3', 'repetir a passada devolveu de novo');
    igual(recusa(() => exigirVigente(c.db, { dono, agora: AGORA }))?.reason_code, 'OFFER_NOT_ACTIVE', 'a oferta sem nada preso continua aceitável');
  });

  s.teste('a entidade vence junto: se ela falha, nenhuma reserva vence; e uma oferta quebrada não segura as outras', () => {
    const c = cena();
    reservar(c, 'm-1', { criaturas: [c.criaturas[0]] });
    reservar(c, 'm-2', { criaturas: [c.criaturas[1]], moeda: 40 }, { expiraEm: AGORA + 6 * H });
    const vistas = [];
    const entidades = { market: (db, { dono }) => { if (dono.id === 'm-1') throw new Error('anúncio corrompido'); vistas.push(dono.id); } };
    igual(recusa(() => expirarVencidas(c.db, { agora: AGORA + 7 * H, entidades }))?.message, 'anúncio corrompido', 'sem quem trate, a falha sumiu');
    igual(holdsAtivos(c.db, { tipo: 'market', id: 'm-1' }).length, 1, 'a reserva venceu sem a entidade');
    const falhas = [];
    const r = expirarVencidas(c.db, { agora: AGORA + 7 * H, entidades, aoFalhar: e => falhas.push(e.message) });
    igual(`${r.expiradas}|${r.ofertas}|${r.falhas}|${vistas.join()}|${falhas.join()}`, '2|1|1|m-2|anúncio corrompido', 'a oferta quebrada segurou as outras');
    igual(holdsAtivos(c.db, { tipo: 'market', id: 'm-1' }).length, 1, 'a oferta quebrada perdeu a reserva sem a entidade');
  });

  s.teste('o lote: limitado, da mais antiga — e a conta congelada fora da busca', () => {
    const c = cena();
    for (let k = 0; k < 5; k++) reservar(c, `m-${k}`, { criaturas: [c.criaturas[k]] }, { expiraEm: AGORA + (5 - k) * H });
    const ordem = [];
    const entidades = { market: (db, { dono }) => ordem.push(dono.id) };
    igual([1, 2, 3].map(() => passoEconomia(c.db, { agora: AGORA + 9 * H, lote: 2, entidades }).ofertas).join(), '2,2,1', 'o lote não limita a passada');
    igual(ordem.join(), 'm-4,m-3,m-2,m-1,m-0', 'não venceu da mais antiga');
    /* A conta congelada: três ofertas vencidas dela não tomam o lote. */
    const d = cena();
    for (let k = 0; k < 3; k++) reservar(d, `m-${k}`, { criaturas: [d.criaturas[k]] }, { expiraEm: AGORA + H });
    const op = criarOperador(d.db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
    congelar(d.db, { operadorId: op, userId: d.uid, motivo: 'revisão', confirmado: true, agora: AGORA });
    gerar(d.db, { userId: d.outro, pack: PACK, dex: 16 });
    const livre = d.db.prepare(`SELECT id FROM criaturas WHERE user_id = ?`).get(d.outro).id;
    reservarOferta(d.db, { userId: d.outro, pack: PACK, dono: { tipo: 'market', id: 'm-x' }, ativos: { criaturas: [livre] }, expiraEm: AGORA + 2 * H, agora: AGORA, checkpoint: CHECKPOINT });
    igual(passoEconomia(d.db, { agora: AGORA + 3 * H, lote: 1 }).ofertas, 1, 'as reservas congeladas tomaram o lote');
    igual(holdsAtivos(d.db, { tipo: 'market', id: 'm-x' }).length, 0, 'a oferta livre não venceu');
    /* e pelo caminho direto também: vencer UMA oferta da congelada não solta */
    /* — nem a ENTIDADE: a oferta "vencida" com tudo ainda preso seria a
       metade do estado que a regra da oferta inteira proíbe */
    let tocou = 0;
    igual(expirarOferta(d.db, { dono: { tipo: 'market', id: 'm-0' }, agora: AGORA + 3 * H, entidade: () => { tocou++; } }).expiradas, 0, 'a oferta da congelada venceu pelo caminho direto');
    igual(tocou, 0, 'a entidade da oferta congelada venceu sem as reservas');
    igual(d.db.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE user_id = ? AND estado = 'ativa'`).get(d.uid).n, 3, 'a congelada soltou');
  });

  s.teste('liberar e vencer ao mesmo tempo, em duas conexões: um resultado só (Q8)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'recup-'));
    try {
      const arq = join(dir, 'r.db');
      const c = cena(arq);
      reservar(c, 'm-1', { criaturas: [c.criaturas[0]], moeda: 60 });
      const B = abrirBanco(arq); B.exec('PRAGMA busy_timeout = 2000');
      const dono = { tipo: 'market', id: 'm-1' };
      const a = liberarOferta(c.db, { dono, agora: AGORA + 6 * H });
      const b = expirarOferta(B, { dono, agora: AGORA + 6 * H });
      igual(`${a.liberadas}|${b.expiradas}`, '2|0', 'as duas conexões encerraram a mesma oferta');
      igual(`${eventos(B, 'liberada')}|${eventos(B, 'expirada')}|${devolucoes(B, c.uid)}`, '2|0|1', 'dois finais para a mesma reserva');
      igual(saldos(B, c.uid).transferivel, 300, 'o PC-T voltou duas vezes ou nenhuma');
      c.db.close(); B.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('o crash: antes do commit nada fica preso; depois, a reserva sobrevive e vence uma vez ao religar', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'recup-'));
    try {
      const arq = join(dir, 'r.db');
      const c = cena(arq);
      const [cr0, cr1] = c.criaturas;
      c.db.close();
      const prologo = `
        import { abrirBanco } from '${RAIZ}server/banco.mjs';
        import { emTransacao } from '${RAIZ}server/carteira.mjs';
        import { reservarOferta } from '${RAIZ}server/reservas.mjs';
        import PACK from '${RAIZ}content/escolhido.mjs';
        const db = abrirBanco(${JSON.stringify(arq)});
        const reservar = (id, cr) => reservarOferta(db, { userId: ${JSON.stringify(c.uid)}, pack: PACK, dono: { tipo: 'market', id },
          ativos: { criaturas: [cr], moeda: 70 }, expiraEm: ${AGORA + 5 * H}, agora: ${AGORA}, checkpoint: '${CHECKPOINT}' });`;
      /* O processo morre DENTRO da transação: a reserva foi escrita e o
         commit não veio. */
      const antes = filho(`${prologo}\n emTransacao(db, () => { reservar('m-crash', ${JSON.stringify(cr0)}); process.exit(9); });`);
      igual(antes.status, 9, `o filho não morreu onde devia: ${antes.stderr}`);
      /* E este morre DEPOIS do commit, sem fechar o banco. */
      const depois = filho(`${prologo}\n reservar('m-ok', ${JSON.stringify(cr1)}); process.exit(9);`);
      igual(depois.status, 9, `o segundo filho não morreu onde devia: ${depois.stderr}`);
      const db = abrirBanco(arq);
      igual(db.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE dono_id = 'm-crash'`).get().n, 0, 'o rollback do crash deixou reserva');
      ok(elegibilidadeDaCriatura(db, { userId: c.uid, pack: PACK, id: cr0, acao: 'market', agora: AGORA, checkpoint: CHECKPOINT }).allowed, 'a criatura do crash ficou presa');
      igual(holdsAtivos(db, { tipo: 'market', id: 'm-ok' }).length, 2, 'o commit antes do crash se perdeu');
      igual(saldos(db, c.uid).transferivel, 230, 'o PC-T do crash: só a reserva confirmada sai');
      igual(divergenciasDaEconomia(db).length, 0, `o crash deixou o escrow sem fechar: ${JSON.stringify(divergenciasDaEconomia(db))}`);
      db.close();
      /* O servidor religa DEPOIS do prazo: a passada ao ligar devolve. */
      for (let k = 0; k < 2; k++) {
        const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: arq, sims: 40, laco: false, relogio: () => AGORA + 6 * H });
        await srv.ouvir(0);
        igual(holdsAtivos(srv.db, { tipo: 'market', id: 'm-ok' }).length, 0, `o religamento ${k + 1} não venceu o que venceu na queda`);
        igual(`${devolucoes(srv.db, c.uid)}|${saldos(srv.db, c.uid).transferivel}`, '1|300', `o religamento ${k + 1} devolveu de novo`);
        ok(!srv.economia.ativo(), 'o varredor girou sem o laço');
        await srv.fechar();
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('a conciliação: escreve com o número, uma vez, e não conserta', () => {
    const c = cena();
    reservar(c, 'm-1', { criaturas: [c.criaturas[0]], itens: [{ itemId: 'poke', quantidade: 2 }], moeda: 50 });
    reservar(c, 'm-2', { moeda: 30 });
    liberarOferta(c.db, { dono: { tipo: 'market', id: 'm-2' }, agora: AGORA });
    igual(divergenciasDaEconomia(c.db).length, 0, `o escrow limpo diverge: ${JSON.stringify(divergenciasDaEconomia(c.db))}`);
    const liberada = c.db.prepare(`SELECT id FROM asset_holds WHERE dono_id = 'm-2'`).get().id;
    const [hc, hi, hm] = ['criatura', 'item', 'moeda'].map(t => c.db.prepare(`SELECT * FROM asset_holds WHERE tipo = ? AND dono_id = 'm-1'`).get(t));
    /* três adulterações por fora — cada uma tem de aparecer com endereço */
    c.db.prepare(`UPDATE criaturas SET user_id = ? WHERE id = ?`).run(c.outro, hc.criatura_id);
    c.db.prepare(`UPDATE bolsa_lotes SET reservada = 0 WHERE id = ?`).run(hi.lote_id);
    c.db.prepare(`INSERT INTO wallet_ledger (id, user_id, type, bucket, amount, reserva_delta, reference_type, reference_id, created_at)
                  VALUES ('w-x', ?, 'P2P_RELEASE', 'transferivel', 50, -50, 'p2p', ?, ?)`).run(c.uid, hm.id, AGORA);
    /* e a reserva JÁ LIBERADA devolvida de novo: o PC-T que volta duas vezes */
    c.db.prepare(`INSERT INTO wallet_ledger (id, user_id, type, bucket, amount, reserva_delta, reference_type, reference_id, created_at)
                  VALUES ('w-y', ?, 'P2P_RELEASE', 'transferivel', 30, -30, 'p2p', ?, ?)`).run(c.uid, liberada, AGORA);
    const achadas = divergenciasDaEconomia(c.db);
    const por = t => achadas.filter(d => d.tipo === t);
    igual(por('orfa').map(d => d.chave).join(), hc.id, 'a criatura que mudou de dono');
    igual(por('lote').map(d => d.chave).join(), String(hi.lote_id), 'o lote que perdeu a reserva');
    igual(por('moeda').map(d => d.chave).sort().join(), [hm.id, liberada].sort().join(), 'o PC-T devolvido sem a reserva encerrar, e o devolvido duas vezes');
    igual(por('ledger').length, 1, 'o ledger × saldo');
    ok(/reservada 0, reservas ativas 2/.test(por('lote')[0].detalhe), 'a divergência sem o número');
    const r1 = conciliarEconomia(c.db, { agora: AGORA });
    const r2 = conciliarEconomia(c.db, { agora: AGORA + H });
    igual(`${r1.novas}|${r2.novas}|${divergenciasAbertas(c.db).length}`, '5|0|5', 'a passada repetida empilhou');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome = 'economy_divergence_detected'`).get().n, 5, 'a telemetria da divergência');
    /* NÃO CONSERTA: o lote continua com a reserva errada, o ledger como estava. */
    igual(c.db.prepare(`SELECT reservada FROM bolsa_lotes WHERE id = ?`).get(hi.lote_id).reservada, 0, 'a conciliação ajustou o lote');
    igual(holdsAtivos(c.db, { tipo: 'market', id: 'm-1' }).length, 3, 'a conciliação mexeu nas reservas');
    igual(saldos(c.db, c.uid).transferivel, 300 - 50, 'a conciliação mexeu no saldo');
  });

  s.teste('a conta em divergência não oferta; fechar é da economia, não ajusta, e a diferença que continua reabre', () => {
    const c = cena();
    reservar(c, 'm-1', { itens: [{ itemId: 'poke', quantidade: 2 }] });
    const lote = c.db.prepare(`SELECT lote_id FROM asset_holds`).get().lote_id;
    c.db.prepare(`UPDATE bolsa_lotes SET reservada = 1 WHERE id = ?`).run(lote);
    conciliarEconomia(c.db, { agora: AGORA });
    ok(emDivergencia(c.db, c.uid) && !emDivergencia(c.db, c.outro), 'a divergência não marcou a conta certa');
    const p = elegibilidadeDaCriatura(c.db, { userId: c.uid, pack: PACK, id: c.criaturas[0], acao: 'market', agora: AGORA, checkpoint: CHECKPOINT });
    igual(`${p.reason_code}|${p.detalhe}`, 'ACCOUNT_RESTRICTED|conciliacao', 'a política não sabe da divergência');
    igual(recusa(() => reservar(c, 'm-2', { criaturas: [c.criaturas[0]] }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a conta em divergência ofertou');
    ok(elegibilidadeDaCriatura(c.db, { userId: c.uid, pack: PACK, id: c.criaturas[0], acao: 'evoluir', agora: AGORA, checkpoint: CHECKPOINT }).allowed, 'a divergência travou o jogo, e não só a troca');
    const eco = criarOperador(c.db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
    const sup = criarOperador(c.db, { email: 'sup@x.test', papel: 'suporte', agora: AGORA }).id;
    const id = divergenciasAbertas(c.db)[0].id;
    igual(recusa(() => fecharDivergencia(c.db, { operadorId: sup, id, motivo: 'x', confirmado: true, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_PAPEL, 'o suporte fechou');
    igual(recusa(() => fecharDivergencia(c.db, { operadorId: eco, id, motivo: 'x', confirmado: false, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_CONFIRMAR, 'fechou sem confirmar');
    fecharDivergencia(c.db, { operadorId: eco, id, motivo: 'olhei', confirmado: true, agora: AGORA + H });
    ok(!emDivergencia(c.db, c.uid), 'fechar não devolveu a conta');
    igual(conciliarEconomia(c.db, { agora: AGORA + 2 * H }).novas, 1, 'a diferença que continua não reabriu');
    ok(emDivergencia(c.db, c.uid), 'reaberta, a conta voltou a ofertar');
    /* o conserto é de quem investiga, e depois dele fechar fica fechado */
    c.db.prepare(`UPDATE bolsa_lotes SET reservada = 2 WHERE id = ?`).run(lote);
    fecharDivergencia(c.db, { operadorId: eco, id: divergenciasAbertas(c.db)[0].id, motivo: 'lote corrigido à mão', confirmado: true, agora: AGORA + 3 * H });
    igual(conciliarEconomia(c.db, { agora: AGORA + 4 * H }).novas, 0, 'o escrow consertado reabriu');
    const aud = c.db.prepare(`SELECT COUNT(*) n FROM admin_auditoria WHERE acao = 'economia.divergencia.fechar'`).get().n;
    /* as duas recusas param antes da auditoria (papel, confirmação); os dois fechamentos ficam */
    igual(aud, 2, 'a auditoria do fechamento');
  });

  s.teste('o varredor: tenta poucas vezes, conta a falha e segue; liga e para com o servidor', async () => {
    const c = cena();
    reservar(c, 'm-1', { criaturas: [c.criaturas[0]] });
    c.db.exec(`ALTER TABLE economia_divergencias RENAME TO economia_divergencias_x`);
    const erros = [];
    const m = passoEconomia(c.db, { agora: AGORA + 6 * H, aoErro: e => erros.push(e) });
    igual(`${m.expiradas}|${m.falhas}|${erros.length}`, '1|1|1', 'a conciliação quebrada segurou o vencimento, ou insistiu sem fim');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome = 'economy_worker_pass'`).get().n, 1, 'a passada com falha não foi medida');
    c.db.exec(`ALTER TABLE economia_divergencias_x RENAME TO economia_divergencias`);
    let chamadas = 0;
    const db = new Proxy(c.db, { get: (t, k) => k === 'prepare' ? (...a) => { if (/GROUP BY dono_tipo/.test(a[0])) { chamadas++; throw new Error('disco'); } return t.prepare(...a); } : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
    passoEconomia(db, { agora: AGORA + 7 * H, aoErro: () => {} });
    igual(chamadas, TENTATIVAS, 'o vencimento quebrado não tentou o número finito de vezes');
    igual(passoEconomia(c.db, { agora: AGORA + 8 * H }).falhas, 0, 'a passada limpa contou falha');
    const w = criarWorkerEconomia({ db: c.db, relogio: () => AGORA, intervalo: 5 });
    w.iniciar(); w.iniciar();
    ok(w.ativo(), 'o varredor não ligou');
    /* Espera COM PRAZO até ele girar duas vezes sozinho: um tempo fixo
       falha quando a suíte em paralelo segura o laço de eventos. */
    for (const fim = Date.now() + 5000; w.estado().passos < 2 && Date.now() < fim;) await new Promise(r => setTimeout(r, 10));
    w.parar();
    ok(!w.ativo() && w.estado().passos >= 2, `o varredor não girou sozinho: ${JSON.stringify(w.estado())}`);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, relogio: () => AGORA });
    await srv.ouvir(0);
    ok(srv.economia.ativo() && srv.economia.estado().passos === 1, 'o servidor não ligou o varredor, ou não passou ao ligar');
    await srv.fechar();
    ok(!srv.economia.ativo(), 'fechar não parou o varredor');
  });

  s.teste('a cópia prova o escrow; a migração sobe e desce limpa', () => {
    const dir = mkdtempSync(join(tmpdir(), 'recup-'));
    try {
      const c = cena();
      reservar(c, 'm-1', { itens: [{ itemId: 'poke', quantidade: 2 }] });
      copiar(c.db, join(dir, 'limpa.db'));
      const limpa = conferirCopia(join(dir, 'limpa.db'));
      ok(limpa.ok, `a cópia limpa não confere: ${limpa.problemas}`);
      c.db.prepare(`UPDATE bolsa_lotes SET reservada = 0`).run();
      copiar(c.db, join(dir, 'suja.db'));
      const suja = conferirCopia(join(dir, 'suja.db'));
      ok(!suja.ok && suja.problemas.some(p => /lote .*reservada 0, reservas ativas 2.*escrow/.test(p)), `a cópia com o escrow quebrado conferiu: ${suja.problemas}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'conciliacao-st14.16');
    ok(MIGRACOES.indexOf(m) > MIGRACOES.findIndex(x => x.nome === 'risco-st14.14'), 'a migração não entrou depois da anterior');
    const tem = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'economia_divergencias'`).get().n;
    m.desce(db); igual(tem(), 0, 'a descida deixou restos');
    m.sobe(db); igual(tem(), 1, 'a subida não refez');
  });

  return s;
}
