/* AS ROTAS POR NÍVEL (bloco 1.4, §7.13, §0.3).
 *
 * Fronteira: entra um pack, um bioma e uma faixa; sai quem aparece ali. Puro,
 * sem DOM, sem estado e sem tema.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A faixa de nível é DERIVADA da linha evolutiva, e não escrita à mão.**
 *
 * O dono do projeto pediu a distribuição do material de origem: "no bioma
 * floresta, de 1 a 5 weedle, caterpie, metapod, kakuna; de 5 a 10 beedrill,
 * butterfree". Escrever isso à mão são 146 linhas de dado morto — e, pior, 146
 * chances de contradizer a linha evolutiva que o bloco 1.1 já declarou.
 *
 * Derivando, o exemplo dele sai sozinho: a lagarta aparece a partir do nível 2,
 * o casulo a partir do 7, a borboleta a partir do 10 — e nenhum desses números
 * foi escolhido por mim. São os níveis de evolução que o pack já declarava.
 *
 * (Os nomes das criaturas ficam no teste, e não aqui: o portão `conteudo`
 * reprovou esta explicação quando ela os citava, e pela quarta vez neste
 * projeto ele estava certo — o motor tem de rodar contra qualquer pack.)
 *
 * A Gen 2 herda a distribuição inteira sem uma linha nova.
 *
 * ── AS TRÊS PERGUNTAS QUE DECIDEM ONDE CADA UMA APARECE ──────────────────
 *
 *   1. ELA JÁ PODE EXISTIR?    `nivelMinimo` — 2 para quem é base; o nível da
 *                              evolução para quem evolui por nível; o do pai
 *                              mais uma folga para quem evolui por item.
 *   2. ELA JÁ EVOLUIU?         `nivelDeSaida` — quem vira outra coisa no nível
 *                              10 some das rotas que começam no 10. É o que faz
 *                              a rota alta ter Butterfree e não Caterpie.
 *   3. ELA CABE NA FORÇA?      cada faixa tem uma JANELA — piso e teto. Sem o
 *                              teto, um Lapras de 535 aparecia em rota de nível
 *                              2; sem o piso, um Rattata aparecia na de 50.
 *
 * A terceira é a que mais parece arbitrária e é a mais necessária. As duas
 * primeiras deixam passar quem não evolui: fóssil, lendário de raid, e todo
 * final de linha sem pré-evolução. A janela de força é o que os coloca no
 * lugar certo da escada.
 */
import { entradaDe, saidasDe } from './evolucao.mjs';
import { forcaDe, moraEm } from './bioma.mjs';

/* A folga para quem evolui por ITEM.
 *
 * Pedra não tem nível declarado, então derivar dela exige um número nosso. Doze
 * é a distância típica entre um estágio e o seguinte nas linhas por nível deste
 * pack — usar a média das outras é a escolha menos inventada disponível. */
export const FOLGA_POR_ITEM = 12;
export const NIVEL_BASE = 2;

/* O nível em que a espécie pode EXISTIR.
 *
 * Memoizado por pack: a cadeia é recursiva e o sorteio de encontro pergunta
 * isso muitas vezes por expedição. */
const cacheMin = new WeakMap();
export function nivelMinimo(pack, dex) {
  let m = cacheMin.get(pack);
  if (!m) { m = new Map(); cacheMin.set(pack, m); }
  if (m.has(dex)) return m.get(dex);
  const ent = entradaDe(pack, dex);
  let v = NIVEL_BASE;
  if (ent) v = ent.exige?.nivel ?? (nivelMinimo(pack, ent.de) + FOLGA_POR_ITEM);
  m.set(dex, v);
  return v;
}

/* O nível em que ela DEIXA de aparecer: o da própria evolução por nível.
 *
 * Só a evolução POR NÍVEL conta. Uma que depende de pedra não acontece sozinha,
 * então a forma anterior continua sendo o que se encontra por aí — que é
 * exatamente como o material de origem se comporta. */
export function nivelDeSaida(pack, dex) {
  const porNivel = saidasDe(pack, dex).filter(a => a.exige?.nivel);
  return porNivel.length ? Math.min(...porNivel.map(a => a.exige.nivel)) : Infinity;
}

export const faixasDe = pack => pack?.faixas ?? [];
export const faixaDe = (pack, id) => faixasDe(pack).find(f => f.id === id) ?? null;

/* A FAIXA NATURAL de uma espécie: a primeira em que ela CABE.
 *
 * Cabe = o nível dela já chegou E a força não passa do teto. O teto empurra
 * para cima quem é forte demais para a rota rasa — é o que tira o Lapras, que
 * não evolui de ninguém e por isso escaparia das outras duas perguntas.
 *
 * O PISO NÃO ENTRA AQUI, e essa é a correção que o pack original obrigou. As
 * linhas dele são derivadas por força DENTRO DO TIPO, então um terceiro estágio
 * pode ser mais fraco que a base de outra linha. Com o piso valendo na faixa
 * natural, essa criatura não aparecia em rota nenhuma: fraca demais para a
 * faixa do próprio nível, e alta demais para as de baixo. Nove ficaram órfãs
 * antes de eu perceber.
 *
 * A regra passa a ser: **a faixa natural sempre aceita; o piso só decide se ela
 * SOBE para as de cima.** Ninguém fica sem rota por construção. */
