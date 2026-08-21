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
import { createServer, request as httpRequest } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, sep } from 'node:path';
import { criarSuite, igual, ok } from './harness.mjs';
import { criarDigital } from '../engine/rodada-digital.mjs';
import packEscolhido from '../content/escolhido.mjs';
const { digital: digitalNode, rodada: rodadaNode } = criarDigital(packEscolhido);
import { VEU_MAX, sortearArena } from '../app/modules/arenas-dados.mjs';
import { CONF as MOTOR_CONF } from '../engine/engine.mjs';
const CONF_SIMS = MOTOR_CONF.SIMS;

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PW = '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MIME = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript',
               '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
               '.gif':'image/gif', '.mp3':'audio/mpeg' };

export const disponivel = () => existsSync(PW) && existsSync(CHROME);

/* A cópia local dos assets existe? O F0.12 a torna o primeiro candidato da
   cascata; sem ela o jogo continua funcionando pela rede, mas o teste de
   egresso fechado não tem o que provar. */
export const temAssetsLocais = () => existsSync(new URL('../assets', import.meta.url).pathname);

/* `apiPorta` liga o ENCAMINHAMENTO para a API (F1.14).
 *
 * O servidor de arquivos e o `criarServidor()` são dois processos em portas
 * diferentes, e o navegador trata isso como duas origens: sem CORS, a página
 * não fala com a API, e com CORS o teste estaria medindo uma configuração que
 * a produção não usa — lá o cliente é servido pelo mesmo domínio, e é POR ISSO
 * que a lista de origens do servidor pode ser vazia.
 *
 * Encaminhar mantém a mesma origem e não inventa configuração nenhuma: a
 * página vê exatamente o que veria em produção. */
