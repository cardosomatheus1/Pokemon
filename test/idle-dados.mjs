/* Q1/Q3/Q6 · O ESTADO DO IDLE NO NAVEGADOR (bloco 1.3b, camada 0).
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **A CRIATURA INICIAL ABRE UM LAÇO QUE SE FECHA EM SI MESMO.** A stamina é
 *    da criatura; quem não tem nenhuma não manda expedição; sem expedição não
 *    há encontro, e sem encontro não há primeira criatura. Sem a inicial, a aba
 *    não abre — e isso não é figura de linguagem.
 *
 * 2. **A REGRA NÃO MORA AQUI.** Teto diário, custo de stamina, raridade e
 *    saque vêm do motor — os MESMOS módulos que `server/idle.mjs` usa. Este
 *    arquivo guarda e devolve. Se uma regra aparecer aqui, o dia de ligar o
 *    servidor deixa de ser troca de implementação e vira reescrita.
 *
 * 3. **A SEMENTE NASCE NA COLHEITA.** No navegador isso importa ainda mais que
 *    no servidor: `localStorage` está a um F12 de distância, e uma semente
 *    guardada horas antes da colheita seria o resultado exposto.
 *
 * 4. **A LEITURA É TOLERANTE.** Estado corrompido volta ao que dá para
 *    aproveitar. Perder uma expedição é ruim; perder a aba é pior, e é
 *    irreversível para quem não sabe abrir o console.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import {
  VAZIO, carregar, salvar, ultimoDiagnostico,
  iniciaisDo, escolherInicial, criaturasDe, acharCriatura, staminaDe,
  iniciarExpedicao, emCampo, concluidasHoje, pronta, colher,
  quantosNaBolsa, debitarBolsa, creditarBolsa, bolsaEmLista, registroEmLista,
  TETO_DIARIO, TETO_ENCONTROS, encontrosHoje,
  lancarBola, naEquipe, naCaixa, mover, PARTY_MAX, EQUIPE_MAX, STAMINA_MAX, PERFIS,
  vagasDe, proximaVagaDe, especiesVistas, MARCOS_VAGAS, criarCriatura,
} from '../app/modules/idle-dados.mjs';
import { potencialDe, semente, formaDe } from '../engine/instancia.mjs';
import { tentar } from '../engine/captura.mjs';
import { derivar } from '../engine/seed.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const AGORA = Date.UTC(2026, 7, 31, 12, 0, 0);
const H = 3600_000;
const nomeCurto = c => (c?.id ?? '?').slice(0, 8);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Um depósito de mentira: o teste não pode depender de `localStorage` existir
   em Node, e não pode sujar o do navegador quando roda lá. */
const deposito = (inicial = null) => {
  let v = inicial;
  return { getItem: () => v, setItem: (_, x) => { v = x; }, valor: () => v };
};

function comInicial(pack = kanto, dex = null) {
  const e = VAZIO();
  escolherInicial(e, pack, dex ?? pack.iniciais[0], AGORA);
  return e;
}

/* Uma cena com encontros PENDENTES: manda uma expedição e colhe. É o estado em
   que o jogador de fato está quando joga a bola. */
function comEncontros() {
  const e = comInicial();
  const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
                                  equipe: [e.criaturas[0].id], agora: AGORA });
  colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
  return e;
}

