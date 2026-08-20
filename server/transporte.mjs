/* TRANSPORTE REALTIME — a sala, o estado e a reconexão (F1.6).
 *
 * Fronteira: entrega o estado da rodada a quem está assistindo. Não decide
 * nada — o scheduler decide, isto transmite.
 *
 * ── SSE E NÃO WEBSOCKET, e a escolha é declarada ───────────────────────────
 *
 * O Node não traz servidor WebSocket. Implementá-lo à mão seria handshake,
 * enquadramento, mascaramento, ping/pong e fechamento — algumas centenas de
 * linhas de protocolo binário para uma superfície nova, num projeto cuja regra
 * é zero dependências.
 *
 * E o tráfego aqui é de UMA VIA. O servidor empurra: fase, relógio, odds,
 * eventos da luta. O cliente fala por POST — apostar, cancelar —, e essas são
 * operações que precisam de resposta, código de erro e retentativa, ou seja,
 * exatamente o que HTTP faz bem. Um canal bidirecional resolveria um problema
 * que não temos e traria enquadramento próprio para o que já é resolvido.
 *
 * SSE ainda traz de graça o que mais custaria escrever: **reconexão automática
 * do navegador** e **`Last-Event-ID`**, que é o mecanismo de retomada do próprio
 * protocolo. O §5.9 pede que "queda e volta recuperem o estado"; com SSE isso é
 * o comportamento padrão, não código nosso.
 *
 * O que se perde: mensagem do cliente pelo mesmo canal, e binário. Nenhum dos
 * dois é usado na V1. Se a V2 precisar (mercado mútuo com ordens rápidas), a
 * troca é local — o resto do servidor não sabe qual transporte está embaixo.
 *
 * ── QUEM CHEGA ATRASADO PULA PARA O AGORA ──────────────────────────────────
 *
 * O primeiro evento de toda conexão é um `estado` COMPLETO, não um delta. Quem
 * conecta no segundo 22 da janela recebe a rodada inteira com 8 s restantes, e
 * não uma sequência de deltas para reconstruir. É o §5.9, e é também o que faz
 * a reconexão ser barata: reconectar é receber o estado de novo.
 */

const CABECALHOS_SSE = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-store',
  connection: 'keep-alive',
  /* Desliga o buffer de proxy reverso. Sem isto, um nginx na frente segura os
     eventos e o "tempo real" vira um lote a cada poucos segundos. */
  'x-accel-buffering': 'no',
};

export function criarSala({ agora = Date.now } = {}) {
  /* Conexões vivas. `Map` e não array: sair é O(1), e sair acontece muito mais
     que entrar quando uma rodada termina e metade da sala fecha a aba. */
  const conexoes = new Map();
  let proximoId = 1;
  let ultimoEvento = 0;
  /* Histórico curto para a retomada por `Last-Event-ID`. CURTO de propósito:
     ele existe para cobrir uma queda de rede de segundos, não para reconstruir
     a rodada — quem volta depois disso recebe o estado completo, que é a
     resposta certa e mais barata que qualquer histórico. */
  const HISTORICO_MAX = 64;
  const historico = [];

  function entrar(req, res, { estadoInicial, userId = null }) {
    res.writeHead(200, CABECALHOS_SSE);
    const id = proximoId++;
    const con = { id, res, userId, desde: agora() };
    conexoes.set(id, con);

    /* RETOMADA: o cliente manda o último id que viu. Se ele estiver no
       histórico, mandamos o que faltou; senão, mandamos o estado completo. Os
       dois caminhos terminam com o cliente em dia — a diferença é só o custo. */
    const ultimoVisto = Number(req.headers['last-event-id']);
    const faltando = Number.isInteger(ultimoVisto)
      ? historico.filter(e => e.id > ultimoVisto) : null;

    if (faltando && faltando.length > 0 && faltando.length < HISTORICO_MAX) {
      for (const e of faltando) escrever(con, e);
    } else {
      escrever(con, { id: ++ultimoEvento, tipo: 'estado', dados: estadoInicial });
    }

    /* Fechar é responsabilidade da conexão, e o `close` do socket é o único
       sinal confiável — `res.finished` mente quando o cliente some sem FIN. */
    req.on('close', () => { conexoes.delete(id); });
    return id;
  }

  /* Empurra para todos. `filtro` existe para o F1.7 poder mandar o resultado de
     UMA aposta só para o dono dela — nunca para a sala. */
  function transmitir(tipo, dados, filtro = null) {
    const evento = { id: ++ultimoEvento, tipo, dados };
    if (!filtro) {
      historico.push(evento);
      while (historico.length > HISTORICO_MAX) historico.shift();
    }
    let entregues = 0;
    for (const con of conexoes.values()) {
      if (filtro && !filtro(con)) continue;
      if (escrever(con, evento)) entregues++;
    }
    return { id: evento.id, entregues };
  }

  /* Uma escrita que falha DERRUBA a conexão, e não a transmissão.
     Sem este try, um socket morto no meio da sala impede todo mundo depois dele
     de receber o evento — e o sintoma é "metade da sala congelou". */
  function escrever(con, evento) {
    try {
      con.res.write(`id: ${evento.id}\nevent: ${evento.tipo}\n` +
                    `data: ${JSON.stringify(evento.dados)}\n\n`);
      return true;
    } catch { conexoes.delete(con.id); return false; }
  }

  /* Batimento. Proxies e balanceadores fecham conexão ociosa, e uma janela de
     aposta sem nenhum evento novo dura dezenas de segundos. O comentário `:`
     é ignorado pelo cliente e mantém o socket vivo. */
  function bater() {
    for (const con of conexoes.values()) {
      try { con.res.write(`: ping\n\n`); } catch { conexoes.delete(con.id); }
    }
    return conexoes.size;
  }

  function fecharTodas() {
    for (const con of conexoes.values()) { try { con.res.end(); } catch {} }
    conexoes.clear();
  }

  return {
    entrar, transmitir, bater, fecharTodas,
    quantos: () => conexoes.size,
    ultimoId: () => ultimoEvento,
    /* Só para teste e para o painel de ADM: quem está na sala, sem expor o
       objeto `res`, que é um socket e não deve circular. */
    presentes: () => [...conexoes.values()].map(c => ({ id: c.id, userId: c.userId, desde: c.desde })),
  };
}
