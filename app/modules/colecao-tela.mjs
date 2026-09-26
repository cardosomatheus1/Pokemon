/* A COLEÇÃO NA POKÉDEX — medalhas e missões da semana (ST-9.15).
 *
 * Camada 4: pinta o que `colecao-dados.mjs` devolve, e grava o resgate por
 * `colecao-local.mjs`. As medalhas mostram as ganhas e as três mais perto de
 * sair — a lista inteira (quarenta e tantas) seria ruído; a Pokédex é o lugar
 * de olhar a coleção, e não de ler uma planilha dela.
 */
import { $ } from './dom.mjs';
import { PACK, elenco } from './motor.mjs';
import { carregarMarcas } from './pokedex-estado.mjs';
import { medalhasDeColecao } from './colecao-dados.mjs';
import { quadroDaSemana, resgatarMissaoLocal } from './colecao-local.mjs';
import { nomesDe } from './itens-nome.mjs';

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

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-missao]');
  if (!b) return;
  const r = resgatarMissaoLocal(PACK, { id: b.dataset.missao, marcas: carregarMarcas(), agora: Date.now() });
  if (!r.ok) { b.title = r.motivo; return; }
  pintarColecao();
});
