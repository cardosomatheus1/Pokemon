/* Q3 · Invariantes — propriedades que valem em TODA execução, verificadas
 * sobre entrada aleatorizada, não sobre casos escritos à mão.
 *
 * A Spec §4.6 lista 11 invariantes. Cinco delas são de carteira/aposta e só
 * passam a ser verificáveis a partir de F0.9 e F1.4; estão marcadas abaixo e
 * NÃO são silenciosamente omitidas. */
import { readFileSync } from 'node:fs';
import * as E from './motor.mjs';
import { derivar, novaRaiz, BITS_RAIZ, RAMOS } from '../engine/seed.mjs';
import { criarSuite, ok, rngTeste, elencoDeterministico, igual } from './harness.mjs';

const RODADAS = 2000;

/* Os números do POKEARENA_ECONOMY_STUDY_v1.2, linhas 340 e 344. Copiados aqui
   porque o teste do D-007 os compara — mudá-los no documento sem mudá-los aqui
   deixaria o teste medindo um orçamento que não existe mais. */
const ORCAMENTO_AGREGADO  = 80;   // PC-B/semana, TODAS as fontes rotineiras
const ORCAMENTO_DESAFIOS  = 30;   // o que sobra depois da trilha de login
const POR_DIA             = 3;    // desafios sorteados por dia, em desafios.mjs

/* VAZIA DESDE O F1.7, e a lista fica de propósito.
   As duas que moravam aqui — "payout ocorre uma única vez" e "aposta fechada
   não pode ser alterada" — dependiam de settlement no servidor, que é o que o
   F1.7 construiu. A lista vazia é a resposta certa; apagá-la esconderia que
   ela já teve conteúdo, e é o histórico que torna a ausência legível. */
export const NAO_APLICAVEIS_AINDA = [];

/* Verificadas depois que a lista foi escrita — ficam nomeadas para que a
   ausência delas acima seja leitura fácil, e não pergunta. */
export const JA_VERIFICADAS = [
  'nenhum ticket excede MAX_PAYOUT      -> F0.8, em test/exposicao.mjs',
  'nenhuma rodada excede MAX_LIABILITY  -> F0.8, em test/exposicao.mjs',
  'nenhuma batalha excede hard cap      -> F0.6, D-003, aqui em L-016',
  'saldo nunca fica negativo            -> F0.9, em test/carteira.mjs',
  'saldo nunca fica negativo (servidor) -> F1.2, CHECK no esquema + test/banco-servidor.mjs',
  'payout ocorre uma única vez          -> F1.7, em test/aposta-servidor.mjs',
  'aposta fechada não pode ser alterada -> F1.7, em test/aposta-servidor.mjs',
];

