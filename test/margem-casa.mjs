/* Q1/Q2/Q6 · A MARGEM DA CASA TEM CAMINHO (R18 — fecha a L-047)
 *
 * ── O QUE A LACUNA REGISTRAVA ──────────────────────────────────────────────
 *
 * `margem.definir` existia em `EXIGE` (papel `economia`) e em `DESTRUTIVAS`
 * (confirmação obrigatória) desde o F1.11, passando pelo `agir`, que audita
 * antes de executar. **E não tinha rota.** A ação estava desenhada e desarmada.
 *
 * O R9 tinha removido a margem do cliente pelo motivo certo — ela vivia em
 * `localStorage`, e preço decidido ali não tem papel, confirmação nem registro.
 * Desde então, ninguém definia margem por caminho nenhum.
 *
 * ── O QUE ESTE ARQUIVO GUARDA, E POR QUE É POUCO ──────────────────────────
 *
 * As três recusas — sem papel, sem motivo, sem confirmação — já são do `agir`,
 * e o `test/admin.mjs` as cobra lá. Repeti-las aqui seria testar o `agir` duas
 * vezes. O que este bloco pode ter quebrado é a LIGAÇÃO:
 *
 *   · a rota chegar ao `agir` em vez de gravar por fora;
 *   · o valor inválido ser recusado na ESCRITA, e não só ignorado na leitura;
 *   · o registro guardar o `de` e o `para` de verdade;
 *   · e a rodada de fato USAR o que foi definido.
 *
 * O último é o que fecha a lacuna. Uma margem que se grava e não precifica é
 * uma configuração decorativa — e o painel diria um número que a odd não usa.
 */
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { criarOperador, definirMargem, margemDaCasa, ERRO_ADMIN } from '../server/admin.mjs';
import { criarScheduler } from '../server/scheduler.mjs';
import { MARGEM_MAX } from '../engine/preco.mjs';

const AGORA = Date.parse('2026-03-02T12:00:00Z');

function cenario(papel = 'economia') {
  const db = abrirBanco(':memory:'); migrar(db);
  const op = criarOperador(db, { email: `op-${papel}@exemplo.test`, papel, agora: AGORA });
  return { db, op };
}
const definir = (db, op, extra) => definirMargem(db,
  { operadorId: op.id, motivo: 'ajuste de teste', confirmado: true, agora: AGORA, ...extra });

