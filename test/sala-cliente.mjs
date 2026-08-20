/* Q1/Q5/Q6 · A SALA DO LADO DO CLIENTE — e a reconexão que não perde nada (F1.14).
 *
 * ── POR QUE NÃO É `EventSource`, e a premissa do F1.6 que mudou ────────────
 *
 * O F1.6 escolheu SSE em parte porque "o navegador traz reconexão automática e
 * `Last-Event-ID` de graça". Traz — para o `EventSource`, que **não aceita
 * cabeçalho nenhum**. A sessão deste projeto viaja em `authorization: Bearer`
 * (F1.3) e a versão do contrato em `x-api-versao` (F1.1). Com `EventSource`,
 * as duas teriam que ir na URL.
 *
 * Token em query string entra em log de acesso, em `Referer` e no histórico do
 * navegador. É o tipo de vazamento que não dá erro em lugar nenhum e aparece
 * meses depois, num log que alguém copiou.
 *
 * Então o fluxo é lido com `fetch` + `ReadableStream`, que aceita cabeçalho. O
 * formato na rede continua sendo SSE — o servidor não muda uma linha. O que se
 * perde é a reconexão automática, e ela ia ter que ser escrita de qualquer
 * forma: o §5.9 pede uma TELA de reconexão, e o `EventSource` reconecta por
 * baixo sem contar para ninguém.
 *
 * ── A REGRA QUE ORGANIZA O ARQUIVO ─────────────────────────────────────────
 *
 *     **rede caída não é permissão para inventar rodada.**
 *
 * É o primeiro item da sabotagem declarada do F1.14. Um cliente que sorteia a
 * própria rodada quando o servidor some está apostando dinheiro de verdade
 * contra números que ninguém publicou.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarSalaCliente, ESTADO_SALA } from '../app/modules/sala.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { FASE_MS } from '../server/scheduler.mjs';

const SENHA = 'senha-longa-o-bastante-1';

async function comServidor(fn) {
  let t = 1_700_000_000_000;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                            banco: ':memory:', sims: 500, relogio: () => t });
  const porta = await s.ouvir(0);
  const base = `http://127.0.0.1:${porta}`;
  const r = await fetch(base + '/api/auth/cadastrar', {
    method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'j', email: 'j@exemplo.test', senha: SENHA,
                           nascimento: '1990-01-01' }) });
  const { sessao } = await r.json();
  try { return await fn({ s, base, sessao, avancar: ms => { t += ms; } }); }
  finally { await s.fechar(); }
}

/* Espera por CONDIÇÃO. O teto faz o teste falhar em vez de pendurar a suíte;
   ele não é a medida de nada (D-016). */
/* O TETO É BAIXO DE PROPÓSITO. Tudo aqui é localhost; 3 s é uma eternidade
   para um socket que não sai da máquina. O teto grande só aparece quando o
   teste FALHA — e uma suíte vermelha de dez testes a 8 s cada custa mais de um
   minuto por mutante na sabotagem. */
async function ate(cond, oQue, tetoMs = 3000) {
  const fim = Date.now() + tetoMs;
  while (!cond() && Date.now() < fim) await new Promise(r => setTimeout(r, 10));
  ok(cond(), `esperei ${oQue} e não veio`);
}

function coletor() {
  const eventos = [], estados = [];
  return { eventos, estados,
           aoEvento: e => eventos.push(e),
           aoEstado: e => estados.push(e) };
}

