/* COLOCAÇÃO — a metade que é da TELA.
 *
 * A ARITMÉTICA MUDOU DE CASA NO BLOCO 0.1. `ordemDeQuedas`, `colocacaoDe` e
 * `abatesNosEventos` agora moram em `engine/colocacao.mjs`, porque a liquidação
 * no servidor passou a precisar delas: o XP da rodada tem uma parcela de
 * DESEMPENHO, que é função da colocação, e uma de ABATE.
 *
 * Sem isso o servidor teria a própria travessia dos eventos — a segunda
 * contagem que aquele arquivo inteiro existe para proibir. A frase de lá
 * continua valendo, agora com um lugar a mais podendo perguntar.
 *
 * `ordemDeQuedas` e `colocacaoDe` continuam sendo exportadas DAQUI, com os
 * mesmos nomes: `banner.mjs`, `fases.mjs`, `killfeed.mjs`, `odds.mjs` e
 * `resultado-tela.mjs` não precisaram saber que a regra mudou de endereço.
 *
 * `abatesNosEventos` NÃO é reexportada, de propósito. Ninguém em `app/` a
 * chama — o placar ao vivo é do `killfeed.mjs`, que tem o próprio `abatesDe`.
 * Reexportá-la poria dois nomes parecidos ao alcance de quem desenha, e o
 * primeiro a confundi-los somaria o acúmulo com a recontagem.
 *
 * O QUE FICOU AQUI é o que responde "como isto aparece na tela" — pódio e
 * ordenação por vida restante. O servidor não tem tela, e levar decisão de
 * apresentação para dentro do motor seria furar a fronteira pelo outro lado.
 *
 * NÃO ACRESCENTE ARITMÉTICA DE POSIÇÃO AQUI. Um cálculo que nasça neste arquivo
 * é um cálculo que o servidor não tem — e é a dessincronia que o bloco 0.1
 * existiu para fechar.
 */
import { colocacaoDe } from '../../engine/colocacao.mjs';

export { ordemDeQuedas, colocacaoDe } from '../../engine/colocacao.mjs';

/* O DESTAQUE DE UMA LINHA DO QUADRO — pódio, e nada mais.
 *
 * O modelo antigo dava ouro, prata e bronze às três primeiras linhas, com o
 * brilho atravessando a do líder. Isso se perdeu no porte: durante a luta as
 * doze linhas eram iguais, e as medalhas só apareciam no FIM. Mas a pergunta
 * "quem está ganhando?" é viva justamente ENQUANTO a luta corre — no fim ela
 * já foi respondida pelo resultado no centro da tela.
 *
 * Função pura, aqui e não no CSS, por um motivo: quem decide o que é pódio é a
 * mesma aritmética que decide a colocação. Um `pos <= 3` escrito à mão em quem
 * desenha seria a segunda contagem que este arquivo inteiro existe para evitar.
 *
 * `pod` e não `p`, porque `.p` já é a coluna de vida na linha — `.pick.p1` ao
 * lado de `.pick .p` é a confusão de seletor que só aparece meses depois.
 */
export function realceDoPodio(pos, vivo) {
  return vivo && pos >= 1 && pos <= 3 ? 'pod' + pos : '';
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
