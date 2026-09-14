/* O HUD DA CENA — informação DENTRO do mundo (bloco 1.17, camada 4).
 *
 * ── O PEDIDO, E O QUE ELE NÃO ERA ────────────────────────────────────────
 *
 *   > "como se nosso cenário fosse uma tela tecnológica voltada para nosso tema
 *   >  cyberpunk/neon e contenha algumas informações nela como progressão, time
 *   >  atual, tempo restante [...] sem atrapalhar em nada, e sem tirar as
 *   >  informações que já temos abaixo"
 *
 * Duas coisas importam nessa frase, e a segunda é a que decide o desenho:
 *
 *   ACRESCENTA, não substitui   os painéis de baixo continuam donos do detalhe.
 *                               Aqui vive só o que se lê de RELANCE.
 *   SEM ATRAPALHAR              e "atrapalhar" tem endereço: o meio da cena é
 *                               por onde o treinador anda.
 *
 * ── ENTÃO O HUD MORA NOS CANTOS, E O MEIO FICA VAZIO ─────────────────────
 *
 *     ┌─ bioma ─────────────────────────────── zoom ─┐
 *     │  progresso · falta 1h40                      │
 *     │                                              │
 *     │              (o mundo, livre)                │
 *     │                                              │
 *     │  equipe                              mochila │
 *     └──────────────────────────────────────────────┘
 *
 * É a composição que já valia para o zoom e o nome do bioma; o resto do HUD
 * apenas ocupa os cantos que sobraram, em vez de inventar uma barra nova.
 *
 * ── O TEMA NÃO É ENFEITE: É A REGRA DO PROJETO ───────────────────────────
 *
 * **O mundo é GBA. A interface é neon.** A fronteira entre os dois é dura de
 * propósito, e é a que o dono já reprovou duas vezes nas prévias ("parecem
 * estar SOBRE o cenário"). Um HUD é neon POR CIMA do mundo, e a única forma de
 * ele não parecer colado é ele se assumir como vidro:
 *
 *     fundo translúcido e escuro, e não uma caixa opaca
 *     borda de 1 px na cor do bioma — o HUD veste o lugar onde está
 *     cantoneiras, que é o que diz "isto é uma tela" sem escrever nada
 *     tipografia de pixel, minúscula, alinhada à grade de 16
 *
 * ── E ELE SOME QUANDO NÃO TEM O QUE DIZER ────────────────────────────────
 *
 * Sem expedição em campo naquele bioma, a barra de progresso não aparece —
 * não fica em zero. Um medidor parado em zero ensina que o medidor é enfeite,
 * e é a mesma lição do número que nunca anda (bloco 1.14).
 */
import { PACK } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { estiloItem, temIcone as temIconeItem } from './itens-icone.mjs';

/* Quantos cabem em cada canto antes de o HUD virar painel. Medido no palco de
   ~940 px: acima disto a fila encosta no meio, e o meio é do treinador. */
export const EQUIPE_NO_HUD = 3;
export const ITENS_NO_HUD = 5;

/* ── QUANTO FALTA, EM PALAVRA DE GENTE ──────────────────────────────────── */
export function faltaCurto(ms) {
  const min = Math.max(0, Math.ceil(ms / 60000));
  if (min <= 0) return 'pronta';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/* A fração já andada. Devolve `null` quando não há expedição — e `null` é o que
   faz a barra SUMIR em vez de aparecer zerada. */
export function progressoDa(x, agora) {
  if (!x || !x.iniciadaEm || !x.terminaEm) return null;
  const total = x.terminaEm - x.iniciadaEm;
  if (total <= 0) return null;
  return Math.max(0, Math.min(1, (agora - x.iniciadaEm) / total));
}

/* ── O QUE A MOCHILA MOSTRA NO CANTO ──────────────────────────────────────
 *
 * Os de MAIOR quantidade, e não os primeiros da bolsa. A ordem de inserção é
 * acidente de implementação; a quantidade é informação. E a moeda entra sempre,
 * porque "quanto eu tenho" é a pergunta que mais se faz de relance. */
export function itensDoHud(bolsa, moeda = 'pokecoin', quantos = ITENS_NO_HUD) {
  const todos = Object.entries(bolsa ?? {})
    .filter(([id, n]) => n > 0 && id !== moeda);
  todos.sort((a, b) => b[1] - a[1]);
  const fora = [];
  if ((bolsa?.[moeda] ?? 0) > 0) fora.push([moeda, bolsa[moeda]]);
  return [...fora, ...todos].slice(0, quantos);
}

const arteDoItem = id => {
  const est = temIconeItem(id) ? estiloItem(id, 22) : null;
  return est ? `<i style="${est}"></i>` : '<u class="hudSemArte">?</u>';
};

/* ── O DESENHO ────────────────────────────────────────────────────────────
 *
 * Recebe TUDO por parâmetro. Não lê estado, não lê relógio: é o que deixa o
 * HUD ser desenhável num teste sem save e sem navegador — e é a mesma divisão
 * que já governa a planta do mundo (a decisão é pura; o traço é fino). */
export function montar({ expedicao, equipe, bolsa, moeda, cor, agora }) {
  const p = progressoDa(expedicao, agora);
  const falta = expedicao ? faltaCurto(expedicao.terminaEm - agora) : null;

  const barra = p === null ? '' : `
    <div class="hudLinha hudProg">
      <span class="hudRotulo">expedição</span>
      <i class="hudBarra"><b style="width:${(p * 100).toFixed(1)}%"></b></i>
      <span class="hudNum">${falta}</span>
    </div>`;

  const fila = (equipe ?? []).slice(0, EQUIPE_NO_HUD).map(c => {
    const est = estiloIcone(PACK, c.dex, 30);
    const st = Math.max(0, Math.min(100, Math.round(c.stamina ?? 100)));
    return `
      <span class="hudCria" title="${c.nome ?? ''} · NV ${c.nivel ?? 1} · ${st}% de energia">
        ${est ? `<i style="${est}"></i>` : '<u class="hudSemArte">?</u>'}
        <s class="hudStam"><b style="width:${st}%"></b></s>
        <em class="hudRaio" aria-hidden="true">⚡</em>
      </span>`;
  }).join('');

  const mochila = itensDoHud(bolsa, moeda).map(([id, n]) => `
    <span class="hudItem" title="${id}">${arteDoItem(id)}<em>${n}</em></span>`).join('');

  return `
    <div class="hudCanto hudAlto" style="--corHud:${cor}">${barra}</div>
    ${fila ? `<div class="hudCanto hudBaixoE" style="--corHud:${cor}">${fila}</div>` : ''}
    ${mochila ? `<div class="hudCanto hudBaixoD" style="--corHud:${cor}">${mochila}</div>` : ''}`;
}

/* ── E O DESENHO FICA COM QUEM TEM DOM ────────────────────────────────────
 *
 * Este arquivo NAO importa o `dom.mjs`, e a razao e concreta: `dom.mjs` toca
 * `document` na carga, e isso tornava o HUD impossivel de testar em Node — a
 * suite morria no import, antes de qualquer afirmacao.
 *
 *     A decisao e pura; o traco e fino.
 *
 * `montar` devolve texto e roda em milissegundos sem navegador. Quem tem o
 * elemento na mao escreve nele — hoje o `idle-equipe.mjs`. */
export function pintarEm(alvo, dados) {
  if (!alvo) return 0;
  alvo.innerHTML = montar(dados);
  return alvo.querySelectorAll('.hudCanto').length;
}
