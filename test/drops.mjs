/* Q1/Q3/Q4 · O QUE A EXPEDIÇÃO TRAZ ALÉM DAS CRIATURAS (bloco 1.2c).
 *
 * ── AS TRÊS AFIRMAÇÕES ────────────────────────────────────────────────────
 *
 * 1. **A BOLA NÃO COBRE OS ENCONTROS, E ISSO É A MECÂNICA.** São ~27 encontros
 *    e ~12 bolas por dia. Escolher em quem gastar a bola boa é A decisão do
 *    idle; o fragmento de registro é o consolo de quem ficou para trás. Se a bola
 *    passar a cobrir tudo, a captura vira fila de cliques sem escolha — e o
 *    teste mede exatamente essa razão.
 *
 * 2. **A PEDRA É DO BIOMA.** É o que dá endereço no mapa à linha evolutiva do
 *    1.1: a Pedra do Fogo é o Vulcão, o Elo é a Ruína. Sem isso, todo bioma
 *    daria tudo e escolher a rota seria escolher a cor do fundo.
 *
 * 3. **O MOTOR NÃO SABE O NOME DE NENHUMA BOLA.** Ele sorteia CLASSES, e o pack
 *    resolve. Um pack com cinco bolas continua funcionando sem tocar no motor.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  TABELA, ITENS_POR_PERFIL, tabelaDo, sortearItens, quantosItens,
  agrupar, bolasOrdenadas, pedrasDo, elosDo,
} from '../engine/drops.mjs';
import { PERFIS, sortearEncontros } from '../engine/expedicao.mjs';
import { semente } from '../engine/instancia.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const DIA = [['vigilia', 1], ['trilha', 1], ['batida', 2]];
const media = ([a, b]) => (a + b) / 2;

export function suite() {
  const s = criarSuite('drops');

  /* --- 1 · A ESCASSEZ DA BOLA É A MECÂNICA -------------------------------- */

  s.teste('§Q4 · a bola cobre uma fração dos encontros, e não todos', () => {
    const rnd = semente(2026);
    const N = 1500;
    let enc = 0, bolas = 0;
    for (let d = 0; d < N; d++)
      for (const [perfil, q] of DIA)
        for (let k = 0; k < q; k++) {
          enc += sortearEncontros(rnd, { pack: kanto, bioma: 'floresta', perfil }).length;
          for (const i of sortearItens(rnd, { pack: kanto, bioma: 'floresta', perfil }))
            if (i.classe === 'bola') bolas += i.quantidade;
        }
    const cobertura = bolas / enc;
    ok(cobertura > 0.30 && cobertura < 0.70,
      `as bolas cobrem ${(cobertura*100).toFixed(0)}% dos encontros ` +
      `(${(enc/N).toFixed(1)} encontros e ${(bolas/N).toFixed(1)} bolas por dia). ` +
      `Acima de 70% a captura vira fila de cliques sem escolha; abaixo de 30% o ` +
      `jogador olha para uma lista que não pode tocar. A decisão de em quem gastar ` +
      `a bola é o que faz o idle valer a atenção.`);
  });

  s.teste('§Q4 · a bola boa é rara, e a barata é o pão de cada dia', () => {
    const rnd = semente(11);
    const conta = {};
    for (let i = 0; i < 4000; i++)
      for (const it of sortearItens(rnd, { pack: kanto, bioma: 'praia', perfil: 'vigilia' }))
        if (it.classe === 'bola') conta[it.id] = (conta[it.id] ?? 0) + it.quantidade;
    const ordem = bolasOrdenadas(kanto).map(b => b.id);
    for (let i = 1; i < ordem.length; i++)
      ok((conta[ordem[i]] ?? 0) < (conta[ordem[i-1]] ?? 0),
        `a bola ${ordem[i]} caiu ${conta[ordem[i]] ?? 0} vezes e a ${ordem[i-1]} ` +
        `${conta[ordem[i-1]] ?? 0}. A bola boa TEM de ser rara — ela é o que se ` +
        `guarda para o raro, e guardar só é decisão quando falta.`);
    ok((conta[ordem[2]] ?? 0) * 6 < (conta[ordem[0]] ?? 0),
      `a bola boa não é rara o bastante frente à barata`);
  });

  s.teste('o ritmo de saque cai conforme a expedição fica longa', () => {
    const porHora = p => media(ITENS_POR_PERFIL[p]) / (PERFIS[p].minutos / 60);
    ok(porHora('batida') > porHora('trilha') && porHora('trilha') > porHora('vigilia'),
      `saques por hora: batida ${porHora('batida').toFixed(2)}, trilha ` +
      `${porHora('trilha').toFixed(2)}, vigília ${porHora('vigilia').toFixed(2)}. ` +
      `Mesmo eixo dos encontros: o jogo ATIVO rende mais por hora.`);
    ok(media(ITENS_POR_PERFIL.vigilia) > media(ITENS_POR_PERFIL.batida),
      'e a sessão longa tem de render mais no total, senão dormir não paga');
  });

  s.teste('todo perfil de expedição tem saque declarado', () => {
    for (const p of Object.keys(PERFIS))
      ok(ITENS_POR_PERFIL[p],
        `o perfil "${p}" não tem saque declarado, e devolveria zero itens em ` +
        `silêncio. Perfil sem drop é expedição que não paga nada.`);
    igual(quantosItens(semente(1), 'inexistente'), 0);
  });

  /* --- 2 · A PEDRA É DO BIOMA -------------------------------------------- */

  s.teste('cada pedra só cai no bioma que a declara', () => {
    for (const item of kanto.itens) {
      for (const b of kanto.biomas) {
        const cai = [...pedrasDo(kanto, b.id), ...elosDo(kanto, b.id)].some(i => i.id === item.id);
        igual(cai, b.id === item.fonte,
          `"${item.rotulo}" ${cai ? 'cai' : 'não cai'} em ${b.rotulo}, e a fonte ` +
          `dele é "${item.fonte}". A pedra ser do bioma é o que dá endereço no ` +
          `mapa à linha evolutiva — sem isso, escolher a rota é escolher a cor do fundo.`);
      }
    }
  });

  s.teste('o Elo tem peso próprio, muito menor que o da pedra', () => {
    const linhaPedra = TABELA.find(l => l.classe === 'pedra');
    const linhaElo = TABELA.find(l => l.classe === 'elo');
    ok(linhaElo.peso * 4 <= linhaPedra.peso,
      `o elo pesa ${linhaElo.peso} e a pedra ${linhaPedra.peso}. O Elo substituiu ` +
      `a TROCA entre jogadores (bloco 1.1) — a raridade que a troca dava tem de ` +
      `virar raridade de item, senão a linha evolutiva que dependia dela fica de graça.`);
  });

  s.teste('o Elo só cai no bioma dele, e no pack inteiro só há um', () => {
    const nossos = kanto.itens.filter(i => i.nosso);
    igual(nossos.length, 1, 'o pack tem mais de um item de autoria própria');
    const onde = kanto.biomas.filter(b => elosDo(kanto, b.id).length).map(b => b.id);
    igual(onde.join(','), nossos[0].fonte,
      `o Elo cai em ${onde.join(', ')} e devia cair só em ${nossos[0].fonte}`);
  });

  /* --- a redistribuição --------------------------------------------------- */

  s.teste('bioma sem pedra não rende menos — o peso é redistribuído', () => {
    const semPedra = kanto.biomas.map(b => b.id)
      .find(b => !pedrasDo(kanto, b).length && !elosDo(kanto, b).length);
    ok(semPedra, 'todo bioma tem pedra — o teste não mede nada');

    const soma = b => tabelaDo(kanto, b).reduce((a, l) => a + l.peso, 0);
    const cheio = TABELA.reduce((a, l) => a + l.peso, 0);
    ok(Math.abs(soma(semPedra) - cheio) < 1e-9,
      `o bioma "${semPedra}" soma ${soma(semPedra)} de peso e o cheio é ${cheio}. ` +
      `Um bioma sem pedra não pode render "nada" no lugar dela: renderia menos por ` +
      `um motivo que nenhuma tela explica, e o jogador aprenderia a evitá-lo sem ` +
      `nunca saber por quê.`);

    /* e o saque de lá tem de vir cheio */
    const rnd = semente(8);
    let n = 0;
    for (let i = 0; i < 200; i++)
      n += sortearItens(rnd, { pack: kanto, bioma: semPedra, perfil: 'trilha' }).length;
    ok(n / 200 >= ITENS_POR_PERFIL.trilha[0],
      `o bioma sem pedra rendeu ${(n/200).toFixed(1)} itens, abaixo do mínimo do perfil`);
  });

  s.teste('nenhum bioma devolve saque vazio', () => {
    const rnd = semente(3);
    for (const b of kanto.biomas) {
      const itens = sortearItens(rnd, { pack: kanto, bioma: b.id, perfil: 'vigilia' });
      ok(itens.length >= ITENS_POR_PERFIL.vigilia[0],
        `${b.rotulo} devolveu ${itens.length} itens numa vigília`);
    }
  });

  /* --- 3 · O MOTOR NÃO SABE NOME DE BOLA --------------------------------- */

  s.teste('§Gen2 · um pack com OUTRAS bolas funciona sem tocar no motor', () => {
    const idsK = new Set(kanto.bolas.map(b => b.id));
    const rnd = semente(6);
    const vistos = new Set();
    for (let i = 0; i < 300; i++)
      for (const it of sortearItens(rnd, { pack: original, bioma: original.biomas[0].id, perfil: 'vigilia' }))
        if (it.classe === 'bola') vistos.add(it.id);
    ok(vistos.size > 0, 'o pack original não rendeu bola nenhuma');
    for (const id of vistos)
      ok(!idsK.has(id),
        `a bola "${id}" saiu no pack original e é do outro pack. O motor sorteia ` +
        `CLASSES e o pack resolve — se um id do outro pack aparece aqui, o motor ` +
        `está conhecendo tema.`);
  });

  s.teste('§Gen2 · um pack com CINCO bolas continua funcionando', () => {
    const cinco = {
      ...kanto,
      bolas: [
        { id: 'a', rotulo: 'A', mult: 0.8 }, { id: 'b', rotulo: 'B', mult: 1.0 },
        { id: 'c', rotulo: 'C', mult: 1.4 }, { id: 'd', rotulo: 'D', mult: 1.9 },
        { id: 'e', rotulo: 'E', mult: 2.6 },
      ],
    };
    const rnd = semente(4);
    const conta = {};
    for (let i = 0; i < 600; i++)
      for (const it of sortearItens(rnd, { pack: cinco, bioma: 'campo', perfil: 'vigilia' }))
        if (it.classe === 'bola') conta[it.id] = (conta[it.id] ?? 0) + 1;
    ok((conta.a ?? 0) > (conta.b ?? 0) && (conta.b ?? 0) > (conta.c ?? 0),
      `com cinco bolas, as três posições da tabela têm de cair nas TRÊS MAIS ` +
      `FRACAS, e em ordem. Saiu ${JSON.stringify(conta)}.`);
    igual((conta.d ?? 0) + (conta.e ?? 0), 0,
      'as bolas fortes de um pack com cinco não podem cair — a tabela sorteia ' +
      'três posições, e ampliá-la é decisão, não deriva');
  });

  s.teste('a ordem das bolas sai do MULTIPLICADOR, não da ordem escrita', () => {
    const desordenado = { ...kanto, bolas: [...kanto.bolas].reverse() };
    igual(bolasOrdenadas(desordenado).map(b => b.id).join(','),
          bolasOrdenadas(kanto).map(b => b.id).join(','),
      'listar as bolas em outra ordem mudou qual delas é a barata. A ordem tem de ' +
      'sair do multiplicador — confiar na ordem escrita põe a bola boa no lugar da ' +
      'barata no dia em que alguém reordenar o pack.');
  });

  /* --- o agrupamento ------------------------------------------------------ */

  s.teste('o saque agrupado soma por id e não perde nada', () => {
    const rnd = semente(21);
    const cru = sortearItens(rnd, { pack: kanto, bioma: 'vulcao', perfil: 'vigilia' });
    const agr = agrupar(cru);
    igual(agr.reduce((a, i) => a + i.quantidade, 0),
          cru.reduce((a, i) => a + i.quantidade, 0),
      'agrupar perdeu quantidade');
    igual(new Set(agr.map(i => i.classe === 'essencia' ? 'essencia' : i.id)).size, agr.length,
      'o agrupado tem id repetido — seriam duas linhas para a mesma coisa no banco');

    /* E O CONTRÁRIO, que é o erro mais fácil: agrupar por CLASSE em vez de por
       id funde a Poké Ball com a Ultra Ball numa linha só. A soma continua
       certa, a bolsa fica errada, e nada reprova — foi por isso que este teste
       ganhou a segunda metade. */
    const idsCru = new Set(cru.map(i => i.classe === 'essencia' ? 'essencia' : i.id));
    igual(agr.length, idsCru.size,
      'o saque tinha ' + idsCru.size + ' coisas distintas e o agrupado devolveu ' +
      agr.length + ' linhas. Agrupar por CLASSE em vez de por id funde a bola ' +
      'barata com a boa: a soma continua certa e a bolsa fica errada.');
  });

  s.teste('a mesma semente devolve o mesmo saque', () => {
    const a = sortearItens(semente(99), { pack: kanto, bioma: 'gelo', perfil: 'trilha' });
    const b = sortearItens(semente(99), { pack: kanto, bioma: 'gelo', perfil: 'trilha' });
    igual(JSON.stringify(a), JSON.stringify(b),
      'sem determinismo o saque não é auditável, e o §25.2 não fecha para ele');
  });

  s.teste('a essência cai em quantidade variável, e nunca zero', () => {
    const rnd = semente(31);
    const qs = new Set();
    for (let i = 0; i < 500; i++)
      for (const it of sortearItens(rnd, { pack: kanto, bioma: 'campo', perfil: 'vigilia' }))
        if (it.classe === 'essencia') qs.add(it.quantidade);
    ok(qs.size > 1, `a essência caiu sempre na mesma quantidade (${[...qs]}) — moeda ` +
                    `que cai sempre igual não tem textura nenhuma`);
    ok(!qs.has(0) && Math.min(...qs) >= 1, 'a essência caiu zero, que é item vazio na bolsa');
  });

  return s;
}
