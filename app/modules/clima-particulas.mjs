/* AS PARTÍCULAS DO CLIMA — camada 0, sem DOM e sem estado.
 *
 * ── POR QUE ISTO É UM ARQUIVO SEPARADO ───────────────────────────────────
 *
 * Porque é a única forma de a conta ser conferida. O bloco 1.27 reprovou SEIS
 * defeitos plantados meus pela mesma causa — a lógica morava dentro de uma
 * `innerHTML` ou colada num `style.transform`:
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * E o 1.27e mostrou a versão pior disso: o estouro do golpe era desenhado em
 * coordenada de TELA sobre um canvas de MUNDO, e o contador dizia "413
 * desenhos" enquanto todos caíam fora da janela. **Contador conta chamada.**
 *
 * Aqui a posição de cada partícula é uma função pura de `(t, i, W, H)`. Um
 * teste sem navegador afirma que ela está DENTRO da janela, que ela ANDA, e que
 * ela volta ao topo em vez de sumir — as três coisas que só se veriam com olho.
 *
 * ── SEM ESTADO, E ISSO É DESENHO E NÃO PREGUIÇA ──────────────────────────
 *
 * A versão da Arena guarda um pool de partículas e recicla cada uma quando ela
 * sai da tela (`clima.mjs`). Funciona, e custa um `let` de módulo — que é
 * exatamente o que matou a cena inteira no D-089, quando o arquivo se dividiu e
 * a variável ficou para trás.
 *
 * Aqui a partícula `i` no instante `t` é sempre a mesma conta. Não há o que
 * ficar para trás numa divisão, não há o que reiniciar ao trocar de bioma, e a
 * mesma foto tirada duas vezes no mesmo `t` sai idêntica — que é o que o portão
 * visual precisa.
 *
 * ── O VOCABULÁRIO É DO APP; QUEM ESCOLHE É O PACK ────────────────────────
 *
 * `chuva`, `neve`, `vento`, `sol`, `polen`, `nevoa`. Seis jeitos de encher uma
 * tela, e nenhum deles é tema — é a mesma fronteira que a fauna do cenário já
 * usa com `grama|trilha|margem|agua`: o pack diz QUAL, o app sabe COMO.
 *
 * Assim um pack de outro tema pede `neve` para o clima que ele quiser chamar do
 * que quiser, e esta tela serve os dois sem uma linha de diferença.
 */

export const TIPOS = ['chuva', 'neve', 'vento', 'sol', 'polen', 'nevoa'];
export const ehTipo = k => TIPOS.includes(k);

/* ── QUANTAS, E POR QUE NÃO SÃO TODAS IGUAIS ──────────────────────────────
 *
 * A janela do mundo é pequena — medida em 403x207 px no panorâmico e 130x207 no
 * estreito (a L-175). Noventa gotas ali dentro é uma cortina, e não chuva.
 *
 * O número é POR DEZ MIL PIXELS de janela, e não absoluto: com absoluto, a
 * mesma chuva vira garoa no panorâmico e temporal no estreito.
 *
 * ── E O PRIMEIRO NÚMERO QUE ESCREVI ESTAVA OITO VEZES ERRADO ─────────────
 *
 * `chuva: 46` — eu tinha na cabeça "quarenta e seis gotas na tela", que é o
 * número da Arena, e escrevi isso num campo que é POR DEZ MIL PIXELS. Em
 * 403x207 daria 384 gotas, e o teto de 90 escondia o erro atrás de uma parede
 * de água.
 *
 *   > Constante com unidade errada não erra por pouco: ela erra por uma ordem
 *   > de grandeza, e o grampo que existe para o caso extremo passa a ser o
 *   > caso normal.
 *
 * Quem pegou foi a asserção de que a janela larga tem MAIS gotas que a
 * estreita — as duas estavam grampeadas em 90, e o teste disse isso em voz
 * alta. Medido depois: 46 no panorâmico, 15 no estreito, 90 só a partir de uma
 * janela de 900x520. */
export const DENSIDADE = {
  chuva: 5.5, neve: 3.5, vento: 1.6, sol: 0.6, polen: 1.9, nevoa: 0.8,
};
export const AREA_REF = 10_000;
export const MAX_POR_TIPO = 90;      /* teto duro: janela grande não vira sopa */

export function quantasDe(tipo, largura, altura) {
  const d = DENSIDADE[tipo];
  if (!d) return 0;
  const area = Math.max(0, Number(largura) || 0) * Math.max(0, Number(altura) || 0);
  return Math.min(MAX_POR_TIPO, Math.max(1, Math.round(d * area / AREA_REF)));
}

/* ── O SORTEIO SEM SORTE ──────────────────────────────────────────────────
 *
 * Um embaralhador barato sobre o índice. Não é `Math.random` de propósito: o
 * portão visual fotografa a tela e compara com a linha de base, e uma cena com
 * partículas aleatórias reprovaria a si mesma a cada execução. Foi o que já
 * aconteceu com o pulso do letrado, e está escrito no `test/visual.mjs`:
 *
 *   > Linha de base que depende do relógio não é linha de base; é sorte. */
