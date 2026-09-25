/* OS CHIPS DE BIOMA — o mapa da aba do farm (camada 4).
 *
 * Saiu do `idle-tela.mjs` quando ele passou de 600 linhas pela quinta vez, e a
 * divisão é a mesma de sempre — por RESPONSABILIDADE:
 *
 *     idle-tela     a ABA — o que ela monta, o que ela liga, o que ela responde
 *     idle-biomas   O MAPA — onze chips, quem farma em cada um, e a marca de
 *                   "tem gente aqui"
 *
 * A prova de que a linha é de responsabilidade: este arquivo responde uma
 * pergunta só, e ela é a primeira que o jogador faz ao abrir a aba — *para
 * onde eu mando?*. Ele não conhece expedição, nem stamina, nem run.
 *
 * ── E ELE PINTA NAS DUAS ABAS ────────────────────────────────────────────
 *
 * ROTAS e ROTA OFF mostram o mesmo mapa, pelo mesmo código (`nosDois`). Duas
 * pinturas do mesmo mapa é a forma mais barata de elas discordarem sobre onde
 * o jogador deixou alguém.
 */
import { nosDois } from './dom.mjs';
/* A SALA pergunta ao motor quem mora e o que a rota pede — camada 0, com
   teste próprio. Ver o cabeçalho do `idle-escolha.mjs`. */
import { resumoDaRota } from './idle-escolha.mjs';
/* A NOITE NA PORTA (1.33): a prévia pergunta com o período de agora, no relógio
   do mundo, e com mais nada — o clima só se revela quando a run começa. */
import { preferenciasDaPrevia } from './elenco-condicao.mjs';
import { legendaDosClimas, fraseDoElenco } from './climas-legenda.mjs';
/* O RÓTULO da faixa vem de onde ele já mora — o mesmo que o quadro "quem
   apareceu" usa. Duas palavras para a mesma raridade seriam duas escalas. */
import { daFaixa } from './raridade.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { criaturasDe, emCampo } from './idle-dados.mjs';
import { estiloIcone } from './icones.mjs';
import { quemMostrar, expedicaoEm } from './idle-quem.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* O estado entra por argumento, como em todo painel desta família: quem
   desenha não guarda. */
let E = null, biomaEscolhido = null, equipeEscolhida = [];
export function usarEstado(estado, bioma, equipe) {
  E = estado; biomaEscolhido = bioma; equipeEscolhida = equipe;
}

export function pintarBiomas() {
  /* O MESMO seletor serve ROTAS e ROTA OFF — ver `nosDois` no dom.mjs. */
  for (const alvo of nosDois('Biomas')) pintarNele(alvo);
}

