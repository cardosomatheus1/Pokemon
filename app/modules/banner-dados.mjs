/* Cosméticos do banner de batalha — catálogo puro, sem DOM.
 *
 * São dez cenários e oito efeitos de nome, e nenhum deles baixa um byte: os
 * cenários são gradiente e `::after`, os efeitos são sombra e animação. Quatro
 * cenários e três efeitos chegaram com a identidade do V1.13; os demais vêm da
 * base da v1.0 do porte.
 *
 * A LISTA E O CSS PRECISAM FECHAR NOS DOIS SENTIDOS, e é o que `test/banner.mjs`
 * afirma. Entrada sem classe deixa o jogador escolher um cenário que não
 * desenha — ele salva, volta amanhã e o banner está vazio, sem erro nenhum no
 * console. Classe sem entrada é CSS inalcançável, que fica lá para sempre
 * porque não quebra nada.
 *
 * OS SEIS ANTIGOS CONTINUAM NA LISTA de propósito: quem já tinha um escolhido
 * não perde o visual do banner numa atualização.
 */
/* As dez do ACERVO (R30) entram por CONCATENAÇÃO, e não copiadas para cá.
 * Copiar criaria a segunda lista da mesma coisa — que é exatamente o que o R10
 * desfez ao matar o catálogo `.sc-*`, e pelo mesmo motivo: duas listas para uma
 * pergunta só divergem no primeiro dia em que alguém edita uma delas. Lá o
 * catálogo mora junto do recorte e das duas posições de enquadramento; aqui
 * ele só é oferecido ao jogador. */
import { BANNERS } from './artes-dados.mjs';
import { CENAS_ARTE } from './acervo-dados.mjs';

export const BN_CENAS = [
  { id:'cidade',    nm:'Cidade Neon' },
  { id:'portal',    nm:'Portal da Arena' },
  { id:'nucleo',    nm:'Núcleo' },
  { id:'grade',     nm:'Grade Synth' },
  { id:'campo',     nm:'Campo Aberto' },
  { id:'deserto',   nm:'Deserto' },
  { id:'cachoeira', nm:'Cachoeira' },
  { id:'caverna',   nm:'Caverna' },
  { id:'noturna',   nm:'Floresta Noturna' },
  { id:'poente',    nm:'Pôr do Sol' },
  ...CENAS_ARTE.map(c => ({ id: c.id, nm: c.nm })),
  /* AS CATORZE DO R43 entram pela mesma porta, e por concatenação em vez de
     cópia — pelo mesmo motivo que as do acervo: uma lista copiada é uma lista
     que diverge no dia em que alguém mexe só numa. O catálogo delas guarda o
     ENQUADRAMENTO além do nome, e é por isso que ele mora noutro arquivo; aqui
     só entra o que a escolha precisa: id e nome. */
  ...BANNERS.map(b => ({ id: b.id, nm: b.nm })),
];

export const BN_EFEITOS = [
  { id:'neon',     nm:'Neon',      ico:'💠' },
  { id:'glitch',   nm:'Glitch',    ico:'📺' },
  { id:'holo',     nm:'Holograma', ico:'🛸' },
  { id:'chama',    nm:'Chama',     ico:'🔥' },
  { id:'gelo',     nm:'Gelo',      ico:'❄️' },
  { id:'veneno',   nm:'Veneno',    ico:'☠️' },
  { id:'trovao',   nm:'Trovão',    ico:'⚡' },
  { id:'fantasma', nm:'Fantasma',  ico:'👻' },
  /* Os quatro do R38. Eles animam propriedades DIFERENTES das dos oito acima —
     gradiente, escala, recorte no glifo e sombra — e não só outra cor do mesmo
     pulso de caixa. Ver a nota longa no CSS. */
  { id:'aurora',   nm:'Aurora',    ico:'🌌' },
  { id:'pulso',    nm:'Pulso',     ico:'💗' },
  { id:'ouro',     nm:'Ouro',      ico:'🏆' },
  { id:'abismo',   nm:'Abismo',    ico:'🕳️' },
];

