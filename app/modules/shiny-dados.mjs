/* COSMÉTICOS SHINY — o que está desbloqueado, o que está equipado, e de onde
 * vem o desbloqueio.
 *
 * Puro: sem DOM, sem estado global. Recebe o perfil e responde.
 *
 * DUAS COISAS DIFERENTES, ganhas juntas e equipadas separado:
 *   GIF   o retrato animado. Vale no banner de batalha, no do perfil e no
 *         avatar. É cosmético de VITRINE.
 *   SKIN  a folha de animação da ARENA. É a única coisa que muda o bicho
 *         DENTRO da luta, e por isso é o cosmético mais visível do jogo.
 *
 * DE ONDE VEM A ARTE, e por que dá para confiar nela — medição do autor da
 * v1.0, conferida e registrada: o SpriteCollab guarda o shiny em
 * `sprite/{dex}/0000/0001/`, que é a MESMA arte recolorida. Baixando as duas
 * folhas do Pikachu, o canal alfa é idêntico e a contagem de pixels por cor
 * bate exatamente (3960/3960, 3165/3165, 1503/1503); o que muda é só a paleta.
 * A silhueta — que é o que a coreografia usa — não se mexe, e `AnimData.xml` e
 * as dimensões são idênticos. Por isso a tabela PMD continua valendo sem uma
 * alteração: trocar para shiny é trocar o caminho da URL.
 *
 * ===================================================================
 * A FONTE DO DESBLOQUEIO É DECISÃO DESTE BLOCO, e ela não veio pronta.
 * ===================================================================
 *
 * No trabalho dele o shiny saía do baú. Os baús ficaram fora do porte por
 * decisão do dono do projeto — vão pelo nosso roadmap, com o nosso cálculo — e
 * o cosmético precisava de outra origem.
 *
 * Escolhido: NÍVEL DO TREINADOR, com ESCOLHA do jogador.
 *
 *   · uma vaga a cada `NIVEIS_POR_VAGA` níveis
 *   · o jogador escolhe QUAL Pokémon ocupa a vaga, entre os que ele já apostou
 *   · desbloquear dá GIF e SKIN juntos; equipar cada um é separado
 *
 * Três razões, e nenhuma é estética:
 *
 * 1. NÃO TOCA A ECONOMIA. O D-007 registra que a emissão dos desafios já
 *    estoura em 6,5× o orçamento do Estudo Econômico. Uma fonte de cosmético
 *    que custasse moeda entraria numa conta que hoje não fecha, e o bloco
 *    passaria a depender de uma decisão que é do F1.10.
 * 2. NÃO É CAIXA. O §11.3 lista "loot box paga sem transparência" entre os
 *    pilares a evitar. Aqui não há sorteio nenhum: o jogador sabe exatamente
 *    quando ganha a vaga e escolhe o que pôr nela.
 * 3. É UM GATILHO, NÃO UM SISTEMA. Trocar a fonte depois — para o baú, quando
 *    ele existir pelo nosso desenho, ou para medalha — é mudar esta função e
 *    mais nada. O resto do bloco entrega o cosmético funcionando.
 */

/* Pasta do recolor dentro do SpriteCollab. Não é outro desenho: é o mesmo
   arquivo com outra paleta — ver a medição acima. */
export const SHINY_PMD = '0000/0001/';

/* Uma vaga a cada cinco níveis. O primeiro nível não dá vaga: o treinador
   novo tem o que fazer antes de escolher cosmético, e dar um de graça no
   segundo minuto tiraria o peso do primeiro. */
export const NIVEIS_POR_VAGA = 5;

export function vagasNoNivel(nivel) {
  return Math.max(0, Math.floor((nivel | 0) / NIVEIS_POR_VAGA));
}

export const SHINY_VAZIO = { gifs: [], skins: [], onGif: {}, onSkin: {} };

/* Guarda defensiva: estas funções são chamadas de dentro do desenho da arena,
   que roda a cada quadro. Perfil ausente ou de versão antiga responde "não",
   nunca lança — um erro aqui derrubaria o desenho da luta inteira. */
function dados(perfil) {
  if (!perfil || !perfil.shiny) return null;
  return perfil.shiny;
}

/* DESBLOQUEADO **E** EQUIPADO. São dois estados distintos de propósito: quem
   desbloqueou pode querer o visual normal de volta sem perder a conquista. */
export function gifShinyAtivo(perfil, dex) {
  const s = dados(perfil); if (!s) return false;
  return (s.gifs || []).includes(+dex) && s.onGif[dex] !== false;
}

export function skinShinyAtiva(perfil, dex) {
  const s = dados(perfil); if (!s) return false;
  return (s.skins || []).includes(+dex) && s.onSkin[dex] !== false;
}

export const vagasUsadas = perfil => (dados(perfil)?.gifs || []).length;

export function vagasLivres(perfil, nivel) {
  return Math.max(0, vagasNoNivel(nivel) - vagasUsadas(perfil));
}

/* Desbloqueia um Pokémon numa vaga. Devolve `false` sem alterar nada quando
   não há vaga ou quando ele já está desbloqueado — gastar vaga em duplicata
   seria perder uma conquista sem aviso. */
export function desbloquear(perfil, dex, nivel) {
  const s = dados(perfil); if (!s) return false;
  const d = +dex;
  if (s.gifs.includes(d)) return false;
  if (vagasLivres(perfil, nivel) < 1) return false;
  s.gifs.push(d); s.skins.push(d);
  s.onGif[d] = true; s.onSkin[d] = true;
  return true;
}

export function alternar(perfil, campo, dex) {
  const s = dados(perfil); if (!s) return false;
  const chave = campo === 'gif' ? 'onGif' : 'onSkin';
  const lista = campo === 'gif' ? s.gifs : s.skins;
  if (!lista.includes(+dex)) return false;
  s[chave][dex] = s[chave][dex] === false;
  return s[chave][dex];
}
