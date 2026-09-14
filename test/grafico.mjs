/* Q1/Q2/Q6 · OS GRÁFICOS DO PAINEL, EM SVG ESCRITO À MÃO (R20 — P1.1)
 *
 * ── POR QUE SVG À MÃO, E NÃO UMA BIBLIOTECA ────────────────────────────────
 *
 * Porque o projeto não tem dependência e não vai ter. Mas há razão melhor que
 * a regra: um gráfico de auditoria precisa que a geometria seja CONFERÍVEL. Uma
 * barra é uma barra porque o número diz, e o teste consegue medir o atributo.
 *
 * ── A DISTINÇÃO QUE ORGANIZA ESTE ARQUIVO ──────────────────────────────────
 *
 * `0` e `sem dado` são coisas diferentes, e num painel de auditoria a diferença
 * é tudo. "O edge realizado é zero" significa que a casa não ficou com nada.
 * "Não há edge realizado" significa que nenhuma rodada liquidou. Desenhados
 * iguais, o operador lê o segundo como o primeiro e conclui que a economia
 * quebrou — ou o contrário, que é pior.
 *
 * Por isso `null` NUNCA vira barra de altura zero. Vira texto.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { barras, medidor, escapar } from '../app/modules/grafico.mjs';

/* Lê os atributos de todas as barras desenhadas, na ordem em que saíram. */
const alturas = svg => [...svg.matchAll(/<rect[^>]*class="g-barra"[^>]*height="([\d.]+)"/g)]
  .map(m => Number(m[1]));

