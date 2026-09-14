/* A LOJA DE POKÉCASH — a vitrine dos cosméticos (bloco 1.31, camada 4).
 *
 * Pedido do dono, e ele fechou o escopo inteiro numa frase:
 *
 *   > "no momento oportuno da criação da loja de PokéCash você fará a inclusão
 *   >  somente do homem de terno, e vai criar as abas da loja, outfits,
 *   >  banners, avatar, efeito de nome etc. FILTRE tudo que temos hoje de
 *   >  cosmético e você vai adicionar a essa loja"
 *
 * ── ELA É A PRIMEIRA PORTA DE RECEITA DO PROJETO ─────────────────────────
 *
 * E isso não muda o método — muda o custo do erro. O que ela vende é ARTE
 * NOSSA, e é por isso que ela pode cobrar sem mexer no equilíbrio de nada:
 *
 *   > Cosmético não é poder. O §P5 continua inteiro, e a loja não encosta nele.
 *
 * ── O NPC É O MESMO ARQUIVO, E O CORTE É QUE MUDA ────────────────────────
 *
 * `assets/npc/lojas.mp4` tem os dois no mesmo quadro, 1280×720. A loja PvE usa
 * `--foco:100%` (a moça da banca); esta usa `--foco:0%` (o homem de terno).
 * Um vídeo, duas lojas, zero recodificação — a técnica é do 1.25.
 *
 * ── E O QUE ELA NÃO FAZ, DE PROPÓSITO ────────────────────────────────────
 *
 * **Não existe porta de dinheiro real aqui.** O §25.1 é explícito nos dois
 * sentidos: a arquitetura pode ser construída e testada inteira com moeda
 * SIMULADA, e nenhuma feature de valor real é liberada só porque funciona
 * tecnicamente. Esta tela compra com o saldo que o jogo dá — e a própria tela
 * diz isso, para ninguém procurar um botão de recarga que não deve existir
 * ainda.
 */
import { $ } from './dom.mjs';
import { catalogo, ABAS } from './cosmeticos.mjs';
import { podeComprar, chaveDa, temNaConta, custoDaVitrine, aVendaNaVitrine }
  from '../../engine/vitrine.mjs';
import { saldo, travado, gastarEmCosmetico } from './banco.mjs';

/* O acervo do jogador. Ele entra e sai por fora, como em toda tela desta base:
   quem desenha não guarda, e quem guarda não desenha. */
let lerPosse = () => [];
let gravarPosse = () => {};
let aoMudar = () => {};

export function usarEstado({ ler, salvar, mudou }) {
  if (ler) lerPosse = ler;
  if (salvar) gravarPosse = salvar;
  if (mudou) aoMudar = mudou;
}

/* ── A ABA QUE ABRE É A PRIMEIRA COM ALGO À VENDA ───────────────────────
 *
 * A primeira versão abria na primeira aba da lista — Trajes — e o passo OLHAR
 * pegou na hora: **nenhum dos 9 trajes está à venda**, todos nascem `padrao`.
 * A loja abria numa vitrine de nove "SEU" e nada para comprar.
 *
 *   > Uma loja que abre numa prateleira vazia ensina, em um segundo, que não
 *   > há nada ali. Ele fecha antes de clicar na segunda aba.
 *
 * Calculada e não fixa: no dia em que um traje for à venda, ela volta a ser a
 * primeira sem ninguém mexer aqui. */
const primeiraComVenda = () => {
  const cat = catalogo();
  const cheia = ABAS.find(a =>
    cat.some(p => p.familia === a.familia && p.procedencia === 'loja'));
  return (cheia ?? ABAS[0])?.familia ?? 'outfit';
};

let aba = null;
let recado = '';

const num = n => Number(n ?? 0).toLocaleString('pt-BR');

/* ── A FALA DO VENDEDOR ──────────────────────────────────────────────────
 *
 * Ele é o de terno, e a voz dele é a oposta da banca de rua: a moça grita
 * "GAME COINS! RARE! HUSTLE!", e ele não grita nada. É a diferença que o
 * próprio vídeo já estabelece, e a escrita tem de acompanhar — senão os dois
 * NPCs são o mesmo personagem com roupas diferentes. */
