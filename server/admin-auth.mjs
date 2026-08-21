/* AUTENTICAÇÃO DE OPERADOR (F1.17) — a L-041.
 *
 * O F1.11 construiu as três camadas do §5.11 — papel, registro, confirmação —
 * e o operador ainda chegava num cabeçalho `x-operador` com o próprio id. O
 * servidor confiava. Este módulo é o que faltava, e o critério de saída é uma
 * frase: **um id de operador vazado não abre nada.**
 *
 * ── POR QUE A CREDENCIAL É SEPARADA DA DO JOGADOR ─────────────────────────
 *
 * Não é purismo. Se a sessão do jogador valesse aqui, um vazamento de sessão de
 * jogador viraria acesso administrativo — e o raio do incidente passaria de uma
 * conta para TODAS. São duas identidades com valores diferentes por ordens de
 * magnitude, e misturá-las faz a mais barata definir a segurança da mais cara.
 *
 * Por isso a tabela é outra, o token é outro, e não há caminho de conversão.
 *
 * ── AS TRÊS DEFESAS, E O QUE CADA UMA CUSTA AO ATACANTE ───────────────────
 *
 *   senha       scrypt com os mesmos parâmetros do jogador (F1.3)
 *   TOTP        um código de 30 s que não viaja pela rede do produto
 *   expiração   a sessão morre em 8 h e gira a cada 30 min
 *
 * Nenhuma delas sozinha resolve. Senha vaza em lista; TOTP sozinho é um número
 * de seis dígitos; sessão eterna transforma um terminal esquecido em acesso
 * permanente. As três juntas exigem que o atacante tenha a senha, o aparelho e
 * a janela de tempo.
 */
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sha256Bytes } from '../engine/hash.mjs';
import { registrarAuditoria } from './admin.mjs';

export const ERRO_ADMIN_AUTH = {
  CREDENCIAL: 'credencial_invalida',
  SESSAO:     'sessao_invalida',
  DADOS:      'dados_invalidos',
};

const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

/* ── OS PRAZOS ─────────────────────────────────────────────────────────────
 *
 * Oito horas é um turno. Trinta minutos de rotação é o intervalo em que um
 * token roubado deixa de valer sem que o operador precise fazer nada — e é
 * curto o bastante para importar, longo o bastante para não brigar com quem
 * está trabalhando.
 *
 * Os dois são bem mais curtos que a sessão do jogador, e é de propósito: o que
 * está do outro lado é o saldo de todo mundo. */
export const SESSAO_ADMIN_MS = 8 * 60 * 60 * 1000;
export const ROTACAO_ADMIN_MS = 30 * 60 * 1000;

/* Os mesmos parâmetros do `auth.mjs`. Ficam repetidos e não importados porque
   os dois módulos podem divergir por decisão futura — o operador pode vir a
   exigir custo maior —, e um `import` esconderia que a escolha é a mesma HOJE,
   não para sempre. */
const SCRYPT = { N: 16384, r: 8, p: 1, len: 32 };

