/* A ABA DA LIGA DE PREVISÃO (R37, Spec §6.8 e §6.9).
 *
 * ── O DESENHO CENTRAL, E POR QUE ELE NÃO É DOZE CAMPOS EM BRANCO ──────────
 *
 * A grade começa NA DISTRIBUIÇÃO DO MODELO, e o jogador a empurra. Pedir doze
 * probabilidades do zero seria um formulário de imposto de renda: ninguém
 * preenche, e quem preenche chuta.
 *
 * Mas a razão de verdade é outra, e vem da Spec: o §6.9 pede a tela "onde
 * discordou do modelo e quem estava certo". Partindo do modelo, a DISCORDÂNCIA
 * é a própria interação — cada clique é um "aqui eu acho que a casa errou", e
 * a tela consegue mostrar isso sem inventar uma comparação depois.
 *
 * Quem não mexer em nada registra exatamente o modelo. Isso é de propósito:
 * concordar é uma previsão legítima, e a nota dela vai ser a do modelo. A Liga
 * premia quem lê MELHOR que a casa, e empatar com a casa é o piso honesto.
 *
 * ── A NORMALIZAÇÃO É CONTÍNUA, E NÃO NO BOTÃO ────────────────────────────
 *
 * Os pesos são renormalizados a cada clique, então a soma é SEMPRE 1 e o botão
 * de registrar nunca precisa recusar por aritmética. Deixar o jogador montar um
 * palpite que soma 1,07 e só avisar no fim é fazê-lo refazer o trabalho — e a
 * recusa por soma existe na camada de dados como rede, não como fluxo.
 *
 * ── ESTA TELA NÃO SABE O QUE É DINHEIRO ──────────────────────────────────
 *
 * Nem saldo, nem aposta, nem carteira. A Liga foi antecipada da V5 para a V2
 * porque não move dinheiro; a aba precisa poder ser lida por qualquer um e
 * deixar isso óbvio. Ver o teste que afirma a ausência em `test/liga-local.mjs`.
 */

import { $ } from './dom.mjs';
import { S } from './estado.mjs';
import { nomeExibido } from './motor.mjs';
import { dexImg } from './sprites.mjs';
import { AMOSTRA_MINIMA } from '../../engine/calibracao.mjs';
import { carregar, historico, pontuar, registrar, resumo, salvar } from './liga-dados.mjs';

/* Quanto um clique move o peso de um lutador. 15% é grande o bastante para o
   jogador sentir que mexeu e pequeno o bastante para caber vários cliques antes
   de saturar — abaixo disso a grade vira um teste de paciência. */
const PASSO = 0.15;

let estado = null;          /* a temporada, carregada do disco uma vez */
let pesos = null;           /* os pesos em edição, ANTES de normalizar */
let rodadaEditada = null;   /* qual rodada os pesos acima descrevem */

const carregada = () => (estado ??= carregar());

/* A RODADA É IDENTIFICADA PELO COMMIT, e não por um contador.
 *
 * `S.commit` é público desde o início da rodada (§4.5) e é único por rodada —
 * é exatamente o que um identificador precisa ser. Um contador local
 * recomeçaria do zero a cada recarga da página, e duas rodadas diferentes
 * passariam a ter o mesmo id: a segunda seria recusada como "já previu". */
const rodadaAtual = () => S.commit || null;

/* A distribuição que a casa publicou. Soma 1 por construção — a suavização de
   Laplace do §4.4.1 garante isso — e é a linha de partida da grade. */
function distribuicaoModelo() {
  /* `lutadores`, e não `linhas`: é o nome que o `engine/preco.mjs` publica e
     que o `modo-servidor.mjs` traduz. A primeira versão inventou `linhas`, e o
     teste "as odds traduzidas têm TODO campo que o app lê" pegou isso antes de
     a tela rodar uma única vez — a Liga mostraria `undefined` no lugar da
     leitura da casa, e só no modo servidor. */
  const l = S.odds && Array.isArray(S.odds.lutadores) ? S.odds.lutadores : null;
  return l ? l.map(x => x.prob) : null;
}

function normalizar(p) {
  const soma = p.reduce((a, b) => a + b, 0);
  return soma > 0 ? p.map(v => v / soma) : p.map(() => 1 / p.length);
}

/* Os pesos em edição nascem do modelo, e RENASCEM quando a rodada troca. Sem o
   segundo cuidado, o jogador voltaria à aba na rodada seguinte com os empurrões
   da anterior ainda aplicados — a lutadores diferentes. */
function garantirPesos() {
  const id = rodadaAtual();
  const modelo = distribuicaoModelo();
  if (!id || !modelo) { pesos = null; rodadaEditada = null; return; }
  if (rodadaEditada !== id || !pesos || pesos.length !== modelo.length) {
    pesos = modelo.slice();
    rodadaEditada = id;
  }
}

