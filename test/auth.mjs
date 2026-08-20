/* Q1/Q6 · AUTENTICAÇÃO — cadastro, sessão e a barreira de idade (F1.3).
 *
 * O QUE ESTE ARQUIVO GUARDA, e por que cada coisa está aqui:
 *
 *   IDADE (§28.2)  — a barreira é declaratória na V1, e é isso que a torna
 *                    frágil: o único jeito de ela valer alguma coisa é a data
 *                    ser IMUTÁVEL e a conta bloqueada ser CONGELADA, não
 *                    apagada. Conta apagada é barreira que se contorna
 *                    recadastrando com o mesmo e-mail, que é literalmente o
 *                    caminho que a Spec manda fechar.
 *
 *   Q6             — enumeração de contas, tempo constante entre usuário que
 *                    existe e usuário que não existe, fixação de sessão, força
 *                    bruta, token de recuperação reutilizável, custo do hash.
 *
 * O TESTE DE TEMPO É O MAIS FRÁGIL DA SUÍTE, e ele está aqui de propósito com a
 * margem larga: o que ele pega é diferença de ORDEM DE GRANDEZA — o caso em que
 * o servidor nem calcula o hash quando o usuário não existe, e responde em
 * microssegundos contra dezenas de milissegundos. Um atacante mede isso com
 * cem requisições. Ele NÃO promete tempo constante criptográfico; prometer isso
 * num teste de suíte seria mentira que vira instabilidade.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import {
  cadastrar, entrar, idadeEm, ERRO_AUTH, abrirSessao, lerSessao,
  pedirRecuperacao, usarRecuperacao, IDADE_MINIMA,
} from '../server/auth.mjs';

const novo = () => { const db = abrirBanco(':memory:'); migrar(db); return db; };
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Uma data de nascimento com a idade pedida, relativa a "agora" fixo. O agora é
   parâmetro porque teste que depende do relógio da máquina é teste que falha em
   janeiro — foi o D-005. */
const AGORA = Date.UTC(2026, 0, 15);
function nascimentoCom(anos, agora = AGORA) {
  const d = new Date(agora);
  d.setUTCFullYear(d.getUTCFullYear() - anos);
  return d.toISOString().slice(0, 10);
}

const bom = (extra = {}) => ({
  username: 'jogador', email: 'jogador@exemplo.test', senha: 'senha-longa-o-bastante-1',
  nascimento: nascimentoCom(30), agora: AGORA, ...extra,
});

