/* O BANCO — o que acontece com quem NÃO foi (bloco A4e, camada 3).
 *
 * O dono batizou a aba com dois nomes, e os dois são de propósito:
 *
 *     ROTA OFF      a expedição. Quem SAIU rende encontro, item, XP e moeda.
 *     TRAINER OFF   o banco. Quem FICOU treina, e não rende encontro nenhum.
 *
 * São dois modos, e não um com um multiplicador — a distinção mora no motor,
 * em `engine/ausente.mjs`, com o porquê. Este arquivo é a cola: ele pega o que
 * o motor calculou e escreve na coleção.
 *
 * ── POR QUE ELE SAIU DO `idle-dados.mjs` ──────────────────────────────────
 *
 * Porque são perguntas diferentes, e o arquivo estava respondendo as duas:
 *
 *     idle-dados    A EXPEDIÇÃO — quem foi, para onde, e o que ela trouxe
 *     idle-banco    O BANCO — quem ficou, e o que o tempo fez por ele
 *
 * A divisão é por RESPONSABILIDADE e não por tamanho, que é a regra do
 * `test/modulos.mjs`. O limite de 600 linhas foi só quem perguntou primeiro.
 */
import { treinoDaJanela } from '../../engine/ausente.mjs';
import { creditar } from '../../engine/nivel-criatura.mjs';

/* ── E QUEM FICOU NO BANCO TREINOU (A7, §7.22.14) ─────────────────────────
 *
 * A janela é a da expedição, e o motor explica por quê. O que se decide AQUI é
 * onde a marca é guardada: em `treinadoAte`, na CRIATURA.
 *
 * Guardá-la na expedição não serviria: com duas vagas em campo as janelas se
 * cruzam, e quem precisa não receber a mesma hora duas vezes é a criatura.
 *
 * A janela termina em `terminaEm` e não em `agora`: o que passou disso é tempo
 * em que a expedição já estava parada esperando ser colhida, e pagar por ele
 * premiaria demorar a voltar.
 */
export function creditarTreino(e, x) {
  const treinados = treinoDaJanela({
    criaturas: e.criaturas, equipe: x.equipe ?? [],
    de: x.iniciadaEm, ate: x.terminaEm,
  });
  const subiram = [];
  for (const t of treinados) {
    const c = e.criaturas.find(y => y.id === t.id);
    if (!c) continue;
    const r = creditar(c, { xp: t.xp, vinculo: t.vinculo });
    c.xp = r.xp; c.nivel = r.nivel; c.vinculo = r.vinculo;
    c.treinadoAte = t.ate;
    if (r.subiu > 0) subiram.push({ id: t.id, para: r.nivel, quantos: r.subiu, treino: true });
  }
  return { treino: treinados.map(t => ({ id: t.id, xp: t.xp, vinculo: t.vinculo })), subiram };
}

/* ── QUEM ESTÁ NO BANCO AGORA ─────────────────────────────────────────────
 *
 * A pergunta que a tela faz. Ela não é "quem está na caixa": a caixa é uma
 * arrumação do jogador, e o banco é um ESTADO — está no banco quem não está
 * em nenhuma expedição aberta, esteja na equipe ativa ou guardado.
 *
 * A distinção importa porque é ela que faz a tela dizer a verdade: um jogador
 * com seis na equipe e uma Batida de dois vê QUATRO treinando, e não zero. */
export function noBanco(criaturas = [], emCampo = []) {
  const fora = new Set(emCampo.flatMap(x => x?.equipe ?? []));
  return (criaturas ?? []).filter(c => c?.id != null && !fora.has(c.id));
}
