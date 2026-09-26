/* O DOCE DE ESPÉCIE — a ponte Arena → mundo do treinador (ST-9.7 · F3.8 · Spec §7.8, §7.6, §22, §28.4).
 *
 * "A sessão que termina no vermelho deixa de ser estéril": apostar numa
 * espécie rende doce DA LINHA dela, e o doce sobe o nível (ST-9.10).
 *
 * ── A INVARIANTE INEGOCIÁVEL (§7.8, §22 "Doce != Valor apostado") ─────────
 *
 * O doce é função de A ESPÉCIE VENCEU e HOUVE APOSTA, e de nada mais. O valor
 * apostado não aparece aqui — nem como parâmetro ignorado: o teste passa um
 * `Proxy` e reprova qualquer leitura de campo fora da lista. Escalar com o
 * valor faria criar criatura virar motivo para apostar mais alto, que é o
 * incentivo que o capítulo 28 existe para não criar.
 *
 * ── AS TRÊS TRAVAS ─────────────────────────────────────────────────────────
 *
 *   PROTEÇÃO   pausa ou autoexclusão rendem 0 (§28.4)
 *   TETO       as 10 primeiras apostas do DIA rendem; a 11ª rende 0. Dia de
 *              calendário em Brasília (DEC-10), o mesmo do rendimento do
 *              Avanço — a janela móvel de 24 h punia quem joga todo dia no
 *              mesmo horário
 *   LINHA      a chave é a base (R4): a Arena só tem formas finais e a
 *              captura rende a base — doce da forma final sobe a base
 */
import { baseDe } from './evolucao.mjs';
import { diaDoMundo } from './avanco.mjs';

export const DOCE_VITORIA = 3;
export const DOCE_DERROTA = 1;
export const TETO_APOSTAS_COM_DOCE = 10;

/* ── QUANTO XP UM DOCE DÁ (ST-9.10 · §7.9) — fixado pela MEDIÇÃO ───────────
 *
 * Regra do PLANO: o máximo de doce de um dia (10 apostas × 3 = 30) rende no
 * máximo 25% do XP diário do perfil CASUAL (ST-3.3). Medido na fixture
 * `emissao-idle.json`: o casual no estágio 1 faz 303,1 XP/dia →
 * 0,25 × 303,1 / 30 = 2,53 → 2 por doce (60 XP/dia no teto, 19,8%). O doce
 * acelera quem já joga o idle; não o substitui. A suíte refaz a conta. */
export const XP_POR_DOCE = 2;

/* A ÚNICA assinatura do doce da aposta. `comDoceHoje`: quantas apostas já
   renderam doce HOJE (a conta é de quem guarda o histórico). */
export function doceDaAposta({ venceu, houveAposta, protecaoAtiva, comDoceHoje }) {
  if (!houveAposta || protecaoAtiva) return 0;
  if ((Number(comDoceHoje) || 0) >= TETO_APOSTAS_COM_DOCE) return 0;
  return venceu ? DOCE_VITORIA : DOCE_DERROTA;
}

/* A DUPLICATA vira doce (§7.6): quanto mais rara, mais doce — a posição da
   faixa na ordem do pack, e não uma tabela com nomes, para um pack novo não
   ficar sem doce por ter chamado a raridade de outro jeito. */
export function doceDaDuplicata(pack, raridade) {
  const ordem = (pack?.raridade ?? []).map(r => r[0]);
  const i = ordem.indexOf(raridade);
  return i < 0 ? 0 : i + 1;
}

export const chaveDoDoce = (pack, dex) => baseDe(pack, Number(dex));

/* Quantas apostas renderam doce no mesmo dia de calendário de `agora`. */
export const apostasComDoceNoDia = (instantes, agora) =>
  (instantes ?? []).filter(t => Number.isFinite(t) && diaDoMundo(t) === diaDoMundo(agora)).length;