export function suite() {
  const s = criarSuite('grafico');

  /* ── O BÁSICO: É SVG, E FECHA ──────────────────────────────────────────*/

  s.teste('sai um SVG fechado', () => {
    const svg = barras({ dados: [{ rotulo: 'a', valor: 1 }] });
    ok(svg.startsWith('<svg'), 'não começa com <svg');
    ok(svg.trimEnd().endsWith('</svg>'), 'não fecha o <svg>');
    ok(/viewBox="/.test(svg), 'sem viewBox o gráfico não escala na tela');
  });

  /* ── A GEOMETRIA É PROPORCIONAL, e isso é conferível ───────────────────*/

  /* O MAIOR VALOR NÃO PODE SER O PRIMEIRO DA LISTA, e a primeira versão deste
     teste punha 100 na frente. Com isso, `const maior = vivos[0].valor` — a
     sabotagem S379, que troca o máximo pelo primeiro elemento — dava o mesmo
     resultado, e passou ilesa. O dado do teste é parte do teste. */
  s.teste('a altura da barra é proporcional ao valor', () => {
    const svg = barras({ dados: [
      { rotulo: 'a', valor: 50 }, { rotulo: 'b', valor: 100 }, { rotulo: 'c', valor: 0 },
    ] });
    const h = alturas(svg);
    igual(h.length, 3, `desenhou ${h.length} barras para 3 valores`);
    ok(Math.abs(h[0] * 2 - h[1]) < 0.01,
      `metade do valor não deu metade da altura: [${h}]`);
    igual(h[2], 0, 'o valor zero desenhou barra com altura');
    /* E a maior barra tem que caber no quadro: se a escala sair de um valor
       menor que o máximo, esta é a barra que estoura. */
    ok(h[1] <= 132 - 26, `a maior barra (${h[1]}) passou da área útil do gráfico`);
  });

  /* TODOS IGUAIS não pode virar divisão por zero na normalização — e o caso
     acontece de verdade: economia parada, três baldes com o mesmo total. */
  s.teste('valores todos iguais não quebram a escala', () => {
    const h = alturas(barras({ dados: [
      { rotulo: 'a', valor: 7 }, { rotulo: 'b', valor: 7 },
    ] }));
    ok(h.every(Number.isFinite), `altura não finita: [${h}]`);
    ok(h[0] === h[1] && h[0] > 0, `valores iguais deram alturas ${h}`);
  });

  s.teste('todos zero não viram NaN', () => {
    const svg = barras({ dados: [{ rotulo: 'a', valor: 0 }, { rotulo: 'b', valor: 0 }] });
    ok(!/NaN|Infinity/.test(svg), `geometria inválida no SVG: ${svg.slice(0, 200)}`);
  });

  s.teste('lista vazia não desenha gráfico vazio disfarçado', () => {
    const svg = barras({ dados: [] });
    igual(alturas(svg).length, 0, 'desenhou barra sem dado nenhum');
    ok(/sem dado/i.test(svg), 'não disse que não há dado — só devolveu um quadro em branco');
  });

  /* ── `null` É AUSÊNCIA, E NÃO ZERO ─────────────────────────────────────*/

  s.teste('valor ausente não vira barra de altura zero', () => {
    const svg = barras({ dados: [{ rotulo: 'fsr', valor: null }] });
    igual(alturas(svg).length, 0,
      '`null` virou barra. Na tela, "não houve sink nenhum" ficaria idêntico a ' +
      '"a economia drenou tudo" — e são conclusões opostas.');
    ok(/sem dado/i.test(svg), 'a ausência não foi escrita em lugar nenhum');
  });

  /* ── O MEDIDOR: edge realizado contra margem configurada ───────────────*/

  s.teste('o medidor marca a referência e o valor', () => {
    const svg = medidor({ valor: 0.12, referencia: 0.10, max: 0.30, rotulo: 'edge' });
    ok(/class="g-ref"/.test(svg), 'a margem configurada não foi marcada');
    ok(/class="g-val"/.test(svg), 'o edge realizado não foi marcado');
  });

  /* O DESCOLAMENTO É O SINAL. Se o realizado passa do configurado, o medidor
     precisa DIZER — é a pergunta que o gráfico de favorecimento responde. */
  s.teste('o medidor acusa quando o realizado passa do configurado', () => {
    const acima = medidor({ valor: 0.20, referencia: 0.10, max: 0.30, rotulo: 'edge' });
    const dentro = medidor({ valor: 0.08, referencia: 0.10, max: 0.30, rotulo: 'edge' });
    ok(/g-acima/.test(acima), 'realizado acima do configurado não foi sinalizado');
    ok(!/g-acima/.test(dentro), 'sinalizou descolamento onde não há');
  });

  s.teste('o medidor sem valor não desenha um ponteiro em zero', () => {
    const svg = medidor({ valor: null, referencia: 0.10, max: 0.30, rotulo: 'edge' });
    ok(!/class="g-val"/.test(svg),
      'desenhou o ponteiro em zero para "ainda não houve rodada liquidada"');
    ok(/sem dado/i.test(svg), 'não escreveu a ausência');
  });

  /* AS DUAS BORDAS, e a de baixo não é hipótese: edge realizado NEGATIVO é a
     casa tendo pago mais do que arrecadou — exatamente o caso que o operador
     precisa ver desenhado, e não sumindo para a esquerda do quadro.
     O `2` descontado é a largura do traço: `x=100` colocaria o ponteiro com
     metade para fora. */
  s.teste('o ponteiro não sai do quadro por nenhum dos dois lados', () => {
    const xDe = svg => Number(/class="g-val"[^>]*x="([\d.-]+)"/.exec(svg)?.[1]);
    const estourou = xDe(medidor({ valor: 9.9, referencia: 0.10, max: 0.30, rotulo: 'edge' }));
    const negativo = xDe(medidor({ valor: -0.4, referencia: 0.10, max: 0.30, rotulo: 'edge' }));
    ok(Number.isFinite(estourou) && estourou >= 0 && estourou <= 98,
      `o ponteiro foi parar em x=${estourou}, fora do quadro de 0..98`);
    igual(negativo, 0,
      `edge negativo levou o ponteiro para x=${negativo} — fora do quadro pela esquerda`);
  });

  s.teste('a marca da referência também fica dentro do quadro', () => {
    const x = Number(/class="g-ref"[^>]*x="([\d.-]+)"/
      .exec(medidor({ valor: 0.1, referencia: 7, max: 0.30 }))?.[1]);
    ok(Number.isFinite(x) && x >= 0 && x <= 99,
      `a referência foi parar em x=${x}, fora do quadro`);
  });

  /* ── ESCAPE: o rótulo vem do BANCO ─────────────────────────────────────*/

  /* Os rótulos das barras de faucet/sink são o `type` do `wallet_ledger`. É
     dado, e dado vai para dentro de markup. Concatenar sem escapar é o mesmo
     defeito de sempre, num lugar novo — e este lugar é o painel de ADM, a
     superfície de maior valor do sistema (§5.11). */
  s.teste('o rótulo é escapado antes de virar markup', () => {
    igual(escapar('<script>'), '&lt;script&gt;', 'escapar() não fecha a tag');
    igual(escapar('a & b'), 'a &amp; b', 'e comercial não escapado');
    igual(escapar('"x"'), '&quot;x&quot;', 'aspas não escapadas quebram atributo');
    const svg = barras({ dados: [{ rotulo: '<script>x</script>', valor: 1 }] });
    ok(!/<script>/.test(svg), `markup do rótulo entrou cru no SVG: ${svg}`);
  });

  s.teste('o rótulo do medidor também é escapado', () => {
    ok(!/<script>/.test(medidor({ valor: 0.1, referencia: 0.1, max: 1, rotulo: '<script>' })),
      'o rótulo do medidor entrou cru');
  });

  return s;
}
