/* Q5 · VERIFICAÇÃO NO NAVEGADOR — a única rede que pega erro de ligação.
 *
 * O F0.3b provou que teste estático não basta: três erros de import passaram
 * pela suíte inteira e só apareceram ao carregar a página. Um `pageerror` pega
 * qualquer símbolo indefinido sem heurística nenhuma — é o que a lacuna L-019
 * pedia.
 *
 * Este portão sobe um servidor estático próprio, abre o app num Chromium de
 * verdade, serve as folhas de sprite pelo Node (o navegador pode não atravessar
 * um proxy de egresso) e exige: zero erro de página, boot concluído, elenco em
 * cena e a batalha começando.
 *
 * Dependência: `playwright-core`, instalado FORA do repositório para manter a
 * regra de dependência zero. Ver tools/README.md.
 *   `npm test`          -> pula com aviso, se não houver navegador
 *   `npm run portoes`   -> exige. Portão que pula em silêncio é decorativo.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, sep } from 'node:path';
import { criarSuite, ok } from './harness.mjs';
import { digital as digitalNode, rodada as rodadaNode } from './rodada-digital.mjs';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PW = '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MIME = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript',
               '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
               '.gif':'image/gif', '.mp3':'audio/mpeg' };

export const disponivel = () => existsSync(PW) && existsSync(CHROME);

function servidor() {
  return new Promise(res => {
    const s = createServer((q, r) => {
      /* Página mínima do teste Q3 entre ambientes: só precisa de uma origem
         igual à do repositório para poder importar os módulos por caminho. */
      if (q.url.startsWith('/__q3')) {
        r.writeHead(200, { 'Content-Type': MIME['.html'] });
        return r.end('<!doctype html><meta charset="utf-8"><title>q3</title>');
      }
      const p = join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
      if (!p.startsWith(RAIZ + sep) || !existsSync(p)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
      r.end(readFileSync(p));
    });
    s.listen(0, '127.0.0.1', () => res({ s, porta: s.address().port }));
  });
}

/* --- linha de base visual (Q5) -------------------------------------------
 * Guardar PNG traria dois problemas: a captura conteria sprites de terceiros,
 * que este repositório não versiona, e a comparação exigiria decodificar PNG —
 * dependência que o projeto não tem.
 *
 * Em vez disso guardamos uma IMPRESSÃO DIGITAL: a captura volta para dentro da
 * página, é desenhada num canvas, reduzida a 32x32 e vira 3072 números — R, G e
 * B separados. Compara-se numericamente, com tolerância. É insensível a
 * antisserrilhado e sensível a mudança de layout, cor e conteúdo.
 *
 * A primeira versão guardava tons de CINZA, e a sabotagem S20 provou que isso
 * não serve: trocar o dourado #f5c542 pelo azul #7fd8ff muda a identidade
 * visual inteira e mexe 2,6 pontos de luminância — ruído. Cor precisa dos três
 * canais.
 *
 * As folhas de sprite são bloqueadas durante a captura: a linha de base mede a
 * NOSSA interface, e sprite que chega da rede tornaria o resultado instável.  */
const LADO = 32;

async function impressao(pg) {
  const png = (await pg.screenshot()).toString('base64');
  return pg.evaluate(async ({ b64, lado }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = lado; c.height = lado;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, lado, lado);
    const d = g.getImageData(0, 0, lado, lado).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) { out.push(d[i], d[i+1], d[i+2]); }
    return out;
  }, { b64: png, lado: LADO });
}

const LARGURAS = [
  { nome: 'largo',  w: 1440, h: 900 },
  { nome: 'medio',  w: 1100, h: 900 },
  { nome: 'estreito', w: 700, h: 900 },
];

