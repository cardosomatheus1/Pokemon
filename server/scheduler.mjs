/* O SCHEDULER AUTORITATIVO — o servidor é dono do relógio e do ciclo (F1.5).
 *
 * Fronteira: gera a rodada, precifica, abre e fecha a janela, simula e encerra.
 * Não move dinheiro (isso é a carteira), não conhece sessão, não serve HTTP.
 *
 * ── A MUDANÇA DE PODER ─────────────────────────────────────────────────────
 *
 * Até o F1.4 o cliente iniciava a rodada, sorteava a semente e calculava o
 * preço. Isso é aceitável num protótipo de um jogador só e é indefensável com
 * dois: **quem escolhe a semente escolhe a luta, e quem calcula o preço escolhe
 * a odd.** Daqui em diante o cliente perde os dois direitos, e a API não tem
 * rota para pedir a próxima rodada.
 *
 * ── O RELÓGIO É INJETADO ───────────────────────────────────────────────────
 *
 * `relogio()` e não `Date.now()`. Não é só testabilidade: um ciclo de 30 s numa
 * suíte trocaria cobertura por paciência, e o D-005 registrou o preço de um
 * teste que depende do relógio da máquina — ele falha em janeiro, e ninguém
 * entende por quê.
 *
 * ── O QUE O CLIENTE VÊ ─────────────────────────────────────────────────────
 *
 * `paraCliente()` é construído por LISTA BRANCA, campo a campo. Serializar o
 * objeto da rodada e "tirar o que não pode" é a forma de vazar o campo que
 * alguém acrescentar amanhã — e o campo novo é justamente o que ninguém lembra
 * de conferir. Aqui, campo novo não aparece até alguém o escrever nesta função.
 */
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { montarRodadaServidor, M, VERSAO_MOTOR } from './rodada.mjs';
import { sementes, novaRaiz as raizNova, derivar } from '../engine/seed.mjs';
import { mensagemCommit } from '../engine/commit.mjs';
import { CONF } from '../engine/engine.mjs';
import { travarApostas } from './aposta.mjs';

export const ESTADOS = {
  AGENDADA:  'agendada',
  ABERTA:    'aberta',
  TRAVADA:   'travada',
  EM_LUTA:   'emLuta',
  ENCERRADA: 'encerrada',
  CANCELADA: 'cancelada',
};

/* As fases, em milissegundos. A janela de 30 s é a do §5.5; as outras duas
   existem para o cliente ter tempo de montar a cena e de assistir. */
export const FASE_MS = {
  APOSTA:  30_000,
  PREPARO:  3_000,
  LUTA:    45_000,
};

