/* A FAUNA DE CENÁRIO, DESENHADA (camada 0).
 *
 * Este arquivo sabe COMO uma tira de quadros vira um habitante numa cena. Ele
 * não sabe QUEM habita o quê — isso é tema, mora no ContentPack (§0.3), e a
 * primeira versão deste módulo foi reprovada pelo portão `conteudo` justamente
 * por trazer a lista para cá.
 *
 * A fronteira que ficou vale registrar, porque ela vai se repetir:
 *
 *     o PACK diz    quem decora, onde pode aparecer, e o tamanho do quadro
 *     o APP diz     onde exatamente cai, quantos quadros a tira tem, e como
 *                   a animação avança
 *
 * ── AS POSIÇÕES SÃO SEMEADAS, E NÃO SORTEADAS ────────────────────────────
 *
 * Um Psyduck que muda de lugar a cada abertura da aba não é um morador, é um
 * fantasma — e o dono não conseguiria dizer "esse aqui sai" numa prévia que
 * muda sozinha. A semente sai do id do bioma, como o desenho do chão.
 */

/* Onde cada faixa começa e termina, em linhas de tile. É o que impede um Lapras
   na grama e um Machop boiando. */
import { assentar, naTrilha, trilhaEm } from './composicao.mjs';

export const FAIXAS = {
  /* A GRAMA EXCLUI A TRILHA. Sem isto os habitantes caiam em cima do caminho —
     tres dos quatro da floresta ficaram enfileirados na areia, e um bicho
     parado no meio da estrada le como obstaculo, nao como morador. A faixa vai
     do alto ate a linha ANTES do caminho. */
  grama:  pl => [Math.round(pl.rows * 0.18), Math.max(2, pl.caminho - 1)],
  trilha: pl => [pl.caminho, pl.caminho + 1],
  margem: pl => [pl.margem, pl.margem],
  agua:   pl => [pl.margem + 1, pl.rows - 1],
};

/* ── QUEM MORA DENTRO DO LAGO ──────────────────────────────────────────────
 *
 * `lago` NÃO é uma faixa, e por isso não está em `FAIXAS`. As quatro faixas são
 * linhas do mapa — valem em qualquer bioma, porque todo bioma tem grama, trilha,
 * margem e água. O lago não: ele é um ACIDENTE, sorteado pelo relevo, e num
 * bioma sem lago a "faixa lago" não existe em lugar nenhum.
 *
 * Essa diferença decide o comportamento quando falta água: quem é de faixa cai
 * na sua linha, quem é de lago SOME. Não desce para a grama, não vai para a
 * margem, não aparece meio dentro. É a regra do dono aplicada ao caso difícil —
 * *"nada de Staryu no meio da floresta"* — e o caso difícil é justamente o que
 * um `?? FAIXAS.grama` resolveria errado sem ninguém notar.
 *
 * O deslocamento a partir do centro é seco: 55% do raio, no máximo. No centro
 * exato o bicho lê como alfinete no mapa; perto da borda, como se estivesse
 * saindo. */
export const LAGO_FOLGA = 0.55;

/* Toda posição de morador que este módulo aceita — as quatro faixas mais o
   lago. Existe como lista, e não como `Object.keys(FAIXAS)`, exatamente porque
   o lago não é faixa: escrever a diferença é mais barato que explicá-la depois. */
export const ONDES = [...Object.keys(FAIXAS), 'lago'];

/* ── A BOIA ────────────────────────────────────────────────────────────────
 *
 * O dono não pediu "um Pokémon no lago". Ele pediu um *"se refrescando"* — e
 * refrescar-se é verbo. Sprite parado sobre água lê como sprite CAÍDO na água,
 * que foi a leitura que ele deu ao companheiro estático quatro vezes seguidas:
 * *"todo pokémon é um sapo?"*, *"o pokémon precisa se movimentar"*.
 *
 * Dois números saem daqui, e o segundo é o detalhe que não foi pedido:
 *
 *   dy     o corpo sobe e desce ~2 px em 2,4 s
 *   raio   o anel de água em volta, em CONTRAFASE — mais largo quando o corpo
 *          afunda, porque é o afundar que empurra a água para fora
 *
 * Em fase os dois viram um pulso só e a água some da leitura; o teste afirma a
 * contrafase de propósito. Sem o anel, o bicho parece pousado sobre a água; com
 * ele, dentro dela — que é a mesma diferença que o dono cobrou do cenário
 * inteiro: *"parecem estar sobre o cenário, não dentro"*.
 *
 * A fase vem do RELÓGIO e não da distância, como a de todo habitante: quem boia
 * não anda. */
export const BOIA_AMPLITUDE = 2.1;   // px de mundo, para cima e para baixo
export const BOIA_PERIODO = 2400;    // ms de um ciclo inteiro
export const ONDA_RAIO = 7.5;        // px de mundo, no repouso
export const ONDA_VARIA = 0.26;      // quanto o anel abre e fecha

