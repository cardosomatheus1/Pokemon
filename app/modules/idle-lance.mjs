/* O LANCE — a bola na mão do jogador (camada 0).
 *
 * Saiu do `idle-dados.mjs` quando ele passou de 600 linhas pela terceira vez,
 * e a divisão é a de sempre, por RESPONSABILIDADE:
 *
 *     idle-dados   O ESTADO — o que o jogador tem, e o que a expedição fez
 *     idle-lance   A CAPTURA — o único gesto do idle em que ele DECIDE depois
 *                  de a expedição já ter voltado
 *
 * A prova de que a linha é de responsabilidade: este arquivo responde uma
 * pergunta só, e ela é a única do idle em que o jogador escolhe algo com o
 * resultado já sorteado na mão.
 */
import { derivar, novaRaiz } from '../../engine/seed.mjs';
import { semente } from '../../engine/instancia.mjs';
import { chanceDe, tentar } from '../../engine/captura.mjs';
/* Criar a criatura e saber se a equipe está cheia vêm do ESTADO: a captura
   cria e guarda, e quem sabe se a equipe cabe é quem guarda a equipe. */
import { criarCriatura as criar, equipeCheia } from './idle-dados.mjs';
/* ── O LANCE ───────────────────────────────────────────────────────────────
 *
 * UM LANCE POR ENCONTRO, e a escolha da bola é A decisão — a regra é do motor
 * (`engine/captura.mjs`) e está lá com o porquê. Aqui só se cumpre.
 *
 * A SEMENTE SAI DA EXPEDIÇÃO, e não de um sorteio novo: a expedição já guarda a
 * dela desde a colheita, e derivar daqui mantém o lance auditável — dá para
 * refazer o resultado a partir do que está gravado, que é o §25.2. */
export function lancarBola(e, { pack, chave, bola, agora }) {
  const i = e.encontros.findIndex(x => x.chave === chave);
  if (i < 0) throw new Error('esse encontro não está mais aqui');
  const en = e.encontros[i];

  if (!chanceDe(pack, { raridade: en.raridade, bola }))
    throw new Error(`a ${bola} não tem chance contra um ${en.raridade}`);
  if ((e.bolsa[bola] ?? 0) < 1) throw new Error('você não tem essa bola');

  const exp = e.expedicoes.find(x => x.id === en.expedicao);
  const raiz = semente(derivar(Number(exp?.semente ?? 1), 'lance:' + chave));
  const r = tentar(raiz, pack, { raridade: en.raridade, bola });

  e.bolsa[bola] -= 1;
  e.encontros.splice(i, 1);

  let criatura = null;
  if (r.capturou) {
    criatura = criar(pack, en.dex, 'captura', agora, novaRaiz());
    /* A CAIXA RECEBE quando a equipe está cheia — nunca uma recusa. */
    criatura.naCaixa = equipeCheia(e);
    e.criaturas.push(criatura);
  }
  return { ...r, dex: en.dex, raridade: en.raridade, criatura,
           foiParaCaixa: !!criatura?.naCaixa };
}
