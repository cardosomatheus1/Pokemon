/* Customização — avatar, banner e cenário.
 *
 * Fronteira: puramente cosmética. Nada aqui toca probabilidade nem economia. */

import { $ } from './dom.mjs';
import { confirmar, avisar } from './dialogo.mjs';
import { CUR, elenco, especies, tipoCores, tipoNomes, nomeExibido, slugExterno } from './motor.mjs';
import { DEPOSIT_PACKAGES, simulateDeposit } from './carteira.mjs';
import { PROFILE_DEFAULT, avatarURL, avatarEhArte, avatarEnquadramento, cascataTreinador, loadProfile, nivelDe, progressoNivel, saveProfile, tituloDe, topOf, trainerURL } from './perfil.mjs';
import { S } from './estado.mjs';
import { TEMAS, aplicarTema, temaAtual } from './tema.mjs';
import { TYPE_BADGES, renderBadges } from './medalhas.mjs';
import { dexImg, dexURL, retratoAnimado } from './sprites.mjs';
import { BN_CENAS, BN_EFEITOS, BN_MOLDURAS, PADRAO_BANNER, cosmeticoValido } from './banner-dados.mjs';
import { TRAINER_AVATARS } from './avatares-dados.mjs';
import { AVATARES_ARTE, arquivoAvatar } from './acervo-dados.mjs';
import { AVATARES as AVATARES_GALERIA, arquivoArte } from './artes-dados.mjs';
import { NIVEIS_POR_VAGA, alternar, desbloquear, gifShinyAtivo, skinShinyAtiva,
         vagasLivres, vagasNoNivel, vagasUsadas } from './shiny-dados.mjs';
import { renderBattleBanner } from './banner.mjs';
import { ensureDaily } from './desafios.mjs';
import { goView, renderSession } from './navegacao.mjs';
import { atualizarSaldo } from './controles.mjs';
import { reiniciarCarteira, saldo, modoServidor } from './banco.mjs';
/* E4: equipar pergunta à POSSE — a do servidor com conta real, a do navegador
   sem. A regra mora em `posse-atual.mjs` (camada 0); aqui só se pinta. */
import { posseAtual, podeEquipar, escolhaDoCosmetico, catalogoCosmetico } from './posse-atual.mjs';
import { api } from './api.mjs';

/* =====================================================================
   CUSTOMIZAÇÃO — avatar e banner
   ---------------------------------------------------------------------
   Nada de asset novo: os avatares de treinador vêm da mesma fonte de
   sprites que o jogo já usa, os de Pokémon são os retratos que já estão
   na tela, e os cenários do banner são gradiente CSS puro. Se um sprite
   de treinador não existir na fonte, o onerror troca por um Pokémon —
   assim a customização nunca aparece quebrada.
   ===================================================================== */
/* O catálogo `BANNER_SCENES` saiu no R10: era o segundo catálogo de cenário,
   só para o banner do perfil. Uma pergunta, uma lista. */

/* Retratos da Pokédex: mesma história das folhas da arena — o raw do
   GitHub cai/é bloqueado, então a CDN vem primeiro e o Showdown fecha a
   fila como terceira infraestrutura independente. */
/* Ordem restaurada: o endereço original primeiro (é o que sempre
   funcionou), espelho e Showdown só como resgate dentro do <img>. */



/* <img> que tenta os espelhos em cadeia e termina no Showdown. Sem
   isso, uma fonte fora do ar deixa a grade inteira com ícone quebrado —
   foi exatamente o que aconteceu na v0.6. */


/* slug do lutador a partir do número da dex — o espelho de arte indexa por
   nome, não por número.
 *
 * O PADRÃO É A PRIMEIRA DO ELENCO, e não um nome escrito à mão. Antes era o
 * slug de uma criatura da franquia: identificador de tema em código de
 * produção, e um dos nove que a varredura do F1.12 achou. Pior que isso, era um
 * padrão que só existe num pack — noutro tema ele apontaria para nada. */
function slugDoDex(dex){
  const e = especies.find(p => p.dex === dex);
  return e ? e.n : (especies[0]?.n ?? '');
}


/* Criaturas oferecidas na customização: os 76 do elenco ativo, com os
   que você mais usou na frente — customizar com o seu predileto é o
   caminho mais provável. */
