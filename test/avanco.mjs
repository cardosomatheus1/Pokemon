/* O AVANÇO: O QUE ELE CUSTA E O QUE ELE RENDE — blocos A5 e A3.
 *
 * Os dois num arquivo só porque respondem à MESMA pergunta em duas metades, e
 * separá-los criaria dois lugares tendo de concordar sobre a forma do estado —
 * que é a primeira parada do caminho para duas verdades.
 *
 *   A5 (§7.22.2)  as TRÊS UNIDADES: abate, encontro, avanço. É o que protege
 *                 o teto do §P5 — 58 mobs numa run contra um teto diário de 30.
 *   A3 (§7.22.7)  o que a run COBRA: stamina por wave, HP, a poção, e a regra
 *                 de que falhar custa o baú e nunca o farm.
 *
 * A afirmação que sustenta o arquivo inteiro é uma:
 *
 *   > Um mob é espetáculo. Uma espécie é economia. E as duas frases descrevem
 *   > a mesma tela.
 */
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import {
  ENCONTROS_POR_AVANCO, abatesDe, encontrosDe, cabeAvanco, reservarAvanco,
  colherAvanco, STAMINA_POR_WAVE, STAMINA_DO_CHEFE, STAMINA_DO_AVANCO,
  staminaAteWave, podeAvancar, curaDe, usarCura, premioDo,
} from '../engine/avanco.mjs';
import {
  simularAvanco, resolverWave, WAVES, MOBS_TOTAIS, HP_MAX,
} from '../engine/wave.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { NIVEL_DO_ESTAGIO } from '../engine/estagios.mjs';
import {
  comprometido, restamEncontros, TETO_ENCONTROS, STAMINA_MAX,
} from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const dado = s => rngTeste(s);
const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const criatura = (nivel, forca = 318) => ({ nivel, forca, vinculo: 0 });
const runCheia = () => {
  for (let i = 0; i < 300; i++) {
    const r = simularAvanco(dado(i * 7919), {
      elenco: ELENCO, estagio: 1, equipe: [criatura(40)] });
    if (r.completou) return r;
  }
  throw new Error('nenhuma run completa em 300 sementes');
};

