/* A WIKI DE ITENS (bloco 1.12, camada 4).
 *
 * O formato é o que o dono pediu, e ele foi específico sobre a simplicidade:
 *
 *   > "o formato da wiki, pode ser justamente no formato em que te passei PDF:
 *   >  ICONE/NOME ITEM/INFORMAÇÃO UTILIDADE pronto, básico e simples"
 *
 * Então é isso, e nada além: três colunas por linha. A busca existe porque a
 * lista tem quase quarenta itens e vai crescer — e uma lista que só se percorre
 * rolando deixa de ser consultável no dia em que passa de uma tela.
 *
 * ── E UMA QUARTA COLUNA QUE NÃO ESTAVA NO PEDIDO ─────────────────────────
 *
 * ONDE SE CONSEGUE. Ela entra porque o dono também escreveu, na L-092:
 *
 *   > "Onde cada item dropa? Onde pode ser vendido? Qual seu uso e utilidade?"
 *
 * São as três perguntas dele, e o PDF só responde a terceira. A wiki que
 * responde só "o que faz" manda o jogador procurar em outro lugar "onde acho" —
 * e o lugar onde ele procuraria não existe.
 *
 * A coluna é discreta de propósito: um selo de porta e, quando houver, o bioma
 * ou o andar. O item continua sendo o sujeito da linha.
 */
import { $ } from './dom.mjs';
import { PACK } from './motor.mjs';
import { estiloItem, usarCatalogo, temIcone } from './itens-icone.mjs';

usarCatalogo(PACK.catalogo);

/* Como cada porta se chama para quem joga. `dinheiro` não aparece porque
   nenhum item passa por ela — e se um dia passar, ele aparece com o nome certo
   em vez de silenciosamente. */
const FALA_DA_PORTA = {
  drop:     { nome: 'cai no farm',   cor: '#5efc8d' },
  troca:    { nome: 'troca',         cor: '#7ff0ff' },
  bau:      { nome: 'baú da Torre',  cor: '#a76bff' },
  loja:     { nome: 'loja',          cor: '#ffc107' },
  dinheiro: { nome: 'loja premium',  cor: '#ff5d6e' },
};

const nomeDoBioma = id => (PACK.biomas ?? []).find(b => b.id === id)?.rotulo ?? id;

/* ONDE SE CONSEGUE, em uma frase curta. A porta diz o método; o resto diz o
   endereço — e endereço sem método é uma pista, não uma resposta. */
function onde(i) {
  const p = FALA_DA_PORTA[i.porta] ?? { nome: i.porta, cor: 'var(--dim)' };
  const detalhe =
    i.porta === 'drop'  && i.fonte          ? ` · ${nomeDoBioma(i.fonte)}` :
    i.porta === 'troca' && i.custoEssencia  ? ` · ${i.custoEssencia} Essência` :
    i.porta === 'bau'   && i.andarMinimo    ? ` · andar ${i.andarMinimo}` :
    i.porta === 'loja'  && i.preco          ? ` · ${i.preco} PokéCoin` : '';
  return `<span class="wkPorta" style="--corPorta:${p.cor}">${p.nome}</span>` +
         `<span class="wkOnde">${detalhe}</span>`;
}

/* A busca casa NOME, NOME EM INGLÊS e o TEXTO da utilidade.
 *
 * O inglês entra porque metade do que se lê sobre estes itens fora do jogo está
 * nele — quem procura "Choice Band" tem de achar a "Faixa da Escolha". E o
 * texto entra porque a pergunta real quase nunca é o nome: é *"o que me dá
 * velocidade?"*, e a resposta está na descrição, não no título. */
const normal = s => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function filtrar(catalogo, busca) {
  const q = normal(busca).trim();
  if (!q) return catalogo ?? [];
  const termos = q.split(/\s+/);
  return (catalogo ?? []).filter(i => {
    const alvo = normal(`${i.nome} ${i.en ?? ''} ${i.texto} ${i.porta}`);
    return termos.every(t => alvo.includes(t));
  });
}

let busca = '';

export function renderWiki() {
  const alvo = $('#wikiLista');
  if (!alvo) return;
  const cat = PACK.catalogo ?? [];
  const lista = filtrar(cat, busca);

  const conta = $('#wikiConta');
  if (conta) conta.textContent = busca
    ? `${lista.length} de ${cat.length} itens`
    : `${cat.length} itens`;

  if (!lista.length) {
    alvo.innerHTML = `<p class="tiny">Nada com "${busca}". A busca lê o nome, o ` +
      `nome em inglês e o texto da utilidade.</p>`;
    return;
  }

  alvo.innerHTML = lista.map(i => {
    const est = estiloItem(i.id, 32);
    return `
      <div class="wkLinha">
        <span class="wkArte">${est ? `<i style="${est}"></i>` : '<u class="wkSemArte">?</u>'}</span>
        <span class="wkNome">
          <b>${i.nome}</b>
          ${i.en && i.en !== i.nome ? `<em>${i.en}</em>` : ''}
          ${i.usosPorRun ? `<s class="wkTeto">${i.usosPorRun} uso por run</s>` : ''}
        </span>
        <span class="wkTexto">${i.texto}</span>
        <span class="wkFonte">${onde(i)}</span>
      </div>`;
  }).join('');
}

export function ligarWiki() {
  const campo = $('#wikiBusca');
  if (campo && !campo.dataset.ligado) {
    campo.dataset.ligado = '1';
    campo.addEventListener('input', () => { busca = campo.value; renderWiki(); });
  }
  renderWiki();
}

/* A aba se liga sozinha, como a da Liga e a do idle: escuta o clique no menu.
   É o mesmo padrão de propósito — três abas com três formas de acordar seriam
   três lugares para esquecer de acordar a quarta. */
document.addEventListener('click', ev => {
  if (ev.target.closest('.nav[data-view="viewWiki"], [data-goto="viewWiki"]'))
    setTimeout(ligarWiki, 0);
});
