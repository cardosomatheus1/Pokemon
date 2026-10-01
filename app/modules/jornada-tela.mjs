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
import { especieDe } from '../../engine/especie.mjs';
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { dexImg } from './sprites.mjs';
import { miniMapa, rioDoMapa } from './jornada-mundo.mjs';
import { pintarChao } from './jornada-chao-tela.mjs';
import { setasNaEstrada } from './jornada-estrada.mjs';
import { setasDoCaminho, faixaDoCaminho, avisoDoRisco, leituraDoChefe, ARTE_NOSSA_DO_MAPA, mostraNome, corDoNo, cruzaOCaminho } from './jornada-dados.mjs';
import { mapaDaJornada, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, arteDaInsignia, comparaVelocidade, imunesNoTime, tiposImunes, provaDaImunidade, ladoFraco, danoPorCategoria, pagamentoDoNo, fraseDoPagamento, resistenciaNoTime, tiposQueResistem, provaDaResistencia, ameacaDoRival, turnosDaAmeaca, provaDoPreset, multiplicadoresNoRival, tiposQueBatemEmTodos, provaDoDuplo, leituraDoDuplo, ARTE_DO_MAPA } from './jornada-dados.mjs';
import { diaDoMundo } from '../../engine/avanco.mjs';
import { entradasDoTime, rivalDe, treinador, presetValido, candidatosDaCaixa, membrosParaTrocas } from './treino-dados.mjs';
import { correcaoDaLicao, aplicarCorrecao } from './jornada-correcao.mjs';
import { trocarNa, lutarNaJornadaNa } from './colecao-acoes.mjs';   // ST-13.5d/e: com conta, pelo servidor
import { relatarChance } from './telemetria-v4-tela.mjs';
import { lote, resumo, porcentagemExibida, textoDaMargem, SIMS_TREINO } from '../../engine/treino-preco.mjs';
import { RAIZ_DA_CHANCE as RAIZ } from './jornada-conta.mjs';
import { encenar } from './pve-tela.mjs';
import { renderTreino } from './treino-tela.mjs';
import { folhaVestida, carregar as carregarGuardaRoupa } from './outfit-acervo.mjs';

const presetDoJogador = () => { try { return presetValido(localStorage.getItem('ar_treino_preset')); } catch { return 'balanced'; } };
let escolhido = null, geracao = 0, chanceNaTela = null, correcaoNaTela = null, aplicada = null;

