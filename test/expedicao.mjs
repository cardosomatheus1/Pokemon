/* Q1/Q3/Q4 · A EXPEDIÇÃO E A STAMINA (bloco 1.2a, §7.13, §P5).
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **O idle joga com as 146, e não com as 76 da Arena.** Decisão do dono do
 *    projeto: a regra do elenco reduzido é da Arena e só dela. Setenta espécies
 *    existem SÓ aqui — Caterpie, Weedle, Paras, Bellsprout. Se alguém um dia
 *    trocar `pack.especies` por `pack.elenco` num sorteio de encontro, elas
 *    somem do jogo inteiro e nada mais reprova.
 *
 * 2. **A duração muda O QUE se recebe, não só o quanto.** Se mais tempo fosse
 *    estritamente melhor, a escolha não seria escolha: todo mundo clicaria no
 *    maior. A Vigília caça raro; a Batida rende mais XP por hora. Os dois lados
 *    são medidos aqui, e é o que impede o jogo de se jogar sozinho.
 *
 * 3. **O teto diário não tem parâmetro.** É o §P5 escrito como código: a loja
 *    (L-066) vai vender boost de stamina, e boost que levante o teto seria
 *    pay-to-win num jogo onde o farm é vendável. Não existe conf que levante.
 *
 * 4. **A stamina é da CRIATURA.** É o que faz a coleção ter função em vez de
 *    ser enfeite — o teto do farm é o tamanho dela, e crescer é jogar.
 */
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import {
  PERFIS, STAMINA_MAX, REGEN_POR_HORA, EQUIPE_MAX, TETO_DIARIO,
  TETO_ENCONTROS, maximoDo, comprometido, cabeExpedicao, restamEncontros,
  staminaAgora, custoDe, podeEnviar, iniciar, pronta, sortearEncontros,
  pesoDaRaridade, fatorDaEquipe,
} from '../engine/expedicao.mjs';
import { elencoDoBioma } from '../engine/bioma.mjs';
import { semente } from '../engine/instancia.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const H = 3600_000;
const T0 = Date.UTC(2026, 7, 30, 12, 0, 0);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Uma criatura de mentira, só com o que a expedição olha. */
const cria = (id, stamina = STAMINA_MAX, em = T0) =>
  ({ id, stamina, staminaEm: em, nivel: 5 });

