/* O SERVIDOR DO IDLE (bloco 1.2d, §P2, §P3, §25.2, §28).
 *
 * Fronteira: este arquivo é o ÚNICO caminho por onde uma expedição sai, volta,
 * ou vira item na bolsa. A conta não mora aqui — ela é `engine/expedicao.mjs`,
 * `engine/captura.mjs` e `engine/drops.mjs`, puros e testados sozinhos. Aqui
 * fica o que precisa de banco: o tempo, a posse e a memória.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A semente do saque é sorteada NA COLHEITA.**
 *
 * Se ela nascesse com a expedição, o resultado existiria no banco durante oito
 * horas antes de o jogador colher — e quem o visse poderia cancelar a expedição
 * ruim. Sorteada na colheita, não há janela: no instante em que o resultado
 * existe, ele já é do jogador.
 *
 * O banco torna isso estrutural, e não uma promessa:
 *
 *     CHECK ((colhida_em IS NULL) = (semente IS NULL))
 *
 * Semente sem colheita é um estado que o banco RECUSA.
 *
 * ── A COLHEITA É IDEMPOTENTE, E POR ISSO É UMA TRANSAÇÃO ─────────────────
 *
 * Dois cliques no botão, dois requests em voo, uma reconexão no meio: qualquer
 * um deles colheria duas vezes. O saque dobraria, e nada reprovaria — a
 * expedição continuaria parecendo uma expedição.
 *
 * A defesa é o `UPDATE ... WHERE colhida_em IS NULL` decidir quem venceu, e não
 * um `SELECT` antes. Ler e depois escrever deixa a janela aberta entre as duas;
 * escrever com a condição fecha no próprio banco. É a mesma forma do payout
 * único do §4.6, e pelo mesmo motivo.
 *
 * ── O SERVIDOR RECONFERE TUDO QUE O CLIENTE JÁ CONFERIU (§P2) ────────────
 *
 * Stamina, teto diário, vagas simultâneas, bola na bolsa. O cliente confere
 * para desenhar o botão; quem decide é este arquivo. Num jogo onde criatura é
 * vendável, um `fetch` forjado não é trapaça — é dinheiro.
 */
import { randomUUID } from 'node:crypto';
import { novaRaiz, derivar } from '../engine/seed.mjs';
import { semente } from '../engine/instancia.mjs';
import {
  PERFIS, TETO_DIARIO, TETO_ENCONTROS, cabeExpedicao, restamEncontros,
  SIMULTANEAS_INICIAIS, SIMULTANEAS_MAX, EQUIPE_MAX,
  STAMINA_MAX, staminaAgora, podeEnviar, custoDe, sortearEncontros,
} from '../engine/expedicao.mjs';
import { sortearItens, agrupar } from '../engine/drops.mjs';
import { chanceDe, tentar, FRAGMENTOS_POR_ENCONTRO } from '../engine/captura.mjs';
import { gerar as gerarCriatura } from './criaturas.mjs';

const DIA_MS = 24 * 3600_000;

/* ── A LEITURA DA EQUIPE ───────────────────────────────────────────────────
 *
 * As criaturas vêm do banco com a stamina no formato (valor, instante), e o
 * motor as recebe no formato que ele conhece. A conversão mora aqui, e é a
 * única — duas conversões seriam duas verdades sobre o mesmo número. */
function equipeDe(db, userId, ids) {
  if (!ids?.length) return [];
  /* UMA CONSULTA POR MEMBRO, e não um `IN` de aridade variável.
   *
   * A primeira versão montava `IN (${marcas})` com uma marca por id, e o portão
   * do `banco-servidor` reprovou — com razão. As marcas vinham do TAMANHO do
   * array e nunca do cliente, então era seguro hoje; o problema é que o padrão
   * fica indistinguível de injeção de verdade, e quem editar isto amanhã não
   * tem como saber pelo código qual das duas coisas está olhando.
   *
   * A equipe tem no máximo três membros. Três consultas preparadas custam nada
   * e não têm como ser lidas errado — e a ordem sai certa de graça, que o `IN`
   * não garantia. */
  const q = db.prepare(`SELECT id, stamina, stamina_em FROM criaturas
                          WHERE user_id = ? AND id = ?`);
  return ids.map(id => {
    const l = q.get(userId, id);
    return l ? { id: l.id, stamina: l.stamina, staminaEm: l.stamina_em } : null;
  }).filter(Boolean);
}

