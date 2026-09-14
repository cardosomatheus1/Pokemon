/* A BOLA DURANTE O AVANÇO (bloco A6, §7.22.2 e §7.22.10, camada 0).
 *
 * Fronteira: entra o que já apareceu na run e o que o jogador tem na bolsa;
 * sai em quem ele PODE jogar uma bola, e o que acontece quando joga. Puro, sem
 * DOM, sem estado e sem tema.
 *
 * ── ESTE É O ÚNICO MOMENTO EM QUE A TELA PEDE A MÃO DO JOGADOR ──────────
 *
 * A referência que o dono trouxe é 100% automática — você olha e o jogo joga.
 * A nossa pede duas decisões, e esta é a segunda:
 *
 *     a POÇÃO   antes que o HP acabe          (A3)
 *     a BOLA    na espécie certa              (aqui)
 *
 * E é a diferença que o §7.22.10 nomeia. Na referência, o bicho da wave paga um
 * nível. Aqui ele é uma espécie que entra no registro, levanta o teto de
 * encontros e pode ir para a Arena.
 *
 *   > A wave não é uma barra de progresso. É um campo de recrutamento.
 *
 * ── UMA TENTATIVA POR ESPÉCIE, POR RUN — E É ISSO QUE SALVA O TETO ──────
 *
 * Sem esta regra, uma run de 58 mobs seria 58 tentativas de captura, e o teto
 * de encontros do §P5 não significaria mais nada. Com ela, o máximo é o
 * tamanho do elenco do estágio: SEIS.
 *
 * É a mesma separação do A5 dita de outro jeito — **o abate é do indivíduo, a
 * bola é da espécie** —, e as duas precisam concordar, senão o painel "quem
 * apareceu" e o teto contariam coisas diferentes.
 *
 * ── E A BOLA SÓ VALE EM QUEM JÁ APARECEU ────────────────────────────────
 *
 * Não dá para mirar num bicho que a run ainda não mostrou. Parece óbvio, e não
 * é: sem a regra escrita, a tela poderia listar o elenco INTEIRO do estágio —
 * que ela conhece desde o cartão de escolha — e deixar capturar o chefe na
 * primeira wave.
 */

import { tentar, chanceDe } from './captura.mjs';

/* ── O QUE ESTÁ AO ALCANCE DA BOLA AGORA ──────────────────────────────────
 *
 * `apareceram` são as espécies que a run já mostrou; `tentadas` são as que já
 * levaram uma bola. A diferença entre as duas é o que a tela desenha como
 * clicável — e uma lista vazia é uma resposta legítima, não um erro: no começo
 * da run ninguém apareceu ainda. */
export function alvosDaBola({ apareceram, tentadas } = {}) {
  const ja = new Set(tentadas ?? []);
  return [...new Set(apareceram ?? [])].filter(d => d != null && !ja.has(d));
}

export const podeJogar = (dex, ctx) => alvosDaBola(ctx).includes(dex);

/* ── O LANCE ──────────────────────────────────────────────────────────────
 *
 * A chance sai do `captura.mjs`, e não de uma conta nova. É a regra do §7.11
 * aplicada aqui: *chamar a mesma função, jamais uma reimplementação* — duas
 * fórmulas de captura divergem no dia em que uma delas for calibrada.
 *
 * A ORDEM DAS RECUSAS IMPORTA, e ela é do mais específico para o mais geral:
 * quem tenta capturar quem já tentou precisa ouvir isso, e não "sem bola" —
 * uma recusa que fala do problema errado manda o jogador consertar o que não
 * está quebrado. É o D-067 na porta da captura. */
export function jogarBola(rnd, pack, { dex, raridade, bola, bolsa, apareceram, tentadas }) {
  if (!(apareceram ?? []).includes(dex))
    throw new Error('essa espécie ainda não apareceu nesta run');
  if ((tentadas ?? []).includes(dex))
    throw new Error('você já jogou uma bola nessa espécie neste avanço');
  const tem = Number(bolsa?.[bola]) || 0;
  if (tem < 1) throw new Error(`você não tem ${bola}`);

  const r = tentar(rnd, pack, { raridade, bola });
  return {
    ...r,
    dex,
    /* A bola é consumida SEMPRE — o `captura.mjs` já decide isso, e repetir a
       decisão aqui seria a segunda cópia dela. */
    bolsa: { ...bolsa, [bola]: tem - r.consumiu },
    /* E a espécie entra em `tentadas` mesmo quando a captura falha. É o que
       torna o lance uma DECISÃO: errar custa a chance daquela espécie nesta
       run, e não só a bola. */
    tentadas: [...(tentadas ?? []), dex],
  };
}

/* ── QUANTAS BOLAS UMA RUN COMPORTA ───────────────────────────────────────
 *
 * O teto não é a bolsa: é o elenco. Levar vinte bolas para um estágio de seis
 * espécies não compra nada, e a tela precisa poder dizer isso ANTES de o
 * jogador gastar dinheiro na loja.
 *
 *   > Um limite que só aparece depois da compra é um limite que ensina o
 *   > jogador a desconfiar da loja. */
export const lancesQueRestam = ({ elenco, tentadas } = {}) => {
  const total = new Set([
    ...(elenco?.comuns ?? []).map(x => x.dex),
    ...(elenco?.chefes ?? []).map(x => x.dex),
  ]);
  for (const d of tentadas ?? []) total.delete(d);
  return total.size;
};

/* A prévia que a tela mostra ao passar o dedo numa espécie: quanto vale a
   bola que ele tem na mão, contra aquela raridade. Sem isso, escolher entre a
   comum e a Ultra é adivinhação — e o §8.1 diz que o jogador tem de MANIPULAR
   uma probabilidade e ver o número mexer. */
export const previaDoLance = (pack, { raridade, bola }) => chanceDe(pack, { raridade, bola });
