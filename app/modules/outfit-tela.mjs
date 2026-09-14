/* A ABA DE OUTFITS — o guarda-roupa de farm.
 *
 * ── A PRÉVIA É O RETRATO, E NÃO O SPRITE ANDANDO ──────────────────────────
 *
 * A primeira versão desta aba animava a folha de nove quadros dentro de cada
 * cartão. A ideia era mostrar o que a esteira produz. O dono desmontou o
 * argumento em duas frases, e ele estava certo:
 *
 *   "realmente existe a necessidade de ver o movimento ali? Acredito que não,
 *    movimento basicamente quando acharmos um ponto legal, será meio que
 *    padrão, o que pode mudar depois são detalhes"
 *
 * O ANDAR É O MESMO EM TODOS OS TRAJES. Mostrá-lo na hora de escolher não
 * distingue nada — e custava caro: uma arte de 683 px reduzida a um selo de
 * 78 px, para animar uma diferença que não existe.
 *
 * O que muda de um traje para outro é a ROUPA, e roupa se lê parada e em alta.
 * O cartão passou a mostrar o retrato: a arte original, sem fundo, em 320 px.
 * A folha continua existindo e continua sendo o que anda no mundo — que é onde
 * o movimento de fato importa.
 *
 * Um efeito colateral que vale registrar: sem laço, a aba não custa quadro
 * nenhum. Com dezessete trajes na tela, isso deixou de ser detalhe.
 *
 * ── O QUE ESTA ABA NÃO FAZ ────────────────────────────────────────────────
 *
 * Ela não decide POSSE. Quem responde "tem ou não tem" é o `outfit-acervo.mjs`,
 * e hoje a vitrine responde que sim para tudo enquanto o dono testa. Deixar a
 * decisão aqui seria escrever a regra na tela — e no dia da loja a tela é o
 * último lugar onde alguém iria procurá-la.
 */
import { ACERVO, vestiveis, bloqueados, carregar, vestir } from './outfit-acervo.mjs';

const $ = s => document.querySelector(s);

/* O RÓTULO DIZ DE ONDE VEIO, e ele aparece mesmo hoje, com tudo liberado.
   Um traje que o jogador vai ter de comprar ou farmar precisa PARECER isso
   desde já — inclusive para o dono, que é quem decide a separação. */
const ROTULOS = {
  padrao: 'inicial', loja: 'loja', fragmento: 'baú',
  missao: 'missão', npc: 'NPC',
};
const rotulo = p => ROTULOS[p] ?? p;

function cartao(o, { trancado, vestido }) {
  const el = document.createElement('button');
  el.className = 'outfit-cartao' + (vestido ? ' on' : '') + (trancado ? ' off' : '');
  el.dataset.id = o.id;
  el.type = 'button';
  el.innerHTML =
    `<span class="outfit-palco"><img class="outfit-arte" src="${o.retrato}" alt=""></span>` +
    `<span class="outfit-nm">${o.nome}</span>` +
    `<span class="outfit-nota">${o.nota ?? ''}</span>` +
    `<span class="outfit-tag t-${o.procedencia}">${rotulo(o.procedencia)}</span>`;
  return el;
}

export function renderOutfits() {
  const grade = $('#outfitGrade');
  if (!grade) return;
  const estado = carregar();
  const abertos = vestiveis(estado);

  grade.textContent = '';
  for (const o of abertos)
    grade.appendChild(cartao(o, { trancado: false, vestido: o.id === estado.vestido }));

  /* A VITRINE DO QUE AINDA NÃO SE TEM. Hoje ela fica vazia porque tudo está
     liberado para o dono testar; o bloco existe para que o dia em que ela
     encher não seja uma surpresa de arranjo. */
  const tranc = bloqueados(estado).filter(o => !abertos.includes(o));
  const cx = $('#outfitTrancados');
  if (cx) {
    cx.textContent = '';
    if (tranc.length) {
      const t = document.createElement('div');
      t.className = 'sec-t'; t.style.marginTop = '14px';
      t.textContent = 'Ainda trancados';
      cx.appendChild(t);
      const g2 = document.createElement('div');
      g2.className = 'outfit-grade';
      for (const o of tranc) g2.appendChild(cartao(o, { trancado: true, vestido: false }));
      cx.appendChild(g2);
    }
  }

  grade.onclick = e => {
    const b = e.target.closest('.outfit-cartao');
    if (!b || b.classList.contains('off')) return;
    vestir(carregar(), b.dataset.id);
    renderOutfits();
    /* O farm relê a folha na próxima vez que desenhar o ator. Mandar recarregar
       daqui exigiria que a aba de rotas já existisse, e ela pode nem ter sido
       aberta ainda. */
    document.dispatchEvent(new CustomEvent('outfit:trocado', { detail: b.dataset.id }));
  };
}

export function ligarAba() {
  document.querySelectorAll('#profileModal .tab').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.pane === 'paneOutfit') renderOutfits();
    });
  });
}

export const _paraTeste = { ROTULOS, ACERVO };
