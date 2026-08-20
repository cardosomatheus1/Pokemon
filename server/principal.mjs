/* O PONTO DE ENTRADA do serviço (F1.1).
 *
 * Só isto: lê a configuração, sobe o servidor, e desliga com educação. Toda a
 * lógica está em `servidor.mjs`, que é uma FÁBRICA — este arquivo é o único
 * lugar do backend com efeito colateral ao ser executado, e é de propósito:
 * importar qualquer outro módulo do servidor não pode abrir porta nem banco.
 */
import { criarServidor } from './servidor.mjs';

const s = criarServidor();
const porta = await s.ouvir();
console.log(`[pokearena] ${s.config.ambiente} · porta ${porta} · motor ${
  (await import('./rodada.mjs')).VERSAO_MOTOR}`);

/* Desligar sem cortar requisição no meio. Sem isto, um deploy derruba a resposta
   de quem estava apostando naquele instante. */
for (const sinal of ['SIGINT', 'SIGTERM'])
  process.on(sinal, async () => {
    console.log(`\n[pokearena] ${sinal} — fechando`);
    await s.fechar();
    process.exit(0);
  });
