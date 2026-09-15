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
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { precisaNavegador, sondasNecessarias, SONDA_DA_SUITE,
         suitesPrometidasENaoEntregues, sondasSemResultado } from './bandeiras.mjs';

const COM = ['visual', 'ambientes', 'rodada-viva', 'contraste'];

/* A lista REAL do `run.mjs`, LIDA DELE (D-103).
 *
 * Ela era uma cópia à mão, e envelheceu na primeira oportunidade: o T10 criou a
 * suíte `visual-luta` e a cópia não soube. O teste que deveria acusar a suíte
 * sumida passou a não considerá-la — guarda que não enxerga o caso é guarda que
 * não existe, e foi assim que o `S996` escapou.
 *
 * É a terceira vez que uma lista à mão dessincroniza neste arnês (D-017, D-098,
 * esta). Derivar não pode dessincronizar: o `run.mjs` é ponto de entrada e não
 * pode ser importado, então a lista é lida do TEXTO dele — a mesma técnica que
 * o `portao.mjs` já usa para casar as duas listas de suítes de navegador. */
const COMPLETO = (() => {
  const txt = readFileSync(new URL('./run.mjs', import.meta.url), 'utf8');
  const m = txt.match(/const COM_NAVEGADOR = \[([^\]]+)\]/);
  if (!m) throw new Error('COM_NAVEGADOR não achado no run.mjs — o teste perdeu a âncora');
  return m[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
})();

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

  /* ── AS DUAS GUARDAS QUE ERAM DECORATIVAS (D-103) ────────────────────────
   *
   * Elas nasceram no T9 e no T10 para impedir que uma suíte sumisse calada — o
   * S109. O Q2 de 15/09 provou que ninguém as testava: os defeitos `S996` e
   * `S998` desligam as duas, e a suíte inteira ficou verde.
   *
   * Moravam no `run.mjs`, que é ponto de entrada: importá-lo executa a suíte
   * inteira, e observar um `process.exit` de fora não é coisa que teste faça.
   * Guarda indetectável é guarda que ninguém testa — é o D-059 de novo, e o
   * remédio é o mesmo: extrair para camada 0 e cobrar aqui.
   */
  const PEDIDAS = new Set(['rodar', 'luta', 'base']);
  /* TRÊS suítes vivem da sonda `rodar` — `visual`, `rodada-viva` e `contraste`.
     A primeira versão desta fixture esqueceu duas, e o teste acusou na hora: é
     a mesma relação não-1:1 que obriga a `SONDA_DA_SUITE` a ser escrita à mão
     em vez de derivada do nome. */
  const ENTREGUES = ['visual', 'rodada-viva', 'contraste', 'visual-luta', 'visual-base'];

  s.teste('sonda que subiu e virou suíte não é cobrada', () => {
    const faltam = suitesPrometidasENaoEntregues({
      sondas: PEDIDAS, montadas: ENTREGUES,
      temAssets: true, comNavegador: COMPLETO });
    igual(faltam.join(', '), '', 'nada a cobrar quando a montagem entregou tudo');
  });

  s.teste('sonda que subiu e NÃO virou suíte é acusada pelo nome', () => {
    const faltam = suitesPrometidasENaoEntregues({
      sondas: PEDIDAS, montadas: ENTREGUES.filter(n => n !== 'visual-luta'),
      temAssets: true, comNavegador: COMPLETO });
    igual(faltam.join(', '), 'visual-luta',
      'a suíte da luta sumiu da montagem e a guarda não acusou. Verde assim é ' +
      'verde sem ter olhado — o S109, e foi o que o defeito S996 explorou.');
  });

  s.teste('`sem-rede` sem assets locais é ausência legítima', () => {
    const faltam = suitesPrometidasENaoEntregues({
      sondas: new Set(['semRede']), montadas: [], temAssets: false,
      comNavegador: COMPLETO });
    igual(faltam.join(', '), '',
      'sem assets a sonda `sem-rede` não roda, e o motivo já é anunciado. ' +
      'Cobrar aqui seria aborto falso em toda máquina sem `npm run assets`.');
  });

  s.teste('e COM assets ela volta a ser cobrada', () => {
    const faltam = suitesPrometidasENaoEntregues({
      sondas: new Set(['semRede']), montadas: [], temAssets: true,
      comNavegador: COMPLETO });
    igual(faltam.join(', '), 'sem-rede',
      'com assets presentes a ausência deixa de ser legítima — e a exceção não ' +
      'pode virar buraco permanente');
  });

  s.teste('sonda pedida que não devolveu resultado é acusada', () => {
    igual(sondasSemResultado({ sondas: new Set(['rodar', 'luta']),
      resultados: { rodar: { ok: 1 }, luta: null } }).join(', '), 'luta',
      'sonda que subiu e devolveu nulo passou batida. A suíte a jusante leria ' +
      '`null` e passaria por VAZIA — foi o que o defeito S998 explorou.');
  });

  s.teste('sonda que NÃO foi pedida não é cobrada por não ter resultado', () => {
    igual(sondasSemResultado({ sondas: new Set(['rodar']),
      resultados: { rodar: { ok: 1 }, luta: null } }).join(', '), '',
      'cobrar resultado de sonda que ninguém pediu transformaria o corte do ' +
      'D-098 num aborto em toda execução recortada');
  });

  return s;
}
