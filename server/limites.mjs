/* LIMITES DEFINIDOS PELO JOGADOR (F1.8, Spec §28.3).
 *
 * Fronteira: guarda os limites, aplica a assimetria de mudança, e responde
 * "esta ação cabe?". Não move dinheiro, não abre rodada, não serve HTTP — quem
 * chama é `aposta.mjs`, no mesmo caminho que aceita a aposta.
 *
 * ── A ASSIMETRIA É O ARQUIVO INTEIRO ───────────────────────────────────────
 *
 *     reduzir limite  → efeito imediato
 *     aumentar limite → pedido registrado + cooldown de 24 h + confirmação ativa
 *     remover limite  → tratado como aumento
 *
 * Sem ela o limite não protege ninguém: o jogador em perseguição de perda
 * simplesmente o eleva no momento em que ele deveria segurar. O cooldown existe
 * para SEPARAR A DECISÃO DO IMPULSO, e a Spec proíbe encurtá-lo por suporte,
 * promoção ou evento.
 *
 * Em código, "não pode ser encurtado" quer dizer uma coisa só: **não existe por
 * onde recebê-lo**. `COOLDOWN_MS` é constante do módulo e nenhuma função aceita
 * prazo de fora. Aceitar um `cooldownMs` opcional "só para teste" seria o mesmo
 * que aceitar de suporte — o campo não sabe quem o preencheu.
 *
 * A terceira linha é a que mais parece detalhe e é a que fecha a porta: sem
 * "remover é aumento", o caminho para burlar o cooldown é remover e recriar.
 *
 * ── E A RECUSA FALA ────────────────────────────────────────────────────────
 *
 * A Spec pede QUAL limite, QUANTO falta e QUANDO volta. Um `false` seco
 * satisfaria a regra de negócio e falharia a de proteção, que é a que importa
 * aqui — "você atingiu seu limite" sem prazo é uma parede sem porta.
 *
 * ── PERDA É LÍQUIDA, E A JANELA É CALENDÁRIO ───────────────────────────────
 *
 * `max_loss` conta `apostado - devolvido`, não volume: quem apostou 1000 e
 * recebeu 950 perdeu 50. Contar volume bloquearia o jogador cauteloso e
 * deixaria passar o que perde muito em poucas apostas — o inverso do objetivo.
 *
 * A janela é de CALENDÁRIO (UTC), não deslizante. Com janela deslizante o
 * "quando volta" vira uma resposta diferente a cada minuto e não dá para
 * escrever na tela; com calendário é uma data, e o jogador consegue planejar.
 */
import { randomUUID } from 'node:crypto';
import { TIPOS_LIMITE } from './banco.mjs';

export { TIPOS_LIMITE };

/* Vinte e quatro horas, e nada as encurta. Ver o cabeçalho. */
export const COOLDOWN_MS = 24 * 60 * 60 * 1000;

/* O silêncio que separa duas sessões. Sessão é atividade contígua: sem um corte
   declarado, "tempo de sessão" viraria "tempo desde o cadastro". */
export const GAP_SESSAO_MS = 30 * 60 * 1000;

export const ERRO_LIMITE = {
  BLOQUEADO:  'limite_bloqueado',
  COOLDOWN:   'limite_em_cooldown',
  TIPO:       'limite_tipo_invalido',
  VALOR:      'limite_valor_invalido',
  SEM_PEDIDO: 'limite_sem_pedido',
};

/* A janela de cada limite. Fica numa tabela e não espalhada em `if`: limite
   novo que esqueça a janela some da avaliação sem quebrar nada, e essa é a
   classe de erro que passa verde. */
const JANELA = {
  max_stake_per_round: 'rodada',
  max_loss_dia:        'dia',
  max_loss_semana:     'semana',
  max_loss_mes:        'mes',
  max_rounds_dia:      'dia',
  max_session_time:    'sessao',
};

const erro = (codigo, mensagem, extra = {}) =>
  Object.assign(new Error(mensagem), { codigo, ...extra });

/* ── AS JANELAS DE CALENDÁRIO, EM UTC ──────────────────────────────────────
 *
 * UTC e não fuso do jogador porque o fuso é declarado pelo cliente, e limite
 * que depende de dado do cliente é limite que se contorna mudando o relógio.
 * Quando houver fuso confiável na conta, isto vira parâmetro — e é uma decisão,
 * não um detalhe. */
function inicioDaJanela(janela, agora) {
  const d = new Date(agora);
  if (janela === 'dia')
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (janela === 'mes')
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  if (janela === 'semana') {
    const dia = (d.getUTCDay() + 6) % 7;              // segunda = 0
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dia);
  }
  return null;                                        // rodada e sessão não são calendário
}

function fimDaJanela(janela, agora) {
  const d = new Date(inicioDaJanela(janela, agora));
  if (janela === 'dia')    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  if (janela === 'semana') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7);
  if (janela === 'mes')    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return null;
}

