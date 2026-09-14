/* AS CINCO FAIXAS DE RARIDADE — bloco 1.23.
 *
 * O que esta suíte protege não é a paleta: é a propriedade de que **a raridade
 * é informação**. Três coisas decorrem disso, e as três já foram violadas:
 *
 *   FONTE ÚNICA      três telas definiam as cores e as três discordavam
 *   INDEPENDENTE     o `lendario` usava `var(--gold)`, que muda com o TEMA —
 *                    ciano no padrão, roxo no shadow. A faixa mais rara vestia
 *                    a cor de outra faixa, e trocava de faixa com o tema.
 *   SEPARÁVEL        cor que não se distingue da vizinha não informa nada
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { FAIXAS, RARIDADE, daFaixa, corDa, canaisDe, estiloDa, classeDa }
  from '../app/modules/raridade.mjs';
import { readFileSync } from 'node:fs';

const ler = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/* Distância no cubo RGB. Grosseira de propósito: o objetivo não é medir
   percepção, é pegar duas faixas que ficaram parecidas por descuido. */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function suite() {
  const s = criarSuite('raridade');

  s.teste('as cinco faixas existem e cada uma tem cor própria', () => {
    igual(FAIXAS.length, 5, 'o número de faixas mudou');
    for (const f of FAIXAS) {
      ok(RARIDADE[f], `a faixa "${f}" não está na tabela`);
      ok(/^#[0-9a-f]{6}$/i.test(RARIDADE[f].cor),
        `a cor de "${f}" não é um hex de seis dígitos: ${RARIDADE[f].cor}`);
    }
    const cores = FAIXAS.map(f => corDa(f).toLowerCase());
    igual(new Set(cores).size, 5, 'duas faixas ficaram com a MESMA cor');
  });

  s.teste('NENHUMA faixa usa a cor do tema — e é aqui que o lendario quebrava', () => {
    /* Os dois valores de `--gold` que o `index.html` declara. Lidos do arquivo,
       e não escritos aqui: um acento novo num tema novo precisa reprovar. */
    const html = ler('app/index.html');
    const acentos = [...html.matchAll(/--gold:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1]);
    ok(acentos.length >= 2,
      `só achei ${acentos.length} valor(es) de --gold — a leitura parou de casar ` +
      'com o CSS, e uma peneira que não acha nada passa verde sobre qualquer coisa');

    for (const a of acentos) {
      const ca = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
      for (const f of FAIXAS) {
        const d = dist(canaisDe(f), ca);
        ok(d > 60,
          `a faixa "${f}" (${corDa(f)}) está a ${d.toFixed(0)} do acento do tema ` +
          `(${a}). Raridade é informação: ela não pode mudar de significado ` +
          'quando o jogador troca de tema — foi assim que a faixa mais rara do ' +
          'jogo saiu CIANO num tema e ROXA no outro.');
      }
    }
  });

  s.teste('as faixas se distinguem entre si', () => {
    for (let i = 0; i < FAIXAS.length; i++)
      for (let j = i + 1; j < FAIXAS.length; j++) {
        const d = dist(canaisDe(FAIXAS[i]), canaisDe(FAIXAS[j]));
        ok(d > 70,
          `"${FAIXAS[i]}" e "${FAIXAS[j]}" estão a ${d.toFixed(0)} uma da outra — ` +
          'perto demais para o olho separar numa grade');
      }
  });

  s.teste('o brilho SOBE com a raridade, e o comum não tem nenhum', () => {
    /* A segunda escala. Ela existe porque cinco matizes numa rampa já são
       muitos para o olho separar de relance — e porque a AUSÊNCIA de brilho no
       comum é o fundo contra o qual o resto se destaca. */
    igual(RARIDADE.comum.brilho, 0,
      'o comum ganhou brilho — a ausência dele é que faz o resto se destacar');
    for (let i = 1; i < FAIXAS.length; i++)
      ok(RARIDADE[FAIXAS[i]].brilho > RARIDADE[FAIXAS[i - 1]].brilho,
        `o brilho de "${FAIXAS[i]}" não é maior que o de "${FAIXAS[i - 1]}" — ` +
        'uma escala que não sobe não é uma escala');
  });

  s.teste('só a faixa mais rara pulsa', () => {
    const pulsam = FAIXAS.filter(f => RARIDADE[f].pulso);
    igual(pulsam.join(','), 'lendario',
      `pulsam: ${pulsam.join(', ') || '(nenhuma)'}. A única coisa que se mexe na ` +
      'grade tem de ser a única que quase nunca aparece — o `lendario` tem UMA ' +
      'vaga no mapa inteiro. Movimento em toda parte é movimento em lugar nenhum.');
  });

  s.teste('faixa desconhecida cai no comum, e não em nada', () => {
    igual(daFaixa('epico'), RARIDADE.comum, 'faixa nova devolveu outra coisa');
    igual(daFaixa(undefined), RARIDADE.comum);
    ok(classeDa('epico').endsWith('rar-comum'), `classe: ${classeDa('epico')}`);
    ok(estiloDa('epico').includes(RARIDADE.comum.cor), 'o estilo perdeu a cor');
  });

  s.teste('os canais casam com o hex — os dois lados da mesma cor', () => {
    for (const f of FAIXAS) {
      const [r, g, b] = canaisDe(f);
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      igual(hex, corDa(f).toLowerCase(), `os canais de "${f}" divergiram do hex`);
      ok(estiloDa(f).includes(`${r},${g},${b}`),
        `o estilo de "${f}" não leva os canais — sem eles o fundo suave teria ` +
        'de repetir a cor, que é como as três telas divergiram');
    }
  });

  s.teste('as telas leem DAQUI, e não de uma cópia própria', () => {
    /* A duplicação é o defeito, e não o sintoma. Enquanto cada tela tinha a
       própria tabela, era questão de tempo até uma divergir — e as três já
       tinham divergido quando fui medir. */
    for (const p of ['app/modules/pokedex.mjs', 'app/modules/idle-paineis.mjs'])
      ok(/from '\.\/raridade\.mjs'/.test(ler(p)),
        `${p} não importa \`raridade.mjs\` — se ele guarda a própria tabela, a ` +
        'divergência volta');

    /* E o CSS não pode ter as cores escritas à mão de novo. As classes por
       faixa que tinham a cor no arquivo saíram; o que fica é a variável. */
    const html = ler('app/index.html');
    ok(!/\.idleRar-lendario\s*\{[^}]*var\(--gold\)/.test(html),
      'a faixa mais rara voltou a usar `var(--gold)`, que muda com o tema');
    ok(!/\.prvItem\.r-lendario\s*\{\s*border-top-color:\s*#ffc107/.test(html),
      'a prévia voltou a pintar o lendário de dourado');
  });

  return s;
}
