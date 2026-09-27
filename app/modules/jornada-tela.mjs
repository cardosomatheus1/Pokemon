/* O MAPA DE KANTO — a tela (ST-10.12 · F4.5 · Spec §8.7, §12 tela 22).
 *
 * Camada 4: pinta o que `jornada-dados.mjs` devolve. O caminho é o mundo GBA
 * (campo, estrada de terra, nós no chão); o estojo de insígnias e o painel
 * são a interface neon. O nó escolhido mostra o rival e a chance — a MESMA
 * conta do Team Builder (raiz 1, o preset do jogador) —, e "lutar" roda a luta
 * GRAVADA pela jornada (`lutarNaJornadaLocal`), encenada pela tela da 10.9.
 *
 * A tela não decide o que abriu, não conta insígnia e não grava progresso:
 * cada uma dessas é do motor e da camada 1.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { dexImg } from './sprites.mjs';
import { mapaDaJornada, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, ARTE_DO_MAPA } from './jornada-dados.mjs';
import { entradasDoTime, rivalDe, treinador, presetValido } from './treino-dados.mjs';
import { lote, resumo, arredondarNeutro, textoDaMargem, SIMS_TREINO } from '../../engine/treino-preco.mjs';
import { lutarNaJornadaLocal } from './jornada-local.mjs';
import { encenar } from './pve-tela.mjs';
import { renderTreino } from './treino-tela.mjs';
import { folhaVestida, carregar as carregarGuardaRoupa } from './outfit-acervo.mjs';

const RAIZ = 1;
const presetDoJogador = () => { try { return presetValido(localStorage.getItem('ar_treino_preset')); } catch { return 'balanced'; } };
let escolhido = null, geracao = 0, chanceNaTela = null;

function pintarPainel(mapa) {
  const alvo = $('#jnPainel');
  const no = mapa.nos.find(n => n.id === escolhido) ?? mapa.nos.find(n => n.id === mapa.atual) ?? mapa.nos.at(-1);
  if (!alvo || !no) return;
  escolhido = no.id; chanceNaTela = null;
  const t = treinador(PACK, no.rival), rival = rivalDe(PACK, t);
  const nomeDo = dex => nomeExibido(PACK.especies.find(e => e.dex === dex)?.n ?? '?');
  alvo.innerHTML = `<div class="jnInfo"><h4>${no.nome}${no.tipo === 'ginasio' ? ' <span class="jnSelo">ginásio</span>' : ''}</h4>
      <p class="tiny">${fraseDoNo(no, t.nome)}</p>
      <p class="jnRival">${t.nome}: ${rival.map(r => `<span>${dexImg(r.dex, '', 'class="jnSprite"')}${nomeDo(r.dex)} <i>NV ${r.nivel}</i></span>`).join('')}</p></div>
    <div class="jnChance"><span class="tiny">seu time vence</span><strong id="jnNumero">…</strong><span class="tiny" id="jnErro">calculando</span>
      <span class="tiny jnRisco" id="jnRisco" hidden>arriscado — <button class="lnk" data-treino-aba="time">reforce o time</button></span>
      <button class="btn gold jnCta" id="jnLutar" data-jn-lutar="${no.id}" disabled>${no.estado === 'trancado' ? 'trancado' : `lutar contra ${t.nome}`}</button></div>`;
  const g = ++geracao, A = entradasDoTime(PACK, carregar()), preset = presetDoJogador();
  if (!A.length) { $('#jnErro').textContent = 'o time está vazio — escolha o inicial nas Rotas'; return; }
  const acum = { vitorias: 0, empates: 0, sims: 0 };
  const passo = () => {
    if (g !== geracao) return;
    lote(PACK, A, rival, RAIZ, acum.sims, Math.min(100, SIMS_TREINO - acum.sims), acum, preset);
    const r = resumo(acum), pronto = acum.sims >= SIMS_TREINO;
    const n = $('#jnNumero'), e = $('#jnErro'), b = $('#jnLutar');
    if (n) { n.textContent = `${arredondarNeutro(r.p * 100)}%`; n.classList.toggle('parcial', !pronto); n.dataset.faixa = pronto ? faixaDaChance(r.p) : ''; }
    const aviso = $('#jnRisco');
    if (aviso) aviso.hidden = !(pronto && no.estado !== 'trancado' && faixaDaChance(r.p) === 'baixa');
    if (e) e.textContent = pronto ? textoDaMargem(r) : `calculando · ${acum.sims} de ${SIMS_TREINO}`;
    if (pronto) { chanceNaTela = r; if (b && no.estado !== 'trancado') b.disabled = false; }
    else setTimeout(passo, 0);
  };
  setTimeout(passo, 0);
}

const quadro = (folha, cls, extra = '') => `<b class="${cls}" style="background-image:url(${ARTE_DO_MAPA}/${folha}.png)${extra}"></b>`;

export function renderJornada() {
  const alvo = $('#jnMapaArea');
  if (!alvo) return;
  const estado = carregar();
  const mapa = mapaDaJornada(PACK, estado.jornada);
  const ganhas = mapa.insignias.filter(x => x.ganha).length;
  /* VOCÊ no mapa: o traje vestido, de frente, NA TRILHA, a caminho do nó que
     falta vencer. A folha é a do idle — nove quadros. */
  const eu = folhaVestida(carregarGuardaRoupa()), onde = ondeEstou(mapa);
  /* A trilha andada é cheia; a por andar, tracejada e apagada. */
  const { andado, resto } = caminhoAndado(mapa);
  const linha = (nos, empe) => nos.map(n => (empe ? `${n.y},${n.x}` : `${n.x},${n.y}`)).join(' ');
  const trilha = empe => `<polyline class="jnBeira" points="${linha(andado, empe)}"/><polyline points="${linha(andado, empe)}"/>`
    + (resto.length > 1 ? `<polyline class="jnPorAndar" points="${linha(resto, empe)}"/>` : '');
  alvo.innerHTML = `
    <div class="jnTopo"><span><b>${mapa.feitos}</b> de ${mapa.total} passos · <b>${ganhas}</b> de ${mapa.insignias.length} insígnias${mapa.atual ? '' : ' · <b class="jnFeito">caminho vencido de ponta a ponta</b>'}</span>
      <div class="jnEstojo">${mapa.insignias.map(x => `<i class="jnInsignia${x.ganha ? ' ganha' : ''}" title="${x.nome ?? 'ainda não há ginásio aqui'}"></i>`).join('')}</div></div>
    <div class="jnMapa" style="--n:${mapa.nos.length}">
      <svg class="jnCaminho jnDeitado" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trilha(false)}</svg>
      <svg class="jnCaminho jnEmPe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trilha(true)}</svg>
      ${bordaDoMapa().map(p => `<div class="jnPos jnB" style="--x:${p.x};--y:${p.y}">${quadro('cuttable_tree', 'jnProp')}</div>`).join('')}
      ${mapa.nos.map(n => `<div class="jnPos jn-${n.estado}" style="--x:${n.x};--y:${n.y}">
          ${cenaDoNo(n).map(c => quadro(c.folha, 'jnProp', `;--dx:${c.dx}px;--dy:${c.dy}px`)).join('')}
          ${n.ow ? quadro(n.ow, 'jnOw') : ''}
          <button class="jnNo jn-${n.estado} jn-${n.tipo}${n.id === escolhido ? ' escolhido' : ''}" data-jn-no="${n.id}" title="${n.nome}"><i></i><span>${n.nome}</span></button></div>`).join('')}
      ${onde && eu ? `<div class="jnPos jnVoce" style="--x:${onde.x};--y:${onde.y}"><b class="jnEu"><img src="${eu}" alt="você"></b></div>` : ''}
    </div>
    <div class="jnPainel" id="jnPainel"></div>`;
  const im = alvo.querySelector('.jnEu img');
  if (im) { const medir = () => { im.parentNode.style.width = `${im.naturalWidth / 9}px`; }; if (im.complete && im.naturalWidth) medir(); else im.onload = medir; }
  pintarPainel(mapa);
}

