/* A TRAINER BATTLE ENGINE — o combate do time do jogador (ST-10.2 · F4.1 ·
 * Spec §8.2, §8.4, §8.9).
 *
 * `simular(pack, timeA, timeB, semente)` é DETERMINÍSTICO: a mesma semente dá
 * os mesmos eventos, em qualquer máquina. É o simulador de TREINO da Arena
 * (§8.1): aqui o jogador manipula uma probabilidade e vê o número mexer — e
 * por isso as regras são as que ele consegue LER, e nada que ele não controla:
 *
 *   sem killstreak, sem tempestade, sem BALANCE, sem alvo aleatório
 *   o nível É da criatura, e os quatro golpes são os que o jogador escolheu
 *   físico × especial, imunidade e tipo — pela mesma fórmula da Arena
 *   iniciativa por turno: velocidade × sorteio uniforme entre 0,90 e 1,10
 *
 * ── A FRONTEIRA (ST-10.1) ──────────────────────────────────────────────────
 *
 * Importa `primitivas.mjs` e NADA da Arena. O teste de grafo em
 * `test/primitivas.mjs` cobra isso de todo `engine/treino-*.mjs`. A escolha
 * de golpes da Arena (`atribuirGolpes`) não existe aqui: o golpe que luta é
 * o que o jogador escolheu, e um nome desconhecido é erro, não fallback.
 *
 * ── OS OCULTOS E A NATUREZA, COM PESO LIMITADO (R12, C4) ─────────────────
 *
 * O §21 manda não fazer "IV/EV/natureza completos". Aqui eles entram com
 * teto declarado: os seis ocultos mexem no máximo ±5% no stat (0 a 31, com 15,5
 * neutro), e a natureza ±5% (contra os ±10% do gênero). Um time mais bem
 * ESCOLHIDO vence um time de ocultos melhores — que é o que a fase ensina.
 * EV não existe.
 *
 * ── O ALVO BALANCED ───────────────────────────────────────────────────────
 *
 * Cada lutador escolhe o par (golpe, alvo) de maior dano ESPERADO — poder ×
 * mesmo-tipo × efetividade × ataque/defesa × precisão —, sem sorteio. Empate
 * fica com o alvo de menor índice e o golpe listado primeiro.
 *
 * ── OS TACTICAL PRESETS (ST-10.8 · §8.5) ──────────────────────────────────
 *
 * Estratégia ANTES da luta, sem controle em tempo real. Cada preset é uma
 * regra de alvo e de golpe, determinística, sobre o mesmo dano esperado:
 *
 *   balanced    o maior dano esperado (o padrão)
 *   aggressive  o golpe que mais perto chega de DERRUBAR — fração da vida que
 *               resta, até 1 —, e no empate o alvo mais frágil
 *   defensive   primeiro o rival que mais AMEAÇA o time (o maior dano esperado
 *               dele contra qualquer um dos nossos), depois o melhor golpe nele
 *   focus       a maior EFETIVIDADE primeiro; só depois o dano — um golpe
 *               neutro nunca vence um super-efetivo
 *
 * O preset é do TIME do jogador (`preset`); o rival luta Balanced, a menos
 * que `presetRival` diga outra coisa.
 */
import { especieDe } from './especie.mjs';
import { rng, statNoNivel, efeito, dano } from './primitivas.mjs';

export const REGRAS = Object.freeze({
  CRITICO: 1 / 16, MULT_CRITICO: 1.5, ACERTO_PADRAO: 0.92,
  PESO_OCULTO: 0.10,        // (oculto − 15,5) / 31 × 0,10  →  ±5%
  PESO_NATUREZA: 0.05,      // ±5%
  VARIACAO_INICIATIVA: 0.10,
  TURNOS_MAX: 100,
  TIME_MAX: 6,
  GOLPES_MAX: 4,
});
export const PRESETS = Object.freeze(['balanced', 'aggressive', 'defensive', 'focus']);

/* A VERSÃO DAS REGRAS (ST-11.1 · §9.4). O snapshot da Liga e a partida
   (ST-11.2) a gravam: uma luta de temporada tem de ser refeita pelas regras
   do dia em que foi criada. Muda a regra, muda a versão — no mesmo commit.
   tbe-2 (ST-2.16): o último recurso — os times congelados na tbe-1 pedem
   congelar de novo. */
export const VERSAO_TBE = 'tbe-4';

