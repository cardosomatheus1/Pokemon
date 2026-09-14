/* Perfil do treinador — identidade, XP, nível e títulos.
 *
 * Fronteira: guarda quem o jogador é e o quanto ele progrediu. Não sabe
 * apostar. XP vem de participação, nunca do valor apostado. */

import { S } from './estado.mjs';
import { dexURL } from './sprites.mjs';
import { urlTreinadorOrigem } from './avatares-dados.mjs';
import { arquivoAvatar, avatarArteValido } from './acervo-dados.mjs';
import { AVATARES, arquivoArte, arteValida } from './artes-dados.mjs';
import { atributoCascata, candidatos } from './assets.mjs';
import { nivelDe, progressoNivel, xpParaNivel } from './progressao.mjs';
import { ensureDaily } from './desafios.mjs';

/* =====================================================================
   PERFIL DO JOGADOR
   ---------------------------------------------------------------------
   Sem servidor, "perfil" aqui é o que dá pra fazer no cliente: tudo em
   localStorage. Não é autenticação — é o suficiente pra prototipar a
   experiência de "sua conta" antes de existir backend.

   O schema cresceu (avatar, banner, contagem por Pokémon e por tipo),
   então loadProfile() faz MIGRAÇÃO: quem já jogava não perde o histórico
   quando os campos novos aparecem — os que faltam entram com valor
   padrão em vez de zerar o perfil inteiro.
   ===================================================================== */
/* ── O DADO SAIU DAQUI NO BLOCO 0.1 ────────────────────────────────────────
 *
 * `PROFILE_DEFAULT`, `loadProfile` e `saveProfile` moram agora em
 * `perfil-dados.mjs`, junto com o modo servidor. O motivo é testabilidade e ele
 * é o mesmo de sempre neste projeto: este arquivo importa `sprites.mjs` e
 * `desafios.mjs`, os dois tocam o DOM na carga, e o critério de saída do F1.10
 * é justamente um teste que limpa o armazenamento e confere o que sobrou.
 *
 * As três continuam sendo exportadas DAQUI, com os mesmos nomes: os onze
 * módulos que importam deste arquivo não precisaram saber que algo mudou.
 *
 * O QUE FICOU: o que resolve endereço de arte de avatar, o que grava estatística
 * de aposta, e a tabela de títulos. Tudo que precisa de tela ou de tema. */
export {
  PROFILE_DEFAULT, loadProfile, saveProfile,
  modoServidor, hidratarPerfil, xpDoPerfil, nivelDoPerfil, progressoDoPerfil,
  sequenciaDeLogin, desafiosDoServidor, perfilHidratado, reiniciarProjecaoDoPerfil,
} from './perfil-dados.mjs';
import { PROFILE_DEFAULT, loadProfile, saveProfile, modoServidor } from './perfil-dados.mjs';


function recordBetPlaced(amount, fighter){
  S.profile.betsCount++; S.profile.totalBet += amount;
  if (fighter){
    S.profile.mons[fighter.n] = (S.profile.mons[fighter.n] || 0) + 1;
    for (const t of fighter.types) S.profile.types[t] = (S.profile.types[t] || 0) + 1;
    // lista de Pokémon distintos apostados HOJE (desafio de variedade)
    const d = ensureDaily();
    if (!d.mons) d.mons = [];
    if (!d.mons.includes(fighter.n)) d.mons.push(fighter.n);
  }
  saveProfile(S.profile);
}
function recordBetResult(won, amount, payout, fighter){
  if (won){
    S.profile.winsCount++; S.profile.totalWon += payout;
    if (payout > S.profile.biggestWin) S.profile.biggestWin = payout;
    if (fighter) S.profile.winMons[fighter.n] = (S.profile.winMons[fighter.n] || 0) + 1;
  } else {
    S.profile.totalLost += amount;
  }
  saveProfile(S.profile);
}

/* topo de um dicionário {chave: contagem} */
function topOf(obj){
  let k = null, v = 0;
  for (const key in obj) if (obj[key] > v){ v = obj[key]; k = key; }
  return k ? {k, v} : null;
}

