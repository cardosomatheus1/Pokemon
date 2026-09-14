/* Q1/Q3/Q4 · ONDE CADA ESPÉCIE VIVE (bloco 1.1, §7.13 e §7.17).
 *
 * ── A AFIRMAÇÃO CENTRAL ───────────────────────────────────────────────────
 *
 * A fidelidade que o dono do projeto pediu —
 *
 *   > Um Pokémon de gelo não aparece dentro de uma caverna de fogo.
 *
 * — não é conferida por revisão humana. Ela é IMPOSSÍVEL DE QUEBRAR, porque o
 * bioma é derivado do tipo e não escrito espécie a espécie. Não há campo para
 * alguém preencher errado.
 *
 * ── E A OUTRA, QUE É O CRITÉRIO DA GEN 2 ──────────────────────────────────
 *
 * O dono fixou que acrescentar uma geração tem de ser MUDAR DADO, não mudar
 * código. Este arquivo prova isso do jeito mais direto que existe: carrega um
 * pack inventado, com outro número de espécies, outros tipos e outros biomas —
 * e exige que tudo continue funcionando sem uma linha de `engine/` mudar.
 *
 * Se este teste passar, Gen 2 é uma tarde de edição de dados. Se não passar, o
 * bloco 1.1 não fecha.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { especiesDoBioma, biomasDaEspecie, forcaDe, raridadeDe, elencoDoBioma }
  from '../engine/bioma.mjs';
import { gerarInstancia, semente } from '../engine/instancia.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

/* Um pack INVENTADO, com nada em comum com os dois de verdade: outro número de
   espécies, outros tipos, outros biomas, outra escala de força, outras
   naturezas. É o instrumento do critério da Gen 2. */
const PACK_ESTRANHO = {
  id: 'pack_de_teste',
  especies: [
    { dex: 1, n: 'alfa',  t: ['cristal'],          s: [10, 10, 10, 10, 10, 10] },
    { dex: 2, n: 'beta',  t: ['cristal', 'vapor'], s: [40, 40, 40, 40, 40, 40] },
    { dex: 3, n: 'gama',  t: ['vapor'],            s: [90, 90, 90, 90, 90, 90] },
    { dex: 4, n: 'delta', t: ['areia'],            s: [70, 70, 70, 70, 70, 70] },
  ],
  biomas: [
    { id: 'caverna', rotulo: 'Caverna', tipos: ['cristal'] },
    { id: 'fenda',   rotulo: 'Fenda',   tipos: ['vapor'] },
    { id: 'duna',    rotulo: 'Duna',    tipos: ['areia'] },
    /* Um bioma que hospeda OS DOIS tipos da beta — é ele que prova a segunda
       metade da regra de moradia, e não existiria se a regra fosse só "algum
       tipo bate". */
    { id: 'geiser',  rotulo: 'Gêiser',  tipos: ['cristal', 'vapor'] },
  ],
  raridade: [['baixa', 100], ['media', 300], ['alta', 99999]],
  naturezas: [['Uma', null, null], ['Outra', 'atq', 'def']],
};

