/* A COMPOSIÇÃO DO BIOMA — bloco 1.15, a L-101.
 *
 * O que estes testes protegem não é "a trilha curva". É o conjunto de coisas
 * que a curva podia quebrar e que ninguém veria:
 *
 *   a estrada PARTIDA        um degrau de duas linhas separa a faixa em dois
 *                            pedaços que só se tocam pela quina — o personagem
 *                            atravessa a grama e a cena não acusa nada
 *   a estrada NA ÁGUA        o desvio para baixo passa da margem
 *   a peça EM CIMA da trilha a faixa da grama para no EIXO, e a estrada agora
 *                            sobe acima dele
 *   o detalhe que SUMIU      redistribuir por região não pode mudar o total,
 *                            ou "mais lugares" vira "menos coisas"
 *
 * E um que é a lacuna em si: se a curva e as regiões não crescerem com a
 * largura, o panorâmico volta a ser o campo liso que abriu a L-101.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { PACK } from '../app/modules/motor.mjs';
import { plantaDo, COLS_PADRAO, ROWS_PADRAO } from '../app/modules/mundo.mjs';
import { decorar } from '../app/modules/decoracao.mjs';
import { acidentes } from '../app/modules/relevo.mjs';
import {
  trilhaDe, trilhaEm, naTrilha, assentar, desvioCru, curvasDe, DESVIO_MAX,
  regioes, quantasRegioes, pesoEm, mediaDoPeso, quantosCandidatos, aceita,
  alturaSuave, esfarelaEm, ESFARELA,
  PESO_CLAREIRA, PESO_MATA, PESO_BASE, REGIOES_MAX,
} from '../app/modules/composicao.mjs';

const BIOMAS = (PACK.biomas ?? []).map(b => b.id);

export function suite() {
  const s = criarSuite('composicao');

  /* ── A TRILHA CONTINUA SENDO UMA TRILHA ────────────────────────────────── */

  s.teste('a trilha nunca dá um degrau que a parta em dois', () => {
    /* Com faixa de DUAS linhas, um degrau de 1 deixa uma linha de sobreposição
       e a estrada segue conectada. Um degrau de 2 não deixa nenhuma.

       Este é o teste que justifica a construção por passeio: a garantia não é
       conferida depois, é impossível de violar. Se alguém trocar o passeio por
       um `Math.round` direto da onda, isto fica vermelho. */
    for (const b of BIOMAS) for (const cols of [12, 44, 96, 160]) {
      const t = trilhaDe(b, { cols, rows: 28, caminho: 16, margem: 26 });
      igual(t.length, cols, `${b}/${cols}: a trilha não cobre todas as colunas`);
      for (let i = 1; i < t.length; i++)
        ok(Math.abs(t[i] - t[i - 1]) <= 1,
          `${b}/${cols}: degrau de ${Math.abs(t[i] - t[i - 1])} na coluna ${i} — ` +
          'a estrada partiu em dois pedaços que se tocam pela quina');
    }
  });

  s.teste('a trilha nunca encosta na água nem sai pelo teto', () => {
    for (const b of BIOMAS) for (const rows of [14, 20, 28, 40]) {
      const p = plantaDo(PACK, b, { cols: 44, rows });
      for (let lx = 0; lx < p.cols; lx++) {
        const t = trilhaEm(p.trilha, lx, p.caminho);
        ok(t >= 1, `${b}/${rows}: a trilha subiu para ${t}, fora do mapa`);
        ok(t + 1 < p.margem,
          `${b}/${rows}: a trilha chegou em ${t + 1} e a margem está em ` +
          `${p.margem} — o jogador andaria dentro do mar`);
      }
    }
  });

  s.teste('a linha da trilha é caminho de ponta a ponta, e o resto não é', () => {
    /* A afirmação antiga era `p.tiles[caminho].every(tipo === 'caminho')`, e
       ela media a RETIDÃO da estrada — que era um acidente da implementação, e
       não uma propriedade que alguém quisesse. Trocada pela que importa: em
       toda coluna existe chão pisado, e ele está onde a curva diz. */
    for (const b of BIOMAS) {
      const p = plantaDo(PACK, b);
      for (let lx = 0; lx < p.cols; lx++) {
        const t = trilhaEm(p.trilha, lx, p.caminho);
        igual(p.tiles[t][lx].tipo, 'caminho',
          `${b}: a coluna ${lx} não tem chão pisado na linha ${t}`);
        igual(p.tiles[t + 1][lx].tipo, 'caminho',
          `${b}: a coluna ${lx} tem só uma linha de trilha`);
        if (t - 1 >= 0)
          ok(p.tiles[t - 1][lx].tipo !== 'caminho',
            `${b}: a trilha da coluna ${lx} tem três linhas de espessura`);
      }
    }
  });

  s.teste('a trilha DE FATO curva — e curva mais quanto mais largo o mundo', () => {
    /* A lacuna era exatamente esta. Uma implementação que devolvesse o eixo
       sempre passaria em todos os testes acima, e deixaria a régua na tela. */
    const alturasDe = (b, cols) => {
      const t = trilhaDe(b, { cols, rows: 28, caminho: 16, margem: 26 });
      return Math.max(...t) - Math.min(...t);
    };
    for (const b of BIOMAS)
      ok(alturasDe(b, COLS_PADRAO) >= 2,
        `${b}: a trilha varia só ${alturasDe(b, COLS_PADRAO)} linha no mundo ` +
        'padrão — continua sendo uma régua');

    /* E o número de curvas cresce com a largura, que é a metade da lacuna que
       falava em "convocada em função da largura, e não só do bioma". */
    ok(curvasDe(160) > curvasDe(44),
      'o panorâmico não recebe mais curvas que o mundo padrão');
    ok(curvasDe(44) > curvasDe(12),
      'o mundo padrão não recebe mais curvas que o estreito');
    igual(curvasDe(0), 1, 'largura zero devia render uma curva, não nenhuma');
  });

  s.teste('o desvio cru fica dentro de -1..1, senão o teto de linhas mente', () => {
    /* `DESVIO_MAX` só é um teto se a onda estiver normalizada. Sem isto, somar
       duas senóides devolveria até 1,42 e a trilha desviaria 4 linhas com o
       comentário dizendo 3. */
    for (const b of BIOMAS) for (let lx = 0; lx < 200; lx++) {
      const v = desvioCru(b, 200, lx);
      ok(v >= -1.0001 && v <= 1.0001, `${b}: desvio cru ${v} fora de -1..1`);
    }
    ok(DESVIO_MAX >= 2, 'um teto abaixo de 2 some no ruído do chão');
  });

  s.teste('o mesmo bioma devolve sempre a mesma trilha', () => {
    for (const b of BIOMAS) {
      const a = trilhaDe(b, { cols: 44, rows: 28, caminho: 16, margem: 26 });
      const c = trilhaDe(b, { cols: 44, rows: 28, caminho: 16, margem: 26 });
      igual(a.join(','), c.join(','), `${b}: a estrada mudou entre duas visitas`);
    }
    const distintas = new Set(BIOMAS.map(b =>
      trilhaDe(b, { cols: 44, rows: 28, caminho: 16, margem: 26 }).join(',')));
    ok(distintas.size >= Math.max(2, BIOMAS.length - 1),
      `${distintas.size} traçados para ${BIOMAS.length} biomas — ` +
      'dois lugares com a mesma estrada são papel de parede');
  });

  /* ── NADA ASSENTA EM CIMA DA ESTRADA ───────────────────────────────────── */

  s.teste('nem detalhe, nem decoração, nem relevo caem no chão pisado', () => {
    for (const b of BIOMAS) {
      const p = plantaDo(PACK, b);
      const pisado = (lx, ly) => naTrilha(p.trilha, lx, ly, p.caminho);

      for (const d of p.detalhes)
        ok(!pisado(d.lx, d.ly),
          `${b}: um detalhe caiu na trilha em (${d.lx},${d.ly})`);

      for (const a of p.relevo ?? []) {
        if (a.forma === 'lago' || a.forma === 'cachoeira') continue;
        const lx = Math.floor(a.x / 16), ly = Math.floor(a.y / 16);
        ok(!pisado(lx, ly),
          `${b}: um ${a.forma} nasceu na trilha em (${lx},${ly})`);
      }

      for (const d of decorar(p, 16)) {
        const lx = Math.floor(d.x / 16), ly = Math.floor(d.y / 16) - 1;
        if (ly >= p.margem) continue;                 // margem e água têm faixa própria
        if (d.chao) continue;                         // peça de chão é pintada NA trilha
        ok(!pisado(lx, ly) || ly === p.caminho || ly === p.caminho + 1,
          `${b}: uma decoração caiu na trilha em (${lx},${ly})`);
      }
    }
  });

  s.teste('assentar empurra para a beira, e não descarta', () => {
    /* A escolha entre rejeitar e assentar não é de estilo: rejeitar esvazia a
       beira da curva, que é justamente onde o olho está. */
    const p = { trilha: [10, 10, 11, 12, 13], caminho: 13, margem: 26 };
    igual(assentar(p, 'grama', 0, 10), 9, 'a peça sobre a trilha não subiu');
    igual(assentar(p, 'grama', 0, 11), 9, 'a segunda linha da trilha não foi tratada');
    igual(assentar(p, 'grama', 0, 5), 5, 'uma peça longe da trilha foi movida à toa');
    igual(assentar(p, 'trilha', 0, 13), 10, 'a peça de estrada não seguiu a curva');
    igual(assentar(p, 'trilha', 0, 14), 11, 'a segunda linha da estrada não seguiu');
    igual(assentar(p, 'margem', 0, 26), 26, 'a margem não devia se mexer');
  });

  /* ── AS REGIÕES ────────────────────────────────────────────────────────── */

  s.teste('há mais regiões num mundo maior, e o teto existe', () => {
    ok(quantasRegioes(88, 28) > quantasRegioes(44, 28),
      'dobrar a largura não trouxe mais nenhuma região — a lacuna continua');
    igual(quantasRegioes(0, 0), 1, 'um mundo degenerado devia render uma região');
    igual(quantasRegioes(9000, 9000), REGIOES_MAX, 'o teto de regiões não segurou');
  });

  s.teste('clareira e mata coexistem, e uma esvazia o que a outra enche', () => {
    for (const b of BIOMAS) {
      const g = regioes(b, { cols: 88, rows: 28, margem: 26 });
      const tipos = new Set(g.map(r => r.tipo));
      ok(tipos.has('clareira') && tipos.has('mata'),
        `${b}: num mundo largo só apareceu ${[...tipos].join('/')} — ` +
        'sem os dois extremos não existe contraste, só um mapa mais cheio');

      const cl = g.find(r => r.tipo === 'clareira');
      const ma = g.find(r => r.tipo === 'mata');
      ok(pesoEm(g, cl.cx, cl.cy) < PESO_BASE,
        `${b}: o centro da clareira não é mais vazio que o chão comum`);
      ok(pesoEm(g, ma.cx, ma.cy) > PESO_BASE,
        `${b}: o centro da mata não é mais cheio que o chão comum`);
    }
  });

  s.teste('longe de toda região o peso é exatamente o do chão comum', () => {
    /* Se a queda não zerasse na borda, o mapa inteiro ganharia um viés e a
       densidade calibrada pelo pack deixaria de valer. */
    const g = [{ tipo: 'mata', cx: 5, cy: 5, raio: 3 }];
    igual(pesoEm(g, 50, 50), PESO_BASE, 'o peso vazou para fora do raio');
    igual(pesoEm([], 1, 1), PESO_BASE, 'sem região o peso já não é o base');
  });

  s.teste('a região redistribui o detalhe, e NÃO muda o total', () => {
    /* É a promessa inteira do desenho: "mais lugares" não pode virar "menos
       coisas". Mede-se comparando o total aceito com o total pedido — e não
       com a constante que o produziu. */
    for (const b of BIOMAS) {
      const p = plantaDo(PACK, b);
      const pedido = Math.round((PACK.biomas.find(x => x.id === b)?.detalhe ?? 90)
        * (p.cols * p.rows) / 150);
      const razao = p.detalhes.length / pedido;
      ok(razao > 0.72 && razao < 1.12,
        `${b}: ficaram ${p.detalhes.length} detalhes para ${pedido} pedidos ` +
        `(${(razao * 100).toFixed(0)}%) — a redistribuição está criando ou comendo chão`);
    }
  });

  s.teste('o chão fica DESIGUAL — é a lacuna, e é o que se vê', () => {
    /* Contra uma implementação que ligasse as regiões e as deixasse sem efeito.
       Divide a largura em oito colunas e exige que a mais cheia tenha bem mais
       detalhe que a mais vazia. Num sorteio uniforme a razão fica perto de 1. */
    for (const b of BIOMAS) {
      const p = plantaDo(PACK, b, { cols: 88, rows: ROWS_PADRAO });
      const balde = new Array(8).fill(0);
      for (const d of p.detalhes) balde[Math.min(7, Math.floor(d.lx / (88 / 8)))]++;
      const cheio = Math.max(...balde), vazio = Math.min(...balde);
      ok(cheio >= vazio * 1.6,
        `${b}: a coluna mais cheia tem ${cheio} e a mais vazia ${vazio} — ` +
        'o chão continua sendo ruído uniforme, que é o que a L-101 descreveu');
    }
  });

  s.teste('o sorteio a mais e a recusa por peso se correspondem', () => {
    /* `quantosCandidatos` e `aceita` são as duas metades de uma conta só. Se
       alguém mexer numa e não na outra, o total de detalhe anda em silêncio. */
    ok(quantosCandidatos(100) > 100, 'não se sorteia candidato a mais');
    igual(quantosCandidatos(0), 0, 'zero pedido devia sortear zero');
    ok(aceita(PESO_MATA, 0.99), 'o peso máximo devia aceitar sempre');
    ok(!aceita(PESO_CLAREIRA, 0.5),
      'a clareira aceitou metade dos candidatos — ela devia ser um respiro');
    ok(PESO_CLAREIRA > 0,
      'clareira com peso zero lê como buraco no mapa, não como clareira');
  });

  /* ── A PLANTA CARREGA A DECISÃO ────────────────────────────────────────── */

  s.teste('a planta publica a trilha e as regiões, para a cena só desenhar', () => {
    const p = plantaDo(PACK, BIOMAS[0]);
    ok(Array.isArray(p.trilha) && p.trilha.length === p.cols,
      'a planta não carrega a linha da trilha por coluna');
    ok(Array.isArray(p.regioes) && p.regioes.length >= 1,
      'a planta não carrega as regiões');
    ok(Number.isInteger(p.caminho),
      'o eixo sumiu — é o que diz de que lado da estrada uma coisa está');
  });
  /* ── OS QUATRO QUE O Q2 PEGOU DEPOIS, E POR QUE ELES FALTAVAM ───────────
   *
   * A primeira leva de testes deste bloco deixou quatro defeitos escaparem, e
   * os quatro contam a mesma história por caminhos diferentes:
   *
   *   S701 · S702   a PINTURA não tinha teste nenhum. Eu tinha testado a
   *                 DECISÃO (onde a trilha passa) e deixado o TRAÇO de fora —
   *                 e o traço é justamente onde estava a escada, que foi o
   *                 erro que o dono teria visto.
   *   S697          o teste do total existia e era FROUXO. Ele aceitava de 72%
   *                 a 112%, e o defeito entrega 92%. Régua com folga é defeito
   *                 passando.
   *   S703          o aparo era código MORTO: medido, o peso nunca passa de
   *                 PESO_MATA com as regiões alternando. Um defeito que não se
   *                 pode observar não é defeito — então o teste abaixo cria a
   *                 sobreposição que o torna observável, em vez de eu apagar
   *                 um aparo que fica certo no dia em que a alternância mudar.
   */

  s.teste('a compensação DEVOLVE o total, e a régua vê 8% de erro', () => {
    /* Analítico, e não amostral: com o sorteio descorrelacionado, o número de
       aceitos esperado é `candidatos × média / PESO_MATA` exatamente. Medir por
       amostra exigiria uma folga que não enxerga os 8% que a constante erra.

       A constante devolve `n × média` — e a média por bioma vai de 0,917 a
       1,107, então ela erra para os DOIS lados. */
    for (const b of BIOMAS) {
      const mapa = regioes(b, { cols: 44, rows: 28, margem: 26 });
      const media = mediaDoPeso(mapa, { cols: 44, margem: 26 });
      const pedido = 1000;
      const esperado = quantosCandidatos(pedido, media) * media / PESO_MATA;
      const erro = Math.abs(esperado - pedido) / pedido;
      ok(erro < 0.01,
        `${b}: com média ${media.toFixed(3)} a conta entrega ${esperado.toFixed(0)} ` +
        `para ${pedido} pedidos (${(erro * 100).toFixed(1)}% de erro) — ` +
        'a compensação não está compensando');
    }
  });

  s.teste('a média aparada concorda com o que a recusa realmente faz', () => {
    /* DUAS MATAS SOBREPOSTAS. Não acontece hoje — as regiões alternam — mas é
       exatamente o estado em que medir o peso cru e recusar pelo aparado se
       separam: o cru dá 3,8 e a recusa continua aceitando 100%, não 158%.

       Sem esta sobreposição sintética, o aparo é código que ninguém exercita, e
       código que ninguém exercita fica errado sem ninguém saber. */
    const juntas = [
      { tipo: 'mata', cx: 10, cy: 10, raio: 8 },
      { tipo: 'mata', cx: 11, cy: 10, raio: 8 },
    ];
    ok(pesoEm(juntas, 10.5, 10) > PESO_MATA,
      'as duas matas sobrepostas deviam passar do teto — o caso não foi montado');

    /* ── A ACEITAÇÃO REAL É MEDIDA AQUI, E NÃO PERGUNTADA AO MÓDULO ────────
       A primeira versão deste teste fazia
           quantosCandidatos(1000, media) * media / PESO_MATA
       com a MESMA `media` dos dois lados — e isso dá 1000 para qualquer valor
       de `media`, certo ou errado. O defeito passou por baixo dele.

           Comparar um resultado com a constante que o produziu não prova nada.

       A régua honesta é reimplementar aqui o que `aceita` de fato faz — saturar
       em 1 — e conferir se `mediaDoPeso` bate com isso. Se as duas metades da
       conta discordarem, o total anda. */
    const COLS = 22, MARGEM = 20, PASSO = 2;
    let somaReal = 0, n = 0;
    for (let lx = 0; lx < COLS; lx += PASSO)
      for (let ly = 0; ly < MARGEM; ly += PASSO) {
        somaReal += Math.min(1, pesoEm(juntas, lx, ly) / PESO_MATA) * PESO_MATA;
        n++;
      }
    const aceitacaoReal = somaReal / n;
    const media = mediaDoPeso(juntas, { cols: COLS, margem: MARGEM });

    ok(Math.abs(media - aceitacaoReal) / PESO_MATA < 0.005,
      `\`mediaDoPeso\` devolveu ${media.toFixed(3)} e a recusa entrega ` +
      `${aceitacaoReal.toFixed(3)} — as duas metades da conta discordam, e o ` +
      'total do chão anda sem ninguém ver');

    const esperado = quantosCandidatos(1000, media) * aceitacaoReal / PESO_MATA;
    ok(Math.abs(esperado - 1000) / 1000 < 0.01,
      `com regiões sobrepostas a conta entrega ${esperado.toFixed(0)} para 1000 ` +
      'pedidos — a compensação não sobrevive à sobreposição');
  });

  s.teste('a estrada é desenhada como CURVA, e não como escada', () => {
    /* O defeito que o dono teria visto, e que passou por quinze testes verdes:
       a curva estava certa e o DESENHO usava o arredondamento dela. */
    const linhas = [10, 10, 11, 11, 12, 12];
    const a = alturaSuave(linhas, 2.5);   // centro da coluna 2 → exatamente 11
    igual(Math.round(a * 100) / 100, 11, 'o centro da coluna não devolve o valor dela');

    /* ENTRE dois tiles diferentes, a altura tem de ficar ESTRITAMENTE no meio —
       é o que separa uma rampa de um degrau. */
    const meio = alturaSuave(linhas, 2.0);
    ok(meio > 10 && meio < 11,
      `entre as colunas 1 (linha 10) e 2 (linha 11) a altura deu ${meio} — ` +
      'valor de tile no meio da transição é o degrau de volta');

    /* E a subida é MONÓTONA: uma interpolação que vai e volta desenha ondinha
       dentro do próprio degrau, que é pior que o degrau. */
    let ant = -Infinity, subiuSempre = true;
    for (let x = 1.5; x <= 4.5; x += 0.05) {
      const v = alturaSuave(linhas, x);
      if (v < ant - 1e-9) subiuSempre = false;
      ant = v;
    }
    ok(subiuSempre, 'a altura da trilha desce em algum ponto de uma subida');

    /* Fora do mapa não estoura, e lista vazia não explode a pintura. */
    igual(alturaSuave([], 3), 0, 'lista vazia devia devolver zero, e não NaN');
    igual(alturaSuave(linhas, -5), 10, 'antes do começo devia grudar na primeira');
    igual(alturaSuave(linhas, 999), 12, 'depois do fim devia grudar na última');
  });

  s.teste('a beira da estrada é esfarelada, e dentro do limite', () => {
    /* Traço perfeito num pixel art de 16 px lê como vetor, e o mundo é GBA. */
    for (const b of BIOMAS) {
      const vistos = new Set();
      for (let x = 0; x < 400; x++)
        for (const lado of [0, 1]) {
          const v = esfarelaEm(b, x, lado);
          ok(Number.isInteger(v), `${b}: o esfarelado deu ${v}, que não é pixel`);
          ok(Math.abs(v) <= ESFARELA,
            `${b}: o esfarelado deu ${v}, além do limite de ${ESFARELA} px`);
          vistos.add(v);
        }
      ok(vistos.size >= 3,
        `${b}: a beira só assume ${vistos.size} valor(es) — ela é uma linha reta`);
    }
    /* E é SEMEADO: a mesma coluna do mesmo bioma dá sempre a mesma beira, ou a
       estrada se remexe a cada redesenho. */
    igual(esfarelaEm(BIOMAS[0], 42, 0), esfarelaEm(BIOMAS[0], 42, 0),
      'a beira mudou entre duas leituras da mesma coluna');
    /* Os dois lados são independentes: a mesma mordida em cima e embaixo faria
       a estrada oscilar inteira, como uma fita, em vez de ter margens. */
    let diferem = 0;
    for (let x = 0; x < 200; x++)
      if (esfarelaEm(BIOMAS[0], x, 0) !== esfarelaEm(BIOMAS[0], x, 1)) diferem++;
    ok(diferem > 60,
      `as duas beiras coincidem em ${200 - diferem} de 200 colunas — ` +
      'a estrada está ondulando inteira em vez de ter margem própria');
  });

  return s;
}
