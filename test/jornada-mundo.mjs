/* ST-10.22c4 · A ESTRUTURA DO MAPA — o minimapa do celular e o rio.
 *
 * O Q7 da c3 disse que o que segura a nota é estrutura, e não acabamento: no
 * celular a janela mostra 5 de 18 nós, sem começo nem fim; o mundo é colcha
 * de manchas sem nada que as ligue. As duas decisões moram em camada 0
 * (`app/modules/jornada-mundo.mjs`) e são cobradas aqui, em Node. */
import { readFileSync, existsSync } from 'node:fs';
import { REGIOES } from '../app/modules/jornada-dados.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { mapaDaJornada, cruzaOCaminho } from '../app/modules/jornada-dados.mjs';
import { miniMapa, rioDoMapa } from '../app/modules/jornada-mundo.mjs';

const fonte = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

export function suite() {
  const s = criarSuite('jornada-mundo');

  s.teste('o minimapa: o caminho INTEIRO, do começo ao fim, com você nele', () => {
    const m = mapaDaJornada(pack, { vencidos: ['rota1', 'floresta', 'rota22'] }, { emPe: true });
    const mini = miniMapa(m);
    igual(mini.pontos.length, m.nos.length, 'o minimapa perde nó');
    igual(`${mini.pontos[0].t}|${mini.pontos.at(-1).t}`, '0|100', 'o minimapa não vai de ponta a ponta');
    ok(mini.pontos.every((p, i) => i === 0 || p.t > mini.pontos[i - 1].t), 'o minimapa fora de ordem');
    const atual = mini.pontos.find(p => p.estado === 'atual');
    igual(atual?.id, m.atual, 'o minimapa não sabe onde você está');
    igual(mini.andado, atual.t, 'o trecho andado do minimapa não chega em você');
    ok(mini.pontos.at(-1).final && !mini.pontos[0].final, 'o fim do minimapa não é o Campeão');
    igual(mini.pontos.filter(p => p.estado === 'vencido').length, 3, 'o minimapa conta os vencidos errado');
    /* Caminho vencido de ponta a ponta: não há atual, e o andado é tudo. */
    const tudo = mapaDaJornada(pack, { vencidos: m.nos.map(n => n.id) }, { emPe: true });
    igual(miniMapa(tudo).andado, 100, 'o caminho inteiro vencido não enche o minimapa');
  });

  s.teste('o rio: nasce na borda, cruza a estrada UMA vez entre as duas cidades, e deságua antes da volta de baixo', () => {
    const m = mapaDaJornada(pack, { vencidos: [] });
    const rios = rioDoMapa(m);
    igual(rios.length, 1, 'o pack declara um rio');
    const r = rios[0], [a, b] = r.entre.map(id => m.nos.find(n => n.id === id));
    ok(a && b && m.nos.indexOf(b) === m.nos.indexOf(a) + 1, 'o rio não fica entre dois nós seguidos');
    igual(r.pontos[0].y, 0, 'o rio não nasce na borda de cima');
    /* Cruza o trecho a→b, e nenhum outro trecho da estrada. Em unidades do
       mapa: a caixa é o ponto do rio, e a estrada é cada trecho. */
    const trechos = m.nos.slice(1).map((n, i) => [m.nos[i], n]);
    const cruza = ([p, q]) => r.pontos.some((pt, k) => k > 0 && seCruzam(r.pontos[k - 1], pt, p, q));
    igual(trechos.filter(cruza).map(([p]) => p.id).join(), a.id, 'o rio cruza a estrada no lugar errado, ou mais de uma vez');
    const baixo = Math.min(...m.nos.filter(n => n.y > 50).map(n => n.y));
    ok(r.foz.y < baixo - 8, 'o rio desce até a volta de baixo');
    ok(r.foz.y > (a.y + b.y) / 2 + 8, 'o rio acaba em cima da estrada — não deságua em lugar nenhum');
    /* Pack sem rio, mapa sem rio. */
    igual(rioDoMapa({ nos: m.nos.map(n => ({ ...n, rio: false })) }).length, 0, 'um rio que o pack não declarou');
    /* A cruzaOCaminho serve ao rio como serve à estrada — a tela a usa para as duas. */
    ok(cruzaOCaminho({ left: r.foz.x - 1, right: r.foz.x + 1, top: r.foz.y - 1, bottom: r.foz.y + 1 }, r.pontos, 0), 'a foz fora do próprio rio');
  });

  s.teste('a tela: o minimapa só no celular, o rio sob a estrada, a cena longe dele, e 1920 menos esticado', () => {
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), css = fonte('../app/index.html');
    ok(/miniMapa\(mapa\)/.test(tela) && /class="jnMini"/.test(tela), 'a tela não pinta o minimapa');
    ok(/\.jnMini\{display:none\}/.test(css) && /@media \(max-width:520px\)[\s\S]*?\.jnMini\{display:flex/.test(css), 'o minimapa não é só do celular');
    ok(/marcarJanela\(alvo\)/.test(tela) && /naJanela/.test(tela), 'o minimapa não mostra o trecho que a janela vê');
    /* O rio vem ANTES da estrada no SVG: a estrada passa por cima, como ponte.
       ST-10.24: com o desenho a estrada é chão (canvas), e o SVG só a traz no
       pack sem desenho — a ordem continua a mesma. */
    ok(/rioSvg\(false\)\}\$\{estradaSvg\(false\)\}/.test(tela) && /rioSvg\(true\)\}\$\{estradaSvg\(true\)\}/.test(tela), 'o rio por cima da estrada');
    ok(/const estradaSvg = empe => \(desenho \? '' : trilha\(empe\)\);/.test(tela), 'com o desenho, a estrada voltou a ser traço SVG por cima do chão');
    ok(/cruzaOCaminho\(r, rio\)/.test(tela) && /\|\| noRio\(r\)\)\)/.test(tela), 'a cena cai dentro do rio');
    ok(/@media \(min-width:1500px\)[\s\S]*?\.jnMapa\.jnVoltas2\{height:clamp\(/.test(css), 'em 1920 o mapa continua uma faixa de 4:1');
    /* A regra do largo vem DEPOIS da altura fixa: antes dela, a fixa ganhava e
       1920 não mudava nada (medido na primeira captura desta story). */
    ok(css.indexOf('@media (min-width:1500px){ .jnMapa.jnVoltas2{height:clamp(') > css.indexOf('.jnMapa.jnVoltas2{height:470px}'), 'a altura do largo vem antes da fixa — e perde para ela');
  });

  /* ST-10.22d (L-214): o chão em TILES, arte nossa — em quatro rodadas o
     crítico descreveu o mesmo defeito: cada região uma ilha de pontinhos em
     gradiente sobre um tapete liso. Tile 16 × 16 por material (em 2×). Na
     ST-10.22e o tile deixou a região e foi para a grade (`jornada-chao`); a
     grama do fundo do mapa fica como reserva, se o canvas não pintar. */
  s.teste('ST-10.22d: o chão em tiles nossos, e a grama por baixo de reserva', () => {
    const css = fonte('../app/index.html');
    for (const m of ['grama', 'agua', ...REGIOES]) ok(existsSync(new URL(`../arte/chao/${m}.svg`, import.meta.url)), `o tile ${m} não existe`);
    ok(/\.jnMapa\{[^}]*url\(\.\.\/arte\/chao\/grama\.svg\)/.test(css), 'o mapa sem a grama em tile');
    ok(!/\.jnRegiao|\.jnR-[a-z]+[ {:]/.test(css), 'o CSS das manchas de região continua no arquivo');
  });

  s.teste('ST-10.22d: a ponte onde o rio cruza a estrada, a bandeira do início e o fim em ouro', () => {
    const m = mapaDaJornada(pack, { vencidos: [] });
    const r = rioDoMapa(m)[0], [a, b] = r.entre.map(id => m.nos.find(n => n.id === id));
    /* A ponte fica NA estrada: no segmento a→b, a meio caminho. */
    ok(Math.abs(r.ponte.x - (a.x + b.x) / 2) < 0.2 && Math.abs(r.ponte.y - (a.y + b.y) / 2) < 0.2, `a ponte fora da estrada: ${JSON.stringify(r.ponte)}`);
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), css = fonte('../app/index.html');
    ok(/class="jnPos jnPonte" style="--x:\$\{r\.ponte\.x\};--y:\$\{r\.ponte\.y\}"/.test(tela) && /\.jnPonte b\{/.test(css), 'a estrada cruza o rio sem ponte');
    ok(/i === 0 \? ' jnInicio' : ''/.test(tela) && /\.jnInicio \.jnNo::before\{[^}]*bandeira\.svg/.test(css), 'o início sem marco');
    ok(existsSync(new URL('../arte/mapa/bandeira.svg', import.meta.url)), 'a bandeira sem arte');
    ok(/\.jnFinal \.jnNo\.jn-liga\.jn-trancado i\{[^}]*#ffe27a/.test(css), 'o losango do Campeão igual ao da Elite');
  });

  /* ST-10.22f (L-216): o lendário do futuro é holograma, e o painel acompanha o mapa. */
  s.teste('ST-10.22f: o holograma do lendário e o painel na largura do mapa', () => {
    const css = fonte('../app/index.html');
    /* ST-10.25: o nó trancado é só o ponto no chão — nem silhueta preta ("mancha
       de tinta") nem holograma ("sprite que não carregou"): quem espera ali, o
       rival e o lendário, aparece quando o caminho abre. */
    ok(/\.jnPos\.jn-trancado \.jnOw\{display:none\}/.test(css) && /\.jnPos\.jn-trancado \.jnLend\{display:none\}/.test(css), 'o nó trancado volta a mostrar quem espera nele (fantasma ou mancha)');
    /* O painel acompanha o mapa em 1920 (sobravam ~600 px vazios ao lado); a leitura segue com teto. */
    ok(!/\.jnPainel\{[^}]*max-width/.test(css) && /\.jnInfo\{[^}]*max-width:820px/.test(css), 'o painel para em 1240 px e deixa o vazio ao lado do mapa');
  });

  return s;
}

/* Dois segmentos se cruzam (orientação). */
function seCruzam(p1, p2, p3, p4) {
  const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2);
}
