/* O QUE É COSMÉTICO, E O QUE DELE SE VENDE — bloco 1.31 (camada 3).
 *
 * Pedido do dono, e ele fechou o escopo na frase:
 *
 *   > "FILTRE tudo que temos hoje de cosmético e você vai adicionar a essa loja"
 *
 * ── POR QUE A REGRA MORA AQUI, E NÃO NUM CAMPO EM CADA ARQUIVO ───────────
 *
 * A primeira forma que me ocorreu foi acrescentar `procedencia` a cada peça,
 * nos cinco arquivos de dados. Ela está errada, e o motivo é o mesmo que este
 * projeto já pagou cinco vezes:
 *
 *   > Um inventário é o que EXISTE. O que se vende é uma DECISÃO de produto, e
 *   > ela muda sem que nenhuma peça mude. Guardar a decisão dentro do
 *   > inventário obriga a mexer em 115 linhas para mudar de ideia uma vez.
 *
 * Os arquivos de dados continuam sendo listas puras. Aqui mora a regra, e ela
 * cabe numa frase.
 *
 * ── A REGRA, e ela é a tese de monetização do projeto ────────────────────
 *
 *     VENDE-SE O QUE É NOSSO. O HERDADO FICA DE GRAÇA.
 *
 * Não é arbitrária: é a decisão do dono sobre onde está o produto autoral.
 * O elenco é emprestado e sempre foi; o que este projeto CRIA são os
 * cosméticos — e é exatamente ali que a loja pode cobrar sem vender vantagem.
 *
 *   > Cosmético não é poder. Vender arte nossa não muda uma linha do §P5, e é
 *   > a única porta de receita que não precisa mexer no equilíbrio de nada.
 *
 * E cada família guarda pelo menos uma peça `padrao`: quem chega tem de poder
 * montar uma identidade antes de gastar. Uma vitrine que começa com o jogador
 * pelado não é vitrine — é pedágio.
 */
import { PROCEDENCIAS, catalogoDaVitrine, aVendaNaVitrine } from '../../engine/vitrine.mjs';
import { BN_CENAS, BN_EFEITOS, BN_MOLDURAS } from './banner-dados.mjs';
import { TRAINER_AVATARS } from './avatares-dados.mjs';
import { AVATARES as AVATARES_NOSSOS, BANNERS as BANNERS_NOSSOS } from './artes-dados.mjs';
import { ARENAS } from './arenas-dados.mjs';
import { arquivoArte } from './artes-dados.mjs';
import { CENAS_ARTE, arquivoCena } from './acervo-dados.mjs';
import { urlTreinadorOrigem } from './avatares-dados.mjs';
import { ACERVO } from './outfit-acervo.mjs';

/* ── AS PEÇAS AUTORAIS DE BANNER ─────────────────────────────────────────
 *
 * As oito primeiras molduras e os oito primeiros efeitos vieram junto com o
 * banner e são as cores dos tipos — herdadas do tema. As quatro seguintes
 * (`aurora`, `pulso`, `ouro`, `abismo`) entraram no R38 como arte deliberada,
 * e a nota do CSS diz isso na cara: elas animam propriedades DIFERENTES, e não
 * são outra cor do mesmo pulso de caixa.
 *
 * A lista é explícita e não um `slice(8)`: um índice mágico quebra em silêncio
 * no dia em que alguém inserir uma moldura no meio. */
const AUTORAIS_DE_BANNER = ['aurora', 'pulso', 'ouro', 'abismo'];

/* A arena que fica de graça. Uma, e é a primeira: sem nenhuma, a batalha do
   primeiro dia não teria onde acontecer. */
const ARENA_PADRAO = ARENAS[0]?.key ?? null;

const marcar = (pecas, ehNossa) => (pecas ?? []).map(p => ({
  ...p, procedencia: ehNossa(p) ? 'loja' : 'padrao',
}));

