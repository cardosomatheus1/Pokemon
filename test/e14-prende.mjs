/* Q1/Q3 · E14 · "ISTO PRENDE" ANTES DE GASTAR: A PEDRA E O DOCE (ST-14.3d · L-224)
 *
 * O servidor grava a consequência e a diz DEPOIS (`prendeu`); a tela tem de
 * dizer ANTES. O aviso é da camada 0 e usa a MESMA regra do servidor — por
 * isso o teste que manda aqui é o que confronta os dois: onde a tela avisa,
 * o servidor prende; onde ela cala, ele não prende.
 *
 *   a PEDRA   o lote mais antigo dela é de classe presa
 *   o DOCE    os livres não cobrem o doce que se dá
 *   NADA      a criatura que já não negocia, e o aparelho sem conta
 *   A TELA    o selo de evoluir e o botão de dar doce dizem "prende" e
 *             pedem o segundo clique
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { evoluirNaConta, darDoceNaConta } from '../server/colecao.mjs';
import { colecaoDe } from '../server/colecao-rotas.mjs';
import { docesDe, docesPresosDe } from '../server/doce.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { avisoDaPedra, avisoDoDoce, textoDoArmeDaEvolucao, TEXTO_DO_ARME_DO_DOCE } from '../app/modules/prende-dados.mjs';
import { idleDaConta } from '../app/modules/idle-conta.mjs';
import { carregar, salvar } from '../app/modules/idle-dados.mjs';

const AGORA = Date.UTC(2026, 9, 1, 12);
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const uid = cadastrar(db, { username: 'Prende1', email: 'prende1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid };
}
const classe = (k, id) => k.db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ?`).get(id).proveniencia;
/* O que a tela tem na mão: a criatura e os lotes como o servidor os manda. */
const vista = (k, id) => { const c = colecaoDe(k.db, { userId: k.uid, agora: AGORA }); return { c: c.criaturas.find(x => x.id === id), bolsa: c.bolsa, lotes: c.lotes }; };
const pikachu = (k, proveniencia = 'verified_earned') => {
  const c = gerar(k.db, { userId: k.uid, pack: PACK, dex: 25, origem: 'captura', proveniencia });
  k.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(20), c.id);
  return c.id;
};