function hash(senha, sal = randomBytes(16)) {
  const h = scryptSync(senha, sal, SCRYPT.len, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${sal.toString('base64')}$${h.toString('base64')}`;
}

function confere(senha, guardado) {
  try {
    const [, salB64, espB64] = String(guardado).split('$');
    const sal = Buffer.from(salB64, 'base64');
    const esperado = Buffer.from(espB64, 'base64');
    const h = scryptSync(senha, sal, esperado.length, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    return timingSafeEqual(h, esperado);
  } catch { return false; }
}

/* O HASH FANTASMA, e ele é a defesa que a mensagem não é.
 *
 * Sem ele, recusar um e-mail que não existe volta na hora e recusar um que
 * existe custa um scrypt — e o RELÓGIO vira o enumerador que a mensagem
 * cuidadosamente não é. Mesma defesa do `entrar()` do F1.3, pelo mesmo motivo. */
const HASH_FANTASMA = hash('nao-existe-e-nunca-vai-existir');

/* ── O SEGUNDO FATOR ───────────────────────────────────────────────────────
 *
 * TOTP (RFC 6238) com HMAC-SHA-256. O SHA-256 é o do `engine/hash.mjs`, escrito
 * no F1.15 — o projeto não tem dependências, e isto é a implementação de um
 * padrão publicado, não criptografia inventada.
 *
 * HMAC-SHA-256 e não SHA-1: o RFC permite as duas, e não há razão para escolher
 * a mais fraca num código escrito hoje.
 */
const BLOCO = 64;                       // tamanho do bloco do SHA-256, em bytes

function hmacSha256(chave, msg) {
  let k = chave;
  if (k.length > BLOCO) k = Buffer.from(palavrasParaBytes(sha256Bytes(k)));
  const kp = Buffer.alloc(BLOCO); k.copy(kp);
  const ipad = Buffer.alloc(BLOCO), opad = Buffer.alloc(BLOCO);
  for (let i = 0; i < BLOCO; i++) { ipad[i] = kp[i] ^ 0x36; opad[i] = kp[i] ^ 0x5c; }
  const interno = palavrasParaBytes(sha256Bytes(Buffer.concat([ipad, msg])));
  return Buffer.from(palavrasParaBytes(sha256Bytes(Buffer.concat([opad, Buffer.from(interno)]))));
}

function palavrasParaBytes(palavras) {
  const b = new Uint8Array(palavras.length * 4);
  palavras.forEach((p, i) => {
    b[i * 4] = (p >>> 24) & 0xff; b[i * 4 + 1] = (p >>> 16) & 0xff;
    b[i * 4 + 2] = (p >>> 8) & 0xff; b[i * 4 + 3] = p & 0xff;
  });
  return b;
}

export const JANELA_TOTP_MS = 30_000;
export const segredoTotp = () => randomBytes(20).toString('hex');

/* O código de seis dígitos da janela de 30 s. Determinístico a partir de
   (segredo, tempo) — é isso que permite ao aparelho do operador e ao servidor
   chegarem no mesmo número sem trocar nada pela rede. */
export function codigoTotp(segredoHex, agora = Date.now()) {
  const passo = Math.floor(agora / JANELA_TOTP_MS);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(passo / 0x100000000), 0);
  msg.writeUInt32BE(passo >>> 0, 4);
  const mac = hmacSha256(Buffer.from(segredoHex, 'hex'), msg);
  /* Truncamento dinâmico do RFC 4226: o último nibble diz onde ler. */
  const off = mac[mac.length - 1] & 0x0f;
  const n = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/* Aceita a janela atual e a anterior. Sem a anterior, quem começa a digitar aos
   29 segundos falha por um motivo que ele não tem como entender — e passa a
   esperar o número virar antes de digitar, o que atrasa todo login. */
function totpConfere(segredoHex, codigo, agora) {
  if (!/^\d{6}$/.test(String(codigo ?? ''))) return false;
  for (const t of [agora, agora - JANELA_TOTP_MS])
    if (timingSafeEqual(Buffer.from(codigoTotp(segredoHex, t)), Buffer.from(String(codigo))))
      return true;
  return false;
}

/* ── A CREDENCIAL ──────────────────────────────────────────────────────────*/

export function definirCredencial(db, { operadorId, senha, segredoTotp: seg, agora = Date.now() }) {
  if (String(senha ?? '').length < 16)
    throw erro(ERRO_ADMIN_AUTH.DADOS,
      'senha de operador curta demais: o painel vê o saldo de todo mundo');
  if (!/^[0-9a-f]{40}$/.test(String(seg ?? '')))
    throw erro(ERRO_ADMIN_AUTH.DADOS, 'segredo do segundo fator ausente ou malformado');
  db.prepare(`UPDATE admin_operadores SET senha_hash = ?, totp_segredo = ?, credencial_em = ?
               WHERE id = ?`).run(hash(senha), seg, agora, operadorId);
  return true;
}

/* ── ENTRAR ────────────────────────────────────────────────────────────────*/

export function entrarOperador(db, { email, senha, codigo, agora = Date.now() }) {
  const op = db.prepare(
    `SELECT * FROM admin_operadores WHERE email = ? AND ativo = 1`)
    .get(String(email ?? '').toLowerCase().trim());

  /* O SCRYPT RODA SEMPRE, mesmo sem operador. Ver `HASH_FANTASMA`. */
  const senhaOk = confere(String(senha ?? ''), op?.senha_hash ?? HASH_FANTASMA);
  const totpOk = op?.totp_segredo ? totpConfere(op.totp_segredo, codigo, agora) : false;

  if (!op || !op.senha_hash || !senhaOk || !totpOk) {
    /* A RECUSA É REGISTRADA, e ela NÃO carrega a senha nem o código. Registro é
       para ser lido por gente; guardar credencial nele faz da auditoria o lugar
       mais fácil de achar uma. */
    registrarAuditoria(db, { operadorId: op?.id ?? null, acao: 'operador.recusado',
      alvo: String(email ?? '').toLowerCase().trim(),
      motivo: !op ? 'sem operador' : !senhaOk ? 'senha' : 'segundo fator', agora });
    /* UMA MENSAGEM SÓ, para os três casos. Distinguir "não existe" de "senha
       errada" transforma a tela de login numa consulta de quem tem acesso — e
       essa lista é curta e valiosa. */
    throw erro(ERRO_ADMIN_AUTH.CREDENCIAL, 'credenciais inválidas');
  }

  /* O CÓDIGO NÃO SE REUSA. Quem vê o número uma vez — por cima do ombro, num
     print de tela — o digitaria dentro da mesma janela de 30 s. */
  const jaUsado = db.prepare(
    `SELECT 1 FROM admin_sessoes WHERE operador_id = ? AND totp_usado = ?`)
    .get(op.id, String(codigo));
  if (jaUsado) {
    registrarAuditoria(db, { operadorId: op.id, acao: 'operador.recusado',
      alvo: op.email, motivo: 'código reusado', agora });
    throw erro(ERRO_ADMIN_AUTH.CREDENCIAL, 'credenciais inválidas');
  }

  const token = randomUUID() + randomBytes(24).toString('hex');
  db.prepare(`INSERT INTO admin_sessoes (token, operador_id, criada_em, expira_em,
                                         girada_em, totp_usado)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(token, op.id, agora, agora + SESSAO_ADMIN_MS, agora, String(codigo));

  registrarAuditoria(db, { operadorId: op.id, acao: 'operador.entrou',
    alvo: op.email, motivo: '', agora });
  return { token, operador: { id: op.id, email: op.email, papel: op.papel },
           expiraEm: agora + SESSAO_ADMIN_MS };
}

/* ── LER E GIRAR ───────────────────────────────────────────────────────────*/

export function lerSessaoAdmin(db, { token, agora = Date.now(), girar = false }) {
  if (typeof token !== 'string' || token.length < 32) return null;
  const s = db.prepare(
    `SELECT s.*, o.email, o.papel, o.ativo FROM admin_sessoes s
       JOIN admin_operadores o ON o.id = s.operador_id
      WHERE s.token = ? AND s.encerrada_em IS NULL`).get(token);
  if (!s || !s.ativo) return null;
  if (agora >= s.expira_em) return null;

  const base = { operadorId: s.operador_id, email: s.email, papel: s.papel,
                 expiraEm: s.expira_em };
  if (!girar || agora - s.girada_em < ROTACAO_ADMIN_MS) return base;

  /* A ROTAÇÃO MATA O ANTERIOR NA HORA. Rotação que deixa o token antigo vivo
     dobra a superfície em vez de reduzi-la — passa a haver dois tokens válidos
     onde havia um. */
  const tokenNovo = randomUUID() + randomBytes(24).toString('hex');
  db.prepare(`UPDATE admin_sessoes SET encerrada_em = ? WHERE token = ?`).run(agora, token);
  db.prepare(`INSERT INTO admin_sessoes (token, operador_id, criada_em, expira_em,
                                         girada_em, totp_usado)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(tokenNovo, s.operador_id, s.criada_em, s.expira_em, agora, s.totp_usado);
  return { ...base, tokenNovo };
}

export function sairOperador(db, { token, agora = Date.now() }) {
  const s = db.prepare(`SELECT operador_id FROM admin_sessoes WHERE token = ?`).get(token);
  db.prepare(`UPDATE admin_sessoes SET encerrada_em = ? WHERE token = ?`).run(agora, token);
  if (s) registrarAuditoria(db, { operadorId: s.operador_id, acao: 'operador.saiu',
    alvo: '', motivo: '', agora });
  return true;
}
