/* EMISSÃO DE PC-B — o orçamento rotineiro e o teto de saldo (fecha o D-007).
 *
 * Fronteira: decide QUANTO de PC-B uma recompensa rotineira pode emitir, e o que
 * entra no lugar quando não pode. Não move dinheiro, não conhece desafio, não
 * toca o DOM. Puro, e testável no Node.
 *
 * ── O CONFLITO QUE ESTE ARQUIVO RESOLVE ────────────────────────────────────
 *
 * O código emitia **~525 PC-B por semana** por conta (três desafios/dia × ~25 ×
 * 7). O Estudo Econômico fixa **80 PC-B/semana como teto AGREGADO** de todas as
 * fontes rotineiras, dos quais a trilha de login usa até 50 e sobram **até 30
 * para desafios**. Seis vírgula cinco vezes o teto agregado; dezessete vezes e
 * meia o sub-teto.
 *
 * Não foi descuido: a calibragem de 75/dia é da v0.7, **anterior** ao Estudo, e
 * está comentada como decisão de UX. Hoje os dois documentos se contradizem e o
 * código seguia o mais permissivo — que é sempre o pior lado para errar numa
 * economia.
 *
 * ── A DECISÃO, E ELA É EXPLÍCITA ───────────────────────────────────────────
 *
 * O D-007 dava dois caminhos: baixar a emissão, ou corrigir o Estudo com
 * medição nova. **Escolhido o primeiro**, e o motivo é que o Estudo tem a
 * medição e o código não: 10 mil agentes × 52 semanas mostram emissão irrestrita
 * levando a oferta de PC-B de 2,0 M para 26,4 M. Não há medição do outro lado
 * para opor a essa.
 *
 * ── O QUE MUDA NA PRÁTICA, E O CUSTO DE UX É REAL ──────────────────────────
 *
 * Baixar 525 para 30 dividido por 21 desafios daria **1,4 PC-B por desafio** —
 * poeira, ao lado de uma aposta mínima de 50. Recompensa que não se sente é
 * pior que recompensa ausente, porque ainda ocupa a tela.
 *
 * Então o PC-B deixa de ser pago POR DESAFIO e passa a ser pago por **marco
 * semanal**: o jogador acumula desafios concluídos e recebe o orçamento inteiro
 * de uma vez ao alcançar o marco. Trinta PC-B chegando juntos é uma aposta
 * mínima com sobra; 1,4 sete vezes ao dia não é nada. Mesmo orçamento, mesma
 * conta, e a recompensa volta a ser sentida.
 *
 * O XP continua pago por desafio, sempre, sem teto — ele não é moeda.
 *
 * ── O TETO DE SALDO, QUE É O QUE SEGURA O MODELO ───────────────────────────
 *
 * `soft_issuance_ceiling = 500` não é teto de EMISSÃO: é teto de SALDO. Acima
 * dele o jogador para de receber moeda e passa a receber substituto não
 * monetário. É o que faz "o próprio uso do jogador determinar a emissão real" —
 * quem gasta recebe reposição, quem acumula não. Na simulação do Estudo é ele
 * que estabiliza a oferta em ~5,35 M em vez de 26,4 M, e **ele não existia no
 * código**.
 *
 * O Estudo é explícito no tom: *"Nunca mostrar como se o usuário tivesse
 * 'perdido' uma recompensa; a substituição deve ser prevista na trilha."*
 */

/* Os três números do Estudo Econômico, §6. Ficam aqui e são LIDOS pelo teste que
   os compara com o documento — copiá-los para dentro do teste deixaria os dois
   concordando entre si e discordando da fonte. */
export const ORCAMENTO_AGREGADO_SEMANAL = 80;   // PC-B/semana, todas as fontes rotineiras
export const ORCAMENTO_LOGIN_SEMANAL    = 50;   // a trilha de login usa até isto
export const ORCAMENTO_DESAFIOS_SEMANAL =
  ORCAMENTO_AGREGADO_SEMANAL - ORCAMENTO_LOGIN_SEMANAL;   // o que sobra: 30
export const TETO_SALDO_PC_B = 500;             // soft_issuance_ceiling

/* Quantos desafios concluídos fecham o marco semanal. Vinte e um é o total
   disponível (3/dia × 7); doze pede consistência sem exigir dia perfeito. */
export const MARCO_SEMANAL = 12;

/* O substituto não monetário. Nomes e não valores: quanto cada um vale é
   decisão de outro bloco, e inventar número aqui seria inventar economia. */
export const SUBSTITUTOS = ['trainer_coins', 'ball', 'xp_extra', 'cosmetico'];

