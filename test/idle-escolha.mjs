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
  camposDoCartao, modoValido, mostra, resumoDaRota,
} from '../app/modules/idle-escolha.mjs';
import { nivelDoEstagio, ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* Uma criatura como o `estagioMaximo` a lê: só o nível importa aqui. */
const bicho = nivel => ({ id: 'c' + nivel, dex: 1, nivel });

export function suite() {
  const s = criarSuite('idle-escolha');

  /* ══ O CARTÃO: TRÊS PERGUNTAS, E O RESTO É FICHA ══════════════════════ */

  s.teste('o cartão abre COMPACTO, e o compacto responde só o que a escolha pede', () => {
    igual(MODO_PADRAO, 'compacto',
      'o cartão abre na ficha completa — e é ela que o dono chamou de bagunça');

    const compacto = camposDoCartao('compacto');
    for (const campo of ['nivel', 'foco'])
      ok(compacto.includes(campo),
        `o compacto perdeu "${campo}", e ele é uma das três respostas que a ` +
        'hora de escolher pede');

    for (const ficha of ['forma', 'potencial', 'natureza', 'xp', 'evolucao'])
      ok(!compacto.includes(ficha),
        `"${ficha}" continua no cartão compacto. Dez informações em 90 px é ` +
        'exatamente o que foi reprovado — e ficha se consulta, não se ' +
        'atravessa onze vezes seguidas');

    ok(compacto.length <= 3,
      `o compacto ficou com ${compacto.length} campos. Ele existe para caber ` +
      'numa olhada, e o número é a prova disso');
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
    ok(mostra('compacto', 'nivel'), 'o \`mostra\` discorda do \`camposDoCartao\`');
    ok(!mostra('compacto', 'forma'), 'o \`mostra\` discorda do \`camposDoCartao\`');
    ok(mostra('ficha', 'forma'), 'o \`mostra\` discorda do \`camposDoCartao\`');
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
