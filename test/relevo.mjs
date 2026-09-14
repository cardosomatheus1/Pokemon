/* Q1/Q3 · O RELEVO DE CADA BIOMA (bloco 1.5j).
 *
 * ── O QUE ESTE MÓDULO PODE ESTRAGAR ───────────────────────────────────────
 *
 * De novo, nada trava. O que ele estraga é a LEITURA do lugar:
 *
 *   um lago em cima da trilha       o caminho deixa de ser caminho
 *   uma cachoeira no meio do mapa   uma coluna azul sem explicação
 *   um lago que engole o mapa       não é um lago, é um mar com grama em volta
 *   relevo diferente a cada visita  o lugar deixa de ser um lugar
 *   dois biomas com o mesmo relevo  volta a ser tudo igual, que era a queixa
 *
 * A última é a razão de o módulo existir: *"atualmente todos cenários são
 * basicamente iguais"*. Se dois biomas saírem com o mesmo chão, ele não
 * resolveu nada — e é isso que o teste mede.
 */
import { naTrilha } from '../app/modules/composicao.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import {
  FORMAS, RELEVO_POR_BIOMA, relevoDe, acidentes, bloqueios, dentroDe, FOLGA_LAGO,
  trinca, TRINCA_PASSOS, veio, ambienteDe, temParede, AMBIENTE_POR_BIOMA,
  veiaEm, faseVeia, VEIA_MS,
} from '../app/modules/relevo.mjs';
import { plantaDo } from '../app/modules/mundo.mjs';
import { areaAndavel, passeio } from '../app/modules/vida.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const T = 16;
const plantas = () => (kanto.biomas ?? []).map(b => plantaDo(kanto, b.id, {}));