export function mostrarAbaTreino(aba) {
  const jornada = aba === 'jornada';
  const t = $('#treinoCorpo'), j = $('#jornadaCorpo'), lema = $('#treinoLema');
  if (lema) lema.textContent = jornada ? 'o caminho da jornada — vença cada nó para abrir o próximo' : 'monte o time e veja a chance mexer — treino, sem aposta';
  if (t) t.hidden = jornada;
  if (j) j.hidden = !jornada;
  document.querySelectorAll('[data-treino-aba]').forEach(b => b.classList.toggle('on', b.dataset.treinoAba === aba));
  try { localStorage.setItem('ar_treino_aba', aba); } catch { /* privativo */ }
  if (jornada) renderJornada(); else renderTreino();
}
const abaLembrada = () => { try { return localStorage.getItem('ar_treino_aba') === 'jornada' ? 'jornada' : 'time'; } catch { return 'time'; } };

document.addEventListener('click', ev => {
  if (ev.target.closest('.nav[data-view="viewTreino"], [data-goto="viewTreino"]')) { setTimeout(() => mostrarAbaTreino(abaLembrada()), 0); return; }
  const aba = ev.target.closest('[data-treino-aba]');
  if (aba) { mostrarAbaTreino(aba.dataset.treinoAba); return; }
  /* Voltar ao mapa devolve o painel: enquanto o resultado está na tela, o
     painel do PRÓXIMO nó não aparece junto (duas mensagens, dois nós). */
  if (ev.target.closest('#jnLuta [data-pve-fechar]')) { $('#jornadaCorpo')?.classList.remove('emLuta'); return; }
  const no = ev.target.closest('[data-jn-no]');
  if (no) { escolhido = no.dataset.jnNo; renderJornada(); return; }
  const lutar = ev.target.closest('[data-jn-lutar]');
  if (!lutar || lutar.disabled || !chanceNaTela) return;
  const id = lutar.dataset.jnLutar, antes = chanceNaTela;
  const r = lutarNaJornadaLocal({ pack: PACK, id, preset: presetDoJogador() });
  if (!r.ok) { $('#jnErro').textContent = r.motivo ?? 'não deu para lutar agora'; return; }
  const mapa = mapaDaJornada(PACK, r.progresso), proximo = mapa.nos.find(n => n.id === mapa.atual);
  const extra = r.ganhouInsignia ? 'A insígnia é sua.' : r.primeiraVez ? (proximo ? `O caminho abriu: próximo, ${proximo.nome}.` : 'A jornada está completa.') : '';
  const t = treinador(PACK, PACK.jornada.find(n => n.id === id)?.rival);
  $('#jornadaCorpo')?.classList.add('emLuta');
  encenar({ alvo: $('#jnLuta'), A: r.timeA, B: r.timeB, r: r.resultado, antes, titulo: `${PACK.jornada.find(n => n.id === id)?.nome} · ${t.nome}`,
            extraNoFim: extra, voltar: 'voltar ao mapa', aoFim: () => { if (r.primeiraVez && proximo) escolhido = proximo.id; renderJornada(); } });
});
