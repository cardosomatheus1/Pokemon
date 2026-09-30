/* A PARTIDA DA LIGA NO PALCO DA ARENA — a encenação (ST-11.6d) — camada 4.
 *
 * Os dois times de seis na ilha da Arena, com as folhas animadas do PMD, as
 * placas de vida, o golpe que sai (carga, projétil, jato) e o estouro no alvo
 * — a MESMA linguagem da luta que o apostador assiste. O que se decide mora
 * em `liga-palco-dados.mjs`: aqui cada quadro pergunta `poseNoInstante` e
 * pinta a resposta.
 *
 * Um palco PRÓPRIO, e não o da Arena: aquele lê o `S` global e a rodada da
 * aposta continua rodando por baixo — pegá-lo emprestado quebraria a rodada
 * viva. Daqui se reusa a PINTURA da ilha (`pinturaDa`), a folha dos efeitos
 * (`fxSheet`) e o desenho deles (`avanco-efeito`, o precedente do Avanço).
 */
import { PMD } from './sprites-dados.mjs';
import { sheetURL, urlFolha, dexImg } from './sprites.mjs';
import { fxSheet } from './efeitos.mjs';
import { lancar, estourar, desenharEstouros, usarCarregador, limparEstouros, folhaDoImpacto } from './avanco-efeito.mjs';
import { pinturaDa } from './arenas.mjs';
import { MOVE_FX } from './efeitos-dados.mjs';
import { PALCO, coreografiaDoPalco, poseNoInstante, impactosEntre, numeroDoGolpe, escalaDe, balaoNoInstante, logNoInstante, vivosNoInstante } from './liga-palco-dados.mjs';
import { PACK, tipoCores } from './motor.mjs';
import { golpePorNome } from '../../engine/time.mjs';

const { W, H } = PALCO;
const ESCALA = 2, ENTRADA_MS = 700;
let geracao = 0, rodadas = 0;

function contexto(cv) {
  cv.width = W * ESCALA; cv.height = H * ESCALA;
  const c = cv.getContext('2d');
  c.scale(ESCALA, ESCALA); c.imageSmoothingEnabled = false;
  return c;
}

/* A folha da animação no elemento: o mesmo recorte do `setAnim` da Arena. */
function vestir(e, anim) {
  const m = PMD[e.l.dex]?.[anim] ?? PMD[e.l.dex]?.i;
  if (!m || e.anim === anim) return;
  const [fw, fh, dur] = m;
  Object.assign(e, { anim, fw, fh, cols: dur.length, dur, ticks: dur.reduce((a, b) => a + b, 0) });
  e.el.style.width = `${(fw * e.escala / W) * 100}%`;
  e.el.style.aspectRatio = `${fw} / ${fh}`;
  e.body.style.backgroundImage = `url(${urlFolha(sheetURL(e.l.dex, anim, false))})`;
  e.body.style.backgroundSize = `${e.cols * 100}% 800%`;
}
function quadro(e, ms) {
  if (!e.dur) return;
  let t = Math.floor(ms / (1000 / 60)) % e.ticks, f = 0;
  while (t >= e.dur[f]) { t -= e.dur[f]; f++; }
  e.body.style.backgroundPosition = `${e.cols > 1 ? (f / (e.cols - 1)) * 100 : 0}% ${(e.dir / 7) * 100}%`;
}

