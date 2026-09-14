/* O QUE A RUN DIZ SOBRE O FOCO DE CADA CRIATURA (camada 0).
 *
 * Puro: sem DOM, sem `Date.now()`, sem `innerHTML`. Ele devolve o que SE LÊ; a
 * coluna decide como pintar.
 *
 * ── POR QUE ELE EXISTE, E A LIÇÃO É A TERCEIRA DO MESMO BLOCO ────────────
 *
 * A primeira versão montava estas frases dentro do `avanco-painel.mjs`, no meio
 * da `innerHTML`. O portão Q2 cobrou o preço: dois defeitos plantados —
 * apagar o aviso do foco FUTURO, e engolir a frase do foco neutro — **passaram**,
 * porque nenhum teste conseguia ler a resposta sem montar um navegador.
 *
 *   > Frase que só existe dentro de uma string de HTML é frase que ninguém
 *   > consegue verificar.
 *
 * Antes disto, no mesmo bloco, aconteceu com a separação das placas (S934) e
 * com a contagem do quadro "quem apareceu" (S938). Três vezes a mesma doença, e
 * a mesma cura: a conta sai da camada que desenha, e ganha teste que olha o
 * RESULTADO em vez do texto do código.
 *
 * ── AS QUATRO LEITURAS, E A ORDEM DELAS É A DA VIDA DA CRIATURA ─────────
 *
 *     tem foco          o que ele rende AQUI — e "nada aqui" é resposta
 *     está reaprendendo a troca custa 48 h fora de campo
 *     pode escolher     chegou ao nível 12 e ainda não escolheu
 *     ainda vai poder   FALTAM N níveis — e este é o pedido literal do dono
 *
 * O último é o que motivou o item inteiro:
 *
 *   > "é necessário alguma outra forma de se visualizar o futuro foco do
 *   >  [companheiro] que é escolhido no lv 12"
 *
 * Sem ele, quem está no nível 7 lê uma linha vazia e conclui que o foco não é
 * para ele — e o foco é justamente o sistema que precisa ser DESCOBERTO para
 * existir.
 */
import { efeitoVivo, NIVEL_PARA_ESCOLHER, descansando } from '../../engine/foco.mjs';
import { FALA } from './foco-fala.mjs';

/* ── O QUE ESTÁ INERTE NO AVANÇO, E POR QUÊ ──────────────────────────────
 *
 * Mora aqui e não no motor: o `engine/foco.mjs` não conhece o Avanço, e a
 * fronteira é essa. O motor sabe o que cada foco FAZ; quem sabe o que este modo
 * ignora é este lado. */
export const INERTES_NO_AVANCO = [
  'encontros',   /* o elenco do estágio é FIXO em seis: não há o que achar a mais */
  'garantido',   /* pelo mesmo motivo — não há sorteio de quem aparece */
];

/* A frase de cada efeito vivo. Uma tabela e não um `switch`: efeito novo no
   motor entra com uma linha, e quem esquecer de escrevê-la vê `undefined` —
   que o filtro descarta, em vez de imprimir um objeto na tela. */
const FRASE = {
  material: v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% de material no baú`,
  itemRaro: v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% de chance no item raro`,
  aliados:  v => `+${Math.round(v * 100)}% para os OUTROS da equipe`,
};

/* ── O QUE AQUELE FOCO RENDE NESTA RUN ───────────────────────────────────
 *
 * `null` quando não há foco ou quando ele não existe — os dois são erro de quem
 * chamou, e colapsá-los com "neutro" faria um foco escrito errado aparecer na
 * tela como se estivesse tudo bem.
 *
 * E o NEUTRO se DIZ, em vez de se esconder: o jogador escolheu aquele foco e
 * precisa saber que ele está guardado para outro modo, e não quebrado. Uma
 * linha em branco no lugar de uma explicação é lida como defeito. */
export function valeNaRun(foco, perfil) {
  const vivo = efeitoVivo(foco, perfil, { inertes: INERTES_NO_AVANCO });
  if (!vivo) return null;
  const partes = Object.entries(vivo)
    .map(([chave, valor]) => FRASE[chave]?.(valor))
    .filter(Boolean);
  return partes.length ? partes.join(' · ') : 'nada aqui — ele rende na Rota OFF';
}

/* ── A LEITURA INTEIRA DE UMA CRIATURA ───────────────────────────────────
 *
 * Devolve `{ estado, selo, linha, cor }`. `estado` é o que o teste afirma e o
 * CSS escolhe; `selo` e `linha` são o que o jogador lê. A cor vem da tabela do
 * motor, e não de uma paleta própria: duas cores para o mesmo Batedor
 * obrigariam o jogador a aprender duas. */
export function leituraDoFoco(criatura, { perfil, agora = 0 } = {}) {
  const nivel = Math.floor(Number(criatura?.nivel) || 1);
  const fala = criatura?.foco ? FALA[criatura.foco] : null;

  if (fala)
    return { estado: 'tem', selo: fala.nome, cor: fala.cor,
             linha: valeNaRun(criatura.foco, perfil) ?? fala.resumo };

  if (descansando(criatura, agora))
    return { estado: 'reaprendendo', selo: 'reaprendendo', cor: null,
             linha: 'a troca custa 48 h fora de campo — ela termina sozinha' };

  if (nivel >= NIVEL_PARA_ESCOLHER)
    /* NÃO OFERECE O CLIQUE: a janela do foco mora na tela de escolha, e abri-la
       por cima da run pediria uma decisão de longo prazo no meio de uma luta.
       A coluna avisa; a decisão espera a volta. */
    return { estado: 'pode', selo: 'escolher foco', cor: null,
             linha: 'ela já pode escolher — a janela abre ao voltar da run' };

  const faltam = NIVEL_PARA_ESCOLHER - nivel;
  return { estado: 'futuro', selo: `no nível ${NIVEL_PARA_ESCOLHER}`, cor: null,
           linha: `faltam ${faltam} nível(is) para ela escolher` };
}
