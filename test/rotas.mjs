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

const pedir = (porta, caminho, { metodo = 'GET', corpo, sessao, versao = API_VERSAO } = {}) =>
  fetch(`http://127.0.0.1:${porta}${caminho}`, {
    method: metodo,
    headers: {
      ...(versao === null ? {} : { [CABECALHO_VERSAO]: versao }),
      ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
      ...(corpo ? { 'content-type': 'application/json' } : {}),
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

  return s;
}
