/* Q1/Q3 · AS BANDEIRAS DA LINHA DE COMANDO (bloco T6).
 *
 * Quatro casos e uma tabela-verdade. A suíte inteira roda em microssegundos, e
 * é a única coisa que separa o `npm run rapido` de voltar aos 3 min 30 s do
 * D-059 — onde ele subia cinco Chromium e jogava fora o que eles mediram.
 *
 * O que torna esse defeito perigoso, e o que estes testes existem para cobrir:
 * ele NÃO TEM SINTOMA. A suíte fica verde, a contagem fica certa, nada quebra.
 * Só o relógio sabe. Um portão que só o relógio pega é um portão que ninguém
 * lê — foi por isso que ele sobreviveu a quatro blocos.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { precisaNavegador } from './bandeiras.mjs';

const COM = ['visual', 'ambientes', 'rodada-viva', 'contraste'];

export function suite() {
  const s = criarSuite('bandeiras');

  s.teste('sem bandeira nenhuma, o navegador sobe', () => {
    igual(precisaNavegador({ so: null, semNavegador: false, comNavegador: COM }), true,
      'a execução completa precisa das suítes de navegador. Se esta virar ' +
      'false, o portão passa a fechar bloco sem nunca abrir o jogo — que é a ' +
      'única coisa que pega erro de ligação (Q5).');
  });

  s.teste('`--sem-navegador` IMPEDE a partida, e essa é a razão de ela existir', () => {
    igual(precisaNavegador({ so: null, semNavegador: true, comNavegador: COM }), false,
      'É O D-059. A bandeira é uma RECUSA: sem poder impedir a partida ela não ' +
      'serve para nada, e foi exatamente esse o defeito — cinco Chromium subiam, ' +
      'mediam, e o resultado era descartado logo depois. 3 min 30 s por execução ' +
      'onde a documentação prometia 7 s, sem sintoma nenhum na saída.');
  });

  s.teste('`--sem-navegador` vence mesmo quando `--so` pede suíte de navegador', () => {
    igual(precisaNavegador({ so: ['visual'], semNavegador: true, comNavegador: COM }), false,
      'pedir `--so=visual --sem-navegador` é um pedido contraditório, e a recusa ' +
      'tem de vencer: a suíte visual sai do resultado de qualquer jeito (o filtro ' +
      'do D-017), então subir o navegador seria puro desperdício outra vez.');
  });

  s.teste('`--so` fora da lista não sobe navegador; dentro da lista, sobe', () => {
    igual(precisaNavegador({ so: ['carteira'], semNavegador: false, comNavegador: COM }), false,
      'é o que faz `--so=carteira` custar 0,2 s em vez de 95 s.');
    igual(precisaNavegador({ so: ['carteira', 'visual'], semNavegador: false, comNavegador: COM }), true,
      'basta UMA suíte de navegador na lista para o navegador ser necessário. ' +
      'Exigir que todas fossem faria `--so=carteira,visual` rodar a visual sem ' +
      'navegador — verde falso, que é pior que vermelho.');
  });

  s.teste('lista vazia é tratada como ausência de `--so`', () => {
    igual(precisaNavegador({ so: [], semNavegador: false, comNavegador: COM }), true,
      '`--so=` sem nomes não é "nenhuma suíte": o `run.mjs` já reprova nome ' +
      'órfão, e execução vazia com a palavra VERDE é o defeito S109.');
  });

  return s;
}
