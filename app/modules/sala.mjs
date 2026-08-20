/* A SALA, DO LADO DO CLIENTE — o fluxo do servidor e a reconexão (F1.14).
 *
 * Fronteira: entrega eventos e diz em que estado está a conexão. Não sabe o que
 * é rodada, aposta ou saldo — quem sabe é quem escuta.
 *
 * ── POR QUE NÃO É `EventSource`, e a premissa do F1.6 que mudou ────────────
 *
 * O F1.6 escolheu SSE em parte porque "o navegador traz reconexão automática e
 * `Last-Event-ID` de graça". Traz — para o `EventSource`, que **não aceita
 * cabeçalho nenhum**. A sessão deste projeto viaja em `authorization: Bearer`
 * (F1.3) e a versão do contrato em `x-api-versao` (F1.1); com `EventSource`, as
 * duas teriam que ir na URL.
 *
 * Token em query string entra em log de acesso, em `Referer` e no histórico do
 * navegador. É vazamento que não dá erro em lugar nenhum e aparece meses
 * depois, num log que alguém copiou para depurar outra coisa.
 *
 * Então o fluxo é lido com `fetch` + `ReadableStream`, que aceita cabeçalho. **O
 * formato na rede continua sendo SSE e o servidor não muda uma linha** — a
 * escolha do F1.6 continua valendo, só o leitor é outro.
 *
 * O que se perde é a reconexão automática. Ela ia ter que ser escrita de
 * qualquer jeito: o §5.9 pede uma TELA de reconexão, e o `EventSource`
 * reconecta por baixo sem contar para ninguém — o app saberia que caiu e nunca
 * saberia que está voltando.
 *
 * ── A REGRA QUE ORGANIZA O ARQUIVO ─────────────────────────────────────────
 *
 *     **rede caída não é permissão para inventar rodada.**
 *
 * Este módulo NÃO tem caminho que produza evento sem servidor do outro lado.
 * Sem rede ele diz `semRede` e cala — e quem escuta que decida o que mostrar.
 */

export const ESTADO_SALA = {
  PARADA:     'parada',       // ninguém pediu conexão
  CONECTANDO: 'conectando',   // pedindo, ou esperando para tentar de novo
  NO_AR:      'noAr',         // fluxo aberto, eventos chegando
  SEM_REDE:   'semRede',      // tentou e não achou ninguém
};

/* O RECUO É EXPONENCIAL COM TETO, e os dois lados importam.
 *
 * Sem recuo, o servidor que acabou de subir leva mil abas na cara no mesmo
 * segundo — a reconexão vira a segunda queda. Sem teto, quem ficou dez minutos
 * sem rede espera mais dez depois de ela voltar, olhando uma tela que já podia
 * estar jogando.
 *
 * A primeira tentativa é quase imediata de propósito: queda de um segundo —
 * troca de torre, wifi que oscila — tem que ser invisível. */
const ESPERA_BASE = 250;
const ESPERA_TETO = 15_000;
export const esperaPadrao = n => Math.min(ESPERA_BASE * 2 ** n, ESPERA_TETO);

