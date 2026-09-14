/* A POKÉDEX (bloco 1.20, camada 4).
 *
 * ── A REFERÊNCIA, E O QUE FOI FEITO COM ELA ──────────────────────────────
 *
 * O dono mandou a folha do Black/White e disse para não me limitar a criar se
 * copiar servir. A composição dela é boa e foi usada como matéria-prima:
 *
 *     LISTA à esquerda, rolável, com número e nome
 *     FICHA à direita, com o retrato grande
 *     BUSCA por cima, com filtros
 *
 * Não é cópia porque o CONTEÚDO é outro, e a diferença tem nome:
 *
 *     A Pokédex do cartucho diz o que a criatura É.
 *     A nossa diz também ONDE ELA MORA E COMO PEGÁ-LA.
 *
 * Peso, altura e texto de enciclopédia não mudam decisão neste jogo. O que muda
 * é *em que bioma, em que estágio, com que raridade, e quantos fragmentos me
 * faltam* — e isso o cartucho não tem.
 *
 * ── O QUE NÃO FOI VISTO É SILHUETA, E ISSO NÃO É ENFEITE ─────────────────
 *
 * A entrada de uma espécie não encontrada mostra a silhueta e `???`. É o
 * costume da série, e ele serve a uma função real aqui: **a Pokédex é a escada
 * das vagas e do teto de encontros** (1.19). Mostrar tudo desde o começo mataria
 * a escada; esconder tudo esconderia o objetivo. A silhueta mostra que existe
 * sem dizer o quê — que é exatamente o convite.
 *
 * ── O MUNDO É GBA, A INTERFACE É NEON ────────────────────────────────────
 *
 * O retrato é sprite animado, pixel, sem suavização. A moldura em volta é
 * neon: cantoneiras, varredura, vidro. A fronteira entre os dois é dura de
 * propósito — é a mesma regra que já governa a cena do idle, e é o que impede a
 * peça de parecer colada.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { retratoAnimado, dexImg } from './sprites.mjs';
import { carregar } from './idle-dados.mjs';
import {
  STATS, tetoDeStat, somaDeStats, ondeMora, linhaComExigencia,
  falaDaExigencia, filtrar, progresso, capturados, vistosDe,
} from './pokedex-dados.mjs';
import { nomesDe } from './itens-nome.mjs';
import { corDa, daFaixa, estiloDa, classeDa } from './raridade.mjs';

const nomeDoRegistro = () => PACK.rotulos?.registro ?? 'registro';
const nomeDoTipo = t => PACK.tipos?.nomes?.[t] ?? t;
const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? null;

/* AS CORES DAS FAIXAS MORAM EM `raridade.mjs` (1.23). Esta tela tinha a
   PRÓPRIA tabela, e a prévia da rota e o cartão do encontro tinham as delas —
   três, e as três discordavam. A mais rara chegava a mudar de faixa com o
   tema. Ver o cabeçalho de `raridade.mjs`. */
export { RARIDADE, corDa, estiloDa, classeDa } from './raridade.mjs';


let busca = '';
let escolhido = null;
/* ── A POKÉDEX LÊ O SAVE SOZINHA, E NÃO DEPENDE DE OUTRA ABA ──────────────
 *
 * A primeira versão só sabia do estado que o `idle-tela` lhe entregava — e o
 * `idle-tela` só carrega o save quando a aba das Rotas é aberta. Resultado:
 * abrir a Pokédex direto, numa aba nova, mostrava **0 de 146** com o registro
 * cheio no armazenamento.
 *
 *     Uma tela que depende de outra ter sido visitada é uma tela que mente
 *     para quem entrou pela porta errada — e o jogador não sabe que existem
 *     portas certas.
 *
 * Pego pela captura, e não por teste: a suíte abria a aba do idle antes. É a
 * segunda metade do Q5 fazendo o trabalho dela.
 *
 * O padrão passa a ser LER O SAVE. O `idle-tela` continua podendo trocar por
 * uma leitura ao vivo — assim a Pokédex acompanha uma colheita feita com ela
 * aberta —, mas a ausência dessa troca não quebra mais nada. */
let lerEstado = () => carregar();
export const usarEstado = fn => { lerEstado = fn; };