/* =====================================================================
   NÍVEL DO TREINADOR
   ---------------------------------------------------------------------
   A ideia central: o jogador precisa sentir progresso MESMO PERDENDO.
   Se só vitória desse XP, quem está numa maré ruim vê a barra parada
   justo na hora em que mais precisaria de um motivo pra continuar — e
   aí o sistema empurra pra perseguir perda, que é exatamente o que não
   se quer numa casa de apostas.

   Por isso o XP vem de PARTICIPAR, com bônus por desempenho:

     • 10 XP   — por rodada disputada (piso: sempre entra)
     • +25 XP  — se o seu lutador venceu
     • +0..15  — pelo desempenho dele: quanto foi longe na rodada
                 (sobreviveu a quantos dos 11 adversários)
     • +5 XP   — se o seu lutador era azarão (odd ≥ 4) e sobreviveu
                 além da metade do elenco

   Note que o XP NÃO cresce com o valor apostado. Isso é de propósito:
   atrelar progresso ao tamanho da aposta transforma o nível num
   incentivo a apostar alto, que é o oposto de um sistema saudável.
   Quem aposta 10 e quem aposta 10.000 sobe igual.

   A curva é quadrática suave: nível N exige 100·N^1,5 de XP no total.
   Dá níveis rápidos no começo (recompensa imediata) e desacelera
   depois, sem virar parede.
   ===================================================================== */
/* A curva de nível saiu para `progressao.mjs` — pura, e testável sem DOM.
   Ver a nota lá, e o defeito D-006. */

/* Título do treinador por faixa de nível — recompensa simbólica que já
   existe de graça e dá identidade ao progresso. */
const TITULOS = [
  [1,'Novato'], [5,'Aprendiz'], [10,'Treinador'], [18,'Veterano'],
  [28,'Ás da Arena'], [40,'Elite'], [55,'Campeão'], [75,'Lenda'],
];
function tituloDe(n){
  let t = TITULOS[0][1];
  for (const [min, nome] of TITULOS) if (n >= min) t = nome;
  return t;
}

/* Concede XP e devolve o detalhamento, pra tela de fim de rodada poder
   mostrar de onde veio cada pedaço. */
/* ── COM SESSÃO, QUEM CONCEDE É A LIQUIDAÇÃO (bloco 0.1) ───────────────────
 *
 * Sem sessão nada mudou: o app é offline-first, joga sozinho, e o XP é dele.
 *
 * COM sessão, o servidor já concedeu — `liquidarRodada` chama `darXP` com as
 * MESMAS parcelas, derivadas da mesma `xpDaRodada` do `engine/progressao.mjs`.
 * Somar aqui também pagaria o dobro até o próximo `hidratarPerfil()`, e o
 * jogador veria o nível subir e voltar sozinho.
 *
 * A TELA CONTINUA MOSTRANDO A MESMA COISA, e é por isso que o `depois` é
 * calculado em vez de simplesmente omitido: as parcelas são as mesmas dos dois
 * lados, então `antes + total` é exatamente o que o servidor guardou. O overlay
 * de fim de rodada não precisa esperar uma ida à rede para animar a barra.
 *
 * A projeção real chega no `hidratarPerfil()` seguinte, e se algum dia os dois
 * números divergirem a barra corrige sozinha — o servidor é a fonte. */
function darXP(partes){
  const antes = progressoNivel(S.profile.xp);
  const total = partes.reduce((a,p) => a + p.xp, 0);
  const depois = progressoNivel(S.profile.xp + total);
  if (!modoServidor()){
    S.profile.xp += total;
    saveProfile(S.profile);
  }
  return {partes, total, antes, depois, subiu: depois.nivel > antes.nivel};
}

/* O ENDEREÇO DO AVATAR MORA AQUI, e não na customização, desde o V1.15.
 *
 * Ele é lido por dois lugares: a tela de customização (que o escolhe) e o
 * banner de batalha (que o mostra na arena). Deixá-lo na customização obrigaria
 * o banner a importar a tela que o configura — e a tela precisa redesenhar o
 * banner ao salvar, o que fecharia um ciclo. O dono do dado é o perfil. */
/* A cópia local na frente, origem como resgate — a cascata do F0.12. Sem isto
   o avatar sai para a rede mesmo com o arquivo em disco. */
