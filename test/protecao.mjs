/* Q1/Q3/Q6/Q9 · PAUSA, AUTOEXCLUSÃO E RISCO (F1.9, Spec §28.4 a §28.7).
 *
 * ── O QUE DISTINGUE ESTE BLOCO DO F1.8 ─────────────────────────────────────
 *
 * O limite do §28.3 é do jogador e ele o move — para baixo na hora, para cima
 * com prazo. A autoexclusão do §28.4 **não é dele enquanto dura**:
 *
 *     "irreversível durante o período. Nenhum canal — suporte, admin,
 *      promoção — encurta autoexclusão."
 *
 * Em código isso quer dizer a mesma coisa que o cooldown do F1.8: não existe
 * função que encurte. Não é um `if` que recusa — é a ausência do caminho.
 *
 * ── E O QUE O BLOCO PRECISA IMPEDIR ────────────────────────────────────────
 *
 * A lista de sabotagem do F1.9 é a mais importante da fase, e cada item dela
 * tem teste aqui: autoexclusão que cai no logout, suporte que encurta, conta
 * nova que contorna, marketing que chega mesmo assim, e oferta de retenção
 * disparada pelo próprio pedido de autoexclusão — que é exatamente o que um
 * funil de retenção otimizado faria sozinho.
 */
import { criarSuite, ok, igual, stakeQueCabe } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar, entrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { criarScheduler } from '../server/scheduler.mjs';
import { apostar } from '../server/aposta.mjs';
import { definirLimite } from '../server/limites.mjs';
import {
  pausar, pausaAtiva, DURACOES, TIPOS_PAUSA, ACOES_BLOQUEADAS, ERRO_PROTECAO,
  podeAgir, ligarContas, contasLigadas,
  pedirReentrada, concederReentrada,
  podeReceberMarketing, tentarEnviarMarketing,
  realityCheck, confirmarRealityCheck, INTERVALO_REALITY_CHECK_MS,
  sinaisDeRisco, intervir, ESCALA_INTERVENCAO, SINAIS,
} from '../server/protecao.mjs';

