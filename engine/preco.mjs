/* Precificação — o Monte Carlo e a conversão de frequência em odd.
 *
 * Estava dentro de app/modules/odds.mjs, misturado com o fatiamento de 12 ms
 * que existe para não travar a animação. O F0.5 separou os dois, e o motivo é
 * concreto: enquanto a matemática morava num módulo que importa o DOM, nenhuma
 * suíte conseguia rodá-la, e a sabotagem que troca a sub-seed derivada por um
 * sorteio solto passava despercebida. Preço que ninguém consegue testar é
 * preço que ninguém consegue auditar.
 *
 * Aqui não há divisão de trabalho por tempo: quem fatia é o app. Este arquivo
 * simula o lote que pedirem e devolve o placar.
 *
 * A FÓRMULA NÃO MUDOU NESTE BLOCO. O F0.7 é quem mexe em precisão de odd, e o
 * F0.6 em clima dentro do modelo; mudar aqui agora misturaria dois blocos.
 */
import { derivarIndice } from './seed.mjs';
import { tiposDaPool } from './engine.mjs';

/* Simula as batalhas de índice [de, ate) e acumula as vitórias.
 *
 * A sub-seed de cada simulação vem do ÍNDICE, não de um sorteio: com isso o
 * lote 0-500 dá o mesmo resultado tendo sido rodado de uma vez ou em vinte
 * fatias, e a tabela de odds inteira é reproduzível a partir da raiz.
 *
 * CADA SIMULAÇÃO SORTEIA O PRÓPRIO CLIMA (Spec §4.3), com a mesma distribuição
 * da luta real. Antes do F0.6 o Monte Carlo rodava sobre stats crus enquanto a
 * batalha rodava com o bônus climático, e os dois discordavam. Medido em 150
 * rodadas: quem tinha tipo buffável saía a -0,61% de margem — a casa PAGAVA
 * para aceitar essas apostas — contra +14,96% no resto, com 8% declarados.
 * O clima não era surpresa: era desconto.
 *
 * O clima da luta real continua secreto até as apostas fecharem. O que muda é
 * que o preço passa a levar em conta que ELE EXISTE. */
export function simularLote(M, fighters, raiz, de, ate, wins) {
  /* A MESMA condicional da luta real (F0.11): o clima é sorteado entre os que
     ESTA pool suporta. Sortear da tabela inteira aqui e da tabela condicionada
     lá recriaria a divergência que o F0.6 fechou — preço e luta precisam ver a
     mesma distribuição. */
  const tipos = tiposDaPool(fighters);
  for (let i = de; i < ate; i++) {
    const clima = M.sortearClima(derivarIndice(raiz, 'ambiente', i), tipos);
    /* Clima sem tipo favorecido não muda ninguém; copiar 12 lutadores à toa
       custaria caro num laço de 20.000 voltas. */
    const f = clima.type ? M.aplicarClima(fighters, clima) : fighters;
    const w = M.simular(f, derivarIndice(raiz, 'simulacao', i), false);
    if (w >= 0) wins[w]++;
  }
  return wins;
}

/* Frequência de vitória -> REGISTRO DE PRECIFICAÇÃO da rodada (Spec §4.4.5).
 *
 * Devolve o registro inteiro, não só a lista de odds. O §4.4.5 lista nove
 * campos obrigatórios, e o que motiva o mais importante deles está escrito no
 * próprio documento: *"o erro estimado passa a ser campo de primeira classe:
 * sem ele não há como auditar se a margem realizada divergiu da configurada
 * por viés de estimador ou por outra causa"*. O F0.6 mediu margem geral de
 * 7,61 % contra 8 % configurados — sem o erro por lutador, essa diferença é
 * indistinguível de um defeito de precificação.
 *
 * Suavização de Laplace: `(wins+1)/(sims+n)`. Não é opcional (§4.4.1). Sem ela
 * quem não vence nenhuma simulação vira odd infinita, e isso é situação real —
 * o pior lutador do elenco tem taxa medida de 1,61 %.
 */
export function precificar(wins, sims, M) {
  const n = wins.length;
  const margem  = M.CONF.MARGIN;
  const oddMin  = M.CONF.ODD_MIN;
  const oddMax  = M.CONF.ODD_MAX;

  const lutadores = Array.from({ length: n }, (_, i) => {
    const prob = (wins[i] + 1) / (sims + n);
    const justa = 1 / prob;
    /* Erro relativo de p̂ — e, em primeira ordem, o da odd: sqrt((1-p)/(n·p)).
       É a fórmula do §4.4.2, a mesma que dimensiona SIMS pela cauda. */
    const erroRelativo = Math.sqrt((1 - prob) / (sims * prob));
    /* Viés de convexidade (§4.4.3): como 1/p é convexa, E[1/p̂] > 1/p e o
       desvio NÃO se cancela entre rodadas — é sistemático e sempre a favor do
       apostador. O termo de segunda ordem, como fração da odd justa, é
       (1-p)/(n·p²).

       Ele é publicado ao lado do erro pelo mesmo motivo que o erro é publicado:
       sem ele, uma margem realizada abaixo da configurada é indistinguível de
       um defeito de precificação. O F0.6 mediu 7,61 % contra 8 % — é este campo
       que permite dizer quanto disso é o estimador. */
    const viesConvexidade = (1 - prob) / (sims * prob * prob);
    const bruta = justa * (1 - margem);
    const comPiso = Math.max(oddMin, bruta);
    const comTeto = oddMax === null ? comPiso : Math.min(oddMax, comPiso);
    return {
      idx: i, wins: wins[i], prob,
      fair: +justa.toFixed(2),
      odd: +comTeto.toFixed(2),
      erroRelativo, viesConvexidade,
      /* Quanto cabe num ticket neste lutador (§4.4.6). Arredondado para BAIXO:
         para cima, o payout estouraria o teto por centavos. */
      stakeMax: Math.floor(M.CONF.MAX_PAYOUT_POR_TICKET / (+comTeto.toFixed(2))),
      /* Qual limite mordeu, se algum. `null` é resposta, não ausência: o §4.4.6
         exige que teto aplicado apareça no registro E na interface. */
      limite: comTeto < comPiso ? 'ODD_MAX' : (comPiso > bruta ? 'ODD_MIN' : null),
    };
  });

  /* Overround = soma das probabilidades implícitas nas odds ofertadas. A margem
     efetiva sai dele, e é ela — não a configurada — que descreve o que a casa
     de fato cobra nesta rodada. Publicar as duas lado a lado é o que o §4.4.1
     pede ao proibir "transformação que produza overround diferente do
     configurado sem exibi-lo". */
  const overround = lutadores.reduce((acc, l) => acc + 1 / l.odd, 0);

  return {
    sims, lutadores, overround,
    margemConfigurada: margem,
    margemEfetiva: 1 - 1 / overround,
    erroPior: Math.max(...lutadores.map(l => l.erroRelativo)),
    viesPior: Math.max(...lutadores.map(l => l.viesConvexidade)),
    tetoOdd: oddMax,
    tetoPayoutPorTicket:  M.CONF.MAX_PAYOUT_POR_TICKET,
    tetoPassivoPorRodada: M.CONF.MAX_LIABILITY_POR_RODADA,
    /* Versões: um preço auditado meses depois precisa dizer contra qual código
       e contra qual pack foi gerado. */
    versaoMotor: M.versao,
    versaoPack: M.pack.id,
  };
}
