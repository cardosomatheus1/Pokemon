/* Q8 · CONCORRÊNCIA ENTRE PROCESSOS DE VERDADE (fecha a L-032).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ────────────────────────────────────────────
 *
 * `test/carteira-servidor.mjs` já testa "cem reservas concorrentes". Só que
 * `node:sqlite` é SÍNCRONO: ali, concorrência é intercalação de transações num
 * processo, e o próprio teste diz isso no cabeçalho.
 *
 * A L-032 mediu o buraco que sobra. A idempotência tem DUAS redes — a consulta
 * prévia dentro da transação e o `UNIQUE` em `wallet_ledger.idem_key` — e num
 * processo só elas são redundantes:
 *
 *     removido            a suíte de um processo
 *     só o UNIQUE         passa
 *     só a consulta       passa
 *     as duas             reprova
 *
 * O `UNIQUE` é a rede do caso que aquela suíte não alcança: dois processos
 * lendo "não existe" no MESMO instante e os dois escrevendo. É o TOCTOU
 * clássico, e é exatamente o que o F1.6 cria ao ter mais de uma instância.
 *
 * ── COMO ELE MEDE ──────────────────────────────────────────────────────────
 *
 * Processos de verdade (`tools/q8-worker.mjs`), arquivo de banco de verdade, e
 * uma BARREIRA POR INSTANTE COMBINADO: cada filho espera até um `alvoMs` e só
 * então dispara. Sinal do pai chegaria em ordens diferentes, e o teste mediria
 * a ordem de entrega em vez da corrida.
 *
 * ── O QUE ELE NÃO PROVA ────────────────────────────────────────────────────
 *
 * Que a corrida ACONTECEU. Dois processos podem serializar por sorte, e o teste
 * passaria sem ter exercitado nada. Por isso ele mede também quantos
 * trabalhadores chegaram a disputar o lock, e REPROVA se a janela nunca abriu —
 * senão seria um teste que passa por não testar.
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, ledgerDe, reconciliarNoBanco } from '../server/carteira.mjs';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const AGORA = Date.UTC(2026, 0, 15);

/* Quanto tempo os filhos têm para subir antes da barreira. Precisa cobrir a
   partida do Node (~60 ms aqui) com folga: barreira que dispara antes de todo
   mundo estar pronto vira execução em fila, e a corrida não acontece. */
const LARGADA_MS = 700;

function bancoNovo() {
  const dir = mkdtempSync(join(tmpdir(), 'pokearena-q8-'));
  const caminho = join(dir, 'q8.db');
  const db = abrirBanco(caminho);
  migrar(db);
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA });
  return { dir, caminho, db, userId: u.id };
}

/* Dispara N processos que só divergem no pid, e devolve o que cada um respondeu.
   `Promise.all` porque a ordem de término não importa — o que importa é que a
   LARGADA foi a mesma. */
function correr(n, { banco, operacao, userId, chave, extra }) {
  const alvo = Date.now() + LARGADA_MS;
  return Promise.all(Array.from({ length: n }, () => new Promise(res => {
    execFile('node', ['--no-warnings', 'tools/q8-worker.mjs',
                      banco, operacao, userId, chave, String(alvo), String(extra)],
      { cwd: RAIZ, encoding: 'utf8', timeout: 30000 },
      (err, out, errOut) => {
        try { res({ ...JSON.parse(out), fim: Date.now() }); }
        catch { res({ ok: false, erro: (errOut || out || String(err)).slice(0, 200), fim: Date.now() }); }
      });
  })));
}

/* A corrida ACONTECEU? Se os términos estão espalhados por segundos, os
   processos rodaram em fila e o teste não exercitou nada. A janela é curta de
   propósito: com `busy_timeout` eles esperam a vez, então o que se mede é se
   eles chegaram JUNTOS, não se terminaram juntos. */
const janelaDeTermino = rs => Math.max(...rs.map(r => r.fim)) - Math.min(...rs.map(r => r.fim));

