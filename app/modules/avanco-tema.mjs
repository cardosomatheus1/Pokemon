/* O QUE A CENA DO AVANÇO PRECISA SABER DO TEMA — bloco A4b (camada 4).
 *
 * Duas perguntas, e as duas têm a mesma forma: um número do motor entra, um
 * texto do pack sai.
 *
 *     QUEM É ele        um `dex` vira o nome exibido
 *     QUE GOLPE foi     um índice sorteado vira o nome do golpe
 *
 * ── POR QUE ISTO É UM ARQUIVO, E NÃO DUAS LINHAS NA CENA ─────────────────
 *
 * Porque a cena **não pode conhecer o pack**. Ela desenha criaturas; QUEM elas
 * são é tema, e o §0.3 põe tema atrás do ContentPack. O `avanco-cena.mjs`
 * recebe estas duas funções por argumento e nunca importa o pack — é o mesmo
 * arranjo que o `idle-habitantes.mjs` já usa.
 *
 * E o motor está do outro lado da mesma linha: o `roteiro-wave.mjs` sorteia o
 * ÍNDICE do golpe e não sabe o nome de nenhum. Sem esse cuidado, um pack novo
 * exigiria mexer no motor para trocar um texto.
 */
import { PACK, nomeExibido, tipoCores } from './motor.mjs';
import { repertorio } from '../../engine/repertorio.mjs';

const especieDe = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? null;

export const nomeDoDex = dex => nomeExibido((especieDe(dex) ?? { n: '?' }).n);

/* ── O GOLPE SAI DO TIPO DA ESPÉCIE ──────────────────────────────────────
 *
 * A mesma fonte que a arena usa (`pack.golpes[tipo]`), e é por isso que um
 * bicho de inseto dá golpe de inseto nos dois lugares. O jogador que aprendeu
 * a ler a arena já sabe ler isto.
 *
 * Sem tipo, ou sem golpe declarado para aquele tipo, devolve VAZIO — e o balão
 * simplesmente não aparece. Um balão com o id cru dentro seria pior que balão
 * nenhum: id na tela não é um nome faltando, é um nome ERRADO, e o jogador lê
 * como se fosse o certo. É a lição do `itens-nome.mjs`, aplicada aqui. */
/* ── E O NÍVEL DECIDE O QUE ELA SABE (L-168) ──────────────────────────────
 *
 * Queixa do dono: *"um charmander lv 1-2 era pra usar fire blast? Flamethrower?
 * os poderes são liberados gradativamente com o nível"*.
 *
 * O sorteio corria a lista INTEIRA do tipo, sem olhar quem batia — então o
 * nível decidia o poder em todo lugar do sistema menos no único lugar onde o
 * jogador VÊ o golpe acontecer.
 *
 * Quem peneira é o `repertorio` do motor, e a conta é dele: este arquivo é
 * tema, e não sabe fazer curva. O índice continua vindo do motor da wave e
 * continua caindo dentro da lista — só que a lista agora é a do nível dela.
 *
 * SEM NÍVEL, a peneira não acontece: quem chamar sem o argumento recebe o
 * comportamento de antes. É deliberado — um chamador esquecido não pode ficar
 * com balão vazio, e a suíte cobra o argumento onde ele importa. */
export function golpeDoDex(dex, i, nivel = null) {
  const todos = (PACK.golpes ?? {})[(especieDe(dex)?.t ?? [])[0]] ?? [];
  const lista = nivel == null ? todos : repertorio(nivel, todos);
  const mv = lista.length ? lista[i % lista.length] : null;
  if (!mv) return null;
  /* ── A COR VEM DO TIPO, COMO NA ARENA ─────────────────────────────────
     Pedido do dono: *"na arena, cada ataque o balão sai com a cor do tipo de
     ataque (…) faz o mesmo aqui"*. E é literalmente a mesma linha de lá —
     `eventos.mjs` faz `bub.style.borderColor = tipoCores[mv.t]`.

     Reusar a tabela do pack em vez de escolher cores aqui é o que garante que
     um golpe de água tenha o mesmo azul nos dois lugares. Duas paletas para a
     mesma coisa divergem no dia em que alguém ajustar uma. */
  return { nome: mv.n, cor: (PACK.tipos?.cores ?? tipoCores ?? {})[mv.t] || null };
}
