/* A LOJA DO IDLE NO SERVIDOR — comprar, vender, estilhaçar e montar (ST-13.9a · D-136).
 *
 * Com conta, o save do aparelho é CACHE da conta (E13): toda escrita passa por
 * uma rota nomeada e a conta é relida. A loja ficou de fora da ST-13.5 e
 * continuava escrevendo só no aparelho — a compra aparecia e sumia na leitura
 * seguinte, porque a bolsa voltava a ser a do servidor. É o D-136.
 *
 * A regra é a do aparelho, dos mesmos arquivos: `engine/loja.mjs` (preço,
 * saldo, o que se vende) e `engine/estilhaco.mjs` (custo, sorteio, montagem).
 * Aqui mora o que precisa de banco: a bolsa lida e escrita na MESMA transação,
 * e o sorteio do estilhaço com a raiz do SERVIDOR — o aparelho sorteava de um
 * contador gravado no save, que o jogador lê e poderia prever.
 */
import { comprar, vender } from '../engine/loja.mjs';
import { estilhacarNaBolsa, montarNaBolsa } from '../engine/estilhaco.mjs';
import { idDoMaterial } from '../engine/economia-idle.mjs';
import { derivar, novaRaiz } from '../engine/seed.mjs';
import { semente } from '../engine/instancia.mjs';
import { bolsaDe, creditarBolsa, debitarBolsa } from './idle.mjs';
import { emTransacao } from './carteira.mjs';
import { maisRestrita } from '../engine/proveniencia.mjs';

export const ACOES_DA_LOJA = Object.freeze(['comprar', 'vender', 'estilhacar', 'montar']);

/* A bolsa do motor é um objeto; a do banco, linhas. A escrita é a DIFERENÇA,
   item a item: o débito com a guarda na cláusula (`debitarBolsa`), e um débito
   que não passa desfaz a transação inteira — nunca metade de uma compra. */
/* O QUE SAI DETERMINA O QUE ENTRA (ST-14.0C): os débitos vêm primeiro e
   dizem de que classes saíram; o crédito herda a mais presa delas — moeda de
   save antigo não compra item "ganho no jogo". */
function gravarDiferenca(db, userId, antes, depois, fonte) {
  const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])];
  const d = k => (Number(depois[k]) || 0) - (Number(antes[k]) || 0);
  const consumidas = [];
  for (const k of chaves) if (d(k) < 0) {
    const r = debitarBolsa(db, userId, k, -d(k));
    if (!r) throw new Error('a bolsa mudou no meio — nada foi feito, tente de novo');
    consumidas.push(...r.classes);
  }
  const classe = maisRestrita(consumidas);
  for (const k of chaves) if (d(k) > 0) creditarBolsa(db, userId, k, d(k), { classe, fonte });
}

export function lojaDoIdleNaConta(db, { userId, pack, acao, id, quantos = 1, bioma = null, raiz = novaRaiz() }) {
  if (!ACOES_DA_LOJA.includes(acao)) throw new Error('ação de loja desconhecida');
  return emTransacao(db, () => {
    const antes = Object.fromEntries(bolsaDe(db, userId).map(l => [l.item_id, l.quantidade]));
    let r, resposta;
    if (acao === 'comprar') {
      r = comprar({ bolsa: antes }, { pack, id, quantos });
      resposta = { acao, id, levou: r.levou, gasto: r.gasto };
    } else if (acao === 'vender') {
      r = vender({ bolsa: antes }, { pack, id, quantos });
      resposta = { acao, id, deu: r.deu, recebeu: r.recebeu };
    } else if (acao === 'estilhacar') {
      r = estilhacarNaBolsa(antes, { catalogo: pack.catalogo ?? [], material: idDoMaterial(pack), id, bioma,
                                     sorte: semente(derivar(raiz, 'estilhaco:' + bioma)) });
      resposta = { acao, id, sorteado: { id: r.sorteado.id, nome: r.sorteado.nome }, custo: r.custo, partes: r.partes };
    } else {
      r = montarNaBolsa(antes, id);
      resposta = { acao, id };
    }
    gravarDiferenca(db, userId, antes, r.estado?.bolsa ?? r.bolsa, `loja:${acao}:${id}`);
    return resposta;
  });
}
