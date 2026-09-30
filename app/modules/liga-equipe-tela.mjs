/* A LEAGUE HOME NA TELA (ST-11.6a · Spec §12 telas 25–26) — camada 4.
 *
 * Pinta o que `homeDaLiga` decidiu (camada 0) e fala com o servidor: ler a
 * Liga, publicar o time e buscar partida. A busca guarda a CHAVE do pedido
 * até a resposta chegar: o clique repetido depois de uma resposta perdida
 * reenvia a mesma chave, e o servidor devolve a partida gravada em vez de
 * jogar outra (ST-11.2).
 *
 * A aba é a terceira do Time — "Liga de times" —, longe da aba Liga (a de
 * previsão): as duas nunca dividem tela nem tabela (§9.15).
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { dexImg } from './sprites.mjs';
import { api } from './api.mjs';
import { homeDaLiga, replayNaTela, rankingNaTela, pontosNaTela } from './liga-equipe-dados.mjs';
import { linhaDoLog, provaDaPartida } from './partida-dados.mjs';
import { montarPalco } from './liga-palco.mjs';
import { sortearArena } from './arenas-dados.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nomeDo = dex => nomeExibido((PACK.especies ?? []).find(e => e.dex === dex)?.n ?? '');
const novaChave = () => `le-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const lerPreset = () => { try { return localStorage.getItem('ar_treino_preset'); } catch { return null; } };
const gravarPreset = p => { try { localStorage.setItem('ar_treino_preset', p); } catch { /* privativo: vale só nesta visita */ } };

let dados = null, acabou = null, ocupado = false, chaveDaBusca = null, erro = null, ultimo = null, assistir = null, ranking = null, temporadaVista = null, pontos = null;

export async function renderLigaEquipe() {
  const alvo = $('#ligaEqCorpo');
  if (!alvo) return;
  const conta = api.temSessao();
  if (conta) {
    const [r, rk, pt] = await Promise.all([api.get('/api/equipe/liga'), api.get(`/api/equipe/ranking${temporadaVista ? `?temporada=${temporadaVista}` : ''}`),
                                           api.get('/api/equipe/pontos')]);
    dados = r.ok ? r.corpo : null;
    ranking = rk.ok ? rk.corpo : null;
    pontos = pt.ok ? pt.corpo : null;
  }
  ultimo = homeDaLiga({ conta, dados, pack: PACK, agora: Date.now(), preset: lerPreset(), acabou });
  pintar(alvo, ultimo);
}

