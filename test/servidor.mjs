/* Q1/Q6 · O SERVIDOR — contrato, saúde e paridade com o cliente (F1.1).
 *
 * TRÊS AFIRMAÇÕES, e o bloco F1.1 vale por elas:
 *
 *   1. O contrato é VERSIONADO, e requisição sem versão declarada é recusada.
 *      Não é burocracia: no dia em que o cliente e o servidor discordarem sobre
 *      o formato de um ticket, a diferença tem que aparecer no handshake e não
 *      no meio de uma aposta.
 *   2. O motor do servidor produz o MESMO resultado que o do cliente, byte a
 *      byte, para a mesma raiz. É o §P3 atravessando a rede.
 *   3. Erro não vaza stack trace, cabeçalho de segurança está presente, e CORS
 *      não é `*`.
 *
 * A terceira é o portão Q6, e ela mora aqui e não num arquivo à parte porque a
 * superfície que ela guarda é a mesma que os outros dois testes exercitam.
 *
 * O servidor sobe em porta efêmera, dentro do teste. Nenhum estado global,
 * nenhuma porta fixa: duas execuções em paralelo não podem colidir — foi o que
 * o T3 acabou de comprar, e portão que não roda em paralelo desperdiça isso.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO } from '../server/contrato.mjs';
import { digital as digitalNode } from './rodada-digital.mjs';

/* Sobe, roda, derruba. O `try/finally` é obrigatório: servidor que vaza numa
   falha de teste segura a porta e a próxima execução falha por motivo errado. */
async function comServidor(fn) {
  const s = criarServidor({ config: { ambiente: 'teste' } });
  const porta = await s.ouvir(0);
  try { return await fn(porta); } finally { await s.fechar(); }
}

const pedir = (porta, caminho, opcoes = {}) =>
  fetch(`http://127.0.0.1:${porta}${caminho}`, opcoes)
    .then(async r => ({
      status: r.status,
      cabecalhos: Object.fromEntries(r.headers.entries()),
      corpo: await r.text(),
    }));

const json = t => { try { return JSON.parse(t); } catch { return null; } };

