/* Q1/Q3/Q6/Q8 · O SERVIDOR DO IDLE (bloco 1.2d, §P2, §P3, §25.2, §28).
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **A SEMENTE DO SAQUE NASCE NA COLHEITA.** Se ela existisse desde o início,
 *    o resultado ficaria oito horas no banco antes de o jogador colher — e quem
 *    o visse poderia cancelar a expedição ruim. O banco recusa o estado por
 *    CHECK, e não por promessa.
 *
 * 2. **A COLHEITA É IDEMPOTENTE.** Dois cliques, dois requests em voo, uma
 *    reconexão no meio: qualquer um colheria duas vezes, o saque dobraria, e a
 *    expedição continuaria parecendo uma expedição.
 *
 * 3. **O SERVIDOR RECONFERE TUDO.** Stamina, teto diário, vagas, bola na bolsa,
 *    e a criatura ser do jogador. O cliente confere para desenhar o botão.
 *
 * 4. **A BOLSA NÃO FICA NEGATIVA.** Duas defesas e não uma: a cláusula do
 *    UPDATE e o CHECK do banco. Bolsa negativa é bola de graça, e bola de graça
 *    é criatura de graça.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar as gerarCriatura } from '../server/criaturas.mjs';
import {
  iniciar, colher, emCampo, concluidasHoje, encontrosHoje, lancar, staminaDe,
  creditarBolsa, debitarBolsa, bolsaDe, quantosNaBolsa,
  creditarRegistro, registroDe,
} from '../server/idle.mjs';
import { PERFIS, TETO_DIARIO, TETO_ENCONTROS, STAMINA_MAX, EQUIPE_MAX } from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const AGORA = Date.UTC(2026, 7, 30, 12, 0, 0);
const H = 3600_000;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena(quantasCriaturas = 3) {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, {
    username: 'j', email: 'j@exemplo.test', senha: 'senha-longa-o-bastante-1',
    nascimento: '1990-01-01', agora: AGORA,
  });
  const equipe = [];
  for (let i = 0; i < quantasCriaturas; i++) {
    const c = gerarCriatura(db, { userId: u.id, pack: kanto, dex: 1 + i, origem: 'inicial' });
    db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`)
      .run(STAMINA_MAX, AGORA, c.id);
    equipe.push(c.id);
  }
  return { db, u, equipe };
}

const iniciarPadrao = (db, u, equipe, extra = {}) =>
  iniciar(db, { userId: u.id, pack: kanto, bioma: 'floresta', perfil: 'batida',
                equipe, agora: AGORA, ...extra });

export function suite() {
  const s = criarSuite('idle-servidor');

  /* --- 1 · A SEMENTE NASCE NA COLHEITA ----------------------------------- */

  s.teste('§25.2 · a expedição nasce SEM semente, e o banco recusa o contrário', () => {
    const { db, u, equipe } = cena();
    const e = iniciarPadrao(db, u, equipe);
    igual(e.semente, null,
      'a expedição nasceu com semente. O resultado existiria no banco horas ' +
      'antes de o jogador colher, e quem o visse poderia cancelar a expedição ruim.');
    igual(e.colhida_em, null);

    /* E o estado é IMPOSSÍVEL, não só evitado. */
    ok(recusa(() => db.prepare(`UPDATE expedicoes SET semente = 'abc' WHERE id = ?`).run(e.id)),
      'o banco aceitou semente sem colheita. O CHECK é o que torna a regra ' +
      'estrutural — sem ele, ela é uma promessa que depende de todo mundo lembrar.');
    ok(recusa(() => db.prepare(`UPDATE expedicoes SET colhida_em = ? WHERE id = ?`).run(AGORA, e.id)),
      'o banco aceitou colheita sem semente — seria saque sem auditoria');
  });

  s.teste('a colheita grava a semente, e a mesma semente reproduz o saque', () => {
    const { db, u, equipe } = cena();
    const e = iniciarPadrao(db, u, equipe);
    const depois = e.termina_em;
    const r = colher(db, { id: e.id, pack: kanto, agora: depois });
    ok(r.semente && r.semente.length >= 8, 'a colheita não gravou semente');
    const linha = db.prepare(`SELECT * FROM expedicoes WHERE id = ?`).get(e.id);
    igual(linha.semente, r.semente, 'a semente devolvida difere da gravada');
    igual(linha.colhida_em, depois);
  });

  /* --- 2 · A COLHEITA É IDEMPOTENTE -------------------------------------- */

  s.teste('§Q8 · colher duas vezes não duplica o saque', () => {
    const { db, u, equipe } = cena();
    const e = iniciarPadrao(db, u, equipe);
    const t = e.termina_em;
    const primeira = colher(db, { id: e.id, pack: kanto, agora: t });
    const antes = bolsaDe(db, u.id).reduce((a, i) => a + i.quantidade, 0);
    ok(antes > 0, 'a primeira colheita não creditou nada na bolsa');

    ok(recusa(() => colher(db, { id: e.id, pack: kanto, agora: t })),
      'a segunda colheita passou. Dois cliques no botão, dois requests em voo ou ' +
      'uma reconexão no meio dobrariam o saque, e a expedição continuaria ' +
      'parecendo uma expedição.');

    const depois = bolsaDe(db, u.id).reduce((a, i) => a + i.quantidade, 0);
    igual(depois, antes,
      `a bolsa foi de ${antes} para ${depois} itens depois de uma colheita recusada. ` +
      `A recusa tem de ser ANTES de qualquer crédito — recusar depois de creditar ` +
      `é o pior dos dois mundos.`);
    ok(primeira.encontros.length > 0);
  });

  s.teste('não se colhe antes da hora', () => {
    const { db, u, equipe } = cena();
    const e = iniciarPadrao(db, u, equipe);
    ok(recusa(() => colher(db, { id: e.id, pack: kanto, agora: e.termina_em - 1 })),
      'colheu um milissegundo antes de terminar');
    igual(db.prepare(`SELECT colhida_em FROM expedicoes WHERE id = ?`).get(e.id).colhida_em, null);
  });

  /* --- 3 · O SERVIDOR RECONFERE TUDO (§P2) ------------------------------- */

  s.teste('§P2 · a stamina é debitada e persiste', () => {
    const { db, u, equipe } = cena();
    iniciarPadrao(db, u, equipe);
    for (const id of equipe)
      igual(staminaDe(db, id, AGORA), STAMINA_MAX - PERFIS.batida.custo,
        'a stamina não foi debitada, ou não persistiu');
    /* e regenera com o tempo, sem ninguém rodar relógio */
    ok(staminaDe(db, equipe[0], AGORA + 5 * H) > staminaDe(db, equipe[0], AGORA));
  });

  s.teste('§P2 · não se manda criatura que não é sua', () => {
    const { db, u, equipe } = cena();
    const outro = cadastrar(db, { username: 'k', email: 'k@exemplo.test',
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA });
    const dele = gerarCriatura(db, { userId: outro.id, pack: kanto, dex: 7, origem: 'inicial' });
    ok(recusa(() => iniciarPadrao(db, u, [equipe[0], dele.id])),
      'mandei a criatura de outro jogador e passou. O `fetch` forjado é o ataque ' +
      'óbvio, e num jogo em que criatura é vendável ele não é trapaça: é dinheiro.');
    ok(recusa(() => iniciarPadrao(db, u, ['nao-existe'])),
      'uma criatura inexistente entrou na equipe');
  });

  s.teste('§P2 · sem stamina o servidor recusa, mesmo com o cliente insistindo', () => {
    const { db, u, equipe } = cena();
    db.prepare(`UPDATE criaturas SET stamina = 0, stamina_em = ? WHERE id = ?`)
      .run(AGORA, equipe[0]);
    ok(recusa(() => iniciarPadrao(db, u, equipe, { perfil: 'vigilia' })),
      'a vigília custa 90 e uma das criaturas tinha 0');
    igual(emCampo(db, u.id).length, 0, 'a expedição foi criada mesmo com a recusa');
  });

  /* REANCORADO no 1.6a (D-052). O teto passou a contar ENCONTROS, então quatro
     Batidas deixaram de saturá-lo — e é o ponto da correção, não regressão. O
     que continua afirmado é o que importa: o servidor confere, o teto não é
     ultrapassado, a janela é móvel, e não há parâmetro que o levante. */
  s.teste('§P5 · o teto de encontros é conferido no servidor, e não tem parâmetro', () => {
    const { db, u, equipe } = cena();
    let t = AGORA, mandadas = 0;

    while (mandadas < 20) {
      let e;
      try { e = iniciarPadrao(db, u, [equipe[0]], { agora: t }); } catch { break; }
      mandadas++;
      t = e.termina_em;
      colher(db, { id: e.id, pack: kanto, agora: t });
      ok(encontrosHoje(db, u.id, t) <= TETO_ENCONTROS,
        `o dia rendeu ${encontrosHoje(db, u.id, t)} encontros e o teto é ` +
        `${TETO_ENCONTROS}. É o §P5: a loja da L-066 vai vender boost de stamina, ` +
        'e boost que levante o teto é dinheiro comprando dinheiro.');
    }
    ok(mandadas > 0, 'nenhuma expedição coube — a cena está errada, não o teto');
    ok(recusa(() => iniciarPadrao(db, u, [equipe[0]], { agora: t, perfil: 'vigilia' })),
      'com o dia cheio, uma Vigília ainda foi aceita');

    /* O NÚMERO É GRAVADO NA COLHEITA, e é ele que a soma lê. Sem isso o teto
       conta zero para sempre e deixa de existir em silêncio. */
    const soma = db.prepare(
      `SELECT COALESCE(SUM(encontros),0) AS n FROM expedicoes WHERE user_id = ?`)
      .get(u.id).n;
    ok(soma > 0,
      'nenhuma expedição gravou quantos encontros rendeu. O teto passaria a ' +
      'contar zero para sempre — e sumiria sem nada ficar vermelho.');

    /* ── A JANELA É MÓVEL, E ESTA AFIRMAÇÃO PRECISOU SER REFEITA (D-070) ──
     *
     * A versão anterior era `ok(iniciarPadrao(..., agora: t + 25 * H))` — mandar
     * uma expedição 25 h depois e exigir que ela seja aceita. Parecia medir a
     * janela. Não media: **o laço acima para por STAMINA, não por teto.**
     *
     * Cinco Batidas a 20 de stamina esgotam a criatura em ~20 encontros, e o
     * teto é 30 — ele nunca enche. Vinte e cinco horas depois a stamina voltou,
     * e o envio passa por isso. O `S568` — que apaga o `colhida_em > ?` e
     * transforma o teto diário em teto PARA SEMPRE — escapava inteiro por essa
     * fresta: com o teto nunca cheio, remover a janela não muda nada.
     *
     * É o D-058 outra vez, e a frase dele serve sem tradução:
     *
     *     Medir onde o defeito não pode aparecer não é medir.
     *
     * A afirmação nova pergunta à JANELA diretamente, e não ao envio. Nenhuma
     * regeneração de stamina, nenhuma vaga simultânea e nenhum custo de perfil
     * pode fazer uma soma de 24 h devolver zero — só a própria janela pode. */
    ok(encontrosHoje(db, u.id, t) > 0,
      'a cena terminou sem nenhum encontro colhido: sem isso a afirmação de ' +
      'baixo passa por vazio, que é o modo de falha que ela existe para fechar');

    igual(encontrosHoje(db, u.id, t + 25 * H), 0,
      `passadas 25 h, a soma do dia ainda devolve ${encontrosHoje(db, u.id, t + 25 * H)} ` +
      'encontros. A janela é MÓVEL: sem ela o teto diário vira teto para sempre e ' +
      'quem farmou um dia nunca mais farma — e some em silêncio, porque o ' +
      'jogador simplesmente para de conseguir mandar sem nada explicar por quê.');
    igual(concluidasHoje(db, u.id, t + 25 * H), 0,
      'a contagem de expedições concluídas usa a mesma janela, e ela não moveu');

    /* E o envio volta a ser aceito — que é a consequência, não a prova. */
    ok(iniciarPadrao(db, u, [equipe[0]], { agora: t + 25 * H }),
      'depois de 24 h o teto não abriu');
  });

  s.teste('§P2 · não se começa além das vagas simultâneas', () => {
    const { db, u, equipe } = cena();
    iniciarPadrao(db, u, [equipe[0]]);
    ok(recusa(() => iniciarPadrao(db, u, [equipe[1]])),
      'começou uma segunda expedição com uma vaga só');
    ok(iniciarPadrao(db, u, [equipe[1]], { limiteSimultaneas: 2 }),
      'com duas vagas, a segunda tinha de entrar');
  });

  s.teste('bioma e perfil inexistentes são recusados', () => {
    const { db, u, equipe } = cena();
    ok(recusa(() => iniciarPadrao(db, u, equipe, { bioma: 'inventado' })));
    ok(recusa(() => iniciarPadrao(db, u, equipe, { perfil: 'inventado' })));
    const grande = [...equipe, equipe[0], equipe[1]].slice(0, EQUIPE_MAX + 1);
    ok(recusa(() => iniciarPadrao(db, u, grande)), 'equipe acima do teto entrou');
  });

  /* --- 4 · A BOLSA (Q6) --------------------------------------------------- */

  s.teste('§Q6 · a bolsa nunca fica negativa — duas defesas, não uma', () => {
    const { db, u } = cena();
    creditarBolsa(db, u.id, 'poke', 3);
    igual(quantosNaBolsa(db, u.id, 'poke'), 3);

    igual(debitarBolsa(db, u.id, 'poke', 5), false,
      'debitou 5 de uma bolsa com 3. A guarda tem de estar NA CLÁUSULA do ' +
      'UPDATE: devolver zero linhas é diferente de deixar o CHECK explodir depois.');
    igual(quantosNaBolsa(db, u.id, 'poke'), 3, 'o débito recusado mexeu na bolsa');

    igual(debitarBolsa(db, u.id, 'poke', 3), true);
    igual(quantosNaBolsa(db, u.id, 'poke'), 0);
    igual(debitarBolsa(db, u.id, 'inexistente', 1), false, 'debitou item que não existe');

    /* e a última defesa continua lá */
    ok(recusa(() => db.prepare(`UPDATE bolsa SET quantidade = -1 WHERE user_id = ?`).run(u.id)),
      'o banco aceitou quantidade negativa. O CHECK é a última linha de defesa, e ' +
      'ela não pode depender de o código de aplicação estar certo no dia.');
  });

  s.teste('creditar duas vezes soma na mesma linha', () => {
    const { db, u } = cena();
    creditarBolsa(db, u.id, 'lua', 2);
    creditarBolsa(db, u.id, 'lua', 5);
    igual(quantosNaBolsa(db, u.id, 'lua'), 7);
    igual(bolsaDe(db, u.id).length, 1,
      'duas linhas para o mesmo item — seriam duas verdades sobre uma quantidade');
    ok(recusa(() => creditarBolsa(db, u.id, 'lua', 0)), 'crédito de zero passou');
    ok(recusa(() => creditarBolsa(db, u.id, 'lua', -3)), 'crédito negativo passou');
  });

  /* --- o registro ----------------------------------------------------------- */

  s.teste('o registro acumula por ENCONTRO, e a colheita o alimenta', () => {
    const { db, u, equipe } = cena();
    const e = iniciarPadrao(db, u, equipe, { perfil: 'vigilia' });
    const r = colher(db, { id: e.id, pack: kanto, agora: e.termina_em });
    const fichas = registroDe(db, u.id, kanto.id);
    ok(fichas.length > 0, 'a colheita não creditou registro nenhum');
    igual(fichas.reduce((a, f) => a + f.fragmentos, 0), r.encontros.length,
      'a soma dos fragmentos difere do número de encontros. O fragmento cai no ' +
      'ENCONTRO e não na captura — é o que impede o teto de 85% de virar ' +
      'frustração pura.');
  });

  s.teste('o registro soma na mesma linha e guarda fragmento, não porcentagem', () => {
    const { db, u } = cena();
    creditarRegistro(db, u.id, kanto.id, 25, 3, AGORA);
    creditarRegistro(db, u.id, kanto.id, 25, 4, AGORA + H);
    const f = registroDe(db, u.id, kanto.id);
    igual(f.length, 1);
    igual(f[0].fragmentos, 7,
      'guardar porcentagem congelaria o balanço de hoje na conta de todo mundo — ' +
      'o alvo da faixa é dado do pack e pode ser rebalanceado');
    igual(f[0].visto_em, AGORA + H, 'o visto_em não acompanhou');
  });

  /* --- o lance ------------------------------------------------------------ */

  s.teste('§P2 · o lance consome a bola da bolsa, e recusa sem ela', () => {
    const { db, u } = cena();
    ok(recusa(() => lancar(db, { userId: u.id, pack: kanto, dex: 1,
      raridade: 'comum', bola: 'poke', agora: AGORA })),
      'lançou sem bola nenhuma na bolsa');

    creditarBolsa(db, u.id, 'poke', 1);
    const r = lancar(db, { userId: u.id, pack: kanto, dex: 1,
      raridade: 'comum', bola: 'poke', agora: AGORA });
    igual(quantosNaBolsa(db, u.id, 'poke'), 0,
      'a bola não saiu da bolsa. O consumo é o único custo do lance — sem ele, ' +
      'escolher a bola deixa de ser decisão.');
    ok(typeof r.capturou === 'boolean');
  });

  s.teste('a bola é consumida MESMO quando a captura falha', () => {
    const { db, u } = cena();
    creditarBolsa(db, u.id, 'poke', 40);
    let falhas = 0;
    for (let i = 0; i < 40; i++)
      if (!lancar(db, { userId: u.id, pack: kanto, dex: 149,
                        raridade: 'lendario', bola: 'poke', agora: AGORA }).capturou) falhas++;
    ok(falhas > 25, `só ${falhas} falhas em 40 lances no lendário — o teste não mede nada`);
    igual(quantosNaBolsa(db, u.id, 'poke'), 0,
      'sobrou bola depois de 40 lances. Devolver a bola na falha tira o custo do ' +
      'lance, e a escolha da bola vira reflexo em vez de decisão.');
  });

  s.teste('a captura que dá certo cria a criatura, e ela é do jogador', () => {
    const { db, u } = cena();
    creditarBolsa(db, u.id, 'ultra', 60);
    let criadas = 0;
    for (let i = 0; i < 60; i++) {
      const r = lancar(db, { userId: u.id, pack: kanto, dex: 16,
                             raridade: 'comum', bola: 'ultra', agora: AGORA });
      if (r.capturou) {
        criadas++;
        igual(r.criatura.dono, u.id, 'a criatura capturada não é do jogador');
        igual(r.criatura.especie, 16, 'a criatura capturada é de outra espécie');
        igual(r.criatura.origem, 'captura');
      } else igual(r.criatura, null, 'a falha criou criatura mesmo assim');
    }
    ok(criadas > 30, `só ${criadas} capturas em 60 lances de comum com ultra (85%)`);
    igual(db.prepare(`SELECT COUNT(*) AS n FROM criaturas WHERE user_id = ? AND origem = 'captura'`)
      .get(u.id).n, criadas, 'o número de criaturas no banco difere do de capturas');
  });

  s.teste('bola sem chance nenhuma é recusada antes de gastar', () => {
    const { db, u } = cena();
    creditarBolsa(db, u.id, 'poke', 2);
    ok(recusa(() => lancar(db, { userId: u.id, pack: kanto, dex: 1,
      raridade: 'inventada', bola: 'poke', agora: AGORA })));
    igual(quantosNaBolsa(db, u.id, 'poke'), 2,
      'a bola foi gasta num lance impossível. A recusa tem de vir ANTES do débito.');
  });

  return s;
}
