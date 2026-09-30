/* A COLHEITA DE UMA EXPEDIÇÃO (camada 3).
 *
 * Saiu do `idle-dados.mjs` no L-162, quando aquele arquivo passou das 600
 * linhas — e a divisão foi por RESPONSABILIDADE, e não por tamanho, que é o
 * que o portão dos módulos cobra.
 *
 * ── AS DUAS RESPONSABILIDADES QUE ESTAVAM JUNTAS ─────────────────────────
 *
 *     GUARDAR E CONSULTAR   o formato no disco, a leitura tolerante, quem
 *                           existe, quanta stamina tem, quem está em campo
 *     LIQUIDAR              o que uma expedição terminada PAGA: encontros,
 *                           itens, moeda, XP, vínculo, treino do banco
 *
 * A primeira responde perguntas e a segunda credita. Ficaram juntas porque
 * nasceram no mesmo bloco, não porque sejam a mesma coisa — e a segunda é a
 * que cresce a cada bloco de economia, porque toda porta nova de ganho passa
 * por aqui. Era ela que ia empurrar o arquivo para fora do teto de novo.
 *
 * ── O CICLO COM O `idle-dados.mjs` É DE PROPÓSITO ─────────────────────────
 *
 * Este arquivo importa de lá (`pronta`, `acharCriatura`, `hidratar`) e é
 * reexportado por lá. É a mesma forma do `idle-lance.mjs` e do
 * `idle-bolsa.mjs`, e existe pelo mesmo motivo: o resto do jogo continua
 * conhecendo `colher` pelo endereço de sempre. Uma divisão interna que obriga
 * doze arquivos a trocar de `import` não é divisão, é mudança de API.
 *
 * O QUE NÃO MUDOU: a regra continua fora daqui. Teto, chance, raridade e
 * curva são `engine/`; este arquivo pergunta e credita.
 */
import { novaRaiz } from '../../engine/seed.mjs';
import { contaDaColheita } from '../../engine/colheita.mjs';
import { pronta } from './idle-dados.mjs';
import { carregarBonus } from './bonus-arena.mjs';
import { linhaDaExpedicao, noHistorico } from './historico-dados.mjs';

/* ── A COLHEITA ────────────────────────────────────────────────────────────
 *
 * A SEMENTE NASCE AQUI, e não no início — a mesma decisão do 1.2d. Se ela
 * existisse desde o começo, o resultado ficaria horas guardado antes de o
 * jogador colher, e quem o lesse poderia cancelar a expedição ruim. No
 * navegador isso é ainda mais fácil: `localStorage` está a um F12 de distância.
 *
 * A recusa vem ANTES de qualquer crédito. Colher duas vezes não pode dobrar o
 * saque nem pela metade.
 *
 * ── A CONTA NÃO MORA MAIS AQUI (ST-13.2a) ────────────────────────────────
 *
 * O que a colheita paga — encontros, saque, moeda, treinadores, XP, vínculo,
 * o treino do banco — é `engine/colheita.mjs`, e o porquê de cada parte foi
 * junto. O servidor chama a MESMA função; este arquivo só a escreve no save.
 * Duas colheitas escritas à mão seriam o jogador com conta recebendo uma
 * coisa e o sem conta outra, no primeiro bloco de economia seguinte. */
export function colher(e, { pack, id, agora, raiz = novaRaiz(), bonus = carregarBonus() }) {
  const x = e.expedicoes.find(y => y.id === id);
  if (!x) throw new Error('expedição não existe');
  if (!pronta(x, agora)) throw new Error('a expedição ainda não terminou');
  if (x.colhidaEm) throw new Error('esta expedição já foi colhida');

  x.colhidaEm = agora;
  x.semente = String(raiz);
  const r = contaDaColheita({ pack, expedicao: x, criaturas: e.criaturas, raiz, bonus, agora });

  for (const [chave, n] of Object.entries(r.bolsa)) e.bolsa[chave] = (e.bolsa[chave] ?? 0) + n;
  for (const k of r.credito) {
    const c = e.criaturas.find(y => y.id === k.id);
    c.xp = k.xp; c.nivel = k.nivel; c.vinculo = k.vinculo;
    if (k.treinadoAte != null) c.treinadoAte = k.treinadoAte;
  }
  for (const f of r.fragmentos) e.registro[f.dex] = (e.registro[f.dex] ?? 0) + f.n;
  /* Os encontros ficam PENDENTES: ainda precisam de bola (1.3c), e guardá-los
     é o que deixa o jogador fechar a aba e voltar sem perder o que apareceu. */
  e.encontros.push(...r.pendentes);

  x.moedas = r.moedas;
  x.npc = { quantas: r.npc.quantas, vitorias: r.npc.vitorias, material: r.npc.material };
  x.xp = r.xp;
  x.treino = r.treino;
  /* O TOTAL sorteado, e não os selvagens: o NPC ocupa o encontro (1.7b, S679). */
  x.encontros = r.total;

  const resposta = { expedicao: x.id, semente: String(raiz), encontros: r.pendentes, itens: r.itens,
                     moedas: r.moedas, xp: r.xp, vinculo: r.vinculo, subiram: r.subiram, npc: r.npc,
                     treino: x.treino };
  /* A LINHA DO HISTÓRICO (1.28): a mesma resposta que a tela pinta, guardada
     para quem voltar depois — o servidor monta a dele da resposta gravada. */
  e.historico = noHistorico(e.historico, linhaDaExpedicao(x, resposta, { pack, dexDe: id => e.criaturas.find(c => c.id === id)?.dex }));
  return resposta;
}
