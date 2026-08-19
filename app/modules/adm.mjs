/* PAINEL DE ADM — a tela. As regras e a validação vivem em `adm-dados.mjs`.
 *
 * Abre só por `#adm` no endereço; nada no menu aponta para cá, de propósito.
 * Quem chega ao painel chegou porque quis — um botão no menu convidaria a
 * mexer sem entender o que se mexe.
 *
 * O QUE ELE NÃO TEM, e é decisão registrada: o simulador de baús. Os baús
 * ficaram fora do porte por decisão do dono do projeto — vão pelo nosso
 * roadmap, com o nosso cálculo (V1.16). Portar o simulador seria portar a
 * economia junto.
 */
import { $ } from './dom.mjs';
import { CONF, CUR, MOEDA, especies, nomeExibido } from './motor.mjs';
import { S } from './estado.mjs';
import { ADM_PIN, CHAVE_ADM, MARGEM_MAX, lerConf, margemDaRodada } from './adm-dados.mjs';
import { goView } from './navegacao.mjs';
import { creditarCompra, reiniciarCarteira, saldo, ultimoDiagnostico } from './banco.mjs';
import { atualizarSaldo } from './controles.mjs';
import { PROFILE_DEFAULT, loadProfile, nivelDe, saveProfile } from './perfil.mjs';
import { alternar, desbloquear, gifShinyAtivo, skinShinyAtiva, vagasNoNivel } from './shiny-dados.mjs';
import { dexImg } from './sprites.mjs';
import { eventos } from './telemetria.mjs';

let liberado = false;

export function admConf(){
  let bruto = null;
  try { bruto = localStorage.getItem(CHAVE_ADM); } catch { /* modo privado */ }
  return lerConf(bruto);
}

function admSalvar(c){
  try { localStorage.setItem(CHAVE_ADM, JSON.stringify(c)); } catch { /* modo privado */ }
}

/* A margem que a PRÓXIMA rodada vai usar. `undefined` quando o painel não
   declarou nada — aí `precificar` cai no padrão do motor sozinho. */
export const margemConfigurada = () => margemDaRodada(admConf());

/* O PIN não protege nada (ver adm-dados.mjs). Ele evita a abertura acidental
   por quem digitou #adm sem querer, e é tudo o que ele promete. */
export function admEntrar(){
  if (liberado) return admAbrir();
  const pin = prompt('PIN do painel de ADM:');
  if (pin === null) return;
  if (pin !== ADM_PIN){ alert('PIN incorreto.'); return; }
  liberado = true;
  admAbrir();
}

export function admAbrir(){ goView('viewAdm'); admRender(); }

export function admChecarHash(){
  if (location.hash.toLowerCase() === '#adm') admEntrar();
}

export function admRender(){
  if (!$('#admCorpo')) return;
  admSaldos(); admMargem(); admOdds(); admShinyLab(); admEstat();
}

const pct = v => (v * 100).toFixed(2) + '%';
const num = v => Math.round(v).toLocaleString('pt-BR');

function linha(rotulo, valor, nota){
  return `<div class="admLinha"><span>${rotulo}</span><b>${valor}</b>` +
         (nota ? `<i style="color:var(--dim);font-style:normal;font-size:.7rem">${nota}</i>` : '') + '</div>';
}

function admSaldos(){
  const d = ultimoDiagnostico;
  $('#admSaldos').innerHTML =
    linha('Saldo', `${CUR} ${num(saldo())}`, `${MOEDA} disponível, somando os baldes do §5.5`) +
    (S.carteira ? Object.entries(S.carteira.saldos || {})
      .map(([b, v]) => linha(b, `${CUR} ${num(v)}`, 'balde')).join('') : '') +
    linha('Ledger', `${S.carteira?.ledger?.length ?? 0} lançamento(s)`,
          `origem: ${d.origem}${d.problemas.length ? ' · ' + d.problemas.length + ' problema(s)' : ''}`) +
    `<div class="row" style="margin-top:9px">
      <button class="btn" id="admMais">+1.000 ${MOEDA}</button>
      <button class="btn" id="admZerar" style="background:#4a2020;border-color:#7a3a3a">Zerar carteira</button>
    </div>`;
  $('#admMais').onclick = () => { creditarCompra(1000, 'adm'); atualizarSaldo(); admRender(); };
  $('#admZerar').onclick = () => {
    if (!confirm('Zerar a carteira e o ledger?')) return;
    reiniciarCarteira(); atualizarSaldo(); admRender();
  };
}

/* A MARGEM DO PAINEL É A MESMA QUE A TELA DECLARA — ver adm-dados.mjs.
   Vale a partir da PRÓXIMA rodada de propósito: mudar o preço de uma rodada
   com aposta viva mudaria o retorno de um ticket já confirmado, e o §4.4.6
   proíbe aplicação retroativa. */
function admMargem(){
  const c = admConf();
  const atual = S.odds ? S.odds.margemConfigurada : null;
  $('#admMargem').innerHTML =
    linha('Do motor', pct(CONF.MARGIN), 'padrão quando o painel não declara nada') +
    linha('Do painel', c.margem === null ? '—' : pct(c.margem), `teto de ${pct(MARGEM_MAX)}`) +
    linha('Na rodada em curso', atual === null || atual === undefined ? '—' : pct(atual),
          'o mesmo valor que a tela mostra ao lado das odds') +
    `<div class="row" style="margin-top:9px">
       <input type="number" id="admMargemVal" step="0.01" min="0" max="${MARGEM_MAX}"
              value="${c.margem === null ? '' : c.margem}" placeholder="ex.: 0.08" style="max-width:130px">
       <button class="btn" id="admMargemOk">Aplicar</button>
       <button class="btn" id="admMargemOff">Usar a do motor</button>
     </div>
     <div class="tiny" style="margin-top:6px">Vale a partir da PRÓXIMA rodada — mudar o preço de uma
       rodada com aposta viva alteraria o retorno de um ticket já confirmado, e o §4.4.6 proíbe
       aplicação retroativa.</div>`;
  $('#admMargemOk').onclick = () => {
    const v = parseFloat($('#admMargemVal').value);
    admSalvar({ ...c, margem: Number.isFinite(v) ? v : null });
    admRender();
  };
  $('#admMargemOff').onclick = () => { admSalvar({ ...c, margem: null }); admRender(); };
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
        <span class="sflag">${tem ? (g ? 'GIF' : '') + (k ? ' arena' : '') || 'guardado' : 'conceder'}</span>
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
