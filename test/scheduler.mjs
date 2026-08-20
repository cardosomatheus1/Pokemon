/* Q1/Q3/Q6 · O SCHEDULER AUTORITATIVO — o servidor é dono do relógio (F1.5).
 *
 * A MUDANÇA DE PODER QUE ESTE BLOCO FAZ:
 *
 * Até aqui o cliente iniciava a rodada, sorteava a semente e calculava o preço.
 * Isso é aceitável num protótipo de um jogador só e é indefensável com dois: se
 * o cliente escolhe a semente, ele escolhe a luta; se ele calcula o preço, ele
 * escolhe a odd. A partir daqui o servidor gera, precifica, abre, fecha, simula
 * e distribui — e o cliente perde o direito de pedir a próxima rodada.
 *
 * AS TRÊS AFIRMAÇÕES:
 *
 *   1. A rodada existe e conclui SEM NENHUM CLIENTE CONECTADO. É o critério de
 *      saída do bloco, e é o que separa "servidor autoritativo" de "servidor
 *      que responde quando alguém pede".
 *   2. Nada na resposta durante a janela de aposta permite derivar o resultado.
 *      O teste varre o PAYLOAD INTEIRO, não os campos documentados — campo novo
 *      nasce sem ninguém lembrar de conferi-lo.
 *   3. Semente vinda do cliente é IGNORADA, não usada.
 */
import { lerRaiz } from '../engine/seed.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import {
  criarScheduler, ESTADOS, FASE_MS,
} from '../server/scheduler.mjs';
import { digital as digitalNode } from './rodada-digital.mjs';

const SIMS_TESTE = 800;   // lote curto: o que se testa aqui é o CICLO, não o preço

function novo(opcoes = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  /* Relógio injetado. O ciclo real tem 30 s de janela; esperar isso numa suíte
     seria trocar cobertura por paciência, e o D-005 já ensinou o preço de um
     teste que depende do relógio da máquina. */
  let agora = Date.UTC(2026, 0, 15);
  const sched = criarScheduler({ db, sims: SIMS_TESTE, relogio: () => agora, ...opcoes });
  return { db, sched, avancar: ms => { agora += ms; }, agoraDe: () => agora };
}