function pintar(alvo, h) {
  const b = h.barra;
  const barra = b ? `<div class="leTemporada">
      <div class="leTempTopo"><b>${esc(b.titulo)}</b><span class="leFase">${esc(b.fase)}</span><span>${esc(b.dia)}</span><span class="leResta">${esc(b.resta)}</span></div>
      <div class="leBarra" role="img" aria-label="${esc(`${b.fase}, ${b.dia}`)}">${b.fatias.map(f => `<i class="${f.atual ? 'on' : ''}" style="width:${f.largura}%"><em>${esc(f.nome)}</em></i>`).join('')}<u style="left:${b.hoje}%"></u></div>
      <p class="leDica">${esc(b.dica)}</p></div>` : '';
  const tier = h.tier ? `<div class="leTier leTier${esc(h.tier.nome)}"><span class="leTierRot">seu tier</span><b>${esc(h.tier.nome)}</b><span>${esc(h.tier.nota)}</span>
      <ol class="leEscada" aria-label="os tiers da Liga">${h.tier.escada.map(x => `<li class="${x.estado}"><span>${esc(x.nome)}</span></li>`).reverse().join('')}</ol></div>` : '';
  const time = h.time ? `<div class="leTime"><span class="leRot">time publicado · ${esc(h.time.preset)} · power ${h.time.power}</span>
      <div class="leMembros">${h.time.membros.map(m => `<span class="leMembro">${dexImg(m.dex, nomeDo(m.dex), 'class="leSprite"')}<i>NV ${m.nivel}</i></span>`).join('')}</div></div>` : '';
  const presets = h.mostraPresets ? `<div class="lePresets"><span class="leRot">${esc(h.rotuloPresets)}</span>${h.presets.map(p => `<button class="tbPresetBtn${p.on ? ' on' : ''}" data-le-preset="${p.id}" title="${esc(p.explica)}">${esc(p.nome)}</button>`).join('')}</div>` : '';
  const botoes = !h.acao ? '' : `<div class="leAcoes"><button class="btn primary leAcao" data-le-acao="${h.acao.tipo}"${h.acao.habilitada && !ocupado ? '' : ' disabled'}>${esc(ocupado ? 'Lutando…' : h.acao.rotulo)}</button>
      ${h.secundaria ? `<button class="btn leSec" data-le-acao="${h.secundaria.tipo}"${ocupado ? ' disabled' : ''}>${esc(h.secundaria.rotulo)}</button>` : ''}</div>`;
  const linha = (r, grande = false) => `<li class="leLinha le${r.classe}${grande ? ' leGrande' : ''}${r.selo.tipo === 'fora' ? ' leNeutro' : ''}">
      <span class="leResCel"><b class="leRes">${esc(r.titulo)}</b><em class="leSelo leSelo${r.selo.tipo}">${esc(r.selo.texto)}</em>${r.pontos ? `<em class="lePts${r.pontos.startsWith('0') ? ' zero' : ''}">${esc(r.pontos)}</em>` : ''}</span><span class="leContra">${esc(r.contra)}${r.bot ? ` <em class="leBot">${esc(r.bot)}</em>` : ''}</span>
      ${r.explica ? `<span class="leRank">${esc(r.explica)}</span>` : '<span></span>'}<span class="leTurnos">${esc([r.turnos, r.quando].filter(Boolean).join(' · '))}</span>
      <button class="leVer" data-le-replay="${esc(r.id)}" title="rever a partida, golpe a golpe">▶ replay</button></li>`;
  const resultado = h.resultado ? `<ul class="leResultado">${linha(h.resultado, true)}</ul>` : '';
  const recentes = h.recentes?.length ? `<div class="leRecentes"><span class="leRot">últimas partidas</span><ul>${h.recentes.map(r => linha(r)).join('')}</ul></div>`
    : h.semHistorico ? '<div class="leRecentes"><span class="leRot">últimas partidas</span><p class="leVazio">Nenhuma partida ainda — a primeira busca acha um adversário da sua faixa, ou um bot identificado.</p></div>' : '';
  const passos = h.passos ? `<ol class="lePassos">${h.passos.map(p => `<li class="${p.bloqueado ? 'leBloq' : ''}"><b>${p.bloqueado ? '✕' : p.n}</b><span><strong>${esc(p.titulo)}</strong>${esc(p.texto)}</span></li>`).join('')}</ol>` : '';
  alvo.innerHTML = `<div class="leHome le-${h.estado}">
    ${barra}${tier ? '' : passos}
    <div class="lePainel${tier ? '' : ' leSoCentro'}${tier && pontos ? ' leComPontos' : ''}">${tier}<div class="leCentro">${time}${presets}${h.aviso ? `<p class="leAviso">${h.titulo ? `<strong>${esc(h.titulo)}</strong>` : ''}${esc(h.aviso)}</p>` : ''}${erro ? `<p class="leErro">${esc(erro)}</p>` : ''}${botoes}</div>${tier ? pintarPontos(pontosNaTela(pontos, h.tier.nome)) : ''}</div>
    ${tier ? passos : ''}<div id="leReplay" class="pveArea" hidden></div>${resultado}<div class="leBaixo">${recentes}${h.tier ? pintarRanking(rankingNaTela(ranking)) : ''}</div></div>`;
}

/* OS LEAGUE POINTS (ST-11.7b): quanto tenho, como ganho, o que a virada faz — e as insígnias. */
function pintarPontos(k) {
  if (!k) return '';
  const insignias = k.insignias.length
    ? `<ul class="lePtInsignias">${k.insignias.map(i => `<li class="lePtInsignia leTier${esc(i.tier)}" title="${esc(i.titulo)}"><b>${esc(i.rotulo)}</b><span>${esc(i.tier)}</span><i>${esc(i.posicao)}</i></li>`).join('')}</ul>`
    : `<p class="lePtNota">${esc(k.semInsignias)}</p>`;
  return `<section class="lePontos" aria-label="${esc(k.titulo)}">
    <div class="lePtTopo"><span class="leRot">${esc(k.titulo)}</span><span class="lePtSaldo"><i class="lePtMoeda" aria-hidden="true"></i><b>${esc(k.saldo)}</b><em>${esc(k.unidade)}</em></span></div>
    <ul class="lePtGanhos">${k.ganhos.map(g => `<li><b>${esc(g.valor)}</b>${esc(g.rotulo)}</li>`).join('')}</ul>
    <p class="lePtNota">${esc(k.teto)}</p>
    ${k.extrato.length ? `<ul class="lePtExtrato">${k.extrato.map(l => `<li class="${l.classe}"><span>${esc(l.texto)}</span><b>${esc(l.valor)}</b></li>`).join('')}</ul>` : `<p class="lePtNota">${esc(k.semExtrato)}</p>`}
    <p class="lePtVirada">${esc(k.virada)}<span class="lePtUso">${esc(k.uso)}</span></p>
    <span class="leRot lePtRotIns">insígnias de temporada</span>${insignias}</section>`;
}

