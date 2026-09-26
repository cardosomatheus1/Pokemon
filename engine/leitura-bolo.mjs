/* A LEITURA NO BOLO — onde o jogador foi contra a multidão e contra o modelo,
 * e quem estava certo (ST-12.9 · F2.7 · Spec §6.9).
 *
 * Puro: entra a lista das entradas PAGAS do jogador, cada uma com o bolo e o
 * preço do modelo daquele mercado; sai a contagem. O servidor junta as linhas;
 * a tela pinta o texto.
 *
 * ── A REGRA DE HONESTIDADE (§6.9, §28.5) ─────────────────────────────────
 *
 * Acerto e erro com o MESMO destaque, e o n sempre visível. Por isso a
 * contagem devolve os três desfechos de cada discordância — você acertou, o
 * outro lado acertou, ninguém acertou — e nunca uma taxa de acerto sozinha:
 * "acertou 2" sem "de 7" é a ferramenta de aprendizado virando autoengano.
 *
 * ── AS DEFINIÇÕES, DECLARADAS ─────────────────────────────────────────────
 *
 *   FAVORITO DO BOLO     o lutador com mais dinheiro DOS OUTROS no bolo (a
 *                        minha entrada não é a multidão); empate no topo
 *                        = não há favorito, e a entrada não conta como
 *                        discordância (discordar de um empate não é leitura)
 *   FAVORITO DO MODELO   o lutador com maior frequência no preço carimbado;
 *                        mesma regra de empate
 *   CONTRA               a minha seleção diferente do favorito
 *   ACERTOU              a seleção está entre os vencedores do mercado
 *                        (empate no topo de abates: vários acertam)
 */

function favorito(valores) {
  let melhor = -Infinity, quem = null, empate = false;
  valores.forEach((v, i) => {
    if (v > melhor) { melhor = v; quem = i; empate = false; }
    else if (v === melhor) empate = true;
  });
  return empate || melhor <= 0 ? null : quem;
}

/* `linhas`: [{ minha, totais: [n por seleção], modelo: [freq por seleção] | null,
                vencedoras: [seleções] }] */
export function lerLeitura(linhas) {
  const lado = () => ({ n: 0, eu: 0, outro: 0, ninguem: 0 });
  const bolo = lado(), modelo = lado();
  let acertos = 0;
  const conta = (acc, fav, l) => {
    if (fav === null || fav === l.minha) return;
    acc.n++;
    const eu = l.vencedoras.includes(l.minha), outro = l.vencedoras.includes(fav);
    if (eu) acc.eu++;
    if (outro) acc.outro++;
    if (!eu && !outro) acc.ninguem++;
  };
  for (const l of linhas) {
    if (l.vencedoras.includes(l.minha)) acertos++;
    conta(bolo, favorito(l.totais), l);
    if (l.modelo) conta(modelo, favorito(l.modelo), l);
  }
  return { n: linhas.length, acertos, contraBolo: bolo, contraModelo: modelo };
}

export const AMOSTRA_PEQUENA = 10;
