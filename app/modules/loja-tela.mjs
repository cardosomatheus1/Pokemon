/* A LOJA PvE — a vendedora, a vitrine e o balcão (bloco 1.25, camada 4).
 *
 * ── O CORTE DO VÍDEO É FEITO PELA JANELA, E NÃO PELO ARQUIVO ─────────────
 *
 * O dono mandou um vídeo com os DOIS NPCs no mesmo quadro — 1280×720, 10 s, o
 * homem de terno à esquerda e a vendedora à direita — e pediu que cada um fosse
 * para a sua loja.
 *
 * Cortar um vídeo pede reprocessar, e reprocessar sem ferramenta significaria
 * trocar a arte dele por outra coisa. **A janela resolve sem tocar no arquivo:**
 * uma caixa de 640 px com `overflow:hidden` e o vídeo deslocado mostra a metade
 * que se quer.
 *
 *     ZERO recodificação   a arte chega como ele mandou
 *     UM arquivo           baixado e cacheado uma vez, servindo às duas lojas
 *     O SOM inteiro        que é o pedido dele, e que um gif não carregaria
 *
 * ── O SOM SÓ NA ABERTURA, E MUDO EM TODO O RESTO ────────────────────────
 *
 * Regra que ele fixou junto: *"mantenha o som do vídeo na hora de abertura de
 * suas respectivas lojas [...] ao fechar o som não é permitido ouvir, em aba
 * alguma do site"*.
 *
 * O vídeo nasce `muted` — sem isso o navegador recusa o autoplay e a vendedora
 * fica parada — e ganha som no gesto que abre a loja, que é um clique e portanto
 * autoriza o áudio. Fechar emudece e para.
 *
 * ── E ELA FALA ──────────────────────────────────────────────────────────
 *
 * Uma de dez frases, sorteada na abertura. A crítica que chegou de fora foi
 * *"muito linear, site de velho"*, e vale repetir aqui:
 *
 *   > Uma loja que abre com uma tabela de preços é um formulário. Uma que abre
 *   > com alguém falando é um lugar.
 *
 * As falas moram no PACK (§0.3): texto é tema.
 */
import { $ } from './dom.mjs';
import { PACK } from './motor.mjs';
import { estiloItem } from './itens-icone.mjs';
import { nomeDoItem } from './itens-nome.mjs';
import { aVenda, aceita, precoDeVenda, comprar, vender, cabemQuantos }
  from '../../engine/loja.mjs';
/* ── A TERCEIRA ABA: O ESTILHAÇO (1.29) ─────────────────────────────────
   A Essência era 52,85% de tudo que caía e não servia para nada — a maior
   torneira do jogo despejando em terra. A regra de quanto custa e do que sai
   mora no motor; aqui só se mostra e se clica. */
import { PARTES, custoDoEstilhaco, custoDoItem, bolsoDoBioma, sortearEstilhaco,
         podeTrocar, montaveis } from '../../engine/estilhaco.mjs';
import { idDoMaterial } from '../../engine/economia-idle.mjs';
import { derivar } from '../../engine/seed.mjs';
import { semente } from '../../engine/instancia.mjs';

const MOEDA = () => PACK.moedaPve?.id ?? 'pokecoin';
const NOME_MOEDA = () => PACK.moedaPve?.nome ?? 'moeda';

/* O vídeo tem os dois NPCs lado a lado; a metade é a fronteira. Os dois números
   saem do arquivo, e não de um palpite — 1280×720, medidos pelo
   `tools/contato-video.mjs`. */
export const VIDEO = '../assets/npc/lojas.mp4';
export const LARGURA_DO_VIDEO = 1280;
export const ALTURA_DO_VIDEO = 720;
export const METADES = { pokecash: 0, pokecoin: 1 };

let lerEstado = () => null;
let gravar = () => {};
let aoMudar = () => {};
/* O BIOMA ESCOLHIDO. Entra por fora como o resto: a loja não sabe qual rota o
   jogador está olhando, e não deve — quem sabe é a aba. O Estilhaço precisa
   dele porque o bolso é DA ROTA. */
let biomaAtual = () => null;
/* A loja não guarda estado nem sabe salvar: quem a abre entrega as três coisas.
   É a mesma costura do `usarEstado` da Pokédex, e ela existe para esta tela ser
   desenhável num teste sem save nenhum. */
export function usarEstado({ ler, salvar, mudou, bioma }) {
  if (ler) lerEstado = ler;
  if (salvar) gravar = salvar;
  if (mudou) aoMudar = mudou;
  if (bioma) biomaAtual = bioma;
}

let aba = 'comprar';
let fala = '';
let recado = '';

