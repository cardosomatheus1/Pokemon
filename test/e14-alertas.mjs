/* Q1/Q3/Q6 · E14 · OS ALERTAS DO MERCADO (ST-14.14d · spec E14 §13 · L-227)
 *
 * O aceite: a venda muito fora da mediana da série vira suspeita do PAR, com
 * o número; a dentro da curva, não; sem amostra não há curva, e não há
 * alerta; a conta que gira demais para o tamanho vira suspeita dela; varrer
 * de novo não empilha; e a suspeita tira o par da referência de preço — o
 * alerta não envenena a própria curva.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { varrerSuspeitas, suspeitasAbertas } from '../server/antifraude.mjs';
import { historicoDaSerie, serieDoPedido } from '../server/mercado-jogadores-historico.mjs';
import { precoForaDaCurva, giroAnomalo, LIMIARES_ALERTA } from '../engine/alerta-mercado.mjs';
import { DIA_MS } from '../engine/historico-precos.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const H = 3600_000;

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const vend = Array.from({ length: 6 }, (_, i) => conta(`AVend${i}`)), comp = Array.from({ length: 6 }, (_, i) => conta(`AComp${i}`));
  let seq = 0;
  const vende = ({ dex = 25, item = null, shiny = false, potencial = 50, preco, qtd = 1, v = vend[0], c = comp[0], em = AGORA - H }) => {
    const id = `al-${++seq}`;
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, item_id, quantidade, preco, estado, shiny, snapshot_json,
                  politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em, potencial, categoria, comprador_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SOLD', ?, '{}', 'v', 'h', 1, 1, ?, ?, ?, ?, ?)`)
      .run(id, v, PACK.id, item ? 'item' : 'criatura', item ? null : `c-${id}`, item ? null : dex, item, qtd, preco, shiny ? 1 : 0,
           em - 1000, em + DIA_MS, item ? null : potencial, item ? 'bolas' : 'criaturas', c);
    db.prepare(`INSERT INTO player_market_fills (listing_id, pack_id, tipo, dex, item_id, shiny, quantidade, preco, taxa_venda, liquido, vendedor_id, comprador_id, em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?)`).run(id, PACK.id, item ? 'item' : 'criatura', item ? null : dex, item, shiny ? 1 : 0, qtd, preco, preco - 2, v, c, em);
    return db.prepare(`SELECT id FROM player_market_fills WHERE listing_id = ?`).get(id).id;
  };
  /* a curva: dez vendas de 100 a 190 entre cinco e cinco, nas 30 h ANTES da janela de teste */
  for (let i = 0; i < 10; i++) vende({ preco: 100 + i * 10, v: vend[i % 5], c: comp[i % 5], em: AGORA - (30 + i) * H });
  return { db, vend, comp, vende, conta };
}
const deSinal = (k, sinal) => suspeitasAbertas(k.db).filter(s => s.sinal === sinal);