function pintarPainel(mapa) {
  const alvo = $('#jnPainel');
  const no = mapa.nos.find(n => n.id === escolhido) ?? mapa.nos.find(n => n.id === mapa.atual) ?? mapa.nos.at(-1);
  if (!alvo || !no) return;
  escolhido = no.id; chanceNaTela = null; correcaoNaTela = null;
  const t = treinador(PACK, no.rival), rival = rivalDe(PACK, t);
  const nomeDo = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
  /* Título, e LOGO a decisão (chance e botão): em 420 px a chance estava a
     1.080 px do topo, fora da tela (Q7 da ST-10.13). Nó vencido: o estado
     diz "vencido", e a revanche é ação secundária — a insígnia não repete. */
  const vencido = no.estado === 'vencido';
  /* ST-10.22a · L-209: o chefe não tem lição medida — a leitura sai do que ele
     é (os tipos dos golpes, a vida de chefe), pela camada 0. */
  const chefe = no.tipo === 'chefe' && !no.licao ? leituraDoChefe(PACK, [], rival) : null;
  const nomeTipo = tp => PACK.tipos.nomes?.[tp] ?? tp;
  alvo.innerHTML = `<h4 class="jnTitulo">${no.nome}${no.tipo === 'ginasio' ? ` <span class="jnSelo">ginásio${no.lider ? ` · líder ${no.lider}` : ''}</span>` : no.tipo === 'chefe' ? ' <span class="jnSelo jnSeloChefe">chefe · lendário</span>' : no.tipo === 'liga' ? ` <span class="jnSelo jnSeloLiga">${no.selo ?? ''}</span>` : ''}</h4>
    <div class="jnChance${vencido ? ' jnVencido' : ''}">${vencido ? `<span class="jnFeitoSelo">${no.insignia ? `<img src="${arteDaInsignia(no.insignia)}" alt="">` : ''}vencido ✓</span>` : ''}
      <span class="tiny">seu time vence</span><strong id="jnNumero">…</strong><span class="tiny" id="jnErro">calculando</span>
      <span class="tiny jnCausa" id="jnCausa" hidden></span>
      <span class="tiny jnRisco" id="jnRisco" hidden><span id="jnRiscoTxt">arriscado</span> — <button class="lnk" data-treino-aba="time">reforce o time</button></span>
      <button class="btn gold jnCorrige" id="jnCorrige" data-jn-corrige hidden></button>
      <span class="tiny jnPaga">${fraseDoPagamento(PACK, pagamentoDoNo(no, carregar().jornada?.pve, diaDoMundo(Date.now())))}</span>
      <button class="btn${vencido ? '' : ' gold'} jnCta" id="jnLutar" data-jn-lutar="${no.id}" disabled>${no.estado === 'trancado' ? 'trancado' : vencido ? 'revanche (treino)' : `lutar contra ${t.nome.replace(/^(O|A) /, m => m.toLowerCase())}`}</button></div>
    <div class="jnInfo"><p class="jnFrase">${fraseDoNo(no, t.nome)}</p>
      ${no.licao ? `<p class="jnLicao">${arteDaInsignia(no.insignia ?? no.revisa?.insignia) ? `<img src="${arteDaInsignia(no.insignia ?? no.revisa?.insignia)}" alt="">` : ''}<span><b>${no.revisa ? `Revisa ${no.revisa.nome}` : no.final ? 'A lição final' : 'Ensina'}: ${no.licao.ensina}.</b> ${no.lider ?? t.nome} usa ${no.licao.tipo}. ${no.licao.dica}</span></p>` : ''}
      ${chefe ? `<p class="jnLicao jnLicaoChefe">${dexImg(chefe.dex, '', 'class="jnSprite"')}<span><b>O chefe aguenta ${chefe.vidaX} vezes a vida de um ${nomeDo(chefe.dex)} NV ${chefe.nivel}.</b> Os golpes dele são de ${chefe.tipos.map(nomeTipo).join(' e ')}: quem apanha pouco deles dura a luta${chefe.resistem.length ? ` — ${chefe.resistem.map(nomeTipo).join(' e ')} resiste${chefe.resistem.length > 1 ? 'm' : ''} a todos` : ''}.</span></p>` : ''}
      <div id="jnVel"></div>
      <p class="jnRival">${t.nome}: ${rival.map(r => `<span>${dexImg(r.dex, '', 'class="jnSprite"')}${nomeDo(r.dex)} <i>NV ${r.nivel}</i></span>`).join('')}</p></div>`;
  const g = ++geracao, A = entradasDoTime(PACK, carregar()), preset = presetDoJogador();
  if (!A.length) { $('#jnErro').textContent = 'o time está vazio — escolha o inicial nas Rotas'; return; }
  if (chefe) {
    const lc = leituraDoChefe(PACK, A, rival), frac = m => (m === 0 ? 'nada' : m === 0.25 ? '¼' : m === 0.5 ? '½' : m > 1 ? `${m}×` : 'cheio');
    $('#jnVel').innerHTML = `<div class="jnImune"><b>quanto os golpes de ${t.nome} (${lc.tipos.map(nomeTipo).join(' e ')}) machucam</b>${lc.machuca.map(x =>
      `<span class="${x.mult <= 0.5 ? 'sim' : 'nao'}">${dexImg(x.dex, '', 'class="jnSprite"')}${nomeDo(x.dex)} <i>apanha ${frac(x.mult)}${x.mult <= 0.5 ? ' ✓' : ''}</i></span>`).join('')}</div>`;
  }
  /* A lição da velocidade com a velocidade NA TELA: o seu mais rápido, e quem
     dos rivais ele passa. */
  /* ST-10.19a: a lição da RESISTÊNCIA — quanto os golpes da líder machucam
     cada criatura sua, e o que levar se ninguém resiste. */
  if (no.licao?.mostra === 'resiste') {
    const rs = resistenciaNoTime(PACK, A, no.licao.tiposGolpe), causa = $('#jnCausa');
    const nomeT = t => PACK.tipos.nomes?.[t] ?? t;
    const frac = m => (m === 0 ? 'nada' : m < 1 ? `${m === 0.25 ? '¼' : '½'}` : m > 1 ? `${m}×` : 'cheio');
    $('#jnVel').innerHTML = `<div class="jnImune"><b>quanto os golpes de ${no.lider ?? t.nome} (${no.licao.tiposGolpe.map(nomeT).join(' e ')}) machucam</b>${rs.map(x =>
      `<span class="${x.mult <= 0.5 ? 'sim' : 'nao'}">${dexImg(x.dex, '', 'class="jnSprite"')}${nomeDo(x.dex)} <i>${x.mult <= 0.5 ? `apanha ${frac(x.mult)} ✓` : `apanha ${frac(x.mult)}`}</i></span>`).join('')}</div>`;
    if (causa) {
      const bons = rs.filter(x => x.mult <= 0.5);
      causa.hidden = false;
      causa.className = `tiny jnCausa ${bons.length ? 'passa' : 'nao'}`;
      /* A saída em CRIATURA quando a caixa tem quem resista (Q7 da ST-10.19a:
         "leve um Venenoso" dava tipo, e não a troca). */
      const daCaixa = resistenciaNoTime(PACK, candidatosDaCaixa(PACK, carregar()).map(x => x.entrada), no.licao.tiposGolpe).filter(x => x.mult <= 0.5);
      const pior = [...rs].sort((a, b) => b.mult - a.mult)[0];
      causa.textContent = bons.length ? `${bons.map(x => nomeDo(x.dex)).join(' e ')} ${bons.length > 1 ? 'resistem' : 'resiste'} aos golpes de ${no.lider ?? t.nome}`
        : daCaixa.length ? `ninguém do seu time resiste aos golpes de ${no.lider ?? t.nome} — troque ${nomeDo(pior.dex)} por ${nomeDo(daCaixa[0].dex)}, da sua caixa (na aba Time)`
        : `ninguém do seu time resiste aos golpes de ${no.lider ?? t.nome} — leve um ${tiposQueResistem(PACK, no.licao.tiposGolpe).slice(0, 3).map(nomeT).join(' ou ')}`;
    }
  }
  /* ST-10.19a: a lição do PRESET — qual é a ameaça, e o preset que a derruba
     primeiro. A chance com o preset certo é calculada ao lado. */
  /* ST-10.19b: e o do Blaine — o Agressivo, que termina o ferido; e o do
     Campeão (ST-10.19c) — o Equilibrado, contra o Agressivo que venceu o
     Blaine. Sem ameaça a marcar: a lição é o preset, e não um alvo. O porquê
     do certo vem do pack (`porque`); o do errado, do preset que você usa. */
  if (no.licao?.mostra === 'preset' && no.licao.presetCerto !== 'defensive') {
    const causa = $('#jnCausa'), certo = no.licao.presetCerto;
    const NOME_PRESET = { balanced: 'Equilibrado', aggressive: 'Agressivo', defensive: 'Defensivo', focus: 'Foco' };
    const ERRO = { balanced: 'espalha dano', aggressive: 'persegue o ferido', defensive: 'fixa num alvo só', focus: 'só olha o tipo' };
    $('#jnVel').innerHTML = `<div class="jnImune"><b>o seu preset</b>`
      + `<span class="${preset === certo ? 'sim' : 'nao'}">o seu: ${NOME_PRESET[preset] ?? preset} <i>${preset === certo ? `✓ ${no.licao.porque}` : `✗ ${ERRO[preset] ?? ''}`}</i></span>`
      + (preset === certo ? '' : `<span class="sim">${NOME_PRESET[certo]} <i>✓ ${no.licao.porque}</i></span>`) + '</div>';
    if (causa) {
      causa.hidden = false;
      causa.className = `tiny jnCausa ${preset === certo ? 'passa' : 'nao'}`;
      causa.innerHTML = preset === certo ? `o ${NOME_PRESET[certo]} — ${no.licao.porque}`
        : `com o ${NOME_PRESET[preset] ?? preset} você ${ERRO[preset] ?? 'luta de outro jeito'}, e os ${rival.length} seguem batendo — <button class="lnk" data-treino-aba="time">troque para o ${NOME_PRESET[certo]}</button>`;
      causa.dataset.licao = preset === certo ? '' : 'golpes';
    }
  } else if (no.licao?.mostra === 'preset') {
    const ameaca = ameacaDoRival(PACK, A, rival), causa = $('#jnCausa'), certo = no.licao.presetCerto;
    const NOME_PRESET = { balanced: 'Equilibrado', aggressive: 'Agressivo', defensive: 'Defensivo', focus: 'Foco' };
    /* Q7 da ST-10.19a: os presets como CHIPS (a gramática da Erika — ✓ e ✗),
       e a ameaça MARCADA na fila do rival. */
    $('#jnVel').innerHTML = `<div class="jnImune"><b>o preset — quem cai primeiro: ${nomeDo(ameaca)}, a ameaça</b>`
      + `<span class="${preset === certo ? 'sim' : 'nao'}">o seu: ${NOME_PRESET[preset] ?? preset} <i>${preset === certo ? '✓' : '✗ espalha dano'}</i></span>`
      + (preset === certo ? '' : `<span class="sim">${NOME_PRESET[certo]} <i>✓ derruba ${nomeDo(ameaca)} primeiro</i></span>`) + '</div>';
    alvo.querySelectorAll('.jnRival span').forEach((el, i) => { if (rival[i]?.dex === ameaca) el.insertAdjacentHTML('beforeend', ' <b class="jnAmeaca">ameaça</b>'); });
    if (causa) {
      causa.hidden = false;
      causa.className = `tiny jnCausa ${preset === certo ? 'passa' : 'nao'}`;
      causa.innerHTML = preset === certo ? `o ${NOME_PRESET[certo]} derruba ${nomeDo(ameaca)} primeiro`
        : `com o ${NOME_PRESET[preset] ?? preset} você espalha dano e ${nomeDo(ameaca)} bate o tempo todo — <button class="lnk" data-treino-aba="time">troque para o ${NOME_PRESET[certo]}</button>`;
      causa.dataset.licao = preset === certo ? '' : 'golpes';
    }
  }
  /* ST-10.19b: a lição do TIPO DUPLO — a tabela de quanto o melhor golpe de
     cada criatura sua multiplica em cada uma dele, pelos dois tipos. */
  if (no.licao?.mostra === 'duplo') {
    const mm = multiplicadoresNoRival(PACK, A, rival), causa = $('#jnCausa');
    const nomeT = t => PACK.tipos.nomes?.[t] ?? t;
    const fx = m => (m === 0 ? '0' : m === 0.25 ? '¼' : m === 0.5 ? '½' : `${m}×`);
    const cls = m => (m >= 4 ? 'q4' : m >= 2 ? 'q2' : m >= 1 ? 'q1' : 'q0');
    $('#jnVel').innerHTML = `<div class="jnDuplo"><b>quanto o seu melhor golpe multiplica em cada um dele</b><table>`
      /* Q7 da ST-10.19b: os DOIS tipos de cada um sob o nome — é a lição. */
      + `<tr><td class="vazio"></td>${rival.map(r => `<th>${dexImg(r.dex, '', 'class="jnSprite"')}<span>${nomeDo(r.dex)}</span><em>${(especieDe(PACK, r.dex)?.t ?? []).map(nomeT).join(' · ')}</em></th>`).join('')}</tr>`
      + mm.map(x => `<tr class="${x.todos ? 'sim' : ''}"><th>${nomeDo(x.dex)}</th>${x.contra.map(c => `<td class="${cls(c.mult)}">${fx(c.mult)}</td>`).join('')}</tr>`).join('')
      + '</table></div>';
    if (causa) {
      const { bons, corte, pior } = leituraDoDuplo(mm);
      causa.hidden = false;
      causa.className = `tiny jnCausa ${bons.length ? 'passa' : 'nao'}`;
      const daCaixa = multiplicadoresNoRival(PACK, candidatosDaCaixa(PACK, carregar()).map(x => x.entrada), rival).filter(x => x.todos);
      const porque = corte ? `${nomeDo(corte.dex)} bate ${fx(corte.alto.mult)} em ${nomeDo(corte.alto.dex)} e ${fx(corte.baixo.mult)} em ${nomeDo(corte.baixo.dex)}: o segundo tipo conta. ` : '';
      const irTime = '<button class="lnk" data-treino-aba="time">montar na aba Time</button>';
      causa.innerHTML = bons.length ? `${bons.map(x => nomeDo(x.dex)).join(' e ')} ${bons.length > 1 ? 'batem' : 'bate'} forte nos ${rival.length}`
        : daCaixa.length ? `${porque}Troque ${nomeDo(pior.dex)} por ${nomeDo(daCaixa[0].dex)}, da sua caixa — ${irTime}`
        : `${porque}Leve um ${tiposQueBatemEmTodos(PACK, rival).slice(0, 3).map(nomeT).join(' ou ')}: bate forte nos ${rival.length} — ${irTime}`;
      /* A causa já diz o que fazer: o "reforce o time" (subir nível) não é a lição. */
      causa.dataset.licao = bons.length ? '' : 'golpes';
    }
  }
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
      const tipos = (especieDe(PACK, c.dex)?.t ?? []).map(t => PACK.tipos.nomes?.[t] ?? t).join('/');
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
    const aviso = $('#jnRisco'), txt = $('#jnRiscoTxt');
    if (txt && pronto) txt.textContent = avisoDoRisco(r.p) ?? 'arriscado';
    /* Com a causa da lição nomeando os golpes, o "reforce o time" sai: ele
       contradiz a lição (sugere nível, e o que falta é escolher golpe). */
    if (aviso) aviso.hidden = !(pronto && no.estado !== 'trancado' && faixaDaChance(r.p) === 'baixa') || $('#jnCausa')?.dataset.licao === 'golpes';
    if (e) e.textContent = pronto ? textoDaMargem(r) : `calculando · ${acum.sims} de ${SIMS_TREINO}`;
    if (pronto && aplicada?.no === no.id) {
      /* Q7 da ST-10.19d: a correção APLICADA diz o que fez e de onde veio o
         número — "era 16%" —, uma vez só. */
      const c = $('#jnCausa');
      if (c) { c.hidden = false; c.className = 'tiny jnCausa passa jnAplicada'; c.textContent = `✓ ${aplicada.feito} — era ${porcentagemExibida(aplicada.antes)}, agora ${porcentagemExibida(r.p)}`; }
      aplicada = null;
    }
    if (pronto) { chanceNaTela = r; if (b && no.estado !== 'trancado') b.disabled = false; projetar(r); if (no.estado !== 'trancado') relatarChance({ no: no.id, p: r.p, preset, timeA: A }); }
    else setTimeout(passo, 0);
  };
  /* ST-10.19d (L-205): a CORREÇÃO da lição como botão, com a chance que ela
     dá — a mesma conta, no time corrigido. Só aparece se subir a chance; e
     abaixo de 50% ela vira o botão dourado, e o "lutar", o secundário. */
  const estado = carregar();
  const corr = no.estado === 'trancado' ? null
    : correcaoDaLicao(PACK, { licao: no.licao, membros: membrosParaTrocas(PACK, estado), caixa: candidatosDaCaixa(PACK, estado), preset, rival });
  const projetar = atual => {
    if (!corr) return;
    const ac = { vitorias: 0, empates: 0, sims: 0 };
    const passo2 = () => {
      if (g !== geracao) return;
      lote(PACK, corr.timeA, rival, RAIZ, ac.sims, Math.min(100, SIMS_TREINO - ac.sims), ac, corr.preset ?? preset);
      if (ac.sims < SIMS_TREINO) { setTimeout(passo2, 0); return; }
      const p2 = resumo(ac).p, bc = $('#jnCorrige'), bl = $('#jnLutar');
      if (!bc || p2 <= atual.p) return;
      const NOME_PRESET = { balanced: 'Equilibrado', aggressive: 'Agressivo', defensive: 'Defensivo', focus: 'Foco' };
      bc.textContent = `${corr.tipo === 'preset' ? `troque para o ${NOME_PRESET[corr.preset]}` : `troque ${nomeDo(corr.sai.dex)} por ${nomeDo(corr.entra.dex)}`} → ${porcentagemExibida(p2)}`;
      bc.hidden = false; correcaoNaTela = { ...corr, antes: atual.p, no: no.id,
        feito: corr.tipo === 'preset' ? `${NOME_PRESET[corr.preset]} no lugar do ${NOME_PRESET[preset] ?? preset}` : `${nomeDo(corr.sai.dex)} saiu, ${nomeDo(corr.entra.dex)} entrou` };
      /* Uma ação só por painel (Q7): o link repetido da causa e o "reforce o
         time" saem quando o botão da correção está na tela. */
      $('#jnCausa .lnk')?.remove(); const rs = $('#jnRisco'); if (rs) rs.hidden = true;
      /* Sem o link, o travessão que o anunciava fica pendurado (captura da 10.21). */
      const cz = $('#jnCausa'); if (cz) cz.innerHTML = cz.innerHTML.replace(/\s*—\s*$/, '');
      if (bl && atual.p < 0.5) bl.classList.remove('gold');
    };
    setTimeout(passo2, 0);
  };
  setTimeout(passo, 0);
}