/* ── O ÚLTIMO RECURSO (ST-2.16) ──────────────────────────────────────────
 *
 * Quem não tem golpe que pegue em NENHUM inimigo vivo usava o melhor dos
 * inúteis e ficava parado: um time todo elétrico contra um imune não fazia
 * dano nenhum, e um imune no nível 3, sozinho, vencia o chefe (21 a 24)
 * em 100% — medido. Agora ele usa um golpe SEM TIPO, de poder 10: a
 * imunidade continua valendo muito (o golpe é fraco e sem bônus de tipo), e
 * o nível volta a valer também. Só entra quando nada mais pega — numa luta
 * comum ele não aparece. O nome pode vir do pack (`ultimoRecurso`). */
export const ULTIMO_RECURSO = Object.freeze({ n: 'último recurso', t: null, p: 10, cat: 'fis', acc: 1 });
const recursoDo = pack => ({ ...ULTIMO_RECURSO, ...(pack?.ultimoRecurso?.n ? { n: String(pack.ultimoRecurso.n) } : {}) });
/* A chave da natureza no pack → o índice do stat. */
const INDICE = { atq: 1, def: 2, spa: 3, spd: 4, vel: 5 };

function golpePorNome(pack, nome) {
  for (const lista of Object.values(pack.golpes ?? {}))
    for (const g of lista) if (g.n === nome) return g;
  return null;
}

/* `c`: { dex, nivel, golpes: [nomes], iv?: [6], natureza?: nome } */
export function montarLutador(pack, c, lado, i) {
  const esp = especieDe(pack, c?.dex);
  if (!esp) throw new Error(`espécie ${c?.dex} não existe no pack`);
  const nivel = Number(c.nivel);
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 100) throw new Error(`nível inválido: ${c.nivel}`);
  const nomes = c.golpes ?? [];
  if (!nomes.length || nomes.length > REGRAS.GOLPES_MAX) throw new Error(`de 1 a ${REGRAS.GOLPES_MAX} golpes, e vieram ${nomes.length}`);
  const golpes = nomes.map(n => {
    const g = golpePorNome(pack, n);
    if (!g) throw new Error(`golpe desconhecido: ${n}`);
    return g;
  });
  const iv = Array.isArray(c.iv) && c.iv.length === 6 ? c.iv : null;
  const nat = c.natureza ? (pack.naturezas ?? []).find(x => x[0] === c.natureza) : null;
  const oculto = k => (iv ? 1 + REGRAS.PESO_OCULTO * ((Math.min(31, Math.max(0, iv[k])) - 15.5) / 31) : 1);
  const natureza = k => (!nat ? 1 : INDICE[nat[1]] === k ? 1 + REGRAS.PESO_NATUREZA
    : INDICE[nat[2]] === k ? 1 - REGRAS.PESO_NATUREZA : 1);
  const st = k => Math.floor(statNoNivel(esp.s[k], nivel) * oculto(k) * natureza(k));
  /* O CHEFE (ST-10.18 · §8.12): um lendário sozinho contra um time de seis
     cai em poucos turnos — medido: 90%+ para um trio de nível 45 contra um
     Zapdos 65. O chefe de raid leva VIDA MULTIPLICADA (`vidaX`), e é só a
     vida: o dano e a velocidade dele seguem a mesma conta de todo lutador. */
  const vidaX = Number.isFinite(c.vidaX) && c.vidaX >= 1 && c.vidaX <= 10 ? c.vidaX : 1;
  const maxHp = Math.floor((Math.floor((2 * esp.s[0] + 31) * nivel / 100) + nivel + 10) * oculto(0) * vidaX);
  return { lado, i, dex: esp.dex, nivel, types: esp.t.slice(), maxHp, hp: maxHp,
           atk: st(1), def: st(2), spa: st(3), spd: st(4), spe: st(5), golpes };
}

/* Integral de round(x). A distribuição do dano é uniforme, como em dano().
   A estimativa não consome RNG e considera o piso, crítico e precisão reais. */
const integralArredondado = x => { const n = Math.floor(x + .5); return n * x - n * n / 2; };
function mediaDano(base, teto = Infinity) {
  const a = .85 * base, b = base;
  const integral = x => {
    const limite = teto - .5, v = Math.max(.5, Math.min(limite, x));
    return integralArredondado(v) + (x < .5 ? x - .5 : x > limite ? teto * (x - limite) : 0);
  };
  return (integral(b) - integral(a)) / (b - a);
}
export function avaliarGolpe(chart, A, D, g) {
  const eff = efeito(chart, g.t, D.types);
  if (eff === 0) return { dano: 0, util: 0, nocaute: 0 };
  const razao = g.cat === 'fis' ? A.atk / D.def : A.spa / D.spd;
  const stab = A.types.includes(g.t) ? 1.5 : 1;
  const base = (Math.floor(Math.floor(Math.floor(2 * A.nivel / 5 + 2) * g.p * razao) / 50) + 2) * stab * eff;
  const hp = Math.max(1, D.hp ?? D.maxHp ?? Infinity), acc = g.acc ?? REGRAS.ACERTO_PADRAO;
  const ko = b => hp === 1 ? 1 : Math.max(0, Math.min(1, (b - (hp - .5)) / (.15 * b)));
  const misturar = fn => acc * ((1 - REGRAS.CRITICO) * fn(base) + REGRAS.CRITICO * fn(base * REGRAS.MULT_CRITICO));
  return { dano: misturar(b => mediaDano(b)), util: misturar(b => mediaDano(b, hp)), nocaute: misturar(ko) };
}
export const danoEsperado = (chart, A, D, g) => avaliarGolpe(chart, A, D, g).dano;

