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
import { dexURL, dexURLGba, dexURLGbaCostas } from './sprites.mjs';
import { fxSheet } from './efeitos.mjs';
import { folhaDoImpacto } from './avanco-efeito.mjs';
import { simular } from '../../engine/treino-batalha.mjs';
import { entradasDoTime, rivalDe, treinador } from './treino-dados.mjs';
import { linhaDoTempo, fraseDoResultado, PASSO_MS } from './pve-dados.mjs';
import { cenarioDaLuta } from './pve-cenario.mjs';
import { arranjoClassico, narrar, RITMO_CLASSICO } from './luta-classica.mjs';
import { porcentagemExibida, textoDaMargem } from '../../engine/treino-preco.mjs';

const QUADROS_POR_S = 18;
let geracao = 0, deNovo = null;
const estouros = [];

/* ── O PALCO CLÁSSICO (ST-10.27) ──────────────────────────────────────────
 * O sprite e a placa são peças SEPARADAS: o sprite fica onde o arranjo da
 * camada 0 manda (o rival de frente em cima, o nosso de costas embaixo); a
 * placa fica na pilha do seu lado. A arte é a do cartucho — frente e costas
 * do FireRed/LeafGreen — e, se faltar, cai no retrato de sempre. */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function lutador(f, p) {
  const src = p.costas ? dexURLGbaCostas(f.dex, f.shiny) : dexURLGba(f.dex, f.shiny);
  return `<div class="pveLutador" data-slot="${f.slot}" style="--x:${p.x}%;--y:${p.y}%;--e:${p.escala};z-index:${p.z}">
    <div class="pveSprite"><i class="pveSombra"></i><img class="pveImg lcGba" src="${src}" alt="${esc(f.nome)}"${f.shiny ? ' data-shiny="1"' : ''}
      onerror="this.onerror=null;this.classList.remove('lcGba');this.src='${dexURL(f.dex, f.shiny)}'"></div></div>`;
}
/* A placa: nome e nível em pixel, a etiqueta "HP" do cartucho, a barra que
   muda de cor como lá (verde, amarela, vermelha) e o número — no neon. */
function placa(f) {
  return `<div class="pvePlaca" data-placa="${f.slot}">
    <div class="pveNome"><b>${esc(f.nome)}</b><span class="pveNv">Nv${f.nivel}</span></div>
    <div class="lcHpLinha"><span class="lcHpTag">HP</span><div class="pveVida"><i style="width:100%"></i></div></div>
    <span class="pveHp">${f.maxHp}/${f.maxHp}</span></div>`;
}
const placaDe = slot => document.querySelector(`.pvePlaca[data-placa="${slot}"]`);

/* O CENÁRIO (ST-2.17): a tela só pinta o que `cenarioDaLuta` decidiu — o
   céu e a luz no fundo do palco, as colinas e o horizonte na faixa do céu, o
   chão da região, a peça da frente e o ar do lugar. */
