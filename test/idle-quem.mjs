/* Q1/Q3 · QUEM ESTÁ ONDE (bloco 1.6b, camada 0).
 *
 * Esta suíte existe porque a mesma pergunta errou QUATRO VEZES, e todas as
 * quatro o dono do projeto pegou olhando — nenhuma foi pega por teste:
 *
 *   1. "eu mandei um vulpix pra expedição e quem me acompanha é um squirtle"
 *   2. "ele manda o primeiro Pokémon base"
 *   3. "nem fica setado qual Pokémon você está usando, onde ele está"
 *   4. "quando acabou eu mandei outro pokémon do time [...] e não atualizou"
 *
 * As quatro tinham causas DIFERENTES — a seleção que limpa, a reserva que
 * mente, a aba que abre longe, e a expedição pronta que não sai de campo. O que
 * elas tinham em comum era morar dentro do DOM, onde nenhuma afirmação
 * alcançava: os defeitos plantados `S642` e `S643` passaram pelo Q2 inteiro, e
 * a `L-091` registra por quê.
 *
 * Extraída, a regra vira quatro casos e microssegundos. É a mesma história do
 * `viewport.mjs` e do `bandeiras.mjs`, e a lição que se repete é uma:
 * **comportamento que só o navegador enxerga é comportamento sem guarda.**
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { quemMostrar, quemFarmaEm, expedicaoEm, biomaDeAbertura, podemIr } from '../app/modules/idle-quem.mjs';

const BICHOS = [
  { id: 'a', dex: 1 },      // o inicial, sempre o primeiro da caixa
  { id: 'b', dex: 37 },     // o vulpix do relato
  { id: 'c', dex: 129 },
];
const exp = (bioma, ids, iniciadaEm) => ({ bioma, equipe: ids, iniciadaEm });

export function suite() {
  const s = criarSuite('idle-quem');

  /* ── 1 · QUEM ANDA COM VOCÊ É QUEM FOI A CAMPO ──────────────────────── */

  s.teste('a cena mostra quem foi mandado, e não o primeiro da caixa', () => {
    const quem = quemMostrar({
      emCampo: [exp('gelo', ['b'], 10)], criaturas: BICHOS,
      bioma: 'gelo', selecao: [],
    });
    igual(quem?.dex, 37,
      `foi mandado o vulpix (37) e a cena mostraria ${quem?.dex}. É o relato do ` +
      'dono, literal: "eu mandei um vulpix pra expedição e quem me acompanha é ' +
      'um squirtle". A tela lia a SELEÇÃO do seletor, que limpa ao mandar, e ' +
      'caía no primeiro da caixa — que é sempre o inicial.');
  });

  s.teste('a seleção do seletor NÃO vence quem está em campo', () => {
    const quem = quemMostrar({
      emCampo: [exp('gelo', ['b'], 10)], criaturas: BICHOS,
      bioma: 'gelo', selecao: ['a'],
    });
    igual(quem?.dex, 37,
      'a seleção do seletor venceu a expedição. Seleção é INTENÇÃO; expedição é ' +
      'FATO, e a cena mostra fatos.');
  });

  /* ── 2 · BIOMA VAZIO NÃO INVENTA COMPANHEIRO ────────────────────────── */

  s.teste('bioma sem ninguém em campo mostra A SELEÇÃO, ao vivo', () => {
    const quem = quemMostrar({
      emCampo: [exp('gelo', ['b'], 10)], criaturas: BICHOS,
      bioma: 'floresta', selecao: ['a'],
    });
    igual(quem?.dex, 1,
      'a floresta está vazia e o jogador tem o dex 1 selecionado; a cena devia ' +
      `mostrá-lo e mostrou ${quem?.dex}. Pedido do dono: "ao clicar no pokémon ` +
      'do time [...] já é possível ver sua sprite no bioma [...] a troca precisa ' +
      'agir de forma simultânea". Um bioma sem ninguém é o bioma para onde ele ' +
      'está PRESTES a mandar — mostrar a escolha dele não inventa fato nenhum.');
  });

  s.teste('sem seleção nenhuma, o treinador anda sozinho', () => {
    igual(quemMostrar({ emCampo: [], criaturas: BICHOS, bioma: 'floresta', selecao: ['c'] })?.dex, 129,
      'a seleção é a prévia do que VAI acontecer, e ela não afirma nada falso.');
    igual(quemMostrar({ emCampo: [], criaturas: BICHOS, bioma: 'x', selecao: [] }), null,
      'sem seleção, cair no primeiro da caixa seria a tela INVENTANDO um bicho — ' +
      'nem fato nem intenção. Foi o defeito original, e ele continua proibido.');
  });

  /* ── 3 · A MAIS RECENTE VENCE ───────────────────────────────────────── */

  s.teste('expedição nova no mesmo bioma troca quem aparece', () => {
    /* O caso do dono: uma terminou (pronta, NÃO colhida — segue em campo) e ele
       mandou outra no mesmo lugar. `find` devolvia a primeira, e a cena seguia
       desenhando o bicho da antiga. */
    const antiga = exp('gelo', ['a'], 100);
    const nova = exp('gelo', ['b'], 500);
    igual(expedicaoEm([antiga, nova], 'gelo'), nova, 'a mais recente é a nova');
    igual(expedicaoEm([nova, antiga], 'gelo'), nova,
      'a ordem da lista não pode decidir — expedição pronta e não colhida ' +
      'continua em campo, e ela costuma estar antes na lista.');
    igual(quemMostrar({ emCampo: [antiga, nova], criaturas: BICHOS, bioma: 'gelo', selecao: [] })?.dex, 37,
      'a cena seguiu com o bicho da expedição antiga. Regra do dono: "a mudança ' +
      'da sprite do pokémon em um campo de bioma precisa ser atualizada a toda ' +
      'nova expedição".');
  });

  s.teste('sem carimbo de início, a escolha não quebra', () => {
    const a = { bioma: 'gelo', equipe: ['a'] }, b = { bioma: 'gelo', equipe: ['b'] };
    ok(expedicaoEm([a, b], 'gelo'),
      'expedição sem `iniciadaEm` — de estado salvo antes deste campo existir — ' +
      'não pode devolver nulo e apagar o companheiro da cena.');
  });

  /* ── 4 · A ABA ABRE ONDE A AÇÃO ESTÁ ───────────────────────────────── */

  const BIOMAS = [{ id: 'floresta' }, { id: 'praia' }, { id: 'gelo' }];

  s.teste('a aba abre no bioma da expedição, e não no primeiro da lista', () => {
    igual(biomaDeAbertura([exp('gelo', ['b'], 10)], BIOMAS), 'gelo',
      'a aba abriria na floresta com o bicho farmando no gelo. Foi o relato do ' +
      'dono: "nem fica setado qual Pokémon você está usando, onde ele está" — ' +
      'e sem ninguém no bioma aberto, a busca cai no primeiro da caixa, que é ' +
      'como os quatro defeitos se encadeavam num só sintoma.');
  });

  s.teste('com várias em campo, abre na mais recente', () => {
    igual(biomaDeAbertura([exp('praia', ['a'], 10), exp('gelo', ['b'], 90)], BIOMAS), 'gelo',
      'com as quatro expedições da L-082, abrir na mais antiga seria abrir na ' +
      'que está para terminar em vez da que ele acabou de mandar.');
  });

  s.teste('sem expedição alguma, abre no primeiro bioma', () => {
    igual(biomaDeAbertura([], BIOMAS), 'floresta');
    igual(biomaDeAbertura(null, BIOMAS), 'floresta', 'lista ausente não pode lançar');
    igual(biomaDeAbertura([], []), null, 'pack sem biomas devolve nulo, e não estoura');
  });

  /* ── 5 · A LISTA, PORQUE AS QUATRO EXPEDIÇÕES VÊM AÍ ────────────────── */

  s.teste('quemFarmaEm devolve TODOS os daquele bioma', () => {
    const l = quemFarmaEm({ emCampo: [exp('gelo', ['a', 'c'], 10)], criaturas: BICHOS, bioma: 'gelo' });
    igual(l.length, 2,
      'a expedição levou dois e a resposta trouxe outro número. A L-082 põe até ' +
      'quatro no mesmo lugar, e quem chama já lida com lista desde hoje — assim ' +
      'o dia de ligar aquilo não mexe aqui.');
    igual(l.map(c => c.dex).join(','), '1,129');
  });

  s.teste('id de criatura que não existe mais não vira buraco', () => {
    const l = quemFarmaEm({ emCampo: [exp('gelo', ['a', 'sumiu'], 10)], criaturas: BICHOS, bioma: 'gelo' });
    igual(l.length, 1,
      'id órfão na equipe da expedição devolveu entrada vazia. Estado salvo ' +
      'sobrevive a versões; a cena não pode desenhar `undefined.dex`.');
  });

  /* ── 6 · QUEM PODE IR ───────────────────────────────────────────────── */

  s.teste('quem está na caixa não é oferecido para a expedição', () => {
    const l = podemIr([{ id: 'a', dex: 1 }, { id: 'b', dex: 37, naCaixa: true },
                       { id: 'c', dex: 129 }]);
    igual(l.length, 2,
      `o seletor ofereceu ${l.length} de 3, com uma guardada. O jogador escolhe ` +
      'a guardada, clica em mandar, e só aí ouve "estão na caixa — tire-as ' +
      'antes". O dono leu essa recusa como uma regra que não existe: "dizia ' +
      'que só podia o inicial".');
    ok(!l.some(c => c.naCaixa), 'uma guardada passou pelo filtro');
  });

  s.teste('lista vazia ou ausente não estoura', () => {
    igual(podemIr([]).length, 0);
    igual(podemIr(null).length, 0, 'estado a meio carregar chega assim');
    igual(podemIr([null, undefined, { id: 'a' }]).length, 1,
      'buraco na lista de estado salvo não pode virar ');
  });

  return s;
}
