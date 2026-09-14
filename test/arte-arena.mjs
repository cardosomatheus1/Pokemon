/* Q1/Q2/Q5 · O RAYQUAZA AO FUNDO DA ARENA (R17 — fecha a L-046)
 *
 * ── O QUE A LACUNA REGISTRAVA ──────────────────────────────────────────────
 *
 * O único Rayquaza do projeto está em
 * `arte/Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg`, e ele NÃO é uma arte de
 * fundo: é um mockup de tela inteira com navegação falsa LEGÍVEL embutida no
 * pixel — `Home`, `About Us`, `Events`, `Contact Us`, `ENTER THE ARENA`,
 * `ABOUT` — e o letrado da marca dentro de uma moldura de monitor.
 *
 * O R7 recusou usá-lo e registrou a `L-046`. O dono do projeto decidiu: tirar
 * os textos e ficar com a imagem.
 *
 * ── O QUE ESTE ARQUIVO GUARDA ─────────────────────────────────────────────
 *
 * Que a tela use a arte PREPARADA, e nunca o mockup cru. É a única forma de
 * uma barra de navegação falsa voltar para trás da luta: alguém trocar o
 * caminho de volta, por engano, num bloco futuro.
 *
 * E que o preparo continue sendo REPRODUTÍVEL. A arte derivada é versionada,
 * mas o script que a deriva é o que explica de onde ela veio — sem ele, daqui
 * a um ano ninguém sabe o que foi cortado nem por quê.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');
const RAIZ = new URL('../', import.meta.url);

/* Os textos que o mockup tem embutidos. Não dá para lê-los de dentro do PNG
   sem decodificar imagem, e decodificar imagem em teste exigiria dependência —
   o que este projeto não tem. O que dá para garantir, e é o que importa, é que
   a TELA não aponte para o arquivo que os contém. */
const MOCKUP = 'Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg';
const PREPARADA = 'arte/arena-rayquaza.png';

