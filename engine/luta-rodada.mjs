/* A LUTA DA RODADA — clima e combate, numa função só (D-119).
 *
 * O cliente animava a luta COM o clima (`aplicarClima` antes de `simular`) e o
 * servidor, que paga as apostas, simulava SEM ele. Medido em 26/09: em 771 de
 * 2.000 rodadas o campeão que o servidor pagava não era o que o jogador via
 * vencer. Cada lado estava certo sozinho; a divergência nasceu de haver DOIS
 * lugares montando a mesma luta.
 *
 * Agora há um: os dois lados chamam isto, com o motor que cada um tem. O clima
 * sai do ramo `ambiente` da árvore, condicionado à pool (F0.11) — a mesma
 * distribuição que o preço já usava (`simularLote`).
 *
 * `M` precisa de `sortearClima`, `aplicarClima` e `simular` — o motor do
 * servidor (`criarMotor`) e a fachada do app (`app/modules/motor.mjs`) têm os
 * três com a mesma assinatura.
 */
import { tiposDaPool } from './engine.mjs';

export function lutaDaRodada(M, { pool, ambiente, batalha }) {
  const clima = M.sortearClima(ambiente, tiposDaPool(pool));
  const b = M.simular(M.aplicarClima(pool, clima), batalha, true);
  return { clima, batalha: b };
}
