/* A EVOLUÇÃO NO IDLE — a ponte que faltava (bloco 1.21, camada 0).
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA RESOLVER ───────────────────────────────
 *
 * Eu disse ao dono que "a evolução não existe". **Estava errado**, e a L-114
 * registra a correção:
 *
 *     engine/evolucao.mjs   130 linhas, funcionando
 *     content/…evolucoes    72 arestas — Charmander -> Charmeleon no nível 16
 *
 * O motor e os dados estavam inteiros o tempo todo. **Nenhum caminho do app
 * chamava `evoluir`.** A criatura subia de nível para sempre e nunca mudava de
 * forma, e as dez pedras caíam sem servir para nada.
 *
 * ── E A PONTE É LITERAL: DOIS NOMES PARA A MESMA COISA ───────────────────
 *
 * O motor lê `inst.especie`. A criatura salva guarda `dex`. São o mesmo número
 * com dois nomes, e é por isso que nada nunca ligou os dois: não havia erro para
 * dar — só ausência.
 *
 *     Duas metades certas que nunca se encontraram não produzem defeito
 *     nenhum. Elas produzem silêncio, que é mais difícil de achar.
 *
 * A conversão mora AQUI, num lugar só. Espalhá-la pelos chamadores seria criar
 * a chance de alguém converter num lugar e esquecer no outro.
 *
 * ── ONDE ELE MORA ─────────────────────────────────────────────────────────
 *
 * Camada 0: recebe pack, criatura e bolsa; devolve o que dá para fazer. Sem DOM
 * e sem estado — a decisão é pura, e a transição só desenha.
 */
import { evolucoesDisponiveis, saidasDe, evoluir, estagioDe }
  from '../../engine/evolucao.mjs';

/* A criatura do idle vista com os olhos do motor. `especie` e `dex` são o mesmo
   número; o adaptador existe para o motor não precisar conhecer o nome do save,
   e vice-versa. */
export const paraMotor = c => ({ ...c, especie: Number(c?.dex ?? c?.especie) });

/* A bolsa como lista de ids, que é o que `CONDICOES.item` espera. Só o que TEM
   quantidade entra: um item com zero na bolsa não é um item que se tem. */
export const itensDe = bolsa =>
  Object.entries(bolsa ?? {}).filter(([, n]) => n > 0).map(([id]) => id);

/* ── O QUE ESTA CRIATURA PODE FAZER AGORA ─────────────────────────────────
 *
 * Devolve as arestas prontas. Vazio quando nenhuma condição foi cumprida — e
 * vazio é diferente de "não evolui", que é `podeUmDia` abaixo. A tela precisa
 * das duas para escrever frases diferentes: "falta o nível 16" convida; "não
 * evolui" encerra. */
export function prontasPara(pack, criatura, bolsa) {
  return evolucoesDisponiveis(pack, paraMotor(criatura), { itens: itensDe(bolsa) });
}

export const podeUmDia = (pack, criatura) =>
  (saidasDe(pack, Number(criatura?.dex)) ?? []).length > 0;

/* ── O QUE AINDA FALTA, EM PALAVRA ────────────────────────────────────────
 *
 * A tela precisa dizer *"falta o nível 16"*, e não *"não pode"*. Recusa sem
 * endereço é o D-067, e ele já custou um bloco a este projeto.
 *
 * Devolve `null` quando já pode — e `null` é o sinal de que a tela deve mostrar
 * o botão em vez do aviso. */
export function oQueFalta(pack, criatura, bolsa, nomeDoItem = id => id) {
  const saidas = saidasDe(pack, Number(criatura?.dex)) ?? [];
  if (!saidas.length) return { evolui: false, falta: null };
  if (prontasPara(pack, criatura, bolsa).length) return { evolui: true, falta: null };

  /* A aresta MAIS PERTO, e não a primeira: uma linha que se abre em três tem
     três alvos, e mostrar o mais distante desanima sem motivo. */
  const tem = new Set(itensDe(bolsa));
  const nivel = Math.floor(Number(criatura?.nivel) || 1);
  let melhor = null;
  for (const a of saidas) {
    const partes = [];
    if (a.exige?.nivel && nivel < a.exige.nivel)
      partes.push({ quanto: a.exige.nivel - nivel, txt: `nível ${a.exige.nivel}` });
    if (a.exige?.item && !tem.has(a.exige.item))
      partes.push({ quanto: 999, txt: nomeDoItem(a.exige.item) });
    if (a.exige?.vinculo && (criatura?.vinculo ?? 0) < a.exige.vinculo)
      partes.push({ quanto: a.exige.vinculo - (criatura?.vinculo ?? 0),
                    txt: `vínculo ${a.exige.vinculo}` });
    const custo = partes.reduce((s, p) => s + p.quanto, 0);
    if (!melhor || custo < melhor.custo)
      melhor = { custo, falta: partes.map(p => p.txt).join(' e '), para: a.para };
  }
  return { evolui: true, falta: melhor?.falta ?? '?', para: melhor?.para ?? null };
}

/* ── APLICAR ──────────────────────────────────────────────────────────────
 *
 * NÃO MUTA. Devolve a criatura nova, como o `creditar` e o `escolher` do foco —
 * é o que deixa a transição desenhar o antes e o depois lado a lado, e o que
 * impede meia-evolução gravada se algo falhar no meio.
 *
 * E ela devolve o `de` junto, porque a tela precisa dos dois: a animação inteira
 * é a alternância entre a forma velha e a nova. */
export function aplicar(pack, criatura, bolsa, alvo = null) {
  const prontas = prontasPara(pack, criatura, bolsa);
  if (!prontas.length) throw new Error('esta criatura não pode evoluir agora');
  const aresta = alvo != null
    ? prontas.find(a => a.para === alvo)
    : prontas[0];
  if (!aresta) throw new Error(`a evolução para ${alvo} não está disponível`);

  const antes = Number(criatura.dex);
  const nova = evoluir(paraMotor(criatura), aresta);
  /* Volta ao vocabulário do save: `dex` é o nome que o armazenamento usa, e
     deixar `especie` junto criaria a segunda verdade que este projeto persegue. */
  const { especie, ...resto } = nova;
  return { criatura: { ...resto, dex: especie }, de: antes, para: especie, aresta };
}

/* Quem, da caixa inteira, está pronto agora. É o que a tela usa para o selo, e
   contar aqui evita a tela percorrer a lista com a regra na mão. */
export const prontasNaCaixa = (pack, criaturas, bolsa) =>
  (criaturas ?? []).filter(c => prontasPara(pack, c, bolsa).length > 0);

export { estagioDe };
