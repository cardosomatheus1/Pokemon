/* A TELA DO FOCO (bloco 1.16, camada 4).
 *
 * ── O QUE ESTA TELA PRECISA FAZER, E NÃO É "OFERECER CINCO BOTÕES" ───────
 *
 * O foco é a única coisa da criatura que sai do jogador — potencial é sorte,
 * nível é tempo. Uma escolha que o jogador faz sem entender não é escolha: é um
 * sorteio com o dedo dele.
 *
 * Então a tela tem três obrigações, e a terceira é a que quase sempre se perde:
 *
 *   1. DIZER O QUE MUDA, em número e em português — não "melhora o farm"
 *   2. DIZER O CUSTO junto do ganho, na mesma linha e com o mesmo destaque
 *   3. DIZER O QUE ELA VAI PAGAR ANTES de ela pagar — 48 h de descanso na
 *      troca, escrito no botão, e não numa recusa depois do clique
 *
 * A terceira é o D-067 outra vez, e é a lição que este projeto mais repetiu:
 * *a recusa depois de clicar é a pior forma de ensinar uma regra.*
 *
 * ── E O GUIA PRECISA DE UM AVISO PRÓPRIO ─────────────────────────────────
 *
 * Ele é o único foco que NÃO FUNCIONA SOZINHO. Um jogador que escolhe Guia na
 * primeira criatura e a manda sozinha vai ver zero de diferença e concluir,
 * corretamente, que o jogo mentiu. A tela avisa antes, e o cartão dele diz
 * "sozinho, não faz nada" com todas as letras.
 *
 * Não é conforto: é a diferença entre um foco de suporte e um foco quebrado.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { estiloIcone } from './icones.mjs';
import { dexImg } from './sprites.mjs';
import {
  FOCOS, EFEITO, NIVEL_PARA_ESCOLHER, HORAS_DE_TROCA,
  podeEscolher, descansando, faltaDoDescanso, escolher,
} from '../../engine/foco.mjs';

/* A FALA mora em `foco-fala.mjs` desde o item 1 da ordem do dono — ela é DADO,
   e este arquivo é janela. Reexportada porque o nome pelo qual cinco arquivos a
   conhecem é este. Ver o cabeçalho de lá. */
export { FALA } from './foco-fala.mjs';
import { FALA } from './foco-fala.mjs';


const pct = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

/* O que a linha do foco promete, em frases curtas. Ganho e custo saem da MESMA
   tabela e vão lado a lado: separar os dois é como um foco vira "bônus". */
export function linhasDe(id) {
  const e = EFEITO[id] ?? {};
  const out = [];
  if (e.encontros) out.push({ bom: e.encontros > 0, txt: `${pct(e.encontros)} de encontros` });
  if (e.garantido)  out.push({ bom: true,  txt: `${e.garantido} raro garantido por expedição` });
  if (e.vies)       out.push({ bom: e.vies > 0, txt: `${e.vies > 0 ? 'mais' : 'menos'} chance de raro` });
  if (e.material)   out.push({ bom: e.material > 0, txt: `${pct(e.material)} de material` });
  if (e.itemRaro)   out.push({ bom: e.itemRaro > 0, txt: `${pct(e.itemRaro)} de item raro` });
  if (e.aliados)    out.push({ bom: true, txt: `${pct(e.aliados)} de encontros para os OUTROS` });
  return out;
}

let aberta = null;          // id da criatura em escolha, ou null
let aoAplicar = null;       // callback dado por quem abriu

export const estaAberta = () => aberta;

export function abrir(idCriatura, aplicar) {
  aberta = idCriatura;
  aoAplicar = aplicar;
  pintar();
}

export function fechar() {
  aberta = null;
  const cx = $('#focoCaixa');
  if (cx) cx.hidden = true;
}

/* Quem a tela está editando. Recebe a lista por parâmetro em vez de importar o
   estado: a tela do foco não precisa saber o que é `localStorage`, e assim ela
   é desenhável num teste sem save nenhum. */
let listaDeCriaturas = () => [];
export const usarCriaturas = fn => { listaDeCriaturas = fn; };

const achar = id => (listaDeCriaturas() ?? []).find(c => c.id === id) ?? null;

/* ── QUANTO FALTA, EM PALAVRA DE GENTE ─────────────────────────────────────
   "descansando até 1788379200000" não é informação. Horas e minutos são. */
