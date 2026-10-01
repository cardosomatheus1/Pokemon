/* Q1 · O MARKET NA TELA, DECIDIDO FORA DELA (ST-14.13) — camada 0, em Node.
 *
 * A busca vira consulta; o cartão mostra o TOTAL e o por unidade do lote;
 * quem anuncia vê taxa e líquido antes; quem compra vê total e PC-T; o
 * histórico só mostra agregado com amostra; e a recusa vira frase.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { consultaDaBusca, cartaoDoAnuncio, previaDoAnuncio, previaDaCompra, serieDoAnuncio, linhasDoHistorico,
         textoDaRecusaDoMercado, novaChaveDeCompra, abasDoMercado } from '../app/modules/mercado-jogadores-dados.mjs';

const NOMES = { nomeDaEspecie: d => (d === 25 ? 'Pikachu' : `#${d}`), nomeDoItem: id => (id === 'poke' ? 'Poké Ball' : id) };

export async function suite() {
  const s = criarSuite('mercado-jogadores-dados');

  s.teste('a busca vira consulta: só o que foi preenchido, e o shiny em palavras', () => {
    igual(consultaDaBusca({ categoria: 'criaturas', dex: 25, shiny: false, nivelMin: '', ordem: 'preco' }), 'categoria=criaturas&dex=25&ordem=preco&shiny=nao&limite=24', 'a consulta');
    ok(/shiny=sim/.test(consultaDaBusca({ shiny: true })) && !/shiny/.test(consultaDaBusca({ shiny: null })), 'o shiny');
    ok(/cursor=abc/.test(consultaDaBusca({ cursor: 'abc' })), 'o cursor não vai junto');
    igual(abasDoMercado().map(a => a[0]).join(), 'criaturas,bolas,essencias,materiais,itens,meus,compras', 'as abas da spec §10.2');
    igual(`${abasDoMercado({ criaturas: 'Bichos' })[0][1]}|${abasDoMercado()[0][1]}`, 'Bichos|Criaturas', 'o nome das criaturas vem do pack');
  });

  s.teste('o cartão: o total sempre, o por unidade no lote, e o brilhante dito', () => {
    const c = cartaoDoAnuncio({ id: 'a', tipo: 'criatura', preco: 1000, quantidade: 1, vendedor: 'Misty', retrato: { dex: 25, shiny: true, nivel: 18, natureza: 'Timid', potencial: 77 } }, NOMES);
    igual(`${c.titulo}|${c.detalhe}|${c.preco}|${c.porUnidade}`, '✦ Pikachu|nv 18 · Timid · potencial 77|1000 PC-T|null', 'o cartão da criatura');
    const l = cartaoDoAnuncio({ id: 'b', tipo: 'item', itemId: 'poke', preco: 300, quantidade: 3, vendedor: 'Brock', retrato: { itemId: 'poke' } }, NOMES);
    igual(`${l.titulo}|${l.detalhe}|${l.preco}|${l.porUnidade}`, '3× Poké Ball|lote fechado — leva tudo|300 PC-T|100 cada', 'o cartão do lote');
  });

  s.teste('antes de anunciar: a taxa que sai agora, a da venda e o líquido — e o mínimo', () => {
    const p = previaDoAnuncio(1000);
    igual(p.linhas.map(l => l[1]).join(' | '), '1000 PC-T | 5 PC-T | 20 PC-T | 980 PC-T', 'a prévia do anúncio');
    ok(/não volta/.test(p.linhas[1][0]), 'a taxa de anúncio não diz que não volta');
    ok(!previaDoAnuncio(99).ok && !previaDoAnuncio(12.5).ok, 'a prévia aceitou preço inválido');
  });

  s.teste('antes de comprar: o total, o lote inteiro, e se o PC-T cobre', () => {
    const a = { id: 'b', tipo: 'item', itemId: 'poke', preco: 300, quantidade: 3, retrato: { itemId: 'poke' } };
    const p = previaDaCompra(a, 250, NOMES);
    igual(`${p.total}|${p.cobre}|${p.linhas[1][1]}`, '300|false|3 unidades (o lote inteiro)', 'a prévia da compra');
    ok(/insuficiente/.test(p.aviso), 'o aviso de PC-T insuficiente');
    ok(previaDaCompra(a, 300, NOMES).cobre, 'o PC-T exato não cobre');
  });

  s.teste('o histórico: a série do anúncio, e o agregado só com amostra', () => {
    igual(serieDoAnuncio({ tipo: 'criatura', retrato: { dex: 25, shiny: true, potencial: 77 } }), 'dex=25&shiny=sim&faixa=2', 'a série da criatura');
    igual(serieDoAnuncio({ tipo: 'item', itemId: 'est:fogo' }), 'item=est%3Afogo', 'a série do item');
    const sem = linhasDoHistorico({ suficiente: false, n7d: 3, ultimaVenda: { precoUnitario: 99.6 }, menorAnuncio: null });
    igual(sem.map(l => l[0]).join(), 'Última venda,Menor anúncio,Vendas em 7 dias', 'o agregado apareceu sem amostra');
    const com = linhasDoHistorico({ suficiente: true, n7d: 12, ultimaVenda: null, menorAnuncio: 80, mediana7d: 95.5, volume7d: { pct: 1200, unidades: 12 } });
    igual(com.slice(3).map(l => l[1]).join(' | '), '96 PC-T | 1200 PC-T · 12 un.', 'a mediana e o volume');
  });

  s.teste('a recusa em palavras; a chave da compra é da tentativa', () => {
    ok(/já foi vendido/.test(textoDaRecusaDoMercado({ corpo: { codigo: 'ANUNCIO_ESTADO', erro: 'este anúncio já foi vendido' } })), 'o vendido');
    ok(/mudou/.test(textoDaRecusaDoMercado({ corpo: { codigo: 'ANUNCIO_DESATUALIZADO' } })), 'o desatualizado');
    ok(/NÃO foi feita/.test(textoDaRecusaDoMercado({ indisponivel: true })), 'o timeout não diz que a compra não aconteceu');
    ok(/desligado/.test(textoDaRecusaDoMercado({ corpo: { reason_code: 'FEATURE_DISABLED' } })), 'o desligado');
    ok(/é seu/.test(textoDaRecusaDoMercado({ corpo: { reason_code: 'ACCOUNT_RESTRICTED', erro: 'a compra não pode: mesma_conta' } })), 'o próprio');
    const a = novaChaveDeCompra(() => 0.5), b = novaChaveDeCompra(() => 0.25);
    ok(a !== b && /^compra-/.test(a) && a.length >= 8 && a.length <= 80, 'a chave da compra');
  });

  return s;
}
