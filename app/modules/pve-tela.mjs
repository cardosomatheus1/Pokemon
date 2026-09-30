/* A BATALHA PvE NA TELA — a encenação (ST-10.9 · §8.9, §12 telas 23–24).
 *
 * Camada 4. Encena a linha do tempo de `pve-dados.mjs` e NADA além dela: a
 * vida que a barra mostra, quem cai e quem venceu vêm de lá. O estouro de cada
 * golpe é a folha do `MOVE_FX` desenhada pelo `fxSheet` da Arena — a MESMA
 * função que recorta a folha lá (e no Avanço), no mesmo ritmo de 18 quadros.
 *
 * A luta de verdade tem semente NOVA (do CSPRNG): a chance exibida antes é a
 * média de 2.000 lutas; esta é UMA delas, e é isso que o resultado ensina.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { dexImg } from './sprites.mjs';
import { fxSheet } from './efeitos.mjs';
import { folhaDoImpacto } from './avanco-efeito.mjs';
import { simular } from '../../engine/treino-batalha.mjs';
import { entradasDoTime, rivalDe, treinador } from './treino-dados.mjs';
import { linhaDoTempo, fraseDoResultado, PASSO_MS } from './pve-dados.mjs';
import { porcentagemExibida, textoDaMargem } from '../../engine/treino-preco.mjs';

const QUADROS_POR_S = 18;
let geracao = 0, deNovo = null;
const estouros = [];

function lutador(f) {
  return `<div class="pveLutador" data-slot="${f.slot}">
    <div class="pveSprite"><i class="pveSombra"></i>${dexImg(f.dex, f.nome, 'class="pveImg"')}</div>
    <div class="pvePlaca"><div class="pveNome"><b>${f.nome}</b><span class="pveNv">NV ${f.nivel}</span></div>
      <div class="pveVida"><i style="width:100%"></i></div><span class="pveHp">${f.maxHp}/${f.maxHp}</span></div></div>`;
}

function desenharEstouros() {
  const cv = $('#pveFx');
  if (!cv) { estouros.length = 0; return; }
  const ctx = cv.getContext('2d');
  const r = cv.getBoundingClientRect();
  if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
  ctx.clearRect(0, 0, cv.width, cv.height);
  const agora = performance.now();
  for (let i = estouros.length - 1; i >= 0; i--) {
    const e = estouros[i], rec = e.rec;
    if (!rec.ok) { if (agora - e.t0 > 1500) estouros.splice(i, 1); continue; }
    const q = Math.floor((agora - e.t0) / 1000 * QUADROS_POR_S);
    if (q >= rec.n) { estouros.splice(i, 1); continue; }
    const lado = rec.side * e.escala * 1.6;
    ctx.drawImage(rec.img, q * rec.side, 0, rec.side, rec.side, e.x - lado / 2, e.y - lado / 2, lado, lado);
  }
  if (estouros.length) requestAnimationFrame(desenharEstouros);
}

function estourar(golpe, alvoEl) {
  const f = folhaDoImpacto(golpe), palco = $('#pvePalco');
  if (!f || !alvoEl || !palco) return;
  const a = alvoEl.querySelector('.pveSprite').getBoundingClientRect(), p = palco.getBoundingClientRect();
  estouros.push({ rec: fxSheet(f.folha), escala: f.escala, x: a.left - p.left + a.width / 2, y: a.top - p.top + a.height / 2, t0: performance.now() });
  if (estouros.length === 1) requestAnimationFrame(desenharEstouros);
}

function aplicar(passo, L, animar = true, g = geracao) {
  const de = document.querySelector(`.pveLutador[data-slot="${passo.de}"]`);
  const para = document.querySelector(`.pveLutador[data-slot="${passo.para}"]`);
  /* Pelo SLOT, nos dois lados: o replay da Liga põe o jogador à esquerda, e o slot dele pode ser B. */
  const max = [...L.lados.A, ...L.lados.B].find(x => x.slot === passo.para).maxHp;
  if (animar && de) { de.classList.remove('ataca'); void de.offsetWidth; de.classList.add('ataca'); }
  /* Quem ATACA e quem LEVA ficam marcados até o próximo golpe: o olho acha a
     ação no palco sem ler o texto (Q7 da ST-11.6b). */
  const log = $('#pveLog');
  const acerta = () => {
    /* O texto e as marcas entram QUANDO o golpe acerta, junto com a barra e o
       número — antes, dizia "−27" com a barra ainda cheia. */
    if (log) log.textContent = passo.texto;
    document.querySelectorAll('.pveLutador.vez, .pveLutador.alvo').forEach(x => x.classList.remove('vez', 'alvo'));
    de?.classList.add('vez'); para?.classList.add('alvo');
    if (!para) return;
    para.querySelector('.pveVida i').style.width = `${Math.round(passo.fracaoDoAlvo * 100)}%`;
    para.querySelector('.pveVida i').classList.toggle('baixa', passo.fracaoDoAlvo < 0.3);
    para.querySelector('.pveHp').textContent = `${passo.vidaDoAlvo}/${max}`;
    if (passo.caiu) para.classList.add('caido');
    if (!animar) return;
    if (!passo.errou && passo.dano > 0) {
      para.classList.remove('leva'); void para.offsetWidth; para.classList.add('leva');
      estourar(passo.golpe, para);
    }
    const n = document.createElement('span');
    n.className = `pveNum${passo.errou || passo.eff === 0 ? ' nada' : passo.eff > 1 ? ' super' : ''}`;
    n.textContent = passo.errou ? 'errou' : passo.eff === 0 ? 'imune' : `−${passo.dano}`;
    para.querySelector('.pveSprite').appendChild(n);
    setTimeout(() => n.remove(), 900);
  };
  /* O acerto adiado respeita a geração: sem isto, o golpe que estava no ar
     quando o jogador apertou "pular" caía DEPOIS do estado final e reescrevia
     a frase e a barra do alvo (D-130, achado pelo Q7 da ST-11.6b). */
  if (animar) setTimeout(() => { if (g === geracao) acerta(); }, 260); else acerta();
}

