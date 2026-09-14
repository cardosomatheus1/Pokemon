/* A ZONA DE AÇÃO TROCA DE MODO COM A FASE.
 *
 * Substitui o `meu-lutador.mjs`, e o que sobrou dele é pouco de propósito.
 *
 * Aquele módulo existia para responder "eu ainda estou nessa?" durante os ~30
 * segundos em que o jogador não tem nenhuma ação disponível — o crítico cego
 * (L-029) deu nota 0 a 2 à pergunta, porque os doze sprites do campo são
 * anônimos e o seu era marcado por um chip de 10 px. Ele respondia num cartão
 * `SEU LUTADOR` cujas seis classes NÃO EXISTIAM na folha de estilo (D-028): a
 * barra de vida era uma `<div>` com largura, sem altura e sem cor.
 *
 * O R3 pôs o banner de batalha naquele lugar, e o banner responde à mesma
 * pergunta melhor e desenhado. O que não podia sumir junto é esta linha: as
 * fichas de aposta, o campo de valor e o botão de apostar são controles MORTOS
 * durante a luta, e controle morto ocupando a coluna nobre foi o motivo
 * original de o cartão ter nascido.
 *
 * O banner, ao contrário do cartão, NÃO se esconde: ele é a vitrine do jogador
 * e vale nas duas fases — na aposta mostra quem ele escolheu (ou convida a
 * escolher), na luta mostra como aquela escolha está indo.
 */
import { $ } from './dom.mjs';
import { S } from './estado.mjs';
import { renderBattleBanner } from './banner.mjs';

function renderZonaAcao(){
  const aposta = $('#cardAposta');
  if (aposta) aposta.hidden = S.state === 'fighting' || S.state === 'result';
  renderBattleBanner();
}

export { renderZonaAcao };