/* ═══ R40 · AS MOLDURAS DE AVATAR ═══════════════════════════════════════════
 *
 * O retrato do banner de batalha era a ÚNICA foto sem moldura do produto: o
 * `#profAvatar` da customização tem canto arredondado, borda e sombra, e o
 * `.bnTreinador` tinha só `object-fit` e uma sombra projetada — imagem crua
 * largada no canto. Era isso que fazia o recorte quadrado saltar aos olhos.
 *
 * AS DOZE PRIMEIRAS SÃO OS DOZE EFEITOS DE NOME, e isso é decisão, não
 * preguiça: o jogador que equipou "Chama" no nome tem como vestir a moldura do
 * mesmo tema, e o guarda-roupa passa a ter conjunto em vez de peça solta.
 *
 * DUAS SÃO ESTÁTICAS DE PROPÓSITO — Gelo e Abismo. A estática não é a versão
 * pobre: gelo parado é gelo, gelo animado vira água; e o Abismo É a ausência
 * de luz, então piscar seria negar o tema.
 *
 * AS SEIS ÚLTIMAS não vêm de efeito nenhum. A Placa e o Circuito existem
 * porque um catálogo só de cosmético gritante não tem o que dar de graça —
 * precisa haver a sóbria. O Circuito Vivo é o mesmo desenho energizado, e é o
 * par que mostra que estático e animado convivem no mesmo tema.
 *
 * TUDO ESTÁ LIBERADO PORQUE O PROJETO ESTÁ EM DESENVOLVIMENTO. Isto é estado
 * temporário: a decisão do dono do projeto é que cosmético se desbloqueia por
 * missão, loja ou baú. O caminho da posse existe e está aberto; ligar a trava
 * depois é uma linha, inventar a posse depois é um bloco. */
export const BN_MOLDURAS = [
  { id:'neon',     nm:'Neon',       ico:'💠' },
  { id:'glitch',   nm:'Glitch',     ico:'📺' },
  { id:'holo',     nm:'Holograma',  ico:'🛸' },
  { id:'chama',    nm:'Chama',      ico:'🔥' },
  { id:'gelo',     nm:'Gelo',       ico:'❄️' },
  { id:'veneno',   nm:'Veneno',     ico:'☠️' },
  { id:'trovao',   nm:'Trovão',     ico:'⚡' },
  { id:'fantasma', nm:'Fantasma',   ico:'👻' },
  { id:'aurora',   nm:'Aurora',     ico:'🌌' },
  { id:'pulso',    nm:'Pulso',      ico:'💗' },
  { id:'ouro',     nm:'Ouro',       ico:'🏆' },
  { id:'abismo',   nm:'Abismo',     ico:'🕳️' },
  /* As seis fora do catálogo de nome. */
  { id:'placa',    nm:'Placa',      ico:'▬'  },
  { id:'marquise', nm:'Marquise',   ico:'🎰' },
  { id:'campeao',  nm:'Campeão',    ico:'👑' },
  { id:'circuito', nm:'Circuito',   ico:'🔌' },
  { id:'vivo',     nm:'Circuito Vivo', ico:'⚡' },
  { id:'bola',     nm:'Pokébola',   ico:'⚪' },
];

/* Mesma guarda do tema (defeito S70): valor guardado que não existe mais cai no
   padrão em vez de deixar a tela sem pele. Chega aqui perfil de versão antiga,
   `localStorage` adulterado, e cosmético retirado da lista. */
export function cosmeticoValido(tipo, id) {
  const lista = tipo === 'cena' ? BN_CENAS : tipo === 'moldura' ? BN_MOLDURAS : BN_EFEITOS;
  return lista.some(x => x.id === id) ? id : lista[0].id;
}

export const PADRAO_BANNER = {
  cena: BN_CENAS[0].id, efeito: BN_EFEITOS[0].id, moldura: BN_MOLDURAS[0].id };

/* ── QUEM APARECE NO BANNER, E O QUE "NENHUM" SIGNIFICA ────────────────────
 *
 * Pedido do dono: *"adicione opção de NENHUM se caso a pessoa queira escolher um
 * Pokémon no banner, mas depois queira tirar"*. Até aqui a grade era uma porta
 * que só abria num sentido — escolhido um, dava para trocar por outro e nunca
 * para não ter nenhum.
 *
 * `dex 0` é a ausência, e não um id de espécie: nenhuma dex vale zero, então o
 * valor não colide com nada agora nem com pack nenhum depois.
 *
 * ── POR QUE ISTO É UMA FUNÇÃO, E NÃO UMA LINHA NO BANNER ────────────────
 *
 * Porque a linha certa e a errada são quase idênticas:
 *
 *     (perfil.banner && perfil.banner.dex) || PADRAO     ← apaga o NENHUM
 *     perfil.banner?.dex ?? PADRAO                       ← respeita o NENHUM
 *
 * O zero é falsy, então a primeira devolve o padrão para quem escolheu "nenhum"
 * — a opção existiria na grade e não teria efeito nenhum. Solta no meio de uma
 * função de 120 linhas, essa diferença não tem como ser afirmada sem subir
 * navegador; aqui ela é uma tabela-verdade de quatro casos.
 */
export function vitrineDe(perfil, padrao) {
  const d = perfil?.banner?.dex;
  if (d === 0) return 0;                 // NENHUM, e é escolha
  return Number.isFinite(d) && d > 0 ? d : padrao;
}
