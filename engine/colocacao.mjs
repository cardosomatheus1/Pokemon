/* COLOCAÇÃO DA RODADA — a aritmética, derivada dos eventos da batalha.
 *
 * Puro: sem DOM, sem estado global, sem motor. É o que permite testar no Node
 * a única parte que pode estar errada em silêncio — a aritmética das posições.
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
 *
 * ── POR QUE ELE SAIU DE `app/modules/` PARA `engine/` (bloco 0.1) ──────────
 *
 * Pelo mesmo motivo do `engine/progressao.mjs`, e no mesmo bloco: ao fechar o
 * D-045, a liquidação no servidor passou a conceder o XP da rodada — e o XP
 * tem uma parcela de DESEMPENHO, que é função da colocação.
 *
 * Sem esta mudança o servidor teria a própria travessia dos eventos, que é
 * exatamente a segunda contagem que o parágrafo acima existe para proibir. A
 * frase continua valendo, agora com um lugar a mais podendo perguntar: agora é
 * esta, e só esta.
 *
 * O QUE FICOU EM `app/modules/colocacao.mjs`, DE PROPÓSITO: `realceDoPodio` e
 * `rankingColocacao`. As duas respondem "como isto aparece na tela" — pódio e
 * ordenação por vida restante — e o servidor não tem tela. Trazê-las junto
 * poria decisão de apresentação dentro do motor, que é a fronteira que o
 * ContentPack e o §0.3 defendem por outro lado.
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

/* A POSIÇÃO FINAL, com as três situações que a rodada produz.
 *
 * `colocacaoDe` responde só sobre quem CAIU — quem está de pé devolve `null`,
 * porque durante a luta a posição de um vivo ainda não existe. No fim da rodada
 * ela existe, e são três casos:
 *
 *     campeão                    1
 *     caiu                       a colocação da queda
 *     sobreviveu e não venceu    2
 *
 * A terceira linha é a que não se adivinha: o motor encerra por tempo, então
 * pode sobrar mais de um lutador de pé, e todos eles empatam em 2º — nenhum foi
 * derrubado, e nenhum é o campeão.
 *
 * Isto vivia dentro de `resultado-tela.mjs`, como `posicaoFinal(idx)`. Veio
 * para cá no bloco 0.1 pelo mesmo motivo do resto do arquivo: a liquidação no
 * servidor precisa da MESMA resposta para pagar a parcela de desempenho do XP.
 * A tela continua chamando, agora daqui.
 */
export function posicaoFinalDe(i, campeaoIdx, ordem, n) {
  if (i === campeaoIdx) return 1;
  const pos = colocacaoDe(i, ordem, n);
  return pos === null ? 2 : pos;
}

/* OS ABATES DE UM LUTADOR, RECONTADOS DOS EVENTOS.
 *
 * Existe porque a parcela de abate do XP precisa dele no SERVIDOR, e a conta
 * vivia solta dentro de `resultado-tela.mjs` — um `events.filter(...)` no meio
 * do desenho do overlay de fim de rodada. Solta ali, ela é a segunda travessia
 * que este arquivo proíbe: o `S398` existe justamente porque uma versão dela
 * passou a contar tempestade como abate do lutador.
 *
 * ── O NOME É `abatesNosEventos` E NÃO `abatesDe`, E ISSO IMPORTA ───────────
 *
 * `abatesDe(i)` já existe, em `app/modules/killfeed.mjs`, e significa outra
 * coisa: o contador AO VIVO, acumulado a cada abate enquanto a luta corre. O
 * portão estático de módulos pegou a colisão no minuto em que ela nasceu.
 *
 * Duas funções com o mesmo nome e fontes diferentes é precisamente a dessincronia
 * que o cabeçalho deste arquivo proíbe — o placar contaria um mundo e o XP
 * contaria outro, e a divergência só apareceria na tela do jogador. O nome diz
 * de onde o número sai: dos EVENTOS, e não do acúmulo.
 *
 * As duas devem sempre concordar, e é isso que o `conferirAbates` do killfeed
 * já mede ao fim da rodada — com uma terceira travessia própria, registrada
 * como L-053.
 *
 * TEMPESTADE NÃO TEM AUTOR, e por isso não conta para ninguém — ela É queda
 * (entra na colocação, acima) e NÃO É abate. As duas coisas ao mesmo tempo, e
 * é essa assimetria que a conta solta errava.
 */
export function abatesNosEventos(i, eventos) {
  let n = 0;
  for (const ev of eventos) {
    if (ev.storm || ev.streak) continue;
    if (ev.ko && ev.a === i) n++;
  }
  return n;
}