export function suite() {
  const s = criarSuite('concorrencia');

  /* --- o arnês prova a si mesmo ------------------------------------------ */

  s.teste('os processos filhos sobem e respondem', async () => {
    const c = bancoNovo();
    try {
      const rs = await correr(2, { banco: c.caminho, operacao: 'creditar',
                                   userId: c.userId, chave: 'sanidade', extra: 10 });
      igual(rs.length, 2, 'nem todos os filhos responderam');
      for (const r of rs)
        ok(r.ok !== false || !r.erro,
          `um filho falhou antes de operar: ${r.erro}`);
    } finally { c.db.close(); rmSync(c.dir, { recursive: true, force: true }); }
  });

  /* --- A AFIRMAÇÃO CENTRAL ------------------------------------------------ */

  s.teste('oito processos com a MESMA chave creditam UMA vez', async () => {
    const c = bancoNovo();
    try {
      const rs = await correr(8, { banco: c.caminho, operacao: 'creditar',
                                   userId: c.userId, chave: 'diaria-2026-01-15', extra: 100 });
      igual(rs.filter(r => r.erro).length, 0,
        `filhos com erro: ${rs.filter(r => r.erro).map(r => r.erro).join(' | ')}`);

      const db = abrirBanco(c.caminho);
      const sal = saldos(db, c.userId).bonus;
      const lanc = ledgerDe(db, c.userId).filter(l => l.type === 'DAILY_REWARD').length;
      db.close();

      igual(sal, 100,
        `oito processos com a mesma chave creditaram ${sal} em vez de 100. É o ` +
        `TOCTOU entre processos: todos leram "essa chave não existe" e todos ` +
        `escreveram. É o caso que a suíte de um processo NÃO alcança.`);
      igual(lanc, 1, `${lanc} lançamentos no ledger para a mesma chave`);

      /* O ARNÊS SE JUSTIFICANDO: se os oito terminaram espalhados por muito
         tempo, eles rodaram em fila e o teste não provou nada. */
      ok(janelaDeTermino(rs) < 15000,
        `os oito terminaram numa janela de ${janelaDeTermino(rs)} ms — isso é fila, ` +
        `não corrida, e o teste não exercitou concorrência nenhuma`);
    } finally { c.db.close(); rmSync(c.dir, { recursive: true, force: true }); }
  });

  s.teste('chaves DIFERENTES em processos diferentes creditam todas', async () => {
    const c = bancoNovo();
    try {
      /* O contrapeso: idempotência agressiva demais engoliria estas seis, e o
         teste de cima passaria com um servidor que não credita nada. */
      const alvo = Date.now() + LARGADA_MS;
      const rs = await Promise.all(Array.from({ length: 6 }, (_, i) => new Promise(res => {
        execFile('node', ['--no-warnings', 'tools/q8-worker.mjs', c.caminho, 'creditar',
                          c.userId, `chave-${i}`, String(alvo), '50'],
          { cwd: RAIZ, encoding: 'utf8', timeout: 30000 },
          (err, out) => { try { res(JSON.parse(out)); } catch { res({ erro: String(err) }); } });
      })));
      igual(rs.filter(r => r.erro).length, 0, 'algum filho falhou');
      const db = abrirBanco(c.caminho);
      const sal = saldos(db, c.userId).bonus;
      db.close();
      igual(sal, 300,
        `seis chaves diferentes creditaram ${sal} em vez de 300 — a idempotência ` +
        `está tratando operações distintas como repetição`);
    } finally { c.db.close(); rmSync(c.dir, { recursive: true, force: true }); }
  });

  /* --- o dinheiro não se multiplica entre processos ---------------------- */

  s.teste('doze processos disputando o mesmo saldo não criam dinheiro', async () => {
    const c = bancoNovo();
    try {
      creditar(c.db, { userId: c.userId, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                       valor: 100, idem: 'seed', agora: AGORA });
      /* Doze tentativas de reservar 20 sobre um saldo de 100: cinco cabem. */
      const rs = await correr(12, { banco: c.caminho, operacao: 'reservar',
                                    userId: c.userId, chave: 'corrida', extra: 20 });
      const aceitas = rs.filter(r => r.ok === true).length;
      igual(aceitas, 5,
        `${aceitas} reservas de 20 sobre saldo 100 — esperado exatamente 5. ` +
        `Mais que isso é dinheiro criado entre processos.`);

      const db = abrirBanco(c.caminho);
      const sal = saldos(db, c.userId);
      const problemas = reconciliarNoBanco(db, c.userId);
      db.close();
      igual(sal.transferivel, 0, `sobrou ${sal.transferivel} disponível`);
      igual(sal.reservado_transferivel, 100, `reservado ficou ${sal.reservado_transferivel}`);
      igual(problemas.length, 0, `o ledger não fecha com o saldo: ${problemas.join('; ')}`);
      for (const [k, v] of Object.entries(sal)) ok(v >= 0, `${k} ficou negativo: ${v}`);
    } finally { c.db.close(); rmSync(c.dir, { recursive: true, force: true }); }
  });

  s.teste('o saldo nunca fica negativo sob disputa entre processos', async () => {
    const c = bancoNovo();
    try {
      creditar(c.db, { userId: c.userId, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                       valor: 37, idem: 'seed', agora: AGORA });
      /* Valor que NÃO divide o saldo: força o último a ser recusado no meio. */
      await correr(10, { banco: c.caminho, operacao: 'reservar',
                         userId: c.userId, chave: 'resto', extra: 10 });
      const db = abrirBanco(c.caminho);
      const sal = saldos(db, c.userId);
      db.close();
      for (const [k, v] of Object.entries(sal))
        ok(v >= 0, `${k} ficou ${v} — o CHECK do esquema é a última linha de defesa ` +
                   `e ela cedeu`);
      igual(sal.transferivel + sal.reservado_transferivel, 37,
        'o total mudou: dinheiro apareceu ou sumiu na disputa');
    } finally { c.db.close(); rmSync(c.dir, { recursive: true, force: true }); }
  });

  return s;
}
