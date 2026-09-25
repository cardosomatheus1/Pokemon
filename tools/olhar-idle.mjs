/* OLHAR O IDLE — captura a aba da rota em PNG, para leitura humana.
 *
 * ── POR QUE UM SEGUNDO OLHAR, e não uma tela a mais no primeiro ──────────
 *
 * `olhar-telas.mjs` fotografa a Arena: início, aposta, contagem, luta,
 * resultado, proteção, adm. Ele não fotografa o idle, e isso passou despercebido
 * por seis blocos — os mesmos seis em que o idle foi construído inteiro.
 *
 * Achado ao fechar o 1.6b: o bloco mexeu no cartão da equipe, na mochila, no
 * contador do teto e nas três leituras de forma, e a ferramenta de OLHAR não
 * conseguia mostrar nenhuma das quatro. **Não dá para cumprir a segunda metade
 * do Q5 numa tela que a esteira não sabe abrir.**
 *
 * Ele é separado porque o caminho é outro, e não porque a tela é menos
 * importante — é MAIS: é a única do produto que fica aberta por horas
 * (`CLAUDE.md`, "o cenário do idle nunca está pronto"). A aba exige estado —
 * uma criatura inicial, uma expedição em campo, saque na mochila — e produzir
 * esse estado é metade do trabalho desta ferramenta.
 *
 * ── O ESTADO É PLANTADO, E NÃO ESPERADO ──────────────────────────────────
 *
 * Esperar o jogo produzir uma equipe de cinco e uma expedição em campo levaria
 * horas de relógio de parede. Então o estado vai ao `localStorage` pela MESMA
 * função que o jogo usa para salvar — e não por um JSON escrito à mão, que
 * envelheceria no primeiro bloco a mudar o formato e mentiria em silêncio a
 * partir dali.
 *
 * ── DUAS ARMADILHAS QUE ESTA FERRAMENTA JÁ CAIU ──────────────────────────
 *
 * As duas produziram **quatro fotos da tela errada com relatório verde**, que é
 * o pior resultado possível para uma ferramenta cujo trabalho é mostrar a
 * verdade:
 *
 *   1. plantar o estado do idle sem plantar o TREINADOR. Sem perfil a aba abre
 *      como visitante e não pinta nada;
 *   2. clicar em `[data-view="viewRotas"]`. A aba se chama ROTAS na barra e
 *      `viewIdle` no código — nome de produto e nome de implementação
 *      divergiram. `pg.$` devolve `null` em silêncio, e seguir em frente
 *      fotografou o INÍCIO quatro vezes.
 *
 * Por isso os dois passos agora ABORTAM em vez de continuar, e há uma
 * conferência de conteúdo antes da foto. Uma ferramenta de OLHAR que erra a
 * tela é pior que nenhuma: ela produz evidência falsa.
 *
 * Uso:
 *   node tools/olhar-idle.mjs                 todas as larguras
 *   node tools/olhar-idle.mjs --saida /tmp/x  outro destino
 *   node tools/olhar-idle.mjs --inicial 7     esta criatura lidera a run (7: Surf)
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const arg = n => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : null;
};
/* ── A ABA VIROU DUAS (A4e), E A FERRAMENTA PRECISA ALCANÇAR AS DUAS ──────
   ROTAS é o Avanço, ROTA OFF é a expedição e o treino do banco. São arranjos
   diferentes, e fotografar só a primeira deixaria a segunda sem o passo OLHAR
   — que é exatamente onde os três defeitos do V1.15 moravam.

   O padrão continua sendo ROTAS: quem não passa a bandeira recebe o que
   sempre recebeu, e nenhum roteiro antigo muda de significado. */
const VISTA = arg('--vista') || 'viewIdle';
const SAIDA = arg('--saida') ||
  join(RAIZ, 'tools/previas/' + (VISTA === 'viewIdle' ? '_idle' : '_rota-off'));
mkdirSync(SAIDA, { recursive: true });

/* As mesmas larguras do olhar da Arena, e pelo mesmo motivo: são onde o arranjo
   muda de FORMA. 420 está aqui porque é onde as duas colunas viram uma — o
   arranjo que o dono reprovou uma vez ("preciso rolar para ver o time"). */
const LARGURAS = [
  { nome: 'panoramico', w: 1920, h: 1400 },
  { nome: 'largo',      w: 1440, h: 1400 },
  { nome: 'medio',      w: 1100, h: 1400 },
  { nome: 'estreito',   w:  420, h: 1600 },
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain',
};

