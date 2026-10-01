/* Q1/Q3 · O CENÁRIO DA LUTA (ST-2.17)
 *
 * O dono, olhando a luta da jornada: "a tela das batalhas tá só 2 cores, sem
 * detalhe nenhum, tá bem feia". Era um degradê azul em cima de um verde liso,
 * o mesmo para a Rota 1 e para o vulcão de Cinnabar.
 *
 * A decisão do cenário mora em `app/modules/pve-cenario.mjs` (camada 0): cada
 * região do mapa tem céu, colinas, o chão dela (a textura do mapa), a
 * plataforma sob os lutadores, peças no horizonte, uma peça NA FRENTE (a
 * profundidade que separa cenário de colagem) e a partícula do lugar. A tela
 * só pinta o que ela devolve.
 */
import { existsSync, readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { REGIOES } from '../app/modules/jornada-dados.mjs';
import { CENARIOS, cenarioDaLuta, PARTICULAS, COM_NUVENS } from '../app/modules/pve-cenario.mjs';

const existe = rel => existsSync(new URL('../app/' + rel, import.meta.url));   // relativo ao app/index.html
const COR = /^#[0-9a-f]{6}$/i;

export function suite() {
  const s = criarSuite('pve-cenario');

  s.teste('toda região do mapa tem cenário, e todo nó da jornada cai num', () => {
    for (const r of REGIOES) ok(CENARIOS[r], `a região ${r} não tem cenário`);
    for (const n of PACK.jornada) ok(CENARIOS[n.regiao], `o nó ${n.id} (${n.regiao}) cai sem cenário`);
    igual(cenarioDaLuta('lugar-que-nao-existe', 1).regiao, 'campo', 'a região desconhecida não caiu no campo');
  });

  s.teste('cada cenário tem céu, colinas, chão, plataforma, horizonte, frente e partícula — e a arte existe', () => {
    for (const r of REGIOES) {
      const c = cenarioDaLuta(r, 7);
      ok(c.ceu.length === 2 && c.ceu.every(x => COR.test(x)), `${r}: o céu`);
      ok(c.colinas.length === 2 && c.colinas.every(x => COR.test(x.cor) && x.pontos.length >= 6), `${r}: as colinas`);
      ok(existe(c.chao), `${r}: o chão ${c.chao} não existe`);
      ok(existe(c.piso), `${r}: a plataforma ${c.piso} não existe`);
      ok(c.fundo.length >= 9, `${r}: o horizonte tem menos de nove peças — o palco largo fica vazio`);
      igual(c.nuvens.length > 0, COM_NUVENS.includes(r), `${r}: nuvem onde não devia, ou céu aberto sem nuvem`);
      ok(c.frente.length >= 1, `${r}: nada na frente — o cenário vira colagem`);
      for (const p of [...c.fundo, ...c.frente]) ok(existe(p.arte), `${r}: a peça ${p.arte} não existe`);
      ok(PARTICULAS[c.particula.tipo], `${r}: a partícula ${c.particula.tipo} sem desenho`);
      ok(c.particula.lista.length >= 8, `${r}: poucas partículas`);
    }
    /* o chão da luta não é a copa: na floresta e no bosque o tile do mapa é a
       copa vista de cima, e os lutadores pisavam nas árvores (Q5) */
    for (const r of ['floresta', 'bosque']) ok(!/chao\/(floresta|bosque)\.svg/.test(cenarioDaLuta(r, 1).chao), `${r}: os lutadores pisam na copa`);
    /* e os cenários são DIFERENTES: o vulcão não é o campo de outra cor */
    const assinatura = r => { const c = cenarioDaLuta(r, 7); return `${c.ceu}|${c.chao}|${c.fundo.map(p => p.arte)}`; };
    igual(new Set(REGIOES.map(assinatura)).size, REGIOES.length, 'duas regiões com o mesmo cenário');
  });

  s.teste('as peças não cobrem os lutadores', () => {
    for (const r of REGIOES) for (const sem of [1, 2, 3, 99]) {
      const c = cenarioDaLuta(r, sem);
      /* o horizonte fica no pé da faixa do céu (0–100, 100 = a linha); a
         frente, no pé do palco entre as duas colunas (o jogador à esquerda,
         os rivais à direita descendo até o pé) */
      for (const p of c.fundo) ok(p.y >= 98 && p.y <= 106 && p.h >= 30 && p.h <= 60, `${r}: peça do horizonte fora da faixa (${JSON.stringify(p)})`);
      ok(c.fundo.filter(p => p.longe).every(p => p.h < Math.min(...c.fundo.filter(q => !q.longe).map(q => q.h))), `${r}: a fileira de trás não é menor que a da frente`);
      for (const p of c.frente) ok(p.x >= 30 && p.x <= 50 && p.y >= 100 && p.h <= 42, `${r}: peça da frente fora do vão entre as colunas, ou inteira (${JSON.stringify(p)})`);
      for (const k of c.colinas) ok(k.pontos.every(([x, y]) => x >= 0 && x <= 100 && y >= 40 && y <= 100), `${r}: colina fora da faixa`);
    }
  });

  s.teste('a mesma luta, o mesmo cenário; outra luta, outro arranjo', () => {
    igual(JSON.stringify(cenarioDaLuta('floresta', 5)), JSON.stringify(cenarioDaLuta('floresta', 5)), 'o cenário não é determinístico');
    ok(JSON.stringify(cenarioDaLuta('floresta', 5).fundo) !== JSON.stringify(cenarioDaLuta('floresta', 6).fundo), 'a semente não muda o arranjo');
  });

  s.teste('a tela pinta o cenário, e o movimento obedece o "menos movimento"', () => {
    const tela = readFileSync(new URL('../app/modules/pve-tela.mjs', import.meta.url), 'utf8');
    ok(/cenarioDaLuta\(/.test(tela) && /pveCena/.test(tela), 'a luta não pinta o cenário');
    const jn = readFileSync(new URL('../app/modules/jornada-tela.mjs', import.meta.url), 'utf8');
    ok(/cenario: PACK\.jornada\.find\(n => n\.id === id\)\?\.regiao/.test(jn), 'a jornada não passa a região do nó');
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    ok(/prefers-reduced-motion[^{]*\{[^}]*\.pveParticula/.test(html), 'as partículas não param com "menos movimento"');
  });

  return s;
}
