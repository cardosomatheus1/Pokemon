/* A FICHA DE UMA ESPÉCIE — as perguntas, sem o desenho (bloco 1.20, camada 0).
 *
 * ── POR QUE ESTA NÃO É UMA CÓPIA ─────────────────────────────────────────
 *
 * A referência é a Pokédex do Black/White, que o dono mandou. A regra do
 * `CLAUDE.md` sobre copiar é explícita: *referência entra como matéria-prima, e
 * sai como coisa nossa — com uma diferença que se possa NOMEAR.*
 *
 * A diferença, em uma frase:
 *
 *     A Pokédex do cartucho diz o que a criatura É.
 *     A nossa diz também ONDE ELA MORA E COMO PEGÁ-LA.
 *
 * Peso, altura e o texto de enciclopédia não mudam decisão nenhuma neste jogo.
 * O que muda é *"em que bioma, em que estágio, com que raridade, e quantos
 * fragmentos me faltam"* — e isso é exatamente o que o nosso idle produz e
 * nenhuma Pokédex de cartucho tem.
 *
 * ── E O QUE EU NÃO TENHO, EU NÃO INVENTO ─────────────────────────────────
 *
 * O pack não traz texto de curiosidade, peso nem altura. Eu poderia escrever
 * frases plausíveis; seria a mesma armadilha do ícone errado — parece certo, e
 * ninguém confere o que parece certo. Então a ficha mostra o que o jogo SABE, e
 * o que ele não sabe simplesmente não aparece.
 *
 * ── ONDE ELE MORA ─────────────────────────────────────────────────────────
 *
 * Camada 0: recebe o pack e devolve dados. Sem DOM, sem estado, sem relógio —
 * e por isso a ficha inteira é conferível em milissegundos, sem navegador.
 */
import { linhaDe, estagioDe, saidasDe, entradaDe } from '../../engine/evolucao.mjs';
import { elencoDoBioma } from '../../engine/bioma.mjs';
import { faixasDoEstagio, ESTAGIOS_POR_BIOMA } from '../../engine/estagios.mjs';

/* Os seis stats do pack, na ordem canônica. O nome curto é o que cabe na barra;
   o longo é o que o `title` explica — e a explicação é regra do dono: onde há um
   número, diz-se o que ele é. */
export const STATS = [
  { i: 0, curto: 'HP',  longo: 'pontos de vida' },
  { i: 1, curto: 'ATQ', longo: 'ataque físico' },
  { i: 2, curto: 'DEF', longo: 'defesa física' },
  { i: 3, curto: 'ESP', longo: 'ataque especial' },
  { i: 4, curto: 'DEF·E', longo: 'defesa especial' },
  { i: 5, curto: 'VEL', longo: 'velocidade — quem age primeiro' },
];

/* O teto usado para desenhar a barra. Não é 255 (o teto teórico da série): é o
   MAIOR valor que existe NESTE pack, porque uma barra em que ninguém passa de
   60% desperdiça metade da régua e não distingue nada. */
export function tetoDeStat(pack) {
  let maior = 1;
  for (const e of pack?.especies ?? [])
    for (const v of e.s ?? []) if (v > maior) maior = v;
  return maior;
}

export const somaDeStats = e => (e?.s ?? []).reduce((a, b) => a + b, 0);

/* ── ONDE ELA MORA ────────────────────────────────────────────────────────
 *
 * Percorre os biomas e devolve em quais a espécie aparece, com que raridade, e
 * a partir de que estágio — porque a raridade decide o estágio (uma `raro` não
 * existe no estágio 1). É a informação que o cartucho não tem e o nosso jogo
 * precisa: sem ela, "onde acho esse bicho" não tem resposta em lugar nenhum. */
export function ondeMora(pack, dex) {
  const fora = [];
  for (const b of pack?.biomas ?? []) {
    const achado = (elencoDoBioma(pack, b.id) ?? []).find(x => x.dex === dex);
    if (!achado) continue;
    /* O primeiro estágio em que a faixa dela cabe. */
    let desde = null;
    for (let s = 1; s <= ESTAGIOS_POR_BIOMA; s++)
      if (faixasDoEstagio(s).includes(achado.raridade)) { desde = s; break; }
    fora.push({ bioma: b.id, rotulo: b.rotulo, raridade: achado.raridade, desde });
  }
  return fora;
}

/* ── A LINHA EVOLUTIVA, COM A EXIGÊNCIA ENTRE OS ELOS ─────────────────────
 *
 * `linhaDe` já devolve a corrente inteira; o que falta é o que se pede em cada
 * passo. Sem a exigência, a linha vira enfeite: o jogador vê que evolui e não
 * sabe COMO, que é a única pergunta que ele tem. */
export function linhaComExigencia(pack, dex) {
  const linha = linhaDe(pack, dex) ?? [];
  return linha.map((d, i) => {
    const proximo = linha[i + 1];
    const aresta = proximo
      ? (saidasDe(pack, d) ?? []).find(a => a.para === proximo)
      : null;
    return { dex: d, estagio: estagioDe(pack, d), exige: aresta?.exige ?? null };
  });
}

/* Como a exigência se lê. `exige` é um objeto de condições — nível, item, o que
   o pack declarar —, e a tela não pode adivinhar a forma dele. */