function servidor(apiPorta = null) {
  return new Promise(res => {
    const s = createServer((q, r) => {
      if (apiPorta && q.url.startsWith('/api/')) {
        const corpo = [];
        q.on('data', c => corpo.push(c));
        q.on('end', () => {
          const req = httpRequest({ host: '127.0.0.1', port: apiPorta, path: q.url,
                                    method: q.method, headers: q.headers }, resp => {
            r.writeHead(resp.statusCode, resp.headers);
            resp.pipe(r);
          });
          req.on('error', () => { r.writeHead(502); r.end(); });
          req.end(Buffer.concat(corpo));
        });
        return;
      }
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

/* A RAIZ DA RODADA, FIXADA — só para a linha de base.
 *
 * O V1.14 sorteia uma de cinco arenas por rodada, e a tela da arena é metade
 * da captura. Uma linha de base que muda de cenário a cada execução não é
 * linha de base: `npm run repetir` acusaria instabilidade sem nenhum defeito,
 * e instável é pior que vermelho — vermelho constante tem endereço.
 *
 * A resposta NÃO é excluir a arena da captura (aí a arena deixaria de ser
 * medida), e sim tirar o acaso: substituímos a única fonte imprevisível do
 * jogo — `crypto.getRandomValues`, de onde sai a raiz (§P3) — por um contador.
 * Tudo o que vem depois continua sendo o código de produção, rodando de
 * verdade: pool, clima, preço, arena e layout saem da árvore de sementes como
 * sempre, só que da MESMA raiz toda vez.
 *
 * É o mesmo princípio de bloquear as folhas de sprite: a linha de base mede a
 * NOSSA interface, e o que vem de fora dela só adiciona ruído.
 */
function RAIZ_FIXA() {
  let n = 0x5EED1234 >>> 0;
  crypto.getRandomValues = a => {
    for (let i = 0; i < a.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; a[i] = n; }
    return a;
  };
}

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

/* AS LARGURAS DA LINHA DE BASE (T2).
 *
 * Eram três: 1440, 1100 e 700. O `.app` da arena tem `max-width: 1560px`, então
 * o arranjo COMPLETO — as tres zonas com folga dos dois lados — nao existia em
 * nenhuma largura capturada. Medido no D-010: mexer no proprio `max-width`, que
 * reposiciona uma coluna inteira, moveu a digital em media 0,03 · pico 2. Nao
 * porque o portao seja cego: porque a mudanca acontecia numa largura que ele
 * nao olhava.
 *
 * `panoramico` fica ACIMA do `max-width`, que e onde as goteiras aparecem e o
 * arranjo para de crescer. */
const LARGURAS_TODAS = [
  { nome: 'panoramico', w: 1920, h: 1000 },
  { nome: 'largo',  w: 1440, h: 900 },
  { nome: 'medio',  w: 1100, h: 900 },
  { nome: 'estreito', w: 700, h: 900 },
];

/* ── A PASSADA ESTREITA DA SABOTAGEM ───────────────────────────────────────
 *
 * Cada carga de página espera ~5 s de Monte Carlo, e quatro larguras × quatro
 * telas fazem a suíte custar ~65 s. Multiplicado pelos mutantes que só o
 * navegador pega, era isso que empurrava o portão Q2 para 100 min.
 *
 * `SABOTAGEM_ESTREITA=1` roda UMA largura. A redução é legítima por causa da
 * mesma dedução que rege o portão inteiro:
 *
 *     **vermelho numa configuração reduzida é vermelho na completa.**
 *
 * Uma largura que reprova é uma prova de que a suíte pega o mutante. O que a
 * redução NÃO pode fazer é concluir o contrário: verde em uma largura não é
 * verde nas quatro, e por isso a sabotagem só usa este modo para tentar
 * CONDENAR — quando ele sai verde, o mutante é reavaliado com as quatro antes
 * de qualquer veredito.
 *
 * A largura escolhida é `largo`: é a de referência do projeto, e a única em que
 * as três zonas do arranjo existem ao mesmo tempo.
 *
 * A variável NÃO tem efeito fora da sabotagem: `npm test` e `npm run portoes`
 * nunca a definem, e o teste do portão confere que ela não vaza. */
const ESTREITA = process.env.SABOTAGEM_ESTREITA === '1';
const LARGURAS = ESTREITA ? LARGURAS_TODAS.filter(L => L.nome === 'largo') : LARGURAS_TODAS;

export async function capturarBase() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const saida = {};
  for (const L of LARGURAS) {
    const pg = await (await b.newContext({ viewport: { width: L.w, height: L.h } })).newPage();
    /* sprite bloqueado: a linha de base é da nossa interface */
    await pg.route(/(githubusercontent|jsdelivr|pokemonshowdown)/, r => r.fulfill({ status: 204 }));
    await pg.addInitScript(RAIZ_FIXA);
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
 * O navegador importa `engine/rodada-digital.mjs` — o MESMO arquivo que o Node
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
    const { criarDigital } = await import('/engine/rodada-digital.mjs');
    const pack = (await import('/content/escolhido.mjs')).default;
    const { digital } = criarDigital(pack);
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

/* A COMPARAÇÃO É POR REGIÃO, e não pela tela inteira (T2, fecha o D-010).
 *
 * A versão anterior media média e pico sobre os 3.072 valores da digital de uma
 * vez. Um card inteiro de colocação — doze linhas com retrato, nome e estado —
 * mediu **média 0,85 · pico 56** contra um limite de `média > 3` ou `pico > 60`:
 * passou 7 % por baixo. Não por cegueira à periferia (uma mudança grosseira na
 * mesma coluna marca pico 123 e reprova), mas porque um componente que RESPEITA
 * A PALETA em volta mexe pouco em cada pixel — e a média da tela inteira dilui o
 * pouco que ele mexe em muito que ele não mexe.
 *
 * Um componente ocupa uma REGIÃO. Medir por região é medir onde ele está.
 *
 * A grade e os limites são medidos, não escolhidos. Duas capturas da MESMA
 * interface, nas quatro larguras, nas quatro telas:
 *
 *   grade    pior média de região (ruído)   mesma métrica no componente
 *   1x1                 0,04                          0,82
 *   2x2                 0,07                          1,75
 *   4x4                 0,15                          3,50
 *   8x8                 0,38                          7,00     <- escolhida
 *
 * A 8x8 é a que mais separa: 18x entre ruído e sinal. O limite de 2 fica 5x
 * acima do ruído medido e 3,5x abaixo do sinal — folga dos dois lados, que é o
 * que impede tanto o falso positivo quanto o afrouxamento silencioso.
 *
 * O LIMITE DE PICO SAIU, e a medição é que o tirou. Numa célula de 4x4 px são
 * 48 valores: um único pixel mexendo 33 pontos já leva a média da região a
 * passar de 2. Qualquer pico que importe já é pego pela média — o limite de pico
 * só cobriria a faixa de um pixel entre 30 e 32, e um limite que ninguém
 * consegue acionar é botão morto no painel. A sabotagem provou: devolver o pico
 * a 60 não acendeu teste nenhum.
 *
 * O NÚMERO continua no relatório, porque diagnóstico não é limite: "média 7,0,
 * pico 56" diz componente; "média 7,0, pico 8" diz tom de fundo inteiro.
 *
 * E o relatório passa a dizer ONDE. "arena@largo: região 7,2" é diagnóstico;
 * "arena@largo: média 0,9" é um número. */
export const GRADE = 8;            // 8x8 regiões de 4x4 px na digital de 32x32
export const LIM_MEDIA_REGIAO = 2;

/* Cada região da digital, com média e pico da diferença. Exportada porque é o
   que a medição do T2 usa — e porque um teste que refaz a conta por fora
   testaria a cópia, não a peça. */
export function diferencaPorRegiao(a, b, grade = GRADE) {
  const cel = LADO / grade, out = [];
  for (let ry = 0; ry < grade; ry++) for (let rx = 0; rx < grade; rx++) {
    let soma = 0, pico = 0, n = 0;
    for (let y = ry * cel; y < (ry + 1) * cel; y++)
      for (let x = rx * cel; x < (rx + 1) * cel; x++) {
        const i = (y * LADO + x) * 3;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(a[i + c] - b[i + c]); soma += d; if (d > pico) pico = d; n++;
        }
      }
    out.push({ rx, ry, media: soma / n, pico });
  }
  return out;
}

export function compararBase(atual, base) {
  const falhas = [];
  /* NA PASSADA ESTREITA, A BASE TEM LARGURAS QUE NÃO FORAM CAPTURADAS, e cobrar
     captura delas faria a suíte ficar vermelha para QUALQUER mutante — o que
     transforma o portão numa máquina de PEGOU falso. Foi o defeito D-015, e ele
     inflou uma execução inteira do Q2 antes de a medição pegar.

     Ignorar a largura ausente é legítimo AQUI e só aqui: o modo estreito existe
     para tentar CONDENAR, e verde nele nunca conclui nada — a sabotagem sempre
     reexecuta com as quatro antes de qualquer veredito. Fora do modo estreito, a
     captura ausente continua sendo falha, e tem que continuar. */
  const larguras = new Set(LARGURAS.map(L => L.nome));
  for (const chave of Object.keys(base)) {
    const a = atual[chave], b = base[chave];
    if (!a && ESTREITA && !larguras.has(chave.split('@')[1])) continue;
    if (!a) { falhas.push(`${chave}: captura não produzida`); continue; }
    const fora = diferencaPorRegiao(a, b).filter(r => r.media > LIM_MEDIA_REGIAO);
    if (!fora.length) continue;
    /* a pior região primeiro: é a que diz o que mudou */
    fora.sort((x, y) => y.media - x.media);
    const onde = fora.slice(0, 3)
      .map(r => `região ${r.rx},${r.ry} (média ${r.media.toFixed(1)}, pico ${r.pico})`).join('; ');
    falhas.push(`${chave}: ${fora.length} de ${GRADE * GRADE} regiões fora — ${onde}`);
  }
  for (const chave of Object.keys(atual)) if (!(chave in base)) falhas.push(`${chave}: tela nova, sem linha de base`);
  return falhas;
}

export async function rodar() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  /* O ESTADO ESPELHADO NUMA GLOBAL. `waitForFunction` roda dentro da página e
     não pode `import`; a medição da colocação viva precisa ler `S` no MESMO
     tique em que lê o DOM — ver a nota longa onde ela acontece. */
  await pg.addInitScript(`import('/app/modules/estado.mjs')
    .then(m => { globalThis.__estadoVisual = m.S; }).catch(() => {});`);

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
    /* O CONTRÁRIO do clima, lido no MESMO instante para deixar isso explícito:
       a arena não dá bônus nenhum, então o selo dela tem que estar no ar já na
       fase de aposta. Selo apagado aqui é o V1.14 desligado. */
    /* D-011: os marcadores do número de simulações, como o jogador os lê. */
    simsNaTela: [...document.querySelectorAll('.sims')].map(e => e.textContent.trim()),
    /* L-027: o véu está APLICADO, e não só declarado no catálogo. Ler o
       `style` inline provaria que alguém escreveu a propriedade; o que se lê
       aqui é o computado, que é o que o navegador de fato vai pintar. */
    veu: (() => {
      const el = document.querySelector('#veuArena');
      if (!el) return { existe:false };
      const cs = getComputedStyle(el);
      return { existe:true, cor:cs.backgroundColor, alfa:parseFloat(cs.opacity),
               mistura:cs.mixBlendMode, cliques:cs.pointerEvents,
               z:parseInt(cs.zIndex, 10) };
    })(),
    /* L-030 item 9: o contorno que separa o lutador do piso. Lido no
       COMPUTADO e em três estados, porque o risco real não é escrever a
       regra — é `.mine` e `.rage` substituírem o `filter` inteiro e apagarem
       o contorno junto, que é como ele nasceu ausente. */
    contorno: (() => {
      const um = document.querySelector('.mon .body');
      if (!um) return { existe:false };
      const f = getComputedStyle(um).filter;
      const marcados = [...document.querySelectorAll('.mon')].slice(0, 3).map(m => {
        const b = m.querySelector('.body');
        return b ? getComputedStyle(b).filter : '';
      });
      return { existe:true, filtro:f, amostras:marcados };
    })(),
    arenaNaTela: document.querySelector('#arenaBadge')?.textContent ?? '',
    arenaSeloVisivel: !!document.querySelector('#arenaBadge')?.classList.contains('show'),
    fase: document.querySelector('#phase')?.textContent,
    lutadores: document.querySelectorAll('.mon').length,
    placas: document.querySelectorAll('.plate').length,
    odds: document.querySelectorAll('.pick').length,
    /* `http` não serve mais como marca de "carregou": desde o F0.12 a folha
       vem primeiro da cópia LOCAL, cujo caminho é relativo. O que importa é ter
       folha aplicada, venha de onde vier. */
    comSprite: [...document.querySelectorAll('.mon .body')]
      .filter(e => /url\(/.test(e.style.backgroundImage)).length,

    /* L-030 item 8 · CONTRASTE, medido no pixel e não no token.
     *
     * A cor de fundo que o jogador vê é `--panel` com alfa sobre `--bg`, com
     * gradiente por cima. Ler o valor declarado responderia sobre o token; a
     * pergunta é sobre o que dá para ler. Então: sobe a árvore compondo alfa
     * até achar opacidade 1, que é onde a pilha para.
     *
     * `background-image` não entra na conta — gradiente não tem uma cor só.
     * Isso torna a medida CONSERVADORA onde há gradiente claro por cima (o
     * contraste real fica melhor que o medido) e exata onde não há. Preferimos
     * errar para o lado de exigir demais. */
    contrastes: (() => {
      const cor = t => {
        const m = t.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(',').map(x => parseFloat(x));
        return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const sobre = (f, t) => [0,1,2].map(i =>
        Math.round(f[i] * f[3] + t[i] * (1 - f[3])));
      const fundoDe = el => {
        let pilha = [], n = el;
        while (n && n !== document.documentElement.parentNode){
          const c = cor(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0){ pilha.push([c.r, c.g, c.b, c.a]); if (c.a >= 1) break; }
          n = n.parentElement;
        }
        if (!pilha.length) return [0, 0, 0];
        let base = pilha[pilha.length - 1].slice(0, 3);
        for (let i = pilha.length - 2; i >= 0; i--) base = sobre(pilha[i], base);
        return base;
      };
      const ALVOS = [
        { sel:'#oddNote',    nome:'rodapé de auditoria da lista de odds' },
        { sel:'.pick .lim',  nome:'limite por lutador na lista' },
        { sel:'#chipHint',   nome:'dica de valor da aposta' },
        { sel:'.fa-eu span', nome:'nível do treinador na faixa' },
        { sel:'.card h3',    nome:'título de painel' },
        { sel:'#faSeg',      nome:'relógio da fase' },
        /* Achados pelo crítico cego na terceira passada: o link para a carteira
           era "o texto de menor contraste da tela inteira", e é o caminho para
           o dinheiro do jogador. O rótulo do relógio e a faixa de coluna
           entraram junto porque nasceram no mesmo bloco. */
        { sel:'#btnWallet',  nome:'link para a carteira' },
        { sel:'.fa-cron .rot', nome:'rótulo de direção do relógio' },
        { sel:'.colunas .c2', nome:'rótulo de coluna da lista' },
        { sel:'.fa-saldo span', nome:'unidade do saldo na faixa' },
      ];
      const out = [];
      for (const a of ALVOS){
        const el = document.querySelector(a.sel);
        if (!el) continue;
        const cs = getComputedStyle(el);
        const f = cor(cs.color); if (!f) continue;
        const fundo = fundoDe(el);
        const frente = f.a >= 1 ? [f.r, f.g, f.b] : sobre([f.r, f.g, f.b, f.a], fundo);
        const px = parseFloat(cs.fontSize);
        const peso = parseInt(cs.fontWeight, 10) || 400;
        out.push({ nome:a.nome, frente, fundo, px,
          grande: px >= 18.66 || (px >= 14 && peso >= 700),
          amostra: (el.textContent || '').trim().slice(0, 60) });
      }
      return out;
    })(),
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
  /* --- Q5 do F0.8: o corte precisa APARECER -------------------------------
     O §4.4.6 é explícito: *"a UI mostra o stake máximo disponível para aquele
     lutador e o motivo — nunca rejeita silenciosamente"*. Teste de unidade
     confere o texto da mensagem; só o navegador confere que ela chega à tela.

     O roteiro é o do jogador: enche a carteira, escolhe "max", clica no
     azarão — aquele cuja odd faz o payout estourar o teto de 50.000 — e lê o
     que apareceu.                                                          */
  const corte = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const banco = await import('/app/modules/banco.mjs');
    if (!S.odds || !S.passivo) return { erro: 'rodada sem preço' };
    const azarao = S.odds.lutadores.reduce((a, b) => (b.odd > a.odd ? b : a));
    const preciso = azarao.stakeMax * 4;
    /* Encher a carteira PELA API, e não escrevendo saldo.
       Este teste nasceu no F0.8 fazendo `S.bal = preciso + 1000`. O F0.9 tirou
       `S.bal` do mundo, e a linha virou atribuição a um campo que ninguém lê:
       o saldo continuava em 1.000, a aposta saía em 1.000, e o teste só falhava
       quando o stake máximo do azarão passava de 1.000 — ou seja, dependia da
       odd sorteada. Passou verde em duas de três execuções, e foi assim que
       chegou a um commit. */
    banco.creditarCompra(preciso + 1000, 'teste-q5');
    S.chipVal = preciso;
    const linha = document.querySelector(`.pick[data-i="${azarao.idx}"]`);
    if (!linha) return { erro: 'lista de apostas sem o azarão' };
    linha.click();
    return {
      idx: azarao.idx, odd: azarao.odd, stakeMax: azarao.stakeMax, pedido: preciso,
      aviso: document.querySelector('#avisoCorte')?.textContent ?? '',
      painel: document.querySelector('#betInfo')?.textContent ?? '',
      limiteNaLista: document.querySelector(`.pick[data-i="${azarao.idx}"] .lim`)?.textContent ?? '',
      apostado: S.myBet ? S.myBet.amount : null,
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));

  /* --- Q5 do V1.20: O QUE A TELA AFIRMA COM A APOSTA VIVA ----------------
   *
   * ESTES TESTES NASCERAM DE UM Q2 VERMELHO, e a lição é a mais cara do bloco:
   * seis defeitos do V1.20 (S99, S101, S102, S105, S107, S108) voltaram como
   * PASSOU no portão completo. Eu tinha escrito as correções e os defeitos, e
   * confiado na LINHA DE BASE para pegá-los — e ela captura quatro telas
   * estáticas, sem aposta feita. Estado que só existe depois de apostar não
   * aparece em nenhuma delas.
   *
   * Defeito plantado sem teste que o pegue é a definição de portão decorativo,
   * e a sabotagem é literalmente a peça que existe para dizer isso. Ela disse. */
  const comAposta = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    if (!S.myBet) return { erro: 'sem aposta viva' };
    const meu = S.fighters[S.myBet.idx];
    const banner = document.querySelector('#overlay .banner');
    const marcado = document.querySelector('.mon.mine .body');
    return {
      /* S99 — a chamada central tem que refletir a aposta, e não seguir
         mandando escolher com a aposta já confirmada na tela ao lado. */
      cta: banner?.textContent ?? '',
      ctaNomeia: !!banner && banner.textContent.includes(meu.n),
      overlayApostado: !!document.querySelector('#overlay.apostado'),
      /* S105 — o contorno tem que sobreviver ao estado `.mine`, que substitui
         o `filter` inteiro. Foi assim que ele nasceu ausente. */
      filtroDoMeu: marcado ? getComputedStyle(marcado).filter : null,
      /* S107 — nenhuma anotação em reais em cima de PokéCash. */
      textoDaAposta: document.querySelector('#betInfo')?.textContent ?? '',
      textoDasFichas: document.querySelector('#chipRow')?.textContent ?? '',
      saldoNaFaixa: document.querySelector('.fa-saldo')?.textContent ?? '',
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));

  /* S101/S102 — a faixa de coluna diz o que o `%` significa, e ela TROCA com a
     fase. Lida nas duas, porque o defeito tem um lado em cada. */
  const colunasAposta = await pg.evaluate(() =>
    document.querySelector('#listaCols')?.textContent ?? '').catch(() => '');

  /* --- Q5 do V1.15: CANCELAR A APOSTA DEVOLVE AS DUAS COISAS -------------
     Dinheiro e passivo. Teste de unidade prova que `liberarTicket` é o inverso
     exato de `registrarTicket`; só o navegador prova que o botão chama os dois.
     Liberar só o dinheiro deixa o mercado daquele lutador travado pelo resto da
     rodada — e o jogador vê "mercado fechado" sem nada explicando por quê. */
  const cancelamento = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const banco = await import('/app/modules/banco.mjs');
    if (!S.myBet) return { erro: 'sem aposta viva para cancelar' };
    const idx = S.myBet.idx, valor = S.myBet.amount;
    const antesSaldo = banco.saldo(), antesPassivo = S.passivo[idx];
    const botao = document.querySelector('#btnCancelBet');
    if (!botao) return { erro: 'o botão de cancelar não está na tela' };
    botao.click();
    return {
      idx, valor, antesSaldo, antesPassivo,
      depoisSaldo: banco.saldo(), depoisPassivo: S.passivo[idx],
      apostaViva: !!S.myBet,
      selecionados: document.querySelectorAll('.pick.sel').length,
      aviso: document.querySelector('#betInfo')?.textContent ?? '',
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));

  /* --- Q5 do V1.15: a colocação e o banner estão LIGADOS ------------------
     Quarta e quinta vez que a lição aparece (S30, S53, S65, S69, S77/S78): o
     módulo puro pode estar perfeito e ninguém tê-lo chamado. */
  const painel = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const adm = await import('/app/modules/adm.mjs');
    /* O PIN não é controle de acesso (ver adm-dados.mjs), então o teste abre o
       painel pela função. O que interessa aqui é o que ele MOSTRA. */
    adm.admAbrir();
    const linhas = [...document.querySelectorAll('#admMargem .admLinha')].map(l => l.textContent);
    return {
      /* A colocação vive na LISTA ÚNICA desde o V1.16 — eram três listas dos
         mesmos doze, e a mais visível não era a clicável. */
      colocacaoLinhas: document.querySelectorAll('#pickList .pick').length,
      colocacaoPos: [...document.querySelectorAll('#pickList .pick .p')].length,
      /* Os cosméticos vestem a FAIXA desde o V1.16: o banner de 340 px saiu da
         tela principal e o cenário e o efeito de nome foram para lá. O banner
         inteiro continua no perfil. */
      bannerCena: document.querySelector('#faixa .fa-cena')?.className ?? '',
      bannerNome: document.querySelector('#faNome')?.className ?? '',
      admAberto: document.querySelector('#viewAdm')?.classList.contains('on') ?? false,
      admMargem: linhas.join(' | '),
      margemRegistro: S.odds ? S.odds.margemConfigurada : null,
      lutadores: S.fighters.length,
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));
  await pg.evaluate(() => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.querySelector('#viewArena')?.classList.add('on');
  });

  /* --- Q5 do V1.13: o tema troca de verdade ------------------------------
     A promessa do bloco é que trocar de tema muda o site inteiro sem tocar em
     lógica de jogo. Teste de unidade confere que os tokens existem; só o
     navegador confere que o valor CALCULADO muda — e que ele muda em quem usa
     o token, não só na declaração. */
  const tema = await pg.evaluate(async () => {
    const { TEMAS, aplicarTema } = await import('/app/modules/tema.mjs');
    const raiz = document.documentElement;
    const lido = () => {
      const cs = getComputedStyle(raiz);
      const alvo = document.querySelector('.pick .o') || document.querySelector('#oddNote');
      return {
        gold: cs.getPropertyValue('--gold').trim(),
        goldRGB: cs.getPropertyValue('--goldRGB').trim(),
        bg: cs.getPropertyValue('--bg').trim(),
        line: cs.getPropertyValue('--line').trim(),
        /* a cor que de fato chega a um elemento — token que muda sem chegar na
           tela é token decorativo */
        naTela: alvo ? getComputedStyle(alvo).color : null,
      };
    };
    const antes = lido();
    aplicarTema('shadow');
    const depois = lido();
    const guardado = localStorage.getItem('ar_tema');
    aplicarTema(antes.gold === TEMAS[0].c1 ? 'hyper' : 'shadow');
    return { antes, depois, guardado, atributo: raiz.dataset.tema, quantos: TEMAS.length };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));

  /* --- Q5 do V1.15 (D-008): A APOSTA É CONTADA UMA VEZ, no fecho da janela --
     Contar no clique conta troca de lutador e conta aposta cancelada. O defeito
     é aritmético e invisível: o perfil mostra "12 apostas" para quem fez 4.
     Nenhum teste estático o alcança — quem conta é o fluxo. */
  const contagem = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const antes = S.profile.betsCount;
    const linhas = [...document.querySelectorAll('.pick')];
    if (linhas.length < 3) return { erro: 'lista de apostas curta demais' };
    /* três cliques: escolhe, troca, troca de novo. Uma aposta viva no fim. */
    linhas[0].click(); linhas[1].click(); linhas[2].click();
    return { antes, apostaViva: !!S.myBet };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));

  await pg.$eval('#btnStart', el => el.click()).catch(() => {});
  const aoVivo = await pg.waitForFunction(
    () => document.querySelector('#phase')?.textContent === 'AO VIVO',
    { timeout: 60000, polling: 300 }).then(() => true).catch(() => false);
  /* deixa a linha do tempo correr antes de ler o relógio: chegar em AO VIVO
     prova que a fase virou, o relógio andando prova que o replay consome a
     linha do tempo de verdade. */
  if (aoVivo) await pg.waitForTimeout(4000);
  /* O relógio vive na faixa fixa desde o V1.16 — era um sufixo de 7 px dentro
     do canvas. */
  const relogio = await pg.evaluate(() => document.querySelector('#faSeg')?.textContent);

  /* --- Q5 do V1.15: O QUADRO DE COLOCAÇÃO ESTÁ VIVO, e não só correto no fim.
     A conferência do fim da rodada (`conferirColocacao`) recalcula tudo dos
     eventos e corrige — então uma colocação que NÃO seja alimentada pelo gancho
     do abate termina certa e passa a rodada inteira errada. Só uma leitura DO
     MEIO DA LUTA distingue os dois casos. */
  /* Esperar a PRIMEIRA QUEDA, e não um relógio. Quatro segundos de luta não
     garantem nenhum nocaute — a rodada dura ~31 s e o primeiro abate cai onde
     cai. Teste que depende de quando a máquina chega lá não é teste; é sorte,
     e foi a lição da captura da linha de base no F0.7. */
  /* O PREDICADO NÃO PODE SER `async`. Uma função assíncrona devolve sempre uma
     Promise, e Promise é valor verdadeiro — o `waitForFunction` resolveria na
     primeira sondagem, antes de qualquer queda. Foi o que aconteceu aqui: a
     espera "acusou queda" com zero caídos.

     O sinal é o placar de abates na tela, e ele serve por ser INDEPENDENTE do
     que está sendo testado: o defeito S89 tira a ordem de quedas do gancho sem
     tocar na contagem de abates, então o placar continua andando enquanto o
     quadro de colocação congela. Esperar pelo próprio quadro seria circular. */
  /* Sinal de queda que sobrevive à fusão das listas (V1.16): linhas marcadas
     como caídas dentro da lista única. `#kfTotal` deixou de existir. */
  const houveQueda = aoVivo && await pg.waitForFunction(
    () => document.querySelectorAll('#pickList .pick.fechado').length > 0,
    { timeout: 45000, polling: 400 }).then(() => true).catch(() => false);

  /* A LEITURA É ATÔMICA, DENTRO DA PÁGINA, e as duas tentativas anteriores
   * erraram por não ser.
   *
   * `S.ents` muda no instante da queda; a lista só no quadro seguinte. Ler os
   * dois em `evaluate` separados compara estado de AGORA com DOM de antes.
   *
   * A primeira correção esperou o DOM alcançar o estado e leu depois — e ainda
   * falhava, com o quadro mostrando MAIS caídos que o estado. O número é o
   * diagnóstico: caído não revive. O que acontece é a RODADA VIRAR entre a
   * espera e a leitura — `S.ents` é reconstruído para a próxima, e a lista
   * ainda mostra as marcas da anterior. A sonda estava correndo contra o ciclo,
   * não contra o renderizador.
   *
   * Agora a página devolve o instantâneo INTEIRO no mesmo tique em que ele
   * fecha, e só enquanto a luta é a luta. Nada entre a medição e a leitura.
   *
   * O defeito que isto existe para pegar continua pego: o S89 tira a ordem de
   * quedas do gancho que credita o abate, o quadro CONGELA, a condição nunca
   * fecha e a espera estoura. Um quadro atrasado um quadro fecha na hora. */
  const colocacaoViva = aoVivo
    ? await pg.waitForFunction(() => {
        const S = globalThis.__estadoVisual;
        if (!S || S.state !== 'fighting') return null;
        const mortos = (S.ents || []).filter(e => !e.alive).length;
        const caidos = document.querySelectorAll('#pickList .pick.fechado').length;
        if (caidos !== mortos) return null;
        return {
          fase: S.state, mortos, caidosNoQuadro: caidos,
          linhas: document.querySelectorAll('#pickList .pick').length,
          contagemDepois: S.profile.betsCount,
          /* S102 — o outro lado da faixa de coluna. Na luta o `%` é VIDA, e é o
             lado em que a leitura otimista acontece: quem apostou a 7,1 % e vê
             91 % conclui que as chances explodiram. */
          colunas: document.querySelector('#listaCols')?.textContent ?? '',
        };
      }, { timeout: 20000, polling: 100 })
        .then(h => h.jsonValue())
        .catch(e => ({ erro: 'o quadro de colocação nunca alcançou o estado: ' +
                              String(e).split('\n')[0] }))
    : { erro: 'a luta não chegou a acontecer' };

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
      visual: S.seeds.visual,
      clima: S.weather?.key,
      elenco: S.fighters.map(f => [f.dex, f.n, f.maxHp, f.atk, f.def, f.spa, f.spd, f.spe,
                                   f.moves.map(m => m.n)]),
      vencedor: S.battle.winner,
      duracao: S.battle.duration,
      nEventos: S.battle.events.length,
    };
  }).catch(() => null);

  await b.close(); s.close();
  return { erros, conhecidos, apostas, aoVivo, relogio, folhas: cache.size, erroDepois, jogo, corte, cancelamento, comAposta, colunasAposta, painel, contagem, colocacaoViva, houveQueda, tema, ...st };
}

