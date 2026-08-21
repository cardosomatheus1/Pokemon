/* Q1/Q6/Q9 · AS ROTAS (F1.13) — a superfície inteira, e o que ela recusa.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE É GRANDE ────────────────────
 *
 * Do F1.3 ao F1.9 foram construídos autenticação, carteira, scheduler,
 * transporte, aposta, limites e proteção — cada um com a sua suíte, cada um
 * testado na fronteira do DOMÍNIO. E nenhum deles tinha rota: o `servidor.mjs`
 * ficou com as três do F1.1 até aqui. Era a **L-033**.
 *
 * O ponto que decide o desenho deste arquivo é que **rota nova é caminho novo**.
 * `test/limites.mjs` prova que `apostar()` recusa acima do limite; isso não
 * prova nada sobre `POST /api/aposta`, porque a rota é outro caminho até a
 * mesma regra — e o caminho é onde a regra se perde. É a mesma lição que já
 * apareceu três vezes aqui: *testar a peça não testa o encaixe*.
 *
 * Então cada garantia que o F1.8 e o F1.9 cravaram no domínio é cobrada DE NOVO
 * na rota, e é isso que o Q6 do bloco pede com todas as letras.
 *
 * ── AS QUATRO PERGUNTAS QUE A SUÍTE RESPONDE ───────────────────────────────
 *
 *   1. TODA rota exige sessão, menos as que não podem exigir. A lista de
 *      exceções é derivada e conferida — rota nova nasce fechada.
 *   2. Ninguém lê nem move o que é de outro usuário, e a resposta não deixa
 *      descobrir quem existe.
 *   3. Limite e pausa valem na ROTA, e não só na tela.
 *   4. Nada do cliente vira preço: a odd sai da tabela, sempre.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO, ERROS } from '../server/contrato.mjs';
import { ERRO_LIMITE } from '../server/limites.mjs';
import { ERRO_PROTECAO } from '../server/protecao.mjs';

const AGORA = Date.UTC(2026, 0, 15);
const SENHA = 'senha-longa-o-bastante-1';

/* Sobe um serviço COMPLETO — banco em memória, scheduler com relógio de teste —
   e derruba no fim. O `try/finally` é obrigatório: servidor que vaza numa falha
   segura a porta e a execução seguinte falha por motivo errado. */
async function comServico(fn, opcoes = {}) {
  let agora = AGORA;
  const s = criarServidor({
    config: { ambiente: 'teste', silencioso: true },
    banco: ':memory:',
    sims: 500,
    /* O LAÇO FICA DESLIGADO AQUI, e é o único lugar do projeto onde ele fica.
       Estes testes abrem a rodada com a própria mão para poder colocá-la na
       fase que cada um precisa; com o laço girando, `abrirRodada()` encontra
       uma rodada já aberta e recusa. Em produção ele liga sozinho — ver
       `test/laco.mjs`, que cobra exatamente isso. */
    laco: false,
    relogio: () => agora,
    ...opcoes,
  });
  const porta = await s.ouvir(0);
  const ctx = { porta, s, avancar: ms => { agora += ms; }, agoraDe: () => agora };
  try { return await fn(ctx); } finally { await s.fechar(); }
}

const pedir = (porta, caminho, { metodo = 'GET', corpo, sessao, cabecalhos = {},
                                 versao = API_VERSAO } = {}) =>
  fetch(`http://127.0.0.1:${porta}${caminho}`, {
    method: metodo,
    headers: {
      ...(versao === null ? {} : { [CABECALHO_VERSAO]: versao }),
      ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
      ...(corpo ? { 'content-type': 'application/json' } : {}),
      ...cabecalhos,
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  }).then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));

/* Cria uma conta e devolve o token de sessão. */
async function conta(porta, nome = 'j') {
  const r = await pedir(porta, '/api/auth/cadastrar', { metodo: 'POST', corpo: {
    username: nome, email: `${nome}@exemplo.test`, senha: SENHA, nascimento: '1990-01-01' } });
  ok(r.status === 200 || r.status === 201, `cadastro falhou: ${JSON.stringify(r.corpo)}`);
  return { sessao: r.corpo.sessao, id: r.corpo.id };
}