export function montarPalco(alvo, { linha, arena = { key: 'coliseu', nome: 'Coliseu', emoji: '🏛️' }, titulo, topo, rotulos, final, voltar = 'fechar' }) {
  if (!alvo) return null;
  usarCarregador(fxSheet);
  limparEstouros();
  const g = ++geracao, rodada = ++rodadas;
  const palco = coreografiaDoPalco(linha);
  /* A placa da Arena: o nome e a vida, e mais nada — o nível mora no time publicado. */
  const placa = l => `<div class="plate lpPlaca lp${l.lado}" data-lp-placa="${l.slot}"><div class="fill"></div><div class="nm">${l.nome}</div></div>`;
  alvo.innerHTML = `<div class="lpLuta">
    <div class="pveTopo"><b>${titulo}</b><span>${topo}</span><button class="btn" data-lp-pular>pular</button></div>
    <div class="lpCena">
      <div class="lpPlacar"><span class="lpPlacarA"><b data-lp-vivos="A">${palco.lutadores.filter(l => l.lado === 'A').length}</b> de pé<i>${rotulos?.A ?? 'seu time'}</i></span><em>×</em>
        <span class="lpPlacarB"><b data-lp-vivos="B">${palco.lutadores.filter(l => l.lado === 'B').length}</b> de pé<i>${rotulos?.B ?? 'rival'}</i></span></div>
      <div class="lpHud">
        <div class="lpHudLado lpHudA"><span class="lpHudRot"><i class="lpAnel"></i>${rotulos?.A ?? 'seu time'}</span><div class="lpGrade">${palco.lutadores.filter(l => l.lado === 'A').map(placa).join('')}</div></div>
        <div class="lpHudLado lpHudB"><span class="lpHudRot"><i class="lpAnel"></i>${rotulos?.B ?? 'rival'}</span><div class="lpGrade">${palco.lutadores.filter(l => l.lado === 'B').map(placa).join('')}</div></div>
      </div>
      <div class="lpArena">
        <canvas class="lpMapa"></canvas><div class="lpMons"></div><canvas class="lpFx"></canvas><div class="lpUi"></div>
        <div class="corner-badge arena show lpSelo">${arena.emoji ?? ''} <b style="display:inline">${arena.nome ?? ''}</b></div>
        <div class="lpMiniLog"></div>
        <div class="lpBanner" hidden></div>
      </div>
    </div>
    <div class="pveFim" hidden></div>
  </div>`;
  alvo.hidden = false;
  alvo.dataset.estado = 'lutando';
  alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });

  /* O MAPA: a ilha pintada uma vez numa camada guardada; o que a cerca, a cada quadro. */
  const pintura = pinturaDa(arena.key) ?? pinturaDa('coliseu');
  const mapa = contexto(alvo.querySelector('.lpMapa')), fxg = contexto(alvo.querySelector('.lpFx'));
  const ilha = document.createElement('canvas');
  const ilhaCtx = contexto(ilha);
  pintura.estatico(ilhaCtx);

  const mons = alvo.querySelector('.lpMons'), ui = alvo.querySelector('.lpUi');
  const ents = palco.lutadores.map(l => {
    const el = document.createElement('div');
    el.className = `mon lpMon lp${l.lado}`;
    const body = document.createElement('div');
    body.className = 'body';
    el.appendChild(body); mons.appendChild(el);
    const bub = document.createElement('div');
    bub.className = 'bubble';
    ui.appendChild(bub);
    /* O ANEL DO LADO no chão, fora do sprite: preso ao quadro, ele crescia e
       fugia do pé quando a folha de ataque (maior) entrava. */
    const anel = document.createElement('i');
    anel.className = `lpAnelChao lp${l.lado}`;
    mons.insertBefore(anel, mons.firstChild);
    /* As quatro folhas de uma vez: a de ataque carregando no meio do golpe
       deixava o anel sem ninguém em cima. */
    if (l.animado) for (const k of ['i', 'w', 'a', 'h']) { const im = new Image(); im.src = urlFolha(sheetURL(l.dex, k, false)); }
    const e = { l, el, body, bub, anel, escala: escalaDe(l.dex), anim: null, dir: 0, placa: alvo.querySelector(`[data-lp-placa="${l.slot}"]`) };
    if (!l.animado) { el.innerHTML = dexImg(l.dex, l.nome, 'class="lpEstatico"'); el.style.width = '17%'; }
    return e;
  });

  /* O ESTOURO DA ARENA para o golpe sem folha própria: o anel e as faíscas na
     cor do tipo — a mesma técnica do `efeitos.mjs`, no canvas deste palco. */
  const estouros = [];
  const corDo = golpe => tipoCores[golpePorNome(PACK, golpe)?.t] || '#ffffff';
  const desenharProcedurais = agora => {
    for (let i = estouros.length - 1; i >= 0; i--) {
      const b = estouros[i], k = Math.min(1, (agora - b.t0) / 450);
      fxg.globalAlpha = 1 - k; fxg.strokeStyle = b.cor; fxg.fillStyle = b.cor; fxg.lineWidth = 2.5;
      fxg.beginPath(); fxg.arc(b.x, b.y, 3 + k * 16, 0, Math.PI * 2); fxg.stroke();
      for (let q = 0; q < 6; q++) { const ang = b.fase + q * Math.PI / 3, d = 3 + k * 14; fxg.fillRect(b.x + Math.cos(ang) * d - 1, b.y + Math.sin(ang) * d - 1, 2.5, 2.5); }
      fxg.globalAlpha = 1;
      if (k >= 1) estouros.splice(i, 1);
    }
  };

  const numero = (a, alvoL) => {
    const n = numeroDoGolpe(a), d = document.createElement('div');
    d.className = `dmg ${n.classe}`; d.textContent = n.texto;
    d.style.left = `${(alvoL.x / W) * 100}%`; d.style.top = `${((alvoL.y - 30) / H) * 100}%`;
    ui.appendChild(d); setTimeout(() => d.remove(), 1200);
  };

  /* AS FOLHAS DOS EFEITOS antes do primeiro golpe: carregadas só no uso, o jato
     do Flamethrower acabava antes de a imagem chegar (Q7, 2ª rodada: "nenhum
     projétil visível"). O `fxSheet` guarda cada uma; aqui só se pede cedo. */
  for (const a of palco.atos) { const f = MOVE_FX[a.golpe]; if (f) for (const k of ['cast', 'proj', 'beam', 'hit']) if (f[k]) fxSheet(f[k]); }

  const inicio = performance.now() + ENTRADA_MS;
  /* Os lançamentos agendados de uma vez, para chegarem no impacto de cada golpe. */
  const porSlot = s => palco.lutadores.find(x => x.slot === s);
  for (const a of palco.atos) {
    if (a.errou) continue;
    const de = porSlot(a.de), para = porSlot(a.para);
    if (de && para) lancar(a.golpe, de, para, { x: 0, y: 0 }, `liga:${rodada}:${a.n}`, inicio + a.impacto);
  }

  let ultimo = -ENTRADA_MS, acabou = false, pulou = false;
  const pintar = (ms, efeitos) => {
    for (const e of ents) {
      const p = poseNoInstante(palco, e.l.slot, Math.max(0, ms));
      if (!p) continue;
      e.el.style.left = `${(p.x / W) * 100}%`; e.el.style.top = `${(p.y / H) * 100}%`;
      /* O balão da Arena: o nome do golpe, com a borda na cor do tipo dele. */
      const golpe = efeitos ? balaoNoInstante(palco, e.l.slot, ms) : null;
      e.bub.classList.toggle('on', !!golpe);
      if (golpe && e.bub.textContent !== golpe) { e.bub.textContent = golpe; e.bub.style.borderColor = tipoCores[golpePorNome(PACK, golpe)?.t] || '#333'; }
      e.bub.style.left = `${(p.x / W) * 100}%`; e.bub.style.top = `${((p.y - 40) / H) * 100}%`;
      e.el.classList.toggle('lpCaido', p.caido);
      e.anel.style.left = `${(p.x / W) * 100}%`; e.anel.style.top = `${((p.y + 14) / H) * 100}%`;
      e.anel.classList.toggle('lpCaido', p.caido);
      e.el.classList.toggle('lpEntra', ms < 0);
      e.dir = p.dir;
      if (e.l.animado) { vestir(e, p.anim); quadro(e, performance.now()); }
      if (e.placa) {
        const pct = Math.max(0, p.fracao) * 100;
        e.placa.querySelector('.fill').style.width = `${pct}%`;
        e.placa.querySelector('.fill').style.background = pct > 50 ? '#7bd85a' : pct > 22 ? '#f2c13c' : '#e5484d';
        e.placa.classList.toggle('dead', p.caido);
      }
    }
    for (const a of impactosEntre(palco, ultimo, ms)) {
      const para = porSlot(a.para);
      if (!efeitos || !para) continue;
      numero(a, para);
      if (!a.errou && a.dano > 0) {
        if (folhaDoImpacto(a.golpe)) estourar(a.golpe, para.x, para.y, { x: 0, y: 0 }, `liga:${rodada}:${a.n}:hit`, performance.now());
        else estouros.push({ x: para.x, y: para.y - 10, cor: corDo(a.golpe), t0: performance.now(), fase: a.n * 1.3 });
      }
      alvo.querySelector(`[data-lp-placa="${a.para}"]`)?.classList.remove('hurt');
      void alvo.offsetWidth;
      alvo.querySelector(`[data-lp-placa="${a.para}"]`)?.classList.add('hurt');
    }
    ultimo = ms;
    const vivos = vivosNoInstante(palco, ms);
    for (const lado of ['A', 'B']) { const el = alvo.querySelector(`[data-lp-vivos="${lado}"]`); if (el && el.textContent !== String(vivos[lado])) { el.textContent = vivos[lado]; el.parentNode.classList.remove('baixa'); void el.offsetWidth; el.parentNode.classList.add('baixa'); } }
    const mini = alvo.querySelector('.lpMiniLog');
    if (mini) { const linhas = logNoInstante(palco, ms); mini.classList.toggle('tem', linhas.length > 0); mini.innerHTML = linhas.map(l => `<div class="${l.classe}">${l.texto}</div>`).join(''); }
  };

  const fechar = () => {
    if (acabou) return;
    acabou = true; alvo.dataset.estado = 'fim';
    const f = alvo.querySelector('.pveFim');
    if (!f) return;
    f.hidden = false;
    f.className = `pveFim ${final?.classe ?? 'empate'}`;
    f.innerHTML = `${final?.texto ? `<p>${final.texto}</p>` : ''}<div class="pveBotoes"><button class="btn" data-lp-fechar>${voltar}</button></div>`;
    /* O FIM EM CIMA DA ILHA, como o vencedor da Arena: o resultado grande e o selo do tier. */
    const banner = alvo.querySelector('.lpBanner');
    if (banner) {
      banner.hidden = false;
      banner.className = `lpBanner ${final?.classe ?? 'empate'}`;
      banner.innerHTML = `<b>${final?.titulo ?? 'Fim'}</b>${final?.selo ? `<em class="leSelo leSelo${final.selo.tipo}">${final.selo.texto}</em>` : ''}`;
    }
    alvo.querySelector('[data-lp-pular]')?.remove();
  };

  const laco = agora => {
    if (g !== geracao || !alvo.isConnected) return;
    /* Depois de "pular", o palco fica NO FIM: o relógio de verdade ainda está
       no meio, e pintar por ele desfaria o pulo (a mesma classe do D-130). */
    const ms = pulou ? palco.duracao : agora - inicio;
    pintura.fundo(agora / 1000, mapa);
    mapa.drawImage(ilha, 0, 0, W, H);
    fxg.clearRect(0, 0, W, H);
    desenharEstouros(fxg, agora);
    desenharProcedurais(agora);
    pintar(Math.min(ms, palco.duracao), !acabou);
    if (ms >= palco.duracao) fechar();
    requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);

  alvo._pular = () => {
    if (acabou) return;
    pulou = true;
    limparEstouros();
    pintar(palco.duracao, false);
    ultimo = palco.duracao;
    fechar();
  };
  alvo._fechar = () => { geracao++; alvo.hidden = true; alvo.innerHTML = ''; };
  return palco;
}

document.addEventListener('click', ev => {
  const pular = ev.target.closest('[data-lp-pular]');
  if (pular) { pular.closest('.lpArea, .pveArea')?._pular?.(); return; }
  const f = ev.target.closest('[data-lp-fechar]');
  if (f) f.closest('.lpArea, .pveArea')?._fechar?.();
});
