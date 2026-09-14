/* A POKÉDEX — bloco 1.20.
 *
 * O que estes testes protegem é o que a tela PROMETE, e cada afirmação nasceu de
 * uma decisão que se pode perder numa refatoração:
 *
 *   o NOME que vaza      procurar pelo nome de algo que você não viu revelaria
 *                        a espécie sem tê-la encontrado
 *   visto ≠ CAPTURADO    duas conquistas diferentes desenhadas igual é uma
 *                        conquista perdida
 *   a EXIGÊNCIA          uma linha evolutiva sem o "como" é enfeite: o jogador
 *                        vê que evolui e não sabe o que fazer
 *   a CONDIÇÃO DESCONHECIDA  sumir em silêncio faria a tela prometer que basta
 *                        o nível quando o pack pede outra coisa
 *   o TETO da barra      255 é o teto teórico da série; num pack onde ninguém
 *                        passa de 250 metade da régua não distingue nada
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  STATS, tetoDeStat, somaDeStats, ondeMora, linhaComExigencia, falaDaExigencia,
  filtrar, progresso, capturados, vistosDe,
} from '../app/modules/pokedex-dados.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = p => readFileSync(join(RAIZ, p), 'utf8');

export function suite() {
  const s = criarSuite('pokedex');

  /* ── A BUSCA ──────────────────────────────────────────────────────────── */

  s.teste('a busca casa NÚMERO, e o número não depende de ter visto', () => {
    /* Quem joga há anos pensa em "o 25". E o número não revela nada: ele já
       está na lista, visível, ao lado da silhueta. */
    const vazio = new Set();
    igual(filtrar(kanto, { busca: '25', vistos: vazio }).map(e => e.dex).join(','), '25');
    igual(filtrar(kanto, { busca: '025', vistos: vazio }).map(e => e.dex).join(','), '25',
      'o número com zeros à frente devia casar — é assim que ele aparece na lista');
  });

  s.teste('a busca casa TIPO, porque a pergunta real é "quais de fogo eu tenho?"', () => {
    const fogo = filtrar(kanto, { busca: 'fogo', vistos: new Set() });
    ok(fogo.length > 5, `só ${fogo.length} espécies de fogo — a busca por tipo não pegou`);
    ok(fogo.every(e => (e.t ?? []).includes('fire')),
      'a busca por "fogo" trouxe espécie que não é de fogo');
  });

  s.teste('o NOME só casa quem já foi encontrada', () => {
    /* Achar pelo nome revelaria a espécie sem tê-la encontrado — e a Pokédex é
       a escada das vagas e do teto de encontros. Revelar de graça mataria a
       escada inteira. */
    igual(filtrar(kanto, { busca: 'charmander', vistos: new Set() }).length, 0,
      'o nome de uma espécie NÃO vista casou na busca — a silhueta deixa de ' +
      'ser silhueta se o campo de busca entrega o nome');
    igual(filtrar(kanto, { busca: 'charmander', vistos: new Set([4]) }).map(e => e.dex).join(','), '4',
      'o nome de uma espécie vista não casou');
  });

  s.teste('busca vazia devolve a lista inteira, vistas ou não', () => {
    /* A Pokédex existe para mostrar o que FALTA tanto quanto o que se tem. */
    igual(filtrar(kanto, { busca: '', vistos: new Set() }).length, kanto.especies.length);
    igual(filtrar(kanto, {}).length, kanto.especies.length);
  });

  /* ── VISTO NÃO É CAPTURADO ───────────────────────────────────────────── */

  s.teste('capturado sai das criaturas, e a caixa conta', () => {
    /* Guardar na caixa não desfaz a captura. */
    const e = { criaturas: [{ dex: 1 }, { dex: 4, naCaixa: true }, { dex: 4 }] };
    igual([...capturados(e)].sort((a, b) => a - b).join(','), '1,4',
      'a caixa deixou de contar, ou a espécie repetida virou duas');
    igual(capturados(null).size, 0, 'estado nulo devia dar conjunto vazio');
    igual(capturados({ criaturas: [{ dex: 'x' }, {}] }).size, 0,
      'um dex inválido entrou na conta de capturados');
  });

  s.teste('capturadas NUNCA passa de vistas', () => {
    /* Quem tem a criatura viu a espécie. O save está a um F12 de distância, e
       a tela não pode desenhar a segunda barra maior que a primeira porque
       alguém editou o arquivo. */
    const p = progresso(kanto, new Set([1]), new Set([1, 2, 3, 4, 5]));
    ok(p.pegos <= p.vistos,
      `${p.pegos} capturadas para ${p.vistos} vistas — a barra sairia do trilho`);
    ok(p.pctPegos <= p.pct, 'a porcentagem de capturadas passou a de vistas');
  });

  s.teste('o progresso conta as duas coisas, e nenhuma passa do total', () => {
    const todas = new Set(kanto.especies.map(e => e.dex));
    const p = progresso(kanto, todas, todas);
    igual(p.vistos, kanto.especies.length);
    igual(p.pegos, kanto.especies.length);
    igual(Math.round(p.pct), 100);
    const zero = progresso(kanto, null, null);
    igual(zero.vistos, 0); igual(zero.pegos, 0); igual(zero.pct, 0);
  });

  /* ── ONDE MORA — a diferença que esta Pokédex tem ─────────────────────── */

  s.teste('onde mora diz bioma, raridade e a partir de que estágio', () => {
    const casas = ondeMora(kanto, 4);
    ok(casas.length > 0, 'o Charmander não mora em lugar nenhum');
    for (const c of casas) {
      ok(c.rotulo && c.raridade, `casa incompleta: ${JSON.stringify(c)}`);
      ok(c.desde >= 1 && c.desde <= 4,
        `estágio de estreia ${c.desde} fora da faixa — a raridade dela não cabe ` +
        'em estágio nenhum, e aí a espécie é inalcançável');
    }
  });

  s.teste('TODA espécie do elenco tem onde morar, ou evolui de alguém', () => {
    /* Uma espécie que não cai em rota nenhuma e não evolui de ninguém é
       inalcançável — existe na lista e o jogador nunca a terá. */
    const orfas = [];
    for (const e of kanto.especies) {
      if (ondeMora(kanto, e.dex).length) continue;
      const linha = linhaComExigencia(kanto, e.dex);
      const temPai = linha.length > 1 && linha[0].dex !== e.dex;
      if (!temPai) orfas.push(e.n);
    }
    igual(orfas.length, 0,
      `${orfas.length} espécie(s) inalcançáveis: ${orfas.slice(0, 6).join(', ')}. ` +
      'Elas aparecem na Pokédex e não há como obtê-las — a escada nunca fecha.');
  });

  /* ── A LINHA EVOLUTIVA CARREGA O "COMO" ──────────────────────────────── */

  s.teste('a linha traz a exigência entre os elos', () => {
    const l = linhaComExigencia(kanto, 4);
    igual(l.map(x => x.dex).join(','), '4,5,6', 'a linha do Charmander mudou');
    ok(l[0].exige, 'o primeiro elo não diz o que se pede para evoluir');
    igual(falaDaExigencia(l[0].exige), 'nível 16');
    igual(l[l.length - 1].exige, null, 'o último elo não pode exigir nada');
  });

  s.teste('uma condição DESCONHECIDA aparece com o nome cru, e não some', () => {
    /* Sumir seria a tela prometer que basta o nível quando o pack pede outra
       coisa — e o jogador farmaria à toa até desistir. */
    const f = falaDaExigencia({ nivel: 16, climaEstranho: 'chuva' });
    ok(/16/.test(f), 'o nível sumiu');
    ok(/climaEstranho/.test(f),
      `"${f}" não menciona a condição que este código não conhece`);
    igual(falaDaExigencia(null), null, 'sem exigência devia devolver nulo');
  });

  s.teste('quem não evolui devolve uma linha de um só', () => {
    const so = kanto.especies.find(e => linhaComExigencia(kanto, e.dex).length === 1);
    ok(so, 'nenhuma espécie do pack é linha única — improvável, e vale conferir');
  });

  /* ── A FORMA ─────────────────────────────────────────────────────────── */

  s.teste('o teto da barra sai do PACK, e não do teto teórico da série', () => {
    /* 255 é o teto da série. Se ninguém no pack passa de 250, uma barra com
       teto 255 desperdiça régua; se um dia alguém passar, uma barra com teto
       cravado estoura. Derivar resolve os dois. */
    const teto = tetoDeStat(kanto);
    const maior = Math.max(...kanto.especies.flatMap(e => e.s ?? []));
    igual(teto, maior, 'o teto não é o maior valor do pack');
    ok(teto > 0, 'teto zero faria toda barra dividir por zero');
    igual(tetoDeStat(null), 1, 'pack nulo devia devolver 1, e não NaN');
  });

  s.teste('os seis stats existem e casam com o pack', () => {
    igual(STATS.length, 6, 'o número de stats mudou');
    for (const st of STATS) {
      ok(st.curto && st.longo,
        `o stat ${st.i} não tem nome curto ou explicação — e a explicação é ` +
        'regra: onde há um número, diz-se o que ele é');
      ok(kanto.especies.every(e => Number.isFinite(e.s?.[st.i])),
        `o índice ${st.i} não existe em toda espécie do pack`);
    }
    igual(somaDeStats({ s: [1, 2, 3, 4, 5, 6] }), 21);
    igual(somaDeStats(null), 0, 'espécie nula devia somar zero');
  });

  /* ── A TELA ──────────────────────────────────────────────────────────── */

  s.teste('a Pokédex lê o save sozinha, sem depender de outra aba', () => {
    /* Defeito achado OLHANDO: abrir a Pokédex sem passar pelas Rotas mostrava
       "0 de 146" com o registro cheio. Uma tela que depende de outra ter sido
       visitada mente para quem entrou pela porta errada — e o jogador não sabe
       que existem portas certas. */
    const t = ler('app/modules/pokedex.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
    ok(/lerEstado = \(\) => carregar\(\)/.test(t),
      'a Pokédex voltou a depender de alguém lhe entregar o estado');
    const idle = ler('app/modules/idle-tela.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
    ok(!/pokedexUsaEstado/.test(idle),
      'o idle-tela voltou a sobrescrever o estado da Pokédex na carga do módulo, ' +
      'e ele carrega o save só quando a aba das Rotas abre');
  });

  s.teste('o selo da pokébola é uma TIRA, e não o gif de 5,7 MB', () => {
    /* O gif original apareceria como selo de 20 px em até 146 linhas ao mesmo
       tempo: o navegador decodificaria meio megapixel oitenta vezes para
       desenhar vinte pixels. */
    const h = ler('app/index.html');
    ok(/pokebola-tira\.png/.test(h), 'o selo não usa a tira de sprites');
    ok(/steps\(24\)/.test(h), 'a animação deixou de andar de quadro em quadro');
    /* O deslocamento tem de ser em PIXEL. Em porcentagem o CSS calcula
       `(caixa - imagem) x pct`, e com a imagem 24x maior a tira some da tela —
       foi exatamente o que aconteceu na primeira versão. */
    ok(/background-position-x:calc\(var\(--lado\)/.test(h.replace(/\s+/g, '')),
      'o deslocamento do selo voltou a ser em porcentagem, e porcentagem em ' +
      'background-position não é deslocamento linear');
    ok(/prefers-reduced-motion[\s\S]{0,120}pdxBola\{animation:none\}/.test(h.replace(/\s+/g, ' ')) ||
       /pdxBola\{animation:none\}/.test(h.replace(/\s+/g, '')),
      'quem pediu menos movimento perdeu o selo — ele carrega informação, e ' +
      'informação não pode depender de animação');
  });

  s.teste('ter a criatura conta como ter visto a especie (D-075)', () => {
    /* O SAVE DO DONO, copiado: a inicial nunca passou por encontro, entao o
       `registro` nao a tem — e a Pokedex desenhava `007 ? ???` COM o selo de
       capturada ao lado. As duas metades da mesma linha se contradizendo. */
    const E = { registro: { 11: 3, 48: 1 }, criaturas: [{ dex: 7 }, { dex: 37 }] };
    const v = vistosDe(E);
    ok(v.has(7),  'a inicial (dex 7) tem de contar como vista: ela esta na caixa');
    ok(v.has(37), 'a capturada (dex 37) tem de contar como vista');
    ok(v.has(11) && v.has(48), 'o registro de fragmentos nao pode ser perdido na uniao');
    igual(v.size, 4, 'a uniao contou errado');

    /* E A INVARIANTE, DITA COMO INVARIANTE: capturado e SEMPRE subconjunto de
       visto. Ela ja estava escrita em `progresso` e aplicada so num `Math.min`
       sobre o contador — e um `min` faz o numero parar de acusar sem fazer o
       fato parar de existir. */
    for (const d of capturados(E))
      ok(v.has(d), `dex ${d} esta capturado e nao esta visto — a invariante ` +
        'de `progresso` diz o contrario, e ela e a regra');
  });

  s.teste('a uniao nao inventa nem engole', () => {
    igual(vistosDe(null).size, 0, 'estado ausente devia dar conjunto vazio');
    igual(vistosDe({}).size, 0, 'estado vazio devia dar conjunto vazio');
    /* Chave que nao e numero nao entra: um save adulterado nao pode empurrar
       lixo para dentro da contagem que move a escada de vagas. */
    igual(vistosDe({ registro: { abc: 1, 9: 1 } }).size, 1,
      'chave nao numerica entrou na contagem');
    /* A MESMA especie vista E capturada conta UMA vez. */
    igual(vistosDe({ registro: { 7: 2 }, criaturas: [{ dex: 7 }] }).size, 1,
      'a especie vista e capturada foi contada duas vezes');
  });

  return s;
}