const s = createServer((q, r) => {
  const p = decodeURIComponent((q.url || '/').split('?')[0]);
  const f = join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !existsSync(f) || !extname(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(res => s.listen(0, '127.0.0.1', res));
const porta = s.address().port;

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

/* Corre DENTRO da página, importando os mesmos módulos do jogo. É o que garante
   que a foto mostre o que o jogador veria — e não uma cena montada por uma
   ferramenta que aprendeu o formato de cor. */
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
  /* `--inicial <dex>` troca quem lidera a run (ST-5.5): o padrão luta com
     golpe de impacto, e o PROJÉTIL só aparece com quem tem `proj` — uma
     criatura de planta, por exemplo. Sem a bandeira, a cena de sempre. */
  const inicial = Number(window.__inicial) || PACK.iniciais[0];
  D.escolherInicial(e, PACK, inicial, agora);

  /* Mais quatro criaturas: o cartão da equipe é o que o 1.6b reconstruiu, e uma
     equipe de um não mostra o arranjo que precisa ser lido. */
  const extras = (PACK.especies ?? []).filter(x => x.dex !== inicial).slice(0, 4);
  for (const esp of extras)
    e.criaturas.push(D.criarCriatura(PACK, esp.dex, 'captura', agora,
      String(esp.dex).padStart(12, 'a') + 'f0'));
  /* E COM `--inicial` ELA LIDERA A RUN: as três primeiras vão às expedições e
     a run leva as duas livres, então a escolhida vai para a quarta posição —
     a do XP de nível ~20, que é onde o Surf entra no repertório. */
  if (window.__inicial) e.criaturas.splice(3, 0, e.criaturas.shift());

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
for (const L of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: L.w, height: L.h } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', err => erros.push(err.message));

  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  const plantado = await pg.evaluate(PLANTAR);
  /* Recarregar depois de plantar: a aba lê o estado UMA vez, na abertura. */
  await pg.reload({ waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(1500);

  /* Pelo BOTÃO, e não mexendo em classe: o caminho do jogador é o que precisa
     ser fotografado, e um `classList.add` pularia o código que pinta a tela.
     ABORTA se ele não existir — ver a armadilha 2 no cabeçalho. */
  const botao = await pg.$(`[data-view="${VISTA}"]`);
  if (!botao) throw new Error(
    `o botao da aba nao existe ([data-view="${VISTA}"]). Se a aba ` +
    'mudou de nome, esta ferramenta muda junto — seguir sem ele produziria ' +
    'quatro fotos da tela errada com relatorio verde.');
  await botao.click();
  await pg.waitForTimeout(2800);

  /* E CONFERE QUE A TELA TEM CONTEÚDO. O relatório não pode dizer "sem erro"
     sobre uma foto vazia: página sem erro e página com o que fotografar são
     perguntas diferentes, e só a segunda interessa aqui. */
  const cheia = await pg.evaluate(vista => {
    const v = document.querySelector('#' + vista);
    const q = sel => document.querySelectorAll('#' + vista + ' ' + sel).length;
    return {
      visivel: !!v && v.classList.contains('on'),
      primeiraVez: !!v && v.classList.contains('primeiraVez'),
      /* O CARTÃO, e não um campo DENTRO dele. Contava `.criaForma` — o bloco
         das três barras —, e quando o L-164 dobrou o cartão para o modo
         compacto a contagem foi a ZERO com onze cartões na tela. Sonda que
         mede uma peça interna reporta a organização, e não o produto. */
      cartoes: q('.idleCria'), forma: q('.criaForma'),
      estagios: q('.estChip'), previa: q('.prvItem'),
      emCampo: q('.idleEmCampo'), comGente: q('.idleChip.comGente'),
      itens: q('.idleItem'), biomas: q('.idleChip'),
      /* O banco do TRAINER OFF: sem ele a foto da aba nova estaria certa e
         vazia, que é o modo de falha que esta ferramenta já teve duas vezes. */
      banco: q('.trQuem'),
    };
  }, VISTA);
  if (!cheia.visivel || cheia.primeiraVez || !cheia.biomas)
    throw new Error(`a aba nao abriu com conteudo em ${L.nome}: ` +
      JSON.stringify(cheia) + '. Uma foto vazia com relatorio verde e evidencia ' +
      'falsa, e evidencia falsa e pior que nenhuma.');

  const arq = join(SAIDA, `${VISTA === 'viewIdle' ? 'idle' : 'rota-off'}-${L.nome}.png`);
  await pg.screenshot({ path: arq, fullPage: true });

  /* ── E UMA FOTO DE JANELA NO QUADRO DO FIM (L-166) ─────────────────────
   *
   * A foto de página inteira MENTE sobre a metade de baixo, e a causa é o
   * `background-attachment:fixed` do `body`: um fundo fixo é pintado no
   * tamanho da JANELA, então tudo abaixo da primeira dobra sai sobre branco.
   * Nada disso acontece no navegador do jogador — mas quem lê a foto vê um
   * arranjo que não existe, e a segunda metade do Q5 é feita de leitura.
   *
   * Perdi uma leitura inteira nisso: li o quadro "quem apareceu" como se ele
   * estivesse sobre fundo claro, e ele não está. **Uma foto que mente é pior
   * que uma foto que falta**, porque a que falta ninguém usa para decidir.
   *
   * Então o quadro ganha a foto que ele precisa: rolado até ele, na altura da
   * janela, com o fundo pintado onde o jogador o vê. */
  const rolou = await pg.evaluate(() => {
    const q = document.querySelector('#idleEncontros');
    if (!q || !q.children.length) return false;
    q.scrollIntoView({ block: 'center' });
    return true;
  });
  if (rolou) {
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: arq.replace(/.png$/, '-quadro.png') });
  }
  console.log(`  quadro do fim (${L.nome}): ${rolou ? 'fotografado' : 'VAZIO — nao ha o que ler'}`);

  /* ── E A JANELA DO FOCO, que so existe depois de um clique (1.16) ──────
     Pelo SELO, e nao chamando a funcao: o caminho do jogador e o que precisa
     funcionar, e um `abrir()` direto pularia justamente a ligacao do clique —
     que e onde um seletor errado se esconde. */
  const abriu = await pg.evaluate(vista => {
    const el = document.querySelector('#' + vista + ' [data-foco-abrir]');
    if (!el) return 0;
    el.click();
    const cx = document.querySelector('#focoCaixa');
    return (cx && !cx.hidden) ? cx.querySelectorAll('.focoCartao').length : 0;
  }, VISTA);
  if (abriu) {
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: arq.replace(/.png$/, '-foco.png') });
  }
  console.log(`  janela do foco (${L.nome ?? L.w}): ${abriu ? abriu + ' cartoes' : 'NAO ABRIU'}`);
  const alt = await pg.evaluate(() => document.body.scrollHeight);
  if (erros.length) console.log('  ERRO em ' + L.nome + ': ' + erros[0].slice(0,200));
  relato.push({ largura: L.nome, px: L.w, altura: alt, erros: erros.length,
                ...cheia, perfil: plantado.perfil, arq });
  await ctx.close();
}

