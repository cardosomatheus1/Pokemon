/* A EVOLUÇÃO NO IDLE — bloco 1.21, a L-114.
 *
 * ── O QUE ESTA SUÍTE GUARDA ──────────────────────────────────────────────
 *
 * O motor da evolução existia há blocos e NINGUÉM O CHAMAVA. Não havia defeito
 * para dar — só ausência:
 *
 *     o motor lê `inst.especie` · o save guarda `dex`
 *
 * Duas metades certas que nunca se encontraram não produzem erro. Produzem
 * silêncio, que é mais difícil de achar do que um vermelho.
 *
 * Então a primeira afirmação daqui é a mais importante: **a ponte existe e
 * funciona de ponta a ponta.**
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  paraMotor, itensDe, prontasPara, podeUmDia, oQueFalta, aplicar, prontasNaCaixa,
} from '../app/modules/evolucao-idle.mjs';
import {
  msDaAlternancia, msTotal, montar, falaDe, corDoTipo,
  TROCAS, MS_PRIMEIRA_TROCA, RAZAO,
} from '../app/modules/evolucao-tela.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = p => readFileSync(join(RAIZ, p), 'utf8');

const cria = (dex, nivel = 1, extra = {}) =>
  ({ id: 'c1', dex, nivel, vinculo: 0, iv: [10, 10, 10, 10, 10, 10], ...extra });

export function suite() {
  const s = criarSuite('evolucao-idle');

  /* ── A PONTE ──────────────────────────────────────────────────────────── */

  s.teste('a ponte `dex` → `especie` existe, e é num lugar só', () => {
    /* Espalhar a conversão pelos chamadores criaria a chance de alguém
       converter num lugar e esquecer no outro — e o sintoma seria "esta
       criatura não evolui", sem erro nenhum. */
    igual(paraMotor({ dex: 4 }).especie, 4);
    igual(paraMotor({ especie: 7 }).especie, 7, 'já convertido devia atravessar');
    ok(Number.isNaN(paraMotor({}).especie), 'sem dex nem especie devia dar NaN, e não 0 — ' +
      'zero seria um dex válido em silêncio');
  });

  s.teste('a evolução por NÍVEL funciona de ponta a ponta', () => {
    igual(prontasPara(kanto, cria(4, 10), {}).length, 0, 'evoluiu antes da hora');
    igual(prontasPara(kanto, cria(4, 16), {}).length, 1, 'no nível exigido não evoluiu');
    const r = aplicar(kanto, cria(4, 16), {});
    igual(r.de, 4); igual(r.para, 5);
    igual(r.criatura.dex, 5, 'a criatura nova não trocou de espécie');
    ok(!('especie' in r.criatura),
      'a criatura voltou com `especie` junto de `dex` — duas verdades para o ' +
      'mesmo número é como elas divergem depois');
  });

  s.teste('evoluir PRESERVA o que faz a criatura valer dinheiro', () => {
    /* O potencial é sorteado uma vez e viaja a linha inteira. Se evoluir
       re-sorteasse, ninguém pagaria por um filhote bom — o resultado final
       seria decidido depois da venda. */
    const antes = cria(4, 16, { vinculo: 40, foco: 'vigia', xp: 1234 });
    const r = aplicar(kanto, antes, {});
    igual(r.criatura.iv.join(','), antes.iv.join(','), 'o IV mudou ao evoluir');
    igual(r.criatura.nivel, 16, 'evoluir repôs o nível — evoluir não é renascer');
    igual(r.criatura.vinculo, 40, 'o vínculo se perdeu');
    igual(r.criatura.foco, 'vigia', 'o foco se perdeu');
    igual(r.criatura.id, antes.id, 'a criatura trocou de identidade');
  });

  s.teste('aplicar NÃO muta a criatura de entrada', () => {
    const antes = cria(4, 16);
    const copia = JSON.stringify(antes);
    aplicar(kanto, antes, {});
    igual(JSON.stringify(antes), copia,
      'aplicar mutou a entrada — a tela precisa do ANTES e do DEPOIS para ' +
      'desenhar a transição, e meia-evolução gravada é pior que nenhuma');
  });

  /* ── A EVOLUÇÃO POR ITEM, QUE É O QUE DÁ SENTIDO ÀS DEZ PEDRAS ────────── */

  s.teste('a pedra é exigida, e a bolsa vazia não vale', () => {
    const aresta = kanto.evolucoes.find(a => a.exige?.item);
    ok(aresta, 'o pack não tem nenhuma evolução por item — as pedras não servem a nada');
    const c = cria(aresta.de, 60);
    igual(prontasPara(kanto, c, {}).length, 0, 'evoluiu sem ter a pedra');
    igual(prontasPara(kanto, c, { [aresta.exige.item]: 1 }).length, 1,
      'tinha a pedra e não evoluiu');
    igual(prontasPara(kanto, c, { [aresta.exige.item]: 0 }).length, 0,
      'zero na bolsa contou como ter — um item com zero não é um item que se tem');
  });

  s.teste('itensDe só devolve o que tem quantidade', () => {
    igual(itensDe({ fogo: 2, agua: 0, lua: 1 }).sort().join(','), 'fogo,lua');
    igual(itensDe(null).length, 0);
  });

  /* ── A RECUSA DIZ O QUE FALTA ─────────────────────────────────────────── */

  s.teste('a recusa diz O QUE falta, e não "não pode"', () => {
    /* Recusa sem endereço é o D-067, e ele já custou um bloco a este projeto.
       "falta o nível 16" transforma a próxima expedição numa decisão. */
    const r = oQueFalta(kanto, cria(4, 10), {});
    igual(r.evolui, true);
    igual(r.falta, 'nível 16', `veio "${r.falta}"`);

    const pronto = oQueFalta(kanto, cria(4, 16), {});
    igual(pronto.falta, null, 'quem já pode não devia ter o que faltar');
  });

  s.teste('o item que falta aparece com o NOME, e não com o id', () => {
    const aresta = kanto.evolucoes.find(a => a.exige?.item);
    const r = oQueFalta(kanto, cria(aresta.de, 60), {}, id => `NOME:${id}`);
    ok(/NOME:/.test(r.falta),
      `veio "${r.falta}" — o jogador leria o id cru em vez do nome da pedra`);
  });

  s.teste('quem não evolui diz que não evolui, e é diferente de "falta algo"', () => {
    /* A tela escreve frases diferentes para as duas: "falta o nível 16" convida;
       "não evolui" encerra. Confundi-las poria um convite em cada linha final. */
    const finais = kanto.especies.filter(e => !podeUmDia(kanto, { dex: e.dex }));
    ok(finais.length > 10, `só ${finais.length} espécies são forma final — improvável`);
    const r = oQueFalta(kanto, cria(finais[0].dex, 99), {});
    igual(r.evolui, false);
    igual(r.falta, null);
  });

  s.teste('a recusa escolhe a aresta MAIS PERTO, e não a primeira', () => {
    /* Uma linha que se abre em três tem três alvos; mostrar o mais distante
       desanima sem motivo. */
    const comVarias = kanto.especies
      .map(e => e.dex)
      .find(d => (kanto.evolucoes.filter(a => a.de === d).length) > 1);
    if (!comVarias) { ok(true, 'este pack não tem linha que se abre — nada a conferir'); return; }
    const alvos = kanto.evolucoes.filter(a => a.de === comVarias);
    const niveis = alvos.map(a => a.exige?.nivel).filter(Boolean);
    if (niveis.length < 2) { ok(true, 'os alvos não se distinguem por nível'); return; }
    const r = oQueFalta(kanto, cria(comVarias, 1), {});
    ok(r.falta.includes(String(Math.min(...niveis))),
      `a recusa aponta para ${r.falta} quando o alvo mais perto é o nível ${Math.min(...niveis)}`);
  });

  s.teste('prontasNaCaixa acha quem pode agora, e ignora o resto', () => {
    const caixa = [cria(4, 10), cria(4, 16), cria(1, 99)];
    const prontas = prontasNaCaixa(kanto, caixa, {});
    ok(prontas.length >= 2, `só ${prontas.length} prontas de 3 — o nível 99 do 1 devia contar`);
    ok(!prontas.some(c => c.nivel === 10), 'uma que não pode entrou na lista');
  });

  /* ── A TRANSIÇÃO ──────────────────────────────────────────────────────── */

  s.teste('a alternância ACELERA, e é ela que faz a animação existir', () => {
    /* Sem a aceleração o resto é um flash com o sprite trocado — e é por isso
       que as animações antigas da série parecem pobres: elas piscam. */
    ok(RAZAO < 1 && RAZAO > 0.6,
      `a razão é ${RAZAO}; acima de 1 desacelera, e abaixo de 0,6 as últimas ` +
      'trocas somem antes de o olho pegá-las');
    ok(TROCAS >= 8, `${TROCAS} trocas é pouco para a aceleração se perceber`);
    /* A última troca tem de ser bem mais curta que a primeira. */
    const ultima = MS_PRIMEIRA_TROCA * Math.pow(RAZAO, TROCAS - 1);
    ok(ultima < MS_PRIMEIRA_TROCA / 3,
      `a última troca dura ${Math.round(ultima)}ms contra ${MS_PRIMEIRA_TROCA}ms da ` +
      'primeira — a aceleração é fraca demais para se sentir');
  });

  s.teste('a transição tem duração humana e dá para pular', () => {
    const t = msTotal();
    ok(t > 3000, `${t}ms é curto demais para virar um momento`);
    ok(t < 9000, `${t}ms é longo demais — na décima evolução vira imposto`);
    igual(msDaAlternancia() > 0, true);

    const cena = ler('app/modules/evolucao-cena.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
    ok(/Escape/.test(cena), 'Esc deixou de pular');
    const h = ler('app/index.html');
    ok(/evoPular/.test(h), 'o botão de pular sumiu');
  });

  s.teste('os anéis saem na cor do TIPO, e não numa cor fixa', () => {
    const fogo = corDoTipo(5);      /* Charmeleon */
    const planta = corDoTipo(2);    /* Ivysaur */
    ok(fogo !== planta,
      `os dois deram ${fogo} — a transição virou um cartão genérico em vez de ` +
      'pertencer àquela criatura');
    ok(/^#/.test(fogo), `a cor de fogo veio como "${fogo}", e não como cor`);
  });

  s.teste('a cena carrega as DUAS formas, e a fala nomeia as duas', () => {
    const html = montar(4, 5);
    ok(/data-dex="4"/.test(html) && /data-dex="5"/.test(html),
      'a cena não tem as duas formas — a alternância não teria entre o que alternar');
    const fim = falaDe('revelacao', 4, 5);
    ok(/Charmander/.test(fim) && /Charmeleon/.test(fim), `a fala final veio "${fim}"`);
  });

  /* ── A LIGAÇÃO COM O JOGO ─────────────────────────────────────────────── */

  s.teste('a criatura é gravada ANTES da animação, e a pedra é consumida', () => {
    /* Se a aba fechar no meio, a evolução aconteceu — ela aconteceu no JOGO, e a
       tela é só o relato. E sem consumir a pedra, uma Pedra do Fogo evoluiria a
       caixa inteira, e o gargalo do requisito do dono sumiria na primeira vez. */
    const t = ler('app/modules/idle-tela.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
    /* A CHAMADA, e não o import. A primeira versão deste teste procurou
       `aplicarEvolucao` com `indexOf` e achou a linha do `import` — depois leu
       900 caracteres do bloco de imports e concluiu que a ordem estava errada.
       Falso positivo meu, e a lição é a de sempre: procurar um NOME acha a
       declaração; para achar o uso, procure a CHAMADA. */
    const i = t.indexOf('aplicarEvolucao(', t.indexOf('from') + 1);
    const iChamada = t.indexOf('= aplicarEvolucao(');
    ok(iChamada > 0, 'a tela não chama a evolução — o motor voltou a não ter chamador');
    const depois = t.slice(iChamada, iChamada + 900);
    const iSalvar = depois.indexOf('salvarE()');
    const iTocar = depois.indexOf('tocarEvolucao');
    ok(iSalvar > 0 && iTocar > 0 && iSalvar < iTocar,
      'a animação toca ANTES de gravar — quem fechar a aba no meio perde a evolução');
    ok(/E\.bolsa\[item\] -= 1/.test(depois),
      'a pedra não é consumida: uma só evoluiria a caixa inteira');
  });

  return s;
}