export async function suite() {
  const s = criarSuite('e14-prende');

  s.teste('motor: a pedra avisa pelo lote mais antigo, e só quando a criatura tem o que perder', () => {
    const c = { id: 'p', dex: 25, nivel: 20, xp: xpParaNivel(20), proveniencia: 'verified_earned' }, bolsa = { trovao: 2 };
    const preso = { trovao: [{ classe: 'promotional_bound', quantidade: 1 }, { classe: 'verified_earned', quantidade: 1 }] };
    const livre = { trovao: [{ classe: 'verified_earned', quantidade: 1 }, { classe: 'promotional_bound', quantidade: 1 }] };
    igual(avisoDaPedra(PACK, c, bolsa, preso)?.insumo, 'trovao', 'o lote preso na frente não avisou');
    igual(avisoDaPedra(PACK, c, bolsa, livre), null, 'o lote livre na frente avisou');
    /* O lote vazio na frente não conta: o débito pula para o próximo. */
    igual(avisoDaPedra(PACK, c, bolsa, { trovao: [{ classe: 'verified_earned', quantidade: 0 }, { classe: 'legacy_unverified', quantidade: 2 }] })?.classe, 'legacy_unverified', 'o lote vazio decidiu');
    igual(avisoDaPedra(PACK, { ...c, proveniencia: 'promotional_bound' }, bolsa, preso), null, 'a criatura já presa ganhou aviso');
    igual(avisoDaPedra(PACK, { ...c, proveniencia: undefined }, bolsa, preso), null, 'o aparelho sem conta ganhou aviso');
    igual(avisoDaPedra(PACK, { ...c, dex: 16 }, bolsa, preso), null, 'a evolução sem pedra avisou');
    igual(avisoDaPedra(PACK, c, {}, preso), null, 'sem a pedra na bolsa, avisou');
  });

  s.teste('motor: o doce avisa só quando os livres não cobrem', () => {
    const c = { proveniencia: 'p2p_verified' };
    igual(avisoDoDoce(c, { quantidade: 3, presos: 2 }), null, 'havia um livre e avisou');
    igual(avisoDoDoce(c, { quantidade: 2, presos: 2 })?.insumo, 'doce', 'todos presos e não avisou');
    igual(avisoDoDoce(c, { quantidade: 0, presos: 0 }), null, 'sem doce avisou');
    igual(avisoDoDoce({ proveniencia: 'admin_review' }, { quantidade: 2, presos: 2 }), null, 'a criatura já presa ganhou aviso');
    igual(avisoDoDoce({}, { quantidade: 2, presos: 2 }), null, 'o aparelho sem conta ganhou aviso');
    igual(`${textoDoArmeDaEvolucao([], null)}|${textoDoArmeDaEvolucao([], { curto: 'prende' })}|${textoDoArmeDaEvolucao([{ n: 'Surf' }], { curto: 'prende' })}`,
          'null|prende a criatura · evoluir?|perde Surf · prende a criatura · evoluir?', 'o texto do primeiro clique');
  });

  s.teste('a pedra: onde a tela avisa, o servidor prende; onde ela cala, não prende', () => {
    const k = cena();
    const a = pikachu(k), b = pikachu(k);
    creditarBolsa(k.db, k.uid, 'trovao', 1, { classe: 'promotional_bound', fonte: 'bonus', agora: AGORA });
    creditarBolsa(k.db, k.uid, 'trovao', 1, { classe: 'verified_earned', fonte: 'loja', agora: AGORA + 1 });
    const va = vista(k, a);
    ok(avisoDaPedra(PACK, va.c, va.bolsa, va.lotes), 'a primeira pedra é presa e a tela não avisou');
    evoluirNaConta(k.db, { userId: k.uid, pack: PACK, id: a });
    igual(classe(k, a), 'promotional_bound', 'o servidor não prendeu o que a tela avisou');
    const vb = vista(k, b);
    igual(avisoDaPedra(PACK, vb.c, vb.bolsa, vb.lotes), null, 'a pedra que sobrou é livre e a tela avisou');
    evoluirNaConta(k.db, { userId: k.uid, pack: PACK, id: b });
    igual(classe(k, b), 'verified_earned', 'o servidor prendeu o que a tela não avisou');
  });

  s.teste('o doce: a rota diz os presos, e a tela e o servidor concordam', () => {
    const k = cena();
    const a = pikachu(k), linha = chaveDoDoce(PACK, 25);
    k.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade, presos) VALUES (?, ?, 2, 1)`).run(k.uid, linha);
    igual(`${docesDe(k.db, k.uid)[linha]}|${docesPresosDe(k.db, k.uid)[linha]}`, '2|1', 'a rota não diz os presos');
    /* O aparelho guarda os presos que a rota manda. */
    const E = idleDaConta({}, { agora: AGORA, criaturas: [] }, { doces: docesDe(k.db, k.uid), docesPresos: docesPresosDe(k.db, k.uid) });
    igual(E.docesPresos[linha], 1, 'o aparelho perdeu os presos');
    const saldo = () => ({ quantidade: docesDe(k.db, k.uid)[linha] ?? 0, presos: docesPresosDe(k.db, k.uid)[linha] ?? 0 });
    const c = () => vista(k, a).c;
    /* 2 com 1 preso: o primeiro doce é livre. */
    igual(avisoDoDoce(c(), saldo()), null, 'o doce livre avisou');
    igual(darDoceNaConta(k.db, { userId: k.uid, pack: PACK, id: a, chaveIdem: 'prende-doce-1', agora: AGORA }).prendeu, false, 'o servidor prendeu o livre');
    /* Sobrou 1, preso: agora avisa — e o servidor prende. */
    ok(avisoDoDoce(c(), saldo()), 'o doce preso não avisou');
    igual(darDoceNaConta(k.db, { userId: k.uid, pack: PACK, id: a, chaveIdem: 'prende-doce-2', agora: AGORA }).prendeu, true, 'o servidor não prendeu o avisado');
    igual(classe(k, a), 'promotional_bound', 'a criatura não ficou presa');
  });

  s.teste('D-139: o save da conta guarda os lotes e os presos — o carregar os jogava fora', () => {
    const mem = new Map(), deposito = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
    const E = idleDaConta(carregar(deposito), { agora: AGORA, criaturas: [], lotes: { trovao: [{ classe: 'promotional_bound', quantidade: 1 }] } },
                          { doces: { 25: 2 }, docesPresos: { 25: 2 } });
    salvar(E, deposito);
    const lido = carregar(deposito);
    igual(JSON.stringify(lido.lotes), '{"trovao":[{"classe":"promotional_bound","quantidade":1}]}', 'o carregar perdeu os lotes — o aviso nunca chega à tela');
    igual(JSON.stringify(lido.docesPresos), '{"25":2}', 'o carregar perdeu os doces presos');
    /* O que volta do disco é só aviso, mas volta LIMPO. */
    mem.set('ar_idle', JSON.stringify({ ...JSON.parse(mem.get('ar_idle')), lotes: { trovao: 'x', lua: [{ classe: 1 }, { classe: 'verified_earned', quantidade: -1 }, { classe: 'test_only', quantidade: 2 }] }, docesPresos: { 25: 'muitos', 4: 3 } }));
    const sujo = carregar(deposito);
    igual(`${JSON.stringify(sujo.lotes)}|${JSON.stringify(sujo.docesPresos)}`, '{"lua":[{"classe":"test_only","quantidade":2}]}|{"4":3}', 'o lixo do disco passou');
  });

  s.teste('a tela: o selo e o botão dizem "prende" e pedem o segundo clique', () => {
    const equipe = fonte('../app/modules/idle-equipe.mjs'), excl = fonte('../app/modules/exclusivos-tela.mjs');
    const paineis = fonte('../app/modules/idle-paineis.mjs'), doce = fonte('../app/modules/doce-tela.mjs'), srv = fonte('../app/modules/idle-servidor.mjs');
    ok(/seloDaEvolucao\(c, E\.bolsa, nomesDe\(PACK\), E\.lotes\)/.test(equipe), 'o selo não recebe os lotes');
    ok(/prende = avisoDaPedra\(PACK, c, bolsa, lotes\)/.test(equipe) && /\$\{prende \? ' prende' : ''\}<\/span>/.test(equipe), 'o selo não diz "prende"');
    ok(/textoDoArmeDaEvolucao\(perdidosAoEvoluir\(PACK, c\), avisoDaPedra\(PACK, c, E\.bolsa, E\.lotes\)\)/.test(excl), 'evoluir com a pedra presa não arma');
    ok(/avisoDoDoce\(c, \{ quantidade: doces, presos: \(E\.docesPresos \?\? \{\}\)\[chaveDoDoce\(PACK, c\.dex\)\] \?\? 0 \}\)/.test(paineis), 'o botão de doce não lê os presos');
    ok(/\$\{prende \? ' data-prende="1"' : ''\}/.test(paineis) && /\$\{prende \? ' · ⚠ prende' : ''\}/.test(paineis), 'o botão de doce não diz "prende"');
    ok(/d\.dataset\.prende === '1' && d\.dataset\.armado !== '1'/.test(doce) && /TEXTO_DO_ARME_DO_DOCE/.test(doce), 'o doce que prende sai no primeiro clique');
    ok(/docesPresos: d\.ok \? d\.corpo\?\.presos \?\? null : null/.test(srv), 'a leitura da conta não guarda os presos');
    igual(TEXTO_DO_ARME_DO_DOCE, 'prende a criatura · dar mesmo assim?', 'o texto do doce armado');
  });

  return s;
}
