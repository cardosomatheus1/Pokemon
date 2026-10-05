/* ESTUDO DO RITMO DE XP (ST-2.31, L-251) — quantos dias até o nível de cada
 * marco da Jornada, por perfil, jogando com o modelo de verdade do aparelho.
 *
 * Mede o que o jogador SENTE: o nível do mais forte da coleção (é ele que
 * enfrenta o ginásio) e o do mais fraco (o banco alcança ou não). Os perfis
 * são os do mapa de emissão (test/emissao-idle.mjs), sem os lances: captura
 * muda a caixa, e aqui a pergunta é só o ritmo.
 *
 *   node tools/estudo-ritmo-xp.mjs [dias=60]
 */
import * as A from '../app/modules/avanco-estado.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { xpParaNivel, nivelDe } from '../engine/nivel-criatura.mjs';
import { estagioMaximo } from '../engine/estagios.mjs';
import { treinarNoAparelho } from '../app/modules/treino-local.mjs';

const H = 3600e3, DIA = 24 * H, T0 = Date.UTC(2026, 8, 1, 3);
export const PERFIS = {
  casual:   { jogam: 1, avancos: 2, vigilia: true },
  diario:   { jogam: 3, avancos: 4, vigilia: true },
  maratona: { jogam: 6, avancos: 8, vigilia: false },
};
/* Os marcos: a média do time de cada degrau da Jornada (content/treinadores). */
export const MARCOS = { brock: 13, misty: 20, erika: 27, koga: 39, giovanni: 45, liga: 56, campeao: 60 };

export function ritmo(nome, p, { dias = 60, banco = 4, treinar = true } = {}) {
  const e = D.VAZIO();
  const especies = (kanto.especies ?? []).slice(0, p.jogam + banco);
  for (const x of especies)
    e.criaturas.push(D.criarCriatura(kanto, x.dex, 'captura', T0, String(x.dex).padStart(12, 'e') + 'm0'));
  for (const c of e.criaturas) { c.xp = xpParaNivel(5); c.nivel = 5; }
  const jogam = e.criaturas.slice(0, p.jogam);
  const chegou = {};
  const linha = [];
  for (let d = 0; d < dias; d++) {
    let agora = T0 + d * DIA;
    if (treinar) treinarNoAparelho(e, agora);
    const estagio = Math.min(4, estagioMaximo(jogam));
    const [primeira, ...resto] = jogam;
    if (p.vigilia && D.cabeExpedicao(D.estadoDoTeto(e, agora, kanto), 'vigilia', 1)) {
      const x = D.iniciarExpedicao(e, { pack: kanto, bioma: 'campo', perfil: 'vigilia', equipe: [primeira.id], agora, estagio });
      D.colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `${nome}:v${d}` });
      e.encontros = [];
    }
    agora += 9 * H;
    if (treinar) treinarNoAparelho(e, agora);
    const quem = p.vigilia && resto.length ? resto : jogam;
    for (let r = 0; r < p.avancos; r++) for (const c of quem) {
      const raiz = `${nome}:${d}:${r}:${c.dex}`;
      if (A.porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora })) continue;
      A.comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio, equipe: [c.id], agora, raiz });
      agora += 20 * 60e3;
      A.sincronizar(e, { pack: kanto, agora });
      A.colherAvancoDaRun(e, { pack: kanto, agora, raiz: raiz + ':c' });
      e.encontros = [];
    }
    if (treinar) treinarNoAparelho(e, T0 + d * DIA + 21 * H);
    const niveis = e.criaturas.map(c => nivelDe(c.xp));
    const forte = Math.max(...niveis), fraco = Math.min(...niveis);
    for (const [m, n] of Object.entries(MARCOS)) if (chegou[m] == null && forte >= n) chegou[m] = d + 1;
    linha.push({ dia: d + 1, forte, fraco });
  }
  return { chegou, linha };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dias = Number(process.argv[2]) || 60;
  for (const [nome, p] of Object.entries(PERFIS)) {
    const { chegou, linha } = ritmo(nome, p, { dias });
    const marco = d => linha[d - 1] ? `${linha[d - 1].forte}/${linha[d - 1].fraco}` : '-';
    console.log(`${nome.padEnd(9)} dia em que o mais forte chega:`,
      Object.entries(MARCOS).map(([m, n]) => `${m}(${n}) ${chegou[m] ?? '>' + dias}`).join(' · '));
    console.log(`${''.padEnd(9)} forte/fraco no dia 1, 3, 7, 14, 30: ${[1, 3, 7, 14, 30].map(marco).join('  ')}`);
  }
}