/* Quantas expedições este jogador CONCLUIU nas últimas 24 h.
 *
 * JANELA MÓVEL, e não "hoje" de calendário. Meia-noite fixa daria a todo mundo
 * uma virada em que o teto zera — e quem descobre passa a jogar em volta dela,
 * o que é o oposto de um idle. */
export const concluidasHoje = (db, userId, agora) =>
  db.prepare(`SELECT COUNT(*) AS n FROM expedicoes
               WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?`)
    .get(userId, agora - DIA_MS).n;

/* QUANTOS ENCONTROS JÁ SAÍRAM HOJE (D-052). É o que o teto conta — não a
   contagem de expedições. Mesma janela móvel de 24 h, pelo mesmo motivo. */
export const encontrosHoje = (db, userId, agora) =>
  db.prepare(`SELECT COALESCE(SUM(encontros), 0) AS n FROM expedicoes
               WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?`)
    .get(userId, agora - DIA_MS).n;

/* O estado que o motor lê: só o que JÁ ACONTECEU. */
export const estadoDoTeto = (db, userId, agora) => ({
  encontrosHoje: encontrosHoje(db, userId, agora),
  emCampo: emCampo(db, userId).map(x => x.perfil),
});

export const emCampo = (db, userId) =>
  db.prepare(`SELECT * FROM expedicoes WHERE user_id = ? AND colhida_em IS NULL
               ORDER BY termina_em`).all(userId);

/* ── INICIAR ───────────────────────────────────────────────────────────────
 *
 * O TETO SAI DA CONSTANTE DO MOTOR, sempre. Ver o §P5 no `engine/expedicao.mjs`:
 * a loja da L-066 vai vender boost de stamina, e boost que levantasse o teto
 * seria dinheiro comprando dinheiro. Aqui não há por onde receber outro número. */
export function iniciar(db, { userId, pack, bioma, perfil, equipe, agora,
                              limiteSimultaneas = SIMULTANEAS_INICIAIS }) {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);
  if (!(pack?.biomas ?? []).some(b => b.id === bioma))
    throw new Error(`o bioma "${bioma}" não existe no pack ${pack?.id}`);
  if (!equipe?.length) throw new Error('expedição sem equipe');
  if (equipe.length > EQUIPE_MAX)
    throw new Error(`a equipe tem ${equipe.length}, e o teto é ${EQUIPE_MAX}`);

  /* AS CRIATURAS TÊM DE SER DO JOGADOR. `equipeDe` filtra por `user_id`, então
     mandar o id de outro devolve menos linhas — e a contagem denuncia. */
  const membros = equipeDe(db, userId, equipe);
  if (membros.length !== equipe.length)
    throw new Error('a equipe tem criatura que não é sua ou não existe');

  const { pode, semStamina } = podeEnviar(membros, perfil, agora);
  if (!pode) throw new Error(`sem stamina: ${semStamina.join(', ')}`);

  if (!cabeExpedicao(estadoDoTeto(db, userId, agora), perfil))
    throw new Error(
      `o teto diário de ${TETO_ENCONTROS} encontros não comporta mais uma ` +
      `${p.rotulo} — restam ${restamEncontros(estadoDoTeto(db, userId, agora))}`);

  const vagas = Math.min(limiteSimultaneas, SIMULTANEAS_MAX);
  if (emCampo(db, userId).length >= vagas)
    throw new Error(`já há expedição em campo, e o limite é ${vagas}`);

  const id = randomUUID();
  const custo = custoDe(perfil, membros.length);

  /* TRANSAÇÃO: debitar a stamina e criar a expedição são a mesma decisão.
     Uma sem a outra é expedição de graça ou stamina queimada à toa. */
  db.exec('BEGIN');
  try {
    for (const c of membros) {
      const restante = Math.max(0, staminaAgora(c, agora) - p.custo);
      db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`)
        .run(Math.round(restante), agora, c.id);
    }
    db.prepare(`
      INSERT INTO expedicoes (id, user_id, pack_id, bioma, perfil, equipe_json,
                              custo, iniciada_em, termina_em)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, userId, pack.id, bioma, perfil, JSON.stringify(equipe),
           custo, agora, agora + p.minutos * 60_000);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  return db.prepare(`SELECT * FROM expedicoes WHERE id = ?`).get(id);
}