/* Q3 · A RODADA DO APP SAI DA RAIZ.
 *
 * `semente.mjs` prova que a árvore é sólida. Este teste prova a outra metade:
 * que o app está LIGADO nela, e que cada ramo alimenta o que deve. Trocar
 * `S.seeds.batalha` por `S.seeds.elenco` numa linha de `fases.mjs` não muda
 * nada que a suíte estática enxergue — foi o defeito S30, e é ele que este
 * teste existe para pegar.                                                  */
/* Q5 · O JOGO ABRE COM A REDE EXTERNA DESLIGADA (F0.12).
 *
 * Até aqui o portão de navegador só funcionava porque o arnês interceptava as
 * requisições de sprite e as servia pelo Node. Isso escondia a dependência em
 * vez de testá-la: ninguém sabia se o jogo abre numa máquina com egresso
 * fechado, porque nunca se tentou.
 *
 * Aqui NADA é servido: toda requisição a host externo é ABORTADA, como um
 * firewall faria. O jogo tem que subir, sortear a rodada e mostrar os lutadores
 * usando só a cópia local.                                                   */
export async function rodarSemRede() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const erros = [], bloqueadas = [];
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  await pg.route(/^https?:\/\//, rota => {
    const url = rota.request().url();
    if (url.startsWith(`http://127.0.0.1:${porta}/`)) return rota.continue();
    bloqueadas.push(url);
    return rota.abort();
  });
  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.evaluate(() => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.querySelector('#viewArena')?.classList.add('on');
  });
  /* O TETO NÃO É MEDIDA DE NADA, e por isso é generoso.
   *
   * Esta espera aguarda o Monte Carlo de 154.000 simulações terminar DENTRO do
   * Chromium. O portão roda até cinco Chromiums ao mesmo tempo, e foi assim que
   * ela estourou uma vez: a configuração `com-golden/navegador-estreito` voltou
   * vermelha, o `garantirBase` recusou julgar nela — corretamente — e o portão
   * abortou. Nove execuções isoladas depois, todas verdes.
   *
   * O teto existe para o teste FALHAR em vez de pendurar a suíte, e quem impede
   * o portão de ficar pendurado é o teto por mutante de 10 min que o F1.14
   * acrescentou. Então este pode ser largo: um verde lento continua verde, e um
   * vermelho de verdade — o app que não abre sem rede — não chega perto disso.
   *
   * E ELE PASSA A DIZER QUANTO ESPEROU. "a fase de apostas não abriu" não
   * distingue "o app quebrou" de "faltaram dois segundos", e a diferença é toda
   * a investigação. */
  const t0 = Date.now();
  /* POR QUE ELA PAROU, e não só quando. `waitForFunction` rejeita por DOIS
     motivos: o tempo acabou, ou o alvo morreu. Os dois viravam `pronto = false`
     e a mensagem dizia "esperei N segundos" nos dois casos — foi assim que um
     renderer morto por falta de memória se disfarçou de demora por 30 s contra
     um teto de 240. Ver D-023. */
  let motivoParada = null;
  const pronto = await pg.waitForFunction(
    () => document.querySelectorAll('.pick').length > 0,
    { timeout: 240000, polling: 300 })
    .then(() => true)
    .catch(e => { motivoParada = String(e?.message || e).split('\n')[0]; return false; });
  const msEspera = Date.now() - t0;

  /* ESPERA A ARTE CHEGAR, e não 2,5 segundos.
   *
   * A espera fixa media outra coisa sob carga: o portão roda até cinco caixas
   * de areia ao mesmo tempo, cada uma com um Chromium, e a leitura acontecia
   * antes de os retratos terminarem de carregar do disco. As duas afirmações
   * desta suíte — "a arte vem do disco" e "é a mesma arte" — ficavam vermelhas
   * sem nada estar errado, e o portão ABORTAVA nomeando a configuração.
   *
   * A condição é a própria afirmação do teste: todo retrato veio de `assets/` e
   * tem largura natural. Se a arte NÃO vier do disco — que é o defeito que esta
   * suíte existe para pegar — a condição nunca fecha e a espera estoura. Mesma
   * lição do D-016: relógio fixo mede a máquina, condição mede o produto. */
  await pg.waitForFunction(() => {
    const rs = [...document.querySelectorAll('.pick img')];
    return rs.length > 0
      && rs.every(i => i.currentSrc.includes('/assets/') && i.naturalWidth > 0)
      && [...document.querySelectorAll('.mon .body')]
           .some(e => e.style.backgroundImage.includes('assets/'));
  }, { timeout: 30000, polling: 200 }).catch(() => { /* o teste abaixo reprova com o número */ });

  const st = await pg.evaluate(() => ({
    lutadores: document.querySelectorAll('.mon').length,
    comFolha: [...document.querySelectorAll('.mon .body')]
      .filter(e => e.style.backgroundImage.includes('assets/')).length,
    retratos: document.querySelectorAll('.pick img').length,
    retratosLocais: [...document.querySelectorAll('.pick img')]
      .filter(i => i.currentSrc.includes('/assets/') && i.naturalWidth > 0).length,
  }));
  await b.close(); s.close();
  return { erros, bloqueadas, pronto, msEspera, motivoParada, ...st };
}

