/* Q1/Q3 · A RUN QUE SÓ A TELA VIA (ST-2.22b, D-145)
 *
 * O relato do dono: "Poção e Recuar não funcionaram no meio da run do Campo —
 * os dois voltaram erro 409 e não fizeram nada".
 *
 * A run é reproduzida dos dois lados, cada um no seu relógio e com o código
 * que carregou. Uma aba aberta antes de uma atualização (a ST-2.21 encurtou
 * as waves do estágio 1) roda a run velha, e o servidor a nova: medido, o
 * servidor terminava a run até ~5 min antes da tela. Nesse tempo, toda ação
 * voltava 409 e a tela seguia mostrando a run — que ela nunca relia.
 *
 * Três correções, cada uma com teste aqui:
 *
 *   o 409        relê a conta e diz o que houve ("a run já terminou")
 *   o relógio    o da tela anda junto com o do servidor (o desvio medido
 *                na leitura da conta)
 *   a versão     o servidor diz qual código está servindo; a aba que vê o
 *                número mudar pede para recarregar
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { recuarNa, pocaoNa } from '../app/modules/idle-acoes.mjs';
import { carregar } from '../app/modules/idle-dados.mjs';
import { agoraDaConta, desvioDoRelogio, DESVIO_MAX_MS, mensagemDoConflito } from '../app/modules/idle-conta.mjs';
import { versaoMudou } from '../app/modules/api.mjs';
import { digitalDoCodigo } from '../server/build.mjs';

const memoria = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};
const RUN_DO_SERVIDOR = { id: 'r1', bioma: 'campo', estagio: 1, wave: 8, fim: { em: 1000, completou: false, motivo: 'hp' } };
const apiDoConflito = codigo => {
  const pedidos = [];
  return {
    pedidos, temSessao: () => true,
    post: async rota => { pedidos.push(`POST ${rota}`); return { ok: false, status: 409, corpo: { codigo, erro: 'não há run em curso' } }; },
    get: async rota => { pedidos.push(`GET ${rota}`);
      return rota === '/api/doces' ? { ok: true, corpo: { doces: {}, presos: {} } }
                                   : { ok: true, corpo: { agora: 5000, criaturas: [], expedicoes: [], bolsa: {}, run: RUN_DO_SERVIDOR } }; },
  };
};

export function suite() {
  const s = criarSuite('run-fantasma');

  s.teste('o 409 relê a conta: a tela larga a run que o servidor já fechou, e diz por quê', async () => {
    for (const [acao, chamar] of [['recuar', (E, o) => recuarNa(E, 1, o)], ['poção', (E, o) => pocaoNa(E, { item: 'potion', agora: 1 }, o)]]) {
      const api = apiDoConflito('RUN_SEM_RUN'), deposito = memoria();
      const E = { ...carregar(deposito), run: { id: 'r1', bioma: 'campo', estagio: 1, wave: 5, fim: null } };
      let msg = null;
      try { await chamar(E, { api, deposito, conta: true }); } catch (e) { msg = e.message; }
      ok(msg && /já terminou/.test(msg), `${acao}: a mensagem não diz que a run acabou: ${msg}`);
      ok(api.pedidos.includes('GET /api/idle'), `${acao}: o 409 não releu a conta: ${api.pedidos}`);
      igual(JSON.stringify(E.run?.fim), JSON.stringify(RUN_DO_SERVIDOR.fim), `${acao}: a tela segue com a run fantasma`);
    }
  });

  s.teste('a mensagem do conflito: a run tem a dela, o resto diz que a tela foi atualizada', () => {
    ok(/já terminou/.test(mensagemDoConflito({ codigo: 'RUN_SEM_RUN', erro: 'não há run em curso' })), 'a run sem frase própria');
    ok(/atualizada/.test(mensagemDoConflito({ codigo: 'OUTRO', erro: 'a jornada mudou' })), 'o conflito genérico não diz que releu');
    ok(/a jornada mudou/.test(mensagemDoConflito({ codigo: 'OUTRO', erro: 'a jornada mudou' })), 'o conflito genérico perdeu o texto do servidor');
  });

  s.teste('o relógio da tela anda com o do servidor', () => {
    igual(desvioDoRelogio({ servidor: 10_000, local: 7_000 }), 3_000, 'o desvio');
    igual(agoraDaConta({ conta: { desvio: 3_000 } }, 7_000), 10_000, 'a tela não corrigiu o relógio');
    igual(agoraDaConta({ conta: {} }, 7_000), 7_000, 'sem desvio, o relógio do aparelho');
    igual(agoraDaConta(null, 7_000), 7_000, 'sem estado, o relógio do aparelho');
    /* um desvio absurdo é dado ruim, e não relógio: não se aplica */
    igual(desvioDoRelogio({ servidor: 10_000 + DESVIO_MAX_MS + 1, local: 10_000 }), 0, 'um desvio de mais de um dia foi aceito');
    igual(desvioDoRelogio({ servidor: undefined, local: 10_000 }), 0, 'sem a hora do servidor, desvio inventado');
    const tela = readFileSync(new URL('../app/modules/idle-tela.mjs', import.meta.url), 'utf8');
    ok(/const agora = \(\) => agoraDaConta\(E, Date\.now\(\)\)/.test(tela), 'a tela das Rotas ainda usa o relógio do aparelho cru');
    const sinc = readFileSync(new URL('../app/modules/idle-servidor.mjs', import.meta.url), 'utf8');
    ok(/desvioDoRelogio\(\{ servidor: r\.corpo\.agora, local: /.test(sinc), 'a leitura da conta não mede o desvio');
  });

  s.teste('a versão: o servidor diz qual código serve, e a aba vê quando ele muda', () => {
    const a = digitalDoCodigo(new URL('..', import.meta.url));
    ok(/^[0-9a-f]{12}$/.test(a), `a digital não tem a forma esperada: ${a}`);
    igual(digitalDoCodigo(new URL('..', import.meta.url)), a, 'a digital do mesmo código mudou');
    igual(versaoMudou(null, a), false, 'a primeira resposta conta como mudança');
    igual(versaoMudou(a, a), false, 'a mesma versão conta como mudança');
    igual(versaoMudou(a, 'outra'), true, 'a versão nova não foi vista');
    igual(versaoMudou(a, null), false, 'uma resposta sem a marca conta como mudança');
    const srv = readFileSync(new URL('../server/servidor.mjs', import.meta.url), 'utf8');
    ok(/res\.setHeader\('x-build', BUILD\)/.test(srv), 'o servidor não marca as respostas com a versão');
    const api = readFileSync(new URL('../app/modules/api.mjs', import.meta.url), 'utf8');
    ok(/headers\?\.get\?\.\('x-build'\)/.test(api) && /versaoMudou\(/.test(api), 'a aba não lê a versão das respostas');
  });

  s.teste('ST-2.26 · a aba parada também pergunta a versão: de tempos em tempos e ao voltar', () => {
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    ok(/setInterval\(\(\) => \{ if \(!document\.hidden\) api\.get\('\/saude'\); \}, 3 \* 60_000\)/.test(html), 'a aba parada nunca pergunta a versão');
    ok(/visibilitychange', \(\) => \{ if \(!document\.hidden\) api\.get\('\/saude'\)/.test(html), 'voltar para a aba não pergunta a versão');
  });

  return s;
}
