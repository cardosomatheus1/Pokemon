/* OLHAR A HORA — fotografa a mesma cena do idle em quatro horas do dia.
 *
 * ── POR QUE UMA QUARTA FERRAMENTA DE OLHAR ───────────────────────────────
 *
 * O `olhar-idle.mjs` fotografa a aba como ela está AGORA, e "agora" é a hora em
 * que a ferramenta rodou. Para julgar um ciclo de 24 h isso é inútil: metade
 * dos estados nunca aparece, e o que aparece depende de eu ter rodado às 3h ou
 * às 15h.
 *
 *   > É a mesma lição do `olhar-cartao`: a esteira não sabe abrir o estado que
 *   > precisa ser lido, então o passo OLHAR não acontece. O conserto é sempre o
 *   > mesmo — ensinar a esteira a abrir aquele estado.
 *
 * ── A HORA É FIXADA NA PÁGINA, E NÃO NO MÓDULO ───────────────────────────
 *
 * `Date.now` é substituído antes de o app carregar. Fixar por dentro do
 * `hora-do-dia.mjs` testaria um caminho que o jogador não percorre — e o que
 * este arquivo precisa provar é justamente a LIGAÇÃO: que o laço do quadro
 * chama a camada 0 e pinta o que ela devolveu.
 *
 * Uso:
 *   node tools/olhar-hora.mjs
 *   node tools/olhar-hora.mjs --saida /tmp/x
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SAIDA = arg('--saida') || join(RAIZ, 'tools/previas/_hora');
mkdirSync(SAIDA, { recursive: true });

/* As quatro que decidem o ciclo, e cada uma existe por um motivo:
     08h  DIA        o sol já subiu, a cena na luz cheia
     17h  TARDE      o alaranjado que o dono nomeou
     19h  OCASO      o sol encostando no chão — a passagem, que é onde um
                     degrau apareceria se houvesse
     01h  NOITE      a lua alta, as estrelas todas acesas */
const HORAS = [
  { nome: '08-dia',    h: 8 },
  { nome: '18-tarde',  h: 18 },      // o pico do alaranjado — às 17h ele mal começou
  { nome: '20-ocaso',  h: 20 },      // o laranja virando luar: onde um degrau apareceria
  { nome: '01-noite',  h: 1 },
];

/* Uma largura só, e grande: o que se julga aqui é a LUZ e o céu, não o
   arranjo — esse o `olhar-idle` já cobre nas quatro larguras. */
const VISTA = { w: 1440, h: 1200 };

/* A PÁGINA RODA EM TÓQUIO DE PROPÓSITO. A DEC-10 manda o mundo rodar em
   Brasília seja qual for o fuso do aparelho — então a foto só prova a regra se
   o aparelho estiver LONGE de Brasília. Num contêiner em UTC, ou num navegador
   em Brasília, a cena certa e a errada sairiam iguais. As horas pedidas são as
   de Brasília (UTC−3). */
const FUSO = 'Asia/Tokyo';
const DESLOCAMENTO_H = 3;

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

const relato = [];
for (const H of HORAS) {
  /* NO FUSO DO DONO, e não em UTC. Com o contêiner em UTC, uma cena que lê o
     UTC cru e uma que converte para a hora local saem IGUAIS na foto — e foi
     assim que o defeito do fuso passou pela primeira captura (DEC-10). Na
     Bahia as duas divergem em três horas, e a foto passa a provar a ligação. */
  const ctx = await b.newContext({ viewport: { width: VISTA.w, height: VISTA.h },
                                   timezoneId: FUSO });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));

  /* A HORA, FIXADA ANTES DE O APP CARREGAR. `Date.now` e `new Date()` sem
     argumento — os dois, porque o app usa os dois e fixar só um deixaria
     metade da cena numa hora e metade na outra. */
  /* A hora pedida é a de BRASÍLIA (UTC−3): 01h lá são 04h UTC. */
  const alvo = Date.UTC(2026, 8, 16, H.h, 0, 0) + DESLOCAMENTO_H * 3600000;
  await pg.addInitScript(`(() => {
    const D = Date, T = ${alvo};
    const F = function (...a) { return a.length ? new D(...a) : new D(T); };
    F.now = () => T; F.parse = D.parse; F.UTC = D.UTC; F.prototype = D.prototype;
    globalThis.Date = F;
  })();`);

  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.evaluate(PLANTAR);
  await pg.reload({ waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(1500);

  const aba = await pg.$('[data-view="viewIdle"]');
  if (!aba) throw new Error('o botao da aba ROTAS nao existe ([data-view="viewIdle"]).');
  await aba.click();
  await pg.waitForTimeout(2600);

  /* O QUE A CAMADA 0 DIZ QUE DEVERIA ESTAR NA TELA. O relatório junta a
     DECISÃO e a FOTO: se as duas discordarem, a ligação está quebrada e
     nenhuma das duas sozinha mostraria isso. */
  const diz = await pg.evaluate(async () => {
    const h = await import('/app/modules/hora-do-dia.mjs');
    /* O MESMO caminho que a cena usa, com o fuso da página: o relatório diz o
       que a cena DEVERIA mostrar, e a foto mostra o que ela mostrou. */
    const t = h.relogioDoMundo(Date.now());
    const a = h.astroEm(t), l = h.luzEm(t);
    return { periodo: h.periodoEm(t), alfa: l.alfa, cor: `${l.r},${l.g},${l.b}`,
             astro: a.qual, x: a.x, y: a.y, brilho: a.brilho,
             estrelas: h.estrelasEm(t), forca: h.forcaDoEfeito(t) };
  });

  const palco = await pg.$('#idlePalco') ?? await pg.$('#idleMundo');
  if (!palco) throw new Error('o palco do idle nao existe — foto vazia com relatorio verde e evidencia falsa');
  await palco.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(400);
  const arq = join(SAIDA, `hora-${H.nome}.png`);
  await palco.screenshot({ path: arq });

  console.log(`  ${H.nome}: ${diz.periodo} · alfa ${diz.alfa} · ${diz.astro} em ` +
              `(${diz.x}, ${diz.y}) brilho ${diz.brilho} · ${diz.estrelas} estrelas · ` +
              `efeito x${diz.forca}${erros.length ? '  ERROS: ' + erros[0].slice(0, 120) : ''}`);
  relato.push({ hora: H.nome, ...diz, erros: erros.length, arq });
  await ctx.close();
}

await b.close();
srv.close();

console.log('\n' + JSON.stringify(relato, null, 2));
const ruins = relato.filter(r => r.erros);
if (ruins.length) { console.log(`\nREPROVADO: ${ruins.length} captura(s) com pageerror.`); process.exit(1); }
console.log(`\n${relato.length} capturas em ${SAIDA}`);
console.log('AGORA OLHE. O portao prova que a pagina FUNCIONA; ele nao prova que ' +
            'a cena esta BONITA nem LEGIVEL, e essa e a segunda metade do Q5.');