/* ST-10.19d: a CENA longe dos nomes (Q7 da Liga: lagos e pedras por baixo de
   Pewter, Vermilion, Viridian, Saffron). Depende da largura do texto JÁ
   desenhado, que só o navegador sabe — por isso mora aqui, e não na camada
   0: é layout, e não decisão de jogo. A peça que encosta num nome troca de
   lado; se ainda encosta, sai. Idempotente: parte sempre do lado original. */
function afastarCena(alvo) {
  const rot = [...alvo.querySelectorAll('.jnNo span')].map(n => n.getBoundingClientRect());
  const tocaEm = (lista, r) => lista.some(a => a.left < r.right - 2 && r.left + 2 < a.right && a.top < r.bottom - 2 && r.top + 2 < a.bottom);
  const toca = r => tocaEm(rot, r);
  /* VOCÊ primeiro: o lado vem da camada 0 (de onde você chegou); se nele o seu
     sprite encosta no nome do vizinho — um nome de ginásio de dois andares,
     em 1100 —, você passa para o outro lado do nó. */
  const voce = alvo.querySelector('.jnVoce'), eu = voce?.querySelector('.jnEu');
  /* ST-10.21: e o LENDÁRIO — o Zapdos cobria a sua cabeça na Usina (Q7). */
  const lend = [...alvo.querySelectorAll('.jnLend')].map(n => n.getBoundingClientRect());
  const tocaVoce = r => toca(r) || tocaEm(lend, r);
  if (eu) {
    voce.dataset.lado0 ??= voce.classList.contains('jnDireita') ? 'd' : 'e';
    voce.classList.toggle('jnDireita', voce.dataset.lado0 === 'd');
    if (tocaVoce(eu.getBoundingClientRect())) {
      voce.classList.toggle('jnDireita');
      /* Os dois lados esbarram (a Usina em 1100: o nome de um lado, o Zapdos do
         outro): fica o lado que não cobre TEXTO — o nome ganha do enfeite. */
      if (tocaVoce(eu.getBoundingClientRect()) && toca(eu.getBoundingClientRect())) voce.classList.toggle('jnDireita');
    }
  }
  /* ST-10.21: a SETA que encosta num nome sai — ela é leitura do sentido, e o
     nome é leitura do lugar; o nome ganha (Q7: Pewter, Vermilion, Campeão). */
  for (const pos of alvo.querySelectorAll('.jnSetaPos')) {
    const el = pos.querySelector('.jnSeta');
    pos.dataset.xy0 ??= `${pos.style.getPropertyValue('--x')},${pos.style.getPropertyValue('--y')}`;
    const [x0, y0] = pos.dataset.xy0.split(',');
    const pontos = [{ x: x0, y: y0 }, ...JSON.parse(pos.dataset.outros ?? '[]')];
    el.style.display = '';
    /* A seta procura um ponto do PRÓPRIO trecho longe dos nomes; só sai se
       nenhum servir. */
    const bom = pontos.find(p => { pos.style.setProperty('--x', p.x); pos.style.setProperty('--y', p.y); return !toca(el.getBoundingClientRect()); });
    if (!bom) { pos.style.setProperty('--x', x0); pos.style.setProperty('--y', y0); el.style.display = 'none'; }
  }
  /* Depois a CENA, longe dos nomes e de você (ST-10.21: você de pé em cima
     dos laguinhos de Cinnabar e Vermilion, Q7 da 10.19d). */
  const obstaculos = [...rot, ...(eu ? [eu.getBoundingClientRect()] : [])];
  /* E dentro do mapa: lago cortado pela borda, no celular, é peça pela metade. */
  const caixa = alvo.querySelector('.jnMapa')?.getBoundingClientRect();
  const fora = r => caixa && (r.left < caixa.left || r.right > caixa.right || r.top < caixa.top || r.bottom > caixa.bottom);
  /* ST-10.22c3: e longe da ESTRADA — o lago e a casa em cima dela liam como
     estrada que afunda (Q7 da c2). O marco fica: o palácio mora no nó. */
  const estrada = [...alvo.querySelectorAll('.jnPos')].filter(p => p.querySelector(':scope > .jnNo')).map(p => { const r = p.getBoundingClientRect(); return { x: r.left, y: r.top }; });
  /* E longe do RIO (ST-10.22c4): os pontos dele em pixels, pelo SVG que está
     à vista — em pé, x e y trocados, como a estrada. */
  const sv = [...alvo.querySelectorAll('.jnCaminho')].find(el => el.getBoundingClientRect().width), sr = sv?.getBoundingClientRect();
  const empe = sv?.classList.contains('jnEmPe');
  const rios = sr ? JSON.parse(alvo.querySelector('.jnMapa')?.dataset.rio ?? '[]').map(pts => pts.map(p => ({ x: sr.left + ((empe ? p.y : p.x) * sr.width) / 100, y: sr.top + ((empe ? p.x : p.y) * sr.height) / 100 }))) : [];
  const noRio = r => rios.some(rio => cruzaOCaminho(r, rio));
  const ruim = (r, naEstrada) => tocaEm(obstaculos, r) || fora(r) || (naEstrada && (cruzaOCaminho(r, estrada) || noRio(r)));
  for (const el of alvo.querySelectorAll('.jnPos:not(.jnB) .jnLago, .jnPos:not(.jnB) .jnProp, .jnPos:not(.jnB) .jnMarco')) {
    if (el.closest('.jnFoz')) continue;
    el.dataset.dx0 ??= el.style.getPropertyValue('--dx');
    el.style.setProperty('--dx', el.dataset.dx0); el.style.display = '';
    const naEstrada = !el.classList.contains('jnMarco');
    if (!ruim(el.getBoundingClientRect(), naEstrada)) continue;
    el.style.setProperty('--dx', `${-parseFloat(el.dataset.dx0)}px`);
    /* ST-10.24: o MARCO não some — o palácio do Campeão desaparecia no fim,
       quando você e o nome de duas linhas ficavam ao lado dele (Q7). Marco é
       lugar, como no SMW: volta ao lado dele e fica. */
    if (ruim(el.getBoundingClientRect(), naEstrada)) {
      if (el.classList.contains('jnMarco')) el.style.setProperty('--dx', el.dataset.dx0);
      else el.style.display = 'none';
    }
  }
  /* ST-10.22b: a árvore da parede que cai sob uma peça da cena (a casa de
     Pewter, a de Vermilion, lá em cima) sai — casa na frente de árvore
     amontoada lia como colagem. */
  const pecas = [...alvo.querySelectorAll('.jnPos:not(.jnB) .jnLago, .jnPos:not(.jnB) .jnProp, .jnPos:not(.jnB) .jnMarco')].filter(el => el.style.display !== 'none').map(el => el.getBoundingClientRect());
  for (const el of alvo.querySelectorAll('.jnB .jnProp')) { el.style.display = ''; if (tocaEm(pecas, el.getBoundingClientRect()) || noRio(el.getBoundingClientRect())) el.style.display = 'none'; }
}
let reafastar = 0;
/* O celular tem o caminho EM PÉ, com uma volta só (ST-10.22c): cruzar a largura repinta, e não só reafasta. */
const emPe = () => !!globalThis.matchMedia?.('(max-width:520px)').matches;
let pintadoEmPe = null;
addEventListener('resize', () => { clearTimeout(reafastar); reafastar = setTimeout(() => { const a = $('#jnMapaArea'); if (!a) return; if (pintadoEmPe !== null && pintadoEmPe !== emPe() && a.offsetParent) renderJornada(); else { afastarCena(a); pintarChao(a, mapaDaJornada(PACK, carregar().jornada, { emPe: pintadoEmPe }), PACK.mapaJornada?.[pintadoEmPe ? 'emPe' : 'deitado'], pintadoEmPe); if (pintadoEmPe) centrarJanela(a, escolhido ?? a.querySelector('.jnNo.jn-atual')?.dataset.jnNo); } }, 150); });

