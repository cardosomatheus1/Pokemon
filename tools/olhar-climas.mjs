/* OLHAR OS CLIMAS — a segunda metade do Q5 do 1.32b (ST-2.1 e ST-2.2).
 *
 * Fotografa a legenda dos climas ABERTA na sala de rotas, nas quatro larguras
 * em que o arranjo muda (1920, 1440, 1100, 420), e o log de uma run que começa
 * com Pólen na Floresta — a semente 'r9', medida: o Pólen troca um rosto no
 * estágio 1, e a linha "trouxe X no lugar de Y" tem de aparecer.
 *
 * O plantio é o do `olhar-hora.mjs`, copiado: é a MESMA rota do jogador, pelos
 * mesmos módulos do jogo. Reprova em qualquer pageerror.
 *
 * Uso: node tools/olhar-climas.mjs [--saida pasta]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SAIDA = arg('--saida') || join(RAIZ, 'tools/previas/_climas');
mkdirSync(SAIDA, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.txt': 'text/plain',
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

const PLANTAR = async () => {
  const D = await import('/app/modules/idle-dados.mjs');
  const P = await import('/app/modules/perfil-dados.mjs');
  const { PACK } = await import('/app/modules/motor.mjs');
  /* O MESMO módulo que o jogo usa para derivar raridade — ver o D-087. */
  const B = await import('/engine/bioma.mjs');
  const agora = Date.now();

  /* O TREINADOR PRIMEIRO — ver a armadilha 1 no cabeçalho. */
  const perfil = P.loadProfile();
  perfil.name = perfil.name || 'Treinador';
  perfil.since = perfil.since || agora;
  P.saveProfile(perfil);

  const e = D.VAZIO();
  D.escolherInicial(e, PACK, PACK.iniciais[0], agora);

  /* Mais quatro criaturas: o cartão da equipe é o que o 1.6b reconstruiu, e uma
     equipe de um não mostra o arranjo que precisa ser lido. */
  const extras = (PACK.especies ?? []).filter(x => x.dex !== PACK.iniciais[0]).slice(0, 4);
  for (const esp of extras)
    e.criaturas.push(D.criarCriatura(PACK, esp.dex, 'captura', agora,
      String(esp.dex).padStart(12, 'a') + 'f0'));

  /* NIVEIS DIFERENTES, para a barra de XP mostrar o que ela faz (1.14). Um
     time todo no nivel 1 desenha cinco barras vazias, e cinco barras vazias
     nao provam que a barra funciona — provam que ela existe. */
  /* NO MEIO dos niveis, e nao NOS limiares. A primeira versao usou os valores
     exatos de `xpParaNivel`, e as cinco barras sairam em 0% — o preenchimento
     existia e nao aparecia. Prova de existencia nao e prova de leitura. */
  const xps = [60, 320, 1100, 3000, 11000];
  e.criaturas.forEach((c, i) => { c.xp = xps[i] ?? 0; c.vinculo = i * 37; });

  /* ── TRÊS EXPEDIÇÕES, EM TRÊS BIOMAS (1.9) ──────────────────────────────
     Uma só não mostra o que o bloco construiu: a marca no chip do bioma, o
     retrato de quem está onde, e a contagem de vagas. E o Pokédex precisa estar
     cheio o bastante para as vagas EXISTIREM — as vagas vêm dele, e escrever o
     número não é mais possível, que era o defeito D-072.

     Por isso o Pokédex é plantado ANTES: a ferramenta tem de conquistar as vagas
     do mesmo jeito que o jogador. Se houvesse atalho aqui, haveria no jogo. */
  e.registro = Object.fromEntries((PACK.especies ?? []).slice(0, 30).map(y => [y.dex, 3]));

  const biomas = (PACK.biomas ?? []).map(b => b.id);
  const perfis = ['trilha', 'batida', 'vigilia'];
  for (let i = 0; i < Math.min(3, D.vagasDe(e), e.criaturas.length); i++) {
    const x = D.iniciarExpedicao(e, {
      pack: PACK, bioma: biomas[i * 3] ?? biomas[i] ?? 'floresta',
      perfil: perfis[i], equipe: [e.criaturas[i].id], agora,
    });
    x.iniciadaEm = agora - (20 + i * 30) * 60000;
    x.terminaEm  = agora + (100 - i * 25) * 60000;
  }

  /* Um de cada família de ícone, para a folha nova ser conferível a olho. */
  /* Um de cada zona: dinheiro, material, bola comum, bola boa, pedra, e o Elo. */
  /* Um de cada porta e cada faixa, para a mochila mostrar a folha nova inteira. */
  e.bolsa = { pokecoin: 1240, essencia: 37, poke: 12, ultra: 3, quick: 5,
              fogo: 2, agua: 1, lua: 1, brilho: 1, elo: 1,
              leftovers: 3, shellbell: 1, wiseglasses: 2, blacksludge: 1,
              icyrock: 1, heatrock: 1, expshare: 1, machobrace: 1 };

  /* NIVEL 20 para o SELO DO FOCO aparecer (1.16). Sem isto a foto mostra o
     cartao da criatura sem o chamado, e o chamado e a peca que decide se o
     sistema inteiro e descoberto ou nao. E uma ja vem COM foco, para a foto
     mostrar os dois estados lado a lado. */
  e.criaturas.forEach(c => { c.nivel = 20; });
  if (e.criaturas[1]) e.criaturas[1].foco = 'vigia';

  /* ── ENCONTROS PENDENTES, e o quadro "QUEM APARECEU" com eles (L-166) ──
     A ferramenta plantava expedição em campo e NUNCA um encontro esperando —
     então o quadro saía vazio em todas as fotos, e ele é a única tela do idle
     em que o jogador decide alguma coisa depois que a run acaba.

     É o mesmo ponto cego que o cabeçalho deste arquivo já registra: não dá
     para cumprir a segunda metade do Q5 numa tela que a esteira não sabe
     abrir. Foi assim por seis blocos com o idle inteiro; aqui foi um bloco.

     DOIS DE CADA ORIGEM, de propósito: desde o L-166 o quadro diz coisas
     diferentes para o que veio da RUN (que tem prazo) e para o que veio da
     expedição (que não tem). Uma origem só esconderia metade do texto. */
  const paraOQuadro = (PACK.especies ?? []).slice(5, 9);
  e.encontros = paraOQuadro.map((esp, i) => ({
    chave: (i < 2 ? 'olhar-run:' : 'olhar-exp:') + i,
    expedicao: i < 2 ? null : 'x-olhar',
    origem: i < 2 ? 'avanco' : 'expedicao',
    /* ── A RARIDADE É PERGUNTADA, E NÃO INVENTADA (D-087) ─────────────
       Esta linha era `esp.raridade ?? 'comum'`, e a espécie NÃO tem campo de
       raridade — ela é DERIVADA da força pelo `raridadeDe`, como o
       `elencoDoBioma` faz. Então o `??` pegava sempre, e o quadro saiu com
       Charizard, Blastoise e Wartortle marcados "comum".

       O dono pegou olhando: *"um charizard desde quando é comum?"*. No jogo
       ele é muitoRaro; quem mentiu foi a ferramenta.

         > Foto vazia com relatório verde é evidência falsa, e o cabeçalho
         > deste arquivo já dizia isso. Foto BONITA que afirma o que é falso é
         > pior: ninguém desconfia dela, e eu a usei para dizer que estava
         > pronto.

       A regra que fica, e ela vale para todo estado plantado aqui: **campo
       derivado se pergunta à função que o deriva**. Escrever o valor à mão é
       assumir que ele não vai mudar — e ele muda no primeiro rebalanceamento
       de força. */
    dex: esp.dex, raridade: B.raridadeDe(PACK, esp),
    bioma: (PACK.biomas ?? [])[0]?.id ?? 'floresta', em: agora,
  }));

  D.salvar(e);
  return { criaturas: e.criaturas.length, perfil: perfil.name,
           encontros: e.encontros.length };
};