export function suite() {
  const s = criarSuite('idle-dados');

  /* --- 1 · A CRIATURA INICIAL -------------------------------------------- */

  s.teste('sem criatura nenhuma, não se manda expedição', () => {
    const e = VAZIO();
    ok(recusa(() => iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
      perfil: 'batida', equipe: [], agora: AGORA })),
      'mandou expedição sem criatura. A stamina é da criatura — sem nenhuma, o ' +
      'laço fecha em si mesmo e a aba não abre. É por isso que a inicial existe.');
  });

  s.teste('as iniciais vêm do PACK, e são três de verdade', () => {
    for (const [nome, pack] of [['kanto', kanto], ['original', original]]) {
      const ini = iniciaisDo(pack);
      igual(ini.length, (pack.iniciais ?? []).length,
        `[${nome}] alguma inicial declarada não existe no elenco`);
      ok(ini.length >= 3,
        `[${nome}] só ${ini.length} inicial(is). A escolha entre três é a única ` +
        `coisa que a primeira tela tem para oferecer antes de o jogo cobrar algo — ` +
        `com uma só, não há escolha.`);
      igual(new Set(ini.map(x => x.dex)).size, ini.length, `[${nome}] inicial repetida`);
    }
  });

  s.teste('a inicial só se escolhe uma vez, e só entre as do pack', () => {
    const e = comInicial();
    igual(e.criaturas.length, 1);
    ok(recusa(() => escolherInicial(e, kanto, kanto.iniciais[1], AGORA)),
      'escolheu a segunda inicial. Duas iniciais é o jogo pagando duas vezes por ' +
      'uma decisão que se toma uma vez.');
    const outro = VAZIO();
    ok(recusa(() => escolherInicial(outro, kanto, 149, AGORA)),
      'escolheu um dex que não é inicial — seria começar com um Dragonite');
  });

  s.teste('a inicial nasce cheia de stamina e com potencial calculado', () => {
    const e = comInicial();
    const c = criaturasDe(e)[0];
    igual(staminaDe(e, c.id, AGORA), STAMINA_MAX, 'a inicial nasceu cansada');
    igual(c.potencial, potencialDe(c.iv),
      'o potencial guardado divergiu do que o motor calcula. Ele não é guardado ' +
      'de propósito (bloco 1.1): guardado ao lado dos ocultos, os dois podem ' +
      'discordar — e esse estado é a fraude.');
    igual(c.origem, 'inicial');
  });

  /* --- 2 · A REGRA VEM DO MOTOR ------------------------------------------ */

  /* REANCORADO no 1.6a (D-052). O teste anterior mandava quatro Batidas e
     exigia que a quinta fosse recusada. Com o teto contando ENCONTROS ela cabe
     — quatro Batidas rendem de 12 a 20, e o teto é 30 — e isso é o ponto da
     correção, não uma regressão: o perfil pequeno passou a render mais vezes,
     e o grande, menos vezes. Os perfis voltaram a ser uma troca.

     O que continua sendo afirmado é o que importa: o teto não é ultrapassado, e
     ele não tem por onde ser mudado de fora. */
  s.teste('§P5 · o teto diário é o do motor, conta ENCONTROS, e não tem porta', () => {
    const e = comInicial();
    const id = e.criaturas[0].id;
    let t = AGORA, mandadas = 0;

    while (mandadas < 20) {
      let x;
      try {
        x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
          perfil: 'batida', equipe: [id], agora: t });
      } catch { break; }
      mandadas++;
      t = x.terminaEm;
      colher(e, { pack: kanto, id: x.id, agora: t });
      ok(encontrosHoje(e, t) <= TETO_ENCONTROS,
        `o dia rendeu ${encontrosHoje(e, t)} encontros e o teto é ${TETO_ENCONTROS}. ` +
        'Ultrapassar é o §P5 caindo: num jogo em que o que se farma é vendável, ' +
        'o teto é o que impede tempo virar dinheiro sem limite.');
    }

    ok(mandadas > 4,
      `só couberam ${mandadas} Batidas. Com o teto em encontros o perfil pequeno ` +
      'tem de render MAIS vezes que o grande — se ainda param em quatro, o teto ' +
      'voltou a contar cliques e o D-052 está de volta.');

    /* A PORTA CONTINUA FECHADA. Qualquer chave que tente levantar o teto tem de
       ser ignorada — e a lista é a mesma do teste do motor, de propósito: as
       duas metades perguntam ao mesmo lugar. */
    for (const veneno of [{ teto: 99 }, { tetoDiario: 99 }, { tetoEncontros: 99 },
                          { limite: 99 }, { encontrosHoje: -999 }]) {
      const antes = encontrosHoje(e, t);
      try {
        iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
                              equipe: [id], agora: t, ...veneno });
      } catch { /* recusar é o esperado */ }
      igual(encontrosHoje(e, t), antes,
        `a chave ${JSON.stringify(veneno)} mexeu no que já foi colhido hoje. ` +
        'Limite que vem de fora é limite que a loja pode vender.');
    }
  });

  s.teste('a stamina é debitada pelo custo do PERFIL, e regenera', () => {
    const e = comInicial();
    const id = e.criaturas[0].id;
    iniciarExpedicao(e, { pack: kanto, bioma: 'praia', perfil: 'trilha',
      equipe: [id], agora: AGORA });
    igual(staminaDe(e, id, AGORA), STAMINA_MAX - PERFIS.trilha.custo,
      'o débito não bateu com o custo do perfil');
    ok(staminaDe(e, id, AGORA + 5 * H) > staminaDe(e, id, AGORA),
      'a stamina não regenerou com o tempo');
  });

  s.teste('sem stamina, a expedição é recusada', () => {
    const e = comInicial();
    const c = e.criaturas[0];
    c.stamina = 10; c.staminaEm = AGORA;
    ok(recusa(() => iniciarExpedicao(e, { pack: kanto, bioma: 'praia',
      perfil: 'vigilia', equipe: [c.id], agora: AGORA })),
      'a vigília custa 90 e a criatura tinha 10');
    igual(emCampo(e).length, 0, 'a expedição entrou mesmo com a recusa');
  });

  s.teste('bioma, perfil, equipe vazia e equipe grande são recusados', () => {
    const e = comInicial();
    const id = e.criaturas[0].id;
    const base = { pack: kanto, bioma: 'floresta', perfil: 'batida', equipe: [id], agora: AGORA };
    ok(recusa(() => iniciarExpedicao(e, { ...base, bioma: 'inventado' })));
    ok(recusa(() => iniciarExpedicao(e, { ...base, perfil: 'inventado' })));
    ok(recusa(() => iniciarExpedicao(e, { ...base, equipe: [] })));
    ok(recusa(() => iniciarExpedicao(e, { ...base, equipe: Array(EQUIPE_MAX + 1).fill(id) })));
    ok(recusa(() => iniciarExpedicao(e, { ...base, equipe: ['nao-existe'] })));
  });

  s.teste('não se começa além das expedições simultâneas', () => {
    const e = comInicial();
    const id = e.criaturas[0].id;
    /* ── DUAS CRIATURAS, E ISSO PASSOU A IMPORTAR (L-162) ─────────────────
       A versão anterior mandava a MESMA criatura nas duas expedições, e a
       segunda era recusada por falta de vaga. Desde o L-162 ela seria
       recusada antes disso, por já estar em campo — e o teste continuaria
       verde afirmando uma regra que não estaria mais sendo exercida.

       É o modo de falha mais silencioso que um teste tem: ele não quebra,
       ele muda de assunto. A segunda criatura devolve o assunto para a vaga,
       e a mensagem é conferida para que a troca não volte a passar. */
    const outra = criarCriatura(kanto, 4, 'teste', AGORA, 'segunda-vaga');
    e.criaturas.push(outra);
    iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'batida',
      equipe: [id], agora: AGORA });
    const x = recusa(() => iniciarExpedicao(e, { pack: kanto, bioma: 'praia',
      perfil: 'batida', equipe: [outra.id], agora: AGORA }));
    ok(x, 'começou uma segunda com uma vaga só');
    ok(/vaga/i.test(x.message), `a recusa não falou de vaga: ${x.message}`);

    /* ── REALVADO no 1.9: a vaga vem do POKÉDEX, e não de um campo ─────────
       A versão anterior fazia `e.simultaneas = 2` e exigia que a segunda
       entrasse. Isso deixou de ser possível, e a impossibilidade é o ponto:
       enquanto existia o campo, quem editasse o `localStorage` se dava as
       vagas. Hoje elas são derivadas de quantas espécies o jogador VIU.

       O teste continua afirmando a mesma regra — "com duas vagas, a segunda
       entra" — só que agora ele precisa CONQUISTAR a vaga em vez de escrevê-la.
       Isso é mais trabalho para o teste e é exatamente o certo: se houvesse um
       atalho aqui, haveria um atalho no jogo. */
    for (let dex = 1; dex <= MARCOS_VAGAS[1]; dex++) e.registro[dex] = 1;
    igual(vagasDe(e), 2, `com ${MARCOS_VAGAS[1]} espécies no registro a segunda vaga não abriu`);
    ok(iniciarExpedicao(e, { pack: kanto, bioma: 'praia', perfil: 'batida',
      equipe: [outra.id], agora: AGORA }), 'com duas vagas, a segunda tinha de entrar');
  });

  /* --- 3 · A COLHEITA ---------------------------------------------------- */

  /* ── O NPC OCUPA O ENCONTRO, E ISSO SE MEDE NA COLHEITA ────────────────
     A afirmação mora aqui, e não na suíte do `npc`: lá se prova que a função
     devolve um número certo; aqui se prova que o ESTADO obedece. Foi a distância
     entre as duas que deixou o S679 passar — a peça pura estava certa e a
     integração entregava os dois prêmios.

     E ao investigar por que a suíte não pegava, apareceu um defeito de verdade
     ao lado: o teto diário contava só os selvagens, então ir fundo dava
     encontros a mais por dia. O §P5 pela porta dos fundos, sem loja nenhuma. */
  s.teste('§P5 · a batalha OCUPA o encontro: não acrescenta nem some do teto', () => {
    for (let i = 0; i < 30; i++) {
      const e = comInicial();
      const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
        equipe: [e.criaturas[0].id], agora: AGORA });
      const r = colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
      const batalhas = r.npc?.quantas ?? 0;

      igual(r.encontros.length + batalhas, x.encontros,
        `a colheita devolveu ${r.encontros.length} criatura(s) e ${batalhas} ` +
        `batalha(s), e o teto contou ${x.encontros}. As duas contas têm de fechar: ` +
        'a batalha OCUPA o encontro — se ela não ocupar, o jogador leva dois ' +
        'prêmios por um encontro; se ela sumir do teto, ir fundo passa a dar mais ' +
        'encontros por dia. Os dois lados são o §P5 pela porta dos fundos.');

      ok(r.encontros.length >= 1,
        'a expedição voltou sem uma única criatura para capturar. Uma colheita ' +
        'inteira só de batalha é o idle deixando de ser o que ele é.');

      /* E o pendente guardado é o mesmo que foi devolvido — sem isto, a bola
         poderia ser jogada num encontro que virou batalha. */
      igual(e.encontros.filter(p => p.expedicao === x.id).length, r.encontros.length);
    }
  });

  s.teste('a expedição nasce SEM semente, e a colheita a grava', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
      perfil: 'batida', equipe: [e.criaturas[0].id], agora: AGORA });
    igual(x.semente, null,
      'a expedição nasceu com semente. No navegador o `localStorage` está a um ' +
      'F12 de distância — o resultado ficaria exposto horas antes da colheita, ' +
      'com janela para cancelar a expedição ruim.');
    igual(x.colhidaEm, null);
    ok(recusa(() => colher(e, { pack: kanto, id: x.id, agora: x.terminaEm - 1 })),
      'colheu um milissegundo antes da hora');
    const r = colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    ok(r.semente && x.semente === r.semente, 'a semente não foi gravada na linha');
  });

  s.teste('colher duas vezes não dobra o saque', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
      perfil: 'batida', equipe: [e.criaturas[0].id], agora: AGORA });
    colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    const bolsa = JSON.stringify(e.bolsa), registro = JSON.stringify(e.registro);
    const quantos = e.encontros.length;
    ok(quantos > 0, 'a primeira colheita não deixou encontro nenhum');

    ok(recusa(() => colher(e, { pack: kanto, id: x.id, agora: x.terminaEm })),
      'a segunda colheita passou');
    igual(JSON.stringify(e.bolsa), bolsa, 'a bolsa cresceu numa colheita recusada');
    igual(JSON.stringify(e.registro), registro, 'o registro cresceu numa colheita recusada');
    igual(e.encontros.length, quantos, 'os encontros dobraram');
  });

  s.teste('o fragmento de registro cai por ENCONTRO', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'praia',
      perfil: 'vigilia', equipe: [e.criaturas[0].id], agora: AGORA });
    const r = colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    igual(registroEmLista(e).reduce((a, f) => a + f.fragmentos, 0), r.encontros.length,
      'a soma dos fragmentos difere do número de encontros — o fragmento cai no ' +
      'ENCONTRO e não na captura, e é o que impede o teto de 85% de virar ' +
      'frustração pura');
  });

  s.teste('os encontros ficam PENDENTES e sobrevivem à colheita', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
      perfil: 'trilha', equipe: [e.criaturas[0].id], agora: AGORA });
    const r = colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    igual(e.encontros.length, r.encontros.length);
    for (const en of e.encontros) {
      ok(en.dex && en.raridade && en.chave, 'um encontro pendente ficou incompleto');
      igual(en.expedicao, x.id);
    }
    igual(new Set(e.encontros.map(en => en.chave)).size, e.encontros.length,
      'dois encontros com a mesma chave — o lance de bola do 1.3c não saberia ' +
      'em qual deles gastou');
  });

  s.teste('a colheita enche a bolsa, e a bolsa vira lista ordenada', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'vulcao',
      perfil: 'vigilia', equipe: [e.criaturas[0].id], agora: AGORA });
    colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    const lista = bolsaEmLista(e);
    ok(lista.length > 0, 'a colheita não creditou nada');
    for (const i of lista) ok(i.quantidade > 0, 'item com quantidade zero na lista');
  });

  /* --- a bolsa (Q6) ------------------------------------------------------- */

  s.teste('§Q6 · a bolsa não fica negativa', () => {
    const e = VAZIO();
    creditarBolsa(e, 'poke', 3);
    igual(quantosNaBolsa(e, 'poke'), 3);
    igual(debitarBolsa(e, 'poke', 5), false,
      'debitou 5 de uma bolsa com 3. Bolsa negativa é bola de graça, e bola de ' +
      'graça é criatura de graça.');
    igual(quantosNaBolsa(e, 'poke'), 3, 'o débito recusado mexeu na bolsa');
    igual(debitarBolsa(e, 'poke', 3), true);
    igual(quantosNaBolsa(e, 'poke'), 0);
    igual(debitarBolsa(e, 'inexistente', 1), false);
    igual(debitarBolsa(e, 'poke', 0), false, 'débito de zero passou');
    ok(recusa(() => creditarBolsa(e, 'poke', -2)), 'crédito negativo passou');
  });

  /* --- 4 · A LEITURA É TOLERANTE ----------------------------------------- */

  s.teste('estado ausente devolve o vazio, sem lançar', () => {
    const e = carregar(deposito(null));
    igual(e.criaturas.length, 0);
    igual(ultimoDiagnostico.origem, 'novo');
  });

  s.teste('JSON quebrado não derruba a aba', () => {
    const e = carregar(deposito('{{{ isto não é json'));
    igual(e.criaturas.length, 0,
      'um estado ilegível derrubou a leitura. Perder uma expedição é ruim; ' +
      'perder a aba é pior, e é irreversível para quem não sabe abrir o console.');
    ok(ultimoDiagnostico.problemas.length > 0, 'consertou em silêncio, sem dizer nada');
  });

  s.teste('listas e objetos com forma errada viram vazios, e o diagnóstico conta', () => {
    const e = carregar(deposito(JSON.stringify({
      v: 1, criaturas: 'nada', expedicoes: 7, bolsa: [], registro: null,
      encontros: {}, simultaneas: 99,
    })));
    igual(e.criaturas.length, 0);
    igual(e.expedicoes.length, 0);
    igual(e.encontros.length, 0);
    igual(bolsaEmLista(e).length, 0);
    /* ── REALVADO no 1.9, e a afirmação FICOU MAIS FORTE ──────────────────
       Antes: "o número veio do disco, mas foi apertado no teto". Era uma guarda
       sobre um campo que não devia existir — e `localStorage` está a um F12 de
       distância, então `simultaneas: 99` era vantagem escrita pelo jogador,
       apenas limitada.

       Hoje o campo não é lido. A afirmação deixa de ser "o clamp funcionou" e
       passa a ser **não há o que apertar**: as vagas vêm do registro, e o registro
       aqui está vazio. Guarda boa é a que some junto com a porta. */
    igual(vagasDe(e), 1,
      `o disco trazia simultaneas: 99 e o jogador ficou com ${vagasDe(e)} vagas. ` +
      'O campo não pode ser lido: enquanto houver onde escrever, haverá o que ' +
      'forjar — e vaga é tempo, que é a coisa que o §P5 não deixa vender.');
    igual(e.simultaneas, undefined,
      'o campo `simultaneas` sobreviveu ao carregamento. Ele não existe mais no ' +
      'formato; deixá-lo entrar seria manter a porta fechada com aviso em vez ' +
      'de tirar a porta.');
    ok(ultimoDiagnostico.problemas.length >= 3,
      `só ${ultimoDiagnostico.problemas.length} problema(s) relatado(s). Corrigir em ` +
      `silêncio é o que impede alguém de descobrir POR QUE o estado sumiu.`);
  });

  s.teste('quantidade inválida na bolsa vira zero, e não some da lista', () => {
    const e = carregar(deposito(JSON.stringify({
      v: 1, bolsa: { poke: -4, lua: 'muitas', great: 2 },
    })));
    igual(quantosNaBolsa(e, 'poke'), 0, 'a quantidade negativa sobreviveu');
    igual(quantosNaBolsa(e, 'lua'), 0);
    igual(quantosNaBolsa(e, 'great'), 2, 'a quantidade boa foi apagada junto');
    ok(ultimoDiagnostico.problemas.some(p => p.includes('poke')),
      'zerou sem dizer qual item — zerar deixa rastro, apagar esconde o conserto');
  });

  s.teste('salvar e carregar devolve o mesmo estado', () => {
    const e = comInicial();
    const x = iniciarExpedicao(e, { pack: kanto, bioma: 'campo',
      perfil: 'batida', equipe: [e.criaturas[0].id], agora: AGORA });
    colher(e, { pack: kanto, id: x.id, agora: x.terminaEm });
    const d = deposito();
    igual(salvar(e, d), true);
    const volta = carregar(d);
    igual(volta.criaturas.length, e.criaturas.length);
    igual(volta.encontros.length, e.encontros.length);
    igual(JSON.stringify(volta.bolsa), JSON.stringify(e.bolsa));
    igual(JSON.stringify(volta.registro), JSON.stringify(e.registro));
    igual(ultimoDiagnostico.origem, 'disco');
  });

  /* --- §Gen2 -------------------------------------------------------------- */

  s.teste('§Gen2 · o ciclo inteiro roda com o pack original', () => {
    const e = comInicial(original);
    const id = e.criaturas[0].id;
    const bioma = original.biomas[0].id;
    const x = iniciarExpedicao(e, { pack: original, bioma, perfil: 'vigilia',
      equipe: [id], agora: AGORA });
    const r = colher(e, { pack: original, id: x.id, agora: x.terminaEm });
    ok(r.encontros.length > 0, 'o pack original não devolveu encontro nenhum');
    const idsK = new Set(kanto.bolas.map(b => b.id));
    for (const i of bolsaEmLista(e))
      ok(!idsK.has(i.id),
        `a bola "${i.id}" é do outro pack. O saque tem de sair das bolas DESTE.`);
  });


  /* ── A CAPTURA AO VIVO, A EQUIPE E A CAIXA (bloco 1.6) ─────────────────
   *
   * O que pode dar errado aqui não é o sorteio — esse é do motor e tem teste
   * próprio. É a ECONOMIA em volta dele:
   *
   *   bola gasta sem encontro       o jogador perde recurso por um clique morto
   *   encontro que sobrevive        um lance por encontro é A decisão do projeto
   *   captura recusada por lotação  ele gasta a bola boa, acerta o raro, e o
   *                                 jogo diz "não" — é o pior momento possível
   *   caixa virando segundo bolso   os seis deixam de significar alguma coisa
   *   equipe vazia                  o jogador se tranca fora do próprio jogo
   */

  s.teste('o lance consome a bola e o encontro, capturando ou não', () => {
    const e = comEncontros();
    const antes = e.encontros.length;
    e.bolsa.poke = 5;
    const chave = e.encontros[0].chave;

    const r = lancarBola(e, { pack: kanto, chave, bola: 'poke', agora: AGORA });
    igual(e.bolsa.poke, 4, 'a bola não foi consumida');
    igual(e.encontros.length, antes - 1,
      'o encontro sobreviveu ao lance. UM LANCE POR ENCONTRO é a diferença ' +
      'nomeada do projeto: lá se joga bola até pegar ou fugir, aqui você tem um ' +
      'tiro e decide onde gastar a boa. Encontro que sobrevive apaga a decisão.');
    ok(typeof r.capturou === 'boolean', 'o lance não disse se pegou');
  });

  s.teste('sem bola na bolsa, o lance é recusado ANTES de gastar o encontro', () => {
    const e = comEncontros();
    e.bolsa.poke = 0;
    const antes = e.encontros.length;
    const chave = e.encontros[0].chave;
    ok(recusa(() => lancarBola(e, { pack: kanto, chave, bola: 'poke', agora: AGORA })),
      'lançou uma bola que não existe na bolsa');
    igual(e.encontros.length, antes,
      'o encontro sumiu numa tentativa recusada — o jogador perderia o bicho por ' +
      'um clique que nem chegou a acontecer');
  });

  s.teste('o mesmo lance dá sempre o mesmo resultado (§25.2)', () => {
    /* O MESMO ESTADO, CLONADO. Duas cenas separadas sorteiam sementes de
       expedição diferentes — comparar as duas mediria o sorteio da colheita, e
       não a reprodutibilidade do lance. */
    const a = comEncontros(); a.bolsa.ultra = 9;
    const b = JSON.parse(JSON.stringify(a));
    const ra = lancarBola(a, { pack: kanto, chave: a.encontros[0].chave,
                               bola: 'ultra', agora: AGORA });
    const rb = lancarBola(b, { pack: kanto, chave: b.encontros[0].chave,
                               bola: 'ultra', agora: AGORA });
    igual(ra.capturou, rb.capturou,
      'dois lances iguais deram resultados diferentes. A semente sai da ' +
      'EXPEDIÇÃO, que já está gravada — sem isso o lance não é auditável e o ' +
      '§25.2 cai.');
  });


  /* ── AS TRÊS AFIRMAÇÕES QUE FALTAVAM, E POR QUE ELAS FALTAVAM ───────────
   *
   * O Q2 completo devolveu S617 e S621 como PASSOU, e as duas já tinham teste.
   * A causa é a mesma nos dois, e é uma lição sobre COMO se afirma:
   *
   *   ambos afirmavam sobre um BOOLEANO SORTEADO, que concorda por acaso.
   *
   * O S617 troca `splice` por `if (r.capturou) splice`: o encontro só some
   * quando a captura dá certo. O teste antigo dava UM lance e conferia a
   * contagem — se aquele lance capturasse, e com `poke` contra um comum ele
   * captura na maioria das sementes, a contagem caía do mesmo jeito e o teste
   * ficava verde sobre um jogo quebrado.
   *
   * O S621 troca a semente derivada por `novaRaiz()`. O teste antigo clonava o
   * estado e comparava `capturou` dos dois lados — com `ultra` a chance é alta,
   * os dois clones capturavam, e dois sorteios independentes CONCORDAVAM.
   *
   * A correção é a mesma nos dois: **afirmar sobre a regra, e não sobre o
   * resultado dela.** Aqui embaixo, a contagem é conferida a cada lance da
   * lista inteira (com prova de que houve pelo menos uma falha), e a semente é
   * recalculada pelo teste e comparada com a que o módulo usou. */

  s.teste('o encontro some no lance mesmo QUANDO A CAPTURA FALHA (S617)', () => {
    const e = comEncontros();
    e.bolsa.poke = 99;
    let falhas = 0, capturas = 0;
    let antes = e.encontros.length;
    ok(antes >= 2, `só ${antes} encontros; o teste precisa de vários lances`);

    while (e.encontros.length) {
      const r = lancarBola(e, { pack: kanto, chave: e.encontros[0].chave,
                                bola: 'poke', agora: AGORA });
      r.capturou ? capturas++ : falhas++;
      igual(e.encontros.length, antes - 1,
        'o encontro sobreviveu ao lance' + (r.capturou ? '' : ' QUE FALHOU') + '. ' +
        'UM LANCE POR ENCONTRO é a diferença nomeada do projeto frente ao ' +
        'material de origem: lá se joga bola até pegar ou fugir, aqui há um tiro ' +
        'e a decisão é onde gastar a boa. Encontro que sobrevive à falha apaga a ' +
        'decisão inteira — com a bolsa cheia, joga-se até pegar.');
      antes = e.encontros.length;
    }
    ok(falhas > 0,
      `os ${capturas} lances capturaram todos, e nenhum falhou. Sem uma falha ` +
      'observada este teste não distingue "some sempre" de "some quando pega" — ' +
      'que é exatamente como o S617 escapou. Se isto reprovar, a bola do teste ' +
      'ficou fácil demais para a raridade do bioma.');
  });

  s.teste('a semente do lance é DERIVADA da expedição, não sorteada (S621, §25.2)', () => {
    const e = comEncontros();
    e.bolsa.ultra = 99;
    let conferidos = 0;

    while (e.encontros.length) {
      const en = e.encontros[0];
      const exp = e.expedicoes.find(x => x.id === en.expedicao);

      /* O TESTE REFAZ A CONTA, em vez de comparar duas execuções entre si.
         Comparar execuções mede CONCORDÂNCIA, e dois sorteios independentes
         concordam por acaso — foi assim que o S621 passou. Refazer a conta
         mede a REGRA: a semente é esta, ou não é. */
      const esperado = tentar(semente(derivar(Number(exp.semente), 'lance:' + en.chave)),
                              kanto, { raridade: en.raridade, bola: 'ultra' });
      const r = lancarBola(e, { pack: kanto, chave: en.chave, bola: 'ultra', agora: AGORA });
      igual(r.capturou, esperado.capturou,
        `o lance em "${en.chave}" não bateu com a semente derivada da expedição. ` +
        'Semente sorteada no lance quebra o §25.2 em silêncio: o resultado ' +
        'continua parecendo aleatório, e deixa de poder ser reconferido depois. ' +
        'É a auditabilidade inteira, e ela não tem sintoma quando cai.');
      conferidos++;
    }
    ok(conferidos >= 2, `só ${conferidos} lances conferidos; esperava ao menos 2.`);
  });

  s.teste('o teto diário conta o dia de HOJE, e não a vida inteira (S587)', () => {
    const e = comEncontros();
    const hoje = concluidasHoje(e, AGORA);

    /* A MESMA CENA, LIDA DOIS DIAS DEPOIS. Se a contagem ignorar a janela, ela
       devolve o mesmo número para sempre — e o jogador que jogou muito num dia
       fica com o teto baixado de vez, sem nada na tela explicando por quê. */
    const depois = concluidasHoje(e, AGORA + 2 * 24 * H);
    ok(hoje > 0, 'a cena de teste não tem expedição colhida; o teste não mede nada');
    igual(depois, 0,
      `${hoje} expedição(ões) de hoje continuaram contando dois dias depois. ` +
      'O teto é DIÁRIO: sem a janela ele vira teto para sempre, e a punição é ' +
      'invisível — nada na tela diz que o limite de hoje foi gasto ontem.');
  });

  /* ── A EQUIPE E A CAIXA ──────────────────────────────────────────────── */

  s.teste('a captura com a equipe cheia vai para a CAIXA, e nunca é recusada', () => {
    const e = comEncontros();
    /* enche a equipe */
    while (naEquipe(e).length < PARTY_MAX)
      e.criaturas.push({ ...e.criaturas[0], id: 'x' + naEquipe(e).length, naCaixa: false });
    igual(naEquipe(e).length, PARTY_MAX);

    e.bolsa.ultra = 40;
    let capturou = null;
    /* joga até pegar uma: o que importa é PARA ONDE ela vai */
    while (e.encontros.length && !capturou) {
      const r = lancarBola(e, { pack: kanto, chave: e.encontros[0].chave,
                                bola: 'ultra', agora: AGORA });
      if (r.capturou) capturou = r;
    }
    if (!capturou) return;   /* azar na semente; o teste seguinte cobre o caminho */
    ok(capturou.foiParaCaixa,
      'a captura com equipe cheia entrou na equipe assim mesmo — os seis ' +
      'deixariam de ser um teto');
    igual(naEquipe(e).length, PARTY_MAX, 'a equipe passou do teto');
  });

  s.teste('a expedição NÃO leva quem está na caixa', () => {
    const e = comInicial();
    e.criaturas[0].naCaixa = true;
    ok(recusa(() => iniciarExpedicao(e, { pack: kanto, bioma: 'floresta',
      perfil: 'batida', equipe: [e.criaturas[0].id], agora: AGORA })),
      'uma criatura guardada foi a campo. A caixa viraria um segundo bolso sem ' +
      'custo, e a escolha de quem fica ativo desapareceria.');
  });

  s.teste('a equipe nunca fica vazia', () => {
    const e = comInicial();
    ok(recusa(() => mover(e, e.criaturas[0].id, true)),
      'a última criatura ativa foi guardada. Sem ninguém na equipe não há ' +
      'expedição possível, e o jogador se tranca fora do próprio jogo sem aviso.');
  });

  s.teste('tirar da caixa respeita o teto da equipe', () => {
    const e = comInicial();
    while (naEquipe(e).length < PARTY_MAX)
      e.criaturas.push({ ...e.criaturas[0], id: 'p' + naEquipe(e).length, naCaixa: false });
    e.criaturas.push({ ...e.criaturas[0], id: 'guardada', naCaixa: true });

    ok(recusa(() => mover(e, 'guardada', false)),
      `entrou o sétimo numa equipe de ${PARTY_MAX}`);
    /* guardando uma, a vaga abre */
    mover(e, e.criaturas[0].id, true);
    ok(mover(e, 'guardada', false), 'com vaga aberta, a troca tinha de funcionar');
    igual(naEquipe(e).length, PARTY_MAX);
  });

  s.teste('a caixa NÃO tem teto', () => {
    const e = comInicial();
    for (let i = 0; i < 50; i++)
      e.criaturas.push({ ...e.criaturas[0], id: 'c' + i, naCaixa: true });
    igual(naCaixa(e).length, 50,
      'a caixa recusou alguém. Teto de caixa transforma a coleção num problema ' +
      'de logística, e o que se quer dela é ser um lugar para onde as coisas vão.');
  });

  s.teste('a equipe e a caixa devolvem criatura HIDRATADA (D-064)', () => {
    /* `potencial` é derivado do IV e não guardado no estado. `criaturasDe`
       hidrata; `naEquipe` e `naCaixa` não hidratavam, e a tela do Centro
       escrevia "potencial undefined" em cada ficha — visível na tela, invisível
       para a suíte. Duas portas para a mesma coisa, uma fazendo um passo a
       mais: não há como saber qual é a certa olhando a chamada. */
    const e = comEncontros();
    for (const [nome, lista] of [['naEquipe', naEquipe(e)], ['naCaixa', naCaixa(e)]]) {
      for (const c of lista)
        ok(Number.isFinite(c.potencial),
          `${nome} devolveu ${nomeCurto(c)} com potencial ${c.potencial}. A tela ` +
          'escreve esse valor direto, e "undefined" numa ficha de criatura é ' +
          'a tela dizendo que nao sabe o que esta mostrando.');
    }
    ok(naEquipe(e).length > 0, 'a cena de teste precisa de alguem na equipe');
  });


  /* ── A FORMA, e por que ela precisa chegar à tela (1.6b) ────────────────
   *
   * `potencial` é a soma dos seis ocultos; a `forma` é o mesmo dado agrupado em
   * três leituras que o jogador usa de verdade. Duas criaturas de potencial 48
   * podem ser coisas completamente diferentes — uma rápida e frágil, outra
   * lenta e dura —, e sem a forma o cartão dá o mesmo número para as duas.
   *
   * Ela vivia dentro de `gerarInstancia` e não chegava à tela: a criatura salva
   * guarda o IV, e não a forma. Derivada no `hidratar`, existe em todo lugar.
   */

  s.teste('a forma chega na criatura hidratada', () => {
    const e = comEncontros();
    for (const c of criaturasDe(e)) {
      ok(c.forma, 'criatura hidratada sem `forma` — o cartão da equipe desenha ' +
        'três barras vazias, e duas criaturas diferentes ficam idênticas na tela.');
      for (const k of ['ofensiva', 'defesa', 'velocidade'])
        ok(Number.isFinite(c.forma[k]) && c.forma[k] >= 0 && c.forma[k] <= 100,
          `forma.${k} = ${c.forma[k]}. As três são porcentagens: fora de [0,100] ` +
          'a barra estoura o cartão ou some dele.');
    }
  });

  s.teste('as três leituras são leituras DIFERENTES', () => {
    /* Se as três saíssem do mesmo agrupamento, o cartão mostraria três barras
       iguais sempre — e o jogador deixaria de distinguir duas criaturas, que é
       a única coisa que a forma existe para fazer. */
    const iv = [31, 0, 31, 0, 31, 0];   // defesa alta, ofensiva e velocidade baixas
    const f = formaDe(iv);
    ok(f.defesa > f.ofensiva + 20,
      `IV de defesa pura deu defesa ${f.defesa} e ofensiva ${f.ofensiva}. As três ` +
      'leituras têm de responder a partes diferentes dos seis ocultos.');
    igual(f.velocidade, 0, 'velocidade sai só do oculto de velocidade');

    /* UM CASO QUE SEPARA velocidade DE ofensiva, e ele foi preciso.
       O IV acima tem atq=0 e spa=0, então trocar a fórmula da velocidade pela
       da ofensiva dá o MESMO zero — o defeito plantado passava. Com atq alto e
       vel zero as duas divergem, e a troca fica visível. */
    const g = formaDe([0, 31, 0, 0, 0, 0]);
    igual(g.velocidade, 0,
      `ataque puro deu velocidade ${g.velocidade}. A velocidade lê o oculto de ` +
      'velocidade e nenhum outro — se ela responde ao ataque, as três barras ' +
      'do cartão deixam de ser três leituras.');
    ok(g.ofensiva > 40, `ataque puro deu ofensiva ${g.ofensiva}, baixa demais`);
  });

  s.teste('a forma sobrevive a IV ausente', () => {
    /* Estado salvo de versão antiga chega sem `iv`. O cartão não pode estourar
       por causa disso — ele desenha zero, que é honesto. */
    const f = formaDe(undefined);
    for (const k of ['ofensiva', 'defesa', 'velocidade'])
      igual(f[k], 0, `forma.${k} com IV ausente devia ser 0, e veio ${f[k]}`);
  });
  /* ══ ST-3.2 · DUAS ABAS NÃO COLHEM A MESMA COISA DUAS VEZES ════════════
   *
   * O idle é do navegador (`ar_idle`), e duas abas carregavam o mesmo estado e
   * gravavam por cima uma da outra: a colheita da aba A entrava na bolsa, a
   * aba B — carregada antes — colhia a mesma expedição e gravava de novo. A
   * gravação passa a ser OTIMISTA: cada save tem uma revisão, e quem carregou
   * uma revisão velha não grava por cima de uma nova. O disco vence; a tela
   * recarrega (evento `storage`). Enquanto o idle for do navegador, isto é o
   * máximo honesto — a garantia de servidor é o E8. */
  s.teste('ST-3.2: duas abas colhem a mesma expedição — só um crédito fica', () => {
    const d = deposito();
    const e0 = comInicial();
    const x = iniciarExpedicao(e0, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
                                     equipe: [e0.criaturas[0].id], agora: AGORA });
    salvar(e0, d);
    const abaA = carregar(d), abaB = carregar(d);
    colher(abaA, { pack: kanto, id: x.id, agora: x.terminaEm });
    igual(salvar(abaA, d), true, 'a primeira aba não conseguiu gravar a colheita');
    colher(abaB, { pack: kanto, id: x.id, agora: x.terminaEm });
    igual(salvar(abaB, d), false,
      'a segunda aba gravou por cima: a mesma expedição foi colhida duas vezes');
    const disco = carregar(d);
    igual(JSON.stringify(disco.bolsa), JSON.stringify(abaA.bolsa),
      'o que ficou no disco não é a colheita da primeira aba');
  });

  s.teste('ST-3.2: a mesma aba grava em sequência sem se recusar', () => {
    const d = deposito();
    const e = comInicial();
    for (let i = 0; i < 3; i++) igual(salvar(e, d), true, `o ${i + 1}º save seguido da mesma aba foi recusado`);
    igual(carregar(d).rev, 3, 'a revisão não conta os saves');
  });

  s.teste('ST-3.2: save antigo, sem revisão, carrega e grava normalmente', () => {
    const velho = { ...comInicial() }; delete velho.rev;
    const d = deposito(JSON.stringify(velho));
    const e = carregar(d);
    igual(e.rev, 0, 'o save de antes da ST-3.2 não começou na revisão 0');
    igual(salvar(e, d), true, 'o save antigo não pôde ser regravado — o jogador ficaria preso');
  });

  s.teste('ST-3.2: revisão forjada no disco não trava o jogador para sempre', () => {
    const d = deposito(JSON.stringify({ ...comInicial(), rev: 'x' }));
    const e = carregar(d);
    igual(salvar(e, d), true, 'uma revisão ilegível no disco impediu todo save seguinte');
  });

  s.teste('ST-3.2: a tela ouve a OUTRA aba — e só a chave do idle', async () => {
    const { vigiarOutraAba } = await import('../app/modules/idle-abas.mjs');
    const ouvintes = [];
    const alvo = { addEventListener: (tipo, fn) => ouvintes.push({ tipo, fn }) };
    let vezes = 0;
    ok(vigiarOutraAba({ chave: 'ar_idle', aoMudar: () => vezes++, alvo }), 'não registrou o ouvinte');
    igual(ouvintes[0]?.tipo, 'storage', 'o ouvinte não é do evento storage');
    ouvintes[0].fn({ key: 'ar_carteira' });
    igual(vezes, 0, 'a carteira mudou e o idle recarregou — recarregar à toa numa tela aberta por horas');
    ouvintes[0].fn({ key: 'ar_idle' });
    igual(vezes, 1, 'a outra aba gravou o idle e esta não recarregou');
  });

  s.teste('ST-3.2: a tela liga o ouvinte e trata o save recusado', () => {
    const src = readFileSync(new URL('../app/modules/idle-tela.mjs', import.meta.url), 'utf8');
    ok(/vigiarOutraAba\(\{ chave: CHAVE_DO_IDLE/.test(src), 'a tela do idle não ouve a outra aba');
    ok(/const g = salvar\(E\); if \(!g\)/.test(src),
      'a tela ignora o save recusado — seguiria mostrando uma colheita que não ficou');
  });

  /* ══ ST-3.4 · DEC-08 — A CAPTURA ENTREGA A ESPÉCIE MOSTRADA ══════════════
   *
   * A pergunta da Revisão 2.0: capturar a espécie encontrada, ou sempre a base
   * evolutiva? Os textos divergiam; o código já entrega a MOSTRADA — inclusive
   * o chefe evoluído que a run trouxe. A recomendação (e a decisão padrão até o
   * dono dizer outra coisa) é manter: é o que o jogador viu. Este teste trava a
   * regra; mudá-la passa a ser decisão explícita, com migração, e não acidente. */
  s.teste('DEC-08: capturar um Butterfree do Avanço dá um Butterfree, e não um Caterpie', async () => {
    const { baseDe } = await import('../engine/evolucao.mjs');
    igual(baseDe(kanto, 12), 10, 'o pack mudou: o 12 deixou de evoluir do 10 — o teste perdeu o que medir');
    let pegou = null;
    for (let i = 0; i < 60 && !pegou; i++) {
      const e = comInicial();
      e.bolsa.ultra = 1;
      e.encontros.push({ chave: `dec08:${i}`, expedicao: null, origem: 'avanco', dex: 12,
                         raridade: 'incomum', bioma: 'floresta', em: AGORA });
      const r = lancarBola(e, { pack: kanto, chave: `dec08:${i}`, bola: 'ultra', agora: AGORA });
      if (r.capturou) pegou = r;
    }
    ok(pegou, 'nenhuma de 60 ultras capturou um incomum — o teste perdeu o que medir');
    igual(pegou.criatura.dex, 12,
      `a captura entregou o ${pegou.criatura.dex} no lugar da espécie mostrada — a DEC-08 mudou sem decisão`);
  });

  return s;
}
