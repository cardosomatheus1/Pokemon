/* Q1/Q6/Q8 · TRANSPORTE — sala, sincronia e reconexão (F1.6).
 *
 * AS AFIRMAÇÕES DO §5.8 e §5.9:
 *
 *   1. Todos veem a MESMA rodada no MESMO instante — o evento sai uma vez e
 *      chega igual a todo mundo.
 *   2. Quem chega atrasado PULA para o momento atual: a primeira coisa que
 *      qualquer conexão recebe é o estado COMPLETO, não um delta.
 *   3. Queda e volta recuperam o estado, e sem duplicar o que já foi visto.
 *
 * E o Q6: ninguém recebe evento dirigido a outro usuário, e uma conexão morta
 * não derruba a sala.
 *
 * O `res` FALSO é de propósito. Levantar um servidor de verdade provaria o
 * mesmo e custaria segundos por teste; o que importa aqui é a lógica da sala, e
 * ela não sabe o que é um socket. O caminho HTTP inteiro já é exercitado em
 * `test/servidor.mjs`.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarSala } from '../server/transporte.mjs';

/* Um `res` que guarda o que foi escrito, e um `req` que sabe fechar. */
function falso(lastEventId = null) {
  const escrito = [];
  let aoFechar = null;
  return {
    req: { headers: lastEventId ? { 'last-event-id': String(lastEventId) } : {},
           on: (ev, fn) => { if (ev === 'close') aoFechar = fn; } },
    res: { writeHead: () => {}, write: t => { escrito.push(t); return true; }, end: () => {} },
    escrito,
    cair: () => aoFechar && aoFechar(),
    eventos: () => escrito.filter(t => t.startsWith('id:')).map(t => {
      const id = Number(t.match(/^id: (\d+)/)[1]);
      const tipo = t.match(/event: (\w+)/)[1];
      const dados = JSON.parse(t.match(/data: (.*)\n\n$/s)[1]);
      return { id, tipo, dados };
    }),
  };
}

const entrar = (sala, c, extra = {}) =>
  sala.entrar(c.req, c.res, { estadoInicial: { fase: 'aberta', restam: 8000 }, ...extra });

