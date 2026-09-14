/* O TRAINER OFF — quem fica no banco treina (bloco A4e, camada 4).
 *
 * A outra metade do nome que o dono deu à aba, e ela é um MODO, não um detalhe:
 *
 *   > "o antigo modo não é pra ficar na mesma aba, ele se torna uma aba com
 *   >  nome de ROTA OFF/TRAINER OFF"
 *
 * ── O PROBLEMA QUE ESTE PAINEL EXISTE PARA RESOLVER ───────────────────────
 *
 * O idle inteiro se apoia em "o teto do farm é o tamanho da coleção". Mas a
 * segunda criatura nasce no nível 1, e levá-la a um nível útil exige gastar
 * nela os avanços que o jogador queria gastar na primeira.
 *
 *   > A regra pedia uma coleção, e o jogo não dava por onde criá-la.
 *
 * O treino do banco é por onde. E ele é de propósito MAIS LENTO que aventurar:
 * a um terço do XP por hora da Batida. Se fosse igual, ninguém aventuraria com
 * a segunda criatura — e o modo que existe para viabilizar a coleção passaria
 * a substituí-la.
 *
 * ── E ELE NÃO DÁ ENCONTRO NEM ITEM, E A TELA DIZ ISSO ─────────────────────
 *
 * Não é omissão: é a razão de ele não comer o teto do §P5. Um jogador que
 * conta com um encontro que nunca vem foi enganado por uma tela calada, e
 * calar sobre um zero é a forma mais barata de mentir.
 */
import { $, nosDois } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { retratoAnimado } from './sprites.mjs';
import { emCampo, criaturasDe } from './idle-dados.mjs';
import { noBanco } from './idle-banco.mjs';
import { XP_POR_HORA_TREINO, VINCULO_POR_HORA_TREINO } from '../../engine/ausente.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* ── O QUE O JOGADOR PRECISA VER, E EM QUE ORDEM ──────────────────────────
 *
 * Primeiro QUEM treina — porque a pergunta que ele faz ao abrir é "o meu
 * segundo bicho está subindo?". Depois QUANTO, e só então a ressalva.
 *
 * A conta é mostrada JÁ MULTIPLICADA pela expedição em campo quando há uma:
 * "3 XP/h" obriga o jogador a fazer a conta que a tela já sabe fazer, e uma
 * conta que a tela esconde é uma decisão que ela não ajuda a tomar. */
export function pintarTreino(E) {
  /* O painel é só da ROTA OFF: em ROTAS o jogador está OLHANDO, e o treino do
     banco é justamente o que acontece quando ele não está. */
  const alvos = nosDois('Treino');
  if (!alvos.length) return;
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };

  const fora = emCampo(E);
  const banco = noBanco(criaturasDe(E), fora);

  if (!banco.length) {
    escrever('<p class="tiny">A coleção inteira está em campo — não sobrou ' +
             'ninguém no banco para treinar.</p>');
    return;
  }

  /* A JANELA É A DA EXPEDIÇÃO MAIS LONGA em campo. Sem expedição nenhuma o
     treino não corre — e dizer isso é o que impede o jogador de fechar o jogo
     esperando um XP que não vai acontecer. */
  const maisLonga = fora.reduce((m, x) => Math.max(m, x.terminaEm - x.iniciadaEm), 0);
  const horas = maisLonga / 3_600_000;
  const xp = Math.floor(horas * XP_POR_HORA_TREINO);
  const vinculo = Math.floor(horas * VINCULO_POR_HORA_TREINO);

  const cabecalho = fora.length
    ? `<p class="tiny"><b class="trQuantos">${banco.length}</b> no banco treinando ` +
      `enquanto a expedição corre — <b class="trGanho">+${xp} XP</b> e ` +
      `<b class="trGanho">+${vinculo} de vínculo</b> cada, ao colher.</p>`
    : `<p class="tiny"><b class="trQuantos">${banco.length}</b> no banco. O treino ` +
      'corre <b>durante a expedição</b> — mande uma e feche o jogo.</p>';

  const lista = banco.map(c => `
    <span class="trQuem" title="${nomeExibido(esp(c.dex).n)} · nível ${c.nivel ?? 1}">
      ${retratoAnimado(esp(c.dex), 'class="trArte"', false)}
      <i class="trNivel">${c.nivel ?? 1}</i>
    </span>`).join('');

  escrever(cabecalho + `<div class="trBanco">${lista}</div>` +
    `<p class="tiny trRessalva">O treino <b>não dá encontro nem item</b> — ` +
    `por isso ele não gasta o seu teto do dia. Ele rende ` +
    `${XP_POR_HORA_TREINO} XP e ${VINCULO_POR_HORA_TREINO} de vínculo por hora, ` +
    `de propósito abaixo de aventurar: se fosse igual, ninguém levaria a ` +
    `segunda criatura a campo.</p>`);
}
