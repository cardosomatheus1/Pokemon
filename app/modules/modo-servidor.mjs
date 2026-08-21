/* O MODO SERVIDOR DO CLIENTE (F1.14) — a sala, a rodada e o que a tela lê.
 *
 * Fronteira: traduz o que a sala entrega para as formas que o app já usa, e
 * guarda a última rodada. Não desenha nada, não decide regra nenhuma, e não
 * conhece DOM.
 *
 * ── OS DOIS MODOS SÃO COMPLETOS, E ISSO É DECISÃO ──────────────────────────
 *
 * Sem sessão o app joga sozinho, com a carteira local — ele nasceu
 * offline-first. O que não pode existir é o meio-termo: saldo vindo do servidor
 * e aposta ainda local seriam **duas fontes para o mesmo dinheiro**, que é pior
 * que qualquer um dos dois modos inteiros. Por isso este módulo é ligado ou
 * desligado inteiro, num lugar só.
 *
 * ── A DIVISÃO DE RELÓGIO, E ELA PRECISA ESTAR DITA ─────────────────────────
 *
 *     o servidor é dono do DINHEIRO e do RESULTADO
 *     o cliente é dono da ANIMAÇÃO
 *
 * O cliente não simula em paralelo: ele recebe a raiz revelada no fechamento e
 * reproduz a MESMA batalha, byte a byte — é a paridade do F1.1. O que ele
 * controla é só o ritmo com que aquilo aparece na tela. Se a animação
 * terminar meio segundo depois do servidor, ninguém perde nada: o settlement
 * já aconteceu lá, e a carteira é reidratada ao fim.
 *
 * ── RODADA VEM DA SALA, NUNCA DE SORTEIO LOCAL ─────────────────────────────
 *
 * **Rede caída não é permissão para inventar rodada** — é o primeiro item da
 * sabotagem declarada do bloco. Este módulo não tem caminho que produza rodada
 * sem evento do servidor: `esperarAbertura()` espera, e espera para sempre se
 * for preciso. Quem mostra isso ao jogador é a tela de conexão.
 */
import { criarSalaCliente, ESTADO_SALA } from './sala.mjs';
import { sementes } from '../../engine/seed.mjs';

let sala = null;
let ultima = null;                 // a última rodada que a sala entregou
let estado = ESTADO_SALA.PARADA;
const esperandoAbertura = [];      // quem chamou `esperarAbertura()` e aguarda
let aoTrocarFase = () => {};
let aoTrocarEstado = () => {};

/* ── A TRADUÇÃO PARA A FORMA QUE O APP JÁ LÊ ────────────────────────────────
 *
 * O app lê cinco coisas de `S.odds`: `lutadores` (por índice, por `find` e em
 * fatia), `sims` e `margemConfigurada`. O que o servidor publica tem outros
 * nomes para as mesmas coisas.
 *
 * O QUE NÃO É PREENCHIDO FICA AUSENTE, e isso é decisão. `overround`,
 * `viesPior`, `tetoOdd` e os demais campos do registro do §4.4.5 não vêm no
 * evento — inventá-los aqui seria o cliente publicando número que ninguém
 * calculou. Ausente, quem precisar deles falha alto; chutado, alguém desenha
 * um gráfico com eles. */
export function oddsDoServidor(rodada) {
  return {
    sims: rodada.sims,
    /* `idx` e não `slot`: é o nome que o motor usa, e é por ele que o app
       encontra o lutador. Traduzir aqui evita espalhar a diferença. */
    lutadores: rodada.lutadores.map((l, i) => ({
      idx: l.slot, dex: l.dex, nome: l.nome,
      prob: l.prob, erroRelativo: l.erroRelativo,
      odd: l.odd, stakeMax: l.stakeMax, limite: l.limite,
    })),
    /* A MARGEM QUE A TELA MOSTRA É A EFETIVA, e o servidor só publica essa.
       Mostrar a configurada seria mostrar a intenção em vez do preço — e a
       diferença entre as duas é justamente o que o §4.4.5 manda auditar. */
    margemConfigurada: rodada.margemEfetiva,
    margemEfetiva: rodada.margemEfetiva,
    erroPior: rodada.erroPior,
    versaoMotor: rodada.versaoMotor,
  };
}

