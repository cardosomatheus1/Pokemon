/* Servidor estático mínimo, só para abrir a arena em http://localhost:8792
   (o index.html também funciona com duplo clique — isto aqui é só para
   quem preferir rodar como site de verdade).

   Uso:  node serve.js            */

/* ── ESM, e nao CommonJS ─────────────────────────────────────────────────
   O `package.json` ganhou "type": "module" em algum bloco depois deste
   arquivo, e `npm run serve` passou a morrer com "require is not defined in
   ES module scope". Nao apareceu antes porque o servidor de quem estava
   desenvolvendo ja estava no ar — o comando quebrado so cobra na proxima vez
   que alguem precisa SUBIR o servidor, que costuma ser noutro dia. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* A RAIZ E O REPOSITORIO, e nao esta pasta. O jogo de verdade mora em `app/`
   desde o F0.2; servindo so `prototype/`, o `/app/index.html` devolvia 404 e
   o comando parecia funcionar (o servidor sobe, a porta responde) enquanto
   nao servia a unica coisa que alguem quer ver. */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 8792);
/* `.mjs` FALTAVA, e o jogo inteiro e feito deles.

   Sem o tipo certo o Node devolve `application/octet-stream`, e o navegador
   RECUSA o modulo: *"Strict MIME type checking is enforced for module
   scripts"*. A pagina abre, o HTML aparece, e nada acontece — fica no
   "carregando..." para sempre.

   Esta tabela e de quando o prototipo era um `.js` unico. O F0.2 quebrou o
   jogo em modulos `.mjs` e ninguem voltou aqui — o quarto defeito seguido
   neste arquivo, e todos da mesma familia: coisas que so cobram quando alguem
   sobe o servidor do zero. O arnes de teste sobe o PROPRIO servidor, e por
   isso nunca tocou neste. */
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript',
               '.mjs':'text/javascript', '.svg':'image/svg+xml',
               '.webp':'image/webp', '.woff2':'font/woff2', '.woff':'font/woff',
               '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8',
               '.map':'application/json', '.pdf':'application/pdf',
               '.css':'text/css', '.png':'image/png', '.gif':'image/gif',
               '.json':'application/json', '.mp3':'audio/mpeg',
               '.ogg':'audio/ogg', '.m4a':'audio/mp4', '.wav':'audio/wav' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  /* A RAIZ REDIRECIONA — nao serve o arquivo no lugar dela.

     Ela apontava para `/index.html`, que nao existe na raiz do repositorio
     desde que o jogo virou `app/` no F0.2: quem abria `localhost:8792` recebia
     404 com o servidor no ar. Foi o que o dono viu — "esse local nao abre".

     A primeira correcao SERVIU o `app/index.html` em `/`, e trocou um defeito
     por outro pior: a pagina abria e todos os caminhos relativos dela
     (`./modules/...`) passavam a resolver contra a RAIZ, dando 404 em cada
     modulo. A tela ficava no "carregando..." para sempre, sem erro visivel.

     302 e a resposta certa: o navegador troca de endereco, e a partir dali
     todo caminho relativo resolve contra `/app/`, que e onde eles moram. */
  if (p === '/' || p === '/index.html') {
    res.writeHead(302, { Location: '/app/index.html' });
    return res.end();
  }
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