/* Q5 · O TEMA É APLICADO SEM NENHUM MÓDULO RODAR (V1.13).
 *
 * O teste textual em `test/tema.mjs` confere que o script existe no `<head>` —
 * e o defeito S69 esvaziou o CORPO dele deixando o texto no lugar, passando por
 * baixo. Terceira vez que a lição aparece: **testar a declaração não testa a
 * peça.**
 *
 * A prova é bloquear TODOS os módulos e carregar mesmo assim. Se o tema
 * guardado aparece no `<html>` sem uma linha de JavaScript de módulo ter
 * rodado, o script do `<head>` fez o trabalho. Se não aparece, a página
 * piscaria no tema errado até o boot chegar — e um quadro é o suficiente para
 * parecer defeito.
 */
/* Q5/Q6 · COM SESSÃO E SEM SERVIDOR, O APP NÃO INVENTA RODADA (F1.14).
 *
 * ── O DEFEITO QUE ESTE TESTE EXISTE PARA PEGAR ─────────────────────────────
 *
 * É o primeiro item da sabotagem declarada do bloco, e é o mais tentador de
 * todos: a rede não respondeu, e alguém acha que travar a tela é pior que
 * sortear uma rodada local "só para o jogador não ficar parado". O resultado é
 * o jogador apostando numa rodada que o settlement do servidor não conhece —
 * dinheiro debitado contra lutadores que nunca existiram.
 *
 * O defeito plantado S255 escapou de TODA a suíte na primeira passada, porque a
 * queda mora dentro de `newRound()`, que precisa de DOM para rodar. Teste
 * estático não a alcança; só um navegador de verdade alcança. É a razão de o
 * Q5 existir, na forma mais literal possível.
 *
 * ── COMO A CENA É MONTADA ──────────────────────────────────────────────────
 *
 * O `localStorage` recebe uma sessão ANTES de qualquer módulo rodar, então o
 * app acorda em modo servidor. Toda chamada para `/api/` é abortada, como um
 * backend caído faria — mas os ARQUIVOS continuam sendo servidos, senão a
 * página nem carregaria e o teste passaria por não ter app nenhum.
 */
export async function rodarSemBackend() {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));

  /* A sessão entra antes do primeiro script da página. */
  await pg.addInitScript(() => { try { localStorage.setItem('ar_sessao', 'sessao-de-teste'); } catch {} });

  /* A API cai; o resto do site continua de pé. */
  let chamadasApi = 0;
  await pg.route('**/api/**', rota => { chamadasApi++; return rota.abort(); });

  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });

  /* Espera generosa E CONTRA A CONDIÇÃO ERRADA: se aparecer lutador para
     apostar, o app inventou rodada — que é exatamente o defeito. Esperar o
     "tempo de não acontecer" é o único caso em que o relógio é a medida certa,
     porque a afirmação é sobre AUSÊNCIA. Oito segundos são muitas vezes o
     tempo normal de uma abertura. */
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0,
    { timeout: 8000, polling: 200 }).catch(() => {});

  const st = await pg.evaluate(() => ({
    picks: document.querySelectorAll('.pick').length,
    faixa: document.getElementById('conexaoFaixa')?.className || '',
    textoFaixa: document.getElementById('conexaoFaixa')?.textContent || '',
  }));
  await b.close(); s.close();
  return { erros, chamadasApi, ...st };
}

export function suiteSemBackend(r) {
  const s = criarSuite('sem-backend');
  s.teste('a página sobe com sessão e sem backend', () => {
    ok(r.erros.length === 0, `erro de página: ${r.erros[0]}`);
    ok(r.chamadasApi > 0,
      'nenhuma chamada à API foi tentada — o app não acordou em modo servidor, ' +
      'e então este teste não estaria medindo nada');
  });

  s.teste('NENHUMA rodada é inventada quando o servidor não responde', () => {
    igual(r.picks, 0,
      `apareceram ${r.picks} lutadores para apostar com o backend inteiro caído. ` +
      `O app sorteou uma rodada local em modo servidor — e quem apostar nela ` +
      `aposta contra números que o settlement não conhece. Rede caída não é ` +
      `permissão para inventar rodada.`);
  });

  s.teste('a faixa de conexão explica a espera', () => {
    ok(r.faixa.includes('on'),
      'o app ficou parado sem dizer nada. Uma tela que não abre e não explica ' +
      'lê como produto quebrado — é o §5.9, e é a diferença entre esperar e ' +
      'fechar a aba.');
    ok(/aposta|saldo|guardad/i.test(r.textoFaixa),
      `a faixa não fala do dinheiro: "${r.textoFaixa.slice(0, 60)}". É a primeira ` +
      `pergunta de quem cai, e não respondê-la deixa a pior resposta possível.`);
  });
  return s;
}

/* Q5/Q1 · UMA RODADA INTEIRA CONTRA O SERVIDOR, NO NAVEGADOR (F1.14).
 *
 * ── POR QUE ESTE TESTE PRECISOU EXISTIR ────────────────────────────────────
 *
 * Três defeitos plantados do bloco escaparam da suíte inteira:
 *
 *   S255  rede caída faz o app cair para o sorteio local
 *   S258  falha de rede vira "aposta recusada", e o jogador aposta duas vezes
 *   S259  a carteira deixa de voltar do settlement
 *
 * Os três moram dentro de `newRound`, `placeBet` e `finish` — funções que só
 * rodam com DOM. Nenhum teste estático as alcança, e nenhum teste de módulo
 * também: eles medem as PEÇAS, e o que falha aqui é o ENCAIXE. É a lição que o
 * projeto já registrou cinco vezes, e esta é a sexta.
 *
 * ── O QUE ELE MONTA ────────────────────────────────────────────────────────
 *
 * Um servidor de verdade com relógio controlado, um navegador de verdade com
 * sessão de verdade, e o servidor de arquivos ENCAMINHANDO `/api/` — mesma
 * origem, como em produção. O teste é quem avança o relógio do servidor, então
 * a rodada inteira cabe em segundos em vez de 78.
 */
