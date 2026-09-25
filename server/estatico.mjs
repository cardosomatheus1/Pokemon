/* O JOGO SERVIDO PELO MESMO ENDEREÇO DA API (ST-7.2a, PILOTO-01).
 *
 * O cliente chama a API no mesmo endereço da página (`app/modules/api.mjs`,
 * base vazia — e por isso a lista de origens do CORS nasce vazia). Até aqui
 * ninguém servia as duas metades juntas, e o modo com conta real só existia
 * nos testes. Este arquivo é a metade que faltava.
 *
 * ── POR LISTA, E NÃO POR EXCLUSÃO ─────────────────────────────────────────
 *
 * O `tools/jogar.mjs` serve a raiz inteira do repositório — certo para quem
 * joga sozinho no próprio PC, e errado aqui: esta porta é aberta para amigos,
 * e `dados/` guarda o banco com o saldo e o e-mail de todo mundo. Exclusão
 * ("tudo menos dados/") nasce vazando o próximo diretório sensível que alguém
 * criar. Por isso a regra é a lista do que o CLIENTE lê — medida com `grep` nos
 * `import` do `app/` em 25/09 —, e mais nada.
 *
 * A conferência é sobre o caminho JÁ RESOLVIDO, e não sobre a URL: normalizar
 * depois de juntar é o que fecha `..` cru e codificado. */
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));

/* Diretórios inteiros, e UM arquivo do servidor: o contrato de versão, que o
   `api.mjs` importa. O resto de `server/` não sai. */
export const PERMITIDOS = ['app', 'arte', 'assets', 'content', 'engine', 'server/contrato.mjs'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

/* A CSP DA PÁGINA. A da API é `default-src 'none'`, e aplicada aqui quebraria
 * o jogo inteiro. Esta é a mais fechada que o `index.html` de hoje aguenta:
 * script e estilo em linha existem (o boot e o tema), e a folha de fonte tem
 * uma queda para o Google Fonts quando o espelho local falta. A página só
 * conversa com a própria origem. */
export const CSP_DO_JOGO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CABECALHOS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy': CSP_DO_JOGO,
  /* Revalida sempre: no piloto o jogo muda a cada push, e um amigo com o
     módulo velho em cache jogaria contra um servidor novo. */
  'cache-control': 'no-cache',
};

/* Caminho absoluto do arquivo, ou `null`. Puro, e por isso testável sem porta. */
export function resolverArquivo(caminhoDaUrl) {
  let rel;
  try { rel = decodeURIComponent(String(caminhoDaUrl ?? '')); } catch { return null; }
  if (rel.includes('\0')) return null;
  const abs = resolve(RAIZ, '.' + (rel.startsWith('/') ? rel : '/' + rel));
  if (!abs.startsWith(RAIZ + sep)) return null;
  const relativo = abs.slice(RAIZ.length + 1).split(sep).join('/');
  const ok = PERMITIDOS.some(p => relativo === p || relativo.startsWith(p + '/'));
  return ok ? abs : null;
}

/* Responde sempre (devolve `true`): quem chega aqui não é API. Só GET e HEAD
   leem; a raiz leva ao jogo. O 404 não ecoa o caminho — mesma regra da API. */
export function servirJogo(req, res, caminho) {
  /* Fora de `/api/` não há o que escrever: POST num arquivo é 404, e não o
     "versão ausente" da API, que mandaria procurar o defeito no lugar errado. */
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...CABECALHOS });
    res.end('não encontrado'); return true;
  }
  if (caminho === '/' || caminho === '/app' || caminho === '/app/') {
    res.writeHead(302, { location: '/app/index.html', ...CABECALHOS });
    res.end(); return true;
  }
  const arquivo = resolverArquivo(caminho);
  let st = null;
  try { st = arquivo ? statSync(arquivo) : null; } catch { st = null; }
  if (!st || !st.isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...CABECALHOS });
    res.end('não encontrado'); return true;
  }
  const tipo = MIME[extname(arquivo).toLowerCase()] || 'application/octet-stream';

  /* Range é obrigatório para áudio: sem ele `duration` vira Infinity e a
     trilha não recomeça (o mesmo motivo do `tools/jogar.mjs`). */
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    const ini = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    const fim = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
    if (ini > fim || ini >= st.size) {
      res.writeHead(416, { 'content-range': `bytes */${st.size}`, ...CABECALHOS });
      res.end(); return true;
    }
    res.writeHead(206, { 'content-type': tipo, 'content-range': `bytes ${ini}-${fim}/${st.size}`,
                         'content-length': fim - ini + 1, 'accept-ranges': 'bytes', ...CABECALHOS });
    if (req.method === 'HEAD') { res.end(); return true; }
    createReadStream(arquivo, { start: ini, end: fim }).pipe(res); return true;
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': st.size, 'accept-ranges': 'bytes', ...CABECALHOS });
  if (req.method === 'HEAD') { res.end(); return true; }
  createReadStream(arquivo).pipe(res);
  return true;
}
