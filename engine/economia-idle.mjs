/* O QUE A EXPEDIÇÃO PAGA EM DINHEIRO (bloco 1.11, §7.13, §P5).
 *
 * Fronteira: entra um perfil e quantos encontros saíram; sai um NÚMERO. Puro,
 * sem DOM, sem estado, e — este arquivo aprendeu isso do jeito difícil — sem
 * TEMA.
 *
 * ── O MOTOR NÃO SABE COMO A MOEDA SE CHAMA ──────────────────────────────
 *
 * A primeira versão escrevia o nome da moeda do tema no cabeçalho e numa
 * constante `CHAVE_MOEDA`. O portão `conteudo` reprovou, e estava certo pela
 * QUARTA vez neste projeto — foi ele que já empurrou o nome das bolas e os
 * rótulos da interface para o ContentPack.
 *
 * O motor conhece o CONCEITO: a expedição paga por encontro, e o perfil longo
 * paga mais por encontro e menos por hora. Quem dá nome à moeda é o pack
 * (`pack.moedaPve`), como já acontece com a moeda da arena.
 *
 * Não é purismo. É o que faz um pack sem uma linha da franquia dentro continuar
 * pagando o jogador — que é a promessa do §0.3 e a condição do §0.3.1.
 *
 * ── POR QUE O DINHEIRO SAIU DA TABELA DE SORTEIO ─────────────────────────
 *
 * Até aqui a Essência era uma das seis classes da tabela do `drops.mjs`: 30% de
 * peso, 1 a 3 por vez. Como MOEDA isso tinha um defeito que só aparece quando o
 * jogador tenta usar a moeda para alguma coisa:
 *
 *     duas expedições iguais pagavam valores diferentes, e havia expedição que
 *     voltava sem nenhum
 *
 * Para um OBJETO isso é bom — é a loteria, é o que dá graça a abrir o saque.
 * Para o dinheiro é ruim, e por um motivo prático e não estético:
 *
 * > **O dinheiro é o que o jogador usa para PLANEJAR. Loteria não se planeja.**
 *
 * Quem sabe que a Vigília rende ~1.200 decide comprar antes de mandar; quem não
 * sabe, guarda por precaução. E um idle em que o jogador guarda por precaução é
 * um idle onde a loja existe e não é usada.
 *
 * Então: **objeto continua sorteado, dinheiro passa a ser pago por encontro.**
 * A Essência fica na tabela — ela deixou de ser dinheiro e virou MATERIAL
 * (L-095), e material é exatamente a coisa que deve sair por sorte.
 *
 * ── A ESCALA, E O PEDIDO QUE A ORIGINOU ──────────────────────────────────
 *
 *     "ele ver dropando 100, maior que 10, já cria uma sensação de +farm"
 *
 * Ele está certo, e o efeito é real: a GRANDEZA do número carrega recompensa
 * percebida independente do poder de compra dele. Mas a frequência carrega
 * tanto quanto o tamanho — e é aí que pagar por encontro ganha de multiplicar
 * a tabela por dez: **todo encontro pinga um número de dois ou três dígitos.**
 * Multiplicar a Essência daria números grandes em 30% das vezes e nada nas
 * outras 70%.
 *
 * ── O ENCONTRO RARO PAGA MAIS, E ISSO É O DESENHO ────────────────────────
 *
 * A Vigília rende mais POR ENCONTRO, e não só mais no total. Sem isso, oito
 * horas seriam apenas "mais vezes", e o perfil deixaria de ser uma troca para
 * virar uma escala. É o mesmo princípio do `vies` da raridade, aplicado à
 * moeda.
 *
 *     perfil     por encontro  /hora   expedição cheia
 *     Batida      25– 45        187      75– 225
 *     Trilha      50– 92        166     300– 736
 *     Vigília     65–130        146     650–1.820
 *
 * ── AS DUAS LEITURAS ANDAM EM DIREÇÕES OPOSTAS, E ISSO É A TROCA ─────────
 *
 * Por ENCONTRO o valor sobe com a duração; por HORA ele desce. É o que impede
 * qualquer perfil de ser dominado — e a primeira versão destes números tinha
 * exatamente esse defeito: a Trilha rendia 140/h contra 158 da Vigília,
 * então ela era pior nas duas pontas e não havia motivo para escolhê-la.
 *
 * Um perfil dominado não é uma opção: é uma armadilha para quem ainda não fez
 * a conta.
 *
 * ── O QUE NÃO ANDA JUNTO ─────────────────────────────────────────────────
 *
 *     "sem perder a questão do equilíbrio do farm de xp, onde já existe o
 *      drop rate"
 *
 * XP e taxa de encontro **não** mudam. Se mudassem juntos, isto não seria
 * percepção — seria inflação, e a progressão inteira andaria de lugar. A suíte
 * afirma isso: XP por hora comparado contra a fixtura, não contra si mesmo.
 */

