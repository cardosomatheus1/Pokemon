/* Q1/Q3/Q6 · LIMITES DEFINIDOS PELO JOGADOR (F1.8, Spec §28.3).
 *
 * ── A ASSIMETRIA É O BLOCO INTEIRO ─────────────────────────────────────────
 *
 *     reduzir limite  → efeito imediato
 *     aumentar limite → pedido registrado + cooldown de 24 h + confirmação ativa
 *     remover limite  → tratado como aumento
 *
 * Sem ela o limite não protege ninguém: **o jogador em perseguição de perda
 * simplesmente o eleva no momento em que ele deveria segurar.** O cooldown
 * existe para separar a decisão do impulso, e por isso a Spec é explícita em que
 * ele não pode ser encurtado por suporte, promoção ou evento — o que, em código,
 * quer dizer que não pode existir caminho que o encurte.
 *
 * ── E QUANDO O LIMITE BLOQUEIA ─────────────────────────────────────────────
 *
 * A Spec pede que a resposta diga **qual** limite, **quanto** falta e **quando**
 * volta. Nunca falha em silêncio. Um `false` seco satisfaria a regra de negócio
 * e falharia a de proteção, que é a que importa aqui.
 *
 * ── PROTEÇÃO DO JOGADOR É REQUISITO, NÃO CONFORMIDADE ──────────────────────
 *
 * É a regra do CLAUDE.md, e ela decide o desenho: o limite é conferido no
 * SERVIDOR, no mesmo caminho que aceita a aposta, e não numa tela que o cliente
 * pode não desenhar.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { criarScheduler, FASE_MS } from '../server/scheduler.mjs';
import { apostar, liquidarRodada } from '../server/aposta.mjs';
import {
  definirLimite, confirmarAumento, limitesDe, avaliarAposta, avaliarRodada,
  registrarPerda, registrarRodada, TIPOS_LIMITE, COOLDOWN_MS, ERRO_LIMITE,
} from '../server/limites.mjs';

const AGORA = Date.UTC(2026, 0, 15);
const DIA = 24 * 60 * 60 * 1000;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cenario({ saldo = 100000 } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = AGORA;
  const sched = criarScheduler({ db, sims: 500, relogio: () => agora });
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora });
  creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                 valor: saldo, idem: 'seed', agora });
  return { db, sched, u, avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

export function suite() {
  const s = criarSuite('limites');

  /* --- o produto OFERECE todos ------------------------------------------- */

  s.teste('todos os limites do §28.3 existem, mesmo os opcionais para o jogador', () => {
    /* "Todos disponíveis desde a V1, todos opcionais para o jogador e todos
       OBRIGATÓRIOS PARA O PRODUTO OFERECER." Um limite que não existe não pode
       ser escolhido, e a escolha é a proteção. */
    for (const t of ['max_stake_per_round', 'max_loss_dia', 'max_loss_semana',
                     'max_loss_mes', 'max_rounds_dia', 'max_session_time'])
      ok(TIPOS_LIMITE.includes(t), `o limite ${t} do §28.3 não existe`);
  });

  /* O COOLDOWN É COMPARADO COM A SPEC, e não consigo mesmo.
     Todos os outros testes daqui escrevem `agora + COOLDOWN_MS` — e por isso
     nenhum deles vê a constante encolher: eles importam a MESMA constante que
     encolheu, e continuam concordando com ela. Foi o defeito S186 escapando de
     vinte testes verdes, e é o mesmo erro que criou o D-007. */
  s.teste('o cooldown do código é as 24 h que a Spec escreve', () => {
    const spec = readFileSync(new URL(
      '../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md', import.meta.url).pathname, 'utf8');
    const m = spec.match(/aumentar limite\s*->\s*pedido registrado \+ cooldown de (\d+)\s*h/);
    ok(m, 'não achei o cooldown no §28.3 — o teste perdeu a âncora no documento');
    igual(COOLDOWN_MS, Number(m[1]) * 60 * 60 * 1000,
      `o código usa ${COOLDOWN_MS / 3600000} h e a Spec escreve ${m[1]} h. ` +
      `Cooldown encurtado é o §28.3 inteiro perdido, e nenhum outro teste daqui ` +
      `o vê: todos comparam com a própria constante.`);
  });

  /* --- REDUZIR É IMEDIATO ------------------------------------------------- */

  s.teste('definir um limite pela primeira vez vale IMEDIATAMENTE', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                          valor: 500, agora: c.agoraDe() });
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 500,
      'o limite novo não valeu na hora');
  });

  s.teste('REDUZIR um limite existente vale IMEDIATAMENTE', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 500, agora: c.agoraDe() });
    const r = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                    valor: 100, agora: c.agoraDe() });
    igual(r.vigente, true, 'a redução ficou pendente de cooldown');
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 100,
      'reduzir não valeu na hora — quem está se protegendo esperaria 24 h para isso');
  });

  /* --- AUMENTAR PEDE COOLDOWN -------------------------------------------- */

  s.teste('AUMENTAR um limite NÃO vale na hora: vira pedido com prazo', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    const r = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                    valor: 5000, agora: c.agoraDe() });
    igual(r.vigente, false,
      'o aumento valeu na hora. É o jogador em perseguição de perda elevando o ' +
      'limite exatamente no momento em que ele deveria segurar.');
    ok(r.efetivoEm >= c.agoraDe() + COOLDOWN_MS,
      `o pedido fica efetivo em ${r.efetivoEm - c.agoraDe()} ms; o cooldown é ${COOLDOWN_MS}`);
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 100,
      'o limite antigo já subiu antes do prazo');
  });

  s.teste('passado o cooldown o aumento ainda EXIGE confirmação ativa', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 5000, agora: c.agoraDe() });
    c.avancar(COOLDOWN_MS + 1000);
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 100,
      'o aumento entrou sozinho depois do prazo. A Spec pede cooldown E ' +
      'confirmação ativa: quem pediu por impulso não confirma 24 h depois, e ' +
      'entrar sozinho apaga exatamente essa diferença.');
    confirmarAumento(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', agora: c.agoraDe() });
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 5000,
      'confirmou depois do prazo e o limite não subiu');
  });

  s.teste('confirmar ANTES do prazo é recusado', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 5000, agora: c.agoraDe() });
    c.avancar(COOLDOWN_MS - 1000);
    const e = recusa(() => confirmarAumento(c.db, { userId: c.u.id,
      tipo: 'max_stake_per_round', agora: c.agoraDe() }));
    ok(e, 'confirmou um segundo antes do prazo — o cooldown existe para separar ' +
          'a decisão do impulso, e um segundo não separa nada');
    igual(e.codigo, ERRO_LIMITE.COOLDOWN, `código veio "${e.codigo}"`);
  });

  /* REMOVER É AUMENTO. É a linha da Spec que mais parece detalhe e é a que fecha
     a porta: sem ela, o caminho para burlar o cooldown é remover e recriar. */
  s.teste('REMOVER um limite é tratado como aumento', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    const r = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                    valor: null, agora: c.agoraDe() });
    igual(r.vigente, false,
      'remover valeu na hora. É a porta dos fundos do cooldown: remove e recria ' +
      'no valor que quiser, sem esperar.');
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 100,
      'o limite sumiu antes do prazo');
  });

  s.teste('pedir de novo o MESMO aumento não reinicia nem encurta o prazo', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    const p1 = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                     valor: 5000, agora: c.agoraDe() });
    c.avancar(COOLDOWN_MS / 2);
    const p2 = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                     valor: 5000, agora: c.agoraDe() });
    igual(p2.efetivoEm, p1.efetivoEm,
      'pedir de novo mexeu no prazo. Se reiniciar, insistir castiga; se encurtar, ' +
      'insistir burla. O prazo é do PEDIDO, e ele não se move.');
  });

  s.teste('um pedido de aumento MAIOR substitui o anterior e reinicia o prazo', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 500, agora: c.agoraDe() });
    c.avancar(COOLDOWN_MS - 1000);
    const p2 = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
                                     valor: 9000, agora: c.agoraDe() });
    ok(p2.efetivoEm >= c.agoraDe() + COOLDOWN_MS,
      'pedir MAIS herdou o prazo do pedido menor — bastaria pedir pouco, esperar ' +
      '23 h e pedir muito');
  });

  /* --- O LIMITE BLOQUEIA DE VERDADE, NO SERVIDOR ------------------------- */

  s.teste('a aposta acima do limite por rodada é RECUSADA', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 200, agora: c.agoraDe() });
    c.sched.abrirRodada();
    const e = recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                                           valor: 201, agora: c.agoraDe() }));
    ok(e, 'apostou 201 com limite de 200. O limite tem que valer no MESMO caminho ' +
          'que aceita a aposta, e não numa tela que o cliente pode não desenhar.');
    igual(e.codigo, ERRO_LIMITE.BLOQUEADO, `código veio "${e.codigo}"`);
  });

  s.teste('a aposta DENTRO do limite passa', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 200, agora: c.agoraDe() });
    c.sched.abrirRodada();
    ok(apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 200, agora: c.agoraDe() }),
      'a fronteira exata foi recusada — limite que erra o próprio limite');
  });

  /* A SPEC PEDE TRÊS COISAS NA RECUSA, e um `false` seco satisfaria a regra de
     negócio e falharia a de proteção. */
  s.teste('a recusa diz QUAL limite, QUANTO falta e QUANDO volta', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_rounds_dia', valor: 2, agora: c.agoraDe() });
    registrarRodada(c.db, { userId: c.u.id, agora: c.agoraDe() });
    registrarRodada(c.db, { userId: c.u.id, agora: c.agoraDe() });
    const v = avaliarRodada(c.db, { userId: c.u.id, agora: c.agoraDe() });
    igual(v.ok, false, 'a terceira rodada do dia passou com limite de 2');
    igual(v.limite, 'max_rounds_dia', `não disse QUAL limite (veio "${v.limite}")`);
    ok(typeof v.usado === 'number' && typeof v.teto === 'number',
      'não disse QUANTO — sem o número, o jogador não sabe se falta muito ou pouco');
    ok(typeof v.voltaEm === 'number' && v.voltaEm > c.agoraDe(),
      'não disse QUANDO volta. "Você atingiu seu limite" sem prazo é uma parede ' +
      'sem porta, e a Spec pede as três coisas.');
  });

  /* --- perda LÍQUIDA, e não volume -------------------------------------- */

  s.teste('o limite de perda conta perda LÍQUIDA, não volume apostado', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 100, agora: c.agoraDe() });
    /* Apostou 1000, ganhou 950: perdeu 50 líquidos. Contar volume bloquearia
       aqui, e a Spec é explícita — "perda LÍQUIDA, não volume apostado". */
    registrarPerda(c.db, { userId: c.u.id, valor: 1000, agora: c.agoraDe() });
    registrarPerda(c.db, { userId: c.u.id, valor: -950, agora: c.agoraDe() });
    igual(avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() }).ok, true,
      'bloqueou por VOLUME: 1000 apostados com 950 devolvidos são 50 de perda, ' +
      'e o limite é 100');
  });

  s.teste('o limite de perda bloqueia quando a perda líquida chega no teto', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 100, agora: c.agoraDe() });
    registrarPerda(c.db, { userId: c.u.id, valor: 100, agora: c.agoraDe() });
    const v = avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() });
    igual(v.ok, false, 'perdeu 100 com limite de 100 e ainda pôde apostar');
    igual(v.limite, 'max_loss_dia', `disse "${v.limite}"`);
  });

  s.teste('a janela do limite de perda VIRA, e ele solta', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 100, agora: c.agoraDe() });
    registrarPerda(c.db, { userId: c.u.id, valor: 100, agora: c.agoraDe() });
    igual(avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() }).ok, false, 'não bloqueou');
    c.avancar(DIA + 1000);
    igual(avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() }).ok, true,
      'o limite DIÁRIO não soltou no dia seguinte — limite que não solta é ' +
      'autoexclusão disfarçada, e ela tem outro nome e outro fluxo');
  });

  s.teste('a perda de ontem não conta no limite de hoje', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 100, agora: c.agoraDe() });
    registrarPerda(c.db, { userId: c.u.id, valor: 90, agora: c.agoraDe() });
    c.avancar(DIA + 1000);
    registrarPerda(c.db, { userId: c.u.id, valor: 90, agora: c.agoraDe() });
    igual(avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() }).ok, true,
      'somou a perda de ontem no dia de hoje');
  });

  /* O CAMINHO INTEIRO, e não a peça: o settlement é quem alimenta `max_loss`, e
     testar `registrarPerda` sozinho não prova que ALGUÉM a chama com o número
     certo. O S193 — o settlement lançando o stake em vez do líquido — passou
     por dezenove testes verdes exatamente por essa fresta.

     É a lição recorrente do projeto: testar a peça não testa o encaixe. */
  s.teste('a VITÓRIA no settlement não conta como perda no limite diário', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 200, agora: c.agoraDe() });
    const campeao = c.sched.abrirRodada() && c.sched.espiarCampeao(c.sched.rodadaAtual().id);
    const rodadaId = c.sched.rodadaAtual().id;
    const vencedor = c.db.prepare(
      `SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?`).get(rodadaId, campeao);
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: vencedor.slot, valor: 1000,
                    agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: rodadaId, agora: c.agoraDe() });

    const v = avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() });
    igual(v.ok, true,
      `o jogador GANHOU 1.000 e o limite de perda de 200 bloqueou (usado ${v.usado}). ` +
      `O settlement lançou o volume apostado em vez de \`aposta - retorno\`, e a ` +
      `Spec é explícita: perda LÍQUIDA, não volume apostado.`);
  });

  s.teste('a DERROTA no settlement conta a perda inteira', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_loss_dia', valor: 200, agora: c.agoraDe() });
    const rodadaId = c.sched.abrirRodada().id;
    const campeao = c.sched.espiarCampeao(rodadaId);
    const perdedor = c.db.prepare(
      `SELECT slot FROM round_fighters WHERE round_id=? AND species_id<>? LIMIT 1`)
      .get(rodadaId, campeao);
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: perdedor.slot, valor: 300,
                    agora: c.agoraDe() });
    c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    c.sched.tick(); c.sched.tick(); c.sched.tick();
    liquidarRodada(c.db, { sched: c.sched, roundId: rodadaId, agora: c.agoraDe() });

    const v = avaliarAposta(c.db, { userId: c.u.id, valor: 10, agora: c.agoraDe() });
    igual(v.ok, false,
      'perdeu 300 com limite diário de 200 e o limite não viu — o contrapeso do ' +
      'teste de cima: um settlement que não lança NADA passaria nele');
    igual(v.usado, 300, `contou ${v.usado} de perda`);
  });

  /* --- Q9: o bloqueio deixa rastro ---------------------------------------- */

  s.teste('todo bloqueio grava um evento de proteção, e ele não é amostrado', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    c.sched.abrirRodada();
    for (let i = 0; i < 5; i++)
      recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                                   valor: 500, agora: c.agoraDe() }));
    const evs = c.db.prepare(
      `SELECT detalhe FROM responsible_play_events WHERE user_id = ? AND tipo = 'limite_bloqueou'`)
      .all(c.u.id);
    igual(evs.length, 5,
      `cinco bloqueios geraram ${evs.length} eventos. O §17 pede o bloco de ` +
      `proteção SEM AMOSTRAGEM, e amostragem começa exatamente assim: ` +
      `"cinco iguais seguidos, um evento basta".`);
    const d = JSON.parse(evs[0].detalhe);
    igual(d.limite, 'max_stake_per_round', 'o evento não diz qual limite bloqueou');
    ok(typeof d.usado === 'number' && typeof d.teto === 'number',
      'o evento não carrega os números — série sem magnitude não vira `limit_pressure`');
  });

  /* --- Q6 ----------------------------------------------------------------- */

  s.teste('não dá para mexer no limite de OUTRO usuário', () => {
    const c = cenario();
    const outro = cadastrar(c.db, { username: 'b', email: 'b@exemplo.test',
      senha: 'senha-longa-o-bastante-2', nascimento: '1990-01-01', agora: c.agoraDe() });
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    definirLimite(c.db, { userId: outro.id, tipo: 'max_stake_per_round', valor: 9000, agora: c.agoraDe() });
    igual(limitesDe(c.db, c.u.id, c.agoraDe()).max_stake_per_round, 100,
      'o limite de um usuário mudou ao mexer no de outro');
  });

  s.teste('valor de limite inválido é recusado', () => {
    const c = cenario();
    for (const v of [0, -1, 1.5, NaN, Infinity, '100'])
      ok(recusa(() => definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round',
        valor: v, agora: c.agoraDe() })), `valor ${String(v)} foi aceito`);
  });

  s.teste('tipo de limite desconhecido é recusado', () => {
    const c = cenario();
    ok(recusa(() => definirLimite(c.db, { userId: c.u.id, tipo: 'limite_inventado',
      valor: 100, agora: c.agoraDe() })), 'tipo inventado foi aceito');
  });

  /* NÃO PODE EXISTIR CAMINHO QUE ENCURTE O COOLDOWN. A Spec diz "não pode ser
     encurtado por suporte, promoção ou evento" — em código, isso quer dizer que
     a função não aceita um prazo de fora. */
  s.teste('o cooldown NÃO pode ser encurtado por parâmetro', () => {
    const c = cenario();
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100, agora: c.agoraDe() });
    const r = definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 5000,
                                    agora: c.agoraDe(), cooldownMs: 0, cooldown: 0, prazo: 0 });
    ok(r.efetivoEm >= c.agoraDe() + COOLDOWN_MS,
      'um parâmetro de fora encurtou o cooldown. A Spec proíbe encurtá-lo por ' +
      'suporte, promoção ou evento — e a única forma de garantir isso é a função ' +
      'não ter por onde recebê-lo.');
  });

  return s;
}
