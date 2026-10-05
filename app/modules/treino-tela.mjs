/* O TEAM BUILDER — a tela (ST-10.7 · F4.2 · Spec §8.1.1, §8.3, §12 telas 20–21).
 *
 * Camada 4: pinta o que `treino-dados.mjs` devolve, e FATIA por quadro o Monte
 * Carlo da chance (ST-10.5) e das trocas (ST-10.6). O jogador troca um membro
 * e vê o número mexer — o mecanismo inteiro da fase (§8.1).
 *
 * ── O CÁLCULO SE CANCELA SOZINHO ─────────────────────────────────────────
 *
 * Cada pintura abre uma GERAÇÃO. Um pedaço de cálculo que acorda numa geração
 * velha (o jogador trocou de adversário no meio) só volta, sem pintar: número
 * de outro time na tela é o pior defeito que esta tela pode ter.
 *
 * Os números saem da raiz 1 — fixa de propósito. O mesmo time contra o mesmo
 * rival mostra sempre o mesmo número; o que muda o número é o jogador.
 */
import { $ } from './dom.mjs';
import { avisar } from './dialogo.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { dexImg } from './sprites.mjs';
import { painelDoTime, treinadoresDo, treinador, rivalDe, entradasDoTime, candidatosDaCaixa, membrosParaTrocas,
         PARTES_DO_POWER } from './treino-dados.mjs';
import { lote, resumo, textoDaMargem, maiorFraqueza, porcentagemExibida, SIMS_TREINO } from '../../engine/treino-preco.mjs';
import { variantes, lotePareado, trocasDoAcumulado, textoDaTrocaFeita, SIMS_TROCAS } from '../../engine/treino-trocas.mjs';
import { moverNa, trocarNa } from './colecao-acoes.mjs';   // ST-13.5d: com conta, pelo servidor
import { PRESETS_NA_TELA, presetValido } from './treino-dados.mjs';
import { renderIdle } from './idle-tela.mjs';

const RAIZ = 1;
const CHAVE_ADV = 'ar_treino_adv';
const advLembrado = () => { try { return localStorage.getItem(CHAVE_ADV); } catch { return null; } };
/* ST-10.8: o preset do time, lembrado por aparelho, como o rival. */
const CHAVE_PRESET = 'ar_treino_preset';
const presetLembrado = () => { try { return presetValido(localStorage.getItem(CHAVE_PRESET)); } catch { return presetValido(null); } };
let geracao = 0;
/* A última troca feita: fica na tela enquanto as novas sugestões são medidas
   (Q7: o salto de 0% a 97% passava sem confirmação). */
let ultimaTroca = null;
let trocasNaTela = [], nomeNaTela = id => id;

const cor = t => PACK.tipos?.cores?.[t] ?? '#888';
const chip = x => `<i class="tbTipo" style="--c:${cor(x.t)}">${x.nome}</i>`;

