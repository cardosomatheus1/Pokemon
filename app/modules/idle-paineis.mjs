/* OS PAINÉIS DE RESULTADO — o que a expedição trouxe (camada 4).
 *
 * Saíram de `idle-tela.mjs` quando ele passou de 600 linhas pela segunda vez, e
 * a divisão foi por RESPONSABILIDADE e não por tamanho: aquele arquivo é a
 * ESCOLHA — para onde mandar, quem mandar, por quanto tempo. Este é o
 * RESULTADO — o que apareceu, o que se pegou, onde cada um está.
 *
 * A prova de que a linha está no lugar certo: nada aqui decide nada. Estes três
 * painéis leem o estado e desenham; a única ação que oferecem — jogar a bola,
 * mover para a caixa — é um `data-` que a aba escuta.
 *
 * ── E O ESTADO CHEGA POR ARGUMENTO ───────────────────────────────────────
 *
 * `E` era global do módulo da aba. Aqui ele entra como parâmetro, e isso não é
 * formalidade: é o que impede este arquivo de virar um segundo dono do estado.
 * Quem desenha não guarda.
 */
import { $, nosDois } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { estiloIcone } from './icones.mjs';
import { chanceDe } from '../../engine/captura.mjs';
import { naEquipe, naCaixa, PARTY_MAX, bolsaEmLista, registroEmLista, encontrosDaRun } from './idle-dados.mjs';
import { estiloItem, usarCatalogo } from './itens-icone.mjs';

/* O CATALOGO DO PACK ALIMENTA OS ICONES. Uma vez, na carga do modulo: o mapa
   id -> indice e do TEMA, e este arquivo so o consome. */
