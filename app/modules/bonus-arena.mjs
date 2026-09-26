/* O BÔNUS DA ARENA NAS ROTAS — o que a aposta deixa no idle (ST-9.6 · F3.8 · §7.3).
 *
 * Camada 0. Apostar numa espécie torna a LINHA dela mais comum nas rotas por
 * seis horas (`DURACAO_BONUS_MS`, peso ×`PESO_APOSTADA`, os dois do motor).
 *
 *   A ESCOLHA, NUNCA O TAMANHO   nenhuma função aqui recebe valor: 50 e 5.000
 *                                dão o mesmo bônus, e é isso que impede o
 *                                idle de virar motivo para apostar mais (§28)
 *   UM POR VEZ                   a aposta nova SUBSTITUI a anterior; apostar
 *                                duas vezes na mesma linha recomeça as 6 h,
 *                                não soma 12, e o peso não vira ×16
 *   CHAVE PRÓPRIA                como as marcas da escada (ST-9.3): gravar no
 *                                save do idle a partir da Arena subiria a
 *                                revisão dele (ST-3.2) sem ninguém querer
 */
import { baseDe } from '../../engine/evolucao.mjs';
import { DURACAO_BONUS_MS } from '../../engine/captura.mjs';

export const CHAVE_BONUS = 'ar_bonus_arena';

export const bonusDaAposta = (pack, dex, agora) => ({ linha: baseDe(pack, Number(dex)), ate: agora + DURACAO_BONUS_MS });

export function carregarBonus(deposito = globalThis.localStorage) {
  try {
    const b = JSON.parse(deposito?.getItem(CHAVE_BONUS) ?? 'null');
    return Number.isFinite(b?.linha) && Number.isFinite(b?.ate) ? { linha: b.linha, ate: b.ate } : null;
  } catch { return null; }
}

export function registrarBonus(pack, dex, agora, deposito = globalThis.localStorage) {
  try { deposito?.setItem(CHAVE_BONUS, JSON.stringify(bonusDaAposta(pack, dex, agora))); return true; } catch { return false; }
}
