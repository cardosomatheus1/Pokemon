/* PAUSA, AUTOEXCLUSÃO E RISCO (F1.9, Spec §28.4 a §28.7).
 *
 * Fronteira: decide se uma conta pode agir, guarda pausas, propaga por pessoa,
 * fecha a torneira de marketing, mede os sete sinais e registra intervenção.
 * Não move dinheiro, não desenha tela, não serve HTTP.
 *
 * ── A DIFERENÇA PARA O F1.8, QUE É O DESENHO INTEIRO ───────────────────────
 *
 * O limite do §28.3 é do jogador e ele o move — para baixo na hora, para cima
 * com prazo. A autoexclusão do §28.4 **deixa de ser dele no instante em que
 * começa**:
 *
 *     "irreversível durante o período. Nenhum canal — suporte, admin,
 *      promoção — encurta autoexclusão."
 *
 * Em código isso é a mesma garantia do cooldown, pela mesma via: **não existe
 * função que encurte**. Este módulo não exporta `encerrarPausa`, e o teste
 * cobra a AUSÊNCIA — porque o F1.11 traz painel administrativo, e função
 * exportada é convite. Só o relógio termina uma pausa, e mesmo assim a volta
 * exige pedido.
 *
 * ── VALE POR PESSOA, NÃO POR CONTA ─────────────────────────────────────────
 *
 * O contorno mais usado do mundo é a segunda conta. Por isso a pausa consulta
 * o GRUPO de contas ligadas por sinal de identidade, e a ligação bloqueia nos
 * dois sentidos e nos dois tempos: ligar uma conta nova a uma conta excluída
 * bloqueia a nova na hora.
 *
 * O que este módulo NÃO faz é decidir o que é sinal de identidade. Ele recebe
 * a ligação pronta. Inventar aqui uma heurística de dispositivo ou documento
 * seria inventar política de identidade dentro de um módulo de proteção.
 *
 * ── OS SINAIS SÃO SOBRE A PRÓPRIA CONTA ────────────────────────────────────
 *
 * "A base é o comportamento da própria conta ao longo do tempo, não uma média
 * populacional — o objetivo é detectar mudança, não classificar perfil." É por
 * isso que `chasing` compara stake com a stake anterior DA MESMA CONTA, e não
 * com um patamar: quem sempre aposta alto não está perseguindo nada.
 */
import { randomUUID } from 'node:crypto';
import { ORDEM_CONSUMO } from '../engine/carteira.mjs';

export const TIPOS_PAUSA = ['cooloff', 'self_exclusion'];

/* As durações do §28.4, e só elas. `ms: null` é permanente — nulo e não um
   número grande, porque "3650 dias" é uma data, e data que chega é pausa que
   termina sozinha. */
