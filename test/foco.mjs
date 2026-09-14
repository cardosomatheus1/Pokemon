/* O FOCO — bloco 1.16, a L-102.
 *
 * O que estes testes protegem é o DESENHO, e não a aritmética. A conta é fácil;
 * o que é fácil de perder numa refatoração é o motivo de cada número:
 *
 *   o GUIA que se ajuda            ele existe para levar companheiros. Se
 *                                  ganhar sozinho, vira só mais um bônus.
 *   o foco que só SOMA             foco sem custo não faz ninguém escolher
 *                                  nada — pega-se o maior número e pronto.
 *   o CASTIGO fora do perfil       Batedor na Vigília não pode levar o custo
 *                                  sem o bônus, ou o jogador mantém uma equipe
 *                                  por perfil e isso vira dever de casa.
 *   a SOMA em vez da média         três iguais dariam +90%, e "leve três
 *                                  iguais" é o contrário de build.
 *   a troca de graça               grátis, o foco deixa de ser escolha e vira
 *                                  um botão que se aperta antes de cada saída.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  FOCOS, EFEITO, existe, NIVEL_PARA_ESCOLHER, HORAS_DE_TROCA, MS_DE_TROCA,
  BONUS_DO_GUIA, podeEscolher, descansando, faltaDoDescanso, escolher,
  efeitosDa, encontrosCom, efeitoVivo,
} from '../engine/foco.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import { VAZIO, escolherInicial, iniciarExpedicao, colher } from '../app/modules/idle-dados.mjs';
import { leituraDoFoco, valeNaRun, INERTES_NO_AVANCO } from '../app/modules/avanco-foco.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const AGORA = Date.UTC(2026, 8, 2, 12, 0, 0);

const cri = (foco, extra = {}) => ({ nivel: 20, foco: foco ?? null, ...extra });
const eq = (...fs) => fs.map(f => cri(f));

export function suite() {
  const s = criarSuite('foco');

  /* ── OS CINCO EXISTEM E SÃO COERENTES ─────────────────────────────────── */

  s.teste('há cinco focos, e a tabela não tem nome fora da lista', () => {
    igual(FOCOS.length, 5, 'o número de focos mudou sem a lista mudar junto');
    for (const f of FOCOS)
      ok(existe(f), `"${f}" está na lista e não tem efeito nenhum na tabela`);
    for (const f of Object.keys(EFEITO))
      ok(FOCOS.includes(f), `"${f}" tem efeito e não aparece na lista de focos`);
  });

  s.teste('todo foco de perfil aponta para um perfil que existe', () => {
    /* Um `perfil: 'batida '` com espaço nunca casaria, e o foco seria
       silenciosamente inútil — o jogador escolheria e nada mudaria. */
    for (const [f, e] of Object.entries(EFEITO))
      if (e.perfil)
        ok(Object.prototype.hasOwnProperty.call(PERFIS, e.perfil),
          `o foco "${f}" aponta para o perfil "${e.perfil}", que não existe`);
  });

  s.teste('TODO foco tem custo — nenhum é só ganho', () => {
    /* A regra está escrita no módulo, e é a que faz a escolha ser escolha.
       Sem custo, não há o que perder e pega-se o maior número.

       O Guia é a exceção NOMEADA: o custo dele é não ganhar nada para si — e é
       isso que o teste abaixo dele confere, para a exceção não virar buraco. */
    for (const [f, e] of Object.entries(EFEITO)) {
      if (f === 'guia') continue;
      /* `garantido` conta como ganho: e o que o Vigia passou a dar quando o
         teto engoliu o vies dele (D-073). */
      const ganhos = ['encontros', 'material', 'itemRaro', 'garantido']
        .filter(k => (e[k] ?? 0) > 0);
      /* Todo custo e uma CONTAGEM desde o D-073: encontro ou material. O vies
         saiu do sistema de foco porque o perfil ja o satura. */
      const perdas = ['encontros', 'material', 'itemRaro']
        .filter(k => (e[k] ?? 0) < 0);
      ok(ganhos.length > 0, `o foco "${f}" não melhora nada`);
      ok(perdas.length > 0,
        `o foco "${f}" é puro ganho — foco sem custo não faz ninguém escolher, ` +
        'porque não há o que perder');
    }
    /* E o custo do Guia é o dele: zero para si mesmo. */
    igual(efeitosDa(eq('guia'), 'batida').encontros, 1,
      'o Guia sozinho está ganhando alguma coisa — o custo dele é justamente ' +
      'não ganhar nada sem companheiro');
  });

  /* ── O GUIA, QUE É O CORAÇÃO DO BLOCO ─────────────────────────────────── */

  s.teste('o Guia levanta os OUTROS e nunca a si mesmo', () => {
    const so = efeitosDa(eq('guia'), 'batida');
    igual(so.encontros, 1, 'um Guia sozinho devia render exatamente o normal');

    const comAliado = efeitosDa(eq('guia', null), 'batida');
    ok(comAliado.encontros > 1,
      'o Guia com um companheiro não levantou nada — é a única coisa que ele faz');

    /* O aliado recebe o bônus INTEIRO; o Guia, zero. Média de 1 e 1,25. */
    igual(Math.round(comAliado.encontros * 1000) / 1000,
      Math.round(((1) + (1 + BONUS_DO_GUIA)) / 2 * 1000) / 1000,
      'a repartição do bônus do Guia mudou');
  });

  s.teste('empilhar Guias NÃO vence — exatamente um é o ótimo', () => {
    /* Sem teto no bônus, levar cópias de Guia venceria — e o foco cujo ponto
       inteiro é "leve companheiros DIFERENTES" premiaria levar iguais. */
    const tres = efeitosDa(eq('batedor', 'batedor', 'batedor'), 'batida').encontros;
    const um   = efeitosDa(eq('guia', 'batedor', 'batedor'), 'batida').encontros;
    const dois = efeitosDa(eq('guia', 'guia', 'batedor'), 'batida').encontros;
    ok(um > tres,
      `um Guia (${um.toFixed(3)}) não bateu três Batedores (${tres.toFixed(3)}) — ` +
      'sem isso o Guia não tem razão de existir');
    ok(um > dois,
      `dois Guias (${dois.toFixed(3)}) bateram ou empataram com um (${um.toFixed(3)}) — ` +
      'empilhar Guia virou a jogada, e ela é o oposto do que o foco propõe');
  });

  /* ── FORA DO PERFIL, NEUTRO — NEM BÔNUS NEM CASTIGO ───────────────────── */

  s.teste('o foco de perfil é NEUTRO fora do perfil dele', () => {
    /* A primeira versão aplicava o custo e engolia o bônus: um Batedor na
       Vigília levava −0,15 de viés e ganhava nada. É castigo por usar a
       criatura onde o jogador quis — o mesmo erro que a L-108 descarta para a
       tipagem, e pelo mesmo motivo. */
    const fora = efeitosDa(eq('batedor', 'batedor', 'batedor'), 'vigilia');
    igual(fora.encontros, 1, 'o Batedor ganhou encontro fora da Batida');
    igual(fora.material, 1,
      `o Batedor levou ${fora.material} de material na Vigília — custo sem bônus ` +
      'é castigo por usar a criatura onde o jogador quis usá-la');

    const foraV = efeitosDa(eq('vigia', 'vigia', 'vigia'), 'batida');
    igual(foraV.encontros, 1, 'o Vigia perdeu encontro fora da Vigília');
    igual(foraV.garantido, 0, 'o Vigia garantiu raro fora da Vigília');
  });

  s.teste('dentro do perfil, o par Batedor/Vigia é a troca que os perfis já são', () => {
    /* A troca do Batedor era RARIDADE por quantidade, e a medição mostrou que
       ela não existia: 86,9% -> 88,2% de comuns, que é ruído. O perfil já
       satura o viés nas duas pontas, e nas pontas a curva é chata.

           Uma alavanca que o perfil já saturou não serve para o foco.

       Virou MATERIAL por quantidade: quem corre não para para catar. É um
       custo que se conta — e contagem se mede, se testa e se vê na tela. */
    const b = efeitosDa(eq('batedor', 'batedor', 'batedor'), 'batida');
    const v = efeitosDa(eq('vigia', 'vigia', 'vigia'), 'vigilia');
    ok(b.encontros > 1 && b.material < 1,
      'o Batedor devia trocar material por quantidade');
    ok(v.encontros < 1 && v.garantido >= 1,
      'o Vigia devia trocar quantidade por um raro garantido — ver o D-073: ' +
      'a versao que dava vies tinha o vies engolido pelo teto');
  });

  /* ── A MÉDIA, E NÃO A SOMA ────────────────────────────────────────────── */

  s.teste('o bônus é a MÉDIA — o tamanho da equipe não infla nada', () => {
    const um   = efeitosDa(eq('batedor'), 'batida').encontros;
    const tres = efeitosDa(eq('batedor', 'batedor', 'batedor'), 'batida').encontros;
    igual(Math.round(um * 1000), Math.round(tres * 1000),
      `um Batedor rende ${um.toFixed(3)} e três rendem ${tres.toFixed(3)} — ` +
      'com soma, "leve três iguais" viraria a jogada, e isso é o contrário de build');
    igual(Math.round(um * 100) / 100, 1.3, 'o efeito cheio do Batedor mudou');
  });

  s.teste('meia equipe focada rende menos que a equipe toda focada', () => {
    const cheia = efeitosDa(eq('batedor', 'batedor'), 'batida').encontros;
    const meia  = efeitosDa(eq('batedor', null), 'batida').encontros;
    ok(meia < cheia,
      'levar um sem foco não custou nada — a especialização precisa ser visível');
    ok(meia > 1, 'levar um Batedor com um sem foco não rendeu nada a mais');
  });

  s.teste('equipe vazia e criatura sem foco devolvem o neutro', () => {
    for (const equipe of [[], null, undefined, eq(null, null)]) {
      const e = efeitosDa(equipe, 'batida');
      igual(e.encontros, 1, 'os encontros mexeram sem foco nenhum');
      igual(e.material, 1, 'o material mexeu sem foco nenhum');
      igual(e.itemRaro, 1, 'o item mexeu sem foco nenhum');
    }
    /* Um foco desconhecido não pode derrubar a colheita: pack novo, save
       antigo, e a expedição de oito horas do jogador some. */
    const estranho = efeitosDa([cri('inventado')], 'batida');
    igual(estranho.encontros, 1, 'um foco desconhecido mexeu na conta');
  });

  /* ── QUANDO SE ESCOLHE ────────────────────────────────────────────────── */

  s.teste('abaixo do nível 12 não se escolhe, e a recusa diz quanto falta', () => {
    /* Recusa sem endereço é o que produziu o D-067: a tela dizia "não dá" e
       escondia a aritmética que explicava. */
    const nova = podeEscolher(cri(null, { nivel: 5 }));
    igual(nova.pode, false, 'uma criatura de nível 5 pôde escolher foco');
    igual(nova.motivo, 'nivelBaixo', 'a recusa não disse o motivo');
    igual(nova.falta, NIVEL_PARA_ESCOLHER - 5,
      'a recusa não disse QUANTOS níveis faltam');

    igual(podeEscolher(cri(null, { nivel: NIVEL_PARA_ESCOLHER })).pode, true,
      'exatamente no nível 12 ainda não deixou — o limite é inclusivo');
  });

  s.teste('passar do 12 não trava nada: a escolha espera pelo jogador', () => {
    /* Um bicho sem foco farma como sempre farmou; ele só não tem o bônus. */
    const velho = cri(null, { nivel: 60 });
    igual(podeEscolher(velho).pode, true, 'nível alto sem foco perdeu o direito');
    igual(efeitosDa([velho], 'batida').encontros, 1,
      'a criatura sem foco foi penalizada por não ter escolhido');
  });

  /* ── A TROCA CUSTA TEMPO ──────────────────────────────────────────────── */

  s.teste('a PRIMEIRA escolha é grátis, e a TROCA cobra 48 h', () => {
    const t0 = 1_000_000;
    const novo = escolher(cri(null), 'batedor', t0);
    igual(novo.foco, 'batedor', 'a escolha não gravou');
    igual(descansando(novo, t0), false,
      'a primeira escolha cobrou descanso — ela não desfaz nada, não há o que ' +
      'reaprender, e cobrar por ela é cobrar por participar');

    const trocado = escolher(novo, 'vigia', t0);
    igual(trocado.foco, 'vigia', 'a troca não gravou');
    igual(descansando(trocado, t0), true, 'a troca saiu de graça');
    igual(faltaDoDescanso(trocado, t0), MS_DE_TROCA,
      'o descanso não é de 48 h');
    igual(descansando(trocado, t0 + MS_DE_TROCA), false,
      'o descanso não termina no prazo');
    igual(HORAS_DE_TROCA, 48, 'o prazo mudou sem a decisão mudar junto');
  });

  s.teste('quem está descansando não pode trocar de novo', () => {
    const t0 = 500;
    const trocado = escolher(escolher(cri(null), 'batedor', t0), 'vigia', t0);
    const r = podeEscolher(trocado, t0 + 10);
    igual(r.pode, false, 'trocou duas vezes seguidas e o descanso não segurou');
    igual(r.motivo, 'descansando', 'a recusa não disse que é o descanso');
    igual(podeEscolher(trocado, t0 + MS_DE_TROCA + 1).pode, true,
      'passou o descanso e ainda não liberou');
  });

  s.teste('escolher o MESMO foco não cobra nada', () => {
    /* Clicar de novo no que já está escolhido é engano de dedo, não decisão.
       Cobrar 48 h por isso seria punir o jogador por confirmar. */
    const t0 = 9_000;
    const um = escolher(cri(null), 'vigia', t0);
    const denovo = escolher(um, 'vigia', t0 + 5);
    igual(descansando(denovo, t0 + 5), false,
      'reconfirmar o mesmo foco cobrou o descanso da troca');
  });

  s.teste('escolher NÃO muta a criatura original', () => {
    /* Mesma regra do `creditar` do 1.14: a tela precisa poder desenhar o antes e
       o depois lado a lado, e nada pode ficar meio-gravado se algo falhar. */
    const antes = cri(null);
    const copia = JSON.stringify(antes);
    escolher(antes, 'guia', 1);
    igual(JSON.stringify(antes), copia, 'escolher mutou a criatura de entrada');
  });

  s.teste('foco inexistente é erro, e nível baixo também', () => {
    let erro = null;
    try { escolher(cri(null), 'ninja', 0); } catch (e) { erro = e; }
    ok(erro, 'aceitou um foco que não existe');
    erro = null;
    try { escolher(cri(null, { nivel: 3 }), 'guia', 0); } catch (e) { erro = e; }
    ok(erro, 'aceitou escolher abaixo do nível mínimo');
  });

  /* ── O NÚMERO QUE CHEGA NA COLHEITA ───────────────────────────────────── */

  s.teste('o encontro nunca vira zero, por pior que seja o multiplicador', () => {
    /* Uma expedição de oito horas voltando vazia não tem número que a explique
       na tela — e o jogador leria como bug, com razão. */
    igual(encontrosCom(1, { encontros: 0.1 }), 1, 'o piso de um encontro caiu');
    igual(encontrosCom(0, { encontros: 5 }), 1, 'zero base devia continuar dando 1');
    igual(encontrosCom(10, { encontros: 1.3 }), 13, 'a conta do bônus mudou');
    igual(encontrosCom(10, undefined), 10, 'sem efeitos devia devolver a base');
  });

  /* ── A COLHEITA DE VERDADE, E NÃO SÓ A CONTA ──────────────────────────── */

  s.teste('a colheita ENTREGA diferente com foco — a ligação existe', () => {
    /* Tudo acima mede a conta do foco. Nada acima prova que a COLHEITA a usa.
       Se `colher` esquecer de montar a equipe ou de passar `efeitos` adiante, a
       suíte inteira fica verde e o foco não faz nada no jogo.

           Medir onde o defeito não pode aparecer não é medir.

       Este teste roda a colheita real, com a MESMA semente, mudando só o foco
       da criatura — e exige que o resultado mude. */
    const mesmaRaiz = 'foco-1.16';

    const cena = foco => {
      const e = VAZIO();
      escolherInicial(e, kanto, kanto.iniciais[0], AGORA);
      const c = e.criaturas[0];
      c.nivel = 30;
      if (foco) c.foco = foco;
      const x = iniciarExpedicao(e, {
        pack: kanto, bioma: 'floresta', perfil: 'batida',
        equipe: [c.id], agora: AGORA,
      });
      colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: mesmaRaiz });
      return e.expedicoes.find(y => y.id === x.id);
    };

    const semFoco  = cena(null);
    const batedor  = cena('batedor');

    /* ── DUAS COISAS ERRADAS NA PRIMEIRA VERSÃO DESTE TESTE ──────────────
     *
     * Ele lia `x.pendentes`, que na EXPEDIÇÃO é sempre vazio — os encontros
     * ficam no ESTADO, não no registro da expedição. O teste comparava zero
     * com zero e ficava verde, e três sabotagens da ligação passaram por ele:
     * a colheita deixando de montar a equipe, o sorteio ignorando os efeitos,
     * e o viés do foco sumindo.
     *
     *     Medir onde o defeito não pode aparecer não é medir.
     *
     * E havia uma válvula de escape que EU escrevi: `|| conta(semFoco) === 0`.
     * Com o campo sempre em zero, essa metade do `||` era sempre verdadeira e
     * a afirmação nunca chegava a afirmar nada. Folga na régua é defeito
     * passando — inclusive, e principalmente, quando quem afrouxa a régua é
     * quem está escrevendo o teste.
     */
    const conta = x => Number(x.encontros) || 0;
    ok(conta(semFoco) > 0,
      'a cena base colheu zero encontros — sem isso a comparação abaixo não ' +
      'compara nada, que foi exatamente como este teste passou vazio antes');
    ok(conta(batedor) > conta(semFoco),
      `com a MESMA semente o Batedor colheu ${conta(batedor)} e quem não tem ` +
      `foco colheu ${conta(semFoco)}. A conta do foco está certa e ninguém a ` +
      'usa: ou a colheita não monta a equipe, ou não passa os efeitos adiante, ' +
      'ou o sorteio de encontros ignora o que recebeu.');
  });

  s.teste('o Vigia GARANTE um raro, e a garantia chega na colheita', () => {
    /* Substitui o teste do viés, que não conseguia ficar vermelho porque o
       efeito que ele media não existia — o teto engolia (D-073).

           Um teste que não consegue falhar está denunciando o CÓDIGO,
           e não a si mesmo.

       A garantia é observável de verdade: no estágio 1 a faixa mais rara é
       `incomum`, e uma equipe de Vigias tem de trazer pelo menos um em TODA
       colheita — não em média, em todas. */
    let semGarantia = 0;
    for (let k = 0; k < 25; k++) {
      const e = VAZIO();
      escolherInicial(e, kanto, kanto.iniciais[0], AGORA);
      const c = e.criaturas[0];
      c.nivel = 40; c.foco = 'vigia';
      const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
        perfil: 'vigilia', equipe: [c.id], agora: AGORA });
      colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `g-${k}` });
      if (!(e.encontros ?? []).some(p => p?.raridade !== 'comum')) semGarantia++;
    }
    igual(semGarantia, 0,
      `${semGarantia} de 25 colheitas do Vigia vieram só com comuns. A garantia ` +
      'não chegou: ou a colheita não passa os efeitos, ou o sorteio ignora ' +
      '`garantido`. É o custo do Vigia sem o ganho dele — o D-073 de volta.');
  });

  s.teste('o material do foco chega na colheita, para os dois lados', () => {
    /* O Trilheiro rende mais material e o Batedor rende menos. Sem esta guarda,
       `focoMaterial` pode parar de ser passado adiante e a suíte fica verde com
       metade do sistema desligada — foi assim que três sabotagens escaparam da
       primeira versão destes testes. */
    const material = (foco, perfil) => {
      let total = 0;
      for (let k = 0; k < 30; k++) {
        const e = VAZIO();
        escolherInicial(e, kanto, kanto.iniciais[0], AGORA);
        const c = e.criaturas[0];
        c.nivel = 40;
        if (foco) c.foco = foco;
        const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
          perfil, equipe: [c.id], agora: AGORA });
        colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `m-${k}` });
        total += Number(e.bolsa?.essencia) || 0;
      }
      return total;
    };
    const base = material(null, 'trilha');
    ok(base > 0, 'a cena base não colheu material nenhum — não há o que comparar');

    const tri = material('trilheiro', 'trilha');
    ok(tri > base,
      `o Trilheiro colheu ${tri} de material e quem não tem foco colheu ${base} — ` +
      'o +35% não chegou na colheita');

    const bat = material('batedor', 'batida');
    const baseB = material(null, 'batida');
    ok(bat < baseB,
      `o Batedor colheu ${bat} de material e quem não tem foco colheu ${baseB} — ` +
      'o custo do Batedor sumiu, e foco sem custo não faz ninguém escolher nada');
  });

  s.teste('o Sortudo tira ITEM do saque, e não material', () => {
    /* Duas metades: a fatia de item sobe E a de material desce. Testar só a
       primeira deixaria passar um "Sortudo" que traz mais de tudo — e mais de
       tudo é a resposta que este bloco recusou três vezes.

       Medido: 36,6% de item sem foco, 42,6% com o Sortudo. */
    const fatia = foco => {
      let material = 0, item = 0;
      for (let k = 0; k < 50; k++) {
        const e = VAZIO();
        escolherInicial(e, kanto, kanto.iniciais[0], AGORA);
        const c = e.criaturas[0];
        c.nivel = 40;
        if (foco) c.foco = foco;
        const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
          perfil: 'vigilia', equipe: [c.id], agora: AGORA });
        colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: `s-${k}` });
        for (const [chave, n] of Object.entries(e.bolsa ?? {})) {
          if (chave === 'pokecoin') continue;
          if (chave === 'essencia') material += n; else item += n;
        }
      }
      return { material, item, pct: item / Math.max(1, material + item) };
    };
    const base = fatia(null), sortudo = fatia('sortudo');
    ok(base.item > 0 && base.material > 0,
      'a cena base não colheu dos dois tipos — não há o que comparar');
    ok(sortudo.pct > base.pct + 0.02,
      `o Sortudo trouxe ${(sortudo.pct * 100).toFixed(1)}% de item e a base ` +
      `${(base.pct * 100).toFixed(1)}% — o peso do item raro não chegou na colheita`);
    ok(sortudo.material < base.material,
      `o Sortudo colheu ${sortudo.material} de material e a base ${base.material} — ` +
      'ele está trazendo mais de TUDO, e mais de tudo não é uma escolha');
  });

  s.teste('o Vigia colhe MENOS na Vigília, e é para isso que ele serve', () => {
    /* A metade cara da troca. Sem esta afirmação, alguém "corrigiria" o número
       negativo do Vigia achando que é bug — e o par Batedor/Vigia viraria dois
       bônus, que é o desenho que este bloco recusou. */
    const cena = foco => {
      const e = VAZIO();
      escolherInicial(e, kanto, kanto.iniciais[0], AGORA);
      const c = e.criaturas[0];
      c.nivel = 30;
      if (foco) c.foco = foco;
      const x = iniciarExpedicao(e, {
        pack: kanto, bioma: 'floresta', perfil: 'vigilia',
        equipe: [c.id], agora: AGORA,
      });
      colher(e, { pack: kanto, id: x.id, agora: x.terminaEm, raiz: 'vigia-1.16' });
      return Number(e.expedicoes.find(y => y.id === x.id).encontros) || 0;
    };
    const semFoco = cena(null), vigia = cena('vigia');
    ok(vigia < semFoco,
      `o Vigia colheu ${vigia} e o sem-foco ${semFoco} — o custo do Vigia sumiu, ` +
      'e um foco sem custo não faz ninguém escolher nada');
  });

  /* ══ O QUE O FOCO FAZ *AQUI* — `efeitoVivo` (item 1 da ordem do dono) ══
   *
   * `efeitosDa` responde pela EQUIPE, em números somados e divididos, e é o
   * que a colheita precisa. Uma TELA mostra uma criatura por vez, e pergunta
   * outra coisa: *"este foco, nesta criatura, aqui onde ela está, faz alguma
   * coisa?"*.
   *
   * A coluna da run ia anunciar o foco pelo que ele faz na EXPEDIÇÃO, e dois
   * dos cinco não fazem nada no Avanço. Tela que promete o que não acontece é
   * a tela discordando do motor — e numa tela aberta por horas o jogador tem
   * tempo de perceber. */
  s.teste('efeitoVivo separa "não existe" de "não faz nada aqui"', () => {
    /* OS TRÊS CASOS SÃO DIFERENTES DE PROPÓSITO. `null` é erro de quem chamou;
       `{}` é resposta legítima. Colapsar os dois faria um foco escrito errado
       aparecer na tela como "neutro", e ninguém procuraria o defeito. */
    igual(efeitoVivo('inventado', 'trilha'), null, 'um foco que não existe virou resposta');
    igual(efeitoVivo(null, 'trilha'), null, 'sem foco, não há efeito a descrever');
    igual(efeitoVivo(undefined, 'trilha'), null, 'criatura sem campo de foco derruba a conta');

    for (const foco of ['batedor', 'vigia']) {
      const fora = efeitoVivo(foco, 'trilha');
      ok(fora && Object.keys(fora).length === 0,
        `o foco "${foco}" apareceu com efeito fora do perfil dele. Ele é de ` +
        `${EFEITO[foco].perfil}, e o INTEIRO é neutro fora dali — aplicar o ` +
        'custo e engolir o bônus seria castigo por usar a criatura onde o ' +
        'jogador quis usá-la');
      const dentro = efeitoVivo(foco, EFEITO[foco].perfil);
      ok(Object.keys(dentro).length > 0,
        `o foco "${foco}" ficou neutro DENTRO do perfil dele — ele não faria ` +
        'nada em lugar nenhum');
    }

    /* Os sem perfil valem em todo lugar, e é a outra metade da mesma regra. */
    for (const foco of ['trilheiro', 'sortudo', 'guia'])
      for (const perfil of ['batida', 'trilha', 'vigilia'])
        ok(Object.keys(efeitoVivo(foco, perfil)).length > 0,
          `o foco "${foco}" sumiu no perfil "${perfil}", e ele não tem perfil`);
  });

  s.teste('o que está INERTE naquele lugar não é anunciado', () => {
    /* O Avanço tem elenco FIXO em seis: `encontros` não muda nada lá. Quem
       chama diz o que está inerte no lugar dele — este motor não conhece o
       Avanço, e não deve. */
    const semInerte = efeitoVivo('trilheiro', 'trilha');
    ok('encontros' in semInerte,
      'sem declarar inerte, o custo de encontros do trilheiro sumiu sozinho — ' +
      'o motor estaria decidindo o que a tela mostra');

    const noAvanco = efeitoVivo('trilheiro', 'trilha', { inertes: ['encontros'] });
    ok(!('encontros' in noAvanco),
      'o custo de encontros foi anunciado num lugar onde o elenco é fixo em ' +
      'seis: não há encontro a menos para perder, e a tela cobraria um preço ' +
      'que o motor não cobra');
    ok('material' in noAvanco,
      'declarar um inerte apagou o resto do efeito — o trilheiro perdeu o ' +
      'material, que é a metade que o define');

    /* E declarar inerte NÃO transforma o foco em neutro por engano: o Guia
       continua tendo o que dizer mesmo com encontros fora da conta. */
    ok(Object.keys(efeitoVivo('guia', 'trilha', { inertes: ['encontros'] })).length > 0,
      'o Guia virou neutro no Avanço, e é justamente ele que mexe no PODER');
  });

  /* ══ AS QUATRO LEITURAS DA COLUNA DA RUN (S943, S944) ══════════════════
   *
   * Elas moravam dentro de uma `innerHTML`, e por isso DOIS defeitos plantados
   * passaram: apagar o aviso do foco futuro, e engolir a frase do foco neutro.
   * Nenhum teste conseguia ler a resposta sem montar um navegador.
   *
   * É a terceira vez neste bloco — antes com a separação das placas e com a
   * contagem do quadro. A cura é sempre a mesma: a conta sai de quem desenha. */
  s.teste('a coluna avisa o FUTURO foco — o pedido literal do dono', () => {
    /* O PEDIDO, em uma linha: *"é necessário alguma outra forma de se
       visualizar o futuro foco, que é escolhido no lv 12"*. Sem ele, quem está
       no nível 7 lê uma linha vazia e conclui que aquilo não é para ele. */
    const nova = leituraDoFoco({ nivel: 1, foco: null }, { perfil: 'trilha' });
    igual(nova.estado, 'futuro',
      'a criatura abaixo do nível 12 não é lida como "vai poder escolher"');
    ok(nova.selo && /12/.test(nova.selo),
      `o selo do foco futuro não diz o nível: "${nova.selo}"`);
    ok(/\b11\b/.test(nova.linha),
      `a linha não diz QUANTOS níveis faltam: "${nova.linha}". "Ainda não" sem ` +
      'número é uma parede sem placa — é o D-067');

    /* E ela conta certo de qualquer nível abaixo do limiar. */
    for (const nivel of [1, 5, 11])
      ok(leituraDoFoco({ nivel, foco: null }, { perfil: 'trilha' })
           .linha.includes(String(NIVEL_PARA_ESCOLHER - nivel)),
        `no nível ${nivel} a conta do que falta saiu errada`);
  });

  s.teste('as outras três leituras não se confundem entre si', () => {
    const t = 1_000_000;
    igual(leituraDoFoco({ nivel: 20, foco: null }, { perfil: 'trilha', agora: t }).estado,
      'pode', 'quem chegou ao 12 e não escolheu não está sendo chamado');
    igual(leituraDoFoco({ nivel: 20, foco: null, descansaAte: t + 1 },
      { perfil: 'trilha', agora: t }).estado, 'reaprendendo',
      'quem está no descanso da troca aparece como se pudesse escolher agora');
    const tem = leituraDoFoco({ nivel: 20, foco: 'trilheiro' }, { perfil: 'trilha' });
    igual(tem.estado, 'tem', 'quem já escolheu não é lido como tal');
    ok(tem.cor, 'o foco escolhido veio sem cor — o selo não se distingue dos outros');
    ok(/Trilheiro/i.test(tem.selo), `o selo não nomeia o foco: "${tem.selo}"`);
  });

  /* ── E O NEUTRO SE DIZ, EM VEZ DE SE ESCONDER ─────────────────────────
     O jogador escolheu aquele foco. Ele precisa saber que está guardado para
     outro modo, e não quebrado — linha em branco no lugar de explicação é
     lida como defeito. */
  s.teste('o foco que não rende no Avanço DIZ que não rende', () => {
    for (const neutro of ['batedor', 'vigia']) {
      const frase = valeNaRun(neutro, 'trilha');
      ok(frase, `o foco "${neutro}" devolveu vazio no Avanço — a coluna ficaria ` +
        'com uma linha em branco, e linha em branco é lida como defeito');
      ok(/nada aqui/i.test(frase) && /Rota OFF/i.test(frase),
        `a frase do foco neutro não diz ONDE ele rende: "${frase}"`);
      /* E a leitura inteira usa a mesma frase — não uma segunda redação. */
      igual(leituraDoFoco({ nivel: 20, foco: neutro }, { perfil: 'trilha' }).linha, frase,
        'a coluna tem uma segunda redação para o foco neutro');
    }

    /* Os que rendem dizem o QUANTO, e o número sai do motor. */
    ok(/35%/.test(valeNaRun('trilheiro', 'trilha')),
      'o Trilheiro não diz quanto material a mais ele traz');
    ok(/40%/.test(valeNaRun('sortudo', 'trilha')),
      'o Sortudo não diz quanto ele melhora o item raro');
    ok(/OUTROS/.test(valeNaRun('guia', 'trilha')),
      'o Guia não diz que o bônus dele é para os outros — é o que o define');

    /* E o custo de encontros do Trilheiro NÃO é anunciado aqui: o elenco do
       estágio é fixo em seis, e cobrar por ele seria a tela cobrando um preço
       que o motor não cobra. */
    ok(!/encontro/i.test(valeNaRun('trilheiro', 'trilha')),
      'o custo de encontros foi anunciado num modo de elenco fixo');
    ok(INERTES_NO_AVANCO.includes('encontros'),
      'os encontros saíram da lista de inertes do Avanço');

    igual(valeNaRun(null, 'trilha'), null, 'sem foco, não há o que explicar');
    igual(valeNaRun('inventado', 'trilha'), null, 'um foco que não existe virou frase');
  });

  return s;
}
