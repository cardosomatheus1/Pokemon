/* A CORREÇÃO DA LIÇÃO (ST-10.19d · L-205 · Spec §8.1.2).
 *
 * Camada 0. O painel de cada lição dizia o que fazer num link dentro do texto
 * vermelho, e o botão que pesava era o "lutar" — mesmo a 6%. O crítico cego
 * (Showdown + Into the Breach) deu 3–5 a "o que mudar, e onde clicar". Aqui
 * mora a DECISÃO: qual correção a lição pede e o time que ela dá. A tela mede
 * a chance desse time (a mesma conta da chance exibida) e desenha o botão:
 * "troque para o Agressivo → 75%".
 *
 *   preset      a lição de preset com outro preset → o certo; o MESMO time
 *   imune       ninguém imune ao tipo do golpe, e a caixa tem → troca
 *   resiste     ninguém resiste a todos os tipos de golpe, e a caixa tem → troca
 *   duplo       ninguém bate ≥ 2× em todos, e a caixa tem → troca
 *   o resto     velocidade, categoria (golpes): nada — a correção não é UMA
 *               troca, e o link para a aba Time continua sendo a saída
 *
 * Na troca, entra o candidato da caixa de MAIOR power (a correção não pode
 * trocar a lição por fraqueza), e sai o membro que menos serve à lição —
 * empate, o de menor power.
 */
import { efeito } from '../../engine/primitivas.mjs';
import { especieDe } from '../../engine/especie.mjs';

const tipoDoGolpe = (pack, n) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.t;
const tiposDe = (pack, dex) => especieDe(pack, dex)?.t ?? [];

/* Quanto a criatura SERVE à lição: maior é melhor. `ok` é ela aplicar. */
export function servir(pack, licao, rival, c) {
  const chart = pack.tipos.efetividade;
  if (licao.mostra === 'imune') {
    const m = efeito(chart, licao.tipoGolpe, tiposDe(pack, c.dex));
    return { ok: m === 0, nota: -m };
  }
  if (licao.mostra === 'resiste') {
    const m = Math.max(...licao.tiposGolpe.map(t => efeito(chart, t, tiposDe(pack, c.dex))));
    return { ok: m <= 0.5, nota: -m };
  }
  if (licao.mostra === 'duplo') {
    const mult = (rival ?? []).map(D => Math.max(0, ...(c.golpes ?? []).map(n => efeito(chart, tipoDoGolpe(pack, n), tiposDe(pack, D.dex)))));
    return { ok: mult.length > 0 && mult.every(v => v >= 2), nota: mult.reduce((a, b) => a + b, 0) / Math.max(1, mult.length) };
  }
  return null;
}

export function correcaoDaLicao(pack, { licao, membros, caixa, preset, rival }) {
  if (!licao || !membros?.length) return null;
  const timeA = membros.map(m => m.entrada);
  if (licao.mostra === 'preset') {
    return preset === licao.presetCerto ? null : { tipo: 'preset', preset: licao.presetCerto, timeA };
  }
  if (!servir(pack, licao, rival, membros[0].entrada)) return null;
  const nota = m => servir(pack, licao, rival, m.entrada);
  if (membros.some(m => nota(m).ok)) return null;
  const bons = (caixa ?? []).filter(c => nota(c).ok).sort((a, b) => b.power - a.power);
  if (!bons.length) return null;
  const sai = [...membros].sort((a, b) => nota(a).nota - nota(b).nota || a.power - b.power)[0], entra = bons[0];
  return { tipo: 'troca', sai: { id: sai.id, dex: sai.entrada.dex }, entra: { id: entra.id, dex: entra.entrada.dex },
           timeA: membros.map(m => (m === sai ? entra.entrada : m.entrada)) };
}

/* A tela chama isto no clique: a correção vira UMA ação, sem decidir nada. */
export function aplicarCorrecao(c, { preset, trocar }) {
  if (c?.tipo === 'preset') return preset(c.preset);
  if (c?.tipo === 'troca') return trocar({ sai: c.sai.id, entra: c.entra.id });
  return null;
}
