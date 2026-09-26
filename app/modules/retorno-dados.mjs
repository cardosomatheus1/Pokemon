/* O LAÇO DE RETORNO — "desde a sua última visita" (ST-9.17 · §7.16, §13).
 *
 * Camada 0. O §7.16 diz por que o jogador volta: porque QUER SABER UMA COISA
 * ESPECÍFICA, e não porque um contador renovou. Então o cartão só existe
 * quando há NOVIDADE — expedição que ficou pronta, quem subiu de nível, os
 * doces que caíram —; a ficha a um passo de mudar e o que já esperava colher
 * entram como contexto; e ele termina num próximo passo.
 *
 * ── A FOTO DA VISITA ───────────────────────────────────────────────────────
 *
 * O ganho é diferença contra a foto da visita anterior (níveis por criatura,
 * doces por linha). A tela lê o cartão e SÓ DEPOIS grava a foto desta visita:
 * é o que impede o mesmo ganho de aparecer duas vezes.
 *
 * ── O RELÓGIO ──────────────────────────────────────────────────────────────
 *
 * "Pronta" é `pronta(x, agora)` — a mesma regra que a colheita usa, com o
 * mesmo instante. A hora gravada numa visita passada NUNCA entra nessa conta:
 * uma visita feita com o relógio adiantado não pode deixar o cartão prometer
 * uma colheita que o botão vai recusar.
 */
import { pronta } from './idle-dados.mjs';
import { registroDaLinha, degrauDe } from './pokedex-estado.mjs';
import { baseDe } from '../../engine/evolucao.mjs';

/* "A um passo": faltam no máximo 3 fichas — um encontro rende 1, e uma
   expedição boa traz 2 ou 3. Mais longe que isso é projeto, não passo. */
export const PERTO_DE_DOMINAR = 3;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function fotoDaVisita(e, agora) {
  return {
    em: agora,
    niveis: Object.fromEntries((e.criaturas ?? []).map(c => [c.id, c.nivel])),
    doces: { ...(e.doces ?? {}) },
  };
}

export function cartaoDeRetorno({ pack, estado: e, marcas, anterior, agora, nomeDe = n => n }) {
  if (!anterior || !Number.isFinite(anterior.em)) return null;
  const nome = d => nomeDe(pack.especies.find(x => x.dex === Number(d))?.n ?? '?');

  const aColher = (e.expedicoes ?? []).filter(x => !x.colhidaEm && pronta(x, agora));
  const prontas = aColher.length;
  /* NOVA é a que terminou depois da visita passada. A hora da visita só diz
     se é NOVIDADE — se está pronta, quem diz é `pronta(x, agora)`, acima. */
  const novasProntas = aColher.filter(x => x.terminaEm > anterior.em).length;
  const subiram = (e.criaturas ?? [])
    .filter(c => anterior.niveis?.[c.id] != null && c.nivel > anterior.niveis[c.id])
    .map(c => ({ id: c.id, dex: c.dex, de: anterior.niveis[c.id], para: c.nivel }));
  const doces = Object.entries(e.doces ?? {})
    .map(([l, n]) => ({ linha: Number(l), ganhos: n - (anterior.doces?.[l] ?? 0) }))
    .filter(d => d.ganhos > 0)
    .sort((a, b) => b.ganhos - a.ganhos || a.linha - b.linha);

  /* A linha CAPTURADA mais perto de dominar — uma, a mais perto. */
  let perto = null;
  const vistas = new Set();
  for (const c of e.criaturas ?? []) {
    const linha = baseDe(pack, c.dex);
    if (vistas.has(linha)) continue;
    vistas.add(linha);
    if (degrauDe(pack, e, c.dex, marcas) !== 'capturada') continue;
    const reg = registroDaLinha(pack, e, c.dex);
    const faltam = reg.alvo - reg.fragmentos;
    if (faltam > 0 && faltam <= PERTO_DE_DOMINAR && (!perto || faltam < perto.faltam)) perto = { linha, faltam };
  }

  /* SÓ NOVIDADE abre o cartão. A expedição que já estava pronta na visita
     passada e a ficha perto de dominar são ESTADO: entram como contexto de um
     cartão que já existe, e nunca o abrem sozinhas — senão o cartão aparece em
     toda abertura, o jogador cai sempre na Início, e aprende a ignorá-lo (Q5:
     recarregar a página repetia o cartão com "há pouco"). */
  if (!novasProntas && !subiram.length && !doces.length) return null;

  /* Cada item leva o `dex` de quem ilustra a linha: a tela põe o retrato ao
     lado (Q5: a lista seca de marcadores parecia protótipo). A expedição é
     ilustrada por quem foi nela. */
  const quemFoi = x => (e.criaturas ?? []).find(c => c.id === x.equipe?.[0])?.dex ?? null;
  const itens = [];
  if (prontas) itens.push({ tipo: 'expedicao', dex: quemFoi(aColher[0]),
    texto: `${plural(prontas, 'expedição pronta', 'expedições prontas')} para colher` });
  for (const s of subiram) itens.push({ tipo: 'nivel', dex: s.dex, texto: `${nome(s.dex)} subiu do nível ${s.de} para o ${s.para}` });
  for (const d of doces) itens.push({ tipo: 'doce', dex: d.linha, texto: `+${plural(d.ganhos, 'doce', 'doces')} da linha do ${nome(d.linha)}` });
  if (perto) itens.push({ tipo: 'ficha', dex: perto.linha,
    texto: `Faltam ${plural(perto.faltam, 'ficha', 'fichas')} para dominar a linha do ${nome(perto.linha)} e abrir o dossiê inteiro` });
  const linhas = itens.map(i => i.texto);

  const proximo = prontas ? { texto: 'Colher nas Rotas', goto: 'viewIdle' }
    : perto ? { texto: 'Mandar uma expedição nas Rotas', goto: 'viewIdle' }
    : { texto: 'Jogar uma rodada', goto: 'viewArena' };

  return { desde: Math.min(anterior.em, agora), prontas, novasProntas, subiram, doces, perto, itens, linhas, proximo };
}

/* "Há quanto tempo": horas até dois dias, depois dias. Menos de uma hora é
   "há pouco" — "há 0 h" foi o primeiro rascunho, e não é frase. */
export const haQuanto = ms => {
  const h = Math.floor(Math.max(0, ms) / 3600e3);
  return h >= 48 ? `há ${Math.floor(h / 24)} dias` : h >= 1 ? `há ${h} h` : 'há pouco';
};
