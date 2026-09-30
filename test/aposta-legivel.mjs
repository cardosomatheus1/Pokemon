/* ST-5.10 · A TABELA E OS AVISOS DA APOSTA LEGÍVEIS (D-131, L-215).
 *
 * O Q7 da ST-5.9 (teste dos 3 segundos) achou, na fase em que o jogador
 * decide:
 *
 *   D-131   em 1100 o nome de cada lutador saía cortado numa letra — a coluna
 *           da lista tem ~340 px, e chance, odd e teto levavam tudo
 *   L-215   três textos que mandam fazer o que já foi feito: o aviso da arena
 *           ("escolha seu lutador") com o lutador escolhido, o banner
 *           ("escolha um lutador NA ARENA" — escolhe-se na lista) e as fichas
 *           de valor ligadas na contagem, com a aposta já fechada
 *
 * O teto por lutador (§4.4.6) não sai da tela: em 1001–1300 px ele desce
 * para baixo da chance e da odd, e o nome fica com a largura. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { textoDoAviso } from '../app/modules/confirmacao-aposta.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('aposta-legivel');

  s.teste('o aviso da arena diz o passo que falta, e não um que já foi dado', () => {
    igual(textoDoAviso({}), 'Escolha seu lutador na lista de odds<i>a rodada corre sozinha depois</i>', 'o aviso sem escolha mudou');
    const esc = textoDoAviso({ escolhido: { nome: 'Tauros' } });
    ok(/Confirme <b>Tauros<\/b>/.test(esc) && !/Escolha seu lutador/.test(esc), `com o lutador escolhido, o aviso manda escolher: ${esc}`);
    const ap = textoDoAviso({ apostado: { nome: 'Tauros', odd: 10.82 }, escolhido: { nome: 'Pinsir' } });
    ok(/<b>Tauros<\/b> é a sua aposta · x10\.82/.test(ap), `a aposta feita some do aviso quando se escolhe outro: ${ap}`);
    const tela = semComentario(fonte('../app/modules/aposta.mjs'));
    ok(/banner\.innerHTML = textoDoAviso\(\{\s*apostado: S\.myBet \? \{ nome: S\.fighters\[S\.myBet\.idx\]\?\.n, odd: S\.myBet\.odd \} : null,\s*escolhido: escolhido != null \? \{ nome: S\.fighters\[escolhido\]\?\.n \} : null \}\)/.test(tela), 'a arena não passa a aposta feita e a escolha ao aviso');
    ok(/function pintarConfirmacao\(\) \{\s*atualizarCTA\(\);/.test(tela), 'escolher um lutador não repinta o aviso');
  });

  s.teste('o banner diz ONDE se escolhe, e as fichas somem com a aposta fechada', () => {
    const banner = semComentario(fonte('../app/modules/banner.mjs'));
    ok(/'Escolha um lutador na lista'/.test(banner) && !/lutador na arena/.test(banner), 'o banner manda escolher na arena');
    const zona = semComentario(fonte('../app/modules/zona-acao.mjs'));
    ok(/aposta\.hidden = \['countdown', 'fighting', 'result'\]\.includes\(S\.state\)/.test(zona), 'as fichas de valor seguem ligadas na contagem');
  });

  s.teste('em 1001–1300 o teto desce para baixo dos números, e o nome fica com a largura (D-131)', () => {
    const css = fonte('../app/index.html');
    const m = css.match(/@media \(min-width:1001px\) and \(max-width:1300px\)\{([\s\S]*?)\n\}/);
    ok(m, 'não há regra para a lista entre 1001 e 1300');
    ok(/\.pick\{display:grid;grid-template-columns:34px minmax\(0,1fr\) auto auto;grid-template-areas:"img n p o" "img n lim lim"/.test(m[1]), 'a linha não vira grade de duas faixas');
    ok(/\.colunas \.c4\{display:none\}/.test(m[1]), 'o cabeçalho "aposta máx" fica sobre uma coluna que não existe mais');
    /* O teto continua na tela (§4.4.6) — só muda de lugar. */
    ok(!/\.pick \.lim\{display:none/.test(m[1]), 'o teto por lutador sumiu da tela — o §4.4.6 exige');
  });

  s.teste('ST-5.11 (L-192): todo campo numérico no tema, e não o branco do navegador', () => {
    const css = fonte('../app/index.html');
    const r = css.match(/\ninput\[type=number\]\{([^}]*)\}/);
    ok(r, 'não há regra para os campos numéricos');
    ok(/color-scheme:dark/.test(r[1]) && /background:var\(--panel2\)/.test(r[1]) && /color:var\(--txt\)/.test(r[1]), `o campo numérico continua o nativo: ${r?.[1]}`);
    ok(/\ninput\[type=number\]:focus\{[^}]*border-color:var\(--gold\)/.test(css), 'o campo numérico sem foco no tema');
  });

  return s;
}
