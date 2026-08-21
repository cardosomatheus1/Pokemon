/* ADMINISTRAÇÃO E PAINEL ECONÔMICO (F1.11) — §5.11 e §10.9.
 *
 * ── ESTA É A SUPERFÍCIE DE MAIOR VALOR DO SISTEMA ──────────────────────────
 *
 * Quem entra aqui vê saldo de todo mundo, muda a margem da casa e pode
 * bloquear conta. O bloco declara isso e o desenho responde em três camadas:
 *
 *   papel        cada operador tem UM, e cada ação exige o dela
 *   registro     nenhuma ação sem operador identificado e motivo escrito
 *   confirmação  ação destrutiva exige `confirmado: true` explícito
 *
 * As três são independentes de propósito. Autorização sem registro deixa a
 * pergunta "quem fez isto?" sem resposta; registro sem autorização registra o
 * estrago; e as duas sem confirmação transformam um clique errado em incidente.
 *
 * ── O PAINEL LÊ O LEDGER, E NUNCA UM SALDO GUARDADO ────────────────────────
 *
 * "Deixar o painel calcular saldo fora do ledger" é um item de sabotagem
 * declarado, e é o mais fácil de cometer: existe uma tabela `carteiras` com o
 * saldo pronto, e somá-la é uma consulta mais curta.
 *
 * Mas o saldo guardado é CACHE — o ledger é a fonte, e essa hierarquia está no
 * §5.5 e no `engine/carteira.mjs` desde o F0.9. Um painel que lê o cache não
 * detecta divergência entre os dois: ele mostraria a mesma resposta errada que
 * o cache tem. Um painel que lê o ledger e COMPARA é o único que responde "a
 * economia está saudável?" — que é o critério de saída deste bloco.
 */
import { randomUUID } from 'node:crypto';
import { BUCKETS } from '../engine/carteira.mjs';

/* Os papéis, do menos para o mais poderoso. A ordem é significativa: `podeFazer`
   compara posição, então um papel novo entra no lugar certo da escada e todas
   as permissões existentes continuam valendo. */
export const PAPEIS = ['leitura', 'suporte', 'economia', 'dono'];

/* O papel MÍNIMO de cada ação. Tabela e não `if`: a lista de ações é auditável
   de uma olhada, e uma ação nova sem entrada aqui é NEGADA por padrão — ver
   `podeFazer`. Ação nova nasce proibida, do mesmo jeito que rota nova nasce
   privada. */
export const EXIGE = {
  'painel.ver':          'leitura',
  'jogador.ver':         'suporte',
  'jogador.pausar':      'suporte',
  'margem.ver':          'leitura',
  'margem.definir':      'economia',
  'operador.criar':      'dono',
  'operador.desativar':  'dono',
};

/* Ações que mexem no jogador ou no dinheiro. Exigem `confirmado: true` — e o
   valor tem que vir do chamador, nunca de um padrão. */
export const DESTRUTIVAS = new Set(['jogador.pausar', 'margem.definir', 'operador.desativar']);

export const ERRO_ADMIN = {
  SEM_OPERADOR:  'operador_desconhecido',
  SEM_PAPEL:     'papel_insuficiente',
  SEM_MOTIVO:    'motivo_obrigatorio',
  SEM_CONFIRMAR: 'confirmacao_obrigatoria',
  ACAO:          'acao_desconhecida',
};

const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

export const operadorPor = (db, id) =>
  db.prepare(`SELECT * FROM admin_operadores WHERE id = ? AND ativo = 1`).get(id) || null;

export function criarOperador(db, { email, papel, agora = Date.now() }) {
  if (!PAPEIS.includes(papel)) throw erro(ERRO_ADMIN.SEM_PAPEL, `papel desconhecido: ${papel}`);
  const id = randomUUID();
  db.prepare(`INSERT INTO admin_operadores (id, email, papel, ativo, criado_em)
              VALUES (?, ?, ?, 1, ?)`).run(id, String(email).toLowerCase().trim(), papel, agora);
  return operadorPor(db, id);
}

/* O REGISTRO, SOZINHO. Extraído no F1.17 porque o login de operador também
 * precisa dele — "quem entrou" é a primeira pergunta de qualquer investigação, e
 * ela é anterior a "o que ele fez".
 *
 * `operadorId` pode ser nulo: uma tentativa de login com e-mail que não existe
 * não tem operador, e é justamente essa que se quer contar. Cem recusas
 * seguidas é o sinal mais barato de ataque que existe.
 *
 * O QUE ELE NÃO GUARDA é tão importante quanto o que guarda: nenhuma credencial
 * entra aqui. Registro é para ser lido por gente, e uma auditoria com senha
 * dentro vira o lugar mais fácil de achar uma. */