usarCatalogo(PACK.catalogo);
import { idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';
import { nomesDe } from './itens-nome.mjs';
import { estiloDa, classeDa, daFaixa } from './raridade.mjs';

/* A espécie pelo dex. Uma função e não uma busca solta: ela é chamada dentro de
   template, e busca solta ali vira `undefined.n` no dia em que o pack mudar. */
const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

/* ── A ARTE DO ENCONTRO ────────────────────────────────────────────────────
 *
 * Pedido do dono: substituir o retrato estático pelos ícones de cabeça. Aquela
 * tela é uma LISTA DE DECISÕES — quatro, cinco criaturas esperando uma bola
 * cada —, e retrato grande em lista rouba o espaço da escolha, que é onde a
 * atenção tem de estar.
 *
 * O retrato continua sendo a RESERVA: a folha tem os 151 de Kanto, e o pack
 * original terá os dele. Fora da folha, volta ao retrato em vez de desenhar um
 * quadrado vazio. */
function arteDoEncontro(dex) {
  const est = estiloIcone(PACK, dex, 52);
  return est
    ? `<span class="idleEncArte icone" style="${est}" aria-hidden="true"></span>`
    : dexImg(dex, esp(dex).n, 'class="idleEncArte"');
}

export function pintarSaque(E, ultimaColheita) {
  const alvo = $('#idleSaque');
  if (!alvo) return;
  if (!ultimaColheita) { alvo.innerHTML = ''; return; }
  const { encontros, itens, npc, xp, moedas } = ultimaColheita;
  /* ── O QUE ACONTECEU LA FORA, EM UMA LINHA (bloco 1.7b) ────────────────
     A batalha e a unica coisa do idle que ACONTECE sem o jogador — ele manda a
     expedicao e volta horas depois. Se ela nao for CONTADA aqui, ela nao
     existiu para ele: ganhou XP a mais e nunca soube por que.

     Um idle sem instante e uma planilha. Este e o instante. */
  const linhaNpc = npc && npc.quantas
    ? `<p class="tiny saqueNpc"><b>${npc.quantas}</b> treinador(es) no caminho · ` +
      `<b>${npc.vitorias}</b> vitória(s)` +
      (npc.material ? ` · +${npc.material} de material` : '') +
      `. Cada batalha ocupou um encontro: veio um treinador no lugar de uma criatura.</p>`
    : '';
  alvo.innerHTML = `
    <h4>A expedição voltou</h4>
    ${linhaNpc}
    <p class="tiny">Os encontros ficam guardados — jogar a bola é o próximo bloco.
       O fragmento de Pokédex já entrou: ele cai no <b>encontro</b>, e não na captura.</p>
    <div class="idleLinha">${encontros.map(en => `
      <span class="idleEnc ${classeDa(en.raridade)}" style="${estiloDa(en.raridade)}">
        ${arteDoEncontro(en.dex)}
        <span class="tiny rarNome">${daFaixa(en.raridade).rotulo}</span>
      </span>`).join('')}</div>
    <div class="idleLinha">${itens.map(i => `
      <span class="idleItem">${i.rotulo ?? 'Essência'} ×${i.quantidade}</span>`).join('')}</div>`;
}


/* ── OS ENCONTROS PENDENTES ────────────────────────────────────────────────
 *
 * A única tela do idle em que o jogador decide alguma coisa DEPOIS que a
 * expedição voltou. E a decisão é uma só, do jeito que o motor desenhou: qual
 * bola gastar em qual bicho.
 *
 * A CHANCE APARECE ANTES DO CLIQUE, e isso não é conveniência: sem ela a
 * escolha da bola é chute, e o §P1 fala de o jogador saber no que está
 * entrando. Cada botão diz quanto vale, e o botão sem bola na bolsa aparece
 * DESLIGADO em vez de sumir — some, e o jogador nunca descobre que a boa
 * existia.
 *
 * ── E DESDE O L-166 ELE É O FIM DA RUN TAMBÉM ────────────────────────────
 *
 * O Avanço tinha bola própria na barra da wave, e o dono a tirou:
 *
 *   > "quando você clica em bola simplesmente não avisa nada no log — se
 *   >  capturou, se fugiu, você não sabe o que aconteceu com suas bolas.
 *   >  O padrão a se manter é o qual já existe com o 'QUEM APARECEU' ao final
 *   >  da run, mesmo se o jogador falhar."
 *
 * Então este quadro passou a servir aos DOIS modos, e é a vantagem de ele já
 * existir: o jogador aprende uma tela e a usa nas duas pontas. Um quadro só
 * para o Avanço seria uma segunda tela para a mesma decisão, e elas
 * divergiriam na primeira mudança.
 *
 * ── A LOJA FICA AQUI DENTRO, e é pedido explícito ────────────────────────
 *
 *   > "ele pode acessar a loja e comprar ball também pra capturar caso esteja
 *   >  sem, e aí vai da sorte dele"
 *
 * O momento é curto de propósito — entrar noutra run apaga o quadro. Mandar o
 * jogador procurar a loja noutro canto da página é gastar o momento
 * procurando, e o que ele perde é a captura. */
export function pintarEncontros(E) {
  const alvo = $('#idleEncontros');
  if (!alvo) return;
  if (!E.encontros.length) {
    alvo.innerHTML = '';
    return;
  }
  const bolas = (PACK.bolas ?? []);
  /* QUANTOS VIERAM DA RUN. Muda o TEXTO, e não o desenho: o quadro é um só, e
     dois arranjos para a mesma decisão seriam duas telas de novo. O que muda
     é o que ele avisa — o do Avanço tem prazo, e o da Rota OFF não. */
  const daRun = encontrosDaRun(E);
  const semBola = !bolas.some(b => (E.bolsa[b.id] ?? 0) > 0);
  alvo.innerHTML = `
    <h3>Quem apareceu <span class="tiny">${E.encontros.length} esperando</span>
        <button class="btn ljAbrir" data-loja-abrir>🪙 Loja</button></h3>
    ${daRun ? `<p class="tiny avisoMomento"><b>${daRun}</b> ${daRun === 1
       ? "veio da run que acabou" : "vieram da run que acabou"} — e este é o
       momento de decidir. Começar outra run limpa o que veio dela; o que a
       <b>Rota OFF</b> trouxe fica.</p>` : ''}
    ${semBola ? `<p class="tiny avisoMomento seco">Você está sem bola. Dá para comprar
       na loja aqui em cima e voltar — o quadro espera.</p>` : ''}
    <p class="tiny">Uma bola por encontro — escolha onde gastar a boa. O fragmento
       de Pokédex já entrou: ele cai no <b>encontro</b>, e não na captura.</p>
    <div class="idleEncs">${E.encontros.map(en => {
      const nome = nomeExibido(esp(en.dex).n);
      return `<div class="idleEncCard ${classeDa(en.raridade)}" style="${estiloDa(en.raridade)}">
        ${arteDoEncontro(en.dex)}
        <b>${nome}</b>
        <span class="tiny rarNome">${daFaixa(en.raridade).rotulo}</span>
        <div class="idleBolas">${bolas.map(b => {
          const tem = E.bolsa[b.id] ?? 0;
          const ch = Math.round(chanceDe(PACK, { raridade: en.raridade, bola: b.id }) * 100);
          return `<button class="idleBola" data-lance="${en.chave}" data-bola="${b.id}"
                          ${tem ? '' : 'disabled'} title="${b.rotulo}">
                    <i>${ch}%</i><span class="tiny">${b.rotulo} · ${tem}</span>
                  </button>`;
        }).join('')}</div>
      </div>`;
    }).join('')}</div>`;
}

/* ── O CENTRO: A EQUIPE ATIVA E A CAIXA ───────────────────────────────────
 *
 * Seis ativos, o resto guardado. A tela mostra os dois lados juntos de
 * propósito: a decisão é sempre uma TROCA, e uma troca que exige trocar de aba
 * deixa de ser sentida. */
export function pintarCentro(E) {
  /* ── NAS DUAS ABAS (L-149) ────────────────────────────────────────────
     Pedido do dono: *"nossa box, caixa, o depot de substituição dos pokémon,
     precisa estar inserida no novo layout"*.

     O Centro entrou em ROTAS, e a divisão do A4e o deixou só lá. Mas quem
     monta uma expedição monta na ROTA OFF, e lá ele escolhia entre os seis
     ativos sem poder trocar QUEM são os seis.

       > Uma decisão que se toma várias vezes por dia e que exige mudar de aba
       > é uma decisão que se deixa de tomar. Ele manda a mesma equipe cansada,
       > e o modo perde o eixo.

     O mesmo código escrevendo nos dois é o que impede as duas abas de
     discordarem sobre quem está na caixa — ver `nosDois` no `dom.mjs`. */
  const alvos = nosDois('Centro');
  const alvo = alvos[0];
  const escrever = html => { for (const el of alvos) el.innerHTML = html; };
  if (!alvo) return;
  const ativos = naEquipe(E), guardados = naCaixa(E);
  const ficha = (c, guardado) => `
    <button class="idleGuardado" data-mover="${c.id}" data-para="${guardado ? '0' : '1'}">
      ${dexImg(c.dex, esp(c.dex).n, 'class=\"idleCriaArte\"')}
      <span class="idleCriaNome">${nomeExibido(esp(c.dex).n)}</span>
      <span class="tiny">potencial ${c.potencial}${c.exemplar ? ' ✦' : ''}</span>
      <span class="idleAcao">${guardado ? 'tirar' : 'guardar'}</span>
    </button>`;

  escrever(`
    <h3>Centro <span class="tiny">${ativos.length}/${PARTY_MAX} na equipe ·
        ${guardados.length} na caixa</span></h3>
    <p class="tiny">Só quem está na equipe vai a campo. Quando a equipe está cheia,
       a captura vai para a caixa — ela nunca é recusada.</p>
    <div class="idleLinha">${ativos.map(c => ficha(c, false)).join('')}</div>
    ${guardados.length ? `
      <h4 class="idleSub">Na caixa</h4>
      <div class="idleLinha">${guardados.map(c => ficha(c, true)).join('')}</div>` : ''}`);
}

/* ── A MOCHILA E O POKÉDEX ─────────────────────────────────────────────────
   Veio de `idle-tela.mjs` no 1.9, quando ele passou de 600 linhas pela terceira
   vez. A divisão continua sendo por RESPONSABILIDADE: a mochila é RESULTADO —
   o que a expedição trouxe —, e resultado mora aqui. A aba ao lado é ESCOLHA.

   `E` entra por argumento, como os outros três: quem desenha não guarda. */
export function pintarBolsa(E) {
  const alvo = $('#idleBolsa');
  if (!alvo) return;
  const lista = bolsaEmLista(E);
  /* O NOME VEM DO CATALOGO PRIMEIRO (1.12). Antes a mochila so conhecia
     `pack.bolas` e `pack.itens`, entao todo item novo aparecia com o ID cru —
     "blacksludge" no lugar de "Lodo Negro". Id na tela nao e um nome faltando:
     e um nome ERRADO, porque o jogador le e acha que aquilo e o nome.

     A RESOLUCAO SAIU DAQUI no 1.22 e virou `itens-nome.mjs`, camada 0. Ela
     nasceu privada desta funcao, e enquanto so a mochila precisava isso estava
     certo; quando a Pokedex e o cartao da criatura passaram a precisar do
     mesmo, os dois inventaram uma saida propria — e uma delas foi uma chamada
     para o vazio que derrubou a aba inteira. E o D-074. */
  const rotulo = nomesDe(PACK);
  /* ── A MOCHILA ────────────────────────────────────────────────────────
     Pedido do dono: *"pokebola deve aparecer o ícone na mochila e quantidade,
     pedra de fogo, pedra das folhas e assim por diante"*.

     O ÍCONE É O SUJEITO, o número é o adjetivo. Uma lista de itens se lê pela
     FORMA antes do nome — e é por isso que o desenho vem primeiro e grande, e a
     contagem entra como selo. Texto puro, que era o que estava aqui, obriga a
     ler cada linha para achar a bola.

     Item sem ícone declarado cai no texto em vez de sumir: a bolsa recebe o que
     o pack manda, e o pack pode mandar coisa nova antes de a arte chegar. */
  /* ── E A MOCHILA SEPARA O QUE SE GASTA DO QUE SE USA (bloco 1.11) ─────
     Duas zonas, e a divisão não é estética:

         GASTA    a moeda do PvE (dinheiro) · a Essência (material)
         USA      bolas, pedras, o Elo

     É a distinção da L-092 aparecendo na tela: **dinheiro compra o que já tem
     preço; material compra o que não devia ter preço.** Um item de poder
     comprável por dinheiro é a loja vendendo poder; o mesmo item saindo de uma
     troca por material farmado é recompensa de persistência.

     Na mesma fila que as bolas, essa diferença existiria no código e não
     existiria para quem joga — e é para quem joga que ela foi feita. */
  const MOEDA = idDaMoeda(PACK), MATERIAL = idDoMaterial(PACK);
  const eGastavel = i => i.id === MOEDA || i.id === MATERIAL;
  const ficha = (i, classe) => {
    const est = estiloItem(i.id, 32);
    return `<span class="idleItem ${classe}${est ? ' comIcone' : ''}" title="${rotulo(i.id)}">
      ${est ? `<i class="itIcone" style="${est}"></i>` : ''}
      <b class="itNome">${rotulo(i.id)}</b>
      <u class="itQtd">${classe === 'gasta' ? '' : '×'}${i.quantidade}</u>
    </span>`;
  };
  const gastaveis = lista.filter(eGastavel);
  const coisas = lista.filter(i => !eGastavel(i));

  alvo.innerHTML = lista.length
    ? (gastaveis.length ? `<div class="bolsaGasta">${gastaveis.map(i => ficha(i, 'gasta')).join('')}</div>` : '')
      + (coisas.length ? `<div class="bolsaCoisas">${coisas.map(i => ficha(i, 'coisa')).join('')}</div>` : '')
    : '<p class="tiny">A mochila está vazia. O que a expedição traz cai aqui.</p>';

  const d = $('#idlePokedex');
  if (d) {
    const f = registroEmLista(E);
    d.innerHTML = f.length
      ? `<p class="tiny"><b>${f.length}</b> espécie(s) vistas · <b>` +
        `${f.reduce((a, x) => a + x.fragmentos, 0)}</b> fragmento(s)</p>`
      : '<p class="tiny">Nenhuma ficha aberta ainda.</p>';
  }
}
