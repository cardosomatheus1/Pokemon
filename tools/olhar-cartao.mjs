/* OLHAR O CARTÃO — fotografa o painel da equipe DE PERTO, nos dois modos.
 *
 * ── POR QUE UMA TERCEIRA FERRAMENTA DE OLHAR ─────────────────────────────
 *
 * O `olhar-idle.mjs` fotografa a aba inteira, e nela o cartão da criatura é um
 * pedaço de 90 px numa página de 2 500. Para decidir o que cabe DENTRO do
 * cartão isso é inútil: a decisão é sobre DENSIDADE, e densidade só se julga de
 * perto.
 *
 *   > O dono reprovou este cartão duas vezes em sentidos opostos — "bagunça
 *   > total" em 04/09 e "você removeu as informações de stats" em 10/09 — e as
 *   > duas vezes ele estava olhando o cartão, não a aba.
 *
 * ── E ELA FOTOGRAFA OS DOIS MODOS ────────────────────────────────────────
 *
 * O botão que alterna compacto/ficha mora no CABEÇALHO do painel, e por isso o
 * recorte o inclui: fotografar só a lista mostraria os dois estados sem mostrar
 * o que leva de um ao outro.
 *
 * ── O QUE ELA RELATA, ALÉM DA FOTO ───────────────────────────────────────
 *
 *   cartoes   quantos nasceram
 *   caixa     a largura × altura REAL do primeiro. É o número que diz se a
 *             grade está dando o espaço — foi ele que denunciou o `width:104px`
 *             fixo sobrevivente do tempo do flex, com o cartão RECUSANDO os
 *             141 px que a coluna lhe dava
 *   pedacos   quantos <span>/<i>/<u>/<b>/<s>/<em> o cartão carrega. É o número
 *             que o dono reprovou quando era dez, e o que ele cobrou de volta
 *   texto     o `textContent` achatado — para ler o que o cartão DIZ sem abrir
 *             a foto, e para o relatório do bloco poder citá-lo
 *
 * ── E ELA ABORTA EM VEZ DE SEGUIR ────────────────────────────────────────
 *
 * Mesma regra do `olhar-idle`, pelo mesmo motivo: uma ferramenta de OLHAR que
 * erra a tela produz evidência FALSA, e evidência falsa é pior que nenhuma —
 * ninguém desconfia de uma foto bonita.
 *
 * Uso:
 *   node tools/olhar-cartao.mjs
 *   node tools/olhar-cartao.mjs --saida /tmp/x
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SAIDA = arg('--saida') || join(RAIZ, 'tools/previas/_cartao');
mkdirSync(SAIDA, { recursive: true });

/* DUAS larguras, e não quatro: o cartão não muda de arranjo entre 1920 e 1440 —
   quem muda é a página em volta, e essa o `olhar-idle` já fotografa. O que
   muda o cartão é a COLUNA da grade, e ela muda em 520 px. */
const LARGURAS = [
  { nome: 'largo',    w: 1440, h: 1200 },
  { nome: 'estreito', w:  420, h: 1600 },
];

/* ── E UMA FOTO DE PERTO, A 3× ────────────────────────────────────────────
 *
 * A foto do painel mostra o ARRANJO — quantas colunas, onde o rodapé cai, se
 * os seis têm a mesma altura. Ela não mostra a DENSIDADE, e densidade é a
 * pergunta deste bloco: o número cabe dentro da barra? o rótulo de 8 px ainda
 * se lê? a pista da barra tem contraste contra o preenchimento?
 *
 * Num cartão de 147 px essas três respostas ocupam nove pixels de altura cada,
 * e nove pixels não se julgam — se adivinham. Então o primeiro cartão volta
 * sozinho, a 3×, e aí a resposta é leitura e não palpite.
 *
 *   > Foi exatamente esta foto que faltou em 04/09 e em 10/09: as duas queixas
 *   > do dono eram sobre o que está DENTRO do cartão, e as duas vezes eu
 *   > estava olhando a aba. */
const PERTO = 3;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain',
};