/* O MINIMAPA acende os nós que a JANELA mostra agora (ST-10.22c4): o
   jogador vê em que trecho do caminho inteiro está olhando. Medir é do
   navegador; a ordem e o andado vêm da camada 0. */
function marcarJanela(alvo) {
  const jan = alvo.querySelector('.jnJanela'), j = jan?.getBoundingClientRect();
  if (!j) return;
  for (const b of alvo.querySelectorAll('.jnMiniNo')) {
    const n = alvo.querySelector(`.jnNo[data-jn-no="${b.dataset.jnNo}"]`)?.getBoundingClientRect(), y = n && n.top + n.height / 2;
    b.classList.toggle('naJanela', !!n && n.height > 0 && y >= j.top && y <= j.bottom);
  }
}

/* A JANELA do celular (ST-10.22c): o mapa em pé tem mais de dois mil pixels; a
   janela mostra o trecho do nó escolhido — ou do próximo — no meio, e o resto
   rola. O jogador abre a jornada e vê para onde vai, e não o começo. */
function centrarJanela(alvo, id) {
  const jan = alvo.querySelector('.jnJanela'), no = id && alvo.querySelector(`.jnNo[data-jn-no="${id}"]`);
  if (!jan || !no) return;
  const j = jan.getBoundingClientRect(), n = no.getBoundingClientRect();
  jan.scrollTop += (n.top + n.height / 2) - (j.top + j.height / 2);
}