function customMons(){
  const favs = Object.keys(S.profile.mons);
  return elenco.slice().sort((a,b) => {
    const na = S.profile.mons[nomeExibido(a.n)] || 0, nb = S.profile.mons[nomeExibido(b.n)] || 0;
    return nb - na || a.dex - b.dex;
  });
}

/* UMA ARTE, TRÊS ENQUADRAMENTOS (R10).
 *
 * O banner do perfil vestia `.sc-*`, um catálogo de oito gradientes que só ele
 * usava, escolhido numa grade própria. O banner da rodada e a faixa do topo —
 * onde mora a carteira — vestem `.cn-*`, as dez cenas do catálogo único.
 *
 * Eram duas escolhas para a mesma pergunta ("com que cara eu apareço?"), com
 * listas diferentes, e o resultado natural era um jogador com dois visuais que
 * nunca combinam. Agora os três lugares vestem a MESMA cena, cada um no seu
 * enquadramento: 112 px no perfil, faixa fina no topo, e o banner inteiro na
 * rodada.
 *
 * `cosmeticoValido` e não `bt.cena` cru: é a mesma guarda dos outros dois, e
 * ela existe porque perfil de versão antiga e `localStorage` adulterado chegam
 * aqui — cena inválida cairia num `class="cn-undefined"` sem desenho nenhum. */
function renderBanner(){
  const b = S.profile.banner || PROFILE_DEFAULT.banner;
  const bt = S.profile.battle || PADRAO_BANNER;
  /* ── R42 · O BANNER DO PERFIL NUNCA MOSTROU O SHINY ─────────────────────
   *
   * O banner de BATALHA passa `gifShinyAtivo` desde o R34; este aqui nunca
   * passou — `dexImg` sem o quarto argumento sempre pediu a folha normal. Quem
   * desbloqueou a skin, equipou, e escolheu o bicho para o banner do perfil via
   * o Pokémon comum na própria tela de customização, ao lado do guarda-roupa
   * que acabou de dizer que a skin está ativa.
   *
   * A pergunta aqui é a POSSE, e não a escolha — ao contrário da arena e da
   * tela de vencedor. A diferença é o dono: o banner do perfil mostra o bicho
   * que ESTE jogador escolheu para representá-lo, então ele já é "o dele" por
   * definição. Na arena o lutador pode ser de qualquer um, e por isso lá a
   * pergunta precisa das duas metades. */
  $('#profBanner').innerHTML =
    `<div class="scene cn-${cosmeticoValido('cena', bt.cena)}"></div>
     ${dexImg(b.dex, slugDoDex(b.dex), 'class="mon"', gifShinyAtivo(S.profile, b.dex))}
     <div class="shade"></div>`;
  const av = $('#profAvatar');
  av.src = avatarURL();
  av.classList.toggle('avArte', avatarEhArte());
  /* O enquadramento da galeria vem do catálogo; para as outras coleções a
     ponte devolve vazio, e o estilo do CSS continua mandando. */
  av.setAttribute('style', avatarEnquadramento());
  av.onerror = () => {
    av.onerror = () => { av.onerror = null; av.src = trainerURL('red'); };
    av.src = `https://play.pokemonshowdown.com/sprites/gen5/${slugExterno(slugDoDex(
      (S.profile.avatar && S.profile.avatar.kind === 'mon') ? S.profile.avatar.id : 25))}.png`;
  };
}

