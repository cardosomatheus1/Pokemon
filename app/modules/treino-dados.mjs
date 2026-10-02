/* O TEAM BUILDER E O POKÉMON BUILD — os dados da tela (ST-10.7 · F4.2 ·
 * Spec §8.3, §12 telas 20–21).
 *
 * Camada 0. Junta o que as ST-10.2 a 10.6 já calculam — o time, o power em
 * partes, a ficha de luta de cada um, as fraquezas — num painel que a tela só
 * pinta. A chance e as trocas NÃO são calculadas aqui: são Monte Carlo, e a
 * tela os fatia por quadro (`treino-tela.mjs`), com as entradas que ESTE
 * módulo prepara (`entradasDoTime`, `rivalDe`, `candidatosDaCaixa`).
 *
 * O time é a EQUIPE do idle (os que não estão na caixa): um time só, o mesmo
 * que sai em expedição. Montar um segundo time para o treino criaria duas
 * verdades sobre "quem está comigo".
 */
import { potencialDe } from '../../engine/instancia.mjs';
import { especieDe } from '../../engine/especie.mjs';
import { naEquipe, naCaixa } from './idle-dados.mjs';
import { golpesDaCriatura, movesetDoRival } from './moveset-dados.mjs';
import { paraTreino, powerDe, fraquezasDoTime, TIME_MAX } from '../../engine/time.mjs';
import { montarLutador, PRESETS } from '../../engine/treino-batalha.mjs';

const golpeDoPack = (pack, n) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n) ?? null;
const especie = (pack, dex) => especieDe(pack, dex);

export const treinadoresDo = pack => pack?.treinadores ?? [];
export const treinador = (pack, id) => treinadoresDo(pack).find(t => t.id === id) ?? treinadoresDo(pack)[0] ?? null;

/* O rival luta com os golpes liberados no nível dele, escolhidos pela força
   de quem bate (ST-10.13 · L-200: `movesetDoRival`). */
export const rivalDe = (pack, t) => (t?.time ?? []).map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel),
  /* ST-10.18: o chefe leva a vida multiplicada do pack. */
  ...(x.vidaX ? { vidaX: x.vidaX } : {}) }));

export const entradasDoTime = (pack, estado) => naEquipe(estado).map(c => paraTreino(c, golpesDaCriatura(pack, c)));

/* Os candidatos das trocas (ST-10.6): a caixa, cada um com power e entrada. */
export const candidatosDaCaixa = (pack, estado) => naCaixa(estado).map(c => {
  const golpes = golpesDaCriatura(pack, c);
  return { id: c.id, power: powerDe(pack, c, golpes).total, entrada: paraTreino(c, golpes) };
});
export const membrosParaTrocas = (pack, estado) => naEquipe(estado).map(c => {
  const golpes = golpesDaCriatura(pack, c);
  return { id: c.id, power: powerDe(pack, c, golpes).total, entrada: paraTreino(c, golpes) };
});

/* O cartão de um membro: o Team Builder mostra o resumo, o Build a ficha. */
function cartao(pack, c, nomeDe) {
  const golpes = golpesDaCriatura(pack, c);
  const esp = especie(pack, c.dex);
  const f = montarLutador(pack, paraTreino(c, golpes), 'A', 0);
  return {
    id: c.id, dex: c.dex, nome: nomeDe(esp?.n ?? '?'), nivel: c.nivel,
    tipos: (esp?.t ?? []).map(t => ({ t, nome: pack.tipos?.nomes?.[t] ?? t })),
    power: powerDe(pack, c, golpes),
    /* O potencial da CRIATURA (0–100), ao lado da parte dele no poder (0–10):
       "potencial 6" sozinho se lia como o potencial dela (ST-2.24). */
    potencial: Array.isArray(c.iv) ? potencialDe(c.iv) : null,
    golpes: golpes.map(n => { const g = golpeDoPack(pack, n); return { n, tipo: pack.tipos?.nomes?.[g?.t] ?? g?.t, cat: g?.cat === 'fis' ? 'físico' : 'especial', p: g?.p }; }),
    ficha: { vida: f.maxHp, atq: f.atk, def: f.def, esp: f.spa, espDef: f.spd, vel: f.spe },
  };
}

export function painelDoTime({ pack, estado, nomeDe = n => n }) {
  const equipe = naEquipe(estado), caixa = naCaixa(estado);
  const membros = equipe.map(c => cartao(pack, c, nomeDe));
  const time = equipe.map(c => ({ c, golpes: golpesDaCriatura(pack, c) }));
  return {
    vazio: !estado?.criaturas?.length,
    membros,
    vagas: TIME_MAX - membros.length,
    total: membros.reduce((a, m) => a + m.power.total, 0),
    fraquezas: fraquezasDoTime(pack, time).slice(0, 3).map(x => ({ ...x, nome: pack.tipos?.nomes?.[x.tipo] ?? x.tipo })),
    caixa: caixa.map(c => cartao(pack, c, nomeDe)).sort((a, b) => b.power.total - a.power.total),
  };
}

/* O rótulo de cada parte do power, na ordem em que a tela as empilha. */
export const PARTES_DO_POWER = Object.freeze([
  { k: 'nivel', rotulo: 'nível' }, { k: 'especie', rotulo: 'espécie' },
  { k: 'golpes', rotulo: 'golpes' }, { k: 'potencial', rotulo: 'potencial' }]);

/* ST-10.8 · os Tactical Presets na tela: o nome e a regra em uma linha. */
export const PRESETS_NA_TELA = Object.freeze([
  { id: 'balanced',   nome: 'Equilibrado',       explica: 'o golpe de maior dano esperado' },
  { id: 'aggressive', nome: 'Agressivo',         explica: 'o golpe que mais perto chega de derrubar, no alvo mais frágil' },
  { id: 'defensive',  nome: 'Defensivo',         explica: 'primeiro o rival que mais ameaça o seu time' },
  { id: 'focus',      nome: 'Foco na fraqueza',  explica: 'o golpe super-efetivo antes de qualquer outro' },
]);
export const presetValido = p => (PRESETS.includes(p) ? p : 'balanced');

