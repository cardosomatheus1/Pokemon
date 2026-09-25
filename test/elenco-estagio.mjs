/* O ELENCO DE UM ESTÁGIO — bloco A1 (Spec §7.22.4).
 *
 * A afirmação central deste arquivo é uma só, e ela é de DERIVAÇÃO:
 *
 *   > O elenco não é escrito. Ele SAI do pack — do bioma, da faixa de raridade
 *   > e da linha evolutiva — e por isso acrescentar uma geração é acrescentar
 *   > espécies, e não caçar tabelas em onze lugares.
 *
 * O teste que mais vale aqui é o do estágio 1 da Floresta, e ele é peculiar:
 * ele afirma contra a PALAVRA DO DONO. Ele nomeou quatro espécies de cabeça,
 * mais dois chefes, antes de qualquer conta — e a regra derivada devolve
 * exatamente aquilo. Se alguém mexer na regra e o elenco mudar, este teste é o
 * que pergunta se a mudança foi de propósito.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  elencoDoEstagio, estagiosDoBioma, todosDoEstagio,
  COMUNS_POR_ESTAGIO, CHEFES_POR_ESTAGIO, REGRA_DO_ELENCO,
} from '../engine/elenco-estagio.mjs';
import { readFileSync } from 'node:fs';
import { faixasDoEstagio, ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import { elencoDoBioma, forcaDe } from '../engine/bioma.mjs';
import { saidasDe } from '../engine/evolucao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const BIOMAS = (kanto.biomas ?? []).map(b => b.id);
const nomeDe = dex => (kanto.especies ?? []).find(e => e.dex === dex)?.n ?? String(dex);
const todos = e => [...e.comuns, ...e.chefes];

export function suite() {
  const s = criarSuite('elenco-estagio');

  s.teste('a Floresta 1 devolve os QUATRO que o dono nomeou, e os dois chefes', () => {
    /* A frase dele, de 07/09/2026, antes de qualquer conta:
         "no stage 1 da floresta, você pode encontrar weedle, caterpie, metapod
          e kakuna [...] pode ter dois boss que surgem Beedril e Buterfree"

       Eu não escolhi nenhum destes. A regra derivada é que os devolve — e é a
       prova de que "o chefe é a evolução do mob" não é uma racionalização
       escrita depois, e sim o que o dado já dizia. */
    const e = elencoDoEstagio(kanto, 'floresta', 1);
    const comuns = e.comuns.map(x => nomeDe(x.dex)).sort();
    const chefes = e.chefes.map(x => nomeDe(x.dex)).sort();
    igual(comuns.join(','), 'caterpie,kakuna,metapod,weedle',
      `os comuns saíram ${comuns.join(', ')} — o dono nomeou caterpie, weedle, ` +
      'metapod e kakuna, e a regra derivada devolvia exatamente esses quatro');
    igual(chefes.join(','), 'beedrill,butterfree',
      `os chefes saíram ${chefes.join(', ')} — o dono nomeou beedrill e butterfree`);
  });

  s.teste('todo bioma × todo estágio devolve 4 + 2, e nunca estoura', () => {
    /* 44 combinações. Um elenco vazio ou curto num único par seria um estágio
       que abre e não tem o que lutar — e a tela não teria como avisar. */
    for (const b of BIOMAS) {
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const e = elencoDoEstagio(kanto, b, n);
        igual(e.comuns.length, COMUNS_POR_ESTAGIO,
          `${b}/${n} devolveu ${e.comuns.length} comum(ns), e o estágio pede ${COMUNS_POR_ESTAGIO}`);
        igual(e.chefes.length, CHEFES_POR_ESTAGIO,
          `${b}/${n} devolveu ${e.chefes.length} chefe(s), e o estágio pede ${CHEFES_POR_ESTAGIO}`);
      }
    }
  });

  s.teste('ninguém aparece num bioma onde não mora', () => {
    /* É a fidelidade que o §bioma já garante, e que este bloco não pode
       desfazer ao ir buscar chefe na linha evolutiva: a evolução de um bicho de
       mata pode ser de outro tipo e morar em outro lugar. */
    for (const b of BIOMAS) {
      const moram = new Set(elencoDoBioma(kanto, b).map(x => x.dex));
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++)
        for (const x of todos(elencoDoEstagio(kanto, b, n)))
          ok(moram.has(x.dex),
            `${nomeDe(x.dex)} entrou no elenco de ${b}/${n} sem morar no bioma`);
    }
  });

  s.teste('ninguém aparece numa faixa que o estágio não deixa', () => {
    for (const b of BIOMAS) {
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const faixas = faixasDoEstagio(n);
        for (const x of todos(elencoDoEstagio(kanto, b, n)))
          ok(faixas.includes(x.raridade),
            `${nomeDe(x.dex)} é "${x.raridade}" e entrou em ${b}/${n}, que só ` +
            `aceita ${faixas.join(', ')}`);
      }
    }
  });

  s.teste('O CHEFE É A EVOLUÇÃO DE UM COMUM — é a regra do bloco', () => {
    /* A regra inteira do A1 numa afirmação. Sem ela o chefe vira "o mais forte
       da lista", que é um número — e não uma coisa que o jogador reconhece
       quando aparece na décima wave. */
    let derivados = 0, total = 0;
    for (const b of BIOMAS) {
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const e = elencoDoEstagio(kanto, b, n);
        const evos = new Set(e.comuns.flatMap(c => saidasDe(kanto, c.dex).map(x => x.para)));
        for (const c of e.chefes) { total++; if (evos.has(c.dex)) derivados++; }
      }
    }
    /* Não são 100%: há estágio cujo elenco não tem evolução DENTRO do bioma e
       da faixa, e ali o chefe cai no reserva — o mais forte que sobrou. Se a
       maioria deixar de ser derivada, a regra virou enfeite. */
    ok(derivados / total >= 0.55,
      `só ${derivados} de ${total} chefes são evolução de um comum do próprio ` +
      'estágio. A regra "o chefe é a evolução do mob" deixou de valer na maioria ' +
      '— e ela é o que faz o elenco sair do pack em vez de uma tabela à mão.');
  });

  s.teste('um chefe nunca é também um comum', () => {
    /* Sem isto, a wave do chefe repetiria um bicho que o jogador já derrubou
       nove vezes, e a décima wave deixaria de ser um acontecimento. */
    for (const b of BIOMAS)
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const e = elencoDoEstagio(kanto, b, n);
        const c = new Set(e.comuns.map(x => x.dex));
        for (const x of e.chefes)
          ok(!c.has(x.dex),
            `${nomeDe(x.dex)} é chefe E comum em ${b}/${n} — a décima wave ` +
            'repetiria o que já foi derrubado nove vezes');
        igual(new Set(todos(e).map(x => x.dex)).size, todos(e).length,
          `${b}/${n} repetiu alguma espécie no elenco`);
      }
  });

  s.teste('o chefe é MAIS FORTE que o comum mais forte do estágio', () => {
    /* É o que o torna chefe. Um "chefe" mais fraco que o mob seria a décima
       wave sendo mais fácil que a nona — e o jogador leria isso como defeito,
       com razão. */
    for (const b of BIOMAS)
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const e = elencoDoEstagio(kanto, b, n);
        const tetoComum = Math.max(...e.comuns.map(x => x.forca));
        for (const x of e.chefes)
          ok(x.forca > tetoComum,
            `em ${b}/${n} o chefe ${nomeDe(x.dex)} tem força ${x.forca} e o comum ` +
            `mais forte tem ${tetoComum} — a décima wave ficaria mais fácil que a nona`);
      }
  });

  s.teste('descer mostra rosto novo — até onde o bioma tem gente', () => {
    /* O §7.22.4 promete que descer é ver outra coisa. Mas quatro estágios pedem
       VINTE E QUATRO vagas de elenco, e nem todo bioma tem gente para isso.

       Então a afirmação não é "sempre distintos": é **distintos até onde o
       conteúdo alcança, e o motor sabe dizer até onde.** Um número que promete
       quatro e entrega dois em silêncio é a moldura vazia da L-099. */
    for (const b of BIOMAS) {
      const fundo = estagiosDoBioma(kanto, b);
      ok(fundo >= 1, `${b} não sustenta nem um estágio`);
      const vistos = new Set();
      for (let n = 1; n <= fundo; n++) {
        const chave = todosDoEstagio(elencoDoEstagio(kanto, b, n))
          .map(x => x.dex).sort((a, c) => a - c).join(',');
        ok(!vistos.has(chave),
          `${b} declara ${fundo} estágio(s) distintos e repetiu o elenco no ${n}º`);
        vistos.add(chave);
      }
    }
  });

  s.teste('e o bioma RASO é medido, e não escondido', () => {
    /* Medido em 07/09/2026, e este teste existe para o número não envelhecer
       calado — é a mesma regra do `CLAUDE.md` sobre número em documento.

       O vulcão tem CATORZE espécies e NENHUMA na faixa "raro": as faixas do
       estágio 2 acabam sendo as mesmas do 1, e não há recorte que produza
       elenco novo sem quebrar a faixa que a prévia promete.

         > Um bioma raso não é defeito de algoritmo. É fato do conteúdo — e o
         > lugar de um fato do conteúdo é registrado, não contornado.

       Ver a L-143. Se alguém acrescentar espécies e o vulcão melhorar, este
       teste reprova e pede que o número seja reescrito. */
    const fundos = Object.fromEntries(BIOMAS.map(b => [b, estagiosDoBioma(kanto, b)]));
    const rasos = BIOMAS.filter(b => fundos[b] < ESTAGIOS_POR_BIOMA);
    igual(rasos.join(','), 'vulcao',
      `os biomas rasos hoje são [${rasos.join(', ')}], e a medição de 07/09/2026 ` +
      `dizia [vulcao]. Fundos: ${JSON.stringify(fundos)}`);
    igual(fundos.vulcao, 1,
      `o vulcão sustenta ${fundos.vulcao} estágio(s) distinto(s), e a medição ` +
      'dizia 1. Se acrescentaram espécies de faixa "raro" a ele, reescreva o ' +
      'número aqui e na L-143 — com o antigo ao lado do novo.');
  });

  s.teste('mesmo no bioma raso, TODO estágio devolve um elenco jogável', () => {
    /* Repetir elenco é aceitável; devolver estágio sem chefe não é. A décima
       wave é o clímax da run, e um estágio sem ela é uma run sem fim. */
    for (const b of BIOMAS)
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const e = elencoDoEstagio(kanto, b, n);
        igual(e.comuns.length, COMUNS_POR_ESTAGIO, `${b}/${n} ficou sem comuns`);
        igual(e.chefes.length, CHEFES_POR_ESTAGIO, `${b}/${n} ficou SEM CHEFE`);
      }
  });

  s.teste('a mesma pergunta devolve a mesma resposta', () => {
    /* Nada aqui é sorteado: o elenco de um estágio é uma PROPRIEDADE dele, e o
       cartão da tela de escolha mostra esse elenco antes de o jogador entrar.
       Se ele mudasse a cada chamada, o cartão mentiria. */
    for (const b of BIOMAS)
      for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
        const a = JSON.stringify(elencoDoEstagio(kanto, b, n));
        const c = JSON.stringify(elencoDoEstagio(kanto, b, n));
        igual(a, c, `${b}/${n} devolveu elencos diferentes em duas chamadas`);
      }
  });

  s.teste('bioma ou estágio que não existem não derrubam o jogo', () => {
    /* Um save antigo pode citar um bioma que saiu do pack. Devolver vazio é
       resposta; explodir é o jogo fechando na cara de quem voltou. */
    for (const [b, n] of [['inexistente', 1], ['floresta', 0], ['floresta', 99], [null, 2]]) {
      const e = elencoDoEstagio(kanto, b, n);
      ok(e && Array.isArray(e.comuns) && Array.isArray(e.chefes),
        `elencoDoEstagio(${JSON.stringify(b)}, ${n}) não devolveu a forma esperada`);
    }
    igual(elencoDoEstagio(kanto, 'inexistente', 1).comuns.length, 0,
      'um bioma que não existe devolveu elenco — de onde?');
    /* E estágio fora da escada é APERTADO para dentro dela, como o resto do
       projeto faz: `faixasDoEstagio` já trata 0 e 99 assim, e duas regras
       diferentes para o mesmo número seriam duas verdades. */
    igual(JSON.stringify(elencoDoEstagio(kanto, 'floresta', 0)),
          JSON.stringify(elencoDoEstagio(kanto, 'floresta', 1)),
          'estágio 0 não foi apertado para o 1, e `faixasDoEstagio` aperta');
  });

  s.teste('o motor não conhece o tema — outro pack, outro elenco', () => {
    /* A prova do §0.3: um pack sintético, com nomes que não são de franquia
       nenhuma, tem de atravessar a mesma função sem uma linha de exceção. */
    const pack = {
      biomas: [{ id: 'lugar', rotulo: 'Lugar', tipos: ['a'] }],
      raridade: [['comum', 200], ['incomum', 320], ['raro', 999]],
      especies: [
        { dex: 1, n: 'um',    t: ['a'], s: [10, 10, 10, 10, 10, 10] },
        { dex: 2, n: 'dois',  t: ['a'], s: [20, 20, 20, 20, 20, 20] },
        { dex: 3, n: 'tres',  t: ['a'], s: [25, 25, 25, 25, 25, 25] },
        { dex: 4, n: 'quatro',t: ['a'], s: [28, 28, 28, 28, 28, 28] },
        { dex: 5, n: 'cinco', t: ['a'], s: [50, 50, 50, 50, 50, 50] },
        { dex: 6, n: 'seis',  t: ['a'], s: [52, 52, 52, 52, 52, 52] },
      ],
      evolucoes: [{ de: 1, para: 5, exige: {} }, { de: 2, para: 6, exige: {} }],
    };
    const e = elencoDoEstagio(pack, 'lugar', 1);
    igual(e.comuns.length, 4, 'o pack sintético não devolveu quatro comuns');
    igual(e.chefes.map(x => x.dex).sort().join(','), '5,6',
      'os chefes do pack sintético não são as evoluções dos comuns');
  });

  /* ══ 1.33 · O ELENCO MUDA COM A CONDIÇÃO (L-178) ════════════════════════
   *
   * Cartão em `docs/PROXIMO_BLOCO_1.33.md` (Revisão 2.0, conciliada com o
   * código). O motor NÃO sabe o que é "noite" nem "chuva": recebe uma lista de
   * PREFERÊNCIAS por tipo, e quem traduz a hora e o clima em tipos é a camada 0
   * do app. É o que mantém o motor agnóstico ao tema. */

  const BASE = JSON.parse(readFileSync(new URL('./fixtures/elenco-base.json', import.meta.url), 'utf8'));
  const dexes = e => ({ comuns: e.comuns.map(x => x.dex), chefes: e.chefes.map(x => x.dex) });
  const NOITE = { fonte: 'noite', favorece: ['ghost', 'poison', 'psychic'], desfavorece: ['bug', 'grass', 'normal'] };
  const tiposDe = dex => (kanto.especies ?? []).find(e => e.dex === dex)?.t ?? [];

  s.teste('sem condição, o elenco é EXATAMENTE o de antes — ordem e desempates', () => {
    /* A fixture foi fotografada ANTES de o 1.33 mexer no motor. É o invariante
       nº 2 do cartão, e o que protege toda run que já existe. */
    for (const [chave, esperado] of Object.entries(BASE)) {
      const [b, n] = chave.split(':');
      for (const cond of [undefined, null, []])
        igual(JSON.stringify(dexes(elencoDoEstagio(kanto, b, Number(n), cond))), JSON.stringify(esperado),
          `${chave} mudou SEM condição nenhuma (${JSON.stringify(cond)}). O 1.33 só ` +
          'pode mexer no elenco quando há hora ou clima; sem eles, a run de ontem ' +
          'tem de dar o mesmo elenco hoje.');
    }
  });

  s.teste('com a noite, todo membro continua morando no bioma e na faixa, e a raridade do slot fica', () => {
    for (const b of BIOMAS) for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
      const base = elencoDoEstagio(kanto, b, n);
      const e = elencoDoEstagio(kanto, b, n, [NOITE]);
      const moram = new Set(elencoDoBioma(kanto, b).map(x => x.dex));
      const faixas = faixasDoEstagio(n);
      for (const x of todos(e)) {
        ok(moram.has(x.dex), `${b}:${n} — a noite trouxe ${nomeDe(x.dex)}, que não mora ali`);
        ok(faixas.includes(x.raridade), `${b}:${n} — a noite trouxe ${nomeDe(x.dex)} fora da faixa`);
      }
      igual(e.comuns.map(x => x.raridade).sort().join(','), base.comuns.map(x => x.raridade).sort().join(','),
        `${b}:${n} — a noite mudou a RARIDADE dos slots. A troca é de rosto, e não de faixa.`);
      igual(e.comuns.length, COMUNS_POR_ESTAGIO, `${b}:${n} — a noite mudou quantos comuns há`);
    }
  });

  s.teste('com a noite, os chefes continuam válidos: dois, e mais fortes que todo comum', () => {
    for (const b of BIOMAS) for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
      const base = elencoDoEstagio(kanto, b, n);
      if (base.chefes.length < CHEFES_POR_ESTAGIO) continue;
      const e = elencoDoEstagio(kanto, b, n, [NOITE]);
      igual(e.chefes.length, CHEFES_POR_ESTAGIO, `${b}:${n} — a noite deixou o estágio sem os dois chefes`);
      const teto = Math.max(...e.comuns.map(x => x.forca));
      for (const c of e.chefes)
        ok(c.forca > teto, `${b}:${n} — ${nomeDe(c.dex)} é chefe e não é mais forte que os comuns da noite`);
    }
  });

  s.teste('onde existe candidato noturno, ao menos um comum MUDA — e o que entrou é noturno', () => {
    /* Invariante nº 4 do cartão: se a condição pode mudar alguma coisa, ela
       muda. Uma noite que nunca troca ninguém é o "número que ninguém vê" que o
       dono proibiu. */
    let mudaram = 0;
    for (const b of BIOMAS) for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
      const base = elencoDoEstagio(kanto, b, n);
      const e = elencoDoEstagio(kanto, b, n, [NOITE]);
      const antes = new Set(base.comuns.map(x => x.dex));
      const entraram = e.comuns.filter(x => !antes.has(x.dex));
      for (const x of entraram)
        ok(tiposDe(x.dex).some(t => NOITE.favorece.includes(t)),
          `${b}:${n} — ${nomeDe(x.dex)} entrou à noite sem ser de tipo noturno`);
      if (entraram.length) mudaram++;
      ok(Array.isArray(e.trocas), `${b}:${n} — o elenco com condição não explica o que trocou`);
      igual(e.trocas.length, entraram.length, `${b}:${n} — a explicação não bate com o que mudou`);
    }
    ok(mudaram >= 6,
      `só ${mudaram} dos 44 estágios mudam à noite. Kanto tem veneno e psíquico em quase ` +
      'todo bioma; uma noite que quase nunca troca ninguém é invisível — e a regra do ' +
      'dono é efeito VISÍVEL.');
  });

  s.teste('quem entra à noite é rosto NOVO: nenhum estágio anterior do bioma o usou', () => {
    /* A exclusão entre estágios vale para a troca também. Sem ela, a noite
       traria de volta o Oddish que o jogador já venceu no estágio 2 — e o
       estágio 3 "novo" seria o 2 repetido. Medido contra a FIXTURE, e não
       contra a função: comparar a função com ela mesma não prova nada. */
    for (const b of BIOMAS) for (let n = 2; n <= ESTAGIOS_POR_BIOMA; n++) {
      const usados = new Set();
      for (let j = 1; j < n; j++) {
        const x = BASE[`${b}:${j}`];
        if (x) [...x.comuns, ...x.chefes].forEach(d => usados.add(d));
      }
      for (const t of elencoDoEstagio(kanto, b, n, [NOITE]).trocas ?? [])
        ok(!usados.has(t.entrou),
          `${b}:${n} — ${nomeDe(t.entrou)} entrou à noite, e um estágio anterior já o usou`);
    }
  });

  s.teste('a troca escolhe o candidato MAIS FRACO — três casos medidos no 1.33', () => {
    /* A regra "o mais fraco entra" preserva o degrau até o chefe. Três trocas
       medidas quando o 1.33 fechou, fixadas aqui: com a ordem invertida, o
       candidato forte entra e estes números mudam. Mudança de PROPÓSITO na
       regra reescreve esta tabela no mesmo commit, com a medição nova. */
    const medidas = [['floresta', 1, 11, 69], ['floresta', 2, 46, 43], ['ruina', 4, 87, 97]];
    for (const [b, n, saiu, entrou] of medidas) {
      const t = (elencoDoEstagio(kanto, b, n, [NOITE]).trocas ?? [])[0];
      igual(t && `${t.saiu}->${t.entrou}`, `${saiu}->${entrou}`,
        `${b}:${n} — a noite trocou outra coisa (${nomeDe(saiu)} por ${nomeDe(entrou)} era o medido)`);
    }
  });

  s.teste('a mesma condição dá sempre o mesmo elenco', () => {
    for (const b of BIOMAS)
      igual(JSON.stringify(dexes(elencoDoEstagio(kanto, b, 2, [NOITE]))),
            JSON.stringify(dexes(elencoDoEstagio(kanto, b, 2, [NOITE]))),
            `${b}:2 — a noite deu dois elencos diferentes para a mesma entrada`);
  });

  s.teste('a condição não muda a escada: os estágios seguem medidos pelo elenco-BASE', () => {
    /* A exclusão de quem os estágios anteriores já usaram TEM de ler o
       elenco-base. Se lesse o condicionado, a noite de um estágio mudaria
       quem aparece nos outros. */
    /* Recontado a partir da FIXTURE, e não da função: comparar a função com ela
       mesma passaria sempre — a primeira versão deste teste fazia isso, e era
       decorativa. */
    const daFixture = b => {
      const vistos = new Set(); let n = 0;
      for (let i = 1; i <= ESTAGIOS_POR_BIOMA; i++) {
        const e = BASE[`${b}:${i}`];
        if (!e || e.comuns.length < COMUNS_POR_ESTAGIO || e.chefes.length < CHEFES_POR_ESTAGIO) break;
        const chave = [...e.comuns, ...e.chefes].sort((x, y) => x - y).join(',');
        if (vistos.has(chave)) break;
        vistos.add(chave); n = i;
      }
      return n;
    };
    for (const b of BIOMAS)
      igual(estagiosDoBioma(kanto, b), daFixture(b),
        `${b} — a quantidade de estágios mudou: a condição vazou para a escada`);
  });

  s.teste('uma preferência por tipo que não existe no bioma devolve o elenco-base', () => {
    const nada = { fonte: 'teste', favorece: ['tipo-que-nao-existe'], desfavorece: [] };
    for (const [chave, esperado] of Object.entries(BASE)) {
      const [b, n] = chave.split(':');
      const e = elencoDoEstagio(kanto, b, Number(n), [nada]);
      igual(JSON.stringify(dexes(e)), JSON.stringify(esperado),
        `${chave} — uma preferência sem candidato inventou uma troca`);
      igual(e.trocas.length, 0, `${chave} — sem troca, a explicação tem de estar vazia`);
    }
  });

  s.teste('a regra do elenco tem VERSÃO, para a run antiga não mudar por baixo', () => {
    ok(Number.isInteger(REGRA_DO_ELENCO) && REGRA_DO_ELENCO >= 1,
      'a regra do elenco não tem versão. Sem ela, uma run começada antes do 1.33 passa ' +
      'a ter outro elenco no meio — o cartão proíbe reprocessar em silêncio.');
  });

  return s;
}
