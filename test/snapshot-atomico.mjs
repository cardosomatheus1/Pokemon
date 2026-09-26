/* Q1 · O INSTANTÂNEO DO PROTÓTIPO É GRAVADO DE FORMA ATÔMICA (D-122 · T17)
 *
 * A suíte `paridade` regrava tools/.snapshot-prototipo.mjs ao ser MONTADA, e
 * a lista é montada no principal e em cada trabalhador do executor paralelo:
 * quatro processos gravando e importando o mesmo arquivo. Medido em 26/09:
 * gravando direto, 8 de 80 importações concorrentes viam o arquivo truncado;
 * com temporário + rename, 0 de 80.
 *
 * A PRIMEIRA VERSÃO DESTE TESTE REPRODUZIA A CORRIDA, e o Q2 provou que ela
 * era decorativa: na caixa de areia a sabotagem S1388 PASSOU — a corrida
 * depende do relógio da máquina. Teste que pode passar por sorte não trava.
 * Esta versão é determinística: um gancho carregado ANTES do gerador espia o
 * `fs` e exige que o destino só seja tocado por um `rename`, nunca escrito.
 */
import { spawnSync } from 'node:child_process';
import { criarSuite, ok } from './harness.mjs';

const ESPIAO = `
import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
const w = fs.writeFileSync, r = fs.renameSync;
fs.writeFileSync = (p, ...a) => { process.stderr.write('ESCREVE ' + p + '\\n'); return w(p, ...a); };
fs.renameSync = (de, para) => { process.stderr.write('RENOMEIA ' + de + ' -> ' + para + '\\n'); return r(de, para); };
syncBuiltinESMExports();`;

export function suite() {
  const s = criarSuite('snapshot-atomico');
  s.teste('o destino nunca é escrito no lugar: grava-se um temporário e renomeia', () => {
    const r = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(ESPIAO)}`, 'tools/snapshot-prototipo.mjs'],
      { encoding: 'utf8' });
    ok(r.status === 0, `o gerador falhou: ${r.stderr}`);
    const escritas = [...r.stderr.matchAll(/^ESCREVE (.+)$/gm)].map(m => m[1]);
    const renomes = [...r.stderr.matchAll(/^RENOMEIA (.+) -> (.+)$/gm)].map(m => [m[1], m[2]]);
    ok(escritas.length > 0, 'o espião não viu gravação nenhuma — o teste não mede nada');
    ok(!escritas.some(p => p.endsWith('.snapshot-prototipo.mjs')), `o destino foi escrito no lugar: ${escritas.join(', ')} (D-122)`);
    ok(renomes.some(([de, para]) => escritas.includes(de) && para.endsWith('.snapshot-prototipo.mjs')),
      'o temporário não foi renomeado para o destino');
  });
  return s;
}
