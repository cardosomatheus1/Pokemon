/* O CARTÃO "SEU LUTADOR" — o que ocupa a zona de ação durante a luta.
 *
 * São ~30 segundos em que o jogador não tem NENHUMA ação disponível, e a tela
 * mantinha ali as fichas de aposta, o campo de valor personalizado e a frase
 * "escolha um lutador na arena durante a fase de apostas". Controles mortos
 * ocupando a coluna nobre.
 *
 * A única pergunta viva naquele momento é "eu ainda estou nessa?", e o crítico
 * cego (L-029) deu a ela nota 0 a 2: os doze sprites do campo são anônimos, e o
 * seu era marcado por um chip de 10 px com texto de 6 px na faixa de HP.
 */
import { $ } from './dom.mjs';
import { CUR } from './motor.mjs';
import { S } from './estado.mjs';
import { colocacaoDe, ordemDeQuedas } from './colocacao.mjs';
import { imgTag } from './sprites.mjs';

/* Aparece só quando há luta acontecendo. Sem aposta, diz isso — e não some,
   porque "você está de fora desta" também é resposta à pergunta. */
function renderMeuLutador(){
  const card = $('#cardMeu'), alvo = $('#meuLutador');
  const aposta = $('#cardAposta');
  if (!card || !alvo) return;

  const naLuta = S.state === 'fighting' || S.state === 'result';
  card.hidden = !naLuta;
  if (aposta) aposta.hidden = naLuta;
  if (!naLuta) return;

  if (!S.myBet){
    alvo.innerHTML = `<div class="tiny">Você ficou de fora desta rodada.
      A próxima abre assim que esta terminar.</div>`;
    return;
  }

  const { idx, amount, odd } = S.myBet;
  const f = S.fighters[idx], e = S.ents[idx];
  const vivo = e ? e.alive : true;
  const hp = e ? Math.max(0, Math.round(e.hp / f.maxHp * 100)) : 100;
  const n = S.fighters.length;
  const pos = S.state === 'result' && idx === S.champ ? 1
    : (colocacaoDe(idx, ordemDeQuedas(S.battle ? S.battle.events.slice(0, S.evPtr) : []), n)
       ?? (S.ents || []).filter(x => x.alive).length);
  const retorno = Math.floor(amount * odd);

  card.classList.toggle('perdeu', !vivo);
  alvo.innerHTML = `
    <div class="ml-topo">${imgTag(f, 'class="ml-mon"')}
      <div class="ml-id"><b>${f.n}</b><span>${pos}º de ${n}</span></div>
    </div>
    <div class="ml-hp"><i style="width:${vivo ? hp : 0}%"></i></div>
    <div class="ml-est">${vivo ? `${hp}% de vida` : 'K.O.'}</div>
    <div class="ml-linha"><span>apostou</span><b>${CUR} ${amount.toLocaleString('pt-BR')}</b></div>
    <div class="ml-linha"><span>se vencer</span><b class="ganho">${CUR} ${retorno.toLocaleString('pt-BR')}</b>
      <i>x${odd.toFixed(2)}</i></div>`;
}

export { renderMeuLutador };