/* ── LEITURA ───────────────────────────────────────────────────────────────*/

/* O limite de cada tipo VIGENTE neste instante: a linha mais recente que já
   passou a valer. Linha com `valor` nulo é remoção confirmada, e some do mapa —
   "sem limite" é ausência, não zero. */
export function limitesDe(db, userId, agora = Date.now()) {
  const linhas = db.prepare(
    `SELECT tipo, valor FROM player_limits pl
      WHERE user_id = ? AND vigente_em <= ?
        AND vigente_em = (SELECT MAX(vigente_em) FROM player_limits
                           WHERE user_id = pl.user_id AND tipo = pl.tipo AND vigente_em <= ?)`)
    .all(userId, agora, agora);
  const fora = {};
  for (const l of linhas) if (l.valor !== null) fora[l.tipo] = l.valor;
  return fora;
}

/* Os pedidos de aumento pendentes, com o prazo de cada um. É o que a tela mostra
   como "seu pedido fica disponível em ..." — pedido invisível é pedido que o
   jogador refaz, e refazer é justamente o que não pode encurtar nada. */
export function pedidosDe(db, userId) {
  return db.prepare(
    `SELECT tipo, valor, pedido_em AS pedidoEm, efetivo_em AS efetivoEm
       FROM limit_requests WHERE user_id = ?`).all(userId);
}

const pedido = (db, userId, tipo) => db.prepare(
  `SELECT valor, pedido_em AS pedidoEm, efetivo_em AS efetivoEm
     FROM limit_requests WHERE user_id = ? AND tipo = ?`).get(userId, tipo);

/* ── ESCRITA: A ASSIMETRIA ─────────────────────────────────────────────────*/

/* `null` é "sem limite", e sem limite é o valor MAIS permissivo que existe.
   Tratá-lo como zero — que é o que uma comparação numérica ingênua faria —
   inverteria a regra e faria remover valer na hora. */
const permissividade = v => (v === null || v === undefined ? Infinity : v);

function validar(tipo, valor) {
  if (!TIPOS_LIMITE.includes(tipo))
    throw erro(ERRO_LIMITE.TIPO, `limite desconhecido: ${String(tipo)}`);
  if (valor === null) return;                          // remoção
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0)
    throw erro(ERRO_LIMITE.VALOR, `valor de limite inválido: ${String(valor)}`);
}

function registrarEvento(db, userId, tipo, detalhe, agora) {
  db.prepare(`INSERT INTO responsible_play_events (id, user_id, tipo, detalhe, criado_em)
              VALUES (?,?,?,?,?)`)
    .run(randomUUID(), userId, tipo, JSON.stringify(detalhe), agora);
}

function gravarVigente(db, userId, tipo, valor, agora) {
  /* `ON CONFLICT` porque duas mudanças no MESMO milissegundo são normais — o
     jogador ajusta dois limites na mesma tela, e o teste faz isso. A última
     vence, que é o que ele acabou de pedir. */
  db.prepare(
    `INSERT INTO player_limits (user_id, tipo, valor, vigente_em, criado_em)
     VALUES (?,?,?,?,?)
     ON CONFLICT (user_id, tipo, vigente_em) DO UPDATE
       SET valor = excluded.valor, criado_em = excluded.criado_em`)
    .run(userId, tipo, valor, agora, agora);
}

/* A ASSINATURA NÃO TEM PRAZO, E ISSO É A GARANTIA.
 *
 * Note que não há `...resto`: um objeto com `cooldownMs` chega e é ignorado
 * porque nada aqui o lê. É deliberado que a função não recuse o campo — recusar
 * exigiria conhecê-lo, e conhecer é o primeiro passo para alguém honrá-lo. */
