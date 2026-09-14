/* PAINEL DE ADM — a tela. As regras e a validação vivem em `adm-dados.mjs`.
 *
 * ── UM CAMINHO SÓ, E ELE É O DO SERVIDOR (R9) ──────────────────────────────
 *
 * Havia dois. O antigo: `#adm` no endereço mais um PIN de quatro dígitos que o
 * próprio código declarava não proteger nada, abrindo um painel LOCAL que
 * escrevia a margem em `localStorage` — e margem é o preço que o jogador vê. O
 * novo: `/api/admin/*`, com senha, segundo fator, papel por ação e registro de
 * auditoria.
 *
 * Dois caminhos para a mesma capacidade é o desenho em que **o mais fraco
 * decide**. O aviso que ficava nesta própria tela já dizia o que precisava
 * acontecer — "quando existir servidor, isto precisa virar rota autenticada de
 * verdade, com autorização por papel e registro de operador (F1.11)". O
 * servidor existe desde o F1.11. Isto fecha o pendente.
 *
 * O `#adm` no endereço FICA, e não é contradição: endereço nunca protegeu nada
 * e não era ele o problema. O problema era o que havia atrás dele. Agora atrás
 * dele há um formulário que só o servidor pode aceitar.
 *
 * Nada no menu aponta para cá, de propósito — o painel não se anuncia.
 *
 * O QUE ELE NÃO TEM, e é decisão registrada: o simulador de baús. Os baús
 * ficaram fora do porte por decisão do dono do projeto — vão pelo nosso
 * roadmap, com o nosso cálculo (V1.16). Portar o simulador seria portar a
 * economia junto.
 */
import { $ } from './dom.mjs';
import { avisar, confirmar, pedirTexto } from './dialogo.mjs';
import { CONF, CUR, MOEDA, especies, nomeExibido } from './motor.mjs';
import { S } from './estado.mjs';
import { MARGEM_MAX } from './adm-dados.mjs';
import { criarApi } from './api.mjs';
import { goView } from './navegacao.mjs';
import { creditarCompra, reiniciarCarteira, saldo, ultimoDiagnostico } from './banco.mjs';
import { atualizarSaldo } from './controles.mjs';
import { ligarVelocidade } from './carteira.mjs';
import { PROFILE_DEFAULT, loadProfile, nivelDe, saveProfile } from './perfil.mjs';
import { alternar, desbloquear, gifShinyAtivo, skinShinyAtiva, vagasNoNivel } from './shiny-dados.mjs';
import { dexImg } from './sprites.mjs';
import { eventos } from './telemetria.mjs';
import { barras, medidor, escapar } from './grafico.mjs';

/* A SESSÃO DE OPERADOR VIVE EM MEMÓRIA, E SÓ.
 *
 * `armazem: null` não é descuido: é a decisão. O token devolvido pelo
 * `/api/admin/entrar` abre o saldo de todo mundo, e o servidor já o defende com
 * expiração de 8 h e rotação a cada 30 min. Guardá-lo no `localStorage` o
 * deixaria legível por qualquer script da página e vivo depois de fechar a aba
 * — desfaria as duas defesas de uma vez. Fechar a aba é sair. */
const apiAdm = criarApi({ armazem: null });

/* O painel guarda o que o SERVIDOR devolveu, e nada mais. Não há configuração
   local: a margem saiu daqui no R9 e a rodada usa a do motor até existir rota
   de operador para defini-la (ver L-047). */
let painel = null;
let operador = null;

/* ENTRAR É COISA DO SERVIDOR. Três campos, e o terceiro é o que torna um
   vazamento de senha insuficiente sozinho. A recusa é uma frase só, de
   propósito: distinguir "email não existe" de "senha errada" entrega metade do
   trabalho a quem está tentando. O servidor já cuida disso; repetir a distinção
   aqui desfaria o cuidado dele. */
export async function admLogin(){
  const email  = await pedirTexto('E-mail do operador:', { ok: 'Continuar' });
  if (email === null) return;
  const senha  = await pedirTexto('Senha:', { tipo: 'password', ok: 'Continuar' });
  if (senha === null) return;
  const codigo = await pedirTexto('Código do segundo fator:', { ok: 'Entrar' });
  if (codigo === null) return;

  const r = await apiAdm.post('/api/admin/entrar', { email, senha, codigo });
  if (r.indisponivel){
    await avisar('O painel de operador exige o servidor no ar. Nenhum painel abre sem ele.');
    return;
  }
  if (!r.ok || !r.corpo?.token){ await avisar('Credenciais inválidas.'); return; }

  apiAdm.adotarSessao(r.corpo.token);
  operador = r.corpo.operador ?? null;
  await admAbrir();
}

