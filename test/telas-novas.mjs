/* AS TELAS NOVAS DO RAMO CODEX, VESTIDAS (ST-2.33, o 7º relato).
 *
 * O dono: *"a prévia de evolução e o resumo de luta estão sem estilo — lista
 * crua, 'beedrill' em minúsculo e 'Antes 31 → Depois 35' solto numa linha"*;
 * *"a ficha do golpe abre espremida numa coluna estreita e estica a linha"*.
 *
 * A decisão (que linhas, que sentido, qual lado foi melhor) mora em camada 0
 * e é testada em Node; a tela pinta uma tabela, e o que se confere dela é a
 * forma — e que o CSS dela existe.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { previsoesEvolucao, linhasDaPrevia } from '../app/modules/preparacao-dados.mjs';
import { linhasDoResumo } from '../app/modules/resumo-batalha.mjs';
import { arranjoClassico, LARGURA_DO_SPRITE } from '../app/modules/luta-classica.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import PACK from '../content/escolhido.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const kakuna = { id: 'k', dex: 14, xp: xpParaNivel(12), iv: Array(6).fill(15), natureza: 'Hardy', golpes: [] };
const temRegra = (css, sel) => new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[{,]').test(css);

export function suite() {
  const s = criarSuite('telas-novas');

  s.teste('o nome da espécie sai como o jogador lê — "Beedrill", e não o slug', () => {
    const [p] = previsoesEvolucao(PACK, kakuna, {});
    igual(p.nome, 'Beedrill');
    const esp = p.comparacao.membros[0].mudancas.find(m => m.campo === 'Espécie');
    igual(esp.antes, 'Kakuna (#14)', 'a comparação ainda escreve o slug');
    igual(p.de, 14, 'a prévia não diz de quem parte');
  });

  s.teste('a prévia vira linhas com o sentido de cada mudança, sem repetir a espécie', () => {
    const [p] = previsoesEvolucao(PACK, kakuna, {});
    const l = linhasDaPrevia(p);
    ok(!l.some(x => x.campo === 'Espécie'), 'a espécie (que já está no título) repetida na tabela');
    const hp = l.find(x => x.campo === 'HP'), def = l.find(x => x.campo === 'Defesa');
    igual(JSON.stringify([hp.antes, hp.depois, hp.delta, hp.sentido]), JSON.stringify(['35', '40', 5, 'sobe']));
    igual(def.sentido, 'desce');
    igual(linhasDaPrevia({ comparacao: { compativel: false } }).length, 0);
    igual(linhasDaPrevia({ comparacao: { compativel: true, membros: [{ mudancas: [{ campo: 'Natureza', antes: 'Hardy', depois: 'Bold' }] }] } })[0].sentido, 'muda');
  });

  s.teste('a tela da prévia é uma tabela com as duas formas no título, e nenhuma linha solta', () => {
    const tela = fonte('../app/modules/preparacao-tela.mjs');
    ok(/linhasDaPrevia\(p\)/.test(tela), 'a prévia não usa as linhas da camada 0');
    ok(/class="adTabela/.test(tela), 'a prévia não pinta a tabela');
    ok(!/Antes \$\{esc\(c\.antes\)\} → Depois/.test(tela), 'sobrou a linha solta "Antes X → Depois Y"');
    ok(/class="evpPrevia/.test(tela) && /class="evpForma"/.test(tela) && /arte\(p\.de\)/.test(tela), 'a prévia sem a moldura e o título das formas');
    const html = fonte('../app/index.html');
    ok(/<div class="idleEvolui" id="idleEvolui" hidden><\/div>/.test(html), 'a chamada da evolução ainda é um <p> — <details> dentro de <p> é HTML inválido');
  });

  s.teste('o resumo da luta diz, linha a linha, qual lado foi melhor — e "erros" e "resistidos" contam ao contrário', () => {
    const r = { A: { tentativas: 10, erros: 1, criticos: 2, superEfetivos: 3, resistidos: 1, imunidades: 0, hpRetirado: 120, nocautes: 3 },
                B: { tentativas: 9, erros: 3, criticos: 2, superEfetivos: 1, resistidos: 4, imunidades: 1, hpRetirado: 80, nocautes: 1 } };
    const l = linhasDoResumo(r);
    const por = k => l.find(x => x.chave === k);
    igual(por('erros').melhor, 'A', 'menos erros não contou como melhor');
    igual(por('resistidos').melhor, 'A', 'menos golpes resistidos não contou como melhor');
    igual(por('imunidades').melhor, 'A');
    igual(por('nocautes').melhor, 'A');
    igual(por('criticos').melhor, null, 'empate escolheu um lado');
    igual(por('tentativas').melhor, null, 'golpes registrados não é "melhor" de ninguém');
    igual(l.length, 8);
  });

  s.teste('a tela do resumo é uma tabela de dois lados, com classe e CSS', () => {
    const tela = fonte('../app/modules/resumo-batalha-tela.mjs');
    ok(/linhasDoResumo\(/.test(tela), 'o resumo não usa as linhas da camada 0');
    ok(/class="rbResumo"/.test(tela) && /class="adTabela rbTabela"/.test(tela), 'o resumo sem classe — é por isso que saía cru');
    ok(!/<ul>/.test(tela), 'sobrou a lista crua');
    const css = fonte('../app/index.html');
    for (const sel of ['.evpPrevia', '.evpForma', '.adTabela', '.adSobe', '.adDesce', '.rbResumo', '.rbMelhor'])
      ok(temRegra(css, sel), `sem regra de CSS para ${sel}`);
  });

  s.teste('a ficha do golpe aberta ocupa a linha inteira, e a linha não estica os outros cartões', () => {
    const css = fonte('../app/index.html');
    ok(/\.idleLinha > \.idleCaixaItem:has\(\.idleGolpes\[open\]\)\{grid-column:1 \/ -1/.test(css), 'a ficha aberta continua espremida na coluna do cartão');
    ok(/\.idleLinha:has\(> \.idleCaixaItem\)\{[^}]*align-items:start/.test(css), 'abrir uma ficha ainda estica a linha inteira');
  });

  s.teste('D-166: toda suíte escrita roda no npm test — nenhuma fica de fora do run.mjs', () => {
    const run = fonte('./run.mjs');
    const fora = readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.mjs') && f !== 'harness.mjs')
      .filter(f => /criarSuite\(/.test(fonte('./' + f)) && !run.includes(`'./${f}'`));
    igual(fora.join(', '), '', 'suíte escrita e nunca executada — verde de quem não rodou');
  });

  s.teste('no palco clássico, todo sprite cabe inteiro — o Beedrill cortado na borda esquerda (7º relato)', () => {
    const css = fonte('../app/index.html');
    ok(css.includes(`--base:clamp(${LARGURA_DO_SPRITE.minPx}px,${LARGURA_DO_SPRITE.pct}cqw`), 'a largura do sprite no CSS não é a da regra');
    /* o pior caso: o palco do celular (~360 px), onde o mínimo de 68 px pesa mais que os 15,5% */
    const base = Math.max(LARGURA_DO_SPRITE.pct, LARGURA_DO_SPRITE.minPx / 360 * 100);
    const lado = (l, n) => Array.from({ length: n }, (_, i) => ({ slot: `${l}${i}` }));
    for (let n = 1; n <= 6; n++) {
      const a = arranjoClassico({ A: lado('A', n), B: lado('B', n) });
      for (const f of [...a.A, ...a.B]) {
        const meia = f.escala * base / 2;
        ok(f.x - meia >= 0 && f.x + meia <= 100, `${n} por lado: ${f.slot} em x=${f.x}% com meia largura ${meia.toFixed(1)}% sai do palco`);
      }
    }
  });

  s.teste('a luta fluida: nada que fica sempre na tela usa backdrop-filter (73 → 25 ms por quadro)', () => {
    const css = fonte('../app/index.html');
    const regra = sel => { const i = css.indexOf(sel); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
    for (const sel of ['.card, .feat, .step, .rule, .modal, .hero-stats div, .stat-box, .opt, .chip{', '.topbar{', '.tbtn{', '#hud{',
                       '#faixa{', '#ticker{', '.corner-badge{', '#log{', '.hudCanto{'])
      ok(regra(sel) && !/backdrop-filter:blur/.test(regra(sel)), `${sel} voltou a desfocar a cada quadro`);
  });

  return s;
}