export function faltaEmPalavra(ms) {
  const min = Math.ceil(ms / 60000);
  if (min <= 0) return 'já pode';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function pintar(agora = Date.now()) {
  const cx = $('#focoCaixa');
  if (!cx) return;
  if (!aberta) { cx.hidden = true; return; }

  const c = achar(aberta);
  if (!c) { fechar(); return; }

  const esp = (PACK.especies ?? []).find(e => e.dex === c.dex) ?? { n: '?', dex: c.dex };
  const est = estiloIcone(PACK, c.dex, 52);
  const arte = est ? `<i class="focoArte" style="${est}"></i>`
                   : dexImg(c.dex, esp.n, 'class="focoArteImg"');

  const r = podeEscolher(c, agora);
  const trocando = !!c.foco;

  /* ── O CABEÇALHO DIZ O ESTADO ANTES DE OFERECER QUALQUER BOTÃO ──────────
     Três estados, e cada um com o número que o explica. Um "não disponível"
     sem número é o D-067 de volta. */
  let aviso = '';
  if (r.motivo === 'nivelBaixo')
    aviso = `<p class="focoAviso">Falta <b>${r.falta}</b> ${r.falta === 1 ? 'nível' : 'níveis'} — ` +
            `o foco abre no <b>nível ${NIVEL_PARA_ESCOLHER}</b>, junto com o estágio 2. ` +
            `Até lá dá para ver o que cada um faz.</p>`;
  else if (r.motivo === 'descansando')
    aviso = `<p class="focoAviso">Reaprendendo — falta <b>${faltaEmPalavra(faltaDoDescanso(c, agora))}</b>. ` +
            `Quem troca de foco fica ${HORAS_DE_TROCA} h fora de campo.</p>`;
  else if (trocando)
    aviso = `<p class="focoAviso focoCusto">Trocar custa <b>${HORAS_DE_TROCA} h</b> sem ir a campo. ` +
            `A primeira escolha é de graça; a troca, não.</p>`;
  else
    aviso = `<p class="focoAviso">A primeira escolha é <b>de graça</b>, e ela espera: ` +
            `dá para deixar sem foco o tempo que quiser.</p>`;

  const cartoes = FOCOS.map(id => {
    const f = FALA[id];
    const atual = c.foco === id;
    const linhas = linhasDe(id).map(l =>
      `<li class="${l.bom ? 'bom' : 'ruim'}">${l.txt}</li>`).join('');
    return `
      <button class="focoCartao${atual ? ' atual' : ''}" data-foco="${id}"
              style="--corFoco:${f.cor}" ${r.pode || atual ? '' : 'disabled'}>
        <b class="focoNome">${f.nome}</b>
        <span class="focoOnde">${f.onde}</span>
        <span class="focoResumo">${f.resumo}</span>
        <ul class="focoLinhas">${linhas}</ul>
        <span class="tiny focoDet">${f.detalhe}</span>
        ${atual ? '<span class="focoAtual">é o atual</span>' : ''}
      </button>`;
  }).join('');

  cx.hidden = false;
  cx.innerHTML = `
    <div class="focoJanela" role="dialog" aria-label="escolher o foco">
      <div class="focoTopo">
        ${arte}
        <span class="focoQuem">
          <b>${nomeExibido(esp.n)}</b>
          <span class="tiny">NV ${Math.floor(c.nivel ?? 1)}${
            c.foco ? ` · foco ${FALA[c.foco]?.nome ?? c.foco}` : ' · sem foco'}</span>
        </span>
        <button class="focoX" data-foco-fechar="1" aria-label="fechar">×</button>
      </div>
      ${aviso}
      <div class="focoGrade">${cartoes}</div>
    </div>`;
}

/* ── A LIGAÇÃO ────────────────────────────────────────────────────────────
 *
 * Delegado no documento, como as outras abas: um `addEventListener` por cartão
 * seria refeito a cada redesenho, e sobreviveria ao redesenho errado uma hora.
 */
let ligado = false;
export function ligar() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', ev => {
    if (!aberta) return;
    if (ev.target.closest('[data-foco-fechar]')) { fechar(); return; }

    const b = ev.target.closest('.focoCartao[data-foco]');
    if (!b || b.disabled) return;
    const c = achar(aberta);
    if (!c) return;

    const id = b.dataset.foco;
    if (c.foco === id) { fechar(); return; }   // reconfirmar não cobra nada

    let novo;
    try { novo = escolher(c, id, Date.now()); }
    catch { return; }                          // a recusa já está escrita na tela
    if (typeof aoAplicar === 'function') aoAplicar(novo);
    fechar();
  });
}
