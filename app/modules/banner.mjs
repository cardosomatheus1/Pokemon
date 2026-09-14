/* BANNER DE BATALHA — a vitrine do jogador durante a rodada.
 *
 * Fronteira: só desenha. Não decide nada da rodada, não move dinheiro, não sabe
 * o que é odd. Lê perfil e estado, e devolve HTML.
 *
 * NADA QUE O BAIXADOR NÃO COBRE, e isso é requisito, não economia. O F0.12
 * fechou o egresso: o jogo abre com a rede desligada porque tudo o que ele pede
 * está na cópia local. Arte pedida e não baixada é o jogador offline vendo um
 * retângulo vazio.
 *
 * O texto anterior aqui dizia que os GIFs animados do Showdown eram "uma
 * família nova de arte" e por isso proibidos. Estava desatualizado: o
 * `gen5ani` é a PRIMEIRA linha do `alvos()` do baixador e está em disco desde
 * sempre — o próprio `sprites.mjs` diz que ele serve "os retratos da lista e da
 * tela de vitória". O que o R13 acrescentou ao baixador foi a variante SHINY
 * dele, que faltava, e que o `shiny-dados.mjs` já chamava de "o retrato
 * animado".
 *
 * A regra que aquele texto protegia continua inteira, e é esta: **o que a tela
 * pede, o baixador busca.** Não é "nada de animado" — é "nada de não-baixado".
 *
 * O LUTADOR DA RODADA sai de `retratoAnimado`; a VITRINE de quem não apostou
 * sai de `dexImg`, estática. Os dois percorrem a cascata
 * `local → origem → espelho`.
 */
import { rodapeAposta, rodapeIdle } from './banner-texto.mjs';
import { S } from './estado.mjs';
import { PADRAO_BANNER, cosmeticoValido, vitrineDe } from './banner-dados.mjs';
import { PROFILE_DEFAULT, avatarURL, avatarEhArte, avatarEnquadramento, tituloDe, trainerURL } from './perfil.mjs';
import { progressoNivel } from './progressao.mjs';
import { colocacaoDe, ordemDeQuedas, rankingColocacao } from './colocacao.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { gifShinyAtivo } from './shiny-dados.mjs';
import { especies } from './motor.mjs';

/* ── O QUE O IDLE PUBLICA PARA O BANNER (1.6c) ────────────────────────────
 *
 * O banner DESENHA; ele não sabe o que é expedição, nem bioma, nem relógio de
 * farm. A aba do idle é que sabe, e por isso ela AVISA — é a mesma fronteira que
 * já governa quem acompanha o treinador na cena (`acompanhar`), e pela mesma
 * razão: um desenhador que descobre estado sozinho vira um segundo dono da
 * regra.
 *
 * Guardado num módulo só, e não em `S`: isto é situação de tela, não estado de
 * jogo. Se fosse para `S`, viraria coisa a persistir, a migrar e a testar por
 * invariante — para uma frase que se recalcula em cada quadro.
 */
let situacao = {};
function situacaoIdle(s) { situacao = s || {}; }

/* O nome da espécie para o retrato. `retratoAnimado` quer a espécie inteira, e
   não só a dex, porque o endereço do sprite sai do nome. */
const especiePorDex = dex => (especies || []).find(e => e.dex === dex) || null;


/* A colocação do SEU lutador, só para o rodapé. Sai da mesma travessia de
   eventos que alimenta o quadro de colocação — nunca de uma contagem própria. */
function minhaPosBanner(){
  if (!S.myBet || !S.battle) return '—';
  if (S.myBet.idx === S.champ) return 1;
  const pos = colocacaoDe(S.myBet.idx, ordemDeQuedas(S.battle.events), S.fighters.length);
  return pos === null ? 1 : pos;
}

/* A colocação DURANTE a luta, e a diferença para a de cima não é detalhe: a
   `minhaPosBanner` percorre `S.battle.events` INTEIRO, que é a batalha já
   resolvida em memória. Ela só pode ser usada no fim, onde tudo já foi jogado.
   Usá-la ao vivo mostraria no rodapé a colocação FINAL enquanto a luta ainda
   corre — o banner entregaria o resultado que o jogador está assistindo para
   descobrir. Aqui só entram os eventos até o `S.evPtr`, que é o que o jogador
   já viu. É a mesma travessia que alimentava o cartão `SEU LUTADOR`. */
