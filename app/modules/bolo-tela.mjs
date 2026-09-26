/* O BOLO NA TELA — o cartão "quem faz mais abates?" (ST-12.6 · F2.3).
 *
 * Camada 4: pinta o que `bolo-dados.mjs` decide, fala com o servidor e mais
 * nada. Nenhuma conta mora aqui — ver o cabeçalho de `bolo-dados.mjs`.
 *
 *   NA APOSTA    quanto há em cada lutador, quanto pagaria se fechasse agora,
 *                as regras antes de entrar, e entrar / trocar / sair
 *   NO RESULTADO o que o bolo pagou ao lado do que o modelo dava (§6.6), e o
 *                que voltou para quem entrou — sem festa quando voltou menos
 *   SEM CONTA    uma frase: o bolo é entre jogadores
 *
 * O ESQUELETO É MONTADO UMA VEZ POR ESTADO, e a busca a cada 2 s só troca a
 * lista e a estimativa. Repintar o cartão inteiro roubaria o foco de quem está
 * digitando o valor — e o bolo se move justamente enquanto a pessoa decide.
 */
import { $ } from './dom.mjs';
import { S } from './estado.mjs';
import { api } from './api.mjs';
import { modoServidor, hidratar, saldo } from './banco.mjs';
import { atualizarSaldo } from './controles.mjs';
import { linhasDoBolo, textoDaEstimativa, textoDaLinha, textoDasRegras, erroDaEntrada,
         linhasDoResultado, textoDaMinhaPaga, textoDaLeitura, TEXTO_SEM_CONTA } from './bolo-dados.mjs';

const BUSCA_MS = 2000;
const E = { mercado: null, resultado: null, selecao: null, valor: 50, timer: null, msg: '',
            modo: null, rodada: null, tentativas: 0 };

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nomes = () => (S.fighters ?? []).map(f => f.n);

function parar() { if (E.timer) { clearInterval(E.timer); E.timer = null; } }

async function buscar() {
  const r = await api.get('/api/mercado');
  if (!r.ok || !r.corpo?.selecoes) return;
  if (E.mercado?.id !== r.corpo.id) { E.selecao = null; E.msg = ''; }
  E.mercado = r.corpo;
  pintarLista();
}

async function buscarResultado() {
  const r = await api.get('/api/mercado/resultado');
  /* O resultado é do bolo PAGO. Se a tela chegou ao fim antes do servidor
     pagar, tenta de novo algumas vezes — e nunca mostra o de outra rodada. */
  if (r.ok && r.corpo?.rodada && r.corpo.rodada === S.rodadaId) { E.resultado = r.corpo; pintarResultado(); return; }
  if (E.tentativas++ < 5) setTimeout(() => { if (E.modo === 'resultado') buscarResultado(); }, 1500);
}

function esqueleto(modo) {
  const corpo = $('#boloCorpo');
  if (!corpo || E.modo === modo) return;
  E.modo = modo;
  if (modo === 'semConta') corpo.innerHTML = `<p class="tiny boloSemConta">${esc(TEXTO_SEM_CONTA)}</p>`;
  else if (modo === 'aposta') corpo.innerHTML = `
    <div id="boloLista" role="list"></div>
    <div class="boloAcao">
      <input type="number" id="boloValor" min="1" step="10" value="${E.valor}" aria-label="valor no bolo">
      <button class="btn" id="btnBolo">Entrar no bolo</button>
      <button class="btn btnCancelarEscolha" id="btnBoloSair" hidden>Sair</button>
    </div>
    <div class="tiny boloEstim" id="boloEstim"></div>
    <details class="boloRegras" id="boloRegras"><summary>Regras do bolo</summary><ul id="boloRegrasLista"></ul></details>`;
  else if (modo === 'resultado') corpo.innerHTML = `<div id="boloResultado" class="boloResultado">
    <p class="tiny">apurando o bolo…</p></div>`;
}

