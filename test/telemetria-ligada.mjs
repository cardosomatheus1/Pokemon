/* Q6/Q9 · CADA EVENTO DO §4.7 TEM QUEM O EMITA (R21 — fecha o D-034)
 *
 * ── O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR ─────────────────────────
 *
 * `server/telemetria.mjs` implementava o §4.7 inteiro — os 20 eventos de
 * proteção, os campos obrigatórios de cada um, a regra de que evento de
 * proteção nunca é amostrado — e `emitir()` **não era chamado em lugar
 * nenhum**. A tabela `telemetry_events` ficava vazia para sempre.
 *
 * Todo teste do §4.7 chamava `emitir()` DIRETAMENTE. Eles provavam que a função
 * valida, recusa campo faltando e não amostra proteção — e passavam, porque a
 * função estava certa. O que ninguém testou foi se alguém a chama.
 *
 * ── POR QUE O TESTE É ESTÁTICO, E ISSO É DELIBERADO ────────────────────────
 *
 * Um teste de comportamento prova que o caminho que ELE percorre emite. Não
 * prova nada sobre os outros dezenove. Para cobrar "todo evento declarado tem
 * chamador", a pergunta é sobre o CÓDIGO, e é o código que precisa ser lido.
 *
 * Os dois se completam e os dois estão aqui: a varredura estática garante
 * cobertura, e os testes de comportamento no fim do arquivo provam que o que é
 * emitido chega ao banco com os campos certos.
 *
 * ── A REGRA QUE ISTO IMPÕE ────────────────────────────────────────────────-
 *
 * Declarar um evento em `PROTECAO` passa a ser um COMPROMISSO. Quem
 * acrescentar um nome à lista sem ligar quem o emite deixa a suíte vermelha —
 * que é o oposto do que aconteceu da primeira vez, quando declarar foi de
 * graça e ninguém sentiu falta.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { PROTECAO, eventosDe } from '../server/telemetria.mjs';

const DIR = new URL('../server/', import.meta.url);
const AGORA = Date.parse('2026-03-02T12:00:00Z');

/* Todo o código de produção do servidor, junto — menos o próprio módulo de
   telemetria, que é onde `emitir` é DEFINIDA. Incluí-lo faria a definição
   contar como uso, e o teste passaria com zero chamadores. */
const FONTES = readdirSync(DIR)
  .filter(f => f.endsWith('.mjs') && f !== 'telemetria.mjs')
  .map(f => [f, readFileSync(new URL(f, DIR), 'utf8')]);
const TODO = FONTES.map(([, t]) => t).join('\n');

function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA });
  return { db, u };
}

