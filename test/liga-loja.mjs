/* Q1/Q3/Q6 · A LOJA DA LIGA (ST-11.7c · Spec §9.11, §10.12)
 *
 *   O CATÁLOGO   as duas bolas acima da comum, pela força; a garantida nunca;
 *                e o doce de uma linha que a conta TEM
 *   A COMPRA     uma transação: débito dos pontos e crédito do item, ou nada;
 *                a mesma chave devolve a mesma resposta e não cobra de novo
 *   O LIMITE     por temporada — volta quando a próxima abre
 *   O PREÇO      é o do servidor: o que o cliente mandar é ignorado
 *   NUNCA VIRA   PokéCash: a carteira não se mexe, e o arquivo não a importa
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { quantosNaBolsa } from '../server/idle.mjs';
import { docesDe } from '../server/doce.mjs';
import { saldoDePontos } from '../server/pontos-liga.mjs';
import { lojaDaConta, comprarNaLoja, ERRO_LOJA_LIGA } from '../server/loja-liga.mjs';
import { catalogoDaLoja, podeComprar, DOCE_DA_LIGA } from '../engine/loja-liga.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { lojaNaTela } from '../app/modules/liga-equipe-dados.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const H = 3_600_000, T0 = Date.UTC(2026, 9, 1, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function cena(pontos = 500) {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'loja0', email: 'loja0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  gerar(db, { userId: u, pack: PACK, dex: 2, origem: 'captura' });
  if (pontos) db.prepare(`INSERT INTO liga_pontos (user_id, temporada, dia, tipo, delta, ref, idem, criado_em) VALUES (?, 1, 0, 'premio', ?, 't', 'semente', ?)`).run(u, pontos, T0);
  return { db, u, linha: chaveDoDoce(PACK, 2) };
}
const compra = (c, item, k, extra = {}) => comprarNaLoja(c.db, { userId: c.u, item, chaveIdem: `chave-${String(k).padStart(6, '0')}`, agora: T0, ...extra });

export async function suite() {
  const s = criarSuite('liga-loja');

  s.teste('o catálogo: as duas bolas acima da comum, pela força, e nunca a garantida', () => {
    igual(catalogoDaLoja(PACK).map(i => `${i.id}:${i.preco}:${i.quantidade}:${i.limite}`).join(), 'bola:great:40:3:5,bola:ultra:90:2:3,doce:60:3:5', 'o catálogo do pack');
    const outro = { bolas: [{ id: 'z', mult: 3 }, { id: 'garantida', mult: 999 }, { id: 'a', mult: 1 }, { id: 'm', mult: 2 }] };
    igual(catalogoDaLoja(outro).filter(i => i.tipo === 'bola').map(i => i.alvo).join(), 'm,z', 'a ordem pela força, sem a comum e sem a garantida');
    /* A garantida logo acima da segunda: sem o filtro, ela entraria na prateleira. */
    igual(catalogoDaLoja({ bolas: [{ id: 'a', mult: 1 }, { id: 'm', mult: 2 }, { id: 'garantida', mult: 999 }] }).filter(i => i.tipo === 'bola').map(i => i.alvo).join(), 'm', 'a garantida entrou na loja');
    igual(catalogoDaLoja({}).map(i => i.id).join(), 'doce', 'pack sem bola');
    const great = catalogoDaLoja(PACK)[0];
    igual([podeComprar(great, { saldo: 40, comprados: 4 }).ok, podeComprar(great, { saldo: 39, comprados: 0 }).motivo, podeComprar(great, { saldo: 99, comprados: 5 }).motivo, podeComprar(null, {}).ok].join('|'),
      'true|faltam 1 LP|limite desta temporada atingido (5)|false', 'as recusas');
  });

  s.teste('a compra: débito e crédito juntos, e a mesma chave não cobra de novo', () => {
    const c = cena();
    const r = compra(c, 'bola:great', 1);
    igual(`${r.ok}|${r.repetida}|${r.saldo}|${quantosNaBolsa(c.db, c.u, 'great')}`, 'true|false|460|3', 'a primeira compra');
    const de = compra(c, 'bola:great', 1);
    igual(`${de.repetida}|${de.saldo}|${quantosNaBolsa(c.db, c.u, 'great')}`, 'true|460|3', 'a mesma chave comprou de novo');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM telemetry_events WHERE nome = 'liga_loja_compra'`).get().n, 1, 'o evento da compra');
    const l = c.db.prepare(`SELECT tipo, delta, ref FROM liga_pontos WHERE tipo = 'compra'`).all();
    igual(JSON.stringify(l), '[{"tipo":"compra","delta":-40,"ref":"loja:bola:great"}]', 'o lançamento da compra');
  });

  s.teste('o limite por temporada, e ele volta na temporada seguinte', () => {
    const c = cena(2000);
    for (let k = 1; k <= 3; k++) compra(c, 'bola:ultra', k);
    const e = recusa(() => compra(c, 'bola:ultra', 4));
    igual(`${e?.codigo}|${e?.message}`, `${ERRO_LOJA_LIGA.RECUSADA}|limite desta temporada atingido (3)`, 'o quarto passou do limite');
    igual(quantosNaBolsa(c.db, c.u, 'ultra'), 6, 'a recusa creditou');
    const t2 = temporadaDe(T0).fim + H;
    igual(comprarNaLoja(c.db, { userId: c.u, item: 'bola:ultra', chaveIdem: 'chave-proxima', agora: t2 }).ok, true, 'o limite não voltou na temporada seguinte');
  });

  s.teste('sem saldo, nada acontece — nem o débito, nem o item', () => {
    const c = cena(30);
    const e = recusa(() => compra(c, 'bola:great', 1));
    igual(`${e?.codigo}|${e?.message}`, `${ERRO_LOJA_LIGA.RECUSADA}|faltam 10 LP`, 'a recusa');
    igual(`${saldoDePontos(c.db, c.u)}|${quantosNaBolsa(c.db, c.u, 'great')}`, '30|0', 'a recusa mexeu em algo');
    igual(recusa(() => compra(c, 'nada', 2))?.codigo, ERRO_LOJA_LIGA.ITEM, 'o item que não existe');
    igual(recusa(() => comprarNaLoja(c.db, { userId: c.u, item: 'bola:great', chaveIdem: 'x', agora: T0 }))?.codigo, ERRO_LOJA_LIGA.CHAVE, 'a chave curta');
  });

  s.teste('o doce: só de uma linha que a conta tem, no livro do doce com motivo próprio', () => {
    const c = cena();
    igual(recusa(() => compra(c, 'doce', 1, { linha: 150 }))?.codigo, ERRO_LOJA_LIGA.LINHA, 'o doce de uma linha que a conta não tem');
    const r = compra(c, 'doce', 2, { linha: c.linha });
    igual(`${r.ok}|${docesDe(c.db, c.u)[c.linha]}|${r.saldo}`, `true|${DOCE_DA_LIGA.quantidade}|440`, 'o doce comprado');
    igual(c.db.prepare(`SELECT motivo, delta FROM candy_ledger WHERE user_id = ?`).get(c.u).motivo, 'liga', 'o motivo do doce');
    igual(JSON.stringify(lojaDaConta(c.db, { userId: c.u, agora: T0 }).linhas), `[{"linha":${c.linha},"nome":"${PACK.especies.find(e => e.dex === c.linha).n}"}]`, 'as linhas que a conta tem');
  });

  s.teste('nunca vira PokéCash, e o preço é o do servidor', () => {
    const c = cena();
    const antes = c.db.prepare(`SELECT COUNT(*) AS n FROM wallet_ledger`).get().n;
    compra(c, 'bola:great', 1, { preco: 1 });
    igual(saldoDePontos(c.db, c.u), 460, 'o preço do cliente valeu');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM wallet_ledger`).get().n, antes, 'a loja lançou na carteira');
    const src = semComentario(fonte('../server/loja-liga.mjs'));
    ok(!/carteira|wallet_ledger/.test(src), 'a loja toca a carteira');
    ok(/exigirBandeira\(db, 'league_enabled'\)/.test(src), 'a loja não obedece a bandeira da Liga');
    ok(!/`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{/.test(src), 'SQL montado com interpolação');
  });

  s.teste('a migração do doce sobe e desce, com o que já estava no livro', () => {
    /* A cópia da tabela leva TODO motivo que já existia: a lista de antes está contida na de depois. */
    const motivos = db => (db.prepare(`SELECT sql FROM sqlite_master WHERE name = 'candy_ledger'`).get().sql.match(/motivo IN \(([^)]*)\)/)?.[1] ?? '').split(',').map(x => x.trim());
    const idx = MIGRACOES.findIndex(x => x.nome === 'loja-liga-st11.7c');
    const antes = abrirBanco(':memory:'); migrar(antes, idx);
    const depois = abrirBanco(':memory:'); migrar(depois, idx + 1);
    const falta = motivos(antes).filter(m => !motivos(depois).includes(m));
    igual(falta.join(), '', 'a cópia da tabela do doce perdeu motivos');
    ok(motivos(depois).includes("'liga'"), 'o motivo da loja');
    const c = cena();
    compra(c, 'doce', 1, { linha: c.linha });
    const m = MIGRACOES.find(x => x.nome === 'loja-liga-st11.7c');
    m.desce(c.db);
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM candy_ledger WHERE motivo = 'liga'`).get().n, 0, 'a descida deixou o motivo novo');
    ok(recusa(() => c.db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, 1, 1, 'liga', 'k', 1)`).run(c.u)), 'a descida aceita o motivo novo');
    m.sobe(c.db);
    ok(!recusa(() => c.db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, 1, 1, 'liga', 'k2', 1)`).run(c.u)), 'a subida não aceita o motivo novo');
  });

  s.teste('na tela: o que se leva, o preço, o limite, e o porquê de não dar', () => {
    const c = cena(50);
    compra(c, 'bola:great', 1);
    const k = lojaNaTela(lojaDaConta(c.db, { userId: c.u, agora: T0 }));
    igual(k.itens.map(i => `${i.nome}|${i.preco}|${i.limite}|${i.habilitado}|${i.motivo}`).join(' / '),
      `3× Great Ball|40 LP|1 de 5 compras nesta temporada|false|faltam 30 LP / 2× Ultra Ball|90 LP|0 de 3 compras nesta temporada|false|faltam 80 LP / 3 doces de ${PACK.especies.find(e => e.dex === c.linha).n}|60 LP|0 de 5 compras nesta temporada|false|faltam 50 LP`, 'os itens');
    igual(k.itens.map(i => `${i.botao}|${i.efeito}|${i.feito}`).join(' / '),
      'Comprar · 40 LP|1,5× a chance de captura da bola comum|Comprado! As bolas já estão na sua Bolsa, na aba Rotas. / Comprar · 90 LP|2,2× a chance de captura da bola comum|Comprado! As bolas já estão na sua Bolsa, na aba Rotas. / Comprar · 60 LP|dar doce sobe o nível das criaturas desta linha|Comprado! Os doces já estão na Minha Coleção.', 'o botão, o efeito e onde o item vai');
    igual(`${k.saldo}|${k.nota}`, '10 LP|Cada item tem limite por temporada — ele volta quando a temporada 2 abrir.', 'o topo');
    const semLinha = lojaNaTela({ temporada: 1, saldo: 999, linhas: [], itens: [{ id: 'doce', tipo: 'doce', nome: 'Doce', preco: 60, quantidade: 3, limite: 5, comprados: 5, pode: false, motivo: 'x' }] });
    igual(`${semLinha.itens[0].nome}|${semLinha.itens[0].motivo}|${semLinha.itens[0].esgotado}`, '3 doces|você precisa ter uma criatura na conta|true', 'o doce sem linha');
    igual(lojaNaTela(null), null, 'sem resposta, loja');
    ok(/api\/equipe\/loja\/comprar/.test(fonte('../app/modules/liga-equipe-tela.mjs')), 'a tela não compra');
  });

  s.teste('pela porta: ler a loja, comprar, repetir, e as recusas com o código certo', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'LojaPorta', email: 'lojaporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H2 = { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', authorization: `Bearer ${cad.sessao}` };
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'LojaPorta'`).get().id;
      srv.db.prepare(`INSERT INTO liga_pontos (user_id, temporada, dia, tipo, delta, ref, idem, criado_em) VALUES (?, 1, 0, 'premio', 100, 't', 'semente', ?)`).run(uid, T0);
      const post = corpo => fetch(url('/api/equipe/loja/comprar'), { method: 'POST', headers: H2, body: JSON.stringify(corpo) });
      igual((await fetch(url('/api/equipe/loja'), { headers: { [CABECALHO_VERSAO]: API_VERSAO } })).status, 401, 'a loja sem sessão');
      igual((await fetch(url('/api/equipe/loja'), { headers: H2 }).then(r => r.json())).itens.length, 3, 'a leitura');
      igual((await post({ item: 'bola:great' })).status, 400, 'sem chave');
      igual((await post({ item: 7, chaveIdem: 'porta-000001' })).status, 400, 'item que não é texto');
      igual((await post({ item: 'nada', chaveIdem: 'porta-000001' })).status, 404, 'item que não existe');
      const r = await post({ item: 'bola:great', chaveIdem: 'porta-000002' });
      igual(`${r.status}|${(await r.json()).saldo}`, '200|60', 'a compra pela porta');
      igual((await (await post({ item: 'bola:great', chaveIdem: 'porta-000002' })).json()).repetida, true, 'o repetido pela porta');
      igual((await post({ item: 'bola:ultra', chaveIdem: 'porta-000003' })).status, 409, 'sem saldo');
    } finally { await srv.fechar(); }
  });

  return s;
}
