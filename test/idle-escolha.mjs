/* Q1/Q5 · A TELA DE ESCOLHA — o cartão e a sala (L-164).
 *
 * ── A QUEIXA QUE ORIGINOU ISTO, E ELA TEM DUAS METADES ────────────────────
 *
 *   > "olha o último vídeo do nosso layout pra pré-selecionar: uma loucura,
 *   >  bagunça total, muito feio e confuso"
 *   > "o cara só clica, já informa o nível, quais criaturas tem lá e etc."
 *
 * A tela mostra DEMAIS onde a escolha é simples (o cartão da criatura: dez
 * informações em 90 px) e DE MENOS onde a escolha é difícil (a rota: um chip
 * com o nome do bioma, e nada mais).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, e não é organização ──────────────────────
 *
 * As duas respostas moravam dentro de `innerHTML`, e o portão Q2 já cobrou o
 * preço disso QUATRO vezes no bloco anterior: defeito plantado que apaga uma
 * frase passa, porque não há como ler a resposta sem montar um navegador.
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * Então elas saíram para camada 0, e este arquivo afirma o RESULTADO.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  MODOS, MODO_PADRAO, MOSTRA_ATE,
  camposDoCartao, modoValido, mostra, resumoDaRota, resumoDaEvolucao,
  mostraNivelSolto,
} from '../app/modules/idle-escolha.mjs';
import { nivelDoEstagio, ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* Uma criatura como o `estagioMaximo` a lê: só o nível importa aqui. */
const bicho = nivel => ({ id: 'c' + nivel, dex: 1, nivel });