export async function rodarRodadaCompleta() {
  const { chromium } = await import(PW);
  const { criarServidor } = await import('../server/servidor.mjs');
  const { FASE_MS } = await import('../server/scheduler.mjs');

  let t = 1_700_000_000_000;
  const api = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                              banco: ':memory:', sims: 400, relogio: () => t });
  const apiPorta = await api.ouvir(0);
  const { s, porta } = await servidor(apiPorta);

  const conta = await fetch(`http://127.0.0.1:${apiPorta}/api/auth/cadastrar`, {
    method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'jogadora', email: 'j@exemplo.test',
                           senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) });
  const { sessao } = await conta.json();

  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const erros = [], falhas = [], consola = [];
  pg.on('pageerror', e => erros.push(String(e.stack || e).split('\n').slice(0, 4).join(' « ')));
  pg.on('requestfailed', q => falhas.push(`${q.method()} ${q.url()} — ${q.failure()?.errorText}`));
  pg.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 160)); });
  await pg.addInitScript(tk => { try { localStorage.setItem('ar_sessao', tk); } catch {} }, sessao);

  /* ── A AMOSTRAGEM DO INSTANTE (F1.16) ───────────────────────────────────
   *
   * "O cliente não é fonte de dinheiro NEM POR UM INSTANTE" é uma afirmação
   * sobre um intervalo que dura milissegundos: entre o boot criar a carteira e
   * o `hidratar()` substituí-la pela projeção do servidor. Olhar o estado no
   * fim da rodada não vê nada — a L-039 dizia isso, e foi por isso que os
   * defeitos S298 e S299 passaram verdes na primeira passada.
   *
   * Este amostrador roda dentro da página desde antes do primeiro módulo e
   * guarda TODO lançamento que aparecer na carteira. Se o cliente criar
   * dinheiro por um quadro que seja, fica registrado. */
  await pg.addInitScript(() => {
    window.__amostras = { lancamentos: [], origens: [], armazenamento: [] };
    const olhar = async () => {
      try {
        const { S } = await import('/app/modules/estado.mjs');
        const banco = await import('/app/modules/banco.mjs');
        for (const l of S.carteira?.ledger ?? [])
          if (!window.__amostras.lancamentos.includes(l.tipo))
            window.__amostras.lancamentos.push(l.tipo);
        /* O DIAGNÓSTICO SÓ CONTA DEPOIS DE HAVER CARTEIRA. `ultimoDiagnostico`
           nasce com `origem: 'novo'` — é o valor inicial do módulo, não prova
           de que `carregar()` rodou. Amostrá-lo antes da primeira carga
           reprovaria a árvore limpa, e foi o que aconteceu na primeira
           tentativa deste teste. */
        const o = S.carteira ? banco.ultimoDiagnostico?.origem : null;
        if (o && !window.__amostras.origens.includes(o)) window.__amostras.origens.push(o);
        const g = localStorage.getItem('ar_carteira');
        if (g && !window.__amostras.armazenamento.includes('escreveu'))
          window.__amostras.armazenamento.push('escreveu');
      } catch { /* os módulos ainda não carregaram */ }
    };
    const t = setInterval(olhar, 4);
    window.__pararAmostra = () => clearInterval(t);
    setTimeout(() => clearInterval(t), 20000);
  });

  /* A FASE SAI DE `S.state`, E NÃO DE UM ATRIBUTO DO DOM.
   *
   * A primeira versão lia `document.documentElement.dataset.fase`, que NÃO
   * EXISTE — então a comparação `'' !== 'betting'` era verdadeira sempre, e o
   * teste "quem fecha a janela é o servidor" passava sem medir nada. Portão
   * que aprova por engano é pior que portão ausente: o ausente ninguém confia.
   *
   * `S.state` é a fase de verdade, é o que o app usa para decidir, e o módulo
   * é importável de dentro da página. */
  const espiar = async () => pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    return {
      picks: document.querySelectorAll('.pick').length,
      saldo: document.getElementById('bal')?.textContent?.replace(/\D/g, '') || '',
      info: document.getElementById('betInfo')?.textContent || '',
      fase: S.state,
    };
  });
  const ate = async (cond, oQue, teto = 30000) => {
    const fim = Date.now() + teto;
    while (Date.now() < fim) { if (await cond()) return true; await new Promise(z => setTimeout(z, 120)); }
    return false;
  };

  const r = { erros };
  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });

  /* 1 · a rodada chega do servidor */
  r.abriu = await ate(async () => (await espiar()).picks === 12, 'a rodada do servidor');
  r.aposHome = await espiar();

  /* 2 · o saldo é o do servidor, e não o inicial local */
  const carteira = await fetch(`http://127.0.0.1:${apiPorta}/api/carteira`,
    { headers: { 'x-api-versao': '1', authorization: `Bearer ${sessao}` } }).then(x => x.json());
  r.saldoServidor = Object.entries(carteira.saldos)
    .filter(([k]) => !k.startsWith('reservado_')).reduce((a, [, v]) => a + v, 0);

  /* 3 · a aposta vai pela rota. O clique só acontece se houve o que clicar —
     senão o erro seria um stack de timeout do Playwright, que não diagnostica
     nada. O teste abaixo é quem reprova, com o número. */
  r.falhas = falhas.slice(0, 4); r.consola = consola.slice(0, 4);
  if (!r.abriu) { await b.close(); s.close(); await api.fechar(); return r; }
  /* O CLIQUE NÃO PODE MATAR O ARNÊS. Um `page.click` que estoura joga
     `TimeoutError` para fora da suíte inteira: o relatório vira um stack do
     Playwright, as outras asserções nunca rodam, e o portão fica sem saber o
     que falhou. Aqui ele vira um dado, e quem reprova é a asserção — com o
     nome do que estava na frente. */
  /* A APOSTA VAI NO CAMPEÃO, e a escolha é o que dá poder ao teste do fim.
   *
   * Com aposta PERDEDORA, o saldo depois do settlement é igual ao de depois da
   * aposta — o stake já saiu e não entra payout nenhum. Um cliente que NÃO
   * reidrata a carteira mostra o número certo por acidente, e o defeito
   * plantado S259 fica invisível. Foi exatamente o que aconteceu: ele passou
   * numa execução e foi pego na seguinte, conforme o sorteio.
   *
   * É o D-021 noutra roupa — teste cujo poder depende do sorteio é teste
   * instável, e instável é pior que vermelho. Apostando no campeão o
   * settlement SEMPRE credita, e o número na tela só pode estar certo se tiver
   * vindo do servidor. */
  const rd = api.db.prepare('SELECT id FROM rounds ORDER BY rowid DESC LIMIT 1').get();
  const campeaoSlot = api.db.prepare(
    'SELECT slot FROM round_fighters WHERE round_id=? AND species_id=?')
    .get(rd.id, api.sched.espiarCampeao(rd.id))?.slot ?? 0;
  r.campeaoSlot = campeaoSlot;

  r.cliqueErro = null;
  try {
    await pg.click(`.pick[data-i="${campeaoSlot}"]`, { timeout: 8000 });
  } catch (e) {
    r.cliqueErro = String(e.message || e).split('\n').slice(0, 3).join(' ');
    r.bootPresente = await pg.evaluate(() => !!document.getElementById('boot'));
  }
  r.apostou = await ate(async () => /retorno se vencer/.test((await espiar()).info), 'a confirmação da aposta');
  r.aposAposta = await espiar();
  const apostas = api.db.prepare('SELECT COUNT(*) n, SUM(stake) s FROM bets').get();
  r.apostasNoBanco = apostas.n;
  r.stakeNoBanco = apostas.s;

  /* 4 · A REDE CAI NO MEIO DA APOSTA. O jogador troca de lutador e o servidor
     não responde. A recusa e o silêncio precisam ser textos DIFERENTES: dizer
     "recusada" quando a rede caiu faz o jogador tentar de novo, e a primeira
     pode ter chegado — duas apostas por causa de uma mensagem. */
  await pg.route('**/api/aposta', rota => rota.abort());
  /* Um lutador QUALQUER menos o campeão: a queda tem que impedir a troca, e a
     aposta vencedora precisa continuar de pé para o teste do fim. */
  await pg.evaluate(c => document.querySelector(`.pick[data-i="${c === 0 ? 1 : 0}"]`)?.click(), campeaoSlot);
  r.textoSemRede = (await ate(async () => {
    const i = (await espiar()).info;
    return i && !/retorno se vencer/.test(i);
  }, 'a mensagem de queda', 8000)) ? (await espiar()).info : '(a tela não mudou)';
  await pg.unroute('**/api/aposta');

  /* 5 · A RODADA VAI ATÉ O FIM, e o saldo tem que voltar do settlement.
     `S.speed` multiplica o tempo da luta e já existe — é o mesmo recurso que o
     roteiro de capturas usa. Sem ele a batalha levaria 45 s de relógio de
     parede, e o portão inteiro pagaria isso a cada execução. */
  await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    S.speed = 60;
  });
  t += FASE_MS.APOSTA + 1; api.sched.tick();
  r.travou = await ate(async () => (await espiar()).fase !== 'betting', 'o fechamento vindo do servidor');
  r.aposTravar = await espiar();

  t += FASE_MS.PREPARO + FASE_MS.LUTA + 1; api.sched.tick(); api.sched.tick();
  const { liquidarRodada } = await import('../server/aposta.mjs');
  const rodada = api.db.prepare('SELECT id FROM rounds ORDER BY rowid DESC LIMIT 1').get();
  try { liquidarRodada(api.db, { sched: api.sched, roundId: rodada.id, agora: t }); } catch { /* já liquidada */ }
  const depois = await fetch(`http://127.0.0.1:${apiPorta}/api/carteira`,
    { headers: { 'x-api-versao': '1', authorization: `Bearer ${sessao}` } }).then(x => x.json());
  r.saldoLiquidado = Object.entries(depois.saldos)
    .filter(([k]) => !k.startsWith('reservado_')).reduce((a, [, v]) => a + v, 0);

  r.chegouAoFim = await ate(async () => (await espiar()).fase === 'result', 'a tela de resultado', 40000);

  /* O LEDGER LOCAL NÃO PODE TER GANHO NADA.
   *
   * Com o servidor liquidando, o cliente que TAMBÉM lançasse teria dois
   * lançamentos para a mesma aposta. A tela não denunciaria: o `hidratar()`
   * vem depois e sobrescreve o número com o do servidor — o defeito ficaria
   * escondido atrás da própria correção que o torna visível no saldo.
   *
   * O que sobra observável é o ARMAZENAMENTO: em modo servidor o cliente não
   * escreve dinheiro nenhum. É a propriedade "uma fonte só" dita diretamente,
   * e é o que o defeito plantado S260 quebra. */
  r.ledgerLocal = await pg.evaluate(() => {
    try {
      const w = JSON.parse(localStorage.getItem('ar_carteira') || 'null');
      return w?.ledger?.map(l => l.tipo) ?? [];
    } catch { return ['(ilegível)']; }
  });

  /* O ARMAZENAMENTO NÃO BASTA, e descobrir isso custou dois defeitos plantados.
   *
   * A fachada tem DUAS guardas em modo servidor: `carregar()` não cria carteira
   * local, e `salvar()` não escreve. Olhando só o `localStorage`, cada uma
   * MASCARA a outra — sem `salvar`, a carteira local criada não persiste; sem
   * `carregar` local, nada chama `salvar`. Os defeitos S298 e S299 passaram
   * verdes por isso.
   *
   * A carteira VIVA e o diagnóstico mostram as duas separadamente: em modo
   * servidor a origem é `servidor` e o ledger em memória está vazio. */
  r.amostras = await pg.evaluate(() => window.__amostras ?? null);
  /* A FACHADA EXERCIDA DIRETO, com sessão ativa.
   *
   * `salvar()` tem guarda própria em modo servidor, e durante uma rodada normal
   * ninguém a alcança — `carregar()` já não cria carteira local, então nada
   * chama `salvar()`. As duas guardas mascaram uma à outra, e o defeito S299
   * passou verde por isso.
   *
   * Aqui a fachada é chamada de propósito. É legítimo e é o contrato dela: com
   * sessão, NADA é escrito. O dia em que um lançamento de recompensa do cliente
   * sobreviver à migração — XP, desafio, medalha —, esta é a rede que pega. */
  r.carteiraViva = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const banco = await import('/app/modules/banco.mjs');
    return { origem: banco.ultimoDiagnostico?.origem ?? '(sem diagnóstico)',
             lancamentos: S.carteira?.ledger?.map(l => l.tipo) ?? ['(sem carteira)'],
             modoServidor: banco.modoServidor() };
  });
  r.fachadaEscreveu = await pg.evaluate(async () => {
    /* O AMOSTRADOR PARA ANTES, senão esta sonda polui a própria medição: ela
       credita de propósito, e o amostrador registraria o crédito dela como se
       fosse do boot. Foi o que aconteceu na primeira versão. */
    window.__pararAmostra?.();
    const banco = await import('/app/modules/banco.mjs');
    if (!banco.modoServidor()) return '(sem sessão: o teste não mediu nada)';
    localStorage.removeItem('ar_carteira');

    /* `carregar()` PERGUNTADO DIRETO, e é a metade determinística da medição.
       Amostrar o boot pega o defeito só se a janela durar mais que o intervalo
       do amostrador — é uma corrida, e teste cuja força depende de timing é
       teste que às vezes não testa (D-021). Aqui a pergunta é feita à fachada,
       e a resposta é sempre a mesma. */
    const w = banco.carregar();
    const doCarregar = (w?.ledger ?? []).map(l => l.tipo);

    try { banco.creditarRecompensa('WELCOME_GRANT', 500, 'sonda-f1.16'); } catch { /* recusar é ok */ }
    try { banco.salvar(); } catch { /* idem */ }
    return { doCarregar,
             escreveu: localStorage.getItem('ar_carteira') ? 'escreveu' : 'nada' };
  });

  r.faseFinal = (await espiar()).fase;
  r.estadoFinal = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    return { state: S.state, speed: S.speed, clock: Math.round(S.clock), temBatalha: !!S.battle,
             eventos: S.battle?.events?.length ?? 0, champ: S.champ };
  }).catch(() => null);
  r.saldoNaTelaFinal = (await ate(async () => +(await espiar()).saldo === r.saldoLiquidado,
    'o saldo reidratado', 15000)) ? r.saldoLiquidado : +(await espiar()).saldo;

  await b.close(); s.close(); await api.fechar();
  return r;
}

