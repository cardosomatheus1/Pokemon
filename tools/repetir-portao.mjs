/* Roda o portão mais de uma vez, e reprova se as execuções discordarem.
 *
 * POR QUE ISSO EXISTE: o defeito D-004 passava em DUAS de cada TRÊS execuções e
 * entrou no repositório porque o bloco foi fechado rodando o portão uma vez.
 * Teste que passa em dois de três é indistinguível de teste que passa, se
 * ninguém rodar duas vezes.
 *
 * A suíte tem componentes que dependem de sorteio — a odd do azarão muda a cada
 * rodada, e o navegador entrega tempos diferentes a cada carga. Uma execução
 * não é evidência; é amostra de tamanho um.
 *
 * DUAS execuções, e não cinco: o objetivo é pegar instabilidade grosseira (a
 * classe do D-004, que falhava em 1/3 das vezes) sem triplicar um passo que já
 * leva ~50 s com navegador. Discordância entre as duas é sinal suficiente para
 * mandar investigar — e investigar é o que se faz com sinal, não com certeza.
 *
 * Uso: node tools/repetir-portao.mjs [vezes]
 */
import { spawnSync } from 'node:child_process';

const VEZES = Math.max(2, Number(process.argv[2]) || 2);
const env = { ...process.env, EXIGE_VISUAL: '1', EXIGE_LOCAL: '1' };
const resultados = [];

for (let i = 1; i <= VEZES; i++) {
  process.stdout.write(`\n── execução ${i} de ${VEZES} ──\n`);
  const r = spawnSync('node', ['test/run.mjs'], { stdio: 'inherit', env });
  resultados.push(r.status === 0);
}

const verdes = resultados.filter(Boolean).length;
if (verdes === VEZES) {
  console.log(`\n✓ portão estável: ${VEZES}/${VEZES} execuções verdes.`);
  process.exit(0);
}
if (verdes === 0) {
  console.error(`\n✗ portão vermelho nas ${VEZES} execuções.`);
  process.exit(1);
}
console.error(
  `\n✗ PORTÃO INSTÁVEL: ${verdes} de ${VEZES} execuções verdes.\n` +
  `  Isso é pior que vermelho constante. Vermelho constante é um defeito com\n` +
  `  endereço; instável é um defeito que escolhe quando aparecer — e foi assim\n` +
  `  que o D-004 chegou a um commit. Investigue antes de fechar o bloco.`);
process.exit(1);