export const falaSorteada = (falas = PACK.falasDaLoja ?? [], sorte = Math.random) =>
  falas.length ? falas[Math.floor(sorte() * falas.length) % falas.length] : '';

const moedas = E => Math.max(0, Math.floor(Number(E?.bolsa?.[MOEDA()]) || 0));
const quantos = (E, id) => Math.max(0, Math.floor(Number(E?.bolsa?.[id]) || 0));

/* ── A VITRINE ───────────────────────────────────────────────────────────
 *
 * Cada linha diz preço, quanto você já tem, e QUANTOS CABEM. O terceiro número
 * é o que evita a recusa depois do clique — e recusa depois de clicar é a pior
 * forma de ensinar uma regra, que é lição registrada do D-062. */
function linhaDeCompra(E, i) {
  const cabem = cabemQuantos(E, { pack: PACK, id: i.id });
  const est = estiloItem(i.id, 32);
  return `
    <div class="ljItem${cabem ? '' : ' semGrana'}">
      ${est ? `<i class="ljArte" style="${est}"></i>` : '<i class="ljArte vazia"></i>'}
      <span class="ljNome">${i.nome}<em>${i.texto ?? ''}</em></span>
      <span class="ljPreco">${i.preco}<u>${PACK.moedaPve?.simbolo ?? ''}</u></span>
      <span class="ljTenho">tem <b>${quantos(E, i.id)}</b></span>
      <span class="ljBotoes">
        <button class="btn ljMais" data-comprar="${i.id}" data-n="1"
                ${cabem >= 1 ? '' : 'disabled'}>+1</button>
        <button class="btn ljMais" data-comprar="${i.id}" data-n="10"
                ${cabem >= 10 ? '' : 'disabled'}>+10</button>
      </span>
    </div>`;
}

/* ── O BALCÃO DE COMPRA DELA ─────────────────────────────────────────────
 *
 * Mostra TUDO que ela aceita, e o que o jogador não tem aparece APAGADO com o
 * preço visível. Ideia do dono, e ela é boa por um motivo que vale escrever:
 *
 *   > Um catálogo que mostra o que você ainda não tem, com o preço, transforma
 *   > a loja num MAPA DE OBJETIVOS.
 *
 * Quem vê que a pedra vale 480 sabe o que procurar antes de tê-la. Esconder o
 * que ele não tem faria a lista encolher justamente para quem mais precisa de
 * direção — o jogador novo. */
function linhaDeVenda(E, i) {
  const tem = quantos(E, i.id);
  const est = estiloItem(i.id, 32);
  return `
    <div class="ljItem${tem ? '' : ' naoTenho'}">
      ${est ? `<i class="ljArte" style="${est}"></i>` : '<i class="ljArte vazia"></i>'}
      <span class="ljNome">${i.nome}<em>${tem ? (i.texto ?? '') : 'você ainda não tem'}</em></span>
      <span class="ljPreco">${i.valor}<u>${PACK.moedaPve?.simbolo ?? ''}</u></span>
      <span class="ljTenho">tem <b>${tem}</b></span>
      <span class="ljBotoes">
        <button class="btn ljMenos" data-vender="${i.id}" data-n="1"
                ${tem >= 1 ? '' : 'disabled'}>−1</button>
        <button class="btn ljMenos" data-vender="${i.id}" data-n="${Math.max(1, tem)}"
                ${tem >= 2 ? '' : 'disabled'}>tudo</button>
      </span>
    </div>`;
}


/* ── O PAINEL DO ESTILHAÇO (1.29) ────────────────────────────────────────
 *
 * A Essência era 52,85% de tudo que caía e não servia para nada. Esta aba é a
 * porta que faltava, e ela é DO BIOMA:
 *
 *   > "HELD ITEMS DALI — mostra o que cai naquele bioma; a aba vira mapa da
 *   >  rota"  — o dono, na ficha da L-138
 *
 * O bolso é o da rota escolhida, e é isso que faz ONDE farmar ser a decisão.
 * Com o bolo do jogo inteiro, sete iguais seria o colecionador de figurinhas.
 */
const partesDe = (E, id) => Math.max(0, Math.floor(Number(E?.bolsa?.['est:' + id]) || 0));
const essenciaDe = E => Math.max(0, Math.floor(Number(E?.bolsa?.[idDoMaterial(PACK)]) || 0));

