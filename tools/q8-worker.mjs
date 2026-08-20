/* O TRABALHADOR DO Q8 — um processo de verdade, contra o mesmo arquivo de banco.
 *
 * Existe porque `node:sqlite` é SÍNCRONO: dentro de um processo, "concorrência"
 * é intercalação de transações, e há classes de erro que ela não alcança. A mais
 * cara é o TOCTOU entre processos — dois lendo "essa chave não existe" no mesmo
 * instante e os dois escrevendo. Foi o que a L-032 registrou.
 *
 * Chamado por `test/concorrencia.mjs`, nunca à mão. Recebe tudo por argumento e
 * escreve UMA linha de JSON no stdout — sem estado, sem log, sem nada que o pai
 * precise interpretar além do resultado.
 *
 * A BARREIRA É UM INSTANTE COMBINADO, e não um sinal do pai. Cada processo
 * espera até `alvoMs` e só então dispara. Sinal do pai chegaria em ordens
 * diferentes e o teste mediria a ordem de entrega, não a corrida.
 */
import { abrirBanco } from '../server/banco.mjs';
import { creditar, reservarNoBanco, liquidarNoBanco } from '../server/carteira.mjs';

const [, , banco, operacao, userId, chave, alvoMs, extra] = process.argv;

/* Espera ocupada nos últimos milissegundos. `setTimeout` erra por dezenas de ms
   sob carga, e aqui a janela que interessa é justamente essa. */
const alvo = Number(alvoMs);
while (Date.now() < alvo) { /* nada: é a barreira */ }

const db = abrirBanco(banco);
/* SEM ISTO O TESTE MEDE OUTRA COISA. Dois escritores no mesmo arquivo fazem o
   segundo receber SQLITE_BUSY na hora; com o timeout, ele espera a vez e a
   pergunta volta a ser "a idempotência segurou?" em vez de "quem chegou
   primeiro no lock?". */
db.exec('PRAGMA busy_timeout = 8000');

let saida;
try {
  if (operacao === 'creditar') {
    saida = creditar(db, { userId, tipo: 'DAILY_REWARD', bucket: 'bonus',
                           valor: Number(extra), idem: chave, agora: alvo });
  } else if (operacao === 'reservar') {
    saida = reservarNoBanco(db, { userId, valor: Number(extra), ref: chave, agora: alvo });
  } else if (operacao === 'liquidar') {
    saida = liquidarNoBanco(db, { userId, composicao: JSON.parse(extra), ganhou: true,
                                  odd: 2, ref: chave, idem: chave, agora: alvo });
  } else {
    saida = { ok: false, motivo: 'operacao desconhecida' };
  }
  process.stdout.write(JSON.stringify({ pid: process.pid, ...saida }));
} catch (e) {
  process.stdout.write(JSON.stringify({ pid: process.pid, ok: false, erro: e.message }));
} finally {
  db.close();
}