export const DURACOES = {
  cooloff: [
    { id: '24h', ms: 24 * 60 * 60 * 1000 },
    { id: '72h', ms: 72 * 60 * 60 * 1000 },
    { id: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
  ],
  self_exclusion: [
    { id: '30d',        ms: 30 * 24 * 60 * 60 * 1000 },
    { id: '90d',        ms: 90 * 24 * 60 * 60 * 1000 },
    { id: '180d',       ms: 180 * 24 * 60 * 60 * 1000 },
    { id: 'permanente', ms: null },
  ],
};

/* O QUE A PAUSA FECHA. Lista e não `if`: ação nova que ninguém acrescentar aqui
   fica LIBERADA, e liberar por esquecimento é o modo de falha caro. O teste
   cobra a lista contra o §28.4 item por item. */
export const ACOES_BLOQUEADAS = [
  'apostar', 'stake_liga', 'comprar_pct', 'p2p_enviar', 'p2p_receber',
  'exchange', 'faucet',
];

/* O QUE ELA NÃO FECHA, e é decisão, não omissão: "o objetivo é interromper o
   loop econômico sem apagar o vínculo com o jogo — apagar a coleção
   transformaria a autoexclusão em punição e reduziria a adesão". */
export const ACOES_LIBERADAS = ['ver_colecao', 'ver_pokedex', 'ver_perfil',
                                'ver_historico', 'ver_carteira'];

export const ERRO_PROTECAO = {
  PAUSADO:    'conta_em_pausa',
  EM_VIGOR:   'pausa_em_vigor',
  TIPO:       'pausa_tipo_invalido',
  DURACAO:    'pausa_duracao_invalida',
  SEM_PEDIDO: 'reentrada_sem_pedido',
  NIVEL:      'intervencao_nivel_invalido',
  SINAL:      'sinal_invalido',
};

const erro = (codigo, mensagem, extra) =>
  Object.assign(new Error(mensagem), { codigo, ...extra });

const evento = (db, userId, tipo, detalhe, agora) =>
  db.prepare(`INSERT INTO responsible_play_events (id, user_id, tipo, detalhe, criado_em)
              VALUES (?,?,?,?,?)`)
    .run(randomUUID(), userId, tipo, JSON.stringify(detalhe), agora);

/* ── O GRUPO DE CONTAS DE UMA PESSOA ───────────────────────────────────────
 *
 * Fecho transitivo: se A liga com B e B liga com C, os três são a mesma pessoa
 * para efeito de proteção. Sem o fecho, a terceira conta contorna — e três
 * contas é o segundo passo óbvio de quem já deu o primeiro. */
export function contasLigadas(db, userId) {
  const vistos = new Set([userId]);
  const fila = [userId];
  const q = db.prepare(
    `SELECT CASE WHEN conta_a = ? THEN conta_b ELSE conta_a END AS outro
       FROM identidade_ligada WHERE conta_a = ? OR conta_b = ?`);
  while (fila.length) {
    const atual = fila.pop();
    for (const { outro } of q.all(atual, atual, atual))
      if (!vistos.has(outro)) { vistos.add(outro); fila.push(outro); }
  }
  vistos.delete(userId);
  return [...vistos];
}

export function ligarContas(db, { userId, outroId, sinal, agora = Date.now() }) {
  if (userId === outroId) throw erro(ERRO_PROTECAO.SINAL, 'uma conta não se liga a si mesma');
  const [a, b] = [userId, outroId].sort();     // ordem canônica: a ligação não tem direção
  db.prepare(`INSERT INTO identidade_ligada (conta_a, conta_b, sinal, criado_em)
              VALUES (?,?,?,?)
              ON CONFLICT (conta_a, conta_b, sinal) DO NOTHING`).run(a, b, sinal, agora);
  /* A LIGAÇÃO É AVALIADA NA HORA: se a outra ponta já está excluída, esta conta
     passa a estar. Propagar só no momento da exclusão deixaria a conta criada
     DEPOIS passar livre — que é justamente o contorno. */
  evento(db, userId, 'identidade_ligada', { outroId, sinal }, agora);
  return { a, b, sinal };
}

/* ── A PAUSA ───────────────────────────────────────────────────────────────*/

export function pausar(db, { userId, tipo, duracao, agora = Date.now(), origem = 'player' }) {
  if (!TIPOS_PAUSA.includes(tipo))
    throw erro(ERRO_PROTECAO.TIPO, `tipo de pausa desconhecido: ${String(tipo)}`);
  const d = DURACOES[tipo].find(x => x.id === duracao);
  if (!d) throw erro(ERRO_PROTECAO.DURACAO,
    `duração "${String(duracao)}" não existe para ${tipo}`);

  const ate = d.ms === null ? null : agora + d.ms;
  db.prepare(`INSERT INTO self_exclusions (id, user_id, de, ate, motivo, criado_em)
              VALUES (?,?,?,?,?,?)`)
    .run(randomUUID(), userId, agora, ate, `${tipo}:${duracao}:${origem}`, agora);
  evento(db, userId, tipo === 'cooloff' ? 'cooloff_iniciado' : 'autoexclusao_iniciada',
         { duracao, ate, origem }, agora);

  /* NENHUMA OFERTA SAI DAQUI, e a ausência é o teste. Um funil de retenção
     otimizado poria a oferta exatamente neste ponto — é o momento de maior
     intenção de saída, que é onde a conversão é melhor. A Spec escreve a
     proibição porque o incentivo do produto aponta para o outro lado. */
  return { tipo, duracao, de: agora, ate };
}

/* A PAUSA VIGENTE, considerando o GRUPO. Devolve a que termina MAIS TARDE, e é
   isso que impede o encurtamento pela porta do produto: pedir um cool-off de
   24 h por cima de uma autoexclusão de 180 dias não encurta nada, porque a
   consulta não pergunta "qual é a mais recente". */
export function pausaAtiva(db, userId, agora = Date.now()) {
  const grupo = [userId, ...contasLigadas(db, userId)];
  /* UMA CONSULTA POR CONTA, e não um `IN (?,?,?)` montado por interpolação.
     O grupo tem o tamanho de uma pessoa — duas, três contas —, e a varredura
     estática do F1.2 recusa qualquer `${` dentro de um comando SQL. Ela está
     certa: o dia em que alguém interpolar um valor em vez de um `?` aqui, o
     padrão que reprovaria já teria sido afrouxado para deixar isto passar. */
  const q = db.prepare(
    `SELECT motivo, de, ate, reentrada_em FROM self_exclusions
      WHERE user_id = ? AND de <= ? AND reentrada_em IS NULL`);
  const linhas = grupo.flatMap(id => q.all(id, agora));

  /* AS DUAS ESPÉCIES TERMINAM DE FORMAS DIFERENTES, e confundi-las é o defeito:
     o cool-off é "reversível apenas pelo decurso do prazo" e cai sozinho; a
     autoexclusão exige que a volta seja PEDIDA — "ao expirar, a reentrada é
     ativa, nunca automática". Uma autoexclusão vencida continua bloqueando até
     alguém pedir para voltar, e isso é o desenho, não um esquecimento. */
  const vigentes = linhas.filter(r => {
    const tipo = r.motivo.split(':')[0];
    if (r.ate === null) return true;                       // permanente
    if (agora < r.ate) return true;                        // dentro do prazo
    return tipo === 'self_exclusion';                      // vencida, à espera do pedido
  });
  if (vigentes.length === 0) return null;

  /* A QUE TERMINA MAIS TARDE, e é isso que fecha o encurtamento pela porta do
     produto: pedir um cool-off de 24 h por cima de uma autoexclusão de 180 dias
     não encurta nada, porque a consulta não pergunta "qual é a mais recente". */
  vigentes.sort((x, y) => (y.ate === null) - (x.ate === null) || y.ate - x.ate);
  const r = vigentes[0];
  const [tipo, duracao] = r.motivo.split(':');
  return { tipo, duracao, de: r.de, ate: r.ate,
           vencida: r.ate !== null && agora >= r.ate };
}

/* ── PODE AGIR? ────────────────────────────────────────────────────────────*/

export function podeAgir(db, { userId, acao, agora = Date.now() }) {
  if (ACOES_LIBERADAS.includes(acao)) return { ok: true };
  const p = pausaAtiva(db, userId, agora);
  if (!p) return { ok: true };
  if (!ACOES_BLOQUEADAS.includes(acao))
    /* AÇÃO DESCONHECIDA DURANTE PAUSA É RECUSADA, e não liberada. Ação nova que
       ninguém classificou é ação nova que ninguém pensou — e o lado seguro de
       errar, aqui, é o lado que não deixa o jogador voltar a gastar. */
    return { ok: false, motivo: 'acao_nao_classificada', pausa: p };
  return { ok: false, motivo: p.tipo, pausa: p,
           voltaEm: p.ate, reentradaAtiva: true };
}

/* ── A REENTRADA É ATIVA ───────────────────────────────────────────────────
 *
 * "Ao expirar, a reentrada é ativa (o jogador precisa pedir), nunca
 * automática." Por isso `pausaAtiva` também exige `reentrada_em`: sem essa
 * coluna a pausa cairia sozinha ao vencer o prazo, e o produto teria decidido
 * pelo jogador que ele quer voltar. */
export function pedirReentrada(db, { userId, agora = Date.now() }) {
  const p = db.prepare(
    `SELECT id, ate FROM self_exclusions
      WHERE user_id = ? AND reentrada_em IS NULL AND ate IS NOT NULL
      ORDER BY ate DESC LIMIT 1`).get(userId);
  if (!p) throw erro(ERRO_PROTECAO.SEM_PEDIDO, 'não há pausa a encerrar');
  db.prepare(`UPDATE self_exclusions SET reentrada_pedida_em = ? WHERE id = ?`)
    .run(agora, p.id);
  evento(db, userId, 'reentrada_pedida', { pausaId: p.id }, agora);
  return { pedidoEm: agora, liberaEm: p.ate };
}

export function concederReentrada(db, { userId, agora = Date.now() }) {
  const p = db.prepare(
    `SELECT id, ate, reentrada_pedida_em FROM self_exclusions
      WHERE user_id = ? AND reentrada_em IS NULL
      ORDER BY (ate IS NULL) DESC, ate DESC LIMIT 1`).get(userId);
  if (!p) throw erro(ERRO_PROTECAO.SEM_PEDIDO, 'não há pausa a encerrar');
  /* O ÚNICO PORTÃO QUE IMPORTA: nem esta função encurta. Ela conclui uma pausa
     que o RELÓGIO já terminou; enquanto o prazo corre, ela recusa — e é por
     isso que ela pode existir sem virar a porta dos fundos que o §28.4 fecha. */
  if (p.ate === null || agora < p.ate)
    throw erro(ERRO_PROTECAO.EM_VIGOR,
      p.ate === null ? 'autoexclusão permanente não tem reentrada'
                     : `a pausa vale até ${new Date(p.ate).toISOString()}`,
      { ate: p.ate });
  if (!p.reentrada_pedida_em)
    throw erro(ERRO_PROTECAO.SEM_PEDIDO, 'a reentrada precisa ser pedida pelo jogador');
  db.prepare(`UPDATE self_exclusions SET reentrada_em = ? WHERE id = ?`).run(agora, p.id);
  evento(db, userId, 'reentrada_concedida', { pausaId: p.id }, agora);
  return { em: agora };
}

/* ── MARKETING ─────────────────────────────────────────────────────────────
 *
 * "Nenhuma comunicação de marketing durante o período, em nenhum canal —
 * verificado por teste no serviço de notificação, não por convenção."
 *
 * Por isso a conferência mora AQUI e o envio passa por esta função: convenção é
 * o que falha no dia em que alguém escreve o quarto canal. */
export const podeReceberMarketing = (db, userId, agora = Date.now()) =>
  pausaAtiva(db, userId, agora) === null;

export function tentarEnviarMarketing(db, { userId, canal, campanha, agora = Date.now() }) {
  if (!podeReceberMarketing(db, userId, agora)) {
    evento(db, userId, 'marketing_bloqueado', { canal, campanha }, agora);
    return { enviado: false, motivo: 'conta_em_pausa' };
  }
  evento(db, userId, 'marketing_enviado', { canal, campanha }, agora);
  return { enviado: true };
}

/* ── REALITY CHECK (§28.5) ─────────────────────────────────────────────────*/

export const INTERVALO_REALITY_CHECK_MS = 30 * 60 * 1000;   // parâmetro do §28.5
const GAP_SESSAO_MS = 30 * 60 * 1000;

/* O início da sessão e o líquido dela. A sessão é a mesma noção do F1.8 —
   atividade contígua — e o líquido sai da atividade de perda, que é onde o
   settlement já escreve `aposta - retorno`. Recontar a partir do ledger daria
   um segundo número para a mesma pergunta. */
function sessao(db, userId, agora) {
  const linhas = db.prepare(
    `SELECT criado_em, tipo, valor FROM player_activity
      WHERE user_id = ? AND criado_em <= ? ORDER BY criado_em DESC LIMIT 1000`)
    .all(userId, agora);
  if (linhas.length === 0) return null;
  let inicio = linhas[0].criado_em, i = 1;
  for (; i < linhas.length; i++) {
    if (inicio - linhas[i].criado_em > GAP_SESSAO_MS) break;
    inicio = linhas[i].criado_em;
  }
  const daSessao = linhas.slice(0, i);
  const perdido = daSessao.filter(l => l.tipo === 'perda')
                          .reduce((s, l) => s + l.valor, 0);
  return { inicio, duracaoMs: agora - inicio, liquidoDaSessao: -perdido,
           rodadas: daSessao.filter(l => l.tipo === 'rodada').length };
}

export function realityCheck(db, { userId, agora = Date.now() }) {
  const s = sessao(db, userId, agora);
  if (!s) return { mostrar: false };
  const ultimo = db.prepare(
    `SELECT MAX(criado_em) AS q FROM responsible_play_events
      WHERE user_id = ? AND tipo = 'reality_check_confirmado' AND criado_em >= ?`)
    .get(userId, s.inicio).q ?? s.inicio;
  return {
    mostrar: agora - ultimo >= INTERVALO_REALITY_CHECK_MS,
    duracaoMs: s.duracaoMs,
    /* OS DOIS NÚMEROS QUE O §28.5 EXIGE, juntos: tempo de sessão E resultado
       líquido. Tempo sozinho é um relógio; líquido sozinho é um extrato. É a
       soma dos dois que responde "vale a pena continuar?". */
    liquidoDaSessao: s.liquidoDaSessao,
    rodadas: s.rodadas,
  };
}

export function confirmarRealityCheck(db, { userId, agora = Date.now() }) {
  const s = sessao(db, userId, agora);
  evento(db, userId, 'reality_check_confirmado',
         { duracaoMs: s?.duracaoMs ?? 0, liquidoDaSessao: s?.liquidoDaSessao ?? 0 }, agora);
  return { em: agora };
}

/* ── OS SETE SINAIS (§28.6) ────────────────────────────────────────────────*/

export const SINAIS = ['chasing', 'velocity', 'session_length', 'depth',
                       'recovery_deposit', 'odd_hour', 'limit_pressure'];

export const ESCALA_INTERVENCAO = [
  'informacao_passiva',
  'reality_check_antecipado',
  'sugestao_de_limite',
  'cooloff_oferecido',
  'restricao_temporaria',
];

/* Os limiares. São CHUTE EDUCADO, e está registrado como tal na L-011: até
   haver coorte não há de onde calibrá-los. Ficam nomeados e num lugar só para
   que a calibragem seja uma linha e não uma caçada. */
export const LIMIARES = {
  chasing_sequencia: 3,        // aumentos de stake seguidos, cada um após perda
  velocity_fator: 2,           // rodadas/hora acima do dobro da própria banda
  sessao_longa_ms: 3 * 60 * 60 * 1000,
  depth_fracao: 0.5,           // stake acima de metade do saldo disponível
  limit_pressure_pedidos: 3,   // pedidos de aumento numa janela de 7 dias
};

const JANELA_SINAL_MS = 7 * 24 * 60 * 60 * 1000;

export function sinaisDeRisco(db, { userId, agora = Date.now() }) {
  const desde = agora - JANELA_SINAL_MS;
  const ligados = [];

  /* `limit_pressure` — o mais barato de todos, porque o F1.8 já grava o evento
     a cada pedido de aumento. Sinal que se lê de um registro que já existe é
     sinal que não pode dessincronizar do comportamento. */
  const pedidos = db.prepare(
    `SELECT COUNT(*) AS n FROM responsible_play_events
      WHERE user_id = ? AND tipo IN ('limite_aumento_pedido','limite_remocao_pedida')
        AND criado_em >= ?`).get(userId, desde).n;
  if (pedidos >= LIMIARES.limit_pressure_pedidos) ligados.push('limit_pressure');

  const apostas = db.prepare(
    `SELECT stake, created_at, payout, status FROM bets
      WHERE user_id = ? AND created_at >= ? ORDER BY created_at`).all(userId, desde);

  /* `chasing` — AUMENTO DE STAKE APÓS PERDA, EM SEQUÊNCIA. As duas condições
     juntas, e é a conjunção que separa perseguição de estilo: quem aposta 500
     cinco vezes seguidas não aumentou nada, e um limiar sobre o VALOR o
     acusaria. O §28.6 é explícito — "detectar mudança, não classificar perfil". */
  let seguidos = 0;
  for (let i = 1; i < apostas.length; i++) {
    const perdeuAntes = apostas[i - 1].status === 'perdida'
      || (apostas[i - 1].payout ?? 0) < apostas[i - 1].stake;
    seguidos = perdeuAntes && apostas[i].stake > apostas[i - 1].stake ? seguidos + 1 : 0;
    if (seguidos >= LIMIARES.chasing_sequencia) { ligados.push('chasing'); break; }
  }

  const s = sessao(db, userId, agora);
  if (s && s.duracaoMs >= LIMIARES.sessao_longa_ms) ligados.push('session_length');

  /* `velocity` — a banda é a DA PRÓPRIA CONTA: rodadas/hora desta sessão contra
     a média por sessão das semanas anteriores. Sem histórico não há banda, e
     sem banda não há sinal: acender no primeiro dia seria classificar perfil. */
  if (s && s.duracaoMs > 0) {
    const porHora = s.rodadas / (s.duracaoMs / 3600000);
    const historico = db.prepare(
      `SELECT COUNT(*) AS n, MIN(criado_em) AS ini, MAX(criado_em) AS fim
         FROM player_activity WHERE user_id = ? AND tipo = 'rodada' AND criado_em < ?`)
      .get(userId, s.inicio);
    if (historico.n >= 20 && historico.fim > historico.ini) {
      const banda = historico.n / ((historico.fim - historico.ini) / 3600000);
      if (porHora > banda * LIMIARES.velocity_fator) ligados.push('velocity');
    }
  }

  /* `depth` — stake como fração do saldo DISPONÍVEL no momento da aposta. Usa a
     carteira de hoje como aproximação; o número exato da época exigiria
     reconstruir o saldo do ledger, e isso é trabalho do painel do F1.11. */
  const disponivel = db.prepare(`SELECT bucket, saldo FROM carteiras WHERE user_id = ?`)
    .all(userId)
    .filter(c => ORDEM_CONSUMO.includes(c.bucket))
    .reduce((t, c) => t + c.saldo, 0);
  const maior = apostas.reduce((m, a) => Math.max(m, a.stake), 0);
  if (disponivel > 0 && maior > disponivel * LIMIARES.depth_fracao) ligados.push('depth');

  /* `recovery_deposit` e `odd_hour` existem na lista e ainda não têm de onde
     medir: compra de PC-T não existe até o gate do §25.1, e horário habitual
     precisa de semanas de histórico que nenhuma conta tem hoje. Estão em
     `SINAIS` de propósito — a lista é o contrato do §28.6 — e a medição está
     registrada na LACUNA com bloco dono. Fingir que medem seria pior: um sinal
     que nunca acende parece calmaria. */

  return [...new Set(ligados)];
}

export function intervir(db, { userId, nivel, sinal, desfecho = 'aplicada',
                               agora = Date.now() }) {
  if (!ESCALA_INTERVENCAO.includes(nivel))
    throw erro(ERRO_PROTECAO.NIVEL, `nível fora da escala do §28.6: ${String(nivel)}`);
  if (!SINAIS.includes(sinal))
    throw erro(ERRO_PROTECAO.SINAL, `sinal fora do §28.6: ${String(sinal)}`);
  const intervencaoId = randomUUID();
  /* OS TRÊS CAMPOS SÃO OBRIGATÓRIOS JUNTOS: id, sinal que disparou e desfecho.
     "Sem esse registro não há como demonstrar depois que o sistema agiu — e é o
     registro, não a intenção, que vale numa revisão." */
  evento(db, userId, 'intervencao', { intervencaoId, nivel, sinal, desfecho }, agora);
  return { intervencaoId, nivel, sinal, desfecho };
}