export function suite() {
  const s = criarSuite('auth');

  /* --- a conta de idade, que é aritmética e merece ser pura --------------- */

  s.teste('a idade conta o aniversário que ainda não veio', () => {
    /* Nasceu em 20/01, hoje é 15/01: ainda NÃO fez aniversário este ano.
       Contar só a diferença de anos daria 18 e deixaria entrar alguém de 17. */
    igual(idadeEm('2008-01-20', AGORA), 17, 'aniversário futuro contado como já ocorrido');
    igual(idadeEm('2008-01-15', AGORA), 18, 'aniversário HOJE devia contar');
    igual(idadeEm('2008-01-14', AGORA), 18, 'aniversário ontem devia contar');
  });

  s.teste('a idade lida com 29 de fevereiro', () => {
    /* Nascido em 29/02/2008; em 28/02/2026 ainda não fez, em 01/03 fez. */
    igual(idadeEm('2008-02-29', Date.UTC(2026, 1, 28)), 17, '29/fev antes do dia');
    igual(idadeEm('2008-02-29', Date.UTC(2026, 2, 1)), 18, '29/fev depois do dia');
  });

  /* --- a barreira de idade (§28.2) --------------------------------------- */

  s.teste('cadastro abaixo da idade mínima é RECUSADO', () => {
    const db = novo();
    const e = recusa(() => cadastrar(db, bom({ nascimento: nascimentoCom(IDADE_MINIMA - 1) })));
    ok(e, `alguém com ${IDADE_MINIMA - 1} anos foi cadastrado`);
    igual(e.codigo, ERRO_AUTH.IDADE_MINIMA, `código veio "${e.codigo}"`);
  });

  s.teste('cadastro exatamente na idade mínima é ACEITO', () => {
    const db = novo();
    const u = cadastrar(db, bom({ nascimento: nascimentoCom(IDADE_MINIMA) }));
    ok(u && u.id, 'a fronteira exata foi recusada — regra que erra o próprio limite');
  });

  s.teste('a data de nascimento é IMUTÁVEL depois do cadastro', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const e = recusa(() => db.prepare(`UPDATE users SET birth_date=? WHERE id=?`)
      .run(nascimentoCom(40), u.id));
    ok(e, 'a data de nascimento foi alterada. O §28.2 exige imutabilidade — sem ' +
          'ela, quem foi bloqueado por idade só precisa editar o campo.');
  });

  /* A REGRA MAIS FÁCIL DE ERRAR DO CAPÍTULO 28.
     "Conta bloqueada por idade não é apagada — é congelada, para que a barreira
     não seja contornada recriando cadastro." Apagar parece mais limpo, e é o
     contrário: apagar É o contorno. */
  s.teste('conta bloqueada por idade é CONGELADA, e o e-mail não pode ser reusado', () => {
    const db = novo();
    /* Cadastro de menor: recusado, mas o registro do bloqueio FICA. */
    recusa(() => cadastrar(db, bom({ nascimento: nascimentoCom(IDADE_MINIMA - 2) })));
    const linha = db.prepare(`SELECT status FROM users WHERE email=?`).get(bom().email);
    ok(linha, 'nenhum registro ficou — o e-mail está livre para recadastro, que é ' +
              'exatamente o contorno que o §28.2 manda fechar');
    igual(linha.status, 'congelado', `o status ficou "${linha.status}", não "congelado"`);

    /* E recadastrar com o mesmo e-mail, agora mentindo a idade, não passa. */
    const e = recusa(() => cadastrar(db, bom({ nascimento: nascimentoCom(30) })));
    ok(e, 'o mesmo e-mail foi recadastrado com idade diferente — a barreira caiu');
    igual(e.codigo, ERRO_AUTH.CONTA_CONGELADA, `código veio "${e.codigo}"`);
  });

  /* --- login -------------------------------------------------------------- */

  s.teste('entra com a senha certa e não entra com a errada', () => {
    const db = novo();
    cadastrar(db, bom());
    ok(entrar(db, { email: bom().email, senha: bom().senha }), 'senha certa recusada');
    ok(recusa(() => entrar(db, { email: bom().email, senha: 'outra-coisa' })),
      'senha errada aceita');
  });

  s.teste('conta congelada não entra, mesmo com a senha certa', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    db.prepare(`UPDATE users SET status='congelado' WHERE id=?`).run(u.id);
    const e = recusa(() => entrar(db, { email: bom().email, senha: bom().senha }));
    ok(e, 'conta congelada entrou');
  });

  /* --- Q6 ----------------------------------------------------------------- */

  /* ENUMERAÇÃO DE CONTAS. "E-mail não encontrado" contra "senha incorreta"
     transforma a tela de login numa consulta: quem quiser saber se um e-mail
     tem conta aqui, pergunta. */
  s.teste('a mensagem de erro NÃO distingue usuário inexistente de senha errada', () => {
    const db = novo();
    cadastrar(db, bom());
    const a = recusa(() => entrar(db, { email: bom().email, senha: 'errada' }));
    const b = recusa(() => entrar(db, { email: 'ninguem@exemplo.test', senha: 'errada' }));
    igual(a.codigo, b.codigo,
      `códigos diferentes ("${a.codigo}" e "${b.codigo}") revelam quais e-mails têm conta`);
    igual(a.message, b.message, 'as mensagens diferem e revelam a mesma coisa');
  });

  /* O TEMPO TAMBÉM ENUMERA, e é o vazamento que sobrevive a mensagens iguais.
     Margem larga de propósito: o alvo é ordem de grandeza, não tempo constante
     criptográfico — ver a nota no cabeçalho. */
  s.teste('usuário inexistente custa o mesmo tempo que senha errada', () => {
    const db = novo();
    cadastrar(db, bom());
    /* MEDIANA DE SETE RODADAS, E NÃO UMA SOMA.
     *
     * A primeira versão somava cinco tentativas e comparava os dois totais. Ela
     * reprovou UMA vez em nove execuções — e só quando a sabotagem rodava em
     * paralelo, ocupando os quatro núcleos. Um pico de escalonamento numa das
     * duas medidas bastava.
     *
     * Teste instável é pior que teste vermelho: o vermelho tem endereço, o
     * instável escolhe quando aparecer. A mediana descarta o pico, e a margem
     * segue larga porque o alvo é ORDEM DE GRANDEZA — a sabotagem que este
     * teste existe para pegar (pular o hash quando o e-mail não existe) produz
     * uma diferença de cem vezes, não de cinco. */
    const medirUma = alvo => {
      const t0 = process.hrtime.bigint();
      recusa(() => entrar(db, { email: alvo, senha: 'errada' }));
      return Number(process.hrtime.bigint() - t0) / 1e6;
    };
    const mediana = alvo => {
      const v = Array.from({ length: 7 }, () => medirUma(alvo)).sort((a, b) => a - b);
      return v[3];
    };
    const existe = mediana(bom().email);
    const naoExiste = mediana('ninguem@exemplo.test');
    const razao = Math.max(existe, naoExiste) / Math.max(1e-3, Math.min(existe, naoExiste));
    ok(razao < 8,
      `usuário inexistente respondeu ${razao.toFixed(1)}x mais rápido/devagar (mediana de 7) ` +
      `(${existe.toFixed(1)}ms contra ${naoExiste.toFixed(1)}ms). O servidor está ` +
      `pulando o cálculo do hash quando o e-mail não existe, e um atacante mede ` +
      `isso com cem requisições.`);
  });

  s.teste('o hash de senha tem custo, e não é hash cru', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const h = db.prepare(`SELECT password_hash FROM users WHERE id=?`).get(u.id).password_hash;
    ok(!h.includes(bom().senha), 'a senha está no campo em claro');
    ok(h.length >= 60, `o hash tem ${h.length} caracteres — curto demais para carregar sal e parâmetros`);
    ok(/scrypt|argon2|bcrypt/i.test(h),
      `o hash não declara o algoritmo ("${h.slice(0, 20)}…"). SHA-256 puro de senha ` +
      `é uma tabela arco-íris esperando acontecer.`);
    /* DUAS SENHAS IGUAIS DÃO HASHES DIFERENTES — é o sal fazendo o trabalho. */
    const u2 = cadastrar(db, bom({ username: 'outro', email: 'outro@exemplo.test' }));
    const h2 = db.prepare(`SELECT password_hash FROM users WHERE id=?`).get(u2.id).password_hash;
    ok(h !== h2, 'a mesma senha gerou o mesmo hash — não há sal por usuário');
  });

  /* --- sessão ------------------------------------------------------------- */

  s.teste('a sessão vale, e um token adulterado não vale', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const t = abrirSessao({ segredo: 'x'.repeat(64), userId: u.id, agora: AGORA });
    const lido = lerSessao({ segredo: 'x'.repeat(64), token: t, agora: AGORA });
    igual(lido.userId, u.id, 'a sessão não devolveu o usuário');
    /* Trocar UM caractere do corpo tem que invalidar. */
    const adulterado = t.replace(/^(.{5})./, '$1Z');
    ok(!lerSessao({ segredo: 'x'.repeat(64), token: adulterado, agora: AGORA }),
      'token adulterado foi aceito — a assinatura não está sendo conferida');
  });

  s.teste('a sessão assinada com OUTRO segredo não vale', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const t = abrirSessao({ segredo: 'a'.repeat(64), userId: u.id, agora: AGORA });
    ok(!lerSessao({ segredo: 'b'.repeat(64), token: t, agora: AGORA }),
      'sessão de outro segredo aceita — em produção isso é sessão forjável');
  });

  s.teste('a sessão EXPIRA', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const t = abrirSessao({ segredo: 'x'.repeat(64), userId: u.id, agora: AGORA, duracaoMs: 1000 });
    ok(lerSessao({ segredo: 'x'.repeat(64), token: t, agora: AGORA + 500 }), 'expirou cedo demais');
    ok(!lerSessao({ segredo: 'x'.repeat(64), token: t, agora: AGORA + 2000 }),
      'sessão vencida continua valendo — token sem prazo é token eterno');
  });

  /* ESTE TESTE É ESTÁTICO, E A LIMITAÇÃO É DECLARADA.
   *
   * Ele nasceu de uma sabotagem que passou: trocar `timingSafeEqual` por `===`
   * na conferência da assinatura NÃO muda o comportamento — os dois rejeitam o
   * token adulterado. A diferença é de nanossegundos por byte, e um teste de
   * suíte que dissesse medi-la seria instabilidade com cara de rigor.
   *
   * Então ele testa a DECLARAÇÃO, de propósito, e não pretende mais que isso:
   * prova que a comparação em tempo constante está escrita, não que ela é
   * constante. É a exceção à regra do projeto ("testar a declaração não testa a
   * peça"), e ela existe porque a peça aqui não é observável no tamanho de uma
   * suíte. Um dia em que houver banco de medição, este teste muda de forma. */
  s.teste('as comparações de segredo usam tempo constante', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('../server/auth.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    /* Duas: a da senha e a da assinatura de sessão. Uma só significa que a
       outra está comparando com `===`. */
    const quantas = (txt.match(/timingSafeEqual\s*\(/g) || []).length;
    ok(quantas >= 2,
      `só ${quantas} comparação(ões) em tempo constante em server/auth.mjs. ` +
      `São duas: o hash da senha e a assinatura da sessão. Comparar assinatura ` +
      `com === vaza, byte a byte, quantos caracteres o atacante já acertou.`);
    ok(!/assinatura\s*===\s*esperada|esperada\s*===\s*assinatura/.test(txt),
      'a assinatura da sessão está sendo comparada com ===');
  });

  /* --- recuperação --------------------------------------------------------- */

  s.teste('o token de recuperação é de USO ÚNICO', () => {
    const db = novo();
    const u = cadastrar(db, bom());
    const t = pedirRecuperacao(db, { email: bom().email, agora: AGORA });
    ok(usarRecuperacao(db, { token: t, senhaNova: 'nova-senha-longa-1', agora: AGORA }),
      'o token não funcionou nem uma vez');
    ok(recusa(() => usarRecuperacao(db, { token: t, senhaNova: 'terceira-senha-1', agora: AGORA })),
      'o token de recuperação foi reusado — quem interceptar o e-mail antigo entra depois');
  });

  s.teste('o token de recuperação EXPIRA', () => {
    const db = novo();
    cadastrar(db, bom());
    const t = pedirRecuperacao(db, { email: bom().email, agora: AGORA, duracaoMs: 1000 });
    ok(recusa(() => usarRecuperacao(db, { token: t, senhaNova: 'nova-senha-longa-1',
      agora: AGORA + 5000 })), 'token de recuperação vencido continua valendo');
  });

  /* PEDIR RECUPERAÇÃO PARA E-MAIL QUE NÃO EXISTE NÃO PODE DIZER ISSO — é a
     mesma enumeração do login, entrando por outra porta. */
  s.teste('pedir recuperação de e-mail inexistente não revela nada', () => {
    const db = novo();
    cadastrar(db, bom());
    const e = recusa(() => pedirRecuperacao(db, { email: 'ninguem@exemplo.test', agora: AGORA }));
    ok(!e, 'pedir recuperação de e-mail inexistente lançou erro, e o erro é a resposta ' +
           'à pergunta "esse e-mail tem conta aqui?"');
  });

  /* --- força bruta --------------------------------------------------------- */

  s.teste('tentativas seguidas erradas passam a ser recusadas', () => {
    const db = novo();
    cadastrar(db, bom());
    let bloqueou = false;
    for (let i = 0; i < 20; i++) {
      const e = recusa(() => entrar(db, { email: bom().email, senha: 'errada', agora: AGORA + i }));
      if (e && e.codigo === ERRO_AUTH.MUITAS_TENTATIVAS) { bloqueou = true; break; }
    }
    ok(bloqueou, 'vinte tentativas erradas seguidas e nenhuma recusa por excesso — ' +
                 'a senha do jogador vale o tempo de um laço');
  });

  s.teste('o bloqueio por tentativas NÃO impede o dono de entrar depois da espera', () => {
    const db = novo();
    cadastrar(db, bom());
    for (let i = 0; i < 20; i++)
      recusa(() => entrar(db, { email: bom().email, senha: 'errada', agora: AGORA + i }));
    /* Passada a janela, a senha certa entra. Bloqueio que não solta é negação de
       serviço contra o próprio dono da conta, feita por quem souber o e-mail. */
    ok(entrar(db, { email: bom().email, senha: bom().senha, agora: AGORA + 60 * 60 * 1000 }),
      'o dono da conta continua bloqueado uma hora depois — quem sabe o e-mail ' +
      'derruba a conta de qualquer um');
  });

  return s;
}