function renderCustom(){
  const a = S.profile.avatar || PROFILE_DEFAULT.avatar;
  const b = S.profile.banner || PROFILE_DEFAULT.banner;
  const bt = S.profile.battle || PADRAO_BANNER;
  const mons = customMons();
  /* O TRANCADO APARECE TRANCADO (E4): a peça da boutique que ainda não é sua
     fica na grade, com cadeado — sumir com ela não desperta vontade nenhuma,
     e deixá-la clicável era vestir de graça o que a loja vende. */
  const cat = catalogoCosmetico(), posse = posseAtual();
  const tranc = (familia, id) => (podeEquipar(cat, posse, familia, id) ? '' : ' tranc');

  /* `.avArte` desliga o `image-rendering:pixelated` que as outras duas grades
     precisam: sprite de 96 px ampliado quer pixel duro, retrato pintado de
     256 px reduzido a 66 quer suavização. A mesma regra sem a classe serrilha
     a arte inteira — e é o tipo de coisa que passa em qualquer teste e só
     aparece olhando. */
  /* ── R43 · A GALERIA ────────────────────────────────────────────────────
   *
   * As artes de maior resolução do produto, e as únicas três do guarda-roupa
   * que se MEXEM. O `object-position` sai do catálogo — cada uma foi
   * enquadrada olhando o corte em 66 px, que é o tamanho em que ela vai viver,
   * e não no tamanho em que foi desenhada.
   *
   * `.avArte` desliga o `image-rendering:pixelated` das outras grades: estas
   * são PINTADAS e reduzidas, e pixel duro numa redução serrilha a imagem
   * inteira. Mesma razão do acervo. */
  $('#pickGaleria').innerHTML = AVATARES_GALERIA.map(x => `
    <div class="opt ${a.kind==='galeria'&&a.id===x.id?'on':''}${tranc('avatar', x.id)}" data-av="galeria" data-id="${x.id}"
         title="${x.nm}${x.vivo ? ' · animado' : ''}">
      <img class="avArte" src="../${arquivoArte(x)}" loading="lazy" alt=""
           style="object-position:50% ${(x.y*100).toFixed(0)}%">
      <div class="cap">${x.nm}</div>
    </div>`).join('');

  $('#pickArte').innerHTML = AVATARES_ARTE.map(x => `
    <div class="opt ${a.kind==='arte'&&a.id===x.id?'on':''}" data-av="arte" data-id="${x.id}">
      <img class="avArte" src="../${arquivoAvatar(x.id)}" loading="lazy" alt="">
      <div class="cap">${x.nm}</div>
    </div>`).join('');

  $('#pickTrainer').innerHTML = TRAINER_AVATARS.map(t => `
    <div class="opt ${a.kind==='trainer'&&a.id===t.id?'on':''}${tranc('avatar', t.id)}" data-av="trainer" data-id="${t.id}">
      <img src="${trainerURL(t.id)}"${cascataTreinador(t.id)} alt="">
      <div class="cap">${t.nm}</div>
    </div>`).join('');

  $('#pickMon').innerHTML = mons.map(m => `
    <div class="opt ${a.kind==='mon'&&+a.id===m.dex?'on':''}" data-av="mon" data-id="${m.dex}">
      ${dexImg(m.dex, m.n, 'loading="lazy"')}
      <div class="cap">${nomeExibido(m.n)}</div>
    </div>`).join('');

  /* A amostra do cenário precisa de `position:relative;overflow:hidden`: os
     enfeites são `::after` absolutos, e sem âncora eles escapam do quadrinho e
     tomam o modal inteiro — o sol do Pôr do Sol virava uma esfera gigante
     cobrindo o botão Salvar. Defeito que a v1.0 do porte já tinha achado e
     consertado; herdamos o conserto junto com a arte. */
  $('#pickCena').innerHTML = BN_CENAS.map(x => `
    <div class="opt ${bt.cena===x.id?'on':''}${tranc('cena', x.id)}" data-bcena="${x.id}">
      <div class="swatch cn-${x.id}" style="position:relative;overflow:hidden"></div>
      <div class="cap">${x.nm}</div>
    </div>`).join('');

  $('#pickEfeito').innerHTML = BN_EFEITOS.map(x => `
    <div class="opt ${bt.efeito===x.id?'on':''}${tranc('efeito', x.id)}" data-befeito="${x.id}">
      <div class="swatch" style="display:flex;align-items:center;justify-content:center;
        background:var(--panel)"><span class="bnNome ef-${x.id}" style="font-size:.6rem">${x.ico}</span></div>
      <div class="cap">${x.nm}</div>
    </div>`).join('');

  /* ── R40 · A GRADE DE MOLDURAS ──────────────────────────────────────────
   *
   * A AMOSTRA MOSTRA A MOLDURA COM UM RETRATO DENTRO, e não a moldura vazia.
   * É o mesmo defeito que o R34 corrigiu na grade do lutador do banner: lá a
   * grade mostrava PNG estático e o banner desenhava GIF, então o jogador
   * escolhia olhando uma coisa e recebia outra. Moldura vazia teria o mesmo
   * problema — o que se julga numa moldura é como ela emoldura ALGO.
   *
   * O retrato da amostra é o avatar de verdade do jogador, pelo mesmo motivo:
   * a Pokébola corta as orelhas de quem estiver ali dentro, e isso precisa
   * aparecer ANTES de equipar, não depois.
   *
   * O `.mdFio` acompanha o Circuito Vivo aqui como acompanha no banner. Sem
   * ele a amostra mostraria a moldura sem os fios — de novo, escolher olhando
   * uma coisa e receber outra. */
  $('#pickMoldura').innerHTML = BN_MOLDURAS.map(x => `
    <div class="opt ${bt.moldura===x.id?'on':''}${tranc('moldura', x.id)}" data-bmoldura="${x.id}" title="${x.nm}">
      <div class="swatch" style="display:flex;align-items:center;justify-content:center;
        background:var(--panel)">
        <span class="bnMold md-${x.id}" style="position:static;width:38px;height:38px">
          <img class="bnTreinador${avatarEhArte() ? ' avArte' : ''}" src="${avatarURL()}" alt=""
            onerror="this.onerror=null;this.src='${trainerURL('red')}'">${
          x.id === 'vivo' ? '<span class="mdFio" aria-hidden="true"></span>' : ''}</span>
      </div>
      <div class="cap">${x.nm}</div>
    </div>`).join('');


  /* ── R34 · O LUTADOR DO BANNER É GIF, COMO NA ARENA ────────────────────
   *
   * Esta grade escolhe QUEM aparece no banner de batalha, e o banner desenha o
   * escolhido com `retratoAnimado` — o GIF do pack. A grade mostrava
   * `dexImg`, que é PNG estático: o jogador escolhia olhando uma coisa e
   * recebia outra.
   *
   * É o mesmo defeito que o R13 corrigiu na tela de fim de rodada, onde o
   * campeão comemorava imóvel: não faltava arte, faltava apontar para a que já
   * está em disco.
   *
   * O `gifShinyAtivo` entra aqui pela mesma razão que entra no banner — quem
   * desbloqueou e equipou a skin escolhe vendo a skin. E o contêiner leva
   * `temShiny`, porque `::after` não funciona dentro de um `<img>`. */
  /* ── A OPCAO NENHUM (1.6c) ──────────────────────────────────────────────
   *
   * Pedido do dono: *"adicione opcao de NENHUM se caso a pessoa queira escolher
   * um lutador no banner, mas depois queira tirar"*.
   *
   * Ate aqui a grade era uma porta que so abria num sentido: escolhido um
   * lutador, dava para TROCAR por outro e nunca para nao ter nenhum. Escolha
   * sem volta e uma armadilha pequena, e as pequenas sao as que ninguem
   * registra — o jogador so descobre que se arrependeu depois de nao poder
   * voltar atras.
   *
   * `dex 0` e a ausencia, e nao um id de especie: nenhuma dex vale zero, entao
   * o valor nao colide com nada agora nem com pack nenhum depois. */
  const nenhum = `
    <div class="opt semMon ${!+b.dex ? 'on' : ''}" data-bmon="0" title="Sem criatura no banner">
      <div class="semMonArte" aria-hidden="true">—</div>
      <div class="cap">Nenhum</div>
    </div>`;

  $('#pickBannerMon').innerHTML = nenhum + mons.map(m => {
    const sh = gifShinyAtivo(S.profile, m.dex);
    return `
    <div class="opt ${+b.dex===m.dex?'on':''}${sh ? ' temShiny' : ''}" data-bmon="${m.dex}">
      ${retratoAnimado(m, 'loading="lazy"', sh)}
      <div class="cap">${nomeExibido(m.n)}</div>
    </div>`;
  }).join('');

  renderShiny();
}