const espalhar = (i, sal) => {
  let x = (i + 1) * 2654435761 ^ (sal * 40503);
  x = (x ^ (x >>> 15)) * 2246822507;
  x = (x ^ (x >>> 13)) * 3266489909;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/* ── ONDE CADA UMA ESTÁ AGORA ─────────────────────────────────────────────
 *
 * `t` em milissegundos. Cada partícula percorre a janela de cima a baixo (ou da
 * esquerda para a direita, no vento) e RECOMEÇA — o resto da divisão faz o laço
 * sem guardar nada.
 *
 * Devolve `{ x, y, r, a, v }`: posição, raio/comprimento, opacidade e a fase,
 * que o desenhista usa para inclinar o traço. */
const CAI = {
  /* [velocidade px/s mín, máx, tamanho mín, máx, deriva horizontal px/s] */
  chuva: [420, 700, 6, 13, 60],
  neve:  [26, 62, 1.1, 2.6, 22],
  polen: [14, 34, 1.4, 3.0, 34],
  nevoa: [6, 16, 26, 60, 10],
};

export function particulasDe(tipo, t, largura, altura, quantas = null) {
  const W = Math.max(1, Number(largura) || 1);
  const H = Math.max(1, Number(altura) || 1);
  const ms = Number(t) || 0;
  const n = quantas ?? quantasDe(tipo, W, H);
  const fora = [];
  if (!n || !ehTipo(tipo)) return fora;

  /* O SOL NÃO CAI: são raios parados que só respiram. Ele fica fora do laço de
     queda porque forçá-lo ali daria um sol chovendo, e é o tipo de coisa que
     ninguém revisa e todo mundo vê. */
  if (tipo === 'sol') {
    for (let i = 0; i < n; i++) {
      const a = espalhar(i, 3) * Math.PI * 2;
      const pulso = 0.5 + 0.5 * Math.sin(ms / 1400 + i);
      fora.push({
        x: W * (0.12 + 0.76 * espalhar(i, 1)),
        y: H * (0.05 + 0.35 * espalhar(i, 2)),
        r: H * (0.16 + 0.22 * espalhar(i, 4)),
        a: 0.10 + 0.14 * pulso, v: a,
      });
    }
    return fora;
  }

  /* O VENTO ATRAVESSA na horizontal, e por isso tem laço próprio. */
  if (tipo === 'vento') {
    for (let i = 0; i < n; i++) {
      const vel = 190 + espalhar(i, 5) * 150;
      const comp = 20 + espalhar(i, 6) * 34;
      /* O `+ comp` no ciclo garante que o traço nasça INTEIRO fora da borda:
         sem ele, metade das rajadas aparece cortada no canto esquerdo. */
      const ciclo = W + comp * 2;
      const x = ((ms / 1000 * vel + espalhar(i, 7) * ciclo) % ciclo) - comp;
      fora.push({
        x, y: H * espalhar(i, 8),
        r: comp, a: 0.18 + 0.22 * espalhar(i, 9),
        v: Math.sin(ms / 700 + i) * 0.25,
      });
    }
    return fora;
  }

  const [vMin, vMax, tMin, tMax, deriva] = CAI[tipo];
  for (let i = 0; i < n; i++) {
    const vel = vMin + espalhar(i, 11) * (vMax - vMin);
    const tam = tMin + espalhar(i, 12) * (tMax - tMin);
    const ciclo = H + tam * 2;
    const y = ((ms / 1000 * vel + espalhar(i, 13) * ciclo) % ciclo) - tam;
    /* A DERIVA é um seno, e não um passo constante: passo constante faz a neve
       andar de lado em linha reta, que lê como erro de física e não como vento. */
    const x = (W * espalhar(i, 14)
              + Math.sin(ms / 1000 * 0.7 + i * 1.7) * deriva + W) % W;
    fora.push({ x, y, r: tam, a: 0.30 + 0.45 * espalhar(i, 15), v: i });
  }
  return fora;
}

/* ── O VÉU DE COR SOBRE O CHÃO ────────────────────────────────────────────
 *
 * A Arena já faz isso e a razão vale igual aqui: as partículas sozinhas são
 * fáceis de não notar, e o véu é o que faz o jogador saber o clima com o olho
 * de lado. Sai daqui em vez de uma tabela na tela para que os dois modos
 * possam usar a mesma. */
export const VEU = {
  chuva: 'rgba(40,80,150,0.16)',
  neve:  'rgba(180,215,255,0.15)',
  vento: 'rgba(150,190,170,0.09)',
  sol:   'rgba(255,190,70,0.13)',
  polen: 'rgba(210,190,80,0.12)',
  nevoa: 'rgba(120,60,150,0.17)',
};
export const veuDe = tipo => VEU[tipo] ?? null;