/* [mínimo, máximo] por encontro, por perfil. Inclusive nos dois extremos. */
export const PC_POR_ENCONTRO = {
  batida:  [25, 45],
  trilha:  [50, 92],
  vigilia: [65, 130],
};

export const FAIXA_PADRAO = [25, 45];

/* Quanto um encontro paga. `rnd` é a MESMA fonte da colheita — a semente nasce
   ali (§25.2), e não na partida: guardada antes, ela seria o resultado exposto
   a um F12 de distância. */
/* A FAIXA DE UM PERFIL, NUM LUGAR SO.
   `pagamentoDe` e `faixaDa` liam a tabela cada uma por si, com a mesma linha
   de reserva escrita duas vezes. Duas copias da mesma decisao e o comeco de
   duas decisoes diferentes: bastaria alguem mudar o padrao num dos dois para o
   que a tela PROMETE deixar de ser o que a colheita PAGA — e o teste que
   compara os dois passaria a comparar duas mentiras coerentes entre si.

   Tambem foi o que deixou o defeito S661 sem endereco: a linha aparecia duas
   vezes, e ancora ambigua reprova o pre-voo. O portao apontou um problema de
   projeto vestido de problema de ferramenta. */
export const faixaDo = perfil => PC_POR_ENCONTRO[perfil] ?? FAIXA_PADRAO;

export function pagamentoDe(rnd, perfil) {
  const [min, max] = faixaDo(perfil);
  return min + Math.floor(rnd() * (max - min + 1));
}

/* O total de uma colheita. Encontro a encontro, e não `n × média`: a soma de
   sorteios independentes tem a variação que o jogador sente como "hoje rendeu",
   e a média achatada tira exatamente isso sem devolver nada em troca. */
export function moedasDa(rnd, { perfil, encontros }) {
  const n = Math.max(0, Math.floor(encontros ?? 0));
  let total = 0;
  for (let i = 0; i < n; i++) total += pagamentoDe(rnd, perfil);
  return total;
}

/* O que a tela promete ANTES de o jogador mandar. Faixa, nunca número exato —
   prometer exato e pagar sorteado é a forma mais barata de perder confiança. */
export function faixaDa(perfil, [minEnc, maxEnc]) {
  const [min, max] = faixaDo(perfil);
  return [min * Math.max(0, minEnc), max * Math.max(0, maxEnc)];
}

/* ── A CHAVE DA BOLSA VEM DO PACK, E NÃO DAQUI ────────────────────────────
 *
 * Estava aqui, como uma constante com o nome do tema dentro, e foi o que o
 * portão `conteudo` apontou. **Um id é nome tanto quanto um rótulo**: quem lê
 * a chave da bolsa num arquivo do motor já sabe de que franquia é o jogo.
 *
 * O motor devolve um NÚMERO. Onde ele é guardado, e sob que nome, é pergunta do
 * pack — pela mesma razão que `pack.bolas` decide o que é uma bola barata.
 *
 * O material NÃO muda de chave: ele deixou de ser dinheiro e virou material
 * (L-095), e mudar de PAPEL não é mudar de nome. Por isso nenhum saldo salvo
 * precisa ser convertido — que era a razão de fazer isto ANTES de a loja
 * existir. */
export const idDaMoeda    = pack => pack?.moedaPve?.id ?? 'moeda';
export const idDoMaterial = pack => pack?.material?.id ?? 'material';