export const FALAS = [
  'Nada aqui muda uma luta. Muda como você aparece nela.',
  'Tudo o que está nesta vitrine foi desenhado para este jogo.',
  'Leve o tempo que quiser. As peças não vão a lugar nenhum.',
  'O que se compra aqui é aparência. Vantagem não está à venda.',
];

export const falaSorteada = (falas = FALAS, sorte = Math.random) =>
  falas.length ? falas[Math.floor(sorte() * falas.length) % falas.length] : '';

let fala = '';

/* ── A FICHA DE UMA PEÇA ─────────────────────────────────────────────────
 *
 * Três estados, e cada um diz o que É em vez de só ficar cinza:
 *
 *     SEU        já comprado — e continua na vitrine, para ele ver a coleção
 *     À VENDA    com o preço, e o botão ligado ou desligado pelo saldo
 *     DE GRAÇA   veio com a conta, ou vem por missão. O caminho aparece.
 *
 * O terceiro é o que o D-067 ensinou: uma parede sem placa lê como o fim do
 * jogo. Uma peça que não se compra e não diz por onde vem é pior que ausente.
 */
/* ── A CARA DA PEÇA ──────────────────────────────────────────────────────
 *
 * O descritor vem de `cosmeticos.mjs` (camada 0, que não monta marcação) e
 * vira pixel aqui. Três formas, e a terceira é decisão e não desistência:
 * moldura e efeito são ANIMAÇÃO, e nenhum arquivo os representa. Um quadrado
 * parado mentiria mais sobre eles do que o glifo. */
function cara(p) {
  const a = p.arte;
  if (!a) return '<span class="lcCara vazia"></span>';
  if (a.tipo === 'img')
    return '<img class="lcCara" src="' + a.src + '" alt="" loading="lazy" ' +
           'onerror="this.onerror=null;this.style.opacity=.2">';
  if (a.tipo === 'cena')
    return '<span class="lcCara cn ' + a.classe + '"></span>';
  return '<span class="lcCara ico">' + (a.ico ?? '') + '</span>';
}

function ficha(p, posse, temSaldo) {
  const meu = temNaConta(posse, p);
  const daLoja = p.procedencia === 'loja';
  const podePagar = temSaldo >= p.preco;
  const classe = meu ? 'meu' : daLoja ? (podePagar ? '' : 'longe') : 'gratis';
  const acao = meu
    ? '<span class="lcSelo">seu</span>'
    : daLoja
      ? `<button class="btn lcComprar" data-cash-comprar="${chaveDa(p)}"
                 ${podePagar ? '' : 'disabled'}>${num(p.preco)}</button>`
      : `<span class="lcVia">${VIA[p.procedencia] ?? p.procedencia}</span>`;
  return `<div class="lcPeca ${classe}">
    ${cara(p)}
    <span class="lcNome">${p.nome}</span>
    ${acao}
  </div>`;
}

/* De onde vem o que não se compra. Dizer "não está à venda" e parar aí manda
   o jogador procurar um botão que não existe. */
const VIA = {
  padrao: 'já é seu',
  missao: 'por missão',
  fragmento: 'por fragmento',
  npc: 'de um personagem',
};

export function pintarCash() {
  const alvo = $('#cashCorpo');
  if (!alvo) return false;
  const cat = catalogo();
  aba ??= primeiraComVenda();
  const posse = lerPosse() ?? [];
  const disponivel = saldo();
  const daAba = cat.filter(p => p.familia === aba);

  /* Quanto falta para ter tudo: é a pergunta que o colecionador faz, e ela
     também é o número que o estudo da L-135 precisa para calibrar. Uma conta
     que responde as duas não precisa ser feita duas vezes. */
  const faltam = aVendaNaVitrine(cat).filter(p => !temNaConta(posse, p));
  const restante = faltam.reduce((a, p) => a + p.preco, 0);

  const abas = ABAS.map(a => {
    const n = cat.filter(p => p.familia === a.familia && p.procedencia === 'loja').length;
    return `<button class="lcAba${a.familia === aba ? ' on' : ''}"
                    data-cash-aba="${a.familia}" title="${a.sub}">
              ${a.rotulo}${n ? `<i>${n}</i>` : ''}
            </button>`;
  }).join('');

  const trancado = travado();
  alvo.innerHTML = `
    <div class="lcTopo">
      <span class="lcSaldo"><b>${num(disponivel)}</b><em>PokéCash</em></span>
      ${trancado > 0
        ? `<span class="lcTrancado" title="comprado não vira poder — mas compra cosmético">
             ${num(trancado)} comprado</span>`
        : ''}
      <span class="lcFalta">${faltam.length
        ? `faltam ${faltam.length} peça(s) · ${num(restante)}`
        : 'coleção completa'}</span>
    </div>
    <div class="lcAbas">${abas}</div>
    ${recado ? `<p class="lcRecado">${recado}</p>` : ''}
    <div class="lcGrade">${daAba.map(p => ficha(p, posse, disponivel)).join('')}</div>
    <!-- ── O AVISO DO §25.1, E ELE NÃO É LETRA MIÚDA ─────────────────────
         O dono pediu a loja declarada "em construção" até o checkpoint, e a
         Spec é explícita: nenhuma feature de valor real entra só porque
         funciona tecnicamente. Dizer isso na tela é o que impede o jogador de
         procurar um botão de recarga que não deve existir ainda. -->
    <p class="lcAviso">Em construção. O PokéCash aqui é <b>moeda simulada</b> —
       não há compra com dinheiro real, e não haverá antes do checkpoint
       econômico e regulatório.</p>`;
  const b = $('#cashFala');
  if (b) b.textContent = fala;
  return true;
}

