/* Q1/Q2/Q5 · A MARCA DO DONO CHEGA À TELA (R26)
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA IMPEDIR ─────────────────────────────────
 *
 * O `R13` baixou 146 arquivos de arte animada e não ligou nenhum deles à tela;
 * o `D-028` criou seis classes sem CSS; o `R7` escreveu cinco regras de
 * identidade sem elemento que as usasse. Três vezes a arte existiu no disco e
 * não existiu para quem joga.
 *
 * Este bloco põe no produto a arte que o dono desenhou. Se ela ficar no disco,
 * terá sido a quarta.
 *
 * ── E A REGRA DO CONTENTPACK CONTINUA VALENDO ──────────────────────────────
 *
 * O nome da arena fica VAZIO no HTML de propósito — quem o preenche é o boot, a
 * partir de `ROTULOS.arena`. Escrever `Poké`/`Arena` no corpo traria o
 * identificador da franquia para dentro do app, e `test/conteudo.mjs` existe
 * para impedir isso.
 *
 * A arte da marca É identificador de tema, tanto quanto o nome. Então ela sai
 * do PACK, e não de um caminho fixo no HTML: trocar de pack troca a marca
 * junto, que é a promessa inteira da camada de conteúdo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import escolhido from '../content/escolhido.mjs';
import { marcaEmLetrado as pintarMarcaHTML, pintarMarca } from '../app/modules/marca.mjs';

const raiz = p => new URL('../' + p, import.meta.url);
const APP = readFileSync(raiz('app/index.html'), 'utf8');

/* Largura, altura e canal alfa saem do cabeçalho IHDR do PNG — bytes 16 a 25.
   Sem dependência: o formato declara isso nos primeiros 26 bytes. */
function png(caminho) {
  if (!existsSync(raiz(caminho))) return null;
  const b = readFileSync(raiz(caminho));
  const assinatura = b.subarray(0, 8).toString('hex');
  return {
    ok: assinatura === '89504e470d0a1a0a',
    largura: b.readUInt32BE(16), altura: b.readUInt32BE(20),
    /* tipo de cor 6 = RGBA, 4 = cinza+alfa. Os dois têm transparência. */
    alfa: b[25] === 6 || b[25] === 4,
    bytes: b.length,
  };
}