export async function capturarBase() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const saida = {};
  for (const L of LARGURAS) {
    const pg = await (await b.newContext({ viewport: { width: L.w, height: L.h } })).newPage();
    /* sprite bloqueado: a linha de base é da nossa interface */
    await pg.route(/(githubusercontent|jsdelivr|pokemonshowdown)/, r => r.fulfill({ status: 204 }));
    await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
    /* Esperar ESTADO, não relógio.
       A espera fixa de 4 s funcionou enquanto a rodada custava 0,7 s. O F0.7
       subiu o Monte Carlo para 154.000 simulações (~5 s), e a captura passou a
       cair no meio do "calculando odds…" — 6 telas fora da linha de base numa
       execução, 9 na seguinte. Linha de base que depende de quanto a máquina
       demora não é linha de base; é sorte.

       A condição é a fase de apostas ABERTA com a lista de odds montada: é o
       primeiro instante em que a interface está inteira e parada. */
    await pg.waitForFunction(() => {
      const f = document.querySelector('#phase')?.textContent;
      return f && f !== '—' && document.querySelectorAll('.pick').length > 0;
    }, { timeout: 90000, polling: 250 }).catch(() => {});
    await pg.waitForTimeout(1200);   // deixa a transição de opacidade terminar
    const telas = {
      inicio:   () => pg.evaluate(() => { document.querySelectorAll('.view').forEach(v=>v.classList.remove('on')); document.querySelector('#viewHome')?.classList.add('on'); }),
      arena:    () => pg.evaluate(() => { document.querySelectorAll('.view').forEach(v=>v.classList.remove('on')); document.querySelector('#viewArena')?.classList.add('on'); }),
      regras:   () => pg.evaluate(() => { document.querySelectorAll('.view').forEach(v=>v.classList.remove('on')); document.querySelector('#viewRules')?.classList.add('on'); }),
      comofunciona: () => pg.evaluate(() => { document.querySelectorAll('.view').forEach(v=>v.classList.remove('on')); document.querySelector('#viewHow')?.classList.add('on'); }),
    };
    for (const [nome, ir] of Object.entries(telas)) {
      await ir(); await pg.waitForTimeout(700);
      saida[`${nome}@${L.nome}`] = await impressao(pg);
    }
    await pg.context().close();
  }
  await b.close(); s.close();
  return saida;
}

/* Q3 · DETERMINISMO ENTRE AMBIENTES.
 *
 * A Spec §P3 exige que a mesma raiz reproduza a rodada "em dois ambientes JS
 * distintos". Node e Chromium são motores diferentes (V8 é o mesmo, mas as
 * versões, o JIT e o ambiente não), e uma divergência aqui apontaria para o
 * lugar clássico: aritmética que escapou de `| 0` / `>>> 0` e virou float de
 * 53 bits num lado só.
 *
 * O navegador importa `test/rodada-digital.mjs` — o MESMO arquivo que o Node
 * usa. Comparar duas implementações parecidas provaria bem menos.            */
export async function digitaisNoNavegador(raizes) {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage();
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  await pg.goto(`http://127.0.0.1:${porta}/__q3.html`, { waitUntil: 'load', timeout: 60000 });
  const out = await pg.evaluate(async lista => {
    const { digital } = await import('/test/rodada-digital.mjs');
    return lista.map(digital);
  }, raizes);
  await b.close(); s.close();
  if (erros.length) throw new Error('erro na página do Q3: ' + erros[0]);
  return out;
}

export function suiteAmbientes(doNavegador, raizes) {
  const s = criarSuite('ambientes');
  s.teste('a mesma raiz reproduz a rodada no Node e no navegador', () => {
    raizes.forEach((raiz, i) => {
      const aqui = digitalNode(raiz);
      ok(aqui === doNavegador[i],
        `raiz ${raiz}: Node e navegador divergiram. ` +
        `Primeiro ponto: ${primeiraDiferenca(aqui, doNavegador[i])}`);
    });
  });
  return s;
}

const primeiraDiferenca = (a, b) => {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `posição ${i}: "${a.slice(i, i + 60)}" contra "${b.slice(i, i + 60)}"`;
};

export function compararBase(atual, base) {
  const falhas = [];
  for (const chave of Object.keys(base)) {
    const a = atual[chave], b = base[chave];
    if (!a) { falhas.push(`${chave}: captura não produzida`); continue; }
    let soma = 0, pior = 0;
    for (let i = 0; i < b.length; i++) { const d = Math.abs(a[i] - b[i]); soma += d; if (d > pior) pior = d; }
    const medio = soma / b.length;
    /* tolerância: média baixa aceita ruído de renderização; o pico existe para
       pegar mudança localizada que a média dilui. */
    if (medio > 3 || pior > 60) falhas.push(`${chave}: diferença média ${medio.toFixed(1)}, pico ${pior}`);
  }
  for (const chave of Object.keys(atual)) if (!(chave in base)) falhas.push(`${chave}: tela nova, sem linha de base`);
  return falhas;
}

