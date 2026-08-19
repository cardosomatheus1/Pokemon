/* Tetos de exposição — Spec §4.4.6.
 *
 * O primeiro parâmetro que uma casa de apostas define, e que não existia em
 * nenhum dos três documentos do conjunto até a v1.4. A magnitude do buraco: o
 * pior lutador do elenco tem odd justa x62, então UM ticket de 5.000 gerava
 * passivo de 287.500 numa rodada, sem nada no caminho.
 *
 * O INSTRUMENTO É TETO DE PAYOUT, NÃO TETO DE ODD, e a diferença tem número:
 * um teto de odd em x20 transforma a margem declarada de 8 % em 68 % no
 * azarão — contradiz o P1 e o discurso de transparência que o produto usa como
 * diferencial. Teto de payout preserva a odd e limita só o tamanho da aposta.
 *
 * Este arquivo é PURO de propósito: sem DOM, sem estado global, sem carteira.
 * Quem decide aceitar uma aposta precisa ser testável sem navegador, e em V1
 * a mesma função roda no servidor.
 */

/* Passivo por lutador: quanto a casa paga SE aquele lutador vencer.
 *
 * O teto vem carimbado no objeto, e isso é decisão de segurança, não de estilo.
 * A primeira versão recebia `conf` como parâmetro OPCIONAL de
 * `registrarTicket`, e o teste da corrida do §4.4.6 estourou o teto em 549.952
 * contra 500.000 — porque a chamada sem `conf` simplesmente não conferia nada.
 * Guarda que se pode esquecer não é guarda. Aqui não há como registrar sem
 * saber contra qual teto.
 */
export function passivoVazio(registro, conf) {
  const p = new Float64Array(registro.lutadores.length);
  p.teto = conf.MAX_LIABILITY_POR_RODADA;
  return p;
}

/* O passivo DA RODADA é o pior caso, não a soma: só um lutador vence, então a
   casa nunca paga as duas pontas. Somar tudo superestimaria o risco e fecharia
   mercado sem necessidade. */
export function passivoDaRodada(passivo) {
  let pior = 0;
  for (const v of passivo) if (v > pior) pior = v;
  return pior;
}

const inteiroValido = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

const moeda = v => Math.round(v).toLocaleString('pt-BR');

/* Avalia SEM registrar. Devolve o que a interface precisa dizer: se cabe,
 * quanto cabe, qual limite mordeu e por quê.
 *
 * `aceito: false` é reservado para mercado fechado e entrada inválida. Pedido
 * grande demais NÃO é recusa: é corte, com `cortado: true`. O §4.4.6 é
 * explícito — *"a UI mostra o stake máximo disponível para aquele lutador e o
 * motivo — nunca rejeita silenciosamente"*.
 */
export function avaliarAposta(registro, passivo, idx, valor, conf) {
  const n = registro.lutadores.length;
  if (!Number.isInteger(idx) || idx < 0 || idx >= n)
    return { aceito: false, valor: 0, cortado: false, motivo: 'LUTADOR_INVALIDO',
             mensagem: 'Esse lutador não está nesta rodada.' };
  if (!inteiroValido(valor))
    return { aceito: false, valor: 0, cortado: false, motivo: 'VALOR_INVALIDO',
             mensagem: 'O valor da aposta precisa ser um número positivo.' };

  const l = registro.lutadores[idx];
  const tetoTicket  = conf.MAX_PAYOUT_POR_TICKET;
  const tetoRodada  = conf.MAX_LIABILITY_POR_RODADA;

  /* Dois limites, e o menor manda: quanto cabe num ticket, e quanto ainda cabe
     no passivo já acumulado neste lutador. */
  const porTicket  = Math.floor(tetoTicket / l.odd);
  const espacoRest = Math.max(0, tetoRodada - passivo[idx]);
  const porPassivo = Math.floor(espacoRest / l.odd);
  const limite     = Math.min(porTicket, porPassivo);

  if (limite < 1)
    return { aceito: false, valor: 0, cortado: false, motivo: 'MAX_LIABILITY_POR_RODADA',
             mensagem: `Mercado fechado para ${l.nome ?? 'este lutador'}: o passivo da rodada ` +
                       `chegou ao teto de ${moeda(tetoRodada)}. Os outros lutadores seguem abertos.` };

  if (valor <= limite)
    return { aceito: true, valor, cortado: false, motivo: null, mensagem: null, limite };

  const motivo = porTicket <= porPassivo ? 'MAX_PAYOUT_POR_TICKET' : 'MAX_LIABILITY_POR_RODADA';
  const mensagem = motivo === 'MAX_PAYOUT_POR_TICKET'
    ? `Cabem ${moeda(limite)} nesta aposta. O retorno máximo por ticket é ` +
      `${moeda(tetoTicket)}, e a x${l.odd.toFixed(2)} deste lutador isso dá ${moeda(limite)}.`
    : `Cabem ${moeda(limite)} nesta aposta. O passivo da rodada neste lutador está perto do ` +
      `teto de ${moeda(tetoRodada)}; o retorno máximo por ticket é ${moeda(tetoTicket)}.`;

  return { aceito: true, valor: limite, cortado: true, motivo, mensagem, limite };
}

/* Registra e devolve se coube. Reconfere o passivo NO MOMENTO do registro em
 * vez de confiar na avaliação anterior — é essa reconferência que fecha a
 * corrida do §4.4.6, "duas apostas no mesmo lutador no último instante".
 * Avaliar e registrar em momentos diferentes contra o mesmo passivo é
 * exatamente como o teto vaza.
 */
export function registrarTicket(passivo, idx, valor, odd) {
  if (typeof passivo.teto !== 'number')
    throw new Error('passivo sem teto: use passivoVazio(registro, conf)');
  const payout = valor * odd;
  if (passivo[idx] + payout > passivo.teto) return false;
  passivo[idx] += payout;
  return true;
}

/* O INVERSO EXATO DE `registrarTicket` — cancelar aposta e trocar de lutador.
 *
 * O V1.15 traz o cancelamento, e ele mexe no lugar mais perigoso do §4.4.6.
 * Os dois sentidos falham, e falham calados:
 *
 *   liberar de menos   o passivo daquele lutador nunca volta, e o mercado dele
 *                      fica travado o resto da rodada por causa de uma aposta
 *                      que não existe mais. O jogador vê "mercado fechado" sem
 *                      nada explicando por quê.
 *   liberar de mais    abre espaço que não foi devolvido, e o teto vaza pela
 *                      porta do cancelamento — cancelar vira o jeito de
 *                      apostar acima do limite.
 *
 * TRAVA EM ZERO em vez de aceitar negativo. Passivo negativo é espaço que não
 * existe, e ele apareceria de duas formas: erro de ponto flutuante depois de
 * muitas trocas, ou liberação de um ticket que nunca foi registrado. Nos dois
 * casos zero é a resposta segura — nunca crédito.
 *
 * A guarda do teto é a mesma do registro, pelo mesmo motivo do D-004: guarda
 * que se pode esquecer não é guarda.
 */
export function liberarTicket(passivo, idx, valor, odd) {
  if (typeof passivo.teto !== 'number')
    throw new Error('passivo sem teto: use passivoVazio(registro, conf)');
  passivo[idx] = Math.max(0, passivo[idx] - valor * odd);
  return passivo[idx];
}
