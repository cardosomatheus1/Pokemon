/* QUAL PACK O PRODUTO CARREGA (F1.12).
 *
 * ESTE É O ÚNICO ARQUIVO FORA DE `content/` QUE PODE NOMEAR UM PACK — e ele
 * está dentro de `content/` justamente por isso. O motor, o servidor e o
 * cliente importam daqui e não sabem qual pack receberam.
 *
 * ── POR QUE UM ARQUIVO E NÃO UMA VARIÁVEL DE AMBIENTE ─────────────────────
 *
 * Porque o pack precisa ser resolvido em tempo de IMPORTAÇÃO, nos dois
 * ambientes. No navegador não há variável de ambiente, e um `import()` dinâmico
 * assíncrono espalharia `await` pelo boot inteiro para responder algo que não
 * muda durante a execução.
 *
 * A escolha vira um commit, o que é o certo: trocar o pack do produto é
 * decisão de lançamento, não de configuração de instância. Duas instâncias do
 * mesmo build não podem estar jogando jogos diferentes — a telemetria de
 * retenção se misturaria, e é exatamente ela que o §0.3.1 existe para
 * proteger.
 *
 * ── O QUE NÃO EXISTE AQUI, DE PROPÓSITO ────────────────────────────────────
 *
 * Não há fallback. Se o pack escolhido não carregar, o processo falha ao subir
 * — ele NÃO cai para o outro. "O resgate busca a mesma coisa em outro endereço,
 * nunca outra coisa", e é a lição registrada da v0.6.1: um resgate que troca a
 * coisa transforma "faltou um arquivo" em "o jogo inteiro saiu errado", e
 * ninguém percebe porque a tela continua bonita.
 */
import kanto from './pokemon_kanto_v1.mjs';
import original from './original_v1.mjs';
import { comArteEmprestada } from './arte-emprestada.mjs';

/* Os packs que existem, por id. Um mapa e não uma cadeia de `if`: acrescentar
   um pack é uma linha, e a lista é auditável de uma olhada. */
export const PACKS = {
  [kanto.id]: kanto,
  [original.id]: original,
};

/* O ESCOLHIDO. Trocar esta linha é a troca de tema do §0.3.1, e ela é o
   critério de saída do F1.12 — a V1 lança no `original_v1`.
 *
 * Continua em `pokemon_kanto_v1` porque a ARTE do pack original não existe
 * ainda (L-042): lançar com 76 silhuetas seria trocar um risco comercial por um
 * problema de produto. A troca é UMA LINHA, e é essa a promessa da Content
 * Layer — o resto do trabalho já está feito e testado. */
export const ID_ESCOLHIDO = 'pokemon_kanto_v1';

/* ── A ARTE EMPRESTADA, E POR QUE ELA ESTÁ DESLIGADA ────────────────────────
 *
 * O mecanismo existe e está testado: preenchido com o id de outro pack, o pack
 * escolhido veste a arte daquele em vez da própria.
 *
 * ELE FOI LIGADO UMA VEZ E DESLIGADO NA MESMA SESSÃO, e a razão vale registrar
 * porque é uma lição de produto, não de código. Ligá-lo COM `ID_ESCOLHIDO` no
 * pack original produziu criaturas de nome autoral sobre sprites da franquia:
 * um Pinsir chamado Lúmenara. As duas metades corretas, e a combinação sem
 * sentido nenhum para quem olha.
 *
 * Arte emprestada só faz sentido quando a arte e os nomes vêm do MESMO tema.
 * Enquanto o pack original não tiver os próprios desenhos (L-042), o jogo roda
 * no pack de desenvolvimento inteiro — nome e arte do mesmo lugar.
 *
 * Quando `ARTE_EMPRESTADA_DE` estiver preenchido, o §0.3.1 NÃO está satisfeito:
 * o que aquela seção proíbe é PUBLICAR um produto com stake econômico sobre
 * assets de terceiros. O `test/saida-v09.mjs` cobra o registro disso. */
export const ARTE_EMPRESTADA_DE = null;

/* RESOLVER É UMA FUNÇÃO, e não uma busca solta, por dois motivos.
 *
 * O primeiro é testabilidade: dá para perguntar "e se o id não existir?" sem
 * quebrar o processo. Como constante, a única forma de testar a ausência de
 * fallback seria ler o código-fonte — e teste que lê fonte não prova
 * comportamento.
 *
 * O segundo é que a regra fica num lugar só, escrita uma vez: NÃO EXISTE
 * FALLBACK. Um `?? outroPack` aqui transformaria "faltou um arquivo" em "o jogo
 * inteiro saiu errado" — e ninguém perceberia, porque a tela continua bonita.
 * É a lição da v0.6.1, e é a sabotagem nº 2 deste bloco. */
export function resolver(id) {
  const p = PACKS[id];
  if (!p) throw new Error(`ContentPack \`${id}\` não existe. O processo NÃO cai ` +
    `para outro pack: o resgate busca a mesma coisa em outro endereço, nunca ` +
    `outra coisa (v0.6.1, §0.3.1).`);
  return p;
}

/* A COMPOSIÇÃO, e ela é o último passo de propósito: `resolver` continua sendo
   a função que prova a ausência de fallback, e o empréstimo é uma camada por
   cima — não uma exceção dentro dela. */
export function escolher(id = ID_ESCOLHIDO, arteDe = ARTE_EMPRESTADA_DE) {
  const base = resolver(id);
  return arteDe ? comArteEmprestada(base, resolver(arteDe)) : base;
}

export default escolher();