export function suite() {
  const s = criarSuite('relevo');

  /* ── 1 · TODO BIOMA TEM CHÃO PRÓPRIO ────────────────────────────────── */

  s.teste('todo bioma do pack tem relevo declarado', () => {
    for (const b of (kanto.biomas ?? []))
      ok(relevoDe(b.id).length > 0,
        `"${b.id}" não tem relevo. Sem ele o bioma volta a ser cor e partícula ` +
        'sobre o mesmo chão de todos — que foi exatamente a queixa do dono.');
  });

  s.teste('dois biomas não têm o mesmo chão', () => {
    const assinaturas = (kanto.biomas ?? []).map(b =>
      relevoDe(b.id).map(r => `${r.forma}:${r.n}`).sort().join('+'));
    const repetidas = assinaturas.length - new Set(assinaturas).size;
    ok(repetidas === 0,
      `${repetidas} bioma(s) repetem a receita de relevo de outro. "Todos os ` +
      'cenários são basicamente iguais" é o defeito que este módulo existe para ' +
      'corrigir; repetir a receita o traz de volta com passos a mais.');
  });

  s.teste('toda forma citada existe', () => {
    for (const [bioma, lista] of Object.entries(RELEVO_POR_BIOMA))
      for (const r of lista)
        ok(FORMAS.includes(r.forma),
          `"${bioma}" pede a forma "${r.forma}", que o pincel não sabe desenhar — ` +
          'ela sairia como nada, em silêncio.');
  });

  /* ── 2 · ONDE OS ACIDENTES CAEM ─────────────────────────────────────── */

  s.teste('nada de relevo cai na TRILHA', () => {
    for (const pl of plantas())
      for (const a of acidentes(pl, T)) {
        if (a.forma === 'lago' || a.forma === 'cachoeira') continue;
        /* A TRILHA CURVA (1.15): a comparação é com a linha DAQUELA coluna.
           Contra o eixo, este teste ficaria verde com moitas em cima da
           estrada em todo lugar onde ela sobe ou desce — e verde num lugar
           onde o defeito não pode aparecer não é verde, é cego. */
        const linha = Math.floor(a.y / T), col = Math.floor(a.x / T);
        ok(!naTrilha(pl.trilha, col, linha, pl.caminho),
          `em "${pl.bioma}" um "${a.forma}" caiu na trilha (${col},${linha}). ` +
          'Chão pisado é chão limpo — e é por ali que o jogador anda.');
      }
  });

  s.teste('o lago fica fora da trilha e fora da água de baixo', () => {
    for (const pl of plantas())
      for (const a of acidentes(pl, T).filter(x => x.forma === 'lago')) {
        const topo = (a.y - a.ry) / T, base = (a.y + a.ry) / T;
        ok(base < pl.margem,
          `em "${pl.bioma}" um lago encosta na água da margem (base ${base.toFixed(1)}, ` +
          `margem ${pl.margem}). Dois corpos de água grudados lêem como um erro de ` +
          'desenho, não como dois lugares.');
        ok(topo > 0,
          `em "${pl.bioma}" um lago sai pelo topo do mapa — vira uma mancha cortada`);
      }
  });

  s.teste('o lago não engole o mapa', () => {
    for (const pl of plantas())
      for (const a of acidentes(pl, T).filter(x => x.forma === 'lago')) {
        const fracao = (a.rx * 2) / (pl.cols * T);
        ok(fracao < 0.30,
          `em "${pl.bioma}" o lago ocupa ${(fracao * 100).toFixed(0)}% da largura. ` +
          'Acima de um terço não é um lago: é um mar com grama em volta, e o ' +
          'boneco fica sem para onde ir.');
        ok(fracao > 0.05,
          `em "${pl.bioma}" o lago tem ${(fracao * 100).toFixed(0)}% da largura — ` +
          'pequeno demais para ser lido como água, e vira uma mancha');
      }
  });

  /* ── A CACHOEIRA É UM MARCO, E NÃO UMA PAREDE ───────────────────────────
   *
   * Esta afirmação MUDOU no 1.5q, e a versão antiga não estava errada por
   * descuido — estava certa para um desenho que se provou ruim.
   *
   * Ela exigia que a queda terminasse NA água da borda: *"água que cai e some no
   * meio da grama é uma coluna azul sem explicação"*. O argumento é bom, mas a
   * consequência geométrica não foi vista: a única água do mapa é a última
   * faixa, então qualquer queda que a alcance atravessa a altura inteira.
   * Medido na montanha: **352 px de 448, 78% da cena**. A cachoeira deixava de
   * ser um marco e virava uma parede, cortando o caminho do treinador ao meio.
   *
   * A saída não é encurtar e aceitar a coluna sem explicação: é a queda ter o
   * PRÓPRIO corpo de água. A poça de espuma da base já é isso — e uma queda que
   * termina na própria poça explica-se sozinha, sem viajar o mapa até o mar.
   *
   * Então a regra velha vira DUAS: a poça fica em terra (não no mar), e a queda
   * cabe numa fração da cena. A segunda é a guarda que faltava, e é a que teria
   * pego o defeito antes de o dono ver.
   */
  s.teste('a cachoeira nasce em cima e termina na PRÓPRIA poça, em terra', () => {
    for (const pl of plantas())
      for (const a of acidentes(pl, T).filter(x => x.forma === 'cachoeira')) {
        ok(a.y > 0, `em "${pl.bioma}" a cachoeira começa fora do mapa`);
        const fim = (a.y + a.h) / T;
        ok(fim < pl.margem,
          `em "${pl.bioma}" a cachoeira desce até ${fim.toFixed(1)} e a água da ` +
          `borda começa em ${pl.margem}. Alcançar o mar obriga a queda a ` +
          'atravessar a cena inteira — foi assim que ela virou parede.');
        ok(fim > a.y / T + 2,
          `em "${pl.bioma}" a queda tem ${(a.h / T).toFixed(1)} tiles. Queda curta ` +
          'lê como cano: é a altura que faz a água parecer cair em vez de escorrer.');
        ok(a.x >= 0 && a.x + a.w <= pl.cols * T,
          `em "${pl.bioma}" a cachoeira sai pela lateral`);
      }
  });

  s.teste('a cachoeira não come mais que 45% da altura da cena', () => {
    for (const pl of plantas())
      for (const a of acidentes(pl, T).filter(x => x.forma === 'cachoeira')) {
        const frac = a.h / (pl.rows * T);
        ok(frac <= 0.45,
          `em "${pl.bioma}" a cachoeira ocupa ${(frac * 100).toFixed(0)}% da altura ` +
          `(${a.h} px de ${pl.rows * T}). Acima disso ela deixa de ser um marco do ` +
          'lugar e vira o assunto da cena inteira — e ainda corta o caminho do ' +
          'treinador ao meio. Medido em 78% antes desta guarda existir.');
        ok(frac >= 0.10,
          `em "${pl.bioma}" a cachoeira tem ${(frac * 100).toFixed(0)}% da altura — ` +
          'pequena demais para ser lida como queda.');
      }
  });

  /* ── 3 · O LUGAR É SEMPRE O MESMO LUGAR ─────────────────────────────── */

  s.teste('o mesmo bioma abre com o mesmo relevo', () => {
    for (const pl of plantas()) {
      const a = acidentes(pl, T), b = acidentes(pl, T);
      igual(a.map(x => `${x.forma}@${x.x},${x.y}`).join(';'),
            b.map(x => `${x.forma}@${x.x},${x.y}`).join(';'),
        `"${pl.bioma}" gerou relevo diferente em duas chamadas. Um lugar que se ` +
        'redesenha a cada visita não é um lugar.');
    }
  });

  s.teste('biomas diferentes não caem nas mesmas posições', () => {
    const posicoes = plantas().map(pl =>
      acidentes(pl, T).map(a => `${a.x},${a.y}`).join(';'));
    igual(new Set(posicoes).size, posicoes.length,
      'dois biomas geraram o relevo nas MESMAS posições — repetido, vira molde.');
  });

  /* ── 4 · O LAGO BLOQUEIA DE VERDADE ─────────────────────────────────── */

  s.teste('o lago é o único que bloqueia', () => {
    for (const pl of plantas()) {
      const b = bloqueios(pl, T);
      const lagos = acidentes(pl, T).filter(a => a.forma === 'lago').length;
      igual(b.length, lagos,
        `"${pl.bioma}" tem ${b.length} bloqueios para ${lagos} lagos. Desviar de ` +
        'tudo faria o passeio parecer um labirinto: a fenda é rasa, a duna é uma ' +
        'onda de areia, a moita se atravessa e a sucata é baixa.');
      for (const x of b)
        ok(x.rx > 0 && x.ry > 0, 'um bloqueio saiu sem raio — não bloqueia nada');
    }
  });

  s.teste('a folga do bloqueio existe, e o pé não fica na água', () => {
    for (const pl of plantas()) {
      const lagos = acidentes(pl, T).filter(a => a.forma === 'lago');
      const b = bloqueios(pl, T);
      lagos.forEach((l, i) => {
        ok(b[i].rx > l.rx && b[i].ry > l.ry,
          'o bloqueio não é maior que o lago. Parar exatamente na borda deixa o ' +
          'pé na água, e o olho lê isso como afundando.');
        ok(Math.abs((b[i].rx - l.rx) - FOLGA_LAGO) < 0.001,
          `a folga saiu ${(b[i].rx - l.rx).toFixed(3)} e devia ser ${FOLGA_LAGO}`);
      });
    }
  });

  s.teste('o passeio NUNCA entra no lago', () => {
    for (const pl of plantas()) {
      const bl = bloqueios(pl, T);
      if (!bl.length) continue;
      const area = areaAndavel(pl, { qw: 24, qh: 52, T });
      for (let t = 0; t < 20 * 60 * 1000; t += 313) {
        const p = passeio(7, area, t, { bloqueios: bl });
        for (const b of bl)
          ok(!dentroDe(b, p.x, p.y),
            `em "${pl.bioma}", aos ${Math.round(t / 1000)}s o treinador estava DENTRO ` +
            'do lago. Um lago que não bloqueia deixa de ser relevo e vira textura — ' +
            'e um boneco andando sobre água parada é a coisa mais visível que esta ' +
            'cena pode fazer de errado.');
      }
    }
  });

  s.teste('sem bloqueio nenhum, o passeio continua funcionando', () => {
    /* A regressão óbvia: empurrar para fora com a lista vazia não pode mudar
       nada, e não pode travar. */
    const pl = plantas()[0];
    const area = areaAndavel(pl, { qw: 24, qh: 52, T });
    const a = passeio(3, area, 60000);
    const b = passeio(3, area, 60000, { bloqueios: [] });
    igual(`${a.x},${a.y}`, `${b.x},${b.y}`,
      'a lista vazia de bloqueios mudou o passeio — ela tem de ser inerte');
  });


  /* ── 4 · A TRINCA SE LIGA, E É POR ISSO QUE ELA LÊ ──────────────────────
   *
   * A versão anterior desenhava cinco retângulos de 2 px separados por 5 a 7 px
   * de nada. No código pareciam degraus; na tela eram pontos costurados. A
   * suíte estava verde — o que faltava não era teste, era ESTE teste: nenhuma
   * afirmação dizia que os pedaços se tocam.
   */

  s.teste('os pontos da trinca se ligam — nenhum buraco no meio dela', () => {
    for (const pl of plantas()) {
      for (const a of (pl.relevo ?? []).filter(x => x.forma === 'fenda')) {
        const pts = trinca(a);
        igual(pts.length, TRINCA_PASSOS, 'a trinca mudou de número de pontos');
        for (let i = 1; i < pts.length; i++) {
          const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          ok(d <= 6,
            `em "${pl.bioma}", dois pontos da trinca ficaram a ${d.toFixed(1)} px ` +
            'um do outro. Acima de ~6 px o traço entre eles deixa de fechar e a ' +
            'rachadura vira tracejado — que foi exatamente o defeito que o olho ' +
            'pegou na caverna de gelo e no vulcão, com a suíte verde.');
        }
      }
    }
  });

  s.teste('a trinca é grossa no meio e fina nas pontas', () => {
    const a = { x: 40, y: 40, w: 22, h: 12, giro: 0.2 };
    const pts = trinca(a);
    const meio = pts[Math.floor(pts.length / 2)];
    ok(meio.w > pts[0].w + 0.8 && meio.w > pts[pts.length - 1].w + 0.8,
      `a trinca saiu com ${pts[0].w.toFixed(2)} na ponta e ${meio.w.toFixed(2)} ` +
      'no meio. Espessura constante lê como risco de caneta; a rachadura de ' +
      'verdade abre onde a tensão foi maior e fecha nas pontas.');
    ok(pts[0].w >= 1 && meio.w <= 3.2, 'a espessura saiu da faixa desenhável');
  });

  s.teste('a trinca não é uma reta', () => {
    const a = { x: 0, y: 0, w: 24, h: 10, giro: 0 };
    const pts = trinca(a);
    /* desvio máximo em relação à reta que liga as duas pontas */
    const [p0, p1] = [pts[0], pts[pts.length - 1]];
    const L = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    let maior = 0;
    for (const p of pts) {
      const d = Math.abs((p1.y - p0.y) * p.x - (p1.x - p0.x) * p.y + p1.x * p0.y - p1.y * p0.x) / L;
      if (d > maior) maior = d;
    }
    ok(maior > 0.8,
      `a trinca desviou no máximo ${maior.toFixed(2)} px da reta. Rachadura reta ` +
      'é CORTE, e corte não é rachadura — a diferença entre as duas leituras é ' +
      'o que faz o chão parecer rachado em vez de riscado.');
  });

  /* ── 5 · A CACHOEIRA CAI, ABRE E BATE EM ALGUMA COISA ───────────────────
   *
   * Na prévia da ruína ela saiu como uma coluna teal de canto vivo, sem vir de
   * lugar nenhum e sem cair em lugar nenhum. Era o item mais "protótipo" do
   * acervo, e a barra do dono para isto está escrita: *"veja uma maneira que
   * fique bonita e harmônica, não com cara de amadora"*.
   */

  s.teste('o veio ABRE ao cair — a base é mais larga que o topo', () => {
    const a = { x: 100, y: 0, w: 48, h: 160 };
    const f = veio(a);
    ok(f.length >= 2, 'o veio precisa de faixas para abrir');
    const topo = f[0], base = f[f.length - 1];
    ok(base.w > topo.w * 1.15,
      `o topo saiu com ${topo.w.toFixed(1)} e a base com ${base.w.toFixed(1)}. ` +
      'Coluna de largura fixa é cano, não queda — a água se espalha enquanto cai, ' +
      'e é essa abertura que faz a coluna parecer líquida.');
  });

  s.teste('o veio fica centrado enquanto abre', () => {
    const a = { x: 100, y: 0, w: 48, h: 160 };
    for (const f of veio(a)) {
      const centro = f.x + f.w / 2;
      ok(Math.abs(centro - (a.x + a.w / 2)) < 0.5,
        `uma faixa ficou centrada em ${centro.toFixed(1)} e o veio em ` +
        `${(a.x + a.w / 2).toFixed(1)}. Abrindo só para um lado, a queda entorta ` +
        'e lê como escorrendo na parede, não como caindo no ar.');
    }
  });

  s.teste('as faixas do veio cobrem a altura toda, sem falha', () => {
    const a = { x: 10, y: 20, w: 30, h: 120 };
    const f = veio(a);
    igual(Math.round(f[0].y), a.y, 'o veio não começa onde o acidente começa');
    const fim = f[f.length - 1].y + f[f.length - 1].alt;
    ok(Math.abs(fim - (a.y + a.h)) < 1.5,
      `as faixas terminam em ${fim.toFixed(1)} e o acidente em ${a.y + a.h}. ` +
      'Uma falha aí é uma listra do fundo aparecendo no meio da água.');
  });

  /* ── 6 · O AMBIENTE ─────────────────────────────────────────────────────
   *
   * O que ainda fazia os onze cenários parecerem um só era todos serem um campo
   * plano iluminado por igual. Um lugar não se distingue pelos enfeites — se
   * distingue pela LUZ.
   */

  s.teste('os quatro lugares fechados têm ambiente próprio', () => {
    /* Estes quatro o dono nomeou ou descreveu como fechados. Um deles sem
       ambiente é o cenário voltando a ser um campo aberto pintado de outra cor. */
    for (const b of ['gelo', 'vulcao', 'ruina', 'ferrovelho'])
      ok(ambienteDe(b),
        `"${b}" é um lugar fechado e não tem ambiente. Sem teto e sem parede ele ` +
        'volta a ser um campo aberto com outra paleta, que é exatamente a queixa ' +
        'do dono: "atualmente todos cenários são basicamente iguais".');
  });

  s.teste('quem tem teto tem parede — caverna sem parede é campo escuro', () => {
    for (const [b, amb] of Object.entries(AMBIENTE_POR_BIOMA))
      igual(temParede(b), amb.onde === 'teto',
        `"${b}" tem ambiente "${amb.onde}" e parede ${temParede(b)}. Escurecer só ` +
        'o alto de um campo aberto lê como nuvem, não como caverna.');
  });

  s.teste('o céu aberto continua aberto', () => {
    for (const b of ['floresta', 'praia', 'campo'])
      igual(ambienteDe(b), null,
        `"${b}" ganhou ambiente. Escurecer um lugar de céu aberto para "ficar ` +
        'diferente" é enfeite pelo enfeite — a diferença tem de vir do que o ' +
        'lugar É, e não da vontade de que ele pareça outro.');
  });

  s.teste('a força do ambiente nunca apaga a cena', () => {
    for (const [b, a] of Object.entries(AMBIENTE_POR_BIOMA)) {
      ok(a.forca > 0.05 && a.forca <= 0.5,
        `"${b}" tem força ${a.forca}. Abaixo de 0,05 ninguém vê; acima de 0,5 a ` +
        'arte do bioma some debaixo do véu, e um cenário escuro demais não é ' +
        'atmosférico, é ilegível.');
      ok(a.de >= 0 && a.de <= 1 && a.para >= 0 && a.para <= 1,
        `"${b}" tem bordas fora de [0,1] — elas são fração da altura da cena.`);
    }
  });

  s.teste('a água da cachoeira contrasta com o chão em que ela cai', () => {
    /* ── DE ONDE VEIO ESTE TESTE ─────────────────────────────────────────
     *
     * A cachoeira da montanha saiu MARROM na prévia — um pilar de pedra no meio
     * da cena. A causa: ela usava `massa`, e `massa` é a massa de água DO FUNDO
     * do bioma. Nem todo bioma tem uma; na montanha aquela cor serve de sombra
     * e de poço, e é irmã do chão.
     *
     * Água da cor do chão não é água. E o defeito não tem sintoma nenhum além
     * de olhar: nada quebra, a suíte fica verde, a coluna aparece.
     *
     * A regra que fica: quem tem cachoeira precisa de uma cor de água que se
     * distinga do próprio chão — venha ela de `cascata` (declarada) ou de
     * `massa` (herdada). */
    const lum = hex => {
      const h = String(hex).replace('#', '');
      const n = parseInt(h, 16);
      return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    };
    const mat = hex => {
      const h = String(hex).replace('#', ''); const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    /* "azulado" = o azul manda mais que o vermelho. É o mínimo que separa água
       de pedra molhada, e é exatamente o que faltava na montanha. */
    const azulado = hex => { const [r, , b] = mat(hex); return b > r + 12; };

    for (const b of (kanto.biomas ?? [])) {
      if (!relevoDe(b.id).some(x => x.forma === 'cachoeira')) continue;
      const P = b.paleta;
      const agua = P.cascata ?? P.massa;
      ok(azulado(agua),
        `"${b.id}" tem cachoeira e a água dela é ${agua}, que não puxa para o azul. ` +
        'Foi assim que a montanha ganhou um pilar de pedra no lugar da queda: ela ' +
        'usava a `massa` do bioma, e ali a massa é sombra, não água. Declare ' +
        '`cascata` na paleta.');
      ok(Math.abs(lum(agua) - lum(P.base)) > 0.06,
        `"${b.id}": a água (${agua}, lum ${lum(agua).toFixed(2)}) tem quase a mesma ` +
        `luminância do chão (${P.base}, ${lum(P.base).toFixed(2)}). Mesmo com o ` +
        'matiz certo, sem diferença de luz a queda some no fundo.');
    }
  });

  s.teste('quem declara cascata declara as quatro cores dela', () => {
    for (const b of (kanto.biomas ?? [])) {
      if (!b.paleta?.cascata) continue;
      for (const k of ['cascataEsc', 'cascataClaro', 'cascataEspuma'])
        ok(b.paleta[k],
          `"${b.id}" declara \`cascata\` e não declara \`${k}\`. A queda tem quatro ` +
          'camadas — borda, corpo, veia e espuma — e faltando uma ela cai de volta ' +
          'na `massa` do bioma no meio do desenho, que é o defeito original ' +
          'aparecendo em uma camada só: metade água, metade pedra.');
    }
  });

  s.teste('o lago cabe INTEIRO no mapa, com margem dos dois lados (S614)', () => {
    /* ── POR QUE ESTE TESTE PRECISOU EXISTIR ─────────────────────────────
     *
     * O `S614` põe a folga de colocação do lago em 1 px, e ele PASSOU pelo Q2
     * completo — com a suíte inteira verde e com um teste chamado "o passeio
     * NUNCA entra no lago" logo ali em cima.
     *
     * O motivo é instrutivo: aquele teste anda com UMA semente. Um lago colado
     * na borda só prende o treinador quando o passeio o leva àquele canto, e a
     * semente 7 não levava. O teste media um caso e afirmava sobre todos.
     *
     * A correção não é andar mais — é afirmar sobre a REGRA. A colocação é que
     * garante o resto, e ela é geometria pura:
     *
     *   o empurrão para fora do lago manda o treinador para além da borda da
     *   elipse. Se essa borda estiver fora da área andável, o limite da área o
     *   traz de volta para dentro do lago, e ele fica preso trocando de lugar
     *   com ele mesmo. Duas correções de trajeto não resolvem o que uma regra
     *   de colocação resolve.
     */
    const FOLGA_BORDA = 2 * 16;   // os 2 tiles que `acidentes` reserva
    let vistos = 0;
    /* A GEOMETRIA VARIA, e sem isso o teste não vale nada.

       A primeira versão desta afirmação usava só as onze plantas de verdade, e
       com o defeito plantado ela ficou VERDE: com `folga = 1` as posições
       sorteadas daquelas onze caíram longe da borda por sorte. Medido depois:
       varrendo larguras de 20 a 64 colunas, 16 de 460 lagos passam a nascer
       colados — e nenhum deles é uma das onze.

       É o mesmo erro do S617 e do S621, chegando por outra porta: eu medi
       onde o defeito não podia aparecer e chamei de verde. */
    const cenas = [];
    for (const b of (kanto.biomas ?? []))
      for (let cols = 20; cols <= 64; cols += 2)
        for (const rows of [20, 24, 28, 32])
          cenas.push(plantaDo(kanto, b.id, { cols, rows }));
    for (const pl of cenas) {
      const largura = pl.cols * T;
      for (const a of acidentes(pl, T).filter(x => x.forma === 'lago')) {
        vistos++;
        ok(a.x - a.rx >= FOLGA_BORDA - 0.5,
          `em "${pl.bioma}" o lago começa em ${(a.x - a.rx).toFixed(0)} px, a menos ` +
          `de ${FOLGA_BORDA} px da borda esquerda. Colado na lateral, o empurrão ` +
          'que tira o treinador da água o joga para fora da área andável — e o ' +
          'limite da área o traz de volta para dentro do lago.');
        ok(a.x + a.rx <= largura - FOLGA_BORDA + 0.5,
          `em "${pl.bioma}" o lago termina em ${(a.x + a.rx).toFixed(0)} px, e o mapa ` +
          `tem ${largura}. Mesma armadilha, do outro lado.`);
      }
    }
    ok(vistos >= 4,
      `só ${vistos} lagos no acervo inteiro; o teste precisa de vários para valer.`);
  });

  s.teste('o passeio não entra no lago com NENHUMA semente', () => {
    /* Cinco sementes e não uma. A versão de uma semente deixou o `S614` passar
       pelo Q2: ela cobria um trajeto e falava por todos. Cinco não é prova, mas
       é o bastante para o caso da borda aparecer — e a afirmação de colocação
       acima é que carrega a regra. */
    for (const pl of plantas()) {
      const bl = bloqueios(pl, T);
      if (!bl.length) continue;
      const area = areaAndavel(pl, { qw: 24, qh: 52, T });
      for (const sem of [7, 91, 1337, 40503, 777771]) {
        for (let t = 0; t < 6 * 60 * 1000; t += 419) {
          const p = passeio(sem, area, t, { bloqueios: bl });
          for (const b of bl)
            ok(!dentroDe(b, p.x, p.y),
              `em "${pl.bioma}", semente ${sem}, aos ${Math.round(t / 1000)}s o ` +
              'treinador estava DENTRO do lago.');
        }
      }
    }
  });

  /* ── A CACHOEIRA CORRE ──────────────────────────────────────────────────
   *
   * *"criar vida e movimento para as cachoeiras, uma cachoeira estática não é
   * uma cachoeira"*. O motivo é mais forte que estética: água é a única coisa
   * numa cena que o olho SABE que se move. Parada, ela não lê como água mal
   * desenhada — lê como pedra azul.
   */

  s.teste('a veia desce, e volta pelo topo', () => {
    const a = { x: 0, y: 0, w: 48, h: 160 };
    let ant = null, desceu = 0, voltou = 0;
    for (let t = 0; t < VEIA_MS * 2; t += 30) {
      const v = veiaEm(a, 0, t);
      if (ant !== null) (v.fase > ant ? desceu++ : voltou++);
      ant = v.fase;
    }
    ok(desceu > 20,
      `a fase da veia só avançou ${desceu} vezes em dois ciclos. Veia parada é ` +
      'listra pintada, não água caindo — e uma coluna azul com listra parada ' +
      'lê como pedra, que foi a leitura do dono na prévia da ruína.');
    ok(voltou >= 1 && voltou <= 4,
      `a veia reentrou pelo topo ${voltou} vezes em dois ciclos; esperava ~2. ` +
      'É o deslizamento que faz a queda parecer contínua — sem a reentrada ela ' +
      'desce uma vez e some.');
  });

  s.teste('a veia cobre a queda inteira ao longo de um ciclo', () => {
    const a = { x: 0, y: 0, w: 48, h: 160 };
    let topo = Infinity, base = -Infinity, vistas = 0;
    for (let t = 0; t < VEIA_MS; t += 15) {
      const v = veiaEm(a, 0, t);
      if (!v.visivel) continue;
      vistas++;
      topo = Math.min(topo, v.yA);
      base = Math.max(base, v.yB);
    }
    ok(vistas > 30, `a veia ficou visível em só ${vistas} amostras do ciclo`);
    ok(topo <= 1 && base >= a.h - 1,
      `num ciclo a veia foi de ${topo.toFixed(1)} a ${base.toFixed(1)}, e a queda ` +
      `tem ${a.h}. Um trecho da queda por onde a água nunca passa é uma faixa ` +
      'morta no meio da coluna.');
  });

  s.teste('as três veias não descem juntas', () => {
    const a = { x: 0, y: 0, w: 48, h: 160 };
    for (const t of [0, 137, 451, 830]) {
      const f = [0, 1, 2].map(k => veiaEm(a, k, t).fase);
      const unicas = new Set(f.map(v => v.toFixed(2)));
      igual(unicas.size, 3,
        `em t=${t} as fases foram ${f.map(v => v.toFixed(2)).join(', ')}. Juntas, ` +
        'as três viram uma BARRA ÚNICA descendo — um elevador, e não uma queda. ' +
        'É a mesma família do anel do lago em fase com a boia: dois movimentos ' +
        'sincronizados viram um só, e o que os separava some da leitura.');
    }
  });

  s.teste('a fase fica sempre dentro de [0,1), inclusive com t negativo', () => {
    for (const t of [-5000, -1, 0, 1, 12345, 9e6]) {
      for (const k of [0, 1, 2]) {
        const f = faseVeia(k, t);
        ok(f >= 0 && f < 1,
          `faseVeia(${k}, ${t}) devolveu ${f}. Fora de [0,1) a veia salta para ` +
          'fora da queda, e o relógio da página não garante começar em zero.');
      }
    }
  });
  return s;
}
