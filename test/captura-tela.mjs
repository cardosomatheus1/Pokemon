/* A LINHA DO TEMPO DA CAPTURA — bloco 1.23.
 *
 * A afirmação central desta suíte é de JOGO, e não de arte:
 *
 *   > **A animação não pode entregar o resultado antes da hora.**
 *
 * A série varia o número de balanços conforme o quanto faltou. Aqui são sempre
 * três, porque um balanço que depende do resultado ensina o jogador a parar de
 * assistir no primeiro — e a tensão que o dono pediu morre junto.
 *
 * O resto protege a decisão de ritmo: a PAUSA entre os balanços é o suspense, e
 * ela cresce. Pausa constante lê como relógio; crescente lê como decisão sendo
 * tomada.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  CASAS, LINHAS, CASA_FECHADA, CASA_ABERTA, CASA_TRAVADA,
  MS_ENTRADA, MS_VOO, MS_ABRIR, MS_FECHAR, MS_BALANCO, PAUSAS, MS_VEREDITO, BALANCOS,
  msDoChacoalho, msTotal, fases, casaEm, linhaDaBola, falaDe, laudo,
} from '../app/modules/captura-tela.mjs';

export function suite() {
  const s = criarSuite('captura-tela');

  s.teste('as fases são contíguas e somam o total', () => {
    const f = fases();
    igual(f[0].de, 0, 'a primeira fase não começa em zero');
    for (let i = 1; i < f.length; i++)
      igual(f[i].de, f[i - 1].ate,
        `há um buraco entre "${f[i - 1].nome}" e "${f[i].nome}" — a cena ficaria ` +
        'sem nada para desenhar nesse intervalo');
    igual(f.at(-1).ate, msTotal(), 'a soma das fases não bate com o total');
    igual(f.at(-1).nome, 'veredito', 'a última fase deixou de ser o veredito');
  });

  s.teste('a ordem das fases é a do desenho', () => {
    const nomes = fases().map(f => f.nome).join(' ');
    /* A ENTRADA vem primeiro, e ela foi acrescentada DEPOIS de olhar a captura:
       sem ela a criatura aparecia só durante o voo — 380 ms — e sumia. O
       jogador mal registrava em QUEM estava jogando, e a cena que escurece a
       página inteira gastava esse escuro sem apresentar ninguém. */
    ok(nomes.startsWith('entrada voo abrir fechar balanco1'),
      `a ordem saiu "${nomes.slice(0, 46)}…". A criatura tem de ser apresentada ` +
      'antes da bola voar; a bola não pode balançar antes de fechar, e não pode ' +
      'fechar antes de abrir.');
    ok(fases()[0].ms >= 380,
      'a entrada ficou curta demais para alguém ver quem está sendo capturado');
    igual(fases().filter(f => f.nome.startsWith('balanco')).length, BALANCOS);
  });

  s.teste('a PAUSA entre os balanços CRESCE — é ela que é o suspense', () => {
    for (let i = 1; i < PAUSAS.length; i++)
      ok(PAUSAS[i] > PAUSAS[i - 1],
        `a pausa ${i + 1} (${PAUSAS[i]}ms) não é maior que a anterior ` +
        `(${PAUSAS[i - 1]}ms). Pausa constante lê como relógio; crescente lê ` +
        'como decisão sendo tomada — é a mesma lição da alternância acelerando ' +
        'na evolução do 1.21.');
    ok(PAUSAS.every(p => p > MS_BALANCO * 0.6),
      'a pausa ficou curta demais em relação ao balanço — sem respiro entre os ' +
      'balanços o resto é decoração');
    igual(msDoChacoalho(), BALANCOS * MS_BALANCO + PAUSAS.reduce((a, b) => a + b, 0));
  });

  s.teste('ela é CURTA, porque captura acontece o tempo todo', () => {
    /* A evolução leva 5,8 s e isso está certo: evolução é rara. Uma espera
       dessas repetida vinte vezes numa expedição vira imposto — e o dono deixa
       esta aba aberta por horas. */
    ok(msTotal() < 4500,
      `a captura leva ${msTotal()}ms. Acima de ~4,5 s ela vira imposto: ela ` +
      'acontece a cada encontro, e a aba fica aberta por horas.');
    ok(msTotal() > 2500,
      `${msTotal()}ms é curto demais para caber suspense — o pedido do dono é ` +
      'que o momento seja VISTO, não que ele passe');
  });

  s.teste('A ANIMAÇÃO NÃO ENTREGA O RESULTADO ANTES DA HORA', () => {
    /* A invariante que sustenta a decisão de desenho inteira. Até o veredito
       começar, quem pegou e quem não pegou veem EXATAMENTE a mesma coisa. */
    const ateOVeredito = msTotal() - MS_VEREDITO;
    for (let t = 0; t <= ateOVeredito; t += 10)
      igual(casaEm(t, { pegou: true }), casaEm(t, { pegou: false }),
        `em ${t}ms a bola está numa casa diferente conforme o resultado. ` +
        'Isso entrega o final antes da hora, e o jogador aprende a parar de ' +
        'assistir — que é exatamente o que a decisão de "três balanços sempre" ' +
        'existe para impedir.');
    /* E DEPOIS ela precisa divergir, ou o final não existe. */
    ok(casaEm(msTotal(), { pegou: true }) !== casaEm(msTotal(), { pegou: false }),
      'os dois finais terminam na mesma casa — não há fuga nenhuma desenhada');
  });

  s.teste('a bola abre, fecha, e só volta a abrir quando escapou', () => {
    igual(casaEm(0), CASA_FECHADA, 'a bola não começa fechada');
    igual(casaEm(MS_ENTRADA - 1), CASA_FECHADA,
      'durante a ENTRADA a bola já saiu do lugar — ela nem entrou em cena ainda');
    igual(casaEm(MS_ENTRADA + MS_VOO + MS_ABRIR - 1), CASA_ABERTA,
      'ao fim de "abrir" a bola não chegou na casa aberta');
    igual(casaEm(MS_ENTRADA + MS_VOO + MS_ABRIR + MS_FECHAR - 1), CASA_TRAVADA,
      'ao fim de "fechar" a bola não chegou na casa travada');
    /* Durante o chacoalho ela fica parada na casa travada: o movimento ali é
       transformação, e não troca de quadro. */
    const c0 = MS_ENTRADA + MS_VOO + MS_ABRIR + MS_FECHAR;
    for (let t = c0; t < c0 + msDoChacoalho(); t += 50)
      igual(casaEm(t), CASA_TRAVADA, `em ${t}ms a bola saiu da casa travada`);
    igual(casaEm(msTotal(), { pegou: true }), CASA_TRAVADA,
      'quem pegou não terminou com a bola fechada');
    igual(casaEm(msTotal(), { pegou: false }), CASA_ABERTA,
      'quem escapou não terminou com a bola aberta');
  });

  s.teste('a casa nunca sai da tira', () => {
    for (const pegou of [true, false])
      for (let t = -200; t <= msTotal() + 500; t += 7) {
        const c = casaEm(t, { pegou });
        ok(Number.isInteger(c) && c >= 0 && c < CASAS,
          `em ${t}ms (pegou=${pegou}) a casa saiu ${c}, fora de 0..${CASAS - 1}`);
      }
  });

  s.teste('a bola desenhada é a bola usada', () => {
    /* Requisito literal do dono: "jogar uma Great e ver a animação da Ultra é
       pior que não ter animação nenhuma". */
    igual(new Set(LINHAS).size, LINHAS.length, 'a lista de bolas tem repetida');
    LINHAS.forEach((id, i) => igual(linhaDaBola(id), i, `a linha de "${id}" errou`));
    igual(linhaDaBola('bola_nova_do_pack'), 0,
      'bola desconhecida devia cair na primeira linha — sem isso, uma bola nova ' +
      'no pack apareceria como captura SEM animação, que é o defeito que este ' +
      'bloco existe para tirar');
  });

  s.teste('o laudo diz para onde ele foi, e não só que entrou', () => {
    const naEquipe = laudo({ pegou: true, nome: 'X', chance: .4 });
    const naCaixa = laudo({ pegou: true, nome: 'X', chance: .4, foiParaCaixa: true });
    ok(/caixa/i.test(naCaixa.linha),
      'o laudo não diz que foi para a CAIXA — sem isso, capturar com a equipe ' +
      'cheia parece que não aconteceu nada');
    ok(!/caixa/i.test(naEquipe.linha), 'o laudo disse caixa sem ter ido para a caixa');
    igual(naEquipe.tom, 'pegou');
  });

  s.teste('"faltou pouco" só quando faltou pouco', () => {
    /* Mentira num laudo ensina o jogador a ignorá-lo. */
    const alto = laudo({ pegou: false, nome: 'X', chance: .72 });
    const baixo = laudo({ pegou: false, nome: 'X', chance: .04 });
    ok(/faltou pouco/.test(alto.nota ?? ''), `com 72% a nota saiu: ${alto.nota}`);
    ok(!/faltou pouco/.test(baixo.nota ?? ''),
      `com 4% o laudo disse "faltou pouco" — e não faltou: ${baixo.nota}`);
    igual(baixo.tom, 'fugiu');
    /* Sem chance conhecida, o laudo se cala em vez de inventar um número. */
    igual(laudo({ pegou: false, nome: 'X' }).nota, null,
      'sem chance, o laudo inventou uma nota');
  });

  s.teste('a fala acompanha o desenho, e não o explica', () => {
    /* O NOME ENTRA NA ENTRADA E FICA ATÉ A ABERTURA. A versão anterior deixava
       o voo mudo, e o resultado medido foi um nome que piscava: aparecia no
       primeiro quadro da abertura e sumia. Quem apresenta alguém não tira a
       legenda no meio da apresentação. */
    ok(falaDe('entrada', 'Pika').includes('Pika'), 'a entrada não apresenta o nome');
    ok(falaDe('voo', 'Pika').includes('Pika'),
      'o nome some durante o voo — ele pisca em vez de apresentar');
    ok(falaDe('abrir', 'Pika').includes('Pika'), 'o nome não aparece ao abrir');
    igual(falaDe('balanco2', 'Pika'), '…');
    igual(falaDe('pausa1', 'Pika'), '…');
  });

  return s;
}
