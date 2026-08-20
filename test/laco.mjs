/* Q1/Q3 · O LAÇO DO SERVIDOR — quem vira a rodada e quem avisa a sala (F1.14).
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA CONSERTAR ───────────────────────────────
 *
 * O F1.5 construiu um scheduler autoritativo. O F1.6 construiu uma sala com
 * histórico e retomada. O F1.7 construiu aposta e settlement. E até aqui
 * **nada em produção chamava `tick()`, e nada nunca chamou `transmitir()`** —
 * as duas só apareciam em teste. Um servidor de verdade, subido pelo
 * `principal.mjs`, respondia `{ rodada: null }` para sempre: as peças estavam
 * todas prontas e não havia motor girando nenhuma.
 *
 * É a terceira vez que o projeto encontra esta forma exata de defeito — S30 no
 * F0.5, S53 no F0.9, L-033 no F1.13. **Testar a peça não testa o encaixe**, e
 * uma peça que ninguém chama passa verde por qualquer suíte que a chame
 * diretamente.
 *
 * ── POR QUE O EVENTO CARREGA O ESTADO INTEIRO ──────────────────────────────
 *
 * Cada evento leva `paraCliente()` completo, e não um delta. São doze
 * lutadores; o custo é desprezível e o que se compra é grande: um cliente que
 * perdeu um evento e recebeu o seguinte está em dia, sem reconciliar nada. A
 * classe inteira de defeito "o cliente e o servidor discordam sobre a fase"
 * deixa de existir por construção, e não por cuidado.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarLaco } from '../server/laco.mjs';
import { criarScheduler, ESTADOS, FASE_MS } from '../server/scheduler.mjs';
import { criarSala } from '../server/transporte.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

/* Relógio na mão: o laço tem que ser medido por CONDIÇÃO, e não por espera.
   `setTimeout` num teste mede a máquina, não o produto — é o D-016. */
function montar() {
  const db = abrirBanco(':memory:');
  migrar(db);
  let t = 1_700_000_000_000;
  const relogio = () => t;
  const sched = criarScheduler({ db, sims: 500, relogio });
  const sala = criarSala({ agora: relogio });
  const erros = [];
  /* `aoErro` recebido em vez de deixar cair no `console.error`: um teste que
     imprime pilha no meio do relatório treina quem lê a ignorar. */
  const laco = criarLaco({ sched, sala, relogio, aoErro: e => erros.push(e) });
  const recebidos = [];
  /* Uma conexão de mentira, igual à de `test/transporte.mjs`: o que importa
     aqui é o que o laço MANDA, e a sala já tem suíte própria. */
  sala.entrar({ headers: {}, on: () => {} },
    { writeHead: () => {}, write: t => { recebidos.push(t); return true; }, end: () => {} },
    { estadoInicial: null });
  const eventos = () => recebidos.filter(x => x.startsWith('id:')).map(x => ({
    tipo: x.match(/event: (\w+)/)[1],
    dados: JSON.parse(x.match(/data: (.*)\n\n$/s)[1]),
  }));
  return { db, sched, sala, laco, eventos, erros,
           avancar: ms => { t += ms; },
           fechar: () => { try { db.close(); } catch {} } };
}

/* Do estado inicial até a fase pedida, passo a passo. Devolve quantos passos
   custou — número, e não espera. */
function ate(c, fase, limite = 40) {
  for (let i = 0; i < limite; i++) {
    c.laco.passo();
    if (c.sched.rodadaAtual()?.status === fase) return i + 1;
    c.avancar(FASE_MS.APOSTA / 4);
  }
  throw new Error(`a rodada não chegou em \`${fase}\` em ${limite} passos`);
}

/* ── A PORTA DA SALA ────────────────────────────────────────────────────────
 *
 * Servidor de verdade, socket de verdade, e o cliente lendo o fluxo com
 * `fetch` — porque é assim que o app vai ler. Ver `app/modules/sala.mjs`
 * para por que não é `EventSource`.
 */