/* ── O CICLO ────────────────────────────────────────────────────────────── */

export function ligar({ base = '', token, aoFase = () => {}, aoEstado = () => {} } = {}) {
  if (sala) return sala;
  aoTrocarFase = aoFase;
  aoTrocarEstado = aoEstado;
  sala = criarSalaCliente({
    base, token,
    aoEvento: ev => {
      /* `estado`, `rodada` e `fase` trazem todos o mesmo payload — o estado
         completo. É de propósito: quem perdeu um evento e recebeu o seguinte
         está em dia, sem reconciliar nada. */
      if (!ev.dados || !ev.dados.id) return;
      const antes = ultima;
      ultima = ev.dados;
      if (!antes || antes.id !== ultima.id) soltarEsperas(ultima);
      if (!antes || antes.id !== ultima.id || antes.fase !== ultima.fase)
        aoTrocarFase(ultima, antes);
    },
    aoEstado: e => { estado = e; aoTrocarEstado(e); },
  });
  sala.entrar();
  return sala;
}

export function desligar() {
  if (sala) sala.sair();
  sala = null; ultima = null;
  estado = ESTADO_SALA.PARADA;
  /* As esperas pendentes NÃO são resolvidas com valor nenhum: quem esperava
     uma rodada e teve o modo desligado não deve receber uma rodada falsa. */
  esperandoAbertura.length = 0;
}

function soltarEsperas(r) {
  if (r.fase !== 'aberta') return;
  while (esperandoAbertura.length) esperandoAbertura.shift()(r);
}

/* A PRÓXIMA RODADA ABERTA. Se já há uma aberta agora, devolve na hora; senão
   espera pelo evento. Nunca inventa e nunca desiste — desistir aqui seria o
   app caindo para o sorteio local, que é o defeito que o bloco existe para
   tornar impossível. */
export function esperarAbertura() {
  if (ultima && ultima.fase === 'aberta') return Promise.resolve(ultima);
  return new Promise(res => esperandoAbertura.push(res));
}

export const rodadaViva = () => ultima;
export const conexao = () => estado;
export const ligado = () => sala !== null;
export const esperando = () => esperandoAbertura.length;

/* ── O CLIENTE CONFERE O QUE JÁ TINHA (F1.14) ───────────────────────────────
 *
 * Durante a janela o cliente desenhou a pool a partir de `sementeElenco`. No
 * fechamento chega a raiz. Se a raiz revelada NÃO reproduz aquela semente, o
 * servidor mostrou uma rodada e jogou outra — e esta é a única hora em que dá
 * para perceber, porque depois só existe a batalha.
 *
 * A AUDITORIA DO §25.2 NÃO PEGA ISSO. Ela confere que a raiz bate com o
 * commit, e bateria: o que divergiu foi o que o cliente VIU. É uma checagem
 * diferente, e ela tem que morar do lado de cá.
 *
 * MORA AQUI, E NÃO NO `fases.mjs`, por dois motivos. É a regra da relação com
 * o servidor, que é o que este módulo é; e dentro da máquina de fases ela só
 * seria alcançável por um navegador — foi assim que o defeito plantado S256
 * escapou da suíte inteira na primeira passada.
 *
 * Devolve a árvore COMPLETA quando confere, e `null` quando não. Nunca lança:
 * quem chama precisa decidir o que mostrar ao jogador, e uma exceção no meio
 * do fechamento derrubaria a tela em vez de explicá-la. */
export function arvoreConferida(raiz, sementeElencoUsada) {
  if (!raiz) return null;
  const completa = sementes(raiz);
  if (completa.elenco !== sementeElencoUsada) return null;
  return completa;
}
