/* A COLEÇÃO NA POKÉDEX — medalhas e missões da semana (ST-9.15).
 *
 * Camada 4: pinta o que `colecao-dados.mjs` e `minha-colecao.mjs` devolvem, e grava o resgate por
 * `colecao-local.mjs`. As medalhas mostram as ganhas e as três mais perto de
 * sair — a lista inteira (quarenta e tantas) seria ruído; a Pokédex é o lugar
 * de olhar a coleção, e não de ler uma planilha dela.
 */
import { $ } from './dom.mjs';
import { PACK, elenco, nomeExibido } from './motor.mjs';
import { carregarMarcas, dossieDoPack } from './pokedex-estado.mjs';
import { medalhasDeColecao } from './colecao-dados.mjs';
import { quadroDaSemana, resgatarMissaoLocal } from './colecao-local.mjs';
import { nomesDe } from './itens-nome.mjs';
import { S } from './estado.mjs';
import { carregar } from './idle-dados.mjs';
import { painelDaColecao, textoDaLinha, dicaDaRodada } from './minha-colecao.mjs';
import { dexImg } from './sprites.mjs';

const NIVEIS = ['', 'bronze', 'prata', 'ouro', 'diamante'];
const moeda = PACK.moedaPve ?? { id: 'moeda', nome: 'moeda' };
const nomeDoPremio = k => (k === 'pokecoin' ? moeda.nome : (PACK.bolas ?? []).find(b => b.id === k)?.rotulo ?? nomesDe(PACK)(k));

export function pintarColecao() {
  const alvo = $('#pdxColecao');
  if (!alvo) return;
  const marcas = carregarMarcas();
  const { e, quadro } = quadroDaSemana({ marcas, agora: Date.now() });
  const medalhas = medalhasDeColecao(PACK, e, { marcas, naArena: elenco });
  const ganhas = medalhas.filter(m => m.tier > 0);
  const perto = medalhas.filter(m => m.tier === 0 && m.prox).sort((a, b) => b.val / b.prox - a.val / a.prox).slice(0, 3);
  const medalha = m => `<span class="colMed n${Math.min(4, m.tier)}${m.tier ? '' : ' perto'}" title="${m.nome}">
      <b>${m.nome}</b><i>${m.tier ? NIVEIS[Math.min(4, m.tier)] + ' · ' : ''}${m.val}${m.unidade ?? ''}${
        m.prox && m.passos > 1 ? ` · próxima em ${m.prox}${m.unidade ?? ''}` : m.de ? ` de ${m.de}${m.unidade ?? ''}` : ''}</i></span>`;
  /* "7% de 25%" foi lido como conta errada (Q5): o segundo número é o degrau
     seguinte, e agora diz isso. */
  alvo.innerHTML = `
    <h3>Coleção <span class="tiny">${ganhas.length} medalha(s) · missões da semana pagam ${moeda.nome} e bolas</span></h3>
    <div class="colMedalhas">${ganhas.map(medalha).join('')}${perto.map(medalha).join('')}</div>
    <div class="colMissoes">${quadro.map(m => `
      <div class="colMissao${m.resgatada ? ' feita' : ''}">
        <span class="colTxt">${m.texto}</span>
        <span class="colBarra"><i style="width:${Math.round(100 * m.feito / m.meta)}%"></i></span>
        <span class="colN">${m.feito}/${m.meta}</span>
        <span class="colPremio">${Object.entries(m.premio).map(([k, v]) => `+${v} ${nomeDoPremio(k)}`).join(' · ')}</span>
        ${m.resgatada ? '<span class="colOk">resgatada</span>'
          : `<button class="btn${m.pronta ? ' gold' : ''}" data-missao="${m.id}" ${m.pronta ? '' : 'disabled'}>Resgatar</button>`}
      </div>`).join('')}</div>`;
}

/* ── MINHA COLEÇÃO (ST-9.16b · §7.15) ──────────────────────────────────────
 *
 * "Dá para decidir em quem apostar sem sair dela": a rodada aberta, lutador
 * por lutador, com o que o jogador SABE dele (degrau, histórico, as dele da
 * linha, o doce) ao lado da odd — e o atalho que leva à Arena com o lutador
 * já escolhido. O que ele não sabe não aparece: o painel respeita a escada.
 */
const NOME_DO_DEGRAU = { desconhecida: 'nova', vista: 'vista', encontrada: 'encontrada', capturada: 'capturada', dominada: 'dominada' };

