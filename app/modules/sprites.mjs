/* Sprites da arena — folhas do PMDCollab, resgate por espelho e retratos.
 *
 * Fronteira: este módulo resolve ENDEREÇO e METADADO de sprite. Ele não desenha
 * e não conhece a rodada. Quem desenha é render.mjs.
 *
 * O resgate busca a MESMA arte em outro endereço, nunca outra arte — lição da
 * v0.6.1, registrada no CLAUDE.md e no LEIA-ME do protótipo.
 */

/* `sprite` chega com apelido: o lutador já tem um campo `f.sprite`, e duas
   coisas com o mesmo nome no mesmo arquivo é convite a erro de leitura. */
import { slugExterno, sprite as enderecoSprite } from './motor.mjs';
import { S } from './estado.mjs';
import { log } from './dom.mjs';

/* =====================================================================
   SPRITES DE OVERWORLD (PMDCollab/SpriteCollab)
   ---------------------------------------------------------------------
   Os GIFs do Showdown são sprites de BATALHA: o bicho fica parado de
   perfil mexendo braço e rabo. Não existe ciclo de passo neles — por
   isso ele deslizava pelo mapa.

   Estas folhas aqui são as de Pokémon Mystery Dungeon, que é um jogo
   top-down igual à nossa arena. Cada folha tem:
     - 8 LINHAS = 8 direções (linha 0 = de frente, 2 = perfil direito,
       4 = de costas, 6 = perfil esquerdo)
     - N COLUNAS = os quadros da animação
   E existem folhas separadas para Andar, Parado, Atacar e Apanhar.

   Ou seja: perna mexendo de verdade, e o bicho vira para o lado que
   está indo.

   A tabela abaixo é o conteúdo do AnimData.xml de cada um, já extraído
   (largura do quadro, altura do quadro, duração de cada quadro em 1/60
   de segundo). Fica embutido para o arquivo continuar funcionando com
   duplo clique, sem depender de nenhuma requisição extra.
   ===================================================================== */
/* =====================================================================
   DE ONDE VÊM AS SPRITES DA ARENA
   ---------------------------------------------------------------------
   Folhas de animação do Pokémon Mystery Dungeon (PMDCollab): vista de
   cima, 8 direções por folha. É a identidade visual do projeto e não
   muda — qualquer "plano B" tem que trazer ESTA arte, de outro
   endereço, nunca outra arte.

   Lição da v0.6.1: eu tinha posto um modo de emergência que, quando as
   folhas não vinham, trocava o corpo pelo retrato de batalha do
   Showdown (vista lateral). Resolvia "invisível" criando um problema
   pior — o jogo inteiro com a arte errada. Um plano B que descaracteriza
   o produto não é plano B. Por isso ele foi removido: se uma folha não
   vier, o resgate é buscar A MESMA FOLHA num espelho; nunca substituir
   por outro estilo.

   BASE = raw do GitHub, exatamente como nas versões que rodaram bem.
   ESPELHO = jsDelivr, servindo o mesmo repositório, usado só por folha
   que falhou e só se ele realmente responder.
   ===================================================================== */
/* Os dados puros de arte moraram aqui até o F0.12. Saíram para
   `sprites-dados.mjs` porque o baixador de assets precisa da lista de arquivos
   sem carregar interface junto. */
import { PMD, IDLE_USES_WALK, ANIM_FILE, PMD_BASE, PMD_ESPELHO } from './sprites-dados.mjs';
import { atributoCascata, candidatos } from './assets.mjs';

// tamanho na tela: 1 pixel de sprite = 1 unidade do mapa, com teto —
// assim o Gyarados continua sendo um bicho enorme e o Pikachu um bichinho
const SPRITE_MAX_H = 76;

function sheetURL(dex, key){
  const k = (key === 'i' && IDLE_USES_WALK.has(dex)) ? 'w' : key;
  return String(dex).padStart(4,'0') + '/' + ANIM_FILE[k] + '-Anim.png';
}

/* Resgate POR FOLHA, sem nunca trocar o estilo da arte.
   `folhaSrc` guarda, para cada caminho, o endereço que funcionou. Por
   padrão é o raw; se ele falhar, tenta o MESMO arquivo no espelho e,
   dando certo, atualiza quem já está em cena. Se os dois falharem, o
   comportamento é o mesmo das versões anteriores — nada de inventar
   outro sprite no lugar. */
const folhaSrc = {};      // caminho -> URL completa que vale
const folhaVista = new Set();
let folhasOk = 0, folhasFalhas = 0;

