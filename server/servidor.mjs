/* O SERVIÇO HTTP (F1.1).
 *
 * Fronteira: recebe requisição, valida o contrato, chama quem sabe responder, e
 * escreve a resposta. Não simula, não precifica, não guarda estado de jogo.
 *
 * ZERO DEPENDÊNCIAS, aqui também. `node:http` basta, e a regra do projeto não
 * abre exceção para o backend — um framework traria centenas de pacotes
 * transitivos para uma superfície que hoje tem cinco rotas.
 *
 * A FÁBRICA, e não um módulo com efeito colateral. `criarServidor()` devolve um
 * objeto; nada sobe ao importar. Isso é o que permite o teste levantar e
 * derrubar instâncias em porta efêmera, várias em paralelo, sem estado global —
 * e portão que não roda em paralelo desperdiça o que o T3 comprou.
 */
import { createServer } from 'node:http';
import { API_VERSAO, CABECALHO_VERSAO, ERROS, SEM_VERSAO, versaoAceita } from './contrato.mjs';
import { lerConfig } from './config.mjs';
import { VERSAO_MOTOR, montarRodadaServidor } from './rodada.mjs';
import { digital } from '../test/rodada-digital.mjs';
import { abrirBanco, migrar } from './banco.mjs';
import { criarScheduler } from './scheduler.mjs';
import { criarSala } from './transporte.mjs';
import { ROTAS, ROTAS_PUBLICAS, usuarioDa } from './rotas.mjs';

/* CABEÇALHOS DE SEGURANÇA, em toda resposta, inclusive nas de erro.
 *
 * Aplicados no ponto de saída e não por rota: cabeçalho de segurança que
 * depende de alguém lembrar de pô-lo é cabeçalho que falta na rota nova. A
 * CSP é restritiva porque a API não serve HTML — se um dia servir, ela muda
 * junto e a mudança fica visível no diff. */
const SEGURANCA = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'cache-control': 'no-store',
};

const LIMITE_CORPO = 64 * 1024;   // 64 KB: nenhuma requisição legítima passa disso

