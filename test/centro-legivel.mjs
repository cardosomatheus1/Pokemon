/* ST-5.12 · O CENTRO FALA ALTO (L-195, a parte que é da ação).
 *
 * O Q7 da ST-9.13 achou a ação principal da equipe — mandar para a caixa,
 * trazer para a equipe — "quase invisível": texto escuro de 9 px a 75% no
 * rodapé do cartão escuro, e com as palavras "guardar/tirar", que não dizem
 * para ONDE. E o soltar armado (irreversível) sem "cancelar": desarmava só
 * quando a tela repintava. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { vitrineDeMedalhas, TETO_DE_MEDALHAS } from '../app/modules/colecao-dados.mjs';

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

  /* ST-5.13 (L-196): o cartão de medalhas crescia sem teto — 33 ganhas eram
     ~2.000 px a 420 e diluíam a aba. */
  s.teste('ST-5.13: as medalhas têm teto, as melhores primeiro, e "ver todas" abre o resto', () => {
    const m = [...Array(33)].map((_, i) => ({ id: `g${i}`, tier: 1 + (i % 4), val: i, prox: i % 4 === 3 ? null : 10 }))
      .concat([...Array(6)].map((_, i) => ({ id: `p${i}`, tier: 0, val: i + 1, prox: 10 })));
    const v = vitrineDeMedalhas(m);
    igual(v.mostradas.length, TETO_DE_MEDALHAS + 3, 'o teto não segura as ganhas');
    igual(v.escondidas, 33 - TETO_DE_MEDALHAS, 'a conta das escondidas');
    ok(v.mostradas.slice(0, TETO_DE_MEDALHAS).every(x => x.tier === 4), 'as ganhas mostradas não são as de degrau mais alto');
    igual(v.mostradas.slice(-3).map(x => x.id).join(), 'p5,p4,p3', 'as três mais perto não são as mais adiantadas');
    const t = vitrineDeMedalhas(m, { todas: true });
    igual(`${t.mostradas.length}|${t.escondidas}`, '36|0', '"ver todas" não mostra todas');
    igual(vitrineDeMedalhas(m.slice(0, 4)).escondidas, 0, 'com poucas, "ver todas" aparece à toa');
    const tela = semComentario(fonte('../app/modules/colecao-tela.mjs'));
    ok(/vitrineDeMedalhas\(medalhas, \{ todas: verTodas \}\)/.test(tela) && /data-col-todas/.test(tela), 'a tela não usa o teto');
    const css = fonte('../app/index.html');
    ok(/#pdxColecao h3 \.tiny\{[^}]*font-family:'Segoe UI'/.test(css), 'o subtítulo continua na fonte pixel');
    ok(/\.colMissoes\{[^}]*max-width:/.test(css), 'em 1920 a missão continua a 1.600 px do botão');
    ok(/\.colMedalhas \.colTodas\{flex:none/.test(css), 'o "ver todas" estica pela faixa inteira — o `.btn{flex:1}` vem depois e ganha de um seletor só');
  });

  /* ST-5.14 (L-194): a 1920 o selo do degrau ("CAPTURADA") ficava na outra
     ponta da ficha, a ~800 px do texto — o título empurrava o selo com
     space-between pela largura inteira. */
  s.teste('ST-5.14: o selo do degrau ao lado do título da ficha, e não na outra ponta', () => {
    const css = fonte('../app/index.html');
    ok(/\.pdxArena h5\{justify-content:flex-start\}/.test(css), 'o selo do degrau segue na outra ponta da ficha');
    ok(/\.pdxArena \.pdxSoma\{[^}]*border:1px solid/.test(css), 'o selo do degrau sem forma de selo');
  });

  return s;
}