export function boiar(h, t) {
  if (!h?.boia) return { dy: 0, raio: 0 };
  const ang = 2 * Math.PI * ((t / BOIA_PERIODO) + (h.fase ?? 0));
  const s = Math.sin(ang);
  return {
    dy: -BOIA_AMPLITUDE * s,                  // s = +1 -> corpo no alto
    raio: ONDA_RAIO * (1 - ONDA_VARIA * s),   // e o anel no mais estreito
  };
}

export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 131, 7) >>> 0;

/* ONDE CADA UM FICA, resolvido uma vez por bioma.
 *
 * Devolve coordenadas de MUNDO em pixels, já com os pés na linha de baixo do
 * tile — que é como todo o resto desta cena se posiciona. */
export function povoar(planta, pack, T = 16) {
  const semente = sementeDe(planta.bioma);
  const lista = (pack?.fauna?.[planta.bioma]) ?? [];
  const out = [];
  let lagos = (planta.relevo ?? []).filter(a => a.forma === 'lago');
  lista.forEach((f, i) => {
    const [qw, qh] = f.quadro ?? [16, 16];
    /* A FASE É ESPALHADA PELO ÍNDICE, e não sorteada.
       Sorteada, ela colide: com três habitantes e três quadros, o acaso põe
       dois no mesmo lugar do ciclo com frequência — e foi o que o teste
       flagrou no vulcão. Dividindo o ciclo pelo número de moradores, a
       separação é garantida, e a mistura entra só como um empurrão para os
       biomas não ficarem todos com o mesmo desenho de fases.
       Vale para os dois ramos: quem pisca no lugar e quem boia no lago. */
    const fase = (i + mistura(semente + i * 41, 19) * 0.6) / Math.max(1, lista.length);

    /* O MORADOR DE LAGO SOME QUANDO NAO HA LAGO. Ver o bloco QUEM MORA DENTRO
       DO LAGO, acima: cair na grama seria pior do que nao existir. */
    if (f.onde === 'lago') {
      if (!lagos.length) return;
      const l = lagos[i % lagos.length];
      const ang = mistura(semente + i * 53, 23) * 2 * Math.PI;
      const r = Math.sqrt(mistura(semente + i * 71, 29)) * LAGO_FOLGA;
      out.push({
        arq: f.arq, onde: f.onde, qw, qh, boia: true,
        x: l.x + Math.cos(ang) * l.rx * r,
        y: l.y + Math.sin(ang) * l.ry * r,
        fase,
      });
      return;
    }

    const faixa = FAIXAS[f.onde] ?? FAIXAS.grama;
    const [y0, y1] = faixa(planta);
    const lx = 2 + Math.floor(mistura(semente + i * 17, 11) * Math.max(1, planta.cols - 5));
    const cru = Math.round(y0 + mistura(semente + i * 29, 13) * Math.max(0, y1 - y0));
    /* A trilha curva (1.15) — o habitante assenta na beira REAL da estrada
       daquela coluna, e não na linha reta que a faixa supôs. */
    const ly = assentar(planta, f.onde, lx, cru);
    out.push({
      arq: f.arq, onde: f.onde, qw, qh,
      x: lx * T + qw / 2,          // centro
      y: (ly + 1) * T,             // os PÉS
      fase,
    });
  });
  return out;
}

/* Os props do bioma, no chão, atrás de todo mundo — e alguns na FRENTE, que é o
   que faz o personagem estar dentro da cena. */
export function adornar(planta, pack, T = 16) {
  const semente = sementeDe(planta.bioma) ^ 0x51ed;
  const out = [];
  let n = 0;
  for (const p of (pack?.props?.[planta.bioma]) ?? []) {
    for (let i = 0; i < p.n; i++, n++) {
      const lx = 1 + Math.floor(mistura(semente + n * 23, 7) * Math.max(1, planta.cols - 3));
      const ly = 2 + Math.floor(mistura(semente + n * 37, 9) * Math.max(1, planta.margem - 4));
      /* A TRILHA CURVA (1.15): o prop olha a linha DAQUELA coluna. Contra o
         eixo, props nasciam sobre a estrada onde ela sobe — e, pior, a decisão
         de profundidade abaixo ficava errada exatamente na curva, que é onde o
         olho está. */
      const linhaAqui = trilhaEm(planta.trilha, lx, planta.caminho);
      if (naTrilha(planta.trilha, lx, ly, planta.caminho)) continue;
      out.push({ arq: p.arq, x: lx * T, y: (ly + 1) * T, qw: 16, qh: 16,
                 /* NA FRENTE quando está abaixo da trilha: assim alguma coisa
                    sempre passa na frente dos pés, e a cena ganha profundidade */
                 frente: ly > linhaAqui + 1 });
    }
  }
  return out;
}

/* O quadro atual de um habitante. Sai do RELÓGIO e não da distância — porque
   estes não andam: eles piscam, batem asa, respiram no lugar. A distância é o
   critério de quem se desloca, e nenhum deles se desloca. */
export const MS_POR_QUADRO = 300;

export function quadroDoHabitante(h, t, quadros) {
  if (quadros <= 1) return 0;
  return Math.floor(t / MS_POR_QUADRO + h.fase * quadros) % quadros;
}