export function suite() {
  const s = criarSuite('invariantes');

  s.teste(`I1 · exatamente um campeão em ${RODADAS} rodadas`, () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 5000 + i);
      const r = E.simular(f, 900000 + i, true);
      ok(r.winner >= 0 && r.winner < f.length, `rodada ${i}: campeão inválido ${r.winner}`);
    }
  });

  s.teste('I2 · nenhuma batalha excede o corte duro de tempo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 6000 + i);
      const r = E.simular(f, 910000 + i, true);
      ok(r.duration <= E.CONF.MAX_TIME, `rodada ${i}: duração ${r.duration} > MAX_TIME`);
      for (const ev of r.events) ok(ev.t <= E.CONF.MAX_TIME, `evento além do corte`);
    }
  });

  s.teste('I3 · nenhum lutador é abatido duas vezes', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 7000 + i);
      const r = E.simular(f, 920000 + i, true);
      const mortos = new Set();
      for (const ev of r.events) {
        if (ev.storm) { for (const h of ev.hits) if (h.ko) {
          ok(!mortos.has(h.i), `rodada ${i}: KO duplicado (tempestade) em ${h.i}`); mortos.add(h.i); } }
        else if (!ev.streak && ev.ko) {
          ok(!mortos.has(ev.d), `rodada ${i}: KO duplicado em ${ev.d}`); mortos.add(ev.d);
        }
      }
      ok(mortos.size === f.length - 1, `rodada ${i}: ${mortos.size} abates para ${f.length} lutadores`);
    }
  });

  s.teste('I4 · lutador abatido não age nem é alvo depois', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 8000 + i);
      const r = E.simular(f, 930000 + i, true);
      const mortos = new Set();
      for (const ev of r.events) {
        if (ev.storm) { for (const h of ev.hits) { ok(!mortos.has(h.i), 'tempestade atingiu morto'); if (h.ko) mortos.add(h.i); } continue; }
        if (ev.streak) { ok(!mortos.has(ev.a), 'killstreak de lutador morto'); continue; }
        ok(!mortos.has(ev.a), `rodada ${i}: morto atacou em t=${ev.t}`);
        ok(!mortos.has(ev.d), `rodada ${i}: morto foi alvo em t=${ev.t}`);
        if (ev.ko) mortos.add(ev.d);
      }
    }
  });

  s.teste('I5 · tempo dos eventos é monotônico', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 9000 + i);
      const r = E.simular(f, 940000 + i, true);
      let ult = -1;
      for (const ev of r.events) { ok(ev.t >= ult - 1e-9, `rodada ${i}: tempo retrocedeu`); ult = ev.t; }
    }
  });

  s.teste('I6 · dano é 0 só quando erra ou é imune; nunca negativo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 11000 + i);
      const r = E.simular(f, 950000 + i, true);
      for (const ev of r.events) {
        if (ev.storm || ev.streak) continue;
        ok(ev.dmg >= 0, `dano negativo em t=${ev.t}`);
        if (ev.dmg === 0) ok(ev.miss || ev.eff === 0, `dano zero sem erro nem imunidade em t=${ev.t}`);
      }
    }
  });

  s.teste('I7 · só entram lutadores do elenco declarado', () => {
    const validos = new Set(E.elenco.map(p => p.dex));
    for (let i = 0; i < 300; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 12000 + i);
      ok(f.length === E.CONF.ARENA_SIZE, `pool com ${f.length} lutadores`);
      ok(new Set(f.map(x => x.dex)).size === f.length, 'lutador repetido na pool');
      for (const x of f) ok(validos.has(x.dex), `dex ${x.dex} fora do elenco`);
    }
  });

  s.teste('I8 · nenhuma probabilidade estimada é zero (Laplace)', () => {
    for (let i = 0; i < 12; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 13000 + i);
      const SIMS = 3000, w = new Uint32Array(f.length);
      const R = rngTeste(600000 + i);
      for (let k = 0; k < SIMS; k++) {
        const x = E.simular(f, (R() * 4294967296) >>> 0, false);
        if (x >= 0) w[x]++;
      }
      const p = Array.from(w, v => (v + 1) / (SIMS + f.length));
      for (const [j, v] of p.entries()) ok(v > 0, `probabilidade zero em ${f[j].n}`);
    }
  });

  /* ------------------------------------------------------------------ *
   * D-001 · CORRIGIDO em F0.2.
   *
   * O caminho rápido de simular() devolvia -1 quando um carimbo de
   * tempestade abatia os últimos lutadores no mesmo instante, porque o
   * desempate percorria `hits`, alimentado só em modo gravação. Medido em
   * 0,034% das simulações, e o descarte não era aleatório.
   *
   * Este teste agora afirma a CORREÇÃO. As seeds são as mesmas que
   * demonstravam o defeito: se voltarem a divergir, a regressão aparece
   * aqui e aponta para docs/DEFEITOS.md.
   * ------------------------------------------------------------------ */
  s.teste('D-001 · caminho rápido e modo gravação concordam na varredura por tempestade', () => {
    const f = E.montarElenco(E.elenco.slice(0, 12));
    const SEEDS_DO_DEFEITO = [3846931268, 3582205302, 3060347309];
    for (const seed of SEEDS_DO_DEFEITO) {
      const rapido = E.simular(f, seed, false);
      const gravado = E.simular(f, seed, true);
      ok(rapido >= 0, `D-001 regrediu: caminho rápido devolveu ${rapido} na seed ${seed}`);
      ok(rapido === gravado.winner,
        `seed ${seed}: caminho rápido (${rapido}) discorda do modo gravação (${gravado.winner})`);
    }
  });

  s.teste('D-001 · nenhuma simulação perde o vencedor em 50.000 amostras', () => {
    const f = E.montarElenco(E.elenco.slice(0, 12));
    const R = rngTeste(4242);
    for (let i = 0; i < 50000; i++) {
      const seed = (R() * 4294967296) >>> 0;
      ok(E.simular(f, seed, false) >= 0, `caminho rápido devolveu -1 na seed ${seed}`);
    }
  });

  /* ------------------------------------------------------------------ *
   * L-016 · o corte duro de tempo.
   *
   * `CONF.MAX_TIME` existe para o caso de dois tipos mutuamente imunes
   * sobrarem por último. Medido: NENHUMA das 10.000 rodadas do lote
   * estatístico chega perto dele — a tempestade encerra tudo antes, sempre.
   * Um seguro que nunca dispara não tem cobertura, e foi assim que ele
   * passou despercebido até o F0.3d.
   *
   * Para exercitá-lo é preciso desligar a tempestade e montar a pool que ele
   * existe para cobrir: Normal puro contra Fantasma puro, que não se tocam.
   * ------------------------------------------------------------------ */
  s.teste('L-016 · o corte duro de tempo encerra a batalha e escolhe um vencedor', () => {
    const stormOrig = E.CONF.STORM_FROM;
    try {
      E.CONF.STORM_FROM = 9999;          // desliga a tempestade

      /* O elenco de Kanto NÃO produz empate: o único Fantasma é Gengar, que é
         Fantasma/Venenoso, e os golpes Venenosos atingem Normal normalmente.
         Então o cenário que o corte existe para cobrir precisa ser CONSTRUÍDO:
         Normal puro com golpe Normal contra Fantasma puro com golpe Fantasma.
         Nenhum dos dois toca o outro, e nada mais encerra a batalha. */
      const f = E.montarElenco(E.elenco.slice(0, 2));
      const golpe = (t) => ({ n:`teste ${t}`, t, p:100, cat:'fis', fx:'melee', acc:1 });
      f[0].types = ['normal']; f[0].moves = [golpe('normal')];
      f[1].types = ['ghost'];  f[1].moves = [golpe('ghost')];
      ok(E.efeito('normal', f[1].types) === 0 && E.efeito('ghost', f[0].types) === 0,
        'a imunidade mútua do cenário deixou de valer — a tabela de tipos mudou');

      let alcancou = 0;
      for (let i = 0; i < 200; i++) {
        const r = E.simular(f, 900000 + i, true);
        /* D-003 CORRIGIDO no F0.6. Esta asserção afirmava o defeito de
           propósito — "a duração PASSA do corte" — para ficar vermelha no dia
           em que alguém o endurecesse. Ficou, e virou a invariante que a Spec
           §4.6 sempre pediu: nenhuma batalha excede o corte. Ponto.

           A igualdade é esperada e não é caso de borda: quando a ação seguinte
           cai depois do corte, ela é descartada e a batalha encerra em
           MAX_TIME exatos. */
        ok(r.duration <= E.CONF.MAX_TIME,
          `a batalha durou ${r.duration.toFixed(2)}s, além do corte de ${E.CONF.MAX_TIME}s — ` +
          `D-003 regrediu`);
        ok(r.duration === E.CONF.MAX_TIME,
          `a batalha parou em ${r.duration.toFixed(2)}s; neste cenário nada além do corte a encerra, ` +
          `então ela deveria parar exatamente em ${E.CONF.MAX_TIME}s`);
        ok(r.winner >= 0, `corte de tempo devolveu ${r.winner} em vez de um vencedor`);
        alcancou++;
      }
      ok(alcancou > 0,
        'nenhuma das 200 batalhas alcançou o corte — a pool escolhida não exercita o caminho');
    } finally {
      E.CONF.STORM_FROM = stormOrig;
    }
  });

  s.teste('L-016 · com a tempestade ligada, o corte duro nunca é alcançado', () => {
    /* O outro lado da mesma verdade, e é o que documenta por que o caminho
       acima precisa de um cenário artificial. Se um dia isto ficar vermelho,
       a tempestade deixou de garantir o término e o corte virou o mecanismo
       real de encerramento — o que mudaria a distribuição de duração. */
    const f = elencoDeterministico(E.elenco, E.montarElenco, 77);
    let perto = 0;
    for (let i = 0; i < 500; i++)
      if (E.simular(f, 950000 + i, true).duration >= E.CONF.MAX_TIME - 2) perto++;
    ok(perto === 0,
      `${perto} de 500 rodadas chegaram perto do corte duro — a tempestade parou de encerrar antes`);
  });

  /* D-007 · CORRIGIDO — e a afirmação virou o contrário.
   *
   * O teste que morava aqui afirmava o defeito: lia os campos `dia:` do pool de
   * desafios, multiplicava por três por dia e sete dias, e exigia que o
   * resultado ESTOURASSE o orçamento. Ele ficou vermelho no dia em que a emissão
   * caiu — que é como o defeito avisa que fechou.
   *
   * O QUE ELE MEDIA DEIXOU DE EXISTIR: o campo `dia` foi removido, porque o
   * PC-B saiu do desafio e foi para o marco semanal. Campo que ninguém lê é
   * convite para alguém religá-lo, e religar aquele campo é o D-007 de volta.
   *
   * O teste novo mede a mesma grandeza pelo caminho novo, e reprova nos DOIS
   * sentidos: emissão acima do orçamento (o defeito antigo) e emissão zerada
   * (uma "correção" que resolve o número apagando a recompensa). */
  s.teste('D-007 · a emissão semanal dos desafios cabe no orçamento do Estudo', async () => {
    const { recompensaDeDesafio, ORCAMENTO_DESAFIOS_SEMANAL } =
      await import('../engine/emissao.mjs');

    /* A semana MAIS generosa possível: os 21 desafios do período, todos
       concluídos, carteira vazia, orçamento intocado. */
    let emitido = 0, saldo = 0;
    for (let i = 1; i <= POR_DIA * 7; i++) {
      const r = recompensaDeDesafio({ concluidosNaSemana: i, jaEmitidoNaSemana: emitido,
                                      saldoPcB: saldo });
      emitido += r.pcB; saldo += r.pcB;
    }

    ok(emitido <= ORCAMENTO_DESAFIOS, 
      `a emissão semanal máxima é ${emitido} PC-B, contra o sub-teto de ` +
      `${ORCAMENTO_DESAFIOS} do Estudo. Era ~525 antes do D-007 fechar.`);
    ok(emitido <= ORCAMENTO_AGREGADO,
      `a emissão estoura até o teto AGREGADO de ${ORCAMENTO_AGREGADO}`);

    /* E O OUTRO LADO, que é o que impede a "correção" preguiçosa: zerar a
       recompensa faz o número caber e destrói o desenho. */
    ok(emitido > 0,
      'a emissão semanal é ZERO. O orçamento passou a caber porque a recompensa ' +
      'sumiu, e o Estudo pede substituição, não supressão.');
    igual(emitido, ORCAMENTO_DESAFIOS_SEMANAL,
      `a semana perfeita emitiu ${emitido} e o orçamento é ` +
      `${ORCAMENTO_DESAFIOS_SEMANAL} — sobrou orçamento sem ninguém receber`);
  });

  /* O CAMPO MORTO NÃO PODE VOLTAR. Religar `dia:` no pool é o D-007 inteiro de
     volta, e é a forma mais provável de ele voltar: alguém lê a lista, acha que
     falta o valor da recompensa, e o repõe. */
  s.teste('D-007 · o pool de desafios não voltou a ter recompensa por conclusão', () => {
    const txt = readFileSync(new URL('../app/modules/desafios.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    const campos = [...txt.matchAll(/\b(dia|pcb|pcB|bonus|moeda):\s*\d+/g)].map(m => m[0]);
    ok(campos.length === 0,
      `o pool voltou a declarar recompensa em moeda por desafio: ${campos.join(', ')}. ` +
      `São 21 conclusões por semana; qualquer valor aqui multiplica por 21 contra ` +
      `um orçamento de ${ORCAMENTO_DESAFIOS}.`);
  });

  /* ------------------------------------------------------------------ *
   * D-018 · O ATAQUE, ESCRITO COMO TESTE E ESPERANDO FALHAR.
   *
   * Até o F1.15 este arquivo tinha DOIS testes que afirmavam o defeito de
   * propósito — a pool publicada identificava a raiz, e a raiz cabia em 32
   * bits. Os dois ficaram vermelhos quando o bloco fechou, que era exatamente
   * o combinado, e sumiram neste commit. No lugar deles entra o que o bloco
   * pede: **dada a pool publicada, não existe busca que devolva a raiz.**
   *
   * A busca aqui varre 2^24 candidatos, e a escolha é declarada: varrer o
   * espaço INTEIRO é impossível por construção — são 2^128, e é essa a
   * afirmação. O que a janela prova é a outra metade, a que dava para medir
   * antes: a pool NÃO estreita mais o espaço da raiz. Antes, uma janela de
   * 20.000 já continha a resposta.
   * ------------------------------------------------------------------ */
  s.teste('D-018 · a pool publicada não identifica mais a raiz', () => {
    const raiz = novaRaiz();
    igual(typeof raiz, 'string', 'a raiz voltou a ser número');
    igual(raiz.length, BITS_RAIZ / 4, `a raiz tem ${raiz.length} dígitos hex e devia ter ${BITS_RAIZ / 4}`);

    const poolDe = r => E.sortearPool(derivar(r, 'elenco')).map(f => f.dex).join(',');
    const alvo = poolDe(raiz);

    /* Varre TODAS as raízes de 32 bits que a busca antiga usava — a faixa
       inteira do esquema velho, amostrada. Se alguma delas produzisse a pool
       publicada, o D-018 teria voltado por outro caminho. */
    let colisoes = 0;
    for (let r = 0; r < 60000; r++) if (poolDe(r) === alvo) colisoes++;
    igual(colisoes, 0,
      `${colisoes} raízes NUMÉRICAS de 32 bits produzem a pool publicada por uma ` +
      `raiz de 128 bits. Se isto acontecer, o espaço efetivo da raiz encolheu de ` +
      `volta para 2^32 e o D-018 está de volta inteiro.`);
  });

  s.teste('D-018 · publicar um ramo não devolve mais a raiz', () => {
    /* `misturar()` é bijetiva: no esquema antigo, `sementeElenco` devolvia a
       raiz em O(1) — foi a ideia que o F1.14 teve e a medição matou. Com o
       ramo saindo de SHA-256, o caminho de volta não existe.

       O teste não tenta inverter o SHA-256 — isso seria afirmar o que não se
       pode medir. Ele afirma o que se mede: duas raízes que diferem em um bit
       dão ramos sem relação, e o ramo não carrega o comprimento nem o prefixo
       da raiz que o gerou. */
    const a = 'a'.repeat(32);
    const b = 'a'.repeat(31) + 'b';
    for (const ramo of RAMOS) {
      const va = derivar(a, ramo), vb = derivar(b, ramo);
      ok(va !== vb, `um dígito de diferença na raiz deu o MESMO ramo \`${ramo}\``);
      const bitsDiferentes = ((va ^ vb) >>> 0).toString(2).split('1').length - 1;
      ok(bitsDiferentes >= 8,
        `um dígito de diferença mudou só ${bitsDiferentes} bits do ramo \`${ramo}\` — ` +
        `sem avalanche, o ramo carrega informação sobre a raiz`);
    }
  });

  /* ------------------------------------------------------------------ *
   * E O GUARDA QUE VALE ANTES E DEPOIS DO F1.15.
   *
   * `misturar()` é o finalizador do splitmix32 e é BIJETIVA: cada passo se
   * desfaz — o `+` subtraindo, o `imul` pelo inverso modular, o `xor-shift`
   * por iteração. Confirmado em 200.000/200.000 casos ao medir o D-018.
   *
   * Consequência: publicar QUALQUER semente de ramo devolve a raiz em O(1),
   * sem busca nenhuma. O F1.14 quase publicou `sementeElenco` para o cliente
   * montar a pool sem esperar o reveal, e a medição matou a ideia antes de
   * virar código.
   *
   * Este guarda continua valendo depois do F1.15 — com raiz de 128 bits, uma
   * semente publicada não devolve a raiz, mas devolve o RAMO, e o ramo do
   * clima é segredo até o fechamento (§4.5, §P3).
   * ------------------------------------------------------------------ */
  s.teste('nenhuma semente de ramo é publicada com a janela aberta', () => {
    const txt = readFileSync(new URL('../server/scheduler.mjs', import.meta.url), 'utf8');
    const paraCliente = txt.slice(txt.indexOf('function paraCliente'));
    const publico = paraCliente.slice(0, paraCliente.indexOf('return publico'));
    const suspeitos = [...publico.matchAll(/\b(semente\w*|derivar\s*\()/g)].map(m => m[0]);
    igual(suspeitos.length, 0,
      `\`paraCliente()\` menciona ${suspeitos.join(', ')}. Semente de ramo publicada ` +
      `devolve a raiz em O(1) — \`misturar()\` é bijetiva. É a ideia que o F1.14 ` +
      `teve e a medição matou; ver D-018.`);
  });

  return s;
}
