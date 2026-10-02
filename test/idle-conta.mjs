/* Q1/Q3 · COM CONTA, O IDLE VEM DO SERVIDOR — a leitura (ST-13.5a · E13 · DEC-17)
 *
 * O save do aparelho continua sendo o que as telas leem; com conta ele vira
 * CACHE: o `GET /api/idle` passa por `idleDaConta` (camada 0), que põe o
 * formato do servidor no do aparelho, e as mesmas funções de leitura de
 * sempre (stamina, pronta, vistos, criaturas hidratadas) respondem certo.
 *
 * A chave `IDLE_NA_CONTA` fica DESLIGADA até a última parte (13.5e): até lá,
 * com ou sem conta, o jogo joga como hoje.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, creditarBolsa, creditarRegistro } from '../server/idle.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { STAMINA_MAX } from '../engine/expedicao.mjs';
import { criarApi } from '../app/modules/api.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { vistosDe } from '../app/modules/pokedex-dados.mjs';
import { IDLE_NA_CONTA, idleNoServidor, idleDaConta, avisoDaConta, pintarAvisoDaConta } from '../app/modules/idle-conta.mjs';
import { sincronizarIdleDaConta } from '../app/modules/idle-servidor.mjs';
import { readFileSync } from 'node:fs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const T0 = Date.UTC(2026, 9, 1, 12), H = 3600e3;

const armazemFalso = () => {
  const dados = new Map();
  return { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), clear: () => dados.clear() };
};

/* A resposta do servidor, escrita à mão no formato que o `colecaoDe` devolve. */
const DO_SERVIDOR = {
  pack: 'kanto', agora: T0,
  criaturas: [{ id: 'u-1', dex: 4, iv: [10, 10, 10, 10, 10, 10], potencial: 60, natureza: 'Firme', exemplar: false, nivel: 7, xp: 400, vinculo: 3, foco: null,
                naCaixa: false, descansaAte: null, stamina: 55, origem: 'inicial', criadaEm: T0 - H }],
  registro: [{ dex: 16, fragmentos: 3, vistoEm: T0 - H }, { dex: 19, fragmentos: 0, vistoEm: T0 - 2 * H }],
  bolsa: { bola: 5 },
  expedicoes: [{ id: 'x-1', bioma: 'floresta', perfil: 'batida', estagio: 1, equipe: ['u-1'], iniciadaEm: T0 - H, terminaEm: T0 + H, pronta: false }],
  run: null,
  encontros: [{ chave: 'x-0:0', expedicao: 'x-0', origem: 'expedicao', dex: 16, raridade: 'comum', bioma: 'floresta', em: T0 - H }],
  teto: { restam: 7 }, estagio: { aberto: 1, proximo: null },
  jornada: null,
};

