/* Q1/Q2/Q5 · A IDENTIDADE VISUAL CHEGA À TELA (R7)
 *
 * ── O ACHADO QUE DEFINIU O BLOCO ──────────────────────────────────────────
 *
 * O pedido era "logo e letrado novos onde a marca aparece" e "os detalhes
 * decorativos que existiam e se perderam — a Pokébola ao lado do nome".
 *
 * A investigação achou outra coisa, e maior: **a identidade visual inteira já
 * está no CSS e não alcança nada.** As regras existem, completas, com animação:
 *
 *     .letrado        o nome em duas peças, gradiente recortado e brilho
 *     .letrado.vivo   o pulso lento — "o neon respirando"
 *     .pokemark       a pokébola cyber em CSS puro, ao lado do nome
 *     .hero-art       a arte de fundo da tela de entrada
 *     .hero-mark      o letrado grande no alto do Início
 *
 * E NENHUMA delas aparece no corpo do documento. Zero usos. A topbar mostra
 * `⚔️` — um emoji de espadas — no lugar da marca, e o hero não tem arte.
 *
 * É a mesma família do `D-028`, invertida: lá havia marcação escrevendo classes
 * que o CSS não conhecia; aqui há CSS que marcação nenhuma alcança. As duas
 * passam por qualquer suíte verde, porque nas duas nada quebra — só não
 * aparece.
 *
 * ── POR QUE O TESTE É NOS DOIS SENTIDOS ───────────────────────────────────
 *
 * O `test/banner.mjs` já faz essa pergunta para os cosméticos do banner, e por
 * este mesmo motivo. Aqui ela vale para a marca: toda classe de identidade
 * precisa de pelo menos um usuário no corpo, e o `⚔️` não pode voltar.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { partirMarca } from '../app/modules/marca.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/* O corpo começa na `<header class="topbar">`; antes dela é folha de estilo, e
   uma classe citada no CSS não é uma classe usada. */
const CORPO = APP.slice(APP.indexOf('<header class="topbar"'));

export function suite() {
  const s = criarSuite('marca');

  /* --- a marca é do pack, não nossa ------------------------------------- */

  s.teste('a marca é partida na última maiúscula interna', () => {
    igual(partirMarca('PokéArena').um, 'Poké', 'a primeira peça saiu errada');
    igual(partirMarca('PokéArena').dois, 'Arena', 'a segunda peça saiu errada');
  });

  s.teste('nome de uma palavra só continua desenhando', () => {
    const r = partirMarca('Coliseu');
    igual(r.um, 'Coliseu', 'o nome simples não voltou inteiro na primeira peça');
    igual(r.dois, '', 'o nome simples inventou uma segunda peça');
    /* Nada pode sumir: a soma das peças é sempre o nome de volta. */
    for (const n of ['PokéArena', 'Coliseu', 'A', '', 'ArenaDeFogo'])
      igual(partirMarca(n).um + partirMarca(n).dois, n, `a marca "${n}" perdeu letra ao ser partida`);
  });

  /* O identificador da franquia não pode voltar para dentro do app: é a regra
     do `CLAUDE.md` e o `test/conteudo.mjs` guarda a outra ponta dela. */
  s.teste('o nome da marca não está escrito no HTML', () => {
    ok(!/<i>Poké<\/i>/.test(CORPO),
      'o nome da franquia foi escrito à mão no letrado, fora do ContentPack');
  });

  /* --- e a identidade alcança a tela ------------------------------------ */

  /* A lista é de pares classe/onde-ela-deveria-aparecer, para que uma regra
     nova de identidade tenha de ser acrescentada aqui de propósito. */
  const IDENTIDADE = [
    ['letrado',   'o nome desenhado da marca'],
    ['pokemark',  'a pokébola cyber ao lado do nome'],
    ['hero-art',  'a arte de fundo da tela de entrada'],
    ['hero-mark', 'o letrado grande no alto do Início'],
  ];
  for (const [cls, oque] of IDENTIDADE) {
    s.teste(`${oque} aparece no corpo, e não só no CSS`, () => {
      ok(new RegExp(`^\\.[\\w-]*${cls}[\\s.{,:]`, 'm').test(APP),
        `a regra de \`.${cls}\` sumiu do CSS`);
      ok(new RegExp(`class="[^"]*\\b${cls}\\b`).test(CORPO),
        `\`.${cls}\` tem desenho no CSS e nenhum elemento no corpo: ${oque} não existe na tela`);
    });
  }

  s.teste('a topbar mostra a marca, e não um emoji de espadas', () => {
    const brand = CORPO.match(/<div class="brand">[\s\S]*?<\/div>/);
    ok(brand, 'a `.brand` sumiu da topbar');
    ok(!/⚔️/.test(brand[0]), `a marca ainda é um emoji: ${brand[0]}`);
    ok(/class="letrado/.test(brand[0]), 'a topbar não usa o letrado da marca');
    ok(/class="pokemark"/.test(brand[0]), 'a pokébola ao lado do nome não voltou');
  });

  return s;
}
