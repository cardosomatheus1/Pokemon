/* O SHINY VERDADEIRO (ST-14.1 · E14 · spec E14 §5) — camada 0.
 *
 * Shiny é da INSTÂNCIA, e nasce do ENCONTRO: o servidor sorteia quando grava o
 * encontro pendente, e o lance só o carrega para a criatura. Três coisas que
 * ele NÃO é, e cada uma é uma regra da spec §3:
 *
 *   - não é stat: nenhum IV, potencial, XP ou chance de captura muda — por
 *     isso o sorteio mora num ramo PRÓPRIO, que não desloca nenhum sorteio
 *     que já existia (o lance, os ocultos);
 *   - não é rerrolável: refresh e reconexão leem o que foi gravado;
 *   - não sai de raiz publicada: a colheita devolve a semente dela ao
 *     jogador, e um shiny derivado dela seria previsível antes do encontro
 *     aparecer. Cada encontro ganha raiz NOVA do CSPRNG do servidor.
 *
 * A TAXA NÃO ESTÁ APROVADA. A spec §13 usa 1/2.000 como "exemplo
 * ilustrativo"; ela é a baseline do piloto até a ST-14.15 medir encontros por
 * perfil e o dono aprovar outra. Por isso a taxa viaja com uma VERSÃO, gravada
 * em cada encontro: mudar a taxa amanhã não reescreve o que já foi sorteado,
 * e a auditoria sabe sob qual regra cada shiny nasceu. O pack pode trazer a
 * própria (`pack.shiny`), e o motor não conhece nome de espécie nenhum.
 */
export const SHINY_PADRAO = Object.freeze({ taxa: 1 / 2000, versao: 'shiny-v1-piloto' });

export function regraDoShiny(pack) {
  const r = pack?.shiny ?? SHINY_PADRAO;
  if (!(r.taxa > 0 && r.taxa <= 1) || typeof r.versao !== 'string' || !r.versao)
    throw new Error(`regra de shiny inválida no pack ${pack?.id ?? '?'}`);
  return r;
}

/* Um sorteio, uma resposta: `rnd` é o gerador do ramo próprio do encontro. */
export function sortearShiny(rnd, regra = SHINY_PADRAO) {
  return { shiny: rnd() < regra.taxa, versao: regra.versao };
}