/* LABORATÓRIO SHINY.
 *
 * Duas ações distintas na mesma grade, e a diferença precisa ficar óbvia:
 *   · quem ainda NÃO tem gasta uma vaga para desbloquear (ação irreversível
 *     dentro daquela vaga, então pede confirmação)
 *   · quem JÁ tem alterna GIF e SKIN separadamente, sem custo nenhum
 *
 * A lista é o elenco inteiro, ORDENADO pelos que o jogador mais apostou — o
 * mesmo `customMons()` do avatar e do banner. (O comentário anterior dizia "sai
 * dos Pokémon em que ele já apostou", e isso não é o que a função faz.
 * Restringir seria uma regra a mais para o jogador descobrir sozinho, e a
 * conquista já está na vaga, não na lista.) */
function renderShiny(){
  const grade = $('#pickShiny'); if (!grade) return;
  const nivel = nivelDe(S.profile.xp || 0);
  const livres = vagasLivres(S.profile, nivel);
  const total = vagasNoNivel(nivel);

  $('#shinyVagas').textContent = total
    ? `${livres} de ${total} vaga${total > 1 ? 's' : ''} livre${livres === 1 ? '' : 's'}`
    : '—';
  $('#shinyNota').innerHTML = total
    ? `Uma vaga a cada ${NIVEIS_POR_VAGA} níveis. Desbloquear dá o GIF e a skin de arena juntos; ` +
      `equipar cada um é separado, e desequipar não perde a conquista.`
    : `A primeira vaga chega no nível ${NIVEIS_POR_VAGA}. Cada ${NIVEIS_POR_VAGA} níveis dão mais uma.`;

  const mons = customMons();
  grade.innerHTML = mons.slice(0, 60).map(m => {
    const tem = (S.profile.shiny.gifs || []).includes(m.dex);
    const g = gifShinyAtivo(S.profile, m.dex), k = skinShinyAtiva(S.profile, m.dex);
    if (!tem) return `
      <div class="opt shiny ${livres > 0 ? '' : 'bloqueado'}" data-shiny-novo="${m.dex}">
        ${dexImg(m.dex, m.n, 'loading="lazy"', true)}
        <span class="sflag">${livres > 0 ? '+ vaga' : 'sem vaga'}</span>
        <div class="cap">${nomeExibido(m.n)}</div>
      </div>`;
    return `
      <div class="opt shiny on" data-shiny-tem="${m.dex}">
        ${dexImg(m.dex, m.n, 'loading="lazy"', g)}
        <span class="sflag">✓ seu</span>
        <div class="cap">${nomeExibido(m.n)}</div>
        <div class="sbtns">
          <button class="sbtn ${g ? 'on' : ''}" data-shiny-gif="${m.dex}">GIF</button>
          <button class="sbtn ${k ? 'on' : ''}" data-shiny-skin="${m.dex}">Arena</button>
        </div>
      </div>`;
  }).join('');
}

