/* Q1/Q2/Q5 · O MINI LOG DENTRO DA ARENA (R27)
 *
 * ── O PEDIDO, E A RESTRIÇÃO QUE ELE TRAZ ───────────────────────────────────
 *
 * O dono viu um "minibattlelog" numa maquete e pediu o nosso — com uma
 * condição explícita: **"que não interfira na visualização do combate. No
 * centro da tela atrapalha um pouco."**
 *
 * Isso transforma o bloco. Não basta mostrar as últimas linhas: elas precisam
 * caber num lugar que a luta não usa, e continuar cabendo em toda largura.
 *
 * ── O QUE JÁ EXISTIA E NÃO SERVE ───────────────────────────────────────────
 *
 * O `#ticker` (R2) mostra o log inteiro, rola sozinho e cresce ao clicar. Ele
 * fica FORA da arena, embaixo dela — quem está olhando a luta não o alcança sem
 * tirar o olho do combate. O mini log é outro papel: as últimas linhas, dentro
 * do quadro, para não precisar desviar o olhar.
 *
 * Os dois convivem, e a divisão é: o ticker é o HISTÓRICO, o mini log é o
 * AGORA.
 *
 * ── POR QUE A LISTA É PURA ─────────────────────────────────────────────────
 *
 * "Quais linhas aparecem, em que ordem, quantas cabem" é decisão, e decisão se
 * testa. Dentro do desenho ela só poderia ser conferida olhando — que é como o
 * XP por abate e a ordem das pokébolas se perderam sem ninguém notar.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { MINI_MAX, linhasDoMini, ehDeCombate } from '../app/modules/mini-log.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const linha = (html, cls = '') => ({ html, cls });

export function suite() {
  const s = criarSuite('mini-log');

  /* ── O QUE ENTRA ───────────────────────────────────────────────────────*/

  /* O mini log é da LUTA. Linha de sistema — "aguardando", "as pokébolas
     começam a abrir", diagnóstico de sprite — é do ticker, não daqui: ela
     ocuparia uma das poucas vagas para dizer algo que não é combate. */
  s.teste('linha de sistema não entra no mini log', () => {
    ok(!ehDeCombate(linha('&gt; aguardando…', 'l-sys')),
      'uma linha de sistema entrou no mini log — ela gasta uma das poucas vagas ' +
      'para dizer algo que não é a luta');
    ok(!ehDeCombate(linha('diagnóstico de sprites: 48 folhas', 'l-sys')),
      'diagnóstico técnico entrou no mini log');
  });

  s.teste('ataque, crítico e nocaute entram', () => {
    for (const cls of ['', 'l-crit', 'l-ko', 'l-sup', 'l-weak'])
      ok(ehDeCombate(linha('Charizard atacou', cls)),
        `a linha de classe "${cls}" ficou de fora — ela é combate`);
  });

  /* ── QUANTAS, E QUAIS ──────────────────────────────────────────────────*/

  /* O TETO É O PONTO DO BLOCO. Um log sem teto dentro da arena vira o log
     inteiro dentro da arena, e aí ele cobre a luta — que é exatamente o que o
     dono pediu para não acontecer. */
  s.teste('nunca passa do teto, por mais que aconteça', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => linha(`golpe ${i}`, ''));
    igual(linhasDoMini(muitas).length, MINI_MAX,
      `com 40 eventos o mini log mostrou ${linhasDoMini(muitas).length} linhas. ` +
      `Sem teto ele cresce até cobrir a luta.`);
    ok(MINI_MAX <= 4,
      `o teto é ${MINI_MAX} linhas. Acima de 4 ele deixa de ser "mini" e passa a ` +
      `disputar espaço com o combate.`);
  });

  /* AS ÚLTIMAS, e não as primeiras. Um mini log que mostra o começo da luta é
     um mini log que ninguém precisa: o que importa é o que acabou de acontecer. */
  s.teste('mostra as ÚLTIMAS linhas, na ordem em que aconteceram', () => {
    const dez = Array.from({ length: 10 }, (_, i) => linha(`e${i}`, ''));
    const fora = linhasDoMini(dez);
    igual(fora[fora.length - 1].html, 'e9',
      'a última linha do mini log não é o evento mais recente');
    igual(fora[0].html, `e${10 - MINI_MAX}`,
      `o mini log começou em "${fora[0].html}" — ele não está mostrando as últimas`);
    /* A ORDEM É CRONOLÓGICA. Invertida, o olho lê o desfecho antes da causa. */
    const posicoes = fora.map(l => +l.html.slice(1));
    ok(posicoes.every((n, i) => i === 0 || n > posicoes[i - 1]),
      `as linhas saíram fora de ordem: [${posicoes}]`);
  });

  s.teste('com menos eventos que o teto, mostra os que há', () => {
    igual(linhasDoMini([linha('a'), linha('b')]).length, 2, 'inventou linha');
    igual(linhasDoMini([]).length, 0, 'lista vazia virou outra coisa');
  });

  s.teste('as de sistema não ocupam vaga', () => {
    const mix = [linha('sis', 'l-sys'), linha('a'), linha('b'), linha('c'), linha('d')];
    const fora = linhasDoMini(mix);
    ok(!fora.some(l => l.html === 'sis'), 'a linha de sistema entrou mesmo assim');
    igual(fora.length, Math.min(MINI_MAX, 4),
      'as linhas de combate não preencheram as vagas que a de sistema liberou');
  });

  /* ── E ELE PRECISA CABER NA ARENA SEM COBRIR A LUTA ────────────────────*/

  s.teste('o mini log existe no HTML, dentro da arena', () => {
    ok(/id="miniLog"/.test(APP), 'não há `#miniLog` no HTML');
    /* DENTRO do `#arena`: fora dele, ele volta a ser o ticker. O recorte vai do
       início do `#arena` até o fim dele. */
    const arena = APP.slice(APP.indexOf('<div id="arena">'));
    const fim = arena.indexOf('<!-- só aparece durante a luta -->');
    ok(arena.slice(0, fim > 0 ? fim : 4000).includes('id="miniLog"'),
      'o `#miniLog` está fora do `#arena` — dentro do quadro é o que evita ' +
      'desviar o olhar da luta');
  });

  s.teste('o mini log tem CSS, e ele o tira do caminho do combate', () => {
    const r = (APP.match(/^#miniLog\{[^}]*\}/m) || [''])[0];
    ok(r, '`#miniLog` não tem regra de CSS — seria o D-028 outra vez');
    ok(/pointer-events:\s*none/.test(r),
      'o mini log captura clique. Ele fica por cima da arena: sem ' +
      '`pointer-events:none`, engole o clique de quem quer selecionar um lutador.');
    /* NA BORDA, E NÃO NO CENTRO. Foi o pedido literal do dono. */
    ok(/bottom:\s*0|bottom:\s*\d/.test(r),
      'o mini log não está ancorado na borda inferior — no centro ele atrapalha ' +
      'a visualização do combate, que foi o que o dono pediu para evitar');
    ok(!/top:\s*(4[0-9]|5[0-9])%/.test(r), 'o mini log foi para o meio da arena');
  });

  /* A RODADA NOVA NÃO HERDA A ANTERIOR. Sem limpar, o mini log fica exibindo
     os últimos golpes da luta passada por cima da arena que está sendo montada
     — e ele só se sobrescreve quando a luta NOVA começa, o que é depois de toda
     a fase de aposta. A sabotagem S424 explorava exatamente essa janela. */
  s.teste('a rodada nova limpa o mini log', () => {
    const fases = readFileSync(
      new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    const novaRodada = fases.slice(fases.indexOf('async function newRound'),
                                   fases.indexOf('function setPhase') > fases.indexOf('async function newRound')
                                     ? fases.indexOf('function setPhase') : fases.length);
    const bloco = novaRodada.slice(0, 3000);
    ok(/limparMini\s*\(/.test(bloco),
      '`newRound` não limpa o mini log. Ele fica com os golpes da rodada ' +
      'ANTERIOR sobre a arena nova durante toda a fase de aposta, e só se ' +
      'sobrescreve quando a luta começa.');
  });

  /* A MEDIDA É A ARENA, E NÃO A JANELA. `cqw` só resolve se `#arena` declarar
     `container-type` — sem isso ele cai para o viewport, e a arena é 3:4 com
     teto próprio: ela nunca ocupa a largura da janela. O texto sairia
     dimensionado contra um número que não é o dele. */
  s.teste('a arena é contêiner de consulta, senão o `cqw` mede a janela', () => {
    const r = (APP.match(/^#arena\{[^}]*\}/m) || [''])[0];
    ok(/container-type:\s*inline-size/.test(r),
      '`#arena` deixou de ser contêiner de consulta. Todo `cqw` da arena passa ' +
      'a medir a JANELA — e a arena tem proporção 3:4 e teto próprio, então ela ' +
      'nunca ocupa a largura da janela. O aviso de nocaute e o mini log ficam ' +
      'dimensionados contra um número que não é o deles.');
    ok(/cqw/.test(APP), 'nada mais usa `cqw` — o contêiner ficou sem propósito');
  });

  /* Ele divide a arena com o aviso de nocaute (bottom:16%) e com os emblemas
     (top:8px). Cobrir qualquer um dos dois troca uma informação por outra. */
  s.teste('o mini log fica abaixo do aviso de nocaute na pilha', () => {
    const mini = +((APP.match(/^#miniLog\{[^}]*z-index:\s*(\d+)/m) || [])[1] ?? 99);
    const ko = +((APP.match(/^#koToast\{[^}]*z-index:\s*(\d+)/m) || [])[1] ?? 0);
    ok(mini < ko,
      `o mini log está em z-index ${mini} e o aviso de nocaute em ${ko}. ` +
      `O aviso é sobre o SEU lutador e não pode ficar atrás do log.`);
  });

  return s;
}