function minhaPosAgora(){
  if (!S.myBet || !S.battle) return undefined;
  const jogados = S.battle.events.slice(0, S.evPtr);
  /* O MESMO QUADRO QUE O PAINEL DE COLOCAÇÃO DESENHA, e não uma contagem
     própria. O cartão `SEU LUTADOR` fazia a própria: para quem ainda estava de
     pé ele caía em "quantos continuam vivos", e mostrava `10º de 12` ao lado de
     um painel que dizia `6º` para o mesmo lutador. Dois números com o mesmo
     rótulo, discordando na mesma tela, e o jogador sem como saber qual vale.
     É exatamente a divergência que o `colocacao.mjs` foi escrito para impedir —
     ver o cabeçalho dele. */
  const quadro = rankingColocacao(S.fighters.length, ordemDeQuedas(jogados),
    i => { const e = S.ents[i]; return e ? e.hp / S.fighters[i].maxHp : 1; });
  return quadro.find(l => l.i === S.myBet.idx)?.pos;
}

/* ═══ O TAMANHO DO RETRATO NO BANNER ══════════════════════════════════════
 *
 * Relato do dono do projeto: "alguns Pokémon estão com os GIFs maiores que os
 * outros", e depois "não fique com tamanho tão grande, esteticamente não ficou
 * legal".
 *
 * ── A MEDIÇÃO ────────────────────────────────────────────────────────────
 *
 * Os GIFs do pack variam de 31 px a 117 px de altura — 3,4 vezes. A regra
 * `.bnMon` usava `object-fit:contain` numa caixa de 118 px, e `contain` faz
 * cada imagem PREENCHER a caixa. A ampliação, então, era diferente para cada
 * espécie:
 *
 *     Nidoran♀   35x34    ampliado 3,37x
 *     Bulbasaur  37x38    ampliado 3,11x
 *     Charizard  89x91    ampliado 1,30x
 *     Pidgeotto  82x117   ampliado 1,01x
 *
 * O bicho pequeno virava o MAIOR da tela, e em pixel grosso — porque ampliar
 * 3,4x um sprite de 35 px mostra o pixel.
 *
 * ── POR QUE NÃO É SÓ TROCAR O `object-fit` ───────────────────────────────
 *
 * `scale-down` resolve a ampliação e cria outro problema: o Nidoran fica com
 * 35 px numa caixa de 118 e some. As duas leituras de "padronizar" são opostas
 * — mesmo TAMANHO exige ampliação desigual; mesma ESCALA exige tamanho
 * desigual — e nenhuma das duas sozinha ficou boa ao olhar.
 *
 * O meio-termo é limitar a ampliação e baixar o teto:
 *
 *     fator = min(1,5 ; CAIXA / maior lado natural)
 *
 * O pequeno cresce o suficiente para se ver, o grande não passa de `CAIXA`, e
 * a variação de ampliação cai de 3,4x para 1,5x. É a mesma ideia que a arena já
 * usa com `SPRITE_MAX_H`, escrita para o retrato.
 *
 * A CAIXA CAIU DE 118 PARA 100 px pelo pedido literal — "não fique com tamanho
 * tão grande". O retrato deixa de disputar a atenção com o rodapé e o nome.
 *
 * ── POR QUE EM JAVASCRIPT ────────────────────────────────────────────────
 *
 * O fator depende da dimensão NATURAL da imagem, que o CSS não conhece. O
 * `max-width`/`max-height` da folha continua lá como rede: se este código não
 * rodar, o retrato ainda não estoura o banner. */
const RETRATO_CAIXA = 100;
const RETRATO_FATOR = 1.5;

function ajustarRetrato(box){
  for (const img of box.querySelectorAll('.bnMon')) {
    const medir = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;                       // ainda não carregou, ou falhou
      const f = Math.min(RETRATO_FATOR, RETRATO_CAIXA / Math.max(w, h));
      img.style.width  = Math.round(w * f) + 'px';
      img.style.height = Math.round(h * f) + 'px';
    };
    /* `complete` cobre a imagem que veio do cache — nela o `load` já passou, e
       esperar por ele deixaria o retrato no tamanho da folha para sempre. */
    if (img.complete) medir(); else img.addEventListener('load', medir, { once: true });
  }
}

