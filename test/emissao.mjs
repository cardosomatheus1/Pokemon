/* Q1/Q3 · EMISSÃO DE PC-B — o orçamento cabe, e o teto de saldo existe (D-007).
 *
 * O QUE SE TESTA AQUI É UMA CONTA, e ela é a razão do bloco: a emissão semanal
 * máxima por conta tem que caber no orçamento que o Estudo Econômico fixa.
 *
 * O TESTE LÊ O NÚMERO DO DOCUMENTO, e não uma cópia dele. Copiar o orçamento
 * para dentro do teste deixaria os dois concordando entre si e discordando da
 * fonte — que é exatamente como o D-007 nasceu: uma calibragem de UX da v0.7
 * seguiu valendo depois de o Estudo existir, e ninguém comparou.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import {
  recompensaDeDesafio, emissaoSemanalMaxima, semanaDe,
  ORCAMENTO_AGREGADO_SEMANAL, ORCAMENTO_DESAFIOS_SEMANAL, ORCAMENTO_LOGIN_SEMANAL,
  TETO_SALDO_PC_B, MARCO_SEMANAL, SUBSTITUTOS,
} from '../engine/emissao.mjs';

const estudo = () => readFileSync(
  new URL('../docs/POKEARENA_ECONOMY_STUDY_v1.2.md', import.meta.url).pathname, 'utf8');

const cheio = (extra = {}) =>
  ({ concluidosNaSemana: MARCO_SEMANAL, jaEmitidoNaSemana: 0, saldoPcB: 0, ...extra });

export function suite() {
  const s = criarSuite('emissao');

  /* --- os números vêm do DOCUMENTO --------------------------------------- */

  s.teste('o orçamento do código é o que o Estudo Econômico escreve', () => {
    const txt = estudo();
    const agregado = txt.match(/routine_pc_b_budget\s*=\s*até\s*(\d+)\s*PC-B\/semana/);
    ok(agregado, 'não achei `routine_pc_b_budget` no Estudo — o teste perdeu a âncora');
    igual(ORCAMENTO_AGREGADO_SEMANAL, Number(agregado[1]),
      `o código usa ${ORCAMENTO_AGREGADO_SEMANAL} e o Estudo escreve ${agregado[1]}. ` +
      `Foi exatamente assim que o D-007 nasceu: dois documentos discordando e o ` +
      `código seguindo o mais permissivo.`);

    const teto = txt.match(/soft_issuance_ceiling\s*=\s*(\d+)/);
    ok(teto, 'não achei `soft_issuance_ceiling` no Estudo');
    igual(TETO_SALDO_PC_B, Number(teto[1]),
      `teto de saldo: código ${TETO_SALDO_PC_B}, Estudo ${teto[1]}`);

    /* A repartição 50/30 está em prosa, não em bloco de código — por isso o
       teste procura os dois números na mesma frase que os explica. */
    ok(/login usa até 50 PC-B\/semana e deixa até 30/.test(txt),
      'a repartição login/desafios mudou de forma no Estudo — reveja a divisão aqui');
    igual(ORCAMENTO_LOGIN_SEMANAL, 50, 'a fatia de login divergiu');
    igual(ORCAMENTO_DESAFIOS_SEMANAL, 30, 'a fatia de desafios divergiu');
  });

  /* --- A CONTA QUE O D-007 PEDIA ----------------------------------------- */

  s.teste('a emissão semanal máxima CABE no orçamento de desafios', () => {
    const maxima = emissaoSemanalMaxima();
    ok(maxima <= ORCAMENTO_DESAFIOS_SEMANAL,
      `emissão máxima de ${maxima} PC-B/semana contra um orçamento de ` +
      `${ORCAMENTO_DESAFIOS_SEMANAL}. Era ~525 antes do D-007 fechar — 17,5x.`);
    ok(maxima <= ORCAMENTO_AGREGADO_SEMANAL,
      `emissão máxima estoura até o teto AGREGADO de ${ORCAMENTO_AGREGADO_SEMANAL}`);
  });

  /* E o caminho longo: simula uma semana inteira de desafios e soma o que saiu.
     A conta acima é a declaração; esta é a peça. */
  s.teste('vinte e um desafios numa semana não emitem mais que o orçamento', () => {
    let emitido = 0, concluidos = 0, saldo = 0;
    for (let i = 0; i < 21; i++) {
      concluidos++;
      const r = recompensaDeDesafio({ concluidosNaSemana: concluidos,
                                      jaEmitidoNaSemana: emitido, saldoPcB: saldo });
      emitido += r.pcB; saldo += r.pcB;
    }
    igual(emitido, ORCAMENTO_DESAFIOS_SEMANAL,
      `uma semana perfeita emitiu ${emitido} PC-B; o orçamento é ` +
      `${ORCAMENTO_DESAFIOS_SEMANAL}. Antes do D-007 fechar eram ~525.`);
  });

  /* --- o marco semanal --------------------------------------------------- */

  s.teste('antes do marco não sai PC-B, e o desafio diz quanto falta', () => {
    const r = recompensaDeDesafio(cheio({ concluidosNaSemana: 3 }));
    igual(r.pcB, 0, 'pagou PC-B antes do marco');
    igual(r.motivo, 'marco_pendente', `motivo veio "${r.motivo}"`);
    igual(r.faltam, MARCO_SEMANAL - 3,
      'não disse quantos faltam — recompensa adiada sem contador vira recompensa sumida');
  });

  s.teste('o marco paga o orçamento INTEIRO de uma vez', () => {
    const r = recompensaDeDesafio(cheio());
    igual(r.pcB, ORCAMENTO_DESAFIOS_SEMANAL,
      `o marco pagou ${r.pcB}. Pagar em parcelas de 1,4 seria poeira ao lado de ` +
      `uma aposta mínima de 50 — recompensa que não se sente é pior que ausente.`);
    igual(r.substituto, null, 'pagou o orçamento inteiro E um substituto');
  });

  s.teste('depois do marco pago, a semana não paga de novo', () => {
    const r = recompensaDeDesafio(cheio({ concluidosNaSemana: MARCO_SEMANAL + 5,
                                          jaEmitidoNaSemana: ORCAMENTO_DESAFIOS_SEMANAL }));
    igual(r.pcB, 0, 'pagou duas vezes na mesma semana');
    igual(r.motivo, 'orcamento_da_semana', `motivo veio "${r.motivo}"`);
  });

  /* --- O TETO DE SALDO, que é o que segura o modelo ---------------------- */

  s.teste('acima do teto de saldo NÃO sai moeda, sai substituto', () => {
    const r = recompensaDeDesafio(cheio({ saldoPcB: TETO_SALDO_PC_B }));
    igual(r.pcB, 0,
      `com ${TETO_SALDO_PC_B} PC-B em carteira ainda saiu moeda. É o ` +
      `soft_issuance_ceiling do Estudo, e é ele que faz a oferta estabilizar em ` +
      `~5,35 M em vez de 26,4 M na simulação de 10 mil agentes.`);
    igual(r.motivo, 'teto_de_saldo', `motivo veio "${r.motivo}"`);
    ok(SUBSTITUTOS.includes(r.substituto),
      `substituto "${r.substituto}" não está na lista. O Estudo é explícito: ` +
      `"Nunca mostrar como se o usuário tivesse perdido uma recompensa".`);
  });

  s.teste('o teto de saldo vem ANTES do orçamento, e a ordem importa', () => {
    /* Carteira cheia E orçamento sobrando: quem acumula não recebe, mesmo com
       espaço no orçamento. É isso que faz o USO determinar a emissão, e não o
       calendário. */
    const r = recompensaDeDesafio(cheio({ saldoPcB: TETO_SALDO_PC_B + 100, jaEmitidoNaSemana: 0 }));
    igual(r.motivo, 'teto_de_saldo',
      `com carteira cheia e orçamento inteiro disponível, o motivo veio ` +
      `"${r.motivo}". Se o orçamento vier primeiro, quem acumula continua ` +
      `recebendo — e é justamente esse jogador que o teto existe para parar.`);
  });

  s.teste('quem GASTA volta a receber', () => {
    /* Semana nova, carteira esvaziada: a torneira reabre. É a outra metade do
       teto, e sem ela ele seria uma punição em vez de um regulador. */
    const r = recompensaDeDesafio(cheio({ saldoPcB: TETO_SALDO_PC_B - 1, jaEmitidoNaSemana: 0 }));
    igual(r.pcB, ORCAMENTO_DESAFIOS_SEMANAL,
      'um PC-B abaixo do teto e a torneira continua fechada — o teto virou punição');
  });

  s.teste('a recompensa NUNCA some: sempre há moeda ou substituto', () => {
    const casos = [
      cheio({ concluidosNaSemana: 0 }),
      cheio({ saldoPcB: 9999 }),
      cheio({ jaEmitidoNaSemana: 999 }),
      cheio(),
    ];
    for (const c of casos) {
      const r = recompensaDeDesafio(c);
      ok(r.pcB > 0 || r.substituto !== null || r.motivo === 'marco_pendente',
        `caso ${JSON.stringify(c)} devolveu nada: ${JSON.stringify(r)}. O Estudo ` +
        `pede que a substituição seja prevista na trilha, não que a recompensa suma.`);
    }
  });

  /* --- entrada inválida --------------------------------------------------- */

  s.teste('entrada inválida é recusada, e não devolve moeda por engano', () => {
    for (const mau of [
      { concluidosNaSemana: -1 }, { concluidosNaSemana: 1.5 },
      { jaEmitidoNaSemana: -5 }, { saldoPcB: -1 }, { saldoPcB: NaN },
    ]) {
      let erro = null;
      try { recompensaDeDesafio(cheio(mau)); } catch (e) { erro = e; }
      ok(erro, `${JSON.stringify(mau)} foi aceito`);
    }
  });

  /* --- a semana é a SEMANA, e não sete dias corridos --------------------- */

  s.teste('a semana ISO agrupa de segunda a domingo', () => {
    igual(semanaDe('2026-01-12'), semanaDe('2026-01-18'),
      'segunda e domingo da mesma semana caíram em semanas diferentes');
    ok(semanaDe('2026-01-18') !== semanaDe('2026-01-19'),
      'domingo e a segunda seguinte caíram na mesma semana — com janela ' +
      'deslizante, quem joga sábado e domingo fecha dois marcos em três dias, ' +
      'e o orçamento semanal vira quinzenal na prática');
  });

  s.teste('a virada do ano não cria uma semana fantasma', () => {
    /* 31/12/2026 é quinta; 01/01/2027 é sexta. Mesma semana ISO. */
    igual(semanaDe('2026-12-31'), semanaDe('2027-01-01'),
      'a virada do ano partiu uma semana em duas, e o orçamento dobra nela');
  });

  return s;
}
