/* ACERVO DE ARTE — o que o jogador pode escolher, e onde cada arte se enquadra.
 *
 * Catálogo puro: nenhum DOM, nenhum `fetch`. Dois lados o leem — a customização
 * (que escolhe) e o perfil (que resolve o avatar atual). Mesma separação do
 * `avatares-dados.mjs`, pela mesma razão.
 *
 * ── O QUE NÃO ESTÁ AQUI, E POR QUÊ ────────────────────────────────────────
 *
 * De que arquivo cada peça veio e como ela foi recortada mora em
 * `tools/acervo-fontes.mjs`. Duas razões, e a segunda foi um portão reprovando:
 *
 *   1. o app não precisa saber. Ele precisa do id, do nome exibível e do
 *      enquadramento; a procedência é assunto de quem DERIVA;
 *   2. os nomes dos arquivos entregues carregam identificadores da franquia, e
 *      `test/pack-original.mjs` varre `app/modules/` atrás deles. O §0.3 é
 *      "Engine != tema" — enquanto esses nomes só existirem no pack e nas
 *      ferramentas, trocar de tema é trabalho de arte e dados, não de
 *      engenharia.
 *
 * A separação que o Q2 forçou é a que devia estar aqui desde o começo.
 *
 * ── POR QUE CADA CENA TEM DUAS POSIÇÕES, E NÃO DOIS ARQUIVOS ───────────────
 *
 * O jogo veste a MESMA cena em três enquadramentos (R10), e até aqui os três
 * dividiam uma posição só:
 *
 *     .cn-cidade{background:url('../arte/cidade-neon.jpg') center 38%/cover}
 *
 * Aquele `38%` foi escolhido olhando o banner alto. As três caixas, medidas no
 * `index.html`:
 *
 *     .bnCena              ~1,27   banner da rodada, 352 px de altura
 *     #profBanner .scene   ~3,40   tira do perfil, 112 px
 *     .fa-cena            ~31      faixa do topo, onde mora a carteira
 *
 * Com `cover`, caixa MAIS ALTA que a fonte sobra largura — quem escolhe o que
 * aparece é o X. Caixa MAIS LARGA sobra altura — quem escolhe é o Y. Uma
 * posição não responde às duas perguntas porque são perguntas sobre eixos
 * diferentes, e o resultado era a faixa do topo pegando o tronco do personagem
 * em vez do rosto.
 *
 * `foco` é a posição da caixa alta, `faixa` a das duas largas — [x, y] em
 * porcento, do jeito que o `background-position` lê. Dois arquivos por cena
 * resolveria também, e resolve pior: vinte cenas viram quarenta, e trocar uma
 * arte depois obriga a recortar duas vezes e a lembrar das duas.
 *
 * ── COMO SE ESCOLHE UM VALOR DE `faixa` ───────────────────────────────────
 *
 * Na faixa do topo o `cover` mostra 1,78/31 = 5,7% da altura da imagem. Numa
 * fita dessas, errar o Y em 10% é errar o personagem inteiro — então o valor
 * não se chuta: `node tools/folha-acervo.mjs regua` desenha cada arte com
 * marcas de 10% e a fatia por cima. O Y é, na prática, a altura do rosto.
 *
 * OS VALORES ESTÃO DUPLICADOS NO CSS, que é quem de fato desenha. Não há passo
 * de build neste projeto para gerar um do outro; quem impede a divergência é o
 * teste `os valores do CSS batem com os do catálogo`, em `test/acervo.mjs`.
 * Ele não é decorativo — os dois já divergiram uma vez durante a construção.
 */

