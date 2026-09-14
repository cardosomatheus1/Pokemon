import { CANAIS as CANAIS_IDLE } from './clima-idle.mjs';

/* Validação de ContentPack.
 *
 * Um pack inválido é recusado no CARREGAMENTO, nunca no meio de uma batalha.
 * É a diferença entre "o jogo não abre e diz por quê" e "o jogo abre e o
 * décimo lutador some sem explicação".
 *
 * A validação também é superfície de segurança: pack malformado não pode
 * causar execução arbitrária nem laço infinito no servidor futuro. Por isso
 * ela checa tipo, faixa e forma — não confia em nada.
 */

const TIPO = (v, t) => typeof v === t;
const eObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/* Devolve a lista de problemas. Vazia = pack válido. */
export function validarPack(pack) {
  const e = [];
  const exigir = (cond, msg) => { if (!cond) e.push(msg); return cond; };

  if (!exigir(eObj(pack), 'o pack não é um objeto')) return e;
  exigir(TIPO(pack.id, 'string') && pack.id.length > 0, 'id ausente ou vazio');

  /* --- tipos --- */
  if (exigir(eObj(pack.tipos) && eObj(pack.tipos.efetividade), 'tipos.efetividade ausente')) {
    const chart = pack.tipos.efetividade;
    const nomes = Object.keys(chart);
    exigir(nomes.length > 0, 'tipos.efetividade está vazio');
    for (const [t, linha] of Object.entries(chart)) {
      if (!exigir(eObj(linha), `tipos.efetividade.${t} não é objeto`)) continue;
      for (const [alvo, mult] of Object.entries(linha)) {
        exigir(nomes.includes(alvo), `tipos.efetividade.${t} aponta para o tipo desconhecido "${alvo}"`);
        exigir(TIPO(mult, 'number') && mult >= 0 && mult <= 4 && Number.isFinite(mult),
          `tipos.efetividade.${t}.${alvo} = ${mult} fora da faixa [0,4]`);
      }
    }
    exigir(eObj(pack.tipos.cores), 'tipos.cores ausente');
    exigir(eObj(pack.tipos.nomes), 'tipos.nomes ausente');
  }

  /* --- rótulos (F1.12) ---
     A interface precisa chamar as criaturas de alguma coisa, e esse nome é do
     TEMA. Sem este campo, o cliente escreve o nome da franquia — foi assim que
     ele apareceu em nove lugares de produção. */
  if (exigir(eObj(pack.rotulos), 'rotulos ausente: a interface não tem como nomear as criaturas'))
    for (const k of ['criatura', 'criaturas', 'elenco'])
      exigir(TIPO(pack.rotulos[k], 'string') && pack.rotulos[k].length > 0,
        `rotulos.${k} ausente ou vazio`);

  /* --- espécies --- */
  if (exigir(Array.isArray(pack.especies) && pack.especies.length > 0, 'especies ausente ou vazio')) {
    const vistos = new Set();
    const tipos = Object.keys(pack.tipos?.efetividade ?? {});
    pack.especies.forEach((p, i) => {
      if (!eObj(p)) return e.push(`especies[${i}] não é objeto`);
      exigir(Number.isInteger(p.dex) && p.dex > 0, `especies[${i}].dex inválido`);
      exigir(!vistos.has(p.dex), `dex duplicado: ${p.dex}`); vistos.add(p.dex);
      exigir(TIPO(p.n, 'string') && p.n.length > 0, `especies[${i}].n ausente`);
      if (exigir(Array.isArray(p.t) && p.t.length >= 1 && p.t.length <= 2,
        `especies[${i}] (${p.n}) precisa de 1 ou 2 tipos, tem ${p.t?.length}`))
        for (const t of p.t) exigir(tipos.includes(t), `especies[${i}] (${p.n}) usa tipo desconhecido "${t}"`);
      if (exigir(Array.isArray(p.s) && p.s.length === 6, `especies[${i}] (${p.n}) precisa de 6 stats`))
        p.s.forEach((v, k) => exigir(Number.isFinite(v) && v > 0 && v <= 999,
          `especies[${i}] (${p.n}) stat[${k}] = ${v} fora da faixa`));
    });
  }

  /* --- elenco --- */
  if (exigir(Array.isArray(pack.elenco) && pack.elenco.length > 0, 'elenco ausente ou vazio')) {
    const dex = new Set((pack.especies ?? []).map(p => p.dex));
    for (const d of pack.elenco) exigir(dex.has(d), `elenco aponta para o dex ${d}, que não existe em especies`);
    exigir(pack.elenco.length >= 12, `elenco tem ${pack.elenco.length} espécies; a arena sorteia 12`);
  }

  /* --- golpes --- */
  if (exigir(eObj(pack.golpes), 'golpes ausente')) {
    const tipos = Object.keys(pack.tipos?.efetividade ?? {});
    /* ── L-021 FECHADA NO F1.12 ──────────────────────────────────────────
     *
     * O motor exigia um pool chamado literalmente `normal`. Isso é decisão de
     * TEMA vazando para o motor: "normal" é um tipo da franquia, e um pack que
     * não tenha esse conceito — como o `original_v1`, cuja roda tem oito tipos
     * e nenhum genérico — era recusado no carregamento por um nome.
     *
     * O pack passa a DECLARAR qual dos seus pools é o de reserva. Quem não
     * declarar continua valendo se tiver um `normal`, porque o pack de desenvolvimento tem e
     * mudar o arquivo dele seria mexer no que já foi medido. */
    const reserva = pack.poolReserva ?? 'normal';
    exigir(TIPO(reserva, 'string'), 'poolReserva precisa ser o nome de um pool');
    exigir(Array.isArray(pack.golpes[reserva]) && pack.golpes[reserva].length > 0,
      `golpes.${reserva} é o pool de reserva de atribuição (\`poolReserva\`) e não pode faltar`);
    for (const [t, lista] of Object.entries(pack.golpes)) {
      exigir(tipos.includes(t), `golpes tem o tipo desconhecido "${t}"`);
      if (!exigir(Array.isArray(lista) && lista.length > 0, `golpes.${t} vazio`)) continue;
      lista.forEach((m, i) => {
        exigir(TIPO(m?.n, 'string'), `golpes.${t}[${i}].n ausente`);
        exigir(tipos.includes(m?.t), `golpes.${t}[${i}] tem tipo "${m?.t}" desconhecido`);
        exigir(Number.isFinite(m?.p) && m.p > 0 && m.p <= 300, `golpes.${t}[${i}].p = ${m?.p} fora da faixa`);
        exigir(m?.cat === 'fis' || m?.cat === 'esp', `golpes.${t}[${i}].cat precisa ser fis ou esp`);
        exigir(m.acc === undefined || (Number.isFinite(m.acc) && m.acc > 0 && m.acc <= 1),
          `golpes.${t}[${i}].acc fora de (0,1]`);
      });
    }
    /* toda espécie precisa conseguir um moveset; sem pool do próprio tipo ela
       cairia inteira no pool de reserva e sairia muda de identidade */
    for (const p of pack.especies ?? [])
      exigir(p.t?.some(t => Array.isArray(pack.golpes[t]) && pack.golpes[t].length > 0),
        `${p.n} não tem nenhum pool de golpe para os tipos ${p.t?.join('/')}`);
  }

  /* --- clima --- */
  if (exigir(Array.isArray(pack.clima) && pack.clima.length > 0, 'clima ausente ou vazio')) {
    const tipos = Object.keys(pack.tipos?.efetividade ?? {});
    let peso = 0;
    pack.clima.forEach((c, i) => {
      exigir(TIPO(c?.key, 'string'), `clima[${i}].key ausente`);
      exigir(Number.isFinite(c?.w) && c.w > 0, `clima[${i}].w precisa ser peso positivo`);
      peso += c?.w ?? 0;
      if (c?.type !== null && c?.type !== undefined) {
        exigir(tipos.includes(c.type), `clima[${i}] favorece o tipo desconhecido "${c.type}"`);
        exigir(c.stat === 'offense' || c.stat === 'spe', `clima[${i}].stat precisa ser offense ou spe`);
        exigir(Number.isFinite(c.mult) && c.mult >= 1 && c.mult <= 3, `clima[${i}].mult fora de [1,3]`);
        /* o clima garante 1 lutador do tipo favorecido na pool; sem ninguém
           daquele tipo no elenco, a garantia é impossível de cumprir */
        const temNoElenco = (pack.especies ?? []).some(p =>
          pack.elenco?.includes(p.dex) && p.t?.includes(c.type));
        exigir(temNoElenco, `clima "${c.key}" favorece ${c.type}, que não existe no elenco`);
      }
    });
    exigir(peso > 0, 'a soma dos pesos de clima é zero');
  }

  /* --- clima do AVANÇO (1.32) ---
   *
   * OUTRA lista que a de cima, e a validação é outra porque o EIXO é outro: a
   * de cima muda dano e exige `stat`/`mult`; esta diz em que CANAL o farm
   * rende, e o quanto sai da raridade do tipo — medida pelo motor, nunca
   * escrita à mão (ver `engine/clima-idle.mjs`).
   *
   * É OPCIONAL: um pack sem Avanço continua válido, e o modo simplesmente não
   * sorteia clima. Exigir a lista quebraria todo pack antigo por um recurso que
   * ele não usa. */
  if (pack.climaIdle !== undefined) {
    if (exigir(Array.isArray(pack.climaIdle) && pack.climaIdle.length > 0,
               'climaIdle presente mas vazio')) {
      const tipos = Object.keys(pack.tipos?.efetividade ?? {});
      let pesoIdle = 0, comBonus = 0;
      pack.climaIdle.forEach((c, i) => {
        exigir(TIPO(c?.key, 'string'), `climaIdle[${i}].key ausente`);
        exigir(TIPO(c?.name, 'string'), `climaIdle[${i}].name ausente — o nome é TEMA e mora aqui`);
        exigir(TIPO(c?.desc, 'string'), `climaIdle[${i}].desc ausente — o cartão precisa dizer o que o clima faz ANTES do clique (D-062)`);
        exigir(Number.isFinite(c?.w) && c.w > 0, `climaIdle[${i}].w precisa ser peso positivo`);
        pesoIdle += c?.w ?? 0;
        const meus = Array.isArray(c?.tipos) ? c.tipos : [];
        if (c?.rende != null) {
          comBonus++;
          exigir(CANAIS_IDLE.includes(c.rende),
            `climaIdle[${i}].rende "${c.rende}" não é canal — os canais são ${CANAIS_IDLE.join(', ')}`);
          exigir(meus.length > 0, `climaIdle "${c.key}" rende ${c.rende} e não favorece tipo nenhum`);
          for (const t of meus) {
            exigir(tipos.includes(t), `climaIdle "${c.key}" favorece o tipo desconhecido "${t}"`);
            /* Sem NINGUÉM daquele tipo no elenco, o clima é um bônus que não
               pode ser conquistado — e um bônus impossível ensina o jogador a
               ignorar a linha do clima inteira. */
            exigir((pack.especies ?? []).some(e => e?.t?.includes(t)),
              `climaIdle "${c.key}" favorece ${t}, que não existe no elenco`);
          }
        } else {
          exigir(meus.length === 0,
            `climaIdle "${c.key}" não rende nada mas favorece tipo — favorecer sem pagar é promessa vazia`);
        }
      });
      exigir(pesoIdle > 0, 'a soma dos pesos de climaIdle é zero');
      /* Uma lista SÓ de neutro é a mesma coisa que não ter lista, e mais cara:
         o jogador vê a linha do clima toda run e ela nunca diz nada. */
      exigir(comBonus > 0, 'climaIdle não tem nenhum clima que renda — só neutro');
    }
  }

  /* --- funções e moeda --- */
  for (const fn of ['nomeExibido', 'slugExterno', 'sprite'])
    exigir(TIPO(pack[fn], 'function'), `${fn} ausente ou não é função`);
  exigir(eObj(pack.moeda) && TIPO(pack.moeda.nome, 'string') && TIPO(pack.moeda.simbolo, 'string'),
    'moeda precisa ter nome e simbolo');

  return e;
}