const SENHA = 'senha-longa-o-bastante-1';

async function comPorta(fn, opcoes = {}) {
  let t = 1_700_000_000_000;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                            banco: ':memory:', sims: 500,
                            relogio: () => t, ...opcoes });
  const porta = await s.ouvir(0);
  const base = `http://127.0.0.1:${porta}`;
  const cab = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, ...extra });
  const entrar = async (n = 'j') => {
    const r = await fetch(base + '/api/auth/cadastrar', {
      method: 'POST', headers: cab({ 'content-type': 'application/json' }),
      body: JSON.stringify({ username: n, email: `${n}@exemplo.test`,
                             senha: SENHA, nascimento: '1990-01-01' }) });
    return (await r.json()).sessao;
  };
  try { return await fn({ s, base, cab, entrar, avancar: ms => { t += ms; } }); }
  finally { await s.fechar(); }
}

/* Lê o fluxo SSE por CONDIÇÃO: devolve quando o evento pedido chega, ou
   desiste. Nunca dorme um tanto fixo — relógio fixo mede a máquina (D-016). */
function lerFluxo(resposta) {
  const leitor = resposta.body.getReader();
  const dec = new TextDecoder();
  const eventos = [];
  let resto = '';
  let vivo = true;
  (async () => {
    try {
      while (vivo) {
        const { done, value } = await leitor.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        let i;
        while ((i = resto.indexOf('\n\n')) >= 0) {
          const bruto = resto.slice(0, i); resto = resto.slice(i + 2);
          const tipo = bruto.match(/event: (\w+)/);
          const dados = bruto.match(/data: (.*)$/s);
          if (tipo && dados) eventos.push({ tipo: tipo[1], dados: JSON.parse(dados[1]) });
        }
      }
    } catch { /* fechou */ }
  })();
  return {
    eventos,
    fechar: () => { vivo = false; leitor.cancel().catch(() => {}); },
    /* Espera por CONDIÇÃO, com teto. O teto existe para o teste falhar em vez
       de pendurar a suíte; ele não é a medida de nada. */
    esperar: async (quantos, tetoMs = 8000) => {
      const fim = Date.now() + tetoMs;
      while (eventos.length < quantos && Date.now() < fim)
        await new Promise(r => setTimeout(r, 10));
      return eventos.length >= quantos;
    },
  };
}

