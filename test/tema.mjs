/* Q1/Q3 · IDENTIDADE VISUAL — a promessa que os tokens fazem.
 *
 * A promessa é essa, e é o bloco inteiro: **trocar de tema muda o site inteiro
 * sem tocar em uma linha de lógica de jogo.** Ela só se cumpre enquanto toda
 * cor sair de token. Um hex solto no meio de uma regra não muda com o tema, e
 * o efeito não é o site quebrar — é uma peça ficar amarela num tema ciano, e
 * ninguém notar até alguém abrir o outro tema.
 *
 * Por isso o teste central aqui é uma VARREDURA, não uma asserção sobre uma
 * cor: o que se afirma é que não existe cor de acento solta no CSS.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { semTexto } from './modulos.mjs';
import { TEMAS, temaValido } from '../app/modules/tema.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const CSS = APP.split('<style>')[1].split('</style>')[0];
const ARTE = new URL('../arte/', import.meta.url);

/* Os tokens que toda variante precisa definir. Faltando um, aquele tema herda
   o valor do outro sem avisar — e herdar silenciosamente é o modo de falha
   difícil de ver. */
const TOKENS = ['--bg','--bg2','--panel','--panel2','--solid','--line','--txt','--dim',
                '--gold','--goldRGB','--onAccent','--neon2','--neon2RGB','--green','--red','--scan'];

const blocoDe = seletor => {
  const i = CSS.indexOf(seletor);
  return i < 0 ? null : CSS.slice(i, CSS.indexOf('}', i));
};

