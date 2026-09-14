/* A CONFIRMAÇÃO DA EXPEDIÇÃO — bloco 1.24.
 *
 * Esta suíte nasceu de um NaN que chegou à tela. `custoDe(perfil, tamanho)`
 * multiplica pelo tamanho da equipe; eu chamei `custoDe(perfil)` e o cartão
 * desenhou **"89 → NaN"**.
 *
 *   > O número existia, estava errado, e nenhum teste falava sobre ele —
 *   > porque nenhum teste desenhava aquele cartão.
 *
 * Foi a captura que mostrou. O portão que faltava é este: o resumo é PURO, e
 * um resumo puro se confere sem navegador.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { resumoDa, duracaoEmPalavras } from '../app/modules/expedicao-resumo.mjs';
import { PERFIS, STAMINA_MAX } from '../engine/expedicao.mjs';

const AGORA = 1_800_000_000_000;
const cria = (id, dex, stamina) => ({
  id, dex, nivel: 12, stamina, staminaEm: AGORA, iv: [1, 1, 1, 1, 1, 1],
});
const estado = (...cs) => ({ criaturas: cs, bolsa: {}, expedicoes: [], registro: {} });

export function suite() {
  const s = criarSuite('idle-confirma');

  s.teste('todo número do cartão é um NÚMERO', () => {
    /* A afirmação que faltava, escrita como a falha se apresentou: um NaN
       atravessa `toFixed`, `Math.round` e interpolação sem reclamar, e só
       aparece na tela. */
    for (const perfil of Object.keys(PERFIS)) {
      const E = estado(cria('a', 7, 89), cria('b', 37, 100));
      const r = resumoDa(E, { bioma: 'floresta', perfil, equipe: ['a', 'b'], agora: AGORA });
      ok(Number.isFinite(r.custo), `o custo da ${perfil} saiu ${r.custo}`);
      ok(Number.isFinite(r.piso), `o piso saiu ${r.piso}`);
      for (const m of r.membros) {
        ok(Number.isFinite(m.antes), `a stamina de ${m.nome} saiu ${m.antes}`);
        ok(Number.isFinite(m.depois),
          `a stamina DEPOIS de ${m.nome} saiu ${m.depois} — foi exatamente ` +
          'assim que o cartão desenhou "89 → NaN"');
      }
    }
  });

  s.teste('o custo é POR CRIATURA, e não o da equipe inteira', () => {
    /* A causa do NaN, dita como regra. A barra do cartão é de uma criatura, e
       cada uma paga o custo do perfil — `custoDe` cobra a equipe. */
    const E = estado(cria('a', 7, 100), cria('b', 37, 100), cria('c', 25, 100));
    for (const perfil of Object.keys(PERFIS)) {
      const r = resumoDa(E, { bioma: 'floresta', perfil, equipe: ['a', 'b', 'c'], agora: AGORA });
      igual(r.custo, PERFIS[perfil].custo,
        `a ${perfil} cobrou ${r.custo} por criatura, e o perfil custa ` +
        `${PERFIS[perfil].custo} — o número da equipe inteira vazou para a barra`);
      for (const m of r.membros)
        igual(m.depois, 100 - PERFIS[perfil].custo, `${m.nome} caiu errado`);
    }
  });

  s.teste('a stamina nunca fica negativa no desenho', () => {
    const E = estado(cria('a', 7, 5));
    const r = resumoDa(E, { bioma: 'floresta', perfil: 'vigilia', equipe: ['a'], agora: AGORA });
    igual(r.membros[0].depois, 0,
      'a barra do "depois" foi para baixo de zero — uma barra negativa desenha ' +
      'para fora da caixa, e o motor recusa o envio de qualquer forma');
  });

  s.teste('o AVISO é sobre o dia seguinte, e sai do próprio motor', () => {
    /* Quem fica abaixo do custo do perfil MAIS BARATO não sai de novo hoje. É a
       única coisa que a confirmação sabe e o jogador não vê — a stamina volta
       com o tempo, e "vai ficar em 12" não diz nada sozinho. */
    const barato = Math.min(...Object.values(PERFIS).map(p => p.custo));
    /* BATIDA, e nao Vigilia: a Vigilia custa 90 de um maximo de 100 e prende
       TODO MUNDO, sempre — a primeira versao deste teste usou Vigilia e as duas
       criaturas sairam presas. O caso interessante e uma presa e uma livre. */
    const E = estado(cria('cansa', 7, PERFIS.batida.custo + barato - 1),
                     cria('sobra', 37, 100));
    const r = resumoDa(E, { bioma: 'floresta', perfil: 'batida',
                            equipe: ['cansa', 'sobra'], agora: AGORA });
    igual(r.piso, barato,
      `o piso saiu ${r.piso}. Ele tem de vir do perfil mais barato do MOTOR — ` +
      'escrever o número aqui seria ele envelhecendo em silêncio no dia em que ' +
      'a Batida mudasse de preço');
    igual(r.travados.length, 1, 'o aviso pegou o número errado de criaturas');
    igual(r.travados[0].id, 'cansa', 'o aviso apontou a criatura errada');
    igual(r.todos, false, 'com uma livre, o aviso nao pode ser o da expedicao inteira');
  });

  s.teste('o piso SEGUE o motor, e não é um número escrito à mão', () => {
    /* A afirmação anterior comparava `r.piso` com o mesmo `Math.min` que o
       código faz — e uma sabotagem que escreve `const piso = 20` passava verde
       por baixo dela.

         > Comparar um resultado com a constante que o produziu não prova nada.

       Aqui a tabela de perfis entra por argumento, com números que NÃO são os do
       jogo. Se o piso estiver escrito à mão, ele não acompanha. */
    const inventados = {
      curto: { rotulo: 'Curto', minutos: 10, custo: 7 },
      longo: { rotulo: 'Longo', minutos: 90, custo: 31 },
    };
    const E = estado(cria('a', 7, 100));
    const r = resumoDa(E, { bioma: 'floresta', perfil: 'longo',
                            equipe: ['a'], agora: AGORA }, inventados);
    igual(r.piso, 7,
      `o piso saiu ${r.piso} com uma tabela cujo perfil mais barato custa 7. ` +
      'Ele está escrito à mão, e vai envelhecer em silêncio no dia em que a ' +
      'Batida mudar de preço.');
    igual(r.custo, 31, `o custo saiu ${r.custo} para um perfil de 31`);
    igual(r.membros[0].depois, 69, 'a barra não usou o custo da tabela recebida');
  });

  s.teste('a Vigilia prende TODOS, e o aviso muda de sujeito', () => {
    /* Ela custa 90 de um maximo de 100. Um aviso que lista os mesmos nomes em
       toda Vigilia vira papel de parede — o que muda nao e a cor, e o SUJEITO
       da frase. */
    const E = estado(cria('a', 7, 100), cria('b', 37, 100));
    const r = resumoDa(E, { bioma: 'floresta', perfil: 'vigilia',
                            equipe: ['a', 'b'], agora: AGORA });
    igual(r.travados.length, 2, 'a Vigilia deixou alguem de fora do aviso');
    igual(r.todos, true, 'com todos presos, o aviso tem de falar da EXPEDICAO');
  });

  s.teste('equipe vazia não abre pergunta nenhuma', () => {
    const r = resumoDa(estado(), { bioma: 'floresta', perfil: 'batida', equipe: [], agora: AGORA });
    igual(r.membros.length, 0);
    /* E id que não existe no save some da lista, em vez de virar uma linha
       vazia: o cartão desenharia um retrato de `undefined`. */
    const r2 = resumoDa(estado(cria('a', 7, 50)),
      { bioma: 'floresta', perfil: 'batida', equipe: ['a', 'fantasma'], agora: AGORA });
    igual(r2.membros.length, 1, 'um id inexistente virou linha no cartão');
  });

  s.teste('a duração é lida em horas, e não em minutos acumulados', () => {
    /* Quem olha uma duração quer saber se dá tempo de fazer outra coisa, e
       "180 min" não responde isso. Mesma regra do `faltando` no idle-campo —
       duas telas que falam de tempo têm de falar igual. */
    igual(duracaoEmPalavras(45), '45 min');
    igual(duracaoEmPalavras(180), '3 h');
    igual(duracaoEmPalavras(480), '8 h');
    igual(duracaoEmPalavras(95), '1h 35min');
    igual(duracaoEmPalavras(0), '0 min');
  });

  s.teste('a barra cabe na régua', () => {
    /* `width` em porcentagem acima de 100 desenha para fora do trilho. */
    const E = estado(cria('a', 7, STAMINA_MAX));
    const r = resumoDa(E, { bioma: 'floresta', perfil: 'batida', equipe: ['a'], agora: AGORA });
    ok(r.membros[0].antes <= STAMINA_MAX,
      `a stamina saiu ${r.membros[0].antes}, acima do máximo ${STAMINA_MAX}`);
  });

  return s;
}