const LARGURAS = [1920, 1440, 1100, 420];
const erros = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 } });
const pg = await ctx.newPage();
pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
await pg.evaluate(PLANTAR);
await pg.reload({ waitUntil: 'load', timeout: 60000 });
await pg.waitForTimeout(1500);
const aba = await pg.$('[data-view="viewIdle"]');
if (!aba) throw new Error('o botao da aba ROTAS nao existe ([data-view="viewIdle"]).');
await aba.click();
await pg.waitForTimeout(2000);

/* A LEGENDA, aberta. Sem abrir, a foto mostraria só o resumo — e o que precisa
   ser lido é a lista. */
const itens = await pg.evaluate(() => {
  const d = document.querySelector('#idleClimas');
  if (d) d.open = true;
  return document.querySelectorAll('#idleClimasLista li').length;
});
if (!itens) throw new Error('a legenda dos climas saiu vazia — foto vazia com relatorio verde e evidencia falsa');
for (const largura of LARGURAS) {
  await pg.setViewportSize({ width: largura, height: 1200 });
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const a = document.querySelector('#idleRotaRegua')?.getBoundingClientRect();
    const z = document.querySelector('#idleClimas')?.getBoundingClientRect();
    return a && z ? { x: 0, y: a.top + scrollY - 8, width: innerWidth,
                      height: z.bottom - a.top + 16 } : null;
  });
  if (r) await pg.screenshot({ path: join(SAIDA, `legenda-${largura}.png`), clip: r, fullPage: true });
}

/* A LINHA DA RUN (ST-2.2): uma run na Floresta com a semente medida. */
const linha = await pg.evaluate(async () => {
  const A = await import('/app/modules/avanco-estado.mjs');
  const D = await import('/app/modules/idle-dados.mjs');
  const { PACK } = await import('/app/modules/motor.mjs');
  const e = D.carregar();
  A.comecarAvanco(e, { pack: PACK, bioma: 'floresta', estagio: 1,
    equipe: [e.criaturas[4].id], agora: Date.now(), raiz: 'r9' });
  return (e.run.eventos ?? []).filter(x => x.tipo === 'elenco').length;
});
await pg.reload({ waitUntil: 'load', timeout: 60000 });
await pg.waitForTimeout(1500);
await (await pg.$('[data-view="viewIdle"]'))?.click();
await pg.waitForTimeout(3000);
for (const largura of [1440, 420]) {
  await pg.setViewportSize({ width: largura, height: 1200 });
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: join(SAIDA, `run-${largura}.png`), fullPage: false });
}

await b.close();
srv.close();
console.log(`legenda: ${itens} climas · linhas de elenco na run: ${linha}` +
            (erros.length ? `\nERROS: ${erros.join(' | ').slice(0, 300)}` : ''));
if (erros.length) { console.log('REPROVADO: pageerror'); process.exit(1); }
console.log(`capturas em ${SAIDA}`);