/* ─── pontuar quando a rodada fecha ─────────────────────────────────────── */

/* Chamado pelo `resultado-tela.mjs` no `finish()`, que é onde o campeão passa a
   ser conhecido. A idempotência mora na camada de dados: chamar duas vezes é
   inofensivo por construção, e chamar é mais barato que verificar. */
export function pontuarFimDeRodada() {
  const id = rodadaAtual();
  if (!id || S.champ < 0) return;
  const e = carregada();
  const r = pontuar(e, {
    roundId: id, vencedor: S.champ, distribuicaoModelo: distribuicaoModelo(),
  });
  if (r.ok) { salvar(e); if ($('#viewLiga')?.classList.contains('on')) renderLiga(); }
}

/* ─── a tela ────────────────────────────────────────────────────────────── */

const pct = v => `${(v * 100).toFixed(1)}%`;
/* Brier com três casas: a diferença entre 0,412 e 0,418 é a diferença entre
   duas pessoas no ranking, e arredondar para duas as empataria na tela sem
   empatá-las na lista. */
const nota = v => (v == null ? '—' : v.toFixed(3));

function cabecalho(r) {
  /* NADA É INVENTADO QUANDO FALTA AMOSTRA. A frase muda, o número não aparece —
     é a regra do §28.5: a ausência é explicada, nunca simulada com um zero que
     parece empate. */
  const veredito = r.amostra === 0
    ? 'Registre seu primeiro palpite para a temporada começar.'
    : r.acimaDoAcaso === true
      ? 'Você está lendo melhor que o acaso.'
      : 'Ainda no nível do acaso — o palpite uniforme dá esta mesma nota.';

  /* ── A CAIXA CARREGA UM NÚMERO, E A EXPLICAÇÃO VAI NO PÉ ─────────────────
   *
   * A primeira versão punha "+4,8% melhor que a casa" DENTRO do número, e ao
   * olhar a tela aplicada a caixa quebrava em duas linhas e crescia mais que as
   * três irmãs — quatro caixas que deviam ler como uma fileira viravam três e
   * meia. As outras três já resolvem isso do jeito certo: número em cima,
   * frase embaixo. Esta passa a fazer igual. */
  const contra = r.habilidade == null
    ? { num: '—', cor: 'liga-fraco',
        pe: 'sem rodada suficiente para comparar' }
    : r.habilidade > 0
      ? { num: `+${pct(r.habilidade)}`, cor: 'liga-bom',
          pe: `melhor que a casa · ${nota(r.mediaModelo)} é a nota dela` }
      : { num: pct(r.habilidade), cor: 'liga-mau',
          pe: `ante a casa · ${nota(r.mediaModelo)} é a nota dela` };

  return `
    <div class="liga-placar">
      <div class="liga-caixa">
        <span class="liga-rot">Sua nota</span>
        <b class="liga-num">${nota(r.media)}</b>
        <span class="liga-pe">Brier · menor é melhor</span>
      </div>
      <div class="liga-caixa">
        <span class="liga-rot">O acaso</span>
        <b class="liga-num liga-fraco">${nota(r.acaso)}</b>
        <span class="liga-pe">a nota de quem chuta igual</span>
      </div>
      <div class="liga-caixa">
        <span class="liga-rot">Contra a casa</span>
        <b class="liga-num ${contra.cor}">${contra.num}</b>
        <span class="liga-pe">${contra.pe}</span>
      </div>
      <div class="liga-caixa">
        <span class="liga-rot">Rodadas</span>
        <b class="liga-num">${r.amostra}</b>
        <span class="liga-pe">${r.ranqueavel
          ? 'já dá para ranquear'
          : `faltam ${r.falta} para o ranking`}</span>
      </div>
    </div>
    <p class="liga-veredito">${veredito}</p>`;
}