export function suite() {
  const s = criarSuite('idle-escolha');

  /* ══ O CARTÃO: TRÊS PERGUNTAS, E O RESTO É FICHA ══════════════════════ */

  /* ── AS DUAS QUEIXAS SÃO VERDADEIRAS (1.27f) ─────────────────────────
     A versão anterior deste teste afirmava `compacto.length <= 3` e proibia
     `forma` e `evolucao`. O que ela afirmava não estava errado sobre o que
     tinha sido DECIDIDO; estava errado sobre o porquê — eu li "reduza a
     quantidade" onde o dono disse "isto está confuso".

       04/09  "uma loucura, bagunça total, muito feio e confuso"
       10/09  "você removeu as informações de stats, lv que evolui etc."

     A regra que sobrevive às duas: o COMPACTO carrega o que a HORA DE ESCOLHER
     pergunta, a FICHA guarda o que só se CONSULTA, e a dobra continua
     existindo. Contar campos media a coisa errada. */
  s.teste('o cartão abre COMPACTO, e o compacto responde o que a escolha pergunta', () => {
    igual(MODO_PADRAO, 'compacto',
      'o cartão abre na ficha completa — e é ela que o dono chamou de bagunça');

    const compacto = camposDoCartao('compacto');
    for (const campo of ['nivel', 'foco', 'forma', 'evolucao'])
      ok(compacto.includes(campo),
        `o compacto perdeu "${campo}", e ele é uma das quatro perguntas da ` +
        'hora de escolher: quem é, em que nível está, o que soma em combate, ' +
        'e quando muda de forma. As duas últimas o dono pediu DE VOLTA em ' +
        '10/09, depois de eu as ter escondido');

    for (const ficha of ['potencial', 'natureza', 'xp'])
      ok(!compacto.includes(ficha),
        `"${ficha}" voltou ao cartão compacto. Ele não decide nada AGORA: xp é ` +
        'progresso dentro do nível, e potencial e natureza não mudam entre uma ' +
        'run e a seguinte. Atravessar isso onze vezes seguidas é custo sem ' +
        'decisão — e foi assim que o cartão chegou a dez informações');

    ok(camposDoCartao('compacto').length < camposDoCartao('ficha').length,
      'o compacto e a ficha têm o mesmo tamanho: a dobra deixou de dobrar, e ' +
      'o botão que alterna passou a não levar a lugar nenhum');
  });

  /* ── E NADA FOI APAGADO ──────────────────────────────────────────────
     O dono pediu a forma, o potencial e a natureza em blocos anteriores.
     ESCONDER e APAGAR não são a mesma coisa, e a diferença é o que a regra de
     escopo deste projeto protege. */
  s.teste('a ficha devolve a tela de antes, INTEIRA', () => {
    const ficha = camposDoCartao('ficha');
    for (const campo of ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao'])
      ok(ficha.includes(campo),
        `a ficha perdeu "${campo}". Reduzir o cartão não pode APAGAR o que o ` +
        'dono pediu antes — o modo ficha é a prova de que foi uma dobra');

    /* A ficha CONTÉM o compacto: se ela não contivesse, trocar de modo faria
       o jogador perder de vista o que estava lendo. */
    for (const campo of camposDoCartao('compacto'))
      ok(ficha.includes(campo),
        `a ficha não mostra "${campo}", que o compacto mostra — trocar de modo ` +
        'faria informação SUMIR, e o jogador procuraria o defeito');
  });

  s.teste('um modo inventado cai no padrão, e não numa tela vazia', () => {
    for (const lixo of ['inventado', null, undefined, '', 42, {}])
      igual(modoValido(lixo), MODO_PADRAO,
        `o modo ${JSON.stringify(lixo)} não caiu no padrão. Estado guardado é ` +
        'editável por quem quiser, e um cartão sem campo nenhum é a aba ' +
        'quebrada por uma string no localStorage');
    /* AFIRMA A CONCORDÂNCIA, E NÃO A TABELA (1.27f). A versão anterior
       escrevia as respostas à mão — `ok(!mostra('compacto','forma'))` —, e a
       tabela é uma decisão de PRODUTO: ela mudou em 10/09 e levou o teste
       junto. A regra que o `mostra` tem de cumprir é outra, e essa não muda:
       ele concorda com o `camposDoCartao`, seja qual for a tabela. */
    for (const modo of [...MODOS, 'inventado'])
      for (const campo of ['nivel', 'foco', 'forma', 'evolucao',
                           'xp', 'potencial', 'natureza', 'nada'])
        igual(mostra(modo, campo), camposDoCartao(modo).includes(campo),
          `o \`mostra\` discorda do \`camposDoCartao\` em (${modo}, ${campo}) — ` +
          'duas verdades sobre o mesmo cartão, e a tela usa a errada');
  });

  s.teste('o nível aparece UMA vez — a linha solta cala quando a barra de XP fala', () => {
    /* A barra de XP já traz `NV 36 · 58%` na frente dela. Com as duas, o número
       saía repetido a quatro pixels de si mesmo, e repetição num cartão de
       104 px lê como erro de montagem — não como ênfase. */
    ok(mostraNivelSolto('compacto'),
      'o compacto não mostra o nível em lugar nenhum: ele não tem barra de XP, ' +
      'e a linha solta é a única que responde "em que nível está"');
    ok(!mostraNivelSolto('ficha'),
      'a ficha mostra o nível DUAS vezes — na linha solta e na frente da barra ' +
      'de XP, a quatro pixels de si mesmo. Na ficha manda a barra, que diz mais');

    /* A regra, e não a tabela: quem tem barra de XP não repete o número. */
    for (const modo of [...MODOS, 'inventado'])
      igual(mostraNivelSolto(modo), mostra(modo, 'nivel') && !mostra(modo, 'xp'),
        `o \`mostraNivelSolto\` discorda da própria regra em "${modo}" — e a ` +
        'tela passaria a ter uma segunda verdade sobre quantos níveis mostrar');
  });

  /* ══ O RECORTE DA EVOLUÇÃO (1.27f) ═══════════════════════════════════
     O selo dizia `"evolui com nível 32"` — 19 caracteres que quebram em TRES
     linhas em Press Start 2P e deixam o selo maior que o retrato. O recorte
     mora em camada 0 para ser pego em Node: mutante de navegador custa ~30 s,
     o mesmo mutante aqui custa ~0,1 s. */

  s.teste('o recorte da evolução cabe no cartão, e o NÚMERO é a manchete', () => {
    const tabela = [
      ['nível 32',                  'NV 32'],
      ['vínculo 40',                '♥ 40'],
      ['nível 20 e vínculo 30',     'NV 20 ♥ 30'],
      ['nível 16 e Pedra da Água',  'NV 16 ◆'],
    ];
    for (const [frase, esperado] of tabela)
      igual(resumoDaEvolucao(frase), esperado,
        `"${frase}" virou algo que não é "${esperado}". O selo tem 104 px e a ` +
        'frase por extenso quebra em três linhas — o `title` é que guarda a ' +
        'frase inteira, e ele continua guardando (D-067)');

    /* O NÍVEL NÃO PODE SUMIR DO RECORTE. "o lv que evolui" foi literalmente o
       que o dono pediu de volta em 10/09; um recorte que come o número
       responde a queixa com a queixa. */
    for (const [frase] of tabela.filter(([f]) => f.includes('nível')))
      ok(/\d/.test(resumoDaEvolucao(frase).split('♥')[0]),
        `"${frase}" perdeu o número do nível no recorte, e "o lv que evolui" ` +
        'foi o pedido de 10/09 em palavras do dono');
  });

  s.teste('o losango só aparece ao lado de um NÚMERO — sozinho, o item vem por extenso', () => {
    igual(resumoDaEvolucao('Pedra do Fogo'), 'Pedra do Fogo',
      'o item sozinho virou losango. Ali não há manchete para o símbolo ' +
      'acompanhar: ele seria a informação inteira, e um losango não diz QUAL ' +
      'pedra');

    /* A frase que este código NÃO SABE LER volta inteira — é o caso que
       originou a regra. Um requisito que algum bloco futuro invente virava um
       losango mudo, indistinguível de "falta uma pedra".

       **Um símbolo que serve para tudo não diz nada.** */
    for (const estranha of ['algo que ninguém lê', '?', 'amizade máxima de noite'])
      igual(resumoDaEvolucao(estranha), estranha,
        `"${estranha}" virou um símbolo mudo. O recorte só resume o que ` +
        'reconhece; o que ele não lê, ele repete — calar é pior que ser longo');

    ok(resumoDaEvolucao('nível 16 e Pedra da Água').includes('◆'),
      'com um número ao lado, o item DEVE virar losango: ali a manchete é o ' +
      'número, e o símbolo só avisa que falta mais uma coisa');
  });

  s.teste('sem evolução pendente o selo não escreve nada', () => {
    for (const vazio of ['', null, undefined, '   ', 42, {}])
      igual(resumoDaEvolucao(vazio), '',
        `${JSON.stringify(vazio)} virou texto no cartão. "não evolui" escrito ` +
        'em toda linha final encheria a tela com o que ninguém procura');
  });

  /* ══ A SALA: A ROTA RESPONDE ANTES DO CLIQUE ══════════════════════════ */

  s.teste('a rota diz QUEM mora nela, e não só o nome do bioma', () => {
    const r = resumoDaRota(kanto, 'floresta', [bicho(5)]);
    ok(r.quantos > 0,
      'a rota não sabe dizer quantas criaturas moram nela — o jogador teria ' +
      'de clicar nas onze para descobrir, e depois lembrar');
    ok(r.moradores.length > 0, 'a rota não devolve ninguém para desenhar');
    for (const dex of r.moradores)
      ok(Number.isInteger(dex) && dex > 0,
        `a lista de moradores tem um dex inválido (${dex}) — ele viraria um ` +
        'quadrado transparente no cartão');

    /* E ela é a MESMA lista que a prévia usa: duas telas com listas próprias
       discordariam sobre quem mora ali, e a que mente é sempre a da tela. */
    const bruto = elencoDoEstagio(kanto, 'floresta', r.estagio);
    const doMotor = [...(bruto.comuns ?? []), ...(bruto.chefes ?? [])].map(x => x.dex);
    igual(r.quantos, doMotor.length,
      'a contagem da sala divergiu do elenco do motor');
    igual(r.moradores.join(','), doMotor.slice(0, MOSTRA_ATE).join(','),
      'a sala reordenou os moradores — ela e a prévia mostrariam o bioma em ' +
      'ordens diferentes, e o jogador acharia que são lugares diferentes');
  });

  /* ── E A FAIXA É A ÚNICA LINHA QUE DIFERE (S951) ─────────────────────
   *
   * O primeiro desenho da sala pôs "pede nv 31" em cada cartão, e os onze
   * disseram exatamente a mesma coisa — porque tinham de dizer: o nível é do
   * ESTÁGIO, e o estágio é da COLEÇÃO, não do lugar.
   *
   *   > Informação repetida em todas as opções não é informação: é ruído com
   *   > aparência de dado. Eu escrevi o aviso contra isso no comentário do
   *   > módulo e construí o mesmo defeito com outro número.
   *
   * O que DIFERE é quem mora e de que faixa eles são — e é isso que decide se
   * vale a pena ir. Sem a faixa, a sala volta a ser uma lista de botões. */
  s.teste('a faixa das rotas DIFERE entre elas, e é o que faz a sala informar', () => {
    const vistas = new Set();
    for (const b of (kanto.biomas ?? [])) {
      const r = resumoDaRota(kanto, b.id, [bicho(90)]);
      ok(Array.isArray(r.faixas) && r.faixas.length > 0,
        `a rota "${b.rotulo}" não diz de que faixa são os moradores dela — o ` +
        'cartão fica com o nome do bioma e mais nada, que era o defeito');
      vistas.add(r.faixas.join('·'));
    }
    ok(vistas.size > 1,
      `as onze rotas devolveram a MESMA faixa (${[...vistas][0]}). Uma linha ` +
      'igual nas onze não ajuda a escolher nada — é o "pede nv 31" de volta');

    /* E ela sai do elenco, e não de uma tabela escrita à parte. */
    const r = resumoDaRota(kanto, 'floresta', [bicho(1)]);
    const bruto = elencoDoEstagio(kanto, 'floresta', r.estagio);
    const doMotor = [...(bruto.comuns ?? []), ...(bruto.chefes ?? [])]
      .map(x => x.raridade).filter(Boolean);
    for (const f of r.faixas)
      ok(doMotor.includes(f),
        `a sala anunciou a faixa "${f}", que não existe no elenco daquele ` +
        'estágio — ela promete uma raridade que não mora ali');
    /* Sem repetição: a lista é o CONJUNTO das faixas, e não uma por morador. */
    igual(r.faixas.length, new Set(r.faixas).size,
      'a mesma faixa aparece duas vezes na linha do cartão');
  });

  s.teste('a rota diz QUE NÍVEL ela pede, e o número sai do motor', () => {
    const r = resumoDaRota(kanto, 'floresta', [bicho(5)]);
    igual(r.nivelPedido, nivelDoEstagio(r.estagio),
      'o nível pedido foi calculado à parte, e não perguntado ao motor — duas ' +
      'contas para o mesmo limiar divergem na primeira calibração');
  });

  /* ── O ESTÁGIO MOSTRADO É O QUE ELE PODE ENTRAR ──────────────────────
     Um jogador de nível 40 lendo "pede nível 5" nas onze rotas não recebe
     informação nenhuma. A pergunta que ele faz é "até onde eu consigo ir
     aqui?", e é essa que a sala responde. */
  s.teste('a sala responde pelo estágio mais FUNDO que a coleção abre', () => {
    const novato = resumoDaRota(kanto, 'floresta', [bicho(1)]);
    igual(novato.estagio, 1, 'quem não abriu nada não está vendo o estágio 1');

    const veterano = resumoDaRota(kanto, 'floresta', [bicho(90)]);
    ok(veterano.estagio > novato.estagio,
      `o veterano vê o mesmo estágio ${veterano.estagio} do novato — a sala ` +
      'diria "pede nível 5" para quem está no 90, e isso não informa nada');
    ok(veterano.nivelPedido > novato.nivelPedido,
      'o nível pedido não acompanhou o estágio');
    ok(veterano.estagio <= ESTAGIOS_POR_BIOMA,
      `a sala prometeu o estágio ${veterano.estagio}, e o bioma tem ` +
      `${ESTAGIOS_POR_BIOMA} — ela ofereceria o que não existe`);
  });

  /* ── E O QUE NÃO COUBE É DITO, e não cortado em silêncio ─────────────
     Mostrar três de seis e calar sobre isso faz o jogador achar que o bioma
     tem três. Cortar em silêncio é mentir por omissão. */
  s.teste('o que não cabe no cartão vira um número, e não some', () => {
    const r = resumoDaRota(kanto, 'floresta', [bicho(5)], { ate: 2 });
    igual(r.moradores.length, 2, 'o recorte não respeitou o que cabe');
    igual(r.resto, r.quantos - 2,
      'a sala cortou moradores sem dizer quantos ficaram de fora — o jogador ' +
      'leria o recorte como se fosse o bioma inteiro');

    const inteiro = resumoDaRota(kanto, 'floresta', [bicho(5)], { ate: 99 });
    igual(inteiro.resto, 0, 'sobrou resto onde tudo coube');
    igual(inteiro.moradores.length, inteiro.quantos, 'a lista inteira não veio');
  });

  s.teste('bioma que não existe não estoura, e não inventa morador', () => {
    const r = resumoDaRota(kanto, 'lugar-nenhum', [bicho(5)]);
    igual(r.quantos, 0, 'um bioma inexistente devolveu moradores');
    igual(r.moradores.length, 0, 'um bioma inexistente devolveu gente para desenhar');
    igual(r.resto, 0, 'um bioma inexistente devolveu resto');
    ok(r.nivelPedido > 0, 'o nível pedido virou zero, e a sala mostraria "pede nível 0"');

    /* Estado a meio carregar chega assim, e a aba não pode cair por isso. */
    for (const vazio of [null, undefined, []])
      igual(resumoDaRota(kanto, 'floresta', vazio).estagio, 1,
        'sem criatura nenhuma a sala não caiu no estágio 1');
  });

  /* Todas as rotas do pack respondem — uma que cala é um buraco na sala, e o
     jogador leria "este lugar não tem nada" sobre um bioma cheio. */
  s.teste('as ONZE rotas respondem, e nenhuma fica muda', () => {
    for (const b of (kanto.biomas ?? [])) {
      const r = resumoDaRota(kanto, b.id, [bicho(5)]);
      ok(r.quantos > 0,
        `a rota "${b.rotulo}" não tem morador nenhum a mostrar — ela apareceria ` +
        'vazia na sala, e o jogador leria isso como "não tem nada aqui"');
      ok(r.moradores.length >= Math.min(MOSTRA_ATE, r.quantos),
        `a rota "${b.rotulo}" devolveu menos moradores do que cabem no cartão`);
    }
  });

  return s;
}