function renderDaily(){
  const d = ensureDaily();
  $('#dailyList').innerHTML = d.lista.map(c => {
    const pct = Math.min(100, (c.prog / c.meta) * 100);
    return `<div class="chal ${c.feito ? 'ok' : ''}">
      <div class="top">
        <span class="txt">${c.feito ? '✅ ' : ''}${c.txt}</span>
        <span class="cnt">${c.prog}/${c.meta}</span>
      </div>
      <div class="pg"><i style="width:${pct.toFixed(0)}%"></i></div>
      <!-- O PC-B SAIU DAQUI (D-007). O desafio pagava ~25 por conclusão, três
           vezes ao dia — ~525/semana contra um orçamento de 30 no Estudo
           Econômico. Agora o XP é por desafio e o PC-B vem do marco semanal,
           que é onde a tela precisa prometê-lo. Prometer por desafio um
           dinheiro que só sai no marco seria a tela mentindo. -->
      <div class="rw">Recompensa: <b>+${c.xp} XP</b></div>
    </div>`;
  }).join('') +
  `<div class="tiny" style="margin-top:8px">Desafios concluídos no total:
     <b style="color:var(--gold)">${S.profile.dailyDone || 0}</b></div>`;
}

function renderProfile(){
  const winRate = S.profile.betsCount ? Math.round(S.profile.winsCount/S.profile.betsCount*100) : 0;
  const desde = new Date(S.profile.since).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric'});
  const saldoLiq = S.profile.totalWon - S.profile.totalLost;

  $('#profName').value = S.profile.name;
  $('#profNameShow').textContent = S.profile.name;
  $('#profSince').textContent = 'Treinador desde ' + desde;

  const np = progressoNivel(S.profile.xp || 0);
  $('#profLvl').innerHTML =
    `<span class="tag">NV ${np.nivel}</span><span class="ttl">${tituloDe(np.nivel)} · ${np.atual}/${np.fim-np.ini} XP</span>`;
  $('#profXpBar').innerHTML = `<i style="width:${np.pct.toFixed(1)}%"></i>`;

  renderBanner();

  // destaques: Pokémon e tipo mais apostados
  const favMon = topOf(S.profile.mons), favType = topOf(S.profile.types);
  const dexOf = nm => { const e = elenco.find(p => nomeExibido(p.n) === nm); return e ? e.dex : 25; };
  $('#profHighlights').innerHTML =
    (favMon
      ? `<div class="hi">${dexImg(dexOf(favMon.k), slugDoDex(dexOf(favMon.k)))}
           <div class="t"><b>${favMon.k}</b><span>parceiro · ${favMon.v}x apostado</span></div></div>`
      : `<div class="hi"><div class="t"><b>—</b><span>ainda sem parceiro</span></div></div>`) +
    (favType
      ? `<div class="hi"><div class="tdot" style="background:${tipoCores[favType.k]||'#555'}">${
           (TYPE_BADGES.find(b=>b.t===favType.k)||{ico:'●'}).ico}</div>
           <div class="t"><b>${tipoNomes[favType.k] || favType.k}</b><span>tipo favorito · ${favType.v}x</span></div></div>`
      : `<div class="hi"><div class="t"><b>—</b><span>ainda sem tipo favorito</span></div></div>`);

  /* `betsCount` conta APOSTAS FECHADAS, não rodadas assistidas: quem assiste
     sem apostar sobe de nível e não entra nesta conta. O rótulo dizia "rodadas
     disputadas" e produzia o absurdo que o crítico cego achou — um perfil de
     NV 54 com 0 rodadas (L-030, item 10). */
  $('#profStats').innerHTML = `
    <div class="stat-box"><b>${saldo().toLocaleString('pt-BR')}</b><span>${CUR} saldo atual</span></div>
    <div class="stat-box"><b>NV ${nivelDe(S.profile.xp||0)}</b><span>${tituloDe(nivelDe(S.profile.xp||0))}</span></div>
    <div class="stat-box"><b>${S.profile.betsCount}</b><span>apostas fechadas</span></div>
    <div class="stat-box"><b>${S.profile.winsCount}</b><span>vitórias</span></div>
    <div class="stat-box"><b>${winRate}%</b><span>taxa de acerto</span></div>
    <div class="stat-box"><b>${S.profile.biggestWin.toLocaleString('pt-BR')}</b><span>maior prêmio</span></div>
    <div class="stat-box"><b>${S.profile.totalBet.toLocaleString('pt-BR')}</b><span>total apostado</span></div>
    <div class="stat-box" style="grid-column:1/-1;color:${saldoLiq>=0?'var(--green)':'var(--red)'}">
      <b style="color:inherit">${saldoLiq>=0?'+':''}${saldoLiq.toLocaleString('pt-BR')}</b>
      <span>saldo líquido de apostas</span></div>`;

  renderBadges();
  renderDaily();
  renderCustom();
  /* Seletor de tema. Cada opção mostra as duas cores do próprio tema, e não um
     nome — quem escolhe pele escolhe pelo olho. */
  const alvoTema = $('#pickTema');
  if (alvoTema){
    const atual = temaAtual();
    alvoTema.innerHTML = TEMAS.map(t => `
      <button class="tema-op ${t.id === atual ? 'on' : ''}" data-tema="${t.id}"
              style="--t1:${t.c1};--t2:${t.c2};--tbg:${t.bg}" title="${t.nm}">
        <span class="tema-am"></span><span class="tema-nm">${t.nm}</span>
      </button>`).join('');
  }

}