export function suite() {
  const s = criarSuite('scheduler');

  /* --- a rodada roda sozinha --------------------------------------------- */

  s.teste('a rodada existe e conclui SEM nenhum cliente conectado', () => {
    const { db, sched, avancar } = novo();
    const r = sched.abrirRodada();
    ok(r && r.id, 'a rodada não foi criada');
    igual(r.status, ESTADOS.ABERTA, `nasceu em "${r.status}"`);

    avancar(FASE_MS.APOSTA + 1); sched.tick();
    igual(sched.rodadaAtual().status, ESTADOS.TRAVADA, 'a janela não fechou sozinha');

    avancar(FASE_MS.PREPARO + 1); sched.tick();
    igual(sched.rodadaAtual().status, ESTADOS.EM_LUTA, 'a luta não começou sozinha');

    avancar(FASE_MS.LUTA + 1); sched.tick();
    const fim = sched.rodadaAtual();
    igual(fim.status, ESTADOS.ENCERRADA, 'a rodada não encerrou sozinha');
    ok(Number.isInteger(fim.campeaoDex),
      'a rodada encerrou sem campeão — ninguém simulou');
    /* E o campeão está GRAVADO, não só em memória: o processo que reinicia no
       meio precisa achar a rodada encerrada com o resultado dela. */
    const naTabela = db.prepare(`SELECT champion_species_id c FROM rounds WHERE id=?`).get(r.id).c;
    igual(naTabela, fim.campeaoDex, 'o campeão em memória não foi gravado');
  });

  s.teste('as doze linhas de preço ficam GRAVADAS na abertura', () => {
    const { db, sched } = novo();
    const r = sched.abrirRodada();
    const linhas = db.prepare(`SELECT * FROM round_fighters WHERE round_id=? ORDER BY slot`).all(r.id);
    igual(linhas.length, 12, `${linhas.length} lutadores gravados`);
    for (const l of linhas) {
      ok(l.offered_odd > 1, `odd ofertada inválida no slot ${l.slot}`);
      ok(l.offered_odd <= l.fair_odd,
        `slot ${l.slot}: odd ofertada ${l.offered_odd} MAIOR que a justa ${l.fair_odd} — ` +
        `a casa estaria pagando para operar`);
    }
    /* "Odd auditável" quer dizer que a odd OFERECIDA fica gravada, e não
       recalculada depois com o código de amanhã. */
    ok(db.prepare(`SELECT sims, margem_efetiva FROM rounds WHERE id=?`).get(r.id).sims === SIMS_TESTE,
      'o número de simulações não foi gravado no registro do §4.4.5');
  });

  /* --- §4.5: commit-reveal ------------------------------------------------ */

  s.teste('o commit é publicado na abertura e a semente SÓ no fechamento', () => {
    const { db, sched, avancar } = novo();
    const r = sched.abrirRodada();
    ok(r.round_seed_commit, 'a rodada abriu sem commit');
    const naAbertura = db.prepare(`SELECT round_seed_reveal FROM rounds WHERE id=?`).get(r.id);
    igual(naAbertura.round_seed_reveal, null,
      'a semente foi revelada COM as apostas abertas — o §4.5 existe para provar ' +
      'que o resultado não é conhecido antes, e isso o desmente');

    avancar(FASE_MS.APOSTA + 1); sched.tick();
    const depois = db.prepare(`SELECT round_seed_reveal, round_seed_sal FROM rounds WHERE id=?`).get(r.id);
    ok(depois.round_seed_reveal, 'a semente não foi revelada no fechamento');
    ok(depois.round_seed_sal, 'o sal não foi revelado — sem ele o commit não se confere');
  });

  s.teste('o commit publicado CONFERE com a semente revelada', async () => {
    const { db, sched, avancar } = novo();
    const r = sched.abrirRodada();
    avancar(FASE_MS.APOSTA + 1); sched.tick();
    const f = db.prepare(`SELECT round_seed_commit, round_seed_reveal, round_seed_sal
                          FROM rounds WHERE id=?`).get(r.id);
    const { conferir } = await import('../engine/commit.mjs');
    /* `lerRaiz` e não `Number`: a coluna é TEXT e o TIPO é a versão da raiz.
       `Number('1bfd…')` é `NaN`, e o sintoma seria o commit não conferir — ou
       seja, a auditoria acusando o servidor de ter mentido. */
    ok(await conferir(f.round_seed_commit, lerRaiz(f.round_seed_reveal), f.round_seed_sal),
      'o commit publicado não bate com a semente revelada. É a promessa do §4.5 ' +
      'quebrada exatamente onde ela é verificável.');
  });

  /* --- o cliente perde o poder ------------------------------------------- */

  s.teste('semente vinda de fora é IGNORADA', () => {
    const { sched } = novo();
    const a = sched.abrirRodada({ raiz: 12345 });
    ok(a.raiz !== 12345,
      'o servidor usou a semente que veio de fora. Quem escolhe a semente ' +
      'escolhe a luta — e o cliente passa a saber o vencedor antes de apostar.');
  });

  s.teste('não dá para abrir uma segunda rodada com uma já aberta', () => {
    const { sched } = novo();
    sched.abrirRodada();
    let erro = null;
    try { sched.abrirRodada(); } catch (e) { erro = e; }
    ok(erro, 'duas rodadas abertas ao mesmo tempo — o cliente pediria a próxima até ' +
             'sair uma que lhe agrade');
  });

  /* --- Q6: NADA VAZA O RESULTADO DURANTE A JANELA ------------------------ */

  /* O TESTE VARRE O PAYLOAD INTEIRO, e é isso que o diferencia de conferir
     campos documentados. Campo novo nasce sem ninguém lembrar de conferi-lo, e
     é justamente o campo novo que vaza. */
  s.teste('o payload público da janela não permite derivar o resultado', () => {
    const { db, sched, avancar } = novo();
    const r = sched.abrirRodada();
    const publico = JSON.stringify(sched.paraCliente());

    /* 1. A semente não pode estar lá, em NENHUMA forma. */
    const raiz = String(r.raiz);
    ok(!publico.includes(raiz),
      `a raiz (${raiz}) aparece no payload público durante a janela de aposta`);

    /* 2. Nem o campeão, que só existe depois. */
    /* UM SALTO SÓ, e três ticks: é o caso do processo que ficou ocupado e
       precisa ALCANÇAR o estado certo, em vez de empurrar o cronograma. */
    avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    sched.tick(); sched.tick(); sched.tick();

    /* Reabre e confere a NOVA janela. Fazer isso com a rodada já encerrada não
       provaria nada — lá o resultado é público de propósito.
     *
     * CONFERIR "O DEX DO CAMPEÃO NÃO APARECE" SERIA UM TESTE ERRADO, e a
     * primeira versão deste era. O campeão é um dos doze do elenco, e os doze
     * são públicos: o número dele aparece necessariamente, junto com os outros
     * onze. Conhecer o elenco não é conhecer o vencedor.
     *
     * O que vaza o resultado são os DOIS CAMPOS que só existem depois do
     * fechamento — a semente revelada e os eventos da luta. É a ausência deles
     * que o §4.5 promete, e é ela que se testa. */
    const r2 = sched.abrirRodada();
    const p2 = sched.paraCliente();
    igual(p2.fase, ESTADOS.ABERTA, 'a nova rodada não abriu');
    ok(p2.revelado === undefined,
      'a semente revelada está no payload com as apostas ABERTAS — quem a tiver ' +
      'reproduz a luta inteira antes de apostar');
    ok(p2.eventosDaLuta === undefined,
      'os eventos da luta estão no payload com as apostas ABERTAS');
    ok(!JSON.stringify(p2).includes(String(r2.raiz)),
      'a raiz da nova rodada vazou em algum campo do payload');

    /* E DEPOIS do fechamento eles APARECEM — senão "não vaza" seria só um
       payload vazio, e o jogador não teria como auditar coisa nenhuma. */
    avancar(FASE_MS.APOSTA + 1); sched.tick();
    const p3 = sched.paraCliente();
    ok(p3.revelado && p3.revelado.raiz === r2.raiz,
      'a semente não foi publicada depois do fechamento — sem ela o commit do ' +
      '§4.5 não serve para nada');
  });

  s.teste('o payload público não traz NENHUM campo de nome suspeito', () => {
    const { sched } = novo();
    sched.abrirRodada();
    const publico = sched.paraCliente();
    const PROIBIDOS = ['raiz', 'seed', 'reveal', 'sal', 'champion', 'campeao',
                       'vencedor', 'winner', 'battle', 'eventos'];
    const varrer = (obj, caminho = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        for (const p of PROIBIDOS)
          ok(!k.toLowerCase().includes(p),
            `campo "${caminho}${k}" no payload público da janela — nome sugere ` +
            `informação derivada do resultado`);
        varrer(v, `${caminho}${k}.`);
      }
    };
    varrer(publico);
  });

  /* --- Q3: a rodada do servidor é reproduzível --------------------------- */

  s.teste('a rodada simulada pelo servidor é a que a semente revelada reproduz', () => {
    const { db, sched, avancar } = novo();
    const r = sched.abrirRodada();
    avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
    sched.tick(); sched.tick(); sched.tick();
    const f = db.prepare(`SELECT round_seed_reveal, champion_species_id FROM rounds WHERE id=?`).get(r.id);
    /* A prova do §P3 atravessando o servidor: qualquer um refaz a rodada a
       partir da semente publicada e chega ao MESMO campeão. */
    const daSemente = sched.campeaoDaRaiz(lerRaiz(f.round_seed_reveal));
    igual(f.champion_species_id, daSemente,
      'o campeão gravado não é o que a semente publicada reproduz — a auditoria ' +
      'do §25.2 daria um resultado diferente do que o jogador viu');
  });

  return s;
}