export function criarSalaCliente({
  base = '', caminho = '/api/sala',
  token = () => null,
  versao = '1', cabecalhoVersao = 'x-api-versao',
  aoEvento = () => {}, aoEstado = () => {},
  buscar = (...a) => fetch(...a),
  esperaMs = esperaPadrao,
} = {}) {
  let estado = ESTADO_SALA.PARADA;
  let ligada = false;          // o que o app PEDIU
  let tentativas = 0;
  let ultimoId = null;
  let abortar = null;
  let agendado = null;

  const mudar = e => { if (e !== estado) { estado = e; aoEstado(e); } };

  async function conectar() {
    if (!ligada) return;
    tentativas++;
    mudar(ESTADO_SALA.CONECTANDO);
    const ctl = new AbortController();
    abortar = () => ctl.abort();
    try {
      const r = await buscar(base + caminho, {
        signal: ctl.signal,
        headers: {
          [cabecalhoVersao]: versao,
          ...(token() ? { authorization: `Bearer ${token()}` } : {}),
          /* A RETOMADA DO §5.9, e ela é do PROTOCOLO. O servidor tem histórico
             curto: se o id ainda estiver lá, chega só o que faltou; se não,
             chega o estado inteiro. Os dois caminhos terminam com o cliente em
             dia — a diferença é o custo. */
          ...(ultimoId ? { 'last-event-id': String(ultimoId) } : {}),
        },
      });
      if (!r.ok || !r.body) { return recuar(); }
      mudar(ESTADO_SALA.NO_AR);
      tentativas = 0;                       // conectou: o recuo recomeça do zero
      await ler(r.body);
      /* O FLUXO ACABOU. Só há dois motivos: o servidor fechou, ou a rede caiu.
         Nenhum dos dois é "acabou de propósito" — SSE não termina. */
      return recuar();
    } catch {
      return recuar();                       // inclui o abort do `sair()`
    }
  }

  async function ler(corpo) {
    const leitor = corpo.getReader();
    const dec = new TextDecoder();
    let resto = '';
    while (ligada) {
      const { done, value } = await leitor.read();
      if (done) break;
      resto += dec.decode(value, { stream: true });
      /* O QUADRO SSE TERMINA EM LINHA EM BRANCO, e só ali. Processar por
         chegada de pacote entregaria evento pela metade — o `data:` pode vir
         cortado no meio do JSON, e o parse quebraria por motivo que não é o
         verdadeiro. */
      let i;
      while ((i = resto.indexOf('\n\n')) >= 0) {
        const quadro = resto.slice(0, i);
        resto = resto.slice(i + 2);
        entregar(quadro);
      }
    }
    try { await leitor.cancel(); } catch { /* já morreu */ }
  }

  function entregar(quadro) {
    if (!quadro || quadro.startsWith(':')) return;     // batimento
    const id = quadro.match(/^id: (\d+)/m);
    const tipo = quadro.match(/^event: (\w+)/m);
    /* Sem `$` no fim de propósito: com a bandeira `s` o `.*` já vai até o fim
       do quadro, e um `$` solto num literal de regex faz o detector de símbolo
       não importado de `test/modulos.mjs` acusar uso do `$` do `dom.mjs` — o
       mascarador dele não entende literal de expressão regular, e diz isso no
       próprio comentário. Falso positivo é o lado certo de errar; evitá-lo aqui
       custa um caractere. */
    const dados = quadro.match(/^data: (.*)/ms);
    if (!tipo || !dados) return;
    let corpo;
    try { corpo = JSON.parse(dados[1]); } catch { return; }
    if (id) ultimoId = Number(id[1]);
    aoEvento({ id: ultimoId, tipo: tipo[1], dados: corpo });
  }

  function recuar() {
    abortar = null;
    if (!ligada) { mudar(ESTADO_SALA.PARADA); return; }
    /* SEM REDE, e não "conectando": a distinção é a tela. `conectando` é
       esperança, `semRede` é diagnóstico, e o jogador precisa dos dois em
       momentos diferentes. */
    mudar(ESTADO_SALA.SEM_REDE);
    agendado = setTimeout(conectar, esperaMs(tentativas));
    agendado?.unref?.();
  }

  return {
    entrar() { if (ligada) return; ligada = true; tentativas = 0; conectar(); },

    /* SAIR É DE VERDADE. Uma sala fantasma reconecta por trás da tela de
       resultado e reescreve a rodada por baixo do jogador. */
    sair() {
      ligada = false;
      if (agendado) clearTimeout(agendado);
      agendado = null;
      if (abortar) abortar();
      mudar(ESTADO_SALA.PARADA);
    },

    /* Derruba o fluxo SEM desligar: é a rede caindo, e a sala tem que voltar
       sozinha. Existe para o teste poder derrubar de propósito — e derrubar de
       propósito é a única forma de provar que a volta funciona. */
    derrubar() { if (abortar) abortar(); },

    estado: () => estado,
    tentativas: () => tentativas,
    ultimoEvento: () => ultimoId,
    esperaDe: esperaMs,
  };
}