export function registrarAuditoria(db, { operadorId, acao, alvo = null, de = null,
                                         para = null, motivo = '', agora = Date.now() }) {
  db.prepare(
    `INSERT INTO admin_auditoria (id, operador_id, acao, alvo, de, para, motivo, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), operadorId, acao, alvo,
         de === null ? null : String(de), para === null ? null : String(para),
         String(motivo).trim(), agora);
}

/* AÇÃO DESCONHECIDA É NEGADA. Não é detalhe: sem esta linha, uma ação nova
   escrita amanhã ficaria liberada para o papel mais fraco até alguém lembrar de
   acrescentá-la à tabela. É a mesma regra de `ROTAS_PUBLICAS`. */
export function podeFazer(operador, acao) {
  if (!operador) return false;
  const minimo = EXIGE[acao];
  if (!minimo) return false;
  return PAPEIS.indexOf(operador.papel) >= PAPEIS.indexOf(minimo);
}

/* O ÚNICO CAMINHO PARA AGIR. Toda ação administrativa passa por aqui, e por
 * isso as três camadas não podem ser puladas por engano — não existe um segundo
 * caminho onde alguém esqueceu de conferir.
 *
 * A auditoria é gravada ANTES de a ação rodar, e isso é decisão: se a ação
 * falhar no meio, o registro de que foi TENTADA continua lá. Auditoria que só
 * grava sucesso não registra exatamente o que mais interessa depois. */
export function agir(db, { operadorId, acao, alvo = null, de = null, para = null,
                           motivo = '', confirmado = false, agora = Date.now() }, executar) {
  const op = operadorPor(db, operadorId);
  if (!op) throw erro(ERRO_ADMIN.SEM_OPERADOR, 'nenhum operador ativo com este id');
  if (!EXIGE[acao]) throw erro(ERRO_ADMIN.ACAO, `ação desconhecida: ${acao}`);
  if (!podeFazer(op, acao))
    throw erro(ERRO_ADMIN.SEM_PAPEL,
      `o papel \`${op.papel}\` não alcança \`${acao}\` (exige \`${EXIGE[acao]}\`)`);
  if (!String(motivo).trim())
    throw erro(ERRO_ADMIN.SEM_MOTIVO, 'toda ação administrativa precisa de motivo escrito');
  if (DESTRUTIVAS.has(acao) && confirmado !== true)
    throw erro(ERRO_ADMIN.SEM_CONFIRMAR, `\`${acao}\` é destrutiva e exige confirmação explícita`);

  /* A ORDEM É A GARANTIA: registrar ANTES de executar. Invertida, a ação que
     falha no meio não deixa rastro nenhum — e é exatamente essa que mais
     interessa depois. */
  registrarAuditoria(db, { operadorId: op.id, acao, alvo, de, para, motivo, agora });
  return executar ? executar(op) : { ok: true };
}

/* ── O PAINEL ──────────────────────────────────────────────────────────────
 *
 * Tudo aqui sai do LEDGER. A tabela `carteiras` existe e não é consultada —
 * ela é cache, e um painel que lê cache não vê divergência entre cache e fonte.
 */
export function painelEconomico(db, { desde = 0, ate = Number.MAX_SAFE_INTEGER } = {}) {
  /* FAUCETS E SINKS pelo SINAL do lançamento, e agrupados por tipo. É a série
     do §5.1 do Estudo: de onde a moeda entra e por onde sai. */
  const porTipo = db.prepare(
    `SELECT type AS tipo, bucket,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS entrou,
            SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS saiu,
            COUNT(*) AS n
       FROM wallet_ledger WHERE created_at >= ? AND created_at <= ?
      GROUP BY tipo, bucket`).all(desde, ate);

  const faucets = {}, sinks = {};
  for (const r of porTipo) {
    if (r.entrou > 0) faucets[r.tipo] = (faucets[r.tipo] || 0) + r.entrou;
    if (r.saiu > 0) sinks[r.tipo] = (sinks[r.tipo] || 0) + r.saiu;
  }

  /* O SALDO EM CIRCULAÇÃO, SOMADO DO LEDGER. É a mesma conta que a `carteiras`
     guarda pronta, e é justamente por isso que ela é feita de novo aqui. */
  const emCirculacao = {};
  for (const b of BUCKETS) emCirculacao[b] = 0;
  for (const r of db.prepare(
    `SELECT bucket, COALESCE(SUM(amount), 0) AS s FROM wallet_ledger
      WHERE created_at <= ? GROUP BY bucket`).all(ate))
    emCirculacao[r.bucket] = r.s;

  /* A DIVERGÊNCIA ENTRE FONTE E CACHE, exposta em vez de escondida. Zero é o
     esperado; qualquer outra coisa é a pergunta mais importante do painel. */
  const cache = {};
  for (const b of BUCKETS) cache[b] = 0;
  for (const r of db.prepare(`SELECT bucket, COALESCE(SUM(saldo),0) AS s FROM carteiras GROUP BY bucket`).all())
    cache[r.bucket] = r.s;
  const divergencia = {};
  for (const b of BUCKETS) if (emCirculacao[b] !== cache[b]) divergencia[b] = cache[b] - emCirculacao[b];

  const passivo = db.prepare(
    `SELECT COALESCE(SUM(stake * odd), 0) AS p FROM bets WHERE status = 'aberta'`).get().p;

  return {
    faucets, sinks, emCirculacao, divergencia, passivo,
    totalEmitido: Object.values(faucets).reduce((a, v) => a + v, 0),
    totalRetirado: Object.values(sinks).reduce((a, v) => a + v, 0),
  };
}