export async function suite() {
  const s = criarSuite('e14-alertas');

  s.teste('a camada 0: três vezes acima ou abaixo da mediana; giro acima de duas operações por criatura', () => {
    igual(`${precoForaDaCurva({ unitario: 450, mediana: 150 })?.acima}|${precoForaDaCurva({ unitario: 50, mediana: 150 })?.acima}|${precoForaDaCurva({ unitario: 300, mediana: 150 })}|${precoForaDaCurva({ unitario: 900, mediana: null })}`,
          'true|false|null|null', 'o preço fora da curva');
    igual(`${giroAnomalo({ operacoes: 12, tamanho: 3 })?.razao}|${giroAnomalo({ operacoes: 9, tamanho: 0 })}|${giroAnomalo({ operacoes: 30, tamanho: 20 })}`,
          '4|null|null', 'o giro');
    igual(`${LIMIARES_ALERTA.fator}|${LIMIARES_ALERTA.giroMinimo}|${LIMIARES_ALERTA.giroPorTamanho}`, '3|10|2', 'o baseline do piloto');
  });

  s.teste('a venda cinco vezes acima da mediana vira suspeita do par, com o número; a da curva, não', () => {
    const k = cena();
    const alta = k.vende({ preco: 800, v: k.vend[5], c: k.comp[5], em: AGORA - 2 * H });
    k.vende({ preco: 160, v: k.vend[1], c: k.comp[2], em: AGORA - H });
    varrerSuspeitas(k.db, { agora: AGORA, dias: 1 });
    const p = deSinal(k, 'preco');
    igual(p.length, 1, `as suspeitas de preço: ${JSON.stringify(p)}`);
    const m = JSON.parse(p[0].medida_json);
    igual(`${[p[0].conta_a, p[0].conta_b].sort().join()}|${m.venda}|${m.unitario}|${m.mediana}|${Math.round(m.razao * 100) / 100}`,
          `${[k.vend[5], k.comp[5]].sort().join()}|${alta}|800|145|5.52`, 'a suspeita sem o número');
    varrerSuspeitas(k.db, { agora: AGORA + 1, dias: 1 });
    igual(deSinal(k, 'preco').length, 1, 'varrer de novo empilhou');
  });

  s.teste('sem amostra não há curva: a série rala não acusa ninguém', () => {
    const k = cena();
    k.vende({ dex: 7, preco: 100, em: AGORA - 40 * H });
    k.vende({ dex: 7, preco: 5000, v: k.vend[3], c: k.comp[3], em: AGORA - H });
    varrerSuspeitas(k.db, { agora: AGORA, dias: 1 });
    igual(deSinal(k, 'preco').length, 0, 'acusou sem curva');
  });

  s.teste('o par sob suspeita sai da referência: o alerta não envenena a própria curva', () => {
    const k = cena();
    k.vende({ preco: 9000, v: k.vend[5], c: k.comp[5], em: AGORA - 2 * H });
    const antes = historicoDaSerie(k.db, { pack: PACK, serie: serieDoPedido({ dex: '25', shiny: 'nao', faixa: '1' }), agora: AGORA });
    varrerSuspeitas(k.db, { agora: AGORA, dias: 1 });
    const depois = historicoDaSerie(k.db, { pack: PACK, serie: serieDoPedido({ dex: '25', shiny: 'nao', faixa: '1' }), agora: AGORA });
    igual(`${antes.n7d}|${depois.n7d}`, '11|10', 'a venda suspeita seguiu na referência');
  });

  s.teste('a conta que gira demais para o tamanho dela vira suspeita; o colecionador não', () => {
    const k = cena();
    const giro = k.conta('Girador'), colec = k.conta('Colecionador');
    gerar(k.db, { userId: giro, pack: PACK, dex: 16 });
    for (let i = 0; i < 25; i++) gerar(k.db, { userId: colec, pack: PACK, dex: 16 });
    for (let i = 0; i < 12; i++) k.vende({ dex: 19, preco: 100, v: giro, c: k.comp[i % 5], em: AGORA - (i + 1) * 60_000 });
    for (let i = 0; i < 12; i++) k.vende({ dex: 19, preco: 100, v: colec, c: k.comp[i % 5], em: AGORA - (i + 1) * 60_000 });
    varrerSuspeitas(k.db, { agora: AGORA, dias: 1 });
    const g = deSinal(k, 'giro');
    ok(g.some(x => x.conta_a === giro), `o girador não foi acusado: ${JSON.stringify(g)}`);
    ok(!g.some(x => x.conta_a === colec), 'o colecionador foi acusado');
    igual(JSON.parse(g.find(x => x.conta_a === giro).medida_json).operacoes, 12, 'o número do giro');
  });

  s.teste('a migração sobe e desce limpa', () => {
    const db = abrirBanco(':memory:');
    const i = MIGRACOES.findIndex(m => m.nome === 'alertas-mercado-st14.14d');
    ok(i > 0, 'a migração não existe');
    migrar(db, i + 1);
    db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, sinal, medida_json, criada_em) VALUES ('x', 'giro', '{}', 1)`).run();
    MIGRACOES[i].desce(db);
    igual(db.prepare(`SELECT COUNT(*) n FROM suspeitas_antifraude`).get().n, 0, 'o desce deixou o sinal novo');
    ok(!!(() => { try { db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, sinal, medida_json, criada_em) VALUES ('x', 'preco', '{}', 1)`).run(); } catch (e) { return e; } })(), 'o desce aceitou o sinal novo');
  });

  return s;
}