/* ── COLHER ────────────────────────────────────────────────────────────────
 *
 * Devolve o que a expedição trouxe: os encontros (que ainda precisam de bola) e
 * os itens (que já entraram na bolsa).
 *
 * A IDEMPOTÊNCIA É DO BANCO. O `UPDATE ... WHERE colhida_em IS NULL` é quem
 * decide o vencedor entre dois pedidos simultâneos; quem perder vê zero linhas
 * alteradas e sai sem colher. Um `SELECT` antes do `UPDATE` deixaria a janela
 * entre os dois aberta, e é exatamente por ali que um saque dobra. */
export function colher(db, { id, pack, agora }) {
  const exp = db.prepare(`SELECT * FROM expedicoes WHERE id = ?`).get(id);
  if (!exp) throw new Error('expedição não existe');
  if (agora < exp.termina_em) throw new Error('a expedição ainda não terminou');

  const raiz = novaRaiz();

  db.exec('BEGIN');
  try {
    const r = db.prepare(`UPDATE expedicoes SET colhida_em = ?, semente = ?
                           WHERE id = ? AND colhida_em IS NULL`)
      .run(agora, String(raiz), id);
    if (r.changes === 0) { db.exec('ROLLBACK'); throw new Error('esta expedição já foi colhida'); }

    /* DUAS SUB-SEMENTES POR RÓTULO, como a árvore do §P3: acrescentar um ramo
       amanhã não move os que já existem, e as expedições já colhidas continuam
       recalculáveis. */
    const encontros = sortearEncontros(semente(derivar(raiz, 'encontro')),
      { pack, bioma: exp.bioma, perfil: exp.perfil });
    const itens = agrupar(sortearItens(semente(derivar(raiz, 'saque')),
      { pack, bioma: exp.bioma, perfil: exp.perfil }));

    for (const it of itens) {
      const chave = it.classe === 'essencia' ? 'essencia' : it.id;
      creditarBolsa(db, exp.user_id, chave, it.quantidade);
    }
    /* O FRAGMENTO DE REGISTRO CAI NO ENCONTRO, e não na captura — é a decisão do
       1.2b, e é aqui que ela vira linha no banco. */
    for (const e of encontros)
      creditarRegistro(db, exp.user_id, exp.pack_id, e.dex, FRAGMENTOS_POR_ENCONTRO, agora);

    /* QUANTOS ENCONTROS ESTA COLHEITA RENDEU (D-052).

       Gravado DENTRO da mesma transação que marcou a colheita: se ele ficasse
       de fora, uma queda entre as duas escritas deixaria uma expedição colhida
       valendo zero no teto — e o jogador ganharia encontros de graça toda vez
       que o processo caísse na hora certa. */
    db.prepare(`UPDATE expedicoes SET encontros = ? WHERE id = ?`)
      .run(encontros.length, id);

    db.exec('COMMIT');
    return { expedicao: id, semente: String(raiz), encontros, itens };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

/* ── A BOLSA ───────────────────────────────────────────────────────────────
 *
 * `UPSERT` numa linha só. Ler-somar-escrever seria a mesma janela de corrida da
 * colheita, e aqui ela custaria itens duplicados a cada colheita concorrente. */
export function creditarBolsa(db, userId, itemId, quantidade) {
  if (!(quantidade > 0)) throw new Error('crédito tem de ser positivo');
  db.prepare(`
    INSERT INTO bolsa (user_id, item_id, quantidade) VALUES (?,?,?)
    ON CONFLICT (user_id, item_id)
    DO UPDATE SET quantidade = quantidade + excluded.quantidade`)
    .run(userId, itemId, quantidade);
}

/* O débito tem a guarda NA CLÁUSULA, e não no código: `WHERE quantidade >= ?`
   devolve zero linhas quando não dá, em vez de deixar o CHECK explodir depois.
   O CHECK continua lá como última defesa — as duas coisas, e não uma. */
export function debitarBolsa(db, userId, itemId, quantidade) {
  const r = db.prepare(`UPDATE bolsa SET quantidade = quantidade - ?
                         WHERE user_id = ? AND item_id = ? AND quantidade >= ?`)
    .run(quantidade, userId, itemId, quantidade);
  return r.changes > 0;
}

export const bolsaDe = (db, userId) =>
  db.prepare(`SELECT item_id, quantidade FROM bolsa
               WHERE user_id = ? AND quantidade > 0 ORDER BY item_id`).all(userId);

export const quantosNaBolsa = (db, userId, itemId) =>
  db.prepare(`SELECT quantidade FROM bolsa WHERE user_id = ? AND item_id = ?`)
    .get(userId, itemId)?.quantidade ?? 0;

/* ── O REGISTRO ──────────────────────────────────────────────────────────────
 *
 * Guarda FRAGMENTOS e não porcentagem: a porcentagem sai do alvo da faixa, que
 * é dado do pack e pode ser rebalanceado. Guardar a porcentagem congelaria o
 * balanço de hoje na conta de todo mundo. */
export function creditarRegistro(db, userId, packId, dex, quantos, agora) {
  db.prepare(`
    INSERT INTO registro (user_id, pack_id, dex, fragmentos, visto_em) VALUES (?,?,?,?,?)
    ON CONFLICT (user_id, pack_id, dex)
    DO UPDATE SET fragmentos = fragmentos + excluded.fragmentos, visto_em = excluded.visto_em`)
    .run(userId, packId, dex, quantos, agora);
}

export const registroDe = (db, userId, packId) =>
  db.prepare(`SELECT dex, fragmentos, visto_em FROM registro
               WHERE user_id = ? AND pack_id = ? ORDER BY dex`).all(userId, packId);

/* ── O LANCE ───────────────────────────────────────────────────────────────
 *
 * A bola é debitada ANTES do sorteio, e é debitada mesmo quando a captura
 * falha. A ordem importa: sortear primeiro e debitar depois abriria a janela em
 * que um erro entre as duas deixaria a captura de graça.
 *
 * O SORTEIO É DO SERVIDOR (§P2). O cliente manda a intenção — qual encontro,
 * qual bola — e recebe o que saiu. */
export function lancar(db, { userId, pack, dex, raridade, bola, agora,
                              raiz = novaRaiz() }) {
  if (!chanceDe(pack, { raridade, bola }))
    throw new Error(`não há chance para ${raridade} com a bola ${bola}`);
  if (!debitarBolsa(db, userId, bola, 1))
    throw new Error(`não há ${bola} na bolsa`);

  const r = tentar(semente(derivar(raiz, 'lance')), pack, { raridade, bola });
  const criatura = r.capturou
    ? gerarCriatura(db, { userId, pack, dex, origem: 'captura' })
    : null;
  return { ...r, dex, criatura, semente: String(raiz) };
}

/* A stamina de uma criatura, agora — para a tela e para a decisão de quem
   mandar. Sai da MESMA função do motor; uma segunda conta aqui seria a
   armadilha do §7.11. */
export function staminaDe(db, id, agora) {
  const l = db.prepare(`SELECT stamina, stamina_em FROM criaturas WHERE id = ?`).get(id);
  if (!l) return 0;
  return staminaAgora({ stamina: l.stamina, staminaEm: l.stamina_em }, agora);
}

export { STAMINA_MAX, TETO_DIARIO };
