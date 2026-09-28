/* OS INDICADORES DA V3 E O GATE 3→4 (ST-9.18 · F3.13 · Spec §7.20, §7.21).
 *
 * Puro: entram apostas, consultas ao dossiê e coortes; saem os KPIs do §7.20 e
 * o veredito de cada critério do §7.21 — com o n, ou "amostra insuficiente".
 * Mesma regra do gate da V2: ele MEDE e não tranca (decisão do dono, 26/09), e
 * abaixo da amostra declarada nunca diz "passou" por falta de contra-exemplo.
 *
 * ── DUAS COMPARAÇÕES, E AS DUAS CONTROLAM O TEMPO DE JOGO ─────────────────
 *
 * Quem joga mais aposta em mais espécies e volta mais. Comparar sem controlar
 * isso mede o apetite do jogador, e não o efeito do dossiê ou da captura:
 *
 *   DIVERSIDADE   por jogador, as K últimas apostas ANTES da primeira consulta
 *                 ao dossiê contra as K primeiras DEPOIS, com o mesmo K dos
 *                 dois lados (espécies distintas / K). Janela desigual daria
 *                 diversidade maior ao lado mais comprido, sempre.
 *   D7            quem capturou contra quem não capturou DENTRO da mesma faixa
 *                 de atividade no dia do cadastro, e a diferença é a média das
 *                 faixas pesada pelo tamanho. A diferença crua vai ao lado, para
 *                 o leitor ver quanto dela era só apetite.
 */
import { BANDA_DE_CAPTURA } from './antifraude.mjs';

export const META = Object.freeze({
  janelaMin: 5, janelaMax: 10, usuariosDossie: 20, usuariosD7: 30,
});
/* As faixas de atividade no dia 0 (eventos + atividades de arena). */
export const FAIXAS = Object.freeze([[0, 2], [3, 9], [10, Infinity]]);
const INSUF = 'amostra insuficiente';
const media = v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/* `usuarios`: [{ apostas: [{ em, especie }], primeiraConsulta: ms | null }] */
export function diversidadeAntesDepois(usuarios) {
  const pares = [];
  for (const u of usuarios ?? []) {
    if (!Number.isFinite(u.primeiraConsulta)) continue;
    const ordem = [...(u.apostas ?? [])].sort((a, b) => a.em - b.em);
    const antes = ordem.filter(a => a.em < u.primeiraConsulta);
    const depois = ordem.filter(a => a.em >= u.primeiraConsulta);
    const k = Math.min(antes.length, depois.length, META.janelaMax);
    if (k < META.janelaMin) continue;
    const div = lista => new Set(lista.map(a => a.especie)).size / k;
    pares.push({ antes: div(antes.slice(-k)), depois: div(depois.slice(0, k)) });
  }
  return {
    n: pares.length,
    antes: media(pares.map(p => p.antes)), depois: media(pares.map(p => p.depois)),
    subiram: pares.filter(p => p.depois > p.antes).length,
    desceram: pares.filter(p => p.depois < p.antes).length,
  };
}

/* `usuarios`: [{ capturou, atividadeDia0, voltouD7: bool | null }] — null é
   coorte que ainda não fez sete dias, e fica de fora. */
export function d7PorCaptura(usuarios) {
  const validos = (usuarios ?? []).filter(u => typeof u.voltouD7 === 'boolean');
  const taxa = l => (l.length ? l.filter(u => u.voltouD7).length / l.length : null);
  const estratos = FAIXAS.map(([de, ate]) => {
    const nela = validos.filter(u => u.atividadeDia0 >= de && u.atividadeDia0 <= ate);
    const sim = nela.filter(u => u.capturou), nao = nela.filter(u => !u.capturou);
    return { de, ate, capturou: { n: sim.length, d7: taxa(sim) }, naoCapturou: { n: nao.length, d7: taxa(nao) } };
  });
  const comparaveis = estratos.filter(e => e.capturou.n && e.naoCapturou.n);
  const peso = e => e.capturou.n + e.naoCapturou.n;
  const total = comparaveis.reduce((a, e) => a + peso(e), 0);
  const sim = validos.filter(u => u.capturou), nao = validos.filter(u => !u.capturou);
  return {
    n: total, estratos,
    diferenca: total ? comparaveis.reduce((a, e) => a + peso(e) * (e.capturou.d7 - e.naoCapturou.d7), 0) / total : null,
    diferencaCrua: sim.length && nao.length ? taxa(sim) - taxa(nao) : null,
  };
}

/* O gate. `p4` e `antifraude` vêm de fora porque não são medição de jogador:
   o P4 é o teste `test/p4-v3.mjs` (a suíte verde é condição de todo bloco), e
   a antifraude de captura é a ST-13.6 — a taxa de detecção MEDIDA com fraude
   plantada (`DETECCAO_MEDIDA`), que o servidor passa aqui. */
export function gateDaV3({ diversidade, capturas, antifraude = null }) {
  const dossie = diversidade.n < META.usuariosDossie
    ? { veredito: INSUF, n: diversidade.n, precisa: META.usuariosDossie }
    : { veredito: diversidade.depois > diversidade.antes && diversidade.subiram > diversidade.desceram ? 'passou' : 'não passou',
        n: diversidade.n, valor: [diversidade.antes, diversidade.depois] };
  /* "Nas bandas projetadas": a banda saiu da simulação do idle na ST-13.6
     (L-197, `BANDA_DE_CAPTURA`) — de meio abaixo do casual mais lento a um
     quarto acima do maratona mais rápido. */
  const valor = capturas.jogadorDias ? capturas.total / capturas.jogadorDias : null;
  const captura = capturas.jogadorDias
    ? { veredito: valor >= BANDA_DE_CAPTURA.min && valor <= BANDA_DE_CAPTURA.max ? 'passou' : 'não passou',
        n: capturas.jogadorDias, valor, banda: [BANDA_DE_CAPTURA.min, BANDA_DE_CAPTURA.max] }
    : { veredito: INSUF, n: 0 };
  const p4 = { veredito: 'coberto pela suíte', teste: 'test/p4-v3.mjs' };
  const af = antifraude ? { veredito: 'medida', ...antifraude }
    : { veredito: 'não passou', motivo: 'sem a taxa de detecção medida — ST-13.6' };
  const criterios = { dossie, captura, p4, antifraude: af };
  const vs = Object.values(criterios).map(c => c.veredito);
  const veredito = vs.includes('não passou') ? 'não passou' : vs.includes(INSUF) ? INSUF : 'passou';
  return { veredito, criterios };
}
