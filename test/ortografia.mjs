/* Q1/Q2 · A ORTOGRAFIA DO TEMA CHEGA AO MENU E AOS TÍTULOS (R14)
 *
 * ── O PEDIDO, E O QUE A MEDIÇÃO DISSE ──────────────────────────────────────
 *
 * "Mantenha o estilo ortográfico do site, voltado pro nosso tema
 *  neon/cyberpunk — 'início', 'como funciona' e os conteúdos dentro delas."
 *
 * A primeira suspeita era fonte errada. **Medida no navegador, ela estava
 * certa**, e vale registrar para ninguém refazer a investigação:
 *
 *     document.fonts.check('700 16px Orbitron')          true
 *     document.fonts.check('16px "Press Start 2P"')      true
 *     .nav .hero h1 .card h3 .feat h4                    Orbitron
 *     body, .hero p                                      Segoe UI
 *
 * A família já é a do tema, e o corpo de texto em Segoe UI está CERTO: texto
 * longo em fonte de pixel não se lê, e trocá-lo seria piorar em nome do tema.
 *
 * O que faltava é o BRILHO. A identidade do projeto é neon — a faixa, o
 * letrado, o saldo e o relógio todos brilham —, e o menu e os títulos das
 * páginas de conteúdo eram os únicos textos apagados da casa. Mesma fonte,
 * mesmo tamanho, sem halo: liam como interface genérica dentro de um site que
 * não é genérico.
 *
 * ── A REGRA QUE ESTE ARQUIVO GUARDA ────────────────────────────────────────
 *
 * O brilho sai de TOKEN, nunca de cor fixa. São duas variantes de tema
 * (`Hyper Core` ciano e `Shadow Arena` roxo/rosa), e um `#00e5ff` escrito à mão
 * ficaria ciano na variante roxa — o defeito `S68`, que já custou uma volta ao
 * projeto, entrando de novo pela porta do brilho.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';
import { TEMAS } from '../app/modules/tema.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/* TODAS as regras de um seletor, e não a primeira.
 *
 * O arquivo declara cada elemento DUAS vezes: a base, lá em cima, e a camada do
 * tema, mais abaixo, que é onde a cor e o brilho moram. Um helper que parasse
 * na primeira ocorrência responderia sempre pela base e diria que nada brilha —
 * inclusive de `.rule h4`, que brilha desde sempre.
 *
 * `[{,]` no fim para `.nav` não casar com `.navbar`. */
const regras = sel => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const achadas = [];
  for (const m of APP.matchAll(new RegExp(`^${esc}[{,]`, 'gm'))) {
    const i = m.index;
    achadas.push(APP.slice(i, APP.indexOf('}', i) + 1));
  }
  return achadas;
};
const regra = sel => regras(sel).join('\n') || null;

/* Os textos de chrome que precisam carregar o tema. Corpo de texto NÃO entra:
   `.hero p`, `.feat p` e `.rule p` são para ler, e halo em parágrafo cansa. */
const CHROME = [
  ['.nav',      'os itens do menu'],
  ['.feat h4',  'os títulos dos cartões do Início'],
  ['.rule h4',  'os títulos das regras'],
];

