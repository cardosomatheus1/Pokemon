/* O TEXTO DA PROTEÇÃO (F1.13) — rótulos e a frase da recusa.
 *
 * Separado da tela porque é PURO: não toca DOM, não chama rede, não importa
 * nada do app. O motivo é testabilidade, e ele é concreto — o §28.3 exige que a
 * recusa diga QUAL limite, QUANTO falta e QUANDO volta, e isso é uma afirmação
 * sobre TEXTO. Com a frase presa dentro do módulo de tela, a única forma de
 * conferi-la seria abrir um Chromium; aqui ela se confere em milissegundos.
 */

/* Os rótulos em português dos limites do §28.3. Os IDs vêm do servidor: a lista
   de tipos é do domínio, e repeti-la aqui criaria uma segunda fonte que
   envelhece calada. Este mapa só traduz o que chegar. */
export const ROTULO = {
  max_stake_per_round: 'Máximo por rodada',
  max_loss_dia:        'Perda máxima por dia',
  max_loss_semana:     'Perda máxima por semana',
  max_loss_mes:        'Perda máxima por mês',
  max_rounds_dia:      'Rodadas por dia',
  max_session_time:    'Tempo de sessão (minutos)',
};

export const quando = ms => new Date(ms).toLocaleString('pt-BR',
  { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* AS TRÊS COISAS QUE O §28.3 EXIGE, numa frase: qual limite, quanto foi usado
   contra quanto, e quando a janela vira. Sem a terceira, "você atingiu seu
   limite" é uma parede sem porta.

   E NADA MAIS. Nenhum botão, nenhuma alternativa, nenhuma sugestão de comprar
   ou depositar: o §28.7 diz que a recusa "nunca oferece um caminho alternativo
   de gasto na mesma tela", e a tela de saldo insuficiente deste app já tem um
   botão de depositar — copiar aquele padrão para cá é o jeito natural de
   violar a regra sem perceber. */
export function mensagemDeBloqueio(v) {
  const nome = ROTULO[v.limite] || v.limite;
  const volta = v.voltaEm ? ` Volta em ${quando(v.voltaEm)}.` : '';
  const como = v.voltaEm ? '' : ` ${v.comoLiberar || ''}`;
  return `${nome} (${v.limite}): você usou ${v.usado} de ${v.teto}.${volta}${como}`.trim();
}
