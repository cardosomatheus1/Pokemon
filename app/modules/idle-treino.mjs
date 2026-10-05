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
 * abaixo do combate ativo, conforme XP-OFF-2. Se fosse igual, ninguém aventuraria com
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
import { VINCULO_POR_HORA_TREINO } from '../../engine/ausente.mjs';
import { ritmoTreinoOffline, FOLGA_DO_BANCO } from '../../engine/treino-offline.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* ── O QUE O JOGADOR PRECISA VER, E EM QUE ORDEM ──────────────────────────
 *
 * Primeiro QUEM treina — porque a pergunta que ele faz ao abrir é "o meu
 * segundo bicho está subindo?". Depois QUANTO, e só então a ressalva.
 *
 * A taxa mostrada é a do intervalo corrente de treino, congelada ao voltar. */
export function pintarTreino(E) {
  /* O painel é só da ROTA OFF: em ROTAS o jogador está OLHANDO, e o treino do
     banco é justamente o que acontece quando ele não está. */
  const alvos = nosDois('Treino');
  if (!alvos.length) return;
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };

  const fora = [...emCampo(E), ...(E.run ? [{equipe:E.run.equipe}] : [])];
  const banco = noBanco(criaturasDe(E), fora);

  if (!banco.length) {
    escrever('<p class="tiny">A coleção inteira está em campo — não sobrou ' +
             'ninguém no banco para treinar.</p>');
    return;
  }

  const ritmo = ritmoTreinoOffline(E.treinoOffline, E.criaturas);
  const ultimos = E.treinoOffline?.ultimo?.ganhos ?? [];
  const recebido = ultimos.filter(x => banco.some(c => c.id === x.id)).reduce((n,x) => n+x.xp,0);
  const cabecalho = `<p class="tiny"><b class="trQuantos">${banco.length}</b> no banco. ` +
    `Treino automático: <b class="trGanho">${ritmo.xpPorHora} XP/h</b> (estágio ${ritmo.estagio}) e ` +
    `${VINCULO_POR_HORA_TREINO} de vínculo/h por criatura, até o nível <b class="trTeto">${ritmo.nivelTeto}</b> — ` +
    `${FOLGA_DO_BANCO} abaixo da sua mais forte, que só sobe jogando. O crédito chega ao voltar, ` +
    `com até 12 h por ausência; não precisa mandar expedição.` +
    (recebido ? ` Último crédito do banco: +${recebido} XP no total.` : '') + '</p>';

  const lista = banco.map(c => `
    <span class="trQuem${(c.nivel ?? 1) >= ritmo.nivelTeto ? ' trNoTeto' : ''}" title="${nomeExibido(esp(c.dex).n)} · nível ${c.nivel ?? 1}${(c.nivel ?? 1) >= ritmo.nivelTeto ? ' · no teto do banco' : ''}">
      ${retratoAnimado(esp(c.dex), 'class="trArte"', false)}
      <i class="trNivel">${c.nivel ?? 1}</i>
    </span>`).join('');

  escrever(cabecalho + `<div class="trBanco">${lista}</div>` +
    `<p class="tiny trRessalva">O treino <b>não dá encontro nem item</b> — ` +
    `por isso ele não gasta o seu teto do dia. Ele rende ` +
    `${ritmo.xpPorHora} XP e ${VINCULO_POR_HORA_TREINO} de vínculo por hora. ` +
    `A taxa aumenta com os estágios desbloqueados. O novo ritmo vale a partir ` +
    `do próximo intervalo, sem repagar as horas anteriores.</p>`);
}
