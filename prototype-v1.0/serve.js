/* Servidor estático mínimo, só para abrir a arena em http://localhost:8792
   (o index.html também funciona com duplo clique — isto aqui é só para
   quem preferir rodar como site de verdade).

   Uso:  node serve.js            */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = +(process.env.PORT || 8792);
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript',
               '.css':'text/css', '.png':'image/png', '.gif':'image/gif',
               '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
               '.svg':'image/svg+xml', '.ico':'image/x-icon',
               '.woff2':'font/woff2', '.woff':'font/woff',
               '.json':'application/json', '.mp3':'audio/mpeg',
               '.ogg':'audio/ogg', '.m4a':'audio/mp4', '.wav':'audio/wav' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('não encontrado'); return;
  }
  const stat = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

  /* Suporte a Range é obrigatório para áudio: sem ele o navegador não
     descobre o tamanho total e o `duration` do <audio> vira Infinity —
     o que quebra o loop e o reinício da trilha a cada rodada. */
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const ini = m && m[1] ? parseInt(m[1]) : 0;
    const fim = m && m[2] ? parseInt(m[2]) : stat.size - 1;
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${ini}-${fim}/${stat.size}`,
      'Content-Length': fim - ini + 1,
      'Accept-Ranges': 'bytes',
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start: ini, end: fim }).pipe(res);
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('Arena em http://localhost:' + PORT));
