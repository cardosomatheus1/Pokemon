/* OLHAR — captura as telas do jogo em PNG, para leitura humana.
 *
 * É o passo 6 do ciclo do bloco (`CLAUDE.md`). NÃO é portão: não reprova nada,
 * não compara com nada. Ele produz o que um portão não sabe produzir — uma
 * imagem para alguém ler.
 *
 * POR QUE ISTO EXISTE. No V1.15 três defeitos passaram por 299 testes verdes:
 * um rótulo transbordando o cartão e cobrindo a arte, uma coluna inteira
 * empurrada para fora da dobra, e um campo estreito demais para o próprio
 * placeholder. Nenhum é erro de execução; todos são erros de leitura. O portão
 * Q5 prova que a página FUNCIONA — legibilidade é outra pergunta.
 *
 * AS LARGURAS NÃO SÃO ARBITRÁRIAS: são aquelas em que o layout muda de FORMA.
 * 1920 existe porque o `.app` tem `max-width: 1790px` e o arranjo de cinco
 * colunas só aparece acima disso — a linha de base visual captura em 1440, 1000
 * e 480, e por isso não enxerga esse arranjo (ver D-010).
 *
 * A RAIZ É FIXA por padrão, para que duas execuções sejam comparáveis: mesma
 * pool, mesma arena, mesmo clima. `--raiz aleatoria` desliga isso quando se quer
 * variedade — útil para conferir arenas diferentes.
 *
 * Uso:
 *   node tools/olhar-telas.mjs                    todas as telas, raiz fixa
 *   node tools/olhar-telas.mjs --saida /tmp/x     outro destino
 *   node tools/olhar-telas.mjs --raiz aleatoria   pool e arena variadas
 *
 * Dependência: `playwright-core`, o mesmo do portão Q5. Ver tools/README.md.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, sep } from 'node:path';

const RAIZ_REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PW = '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const SAIDA = arg('--saida', join(RAIZ_REPO, '.telas'));
const RAIZ_FIXA = arg('--raiz', 'fixa') !== 'aleatoria';

if (!existsSync(PW) || !existsSync(CHROME)) {
  console.error('playwright-core ou o Chromium não estão instalados — ver tools/README.md');
  process.exit(2);
}
mkdirSync(SAIDA, { recursive: true });

const MIME = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript', '.js':'text/javascript',
               '.css':'text/css', '.png':'image/png', '.gif':'image/gif', '.jpg':'image/jpeg', '.mp3':'audio/mpeg' };

const srv = await new Promise(res => {
  const s = createServer((q, r) => {
    const p = join(RAIZ_REPO, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(RAIZ_REPO + sep) || !existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    r.end(readFileSync(p));
  });
  s.listen(0, '127.0.0.1', () => res({ s, porta: s.address().port }));
});

const { chromium } = await import(PW);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const erros = [];
const avisos = [];

/* O `waitForFunction` roda no navegador e não pode importar módulo; por isso o
   estado é espelhado numa global ANTES de qualquer captura. Fica só aqui, na
   ferramenta — o app não sabe que ela existe. */
const ESPELHAR_ESTADO = `import('/app/modules/estado.mjs')
  .then(m => { globalThis.__olhar_S = m.S; }).catch(() => {});`;