const srv = createServer((q, r) => {
  const p = decodeURIComponent((q.url || '/').split('?')[0]);
  const f = join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !existsSync(f) || !extname(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(res => srv.listen(0, '127.0.0.1', res));
const porta = srv.address().port;

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/* O estado vai pela MESMA função que o jogo usa para salvar — um JSON escrito à
   mão envelheceria no primeiro bloco a mudar o formato, e mentiria em silêncio
   a partir dali. */
const PLANTAR = async () => {
  const D = await import('/app/modules/idle-dados.mjs');
  const P = await import('/app/modules/perfil-dados.mjs');
  const { PACK } = await import('/app/modules/motor.mjs');
  const agora = Date.now();

  /* O TREINADOR PRIMEIRO: sem perfil a aba abre como visitante e não pinta. */
  const perfil = P.loadProfile();
  perfil.name = perfil.name || 'Treinador';
  perfil.since = perfil.since || agora;
  P.saveProfile(perfil);

  const e = D.VAZIO();
  D.escolherInicial(e, PACK, PACK.iniciais[0], agora);
  const extras = (PACK.especies ?? []).filter(x => x.dex !== PACK.iniciais[0]).slice(0, 5);
  for (const esp of extras)
    e.criaturas.push(D.criarCriatura(PACK, esp.dex, 'captura', agora,
      String(esp.dex).padStart(12, 'a') + 'f0'));

  /* NÍVEIS ESPALHADOS, e pelo menos um acima do 12 para o selo do foco existir.
     Um time todo no mesmo nível desenha seis cartões idênticos, e seis cartões
     idênticos não mostram o arranjo — mostram que ele existe. */
  const niveis = [7, 14, 22, 31, 44, 58];
  const xps    = [60, 320, 1100, 3000, 11000, 26000];
  e.criaturas.forEach((c, i) => {
    c.nivel = niveis[i] ?? 20; c.xp = xps[i] ?? 0; c.vinculo = i * 17;
  });
  if (e.criaturas[1]) e.criaturas[1].foco = 'vigia';

  /* PEDRAS NA BOLSA: o selo da evolução muda de forma quando o item já está
     lá — sem elas a foto mostra um só dos estados do selo. */
  e.bolsa = { pokecoin: 1240, poke: 12, fogo: 2, agua: 1, lua: 1, brilho: 1 };
  e.registro = Object.fromEntries((PACK.especies ?? []).slice(0, 30).map(y => [y.dex, 3]));

  D.salvar(e);
  return { criaturas: e.criaturas.length };
};

/* O recorte: o painel da equipe COM o cabeçalho, porque o botão que alterna o
   modo mora nele. `boundingBox` do painel inteiro, com uma folga de 8 px. */
const FOLGA = 8;

const relato = [];
for (const L of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: L.w, height: L.h } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', err => erros.push(err.message));

  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.evaluate(PLANTAR);
  await pg.reload({ waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(1200);

  /* Pelo BOTÃO, e não mexendo em classe: um `classList.add` pularia o código
     que pinta a tela, que é exatamente onde um defeito de ligação se esconde. */
  const aba = await pg.$('[data-view="viewIdle"]');
  if (!aba) throw new Error(
    'o botao da aba ROTAS nao existe ([data-view="viewIdle"]). Seguir sem ele ' +
    'produziria fotos da tela errada com relatorio verde.');
  await aba.click();
  await pg.waitForTimeout(2200);

  for (const modo of ['compacto', 'ficha']) {
    /* Chega ao modo pelo BOTÃO também, e confere que chegou. O rótulo diz para
       onde LEVA, e não onde está — então "ficha" no botão significa compacto na
       tela, e ler isso ao contrário já custou uma leitura inteira. */
    const estaEm = await pg.evaluate(() =>
      document.querySelector('#idleModoCartao')?.classList.contains('on') ? 'ficha' : 'compacto');
    if (estaEm !== modo) {
      const bt = await pg.$('#idleModoCartao');
      if (!bt) throw new Error(
        'o botao que alterna o modo do cartao nao existe (#idleModoCartao). Sem ' +
        'ele esta ferramenta fotografaria o mesmo modo duas vezes e chamaria ' +
        'de dois.');
      await bt.click();
      await pg.waitForTimeout(700);
    }

    const m = await pg.evaluate(() => {
      const painel = document.querySelector('#idleEquipe');
      const cartoes = painel ? [...painel.querySelectorAll('.idleCria')] : [];
      const c0 = cartoes[0];
      const cx = c0?.getBoundingClientRect();
      const achatar = t => (t || '').replace(/\s+/g, ' ').trim();
      return {
        cartoes: cartoes.length,
        caixa: cx ? `${Math.round(cx.width)}x${Math.round(cx.height)}` : null,
        pedacos: c0 ? c0.querySelectorAll('span,i,u,b,s,em').length : 0,
        texto: achatar(c0?.textContent),
        colunas: painel ? getComputedStyle(painel).gridTemplateColumns.split(' ').length : 0,
        /* ── O RÓTULO NÃO PODE TRANSBORDAR A COLUNA DELE ────────────────
           "ATQ" em 8 px de Press Start 2P mede ~25 px, e numa coluna de 20 o
           preenchimento da barra cobria o Q. Não é erro de execução, a suíte
           inteira fica verde, e só aparece para quem OLHA — que é a classe
           exata dos três defeitos que passaram por 299 testes no V1.15.

           Descoberto a olho uma vez; a segunda vez esta sonda pega. */
        transbordos: (() => {
          const fora = [];
          for (const u of (c0 ? c0.querySelectorAll('.fLinha u') : []))
            if (u.scrollWidth > Math.ceil(u.getBoundingClientRect().width) + 1)
              fora.push(`${u.textContent}: ${u.scrollWidth}px em ` +
                        `${Math.round(u.getBoundingClientRect().width)}px`);
          return fora;
        })(),
        /* O rodapé tem de ocupar a linha inteira: com grade ele vira uma CÉLULA
           e a frase ocupa o lugar do quinto cartão, no meio da lista. */
        rodapeNaLinha: (() => {
          const r = painel?.querySelector('.idleConcentra');
          if (!r) return 'ausente';
          return getComputedStyle(r).gridColumnStart === '1' &&
                 getComputedStyle(r).gridColumnEnd.includes('-1') ? 'linha inteira' : 'CELULA';
        })(),
      };
    });

    if (m.transbordos.length) throw new Error(
      `rotulo transbordando a coluna em ${L.nome}/${modo}: ` +
      m.transbordos.join(', ') + '. O preenchimento da barra cobre a letra, e ' +
      'isso nao aparece em teste nenhum — so em quem olha.');
    if (!m.cartoes) throw new Error(
      `nenhum cartao em ${L.nome}/${modo}. Uma foto vazia com relatorio verde e ` +
      'evidencia falsa, e evidencia falsa e pior que nenhuma.');

    /* O RECORTE VAI DO CABEÇALHO AO FIM DA LISTA, e o cabeçalho é o `<h3>`
       IRMÃO — não um ancestral. Subir para o `<section>` traria a aba inteira
       de volta e desfaria o motivo desta ferramenta existir; o botão que
       alterna o modo mora no `<h3>`, e é só ele que precisa entrar. */
    const recorte = () => pg.evaluate(() => {
      const p = document.querySelector('#idleEquipe');
      const h = p?.previousElementSibling;
      const a = p.getBoundingClientRect();
      const c = (h && /^H[1-6]$/.test(h.tagName)) ? h.getBoundingClientRect() : a;
      const topo = Math.min(a.y, c.y);
      return { x: Math.min(a.x, c.x), y: topo,
               w: Math.max(a.width, c.width),
               h: (a.y + a.height) - topo };
    });
    await pg.evaluate(() => document.querySelector('#idleEquipe')
      ?.scrollIntoView({ block: 'center' }));
    await pg.waitForTimeout(250);
    const cx2 = await recorte();
    const arq = join(SAIDA, `cartao-${L.nome}-${modo}.png`);
    await pg.screenshot({ path: arq, clip: {
      x: Math.max(0, cx2.x - FOLGA), y: Math.max(0, cx2.y - FOLGA),
      width: Math.min(L.w, cx2.w + FOLGA * 2),
      height: Math.min(L.h, Math.max(80, cx2.h + FOLGA * 2)) } });

    /* O PRIMEIRO CARTÃO SOZINHO, A 3×. O `deviceScaleFactor` não muda o
       arranjo — muda quantos pixels de imagem cada pixel de CSS recebe —,
       então o que se lê aqui é o mesmo cartão que o jogador vê, e não um
       cartão maior. Um recorte ampliado depois seria borrão. */
    const ctxP = await b.newContext({ viewport: { width: L.w, height: L.h },
                                      deviceScaleFactor: PERTO });
    const pgP = await ctxP.newPage();
    await pgP.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
    await pgP.evaluate(PLANTAR);
    await pgP.reload({ waitUntil: 'load', timeout: 60000 });
    await pgP.waitForTimeout(1200);
    await (await pgP.$('[data-view="viewIdle"]')).click();
    await pgP.waitForTimeout(2200);
    if (modo === 'ficha') {
      await (await pgP.$('#idleModoCartao')).click();
      await pgP.waitForTimeout(700);
    }
    const alvo = await pgP.$('#idleEquipe .idleCria');
    if (!alvo) throw new Error(`nenhum cartao para a foto de perto em ${L.nome}/${modo}`);
    await alvo.scrollIntoViewIfNeeded();
    await pgP.waitForTimeout(250);
    await alvo.screenshot({ path: arq.replace(/\.png$/, '-perto.png') });
    await ctxP.close();

    relato.push({ largura: L.nome, px: L.w, modo, ...m, erros: erros.length, arq });
    console.log(`  ${L.nome}/${modo}: ${m.cartoes} cartoes · caixa ${m.caixa} · ` +
                `${m.pedacos} pedacos · rodape ${m.rodapeNaLinha}`);
    console.log(`     texto: ${m.texto}`);
  }
  if (erros.length) console.log('  ERRO em ' + L.nome + ': ' + erros[0].slice(0, 200));
  await ctx.close();
}

await b.close();
srv.close();

console.log('\n' + JSON.stringify(relato, null, 2));
const comErro = relato.filter(r => r.erros);
if (comErro.length) {
  console.log(`\nREPROVADO: ${comErro.length} captura(s) com pageerror.`);
  process.exit(1);
}
console.log(`\n${relato.length} capturas em ${SAIDA}`);
console.log('AGORA OLHE. O portao automatizado prova que a pagina FUNCIONA; ' +
            'ele nao prova que ela esta LEGIVEL, e essa e a segunda metade do Q5.');
