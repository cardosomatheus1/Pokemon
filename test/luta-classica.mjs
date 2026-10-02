/* Q1/Q3 · A LUTA NO PALCO CLÁSSICO (ST-10.27 · L-245)
 *
 * O dono, com a captura de uma luta de FireRed contra a Elite Four: "e as
 * batalhas lá, imagino algo mais próximo disso, mas com gráficos melhores".
 *
 * O que a referência faz bem, e fica: o rival DE FRENTE em cima à direita, o
 * nosso DE COSTAS embaixo à esquerda, cada lado na sua plataforma; as placas
 * de HP que se leem num olhar; a caixa de texto que narra um acontecimento
 * por vez. O que é nosso: a caixa narra o PORQUÊ (o tipo que bateu forte, a
 * imunidade, quem foi mais rápido) — a referência narra o golpe; e o ritmo
 * avança sozinho, com "pular".
 *
 * A diferença do motor, dita: a nossa luta é de TIMES (3 contra 3 na
 * jornada, até 6 no Time), todos em campo ao mesmo tempo. O arranjo põe até
 * três na fileira da frente e o resto atrás, menor.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { arranjoClassico, narrar, RITMO_CLASSICO } from '../app/modules/luta-classica.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const lado = (l, n) => Array.from({ length: n }, (_, i) => ({ slot: `${l}${i}`, dex: 1 + i, nome: `n${i}`, nivel: 5, maxHp: 20 }));
const L = { lados: { A: [{ slot: 'A0', dex: 7, nome: 'Squirtle' }, { slot: 'A1', dex: 25, nome: 'Pikachu' }],
                     B: [{ slot: 'B0', dex: 74, nome: 'Geodude' }, { slot: 'B1', dex: 16, nome: 'Pidgey' }] } };
const passo = o => ({ n: 3, turno: 2, de: 'A0', para: 'B0', golpe: 'Body Slam', dano: 5, eff: 1, crit: false, errou: false, caiu: false, ...o });

export function suite() {
  const s = criarSuite('luta-classica');

  s.teste('o arranjo: o rival de frente em cima à direita, o nosso de costas embaixo à esquerda', () => {
    for (let n = 1; n <= 6; n++) {
      const a = arranjoClassico({ A: lado('A', n), B: lado('B', n) });
      igual(a.A.length, n, `${n}: faltou alguém do nosso lado`);
      igual(a.B.length, n, `${n}: faltou alguém do rival`);
      for (const f of a.B) {
        ok(f.x >= 50 && f.y <= 60, `${n}: o rival ${f.slot} fora do alto à direita (${f.x}, ${f.y})`);
        igual(f.costas, false, `${n}: o rival de costas`);
      }
      for (const f of a.A) {
        ok(f.x <= 50 && f.y >= 75, `${n}: o nosso ${f.slot} fora de baixo à esquerda (${f.x}, ${f.y})`);
        igual(f.costas, true, `${n}: o nosso de frente — no clássico ele está de costas`);
      }
      for (const lista of [a.A, a.B]) {
        igual(Math.max(...lista.map(f => f.escala)), lista[0].escala, `${n}: o líder (slot 0) não é o maior do lado`);
        for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++)
          ok(Math.hypot(lista[i].x - lista[j].x, lista[i].y - lista[j].y) >= 8, `${n}: ${lista[i].slot} e ${lista[j].slot} um em cima do outro`);
        for (const f of lista) ok(Number.isInteger(f.z), `${n}: ${f.slot} sem ordem de profundidade`);
      }
      ok(a.A.every(f => f.escala > a.B[0].escala * 0.99) || n > 3, `${n}: o nosso da frente menor que o rival — perde a perspectiva`);
      igual(a.modo, n <= 3 ? 'palco' : 'faixa', `${n}: as placas no lugar errado`);
      /* Q7 da ST-10.27: "a ordem das placas não bate com a dos sprites" — a
         placa de cima/esquerda é a do sprite mais à esquerda. */
      for (const l of ['A', 'B']) {
        const xs = a.ordem[l].map(slot => a[l].find(f => f.slot === slot).x);
        ok(xs.every((x, i) => i === 0 || x >= xs[i - 1]), `${n}: as placas do lado ${l} fora da ordem dos sprites (${a.ordem[l].join(',')})`);
        igual(a.ordem[l].length, n, `${n}: faltou placa no lado ${l}`);
      }
      /* "o nosso cortado ao meio pela borda" (Q7): os pés podem encostar na
         borda, o corpo não. */
      for (const f of a.A) ok(f.y <= 98, `${n}: ${f.slot} com os pés em ${f.y}% — cortado pela borda de baixo`);
      /* Seis grandes não cabem embaixo à esquerda (Q5, o Time de seis): com
         mais de três por lado, todo mundo encolhe. */
      if (n > 3) ok(a.A[0].escala <= 1.1, `${n}: seis do nosso lado no tamanho de três — um em cima do outro`);
      /* No celular (Q5 da ST-10.27): seis placas dentro de um palco de 320 px
         cobriam o rival — no estreito, elas saem sempre para a faixa. */
      igual(arranjoClassico({ A: lado('A', n), B: lado('B', n) }, { estreito: true }).modo, 'faixa', `${n}: no estreito, as placas ficam no palco`);
    }
  });

  s.teste('a caixa narra o porquê: super efetivo, resistência, imunidade — com os tipos do pack', () => {
    const agua = narrar(PACK, passo({ golpe: 'Surf', eff: 2 }), L);
    ok(/super efetivo/i.test(agua) && /Água/.test(agua) && /Pedra|Terrestre/.test(agua), `o super efetivo sem o porquê: ${agua}`);
    ok(/^Squirtle usou Surf/.test(agua), `a frase não começa por quem usou o quê: ${agua}`);
    const pouco = narrar(PACK, passo({ de: 'B1', para: 'A0', golpe: 'Flamethrower', eff: 0.5 }), L);
    ok(/não é muito efetivo/i.test(pouco) && /Água resiste a Fogo/.test(pouco), `a resistência sem o porquê: ${pouco}`);
    const imune = narrar(PACK, passo({ de: 'A1', para: 'B0', golpe: 'Thunderbolt', eff: 0, dano: 0 }), L);
    ok(/não afeta Geodude/.test(imune) && /imune/.test(imune) && /Terrestre/.test(imune) && /Elétrico/.test(imune), `a imunidade sem o porquê: ${imune}`);
  });

  s.teste('a caixa narra o resto: erro, crítico, queda, e quem foi mais rápido no primeiro golpe', () => {
    ok(/errou/.test(narrar(PACK, passo({ errou: true, dano: 0 }), L)), 'o erro não é dito');
    ok(/crítico/i.test(narrar(PACK, passo({ crit: true }), L)), 'o crítico não é dito');
    ok(/Geodude caiu/.test(narrar(PACK, passo({ caiu: true }), L)), 'a queda não é dita');
    ok(/mais rápido/.test(narrar(PACK, passo({ n: 0, turno: 1 }), L)), 'o primeiro golpe não diz quem foi mais rápido');
    ok(!/mais rápido/.test(narrar(PACK, passo({ n: 3, turno: 2 }), L)), 'a velocidade é repetida a cada golpe');
    ok(RITMO_CLASSICO > 1 && RITMO_CLASSICO <= 1.6, 'o ritmo não dá tempo de ler a caixa — ou arrasta a luta');
  });

  s.teste('a arte: as costas são do MESMO cartucho das frentes (FireRed/LeafGreen), baixadas com elas', () => {
    const sp = fonte('app/modules/sprites.mjs');
    ok(/firered-leafgreen\/back\//.test(sp) && /export const dexURLGbaCostas/.test(sp), 'o módulo de sprites não tem as costas de GBA');
    ok(/firered-leafgreen\/back\/\$\{esp\.dex\}\.png/.test(fonte('tools/baixar-assets.mjs')), 'o baixador não traz as costas');
    const base = new URL('../assets/raw_githubusercontent_com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen/', import.meta.url);
    for (const e of PACK.especies.slice(0, 151)) {
      ok(readFileSync(new URL(`back/${e.dex}.png`, base)).length > 0, `as costas do ${e.n} não estão em assets/`);
    }
  });

  s.teste('a tela pinta o que a camada 0 decidiu: arranjo, narração, ritmo, costas e a caixa', () => {
    const t = fonte('app/modules/pve-tela.mjs');
    ok(/arranjoClassico\(/.test(t) && /narrar\(PACK, passo/.test(t), 'a tela não usa o arranjo ou a narração');
    ok(/RITMO_CLASSICO/.test(t), 'a tela não usa o ritmo do clássico');
    ok(/dexURLGbaCostas/.test(t) && /dexURLGba\(/.test(t), 'a tela não usa a arte de GBA (frente e costas)');
    ok(/class="pveLog lcCaixa"/.test(t), 'a caixa de texto não existe');
    ok(/lcPlataforma/.test(t), 'sem plataforma: os dois lados flutuam');
    ok(/arranjoClassico\(L\.lados, \{ estreito: /.test(t), 'a tela não diz à camada 0 que está no estreito');
    const css = fonte('app/index.html');
    ok(/\.lcCaixa\{/.test(css) && /\.lcPlataforma\{/.test(css) && /image-rendering:pixelated/.test(css), 'o estilo do palco clássico não existe');
    ok(/\.lcClassico \.pveFrente\{display:none\}/.test(css), 'a peça da frente do cenário cobre o nosso time (Q5)');
    ok(/arr\.ordem\[lado\]/.test(t), 'a tela não pinta as placas na ordem dos sprites');
    ok(/\.lcClassico>\.lcFaixaA\{order:3\}\.lcClassico>\.lcCaixa\{order:4\}/.test(css), 'a ordem do cartucho: o palco, as nossas placas, e a caixa embaixo');
    ok(/\.lcClassico>\.lcCaixa\{position:sticky;bottom:calc\(84px/.test(css), 'no celular a caixa cai atrás da barra de baixo (medido em 390×844)');
    ok(/\.lcClassico \.pveLutador\.vez \.pveSombra/.test(css), 'quem age não tem marca no chão: nada liga a placa ao sprite (Q7)');
    /* `:first-of-type` conta o TIPO do elemento, e o primeiro div é o topo: as duas faixas iam parar em cima do palco (Q5). */
    ok(/\.lcClassico>\.lcFaixaB\{order:1\}/.test(css) && /\.lcClassico>\.lcFaixaA\{order:/.test(css) && !/lcFaixa:(first|last)-of-type/.test(css), 'a ordem das faixas não é pela classe');
    ok(/\.lcClassico \.pvePalco\{[^}]*max-height:/.test(css), 'o palco sem teto de altura: em 1920 ele passava de 1.100 px');
  });

  return s;
}