export function suite() {
  const s = criarSuite('avanco');

  /* ═══ A5 — AS TRÊS UNIDADES ═══════════════════════════════════════════ */

  s.teste('UM AVANÇO DERRUBA ~58 MOBS E VALE NO MÁXIMO 6 ENCONTROS', () => {
    /* A peça central do §7.22.2, e sem ela o teto do §P5 estoura: 58 mobs numa
       run contra um teto diário de 30 encontros seria quase o DOBRO do dia
       inteiro numa única ida. O dono viu isso sozinho. */
    const r = runCheia();
    igual(abatesDe(r), MOBS_TOTAIS,
      `uma run completa derrubou ${abatesDe(r)} mobs, e o desenho soma ${MOBS_TOTAIS}`);
    ok(encontrosDe(r).length <= ENCONTROS_POR_AVANCO,
      `a run rendeu ${encontrosDe(r).length} encontros, e o elenco do estágio ` +
      `tem ${ENCONTROS_POR_AVANCO} espécies — mais que isso é o teto vazando`);
    ok(abatesDe(r) > encontrosDe(r).length * 5,
      'os abates não passam nem cinco vezes os encontros — as duas unidades ' +
      'colapsaram numa só, e é exatamente o que não pode acontecer');
  });

  s.teste('o encontro é a ESPÉCIE, e não o indivíduo', () => {
    /* "Quem apareceu" já lista espécies. Contar indivíduos faria três Weedle
       valerem três encontros, e o teto sumiria em duas waves. */
    const r = runCheia();
    const e = encontrosDe(r);
    igual(new Set(e).size, e.length, 'a lista de encontros repetiu uma espécie');
    for (const dex of e)
      ok(r.abates.some(a => a.dex === dex), `${dex} virou encontro sem ter sido abatido`);
  });

  s.teste('o AVANÇO reserva pelo máximo, e devolve a sobra ao colher', () => {
    /* Mesma forma da expedição, e de propósito: o número de encontros só existe
       na colheita, então reservar o máximo é o que impede o teto de ser
       ultrapassado entre sair e voltar. */
    const base = { encontrosHoje: 0, emCampo: [], reservas: [] };
    const saiu = reservarAvanco(base);
    igual(comprometido(saiu), ENCONTROS_POR_AVANCO,
      'o avanço saiu sem reservar nada — o teto não vê quem está em campo');
    igual(base.reservas.length, 0, 'reservar MUTOU o estado que recebeu');

    /* Colhendo uma run que viu 4 espécies, a reserva de 6 vira 4. */
    const r = { abates: [{ dex: 10, quantos: 9 }, { dex: 13, quantos: 9 },
                         { dex: 11, quantos: 6 }, { dex: 12, quantos: 2 }] };
    const voltou = colherAvanco(saiu, r);
    igual(voltou.encontrosHoje, 4, 'a colheita não creditou os encontros reais');
    igual(voltou.reservas.length, 0, 'a reserva não foi devolvida ao colher');
    igual(comprometido(voltou), 4, 'sobrou reserva depois da colheita');
  });

  s.teste('OS DOIS MODOS DIVIDEM O MESMO TETO', () => {
    /* É a decisão do §7.22.3, e ela é o que transforma "onde vão os encontros
       de hoje" numa pergunta de jogo em vez de dois farms empilhados. */
    const dormiu = { encontrosHoje: 0, emCampo: ['vigilia'], reservas: [] };
    const antes = restamEncontros(dormiu);
    ok(antes < TETO_ENCONTROS,
      'uma Vigília em campo não reduziu o que resta — os modos não se veem');
    const comAvanco = reservarAvanco(dormiu);
    igual(restamEncontros(comAvanco), antes - ENCONTROS_POR_AVANCO,
      'o avanço não descontou do mesmo teto que a expedição');
  });

  s.teste('o teto RECUSA o avanço que não cabe, e recusa no clique', () => {
    const cheio = { encontrosHoje: TETO_ENCONTROS - 2, emCampo: [], reservas: [] };
    igual(cabeAvanco(cheio), false,
      `com ${TETO_ENCONTROS - 2} de ${TETO_ENCONTROS} colhidos, um avanço de ` +
      `${ENCONTROS_POR_AVANCO} coube — e o teto do §P5 é o que impede tempo de ` +
      'virar dinheiro sem limite');
    let erro = null;
    try { reservarAvanco(cheio); } catch (e) { erro = e.message; }
    ok(erro && /teto/i.test(erro),
      `a reserva que não cabe respondeu: ${erro}. A recusa tem de acontecer no ` +
      'clique, onde o jogador consegue entender.');
    ok(cabeAvanco({ encontrosHoje: 0, emCampo: [], reservas: [] }),
      'um dia zerado recusou o primeiro avanço');
  });

  s.teste('cinco avanços cabem no dia, e o sexto não', () => {
    /* A aritmética do §7.22.3, afirmada: 30 / 6 = 5. O dono previu "repetir 3-4
       vezes" antes de qualquer conta, e o desenho devolve 5. */
    let estado = { encontrosHoje: 0, emCampo: [], reservas: [] };
    let couberam = 0;
    for (let i = 0; i < 10; i++) {
      if (!cabeAvanco(estado)) break;
      estado = colherAvanco(reservarAvanco(estado), {
        abates: ELENCO.comuns.concat(ELENCO.chefes).map(x => ({ dex: x.dex, quantos: 9 })) });
      couberam++;
    }
    igual(couberam, Math.floor(TETO_ENCONTROS / ENCONTROS_POR_AVANCO),
      `couberam ${couberam} avanços no dia, e ${TETO_ENCONTROS} / ` +
      `${ENCONTROS_POR_AVANCO} dá ${Math.floor(TETO_ENCONTROS / ENCONTROS_POR_AVANCO)}`);
  });

  /* ═══ A3 — O QUE A RUN COBRA ══════════════════════════════════════════ */

  s.teste('a stamina é POR WAVE, e o estágio inteiro custa 23', () => {
    igual(STAMINA_DO_AVANCO, (WAVES - 1) * STAMINA_POR_WAVE + STAMINA_DO_CHEFE);
    igual(STAMINA_DO_AVANCO, 23,
      `o estágio custa ${STAMINA_DO_AVANCO} de stamina, e o número do dono é 23 ` +
      '(2 por wave, 5 na do chefe)');
    ok(STAMINA_DO_CHEFE > STAMINA_POR_WAVE,
      'a wave do chefe custa o mesmo que uma comum — o clímax sai de graça');
    igual(staminaAteWave(1), STAMINA_POR_WAVE);
    igual(staminaAteWave(WAVES), STAMINA_DO_AVANCO);
    igual(staminaAteWave(0), 0, 'parar antes da primeira wave cobrou stamina');
  });

  s.teste('O NOVATO NÃO É BLOQUEADO, E A COLEÇÃO CONTINUA IMPORTANDO', () => {
    /* As duas metades do mesmo equilíbrio, e a primeira foi correção do dono:

         "o cara novato que chega jogar primeira vez só iria conseguir fazer
          2 run, isso é um pouco broxante"

       Medido, ele tinha razão: com 35, uma criatura fazia DUAS runs. A stamina
       mordia exatamente quem menos podia contornar — quem tem quatro criaturas
       não sentia nada.

         > Um limite que aperta o novato e afrouxa no veterano está no eixo
         > errado.

       Mas a metade de baixo não pode cair junto: se uma criatura fizesse o dia
       inteiro, a coleção deixaria de ser ferramenta e o §7.13 perderia o eixo. */
    const porCriatura = Math.floor(STAMINA_MAX / STAMINA_DO_AVANCO);
    const avancosDoDia = Math.floor(TETO_ENCONTROS / ENCONTROS_POR_AVANCO);
    ok(porCriatura >= 3,
      `uma criatura faz ${porCriatura} avanço(s) antes de parar. Abaixo de três, ` +
      'a primeira sessão de quem chega acaba em minutos — e a stamina passa a ' +
      'punir quem ainda não tem coleção para contornar.');
    ok(porCriatura < avancosDoDia,
      `uma criatura faz ${porCriatura} avanços e o dia comporta ${avancosDoDia}. ` +
      'Se uma sozinha fechasse o dia, a coleção deixaria de ser o teto do farm — ' +
      'que é a regra do §7.13, e ela é o eixo do idle inteiro.');
  });

  s.teste('a criatura sem stamina é RECUSADA, e a recusa diz quem', () => {
    const agora = Date.now();
    const cheia = { id: 'a', stamina: STAMINA_MAX, staminaEm: agora };
    const vazia = { id: 'b', stamina: 4, staminaEm: agora };
    ok(podeAvancar([cheia], agora).pode, 'uma criatura descansada foi recusada');
    const r = podeAvancar([cheia, vazia], agora);
    igual(r.pode, false, 'uma criatura sem stamina passou no meio de duas boas');
    igual(r.semStamina.join(','), 'b',
      `a recusa não nomeou quem está cansado: ${JSON.stringify(r.semStamina)}`);
  });

  s.teste('A POÇÃO CURA, E ELA VEM DO PACK — não do motor', () => {
    /* §0.3: o motor sabe que existe item que restaura; QUAIS itens fazem isso é
       decisão do tema. Um pack sem poção nenhuma continua jogável. */
    const pocoes = (kanto.catalogo ?? []).filter(i => curaDe(kanto, i.id) > 0);
    ok(pocoes.length >= 2,
      `o pack declara ${pocoes.length} item(ns) que curam, e o §7.22.7 pede que ` +
      'a poção seja uma DECISÃO — com uma só não há escolha de qual usar');
    igual(curaDe(kanto, 'item_que_nao_existe'), 0, 'um item inexistente curou');
    igual(curaDe({}, 'seja_o_que_for'), 0, 'um pack vazio curou');
    /* E elas sobem: usar a cara numa arranhadura tem de ser desperdício. */
    const valores = pocoes.map(i => curaDe(kanto, i.id)).sort((a, b) => a - b);
    ok(valores[valores.length - 1] > valores[0],
      'todas as poções curam o mesmo — não há o que decidir');
  });

  s.teste('usar a poção gasta o item e NUNCA passa do HP cheio', () => {
    const bolsa = { pocao: 2 };
    const r = usarCura({ pack: kanto, item: 'pocao', hp: 40, bolsa });
    ok(r.hp > 40, 'a poção não curou nada');
    igual(r.bolsa.pocao, 1, 'a poção não saiu da bolsa');
    igual(bolsa.pocao, 2, 'usar a poção MUTOU a bolsa que recebeu');
    igual(usarCura({ pack: kanto, item: 'pocao', hp: HP_MAX - 1, bolsa }).hp, HP_MAX,
      'a cura passou do HP cheio — sobra de cura é HP inventado');
    let erro = null;
    try { usarCura({ pack: kanto, item: 'pocao', hp: 10, bolsa: {} }); } catch (e) { erro = e.message; }
    ok(erro, 'curou sem ter o item na bolsa');
  });

  s.teste('§Q4 — A CURA É PROPORCIONAL AO DANO, e a relação é MEDIDA', () => {
    /* Pedido literal do dono, 08/09/2026: *"os danos de combate, etc precisam
       ser coniventes com a cura, pra não acabar ficando desproporcional"*.

       Ele está certo, e a única forma honesta de garantir isso é NÃO escrever
       os dois números lado a lado e torcer. Dois números escritos lado a lado
       divergem no dia em que UM deles for ajustado sozinho — é o D-059 do
       `CLAUDE.md` aplicado a equilíbrio em vez de a documentação.

       Então este teste MEDE o dano agora e afirma a RELAÇÃO. Mexeu no dano das
       waves? Ele recalcula e reclama. */
    const elenco = elencoDoEstagio(kanto, 'floresta', 1);
    const vit = [], der = [], runs = [];
    for (let i = 0; i < 200; i++) {
      const r = dado(i * 99991);
      let hp = HP_MAX, gasto = 0, wave = 1, guarda = 0;
      while (wave <= WAVES && hp > 0 && guarda++ < 200) {
        const res = resolverWave(r, { elenco, wave, estagio: 1, hp,
          equipe: [criatura(NIVEL_DO_ESTAGIO[0])] });
        (res.venceu ? vit : der).push(res.dano);
        gasto += res.dano; hp = res.hpFinal;
        if (res.venceu) wave++;
      }
      runs.push(gasto);
    }
    const media = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const porDerrota = media(der);
    const porRun = media(runs);
    const cura = id => curaDe(kanto, id);

    /* 1 — A MENOR POÇÃO TEM DE DESFAZER UMA DERROTA. Abaixo disso ela é
           decoração: o jogador usa e a barra não muda de lugar. */
    ok(cura('pocao') > porDerrota,
      `a Poção cura ${cura('pocao')} e uma wave perdida custa ` +
      `${porDerrota.toFixed(1)} — ela não desfaz nem uma derrota, e vira ` +
      'decoração de bolsa');

    /* 2 — E NÃO PODE CARREGAR A RUN SOZINHA. Uma poção que cobre metade do
           avanço faz a preparação valer menos que o inventário. */
    ok(cura('pocao') < porRun / 3,
      `a Poção cura ${cura('pocao')} e a run inteira custa ${porRun.toFixed(0)} — ` +
      'uma poção sozinha carrega mais de um terço do avanço, e a preparação ' +
      'passa a valer menos que a bolsa');

    /* 3 — A LINHA SOBE, E A MÁXIMA É A ÚNICA QUE ZERA O ESTRAGO. */
    const linha = ['pocao', 'superpocao', 'hiperpocao', 'pocaomaxima'].map(cura);
    for (let i = 1; i < linha.length; i++)
      ok(linha[i] > linha[i - 1],
        `a linha de poções não sobe: ${linha.join(' -> ')}`);
    ok(linha[linha.length - 1] >= HP_MAX,
      'a Poção Máxima não enche a barra — e é isso que ela é');
    for (let i = 0; i < linha.length - 1; i++)
      ok(linha[i] < porRun,
        `a "${['pocao', 'superpocao', 'hiperpocao'][i]}" cura ${linha[i]} e a run ` +
        `custa ${porRun.toFixed(0)} — só a Máxima pode apagar um avanço inteiro`);

    /* 4 — E O CUSTO DA RUN TEM DE CABER NA BARRA, POR POUCO. É o que faz a
           poção ser uma DECISÃO em vez de um item de bolsa: sem ela, quem está
           no nível da porta fecha o estágio raspando. */
    ok(porRun > HP_MAX * 0.7,
      `a run custa ${porRun.toFixed(0)} de ${HP_MAX} — abaixo de 70% da barra o ` +
      'avanço se fecha sem pensar, e a poção não decide nada');
    ok(porRun < HP_MAX * 1.6,
      `a run custa ${porRun.toFixed(0)} de ${HP_MAX} — acima de 160% nem com ` +
      'poção o jogador da porta atravessa, e o estágio vira parede');
  });

  s.teste('FALHAR CUSTA O BAÚ, E NUNCA O FARM', () => {
    /* §7.22.8, herdada do 1.7b, e ela não se negocia: um idle que castiga o
       jogador por estar ausente está castigando o jogador por usar o produto
       como ele foi feito. */
    const feita = premioDo({ completou: true, waves: WAVES, hp: 20,
      abates: [{ dex: 10, quantos: 9 }] });
    const caida = premioDo({ completou: false, waves: 6, hp: 0,
      abates: [{ dex: 10, quantos: 5 }] });
    igual(feita.bau, true, 'a run completa não pagou o baú');
    igual(caida.bau, false, 'a run que caiu pagou o baú — o clímax deixa de valer');
    igual(caida.abates, 5, 'a run que caiu perdeu o que farmou');
    igual(caida.encontros.length, 1, 'a run que caiu perdeu os encontros');
    igual(feita.desbloqueia, true, 'a run completa não abriu o estágio seguinte');
    igual(caida.desbloqueia, false, 'a run que caiu abriu o estágio seguinte');
  });

  s.teste('a stamina cobrada é a das waves ALCANÇADAS, e não a do estágio', () => {
    /* Cobrar as dez de quem parou na sexta seria cobrar por waves que não
       aconteceram — e a run que falha já perdeu o baú. */
    const caida = premioDo({ completou: false, waves: 6, hp: 0, abates: [] });
    igual(caida.stamina, staminaAteWave(6),
      `a run que parou na wave 6 cobrou ${caida.stamina}, e seis waves custam ` +
      `${staminaAteWave(6)}`);
    igual(premioDo({ completou: true, waves: WAVES, hp: 10, abates: [] }).stamina,
      STAMINA_DO_AVANCO, 'a run completa não cobrou o estágio inteiro');
    ok(caida.stamina < STAMINA_DO_AVANCO,
      'quem caiu na sexta pagou o estágio inteiro — cobrar por wave que não ' +
      'aconteceu é punir duas vezes a mesma derrota');
  });

  s.teste('entrada torta não derruba nada', () => {
    /* Um save antigo não tem `reservas`, e um resultado velho pode não ter
       `abates`. Explodir aqui é o jogo fechando na cara de quem voltou. */
    igual(abatesDe(null), 0);
    igual(encontrosDe(undefined).length, 0);
    igual(abatesDe({ abates: null }), 0);
    ok(Number.isFinite(comprometido({})), 'um estado vazio quebrou a conta do teto');
    ok(cabeAvanco({}), 'um estado vazio recusou o primeiro avanço do dia');
    const p = premioDo({});
    ok(p && p.bau === false && p.abates === 0, 'um resultado vazio não devolveu prêmio nulo');
  });

  return s;
}