const AGORA = Date.UTC(2026, 0, 15);
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cenario({ saldo = 100000 } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = AGORA;
  const sched = criarScheduler({ db, sims: 500, relogio: () => agora });
  const novo = (n, i) => cadastrar(db, { username: n, email: `${n}@exemplo.test`,
    senha: `senha-longa-o-bastante-${i}`, nascimento: '1990-01-01', agora });
  const u = novo('j', 1);
  creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                 valor: saldo, idem: 'seed', agora });
  return { db, sched, u, novo, avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

export function suite() {
  const s = criarSuite('protecao');

  /* --- o produto OFERECE as durações do §28.4 ----------------------------- */

  s.teste('as durações de cool-off e autoexclusão são as do §28.4', () => {
    igual(DURACOES.cooloff.map(d => d.id).join(','), '24h,72h,7d',
      'as opções de cool-off não são as três do documento');
    igual(DURACOES.self_exclusion.map(d => d.id).join(','), '30d,90d,180d,permanente',
      'as opções de autoexclusão não são as quatro do documento');
    for (const t of TIPOS_PAUSA) ok(DURACOES[t], `o tipo ${t} não tem durações`);
  });

  /* --- A IRREVERSIBILIDADE ------------------------------------------------ */

  s.teste('a pausa bloqueia apostar imediatamente', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    c.sched.abrirRodada();
    const e = recusa(() => apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0,
                                           valor: 100, agora: c.agoraDe() }));
    ok(e, 'apostou durante o cool-off');
  });

  s.teste('NÃO existe caminho para encurtar uma autoexclusão', async () => {
    /* A Spec: "Nenhum canal — suporte, admin, promoção — encurta autoexclusão."
       A garantia não é um `if` que recusa: é a ausência da função. Um módulo
       que exporte `encerrarPausa` já perdeu, porque a rota administrativa do
       F1.11 vai encontrá-la e usá-la de boa-fé. */
    const m = await import('../server/protecao.mjs');
    for (const nome of ['encerrarPausa', 'cancelarPausa', 'removerAutoexclusao',
                        'encurtar', 'liberarConta', 'reverterPausa'])
      ok(!(nome in m),
        `o módulo exporta \`${nome}\`. A irreversibilidade não pode depender de ` +
        `ninguém se lembrar de não chamar — o F1.11 tem painel administrativo, e ` +
        `função exportada é convite.`);
  });

  s.teste('a pausa NÃO cai no logout nem no login novo', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '30d', agora: c.agoraDe() });
    c.avancar(HORA);
    /* Entrar de novo é o caminho mais óbvio de "reset" acidental: quem grava o
       estado de proteção na SESSÃO perde tudo aqui, e o teste existe porque é
       um erro que se comete sem perceber. */
    recusa(() => entrar(c.db, { email: 'j@exemplo.test',
      senha: 'senha-longa-o-bastante-1', agora: c.agoraDe() }));
    ok(pausaAtiva(c.db, c.u.id, c.agoraDe()),
      'a autoexclusão sumiu depois de um novo login');
  });

  s.teste('a pausa expira sozinha, e só pelo decurso do prazo', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    c.avancar(DIA - 1000);
    ok(pausaAtiva(c.db, c.u.id, c.agoraDe()), 'o cool-off soltou um segundo antes');
    c.avancar(2000);
    ok(!pausaAtiva(c.db, c.u.id, c.agoraDe()), 'o cool-off de 24 h não terminou em 24 h');
  });

  s.teste('a autoexclusão permanente não tem fim', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: 'permanente',
                   agora: c.agoraDe() });
    c.avancar(3650 * DIA);
    ok(pausaAtiva(c.db, c.u.id, c.agoraDe()),
      'a permanente expirou em dez anos — `ends_at` nulo é permanente, e um ' +
      '`ate` calculado por engano vira uma data qualquer');
  });

  s.teste('pedir uma pausa MAIOR por cima é aceito; menor não encurta', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '180d', agora: c.agoraDe() });
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    c.avancar(30 * DIA);
    ok(pausaAtiva(c.db, c.u.id, c.agoraDe()),
      'pedir um cool-off curto por cima de uma autoexclusão longa a encurtou — ' +
      'é o encurtamento pela porta do produto, sem nenhum admin envolvido');
  });

  /* --- O QUE FICA BLOQUEADO, E O QUE NÃO ---------------------------------- */

  s.teste('a pausa bloqueia as seis ações econômicas do §28.4', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '72h', agora: c.agoraDe() });
    for (const acao of ['apostar', 'stake_liga', 'comprar_pct', 'p2p_enviar',
                        'p2p_receber', 'exchange', 'faucet'])
      igual(podeAgir(c.db, { userId: c.u.id, acao, agora: c.agoraDe() }).ok, false,
        `a ação "${acao}" passou durante a pausa`);
    ok(ACOES_BLOQUEADAS.includes('p2p_receber'),
      'RECEBER P2P não está bloqueado. A Spec diz "enviar E receber", e receber ' +
      'é o caminho por onde um amigo recoloca o jogador em jogo.');
  });

  s.teste('a pausa NÃO bloqueia leitura: coleção, perfil, histórico e carteira', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '90d', agora: c.agoraDe() });
    for (const acao of ['ver_colecao', 'ver_perfil', 'ver_historico', 'ver_carteira'])
      igual(podeAgir(c.db, { userId: c.u.id, acao, agora: c.agoraDe() }).ok, true,
        `a leitura "${acao}" foi bloqueada. Apagar o vínculo com o jogo transforma ` +
        `a autoexclusão em punição, e o efeito medido é reduzir a adesão a ela.`);
  });

  /* --- A PROPAGAÇÃO: vale por PESSOA, não por conta ----------------------- */

  s.teste('a autoexclusão propaga para conta ligada por sinal de identidade', () => {
    const c = cenario();
    const b = c.novo('b', 2);
    ligarContas(c.db, { userId: c.u.id, outroId: b.id, sinal: 'documento',
                        agora: c.agoraDe() });
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '90d', agora: c.agoraDe() });
    ok(pausaAtiva(c.db, b.id, c.agoraDe()),
      'a conta ligada continuou livre. A Spec diz que vale por PESSOA: sem isso, ' +
      'o contorno é a segunda conta, que é o contorno mais usado que existe.');
  });

  s.teste('a conta CRIADA depois, com sinal ligado, já nasce bloqueada', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '90d', agora: c.agoraDe() });
    const nova = c.novo('c', 3);
    ligarContas(c.db, { userId: c.u.id, outroId: nova.id, sinal: 'dispositivo',
                        agora: c.agoraDe() });
    ok(pausaAtiva(c.db, nova.id, c.agoraDe()),
      'criar conta depois da autoexclusão contornou o bloqueio — a propagação ' +
      'precisa valer na ligação, e não só no momento da exclusão');
  });

  s.teste('contas não ligadas não são arrastadas junto', () => {
    const c = cenario();
    const estranho = c.novo('d', 4);
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '90d', agora: c.agoraDe() });
    ok(!pausaAtiva(c.db, estranho.id, c.agoraDe()),
      'uma conta sem nenhum sinal em comum foi bloqueada junto');
    igual(contasLigadas(c.db, estranho.id).length, 0, 'apareceu ligação onde não há');
  });

  /* AÇÃO QUE NINGUÉM CLASSIFICOU É RECUSADA DURANTE A PAUSA.
   *
   * Os testes de pausa exercitavam ações das duas listas — bloqueadas e
   * liberadas — e nenhum exercitava o TERCEIRO caso, que é o que mais importa:
   * a ação que ainda não existia quando as listas foram escritas.
   *
   * O defeito plantado S204 troca a recusa por `{ ok: true }` e passou pela
   * suíte inteira. O que ele descreve é o modo de falha real: alguém escreve
   * uma feature nova, esquece de classificá-la, e ela nasce furando a
   * autoexclusão de quem pediu para parar. */
  s.teste('ação NÃO classificada é recusada durante a pausa', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    for (const acao of ['comprar_pacote_novo', 'entrar_no_torneio', 'trocar_com_amigo', '']) {
      const r = podeAgir(c.db, { userId: c.u.id, acao, agora: c.agoraDe() });
      igual(r.ok, false,
        `\`${acao}\` passou durante a pausa sem estar em lista nenhuma. Ação que ` +
        `ninguém classificou é ação que ninguém pensou, e o lado seguro de errar ` +
        `aqui é o que NÃO deixa o jogador voltar a gastar.`);
      igual(r.motivo, 'acao_nao_classificada',
        `a recusa de \`${acao}\` não diz que ela é desconhecida — sem isso ninguém ` +
        `descobre que falta classificá-la`);
    }
    /* O CONTRAPESO: sem pausa, a mesma ação desconhecida passa. Senão este teste
       seria satisfeito por um `podeAgir` que recusa tudo. */
    const livre = cenario();
    igual(podeAgir(livre.db, { userId: livre.u.id, acao: 'comprar_pacote_novo',
                               agora: livre.agoraDe() }).ok, true,
      'sem pausa nenhuma, uma ação desconhecida foi recusada');
  });

  /* --- A REENTRADA É ATIVA ------------------------------------------------ */

  s.teste('ao expirar, a reentrada é PEDIDA, nunca automática', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '30d', agora: c.agoraDe() });
    c.avancar(31 * DIA);
    igual(podeAgir(c.db, { userId: c.u.id, acao: 'apostar', agora: c.agoraDe() }).ok, false,
      'a conta voltou a apostar sozinha ao vencer o prazo. A Spec pede reentrada ' +
      'ATIVA: voltar sozinho é o produto decidindo por quem pediu para parar.');
    pedirReentrada(c.db, { userId: c.u.id, agora: c.agoraDe() });
    concederReentrada(c.db, { userId: c.u.id, agora: c.agoraDe() });
    igual(podeAgir(c.db, { userId: c.u.id, acao: 'apostar', agora: c.agoraDe() }).ok, true,
      'pediu e não voltou');
  });

  /* O CASO QUE FALTAVA, e ele escapou de 283 defeitos.
   *
   * O teste acima SEMPRE pede antes de conceder — monta o caminho feliz e mede
   * só ele. Tirar a conferência do pedido ficava invisível: o defeito plantado
   * S202 passou pela suíte inteira.
   *
   * E a regra é justamente a que ele quebra. "Ao expirar, a reentrada é ATIVA:
   * o jogador precisa pedir." Conceder sem pedido é o produto decidindo por
   * quem pediu para parar — a pausa vence, a conta volta sozinha, e ninguém
   * perguntou nada a ela. */
  s.teste('conceder reentrada SEM o jogador ter pedido é recusado', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '30d', agora: c.agoraDe() });
    c.avancar(31 * DIA);
    const e = recusa(() => concederReentrada(c.db, { userId: c.u.id, agora: c.agoraDe() }));
    ok(e,
      'a reentrada foi concedida sem pedido nenhum. O prazo venceu, e o produto ' +
      'decidiu por quem pediu para parar — é exatamente o que "reentrada ATIVA" ' +
      'existe para impedir.');
    igual(podeAgir(c.db, { userId: c.u.id, acao: 'apostar', agora: c.agoraDe() }).ok, false,
      'a conta voltou a poder apostar mesmo com a concessão recusada');
  });

  s.teste('a reentrada NÃO pode ser concedida antes do prazo', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '30d', agora: c.agoraDe() });
    c.avancar(10 * DIA);
    const e = recusa(() => concederReentrada(c.db, { userId: c.u.id, agora: c.agoraDe() }));
    ok(e, 'concedeu reentrada no meio da autoexclusão — é o encurtamento com ' +
          'outro nome, e é o que a Spec chama de irreversível');
    igual(e.codigo, ERRO_PROTECAO.EM_VIGOR, `código veio "${e.codigo}"`);
  });

  /* --- MARKETING: nenhum, em nenhum canal --------------------------------- */

  s.teste('conta em pausa não recebe marketing em canal nenhum', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    igual(podeReceberMarketing(c.db, c.u.id, c.agoraDe()), false, 'liberou marketing');
    for (const canal of ['push', 'email', 'in_game'])
      igual(tentarEnviarMarketing(c.db, { userId: c.u.id, canal, campanha: 'volta-ai',
                                          agora: c.agoraDe() }).enviado, false,
        `o canal ${canal} entregou. A Spec pede que isso seja verificado NO ` +
        `SERVIÇO DE NOTIFICAÇÃO, e não por convenção — convenção é o que falha ` +
        `no dia em que alguém cria um canal novo.`);
  });

  s.teste('a recusa de marketing fica registrada', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    tentarEnviarMarketing(c.db, { userId: c.u.id, canal: 'push', campanha: 'x',
                                  agora: c.agoraDe() });
    const n = c.db.prepare(
      `SELECT COUNT(*) AS n FROM responsible_play_events
        WHERE user_id = ? AND tipo = 'marketing_bloqueado'`).get(c.u.id).n;
    ok(n >= 1, 'bloquear sem registrar não demonstra nada numa revisão depois');
  });

  /* O ITEM MAIS FÁCIL DE ERRAR DA LISTA, porque nenhum teste comum o pega: o
     pedido de autoexclusão disparando uma oferta para segurar o jogador. */
  s.teste('pedir pausa NÃO dispara oferta de retenção', () => {
    const c = cenario();
    pausar(c.db, { userId: c.u.id, tipo: 'self_exclusion', duracao: '30d', agora: c.agoraDe() });
    const ofertas = c.db.prepare(
      `SELECT COUNT(*) AS n FROM responsible_play_events
        WHERE user_id = ? AND tipo IN ('oferta_retencao','oferta_bonus','marketing_enviado')`)
      .get(c.u.id).n;
    igual(ofertas, 0,
      'o pedido de autoexclusão gerou oferta. É exatamente o que um funil de ' +
      'retenção otimizado faria sozinho, e por isso a Spec escreve a proibição.');
  });

  /* --- REALITY CHECK (§28.5) ---------------------------------------------- */

  s.teste('o reality check aparece no intervalo configurado', () => {
    const c = cenario();
    igual(realityCheck(c.db, { userId: c.u.id, agora: c.agoraDe() }).mostrar, false,
      'apareceu antes de haver sessão');
    c.sched.abrirRodada();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    c.avancar(INTERVALO_REALITY_CHECK_MS + 1000);
    const r = realityCheck(c.db, { userId: c.u.id, agora: c.agoraDe() });
    igual(r.mostrar, true, 'não apareceu depois do intervalo');
    ok(typeof r.duracaoMs === 'number' && typeof r.liquidoDaSessao === 'number',
      'o aviso não traz tempo de sessão E resultado líquido — a Spec pede os dois');
  });

  s.teste('a confirmação do reality check fica registrada', () => {
    const c = cenario();
    c.sched.abrirRodada();
    apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: 100, agora: c.agoraDe() });
    c.avancar(INTERVALO_REALITY_CHECK_MS + 1000);
    confirmarRealityCheck(c.db, { userId: c.u.id, agora: c.agoraDe() });
    const n = c.db.prepare(
      `SELECT COUNT(*) AS n FROM responsible_play_events
        WHERE user_id = ? AND tipo = 'reality_check_confirmado'`).get(c.u.id).n;
    igual(n, 1, 'a confirmação não deixou rastro');
    igual(realityCheck(c.db, { userId: c.u.id, agora: c.agoraDe() }).mostrar, false,
      'continuou aparecendo depois de confirmado — o intervalo reinicia na ' +
      'confirmação, senão o aviso vira um laço');
  });

  /* --- OS SETE SINAIS (§28.6) --------------------------------------------- */

  s.teste('os sete sinais do §28.6 existem', () => {
    for (const nome of ['chasing', 'velocity', 'session_length', 'depth',
                        'recovery_deposit', 'odd_hour', 'limit_pressure'])
      ok(SINAIS.includes(nome), `o sinal ${nome} não existe`);
  });

  s.teste('a escala de intervenção é a do documento, nesta ordem', () => {
    igual(ESCALA_INTERVENCAO.join(' > '),
      ['informacao_passiva', 'reality_check_antecipado', 'sugestao_de_limite',
       'cooloff_oferecido', 'restricao_temporaria'].join(' > '),
      'a escala mudou de ordem. Ela é ordenada de propósito: pular para a ' +
      'restrição é o produto punindo antes de informar.');
  });

  s.teste('`chasing` é aumento de stake APÓS PERDA, e não stake alta', () => {
    const c = cenario();
    c.sched.abrirRodada();
    /* Aposta grande e constante NÃO é chasing: é apostador de stake alta.
       Confundir os dois faz o sistema intervir em quem não mudou nada. */
    /* O VALOR SAI DA RODADA, e não de um número escolhido à mão: apostar 500
       fixo é apostar contra o sorteio, e o teto do §4.4.6 recusava em 0,7% das
       raízes — ver D-021. O que este teste mede é stake CONSTANTE, e constante
       ele continua sendo. */
    const stake = stakeQueCabe(c.sched, 0, 500);
    for (let i = 0; i < 5; i++) {
      apostar(c.db, { sched: c.sched, userId: c.u.id, slot: 0, valor: stake, agora: c.agoraDe() });
      c.avancar(60_000);
    }
    ok(!sinaisDeRisco(c.db, { userId: c.u.id, agora: c.agoraDe() }).includes('chasing'),
      'stake alta e CONSTANTE foi lida como perseguição de perda — o §28.6 diz ' +
      'que a base é a mudança da própria conta, não o nível');
  });

  /* `chasing` OLHA A MUDANÇA, NUNCA O NÍVEL — e agora com stakes controladas.
   *
   * O teste que já existia aposta pela rodada, e o valor dele depende do
   * `stakeMax` do slot, que depende do sorteio. Quando o sorteio dava menos de
   * 500, o defeito plantado S205 — que troca a conjunção por `stake >= 500` —
   * não acendia, e escapava. É o D-021 pela terceira vez: teste cujo poder
   * depende do sorteio é teste que às vezes não testa.
   *
   * Aqui a série é montada DIRETO na tabela, e é o certo para esta regra: o que
   * o §28.6 diz é sobre a SÉRIE de apostas, não sobre o caminho que as criou.
   * O outro teste continua existindo e mede o encaixe; este mede a regra. */
  s.teste('`chasing` ignora o NÍVEL da stake, por mais alta que seja', () => {
    const c = cenario();
    const t = c.agoraDe();
    /* Uma rodada por aposta: o esquema tem `UNIQUE (user_id, round_id)`, que é
       a invariante "uma aposta por rodada por jogador" escrita onde ela não
       pode ser esquecida. Montar a série exige respeitá-la. */
    const serie = (db, userId, valores) => {
      const rodada = db.prepare(
        `INSERT INTO rounds (id, status, round_seed_commit, engine_version, content_version,
                             betting_opens_at, betting_locks_at, environment)
         VALUES (?, 'encerrada', 'x', 'v', 'v', ?, ?, 'teste')`);
      const aposta = db.prepare(
        `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd,
                           status, payout, created_at)
         VALUES (?, ?, ?, 0, 1, ?, 2.0, 'perdida', 0, ?)`);
      valores.forEach((v, i) => {
        const quando = t + i * 60_000;
        rodada.run(`rod${i}`, quando, quando + 30_000);
        aposta.run(`b${i}`, userId, `rod${i}`, v, quando);
      });
    };

    /* Dez apostas de 5.000, todas PERDIDAS, todas do mesmo tamanho. É o
       apostador de stake alta: ele não mudou nada, e o §28.6 é explícito —
       "detectar mudança, não classificar perfil". */
    serie(c.db, c.u.id, Array(10).fill(5000));
    ok(!sinaisDeRisco(c.db, { userId: c.u.id, agora: t + 11 * 60_000 }).includes('chasing'),
      'dez apostas de 5.000 iguais acenderam `chasing`. O sinal virou um limiar ' +
      'sobre o VALOR, e o sistema passa a intervir em quem não mudou nada — ' +
      'enquanto deixa passar quem dobra de 10 para 20 depois de perder.');

    /* O CONTRAPESO, e ele é obrigatório: com AUMENTO após perda, o sinal TEM
       que acender. Sem esta metade, o teste acima é satisfeito por um `chasing`
       que nunca acende. */
    const d = cenario();
    serie(d.db, d.u.id, [10, 20, 40, 80, 160]);
    ok(sinaisDeRisco(d.db, { userId: d.u.id, agora: t + 6 * 60_000 }).includes('chasing'),
      'dobrar a aposta quatro vezes seguidas depois de perder NÃO acendeu ' +
      '`chasing`. É a perseguição de perda em estado puro, e é para isso que o ' +
      'sinal existe.');
  });

  s.teste('`limit_pressure` sobe com pedidos repetidos de aumento de limite', () => {
    const c = cenario();
    ok(!sinaisDeRisco(c.db, { userId: c.u.id, agora: c.agoraDe() }).includes('limit_pressure'),
      'o sinal já nasce ligado — sinal que sempre acusa não distingue ninguém');
    definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: 100,
                          agora: c.agoraDe() });
    /* Três pedidos de aumento em dias seguidos. É o sinal que o F1.8 alimenta
       sem saber: cada pedido grava um evento, e é a série que fala. */
    for (const v of [500, 2000, 9000]) {
      c.avancar(DIA);
      definirLimite(c.db, { userId: c.u.id, tipo: 'max_stake_per_round', valor: v,
                            agora: c.agoraDe() });
    }
    ok(sinaisDeRisco(c.db, { userId: c.u.id, agora: c.agoraDe() }).includes('limit_pressure'),
      'três pedidos de aumento em três dias não acenderam `limit_pressure` — é o ' +
      'sinal mais barato de todos, porque o F1.8 já grava o evento');
  });

  s.teste('toda intervenção é registrada com id, sinal e desfecho', () => {
    const c = cenario();
    const i = intervir(c.db, { userId: c.u.id, nivel: 'reality_check_antecipado',
                               sinal: 'velocity', agora: c.agoraDe() });
    ok(i.intervencaoId, 'a intervenção não tem id');
    const ev = c.db.prepare(
      `SELECT detalhe FROM responsible_play_events
        WHERE user_id = ? AND tipo = 'intervencao'`).get(c.u.id);
    ok(ev, 'a intervenção não foi registrada');
    const d = JSON.parse(ev.detalhe);
    igual(d.sinal, 'velocity', 'o registro não diz qual sinal disparou');
    ok('desfecho' in d,
      'o registro não tem desfecho. "Sem esse registro não há como demonstrar ' +
      'depois que o sistema agiu — e é o registro, não a intenção, que vale."');
  });

  s.teste('nível de intervenção inventado é recusado', () => {
    const c = cenario();
    ok(recusa(() => intervir(c.db, { userId: c.u.id, nivel: 'banir', sinal: 'depth',
                                     agora: c.agoraDe() })), 'nível fora da escala foi aceito');
    ok(recusa(() => intervir(c.db, { userId: c.u.id, nivel: 'informacao_passiva',
                                     sinal: 'inventado', agora: c.agoraDe() })),
      'sinal fora do §28.6 foi aceito');
  });

  /* --- Q6 ----------------------------------------------------------------- */

  s.teste('não dá para pausar nem ler risco de OUTRO usuário por engano', () => {
    const c = cenario();
    const b = c.novo('e', 5);
    pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '24h', agora: c.agoraDe() });
    ok(!pausaAtiva(c.db, b.id, c.agoraDe()), 'a pausa vazou para outra conta');
    igual(sinaisDeRisco(c.db, { userId: b.id, agora: c.agoraDe() }).length, 0,
      'os sinais de um usuário apareceram para outro');
  });

  s.teste('tipo e duração de pausa inválidos são recusados', () => {
    const c = cenario();
    ok(recusa(() => pausar(c.db, { userId: c.u.id, tipo: 'ferias', duracao: '24h',
                                   agora: c.agoraDe() })), 'tipo inventado foi aceito');
    ok(recusa(() => pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: '5min',
                                   agora: c.agoraDe() })), 'duração inventada foi aceita');
    ok(recusa(() => pausar(c.db, { userId: c.u.id, tipo: 'cooloff', duracao: 'permanente',
                                   agora: c.agoraDe() })),
      'cool-off PERMANENTE foi aceito — cool-off tem três durações e nenhuma delas ' +
      'é para sempre; a permanente é autoexclusão e tem outro fluxo de reentrada');
  });

  return s;
}