const quadro = (folha, cls, extra = '') => `<b class="${cls}" style="background-image:url(${ARTE_DO_MAPA}/${folha}.png)${extra}"></b>`;

export function renderJornada({ nova = null } = {}) {
  const alvo = $('#jnMapaArea');
  if (!alvo) return;
  const estado = carregar();
  pintadoEmPe = emPe();
  const mapa = mapaDaJornada(PACK, estado.jornada, { emPe: pintadoEmPe });
  const ganhas = mapa.insignias.filter(x => x.ganha).length;
  /* VOCÊ no mapa: o traje vestido, de frente, NA TRILHA, a caminho do nó que
     falta vencer. A folha é a do idle — nove quadros. */
  const eu = folhaVestida(carregarGuardaRoupa()), onde = ondeEstou(mapa);
  /* A trilha andada é cheia; a por andar, tracejada e apagada. */
  const { andado, resto } = caminhoAndado(mapa);
  const linha = (nos, empe) => nos.map(n => (empe ? `${n.y},${n.x}` : `${n.x},${n.y}`)).join(' ');
  const trilha = empe => `<polyline class="jnBeira" points="${linha(andado, empe)}"/><polyline points="${linha(andado, empe)}"/>`
    + (resto.length > 1 ? `<polyline class="jnPorAndar" points="${linha(resto, empe)}"/>` : '');
  /* O RIO (ST-10.22c4) vem ANTES da estrada no SVG: ela passa por cima, e o
     cruzamento lê como ponte. */
  /* ST-10.23: o pack com o mapa DESENHADO traz o próprio rio (na grade, com
     margem e ponte) — o rio antigo em SVG, a foz e a ponte só sem desenho. */
  const desenho = PACK.mapaJornada?.[pintadoEmPe ? 'emPe' : 'deitado'];
  const rios = desenho ? [] : rioDoMapa(mapa), mini = miniMapa(mapa);
  /* ST-10.24: com o desenho, a estrada é CHÃO (pintada no canvas por
     `pintarChao`); o traço SVG fica só para o pack sem desenho. */
  const estradaSvg = empe => (desenho ? '' : trilha(empe));
  const rioSvg = empe => rios.map(r => `<polyline class="jnRioBeira" points="${linha(r.pontos, empe)}"/><polyline class="jnRio" points="${linha(r.pontos, empe)}"/>`).join('');
  alvo.innerHTML = `
    <div class="jnTopo"><span><b>${mapa.feitos}</b> de ${mapa.total} passos · <b>${ganhas}</b> de ${mapa.insignias.length} insígnias${mapa.atual ? '' : ' · <b class="jnFeito">caminho vencido de ponta a ponta</b>'}</span>
      <div class="jnEstojo"><span class="jnEstojoRot">insígnias</span>${mapa.insignias.map(x => `<i class="jnInsignia${x.arte ? ' conhecida' : ''}${x.ganha ? ' ganha' : ''}${x.id && x.id === nova ? ' nova' : ''}"
          title="${x.nome ? `${x.nome} (${x.onde})${x.ganha ? '' : ' — ainda não é sua'}` : 'ainda não há ginásio aqui'}">${x.arte ? `<img src="${x.arte}" alt="">` : ''}</i>`).join('')}</div></div>
    <div class="jnMini" style="--andado:${mini.andado}" aria-label="o caminho inteiro"><b class="jnMiniTrilha"></b>${mini.pontos.map((p, k) => `<button class="jnMiniNo jn-${p.estado} jn-${p.tipo}${p.final ? ' jnMiniFim' : ''}${k === 0 ? ' jnMiniIni' : ''}" data-jn-no="${p.id}" style="--t:${p.t}" title="${p.curto}" aria-label="${p.curto}"></button>`).join('')}</div>
    <div class="jnJanela"><div class="jnMapa${mapa.voltas === 2 ? ' jnVoltas2' : ''}" style="--n:${mapa.voltas === 2 ? Math.ceil(mapa.nos.length / 2) : mapa.nos.length}" data-rio='${JSON.stringify(desenho ? [desenho.rio] : rios.map(r => r.pontos))}'>
      <canvas class="jnChao" aria-hidden="true"></canvas>
      <svg class="jnCaminho jnDeitado" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${rioSvg(false)}${estradaSvg(false)}</svg>
      <svg class="jnCaminho jnEmPe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${rioSvg(true)}${estradaSvg(true)}</svg>
      ${rios.map(r => `<div class="jnPos jnFoz" style="--x:${r.foz.x};--y:${r.foz.y}"><b class="jnLago"><i></i></b></div>`).join('')}
      ${rios.map(r => `<div class="jnPos jnPonte" style="--x:${r.ponte.x};--y:${r.ponte.y}"><b></b></div>`).join('')}
      ${(desenho ? setasNaEstrada(setasDoCaminho(mapa), mapa.atual ? mapa.nos.findIndex(n => n.id === mapa.atual) : -1) : setasDoCaminho(mapa)).map(sx => `<div class="jnPos jnSetaPos" style="--x:${sx.x};--y:${sx.y}" data-outros='${JSON.stringify(sx.outros)}'><i class="jnSeta jn-${sx.dir}${sx.andado ? ' andado' : ''}"></i></div>`).join('')}
      ${[...bordaDoMapa()].sort((a, b) => !!b.fundo - !!a.fundo).map(p => `<div class="jnPos jnB${p.escala ? ` jnB${p.escala}` : ''}${p.fundo ? ' jnBf' : ''}" style="--x:${p.x};--y:${p.y}">${p.arte ? `<b class="jnProp jnArte" style="background-image:url(${ARTE_NOSSA_DO_MAPA}/${p.arte}.svg)"></b>` : quadro('cuttable_tree', 'jnProp')}</div>`).join('')}
      ${mapa.nos.map((n, i) => `<div class="jnPos jn-${n.estado} jnT-${n.tipo}${n.final ? ' jnFinal' : ''}${i === 0 ? ' jnInicio' : ''}" style="--x:${n.x};--y:${n.y};--rg:${corDoNo(n)}">
          ${cenaDoNo(n).map(c => (c.forma ? `<b class="jnLago${c.forma === 'lago' ? '' : ` jn-${c.forma}`}" style="--dx:${c.dx}px;--dy:${c.dy}px"><i></i></b>`
            : c.marco ? `<img class="jnMarco" src="${ARTE_NOSSA_DO_MAPA}/${c.marco}.svg" alt="" style="--dx:${c.dx}px;--dy:${c.dy}px">`
            : c.arte ? `<b class="jnProp jnArte" style="background-image:url(${ARTE_NOSSA_DO_MAPA}/${c.arte}.svg);--dx:${c.dx}px;--dy:${c.dy}px"></b>`
            : quadro(c.folha, 'jnProp', `;--dx:${c.dx}px;--dy:${c.dy}px`))).join('')}
          ${n.ow ? quadro(n.ow, 'jnOw') : ''}${n.lendario ? `<b class="jnLend">${dexImg(n.lendario, '', 'class="jnLendImg"')}</b>` : ''}
          <button class="jnNo jn-${n.estado} jn-${n.tipo}${n.id === escolhido ? ' escolhido' : ''}${mostraNome(n, escolhido) ? '' : ' jnSemNome'}" data-jn-no="${n.id}" title="${n.nome}" aria-label="${n.nome}">${n.estado === 'atual' ? '<b class="jnAnel"></b>' : ''}<i${n.tipo === 'ginasio' && n.estado !== 'trancado' ? ` style="background-image:url(${arteDaInsignia(n.insignia)})"` : n.tipo === 'ginasio' && arteDaInsignia(n.insignia) ? ` class="jnSilhueta" style="--ins:url(${arteDaInsignia(n.insignia)})"` : n.tipo === 'liga' && n.revisa?.insignia && n.estado === 'trancado' ? ` class="jnSilhueta" style="--ins:url(${arteDaInsignia(n.revisa.insignia)})"` : ''}></i><span>${n.nome}${n.estado === 'trancado' && n.id !== escolhido ? '' : n.tipo === 'liga' ? `<em>${n.selo ?? ''} · ${n.licao?.tipo ?? ''}</em>` : n.lider ? `<em>líder ${n.lider} · ${n.licao?.tipo ?? ''}</em>` : n.tipo === 'chefe' ? '<em>chefe · lendário</em>' : ''}${n.estado === 'atual' ? '<strong class="jnProx">próximo</strong>' : ''}</span></button></div>`).join('')}
      ${onde && eu ? `<div class="jnPos jnVoce${onde.fim ? ' jnFim' : ''}${onde.lado === 'direita' ? ' jnDireita' : ''}" style="--x:${onde.x};--y:${onde.y};--ax:${onde.ao.x};--ay:${onde.ao.y}"><b class="jnEu"><img src="${eu}" alt="você"></b></div>` : ''}
    </div></div>
    ${(f => `<div class="jnFaixa">${[f.antes, f.este, f.depois].map((n, k) => (n ? `<button class="jnFaixaNo jn-${n.estado} jn-${n.tipo}${k === 1 ? ' este' : ''}" data-jn-no="${n.id}"><i class="jnFaixaMarco"${n.tipo === 'ginasio' && n.estado !== 'trancado' ? ` style="background-image:url(${arteDaInsignia(n.insignia)})"` : ''}></i>${n.curto}</button>` : '<span></span>')).join('')}</div>`)(faixaDoCaminho(mapa, escolhido))}
    <div class="jnPainel" id="jnPainel"></div>`;
  const im = alvo.querySelector('.jnEu img');
  if (im) { const medir = () => { im.parentNode.style.width = `${im.naturalWidth / 9}px`; }; if (im.complete && im.naturalWidth) medir(); else im.onload = medir; }
  pintarPainel(mapa);
  /* ST-10.22e: o chão é uma grade de tiles, pintada depois de os nós terem lugar. */
  requestAnimationFrame(() => { afastarCena(alvo); pintarChao(alvo, mapa, desenho, pintadoEmPe); if (pintadoEmPe) centrarJanela(alvo, escolhido ?? mapa.atual); marcarJanela(alvo); });
  alvo.querySelector('.jnJanela')?.addEventListener('scroll', () => marcarJanela(alvo), { passive: true });
  /* O marco é <img>: sem tamanho até carregar, o afastamento o via com 0 × 0 e
     o deixava em cima de um nome (medido na captura da ST-10.22b). */
  alvo.querySelectorAll('.jnMarco').forEach(im => { if (!im.complete) im.addEventListener('load', () => afastarCena(alvo), { once: true }); });
  document.fonts?.ready?.then(() => afastarCena(alvo));
}