export function definirLimite(db, { userId, tipo, valor, agora = Date.now() }) {
  validar(tipo, valor);

  const atual = limitesDe(db, userId, agora)[tipo];
  const aumento = permissividade(valor) > permissividade(atual);

  if (!aumento) {
    /* REDUZIR VALE AGORA. E cancela o pedido de aumento pendente: quem acabou
       de apertar o próprio limite mudou de ideia sobre afrouxá-lo, e deixar o
       pedido vivo devolveria o afrouxamento 24 h depois, num momento em que a
       decisão de hoje já não está presente. */
    gravarVigente(db, userId, tipo, valor, agora);
    db.prepare(`DELETE FROM limit_requests WHERE user_id = ? AND tipo = ?`).run(userId, tipo);
    registrarEvento(db, userId, 'limite_reduzido', { tipo, de: atual ?? null, para: valor }, agora);
    return { tipo, valor, vigente: true, efetivoEm: agora };
  }

  /* AUMENTAR VIRA PEDIDO. O prazo é do PEDIDO e não do último clique: repetir o
     mesmo pedido devolve o MESMO prazo. Se reiniciasse, insistir castigaria;
     se encurtasse, insistir burlaria. Um pedido DIFERENTE é outra decisão, e
     começa outro prazo — senão bastaria pedir pouco, esperar 23 h e pedir muito. */
  const pend = pedido(db, userId, tipo);
  if (pend && permissividade(pend.valor) === permissividade(valor)) {
    registrarEvento(db, userId, 'limite_aumento_repedido', { tipo, valor }, agora);
    return { tipo, valor, vigente: false, efetivoEm: pend.efetivoEm, pedidoEm: pend.pedidoEm };
  }

  const efetivoEm = agora + COOLDOWN_MS;
  db.prepare(
    `INSERT INTO limit_requests (user_id, tipo, valor, pedido_em, efetivo_em)
     VALUES (?,?,?,?,?)
     ON CONFLICT (user_id, tipo) DO UPDATE
       SET valor = excluded.valor, pedido_em = excluded.pedido_em,
           efetivo_em = excluded.efetivo_em`)
    .run(userId, tipo, valor, agora, efetivoEm);
  registrarEvento(db, userId,
    valor === null ? 'limite_remocao_pedida' : 'limite_aumento_pedido',
    { tipo, de: atual ?? null, para: valor, efetivoEm }, agora);
  return { tipo, valor, vigente: false, efetivoEm, pedidoEm: agora };
}

/* A CONFIRMAÇÃO ATIVA. O prazo sozinho não basta, e a diferença é o bloco
   inteiro: quem pediu por impulso não volta 24 h depois para confirmar. Um
   aumento que entra sozinho ao vencer o prazo apaga exatamente essa diferença,
   e o cooldown vira um atraso em vez de uma decisão. */
export function confirmarAumento(db, { userId, tipo, agora = Date.now() }) {
  if (!TIPOS_LIMITE.includes(tipo))
    throw erro(ERRO_LIMITE.TIPO, `limite desconhecido: ${String(tipo)}`);
  const pend = pedido(db, userId, tipo);
  if (!pend) throw erro(ERRO_LIMITE.SEM_PEDIDO, 'não há pedido de aumento para confirmar');
  if (agora < pend.efetivoEm)
    throw erro(ERRO_LIMITE.COOLDOWN,
      `este pedido fica disponível em ${new Date(pend.efetivoEm).toISOString()}`,
      { efetivoEm: pend.efetivoEm, faltamMs: pend.efetivoEm - agora });

  gravarVigente(db, userId, tipo, pend.valor, agora);
  db.prepare(`DELETE FROM limit_requests WHERE user_id = ? AND tipo = ?`).run(userId, tipo);
  registrarEvento(db, userId, 'limite_aumento_confirmado', { tipo, valor: pend.valor }, agora);
  return { tipo, valor: pend.valor, vigente: true, efetivoEm: agora };
}

/* ── O QUE OS LIMITES MEDEM ────────────────────────────────────────────────*/

const inserirAtividade = (db, userId, tipo, valor, agora) =>
  db.prepare(`INSERT INTO player_activity (id, user_id, tipo, valor, criado_em)
              VALUES (?,?,?,?,?)`).run(randomUUID(), userId, tipo, valor, agora);

/* Perda LÍQUIDA: `valor` positivo é dinheiro que saiu, negativo é retorno. O
   settlement lança `aposta - retorno` de uma vez; um lançamento por perna
   também fecha, e a soma é a mesma. */
export const registrarPerda = (db, { userId, valor, agora = Date.now() }) =>
  inserirAtividade(db, userId, 'perda', valor, agora);

export const registrarRodada = (db, { userId, agora = Date.now() }) =>
  inserirAtividade(db, userId, 'rodada', 1, agora);

const somaNaJanela = (db, userId, tipo, janela, agora) => db.prepare(
  `SELECT COALESCE(SUM(valor), 0) AS s FROM player_activity
    WHERE user_id = ? AND tipo = ? AND criado_em >= ? AND criado_em < ?`)
  .get(userId, tipo, inicioDaJanela(janela, agora), fimDaJanela(janela, agora)).s;

/* O início da SESSÃO atual: caminha para trás pela atividade até achar um
   silêncio maior que `GAP_SESSAO_MS`. Sem atividade, não há sessão aberta —
   e um jogador que acabou de entrar não pode estar acima do tempo de sessão. */
function sessaoAtual(db, userId, agora) {
  const linhas = db.prepare(
    `SELECT criado_em FROM player_activity WHERE user_id = ? AND criado_em <= ?
      ORDER BY criado_em DESC LIMIT 500`).all(userId, agora);
  if (linhas.length === 0) return null;
  let inicio = linhas[0].criado_em, ultima = linhas[0].criado_em;
  for (let i = 1; i < linhas.length; i++) {
    if (inicio - linhas[i].criado_em > GAP_SESSAO_MS) break;
    inicio = linhas[i].criado_em;
  }
  return { inicio, ultima, duracaoMs: agora - inicio };
}