export function pintarMinha() {
  const alvo = $('#pdxMinha');
  if (!alvo) return;
  const apostando = S.state === 'betting' && S.odds;
  const { resumo, rodada } = painelDaColecao({ pack: PACK, estado: carregar(), marcas: carregarMarcas(), dossie: dossieDoPack(PACK),
    pool: apostando ? S.fighters : null, odds: apostando ? S.odds : null, agora: Date.now() });
  const dica = dicaDaRodada(rodada);
  const linha = r => {
    const t = textoDaLinha(r);
    return `<div class="mcLinha">
      ${dexImg(r.dex, r.nome, 'class="mcSprite"')}
      <span class="mcNome">${nomeExibido(r.nome)}<i class="${r.degrau}">${NOME_DO_DEGRAU[r.degrau] ?? r.degrau}</i></span>
      <span class="mcOdd">${t.odd}<small>${t.chance}</small></span>
      ${S.myBet ? '' : `<button class="btn gold" data-goto="viewArena" data-escolher="${r.idx}">Apostar</button>`}
      <span class="mcSobre">${[t.nota && `<b>${t.nota}</b>`, ...t.sobre].filter(Boolean).join(' · ')}</span>
    </div>`;
  };
  alvo.innerHTML = `
    <div class="mcResumo">
      <span><b>${resumo.criaturas}</b> criatura(s) · <b>${resumo.naEquipe}</b> na equipe · <b>${resumo.naCaixa}</b> na caixa</span>
      <span><b>${resumo.especies}</b> de ${resumo.totalPokedex} espécies capturadas</span>
      <span><b>${resumo.doces}</b> doce(s)</span>
      <span><b>${resumo.expedicoesEmCampo}</b> expedição(ões) em campo${resumo.prontas ? ` · <b>${resumo.prontas}</b> pronta(s) para colher` : ''}</span>
    </div>
    <div class="mcRodada">
      <h4>Nesta rodada ${S.myBet ? '<span class="tiny">— você já apostou</span>' : ''}</h4>
      <p class="mcDica"><i class="vista">vista</i> já passou pela Arena · <i class="encontrada">encontrada</i> você já apostou nela ·
        <i class="capturada">capturada</i> você tem uma · <b>histórico</b> = quanto ela venceu nas rodadas passadas;
        <b>% de vencer</b> = a chance nesta.${dica ? ` Para ver o histórico de uma espécie: ${dica}.` : ''}</p>
      ${rodada ? `<div class="mcLista">${rodada.map(linha).join('')}</div>`
        : '<p class="mcVazio">A janela de apostas não está aberta agora — a próxima rodada aparece aqui.</p>'}
    </div>`;
}

/* A ABA: lembrada por aparelho (preferência de leitura, e não jogo). */
const CHAVE_ABA = 'ar_pdx_aba';
export function mostrarAba(aba) {
  const colecao = aba === 'colecao';
  const a = $('#pdxAbaPokedex'), b = $('#pdxAbaColecao');
  if (a) a.hidden = colecao;
  if (b) b.hidden = !colecao;
  document.querySelectorAll('[data-pdx-aba]').forEach(x => x.classList.toggle('on', x.dataset.pdxAba === aba));
  try { localStorage.setItem(CHAVE_ABA, aba); } catch { /* privativo */ }
  if (colecao) { pintarMinha(); pintarColecao(); }
}
export const abaLembrada = () => { try { return localStorage.getItem(CHAVE_ABA) ?? 'pokedex'; } catch { return 'pokedex'; } };

/* A rodada muda sozinha: com a aba aberta, repinta a cada 3 s. */
setInterval(() => {
  const b = document.getElementById('pdxAbaColecao');
  if (b && !b.hidden && document.getElementById('viewPokedex')?.classList.contains('on')) pintarMinha();
}, 3000);

document.addEventListener('click', ev => {
  const aba = ev.target.closest('[data-pdx-aba]');
  if (aba) { mostrarAba(aba.dataset.pdxAba); return; }
  /* O ATALHO: o `data-goto` leva à Arena (navegacao.mjs); aqui, depois, o
     lutador é escolhido — a caixa de confirmação da aposta abre com ele. */
  const esc = ev.target.closest('[data-escolher]');
  if (esc) {
    const i = esc.dataset.escolher;
    setTimeout(() => {
      document.querySelector(`.pick[data-i="${i}"]`)?.click();
      /* Em 420 px a confirmação nascia fora da tela (Q5): o jogador via o
         lutador marcado e nenhum botão de confirmar. */
      const caixa = document.getElementById('confirmaAposta');
      if (caixa && !caixa.hidden) caixa.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
    return;
  }
  const b = ev.target.closest('[data-missao]');
  if (!b) return;
  const r = resgatarMissaoLocal(PACK, { id: b.dataset.missao, marcas: carregarMarcas(), agora: Date.now() });
  if (!r.ok) { b.title = r.motivo; return; }
  pintarColecao();
});
