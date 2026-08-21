/* Q1/Q3/Q6 · A PROGRESSÃO NO SERVIDOR (F1.10).
 *
 * O §5.10 quer duas coisas resolvidas, e são coisas diferentes:
 *
 *   1. limpar o navegador não pode apagar semanas de jogo;
 *   2. forjar progresso não pode ser editar um JSON.
 *
 * A segunda decide o desenho, e é o que a maioria destes testes mede: o cliente
 * diz o que FEZ, nunca quanto progrediu. Uma rota que aceitasse `progresso: 999`
 * seria a edição de JSON com mais passos.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import {
  perfilDe, darXP, nivelDe, desafiosDe, registrarFeito, registrarLogin,
  sequenciaDeLogin, pedirResgate, marcarRuina, emitidoNaSemana, diaDe,
  LOGIN_POR_DIA, TRILHA_DIAS,
} from '../server/progressao.mjs';
import {
  RESGATE_VALOR, RESGATE_RECUSA, RESGATE_COOLDOWN_MS,
  ORCAMENTO_LOGIN_SEMANAL, ORCAMENTO_ROTINEIRO_SEMANAL, ORCAMENTO_AGREGADO_SEMANAL,
} from '../engine/emissao.mjs';

const DIA = 24 * 60 * 60 * 1000;
/* Segunda-feira, para a semana do orçamento começar limpa nos testes. */
const AGORA = Date.parse('2026-03-02T12:00:00Z');

function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = AGORA;
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora });
  return { db, u, agora: () => agora, avancar: ms => { agora += ms; } };
}

