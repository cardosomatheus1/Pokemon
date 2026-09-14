/* O ESTILHAÇO — bloco 1.29, a Essência ganha uso.
 *
 * ── O BURACO QUE ELE FECHA, MEDIDO ───────────────────────────────────────
 *
 * `tools/medir-drops.mjs`, 20.000 Vigílias:
 *
 *     Essência   52,85% de tudo que cai   ·   9,197 por Vigília
 *
 * **Metade de tudo que o jogo entrega não servia para nada.** Não era um item
 * esquecido: era a maior torneira do jogo despejando em terra. O dono cobrou:
 * *"hoje se dropam as essências mas até momento sem uso"*.
 *
 * ── O DESENHO É DELE, E AS DUAS DECISÕES DIFÍCEIS TAMBÉM ─────────────────
 *
 *     SETE PARTES viram um item      um item comprado direto tornaria a
 *                                    expedição desnecessária
 *     o estilhaço é SORTEADO         "escolher tiraria a frustração; sortear
 *                                    mantém a paciência como custo real"
 *
 * ── E O SORTEIO SÓ FECHA PORQUE O BOLO É DO BIOMA ────────────────────────
 *
 * Medindo, achei o nó: com os 17 itens do jogo no mesmo bolo, juntar sete
 * IGUAIS por sorteio puro é o problema do colecionador de figurinhas — meses
 * para o primeiro item, e a "paciência" vira desistência.
 *
 * A saída estava na primeira linha da ficha do próprio dono:
 *
 *   > "HELD ITEMS DALI — mostra o que cai naquele bioma; a aba vira mapa da rota"
 *
 * O bolo é o do BIOMA. Com dois ou três itens por rota, sete iguais é
 * alcançável — e ONDE farmar vira a decisão de verdade, que é exatamente o que
 * a aba promete. Sortear continua custando paciência sem custar meses.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  PARTES, POR_ESTILHACO, custoDoEstilhaco, custoDoItem, DIAS_DE_FARM,
  bolsoDoBioma, sortearEstilhaco, podeTrocar, montaveis, montar,
} from '../engine/estilhaco.mjs';
import { rngTeste } from './harness.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const ITENS = kanto.catalogo ?? [];

export function suite() {
  const s = criarSuite('estilhaco');

  s.teste('sete partes viram um item, e nunca menos', () => {
    /* Um item comprado direto tornaria a expedição desnecessária. Sete partes
       fazem a essência virar PROGRESSO VISÍVEL sem tirar o motivo de sair a
       campo — e dão a ela o papel que faltava: moeda de paciência. */
    igual(PARTES, 7, 'o número de partes mudou sem a ficha mudar junto');
    igual(montar(['x', 'x', 'x', 'x', 'x', 'x']).montou, false,
      'seis partes montaram um item');
    igual(montar(['x', 'x', 'x', 'x', 'x', 'x', 'x']).montou, true,
      'sete partes não montaram o item');
  });

  s.teste('partes de itens DIFERENTES não se somam', () => {
    /* É o coração da coisa: sete estilhaços quaisquer não são um item. Sem
       esta recusa, o sorteio deixaria de custar paciência — bastaria acumular
       volume, e o bioma pararia de importar. */
    const r = montar(['a', 'a', 'a', 'b', 'b', 'b', 'b']);
    igual(r.montou, false, 'quatro de um e três de outro viraram um item');
  });

  /* ── A CURVA, APROVADA PELO DONO EM 09/09/2026 ────────────────────────
     Ela é ancorada em DIAS DE FARM e não em gosto. A renda medida é ~23
     essências por dia — 30 encontros de teto, ~12 por Vigília, 9,2 por
     Vigília. */
  s.teste('o custo do estilhaço cresce com a faixa do item', () => {
    const ordem = ['comum', 'incomum', 'raro', 'muitoRaro', 'lendario'];
    for (let i = 1; i < ordem.length; i++)
      ok(custoDoEstilhaco(ordem[i]) > custoDoEstilhaco(ordem[i - 1]),
        `${ordem[i]} custa ${custoDoEstilhaco(ordem[i])} e ${ordem[i - 1]} custa ` +
        `${custoDoEstilhaco(ordem[i - 1])}: a faixa deixou de valer alguma coisa`);
    /* Faixa desconhecida não pode sair de graça — de graça é o pior preço. */
    ok(custoDoEstilhaco('inventada') >= custoDoEstilhaco('comum'),
      'uma faixa nova sairia mais barata que a comum');
  });

  s.teste('o item inteiro custa sete estilhaços, e a conta bate', () => {
    for (const f of Object.keys(POR_ESTILHACO))
      igual(custoDoItem(f), PARTES * custoDoEstilhaco(f),
        `o custo do item ${f} não é sete vezes o da parte — há duas contas ` +
        'para o mesmo preço, e elas divergem no dia em que uma for calibrada');
  });

  s.teste('a ÂNCORA é em dias de farm, e a curva respeita a escada', () => {
    /* Medido: ~23 essências por dia de jogo engajado. Um item RARO deve custar
       cerca de uma semana; um MUITO RARO, cerca de duas.

         > O que o estudo julga é a FORMA da curva, não os dígitos. */
    const dias = f => custoDoItem(f) / DIAS_DE_FARM.ESSENCIA_POR_DIA;
    ok(dias('comum') >= 2 && dias('comum') <= 5,
      `o item comum leva ${dias('comum').toFixed(1)} dias — abaixo de dois ele ` +
      'não é objetivo, e acima de cinco a faixa mais barata já cansa');
    ok(dias('raro') >= 5 && dias('raro') <= 10,
      `o item raro leva ${dias('raro').toFixed(1)} dias, e a mira é uma semana`);
    ok(dias('muitoRaro') >= 10 && dias('muitoRaro') <= 18,
      `o muito raro leva ${dias('muitoRaro').toFixed(1)} dias, e a mira são duas semanas`);
    /* E o mais caro não pode ser inalcançável: acima de um mês ele deixa de
       ser objetivo e vira paisagem. */
    ok(dias('lendario') <= 32,
      `o lendário leva ${dias('lendario').toFixed(1)} dias — mais que um mês, ` +
      'e ele deixa de ser um objetivo para virar paisagem');
  });

  /* ── O BOLO É DO BIOMA, E É ISSO QUE FAZ O SORTEIO FECHAR ─────────────── */
  s.teste('cada bioma tem o próprio bolso, e ele é pequeno', () => {
    const biomas = (kanto.biomas ?? []).map(b => b.id);
    ok(biomas.length > 0, 'o pack não declara bioma nenhum');
    let comItem = 0;
    for (const b of biomas) {
      const bolso = bolsoDoBioma(ITENS, b);
      if (!bolso.length) continue;
      comItem++;
      ok(bolso.length <= 6,
        `o bioma ${b} tem ${bolso.length} itens no bolso — com um bolo grande, ` +
        'sete iguais por sorteio vira o colecionador de figurinhas, e a ' +
        'paciência vira desistência');
      for (const i of bolso)
        igual(i.fonte, b, `${i.id} está no bolso de ${b} e vem de ${i.fonte}`);
    }
    igual(comItem, biomas.length,
      `só ${comItem} de ${biomas.length} biomas têm bolso — nos outros esta ` +
      'porta não existe, e o jogador não tem como saber sem farmar lá para descobrir');
  });

  s.teste('o sorteio é DETERMINÍSTICO: a mesma semente, o mesmo estilhaço', () => {
    /* §P3. Sem isso, recarregar a página sortearia de novo — e o jogador
       aprenderia a recarregar até vir a parte que falta. */
    const a = sortearEstilhaco(rngTeste(0xE571), { itens: ITENS, bioma: 'praia' });
    const b = sortearEstilhaco(rngTeste(0xE571), { itens: ITENS, bioma: 'praia' });
    igual(a?.id, b?.id, 'a mesma semente devolveu estilhaços diferentes');
  });

  s.teste('o sorteio só devolve item DAQUELE bioma', () => {
    const bolso = new Set(bolsoDoBioma(ITENS, 'gelo').map(i => i.id));
    for (let n = 0; n < 200; n++) {
      const e = sortearEstilhaco(rngTeste(1000 + n), { itens: ITENS, bioma: 'gelo' });
      ok(!e || bolso.has(e.id),
        `o sorteio do gelo devolveu ${e?.id}, que não é de lá — o bioma ` +
        'deixaria de ser a decisão, e o mapa da rota viraria enfeite');
    }
  });

  /* ── E O SORTEIO PRECISA SORTEAR DE VERDADE ────────────────────────
   *
   * Esta afirmação existe porque a SABOTAGEM À MÃO a exigiu. A primeira
   * versão do bolso levava só a porta `troca`, e cada bioma ficou com UM
   * item; trocar o sorteio por "devolve sempre o primeiro" deixou a suíte
   * VERDE.
   *
   *   > Uma decisão de desenho que o código não consegue exercer não é uma
   *   > decisão: é um comentário.
   *
   * E a do dono era clara — *"sortear mantém a paciência como custo real"*.
   * Com um item por bioma não havia paciência nenhuma: sete iguais eram
   * garantidos. */
  s.teste('o sorteio SORTEIA: sementes diferentes dão itens diferentes', () => {
    for (const bioma of (kanto.biomas ?? []).map(b => b.id)) {
      const bolso = bolsoDoBioma(ITENS, bioma);
      if (bolso.length < 2) continue;
      const vistos = new Set();
      for (let n = 0; n < 400; n++)
        vistos.add(sortearEstilhaco(rngTeste(9000 + n), { itens: ITENS, bioma })?.id);
      igual(vistos.size, bolso.length,
        `o bolso de ${bioma} tem ${bolso.length} itens e o sorteio só devolveu ` +
        `${vistos.size}: ele não está sorteando, está escolhendo`);
    }
  });

  s.teste('TODO bioma tem bolso, e nenhum tem um item só', () => {
    /* Bioma sem bolso é uma rota onde esta porta não existe — e o jogador não
       tem como saber disso sem farmar lá para descobrir. Bolso com UM item é
       pior: ele parece sorteio e não é. */
    for (const b of (kanto.biomas ?? []).map(x => x.id)) {
      const bolso = bolsoDoBioma(ITENS, b);
      ok(bolso.length >= 2,
        `o bioma ${b} tem ${bolso.length} item(ns) no bolso — abaixo de dois o ` +
        'sorteio não sorteia nada, e sete iguais viram garantia em vez de paciência');
    }
  });

  s.teste('bioma sem item devolve nada, e não quebra', () => {
    /* Sem esta guarda, farmar num bioma sem porta lançaria dentro da colheita
       — e a colheita inteira falharia por causa de uma torneira vazia. */
    igual(sortearEstilhaco(rngTeste(7), { itens: ITENS, bioma: 'nao-existe' }), null);
    igual(sortearEstilhaco(rngTeste(7), { itens: [], bioma: 'praia' }), null);
    igual(sortearEstilhaco(rngTeste(7), {}), null);
  });

  /* ── A TROCA ───────────────────────────────────────────────────────────── */
  s.teste('sem essência, a troca é recusada e diz QUANTO falta', () => {
    /* O D-067 na porta do material: ter saldo na tela e ouvir "não" é a pior
       forma de ensinar uma regra. */
    const r = podeTrocar({ faixa: 'raro', essencia: custoDoEstilhaco('raro') - 7 });
    igual(r.pode, false);
    igual(r.faltam, 7, 'a recusa não contou quanto falta');
    ok(r.motivo.includes('7'), `a recusa não mostra o número: "${r.motivo}"`);
  });

  s.teste('com o custo exato, a troca acontece', () => {
    const r = podeTrocar({ faixa: 'raro', essencia: custoDoEstilhaco('raro') });
    igual(r.pode, true, `a troca legítima foi recusada: ${r.motivo}`);
    igual(r.custo, custoDoEstilhaco('raro'));
  });

  s.teste('o que já dá para montar aparece, e o que falta também', () => {
    /* A tela precisa das duas listas: "isto está pronto" e "faltam três". Sem
       a segunda, o jogador não sabe se está perto — e não saber se está perto
       é o que faz ele parar. */
    const partes = { icyrock: 7, heatrock: 3 };
    const m = montaveis(partes);
    igual(m.prontos.map(x => x.id).join(), 'icyrock');
    const perto = m.faltando.find(x => x.id === 'heatrock');
    igual(perto.faltam, 4, 'a conta de quanto falta está errada');
  });

  s.teste('montar CONSOME as sete partes, e não deixa resto', () => {
    const r = montar(new Array(9).fill('icyrock'));
    igual(r.montou, true);
    igual(r.consumiu, PARTES, 'montar consumiu um número diferente de sete');
    igual(r.sobra, 2, 'as partes que sobraram sumiram junto');
  });


  /* ── O CONTADOR DO SORTEIO SOBREVIVE AO DISCO ──────────────────────────
   *
   * Este teste existe porque o defeito ACONTECEU, medido no navegador: oito
   * trocas seguidas devolveram o mesmo item. O sorteio estava certo — a
   * distribuição bate em 2.000 amostras — e o contador é que não persistia:
   * `carregar` reconstrói o estado num formato conhecido, e o campo novo não
   * estava nele. Ele nascia em 1 a cada leitura.
   *
   *   > Um sorteio que se pode repetir de graça não é um sorteio: é um menu.
   *   > E o jogador aprende a recarregar até vir a parte que falta.
   */
  s.teste('o contador do sorteio atravessa o disco, e só cresce', async () => {
    const D = await import('../app/modules/idle-dados.mjs');
    let guardado = null;
    const deposito = { getItem: () => guardado, setItem: (_, v) => { guardado = v; } };

    const e = D.VAZIO();
    igual(e.estilhacos, 0, 'o estado novo não tem o contador do sorteio');
    e.estilhacos = 12;
    D.salvar(e, deposito);
    igual(D.carregar(deposito).estilhacos, 12,
      'o contador do sorteio não voltou do disco — cada troca sortearia a ' +
      'mesma parte, e recarregar a página viraria estratégia');

    /* Um contador que volta atrás devolve a sequência já vista, e é o mesmo
       furo por outra porta. */
    guardado = JSON.stringify({ ...JSON.parse(guardado), estilhacos: -5 });
    igual(D.carregar(deposito).estilhacos, 0, 'um contador negativo passou');
    guardado = JSON.stringify({ ...JSON.parse(guardado), estilhacos: 'muitos' });
    igual(D.carregar(deposito).estilhacos, 0, 'um contador não numérico passou');
  });

  s.teste('sementes seguidas dão partes diferentes — a sequência não trava', async () => {
    /* A prova do outro lado: com o contador andando, as partes VARIAM. Medido
       em 2.000 amostras a distribuição bate (986/1014 num bolso de dois); o
       que este teste guarda é a sequência CURTA, que é a que o jogador vive. */
    const { derivar } = await import('../engine/seed.mjs');
    const { semente } = await import('../engine/instancia.mjs');
    const vistos = new Set();
    for (let n = 1; n <= 12; n++)
      vistos.add(sortearEstilhaco(semente(derivar(n, 'estilhaco:floresta')),
                                  { itens: ITENS, bioma: 'floresta' })?.id);
    ok(vistos.size >= 2,
      'doze trocas seguidas devolveram a mesma parte — foi exatamente o que o ' +
      'navegador mostrou quando o contador não persistia');
  });

  return s;
}