export function suite() {
  const s = criarSuite('expedicao');

  /* --- 1 · O ELENCO É O DO IDLE, E NÃO O DA ARENA ------------------------ */

  s.teste('§idle · o encontro sorteia entre as 146, nunca entre as 76 da Arena', () => {
    const arena = new Set(kanto.elenco);
    const vistos = new Set();
    const rnd = semente(11);
    for (let i = 0; i < 400; i++)
      for (const e of sortearEncontros(rnd, { pack: kanto, bioma: 'floresta', perfil: 'batida' }))
        vistos.add(e.dex);

    const soDoIdle = [...vistos].filter(d => !arena.has(d));
    ok(soDoIdle.length > 0,
      'em 400 expedições na floresta não apareceu UMA espécie de fora do elenco ' +
      'da Arena. A regra dos 76 é da Arena e só dela — o dono do projeto foi ' +
      'explícito. Setenta espécies existem só no idle e na Torre; se o sorteio ' +
      'passar a olhar `pack.elenco`, elas somem do jogo e nada mais reprova.');

    /* e o elenco do bioma, na origem, também tem de ser o grande */
    const doBioma = new Set(elencoDoBioma(kanto, 'floresta').map(e => e.dex));
    ok([...doBioma].some(d => !arena.has(d)),
      'o elenco da floresta virou subconjunto do elenco da Arena');
  });

  /* --- 4 · A STAMINA É DA CRIATURA --------------------------------------- */

  s.teste('a stamina regenera com o tempo e satura no teto', () => {
    const c = cria('a', 20, T0);
    igual(staminaAgora(c, T0), 20, 'sem tempo passado, a stamina é a gravada');
    igual(staminaAgora(c, T0 + 1 * H), 20 + REGEN_POR_HORA, 'uma hora de regeneração');
    igual(staminaAgora(c, T0 + 5 * H), 20 + 5 * REGEN_POR_HORA);
    igual(staminaAgora(c, T0 + 500 * H), STAMINA_MAX,
      `a stamina passou de ${STAMINA_MAX}. Guardar folga acima do teto deixaria ` +
      `quem some por uma semana voltar com estoque para farmar um dia inteiro de ` +
      `uma vez — e o teto diário existe justamente para isso não acontecer.`);
  });

  s.teste('a stamina nunca anda para trás', () => {
    const c = cria('a', 50, T0);
    let anterior = -1;
    for (let h = 0; h <= 24; h++) {
      const v = staminaAgora(c, T0 + h * H);
      ok(v >= anterior, `a stamina caiu de ${anterior} para ${v} na hora ${h}`);
      anterior = v;
    }
  });

  s.teste('o custo é por criatura enviada, e não por expedição', () => {
    for (const [id, p] of Object.entries(PERFIS)) {
      igual(custoDe(id, 1), p.custo, `${id} com um`);
      igual(custoDe(id, 3), p.custo * 3,
        `${id} com três saiu ${custoDe(id, 3)} em vez de ${p.custo * 3}. Custo por ` +
        `expedição faria a equipe cheia ser sempre de graça, e mandar três seria ` +
        `decisão sem custo — que é decisão nenhuma.`);
    }
  });

  s.teste('não se envia criatura sem stamina para o perfil', () => {
    const cansada = cria('a', 10, T0);
    igual(podeEnviar([cansada], 'vigilia', T0).pode, false,
      'a Vigília custa 90 e a criatura tinha 10');
    igual(podeEnviar([cansada], 'batida', T0).pode, false,
      'a Batida custa 20 e a criatura tinha 10');
    igual(podeEnviar([cansada], 'batida', T0 + 2 * H).pode, true,
      'depois de duas horas ela tinha 26, e a Batida custa 20');
  });

  s.teste('uma criatura sem stamina reprova a equipe inteira', () => {
    const equipe = [cria('a'), cria('b'), cria('c', 5)];
    const r = podeEnviar(equipe, 'batida', T0);
    igual(r.pode, false,
      'a equipe passou com um membro sem stamina. Deixar passar transformaria a ' +
      'stamina em sugestão: bastaria pôr um cansado no meio de dois descansados.');
    igual(r.semStamina.join(','), 'c', 'a recusa tem de dizer QUEM');
  });

  s.teste('a equipe tem teto de tamanho', () => {
    const grande = Array.from({ length: EQUIPE_MAX + 1 }, (_, i) => cria('c' + i));
    ok(recusa(() => iniciar({ equipe: grande, perfil: 'batida', bioma: 'floresta', agora: T0 })),
      `entraram ${EQUIPE_MAX + 1} numa equipe de ${EQUIPE_MAX}`);
    ok(recusa(() => iniciar({ equipe: [], perfil: 'batida', bioma: 'floresta', agora: T0 })),
      'uma expedição vazia foi aceita');
  });

  /* --- 3 · O TETO DIÁRIO NÃO TEM PARÂMETRO (§P5) ------------------------- */

  s.teste('§P5 · o teto diário não aceita conf que o levante', () => {
    /* REANCORADO no 1.6a (D-052): o teto passou a contar ENCONTROS. Saturar
       com `concluidasHoje` deixou de significar alguma coisa; o que satura é
       ter encontros comprometidos o bastante. */
    const estado = { encontrosHoje: TETO_ENCONTROS, simultaneas: 0 };
    const base = { equipe: [cria('a')], perfil: 'batida', bioma: 'floresta', agora: T0, estado };
    ok(recusa(() => iniciar(base)), `o teto de ${TETO_ENCONTROS} encontros foi ultrapassado`);

    /* AS TENTATIVAS ÓBVIAS, por fora E por dentro do `estado`.
     *
     * A PRIMEIRA VERSÃO DESTE TESTE ERA DECORATIVA, e a sabotagem pegou: eu
     * envenenava só o argumento de fora, e o defeito plantado (S542) lia
     * `estado.teto`. O teste mais importante do bloco passou verde por um
     * mutante que abria exatamente a porta que ele existe para trancar.
     *
     * Fica registrado porque a lição não é sobre esta chave: enumerar nomes de
     * chave é jogo de adivinhação, e quem escreve o defeito amanhã vai escolher
     * um nome que não está na lista. É por isso que o teste seguinte existe. */
    for (const veneno of [{ teto: 99 }, { tetoDiario: 99 }, { limite: 99 },
                          { vip: true }, { boost: true }, { premium: 99 }]) {
      ok(recusa(() => iniciar({ ...base, ...veneno })),
        `o teto cedeu a ${JSON.stringify(veneno)} POR FORA do estado.`);
      ok(recusa(() => iniciar({ ...base, estado: { ...estado, ...veneno } })),
        `o teto cedeu a ${JSON.stringify(veneno)} DENTRO do estado. O §P5 tem de ` +
        `ser estrutural: enquanto não houver por onde levantar, não há como ` +
        `vender vantagem — e esta é a única defesa que não depende de alguém ` +
        `lembrar da regra.`);
    }
  });

  /* A TRAVA QUE NÃO DEPENDE DE ADIVINHAR O NOME DA CHAVE.
   *
   * Em vez de tentar venenos, este teste OLHA o que `iniciar()` leu do
   * `estado` — com um Proxy que anota cada acesso. Se o teto algum dia passar a
   * sair de lá, a chave nova aparece na lista por mais criativo que seja o nome.
   *
   * É a diferença entre "não achei jeito de burlar" e "não há jeito". */
  s.teste('§P5 · iniciar() não lê do estado nada além do que já aconteceu', () => {
    /* `encontrosHoje` e `emCampo` entraram no 1.6a, e entram DE PROPOSITO: as
       duas dizem o que JA ACONTECEU (quantos encontros ja sairam hoje, e quais
       perfis estao em campo reservando). Nenhuma delas diz qual e o LIMITE — o
       limite continua sendo `TETO_ENCONTROS`, constante neste modulo. */
    /* `vistas` ENTRA NA LISTA DE PROPÓSITO (1.19), e o motivo é o mesmo que já
       justificou as vagas simultâneas: ela é DERIVADA do registro de espécies,
       e não um campo que alguém escreve.

           limite que vem de fora é limite que a loja pode vender

       A pergunta certa não é "o estado pode dizer o limite?" — é "esse número
       tem onde ser forjado?". `simultaneas` tinha: era um campo gravado, e um
       F12 o mudava. `vistas` não tem: ela é a CONTAGEM das espécies do
       registro, e o registro só cresce por encontro.

       E a guarda continua mordendo: qualquer chave NOVA que não esteja aqui
       reprova, e quem a acrescentar tem de escrever por quê — que é
       exatamente o que esta nota é.

       `total` entra pelo mesmo teste e por um motivo DIFERENTE: ele não vem do
       save, vem do PACK — é quantas espécies existem. O portão §Gen2 obrigou
       a que ele atravessasse por aqui, porque escrever o tamanho da dex dentro
       do motor faz a próxima geração virar caçada a números.

       O jogador não escreve o pack. Forjar `total` exigiria trocar o arquivo
       de conteúdo — e quem troca o pack já está jogando outro jogo.

       `reservas` ENTRA NA LISTA DE PROPÓSITO (bloco A5, §7.22.3), e responde
       à mesma pergunta certa: *esse número tem onde ser forjado?*

       Ela é a lista de encontros que o Avanço COMPROMETEU ao sair, e diz o que
       JÁ ACONTECEU — igualzinho ao `emCampo`, que é a mesma ideia para
       expedição. Não diz limite nenhum: o limite continua sendo o
       `TETO_ENCONTROS` deste módulo, constante e sem parâmetro.

       E forjar não ajuda quem forja. `reservas` só SOBE o comprometido, ou
       seja, só APERTA o teto: um F12 que a esvaziasse devolveria vagas que já
       estão em campo, e o dobro seria colhido — que é exatamente o buraco. Mas
       esse buraco é o mesmo do `encontrosHoje` e do `emCampo`, e ele não se
       fecha com uma lista de chaves: fecha-se no dia em que o servidor for
       dono do dia (§7.19, manipulação de relógio). A guarda daqui é sobre
       LIMITE vindo de fora, e `reservas` não é limite.

         > A pergunta desta lista nunca foi "o estado pode dizer isto?". É
         > "quem escreve isto pode comprar vantagem com ele?". Reserva só tira.
    */
    const PERMITIDO = ['concluidasHoje', 'simultaneas', 'limiteSimultaneas',
                       'encontrosHoje', 'emCampo', 'vistas', 'total', 'reservas'];
    const lidas = new Set();
    const espiao = new Proxy(
      { concluidasHoje: 0, simultaneas: 0, limiteSimultaneas: 1,
        encontrosHoje: 0, emCampo: [], vistas: 0, total: 0, reservas: [] },
      { get(alvo, chave) {
          if (typeof chave === 'string') lidas.add(chave);
          return alvo[chave];
        } });

    iniciar({ equipe: [cria('a')], perfil: 'batida', bioma: 'floresta',
              agora: T0, estado: espiao });

    const proibidas = [...lidas].filter(k => !PERMITIDO.includes(k));
    igual(proibidas.join(','), '',
      `iniciar() leu ${proibidas.join(', ')} do estado. O estado diz o que JÁ ` +
      `ACONTECEU — quantas expedições hoje, quantas em campo. Ele não pode dizer ` +
      `qual é o LIMITE, porque limite que vem de fora é limite que a loja pode ` +
      `vender, e o §P5 cai. Se a chave nova for legítima, acrescente-a à lista ` +
      `aqui em cima de propósito, e não por acidente.`);
    ok(lidas.has('encontrosHoje'),
      'iniciar() nem leu quantos encontros já saíram hoje — o teto não está sendo ' +
      'conferido de jeito nenhum, e o espião não teria como perceber isso sozinho');
  });

  s.teste('§P5 · o teto é o mesmo número para todo mundo, e é alcançável', () => {
    igual(typeof TETO_ENCONTROS, 'number');
    /* O DIA CHEIO DESENHADO tem de caber INCLUSIVE COM SORTE ALTA:
       Vigília (até 14) + Trilha (até 8) + duas Batidas (até 5 cada) = 32 no
       pior caso, 27 no meio. O teto é 30 — corta a cauda de sorte máxima, e
       não o dia. Cortar em 27 puniria quem teve sorte na Vigília tirando dele
       a última Batida, que é a pior forma de um limite aparecer. */
    const diaCheio = maximoDo('vigilia') + maximoDo('trilha') + maximoDo('batida') * 2;
    ok(TETO_ENCONTROS >= diaCheio - 3,
      `o teto é ${TETO_ENCONTROS} e o dia cheio desenhado pede até ${diaCheio}. ` +
      'Ele precisa ser alcançável DE GRAÇA por uma coleção madura — se não for, ' +
      'a loja passa a vender o que o jogo não dá, e a regra 3 da L-066 cai.');
    ok(TETO_ENCONTROS < maximoDo('vigilia') * 4,
      `o teto é ${TETO_ENCONTROS} e quatro Vigílias rendem ${maximoDo('vigilia') * 4}. ` +
      'Se as quatro couberem, o teto voltou a contar cliques em vez de encontros ' +
      'e o D-052 está de volta — a Vigília volta a render o dobro pelo mesmo ' +
      'teto, e os perfis deixam de ser uma troca.');
    igual(TETO_ENCONTROS, 30);
  });

  /* --- 3b · O TETO É DE ENCONTROS, E A RESERVA É O QUE O TORNA POSSÍVEL --- */

  s.teste('D-052 · quatro Vigílias NÃO cabem, e o dia desenhado cabe', () => {
    const dia = ['vigilia', 'trilha', 'batida', 'batida'];
    let estado = { encontrosHoje: 0, emCampo: [], simultaneas: 0, limiteSimultaneas: 3 };
    for (const perfil of dia) {
      ok(cabeExpedicao(estado, perfil),
        `"${perfil}" foi recusada no dia cheio desenhado, que tem de caber de graça`);
      /* colhe no MEIO da faixa, que é o caso comum */
      const [lo, hi] = PERFIS[perfil].encontros;
      estado = { ...estado, encontrosHoje: estado.encontrosHoje + Math.round((lo + hi) / 2) };
    }

    let so = { encontrosHoje: 0, emCampo: [], simultaneas: 0, limiteSimultaneas: 3 };
    let quantas = 0;
    while (cabeExpedicao(so, 'vigilia') && quantas < 10) {
      quantas++;
      so = { ...so, encontrosHoje: so.encontrosHoje + PERFIS.vigilia.encontros[1] };
    }
    ok(quantas < 4,
      `couberam ${quantas} Vigílias. Era exatamente isso o D-052: quatro delas ` +
      'rendiam até 56 encontros com a mesma contagem de "quatro expedições".');
  });

  s.teste('a reserva conta o que está EM CAMPO, e não só o colhido', () => {
    /* Sem reservar, o jogador manda quatro Vigílias ao mesmo tempo e só descobre
       o teto na colheita — quando já não dá para desfazer. */
    const semReserva = { encontrosHoje: 0, emCampo: [] };
    const comReserva = { encontrosHoje: 0, emCampo: ['vigilia', 'vigilia'] };
    ok(cabeExpedicao(semReserva, 'vigilia'), 'a primeira Vigília do dia tem de caber');
    ok(!cabeExpedicao(comReserva, 'vigilia'),
      'com duas Vigílias em campo, a terceira foi aceita. O teto seria descoberto ' +
      'só na colheita, quando já não dá para desfazer — e o jogador teria mandado ' +
      'stamina para o ralo.');
  });

  s.teste('a reserva DEVOLVE o que a sorte não usou', () => {
    /* A conta é derivada, não guardada: ao sair de campo, a expedição para de
       reservar, e o que entra é o real. É isso que impede a reserva de virar um
       imposto sobre quem teve azar. */
    const emCampo = { encontrosHoje: 0, emCampo: ['vigilia'] };
    const colhidoBaixo = { encontrosHoje: PERFIS.vigilia.encontros[0], emCampo: [] };
    ok(comprometido(colhidoBaixo) < comprometido(emCampo),
      'colher no mínimo da faixa não devolveu nada à reserva. A reserva é o ' +
      'máximo; o que sobra tem de voltar, senão azar na Vigília custa a Batida ' +
      'seguinte.');
  });

  s.teste('restamEncontros nunca fica negativo nem mente', () => {
    igual(restamEncontros({ encontrosHoje: 0, emCampo: [] }), TETO_ENCONTROS);
    igual(restamEncontros({ encontrosHoje: 999, emCampo: [] }), 0,
      'passar do teto por qualquer motivo não pode virar um saldo negativo na tela');
    igual(restamEncontros({ encontrosHoje: 0, emCampo: ['vigilia'] }),
          TETO_ENCONTROS - maximoDo('vigilia'),
      'o que está em campo tem de aparecer como já gasto — senão a tela promete ' +
      'ao jogador um espaço que ele não tem');
  });

  s.teste('não se inicia além das expedições simultâneas', () => {
    const base = { equipe: [cria('a')], perfil: 'batida', bioma: 'floresta', agora: T0 };
    ok(recusa(() => iniciar({ ...base, estado: { concluidasHoje: 0, simultaneas: 1, limiteSimultaneas: 1 } })),
      'começou uma segunda expedição com uma vaga só');
    ok(iniciar({ ...base, estado: { concluidasHoje: 0, simultaneas: 1, limiteSimultaneas: 2 } }),
      'com duas vagas, a segunda tinha de entrar');
  });

  /* --- o relógio ---------------------------------------------------------- */

  s.teste('a expedição não fica pronta antes da hora', () => {
    for (const [id, p] of Object.entries(PERFIS)) {
      const e = iniciar({ equipe: [cria('a')], perfil: id, bioma: 'floresta', agora: T0 });
      igual(e.terminaEm, T0 + p.minutos * 60_000, `${id} terminou na hora errada`);
      igual(pronta(e, T0), false, `${id} nasceu pronta`);
      igual(pronta(e, e.terminaEm - 1), false, `${id} ficou pronta um milissegundo antes`);
      igual(pronta(e, e.terminaEm), true, `${id} não ficou pronta na hora exata`);
    }
  });

  /* --- 2 · A DURAÇÃO MUDA O QUE SE RECEBE (Q4) --------------------------- */

  s.teste('§Q4 · a Vigília caça raro e a Batida caça comum', () => {
    const raros = perfil => {
      const rnd = semente(2026);
      let total = 0, raro = 0;
      for (let i = 0; i < 3000; i++)
        /* ── REALVADO no 1.10: o raro precisa de um estagio onde ele MORE ──
           A partir do 1.10 o estagio filtra as faixas, e o estagio 1 so tem
           comum e incomum. Sem o `estagio: 3` aqui, o teste media a proporcao
           de raro num lugar onde raro nao existe — e ela era zero para os tres
           perfis, o que reprovava por VAZIO e nao por regressao.

           O que continua sendo afirmado e o mesmo: dentro do MESMO lugar, a
           Vigilia caca mais raro que a Batida. Foi o lugar que passou a ter
           camadas, e nao a regra do perfil. */
        for (const e of sortearEncontros(rnd, { pack: kanto, bioma: 'floresta', perfil, estagio: 3 })) {
          total++;
          if (['raro', 'muitoRaro', 'lendario'].includes(e.raridade)) raro++;
        }
      return raro / total;
    };
    const batida = raros('batida'), trilha = raros('trilha'), vigilia = raros('vigilia');
    ok(vigilia > trilha && trilha > batida,
      `a proporção de raro saiu batida ${(batida*100).toFixed(1)}%, trilha ` +
      `${(trilha*100).toFixed(1)}%, vigília ${(vigilia*100).toFixed(1)}%. A ordem ` +
      `tem de ser estrita: é ela que faz escolher a duração ser uma DECISÃO em vez ` +
      `de clicar sempre no maior.`);
    ok(vigilia > batida * 3,
      `a vigília só rende ${(vigilia/batida).toFixed(1)}× mais raro que a batida. ` +
      `Diferença pequena demais é diferença que ninguém percebe, e a escolha volta ` +
      `a ser "o maior sempre".`);
  });

  s.teste('§Q4 · a Batida rende mais XP POR HORA que a Vigília', () => {
    const porHora = id => PERFIS[id].xp / (PERFIS[id].minutos / 60);
    ok(porHora('batida') > porHora('trilha') && porHora('trilha') > porHora('vigilia'),
      `XP por hora: batida ${porHora('batida').toFixed(2)}, trilha ` +
      `${porHora('trilha').toFixed(2)}, vigília ${porHora('vigilia').toFixed(2)}. ` +
      `A Vigília paga em RARIDADE e a Batida paga em RITMO — se a Vigília ganhasse ` +
      `nas duas, jogar ativamente não teria recompensa nenhuma.`);
    ok(PERFIS.vigilia.xp > PERFIS.batida.xp,
      'e mesmo assim a Vigília tem de render mais XP no total — senão dormir com ' +
      'o jogo aberto não vale a pena, e o idle deixa de ser idle');
  });

  /* O EIXO DA TROCA, E EU ERREI ELE NA PRIMEIRA VERSÃO.
   *
   * O teste que estava aqui exigia que a expedição LONGA devolvesse MENOS
   * encontros — quantidade trocada por raridade. Parecia uma troca honesta e
   * era um jogo insultuoso: 8 horas devolviam 1,5 encontros, que depois ainda
   * passavam pela peneira da captura. Menos de meia criatura por noite. O dono
   * do projeto viu e perguntou se não estava "muito tryhard". Estava.
   *
   * O EIXO CERTO é outro, e é o que todo idle bom usa:
   *
   *     jogo ATIVO  rende mais POR HORA
   *     jogo IDLE   rende mais POR SESSÃO
   *
   * Ninguém se sente roubado por isso, e a escolha continua existindo: com três
   * horas na frente do computador, quatro Batidas rendem mais que uma Trilha.
   * Dormindo, a Vigília é a única que existe.
   *
   * O teste agora mede o RITMO, que é a afirmação certa. */
  s.teste('§Q4 · o ritmo por hora cai conforme a expedição fica longa', () => {
    const ritmo = id => {
      const rnd = semente(7);
      let n = 0;
      for (let i = 0; i < 2000; i++)
        n += sortearEncontros(rnd, { pack: kanto, bioma: 'praia', perfil: id }).length;
      return (n / 2000) / (PERFIS[id].minutos / 60);
    };
    const b = ritmo('batida'), t = ritmo('trilha'), v = ritmo('vigilia');
    ok(b > t && t > v,
      `encontros por hora: batida ${b.toFixed(2)}, trilha ${t.toFixed(2)}, ` +
      `vigília ${v.toFixed(2)}. O jogo ATIVO tem de render mais por hora — é a ` +
      `única recompensa que ele tem, já que a expedição longa ganha em raridade ` +
      `E em total. Sem isto, ficar na frente do jogo não paga nada.`);
    ok(b > v * 2,
      `a batida só rende ${(b/v).toFixed(1)}× por hora. Diferença pequena é ` +
      `diferença que ninguém percebe.`);
  });

  /* E A OUTRA METADE: a sessão longa tem de devolver o BASTANTE.
   *
   * Este teste existe por causa do erro acima, e é a trava para ele não voltar.
   * Ele não pergunta se a proporção está bonita — pergunta se o jogador que
   * dormiu ACORDA COM ALGUMA COISA. */
  s.teste('§Q4 · uma noite de Vigília acorda com criatura na mão', () => {
    const rnd = semente(31);
    let n = 0;
    for (let i = 0; i < 2000; i++)
      n += sortearEncontros(rnd, { pack: kanto, bioma: 'praia', perfil: 'vigilia' }).length;
    const media = n / 2000;
    ok(media >= 8,
      `a Vigília de 8 h devolve ${media.toFixed(1)} encontros. Encontro NÃO é ` +
      `captura — cada um ainda passa pela peneira da bola. Com menos de oito, o ` +
      `jogador acorda de mãos vazias, e um idle que pune quem dorme não é idle.`);
  });

  /* --- determinismo (§P3) ------------------------------------------------- */

  s.teste('a mesma semente devolve a mesma expedição', () => {
    const um = sortearEncontros(semente(99), { pack: kanto, bioma: 'gelo', perfil: 'trilha' });
    const dois = sortearEncontros(semente(99), { pack: kanto, bioma: 'gelo', perfil: 'trilha' });
    igual(JSON.stringify(um), JSON.stringify(dois),
      'a mesma semente deu resultados diferentes — sem isto a colheita não é ' +
      'auditável, e o §25.2 não fecha para a expedição como fecha para a rodada');
  });

  s.teste('todo encontro pertence ao bioma sorteado', () => {
    const rnd = semente(5);
    for (const bioma of kanto.biomas.map(b => b.id)) {
      const doBioma = new Set(elencoDoBioma(kanto, bioma).map(e => e.dex));
      for (let i = 0; i < 40; i++)
        for (const e of sortearEncontros(rnd, { pack: kanto, bioma, perfil: 'trilha' }))
          ok(doBioma.has(e.dex),
            `o dex ${e.dex} apareceu em ${bioma}, onde não mora. A fidelidade do ` +
            `bioma é o que dá RAZÃO para escolher a rota.`);
    }
  });

  /* --- o peso da raridade ------------------------------------------------- */

  s.teste('o peso cresce para comum e cai para raro, em toda faixa', () => {
    const ordem = kanto.raridade.map(([id]) => id);
    for (let i = 1; i < ordem.length; i++)
      ok(pesoDaRaridade(ordem[i], 0) < pesoDaRaridade(ordem[i - 1], 0),
        `${ordem[i]} pesa mais que ${ordem[i-1]} no viés neutro — a raridade ` +
        `estaria invertida, e o mercado precificaria ao contrário`);
    /* o viés move o peso na direção certa, e não muda o comum */
    ok(pesoDaRaridade('raro', 1) > pesoDaRaridade('raro', 0));
    ok(pesoDaRaridade('raro', -1) < pesoDaRaridade('raro', 0));
    igual(pesoDaRaridade('comum', 1), pesoDaRaridade('comum', 0),
      'o viés mexeu no peso do comum. Ele é a âncora: mover os dois lados faria ' +
      'a conta depender da ordem em que as faixas foram escritas.');
  });

  /* --- §Gen2 -------------------------------------------------------------- */

  s.teste('§Gen2 · a expedição funciona com outro pack, sem tocar em engine/', () => {
    const bioma = original.biomas[0].id;
    const doBioma = new Set(elencoDoBioma(original, bioma).map(e => e.dex));
    const rnd = semente(3);
    let n = 0;
    for (let i = 0; i < 200; i++)
      for (const e of sortearEncontros(rnd, { pack: original, bioma, perfil: 'vigilia' })) {
        ok(doBioma.has(e.dex), `o dex ${e.dex} não é de ${bioma} no pack original`);
        ok(original.raridade.some(([id]) => id === e.raridade),
          `a raridade "${e.raridade}" não é deste pack — o motor está usando a ` +
          `escala do outro, e o critério da Gen 2 cai junto`);
        n++;
      }
    ok(n > 100, `só ${n} encontros em 200 vigílias no pack original`);
  });


  /* ═══ CONCENTRAR TEM DE VALER A PENA — L-140, bloco 1.27 ════════════════
   *
   * Cobrança do dono, e medida no motor antes de mexer:
   *
   *   > "SE POR ACASO o jogador quiser mandar 2 pokémon pro mesmo bioma,
   *   >  teoricamente é para ele farmar mais ali; essa distribuição de farm a
   *   >  + precisa ser feita e equilibrada por você"
   *
   *     custo       custoDe(perfil, equipe.length)   ×2, ×3   ESCALA
   *     encontros   do PERFIL, não da equipe          igual   NÃO escala
   *     itens       do PERFIL, não da equipe          igual   NÃO escala
   *
   * Botar dois no mesmo bioma custava o dobro de stamina e trazia exatamente
   * os mesmos itens. O único ganho era nivelar duas de uma vez — o oposto do
   * que o pedido descreve.
   *
   * ── E A CURVA NÃO É LINEAR, E É AQUI QUE ELA SE DECIDE ──────────────────
   *
   * Com ×2 exato, concentrar seria IDÊNTICO a espalhar: mandar três num bioma
   * daria o mesmo que mandar um em três, e a escolha de rota — que é a
   * mecânica inteira do idle — deixaria de existir.
   *
   *   > Retorno decrescente é o que faz as duas estratégias valerem e serem
   *   > DIFERENTES: concentrar traz mais do MESMO lugar; espalhar traz
   *   > variedade. Nenhuma das duas domina.
   */
  s.teste('mandar mais gente rende MAIS, e a curva não é linear', () => {
    igual(fatorDaEquipe(1), 1, 'um sozinho deixou de ser a régua');
    ok(fatorDaEquipe(2) > 1,
      'dois no mesmo bioma continuam rendendo o mesmo que um — custa o dobro ' +
      'de stamina e traz os mesmos itens, que é a queixa do dono');
    ok(fatorDaEquipe(3) > fatorDaEquipe(2), 'três não rende mais que dois');
    /* O TETO É O QUE IMPEDE CONCENTRAR DE DOMINAR. Com ×2 para dois, mandar
       dois num bioma seria idêntico a mandar um em dois — e a escolha de rota
       sumiria. */
    ok(fatorDaEquipe(2) < 2,
      `dois rendem ${fatorDaEquipe(2)}× — em ×2 exato, concentrar vira o mesmo ` +
      'que espalhar, e a escolha de rota deixa de existir');
    ok(fatorDaEquipe(3) <= 2.2,
      `três rendem ${fatorDaEquipe(3)}× — acima disso concentrar domina, e o ` +
      'dono foi explícito: "não pode ser nada surreal e quebrado"');
  });

  s.teste('a curva é DECRESCENTE: o segundo rende mais que o terceiro', () => {
    /* É a forma da curva, e não os dígitos, que faz as duas estratégias
       coexistirem. O primeiro membro vale 1; cada um depois vale menos que o
       anterior. */
    const g1 = fatorDaEquipe(2) - fatorDaEquipe(1);
    const g2 = fatorDaEquipe(3) - fatorDaEquipe(2);
    ok(g2 < g1,
      `o segundo membro acrescenta ${g1.toFixed(2)} e o terceiro ${g2.toFixed(2)}: ` +
      'a curva não é decrescente, e concentrar passa a dominar espalhar');
  });

  s.teste('equipe vazia ou absurda não quebra a conta', () => {
    igual(fatorDaEquipe(0), 1, 'equipe vazia mudou a régua');
    igual(fatorDaEquipe(null), 1, 'equipe ausente derrubou a conta');
    ok(fatorDaEquipe(99) <= fatorDaEquipe(3) * 1.5,
      'uma equipe impossível fura o teto — o EQUIPE_MAX é 3, e a conta tem de ' +
      'segurar mesmo se alguém passar mais');
  });

  s.teste('o SORTEIO usa o fator, e não só a tabela', () => {
    /* A afirmação de cima é sobre o número; esta é sobre ele CHEGAR ao
       sorteio. São duas coisas, e o defeito mora entre elas — foi assim que o
       S890 escapou no A4. */
    const base = { pack: kanto, bioma: 'floresta', perfil: 'trilha', estagio: 1 };
    const um = [], tres = [];
    for (let i = 0; i < 40; i++) {
      um.push(sortearEncontros(rngTeste(700 + i), { ...base, membros: 1 }).length);
      tres.push(sortearEncontros(rngTeste(700 + i), { ...base, membros: 3 }).length);
    }
    const med = a => a.reduce((x, y) => x + y, 0) / a.length;
    ok(med(tres) > med(um) * 1.4,
      `um rende ${med(um).toFixed(1)} encontros e três rendem ${med(tres).toFixed(1)}: ` +
      'o fator não chegou ao sorteio');
  });


  s.teste('o TETO reserva pela curva, e não só pelo perfil', () => {
    /* Sem isto o multiplicador vira FURO no §P5: uma Vigília de três reserva
       14 e entrega 28, e o teto do dia é ultrapassado sem que nada recuse.

         > Um teto que reserva menos do que a coisa entrega não é um teto: é
         > uma sugestão que o próprio jogo desmente na hora de pagar. */
    const um  = comprometido({ emCampo: [{ perfil: 'vigilia', membros: 1 }] });
    const tres = comprometido({ emCampo: [{ perfil: 'vigilia', membros: 3 }] });
    igual(um, maximoDo('vigilia'), 'um membro deixou de reservar o máximo do perfil');
    igual(tres, Math.round(maximoDo('vigilia') * fatorDaEquipe(3)),
      `três reservam ${tres} e entregam ${Math.round(maximoDo('vigilia') * fatorDaEquipe(3))}: ` +
      'o teto vira furo');

    /* A FORMA ANTIGA CONTINUA VALENDO. `emCampo` era uma lista de perfis, e um
       save gravado antes deste bloco traz strings. Quebrar nele seria trocar um
       furo por uma tela que não abre. */
    igual(comprometido({ emCampo: ['vigilia'] }), maximoDo('vigilia'),
      'a forma antiga de `emCampo` deixou de ser entendida');
  });

  s.teste('e a recusa de nova expedição também conhece a curva', () => {
    const vistas = 0, total = 146;
    /* Um estado com o teto quase cheio: cabe uma Batida de um, e não de três. */
    const quase = { encontrosHoje: 24, vistas, total };
    ok(cabeExpedicao(quase, 'batida', 1),
      'uma Batida de um não coube num teto com 6 de folga');
    ok(!cabeExpedicao(quase, 'batida', 3),
      'uma Batida de TRÊS coube num teto com 6 de folga — ela entrega 10, e o ' +
      'teto do dia seria furado pelo caminho que este bloco acabou de abrir');
  });

  return s;
}
