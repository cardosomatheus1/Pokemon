/* Q1/Q3 · A ESTEIRA DE OUTFIT (bloco 1.5, §0.3, e a regra "toda implementação
 * visual merece atenção especial").
 *
 * ── POR QUE ESTA SUÍTE EXISTE, e por que ela custa um navegador ───────────
 *
 * A conversão é o único lugar do projeto em que uma ARTE DO DONO entra e sai
 * diferente. Se ela errar, ninguém vê vermelho: o boneco simplesmente fica
 * feio, ou anda de costas, ou dá pulinhos. Os três já aconteceram.
 *
 *   vistas trocadas   o quadro 1 saiu o perfil e o 2 as costas, porque eu
 *                     ADIVINHAVA a vista pela largura. O perfil está a meio
 *                     passo, com as pernas abertas: é mais largo que as costas.
 *   pulinhos          o tronco subia 1 px nos DOIS quadros de passo, e o dono
 *                     viu na bancada antes de qualquer teste ver.
 *   três cópias       bancada, ferramenta e aba tinham cada uma a sua conversão.
 *
 * Nenhum dos três é erro de execução. Todos são erros de PIXEL, e pixel se
 * mede — que é o que esta suíte faz.
 *
 * ── A DIVISÃO ─────────────────────────────────────────────────────────────
 *
 *   PURO        ordem das vistas, corte em células, grade nativa.
 *               Roda em Node, em milissegundos, sempre.
 *   NAVEGADOR   o que toca canvas de verdade: chave de cor, redução, passo,
 *               folha. Aqui o Chromium não é conveniência — é o ambiente onde
 *               o código roda em produção, e um canvas de mentira testaria o
 *               meu canvas de mentira.
 *
 * Sem Chromium a metade de baixo é PULADA COM AVISO, como o Q5. `npm run
 * portoes` exige as duas.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { disponivel, PW_URL, CHROME } from './visual.mjs';
import { ordenarVistas, ORDEM_PADRAO, celulas, acharGrade } from '../app/modules/outfit.mjs';
import { ACERVO, PROCEDENCIAS, tem, carregar } from '../app/modules/outfit-acervo.mjs';

const FONTE = readFileSync(
  fileURLToPath(new URL('../app/modules/outfit.mjs', import.meta.url)), 'utf8');

/* Uma "ImageData" de mentira serve para as funções PURAS, e só para elas: elas
   leem `.data` e `.height` e mais nada. Onde a função toca canvas, o teste vai
   para o navegador — ver a nota de cima. */
function tela(w, h, pinta) {
  const data = new Uint8ClampedArray(w * h * 4);
  const set = (x, y) => { data[(y * w + x) * 4 + 3] = 255; };
  pinta(set);
  return { data, width: w, height: h };
}
const bloco = (set, x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y);
};

