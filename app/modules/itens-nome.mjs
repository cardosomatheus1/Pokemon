/* O NOME DE CADA ITEM (bloco 1.22, camada 0).
 *
 * ── POR QUE ELE PRECISOU SAIR DE ONDE ESTAVA ─────────────────────────────
 *
 * Esta resolução existia desde o 1.12, **presa dentro de `pintarBolsa`**. A
 * nota que a acompanhava lá continua sendo a razão de ela existir:
 *
 *   > Id na tela não é um nome faltando: é um nome ERRADO, porque o jogador lê
 *   > e acha que aquilo é o nome.
 *
 * Enquanto só a mochila precisava, morar dentro dela era certo. Depois o 1.20
 * pôs a linha de evolução na Pokédex e o 1.21 pôs o selo no cartão da criatura,
 * e os dois passaram a precisar do mesmo. O que aconteceu com cada um:
 *
 *     Pokédex     chamou `falaDaExigencia(exige)` SEM resolvedor, e a seta de
 *                 evolução mostrava `firestone` no lugar de "Pedra do Fogo"
 *     idle-tela   chamou `nomeDoItemPack(id)` — um nome que eu INVENTEI ao
 *                 escrever a linha e nunca escrevi de verdade. Ele derrubou a
 *                 aba de Rotas inteira do dono. É o D-074.
 *
 * Os dois são a mesma falta, chegando por portas diferentes: **quando a função
 * certa não tem endereço público, o segundo chamador inventa um.** Um inventou
 * o silêncio (id cru na tela), o outro inventou o nome (referência para o
 * vazio).
 *
 * ── A ORDEM DAS FONTES É A ORDEM DA ESPECIFICIDADE ───────────────────────
 *
 * O catálogo vem primeiro porque é ele que tem os 368 itens com nome próprio;
 * `bolas` e `itens` são listas antigas e curtas do pack; moeda e material são
 * casos únicos que não moram em lista nenhuma. O id cru é o último recurso — e
 * quando ele aparece na tela, é sinal de item novo sem cadastro, não de erro
 * desta função.
 *
 * Camada 0: entra pack e id, sai texto. Sem DOM e sem estado, e por isso
 * conferível num teste de Node — que é o que faltava para a linha do 1.21 ter
 * sido pega antes de chegar no dono.
 */
import { idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';

/* Nada de identificador da franquia aqui (§0.3): os nomes todos vêm do pack. */
export function nomeDoItem(pack, id) {
  if (id == null) return '';
  const chave = String(id);
  /* A PARTE DE ESTILHAÇO (L-160, ST-3.1). A bolsa guarda `est:<id>`, e desde
     a ST-3.1 o baú do Avanço também entrega partes — o quadro da run as lista.
     O nome é o do item de origem: "Estilhaço de Pedra do Fogo". */
  if (chave.startsWith('est:')) return `Estilhaço de ${nomeDoItem(pack, chave.slice(4))}`;
  return (pack?.catalogo ?? []).find(i => i.id === chave)?.nome
      ?? (pack?.bolas ?? []).find(b => b.id === chave)?.rotulo
      ?? (pack?.itens ?? []).find(i => i.id === chave)?.rotulo
      ?? (chave === idDaMoeda(pack) ? pack?.moedaPve?.nome : null)
      ?? (chave === idDoMaterial(pack) ? pack?.material?.nome : null)
      ?? chave;
}

/* A forma CURRIED, que é a que os chamadores querem: `oQueFalta` e
   `falaDaExigencia` recebem um `nomeDoItem(id)` de um argumento só, porque a
   camada 0 delas não conhece o pack. Existir aqui evita cada chamador escrever
   a própria lambda — que foi exatamente onde o D-074 nasceu. */
export const nomesDe = pack => id => nomeDoItem(pack, id);
