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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer, request as httpRequest } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, sep } from 'node:path';
import { criarSuite, igual, ok } from './harness.mjs';
import { criarDigital } from '../engine/rodada-digital.mjs';
import packEscolhido from '../content/escolhido.mjs';
const { digital: digitalNode, rodada: rodadaNode } = criarDigital(packEscolhido);
import { VEU_MAX, sortearArena } from '../app/modules/arenas-dados.mjs';
import { CONF as MOTOR_CONF } from '../engine/engine.mjs';
const CONF_SIMS = MOTOR_CONF.SIMS;

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/* ONDE O NAVEGADOR MORA — configurável, com o padrão de sempre (R0).
 *
 * Os dois eram literais POSIX. Numa máquina onde eles não existem,
 * `disponivel()` devolve `false`, as suítes de navegador nem são montadas, e o
 * Q5 fica INERTE com relatório verde. As variáveis existem para APONTAR uma
 * instalação, nunca para dispensá-la: sem nada definido, o valor é exatamente o
 * de antes, e a máquina de referência responde igual byte a byte. */
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
/* `import()` de caminho ABSOLUTO só funciona por acaso no POSIX, onde ele já
   parece uma URL. No Windows, `C:...` tem `c:` lido como esquema e o
   carregador recusa. `pathToFileURL` é a conversão correta nos dois. */
/* EXPORTADOS porque a suíte do outfit precisa do MESMO navegador e do MESMO
   caminho. Duplicar as duas linhas lá era garantir que um dia elas divergissem
   e a outra suíte pulasse em silêncio. */
export const PW_URL = pathToFileURL(PW).href;
export { CHROME };
/* AS FONTES PRECISAM ESTAR AQUI, e a falta delas foi o `D-037`.
   Este mapa é o que decide o `Content-Type` das capturas. Faltando o tipo de
   uma folha de estilo, o navegador a RECUSA — e o tema inteiro cai para o
   fallback. A linha de base foi gravada assim por três blocos, e o portão Q5
   ficou verde o tempo todo: ele compara a tela com ela mesma, e ela estava
   consistentemente errada.
   O `.ttf` entra junto pelo mesmo motivo, embora navegador seja tolerante com
   MIME de fonte: servir binário como texto genérico é o descuido que causou o
   defeito real. */
const MIME = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript',
               '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
               '.gif':'image/gif', '.mp3':'audio/mpeg',
               '.ttf':'font/ttf', '.woff2':'font/woff2', '.woff':'font/woff' };

export const disponivel = () => existsSync(PW) && existsSync(CHROME);

/* A cópia local dos assets existe? O F0.12 a torna o primeiro candidato da
   cascata; sem ela o jogo continua funcionando pela rede, mas o teste de
   egresso fechado não tem o que provar. */
export const temAssetsLocais = () => existsSync(new URL('../assets', import.meta.url));

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

/* ── ESPERAR A TELA PARAR DE MUDAR (fecha o D-040) ─────────────────────────
 *
 * As tentativas anteriores perguntavam O QUE esperar: a fonte, o GIF, a arte do
 * pseudo-elemento, a arte do filho, as `<img>`. Cada resposta certa reduzia o
 * desvio e nenhuma o zerava, porque sempre sobrava uma coisa a mais — a última
 * foi o escalonamento de um JPEG de fundo, que o navegador refina DEPOIS de já
 * ter pintado uma versão aproximada.
 *
 * Esta função inverte a pergunta: em vez de enumerar as causas, ela mede duas
 * vezes e só aceita quando as duas medidas concordam. É robusta ao que ainda
 * não aconteceu — a próxima arte pesada, a próxima fonte, o próximo efeito.
 *
 * A TOLERÂNCIA DE 1 É ARREDONDAMENTO, e não afrouxamento: o canvas devolve
 * inteiros de 0 a 255, e dois desenhos idênticos podem diferir de uma unidade
 * por conta do próprio arredondamento da redução para 32x32. Exigir igualdade
 * exata faria o laço nunca convergir.
 *
 * O TETO DE TENTATIVAS existe porque tela que nunca estabiliza é informação, e
 * não motivo para pendurar o portão: esgotado o teto, devolve a última medida e
 * a comparação com a linha de base decide. */
const ESTABILIZA_MAX = 6;
const ESTABILIZA_MS = 140;

