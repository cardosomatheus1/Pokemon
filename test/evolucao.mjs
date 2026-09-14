/* Q1/Q3 · AS LINHAS EVOLUTIVAS (bloco 1.1, §7.9).
 *
 * ── A AFIRMAÇÃO CENTRAL, E ELA É ECONÔMICA ────────────────────────────────
 *
 * **Evoluir preserva o potencial.**
 *
 * O número é sorteado uma vez, na captura, e é ele que dá preço à criatura. Se
 * evoluir re-sorteasse, ninguém pagaria por um filhote bom — o resultado seria
 * decidido depois da venda. Se evoluir empurrasse os ocultos para cima, quem
 * vende evoluído estaria vendendo um sorteio que o comprador não viu acontecer.
 *
 * As duas quebras dariam o MESMO sintoma no jogo: preço sem explicação. E
 * nenhuma delas aparece como erro — o jogo continua rodando, só que o mercado
 * para de fazer sentido. É por isso que este é o primeiro teste do arquivo.
 *
 * ── E O CRITÉRIO DA GEN 2 ─────────────────────────────────────────────────
 *
 * A Gen 2 traz evolução por AFINIDADE, que Kanto não tem. O penúltimo teste
 * prova que ela já cabe hoje: um pack inventado declara vinculo: 220 e funciona,
 * sem uma linha de `engine/` mudar. Se esse teste passar, a Gen 2 é dado.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { saidasDe, baseDe, estagioDe, linhaDe,
         evolucoesDisponiveis, evoluir, exigenciasDesconhecidas, CONDICOES }
  from '../engine/evolucao.mjs';
import { forcaDe } from '../engine/bioma.mjs';
import { gerarInstancia, semente } from '../engine/instancia.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

const PACKS = [['kanto', kanto], ['original', original]];

/* Um pack inventado com uma condição que NENHUM pack de verdade usa hoje. É o
   instrumento do critério da Gen 2. */
const PACK_ESTRANHO = {
  especies: [
    { dex: 1, n: 'alfa',  t: ['cristal'], s: [10,10,10,10,10,10] },
    { dex: 2, n: 'beta',  t: ['cristal'], s: [40,40,40,40,40,40] },
    { dex: 3, n: 'gama',  t: ['cristal'], s: [90,90,90,90,90,90] },
  ],
  itens: [{ id: 'lasca', rotulo: 'Lasca', fonte: 'caverna' }],
  evolucoes: [
    { de: 1, para: 2, exige: { vinculo: 220 } },                 /* a da Gen 2 */
    { de: 2, para: 3, exige: { nivel: 30, item: 'lasca' } },      /* conjunção */
  ],
};

