/* Q1/Q3 · A JANELA DE MUNDO (bloco 1.5k).
 *
 * Esta suíte existe porque o defeito plantado `S616` — que apaga o piso do zoom
 * — passou pela suíte inteira. A conta estava correta e não tinha como ser
 * afirmada: morava dentro de `ajustarViewport`, cercada de
 * `getBoundingClientRect` e `canvas.width`.
 *
 * O que ela guarda é a queixa mais repetida do dono sobre esta tela:
 *
 *   > "essa pégada mesmo de agora ficou muito esticadona, precisa dar uma
 *   >  ajustada"
 *
 * Esticado não é erro de execução: nada quebra, nada fica vermelho, a cena
 * aparece. É erro de LEITURA, a classe que a suíte inteira não pega sozinha —
 * e aqui ela vira número, que é a única forma de ela não voltar.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { janela, W_MIN, H_MIN, niveis, nivelMaisProximo, rotuloZoom } from '../app/modules/viewport.mjs';

/* O mundo de verdade da aba: 44×28 tiles de 16 px. */
const MUNDO = { mundoW: 704, mundoH: 448 };
const prop = (a, b) => a / b;

export function suite() {
  const s = criarSuite('viewport');

  s.teste('a janela nunca fica mais larga que o mundo — é o que tira o esticado', () => {
    /* As caixas que o dono de fato usa, e as que ele vai usar: monitor largo,
       notebook, a alça arrastada até quase o fim, e o celular deitado. */
    const caixas = [[1534, 792], [1438, 792], [1100, 420], [960, 560],
                    [1920, 300], [420, 700], [2560, 1000]];
    for (const [cx, cy] of caixas) {
      for (const zoom of [0.2, 0.5, 1, 2, 3, 4, 5, 12]) {
        const j = janela({ cx, cy, ...MUNDO, zoom });
        ok(j.w <= MUNDO.mundoW + 0.5 && j.h <= MUNDO.mundoH + 0.5,
          `caixa ${cx}×${cy} com zoom ${zoom} pediu uma janela de ${j.w}×${j.h}, ` +
          `maior que o mundo (${MUNDO.mundoW}×${MUNDO.mundoH}). Aí a janela é ` +
          'limitada ao mapa, caixa e canvas ficam com proporções diferentes, e o ' +
          'CSS estica para cobrir a diferença. É o "esticadona" que o dono viu.');
      }
    }
  });

  s.teste('a proporção da janela acompanha a da caixa (o pixel sai quadrado)', () => {
    for (const [cx, cy] of [[1534, 792], [1100, 420], [960, 560], [1920, 1080]]) {
      const j = janela({ cx, cy, ...MUNDO, zoom: 1 });
      const dif = Math.abs(prop(j.w, j.h) - prop(cx, cy)) / prop(cx, cy);
      ok(dif < 0.02,
        `caixa ${cx}×${cy} (${prop(cx, cy).toFixed(2)}) virou janela ${j.w}×${j.h} ` +
        `(${prop(j.w, j.h).toFixed(2)}) — ${(dif * 100).toFixed(1)}% de diferença. ` +
        'Proporções diferentes é o CSS esticando, e o olho lê isso mesmo com o ' +
        'pixel quadrado no código.');
    }
  });

  s.teste('o piso VENCE um zoom menor que ele (S616)', () => {
    const cx = 1534, cy = 792;
    const j = janela({ cx, cy, ...MUNDO, zoom: 0.5 });
    ok(j.usar > 0.5,
      `o zoom 0.5 foi usado como está (${j.usar}), abaixo do piso ${j.piso.toFixed(3)}. ` +
      'É O S616. O zoom é escolha do jogador PARA CIMA; abaixo do piso não existe ' +
      'imagem melhor, existe a mesma imagem esticada — a única escolha que o piso ' +
      'tira dele é a de ver a cena deformada.');
    igual(j.usar, j.piso, 'abaixo do piso, o piso é o que vale');
  });

  s.teste('acima do piso, o zoom é do jogador e ninguém mexe', () => {
    const j = janela({ cx: 1534, cy: 792, ...MUNDO, zoom: 5 });
    igual(j.usar, 5,
      'o zoom 5 foi alterado. Acima do piso a escolha é dele, ponto — um piso ' +
      'que também mexesse no zoom grande seria a tela decidindo pelo jogador, ' +
      'que é o oposto do que a alça de redimensionar entregou.');
    ok(j.w < 704 && j.h < 448, 'com zoom alto a janela mostra MENOS mundo, não mais');
  });

  s.teste('o mundo pequeno demais não gera janela de tamanho zero', () => {
    const j = janela({ cx: 1534, cy: 792, mundoW: 16, mundoH: 16, zoom: 1 });
    ok(j.w >= W_MIN && j.h >= H_MIN,
      `janela ${j.w}×${j.h} abaixo do mínimo ${W_MIN}×${H_MIN}. Canvas de lado ` +
      'zero não desenha nada, e a aba fica preta sem erro nenhum no console.');
  });

  s.teste('caixa de tamanho zero cai no padrão em vez de dividir por zero', () => {
    for (const caixa of [{ cx: 0, cy: 0 }, { cx: NaN, cy: 500 }, { cx: 900, cy: undefined }]) {
      const j = janela({ ...caixa, ...MUNDO, zoom: 1 });
      ok(Number.isFinite(j.w) && Number.isFinite(j.h) && j.w > 0 && j.h > 0,
        `caixa ${JSON.stringify(caixa)} devolveu ${j.w}×${j.h}. A caixa mede zero ` +
        'no primeiro quadro depois de trocar de aba — antes de o layout correr — ' +
        'e uma janela NaN ali deixa o canvas quebrado até alguém redimensionar.');
    }
  });


  /* ── OS NÍVEIS DE ZOOM ──────────────────────────────────────────────────
   *
   * A queixa do dono, palavra dele: *"Percebi que o zoom do 1x e 2x não
   * mudam"*. Medido na janela dele: palco 1145×897, piso 2,00 — os dois
   * clicavam para 2,00 e renderizavam idêntico, com o rótulo dizendo "1×".
   *
   * A causa fui eu: o piso anti-esticado do 1.5i comeu os níveis de baixo, e a
   * lista fixa continuou oferecendo o que não podia cumprir. Nenhum teste
   * falava sobre a relação entre a lista e o piso, porque ela não existia.
   */

  s.teste('nenhum nível oferecido renderiza igual a outro', () => {
    for (const piso of [0.4, 0.9, 1, 1.63, 2, 2.0001, 3.4, 4.9, 6.2]) {
      const lista = niveis(piso);
      /* A CAIXA SAI DO PISO, e não o contrário. A primeira versão gerava os
         níveis de um piso arbitrário e renderizava numa caixa fixa cujo piso
         real era 1,63 — par inconsistente, e o teste reprovava o código certo.
         Uma caixa de piso×mundo tem exatamente aquele piso, por construção. */
      const cx = piso * 704, cy = piso * 448;
      const efetivos = lista.map(z => janela({ cx, cy, mundoW: 704, mundoH: 448, zoom: z }).usar);
      const unicos = new Set(efetivos.map(v => v.toFixed(4)));
      igual(unicos.size, efetivos.length,
        `com piso ${piso} a lista ${lista.map(z => z.toFixed(2)).join(', ')} ` +
        `renderiza ${efetivos.map(v => v.toFixed(2)).join(', ')} — há repetidos. ` +
        'Dois níveis com a mesma imagem é o defeito que o dono viu: ele clica, ' +
        'nada muda, e conclui que o jogo está quebrado.');
    }
  });

  s.teste('o primeiro nível É o piso, e não algo abaixo dele', () => {
    for (const piso of [0.7, 1.2, 2, 3.9]) {
      const [primeiro] = niveis(piso);
      ok(primeiro >= piso - 1e-9,
        `com piso ${piso} o primeiro nível é ${primeiro}, abaixo do piso. ` +
        'Abaixo do piso não existe imagem melhor: existe a mesma imagem esticada.');
      ok(primeiro <= piso + 0.06,
        `com piso ${piso} o primeiro nível é ${primeiro} — longe demais do piso. ` +
        'O mais afastado tem de ser "o mapa inteiro cabendo", que é o piso.');
    }
  });

  s.teste('a lista nunca fica vazia, nem com piso altíssimo', () => {
    for (const piso of [5, 8, 40]) {
      const l = niveis(piso);
      ok(l.length >= 1,
        `piso ${piso} deixou a lista vazia — o controle de zoom some da tela.`);
    }
  });

  s.teste('a lista sobe, e sem repetir', () => {
    for (const piso of [0.5, 1, 1.63, 2.5]) {
      const l = niveis(piso);
      for (let i = 1; i < l.length; i++)
        ok(l[i] > l[i - 1],
          `com piso ${piso} a lista ${l.join(', ')} não é crescente.`);
    }
  });

  s.teste('o zoom guardado sobrevive a uma janela de outro tamanho', () => {
    /* 3× guardado, janela nova onde o piso virou 3,4: o nível tem de virar 3,4
       e não sumir do controle nem cair para o primeiro da lista. */
    const l = niveis(3.4);
    const escolhido = nivelMaisProximo(l, 3);
    ok(l.includes(escolhido), 'o nível escolhido não está na lista');
    igual(escolhido, l[0],
      `guardado 3× com piso 3,4, o mais próximo devia ser o próprio piso ` +
      `(${l[0]}), e veio ${escolhido}.`);
    igual(nivelMaisProximo(niveis(1), 4), 4, 'com piso 1, um 4× guardado volta 4×');
  });

  s.teste('o rótulo mostra o número que a tela usa', () => {
    igual(rotuloZoom(3), '3×');
    const l = niveis(2);
    igual(rotuloZoom(l[0]), '2×', 'piso inteiro não deve virar "2.00×"');
    ok(/^1\.65/.test(rotuloZoom(niveis(1.63)[0])),
      `o piso 1,63 saiu rotulado como ${rotuloZoom(niveis(1.63)[0])}. Um "1×" que ` +
      'renderiza 2,00× é mentira pequena, e mentira pequena em controle é a que ' +
      'mais irrita: o jogador clica, nada muda, e o jogo é que parece quebrado.');
  });
  return s;
}