export async function rodar() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  /* Defeitos JÁ REGISTRADOS em docs/DEFEITOS.md não reprovam o portão — mas
     continuam visíveis no relatório. Mesmo padrão de paridade.mjs: divergência
     conhecida é decisão, divergência nova é falha. */
  const CONHECIDOS = [
    /* vazio. D-002 foi corrigido no F0.3d. Manter a estrutura: defeito que se
       decide conviver entra aqui COM id, e some quando for corrigido. */
  ];
  const erros = [], conhecidos = [];
  pg.on('pageerror', e => {
    const t = String(e).split('\n')[0];
    (CONHECIDOS.find(c => c.re.test(t)) ? conhecidos : erros).push(t);
  });

  const cache = new Map();
  await pg.route(/(githubusercontent|jsdelivr|pokemonshowdown)/, async rota => {
    const url = rota.request().url();
    try {
      if (!cache.has(url)) {
        const r = await fetch(url);
        cache.set(url, r.ok ? Buffer.from(await r.arrayBuffer()) : null);
      }
      const buf = cache.get(url);
      buf ? rota.fulfill({ status:200, body:buf }) : rota.fulfill({ status:404 });
    } catch { rota.fulfill({ status:502 }); }
  });

  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil:'load', timeout:60000 });
  await pg.evaluate(() => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.querySelector('#viewArena')?.classList.add('on');
  });
  const apostas = await pg.evaluate(() => new Promise(r => {
    const t = setInterval(() => {
      const f = document.querySelector('#phase')?.textContent;
      if (f && f !== '—') { clearInterval(t); r(true); }
    }, 250);
    setTimeout(() => { clearInterval(t); r(false); }, 45000);
  }));
  /* Lido AINDA NA FASE DE APOSTAS, de propósito: o clima é sorteado antes da
     pool (para garantir 1 lutador do tipo favorecido) e precisa ficar secreto
     até as apostas fecharem. Se o selo ou o efeito de partícula aparecerem
     agora, o apostador vê o bônus antes de escolher — e o §4.3 vira letra
     morta. Ver a lacuna L-022 para o canal que AINDA está aberto. */
  const st = await pg.evaluate(() => ({
    bootSumiu: !document.querySelector('#boot'),
    climaVazado: !!document.querySelector('#weatherBadge')?.classList.contains('show'),
    fase: document.querySelector('#phase')?.textContent,
    lutadores: document.querySelectorAll('.mon').length,
    placas: document.querySelectorAll('.plate').length,
    odds: document.querySelectorAll('.pick').length,
    comSprite: [...document.querySelectorAll('.mon .body')]
      .filter(e => e.style.backgroundImage.includes('http')).length,
  }));
  /* polling explícito: o padrão do Playwright é requestAnimationFrame, que o
     navegador estrangula quando a página não está em primeiro plano. */
  /* Não esperar os 30 s de aposta: o relógio da fase avança por
     requestAnimationFrame com delta limitado a 0,05 s por quadro, então um
     navegador estrangulado levaria minutos reais para vencer a janela. É a
     lacuna L-006 aparecendo na prática, e o portão não deve conviver com ela
     em silêncio — usa o botão de iniciar, que é o mesmo caminho do jogador.

     Polling explícito pelo mesmo motivo: o padrão do Playwright é rAF. */
  /* click() do Playwright checa "acionabilidade" e falha se o overlay de
     apostas cobrir o botão. O portão quer disparar o caminho do jogador, não
     testar hit-testing — então dispara direto no elemento. */
  await pg.$eval('#btnStart', el => el.click()).catch(() => {});
  const aoVivo = await pg.waitForFunction(
    () => document.querySelector('#phase')?.textContent === 'AO VIVO',
    { timeout: 60000, polling: 300 }).then(() => true).catch(() => false);
  /* deixa a linha do tempo correr antes de ler o relógio: chegar em AO VIVO
     prova que a fase virou, o relógio andando prova que o replay consome a
     linha do tempo de verdade. */
  if (aoVivo) await pg.waitForTimeout(4000);
  const relogio = await pg.evaluate(() => document.querySelector('#clock')?.textContent);
  const erroDepois = erros.length;

  /* --- a rodada que o APP montou -------------------------------------------
     Ler o estado do app e recompor a mesma rodada em Node a partir da raiz é o
     único jeito de provar que o jogo usa a árvore de sementes como manda o §P3.
     Os testes de `semente.mjs` provam que a árvore funciona; este prova que o
     app está ligado nela — e que cada ramo alimenta o que deve.

     A importação dinâmica devolve a MESMA instância do módulo que a página
     carregou (o registro de módulos é por URL), então isto lê o estado vivo,
     sem precisar de nenhuma exposição em `window` só para o teste.           */
  const jogo = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    if (!S.seeds || !S.battle) return null;
    return {
      raiz: S.seeds.raiz,
      clima: S.weather?.key,
      elenco: S.fighters.map(f => [f.dex, f.n, f.maxHp, f.atk, f.def, f.spa, f.spd, f.spe,
                                   f.moves.map(m => m.n)]),
      vencedor: S.battle.winner,
      duracao: S.battle.duration,
      nEventos: S.battle.events.length,
    };
  }).catch(() => null);

  await b.close(); s.close();
  return { erros, conhecidos, apostas, aoVivo, relogio, folhas: cache.size, erroDepois, jogo, ...st };
}

