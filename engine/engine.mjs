/* Motor de combate do PokéArena.
 *
 * NÃO CONHECE O TEMA. Espécies, tipos, tabela de efetividade, golpes, clima,
 * nomes, moeda e arte vêm de um ContentPack — ver content/. O motor recebe o
 * pack e trabalha com o que estiver dentro dele.
 *
 * É a regra §0.3 da Spec — motor e tema são coisas separadas. O teste de
 * vazamento em test/conteudo.mjs reprova qualquer identificador da franquia
 * neste arquivo, comentário incluído: comentário que cita o tema é acoplamento
 * que o compilador não vê.
 *
 * Sem DOM: roda no navegador, no servidor e nos testes com o mesmo resultado.
 *
 * Divergências intencionais em relação ao protótipo v0.8 ficam listadas em
 * test/paridade.mjs e justificadas em docs/DEFEITOS.md.
 */

import { validarPack } from './pack.mjs';

/* Versão do motor, gravada no registro de precificação de cada rodada (§4.4.5).
   Sem ela, um preço auditado meses depois não diz contra qual código foi
   gerado. Sobe quando o comportamento do motor muda de propósito. */
const VERSAO = '0.9.0-F0.7';

const CONF = {
  LEVEL:        50,     // nível de todo mundo
  HP_MULT:      2.1,    // vida x2.1 — rodada gira em torno de 20-40s
  /* BALANCE puxa os stats de todo mundo na direção da média DOS 12 QUE
     CAÍRAM NA RODADA (recalculada a cada sorteio, não é uma média fixa
     dos 76). Mesmo num elenco só de formas finais o gap entre a criatura
     mais fraca medida (total 288) e a mais forte (total 600) é grande —
     isso é o que evita o mais fraco do elenco virar odd x4000.
     0   = stats crus dos jogos.
     1   = todo mundo idêntico, vira cara ou coroa.
     0.5 = zebra ainda é possível, mas paga caro.                        */
  BALANCE:      0.5,
  BASE_CD:      3.4,    // segundos entre ataques de um mesmo lutador
  CRIT:         0.0625, // 1/16, igual aos jogos
  CRIT_MULT:    1.5,
  ACC:          0.92,   // precisão padrão quando o golpe não define
  HASTE:        0.82,   // a partir de HASTE_FROM tudo acelera
  HASTE_FROM:   18,
  HASTE_EVERY:  8,

  /* --- KILLSTREAK ---------------------------------------------------
     Abates encadeados dentro de STREAK_WINDOW segundos sobem o nível da
     sequência (2 = double kill, 3 = triple, 4 = quadra, 5+ = rampage) e
     dão um buff TEMPORÁRIO em uma das três frentes, sorteada: ofensiva
     (Atk+SpA), defensiva (Def+SpD) ou velocidade.

     Por que os números são modestos: isto é um battle royale de 12, e
     buff por abate é um mecanismo de "bola de neve" — quem mata fica
     mais forte e mata mais. Multiplicador alto demais colapsa a rodada
     no primeiro que abre vantagem, e aí a aposta deixa de ter graça
     porque o resultado vira quase determinístico. Os valores abaixo
     foram escolhidos medindo 20.000 rodadas com e sem o sistema (ver
     LEIA-ME): o buff muda o desfecho de forma perceptível, sem
     concentrar as vitórias.

     Como isso NÃO desequilibra as odds: o Monte Carlo que calcula as
     odds roda exatamente este mesmo simulate(), então os killstreaks já
     estão embutidos nos números mostrados na hora de apostar.        */
  STREAK_WINDOW: 3,     // segundos para um abate encadear no anterior
  //            nível:  0    1    2     3      4+
  STREAK_MULT:  [0, 0, 1.5, 1.75, 2.0, 2.0],  // multiplicador por nível
  STREAK_DUR:   [0, 0, 5,   8,    10,  12 ],  // duração em segundos

  /* --- garantia de duração: no máximo ~1 minuto, sem travar por tipo ---
     Não existe golpe de cura neste jogo — ninguém recupera HP — então a
     única forma de uma luta travar seria dois tipos mutuamente imunes
     sobrando por último (ex.: um só usa golpes Normais, o outro é
     Fantasma puro). Pra fechar esse buraco de vez, a partir de
     STORM_FROM segundos a arena passa a causar dano por segundo em todo
     mundo, crescendo — e esse dano NÃO passa pela tabela de tipos, então
     nenhuma imunidade segura ninguém. Isso torna o fim da luta uma
     garantia matemática, não uma esperança estatística.                 */
  STORM_FROM:   32,     // quando a tempestade começa
  STORM_TICK:   1.0,    // um "carimbo" de dano a cada 1s
  STORM_RAMP:   18,     // segundos até a tempestade atingir a força máxima
  STORM_MAXPCT: 0.15,   // dano máximo por tick, em % do HP máximo
  MAX_TIME:     56,     // corte duro — a partir daqui ninguém mais vive

  /* --- PRECIFICAÇÃO (Spec §4.4) ---------------------------------------
     O tamanho da amostra é ditado pelo AZARÃO, não pelo favorito. O erro
     relativo de uma proporção estimada por n ensaios é sqrt((1-p)/(n·p)); com
     o pior lutador do elenco medido em p = 0,016, atingir 2 % exige 153.750
     simulações. Os 20.000 herdados da base v0.8 dimensionavam a faixa média e
     subdimensionavam a cauda em quase 8×.

     São 154.000 e não os 150.000 que o §4.4.4 trazia como baseline: a própria
     tabela do §4.4.2 deriva 153.750 para ε = 2 %, e arredondar PARA BAIXO
     entrega ε = 2,02 % — perde o alvo por 0,02 ponto. Medido, não estimado.
     A Spec foi corrigida junto, no mesmo commit; a diferença de custo é 0,1 s.

     E o erro não é ruído cosmético: `odd = 1/p` é convexa, então E[1/p̂] > 1/p
     e o desvio não se cancela entre rodadas. Com 20.000 sims o viés sozinho
     entregava +19,12 % de odd a mais no pior lutador — mais que o dobro da
     margem da casa, sempre na mesma direção. Com 154.000 ele cai para 2,49 %.

     O custo está medido e é irrelevante: ~4,9 s por rodada neste hardware
     (32 µs/batalha), contra uma janela de aposta de 30 s. Escrever isso aqui
     é de propósito — o parâmetro ficaria em 20.000 por receio de conta de
     servidor, e o §4.4.4 da Spec desmonta o receio com números.             */
  SIMS:         154000, // simulações de Monte Carlo pras odds
  MARGIN:       0.08,   // margem da casa (8%)
  ODD_MIN:      1.05,   // piso da odd ofertada
  /* Teto de odd DEGRADA a oferta: com teto x20 a margem no pior lutador vira
     68 %, contra os 8 % declarados. O instrumento certo para conter passivo é
     teto de PAYOUT, que preserva a odd e limita só o tamanho da aposta — e ele
     é escopo do F0.8. Por isso aqui é `null`: sem teto por padrão. Se algum dia
     for usado, o §4.4.6 exige que apareça na interface e no registro.        */
  ODD_MAX:      null,

  /* --- EXPOSIÇÃO (Spec §4.4.6) ----------------------------------------
     Teto de PAYOUT, não de odd. Um teto de odd em x20 transformaria a margem
     declarada de 8 % em 68 % no azarão — protegeria o passivo às custas do
     apostador, e contra o P1. Teto de payout preserva a odd e limita só o
     tamanho da aposta: stake_max_i = MAX_PAYOUT_POR_TICKET / odd_i.

     O passivo da rodada é o PIOR CASO, não a soma: só um lutador vence, então
     a casa nunca paga as duas pontas.                                      */
  MAX_PAYOUT_POR_TICKET:    50000,
  MAX_LIABILITY_POR_RODADA: 500000,   // 10 × o teto por ticket
  BET_WINDOW:   30,     // segundos de aposta
  RESULT_HOLD:  8,      // segundos mostrando o vencedor
  ARENA_SIZE:   12,     // lutadores por rodada
};

