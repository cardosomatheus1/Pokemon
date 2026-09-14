/* Q1/Q2/Q5 · O LOG DA BATALHA (R2)
 *
 * ── O QUE FOI MEDIDO ANTES DE MEXER ────────────────────────────────────────
 *
 * Com a rodada viva no navegador, 1280×720, duas linhas no feed:
 *
 *     #log      scrollTop 0    scrollHeight 87  ===  clientHeight 87
 *     #ticker   scrollTop 0    scrollHeight 95   >   clientHeight 54
 *
 * O `log()` escrevia `logBox.scrollTop = logBox.scrollHeight`. O `#log` é
 * `overflow:visible` e `height:auto` — ele CRESCE com o conteúdo, então
 * `scrollHeight` nunca passa de `clientHeight` e não existe para onde rolar.
 * A atribuição é silenciosamente nula: não lança, não avisa, não faz nada.
 *
 * Quem rola é o `#ticker` em volta, e ninguém escrevia nele. Por isso o feed
 * ficava parado na PRIMEIRA linha enquanto a batalha corria — que é exatamente
 * o que o dono do projeto relatou.
 *
 * ── POR QUE ESTA SUÍTE MONTA UM DOM DE MENTIRA ─────────────────────────────
 *
 * Um teste de texto não pegaria este defeito, e é importante entender por quê:
 * a linha `logBox.scrollTop = logBox.scrollHeight` PARECE certa. Ela nomeia o
 * elemento do log, fala de rolagem, e está no lugar certo do arquivo. O que a
 * condena não está escrito nela — está na geometria do CSS a mil linhas dali.
 *
 * Só o comportamento acusa. Então esta suíte monta um DOM mínimo com a MESMA
 * geometria medida acima e chama o `log()` de verdade. É mais caro de escrever
 * que um `grep`, e é a única forma honesta de perguntar "o feed acompanha?".
 *
 * ── A SEGUNDA METADE DO PEDIDO ─────────────────────────────────────────────
 *
 * Rolar sozinho não pode atropelar quem rolou para cima de propósito. Quem
 * subiu para reler um golpe está LENDO; puxá-lo de volta ao fim a cada linha
 * nova torna o log ilegível justamente durante a luta, que é quando ele
 * importa. Daí os testes 2 e 3: o acompanhamento desliga ao subir e religa ao
 * voltar ao fim.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');

/* Geometria copiada da medição acima: o ticker fechado mostra duas linhas. */
const ALTURA_LINHA = 20;
const ALTURA_TICKER = 54;

/* ── O DOM de mentira ──────────────────────────────────────────────────────
 *
 * Reproduz só o que o `dom.mjs` e o `ticker.mjs` tocam, e reproduz a relação
 * que causa o defeito: o `#log` cresce (scrollHeight === clientHeight, nunca
 * rola) e o `#ticker` tem altura fixa (scrollHeight > clientHeight, rola).
 */
function montarDom() {
  const criarNo = () => {
    const n = {
      innerHTML: '', textContent: '', className: '', style: {},
      children: [], parentElement: null, scrollTop: 0,
      ouvintes: Object.create(null),
      appendChild(f) { this.children.push(f); f.parentElement = this; return f; },
      removeChild(f) { this.children.splice(this.children.indexOf(f), 1); return f; },
      addEventListener(t, f) { (this.ouvintes[t] ||= []).push(f); },
      disparar(t) { for (const f of this.ouvintes[t] || []) f({ target: this }); },
    };
    Object.defineProperty(n, 'firstChild', { get() { return n.children[0] ?? null; } });
    return n;
  };

  /* O navegador TRAVA `scrollTop` em `scrollHeight - clientHeight`, e isso não
     é detalhe: é o que faz `e.scrollTop = e.scrollHeight` significar "vá para o
     fim" em vez de um número absurdo. Sem o travamento o DOM de mentira
     aceitaria qualquer valor e o teste mediria outra coisa. */
  const travarScroll = n => {
    let v = 0;
    Object.defineProperty(n, 'scrollTop', {
      get: () => v,
      set: x => { v = Math.max(0, Math.min(x, n.scrollHeight - n.clientHeight)); },
    });
  };

  const log = criarNo();
  const ticker = criarNo();
  ticker.appendChild(log);

  const conteudo = () => log.children.length * ALTURA_LINHA;
  /* O `#log` cresce: as duas alturas andam juntas, logo não há rolagem. */
  Object.defineProperty(log, 'scrollHeight', { get: conteudo });
  Object.defineProperty(log, 'clientHeight', { get: conteudo });
  /* O `#ticker` é a caixa: o conteúdo passa da altura dela. */
  Object.defineProperty(ticker, 'scrollHeight', { get: conteudo });
  ticker.clientHeight = ALTURA_TICKER;
  ticker.offsetHeight = ALTURA_TICKER;
  travarScroll(log); travarScroll(ticker);

  log.estilo = { overflowY: 'visible' };
  ticker.estilo = { overflowY: 'hidden' };

  ticker.classList = {
    _s: new Set(),
    add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
    contains(c) { return this._s.has(c); },
    toggle(c, f) { const v = f === undefined ? !this._s.has(c) : f; v ? this.add(c) : this.remove(c); return v; },
  };

  const antes = {
    document: globalThis.document,
    getComputedStyle: globalThis.getComputedStyle,
    getSelection: globalThis.getSelection,
  };
  globalThis.document = {
    querySelector: sel => ({ '#log': log, '#ticker': ticker })[sel] ?? null,
    createElement: () => criarNo(),
  };
  globalThis.getComputedStyle = n => n.estilo ?? { overflowY: 'visible' };
  globalThis.getSelection = () => '';

  const fim = () => ticker.scrollHeight - ticker.clientHeight;
  const restaurar = () => { Object.assign(globalThis, antes); };
  return { log, ticker, fim, restaurar };
}