const trainerURL = id => candidatos(urlTreinadorOrigem(id), null)[0];

/* R30 · O TERCEIRO TIPO DE AVATAR: arte NOSSA, de arquivo.
 *
 * `trainer` e `mon` resolvem para sprite de terceiro, com cascata de endereços.
 * `arte` não tem cascata para percorrer — o arquivo está no repositório ou não
 * está, e se não estiver o portão de assets reprova antes de chegar em tela.
 *
 * A base é `../` como no resto: os módulos são carregados de `app/modules/`,
 * mas o `src` de um `<img>` resolve contra o DOCUMENTO, que é `app/index.html`.
 * É a mesma razão de `candidatos()` usar `../`. */
const arteURL = id => `../${arquivoAvatar(avatarArteValido(id))}`;

/* Quem desenha precisa saber, porque a arte do acervo é PINTADA e os sprites
   são de pixel: `image-rendering:pixelated` num retrato de 256 px reduzido a
   66 serrilha a imagem inteira. Ver a regra `.avArte` no index.html. */
/* As duas coleções são PINTADAS, e as duas precisam da suavização — quem
   desenha só quer saber "é pintado ou é pixel?". */
const avatarEhArte = () => ['arte', 'galeria'].includes(
  (S.profile.avatar || PROFILE_DEFAULT.avatar).kind);

/* O acervo do R30 e a galeria do R43 são DUAS coleções, e o `kind` é o que as
 * separa. Poderiam ser uma; não são, por duas razões concretas:
 *
 *   · elas moram em pastas diferentes, e a divisão é do `CLAUDE.md` — `arte/`
 *     guarda a arte NOSSA, `assets/` a de terceiros. Juntá-las apagaria uma
 *     distinção que governa a tag de saída;
 *   · o acervo é sempre PNG e monta o caminho pelo id; a galeria MISTURA JPG e
 *     GIF animado, então ela guarda o nome do arquivo no catálogo. Adivinhar
 *     extensão é o tipo de esperteza que falha em silêncio.
 *
 * O `arquivoArte` já devolve o caminho a partir da raiz do repositório, e o
 * `src` de um `<img>` resolve contra `app/index.html` — daí o `../`, pela mesma
 * razão que o `arteURL` logo acima. */
const galeriaURL = id => `../${arquivoArte(arteValida(AVATARES, id))}`;

/* O ENQUADRAMENTO DO AVATAR, para quem desenha aplicar.
 *
 * As artes da galeria têm proporções que vão de 0,71 a 1,92, e o quadrado de
 * 66 px corta muito. Cada uma foi enquadrada olhando o corte NO TAMANHO REAL,
 * e o número mora no catálogo — mas quem sabe desenhar é a tela, não o
 * catálogo. Esta função é a ponte, e ela devolve string de estilo pronta para
 * caber num atributo.
 *
 * Devolve VAZIO para as outras coleções, de propósito: sprite de treinador e
 * retrato do acervo já vêm enquadrados no arquivo, e forçar `cover` neles
 * cortaria o que já estava certo. */
function avatarEnquadramento(){
  const a = S.profile.avatar || PROFILE_DEFAULT.avatar;
  if (a.kind !== 'galeria') return '';
  const arte = arteValida(AVATARES, a.id);
  return `object-fit:cover;object-position:50% ${(arte.y * 100).toFixed(0)}%`;
}

function avatarURL(){
  const a = S.profile.avatar || PROFILE_DEFAULT.avatar;
  if (a.kind === 'galeria') return galeriaURL(a.id);
  if (a.kind === 'arte') return arteURL(a.id);
  return a.kind === 'mon' ? dexURL(a.id) : trainerURL(a.id);
}

/* Atributo `onerror` que percorre o resto da cascata, para os `<img>` escritos
   como texto. */
const cascataTreinador = id => atributoCascata(urlTreinadorOrigem(id), null);

export {
  avatarURL,
  avatarEhArte,
  avatarEnquadramento,
  arteURL,
  cascataTreinador,
  trainerURL,
  nivelDe,
  progressoNivel,
  xpParaNivel,
  darXP,
  recordBetPlaced,
  recordBetResult,
  tituloDe,
  topOf,
};
