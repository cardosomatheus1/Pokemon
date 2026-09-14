/* Q1/Q3 · A VIDA DO AR DE CADA BIOMA (bloco 1.5d).
 *
 * ── POR QUE ESTA SUÍTE EXISTIU TARDE, E O QUE ISSO ENSINOU ────────────────
 *
 * O módulo entrou sem teste. A sabotagem pegou os defeitos dele mesmo assim —
 * mas pegou pela porta errada: o veredito dizia "não carrega", ou seja, o
 * mutante era detectado porque a PÁGINA quebrava, e não porque alguém tivesse
 * afirmado alguma coisa sobre partícula.
 *
 * Detecção por acidente conta como detecção e não conta como teste. No dia em
 * que a brasa passar a descer sem quebrar nada, o portão fica verde e o vulcão
 * vira chuva de fogo.
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **CADA VIDA FAZ O QUE O NOME DIZ.** Brasa sobe, neve cai, plâncton fica na
 *    água. Se a de um bioma pudesse ser trocada pela de outro sem perder nada,
 *    o bioma não tinha razão de existir — é o critério que aceitou cada uma.
 *
 * 2. **NINGUÉM SOME PARA SEMPRE.** Toda partícula que sai da cena renasce. Sem
 *    isso o bioma esvazia devagar, e o defeito só aparece depois de minutos —
 *    a pior classe, porque quem abre para conferir nunca vê.
 *
 * 3. **O ARCO NÃO BRILHA: ESTALA.** Ele fica apagado a maior parte do tempo, e
 *    é essa ausência que faz o ferro-velho parecer perigoso em vez de festivo.
 *
 * 4. **NADA DE `Math.random`.** Mesma semente, mesma cena. Partícula sorteada
 *    não se testa, e a aba do idle tem teste que proíbe sorteio.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  VIDA_POR_BIOMA, QUANTAS, vidaDe, mistura, semear, mover, opacidade, quantas,
} from '../app/modules/particulas.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const AREA = { largura: 704, altura: 448, margem: 416 };
const passos = (ps, tipo, n, t0 = 0) => {
  for (let i = 0; i < n; i++) mover(ps, tipo, AREA, t0 + i * 16, 1);
  return ps;
};

export function suite() {
  const s = criarSuite('particulas');

  /* ── 1 · CADA VIDA FAZ O QUE O NOME DIZ ─────────────────────────────── */

  s.teste('a brasa SOBE', () => {
    const ps = semear(1, 'brasa', AREA);
    const antes = ps.map(p => p.y);
    passos(ps, 'brasa', 10);
    /* só conta quem não renasceu no meio do caminho */
    const subiram = ps.filter((p, i) => p.y < antes[i]).length;
    ok(subiram >= ps.length * 0.7,
      `só ${subiram} de ${ps.length} brasas subiram. Descendo, ela vira chuva de ` +
      'fogo — e o vulcão passa a ter a vida do gelo com outra cor.');
  });

  s.teste('a neve CAI', () => {
    const ps = semear(2, 'neve', AREA);
    const antes = ps.map(p => p.y);
    passos(ps, 'neve', 10);
    const cairam = ps.filter((p, i) => p.y > antes[i]).length;
    ok(cairam >= ps.length * 0.7,
      `só ${cairam} de ${ps.length} flocos caíram — neve que sobe é brasa branca`);
  });

  s.teste('o plâncton NUNCA sai da água', () => {
    const ps = semear(3, 'plancton', AREA);
    for (let i = 0; i < 3000; i++) {
      mover(ps, 'plancton', AREA, i * 16, 1);
      for (const p of ps)
        ok(p.y >= AREA.margem,
          `um plâncton chegou a y=${Math.round(p.y)}, acima da margem (${AREA.margem}). ` +
          'Solto, ele vira vaga-lume azul boiando sobre a areia — e aí praia e ' +
          'floresta passam a ter a mesma vida.');
    }
  });

  s.teste('o pólen ATRAVESSA na horizontal, sem subir', () => {
    const ps = semear(4, 'polen', AREA);
    const y0 = ps.map(p => p.y);
    passos(ps, 'polen', 40);
    const desloc = ps.map((p, i) => Math.abs(p.y - y0[i]));
    ok(Math.max(...desloc) < 30,
      `o pólen subiu ${Math.max(...desloc).toFixed(0)} px. Ele atravessa a cena; ` +
      'subindo, vira vaga-lume de dia.');
  });

  s.teste('a bolha sobe da água e some na margem', () => {
    const ps = semear(5, 'bolha', AREA);
    const antes = ps.map(p => p.y);
    passos(ps, 'bolha', 10);
    ok(ps.filter((p, i) => p.y < antes[i]).length >= ps.length * 0.7,
      'bolha que desce é pedra');
  });

  /* ── 2 · NINGUÉM SOME PARA SEMPRE ───────────────────────────────────── */

  s.teste('toda vida repõe o que sai da cena', () => {
    for (const tipo of Object.keys(QUANTAS)) {
      const ps = semear(9, tipo, AREA);
      const n = ps.length;
      passos(ps, tipo, 4000);
      igual(ps.length, n, `a lista de "${tipo}" mudou de tamanho`);
      const dentro = ps.filter(p =>
        p.x > -40 && p.x < AREA.largura + 40 &&
        p.y > -40 && p.y < AREA.altura + 40).length;
      ok(dentro >= n * 0.8,
        `depois de 4.000 passos, só ${dentro} de ${n} partículas de "${tipo}" ainda ` +
        'estão na cena. O bioma esvazia devagar, e o defeito só aparece depois de ' +
        'minutos — a pior classe, porque quem abre para conferir nunca vê.');
    }
  });

  /* ── 3 · O ARCO ESTALA ──────────────────────────────────────────────── */

  s.teste('o arco fica APAGADO a maior parte do tempo', () => {
    const ps = semear(6, 'arco', AREA);
    let aceso = 0, total = 0;
    for (let t = 0; t < 60000; t += 40)
      for (const p of ps) { total++; if (opacidade(p, 'arco', t, AREA) > 0.5) aceso++; }
    const pct = 100 * aceso / total;
    ok(pct < 12,
      `o arco ficou aceso em ${pct.toFixed(1)}% do tempo. Aceso sempre, o ` +
      'ferro-velho deixa de parecer perigoso e vira festivo — é a AUSÊNCIA que ' +
      'faz o efeito.');
    ok(pct > 0.5, 'o arco nunca acendeu — aí ele não existe');
  });

  s.teste('as luzes não piscam todas juntas', () => {
    const ps = semear(7, 'vagalume', AREA);
    const vals = ps.map(p => opacidade(p, 'vagalume', 5000, AREA));
    const espalho = Math.max(...vals) - Math.min(...vals);
    ok(espalho > 0.3,
      `a diferença entre a mais e a menos acesa é ${espalho.toFixed(2)}. Sem fase ` +
      'própria, o bioma inteiro pisca junto e vira letreiro.');
  });

  /* ── 4 · REPRODUZÍVEL ───────────────────────────────────────────────── */

  s.teste('mesma semente, mesma cena', () => {
    const a = semear(42, 'vagalume', AREA), b = semear(42, 'vagalume', AREA);
    passos(a, 'vagalume', 500); passos(b, 'vagalume', 500);
    igual(a.map(p => `${p.x | 0},${p.y | 0}`).join(';'),
          b.map(p => `${p.x | 0},${p.y | 0}`).join(';'),
      'duas cenas com a mesma semente divergiram. Partícula sorteada não se ' +
      'testa, e a aba do idle tem teste que proíbe Math.random.');
  });

  s.teste('a mistura devolve [0,1) e espalha', () => {
    const casas = new Set();
    for (let i = 0; i < 2000; i++) {
      const v = mistura(3, i);
      ok(v >= 0 && v < 1, `mistura(3,${i}) = ${v}`);
      casas.add(Math.floor(v * 50));
    }
    ok(casas.size > 40, `2000 amostras em ${casas.size} de 50 casas — agrupou demais`);
  });

  /* ── a ligação com o pack ───────────────────────────────────────────── */

  s.teste('todo bioma do pack tem uma vida declarada', () => {
    for (const b of (kanto.biomas ?? [])) {
      ok(VIDA_POR_BIOMA[b.id],
        `o bioma "${b.id}" não tem vida declarada e cai no padrão. Dois biomas ` +
        'com a mesma vida é papel de parede: se a vida de um pudesse ser trocada ' +
        'pela de outro sem perder nada, ele não tinha razão de existir.');
      ok(QUANTAS[vidaDe(b.id)],
        `a vida "${vidaDe(b.id)}" não diz quantas partículas quer`);
    }
  });

  s.teste('as vidas não são todas iguais', () => {
    const usadas = new Set((kanto.biomas ?? []).map(b => vidaDe(b.id)));
    ok(usadas.size >= 6,
      `os ${(kanto.biomas ?? []).length} biomas usam só ${usadas.size} vidas ` +
      'diferentes. A vida é o que faz "o mundo tem luz própria" deixar de ser uma ' +
      'cor e virar comportamento.');
  });


  /* ── A DENSIDADE ACOMPANHA A ÁREA ───────────────────────────────────────
   *
   * Os números de `QUANTAS` foram calibrados quando a cena era 15×10 tiles —
   * 240×160 px. O 1.5c cresceu o mundo para 704×448: OITO VEZES a área. Os
   * mesmos dezoito vaga-lumes que enchiam a prévia viraram dezoito pontos
   * perdidos, e o dono viu:
   *
   *   > "os da prévia tinham mais riquezas de detalhes, a caverna de gelo de
   *   >  fato tinha bastante floco de neve caindo, o vulcão as brasas realmente
   *   >  subiam, tinham um pouco mais de vagalume"
   *
   * Ele não pedia partícula nova: via a MESMA partícula diluída. E nenhum teste
   * falava sobre a relação entre a contagem e o tamanho da cena, porque ela não
   * existia — o defeito plantado `S635` passou por isso.
   */

  s.teste('cena maior recebe mais vida, cena menor recebe menos', () => {
    const g = { largura: 704, altura: 448 };
    const p = { largura: 240, altura: 160 };
    for (const tipo of Object.keys(QUANTAS)) {
      const nG = quantas(tipo, g), nP = quantas(tipo, p);
      ok(nG > nP,
        `"${tipo}" deu ${nG} numa cena de 704×448 e ${nP} numa de 240×160. ` +
        'Contagem fixa é a MESMA vida diluída num campo oito vezes maior — foi ' +
        'assim que a cena ficou mais pobre que a prévia sem ninguém tirar nada.');
      ok(nP >= 4, `"${tipo}" caiu para ${nP} na cena pequena — some da tela.`);
    }
  });

  s.teste('a densidade sobe pela raiz, e não pela área', () => {
    /* Oito vezes a área com contagem linear devolveria a densidade da prévia num
       campo que o jogador percorre inteiro, e o ambiente viraria neblina — a
       outra metade da regra do dono: "não é pra você poluir os biomas". A raiz
       mantém constante o que cruza UMA LINHA da tela, que é o que o olho conta. */
    const g = { largura: 704, altura: 448 };
    const p = { largura: 240, altura: 160 };
    const razaoArea = (704 * 448) / (240 * 160);
    for (const tipo of ['neve', 'brasa', 'vagalume']) {
      const k = quantas(tipo, g) / quantas(tipo, p);
      ok(k < razaoArea * 0.6,
        `"${tipo}" multiplicou por ${k.toFixed(1)} entre as duas cenas, e a área ` +
        `multiplicou por ${razaoArea.toFixed(1)}. Acompanhar a área inteira é ` +
        'transformar ambiente em neblina.');
      ok(k > 1.6,
        `"${tipo}" multiplicou só por ${k.toFixed(1)} — pouco para a diferença ` +
        'de tamanho ser sentida.');
    }
  });

  s.teste('a cena de referência devolve exatamente o número da tabela', () => {
    for (const [tipo, n] of Object.entries(QUANTAS))
      igual(quantas(tipo, { largura: 704, altura: 448 }), n,
        `"${tipo}" não devolveu o próprio número da tabela na cena de referência. ` +
        'Se a referência deslizar, a tabela deixa de dizer o que ela diz.');
  });
  return s;
}
