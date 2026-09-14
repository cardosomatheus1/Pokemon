/* Q1/Q3 · OS ÍCONES DE CABEÇA (bloco 1.6b).
 *
 * O pedido do dono trouxe a própria barra junto: *"se atente a colocar cada
 * ícone no pokémon correto a imagem segue a ordem da pokedex certinha"*.
 *
 * Ícone trocado é o defeito mais silencioso desta tela: nada quebra, a lista
 * aparece, e o jogador vê um Charmander onde apareceu um Squirtle. Ele só
 * descobre ao jogar a bola — quando já gastou.
 *
 * É por isso que o recorte é uma CONTA e não uma tabela de 151 pares: uma conta
 * ou está certa para todos ou está errada para todos, e estes testes distinguem
 * as duas coisas. Uma tabela seria 151 chances de errar uma linha, e a linha
 * errada passaria por qualquer teste que não a conferisse individualmente.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { recorte, estiloIcone, temIcone, folhaDe } from '../app/modules/icones.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

import { existsSync, readFileSync } from 'node:fs';

/* A folha e do PACK. Estas constantes existem so para o teste nao repetir a
   busca em cada caso — a fonte e uma so. */
const F = folhaDe(kanto);
const LADO = F.lado, COLUNAS = F.colunas, QUANTOS = F.quantos, FOLHA = F.arq;

