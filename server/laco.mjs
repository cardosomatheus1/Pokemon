/* O LAÇO DO SERVIDOR — o motor que gira o scheduler e avisa a sala (F1.14).
 *
 * Fronteira: não decide nada. O scheduler decide quando a fase vira, a sala
 * decide como entregar; isto é só o que faz as duas acontecerem sem ninguém
 * pedir. É deliberadamente o arquivo mais burro do servidor.
 *
 * ── POR QUE ELE PRECISOU EXISTIR ───────────────────────────────────────────
 *
 * Do F1.5 até o F1.13 o backend teve scheduler autoritativo, sala com retomada,
 * aposta e settlement — e **nada em produção chamava `tick()`, nada nunca
 * chamou `transmitir()`**. As duas apareciam só em teste. Um servidor subido
 * pelo `principal.mjs` respondia `{ rodada: null }` para sempre.
 *
 * Terceira vez que o projeto encontra esta forma de defeito (S30, S53, L-033):
 * **testar a peça não testa o encaixe**.
 *
 * ── O INTERVALO É DE PRECISÃO, E NÃO DE CARGA ──────────────────────────────
 *
 * 250 ms não é a frequência dos eventos — o laço só transmite quando algo
 * MUDA, e numa rodada de 78 s isso são quatro eventos. O intervalo é o erro
 * máximo com que uma fase vira: com 1 s, a janela de aposta poderia fechar até
 * um segundo depois do que o relógio publicado prometeu, e o cliente que conta
 * regressiva chegaria a zero antes do servidor. Um quarto de segundo cabe
 * abaixo da percepção e custa quatro comparações de inteiro por segundo.
 */
import { ESTADOS } from './scheduler.mjs';

export const INTERVALO_MS = 250;

export function criarLaco({ sched, sala, intervalo = INTERVALO_MS, aoErro = null }) {
  let timer = null;
  let ultimo = null;          // { id, fase } — o que a sala já sabe
  let ultimoErro = null;

  /* O ANÚNCIO CARREGA O ESTADO INTEIRO, e nunca um delta.
   *
   * São doze lutadores; o custo é desprezível, e o que se compra é a classe
   * inteira de defeito "cliente e servidor discordam sobre a fase". Quem perdeu
   * um evento e recebeu o seguinte está em dia — sem reconciliação, sem
   * histórico, sem cuidado de ninguém.
   *
   * E o que sai é `paraCliente()`, que é lista branca campo a campo: a semente
   * não está nela enquanto a janela está aberta, e o campo que alguém
   * acrescentar amanhã não vaza porque não nasce incluído. */
  function anunciar(tipo, r) {
    ultimo = { id: r.id, fase: r.status };
    sala.transmitir(tipo, sched.paraCliente());
  }

  /* Um passo. Síncrono e idempotente: chamá-lo com o relógio parado não
     transmite nada, porque nada mudou. */
  function passo() {
    try {
      const r = sched.rodadaAtual();

      /* Não há rodada, ou a última encerrou E a sala já soube. Abrir agora. */
      if (!r || (fim(r.status) && ultimo?.id === r.id && ultimo.fase === r.status)) {
        anunciar('rodada', sched.abrirRodada());
        return;
      }

      sched.tick();
      /* MUDOU? A comparação é contra o que a SALA sabe, e não contra o que o
         passo anterior viu. São a mesma coisa hoje; se um dia deixarem de ser
         — outro caminho transmitindo, um teste chamando `tick` direto —, o que
         importa continua sendo o que chegou ao cliente. */
      if (ultimo?.id !== r.id || ultimo.fase !== r.status) anunciar('fase', r);

    } catch (e) {
      /* A EXCEÇÃO MORRE AQUI, e o motivo é o modo de falha do `setInterval`:
         um throw dentro do callback derruba o temporizador e não derruba o
         processo. O servidor fica de pé, respondendo a tudo, e o jogo para
         para sempre — o pior desligamento possível, porque não parece um.
         Registrado, nunca engolido: erro silencioso é defeito sem endereço. */
      ultimoErro = e;
      if (aoErro) aoErro(e);
      else console.error('[laço]', e);
    }
  }

  const fim = st => st === ESTADOS.ENCERRADA || st === ESTADOS.CANCELADA;

  function iniciar() {
    if (timer) return timer;              // idempotente: dois laços no mesmo
    timer = setInterval(passo, intervalo); // scheduler transmitem tudo em dobro
    timer.unref?.();                       // não segura o processo de pé sozinho
    passo();                               // a primeira rodada abre já
    return timer;
  }

  function parar() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { passo, iniciar, parar, ligado: () => timer !== null,
           ultimoErro: () => ultimoErro };
}