function grade() {
  garantirPesos();
  const id = rodadaAtual();
  if (!id || !pesos) return `
    <p class="liga-vazio">Nenhuma rodada aberta agora. Volte quando a próxima
    começar — a Liga usa as MESMAS rodadas da Arena, e prever não custa nada
    nem move seu saldo.</p>`;

  const e = carregada();
  if (e.historico.some(h => h.roundId === id))
    return `<p class="liga-vazio">Esta rodada já foi pontuada.</p>`;

  const modelo = distribuicaoModelo();
  const p = normalizar(pesos);
  const jaRegistrou = !!e.pendentes[id];

  const linhas = p.map((v, i) => {
    const f = S.fighters[i];
    const delta = v - modelo[i];
    /* O DESVIO É O QUE A TELA DO §6.9 PEDE: "onde discordou do modelo". Ele só
       aparece quando é maior que meio ponto percentual — abaixo disso é ruído
       de normalização, e mostrar ruído como discordância seria mentir sobre a
       intenção do jogador. */
    const marca = Math.abs(delta) < 0.005 ? ''
      : `<i class="liga-delta ${delta > 0 ? 'mais' : 'menos'}">${
          delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}</i>`;
    return `
      <div class="liga-linha">
        ${f ? dexImg(f.dex, f.n, 'class="liga-mon" loading="lazy"') : ''}
        <span class="liga-nome">${f ? nomeExibido(f.n) : `#${i}`}</span>
        <span class="liga-barra"><i style="width:${(v * 100).toFixed(1)}%"></i></span>
        <span class="liga-p">${pct(v)}${marca}</span>
        <button class="liga-btn" data-liga-menos="${i}" aria-label="menos">−</button>
        <button class="liga-btn" data-liga-mais="${i}" aria-label="mais">+</button>
      </div>`;
  }).join('');

  return `
    <p class="liga-ajuda">A grade começa na leitura da casa. Empurre quem você
    acha que ela subestimou — o desvio ao lado é onde você discordou.</p>
    <div class="liga-grade">${linhas}</div>
    <div class="liga-acoes">
      <button class="btn pri" id="btnLigaRegistrar">${
        jaRegistrou ? 'Atualizar palpite' : 'Registrar palpite'}</button>
      <button class="btn" id="btnLigaModelo">Voltar à leitura da casa</button>
      <span class="liga-nota-acao">${jaRegistrou
        ? 'Palpite registrado nesta rodada — dá para trocar enquanto ela não corre.'
        : 'Não custa nada e não move seu saldo.'}</span>
    </div>`;
}

function lista(e) {
  const linhas = historico(e, 12);
  if (!linhas.length) return '<p class="liga-vazio">Nenhuma rodada pontuada ainda.</p>';
  return `<div class="liga-hist">${linhas.map(h => {
    /* A comparação por rodada é o que dá sentido ao histórico: "0,31" sozinho
       não diz nada, e "0,31 contra 0,44 da casa" diz tudo. */
    const venceu = h.brierModelo != null && h.brier < h.brierModelo;
    return `
      <div class="liga-hl ${h.brierModelo == null ? '' : (venceu ? 'liga-bom' : 'liga-mau')}">
        <span class="liga-hn">${nota(h.brier)}</span>
        <span class="liga-hm">casa ${nota(h.brierModelo)}</span>
      </div>`;
  }).join('')}</div>`;
}

export function renderLiga() {
  const alvo = $('#ligaCorpo');
  if (!alvo) return;
  const e = carregada();
  const n = S.fighters.length || 12;
  alvo.innerHTML = cabecalho(resumo(e, { n })) + grade() + `
    <h3 class="liga-tit">Últimas rodadas</h3>` + lista(e);
}

/* ─── os cliques ────────────────────────────────────────────────────────── */

/* Delegado no documento, como o resto do app faz. Um listener por botão em doze
   linhas redesenhadas a cada clique vazaria doze listeners por clique. */
document.addEventListener('click', (ev) => {
  const mais = ev.target.closest('[data-liga-mais]');
  const menos = ev.target.closest('[data-liga-menos]');
  if (mais || menos) {
    garantirPesos();
    if (!pesos) return;
    const i = Number((mais || menos).dataset.ligaMais ?? (menos).dataset.ligaMenos);
    /* O piso não é zero: um peso zerado nunca mais sobe por multiplicação, e o
       jogador ficaria com uma linha morta que não responde ao `+`. */
    pesos[i] = Math.max(1e-4, pesos[i] * (mais ? 1 + PASSO : 1 - PASSO));
    renderLiga();
    return;
  }

  if (ev.target.closest('#btnLigaModelo')) {
    rodadaEditada = null; garantirPesos(); renderLiga(); return;
  }

  if (ev.target.closest('#btnLigaRegistrar')) {
    const id = rodadaAtual();
    if (!id || !pesos) return;
    const e = carregada();
    const r = registrar(e, { roundId: id, distribuicao: normalizar(pesos) });
    if (r.ok) salvar(e);
    renderLiga();
    return;
  }

  /* A aba desenha ao ser aberta, e não a cada quadro: a Liga não tem nada que
     mude sozinho enquanto se olha para ela — o palpite muda por clique, e a
     pontuação por fim de rodada, que já redesenha. */
  const nav = ev.target.closest('.nav[data-view="viewLiga"], [data-goto="viewLiga"]');
  if (nav) setTimeout(renderLiga, 0);
});
