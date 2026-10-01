/* Q1/Q3 · O DOCE DA CONTA FICA NA CONTA (ST-2.22a, D-144)
 *
 * O relato do dono como jogador: "usar um doce no Bulbasaur deu 'sem doce da
 * linha dela' e erro 400, mesmo com doces recebidos na Jornada".
 *
 * A causa: o resgate da ST-9.9 — feito quando o idle morava no aparelho —
 * continuou rodando depois da ST-13.5e, que pôs o idle na conta. Três
 * segundos depois de todo resultado da Arena ele ZERAVA os doces da conta e
 * os somava ao save do aparelho: a tela mostrava o dobro, o servidor tinha
 * zero, e o doce recusava. Na sincronização seguinte, sumia de vez.
 *
 * Com o idle na conta, o doce não desce: o fim da rodada só relê a conta.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { trazerDocesDoServidor } from '../app/modules/doce-conta.mjs';
import { IDLE_NA_CONTA } from '../app/modules/idle-conta.mjs';
import { carregar } from '../app/modules/idle-dados.mjs';

const memoria = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};
const apiFalsa = () => {
  const pedidos = [];
  return {
    pedidos,
    temSessao: () => true,
    get: async rota => { pedidos.push(`GET ${rota}`);
      return rota === '/api/doces' ? { ok: true, corpo: { doces: { 1: 1 }, presos: {} } }
                                   : { ok: true, corpo: { criaturas: [], expedicoes: [], bolsa: {} } }; },
    post: async rota => { pedidos.push(`POST ${rota}`); return { ok: true, corpo: { doces: { 1: 1 } } }; },
  };
};

export function suite() {
  const s = criarSuite('doce-na-conta');

  s.teste('com o idle na conta, o fim da rodada relê a conta e não resgata o doce', async () => {
    igual(IDLE_NA_CONTA, true, 'o idle saiu da conta — este teste fala do caso em que ele está nela');
    const api = apiFalsa(), deposito = memoria();
    await trazerDocesDoServidor({ api, deposito });
    ok(!api.pedidos.some(p => p.includes('/api/doces/resgatar')), `o doce ainda desce: ${api.pedidos}`);
    ok(api.pedidos.includes('GET /api/doces'), `a conta não foi relida: ${api.pedidos}`);
    igual(JSON.stringify(carregar(deposito).doces), '{"1":1}', 'o save não mostra o doce da conta — ou mostra o dobro');
  });

  s.teste('sem sessão, nada é pedido', async () => {
    const api = { ...apiFalsa(), temSessao: () => false };
    await trazerDocesDoServidor({ api, deposito: memoria() });
    igual(api.pedidos.length, 0, 'pediu sem sessão');
  });

  s.teste('a tela de resultado continua chamando o mesmo ponto', () => {
    const tela = readFileSync(new URL('../app/modules/resultado-tela.mjs', import.meta.url), 'utf8');
    ok(/setTimeout\(\(\) => trazerDocesDoServidor\(\), 3000\)/.test(tela), 'o fim da rodada deixou de reler o doce');
  });

  return s;
}
