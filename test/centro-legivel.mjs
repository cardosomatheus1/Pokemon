/* ST-5.12 · O CENTRO FALA ALTO (L-195, a parte que é da ação).
 *
 * O Q7 da ST-9.13 achou a ação principal da equipe — mandar para a caixa,
 * trazer para a equipe — "quase invisível": texto escuro de 9 px a 75% no
 * rodapé do cartão escuro, e com as palavras "guardar/tirar", que não dizem
 * para ONDE. E o soltar armado (irreversível) sem "cancelar": desarmava só
 * quando a tela repintava. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('centro-legivel');

  s.teste('a ação da ficha diz para onde a criatura vai, e se vê', () => {
    const paineis = semComentario(fonte('../app/modules/idle-paineis.mjs'));
    ok(/<span class="idleAcao">\$\{guardado \? '→ equipe' : '→ caixa'\}<\/span>/.test(paineis), 'a ação da ficha não diz o destino');
    const css = fonte('../app/index.html');
    const r = css.match(/\n\.idleAcao\{([^}]*)\}/)?.[1] ?? '';
    ok(!/opacity:\s*\.\d/.test(r) && /border:1px solid/.test(r) && /font-size:10px/.test(r), `a ação da ficha continua sussurrando: ${r}`);
    /* A cor tem de existir: `--ac` não é definida em lugar nenhum, e a ação
       saía na cor herdada — escura — com qualquer tamanho. */
    const cor = r.match(/color:var\(--([\w-]+)\)/)?.[1];
    ok(cor && new RegExp(`--${cor}:`).test(css), `a ação da ficha usa uma cor que não existe: --${cor}`);
  });

  s.teste('o soltar armado tem "cancelar" à vista, e cancelar desarma', () => {
    const t = semComentario(fonte('../app/modules/doce-tela.mjs'));
    ok(/b\.insertAdjacentHTML\('afterend', `<button class="idleSoltarCancelar" data-soltar-cancelar="\$\{b\.dataset\.soltar\}">cancelar<\/button>`\)/.test(t), 'armar não põe o cancelar');
    ok(/closest\('\[data-soltar-cancelar\]'\)[\s\S]*?armado = '0'[\s\S]*?\.remove\(\)/.test(t), 'o cancelar não desarma o soltar');
    ok(/\.idleSoltarCancelar\{/.test(fonte('../app/index.html')), 'o cancelar sem estilo');
  });

  return s;
}
