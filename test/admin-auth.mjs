/* Q1/Q2/Q6 · O OPERADOR PROVA QUEM É (F1.17) — a L-041.
 *
 * ── O QUE O F1.11 DEIXOU ABERTO ────────────────────────────────────────────
 *
 * Aquele bloco construiu as três camadas do §5.11: papel, registro e
 * confirmação. O que ele NÃO construiu foi autenticação — o operador chegava
 * num cabeçalho `x-operador` com o próprio id, e o servidor confiava.
 *
 * Construir meia autenticação junto teria sido pior que nenhuma: ela pareceria
 * proteção. Aqui ela vem inteira, e o critério de saída é uma frase:
 * **um id de operador vazado não abre nada.**
 *
 * ── AS QUATRO SABOTAGENS DECLARADAS ────────────────────────────────────────
 *
 *   aceitar a sessão do JOGADOR como credencial de operador
 *   sessão administrativa sem expiração
 *   login de operador fora da auditoria
 *   distinguir "senha errada" de "operador não existe"
 *
 * A última é o enumerador do §5.11, e é a mesma lição que o login do jogador já
 * pagou no F1.3: quem descobre a lista de e-mails descobre a lista de pessoas
 * com acesso — e essa lista é bem mais curta e bem mais valiosa.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { criarOperador, ERRO_ADMIN } from '../server/admin.mjs';
import {
  definirCredencial, entrarOperador, lerSessaoAdmin, sairOperador,
  SESSAO_ADMIN_MS, ROTACAO_ADMIN_MS, segredoTotp, codigoTotp,
} from '../server/admin-auth.mjs';

const AGORA = Date.parse('2026-03-02T12:00:00Z');
const SENHA = 'senha-de-operador-bem-longa-1';

function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  const op = criarOperador(db, { email: 'op@exemplo.test', papel: 'dono', agora: AGORA });
  const segredo = segredoTotp();
  definirCredencial(db, { operadorId: op.id, senha: SENHA, segredoTotp: segredo, agora: AGORA });
  return { db, op, segredo, agora: AGORA };
}

const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

export function suite() {
  const s = criarSuite('admin-auth');

  /* ── O CRITÉRIO DE SAÍDA ───────────────────────────────────────────────*/

  s.teste('um id de operador vazado NÃO abre nada', () => {
    const c = cenario();
    /* O id é público no sentido que importa: ele aparece em toda linha de
       auditoria. Antes deste bloco, ele ERA a credencial. */
    igual(lerSessaoAdmin(c.db, { token: c.op.id, agora: c.agora }), null,
      'o id do operador foi aceito como sessão. Ele aparece em toda linha de ' +
      'auditoria — quem lê o registro de uma ação passa a poder fazer outra.');
    for (const tentativa of [c.op.email, `Bearer ${c.op.id}`, c.op.id.replace(/-/g, '')])
      igual(lerSessaoAdmin(c.db, { token: tentativa, agora: c.agora }), null,
        `\`${String(tentativa).slice(0, 20)}\` abriu sessão administrativa`);
  });

  /* ── A CREDENCIAL É PRÓPRIA ────────────────────────────────────────────*/

  s.teste('a sessão do JOGADOR não vale como credencial de operador', async () => {
    const c = cenario();
    const { cadastrar, abrirSessao } = await import('../server/auth.mjs');
    const u = cadastrar(c.db, { username: 'j', email: 'j@exemplo.test',
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: c.agora });
    /* Uma sessão de jogador DE VERDADE, assinada com um segredo qualquer: o que
       se mede é que o formato dela não abre porta aqui, e não que a assinatura
       confira. */
    const token = abrirSessao({ segredo: 'segredo-de-teste-bem-longo', userId: u.id,
                                agora: c.agora });

    igual(lerSessaoAdmin(c.db, { token, agora: c.agora }), null,
      'a sessão de um JOGADOR abriu o painel administrativo. As duas identidades ' +
      'se confundiram, e um vazamento de sessão de jogador vira acesso admin — ' +
      'o raio do incidente passa de uma conta para todas.');
  });

  s.teste('entrar exige senha E segundo fator', () => {
    const c = cenario();
    const codigo = codigoTotp(c.segredo, c.agora);

    ok(recusa(() => entrarOperador(c.db, { email: c.op.email, senha: SENHA, agora: c.agora })),
      'entrou sem o segundo fator');
    ok(recusa(() => entrarOperador(c.db, { email: c.op.email, senha: 'errada',
                                           codigo, agora: c.agora })),
      'entrou com a senha errada e o código certo');
    ok(recusa(() => entrarOperador(c.db, { email: c.op.email, senha: SENHA,
                                           codigo: '000000', agora: c.agora })),
      'entrou com o código errado e a senha certa');

    const r = entrarOperador(c.db, { email: c.op.email, senha: SENHA, codigo, agora: c.agora });
    ok(r?.token, 'a credencial completa não abriu sessão');
    igual(lerSessaoAdmin(c.db, { token: r.token, agora: c.agora })?.papel, 'dono',
      'a sessão aberta não devolve o operador');
  });

  /* ── O ENUMERADOR ──────────────────────────────────────────────────────*/

  s.teste('"senha errada" e "operador não existe" são a MESMA resposta', () => {
    const c = cenario();
    const codigo = codigoTotp(c.segredo, c.agora);
    const existe = recusa(() => entrarOperador(c.db,
      { email: c.op.email, senha: 'errada-mas-longa-o-bastante', codigo, agora: c.agora }));
    const naoExiste = recusa(() => entrarOperador(c.db,
      { email: 'fantasma@exemplo.test', senha: SENHA, codigo, agora: c.agora }));

    ok(existe && naoExiste, 'uma das duas tentativas não foi recusada');
    igual(existe.codigo, naoExiste.codigo,
      `operador que existe deu "${existe.codigo}" e o que não existe deu ` +
      `"${naoExiste.codigo}". A diferença transforma a tela de login numa ` +
      `consulta de quem tem acesso — e essa lista é curta e valiosa.`);
    igual(existe.message, naoExiste.message,
      'as mensagens diferem, e a mensagem é o que o atacante lê');
  });

  s.teste('a recusa de operador inexistente custa o MESMO tempo', () => {
    /* Sem hash fantasma, a resposta para um e-mail que não existe volta na
       hora — e o relógio vira o enumerador que a mensagem não é. É a mesma
       defesa que `entrar()` do F1.3 tem, pelo mesmo motivo. */
    const c = cenario();
    const codigo = codigoTotp(c.segredo, c.agora);
    const medir = fn => { const t = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - t) / 1e6; };
    const comConta = medir(() => recusa(() => entrarOperador(c.db,
      { email: c.op.email, senha: 'errada-mas-longa-o-bastante', codigo, agora: c.agora })));
    const semConta = medir(() => recusa(() => entrarOperador(c.db,
      { email: 'fantasma@exemplo.test', senha: SENHA, codigo, agora: c.agora })));
    const razao = Math.max(comConta, semConta) / Math.max(0.01, Math.min(comConta, semConta));
    ok(razao < 5,
      `recusar quem existe levou ${comConta.toFixed(1)} ms e quem não existe ` +
      `${semConta.toFixed(1)} ms (${razao.toFixed(1)}×). O relógio virou o ` +
      `enumerador que a mensagem não é.`);
  });

  /* ── EXPIRAÇÃO E ROTAÇÃO ───────────────────────────────────────────────*/

  s.teste('a sessão administrativa EXPIRA', () => {
    const c = cenario();
    const { token } = entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: codigoTotp(c.segredo, c.agora), agora: c.agora });
    ok(lerSessaoAdmin(c.db, { token, agora: c.agora + SESSAO_ADMIN_MS - 1 }),
      'a sessão morreu antes da hora');
    igual(lerSessaoAdmin(c.db, { token, agora: c.agora + SESSAO_ADMIN_MS + 1 }), null,
      'a sessão administrativa não expirou. Um terminal esquecido aberto vira ' +
      'acesso permanente ao painel que vê o saldo de todo mundo.');
  });

  s.teste('a sessão gira, e o token antigo morre na hora', () => {
    const c = cenario();
    const a = entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: codigoTotp(c.segredo, c.agora), agora: c.agora });
    const depois = c.agora + ROTACAO_ADMIN_MS + 1;
    const b = lerSessaoAdmin(c.db, { token: a.token, agora: depois, girar: true });
    ok(b?.tokenNovo, 'a sessão não girou depois da janela de rotação');
    igual(lerSessaoAdmin(c.db, { token: a.token, agora: depois + 1 }), null,
      'o token ANTIGO continuou valendo depois da rotação. Rotação que deixa o ' +
      'anterior vivo dobra a superfície em vez de reduzi-la.');
    ok(lerSessaoAdmin(c.db, { token: b.tokenNovo, agora: depois + 1 }),
      'o token novo não vale');
  });

  s.teste('sair mata a sessão imediatamente', () => {
    const c = cenario();
    const { token } = entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: codigoTotp(c.segredo, c.agora), agora: c.agora });
    sairOperador(c.db, { token, agora: c.agora });
    igual(lerSessaoAdmin(c.db, { token, agora: c.agora + 1 }), null,
      'a sessão sobreviveu ao logout');
  });

  /* ── A AUDITORIA ───────────────────────────────────────────────────────*/

  s.teste('o login de operador entra na MESMA auditoria das ações', () => {
    const c = cenario();
    entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: codigoTotp(c.segredo, c.agora), agora: c.agora });
    const linhas = c.db.prepare(
      `SELECT * FROM admin_auditoria WHERE operador_id = ? ORDER BY criado_em`).all(c.op.id);
    ok(linhas.length > 0,
      'entrar no painel não deixou registro. "Quem entrou" é a primeira pergunta ' +
      'de qualquer investigação, e ela é anterior a "o que ele fez".');
    ok(linhas.some(l => l.acao === 'operador.entrou'),
      `nenhuma linha de \`operador.entrou\`: ${linhas.map(l => l.acao).join(', ')}`);
  });

  s.teste('a tentativa FALHA também é registrada', () => {
    const c = cenario();
    recusa(() => entrarOperador(c.db, { email: c.op.email, senha: 'errada-mas-longa',
      codigo: codigoTotp(c.segredo, c.agora), agora: c.agora }));
    const n = c.db.prepare(
      `SELECT COUNT(*) n FROM admin_auditoria WHERE acao = 'operador.recusado'`).get().n;
    ok(n > 0,
      'tentativa recusada não deixou registro. Cem recusas seguidas é o sinal ' +
      'mais barato de ataque que existe, e sem registro ele não existe.');
  });

  s.teste('a auditoria NÃO guarda a senha nem o código', () => {
    const c = cenario();
    recusa(() => entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: '123456', agora: c.agora }));
    const tudo = JSON.stringify(c.db.prepare(`SELECT * FROM admin_auditoria`).all());
    ok(!tudo.includes(SENHA),
      'a senha do operador foi parar na auditoria. Registro é para ser lido por ' +
      'gente, e a auditoria vira o lugar mais fácil de achar credencial.');
    ok(!tudo.includes('123456'), 'o código do segundo fator foi para a auditoria');
  });

  /* ── O SEGUNDO FATOR ───────────────────────────────────────────────────*/

  s.teste('o código do segundo fator muda com o tempo e não repete', () => {
    const c = cenario();
    const janela = 30_000;
    const a = codigoTotp(c.segredo, c.agora);
    igual(codigoTotp(c.segredo, c.agora + 1_000), a,
      'o código mudou dentro da mesma janela de 30 s — nenhum ser humano digita a tempo');
    ok(codigoTotp(c.segredo, c.agora + janela * 3) !== a,
      'o código não mudou depois de três janelas: é senha fixa com seis dígitos');
    igual(a.length, 6, `o código tem ${a.length} dígitos`);
  });

  s.teste('o código de OUTRO segredo não abre', () => {
    const c = cenario();
    const outro = segredoTotp();
    ok(recusa(() => entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo: codigoTotp(outro, c.agora), agora: c.agora })),
      'o código gerado de outro segredo abriu a sessão');
  });

  s.teste('o mesmo código não pode ser usado duas vezes', () => {
    const c = cenario();
    const codigo = codigoTotp(c.segredo, c.agora);
    entrarOperador(c.db, { email: c.op.email, senha: SENHA, codigo, agora: c.agora });
    ok(recusa(() => entrarOperador(c.db, { email: c.op.email, senha: SENHA,
      codigo, agora: c.agora + 1_000 })),
      'o mesmo código do segundo fator abriu duas sessões. Quem observa o código ' +
      'uma vez — por cima do ombro, num print — o reusa dentro da janela.');
  });

  return s;
}
