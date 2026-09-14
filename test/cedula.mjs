/* Q1/Q2 · AS CÉDULAS DE POKÉCASH (R28)
 *
 * ── POR QUE ELAS SÃO DESENHADAS, E NÃO IMAGENS ─────────────────────────────
 *
 * As artes de referência que o dono enviou carregam a marca d'água visível de
 * um artista do DeviantArt. Ele escolheu redesenhá-las: manter a IDEIA da nota
 * — valor nos quatro cantos, denominação por extenso, criatura emoldurada,
 * série, selo — no tema da casa.
 *
 * Sendo SVG gerado por função, a nota é CONFERÍVEL: "a série muda sozinha?",
 * "duas notas na mesma página colidem?", "o nome da moeda entra cru no
 * markup?" são perguntas que um teste responde. Numa imagem, nenhuma delas
 * teria resposta automática.
 *
 * ── A DECOMPOSIÇÃO ─────────────────────────────────────────────────────────
 *
 * A carteira mostra o saldo COMO NOTAS: quantas de cada valor você tem. É o
 * que uma carteira de verdade mostra, e dá peso ao saldo sem mudar regra
 * nenhuma. A conta é gulosa — maior nota primeiro — e o resto que não fecha em
 * nota é dito, não escondido.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/escolhido.mjs';
import { desenharCedula, serieDe, decompor, porExtenso, CORES, LARGURA, ALTURA }
  from '../app/modules/cedula.mjs';

const VALORES = [50, 100, 300, 500, 1000];
const somaDe = m => Object.entries(m.notas).reduce((a, [v, n]) => a + (+v) * n, 0);

export function suite() {
  const s = criarSuite('cedula');

  /* ── O DESENHO ─────────────────────────────────────────────────────────*/

  s.teste('sai um SVG fechado, com viewBox de cédula', () => {
    const svg = desenharCedula({ valor: 100, dex: 4 });
    ok(svg.startsWith('<svg'), 'não começa com <svg');
    ok(svg.trimEnd().endsWith('</svg>'), 'não fecha o <svg>');
    igual(new RegExp(`viewBox="0 0 ${LARGURA} ${ALTURA}"`).test(svg), true,
      'o viewBox não é o da cédula');
    /* 2,35:1 é a proporção das notas de real e de dólar. Ela faz o desenho
       parecer dinheiro antes de qualquer ornamento. */
    ok(Math.abs(LARGURA / ALTURA - 2.35) < 0.02,
      `a proporção é ${(LARGURA / ALTURA).toFixed(2)}:1, e cédula é ~2,35:1`);
  });

  s.teste('a geometria não tem NaN', () => {
    for (const v of VALORES)
      ok(!/NaN|Infinity/.test(desenharCedula({ valor: v, dex: 1 })),
        `a nota de ${v} tem coordenada inválida`);
  });

  /* CADA DENOMINAÇÃO TEM COR PRÓPRIA. Em qualquer moeda do mundo o valor se
     reconhece pela cor antes de o olho ler o número. Duas notas da mesma cor
     seriam duas notas que se confundem no maço. */
  s.teste('cada valor tem uma cor só dele', () => {
    const cores = VALORES.map(v => CORES[v].a);
    igual(new Set(cores).size, VALORES.length,
      `há cores repetidas entre denominações: ${cores.join(', ')}`);
  });

  s.teste('cada valor tem denominação por extenso', () => {
    for (const v of VALORES) {
      const nome = porExtenso(v);
      ok(nome && nome !== String(v), `o valor ${v} não tem nome por extenso`);
      ok(desenharCedula({ valor: v, dex: 1 }).includes(nome),
        `a nota de ${v} não escreve "${nome}"`);
    }
  });

  /* VALOR FORA DA TABELA continua desenhando. Uma nota sem nome é melhor que
     uma exceção no meio da carteira. */
  s.teste('valor desconhecido não quebra a nota', () => {
    const svg = desenharCedula({ valor: 777, dex: 1 });
    ok(svg.startsWith('<svg'), 'valor fora da tabela não desenhou');
    ok(svg.includes('777'), 'o valor não aparece na nota');
  });

  /* ── DUAS NOTAS NA MESMA PÁGINA ────────────────────────────────────────*/

  /* Os `id` do SVG são GLOBAIS no documento. Duas notas com os mesmos ids
     fazem a segunda usar o gradiente e o recorte da primeira — e a carteira
     mostra várias ao mesmo tempo, que é o caso normal. */
  s.teste('notas de valores diferentes não colidem de id', () => {
    const ids = svg => [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    const a = ids(desenharCedula({ valor: 50, dex: 1 }));
    const b = ids(desenharCedula({ valor: 100, dex: 4 }));
    ok(a.length >= 3, 'a nota deixou de declarar ids — o gradiente e o recorte somem');
    for (const x of a)
      ok(!b.includes(x),
        `o id "${x}" se repete entre as notas de 50 e 100. Na carteira, a ` +
        `segunda passaria a usar o gradiente e o recorte da primeira.`);
  });

  /* ── A SÉRIE ───────────────────────────────────────────────────────────*/

  /* DETERMINÍSTICA. Sorteada, a carteira mostraria séries novas a cada
     abertura — e número que muda sozinho é número em que ninguém confia. */
  s.teste('a série é sempre a mesma para a mesma nota', () => {
    igual(serieDe(100, 4), serieDe(100, 4), 'a série mudou entre duas chamadas iguais');
    ok(serieDe(100, 4) !== serieDe(500, 4), 'valores diferentes deram a mesma série');
    ok(serieDe(100, 4) !== serieDe(100, 7), 'espécies diferentes deram a mesma série');
  });

  s.teste('a série tem formato de série', () => {
    ok(/^PA \d{3} \d{3} \d{4}$/.test(serieDe(50, 1)),
      `a série saiu como "${serieDe(50, 1)}" — o formato agrupado é o que a faz ` +
      `parecer número de cédula em vez de identificador de banco de dados`);
  });

  /* ── O ESCAPE ──────────────────────────────────────────────────────────*/

  /* O nome da moeda vem do ContentPack, que é DADO. Um pack com `<` no nome
     injetaria markup dentro do SVG — e o SVG entra na página por `innerHTML`. */
  s.teste('o nome da moeda é escapado antes de virar markup', () => {
    const svg = desenharCedula({ valor: 100, dex: 1, moeda: '<script>x</script>' });
    ok(!/<script>/.test(svg), `markup do nome da moeda entrou cru: ${svg.slice(0, 300)}`);
  });

  /* O QUE IMPORTA É A ASPA, e não a palavra. A primeira versão deste teste
     proibia o texto `onload=` e reprovava o código certo: escapado, ele vira
     `onload=&quot;`, que é texto inofensivo dentro do atributo. O ataque é a
     aspa CRUA, que fecha o atributo e abre outro. */
  s.teste('o endereço do retrato é escapado', () => {
    const svg = desenharCedula({ valor: 100, dex: 1, retrato: 'x" onload="alert(1)' });
    ok(!/onload="/.test(svg),
      'o endereço do retrato fechou o atributo e abriu outro — a aspa entrou crua');
    ok(svg.includes('&quot;'), 'a aspa do endereço não foi escapada');
  });

  /* Sem retrato a nota continua desenhando: cédula sem a criatura é cédula
     incompleta, não erro. É o estado enquanto a imagem não chegou. */
  s.teste('sem retrato a nota ainda desenha', () => {
    const svg = desenharCedula({ valor: 300, dex: 7, retrato: '' });
    ok(svg.startsWith('<svg') && svg.includes('300'), 'a nota sem retrato não desenhou');
    ok(!/<image/.test(svg), 'desenhou uma imagem vazia em vez de omiti-la');
  });

  /* ── A DECOMPOSIÇÃO EM NOTAS ───────────────────────────────────────────*/

  s.teste('o saldo vira notas, da maior para a menor', () => {
    const m = decompor(1650, VALORES);
    igual(m.notas[1000], 1, 'faltou a nota de 1000');
    igual(m.notas[500], 1, 'faltou a de 500');
    igual(m.notas[100], 1, 'faltou a de 100');
    igual(m.notas[50], 1, 'faltou a de 50');
    igual(m.resto, 0, `sobrou ${m.resto} num valor que fecha em notas`);
  });

  /* A SOMA TEM QUE BATER. Uma decomposição que não soma o saldo é uma carteira
     que mente sobre quanto o jogador tem — e é o tipo de erro que passa
     despercebido porque cada nota, sozinha, parece certa. */
  s.teste('as notas somadas com o resto dão o saldo, sempre', () => {
    for (const saldo of [0, 37, 50, 149, 1000, 3333, 987654]) {
      const m = decompor(saldo, VALORES);
      igual(somaDe(m) + m.resto, saldo,
        `${saldo} decompôs em ${JSON.stringify(m.notas)} + resto ${m.resto}`);
    }
  });

  /* O RESTO É DITO, e não escondido. Saldo de 37 não fecha em nota nenhuma; a
     carteira precisa poder mostrar "37 em moedas" em vez de fingir zero. */
  s.teste('o que não fecha em nota vira resto declarado', () => {
    igual(decompor(37, VALORES).resto, 37, 'o valor abaixo da menor nota sumiu');
    igual(decompor(149, VALORES).resto, 49, 'o resto de 149 não é 49');
  });

  s.teste('saldo zero não inventa nota', () => {
    const m = decompor(0, VALORES);
    igual(Object.keys(m.notas).length, 0, 'saldo zero produziu nota');
    igual(m.resto, 0, 'saldo zero produziu resto');
  });

  /* ESTE TESTE AFIRMAVA A COISA ERRADA, e o Q2 provou no R30 (S427 escapou).
   *
   * Ele checava só que nenhuma NOTA aparece. Mas com `resto` negativo o laço
   * guloso `while (resto >= valor)` nunca dispara para denominação positiva
   * nenhuma — então tirar o `Math.max(0, ...)` deixa a lista de notas vazia
   * do mesmo jeito, e o teste passava.
   *
   * O defeito real é o RESTO: sem a guarda, a carteira mostra `-500` como
   * troco. É a mesma lição que este projeto já aprendeu várias vezes — afirmar
   * a palavra ("não tem nota") em vez da construção ("nada de valor negativo
   * sai daqui"). */
  s.teste('saldo negativo não vira dinheiro', () => {
    const m = decompor(-500, VALORES);
    igual(Object.keys(m.notas).length, 0, 'saldo negativo produziu nota');
    igual(m.resto, 0,
      `saldo negativo virou resto ${m.resto} — a carteira mostraria isso como troco`);
  });

  /* GULOSO DE VERDADE: 1000 é uma nota de 1000, e não dez de 100. Uma carteira
     que mostra dez notas onde cabe uma está mostrando o troco, não o saldo. */
  s.teste('usa a maior nota que couber', () => {
    const m = decompor(1000, VALORES);
    igual(m.notas[1000], 1, 'não usou a nota de 1000');
    igual(m.notas[500] ?? 0, 0, 'quebrou em notas menores sem precisar');
  });

  /* ── A LISTA DE NOTAS É DO TEMA, E NÃO DO APP ──────────────────────────
   *
   * Quais valores existem e qual criatura vai em cada um é decisão de TEMA.
   * Escrita no cliente, ela sobrevive à troca de pack — e a carteira passaria a
   * mostrar notas de um jogo com as criaturas de outro. É o mesmo motivo pelo
   * qual o NOME da arena sai do pack, e o `test/conteudo.mjs` existe para
   * impedir o vazamento na direção contrária. */
  s.teste('o pack declara as notas, e a carteira as lê de lá', () => {
    ok(Array.isArray(pack.moeda?.notas) && pack.moeda.notas.length,
      'o pack em uso não declara `moeda.notas`');
    for (const n of pack.moeda.notas) {
      ok(Number.isInteger(n.valor) && n.valor > 0, `nota com valor inválido: ${JSON.stringify(n)}`);
      ok(Number.isInteger(n.dex) && n.dex > 0, `nota sem espécie: ${JSON.stringify(n)}`);
    }
    const carteira = readFileSync(
      new URL('../app/modules/carteira.mjs', import.meta.url), 'utf8');
    ok(/PACK\??\.moeda\??\.notas/.test(carteira),
      'a carteira não lê as notas do pack. Escrita no cliente, a lista sobrevive ' +
      'à troca de tema — e a carteira mostraria notas de um jogo com as ' +
      'criaturas de outro.');
  });

  /* AS NOTAS SÃO AS FICHAS DE APOSTA. Denominação que não corresponde a
     nenhuma aposta é dinheiro que não se gasta; ficha sem nota é aposta que a
     carteira não sabe representar. */
  s.teste('as denominações são as mesmas das fichas de aposta', () => {
    const carteira = readFileSync(
      new URL('../app/modules/carteira.mjs', import.meta.url), 'utf8');
    const fichas = (carteira.match(/CHIP_VALUES\s*=\s*\[([^\]]+)\]/) || [])[1];
    ok(fichas, 'não achei `CHIP_VALUES` para comparar');
    const dasFichas = fichas.split(',').map(x => +x.trim()).filter(Number.isFinite).sort((a, b) => a - b);
    const dasNotas = pack.moeda.notas.map(n => n.valor).sort((a, b) => a - b);
    igual(dasNotas.join(','), dasFichas.join(','),
      `as notas são [${dasNotas}] e as fichas de aposta são [${dasFichas}]. ` +
      `Denominação sem ficha é dinheiro que não se gasta; ficha sem nota é ` +
      `aposta que a carteira não sabe representar.`);
  });

  return s;
}
