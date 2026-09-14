/* A VITRINE — bloco 1.31, o catálogo do que se compra.
 *
 * Pedido do dono, e o escopo veio fechado na frase dele:
 *
 *   > "FILTRE tudo que temos hoje de cosmético e você vai adicionar a essa loja"
 *
 * ── O QUE ESTA SUÍTE GUARDA, E POR QUE CADA COISA ────────────────────────
 *
 * A loja é a primeira porta de RECEITA do projeto, e o dono depende de lucro.
 * Isso não muda o método — muda o custo do erro. As três coisas que não podem
 * dar errado aqui:
 *
 *     COBRAR DUAS VEZES     comprar de novo o que já é dele
 *     VENDER O QUE NÃO É    peça de missão aparecendo à venda por descuido
 *     PROMETER E NÃO DAR    saldo suficiente na tela e recusa no clique
 *
 * A terceira já tem forma neste projeto: é o D-067 na porta do dinheiro.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  PROCEDENCIAS, PRECO_BASE, PESO_DA_FAMILIA, precoDe, procedenciaValida,
  catalogoDaVitrine, aVendaNaVitrine, custoDaVitrine, chaveDa, temNaConta,
  podeComprar,
} from '../engine/vitrine.mjs';
import { SALDO_INICIAL } from '../engine/carteira.mjs';

/* Cinco famílias de mentira, com as cinco procedências representadas: o
   catálogo tem de sobreviver a todas, e não só à feliz. */
const FAMILIAS = () => ({
  avatar: [{ id: 'a1', nm: 'Um', procedencia: 'loja' },
           { id: 'a2', nm: 'Dois', procedencia: 'padrao' }],
  cena:   [{ id: 'c1', nm: 'Cena', procedencia: 'loja' },
           { id: 'c2', nm: 'Prêmio', procedencia: 'missao' }],
  outfit: [{ id: 'o1', nm: 'Traje', procedencia: 'loja' },
           { id: 'o9', nm: 'Do NPC', procedencia: 'npc' }],
  arena:  [{ id: 'r1', nm: 'Arena', procedencia: 'fragmento' }],
  /* e uma peça SEM procedência declarada, que é o caso perigoso */
  moldura: [{ id: 'm1', nm: 'Sem marca' }],
});