export function criarServidor(opcoes = {}) {
  const config = opcoes.config?.ambiente
    ? { ...lerConfig({ AMBIENTE: opcoes.config.ambiente }, () => {}), ...opcoes.config }
    : lerConfig(opcoes.env, opcoes.avisar);

  const rotas = new Map();
  const registrar = (metodo, caminho, fn) => rotas.set(`${metodo} ${caminho}`, fn);

  /* ── O SERVIÇO COMPLETO (F1.13) ─────────────────────────────────────────
   *
   * Banco, scheduler e sala nascem AQUI e são passados para as rotas. Cada um
   * já existia desde o F1.2/F1.5/F1.6 e nenhum tinha porta: era a L-033.
   *
   * `banco: ':memory:'` é o que o teste usa. Em produção vem da configuração, e
   * o mesmo arquivo serve todas as instâncias — a atomicidade que o F1.4 provou
   * com oito processos de verdade é o que torna isso seguro. */
  const db = abrirBanco(opcoes.banco ?? config.banco ?? ':memory:');
  migrar(db);
  const relogio = opcoes.relogio ?? Date.now;
  const sched = criarScheduler({ db, sims: opcoes.sims, relogio, ambiente: config.ambiente });
  const sala = criarSala();

  /* --- as rotas do F1.1 --------------------------------------------------- */

  /* SAÚDE. Sem versão de contrato, de propósito — ver contrato.mjs.
     Declara a versão do MOTOR porque é por ela que se descobre uma instância
     velha no pool antes de ela servir uma odd para alguém. */
  registrar('GET', '/saude', () => ({
    corpo: { ok: true, versaoMotor: VERSAO_MOTOR, versaoApi: API_VERSAO, ambiente: config.ambiente },
  }));

  /* A digital da rodada: a prova de paridade, exposta como rota porque é ela
     que o teste do F1.1 usa para comparar servidor e cliente. */
  registrar('GET', '/api/rodada/digital', ({ query }) => {
    const raiz = inteiro(query.get('raiz'));
    if (raiz === null) return erro(400, ERROS.ENTRADA_INVALIDA, 'raiz precisa ser um inteiro sem sinal');
    return { corpo: { raiz, digital: digital(raiz), versaoMotor: VERSAO_MOTOR } };
  });

  registrar('GET', '/api/rodada/preco', ({ query }) => {
    const raiz = inteiro(query.get('raiz'));
    if (raiz === null) return erro(400, ERROS.ENTRADA_INVALIDA, 'raiz precisa ser um inteiro sem sinal');
    /* `sims` é aceito para o TESTE poder pedir um lote curto, e tem teto — sem
       ele um `?sims=1e9` é uma negação de serviço de um caractere. */
    const sims = query.has('sims') ? inteiro(query.get('sims')) : undefined;
    if (query.has('sims') && (sims === null || sims < 100 || sims > 200000))
      return erro(400, ERROS.ENTRADA_INVALIDA, 'sims fora da faixa aceita');
    return { corpo: montarRodadaServidor(raiz, sims) };
  });

  /* AS ROTAS DO F1.13, montadas a partir da tabela. Registrar por laço e não à
     mão: uma rota que existe na tabela e não no servidor é uma rota morta, e
     uma que existe no servidor e não na tabela escapa da conferência de sessão
     que o despacho faz pela lista. Derivar não pode dessincronizar. */
  for (const [chave, fn] of Object.entries(ROTAS)) {
    const [metodo, caminho] = chave.split(' ');
    registrar(metodo, caminho, ctx => fn({ ...ctx, db, sched, sala, relogio,
                                           agora: relogio() }));
  }

  /* --- o laço ------------------------------------------------------------- */

  const servidor = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://interno');
      const caminho = url.pathname;

      aplicarCors(req, res, config);
      if (req.method === 'OPTIONS') return responder(res, 204, null);

      /* O CONTRATO É CONFERIDO ANTES DA ROTA. Se a versão fosse conferida
         dentro de cada rota, a rota nova nasceria sem a conferência — é a
         mesma razão de os cabeçalhos de segurança serem aplicados na saída. */
      if (!SEM_VERSAO.includes(caminho)) {
        const v = req.headers[CABECALHO_VERSAO];
        if (!v)
          return responder(res, 400, { codigo: ERROS.VERSAO_AUSENTE,
            erro: `versão da API não declarada: mande o cabeçalho ${CABECALHO_VERSAO}`,
            versaoAceita: API_VERSAO });
        if (!versaoAceita(String(v)))
          return responder(res, 400, { codigo: ERROS.VERSAO_INCOMPATIVEL,
            erro: 'versão da API incompatível', versaoAceita: API_VERSAO });
      }

      const chave = `${req.method} ${caminho}`;
      const fn = rotas.get(chave);
      /* A mensagem de 404 NÃO ecoa o caminho pedido. Eco de entrada do usuário
         numa resposta é o começo de metade dos problemas de injeção, e aqui não
         serve para nada: quem pediu já sabe o que pediu. */
      if (!fn) return responder(res, 404, { codigo: ERROS.NAO_ENCONTRADO, erro: 'caminho desconhecido' });

      /* A SESSÃO É CONFERIDA AQUI, PARA TODAS, e a lista de públicas é a
         exceção declarada. O desenho oposto — cada rota conferindo a própria —
         é aquele em que a rota nova nasce ABERTA, porque quem a escreveu não
         sabia que precisava lembrar. Mesma razão dos cabeçalhos de segurança
         serem aplicados na saída e da versão ser conferida antes do
         roteamento: garantia que depende de lembrança é garantia ausente. */
      let userId = null;
      if (!ROTAS_PUBLICAS.includes(chave) && !SEM_VERSAO.includes(caminho)) {
        userId = usuarioDa(req, config, relogio());
        if (!userId)
          return responder(res, 401, { codigo: ERROS.NAO_AUTORIZADO,
            erro: 'sessão ausente ou inválida' });
      }

      const corpo = await lerCorpo(req);
      if (corpo === Symbol.for('grande'))
        return responder(res, 413, { codigo: ERROS.ENTRADA_INVALIDA, erro: 'corpo grande demais' });

      const saida = await fn({ query: url.searchParams, corpo, req, config, userId });
      if (saida?.status && saida.status >= 400) return responder(res, saida.status, saida.corpo);
      return responder(res, saida?.status || 200, saida?.corpo ?? null);

    } catch (e) {
      /* O ERRO VAI PARA O LOG INTEIRO E PARA O CLIENTE PELA METADE.
         Stack trace numa resposta entrega caminho de arquivo, versão de runtime
         e nome de função — e não ajuda ninguém que esteja do lado certo. */
      if (!config.silencioso) console.error('[servidor]', e);
      return responder(res, 500, { codigo: ERROS.INTERNO, erro: 'erro interno' });
    }
  });

  return {
    servidor,
    config,
    registrar,
    /* Expostos para o TESTE poder abrir rodada e olhar o banco sem passar pela
       rede. Não há rota que faça isso: abrir rodada é do scheduler, e o §5.4 é
       explícito em que o cliente perdeu o direito de pedir a próxima. */
    db, sched, sala,
    ouvir: porta => new Promise(r =>
      servidor.listen(porta ?? config.porta, '127.0.0.1', () => r(servidor.address().port))),
    fechar: () => new Promise(r => servidor.close(() => { try { db.close(); } catch {} r(); })),
  };
}

