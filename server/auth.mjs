/* AUTENTICAÇÃO — cadastro, login, sessão e recuperação (F1.3).
 *
 * Fronteira: prova quem é o usuário e guarda o resultado num token. Não sabe
 * apostar, não move dinheiro, não serve HTTP.
 *
 * ── A BARREIRA DE IDADE (§28.2) ────────────────────────────────────────────
 *
 * Na V1 ela é DECLARATÓRIA, e é isso que a torna frágil. Duas regras a
 * sustentam, e as duas são fáceis de errar na direção "mais limpa":
 *
 *   1. A data é IMUTÁVEL. Sem isso, quem foi bloqueado só edita o campo. O
 *      esquema garante por gatilho — CHECK não enxerga o valor antigo.
 *   2. A conta bloqueada é CONGELADA, não apagada. Apagar parece mais limpo e
 *      é exatamente o contorno: e-mail livre, cadastro de novo, idade nova.
 *      **Apagar É o contorno.**
 *
 * ── SENHA ──────────────────────────────────────────────────────────────────
 *
 * `scrypt` do `node:crypto`. Zero dependências, e é a única primitiva de
 * alongamento que o Node traz pronta. Os parâmetros vão GRAVADOS no hash: sem
 * eles, subir o custo amanhã invalidaria todas as senhas de ontem.
 *
 * ── O QUE CUSTA TEMPO ──────────────────────────────────────────────────────
 *
 * Login de usuário inexistente calcula o hash MESMO ASSIM, contra um hash falso.
 * Sem isso, a resposta volta em microssegundos quando o e-mail não existe e em
 * dezenas de milissegundos quando existe — e a tela de login vira uma consulta
 * de "esse e-mail tem conta aqui?", que um atacante faz com cem requisições.
 * Mensagens iguais não bastam; o relógio fala.
 */
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

export const IDADE_MINIMA = 18;

export const ERRO_AUTH = {
  IDADE_MINIMA:     'idade_minima',
  CONTA_CONGELADA:  'conta_congelada',
  CREDENCIAL:       'credencial_invalida',
  MUITAS_TENTATIVAS:'muitas_tentativas',
  TOKEN_INVALIDO:   'token_invalido',
  DADOS:            'dados_invalidos',
};

const erro = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });

/* ── IDADE ─────────────────────────────────────────────────────────────────
 *
 * Contar só a diferença de anos deixa entrar alguém que ainda não fez
 * aniversário este ano — um dia inteiro de gente com 17 passando por 18. E o
 * 29 de fevereiro tem que cair no lado certo: quem nasceu em 29/02 completa
 * anos em 01/03 nos anos comuns, não em 28/02.
 *
 * `agora` é parâmetro e não `Date.now()`: teste que depende do relógio da
 * máquina é teste que falha em janeiro — foi o D-005. */
export function idadeEm(nascimento, agora) {
  const [a, m, d] = nascimento.split('-').map(Number);
  const hoje = new Date(agora);
  let anos = hoje.getUTCFullYear() - a;
  const mesHoje = hoje.getUTCMonth() + 1, diaHoje = hoje.getUTCDate();
  if (mesHoje < m || (mesHoje === m && diaHoje < d)) anos--;
  return anos;
}

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/* ── SENHA ─────────────────────────────────────────────────────────────────
 *
 * Formato: `scrypt$N$r$p$sal$hash`. Os parâmetros no próprio campo porque subir
 * o custo amanhã não pode invalidar a senha de ontem — o verificador lê os
 * parâmetros COM QUE AQUELE hash foi feito. */
const SCRYPT = { N: 16384, r: 8, p: 1, len: 32 };

function hashSenha(senha, params = SCRYPT) {
  const sal = randomBytes(16);
  const h = scryptSync(senha, sal, params.len, { N: params.N, r: params.r, p: params.p });
  return `scrypt$${params.N}$${params.r}$${params.p}$${sal.toString('base64')}$${h.toString('base64')}`;
}

function confereSenha(senha, guardado) {
  const [alg, N, r, p, sal, esperado] = String(guardado).split('$');
  if (alg !== 'scrypt') return false;
  const h = scryptSync(senha, Buffer.from(sal, 'base64'), Buffer.from(esperado, 'base64').length,
    { N: Number(N), r: Number(r), p: Number(p) });
  const e = Buffer.from(esperado, 'base64');
  return h.length === e.length && timingSafeEqual(h, e);
}

/* O HASH FALSO CONTRA O QUAL SE CONFERE QUANDO O USUÁRIO NÃO EXISTE.
   Calculado uma vez, na carga do módulo, para o custo ser o mesmo do caminho
   real sem pagar um scrypt extra por requisição. */
const HASH_FANTASMA = hashSenha(randomBytes(32).toString('hex'));

/* ── CADASTRO ──────────────────────────────────────────────────────────────*/