/* ── Q9: UM EVENTO POR BLOQUEIO, E SEM AMOSTRAGEM ─────────────────────────
 *
 * A saída do F1.8 pede "evento de telemetria por bloqueio", e o §17 pede o
 * bloco de proteção SEM AMOSTRAGEM. Aqui isso não é uma promessa de
 * configuração: o evento é uma linha gravada na transação da própria recusa, e
 * não há caminho que a pule — amostrar exigiria acrescentar um `if`, que
 * apareceria no diff.
 *
 * Vai para `responsible_play_events` e não para um coletor: o bloqueio é
 * histórico do jogador, não métrica de produto. É dele que o §28.6 lê
 * `limit_pressure`, e métrica que vive só no painel não volta para quem ela
 * deveria proteger. */
export function registrarBloqueio(db, { userId, veredito, contexto, agora = Date.now() }) {
  registrarEvento(db, userId, 'limite_bloqueou',
    { limite: veredito.limite, usado: veredito.usado, teto: veredito.teto,
      voltaEm: veredito.voltaEm ?? null, contexto }, agora);
  return veredito;
}

/* ── A AVALIAÇÃO ───────────────────────────────────────────────────────────
 *
 * Devolve `{ ok: true }` ou a recusa COMPLETA: qual limite, quanto foi usado
 * contra quanto, e quando a janela vira. Nunca um `false` seco. */
const passou = { ok: true };

const bloqueio = (limite, usado, teto, voltaEm, comoLiberar) => ({
  ok: false, limite, usado, teto, restante: Math.max(0, teto - usado), voltaEm, comoLiberar,
});

function checarPerda(db, userId, limites, agora) {
  for (const tipo of ['max_loss_dia', 'max_loss_semana', 'max_loss_mes']) {
    const teto = limites[tipo];
    if (teto === undefined) continue;
    const perdido = Math.max(0, somaNaJanela(db, userId, 'perda', JANELA[tipo], agora));
    if (perdido >= teto)
      return bloqueio(tipo, perdido, teto, fimDaJanela(JANELA[tipo], agora), 'a janela vira');
  }
  return null;
}

function checarSessao(db, userId, limites, agora) {
  const teto = limites.max_session_time;              // em MINUTOS
  if (teto === undefined) return null;
  const s = sessaoAtual(db, userId, agora);
  if (!s) return null;
  const usados = Math.floor(s.duracaoMs / 60000);
  if (usados >= teto)
    /* A SESSÃO NÃO VIRA SOZINHA: ela termina quando o jogador para. Por isso o
       "quando volta" é o silêncio, e não uma meia-noite. Dizer meia-noite aqui
       seria mentir com precisão. */
    return bloqueio('max_session_time', usados, teto, s.ultima + GAP_SESSAO_MS,
                    'a sessão termina após um intervalo sem jogar');
  return null;
}

/* Cabe apostar `valor` agora? Confere o teto por rodada, as três janelas de
   perda e o tempo de sessão — nesta ordem, do mais imediato ao mais amplo, para
   que a recusa nomeie o limite que o jogador acabou de encostar. */
export function avaliarAposta(db, { userId, valor, agora = Date.now() }) {
  const limites = limitesDe(db, userId, agora);

  const porRodada = limites.max_stake_per_round;
  if (porRodada !== undefined && typeof valor === 'number' && valor > porRodada)
    /* SEM `voltaEm`, e é honesto: este limite não é janela, e esperar não
       libera nada. O que libera é apostar menos, e é isso que a recusa diz. */
    return bloqueio('max_stake_per_round', valor, porRodada, null,
                    `aposte no máximo ${porRodada} por rodada`);

  return checarPerda(db, userId, limites, agora)
      ?? checarSessao(db, userId, limites, agora)
      ?? passou;
}

/* Cabe entrar em mais uma rodada? Separada da aposta porque a frequência é
   exposição por si — o §28.3 diz "controla exposição por frequência, não por
   valor", e um jogador pode encostar aqui sem ter encostado em nenhum valor. */
export function avaliarRodada(db, { userId, agora = Date.now() }) {
  const limites = limitesDe(db, userId, agora);
  const teto = limites.max_rounds_dia;
  if (teto !== undefined) {
    const jogadas = somaNaJanela(db, userId, 'rodada', 'dia', agora);
    if (jogadas >= teto)
      return bloqueio('max_rounds_dia', jogadas, teto, fimDaJanela('dia', agora),
                      'a janela vira');
  }
  return checarPerda(db, userId, limites, agora)
      ?? checarSessao(db, userId, limites, agora)
      ?? passou;
}