/* ── E CADA PEÇA LEVA A PRÓPRIA CARA ─────────────────────────────────────
 *
 * Uma loja de cosmético que mostra NOMES é o mínimo que funciona, e é
 * exatamente o que a regra do dono proíbe:
 *
 *   > "nada visual entrega o mínimo que funciona"
 *
 * E aqui não é preferência: **ninguém compra aparência sem ver a aparência.**
 * "Mar de Gelo" por 750 é um preço sem produto — o jogador não tem como saber
 * se quer, e a decisão que a loja existe para oferecer não acontece.
 *
 * A `arte` é um DESCRITOR e não marcação: este módulo é camada 0. Ele diz o
 * que a peça é; a tela decide como isso vira pixel.
 *
 *     { tipo:'img',  src }     um arquivo — retratos, avatares, banners
 *     { tipo:'cena', classe }  a classe de fundo que o CSS já tem
 *     { tipo:'ico',  ico }     o glifo — molduras e efeitos, que são ANIMAÇÃO
 *                              e não imagem: nenhum arquivo os representa, e
 *                              um quadrado morto mentiria mais que o glifo
 */
const arteImg = src => ({ tipo: 'img', src });
const arteIco = ico => ({ tipo: 'ico', ico });

/* ── A CENA DO BANNER: ARQUIVO QUANDO EXISTE, GLIFO QUANDO NÃO ───────────
 *
 * A primeira versão reusava a classe `cn-*` do CSS, e o passo OLHAR reprovou
 * na hora — duas coisas de uma vez:
 *
 *     as dez CENAS BASE não têm arquivo: elas são gradiente e `::after`
 *     e o `::after` NÃO CABE em 38 px — ele é desenhado para um banner
 *     inteiro, e vazou pela loja toda como duas manchas gigantes
 *
 *   > Reusar uma classe é reusar TUDO o que ela traz, inclusive os
 *   > pseudo-elementos que ninguém lembrava que ela tinha. Numa caixa 20 vezes
 *   > menor, "tudo" é o problema.
 *
 * Então: arquivo para quem tem arquivo, e glifo para quem é procedural. O
 * glifo diz "é uma cena" sem fingir mostrar qual — e fingir seria pior. */
const CENAS_COM_ARQUIVO = new Map([
  ...CENAS_ARTE.map(c => [c.id, '../' + arquivoCena(c.id)]),
]);
const arteCena = (id, doArtes) =>
  doArtes ? arteImg('../' + doArtes)
  : CENAS_COM_ARQUIVO.has(id) ? arteImg(CENAS_COM_ARQUIVO.get(id))
  : arteIco('🖼️');

/* ── AS FAMÍLIAS, DO JEITO QUE A VITRINE AS LÊ ───────────────────────────
 *
 * `familias()` é função e não constante: os catálogos de arte são montados na
 * carga, e uma constante fixaria o estado do primeiro import. É a mesma razão
 * de `esp()` ser função em toda esta base.
 */
export function familias() {
  const idsNossosDeBanner = new Set(BANNERS_NOSSOS.map(b => b.id));
  return {
    /* O TRAJE JÁ SABIA. O acervo declara a procedência desde que ele existe, e
       é dele que a regra foi copiada para as outras quatro — ver a L-148. */
    outfit:  (ACERVO ?? []).map(o => ({ id: o.id, nm: o.nome ?? o.nm ?? o.id,
                                        procedencia: o.procedencia,
                                        arte: arteImg(o.retrato) })),
    /* ── OS AVATARES SÃO DUAS LISTAS, E SÓ AQUI ELAS SE ENCONTRAM ─────
       `TRAINER_AVATARS` são os 16 herdados; `AVATARES` de `artes-dados` são os
       7 de arte nossa, e eles moram noutro arquivo porque têm enquadramento
       próprio. A tela de perfil já as junta; a vitrine junta do mesmo jeito.

       CONCATENAR e não copiar — é a mesma decisão que `BN_CENAS` tomou com os
       banners nossos, e pelo mesmo motivo: lista copiada é lista que diverge
       no dia em que alguém mexe só numa. */
    avatar:  [...marcar(TRAINER_AVATARS.map(a => ({ ...a, arte: arteImg(urlTreinadorOrigem(a.id)) })),
                        () => false),
              ...marcar(AVATARES_NOSSOS.map(a => ({ id: a.id, nm: a.nm,
                                                    arte: arteImg('../' + arquivoArte(a)) })),
                        () => true)],
    cena:    marcar(BN_CENAS.map(c => {
                      const nosso = BANNERS_NOSSOS.find(b => b.id === c.id);
                      return { ...c, arte: arteCena(c.id, nosso && arquivoArte(nosso)) };
                    }),
                    c => idsNossosDeBanner.has(c.id)),
    moldura: marcar(BN_MOLDURAS.map(m => ({ ...m, arte: arteIco(m.ico) })),
                    m => AUTORAIS_DE_BANNER.includes(m.id)),
    efeito:  marcar(BN_EFEITOS.map(e => ({ ...e, arte: arteIco(e.ico) })),
                    e => AUTORAIS_DE_BANNER.includes(e.id)),
    arena:   marcar(ARENAS.map(a => ({ id: a.key, nm: a.nome, arte: arteIco(a.emoji) })),
                    a => a.id !== ARENA_PADRAO),
  };
}