export function suiteRodadaCompleta(r) {
  const s = criarSuite('rodada-completa');

  s.teste('a página joga contra o servidor sem erro', () => {
    ok(r.erros.length === 0, `erro de página: ${r.erros[0]}`);
  });

  s.teste('a rodada desenhada é a do servidor', () => {
    ok(r.abriu,
      `os doze lutadores não apareceram (vi ${r.aposHome?.picks ?? '?'}). Ou a ` +
      `rodada não chegou pela sala, ou o cliente não montou a pool a partir da ` +
      `semente publicada.\n      requisições que falharam: ${r.falhas?.join(' | ') || 'nenhuma'}` +
      `\n      console: ${r.consola?.join(' | ') || 'limpo'}`);
  });

  s.teste('o saldo na tela é o do SERVIDOR', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    igual(r.aposHome.saldo, String(r.saldoServidor),
      `a tela mostra ${r.aposHome.saldo} e o servidor tem ${r.saldoServidor}. O ` +
      `cliente está exibindo a carteira local — e limpar o armazenamento voltaria ` +
      `a apagar dinheiro do jogador.`);
  });

  s.teste('a aposta chega ao banco do servidor', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    ok(!r.cliqueErro,
      `não deu para clicar no lutador: ${r.cliqueErro}` +
      (r.bootPresente ? '\n      A TELA DE BOOT AINDA ESTÁ NA PÁGINA. O boot só a ' +
        'remove depois de `newRound()` voltar — se ela ficou, alguma coisa antes ' +
        'dela não voltou, e o jogador vê a tela de carregamento para sempre.' : '') +
      `\n      erros de página: ${r.erros.join(' | ') || 'nenhum'}`);
    ok(r.apostou, `a aposta não foi confirmada na tela: "${r.aposAposta.info.slice(0, 80)}"`);
    igual(r.apostasNoBanco, 1,
      `o banco do servidor tem ${r.apostasNoBanco} apostas. O clique virou aposta ` +
      `local: o jogador teria débito aqui e nada lá, e o settlement não pagaria.`);
  });

  s.teste('o saldo cai pelo valor que o SERVIDOR registrou', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    igual(+r.aposAposta.saldo, r.saldoServidor - r.stakeNoBanco,
      `depois de apostar ${r.stakeNoBanco} a tela mostra ${r.aposAposta.saldo} e a ` +
      `conta do servidor dá ${r.saldoServidor - r.stakeNoBanco}. As duas pontas ` +
      `discordam sobre quanto o jogador tem.`);
  });

  s.teste('queda de rede na aposta NÃO é lida como recusa', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    const txt = (r.textoSemRede || '').toLowerCase();
    ok(txt && txt !== '(a tela não mudou)',
      'o servidor sumiu no meio da aposta e a tela não disse nada');
    for (const proibido of ['recusada', 'tente novamente', 'não foi aceita', 'inválida'])
      ok(!txt.includes(proibido),
        `a tela diz "${proibido}" para uma FALHA DE REDE: "${r.textoSemRede.slice(0, 90)}". ` +
        `O jogador tenta de novo, e a primeira aposta pode ter chegado — duas ` +
        `apostas por causa de uma mensagem.`);
    ok(/não repita|não consegui|conexão|servidor/.test(txt),
      `a mensagem não explica que foi a rede: "${r.textoSemRede.slice(0, 90)}"`);
  });

  s.teste('o saldo final é o do SETTLEMENT do servidor', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    ok(r.chegouAoFim,
      `a rodada não chegou à tela de resultado — parou em \`${r.faseFinal}\`. ` +
      `estado: ${JSON.stringify(r.estadoFinal)}`);
    igual(r.saldoNaTelaFinal, r.saldoLiquidado,
      `depois do settlement o servidor tem ${r.saldoLiquidado} e a tela mostra ` +
      `${r.saldoNaTelaFinal}. O cliente não reidratou a carteira no fim da ` +
      `rodada: o número congela na projeção de antes, e o jogador vê um saldo ` +
      `que não é o dele até recarregar a página.`);
  });

  s.teste('em modo servidor o cliente NÃO escreve dinheiro no armazenamento', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    /* O LEDGER LOCAL FICA VAZIO. SEM EXCEÇÃO NENHUMA.
     *
     * Até o F1.16 esta asserção precisava excluir o `WELCOME_GRANT`: o boot
     * chamava `atualizarSaldo()` antes de `ligarModoServidor()`, e a carteira
     * local nascia com o crédito de boas-vindas. Nunca custou dinheiro — a
     * projeção do servidor sobrescrevia —, mas a exclusão era uma janela: o
     * próximo lançamento de boot passaria por ela sem ninguém notar.
     *
     * Agora a fachada sabe que, em modo servidor, ela não é fonte. E a
     * afirmação pode ser a forte: NADA foi escrito. */
    igual((r.ledgerLocal || []).length, 0,
      `o ledger local tem ${(r.ledgerLocal || []).join(', ')} numa rodada de ` +
      `SERVIDOR. Em modo servidor o cliente não é fonte de dinheiro nem por um ` +
      `instante: qualquer lançamento aqui é uma segunda contabilidade para o ` +
      `mesmo dinheiro, e a tela não denuncia porque o \`hidratar()\` vem depois ` +
      `e sobrescreve o número.`);

    /* NEM POR UM INSTANTE. O amostrador roda a cada 4 ms desde antes do
       primeiro módulo: se o cliente criou dinheiro por um quadro que seja
       — mesmo que o `hidratar()` sobrescreva logo depois —, está aqui. */
    const am = r.amostras || {};
    igual((am.lancamentos || []).length, 0,
      `a carteira do cliente teve ${(am.lancamentos || []).join(', ')} em algum ` +
      `instante do boot, com sessão ativa. A projeção do servidor sobrescreve ` +
      `depois e a tela nunca denuncia — mas o cliente foi fonte de dinheiro, e ` +
      `é isso que este bloco existe para tornar impossível.`);
    ok(!(am.origens || []).some(o => o !== 'servidor'),
      `o diagnóstico da carteira passou por ${(am.origens || []).join(', ')} com ` +
      `sessão ativa. Qualquer origem que não seja "servidor" é o \`carregar()\` ` +
      `local tendo rodado.`);
    igual((am.armazenamento || []).length, 0,
      'o cliente escreveu no armazenamento em algum instante, com sessão ativa');

    const f = r.fachadaEscreveu || {};
    igual((f.doCarregar || []).length, 0,
      `\`carregar()\` devolveu ${(f.doCarregar || []).join(', ')} com sessão ativa. ` +
      `Em modo servidor a fachada NÃO é fonte: ela devolve uma carteira vazia e ` +
      `espera a projeção, em vez de inventar o crédito de boas-vindas que o ` +
      `servidor já deu.`);
    igual(f.escreveu, 'nada',
      `chamar a fachada com sessão ativa resultou em "${f.escreveu}". A garantia ` +
      `vale nas DUAS pontas: \`carregar()\` não cria e \`salvar()\` não escreve. ` +
      `Com só uma delas, a outra a mascara e o defeito passa despercebido — foi ` +
      `exatamente o que os defeitos S298 e S299 fizeram na primeira passada.`);

    const v = r.carteiraViva || {};
    igual(v.modoServidor, true, 'a página não estava em modo servidor — o teste não mediu nada');
    igual(v.origem, 'servidor',
      `a carteira viva tem origem "${v.origem}" e deveria ser "servidor". O ` +
      `\`carregar()\` criou uma carteira LOCAL com sessão ativa — ela não ` +
      `persiste, porque \`salvar()\` está bloqueado, mas existe em memória até o ` +
      `\`hidratar()\` voltar. Cliente como fonte, nem que por um instante.`);
    igual((v.lancamentos || []).length, 0,
      `a carteira viva tem ${(v.lancamentos || []).join(', ')} em modo servidor. ` +
      `O crédito de boas-vindas nasceu no cliente, e o servidor já tinha dado o ` +
      `dele — são dois para o mesmo jogador.`);
  });

  s.teste('quem fecha a janela de aposta é o servidor', () => {
    ok(r.abriu, 'a rodada não abriu — ver o teste acima');
    ok(r.travou,
      'o cliente continuou na fase de aposta depois de o servidor travar a ' +
      'rodada. A janela fica aberta aqui e fechada lá — e uma dessas duas é ' +
      'dinheiro.');
  });

  return s;
}

export async function rodarTemaSemModulos(temaAlvo = 'shadow') {
  const { chromium } = await import(PW);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage();
  await pg.addInitScript(t => { try { localStorage.setItem('ar_tema', t); } catch {} }, temaAlvo);
  /* nada de módulo: só o HTML, o CSS e o script inline do <head> */
  let modulosBloqueados = 0;
  await pg.route('**/modules/**', r => { modulosBloqueados++; return r.abort(); });
  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  const lido = await pg.evaluate(() => ({
    atributo: document.documentElement.dataset.tema,
    gold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
  }));
  await b.close(); s.close();
  return { ...lido, modulosBloqueados, temaAlvo };
}