/* As três abas do Time. A Liga de times (ST-11.6a) pinta a si mesma: a aba só
   a mostra e avisa — sem importar a tela dela para cá. */
const ABAS_TREINO = Object.freeze({
  time:    { corpo: '#treinoCorpo',  titulo: 'Time',           lema: 'monte o time e veja a chance mexer — treino, sem aposta' },
  jornada: { corpo: '#jornadaCorpo', titulo: 'Jornada',        lema: 'o caminho da jornada — vença cada nó para abrir o próximo' },
  liga:    { corpo: '#ligaEqCorpo',  titulo: 'Liga de times',  lema: 'o seu time publicado contra os de outros jogadores — sem aposta' },
});
export function mostrarAbaTreino(aba) {
  if (!ABAS_TREINO[aba]) aba = 'time';
  const a = ABAS_TREINO[aba], lema = $('#treinoLema'), titulo = $('#treinoTitulo');
  if (titulo) titulo.textContent = a.titulo;
  if (lema) lema.textContent = a.lema;
  for (const [id, x] of Object.entries(ABAS_TREINO)) { const el = $(x.corpo); if (el) el.hidden = id !== aba; }
  document.querySelectorAll('[data-treino-aba]').forEach(b => b.classList.toggle('on', b.dataset.treinoAba === aba));
  try { localStorage.setItem('ar_treino_aba', aba); } catch { /* privativo */ }
  if (aba === 'jornada') renderJornada();
  else if (aba === 'liga') document.dispatchEvent(new CustomEvent('liga-equipe:abrir'));
  else renderTreino();
}
const abaLembrada = () => { try { const a = localStorage.getItem('ar_treino_aba'); return ABAS_TREINO[a] ? a : 'time'; } catch { return 'time'; } };