export function suite() {
  const s = criarSuite('marca-arte');

  /* ── OS ARQUIVOS ───────────────────────────────────────────────────────*/

  s.teste('as três peças da marca existem e são PNG de verdade', () => {
    for (const peça of ['logo', 'letrado', 'logo-letrado']) {
      const p = png(`arte/marca/${peça}.png`);
      ok(p, `\`arte/marca/${peça}.png\` não existe`);
      ok(p.ok, `\`${peça}.png\` não tem assinatura de PNG — é outro formato com o nome errado`);
      ok(p.largura > 100 && p.altura > 50,
        `\`${peça}.png\` tem ${p.largura}x${p.altura}, pequeno demais para marca`);
    }
  });

  /* O FUNDO TRANSPARENTE É O PONTO. O dono mandou as versões sem fundo de
     propósito: a marca vai sobre a barra escura e sobre o herói, e um retângulo
     branco atrás dela anularia as duas. JPG não tem alfa — se alguém trocar por
     JPG "porque pesa menos", o fundo volta. */
  s.teste('as três têm fundo transparente', () => {
    for (const peça of ['logo', 'letrado', 'logo-letrado'])
      ok(png(`arte/marca/${peça}.png`).alfa,
        `\`${peça}.png\` não tem canal alfa — a marca ganharia um retângulo de ` +
        `fundo sobre a barra escura, que é o oposto do que ela é`);
  });

  /* ── A MARCA SAI DO PACK, E NÃO DE UM CAMINHO FIXO ─────────────────────*/

  s.teste('o pack declara a arte da marca', () => {
    ok(escolhido.marca, 'o pack em uso não declara `marca`');
    for (const peça of ['logo', 'letrado'])
      ok(typeof escolhido.marca[peça] === 'string' && escolhido.marca[peça],
        `o pack não declara \`marca.${peça}\``);
  });

  s.teste('o que o pack declara é o que existe no disco', () => {
    for (const [peça, caminho] of Object.entries(escolhido.marca)) {
      const p = png(caminho.replace(/^\.\.\//, ''));
      ok(p && p.ok,
        `o pack aponta \`marca.${peça}\` para "${caminho}" e não há PNG lá. ` +
        `Caminho declarado que não existe é marca que some sem nada quebrar.`);
    }
  });

  /* O CAMINHO NÃO PODE ESTAR ESCRITO NO HTML. Se estiver, trocar de pack
     deixa a marca antiga na tela — e a camada de conteúdo deixa de valer para
     a coisa mais visível do produto. */
  s.teste('o HTML não fixa o caminho da marca', () => {
    ok(!/arte\/marca\//.test(APP),
      'o `index.html` aponta direto para `arte/marca/`. Trocar de pack deixaria ' +
      'a marca antiga na tela — e a marca é o identificador de tema mais visível ' +
      'que existe.');
  });

  /* ── E ELA PRECISA CHEGAR À TELA ───────────────────────────────────────*/

  /* A `<img>` nasce em tempo de execução, então procurá-la no HTML não serve.
     O que o HTML precisa ter é o CSS QUE A ALCANÇA — e é exatamente a pergunta
     do `D-028`, onde seis classes existiram sem uma regra sequer e o cartão
     ficou invisível com a suíte verde. */
  s.teste('há onde desenhar a marca, e alguém que a desenhe', () => {
    ok(/\.marcaArte\b/.test(APP),
      '`.marcaArte` não existe no CSS. A imagem entraria sem tamanho nem halo — ' +
      'e sem `height` declarada, um PNG de 528px de largura estoura a barra do topo.');
    ok(/\.marcaArte\{[^}]*height|\s\.marcaArte\{[^}]*height|marcaArte\{height/.test(APP.replace(/\s+/g, ' '))
       || /\.brand \.marcaArte\{height/.test(APP),
      'nenhuma regra dá altura à marca — a proporção do PNG decidiria o layout');

    const modulo = readFileSync(raiz('app/modules/marca.mjs'), 'utf8');
    ok(/marca\[?\.?(logo|letrado)/.test(modulo),
      '`marca.mjs` não lê a arte declarada pelo pack — o arquivo ficaria no ' +
      'disco, que foi exatamente o R13');

    /* E ALGUÉM PRECISA CHAMAR. O módulo pode estar certo e ninguém usá-lo. */
    ok(/pintarMarca\s*\(/.test(APP),
      'o boot não chama `pintarMarca` — a arte fica no disco e a tela segue no ' +
      'letrado em CSS, que é o R13 acontecendo de novo');
  });

  /* TRÊS LUGARES, e o primeiro é o que mais importa: a tela de boot fica no ar
     enquanto o Monte Carlo roda, que é o único momento em que o produto tem a
     atenção inteira e nada para mostrar. */
  s.teste('a marca aparece nos três lugares que a mostram', () => {
    for (const alvo of ['marcaNome', 'heroMarca', 'bootMarca'])
      ok(new RegExp(`getElementById\\('${alvo}'\\)|\\b${alvo}\\b`).test(APP),
        `\`${alvo}\` não é alimentado — um dos três lugares da marca ficou de fora`);
  });

  /* ── A RESERVA, E ELA PRECISA SER TESTADA DE VERDADE ───────────────────
   *
   * A sabotagem `S334` passou ilesa na primeira passada do Q2, e o motivo vale
   * escrever: o caminho de reserva SÓ RODA quando o pack não tem arte, e o pack
   * em uso tem. Nenhum teste o alcançava — ele era código vivo que nunca
   * executava sob teste.
   *
   * Por isso ele virou `marcaEmLetrado`, que devolve string em vez de escrever
   * no elemento. Agora se confere sem DOM e sem trocar de pack. */
  s.teste('sem arte declarada, o letrado em CSS continua sendo o caminho', () => {
    const semArte = { rotulos: { arena: 'PokéArena' } };
    igual(pintarMarcaHTML(semArte), '<i>Poké</i><b>Arena</b>',
      'o letrado de reserva não saiu nas duas peças');
    ok(/\.letrado\b/.test(APP), 'o letrado em CSS sumiu do index.html — não há reserva');
  });

  /* AS DUAS PEÇAS SÃO O DESENHO. `<i>` leva o branco com brilho, `<b>` o
     gradiente recortado. Texto solto perde os dois tratamentos e o letrado vira
     uma linha comum — o defeito não quebra nada e apaga a marca. */
  s.teste('o letrado de reserva mantém as duas peças separadas', () => {
    const html = pintarMarcaHTML({ rotulos: { arena: 'PokéArena' } });
    ok(/<i>[^<]+<\/i>/.test(html), 'a primeira peça (`<i>`) sumiu do letrado');
    ok(/<b>[^<]+<\/b>/.test(html), 'a segunda peça (`<b>`) sumiu do letrado');
  });

  /* O nome vem do pack, que é DADO. Um pack com `<` no nome injetaria markup
     na barra do topo. */
  s.teste('o nome do pack é escapado antes de virar markup', () => {
    const html = pintarMarcaHTML({ rotulos: { arena: '<script>X' } });
    ok(!/<script>/.test(html), `markup do nome entrou cru: ${html}`);
  });

  /* Nome de uma palavra só continua desenhando, com um tratamento em vez de
     dois — é a regra que `partirMarca` já tinha, e ela não pode ter se perdido. */
  s.teste('nome de uma palavra só continua tendo letrado', () => {
    const html = pintarMarcaHTML({ rotulos: { arena: 'Coliseu' } });
    ok(html.includes('Coliseu'), `o nome sumiu: ${html}`);
  });

  /* ── E A ESCOLHA ENTRE OS DOIS CAMINHOS PRECISA SER TESTADA ────────────
   *
   * `marcaEmLetrado` estar certo não basta: quem decide qual caminho usar é o
   * `pintarMarca`, e a sabotagem `S415` passou ilesa porque ninguém o exercia.
   * Ele precisa de um elemento — um objeto mínimo com `innerHTML` basta, e é
   * mais honesto que levantar um DOM inteiro para testar duas linhas. */
  const elementoFalso = () => ({ innerHTML: null });

  s.teste('pack COM arte usa a arte; pack SEM arte usa o letrado', () => {
    const comArte = { rotulos: { arena: 'PokéArena' },
                      marca: { letrado: 'arte/marca/letrado.png' } };
    const semArte = { rotulos: { arena: 'PokéArena' } };

    const a = elementoFalso();
    igual(pintarMarca(a, comArte, 'letrado'), 'arte', 'o pack com arte não usou a arte');
    ok(/<img[^>]+marcaArte/.test(a.innerHTML), `a arte não foi escrita: ${a.innerHTML}`);

    const b = elementoFalso();
    igual(pintarMarca(b, semArte, 'letrado'), 'css',
      'o pack SEM arte não caiu no letrado — o `original_v1` é um pack sem arte, ' +
      'e ele ficaria sem nome nenhum na tela');
    igual(b.innerHTML, '<i>Poké</i><b>Arena</b>',
      `o letrado de reserva não foi escrito: ${b.innerHTML}`);
  });

  s.teste('sem elemento, `pintarMarca` não quebra o boot', () => {
    igual(pintarMarca(null, { rotulos: { arena: 'X' } }), null,
      'elemento ausente derrubou o desenho da marca — o boot morre antes da arena');
  });

  return s;
}
