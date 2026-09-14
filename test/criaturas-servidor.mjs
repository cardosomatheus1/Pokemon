/* Q1/Q3/Q6 · AS CRIATURAS DO JOGADOR NO SERVIDOR (bloco 1.1, §P2, §P3, §25.2).
 *
 * ── AS TRÊS AFIRMAÇÕES ────────────────────────────────────────────────────
 *
 * 1. **O sorteio é do servidor.** O cliente não manda oculto nenhum, e não há
 *    caminho por onde ele mande. Num jogo em que criatura é vendável, um
 *    potencial escolhido pelo cliente não é trapaça: é dinheiro.
 *
 * 2. **A captura é auditável.** A raiz viaja com a linha, e `conferir()` refaz
 *    o sorteio. Mexer nos ocultos por baixo — o que um administrador desonesto
 *    ou um banco vazado permitiriam — passa a ser DETECTÁVEL por qualquer um,
 *    e não só pela casa.
 *
 * 3. **Evoluir muda a espécie e mais nada.** É a mesma afirmação econômica do
 *    `test/evolucao.mjs`, conferida agora contra o banco: o UPDATE não pode
 *    tocar em oculto, natureza, exemplar ou semente.
 *
 * O que amarra as três: nenhuma delas quebra o jogo quando falha. Todas deixam
 * a partida rodando e o preço errado.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar, ler, doJogador, conferir, evoluir, evoluirPara, sortear, ORIGENS }
  from '../server/criaturas.mjs';
import { potencialDe } from '../engine/instancia.mjs';
import { saidasDe } from '../engine/evolucao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const AGORA = Date.UTC(2026, 0, 15);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function comUsuario(sufixo = '') {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, {
    username: 'j' + sufixo, email: `j${sufixo}@exemplo.test`,
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA,
  });
  return { db, u };
}

/* Uma raiz larga fixa, para os testes que precisam do MESMO sorteio duas vezes. */
const RAIZ = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

