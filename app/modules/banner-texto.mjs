/* O TEXTO DO RODAPÉ DO BANNER — números entram, HTML sai.
 *
 * Sem DOM, sem estado global, sem import de nada que toque tela. Isso não é
 * purismo: é o que torna a única parte AFIRMATIVA do banner verificável.
 *
 * O resto do banner é cosmético — cena, efeito de nome, o Pokémon flutuando.
 * Errar ali é feio. O rodapé é diferente: ele diz ao jogador QUANTO ELE LEVA SE
 * GANHAR, e errar esse número é dizer uma mentira sobre dinheiro. A pergunta
 * "o retorno mostrado é o retorno certo?" precisava de navegador para ser feita
 * enquanto o cálculo morava dentro do módulo que desenha; aqui ela é uma
 * chamada de função.
 *
 * ── POR QUE PISO, E NÃO ARREDONDAMENTO ────────────────────────────────────
 *
 * `Math.floor`, igual ao pagamento. 250 × 5,25 = 1312,5, e o jogador recebe
 * 1.312. Mostrar 1.313 seria prometer um centavo que o ledger não paga — a
 * classe de erro em que a tela e o dinheiro discordam, que é a pior que este
 * projeto pode ter.
 *
 * ── E POR QUE OS CAMPOS DE LUTA SÃO OPCIONAIS ─────────────────────────────
 *
 * Durante a fase de aposta a luta não começou: não existe colocação nem vida.
 * Preencher com "1º de 12" e "100% de vida" seria escrever na tela um estado
 * que não é verdade. Sem `pos`, o rodapé simplesmente não fala disso.
 */
import { CUR } from './motor.mjs';

const din = n => `${CUR} ${Math.floor(n).toLocaleString('pt-BR')}`;

/* A linha da aposta é a mesma nos três desfechos, e é o que o cartão
   `SEU LUTADOR` mostrava: apostou, se vencer, e a que odd. */
const linhaAposta = (valor, odd) =>
  `<span class="bnAposta">apostou <b>${din(valor)}</b>` +
  ` · se vencer <b class="ganho">${din(valor * odd)}</b>` +
  ` · <i>x${odd.toFixed(2)}</i></span>`;

/**
 * @param {object} a
 * @param {string} a.nome      nome do lutador em que se apostou
 * @param {number} a.valor     valor apostado
 * @param {number} a.odd       odd fechada na aposta
 * @param {number} [a.pos]     colocação atual; ausente antes de a luta começar
 * @param {number} [a.total]   quantos lutadores há na rodada
 * @param {number} [a.hp]      vida em porcentagem
 * @param {boolean} [a.vivo]   false desenha K.O. no lugar da vida
 * @param {'venceu'|'perdeu'} [a.desfecho]  só no fim da rodada
 */
export function rodapeAposta({ nome, valor, odd, pos, total, hp, vivo = true, desfecho }) {
  if (desfecho === 'venceu')
    return `🏆 <b>${nome}</b> venceu — +${din(valor * odd)}`;
  if (desfecho === 'perdeu')
    return `<b>${nome}</b> caiu em ${pos}º — −${din(valor)}`;

  /* `pos != null` e não `pos`: a colocação 0 não existe, mas escrever a guarda
     por veracidade em vez de por número deixa claro que o que se pergunta é
     "a luta já começou?" e não "a colocação é diferente de zero?". */
  const naLuta = pos != null;
  const estado = naLuta
    ? ` · ${pos}º de ${total} · ${vivo ? `${hp}% de vida` : 'K.O.'}`
    : '';
  return `<b>${nome}</b>${estado}${linhaAposta(valor, odd)}`;
}

/* ── O RODAPÉ DO BANNER NO IDLE ────────────────────────────────────────────
 *
 * O mesmo banner da arena, noutra tela e com outra frase. O dono foi literal
 * sobre o formato:
 *
 *   > "No Iddle irá aparecer qual bioma ele está junto com stage, e quanto
 *   >  tempo de farm restante falta naquele bioma, exemplo: 'Floresta de
 *   >  Viridian - Stage2 - 02:45min restantes'"
 *
 * E sobre o que NÃO entra: *"no banner não vai conter as informações do Pokémon
 * da arena, ODD, colocação etc."*. Odd e colocação são respostas a uma decisão
 * que o jogador tomou na arena; no idle ele escolheu o lugar e foi dormir.
 * Trazê-las para cá seria a mesma poluição que o `L-085` recusou no log.
 *
 * ── O STAGE AINDA NÃO EXISTE, E A FRASE NÃO MENTE POR ISSO ───────────────
 *
 * Stages são o bloco 1.10. Até lá, `stage` chega indefinido e o trecho
 * simplesmente não aparece — em vez de escrever "Stage 1" para uma coisa que o
 * jogo ainda não tem. Frase que inventa informação é pior que frase curta, e
 * quando o 1.10 chegar nada aqui muda.
 *
 * @param {object} a
 * @param {string} a.bioma        rótulo do lugar, já traduzido
 * @param {number} [a.stage]      o andar da rota; ausente até o 1.10
 * @param {number} [a.restanteMs] o que falta de farm; ausente = ninguém em campo
 */
export function rodapeIdle({ bioma, stage, restanteMs }) {
  if (!bioma) return '<span class="bnEstado">Nenhuma expedição em campo</span>';
  const partes = [`<b>${bioma}</b>`];
  if (stage != null) partes.push(`Stage ${stage}`);
  if (restanteMs != null) partes.push(`${duracaoCurta(restanteMs)} restantes`);
  return partes.join(' · ');
}

/* MM:SS até uma hora, depois Xh MMmin. Segundos numa espera de oito horas são
   ruído; minutos numa de dois minutos são grosseiros demais para o jogador
   saber se vale esperar. A unidade acompanha a ordem de grandeza. */
export function duracaoCurta(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 3600) {
    const m = Math.floor(s / 60), r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
}