export const CENAS_ARTE = [
  /* Fonte 1,50 -> derivada 16:9 cortando altura. O personagem corre da esquerda
     para a direita com o fogo atrás; no banner alto o X puxa para ele, na tira
     o Y para na juba, senão a faixa vira só parede de coliseu. */
  { id:'coliseu',   nm:'Coliseu em Chamas',    foco:[45,50], faixa:[50,55] },
  /* Personagem centrado e simétrico: o X fica no meio. A cabeça e o sopro estão
     na metade de cima, então a tira sobe bastante. */
  { id:'chamas',    nm:'Sopro de Fogo',        foco:[50,48], faixa:[50,26] },
  /* Vulto embaixo ao centro, lustre no topo. A tira pega os olhos. */
  { id:'mansao',    nm:'Mansão Assombrada',    foco:[50,50], faixa:[50,53] },
  /* Neste o vulto está no canto ESQUERDO — o X sai do meio para não perdê-lo
     quando a caixa alta cortar as laterais. */
  { id:'cripta',    nm:'Salão do Ritual',      foco:[42,52], faixa:[50,56] },
  /* Silhueta na metade DIREITA, anéis à esquerda; a cabeça fica bem no alto. */
  { id:'holograma', nm:'Holograma',            foco:[75,40], faixa:[55,20] },
  /* Já nasce 1,79. O grupo sentado está embaixo; a tira desce até as cabeças,
     porque uma faixa só de céu não diz que ali há uma cena. */
  { id:'estrelas',  nm:'Céu Estrelado',        foco:[50,50], faixa:[50,58] },
  { id:'alvorada',  nm:'Corrida ao Amanhecer', foco:[45,50], faixa:[48,64] },
  /* Três painéis simétricos: sair do centro no X quebraria a simetria e
     mostraria dois e meio dos três. */
  { id:'elementos', nm:'Três Elementos',       foco:[50,50], faixa:[50,45] },
  /* Fonte VERTICAL (0,59): a derivação já joga fora a maior parte da altura, e
     não há um rosto único — a tira pode ficar no meio. */
  { id:'vilarejo',  nm:'Vilarejo',             foco:[50,50], faixa:[50,52] },
  { id:'bosque',    nm:'Bosque de Luz',        foco:[48,50], faixa:[50,32] },
];

/* Os avatares já chegam recortados e quadrados: o enquadramento deles foi
   assado no arquivo pela esteira, e não há o que posicionar em tempo de tela.
   Por isso aqui só o id e o nome. */
export const AVATARES_ARTE = [
  { id:'mewbebe',      nm:'Mew Bebê' },
  { id:'blastoise',    nm:'Blastoise Cyber' },
  { id:'gengarninja',  nm:'Gengar Ninja' },
  { id:'gengarsombra', nm:'Gengar Sombra' },
  { id:'snorlaxrei',   nm:'Rei Snorlax' },
  { id:'lapras',       nm:'Travessia' },
  { id:'mewtwolago',   nm:'Encontro' },
  { id:'mewtwoorbe',   nm:'Orbe' },
  { id:'mewtwocoro',   nm:'Legião' },
  { id:'soneca',       nm:'Soneca' },
];

/* Onde a derivada mora, e em que tamanho. O avatar aparece em 66 px no perfil;
   256 dá folga para a prévia da customização e para tela de densidade dupla,
   sem virar arquivo pesado. A cena é 16:9 porque é a proporção que atende as
   três caixas com o menor corte — ver o cabeçalho. */
export const DIR_ACERVO = 'arte/acervo';
export const TAM_AVATAR = 256;
export const TAM_BANNER = [1280, 720];

export const arquivoAvatar = id => `${DIR_ACERVO}/av-${id}.png`;
export const arquivoCena   = id => `${DIR_ACERVO}/cn-${id}.jpg`;

/* Mesma guarda do S70, e pela mesma razão: id gravado que não existe mais cai
   no padrão em vez de deixar a tela sem avatar. Chega aqui perfil de versão
   antiga e `localStorage` adulterado. */
export function avatarArteValido(id) {
  return AVATARES_ARTE.some(a => a.id === id) ? id : AVATARES_ARTE[0].id;
}
