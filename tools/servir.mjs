/* SERVIDOR ESTÁTICO PARA ABRIR O JOGO NO NAVEGADOR.
 *
 * O jogo é módulo ES: abrir `app/index.html` por `file://` não funciona, porque
 * o navegador recusa `import` de origem `null`. Daí este arquivo — ele não faz
 * nada além de entregar os bytes que já estão no disco.
 *
 * NÃO CONFUNDIR COM `server/`. Aquele é o servidor do JOGO — contas, carteira,
 * rodadas, Liga —, com banco, sessão e rotas. Este aqui é um entregador de
 * arquivo, e é o que basta para jogar o modo local.
 *
 * Zero dependência, como o resto: `node:http` e `node:fs`.
 *
 *   node tools/servir.mjs              porta 8099
 *   node tools/servir.mjs --porta 9000
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const PORTA = Number(arg('--porta', 8099));

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

/* O TIPO IMPORTA MAIS DO QUE PARECE, e este projeto já pagou por isso: no R25,
   uma folha de estilo servida sem extensão saiu como `application/octet-stream`
   e o navegador a recusou em silêncio. As fontes do tema não carregavam, e três
   blocos anteriores "não mudaram nada" por causa disso — é o D-037. */
const tipoDe = arq => TIPOS[extname(arq).toLowerCase()] || 'application/octet-stream';

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);

    /* ── A RAIZ REDIRECIONA, E NÃO REESCREVE ────────────────────────────────
     *
     * Aqui havia `if (p === '/') p = '/app/index.html'`, e ele ENTREGAVA a
     * página certa com a base errada. O navegador continuava achando que estava
     * em `/`, então todo caminho relativo do documento resolvia contra a raiz:
     * `./modules/motor.mjs` virava `/modules/motor.mjs`, que não existe.
     *
     * MEDIDO, e o número é o argumento:
     *
     *     http://localhost:8099/                 0 linhas de odds · 34 erros 404
     *     http://localhost:8099/app/index.html  12 linhas de odds ·  1 erro 404
     *
     * O sintoma é cruel porque a página PARECE funcionar: a tela de entrada é
     * HTML estático e desenha normalmente. O jogo só nunca dá boot — fica em
     * "simulando batalhas" para sempre, sem nada no console de quem só olha a
     * tela. Foi assim que o dono do projeto recebeu o link.
     *
     * `302` e não `301`: um redirecionamento permanente fica gravado no
     * navegador, e um servidor de desenvolvimento não deve deixar marca que
     * sobreviva a ele mesmo. */
    if (p === '/' || p === '/app' || p === '/app/') {
      res.writeHead(302, { location: '/app/index.html' }).end();
      return;
    }
    /* O `normalize` e o `startsWith` juntos: sem os dois, `..%2f..%2f` sai da
       raiz e este servidorzinho entrega o disco inteiro de quem o rodou. */
    const alvo = join(RAIZ, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!alvo.startsWith(RAIZ)) { res.writeHead(403).end('fora da raiz'); return; }
    const s = await stat(alvo);
    const arq = s.isDirectory() ? join(alvo, 'index.html') : alvo;
    const corpo = await readFile(arq);
    res.writeHead(200, {
      'content-type': tipoDe(arq),
      /* Sem cache: quem está desenvolvendo recarrega esperando ver a mudança. */
      'cache-control': 'no-store',
    }).end(corpo);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
       .end('não encontrado');
  }
})
  /* 127.0.0.1 e não 0.0.0.0, por decisão: expor a porta na rede local é
     ampliar superfície e é decisão do dono do projeto, não do script. Ver
     D-031 em docs/DEFEITOS.md. */
  .listen(PORTA, '127.0.0.1', () => {
    console.log(`\n  PokéArena em  http://localhost:${PORTA}/`);
    console.log(`  servindo      ${RAIZ}`);
    console.log(`  ctrl+c para parar\n`);
  });
