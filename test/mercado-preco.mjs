/* Q1/Q3/Q4/Q6 · O PREÇO DO MODELO: CARIMBADO ANTES, PUBLICADO DEPOIS (ST-12.5 · §6.6)
 *
 * > "publicar a probabilidade do modelo ANTES do fechamento faz o bolo
 * >  convergir para ela, e a habilidade desaparece. Este é o modo de falha que
 * >  anula o capítulo."
 *
 * Três coisas, e a terceira é a que a Spec chama de teste dedicado:
 *
 *   EXISTE ANTES       gravado na abertura, antes de qualquer resultado
 *   APARECE DEPOIS     só pela rota do resultado, só de bolo liquidado
 *   NÃO VAZA NA JANELA varredura de TODA rota GET e do estado da sala
 *
 * E o preço principal fica intocado: o lote do bolo mora noutro ramo da
 * árvore de sementes.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { montarRodadaServidor } from '../server/rodada.mjs';
import { ROTAS } from '../server/rotas.mjs';
import { sementes, lerRaiz } from '../engine/seed.mjs';
import { precoDoModeloAbates, vencedorasDeAbates, vencedorasPorAbates } from '../engine/mercado-abates.mjs';
import { tiposDaPool } from '../engine/engine.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);
const SENHA = 'senha-longa-o-bastante-1';

async function comServico(fn) {
  let agora = T0;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 80,
                            laco: false, relogio: () => agora });
  const porta = await s.ouvir(0);
  const pedir = (caminho, { metodo = 'GET', corpo, sessao } = {}) =>
    fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
      [CABECALHO_VERSAO]: API_VERSAO, ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
      ...(corpo ? { 'content-type': 'application/json' } : {}) }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
      .then(async r => ({ status: r.status, texto: await r.text() }));
  const conta = async nome => (JSON.parse((await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: {
    username: nome, email: `${nome}@x.test`, senha: SENHA, nascimento: '1990-01-01' } })).texto)).sessao;
  const encerrar = () => {
    for (let i = 0; i < 200 && s.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { agora += 1000; s.sched.tick(); }
  };
  try { return await fn({ s, pedir, conta, encerrar, agora: () => agora }); } finally { await s.fechar(); }
}
const mercadoDa = (db, roundId) => db.prepare(`SELECT * FROM markets WHERE round_id = ?`).get(roundId);

export async function suite() {
  const s = criarSuite('mercado-preco');

  s.teste('o motor: determinístico pela raiz, conta empates, e o lote é do ramo "mercado"', () => {
    const t = sementes('preco-bolo-1');
    const pool = E.sortearPool(t.elenco);
    const a = precoDoModeloAbates(E.M, pool, 'preco-bolo-1', 400);
    const b = precoDoModeloAbates(E.M, pool, 'preco-bolo-1', 400);
    igual(JSON.stringify(a), JSON.stringify(b), 'a mesma raiz deu preços diferentes');
    igual(a.sims, 400, 'sims');
    ok(a.vence.reduce((x, y) => x + y, 0) >= a.sims - a.nenhum, 'toda simulação com abate tem ao menos um no topo');
    const c = precoDoModeloAbates(E.M, pool, 'preco-bolo-2', 400);
    ok(JSON.stringify(a.vence) !== JSON.stringify(c.vence), 'raízes diferentes deram o mesmo preço — o lote ignora a raiz');
    /* Conferência independente de UMA simulação: o índice 0 do lote é a luta do
       ramo 'mercado' com o clima do ramo 'mercado-ambiente'. */
    const um = precoDoModeloAbates(E.M, pool, 'preco-bolo-1', 1);
    ok(um.vence.reduce((x, y) => x + y, 0) + um.nenhum >= 1, 'uma simulação não contou nada');
    ok(um.vence.every(v => v === 0 || v === 1), 'uma simulação contou alguém duas vezes');
  });

  s.teste('carimbado na abertura; o preço principal da rodada fica idêntico ao de sempre', async () => {
    await comServico(async ({ s: srv, encerrar }) => {
      const r = srv.sched.abrirRodada();
      const m = mercadoDa(srv.db, r.id);
      igual(m.model_priced_at, m.opens_at, 'o preço não foi carimbado na abertura');
      igual(m.published_at, null, 'nasceu publicado');
      const modelo = JSON.parse(m.model_price_json);
      igual(modelo.vence.length, 12, 'o preço não cobre os doze');
      encerrar();
      const raiz = lerRaiz(srv.db.prepare(`SELECT round_seed_reveal FROM rounds WHERE id = ?`).get(r.id).round_seed_reveal);
      /* Recalculado pela raiz revelada, dá o mesmo: o carimbo é auditável. */
      const t = sementes(raiz);
      igual(JSON.stringify(precoDoModeloAbates(E.M, E.sortearPool(t.elenco), raiz, modelo.sims)),
        m.model_price_json, 'o preço carimbado não se refaz pela raiz revelada');
      const principal = montarRodadaServidor(raiz, 80);
      const gravado = srv.db.prepare(`SELECT offered_odd FROM round_fighters WHERE round_id = ? ORDER BY slot`).all(r.id);
      igual(JSON.stringify(gravado.map(x => x.offered_odd)), JSON.stringify(principal.lutadores.map(l => l.odd)),
        'a odd do mercado principal mudou com o bolo carimbado');
    });
  });

  s.teste('NADA VAZA NA JANELA: toda rota GET e o estado da sala, varridos', async () => {
    await comServico(async ({ s: srv, pedir, conta }) => {
      const sessao = await conta('varre');
      const r = srv.sched.abrirRodada();
      await pedir('/api/mercado/entrar', { metodo: 'POST', sessao, corpo: { selecao: 2, valor: 10 } });
      const m = mercadoDa(srv.db, r.id);
      const vence = JSON.stringify(JSON.parse(m.model_price_json).vence);
      const textos = [['sala', JSON.stringify(srv.sched.paraCliente())]];
      for (const chave of Object.keys(ROTAS).filter(k => k.startsWith('GET ') && !k.includes('/admin/'))) {
        const caminho = chave.slice(4);
        if (caminho.includes(':')) continue;
        textos.push([caminho, (await pedir(caminho, { sessao })).texto]);
      }
      ok(textos.length > 8, `a varredura quase não varreu: ${textos.length} respostas`);
      for (const [onde, txt] of textos) {
        ok(!txt.includes(vence), `${onde}: a contagem do modelo vazou durante a janela`);
        ok(!/"(modelo|model\w*|nenhum)"\s*:\s*[^n\]]/i.test(txt), `${onde}: um campo do modelo saiu com valor durante a janela: ${txt.slice(0, 200)}`);
      }
      igual(JSON.parse((await pedir('/api/mercado/resultado', { sessao })).texto).id, null,
        'o resultado respondeu com um bolo antes de algum ser pago');
    });
  });

  s.teste('depois de pago: o resultado mostra o modelo ao lado do que o bolo pagou — e só do bolo pago', async () => {
    await comServico(async ({ s: srv, pedir, conta, encerrar }) => {
      const sessoes = await Promise.all(Array.from({ length: 12 }, (_, i) => conta(`p${i}`)));
      const r = srv.sched.abrirRodada();
      await Promise.all(sessoes.map((sessao, i) => pedir('/api/mercado/entrar', { metodo: 'POST', sessao,
        corpo: { selecao: i, valor: 10 + i } })));
      encerrar();
      srv.laco.passo();
      const m = mercadoDa(srv.db, r.id);
      ok(m.published_at && m.published_at >= m.model_priced_at, 'publicado antes de carimbado, ou nunca');
      /* A rodada seguinte abre: o resultado continua sendo o da PAGA, e o preço
         da nova não aparece. */
      srv.laco.passo();
      const nova = srv.sched.rodadaAtual();
      ok(nova.id !== r.id && nova.status === ESTADOS.ABERTA, 'a rodada seguinte não abriu');
      const res = JSON.parse((await pedir('/api/mercado/resultado', { sessao: sessoes[0] })).texto);
      igual(res.rodada, r.id, 'o resultado não é o do bolo pago');
      const minha = srv.db.prepare(`SELECT amount, payout FROM market_entries WHERE market_id = ? AND selection = 0`).get(m.id);
      igual(JSON.stringify(res.minha), JSON.stringify({ entrou: minha.amount, recebeu: minha.payout ?? 0 }),
        'o resultado não traz a entrada de quem pergunta');
      ok(!/"user|user_id|username/.test(JSON.stringify(res)), 'o resultado expõe quem entrou');
      const modelo = JSON.parse(m.model_price_json);
      for (const x of res.selecoes) igual(x.modelo, modelo.vence[x.selecao] / modelo.sims, `modelo da seleção ${x.selecao}`);
      const eventos = srv.sched.resultadoDaRaiz(lerRaiz(srv.db.prepare(
        `SELECT round_seed_reveal FROM rounds WHERE id = ?`).get(r.id).round_seed_reveal));
      ok(Array.isArray(eventos), 'a raiz revelada não refaz a rodada');
      igual(m.winners_json,
        JSON.stringify(vencedorasPorAbates(eventos.map(x => x.abates))),
        'o bolo não gravou quem venceu o mercado — com ninguém no líder, a tela não saberia quem liderou');
      igual(JSON.stringify(res.vencedoras), JSON.stringify(vencedorasPorAbates(eventos.map(x => x.abates))),
        'os vencedores do resultado não são o topo de abates da rodada');
      for (const x of res.selecoes) {
        if (res.vencedoras.includes(x.selecao)) ok(x.pagou > 1, `o bolo pagava ${x.pagou} ao vencedor ${x.selecao}`);
        else igual(x.pagou, null, 'o resultado inventou quanto pagaria quem não venceu');
      }
      const novoPreco = mercadoDa(srv.db, nova.id).model_price_json;
      ok(!JSON.stringify(res).includes(JSON.stringify(JSON.parse(novoPreco).vence)), 'o preço da rodada em curso saiu no resultado da anterior');
    });
  });

  s.teste('a frequência do modelo mede o que acontece: 2.000 lutas independentes dentro de 4 erros-padrão', () => {
    const t = sementes('calibra-bolo');
    const pool = E.sortearPool(t.elenco);
    const modelo = precoDoModeloAbates(E.M, pool, 'calibra-bolo', 4000);
    const cont = new Array(12).fill(0);
    const N = 2000;
    for (let k = 0; k < N; k++) {
      const u = sementes(`calibra-bolo-luta-${k}`);
      const clima = E.sortearClima(u.ambiente, tiposDaPool(pool));
      const f = clima?.type ? E.aplicarClima(pool, clima) : pool;
      for (const x of vencedorasDeAbates(E.simular(f, u.batalha, true).events, 12)) cont[x]++;
    }
    for (let i = 0; i < 12; i++) {
      const p = modelo.vence[i] / modelo.sims, obs = cont[i] / N;
      const ep = Math.sqrt(p * (1 - p) / N + p * (1 - p) / modelo.sims) || 1e-9;
      ok(Math.abs(obs - p) <= 4 * ep + 0.01, `lutador ${i}: modelo ${p.toFixed(3)}, observado ${obs.toFixed(3)}`);
    }
  });

  return s;
}