function membro(m, podeTirar) {
  const partes = PARTES_DO_POWER.map(p => ({ ...p, v: m.power.partes[p.k] }));
  return `<div class="tbMembro">
    <div class="tbTopo">${dexImg(m.dex, m.nome, 'class="tbSprite"')}
      <div><b>${m.nome}</b> <span class="tbNv">NV ${m.nivel}</span><div>${m.tipos.map(chip).join(' ')}</div></div>
      <span class="tbPower" title="poder: a soma das quatro partes abaixo">${m.power.total}</span></div>
    <div class="tbBarra">${partes.map(p => `<i class="p-${p.k}" style="flex:${p.v}"></i>`).join('')}</div>
    <div class="tbPartes"><span class="tbIgual">poder ${m.power.total} =</span>${partes.map(p => `<span class="p-${p.k}">${p.rotulo} <b>${p.k === 'potencial' ? '+' : ''}${p.v}</b>${p.k === 'potencial' && m.potencial != null ? ` <i class="tbPot" title="o potencial dela, de 0 a 100 — a soma dos seis valores escondidos que nasceram com ela">(${m.potencial}/100)</i>` : ''}</span>`).join('')}</div>
    <ul class="tbGolpes">${m.golpes.map(g => `<li><b>${g.n}</b> <span>${g.tipo} · ${g.cat} · ${g.p}</span></li>`).join('')}</ul>
    <details class="tbBuild"><summary>ver build</summary>
      <div class="tbFicha">${Object.entries({ vida: 'Vida', atq: 'Ataque', def: 'Defesa', esp: 'Esp. Atq', espDef: 'Esp. Def', vel: 'Velocidade' })
        .map(([k, r]) => `<span>${r} <b>${m.ficha[k]}</b></span>`).join('')}</div>
      <p class="tiny">No nível ${m.nivel}, ficha do treino e da Jornada. Na arena 6×6 vale o time publicado; a arena comum usa outro combate.</p>
    </details>
    <div class="tbAcoes">
      <button class="btn" data-goto="viewIdle" title="os golpes se escolhem no Centro das Rotas">escolher golpes →</button>
      ${podeTirar ? `<button class="btn" data-time-tirar="${m.id}">tirar do time</button>` : ''}
    </div>
  </div>`;
}