export function suite() {
  const s = criarSuite('transporte');

  /* --- §5.8: todos veem o mesmo ------------------------------------------ */

  s.teste('o evento sai uma vez e chega IGUAL para todos', () => {
    const sala = criarSala();
    const a = falso(), b = falso(), c = falso();
    entrar(sala, a); entrar(sala, b); entrar(sala, c);
    const r = sala.transmitir('fase', { fase: 'travada' });
    igual(r.entregues, 3, `${r.entregues} de 3 conexões receberam`);
    const [ea, eb, ec] = [a, b, c].map(x => x.eventos().at(-1));
    igual(JSON.stringify(ea), JSON.stringify(eb), 'duas conexões receberam coisas diferentes');
    igual(JSON.stringify(eb), JSON.stringify(ec), 'a terceira recebeu coisa diferente');
    igual(ea.dados.fase, 'travada', 'o conteúdo não chegou');
  });

  s.teste('o id do evento é único e crescente na sala inteira', () => {
    const sala = criarSala();
    const a = falso(); entrar(sala, a);
    sala.transmitir('x', {}); sala.transmitir('y', {}); sala.transmitir('z', {});
    const ids = a.eventos().map(e => e.id);
    igual(ids.length, 4, 'faltou evento (o estado inicial conta)');
    for (let i = 1; i < ids.length; i++)
      ok(ids[i] > ids[i - 1], `ids fora de ordem: ${ids.join(',')}`);
  });

  /* --- §5.9: quem chega atrasado ----------------------------------------- */

  s.teste('a PRIMEIRA coisa que uma conexão recebe é o estado COMPLETO', () => {
    const sala = criarSala();
    /* A rodada já anda: três eventos aconteceram antes de este cliente chegar. */
    const velho = falso(); entrar(sala, velho);
    sala.transmitir('tick', { t: 1 });
    sala.transmitir('tick', { t: 2 });
    sala.transmitir('tick', { t: 3 });

    const novo = falso();
    sala.entrar(novo.req, novo.res, { estadoInicial: { fase: 'aberta', restam: 8000, odds: [1, 2] } });
    const primeiro = novo.eventos()[0];
    igual(primeiro.tipo, 'estado',
      `o primeiro evento de uma conexão nova foi "${primeiro.tipo}". Quem chega ` +
      `no segundo 22 precisa PULAR para o agora, não reconstruir por deltas.`);
    igual(primeiro.dados.restam, 8000, 'o estado veio incompleto');
    igual(novo.eventos().length, 1, 'a conexão nova recebeu o histórico inteiro em vez do estado');
  });

  /* --- reconexão ---------------------------------------------------------- */

  s.teste('reconectar com Last-Event-ID recebe SÓ o que faltou', () => {
    const sala = criarSala();
    const a = falso(); entrar(sala, a);
    sala.transmitir('tick', { t: 1 });
    const idVisto = a.eventos().at(-1).id;
    sala.transmitir('tick', { t: 2 });
    sala.transmitir('tick', { t: 3 });

    /* O cliente caiu depois do t:1 e volta dizendo o que viu. */
    a.cair();
    const volta = falso(idVisto);
    sala.entrar(volta.req, volta.res, { estadoInicial: { fase: 'aberta', restam: 1 } });
    const recebidos = volta.eventos();
    igual(recebidos.length, 2, `recebeu ${recebidos.length} eventos, esperado os 2 que faltaram`);
    igual(recebidos[0].dados.t, 2, 'a retomada começou no evento errado');
    ok(!recebidos.some(e => e.dados.t === 1),
      'a retomada REPETIU um evento que o cliente já tinha visto');
  });

  s.teste('reconectar de muito longe recebe o ESTADO, não um histórico gigante', () => {
    const sala = criarSala();
    const a = falso(); entrar(sala, a);
    for (let i = 0; i < 200; i++) sala.transmitir('tick', { t: i });
    /* Voltou dizendo que viu o evento 1 — muito antes do que o histórico guarda. */
    const volta = falso(1);
    sala.entrar(volta.req, volta.res, { estadoInicial: { fase: 'emLuta', restam: 0 } });
    const r = volta.eventos();
    igual(r.length, 1, `recebeu ${r.length} eventos ao voltar de longe`);
    igual(r[0].tipo, 'estado',
      'a retomada de longe tentou reconstruir por deltas. O estado completo é mais ' +
      'barato E mais correto — o histórico curto é para queda de segundos.');
  });

  s.teste('sair de verdade libera a vaga', () => {
    const sala = criarSala();
    const a = falso(), b = falso();
    entrar(sala, a); entrar(sala, b);
    igual(sala.quantos(), 2, 'a sala não contou as duas');
    a.cair();
    igual(sala.quantos(), 1, 'a conexão que caiu continua na sala — vazamento de socket');
  });

  /* --- Q6 ----------------------------------------------------------------- */

  s.teste('evento dirigido a um usuário NÃO vaza para a sala', () => {
    const sala = criarSala();
    const meu = falso(), outro = falso();
    entrar(sala, meu, { userId: 'u1' });
    entrar(sala, outro, { userId: 'u2' });
    const antes = outro.eventos().length;
    sala.transmitir('meuResultado', { ganhou: true, payout: 500 }, c => c.userId === 'u1');
    igual(meu.eventos().at(-1).dados.payout, 500, 'o dono não recebeu o próprio resultado');
    igual(outro.eventos().length, antes,
      'o resultado de UM usuário foi para a sala inteira — todo mundo vê quanto ' +
      'cada um ganhou, e o §5.6 diz uma posição por usuário, não uma vitrine');
  });

  s.teste('evento dirigido NÃO entra no histórico da sala', () => {
    const sala = criarSala();
    const meu = falso(); entrar(sala, meu, { userId: 'u1' });
    const idAntes = sala.ultimoId();
    sala.transmitir('meuResultado', { payout: 999 }, c => c.userId === 'u1');
    /* Quem reconectar depois não pode receber o dirigido pelo histórico — seria
       o mesmo vazamento entrando pela porta da retomada. */
    const novo = falso(idAntes);
    sala.entrar(novo.req, novo.res, { estadoInicial: { fase: 'aberta' }, userId: 'u2' });
    const json = JSON.stringify(novo.eventos());
    ok(!json.includes('999'),
      'o evento dirigido saiu no histórico da retomada — o vazamento entrou pela ' +
      'porta dos fundos');
  });

  /* --- Q8: uma conexão morta não derruba a sala -------------------------- */

  s.teste('um socket morto no meio da sala não impede os outros de receber', () => {
    const sala = criarSala();
    const a = falso(), morto = falso(), c = falso();
    entrar(sala, a); entrar(sala, morto); entrar(sala, c);
    /* Simula o socket que já foi embora sem FIN: escrever lança. */
    morto.res.write = () => { throw new Error('EPIPE'); };
    const r = sala.transmitir('fase', { fase: 'emLuta' });
    igual(r.entregues, 2, `${r.entregues} entregues; o socket morto devia ser o único perdido`);
    igual(a.eventos().at(-1).dados.fase, 'emLuta', 'a conexão ANTES do socket morto não recebeu');
    igual(c.eventos().at(-1).dados.fase, 'emLuta',
      'a conexão DEPOIS do socket morto não recebeu — um socket morto congelou ' +
      'metade da sala');
    igual(sala.quantos(), 2, 'o socket morto continua na sala');
  });

  s.teste('cem conexões recebem todas, e o custo não explode', () => {
    const sala = criarSala();
    const todos = Array.from({ length: 100 }, () => falso());
    todos.forEach(c => entrar(sala, c));
    const r = sala.transmitir('fase', { fase: 'travada' });
    igual(r.entregues, 100, `${r.entregues} de 100`);
    /* O critério do §5.14: cem observadores sem divergência funcional. */
    const primeiro = JSON.stringify(todos[0].eventos().at(-1));
    for (const c of todos)
      igual(JSON.stringify(c.eventos().at(-1)), primeiro, 'uma das cem divergiu');
  });

  s.teste('o batimento mantém a conexão viva e remove a morta', () => {
    const sala = criarSala();
    const vivo = falso(), morto = falso();
    entrar(sala, vivo); entrar(sala, morto);
    morto.res.write = () => { throw new Error('EPIPE'); };
    igual(sala.bater(), 1, 'o batimento não removeu a conexão morta');
    ok(vivo.escrito.some(t => t.startsWith(': ')),
      'a conexão viva não recebeu batimento — proxy fecha conexão ociosa, e uma ' +
      'janela de aposta passa dezenas de segundos sem evento novo');
  });

  return s;
}
