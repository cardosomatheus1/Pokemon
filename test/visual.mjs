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
import { criarSuite, igual, ok } from './harness.mjs';
import { digital as digitalNode, rodada as rodadaNode } from './rodada-digital.mjs';
import { sortearArena } from '../app/modules/arenas-dados.mjs';
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
const LARGURAS = [
  { nome: 'panoramico', w: 1920, h: 1000 },
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
  for (const chave of Object.keys(base)) {
    const a = atual[chave], b = base[chave];
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

  const colocacaoViva = await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    return {
      fase: S.state,
      mortos: (S.ents || []).filter(e => !e.alive).length,
      caidosNoQuadro: document.querySelectorAll('#pickList .pick.fechado').length,
      linhas: document.querySelectorAll('#pickList .pick').length,
      contagemDepois: S.profile.betsCount,
    };
  }).catch(e => ({ erro: String(e).split('\n')[0] }));
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
  return { erros, conhecidos, apostas, aoVivo, relogio, folhas: cache.size, erroDepois, jogo, corte, cancelamento, painel, contagem, colocacaoViva, houveQueda, tema, ...st };
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
  const pronto = await pg.waitForFunction(
    () => document.querySelectorAll('.pick').length > 0,
    { timeout: 90000, polling: 300 }).then(() => true).catch(() => false);
  await pg.waitForTimeout(2500);
  const st = await pg.evaluate(() => ({
    lutadores: document.querySelectorAll('.mon').length,
    comFolha: [...document.querySelectorAll('.mon .body')]
      .filter(e => e.style.backgroundImage.includes('assets/')).length,
    retratos: document.querySelectorAll('.pick img').length,
    retratosLocais: [...document.querySelectorAll('.pick img')]
      .filter(i => i.currentSrc.includes('/assets/') && i.naturalWidth > 0).length,
  }));
  await b.close(); s.close();
  return { erros, bloqueadas, pronto, ...st };
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
    ok(r.pronto, 'a fase de apostas não abriu sem rede');
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
  s.teste('a linha de base cobre as telas e larguras declaradas', () => {
    const esperado = 4 * LARGURAS.length;
    ok(Object.keys(base).length === esperado,
      `linha de base tem ${Object.keys(base).length} entradas, ` +
      `esperado ${esperado} (4 telas x ${LARGURAS.length} larguras)`);
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
    const acima = LARGURAS.filter(L => L.w > teto);
    ok(acima.length > 0,
      `o .app para de crescer em ${teto}px e a maior largura capturada é ` +
      `${Math.max(...LARGURAS.map(L => L.w))}px — o arranjo completo, com as ` +
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
  s.teste('D-008 · três cliques de aposta contam UMA aposta', () => {
    const c = r.contagem, v = r.colocacaoViva;
    ok(c && !c.erro, `não deu para exercitar a contagem: ${c?.erro}`);
    ok(v && !v.erro, `não deu para reler o perfil: ${v?.erro}`);
    ok(c.apostaViva, 'os cliques não deixaram aposta viva — o cenário não foi exercitado');
    igual(v.contagemDepois, c.antes + 1,
      `três cliques (escolher + trocar + trocar) contaram ${v.contagemDepois - c.antes} apostas. ` +
      `A aposta só entra na estatística quando a janela FECHA — ver D-008.`);
  });

  s.teste('a colocação está viva durante a luta, não só correta no fim', () => {
    const v = r.colocacaoViva;
    ok(v && !v.erro, `não deu para ler a colocação viva: ${v?.erro}`);
    igual(v.linhas, 12, `${v.linhas} linhas no quadro durante a luta`);
    ok(r.houveQueda, 'nenhuma queda em 45 s de luta — o cenário não foi exercitado');
    ok(v.mortos > 0, `a espera acusou queda mas ${v.mortos} lutadores estão caídos`);
    igual(v.caidosNoQuadro, v.mortos,
      `${v.mortos} lutadores caídos e ${v.caidosNoQuadro} marcados no quadro. A ordem de quedas ` +
      `precisa vir do MESMO gancho que credita o abate — a conferência do fim corrige tudo e ` +
      `esconderia isto.`);
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
    ok(/até|fechado/i.test(c.limiteNaLista),
      `a linha mostra "${c.limiteNaLista}", que não comunica limite nem fechamento`);
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