function pintarCena(c) {
  const poligono = k => `<polygon points="0,100 ${k.pontos.map(p => p.join(',')).join(' ')} 100,100" fill="${k.cor}"/>`;
  const img = (p, cls) => `<img class="pvePeca ${cls}" src="${p.arte}" alt="" style="left:${p.x}%;top:${p.y}%;height:${p.h}%">`;
  const ar = c.particula.lista.map(q => `<i class="pveParticula pp-${c.particula.anim}" style="left:${q.x}%;top:${q.y}%;`
    + `width:${Math.max(2, Math.round(c.particula.tam * q.escala))}px;height:${Math.max(2, Math.round(c.particula.tam * q.escala))}px;`
    + `background:${c.particula.cor};animation-delay:-${q.atraso}s;animation-duration:${q.dur}s"></i>`).join('');
  return {
    estilo: `--piso:url(${c.piso});background:radial-gradient(40% 55% at 80% 6%,${c.luz},transparent 70%),`
      + `linear-gradient(180deg,${c.ceu[0]} 0,${c.ceu[1]} var(--hz))`,
    fundo: `<div class="pveCena pve-${c.regiao}" aria-hidden="true">
      <div class="pveFaixa"><svg class="pveColinas" viewBox="0 0 100 100" preserveAspectRatio="none">${c.colinas.map(poligono).join('')}</svg>
        ${c.nuvens.map(n => `<i class="pveNuvem" style="left:${n.x}%;top:${n.y}%;--e:${n.escala};animation-duration:${n.dur}s"></i>`).join('')}
        ${c.fundo.map(p => img(p, p.longe ? 'pveLonge pveMaisLonge' : 'pveLonge')).join('')}</div>
      <div class="pveChao" style="--chao:url(${c.chao});--nevoa:${c.ceu[1]}"></div>
      <div class="pveAr">${ar}</div></div>`,
    frente: `<div class="pveFrente" aria-hidden="true">${c.frente.map(p => img(p, 'pvePerto')).join('')}</div>`,
  };
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
  const pDe = placaDe(passo.de), pPara = placaDe(passo.para);
  const acerta = () => {
    /* O texto e as marcas entram QUANDO o golpe acerta, junto com a barra e o
       número — antes, dizia "−27" com a barra ainda cheia. A caixa narra o
       PORQUÊ (ST-10.27): a frase é da camada 0. */
    if (log) { log.textContent = narrar(PACK, passo, L); log.classList.remove('lcNova'); void log.offsetWidth; log.classList.add('lcNova'); }
    document.querySelectorAll('.pveLutador.vez, .pveLutador.alvo, .pvePlaca.vez, .pvePlaca.alvo').forEach(x => x.classList.remove('vez', 'alvo'));
    de?.classList.add('vez'); para?.classList.add('alvo'); pDe?.classList.add('vez'); pPara?.classList.add('alvo');
    if (!para || !pPara) return;
    const barra = pPara.querySelector('.pveVida i');
    barra.style.width = `${Math.round(passo.fracaoDoAlvo * 100)}%`;
    /* As três cores do cartucho: verde, amarela abaixo da metade, vermelha abaixo de um quinto. */
    barra.classList.toggle('media', passo.fracaoDoAlvo < 0.5 && passo.fracaoDoAlvo >= 0.2);
    barra.classList.toggle('baixa', passo.fracaoDoAlvo < 0.2);
    pPara.querySelector('.pveHp').textContent = `${passo.vidaDoAlvo}/${max}`;
    if (passo.caiu) { para.classList.add('caido'); pPara.classList.add('caido'); }
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
export function encenar({ alvo, A, B, r, antes, titulo, extraNoFim = '', aoFim = null, deNovo: repetir = null, voltar = 'voltar ao time', linha = null, final = null, topo = null, rotulos = null, cenario = 'campo', semente = null }) {
  deNovo = repetir;
  const g = ++geracao;
  const L = linha ?? linhaDoTempo(PACK, A, B, r, nomeExibido);
  r ??= { vencedor: L.vencedor };
  if (!alvo) return;
  const cena = pintarCena(cenarioDaLuta(cenario, semente ?? titulo));
  /* ST-10.27: onde cada um fica e onde moram as placas, a camada 0 decide. */
  const arr = arranjoClassico(L.lados, { estreito: globalThis.matchMedia?.('(max-width: 620px)').matches ?? false });
  const posDe = (lado, f) => arr[lado].find(x => x.slot === f.slot);
  /* As placas na ordem dos sprites, da esquerda para a direita (Q7). */
  const pilha = lado => `<div class="lcPlacas lcPlacas${lado}">${rotulos ? `<span class="pveRotulo">${rotulos[lado]}</span>` : ''}${
    arr.ordem[lado].map(slot => placa(L.lados[lado].find(f => f.slot === slot))).join('')}</div>`;
  const noPalco = arr.modo === 'palco';
  alvo.innerHTML = `<div class="pveLuta lcClassico lc-${arr.modo}">
    <div class="pveTopo"><b>${titulo}</b><span>${topo ?? `antes da luta: ${porcentagemExibida(antes.p)} · ${textoDaMargem(antes)}`}</span>
      <button class="btn" data-pve-pular>pular</button></div>
    ${noPalco ? '' : `<div class="lcFaixa lcFaixaB">${pilha('B')}</div>`}
    <div class="pvePalco" id="pvePalco" style="${cena.estilo}">${cena.fundo}
      <i class="lcPlataforma lcPlataformaB" aria-hidden="true"></i><i class="lcPlataforma lcPlataformaA" aria-hidden="true"></i>
      <div class="pveLado pveB">${L.lados.B.map(f => lutador(f, posDe('B', f))).join('')}</div>
      <div class="pveLado pveA">${L.lados.A.map(f => lutador(f, posDe('A', f))).join('')}</div>
      ${noPalco ? pilha('B') + pilha('A') : ''}
      ${cena.frente}<canvas class="pveFx" id="pveFx"></canvas>
    </div>
    <p class="pveLog lcCaixa" id="pveLog" aria-live="polite">a luta vai começar…</p>
    ${noPalco ? '' : `<div class="lcFaixa lcFaixaA">${pilha('A')}</div>`}
    <div class="pveFim" id="pveFim" hidden></div>
  </div>`;
  alvo.hidden = false;
  alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
  /* A rolagem suave parava no meio no celular: a Jornada esconde o painel no
     mesmo instante, e a página muda de altura durante a rolagem (medido em
     390×844 — a luta ficava 270 px abaixo do topo e a caixa, atrás da barra).
     Se ela parou longe, ancora de novo. */
  setTimeout(() => { if (g === geracao && Math.abs(alvo.getBoundingClientRect().top) > 24) alvo.scrollIntoView({ block: 'start' }); }, 700);
  alvo.dataset.estado = 'lutando';
  const acabar = () => { fim(L, antes, r, extraNoFim, voltar, final); alvo.dataset.estado = 'fim'; aoFim?.(); };
  /* O ritmo do clássico: tempo de ler a caixa (RITMO_CLASSICO), e "pular" segue ali. */
  L.passos.forEach(p => setTimeout(() => { if (g === geracao) aplicar(p, L); }, p.t * RITMO_CLASSICO + 400));
  setTimeout(() => { if (g === geracao) acabar(); }, L.duracaoMs * RITMO_CLASSICO + 900);
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