export function faixaNatural(pack, dex) {
  const fs = faixasDe(pack);
  const nm = nivelMinimo(pack, dex), f = forcaDe((pack.especies ?? []).find(e => e.dex === dex));
  for (const faixa of fs)
    if (nm <= faixa.nivel[1] && f <= (faixa.teto ?? Infinity)) return faixa;
  return fs[fs.length - 1] ?? null;
}

/* QUEM APARECE nesta rota. */
export function elencoDaRota(pack, biomaId, faixaId) {
  const bioma = (pack?.biomas ?? []).find(b => b.id === biomaId);
  const faixa = faixaDe(pack, faixaId);
  if (!bioma || !faixa) return [];
  const tipos = new Set(bioma.tipos);
  const [lo, hi] = faixa.nivel;
  return (pack.especies ?? []).filter(e => {
    if (!moraEm(e, tipos)) return false;
    /* a casa dela: entra sempre */
    if (faixaNatural(pack, e.dex)?.id === faixaId) return true;
    /* nas de cima: só se ainda não evoluiu e se a força carrega a rota */
    if (nivelMinimo(pack, e.dex) > hi) return false;
    if (nivelDeSaida(pack, e.dex) <= lo) return false;
    const f = forcaDe(e);
    return f >= (faixa.piso ?? 0) && f <= (faixa.teto ?? Infinity);
  });
}

/* O nível de UM encontro nesta rota.
 *
 * Sorteado dentro da faixa, mas nunca abaixo do que a espécie pode ter: um
 * Dragonair de nível 9 numa rota de 9-20 seria impossível pela própria linha
 * evolutiva dele, e o jogador que soubesse disso perderia a confiança no resto. */
export function nivelDoEncontro(rnd, pack, dex, faixaId) {
  const faixa = faixaDe(pack, faixaId);
  if (!faixa) return NIVEL_BASE;
  const [lo, hi] = faixa.nivel;
  const piso = Math.max(lo, nivelMinimo(pack, dex));
  if (piso >= hi) return hi;
  return piso + Math.floor(rnd() * (hi - piso + 1));
}

/* As rotas de um bioma, já com o elenco contado — é o que a tela do 1.5 vai
   desenhar para o jogador escolher onde farmar. */
export const rotasDo = (pack, biomaId) =>
  faixasDe(pack).map(f => ({
    ...f, bioma: biomaId,
    elenco: elencoDaRota(pack, biomaId, f.id),
  }));

/* Toda espécie tem de ter ao menos uma rota. Espécie sem rota é espécie que não
   existe no jogo — e some sem ninguém notar, porque nada reprova. */
export function semRota(pack) {
  const vistas = new Set();
  for (const b of (pack?.biomas ?? []))
    for (const f of faixasDe(pack))
      for (const e of elencoDaRota(pack, b.id, f.id)) vistas.add(e.dex);
  return (pack?.especies ?? []).filter(e => !vistas.has(e.dex));
}

/* ── O PESO DA ASSINATURA ──────────────────────────────────────────────────
 *
 * Este é o conserto de um defeito que só apareceu ao medir: SETE PARES de
 * biomas do pack de referência tinham elencos 97 a 100% iguais.
 *
 *     sete pares de biomas com elencos de 97% a 100% iguais
 *
 * Onze biomas eram, na prática, quatro lugares — e escolher a rota era escolher
 * a cor do fundo, que é exatamente o que o dono do projeto não quer.
 *
 * A primeira tentativa foi EXPULSAR: exigir que a espécie tivesse o tipo
 * assinatura para morar ali. Estava errado, e o material de origem provou — a
 * caverna gelada do cartucho é habitada sobretudo por criaturas de água. O que
 * separa aquele lugar da praia não é QUEM mora, é COM QUE FREQUÊNCIA.
 *
 * Então o peso, e não a porta:
 *
 *     bioma A   as espécies do tipo dominante saem todas em ~3,6%
 *     bioma B   as quatro da assinatura saem em ~12% e o resto vira fundo
 *
 * Mesmo elenco, lugares completamente diferentes. É assim que o cartucho faz, e
 * é a única forma de onze biomas caberem em quinze tipos sem virar quatro. */
export const BOOST_ASSINATURA = 6;

export function pesoNaRota(pack, especie, biomaId) {
  const b = (pack?.biomas ?? []).find(x => x.id === biomaId);
  const assinatura = b?.assinatura ?? b?.tipos ?? [];
  return (especie?.t ?? []).some(t => assinatura.includes(t)) ? BOOST_ASSINATURA : 1;
}

/* O elenco já com o peso, que é o que o sorteio de encontro consome. */
export const elencoPesado = (pack, biomaId, faixaId) =>
  elencoDaRota(pack, biomaId, faixaId)
    .map(e => ({ especie: e, dex: e.dex, peso: pesoNaRota(pack, e, biomaId) }));