export function suite() {
  const s = criarSuite('tema');

  s.teste('as duas variantes existem e definem os mesmos tokens', () => {
    igual(TEMAS.map(t => t.id).join(','), 'hyper,shadow', 'a lista de temas mudou');
    const base = blocoDe(':root,');
    ok(base, 'o bloco de tokens padrão sumiu do CSS');
    for (const t of TOKENS)
      ok(base.includes(t + ':'), `o tema padrão não define ${t}`);

    const shadow = blocoDe('html[data-tema="shadow"]');
    ok(shadow, 'a variante shadow sumiu do CSS');
    for (const t of TOKENS)
      ok(shadow.includes(t + ':'),
        `a variante shadow não define ${t} — ela herdaria o valor do outro tema em silêncio`);
  });

  /* A VARREDURA, com UMA exceção declarada — e a exceção é a parte interessante.
   *
   * A pele da plataforma sai de token: ela É o tema, e precisa virar junto.
   * Os COSMÉTICOS não. "Neon", "Glitch", "Grade Synth" são efeitos que o
   * jogador escolhe pelo nome, e a cor específica é a identidade deles — um
   * efeito Neon que muda de cor com o tema deixa de ser o efeito que a pessoa
   * escolheu. Por isso `.cn-*`, `.ef-*` e `.sc-*` podem ter cor própria.
   *
   * A exceção é por SELETOR e não por arquivo, de propósito: assim ela cobre
   * exatamente os cosméticos, e uma cor solta numa regra de plataforma continua
   * reprovando mesmo estando no meio do bloco de pele. */
  s.teste('nenhuma cor de acento solta fora dos cosméticos', () => {
    const ACENTOS = ['#f5c542', '245,197,66', '#00e5ff', '0,229,255', '#b57bff', '181,123,255'];
    const COSMETICO = /^\s*(@keyframes\s+(ef|cn|sc)[A-Z]|[.#][\w-]*[\s,>]*)?[.](cn|ef|sc)-/;
    const linhas = CSS.split('\n');
    const ruins = [];
    let dentroDeCosmetico = false;
    linhas.forEach((l, i) => {
      if (COSMETICO.test(l) || /^\s*@keyframes\s+(ef|cn|sc)/.test(l)) dentroDeCosmetico = true;
      else if (/^[.#@:a-zA-Z\[]/.test(l) && !/^\s/.test(l)) dentroDeCosmetico = false;
      if (dentroDeCosmetico) return;
      /* a própria definição de um token é o único outro lugar legítimo */
      if (/--[\w-]+\s*:/.test(l)) return;
      for (const a of ACENTOS) if (l.includes(a)) ruins.push(`linha ${i + 1}: ${l.trim().slice(0, 70)}`);
    });
    ok(ruins.length === 0,
      `${ruins.length} cor(es) de acento soltas fora de cosmético:\n      ` +
      ruins.slice(0, 5).join('\n      ') +
      `\n      Cor solta não muda com o tema: fica amarela no tema ciano e ninguém nota ` +
      `até abrir o outro tema. Cor nova entra como token.`);
  });

  /* O outro lado da mesma regra: os tokens derivados precisam DERIVAR, e não
     repetir o valor do acento em cru. `--line` e `--scan` são o acento em
     opacidade baixa; escritos com o número solto, mudar o acento deixaria os
     dois para trás. */
  s.teste('os tokens derivados saem do acento, não de uma cópia dele', () => {
    for (const seletor of [':root,', 'html[data-tema="shadow"]']) {
      const b = blocoDe(seletor);
      for (const tok of ['--line', '--scan']) {
        const linha = b.split('\n').find(l => l.includes(tok + ':'));
        ok(linha && linha.includes('var(--goldRGB)'),
          `em ${seletor} o token ${tok} não deriva de --goldRGB: "${(linha||'').trim()}"`);
      }
    }
  });

  s.teste('o tema é aplicado ANTES da primeira pintura', () => {
    const cabeca = APP.slice(0, APP.indexOf('</head>'));
    ok(/data-tema/.test(cabeca) && /localStorage/.test(cabeca),
      'não há script de tema no <head>. Aplicar o tema depois faz a página piscar ' +
      'no tema errado por um quadro — e um quadro é o suficiente para parecer defeito.');
    const iScript = APP.indexOf('ar_tema');
    const iStyle = APP.indexOf('<style>');
    ok(iScript > 0 && iScript < iStyle,
      'o script de tema vem depois do <style> — tarde demais para evitar o piscar');
    ok(/<html[^>]*data-tema=/.test(APP),
      'o <html> não nasce com um tema; sem isso a primeira pintura não tem tokens');
  });

  s.teste('tema desconhecido cai no padrão em vez de deixar o site sem cor', () => {
    for (const lixo of ['', null, undefined, 'arco-iris', 42, {}])
      igual(temaValido(lixo), 'hyper', `${String(lixo)} não caiu no tema padrão`);
    for (const t of TEMAS) igual(temaValido(t.id), t.id, `${t.id} foi rejeitado`);
  });

  s.teste('a troca de tema não toca em lógica de jogo', () => {
    /* Comentários mascarados: o cabeçalho de `tema.mjs` explica a regra citando
       "arena, HUD, killfeed e carteira", e varredura crua acusaria a
       explicação. Mesma lição do F0.10. */
    const tema = semTexto(readFileSync(new URL('../app/modules/tema.mjs', import.meta.url), 'utf8'));
    for (const proibido of ['motor.mjs', 'estado.mjs', 'carteira', 'preco', 'simular', 'aposta'])
      ok(!tema.includes(proibido),
        `tema.mjs toca em ${proibido}. Trocar a pele não pode mexer no jogo — ` +
        `é a promessa inteira do bloco.`);
  });

  /* --------------------------------------------------- a arte é nossa */

  s.teste('a arte referenciada pelo CSS existe em arte/', () => {
    const usadas = [...new Set([...CSS.matchAll(/\.\.\/arte\/([\w-]+\.(?:jpg|png|webp))/g)].map(m => m[1]))];
    ok(usadas.length > 0, 'o CSS não referencia nenhuma arte de arte/');
    for (const a of usadas)
      ok(existsSync(new URL(a, ARTE).pathname),
        `o CSS usa ../arte/${a} e o arquivo não está no repositório`);
  });

  s.teste('nenhuma arte nossa foi buscada de fora', () => {
    /* `arte/` é nossa e entra no git; `assets/` é de terceiros e é baixada.
       Referenciar a nossa por URL externa seria inventar uma dependência que
       não existe — e foi quase o que aconteceu no porte. */
    for (const nome of readdirSync(ARTE).filter(f => /\.(jpg|png|webp)$/.test(f)))
      ok(!new RegExp(`https?://[^"')]*${nome}`).test(APP),
        `${nome} é arte NOSSA e está sendo buscada de um endereço externo`);
  });

  s.teste('as duas famílias tipográficas têm reserva declarada', () => {
    const base = blocoDe(':root,');
    for (const [tok, familia] of [['--px', 'Press Start 2P'], ['--dsp', 'Orbitron']]) {
      const linha = base.split('\n').find(l => l.includes(tok + ':'));
      ok(linha && linha.includes(familia), `o token ${tok} não declara ${familia}`);
      ok(/,\s*['"a-zA-Z]/.test(linha.split(':')[1]),
        `${tok} não tem fonte de reserva — se a web font não carregar, o texto some de forma`);
    }
  });

  return s;
}