/* Cada teste precisa de um módulo NOVO: o `dom.mjs` guarda o `#log` no
   carregamento, e um módulo já em cache guardaria o DOM do teste anterior. A
   query serve só para furar o cache do carregador. */
let sequencia = 0;
const carregar = nome =>
  import(new URL(`../app/modules/${nome}?v=${++sequencia}`, import.meta.url).href);

export function suite() {
  const s = criarSuite('log');

  /* --- o feed acompanha a batalha --------------------------------------- */

  s.teste('o log rola a caixa que de fato rola, e não a que só cresce', async () => {
    const d = montarDom();
    try {
      const { log } = await carregar('dom.mjs');
      for (let i = 0; i < 20; i++) log(`golpe ${i}`);
      ok(d.fim() > 0, 'o cenário do teste não produziu rolagem nenhuma — a medição está errada');
      igual(d.ticker.scrollTop, d.fim(),
        'o ticker ficou parado no topo: o feed não acompanha a batalha');
    } finally { d.restaurar(); }
  });

  s.teste('quem rolou para cima para ler não é puxado de volta', async () => {
    const d = montarDom();
    try {
      const { log } = await carregar('dom.mjs');
      for (let i = 0; i < 20; i++) log(`golpe ${i}`);
      d.ticker.scrollTop = 0;          // o jogador subiu para reler um golpe
      d.ticker.disparar('scroll');
      log('golpe novo');
      igual(d.ticker.scrollTop, 0,
        'a linha nova arrancou o jogador da linha que ele estava lendo');
    } finally { d.restaurar(); }
  });

  s.teste('voltar ao fim religa o acompanhamento', async () => {
    const d = montarDom();
    try {
      const { log } = await carregar('dom.mjs');
      for (let i = 0; i < 20; i++) log(`golpe ${i}`);
      d.ticker.scrollTop = 0;
      d.ticker.disparar('scroll');
      d.ticker.scrollTop = d.fim();    // e voltou para o fim por conta própria
      d.ticker.disparar('scroll');
      log('golpe novo');
      igual(d.ticker.scrollTop, d.fim(),
        'voltar ao fim não religou o acompanhamento — o feed congelou de vez');
    } finally { d.restaurar(); }
  });

  /* O teto de linhas é anterior a este bloco. Está aqui porque o R2 mexe no
     `log()`, e quebrar o teto sem ninguém perceber deixaria a página crescendo
     sem limite durante uma sessão longa. */
  s.teste('o log continua descartando as linhas velhas', async () => {
    const d = montarDom();
    try {
      const { log } = await carregar('dom.mjs');
      for (let i = 0; i < 400; i++) log(`golpe ${i}`);
      ok(d.log.children.length <= 261,
        `o log guardou ${d.log.children.length} linhas — o teto de descarte caiu`);
    } finally { d.restaurar(); }
  });

  /* --- a caixa cresce ---------------------------------------------------- */

  s.teste('a caixa do log tem alça de redimensionamento', () => {
    const css = ler('../app/index.html');
    const bloco = css.match(/#ticker\.aberto\{[^}]*\}/);
    ok(bloco, 'a regra de `#ticker.aberto` sumiu do index.html');
    ok(/resize:\s*vertical/.test(bloco[0]),
      `a caixa aberta não é redimensionável: ${bloco[0]}`);
    /* `resize` só funciona com `overflow` diferente de `visible`. */
    ok(/overflow:\s*(auto|scroll)/.test(bloco[0]),
      `sem overflow rolável a alça do resize não aparece: ${bloco[0]}`);
  });

  s.teste('arrastar a alça não fecha a caixa', async () => {
    const d = montarDom();
    try {
      const { ligarTicker } = await carregar('ticker.mjs');
      ligarTicker(d.ticker);
      d.ticker.disparar('pointerdown');
      d.ticker.disparar('click');                       // abre
      ok(d.ticker.classList.contains('aberto'), 'o clique não abriu a caixa');

      d.ticker.disparar('pointerdown');                 // pega a alça
      d.ticker.offsetHeight = 420;                      // e arrasta para baixo
      d.ticker.disparar('click');                       // soltar a alça é um clique
      ok(d.ticker.classList.contains('aberto'),
        'soltar a alça fechou a caixa que o jogador acabou de aumentar');
    } finally { d.restaurar(); }
  });

  s.teste('o clique que só abre e fecha continua abrindo e fechando', async () => {
    const d = montarDom();
    try {
      const { ligarTicker } = await carregar('ticker.mjs');
      ligarTicker(d.ticker);
      d.ticker.disparar('pointerdown'); d.ticker.disparar('click');
      ok(d.ticker.classList.contains('aberto'), 'o primeiro clique não abriu');
      d.ticker.disparar('pointerdown'); d.ticker.disparar('click');
      ok(!d.ticker.classList.contains('aberto'), 'o segundo clique não fechou');
    } finally { d.restaurar(); }
  });

  /* A caixa nasceu com um `addEventListener` inline no `index.html`. Se ele
     voltar, passam a existir DOIS ouvintes de clique no mesmo elemento: o
     guardado e o cru, e o cru fecharia a caixa a cada arrasto da alça. */
  s.teste('o ticker é ligado pelo módulo, e não por ouvinte solto no index', () => {
    const html = ler('../app/index.html');
    ok(/ligarTicker\(\$\('#ticker'\)\)/.test(html),
      'o `ligarTicker()` não é chamado no boot com a caixa do log');
    ok(!/#ticker'\)\?\.addEventListener/.test(html),
      'voltou um ouvinte de clique solto no `#ticker`, ao lado do do módulo');
  });

  return s;
}