export function suite() {
  const s = criarSuite('progressao-servidor');

  /* ── PERFIL E XP ───────────────────────────────────────────────────────*/

  s.teste('o perfil nasce no primeiro acesso e não se duplica', () => {
    const c = cenario();
    const a = perfilDe(c.db, { userId: c.u.id, agora: c.agora() });
    const b = perfilDe(c.db, { userId: c.u.id, agora: c.agora() });
    igual(a.user_id, b.user_id, 'duas consultas criaram dois perfis');
    igual(a.xp, 0, 'o perfil não nasce zerado');
    igual(a.nivel, 1, 'o nível inicial não é 1');
    igual(c.db.prepare('SELECT COUNT(*) n FROM player_profile').get().n, 1,
      'consultar o perfil criou uma linha a mais');
  });

  s.teste('XP sem motivo é recusado', () => {
    const c = cenario();
    let pegou = false;
    try { darXP(c.db, { userId: c.u.id, quanto: 10, motivo: '', agora: c.agora() }); }
    catch { pegou = true; }
    ok(pegou,
      'XP entrou sem motivo. O painel do F1.11 não distinguiria XP de aposta ' +
      'de XP de desafio, e a curva de progressão vira número sem origem.');
  });

  s.teste('XP negativo não é caminho de escrita', () => {
    const c = cenario();
    darXP(c.db, { userId: c.u.id, quanto: 100, motivo: 'teste', agora: c.agora() });
    let pegou = false;
    try { darXP(c.db, { userId: c.u.id, quanto: -50, motivo: 'teste', agora: c.agora() }); }
    catch { pegou = true; }
    ok(pegou, 'XP negativo foi aceito — dá para zerar o nível de alguém por uma rota de ganho');
    igual(perfilDe(c.db, { userId: c.u.id }).xp, 100, 'o XP mudou apesar da recusa');
  });

  /* ── DESAFIOS ──────────────────────────────────────────────────────────*/

  s.teste('os desafios do dia são estáveis entre consultas', () => {
    const c = cenario();
    const a = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() });
    const b = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() + 1000 });
    igual(a.map(d => d.tipo).join(','), b.map(d => d.tipo).join(','),
      'recarregar a página trocou a lista de desafios do dia');
    igual(a.length, 3, 'não são três desafios por dia');
  });

  s.teste('NÃO existe caminho para o cliente escrever progresso', () => {
    /* A varredura é sobre o MÓDULO INTEIRO: qualquer `UPDATE … progresso = ?`
       que não seja o incremento de `registrarFeito` é uma porta. */
    const fonte = readFileSync(new URL('../server/progressao.mjs', import.meta.url).pathname, 'utf8');
    const escritas = [...fonte.matchAll(/progresso\s*=\s*[^,\s)]+/g)].map(m => m[0]);
    igual(escritas.length, 1,
      `há ${escritas.length} escritas em \`progresso\`: ${escritas.join(' | ')}. ` +
      `Só pode existir uma, dentro de \`registrarFeito\`, que INCREMENTA. ` +
      `Qualquer outra é o cliente podendo dizer quanto progrediu — que é a ` +
      `edição de JSON do localStorage com mais passos.`);
  });

  s.teste('o progresso vem do FATO, e para no alvo', () => {
    const c = cenario();
    const antes = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() });
    const alvo = antes[0];
    for (let i = 0; i < alvo.alvo + 5; i++)
      registrarFeito(c.db, { userId: c.u.id, tipo: alvo.tipo, agora: c.agora() });
    const d = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() })
      .find(x => x.slot === alvo.slot);
    igual(d.progresso, alvo.alvo, 'o progresso passou do alvo');
    ok(d.concluido_em, 'o desafio não foi marcado como concluído');
  });

  s.teste('o mesmo desafio não conclui duas vezes', () => {
    const c = cenario();
    const alvo = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() })[0];
    for (let i = 0; i < alvo.alvo; i++)
      registrarFeito(c.db, { userId: c.u.id, tipo: alvo.tipo, agora: c.agora() });
    const primeiro = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() })
      .find(x => x.slot === alvo.slot).concluido_em;
    c.avancar(60_000);
    registrarFeito(c.db, { userId: c.u.id, tipo: alvo.tipo, agora: c.agora() });
    igual(desafiosDe(c.db, { userId: c.u.id, agora: c.agora() })
      .find(x => x.slot === alvo.slot).concluido_em, primeiro,
      'o desafio já concluído foi concluído de novo — o carimbo mudou, e com ' +
      'ele a chance de pagar duas vezes');
  });

  /* ── TRILHA DE LOGIN ───────────────────────────────────────────────────*/

  s.teste('entrar dez vezes no mesmo dia conta um dia', () => {
    const c = cenario();
    const primeiro = registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
    igual(primeiro.creditou, LOGIN_POR_DIA, 'o primeiro login do dia não creditou');
    for (let i = 0; i < 9; i++) {
      c.avancar(60_000);
      const r = registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
      igual(r.creditou, 0, 'entrar de novo no mesmo dia creditou outra vez');
      ok(r.repetido, 'o segundo login do dia não foi marcado como repetido');
    }
    igual(sequenciaDeLogin(c.db, { userId: c.u.id, agora: c.agora() }), 1,
      'dez logins no mesmo dia viraram mais de um dia de sequência');
  });

  s.teste('a sequência é recalculada dos FATOS, e quebra com o dia faltando', () => {
    const c = cenario();
    registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
    c.avancar(DIA);
    registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
    igual(sequenciaDeLogin(c.db, { userId: c.u.id, agora: c.agora() }), 2, 'dois dias seguidos não deram 2');
    c.avancar(2 * DIA);                       // pulou um dia
    registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
    igual(sequenciaDeLogin(c.db, { userId: c.u.id, agora: c.agora() }), 1,
      'a sequência sobreviveu a um dia sem login — é contador, e não série');
  });

  s.teste('a trilha de login respeita o orçamento da SEMANA', () => {
    const c = cenario();
    for (let i = 0; i < 14; i++) {
      registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
      c.avancar(DIA);
    }
    const emitido = c.db.prepare(
      `SELECT COALESCE(SUM(pcb),0) s FROM login_streak WHERE user_id = ?`).get(c.u.id).s;
    ok(emitido <= ORCAMENTO_LOGIN_SEMANAL * 3,
      `14 dias de login emitiram ${emitido} PC-B`);
    /* O que importa é a SEMANA: nenhuma janela de 7 dias pode passar do teto. */
    const porSemana = c.db.prepare(
      `SELECT dia, pcb FROM login_streak WHERE user_id = ? ORDER BY dia`).all(c.u.id);
    for (let i = 0; i + 7 <= porSemana.length; i++) {
      const janela = porSemana.slice(i, i + 7).reduce((a, r) => a + r.pcb, 0);
      ok(janela <= ORCAMENTO_LOGIN_SEMANAL,
        `sete dias seguidos emitiram ${janela} e o orçamento de login é ${ORCAMENTO_LOGIN_SEMANAL}`);
    }
  });

  /* A INVARIANTE QUE DE FATO PROTEGE O ORÇAMENTO DE LOGIN.
   *
   * O clamp dentro de `registrarLogin` é cinto; esta é a calça. Medido: com o
   * valor derivado, sete dias emitem 49 contra um teto de 50 — o clamp NUNCA
   * morde, e um defeito plantado que o removesse passaria verde (foi o S269 na
   * primeira passada). O que protege de verdade é o valor diário sair da
   * divisão do orçamento, e é isso que se afirma aqui. */
  s.teste('a recompensa diária sai do ORÇAMENTO, e não da mão de alguém', () => {
    ok(LOGIN_POR_DIA * TRILHA_DIAS <= ORCAMENTO_LOGIN_SEMANAL,
      `${LOGIN_POR_DIA} PC-B/dia × ${TRILHA_DIAS} dias = ${LOGIN_POR_DIA * TRILHA_DIAS}, ` +
      `e o orçamento de login é ${ORCAMENTO_LOGIN_SEMANAL}. Subir a recompensa ` +
      `diária multiplica por sete o custo semanal — é o D-007 esperando ` +
      `acontecer de novo, noutra torneira.`);
    ok(LOGIN_POR_DIA > 0, 'a trilha de login não paga nada');
  });

  /* O DIA NÃO PODE DEPENDER DO FUSO DO PROCESSO.
   *
   * `farmar login streak manipulando fuso horário` é um dos ataques declarados
   * do bloco. O ataque pelo CLIENTE já está coberto em `test/rotas.mjs` — ele
   * não manda data nenhuma. Sobra o outro lado: se o dia saísse do relógio
   * LOCAL do processo, subir o servidor noutro fuso mudaria a fronteira do dia,
   * e uma migração de região viraria um dia grátis para todo mundo.
   *
   * O defeito plantado S267 troca `toISOString` por `toLocaleDateString`, e
   * passou verde na primeira passada porque a máquina do teste está em UTC — as
   * duas expressões coincidem. Só perguntando com OUTRO fuso é que se vê a
   * diferença. É a mesma forma da L-038: equivalente sob o estado que o teste
   * monta. */
  s.teste('o dia da trilha é o mesmo em qualquer fuso do servidor', () => {
    const antes = process.env.TZ;
    /* Um instante escolhido de propósito: 23:30 UTC é "amanhã" em Kiritimati
       (UTC+14) e "hoje" em Honolulu (UTC-10). Se o dia vier do relógio local,
       os três resultados divergem. */
    const instante = Date.parse('2026-03-02T23:30:00Z');
    const emUTC = (process.env.TZ = 'UTC', diaDe(instante));
    try {
      for (const tz of ['Pacific/Kiritimati', 'Pacific/Honolulu', 'America/Sao_Paulo', 'Asia/Tokyo']) {
        process.env.TZ = tz;
        igual(diaDe(instante), emUTC,
          `com TZ=${tz} o dia virou ${diaDe(instante)} e em UTC é ${emUTC}. O dia ` +
          `saiu do relógio LOCAL do processo — subir o servidor noutro fuso ` +
          `move a fronteira do dia, e uma migração de região vira um dia grátis ` +
          `de trilha para todo mundo.`);
      }
    } finally { if (antes === undefined) delete process.env.TZ; else process.env.TZ = antes; }
  });

  /* ── O RESGATE DO §28.8 ────────────────────────────────────────────────*/

  s.teste('a ruína é marcada uma vez, e não a cada consulta', () => {
    const c = cenario();
    const t1 = marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    c.avancar(6 * 60 * 60 * 1000);
    const t2 = marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    igual(t2, t1,
      'a ruína foi remarcada. Quem está zerado consulta o saldo o tempo todo, ' +
      'e remarcar reinicia o cooldown de 24 h para sempre — o resgate nunca sai.');
  });

  s.teste('voltar a ter saldo limpa a ruína', () => {
    const c = cenario();
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    igual(marcarRuina(c.db, { userId: c.u.id, saldoTotal: 500, agora: c.agora() }), null,
      'voltar a ter dinheiro não limpou a marca de ruína');
    igual(c.db.prepare('SELECT ruina_em FROM users WHERE id = ?').get(c.u.id).ruina_em, null,
      'a marca continuou no banco');
  });

  s.teste('§28.8 · o resgate sai uma vez por semana, e só depois de 24 h', () => {
    const c = cenario();
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    igual(pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() }).motivo,
      RESGATE_RECUSA.COOLDOWN, 'o resgate saiu no mesmo instante da ruína');

    c.avancar(RESGATE_COOLDOWN_MS);
    const ok1 = pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    ok(ok1.conceder, `o resgate foi negado depois de 24 h: ${ok1.motivo}`);
    igual(ok1.valor, RESGATE_VALOR, 'o valor não é o fixo do §28.8');

    c.avancar(60_000);
    igual(pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() }).motivo,
      RESGATE_RECUSA.JA_NA_SEMANA, 'saiu um segundo resgate na mesma semana');
  });

  s.teste('§28.8 · a recusa fica GRAVADA, com o motivo', () => {
    const c = cenario();
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    const linha = c.db.prepare(
      `SELECT * FROM rescue_grants WHERE user_id = ? ORDER BY criado_em DESC LIMIT 1`).get(c.u.id);
    ok(linha, 'a recusa não deixou registro nenhum');
    igual(linha.concedido, 0, 'a recusa foi gravada como concessão');
    igual(linha.motivo, RESGATE_RECUSA.COOLDOWN,
      'o registro não diz POR QUE foi negado — o §4.7 pede ' +
      '`rescue_grant_blocked_by_policy`, e evento sem registro é número sem auditoria');
  });

  s.teste('§28.8 · conta em pausa não recebe resgate', () => {
    const c = cenario();
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: c.agora() });
    c.avancar(RESGATE_COOLDOWN_MS);
    const r = pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0,
                                   protecaoAtiva: true, agora: c.agora() });
    igual(r.conceder, false, 'resgate concedido a conta em cool-off');
    igual(r.motivo, RESGATE_RECUSA.PROTECAO, 'a recusa não aponta a proteção');
  });

  /* ── O ORÇAMENTO AGREGADO, MEDIDO DE PONTA A PONTA ─────────────────────
   *
   * Os testes de `emissao` provam a REGRA. Este prova que o banco, somando
   * login + desafios + resgate de uma conta real numa semana real, não passa do
   * teto do documento. É a diferença entre a peça e o encaixe. */
  s.teste('login + desafios + resgate de uma semana cabem no orçamento', () => {
    const c = cenario();
    for (let i = 0; i < 7; i++) {
      registrarLogin(c.db, { userId: c.u.id, agora: c.agora() });
      const ds = desafiosDe(c.db, { userId: c.u.id, agora: c.agora() });
      for (const d of ds)
        for (let k = 0; k < d.alvo; k++)
          registrarFeito(c.db, { userId: c.u.id, tipo: d.tipo, agora: c.agora() });
      c.avancar(DIA);
    }
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: AGORA });
    pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: AGORA + RESGATE_COOLDOWN_MS });

    const e = emitidoNaSemana(c.db, c.u.id, AGORA + 2 * DIA);
    const total = e.login + e.rotineiro;
    ok(total <= ORCAMENTO_AGREGADO_SEMANAL,
      `uma semana perfeita emitiu ${total} PC-B (login ${e.login}, rotineiro ` +
      `${e.rotineiro}) e o orçamento agregado é ${ORCAMENTO_AGREGADO_SEMANAL}. ` +
      `É a conta do D-007, agora com login e resgate dentro dela.`);
  });

  return s;
}