export const catalogo = () => catalogoDaVitrine(familias());
export const aVenda = () => aVendaNaVitrine(catalogo());

/* Os rótulos das abas. Eles moram aqui, e não na tela, porque a ORDEM é uma
   decisão de produto: o jogador entra pela peça que mais muda a identidade
   dele, e não pela que é mais barata. */
export const ABAS = [
  { familia: 'outfit',  rotulo: 'Trajes',   sub: 'o boneco que anda com você' },
  { familia: 'cena',    rotulo: 'Banners',  sub: 'o fundo do seu cartão' },
  { familia: 'moldura', rotulo: 'Molduras', sub: 'a borda dele' },
  { familia: 'efeito',  rotulo: 'Efeitos',  sub: 'o que ele faz na tela' },
  { familia: 'avatar',  rotulo: 'Avatares', sub: 'o seu retrato' },
  { familia: 'arena',   rotulo: 'Arenas',   sub: 'onde a batalha acontece' },
];

export { PROCEDENCIAS };

/* ── O QUE JÁ É DELE, E ONDE ISSO MORA ───────────────────────────────────
 *
 * Uma lista de chaves `familia:id`, num depósito só. A alternativa — um
 * acervo por família — seria cinco listas paralelas, e cinco listas paralelas
 * é cinco lugares para uma delas ficar para trás.
 *
 * ── O TRAJE É A EXCEÇÃO, E ELA É DECLARADA ──────────────────────────────
 *
 * O acervo de trajes já tem posse própria desde que ele existe (`pa.outfit.v1`),
 * e ela guarda também QUAL está vestido — coisa que as outras famílias não
 * têm. Duplicar a posse do traje aqui criaria duas verdades sobre a mesma
 * coisa, que é o padrão que este projeto mais paga.
 *
 * Então a posse do traje continua sendo do acervo, e esta lista cobre as
 * outras cinco famílias. Hoje isso não custa nada — **nenhum dos 9 trajes está
 * à venda**, todos nascem `padrao`. Quando o primeiro for, as duas listas
 * precisam virar uma: está registrado na L-157.
 */
const CHAVE_POSSE = 'pa.cosmeticos.v1';

/* O que a conta já tem sem comprar nada: o PADRÃO. Uma vitrine que começa com
   o jogador pelado não é vitrine — é pedágio.
   Só `padrao` (E4): a versão anterior dava tudo que não era loja nem NPC, e
   `fragmento` e `missao` — que se GANHAM — sairiam de graça no dia em que o
   primeiro existisse. O servidor usa a mesma regra (`server/cosmeticos.mjs`). */
export const posseInicial = (cat = catalogo()) =>
  cat.filter(p => p.procedencia === 'padrao').map(p => `${p.familia}:${p.id}`);

export function carregarPosse(deposito = globalThis.localStorage) {
  const base = posseInicial();
  try {
    const cru = deposito?.getItem(CHAVE_POSSE);
    if (!cru) return base;
    const v = JSON.parse(cru);
    const compradas = Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    /* A BASE ENTRA SEMPRE, e não só na primeira vez: uma peça `padrao` nova
       tem de aparecer para quem já jogava. Guardar só o que foi comprado é o
       que faz o acervo antigo continuar valendo quando o catálogo cresce. */
    return [...new Set([...base, ...compradas])];
  } catch { return base; }
}

export function gravarPosse(posse, deposito = globalThis.localStorage) {
  /* SÓ O QUE FOI COMPRADO vai para o disco. Gravar a base junto fixaria o
     catálogo do dia da gravação — e a peça de graça de amanhã nunca chegaria a
     quem já tem save. */
  const base = new Set(posseInicial());
  const compradas = (posse ?? []).filter(k => !base.has(k));
  try { deposito?.setItem(CHAVE_POSSE, JSON.stringify(compradas)); }
  catch { /* modo privado */ }
  return posse;
}