export function suite() {
  const s = criarSuite('evolucao');

  /* --- A AFIRMAÇÃO CENTRAL ------------------------------------------------ */

  s.teste('evoluir preserva potencial, ocultos, natureza e exemplar', () => {
    const rnd = semente(7);
    for (let i = 0; i < 200; i++) {
      const antes = gerarInstancia(rnd, { especie: 1, naturezas: kanto.naturezas });
      const dep = evoluir(antes, { de: 1, para: 2 });
      igual(dep.especie, 2, 'a espécie tinha de mudar');
      igual(dep.potencial, antes.potencial,
        'o potencial mudou de ' + antes.potencial + ' para ' + dep.potencial +
        ' ao evoluir. É o número pelo qual o mercado paga — mudá-lo aqui é ' +
        'decidir o resultado DEPOIS da venda, e nenhum preço volta a ter explicação.');
      igual(dep.iv.join(','), antes.iv.join(','), 'os ocultos mudaram ao evoluir');
      igual(dep.natureza.nome, antes.natureza.nome, 'a natureza mudou ao evoluir');
      igual(dep.exemplar, antes.exemplar, 'a marca de exemplar mudou ao evoluir');
      igual(dep.nivel, antes.nivel, 'evoluir repôs o nível — evoluir não é renascer');
    }
  });

  /* --- Q1 · a condição --------------------------------------------------- */

  s.teste('nível: indisponível um nível abaixo, disponível no nível exato', () => {
    const base = { especie: 1, nivel: 15, vinculo: 0 };
    igual(evolucoesDisponiveis(kanto, base).length, 0,
      'o dex 1 evolui em 16 e apareceu disponível em 15');
    igual(evolucoesDisponiveis(kanto, { ...base, nivel: 16 }).length, 1,
      'o dex 1 evolui em 16 e NÃO apareceu disponível em 16');
    igual(evolucoesDisponiveis(kanto, { ...base, nivel: 90 }).length, 1,
      'passar do nível não pode tirar a evolução da mesa');
  });

  s.teste('item: sem ele na bolsa, não evolui; com ele, evolui', () => {
    const pedra = kanto.evolucoes.find(e => e.exige.item === 'lua');
    const inst = { especie: pedra.de, nivel: 50, vinculo: 0 };
    igual(evolucoesDisponiveis(kanto, inst, { itens: [] }).length, 0,
      'evoluiu por pedra com a bolsa vazia');
    igual(evolucoesDisponiveis(kanto, inst, { itens: ['fogo'] }).length, 0,
      'a pedra errada serviu — item tem de ser o item, não "um item qualquer"');
    igual(evolucoesDisponiveis(kanto, inst, { itens: ['lua'] })[0].para, pedra.para,
      'com a pedra certa na bolsa, a evolução tinha de estar disponível');
  });

  s.teste('uma linha que se abre em três oferece as três de uma vez', () => {
    const ramos = kanto.especies
      .map(e => saidasDe(kanto, e.dex))
      .filter(sa => sa.length >= 3);
    ok(ramos.length >= 1,
      'nenhuma espécie do pack se abre em três. A linha que ramifica é conteúdo ' +
      'do material de origem, e some sem ninguém notar se nada a exigir.');
    const r = ramos[0];
    const itens = r.map(e => e.exige.item);
    const disp = evolucoesDisponiveis(kanto, { especie: r[0].de, nivel: 50 }, { itens });
    igual(disp.length, r.length,
      'com as ' + r.length + ' pedras na bolsa, as ' + r.length + ' saídas tinham ' +
      'de estar disponíveis — a escolha é do jogador, e não do motor');
  });

  s.teste('exigência que o motor não conhece NÃO evolui', () => {
    const pk = { evolucoes: [{ de: 1, para: 2, exige: { humor: 3 } }] };
    igual(exigenciasDesconhecidas({ humor: 3 }).join(','), 'humor');
    igual(evolucoesDisponiveis(pk, { especie: 1, nivel: 99 }, { itens: ['tudo'] }).length, 0,
      'uma chave que o motor não sabe comparar liberou a evolução. Ignorar o ' +
      'desconhecido dá evolução de graça no dia em que alguém errar de digitar o ' +
      'nome do campo — e criatura evoluída de graça é preço de mercado errado.');
  });

  /* --- Q3 · invariantes do dado, nos DOIS packs --------------------------- */

  for (const [nome, pack] of PACKS) {
    s.teste('[' + nome + '] toda aresta liga duas espécies que existem', () => {
      const dex = new Set(pack.especies.map(e => e.dex));
      for (const e of pack.evolucoes)
        ok(dex.has(e.de) && dex.has(e.para),
          'a aresta ' + e.de + '→' + e.para + ' cita espécie fora do elenco. ' +
          'Evoluir para o vazio some com a criatura do jogador sem nada reprovar.');
    });

    s.teste('[' + nome + '] nenhuma espécie tem dois pais', () => {
      const pais = new Map();
      for (const e of pack.evolucoes) pais.set(e.para, (pais.get(e.para) ?? 0) + 1);
      const duplos = [...pais].filter(([, n]) => n > 1);
      igual(duplos.length, 0,
        duplos.length + ' espécies com mais de uma entrada: ' +
        duplos.slice(0,4).map(([d]) => d).join(', ') + '. Duas bases para a mesma ' +
        'criatura e o registro deixa de ter uma linha para desenhar.');
    });

    s.teste('[' + nome + '] não há ciclo, e nenhuma linha passa de três estágios', () => {
      for (const e of pack.especies) {
        const est = estagioDe(pack, e.dex);
        ok(est <= 3,
          e.n + ' saiu no estágio ' + est + '. Acima de três é quase sempre ciclo ' +
          'no dado, e ciclo faria o registro desenhar para sempre.');
      }
    });

    s.teste('[' + nome + '] evoluir nunca enfraquece', () => {
      const porDex = new Map(pack.especies.map(e => [e.dex, e]));
      for (const a of pack.evolucoes) {
        const de = forcaDe(porDex.get(a.de)), para = forcaDe(porDex.get(a.para));
        ok(para > de,
          porDex.get(a.de).n + ' (' + de + ') evolui para ' + porDex.get(a.para).n +
          ' (' + para + '), que é mais fraco ou igual. Evoluir tem de ser sempre um ' +
          'ganho — senão a raridade, que sai da força, contradiz a linha evolutiva, ' +
          'e o preço passa a depender de qual das duas o jogador olhou.');
      }
    });

    s.teste('[' + nome + '] toda exigência é comparável, e todo item existe', () => {
      const itens = new Set((pack.itens ?? []).map(i => i.id));
      const biomas = new Set((pack.biomas ?? []).map(b => b.id));
      for (const e of pack.evolucoes) {
        const desconhecidas = exigenciasDesconhecidas(e.exige);
        igual(desconhecidas.join(','), '',
          'a aresta ' + e.de + '→' + e.para + ' exige "' + desconhecidas.join(',') +
          '", que o motor não sabe comparar. Ela nunca vai acontecer, e nada mais reprova.');
        if (e.exige.item)
          ok(itens.has(e.exige.item),
            'a aresta ' + e.de + '→' + e.para + ' pede o item "' + e.exige.item +
            '", que o pack não declara — a linha fica morta e a criatura nunca evolui.');
      }
      for (const i of (pack.itens ?? []))
        ok(biomas.has(i.fonte),
          'o item "' + i.rotulo + '" cai em "' + i.fonte + '", que não é bioma deste ' +
          'pack. Item sem rota é item que ninguém pega.');
    });

    s.teste('[' + nome + '] a linha vista de qualquer membro é a mesma linha', () => {
      for (const e of pack.especies) {
        const daBase = linhaDe(pack, baseDe(pack, e.dex)).sort((a,b)=>a-b).join(',');
        igual(linhaDe(pack, e.dex).sort((a,b)=>a-b).join(','), daBase,
          'a linha vista do dex ' + e.dex + ' difere da vista da base dela');
      }
    });
  }

  /* --- O CRITÉRIO DA GEN 2 ------------------------------------------------ */

  s.teste('§Gen2 · evolução por AFINIDADE já funciona, sem o motor mudar', () => {
    ok(!kanto.evolucoes.some(e => 'vinculo' in (e.exige ?? {})),
      'Kanto já usa vínculo — o teste deixaria de provar que a condição NOVA cabe');

    const frio = { especie: 1, nivel: 99, vinculo: 0 };
    igual(evolucoesDisponiveis(PACK_ESTRANHO, frio, { itens: ['lasca'] }).length, 0,
      'evoluiu por afinidade com vínculo zero');
    igual(evolucoesDisponiveis(PACK_ESTRANHO, { ...frio, vinculo: 220 })[0].para, 2,
      'com o vínculo cheio, a evolução por afinidade tinha de sair — e ela é uma ' +
      'condição que NENHUM pack de hoje usa. Se este teste falha, acrescentar a ' +
      'Gen 2 volta a ser mudar o motor.');

    /* conjunção: as DUAS chaves têm de valer */
    const meio = { especie: 2, nivel: 30, vinculo: 0 };
    igual(evolucoesDisponiveis(PACK_ESTRANHO, meio, { itens: [] }).length, 0,
      'nível bateu e item faltou, e mesmo assim evoluiu — exige é conjunção');
    igual(evolucoesDisponiveis(PACK_ESTRANHO, { ...meio, nivel: 29 }, { itens: ['lasca'] }).length, 0,
      'item bateu e nível faltou, e mesmo assim evoluiu');
    igual(evolucoesDisponiveis(PACK_ESTRANHO, meio, { itens: ['lasca'] }).length, 1,
      'as duas bateram e não evoluiu');
  });

  s.teste('§Gen2 · o motor não conhece nenhuma condição fora da tabela', () => {
    igual(Object.keys(CONDICOES).sort().join(','), 'item,nivel,vinculo',
      'a tabela de condições mudou. Isso é permitido — é a ÚNICA razão para o ' +
      'engine/evolucao.mjs mudar — mas tem de ser decisão, e não deriva: cada ' +
      'condição nova é uma família inteira de evoluções possíveis.');
  });

  return s;
}