export function renderTreino() {
  const alvo = $('#treinoCorpo');
  if (!alvo) return;
  const g = ++geracao;
  const estado = carregar();
  const painel = painelDoTime({ pack: PACK, estado, nomeDe: nomeExibido });
  if (painel.vazio) {
    alvo.innerHTML = `<p class="tbVazio">Aqui você monta o time e vê a chance de vencer cada rival mudar a cada troca.
      Você ainda não tem criaturas: escolha o seu inicial nas Rotas — o time nasce com ele.</p>
      <button class="btn gold" data-goto="viewIdle">ir para as Rotas →</button>`;
    return;
  }
  const t = treinador(PACK, advLembrado());
  const rival = rivalDe(PACK, t);
  const tiposDo = dex => (PACK.especies.find(e => e.dex === dex)?.t ?? []).map(t => ({ t, nome: PACK.tipos?.nomes?.[t] ?? t }));
  const nomeDo = dex => nomeExibido(PACK.especies.find(e => e.dex === dex)?.n ?? '?');
  alvo.innerHTML = `
    <div class="tbAdv">${treinadoresDo(PACK).map(x => `<button class="tbAdvBtn${x.id === t.id ? ' on' : ''}" data-treino-adv="${x.id}">
      <b>${x.nome}</b><span>${x.onde}</span></button>`).join('')}</div>
    <div class="tbPresets"><span class="tiny">estratégia do seu time:</span>${PRESETS_NA_TELA.map(p => `<button class="tbPresetBtn${
      p.id === presetLembrado() ? ' on' : ''}" data-treino-preset="${p.id}" title="${p.explica}">${p.nome}</button>`).join('')}
      <span class="tbPresetRegra">${PRESETS_NA_TELA.find(p => p.id === presetLembrado())?.explica ?? ''}</span></div>
    <div class="tbPlacar">
      <div class="tbChance"><span class="tbRotulo">seu time vence contra ${t.nome}</span><strong id="tbNumero">…</strong><span id="tbErro" class="tbErro">calculando</span></div>
      <div class="tbRival">${rival.map(r => `<span>${dexImg(r.dex, '', 'class="tbSpriteP"')}<b>${nomeDo(r.dex)}</b><i>NV ${r.nivel}</i>
        <em>${tiposDo(r.dex).map(chip).join('')}</em></span>`).join('')}</div>
      <p class="tbFraqueza" id="tbFraqueza"></p>
      <button class="btn gold tbLutar" id="tbLutar" data-pve-lutar data-adv="${t.id}" disabled>lutar contra ${t.nome}</button>
    </div>
    <div id="pveArea" class="pveArea" hidden></div>
    <h4 class="tbSec">Trocas que sobem a chance <span class="tiny">medidas com as mesmas lutas do número acima</span></h4>
    <div id="tbTrocas" class="tbTrocas">${ultimaTroca ? `<p class="tbFeita">${ultimaTroca}</p>` : ''}<p class="tiny">procurando…</p></div>
    <h4 class="tbSec">Seu time <span class="tiny">${painel.membros.length} de 6 · poder ${painel.total}${
      painel.fraquezas.length ? ` · em geral, fraco contra ${painel.fraquezas.map(f => f.nome).join(', ')}` : ''}</span></h4>
    <div class="tbGrade">${painel.membros.map(m => membro(m, painel.membros.length > 1)).join('')}</div>
    <h4 class="tbSec">Na caixa <span class="tiny">${painel.caixa.length} criatura(s)${painel.vagas ? '' : ' · o time está cheio: para pôr alguém, use uma troca'}</span></h4>
    <div class="tbCaixa">${painel.caixa.map(c => `<div class="tbCaixaItem">${dexImg(c.dex, c.nome, 'class="tbSpriteP"')}
      <span><b>${c.nome}</b> NV ${c.nivel}</span><span class="tbPower">${c.power.total}</span>
      <button class="btn" data-time-por="${c.id}" ${painel.vagas ? '' : 'disabled title="o time já tem seis — use uma troca"'}>pôr no time</button></div>`).join('')
      || '<p class="tiny">A caixa está vazia: capture nas Rotas para ter com quem trocar.</p>'}</div>`;
  /* A 420 as abas rolam numa linha: a do rival escolhido fica à vista (Q5). */
  const on = alvo.querySelector('.tbAdvBtn.on'), faixa = on?.parentElement;
  if (on && faixa && faixa.scrollWidth > faixa.clientWidth) faixa.scrollLeft = on.offsetLeft - faixa.offsetLeft - 16;
  calcular(g, estado, rival);
}

function calcular(g, estado, rival) {
  const preset = presetLembrado();
  const A = entradasDoTime(PACK, estado);
  const f = maiorFraqueza(PACK, A, rival);
  const alvoF = $('#tbFraqueza');
  if (alvoF) alvoF.textContent = f ? `contra este rival: ${f.texto}` : '';
  const acum = { vitorias: 0, empates: 0, sims: 0 };
  const PASSO = 100;
  const passo = () => {
    if (g !== geracao) return;
    lote(PACK, A, rival, RAIZ, acum.sims, Math.min(PASSO, SIMS_TREINO - acum.sims), acum, preset);
    const r = resumo(acum), pronto = acum.sims >= SIMS_TREINO;
    const n = $('#tbNumero'), e = $('#tbErro');
    if (n) { n.textContent = porcentagemExibida(r.p); n.classList.toggle('parcial', !pronto); }
    if (e) e.textContent = pronto ? textoDaMargem(r) : `calculando · ${acum.sims} de ${SIMS_TREINO} lutas`;
    if (pronto) {
      /* ST-10.9: a luta só acende com a chance de ANTES calculada — o resultado
         compara o que aconteceu com ela. */
      const lb = $('#tbLutar');
      if (lb) Object.assign(lb.dataset, { p: r.p, erro: r.erro, sims: r.sims, preset }), lb.disabled = false;
    }
    if (!pronto) setTimeout(passo, 0); else calcularTrocas(g, estado, rival);
  };
  setTimeout(passo, 0);
}

function calcularTrocas(g, estado, rival) {
  const preset = presetLembrado();
  const alvo = $('#tbTrocas');
  const vars = variantes(membrosParaTrocas(PACK, estado), candidatosDaCaixa(PACK, estado));
  if (vars.length < 2) { if (alvo) alvo.innerHTML = '<p class="tiny">Sem candidatos na caixa.</p>'; return; }
  const nome = id => nomeExibido(PACK.especies.find(e => e.dex === estado.criaturas.find(c => c.id === id)?.dex)?.n ?? '?');
  const dexDe = id => estado.criaturas.find(c => c.id === id)?.dex;
  let a = null, feitos = 0;
  const PASSO = 20;
  const passo = () => {
    if (g !== geracao) return;
    a = lotePareado(PACK, vars, rival, RAIZ, feitos, Math.min(PASSO, SIMS_TROCAS - feitos), a, preset);
    feitos = a.sims;
    const el = $('#tbTrocas');
    if (!el) return;
    const feita = ultimaTroca ? `<p class="tbFeita">${ultimaTroca}</p>` : '';
    if (feitos < SIMS_TROCAS) { el.innerHTML = `${feita}<p class="tiny">procurando novas trocas · ${feitos} de ${SIMS_TROCAS} lutas por troca</p>`; setTimeout(passo, 0); return; }
    const trocas = trocasDoAcumulado(vars, a);
    trocasNaTela = trocas; nomeNaTela = nome;
    el.innerHTML = feita + (trocas.length ? trocas.map(x => `<div class="tbTroca">
        ${dexImg(dexDe(x.sai), '', 'class="tbSpriteP"')}<span class="tbSeta">→</span>${dexImg(dexDe(x.entra), '', 'class="tbSpriteP"')}
        <span class="tbFrase">trocar <b>${nome(x.sai)}</b> por <b>${nome(x.entra)}</b>
          <span class="tbDelta">${porcentagemExibida(x.antes)} → <b>${porcentagemExibida(x.p)}</b></span></span>
        <button class="btn gold" data-trocar-sai="${x.sai}" data-trocar-entra="${x.entra}">trocar</button></div>`).join('')
      : '<p class="tiny">Nenhuma troca da caixa sobe a chance além do erro — o time já é o melhor que você tem para este rival. Poder maior não garante vitória: quem decide é a luta.</p>');
  };
  setTimeout(passo, 0);
}

/* D-150: a recusa DIZ por quê, e a tela se repinta assim mesmo — a recusa
   quase sempre quer dizer que a tela estava velha (outra aba, outro clique),
   e calar deixava os mesmos botões a recusar de novo. */
const depois = r => {
  if (r?.ok === false) avisar(r.motivo ?? 'não deu para mudar o time — tente de novo');
  renderTreino(); try { renderIdle(); } catch { /* aba fechada */ }
};
/* Um pedido por vez: o duplo clique não manda o segundo. */
let mexendo = false;
const umPorVez = async fn => { if (mexendo) return; mexendo = true; try { depois(await fn()); } finally { mexendo = false; } };

document.addEventListener('click', async ev => {
  const adv = ev.target.closest('[data-treino-adv]');
  if (adv) { try { localStorage.setItem(CHAVE_ADV, adv.dataset.treinoAdv); } catch { /* privativo */ } ultimaTroca = null; renderTreino(); return; }
  const pr = ev.target.closest('[data-treino-preset]');
  if (pr) { try { localStorage.setItem(CHAVE_PRESET, pr.dataset.treinoPreset); } catch { /* privativo */ } ultimaTroca = null; renderTreino(); return; }
  const tirar = ev.target.closest('[data-time-tirar]');
  if (tirar) { umPorVez(() => moverNa({ id: tirar.dataset.timeTirar, paraCaixa: true })); return; }
  const por = ev.target.closest('[data-time-por]');
  if (por) { umPorVez(() => moverNa({ id: por.dataset.timePor, paraCaixa: false })); return; }
  const tr = ev.target.closest('[data-trocar-sai]');
  if (tr) {
    const escolhida = trocasNaTela.find(x => x.sai === tr.dataset.trocarSai && x.entra === tr.dataset.trocarEntra);
    umPorVez(async () => {
      const r = await trocarNa({ sai: tr.dataset.trocarSai, entra: tr.dataset.trocarEntra });
      if (r?.ok !== false && escolhida) ultimaTroca = textoDaTrocaFeita(escolhida, nomeNaTela);
      return r;
    });
  }
});