export function suite() {
  const s = criarSuite('arte-arena');
  /* AFIRMAR SOBRE O QUE O NAVEGADOR PINTA, e nao sobre o que o arquivo diz.
     Comentario que EXPLICA um enquadramento contem os mesmos numeros do
     enquadramento, e um teste ingenuo casa com a explicacao em vez da regra.
     E a quinta vez que este projeto encontra a mesma armadilha: R10 no
     banner, R34 no shiny, R35 no tema, R38 no banner de novo. */
  const semComentario = APP.replace(/\/\*[\s\S]*?\*\//g, ' ');


  s.teste('a arte preparada existe e está versionada', () => {
    const f = new URL(PREPARADA, RAIZ);
    ok(existsSync(f), `${PREPARADA} não existe — rode tools/preparar-arte-arena.mjs`);
    ok(statSync(f).size > 100 * 1024,
      `${PREPARADA} tem ${statSync(f).size} bytes — pequeno demais para a arte inteira`);
  });

  /* A ASSERÇÃO CENTRAL DO BLOCO, e ela é uma AUSÊNCIA: o mockup cru não pode
     ser desenhado em lugar nenhum. Se ele voltar, volta com `Home`,
     `About Us` e `ENTER THE ARENA` atrás da luta. */
  s.teste('o mockup cru não é desenhado em lugar nenhum da tela', () => {
    ok(!APP.includes(MOCKUP),
      'a tela voltou a apontar para o mockup — com ele vem a navegação falsa');
  });

  s.teste('a arena veste a arte preparada', () => {
    ok(APP.includes(PREPARADA),
      'a arena não usa a arte do Rayquaza — a L-046 continuaria aberta');
    const r = APP.match(/#viewArena::before\{[^}]*\}/);
    ok(r, 'a camada de arte da arena sumiu do CSS');
    ok(/position:fixed/.test(r[0]),
      'a arte da arena não é fixa: ela rolaria junto e viraria papel de parede');
    ok(/z-index:-1/.test(r[0]),
      'a arte da arena não está atrás do conteúdo');
  });

  /* O VÉU É O QUE SUSTENTA A LEITURA. A arte é cidade neon, com pontos claros
     que passam por trás dos painéis. Sem véu, o contraste do texto cai onde a
     cidade acende — e o portão de contraste mede a cor DECLARADA, não a que
     sobra depois de uma imagem por baixo (ver L-045). */
  s.teste('a arte da arena tem véu por cima', () => {
    const r = APP.match(/#viewArena::after\{[^}]*\}/);
    ok(r, 'o véu da arte da arena sumiu — a cidade acende atrás dos painéis');
    ok(/gradient/.test(r[0]), `o véu deixou de ser degradê: ${r[0]}`);
  });

  /* Arte derivada sem o script que a deriva é arte sem procedência. Daqui a um
     ano, "o que foi cortado e por quê" só existe se o script existir. */
  s.teste('o preparo da arte continua reprodutível', () => {
    const f = new URL('tools/preparar-arte-arena.mjs', RAIZ);
    ok(existsSync(f), 'o script que prepara a arte sumiu — a derivação perdeu a procedência');
    const src = readFileSync(f, 'utf8');
    ok(src.includes(MOCKUP), 'o script não diz mais de qual arte ele parte');
    ok(/CORTE\s*=/.test(src) && /LETRADO\s*=/.test(src),
      'o script perdeu as medidas do corte — elas são o registro do que foi removido');
  });


  /* ═══ R41 · O RAYQUAZA CONTORNANDO O LAYOUT ═════════════════════════════
   *
   * A arte deixou de ser papel de parede e passou a ser MOLDURA. A diferença
   * mora inteira no enquadramento — três números —, e nenhum deles quebra nada
   * quando erra: erram para o papel de parede antigo, em silêncio.
   *
   * O que estes testes guardam não é a beleza do encaixe. É a fronteira que o
   * dono do projeto repetiu três vezes: a moldura não pode afetar a
   * visualização da arena nem os avisos dela. */

  s.teste('a arte da arena contorna o layout, e não o cobre', () => {
    /* `cover` é o oposto do pedido: ele corta o corpo do bicho nas quatro
       bordas, e o que sobra não contorna coisa nenhuma. A largura de 188% é a
       média geométrica entre "o corpo inteiro cabe" e "o visor vira o layout"
       — o ponto em que os dois erros ficam do mesmo tamanho. */
    const regra = semComentario.match(/#viewArena::before\{([^}]*)\}/);
    ok(regra, '#viewArena::before sumiu: a arena ficou sem a arte de fundo');
    ok(/188%\s+auto/.test(regra[1]),
      'o enquadramento voltou a preencher a tela em vez de contornar o layout');
    ok(!/\/\s*cover/.test(regra[1]),
      '`cover` corta o corpo do bicho nas quatro bordas — ele deixa de contornar');
  });

  s.teste('o enquadramento centra o VISOR, e não a imagem', () => {
    /* Parece a mesma coisa e não é: o bicho ocupa mais o lado direito da arte,
       então o visor NÃO fica no meio dela. Centrar a imagem joga o nosso
       layout para fora da abertura. 50,5% sai da conta, não do olho. */
    const regra = semComentario.match(/#viewArena::before\{([^}]*)\}/)[1];
    const pos = regra.match(/png'\)\s+([\d.]+)%\s+([\d.]+)%/);
    ok(pos, 'a posição do fundo deixou de ser declarada em porcentagem');
    const x = Number(pos[1]);
    ok(x > 50 && x < 52,
      `o centro horizontal foi para ${x}%: o visor da arte está em 50,5%, e ` +
      `50% centraria a IMAGEM, que é outro ponto`);
  });

  s.teste('a camada do rosto usa o mesmo enquadramento da arte', () => {
    /* Se os dois divergirem um pixel, o desenho aparece DUPLICADO e
       desalinhado — que é pior do que não aparecer. Por isso a camada copia os
       três números em vez de recalcular. */
    const fundo = semComentario.match(/#viewArena::before\{([^}]*)\}/)[1];
    const rosto = semComentario.match(/#rqRosto::before\{([^}]*)\}/);
    ok(rosto, '#rqRosto::before sumiu: o rosto do bicho não é desenhado');
    for (const n of ['188%', '50.5%', '53%'])
      ok(fundo.includes(n) && rosto[1].includes(n),
        `"${n}" não está nas duas camadas: o rosto vai aparecer desalinhado do corpo`);
  });

  s.teste('a máscara do rosto tem raio declarado', () => {
    /* EM CSS, `radial-gradient(circle at ...)` SEM RAIO significa
       `farthest-corner` — a máscara cobre a tela inteira. Foi o defeito real
       da primeira aplicação: o `screen` lavou a interface toda e o letrado da
       arte apareceu por cima da arena. Nenhum teste estático anterior viu. */
    const rosto = semComentario.match(/#rqRosto::before\{([^}]*)\}/)[1];
    ok(/mask-image:radial-gradient\(\s*(ellipse|circle)\s+[\d.]+%/.test(rosto),
      'a máscara do rosto ficou sem raio: em CSS isso quer dizer `farthest-corner`, ' +
      'e ela passa a cobrir a tela inteira');
  });

  s.teste('a moldura não alcança a arena nem os avisos dela', () => {
    /* A REGRA QUE O DONO DO PROJETO REPETIU TRÊS VEZES, e a que este bloco
       quase violou. Medido com `tools/previas/medir-veu.mjs`: com a camada
       ACIMA do conteúdo ela alterava #arena em 10,1% dos bytes e #log em 131%.
       E como o nosso texto é CLARO sobre fundo ESCURO, `screen` REDUZ o
       contraste ali em vez de preservá-lo — a suíte `contraste` passa 12/12
       assim mesmo, porque ela mede cor declarada e não composição.
       Atrás do conteúdo, o efeito é o mesmo que a arte de fundo já tinha:
       passar pelos painéis translúcidos, que é o desenho do produto. */
    for (const sel of ['#viewArena::before', '#viewArena::after', '#rqRosto']) {
      const regra = semComentario.match(
        new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}'));
      ok(regra, `${sel} sumiu`);
      ok(/z-index:\s*-1/.test(regra[1]),
        `${sel} saiu de trás do conteúdo: dali ele altera o contraste da arena e do log`);
      ok(/pointer-events:\s*none/.test(regra[1]),
        `${sel} passou a receber clique, e ele cobre a tela inteira`);
    }
  });

  s.teste('o olho acende devagar, e não pisca', () => {
    /* Seis segundos e meio de ciclo, com o olho APAGADO na maior parte dele.
       É o que separa "o bicho está vivo" de "tem uma luz piscando na tela":
       perto da arena, luz rápida disputa o olho com a luta, e um K.O. que o
       jogador não viu custa mais do que o charme vale. */
    const olho = semComentario.match(/#rqRosto::after\{([^}]*)\}/);
    ok(olho, '#rqRosto::after sumiu: o olho não acende');
    const dur = olho[1].match(/animation:rqOlho\s+([\d.]+)s/);
    ok(dur, 'a animação do olho deixou de declarar duração');
    ok(Number(dur[1]) >= 4,
      `o ciclo caiu para ${dur[1]}s: abaixo de 4s a luz vira pisca-pisca ao lado da luta`);
  });

  s.teste('o olho é âmbar, e não vermelho', () => {
    /* Decisão do dono do projeto, com uma razão melhor que a minha proposta
       original: o olho do bicho no desenho é um globo amarelo-ouro com íris
       preta. Vermelho não é um néon sobre ele — é outro bicho. O néon entra na
       INTENSIDADE, não na cor. */
    const olho = semComentario.match(/#rqRosto::after\{([^}]*)\}/)[1];
    ok(/rgba\(255,214,94/.test(olho),
      'o olho perdeu o âmbar: a cor é a identidade do bicho, e o néon entra na ' +
      'intensidade, não na cor');
  });

  return s;
}
