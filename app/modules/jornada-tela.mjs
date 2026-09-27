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
import { mapaDaJornada, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, arteDaInsignia, comparaVelocidade, imunesNoTime, tiposImunes, provaDaImunidade, ladoFraco, danoPorCategoria, pagamentoDoNo, fraseDoPagamento, ARTE_DO_MAPA } from './jornada-dados.mjs';
import { diaDoMundo } from '../../engine/avanco.mjs';
import { entradasDoTime, rivalDe, treinador, presetValido } from './treino-dados.mjs';
import { lote, resumo, porcentagemExibida, textoDaMargem, SIMS_TREINO } from '../../engine/treino-preco.mjs';
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
  /* Título, e LOGO a decisão (chance e botão): em 420 px a chance estava a
     1.080 px do topo, fora da tela (Q7 da ST-10.13). Nó vencido: o estado
     diz "vencido", e a revanche é ação secundária — a insígnia não repete. */
  const vencido = no.estado === 'vencido';
  alvo.innerHTML = `<h4 class="jnTitulo">${no.nome}${no.tipo === 'ginasio' ? ` <span class="jnSelo">ginásio${no.lider ? ` · líder ${no.lider}` : ''}</span>` : ''}</h4>
    <div class="jnChance${vencido ? ' jnVencido' : ''}">${vencido ? `<span class="jnFeitoSelo">${no.insignia ? `<img src="${arteDaInsignia(no.insignia)}" alt="">` : ''}vencido ✓</span>` : ''}
      <span class="tiny">seu time vence</span><strong id="jnNumero">…</strong><span class="tiny" id="jnErro">calculando</span>
      <span class="tiny jnCausa" id="jnCausa" hidden></span>
      <span class="tiny jnRisco" id="jnRisco" hidden>arriscado — <button class="lnk" data-treino-aba="time">reforce o time</button></span>
      <span class="tiny jnPaga">${fraseDoPagamento(PACK, pagamentoDoNo(no, carregar().jornada?.pve, diaDoMundo(Date.now())))}</span>
      <button class="btn${vencido ? '' : ' gold'} jnCta" id="jnLutar" data-jn-lutar="${no.id}" disabled>${no.estado === 'trancado' ? 'trancado' : vencido ? 'revanche (treino)' : `lutar contra ${t.nome}`}</button></div>
    <div class="jnInfo"><p class="jnFrase">${fraseDoNo(no, t.nome)}</p>
      ${no.licao ? `<p class="jnLicao"><img src="${arteDaInsignia(no.insignia)}" alt=""><span><b>Ensina: ${no.licao.ensina}.</b> ${no.lider ?? t.nome} usa ${no.licao.tipo}. ${no.licao.dica}</span></p>` : ''}
      <div id="jnVel"></div>
      <p class="jnRival">${t.nome}: ${rival.map(r => `<span>${dexImg(r.dex, '', 'class="jnSprite"')}${nomeDo(r.dex)} <i>NV ${r.nivel}</i></span>`).join('')}</p></div>`;
  const g = ++geracao, A = entradasDoTime(PACK, carregar()), preset = presetDoJogador();
  if (!A.length) { $('#jnErro').textContent = 'o time está vazio — escolha o inicial nas Rotas'; return; }
  /* A lição da velocidade com a velocidade NA TELA: o seu mais rápido, e quem
     dos rivais ele passa. */
  /* ST-10.16: a lição físico × especial — as duas defesas de cada rival lado
     a lado, e quantos dos seus golpes batem no lado fraco. */
  if (no.licao?.mostra === 'categoria') {
    const lf = ladoFraco(PACK, A, rival), causa = $('#jnCausa'), nomeCat = { fis: 'físico', esp: 'especial' };
    const topo = Math.max(...lf.deles.flatMap(x => [x.def, x.spd]), 1);
    $('#jnVel').innerHTML = `<div class="jnVel"><b>as defesas delas — o lado fraco é o ${nomeCat[lf.fraco]}</b>`
      + lf.deles.map(x => `<span class="jnDuelo2"><span>${nomeDo(x.dex)}</span>`
        + `<i class="${lf.fraco === 'fis' ? 'fraco' : ''}" style="width:${Math.round(x.def / topo * 100)}%"></i><strong>${x.def} fís</strong>`
        + `<i class="${lf.fraco === 'esp' ? 'fraco' : ''}" style="width:${Math.round(x.spd / topo * 100)}%"></i><strong>${x.spd} esp</strong></span>`).join('')
      /* A metade "confira no SEU time" (Q7 da ST-10.16): cada criatura sua com
         os golpes por categoria, nas mesmas colunas — e em vermelho quem bate
         pelo lado forte delas. */
      + `<b>os seus golpes</b>` + lf.seus.map(x => `<span class="jnDuelo2 seu${lf.pelaForte.includes(x) ? ' ruim' : ''}"><span>${nomeDo(x.dex)}</span>`
        + `<i class="${lf.fraco === 'fis' ? 'fraco' : ''}" style="width:${x.fis * 25}%"></i><strong>${x.fis} fís</strong>`
        + `<i class="${lf.fraco === 'esp' ? 'fraco' : ''}" style="width:${x.esp * 25}%"></i><strong>${x.esp} esp</strong></span>`).join('') + '</div>';
    if (causa) {
      const forte = nomeCat[lf.fraco === 'fis' ? 'esp' : 'fis'];
      causa.hidden = false;
      causa.className = `tiny jnCausa ${lf.pelaForte.length ? 'nao' : 'passa'}`;
      /* A saída NOMEADA: quais golpes trocar, e o link direto — o "reforce o
         time" genérico sugeria subir nível, que não é a lição. */
      const catDe = n => PACK.golpes && Object.values(PACK.golpes).flat().find(g => g.n === n)?.cat;
      const trocar = lf.pelaForte.map(x => `${nomeDo(x.dex)}: troque ${A.find(c => c.dex === x.dex).golpes.filter(n => catDe(n) !== lf.fraco).join(' e ')}`);
      causa.innerHTML = lf.pelaForte.length
        ? `${lf.pelaForte.map(x => nomeDo(x.dex)).join(' e ')} ${lf.pelaForte.length > 1 ? 'batem' : 'bate'} mais pelo ${forte}, o lado forte delas. ${trocar.join('; ')} por golpes ${nomeCat[lf.fraco]}s — <button class="lnk" data-treino-aba="time">escolher os golpes</button>`
        : `todo o seu time bate mais pelo ${nomeCat[lf.fraco]}: o lado fraco delas`;
      causa.dataset.licao = lf.pelaForte.length ? 'golpes' : '';
    }
  }
  /* ST-10.15: a lição da imunidade — quem do seu time o tipo não toca, com a
     mesma causa embaixo do número. */
  if (no.licao?.mostra === 'imune') {
    const im = imunesNoTime(PACK, A, no.licao.tipoGolpe), causa = $('#jnCausa');
    $('#jnVel').innerHTML = `<div class="jnImune"><b>imune a ${no.licao.tipo}</b>${A.map(c => {
      const sim = im.includes(c);
      const tipos = (PACK.especies.find(e => e.dex === c.dex)?.t ?? []).map(t => PACK.tipos.nomes?.[t] ?? t).join('/');
      return `<span class="${sim ? 'sim' : 'nao'}">${dexImg(c.dex, '', 'class="jnSprite"')}${nomeDo(c.dex)} <em>${tipos}</em> <i>${sim ? 'imune ✓' : 'leva o golpe'}</i></span>`;
    }).join('')}</div>`;
    if (causa) {
      causa.hidden = false;
      causa.className = `tiny jnCausa ${im.length ? 'passa' : 'nao'}`;
      causa.textContent = im.length ? `${im.map(c => nomeDo(c.dex)).join(' e ')} ${im.length > 1 ? 'são imunes' : 'é imune'} a ${no.licao.tipo}`
                                    : `ninguém do seu time é imune a ${no.licao.tipo} — leve um ${tiposImunes(PACK, no.licao.tipoGolpe).map(t => PACK.tipos.nomes?.[t] ?? t).join(' ou ')}`;
    }
  }
  /* Q7 da ST-10.14: a comparação é um DUELO de barras colado à lição, e a
     CAUSA vai para baixo do número — o 5% dizia "arriscado" sem dizer por quê. */
  if (no.licao?.mostra === 'vel') {
    const v = comparaVelocidade(PACK, A, rival), topo = Math.max(v.seu.spe, v.alvo) || 1;
    const barra = (nome, spe, cls) => `<span class="jnDuelo ${cls}"><span>${nome}</span><i style="width:${Math.round(spe / topo * 100)}%"></i><strong>${spe}</strong></span>`;
    $('#jnVel').innerHTML = `<div class="jnVel"><b>velocidade — quem age antes</b>${barra(`você: ${nomeDo(v.seu.dex)}`, v.seu.spe, 'seu')}`
      + v.deles.map(x => barra(nomeDo(x.dex), x.spe, v.seu.spe > x.spe ? 'passa' : 'nao')).join('') + '</div>';
    const rapido = v.deles.find(x => x.spe === v.alvo);
    const causa = $('#jnCausa');
    if (causa) {
      causa.hidden = false;
      causa.className = `tiny jnCausa ${v.falta ? 'nao' : 'passa'}`;
      causa.textContent = v.falta
        ? `${nomeDo(rapido.dex)} age antes: ${v.alvo} contra ${v.seu.spe} — faltam ${v.falta} de velocidade${v.passaNoNivel ? ` (o ${nomeDo(v.seu.dex)} passa no nível ${v.passaNoNivel})` : ''}`
        : `você age antes: ${nomeDo(v.seu.dex)} ${v.seu.spe} contra ${nomeDo(rapido.dex)} ${v.alvo}`;
    }
  }
  const acum = { vitorias: 0, empates: 0, sims: 0 };
  const passo = () => {
    if (g !== geracao) return;
    lote(PACK, A, rival, RAIZ, acum.sims, Math.min(100, SIMS_TREINO - acum.sims), acum, preset);
    const r = resumo(acum), pronto = acum.sims >= SIMS_TREINO;
    const n = $('#jnNumero'), e = $('#jnErro'), b = $('#jnLutar');
    if (n) { n.textContent = porcentagemExibida(r.p); n.classList.toggle('parcial', !pronto); n.dataset.faixa = pronto ? faixaDaChance(r.p) : ''; }
    const aviso = $('#jnRisco');
    /* Com a causa da lição nomeando os golpes, o "reforce o time" sai: ele
       contradiz a lição (sugere nível, e o que falta é escolher golpe). */
    if (aviso) aviso.hidden = !(pronto && no.estado !== 'trancado' && faixaDaChance(r.p) === 'baixa') || $('#jnCausa')?.dataset.licao === 'golpes';
    if (e) e.textContent = pronto ? textoDaMargem(r) : `calculando · ${acum.sims} de ${SIMS_TREINO}`;
    if (pronto) { chanceNaTela = r; if (b && no.estado !== 'trancado') b.disabled = false; }
    else setTimeout(passo, 0);
  };
  setTimeout(passo, 0);
}

