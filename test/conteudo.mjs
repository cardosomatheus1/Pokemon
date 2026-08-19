/* Q1/Q3/Q6 · CONTENT LAYER — o motor não sabe o que é um Pokémon.
 *
 * Três afirmações, e o bloco F0.4 vale por elas:
 *
 *   1. Todo pack VÁLIDO gera rodada válida — provado contra um pack de 12
 *      criaturas inventadas, sem uma linha da franquia dentro.
 *   2. Todo pack INVÁLIDO é recusado no CARREGAMENTO. Nunca no meio da
 *      batalha: a diferença entre "não abre e diz por quê" e "abre e o
 *      décimo lutador some".
 *   3. Nenhum identificador da franquia sobrou em engine/. Se sobrou, a
 *      camada não separou nada — só mudou de arquivo.
 *
 * O portão Q6 mora aqui porque validação de pack É superfície: no servidor da
 * V2 o pack vem de fora, e pack malformado não pode executar código nem
 * pendurar o processo.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarMotor, tiposDaPool } from '../engine/engine.mjs';
import { validarPack } from '../engine/pack.mjs';
import packSintetico from './pack-sintetico.mjs';
import packKanto from '../content/pokemon_kanto_v1.mjs';
import { criarSuite, ok, igual } from './harness.mjs';

const ENGINE = new URL('../engine/', import.meta.url);

/* Cópia profunda que preserva funções — estrutura de dados com métodos, que é
   o que um pack é. JSON não serve. */
const clonar = v => {
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clonar(x)]));
  return v;
};

/* Cada entrada estraga UMA coisa. O nome descreve o estrago, não o campo:
   o que o teste afirma é que o carregamento recusa, não como a mensagem sai. */
const ESTRAGOS = [
  ['pack que não é objeto',            () => 'nem um pack'],
  ['sem id',                           p => { delete p.id; return p; }],
  ['espécie sem nenhum tipo',          p => { p.especies[3].t = []; return p; }],
  ['espécie com três tipos',           p => { p.especies[3].t = ['brasa','limo','vento']; return p; }],
  ['espécie com tipo desconhecido',    p => { p.especies[3].t = ['plasma']; return p; }],
  ['espécie com dex duplicado',        p => { p.especies[3].dex = p.especies[2].dex; return p; }],
  ['espécie com 5 stats',              p => { p.especies[3].s = [1,2,3,4,5]; return p; }],
  ['tabela de tipos aponta pra tipo inexistente', p => { p.tipos.efetividade.brasa.plasma = 2; return p; }],
  ['elenco menor que a arena',         p => { p.elenco = p.elenco.slice(0, 8); return p; }],
  ['elenco aponta pra dex inexistente',p => { p.elenco = [...p.elenco.slice(1), 9999]; return p; }],
  ['sem pool de reserva',              p => { delete p.golpes.normal; return p; }],
  ['pool de golpes vazio',             p => { p.golpes.brasa = []; return p; }],
  /* A espécie 0 é de tipo `brasa` puro. Sem o pool dela, ela não alcança
     nenhum golpe do próprio tipo — o caso que o F0.4 manda falhar ALTO, e que
     escapou da primeira rodada de sabotagem (S22) porque nenhum estrago
     apresentava um pack nessa forma. */
  ['espécie sem pool para nenhum tipo seu', p => { delete p.golpes.brasa; return p; }],
  ['golpe com categoria inventada',    p => { p.golpes.brasa[0].cat = 'mental'; return p; }],
  ['clima favorece tipo fora do elenco', p => { p.clima[1].type = 'plasma'; return p; }],
  ['clima com peso zero em tudo',      p => { p.clima.forEach(c => c.w = 0); return p; }],
  ['sem função de sprite',             p => { delete p.sprite; return p; }],
  ['moeda sem símbolo',                p => { delete p.moeda.simbolo; return p; }],
];

/* Q6 — o mesmo formato, mas as entradas atacam em vez de errar. */
const ATAQUES = [
  ['stat negativo',                    p => { p.especies[0].s[1] = -50; return p; }],
  ['stat NaN',                         p => { p.especies[0].s[1] = NaN; return p; }],
  ['stat Infinity',                    p => { p.especies[0].s[0] = Infinity; return p; }],
  ['stat como string numérica',        p => { p.especies[0].s[2] = '90'; return p; }],
  ['poder de golpe absurdo',           p => { p.golpes.brasa[0].p = 1e9; return p; }],
  ['precisão maior que 1',             p => { p.golpes.brasa[0].acc = 40; return p; }],
  ['efetividade fora da faixa',        p => { p.tipos.efetividade.brasa.limo = 1e6; return p; }],
  ['efetividade negativa',             p => { p.tipos.efetividade.brasa.limo = -2; return p; }],
  ['multiplicador de clima absurdo',   p => { p.clima[1].mult = 500; return p; }],
  ['espécies como objeto, não array',  p => { p.especies = { 0: p.especies[0] }; return p; }],
  ['tabela de tipos como array',       p => { p.tipos.efetividade = []; return p; }],
  ['golpe com poder como string',      p => { p.golpes.brasa[0].p = '75'; return p; }],
];

