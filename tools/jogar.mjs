/* ABRIR A ARENA localmente, sem instalar nada.
 *
 * O `app/index.html` é feito de módulos ES. Abrir por duplo clique NÃO
 * funciona: `file://` bloqueia `import`, e a tela fica preta sem dizer por quê.
 * Por isso existe este arquivo — servidor estático mínimo, enraizado na RAIZ do
 * repositório (e não em `app/`), porque a arte vive em `/assets/` e os
 * documentos em `/docs/`; enraizar em `app/` deixaria os dois fora do alcance.
 *
 * Não é o backend. `server/principal.mjs` é o backend (F1.1…F1.17); este aqui
 * serve arquivo e mais nada, e é o caminho de quem só quer JOGAR.
 *
 *   node tools/jogar.mjs        →  http://localhost:8792/app/index.html
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORTA = +(process.env.PORT || 8792);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.woff2': 'font/woff2',
};

createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/app/index.html';
  const arquivo = join(RAIZ, p);

  /* Escapar da raiz por `..` é a única forma deste servidor virar leitura
     arbitrária do disco de quem o rodou. A conferência é sobre o caminho já
     resolvido, e não sobre a URL — normalizar depois de juntar é o que fecha. */
  if (!resolve(arquivo).startsWith(RAIZ) || !existsSync(arquivo)
      || statSync(arquivo).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('não encontrado: ' + p);
  }

  const st = statSync(arquivo);
  const tipo = MIME[extname(arquivo).toLowerCase()] || 'application/octet-stream';

  /* Range é obrigatório para áudio: sem ele o navegador não descobre o tamanho
     total, `duration` vira Infinity, e a trilha não reinicia a cada rodada. */
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const ini = m && m[1] ? parseInt(m[1]) : 0;
    const fim = m && m[2] ? parseInt(m[2]) : st.size - 1;
    res.writeHead(206, {
      'Content-Type': tipo,
      'Content-Range': `bytes ${ini}-${fim}/${st.size}`,
      'Content-Length': fim - ini + 1,
      'Accept-Ranges': 'bytes',
    });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(arquivo, { start: ini, end: fim }).pipe(res);
  }

  res.writeHead(200, {
    'Content-Type': tipo, 'Content-Length': st.size, 'Accept-Ranges': 'bytes',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(arquivo).pipe(res);
}).listen(PORTA, () => {
  console.log(`\n  PokéArena  →  http://localhost:${PORTA}/app/index.html\n`);
  if (!existsSync(join(RAIZ, 'assets')))
    console.log('  aviso: assets/ ausente — rode `npm run assets` para a arte.\n');
});
