/* ST-1.4 · O BOLO NÃO BUSCA SEM SESSÃO (D-132).
 *
 * Achado pela CI (ensaio do piloto, run 122, 30/09): uma recusa 401 em
 * `GET /api/mercado/resultado` depois de sair da conta. A causa: `sair()`
 * esquece o token na hora, mas a página só recarrega depois que a revogação
 * responde — e nesse intervalo a nova tentativa do resultado do bolo (a cada
 * 1,5 s, até 5) e a busca periódica da lista saíam SEM credencial. Dependia de
 * sair dentro da janela; por isso aparecia numa execução e não nas seguintes.
 * "Instável" não era a causa: era um pedido que não devia sair. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('bolo-sessao');
  s.teste('D-132: sem sessão, o bolo não busca — nem a lista, nem a nova tentativa do resultado', () => {
    const t = semComentario(fonte('../app/modules/bolo-tela.mjs'));
    ok(/async function buscar\(\) \{\s*if \(!api\.temSessao\(\)\) \{ parar\(\); return; \}/.test(t), 'a busca periódica sai sem credencial depois do Sair');
    ok(/async function buscarResultado\(\) \{\s*if \(!api\.temSessao\(\)\) return;/.test(t), 'a busca do resultado sai sem credencial depois do Sair');
    ok(/setTimeout\(\(\) => \{ if \(E\.modo === 'resultado' && api\.temSessao\(\)\) buscarResultado\(\); \}/.test(t), 'a nova tentativa agendada antes do Sair dispara depois dele');
  });
  return s;
}