export function suite() {
  const s = criarSuite('sala-cliente');

  s.teste('entrar na sala traz o estado e acende o "no ar"', async () => {
    await comServidor(async ({ base, sessao }) => {
      const c = coletor();
      const sala = criarSalaCliente({ base, token: () => sessao, ...c });
      sala.entrar();
      await ate(() => c.eventos.length > 0, 'o primeiro evento');
      igual(c.eventos[0].tipo, 'estado', 'o primeiro evento não foi o estado completo');
      igual(c.eventos[0].dados.lutadores.length, 12, 'o estado veio sem os lutadores');
      await ate(() => sala.estado() === ESTADO_SALA.NO_AR, 'o estado `no ar`');
      ok(c.estados.includes(ESTADO_SALA.CONECTANDO),
        'a tela nunca soube que estava conectando — e é uma das três telas que ' +
        'o §5.9 pede');
      sala.sair();
    });
  });

  s.teste('a virada de fase chega sem ninguém perguntar', async () => {
    await comServidor(async ({ base, sessao, avancar }) => {
      const c = coletor();
      const sala = criarSalaCliente({ base, token: () => sessao, ...c });
      sala.entrar();
      await ate(() => c.eventos.length > 0, 'o estado inicial');
      avancar(FASE_MS.APOSTA + 1);
      await ate(() => c.eventos.length > 1, 'a virada de fase');
      igual(c.eventos[1].tipo, 'fase', 'o segundo evento não foi a fase');
      sala.sair();
    });
  });

  /* --- Q6: o que a queda NÃO pode fazer ---------------------------------- */

  s.teste('servidor fora do ar não vira rodada inventada', async () => {
    const c = coletor();
    /* Porta onde não há ninguém. É a rede caída de verdade, e não um erro
       simulado — o que se mede é o que o módulo FAZ, não o que ele captura. */
    const sala = criarSalaCliente({ base: 'http://127.0.0.1:1', token: () => 'x',
                                    ...c, esperaMs: () => 5 });
    sala.entrar();
    await ate(() => sala.estado() === ESTADO_SALA.SEM_REDE, 'o estado `sem rede`');
    igual(c.eventos.length, 0,
      'a sala entregou evento sem servidor nenhum do outro lado. Rede caída não ' +
      'é permissão para inventar rodada — quem apostar naquela rodada aposta ' +
      'contra números que ninguém publicou.');
    sala.sair();
  });

  s.teste('a sala tenta de novo sozinha, e diz que está tentando', async () => {
    const c = coletor();
    const sala = criarSalaCliente({ base: 'http://127.0.0.1:1', token: () => 'x',
                                    ...c, esperaMs: () => 5 });
    sala.entrar();
    await ate(() => sala.tentativas() >= 3, 'a terceira tentativa');
    ok(c.estados.filter(e => e === ESTADO_SALA.CONECTANDO).length >= 2,
      'a sala reconectou sem passar por `conectando`. A tela de reconexão do ' +
      '§5.9 existe porque o jogador precisa saber a diferença entre "parou" e ' +
      '"está voltando".');
    sala.sair();
  });

  s.teste('a espera entre tentativas CRESCE, e tem teto', () => {
    const sala = criarSalaCliente({ base: 'http://127.0.0.1:1', token: () => null });
    const e = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => sala.esperaDe(n));
    ok(e[0] < e[1] && e[1] < e[2] && e[2] < e[3],
      `a espera não cresce: ${e.slice(0, 4).join(', ')}. Sem recuo, mil abas ` +
      `voltando juntas derrubam o servidor que acabou de subir.`);
    ok(e.at(-1) <= 30_000,
      `a espera chegou a ${e.at(-1)} ms. Sem teto, o jogador que ficou dez ` +
      `minutos sem rede espera mais dez depois de ela voltar.`);
    ok(e[0] <= 1000, `a primeira tentativa espera ${e[0]} ms — queda de um ` +
      `segundo devia ser invisível`);
  });

  /* SAIR COM O FLUXO ABERTO, e não durante a espera — a diferença decide o
     teste. Saindo no meio da espera, o `clearTimeout` sozinho já basta e o
     defeito da sala fantasma passa despercebido; saindo com a conexão viva, o
     abort volta pelo `catch`, e é ali que a bandeira `ligada` é a única coisa
     que impede a sala de renascer. É também o caso de verdade: o jogador fecha
     a tela no meio da rodada, não no meio de uma queda de rede. */
  s.teste('sair com o fluxo ABERTO para de tentar', async () => {
    await comServidor(async ({ base, sessao }) => {
      const c = coletor();
      const sala = criarSalaCliente({ base, token: () => sessao, ...c, esperaMs: () => 5 });
      sala.entrar();
      await ate(() => sala.estado() === ESTADO_SALA.NO_AR, 'a conexão no ar');
      sala.sair();
      const antes = sala.tentativas();
      await new Promise(r => setTimeout(r, 80));
      igual(sala.tentativas(), antes,
        'a sala reconectou depois de `sair()`. Uma sala fantasma volta por trás ' +
        'da tela de resultado e reescreve a rodada por baixo do jogador.');
      igual(sala.estado(), ESTADO_SALA.PARADA, 'o estado não voltou para parada');
      igual(c.estados.at(-1), ESTADO_SALA.PARADA,
        'a tela não foi avisada de que a sala parou');
    });
  });

  s.teste('sair durante a espera também para', async () => {
    const c = coletor();
    const sala = criarSalaCliente({ base: 'http://127.0.0.1:1', token: () => 'x',
                                    ...c, esperaMs: () => 30 });
    sala.entrar();
    await ate(() => sala.estado() === ESTADO_SALA.SEM_REDE, 'a primeira falha');
    sala.sair();
    const antes = sala.tentativas();
    await new Promise(r => setTimeout(r, 100));
    igual(sala.tentativas(), antes,
      'a tentativa agendada acordou depois do `sair()` e conectou assim mesmo');
  });

  /* --- o quadro SSE, montado a partir do que a rede entrega --------------- */

  /* A REDE NÃO ENTREGA EVENTOS, ENTREGA BYTES. Um `data:` de doze lutadores
     passa de um pacote com facilidade, e o corte cai no meio do JSON. Testar
     com o servidor local não pega isto nunca — ali tudo chega inteiro —, então
     o corte é feito à mão. */
  function fluxoQueCorta(pedacos) {
    return () => Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(c) {
          const enc = new TextEncoder();
          for (const p of pedacos) c.enqueue(enc.encode(p));
          /* não fecha: um SSE de verdade fica aberto */
        },
      }),
    });
  }

  s.teste('evento cortado no meio pela rede chega inteiro', async () => {
    const c = coletor();
    const sala = criarSalaCliente({ base: '', token: () => 'x', ...c,
      esperaMs: () => 5,
      buscar: fluxoQueCorta(['id: 7\nevent: fase\ndata: {"fase":"tra',
                             'vada","lutadores":[1,2]}\n\n']) });
    sala.entrar();
    await ate(() => c.eventos.length > 0, 'o evento remontado');
    igual(c.eventos[0].dados.fase, 'travada',
      'o evento partido pela rede não foi remontado. Processar por chegada de ' +
      'pacote entrega JSON pela metade, e o parse quebra por um motivo que não ' +
      'é o verdadeiro.');
    igual(c.eventos[0].id, 7, 'o id do evento se perdeu no corte');
    sala.sair();
  });

  s.teste('o batimento do servidor não vira evento', async () => {
    const c = coletor();
    const sala = criarSalaCliente({ base: '', token: () => 'x', ...c,
      esperaMs: () => 5,
      buscar: fluxoQueCorta([': ping\n\n', ': ping\n\n',
                             'id: 1\nevent: fase\ndata: {"fase":"aberta"}\n\n']) });
    sala.entrar();
    await ate(() => c.eventos.length > 0, 'o evento depois dos batimentos');
    igual(c.eventos.length, 1,
      `chegaram ${c.eventos.length} eventos, e dois deles eram batimento. O ` +
      `comentário SSE existe para segurar o socket vivo em proxy — entregá-lo ` +
      `faz o app remontar a cena a cada quinze segundos.`);
    sala.sair();
  });

  s.teste('lixo no fluxo não faz a sala perder o evento seguinte', async () => {
    const c = coletor();
    const sala = criarSalaCliente({ base: '', token: () => 'x', ...c,
      esperaMs: () => 5,
      buscar: fluxoQueCorta(['event: fase\ndata: {isto não é json\n\n',
                             'id: 2\nevent: fase\ndata: {"fase":"aberta"}\n\n']) });
    sala.entrar();
    await ate(() => c.eventos.length > 0, 'o evento depois do lixo');
    igual(c.eventos[0].dados.fase, 'aberta',
      'um quadro ilegível derrubou a leitura, e o evento BOM que vinha logo ' +
      'atrás na mesma conexão se perdeu. A sala volta sozinha — mas volta ' +
      'depois, e o que estava no fio naquele instante não volta com ela.');
    sala.sair();
  });

  s.teste('reconectar depois de conectar recomeça o recuo do zero', async () => {
    await comServidor(async ({ base, sessao }) => {
      const c = coletor();
      const sala = criarSalaCliente({ base, token: () => sessao, ...c, esperaMs: () => 5 });
      sala.entrar();
      await ate(() => c.eventos.length > 0, 'o primeiro evento');
      igual(sala.tentativas(), 0,
        'a contagem de tentativas não zerou depois de conectar. Ela é o expoente ' +
        'do recuo: sem zerar, a queda seguinte de um jogador que ficou dez ' +
        'minutos fora já nasce esperando o teto.');
      sala.sair();
    });
  });

  /* --- a retomada -------------------------------------------------------- */

  s.teste('a reconexão manda o último id visto', async () => {
    await comServidor(async ({ base, sessao }) => {
      const vistos = [];
      /* Um `fetch` de mentira em volta do de verdade, só para LER o cabeçalho
         que sai. Envolver e não substituir: o que se mede é o pedido que o
         módulo monta, e ele continua indo para o servidor de verdade. */
      const espiao = (url, opc) => { vistos.push(opc?.headers || {}); return fetch(url, opc); };
      const c = coletor();
      const sala = criarSalaCliente({ base, token: () => sessao, ...c,
                                      buscar: espiao, esperaMs: () => 5 });
      sala.entrar();
      await ate(() => c.eventos.length > 0, 'o primeiro evento');
      sala.derrubar();                       // a rede cai no meio
      await ate(() => vistos.length >= 2, 'a segunda tentativa');
      const id = vistos.at(-1)['last-event-id'];
      ok(id,
        'a reconexão não mandou `last-event-id`. Sem ele o servidor devolve o ' +
        'estado inteiro — que funciona — mas o histórico do §5.9 deixa de ' +
        'servir para o que foi construído.');
      sala.sair();
    });
  });

  return s;
}