export function suite() {
  const s = criarSuite('margem-casa');

  /* --- o estado inicial não mudou nada ----------------------------------- */

  /* `null` é "use a do motor", e é diferente de `0`, que é uma casa sem margem.
     A migração nasce com `null` de propósito: o comportamento de hoje continua
     sendo o de hoje até alguém decidir o contrário. */
  s.teste('a casa nasce sem margem própria, usando a do motor', () => {
    const { db } = cenario();
    igual(margemDaCasa(db), null, 'a casa nasceu com margem própria — o padrão mudou sem ninguém pedir');
  });

  /* --- a escrita recusa o que não pode ser gravado ----------------------- */

  /* VALIDAR NA ESCRITA, e não só na leitura. O `precificar` já ignora valor
     inválido e cai no padrão — mas ignorar na hora de precificar deixaria o
     painel MOSTRANDO um número que a rodada não usa. Recusar na escrita é o que
     separa "a rodada ignorou" de "nunca existiu". */
  s.teste('margem fora da faixa é recusada na ESCRITA', () => {
    const { db, op } = cenario();
    for (const v of [-0.01, MARGEM_MAX + 0.01, 2, '0.1', NaN, Infinity]) {
      let recusou = false;
      try { definir(db, op, { valor: v }); } catch (e) { recusou = e.codigo === ERRO_ADMIN.ACAO; }
      ok(recusou, `margem ${JSON.stringify(v)} foi aceita`);
    }
    igual(margemDaCasa(db), null, 'uma tentativa recusada mexeu no valor gravado');
  });

  s.teste('margem válida é gravada, e zero não vira ausente', () => {
    const { db, op } = cenario();
    definir(db, op, { valor: 0.12 });
    igual(margemDaCasa(db), 0.12, 'a margem válida não foi gravada');
    definir(db, op, { valor: 0 });
    igual(margemDaCasa(db), 0, 'margem ZERO foi confundida com ausente — a casa ficaria sem margem sem ninguém pedir');
    definir(db, op, { valor: null });
    igual(margemDaCasa(db), null, 'não deu para voltar à margem do motor');
  });

  /* --- e o caminho passa pelas camadas que já existiam -------------------- */

  s.teste('papel insuficiente não define margem', () => {
    const { db, op } = cenario('suporte');
    let recusou = false;
    try { definir(db, op, { valor: 0.2 }); } catch (e) { recusou = e.codigo === ERRO_ADMIN.SEM_PAPEL; }
    ok(recusou, 'um operador de suporte definiu a margem da casa');
    igual(margemDaCasa(db), null, 'a tentativa sem papel gravou mesmo assim');
  });

  s.teste('sem confirmação explícita não define margem', () => {
    const { db, op } = cenario();
    let recusou = false;
    try { definir(db, op, { valor: 0.2, confirmado: false }); }
    catch (e) { recusou = e.codigo === ERRO_ADMIN.SEM_CONFIRMAR; }
    ok(recusou, '`margem.definir` é destrutiva e passou sem confirmação');
    igual(margemDaCasa(db), null, 'a tentativa sem confirmação gravou mesmo assim');
  });

  s.teste('sem motivo escrito não define margem', () => {
    const { db, op } = cenario();
    let recusou = false;
    try { definir(db, op, { valor: 0.2, motivo: '   ' }); }
    catch (e) { recusou = e.codigo === ERRO_ADMIN.SEM_MOTIVO; }
    ok(recusou, 'a margem mudou sem motivo escrito');
  });

  /* --- o registro guarda o ANTES e o DEPOIS ------------------------------ */

  /* "Fulano mudou a margem" não serve para nada meses depois. O que serve é
     "de 8% para 12%, porque X" — e é isso que o `de`/`para` guardam. */
  s.teste('a auditoria guarda de quanto para quanto', () => {
    const { db, op } = cenario();
    definir(db, op, { valor: 0.12, motivo: 'primeiro ajuste' });
    definir(db, op, { valor: 0.09, motivo: 'segundo ajuste' });
    const regs = db.prepare(
      `SELECT * FROM admin_auditoria WHERE acao='margem.definir' ORDER BY criado_em`).all();
    igual(regs.length, 2, 'nem toda mudança de margem virou registro');
    igual(regs[0].de, 'motor', 'o primeiro registro não diz que a casa vinha da margem do motor');
    igual(regs[0].para, '0.12', 'o primeiro registro não diz para quanto foi');
    igual(regs[1].de, '0.12', 'o segundo registro não diz de quanto veio');
    igual(regs[1].para, '0.09', 'o segundo registro não diz para quanto foi');
    ok(regs.every(r => r.motivo && r.motivo.trim()), 'algum registro ficou sem motivo');
  });

  /* --- e a rodada USA o que foi definido --------------------------------- */

  /* É ISTO QUE FECHA A LACUNA. Margem que se grava e não precifica é
     configuração decorativa: o painel mostraria um número que a odd não usa, e
     o operador decidiria sobre uma alavanca desligada. */
  s.teste('a rodada aberta depois usa a margem da casa', () => {
    const { db, op } = cenario();
    const sched = criarScheduler({ db, sims: 400, relogio: () => AGORA });

    const semMargem = sched.abrirRodada();
    const padrao = semMargem.preco.margemConfigurada;

    definir(db, op, { valor: 0.2, motivo: 'medir o efeito' });
    sched.cancelar?.();
    /* Rodada nova: a margem vale a partir da PRÓXIMA. Mudar o preço de uma
       rodada com aposta viva alteraria o retorno de um bilhete já confirmado, e
       o §4.4.6 proíbe aplicação retroativa. */
    const db2 = db;
    const sched2 = criarScheduler({ db: db2, sims: 400, relogio: () => AGORA + 200_000 });
    const comMargem = sched2.abrirRodada();

    dentro(comMargem.preco.margemConfigurada, 0.2, 1e-9,
      `a rodada não usou a margem da casa (usou ${comMargem.preco.margemConfigurada}, ` +
      `padrão era ${padrao}) — a configuração é decorativa`);
  });

  return s;
}