async function impressaoEstavel(pg) {
  let anterior = await impressao(pg);
  for (let i = 0; i < ESTABILIZA_MAX; i++) {
    await pg.waitForTimeout(ESTABILIZA_MS);
    const agora = await impressao(pg);
    let igual = agora.length === anterior.length;
    if (igual) for (let k = 0; k < agora.length; k++)
      if (Math.abs(agora[k] - anterior[k]) > 1) { igual = false; break; }
    if (igual) return agora;
    anterior = agora;
  }
  return anterior;
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

/* A CHAVE DO AMBIENTE — plataforma e versao MAIOR do Chromium.
   Maior e nao completa: uma correcao de ponto nao mexe em rasterizacao, e
   amarrar a base a 151.0.7922.34 obrigaria a regravar a cada atualizacao. */
export const chaveAmbiente = amb =>
  amb ? `${amb.plataforma}-chromium-${String(amb.chromium).split('.')[0]}` : null;

/* Qual base vale nesta maquina (D-023 da linha anterior).
 *
 * A digital de 32x32 em RGB responde "os pixels mudaram", e pixel de texto
 * muda com o rasterizador. A pergunta util a um bloco — *o que eu mudei mexeu
 * na tela?* — e de UMA maquina, entre duas execucoes. Tratar o arquivo
 * versionado como se ela viajasse foi o erro.
 *
 * SEM CARIMBO resolve para LOCAL: uma base anterior a isto nao diz quem a
 * gravou, e presumir que e daqui produz 16 telas vermelhas com o diagnostico
 * errado. */
export function baseQueVale(baseRef, ambienteRef, baseLocal) {
  const atual = ambienteAtual();
  const mesmo = !!(ambienteRef && atual &&
                   chaveAmbiente(ambienteRef) === chaveAmbiente(atual));
  return mesmo ? { base: baseRef, origem: 'referência' }
               : { base: baseLocal, origem: 'local' };
}

let ambienteDaCaptura = null;
export const ambienteAtual = () => ambienteDaCaptura;

export async function capturarBase() {
  const { chromium } = await import(PW_URL);
  const { s, porta } = await servidor();
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  ambienteDaCaptura = { chromium: b.version(), plataforma: process.platform };
  const saida = {};
  for (const L of LARGURAS) {
    /* ── MOVIMENTO REDUZIDO NA CAPTURA, E NÃO É PREFERÊNCIA: É DETERMINISMO ──
     *
     * O R7 devolveu à tela de entrada o letrado com o pulso lento do neon
     * (`letrPulsa`, 3,4 s) e a arte de fundo com a deriva (`heroDrift`, 26 s).
     * Duas capturas da MESMA página passam a diferir pelo instante em que o
     * obturador abriu — medido: a região do letrado saía com pico 30 entre
     * execuções, e a linha de base ficava vermelha logo depois de ser gravada.
     *
     * Linha de base que depende do relógio não é linha de base; é sorte. É a
     * mesma lição que já está escrita algumas linhas abaixo, sobre esperar
     * ESTADO em vez de tempo.
     *
     * `reducedMotion:'reduce'` não é um remendo do portão: o app JÁ trata essa
     * preferência, e o bloco `@media (prefers-reduced-motion: reduce)` lista
     * exatamente estas peças. Capturar assim mede o mesmo layout, as mesmas
     * cores e o mesmo texto — só sem os laços que rodam para sempre —, e de
     * quebra o caminho de acessibilidade passa a ser exercitado a cada execução
     * em vez de nunca.
     *
     * O que ele NÃO pega: mudança de animação. O portão nunca pegou isso de
     * forma estável, e fingir que pega era o que produzia o vermelho aleatório. */
    const pg = await (await b.newContext({
      viewport: { width: L.w, height: L.h },
      reducedMotion: 'reduce',
    })).newPage();
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
    /* ── CONGELAR OS GIFs ANTES DE FOTOGRAFAR (fecha o D-033) ─────────────
     *
     * Os retratos da lista de lutadores são GIFs ANIMADOS, e o quadro que um
     * GIF exibe depende do TEMPO DE PAREDE desde que ele começou. Fotografar
     * isso é fotografar um relógio: a linha de base ficava verde quando a
     * máquina, por acaso, caía no mesmo quadro — e vermelha quando não caía.
     * `reducedMotion:'reduce'` não congela GIF: ele não é animação de CSS.
     *
     * A troca é pela MESMA imagem parada, do mesmo pack: o `<img>` já declara
     * o PNG do dex como sua própria cascata de resgate. Não é arte de outra
     * fonte — é a mesma coisa, sem o relógio.
     *
     * O que o portão continua guardando: layout, cor, presença e tamanho dos
     * retratos. O que ele deixa de guardar é em que quadro da animação a
     * máquina estava, que nunca foi informação sobre a interface. */
    const congelarGifs = () => pg.evaluate(async () => {
      /* O ESPELHO LOCAL PRIMEIRO, e a primeira versão disto errou nisso.
         Ela apontava direto para o endereço REMOTO do PNG. Sozinha a máquina
         buscava e desenhava; sob as quatro caixas de areia do portão Q2, a
         busca às vezes falhava, o `error` escondia o retrato, e a foto saía
         diferente — trocando uma instabilidade de relógio por uma de rede.
         `candidatos` é a mesma cascata que o app usa: cópia local, depois a
         origem. É o que o F0.12 construiu para o jogo abrir sem rede, e vale
         igual para a captura. */
      const { candidatos } = await import('/app/modules/assets.mjs');
      const gifs = [...document.images].filter(i => /\.gif(\?|$)/i.test(i.currentSrc || i.src));
      await Promise.all(gifs.map(img => {
        const dex = (img.src.match(/(\d+)\.gif/) || [])[1];
        if (!dex) { img.style.visibility = 'hidden'; return; }
        const lista = candidatos(
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`,
          null, '/');
        return new Promise(pronto => {
          let i = 0;
          img.addEventListener('load', pronto, { once: true });
          /* Cai para o próximo candidato; esgotados, esconde. Esconder é o
             último recurso, e ele é DETERMINÍSTICO — some igual toda vez. */
          img.onerror = () => {
            if (++i < lista.length) { img.src = lista[i]; return; }
            img.style.visibility = 'hidden'; pronto();
          };
          img.src = lista[0];
        });
      }));
    });

    /* ── ESPERAR A ARTE DE FUNDO DECODIFICAR ──────────────────────────────
     *
     * O `#viewArena::before` carrega o Rayquaza de 2816×1105 (R17). Sozinha, a
     * máquina o decodifica bem dentro dos 700 ms; com as quatro caixas de areia
     * do portão Q2 disputando CPU, não — e a `arena@largo` saía com a região do
     * fundo fora da linha de base.
     *
     * Isto foi diagnosticado no R20 e REVERTIDO lá, porque acrescentar a espera
     * mudava a foto e eu não podia regravar dentro daquele bloco. Hoje as duas
     * condições mudaram: os GIFs estão congelados, então a foto não depende mais
     * do relógio, e a regravação é parte declarada deste bloco.
     *
     * Imagem de pseudo-elemento não tem evento de carga observável, então a
     * condição é reconstruída: lê-se a `url()` do estilo computado e espera-se o
     * `decode()` da mesma imagem, que o cache do navegador já terá. */
    const esperarArte = sel => pg.evaluate(async (s) => {
      const raiz = document.querySelector(s);
      if (!raiz) return;
      /* ── A VISTA E TUDO DENTRO DELA (D-040) ─────────────────────────────
       *
       * A primeira versão olhava só o elemento da vista e seus pseudo-elementos.
       * Faltava o que mais pesa: o CENÁRIO DO BANNER DE BATALHA (`.bnCena`), que
       * é filho, e carrega um JPEG grande por `background: cover`.
       *
       * Foi exatamente ele. A região que fazia o portão abortar — `arena@largo`
       * 1,5 — é onde o banner fica, medido por `elementFromPoint`, e as duas
       * capturas recortadas lado a lado são indistinguíveis a olho: a diferença
       * está no ESCALONAMENTO do JPEG, que depende de quanto dele já havia sido
       * decodificado quando o navegador compôs o quadro.
       *
       * Sozinha, a máquina decodifica antes de a foto sair. Sob as cinco caixas
       * do portão, nem sempre — e é por isso que o sintoma nunca aparecia fora
       * dele. */
      const urls = [];
      const alvos = [raiz, ...raiz.querySelectorAll('*')];
      for (const el of alvos)
        for (const pseudo of [null, '::before', '::after']) {
          const bg = getComputedStyle(el, pseudo).backgroundImage || '';
          for (const m of bg.matchAll(/url\((["']?)(.*?)\1\)/g)) urls.push(m[2]);
        }
      /* `catch` engolindo a falha de propósito: arte que não carrega é problema
         de outro portão, e travar aqui trocaria uma foto fora da linha de base
         por um tempo esgotado — que diz menos. */
      await Promise.all(urls.map(u => {
        const img = new Image(); img.src = u;
        return img.decode().catch(() => {});
      }));
    }, sel);

    const SELETOR = { inicio: '#viewHome', arena: '#viewArena',
                      regras: '#viewRules', comofunciona: '#viewHow' };

    /* ── UM AQUECIMENTO, UMA VEZ, ANTES DO LAÇO (D-040) ────────────────────
     *
     * `impressao` desenha a tela num canvas e lê os pixels. A PRIMEIRA vez que
     * isso acontece numa página, o navegador ainda está compondo camadas e
     * decodificando o que entrou por último — e o resultado depende de quanto o
     * disco estava ocupado naquele instante. O portão Q2 cria CINCO cópias do
     * repositório logo antes de medir, então a captura pegava o cache revirado.
     *
     * UMA VEZ, E NÃO POR TELA, e a diferença custou uma medição para aparecer:
     * a primeira versão aquecia antes de cada uma das quatro telas. O tempo
     * extra empurrou a captura para perto do fim da fase de aposta, e a
     * `arena@medio` passou a sair ora em aposta, ora já na contagem — dois
     * estados discretos, com o `3` no centro-superior valendo pico 83 na
     * região 4,1. Trocar uma instabilidade por outra não é conserto.
     *
     * O caminho do canvas é o mesmo para as quatro telas: aquecê-lo uma vez
     * basta, e devolve o tempo que a fase de aposta precisa. */
    await impressao(pg);

    for (const [nome, ir] of Object.entries(telas)) {
      await ir(); await pg.waitForTimeout(700);
      await esperarArte(SELETOR[nome]).catch(() => {});
      await congelarGifs().catch(() => {});
      /* ── E AS `<img>` COMUNS TAMBÉM (D-040) ────────────────────────────
       *
       * `esperarArte` cuida das imagens de FUNDO, e `congelarGifs` das
       * animadas. Faltava a maioria: as `<img>` estáticas — o retrato do
       * banner de batalha, o avatar, os ícones.
       *
       * Foi o que sobrou do D-040 depois de nove hipóteses descartadas. A
       * região que falhava — `arena@largo` 1,5 — é EXATAMENTE onde o banner
       * fica: `.bnMon`, `.bnNome`, `.bnNv`, `.bnVeu`, `.bnTopo`, medido com
       * `elementFromPoint`. O retrato dele resolve por cascata (cópia local,
       * depois a origem), e sob a carga da caixa de areia ele pintava DEPOIS
       * da foto. Sozinha, a máquina pintava antes — e é por isso que o
       * sintoma nunca aparecia fora do portão.
       *
       * `decode()` em imagem já carregada resolve na hora; o `catch` cobre a
       * que falhou, que é problema de outro portão. */
      /* ── E ESTA ESPERA TEM PRAZO, PORQUE UMA VEZ ELA NÃO TEVE (D-069) ──
       *
       * `decode()` de uma imagem PENDENTE não resolve nem rejeita — ela só
       * fica. O `catch` acima cobre rejeição, e rejeição é o caso que não
       * acontece. `Promise.all` então nunca assenta, `pg.evaluate` não tem
       * teto, e a suíte inteira para: medido em 300 s sem uma linha de saída,
       * com o Chromium vivo e ocioso.
       *
       * O gatilho foi `loading="lazy"` nas fichas de aposta: imagem preguiçosa
       * numa vista escondida nunca entra na fila do navegador, então fica
       * `complete === false` para sempre. Isso é defeito do app e está em
       * D-068 — mas o arnês não pode depender de o app nunca ter uma imagem
       * pendente. É a mesma frase que o D-023 já deixou escrita algumas linhas
       * acima, e ela volta inteira:
       *
       *     portão que não termina não julga nada.
       *
       * Cinco segundos: mais que o suficiente para decodificar o que já
       * chegou, e curto o bastante para não esconder um travamento. Perder a
       * espera custa, no pior caso, uma foto fora da linha de base — que é um
       * vermelho com endereço. Travar custa a execução inteira. */
      await pg.evaluate(() => {
        const pendentes = [...document.images]
          .filter(i => i.src && !i.complete)
          .map(i => i.decode().catch(() => {}));
        return Promise.race([
          Promise.all(pendentes),
          new Promise(r => setTimeout(r, 5000)),
        ]);
      }).catch(() => {});
      await pg.waitForTimeout(120);
      /* ── DEPURAÇÃO DO D-040, LIGADA POR AMBIENTE ──────────────────────
       *
       * O defeito só aparece DENTRO da caixa de areia do portão, e todas as
       * medições até aqui compararam NÚMEROS de impressão digital. Ninguém
       * olhou as duas imagens.
       *
       * Com `DEPURAR_VISUAL` apontando para uma pasta, cada captura vira
       * também um PNG. A caixa herda o ambiente de quem chamou o portão, então
       * basta exportar a variável para ter as fotos de dentro dela.
       *
       * Fica no código, e não num remendo temporário: o próximo defeito de
       * linha de base vai querer exatamente isto, e reinventá-lo custa o que
       * este custou. */
      /* ── O RELÓGIO DA RODADA, FIXADO (D-040) ──────────────────────────
       *
       * A última instabilidade da linha de base não era arte nem animação: era
       * o RELÓGIO. A fase de aposta vira contagem quando
       * `CONF.BET_WINDOW - S.clock <= 0`, e a captura caía ora de um lado da
       * fronteira, ora do outro — dois estados discretos, com o `3` do centro
       * superior valendo pico 62 na região 4,1 do `arena@medio`.
       *
       * Nenhuma espera resolve isso, porque não há o que esperar: quanto mais
       * cedo a foto sai, mais perto do começo da janela ela cai, e qualquer
       * mudança de custo em outro lugar do arnês desloca a fronteira de novo.
       * Foi o que aconteceu quando o aquecimento do canvas mudou de lugar, e
       * de novo quando o reset de movimento reduzido entrou.
       *
       * Fixar é a única forma de a foto não depender de quando ela foi tirada.
       * O valor é longe das duas bordas da janela e tem meio segundo de folga
       * até o próximo segundo inteiro, para que a deriva durante a própria
       * digital não vire outro dígito na tela.
       *
       * O que o portão continua guardando: que a arena desenha a fase de
       * aposta, com a lista, as odds e os controles. O que ele deixa de
       * guardar é em que segundo a máquina estava — que nunca foi informação
       * sobre a interface, exatamente como no D-033 com os GIFs. */
      await pg.evaluate(async () => {
        const { S } = await import('/app/modules/estado.mjs');
        if (S.state === 'betting') S.clock = 6.5;
      }).catch(() => {});

      /* ── AS ANIMAÇÕES SÃO CONCLUÍDAS ANTES DA DIGITAL (R32) ────────────
       *
       * O determinismo mora AQUI, e não no CSS do produto. O R30 tentou
       * resolvê-lo com `animation-duration:.01ms` dentro do
       * `prefers-reduced-motion` do `index.html`, e aquilo quebrou todo aviso
       * que some sozinho: o `forwards` segurava o quadro 100%, que é o estado
       * escondido. Determinismo é problema de quem MEDE.
       *
       * `finish()` e não `pause()` em tempo zero: rebobinar levaria as
       * animações de ENTRADA de volta ao quadro 0%, que costuma ser
       * `opacity:0` — a foto perderia elementos que na tela estão visíveis há
       * segundos. Concluir leva cada uma ao estado em que ela repousa, que é o
       * que um olho humano vê depois de esperar.
       *
       * O `catch` cobre animação de duração infinita, que `finish()` recusa; o
       * produto não deve ter nenhuma sob movimento reduzido, e se tiver, o
       * lugar de reclamar é o teste de acessibilidade, não a foto. */
      /* ── DUAS VEZES, E A SEGUNDA É DEPOIS DA ESPERA (D-078) ─────────────
       *
       * Concluir uma vez não bastava, e a instabilidade que sobrou custou o
       * Q2 de um bloco inteiro: `arena@estreito` divergia na região do banner
       * em uma execução a cada três, com o repositório INTOCADO.
       *
       * A causa é de ordem, não de cobertura. `getAnimations()` só enxerga o
       * que já existe: o banner é desenhado por JavaScript, e a varredura da
       * cena (`cnVarre`, 7 s) nasce quando a classe `cn-*` é aplicada ao
       * elemento. Se isso acontece nos 60 ms de espera — e acontece, porque a
       * espera existe justamente para dar tempo ao que ainda vai aparecer —, a
       * animação nasce DEPOIS do `finish()` e corre livre durante a foto.
       *
       *   > Concluir antes de esperar conclui o que já estava lá. O que a
       *   > espera trouxe fica de fora, e é justamente ele que ainda se move.
       *
       * A primeira chamada continua valendo: ela estabiliza o que está em
       * curso ANTES da espera, e é o que impede a espera de acontecer com a
       * tela em movimento. A segunda pega o que chegou.
       *
       * Continua sendo problema de quem MEDE, e não do produto — é a mesma
       * divisão que o R32 estabeleceu ao tirar o `animation-duration:.01ms` do
       * `index.html`, que quebrava todo aviso que some sozinho. */
      const concluirAnimacoes = () => pg.evaluate(() => {
        for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
      }).catch(() => {});

      await concluirAnimacoes();
      await pg.waitForTimeout(60);
      await concluirAnimacoes();
      saida[`${nome}@${L.nome}`] = await impressaoEstavel(pg);
      /* DEPOIS DA DIGITAL, E NÃO ANTES. A primeira versão fotografava primeiro,
         e o tempo do `screenshot` deslocava a captura o bastante para a linha
         de base sair vermelha até FORA da caixa — a instrumentação alterando o
         que ela existe para medir. Depois, ela não interfere em nada. */
      if (process.env.DEPURAR_VISUAL) {
        const { mkdirSync } = await import('node:fs');
        const dir = process.env.DEPURAR_VISUAL;
        try {
          mkdirSync(dir, { recursive: true });
          await pg.screenshot({ path: join(dir, `${nome}@${L.nome}.png`) });
        } catch {}
      }
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
  const { chromium } = await import(PW_URL);
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
  const { chromium } = await import(PW_URL);
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
  /* O portão passou a CONTAR o efeito do `filter` sobre a cor (R19). A conta
     mora num módulo puro, testado em `test/filtro-cor.mjs`; aqui só se colhe a
     cadeia do DOM e se aplica. Ler o pixel exigiria decodificar PNG — e o
     projeto não tem dependência, nem vai ter. */
  const st = await pg.evaluate(async () => {
    const filtro = await import('/app/modules/filtro-cor.mjs');
    return ({
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
        /* ENTRA COM O R19, e só pôde entrar agora. A barra de vida do derrotado
           é `filter:grayscale(1) brightness(.62)`, e enquanto o portão media a
           cor DECLARADA ele devolveria um número que não é o da tela. O R6
           deixou este alvo de fora de propósito e registrou a `L-045`. */
        { sel:'.plate.dead .nm', nome:'nome do lutador derrotado na barra de vida' },
      ];

      /* AS CADEIAS DE `filter` DO ELEMENTO ATÉ A RAIZ (R19, fecha a L-045).
       *
       * `filter` não herda, mas COMPÕE: um filtro num ancestral vale para tudo
       * que está dentro. A ordem é do mais DISTANTE para o mais próximo, que é
       * a ordem em que o navegador pinta — daí o `unshift`.
       *
       * Ele se aplica ao elemento inteiro, então frente e fundo passam pela
       * MESMA cadeia. Aplicar só a um dos dois daria uma razão que não existe. */
      const cadeiaDe = el => {
        const cadeias = [];
        for (let n = el; n && n.nodeType === 1; n = n.parentElement)
          cadeias.unshift(getComputedStyle(n).filter);
        return cadeias;
      };

      /* O DERROTADO PRECISA EXISTIR PARA SER MEDIDO.
       *
       * `.plate.dead` só aparece com alguém nocauteado, e esta sonda roda na
       * fase de APOSTA. Sem isto, o alvo novo seria pulado em silêncio pelo
       * `continue` abaixo — e eu teria construído a conta do filtro sem
       * conseguir medir nada com ela, que é o mesmo "declarado e desarmado" que
       * este trabalho já encontrou três vezes.
       *
       * A marca é posta, medida e RETIRADA: as sondas seguintes usam a mesma
       * página, e um lutador morto que ninguém matou confundiria qualquer uma
       * delas. */
      const placa = document.querySelector('.plate');
      const jaMorta = placa?.classList.contains('dead');
      if (placa && !jaMorta) placa.classList.add('dead');

      const out = [];
      for (const a of ALVOS){
        const el = document.querySelector(a.sel);
        if (!el) continue;
        const cs = getComputedStyle(el);
        const f = cor(cs.color); if (!f) continue;
        const fundoCru = fundoDe(el);
        const frenteCrua = f.a >= 1 ? [f.r, f.g, f.b] : sobre([f.r, f.g, f.b, f.a], fundoCru);
        /* A COMPOSIÇÃO POR ALFA VEM ANTES DO FILTRO, e a ordem é a do
           navegador: ele pinta o elemento (misturando o alfa com o que está
           atrás) e filtra o resultado. Filtrar antes de compor daria outro
           número. */
        const cadeia = filtro.filtroAcumulado(cadeiaDe(el));
        const frente = filtro.aplicarFiltro(frenteCrua, cadeia);
        const fundo  = filtro.aplicarFiltro(fundoCru, cadeia);
        const px = parseFloat(cs.fontSize);
        const peso = parseInt(cs.fontWeight, 10) || 400;
        out.push({ nome:a.nome, frente, fundo, px,
          grande: px >= 18.66 || (px >= 14 && peso >= 700),
          amostra: (el.textContent || '').trim().slice(0, 60) });
      }
      if (placa && !jaMorta) placa.classList.remove('dead');
      return out;
    })(),
  })});
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
    /* ── APOSTAR AGORA SÃO DOIS GESTOS (L-112, bloco 1.27) ──────────────
       O clique no lutador ESCOLHE; quem aposta é o ✓ verde. A sonda tem de
       percorrer o caminho do jogador, e o caminho mudou.

       E o fato de ela ter reprovado nove afirmações quando a confirmação
       entrou é a prova de que a confirmação está NO CAMINHO, e não ao lado
       dele — a mesma prova que o envio da expedição deu no 1.24. */
    const apostarNo = async linha => {
      if (!linha) return false;
      const pausa = ms => new Promise(r => setTimeout(r, ms));
      linha.click();
      await pausa(220);
      const ok = document.querySelector('#btnConfirmarAposta');
      if (ok) { ok.click(); await pausa(320); }
      return !!ok;
    };
    const linha = document.querySelector(`.pick[data-i="${azarao.idx}"]`);
    if (!linha) return { erro: 'lista de apostas sem o azarão' };
    await apostarNo(linha);
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
    /* DESENHAR e ABRIR são coisas diferentes desde o R9, e a sonda pergunta as
       duas separadamente.
       `admRender` só desenha — é dele que sai o que o painel MOSTRA, e a
       pergunta original continua sendo se ele mostra a mesma margem do registro
       do §4.4.5, em vez de uma segunda contagem.
       `admAbrir` agora consulta o servidor, e aqui NÃO HÁ SERVIDOR: esta caixa
       serve arquivos estáticos. Ele tem de recusar, e isso virou a asserção de
       Q6 do bloco — o caminho local com PIN não pode voltar por porta nenhuma. */
    adm.admRender();
    const linhas = [...document.querySelectorAll('#admMargem .admLinha')].map(l => l.textContent);

    /* Sem `await`: sem servidor, `admAbrir` termina num `avisar()`, cuja
       promessa só resolve quando alguém clica. Esperar aqui travaria a sonda. */
    adm.admAbrir();
    await new Promise(res => setTimeout(res, 150));
    const admAbriuSemServidor = document.querySelector('#viewAdm')?.classList.contains('on') ?? false;
    /* O aviso é um `.modal-backdrop` acrescentado ao `body`; deixá-lo aberto
       apareceria na captura seguinte como uma tela de erro. */
    for (const m of document.querySelectorAll('body > .modal-backdrop.show'))
      if (!m.id) m.remove();
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
      admAbriuSemServidor,
      admMargem: linhas.join(' | '),
      margemRegistro: S.odds ? S.odds.margemConfigurada : null,
      lutadores: S.fighters.length,
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));
  await pg.evaluate(() => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.querySelector('#viewArena')?.classList.add('on');
  });

  /* --- Q5 do R11: A ARENA MANTÉM A PROPORÇÃO QUE DECLARA -----------------
   *
   * Relato do dono do projeto: "a tela da arena, meio que distorcida, não
   * parece estar ampliada corretamente — as pokébolas antes de abrir estão
   * horríveis". Medido, e eram duas declarações brigando:
   *
   *     #arena{ aspect-ratio:3/4 }                  declara 3:4
   *     #arena{ max-height:min(72vh,760px) }        e o teto vencia
   *
   *     com    o teto    373,1 × 369,8   razão 1,009
   *     sem    o teto    373,1 × 497,4   razão 0,750  ← a declarada
   *
   * O canvas é `width:100%;height:100%`, então preenchia a caixa deformada e
   * esticava +34% na horizontal. Círculo virava elipse — as pokébolas ovais.
   *
   * ISTO SE MEDE, NÃO SE LÊ. A razão sai de `getBoundingClientRect`, nas
   * QUATRO larguras do portão, redimensionando a MESMA página — subir outro
   * navegador aqui custaria minutos a cada avaliação do Q2, e o portão roda a
   * suíte centenas de vezes.
   */
  const arena = [];
  for (const L of LARGURAS) {
    await pg.setViewportSize({ width: L.w, height: L.h });
    await pg.waitForTimeout(120);
    arena.push(await pg.evaluate(nome => {
      const a = document.querySelector('#arena');
      if (!a) return { nome, erro: 'sem #arena' };
      const r = a.getBoundingClientRect();
      const cv = document.querySelector('#mapCanvas');
      return { nome, w: r.width, h: r.height,
               razao: r.height > 0 ? r.width / r.height : 0,
               /* O segundo defeito: o buffer é fixo e aparece noutro tamanho.
                  Ampliação não inteira com `pixelated` produz colunas de pixel
                  de larguras diferentes — o serrilhado irregular. */
               bufW: cv?.width ?? 0, telaW: cv?.getBoundingClientRect().width ?? 0 };
    }, L.nome));
  }
  await pg.setViewportSize({ width: LARGURAS[0].w, height: LARGURAS[0].h });
  await pg.waitForTimeout(120);

  /* ── A CENA DA ROTA LÊ A CAIXA, E NUNCA A IMPÕE (S592) ───────────────────
   *
   * Último defeito plantado que nenhuma afirmação pegava — o `S592` troca
   * `palco.getBoundingClientRect()` por uma caixa cravada de 960×560. Com ela,
   * a cena fica certa numa largura e errada em todas as outras, e a alça de
   * redimensionar que o dono pediu deixa de fazer efeito nenhum.
   *
   * Ele sobreviveu porque a conta que consome a caixa é pura e testada
   * (`viewport.mjs`), e a LEITURA da caixa não é: só o navegador sabe quanto o
   * palco mede. Por isso a medição entra aqui, no mesmo laço de larguras que já
   * mede a arena — subir outro navegador custaria minutos a cada avaliação do
   * Q2, e o portão roda a suíte centenas de vezes.
   *
   * A afirmação é sobre a PROPORÇÃO, e não sobre o tamanho: o canvas é a janela
   * de mundo, e a janela acompanha a caixa. Caixa imposta descola as duas, e a
   * imagem estica — que é literalmente a queixa do dono, *"ficou muito
   * esticadona"*, chegando pelo outro lado.
   */

  const idle = [];
  /* A TROCA DE ABA É PELO BOTÃO **E** PELA CLASSE, e as duas são necessárias.
     Só a classe: a cena nunca monta, porque quem a monta é o gancho do botão.
     Só o botão: nesta caixa o clique nem sempre chega — foi assim que a
     primeira versão mediu o palco em 0x0 e reprovou com o canvas no tamanho
     de fábrica, 300x150, dizendo que a cena não lia a caixa quando na verdade
     ela nem existia. Erro de sonda lido como erro de produto. */
  await pg.evaluate(() => {
    document.querySelector('.nav[data-view="viewIdle"]')?.click();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.querySelector('#viewIdle')?.classList.add('on');
    /* A CENA SÓ EXISTE DEPOIS DA CRIATURA INICIAL, e isto não é detalhe de
       arnês: `#viewIdle.primeiraVez .idleDepois{display:none}` é a regra do
       produto — sem inicial não há expedição, sem expedição não há encontro,
       e sem encontro não há primeira criatura. A caixa do portão abre com
       estado zerado, então o palco media 0x0 e o canvas ficava no tamanho de
       fábrica (300x150). A primeira versão desta medição leu isso como "a cena
       não lê a caixa" — erro de sonda vestido de erro de produto.

       A escolha é pelo CLIQUE de verdade, e não por injetar estado: assim a
       medição atravessa o mesmo caminho do jogador. Ela vem num `evaluate`
       SEPARADO, e isso é obrigatório: os botões de inicial só existem depois
       de a aba renderizar, e no mesmo tique da troca de classe eles ainda não
       estão no DOM — a versão anterior clicava no nada e seguia em frente. */
  });
  await pg.waitForFunction(
    () => document.querySelectorAll('#viewIdle [data-dex]').length > 0,
    { timeout: 25000, polling: 150 }).catch(() => {});
  await pg.evaluate(() => document.querySelector('#viewIdle [data-dex]')?.click());
  const idlePronto = await pg.waitForFunction(
    () => (document.querySelector('#idlePalco')?.getBoundingClientRect().width ?? 0) > 50,
    { timeout: 25000, polling: 200 }).then(() => true).catch(() => false);

  /* ── A ESPERA É PELO ESTADO ASSENTAR, E NÃO POR RELÓGIO ────────────────
   *
   * A primeira versão dormia 360 ms depois de cada `setViewportSize`. Na minha
   * máquina, sozinha, sobrava tempo. Dentro do Q2 — quatro caixas de areia
   * disputando CPU — não sobrava, e a sabotagem ABORTOU pela guarda do D-015:
   * "a suíte já está vermelha na configuração de julgamento, sem defeito
   * plantado". Vermelho intermitente é pior que vermelho constante — o
   * constante tem endereço, o intermitente escolhe quando aparecer.
   *
   * Espera até DUAS leituras seguidas concordarem: o `ResizeObserver` da cena
   * redimensiona o canvas no quadro seguinte ao do layout, então duas leituras
   * iguais provam que o quadro já passou. Sem relógio nenhum na conta. */
  const medirIdle = async nome => pg.evaluate(async nomeI => {
    const ler = () => {
      const palco = document.querySelector('#idlePalco');
      const cv = document.querySelector('#idleMundo');
      if (!palco || !cv) return null;
      const r = palco.getBoundingClientRect();
      return { caixaW: r.width, caixaH: r.height, cvW: cv.width, cvH: cv.height };
    };
    let ant = null;
    for (let i = 0; i < 90; i++) {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));
      const a = ler();
      if (!a) return { nome: nomeI, erro: 'sem #idlePalco ou #idleMundo' };
      if (ant && a.caixaW > 50 && a.cvW === ant.cvW && a.cvH === ant.cvH
          && Math.abs(a.caixaW - ant.caixaW) < 0.6) {
        return { nome: nomeI, ...a,
                 razaoCaixa: a.caixaH > 0 ? a.caixaW / a.caixaH : 0,
                 razaoCanvas: a.cvH > 0 ? a.cvW / a.cvH : 0 };
      }
      ant = a;
    }
    return { nome: nomeI, erro: 'a cena não assentou em 90 quadros' };
  }, nome);

  for (const L of LARGURAS) {
    await pg.setViewportSize({ width: L.w, height: L.h });
    idle.push(await medirIdle(L.nome));
  }
  await pg.setViewportSize({ width: LARGURAS[0].w, height: LARGURAS[0].h });
  await pg.waitForTimeout(120);

  /* ── O BANNER NO IDLE E QUEM ANDA NA CENA (1.6c) ────────────────────────
   *
   * Quatro coisas que só o navegador sabe, e que o dono viu antes de qualquer
   * teste:
   *
   *   > "eu mandei um vulpix pra expedição e quem me acompanha é um squirtle"
   *   > "o Pokémon sprite do bioma continua sem mudar, ele manda o primeiro
   *   >  Pokémon base [...] nem fica setado qual Pokémon você está usando"
   *
   * A sonda MANDA UMA EXPEDIÇÃO de verdade e depois pergunta à cena quem ela
   * está desenhando. Injetar estado seria mais curto e mediria outra coisa: o
   * caminho que quebrou foi o do clique.
   */
  /* ── A CENA DA CAPTURA (1.23) ────────────────────────────────────────────
   *
   * Ela é chamada DIRETO, com um resultado montado, e não por um encontro de
   * verdade: o que se quer afirmar é o que a CENA faz com um resultado, e
   * montar um encontro para chegar até ela acrescentaria três coisas que podem
   * falhar por outro motivo.
   *
   * O que precisa ser verdade, e nenhum teste de Node alcança:
   *   o palco é MARCADO com o final — é dele que a onda de choque e o retorno
   *     da criatura tiram a cor, e sem ele os dois finais desenham igual
   *   o laudo FICA, e não some sozinho
   *   o laudo diz o TOM certo */
  /* ── E ELA RODA COM "MENOS MOVIMENTO" LIGADO, QUE E A MAQUINA DO DONO ──
   *
   * As notas abaixo diziam que o contexto do Q5 roda com `reducedMotion:
   * reduce`. **Nao roda** — o contexto de 1440 nasce sem `emulateMedia`, e so
   * o da linha de base visual pede reduce. As duas notas eram promessa de
   * cabecalho sem corpo, que e o defeito que o `test/origem.mjs` nasceu para
   * caçar, aqui cometido por mim no arnês.
   *
   * O preco disso foi exato e mensuravel: as sabotagens S812 e S814 ficaram
   * INERTES. Sem reduce, `animacaoCheia()` ja devolve `true` por outro
   * caminho — entao apagar a linha que faz a escolha do jogador vencer o
   * sistema nao muda resposta nenhuma, e o portao aprovava o defeito que o
   * dono tinha acabado de relatar.
   *
   *   > A afirmacao passa por um caminho que o defeito nao toca. E a terceira
   *   > vez neste projeto, e as tres foram a mesma forma: eu medi onde o
   *   > defeito nao mora.
   *
   * Emulado SO em volta desta sonda, e devolvido depois: ligar reduce no
   * contexto inteiro mexeria na linha de base visual das outras telas, e o
   * D-033 ja ensinou o que custa fotografar coisa que depende de relogio. */
  await pg.emulateMedia({ reducedMotion: "reduce" });
  const captura = await pg.evaluate(async () => {
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    try {
      const m = await import('/app/modules/captura-cena.mjs');
      m.ligarCaptura();
      /* ── A SONDA ESCUTA, E NÃO SÓ OLHA ────────────────────────────────
         O dono pediu som no resultado. Um teste que só confere o DESENHO
         aprova uma cena muda — e o Q2 mostrou exatamente isso: apagar o
         `sfx` do veredito passava verde.

         Não há como "ouvir" num portão, mas há como contar osciladores: todo
         som deste projeto nasce de um `createOscillator`. Contar é o mais
         perto de escutar que um teste chega, e é honesto sobre o que mede. */
      document.querySelector('.nav[data-view="viewIdle"]')?.click();
      await esperar(250);
      /* O SOM É LIGADO AQUI E DEVOLVIDO COMO ESTAVA. Esta sonda roda ANTES da
         que confere "o jogo abre mudo" — deixar o som ligado faria aquela
         reprovar, e a primeira versão desta contou ZERO oscilador justamente
         por medir com o som desligado.

           Sonda que muda o estado do jogo tem de desfazer o que fez, ou ela
           vira o defeito da sonda seguinte. */
      const au = await import('/app/modules/audio.mjs');
      const somAntes = au.somLigado();
      if (!somAntes) au.alternarSom();
      const AC = window.AudioContext || window.webkitAudioContext;
      const criar = AC.prototype.createOscillator;
      let osciladores = 0;
      AC.prototype.createOscillator = function () { osciladores++; return criar.call(this); };
      m.ligarCaptura();
      /* ── A ESCOLHA DO JOGADOR VENCE O SISTEMA ───────────────────────────
         O contexto do Q5 roda com `reducedMotion: reduce`, que é o estado da
         máquina do dono. Forçando `cheia`, a cena tem de sair CHEIA — é o
         pedido literal dele: *"quero opção com animação"*. */
      m.usarAnimacao('cheia');
      const fim = { modoForcado: m.animacaoCheia() };
      /* ── E AGORA O CAMINHO SEM ESCOLHA, QUE E ONDE O D-076 MORAVA ───────
       *
       * O laco abaixo FORCA `pa.anim = cheia`, e forcar apaga o defeito: com a
       * escolha do jogador no lugar, `animacaoCheia()` devolve `true` e o
       * caminho reduzido nunca e percorrido. A sabotagem S812 — "a cena volta
       * a ser pulada por reduced-motion" — passava VERDE por causa disso, e
       * ela e exatamente a queixa que o dono trouxe.
       *
       *   > Uma sonda que so exercita o caminho consertado nao afirma nada
       *   > sobre o caminho que estava quebrado.
       *
       * O estado da maquina dele e este: "menos movimento" ligado no sistema e
       * NENHUMA escolha feita. A cena tem de acontecer assim mesmo — mais
       * curta, e nunca ausente. */
      localStorage.removeItem("pa.anim");
      fim.semEscolha = { cheia: m.animacaoCheia() };
      m.tocar({ dex: 25, capturou: true, bola: "great", chance: .5, nome: "X" });
      await esperar(200);
      fim.semEscolha.aconteceu = !!document.querySelector(".capCena");
      fim.semEscolha.anim = document.querySelector(".capCena")?.dataset.anim ?? null;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await esperar(700);
      fim.semEscolha.casa = document.querySelector(".capCena")
        ?.style.getPropertyValue("--casa").trim() ?? null;
      document.querySelector("[data-cap-fechar]")?.click();
      await esperar(250);
      m.usarAnimacao("cheia");
      for (const [nome, pegou] of [['fugiu', false], ['pegou', true]]) {
        m.tocar({ dex: 25, capturou: pegou, bola: 'great', chance: .34, nome: 'X' });
        await esperar(260);
        const cena = document.querySelector('.capCena');
        /* ── OS DOIS FINAIS TÊM DE SER DIFERENTES DE VERDADE (D-076) ──────
           O dono viu os dois iguais porque a cena era PULADA — e sem ela o que
           resta é o laudo, que difere só na cor. A sonda passa a ler a CASA da
           tira: pegou termina na travada, fugiu termina aberta. */
        fim[nome] = { marca: cena?.dataset.fim ?? null,
                      anim: cena?.dataset.anim ?? null };
        /* pula a animação e espera o laudo, que é o que tem de FICAR */
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await esperar(700);
        const l = document.querySelector('.capLaudo');
        fim[nome].laudo = l ? l.className : null;
        fim[nome].texto = l ? l.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
        /* e ele continua de pé um tempo depois — a queixa era justamente uma
           mensagem que sumia sozinha */
        await esperar(900);
        fim[nome].aindaDePe = !!document.querySelector('.capLaudo');
        const c2 = document.querySelector('.capCena');
        fim[nome].casa = c2 ? c2.style.getPropertyValue('--casa').trim() : null;
        const alvo = c2?.querySelector('.capAlvo');
        fim[nome].criaturaVisivel = alvo
          ? Number(getComputedStyle(alvo).opacity) > 0.1 : null;
        /* ── O NOME DA ANIMAÇÃO, e não só o quadro ────────────────────────
           A queixa do dono foi *"ambas parecem a mesma coisa"*. O quadro final
           já difere; o que faltava conferir é o MOVIMENTO — e uma sabotagem que
           trocava a animação da fuga pela da vitória passava verde, porque
           nenhuma afirmação a lia. */
        const bola = c2?.querySelector('.capBola');
        fim[nome].animBola = bola ? getComputedStyle(bola).animationName : null;
        document.querySelector('[data-cap-fechar]')?.click();
        await esperar(250);
      }
      fim.osciladores = osciladores;
      AC.prototype.createOscillator = criar;
      if (au.somLigado() !== somAntes) au.alternarSom();
      fim.fechou = !document.querySelector('.capLaudo');
      return fim;
    } catch (e) { return { erro: String(e).slice(0, 160) }; }
  });
  await pg.emulateMedia({ reducedMotion: "no-preference" });

  /* ── A LOJA PvE (1.25) ───────────────────────────────────────────────────
   *
   * Ela mexe em SALDO, e saldo é a coisa que este projeto mais protege. O
   * motor já é conferido em `test/loja.mjs` sem navegador; o que só aqui se
   * pode afirmar é que a TELA está ligada nele — que o clique chega, que o
   * save muda, e que o som obedece à regra do dono.
   */
  const loja = await pg.evaluate(async () => {
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const q = s => document.querySelector(s);
    try {
      const dados = await import('/app/modules/idle-dados.mjs');
      const E = dados.carregar();
      E.bolsa = { ...(E.bolsa ?? {}), pokecoin: 5000, poke: 4 };
      dados.salvar(E);
      const tela = await import('/app/modules/idle-tela.mjs');
      tela.renderIdle();
      await esperar(300);

      q('[data-loja-abrir]')?.click();
      await esperar(500);
      const v = q('#lojaVideo');
      /* ── A METADE É MEDIDA COMPUTADA, E NÃO PROCURADA NO ARQUIVO ────────
         O teste estático procurava `--foco:100%` no `index.html` e achava —
         só que o valor está em DOIS lugares (a regra do CSS e o `style` do
         elemento). Trocar um deixava o outro salvando a afirmação.

           Procurar um valor num arquivo prova que alguém o escreveu. Só a
           medição no elemento prova qual deles está valendo.

         E o `50%` do fallback existe para a falha ser LEGÍVEL: sem ele, um
         `--foco` ausente viraria string vazia e o erro diria "esperado 100%,
         veio". */
      const npc = q('.lojaNpc');
      const abriu = { aberta: !q('#lojaCaixa')?.hidden,
                      itens: document.querySelectorAll('.ljItem').length,
                      fala: (q('#lojaFala')?.textContent ?? '').trim().length,
                      foco: (getComputedStyle(npc).getPropertyValue('--foco') || '50%').trim(),
                      proporcao: npc
                        ? +(npc.getBoundingClientRect().width /
                            Math.max(1, npc.getBoundingClientRect().height)).toFixed(3)
                        : null,
                      comSom: v ? !v.muted : null };

      /* COMPRAR: o saldo cai e a bolsa sobe. Conferir só que "não deu erro"
         aprovaria uma loja que não faz nada. */
      const antes = dados.carregar();
      q('[data-comprar="poke"][data-n="1"]')?.click();
      await esperar(300);
      const dep = dados.carregar();
      const comprou = {
        moeda: (antes.bolsa.pokecoin ?? 0) - (dep.bolsa.pokecoin ?? 0),
        item: (dep.bolsa.poke ?? 0) - (antes.bolsa.poke ?? 0),
        recado: (q('.ljRecado')?.textContent ?? '').trim().slice(0, 60),
      };

      /* VENDER: a outra metade, e a que o jogador esquece que existe. */
      q('[data-loja-aba="vender"]')?.click();
      await esperar(300);
      const naVenda = { itens: document.querySelectorAll('.ljItem').length,
                        semTer: document.querySelectorAll('.ljItem.naoTenho').length };
      const a2 = dados.carregar();
      q('[data-vender="poke"][data-n="1"]')?.click();
      await esperar(300);
      const d2 = dados.carregar();
      const vendeu = { moeda: (d2.bolsa.pokecoin ?? 0) - (a2.bolsa.pokecoin ?? 0),
                       item: (a2.bolsa.poke ?? 0) - (d2.bolsa.poke ?? 0) };

      q('[data-loja-fechar]')?.click();
      await esperar(300);
      const fechou = { fechada: !!q('#lojaCaixa')?.hidden,
                       mudo: v ? v.muted : null, parado: v ? v.paused : null };
      return { abriu, comprou, naVenda, vendeu, fechou };
    } catch (e) { return { erro: String(e).slice(0, 160) }; }
  });

  const bnIdle = await pg.evaluate(async () => {
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const q = s => document.querySelector(s);
    /* ── A EXPEDIÇÃO MUDOU DE ABA NO A4e, E A SONDA ANDA JUNTO ───────────
     *
     * ROTAS virou o Avanço — o modo em que o jogador FICA. Mandar uma Batida,
     * uma Trilha ou uma Vigília e fechar o jogo é ROTA OFF, e é lá que o
     * seletor de perfil e o botão de mandar passaram a morar.
     *
     * A sonda tem de percorrer o caminho do JOGADOR, e o caminho mudou. Duas
     * armadilhas aqui, as duas já pagas por esta suíte antes:
     *
     *   · clicar num botão de uma aba escondida "funciona" em JavaScript e
     *     não prova nada sobre o que o jogador alcança;
     *   · os painéis são pintados nas DUAS abas pelo mesmo código
     *     (`nosDois`), então contar `.idleCria.on` no documento inteiro
     *     conta cada criatura duas vezes — foi o que fez a afirmação da
     *     pokébola virar 2 = 2 sem distinguir coisa nenhuma.
     *
     * Por isso: abre a aba de verdade, e conta DENTRO dela. */
    q('.nav[data-view="viewRotaOff"]')?.click();
    await esperar(500);
    const naAba = sel => document.querySelectorAll('#viewRotaOff ' + sel);
    const comp = await import('/app/modules/idle-companheiro.mjs');

    /* ── A SONDA PRECISA DE DUAS CRIATURAS, E O TESTE ME DISSE ISSO ───────
     *
     * Ela tinha UMA. Com uma só, "bolas acesas == criaturas escolhidas" vale
     * 1 = 1 mesmo quando a bola acende sempre — e a sabotagem passava por
     * baixo.
     *
     *   > Uma igualdade entre duas contagens que só podem valer o mesmo
     *   > número não é medição: é tautologia.
     *
     * Uma segunda criatura, com stamina cheia, cria o caso MISTO — alguém
     * escolhido e alguém não —, que é o único em que a afirmação distingue
     * alguma coisa. Ela também torna a confirmação mais parecida com o uso
     * real, onde quase nunca se manda uma só. */
    try {
      const dados = await import('/app/modules/idle-dados.mjs');
      const E = dados.carregar();
      if ((E.criaturas ?? []).length === 1) {
        const base = E.criaturas[0];
        E.criaturas.push({ ...base, id: base.id + '-sonda', dex: base.dex,
                           stamina: 100, staminaEm: Date.now() });
        dados.salvar(E);
        /* REDESENHA, e NÃO recarrega. A primeira versão chamava
           `location.reload()` aqui e derrubou onze afirmações abaixo desta: a
           página inteira voltava ao zero no meio do roteiro, e as sondas
           seguintes mediam um jogo que nunca tinha começado.

             > Sonda que recarrega a página apaga o trabalho das sondas que
             > vêm depois dela. */
        const tela = await import('/app/modules/idle-tela.mjs');
        tela.renderIdle();
        await esperar(400);
      }
    } catch { /* sem save, a aba cuida do resto */ }

    /* manda quem NÃO é o primeiro da caixa, que é justamente o caso que falhava */
    const cartoes = [...naAba("#offEquipe [data-cria]")];
    const alvo = cartoes[cartoes.length - 1] || cartoes[0];
    const dexAlvo = alvo ? Number(alvo.dataset.dex || 0) : 0;
    /* O PRIMEIRO CARTAO JA VEM SELECIONADO, e um clique cego o DESMARCA — a
       primeira versao desta sonda fazia isso e o envio era recusado com
       "escolha ao menos uma criatura". Clicar ate ficar ligado e o que
       reproduz a intencao do jogador, e nao o gesto. */
    if (alvo && !alvo.classList.contains('on')) { alvo.click(); await esperar(250); }
    /* o cartao pode ter sido redesenhado: reachar pelo id */
    const alvoDepois = alvo && document.querySelector(`#offEquipe [data-cria="${alvo.dataset.cria}"]`);
    const alvoLigado = !!alvoDepois?.classList.contains('on');
    /* ── REACHA PELO ID A CADA VOLTA ─────────────────────────────────────
       `cartoes` foi capturado ANTES dos cliques, e o cartão é redesenhado a
       cada um: os nós da lista saem do documento e clicar neles não faz nada.
       A desmarcação era um laço que parecia funcionar e não tocava em nada.

         > Um nó guardado antes de um redesenho é um endereço de uma casa que
         > foi demolida.

       Só apareceu quando a sonda passou a ter DUAS criaturas — com uma, não
       havia o que desmarcar. */
    for (const c of cartoes) {
      const vivo = document.querySelector(`#offEquipe [data-cria="${c.dataset.cria}"]`);
      if (vivo && c.dataset.cria !== alvo?.dataset.cria && vivo.classList.contains('on')) {
        vivo.click(); await esperar(140);
      }
    }
    await esperar(150);
    /* ── MANDAR AGORA PASSA POR UMA CONFIRMAÇÃO (1.24) ────────────────────
       O botão abre um pop-up com quem vai e quanta stamina sobra; só o ✓ manda.
       A sonda tinha de aprender o gesto novo — e o fato de ela ter reprovado
       aqui é a prova de que a confirmação está no caminho de verdade, e não
       enfeitando ao lado dele. */
    /* ── A CONFIRMAÇÃO É AFIRMADA, E NÃO SÓ ATRAVESSADA ──────────────────
       A primeira versão clicava no ✓ sem conferir que ele existia — e uma
       sabotagem que APAGA a confirmação passava verde: sem pop-up, o clique no
       botão manda direto, e o clique no ✓ vira um nada.

         > Um passo que funciona igual quando a coisa não existe não afirma
         > que ela existe.

       E a POKÉBOLA é lida no mesmo instante: acesa tem de casar, uma a uma, com
       a criatura escolhida. */
    const bolasAntes = naAba('.criaBola.acesa').length;
    const escolhidas = naAba('.idleCria.on').length;
    q('#idleMandar')?.click(); await esperar(500);
    const confirmou = !!q('.confExp');
    const confTexto = q('.confExp')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) ?? '';
    q('[data-dlg="sim"]')?.click(); await esperar(700);

    const chipLigado = q('#viewRotaOff .idleChip.on')?.dataset?.bioma ?? null;
    const rodape = q('#battleBannerIdle .bnRodape')?.textContent?.trim() ?? '';
    const arte = q('#battleBannerIdle .bnMon');
    const naCena = comp.quemAcompanha();

    /* e um bioma SEM ninguém: a cena tem de ficar sem companheiro */
    const outro = [...naAba('#offBiomas [data-bioma]')]
      .find(b => b.dataset.bioma !== chipLigado);
    outro?.click(); await esperar(600);
    const naCenaVazia = comp.quemAcompanha();

    /* Quem o SELETOR oferece contra quem esta na CAIXA. Oferecer guardada e
       oferecer o que nao da: a recusa so chega depois do clique. */
    const est = JSON.parse(localStorage.getItem('ar_idle') || 'null');
    const naCaixaIds = (est?.criaturas ?? []).filter(c => c.naCaixa).map(c => c.id);
    const oferecidas = cartoes.map(c => c.dataset.cria);
    const guardadasOferecidas = oferecidas.filter(id => naCaixaIds.includes(id));

    return { dexAlvo, chipLigado, rodape, alvoLigado, nCartoes: cartoes.length,
             guardadasOferecidas, naCaixaIds: naCaixaIds.length,
             ligados: cartoes.filter(c=>c.classList.contains('on')).length,
             mandarOff: !!q('#idleMandar')?.disabled,
             confirmou, confTexto, bolasAntes, escolhidas,
             cartoes: cartoes.length,
             aviso: q('#offAviso')?.textContent?.trim()?.slice(0,80) ?? '',
             arteSrc: arte?.getAttribute('src') ?? '', naCena, naCenaVazia };
  }).catch(e => ({ erro: String(e).slice(0, 160) }));




  /* ── O SOM NAO TOCA SEM ALGUEM TER PEDIDO (1.5p) ────────────────────────
   *
   * Duas coisas, e a segunda e a que o dono descreveu: *"as vezes voce ta na
   * aba das rotas ou da liga e ouvindo o som da arena"*. Mutar o inicio
   * sozinho so adia esse vazamento ate ele ligar o som de novo.
   *
   * Isto so se mede no navegador: em Node nao ha `localStorage`, nao ha
   * `AudioContext`, e o modulo cai no padrao seguro por acidente — um teste
   * puro passaria sem tocar no comportamento que importa. */
  const som = await pg.evaluate(async () => {
    const ir = v => document.querySelector('.nav[data-view="' + v + '"]')?.click();
    const m = await import('/app/modules/audio.mjs');
    const inicio = { ligado: m.somLigado(), botao: document.querySelector('#btnSound')?.textContent };
    ir('viewArena'); await new Promise(r => setTimeout(r, 200));
    document.querySelector('#btnSound')?.click();   /* o jogador PEDE o som */
    await new Promise(r => setTimeout(r, 250));
      const naArena = { ligado: m.somLigado() };
      /* ── O CADEADO PRECISA APARECER (1.26) ────────────────────────────
         Saldo trancado que o jogador não vê é saldo que ele acha que PERDEU, e
         a primeira recusa de boost viraria um relato de bug. Aqui se COMPRA
         de verdade e se lê o selo — conferir só que a função existe aprovaria
         um selo que nunca é desenhado. */
      const bc = await import('/app/modules/banco.mjs');
      /* A DIFERENÇA, e não o absoluto: esta sonda roda depois de outras que já
         compraram, e afirmar "travado === 500" num estado acumulado é medir o
         histórico em vez da operação. */
      naArena.travadoAntes = bc.travado();
      bc.creditarCompra(500, 'sonda');
      const ct = await import('/app/modules/controles.mjs');
      ct.atualizarSaldo();
      await new Promise(r => setTimeout(r, 150));
      const sel = document.querySelector('#balTrava');
      naArena.cadeado = sel ? { visivel: !sel.hidden, texto: sel.textContent.trim() } : null;
      naArena.travado = bc.travado();
    ir('viewIdle'); await new Promise(r => setTimeout(r, 350));
    /* `tone` é a raiz de todo SFX: se ela não bloqueia fora da arena, o hitbox
       toca por cima da tela das rotas — o exemplo exato que o dono deu. */
    const foraDaArena = { ligado: m.somLigado(), soa: m.soaAgora(),
      /* ── E O SOM DA CAPTURA TEM DE TOCAR AQUI (1.23) ────────────────
         A metade nova da mesma pergunta. A trava era um booleano de vista, e
         quando a captura ganhou som eu a abri para as duas telas — com isso o
         HITBOX DA ARENA voltou a tocar na aba das rotas, que é a queixa que
         fez esta trava existir. O teste acima pegou.

         Agora cada som declara a casa dele, e as duas afirmações têm de valer
         ao mesmo tempo: o da arena cala aqui, o do idle soa aqui. Medir só
         uma das duas deixa passar a correção grossa. */
      soaCaptura: m.soaAgora('capturou'),
      /* ── E UM EFEITO QUE NINGUÉM CLASSIFICOU ────────────────────────
         O padrão da tabela é a ARENA, e isso é o lado seguro do erro: um som
         novo que ninguém pôs numa casa fica preso onde a trava já era
         conservadora, em vez de vazar para toda tela.

         Sem esta linha o caminho do `??` nunca é percorrido — as duas
         perguntas acima usam efeitos que ESTÃO na tabela, e o Q2 mostrou que
         trocar o padrão passava verde. */
      soaSemCasa: m.soaAgora('efeito_novo_sem_casa') };
    ir('viewArena'); await new Promise(r => setTimeout(r, 250));
    const devolta = { soa: m.soaAgora(), soaCaptura: m.soaAgora('capturou') };
    return { inicio, naArena, foraDaArena, devolta };
  }).catch(e => ({ erro: String(e).slice(0, 160) }));

  /* --- Q5 do V1.13: o tema troca de verdade ------------------------------
     A promessa do bloco é que trocar de tema muda o site inteiro sem tocar em
     lógica de jogo. Teste de unidade confere que os tokens existem; só o
     navegador confere que o valor CALCULADO muda — e que ele muda em quem usa
     o token, não só na declaração. */
  /* --- Q5 do R25: as fontes do tema CARREGAM (D-037) ---------------------
     `test/ortografia.mjs` confere o endereço da folha; só o navegador confere
     que a face chegou. E a diferença entre as duas coisas foi um defeito que
     durou três blocos: o endereço estava certo, o arquivo existia, e a folha
     era servida como `application/octet-stream` — recusada pelo navegador, com
     o tema inteiro caindo para o fallback sem nada quebrar.

     A MEDIÇÃO É POR LARGURA, e não por `document.fonts.check()`: aquele
     devolve `true` para família que o sistema resolve por fallback, e foi
     justamente o que ele fez enquanto o defeito estava vivo. Duas fontes
     diferentes desenham o mesmo texto com larguras diferentes; iguais
     significa que só uma delas está em uso. */
  const fontes = await pg.evaluate(async () => {
    await document.fonts.ready;
    const largura = fam => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `900 40px ${fam}`;
      return c.measureText('COMO FUNCIONA 3 2 1').width;
    };
    const base = largura('monospace');
    return {
      faces: document.fonts.size,
      orbitron: largura('Orbitron'), press: largura('"Press Start 2P"'), base,
      folhaAceita: [...document.styleSheets].some(s => (s.href || '').includes('fonts_googleapis')),
    };
  });

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
    /* ── TRÊS ESCOLHAS, UMA CONFIRMAÇÃO (atualizado no 1.27) ──────────
       O D-008 é sobre contar a aposta UMA vez, e o cenário continua o mesmo:
       o jogador troca de ideia duas vezes antes de fechar. O que mudou é que
       trocar de ideia agora é só trocar a ESCOLHA — de graça, e é exatamente
       essa a diferença que a confirmação criou. */
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    linhas[0].click(); await esperar(120);
    linhas[1].click(); await esperar(120);
    linhas[2].click(); await esperar(160);
    document.querySelector('#btnConfirmarAposta')?.click();
    await esperar(400);
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

  /* ── R32 · OS AVISOS APARECEM SOB MOVIMENTO REDUZIDO? ──────────────────
   *
   * A pergunta precisa ser feita no NAVEGADOR porque a resposta é opacidade
   * calculada ao longo do tempo, e nenhuma leitura de CSS chega lá: a regra que
   * quebrou isso no R30 não tinha nada de errado à vista — ela zerava uma
   * duração, e foi o `forwards` do outro lado do arquivo que transformou isso
   * em conteúdo apagado.
   *
   * DUAS ARMADILHAS, e as duas custaram uma medição errada antes de aparecer:
   *
   *   animação CSS NÃO RODA dentro de ancestral escondido. Os avisos vivem em
   *   `#arena`, e sem ativar a view a medição lê a opacidade base e conclui que
   *   está tudo quebrado — inclusive quando está tudo certo;
   *
   *   o `#streakToast` anima pela classe `.anim`, não pela `.show`. Só `.show`
   *   deixa o elemento visível-por-display e transparente.
   *
   * `emulateMedia` liga a preferência nesta página, mede, e desliga. */
  const avisos = await (async () => {
    try {
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      const r = await pg.evaluate(async () => {
        const dorme = ms => new Promise(r => setTimeout(r, ms));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
        document.querySelector('#viewArena')?.classList.add('on');
        await dorme(250);
        const alvos = [
          ['#koToast', ['show'], '<b>X</b> caiu!<span class="ret">retornando…</span>'],
          ['#streakToast', ['show', 'atk', 'anim'], '<div class="txt"><b class="lvl">DOUBLE KILL</b></div>'],
        ];
        const out = {};
        for (const [sel, classes, html] of alvos) {
          const el = document.querySelector(sel);
          if (!el) { out[sel] = null; continue; }
          const antes = el.className;
          el.className = ''; el.innerHTML = html; void el.offsetWidth;
          el.className = classes.join(' ');
          let pico = 0;
          for (const t of [40, 120, 200, 320]) {
            await dorme(t);
            pico = Math.max(pico, +getComputedStyle(el).opacity);
          }
          el.className = antes;
          out[sel] = +pico.toFixed(3);
        }
        return out;
      });
      await pg.emulateMedia({ reducedMotion: 'no-preference' });
      return r;
    } catch (e) { return { erro: String(e).split('\n')[0] }; }
  })();

  /* ANTES DO `b.close()`, e depois de tudo que le a rodada. `pg.reload()` derruba
     andamento, e as sondas da luta (colocacao viva, contagem de apostas) leem
     dela. No meio da coleta, esta recarga fazia quatro testes de arena
     reprovarem por falta de rodada — erro de sonda vestido de erro de
     produto, pela terceira vez neste arnes. */
  /* ── E DEPOIS DE RECARREGAR, A ABA ABRE ONDE A ACAO ESTA ───────────────
   *
   * Isto so se ve numa carga NOVA com expedicao ja em campo — foi assim que o
   * dono viu: *"nem fica setado qual Pokemon voce esta usando, onde ele
   * esta"*. Com o bicho farmando no gelo, a aba abria na floresta vazia e ele
   * concluia que o jogo tinha esquecido quem ele mandou.
   *
   * A sonda anterior media logo depois de mandar, e ali o bioma na tela e o
   * que o jogador acabou de escolher: o defeito nao pode aparecer. E o mesmo
   * erro do D-058 e do S614 — medir onde o defeito nao cabe. */
  const idleRecarregado = await (async () => {
    try {
      /* UMA SEGUNDA ABA NO MESMO CONTEXTO, e nao `pg.reload()`.

         Recarregar a `pg` derruba a rodada em andamento, e as sondas da luta
         leem dela — e no fim da coleta a pagina ja foi fechada. A aba nova
         compartilha o `localStorage` do contexto, que e exatamente o que esta
         medicao precisa: uma carga NOVA sobre o mesmo estado salvo. */
      const pg2 = await pg.context().newPage();
      await pg2.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
      await pg2.evaluate(() => {
        document.querySelector('.nav[data-view="viewIdle"]')?.click();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
        document.querySelector('#viewIdle')?.classList.add('on');
      });
      await pg2.waitForFunction(
        () => document.querySelectorAll('#idleBiomas [data-bioma]').length > 0,
        { timeout: 20000, polling: 150 });
      await pg2.waitForTimeout(500);
      const lido = await pg2.evaluate(() => {
        const est = JSON.parse(localStorage.getItem('ar_idle') || 'null');
        const ativa = (est?.expedicoes ?? []).find(x => !x.colhidaEm);
        return { chip: document.querySelector('#viewIdle .idleChip.on')?.dataset?.bioma ?? null,
                 ativa: ativa?.bioma ?? null };
      });
      await pg2.close();
      return lido;
    } catch (e) { return { erro: String(e).slice(0, 140) }; }
  })();

  await b.close(); s.close();


  return { erros, conhecidos, apostas, aoVivo, relogio, folhas: cache.size, erroDepois, jogo, corte, cancelamento, comAposta, colunasAposta, painel, arena, idle, idlePronto, som, captura, loja, bnIdle, idleRecarregado, contagem, colocacaoViva, houveQueda, tema, fontes, avisos, ...st };
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
  const { chromium } = await import(PW_URL);
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
  const { chromium } = await import(PW_URL);
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
  const { chromium } = await import(PW_URL);
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
    /* ── DOIS GESTOS DESDE O 1.27 (L-112) ────────────────────────────────
       O clique no lutador ESCOLHE; quem aposta é o ✓ verde. A sonda percorre o
       caminho do jogador, e o caminho ganhou um passo — a mesma atualização
       que o envio da expedição pediu no 1.24. */
    await pg.click(`.pick[data-i="${campeaoSlot}"]`, { timeout: 8000 });
    await pg.click('#btnConfirmarAposta', { timeout: 8000 });
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
  /* Dois gestos desde o 1.27: escolher e confirmar. */
  await pg.evaluate(async c => {
    document.querySelector(`.pick[data-i="${c === 0 ? 1 : 0}"]`)?.click();
    await new Promise(r => setTimeout(r, 220));
    document.querySelector('#btnConfirmarAposta')?.click();
    await new Promise(r => setTimeout(r, 320));
  }, campeaoSlot);
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
  /* ── O ATRASO QUE TORNA O S260 OBSERVÁVEL ────────────────────────────────
   *
   * O `finish()` chama `hidratar()` SEM `await` — de propósito: a tela de
   * resultado desenha agora e o número se corrige depois. A consequência é uma
   * CORRIDA com o bloco de liquidação, que vem mais abaixo na mesma função.
   *
   * Se a reidratação vencer, `S.carteira` já é a projeção pós-settlement, sem
   * reserva — e a liquidação do cliente FALHA sozinha, pela invariante "saldo
   * nunca fica negativo". Se perder, a carteira ainda tem a reserva e o
   * lançamento duplo ACONTECE.
   *
   * Medido: com a projeção real, `liquidarGanho` devolve `ok:true` e credita
   * 250; sem reserva, `ok:false` e nada. O defeito plantado S260 passou verde
   * porque a corrida foi ganha pela reidratação naquela execução.
   *
   * Atrasar `/api/carteira` a partir daqui fixa o lado da corrida: no momento
   * da liquidação a carteira ainda é a de antes, e um cliente que lance vai
   * lançar. É o D-021 pelo avesso — em vez de esperar o acaso, escolhê-lo. */
  await pg.route('**/api/carteira', async rota => {
    await new Promise(z => setTimeout(z, 2500));
    return rota.continue();
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
  const { chromium } = await import(PW_URL);
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

  /* ── R32 · A REGRESSÃO QUE ESTE TESTE EXISTE PARA IMPEDIR ───────────────
   *
   * O R30 trouxe o reset padrão de acessibilidade para o `index.html`, com
   * `animation-duration:.01ms` sob movimento reduzido. Aquilo apagou TODO aviso
   * que some sozinho — nocaute, killstreak, alertas — porque o último quadro
   * deles é `opacity:0` e o `forwards` o segura. A tela abria, a suíte ficava
   * verde, e o único momento em que a arena fala direto com quem apostou
   * simplesmente não acontecia.
   *
   * Nenhum teste estático pega isso: a regra que quebrou zerava uma duração, e
   * o dano veio do `forwards` declarado a duzentas linhas dali. Só medindo a
   * opacidade ao longo do tempo, no navegador, com a preferência ligada. */
  s.teste('os avisos da arena aparecem com movimento reduzido ligado', () => {
    ok(r.avisos && !r.avisos.erro, `a medição dos avisos falhou: ${r.avisos?.erro}`);
    for (const [sel, pico] of Object.entries(r.avisos)) {
      ok(pico !== null, `${sel} não existe na arena`);
      ok(pico > 0.5,
        `${sel} chegou a no máximo ${pico} de opacidade com "reduzir movimento" ` +
        `ligado — ele nunca aparece. Animação aqui não é enfeite: é o ciclo de ` +
        `vida do aviso, e o quadro final dela é o estado ESCONDIDO.`);
    }
  });

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
    const css = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
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

  /* ═══ R11 · A ARENA MANTÉM A PROPORÇÃO QUE DECLARA ════════════════════
   *
   * Medido nas quatro larguras. A tolerância é de 1,5 %: `getBoundingClientRect`
   * devolve fração de pixel e a borda de 2 px entra na conta, então exigir
   * igualdade exata reprovaria por arredondamento. O defeito real era de 34 % —
   * qualquer folga razoável o separa do ruído. */
  s.teste('o círculo é círculo nas quatro larguras', () => {
    const RAZAO = 3 / 4, TOL = 0.015;
    for (const a of r.arena) {
      ok(!a.erro, `${a.nome}: ${a.erro}`);
      ok(a.w > 0 && a.h > 0, `${a.nome}: a arena mediu ${a.w}×${a.h}`);
      const desvio = Math.abs(a.razao - RAZAO) / RAZAO;
      ok(desvio <= TOL,
        `${a.nome}: a arena está ${(desvio * 100).toFixed(1)}% fora da proporção declarada — ` +
        `${a.w.toFixed(1)}×${a.h.toFixed(1)} dá razão ${a.razao.toFixed(3)}, e 3/4 é ${RAZAO}. ` +
        `O canvas preenche a caixa, então tudo que é redondo vira oval.`);
    }
  });


  /* ═══ A CENA DA ROTA LÊ A CAIXA, E NUNCA A IMPÕE (S592) ═══════════════
   *
   * A janela de mundo acompanha o palco. Cravar a caixa deixa a cena certa numa
   * largura e errada em todas as outras — e anula a alça de redimensionar, que
   * foi pedido explícito do dono: *"será regulado e extendido ao gosto do
   * player [...] precisa ser muito bem feito e testado para ir se ajustando a
   * resolução"*.
   *
   * A tolerância é de 4 %: o canvas é arredondado para pixel inteiro e o piso do
   * zoom entra na conta, então exigir igualdade reprovaria por arredondamento.
   * A caixa cravada erra muito mais que isso em qualquer largura que não seja a
   * dela. */
  /* A MONTAGEM É AFIRMAÇÃO PRÓPRIA, e ela existe por um erro meu.

     Na primeira versão, a cena não montava (a caixa do portão abre com estado
     zerado, e sem criatura inicial o card da rota é `display:none`), o palco
     media 0x0, e as afirmações de baixo reprovavam dizendo *"a cena não lê a
     caixa"*. Erro de sonda vestido de erro de produto — e eu quase registrei
     um defeito que não existe.

     Separada, a mensagem diz a verdade: ou a cena montou, ou o arnês falhou. */
  s.teste('a cena da rota montou na caixa do portão', () => {
    ok(r.idlePronto,
      'o palco da rota nunca ganhou caixa. NÃO é defeito da cena: sem criatura ' +
      'inicial o card fica `display:none` por regra do produto, e a caixa do ' +
      'portão abre com estado zerado. A medição escolhe um inicial pelo clique; ' +
      'se isto reprovar, foi a escolha que não aconteceu.');
    for (const a of (r.idle ?? []))
      ok(!a.erro, `${a.nome}: ${a.erro}`);
  });

  s.teste('a janela de mundo acompanha a proporção do palco', () => {
    const TOL = 0.04;
    ok((r.idle ?? []).length > 0, 'a cena da rota não foi medida em largura nenhuma');
    for (const a of r.idle) {
      if (a.erro) continue;   /* a montagem tem afirmação própria, acima */
      ok(a.caixaW > 0 && a.cvW > 0,
        `${a.nome}: palco ${a.caixaW}×${a.caixaH}, canvas ${a.cvW}×${a.cvH}`);
      const desvio = Math.abs(a.razaoCanvas - a.razaoCaixa) / a.razaoCaixa;
      ok(desvio <= TOL,
        `${a.nome}: o palco mede ${a.caixaW.toFixed(0)}×${a.caixaH.toFixed(0)} ` +
        `(razão ${a.razaoCaixa.toFixed(3)}) e o canvas ${a.cvW}×${a.cvH} ` +
        `(razão ${a.razaoCanvas.toFixed(3)}) — ${(desvio * 100).toFixed(1)}% fora. ` +
        'O CSS estica o canvas até preencher o palco, então proporções diferentes ' +
        'saem como imagem deformada. É o "ficou muito esticadona" do dono, e é ' +
        'o que acontece quando a cena IMPÕE uma caixa em vez de LER a que existe.');
    }
  });

  s.teste('mudar a largura da janela muda a janela de mundo', () => {
    /* A afirmação acima pega a caixa cravada em quase toda largura; esta pega o
       caso em que ela por acaso bate. Duas larguras diferentes com a MESMA
       janela de mundo só acontecem se a caixa não estiver sendo lida.
       Na passada estreita há uma largura só, e aí não há o que comparar — o
       teste diz isso em voz alta em vez de passar em silêncio. */
    if ((r.idle ?? []).length < 2) {
      ok(true, 'passada estreita: uma largura só, sem par para comparar');
      return;
    }
    const chaves = new Set(r.idle.filter(a => !a.erro).map(a => `${a.cvW}x${a.cvH}`));
    ok(chaves.size > 1,
      `a janela de mundo saiu ${[...chaves][0]} em TODAS as ${r.idle.length} larguras. ` +
      'Uma cena que não muda com a janela não está lendo o palco — está cravando ' +
      'uma caixa, e a alça que o jogador arrasta deixa de fazer efeito nenhum.');
  });


  /* ═══ O SOM NÃO TOCA SEM ALGUÉM TER PEDIDO (1.5p) ═════════════════════ */
  s.teste('o jogo abre mudo, e o botão diz isso', () => {
    ok(!r.som?.erro, `a sonda do som falhou: ${r.som?.erro}`);
    igual(r.som.inicio.ligado, false,
      'o jogo abriu com o som LIGADO. Palavra do dono: "o botão do som fica ' +
      'mutado, o player ativa se quiser, ponto final". Um produto que abre numa ' +
      'aba do navegador e faz barulho sem ninguém pedir dá a pior surpresa que ' +
      'ele pode dar.');
    igual(r.som.inicio.botao, '🔇',
      `o botão nasceu mostrando "${r.som.inicio.botao}" com o som mudo. Botão que ` +
      'diz 🔊 sobre o silêncio é a mesma mentira do rótulo do zoom que dizia "1×" ' +
      'renderizando 2,00×.');
  });

  s.teste('o jogador liga o som, e ele liga', () => {
    igual(r.som.naArena.ligado, true,
      'o clique no botão não ligou o som. Mudo por padrão só é aceitável se ' +
      'ligar for um clique — senão vira recurso removido.');
  });

  s.teste('nada da arena soa fora da arena — nem trilha, nem hitbox', () => {
    igual(r.som.foraDaArena.ligado, true,
      'sair da arena DESLIGOU o som do jogador. Não é isso: a escolha dele ' +
      'continua valendo, o que muda é a arena não estar na tela.');
    igual(r.som.foraDaArena.soa, false,
      'com o som ligado e a aba das rotas aberta, a arena continua soando. ' +
      'É o relato do dono, literal: "Eu não posso tá na aba da rota ouvindo os ' +
      'hitbox da arena". Hitbox é SFX, não trilha — parar só a música deixa os ' +
      'efeitos da luta tocando por cima da tela das rotas.');
    igual(r.som.devolta.soa, true,
      'voltando para a arena, ela continuou muda. A trava é sobre ESTAR na ' +
      'tela, não sobre ter saído uma vez — quem foi olhar a bolsa e voltou não ' +
      'pode perder o som da rodada.');
  });

  s.teste('a loja abre, com a vendedora falando e com som', () => {
    ok(!r.loja?.erro, `a sonda da loja falhou: ${r.loja?.erro}`);
    ok(r.loja.abriu.aberta, 'a loja não abriu');
    ok(r.loja.abriu.itens >= 3, `a vitrine saiu com ${r.loja.abriu.itens} item(ns)`);
    ok(r.loja.abriu.fala > 8,
      'a vendedora não disse nada. Uma loja que abre com uma tabela de preços é ' +
      'um formulário; uma que abre com alguém falando é um lugar.');
    igual(r.loja.abriu.comSom, true,
      'a loja abriu MUDA. O dono pediu o som na abertura, e o `muted` do HTML ' +
      'existe só para o navegador não recusar o autoplay.');
  });

  s.teste('a vendedora é a metade DIREITA — medido no elemento, e não no arquivo', () => {
    /* O vídeo tem os DOIS NPCs no mesmo quadro. Mostrar o homem na loja de
       PokéCoin é a falha que o dono nomeou com outras palavras: *"jogar uma
       Great e ver a animação da Ultra é pior que não ter animação nenhuma"*.

       A afirmação estática procurava `--foco:100%` no arquivo e achava — o
       valor está em DOIS lugares, e trocar um deixava o outro salvando o teste.

         > Procurar um valor num arquivo prova que alguém o escreveu. Só a
         > medição no elemento prova qual deles está valendo. */
    igual(r.loja.abriu.foco, '100%',
      `a loja PvE está mostrando o foco ${r.loja.abriu.foco} — 100% é a metade ` +
      'DIREITA, que é a vendedora. 0% é o homem, e ele é da outra loja.');
    /* E a proporção 8:9 ≈ 0,889 é o que torna o corte EXATO: uma caixa mais
       larga não consegue mostrar só a metade, por mais que se escolha o foco. */
    ok(Math.abs(r.loja.abriu.proporcao - 8 / 9) < 0.06,
      `a caixa do NPC está em ${r.loja.abriu.proporcao}, e a metade do vídeo é ` +
      '8:9 ≈ 0,889. Fora disso o outro NPC aparece de lado — medido: com 1,15 ' +
      'sobravam ~300 px dele.');
  });

  s.teste('comprar tira moeda e põe item — e vender faz o contrário', () => {
    /* O motor já é conferido sem navegador. O que só aqui se afirma é que a
       TELA está ligada nele: conferir apenas que "não deu erro" aprovaria uma
       loja que não faz nada. */
    ok(r.loja.comprou.moeda > 0,
      `comprar não tirou moeda (${r.loja.comprou.moeda}) — o clique não chegou ` +
      'ao motor');
    igual(r.loja.comprou.item, 1, 'comprar não pôs o item na bolsa');
    ok(/levou/i.test(r.loja.comprou.recado),
      `a loja não disse o que aconteceu: "${r.loja.comprou.recado}"`);
    ok(r.loja.vendeu.moeda > 0, 'vender não pagou nada');
    igual(r.loja.vendeu.item, 1, 'vender não tirou o item da bolsa');
    ok(r.loja.vendeu.moeda < r.loja.comprou.moeda,
      `vendeu por ${r.loja.vendeu.moeda} o que custou ${r.loja.comprou.moeda} — ` +
      'a loja virou uma impressora de moeda');
  });

  s.teste('o balcão de venda mostra o que o jogador NÃO tem, com o preço', () => {
    /* Ideia do dono, e ela é boa por um motivo que vale repetir: um catálogo que
       mostra o que você ainda não tem, com o preço, transforma a loja num MAPA
       DE OBJETIVOS. Esconder faria a lista encolher justamente para quem mais
       precisa de direção — o jogador novo. */
    ok(r.loja.naVenda.itens > 10,
      `só ${r.loja.naVenda.itens} item(ns) no balcão de venda`);
    ok(r.loja.naVenda.semTer > 0,
      'o balcão só mostra o que o jogador já tem — o mapa de objetivos some');
  });

  s.teste('fechar a loja EMUDECE e PARA o vídeo', () => {
    /* Regra literal do dono: *"ao fechar o som não é permitido ouvir, em aba
       alguma do site"*. Pausar sem emudecer deixaria o som voltar sozinho no dia
       em que alguém desse play por outro caminho. */
    ok(r.loja.fechou.fechada, 'a loja não fechou');
    igual(r.loja.fechou.mudo, true, 'o vídeo ficou com som depois de fechar');
    igual(r.loja.fechou.parado, true, 'o vídeo continuou tocando com a loja fechada');
  });

  s.teste('mandar a expedição PASSA por uma confirmação', () => {
    /* Ela existe porque a crítica que chegou de fora foi *"muito linear, site
       de velho"*: não havia instante em que o jogo PARASSE.

       O que se afirma aqui é que o pop-up ESTÁ NO CAMINHO, e não ao lado dele —
       clicar no ✓ sem conferir que ele existe passa verde quando a confirmação
       é apagada, porque aí o botão manda direto. */
    ok(r.bnIdle?.confirmou,
      'o botão mandou a expedição SEM confirmação. O clique errado passa a ' +
      'custar três criaturas e oito horas de Vigília.');
    ok(/stamina/i.test(r.bnIdle?.confTexto ?? ''),
      `o cartão da confirmação não fala de stamina: "${r.bnIdle?.confTexto}". ` +
      'A decisão real é essa — uma frase sem a barra obriga a IMAGINAR o que se ' +
      'está mandando.');
  });

  s.teste('a pokébola acesa é exatamente quem vai a campo', () => {
    /* Quarta aparição do mesmo símbolo, e a repetição é a vantagem. Mas um selo
       que diz o contrário do cartão em que ele mora é pior que selo nenhum: o
       jogador aprende que o símbolo mente. */
    igual(r.bnIdle?.bolasAntes, r.bnIdle?.escolhidas,
      `${r.bnIdle?.bolasAntes} bola(s) acesa(s) para ${r.bnIdle?.escolhidas} ` +
      'criatura(s) escolhida(s). A bola deixou de seguir a seleção.');
    ok(r.bnIdle?.escolhidas > 0,
      'a sonda não escolheu ninguém — sem seleção, a afirmação acima é vazia');
    /* ── E TEM DE HAVER UMA APAGADA PARA COMPARAR ────────────────────────
       Com UM cartão só, "acesas == escolhidas" vale 1 = 1 mesmo quando a bola
       acende sempre — e a sabotagem passa por baixo.

         > Uma igualdade entre duas contagens que só podem valer o mesmo número
         > não é uma medição: é uma tautologia.

       O caso que distingue é o MISTO: alguém escolhido e alguém não. */
    ok(r.bnIdle?.cartoes > r.bnIdle?.escolhidas,
      `a sonda viu ${r.bnIdle?.cartoes} cartão(ões) e ${r.bnIdle?.escolhidas} ` +
      'escolhido(s) — sem nenhum APAGADO, a comparação acima não distingue uma ' +
      'bola que segue a seleção de uma que acende sempre');
  });

  s.teste('a cena da captura MARCA o final, e o laudo fica de pé', () => {
    /* O marcador é o que dá cor à onda de choque e traz a criatura de volta.
       Sem ele os dois finais desenham exatamente igual — e dois finais
       desenhados igual é um final perdido, que é a mesma frase do selo da
       Pokébola no 1.20. */
    ok(!r.captura?.erro, `a sonda da captura falhou: ${r.captura?.erro}`);
    igual(r.captura.fugiu.marca, 'fugiu', 'o palco não foi marcado como fuga');
    igual(r.captura.pegou.marca, 'pegou', 'o palco não foi marcado como captura');
    ok(/cap-fugiu/.test(r.captura.fugiu.laudo ?? ''),
      `o laudo da fuga saiu com "${r.captura.fugiu.laudo}"`);
    ok(/cap-pegou/.test(r.captura.pegou.laudo ?? ''),
      `o laudo da captura saiu com "${r.captura.pegou.laudo}"`);
    /* A queixa que originou o bloco: *"ela só aparece embaixo do 'mandar
       expedição' e some rapidamente"*. O laudo NÃO some. */
    ok(r.captura.fugiu.aindaDePe && r.captura.pegou.aindaDePe,
      'o laudo sumiu sozinho — ele tem de ESPERAR ser lido, que é o pedido ' +
      'literal do dono e a metade do bloco que carrega a informação');
    ok(r.captura.fechou, 'o botão "continuar" não fechou a cena');
    /* ── A CENA TOCA MESMO COM "MENOS MOVIMENTO" (D-076) ─────────────────
       O contexto do Q5 roda com `reducedMotion: reduce`, que é exatamente o
       estado da máquina do dono. A cena tem de acontecer assim mesmo — o que o
       modo curto faz é ENCURTAR, e não apagar. */
    igual(r.captura.pegou.casa, '23',
      `a captura terminou na casa ${r.captura.pegou.casa}, e a bola travada é a ` +
      '23. Se ficou na 0, a cena foi PULADA — foi o defeito que o dono viu.');
    igual(r.captura.fugiu.casa, '12',
      `a fuga terminou na casa ${r.captura.fugiu.casa}, e a bola aberta é a 12. ` +
      'Uma fuga que termina com a bola FECHADA desenha o final errado.');
    ok(r.captura.pegou.casa !== r.captura.fugiu.casa,
      'os dois finais terminam no mesmo quadro — é a queixa do dono, literal: ' +
      '"ambas parecem a mesma coisa"');
    /* E quem foi capturado fica DENTRO da bola. */
    igual(r.captura.pegou.criaturaVisivel, false,
      'a criatura capturada continua desenhada sobre a bola travada — um final ' +
      'que mostra os dois estados sobrepostos não é um final');
    igual(r.captura.fugiu.criaturaVisivel, true,
      'quem escapou não reapareceu — a fuga precisa devolver o bicho');
    /* ── O MOVIMENTO DOS DOIS FINAIS TAMBÉM DIFERE ──────────────────────
       Ganhar termina com algo na mão; perder, com algo no chão. Duas animações
       com o mesmo nome desenham o mesmo gesto, e a queixa do dono volta. */
    ok(r.captura.pegou.animBola && r.captura.fugiu.animBola,
      'a bola não tem animação em algum dos finais — a cena foi pulada');
    ok(r.captura.pegou.animBola !== r.captura.fugiu.animBola,
      `os dois finais usam a MESMA animação ("${r.captura.pegou.animBola}"). ` +
      'É a queixa do dono, literal: "ambas parecem a mesma coisa".');
    /* E a escolha do jogador vence o sistema: o contexto do portão roda com
       "reduzir movimento" ligado, que é a máquina dele. */
    igual(r.captura.modoForcado, true,
      'forçar `pa.anim = cheia` não venceu o `prefers-reduced-motion` do ' +
      'sistema. Quem tem "reduzir animações" ligado sem querer fica sem a cena — ' +
      'e foi exatamente o que aconteceu com o dono.');
    /* ── E SEM ESCOLHA NENHUMA, COM "MENOS MOVIMENTO" LIGADO ────────────
       Este e o estado exato da maquina do dono no dia em que ele relatou o
       D-076, e e o unico caminho em que o defeito existia. As afirmacoes de
       cima forcam `cheia`, e forcar apaga o defeito. */
    igual(r.captura.semEscolha.cheia, false,
      'sem escolha do jogador e com "menos movimento" ligado, a cena se ' +
      'declarou CHEIA — entao este caminho nao esta sendo exercitado, e a ' +
      'afirmacao abaixo nao fala sobre o defeito que o dono viu');
    igual(r.captura.semEscolha.aconteceu, true,
      'com "menos movimento" ligado e sem escolha, a cena NAO ACONTECEU. E o ' +
      'D-076 literal: prefers-reduced-motion pede menos MOVIMENTO, e apagar o ' +
      'acontecimento inteiro responde outra pergunta.');
    igual(r.captura.semEscolha.anim, 'curta',
      `a cena saiu no modo "${r.captura.semEscolha.anim}" — o sistema pediu ` +
      'menos movimento e o modo curto e a resposta certa: ENCURTA, nao apaga');
    igual(r.captura.semEscolha.casa, '23',
      `no modo curto a captura terminou na casa ${r.captura.semEscolha.casa}, e ` +
      'a bola travada e a 23. O caminho reduzido tambem tem de por o QUADRO ' +
      'FINAL — sem ele o jogador ve um final que nao e o dele.');
    igual(r.captura.pegou.anim, 'cheia',
      `a cena saiu no modo "${r.captura.pegou.anim}" com a escolha forçada em cheia`);
    /* Dois vereditos e três balanços cada: o piso é generoso de propósito,
       porque o que se afirma é "soou", e não "soou exatamente assim". */
    ok(r.captura.osciladores >= 4,
      `a captura criou ${r.captura.osciladores} oscilador(es) — a cena está ` +
      'MUDA. O dono pediu som ao capturar e ao escapar, e um portão que só ' +
      'confere o desenho aprova uma animação sem som nenhum.');
  });

  s.teste('o cadeado do saldo comprado APARECE, com o número', () => {
    /* A regra mais importante da economia até agora, e ela é invisível sem o
       selo. Um cadeado que o jogador não vê é um saldo que ele acha que
       perdeu — e a primeira recusa de boost vira um relato de bug. */
    ok(r.som?.naArena?.cadeado, 'o selo do cadeado não existe na tela');
    igual(r.som.naArena.cadeado.visivel, true,
      'comprou 500 e o cadeado não apareceu. O saldo restrito ficou invisível, ' +
      'e com ele a razão de a próxima recusa acontecer.');
    igual(r.som.naArena.travado - r.som.naArena.travadoAntes, 500,
      `comprar 500 mudou o travado em ${r.som.naArena.travado - r.som.naArena.travadoAntes} — ` +
      'a compra não caiu no balde restrito, e sem ela ali o cadeado não existe');
    /* O SELO DIZ O NÚMERO, e o número é o TOTAL trancado — não o da última
       compra. "Parte do seu saldo" não deixa ninguém planejar; "🔒 7.996"
       deixa. A afirmação compara o selo com o valor real, e não com um número
       que eu tenha escrito à mão aqui. */
    const soDigitos = s => String(s).replace(/[^\d]/g, '');
    igual(soDigitos(r.som.naArena.cadeado.texto), String(r.som.naArena.travado),
      `o selo diz "${r.som.naArena.cadeado.texto}" e o travado é ` +
      `${r.som.naArena.travado} — o número na tela não é o número real`);
  });

  s.teste('e o som da CAPTURA soa nas rotas, e cala na arena', () => {
    /* A outra metade, e ela existe porque eu quebrei a primeira ao acrescentar
       som à captura: abri a trava para as duas telas de uma vez, e o hitbox da
       arena voltou a vazar para a aba das rotas.

         > A pergunta certa nunca foi "esta vista toca som?". É "este som
         > pertence a esta vista?".

       As duas afirmações têm de valer JUNTAS: uma sozinha aprova a correção
       grossa que reintroduz o defeito do dono. */
    igual(r.som.foraDaArena.soaCaptura, true,
      'com a aba das rotas aberta, o som da captura NÃO tocaria. O dono pediu ' +
      'som ao capturar e ao escapar; uma trava que emudece a tela inteira ' +
      'entrega uma animação muda.');
    igual(r.som.devolta.soaCaptura, false,
      'de volta na arena, o som da CAPTURA ainda tocaria — é o vazamento do ' +
      'dono ao contrário, e ele é igualmente errado: som de uma tela por cima ' +
      'de outra.');
    /* O PADRÃO DA TABELA É A ARENA, e ele é o lado seguro do erro: efeito novo
       que ninguém classificou fica preso onde a trava já era conservadora. Na
       aba das rotas, portanto, ele NÃO soa. */
    igual(r.som.foraDaArena.soaSemCasa, false,
      'um efeito que ninguém pôs numa casa tocou na aba das rotas. O padrão ' +
      'tem de ser a ARENA: som novo não classificado erra para o lado que ' +
      'cala, e não para o que vaza.');
  });


  /* ═══ O BANNER NO IDLE E QUEM ANDA NA CENA (1.6c) ═════════════════════ */

  s.teste('a sonda do idle conseguiu mandar uma expedição', () => {
    ok(!r.bnIdle?.erro, `a sonda falhou: ${r.bnIdle?.erro}`);
    ok(r.bnIdle.chipLigado,
      'nenhum bioma ficou selecionado depois de mandar. NÃO é defeito do ' +
      'produto necessariamente: pode ser a sonda não ter achado o botão. Se ' +
      'isto reprovar, conserte a sonda antes de acusar a tela.');
  });

  s.teste('quem anda na cena é quem foi a campo, e não o primeiro da caixa', () => {
    if (r.bnIdle?.erro || !r.bnIdle.dexAlvo) return;
    igual(r.bnIdle.naCena, r.bnIdle.dexAlvo,
      `foi mandado o dex ${r.bnIdle.dexAlvo} e a cena está desenhando ` +
      `${r.bnIdle.naCena}. É o relato do dono, duas vezes: "eu mandei um vulpix ` +
      'pra expedição e quem me acompanha é um squirtle", e depois "ele manda o ' +
      'primeiro Pokémon base". A cena lia a SELEÇÃO do seletor, que limpa ao ' +
      'mandar, e caía no primeiro da caixa.');
  });

  s.teste('num bioma sem expedição, a cena mostra a SELEÇÃO ao vivo', () => {
    if (r.bnIdle?.erro) return;
    /* A regra mudou por pedido do dono: *"ao clicar no pokémon do time [...]
       já é possível ver sua sprite no bioma [...] a troca precisa agir de forma
       simultânea"*. Um bioma sem ninguém é o bioma para onde ele está PRESTES
       a mandar; mostrar a escolha dele não inventa fato nenhum.

       O que continua proibido é o defeito original — cair no primeiro da caixa
       SEM seleção nenhuma, que não é nem fato nem intenção. Isso é afirmado em
       `test/idle-quem.mjs`, onde a regra mora e se testa em microssegundos. */
    ok(r.bnIdle.naCenaVazia != null,
      'num bioma sem expedição a cena não desenhou ninguém, com uma criatura ' +
      'selecionada no seletor. A prévia é o que torna a escolha visível antes ' +
      'de ela custar horas — é a mesma razão de a tela desenhar o bioma antes ' +
      'de cobrar as oito horas.');
  });

  s.teste('dá para selecionar OUTRA criatura, e não só a inicial (D-065)', () => {
    if (r.bnIdle?.erro) return;
    if (r.bnIdle.nCartoes < 2) return;   /* com um cartao so nao ha o que provar */
    ok(r.bnIdle.alvoLigado,
      `o clique no cartão da criatura NÃO a selecionou (${r.bnIdle.nCartoes} ` +
      'cartões na tela). Relato do dono: "só consigo escolher um pokémon". ' +
      'O cartão ganhou `data-dex` para a sonda saber quem foi mandado, e o ' +
      'seletor do INICIAL — `[data-dex]` solto num ouvinte de ' +
      'documento inteiro — passou a casar com ele primeiro, lançava "a criatura ' +
      'inicial só se escolhe uma vez" e matava o clique.');
  });

  s.teste('o seletor não oferece quem está guardado na caixa', () => {
    if (r.bnIdle?.erro) return;
    igual((r.bnIdle.guardadasOferecidas ?? []).length, 0,
      `o seletor ofereceu ${(r.bnIdle.guardadasOferecidas ?? []).length} criatura(s) ` +
      `da caixa (há ${r.bnIdle.naCaixaIds} guardadas). O jogador escolhe uma, ` +
      'clica em mandar, e só aí ouve "estão na caixa — tire-as antes". O dono ' +
      'leu essa recusa como uma regra que não existe: "dizia que só podia o ' +
      'inicial". Quem está na caixa se move no painel do Centro.');
  });

  s.teste('a aba abre no bioma onde a expedição está', () => {
    const rr = r.idleRecarregado ?? {};
    ok(!rr.erro, `a sonda de recarga falhou: ${rr.erro}`);
    if (!rr.ativa) return;   /* sem expedição viva, não há o que afirmar */
    igual(rr.chip, rr.ativa,
      `ao recarregar, a aba abriu em "${rr.chip}" e a expedição está em ` +
      `"${rr.ativa}". É o relato do dono: com o bicho farmando num lugar e a ` +
      'aba abrindo noutro, ele conclui que o jogo esqueceu quem ele mandou. ' +
      'A tela mostra primeiro o que ESTÁ acontecendo; o resto é um clique.');
  });

  s.teste('o banner do idle diz o lugar e o tempo, e nada de arena', () => {
    if (r.bnIdle?.erro) return;
    const t = r.bnIdle.rodape;
    ok(/restantes/.test(t),
      `o rodapé do banner do idle é "${t}". Ele existe para dizer onde o ` +
      'treinador está e quanto falta — sem isso é a mesma vitrine da arena ' +
      'noutra tela, e o dono pediu o contrário.');
    for (const proibido of ['odd', 'Odd', 'º de', 'de vida'])
      ok(!t.includes(proibido),
        `"${proibido}" apareceu no rodapé do idle: "${t}". No idle não entra ` +
        'informação de arena — é literal na lista do dono.');
  });

  s.teste('a arte do banner do idle é animada', () => {
    if (r.bnIdle?.erro || !r.bnIdle.arteSrc) return;
    ok(/\.gif(\?|$)/i.test(r.bnIdle.arteSrc),
      `a arte do banner é "${r.bnIdle.arteSrc.slice(-60)}", que não é GIF. É a ` +
      'regra permanente do dono (L-080): todo sprite mostrado ao jogador é ' +
      'animado, normal e shiny. E a grade de escolha, ao lado na customização, ' +
      'já é animada — escolher vendo o GIF e receber um PNG é a pior ordem.');
  });

  /* O SEGUNDO DEFEITO, e ele é de nitidez e não de forma: o buffer aparece
     noutro tamanho, e ampliação NÃO INTEIRA com vizinho-mais-próximo produz
     colunas de pixel de larguras diferentes. A asserção é sobre a RAZÃO entre
     buffer e tela ser >= 1: o buffer tem de ter resolução sobrando, para a
     escala ser redução (que suaviza) em vez de ampliação (que duplica). */
  s.teste('o buffer da arena tem resolução para a tela em que aparece', () => {
    for (const a of r.arena) {
      if (a.erro) continue;
      ok(a.bufW > 0 && a.telaW > 0, `${a.nome}: canvas mediu ${a.bufW}/${a.telaW}`);
      ok(a.bufW >= a.telaW,
        `${a.nome}: buffer de ${a.bufW}px numa tela de ${a.telaW.toFixed(0)}px — ` +
        `ampliação de ${(a.telaW / a.bufW).toFixed(2)}×, não inteira, e o serrilhado fica irregular`);
    }
  });

  /* Q6 · O PAINEL NÃO ABRE SEM SERVIDOR (R9).
     Esta caixa serve arquivos estáticos e não tem backend. Se o painel abrir
     aqui, é porque existe de novo um caminho local — e um caminho local não tem
     papel, não tem segundo fator e não tem registro de operador. É a garantia
     inteira do bloco, medida no navegador de verdade. */
  s.teste('o painel de ADM não abre sem servidor', () => {
    const p = r.painel;
    ok(!p.admAbriuSemServidor,
      'o painel de ADM abriu sem servidor no ar: o caminho local voltou por alguma porta');
  });

  /* E o que ele DESENHA continua sendo o número do registro, e não uma segunda
     contagem — a pergunta original deste teste, que sobrevive ao R9. */
  s.teste('o painel de ADM mostra a MESMA margem do registro', () => {
    const p = r.painel;
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
  /* O TESTE QUE TERIA PEGO O D-037, e que não existia. */
  s.teste('as duas fontes do tema carregam de verdade', () => {
    const f = r.fontes;
    ok(f, 'a sonda de fontes não rodou');
    ok(f.folhaAceita,
      'a folha de fontes não entrou em `document.styleSheets`. O navegador a ' +
      'RECUSOU — quase sempre por MIME: servida sem extensão ela sai como ' +
      '`application/octet-stream`, e folha de estilo precisa de `text/css` (D-037).');
    ok(f.faces > 0,
      `nenhuma face de fonte registrada (document.fonts.size = ${f.faces}). ` +
      `O tema inteiro está caindo para o fallback do sistema.`);
    /* Larguras iguais ao monoespaçado do sistema = a família pedida não existe
       e o navegador desenhou com outra coisa. */
    ok(Math.abs(f.orbitron - f.base) > 1,
      `"Orbitron" desenha o mesmo texto com a mesma largura do fallback ` +
      `(${f.orbitron.toFixed(1)} contra ${f.base.toFixed(1)}) — ela não está em uso`);
    ok(Math.abs(f.press - f.base) > 1,
      `"Press Start 2P" desenha igual ao fallback ` +
      `(${f.press.toFixed(1)} contra ${f.base.toFixed(1)}) — ela não está em uso`);
    ok(Math.abs(f.orbitron - f.press) > 1,
      'as duas famílias do tema desenham igual entre si — as duas caíram no ' +
      'mesmo fallback, e o letrado do produto não existe na tela');
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