async function abrir(largura, altura, preparar) {
  const ctx = await b.newContext({ viewport: { width: largura, height: altura } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  /* SESSÃO ATIVA: sem ela o boot cai na home e a arena nunca aparece. Custou uma
     rodada inteira de capturas descobrir isso. */
  await pg.addInitScript(() => { try { localStorage.setItem('ar_session', '1'); } catch {} });
  await pg.addInitScript(ESPELHAR_ESTADO);
  /* A RAIZ DA RODADA É PLANTADA NO BOOT quando a captura pede o caso do §28.5.
     Medido: o consumo de `crypto.getRandomValues` na partida do app é
     `Uint8Array(8)` (id de sessão) → **`Uint32Array(1)` (a raiz)** →
     `Uint8Array(16)` (o sal do commit). O primeiro inteiro de 32 bits é a raiz,
     e é só ele que este roteiro troca — o resto passa direto. */
  if (preparar === 'favoritoVence') await pg.addInitScript(r => {
    const orig = crypto.getRandomValues.bind(crypto);
    let usada = false;
    crypto.getRandomValues = a => {
      if (!usada && a instanceof Uint32Array && a.length === 1) { usada = true; a[0] = r; return a; }
      return orig(a);
    };
  }, RAIZES_FAVORITO_VENCE[0]);
  if (RAIZ_FIXA) await pg.addInitScript(() => {
    let n = 0x51117777 >>> 0;
    crypto.getRandomValues = a => {
      for (let i = 0; i < a.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; a[i] = n; }
      return a;
    };
  });
  if (typeof preparar === 'function') await preparar(pg);
  await pg.goto(`http://127.0.0.1:${srv.porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  /* Esperar ESTADO, não relógio: a rodada custa ~5 s de Monte Carlo e a espera
     fixa pegaria o meio do "calculando odds" numa máquina mais lenta. */
  await pg.waitForFunction(() => {
    const f = document.querySelector('#phase')?.textContent;
    return f && f !== '—' && document.querySelectorAll('.pick').length > 0;
  }, { timeout: 90000, polling: 250 }).catch(() => avisos.push('a fase de apostas não abriu a tempo'));
  await pg.waitForTimeout(1000);
  return { ctx, pg };
}

async function tela(nome, largura, altura, roteiro, preparar) {
  const { ctx, pg } = await abrir(largura, altura, preparar);
  if (roteiro) await roteiro(pg);
  await pg.screenshot({ path: join(SAIDA, nome + '.png') });
  /* Rolagem horizontal é defeito de layout, sempre — e é barato conferir aqui,
     já que a página está aberta. */
  const r = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  if (r.doc > r.win) avisos.push(`${nome}: ROLAGEM HORIZONTAL (documento ${r.doc}px em janela ${r.win}px)`);
  await ctx.close();
  console.log(`  ${nome}.png`);
}

const emLuta = async pg => {
  await pg.$eval('#btnStart', el => el.click()).catch(() => {});
  /* Espera por QUEDAS NA LISTA, e não por um placar de abates: o V1.16 fundiu
     as três listas numa só e `#kfTotal` deixou de existir. Sinal que sobrevive
     à fusão: linhas marcadas como caídas dentro da própria lista. */
  await pg.waitForFunction(() => document.querySelectorAll('#pickList .pick.fechado').length >= 2,
    { timeout: 60000, polling: 400 }).catch(() => avisos.push('a luta não chegou a duas quedas'));
  await pg.waitForTimeout(400);
};

console.log(`capturando em ${SAIDA} (raiz ${RAIZ_FIXA ? 'fixa' : 'aleatória'})\n`);

/* AS QUATRO LARGURAS EM QUE O LAYOUT MUDA DE FORMA. 1920 está aqui porque é a
   única acima do `max-width` do `.app` — é onde o arranjo de cinco colunas
   existe, e é justamente o que a linha de base visual não cobre (D-010). */
for (const [nome, w, h] of [['arena-1920',1920,1000], ['arena-1440',1440,900],
                            ['arena-1100',1100,900], ['arena-420',420,900]])
  await tela(nome, w, h);

await tela('luta', 1440, 900, emLuta);
await tela('luta-larga', 1920, 1000, emLuta);

await tela('aposta-feita', 1440, 900, async pg => {
  await pg.evaluate(async () => {
    const banco = await import('/app/modules/banco.mjs');
    banco.creditarCompra(20000, 'olhar');
    document.querySelector('.pick')?.click();
  });
  await pg.waitForTimeout(600);
});

/* ── AS TRÊS TELAS DE RESULTADO (F1.9, §28.5) ──────────────────────────────
 *
 * O Q5 do F1.9 pede as três, e a terceira é a razão do bloco: **retorno
 * positivo MENOR OU IGUAL à aposta**. Ela não acontece sozinha nesta base — as
 * odds da Arena são todas maiores que 1 —, então é preciso forçá-la, e forçar é
 * legítimo: o caso existe em produção com `floor(30 × 1,03)`, e vai existir de
 * sobra quando o mercado mútuo do V2 chegar.
 *
 * O ROTEIRO APOSTA DE VERDADE e deixa a rodada correr; só o desfecho é
 * ajustado, e o `finish()` roda outra vez com o estado ajustado. É por isso que
 * a captura mostra a tela DO PRODUTO, e não um HTML montado à mão para a foto —
 * que seria uma captura provando que o gerador da captura funciona. */
/* ── A RAIZ EM QUE O FAVORITO VENCE ────────────────────────────────────────
 *
 * A captura do §28.5 — acertar o campeão e o retorno não passar da aposta —
 * dependia de sorte: o cliente não pode saber o campeão antes (é o
 * commit-reveal funcionando), então apostar no favorito acerta em ~1 de 6, e
 * uma medição deu oito erros seguidos.
 *
 * Estas raízes foram procuradas offline, com os 154.000 sims de verdade, e em
 * todas o favorito É o campeão. Fixando a raiz, a captura vira determinística.
 *
 * `novaRaiz()` lê `crypto.getRandomValues(new Uint32Array(1))[0]`, então
 * plantar a raiz é plantar esse primeiro inteiro. Não é o app sabendo o
 * campeão: é o ARNÊS escolhendo qual rodada fotografar, do lado de fora. */
const RAIZES_FAVORITO_VENCE = [2, 4, 5, 6, 9];

const resultado = (ajuste, nome = 'resultado') => async pg => {
  /* ── DUAS COISAS QUE ESTE ROTEIRO APRENDEU DA PIOR FORMA ─────────────────
   *
   * 1. A LUTA É EM TEMPO REAL, e headless não espera 45 s de animação. As
   *    primeiras capturas voltaram com "a rodada não chegou ao resultado" três
   *    vezes. `S.speed` já existe e multiplica o tempo durante a luta — é o
   *    mesmo controle que o jogador tem, acelerado.
   *
   * 2. NÃO SE FORJA ESTADO NO MEIO DA LUTA. A versão anterior escrevia em
   *    `S.myBet.idx` durante a animação para forçar o desfecho, e produzia três
   *    `pageerror` — `imgTag` estourando com lutador indefinido. Medido contra
   *    uma rodada natural: **zero erros**. Ou seja, o erro era do arnês criando
   *    um estado que o produto não alcança, e a captura estaria fotografando
   *    uma tela que não existe.
   *
   * O ajuste do desfecho entra ANTES da luta começar, quando `S.myBet` é o que
   * o jogador acabou de montar e nada está animando. `odd` é campo do ticket e
   * mexer nele ali é o que um mercado com odd abaixo de 1 fará sozinho no V2. */

  /* A ESPERA É PELA LISTA, e não só pelo estado. Os lutadores aparecem alguns
     quadros depois de a fase virar `betting`, e clicar antes disso não aposta
     em ninguém — foi o que fez a primeira verificação deste roteiro dizer
     "sem aposta" e me convencer, errado, de que a semente fixa não funcionava. */
  await pg.waitForFunction(() =>
    globalThis.__olhar_S?.state === 'betting' && document.querySelectorAll('.pick').length > 0,
    { timeout: 120000, polling: 250 }).catch(() => avisos.push('não abriu janela de aposta'));

  const raiz = await pg.evaluate(async aj => {
    const { S } = await import('/app/modules/estado.mjs');
    S.auto = false;
    S.speed = 12;
    const b = document.querySelector('#btnAuto');
    if (b) { b.textContent = 'Auto: OFF'; b.classList.remove('on'); }
    const banco = await import('/app/modules/banco.mjs');
    banco.creditarCompra(20000, 'olhar');
    document.querySelector('.pick')?.click();
    if (S.myBet && aj.odd) S.myBet.odd = aj.odd;
    return S.seeds?.raiz ?? null;
  }, ajuste);

  await pg.waitForTimeout(300);
  await pg.$eval('#btnStart', el => el.click()).catch(() => {});

  /* O desfecho não é forçado: aposta-se no campeão ou em outro, e quem decide é
     a simulação. `espiarCampeao` não existe no cliente — e não pode existir,
     porque saber o campeão antes é o que o commit-reveal impede. Então o
     roteiro pede o desfecho e ACEITA o que vier, anotando qual saiu. */
  await pg.waitForFunction(r => {
    const s = globalThis.__olhar_S;
    return s && s.state === 'result' && s.seeds?.raiz === r;
  }, raiz, { timeout: 180000, polling: 300 }).catch(() => avisos.push('a rodada não chegou ao resultado'));
  await pg.waitForTimeout(700);

  const desfecho = await pg.evaluate(() => {
    const s = globalThis.__olhar_S;
    if (!s?.myBet) return 'sem aposta';
    return s.myBet.idx === s.champ ? 'acertou' : 'errou';
  });
  /* O DESFECHO É SORTEADO E O RELATÓRIO DIZ QUAL SAIU. O cliente não pode saber
     o campeão antes — é o commit-reveal funcionando —, então a captura de
     "acertou" é loteria: oito tentativas seguidas deram erro numa medição.
     Anotar qual saiu evita que alguém olhe `resultado-devolvido.png` achando
     que está vendo o caso do §28.5 quando está vendo uma derrota. Ver L-037. */
  avisos.push(`${nome}: desfecho sorteado = ${desfecho}` +
              (ajuste.odd === 1 && desfecho !== 'acertou'
                ? ' — NÃO é o caso do §28.5; refaça até sair "acertou"' : ''));
};

/* Duas rodadas de odd normal: o desfecho é o que a simulação der, e as duas
   capturas juntas costumam cobrir acerto e erro. */
await tela('resultado-a', 1440, 900, resultado({}, 'resultado-a'));
await tela('resultado-b', 1440, 900, resultado({}, 'resultado-b'));
/* ODD 1,00 é a captura que o F1.9 existe para produzir: acertar o campeão e
   receber exatamente o que apostou. É o caso que o BUILD_BLOCKS dizia que "hoje
   não existe" e que a tela comemorava — ver o D-012. */
await tela('resultado-devolvido', 1440, 1500, resultado({ odd: 1.0 }, 'resultado-devolvido'), 'favoritoVence');
await tela('resultado-devolvido-420', 420, 1500, resultado({ odd: 1.0 }, 'resultado-devolvido-420'), 'favoritoVence');

await tela('perfil', 1100, 1500, async pg => {
  await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const { saveProfile } = await import('/app/modules/perfil.mjs');
    const sh = await import('/app/modules/shiny-dados.mjs');
    S.profile.xp = 40000;
    sh.desbloquear(S.profile, 6, 99); sh.alternar(S.profile, 'skin', 6);
    saveProfile(S.profile);
    (await import('/app/modules/customizacao.mjs')).renderProfile();
    document.querySelector('#profileModal')?.classList.add('show');
  });
  await pg.waitForTimeout(800);
});

/* A TELA DE PROTEÇÃO (§28.7), nas duas larguras que importam para ela: a de
   mesa e a estreita. Ela é a tela que o jogador procura quando quer parar, e a
   Spec pede que esteja a no máximo dois níveis da carteira — capturar as duas
   é o jeito de conferir que ela cabe, e não só que ela abre. */
for (const [nome, w, h] of [['protecao', 1440, 1200], ['protecao-420', 420, 1200]])
  await tela(nome, w, h, async pg => {
    await pg.evaluate(async () => {
      const nav = await import('/app/modules/navegacao.mjs');
      nav.openModal('#protecaoModal');
    });
    /* Sem servidor no ar, a tela mostra o estado de indisponibilidade — e é
       justamente esse estado que precisa ser legível: é o que o jogador vê
       quando a rede cai no momento em que ele foi ali se proteger. */
    await pg.waitForTimeout(1200);
  });

await tela('adm', 1440, 1400, async pg => {
  await pg.evaluate(async () => (await import('/app/modules/adm.mjs')).admAbrir());
  await pg.waitForTimeout(800);
});

/* A prova do cosmético: MESMA raiz, mesma pool, mesma arena — muda só a pele.
   Sem fixar a raiz as duas capturas não seriam comparáveis, e "o shiny mudou
   alguma coisa?" viraria opinião. */
for (const [nome, ligado] of [['shiny-nao', false], ['shiny-sim', true]]) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  await pg.addInitScript(() => { try { localStorage.setItem('ar_session', '1'); } catch {} });
  await pg.addInitScript(() => {
    let n = 0x51117777 >>> 0;
    crypto.getRandomValues = a => {
      for (let i = 0; i < a.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; a[i] = n; }
      return a;
    };
  });
  if (ligado) await pg.addInitScript(() => {
    const p = { xp: 40000, shiny: { gifs: [], skins: [], onGif: {}, onSkin: {} } };
    for (let d = 1; d <= 151; d++) {
      p.shiny.gifs.push(d); p.shiny.skins.push(d); p.shiny.onGif[d] = true; p.shiny.onSkin[d] = true;
    }
    try { localStorage.setItem('ar_profile', JSON.stringify(p)); } catch {}
  });
  await pg.goto(`http://127.0.0.1:${srv.porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0,
    { timeout: 90000, polling: 250 }).catch(() => {});
  await emLuta(pg);
  await (await pg.$('#arena')).screenshot({ path: join(SAIDA, nome + '.png') });
  await ctx.close();
  console.log(`  ${nome}.png`);
}

await b.close(); srv.s.close();
console.log(`\nerros de página: ${erros.length ? erros.join(' · ') : 'nenhum'}`);
console.log(`avisos de layout: ${avisos.length ? '\n  ' + avisos.join('\n  ') : 'nenhum'}`);
console.log('\nAgora OLHE as imagens. Verde não é legível.');