function stormRate(t){
  if (t < CONF.STORM_FROM) return 0;
  const k = Math.min(1, (t - CONF.STORM_FROM) / CONF.STORM_RAMP);
  return k * k * CONF.STORM_MAXPCT;
}


function rng(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* `newSeed` saiu daqui no F0.5. A raiz da rodada tem dono próprio —
   engine/seed.mjs — e vem do CSPRNG da plataforma, não de Math.random. Manter
   uma segunda fonte de semente no motor era manter a porta por onde a rodada
   voltava a ser irreconstituível. */

function statAt(b){ return Math.floor((2*b + 31) * CONF.LEVEL / 100) + 5; }


function efeito(chart, moveType, defTypes){
  const row = chart[moveType] || {};
  let e = 1;
  for (const t of defTypes) if (row[t] !== undefined) e *= row[t];
  return e;
}


function dano(chart, A, D, mv, R, aMul, dMul){
  const atk = (mv.cat === 'fis' ? A.atk : A.spa) * (aMul || 1);
  const dfs = (mv.cat === 'fis' ? D.def : D.spd) * (dMul || 1);
  const eff = efeito(chart, mv.t, D.types);
  if (eff === 0) return {dmg:0, eff:0, crit:false};
  const crit = R() < CONF.CRIT;
  const stab = A.types.includes(mv.t) ? 1.5 : 1;
  const base = Math.floor(Math.floor(Math.floor(2*CONF.LEVEL/5 + 2) * mv.p * atk / dfs) / 50) + 2;
  const dmg = base * stab * eff * (crit ? CONF.CRIT_MULT : 1) * (0.85 + R()*0.15);
  return {dmg: Math.max(1, Math.round(dmg)), eff, crit};
}


function atribuirGolpes(golpes, entry){
  const R = rng(entry.dex * 7919 + 104729);
  const pools = entry.t.map(t => golpes[t] || golpes.normal);
  const picks = [];
  const used = new Set();

  /* --- VIÉS OFENSIVO (medido, ver LEIA-ME) ---------------------------
     Antes o sorteio ignorava se o lutador bate melhor no braço ou no
     feixe. Resultado: uma criatura de Atk 100 e SpA 40 podia sair com
     metade do kit em golpes especiais e desperdiçar o próprio ponto forte.
     Agora a escolha é por TORNEIO: sorteia dois candidatos e fica com o
     que usa o lado mais forte — mas só com probabilidade igual ao
     tamanho do desequilíbrio (`gap`). Quem é equilibrado (83/85) segue
     sorteando quase à toa; quem é extremo (65/130, 120/55) quase sempre
     puxa pro seu lado.

     Continua determinístico (mesma seed por dex, mesmo kit em qualquer
     computador) e continua sem repetir golpe.                        */
  const atk = entry.s[1], spa = entry.s[3];
  const prefEsp = spa > atk;
  const gap = Math.abs(spa - atk) / Math.max(spa, atk, 1);
  const encaixa = m => (m.cat === 'esp') === prefEsp;

  const takeFrom = (pool) => {
    const opts = pool.filter(m => !used.has(m.n));
    if (!opts.length) return false;
    const a = opts[(R() * opts.length) | 0];
    const b = opts[(R() * opts.length) | 0];
    let m = a;
    if (R() < gap && encaixa(b) && !encaixa(a)) m = b;
    picks.push(m); used.add(m.n);
    return true;
  };

  for (const pool of pools) takeFrom(pool);

  while (picks.length < 4){
    const wantStab = R() < 0.62;
    const pool = wantStab ? pools[(R() * pools.length) | 0] : golpes.normal;
    if (!takeFrom(pool) && !takeFrom(golpes.normal)) break;
  }
  return picks;
}


function montarElenco(pack, list){
  const avg = [0,0,0,0,0,0];
  for (const p of list) for (let i=0;i<6;i++) avg[i] += p.s[i];
  for (let i=0;i<6;i++) avg[i] /= list.length;
  const B = CONF.BALANCE;
  const mix = (v,i) => v*(1-B) + avg[i]*B;

  return list.map((p, idx) => {
    const b = p.s.map(mix);
    const hpStat = Math.floor((2*b[0] + 31) * CONF.LEVEL / 100) + CONF.LEVEL + 10;
    const f = {
      dex: p.dex, n: pack.nomeExibido(p.n), sp: pack.slugExterno(p.n), types: p.t.slice(), idx,
      maxHp: Math.round(hpStat * CONF.HP_MULT),
      atk: statAt(b[1]), def: statAt(b[2]),
      spa: statAt(b[3]), spd: statAt(b[4]), spe: statAt(b[5]),
    };
    f.moves = atribuirGolpes(pack.golpes, p);
    f.sprite = pack.sprite(p);
    return f;
  });
}


function simular(chart, fighters, seed, record){
  const R = rng(seed);
  const n = fighters.length;
  const hp = new Float64Array(n);
  const nextAt = new Float64Array(n);
  const alive = new Uint8Array(n);
  /* --- killstreak: sequência de abates e buff temporário por lutador ---
     buffKind: 0 = nenhum, 1 = ofensivo, 2 = defensivo, 3 = velocidade.
     Guardado em arrays tipados (não em objetos) porque isto roda dentro
     das 20.000 simulações das odds — alocar objeto por lutador aqui
     multiplicaria o custo por nada. */
  const streak    = new Int8Array(n);
  const lastKill  = new Float64Array(n).fill(-999);
  const buffUntil = new Float64Array(n);
  const buffKind  = new Uint8Array(n);
  const buffMul   = new Float64Array(n);
  const bmul = (i, t, kind) => (buffKind[i] === kind && t < buffUntil[i]) ? buffMul[i] : 1;

  let avgSpe = 0;
  for (let i=0;i<n;i++){
    hp[i] = fighters[i].maxHp; alive[i] = 1;
    nextAt[i] = 0.4 + R() * CONF.BASE_CD;
    avgSpe += fighters[i].spe;
  }
  avgSpe /= n;

  const ev = record ? [] : null;
  let aliveCount = n, t = 0, guard = 0;
  let nextStorm = CONF.STORM_FROM;

  while (aliveCount > 1 && t < CONF.MAX_TIME && guard++ < 8000){
    // quem age agora
    let k = -1, best = Infinity;
    for (let i=0;i<n;i++) if (alive[i] && nextAt[i] < best){ best = nextAt[i]; k = i; }
    if (k < 0) break;

    // se um carimbo de tempestade cai antes do próximo ataque, ele
    // acontece primeiro — dano igual pra todo mundo, ignora tipo
    if (nextStorm <= best && nextStorm < CONF.MAX_TIME){
      t = nextStorm; nextStorm += CONF.STORM_TICK;
      const rate = stormRate(t);
      if (rate > 0){
        const hits = [];
        /* --- D-001 ---------------------------------------------------------
           O desempate de varredura simultânea percorria `hits`, que só era
           alimentado em modo gravação. No caminho rápido — o que roda as
           simulações das odds — o vetor chegava vazio e a função devolvia -1,
           descartando a amostra em silêncio. Medido: 0,034% das simulações.
           O descarte não era aleatório: removia exatamente as rodadas que
           terminam em varredura, e nelas a batalha exibida TEM vencedor. Os
           dois caminhos discordavam, contra o princípio de que as odds saem
           do mesmo motor que roda a luta.

           O desempate agora é acompanhado em duas variáveis soltas, fora de
           `hits`. É correto nos dois modos e não aloca nada no caminho quente,
           que é o motivo pelo qual `hits` existia só sob `ev`.                */
        let ultimoIdx = -1, ultimoPct = -1;
        for (let i=0;i<n;i++){
          if (!alive[i]) continue;
          const before = hp[i], beforePct = before / fighters[i].maxHp;
          if (beforePct > ultimoPct){ ultimoPct = beforePct; ultimoIdx = i; }
          const dmg = Math.max(1, Math.round(fighters[i].maxHp * rate));
          hp[i] = Math.max(0, hp[i] - dmg);
          const ko = hp[i] <= 0;
          if (ko){ alive[i] = 0; aliveCount--; }
          if (ev) hits.push({i, dmg, hpAfter:hp[i], ko, beforePct});
        }
        if (ev && hits.length) ev.push({t, storm:true, hits});
        if (aliveCount <= 0){
          // desempate: quem tinha mais % de vida um instante antes do
          // carimbo que zerou todo mundo junto
          return record ? {winner:ultimoIdx, events:ev, duration:t} : ultimoIdx;
        }
      }
      continue;
    }

    /* --- D-003 -------------------------------------------------------------
       O laço testava `t < MAX_TIME` ANTES de executar a ação, e a ação
       executada podia estar agendada depois do corte — a batalha terminava em
       56,47 s com MAX_TIME de 56 s. A Spec §4.6 lista "nenhuma batalha excede
       hard cap" como invariante, então o motor contradizia um documento.

       Das duas saídas registradas em DEFEITOS.md — truncar, ou reescrever a
       invariante para "nenhuma ação NOVA é agendada depois do corte" — vale a
       primeira: um teto que não segura não é teto, e o nome já dizia "hard".
       A ação agendada além do corte é descartada e a batalha encerra em
       MAX_TIME exatos, com o desempate por % de vida que já existe.

       Não muda nenhuma rodada do pack em uso: a tempestade encerra tudo bem
       antes dos 56 s, e o corte só era alcançável no cenário de imunidade
       mútua que o elenco não produz. Os goldens provam. */
    if (best >= CONF.MAX_TIME){ t = CONF.MAX_TIME; break; }

    t = best;
    const A = fighters[k];

    // alvo: sorteio uniforme entre os vivos.
    // (de propósito — assim a posição no mapa é 100% cosmética e as odds
    //  do Monte Carlo batem exatamente com a batalha de verdade)
    let pick = -1, seen = 0;
    for (let i=0;i<n;i++){
      if (!alive[i] || i === k) continue;
      seen++;
      if (R() < 1/seen) pick = i;
    }
    if (pick < 0) break;

    const D = fighters[pick];
    const mIdx = (R() * A.moves.length) | 0;
    const mv = A.moves[mIdx];

    const miss = R() > (mv.acc !== undefined ? mv.acc : CONF.ACC);
    let res = {dmg:0, eff:1, crit:false};
    if (!miss){
      // buffs de killstreak entram aqui: 1 = ofensivo (atacante),
      // 2 = defensivo (defensor). Fora da janela, ambos valem 1.
      res = dano(chart, A, D, mv, R, bmul(k, t, 1), bmul(pick, t, 2));
      hp[pick] -= res.dmg;
    }
    let ko = false;
    if (hp[pick] <= 0){ hp[pick] = 0; alive[pick] = 0; aliveCount--; ko = true; }

    if (ev) ev.push({t, a:k, d:pick, m:mIdx, dmg:res.dmg, crit:res.crit,
                     eff:res.eff, miss, ko, hpAfter:hp[pick]});

    /* --- abate encadeado? ---
       Dentro de STREAK_WINDOW segundos do abate anterior, a sequência
       sobe; fora dela, recomeça do 1. A partir de 2 (double kill) vem o
       buff, com o tipo sorteado no MESMO gerador da batalha — então o
       replay e o Monte Carlo veem exatamente a mesma coisa. */
    if (ko){
      streak[k] = (t - lastKill[k] <= CONF.STREAK_WINDOW) ? streak[k] + 1 : 1;
      lastKill[k] = t;
      if (streak[k] >= 2){
        const lvl  = streak[k];
        const cap  = Math.min(lvl, CONF.STREAK_DUR.length - 1);
        const kind = 1 + ((R() * 3) | 0);
        const dur  = CONF.STREAK_DUR[cap];
        const mult = CONF.STREAK_MULT[cap];
        buffKind[k] = kind; buffUntil[k] = t + dur; buffMul[k] = mult;
        if (ev) ev.push({t, streak:true, a:k, lvl, kind, dur, mult});
      }
    }

    // agenda o próximo ataque desse lutador (mais rápido = age mais vezes)
    let haste = 1;
    if (t > CONF.HASTE_FROM)
      haste = Math.pow(CONF.HASTE, 1 + Math.floor((t - CONF.HASTE_FROM) / CONF.HASTE_EVERY));
    // buff 3 = velocidade: encurta o intervalo entre os ataques dele
    nextAt[k] = t + CONF.BASE_CD * (avgSpe / (A.spe * bmul(k, t, 3))) * (0.85 + R()*0.3) * haste;
  }

  // vencedor: último vivo, ou maior % de vida se estourou o tempo
  let w = -1, bestPct = -1;
  for (let i=0;i<n;i++){
    if (!alive[i]) continue;
    const pct = hp[i] / fighters[i].maxHp;
    if (pct > bestPct){ bestPct = pct; w = i; }
  }
  return record ? {winner:w, events:ev, duration:t} : w;
}


function sortearClima(tabela, seed){
  const R = rng(seed);
  const total = tabela.reduce((s,w)=>s+w.w,0);
  let roll = R() * total;
  for (const w of tabela){ if (roll < w.w) return w; roll -= w.w; }
  return tabela[0];
}


function aplicarClima(fList, weather){
  return fList.map(f => {
    const g = { ...f };
    if (weather.type && f.types.includes(weather.type)){
      if (weather.stat === 'offense'){ g.atk = Math.round(f.atk*weather.mult); g.spa = Math.round(f.spa*weather.mult); }
      else if (weather.stat === 'spe'){ g.spe = Math.round(f.spe*weather.mult); }
    }
    return g;
  });
}


/* O sorteio da pool recebe a sub-seed de ELENCO (Spec §P3). Antes do F0.5 os
   dois embaralhamentos vinham de Math.random, e era isso que tornava a rodada
   irreconstituível: mesmo guardando a seed da batalha, ninguém remontava os 12
   que caíram na arena. */
function sortearPool(pack, elenco, weatherType, sementeElenco){
  const R = rng(sementeElenco >>> 0);
  const src = elenco.slice();
  for (let i=src.length-1;i>0;i--){ const j = R()*(i+1)|0; [src[i],src[j]]=[src[j],src[i]]; }

  let list;
  if (weatherType){
    const gi = src.findIndex(p => p.t.includes(weatherType));
    if (gi === -1){
      // validarPack garante que todo clima favorecido tem alguém do tipo
      // no elenco; isto é a rede para o caso de o pack mudar em runtime
      list = src.slice(0, CONF.ARENA_SIZE);
    } else {
      const guaranteed = src.splice(gi, 1)[0];
      list = [guaranteed, ...src.slice(0, CONF.ARENA_SIZE - 1)];
      // reembaralha pra o garantido não cair sempre na mesma posição
      for (let i=list.length-1;i>0;i--){ const j = R()*(i+1)|0; [list[i],list[j]]=[list[j],list[i]]; }
    }
  } else {
    list = src.slice(0, CONF.ARENA_SIZE);
  }
  return montarElenco(pack, list);
}


/* -------------------------------------------------------------------------
   FÁBRICA — liga o motor a um pack.
   Devolver funções ligadas, em vez de espalhar o pack por toda chamada, é o
   que permite dois packs coexistirem no mesmo processo: os testes rodam o
   pack do jogo e um pack sintético lado a lado.
   ------------------------------------------------------------------------- */
function criarMotor(pack){
  const erros = validarPack(pack);
  if (erros.length)
    throw new Error(`ContentPack inválido (${pack && pack.id}):\n  - ` + erros.join('\n  - '));

  const chart  = pack.tipos.efetividade;
  const elenco = pack.especies.filter(p => pack.elenco.includes(p.dex));

  return {
    pack, CONF, elenco, versao: VERSAO,
    efeito:        (mt, dt)            => efeito(chart, mt, dt),
    dano:          (A,D,mv,R,a,d)      => dano(chart, A, D, mv, R, a, d),
    simular:       (f, seed, gravar)   => simular(chart, f, seed, gravar),
    montarElenco:  (lista)             => montarElenco(pack, lista),
    atribuirGolpes:(esp)               => atribuirGolpes(pack.golpes, esp),
    sortearPool:   (tipoClima, semente) => sortearPool(pack, elenco, tipoClima, semente),
    sortearClima:  (seed)              => sortearClima(pack.clima, seed),
    aplicarClima:  (lista, clima)      => aplicarClima(lista, clima),
    nomeExibido:   (slug)              => pack.nomeExibido(slug),
    slugExterno:   (slug)              => pack.slugExterno(slug),
    sprite:        (esp)               => pack.sprite(esp),
    tipoCor:       (t)                 => pack.tipos.cores[t],
    tipoNome:      (t)                 => pack.tipos.nomes[t] || t,
    moeda:         pack.moeda,
  };
}

export { criarMotor, CONF, VERSAO, rng, statAt, stormRate };