export function suite() {
  const s = criarSuite('bioma');

  /* --- a fidelidade, e ela é estrutural ----------------------------------- */

  s.teste('nenhuma espécie aparece num bioma que não tem tipo dela', () => {
    for (const b of kanto.biomas) {
      const tipos = new Set(b.tipos);
      for (const e of especiesDoBioma(kanto, b.id))
        ok(e.t.some(t => tipos.has(t)),
          `${e.n} (${e.t.join('/')}) apareceu em ${b.rotulo}, que hospeda ` +
          `${b.tipos.join('/')}. É a fidelidade que dá RAZÃO para escolher onde ` +
          `farmar — sem ela o idle vira uma tela só pintada de cores diferentes.`);
    }
  });

  /* O CASO QUE O DONO CITOU, medido diretamente. Ele vale como exemplo, e o
     teste acima é que vale como garantia. */
  s.teste('criatura de gelo não aparece no vulcão', () => {
    const noVulcao = new Set(especiesDoBioma(kanto, 'vulcao').map(e => e.dex));
    const deGelo = kanto.especies.filter(e => e.t.includes('ice'));
    ok(deGelo.length > 0, 'o pack não tem nenhuma espécie de gelo — o teste não mede nada');
    for (const e of deGelo)
      ok(!noVulcao.has(e.dex), `${e.n} é de gelo e apareceu no vulcão`);
  });

  s.teste('toda espécie do pack tem pelo menos um bioma', () => {
    const orfas = kanto.especies.filter(e => biomasDaEspecie(kanto, e.dex).length === 0);
    igual(orfas.length, 0,
      `${orfas.length} espécies sem bioma nenhum: ${orfas.slice(0,6).map(e=>e.n).join(', ')}. ` +
      `Espécie sem lugar é espécie que não pode ser capturada — some da coleção ` +
      `sem ninguém notar, porque nada reprova.`);
  });

  s.teste('espécie de tipo duplo pode morar em mais de um lugar', () => {
    const multi = kanto.especies.filter(e => biomasDaEspecie(kanto, e.dex).length > 1);
    ok(multi.length > 20,
      `só ${multi.length} espécies em mais de um bioma. Tipo duplo é a regra, e ` +
      `prender cada uma a um lugar só empobreceria todos os biomas de uma vez.`);
  });

  /* --- a raridade sai da força ------------------------------------------- */

  s.teste('a raridade cresce com a força, sem exceção', () => {
    const ordem = kanto.raridade.map(([id]) => id);
    let anterior = -1;
    for (const e of [...kanto.especies].sort((a, b) => forcaDe(a) - forcaDe(b))) {
      const i = ordem.indexOf(raridadeDe(kanto, e));
      ok(i >= anterior,
        `${e.n} (força ${forcaDe(e)}) saiu como ${raridadeDe(kanto, e)}, mais comum ` +
        `que uma espécie mais fraca. A raridade tem de ser monotônica na força, ` +
        `senão o preço do mercado deixa de ter explicação.`);
      anterior = Math.max(anterior, i);
    }
  });

  /* A FAIXA "lendario" É DE RARIDADE, E NÃO DE PokéMON LENDÁRIO — a palavra
     colide e a confusão sairia caro. Os cinco lendários de verdade NÃO estão no
     pack: são bosses de raid (L-057), e por isso o pack tem 146 e não 151. */
  s.teste('os cinco lendários NÃO estão no elenco capturável', () => {
    const dex = new Set(kanto.especies.map(e => e.dex));
    for (const d of [144, 145, 146, 150, 151])
      ok(!dex.has(d),
        `o dex ${d} está no pack. Os cinco lendários são bosses de raid (L-057) e ` +
        `não podem ser capturados no farm normal — se entrarem aqui, entram no ` +
        `sorteio de encontro e a decisão do dono do projeto vira letra morta.`);
    ok(kanto.especies.length >= 140 && kanto.especies.length <= 148,
      `${kanto.especies.length} espécies. Esperado 146 = 151 menos os cinco.`);
  });

  s.teste('o elenco de um bioma vem ordenado por força', () => {
    for (const b of kanto.biomas) {
      const el = elencoDoBioma(kanto, b.id);
      for (let i = 1; i < el.length; i++)
        ok(el[i].forca >= el[i-1].forca, `${b.rotulo} fora de ordem em ${i}`);
    }
  });

  /* A TRAVA QUE TERIA PEGO O D-051.
   *
   * Os testes de raridade perguntavam se ela era COERENTE — monotônica na força,
   * sem órfãos. Nenhum perguntava se ela era JOGÁVEL.
   *
   * O pack original passou por todos eles com UMA espécie comum em 76: 88% dos
   * encontros cairiam em "raro" ou pior, com captura de 14% ou menos. O farm
   * seria injogável e a suíte inteira ficaria verde, porque cada teste
   * respondia a pergunta que sabia fazer.
   *
   * As faixas são DADO DO PACK desde o 1.2b, e cada pack tem a própria
   * distribuição de força. Este teste é o que obriga as duas coisas a
   * conversarem. */
  s.teste('as faixas de raridade cabem na distribuição de força DO PACK', () => {
    for (const [nome, pack] of [['kanto', kanto], ['original', original]]) {
      const n = pack.especies.length;
      const cont = {};
      for (const e of pack.especies) {
        const r = raridadeDe(pack, e);
        cont[r] = (cont[r] ?? 0) + 1;
      }
      const comum = (cont.comum ?? 0) / n;
      ok(comum > 0.20 && comum < 0.55,
        `[${nome}] ${(comum*100).toFixed(1)}% do elenco é comum (${cont.comum ?? 0} de ` +
        `${n}). Abaixo de 20% o farm vira loteria: quase todo encontro cai numa ` +
        `faixa de captura difícil, e o jogador olha para uma lista que não ` +
        `consegue tocar. Acima de 55% a raridade deixa de significar alguma coisa.`);

      for (const [id] of pack.raridade.slice(0, -1))
        ok((cont[id] ?? 0) >= 3,
          `[${nome}] a faixa "${id}" tem ${cont[id] ?? 0} espécie(s). Faixa quase ` +
          `vazia é faixa que o jogador nunca vê — e o preço dela no mercado passa ` +
          `a depender de um punhado de casos.`);
    }
  });

  /* --- O CRITÉRIO DA GEN 2 ----------------------------------------------- */

  s.teste('§Gen2 · um pack ESTRANHO funciona sem tocar em engine/ nem server/', () => {
    /* Quatro espécies, três biomas, dois tipos inventados, três faixas de
       raridade com outra escala, duas naturezas. Nada em comum com Kanto. */
    igual(especiesDoBioma(PACK_ESTRANHO, 'caverna').length, 2,
      'a caverna devia hospedar alfa e beta, que são de cristal');
    igual(especiesDoBioma(PACK_ESTRANHO, 'geiser').length, 3,
      'o gêiser declara cristal E vapor, então as três moram nele: alfa e gama ' +
      'pelo tipo principal, beta pelos dois. Um bioma de dois tipos é o mais ' +
      'povoado do pack, e isso é consequência da regra, não exceção a ela.');
    igual(especiesDoBioma(PACK_ESTRANHO, 'duna').length, 1, 'a duna devia ter só delta');
    /* A REGRA DE MORADIA MUDOU NO 1.4, e este teste é onde ela se lê.
     *
     * Antes: bastava UM tipo bater. Isso punha Charizard (fogo/voador) na
     * Praia, que hospeda água e voador — e o dono do projeto pediu justamente
     * que isso não acontecesse.
     *
     * Agora: mora quem tem o tipo PRINCIPAL do bioma, ou quem bate em DOIS.
     * A beta é cristal/vapor: mora na Caverna (cristal é o principal dela) e no
     * Gêiser (os dois tipos batem), e NÃO na Fenda, onde só o segundo tipo dela
     * aparece. É a mesma diferença entre "um Gyarados na praia" e "um Charizard
     * na praia": o primeiro é água/voador num bioma de água e voador. */
    igual(biomasDaEspecie(PACK_ESTRANHO, 2).sort().join(','), 'caverna,geiser',
      'a beta é cristal/vapor: mora onde cristal é principal e onde os dois batem');
    igual(biomasDaEspecie(PACK_ESTRANHO, 3).sort().join(','), 'fenda,geiser',
      'a gama é só vapor: mora na Fenda e no Gêiser, os dois que declaram vapor');

    igual(raridadeDe(PACK_ESTRANHO, PACK_ESTRANHO.especies[0]), 'baixa',
      'a escala de força deste pack é outra, e a raridade tem de segui-la');
    igual(raridadeDe(PACK_ESTRANHO, PACK_ESTRANHO.especies[2]), 'alta');

    const inst = gerarInstancia(semente(1), { naturezas: PACK_ESTRANHO.naturezas });
    ok(['Uma', 'Outra'].includes(inst.natureza.nome),
      `a natureza saiu "${inst.natureza.nome}", que não é deste pack. O motor ` +
      `está conhecendo tema, e o critério da Gen 2 cai junto.`);
  });

  /* O PACK ORIGINAL É O TESTE DE VERDADE do §0.3.1: ele existe para ser jogável
     sem uma linha da franquia, e se o bioma só funcionasse com Kanto o §0.3.1
     seria impossível de cumprir. */
  s.teste('§Gen2 · o pack ORIGINAL tem biomas e naturezas próprios, e funciona', () => {
    ok(original.biomas?.length > 0, 'o pack original ficou sem biomas');
    ok(original.naturezas?.length > 0, 'o pack original ficou sem naturezas');

    const nomesKanto = new Set(kanto.naturezas.map(n => n[0]));
    for (const [nome] of original.naturezas)
      ok(!nomesKanto.has(nome),
        `a natureza "${nome}" é a mesma dos dois packs. O §0.3.1 exige que o ` +
        `original seja jogável SEM a franquia, e reusar o nome de lá é trazer a ` +
        `franquia por outro caminho.`);

    for (const b of original.biomas)
      ok(especiesDoBioma(original, b.id).length > 0,
        `${b.rotulo} ficou vazio no pack original — bioma sem ninguém é rota morta`);
  });

  /* A TRAVA QUE IMPEDE A GEN 2 DE FICAR CARA.
   *
   * Enquanto ninguém escrever 151 no motor, acrescentar geração é editar dado.
   * No dia em que alguém escrever — num teto de laço, num tamanho de array, numa
   * validação "dex tem de ser <= 151" — a Gen 2 passa a exigir caçar esse número
   * em lugares que ninguém lembra.
   *
   * O teste é bobo de propósito: procura o NÚMERO. É a forma mais barata de
   * proteger uma decisão de arquitetura que custaria semanas para desfazer. */
  s.teste('§Gen2 · nenhum tamanho de dex está escrito em engine/ nem server/', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');

    const PROIBIDOS = [151, 146, 76, 251];
    for (const dir of ['../engine/', '../server/']) {
      const raiz = fileURLToPath(new URL(dir, import.meta.url));
      for (const arq of readdirSync(raiz).filter(f => f.endsWith('.mjs'))) {
        const txt = readFileSync(raiz + arq, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, ' ')          // comentário não é código
          .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
        for (const n of PROIBIDOS)
          ok(!new RegExp(`(?<![\\w.])${n}(?![\\w.])`).test(txt),
            `${dir}${arq} tem o número ${n} escrito no código. O tamanho da dex é ` +
            `DADO do pack — escrito aqui, acrescentar a Gen 2 deixa de ser editar ` +
            `um arquivo e passa a ser caçar números em lugares que ninguém lembra. ` +
            `É o critério de aceitação que o dono do projeto fixou para este bloco.`);
      }
    }
  });

  return s;
}
