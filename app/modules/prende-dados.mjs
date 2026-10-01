/* "ISTO PRENDE" ANTES DE GASTAR — a pedra e o doce (ST-14.3d · E14 · L-224) — camada 0.
 *
 * A spec E14 §4.3: "mostrar antes a consequência para negociabilidade. Não
 * consumir silenciosamente insumo bound e desvalorizar um shiny". O servidor
 * já grava a consequência — a pedra de lote preso prende a forma nova
 * (ST-14.5), o doce preso prende quem o come (ST-14.14c) — e devolve
 * `prendeu` DEPOIS. Aqui se decide o aviso de ANTES, com a mesma regra que o
 * servidor vai aplicar:
 *
 *   a PEDRA   sai do lote MAIS ANTIGO da bolsa (a ordem do débito); se ele é
 *             de classe que não negocia, a criatura passa a não negociar
 *   o DOCE    os livres saem primeiro (`gastoDoDoce`); só quando não há
 *             livre para o doce que se dá é que ele prende
 *
 * Avisa só quando há o que perder: a criatura que já não negocia (presa pela
 * origem) não fica "mais presa", e o aparelho sem conta não tem lote nem
 * classe — não há aviso para dar. Tudo decidido aqui; a tela só pinta.
 */
import { negociavelPelaOrigem } from '../../engine/proveniencia.mjs';
import { gastoDoDoce } from '../../engine/doce-origem.mjs';
import { aplicar } from './evolucao-idle.mjs';

/* A criatura tem o que perder: tem classe gravada (é da conta) e negocia hoje. */
const temOQuePerder = c => typeof c?.proveniencia === 'string' && negociavelPelaOrigem(c.proveniencia);

/* A pedra que a evolução de agora gastaria — `null` sem pedra ou sem evolução. */
function pedraDaEvolucao(pack, c, bolsa) {
  try { return aplicar(pack, c, bolsa).consome ?? null; } catch { return null; }
}

export function avisoDaPedra(pack, criatura, bolsa, lotes) {
  if (!temOQuePerder(criatura)) return null;
  const pedra = pedraDaEvolucao(pack, criatura, bolsa);
  if (!pedra) return null;
  const primeiro = (lotes?.[pedra] ?? []).find(l => (l.quantidade ?? 0) > 0);
  if (!primeiro || negociavelPelaOrigem(primeiro.classe)) return null;
  return { insumo: pedra, classe: primeiro.classe, curto: 'prende',
           frase: 'a pedra veio de bônus ou de antes da conta — evoluir com ela tira esta criatura da troca e do Mercado' };
}

/* `saldo` é o da LINHA: { quantidade, presos }. */
export function avisoDoDoce(criatura, saldo) {
  if (!temOQuePerder(criatura)) return null;
  const quantidade = saldo?.quantidade ?? 0;
  if (quantidade <= 0) return null;
  if (!gastoDoDoce({ quantidade, presos: saldo?.presos ?? 0, gastos: 1 }).prende) return null;
  return { insumo: 'doce', curto: 'prende',
           frase: 'os doces desta linha que sobraram vieram de aposta com bônus ou de criatura presa — dar um tira esta criatura da troca e do Mercado' };
}

/* O texto do PRIMEIRO clique, quando evoluir pede confirmação: o que se perde
   (golpe exclusivo, ST-10.3) e/ou o que prende. `null` quando não há o que
   confirmar — a evolução acontece no primeiro clique, como sempre. */
export function textoDoArmeDaEvolucao(perde = [], prende = null) {
  const partes = [];
  if (perde.length) partes.push(`perde ${perde.map(x => x.n).join(' e ')}`);
  if (prende) partes.push('prende a criatura');
  return partes.length ? `${partes.join(' · ')} · evoluir?` : null;
}

export const TEXTO_DO_ARME_DO_DOCE = 'prende a criatura · dar mesmo assim?';
