/* Q1/Q3/Q6 · A POSSE DE COSMÉTICO NO SERVIDOR (E4 · INT-02, ST-4.1 a 4.4).
 *
 * Até aqui a posse morava no navegador (`pa.cosmeticos.v1`, `pa.outfit.v1`):
 * limpar o navegador levava o que o jogador comprou (L-055), e com conta real a
 * boutique debitava a carteira LOCAL e entregava de graça (D-108 — mitigado na
 * ST-1.3 fechando a compra com sessão).
 *
 * O que este arquivo trava, e são as quatro coisas que fazem posse ser posse:
 *
 *   a compra é UMA transação   débito, lançamento e posse — ou nenhum dos três
 *   o preço é do SERVIDOR      o cliente diz o que quer, nunca quanto custa
 *   repetir não cobra de novo  mesma chave ou peça já possuída = 1 lançamento
 *   equipar exige posse        o que é da loja e não foi comprado é recusado
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, ledgerDe } from '../server/carteira.mjs';
import { posseDe, comprar, equipar, equipadosDe, ERRO_COSMETICO } from '../server/cosmeticos.mjs';
import { catalogo, posseInicial } from '../app/modules/cosmeticos.mjs';

const AGORA = Date.UTC(2026, 8, 25, 12);

function conta(saldo = 1000) {
  const db = abrirBanco(':memory:'); migrar(db);
  const { id } = cadastrar(db, { username: 'j', email: 'j@x.test', senha: 'senha-longa-o-bastante-1',
                                 nascimento: '1990-01-01', agora: AGORA });
  if (saldo) creditar(db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                            valor: saldo, idem: 'welcome-' + id, agora: AGORA });
  return { db, id };
}
const total = (db, id) => Object.values(saldos(db, id)).reduce((a, b) => a + (b.disponivel ?? b), 0);
const compras = (db, id) => ledgerDe(db, id).filter(l => l.type === 'COSMETIC_PURCHASE');
const aVenda = familia => catalogo().find(p => p.familia === familia && p.procedencia === 'loja');
const padrao = familia => catalogo().find(p => p.familia === familia && p.procedencia === 'padrao');

export function suite() {
  const s = criarSuite('cosmeticos-servidor');

  s.teste('ST-4.1: conta nova possui exatamente o que é padrão — a MESMA base do cliente', () => {
    const { db, id } = conta();
    const posse = posseDe(db, id);
    igual([...posse].sort().join(','), [...posseInicial(), ...catalogo()
      .filter(p => p.familia === 'outfit' && p.procedencia === 'padrao').map(p => `outfit:${p.id}`)]
      .filter((v, i, a) => a.indexOf(v) === i).sort().join(','),
      'a base do servidor não é a do cliente — duas verdades sobre o que é de graça');
    ok(!posse.includes(`avatar:${aVenda('avatar').id}`), 'conta nova já possui peça da loja');
  });

  s.teste('ST-4.2: a compra debita o preço do CATÁLOGO, lança e entrega — numa transação', () => {
    const { db, id } = conta();
    const peca = aVenda('avatar');
    const r = comprar(db, { userId: id, familia: 'avatar', id: peca.id, chaveIdem: 'k1', agora: AGORA });
    ok(r.ok && !r.repetida, `a compra falhou: ${JSON.stringify(r)}`);
    igual(total(db, id), 1000 - peca.preco, 'o débito não é o preço do catálogo');
    const l = compras(db, id);
    igual(l.reduce((a, x) => a + x.amount, 0), -peca.preco, 'o lançamento não soma o preço');
    igual(l.filter(x => x.idem_key).length, 1, 'a compra não carrega UMA chave de idempotência');
    ok(posseDe(db, id).includes(`avatar:${peca.id}`), 'pagou e não recebeu a peça');
  });

  s.teste('ST-4.2: mesma chave, ou peça já possuída, é a mesma resposta e UM lançamento', () => {
    const { db, id } = conta();
    const peca = aVenda('cena');
    comprar(db, { userId: id, familia: 'cena', id: peca.id, chaveIdem: 'k1', agora: AGORA });
    const de_novo = comprar(db, { userId: id, familia: 'cena', id: peca.id, chaveIdem: 'k1', agora: AGORA });
    const outra_chave = comprar(db, { userId: id, familia: 'cena', id: peca.id, chaveIdem: 'k2', agora: AGORA });
    ok(de_novo.ok && de_novo.repetida, 'repetir a chave não foi reconhecido como repetição');
    ok(outra_chave.ok && outra_chave.repetida, 'comprar de novo o que já é seu não foi reconhecido');
    igual(compras(db, id).length, 1, 'repetir cobrou de novo');
    igual(total(db, id), 1000 - peca.preco, 'o saldo mudou na repetição');
  });

  s.teste('ST-4.2: sem saldo, nada acontece — nem débito, nem lançamento, nem posse', () => {
    const { db, id } = conta(100);
    const peca = aVenda('arena');
    const r = comprar(db, { userId: id, familia: 'arena', id: peca.id, chaveIdem: 'k', agora: AGORA });
    igual(r.ok, false, 'comprou sem saldo');
    igual(r.codigo, ERRO_COSMETICO.SALDO, 'a recusa não diz que foi saldo');
    igual(total(db, id), 100, 'o saldo mudou numa compra recusada');
    igual(compras(db, id).length, 0, 'ficou lançamento de uma compra recusada');
    ok(!posseDe(db, id).includes(`arena:${peca.id}`), 'recebeu a peça sem pagar');
  });

  s.teste('ST-4.2: falha forçada ao gravar a posse deixa saldo e ledger intactos', () => {
    const { db, id } = conta();
    db.exec(`CREATE TRIGGER quebra BEFORE INSERT ON cosmetic_ownership
             BEGIN SELECT RAISE(ABORT, 'falha forçada'); END`);
    const peca = aVenda('moldura');
    let r;
    try { r = comprar(db, { userId: id, familia: 'moldura', id: peca.id, chaveIdem: 'k', agora: AGORA }); }
    catch (e) { r = { ok: false, erro: e.message }; }
    igual(r.ok, false, 'a compra "deu certo" sem gravar a posse');
    igual(total(db, id), 1000, 'o dinheiro saiu e a peça não entrou — meia transação');
    igual(compras(db, id).length, 0, 'ficou lançamento de uma compra que não aconteceu');
  });

  s.teste('ST-4.2: o que não é da loja não se compra — padrão, npc, desconhecido', () => {
    const { db, id } = conta();
    const p = padrao('moldura');
    igual(comprar(db, { userId: id, familia: 'moldura', id: p.id, chaveIdem: 'a', agora: AGORA }).codigo,
      ERRO_COSMETICO.NAO_A_VENDA, 'uma peça padrão foi vendida');
    igual(comprar(db, { userId: id, familia: 'avatar', id: 'nao-existe', chaveIdem: 'b', agora: AGORA }).codigo,
      ERRO_COSMETICO.DESCONHECIDA, 'uma peça inventada foi vendida');
    igual(comprar(db, { userId: id, familia: 'avatar', id: aVenda('avatar').id, chaveIdem: '', agora: AGORA }).codigo,
      ERRO_COSMETICO.CHAVE, 'compra sem chave de idempotência foi aceita — repetir a cobraria duas vezes');
    igual(compras(db, id).length, 0, 'uma recusa deixou lançamento');
  });

  s.teste('ST-4.3: equipar exige posse, e a recusa não mexe no que está equipado', () => {
    const { db, id } = conta();
    const livre = padrao('cena'), loja = aVenda('cena');
    ok(equipar(db, { userId: id, familia: 'cena', id: livre.id }).ok, 'não deixou equipar o padrão');
    const r = equipar(db, { userId: id, familia: 'cena', id: loja.id });
    igual(r.ok, false, 'equipou peça da loja sem ter comprado');
    igual(r.codigo, ERRO_COSMETICO.NAO_POSSUI, 'a recusa não diz que falta posse');
    igual(equipadosDe(db, id).cena, livre.id, 'a recusa trocou o que estava equipado');
    comprar(db, { userId: id, familia: 'cena', id: loja.id, chaveIdem: 'k', agora: AGORA });
    ok(equipar(db, { userId: id, familia: 'cena', id: loja.id }).ok, 'comprou e não conseguiu equipar');
    igual(equipadosDe(db, id).cena, loja.id, 'equipar não gravou');
    ok(equipar(db, { userId: id, familia: 'cena', id: null }).ok, 'não deixou limpar o slot');
    igual(equipadosDe(db, id).cena, undefined, 'limpar o slot não limpou');
  });

  /* ST-4.4 · UMA LISTA SÓ (L-157): o traje entra na mesma tabela. Nenhum dos
     nove trajes está à venda hoje (DEC-06), então o catálogo de teste declara
     um — o caminho é o mesmo do dia em que o primeiro for. */
  s.teste('ST-4.4: o traje da loja passa pela MESMA tabela, e o de NPC nunca', () => {
    const { db, id } = conta(2000);
    const cat = [...catalogo(),
      { familia: 'outfit', id: 'traje-teste', nome: 'Traje de teste', procedencia: 'loja', preco: 1250 },
      { familia: 'outfit', id: 'npc-teste', nome: 'NPC', procedencia: 'npc', preco: 1250 }];
    const r = comprar(db, { userId: id, familia: 'outfit', id: 'traje-teste', chaveIdem: 'o', agora: AGORA, catalogo: cat });
    ok(r.ok, `o traje da loja não foi vendido: ${JSON.stringify(r)}`);
    ok(posseDe(db, id, cat).includes('outfit:traje-teste'), 'o traje comprado não está na posse');
    ok(equipar(db, { userId: id, familia: 'outfit', id: 'traje-teste', catalogo: cat }).ok, 'não vestiu o traje comprado');
    igual(equipar(db, { userId: id, familia: 'outfit', id: 'npc-teste', catalogo: cat }).ok, false,
      'vestiu a roupa de um NPC — ela nunca é do jogador');
  });

  return s;
}