/* --- auxiliares ----------------------------------------------------------- */

function responder(res, status, corpo) {
  for (const [k, v] of Object.entries(SEGURANCA)) res.setHeader(k, v);
  if (corpo === null) { res.writeHead(status); return res.end(); }
  const texto = JSON.stringify(corpo);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(texto);
}

const erro = (status, codigo, mensagem) => ({ status, corpo: { codigo, erro: mensagem } });

/* CORS POR LISTA, NUNCA POR ECO.
 *
 * Devolver a origem que veio no pedido é `*` escrito de outro jeito: qualquer
 * página aberta no navegador do jogador passa na conferência. Com sessão por
 * cookie, isso entrega a conta dele. A lista vem da configuração e é vazia por
 * padrão — o cliente do mesmo domínio não precisa de CORS nenhum. */
function aplicarCors(req, res, config) {
  const origem = req.headers.origin;
  if (!origem || !config.origens.includes(origem)) return;
  res.setHeader('access-control-allow-origin', origem);
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-headers', CABECALHO_VERSAO + ', content-type');
  res.setHeader('vary', 'Origin');
}

/* Inteiro sem sinal, ou `null`. `Number()` sozinho aceita `'  12  '`, `'0x1f'`,
   `'1e3'` e `''` — e cada um deles é uma raiz diferente da que o cliente usou. */
function inteiro(v) {
  if (typeof v !== 'string' || !/^\d{1,10}$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 && n <= 0xFFFFFFFF ? n : null;
}

/* Lê o corpo com TETO. Sem teto, uma requisição sem `content-length` e sem fim
   consome a memória do processo — e o processo é o mesmo que serve todo mundo. */
function lerCorpo(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(null);
  return new Promise((res, rej) => {
    let dados = '', tamanho = 0;
    req.on('data', p => {
      tamanho += p.length;
      if (tamanho > LIMITE_CORPO) { req.destroy(); return res(Symbol.for('grande')); }
      dados += p;
    });
    req.on('end', () => { try { res(dados ? JSON.parse(dados) : null); } catch { res(null); } });
    req.on('error', rej);
  });
}