function fim(L, antes, r, extra, voltar, final = null) {
  const el = $('#pveFim');
  if (!el) return;
  const f = final ? { titulo: final.titulo, texto: final.texto } : fraseDoResultado(r, antes);
  /* O selo do replay da Liga é o MESMO da lista: "contou · subiu para Silver". */
  if (final?.selo) f.titulo += ` <em class="leSelo leSelo${final.selo.tipo}">${final.selo.texto}</em>`;
  if (extra) f.texto += ` ${extra}`;
  el.hidden = false;
  el.className = `pveFim ${final?.classe ?? (r.vencedor === 'A' ? 'venceu' : r.vencedor === 'B' ? 'perdeu' : 'empate')}`;
  el.innerHTML = `<h4>${f.titulo}</h4><p>${f.texto}</p>
    <div class="pveBotoes">${deNovo ? '<button class="btn gold" data-pve-de-novo>lutar de novo</button>' : ''}<button class="btn" data-pve-fechar>${voltar}</button></div>`;
}

/* ENCENAR uma luta já decidida — a do Team Builder (sorteada aqui) ou a da
   jornada (decidida e gravada pelo `jornada-local`). Um caminho só para as
   duas: a tela nunca tem uma segunda versão da luta.
   Sem `deNovo`, o fim não oferece "lutar de novo": um botão que não faz nada
   é pior que nenhum (a jornada pede o próximo nó pelo mapa). */
/* `linha` e `final`: o REPLAY da Liga (ST-11.6b) chega com a linha do tempo
   pronta (do log, sem motor) e com o fim já escrito pela camada 0; `topo`
   troca a chance de antes, que no replay não existe. */
export function encenar({ alvo, A, B, r, antes, titulo, extraNoFim = '', aoFim = null, deNovo: repetir = null, voltar = 'voltar ao time', linha = null, final = null, topo = null, rotulos = null }) {
  deNovo = repetir;
  const g = ++geracao;
  const L = linha ?? linhaDoTempo(PACK, A, B, r, nomeExibido);
  r ??= { vencedor: L.vencedor };
  if (!alvo) return;
  alvo.innerHTML = `<div class="pveLuta">
    <div class="pveTopo"><b>${titulo}</b><span>${topo ?? `antes da luta: ${porcentagemExibida(antes.p)} · ${textoDaMargem(antes)}`}</span>
      <button class="btn" data-pve-pular>pular</button></div>
    <div class="pvePalco" id="pvePalco">
      <div class="pveLado pveA">${rotulos ? `<span class="pveRotulo">${rotulos.A}</span>` : ''}${L.lados.A.map(lutador).join('')}</div>
      <div class="pveLado pveB">${rotulos ? `<span class="pveRotulo">${rotulos.B}</span>` : ''}${L.lados.B.map(lutador).join('')}</div>
      <canvas class="pveFx" id="pveFx"></canvas>
    </div>
    <p class="pveLog" id="pveLog">a luta vai começar…</p>
    <div class="pveFim" id="pveFim" hidden></div>
  </div>`;
  alvo.hidden = false;
  alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
  alvo.dataset.estado = 'lutando';
  const acabar = () => { fim(L, antes, r, extraNoFim, voltar, final); alvo.dataset.estado = 'fim'; aoFim?.(); };
  L.passos.forEach(p => setTimeout(() => { if (g === geracao) aplicar(p, L); }, p.t + 400));
  setTimeout(() => { if (g === geracao) acabar(); }, L.duracaoMs + 900);
  alvo._pular = () => { if (g !== geracao) return; geracao++; L.passos.forEach(p => aplicar(p, L, false)); acabar(); };
}

export function abrirLuta(btn) {
  const estado = carregar();
  const A = entradasDoTime(PACK, estado);
  const t = treinador(PACK, btn.dataset.adv);
  const B = rivalDe(PACK, t);
  const semente = crypto.getRandomValues(new Uint32Array(1))[0];
  const r = simular(PACK, A, B, semente, { preset: btn.dataset.preset || 'balanced' });
  const antes = { p: Number(btn.dataset.p), erro: Number(btn.dataset.erro), sims: Number(btn.dataset.sims) };
  encenar({ alvo: $('#pveArea'), A, B, r, antes, titulo: `contra ${t.nome}`, deNovo: () => abrirLuta(btn) });
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-pve-lutar]');
  if (b && !b.disabled) { abrirLuta(b); return; }
  const pular = ev.target.closest('[data-pve-pular]');
  if (pular) { pular.closest('.pveArea')?._pular?.(); return; }
  if (ev.target.closest('[data-pve-de-novo]') && deNovo) { deNovo(); return; }
  const fechar = ev.target.closest('[data-pve-fechar]');
  if (fechar) { geracao++; const a = fechar.closest('.pveArea'); if (a) { a.hidden = true; a.innerHTML = ''; } }
});