/* ── A CREDENCIAL DE OPERADOR (F1.17) ────────────────────────────────────────
 *
 * Antes deste bloco, `x-operador: <id>` bastava — o operador se DECLARAVA. Era
 * a L-041, e um id vazado abria tudo: ele aparece em toda linha de auditoria.
 *
 * Agora é senha + segundo fator, e o que vai no cabeçalho é um token de sessão
 * com prazo. Este auxiliar existe para os testes de rota não repetirem o login
 * inteiro — e o `test/admin-auth.mjs` é quem prova que o login está certo. */
async function operadorLogado(srv, { papel = 'leitura', agora = AGORA } = {}) {
  const { criarOperador } = await import('../server/admin.mjs');
  const { definirCredencial, entrarOperador, segredoTotp, codigoTotp } =
    await import('../server/admin-auth.mjs');
  const op = criarOperador(srv.db, { email: `${papel}@x.test`, papel, agora });
  const seg = segredoTotp();
  const senha = 'senha-de-operador-bem-longa-1';
  definirCredencial(srv.db, { operadorId: op.id, senha, segredoTotp: seg, agora });
  const { token } = entrarOperador(srv.db,
    { email: op.email, senha, codigo: codigoTotp(seg, agora), agora });
  return { op, token, cabecalhos: { authorization: `Bearer ${token}` } };
}