function painelDoEstilhaco(E) {
  const bioma = biomaAtual();
  const bolso = bolsoDoBioma(PACK.catalogo ?? [], bioma);
  const tenho = essenciaDe(E);

  if (!bolso.length)
    return '<p class="ljVazio">Escolha uma rota para ver o que se estilhaça nela.</p>';

  /* O CABEÇALHO DIZ A REGRA UMA VEZ, e não em cada linha: sete partes, e a
     parte é sorteada dentro do que cai NESTA rota. Repetir a regra por item
     faria a lista virar um manual. */
  const nomeDoBioma = (PACK.biomas ?? []).find(b => b.id === bioma)?.rotulo ?? bioma;
  const cabeca =
    `<p class="ljEstCabeca">Você troca <b>Essência</b> por um estilhaço sorteado ` +
    `entre o que cai em <b>${nomeDoBioma}</b>. <b>${PARTES}</b> estilhaços do ` +
    `mesmo item viram o item.</p>`;

  const linhas = bolso.map(i => {
    const custo = custoDoEstilhaco(i.faixa);
    const tem = partesDe(E, i.id);
    const pronto = tem >= PARTES;
    const est = estiloItem(i.id, 32);
    return `
      <div class="ljItem${tenho >= custo || pronto ? '' : ' semGrana'}">
        ${est ? `<i class="ljArte" style="${est}"></i>` : '<i class="ljArte vazia"></i>'}
        <span class="ljNome">${i.nome}
          <em>${tem} de ${PARTES} · o item inteiro sai por ${custoDoItem(i.faixa)} de Essência</em></span>
        <span class="ljEstBarra"><i style="width:${Math.min(100, tem / PARTES * 100)}%"></i></span>
        <span class="ljBotoes">
          ${pronto
            ? `<button class="btn gold" data-montar="${i.id}">montar</button>`
            : `<button class="btn ljMais" data-estilhacar="${i.id}"
                       ${tenho >= custo ? '' : 'disabled'}>${custo}</button>`}
        </span>
      </div>`;
  }).join('');

  return cabeca + linhas;
}

/* ── A TROCA, E POR QUE ELA NÃO PODE SER RESORTEADA ─────────────────────
 *
 * A semente sai de um CONTADOR gravado no estado, e não do relógio nem de
 * `Math.random`. Sem isso o jogador aprenderia a recarregar a página até vir a
 * parte que falta — e a paciência que o desenho cobra viraria paciência com o
 * F5.
 *
 *   > Um sorteio que se pode repetir de graça não é um sorteio: é um menu.
 */
function estilhacar(id) {
  const E = lerEstado();
  if (!E) return;
  const item = (PACK.catalogo ?? []).find(i => i.id === id);
  if (!item) return;
  const r = podeTrocar({ faixa: item.faixa, essencia: essenciaDe(E) });
  if (!r.pode) { recado = r.motivo; pintarLoja(); return; }

  const km = idDoMaterial(PACK);
  E.bolsa[km] = essenciaDe(E) - r.custo;
  E.estilhacos = (E.estilhacos ?? 0) + 1;
  const sorteado = sortearEstilhaco(
    semente(derivar(E.estilhacos, 'estilhaco:' + biomaAtual())),
    { itens: PACK.catalogo ?? [], bioma: biomaAtual() });
  if (!sorteado) { recado = 'esta rota não estilhaça nada'; pintarLoja(); return; }

  const chave = 'est:' + sorteado.id;
  E.bolsa[chave] = (E.bolsa[chave] ?? 0) + 1;
  gravar(E);
  const tem = partesDe(E, sorteado.id);
  recado = tem >= PARTES
    ? `Saiu um estilhaço de ${sorteado.nome} — e com ele já dá para montar.`
    : `Saiu um estilhaço de ${sorteado.nome}. ${tem} de ${PARTES}.`;
  aoMudar();
  pintarLoja();
}

function montarItem(id) {
  const E = lerEstado();
  if (!E) return;
  const chave = 'est:' + id;
  if (partesDe(E, id) < PARTES) { recado = 'ainda faltam partes'; pintarLoja(); return; }
  /* CONSOME EXATAMENTE SETE e deixa a sobra. Levar a sobra junto seria cobrar
     do jogador partes que ele não usou. */
  E.bolsa[chave] = partesDe(E, id) - PARTES;
  E.bolsa[id] = (E.bolsa[id] ?? 0) + 1;
  gravar(E);
  recado = `Montou ${nomeDoItem(PACK, id)}.`;
  aoMudar();
  pintarLoja();
}