export function suite() {
  const s = criarSuite('outfit');

  /* ── 1 · A ORDEM DAS VISTAS ─────────────────────────────────────────────
     O defeito real: o dono manda frente/perfil/costas e o cartucho quer
     frente/costas/perfil. A tradução tem que ser DECLARADA, nunca adivinhada. */

  s.teste('a ordem padrão traduz frente·perfil·costas para frente·costas·perfil', () => {
    igual(ordenarVistas(['F', 'P', 'C']).join(''), 'FCP',
      'o quadro 1 é as COSTAS e o 2 é o perfil — é a ordem que o `idle-tela.mjs` ' +
      'lê para escolher o quadro pela direção. Trocar os dois faz o boneco andar ' +
      'de lado quando desce a tela, e nenhum teste de execução vê isso.');
  });

  s.teste('uma ordem de chegada diferente é respeitada, e não corrigida', () => {
    igual(ordenarVistas(['F', 'C', 'P'], ['frente', 'costas', 'perfil']).join(''), 'FCP',
      'a ordem de chegada declarada tem de ser obedecida ao pe da letra');
    igual(ordenarVistas(['C', 'P', 'F'], ['costas', 'perfil', 'frente']).join(''), 'FCP',
      'com as vistas chegando fora de ordem, a saída continua sendo a do cartucho');
  });

  s.teste('a ordem padrão é a do gerador do dono, e está declarada', () => {
    igual(ORDEM_PADRAO.join(','), 'frente,perfil,costas',
      'é a ordem em que as três artes chegaram. Mudar isto sem mudar os arquivos ' +
      'troca as vistas de todos os outfits já convertidos.');
  });

  s.teste('vista que a ordem não nomeia cai na primeira, e nunca em undefined', () => {
    const r = ordenarVistas(['A', 'B', 'C'], ['frente', 'lado', 'tras']);
    ok(r.every(v => v !== undefined),
      'nome desconhecido devolvendo undefined derruba a conversão inteira lá na ' +
      'frente, com erro que não aponta para a ordem. Repetir a frente é feio e ' +
      'visível — que é exatamente o que se quer de uma falha de dado.');
    igual(r[0], 'A');
  });

  /* ── 2 · O CORTE EM CÉLULAS ─────────────────────────────────────────────
     É o que separa três vistas numa arte só. Errar aqui parte um boneco ao
     meio, ou cola dois. */

  s.teste('três blocos separados viram três colunas', () => {
    const t = tela(90, 40, set => {
      bloco(set, 5, 5, 20, 34); bloco(set, 40, 5, 55, 34); bloco(set, 70, 5, 85, 34);
    });
    igual(celulas(t, 90, 40).cols.length, 3);
    igual(celulas(t, 90, 40).lins.length, 1,
      'as três vistas estão na MESMA linha — cortar em três linhas aqui daria ' +
      'nove vistas de um outfit que tem três');
  });

  s.teste('uma folga de 1 px dentro do corpo não parte a vista em duas', () => {
    /* um braço afastado do tronco deixa colunas vazias no meio da figura */
    const t = tela(60, 40, set => {
      bloco(set, 10, 5, 24, 34); bloco(set, 26, 5, 30, 34);
    });
    igual(celulas(t, 60, 40).cols.length, 1,
      'a folga mínima existe por isto: um vão de 1 px entre braço e tronco não ' +
      'é separação de vista. Sem a folga, um outfit de braço aberto vira dois.');
  });

  s.teste('imagem só de fundo devolve zero colunas, e não uma coluna vazia', () => {
    igual(celulas(tela(30, 30, () => {}), 30, 30).cols.length, 0,
      'o `converter` usa isto para decidir que a tolerância da chave de cor comeu ' +
      'o boneco inteiro, e avisar. Uma coluna vazia faria a esteira gravar um PNG ' +
      'transparente e dizer que deu certo.');
  });

  /* ── 3 · A GRADE NATIVA ─────────────────────────────────────────────────
     A arte do dono vem de gerador, e nem sempre em pixel 1:1: às vezes cada
     "pixel" da figura ocupa N px reais. Reduzir sem saber disso borra tudo. */

  s.teste('arte com pixel de 4 px reporta grade 4', () => {
    const t = tela(64, 64, set => {
      for (let by = 1; by < 9; by++) for (let bx = 1; bx < 9; bx++)
        if ((bx + by) % 2) bloco(set, bx * 4, by * 4, bx * 4 + 3, by * 4 + 3);
    });
    const g = acharGrade(t, 64, 64);
    ok(g === 4,
      `a grade nativa saiu ${g} e devia ser 4. Reduzir uma arte de pixel 4 como ` +
      'se fosse 1 mistura os quatro e devolve borrão — foi o "pixel muito pequeno" ' +
      'que o dono reprovou na segunda leitura da bancada.');
  });

  s.teste('arte já em 1:1 reporta grade 1, e não uma grade inventada', () => {
    const t = tela(40, 40, set => {
      for (let y = 4; y < 36; y++) for (let x = 4; x < 36; x++)
        if ((x * 7 + y * 13) % 3) set(x, y);
    });
    igual(acharGrade(t, 40, 40), 1,
      'inventar grade numa arte 1:1 joga fora detalhe que o dono pediu para REALÇAR');
  });

  /* ── 4 · O GUARDA-ROUPA ─────────────────────────────────────────────────
     Herdeiro do teste que morava em `test/idle-tela.mjs`: a folha do ator
     existia em disco. A tela deixou de cravar um caminho — quem responde qual
     traje desenhar é o acervo — e a afirmação veio junto, agora sobre TODOS. */

  s.teste('toda folha do acervo existe em disco', () => {
    for (const o of ACERVO) {
      const rel = o.folha.replace(/^\.\.\//, '');
      ok(existsSync(fileURLToPath(new URL('../' + rel, import.meta.url))),
        `a folha de "${o.nome}" (${rel}) não está em disco. Arte ausente vira ` +
        'cartão vazio na aba e boneco invisível no farm, e nada reclama — o ' +
        '`onerror` devolve null de propósito, para não derrubar a tela.');
    }
  });

  s.teste('todo traje declara uma procedência conhecida', () => {
    for (const o of ACERVO)
      ok(PROCEDENCIAS.includes(o.procedencia),
        `"${o.nome}" tem procedência "${o.procedencia}", que não é uma das quatro ` +
        'portas. É este campo que a loja consulta para saber o que pode vender e ' +
        'o market para recusar o que veio da loja (L-072). Traje sem porta seria ' +
        'reclassificado à mão no dia da separação, e são dezessete.');
  });

  s.teste('o traje de NPC não é vestível nem com a vitrine ligada', () => {
    /* A vitrine libera tudo para o dono testar — MENOS este. Se o traje do
       adversário puder ser vestido, o mundo do idle deixa de ter gente própria
       e vira um espelho do jogador; e o dono ia descobrir isso vestindo. */
    const estado = { posse: ['npc-teste'], vestido: null };
    ok(!tem(estado, 'npc-teste'),
      'um id fora do acervo não pode ser "tido" nem com a vitrine ligada');
    for (const o of ACERVO.filter(x => x.procedencia === 'npc'))
      ok(!tem({ posse: [o.id] }, o.id),
        `"${o.nome}" é de NPC e ficou vestível. Nenhuma porta concede npc — nem a ` +
        'loja, nem o baú, nem a missão, nem a vitrine de desenvolvimento.');
  });

  s.teste('outfit apagado do catálogo não deixa o jogador pelado', () => {
    const dep = { getItem: () => JSON.stringify({ posse: ['sumiu'], vestido: 'sumiu' }),
                  setItem: () => {} };
    const e = carregar(dep);
    ok(e.vestido === null || ACERVO.some(o => o.id === e.vestido),
      'com o traje vestido fora do catálogo, o guarda-roupa devolveu um id morto. ' +
      'O farm pediria uma folha inexistente e o mundo abriria sem ninguém — por ' +
      'causa de uma linha removida de um arquivo de dados.');
  });

  return s;
}

/* ══ A METADE DE NAVEGADOR ═══════════════════════════════════════════════════
   Aqui roda o `outfit.mjs` DE VERDADE, o mesmo arquivo do repositório, dentro
   do Chromium — e não uma cópia nem um canvas simulado. */

export async function suiteCanvas() {
  const s = criarSuite('outfit-canvas');
  if (!disponivel()) {
    s.teste('metade de canvas PULADA — sem navegador (use npm run portoes)', () => {
      ok(process.env.EXIGE_VISUAL !== '1',
        'o portão de fechamento exige o navegador: chave de cor, redução, passo e ' +
        'folha são pixel, e pixel não se confere sem quem desenhe.');
    });
    return s;
  }

  const { chromium } = await import(PW_URL);
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  let m;
  try {
    const pg = await b.newPage();
    await pg.goto('about:blank');
    m = await pg.evaluate(async fonte => {
      const mod = await import('data:text/javascript;base64,' +
        btoa(unescape(encodeURIComponent(fonte))));

      /* TRÊS VISTAS FALSAS, mas com o que importa: fundo rosa opaco (é como a
         arte do dono chega), silhuetas distinguíveis entre si, e pernas na
         parte de baixo — que é o que o `passo` mexe. */
      const arte = marca => {
        const c = document.createElement('canvas');
        c.width = 120; c.height = 200;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.fillStyle = 'rgb(255,0,200)'; g.fillRect(0, 0, 120, 200);
        g.fillStyle = '#204060';
        g.fillRect(40, 20, 40, 120);                 // tronco
        g.fillRect(44, 140, 12, 50);                 // perna esquerda
        g.fillRect(66, 140, 12, 50);                 // perna direita
        g.fillStyle = ['#ff2020', '#20ff20', '#2020ff'][marca];
        g.fillRect(48, 30, 24, 40);                  // a marca que identifica a vista
        return c;
      };
      const imgs = [arte(0), arte(1), arte(2)];

      const pixels = cv => cv.getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, cv.width, cv.height).data;

      /* qual das três marcas domina um quadro — é assim que se prova que a
         vista certa foi para o lugar certo */
      const marcaDe = cv => {
        const d = pixels(cv);
        const n = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          const [r, v, a] = [d[i], d[i + 1], d[i + 2]];
          if (r > 140 && v < 110 && a < 110) n[0]++;
          else if (v > 140 && r < 110 && a < 110) n[1]++;
          else if (a > 140 && r < 110 && v < 110) n[2]++;
        }
        const mx = Math.max(...n);
        return mx === 0 ? -1 : n.indexOf(mx);
      };

      /* diferença por linha entre dois quadros */
      const linhas = (a, bq) => {
        const A = pixels(a), B = pixels(bq), w = a.width, h = a.height;
        const dif = [];
        for (let y = 0; y < h; y++) {
          let n = 0;
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 3] - B[i + 3]) > 8) n++;
          }
          dif.push(n);
        }
        return dif;
      };

      /* o passo, medido direto e SEM contorno: assim a comparação é do
         movimento, e não do traço que o contorno acrescenta por cima */
      const cru = mod.converter(imgs, { altura: 52, contorno: false });
      const q0 = cru.quadros[0];
      const d0 = linhas(q0, mod.passo(q0, 0)), d1 = linhas(q0, mod.passo(q0, 1));
      const corte = Math.round(q0.height * 0.72);
      const soma = (d, a, z) => d.slice(a, z).reduce((x, y) => x + y, 0);

      /* base de cada quadro: a última linha com pixel opaco */
      const baseDe = cv => {
        const d = pixels(cv);
        for (let y = cv.height - 1; y >= 0; y--)
          for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 8) return y;
        return -1;
      };

      const cantoAlfa = mod.chavear(imgs[0], { tolerancia: 40 }).dados.data[3];
      const feito = mod.converter(imgs, { altura: 52 });

      return {
        cantoAlfa,
        largura: feito.canvas.width,
        quadroW: feito.quadro.w, quadroH: feito.quadro.h,
        nQuadros: feito.quadros.length,
        alturasDasVistas: feito.vistas.map(v => v.height),
        troncoQuieto: [soma(d0, 0, corte), soma(d1, 0, corte)],
        pernaMexe: [soma(d0, corte, d0.length), soma(d1, corte, d1.length)],
        marcas: [0, 1, 2].map(i => marcaDe(feito.quadros[i])),
        bases: feito.quadros.map(baseDe),
      };
    }, FONTE);
  } finally { await b.close(); }

  /* ── a chave de cor ──────────────────────────────────────────────────── */
  s.teste('o fundo rosa some, e o canto fica transparente', () => {
    igual(m.cantoAlfa, 0,
      'a chave de cor é lida do canto da própria imagem. Se ela falhar, o outfit ' +
      'entra na aba dentro de um retângulo rosa — e o teste de execução passa.');
  });

  /* ── a folha ─────────────────────────────────────────────────────────── */
  s.teste('a folha tem nove quadros de largura igual', () => {
    igual(m.nQuadros, 9);
    igual(m.largura, m.quadroW * 9,
      'o `idle-tela.mjs` fatia a folha em nove por divisão. Quadro de largura ' +
      'variável faz o recorte pegar meio boneco e meio vizinho.');
  });

  s.teste('a altura pedida é a altura entregue', () => {
    igual(m.quadroH, 52);
    ok(m.alturasDasVistas.every(h => h === 52),
      `as vistas saíram ${m.alturasDasVistas.join('/')} e todas deviam ter 52. ` +
      'Vistas de alturas diferentes fazem o boneco encolher ao virar de lado.');
  });

  /* ── O TRONCO NÃO SE MEXE ────────────────────────────────────────────────
     Este é o teste dos "pulinhos", e é o motivo de a suíte existir. */
  s.teste('o tronco não se move nos dois quadros de passo', () => {
    igual(m.troncoQuieto.join('+'), '0+0',
      `o tronco mudou em ${m.troncoQuieto.join(' e ')} pixels entre o quadro parado ` +
      'e os de passo. Andar é a PERNA que se alterna; subir o tronco junto é o ' +
      'pulinho que o dono viu na bancada — e ele viu antes de qualquer teste ver.');
  });

  s.teste('a perna se move — o passo não pode ser um quadro repetido', () => {
    ok(m.pernaMexe[0] > 0 && m.pernaMexe[1] > 0,
      `os passos diferem do quadro parado em ${m.pernaMexe.join(' e ')} pixels ` +
      'abaixo do corte. Zero aqui é um boneco deslizando pelo chão de pernas ' +
      'rígidas, que passa verde em tudo e é a primeira coisa que se vê.');
  });

  /* ── a identidade de cada quadro ─────────────────────────────────────── */
  s.teste('cada quadro carrega a vista certa, e não a vizinha', () => {
    /* A ENTRADA é frente·perfil·costas (marcas 0·1·2, a ordem do gerador do
       dono) e a SAÍDA é frente·costas·perfil. Logo o esperado é 0·2·1 — e é
       justamente essa troca do meio que saiu errada da primeira vez. Se este
       teste esperasse 0·1·2, ele estaria afirmando que a tradução não acontece. */
    igual(m.marcas.join(''), '021',
      `os quadros 0·1·2 carregam as marcas ${m.marcas.join('·')}, e deviam carregar ` +
      '0·2·1 — a frente que chegou primeiro, as costas que chegaram por último, e ' +
      'o perfil que chegou no meio. Quando duas vistas se parecem, a folha fica ' +
      'plausível e errada, e só ampliando se enxerga.');
  });

  /* ── o alinhamento ───────────────────────────────────────────────────── */
  s.teste('todos os quadros se alinham pela BASE', () => {
    const pes = m.bases.filter(y => y >= 0);
    const menor = Math.min(...pes), maior = Math.max(...pes);
    ok(maior - menor <= 1,
      `os pés dos nove quadros vão da linha ${menor} à ${maior}. A sombra e a ` +
      'oclusão do cenário saem da linha de baixo: pé fora do lugar faz o boneco ' +
      'flutuar num quadro e afundar no outro.');
  });

  return s;
}