const quadro = (folha, cls, extra = '') => `<b class="${cls}" style="background-image:url(${ARTE_DO_MAPA}/${folha}.png)${extra}"></b>`;

export function renderJornada({ nova = null } = {}) {
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
      <div class="jnEstojo"><span class="jnEstojoRot">insígnias</span>${mapa.insignias.map(x => `<i class="jnInsignia${x.arte ? ' conhecida' : ''}${x.ganha ? ' ganha' : ''}${x.id && x.id === nova ? ' nova' : ''}"
          title="${x.nome ? `${x.nome} (${x.onde})${x.ganha ? '' : ' — ainda não é sua'}` : 'ainda não há ginásio aqui'}">${x.arte ? `<img src="${x.arte}" alt="">` : ''}</i>`).join('')}</div></div>
    <div class="jnMapa" style="--n:${mapa.nos.length}">
      <svg class="jnCaminho jnDeitado" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trilha(false)}</svg>
      <svg class="jnCaminho jnEmPe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trilha(true)}</svg>
      ${bordaDoMapa().map(p => `<div class="jnPos jnB" style="--x:${p.x};--y:${p.y}">${quadro('cuttable_tree', 'jnProp')}</div>`).join('')}
      ${mapa.nos.map(n => `<div class="jnPos jn-${n.estado}" style="--x:${n.x};--y:${n.y}">
          ${cenaDoNo(n).map(c => (c.forma ? `<b class="jnLago" style="--dx:${c.dx}px;--dy:${c.dy}px"></b>` : quadro(c.folha, 'jnProp', `;--dx:${c.dx}px;--dy:${c.dy}px`))).join('')}
          ${n.ow ? quadro(n.ow, 'jnOw') : ''}
          <button class="jnNo jn-${n.estado} jn-${n.tipo}${n.id === escolhido ? ' escolhido' : ''}" data-jn-no="${n.id}" title="${n.nome}"><i${n.tipo === 'ginasio' && n.estado === 'vencido' ? ` style="background-image:url(${arteDaInsignia(n.insignia)})"` : ''}></i><span>${n.nome}${n.lider ? `<em>líder ${n.lider} · ${n.licao?.tipo ?? ''}</em>` : ''}</span></button></div>`).join('')}
      ${onde && eu ? `<div class="jnPos jnVoce${onde.fim ? ' jnFim' : ''}" style="--x:${onde.x};--y:${onde.y};--ax:${onde.ao.x};--ay:${onde.ao.y}"><b class="jnEu"><img src="${eu}" alt="você"></b></div>` : ''}
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
  const no = ev.target.closest('[data-jn-no]');
  /* No estreito o painel vem ANTES do mapa (Q7 da ST-10.15): escolher um nó
     leva o olho de volta a ele. */
  if (no) { escolhido = no.dataset.jnNo; renderJornada(); if (matchMedia('(max-width:520px)').matches) $('#jnPainel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const lutar = ev.target.closest('[data-jn-lutar]');
  if (!lutar || lutar.disabled || !chanceNaTela) return;
  const id = lutar.dataset.jnLutar, antes = chanceNaTela;
  const r = lutarNaJornadaLocal({ pack: PACK, id, preset: presetDoJogador() });
  if (!r.ok) { $('#jnErro').textContent = r.motivo ?? 'não deu para lutar agora'; return; }
  const mapa = mapaDaJornada(PACK, r.progresso), proximo = mapa.nos.find(n => n.id === mapa.atual);
  /* A insígnia entra no RESULTADO também: o estojo fica lá em cima, fora da
     vista de quem está lendo o fim da luta. */
  const ganha = mapa.insignias.find(x => x.id === r.ganhouInsignia);
  const extra = r.ganhouInsignia ? `<span class="jnTrofeu"><img class="jnInsigniaFim" src="${arteDaInsignia(r.ganhouInsignia)}" alt="">
      <span><b>${ganha?.nome ?? 'A insígnia'} é sua.</b><span>${ganha?.onde ?? ''} · ${mapa.insignias.filter(x => x.ganha).length} de ${mapa.insignias.length} no estojo do mapa</span></span></span>` : r.primeiraVez ? (proximo ? `O caminho abriu: próximo, ${proximo.nome}.` : 'A jornada está completa.') : '';
  const t = treinador(PACK, PACK.jornada.find(n => n.id === id)?.rival);
  /* A lição fecha no fim da luta: quem agiu antes (Q7 da ST-10.14 — o fim só
     falava de "super-efetivo", que é a lição do ginásio anterior). */
  let licaoNoFim = '';
  if (PACK.jornada.find(n => n.id === id)?.licao?.mostra === 'vel') {
    const v = comparaVelocidade(PACK, r.timeA, r.timeB), nome = dex => nomeExibido(PACK.especies.find(e => e.dex === dex)?.n ?? '?');
    const rapido = v.deles.find(x => x.spe === v.alvo);
    /* A frase casa QUEM agiu antes com O QUE aconteceu: agir antes e perder é
       a fatia que a chance já dizia, e não a lição desmentida. */
    const venceu = r.resultado.vencedor === 'A';
    licaoNoFim = v.falta
      ? ` ${nome(rapido.dex)} agiu antes (${v.alvo} contra ${v.seu.spe})${venceu ? ', e desta vez você venceu mesmo assim.' : ': a lição deste ginásio.'}`
      : ` Você agiu antes (${nome(v.seu.dex)} ${v.seu.spe} contra ${nome(rapido.dex)} ${v.alvo})${venceu ? ': a lição deste ginásio.' : ', e desta vez não bastou.'}`;
  }
  const lic = PACK.jornada.find(n => n.id === id)?.licao;
  if (lic?.mostra === 'imune') {
    const pv = provaDaImunidade(PACK, r.timeA, r.resultado.eventos, lic.tipoGolpe), nome = dex => nomeExibido(PACK.especies.find(e => e.dex === dex)?.n ?? '?');
    const frase = x => (x.golpes ? `${nome(x.dex)} levou ${x.golpes} ${x.golpes === 1 ? 'golpe' : 'golpes'} de ${lic.tipo}: dano ${x.dano}`
      : `contra ${nome(x.dex)} o rival nem tentou ${lic.tipo}${x.outros.length ? ` — só ${x.outros.join(' e ')} (dano ${x.danoOutros})` : ''}`);
    const maiuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
    licaoNoFim = pv.length ? ` ${maiuscula(pv.map(frase).join('; '))}: a lição deste ginásio.` : ` Ninguém do seu time era imune a ${lic.tipo}: todo golpe acertou.`;
  }
  if (lic?.mostra === 'categoria') {
    const d = danoPorCategoria(PACK, r.resultado.eventos);
    licaoNoFim = ` Seus golpes físicos: ${d.fis.golpes}, dano ${d.fis.dano} · especiais: ${d.esp.golpes}, dano ${d.esp.dano} — a lição deste ginásio.`;
  }
  $('#jornadaCorpo')?.classList.add('emLuta');
  encenar({ alvo: $('#jnLuta'), A: r.timeA, B: r.timeB, r: r.resultado, antes, titulo: `${PACK.jornada.find(n => n.id === id)?.nome} · ${t.nome}`,
            extraNoFim: [licaoNoFim.trim(), fraseDoPagamento(PACK, r.recompensa, { depois: true }), extra].filter(Boolean).join(' '), voltar: 'voltar ao mapa', aoFim: () => { if (r.primeiraVez && proximo) escolhido = proximo.id; renderJornada({ nova: r.ganhouInsignia }); } });
});

/* Voltar ao mapa devolve o painel: enquanto o resultado está na tela, o
   painel do PRÓXIMO nó não aparece junto (duas mensagens, dois nós). Na fase
   de CAPTURA: o `pve-tela` esvazia a área da luta no clique, e depois disso o
   botão já não tem o `#jnLuta` acima dele (achado na captura da ST-10.13 —
   o painel não voltava). */
document.addEventListener('click', ev => {
  if (ev.target.closest('#jnLuta [data-pve-fechar]')) $('#jornadaCorpo')?.classList.remove('emLuta');
}, true);