export function pintarLoja() {
  const alvo = $('#lojaCorpo');
  if (!alvo) return false;
  const E = lerEstado();
  if (!E) { alvo.innerHTML = ''; return false; }

  const lista = aba === 'comprar'
    ? aVenda(PACK).map(i => linhaDeCompra(E, i)).join('')
    : aba === 'estilhaco'
      ? painelDoEstilhaco(E)
      : aceita(PACK).map(i => linhaDeVenda(E, i)).join('');

  alvo.innerHTML = `
    <div class="ljTopo">
      ${/* ── O SALDO É O DA ABA, E NÃO O DA LOJA ────────────────────────
            O topo mostrava sempre a moeda do PvE, e a aba do Estilhaço gasta
            ESSÊNCIA. O jogador via um saldo, clicava, e gastava outro — e não
            tinha como saber quanto do que ele estava gastando ainda restava.

              > Mostrar o saldo errado é pior que não mostrar saldo: ele não
              > avisa que não sabe, e o jogador confia. */
        aba === 'estilhaco'
        ? `<span class="ljSaldo">${essenciaDe(E)}<u>✦</u><em>Essência</em></span>`
        : `<span class="ljSaldo">${moedas(E)}<u>${PACK.moedaPve?.simbolo ?? ''}</u>` +
          `<em>${NOME_MOEDA()}</em></span>`}
      <span class="ljAbas">
        <button class="ljAba${aba === 'comprar' ? ' on' : ''}" data-loja-aba="comprar">Comprar</button>
        <button class="ljAba${aba === 'vender' ? ' on' : ''}" data-loja-aba="vender">Vender</button>
        <button class="ljAba${aba === 'estilhaco' ? ' on' : ''}" data-loja-aba="estilhaco">Estilhaço</button>
      </span>
    </div>
    ${recado ? `<p class="ljRecado">${recado}</p>` : ''}
    <div class="ljLista">${lista}</div>`;
  const b = $('#lojaFala');
  if (b) b.textContent = fala;
  return true;
}

/* ── ABRIR E FECHAR ──────────────────────────────────────────────────── */
export function abrirLoja() {
  const cx = $('#lojaCaixa');
  if (!cx) return false;
  aba = 'comprar';
  recado = '';
  fala = falaSorteada();
  cx.hidden = false;
  pintarLoja();
  /* O SOM É LIGADO NO GESTO QUE ABRE. Um clique autoriza o áudio; o `muted` do
     HTML existe só para o autoplay não ser recusado. */
  const v = $('#lojaVideo');
  if (v) { v.muted = false; v.currentTime = 0; v.play?.().catch(() => {}); }
  return true;
}

export function fecharLoja() {
  const cx = $('#lojaCaixa');
  if (!cx) return false;
  cx.hidden = true;
  /* EMUDECE E PARA. Regra do dono: *"ao fechar o som não é permitido ouvir, em
     aba alguma do site"*. Pausar sem emudecer deixaria o som voltar sozinho no
     dia em que alguém desse `play` por outro caminho. */
  const v = $('#lojaVideo');
  if (v) { v.muted = true; v.pause?.(); }
  return true;
}

let ligado = false;
export function ligarLoja() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', ev => {
    if (ev.target.closest('[data-loja-abrir]')) { abrirLoja(); return; }
    if (ev.target.closest('[data-loja-fechar]')) { fecharLoja(); return; }

    const a = ev.target.closest('[data-loja-aba]');
    if (a) { aba = a.dataset.lojaAba; recado = ''; pintarLoja(); return; }

    const c = ev.target.closest('[data-comprar]');
    if (c) return trocar('comprar', c.dataset.comprar, Number(c.dataset.n));

    const v = ev.target.closest('[data-vender]');
    if (v) return trocar('vender', v.dataset.vender, Number(v.dataset.n));

    const e = ev.target.closest('[data-estilhacar]');
    if (e) return estilhacar(e.dataset.estilhacar);

    const mt = ev.target.closest('[data-montar]');
    if (mt) return montarItem(mt.dataset.montar);
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !$('#lojaCaixa')?.hidden) fecharLoja();
  });
}

/* ── A TROCA ─────────────────────────────────────────────────────────────
 *
 * A recusa do motor vira RECADO na tela, e não um alerta que some. A loja é o
 * único lugar do jogo onde o jogador vê o saldo cair, e uma recusa sem
 * explicação ali é o D-067 na porta do dinheiro. */
function trocar(qual, id, n) {
  const E = lerEstado();
  if (!E) return;
  try {
    const r = qual === 'comprar'
      ? comprar(E, { pack: PACK, id, quantos: n })
      : vender(E, { pack: PACK, id, quantos: n });
    gravar(r.estado);
    recado = qual === 'comprar'
      ? `Levou ${r.levou} × ${nomeDoItem(PACK, id)} por ${r.gasto}.`
      : `Vendeu ${r.deu} × ${nomeDoItem(PACK, id)} por ${r.recebeu}.`;
    aoMudar();
  } catch (e) {
    recado = e.message;
  }
  pintarLoja();
}

/* O que a loja paga por um item — exportado para a mochila poder mostrar o
   valor sem abrir a loja. Uma peça de informação que só existe atrás de um
   clique é uma peça que metade dos jogadores nunca vê. */
export const quantoVale = id => precoDeVenda(PACK, id);
