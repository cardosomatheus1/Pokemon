/* Q1/Q3 · O MUNDO DESENHADO (bloco 1.3a, §0.3).
 *
 * ── A DIVISÃO QUE FAZ ESTE TESTE EXISTIR ──────────────────────────────────
 *
 * Um pintor de cenário parece coisa que só se testa com navegador. Ele não é —
 * desde que a DECISÃO e o TRAÇO sejam separados:
 *
 *     plantaDo()   PURA. Diz qual tile e qual cor em cada posição.
 *     pintar()     fina. Percorre a planta e chama `fillRect`.
 *
 * Tudo que pode estar errado de verdade — bioma sem paleta, faixa de água no
 * lugar errado, cenário que muda sozinho entre duas aberturas — está na planta,
 * e a planta roda em Node em milissegundos. O que sobra para o navegador é se
 * `fillRect` desenha, e isso o Chromium garante melhor que eu.
 *
 * ── AS TRÊS AFIRMAÇÕES ────────────────────────────────────────────────────
 *
 * 1. **TODO BIOMA DOS DOIS PACKS TEM PALETA COMPLETA.** Paleta faltando não
 *    quebra nada: o bioma abre com a cor de reserva e fica parecido com outro.
 *    O jogador não vê defeito, vê um lugar sem personalidade.
 *
 * 2. **O MESMO BIOMA ABRE IGUAL TODA VEZ.** Cenário que muda entre duas
 *    aberturas destrói a noção de lugar — e lugar é o que faz escolher a rota
 *    ser uma escolha.
 *
 * 3. **A PALETA VEM DO PACK.** O pack original tem os biomas dele, e tem de
 *    renderizar com as cores dele. Cor no app seria tema no lugar errado (§0.3).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { trilhaEm, naTrilha } from '../app/modules/composicao.mjs';
import { plantaDo, CHAVES_PALETA, PALETA_RESERVA, paletaDe, COLS_PADRAO, ROWS_PADRAO } from '../app/modules/mundo.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const PACKS = [['kanto', kanto], ['original', original]];
const GRADE = { cols: 15, rows: 10 };

export function suite() {
  const s = criarSuite('mundo');

  /* --- 1 · TODO BIOMA TEM PALETA ----------------------------------------- */

  for (const [nome, pack] of PACKS) {
    s.teste(`[${nome}] todo bioma declara paleta completa`, () => {
      for (const b of pack.biomas) {
        ok(b.paleta,
          `o bioma "${b.rotulo}" não tem paleta. Ele abriria com a cor de reserva ` +
          `e ficaria parecido com outro — o jogador não veria um defeito, veria um ` +
          `lugar sem personalidade, que é pior porque ninguém reporta.`);
        for (const k of CHAVES_PALETA)
          ok(b.paleta[k],
            `a paleta de "${b.rotulo}" não tem "${k}". Cada chave é uma superfície ` +
            `da cena; faltando uma, aquela superfície some ou vira reserva.`);
      }
    });

    s.teste(`[${nome}] duas paletas nunca são a mesma`, () => {
      const vistas = new Map();
      for (const b of pack.biomas) {
        const chave = CHAVES_PALETA.map(k => b.paleta[k]).join('|');
        const antes = vistas.get(chave);
        ok(!antes,
          `"${b.rotulo}" tem exatamente a paleta de "${antes}". Dois lugares com a ` +
          `mesma cor são um lugar desenhado duas vezes — e a razão de escolher a ` +
          `rota, que já é fina, desaparece.`);
        vistas.set(chave, b.rotulo);
      }
    });
  }

  s.teste('§0.3.1 · o pack original não usa a paleta do outro', () => {
    const doOutro = new Set(kanto.biomas.map(b => CHAVES_PALETA.map(k => b.paleta[k]).join('|')));
    for (const b of original.biomas)
      ok(!doOutro.has(CHAVES_PALETA.map(k => b.paleta[k]).join('|')),
        `"${b.rotulo}" copiou a paleta inteira de um bioma do outro pack. O §0.3.1 ` +
        `exige que este pack seja jogável sozinho, e cor emprestada é empréstimo.`);
  });

  /* --- 2 · O MESMO BIOMA ABRE IGUAL -------------------------------------- */

  s.teste('a planta é determinística: o mesmo bioma abre igual', () => {
    for (const b of kanto.biomas) {
      const a = plantaDo(kanto, b.id, GRADE);
      const c = plantaDo(kanto, b.id, GRADE);
      igual(JSON.stringify(a), JSON.stringify(c),
        `"${b.rotulo}" desenhou diferente em duas chamadas. Cenário que muda entre ` +
        `duas aberturas destrói a noção de lugar — e lugar é o que faz escolher a ` +
        `rota ser uma escolha em vez de trocar a cor do fundo.`);
    }
  });

  s.teste('biomas diferentes desenham diferente', () => {
    const vistas = new Set();
    for (const b of kanto.biomas)
      vistas.add(JSON.stringify(plantaDo(kanto, b.id, GRADE)));
    igual(vistas.size, kanto.biomas.length,
      `${kanto.biomas.length} biomas produziram ${vistas.size} plantas distintas`);
  });

  /* --- a forma da planta -------------------------------------------------- */

  s.teste('a planta cobre a grade inteira, sem buraco', () => {
    const p = plantaDo(kanto, 'floresta', GRADE);
    igual(p.tiles.length, GRADE.rows, 'faltam linhas');
    for (const linha of p.tiles) {
      igual(linha.length, GRADE.cols, 'faltam colunas');
      for (const t of linha) {
        ok(t.fundo, 'um tile ficou sem cor de fundo — buraco na tela');
        ok(t.tipo, 'um tile ficou sem tipo');
      }
    }
  });

  s.teste('as faixas estão onde a planta promete', () => {
    const p = plantaDo(kanto, 'praia', GRADE);
    igual(p.tiles[p.margem].every(t => t.tipo === 'margem'), true,
      'a linha da margem tem tile que não é margem');
    for (let y = p.margem + 1; y < GRADE.rows; y++)
      igual(p.tiles[y].every(t => t.tipo === 'agua'), true,
        `a linha ${y} devia ser água inteira`);
    /* A TRILHA CURVA (1.15). A afirmação antiga era `tiles[caminho].every(
       tipo === caminho)`, e ela media a RETIDÃO da estrada — que era acidente
       da implementação, e não propriedade que alguém quisesse: era exatamente
       a régua bege de 1830 px que abriu a L-101.

       O que importa e sobrevive à curva: TODA coluna tem chão pisado, ele tem
       duas linhas de espessura, e nunca chega na água. */
    for (let lx = 0; lx < p.cols; lx++) {
      const y = trilhaEm(p.trilha, lx, p.caminho);
      igual(p.tiles[y][lx].tipo, 'caminho', `a coluna ${lx} não tem chão pisado`);
      igual(p.tiles[y + 1][lx].tipo, 'caminho', `a coluna ${lx} tem meia trilha`);
      ok(y + 1 < p.margem,
        `a trilha da coluna ${lx} encostou na água — o jogador andaria no mar`);
    }
  });

  /* A GUARDA DO CAMINHO SÓ MORDE EM GRADE PEQUENA, E ERA CÓDIGO MORTO NO TESTE.
   *
   * O portão Q2 pegou isto: o defeito `S577` — remover o `Math.min` que impede
   * o caminho de encostar na margem — PASSOU. Não porque a guarda seja inútil,
   * mas porque na grade de 15×10, a única que a aba usa, os dois lados do
   * `min` dão o mesmo número. A guarda existe, está certa, e nenhum teste a
   * exercitava onde ela decide alguma coisa.
   *
   * `plantaDo` aceita `rows` como parâmetro. Enquanto aceitar, a invariante
   * tem de valer para o que se pode passar — e não só para o que se passa hoje.
   * Testar uma faixa custa milissegundos; descobrir num bloco futuro que a
   * guarda nunca funcionou custa o bloco. */
  s.teste('o caminho nunca encosta na água, em nenhuma altura de grade', () => {
    for (let rows = 5; rows <= 14; rows++) {
      const p = plantaDo(kanto, 'praia', { cols: 15, rows });
      ok(p.caminho >= 0 && p.caminho + 1 < p.margem,
        `com ${rows} linhas o caminho ficou em ${p.caminho} e a margem em ` +
        `${p.margem}: o jogador andaria dentro do mar. A grade é PARÂMETRO — ` +
        `enquanto for, a invariante vale para o que se pode passar, e não só ` +
        `para o que se passa hoje.`);
      for (let lx = 0; lx < p.cols; lx++) {
        const y = trilhaEm(p.trilha, lx, p.caminho);
        igual(p.tiles[y][lx].tipo, 'caminho',
          `com ${rows} linhas a coluna ${lx} ficou sem chão pisado`);
        ok(y + 1 < p.margem,
          `com ${rows} linhas a trilha da coluna ${lx} encostou na água — ` +
          `a curva tem de caber DEPOIS do teto, e não só o eixo`);
      }
    }
  });

  s.teste('a água ocupa uma fatia pequena da cena', () => {
    const p = plantaDo(kanto, 'praia', GRADE);
    const molhadas = GRADE.rows - p.margem;
    ok(molhadas / GRADE.rows <= 0.3,
      `${molhadas} de ${GRADE.rows} linhas são margem ou água — ` +
      `${Math.round(molhadas/GRADE.rows*100)}% da cena. O terreno que importa é ` +
      `aquele em que o personagem anda.`);
  });

  s.teste('os detalhes ficam no chão pisável, nunca na água nem no caminho', () => {
    for (const b of kanto.biomas) {
      const p = plantaDo(kanto, b.id, GRADE);
      for (const d of p.detalhes) {
        ok(d.ly < p.margem, `um detalhe de ${b.rotulo} caiu na água`);
        ok(!naTrilha(p.trilha, d.lx, d.ly, p.caminho),
          `um detalhe de ${b.rotulo} caiu no caminho em (${d.lx},${d.ly}), ` +
          'onde o jogador anda');
        ok(d.cor, 'um detalhe ficou sem cor');
      }
      ok(p.detalhes.length > 0, `${b.rotulo} não tem detalhe nenhum — chão liso`);
    }
  });

  /* --- 3 · A PALETA VEM DO PACK ------------------------------------------ */

  s.teste('§Gen2 · o pack original desenha com as cores DELE', () => {
    for (const b of original.biomas) {
      const p = plantaDo(original, b.id, GRADE);
      const cores = new Set(p.tiles.flat().map(t => t.fundo));
      ok(cores.has(b.paleta.base) || cores.has(b.paleta.trilha) || cores.has(b.paleta.areia),
        `"${b.rotulo}" desenhou sem nenhuma cor da própria paleta`);
    }
  });

  s.teste('bioma desconhecido cai na reserva, e não lança', () => {
    const p = plantaDo(kanto, 'nao-existe', GRADE);
    ok(p.tiles.length === GRADE.rows,
      'um bioma inexistente devolveu planta quebrada. Lançar aqui derrubaria a aba ' +
      'inteira por causa de um id errado — e id errado é a coisa mais fácil de ' +
      'acontecer quando o pack troca.');
    igual(paletaDe(kanto, 'nao-existe'), PALETA_RESERVA);
    for (const k of CHAVES_PALETA) ok(PALETA_RESERVA[k], `a reserva não tem "${k}"`);
  });

  /* REANCORADO no 1.5c. Este teste cravava 15×10 — a viewport exata do
     cartucho. O mundo CRESCEU de propósito, a pedido do dono: mundo vivo com o
     boneco e o Pokémon vagando precisa de lugar para vagar, e com 10 fileiras
     (duas de água, uma de trilha) um boneco de 52 px ocupava metade da altura.
     A afirmação que importa não era o número: era que a grade é LARGA e que a
     ampliação inteira mantém o personagem do mesmo tamanho na tela. */
  s.teste('a grade é larga e cabe uma caminhada', () => {
    const p = plantaDo(kanto, 'campo', {});
    igual(p.tiles.length, ROWS_PADRAO, 'a altura padrão saiu diferente da declarada');
    igual(p.tiles[0].length, COLS_PADRAO, 'a largura padrão saiu diferente da declarada');
    ok(COLS_PADRAO / ROWS_PADRAO >= 1.4,
      `a grade ficou ${COLS_PADRAO}×${ROWS_PADRAO}, proporção ` +
      `${(COLS_PADRAO / ROWS_PADRAO).toFixed(2)}. Uma cena quase quadrada não é ` +
      'overworld: o mundo do cartucho é largo, e é a largura que dá a sensação ' +
      'de caminho.');
    ok(ROWS_PADRAO >= 12,
      `com ${ROWS_PADRAO} fileiras não há para onde vagar. Duas são água e uma é ` +
      'a trilha; o boneco ocupa três. Menos que isso, e a caminhada aleatória que ' +
      'o dono pediu vira tremor no lugar.');
  });

  return s;
}