/* `vistosDe` mora em `pokedex-dados.mjs` (camada 0), junto do `capturados`:
   a regra "ter é uma forma de ter visto" precisa de teste sem navegador. */

/* ── A LISTA ──────────────────────────────────────────────────────────────
 *
 * O ícone de cabeça — o MESMO das outras três telas. Quarto lugar, e essa
 * repetição é a vantagem: o jogador aprende o símbolo uma vez. */
/* ── O SELO DA POKÉBOLA: VISTO NÃO É CAPTURADO ────────────────────────────
 *
 * Ideia do dono. O fragmento cai no ENCONTRO, então ver é barato; ter a
 * criatura custa bola e sorte. Até aqui a Pokédex desenhava as duas conquistas
 * igual — e **duas conquistas diferentes desenhadas igual é uma conquista
 * perdida**.
 *
 * A bola GIRA, e não é um gif: é uma tira de 24 quadros animada por `steps()`.
 * O gif original tem 5,71 MB e 516 px, e apareceria como selo de 20 px em até
 * 146 linhas ao mesmo tempo. Ver `tools/folha-pokebola.mjs`. */
function linhaDaLista(e, viu, sel, pegou) {
  const est = viu ? estiloIcone(PACK, e.dex, 26) : null;
  const num = String(e.dex).padStart(3, '0');
  return `
    <button class="pdxLinha${sel ? ' on' : ''}${viu ? '' : ' oculto'}" data-dex="${e.dex}">
      <span class="pdxNum">${num}</span>
      <span class="pdxMini">${est ? `<i style="${est}"></i>` : '<u>?</u>'}</span>
      <span class="pdxNome">${viu ? nomeExibido(e.n) : '???'}</span>
      ${pegou ? '<i class="pdxBola" title="você já capturou esta espécie"></i>' : ''}
    </button>`;
}

/* ── A FICHA ──────────────────────────────────────────────────────────── */
function ficha(e, estado) {
  const viu = vistosDe(estado).has(e.dex);
  const pegou = capturados(estado).has(e.dex);
  const fragmentos = estado?.registro?.[e.dex] ?? 0;
  const num = String(e.dex).padStart(3, '0');

  if (!viu) {
    /* SILHUETA. O retrato existe e é escondido por filtro, e não substituído por
       um bloco cinza: a forma do bicho é a pista, e apagá-la tiraria o convite. */
    return `
      <div class="pdxFicha naoVista">
        <div class="pdxArte silhueta">${dexImg(e.dex, e.n, 'class="pdxSprite"')}</div>
        <h4 class="pdxTitulo"><b>???</b><em>Nº ${num}</em></h4>
        <p class="pdxVazio">Ainda não encontrada. Ela aparece em alguma rota —
          encontre-a em campo e a ficha se abre.</p>
      </div>`;
  }

  const teto = tetoDeStat(PACK);
  const barras = STATS.map(s => {
    const v = e.s?.[s.i] ?? 0;
    return `
      <span class="pdxStat" title="${s.longo}: ${v}">
        <u>${s.curto}</u>
        <i><b style="width:${Math.max(3, (v / teto) * 100).toFixed(1)}%"></b></i>
        <s>${v}</s>
      </span>`;
  }).join('');

  const casas = ondeMora(PACK, e.dex);
  const onde = casas.length
    ? casas.map(c => `
        <span class="pdxCasa ${classeDa(c.raridade)}" style="${estiloDa(c.raridade)}">
          <b>${c.rotulo}</b>
          <em>${daFaixa(c.raridade).rotulo}</em>
          ${c.desde > 1 ? `<s>estágio ${c.desde}+</s>` : ''}
        </span>`).join('')
    : '<p class="tiny">Não aparece em rota nenhuma — só por evolução.</p>';

  const linha = linhaComExigencia(PACK, e.dex);
    /* O NOME DO ITEM, E NAO O ID (1.22). Sem o resolvedor, a seta escrevia
     `firestone` — id cru na tela nao e um nome faltando: e um nome ERRADO,
     porque quem le acha que aquilo e o nome. Mesma falta que derrubou a aba
     de Rotas pela outra porta; ver `itens-nome.mjs` e o D-074. */
  const oNome = nomesDe(PACK);
  const exigencia = passo => falaDaExigencia(passo?.exige, oNome);

  const evo = linha.length > 1
    ? linha.map((no, i) => {
        const q = esp(no.dex);
        const est = estiloIcone(PACK, no.dex, 34);
        const eu = no.dex === e.dex;
        return `
          ${i ? `<i class="pdxSeta" title="${exigencia(linha[i - 1]) ?? ''}">
                   <s>${exigencia(linha[i - 1]) ?? '?'}</s></i>` : ''}
          <span class="pdxElo${eu ? ' eu' : ''}" title="${nomeExibido(q?.n ?? '?')}">
            ${est ? `<u style="${est}"></u>` : ''}
            <b>${nomeExibido(q?.n ?? '?')}</b>
          </span>`;
      }).join('')
    : '<p class="tiny">Não evolui.</p>';

  const tipos = (e.t ?? []).map(t =>
    `<span class="pdxTipo t-${t}">${nomeDoTipo(t)}</span>`).join('');

  return `
    <div class="pdxFicha">
      <div class="pdxArte">${retratoAnimado(e, 'class="pdxSprite"', false)}</div>
      <h4 class="pdxTitulo"><b>${nomeExibido(e.n)}</b><em>Nº ${num}</em></h4>
      <div class="pdxTipos">${tipos}</div>

      <div class="pdxBloco">
        <h5>Onde mora</h5>
        <div class="pdxCasas">${onde}</div>
      </div>

      <div class="pdxBloco">
        <h5>Forma <s class="pdxSoma">soma ${somaDeStats(e)}</s></h5>
        <div class="pdxStats">${barras}</div>
      </div>

      <div class="pdxBloco">
        <h5>Linha evolutiva</h5>
        <div class="pdxEvo">${evo}</div>
      </div>

      <p class="pdxFrag">
        ${pegou ? '<i class="pdxBola grande"></i><b>Capturada.</b> ' : ''}
        <b>${fragmentos}</b> fragmento(s) — eles caem no <b>encontro</b>,
        e não na captura.</p>
    </div>`;
}