export async function admAbrir(){
  const r = await apiAdm.get('/api/admin/painel');
  if (!r.ok){
    /* Sem papel não há painel, e a tela diz isso em vez de abrir vazia. Um
       painel que abre sem dado ensina que o acesso funcionou. */
    await avisar(r.indisponivel
      ? 'O servidor não respondeu. O painel não abre sem ele.'
      : 'Esta sessão de operador não tem papel para ver o painel.');
    return;
  }
  painel = r.corpo;
  goView('viewAdm');
  admRender();
}

export function admChecarHash(){
  if (location.hash.toLowerCase() === '#adm') admLogin();
}

export function admRender(){
  if (!$('#admCorpo')) return;
  admSaldos(); admMargem(); admFavorecimento(); admPolitica(); admDistribuicao();
  admOdds(); admShinyLab(); admEstat(); admDev();
}

const pct = v => (v * 100).toFixed(2) + '%';
const num = v => Math.round(v).toLocaleString('pt-BR');

function linha(rotulo, valor, nota){
  return `<div class="admLinha"><span>${rotulo}</span><b>${valor}</b>` +
         (nota ? `<i style="color:var(--dim);font-style:normal;font-size:.7rem">${nota}</i>` : '') + '</div>';
}

/* ── O PAINEL DE AUDITORIA NÃO PODE LER O AUDITADO (R20) ───────────────────
 *
 * Este bloco mostrava `S.carteira` — estado do CLIENTE. O F1.16 tirou o cliente
 * de ser fonte de dinheiro no caminho da aposta; aqui ele continuava sendo a
 * fonte do que o operador lê para conferir se há divergência, o que torna a
 * conferência circular: o painel comparava o servidor com um número que o
 * próprio navegador pode ter inventado.
 *
 * Agora o que aparece é a CIRCULAÇÃO somada do ledger, pelo servidor. A
 * carteira local virou o que sempre foi — ferramenta de desenvolvedor — e
 * mudou-se para o bloco Dev. */
function admSaldos(){
  const p = painel;
  if (!p){ $('#admSaldos').innerHTML = '<div class="tiny">Painel não carregado.</div>'; return; }

  const divergentes = Object.entries(p.divergencia || {});
  $('#admSaldos').innerHTML =
    Object.entries(p.emCirculacao || {})
      .map(([b, v]) => linha(b, `${CUR} ${num(v)}`, 'em circulação, somado do ledger')).join('') +
    linha('Emitido', `${CUR} ${num(p.totalEmitido ?? 0)}`, 'soma dos faucets') +
    linha('Retirado', `${CUR} ${num(p.totalRetirado ?? 0)}`, 'soma dos sinks') +
    linha('Passivo aberto', `${CUR} ${num(p.passivo ?? 0)}`, 'pior caso das apostas em aberto') +
    /* A DIVERGÊNCIA GRITA OU NÃO SERVE. Zero é o esperado; qualquer outro valor
       é a pergunta mais importante da tela, e numa linha igual às outras ela
       some entre saldos que ninguém confere. */
    (divergentes.length
      ? `<div class="admAlerta"><b>Divergência entre ledger e cache</b>` +
        divergentes.map(([b, v]) =>
          `<div class="admLinha"><span>${escapar(b)}</span><b>${CUR} ${num(v)}</b>` +
          `<i style="font-style:normal;font-size:.7rem">o cache diz isto a mais que o ledger</i></div>`).join('') +
        `<div class="tiny">O ledger é a fonte. Enquanto isto não for zero, nenhum outro número desta tela deve ser usado para decidir.</div></div>`
      : `<div class="admOk">Ledger e cache batem em todos os baldes.</div>`);
}

