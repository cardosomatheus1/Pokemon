/* Q1/Q6 · UM ENDEREÇO: O SERVIDOR SERVE O JOGO E A API (ST-7.2a, PILOTO-01).
 *
 * O cliente fala com a API no MESMO endereço da página (`api.mjs`, base vazia,
 * sem CORS). Até aqui ninguém servia os dois juntos: o `tools/servir.mjs`
 * entrega arquivo e responde 404 em `/api`, e o backend responde API e 404 no
 * resto. Um piloto com amigos precisava de um endereço onde as duas metades
 * se encontram — e é este.
 *
 * O que este arquivo trava, e a metade de segurança é a maior:
 *
 *   o jogo abre          `/` e `/app/index.html` entregam a página, com tipo
 *   só o que o jogo lê   app, arte, assets, content, engine e o contrato — e
 *                        NUNCA `dados/` (o banco com o saldo de todo mundo),
 *                        `.git`, `server/`, `test/`, `docs/`
 *   `..` não escapa      nem cru, nem codificado
 *   a API não muda       `/api/*` continua exigindo versão e sessão
 *   a página tem CSP     sem a do JSON (`default-src 'none'`), que a quebraria
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { resolverArquivo, PERMITIDOS } from '../server/estatico.mjs';
import { lerConfig } from '../server/config.mjs';

/* Sem `ouvir()`: o laço não liga, e nenhuma rodada é precificada — o que se
   mede aqui é o despacho, e subir o laço custaria ~5 s por teste. */
async function comServidor(fn, config = {}) {
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true, ...config } });
  await new Promise(r => s.servidor.listen(0, '127.0.0.1', r));
  const porta = s.servidor.address().port;
  try { return await fn(porta); } finally { await s.fechar(); }
}
const pedir = (porta, caminho, opcoes = {}) =>
  fetch(`http://127.0.0.1:${porta}${caminho}`, { redirect: 'manual', ...opcoes })
    .then(async r => ({ status: r.status, cab: Object.fromEntries(r.headers.entries()), corpo: await r.text() }));

export async function suite() {
  const s = criarSuite('estatico');

  s.teste('o jogo abre no mesmo endereço da API', async () => {
    await comServidor(async porta => {
      const raiz = await pedir(porta, '/');
      igual(raiz.status, 302, 'a raiz não leva ao jogo');
      igual(raiz.cab.location, '/app/index.html', 'a raiz leva a outro lugar');
      const p = await pedir(porta, '/app/index.html');
      igual(p.status, 200, 'a página do jogo não abre pelo servidor');
      ok(/text\/html/.test(p.cab['content-type']), `a página saiu como ${p.cab['content-type']}`);
      ok(p.corpo.includes('<html') || p.corpo.includes('<!DOCTYPE'), 'o corpo não é a página');
      const m = await pedir(porta, '/engine/seed.mjs');
      igual(m.status, 200, 'o motor que o cliente importa não é servido');
      ok(/javascript/.test(m.cab['content-type']), 'módulo servido sem tipo de script — o navegador recusa o import');
      igual((await pedir(porta, '/server/contrato.mjs')).status, 200, 'o contrato que o api.mjs importa não é servido');
    });
  });

  s.teste('o banco, o git e o código do servidor NUNCA saem', async () => {
    await comServidor(async porta => {
      for (const c of ['/dados/pokearena.db', '/.git/config', '/server/config.mjs', '/server/banco.mjs',
                       '/test/harness.mjs', '/docs/RETOMAR.md', '/package.json', '/.env',
                       '/app/../dados/pokearena.db', '/app/%2e%2e/server/config.mjs',
                       '/app/..%2fserver%2fconfig.mjs', '/assets/../../etc/passwd'])
        igual((await pedir(porta, c)).status, 404, `${c} foi servido`);
      const nao = await pedir(porta, '/app/nao-existe.png');
      igual(nao.status, 404, 'arquivo inexistente não deu 404');
      ok(!nao.corpo.includes('nao-existe'), 'o 404 ecoa o caminho pedido');
    });
  });

  s.teste('a resolução do caminho é por lista, e não por exclusão', () => {
    ok(PERMITIDOS.every(p => !/^(dados|server\/?$|test|docs|\.git)/.test(p)), `lista larga demais: ${PERMITIDOS}`);
    igual(resolverArquivo('/dados/x.db'), null, 'dados/ entrou');
    igual(resolverArquivo('/server/rotas.mjs'), null, 'um arquivo do servidor que não é o contrato entrou');
    igual(resolverArquivo('/app/../server/rotas.mjs'), null, 'o `..` escapou da lista');
    igual(resolverArquivo('/app/%00.html'), null, 'byte nulo passou');
    ok(resolverArquivo('/app/index.html')?.endsWith('app/index.html'), 'a página não resolve');
  });

  s.teste('a API continua a API: versão e sessão exigidas', async () => {
    await comServidor(async porta => {
      igual((await pedir(porta, '/api/perfil')).status, 400, '/api sem versão passou pelo estático');
      igual((await pedir(porta, '/api/nao-existe', { headers: { 'x-api-versao': '1' } })).status >= 400, true,
        'caminho de API desconhecido não é recusado');
      igual((await pedir(porta, '/app/index.html', { method: 'POST' })).status, 404, 'POST em arquivo foi aceito');
      igual((await pedir(porta, '/saude')).status, 200, 'o health check virou arquivo');
    });
  });

  s.teste('a página tem CSP própria — e a do JSON não vaza para ela', async () => {
    await comServidor(async porta => {
      const p = await pedir(porta, '/app/index.html');
      const csp = p.cab['content-security-policy'] || '';
      ok(!/default-src 'none'/.test(csp), 'a página saiu com a CSP do JSON — o jogo não carregaria nada');
      ok(/default-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp), `CSP da página fraca: ${csp}`);
      ok(/connect-src 'self'/.test(csp), 'a CSP não diz que a página só conversa com a própria origem');
      igual(p.cab['x-content-type-options'], 'nosniff', 'sem nosniff');
      const api = await pedir(porta, '/api/perfil');
      ok(/default-src 'none'/.test(api.cab['content-security-policy'] || ''), 'a API perdeu a CSP dela');
    });
  });

  s.teste('SERVIR_JOGO: ligado por padrão, e "0" desliga', () => {
    igual(lerConfig({ AMBIENTE: 'teste' }, () => {}).servirJogo, true, 'o padrão não serve o jogo — o modo com conta fica inalcançável');
    igual(lerConfig({ AMBIENTE: 'teste', SERVIR_JOGO: '0' }, () => {}).servirJogo, false, 'SERVIR_JOGO=0 não desligou');
  });

  s.teste('desligável: SERVIR_JOGO=0 devolve o servidor só de API', async () => {
    await comServidor(async porta => {
      const p = await pedir(porta, '/app/index.html');
      ok(p.status !== 200 && !/text\/html/.test(p.cab['content-type'] || ''), 'desligado, a página ainda saiu');
      igual((await pedir(porta, '/saude')).status, 200, 'o health check sumiu');
    }, { servirJogo: false });
  });

  return s;
}
