/* O SELETOR DE ESTÁGIO, E O QUE ELE MOSTRA ANTES (bloco 1.10, camada 4).
 *
 * Módulo próprio, e não mais um pedaço do `idle-tela.mjs`: aquele arquivo já
 * bateu 600 linhas duas vezes, e a divisão aqui é por RESPONSABILIDADE — o
 * seletor de estágio responde uma pergunta que nenhum outro painel responde:
 *
 *     QUÃO FUNDO eu vou, e o que mora lá?
 *
 * O bioma diz ONDE. O perfil diz POR QUANTO TEMPO. O estágio diz QUÃO FUNDO —
 * três decisões independentes, e é a combinação delas que faz a rota ser uma
 * escolha em vez de um botão.
 *
 * ── A PRÉVIA É O PONTO DO BLOCO ──────────────────────────────────────────
 *
 * Pedido do dono, na L-084: clicar no estágio mostra o que se ganha **antes de
 * gastar as horas**. É a mesma regra que já governa o canvas do bioma —
 *
 *   > escolher a rota é a decisão do idle, e ela é cega se o jogador só
 *   > descobrir o lugar depois de mandar
 *
 * — e ela vale em dobro aqui, porque uma Vigília custa oito horas de relógio de
 * parede. Um jogador que descobre depois que o estágio 3 não tinha o que ele
 * queria perdeu a noite, e nenhuma tela conserta isso depois.
 *
 * ── OS SPRITES SÃO ANIMADOS, E ISSO É REGRA ──────────────────────────────
 *
 * L-080, regra permanente do dono: todo sprite mostrado ao jogador é GIF
 * animado. A prévia é vitrine — é onde ela mais importa.
 *
 * ── A CHANCE DE TREINADOR CHEGOU NO 1.7b ────────────────────────────────
 *
 * Ela estava no pedido da L-084 desde o começo e NÃO entrou no 1.10, por
 * decisão escrita: a batalha não existia, e mostrar a porcentagem de uma coisa
 * que não acontece é a moldura vazia que a L-099 já cobrou caro deste projeto.
 *
 * Agora a batalha existe, então o número aparece. É a terceira vez neste
 * projeto que a mesma regra decide QUANDO uma coisa entra na tela — a barra de
 * XP esperou o 1.14, o `foco` continua esperando (L-102), e esta esperou aqui.
 */
import { $, nosDois } from './dom.mjs';
import { estiloDa, classeDa } from './raridade.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { retratoAnimado } from './sprites.mjs';
import { previaDeEncontros, PERFIS } from '../../engine/expedicao.mjs';
import {
  ESTAGIOS_POR_BIOMA, nivelDoEstagio, faixasDoEstagio,
  estagioMaximo, proximoEstagio,
} from '../../engine/estagios.mjs';
import { chanceDoEstagio, nivelDoNpc } from '../../engine/npc.mjs';

/* Quantas espécies a prévia mostra. Doze cabe em duas fileiras nas larguras
   grandes e continua legível no estreito; mais que isso vira catálogo, e
   catálogo é a wiki (L-093), não a decisão de agora. */
const QUANTAS = 12;

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };
/* O NOME DA FAIXA VEM DO PROPRIO ID, e a primeira versao leu a coluna errada.
   `pack.raridade` e `[id, bst, chance, nivel]`: o indice 1 e o BST, e os chips
   sairam mostrando "340 · 420" onde deviam dizer "comum · incomum".

   Numero no lugar de palavra e o pior tipo de erro de leitura — ele nao parece
   quebrado, parece INFORMACAO. O jogador teria tentado interpretar aqueles
   numeros, e nenhuma interpretacao possivel estaria certa.

   As faixas nao tem nome de exibicao no pack; o id ja e a palavra. Separar o
   camelCase e apresentacao, e nao tema: `muitoRaro` vira "muito raro" em
   qualquer pack, com qualquer elenco. */
const nomeDaFaixa = r => String(r ?? "")
  .replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

/* ── OS CHIPS ─────────────────────────────────────────────────────────────
 *
 * O estágio trancado APARECE, e diz o que pede. Esconder o que ainda não se
 * pode fazer é o erro mais comum de progressão: o jogador não persegue o que
 * não sabe que existe, e descobre o sistema por acidente três semanas depois.
 *
 * É a mesma decisão da `proximaVaga` no 1.9 e do contador do teto no D-067:
 * limite invisível é indistinguível de limite quebrado. */
