/* Q1/Q3/Q6 · OS SINAIS DE APARELHO E REDE (ST-13.8 · L-050 · DEC-19 · Spec §7.19, §28)
 *
 * A política decidida pelo dono em 30/09 ("Pode"), sobre a recomendação:
 *
 *   o QUE        um número aleatório do navegador e o IP de onde a conta fala
 *   COMO         só a ASSINATURA de cada um (HMAC com o segredo do servidor):
 *                o banco nunca vê o número nem o IP em claro
 *   QUANTO TEMPO 30 dias; o que venceu é apagado na varredura e na escrita
 *   O QUE FAZ    duas contas com a mesma assinatura viram SUSPEITA para o
 *                operador — nada é punido nem ligado sozinho, e o par que o
 *                operador já ligou não é acusado
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { aparelhoValido, ipNormalizado, paresComMesmoSinal, RETENCAO_DIAS, CLASSES } from '../engine/sinais.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { registrarSinais, sinaisDe } from '../server/sinais.mjs';
import { varrerSuspeitas, suspeitasAbertas } from '../server/antifraude.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { CABECALHO_VERSAO, API_VERSAO } from '../server/contrato.mjs';
import { criarApi } from '../app/modules/api.mjs';

const DIA = 86400e3, MIN = 60e3, T0 = Date.UTC(2026, 9, 1, 12);
const SEGREDO = 'segredo-de-teste-com-trinta-e-dois-bytes!!';
const APARELHO = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  return { db, a: conta('sinA'), b: conta('sinB'), c: conta('sinC') };
}
const req = ({ ip = '203.0.113.7', aparelho = APARELHO } = {}) => ({ headers: aparelho ? { 'x-aparelho': aparelho } : {}, socket: { remoteAddress: ip } });

export function suite() {
  const s = criarSuite('sinais-conta');

  s.teste('camada 0: o número do aparelho tem forma, o IP é normalizado, e os pares saem da janela de 30 dias', () => {
    ok(aparelhoValido(APARELHO) && !aparelhoValido('abc') && !aparelhoValido('x'.repeat(200)) && !aparelhoValido('<script>1234567890abcdef') && !aparelhoValido(undefined), 'a forma do número do aparelho');
    igual(`${ipNormalizado('::ffff:198.51.100.4')}|${ipNormalizado('198.51.100.4')}|${ipNormalizado(' 2001:db8::1 ')}|${ipNormalizado('')}`, '198.51.100.4|198.51.100.4|2001:db8::1|', 'a normalização do IP');
    igual(RETENCAO_DIAS, 30, 'a retenção decidida pelo dono');
    igual(CLASSES.join(), 'aparelho,rede', 'as classes do sinal');
    const linhas = [
      { user: 'u1', classe: 'aparelho', assinatura: 'x', visto: T0 }, { user: 'u2', classe: 'aparelho', assinatura: 'x', visto: T0 - 5 * DIA },
      { user: 'u3', classe: 'aparelho', assinatura: 'x', visto: T0 - 31 * DIA },
      { user: 'u1', classe: 'rede', assinatura: 'y', visto: T0 }, { user: 'u1', classe: 'rede', assinatura: 'y', visto: T0 - DIA },
      { user: 'u4', classe: 'rede', assinatura: 'x', visto: T0 },
    ];
    igual(JSON.stringify(paresComMesmoSinal(linhas, T0)), JSON.stringify([{ a: 'u1', b: 'u2', classe: 'aparelho' }]), 'os pares: a mesma classe e assinatura, contas diferentes, dentro de 30 dias');
  });

  s.teste('no servidor: só a assinatura vai ao banco, e duas contas no mesmo aparelho viram suspeita', () => {
    const c = cena();
    registrarSinais(c.db, { userId: c.a, req: req(), segredo: SEGREDO, agora: T0 });
    registrarSinais(c.db, { userId: c.b, req: req({ ip: '198.51.100.9' }), segredo: SEGREDO, agora: T0 + MIN });
    registrarSinais(c.db, { userId: c.c, req: req({ aparelho: 'ffffffff-0000-4000-8000-000000000000', ip: '192.0.2.1' }), segredo: SEGREDO, agora: T0 });
    igual(sinaisDe(c.db, c.a).map(x => x.classe).sort().join(), 'aparelho,rede', 'a conta sem os dois sinais');
    /* O banco inteiro não contém o número nem o IP em claro. */
    const tudo = JSON.stringify(c.db.prepare(`SELECT * FROM sinais_conta`).all());
    ok(!tudo.includes(APARELHO) && !tudo.includes('203.0.113.7') && !tudo.includes('198.51.100.9'), 'o número ou o IP em claro no banco');
    ok(/^[0-9a-f]{64}$/.test(sinaisDe(c.db, c.a)[0].assinatura), 'a assinatura não é um HMAC-SHA256');
    /* O mesmo número em outro segredo dá outra assinatura: sem o segredo, a tabela não se liga a nada. */
    const d2 = cena();
    registrarSinais(d2.db, { userId: d2.a, req: req(), segredo: 'outro-segredo-de-trinta-e-dois-bytes-!!', agora: T0 });
    ok(sinaisDe(d2.db, d2.a).every(x => !sinaisDe(c.db, c.a).some(y => y.assinatura === x.assinatura)), 'a assinatura não depende do segredo');
    const v = varrerSuspeitas(c.db, { agora: T0 + 2 * MIN });
    const abertas = suspeitasAbertas(c.db).filter(x => x.sinal === 'aparelho');
    igual(abertas.map(x => [x.conta_a, x.conta_b].sort().join('+')).join(), [c.a, c.b].sort().join('+'), 'o par no mesmo aparelho não virou suspeita');
    ok(v.novas >= 1 && !suspeitasAbertas(c.db).some(x => x.sinal === 'rede'), 'IPs diferentes viraram suspeita de rede');
    /* Nunca pune nem liga sozinho: nenhuma linha em identidade_ligada. */
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM identidade_ligada`).get().n, 0, 'a varredura ligou as contas sozinha');
  });

  s.teste('30 dias: o sinal vencido é apagado e não acusa; o par ligado não é acusado; a escrita não repete a cada pedido', () => {
    const c = cena();
    registrarSinais(c.db, { userId: c.a, req: req(), segredo: SEGREDO, agora: T0 - 40 * DIA });
    registrarSinais(c.db, { userId: c.b, req: req(), segredo: SEGREDO, agora: T0 });
    varrerSuspeitas(c.db, { agora: T0 });
    igual(suspeitasAbertas(c.db).filter(x => x.sinal === 'aparelho').length, 0, 'o sinal de 40 dias acusou');
    igual(sinaisDe(c.db, c.a).length, 0, 'o sinal vencido ficou no banco');
    /* O par que o operador já ligou é uma pessoa: não há o que acusar. */
    const d = cena();
    ligarContas(d.db, { userId: d.a, outroId: d.b, sinal: 'operador', agora: T0 });
    registrarSinais(d.db, { userId: d.a, req: req(), segredo: SEGREDO, agora: T0 });
    registrarSinais(d.db, { userId: d.b, req: req(), segredo: SEGREDO, agora: T0 });
    varrerSuspeitas(d.db, { agora: T0 });
    igual(suspeitasAbertas(d.db).filter(x => x.sinal === 'aparelho').length, 0, 'o par ligado pelo operador foi acusado');
    /* A escrita: a mesma conta e o mesmo sinal atualizam no máximo a cada 10 min. */
    const e = cena();
    registrarSinais(e.db, { userId: e.a, req: req(), segredo: SEGREDO, agora: T0 });
    registrarSinais(e.db, { userId: e.a, req: req(), segredo: SEGREDO, agora: T0 + 5 * MIN });
    igual(sinaisDe(e.db, e.a).find(x => x.classe === 'aparelho').visto_em, T0, 'o sinal regravado antes de 10 min');
    registrarSinais(e.db, { userId: e.a, req: req(), segredo: SEGREDO, agora: T0 + 11 * MIN });
    igual(sinaisDe(e.db, e.a).find(x => x.classe === 'aparelho').visto_em, T0 + 11 * MIN, 'o sinal não atualizou depois de 10 min');
    /* Número malformado não grava o aparelho — e não quebra o pedido. */
    registrarSinais(e.db, { userId: e.b, req: req({ aparelho: '<x>' }), segredo: SEGREDO, agora: T0 });
    igual(sinaisDe(e.db, e.b).map(x => x.classe).join(), 'rede', 'o número malformado gravou');
  });

  s.teste('a migração sobe e desce, e as suspeitas antigas continuam', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'sinais-st13.8');
    ok(m, 'a migração da ST-13.8 não existe');
    db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, conta_b, sinal, medida_json, criada_em) VALUES ('x', 'y', 'horario', '{}', 1)`).run();
    m.desce(db);
    igual(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'sinais_conta'`).get().n, 0, 'a descida deixou a tabela');
    m.sobe(db);
    igual(db.prepare(`SELECT COUNT(*) AS n FROM suspeitas_antifraude`).get().n, 1, 'a subida perdeu a suspeita antiga');
    db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, conta_b, sinal, medida_json, criada_em) VALUES ('x', 'z', 'rede', '{}', 1)`).run();
  });

  s.teste('pela porta e pelo cliente: o jogo manda o número do aparelho, e o servidor grava o sinal', async () => {
    const guardado = new Map(), armazem = { getItem: k => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, v), removeItem: k => guardado.delete(k) };
    const pedidos = [], fetchAntigo = globalThis.fetch;
    globalThis.fetch = async (url, op) => { pedidos.push(op.headers); return { json: async () => ({}), ok: true, status: 200 }; };
    try {
      const api = criarApi({ armazem });
      await api.get('/api/limites'); await api.get('/api/limites');
      ok(aparelhoValido(pedidos[0]['x-aparelho']), 'o cliente não manda o número do aparelho');
      igual(pedidos[1]['x-aparelho'], pedidos[0]['x-aparelho'], 'o número muda a cada pedido');
      ok([...guardado.values()].includes(pedidos[0]['x-aparelho']), 'o número não fica guardado no navegador');
    } finally { globalThis.fetch = fetchAntigo; }
    const fonte = readFileSync(new URL('../server/servidor.mjs', import.meta.url), 'utf8');
    ok(/access-control-allow-headers', CABECALHO_VERSAO \+ ', content-type, x-aparelho'/.test(fonte), 'o CORS recusa o cabeçalho do aparelho');
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    try {
      const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'SinPorta', email: 'sinporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      await fetch(`http://127.0.0.1:${porta}/api/limites`, { headers: { [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${cad.sessao}`, 'x-aparelho': APARELHO } });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'SinPorta'`).get().id;
      igual(sinaisDe(srv.db, uid).map(x => x.classe).sort().join(), 'aparelho,rede', 'o pedido autenticado não gravou os sinais');
    } finally { await srv.fechar(); }
  });

  return s;
}