/* Enquanto a conferência não respondeu, aponta para a cópia local: é a que
   não custa rede. O `onload` acima corrige para quem de fato respondeu. */
function urlFolha(path){ return folhaSrc[path] || candidatos(PMD_BASE + path, null)[0]; }

/* Reaplica o fundo de quem está usando esta folha agora — sem isso, o
   resgate só valeria a partir da próxima animação. */
function refrescarFolha(path){
  for (const e of (S.ents || [])){
    if (!e.anim) continue;
    if (sheetURL(e.f.dex, e.anim) !== path) continue;
    e.body.style.backgroundImage = `url(${urlFolha(path)})`;
  }
}

/* A cascata `local → origem → espelho` (F0.12).
 *
 * Cada candidato é O MESMO ARQUIVO em outro endereço — nunca outra arte. É a
 * lição da v0.6.1, e é o que separa resgate de substituição.
 *
 * A cópia local vem primeiro porque é a única que não depende de rede: com ela,
 * o jogo abre com egresso fechado, e o portão Q5 deixa de precisar do arnês
 * interceptando requisição por requisição. */
function conferirFolha(path){
  if (folhaVista.has(path)) return;
  folhaVista.add(path);
  const lista = candidatos(PMD_BASE + path, PMD_ESPELHO + path);
  let i = 0;
  const img = new Image();
  img.onload = () => {
    folhasOk++;
    if (i > 0){                       // não veio do local: guarda quem respondeu
      folhaSrc[path] = lista[i];
      refrescarFolha(path);
      if (i === 2 && !avisouEspelho){
        avisouEspelho = true;
        log('<span class="l-sys">sprites: fonte principal falhou em alguma folha; usando espelho (mesma arte).</span>');
      }
    } else {
      folhaSrc[path] = lista[0];
      refrescarFolha(path);
    }
  };
  img.onerror = () => {
    if (++i < lista.length) img.src = lista[i];
    else folhasFalhas++;
  };
  img.src = lista[0];
}
let avisouEspelho = false;

/* direção (0..7) a partir de um vetor.
   linha 0 = de frente (para baixo na tela), e o índice cresce girando
   no sentido baixo -> direita -> cima -> esquerda */
function dirOf(dx, dy){
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;
  return ((Math.round((90 - deg) / 45) % 8) + 8) % 8;
}

// Showdown gen5ani continua sendo usado só nos retratos da lista e da
// tela de vitória, onde uma pose de batalha fica melhor que um quadro solto
// Sylveon e Corviknight não existem no pack gen5ani, então o retrato cai
// para o pack animado gen6+ e, em último caso, para o PNG estático.
function imgTag(p, extra){
  const a = `https://play.pokemonshowdown.com/sprites/ani/${p.sp}.gif`;
  const b = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dex}.png`;
  const url = enderecoSprite(p);
  return `<img src="${candidatos(url, null)[0]}"${atributoCascata(url, null)} alt="${p.n}" ${extra||''} `
       + `onerror="this.onerror=function(){this.onerror=null;this.src='${b}'};this.src='${a}'">`;
}

/* Cadeia de espelhos por número da dex. Veio do corpo do app no F0.3c:
   resolver endereço de imagem é responsabilidade deste módulo, e o killfeed
   precisava disso sem poder depender da camada de perfil.
   ATENÇÃO: ver defeito D-002 — chamadores passam nome exibido onde se espera
   slug cru, e nomes com apóstrofo quebram o onerror embutido. */
const DEX_MIRRORS = [
  dex => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`,
  dex => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${dex}.png`,
];

const dexURL = dex => candidatos(DEX_MIRRORS[0](dex), null)[0];

function dexImg(dex, slug, extra){
  /* A cópia local entra na frente da cadeia que já existia. Os endereços
     seguintes continuam sendo O MESMO desenho em outro lugar. */
  const urls = [candidatos(DEX_MIRRORS[0](dex), null)[0], ...DEX_MIRRORS.map(f => f(dex)),
    `https://play.pokemonshowdown.com/sprites/gen5/${slugExterno(slug)}.png`];
  const cadeia = urls.slice(1).reduceRight(
    (acc, u) => `this.onerror=function(){${acc}};this.src='${u}';`,
    `this.onerror=null;this.style.opacity=.25;`);
  return `<img src="${urls[0]}" alt="" ${extra||''} onerror="${cadeia.replace(/"/g,'&quot;')}">`;
}

export {
  PMD,
  SPRITE_MAX_H,
  conferirFolha,
  dexImg,
  dexURL,
  dirOf,
  folhasFalhas,
  folhasOk,
  imgTag,
  sheetURL,
  urlFolha,
};