/* --------- customização: avatar, cenário e Pokémon do banner ---------
   Um só listener no modal inteiro (delegação): as grades são recriadas a
   cada render, então prender o clique em cada opção daria listener órfão
   toda vez que a lista fosse redesenhada. */
$('#profileModal').addEventListener('click', ev => {
  /* Tema primeiro: ele não é `.opt` porque não guarda nada no perfil — a
     escolha mora em `ar_tema`, e vale para o navegador inteiro, não para a
     conta. Trocar de treinador não devia trocar a pele do site. */
  const opTema = ev.target.closest('.tema-op');
  if (opTema){
    aplicarTema(opTema.dataset.tema);
    for (const b of $('#pickTema').children) b.classList.toggle('on', b === opTema);
    return;
  }
  const opt = ev.target.closest('.opt');
  if (!opt) return;
  /* ── EQUIPAR EXIGE POSSE (E4, ST-4.3) ──────────────────────────────────
     Antes do E4 este handler gravava qualquer peça: tudo o que a boutique
     vende saía de graça por aqui. Com conta real o servidor confere de novo
     — esta checagem é a da tela, a dele é a que vale. */
  const escolha = escolhaDoCosmetico(opt.dataset);
  if (escolha && !podeEquipar(catalogoCosmetico(), posseAtual(), escolha.familia, escolha.id)) {
    avisar('Esta peça é da boutique — compre-a antes de usar.');
    return;
  }
  if (opt.dataset.av)          S.profile.avatar = {kind:opt.dataset.av, id: opt.dataset.av==='mon' ? +opt.dataset.id : opt.dataset.id};

  else if (opt.dataset.bmon)   S.profile.banner = {...S.profile.banner, dex: +opt.dataset.bmon};
  else if (opt.dataset.bcena)  S.profile.battle = {...S.profile.battle, cena: opt.dataset.bcena};
  else if (opt.dataset.befeito)S.profile.battle = {...S.profile.battle, efeito: opt.dataset.befeito};
  else if (opt.dataset.bmoldura)S.profile.battle = {...S.profile.battle, moldura: opt.dataset.bmoldura};
  else return;
  saveProfile(S.profile);
  if (escolha && modoServidor()) api.post('/api/cosmeticos/equipar', escolha);
  renderBanner(); renderSession(); renderBattleBanner();
  // marca a opção escolhida sem redesenhar a grade inteira (não perde o scroll)
  const grid = opt.parentElement;
  grid.querySelectorAll('.opt').forEach(o => o.classList.remove('on'));
  opt.classList.add('on');
});