/* A MARGEM SAIU DO `localStorage` NO R9 e ganhou rota no R18. O campo que a
   escrevia gravava no navegador: preço decidido sem papel, sem confirmação e
   sem registro de operador, por qualquer um que abrisse o console.
   Hoje ela vai por `POST /api/admin/margem`, e toda a defesa mora no `agir` do
   servidor — papel `economia`, motivo escrito, confirmação e auditoria ANTES de
   executar. Este painel lê a que está em vigor e a envia; não decide nada.
   Menos capaz do que era, e mais honesto: nenhum número aqui vem de um lugar
   que ninguém audita. */
function admMargem(){
  const atual = S.odds ? S.odds.margemConfigurada : null;
  /* A margem DA CASA vem do servidor, junto com o painel. Ela é a configuração
     que mais muda o que o jogador vê — a odd ao lado de cada lutador. */
  const daCasa = painel && painel.margem !== undefined ? painel.margem : null;
  $('#admMargem').innerHTML =
    linha('Da casa', daCasa === null ? 'a do motor' : pct(daCasa),
          'vale a partir da PRÓXIMA rodada') +
    linha('Do motor', pct(CONF.MARGIN), 'o padrão, quando a casa não declara') +
    linha('Teto', pct(MARGEM_MAX), 'nenhum caminho pode passar disto') +
    linha('Na rodada em curso', atual === null || atual === undefined ? '—' : pct(atual),
          'o mesmo valor que a tela mostra ao lado das odds') +
    `<div class="row" style="margin-top:9px">
       <input type="number" id="admMargemVal" step="0.01" min="0" max="${MARGEM_MAX}"
              value="${daCasa === null ? '' : daCasa}" placeholder="ex.: 0.08"
              style="flex:0 0 130px;padding:8px 10px">
       <button class="btn" id="admMargemOk">Definir</button>
       <button class="btn" id="admMargemOff">Usar a do motor</button>
     </div>
     <div class="tiny" style="margin-top:6px">Ação destrutiva: exige papel <b>economia</b>,
       motivo escrito e confirmação — e fica registrada na auditoria com o valor de antes e o
       de depois. Vale a partir da PRÓXIMA rodada: mudar o preço de uma rodada com aposta viva
       alteraria o retorno de um bilhete já confirmado, e o §4.4.6 proíbe aplicação
       retroativa.</div>`;

  /* AS DUAS AÇÕES CHAMAM A MESMA FUNÇÃO, com valores diferentes. Um caminho
     separado para "voltar ao motor" seria uma segunda chance de esquecer o
     motivo ou a confirmação. */
  $('#admMargemOk').onclick  = () => pedirMargem(parseFloat($('#admMargemVal').value));
  $('#admMargemOff').onclick = () => pedirMargem(null);
}

/* O MOTIVO É PEDIDO ANTES DA CONFIRMAÇÃO, e não depois. Quem escreve o motivo
   primeiro chega à confirmação já tendo formulado por que está fazendo aquilo —
   e é justamente o que a auditoria vai guardar. Confirmar primeiro e explicar
   depois transforma o motivo em formalidade. */
async function pedirMargem(valor){
  const motivo = await pedirTexto(
    valor === null ? 'Motivo para voltar à margem do motor:' : `Motivo para definir a margem em ${valor}:`,
    { ok: 'Continuar' });
  if (motivo === null) return;

  const alvo = valor === null ? 'a margem do motor' : pct(valor);
  if (!await confirmar(`Definir a margem da casa para ${alvo}? Vale a partir da próxima rodada, ` +
                       `e fica registrado na auditoria.`, { ok: 'Definir', perigo: true })) return;

  const r = await apiAdm.post('/api/admin/margem', { valor, motivo, confirmado: true });
  if (!r.ok){
    await avisar(r.indisponivel ? 'O servidor não respondeu. Nada foi alterado.'
                                : (r.corpo?.erro || 'A margem não foi alterada.'));
    return;
  }
  /* Redesenha do que o SERVIDOR devolve, e não do que se pediu: se ele tiver
     ajustado ou recusado parte, a tela mostra o que de fato vale. */
  await admAbrir();
}

/* O registro de precificação do §4.4.5, inteiro. É a tela que torna a odd
   auditável sem sair do jogo. */