/* ── A DECISÃO, NUMA FUNÇÃO ────────────────────────────────────────────────
 *
 * Recebe o estado e devolve o que pagar. Devolve SEMPRE alguma coisa: a
 * recompensa é substituída, nunca cancelada.
 *
 *   concluidosNaSemana  quantos desafios o jogador fechou nesta semana
 *   jaEmitidoNaSemana   quanto de PC-B rotineiro já saiu para ele nesta semana
 *   saldoPcB            o saldo atual de PC-B
 */
export function recompensaDeDesafio({ concluidosNaSemana, jaEmitidoNaSemana, saldoPcB }) {
  if (!Number.isInteger(concluidosNaSemana) || concluidosNaSemana < 0)
    throw new Error('concluidosNaSemana inválido');
  if (!Number.isInteger(jaEmitidoNaSemana) || jaEmitidoNaSemana < 0)
    throw new Error('jaEmitidoNaSemana inválido');
  if (!Number.isInteger(saldoPcB) || saldoPcB < 0)
    throw new Error('saldoPcB inválido');

  /* O MARCO AINDA NÃO FECHOU. Não é recusa: é o desafio pagando XP, que é o que
     ele sempre pagou, e acumulando para o marco. */
  if (concluidosNaSemana < MARCO_SEMANAL)
    return { pcB: 0, substituto: null, motivo: 'marco_pendente',
             faltam: MARCO_SEMANAL - concluidosNaSemana };

  /* O TETO DE SALDO VEM ANTES DO ORÇAMENTO, e a ordem importa: quem está com a
     carteira cheia recebe substituto mesmo tendo orçamento sobrando. É essa
     ordem que faz o USO determinar a emissão, e não o calendário. */
  if (saldoPcB >= TETO_SALDO_PC_B)
    return { pcB: 0, substituto: SUBSTITUTOS[0], motivo: 'teto_de_saldo' };

  const cabe = ORCAMENTO_DESAFIOS_SEMANAL - jaEmitidoNaSemana;
  if (cabe <= 0)
    return { pcB: 0, substituto: SUBSTITUTOS[0], motivo: 'orcamento_da_semana' };

  /* NUNCA MAIS QUE O QUE CABE, e o resto vira substituto — não some. */
  const pcB = Math.min(ORCAMENTO_DESAFIOS_SEMANAL, cabe);
  return { pcB, substituto: pcB < ORCAMENTO_DESAFIOS_SEMANAL ? SUBSTITUTOS[0] : null,
           motivo: 'marco_pago' };
}

/* ── O RESGATE DO §28.8 ─────────────────────────────────────────────────────
 *
 * O §0.4 lista `rescue grant` entre os faucets de PC-B, e o §28.8 o cerca:
 *
 *     rescue_grant_max_por_semana   = 1
 *     rescue_grant_valor            = fixo, nunca proporcional à perda
 *     rescue_grant_cooldown         = 24 h após a ruína, não imediato
 *     rescue_grant_bloqueado_se     = cooloff | self_exclusion | sinal de risco
 *
 * **A regra do valor fixo é a que importa.** Um grant que escala com o quanto o
 * jogador perdeu ensina exatamente o comportamento errado: perder mais passa a
 * render mais. É o item nº 1 da sabotagem deste bloco.
 *
 * ── O ORÇAMENTO É UM SÓ, E ISSO PRECISOU SER DECIDIDO ──────────────────────
 *
 * O Estudo Econômico §6 diz: "login consome até 50 e deixa até **30** para
 * desafios/rescue/missões". São 30 para os TRÊS, e não 30 para cada um — a
 * leitura errada põe a emissão agregada acima do teto de 80 sem ninguém mexer
 * em número nenhum. Foi o defeito D-007 noutra escala.
 *
 * Então o resgate consulta o MESMO `jaEmitidoNaSemana` que os desafios
 * consultam, e os dois competem pelo mesmo pote. Quem chegar primeiro leva; o
 * segundo recebe substituto. Nenhum dos dois precisa saber do outro — o
 * contador é a única coisa que os liga, e é o que impede a soma de estourar.
 *
 * ── O VALOR É DECISÃO DESTE BLOCO, E NÃO ESTÁ CALIBRADO ────────────────────
 *
 * O §28.8 exige que o valor seja fixo e não diz qual. Vinte PC-B é o que cabe
 * no pote sem consumi-lo inteiro, deixando dez para os desafios da mesma
 * semana. NÃO é um número medido: até haver coorte não há de onde calibrá-lo,
 * e isso está registrado na **L-040**, junto com o que a destrava. */