export async function suite() {
  const s = criarSuite('servidor');

  /* --- saúde ------------------------------------------------------------- */

  s.teste('o health check responde sem sessão e sem versão', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/saude');
      igual(r.status, 200, 'health check fora do ar');
      const b = json(r.corpo);
      ok(b && b.ok === true, `corpo inesperado: ${r.corpo.slice(0, 120)}`);
      /* O health check é o ÚNICO caminho que não exige versão: ele existe para
         o balanceador, que não conhece o contrato. Se ele exigisse versão, uma
         mudança de contrato derrubaria a instância inteira do pool. */
      ok(typeof b.versaoMotor === 'string' && b.versaoMotor.length > 0,
        'o health check não declara a versão do motor — é por ela que se descobre ' +
        'uma instância velha no pool antes de ela servir uma odd');
    });
  });

  /* --- o contrato é versionado ------------------------------------------- */

  s.teste('requisição de API sem versão declarada é RECUSADA', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/api/rodada/preco?raiz=42');
      igual(r.status, 400, `sem versão devia dar 400, deu ${r.status}`);
      const b = json(r.corpo);
      ok(b && /vers/i.test(b.erro || ''),
        `a recusa não explica que falta versão: ${r.corpo.slice(0, 160)}`);
    });
  });

  s.teste('versão de API desconhecida é RECUSADA, e diz qual ela conhece', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/api/rodada/preco?raiz=42',
        { headers: { 'x-api-versao': '999' } });
      igual(r.status, 400, `versão desconhecida devia dar 400, deu ${r.status}`);
      ok(r.corpo.includes(API_VERSAO),
        `a recusa não diz qual versão o servidor fala: ${r.corpo.slice(0, 160)}`);
    });
  });

  s.teste('a versão corrente é aceita', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/api/rodada/preco?raiz=42',
        { headers: { 'x-api-versao': API_VERSAO } });
      igual(r.status, 200, `versão corrente recusada: ${r.corpo.slice(0, 200)}`);
    });
  });

  /* --- PARIDADE: o motor do servidor é o mesmo do cliente ---------------- */

  /* A AFIRMAÇÃO CENTRAL DO BLOCO.
   *
   * O §P3 promete que a mesma raiz reproduz a mesma rodada. Até aqui isso foi
   * provado entre Node e Chromium (test/visual.mjs, suíte `ambientes`). Agora
   * há um terceiro lugar onde a rodada existe — o servidor — e ele é o que vai
   * PRECIFICAR e LIQUIDAR. Se ele divergir do cliente, o jogador assiste uma
   * luta e recebe o resultado de outra.
   *
   * O teste compara a DIGITAL, que é a mesma função que o Q3 entre ambientes
   * usa. Comparar "o vencedor" provaria bem menos: dois motores podem concordar
   * no vencedor e discordar em cada golpe do caminho. */
  s.teste('a rodada do servidor é IDÊNTICA à do cliente, para a mesma raiz', async () => {
    const RAIZES = [1, 42, 0xC0FFEE, 0xFFFFFFFF, 987654321];
    await comServidor(async porta => {
      for (const raiz of RAIZES) {
        const r = await pedir(porta, `/api/rodada/digital?raiz=${raiz}`,
          { headers: { 'x-api-versao': API_VERSAO } });
        igual(r.status, 200, `raiz ${raiz}: servidor respondeu ${r.status}`);
        const b = json(r.corpo);
        const aqui = digitalNode(raiz);
        ok(b && b.digital === aqui,
          `raiz ${raiz}: servidor e cliente divergiram.\n` +
          `      servidor: ${String(b?.digital).slice(0, 80)}\n` +
          `      cliente:  ${aqui.slice(0, 80)}`);
      }
    });
  });

  s.teste('o servidor declara a MESMA versão de motor que o cliente', async () => {
    const { VERSAO } = await import('../engine/engine.mjs');
    await comServidor(async porta => {
      const b = json((await pedir(porta, '/saude')).corpo);
      igual(b.versaoMotor, VERSAO,
        'servidor e cliente em versões diferentes do motor. É o cenário que o ' +
        'F1.1 existe para tornar impossível de passar despercebido.');
    });
  });

  /* --- o preço vem do mesmo Monte Carlo ---------------------------------- */

  s.teste('o preço do servidor reproduz o do cliente para a mesma raiz', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/api/rodada/preco?raiz=777&sims=2000',
        { headers: { 'x-api-versao': API_VERSAO } });
      igual(r.status, 200, `preço recusado: ${r.corpo.slice(0, 200)}`);
      const b = json(r.corpo);
      ok(b && Array.isArray(b.lutadores) && b.lutadores.length === 12,
        `resposta sem os doze lutadores: ${r.corpo.slice(0, 200)}`);
      /* O CÁLCULO DO CLIENTE, refeito aqui — e a distinção é o teste inteiro.
       *
       * A primeira versão comparava a resposta com `montarRodadaServidor()`, que
       * é A MESMA FUNÇÃO que produziu a resposta: mudar a margem do servidor
       * mudava os dois lados e o teste passava. Era tautologia com cara de
       * paridade, e a sabotagem "servidor com motor próprio" passou por ela.
       *
       * Agora o esperado sai do caminho do CLIENTE: a ligação de
       * `app/modules/motor.mjs`, com `simularLote` e `precificar` de
       * `engine/preco.mjs`, exatamente como `computeOdds` faz no navegador. */
      const { M: MCliente } = await import('../app/modules/motor.mjs');
      const { sementes } = await import('../engine/seed.mjs');
      const { precificar, simularLote } = await import('../engine/preco.mjs');
      const lutadores = MCliente.sortearPool(sementes(777).elenco);
      const wins = new Uint32Array(lutadores.length);
      simularLote(MCliente, lutadores, 777, 0, 2000, wins);
      const doCliente = precificar(wins, 2000, MCliente);

      for (let i = 0; i < 12; i++) {
        igual(b.lutadores[i].idx, doCliente.lutadores[i].idx,
          `o lutador na posição ${i} não é o mesmo no servidor e no cliente`);
        igual(b.lutadores[i].odd, doCliente.lutadores[i].odd,
          `odd do lutador ${i}: servidor ${b.lutadores[i].odd}, cliente ` +
          `${doCliente.lutadores[i].odd}. O servidor está precificando por conta ` +
          `própria — o jogador veria uma odd na tela e outra no ticket.`);
      }
      igual(b.margemEfetiva, doCliente.margemEfetiva,
        'a margem efetiva do servidor não é a do cliente');
    });
  });

  /* --- Q6: a superfície --------------------------------------------------- */

  /* ESTE TESTE NASCEU DE UMA SABOTAGEM QUE PASSOU.
   *
   * A primeira versão pedia `?raiz=nao-e-numero` e conferia que a resposta não
   * tinha stack. Só que essa entrada é rejeitada pela VALIDAÇÃO, com 400 e uma
   * mensagem limpa — o caminho de 500, que é o único que tem stack para vazar,
   * nunca era alcançado. O teste media o lugar errado com confiança.
   *
   * Agora a rota que lança é registrada PELO TESTE, na instância do teste. Sem
   * rota de erro em produção: superfície que só existe para o teste é superfície
   * que alguém acha em produção. */
  s.teste('erro inesperado NÃO vaza stack trace', async () => {
    const s2 = criarServidor({ config: { ambiente: 'teste', silencioso: true } });
    s2.registrar('GET', '/api/_estoura', () => {
      const e = new Error('segredo-interno-que-nao-pode-vazar');
      e.stack = 'Error: segredo-interno-que-nao-pode-vazar\n    at /home/app/server/x.mjs:42:7';
      throw e;
    });
    const porta = await s2.ouvir(0);
    /* A SESSÃO ENTROU AQUI NO F1.13, e a mudança deste teste é a prova de que a
       regra nova funciona: a partir daquele bloco, **rota nova nasce PRIVADA**.
       A conferência mora no despacho e a lista de públicas é a exceção
       declarada, então esta rota de mentira — registrada à mão, fora da tabela
       — passou a exigir sessão sem ninguém ter mexido nela.

       O teste ganha um token em vez de a regra ganhar uma exceção: o que ele
       mede é o caminho de erro 500, e não a autenticação. */
    const { abrirSessao } = await import('../server/auth.mjs');
    const sessao = abrirSessao({ segredo: s2.config.segredoSessao, userId: 'teste' });
    try {
      const r = await pedir(porta, '/api/_estoura', { headers: {
        'x-api-versao': API_VERSAO, authorization: `Bearer ${sessao}` } });
      igual(r.status, 500, `a rota que lança devia dar 500, deu ${r.status}`);
      ok(!/\bat \/|node:internal|\.mjs:\d+/.test(r.corpo),
        `a resposta de erro carrega stack trace:\n      ${r.corpo.slice(0, 300)}`);
      ok(!r.corpo.includes('segredo-interno'),
        `a resposta de erro carrega a MENSAGEM da exceção:\n      ${r.corpo.slice(0, 300)}`);
    } finally { await s2.fechar(); }
  });

  /* A OUTRA SABOTAGEM QUE PASSOU: `raiz` aceitando as formas que o `Number()`
   * engole calado. `1e3` vira 1000, `0x10` vira 16, ` 5 ` vira 5 e `+5` vira 5.
   * Cada uma delas é uma rodada DIFERENTE da que o cliente pediu — mesma URL,
   * elenco diferente, odds diferentes, e nenhum erro em lugar nenhum.
   *
   * O teste anterior só conferia que `nao-e-numero` era recusado, e qualquer
   * validação recusa isso. */
  s.teste('a raiz recusa toda forma que o Number() aceitaria calado', async () => {
    const MAUS = ['1e3', '0x10', ' 5', '5 ', '+5', '-1', '5.0', '05e0', 'Infinity', ''];
    await comServidor(async porta => {
      for (const v of MAUS) {
        const r = await pedir(porta, `/api/rodada/digital?raiz=${encodeURIComponent(v)}`,
          { headers: { 'x-api-versao': API_VERSAO } });
        igual(r.status, 400,
          `raiz "${v}" foi ACEITA (status ${r.status}). Number("${v}") = ${Number(v)}, ` +
          `que é uma rodada diferente da que o cliente pediu — mesma URL, elenco ` +
          `diferente, odds diferentes, e nenhum erro em lugar nenhum.`);
      }
      /* E o caminho feliz continua funcionando, senão "recusa tudo" passaria. */
      const bom = await pedir(porta, '/api/rodada/digital?raiz=5',
        { headers: { 'x-api-versao': API_VERSAO } });
      igual(bom.status, 200, 'a raiz válida foi recusada junto');
    });
  });

  s.teste('caminho desconhecido dá 404 sem revelar estrutura', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/api/nao/existe',
        { headers: { 'x-api-versao': API_VERSAO } });
      igual(r.status, 404, `caminho inexistente deu ${r.status}`);
      ok(!/\//.test(json(r.corpo)?.erro || ''),
        'a mensagem de 404 devolve o caminho pedido — é eco de entrada do usuário');
    });
  });

  s.teste('os cabeçalhos de segurança estão presentes', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/saude');
      const c = r.cabecalhos;
      const exigidos = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
      };
      for (const [k, v] of Object.entries(exigidos))
        igual(c[k], v, `cabeçalho ${k} ausente ou errado`);
      ok(typeof c['content-security-policy'] === 'string' && c['content-security-policy'].length > 0,
        'sem Content-Security-Policy');
    });
  });

  s.teste('CORS não é aberto para qualquer origem', async () => {
    await comServidor(async porta => {
      const r = await pedir(porta, '/saude', { headers: { origin: 'https://mal.exemplo' } });
      const permitido = r.cabecalhos['access-control-allow-origin'];
      ok(permitido !== '*',
        'Access-Control-Allow-Origin: * — com credencial de sessão isso entrega ' +
        'a conta do jogador para qualquer página aberta no navegador dele');
      ok(permitido === undefined || permitido !== 'https://mal.exemplo',
        `o servidor ecoou a origem pedida ("${permitido}"), que é `+
        '`*` escrito de outro jeito');
    });
  });

  s.teste('nenhum segredo de configuração aparece numa resposta', async () => {
    await comServidor(async porta => {
      const corpos = [];
      for (const c of ['/saude', '/api/rodada/digital?raiz=1', '/api/nao/existe'])
        corpos.push((await pedir(porta, c, { headers: { 'x-api-versao': API_VERSAO } })).corpo);
      const junto = corpos.join('\n');
      for (const termo of ['SEGREDO', 'segredoSessao', 'PASSWORD', 'SENHA', 'TOKEN_'])
        ok(!junto.includes(termo),
          `a palavra "${termo}" apareceu numa resposta do servidor`);
    });
  });

  /* --- configuração por ambiente ------------------------------------------ */

  s.teste('a configuração recusa subir em produção sem os segredos', async () => {
    const { lerConfig } = await import('../server/config.mjs');
    let erro = null;
    try { lerConfig({ AMBIENTE: 'producao' }); } catch (e) { erro = e; }
    ok(erro, 'produção sem segredo declarado subiu — é como um segredo padrão vai parar em produção');
    ok(/segredo/i.test(erro.message), `a recusa não diz o que falta: ${erro?.message}`);
  });

  /* O padrão de desenvolvimento é conveniência, e conveniência silenciosa é
     como um segredo de teste chega em produção. Ele existe e AVISA. */
  s.teste('em desenvolvimento a configuração tem padrão, e ele avisa', async () => {
    const { lerConfig } = await import('../server/config.mjs');
    const avisos = [];
    const c = lerConfig({ AMBIENTE: 'desenvolvimento' }, m => avisos.push(m));
    ok(c.segredoSessao && c.segredoSessao.length >= 32,
      'sem segredo de sessão utilizável em desenvolvimento');
    ok(avisos.some(a => /padr|desenvolv/i.test(a)),
      `o padrão de desenvolvimento não avisou. Avisos: ${JSON.stringify(avisos)}`);
  });

  s.teste('a configuração não é a mesma entre dois processos de desenvolvimento', async () => {
    const { lerConfig } = await import('../server/config.mjs');
    const a = lerConfig({ AMBIENTE: 'desenvolvimento' }, () => {});
    const b = lerConfig({ AMBIENTE: 'desenvolvimento' }, () => {});
    ok(a.segredoSessao !== b.segredoSessao,
      'o segredo de desenvolvimento é FIXO no código. Segredo fixo em repositório ' +
      'público é segredo publicado, e a diferença entre "de desenvolvimento" e ' +
      '"de produção" é uma variável de ambiente que alguém esquece.');
  });

  return s;
}