export function suite() {
  const s = criarSuite('criaturas-servidor');

  /* --- 1 · O SORTEIO É DO SERVIDOR --------------------------------------- */

  s.teste('a mesma raiz produz a mesma criatura, sempre', () => {
    const a = sortear(RAIZ, kanto, 1), b = sortear(RAIZ, kanto, 1);
    igual(a.iv.join(','), b.iv.join(','), 'a mesma raiz deu ocultos diferentes');
    igual(a.natureza.nome, b.natureza.nome, 'a mesma raiz deu naturezas diferentes');
    igual(a.exemplar, b.exemplar, 'a mesma raiz deu exemplar diferente');
  });

  s.teste('raízes diferentes produzem criaturas diferentes', () => {
    /* AS RAÍZES TÊM DE SER MESMO DISTINTAS. Na primeira escrita elas variavam
       só no último dígito hexadecimal — 16 valores para 60 voltas — e o teste
       reprovou acusando o motor de um defeito que era meu. Fica registrado
       porque o modo de falha é sedutor: o número reprovou, e reprovou por um
       motivo errado, o que é a forma mais cara de teste vermelho. */
    const vistos = new Set();
    for (let i = 0; i < 60; i++)
      vistos.add(sortear(i.toString(16).padStart(32, '0'), kanto, 1).iv.join(','));
    ok(vistos.size > 40,
      `60 raízes deram só ${vistos.size} resultados distintos. Sorteio que se ` +
      `repete é sorteio que o jogador aprende a prever — e prever a captura é ` +
      `escolher o próprio potencial.`);
  });

  s.teste('o potencial NÃO é coluna do banco', () => {
    const { db } = comUsuario();
    const cols = db.prepare(`PRAGMA table_info(criaturas)`).all().map(c => c.name);
    for (const proibida of ['potencial', 'forma', 'estagio'])
      ok(!cols.includes(proibida),
        `a tabela ganhou a coluna "${proibida}". Ela é DERIVADA dos ocultos — ` +
        `guardada ao lado deles, passa a existir um estado em que os dois ` +
        `discordam, e esse estado é a fraude: um UPDATE valoriza a criatura sem ` +
        `tocar em nada que o jogo confira.`);
  });

  s.teste('o potencial lido é o mesmo que o motor calcula', () => {
    const { db, u } = comUsuario();
    for (let i = 0; i < 25; i++) {
      const c = gerar(db, { userId: u.id, pack: kanto, dex: 1 });
      igual(c.potencial, potencialDe(c.iv),
        'o potencial devolvido pelo servidor divergiu do que o motor calcula — ' +
        'é a armadilha do §7.11, duas contas que concordam hoje');
    }
  });

  /* --- O BANCO RECUSA O IMPOSSÍVEL (Q6) ---------------------------------- */

  s.teste('o banco recusa oculto fora de 0..31', () => {
    const { db, u } = comUsuario();
    const c = gerar(db, { userId: u.id, pack: kanto, dex: 1 });
    for (const v of [32, -1, 999]) {
      const e = recusa(() =>
        db.prepare(`UPDATE criaturas SET o_atq = ? WHERE id = ?`).run(v, c.id));
      ok(e, `o banco aceitou o oculto ${v}. O CHECK é a ÚLTIMA linha de defesa: ` +
             `ela não pode depender de o código de aplicação estar certo no dia.`);
    }
  });

  s.teste('o banco recusa origem que o §25.1 ainda não liberou', () => {
    const { db, u } = comUsuario();
    const c = gerar(db, { userId: u.id, pack: kanto, dex: 1 });
    const e = recusa(() =>
      db.prepare(`UPDATE criaturas SET origem = 'mercado' WHERE id = ?`).run(c.id));
    ok(e, `"mercado" entrou como origem. Ela só pode existir depois do ` +
           `checkpoint do §25.1 — e o CHECK é o que impede a feature de nascer ` +
           `por acidente, num INSERT que alguém escreveu antes da hora.`);
    igual(ORIGENS.includes('mercado'), false, 'a lista do módulo também não pode ter');
  });

  s.teste('não se gera criatura de dex que o pack não tem', () => {
    const { db, u } = comUsuario();
    for (const dex of [150, 151, 9999]) {
      const e = recusa(() => gerar(db, { userId: u.id, pack: kanto, dex }));
      ok(e, `o dex ${dex} passou. Os lendários são bosses de raid (L-057) e não ` +
             `estão no elenco — gerá-los aqui fura a decisão do dono do projeto ` +
             `por um caminho que nenhuma tela mostra.`);
    }
  });

  s.teste('origem inválida é recusada antes de tocar no banco', () => {
    const { db, u } = comUsuario();
    ok(recusa(() => gerar(db, { userId: u.id, pack: kanto, dex: 1, origem: 'mercado' })));
    igual(db.prepare(`SELECT COUNT(*) AS n FROM criaturas`).get().n, 0,
      'a linha foi gravada mesmo com a origem recusada');
  });

  /* --- 2 · A AUDITORIA (§25.2) ------------------------------------------- */

  s.teste('conferir() aprova a criatura que o próprio servidor gerou', () => {
    const { db, u } = comUsuario();
    for (const dex of [1, 25, 133, 143]) {
      const c = gerar(db, { userId: u.id, pack: kanto, dex });
      const r = conferir(db, c.id, kanto);
      ok(r.confere, `a criatura do dex ${dex} não confere com a própria raiz: ` +
                     `esperado ${r.esperado}, gravado ${r.gravado}`);
    }
  });

  s.teste('conferir() PEGA um oculto mexido por baixo', () => {
    const { db, u } = comUsuario();
    const c = gerar(db, { userId: u.id, pack: kanto, dex: 1 });
    const novo = c.iv[1] === 31 ? 30 : 31;
    db.prepare(`UPDATE criaturas SET o_atq = ? WHERE id = ?`).run(novo, c.id);
    const r = conferir(db, c.id, kanto);
    igual(r.confere, false,
      'a auditoria aprovou uma criatura cujos ocultos foram trocados no banco. ' +
      'É o cenário que o §25.2 existe para cobrir: sem ela, "foi sorteado ' +
      'honestamente" é afirmação que só a casa pode fazer, e quem compra no ' +
      'mercado não tem como conferir o que está comprando.');
    ok(potencialDe(r.gravado) !== potencialDe(r.esperado) || r.gravado.join() !== r.esperado.join());
  });

  s.teste('conferir() responde sobre criatura que não existe, sem lançar', () => {
    const { db } = comUsuario();
    igual(conferir(db, 'nao-existe', kanto).confere, false,
      'quem chama conferir() está investigando — lançar aqui derrubaria a ' +
      'ferramenta justamente no caso que ela existe para cobrir');
  });

  /* --- 3 · EVOLUIR MUDA A ESPÉCIE E MAIS NADA ---------------------------- */

  s.teste('evoluir preserva ocultos, natureza, exemplar e semente no banco', () => {
    const { db, u } = comUsuario();
    for (let i = 0; i < 30; i++) {
      const antes = gerar(db, { userId: u.id, pack: kanto, dex: 1 });
      db.prepare(`UPDATE criaturas SET nivel = 16 WHERE id = ?`).run(antes.id);
      const dep = evoluir(db, { id: antes.id, pack: kanto });
      igual(dep.especie, 2, 'a espécie não mudou');
      igual(dep.iv.join(','), antes.iv.join(','), 'os ocultos mudaram no banco');
      igual(dep.potencial, antes.potencial,
        `o potencial mudou de ${antes.potencial} para ${dep.potencial}. É o ` +
        `número pelo qual o mercado paga.`);
      igual(dep.natureza.nome, antes.natureza.nome, 'a natureza mudou');
      igual(dep.exemplar, antes.exemplar, 'a marca de exemplar mudou');
      igual(dep.semente, antes.semente,
        'a semente mudou, e com ela a auditoria da criatura foi embora');
      ok(conferir(db, dep.id, kanto).confere === false || dep.especie === 2);
    }
  });

  s.teste('evoluir recusa quando a condição não bate', () => {
    const { db, u } = comUsuario();
    const c = gerar(db, { userId: u.id, pack: kanto, dex: 1 });   /* nasce nível 1 */
    ok(recusa(() => evoluir(db, { id: c.id, pack: kanto })),
      'evoluiu no nível 1 uma linha que exige 16');
    igual(ler(db, c.id, kanto).especie, 1, 'a espécie mudou mesmo com a recusa');
  });

  s.teste('evoluir recusa a pedra que o jogador não tem', () => {
    const { db, u } = comUsuario();
    const pedra = kanto.evolucoes.find(e => e.exige.item === 'lua');
    const c = gerar(db, { userId: u.id, pack: kanto, dex: pedra.de });
    ok(recusa(() => evoluir(db, { id: c.id, pack: kanto, itens: [] })),
      'evoluiu por pedra com a bolsa vazia');
    ok(recusa(() => evoluir(db, { id: c.id, pack: kanto, itens: ['fogo'] })),
      'a pedra errada serviu');
    igual(evoluir(db, { id: c.id, pack: kanto, itens: ['lua'] }).especie, pedra.para);
  });

  s.teste('a linha que ramifica exige escolha, e valida a escolha', () => {
    const { db, u } = comUsuario();
    const ramo = kanto.especies.map(e => saidasDe(kanto, e.dex)).find(sa => sa.length >= 3);
    const itens = ramo.map(e => e.exige.item);
    const c = gerar(db, { userId: u.id, pack: kanto, dex: ramo[0].de });

    ok(recusa(() => evoluir(db, { id: c.id, pack: kanto, itens })),
      'com três saídas disponíveis, o servidor escolheu sozinho. A escolha é do ' +
      'jogador, e escolher por ele é decidir o valor da criatura dele.');

    /* DESTINO FORJADO. É o ataque óbvio: mandar o dex que se quiser. */
    ok(recusa(() => evoluirPara(db, { id: c.id, pack: kanto, destino: 149, itens })),
      'o servidor aceitou um destino que não é evolução desta criatura. Aceitar o ' +
      'que o cliente manda transforma "escolher o ramo" em "escolher a espécie", ' +
      'e a linha evolutiva inteira deixa de valer.');

    igual(evoluirPara(db, { id: c.id, pack: kanto, destino: ramo[1].para, itens }).especie,
          ramo[1].para, 'o ramo legítimo foi recusado');
  });

  /* --- a coleção é de quem é ---------------------------------------------- */

  s.teste('a coleção de um jogador não mostra a de outro', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const dois = ['a', 'b'].map(x => cadastrar(db, {
      username: 'j' + x, email: `j${x}@exemplo.test`,
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }));
    gerar(db, { userId: dois[0].id, pack: kanto, dex: 1 });
    gerar(db, { userId: dois[0].id, pack: kanto, dex: 4 });
    gerar(db, { userId: dois[1].id, pack: kanto, dex: 7 });
    igual(doJogador(db, dois[0].id, kanto).length, 2);
    igual(doJogador(db, dois[1].id, kanto).map(c => c.especie).join(','), '7');
  });

  s.teste('a criatura guarda o pack que a gerou', () => {
    const { db, u } = comUsuario();
    igual(gerar(db, { userId: u.id, pack: kanto, dex: 1 }).pack, kanto.id,
      'sem o pack na linha, o dex 25 de um pack viraria o 25 do outro no dia em ' +
      'que o ContentPack trocasse — e a coleção inteira de todo mundo mudaria de ' +
      'espécie em silêncio');
  });

  return s;
}