export function suite() {
  const s = criarSuite('laco');

  s.teste('o laço abre a primeira rodada sozinho, sem cliente nenhum', () => {
    const c = montar();
    try {
      igual(c.sched.rodadaAtual(), null, 'já havia rodada antes do primeiro passo');
      c.laco.passo();
      const r = c.sched.rodadaAtual();
      ok(r && r.status === ESTADOS.ABERTA,
        'o laço não abriu rodada nenhuma. Um servidor sem laço responde ' +
        '`{ rodada: null }` para sempre — que foi o estado do projeto do F1.5 ' +
        'até aqui, com scheduler pronto e ninguém girando.');
      const e = c.eventos().filter(x => x.tipo === 'rodada');
      igual(e.length, 1, 'abrir rodada não avisou a sala');
      igual(e[0].dados.fase, ESTADOS.ABERTA, 'o evento não trouxe a fase');
    } finally { c.fechar(); }
  });

  s.teste('cada transição de fase vira exatamente UM evento', () => {
    const c = montar();
    try {
      ate(c, ESTADOS.TRAVADA);
      ate(c, ESTADOS.EM_LUTA);
      ate(c, ESTADOS.ENCERRADA);
      const fases = c.eventos().filter(x => x.tipo === 'fase').map(x => x.dados.fase);
      igual(fases.join(','), `${ESTADOS.TRAVADA},${ESTADOS.EM_LUTA},${ESTADOS.ENCERRADA}`,
        `a sala viu as fases [${fases.join(', ')}]. Uma fase a mais é o cliente ` +
        `remontando a cena duas vezes; uma a menos é o cliente parado numa fase ` +
        `que já passou.`);
    } finally { c.fechar(); }
  });

  s.teste('passo sem nada para fazer não transmite nada', () => {
    const c = montar();
    try {
      c.laco.passo();
      const antes = c.eventos().length;
      for (let i = 0; i < 5; i++) c.laco.passo();     // relógio parado
      igual(c.eventos().length, antes,
        'o laço transmitiu com o relógio parado. A cada 250 ms isso são quatro ' +
        'eventos por segundo para cada conexão da sala, dizendo o que ela já sabe.');
    } finally { c.fechar(); }
  });

  s.teste('o laço nunca abre uma segunda rodada por cima da atual', () => {
    const c = montar();
    try {
      c.laco.passo();
      const id = c.sched.rodadaAtual().id;
      ate(c, ESTADOS.TRAVADA);
      ate(c, ESTADOS.EM_LUTA);
      igual(c.sched.rodadaAtual().id, id,
        'a rodada trocou de identidade no meio da luta. Quem apostou apostou ' +
        'noutra rodada, e o settlement do F1.7 paga pela id.');
      igual(c.eventos().filter(x => x.tipo === 'rodada').length, 1,
        'o laço anunciou mais de uma abertura para a mesma rodada');
    } finally { c.fechar(); }
  });

  s.teste('a rodada seguinte abre sozinha depois da encerrada', () => {
    const c = montar();
    try {
      c.laco.passo();
      const primeira = c.sched.rodadaAtual().id;
      ate(c, ESTADOS.TRAVADA); ate(c, ESTADOS.EM_LUTA); ate(c, ESTADOS.ENCERRADA);
      /* O ANÚNCIO DO ENCERRAMENTO VEM ANTES DA ABERTURA SEGUINTE, e a ordem é
         o produto: quem está assistindo à luta precisa ver quem ganhou antes
         de a tela virar. */
      const tipos = c.eventos().map(x => `${x.tipo}:${x.dados?.fase ?? ''}`);
      ok(tipos.at(-1) === `fase:${ESTADOS.ENCERRADA}`,
        `o último evento foi \`${tipos.at(-1)}\`, e devia ser o encerramento`);
      c.laco.passo();
      const segunda = c.sched.rodadaAtual().id;
      ok(segunda && segunda !== primeira,
        'o ciclo parou na primeira rodada. "Autoritativo" quer dizer que ele ' +
        'anda sozinho — sem cliente nenhum, a rodada abre, fecha, simula, ' +
        'encerra, e a próxima abre.');
      igual(c.eventos().at(-1).tipo, 'rodada', 'a rodada nova não foi anunciada');
    } finally { c.fechar(); }
  });

  /* --- Q6: o que o evento carrega ---------------------------------------- */

  s.teste('o evento carrega a lista branca, e não a rodada por dentro', () => {
    const c = montar();
    try {
      c.laco.passo();
      const d = c.eventos().at(-1).dados;
      ok(!('raiz' in d) && !d.revelado,
        'a semente saiu na sala com a janela de aposta ABERTA. Quem a lê sabe ' +
        'o campeão antes de apostar — é o §4.5 inteiro.');
      ok(!('preco' in d) && !('batalha' in d),
        'o evento levou o objeto interno da rodada. O que sai é `paraCliente()`, ' +
        'que é lista branca campo a campo: o campo que alguém acrescentar ' +
        'amanhã não vaza porque não nasce incluído.');
      ok(Array.isArray(d.lutadores) && d.lutadores.length === 12,
        'o evento não trouxe os doze lutadores — o cliente não tem o que desenhar');
    } finally { c.fechar(); }
  });

  s.teste('depois de travada a semente é revelada na sala', () => {
    const c = montar();
    try {
      ate(c, ESTADOS.TRAVADA);
      const d = c.eventos().at(-1).dados;
      ok(d.revelado && Number.isInteger(d.revelado.raiz) && d.revelado.sal,
        'a semente não foi revelada depois do fechamento. O commit-reveal do ' +
        '§4.5 só vale se o reveal chegar a quem assistiu.');
    } finally { c.fechar(); }
  });

  /* --- o laço não pode morrer -------------------------------------------- */

  s.teste('um passo que explode não mata o laço', () => {
    const c = montar();
    try {
      c.laco.passo();
      /* O scheduler passa a recusar tudo. É o que acontece de verdade quando o
         banco fica sem espaço ou uma migração falha no meio. */
      const bom = c.sched.tick;
      c.sched.tick = () => { throw new Error('banco caiu'); };
      let explodiu = false;
      try { c.laco.passo(); } catch { explodiu = true; }
      ok(!explodiu,
        'a exceção subiu do passo. Num `setInterval` isso derruba o laço em ' +
        'silêncio: o processo continua de pé, respondendo a tudo, e o jogo ' +
        'para para sempre — o pior desligamento possível, porque não parece um.');
      ok(c.laco.ultimoErro(),
        'o passo engoliu a exceção sem registrar nada. Erro silencioso é ' +
        'defeito sem endereço.');
      c.sched.tick = bom;
      const antes = c.sched.rodadaAtual().status;
      c.avancar(FASE_MS.APOSTA + 1);
      c.laco.passo();
      ok(c.sched.rodadaAtual().status !== antes,
        'o laço não voltou a andar depois que o erro passou');
    } finally { c.fechar(); }
  });

  /* A PRIMEIRA VERSÃO DESTE TESTE ERA DECORATIVA, e a sabotagem disse na hora.
   *
   * Ele conferia `ligado()` depois de `parar()`. Com o segundo `iniciar()`
   * criando um temporizador novo, a variável passa a apontar para o segundo, o
   * `parar()` desliga esse, `ligado()` responde `false` — e o PRIMEIRO continua
   * girando, fora do alcance de qualquer `parar()`. O teste passava verde
   * exatamente no caso que ele existia para pegar.
   *
   * O que se pode afirmar sem tocar em interno do Node: as duas chamadas
   * devolvem o MESMO temporizador. Um segundo handle é, por definição, um que o
   * `parar()` não alcança — e dois laços no mesmo scheduler transmitem cada
   * fase em dobro. */
  s.teste('iniciar duas vezes devolve o MESMO temporizador', () => {
    const c = montar();
    try {
      const primeiro = c.laco.iniciar();
      const segundo = c.laco.iniciar();
      ok(primeiro === segundo,
        'o segundo `iniciar()` criou outro temporizador. O primeiro fica ' +
        'girando fora do alcance do `parar()`, e cada fase é transmitida duas ' +
        'vezes — o cliente remonta a cena no meio da luta.');
      c.laco.parar();
      ok(!c.laco.ligado(), 'o `parar()` não desligou');
    } finally { c.laco.parar(); c.fechar(); }
  });

  /* --- a porta da sala --------------------------------------------------- */

  s.teste('a sala nasce PRIVADA, como toda rota nova', async () => {
    await comPorta(async ({ base, cab }) => {
      const r = await fetch(base + '/api/sala', { headers: cab() });
      igual(r.status, 401,
        `\`GET /api/sala\` respondeu ${r.status} sem sessão. A conferência é ` +
        `no despacho, pela lista de públicas — uma rota de fluxo que escape ` +
        `dela é uma rota que nasceu aberta.`);
      r.body?.cancel().catch(() => {});
    });
  });

  s.teste('a resposta da sala leva os cabeçalhos de segurança', async () => {
    await comPorta(async ({ base, cab, entrar }) => {
      const sessao = await entrar();
      const r = await fetch(base + '/api/sala',
        { headers: cab({ authorization: `Bearer ${sessao}` }) });
      igual(r.status, 200, 'a sala recusou uma sessão válida');
      ok(r.headers.get('content-type').startsWith('text/event-stream'),
        `a sala respondeu \`${r.headers.get('content-type')}\``);
      /* O `writeHead` da sala passa os cabeçalhos DELA. Sem cuidado, ele sai
         por cima dos de segurança, e a única resposta do servidor sem eles é
         justamente a que fica aberta por minutos. */
      for (const h of ['x-content-type-options', 'x-frame-options', 'referrer-policy'])
        ok(r.headers.get(h),
          `a resposta da sala saiu sem \`${h}\`. Cabeçalho aplicado no ponto ` +
          `de saída existe para não depender de lembrança — e o fluxo é o ` +
          `caminho que não passa pelo \`responder()\`.`);
      r.body.cancel().catch(() => {});
    });
  });

  s.teste('quem entra na sala recebe o estado completo de cara', async () => {
    await comPorta(async ({ base, cab, entrar }) => {
      const sessao = await entrar();
      const r = await fetch(base + '/api/sala',
        { headers: cab({ authorization: `Bearer ${sessao}` }) });
      const f = lerFluxo(r);
      ok(await f.esperar(1), 'nenhum evento chegou pela porta da sala');
      const e = f.eventos[0];
      igual(e.tipo, 'estado', `o primeiro evento foi \`${e.tipo}\`, e devia ser o estado`);
      ok(e.dados && Array.isArray(e.dados.lutadores) && e.dados.lutadores.length === 12,
        'quem chegou no meio da janela não recebeu a rodada — recebeu ' +
        JSON.stringify(e.dados)?.slice(0, 120));
      f.fechar();
    });
  });

  s.teste('um servidor que só subiu já tem rodada, sem ninguém pedir', async () => {
    await comPorta(async ({ base, cab }) => {
      /* É o `principal.mjs` inteiro: cria e ouve. Se isto precisar de mais uma
         linha em algum lugar, é uma linha que produção vai esquecer — do F1.5
         ao F1.13 ela foi esquecida, e a rota respondia `null` para sempre. */
      const r = await fetch(base + '/api/rodada', { headers: cab() });
      const corpo = await r.json();
      ok(corpo.rodada && corpo.rodada.fase,
        'um servidor recém-subido respondeu `{ rodada: null }`. O laço não liga ' +
        'sozinho, e ligar à mão é a garantia que depende de lembrança.');
    });
  });

  s.teste('a virada de fase chega pela porta a quem está na sala', async () => {
    await comPorta(async ({ base, cab, entrar, avancar }) => {
      const sessao = await entrar();
      const r = await fetch(base + '/api/sala',
        { headers: cab({ authorization: `Bearer ${sessao}` }) });
      const f = lerFluxo(r);
      ok(await f.esperar(1), 'o estado inicial não chegou');
      /* O relógio do servidor pula a janela de aposta inteira. O laço tem que
         perceber sozinho, no próprio ritmo. */
      avancar(FASE_MS.APOSTA + 1);
      ok(await f.esperar(2),
        'a janela de aposta fechou no servidor e ninguém na sala soube. É o ' +
        'laço girando sem porta, que foi o estado do projeto até aqui.');
      const e = f.eventos[1];
      igual(e.tipo, 'fase', `chegou um \`${e.tipo}\` no lugar da virada de fase`);
      igual(e.dados.fase, ESTADOS.TRAVADA, `a fase que chegou foi \`${e.dados.fase}\``);
      ok(e.dados.revelado?.sal, 'a virada chegou sem o reveal do §4.5');
      f.fechar();
    });
  });

  s.teste('fechar o servidor para o laço', async () => {
    const s2 = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                               banco: ':memory:', sims: 500 });
    await s2.ouvir(0);
    ok(s2.laco.ligado(), 'o laço não estava girando com o servidor no ar');
    await s2.fechar();
    ok(!s2.laco.ligado(),
      'o laço continuou girando depois de o servidor fechar. Ele ticka um ' +
      'scheduler cujo banco já foi fechado, e o erro sai em silêncio a cada ' +
      '250 ms.');
  });

  return s;
}