export function pintarEstagios(criaturas, { escolhido, bioma }) {
  /* O MESMO painel serve ROTAS e ROTA OFF — ver `nosDois` no dom.mjs. */
  const alvos = nosDois('Estagios');
  const alvo = alvos[0];
  /* ESCREVE NOS DOIS. Uma função explícita, e não um objeto com setter: a
     versão anterior era um espelho engenhoso que o `test/origem` leu como
     chamada de `innerHTML(...)` — e ele estava certo em desconfiar.
     Esperteza que confunde quem lê o código confunde quem o analisa. */
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };
  if (!alvo) return;
  const maximo = estagioMaximo(criaturas);
  const prox = proximoEstagio(criaturas);

  const chips = [];
  for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
    const aberto = n <= maximo;
    const faixas = faixasDoEstagio(n).map(nomeDaFaixa).join(' · ');
    chips.push(`
      <button class="estChip${n === escolhido ? ' on' : ''}${aberto ? '' : ' trancado'}"
              data-estagio="${n}" ${aberto ? '' : 'disabled'}
              title="${aberto ? faixas : `pede uma criatura no nível ${nivelDoEstagio(n)}`}">
        <b>${n}</b>
        <span class="estFaixas">${aberto ? faixas : `nível ${nivelDoEstagio(n)}`}</span>
        ${aberto ? `<span class="estNpc" title="treinadores de nível ${nivelDoNpc(n)} guardam este estágio">${(chanceDoEstagio(n) * 100).toFixed(0)}% treinador</span>` : ''}
        ${aberto ? '' : '<i class="estCadeado">🔒</i>'}
      </button>`);
  }

  const nota = prox
    ? `A porta do estágio ${prox.estagio} abre com uma criatura no nível ` +
      `<b>${prox.nivel}</b> — faltam ${prox.faltam}.`
    : 'Todos os estágios abertos.';

  escrever(`<div class="estChips">${chips.join('')}</div>` +
                   `<p class="tiny estNota">${nota}</p>`);
}

/* ── A PRÉVIA ─────────────────────────────────────────────────────────────
 *
 * A chance vem do MOTOR (`previaDeEncontros`), e não de uma conta feita aqui.
 * Se a tela recalculasse, ela e o sorteio divergiriam no primeiro ajuste — e o
 * jogador veria uma promessa que a colheita não cumpre, sem que nenhum dos dois
 * números estivesse obviamente errado. É a lição do §7.11 sobre o comparador de
 * moveset, aplicada de novo. */
export function pintarPrevia(bioma, perfil, estagio) {
  /* ── NAS DUAS ABAS (L-164) ────────────────────────────────────────────
     Queixa do dono sobre a Rota OFF: "hoje, por exemplo, não aparece os
     [do] bioma". Ela existia só em ROTAS.

     E a Rota OFF é onde ela pesa MAIS: ali o jogador fecha o jogo e volta
     horas depois. Escolher o lugar sem ver quem mora nele é escolher às
     cegas por oito horas — em ROTAS ele ao menos assiste e descobre no
     caminho.

     O MESMO código escrevendo nos dois é o que impede as abas de discordarem
     sobre quem mora no mesmo lugar. */
  const alvos = nosDois('Previa');
  const alvo = alvos[0];
  /* ── E ESTA FUNÇÃO CHAMAVA UM `escrever` QUE NÃO É DELA (D-088) ───────
   *
   * A linha do estágio vazio chamava `escrever(...)` — e essa `const` mora
   * dentro da `pintarEstagios`, outra função. Fora dali ela é um
   * `ReferenceError`, e ele derruba o desenho da aba inteira.
   *
   * Ele nunca disparou porque só existe quando o estágio não tem espécie
   * nenhuma, e isso não acontece no pack de Kanto. Um save que cite bioma
   * removido, ou um pack novo com um estágio vazio, e a aba cai.
   *
   *   > Erro que espera um dado que ainda não existe é o pior de achar: ele
   *   > não tem sintoma até o dia em que tem, e nesse dia ninguém liga a causa
   *   > ao lugar.
   *
   * Achado ao trazer a prévia para a Rota OFF — o passo de LER o código que se
   * vai mexer, e não um teste. */
  const escreverNaPrevia = html => { for (const el of alvos) el.innerHTML = html; };
  if (!alvo) return;
  const lista = previaDeEncontros({ pack: PACK, bioma, perfil, estagio });
  if (!lista.length) {
    escreverNaPrevia('<p class="tiny">Nada aparece aqui neste estágio.</p>');
    return;
  }
  const mostra = lista.slice(0, QUANTAS);
  const restam = lista.length - mostra.length;

  escreverNaPrevia(
    `<div class="prvGrade">${mostra.map(e => {
      const s = esp(e.dex);
      return `<span class="prvItem ${classeDa(e.raridade)}" style="${estiloDa(e.raridade)}" title="${nomeExibido(s.n)} · ${
        nomeDaFaixa(e.raridade)} · ${e.chance.toFixed(1)}%">
        ${retratoAnimado(s, 'class=\"prvArte\"', false)}
        <b class="prvNome">${nomeExibido(s.n)}</b>
        <u class="prvChance">${e.chance.toFixed(1)}%</u>
      </span>`;
    }).join('')}</div>` +
    `<p class="tiny prvRodape">${lista.length} espécie(s) neste estágio` +
    `${restam > 0 ? ` · mostrando as ${QUANTAS} mais prováveis` : ''}` +
    ` · ${PERFIS[perfil]?.rotulo ?? perfil}</p>`);
}
