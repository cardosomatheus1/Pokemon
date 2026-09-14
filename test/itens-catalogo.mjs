/* Q1/Q3/Q6 · O CATÁLOGO DE ITENS E AS QUATRO PORTAS (bloco 1.12).
 *
 * ── A AFIRMAÇÃO QUE CARREGA TUDO ─────────────────────────────────────────
 *
 * O dono foi explícito sobre o que a loja precisa entregar:
 *
 *   > "A LOJA MONETIZADA PRECISA VIRAR LUCRO, MESMO QUE BARATO, NEM QUE UM
 *   >  OUTFIT CUSTE APENAS 5 REAIS"
 *
 * E este arquivo existe para que ela POSSA vender muito. A regra:
 *
 *   > **A loja de dinheiro real vende o que se VÊ e o que se ESCOLHE. Nunca o
 *   > que DECIDE uma batalha, e nunca o que ANDA MAIS RÁPIDO.**
 *
 * Não é conformidade nem cautela: é o que faz a loja durar. Numa loja que vende
 * poder, quem não compra perde, e quem perde sai — e uma base que sai não
 * compra a próxima skin. Numa loja que vende identidade, ninguém PRECISA
 * comprar, e por isso mais gente compra por gosto.
 *
 * A afirmação 1 é a linha inteira, e ela é a única do projeto que reprova por
 * um item só.
 *
 * ── AS OUTRAS ────────────────────────────────────────────────────────────
 *
 * 2. **TODO ITEM TEM UMA PORTA, E UMA SÓ.** Duas portas para o mesmo item é a
 *    mais barata das duas vencendo, e a outra virando decoração.
 * 3. **A PEDRA NÃO SE COMPRA.** Decisão do dono. É o que faz escolher a rota
 *    importar — comprar tiraria o mapa da decisão.
 * 4. **QUANTO MAIS PODER, MAIS LONGE DA SORTE.** Um jogador azarado nunca pode
 *    ficar atrás de um sortudo naquilo que decide batalha.
 * 5. **O QUE ACELERA TEM TETO DE USO** (L-096), e é o único que tem.
 * 6. **O QUE EU NÃO SEI FICA MARCADO.** Ícone não identificado é `falta`, e o
 *    número aparece — para que "faltam sete" nunca vire "está pronto".
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { custoDoItem } from '../engine/estilhaco.mjs';
import { TODOS, PEDRAS, HELD, BOLAS_EXTRA, BOLAS_DO_PACK, NOSSOS,
         PORTAS, FAIXAS, SEM_ICONE } from '../content/itens_v1.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { previaDeItens } from '../engine/drops.mjs';
import { cabeNoEstagio } from '../engine/estagios.mjs';
import { pesoDaRaridade } from '../engine/expedicao.mjs';

export function suite() {
  const s = criarSuite('itens-catalogo');

  /* --- 1 · A LINHA DO §P5 ------------------------------------------------ */

  s.teste('§P5 · NENHUM item deste catálogo se compra com dinheiro real', () => {
    const vendidos = TODOS.filter(i => i.porta === 'dinheiro');
    igual(vendidos.length, 0,
      `${vendidos.map(i => i.nome).join(', ')} estão à venda por dinheiro real. ` +
      'Todo item desta lista DECIDE batalha — uma Choice Band vendida por cinco ' +
      'reais é 50% de ataque comprado, e num jogo em que o que se farma é ' +
      'vendável isso é dinheiro comprando dinheiro. O que a loja pode vender é a ' +
      'APARÊNCIA do item, nunca o item: uma bola com acabamento próprio que ' +
      'captura exatamente igual é cosmético puro, e cosmético é o que mais vende ' +
      'justamente porque ninguém PRECISA comprar.');
  });

  s.teste('§P5 · e nenhum item tem preço em dinheiro, nem escondido', () => {
    for (const i of TODOS) {
      const chaves = Object.keys(i).filter(k => /real|brl|reais|centavo|dinheiro/i.test(k));
      igual(chaves.length, 0,
        `"${i.nome}" tem o campo ${chaves.join(', ')}. Um preço em dinheiro só ` +
        'chega ao catálogo por engano, e engano com preço vira produto.');
    }
  });

  /* --- 2 · UMA PORTA, E UMA SÓ ------------------------------------------ */

  s.teste('todo item tem exatamente uma porta declarada, e ela é conhecida', () => {
    for (const i of TODOS) {
      ok(PORTAS.includes(i.porta),
        `"${i.nome}" tem porta "${i.porta}", que não existe. As portas são: ` +
        PORTAS.join(', '));
      ok(i.nome && i.id && i.texto,
        `"${i.id}" está incompleto — todo item precisa de id, nome e o que ele faz`);
      ok(FAIXAS.includes(i.faixa), `"${i.nome}" tem faixa "${i.faixa}", que não existe`);
    }
  });

  s.teste('as faixas do catálogo são AS MESMAS do elenco', () => {
    const doPack = (kanto.raridade ?? []).map(([id]) => id);
    for (const f of FAIXAS)
      ok(doPack.includes(f),
        `a faixa "${f}" não existe no pack. Item e criatura têm de usar a MESMA ` +
        'escala de raridade: com duas escalas, o estágio precisaria de duas ' +
        'tabelas, e "raro" passaria a significar coisas diferentes na mesma tela.');
  });

  s.teste('nenhum id e nenhum ícone se repete', () => {
    const ids = TODOS.map(i => i.id);
    const repetido = ids.find((v, n) => ids.indexOf(v) !== n);
    igual(repetido, undefined, `o id "${repetido}" aparece duas vezes`);
    const ic = TODOS.filter(i => i.comoAchei !== 'falta').map(i => i.icone);
    const ri = ic.find((v, n) => ic.indexOf(v) !== n);
    igual(ri, undefined,
      `dois itens confirmados apontam para o ícone ${ri}. A folha não tem o mesmo ` +
      'desenho duas vezes — um dos dois está errado, e um ícone errado é pior ' +
      'que nenhum: ele parece certo.');
  });

  s.teste('os ids do catálogo não colidem com os que o pack já declara', () => {
    const doPack = [...(kanto.bolas ?? []), ...(kanto.itens ?? [])].map(i => i.id);
    for (const i of TODOS)
      if (doPack.includes(i.id))
        /* REALVADO: o catálogo cresceu. Pedras, bolas e a nossa arte declaram
           de propósito o MESMO id que o pack — o pack diz o que o item FAZ (o
           multiplicador da bola, a fonte da pedra), o catálogo diz que CARA ele
           tem e por qual porta entra. Dois papéis, um id, e é isso que os liga.

           O que continua proibido é um item de FUNÇÃO nova nascer com id de
           outro: aí sim seriam dois donos, e a bolsa creditaria um enquanto a
           tela lê o outro. */
        ok([...PEDRAS, ...BOLAS_EXTRA, ...BOLAS_DO_PACK, ...NOSSOS].some(x => x.id === i.id),
          `"${i.id}" existe no pack E no catálogo, e não é pedra, bola nem arte ` +
          'nossa. Dois donos para o mesmo id é a bolsa creditando um e a tela ' +
          'lendo o outro.');
  });

  /* --- 3 · A PEDRA NÃO SE COMPRA ---------------------------------------- */

  s.teste('toda pedra evolutiva cai, e só cai', () => {
    for (const p of PEDRAS) {
      igual(p.porta, 'drop',
        `"${p.nome}" tem porta "${p.porta}". Decisão do dono: pedra evolutiva não ` +
        'se compra, em moeda nenhuma. É o que faz escolher a rota importar — a ' +
        'pedra de uma linha cai num lugar só, e comprar tiraria o mapa da decisão.');
      ok(p.fonte, `"${p.nome}" não diz em que bioma cai — e o bioma é a razão dela`);
      ok((kanto.biomas ?? []).some(b => b.id === p.fonte),
        `"${p.nome}" cai em "${p.fonte}", que não é um bioma deste pack`);
    }
  });

  s.teste('as pedras se espalham pelos biomas, e não se amontoam em um', () => {
    const onde = {};
    for (const p of PEDRAS) onde[p.fonte] = (onde[p.fonte] ?? 0) + 1;
    /* UMA POR BIOMA, e não "no máximo duas". A primeira versão aceitava duas, e
       o defeito S689 passou por essa folga: mover a Pedra da Água para o Vulcão
       dava duas lá e não reprovava nada. O desenho é dez pedras em dez lugares —
       cada bioma tem a SUA, e é ela que dá razão a ele. */
    const maior = Math.max(...Object.values(onde));
    igual(maior, 1,
      `um bioma concentra ${maior} pedras: ${JSON.stringify(onde)}. Cada bioma tem ` +
      'a SUA pedra, e é ela que dá razão para visitá-lo. Duas no mesmo lugar ' +
      'deixam outro bioma sem razão nenhuma — e um mapa com lugar que ninguém ' +
      'escolhe é um mapa que virou decoração.');
    igual(Object.keys(onde).length, PEDRAS.length,
      `${PEDRAS.length} pedras em ${Object.keys(onde).length} biomas — as contas ` +
      'não fecham, então algum bioma ficou sem ou algum recebeu duas.');
  });

  /* --- 4 · QUANTO MAIS PODER, MAIS LONGE DA SORTE ----------------------- */

  s.teste('§Q4 · o que mais decide batalha NÃO cai por sorte', () => {
    /* Os Choice dão +50% de um atributo — é o maior salto do catálogo. Se
       caíssem no farm, um jogador sortudo abriria vantagem sobre um azarado
       sem que nenhum dos dois tivesse feito nada diferente. */
    for (const id of ['choiceband', 'choicespecs', 'choicescarf', 'focussash']) {
      const i = TODOS.find(x => x.id === id);
      ok(i, `"${id}" sumiu do catálogo`);
      ok(i.porta !== 'drop',
        `"${i.nome}" cai por sorte. Ele muda uma batalha em 50%: um jogador ` +
        'azarado ficaria atrás de um sortudo naquilo que decide o combate, e ' +
        'nenhum dos dois teria feito nada diferente. O que decide se CONQUISTA.');
    }
  });

  s.teste('o que vem do baú diz de que andar, e os andares sobem', () => {
    const baus = TODOS.filter(i => i.porta === 'bau');
    ok(baus.length >= 4, 'quase nada vem da Torre — ela precisa ter o que dar');
    for (const i of baus) {
      ok(Number.isFinite(i.andarMinimo) && i.andarMinimo >= 1,
        `"${i.nome}" vem do baú e não diz de que andar`);
      ok(i.andarMinimo <= 13,
        `"${i.nome}" pede o andar ${i.andarMinimo}, e a Torre tem 13`);
    }
    const alturas = baus.map(i => i.andarMinimo);
    ok(new Set(alturas).size >= 4,
      'vários itens da Torre saem do mesmo andar — os andares deixam de ser uma ' +
      'progressão e viram uma porta só com tudo atrás.');
  });

  /* ── O PREÇO SAIU DO CATÁLOGO NO 1.29 ──────────────────────────────────
     Cada item declarava o próprio `custoEssencia`, escrito à mão. Com a curva
     do Estilhaço aprovada, passaram a existir DUAS contas para o mesmo preço.

       > Duas contas para o mesmo número divergem no dia em que uma for
       > calibrada, e a que mente é sempre a que ninguém testa.

     O catálogo voltou a dizer o que o item É; quanto ele custa é do motor, e a
     FAIXA — que já estava aqui — é o que liga os dois. */
  s.teste('o que se troca tem preço, e ele vem da FAIXA e não do catálogo', () => {
    const trocas = TODOS.filter(i => i.porta === 'troca');
    ok(trocas.length >= 5, 'quase nada se troca — a Essência não teria o que comprar');
    for (const i of trocas) {
      ok(!('custoEssencia' in i),
        `"${i.nome}" voltou a declarar o próprio preço — são duas contas de novo`);
      ok(custoDoItem(i.faixa) > 0, `"${i.nome}" não tem preço pela faixa`);
    }
    /* O muitoRaro tem de custar mais que o raro. Sem isso a faixa não
       significa nada, e o jogador aprende a ignorá-la. */
    const preco = f => custoDoItem(f);
    ok(preco('muitoRaro') > preco('raro'),
      `o muito raro custa ${preco('muitoRaro')} e o raro custa ${preco('raro')}: ` +
      'a faixa virou um rótulo que o preço desmente');
  });

  /* --- 5 · O TETO DE USO (L-096) ---------------------------------------- */

  s.teste('só o que ACELERA tem teto de uso, e ele tem', () => {
    for (const id of ['expshare', 'luckyegg']) {
      const i = TODOS.find(x => x.id === id);
      ok(i && i.usosPorRun === 1,
        `"${id}" não tem teto de uso. O dono foi explícito: *"o exp share só pode ` +
        'ser usado em 1 run, seja de 45min, 3hrs ou 8hrs"*. São os únicos itens ' +
        'que aceleram progressão — sem teto, eles deixam de ser escolha e viram ' +
        'obrigação, e quem não os tem joga um jogo mais lento por não ter sorte.');
    }
    /* E o teto não se espalha: item que não acelera não pode ter teto, senão o
       teto vira um imposto genérico e para de significar alguma coisa. */
    const comTeto = TODOS.filter(i => i.usosPorRun !== undefined).map(i => i.id);
    igual(comTeto.sort().join(','), 'expshare,luckyegg',
      `com teto de uso: ${comTeto.join(', ')}. O teto é para o que ACELERA, e só. ` +
      'Espalhado, ele deixa de ser uma regra e vira um imposto.');
  });

  /* --- 5b · O ESTÁGIO FILTRA O ITEM, COMO FILTRA A CRIATURA ------------- */

  /* Esta afirmação faltava, e o S690 passou por causa disso: apagar o filtro de
     estágio na poça de itens não reprovava nada. A poça é a ponta em que três
     blocos se encontram — o nível (1.14) abre o estágio (1.10), e o estágio
     decide qual item cai. Sem guarda aqui, o laço se desfaz numa linha. */
  s.teste('§Q4 · a pedra exige PROFUNDIDADE, e não só o bioma certo', () => {
    const raso = previaDeItens(kanto, { bioma: 'vulcao', estagio: 1, vies: 0,
      cabe: cabeNoEstagio, peso: pesoDaRaridade });
    ok(!raso.some(i => i.id === 'fogo'),
      'a Pedra do Fogo cai no estágio 1 do Vulcão. Ela é `raro`, e o estágio 1 ' +
      'só tem comum e incomum — se ela cai lá, o estágio parou de filtrar item, ' +
      'e o laço entre nível, profundidade e evolução se desfaz numa linha.');

    const fundo = previaDeItens(kanto, { bioma: 'vulcao', estagio: 4, vies: 0,
      cabe: cabeNoEstagio, peso: pesoDaRaridade });
    ok(fundo.some(i => i.id === 'fogo'),
      'a Pedra do Fogo NÃO cai nem no estágio 4 do Vulcão — então ela não cai em ' +
      'lugar nenhum, e a linha evolutiva do fogo ficou impossível.');
  });

  s.teste('só o que tem porta de drop entra na poça do saque', () => {
    for (const bioma of (kanto.biomas ?? []).map(b => b.id))
      for (let est = 1; est <= 4; est++) {
        const poca = previaDeItens(kanto, { bioma, estagio: est, vies: 0,
          cabe: cabeNoEstagio, peso: pesoDaRaridade });
        for (const i of poca)
          igual(i.porta, 'drop',
            `"${i.nome}" (porta ${i.porta}) caiu no saque de ${bioma}/${est}. ` +
            'Um item que CAI e também se COMPRA tem a porta mais barata vencendo, ' +
            'e a outra vira decoração — e a distinção econômica inteira do bloco ' +
            'é justamente uma porta por item.');
      }
  });

  /* --- 6 · O QUE EU NÃO SEI FICA MARCADO -------------------------------- */

  s.teste('todo ícone declarado cabe na folha, e o que falta está marcado', () => {
    /* 23 colunas × 17 linhas: 16 da folha do dono, e uma que `normalizar-itens`
       acrescenta com a NOSSA arte — para o espaço de índice continuar sendo um. */
    const CELULAS = 23 * 17;
    for (const i of TODOS) {
      ok(Number.isInteger(i.icone) && i.icone >= 0 && i.icone < CELULAS,
        `"${i.nome}" aponta para o ícone ${i.icone}, fora da folha de ${CELULAS} células`);
      ok(['medido', 'olhado', 'ordem', 'falta', 'nosso'].includes(i.comoAchei),
        `"${i.nome}" não diz COMO o ícone foi determinado. Já errei duas vezes ` +
        'identificando por posição — e uma delas declarei a Poké Ball errada. ' +
        'Identificação por posição é um palpite com aparência de método, e por ' +
        'isso ela fica marcada como o que é.');
    }
    /* ── ERA UM TETO DE 8; VIROU ZERO (1.12b) ────────────────────────────
       O teto existia enquanto sete itens estavam sem arte: ele impedia que a
       lista CRESCESSE. Fechada a L-104 — o dono mandou as sete artes e elas
       entraram nas casas 371 a 377 —, o teto passou a ser folga, e folga na
       régua é defeito passando: um item novo entraria sem arte e o número
       ficaria em 1, dentro do teto, sem ninguém ver.

       Zero é a afirmação que vale agora: TODO item do catálogo tem arte, e
       item novo sem arte reprova na hora de nascer. */
    igual(SEM_ICONE.length, 0,
      `${SEM_ICONE.length} item(ns) sem ícone: ${SEM_ICONE.join(', ')}. ` +
      'A L-104 fechou com todos os 40 servidos — um item novo entra com arte, ' +
      'ou entra com "?" na wiki, e "?" é o que este teste existe para impedir. ' +
      'Para acrescentar arte nova: ponha o PNG na pasta de ícones do dono, ' +
      'registre em `SETE_DA_L104` (a lista é a ordem do índice) e rode ' +
      '`node tools/normalizar-itens.mjs`.');
  });

  return s;
}
