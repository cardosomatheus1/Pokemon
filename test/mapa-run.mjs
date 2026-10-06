/* O MAPA DA RUN (ST-2.33b, o 7º relato): *"no mapa da run, os nomes ficam por
 * cima dos sprites, e só o líder anda, sem os outros dois membros do time"*.
 *
 * As duas decisões são geometria e moram em camada 0: onde cada placa cabe
 * sem cobrir um bicho que não é o dela (`separarPontos`, agora com os sprites
 * como obstáculo), e onde cada seguidor pisa (`posicoesDoRastro`, o caminho
 * que o líder já fez). A tela só aplica.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { separarPontos } from '../app/modules/avanco-geometria.mjs';
import { registrarNoRastro, posicoesDoRastro, PASSO_DO_SEGUIDOR, SEGUIDORES_MAX } from '../app/modules/seguidores.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const L = 68, A = 33;
const cobre = (p, o) => Math.max(0, Math.min(p.x + L / 2, o.x + o.w) - Math.max(p.x - L / 2, o.x)) *
                        Math.max(0, Math.min(p.y + A, o.y + o.h) - Math.max(p.y, o.y));

export function suite() {
  const s = criarSuite('mapa-run');

  s.teste('a placa que cairia sobre o bicho de baixo sobe para cima da cabeça do próprio dono', () => {
    /* o Charmander em cima, o selvagem logo abaixo: a placa do pé do Charmander caía no selvagem */
    const spr = [{ chave: 'meu', x: 70, y: 100, w: 40, h: 40 }, { chave: 'm1', x: 70, y: 150, w: 40, h: 40 }];
    const pontos = [{ chave: 'meu', x: 90, y: 143, topo: 100 }, { chave: 'm1', x: 90, y: 193, topo: 150 }];
    const r = separarPontos(pontos, { largura: L, altura: A, obstaculos: spr });
    const meu = r.find(p => p.chave === 'meu');
    igual(cobre(meu, spr[1]), 0, `a placa do Charmander ainda cobre o selvagem (y=${meu.y})`);
    igual(meu.y, 100 - A, 'a placa não foi para cima da cabeça do dono');
    for (const p of r) for (const o of spr) if (o.chave !== p.chave)
      igual(cobre(p, o), 0, `a placa de ${p.chave} cobre o sprite de ${o.chave}`);
  });

  s.teste('sem obstáculo, a placa fica no pé — e sem `topo` o comportamento antigo não muda', () => {
    const r = separarPontos([{ chave: 'a', x: 0, y: 50, topo: 10 }], { largura: L, altura: A, obstaculos: [] });
    igual(r[0].y, 50, 'sem nada embaixo, a placa saiu do pé');
    const velho = separarPontos([{ chave: 'a', x: 0, y: 50 }, { chave: 'b', x: 10, y: 60 }], { largura: L, altura: A });
    igual(velho.find(p => p.chave === 'b').y, 50 + A, 'a separação antiga entre placas mudou');
  });

  s.teste('os seguidores pisam no caminho do líder, um passo atrás do outro', () => {
    let r = [];
    for (let x = 0; x <= 100; x += 5) r = registrarNoRastro(r, { x, y: 40, dir: 'dir' });
    const [a, b] = posicoesDoRastro(r, 2);
    igual(Math.round(a.x), 100 - PASSO_DO_SEGUIDOR); igual(Math.round(b.x), 100 - 2 * PASSO_DO_SEGUIDOR);
    igual(a.y, 40); igual(a.dir, 'dir', 'o seguidor não olha para onde anda');
    ok(a.distancia > b.distancia, 'a pata do seguidor não anda com o chão');
  });

  s.teste('rastro curto: o seguidor espera no começo dele, e um salto (troca de bioma) zera o rastro', () => {
    let r = registrarNoRastro([], { x: 0, y: 0, dir: 'baixo' });
    r = registrarNoRastro(r, { x: 5, y: 0, dir: 'dir' });
    const [a] = posicoesDoRastro(r, 1);
    igual(JSON.stringify([a.x, a.y]), JSON.stringify([0, 0]));
    r = registrarNoRastro(r, { x: 900, y: 900, dir: 'baixo' });
    igual(r.length, 1, 'o salto emendou o rastro — o seguidor atravessaria o mapa');
    igual(posicoesDoRastro([], 2).length, 0);
  });

  s.teste('o rastro não cresce sem fim numa aba aberta por horas', () => {
    let r = [];
    for (let i = 0; i < 5000; i++) r = registrarNoRastro(r, { x: (i % 2) * 6, y: i * 3, dir: 'baixo' });
    ok(r.length < 200, `o rastro guardou ${r.length} pontos`);
    ok(r.at(-1).d - r[0].d >= SEGUIDORES_MAX * PASSO_DO_SEGUIDOR, 'o rastro cortou o pedaço que os seguidores usam');
  });

  s.teste('a run manda o time inteiro para o mapa, e o mapa desenha cada seguidor com a sua moldura', () => {
    ok(/acompanhar\(acharCriatura\(E, runDe\(E\)\.equipe\[0\]\)\?\.dex \?\? null, runDe\(E\)\.equipe\.slice\(1\)/.test(fonte('../app/modules/avanco-tela.mjs')),
      'a run ainda manda só o líder');
    const mundo = fonte('../app/modules/idle-mundo.mjs');
    ok(/posicoesDoRastro\(rastro, seguidores\.length\)/.test(mundo), 'o mapa não calcula onde os seguidores pisam');
    ok(/desenharCompanheiro\(g, \{ \.\.\.pos, dex: seguidores\[k\] \}, alvo, eu\.dir, escala, sombra, `comp\$\{k \+ 2\}`\)/.test(mundo),
      'o mapa não desenha os seguidores');
    ok(/export function desenharCompanheiro\(g, p, cam, dirTreinador, escala, sombra, chave = 'comp'\)/.test(fonte('../app/modules/idle-companheiro.mjs')),
      'o desenhista do companheiro só conhece uma moldura');
    ok(/obstaculos/.test(fonte('../app/modules/avanco-hud.mjs')), 'a separação das placas não recebe os sprites');
  });

  return s;
}
