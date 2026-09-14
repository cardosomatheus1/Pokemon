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
import { precisaNavegador, sondasNecessarias, SONDA_DA_SUITE } from './bandeiras.mjs';

const COM = ['visual', 'ambientes', 'rodada-viva', 'contraste'];

/* A lista REAL do `run.mjs`. A `COM` acima é reduzida de propósito para a
   tabela-verdade do booleano; as sondas precisam da lista inteira, senão o
   teste das órfãs não teria o que conferir. */
const COMPLETO = ['visual', 'visual-base', 'ambientes', 'rodada-viva', 'tema-cedo',
                  'sem-rede', 'sem-backend', 'rodada-completa', 'contraste', 'outfit-canvas'];

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

  /* ── AS SONDAS, E NÃO SÓ O SIM/NÃO (D-098, bloco T9) ─────────────────────
   *
   * O booleano acima diz SE sobe navegador. Ele não diz DE QUAIS sondas, e o
   * `run.mjs` traduzia o "sim" em subir as sete. Medido: `--so=visual` custava
   * 152 s rodando sete sondas e lendo uma.
   */
  const sond = o => [...sondasNecessarias({ comNavegador: COMPLETO, ...o })].sort();

  s.teste('`--so=visual` pede UMA sonda, e não as sete', () => {
    igual(sond({ so: ['visual'], semNavegador: false }).join(','), 'rodar',
      'a suíte `visual` lê só o que a sonda `rodar` capturou. Subir as outras ' +
      'seis é o D-059 de volta: Chromium que ninguém lê, sem sintoma nenhum ' +
      'além do relógio.');
  });

  s.teste('duas suítes de sondas diferentes pedem as duas', () => {
    igual(sond({ so: ['visual', 'sem-rede'], semNavegador: false }).join(','),
      'rodar,semRede', 'cada suíte nomeada traz a sonda dela, e só ela');
  });

  s.teste('três suítes que vivem da MESMA sonda pedem uma só', () => {
    igual(sond({ so: ['visual', 'rodada-viva', 'contraste'], semNavegador: false }).join(','),
      'rodar',
      '`rodada-viva` e `contraste` leem o resultado que a `rodar()` já ' +
      'capturou. É por isso que a tabela é escrita e não derivada do nome: ' +
      'derivar erraria exatamente nestes três.');
  });

  s.teste('sem `--so`, sobem todas as sondas', () => {
    igual(sond({ so: null, semNavegador: false }).length,
      new Set(Object.values(SONDA_DA_SUITE)).size,
      'sem recorte a execução é completa, e completa quer dizer toda sonda');
  });

  /* A LEI QUE AMARRA AS DUAS FUNÇÕES, e ela vale nos dois sentidos.
   *
   * Se elas discordarem, um dos dois lados quebra e os dois são caros:
   *   booleano true + conjunto vazio   -> sobe navegador que ninguém usa (D-059)
   *   booleano false + conjunto cheio  -> suíte montada sem a sonda dela (S109),
   *                                        que é verde sem ter olhado nada
   */
  s.teste('conjunto vazio se e só se o booleano é falso', () => {
    const casos = [
      { so: null, semNavegador: false }, { so: null, semNavegador: true },
      { so: ['visual'], semNavegador: true }, { so: ['carteira'], semNavegador: false },
      { so: ['carteira', 'visual'], semNavegador: false }, { so: [], semNavegador: false },
      { so: ['outfit-canvas'], semNavegador: false },
    ];
    for (const c of casos) {
      const b = precisaNavegador({ comNavegador: COMPLETO, ...c });
      const n = sondasNecessarias({ comNavegador: COMPLETO, ...c }).size;
      igual(n > 0, b,
        `discordam em ${JSON.stringify(c)}: booleano ${b}, ${n} sonda(s). ` +
        `Booleano true com conjunto vazio sobe Chromium que ninguém lê; ` +
        `false com conjunto cheio monta suíte sem a sonda dela, e isso é o S109.`);
    }
  });

  s.teste('toda suíte de navegador tem sonda na tabela', () => {
    const orfas = COMPLETO.filter(n => !SONDA_DA_SUITE[n]);
    igual(orfas.join(', '), '',
      `${orfas.length} suíte(s) de navegador sem sonda declarada. Sem entrada ` +
      `na tabela elas somem do recorte em silêncio — e execução vazia com a ` +
      `palavra VERDE é a falha mais silenciosa deste arnês (S109).`);
  });

  return s;
}
