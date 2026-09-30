/* ST-5.9 · APOSTAR NÃO TIRA A ARENA DE VISTA (L-207).
 *
 * Medido em 30/09 (sonda no navegador, 1440×900): o app NÃO rola sozinho — o
 * cartão da aposta nasce abaixo da dobra (y 913–1225 numa tela de 900), sob a
 * lista de doze, e o jogador rola para confirmar; a arena sai de cima. Duas
 * respostas, e as duas são cobradas aqui:
 *
 *   no largo       com lutador escolhido, o cartão fica PRESO ao pé da tela,
 *                  na coluna da lista (a ordem quem → quanto → quando, pedida
 *                  pelo dono na R33/R39, não muda)
 *   em toda tela   quando a aposta fecha e a luta começa, a arena VOLTA à
 *                  tela sozinha — para quem apostou, e só se ela estiver fora
 *
 * A decisão de voltar mora em camada 0 (`app/modules/arena-vista.mjs`). */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { deveVoltarArena, FRACAO_VISIVEL } from '../app/modules/arena-vista.mjs';
import { linhaDaConfirmacao, retornoSeVencer } from '../app/modules/confirmacao-aposta.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('arena-vista');

  s.teste('a arena volta quando a aposta fecha, para quem apostou, e só se estiver fora', () => {
    const base = { de: 'betting', para: 'countdown', apostou: true, altura: 900 };
    ok(deveVoltarArena({ ...base, arena: { top: -400, bottom: 200 } }), 'a arena rolada para cima não volta');
    /* O 420 do Q5: 61% à vista, e o K.O. na borda. */
    ok(deveVoltarArena({ ...base, altura: 860, arena: { top: 682, bottom: 974 } }), 'a arena com 61% à vista fica como está');
    ok(deveVoltarArena({ ...base, arena: { top: 1900, bottom: 2200 } }), 'a arena abaixo da dobra (o 420) não volta');
    ok(!deveVoltarArena({ ...base, arena: { top: 169, bottom: 817 } }), 'a arena inteira à vista é rolada mesmo assim');
    ok(!deveVoltarArena({ ...base, apostou: false, arena: { top: -400, bottom: 200 } }), 'quem não apostou é levado à força');
    ok(!deveVoltarArena({ ...base, de: 'fighting', para: 'result', arena: { top: -400, bottom: 200 } }), 'o resultado rola a tela');
    ok(!deveVoltarArena({ ...base, arena: { top: 0, bottom: 0 } }), 'a arena escondida (outra aba) rola a tela');
    ok(deveVoltarArena({ ...base, para: 'fighting', arena: { top: -400, bottom: 200 } }), 'a luta sem contagem não volta');
    /* A fronteira: a fração à vista. */
    const h = 600, vis = Math.round(h * FRACAO_VISIVEL);
    ok(!deveVoltarArena({ ...base, arena: { top: 900 - vis - 1, bottom: 900 - vis - 1 + h } }), 'a arena quase inteira volta');
    ok(deveVoltarArena({ ...base, arena: { top: 900 - vis + 20, bottom: 900 - vis + 20 + h } }), 'a arena mais fora que dentro fica');
  });

  s.teste('a confirmação diz quanto se recebe, e não só o multiplicador', () => {
    igual(retornoSeVencer(50, 10.82), 541, 'o retorno da confirmação difere do da rodada');
    igual(retornoSeVencer(55, 10.82), 595, 'o retorno fracionário arredonda para cima — promete o que a rodada não paga');
    const l = linhaDaConfirmacao({ cur: '💵', valor: 1000, nome: 'Tauros', odd: 10.82 });
    ok(/1\.000<\/b> em <b>Tauros<\/b> · x10\.82 · recebe <b>💵 10\.820<\/b>/.test(l), `a linha da confirmação não diz o retorno: ${l}`);
    ok(!/recebe/.test(linhaDaConfirmacao({ cur: '💵', valor: 50, nome: 'Tauros' })), 'sem odd, a linha inventa um retorno');
    ok(/linhaDaConfirmacao\(\{ cur: CUR, valor, nome: f\?\.n, odd: o\?\.odd \}\)/.test(semComentario(fonte('../app/modules/aposta.mjs'))), 'a tela não usa a linha da confirmação');
  });

  s.teste('a tela: o cartão preso no largo, e a fase chama a volta', () => {
    const css = fonte('../app/index.html'), fases = semComentario(fonte('../app/modules/fases.mjs'));
    ok(/\n\.zona\.lista:has\(#confirmaAposta:not\(\[hidden\]\)\) #cardAposta\{position:sticky;bottom:/.test(css), 'o cartão da aposta não fica preso ao pé da tela');
    ok(/:has\(#confirmaAposta:not\(\[hidden\]\)\) #betInfo\{display:none\}/.test(css), 'o cartão manda escolher um lutador já escolhido');
    ok(/deveVoltarArena\(\{ de, para: s, apostou: !!S\.myBet/.test(fases) && /scrollIntoView\(\{ block: 'center'/.test(fases), 'a fase não traz a arena de volta');
  });

  return s;
}