export function abrirCash() {
  const cx = $('#cashCaixa');
  if (!cx) return false;
  recado = '';
  aba = primeiraComVenda();
  fala = falaSorteada();
  cx.hidden = false;
  pintarCash();
  /* O SOM É LIGADO NO GESTO QUE ABRE — mesma regra da loja PvE: um clique
     autoriza o áudio, e o `muted` do HTML existe só para o autoplay não ser
     recusado. */
  const v = $('#cashVideo');
  if (v) { v.muted = false; v.currentTime = 0; v.play?.().catch(() => {}); }
  return true;
}

export function fecharCash() {
  const cx = $('#cashCaixa');
  if (!cx) return false;
  cx.hidden = true;
  /* EMUDECE E PARA. Regra do dono: *"ao fechar o som não é permitido ouvir, em
     aba alguma do site"*. Pausar sem emudecer deixaria o som voltar sozinho. */
  const v = $('#cashVideo');
  if (v) { v.muted = true; v.pause?.(); }
  return true;
}

/* ── A COMPRA ────────────────────────────────────────────────────────────
 *
 * A ordem importa e é esta: PERGUNTA ao motor, DEBITA, e só então grava a
 * posse. Debitar antes de perguntar cobraria por uma recusa; gravar a posse
 * antes de debitar daria a peça de graça no dia em que o débito falhasse.
 *
 *   > Entre tirar o dinheiro e entregar a peça não pode existir um passo que
 *   > possa falhar sozinho.
 */
export function comprarPeca(chave) {
  const [familia, ...resto] = String(chave).split(':');
  const id = resto.join(':');
  const cat = catalogo();
  const posse = lerPosse() ?? [];
  const r = podeComprar(cat, { familia, id, posse, saldo: saldo() });
  if (!r.pode) { recado = r.motivo; pintarCash(); return r; }

  const pago = gastarEmCosmetico(r.peca.preco, 'loja:' + chave);
  if (!pago || pago.ok === false) {
    recado = pago?.motivo ?? 'a carteira recusou a compra';
    pintarCash();
    return { pode: false, motivo: recado };
  }

  gravarPosse([...posse, chaveDa(r.peca)]);
  recado = `${r.peca.nome} é seu.`;
  aoMudar();
  pintarCash();
  return { pode: true, peca: r.peca };
}

let ligado = false;
export function ligarCash() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', ev => {
    if (ev.target.closest('[data-cash-abrir]')) { abrirCash(); return; }
    if (ev.target.closest('[data-cash-fechar]')) { fecharCash(); return; }

    const a = ev.target.closest('[data-cash-aba]');
    if (a) { aba = a.dataset.cashAba; recado = ''; pintarCash(); return; }

    const c = ev.target.closest('[data-cash-comprar]');
    if (c) comprarPeca(c.dataset.cashComprar);
  });
}

/* Para o teste e para quem quiser abrir numa aba certa. */
export const abaAtual = () => aba;
export const irParaAba = f => { aba = f; recado = ''; };
export const totalDaVitrine = () => custoDaVitrine(catalogo());