export function suite() {
  const s = criarSuite('conteudo');

  /* ---------------------------------------------------------------- Q1/Q3 */

  s.teste('o pack sintético é aceito', () => {
    const erros = validarPack(packSintetico);
    ok(erros.length === 0, `pack sintético recusado: ${erros.join('; ')}`);
  });

  s.teste('o pack sintético monta uma rodada válida', () => {
    const E = criarMotor(packSintetico);
    const pool = E.sortearPool(7);
    igual(pool.length, 12, 'a arena não recebeu 12 lutadores');
    const nomes = new Set();
    for (const f of pool) {
      ok(typeof f.n === 'string' && f.n.length > 0, 'lutador sem nome');
      ok(f.maxHp > 0, `${f.n} sem vida`);
      ok(f.moves.length >= 1 && f.moves.length <= 4, `${f.n} tem ${f.moves.length} golpes`);
      for (const m of f.moves) ok(m.p > 0 && typeof m.t === 'string', `${f.n} com golpe malformado`);
      ok(typeof f.sprite === 'string' && f.sprite.length > 0, `${f.n} sem sprite`);
      ok(f.types.every(t => t in packSintetico.tipos.efetividade), `${f.n} com tipo fora da tabela`);
      nomes.add(f.n);
    }
    igual(nomes.size, 12, 'a arena repetiu lutador');
  });

  s.teste('a rodada do pack sintético sempre termina com vencedor', () => {
    const E = criarMotor(packSintetico);
    const pool = E.sortearPool(7);
    for (let seed = 1; seed <= 300; seed++) {
      const w = E.simular(pool, seed, false);
      ok(Number.isInteger(w) && w >= 0 && w < pool.length,
        `semente ${seed} devolveu vencedor ${w}`);
    }
  });

  s.teste('o clima do pack sintético sempre tem quem buffar', () => {
    const E = criarMotor(packSintetico);
    for (let i = 1; i <= 60; i++) {
      const pool = E.sortearPool(i);
      const clima = E.sortearClima(i * 13 + 1, tiposDaPool(pool));
      if (!clima.type) continue;
      ok(pool.some(f => f.types.includes(clima.type)),
        `clima ${clima.key} saiu numa pool sem nenhum ${clima.type}`);
    }
  });

  /* Este é o teste que prova a Content Layer de verdade: se o motor guardasse
     qualquer estado do tema — tabela em módulo, cache global, o que for — os
     dois packs se contaminariam. */
  s.teste('dois packs coexistem no mesmo processo sem se contaminar', () => {
    const A = criarMotor(packKanto);
    const B = criarMotor(packSintetico);
    const poolA = A.montarElenco(A.elenco.slice(0, 12));
    const poolB = B.montarElenco(B.elenco.slice(0, 12));
    const antes = A.simular(poolA, 4242, true);
    B.simular(poolB, 4242, true);            // o pack sintético trabalha no meio
    const depois = A.simular(poolA, 4242, true);
    igual(depois.winner, antes.winner, 'o vencedor do pack Kanto mudou com o outro pack carregado');
    igual(depois.events.length, antes.events.length, 'o número de eventos do pack Kanto mudou');
    ok(A.efeito('fire', ['grass']) !== undefined, 'o pack Kanto perdeu a própria tabela');
    ok(B.efeito('brasa', ['limo']) === 2, 'o pack sintético perdeu a própria tabela');
  });

  s.teste('todo pack inválido é recusado no carregamento', () => {
    for (const [nome, estragar] of ESTRAGOS) {
      const ruim = estragar(clonar(packSintetico));
      let recusou = false;
      try { criarMotor(ruim); } catch (e) {
        recusou = true;
        ok(/ContentPack inválido/.test(e.message), `${nome}: recusou por outro motivo — ${e.message}`);
      }
      ok(recusou, `${nome}: o motor ACEITOU o pack. Isso vira defeito no meio da batalha.`);
    }
  });

  /* A recusa tem que acontecer ANTES de qualquer simulação. Um pack ruim que
     só estoura na décima rodada é o modo de falha que o bloco existe pra
     fechar, e "criarMotor lançou" não prova isso sozinho: prova que lançou,
     não que lançou cedo. Este teste conta batalhas. */
  s.teste('nenhuma recusa acontece no meio da batalha', () => {
    for (const [nome, estragar] of [...ESTRAGOS, ...ATAQUES]) {
      const ruim = estragar(clonar(packSintetico));
      let motor = null;
      try { motor = criarMotor(ruim); } catch { continue; }   // recusado na porta: certo
      /* Chegou aqui = o validador aceitou. Então tem que aguentar a rodada
         inteira, sem exceção e sem lutador quebrado. */
      const pool = motor.sortearPool(7);
      igual(pool.length, 12, `${nome}: pack aceito montou pool de ${pool.length}`);
      for (let seed = 1; seed <= 50; seed++) {
        const w = motor.simular(pool, seed, false);
        ok(w >= 0, `${nome}: pack aceito produziu rodada sem vencedor na semente ${seed}`);
      }
    }
  });

  /* ------------------------------------------------------------------- Q6 */

  s.teste('pack malformado é recusado, não executado', () => {
    for (const [nome, estragar] of ATAQUES) {
      const ruim = estragar(clonar(packSintetico));
      let recusou = false;
      try { criarMotor(ruim); } catch { recusou = true; }
      ok(recusou, `${nome}: passou pela validação`);
    }
  });

  s.teste('campo extra não vira comportamento', () => {
    const p = clonar(packSintetico);
    p.extra = 'lixo';
    p.especies[0].extra = { profundo: [1, 2, 3] };
    p.golpes.brasa[0].efeitoColateral = 'queimar';
    /* Um getter que estoura ao ser lido. Se a validação varrer o pack sem
       critério, ele derruba o carregamento — e aí um pack hostil derruba o
       servidor da V2 só existindo. */
    Object.defineProperty(p, 'armadilha', { enumerable: true, get() { throw new Error('lido'); } });
    const E = criarMotor(p);
    const pool = E.sortearPool(7);
    igual(pool.length, 12, 'o pack com campos extras não montou rodada');
    ok(pool.every(f => f.moves.every(m => m.efeitoColateral === undefined || m.p > 0)),
      'campo extra de golpe virou comportamento');
  });

  s.teste('pack não polui o prototype', () => {
    const p = clonar(packSintetico);
    const hostil = JSON.parse('{"__proto__":{"invadido":true},"constructor":{"prototype":{"invadido":true}}}');
    Object.assign(p, hostil);
    try { criarMotor(p); } catch { /* recusar também é resposta válida */ }
    ok({}.invadido === undefined, 'Object.prototype foi poluído pelo pack');
    ok(Object.prototype.invadido === undefined, 'Object.prototype foi poluído pelo pack');
  });

  s.teste('validação de pack grande termina rápido', () => {
    const p = clonar(packSintetico);
    /* 5.000 espécies e 5.000 no elenco. O que este teste procura é custo
       quadrático escondido — `elenco.includes` dentro de laço sobre espécies
       é exatamente essa armadilha, e num servidor ela é negação de serviço. */
    const base = p.especies[0];
    for (let i = 13; i <= 5000; i++) p.especies.push({ ...base, dex: i, n: `criatura${i}`, s: base.s.slice() });
    p.elenco = p.especies.map(x => x.dex);
    const t0 = process.hrtime.bigint();
    const erros = validarPack(p);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    ok(erros.length === 0, `pack grande recusado: ${erros.slice(0, 3).join('; ')}`);
    ok(ms < 1500, `validação levou ${ms.toFixed(0)}ms para 5.000 espécies — custo não-linear`);
  });

  /* ----------------------------------------------------- vazamento de tema */

  /* A Spec §0.3 diz `Engine != Pokémon`. A prova é textual e é a única que
     não depende de alguém lembrar da regra. A lista é de identificadores da
     FRANQUIA — não de palavras em português que por acaso aparecem. */
  s.teste('nenhum identificador da franquia sobrou no motor', () => {
    const PROIBIDO = [
      'pokemon', 'poké', 'pokedex', 'kanto', 'pikachu', 'gengar', 'charizard',
      'ditto', 'dragonite', 'mewtwo', 'showdown', 'pokeapi', 'pokecash',
      'nintendo', 'game freak',
    ];
    /* "PokéArena" é o nome do PRODUTO, não da franquia, e aparece no cabeçalho
       de todo arquivo. Fica de fora por decisão explícita — se um dia o produto
       mudar de nome, esta linha some junto. */
    const PERMITIDO = ['pokéarena'];
    for (const f of readdirSync(ENGINE).filter(x => x.endsWith('.mjs'))) {
      let txt = readFileSync(new URL(f, ENGINE), 'utf8').toLowerCase();
      for (const p of PERMITIDO) txt = txt.split(p).join(' ');
      for (const termo of PROIBIDO)
        ok(!txt.includes(termo),
          `engine/${f} cita "${termo}". O motor tem que rodar contra qualquer pack — ` +
          `identificador de tema vive em content/.`);
    }
  });

  s.teste('o motor não importa nada de content/', () => {
    for (const f of readdirSync(ENGINE).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, ENGINE), 'utf8');
      ok(!/from\s+['"][^'"]*content\//.test(txt),
        `engine/${f} importa de content/ — a dependência é ao contrário`);
    }
  });

  return s;
}