export function criarScheduler({ db, sims = CONF.SIMS, relogio = Date.now, ambiente = 'teste' }) {
  let atual = null;      // a rodada em memória, com o segredo
  const segredos = new Map();

  /* A SEMENTE VEM DO CSPRNG, e nunca de fora. `Math.random()` seria previsível
     o bastante para alguém que observe algumas rodadas — e a semente é a luta
     inteira.

     F1.15 · 128 BITS, e não 32. A raiz de 32 bits era recuperável a partir da
     pool publicada: doze lutadores entre 76, ordenados, carregam ~74 bits de
     informação sobre ela, e varrer 2^32 leva ~59 min num núcleo — de UMA vez,
     porque o mapa não depende da rodada. Com a janela aberta, dava para saber
     o campeão. É o D-018.

     A função mora no `engine/seed.mjs` porque o cliente precisa da MESMA — é a
     paridade do F1.1 continuando a valer. */
  const novaRaiz = () => raizNova();

  function abrirRodada(_pedido = {}) {
    /* O ARGUMENTO EXISTE E É IGNORADO, de propósito.
       Aceitar `raiz` do cliente é o defeito que este bloco existe para tornar
       impossível; recusar o argumento com erro esconderia a tentativa. Ele
       entra, é descartado, e o teste prova que foi descartado. */
    if (atual && atual.status !== ESTADOS.ENCERRADA && atual.status !== ESTADOS.CANCELADA)
      throw Object.assign(new Error('já existe rodada em andamento'), { codigo: 'rodada_em_andamento' });

    const agora = relogio();
    const raiz = novaRaiz();
    const id = randomUUID();
    const preco = montarRodadaServidor(raiz, sims);

    /* O commit é síncrono aqui por construção: `comprometer` é async, e o
       scheduler precisa ser síncrono para o tick não deixar a rodada num
       estado intermediário. Resolvido pré-computando na abertura. */
    const compromisso = comprometerSync(raiz);

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(
        `INSERT INTO rounds (id, status, round_seed_commit, engine_version, content_version,
                             betting_opens_at, betting_locks_at, environment, sims, margem_efetiva)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, ESTADOS.ABERTA, compromisso.commit, VERSAO_MOTOR, M.pack?.versao ?? 'kanto-v1',
             agora, agora + FASE_MS.APOSTA, ambiente, sims, preco.margemEfetiva);

      /* O REGISTRO DE PREÇO DO §4.4.5 É GRAVADO NA ABERTURA.
         "Odd auditável" quer dizer que a odd OFERECIDA fica guardada — não
         recalculada depois com o código de amanhã, que pode não ser o de hoje. */
      const ins = db.prepare(
        `INSERT INTO round_fighters (round_id, slot, species_id, probability,
                                     erro_relativo, fair_odd, offered_odd)
         VALUES (?,?,?,?,?,?,?)`);
      preco.lutadores.forEach((l, slot) =>
        ins.run(id, slot, l.dex, l.prob, l.erroRelativo, l.fair, l.odd));
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }

    segredos.set(id, { raiz, sal: compromisso.sal });
    /* OS PRAZOS SÃO ABSOLUTOS E NASCEM TODOS AQUI.
     *
     * A primeira versão calculava cada prazo no momento da transição
     * (`lutaEm = agora + PREPARO`, dentro do tick). Parece igual e não é: um
     * tick ATRASADO — processo ocupado, GC, máquina lenta — deslocava todo o
     * resto do ciclo para a frente, e a rodada terminava depois do que ela
     * mesma tinha publicado. O teste pegou na hora: dois ticks no mesmo
     * instante não avançavam de fase, porque o segundo prazo tinha acabado de
     * ser criado a partir daquele instante.
     *
     * Com prazos absolutos, um tick atrasado ALCANÇA o estado certo em vez de
     * empurrar o cronograma. */
    atual = { id, raiz, status: ESTADOS.ABERTA, round_seed_commit: compromisso.commit,
              abreEm: agora,
              travaEm:   agora + FASE_MS.APOSTA,
              lutaEm:    agora + FASE_MS.APOSTA + FASE_MS.PREPARO,
              terminaEm: agora + FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA,
              campeaoDex: null, preco };
    return atual;
  }

  /* O TICK — o ciclo anda sozinho, e é isso que "autoritativo" quer dizer.
     Sem cliente nenhum conectado, a rodada abre, fecha, simula e encerra. */
  function tick() {
    if (!atual) return null;
    const agora = relogio();

    if (atual.status === ESTADOS.ABERTA && agora >= atual.travaEm) {
      /* FECHAR A JANELA É O QUE REVELA A SEMENTE (§4.5). Antes disso ela não
         existe em resposta nenhuma; depois, ela é publicada com o sal para
         qualquer um conferir o commit. */
      const seg = segredos.get(atual.id);
      db.prepare(`UPDATE rounds SET status=?, round_seed_reveal=?, round_seed_sal=?,
                  battle_starts_at=? WHERE id=?`)
        .run(ESTADOS.TRAVADA, String(seg.raiz), seg.sal, atual.lutaEm, atual.id);
      atual.status = ESTADOS.TRAVADA;
      /* AS APOSTAS TRAVAM NO MESMO INSTANTE EM QUE A SEMENTE É REVELADA, e não
         num passo separado. Qualquer folga entre as duas coisas é uma janela em
         que alguém conhece o resultado e a aposta ainda aceita mudança. */
      travarApostas(db, { roundId: atual.id, agora });
      return atual;
    }

    if (atual.status === ESTADOS.TRAVADA && agora >= atual.lutaEm) {
      db.prepare(`UPDATE rounds SET status=? WHERE id=?`).run(ESTADOS.EM_LUTA, atual.id);
      atual.status = ESTADOS.EM_LUTA;
      /* A BATALHA É SIMULADA AGORA, de uma vez, e guardada. O cliente ANIMA o
         que já aconteceu — não simula em paralelo. Simular nos dois lados seria
         apostar que duas execuções concordam, e é a aposta que o §P3 existe
         para não precisar fazer. */
      atual.batalha = simularDaRaiz(atual.raiz);
      return atual;
    }

    if (atual.status === ESTADOS.EM_LUTA && agora >= atual.terminaEm) {
      db.prepare(`UPDATE rounds SET status=?, champion_species_id=?, closed_at=? WHERE id=?`)
        .run(ESTADOS.ENCERRADA, atual.batalha.campeaoDex, agora, atual.id);
      atual.status = ESTADOS.ENCERRADA;
      /* O campeão passa a existir também no objeto em memória. Ele estava só na
         coluna, e quem lê `rodadaAtual()` — o transporte do F1.6, entre outros —
         não tem por que fazer uma consulta para saber quem ganhou. */
      atual.campeaoDex = atual.batalha.campeaoDex;
      return atual;
    }
    return atual;
  }

  /* ── O QUE O CLIENTE VÊ ────────────────────────────────────────────────
   *
   * LISTA BRANCA, campo a campo. Serializar a rodada e remover o proibido é
   * como o campo novo vaza: ele nasce incluído e ninguém lembra de excluí-lo.
   * Aqui ele nasce de fora e só entra se alguém o escrever nesta função. */
  function paraCliente() {
    if (!atual) return null;
    const publico = {
      id: atual.id,
      fase: atual.status,
      commit: atual.round_seed_commit,
      versaoMotor: VERSAO_MOTOR,
      sims,
      margemEfetiva: atual.preco.margemEfetiva,
      erroPior: atual.preco.erroPior,
      abreEm: atual.abreEm,
      travaEm: atual.travaEm,
      /* AS DUAS SEMENTES COSMÉTICAS, e a escolha de publicá-las é do F1.14.
       *
       * O cliente em modo servidor monta a pool e a arena DURANTE a janela de
       * aposta, e as duas saem de ramos da raiz. Publicar os ramos era
       * impossível até o F1.15: com raiz de 32 bits, `misturar()` é bijetiva e
       * um ramo publicado devolvia a raiz em O(1) — a ideia foi tentada e
       * morreu na medição, está no D-018.
       *
       * Com raiz de 128 bits e ramo saindo de SHA-256, medido: varrer custa
       * 5,3×10²⁴ anos, e um bit de diferença na raiz muda 16,1 dos 32 bits do
       * ramo (difusão perfeita é 16).
       *
       * SÓ AS COSMÉTICAS. `ambiente` decide o clima, que dá bônus de stat, e
       * `batalha` é a luta — os dois continuam saindo só depois do fechamento,
       * junto da raiz. A lista branca desta função é o que garante isso: campo
       * novo não aparece aqui até alguém escrevê-lo. */
      sementeElenco: derivar(atual.raiz, 'elenco'),
      sementeVisual: derivar(atual.raiz, 'visual'),
      lutadores: atual.preco.lutadores.map(l => ({
        slot: l.idx, dex: l.dex, nome: l.nome,
        prob: l.prob, erroRelativo: l.erroRelativo,
        odd: l.odd, stakeMax: l.stakeMax, limite: l.limite,
      })),
    };
    /* A SEMENTE E OS EVENTOS SÓ DEPOIS DO FECHAMENTO, e a condição é o STATUS —
       não o relógio. Relógio adiantado no cliente não abre nada. */
    if (atual.status !== ESTADOS.ABERTA) {
      const seg = segredos.get(atual.id);
      publico.revelado = { raiz: seg.raiz, sal: seg.sal };
      if (atual.batalha) publico.eventosDaLuta = atual.batalha.eventos;
    }
    return publico;
  }

  /* Auxiliares que só o TESTE usa. Ficam declarados como tal: função de teste
     escondida entre as de produção é superfície que alguém acha em produção. */
  const espiarCampeao = id => {
    const seg = segredos.get(id);
    return seg ? simularDaRaiz(seg.raiz).campeaoDex : null;
  };
  const campeaoDaRaiz = raiz => simularDaRaiz(raiz).campeaoDex;

  return {
    abrirRodada, tick, paraCliente,
    rodadaAtual: () => atual,
    espiarCampeao, campeaoDaRaiz,
  };
}

/* ── auxiliares ────────────────────────────────────────────────────────── */

/* A simulação da rodada, a partir da raiz. Sai do MESMO motor e do MESMO ramo
   da árvore que o cliente usa — é a paridade do F1.1 continuando a valer com o
   servidor no comando. */
function simularDaRaiz(raiz) {
  const s = sementes(raiz);
  const lutadores = M.sortearPool(s.elenco);
  const b = M.simular(lutadores, s.batalha, true);
  return { campeaoDex: lutadores[b.winner]?.dex ?? null, eventos: b.events, lutadores };
}

/* `engine/commit.mjs` expõe `comprometer` como async porque usa WebCrypto, e o
 * scheduler precisa ser SÍNCRONO: um tick que aguarda deixa a rodada num estado
 * intermediário se algo falhar no meio da espera.
 *
 * A SAÍDA TEM QUE SER BYTE A BYTE A MESMA, e é por isso que a MENSAGEM é
 * reconstruída aqui exatamente como lá — `pokearena|v1|<raiz em hex>|<sal>`.
 * Um `${raiz}|${sal}` "equivalente" produziria um commit que o `conferir` do
 * motor rejeita, e a promessa do §4.5 quebraria justamente na hora de provar
 * que ela vale. O teste `o commit publicado CONFERE com a semente revelada`
 * existe para isso, e usa o `conferir` do motor — não uma cópia. */
/* O FORMATO VEM DO `engine/commit.mjs`, e não de uma cópia literal.
 *
 * Esta linha era um duplicado exato da de lá — o servidor precisa da versão
 * SÍNCRONA do hash (o `comprometer()` do engine é async pela WebCrypto), e a
 * cópia parecia inofensiva. Não é: duas fontes para o formato do commit fazem
 * cliente e servidor comprometerem coisas diferentes, e o único sintoma é uma
 * auditoria que não fecha meses depois. O que é síncrono aqui é o HASH, e só
 * ele. */
const MENSAGEM_COMMIT = mensagemCommit;

function comprometerSync(raiz) {
  const sal = randomBytes(16).toString('hex');
  const commit = createHash('sha256').update(MENSAGEM_COMMIT(raiz, sal), 'utf8').digest('hex');
  return { commit, sal };
}