/* ══ E A TELA DA RUN, que só existe DEPOIS de o jogador entrar (L-166) ═════
 *
 * Ela era o ponto cego mais caro que esta ferramenta tinha. O Avanço foi
 * construído em sete blocos, e o passo OLHAR nunca alcançou a tela onde ele
 * acontece — as fotos mostravam a tela de ESCOLHA, que é a que o jogador
 * atravessa, e nunca a que ele fica olhando. Os defeitos que o dono relatou
 * dois dias seguidos — o sprite cortado, a barra de HP preta, o layout
 * "bagunçado" — moravam todos aqui, e nenhum estava numa foto.
 *
 * DUAS LARGURAS, e não quatro: o custo é entrar na run de verdade a cada uma,
 * e 1920 e 420 são onde o arranjo de três colunas vira uma. As do meio
 * interpolam; estas duas não.
 *
 * A RUN É COMEÇADA PELO MOTOR, e não clicando o botão: o clique depende de
 * bioma e estágio escolhidos na tela, e uma ferramenta que fotografa a run
 * não pode falhar porque um seletor mudou de nome. O que ela precisa provar é
 * o ARRANJO, e o arranjo é o mesmo pelas duas portas. */
/* Duas passadas: a wave 1 (a rotina) e a wave 10 (o duelo). São arranjos
   diferentes de propósito, e fotografar só o primeiro deixaria o clímax do
   modo sem o passo OLHAR — que foi o que aconteceu com a tela da run inteira
   por sete blocos. */
