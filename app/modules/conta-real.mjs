/* A CONTA REAL NA TELA — camada 0 (ST-7.2b, fecha a L-189).
 *
 * O modal "Criar treinador / Entrar" era só a fachada local: nenhum módulo do
 * app chamava `/api/auth`, e tudo o que foi construído com conta real
 * (carteira, aposta, posse, telemetria, o Sair que revoga) estava pronto e
 * inalcançável pelo navegador.
 *
 * ── AS DECISÕES MORAM AQUI, E A TELA SÓ PINTA ───────────────────────────
 *
 * Qual modo, o que o formulário exige, o que mandar e o que dizer de volta são
 * funções puras, testáveis em Node — pelo motivo de custo do `CLAUDE.md`. O
 * `navegacao.mjs` só mostra os campos e chama.
 *
 * ── O SERVIDOR DECIDE; A TELA SÓ EVITA IDA E VOLTA ─────────────────────
 *
 * A idade, o e-mail repetido e a conta congelada são do servidor, e a tela não
 * tenta adivinhar nenhum dos três. O que ela confere é forma (e-mail com @,
 * data que existe, senha com o mínimo que o servidor exige) — para o jogador
 * não esperar a rede para descobrir um erro de digitação.
 *
 * ── A MENSAGEM NÃO VIRA CONSULTA ───────────────────────────────────────
 *
 * O servidor devolve a MESMA resposta para senha errada e conta inexistente, e
 * a mesma para cadastro repetido e dado inválido. Traduzir aqui não pode
 * desfazer isso: nenhuma mensagem diz "este e-mail já existe". */

export const SENHA_MINIMA = 12;   // a mesma do `server/auth.mjs`
/* O fim do texto como `(?![\s\S])` e não como cifrão: a peneira de símbolos do
   `test/modulos.mjs` lê o cifrão solto como o `$` do `dom.mjs`. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+(?![\s\S])/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})(?![\s\S])/;

/* O servidor está no ar? Perguntado ao ABRIR o modal, e não no boot: no modo
   local (sem backend) a pergunta é um 404, e a abertura do jogo não pode ter
   404 nenhum (ST-5.1). */
export async function servidorNoAr(api) {
  try {
    const r = await api?.get?.('/saude');
    return !!(r?.ok && r.corpo?.ok === true);
  } catch { return false; }
}

function dataValida(txt, agora) {
  const m = DATA.exec(String(txt ?? ''));
  if (!m) return false;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(a, me - 1, d);
  const volta = new Date(t);
  return volta.getUTCFullYear() === a && volta.getUTCMonth() === me - 1 && volta.getUTCDate() === d
    && a >= 1900 && t <= agora;
}

export function validarConta(modo, c = {}, agora = Date.now()) {
  const falha = msg => ({ ok: false, msg });
  const email = String(c.email ?? '').trim();
  if (!EMAIL.test(email)) return falha('Digite um e-mail válido.');
  if (modo === 'login') return String(c.senha ?? '') ? { ok: true } : falha('Digite a senha.');

  const nome = String(c.nome ?? '').trim();
  if (nome.length < 2) return falha('Escolha um nome de treinador (2 letras ou mais).');
  if (String(c.senha ?? '').length < SENHA_MINIMA) return falha(`A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`);
  if (!dataValida(c.nascimento, agora)) return falha('Confira a data de nascimento.');
  if (!c.declarou) return falha('É preciso confirmar a declaração acima.');
  return { ok: true };
}

/* Campo a campo, como a rota lê: espalhar o formulário mandaria o que o
   servidor não pediu. */
export const corpoDoCadastro = c => ({
  username: String(c.nome ?? '').trim().slice(0, 18),
  email: String(c.email ?? '').trim().toLowerCase(),
  senha: String(c.senha ?? ''),
  nascimento: String(c.nascimento ?? ''),
});

export function mensagemDaResposta(r, modo) {
  if (r?.indisponivel) return 'O servidor não respondeu. Tente de novo em instantes.';
  const codigo = r?.corpo?.codigo;
  if (codigo === 'muitas_tentativas' || r?.status === 429) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (modo === 'login') return 'E-mail ou senha não conferem.';
  if (codigo === 'idade_minima') return 'É preciso ter 18 anos ou mais para criar uma conta.';
  if (/senha curta/.test(r?.corpo?.erro ?? '')) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`;
  return 'Não foi possível concluir o cadastro com esses dados.';
}

/* Manda, e devolve `{ ok, msg }`. A sessão que vier na resposta a `api` já
   guarda sozinha (`api.mjs`) — aqui não se toca em token. */
export async function enviarConta(api, modo, campos, agora = Date.now()) {
  const v = validarConta(modo, campos, agora);
  if (!v.ok) return v;
  let r;
  try {
    r = modo === 'login'
      ? await api.post('/api/auth/entrar', { email: String(campos.email).trim().toLowerCase(), senha: String(campos.senha) })
      : await api.post('/api/auth/cadastrar', corpoDoCadastro(campos));
  } catch { r = { ok: false, indisponivel: true }; }
  return r?.ok && r.corpo?.sessao ? { ok: true } : { ok: false, msg: mensagemDaResposta(r, modo) };
}