/* Q3 · A RODADA DO APP SAI DA RAIZ.
 *
 * `semente.mjs` prova que a árvore é sólida. Este teste prova a outra metade:
 * que o app está LIGADO nela, e que cada ramo alimenta o que deve. Trocar
 * `S.seeds.batalha` por `S.seeds.elenco` numa linha de `fases.mjs` não muda
 * nada que a suíte estática enxergue — foi o defeito S30, e é ele que este
 * teste existe para pegar.                                                  */
export function suiteRodadaViva(r) {
  const s = criarSuite('rodada-viva');
  s.teste('a rodada montada pelo app é a que a raiz reproduz', () => {
    ok(r.jogo, 'não deu para ler a rodada do app — sem seeds ou sem batalha');
    const esperado = rodadaNode(r.jogo.raiz);
    ok(esperado.clima.key === r.jogo.clima,
      `clima: app ${r.jogo.clima}, raiz reproduz ${esperado.clima.key} — o ramo ambiente não é o usado`);
    const elencoEsperado = esperado.elenco.map(f => [f.dex, f.n, f.maxHp, f.atk, f.def, f.spa, f.spd,
                                                     f.spe, f.moves.map(m => m.n)]);
    ok(JSON.stringify(elencoEsperado) === JSON.stringify(r.jogo.elenco),
      'elenco: o app sorteou uma pool que a raiz não reproduz — o ramo elenco não é o usado');
    ok(esperado.batalha.winner === r.jogo.vencedor
       && esperado.batalha.events.length === r.jogo.nEventos
       && Math.abs(esperado.batalha.duration - r.jogo.duracao) < 1e-9,
      `batalha: app venceu ${r.jogo.vencedor} em ${r.jogo.nEventos} eventos, ` +
      `a raiz reproduz ${esperado.batalha.winner} em ${esperado.batalha.events.length} — ` +
      `o ramo batalha não é o usado`);
  });
  return s;
}

export function suiteBase(atual, base) {
  const s = criarSuite('visual-base');
  s.teste('a interface não mudou sem intenção', () => {
    const falhas = compararBase(atual, base);
    ok(falhas.length === 0,
      `${falhas.length} tela(s) fora da linha de base:\n      ` + falhas.join('\n      ') +
      `\n      Se a mudança é intencional, regrave com npm run test:gerar e explique no commit.`);
  });
  s.teste('a linha de base cobre as telas e larguras declaradas', () => {
    ok(Object.keys(base).length === 12,
      `linha de base tem ${Object.keys(base).length} entradas, esperado 12 (4 telas x 3 larguras)`);
  });
  return s;
}

export function suite(r) {
  const s = criarSuite('visual');
  if (!r) {
    s.teste('navegador disponível', () => ok(false,
      'playwright-core ou o Chromium não estão instalados — ver tools/README.md. ' +
      'Portão Q5 não verificado.'));
    return s;
  }
  s.teste('nenhum erro de página não registrado', () => {
    ok(r.erros.length === 0,
      `${r.erros.length} erro(s) novo(s): ${r.erros.slice(0,3).join(' · ')}. ` +
      `Se for defeito a conviver, registre em docs/DEFEITOS.md e na lista CONHECIDOS.`);
    if (r.conhecidos.length) console.log(`      (${r.conhecidos.length} ocorrência(s) de defeito já registrado)`);
  });
  s.teste('o boot concluiu', () => ok(r.bootSumiu, 'a tela de boot não saiu'));
  s.teste('a fase de apostas abriu', () => ok(r.apostas, 'o app não chegou a nenhuma fase'));
  s.teste('elenco completo em cena', () => {
    ok(r.lutadores === 12, `${r.lutadores} lutadores na arena, esperado 12`);
    ok(r.placas === 12, `${r.placas} placas de HP, esperado 12`);
    ok(r.odds === 12, `${r.odds} linhas de odds, esperado 12`);
  });
  s.teste('os sprites carregaram', () => {
    ok(r.folhas > 50, `só ${r.folhas} folhas pedidas — o carregamento de sprite não rodou`);
    ok(r.comSprite === 12, `${r.comSprite} lutadores com sprite aplicado, esperado 12`);
  });
  s.teste('o clima não vaza durante a fase de apostas', () => {
    ok(!r.climaVazado,
      'o selo de clima estava visível durante as apostas. O clima é sorteado ANTES da pool ' +
      '(para garantir 1 lutador do tipo favorecido) e precisa ficar secreto até o fechamento — ' +
      'senão o apostador vê o bônus antes de escolher.');
  });

  s.teste('a batalha começa e o relógio corre', () => {
    ok(r.aoVivo, 'a rodada não chegou à fase AO VIVO');
    ok(parseFloat(r.relogio) > 0, `relógio da batalha em ${r.relogio} — a linha do tempo não avançou`);
  });
  return s;
}