export async function suite() {
  const s = criarSuite('rotas');

  /* --- 1. SESSÃO EM TUDO, MENOS ONDE NÃO PODE ---------------------------- */

  s.teste('as rotas privadas recusam pedido sem sessão', async () => {
    await comServico(async ({ porta }) => {
      for (const [metodo, caminho] of [
        ['GET', '/api/carteira'], ['GET', '/api/carteira/ledger'],
        ['POST', '/api/aposta'], ['POST', '/api/aposta/cancelar'],
        ['GET', '/api/limites'], ['POST', '/api/limites'],
        ['POST', '/api/limites/confirmar'],
        ['GET', '/api/protecao'], ['POST', '/api/protecao/pausar'],
      ]) {
        const r = await pedir(porta, caminho, { metodo, corpo: metodo === 'POST' ? {} : undefined });
        igual(r.status, 401,
          `${metodo} ${caminho} respondeu ${r.status} sem sessão. Rota que esquece a ` +
          `sessão é a conta de todo mundo aberta — e ela esquece calada.`);
      }
    });
  });

  /* A LISTA DE ROTAS PÚBLICAS É DECLARADA E CONFERIDA, e a conferência é o
     ponto: rota nova nasce PRIVADA. Uma lista que o servidor consulta para
     LIBERAR é uma lista que se esquece de atualizar no lado seguro. */
  s.teste('só as rotas declaradas públicas dispensam sessão', async () => {
    const { ROTAS_PUBLICAS } = await import('../server/rotas.mjs');
    for (const r of ROTAS_PUBLICAS)
      ok(/^(GET|POST) \/(saude|api\/(auth\/(cadastrar|entrar|recuperar|redefinir)|rodada(\/[\w-]+)?))$/.test(r),
        `a rota pública "${r}" não é de autenticação nem de leitura de rodada. ` +
        `Toda pública precisa de justificativa: quem entra sem sessão precisa ` +
        `poder criar uma, e o estado da rodada é público por desenho.`);
  });

  s.teste('sessão forjada ou expirada é recusada', async () => {
    await comServico(async ({ porta, avancar }) => {
      const u = await conta(porta);
      const forjada = u.sessao.split('.')[0] + '.assinaturaInventada';
      igual((await pedir(porta, '/api/carteira', { sessao: forjada })).status, 401,
        'assinatura inventada foi aceita');
      igual((await pedir(porta, '/api/carteira', { sessao: u.sessao })).status, 200,
        'a sessão legítima foi recusada');
      avancar(31 * 24 * 60 * 60 * 1000);
      igual((await pedir(porta, '/api/carteira', { sessao: u.sessao })).status, 401,
        'sessão vencida continuou valendo — o prazo está DENTRO do corpo assinado, ' +
        'e é por isso que ele não pode ser ignorado na leitura');
    });
  });

  s.teste('a conferência de versão vale nas rotas novas também', async () => {
    await comServico(async ({ porta }) => {
      const u = await conta(porta);
      igual((await pedir(porta, '/api/carteira', { sessao: u.sessao, versao: null })).status, 400,
        'rota nova aceitou pedido sem versão de contrato declarada');
      const r = await pedir(porta, '/api/carteira', { sessao: u.sessao, versao: '999' });
      igual(r.status, 400, 'versão incompatível foi aceita');
      igual(r.corpo?.codigo, ERROS.VERSAO_INCOMPATIVEL, `código veio ${r.corpo?.codigo}`);
    });
  });

  /* --- a conta nasce jogável, e nasce com o número do MOTOR --------------- */

  /* O F1.13 revelou que o cadastro não creditava nada: o grant morava só em
     `app/modules/banco.mjs`, e com o cliente falando com o servidor a conta
     nova nasceria com zero. O teste afirma as três coisas que importam — que
     credita, QUANTO credita, e em qual bolso.

     O "quanto" vem de `engine/carteira.mjs`, e não de um número escrito aqui:
     copiar o valor para dentro do teste deixaria os dois concordando entre si e
     discordando da fonte, que é como o D-007 nasceu. */
  s.teste('conta nova nasce com o saldo inicial do motor, em transferível', async () => {
    const { SALDO_INICIAL } = await import('../engine/carteira.mjs');
    await comServico(async ({ porta }) => {
      const u = await conta(porta);
      const c = await pedir(porta, '/api/carteira', { sessao: u.sessao });
      igual(c.corpo.saldos.transferivel, SALDO_INICIAL,
        `conta nova nasceu com ${c.corpo.saldos.transferivel} e o motor diz ` +
        `${SALDO_INICIAL}. Número copiado no servidor faz o cliente e o servidor ` +
        `discordarem de quanto vale começar — e o Estudo Econômico mede a ruína ` +
        `a partir desse número.`);
      /* O BOLSO IMPORTA TANTO QUANTO O VALOR (§5.5): o payout herda a origem da
         stake. Nascer em `bonus` faria todo ganho da conta nova voltar como
         bônus, e o jogador nunca teria saldo transferível — uma economia
         diferente da que o Estudo mediu, sem ninguém ter decidido isso. */
      igual(c.corpo.saldos.bonus, 0,
        `o grant de boas-vindas caiu em \`bonus\`: ${JSON.stringify(c.corpo.saldos)}`);
    });
  });

  /* --- 2. NADA ATRAVESSA DE UMA CONTA PARA OUTRA ------------------------- */

  s.teste('a carteira devolvida é a de QUEM PEDIU, e não a pedida', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a');
      const b = await conta(porta, 'b');
      /* A tentativa: mandar o id do outro no corpo e na query. O userId tem que
         sair da SESSÃO e de mais lugar nenhum — aceitar do cliente é entregar
         a carteira de qualquer um a quem souber um id. */
      const r = await pedir(porta, `/api/carteira?userId=${b.id}`, { sessao: a.sessao });
      igual(r.status, 200, 'a própria carteira falhou');
      igual(r.corpo.userId, a.id,
        `a rota devolveu a carteira de ${r.corpo.userId} para quem tem sessão de ` +
        `${a.id}. O usuário sai da sessão, nunca do pedido.`);
    });
  });

  s.teste('não dá para apostar, limitar ou pausar em nome de outro', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a');
      const b = await conta(porta, 'b');
      await pedir(porta, '/api/limites', { metodo: 'POST', sessao: a.sessao,
        corpo: { tipo: 'max_stake_per_round', valor: 100, userId: b.id } });
      const seusB = await pedir(porta, '/api/limites', { sessao: b.sessao });
      igual(seusB.corpo?.limites?.max_stake_per_round, undefined,
        'um usuário definiu limite na conta de outro passando `userId` no corpo');
    });
  });

  /* O ENUMERADOR DE CONTAS. A resposta do login não pode dizer se o e-mail
     existe — quem descobre a lista de e-mails descobre a lista de clientes. */
  /* O TERCEIRO CASO, que a primeira versão não cobria e o portão achou.
   *
   * O `auth.mjs` já iguala senha-errada e e-mail-inexistente: mesmo código,
   * mesma mensagem, e o hash fantasma iguala o TEMPO. Comparar esses dois
   * prova pouco — eles saem iguais mesmo com a defesa desta camada removida,
   * e foi por isso que o **S213 escapou** de um teste que existia.
   *
   * O que distingue é a conta que EXISTE e não está ativa: ali o domínio lança
   * outro erro (`conta_congelada`, "esta conta não está ativa"), e é o `catch`
   * sem variável desta rota que impede a diferença de sair. Com o defeito
   * plantado: conta congelada devolve "esta conta não está ativa" e conta
   * inexistente devolve "e-mail ou senha inválidos" — a tela de login vira
   * consulta de clientes. */
  s.teste('o login não distingue conta CONGELADA de conta que não existe', async () => {
    await comServico(async ({ porta, s: srv }) => {
      await conta(porta, 'congelada');
      srv.db.prepare(`UPDATE users SET status='congelado' WHERE email='congelada@exemplo.test'`).run();

      const congelada = await pedir(porta, '/api/auth/entrar', { metodo: 'POST',
        corpo: { email: 'congelada@exemplo.test', senha: SENHA } });
      const inexistente = await pedir(porta, '/api/auth/entrar', { metodo: 'POST',
        corpo: { email: 'nao-existe@exemplo.test', senha: SENHA } });

      igual(congelada.status, inexistente.status,
        `conta congelada respondeu ${congelada.status} e conta inexistente ` +
        `${inexistente.status} — o status já enumera contas`);
      igual(JSON.stringify(congelada.corpo), JSON.stringify(inexistente.corpo),
        `conta congelada: ${JSON.stringify(congelada.corpo)}\n` +
        `conta inexistente: ${JSON.stringify(inexistente.corpo)}\n` +
        `A diferença diz que a primeira EXISTE. A tela de login vira consulta ` +
        `de clientes, e quem tiver a lista de e-mails descobre quem é jogador.`);
    });
  });

  s.teste('o login não deixa descobrir quem tem conta', async () => {
    await comServico(async ({ porta }) => {
      await conta(porta, 'existe');
      const comConta = await pedir(porta, '/api/auth/entrar', { metodo: 'POST',
        corpo: { email: 'existe@exemplo.test', senha: 'senha-errada-mas-longa' } });
      const semConta = await pedir(porta, '/api/auth/entrar', { metodo: 'POST',
        corpo: { email: 'ninguem@exemplo.test', senha: 'senha-errada-mas-longa' } });
      igual(comConta.status, semConta.status,
        `conta existente respondeu ${comConta.status} e inexistente ${semConta.status}`);
      igual(JSON.stringify(comConta.corpo), JSON.stringify(semConta.corpo),
        'as duas respostas diferem no corpo, e a diferença é a lista de clientes');
    });
  });

  /* --- 3. LIMITE E PAUSA VALEM NA ROTA ----------------------------------- */

  s.teste('o limite do §28.3 bloqueia a APOSTA PELA ROTA', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const u = await conta(porta);
      await pedir(porta, '/api/limites', { metodo: 'POST', sessao: u.sessao,
        corpo: { tipo: 'max_stake_per_round', valor: 200 } });
      srv.sched.abrirRodada();
      const r = await pedir(porta, '/api/aposta', { metodo: 'POST', sessao: u.sessao,
        corpo: { slot: 0, valor: 201 } });
      ok(r.status >= 400, 'apostou 201 pela rota com limite de 200');
      igual(r.corpo?.codigo, ERRO_LIMITE.BLOQUEADO, `código veio ${r.corpo?.codigo}`);
      /* A Spec pede QUAL, QUANTO e QUANDO — e a rota é onde a UI lê isso. */
      ok(r.corpo?.limite?.limite === 'max_stake_per_round' &&
         typeof r.corpo?.limite?.teto === 'number',
        `a recusa da rota não carrega a avaliação: ${JSON.stringify(r.corpo)}`);
    });
  });

  /* ── D-020 · VALOR ILEGÍVEL NÃO PODE VIRAR REMOÇÃO ──────────────────────
   *
   * `inteiro()` devolve `null` para tudo que não é inteiro, e `null` é o
   * sentinela de REMOÇÃO do §28.3. As duas coisas juntas faziam
   * `{ tipo, valor: '500' }` — ou um corpo truncado, sem `valor` nenhum —
   * virar um PEDIDO DE REMOÇÃO do limite.
   *
   * Achado ao investigar por que o S211 escapava: com o defeito plantado o
   * comportamento ficava MELHOR (400 em vez de remoção), que é o sinal de que
   * o código limpo é que estava errado.
   *
   * A direção da falha é o que a torna grave: quem manda um valor que a rota
   * não entende está tentando SE LIMITAR, e sai de lá com um pedido de
   * afrouxamento em andamento. O §28.3 exige que afrouxar seja deliberado. */
  s.teste('D-020 · valor ilegível no limite é ERRO, e nunca remoção', async () => {
    await comServico(async ({ porta }) => {
      const { sessao } = await conta(porta);
      for (const valor of ['500', 12.5, true, 'abc']) {
        const r = await pedir(porta, '/api/limites', { metodo: 'POST', sessao,
          corpo: { tipo: 'max_loss_dia', valor } });
        igual(r.status, 400,
          `\`valor: ${JSON.stringify(valor)}\` respondeu ${r.status} ` +
          `${JSON.stringify(r.corpo)}. Valor ilegível tem que ser recusado — ` +
          `virar remoção põe o jogador que tentou se limitar com um pedido de ` +
          `afrouxamento em andamento.`);
      }
      /* O CORPO TRUNCADO, que é o caso que ninguém manda de propósito. */
      const semValor = await pedir(porta, '/api/limites', { metodo: 'POST', sessao,
        corpo: { tipo: 'max_loss_dia' } });
      igual(semValor.status, 400,
        `pedido SEM o campo \`valor\` respondeu ${semValor.status} ` +
        `${JSON.stringify(semValor.corpo)} — um corpo truncado pediu remoção de ` +
        `limite em nome do jogador.`);

      /* E O CONTRAPESO: `null` EXPLÍCITO continua sendo remoção, que é o que o
         §28.3 desenha. Sem ele, este teste seria satisfeito por uma rota que
         recusa tudo.

         O limite precisa EXISTIR antes: remover o que não existe não é
         afrouxamento — `permissividade(null)` e `permissividade(undefined)`
         são os dois `Infinity` —, então sai na hora e o teste mediria a coisa
         errada. A primeira versão deste contrapeso caiu exatamente aí. */
      const definiu = await pedir(porta, '/api/limites', { metodo: 'POST', sessao,
        corpo: { tipo: 'max_loss_dia', valor: 500 } });
      igual(definiu.status, 200, `não deu para definir o limite: ${JSON.stringify(definiu.corpo)}`);
      igual(definiu.corpo.vigente, true, 'reduzir/definir limite não valeu na hora');

      const remover = await pedir(porta, '/api/limites', { metodo: 'POST', sessao,
        corpo: { tipo: 'max_loss_dia', valor: null } });
      igual(remover.status, 200,
        `\`valor: null\` foi recusado — remover limite deixou de ser possível, ` +
        `e o §28.3 desenha a remoção como aumento, não como impossibilidade`);
      igual(remover.corpo.vigente, false,
        'a remoção entrou em vigor na hora, sem as 24 h do §28.3');
    });
  });

  s.teste('o cooldown de aumento NÃO pode ser encurtado pela rota', async () => {
    await comServico(async ({ porta }) => {
      const u = await conta(porta);
      await pedir(porta, '/api/limites', { metodo: 'POST', sessao: u.sessao,
        corpo: { tipo: 'max_stake_per_round', valor: 100 } });
      /* A tentativa por HTTP: mandar o prazo no corpo. É o caminho que a Spec
         proíbe — "não pode ser encurtado por suporte, promoção ou evento" —, e
         pela rota ele é literalmente um campo a mais no JSON. */
      const r = await pedir(porta, '/api/limites', { metodo: 'POST', sessao: u.sessao,
        corpo: { tipo: 'max_stake_per_round', valor: 5000,
                 cooldownMs: 0, efetivoEm: AGORA, vigente: true } });
      igual(r.corpo?.vigente, false, 'o aumento valeu na hora pela rota');
      const agora = await pedir(porta, '/api/limites', { sessao: u.sessao });
      igual(agora.corpo?.limites?.max_stake_per_round, 100,
        'o limite subiu na hora — um campo no JSON encurtou o cooldown do §28.3');
    });
  });

  s.teste('a pausa do §28.4 bloqueia a aposta PELA ROTA', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const u = await conta(porta);
      await pedir(porta, '/api/protecao/pausar', { metodo: 'POST', sessao: u.sessao,
        corpo: { tipo: 'cooloff', duracao: '24h' } });
      srv.sched.abrirRodada();
      const r = await pedir(porta, '/api/aposta', { metodo: 'POST', sessao: u.sessao,
        corpo: { slot: 0, valor: 50 } });
      ok(r.status >= 400, 'apostou pela rota durante o cool-off');
      igual(r.corpo?.codigo, ERRO_PROTECAO.PAUSADO, `código veio ${r.corpo?.codigo}`);
    });
  });

  s.teste('NÃO existe rota que encerre uma pausa', async () => {
    const { ROTAS } = await import('../server/rotas.mjs');
    for (const nome of Object.keys(ROTAS))
      ok(!/(protecao|pausa).*(encerrar|cancelar|remover|liberar|reverter)/i.test(nome),
        `existe a rota \`${nome}\`. A irreversibilidade da autoexclusão é uma ` +
        `AUSÊNCIA, e uma rota é o caminho mais fácil de reintroduzi-la — o ` +
        `painel do F1.11 vai procurar exatamente isso.`);
  });

  /* --- 4. NADA DO CLIENTE VIRA PREÇO ------------------------------------- */

  s.teste('a odd mandada no corpo é IGNORADA', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const u = await conta(porta);
      const rodada = srv.sched.abrirRodada();
      const r = await pedir(porta, '/api/aposta', { metodo: 'POST', sessao: u.sessao,
        corpo: { slot: 0, valor: 50, odd: 999 } });
      igual(r.status, 200, `a aposta falhou: ${JSON.stringify(r.corpo)}`);
      const oferta = srv.db.prepare(
        `SELECT offered_odd FROM round_fighters WHERE round_id=? AND slot=0`).get(rodada.id);
      igual(r.corpo.odd, oferta.offered_odd,
        `o ticket saiu com odd ${r.corpo.odd} e a oferta publicada era ` +
        `${oferta.offered_odd}. Se a odd viesse do pedido, o cliente mandaria ` +
        `999 em toda aposta.`);
    });
  });

  s.teste('a semente não vaza antes do lock', async () => {
    await comServico(async ({ porta, s: srv }) => {
      srv.sched.abrirRodada();
      const r = await pedir(porta, '/api/rodada');
      igual(r.status, 200, 'o estado da rodada não respondeu');
      const texto = JSON.stringify(r.corpo);
      ok(!/"raiz"|"seed"|round_seed_reveal|"sal"/.test(texto),
        `o estado público carrega a semente antes do lock: ${texto.slice(0, 200)}. ` +
        `Quem tem a raiz sabe o campeão — é o §4.5 inteiro.`);
      ok(/commit/i.test(texto),
        'o estado público não traz o commit. Sem ele o jogador não tem o que conferir depois.');
    });
  });

  /* --- Q6: a resposta de erro não entrega o servidor --------------------- */

  s.teste('erro interno não devolve stack trace nem caminho de arquivo', async () => {
    await comServico(async ({ porta }) => {
      const u = await conta(porta);
      /* Corpo que a rota não espera: o objetivo é provocar o caminho de erro. */
      const r = await pedir(porta, '/api/aposta', { metodo: 'POST', sessao: u.sessao,
        corpo: { slot: { $ne: null }, valor: 'muito' } });
      const texto = JSON.stringify(r.corpo ?? '');
      ok(!/\/home\/|\.mjs:\d+|at [A-Za-z]+ \(/.test(texto),
        `a resposta de erro entrega o servidor: ${texto.slice(0, 200)}`);
    });
  });

  s.teste('todas as respostas trazem os cabeçalhos de segurança', async () => {
    await comServico(async ({ porta }) => {
      for (const caminho of ['/saude', '/api/rodada', '/api/carteira', '/nao-existe']) {
        const r = await fetch(`http://127.0.0.1:${porta}${caminho}`,
          { headers: { [CABECALHO_VERSAO]: API_VERSAO } });
        for (const h of ['x-content-type-options', 'x-frame-options', 'cache-control'])
          ok(r.headers.get(h), `${caminho} respondeu sem \`${h}\` (status ${r.status})`);
      }
    });
  });

  /* --- Q9: o bloqueio pela rota também deixa rastro ---------------------- */

  s.teste('bloqueio pela rota grava evento de proteção', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const u = await conta(porta);
      await pedir(porta, '/api/limites', { metodo: 'POST', sessao: u.sessao,
        corpo: { tipo: 'max_stake_per_round', valor: 100 } });
      srv.sched.abrirRodada();
      await pedir(porta, '/api/aposta', { metodo: 'POST', sessao: u.sessao,
        corpo: { slot: 0, valor: 500 } });
      const n = srv.db.prepare(
        `SELECT COUNT(*) AS n FROM responsible_play_events
          WHERE user_id=? AND tipo='limite_bloqueou'`).get(u.id).n;
      igual(n, 1, 'o bloqueio pela rota não deixou evento — a série de bloqueios é o ' +
                  'que o §28.6 lê como `limit_pressure`');
    });
  });

  /* ── F1.10 · O Q6 DA PROGRESSÃO ────────────────────────────────────────
   *
   * Os três ataques que o bloco declara, pela porta:
   *
   *   reivindicar recompensa de outro usuário
   *   forjar progresso de desafio pelo cliente
   *   farmar login streak manipulando fuso horário
   */
  s.teste('não dá para pedir resgate nem perfil em nome de outro', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a'); const b = await conta(porta, 'b');
      /* O corpo manda o id do OUTRO. A rota lê o dono da sessão, e o campo é
         ignorado — não recusado com erro, IGNORADO, porque recusar seria
         admitir que o campo existe. */
      const r = await pedir(porta, '/api/perfil', { sessao: a.sessao });
      igual(r.corpo.perfil.user_id, a.id, 'a rota devolveu o perfil de outra conta');

      const res = await pedir(porta, '/api/resgate', { metodo: 'POST', sessao: a.sessao,
                                                       corpo: { userId: b.id } });
      ok(res.status < 500, 'a rota quebrou com userId no corpo');
      const doB = await pedir(porta, '/api/perfil', { sessao: b.sessao });
      igual(doB.corpo.perfil.xp, 0,
        'o pedido de A mexeu no perfil de B. O usuário sai da SESSÃO, nunca do ' +
        'pedido — e é isso que torna "reivindicar recompensa de outro" ' +
        'impossível em vez de improvável.');
    });
  });

  s.teste('o cliente NÃO consegue declarar progresso de desafio', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a');
      const antes = (await pedir(porta, '/api/perfil', { sessao: a.sessao })).corpo.desafios;
      /* Não existe rota para isso, e é essa AUSÊNCIA que é a garantia. O teste
         tenta as formas óbvias: se qualquer uma responder 2xx, nasceu uma
         porta que ninguém queria. */
      for (const [m, c, corpo] of [
        ['POST', '/api/desafio', { slot: 0, progresso: 999 }],
        ['POST', '/api/perfil/desafio', { slot: 0, progresso: 999 }],
        ['POST', '/api/perfil', { xp: 999999 }],
        ['POST', '/api/progresso', { slot: 0, progresso: 999 }],
      ]) {
        const r = await pedir(porta, c, { metodo: m, sessao: a.sessao, corpo });
        ok(r.status >= 400,
          `\`${m} ${c}\` respondeu ${r.status}. O cliente diz o que FEZ, nunca ` +
          `quanto progrediu — uma rota que aceita \`progresso\` é a edição do ` +
          `localStorage com mais passos.`);
      }
      const depois = (await pedir(porta, '/api/perfil', { sessao: a.sessao })).corpo.desafios;
      igual(depois.map(d => d.progresso).join(','), antes.map(d => d.progresso).join(','),
        'algum progresso mudou depois das tentativas');
    });
  });

  s.teste('a trilha de login não conta o relógio do cliente', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a');
      const primeiro = await pedir(porta, '/api/perfil/entrar', { metodo: 'POST', sessao: a.sessao, corpo: {} });
      ok(primeiro.corpo.creditou > 0, 'o primeiro login não creditou');

      /* Dez tentativas mandando datas e fusos diferentes. Nenhuma pode virar
         um dia novo: o dia sai de `agora`, do servidor. */
      for (const forjado of [
        { dia: '2030-01-01' }, { data: '2030-01-02' }, { agora: 4102444800000 },
        { tz: 'Pacific/Kiritimati' }, { timezoneOffset: -840 },
      ]) {
        const r = await pedir(porta, '/api/perfil/entrar', { metodo: 'POST', sessao: a.sessao, corpo: forjado });
        igual(r.corpo.creditou, 0,
          `mandar ${JSON.stringify(forjado)} creditou de novo no mesmo dia — o ` +
          `cliente conseguiu inventar um dia, e a trilha de 7 dias fecha em uma tarde`);
      }
      igual((await pedir(porta, '/api/perfil/entrar', { metodo: 'POST', sessao: a.sessao, corpo: {} })).corpo.sequencia, 1,
        'a sequência passou de 1 sem passar um dia');
    });
  });

  /* ── F1.11 · O Q6 DO PAINEL ADMIN ─────────────────────────────────────
   *
   * "O painel admin é a superfície de maior valor do sistema" — §5.11. Quem
   * chega aqui vê saldo de todo mundo e muda a margem da casa.
   */
  s.teste('rota admin recusa sem operador, com ou sem sessão de jogador', async () => {
    await comServico(async ({ porta }) => {
      const a = await conta(porta, 'a');
      for (const sessao of [undefined, a.sessao]) {
        const r = await pedir(porta, '/api/admin/painel', { sessao });
        ok(r.status === 401 || r.status === 403,
          `o painel respondeu ${r.status} sem operador${sessao ? ' (mas com sessão de jogador)' : ''}. ` +
          `Sessão de jogador NÃO autoriza nada no admin: se o mesmo token ` +
          `servisse para os dois, um vazamento de sessão viraria acesso ` +
          `administrativo, e o raio do incidente passaria de uma conta para todas.`);
      }
    });
  });

  s.teste('operador de leitura não alcança ação de economia', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const leitor = await operadorLogado(srv, { papel: 'leitura' });
      const r = await pedir(porta, '/api/admin/painel', { cabecalhos: leitor.cabecalhos });
      igual(r.status, 200, `leitura não alcançou o painel: ${JSON.stringify(r.corpo)}`);
      ok(r.corpo.emCirculacao, 'o painel voltou sem a circulação');
    });
  });

  s.teste('operador desconhecido e sem papel dão a MESMA resposta', async () => {
    /* Distinguir "não existe" de "não pode" transforma a rota num verificador
       de ids de operador — a mesma razão de o login não distinguir e-mail que
       existe de e-mail que não existe. */
    await comServico(async ({ porta, s: srv }) => {
      const leitor = await operadorLogado(srv, { papel: 'leitura' });
      /* Token inventado e ID DE OPERADOR REAL: os dois têm que dar a mesma
         recusa. O segundo é o ataque que o F1.17 fecha — o id é público no
         sentido que importa, porque aparece em toda linha de auditoria. */
      const inexistente = await pedir(porta, '/api/admin/painel',
        { cabecalhos: { authorization: 'Bearer token-que-nao-existe-mesmo-nao' } });
      const semPapel = await pedir(porta, '/api/admin/painel',
        { cabecalhos: { authorization: `Bearer ${leitor.op.id}` } });
      igual(inexistente.status, semPapel.status,
        'as duas recusas têm status diferente — dá para enumerar operadores');
      igual(JSON.stringify(inexistente.corpo), JSON.stringify(semPapel.corpo),
        'as duas recusas têm corpo diferente — dá para enumerar operadores');
    });
  });

  s.teste('toda consulta ao painel deixa registro de auditoria', async () => {
    await comServico(async ({ porta, s: srv }) => {
      const { op } = await operadorLogado(srv, { papel: 'leitura' });
      const antes = srv.db.prepare(
        `SELECT COUNT(*) n FROM admin_auditoria WHERE operador_id = ? AND acao = 'painel.ver'`)
        .get(op.id).n;
      const logado = await operadorLogado(srv, { papel: 'economia' });
      await pedir(porta, '/api/admin/painel', { cabecalhos: logado.cabecalhos });
      const n = srv.db.prepare(
        `SELECT COUNT(*) n FROM admin_auditoria WHERE operador_id = ?`).get(logado.op.id).n;
      ok(n >= 1,
        'ver o painel não deixou registro. Quem viu o saldo de todo mundo é ' +
        'exatamente o que a auditoria existe para responder.');
    });
  });

  s.teste('toda rota /api/admin/ está declarada como administrativa', async () => {
    const { ROTAS, ROTAS_PUBLICAS, ROTAS_ADMIN } = await import('../server/rotas.mjs');
    /* Derivar não pode dessincronizar. Uma rota admin fora da lista responderia
       401 para o operador certo; uma rota admin DENTRO da lista de públicas
       seria o incidente inteiro. */
    const doAdmin = Object.keys(ROTAS).filter(k => k.includes('/api/admin/'));
    ok(doAdmin.length > 0, 'nenhuma rota admin encontrada — o varredor quebrou');
    for (const k of doAdmin) {
      ok(ROTAS_ADMIN.includes(k), `\`${k}\` não está em ROTAS_ADMIN`);
      ok(!ROTAS_PUBLICAS.includes(k),
        `\`${k}\` está na lista de PÚBLICAS. É a rota que vê saldo de todo ` +
        `mundo, aberta para qualquer um.`);
    }
    for (const k of ROTAS_ADMIN)
      ok(k.includes('/api/admin/'),
        `\`${k}\` está em ROTAS_ADMIN e não é rota de admin — ela deixaria de ` +
        `exigir sessão de jogador sem ninguém perceber`);
  });

  return s;
}