/* O RANKING (ST-11.6c): a tabela da Liga de times, e só dela. */
function pintarRanking(k) {
  const linha = x => `<li class="leRkLinha${x.eu ? ' eu' : ''}"><b class="leRkPos${x.medalha ? ` ${x.medalha}` : ''}">${esc(x.posicao)}</b><span class="leRkNome">${esc(x.nome)}${x.eu ? ' <em>você</em>' : ''}</span>
      <span class="leRkTier leTier${esc(x.tier)}">${esc(x.tier)}</span><span class="leRkPartidas">${esc(x.partidas)}</span></li>`;
  return `<section class="leRanking"><div class="leRkTopo"><span class="leRot">ranking da liga de times</span>
      ${k.abas.length ? `<div class="leRkAbas" role="tablist"><span class="leRkVer">ver:</span>${k.abas.map(a => `<button class="leRkAba${a.on ? ' on' : ''}" role="tab" data-le-temporada="${a.temporada ?? ''}">${esc(a.rotulo)}</button>`).join('')}</div>` : `<span class="leRkSem">${esc(k.semAnteriores ?? '')}</span>`}</div>
    ${k.titulo ? `<p class="leRkTitulo"><b>${esc(k.titulo)}</b> <span>${esc(k.nota)}</span></p>` : ''}
    ${k.vazio ? `<p class="leVazio">${esc(k.vazio)}</p>` : `<ol class="leRkLista">${k.linhas.map(linha).join('')}${k.foraDoTopo ? `<li class="leRkReticencia">…</li>${linha(k.foraDoTopo)}` : ''}</ol>`}
    ${k.suaPosicao ? `<p class="leRkSua">${esc(k.suaPosicao)}</p>` : ''}${k.ordem && !k.vazio ? `<p class="leRkOrdem">${esc(k.ordem)}</p>` : ''}</section>`;
}

async function publicar() {
  const r = await api.post('/api/equipe/publicar', { preset: lerPreset() ?? 'balanced' });
  erro = r.ok ? null : (r.corpo?.erro ?? 'o servidor não respondeu — nada foi publicado');
}

async function buscar() {
  if (!dados?.meuTime) return;
  chaveDaBusca ??= novaChave();
  const r = await api.post('/api/equipe/buscar', { meu: dados.meuTime.id, chaveIdem: chaveDaBusca });
  if (r.indisponivel) { erro = 'a resposta não chegou — buscar de novo reenvia o MESMO pedido, sem jogar outra partida'; return; }
  chaveDaBusca = null;
  if (r.ok) { acabou = r.corpo.partida.id; erro = null; assistir = acabou; } else erro = r.corpo?.erro ?? 'a busca foi recusada';
}

/* O REPLAY (ST-11.6b): a partida pelo link dela, encenada SÓ do log, com o
   lado do jogador à esquerda; a prova da semente chega depois e troca a linha
   do topo. */
async function verReplay(id) {
  const linha = [ultimo?.resultado, ...(ultimo?.recentes ?? [])].find(x => x?.id === id);
  const r = await api.get(`/api/equipe/partida?id=${encodeURIComponent(id)}`);
  if (!r.ok || !linha) { erro = 'o replay não abriu — o servidor não respondeu'; renderLigaEquipe(); return; }
  const p = r.corpo.partida, alvo = $('#leReplay'), t = replayNaTela(linha, null);
  /* O PALCO DA ARENA (ST-11.6d): a ilha sai da semente da partida, como a da aposta sai da raiz da rodada. */
  montarPalco(alvo, { linha: linhaDoLog(p.log, nomeDo, linha.lado), arena: sortearArena(p.semente), final: t.fim, topo: esc(t.prova),
    titulo: esc(t.topo), voltar: 'fechar', rotulos: { A: esc(t.rotulos.A), B: esc(t.rotulos.B) } });
  const prova = replayNaTela(linha, await provaDaPartida(p));
  const topo = alvo?.querySelector('.pveTopo span');
  if (topo) { topo.textContent = prova.prova; topo.title = prova.provaDetalhe; topo.classList.toggle('leProva', true); topo.classList.toggle('leProvaMal', prova.provaOk === false); }
}

document.addEventListener('liga-equipe:abrir', () => { acabou = null; renderLigaEquipe(); });

document.addEventListener('click', async ev => {
  const aba = ev.target.closest('[data-le-temporada]');
  if (aba) { temporadaVista = aba.dataset.leTemporada ? Number(aba.dataset.leTemporada) : null; renderLigaEquipe(); return; }
  const rp = ev.target.closest('[data-le-replay]');
  if (rp) { verReplay(rp.dataset.leReplay); return; }
  const p = ev.target.closest('[data-le-preset]');
  if (p) { gravarPreset(p.dataset.lePreset); renderLigaEquipe(); return; }
  const a = ev.target.closest('[data-le-acao]');
  if (!a || a.disabled || ocupado) return;
  const tipo = a.dataset.leAcao;
  if (tipo === 'entrar') { $('#btnLogin')?.click(); return; }
  ocupado = true; renderLigaEquipe();
  try { if (tipo === 'publicar') await publicar(); else if (tipo === 'buscar') await buscar(); }
  finally {
    ocupado = false; await renderLigaEquipe();
    /* A partida que a busca acabou de jogar ABRE no palco, como a luta da aposta abre depois do sino. */
    if (assistir) { const id = assistir; assistir = null; verReplay(id); }
  }
});
