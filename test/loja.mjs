/* A LOJA — bloco 1.25.
 *
 * Ela mexe em SALDO, que é a coisa que este projeto mais protege. As afirmações
 * daqui são de invariante, e não de aparência:
 *
 *   NÃO É TORNEIRA   comprar e vender o mesmo item tem de dar PREJUÍZO, ou o
 *                    jogador farma dinheiro clicando duas vezes
 *   RECUSA           sem saldo ou sem item, ela nega — e não corrige em
 *                    silêncio. Corrigir faz o jogador desconfiar do saldo dele.
 *   NÃO MUTA         devolve estado novo, como o `creditar` e a evolução
 *   O PREÇO É REGRA  dezenove itens caem de expedição e nenhum tem preço de
 *                    compra; escrever dezenove números seria dezenove lugares
 *                    para desequilibrar sem um motivo escrito ao lado
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  aVenda, aceita, precoDeCompra, precoDeVenda, comprar, vender, cabemQuantos,
  FRACAO_DE_VENDA, VALOR_DA_FAIXA,
} from '../engine/loja.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const MOEDA = kanto.moedaPve.id;
const comSaldo = (n, extra = {}) => ({ bolsa: { [MOEDA]: n, ...extra }, criaturas: [] });

export function suite() {
  const s = criarSuite('loja');

  s.teste('a vitrine sai do catálogo, e não de uma lista própria', () => {
    const v = aVenda(kanto);
    ok(v.length >= 3, `só ${v.length} item(ns) à venda`);
    for (const i of v) {
      igual(i.porta, 'loja', `"${i.id}" está na vitrine sem ser da loja`);
      ok(i.preco > 0, `"${i.id}" está à venda por ${i.preco}`);
    }
    /* Do mais barato para o mais caro: a vitrine é lida de cima para baixo, e a
       decisão quase sempre é "o que cabe no que eu tenho". */
    for (let i = 1; i < v.length; i++)
      ok(v[i].preco >= v[i - 1].preco,
        `a vitrine saiu fora de ordem: ${v[i - 1].id} (${v[i - 1].preco}) antes de ` +
        `${v[i].id} (${v[i].preco})`);
  });

  s.teste('COMPRAR e VENDER o mesmo item é PREJUÍZO — a loja não é torneira', () => {
    /* A invariante que sustenta a loja inteira. Sem ela, o jogador farma
       dinheiro clicando duas vezes, e nenhuma outra afirmação importa. */
    ok(FRACAO_DE_VENDA < 0.5,
      `a fração é ${FRACAO_DE_VENDA}. A partir de 0,5 a dupla comprar-vender ` +
      'deixa de ser prejuízo em algum arredondamento.');
    for (const i of aVenda(kanto)) {
      const volta = precoDeVenda(kanto, i.id);
      ok(volta < i.preco,
        `"${i.id}" custa ${i.preco} e volta ${volta} — comprar e vender daria ` +
        'lucro, e a loja vira uma impressora de moeda');
      /* E ida-e-volta em QUANTIDADE também: o arredondamento não pode virar
         lucro em escala. */
      const E = comSaldo(i.preco * 10);
      const depois = vender(comprar(E, { pack: kanto, id: i.id, quantos: 10 }).estado,
                            { pack: kanto, id: i.id, quantos: 10 }).estado;
      ok(depois.bolsa[MOEDA] < E.bolsa[MOEDA],
        `dez idas e voltas de "${i.id}" saíram de ${E.bolsa[MOEDA]} para ` +
        `${depois.bolsa[MOEDA]} — a escala virou lucro`);
    }
  });

  s.teste('a loja RECUSA em vez de corrigir', () => {
    const E = comSaldo(100, { poke: 1 });
    let erro = null;
    try { comprar(E, { pack: kanto, id: 'poke', quantos: 1 }); } catch (e) { erro = e.message; }
    ok(erro && /faltam/.test(erro), `sem saldo, a compra respondeu: ${erro}`);
    /* E não tocou no estado. */
    igual(E.bolsa[MOEDA], 100, 'a compra recusada mexeu no saldo');

    erro = null;
    try { vender(E, { pack: kanto, id: 'poke', quantos: 5 }); } catch (e) { erro = e.message; }
    ok(erro && /você tem 1/.test(erro), `vendendo o que não tem: ${erro}`);
    igual(E.bolsa.poke, 1, 'a venda recusada mexeu na bolsa');
  });

  s.teste('quantidade zero ou negativa é recusada, e não vira nada', () => {
    const E = comSaldo(10000, { poke: 5 });
    for (const q of [0, -3, 0.4]) {
      let erro = null;
      try { comprar(E, { pack: kanto, id: 'poke', quantos: q }); } catch (e) { erro = e.message; }
      ok(erro, `comprar ${q} passou sem reclamar`);
      erro = null;
      try { vender(E, { pack: kanto, id: 'poke', quantos: q }); } catch (e) { erro = e.message; }
      ok(erro, `vender ${q} passou sem reclamar`);
    }
  });

  s.teste('nenhuma das duas MUTA o estado que recebeu', () => {
    /* Mesma forma do `creditar` e do `aplicar` da evolução — é o que impede
       meia-compra gravada se algo falhar no meio. */
    const E = comSaldo(1000, { poke: 2 });
    const antes = JSON.stringify(E);
    comprar(E, { pack: kanto, id: 'poke', quantos: 2 });
    vender(E, { pack: kanto, id: 'poke', quantos: 1 });
    igual(JSON.stringify(E), antes, 'a loja escreveu no estado que recebeu');
  });

  s.teste('a moeda não se vende a si mesma', () => {
    const E = comSaldo(500);
    let erro = null;
    try { vender(E, { pack: kanto, id: MOEDA, quantos: 1 }); } catch (e) { erro = e.message; }
    ok(erro, 'a moeda foi vendida por ela mesma — é um laço de dinheiro infinito');
  });

  s.teste('o que a loja aceita inclui o que o jogador NÃO tem', () => {
    /* A boa ideia do dono: um catálogo que mostra o que você ainda não tem, com
       o preço, transforma a loja num MAPA DE OBJETIVOS. Quem vê que a pedra vale
       480 sabe o que procurar antes de tê-la. */
    const lista = aceita(kanto);
    ok(lista.length > aVenda(kanto).length,
      `a loja aceita ${lista.length} e vende ${aVenda(kanto).length} — ela só ` +
      'compra o que ela mesma vende, e o mapa de objetivos some');
    for (const i of lista) ok(i.valor > 0, `"${i.id}" foi listado valendo ${i.valor}`);
    /* Do mais caro para o mais barato: aqui a pergunta é "o que vale a pena
       procurar", e ela se responde de cima. */
    for (let i = 1; i < lista.length; i++)
      ok(lista[i].valor <= lista[i - 1].valor, 'a lista de compra saiu fora de ordem');
  });

  s.teste('o preço de venda SOBE com a raridade', () => {
    /* Um preço que contraria a dificuldade ensina o jogador a farmar o fácil. */
    const ordem = ['comum', 'incomum', 'raro', 'muitoRaro', 'lendario'];
    for (let i = 1; i < ordem.length; i++)
      ok(VALOR_DA_FAIXA[ordem[i]] > VALOR_DA_FAIXA[ordem[i - 1]],
        `"${ordem[i]}" vale ${VALOR_DA_FAIXA[ordem[i]]} e "${ordem[i - 1]}" vale ` +
        `${VALOR_DA_FAIXA[ordem[i - 1]]} — o preço anda ao contrário da dificuldade`);
  });

  s.teste('item que a loja não conhece devolve `null`, e não zero', () => {
    /* "Não compro isto" e "compro por zero" são frases diferentes, e um zero
       desenhado como preço ensina que o item é lixo quando ele pode ser a peça
       de uma evolução. */
    igual(precoDeVenda(kanto, 'item_que_nao_existe'), null);
    igual(precoDeCompra(kanto, 'item_que_nao_existe'), null);
    /* ── E UM ITEM QUE EXISTE COM UMA FAIXA QUE A TABELA NÃO CONHECE ──────
       As duas linhas acima usam um id que NÃO ESTÁ no catálogo — e nesse caminho
       a função devolve `null` antes de chegar na tabela de faixas. A linha que
       decide entre `null` e zero nunca era executada por elas, e uma sabotagem
       que trocava uma pela outra passava verde.

         > Testar a porta de entrada não testa o corredor. */
    const packEstranho = { catalogo: [{ id: 'x', nome: 'X', faixa: 'epico' }] };
    igual(precoDeVenda(packEstranho, 'x'), null,
      'um item de faixa desconhecida voltou valendo alguma coisa. "Não compro ' +
      'isto" e "compro por zero" são frases diferentes, e um zero desenhado como ' +
      'preço ensina que o item é lixo quando ele pode ser peça de uma evolução.');
    /* E um item do catálogo que não está à venda também não tem preço de compra. */
    const soDrop = (kanto.catalogo ?? []).find(i => i.porta === 'drop');
    igual(precoDeCompra(kanto, soDrop.id), null,
      `"${soDrop.id}" cai de expedição e apareceu com preço de compra`);
    ok(precoDeVenda(kanto, soDrop.id) > 0, 'e ele tem de poder ser VENDIDO');
  });

  s.teste('quantos cabem no bolso', () => {
    const preco = precoDeCompra(kanto, 'poke');
    igual(cabemQuantos(comSaldo(preco * 3 + 1), { pack: kanto, id: 'poke' }), 3);
    igual(cabemQuantos(comSaldo(0), { pack: kanto, id: 'poke' }), 0);
    igual(cabemQuantos(comSaldo(9999), { pack: kanto, id: 'nao_existe' }), 0);
  });

  s.teste('a compra e a venda fecham a conta', () => {
    const preco = precoDeCompra(kanto, 'great');
    const E = comSaldo(preco * 4);
    const c = comprar(E, { pack: kanto, id: 'great', quantos: 3 });
    igual(c.estado.bolsa[MOEDA], preco, 'sobrou o valor errado');
    igual(c.estado.bolsa.great, 3, 'entrou a quantidade errada');
    igual(c.gasto, preco * 3);

    const v = vender(c.estado, { pack: kanto, id: 'great', quantos: 3 });
    igual(v.estado.bolsa.great, 0, 'sobrou item depois de vender tudo');
    igual(v.recebeu, precoDeVenda(kanto, 'great') * 3);
  });

  s.teste('a vendedora tem o que dizer, e o texto mora no PACK', () => {
    /* Texto é TEMA. Uma loja que abre com uma tabela de preços é um formulário;
       uma que abre com alguém falando é um lugar. */
    const falas = kanto.falasDaLoja ?? [];
    ok(falas.length >= 8, `só ${falas.length} fala(s) — repetiriam rápido demais`);
    igual(new Set(falas).size, falas.length, 'há falas repetidas na lista');
    for (const f of falas) {
      ok(typeof f === 'string' && f.trim().length > 8, `fala curta demais: "${f}"`);
      ok(f.length < 90, `fala longa demais para um balão: "${f}"`);
    }
    /* Três falam de VENDER, que é a metade da loja que o jogador esquece. */
    const deVenda = falas.filter(f => /compro|pago|vend|mochila|sobrou/i.test(f));
    ok(deVenda.length >= 3,
      `só ${deVenda.length} fala(s) lembram que a loja COMPRA — é a metade que ` +
      'o jogador não descobre sozinho');
  });

  s.teste('a vendedora é a metade DIREITA do vídeo, e o corte é exato', () => {
    /* O arquivo tem os dois NPCs no mesmo quadro. O corte é feito pela janela —
       zero recodificação, um arquivo para as duas lojas, e o som inteiro, que é
       o pedido do dono e que um gif não carregaria.

       As duas afirmações abaixo são ARITMÉTICA, e não gosto:

         a caixa tem de ter a proporção da METADE (8:9), ou a metade não cabe
         sozinha nela — medido: com 1.15 sobravam ~300 px do outro NPC;
         o foco tem de ser 0% ou 100%, porque com a proporção exata alinhar a
         borda JÁ é mostrar o pedaço certo — com 75% sobravam 160 px. */
    const h = ler('app/index.html');
    ok(/--foco:\s*100%/.test(h),
      'a loja PvE não está mostrando a metade DIREITA do vídeo. O dono foi ' +
      'literal: a mulher é a da loja de PokéCoin, e o homem é o da PokéCash.');
    ok(/aspect-ratio:\s*8\s*\/\s*9/.test(h),
      'a caixa da vendedora perdeu a proporção 8:9. Sem ela o corte deixa de ' +
      'ser exato e o outro NPC aparece de lado.');
    ok(/object-position:\s*var\(--foco\)/.test(h),
      'a metade deixou de ser escolhida por `object-position` — deslocar dentro ' +
      'de uma janela que já cabe inteira só empurra a arte para fora');
  });

  s.teste('o vídeo nasce MUDO, e o som é do gesto que abre', () => {
    /* Sem `muted` o navegador recusa o autoplay e a vendedora fica parada. O som
       entra no clique, que é um gesto e portanto autoriza o áudio.

       E a regra do dono é literal: *"ao fechar o som não é permitido ouvir, em
       aba alguma do site"*. */
    const h = ler('app/index.html');
    ok(/<video[^>]*\bmuted\b/.test(h),
      'o vídeo da loja não nasce mudo — o navegador vai recusar o autoplay e a ' +
      'vendedora fica congelada');
    const t = ler('app/modules/loja-tela.mjs');
    ok(/v\.muted\s*=\s*false/.test(t), 'abrir a loja não liga o som');
    ok(/v\.muted\s*=\s*true/.test(t) && /v\.pause/.test(t),
      'fechar a loja não emudece E para o vídeo — pausar sem emudecer deixa o ' +
      'som voltar sozinho no dia em que alguém der play por outro caminho');
  });

  return s;
}

import { readFileSync } from 'node:fs';
const ler = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