function renderBattleBanner(){
  /* DOIS banners, e por isso a busca é por classe: o vivo, na zona de ação, e a
     prévia na aba de customização do perfil. Sem a prévia o jogador escolheria
     cena e efeito de nome às cegas; com dois `id` iguais o HTML seria inválido
     e só o primeiro seria encontrado. */
  const caixas = document.querySelectorAll('.battle-banner');
  if (!caixas.length) return;
  const perfil = S.profile; if (!perfil) return;

  /* Cosmético inválido cai no padrão em vez de deixar a tela sem pele — mesma
     guarda do tema (defeito S70). Chega aqui perfil de versão antiga e
     localStorage adulterado. */
  const bb = perfil.battle || PADRAO_BANNER;
  /* `efeitoNome` e não `efeito`: o motor já exporta `efeito` (a multiplicação
     de tipo), e nome repetido entre camadas é o começo de uma confusão que o
     teste de módulos existe para impedir. */
  const cena       = cosmeticoValido('cena',    bb.cena);
  const efeitoNome = cosmeticoValido('efeito',  bb.efeito);
  /* Perfil salvo antes do R40 chega sem `moldura`. `undefined` não está no
     catálogo, então a guarda o trata como qualquer id desconhecido e devolve o
     padrão — nenhuma migração precisa existir para isso funcionar. */
  const moldura    = cosmeticoValido('moldura', bb.moldura);

  const np = progressoNivel(perfil.xp || 0);
  const fim = S.state === 'result';
  const meu = S.myBet ? S.fighters[S.myBet.idx] : null;
  const venceu = fim && S.myBet && S.myBet.idx === S.champ;
  const perdeu = fim && S.myBet && S.myBet.idx !== S.champ;

  /* `classList` e não `className =`: agora que o desenho vem da classe
     `battle-banner`, sobrescrever a lista inteira apagaria o próprio estilo do
     banner junto com o modificador de posição. */
  for (const box of caixas) {
    box.classList.toggle('ko', perdeu);
    box.classList.toggle('win', venceu);
  }

  /* ── R40 · O RETRATO GANHA MOLDURA ────────────────────────────────────────
   *
   * O retrato era a única foto sem moldura do produto — `#profAvatar` e o
   * avatar da topbar têm canto, borda e sombra; este tinha só `object-fit`.
   *
   * A MOLDURA ENVOLVE, não precede. Um irmão ao lado desenharia o aro fora do
   * retrato, e o HTML continuaria válido — é o defeito S486, e ele existe
   * porque essa versão errada é a que "quase funciona".
   *
   * O `.mdFio` só é escrito para a moldura que o usa. Um elemento vazio em
   * dezessete molduras seria lixo herdado; e o CSS de todas as outras não
   * conhece esse filho, então nem custa cascata. */
  const retratoTreinador =
    `<img class="bnTreinador${avatarEhArte() ? ' avArte' : ''}" src="${avatarURL()}" alt="" style="${avatarEnquadramento()}"
      onerror="this.onerror=null;this.src='${trainerURL('red')}'">`;
  const fioDaMoldura = moldura === 'vivo' ? '<span class="mdFio" aria-hidden="true"></span>' : '';
  const avatar = `<span class="bnMold md-${moldura}">${retratoTreinador}${fioDaMoldura}</span>`;

  /* O rodapé só existe quando HÁ aposta, e por isso é calculado dentro do
     `if`. A primeira versão o montava antes, com `meu.n ?? ''` no ramo neutro —
     e `?? ''` não protege contra `meu` ser null, só contra `meu.n` ser null. No
     boot, que desenha o banner antes da primeira rodada, isso derrubava o app
     inteiro com um TypeError. Nenhum teste estático viu; o portão Q5 viu na
     primeira execução. */
  /* O rodapé herdou o que o cartão `SEU LUTADOR` mostrava e ele não: o RETORNO
     POSSÍVEL, a vida e a colocação. O texto em si mora no `banner-texto.mjs`,
     puro, porque é a única parte do banner que afirma um número sobre dinheiro
     — e número sobre dinheiro precisa de teste que não peça navegador. */
  const rodapeDaAposta = () => {
    const e = (S.ents || [])[S.myBet.idx];
    const vivo = e ? e.alive : true;
    return rodapeAposta({
      nome: meu.n, valor: S.myBet.amount, odd: S.myBet.odd,
      pos: venceu ? 1 : (perdeu ? minhaPosBanner() : minhaPosAgora()),
      total: S.fighters.length,
      hp: e ? Math.max(0, Math.round(e.hp / meu.maxHp * 100)) : 100,
      vivo,
      desfecho: venceu ? 'venceu' : (perdeu ? 'perdeu' : undefined),
    });
  };

  /* SEM APOSTA O BANNER NÃO VIRA PLACA DE AVISO.
     Ele volta a ser o que é: a vitrine do jogador, com o Pokémon escolhido no
     perfil. Quem não apostou é justamente quem tem mais tempo para ficar
     olhando o próprio banner — cobri-lo com um aviso seria punir a espera. */
  /* A escolha mora em `vitrineDe`, camada 0 — ver a nota longa la: a versao
     certa e a errada desta linha sao quase identicas, e o zero falsy apagaria
     exatamente a opcao NENHUM que o dono pediu. */
  const vitrineDex = vitrineDe(perfil, PROFILE_DEFAULT.banner.dex);
  /* ── R34 · O SÍMBOLO SHINY DO BANNER ───────────────────────────────────
   *
   * Um ELEMENTO, e não um `::after` do contêiner: `.battle-banner::after` já é
   * a marca de K.O., e disputar aquele pseudo-elemento faria os dois se
   * apagarem — o que é pior que não ter nenhum, porque some justamente na
   * rodada em que o lutador caiu.
   *
   * No `<img>` também não dá: elemento substituído não tem pseudo-filho. Por
   * isso o brilho da imagem vai por `filter` (ver `img[data-shiny]` no CSS) e o
   * símbolo vem separado, posicionado sobre o canto do retrato. */
  const dexNoBanner = meu ? meu.dex : vitrineDex;
  const marcaShiny = gifShinyAtivo(perfil, dexNoBanner)
    ? '<span class="bnShiny" aria-hidden="true">✦</span>' : '';

  const corpo = meu
    /* O LUTADOR DA RODADA É ANIMADO (R13). Ele é o Pokémon em que o jogador
       apostou, e ficar parado enquanto a luta corre — e enquanto ele comemora,
       no fim — é o que o dono do projeto relatou. `retratoAnimado` resolve o
       GIF que o pack declara, com a variante shiny vindo do mesmo pack.
       O da VITRINE, logo abaixo, continua estático de propósito: ele é a foto
       de perfil de quem NÃO está na rodada, e movimento ali competiria com a
       arena pela atenção sem carregar informação nenhuma. */
    ? `${retratoAnimado(meu, 'class="bnMon"', gifShinyAtivo(perfil, meu.dex))}${avatar}<div class="bnRodape">${rodapeDaAposta()}</div>`
    : `${dexImg(vitrineDex, '', 'class="bnMon vitrine"', gifShinyAtivo(perfil, vitrineDex))}${avatar}
       <div class="bnRodape"><span class="bnEstado">${
         S.state === 'betting' ? 'Escolha um lutador na arena' : 'Assistindo esta rodada'}</span></div>`;

  /* ── O CORPO DO MODO IDLE ─────────────────────────────────────────────
   *
   * Mesma moldura, mesmo nome, mesmo nivel — o cosmetico e do JOGADOR, nao da
   * tela. Duas coisas mudam, e confundi-las e o erro facil:
   *
   *     a ARTE   na arena, o lutador da rodada. No idle, SEMPRE o Pokemon do
   *              PERFIL — "esse deve-se manter o Pokemon que ele escolheu na
   *              customizacao do perfil"
   *     o TEXTO  na arena, a aposta. No idle, onde o treinador esta, o stage e
   *              o tempo restante — e nada de odd nem colocacao
   *
   * A VITRINE PASSOU A SER ANIMADA aqui. Ela era a ultima arte de Pokemon
   * parada numa tela do jogador: a grade de escolha, na customizacao, ja usava
   * `retratoAnimado`. Escolher vendo o GIF e receber um PNG e a pior ordem
   * possivel — e e a regra permanente do dono (L-080), normal e shiny. */
  const esp = especiePorDex(vitrineDex);
  const corpoIdle = () =>
    (esp
      ? retratoAnimado(esp, 'class="bnMon"', gifShinyAtivo(perfil, vitrineDex))
      /* NENHUM escolhido: o quadro fica com a cena, o nome e o nivel, e sem
         Pokemon — que e exatamente o que o jogador pediu ao escolher nenhum. */
      : '') +
    `${avatar}<div class="bnRodape">${rodapeIdle(situacao)}</div>`;

  const htmlDe = box => `
    <div class="bnCena cn-${cena}"></div>
    <div class="bnVeu"></div>
    ${marcaShiny}
    <div class="bnTopo">
      <span class="bnNome ef-${efeitoNome}">${perfil.name}</span>
      <span class="bnNv">NV ${np.nivel} · ${tituloDe(np.nivel)}</span>
    </div>
    ${box.dataset.modo === 'idle' ? corpoIdle() : corpo}`;

  for (const box of caixas) { box.innerHTML = htmlDe(box); ajustarRetrato(box); }
}

export {
  minhaPosBanner,
  renderBattleBanner,
  situacaoIdle,
};