export function suiteTemaCedo(r) {
  const s = criarSuite('tema-cedo');
  s.teste('o tema guardado vale antes de qualquer módulo rodar', () => {
    ok(r.modulosBloqueados > 0,
      'nenhum módulo foi bloqueado — o teste não provou nada sobre a primeira pintura');
    ok(r.atributo === r.temaAlvo,
      `com todos os módulos bloqueados o <html> ficou em "${r.atributo}", e o tema ` +
      `guardado era "${r.temaAlvo}". O script do <head> não aplicou o tema, então a ` +
      `página pisca no tema errado até o boot chegar.`);
    ok(r.gold && r.gold.length > 0, 'nenhum token de acento resolveu na primeira pintura');
  });
  return s;
}

export function suiteSemRede(r) {
  const s = criarSuite('sem-rede');
  s.teste('o jogo abre com a rede externa desligada', () => {
    ok(r.erros.length === 0, `erro de página com a rede desligada: ${r.erros[0]}`);
    ok(r.pronto,
      `a fase de apostas não abriu sem rede — esperei ${(r.msEspera / 1000).toFixed(1)} s ` +
      `de um teto de 240 s.\n      a espera parou porque: ${r.motivoParada || '(não disse)'}\n` +
      `      Longe do teto e com "Target crashed" ou "closed": foi MEMÓRIA, não ` +
      `tempo — o renderer morreu. Perto do teto: o Monte Carlo não terminou. ` +
      `Nenhum dos dois: o app não abriu mesmo.`);
    ok(r.lutadores === 12, `${r.lutadores} lutadores em cena, esperados 12`);
  });
  s.teste('nenhuma requisição externa é feita', () => {
    ok(r.bloqueadas.length === 0,
      `${r.bloqueadas.length} requisição(ões) saíram para fora mesmo com a cópia local ` +
      `presente. A primeira: ${r.bloqueadas[0]}. A cascata começa no local — se ela ` +
      `sai para a rede com o arquivo em disco, a ordem está invertida.`);
  });
  s.teste('a arte vem do disco, e é a mesma arte', () => {
    ok(r.comFolha > 0, 'nenhum lutador desenhou com folha local');
    ok(r.retratosLocais === r.retratos && r.retratos > 0,
      `${r.retratosLocais} de ${r.retratos} retratos carregaram do disco. ` +
      `Retrato que não carrega é arte faltando, não arte substituída — o resgate ` +
      `busca a MESMA coisa em outro endereço, nunca outra coisa.`);
  });
  return s;
}

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

  /* V1.14 · A ARENA NA TELA É A QUE A RAIZ REPRODUZ.
     Quarta vez que a mesma lição aparece (S30, S53, S65, S69): testar a peça
     não testa o encaixe. `test/arenas.mjs` prova que o sorteio sai do rótulo
     certo; só aqui se prova que o app CHAMOU o sorteio, com o ramo `visual`, e
     que o resultado chegou ao selo. Trocar `S.seeds.visual` por
     `S.seeds.elenco` numa linha de `fases.mjs` continuaria verde em tudo o
     mais. */
  /* D-011 · O NÚMERO NA TELA É O DO MOTOR, E FOI PREENCHIDO DE VERDADE.
   *
   * O teste estático em `test/conteudo.mjs` prova que o número não está
   * REDIGITADO. Prova nenhuma de que ele está ESCRITO: um marcador que ninguém
   * preenche passa naquele teste com louvor e deixa a página com um buraco onde
   * estava a promessa de auditoria. Testar a declaração não testa a peça.
   *
   * Aqui é a peça: quatro marcadores, todos com o valor de `CONF.SIMS`. */
  s.teste('o número de simulações na tela é o que o motor roda', () => {
    /* TRÊS, e não os quatro do HTML: o quarto vive dentro do `#boot`, que é
       removido assim que a primeira rodada fica pronta. Quem conta os quatro é
       o teste estático em `test/conteudo.mjs` — este conta os que sobrevivem
       ao boot, que são os que o jogador lê depois. */
    ok(r.simsNaTela.length >= 3,
      `${r.simsNaTela.length} marcador(es) .sims vivos na página, esperado ao menos 3 ` +
      `(home, como funciona, regras)`);
    const esperado = CONF_SIMS.toLocaleString('pt-BR');
    const vazios = r.simsNaTela.filter(t => !t).length;
    ok(vazios === 0,
      `${vazios} marcador(es) .sims ficaram vazios — preencherSims() não rodou`);
    const errados = r.simsNaTela.filter(t => t !== esperado);
    ok(errados.length === 0,
      `marcador(es) fora de CONF.SIMS (${esperado}): ${[...new Set(errados)].join(' · ')}`);
  });

  /* L-027 · O VÉU ESTÁ NO AR — a peça, não a declaração.
   *
   * O teste em `test/arenas.mjs` prova que o catálogo tem o campo e que o
   * módulo escreve as três propriedades. Nenhum dos dois prova que a camada
   * existe na página com valor diferente de zero: um `#veuArena` esquecido
   * fora do `#arena`, ou um seletor CSS que não casa, passa nos dois. */
  /* L-030 item 9 · O CONTORNO ESTÁ NO SPRITE.
   *
   * A queixa era sobre a variante shiny ter menos contraste contra o piso da
   * cratera. A paleta shiny é arte de terceiro e não se repinta — o que é nosso
   * é a SEPARAÇÃO. Medido, na cratera, com a luta correndo:
   *
   *     mediana de contraste lutador/piso     sem contorno    com contorno
   *     normal                                   1,43:1          1,75:1
   *     shiny                                    1,26:1          1,99:1
   *
   * A medição confirma a queixa (shiny ERA pior que normal) e a inverte: o halo
   * escuro rende mais onde o sprite é mais claro, que é o caso das paletas
   * alternativas. */
  s.teste('o lutador tem contorno que o separa do piso', () => {
    const c = r.contorno;
    ok(c.existe, 'nenhum .mon .body na tela para medir o contorno');
    ok(/drop-shadow/.test(c.filtro),
      `o sprite não tem contorno nenhum (filter "${c.filtro}") — ele vira decalque sobre o piso`);
    /* Duas sombras: o halo colado na silhueta e a sombra de contato. Uma só
       não separa — foi o que existiu até o V1.20, e a 22 px não se via. */
    const quantas = (c.filtro.match(/drop-shadow/g) || []).length;
    ok(quantas >= 2,
      `só ${quantas} sombra(s) no sprite: falta o halo colado na silhueta ou a sombra de contato`);
    const sem = c.amostras.filter(f => !/drop-shadow/.test(f));
    ok(sem.length === 0,
      `${sem.length} lutador(es) sem contorno — algum estado substituiu o filter inteiro ` +
      `em vez de compor com var(--contorno)`);
  });

  s.teste('o véu da arena está aplicado, dentro do teto', () => {
    const v = r.veu;
    ok(v.existe, 'a camada #veuArena não está na página');
    ok(v.alfa > 0, `véu com opacidade ${v.alfa} — declarado e não aplicado é a L-027 de volta`);
    ok(v.alfa <= VEU_MAX + 1e-9,
      `véu com opacidade ${v.alfa}, acima do teto de ${VEU_MAX} — ver o item 9 da L-030`);
    ok(v.mistura !== 'normal',
      `modo de mistura "${v.mistura}": sem mistura o véu TINGE em vez de unificar`);
    ok(v.cliques === 'none', 'o véu está recebendo clique — ele pinta a cena, não interage');
    ok(v.cor && v.cor !== 'rgba(0, 0, 0, 0)',
      `véu sem cor ("${v.cor}") — a arena não passou o `+'`--veuCor`');
  });

  s.teste('a arena anunciada é a que a raiz reproduz', () => {
    ok(r.arenaSeloVisivel,
      'o selo de arena não está no ar na fase de aposta — a arena não dá bônus, não há o que esconder');
    const esperada = sortearArena(r.jogo.visual);
    ok(r.arenaNaTela.includes(esperada.nome),
      `selo mostra "${r.arenaNaTela.trim()}", a raiz reproduz "${esperada.nome}" — ` +
      `o ramo visual não é o usado no sorteio da arena`);
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
  /* ESTE TESTE JULGA A BASE GRAVADA, e não a captura desta execução — por isso
     ele conta contra `LARGURAS_TODAS` e não contra `LARGURAS`. A primeira versão
     usava `LARGURAS`, e na passada estreita ela vale 1: a base de 16 entradas
     era comparada com um esperado de 4 e a suíte ficava vermelha para qualquer
     mutante. É o D-015, e ele inflou um Q2 inteiro. */
  s.teste('a linha de base cobre as telas e larguras declaradas', () => {
    const esperado = 4 * LARGURAS_TODAS.length;
    ok(Object.keys(base).length === esperado,
      `linha de base tem ${Object.keys(base).length} entradas, ` +
      `esperado ${esperado} (4 telas x ${LARGURAS_TODAS.length} larguras)`);
  });

  /* O PORTÃO TEM QUE OLHAR ONDE O ARRANJO TERMINA DE CRESCER (T2).
   *
   * Metade do D-010 era isto: o `.app` para de crescer no `max-width`, e nenhuma
   * largura capturada chegava lá. Mexer numa coluna inteira acima desse ponto
   * movia a digital em média 0,03 — invisível, porque acontecia numa largura que
   * o portão não olhava.
   *
   * O teste lê o `max-width` do CSS de verdade em vez de repetir o número aqui:
   * quem subir o `max-width` amanhã encontra este teste vermelho, e não uma
   * cobertura que calou. */
  s.teste('alguma largura capturada fica acima do max-width do .app', () => {
    const css = readFileSync(new URL('../app/index.html', import.meta.url).pathname, 'utf8');
    const m = css.match(/\.app\s*\{[^}]*max-width:\s*(\d+)px/);
    ok(m, 'não achei o max-width do .app em app/index.html — o teste perdeu a âncora');
    const teto = Number(m[1]);
    const acima = LARGURAS_TODAS.filter(L => L.w > teto);
    ok(acima.length > 0,
      `o .app para de crescer em ${teto}px e a maior largura capturada é ` +
      `${Math.max(...LARGURAS_TODAS.map(L => L.w))}px — o arranjo completo, com as ` +
      `goteiras dos dois lados, não aparece em nenhuma captura (D-010)`);
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

  /* --- V1.15 -------------------------------------------------------------- */

  s.teste('cancelar a aposta devolve o dinheiro E o passivo', () => {
    const c = r.cancelamento;
    ok(c && !c.erro, `não deu para cancelar: ${c?.erro}`);
    ok(!c.apostaViva, 'a aposta continuou viva depois de cancelar');
    igual(c.depoisSaldo, c.antesSaldo + c.valor,
      `o saldo não voltou: ${c.antesSaldo} + ${c.valor} deveria dar ${c.antesSaldo + c.valor}`);
    /* O valor exato do passivo liberado é `valor × odd`, e o teste de unidade
       já afirma a igualdade. Aqui basta provar que a liberação ACONTECEU: o
       modo de falha real é o botão devolver só o dinheiro. */
    ok(c.depoisPassivo < c.antesPassivo,
      `o passivo não foi liberado: continuou em ${c.depoisPassivo} (era ${c.antesPassivo}) — ` +
      `o mercado deste lutador ficaria travado pelo resto da rodada`);
    igual(c.depoisPassivo, 0, 'o passivo do lutador não voltou a zero depois do único ticket ser cancelado');
    igual(c.selecionados, 0, 'a linha do lutador continuou marcada depois de cancelar');
    ok(/cancelada/i.test(c.aviso), `a tela não avisou o cancelamento: "${c.aviso.slice(0, 60)}"`);
  });

  s.teste('o quadro de colocação lista os doze, do 1º ao 12º', () => {
    const p = r.painel;
    ok(p && !p.erro, `não deu para ler o painel: ${p?.erro}`);
    igual(p.colocacaoLinhas, p.lutadores,
      `${p.colocacaoLinhas} linhas de colocação para ${p.lutadores} lutadores`);
    igual(p.colocacaoPos, p.lutadores, 'alguma linha ficou sem posição nem troféu');
  });

  s.teste('o banner de batalha está no ar, com cenário e efeito escolhidos', () => {
    const p = r.painel;
    ok(/\bcn-\w+/.test(p.bannerCena),
      `o banner não tem cenário aplicado (className "${p.bannerCena}")`);
    ok(/\bef-\w+/.test(p.bannerNome),
      `o nome do jogador não tem efeito aplicado (className "${p.bannerNome}")`);
  });

  /* A GARANTIA DO C1, na tela: o painel pode MUDAR a margem, não pode criar uma
     odd secreta. O valor que ele mostra tem de ser o mesmo do registro §4.4.5. */
  s.teste('S102 · a faixa de coluna nomeia o que o número é, na luta', () => {
    const c = (r.colocacaoViva?.colunas || '').toLowerCase();
    ok(c.includes('vida'),
      `a faixa de coluna durante a luta diz "${r.colocacaoViva?.colunas}" e não nomeia ` +
      `a vida. É o lado em que a leitura otimista acontece: quem apostou a 7,1 % ` +
      `e vê 91 % conclui que as chances explodiram.`);
    ok(!c.includes('chance'),
      `a faixa ficou com o texto da fase de aposta durante a luta: "${r.colocacaoViva?.colunas}"`);
  });

  s.teste('D-008 · três cliques de aposta contam UMA aposta', () => {
    const c = r.contagem, v = r.colocacaoViva;
    ok(c && !c.erro, `não deu para exercitar a contagem: ${c?.erro}`);
    ok(v && !v.erro, `não deu para reler o perfil: ${v?.erro}`);
    ok(c.apostaViva, 'os cliques não deixaram aposta viva — o cenário não foi exercitado');
    igual(v.contagemDepois, c.antes + 1,
      `três cliques (escolher + trocar + trocar) contaram ${v.contagemDepois - c.antes} apostas. ` +
      `A aposta só entra na estatística quando a janela FECHA — ver D-008.`);
  });

  /* --- V1.20 · O QUE A TELA AFIRMA COM A APOSTA VIVA ---------------------
   *
   * Seis defeitos deste bloco voltaram PASSOU no Q2 completo porque eu confiei
   * na linha de base, que fotografa quatro telas SEM aposta. Estes são os
   * testes que faltavam. */

  s.teste('S99 · a chamada central reflete a aposta confirmada', () => {
    const a = r.comAposta;
    ok(a && !a.erro, `sem estado de aposta para ler: ${a?.erro}`);
    ok(a.ctaNomeia,
      `com a aposta confirmada a arena ainda diz "${a.cta.trim()}" — instrução que ` +
      `não sai depois de cumprida ensina que a tela não está prestando atenção`);
    ok(a.overlayApostado,
      'o overlay não entrou no estado de aposta feita: o véu continua na frente da luta');
  });

  s.teste('S105 · o contorno sobrevive ao estado do lutador marcado', () => {
    const a = r.comAposta;
    ok(a && !a.erro, `sem estado de aposta para ler: ${a?.erro}`);
    ok(a.filtroDoMeu, 'nenhum .mon.mine na tela — a marcação do meu lutador não aplicou');
    const quantas = (a.filtroDoMeu.match(/drop-shadow/g) || []).length;
    /* Três: o halo, a sombra de contato e o brilho dourado do `.mine`. Duas
       significa que o `filter` do estado substituiu o contorno em vez de
       compor com ele — que é exatamente como ele nasceu ausente. */
    ok(quantas >= 3,
      `o lutador marcado tem ${quantas} sombra(s) (filter "${a.filtroDoMeu}"): o estado ` +
      `.mine substituiu o contorno em vez de compor com var(--contorno)`);
  });

  s.teste('S107 · nenhuma anotação em reais em cima do PokéCash', () => {
    const a = r.comAposta;
    ok(a && !a.erro, `sem estado de aposta para ler: ${a?.erro}`);
    const onde = [
      ['aviso da aposta', a.textoDaAposta],
      ['fichas', a.textoDasFichas],
      ['saldo na faixa', a.saldoNaFaixa],
    ].filter(([, t]) => /R\$/.test(t));
    ok(onde.length === 0,
      `${onde.map(([n]) => n).join(', ')} voltaram a anotar em reais. ` +
      `A taxa fixa de 10 PC = R$ 1,00 faz a PERDA ser sentida em reais, que é o ` +
      `que uma moeda simulada não deveria conseguir fazer (§P1, cap. 28). ` +
      `Decisão do dono do projeto no V1.20.`);
  });

  s.teste('S101 · a faixa de coluna nomeia o que o número é, na aposta', () => {
    const c = (r.colunasAposta || '').toLowerCase();
    ok(c.includes('chance'),
      `a faixa de coluna na fase de aposta diz "${r.colunasAposta}" e não nomeia a ` +
      `chance — o mesmo slot mostra 17,5 % (chance) e 91 % (vida) em fases ` +
      `diferentes, e sem rótulo os dois se leem como a mesma grandeza`);
    ok(c.includes('odd'), `a faixa não nomeia a odd: "${r.colunasAposta}"`);
  });

  s.teste('a colocação está viva durante a luta, não só correta no fim', () => {
    const v = r.colocacaoViva;
    ok(v && !v.erro, `não deu para ler a colocação viva: ${v?.erro}`);
    igual(v.linhas, 12, `${v.linhas} linhas no quadro durante a luta`);
    ok(r.houveQueda, 'nenhuma queda em 45 s de luta — o cenário não foi exercitado');
    ok(v.mortos > 0, `a espera acusou queda mas ${v.mortos} lutadores estão caídos`);
    /* A CONVERGÊNCIA É A PRÓPRIA CONDIÇÃO DA SONDA: ela só devolve instantâneo
       quando o quadro e o estado batem, no mesmo tique e ainda em luta. Chegar
       aqui com `v.erro` é o quadro nunca ter alcançado — quadro CONGELADO, que
       é o S89: a ordem de quedas saindo de outro gancho que não o que credita
       o abate. A conferência do fim corrigiria tudo e esconderia isto.

       Por isso não há aqui uma comparação entre `mortos` e `caidosNoQuadro`: a
       versão que comparava lia os dois em momentos diferentes e mediu, por duas
       execuções de portão, o relógio da máquina em vez do produto. */
    igual(v.caidosNoQuadro, v.mortos,
      `a sonda devolveu ${v.mortos} caídos no estado e ${v.caidosNoQuadro} no ` +
      `quadro — ela só devolve quando os dois batem, então isto é a própria ` +
      `sonda quebrada, e não o app`);
  });

  s.teste('o painel de ADM abre e mostra a MESMA margem do registro', () => {
    const p = r.painel;
    ok(p.admAberto, 'o painel de ADM não abriu');
    ok(p.margemRegistro !== null && p.margemRegistro !== undefined,
      'a rodada não tem margem no registro do §4.4.5');
    const esperado = (p.margemRegistro * 100).toFixed(2) + '%';
    ok(p.admMargem.includes(esperado),
      `o painel não mostra a margem da rodada (${esperado}). Mostrou: ${p.admMargem}`);
  });

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
  s.teste('trocar o tema muda o site, e a mudança chega à tela', () => {
    const t = r.tema;
    ok(t && !t.erro, `não deu para exercitar a troca de tema: ${t?.erro}`);
    ok(t.quantos >= 2, 'há menos de dois temas — não há o que trocar');
    for (const tok of ['gold', 'goldRGB', 'bg', 'line'])
      ok(t.antes[tok] !== t.depois[tok],
        `o token --${tok} não mudou ao trocar de tema: "${t.antes[tok]}" nos dois`);
    ok(t.antes.naTela && t.antes.naTela !== t.depois.naTela,
      `o token muda mas a cor que chega ao elemento não: "${t.antes.naTela}" nos dois. ` +
      `Token que não chega à tela é token decorativo.`);
    ok(t.guardado === 'shadow', `o tema escolhido não foi guardado (ar_tema = ${t.guardado})`);
    ok(t.atributo, 'o <html> ficou sem data-tema depois da troca');
  });

  s.teste('o corte por teto de payout aparece na tela', () => {
    const c = r.corte;
    ok(c && !c.erro, `não deu para exercitar o corte: ${c?.erro}`);
    ok(c.apostado === c.stakeMax,
      `pedi ${c.pedido} e o app confirmou ${c.apostado}; o stake máximo é ${c.stakeMax}. ` +
      `O corte tem que acontecer ANTES de confirmar (§4.4.6).`);
    ok(c.aviso.length > 0,
      'a aposta foi cortada e nenhum aviso apareceu — rejeição silenciosa reprova o bloco');
    ok(c.aviso.includes(c.stakeMax.toLocaleString('pt-BR')) || c.aviso.includes(String(c.stakeMax)),
      `o aviso não diz quanto cabe (${c.stakeMax}): "${c.aviso}"`);
    ok(/payout|retorno/i.test(c.aviso), `o aviso não diz por quê: "${c.aviso}"`);
  });

  s.teste('a lista de apostas mostra o stake máximo antes da aposta', () => {
    const c = r.corte;
    ok(c && !c.erro, `sem dados de corte: ${c?.erro}`);
    ok(c.limiteNaLista.length > 0,
      'a linha do lutador não mostra limite nenhum — o §4.4.6 pede o stake máximo à vista');
    /* "até" saiu no V1.20: lido depressa, "até 9.505" é o teto do que se GANHA,
       e o §4.4.6 limita o que se APOSTA. O teste pede a ideia, não a palavra —
       mas pede um número junto, senão "stake máx" sozinho passaria. */
    ok(/(stake|limite|máx|fechado)/i.test(c.limiteNaLista),
      `a linha mostra "${c.limiteNaLista}", que não comunica limite nem fechamento`);
    ok(/fechado/i.test(c.limiteNaLista) || /\d/.test(c.limiteNaLista),
      `a linha mostra "${c.limiteNaLista}" sem valor — rótulo de limite sem número não é limite`);
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