for (const { L, chefe, raiz } of [
  /* CHUVA no panorâmico e NEVASCA no estreito: dois climas de desenho bem
     diferente (traço que cai depressa contra corpo redondo que boia), nas duas
     larguras em que o arranjo muda de forma. O CHEFE fica no tempo firme de
     propósito — a foto dele existe para ler o anúncio e a barra, e chuva por
     cima seria ruído numa leitura que já é apertada. */
  { L: LARGURAS[0], chefe: false, raiz: 'olhar-0' },
  { L: LARGURAS[3], chefe: false, raiz: 'olhar-127' },
  { L: LARGURAS[0], chefe: true,  raiz: 'olhar-run' },
]) {
  const ctx = await b.newContext({ viewport: { width: L.w, height: L.h } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', err => erros.push(err.message));
  /* E O CONSOLE TAMBÉM: um erro dentro de um `catch` engolido não vira
     `pageerror`, e é exatamente onde uma cena morre sem deixar rastro. */
  pg.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  pg.on('requestfailed', r => erros.push('404: ' + r.url().split('/').pop()));
  await pg.goto(`http://127.0.0.1:${porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  /* A BANDEIRA DA PASSADA, lida lá dentro pelo `entrou` (L-170). */
  await pg.evaluate(c => { window.__ateOChefe = c; }, chefe);
  /* ── A RAIZ É ESCOLHIDA, e o relatório diz que foi (1.32) ──────────────
   *
   * O clima é DERIVADO da raiz da run, e o neutro tem 40% do peso — a raiz
   * fixa que a ferramenta usava (`olhar-run`) cai justamente nele. Resultado:
   * toda foto da run saía com "Tempo Firme", e o bloco inteiro do clima ficava
   * sem passo OLHAR.
   *
   *   > Fotografar só o estado que sai por acaso é fotografar o que não foi
   *   > construído. A ferramenta escolhe o estado; o que ela não pode é
   *   > esconder que escolheu.
   *
   * Então cada passada pede um clima DIFERENTE, e o relatório imprime a raiz
   * junto — quem lê sabe que a cena foi armada, e sabe reproduzi-la. */
  await pg.evaluate(([r, i]) => { window.__raizDaRun = r; window.__inicial = i; }, [raiz, arg('--inicial')]);
  await pg.evaluate(PLANTAR);
  /* ── A RUN LEVA QUEM AINDA NÃO ESCOLHEU O FOCO ────────────────────────
   *
   * O item 1 da ordem do dono é literal: *"é necessário alguma outra forma de
   * se visualizar o FUTURO foco, que é escolhido no nível 12"*. O estado que
   * ele pediu é o de quem NÃO chegou lá — e a ferramenta plantava todo mundo
   * no nível 20, então a foto nunca mostrava aquilo.
   *
   *   > Fotografar só o estado feliz é a mesma doença de testar só o caminho
   *   > feliz: o que se prova é que a tela funciona quando não precisa.
   *
   * Duas na equipe da run, de propósito: uma abaixo do 12 e uma acima. Assim a
   * coluna mostra as DUAS leituras lado a lado, que é como o jogador vai ver. */
  const entrou = await pg.evaluate(async () => {
    const D = await import('/app/modules/idle-dados.mjs');
    const A = await import('/app/modules/avanco-estado.mjs');
    const { PACK } = await import('/app/modules/motor.mjs');
    const e = D.carregar();
    /* QUEM NÃO ESTÁ EM CAMPO — desde o L-162 mandar quem já está fora é
       recusado, e a ferramenta tem de obedecer à mesma regra do jogador. */
    const livres = e.criaturas.filter(c => !D.ondeAventura(e, c.id));
    if (!livres.length) return 'ninguem livre';
    /* A SEGUNDA VAI ABAIXO DO NÍVEL 12 — o nível sai do XP, então é o XP que
       se planta; escrever `nivel` seria escrever num campo DERIVADO, e o
       `hidratar` o recalcularia por cima. */
    const equipe = livres.slice(0, 2);
    if (equipe[1]) { equipe[1].xp = 0; equipe[1].nivel = 1; equipe[1].foco = null; }
    try {
      A.comecarAvanco(e, { pack: PACK, bioma: (PACK.biomas ?? [])[0]?.id ?? 'floresta',
        estagio: 1, equipe: equipe.map(c => c.id), agora: Date.now(),
        raiz: window.__raizDaRun || 'olhar-run' });
      /* ── E DÁ PARA PEDIR A WAVE DO CHEFE (L-170) ──────────────────────
       *
       * A décima wave é a única com forma diferente — 1x1, com nome no meio da
       * tela. Esperar chegar nela levaria os 8 a 15 minutos da run inteira, e
       * a ferramenta nunca a fotografou por isso: o clímax do modo era o único
       * pedaço sem passo OLHAR.
       *
       * A run é ADIANTADA no estado, e não simulada: mesma `run`, mesmo motor,
       * mesma cena. O que se pula é a espera, e não o caminho. */
      if (window.__ateOChefe) {
        const r = D.carregar().run ?? e.run;
        r.wave = 10;
        r.tentativa = 0;
        r.waveComecouEm = Date.now();
        r.hpNaWave = 100;
        e.run = r;
      }
    } catch (x) { return 'recusou: ' + x.message; }
    D.salvar(e);
    return 'ok';
  });
  if (entrou !== 'ok') { console.log(`  tela da run (${L.nome}): NAO ENTROU — ${entrou}`); await ctx.close(); continue; }
  await pg.reload({ waitUntil: 'load', timeout: 60000 });
  /* A ABA, e é a MESMA armadilha 2 do cabeçalho: sem clicar no botão a página
     abre no INÍCIO, e a foto sairia da tela errada com relatório verde. */
  const bt = await pg.$('[data-view="viewIdle"]');
  if (!bt) throw new Error('o botao da aba Rotas sumiu — ver a armadilha 2');
  await bt.click();
  /* ── O NÚMERO DO DANO É EFÊMERO, ENTÃO ELE É VIGIADO ──────────────────
   *
   * O dono cobrou o hitbox "-31" TRÊS vezes, e as três eu respondi que o
   * código estava lá. Uma foto não resolve a discussão: o número vive 1,2 s, e
   * qualquer instantâneo pode cair no intervalo entre dois.
   *
   * Então em vez de fotografar, VIGIA-SE: um observador registra cada número
   * que nasce, com o texto, o tamanho e a cor que o navegador realmente
   * calculou. Zero registros é prova de ausência; N registros com 11 px e
   * branco é prova de outra coisa — e as duas conversas são diferentes. */
  await pg.evaluate(() => {
    window.__dmg = [];
    /* UM ELEMENTO, UM REGISTRO (ST-5.4). Quando um ancestral do número é
       re-anexado no mesmo lote, o `querySelectorAll` abaixo acha o MESMO
       número de novo — e a sonda contava "par sobreposto" com o mesmo texto, o
       mesmo pixel e dt 0 ms. Eram os 1 a 3 pares que sobravam da L-172: a sonda
       medindo a si mesma, pela segunda vez nesta tela. */
    const vistos = new WeakSet();
    new MutationObserver(ms => {
      for (const m of ms) for (const raiz of m.addedNodes) {
        if (raiz.nodeType !== 1) continue;
        /* O NÚMERO PODE VIR DENTRO de um nó que entrou inteiro — desde o D-083
           ele nasce como filho de uma âncora, e é a âncora que é adicionada.
           A primeira versão olhava só o nó adicionado e reportou ZERO números
           num quadro em que eles estavam na tela: a SONDA mediu a si mesma, e
           por pouco eu "consertei" um produto que não estava quebrado. */
        const achados = raiz.classList.contains('avDmg')
          ? [raiz] : [...(raiz.querySelectorAll?.('.avDmg') ?? [])];
        for (const el of achados) {
          if (vistos.has(el)) continue;
          vistos.add(el);
          const c = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          window.__dmg.push({ texto: el.textContent, lado: el.className.replace('dmg avDmg ',''),
            px: c.fontSize, cor: c.color, peso: c.fontWeight,
            t: performance.now(),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
            naTela: r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 &&
                    r.top < innerHeight && r.left < innerWidth });
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

  /* ── QUANTO ESPERAR, E POR QUE NÃO SÃO SEIS SEGUNDOS ──────────────────
     A primeira versão esperava 6 s e fotografou o palco ANTES de o primeiro
     selvagem entrar: relatório dizendo "no ar", foto sem placa nenhuma, e a
     tela da luta sem luta. Medido: o log marcou o primeiro "apareceu" aos 9 s
     de relógio de run, e o duelo começa depois da caminhada de entrada.

     28 s cobre a entrada e alguns golpes. O relatório CONTA as placas, e uma
     foto com zero placa é dita em voz alta — a foto vazia com relatório verde
     é o modo de falha que esta ferramenta já teve três vezes. */
  await pg.waitForTimeout(28000);
  const arq = join(SAIDA, `run-${L.nome}${chefe ? '-chefe' : ''}.png`);
  await pg.screenshot({ path: arq });

  /* ── E UMA FOTO COM O ESTOURO NO AR ─────────────────────────────────────
   *
   * Esta é a foto que faltou por três blocos, e a falta dela é a razão inteira
   * de o dono ter cobrado a mesma tela três dias seguidos.
   *
   * O estouro vive meio segundo. Uma foto tirada num instante qualquer o pega
   * quase nunca — então todas as capturas anteriores mostravam a cena SEM
   * efeito, e eu compensava com contadores: "14 agendados, 413 desenhos".
   *
   *   > Eu estava provando com número o que só a imagem podia provar, e o
   *   > número respondia uma pergunta que ninguém tinha feito.
   *
   * Agora a esteira ESPERA o instante certo. Ela pergunta ao módulo quantos
   * estão no ar e dispara a foto quando há pelo menos um — e diz em voz alta
   * quando não conseguiu, porque "não consegui fotografar" e "não há efeito"
   * são coisas diferentes e não podem sair com a mesma cara. */
  const pegou = await (async () => {
    for (let tentativa = 0; tentativa < 240; tentativa++) {
      /* O que está SENDO DESENHADO, e não o que está na lista: desde a ST-5.5
         a lista guarda também o projétil agendado, que ainda não saiu. */
      const noAr = await pg.evaluate(async () => {
        const m = await import('/app/modules/avanco-efeito.mjs');
        const n = m.noInstante(performance.now());
        return n.estouro + n.carga + n.projetil;
      }).catch(() => 0);
      if (noAr > 0) {
        await pg.screenshot({ path: arq.replace(/\.png$/, '-estouro.png') });
        return noAr;
      }
      await pg.waitForTimeout(50);
    }
    return 0;
  })();
  /* ── E O PROJÉTIL EM VOO (ST-5.5) ──────────────────────────────────────
     Ele vive de 160 a 500 ms, e uma foto ao acaso não o pega. Espera-se o
     instante em que o módulo diz que há um SENDO desenhado, e a foto recorta
     o mundo — o projétil é pequeno, e na tela inteira ele some. Sem golpe de
     `proj` na equipe (o padrão), a linha diz isso e não finge. */
  const voou = await (async () => {
    /* PRAZO EM TEMPO, e não em tentativas: cada pergunta à página custa o seu
       próprio tanto, e 240 tentativas "de 20 ms" duravam o que quisessem. */
    for (const ate = Date.now() + 12_000; Date.now() < ate;) {
      const n = await pg.evaluate(async () => {
        const m = await import('/app/modules/avanco-efeito.mjs');
        const n = m.noInstante(performance.now());
        return n.projetil + (n.jato ?? 0);
      }).catch(() => 0);
      if (n > 0) {
        const caixa = await pg.evaluate(() => {
          const c = document.querySelector('#idleRun canvas, #idleVivos')?.getBoundingClientRect();
          return c && c.width ? { x: c.x, y: c.y, width: c.width, height: c.height } : null;
        });
        await pg.screenshot({ path: arq.replace(/\.png$/, '-projetil.png'), ...(caixa ? { clip: caixa } : {}) });
        return n;
      }
      await pg.waitForTimeout(20);
    }
    return 0;
  })();
  console.log(`    foto COM projetil em voo: ${voou ? voou + ' em voo — run-' + L.nome +
    (chefe ? '-chefe' : '') + '-projetil.png' : 'nenhum em 12 s (a equipe tem golpe de `proj` ou jato? use --inicial 1, ou 7 para o Surf)'}`);
  console.log(`    foto COM estouro no ar: ${pegou ? pegou + ' estouro(s) na tela — ' +
    'run-' + L.nome + (chefe ? '-chefe' : '') + '-estouro.png' :
    'NAO CONSEGUI em 12 s de espera — e isso nao quer dizer que nao ha efeito, ' +
    'quer dizer que esta foto nao prova nada'}`);
  const cheia = await pg.evaluate(() => {
    const r = document.querySelector('#idleRun');
    const acoes = document.querySelector('#avAcoes');
    return {
      runVisivel: !!r && !r.hidden,
      botoes: [...(acoes?.querySelectorAll('[data-av]') ?? [])].map(b => b.dataset.av),
      mobs: document.querySelectorAll('.avPlacaMob').length,
    };
  });
  const dmg = await pg.evaluate(() => window.__dmg ?? []);
  const naTela = dmg.filter(d => d.naTela);
  const amostra = naTela[0] ?? dmg[0];
  const anuncio = await pg.evaluate(() => {
    const el = document.querySelector('#avChefe');
    const n = el?.querySelector('.avChefeNome b');
    return { wave: document.querySelector('#avLogTitulo')?.textContent ?? '?',
             existe: !!el, visivel: !!el && !el.hidden, nome: n?.textContent ?? '',
             largura: el?.querySelector('.avChefeBarra i')?.style.width ?? '' };
  });
  console.log(`  tela da run (${L.nome}${chefe ? ' · CHEFE' : ''}): ${cheia.runVisivel ? 'no ar' : 'ESCONDIDA'} · ` +
    `acoes [${cheia.botoes.join(', ')}] · ${cheia.mobs} placa(s)` +
    (erros.length ? ' · ERROS(' + erros.length + '): ' + erros.filter(e=>!/404|Failed to load resource/.test(e)).slice(0,2).join(' | ').slice(0, 300) : ''));
  /* ── E OS 404 DITOS POR NOME (D-090) ────────────────────────────────────
     A linha acima FILTRAVA os 404 para não poluir. Ela filtrava justamente a
     classe de erro que custou três dias: setenta espécies pediam
     `Attack-Anim.png`, levavam 404, e o `background-image` ficava vazio — sem
     exceção, sem console vermelho, sem nada.

       > Ruído escondido é sinal escondido. O que se filtra por ser comum é o
       > que deixa de ser lido quando importa.

     Agora eles saem CONTADOS e com NOME. Comum continua sendo comum; invisível
     é que não pode ser. */
  const quatroCentoQuatro = erros.filter(e => /^404: /.test(e));
  if (quatroCentoQuatro.length) {
    const nomes = [...new Set(quatroCentoQuatro.map(e => e.slice(5)))];
    console.log(`    404 na tela da run: ${quatroCentoQuatro.length} pedido(s), ` +
      `${nomes.length} arquivo(s) — ${nomes.slice(0, 6).join(', ')}` +
      (nomes.length > 6 ? ` (+${nomes.length - 6})` : ''));
  }
  /* FORA DA JANELA conta separado, e não junto com "não nasceu": um número
     que nasce em x = -19 existe, é invisível, e a correção é outra. */
  /* E A DOBRA É OUTRA COISA (ST-5.4). A janela da sonda tem 1600 px de altura,
     e a 420 a cena da run mora perto do fim dela: um número em y = 1610 está
     ABAIXO DA DOBRA — a página rola até ele —, não fora do mundo. O L-172
     era o número à ESQUERDA do mundo, que nenhuma rolagem mostra; misturar os
     dois contou dois "fora" que o grampo não tinha como consertar. */
  const fora = dmg.filter(d => d.w <= 0 || d.x < 0 || d.x + d.w > L.w);
  const abaixo = dmg.filter(d => !fora.includes(d) && !d.naTela);
  const porLado = lado => dmg.filter(d => d.lado === lado).map(d => d.texto);
  console.log(`    numero do dano: ${dmg.length} nascido(s), ${fora.length} fora da janela` +
    (abaixo.length ? ` · ${abaixo.length} abaixo da dobra (a pagina rola)` : '') +
    (dmg.length ? '' : ' · NENHUM — o hitbox que o dono cobrou tres vezes nao esta nascendo'));
  if (dmg.length) {
    console.log(`      que eu dou (ouro): ${porLado('meu').join(' ') || '—'}`);
    console.log(`      que eu levo (vermelho): ${porLado('dele').join(' ') || '—'}`);
    console.log(`      desenho: ${amostra.px} peso ${amostra.peso}`);
    if (fora.length) console.log(`      FORA: ${fora.map(d => `${d.texto}@${d.x},${d.y} ${d.w}x${d.h}${d.naTela ? '' : ' (naTela=nao)'}`).join(' ')}`);
  }
  /* AS PLACAS QUE SE ENCOSTAM (D-081). A cena já entrega tudo em coordenadas
     de tela, então a conta é uma varredura de retângulos — e ela responde a
     "tudo bagunçado" com um número em vez de uma impressão. */
  /* ── OS NÚMEROS QUE NASCERAM JUNTOS (L-172) ───────────────────────────
   *
   * O dano vive 1,2 s, então dois que nascem com menos que isso de intervalo
   * dividem a tela. A conta é sobre o que o observador REGISTROU: retângulo
   * contra retângulo, entre números cuja vida se sobrepõe no tempo.
   *
   * É a mesma medição que resolveu o D-081 nas placas, e ela existe pelo mesmo
   * motivo: transformar "meio zoado" num número. Sem isso eu conserto pela
   * descrição, que é como eu errei três rodadas seguidas. */
  /* ── E A CONTA TEM DE OLHAR ONDE ELES ESTÃO, E NÃO ONDE NASCERAM ──────
   *
   * A primeira versão comparava os retângulos de NASCIMENTO dentro de uma
   * janela de 1,2 s, e contava pares que o jogador nunca viu juntos: o número
   * mais velho já subiu — a animação o leva de -50% a -190% da própria altura
   * em 1,1 s.
   *
   *   > Sonda que mede o instante errado dá um número, e o número parece
   *   > medição. Foi assim que ela reportou zero danos logo depois do D-083.
   *
   * Agora o mais velho é REPOSICIONADO para onde ele estava quando o mais novo
   * nasceu, e só então os dois retângulos se comparam. É o que o olho vê. */
  const dmgJuntos = (() => {
    const VIDA_MS = 1100;      /* a duração do `floatUp` */
    const SUBIDA = 1.4;        /* de -50% a -190% da altura, em alturas */
    let n = 0;
    const pares = [];
    for (let i = 0; i < dmg.length; i++)
      for (let j = i + 1; j < dmg.length; j++) {
        const [velho, novo] = (dmg[i].t ?? 0) <= (dmg[j].t ?? 0)
          ? [dmg[i], dmg[j]] : [dmg[j], dmg[i]];
        const dt = (novo.t ?? 0) - (velho.t ?? 0);
        if (dt >= VIDA_MS) continue;          /* o velho já sumiu */
        const subiu = (dt / VIDA_MS) * SUBIDA * (velho.h || 20);
        const vy = velho.y - subiu;
        if (velho.x < novo.x + novo.w && novo.x < velho.x + velho.w &&
            vy < novo.y + novo.h && novo.y < vy + (velho.h || 20)) {
          n++;
          pares.push(`${velho.texto}@${velho.x},${velho.y}→${velho.x},${Math.round(vy)} × ` +
                     `${novo.texto}@${novo.x},${novo.y}  dt ${Math.round(dt)} ms`);
        }
      }
    return { n, pares };
  })();
  /* Quando sobra par, DIZER qual: dois números sem endereço voltam a ser "meio
     zoado", que é a palavra que eu preciso deixar de usar. */
  if (dmgJuntos.n) {
    const larguras = dmg.map(d => d.w);
    console.log(`      caixa real: largura ${Math.min(...larguras)}–${Math.max(...larguras)} px, altura ${dmg[0]?.h}`);
  }
  console.log(`    numeros sobrepostos: ${dmgJuntos.n}` + (dmgJuntos.n ? '  <-- L-172' : ''));
  /* O PAR, com endereço (ST-5.4): o velho onde nasceu → onde estava quando o
     novo nasceu, e o novo. Sem isto a próxima tentativa é chute. */
  for (const par of dmgJuntos.pares) console.log(`      par: ${par}`);

  /* ── O EFEITO DO GOLPE CHEGOU AOS OLHOS? (L-171) ──────────────────────
     O estouro é desenhado no CANVAS, então nenhum observador de DOM o vê. A
     pergunta é respondida pelo módulo: quantos ele agendou, e quantos ele
     conseguiu DESENHAR — a diferença entre os dois é folha que não carregou.

     É a mesma distinção do D-083: código que roda não é o que chega aos olhos. */
  const efeito = await pg.evaluate(async () => {
    const m = await import("/app/modules/avanco-efeito.mjs");
    const d = await import("/app/modules/efeitos-dados.mjs");
    const f = await import("/app/modules/folha-viva.mjs");
    const comHit = Object.values(d.MOVE_FX).filter(x => x?.hit).length;
    const c = m.contagem();
    return { noAr: m.quantosNoAr(), agendados: c.agendados, desenhados: c.desenhados,
             cargas: c.cargas ?? 0, projeteis: c.projeteis ?? 0, jatos: c.jatos ?? 0,
             fora: c.fora, folhasFaltando: f.quantasFaltam(), folhasVistas: f.quantasFolhas(),
             golpesComEfeito: comHit, total: Object.keys(d.MOVE_FX).length };
  }).catch(e => ({ erro: e.message }));
  if (efeito.erro) console.log(`    efeito do golpe: ERRO ${efeito.erro}`);
  else {
    console.log(`    efeito do golpe: ${efeito.agendados} agendado(s), ` +
      `${efeito.desenhados} desenhado(s), ${efeito.fora} FORA DA TELA` +
      (efeito.fora ? '  <-- D-092: desenhado nao e visto' : '') +
      ` · a tabela cobre ${efeito.golpesComEfeito}/${efeito.total} golpes`);
    /* A OUTRA METADE (ST-5.5): quantas cargas e projéteis foram LANÇADOS. Zero
       numa wave inteira quer dizer que ninguém ali tem golpe de `cast`/`proj`
       — ou que o motor não publicou os golpes a caminho. */
    console.log(`    lancados antes do impacto: ${efeito.cargas} carga(s), ${efeito.projeteis} projetil(eis), ${efeito.jatos} jato(s)`);
    /* ── E AS FOLHAS DE COMBATE (D-090/D-091) ───────────────────────────
       Uma folha reprovada nao e erro — e arte que a origem nao tem. Mas
       DEZENAS delas querem dizer que o `npm run assets` nao passou por aqui, e
       era exatamente esse o estado quando o dono viu o selvagem sumir. */
    console.log(`    folhas de combate: ${efeito.folhasVistas} sondada(s), ` +
      `${efeito.folhasFaltando} sem arquivo` +
      (efeito.folhasFaltando ? '  <-- rode npm run assets' : ''));
  }

  /* ── E QUEM ESTÁ FORA DA JANELA DA CÂMERA ───────────────────────────────
     Nasceu de um número da própria esteira: em 420 o contador novo acusou 134
     estouros fora da tela, e zero nas outras larguras. A pergunta seguinte é a
     que separa dois defeitos diferentes — está fora o ESTOURO, ou o MOB em quem
     ele cai? Se o mob já está fora, o estouro está no lugar certo e quem erra é
     a câmera.

       > Um número sem a pergunta seguinte vira palpite. A esteira existe para
       > que a pergunta seguinte também tenha número. */
  const janelaCam = await pg.evaluate(() => {
    const cv = document.querySelector('#idleAtor');
    const palco = document.querySelector('#idlePalco');
    if (!cv || !palco) return null;
    const cr = palco.getBoundingClientRect();
    const mobs = [...document.querySelectorAll('.fundoPMD')].map(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height };
    });
    return {
      canvas: cv.width + 'x' + cv.height,
      palco: Math.round(cr.width) + 'x' + Math.round(cr.height),
      escala: +(cr.width / cv.width).toFixed(2),
      mobs: mobs.length,
      fora: mobs.filter(m => m.x + m.w <= 0 || m.y + m.h <= 0 ||
                             m.x >= cr.width || m.y >= cr.height).length,
    };
  }).catch(() => null);
  if (janelaCam) console.log(
    `    janela da camera: canvas ${janelaCam.canvas} · palco ${janelaCam.palco} · ` +
    `escala ${janelaCam.escala} · ${janelaCam.mobs} moldura(s), ${janelaCam.fora} fora` +
    (janelaCam.fora ? '  <-- o mob esta fora, e nao o estouro' : ''));

  /* ── O CLIMA DA RUN (1.32) ──────────────────────────────────────────────
   *
   * Três perguntas, e a ordem delas é o conserto de método do 1.27e:
   *
   *     QUAL caiu           o sorteio aconteceu, e qual foi
   *     quantas PARTÍCULAS  a conta de camada 0 devolve corpo? Isso o teste já
   *                         afirma sem navegador — aqui é só a confirmação de
   *                         que a janela real cabe o que ela pediu
   *     saiu PIXEL?         lida do CANVAS, e não de um contador
   *
   * A terceira é a única que prova alguma coisa, e é a que faltava por três
   * blocos. O 1.27c fechou dizendo "413 desenhos" com a tela vazia:
   *
   *   > Contador conta CHAMADA. Ele não olha para a tela.
   *
   * Aqui a esteira compara o canvas do ator COM e SEM o clima desenhado. Se a
   * diferença de pixels for zero, o clima existe no relatório e não na tela —
   * que é exatamente o estado que custou os três dias. */
  const clima = await pg.evaluate(async () => {
    const E = await import("/app/modules/avanco-estado.mjs");
    const C = await import("/app/modules/avanco-clima.mjs");
    const P = await import("/app/modules/clima-particulas.mjs");
    const PIN = await import("/app/modules/idle-clima.mjs");
    const D = await import("/app/modules/idle-dados.mjs");
    const M = await import("/app/modules/motor.mjs");
    const est = D.carregar();
    const run = E.runDe(est);
    if (!run) return { erro: "sem run" };
    const cl = C.climaDaRun(M.PACK, run);
    const cv = document.querySelector("#idleAtor");
    if (!cv) return { erro: "sem canvas" };

    /* PIXEL, E NÃO CHAMADA. Desenha o clima num canvas limpo do mesmo tamanho e
       conta quanto ficou opaco. Zero aqui com clima sorteado quer dizer que o
       desenho não chega aos olhos — e nenhum contador diria isso. */
    const off = document.createElement("canvas");
    off.width = cv.width; off.height = cv.height;
    const g = off.getContext("2d");
    const n = cl?.fx ? PIN.desenharClima(g, cl.fx, off.width, off.height, 4321) : 0;
    let opacos = 0;
    if (cl?.fx) {
      const d = g.getImageData(0, 0, off.width, off.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) opacos++;
    }
    const total = off.width * off.height;
    return {
      nome: cl?.name ?? "—", fx: cl?.fx ?? null, rende: cl?.rende ?? null,
      particulas: cl?.fx ? P.quantasDe(cl.fx, off.width, off.height) : 0,
      desenhadas: n, opacos, total,
      pct: total ? +(100 * opacos / total).toFixed(2) : 0,
      janela: off.width + "x" + off.height,
      cartao: !document.querySelector("#avClimaCard")?.hidden,
      frase: document.querySelector("#avClima .avClimaFrase")?.textContent ?? "",
      selo: document.querySelector("#avClimaPct")?.textContent
            ?? document.querySelector(".avClimaPct")?.textContent ?? "",
      noLog: [...document.querySelectorAll("#avLog .avEvt")]
               .some(x => /clima|Firme|Sol|Chuva|Vendaval|Tempestade|Névoa|Pólen|Nevasca/i.test(x.textContent)),
    };
  }).catch(e => ({ erro: e.message }));

  if (clima?.erro) console.log(`    clima da run: ERRO ${clima.erro}`);
  else {
    console.log(`    clima da run [raiz ${raiz}]: ${clima.nome} (${clima.fx ?? "sem desenho"}` +
      `${clima.rende ? ", rende " + clima.rende : ""}) · cartao ` +
      `${clima.cartao ? "no ar" : "ESCONDIDO"}${clima.selo ? " " + clima.selo : ""}` +
      `${clima.noLog ? " · no log" : " · FORA DO LOG"}`);
    if (clima.frase) console.log(`      diz: "${clima.frase}"`);
    if (clima.fx)
      console.log(`      PIXEL na janela ${clima.janela}: ${clima.particulas} particula(s) ` +
        `pedidas, ${clima.desenhadas} desenhada(s), ${clima.opacos} px opacos ` +
        `(${clima.pct}% da janela)` +
        (clima.opacos === 0 ? "  <-- desenhou e NAO apareceu" : ""));
  }

  const pilha = await pg.evaluate(() => {
    const rs = [...document.querySelectorAll('.avPlacaMob')].map(e => e.getBoundingClientRect());
    let n = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++)
      if (rs[i].left < rs[j].right && rs[j].left < rs[i].right &&
          rs[i].top < rs[j].bottom && rs[j].top < rs[i].bottom) n++;
    return n;
  });
  console.log(`    placas sobrepostas: ${pilha}` + (pilha ? '  <-- D-081' : ''));
  console.log(`    [${anuncio.wave}] anuncio do chefe: ${anuncio.visivel ? 'no ar — "' + anuncio.nome + '", barra ' + anuncio.largura : 'escondido'}`);
  relato.push({ largura: L.nome + (chefe ? ' (chefe)' : ' (run)'), px: L.w, altura: L.h, erros: erros.length,
                visivel: cheia.runVisivel, perfil: '—', arq });
  await ctx.close();
}

await b.close(); s.close();

console.log('\nOLHAR · a aba da rota\n');
for (const r of relato)
  console.log(`  ${r.largura.padEnd(11)} ${String(r.px).padStart(4)}px  altura ${String(r.altura).padStart(5)}` +
              `  ${r.biomas} biomas · ${r.cartoes} cartoes · ${r.estagios} estagios · ${r.previa} na previa · ${r.emCampo} em campo` +
              `  ${r.erros ? `${r.erros} ERRO(S)` : 'sem erro'}`);
console.log(`\n  ${relato.length} imagem(ns) em ${SAIDA}`);
console.log('\n  Isto NAO e portao: nada aqui reprova nada. Ele produz o que um');
console.log('  portao nao sabe produzir — uma imagem para alguem LER.\n');
if (relato.some(r => r.erros)) process.exitCode = 1;