function pintarLista() {
  const lista = $('#boloLista');
  if (!lista || !E.mercado) return;
  const est = linhasDoBolo(E.mercado, nomes(),
    E.selecao !== null ? { selecao: E.selecao, valor: E.valor } : {});
  $('#boloTopo').textContent = est.topo;
  lista.innerHTML = est.linhas.map(l => `
    <div class="boloLinha${l.minha ? ' minha' : ''}${l.total ? '' : ' vazia'}" role="listitem" data-sel="${l.selecao}" tabindex="0">
      <span class="bn">${esc(l.nome)}</span>
      <span class="bb"><i style="width:${Math.round(l.fatia * 100)}%"></i></span>
      <span class="bt">${esc(textoDaLinha(l))}</span>
    </div>`).join('');
  const minha = E.mercado.minha;
  $('#btnBolo').textContent = minha ? 'Trocar entrada' : 'Entrar no bolo';
  $('#btnBoloSair').hidden = !minha;
  const quem = E.selecao ?? minha?.selecao;
  const valor = E.selecao !== null ? E.valor : minha?.valor;
  $('#boloEstim').textContent = E.msg ||
    (quem !== undefined && quem !== null
      ? `${minha && E.selecao === null ? 'Sua entrada' : 'Entrada'}: ${valor} em ${nomes()[quem] ?? '?'} · ${textoDaEstimativa(est, valor) ?? ''}`
      : 'Toque num lutador para ver quanto o bolo pagaria.');
  const regras = $('#boloRegrasLista');
  if (regras && !regras.childElementCount)
    regras.innerHTML = textoDasRegras(E.mercado).map(t => `<li>${esc(t)}</li>`).join('');
  /* As regras ABREM quando o jogador escolhe alguém: é o "exibido antes" do
     §6.4 no momento em que ele importa, sem ocupar a coluna o tempo todo. */
  if (E.selecao !== null) $('#boloRegras').open = true;
}

function pintarResultado() {
  const box = $('#boloResultado');
  if (!box || !E.resultado) return;
  const r = linhasDoResultado(E.resultado, nomes());
  const minha = textoDaMinhaPaga(E.resultado.minha ?? {});
  $('#boloTopo').textContent = `bolo: ${r.bruto ?? 0}`;
  box.innerHTML = r.linhas.map(t => `<p class="boloRes">${esc(t)}</p>`).join('') +
    (minha ? `<p class="boloMinha ${minha.tom}">Você: ${esc(minha.texto)}</p>` : '') +
    (r.simulacoes ? `<p class="tiny">modelo: ${r.simulacoes} simulações, gravado antes da luta</p>` : '');
}

async function entrar() {
  const erro = erroDaEntrada({ selecao: E.selecao, valor: E.valor, saldo: saldo() });
  if (erro) { E.msg = erro; pintarLista(); return; }
  E.msg = 'entrando…'; pintarLista();
  const r = await api.post('/api/mercado/entrar', { selecao: E.selecao, valor: E.valor });
  E.msg = r.ok ? '' : (r.corpo?.erro ?? 'o servidor recusou');
  if (r.ok) { E.selecao = null; await hidratar(); atualizarSaldo(); }
  await buscar();
}

async function sair() {
  const r = await api.post('/api/mercado/sair', {});
  E.msg = r.ok ? '' : (r.corpo?.erro ?? 'o servidor recusou');
  if (r.ok) { await hidratar(); atualizarSaldo(); }
  await buscar();
}

function ligar(card) {
  if (card.dataset.ligado) return;
  card.dataset.ligado = '1';
  const escolher = alvo => {
    const l = alvo.closest?.('.boloLinha');
    if (!l) return false;
    E.selecao = Number(l.dataset.sel); E.msg = ''; pintarLista(); return true;
  };
  card.addEventListener('click', ev => {
    if (escolher(ev.target)) return;
    if (ev.target.id === 'btnBolo') entrar();
    else if (ev.target.id === 'btnBoloSair') sair();
  });
  card.addEventListener('keydown', ev => { if (ev.key === 'Enter') escolher(ev.target); });
  card.addEventListener('input', ev => {
    if (ev.target.id !== 'boloValor') return;
    E.valor = Math.floor(Number(ev.target.value));
    pintarLista();
  });
}

export function renderBolo() {
  const card = $('#cardBolo');
  if (!card) return;
  ligar(card);
  const apostando = S.state === 'betting', fim = S.state === 'result';
  card.hidden = !(apostando || fim);
  if (card.hidden) { parar(); return; }
  if (!modoServidor()) { parar(); esqueleto('semConta'); return; }
  if (apostando) {
    if (E.rodada !== S.rodadaId) { E.rodada = S.rodadaId; E.modo = null; E.resultado = null; }
    esqueleto('aposta');
    if (!E.timer) { buscar(); E.timer = setInterval(buscar, BUSCA_MS); }
  } else {
    parar();
    if (E.modo !== 'resultado') { E.tentativas = 0; esqueleto('resultado'); buscarResultado(); }
  }
}

/* A LEITURA NO PERFIL DA LIGA (ST-12.9). Pede ao servidor ao abrir a aba —
   é consulta rara, não precisa de busca periódica. */
export async function renderLeituraBolo() {
  const card = $('#cardLeituraBolo'), alvo = $('#leituraBolo');
  if (!card || !alvo) return;
  card.hidden = !modoServidor();
  if (card.hidden) return;
  const r = await api.get('/api/mercado/leitura');
  alvo.innerHTML = (r.ok ? textoDaLeitura(r.corpo) : ['A leitura não carregou agora.'])
    .map(t => `<p class="boloRes">${esc(t)}</p>`).join('');
}
