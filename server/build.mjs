/* A DIGITAL DO CÓDIGO QUE O SERVIDOR SERVE (ST-2.22b, D-145).
 *
 * Uma aba aberta antes de uma atualização segue rodando o código velho contra o
 * servidor novo. Na ST-2.21 isso custou uma run: a aba via a run na regra
 * antiga, o servidor já a tinha fechado na nova, e poção e recuar voltavam 409.
 *
 * O servidor lê, uma vez ao subir, o conteúdo do que o jogo executa (motor,
 * conteúdo, telas, servidor) e marca cada resposta da API com um resumo. A aba
 * guarda o primeiro que viu; outro, depois, quer dizer que o jogo mudou com ela
 * aberta. Pelo CONTEÚDO, e não por um número escrito à mão: número à mão
 * envelhece no dia em que alguém esquece de mudá-lo — e o `API_VERSAO` ficou
 * '1' nas duas pontas da ST-2.21.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTAS = ['engine', 'content', 'app/modules', 'server'];
const SOLTOS = ['app/index.html'];

export function digitalDoCodigo(raiz) {
  const base = fileURLToPath(raiz);
  const h = createHash('sha1');
  const arquivos = [];
  for (const p of PASTAS) {
    let nomes = [];
    try { nomes = readdirSync(join(base, p)); } catch { continue; }
    for (const n of nomes) if (n.endsWith('.mjs')) arquivos.push(`${p}/${n}`);
  }
  for (const s of SOLTOS) arquivos.push(s);
  for (const rel of arquivos.sort()) {
    try { if (!statSync(join(base, rel)).isFile()) continue; h.update(rel); h.update(readFileSync(join(base, rel))); }
    catch { /* arquivo que sumiu entre a lista e a leitura: fica de fora dos dois lados */ }
  }
  return h.digest('hex').slice(0, 12);
}