function admOdds(){
  const r = S.odds;
  if (!r){ $('#admOdds').innerHTML = '<div class="tiny">Nenhuma rodada precificada ainda.</div>'; return; }
  $('#admOdds').innerHTML =
    linha('Simulações', num(r.sims), 'Monte Carlo por rodada (§4.4.2)') +
    linha('Margem configurada', pct(r.margemConfigurada)) +
    linha('Margem efetiva', pct(r.margemEfetiva), 'a partir do overround das odds ofertadas') +
    linha('Overround', r.overround.toFixed(4)) +
    linha('Pior erro relativo', pct(r.erroPior), 'do lutador de cauda mais fina') +
    linha('Pior viés de convexidade', pct(r.viesPior)) +
    linha('Teto por ticket', `${CUR} ${num(r.tetoPayoutPorTicket)}`) +
    linha('Teto de passivo', `${CUR} ${num(r.tetoPassivoPorRodada)}`, 'por rodada, pior caso') +
    linha('Motor / pack', `${r.versaoMotor} / ${r.versaoPack}`) +
    '<table style="margin-top:9px"><tbody>' + r.lutadores.map(l =>
      `<tr><td>${l.nome ?? S.fighters?.[l.idx]?.n ?? l.idx}</td>` +
      `<td class="od">x${l.odd.toFixed(2)}</td>` +
      `<td style="color:var(--dim)">p ${pct(l.prob)}</td>` +
      `<td style="color:var(--dim)">±${pct(l.erroRelativo)}</td>` +
      `<td style="color:var(--dim)">máx ${CUR} ${num(l.stakeMax)}</td></tr>`).join('') +
    '</tbody></table>';
}

/* Concede cosmético IGNORANDO a vaga de nível — é ferramenta de teste, e é a
   única coisa aqui que contorna uma regra do jogo. Por isso diz que contorna. */
function admShinyLab(){
  const p = S.profile;
  const nivel = nivelDe(p?.xp || 0);
  const lista = especies.slice(0, 40);
  $('#admShinyLab').innerHTML =
    linha('Nível', nivel, `${vagasNoNivel(nivel)} vaga(s) pela regra do jogo`) +
    `<div class="tiny" style="margin:6px 0 9px">Conceder daqui <b>ignora a vaga de nível</b>.
      É ferramenta de teste; a regra do jogo continua sendo a do perfil.</div>
     <div class="pick-grid">` + lista.map(e => {
      const tem = (p?.shiny?.gifs || []).includes(e.dex);
      const g = gifShinyAtivo(p, e.dex), k = skinShinyAtiva(p, e.dex);
      return `<div class="opt shiny ${tem ? 'on' : ''}" data-adm-shiny="${e.dex}">
        ${dexImg(e.dex, e.n, 'loading="lazy"', g)}
        <span class="sflag">${tem ? ((g ? 'GIF' : '') + (k ? ' arena' : '')).trim() || 'guardado' : 'conceder'}</span>
        <div class="cap">${nomeExibido(e.n)}</div></div>`;
    }).join('') + '</div>';

  $('#admShinyLab').querySelectorAll('[data-adm-shiny]').forEach(el => el.onclick = () => {
    const dex = +el.dataset.admShiny;
    const tem = (S.profile.shiny.gifs || []).includes(dex);
    if (tem) { alternar(S.profile, 'gif', dex); alternar(S.profile, 'skin', dex); }
    else {
      /* Ignora a vaga: empresta um nível alto o bastante só para esta chamada.
         A regra continua íntegra em `shiny-dados.mjs` — quem a contorna é o
         painel, explicitamente, e não uma exceção escondida lá dentro. */
      desbloquear(S.profile, dex, Number.MAX_SAFE_INTEGER);
    }
    saveProfile(S.profile); admRender();
  });
}

/* O QUE SAIU DA TELA DO JOGADOR NO V1.16 e mora aqui: velocidade do replay,
   diagnóstico de trilha e o commit da rodada. Nada disso é para quem aposta —
   é instrução de desenvolvedor e hash de build, e ocupava a quarta coluna de
   cinco numa tela que pede confiança em números. */