export function falaDaExigencia(exige, nomeDoItem = id => id) {
  if (!exige) return null;
  const partes = [];
  if (exige.nivel) partes.push(`nível ${exige.nivel}`);
  if (exige.item) partes.push(nomeDoItem(exige.item));
  if (exige.vinculo) partes.push(`vínculo ${exige.vinculo}`);
  /* Uma condição que este código não conhece NÃO some em silêncio: ela aparece
     com o nome cru. Sumir seria a tela prometer que basta o nível quando o pack
     pede outra coisa — e o jogador farmaria à toa. */
  for (const k of Object.keys(exige))
    if (!['nivel', 'item', 'vinculo'].includes(k)) partes.push(`${k}: ${exige[k]}`);
  return partes.join(' · ');
}

/* ── A BUSCA ──────────────────────────────────────────────────────────────
 *
 * Casa NÚMERO, NOME e TIPO. O número entra porque quem joga há anos pensa em
 * "o 25"; o tipo entra porque a pergunta real muitas vezes é "quais de fogo eu
 * já vi?" — e sem ele a Pokédex responde uma pergunta só.
 *
 * Espécie NÃO VISTA continua na lista, e isso é decisão: a Pokédex existe para
 * mostrar o que FALTA tanto quanto o que se tem. Some da busca por nome, porém,
 * porque procurar pelo nome de algo que você não conhece é impossível — e achar
 * pelo nome revelaria a espécie sem tê-la encontrado. */
const normal = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function filtrar(pack, { busca = '', vistos = null } = {}) {
  const lista = pack?.especies ?? [];
  const q = normal(busca).trim();
  if (!q) return lista;
  const viu = d => !vistos || vistos.has(d);
  const nomes = pack?.tipos?.nomes ?? {};
  return lista.filter(e => {
    if (String(e.dex) === q || String(e.dex).padStart(3, '0') === q) return true;
    const tipos = (e.t ?? []).map(t => normal(nomes[t] ?? t));
    if (tipos.some(t => t.includes(q))) return true;
    /* Nome só casa se já foi vista — ver a nota acima. */
    return viu(e.dex) && normal(e.n).includes(q);
  });
}

/* ── VISTO NÃO É CAPTURADO, E A POKÉDEX PRECISA DIZER OS DOIS ─────────────
 *
 * O fragmento cai no ENCONTRO — então ver é fácil e não custa bola nenhuma. Ter
 * a criatura é outra coisa, e até agora a Pokédex não distinguia as duas: uma
 * espécie encontrada trinta vezes e nunca capturada parecia igual a uma que
 * está na caixa.
 *
 *     Duas conquistas diferentes desenhadas igual é uma conquista perdida.
 *
 * `capturados` sai das criaturas que o jogador TEM — equipe e caixa juntas,
 * porque guardar na caixa não desfaz a captura. */
export const capturados = e =>
  new Set((e?.criaturas ?? []).map(c => Number(c?.dex)).filter(Number.isFinite));

/* ── TER É UMA FORMA DE TER VISTO (1.22, D-075) ───────────────────────────
 *
 * `registro` guarda os fragmentos, e o fragmento cai no ENCONTRO. Só que
 * encontro não é o único caminho até a caixa: **a inicial é dada**, e nunca
 * passou por encontro nenhum. O save do dono mostrava a conta ao contrário —
 *
 *     criaturas   dex 7 (inicial) e dex 37 (captura)
 *     registro    dex 11 e dex 48
 *
 * — e a Pokédex desenhava, para a criatura que ele tem na mão, a linha
 * `007 ? ???` com o selo de "capturada" ao lado. As duas metades da mesma
 * linha se contradizendo.
 *
 * A invariante já estava escrita em `progresso`, logo abaixo: *"Capturados
 * NUNCA passa de vistos"*. Só que era aplicada num `Math.min` sobre o
 * CONTADOR — e um `min` faz o número parar de acusar sem fazer o fato parar de
 * existir.
 *
 *   > **Invariante aplicada só onde ela é contada continua sendo violada onde
 *   > ela é desenhada.**
 *
 * Mora aqui, camada 0, e não dentro da tela: enquanto era uma linha privada de
 * `pokedex.mjs` não havia teste de Node que falasse sobre ela — que é a mesma
 * razão pela qual `itens-nome.mjs` precisou sair de dentro de `pintarBolsa`
 * neste mesmo bloco. */
export const vistosDe = e => {
  const s = new Set(Object.keys(e?.registro ?? {}).map(Number).filter(Number.isFinite));
  for (const d of capturados(e)) s.add(d);
  return s;
};

/* Quanto da lista já foi visto. Duas contagens e não uma: "30 de 146" diz mais
   que "30", e a segunda é o que transforma a Pokédex num objetivo. */
export function progresso(pack, vistos, pegos = null) {
  const total = (pack?.especies ?? []).length;
  const n = vistos ? vistos.size : 0;
  const p = pegos ? pegos.size : 0;
  return {
    vistos: Math.min(n, total), total, pct: total ? (n / total) * 100 : 0,
    /* Capturados NUNCA passa de vistos: quem tem a criatura viu a espécie.
       O `min` existe porque um save adulterado poderia dizer o contrário, e a
       tela não pode desenhar uma barra maior que a outra por causa disso. */
    pegos: Math.min(p, n, total),
    pctPegos: total ? (Math.min(p, n) / total) * 100 : 0,
  };
}