export function suite() {
  const s = criarSuite('ortografia');

  s.teste('o menu e os títulos de conteúdo brilham como o resto da casa', () => {
    for (const [sel, oque] of CHROME) {
      const r = regra(sel);
      ok(r, `a regra de \`${sel}\` sumiu do CSS`);
      ok(/text-shadow/.test(r),
        `${oque} não têm o brilho do tema: ${r}`);
    }
  });

  /* A ASSERÇÃO QUE IMPORTA. Duas variantes de tema, e um valor fixo ficaria
     ciano na roxa. É o `S68` voltando pela porta do brilho. */
  s.teste('o brilho sai de token do tema, e nunca de cor fixa', () => {
    for (const [sel, oque] of CHROME) {
      const r = regra(sel);
      const sombras = [...r.matchAll(/text-shadow:([^;}]*)/g)].map(m => m[1]);
      ok(sombras.length, `${oque} perderam o brilho`);
      for (const sh of sombras) {
        ok(/var\(--/.test(sh),
          `${oque} brilham com cor fixa: "${sh.trim()}" — na variante ${TEMAS[1].nm} ` +
          `ela continuaria ${TEMAS[0].nm}`);
        ok(!/#[0-9a-f]{3,8}\b/i.test(sh),
          `${oque} têm cor literal no brilho: "${sh.trim()}"`);
      }
    }
  });

  /* O corpo de texto FICA legível. Este teste existe porque a tentação de
     "aplicar o tema em tudo" é real, e um parágrafo em fonte de pixel com halo
     é ilegível — o R6 já mediu que 6px de fonte de pixel não se lê. */
  s.teste('o corpo de texto continua sem halo e em fonte de leitura', () => {
    for (const sel of ['.hero p', '.feat p']) {
      const r = regra(sel);
      if (!r) continue;
      ok(!/text-shadow/.test(r),
        `\`${sel}\` ganhou brilho — parágrafo com halo cansa antes da segunda linha: ${r}`);
      ok(!/var\(--px\)/.test(r),
        `\`${sel}\` foi para a fonte de pixel: texto longo assim não se lê`);
    }
  });

  /* MEDIDO, e fica registrado para não se reinvestigar: as duas fontes do tema
     carregam da cópia local. Se o `<link>` perder o `assets/`, a página cai no
     Segoe UI inteira e o tema some sem nada quebrar. */
  s.teste('as duas fontes do tema vêm da cópia local', () => {
    ok(/href="\.\.\/assets\/fonts_googleapis_com\/css2\.css"/.test(APP),
      'a folha de fontes deixou de apontar para a cópia local — offline o tema some');
    ok(/Press\+Start\+2P/.test(APP) && /Orbitron/.test(APP),
      'o resgate de fonte perdeu uma das duas famílias do tema');
  });

  /* ── E A FOLHA PRECISA SER SERVÍVEL COMO FOLHA (D-037) ─────────────────
   *
   * O teste acima existia e passava. O `href` estava certo, o arquivo existia,
   * os `.ttf` existiam, os caminhos relativos resolviam — e a fonte NÃO
   * carregava, porque a folha era servida sem extensão e saía como
   * `application/octet-stream`. O navegador recusa folha de estilo com MIME que
   * não seja CSS, e o tema inteiro caía para o fallback.
   *
   * Nada disso é visível lendo o HTML. Por isso este teste olha o NOME do
   * arquivo — a única pista, no estático, de que o servidor conseguirá
   * classificá-lo — e o par dele, que mede a face carregada de verdade, mora no
   * portão visual, onde há navegador.
   *
   * A lição, e ela já apareceu três vezes com outro nome: o teste cobrava a
   * PALAVRA (o endereço) e não a CONSTRUÇÃO (o carregamento). */
  s.teste('a folha de fontes tem extensão que um servidor saiba classificar', () => {
    const href = (APP.match(/href="([^"]*fonts_googleapis_com[^"]*)"/) || [])[1] || '';
    ok(/\.css$/.test(href),
      `a folha de fontes é servida de "${href}", que não termina em \`.css\`.\n` +
      `Servidor estático resolve MIME por extensão: sem ela a folha sai como ` +
      `\`application/octet-stream\`, o navegador a RECUSA, e as duas fontes do ` +
      `tema somem sem nada quebrar e sem nada avisar (D-037).`);
  });

  /* Os dois servidores estáticos do projeto precisam saber servir fonte. O de
     testes é o que grava a linha de base: um mapa incompleto ali significa
     linha de base fotografada com o tema caído — que foi o que aconteceu. */
  s.teste('os servidores estáticos sabem servir CSS e fonte', () => {
    for (const arq of ['tools/jogar.mjs', 'test/visual.mjs']) {
      const fonte = readFileSync(new URL('../' + arq, import.meta.url), 'utf8');
      const mapa = fonte.slice(fonte.indexOf('MIME'), fonte.indexOf('MIME') + 900);
      ok(/'\.css'\s*:/.test(mapa), `${arq} não sabe servir \`.css\``);
      ok(/'\.ttf'\s*:/.test(mapa),
        `${arq} não sabe servir \`.ttf\` — os arquivos de fonte do tema são TTF`);
    }
  });

  return s;
}
