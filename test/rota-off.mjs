/* AS DUAS ABAS DO FARM — bloco A4e (L-154).
 *
 * Decisão do dono, 08/09/2026, e ela CORRIGE a L-146:
 *
 *   > "o antigo modo não é pra ficar na mesma aba, ele se torna uma aba com
 *   >  nome de ROTA OFF/TRAINER OFF — e o nosso novo iddle, somente ROTAS"
 *
 * ── POR QUE DUAS ABAS É MELHOR QUE UM SELETOR ─────────────────────────────
 *
 * A L-146 previa os dois modos na mesma tela, com o jogador escolhendo. O
 * problema disso só aparece quando se olha o que cada modo PEDE:
 *
 *     ROTAS      o Avanço. O jogador FICA — a tela existe para ser olhada
 *     ROTA OFF   Batida, Trilha, Vigília. O jogador SAI — ele fecha o jogo
 *
 * Uma aba que oferece os dois lado a lado pede que ele decida entre "ficar" e
 * "sair" no mesmo clique, e a tela que ele está olhando enquanto decide é a do
 * modo que pede para ele ficar.
 *
 *   > Separar em abas não é organização: é parar de fazer a pergunta errada.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const HTML = ler('../app/index.html');

export function suite() {
  const s = criarSuite('rota-off');

  s.teste('existem DUAS abas de farm, e cada uma tem a própria vista', () => {
    ok(/data-view="viewIdle"[^>]*>\s*Rotas\s*</.test(HTML),
      'a aba do Avanço deixou de se chamar Rotas');
    ok(HTML.includes('data-view="viewRotaOff"'),
      'não existe a aba da Rota OFF — o modo antigo continua escondido dentro de Rotas');
    ok(HTML.includes('id="viewRotaOff"'),
      'a aba da Rota OFF não tem vista própria');
  });

  s.teste('a Rota OFF fica ao lado de Rotas, e não no fim do menu', () => {
    /* Elas são o mesmo assunto visto de dois jeitos. Separá-las por Pokédex e
       Wiki no meio faria a segunda ler como um quarto modo de jogo — que é
       exatamente o erro que o 1.18 corrigiu com a Liga. */
    const rotas = HTML.indexOf('data-view="viewIdle"');
    const off = HTML.indexOf('data-view="viewRotaOff"');
    const dex = HTML.indexOf('data-view="viewPokedex"');
    ok(off > rotas && off < dex,
      'a Rota OFF não está logo depois de Rotas — ela lê como outro modo de jogo');
  });

  /* ── O QUE MUDA DE LUGAR, E O QUE FICA ─────────────────────────────────
     A escolha de PERFIL (Batida, Trilha, Vigília) é o coração da Rota OFF, e
     não tem o que fazer em Rotas: no Avanço não há duração a escolher — ela
     sai da força (A4d). */
  s.teste('a escolha de perfil mora na Rota OFF, e só lá', () => {
    const off = HTML.slice(HTML.indexOf('id="viewRotaOff"'));
    const fim = off.indexOf('<div id="view', 10);
    const dentro = fim > 0 ? off.slice(0, fim) : off;
    ok(dentro.includes('id="idlePerfis"'),
      'os três perfis não estão na Rota OFF — é lá que se escolhe a duração');
    ok(dentro.includes('id="idleMandar"'),
      'o botão de mandar a expedição não está na Rota OFF');

    const rotas = HTML.slice(HTML.indexOf('id="viewIdle"'),
                             HTML.indexOf('id="viewRotaOff"'));
    ok(!rotas.includes('id="idlePerfis"'),
      'os perfis continuam em Rotas — no Avanço a duração sai da FORÇA, e ' +
      'oferecer uma escolha que não existe é pior que não oferecer nada');
  });

  s.teste('o botão de avançar mora em Rotas, e só lá', () => {
    const rotas = HTML.slice(HTML.indexOf('id="viewIdle"'),
                             HTML.indexOf('id="viewRotaOff"'));
    ok(rotas.includes('id="idleAvancar"'), 'o botão de avançar saiu de Rotas');
    igual((HTML.match(/id="idleAvancar"/g) ?? []).length, 1,
      'existe mais de um botão de avançar');
  });

  /* ── O MUNDO É UM SÓ, E ELE MORA EM ROTAS ──────────────────────────────
     O palco com o canvas, o treinador e a fauna. Duplicá-lo para a Rota OFF
     seria dois canvas do mesmo mundo — a forma mais barata de eles mostrarem
     lugares diferentes, e o mesmo erro que o A4b evitou ao MOVER o palco. */
  s.teste('o palco do mundo continua único', () => {
    igual((HTML.match(/id="idlePalco"/g) ?? []).length, 1,
      'a Rota OFF ganhou um segundo palco');
    igual((HTML.match(/id="idleMundo"/g) ?? []).length, 1,
      'existe mais de um canvas de mundo');
  });

  /* ── A OUTRA METADE DO NOME ────────────────────────────────────────────
     O dono batizou a aba de "ROTA OFF / TRAINER OFF", e as duas metades são
     modos diferentes: a rota é quem SAIU, o trainer é quem FICOU. Uma aba com
     o segundo nome no título e nada do segundo modo dentro é uma promessa que
     a tela não cumpre — pior que não ter o nome. */
  s.teste('o TRAINER OFF existe de verdade, e não só no título da aba', () => {
    const off = HTML.slice(HTML.indexOf('id="viewRotaOff"'));
    const fim = off.indexOf('<div id="view', 10);
    const dentro = fim > 0 ? off.slice(0, fim) : off;
    ok(dentro.includes('id="offTreino"'),
      'a aba se chama TRAINER OFF e não tem onde o treino apareça');
    ok(/Trainer OFF/i.test(dentro),
      'o segundo nome que o dono deu à aba não está escrito nela');
  });

  s.teste('o painel do treino tem quem o pinte — painel vazio é promessa quebrada', () => {
    const js = ler('../app/modules/idle-treino.mjs');
    /* `nosDois('Treino')` é #idleTreino + #offTreino — o mesmo código escreve
       nas duas abas, e é por isso que elas não podem divergir. */
    ok(/nosDois\('Treino'\)|offTreino/.test(js),
      'o módulo do treino não escreve em #offTreino — o painel fica vazio para sempre');
    const tela = ler('../app/modules/idle-tela.mjs');
    ok(/pintarTreino/.test(tela),
      'ninguém chama o painel do treino na repintura — ele nasceria morto');
  });

  /* ── E O TREINO NÃO PODE COMER O TETO ─────────────────────────────────
     Se ele produzisse encontro seria um terceiro farm, e o §P5 protege a
     economia das espécies contra exatamente isso. O motor já garante o zero;
     o que este teste guarda é que a TELA não prometa o contrário. */
  s.teste('a tela do treino não promete encontro nem item', () => {
    const js = ler('../app/modules/idle-treino.mjs');
    ok(/não dá encontro|nao da encontro|sem encontro/i.test(js),
      'a tela do treino não diz que ele não dá encontro — e o jogador vai contar ' +
      'com um encontro que nunca vem');
  });

  /* ── A CAIXA TEM DE ESTAR NAS DUAS ABAS — L-149 ────────────────────────
   *
   * Pedido do dono, ao aprovar o arranjo do A4:
   *
   *   > "outra coisa que não pode faltar é nossa box, caixa, o depot de
   *   >  substituição dos pokémon, precisa estar inserida no novo layout"
   *
   * O Centro entrou em ROTAS, e a divisão do A4e o deixou SÓ lá. Mas quem
   * monta uma expedição monta na ROTA OFF — e lá ele escolhia entre os seis
   * ativos sem poder trocar quem são os seis.
   *
   *   > Uma decisão que o jogador toma várias vezes por dia e que exige
   *   > mudar de aba é uma decisão que ele deixa de tomar. Ele manda a mesma
   *   > equipe cansada, e o modo perde o eixo.
   */
  s.teste('a caixa está nas DUAS abas do farm', () => {
    const off = HTML.slice(HTML.indexOf('id="viewRotaOff"'));
    const fim = off.indexOf('<div id="view', 10);
    const dentro = fim > 0 ? off.slice(0, fim) : off;
    ok(dentro.includes('id="offCentro"'),
      'a Rota OFF não tem o Centro: dá para escolher entre os seis ativos e ' +
      'não dá para trocar quem são os seis');
    const rotas = HTML.slice(HTML.indexOf('id="viewIdle"'), HTML.indexOf('id="viewRotaOff"'));
    ok(rotas.includes('id="idleCentro"'), 'o Centro saiu de Rotas');

    const js = ler('../app/modules/idle-paineis.mjs');
    ok(/nosDois\('Centro'\)/.test(js),
      'o Centro é pintado num alvo só — a segunda aba abriria com o painel vazio');
  });

  /* ══ A ROTA OFF MOSTRA QUEM MORA NO BIOMA (L-164) ═════════════════════
   *
   *   > "a rota OFF você mantém exatamente no mesmo layout anterior, que hoje
   *   >  por exemplo não aparece os [habitantes] do bioma"
   *
   * A prévia das espécies existia só em ROTAS. E a Rota OFF é onde ela pesa
   * MAIS: ali o jogador fecha o jogo e volta horas depois — escolher o lugar
   * sem ver quem mora nele é escolher às cegas por oito horas. Em ROTAS ele ao
   * menos assiste e descobre no caminho.
   *
   * Medido no passo OLHAR, antes e depois: **0 na prévia -> 12 na prévia**. */
  s.teste('a prévia das espécies aparece nas DUAS abas', () => {
    ok(HTML.includes('id="offPrevia"'),
      'a Rota OFF não tem onde a prévia caia — o jogador escolhe o lugar sem ' +
      'ver quem mora nele, e ele vai passar oito horas ali');
    ok(HTML.includes('id="idlePrevia"'), 'a prévia sumiu de ROTAS');

    const estagios = ler('../app/modules/idle-estagios.mjs');
    const i = estagios.indexOf('export function pintarPrevia');
    ok(i > 0, 'a pintarPrevia sumiu');
    const fim = estagios.indexOf('\nexport ', i + 10);
    const fn = estagios.slice(i, fim > 0 ? fim : undefined);

    ok(/nosDois\(['\"]Previa['\"]\)/.test(fn),
      'a prévia escreve num alvo só. O MESMO código nos dois é o que impede as ' +
      'abas de discordarem sobre quem mora no mesmo lugar');
    ok(!/alvo\.innerHTML/.test(fn),
      'a prévia ainda escreve direto no primeiro alvo — a segunda aba fica vazia');
  });

  /* ── E O ESCRITOR DELA É DELA (D-088) ──────────────────────────────────
     A linha do estágio vazio chamava um `escrever` que mora dentro de OUTRA
     função do mesmo arquivo. Fora dali é `ReferenceError`, e ele derruba o
     desenho da aba inteira.

     Nunca disparou porque só existe quando o estágio não tem espécie nenhuma —
     e isso não acontece no pack de hoje. Um save citando bioma removido, ou um
     pack novo com estágio vazio, e a aba cai.

       > Erro que espera um dado que ainda não existe é o pior de achar: ele
       > não tem sintoma até o dia em que tem. */
  s.teste('a prévia não chama função de outro escopo quando o estágio é vazio', () => {
    const estagios = ler('../app/modules/idle-estagios.mjs');
    const i = estagios.indexOf('export function pintarPrevia');
    const fim = estagios.indexOf('\nexport ', i + 10);
    const fn = estagios.slice(i, fim > 0 ? fim : undefined);

    /* ── O CÓDIGO, E NÃO O COMENTÁRIO ────────────────────────────────
       A primeira versão varria a função inteira, e o COMENTÁRIO que explica
       o D-088 cita `escrever(...)` de propósito — ele reprovou a si mesmo.

         > Um teste que proíbe o NOME proíbe explicar. É a segunda vez neste
         > bloco (a outra foi o S929), e a cura é a mesma: afirmar sobre o
         > que o autor ESCREVE COMO CÓDIGO.

       Os comentários saem antes da varredura. */
    const semComentario = fn.replace(/\/\*[\s\S]*?\*\//g, '')
                            .replace(/\/\/[^\n]*/g, '');

    /* Toda função chamada dentro da pintarPrevia tem de nascer DENTRO dela, ou
       ser importada. O escrever solto não é nenhum dos dois. */
    ok(!/\bescrever\s*\(/.test(semComentario),
      'a pintarPrevia chama escrever(...), e essa const mora dentro da ' +
      'pintarEstagios. Fora dali é ReferenceError, e ele derruba a aba — é o ' +
      'D-088, e ele espera um estágio vazio para disparar');

    ok(/const escreverNaPrevia\s*=/.test(fn),
      'a prévia não declara o próprio escritor — ela voltaria a depender do ' +
      'escopo de uma função irmã');
  });

  return s;
}