/* O LABORATÓRIO SHINY TEM HANDLER PRÓPRIO, e não entra no delegador de `.opt`
   acima: ali o clique em qualquer lugar do cartão escolhe o item, e aqui há
   dois botões DENTRO do cartão com significados diferentes. Misturar os dois
   faria "equipar a skin" também trocar o avatar. */
$('#pickShiny').addEventListener('click', async ev => {
  const bg = ev.target.closest('[data-shiny-gif]');
  const bk = ev.target.closest('[data-shiny-skin]');
  if (bg || bk){
    alternar(S.profile, bg ? 'gif' : 'skin', +(bg || bk).dataset[bg ? 'shinyGif' : 'shinySkin']);
    saveProfile(S.profile); renderShiny(); renderBattleBanner(); renderBanner();
    return;
  }
  const novo = ev.target.closest('[data-shiny-novo]');
  if (!novo) return;
  const dex = +novo.dataset.shinyNovo;
  const nivel = nivelDe(S.profile.xp || 0);
  if (vagasLivres(S.profile, nivel) < 1){
    /* Sem vaga não é erro do jogador: é informação. Dizer QUANTO falta é o que
       transforma "não pode" em "ainda não". */
    const faltam = NIVEIS_POR_VAGA - (nivel % NIVEIS_POR_VAGA);
    $('#shinyNota').innerHTML =
      `<b style="color:var(--gold)">Sem vaga livre.</b> A próxima chega em ${faltam} nível${faltam>1?'s':''} ` +
      `— você está no ${nivel}, e cada ${NIVEIS_POR_VAGA} níveis dão uma.`;
    return;
  }
  const nome = (especies.find(e => e.dex === dex) || {}).n || dex;
  if (!await confirmar(`Usar uma vaga de cosmético shiny em ${nomeExibido(nome)}?\n` +
               `Você tem ${vagasLivres(S.profile, nivel)} livre(s). A vaga não volta.`,
               { ok: 'Usar a vaga', perigo: true })) return;
  desbloquear(S.profile, dex, nivel);
  saveProfile(S.profile); renderShiny(); renderBattleBanner();
});

$('#btnProfReset').onclick = async () => {
  if (!await confirmar('Resetar todo o perfil e o saldo?\n' +
                       'Isto apaga o treinador, o histórico e o saldo deste navegador.',
                       { ok: 'Resetar tudo', perigo: true })) return;
  localStorage.removeItem('ar_profile'); localStorage.removeItem('ar_deposits');
  reiniciarCarteira(); atualizarSaldo();
  S.profile = loadProfile(); localStorage.removeItem('ar_session');
  renderProfile(); renderSession(); goView('viewHome');
};
$('#pkgList').addEventListener('click', e => {
  const row = e.target.closest('.pkg'); if (!row) return;
  simulateDeposit(DEPOSIT_PACKAGES[+row.dataset.i]);
});

export {
  renderProfile,
  trainerURL,
};