export function suite() {
  const s = criarSuite('vitrine');

  s.teste('o catálogo achata as famílias numa lista só', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    igual(cat.length, 8, 'o catálogo perdeu ou inventou peças');
    ok(cat.every(p => p.familia && p.id && p.nome && p.preco > 0),
      'alguma peça saiu sem família, id, nome ou preço');
    /* A pergunta "o que está à venda" é UMA, e não uma por família: com uma
       por família, acrescentar a sexta significa lembrar de seis lugares. */
    igual(new Set(cat.map(p => p.familia)).size, 5, 'uma família sumiu do catálogo');
  });

  s.teste('peça SEM procedência declarada NÃO vai à venda', () => {
    /* O silêncio é o lado seguro. Uma peça que ninguém marcou aparecendo na
       vitrine é a loja vendendo o que o desenho não decidiu vender — e isso
       não dá erro em lugar nenhum: dá dinheiro trocando de mão. */
    const cat = catalogoDaVitrine(FAMILIAS());
    const semMarca = cat.find(p => p.id === 'm1');
    igual(semMarca.procedencia, 'padrao',
      'peça sem procedência não caiu no lado seguro');
    ok(!aVendaNaVitrine(cat).some(p => p.id === 'm1'),
      'uma peça que ninguém marcou apareceu à venda');
  });

  s.teste('procedência inválida também cai no lado seguro', () => {
    const cat = catalogoDaVitrine({ avatar: [{ id: 'x', procedencia: 'gratis' }] });
    igual(cat[0].procedencia, 'padrao',
      'uma procedência inventada passou — e "gratis" viraria uma sexta porta ' +
      'que ninguém desenhou');
    ok(!procedenciaValida('gratis'));
    for (const p of PROCEDENCIAS) ok(procedenciaValida(p), `${p} deixou de valer`);
  });

  s.teste('só a procedência `loja` entra na vitrine', () => {
    const aVenda = aVendaNaVitrine(catalogoDaVitrine(FAMILIAS()));
    igual(aVenda.length, 3, 'a vitrine mostrou peça que não se compra');
    for (const p of aVenda)
      igual(p.procedencia, 'loja',
        `${p.familia}:${p.id} veio de ${p.procedencia} e está à venda`);
  });

  /* ── O PREÇO É PROPORCIONAL À SUPERFÍCIE, e isso é o princípio ─────────
     Um avatar é um retrato pequeno; um traje é o boneco que anda pelo bioma
     por horas. Cobrar o mesmo pelos dois diria que o jogador compra "um item",
     e ele não compra: compra o quanto de tela vira dele. */
  s.teste('o preço cresce com a superfície que a peça ocupa', () => {
    ok(precoDe('outfit') > precoDe('arena'), 'o traje custa menos que a arena');
    ok(precoDe('arena') > precoDe('cena'), 'a arena custa menos que o fundo do banner');
    ok(precoDe('cena') > precoDe('moldura'), 'o fundo custa menos que a moldura');
    ok(precoDe('moldura') > precoDe('avatar'), 'a moldura custa menos que o avatar');
    /* família desconhecida não pode sair de graça */
    ok(precoDe('inventada') >= PRECO_BASE,
      'uma família nova sairia por menos que a base — e de graça é o pior preço');
  });

  s.teste('a ÂNCORA: quem começa compra UMA peça, e não um armário', () => {
    /* A conta nova nasce com `SALDO_INICIAL`. Se ela comprasse metade da loja
       no primeiro dia, a vitrine seria um tutorial; se não comprasse nada, a
       peça mais barata seria enfeite.

         > A curva é o que o estudo da L-135 tem de julgar — não os dígitos. */
    const barata = Math.min(...Object.keys(PESO_DA_FAMILIA).map(precoDe));
    const cara = Math.max(...Object.keys(PESO_DA_FAMILIA).map(precoDe));
    ok(barata <= SALDO_INICIAL,
      `a peça mais barata custa ${barata} e a conta nasce com ${SALDO_INICIAL}: ` +
      'nenhuma peça está ao alcance do primeiro dia');
    ok(SALDO_INICIAL < barata * 5,
      `com ${SALDO_INICIAL} dá para comprar ${Math.floor(SALDO_INICIAL / barata)} ` +
      'peças de saída — a loja se esvazia antes de o jogo começar');
    ok(cara <= SALDO_INICIAL * 2,
      `a peça mais cara custa ${cara} contra um saldo inicial de ${SALDO_INICIAL}: ` +
      'longe demais, ela deixa de ser um objetivo e vira paisagem');
  });

  /* ── AS TRÊS RECUSAS, E NENHUMA DELAS É "NÃO" ─────────────────────────── */
  s.teste('comprar o que já é seu é recusado, e a recusa diz isso', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    const r = podeComprar(cat, { familia: 'avatar', id: 'a1',
                                 posse: ['avatar:a1'], saldo: 99999 });
    igual(r.pode, false, 'a loja cobrou duas vezes pela mesma peça');
    ok(/já tem/.test(r.motivo), `a recusa disse: ${r.motivo}`);
  });

  s.teste('peça de missão não se compra, e a recusa diz de onde ela vem', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    const r = podeComprar(cat, { familia: 'cena', id: 'c2', saldo: 99999 });
    igual(r.pode, false, 'uma peça de missão foi vendida');
    ok(/missao|missão/.test(r.motivo),
      `a recusa não diz de onde a peça vem: "${r.motivo}". Sem isso o jogador ` +
      'procura o botão de compra de uma coisa que nunca teve um');
  });

  s.teste('sem saldo, a recusa diz QUANTO falta', () => {
    /* Ter saldo na tela e ouvir "não" é o D-067 na porta do dinheiro — a pior
       forma de ensinar uma regra. */
    const cat = catalogoDaVitrine(FAMILIAS());
    const preco = precoDe('outfit');
    const r = podeComprar(cat, { familia: 'outfit', id: 'o1', saldo: preco - 40 });
    igual(r.pode, false);
    igual(r.faltam, 40, 'a recusa não contou quanto falta');
    ok(r.motivo.includes('40'), `a recusa não mostra o número: "${r.motivo}"`);
  });

  s.teste('com saldo, procedência e sem posse: compra', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    const r = podeComprar(cat, { familia: 'outfit', id: 'o1', saldo: precoDe('outfit') });
    igual(r.pode, true, `a compra legítima foi recusada: ${r.motivo}`);
    igual(r.peca.preco, precoDe('outfit'));
    /* Exatamente o preço basta: cobrar "mais que" deixaria um centavo de
       diferença entre ter e não ter, e ninguém consegue ver esse centavo. */
  });

  s.teste('a posse é uma chave só, e não cinco listas paralelas', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    const peca = cat.find(p => p.familia === 'avatar' && p.id === 'a1');
    igual(chaveDa(peca), 'avatar:a1');
    ok(temNaConta(['avatar:a1'], peca));
    ok(!temNaConta(['cena:a1'], peca),
      'a chave ignorou a família: um avatar e uma cena com o mesmo id viraram ' +
      'a mesma peça');
    ok(!temNaConta(null, peca), 'posse ausente derrubou a conta');
  });

  s.teste('o custo da vitrine soma só o que está à venda', () => {
    const cat = catalogoDaVitrine(FAMILIAS());
    igual(custoDaVitrine(cat), precoDe('avatar') + precoDe('cena') + precoDe('outfit'),
      'o total da vitrine somou peças que não se compram');
  });

  /* ═══ E AGORA O CATÁLOGO DE VERDADE ═════════════════════════════════════
   *
   * Tudo acima usa famílias de mentira, de propósito: o motor não pode
   * depender do tema. Estas afirmam o que o TEMA declarou, e elas existem
   * porque o dono pediu um filtro — e um filtro que devolve a lista inteira ou
   * a lista vazia é um filtro que ninguém percebe estar quebrado.
   */
  s.teste('as 101 peças cosméticas do tema entram no catálogo', async () => {
    const c = await import('../app/modules/cosmeticos.mjs');
    const cat = c.catalogo();
    const por = {};
    for (const p of cat) por[p.familia] = (por[p.familia] ?? 0) + 1;
    /* Os números são MEDIDOS, e a data importa: eles crescem quando arte nova
       entra, e o teste tem de crescer junto em vez de ser afrouxado. */
    ok(cat.length >= 100,
      `o catálogo tem ${cat.length} peças; medido em 09/09/2026 havia 101`);
    for (const f of ['outfit', 'avatar', 'cena', 'moldura', 'efeito', 'arena'])
      ok((por[f] ?? 0) > 0, `a família ${f} não entrou no catálogo`);
    /* E os 7 avatares de arte NOSSA moram noutro arquivo: só o catálogo os
       encontra com os 16 herdados. Foi o que faltou na primeira versão. */
    ok(por.avatar >= 23,
      `só ${por.avatar} avatares: os 7 de arte nossa ficaram de fora`);
  });

  s.teste('a regra é UMA: vende-se o que é nosso, o herdado fica de graça', async () => {
    const c = await import('../app/modules/cosmeticos.mjs');
    const venda = c.aVenda();
    ok(venda.length > 20 && venda.length < c.catalogo().length,
      `${venda.length} de ${c.catalogo().length} peças à venda — um filtro que ` +
      'devolve tudo ou nada é um filtro que ninguém percebe estar quebrado');

    /* CADA FAMÍLIA GUARDA UMA PEÇA DE GRAÇA. Uma vitrine que começa com o
       jogador pelado não é vitrine: é pedágio. */
    const fam = {};
    for (const p of c.catalogo()) {
      fam[p.familia] ??= { total: 0, gratis: 0 };
      fam[p.familia].total++;
      if (p.procedencia !== 'loja') fam[p.familia].gratis++;
    }
    for (const [f, n] of Object.entries(fam))
      ok(n.gratis > 0,
        `a família ${f} tem as ${n.total} peças à venda — quem chega não ` +
        'consegue montar identidade nenhuma antes de gastar');
  });

  s.teste('a arena de graça existe, e a batalha do primeiro dia tem onde acontecer', async () => {
    const c = await import('../app/modules/cosmeticos.mjs');
    const arenas = c.catalogo().filter(p => p.familia === 'arena');
    igual(arenas.filter(a => a.procedencia !== 'loja').length, 1,
      'as arenas de graça deixaram de ser exatamente uma');
  });

  s.teste('toda aba da loja aponta para uma família que existe', async () => {
    const c = await import('../app/modules/cosmeticos.mjs');
    const familias = new Set(c.catalogo().map(p => p.familia));
    for (const aba of c.ABAS) {
      ok(familias.has(aba.familia),
        `a aba "${aba.rotulo}" abre numa família (${aba.familia}) que o ` +
        'catálogo não tem — ela abriria vazia');
      ok(aba.rotulo && aba.sub,
        `a aba ${aba.familia} não diz o que ela é: um rótulo sozinho obriga o ` +
        'jogador a clicar nas seis para descobrir onde está a coisa dele');
    }
    igual(c.ABAS.length, familias.size,
      'há família no catálogo sem aba, ou aba sem família');
  });

  return s;
}