document.addEventListener('click', async ev => {
  if (ev.target.closest('.nav[data-view="viewTreino"], [data-goto="viewTreino"]')) { setTimeout(() => mostrarAbaTreino(abaLembrada()), 0); return; }
  /* A correção: a camada 0 decidiu o quê; aqui só se aplica e repinta. */
  if (ev.target.closest('[data-jn-corrige]') && correcaoNaTela) {
    aplicada = { no: correcaoNaTela.no, antes: correcaoNaTela.antes, feito: correcaoNaTela.feito };
    /* A troca pode ir ao servidor (ST-13.5d): repinta quando ela termina. */
    Promise.resolve(aplicarCorrecao(correcaoNaTela, { preset: p => { try { localStorage.setItem('ar_treino_preset', p); } catch { /* sem armazenamento: nada muda */ } }, trocar: t => trocarNa(t) }))
      .then(renderJornada); return;
  }
  const aba = ev.target.closest('[data-treino-aba]');
  if (aba) { mostrarAbaTreino(aba.dataset.treinoAba); return; }
  const no = ev.target.closest('[data-jn-no]');
  /* No estreito o painel vem ANTES do mapa (Q7 da ST-10.15): escolher um nó
     leva o olho de volta a ele. */
  /* Do MINIMAPA, a janela vai até o nó e o olho fica no mapa (ST-10.22c4). */
  if (no) { escolhido = no.dataset.jnNo; renderJornada(); if (!no.closest('.jnMini') && matchMedia('(max-width:520px)').matches) $('#jnPainel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const lutar = ev.target.closest('[data-jn-lutar]');
  if (!lutar || lutar.disabled || !chanceNaTela) return;
  /* `antes` é a chance que a tela mostrou ANTES do clique: o fim da luta a
     usa ("foi a fatia dos 12%") e a encenação também. A ST-13.5f a tirou junto
     com o relato da luta e deixou o uso — toda luta lançava ReferenceError
     depois de gravada, e o mapa não andava (D-142). */
  const id = lutar.dataset.jnLutar, antes = chanceNaTela;
  const r = await lutarNaJornadaNa({ pack: PACK, id, preset: presetDoJogador() });
  if (!r.ok) { $('#jnErro').textContent = r.motivo ?? 'não deu para lutar agora'; return; }
  /* ST-10.20 · ST-13.5f: a luta é FATO do servidor (L-208) — a tela não a
     relata; a chance que ela mostrou já foi relatada ao ser calculada. */
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
    const v = comparaVelocidade(PACK, r.timeA, r.timeB), nome = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
    const rapido = v.deles.find(x => x.spe === v.alvo);
    /* A frase casa QUEM agiu antes com O QUE aconteceu: agir antes e perder é
       a fatia que a chance já dizia, e não a lição desmentida. */
    const venceu = r.resultado.vencedor === 'A';
    licaoNoFim = v.falta
      ? ` ${nome(rapido.dex)} agiu antes (${v.alvo} contra ${v.seu.spe})${venceu ? ', e desta vez você venceu mesmo assim.' : ': a lição deste ginásio.'}`
      : ` Você agiu antes (${nome(v.seu.dex)} ${v.seu.spe} contra ${nome(rapido.dex)} ${v.alvo})${venceu ? ': a lição deste ginásio.' : ', e desta vez não bastou.'}`;
  }
  const lic = PACK.jornada.find(n => n.id === id)?.licao;
  /* ST-10.19c: a Liga não ensina — cobra o que um ginásio ensinou. */
  const aLicao = lic?.revisa ? 'a lição que a Liga cobra' : 'a lição deste ginásio';
  if (lic?.mostra === 'imune') {
    const pv = provaDaImunidade(PACK, r.timeA, r.resultado.eventos, lic.tipoGolpe), nome = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
    const frase = x => (x.golpes ? `${nome(x.dex)} levou ${x.golpes} ${x.golpes === 1 ? 'golpe' : 'golpes'} de ${lic.tipo}: dano ${x.dano}`
      : `contra ${nome(x.dex)} o rival nem tentou ${lic.tipo}${x.outros.length ? ` — só ${x.outros.join(' e ')} (dano ${x.danoOutros})` : ''}`);
    const maiuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
    licaoNoFim = pv.length ? ` ${maiuscula(pv.map(frase).join('; '))} — ${aLicao}.` : ` Ninguém do seu time era imune a ${lic.tipo}: todo golpe acertou.`;
  }
  if (lic?.mostra === 'resiste') {
    const pv = provaDaResistencia(PACK, r.timeA, r.resultado.eventos, lic.tiposGolpe), nome = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
    licaoNoFim = pv.length ? ` ${pv.map(x => `${nome(x.dex)} levou ${x.golpes} ${x.golpes === 1 ? 'golpe' : 'golpes'} de ${t.nome}, dano ${x.dano} (apanha ${x.mult === 0.25 ? '¼' : '½'})`).join('; ')}: ${aLicao}.`
                           : ` Ninguém do seu time resistia aos golpes de ${t.nome}.`;
  }
  if (lic?.mostra === 'preset' && lic.presetCerto !== 'defensive') {
    /* A PROVA do Agressivo: os golpes que você levou, nesta luta e na mesma
       com o outro preset (`provaDoPreset`, camada 0). */
    const NOMEP = { balanced: 'Equilibrado', aggressive: 'Agressivo', defensive: 'Defensivo', focus: 'Foco' };
    const pp = provaDoPreset(PACK, { timeA: r.timeA, timeB: r.timeB, semente: r.semente, eventos: r.resultado.eventos, usado: presetDoJogador(), certo: lic.presetCerto, errado: lic.presetErrado });
    /* Q7 da ST-10.19b: qual luta foi a REAL e qual a hipotética, e a vitória
       sem a lição dita como o que é — a fatia que a chance já mostrava. */
    const semLicao = pp.usado !== lic.presetCerto, venceu = r.resultado.vencedor === 'A';
    const medida = lic.prova === 'derrubados'
      ? `você derrubou ${pp.derrubadosUsado} dos ${pp.rivais}; a mesma luta no ${NOMEP[pp.outro]}: ${pp.derrubadosOutro} dos ${pp.rivais}`
      : `o rival acertou ${pp.levadosUsado} golpes em você; a mesma luta no ${NOMEP[pp.outro]}: ${pp.levadosOutro}`;
    licaoNoFim = ` Nesta luta (${NOMEP[pp.usado] ?? pp.usado}) ${medida}${pp.venceuOutro !== venceu ? (pp.venceuOutro ? ', e você venceria' : ', e você perderia') : ''}.`
      + (semLicao && venceu ? ` Você venceu sem a lição: foi a fatia dos ${porcentagemExibida(antes.p)}.` : '');
  } else if (lic?.mostra === 'preset') {
    /* A PROVA: a mesma luta com o outro preset (`turnosDaAmeaca`, camada 0). */
    const NOMEP = { balanced: 'Equilibrado', aggressive: 'Agressivo', defensive: 'Defensivo', focus: 'Foco' };
    const nome = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
    const tt = turnosDaAmeaca(PACK, { timeA: r.timeA, timeB: r.timeB, semente: r.semente, eventos: r.resultado.eventos, usado: presetDoJogador(), certo: lic.presetCerto });
    const quando = x => (x ? `caiu no turno ${x}` : 'ficou de pé a luta inteira');
    licaoNoFim = ` No ${NOMEP[tt.usado] ?? tt.usado}, ${nome(tt.ameaca)} (a ameaça) ${quando(tt.noUsado)}; nesta mesma luta com o ${NOMEP[tt.outro]}, ${quando(tt.noOutro)}.`;
  }
  if (lic?.mostra === 'duplo') {
    const pd = provaDoDuplo(PACK, r.timeA, r.resultado.eventos), nome = dex => nomeExibido(especieDe(PACK, dex)?.n ?? '?');
    const frase = x => `${nome(x.dex)}: ${x.fortes} super-efetivos${x.quadruplos ? ` (${x.quadruplos} de 4×)` : ''}${x.cortados ? `, ${x.cortados} cortados pelo segundo tipo` : ''}`;
    const fez = pd.filter(x => x.fortes || x.cortados);
    licaoNoFim = fez.length ? ` O tipo duplo nesta luta — ${fez.map(frase).join('; ')}.` : ' Nenhum golpe seu foi super-efetivo nem cortado: todos neutros.';
  }
  if (lic?.mostra === 'categoria') {
    const d = danoPorCategoria(PACK, r.resultado.eventos);
    licaoNoFim = ` Seus golpes físicos: ${d.fis.golpes}, dano ${d.fis.dano} · especiais: ${d.esp.golpes}, dano ${d.esp.dano} — ${aLicao}.`;
  }
  $('#jornadaCorpo')?.classList.add('emLuta');
  encenar({ alvo: $('#jnLuta'), A: r.timeA, B: r.timeB, r: r.resultado, antes, titulo: (nomeNo => (t.nome.includes(nomeNo) ? t.nome : `${nomeNo} · ${t.nome}`))(PACK.jornada.find(n => n.id === id)?.nome ?? ''),
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