export function suite() {
  const s = criarSuite('icones');

  /* ── OS CANTOS, que são onde um erro de conta aparece primeiro ───────── */

  s.teste('as quatro pontas da folha caem onde devem', () => {
    /* Bulbasaur é a primeira casa; o décimo segundo fecha a primeira linha; o
       décimo terceiro abre a segunda; e o 151 é a última casa ocupada. */
    /* Comparados como TEXTO: `igual` confere identidade, e dois objetos com os
       mesmos campos nunca são o mesmo objeto. */
    const casa = d => { const r = recorte(kanto, d); return r ? `${r.x},${r.y},${r.lado}` : null; };
    igual(casa(1), `0,0,${LADO}`, 'o dex 1 é a casa de cima à esquerda');
    igual(casa(12), `${11 * LADO},0,${LADO}`,
      'o dex 12 fecha a primeira linha — se ele descer uma linha, a folha ' +
      'inteira anda e TODOS os ícones ficam trocados a partir dali.');
    igual(casa(13), `0,${LADO},${LADO}`,
      'o dex 13 abre a segunda linha, na coluna zero');
    igual(casa(QUANTOS), `${6 * LADO},${12 * LADO},${LADO}`,
      `o dex ${QUANTOS} é o último da folha, na linha 12 coluna 6`);
  });

  s.teste('cada dex tem uma casa própria — nenhuma repetida', () => {
    const vistas = new Set();
    for (let d = 1; d <= QUANTOS; d++) {
      const r = recorte(kanto, d);
      const chave = `${r.x},${r.y}`;
      ok(!vistas.has(chave),
        `o dex ${d} caiu na mesma casa de outro (${chave}). Duas criaturas com o ` +
        'mesmo ícone é o defeito que o jogador só descobre depois de gastar a bola.');
      vistas.add(chave);
    }
    igual(vistas.size, QUANTOS);
  });

  s.teste('nenhum recorte sai da folha', () => {
    const larg = COLUNAS * LADO, alt = Math.ceil(QUANTOS / COLUNAS) * LADO;
    for (let d = 1; d <= QUANTOS; d++) {
      const r = recorte(kanto, d);
      ok(r.x >= 0 && r.x + LADO <= larg,
        `o dex ${d} recorta em x=${r.x}, fora dos ${larg}px de largura`);
      ok(r.y >= 0 && r.y + LADO <= alt,
        `o dex ${d} recorta em y=${r.y}, fora dos ${alt}px de altura. Recorte ` +
        'fora da folha desenha um quadrado transparente — um buraco silencioso.');
    }
  });

  /* ── FORA DE KANTO ──────────────────────────────────────────────────── */

  s.teste('dex fora da folha não recebe recorte de mentira', () => {
    for (const d of [0, -1, QUANTOS + 1, 999, 1.5, NaN, null, undefined, '25']) {
      ok(!temIcone(kanto, d), `temIcone(kanto, ${JSON.stringify(d)}) devia ser falso`);
      igual(recorte(kanto, d), null,
        `recorte(kanto, ${JSON.stringify(d)}) devolveu um recorte. Fora da folha ele ` +
        'desenharia um quadrado vazio, e quem chama precisa poder voltar ao ' +
        'retrato — o pack original terá as criaturas dele.');
      igual(estiloIcone(kanto, d), null, 'o estilo também tem de recusar');
    }
  });

  /* ── O ESTILO ───────────────────────────────────────────────────────── */

  s.teste('o estilo escala a folha e a posição na MESMA proporção', () => {
    /* Escalar a folha e esquecer a posição é o erro clássico deste recorte: os
       ícones aparecem, e todos mostram o vizinho errado conforme se afastam da
       primeira casa. */
    const tam = 48, k = tam / LADO;
    const e = estiloIcone(kanto, 13, tam);
    ok(e.includes(`background-position:${-0 * k}px ${-LADO * k}px`),
      `o dex 13 gerou "${e}". A posição precisa acompanhar a escala da folha; ` +
      'sem isso o desvio cresce a cada linha e só a primeira casa fica certa.');
    ok(e.includes(`width:${tam}px;height:${tam}px`), 'o elemento sai no tamanho pedido');
    ok(e.includes('no-repeat'),
      'sem `no-repeat` a folha inteira se repete atrás do recorte, e o ícone ' +
      'aparece cercado de pedaços dos vizinhos.');
  });

  s.teste('o tamanho é do chamador, e a conta acompanha', () => {
    for (const tam of [24, 32, 48, 96]) {
      const e = estiloIcone(kanto, 1, tam);
      ok(e.includes(`width:${tam}px`), `tamanho ${tam} não foi respeitado`);
      ok(e.includes(`background-size:${COLUNAS * tam}px`),
        `com lado ${tam}, a folha tem de ficar ${COLUNAS * tam}px de largura`);
    }
  });

  /* ── A FOLHA EXISTE MESMO ───────────────────────────────────────────── */

  s.teste('a folha está em disco, e com a grade que a conta assume', () => {
    const caminho = new URL('../assets/icones/trozei-kanto.png', import.meta.url);
    ok(existsSync(caminho),
      'a folha de ícones não está em `assets/icones/`. Sem ela o painel de ' +
      'encontros desenha 151 quadrados vazios — e a suíte inteira fica verde, ' +
      'porque a conta continua certa sobre uma folha que não existe.');
    const b = readFileSync(caminho);
    const larg = b.readUInt32BE(16), alt = b.readUInt32BE(20);
    igual(larg, COLUNAS * LADO,
      `a folha tem ${larg}px de largura e a conta assume ${COLUNAS * LADO}. ` +
      'Trocar a folha por uma de outra grade desalinha os 151 de uma vez.');
    ok(alt >= Math.ceil(QUANTOS / COLUNAS) * LADO,
      `a folha tem ${alt}px de altura, e os ${QUANTOS} ícones pedem ` +
      `${Math.ceil(QUANTOS / COLUNAS) * LADO}.`);
  });

  s.teste('o caminho declarado é o que está em disco', () => {
    ok(FOLHA.endsWith('assets/icones/trozei-kanto.png'),
      `o caminho declarado é "${FOLHA}", e o teste acima confere outro arquivo. ` +
      'Dois caminhos diferentes é o teste guardando uma folha e a tela pedindo ' +
      'outra — verde sobre uma tela vazia.');
  });

  return s;
}
