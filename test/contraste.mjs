/* Q5 · CONTRASTE — o piso da WCAG AA, medido no navegador.
 *
 * Por que no navegador e não sobre o CSS: a cor que o jogador vê é o resultado
 * de `--panel` com alfa sobre `--bg`, com gradiente por cima e às vezes um
 * `backdrop-filter`. Ler o valor declarado responderia sobre o token; a
 * pergunta é sobre o pixel.
 *
 * O item 8 da L-030 nasceu de uma medição do crítico cego: o rodapé de auditoria
 * — `154k simulações · casa 8,0 % · erro máx 1,9 %` — marcava **3,73:1** contra
 * o piso de **4,5:1**. É a frase que sustenta o discurso do produto, na tela em
 * que se pede confiança nas odds, e era a menos legível do painel.
 *
 * A conta é a da WCAG 2.1: luminância relativa, `(L1+0,05)/(L2+0,05)`.
 */
import { criarSuite, ok } from './harness.mjs';

/* Canal sRGB para linear. A curva não é um gama simples: abaixo de 0,03928 é
   reta, acima é potência. Errar isso dá contraste alto demais no escuro, que é
   exatamente onde este produto vive. */
const linear = c => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
export const luminancia = ([r, g, b]) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

export function contraste(frente, fundo) {
  const a = luminancia(frente), b = luminancia(fundo);
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

export const PISO_AA = 4.5;        // texto normal
export const PISO_AA_GRANDE = 3;   // >= 18,66px, ou >= 14px em negrito

/* Recebe o que o navegador mediu (ver test/visual.mjs) e julga. Fica separado
   da captura de propósito: a aritmética é pura e testável sem navegador. */
export function suite(medidas) {
  const s = criarSuite('contraste');

  if (!medidas){
    s.teste('sem navegador: contraste não medido', () => {});
    return s;
  }

  /* A conta em si, contra valores conhecidos. Um medidor sem calibração mede
     qualquer coisa com confiança. */
  s.teste('a conta bate com os pares conhecidos da WCAG', () => {
    const perto = (a, b, tol) => Math.abs(a - b) <= tol;
    ok(perto(contraste([255,255,255], [0,0,0]), 21, 0.01), 'branco sobre preto deveria dar 21:1');
    ok(perto(contraste([0,0,0], [255,255,255]), 21, 0.01), 'a razão tem que ser simétrica');
    ok(perto(contraste([119,119,119], [255,255,255]), 4.48, 0.02),
      '#777 sobre branco é o caso de fronteira clássico: 4,48:1, logo abaixo do piso');
  });

  for (const m of medidas) {
    const piso = m.grande ? PISO_AA_GRANDE : PISO_AA;
    s.teste(`${m.nome} tem contraste de leitura`, () => {
      const c = contraste(m.frente, m.fundo);
      ok(c >= piso,
        `${m.nome}: ${c.toFixed(2)}:1 contra o piso de ${piso}:1 ` +
        `(texto ${m.frente.join(',')} sobre fundo ${m.fundo.join(',')}, ` +
        `${m.px}px${m.grande ? ', conta como texto grande' : ''}).\n` +
        `      Amostra: "${m.amostra}"`);
    });
  }
  return s;
}
