/* Q1/Q3/Q6/Q8/Q9 · E14 · A TROCA DIRETA (ST-14.7a · spec E14 §9)
 *
 * O aceite da ficha, frase a frase:
 *
 *   Pokémon↔Pokémon, item↔PC-T e a doação funcionam, e os dois lados se
 *   movem juntos — com a origem do lote e a taxa da política gravada
 *   mudança de ativo ou de preço sobe a revisão e invalida o aceite
 *   ninguém trava o patrimônio do outro sem os DOIS prontos
 *   terceiro não lê nem mexe; a troca consigo mesmo não existe
 *   cancelar e confirmar disputam sem efeito pela metade
 *   o timeout devolve o recibo de antes, e não uma segunda troca
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { creditarBolsa, quantosNaBolsa } from '../server/idle.mjs';
import { lotesDe } from '../server/inventario.mjs';
import { criarOperador } from '../server/admin.mjs';
import { congelar } from '../server/risco-mercado-jogadores.mjs';
import { holdsAtivos } from '../server/reservas.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { divergenciasDaEconomia } from '../server/conciliacao-economia.mjs';
import { passoEconomia } from '../server/economia-worker.mjs';
import { criarTroca, ofertar, pronto, confirmar, cancelar, detalheDaTroca, minhasTrocas, expirarTrocaDaOferta, expirarConvites,
         ERRO_TROCA, PRAZOS_TROCA } from '../server/trocas.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

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
  const [A, B, C] = ['TrocaA', 'TrocaB', 'TrocaC'].map(conta);
  const cr = u => gerar(db, { userId: u, pack: PACK, dex: 16 }).id;
  const k = { db, A, B, C, a: [cr(A), cr(A)], b: [cr(B), cr(B)] };
  creditarBolsa(db, A, 'poke', 5, { fonte: 'colheita:x', agora: AGORA });
  creditar(db, { userId: B, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 500, idem: 'pc-b', agora: AGORA });
  return k;
}
const ctx = (k, u, extra = {}) => ({ userId: u, pack: PACK, agora: AGORA, checkpoint: CHECKPOINT, ...extra });
const donoDe = (db, id) => db.prepare(`SELECT user_id FROM criaturas WHERE id = ?`).get(id)?.user_id;
const prontos = (k, id, rev, agora = AGORA) => { pronto(k.db, { trocaId: id, ...ctx(k, k.A, { agora }), revisao: rev }); return pronto(k.db, { trocaId: id, ...ctx(k, k.B, { agora }), revisao: rev }); };
const confirmarAmbos = (k, id, agora = AGORA) => {
  const d = detalheDaTroca(k.db, { trocaId: id, userId: k.A });
  confirmar(k.db, { trocaId: id, userId: k.A, revisao: d.revisao, hash: d.hash, agora, checkpoint: CHECKPOINT });
  return confirmar(k.db, { trocaId: id, userId: k.B, revisao: d.revisao, hash: d.hash, agora, checkpoint: CHECKPOINT });
};

export async function suite() {
  const s = criarSuite('e14-trocas');

  s.teste('Pokémon por Pokémon: os dois lados mudam de dono juntos, com histórico e cooldown', () => {
    const k = cena();
    /* o nível que a mesa mostra é o do XP, como no resto do jogo (Q5 da 14.7b) */
    k.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(18), k.a[0]);
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    igual(detalheDaTroca(k.db, { trocaId: t.id, userId: k.B }).dele.criaturas[0].nivel, 18, 'a mesa mostra o nível de nascimento');
    const r2 = ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { criaturas: [k.b[0]] } });
    igual(r2.revisao, 2, 'a oferta do outro lado não subiu a revisão');
    const trava = prontos(k, t.id, 2);
    igual(trava.estado, 'LOCKED', 'os dois prontos não travaram');
    igual(holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length, 2, 'as reservas dos dois lados');
    const recibo = confirmarAmbos(k, t.id);
    igual(recibo.estado, 'SETTLED', 'a segunda confirmação não liquidou');
    igual(`${donoDe(k.db, k.a[0]) === k.B}|${donoDe(k.db, k.b[0]) === k.A}`, 'true|true', 'as criaturas não trocaram de dono');
    const hist = k.db.prepare(`SELECT de_user, para_user, ref_id FROM criaturas_transferencias ORDER BY id`).all();
    igual(hist.length, 2, 'o histórico de transferências');
    ok(hist.every(h => h.ref_id === t.id), 'a transferência sem a troca de referência');
    const inst = k.db.prepare(`SELECT ot_user_id, proveniencia FROM criaturas WHERE id = ?`).get(k.a[0]);
    igual(`${inst.ot_user_id === k.A}|${inst.proveniencia}`, 'true|p2p_verified', 'o treinador original mudou, ou a recebida finge ter sido capturada');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE dono_id = ? AND estado = 'consumida'`).get(t.id).n, 2, 'as reservas não foram consumidas');
    /* quem recebeu não repassa na hora: o cooldown da spec §7 */
    const cd = elegibilidadeDaCriatura(k.db, { userId: k.B, pack: PACK, id: k.a[0], acao: 'trade', agora: AGORA + 60_000, checkpoint: CHECKPOINT });
    igual(`${cd.reason_code}|${cd.detalhe}`, 'ASSET_COOLDOWN|recebida', 'a criatura recebida saiu sem cooldown');
    ok(elegibilidadeDaCriatura(k.db, { userId: k.B, pack: PACK, id: k.a[0], acao: 'trade', agora: AGORA + 11 * 60_000, checkpoint: CHECKPOINT }).allowed, 'o cooldown não acaba');
    ok(elegibilidadeDaCriatura(k.db, { userId: k.B, pack: PACK, id: k.a[0], acao: 'evoluir', agora: AGORA, checkpoint: CHECKPOINT }).allowed, 'a recebida não pode nem evoluir');
    igual(divergenciasDaEconomia(k.db).length, 0, `a troca deixou o escrow sem fechar: ${JSON.stringify(divergenciasDaEconomia(k.db))}`);
    igual(k.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome = 'trade_settled'`).get().n, 1, 'a telemetria da troca');
  });

  s.teste('item por PC-T: o lote leva a origem, o PC-T leva a taxa gravada, e a taxa queima', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { itens: [{ itemId: 'poke', quantidade: 2 }] } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 200 } });
    prontos(k, t.id, 2);
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.B });
    igual(`${d.meu.moeda}|${d.meu.taxa}|${d.dele.taxa}`, '200|2|0', 'a taxa mostrada');
    confirmarAmbos(k, t.id);
    igual(`${saldos(k.db, k.A).transferivel}|${saldos(k.db, k.B).transferivel}|${saldos(k.db, k.B).reservado_transferivel}`, '200|298|0', 'o PC-T e a taxa');
    igual(`${quantosNaBolsa(k.db, k.A, 'poke')}|${quantosNaBolsa(k.db, k.B, 'poke')}`, '3|2', 'as bolas');
    const lote = lotesDe(k.db, k.B, 'poke')[0];
    igual(`${lote.classe}|${lote.fonte}`, `p2p_verified|troca:${t.id}`, 'o lote recebido não diz que veio de uma troca');
    const taxa = k.db.prepare(`SELECT memo, reserva_delta FROM wallet_ledger WHERE type = 'DIRECT_TRADE_FEE'`).get();
    ok(/^taxas-v1-piloto:/.test(taxa.memo) && taxa.reserva_delta === -2, `a taxa sem a política: ${JSON.stringify(taxa)}`);
    igual(divergenciasDaEconomia(k.db).length, 0, `o escrow não fecha: ${JSON.stringify(divergenciasDaEconomia(k.db))}`);
  });

  s.teste('a doação: um lado vazio com o aceite do outro — e duas ofertas vazias não existem', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: {} });
    igual(recusa(() => pronto(k.db, { trocaId: t.id, ...ctx(k, k.A), revisao: 1 }))?.codigo, ERRO_TROCA.VAZIA, 'a troca vazia ficou pronta');
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.A), ativos: { criaturas: [k.a[1]] } });
    prontos(k, t.id, 2);
    igual(holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length, 1, 'a doação prendeu o que não existe');
    confirmarAmbos(k, t.id);
    igual(donoDe(k.db, k.a[1]), k.B, 'a doação não chegou');
  });

  s.teste('a revisão: mudar invalida a prontidão; ninguém prende nada sem os dois prontos', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    pronto(k.db, { trocaId: t.id, ...ctx(k, k.A), revisao: 1 });
    igual(holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length, 0, 'um pronto sozinho prendeu');
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { criaturas: [k.b[0]] } });
    const velha = recusa(() => pronto(k.db, { trocaId: t.id, ...ctx(k, k.B), revisao: 1 }));
    igual(`${velha?.codigo}|${velha?.revisao}`, `${ERRO_TROCA.REVISAO}|2`, 'o pronto da revisão velha valeu');
    igual(pronto(k.db, { trocaId: t.id, ...ctx(k, k.B), revisao: 2 }).estado, 'OFFERED', 'o pronto de A na revisão 1 contou para a 2');
    igual(holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length, 0, 'travou com o pronto velho');
    igual(pronto(k.db, { trocaId: t.id, ...ctx(k, k.A), revisao: 2 }).estado, 'LOCKED', 'os dois prontos na mesma revisão não travaram');
  });

  s.teste('editar depois de travar solta tudo e invalida a confirmação; o hash que não bate não confirma', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 100 } });
    prontos(k, t.id, 2);
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.A });
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: 'x'.repeat(32), agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_TROCA.HASH, 'confirmou o que não viu');
    confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT });
    /* B muda o preço: tudo solta, volta a oferecida, revisão 3 */
    const e = ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 150 } });
    igual(`${e.revisao}|${detalheDaTroca(k.db, { trocaId: t.id, userId: k.A }).estado}`, '3|OFFERED', 'editar travada não voltou a oferecida');
    igual(`${holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length}|${saldos(k.db, k.B).reservado_transferivel}`, '0|0', 'editar não soltou as reservas');
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.B, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_TROCA.ESTADO, 'a confirmação velha valeu');
    prontos(k, t.id, 3);
    const d3 = detalheDaTroca(k.db, { trocaId: t.id, userId: k.B });
    ok(d3.hash !== d.hash, 'a revisão nova tem o mesmo hash');
    /* a revisão e o hash, OS DOIS atuais: o hash certo com a revisão velha não vale */
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: d3.hash, agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_TROCA.REVISAO, 'confirmou com a revisão velha');
    /* a confirmação de A era da revisão 2: a de B na 3 sozinha não liquida */
    igual(confirmar(k.db, { trocaId: t.id, userId: k.B, revisao: 3, hash: d3.hash, agora: AGORA, checkpoint: CHECKPOINT }).estado, 'LOCKED', 'a confirmação da revisão velha contou');
    igual(donoDe(k.db, k.a[0]), k.A, 'liquidou com uma confirmação só');
  });

  s.teste('o que a tela mostra entra no hash: a criatura que muda antes do lock invalida o que o outro viu', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { criaturas: [k.b[0]] } });
    prontos(k, t.id, 2);
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.B });
    /* um caminho por fora muda a natureza da criatura de A depois de B ver */
    k.db.prepare(`UPDATE criaturas SET natureza = 'outra' WHERE id = ?`).run(k.a[0]);
    confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: detalheDaTroca(k.db, { trocaId: t.id, userId: k.A }).hash, agora: AGORA, checkpoint: CHECKPOINT });
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.B, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_TROCA.HASH, 'confirmou uma natureza que não viu');
  });

  s.teste('terceiro não lê nem mexe; consigo mesmo não; uma troca aberta de cada lado', () => {
    const k = cena();
    igual(recusa(() => criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.A, ativos: { criaturas: [k.a[0]] } }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a troca consigo mesmo');
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    for (const f of [() => detalheDaTroca(k.db, { trocaId: t.id, userId: k.C }),
                     () => ofertar(k.db, { trocaId: t.id, ...ctx(k, k.C), ativos: {} }),
                     () => pronto(k.db, { trocaId: t.id, ...ctx(k, k.C), revisao: 1 }),
                     () => cancelar(k.db, { trocaId: t.id, userId: k.C, agora: AGORA })])
      igual(recusa(f)?.codigo, ERRO_TROCA.NAO, 'o terceiro alcançou a troca');
    igual(minhasTrocas(k.db, { userId: k.C }).length, 0, 'a lista do terceiro mostra a troca dos outros');
    igual(minhasTrocas(k.db, { userId: k.B })[0].outro, 'TrocaA', 'a lista do convidado');
    /* uma aberta por conta, de quem cria e de quem recebe */
    igual(recusa(() => criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.C, ativos: { criaturas: [k.a[1]] } }))?.reason_code, 'CAPACITY_EXCEEDED', 'a segunda troca aberta de A');
    igual(recusa(() => criarTroca(k.db, { ...ctx(k, k.C), contraparteId: k.B, ativos: {} }))?.reason_code, 'CAPACITY_EXCEEDED', 'B recebeu uma segunda troca');
    cancelar(k.db, { trocaId: t.id, userId: k.B, agora: AGORA });
    ok(criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.C, ativos: { criaturas: [k.a[1]] } }).id, 'cancelar não devolveu a vaga');
    /* a detalhe não carrega o id de ninguém */
    const d = detalheDaTroca(k.db, { trocaId: minhasTrocas(k.db, { userId: k.C })[0].id, userId: k.C });
    ok(!JSON.stringify(d).includes(k.A) && !JSON.stringify(d).includes(k.C), 'a detalhe vazou um id de conta');
  });

  s.teste('o lado do PC-T: mínimo de 100, e a conta congelada do outro lado trava a troca', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    igual(recusa(() => ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 99 } }))?.codigo, ERRO_TROCA.OFERTA, 'o PC-T abaixo do mínimo');
    igual(recusa(() => ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 499 } }))?.reason_code, 'INSUFFICIENT_FUNDS', 'o PC-T sem a taxa');
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 100 } });
    prontos(k, t.id, 2);
    const op = criarOperador(k.db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
    congelar(k.db, { operadorId: op, userId: k.B, motivo: 'revisão', confirmado: true, agora: AGORA });
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.A });
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT }))?.reason_code, 'ACCOUNT_RESTRICTED', 'confirmou com a outra conta em revisão');
  });

  s.teste('cancelar e confirmar disputam em duas conexões: um resultado, nada pela metade (Q8)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trocas-'));
    try {
      for (const ordem of ['confirma-primeiro', 'cancela-primeiro']) {
        const arq = join(dir, `${ordem}.db`);
        const k = cena(arq);
        const B2 = abrirBanco(arq); B2.exec('PRAGMA busy_timeout = 2000');
        const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
        ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 100 } });
        prontos(k, t.id, 2);
        const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.A });
        confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT });
        const conf = () => confirmar(B2, { trocaId: t.id, userId: k.B, revisao: 2, hash: d.hash, agora: AGORA, checkpoint: CHECKPOINT });
        const canc = () => cancelar(k.db, { trocaId: t.id, userId: k.A, agora: AGORA });
        const [r1, r2] = ordem === 'confirma-primeiro' ? [recusa(conf), recusa(canc)] : [recusa(canc), recusa(conf)];
        igual(`${r1}|${r2?.codigo}`, `null|${ERRO_TROCA.ESTADO}`, `${ordem}: as duas venceram, ou nenhuma`);
        const final = detalheDaTroca(B2, { trocaId: t.id, userId: k.B }).estado;
        const moveu = donoDe(B2, k.a[0]) === k.B;
        igual(`${final}|${moveu}`, ordem === 'confirma-primeiro' ? 'SETTLED|true' : 'CANCELLED|false', `${ordem}: o estado e os ativos discordam`);
        igual(`${holdsAtivos(B2, { tipo: 'trade', id: t.id }).length}|${saldos(B2, k.B).reservado_transferivel}`, '0|0', `${ordem}: sobrou reserva`);
        igual(divergenciasDaEconomia(B2).length, 0, `${ordem}: o escrow não fecha`);
        k.db.close(); B2.close();
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('o timeout devolve o recibo de antes; a segunda confirmação não liquida de novo', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 100 } });
    prontos(k, t.id, 2);
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.A });
    const recibo = confirmarAmbos(k, t.id);
    const de_novo = confirmar(k.db, { trocaId: t.id, userId: k.B, revisao: 2, hash: d.hash, agora: AGORA + 1000, checkpoint: CHECKPOINT });
    igual(`${de_novo.repetido}|${de_novo.liquidadaEm}|${de_novo.hash}`, `true|${recibo.liquidadaEm}|${recibo.hash}`, 'o retry não devolveu o recibo de antes');
    igual(`${saldos(k.db, k.B).transferivel}|${saldos(k.db, k.A).transferivel}`, '399|100', 'o retry liquidou de novo');
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.B, revisao: 2, hash: 'y'.repeat(32), agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_TROCA.ESTADO, 'o retry com outro hash ganhou o recibo');
  });

  s.teste('o prazo: o lock vence e devolve tudo; o convite vence sozinho; desligar não prende', () => {
    const k = cena();
    const t = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k, k.B), ativos: { moeda: 100 } });
    prontos(k, t.id, 2);
    const d = detalheDaTroca(k.db, { trocaId: t.id, userId: k.A });
    const depois = AGORA + PRAZOS_TROCA.lockMs;
    igual(recusa(() => confirmar(k.db, { trocaId: t.id, userId: k.A, revisao: 2, hash: d.hash, agora: depois, checkpoint: CHECKPOINT }))?.reason_code, 'OFFER_EXPIRED', 'confirmou o lock vencido sem o varredor');
    ligar(k.db, 0);
    passoEconomia(k.db, { agora: depois, entidades: { trade: expirarTrocaDaOferta }, tarefas: [expirarConvites] });
    igual(detalheDaTroca(k.db, { trocaId: t.id, userId: k.A }).estado, 'EXPIRED', 'o varredor não venceu a troca junto');
    igual(`${holdsAtivos(k.db, { tipo: 'trade', id: t.id }).length}|${saldos(k.db, k.B).transferivel}`, '0|500', 'o lock vencido não devolveu');
    ligar(k.db, 1);
    const c = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    const fim = AGORA + PRAZOS_TROCA.conviteMs;
    igual(recusa(() => ofertar(k.db, { trocaId: c.id, ...ctx(k, k.B, { agora: fim }), ativos: {} }))?.reason_code, 'OFFER_EXPIRED', 'o convite vencido aceitou oferta');
    igual(expirarConvites(k.db, { agora: fim }).convites, 1, 'o convite não venceu');
    igual(detalheDaTroca(k.db, { trocaId: c.id, userId: k.B }).estado, 'EXPIRED', 'o estado do convite vencido');
    /* bandeira desligada: não se cria, mas o que está aberto se cancela */
    const v = criarTroca(k.db, { ...ctx(k, k.A), contraparteId: k.B, ativos: { criaturas: [k.a[0]] } });
    ligar(k.db, 0);
    igual(recusa(() => criarTroca(k.db, { ...ctx(k, k.C), contraparteId: k.B, ativos: {} }))?.reason_code, 'FEATURE_DISABLED', 'criou com a bandeira desligada');
    igual(cancelar(k.db, { trocaId: v.id, userId: k.A, agora: AGORA }).estado, 'CANCELLED', 'a bandeira desligada prendeu a troca');
  });

  s.teste('pela porta: o nome da outra conta, a sessão de cada um, e a bandeira desligada fecha a troca', async () => {
    /* ligada pela DEC-21 (o padrão) e desligada pelo OPERADOR */
    for (const ligadaAgora of [false, true]) {
      const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => AGORA });
      const porta = await srv.ouvir(0);
      const url = r => `http://127.0.0.1:${porta}${r}`;
      const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
      try {
        ligar(srv.db, ligadaAgora ? 1 : 0);
        const sessao = async n => {
          const r = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(),
            body: JSON.stringify({ username: n, email: `${n.toLowerCase()}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
          return { authorization: `Bearer ${r.sessao}`, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(n).id };
        };
        const [a, b, c] = [await sessao('PortaA'), await sessao('PortaB'), await sessao('PortaC')];
        const cr = gerar(srv.db, { userId: a.id, pack: PACK, dex: 16 }).id;
        const post = (s, rota, corpo) => fetch(url(rota), { method: 'POST', headers: Hd({ authorization: s.authorization }), body: JSON.stringify(corpo) });
        const inicio = await (await fetch(url('/api/trocas'), { headers: Hd({ authorization: a.authorization }) })).json();
        const ligada = ligadaAgora;
        igual(`${inicio.ligada}|${inicio.motivo?.reason_code ?? null}|${inicio.pctElegivel}`, `${ligada}|${ligada ? null : 'FEATURE_DISABLED'}|0`, 'a abertura da tela diz se a troca está ligada');
        const criada = await post(a, '/api/trocas', { contraparte: 'PortaB', ativos: { criaturas: [cr] } });
        if (!ligadaAgora) {
          const corpo = await criada.json();
          igual(`${criada.status}|${corpo.reason_code}`, '409|FEATURE_DISABLED', 'a troca nasceu com a bandeira desligada pelo operador');
          continue;
        }
        igual(criada.status, 200, 'a troca pela porta');
        const { id } = await criada.json();
        igual((await fetch(url(`/api/trocas/detalhe?id=${id}`), { headers: Hd({ authorization: c.authorization }) })).status, 404, 'o terceiro leu a troca');
        igual((await post(c, '/api/trocas/cancelar', { id })).status, 404, 'o terceiro cancelou');
        igual((await post(a, '/api/trocas', { contraparte: 'NinguemAqui', ativos: {} })).status, 404, 'a contraparte que não existe');
        igual((await post(b, '/api/trocas/pronto', { id, revisao: 9 })).status, 409, 'o pronto da revisão errada pela porta');
        igual((await post(a, '/api/trocas/pronto', { id, revisao: 1 })).status, 200, 'o pronto de A');
        const tr = await (await post(b, '/api/trocas/pronto', { id, revisao: 1 })).json();
        igual(tr.estado, 'LOCKED', 'travou pela porta');
        const dB = await (await fetch(url(`/api/trocas/detalhe?id=${id}`), { headers: Hd({ authorization: b.authorization }) })).json();
        igual(`${dB.outro}|${dB.dele.criaturas.length}|${dB.meu.criaturas.length}`, 'PortaA|1|0', 'a detalhe do ponto de vista de B');
        igual((await post(a, '/api/trocas/confirmar', { id, revisao: 1, hash: dB.hash })).status, 200, 'a confirmação de A');
        const fim = await (await post(b, '/api/trocas/confirmar', { id, revisao: 1, hash: dB.hash })).json();
        igual(`${fim.estado}|${donoDe(srv.db, cr) === b.id}`, 'SETTLED|true', 'a doação pela porta');
        const lista = await (await fetch(url('/api/trocas'), { headers: Hd({ authorization: a.authorization }) })).json();
        igual(`${lista.trocas.length}|${lista.trocas[0].outro}`, '1|PortaB', 'a lista pela porta');
      } finally { await srv.fechar(); }
    }
  });

  s.teste('a migração sobe e desce limpa', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'trocas-st14.7');
    ok(MIGRACOES.indexOf(m) > MIGRACOES.findIndex(x => x.nome === 'conciliacao-st14.16'), 'a migração não entrou depois da anterior');
    const tem = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('trocas', 'trocas_lados', 'trocas_eventos', 'criaturas_transferencias')`).get().n;
    m.desce(db); igual(tem(), 0, 'a descida deixou restos');
    m.sobe(db); igual(tem(), 4, 'a subida não refez');
    ok(/append-only/.test(recusa(() => { db.prepare(`INSERT INTO criaturas_transferencias (criatura_id, de_user, para_user, ref_tipo, ref_id, em) VALUES ('c', 'a', 'b', 'trade', 't', 1)`).run();
                                        db.prepare(`DELETE FROM criaturas_transferencias`).run(); })?.message ?? ''), 'o histórico de dono aceitou apagar');
  });

  return s;
}