export function suite() {
  const s = criarSuite('telemetria-ligada');

  /* ── A VARREDURA ───────────────────────────────────────────────────────*/

  s.teste('a telemetria do servidor é importada por código de produção', () => {
    const quem = FONTES.filter(([, t]) => /from\s+'\.\/telemetria\.mjs'/.test(t))
                       .map(([f]) => f);
    ok(quem.length > 0,
      'nenhum módulo do servidor importa `telemetria.mjs`. O §4.7 inteiro ' +
      'estaria construído e desligado — que foi exatamente o D-034.');
  });

  /* O TESTE CENTRAL. Cada nome declarado em `PROTECAO` precisa aparecer numa
     CHAMADA de produção.
     Procurar o nome solto não serve: ele aparece em comentário, e comentário
     não emite nada. Mascarar as strings antes também não serve, e foi a
     primeira tentativa — os nomes dos eventos SÃO strings, então o mascarador
     apagava justamente o que se procurava, e o teste acusou os vinte.
     A busca é pela FORMA da emissão, `nome: '<evento>'`, que é o que `anotar` e
     `emitir` recebem. Um comentário teria que reproduzir a chamada inteira para
     enganar. */
  const emissaoDe = nome => new RegExp(`nome:\\s*['"\`]${nome}['"\`]`);
  s.teste('todo evento de proteção do §4.7 tem quem o emita', () => {
    const semDono = PROTECAO.filter(nome =>
      !FONTES.some(([, t]) => emissaoDe(nome).test(t)));
    igual(semDono.length, 0,
      `${semDono.length} evento(s) de proteção declarados e nunca emitidos: ` +
      `${semDono.join(', ')}.\n` +
      `Declarar um evento em PROTECAO é um COMPROMISSO: sem chamador, o fato ` +
      `que ele existe para provar não fica registrado em lugar nenhum, e ` +
      `"a Arena protege quem joga" vira afirmação sem evidência (§28.7).`);
  });

  /* CHAMAR NÃO É O BASTANTE — a chamada tem que estar no caminho que DECIDE.
     Um `emitir` dentro de uma rota que ninguém alcança satisfaria o teste
     acima. Estes três eventos são os que provam decisão de proteção, e eles
     precisam morar no módulo que toma a decisão, não na fronteira HTTP. */
  s.teste('os eventos de decisão moram no módulo que decide, não na rota', () => {
    const onde = nome => FONTES.filter(([, t]) => new RegExp(`['"\`]${nome}['"\`]`).test(t))
                               .map(([f]) => f);
    const casos = [
      ['cooloff_started', 'protecao.mjs'],
      ['rescue_grant_issued', 'progressao.mjs'],
      ['limit_blocked_action', 'limites.mjs'],
    ];
    for (const [evento, dono] of casos)
      ok(onde(evento).includes(dono),
        `\`${evento}\` não é emitido em \`${dono}\`, e sim em ${onde(evento).join(', ') || 'lugar nenhum'}. ` +
        `Emitir na rota registra o PEDIDO; emitir no módulo registra a DECISÃO — ` +
        `e é a decisão que o §4.7 manda provar. Um segundo caminho até a mesma ` +
        `decisão nasceria sem telemetria.`);
  });

  /* ── O COMPORTAMENTO ───────────────────────────────────────────────────*/

  s.teste('conceder resgate grava o evento, com o usuário', async () => {
    const c = cenario();
    const { pedirResgate, marcarRuina } = await import('../server/progressao.mjs');
    /* Ruína há mais de 24 h é a condição do §28.8 para o resgate sair. */
    marcarRuina(c.db, { userId: c.u.id, saldoTotal: 0, agora: AGORA - 48 * 3_600_000 });
    const v = pedirResgate(c.db, { userId: c.u.id, saldoTotal: 0, agora: AGORA });
    ok(v.conceder, `o cenário não concedeu o resgate (motivo: ${v.motivo}) — o teste mediria nada`);

    const evs = eventosDe(c.db, { nome: 'rescue_grant_issued' });
    igual(evs.length, 1, 'o resgate foi concedido e não gerou evento');
    igual(evs[0].user_id, c.u.id, 'o evento saiu sem dono');
    igual(evs[0].amostravel, 0,
      'o evento de proteção foi marcado como amostrável — o §4.7 proíbe');
  });

  /* A RECUSA TAMBÉM É FATO, e é a que responde "por que este jogador não
     recebeu?". Sem ela, só o caminho feliz fica auditável. */
  s.teste('negar resgate grava o evento, com o motivo da política', async () => {
    const c = cenario();
    const { pedirResgate } = await import('../server/progressao.mjs');
    /* Sem ruína marcada: o §28.8 recusa, e a recusa tem que aparecer. */
    const v = pedirResgate(c.db, { userId: c.u.id, saldoTotal: 500, agora: AGORA });
    ok(!v.conceder, 'o cenário concedeu onde devia negar');

    const evs = eventosDe(c.db, { nome: 'rescue_grant_blocked_by_policy' });
    igual(evs.length, 1, 'a recusa não gerou evento');
    const campos = JSON.parse(evs[0].campos);
    ok(campos.action_blocked, '`action_blocked` é obrigatório para este evento (§4.7)');
    ok(String(campos.action_blocked).includes(v.motivo) || campos.action_blocked === v.motivo,
      `o evento diz "${campos.action_blocked}" e a decisão diz "${v.motivo}" — ` +
      `um registro que não bate com o veredito é pior que nenhum`);
  });

  /* UM EVENTO POR SINAL, E ESTE TESTE FALTAVA — a sabotagem S388 passou ilesa
     na primeira passada do Q2 justamente por isso.
     `signal_type` é campo obrigatório de `risk_signal_raised` no §4.7. Um
     evento carregando a lista teria que escolher UM sinal para o campo, e os
     outros deixariam de ser contáveis — a série responderia "acendeu alguma
     coisa" em vez de "quais acenderam", que é a pergunta do §28.6. */
  s.teste('cada sinal de risco vira um evento próprio', async () => {
    const c = cenario();
    const { sinaisDeRisco } = await import('../server/protecao.mjs');

    /* `limit_pressure`: três pedidos de aumento na janela de 7 dias. */
    for (let i = 0; i < 3; i++)
      c.db.prepare(`INSERT INTO responsible_play_events (id, user_id, tipo, detalhe, criado_em)
                    VALUES (?, ?, 'limite_aumento_pedido', '{}', ?)`)
        .run(`p${i}`, c.u.id, AGORA - i * 1000);

    /* `chasing`: stake subindo depois de perder, quatro vezes seguidas. */
    for (let i = 0; i < 5; i++) {
      c.db.prepare(
        `INSERT INTO rounds (id, status, round_seed_commit, engine_version, content_version,
                             betting_opens_at, betting_locks_at, environment)
         VALUES (?, 'encerrada', 'x', 'v', 'v', ?, ?, 'teste')`)
        .run(`rr${i}`, AGORA - (10 - i) * 60_000, AGORA);
      c.db.prepare(
        `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd,
                           status, payout, created_at, settled_at)
         VALUES (?, ?, ?, 0, 1, ?, 2.0, 'perdida', 0, ?, ?)`)
        .run(`bb${i}`, c.u.id, `rr${i}`, 10 + i * 10, AGORA - (10 - i) * 60_000, AGORA);
    }

    const sinais = sinaisDeRisco(c.db, { userId: c.u.id, agora: AGORA });
    ok(sinais.length >= 2,
      `o cenário acendeu ${sinais.length} sinal(is) (${sinais}) — com menos de dois ` +
      `este teste não consegue distinguir "um evento por sinal" de "um evento só"`);

    const evs = eventosDe(c.db, { nome: 'risk_signal_raised' });
    igual(evs.length, sinais.length,
      `${sinais.length} sinais acenderam e saíram ${evs.length} evento(s). ` +
      `Um evento com a lista dentro perde a contagem por tipo.`);
    const tipos = new Set(evs.map(e => JSON.parse(e.campos).signal_type));
    igual(tipos.size, sinais.length,
      `os eventos saíram com ${tipos.size} tipo(s) distinto(s) para ${sinais.length} ` +
      `sinais: ${[...tipos].join(', ')}`);
    for (const sinal of sinais)
      ok(tipos.has(sinal), `o sinal \`${sinal}\` acendeu e não tem evento próprio`);
  });

  s.teste('entrar em pausa grava o evento, com a janela', async () => {
    const c = cenario();
    const { pausar } = await import('../server/protecao.mjs');
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: AGORA });
    const evs = eventosDe(c.db, { nome: 'cooloff_started' });
    igual(evs.length, 1, 'a pausa não gerou evento');
    ok(JSON.parse(evs[0].campos).window,
      '`window` é obrigatório: sem a duração, o registro não diz por quanto tempo');
  });

  /* O TESTE QUE FALTAVA, E A SABOTAGEM S385 PROVOU.
     A varredura estática acha os nomes dentro do mapa `EQUIVALENTE_47` — e o
     mapa continua lá quando alguém remove a CHAMADA que o usa. Nome declarado
     e nome emitido são coisas diferentes, e só o comportamento distingue as
     duas. Vale para todo módulo que traduz por tabela. */
  s.teste('o limite bloqueado e a redução geram os eventos do §4.7', async () => {
    const c = cenario();
    const { definirLimite, registrarBloqueio } = await import('../server/limites.mjs');

    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 200, agora: AGORA });
    registrarBloqueio(c.db, { userId: c.u.id, contexto: 'aposta', agora: AGORA,
      veredito: { limite: 'max_loss_dia', usado: 210, teto: 200, voltaEm: AGORA + 3_600_000 } });

    /* `limit_set` sai por chamada direta; `limit_decrease_applied` e
       `limit_blocked_action` saem pelo mapa. Os três juntos cobrem os dois
       caminhos, e é por isso que os três estão aqui. */
    for (const nome of ['limit_set', 'limit_decrease_applied', 'limit_blocked_action']) {
      const evs = eventosDe(c.db, { nome });
      igual(evs.length, 1, `\`${nome}\` não foi emitido`);
      igual(evs[0].amostravel, 0, `\`${nome}\` saiu amostrável — o §4.7 proíbe em proteção`);
    }
    const bloq = JSON.parse(eventosDe(c.db, { nome: 'limit_blocked_action' })[0].campos);
    igual(bloq.limit_type, 'max_loss_dia', 'o evento não diz QUAL limite bloqueou');
    ok(bloq.action_blocked, '`action_blocked` é obrigatório (§4.7)');
  });

  /* O tempo de sessão tem evento PRÓPRIO, e ele é o único que responde "esta
     pessoa está jogando há tempo demais" — a pergunta do §28.5. */
  s.teste('o teto de sessão gera `session_limit_reached` além do bloqueio', async () => {
    const c = cenario();
    const { registrarBloqueio } = await import('../server/limites.mjs');
    registrarBloqueio(c.db, { userId: c.u.id, contexto: 'aposta', agora: AGORA,
      veredito: { limite: 'max_session_time', usado: 130, teto: 120, voltaEm: null } });
    igual(eventosDe(c.db, { nome: 'session_limit_reached' }).length, 1,
      '`session_limit_reached` não saiu');
    igual(eventosDe(c.db, { nome: 'limit_blocked_action' }).length, 1,
      'o bloqueio genérico sumiu — os dois eventos são fatos, e quem conta ' +
      'bloqueios não pode perder este');
  });

  s.teste('a barreira de idade registra a declaração e o veredito', async () => {
    const c = cenario();
    const evs = n => eventosDe(c.db, { nome: n }).length;
    /* A conta do cenário já nasceu com idade válida. */
    igual(evs('age_declaration_submitted'), 1, 'a declaração de idade não foi registrada');
    igual(evs('age_verification_passed'), 1, 'a aprovação não foi registrada');

    let barrou = false;
    try {
      cadastrar(c.db, { username: 'kid', email: 'kid@exemplo.test',
        senha: 'senha-longa-o-bastante-1', nascimento: '2015-01-01', agora: AGORA });
    } catch { barrou = true; }
    ok(barrou, 'o cenário não barrou o menor de idade');
    igual(evs('age_verification_failed'), 1,
      'a recusa por idade não gerou evento — sobra o denominador sem o numerador');
    igual(evs('age_declaration_submitted'), 2,
      'a declaração do barrado não foi contada: sem ela, "barramos N de quantos?" fica sem resposta');
  });

  /* TELEMETRIA NÃO PODE DERRUBAR A PROTEÇÃO. Se gravar o evento falhar, a
     pausa ainda tem que valer — o registro serve à proteção, não o contrário.
     A ordem certa é: decidir, executar, registrar. */
  s.teste('a proteção acontece mesmo que o registro falhe', async () => {
    const c = cenario();
    const { pausar, pausaAtiva } = await import('../server/protecao.mjs');
    /* Derruba a tabela de telemetria: qualquer `emitir` passa a lançar. */
    c.db.exec('DROP TABLE telemetry_events');
    let quebrou = null;
    try { pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: AGORA }); }
    catch (e) { quebrou = e; }
    ok(!quebrou,
      `a pausa quebrou porque o registro falhou: ${quebrou?.message}. ` +
      `O evento existe para PROVAR a proteção — não pode ser o que a impede.`);
    ok(pausaAtiva(c.db, c.u.id, AGORA), 'a pausa não ficou de pé');
  });

  return s;
}
