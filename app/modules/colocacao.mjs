/* COLOCAÇÃO DA RODADA — do 1º ao 12º, derivada dos eventos.
 *
 * Puro: sem DOM, sem estado global, sem motor. É o que permite testar no Node
 * a única parte que pode estar errada em silêncio — a aritmética das posições.
 * Quem desenha é o `killfeed.mjs`, que já é dono do placar da rodada.
 *
 * UMA FONTE DE VERDADE, e é a razão de este arquivo existir.
 *
 * A colocação é mostrada AO VIVO, e a tentação óbvia é manter um contador
 * próprio que anda junto com o replay. É assim que nascem duas contagens
 * paralelas: o placar de abates conta um mundo, a colocação conta outro, e a
 * divergência só aparece na tela do jogador. Aqui a ordem de quedas é sempre
 * derivável dos eventos, e o `killfeed` a recalcula no fim para conferir contra
 * o que foi somado ao vivo — mesmo desenho do `conferirAbates`.
 *
 * O `fases.mjs` tinha a sua própria travessia dos eventos para a posição final.
 * Duas travessias do mesmo dado é como as duas contagens divergem — e a que
 * estiver errada será justamente a que ninguém olha. Agora é esta, e só esta.
 */

/* A ordem em que caíram. O primeiro da lista é o último colocado.
 *
 * TRÊS REGRAS, e todas já custaram caro no placar de abates:
 *   killstreak NÃO é queda   o evento carrega o índice do atacante e um `ko`,
 *                            mas é anúncio, não abate. Contá-lo derrubaria
 *                            alguém duas vezes.
 *   tempestade É queda       não tem autor, mas tira o lutador da arena. Ficar
 *                            de fora deixaria buraco na colocação.
 *   ninguém cai duas vezes   o replay pode reentregar um evento; a posição de
 *                            quem já caiu não muda mais.
 */
export function ordemDeQuedas(eventos) {
  const ordem = [];
  const poe = i => { if (i !== undefined && i !== null && !ordem.includes(i)) ordem.push(i); };
  for (const ev of eventos) {
    if (ev.storm) { for (const h of ev.hits) if (h.ko) poe(h.i); continue; }
    if (ev.streak) continue;
    if (ev.ko) poe(ev.d);
  }
  return ordem;
}

/* Posição fechada de quem já caiu; `null` para quem ainda está de pé.
   O primeiro a cair fica em último: `n - 0`. */
export function colocacaoDe(i, ordem, n) {
  const k = ordem.indexOf(i);
  return k === -1 ? null : n - k;
}

/* O quadro inteiro, vivos primeiro.
 *
 * Entre os vivos a ordem é por vida restante — e isso é uma PRÉVIA, não um
 * resultado: só o campeão fecha o 1º lugar de verdade, no fim da rodada. Quem
 * desenha marca "em disputa" para não vender previsão como resultado.
 *
 * `vidaDe(i)` devolve a fração de vida (0 a 1). Vem de fora porque as entidades
 * são do render, e este arquivo não conhece render.
 */
export function rankingColocacao(n, ordem, vidaDe) {
  const vivos = [], caidos = [];
  for (let i = 0; i < n; i++) {
    const pos = colocacaoDe(i, ordem, n);
    if (pos === null) vivos.push({ i, hp: vidaDe(i) });
    else caidos.push({ i, pos });
  }
  /* Desempate por índice para a lista não "dançar" entre iguais a cada quadro —
     mesmo motivo do desempate estável do placar de abates. */
  vivos.sort((a, b) => b.hp - a.hp || a.i - b.i);
  caidos.sort((a, b) => a.pos - b.pos);
  return vivos.map((v, k) => ({ ...v, pos: k + 1, vivo: true }))
              .concat(caidos.map(c => ({ ...c, hp: 0, vivo: false })));
}