export async function suite() {
  const s = criarSuite('idle-conta');

  s.teste('a chave está LIGADA (13.5e): com conta, o idle é da conta; sem conta, do aparelho', () => {
    igual(IDLE_NA_CONTA, true, 'a chave desligou: com conta, o jogo voltou a jogar no aparelho (DEC-17)');
    igual(`${idleNoServidor(true)}|${idleNoServidor(false)}`, 'true|false', 'a chave não segue a sessão');
  });

  s.teste('idleDaConta: o formato do servidor vira o do aparelho, e o que é só do aparelho fica', () => {
    const local = { ...D.carregar(armazemFalso()), missoes: { semana: 3, base: {}, resgatadas: [] }, estilhacos: 4, jaPossuiu: [1, 4], rev: 9 };
    const e = idleDaConta(local, DO_SERVIDOR, { doces: { '4': 2 } });
    /* O registro: lista no servidor, objeto no aparelho. */
    igual(JSON.stringify(e.registro), JSON.stringify({ 16: 3, 19: 0 }), 'o registro não virou objeto');
    igual(vistosDe(e).size, 3, 'o aparelho não conta os vistos do registro da conta (16 e 19) mais a criatura (4)');
    /* A stamina: o servidor manda o valor no relógio dele; o aparelho guarda valor e instante. */
    igual(`${e.criaturas[0].stamina}|${e.criaturas[0].staminaEm}`, `55|${T0}`, 'a stamina sem o instante do servidor');
    igual(Math.round(D.staminaDe(e, 'u-1', T0)), 55, 'a stamina lida no aparelho não é a da conta');
    const c = D.criaturasDe(e)[0];
    ok(Number.isFinite(c.potencial) && Number.isFinite(c.nivel) && c.barra !== undefined, 'a criatura da conta não hidrata no aparelho');
    /* A expedição: em campo, pronta pelo relógio. */
    igual(`${e.expedicoes.length}|${D.pronta(e.expedicoes[0], T0)}|${D.pronta(e.expedicoes[0], T0 + 2 * H)}|${e.expedicoes[0].colhidaEm}`, '1|false|true|null', 'a expedição da conta');
    /* Os encontros levam de onde vieram (a expedição ou a run). */
    igual(`${e.encontros[0].origem}|${e.encontros[0].expedicao}`, 'expedicao|x-0', 'o encontro perde a origem');
    igual(e.bolsa.bola, 5, 'a bolsa');
    /* A jornada nunca lutada é o vazio de sempre, e não null. */
    igual(JSON.stringify(e.jornada), JSON.stringify({ vencidos: [], insignias: [], pve: { dia: null, pago: 0, nos: [], chefes: [] } }), 'a jornada da conta nova');
    igual(JSON.stringify(e.doces), JSON.stringify({ '4': 2 }), 'os doces da conta');
    /* O que é só do aparelho não se perde; o que é da conta não vem do aparelho. */
    igual(`${e.missoes.semana}|${e.estilhacos}|${e.jaPossuiu.join()}|${e.rev}`, '3|4|1,4|9', 'o que é do aparelho foi apagado (ou a revisão mudou)');
    igual(JSON.stringify(e.conta), JSON.stringify({ agora: T0, teto: { restam: 7 }, estagio: { aberto: 1, proximo: null }, desatualizado: false }), 'a conta sem o relógio, o teto e o estágio do servidor');
    /* A conta começa do zero (DEC-17): nada do save antigo do aparelho sobe junto. */
    const velho = { ...D.carregar(armazemFalso()), criaturas: [{ id: 'velha', dex: 150 }], bolsa: { bola_mestra: 9 } };
    const e2 = idleDaConta(velho, { ...DO_SERVIDOR, criaturas: [], bolsa: {} });
    igual(`${e2.criaturas.length}|${Object.keys(e2.bolsa).length}`, '0|0', 'o save do aparelho entrou na conta — a DEC-17 diz que não');
  });

  s.teste('o aviso da conta: desatualizado só quando o servidor não respondeu', () => {
    igual(avisoDaConta({ conta: { desatualizado: false } }), null, 'aviso com a conta em dia');
    ok(/desatualizad/i.test(avisoDaConta({ conta: { desatualizado: true } }) ?? ''), 'sem rede, a tela não diz que está desatualizada');
    igual(avisoDaConta({}), null, 'aviso sem conta');
  });

  s.teste('a ligação: o boot lê a conta depois do perfil, e só com a chave e a sessão', () => {
    const html = fonte('app/index.html');
    const corpo = html.slice(html.indexOf('async function ligarModoServidor'), html.indexOf('(async function boot'));
    ok(/if \(idleNoServidor\(api\.temSessao\(\)\)\) await sincronizarIdleDaConta\(\{ api \}\);/.test(corpo), 'o boot não lê o idle da conta (ou lê sem a chave)');
    ok(corpo.indexOf('sincronizarIdleDaConta') > corpo.indexOf('await hidratarPerfil()'), 'a conta do idle é lida antes da sessão estar hidratada');
    ok(/import \{ idleNoServidor[\w, ]*\} from '\.\/modules\/idle-conta\.mjs'/.test(html) && /import \{ sincronizarIdleDaConta \} from '\.\/modules\/idle-servidor\.mjs'/.test(html), 'o boot sem os imports da conta');
    /* A tela pinta o aviso a cada leitura do save — e ele nasce escondido nas duas abas. */
    ok(/E = carregar\(\);\s*avisarConta\(E\);/.test(fonte('app/modules/idle-tela.mjs')), 'a tela do idle não pinta o aviso da conta');
    ok(/<p id="idleConta" class="idleConta" role="status" hidden><\/p>/.test(html) && /<p id="offConta" class="idleConta" role="status" hidden><\/p>/.test(html), 'o aviso da conta falta numa das abas, ou nasce à vista');
    /* ST-13.5e: e é a PRIMEIRA coisa de cada aba — ele põe em dúvida tudo abaixo. */
    for (const [vista, id] of [['viewIdle', 'idleConta'], ['viewRotaOff', 'offConta']]) {
      const i = html.indexOf(`<div id="${vista}" class="view">`), resto = html.slice(i, i + 1400);
      ok(i > 0 && resto.indexOf(`id="${id}"`) > 0 && resto.indexOf(`id="${id}"`) < resto.indexOf('class="card'), `o aviso da conta não abre a aba ${vista}`);
    }
  });

  s.teste('o aviso pintado: mostra enquanto é verdade, e esconde quando deixa de ser', () => {
    const nos = [{ textContent: '', hidden: true }, { textContent: '', hidden: true }];
    pintarAvisoDaConta(nos, { conta: { desatualizado: true } });
    ok(nos.every(n => !n.hidden && /desatualizad/i.test(n.textContent)), 'sem rede, o aviso não aparece nas duas abas');
    pintarAvisoDaConta(nos, { conta: { desatualizado: false } });
    ok(nos.every(n => n.hidden && n.textContent === ''), 'o aviso fica depois de a conta voltar');
    ok(/export const avisarConta = E => pintarAvisoDaConta\(nosDois\('Conta'\), E\);/.test(fonte('app/modules/idle-avisos.mjs')), 'a tela não pinta o aviso nas duas abas (#idleConta e #offConta)');
  });

  s.teste('contra o servidor de verdade: a leitura da conta chega ao save do aparelho', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const armazem = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem });
      await api.post('/api/auth/cadastrar', { username: 'Idc1', email: 'idc1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Idc1'`).get().id;
      const [a] = [1, 4].map(dex => gerar(srv.db, { userId: uid, pack: PACK, dex, origem: 'inicial' }));
      creditarBolsa(srv.db, uid, 'bola', 3); creditarRegistro(srv.db, uid, PACK.id, 16, 2, t);
      iniciar(srv.db, { userId: uid, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [a.id], agora: t });
      const r = await sincronizarIdleDaConta({ api, deposito: armazem });
      ok(r.ok, `a sincronização falhou: ${JSON.stringify(r)}`);
      const e = D.carregar(armazem);
      igual(`${e.criaturas.length}|${e.expedicoes.length}|${e.bolsa.bola}|${vistosDe(e).size}`, '2|1|3|3', 'o save do aparelho não é a conta (vistos: o 16 do registro, o 1 e o 4 da coleção)');
      ok(e.criaturas.every(c => c.stamina <= STAMINA_MAX && c.staminaEm === t), 'a stamina da conta sem o instante');
      igual(e.conta.desatualizado, false, 'a conta em dia marcada desatualizada');
      /* O encontro pendente da conta chega com a origem (o servidor passou a
         mandá-la) — um da RUN, porque o padrão do cliente é 'expedicao' e
         esconderia a coluna faltando. */
      srv.db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, expedicao_id, dex, raridade, bioma, em) VALUES ('k:0', ?, 'avanco', NULL, 16, 'comum', 'floresta', ?)`).run(uid, t);
      await sincronizarIdleDaConta({ api, deposito: armazem });
      const enc = D.carregar(armazem).encontros[0];
      igual(`${enc.chave}|${enc.origem}|${enc.expedicao}`, 'k:0|avanco|null', 'o encontro da run chega como se fosse de expedição');
      /* Sem servidor: o save fica como estava, marcado desatualizado — a tela avisa em vez de inventar. */
      await srv.fechar();
      const r2 = await sincronizarIdleDaConta({ api, deposito: armazem });
      igual(`${r2.ok}|${D.carregar(armazem).criaturas.length}|${D.carregar(armazem).conta.desatualizado}`, 'false|2|true', 'sem rede, a conta sumiu ou não disse que está desatualizada');
    } finally { try { await srv.fechar(); } catch { /* já fechado */ } }
  });

  return s;
}
