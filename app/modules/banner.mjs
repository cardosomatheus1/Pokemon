/* BANNER DE BATALHA — a vitrine do jogador durante a rodada.
 *
 * Fronteira: só desenha. Não decide nada da rodada, não move dinheiro, não sabe
 * o que é odd. Lê perfil e estado, e devolve HTML.
 *
 * NENHUM ASSET NOVO, e isso é requisito, não economia. O F0.12 fechou o egresso:
 * o jogo abre com a rede desligada porque tudo o que ele pede está na cópia
 * local. Um banner que buscasse uma família nova de arte — os GIFs animados do
 * Showdown, por exemplo — abriria de novo um caminho para fora que o baixador
 * não cobre, e o jogador offline veria um retângulo vazio.
 *
 * Por isso o retrato sai de `dexImg`, que já percorre a cascata
 * `local → origem → espelho` do F0.12. Offline o primeiro candidato resolve —
 * e a variante shiny é o mesmo repositório na subpasta `shiny/`, coberta pelo
 * baixador desde o V1.15.
 */
import { $ } from './dom.mjs';
import { CUR } from './motor.mjs';
import { S } from './estado.mjs';
import { PADRAO_BANNER, cosmeticoValido } from './banner-dados.mjs';
import { PROFILE_DEFAULT, avatarURL, tituloDe, trainerURL } from './perfil.mjs';
import { progressoNivel } from './progressao.mjs';
import { colocacaoDe, ordemDeQuedas } from './colocacao.mjs';
import { dexImg } from './sprites.mjs';
import { gifShinyAtivo } from './shiny-dados.mjs';

/* A colocação do SEU lutador, só para o rodapé. Sai da mesma travessia de
   eventos que alimenta o quadro de colocação — nunca de uma contagem própria. */
function minhaPosBanner(){
  if (!S.myBet || !S.battle) return '—';
  if (S.myBet.idx === S.champ) return 1;
  const pos = colocacaoDe(S.myBet.idx, ordemDeQuedas(S.battle.events), S.fighters.length);
  return pos === null ? 1 : pos;
}

function renderBattleBanner(){
  const box = $('#battleBanner'); if (!box) return;
  const perfil = S.profile; if (!perfil) return;

  /* Cosmético inválido cai no padrão em vez de deixar a tela sem pele — mesma
     guarda do tema (defeito S70). Chega aqui perfil de versão antiga e
     localStorage adulterado. */
  const bb = perfil.battle || PADRAO_BANNER;
  /* `efeitoNome` e não `efeito`: o motor já exporta `efeito` (a multiplicação
     de tipo), e nome repetido entre camadas é o começo de uma confusão que o
     teste de módulos existe para impedir. */
  const cena       = cosmeticoValido('cena',   bb.cena);
  const efeitoNome = cosmeticoValido('efeito', bb.efeito);

  const np = progressoNivel(perfil.xp || 0);
  const fim = S.state === 'result';
  const meu = S.myBet ? S.fighters[S.myBet.idx] : null;
  const venceu = fim && S.myBet && S.myBet.idx === S.champ;
  const perdeu = fim && S.myBet && S.myBet.idx !== S.champ;

  box.className = perdeu ? 'ko' : (venceu ? 'win' : '');

  const avatar = `<img class="bnTreinador" src="${avatarURL()}" alt=""
      onerror="this.onerror=null;this.src='${trainerURL('red')}'">`;

  /* O rodapé só existe quando HÁ aposta, e por isso é calculado dentro do
     `if`. A primeira versão o montava antes, com `meu.n ?? ''` no ramo neutro —
     e `?? ''` não protege contra `meu` ser null, só contra `meu.n` ser null. No
     boot, que desenha o banner antes da primeira rodada, isso derrubava o app
     inteiro com um TypeError. Nenhum teste estático viu; o portão Q5 viu na
     primeira execução. */
  const rodapeDaAposta = () => venceu
    ? `🏆 <b>${meu.n}</b> venceu — +${CUR} ${Math.floor(S.myBet.amount * S.myBet.odd).toLocaleString('pt-BR')}`
    : perdeu
      ? `<b>${meu.n}</b> caiu em ${minhaPosBanner()}º — −${CUR} ${S.myBet.amount.toLocaleString('pt-BR')}`
      : `<b>${meu.n}</b> · ${CUR} ${S.myBet.amount.toLocaleString('pt-BR')} a x${S.myBet.odd.toFixed(2)}`;

  /* SEM APOSTA O BANNER NÃO VIRA PLACA DE AVISO.
     Ele volta a ser o que é: a vitrine do jogador, com o Pokémon escolhido no
     perfil. Quem não apostou é justamente quem tem mais tempo para ficar
     olhando o próprio banner — cobri-lo com um aviso seria punir a espera. */
  const vitrineDex = (perfil.banner && perfil.banner.dex) || PROFILE_DEFAULT.banner.dex;
  const corpo = meu
    ? `${dexImg(meu.dex, meu.n, 'class="bnMon"', gifShinyAtivo(perfil, meu.dex))}${avatar}<div class="bnRodape">${rodapeDaAposta()}</div>`
    : `${dexImg(vitrineDex, '', 'class="bnMon vitrine"', gifShinyAtivo(perfil, vitrineDex))}${avatar}
       <div class="bnRodape"><span class="bnEstado">${
         S.state === 'betting' ? 'Escolha um lutador na arena' : 'Assistindo esta rodada'}</span></div>`;

  box.innerHTML = `
    <div class="bnCena cn-${cena}"></div>
    <div class="bnVeu"></div>
    <div class="bnTopo">
      <span class="bnNome ef-${efeitoNome}">${perfil.name}</span>
      <span class="bnNv">NV ${np.nivel} · ${tituloDe(np.nivel)}</span>
    </div>
    ${corpo}`;
}

export {
  minhaPosBanner,
  renderBattleBanner,
};