function admDev(){
  const el = $('#admDev'); if (!el) return;
  el.innerHTML =
    linha('Velocidade do replay', `${(S.speed ?? 1).toFixed(1)}x`, 'só local; em produção o relógio é do servidor') +
    `<input type="range" id="spd" min="0.4" max="3" step="0.1" value="${S.speed ?? 1}" style="width:100%">
     <div class="tiny" style="margin-top:4px">Controle local de teste. Em produção todo mundo vê a
       mesma coisa no mesmo instante.</div>
     <div class="admLinha"><span>Replay</span><b id="spdVal">${(S.speed ?? 1).toFixed(1)}x</b></div>` +
    /* A CARTEIRA LOCAL VEIO PARAR AQUI NO R20, e este é o lugar dela: é
       ferramenta de desenvolvedor, não número de auditoria. Enquanto morava no
       bloco de saldos, ela se parecia com medida da economia. */
    linha('Carteira local', `${CUR} ${num(saldo())}`,
          `só deste navegador · origem: ${ultimoDiagnostico.origem}`) +
    `<div class="row" style="margin-top:9px">
      <button class="btn" id="admMais">+1.000 ${MOEDA}</button>
      <button class="btn" id="admZerar" style="background:#4a2020;border-color:#7a3a3a">Zerar carteira</button>
    </div>`;
  ligarVelocidade();
  $('#admMais').onclick = () => { creditarCompra(1000, 'adm'); atualizarSaldo(); admRender(); };
  $('#admZerar').onclick = async () => {
    if (!await confirmar('Zerar a carteira e o ledger?', { ok: 'Zerar', perigo: true })) return;
    reiniciarCarteira(); atualizarSaldo(); admRender();
  };
}

/* ── AS TRÊS SEÇÕES NOVAS (R20 — P1.1, §10.9) ─────────────────────────────
 *
 * O servidor calculava faucets, sinks, circulação e divergência desde o F1.11,
 * e o cliente descartava tudo. Estas funções são o que faltava para a conta
 * chegar ao olho de alguém.
 *
 * O `pct` de uma série ausente não é "0%": é um traço. A distinção entre zero e
 * ausência atravessa todo este bloco, e é a mesma que o `grafico.mjs` protege
 * na geometria. */
const pctOuTraco = v => (Number.isFinite(v) ? pct(v) : '—');
const numOuTraco = (v, casas = 2) => (Number.isFinite(v) ? v.toFixed(casas) : '—');

/* FAUCETS, SINKS E FSR — de onde a moeda entra e por onde sai. */
function admPolitica(){
  const el = $('#admPolitica'); if (!el) return;
  const p = painel;
  if (!p){ el.innerHTML = '<div class="tiny">Painel não carregado.</div>'; return; }

  const lista = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1])
    .slice(0, 8).map(([rotulo, valor]) => ({ rotulo, valor }));

  el.innerHTML =
    `<div class="admGraf"><h4>Faucets — por onde a moeda entra</h4>
       ${barras({ dados: lista(p.faucets) })}</div>` +
    `<div class="admGraf"><h4>Sinks — por onde ela sai</h4>
       ${barras({ dados: lista(p.sinks) })}</div>` +
    /* FSR = faucets/sinks. Acima de 1 a economia infla; abaixo, drena. É a
       leitura que o §10.9 pede por balde, porque a política de cada um é
       diferente — bônus nasce para ser gasto, transferível não. */
    Object.entries(p.fsr || {}).map(([b, v]) =>
      linha(`FSR ${b}`, numOuTraco(v),
            v === null ? 'ainda não houve sink neste balde'
                       : v > 1 ? 'acima de 1 — inflando' : 'abaixo de 1 — drenando')).join('') +
    Object.entries(p.velocidade || {}).map(([b, v]) =>
      linha(`Velocidade ${b}`, numOuTraco(v), 'volume gasto ÷ circulação média da janela')).join('') +
    linha('DAU', num(p.dau ?? 0), 'usuários distintos nas últimas 24 h') +
    linha('WAU', num(p.wau ?? 0), 'usuários distintos nos últimos 7 dias') +
    Object.entries(p.porDau || {}).map(([b, v]) =>
      linha(`M ${b} / DAU`, Number.isFinite(v) ? `${CUR} ${num(v)}` : '—',
            v === null ? 'ninguém ativo na janela' : 'moeda por usuário ativo')).join('');
}