function pintarNele(alvo) {
  if (!alvo) return;
  /* ── O BIOMA DIZ QUEM FARMA NELE (L-083) ─────────────────────────────
   *
   * Pedido do dono, junto com as quatro expedições: *"ao clicar em um bioma
   * mostra quem farma ali"*. O clique já mostra — `quemMostrar` decide, desde o
   * 1.6a. O que faltava era o jogador saber ONDE CLICAR sem ter de tentar os
   * onze.
   *
   * A marca no chip responde isso antes do clique. É a diferença entre um mapa
   * e uma lista de botões: um mapa diz onde há gente. */
  /* ── QUEM ESTÁ ALI PRECISA SER RECONHECÍVEL, E 20 px NÃO É ───────────────
   *
   * Era um GIF estático de 20 px, e o dono pegou olhando:
   *
   *   > "ao invés desse gif estático minúsculo, coloque o mesmo ícone que
   *   >  estamos utilizando para o 'quem apareceu' porém coloque em um tamanho
   *   >  legal [...] que a pessoa consiga identificar onde está o seu bicho"
   *
   * Ele está certo duas vezes. O tamanho é o problema óbvio; o menos óbvio é
   * que eram DUAS artes diferentes para a mesma pergunta — o retrato animado na
   * lista e o ícone de cabeça no painel de encontros. Duas artes para a mesma
   * coisa fazem o jogador reaprender o mesmo símbolo em cada tela.
   *
   * 30 px, e o número tem os dois lados: menor não se identifica de relance, e
   * maior empurra o rótulo do bioma para fora do chip nas larguras estreitas —
   * e um mapa cujo nome não cabe deixa de ser um mapa.
   *
   * O ANEL não foi pedido, e a marca precisa dele: o ícone sozinho diz "um
   * bicho", e o anel na cor do bioma diz "o SEU bicho, aqui". É a regra do
   * §atenção especial — a peça não fecha entregando o mínimo que funciona.
   *
   * E a reserva continua: quem não estiver na folha cai no retrato de antes.
   * Buraco transparente na lista é pior que a arte antiga. */
  const cabecaNoChip = c => {
    const est = estiloIcone(PACK, c.dex, 30);
    return est
      ? `<i class="chipCabeca" style="${est}"></i>`
      : dexImg(c.dex, esp(c.dex).n, 'class="chipQuem"');
  };

  const ocupados = new Map();
  for (const x of emCampo(E)) {
    const c = E.criaturas.find(y => y.id === (x.equipe ?? [])[0]);
    if (c) ocupados.set(x.bioma, c);
  }
  /* ── A ROTA VIRA SALA (L-164) ────────────────────────────────────────
   *
   * Pedido do dono, sobre a referência que ele mandou:
   *
   *   > "o cara só clica, já informa o nível, quais criaturas tem lá e etc."
   *
   * O chip dizia só o NOME do bioma. Nome não responde nada: para saber quem
   * mora em cada um e o que cada um pede, o jogador tinha de clicar nos onze e
   * depois lembrar.
   *
   *   > A diferença entre um mapa e uma lista de botões é que o mapa diz o que
   *   > há em cada lugar.
   *
   * ── E A NOSSA VERSÃO TEM UMA COISA QUE A REFERÊNCIA NÃO TEM ──────────
   *
   * Ela mostra o nível do estágio que a COLEÇÃO DELE abre, e não um número fixo
   * do mapa. Lá o número é do lugar; aqui ele é da relação entre o jogador e o
   * lugar — a mesma rota diz "pede 5" para quem começou e "pede 32" para quem
   * já foi fundo. É a régua do §7.22 aparecendo na porta.
   *
   * QUEM É PERGUNTADO É O MOTOR, pela `resumoDaRota`: a lista da sala e a da
   * prévia são a mesma, na mesma ordem. Duas listas próprias discordariam sobre
   * quem mora ali, e a que mente é sempre a da tela. */
  const vivas = criaturasDe(E);

  /* ── A RÉGUA: o que vale para as ONZE, dito uma vez ─────────────────
     O estágio e o nível que ele pede são da COLEÇÃO do jogador, e não do
     lugar — os onze cartões diriam o mesmo número. Aqui a frase é uma, e o
     cartão fica com o que diferencia uma rota da outra. */
  const preferencias = preferenciasDaPrevia(PACK, Date.now());
  const deNoite = preferencias.some(p => p.fonte === 'noite');
  const regua = resumoDaRota(PACK, (PACK.biomas ?? [])[0]?.id, vivas, { preferencias });
  for (const el of nosDois('RotaRegua'))
    el.innerHTML = `Você entra no <b>estágio ${regua.estagio}</b>, e ele pede uma ` +
      `criatura no <b>nível ${regua.nivelPedido}</b> — em qualquer rota. ` +
      `O que muda de lugar para lugar é <b>quem mora</b> nele.` +
      (deNoite ? ` <span class="rotaNoiteAviso">É noite: quem tem a lua só sai a esta hora.</span>` : '');
  /* A LEGENDA DOS CLIMAS (1.32b): a tabela do pack no estágio do jogador. A
     decisão — quem aparece, em quantas rotas, que frase — é do módulo de
     camada 0; aqui só se pinta. Nada da run entra: o clima dela é oculto. */
  const legenda = legendaDosClimas(PACK, { estagio: regua.estagio });
  for (const el of nosDois('ClimasLista'))
    el.innerHTML = legenda.map(c => {
      const frase = fraseDoElenco(c);
      return `<li><span class="clEmoji">${c.emoji ?? ''}</span>` +
        `<span><b>${c.nome}</b><em>${c.frequencia}</em></span>` +
        `<span>${c.desc}</span>` +
        (frase ? `<span class="clElenco${c.rotasQueMudam ? '' : ' nada'}">${frase}</span>` : '') +
        `</li>`;
    }).join('');
  alvo.innerHTML = (PACK.biomas ?? []).map(b => {
    const quem = ocupados.get(b.id);
    const r = resumoDaRota(PACK, b.id, vivas, { preferencias });
    /* OS MORADORES SÃO ÍCONES DE CABEÇA — o mesmo símbolo do "quem apareceu",
       da Pokédex e do chip de quem está farmando. Quarta aparição, e a
       repetição é a vantagem: o jogador aprende o símbolo uma vez. */
    const moradores = r.moradores.map(dex => {
      const est = estiloIcone(PACK, dex, 26);
      /* A LUA marca quem só está aqui porque é noite. De dia o rosto some da
         lista, e sem a marca isso pareceria defeito e não condição. */
      const noite = r.noturnos.includes(dex);
      const cls = noite ? 'rotaMora rotaNoite' : 'rotaMora';
      const tit = nomeExibido(esp(dex).n) + (noite ? ' — só de noite' : '');
      return est
        ? `<i class="${cls}" style="${est}" title="${tit}"></i>`
        : dexImg(dex, tit, `class="${cls}"`);
    }).join('');

    return `
    <button class="idleChip${b.id === biomaEscolhido ? ' on' : ''}${quem ? ' comGente' : ''}"
            data-bioma="${b.id}"
            title="${quem ? nomeExibido(esp(quem.dex).n) + ' está farmando aqui' : b.rotulo}"
            style="--corBioma:${b.paleta?.acento ?? 'var(--gold)'}">
      <span class="rotaTopo">
        <i style="background:${b.paleta?.base ?? '#555'}"></i>${b.rotulo}
        ${quem ? cabecaNoChip(quem) : ''}
      </span>
      <span class="rotaMoram">${moradores}${
        r.resto ? `<u class="rotaResto">+${r.resto}</u>` : ''}</span>
      <span class="rotaPede"><b>${r.quantos}</b> espécie(s)
        <u>${r.faixas.map(f => daFaixa(f).rotulo.toLowerCase()).join(' · ')}</u></span>
    </button>`;
  }).join('');
}
