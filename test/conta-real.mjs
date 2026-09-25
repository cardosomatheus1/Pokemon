/* Q1/Q6 · A CONTA REAL NA TELA (ST-7.2b, L-189).
 *
 * O modal "Criar treinador / Entrar" era a fachada LOCAL, e nenhum módulo do
 * `app/` chamava `/api/auth`: carteira no servidor, aposta, posse, telemetria e
 * o Sair que revoga estavam prontos e testados, e nenhum jogador chegava lá
 * pelo navegador.
 *
 *   o modo é perguntado ao abrir    sem servidor, a fachada local de sempre —
 *                                   e sem pedido nenhum no boot (ST-5.1: zero
 *                                   404 na abertura)
 *   a tela valida, o servidor decide  a idade e o e-mail repetido são dele
 *   a mensagem não vira consulta    login errado e conta inexistente dizem o
 *                                   MESMO; cadastro repetido não confirma e-mail
 *   o ciclo de verdade              cadastrar num servidor de verdade dá sessão,
 *                                   e o perfil devolve o nome do treinador
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';
import { servidorNoAr, validarConta, corpoDoCadastro, mensagemDaResposta, enviarConta }
  from '../app/modules/conta-real.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const AGORA = Date.UTC(2026, 8, 25, 15);
const BOM = { nome: 'Ash', email: 'ash@x.test', senha: 'senha-longa-o-bastante', nascimento: '1990-05-01', declarou: true };

const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
async function comServidor(fn) {
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true } });
  await new Promise(r => s.servidor.listen(0, '127.0.0.1', r));
  try { return await fn(`http://127.0.0.1:${s.servidor.address().port}`); } finally { await s.fechar(); }
}

export async function suite() {
  const s = criarSuite('conta-real');

  s.teste('a tela valida o formulário antes de mandar', () => {
    igual(validarConta('signup', BOM, AGORA).ok, true, 'um cadastro bom foi recusado');
    const casos = [
      [{ ...BOM, nome: ' ' }, /nome/i],
      [{ ...BOM, email: 'sem-arroba' }, /e-mail/i],
      [{ ...BOM, senha: 'curta' }, /12/],
      [{ ...BOM, nascimento: '1990-13-40' }, /nascimento/i],
      [{ ...BOM, nascimento: '2030-01-01' }, /nascimento/i],
      [{ ...BOM, declarou: false }, /declara/i],
    ];
    for (const [c, re] of casos) {
      const v = validarConta('signup', c, AGORA);
      ok(!v.ok && re.test(v.msg), `${JSON.stringify(c)} passou ou disse "${v.msg}"`);
    }
    igual(validarConta('login', { email: 'ash@x.test', senha: 'x' }, AGORA).ok, true,
      'o login cobrou a regra de senha do cadastro — quem tem conta antiga não entra');
    igual(validarConta('login', { email: '', senha: 'x' }, AGORA).ok, false, 'login sem e-mail passou');
  });

  s.teste('o corpo do cadastro leva só os quatro campos do servidor', () => {
    const c = corpoDoCadastro({ ...BOM, email: ' Ash@X.test ', pin: '1234', status: 'ativo' });
    igual(JSON.stringify(Object.keys(c).sort()), JSON.stringify(['email', 'nascimento', 'senha', 'username']),
      'o corpo levou campo que o servidor não pediu');
    igual(c.email, 'ash@x.test', 'o e-mail não foi normalizado');
    igual(c.username, 'Ash');
  });

  s.teste('a mensagem não vira consulta de conta', () => {
    const login401 = mensagemDaResposta({ ok: false, status: 401, corpo: { codigo: 'nao_autorizado' } }, 'login');
    ok(/não conferem/.test(login401), `login errado disse: ${login401}`);
    const repetido = mensagemDaResposta({ ok: false, status: 400,
      corpo: { codigo: 'dados_invalidos', erro: 'não foi possível concluir o cadastro com esses dados' } }, 'signup');
    ok(!/já existe|cadastrado|em uso/i.test(repetido), `o cadastro repetido confirmou o e-mail: ${repetido}`);
    ok(/18/.test(mensagemDaResposta({ ok: false, status: 400, corpo: { codigo: 'idade_minima' } }, 'signup')),
      'a recusa por idade não diz a regra');
    ok(/12/.test(mensagemDaResposta({ ok: false, status: 400, corpo: { codigo: 'dados_invalidos', erro: 'senha curta demais' } }, 'signup')),
      'senha curta não diz o mínimo');
    ok(/servidor/i.test(mensagemDaResposta({ ok: false, indisponivel: true, status: 0 }, 'login')),
      'sem rede, a tela não diz que o problema é o servidor');
    ok(/tentativas/.test(mensagemDaResposta({ ok: false, status: 429, corpo: { codigo: 'muitas_tentativas' } }, 'login')),
      'bloqueio por tentativas não é dito');
  });

  s.teste('sem servidor, é a fachada local; o modo é perguntado ao /saude', async () => {
    igual(await servidorNoAr({ get: async () => ({ ok: false, indisponivel: true }) }), false, 'sem resposta virou servidor no ar');
    igual(await servidorNoAr({ get: async () => ({ ok: true, corpo: { ok: true } }) }), true, 'o servidor no ar não foi visto');
    igual(await servidorNoAr({ get: async () => { throw new Error('rede'); } }), false, 'a falha de rede subiu');
    const chamadas = [];
    await servidorNoAr({ get: async c => { chamadas.push(c); return { ok: false }; } });
    igual(chamadas[0], '/saude', 'o modo foi perguntado a outra rota');
  });

  s.teste('o ciclo de verdade: cadastrar dá sessão; entrar noutro aparelho também; o perfil diz o nome', async () => {
    await comServidor(async base => {
      const a = criarApi({ base, armazem: memoria() });
      igual(await servidorNoAr(a), true, 'o servidor de verdade não foi visto');
      const r = await enviarConta(a, 'signup', BOM, AGORA);
      igual(r.ok, true, `o cadastro falhou: ${r.msg}`);
      igual(a.temSessao(), true, 'o cadastro não deixou sessão');
      const p = await a.get('/api/perfil');
      igual(p.corpo?.nome, 'Ash', 'o perfil não devolve o nome do treinador — o outro aparelho entra sem nome');

      const outro = criarApi({ base, armazem: memoria() });
      const e = await enviarConta(outro, 'login', { email: 'ASH@x.test', senha: BOM.senha }, AGORA);
      igual(e.ok, true, `entrar noutro aparelho falhou: ${e.msg}`);
      const errado = await enviarConta(criarApi({ base, armazem: memoria() }), 'login', { email: 'ash@x.test', senha: 'errada-errada-1' }, AGORA);
      ok(!errado.ok && /não conferem/.test(errado.msg), `senha errada disse: ${errado.msg}`);
      const repetido = await enviarConta(criarApi({ base, armazem: memoria() }), 'signup', BOM, AGORA);
      ok(!repetido.ok, 'o cadastro repetido passou');
    });
  });

  s.teste('a tela liga as duas metades', () => {
    const nav = fonte('../app/modules/navegacao.mjs'), html = fonte('../app/index.html');
    ok(/servidorNoAr\(api\)/.test(nav), 'o modal não pergunta se o servidor está no ar');
    ok(/enviarConta\(api, authMode/.test(nav), 'o botão do modal não fala com o servidor');
    for (const id of ['authEmail', 'authSenha', 'authNasc', 'authInfo'])
      ok(html.includes(`id="${id}"`), `o modal não tem #${id}`);
    ok(/if \(r\.corpo\?\.nome\)/.test(fonte('../app/modules/perfil-dados.mjs')), 'o login não traz o nome do servidor');
  });

  return s;
}