export function cadastrar(db, { username, email, senha, nascimento, agora = Date.now() }) {
  if (!username || !email || !senha || !nascimento)
    throw erro(ERRO_AUTH.DADOS, 'dados incompletos');
  if (!DATA_VALIDA.test(nascimento))
    throw erro(ERRO_AUTH.DADOS, 'data de nascimento inválida');
  if (String(senha).length < 12)
    throw erro(ERRO_AUTH.DADOS, 'senha curta demais');

  const emailNorm = String(email).trim().toLowerCase();

  /* CONTA CONGELADA BLOQUEIA O RECADASTRO, e este é o coração do §28.2.
     Sem esta consulta, quem foi barrado por idade apaga nada e simplesmente
     cadastra de novo com outra data. */
  const existente = db.prepare(`SELECT id, status FROM users WHERE email = ?`).get(emailNorm);
  if (existente)
    throw erro(existente.status === 'congelado' ? ERRO_AUTH.CONTA_CONGELADA : ERRO_AUTH.DADOS,
      'não foi possível concluir o cadastro com esses dados');

  const idade = idadeEm(nascimento, agora);

  /* O REGISTRO DO BLOQUEIO FICA, e a conta nasce congelada.
     É contraintuitivo — recusar e gravar ao mesmo tempo —, mas é a única forma
     de a barreira valer: sem o registro, o e-mail volta a estar livre e a
     recusa não custa nada a quem quiser contorná-la. */
  if (idade < IDADE_MINIMA) {
    db.prepare(`INSERT INTO users (id, username, email, password_hash, status, birth_date, created_at)
                VALUES (?, ?, ?, ?, 'congelado', ?, ?)`)
      .run(randomUUID(), String(username).trim(), emailNorm, hashSenha(senha), nascimento, agora);
    db.prepare(`INSERT INTO responsible_play_events (id, user_id, tipo, detalhe, criado_em)
                SELECT ?, id, 'bloqueio_idade', ?, ? FROM users WHERE email = ?`)
      .run(randomUUID(), `idade declarada ${idade}, mínima ${IDADE_MINIMA}`, agora, emailNorm);
    throw erro(ERRO_AUTH.IDADE_MINIMA,
      `é preciso ter ao menos ${IDADE_MINIMA} anos para criar uma conta`);
  }

  const id = randomUUID();
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO users (id, username, email, password_hash, status, birth_date, created_at)
                VALUES (?, ?, ?, ?, 'ativo', ?, ?)`)
      .run(id, String(username).trim(), emailNorm, hashSenha(senha), nascimento, agora);
    db.prepare(`INSERT INTO trainer_profiles (user_id, display_name) VALUES (?, ?)`)
      .run(id, String(username).trim());
    for (const b of ['transferivel', 'pendente', 'bonus', 'competitivo'])
      db.prepare(`INSERT INTO carteiras (user_id, bucket, saldo) VALUES (?, ?, 0)`).run(id, b);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw erro(ERRO_AUTH.DADOS, 'não foi possível concluir o cadastro'); }
  return { id, username, email: emailNorm };
}

/* ── LOGIN ─────────────────────────────────────────────────────────────────*/

/* Janela de força bruta. Em memória por processo: o F1.6 traz mais de um
   processo e isso vira uma tabela — está anotado como lacuna no bloco. */
const TENTATIVAS = new Map();
const JANELA_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 10;

function registrarFalha(chave, agora) {
  const lista = (TENTATIVAS.get(chave) || []).filter(t => agora - t < JANELA_MS);
  lista.push(agora);
  TENTATIVAS.set(chave, lista);
}
function bloqueado(chave, agora) {
  const lista = (TENTATIVAS.get(chave) || []).filter(t => agora - t < JANELA_MS);
  TENTATIVAS.set(chave, lista);
  return lista.length >= MAX_TENTATIVAS;
}

export function entrar(db, { email, senha, agora = Date.now() }) {
  const emailNorm = String(email || '').trim().toLowerCase();

  /* O BLOQUEIO SOLTA SOZINHO depois da janela. Bloqueio que não solta é negação
     de serviço contra o próprio dono da conta, feita por quem souber o e-mail. */
  if (bloqueado(emailNorm, agora))
    throw erro(ERRO_AUTH.MUITAS_TENTATIVAS, 'muitas tentativas; tente de novo mais tarde');

  const u = db.prepare(`SELECT id, password_hash, status FROM users WHERE email = ?`).get(emailNorm);

  /* CONFERE SEMPRE, inclusive contra o hash fantasma. É o que iguala o TEMPO
     entre e-mail que existe e e-mail que não existe — e o tempo enumera contas
     mesmo quando a mensagem não enumera. */
  const ok = confereSenha(String(senha || ''), u ? u.password_hash : HASH_FANTASMA);

  if (!u || !ok) {
    registrarFalha(emailNorm, agora);
    /* MESMO CÓDIGO E MESMA MENSAGEM para os dois casos: "e-mail não encontrado"
       contra "senha incorreta" transforma a tela de login numa consulta. */
    throw erro(ERRO_AUTH.CREDENCIAL, 'e-mail ou senha inválidos');
  }
  if (u.status !== 'ativo')
    throw erro(ERRO_AUTH.CONTA_CONGELADA, 'esta conta não está ativa');

  TENTATIVAS.delete(emailNorm);
  db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(agora, u.id);
  return { id: u.id };
}

/* ── SESSÃO ────────────────────────────────────────────────────────────────
 *
 * Token assinado, sem estado no servidor: `corpo.assinatura`, com HMAC-SHA256.
 * Sem tabela de sessão porque o F1.6 vai ter mais de um processo, e sessão em
 * memória obrigaria sessão pegajosa no balanceador — problema de infraestrutura
 * criado por decisão de código.
 *
 * O PRAZO VAI DENTRO DO CORPO ASSINADO. Fora dele, o cliente edita o próprio
 * vencimento; num campo separado não assinado, idem. */
const DURACAO_PADRAO = 7 * 24 * 60 * 60 * 1000;

const b64 = b => Buffer.from(b).toString('base64url');
const deB64 = t => Buffer.from(t, 'base64url');

export function abrirSessao({ segredo, userId, agora = Date.now(), duracaoMs = DURACAO_PADRAO }) {
  const corpo = b64(JSON.stringify({ u: userId, exp: agora + duracaoMs, n: randomBytes(9).toString('base64url') }));
  return `${corpo}.${assinar(segredo, corpo)}`;
}

export function lerSessao({ segredo, token, agora = Date.now() }) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [corpo, assinatura] = token.split('.');
  const esperada = assinar(segredo, corpo);
  /* Comparação em tempo constante: comparar assinatura com `===` vaza, byte a
     byte, quantos caracteres o atacante acertou. */
  const a = deB64(assinatura || ''), b = deB64(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let dados; try { dados = JSON.parse(deB64(corpo).toString('utf8')); } catch { return null; }
  if (!dados || typeof dados.exp !== 'number' || dados.exp <= agora) return null;
  return { userId: dados.u, expiraEm: dados.exp };
}

const assinar = (segredo, corpo) =>
  createHmac('sha256', segredo).update(corpo).digest('base64url');

/* ── RECUPERAÇÃO ───────────────────────────────────────────────────────────
 *
 * Token de USO ÚNICO e com prazo. As duas coisas são a mesma lição: token que
 * sobrevive ao uso é token que quem achar o e-mail antigo usa depois.
 *
 * O token guardado é o HASH dele, não o token. Quem ler a tabela não consegue
 * entrar em conta nenhuma — é a mesma razão de a senha não ficar em claro. */
const RECUPERACAO_MS = 30 * 60 * 1000;

export function pedirRecuperacao(db, { email, agora = Date.now(), duracaoMs = RECUPERACAO_MS }) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const u = db.prepare(`SELECT id FROM users WHERE email = ?`).get(emailNorm);
  /* E-MAIL INEXISTENTE NÃO LANÇA. Lançar é a resposta à pergunta "esse e-mail
     tem conta aqui?" — a mesma enumeração do login, entrando por outra porta.
     O chamador manda o e-mail se houver conta e não manda se não houver; a
     resposta ao usuário é a mesma nos dois casos. */
  if (!u) return null;
  const token = randomBytes(32).toString('base64url');
  db.prepare(`INSERT INTO responsible_play_events (id, user_id, tipo, detalhe, criado_em)
              VALUES (?, ?, 'recuperacao_pedida', ?, ?)`)
    .run(randomUUID(), u.id, JSON.stringify({ hash: hashToken(token), exp: agora + duracaoMs }), agora);
  return token;
}

export function usarRecuperacao(db, { token, senhaNova, agora = Date.now() }) {
  if (String(senhaNova || '').length < 12)
    throw erro(ERRO_AUTH.DADOS, 'senha curta demais');
  const h = hashToken(String(token || ''));
  const linha = db.prepare(
    `SELECT id, user_id, detalhe FROM responsible_play_events
     WHERE tipo = 'recuperacao_pedida' ORDER BY criado_em DESC`).all()
    .find(r => { try { return JSON.parse(r.detalhe).hash === h; } catch { return false; } });
  if (!linha) throw erro(ERRO_AUTH.TOKEN_INVALIDO, 'link inválido ou já usado');
  const d = JSON.parse(linha.detalhe);
  if (d.exp <= agora) throw erro(ERRO_AUTH.TOKEN_INVALIDO, 'link expirado');

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashSenha(senhaNova), linha.user_id);
    /* USO ÚNICO: o pedido vira "usado" e o hash sai do detalhe. Deixá-lo lá com
       uma flag é convite a alguém conferir a flag no lugar errado. */
    db.prepare(`UPDATE responsible_play_events SET tipo='recuperacao_usada', detalhe='{}' WHERE id=?`)
      .run(linha.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw erro(ERRO_AUTH.TOKEN_INVALIDO, 'não foi possível concluir'); }
  return { userId: linha.user_id };
}

const hashToken = t => createHmac('sha256', 'recuperacao').update(t).digest('base64url');