export const ORCAMENTO_ROTINEIRO_SEMANAL = ORCAMENTO_DESAFIOS_SEMANAL;
export const RESGATE_VALOR = 20;
export const RESGATE_MAX_POR_SEMANA = 1;
export const RESGATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/* Os motivos de recusa. Nomeados porque a telemetria do §4.7 grava
   `rescue_grant_blocked_by_policy` e "bloqueado" sem o porquê não responde
   nada — nem para o jogador, nem para quem lê o painel depois. */
export const RESGATE_RECUSA = {
  PROTECAO:    'protecao_ativa',
  RISCO:       'sinal_de_risco',
  COOLDOWN:    'cooldown_de_24h',
  JA_NA_SEMANA:'ja_recebeu_nesta_semana',
  TEM_SALDO:   'ainda_tem_saldo',
  ORCAMENTO:   'orcamento_da_semana',
};

/* Recebe o estado e devolve o que fazer. Nunca lê a PERDA — o parâmetro não
   existe, e essa ausência é a garantia do §28.8: não dá para escalar com algo
   que a função não recebe.
 *
 *   saldoTotal          quanto o jogador tem agora (a ruína é isto ser zero)
 *   ruinaEm             quando ele zerou; o cooldown conta daí
 *   agora               o relógio
 *   recebidosNaSemana   quantos resgates já saíram nesta semana
 *   jaEmitidoNaSemana   quanto de PC-B rotineiro já saiu — o pote compartilhado
 *   protecaoAtiva       cool-off ou autoexclusão em curso
 *   sinaisDeRisco       quantos sinais do §28.6 estão acesos
 */
export function avaliarResgate({ saldoTotal, ruinaEm, agora, recebidosNaSemana,
                                 jaEmitidoNaSemana, protecaoAtiva = false,
                                 sinaisDeRisco = 0 }) {
  /* A PROTEÇÃO VEM PRIMEIRO, ANTES DE QUALQUER CONTA. Dar dinheiro a quem pediu
     para parar é desfazer o pedido dele com um presente — e o §28.4 diz que a
     pausa é irreversível durante o prazo. */
  if (protecaoAtiva) return { conceder: false, motivo: RESGATE_RECUSA.PROTECAO, valor: 0 };
  if (sinaisDeRisco > 0) return { conceder: false, motivo: RESGATE_RECUSA.RISCO, valor: 0 };

  if (saldoTotal > 0) return { conceder: false, motivo: RESGATE_RECUSA.TEM_SALDO, valor: 0 };
  if (recebidosNaSemana >= RESGATE_MAX_POR_SEMANA)
    return { conceder: false, motivo: RESGATE_RECUSA.JA_NA_SEMANA, valor: 0 };

  /* O COOLDOWN CONTA DA RUÍNA, e não do pedido. Imediato, o resgate vira a
     recompensa de ter zerado: perdeu tudo, ganhou de volta, joga de novo. As
     24 h são o que separa uma rede de segurança de um laço de reengajamento. */
  if (!Number.isFinite(ruinaEm) || agora - ruinaEm < RESGATE_COOLDOWN_MS)
    return { conceder: false, motivo: RESGATE_RECUSA.COOLDOWN, valor: 0,
             liberaEm: Number.isFinite(ruinaEm) ? ruinaEm + RESGATE_COOLDOWN_MS : null };

  const cabe = ORCAMENTO_ROTINEIRO_SEMANAL - jaEmitidoNaSemana;
  if (cabe < RESGATE_VALOR)
    return { conceder: false, motivo: RESGATE_RECUSA.ORCAMENTO, valor: 0,
             substituto: SUBSTITUTOS[0] };

  /* VALOR FIXO. Não há nenhum parâmetro de perda nesta função, e é assim que a
     regra do §28.8 fica impossível de quebrar por descuido. */
  return { conceder: true, motivo: 'concedido', valor: RESGATE_VALOR };
}

/* A emissão semanal MÁXIMA que este desenho permite, por conta. É o número que
   o teste compara com o orçamento do documento — e é a conta que o D-007 pedia
   que alguém fizesse. */
export const emissaoSemanalMaxima = () => ORCAMENTO_DESAFIOS_SEMANAL;

/* A semana a que uma data pertence, em ISO (`2026-W03`). Semana e não "sete dias
   corridos": com janela deslizante, o jogador que joga sábado e domingo fecha
   dois marcos em três dias, e o orçamento semanal vira quinzenal na prática. */
export function semanaDe(dataISO) {
  const d = new Date(dataISO + 'T00:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7;              // segunda = 0
  d.setUTCDate(d.getUTCDate() - dia + 3);           // quinta da mesma semana
  const primeiraQuinta = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const off = (primeiraQuinta.getUTCDay() + 6) % 7;
  primeiraQuinta.setUTCDate(primeiraQuinta.getUTCDate() - off + 3);
  const n = 1 + Math.round((d - primeiraQuinta) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}