/* A AMEAÇA de um rival: o maior dano esperado dele contra algum dos nossos. */
const ameaca = (chart, D, nossos) => Math.max(0, ...nossos.map(N => Math.max(...D.golpes.map(g => danoEsperado(chart, D, N, g)))));

function escolher(chart, A, inimigos, preset, aliados) {
  const alvos = preset === 'defensive'
    ? [inimigos.reduce((m, D) => (ameaca(chart, D, aliados) > ameaca(chart, m, aliados) ? D : m), inimigos[0])]
    : inimigos;
  let melhor = null;
  for (const D of alvos) for (const g of A.golpes) {
    const e = avaliarGolpe(chart, A, D, g), v = e.dano;
    const chave = preset === 'aggressive' ? [e.nocaute, e.util / Math.max(1, D.hp)]
      : preset === 'focus' ? [efeito(chart, g.t, D.types), v]
      : [v, e.nocaute];
    if (!melhor || chave[0] > melhor.chave[0] || (chave[0] === melhor.chave[0] && chave[1] > melhor.chave[1]))
      melhor = { chave, g, D };
  }
  return melhor;
}

export function simular(pack, timeA, timeB, semente, { registrar = true, preset = 'balanced', presetRival = 'balanced' } = {}) {
  for (const p of [preset, presetRival]) if (!PRESETS.includes(p)) throw new Error(`preset desconhecido: ${p}`);
  for (const t of [timeA, timeB])
    if (!Array.isArray(t) || !t.length || t.length > REGRAS.TIME_MAX) throw new Error(`um time tem de 1 a ${REGRAS.TIME_MAX}`);
  const chart = pack.tipos.efetividade;
  const lados = { A: timeA.map((c, i) => montarLutador(pack, c, 'A', i)), B: timeB.map((c, i) => montarLutador(pack, c, 'B', i)) };
  const R = rng(semente >>> 0), recurso = recursoDo(pack);
  const vivos = l => lados[l].filter(f => f.hp > 0);
  const eventos = [];
  let turno = 0;
  while (turno < REGRAS.TURNOS_MAX && vivos('A').length && vivos('B').length) {
    turno++;
    /* Velocidades próximas podem alternar a iniciativa. Diferenças grandes
       continuam determinantes. Um sorteio por lutador vivo, sempre. */
    const ordem = [...vivos('A'), ...vivos('B')].map(f => ({ f, k: R() }))
      .map(x => ({ ...x, iniciativa: x.f.spe * (1 - REGRAS.VARIACAO_INICIATIVA + 2 * REGRAS.VARIACAO_INICIATIVA * x.k) }))
      .sort((x, y) => y.iniciativa - x.iniciativa || x.k - y.k);
    for (const { f: A, iniciativa } of ordem) {
      if (A.hp <= 0) continue;
      const inimigos = vivos(A.lado === 'A' ? 'B' : 'A');
      if (!inimigos.length) break;
      let { g, D } = escolher(chart, A, inimigos, A.lado === 'A' ? preset : presetRival, vivos(A.lado));
      if (inimigos.every(I => A.golpes.every(x => danoEsperado(chart, A, I, x) === 0))) g = recurso;
      const errou = R() >= (g.acc ?? REGRAS.ACERTO_PADRAO);
      const r = errou ? { dmg: 0, eff: efeito(chart, g.t, D.types), crit: false }
        : dano(chart, A, D, g, R, 1, 1, A.nivel, REGRAS.CRITICO, REGRAS.MULT_CRITICO);
      D.hp = Math.max(0, D.hp - r.dmg);
      if (registrar) eventos.push({ turno, de: `${A.lado}${A.i}`, para: `${D.lado}${D.i}`, golpe: g.n,
                                     dano: r.dmg, eff: r.eff, crit: r.crit, errou, caiu: D.hp === 0,
                                     velocidade: A.spe, iniciativa });
    }
  }
  const a = vivos('A').length, b = vivos('B').length;
  return { vencedor: a && !b ? 'A' : b && !a ? 'B' : null, turnos: turno, eventos,
           restantes: { A: a, B: b } };
}