export function renderPokedex() {
  const alvo = $('#pdxLista');
  if (!alvo) return 0;
  const estado = lerEstado() ?? { registro: {} };
  const vistos = vistosDe(estado);
  const pegos = capturados(estado);
  const lista = filtrar(PACK, { busca, vistos });

  if (escolhido === null && lista.length) escolhido = lista[0].dex;

  alvo.innerHTML = lista.length
    ? lista.map(e => linhaDaLista(e, vistos.has(e.dex), e.dex === escolhido, pegos.has(e.dex))).join('')
    : `<p class="tiny">Nada com "${busca}". A busca lê o número, o tipo, e o
       nome — o nome só das que você já encontrou.</p>`;

  const p = progresso(PACK, vistos, pegos);
  const conta = $('#pdxConta');
  if (conta) conta.innerHTML =
    `<b>${p.vistos}</b> vistas · <b>${p.pegos}</b> capturadas de <b>${p.total}</b>` +
    `<i style="width:${p.pct.toFixed(1)}%"></i>` +
    `<u style="width:${p.pctPegos.toFixed(1)}%"></u>`;

  const cx = $('#pdxFicha');
  const alvoEsp = esp(escolhido);
  if (cx) cx.innerHTML = alvoEsp
    ? ficha(alvoEsp, estado)
    : `<p class="tiny">Escolha uma espécie na lista.</p>`;

  return lista.length;
}

let ligado = false;
export function ligarPokedex() {
  if (!ligado) {
    ligado = true;
    document.addEventListener('input', ev => {
      if (ev.target?.id !== 'pdxBusca') return;
      busca = ev.target.value;
      escolhido = null;
      renderPokedex();
    });
    document.addEventListener('click', ev => {
      const b = ev.target.closest('#viewPokedex [data-dex]');
      if (!b) return;
      escolhido = Number(b.dataset.dex);
      renderPokedex();
    });
  }
  renderPokedex();
}

/* A aba acorda no clique, como as outras. Mesmo padrão de propósito: três
   formas de acordar seriam três lugares para esquecer de acordar a quarta. */
document.addEventListener('click', ev => {
  if (ev.target.closest('.nav[data-view="viewPokedex"], [data-goto="viewPokedex"]'))
    setTimeout(ligarPokedex, 0);
});