/* DISTRIBUIÇÃO — quem tem quanto. Tudo somado do ledger, nunca do cache. */
function admDistribuicao(){
  const el = $('#admDistribuicao'); if (!el) return;
  const d = painel?.distribuicao;
  if (!d){ el.innerHTML = '<div class="tiny">Painel não carregado.</div>'; return; }

  el.innerHTML =
    `<div class="admGraf"><h4>Saldo por percentil</h4>
       ${barras({ dados: [
         { rotulo: 'p10', valor: d.p10 }, { rotulo: 'p50', valor: d.p50 },
         { rotulo: 'p90', valor: d.p90 }] })}</div>` +
    linha('Carteiras', num(d.carteiras ?? 0), 'jogadores com lançamento no ledger') +
    linha('Gini', numOuTraco(d.gini, 3),
          `0 é igualdade; o máximo com ${d.carteiras ?? 0} carteiras é ${
            d.carteiras ? numOuTraco((d.carteiras - 1) / d.carteiras, 3) : '—'}`) +
    linha('Top 1%', pctOuTraco(d.topo1), 'fatia do total na maior carteira') +
    linha('Top 10%', pctOuTraco(d.topo10), 'fatia do total nas maiores') +
    linha('Abaixo de 1 stake', pctOuTraco(d.abaixoDe1Stake),
          `menos de ${CUR} ${num(painel.stakeBronze)} — não dá para jogar`) +
    linha('Abaixo de 5 stakes', pctOuTraco(d.abaixoDe5Stakes),
          `menos de ${CUR} ${num(painel.stakeBronze * 5)}`) +
    linha('Overhang', numOuTraco(d.overhang),
          'saldo mediano em stakes Bronze — §10.9, enquanto não há mercado aberto');
}

/* FAVORECIMENTO — a pergunta do QUADRO DE IDEIAS, numa medida só:
   a casa está ficando com mais do que declarou ficar? */
function admFavorecimento(){
  const el = $('#admFavorecimento'); if (!el) return;
  const p = painel;
  if (!p){ el.innerHTML = '<div class="tiny">Painel não carregado.</div>'; return; }

  const configurada = p.margem === null || p.margem === undefined ? CONF.MARGIN : p.margem;
  const real = p.arena?.edgeRealizado ?? null;
  const descolou = Number.isFinite(real) && real > configurada;

  el.innerHTML =
    `<div class="admGraf"><h4>Edge realizado × margem configurada</h4>
       ${medidor({ valor: real, referencia: configurada,
                   max: Math.max(0.30, configurada * 2, (real ?? 0) * 1.2),
                   rotulo: 'edge realizado' })}</div>` +
    linha('Configurada', pct(configurada), p.margem === null ? 'a do motor' : 'definida pela casa') +
    linha('Realizada', pctOuTraco(real),
          real === null ? 'nenhuma rodada liquidada ainda' : '(apostado − pago) ÷ apostado') +
    linha('Volume', `${CUR} ${num(p.arena?.volume ?? 0)}`,
          `${num(p.arena?.liquidadas ?? 0)} aposta(s) liquidada(s)`) +
    linha('Pago', `${CUR} ${num(p.arena?.pago ?? 0)}`, 'prêmios efetivamente creditados') +
    (descolou
      ? `<div class="admAlerta"><b>O realizado passou do configurado.</b>
          <div class="tiny">Ou a precificação tem viés, ou a margem foi alterada. Toda alteração
          deixa rastro — confira a auditoria antes de concluir qualquer coisa.</div></div>`
      : '');
}

function admEstat(){
  const evs = eventos();
  const conta = {};
  for (const e of evs) conta[e.evento] = (conta[e.evento] || 0) + 1;
  const p = S.profile || PROFILE_DEFAULT;
  $('#admEstat').innerHTML =
    linha('Rodada', S.seeds ? S.seeds.raiz.toString(16) : '—', 'raiz do §P3, em hexadecimal') +
    linha('Commit', S.commit ? S.commit.commit.slice(0, 24) + '…' : '—', '§4.5, publicado antes da aposta') +
    linha('Arena', S.state ?? '—') +
    linha('Apostas do perfil', `${p.betsCount ?? 0}`, `${CUR} ${num(p.totalBet ?? 0)} no total`) +
    linha('Eventos no anel', `${evs.length}`, 'telemetria da sessão, §4.7') +
    Object.entries(conta).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([n, q]) => linha(n, q, 'evento')).join('') +
    `<div class="row" style="margin-top:9px"><button class="btn" id="admRecarregar">Recarregar perfil do disco</button></div>`;
  $('#admRecarregar').onclick = () => { S.profile = loadProfile(); admRender(); };
}
