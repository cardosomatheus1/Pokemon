/* O ELENCO DE UM ESTÁGIO (bloco A1, §7.22.4, camada 0).
 *
 * Fronteira: entra um pack, um bioma e um estágio; sai QUEM aparece nas dez
 * waves. Puro, sem DOM, sem estado e sem tema.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **O elenco não é escrito. Ele é DERIVADO.**
 *
 * Onze biomas × quatro estágios são quarenta e quatro listas. Escritas à mão,
 * seriam quarenta e quatro lugares para desatualizar no dia em que alguém
 * corrigir um tipo, e quarenta e quatro para reescrever quando a geração
 * seguinte chegar. É o mesmo raciocínio que o `bioma.mjs` já registra sobre
 * derivar o habitat do tipo, aplicado um andar acima.
 *
 * ── O CHEFE É A EVOLUÇÃO DO MOB, E ISSO NÃO É ESTÉTICA ───────────────────
 *
 * O dono descreveu o estágio 1 de mata assim, de cabeça e antes de qualquer
 * conta: quatro larvas e casulos nas nove primeiras waves, e as duas formas
 * aladas deles na décima. Ao rodar a derivação, ela devolveu **exatamente
 * aquilo**.
 *
 * Isso não é coincidência simpática: é o dado do pack já dizendo a mesma coisa
 * que a intuição dele. E é o que faz a regra valer três coisas de uma vez:
 *
 *     DERIVÁVEL   sai do pack; acrescentar geração é acrescentar espécies
 *     ENSINA      o jogador aprende a linha evolutiva LUTANDO contra ela
 *     ESCALA      o chefe é mais forte sem número inventado — ele É mais forte
 *
 * A terceira é a que dispensa calibração: não existe uma tabela de "força do
 * chefe" para alguém desequilibrar sem querer.
 *
 * ── E EXISTE UM RESERVA, PORQUE NEM TODO ESTÁGIO TEM EVOLUÇÃO ────────────
 *
 * O estágio 4 só aceita as duas faixas mais raras, e ali muita linha já
 * terminou — a evolução do que mora lá ou não existe, ou não mora naquele
 * bioma. Sem reserva, esses estágios ficariam sem chefe, e a décima wave
 * deixaria de acontecer justamente onde ela mais importa.
 *
 * O reserva é o mais forte que sobrou do próprio estágio. Ele NÃO é o caso
 * comum, e o teste exige que a maioria continue sendo evolução de verdade:
 *
 *   > Uma exceção sem teto deixa de ser exceção e vira a regra, calada.
 */

import { elencoDoBioma } from './bioma.mjs';
import { faixasDoEstagio, ESTAGIOS_POR_BIOMA } from './estagios.mjs';
import { saidasDe } from './evolucao.mjs';

/* Todo mundo do estágio, na ordem em que o cartão da tela de escolha desenha:
   os comuns primeiro, os chefes por último e destacados. Uma função só para os
   três lugares que precisam da lista inteira — o cartão, o sorteio da wave e a
   exclusão dos estágios anteriores — porque duas montagens da mesma lista são o
   começo de duas listas. */
export const todosDoEstagio = e => [...(e?.comuns ?? []), ...(e?.chefes ?? [])];

export const COMUNS_POR_ESTAGIO = 4;
export const CHEFES_POR_ESTAGIO = 2;

/* ── POR QUE OS COMUNS SÃO OS MAIS FRACOS DA FAIXA ────────────────────────
 *
 * `elencoDoBioma` já devolve ordenado por força crescente, e pegar do começo é
 * o que deixa espaço acima para o chefe existir. Pegar os mais fortes daria um
 * estágio onde o mob é páreo do chefe, e a décima wave não teria degrau.
 *
 * E há uma consequência boa de graça: o estágio 1 fica cheio de bicho de
 * começo de linha, que é justamente o que o jogador precisa ver primeiro. */
const dentroDaFaixa = (elenco, estagio) => {
  const faixas = faixasDoEstagio(estagio);
  return elenco.filter(x => faixas.includes(x.raridade));
};

/* ── DESCER É VER OUTRA COISA, E NÃO A MESMA COM OUTRO NÚMERO ─────────────
 *
 * A primeira versão pegava "os quatro mais fracos da faixa", e o teste reprovou
 * na hora: as faixas do estágio 2 CONTÊM as do 1, então os quatro mais fracos
 * eram os mesmos quatro, e os dois estágios devolviam o mesmo elenco.
 *
 * Um estágio que mostra o que o anterior já mostrou não é profundidade — é o
 * mesmo lugar cobrando mais nível para entrar.
 *
 * A regra que conserta estava na frase do dono, e eu tinha lido por cima:
 *
 *   > o estágio 2 libera **MAIS quatro** criaturas, e dois chefes finais
 *
 * (A frase dele está inteira na L-143; aqui ela vem parafraseada de propósito —
 *  o original nomeia a franquia, e o motor não pode citá-la nem em comentário.
 *  O portão `conteudo` reprovou a primeira versão deste bloco por isso, pela
 *  SEXTA vez no projeto, e ele está certo: comentário conta.)
 *
 * MAIS quatro. Não os mesmos quatro numa faixa maior. Então cada estágio pula
 * quem os anteriores já usaram, e a escada do bioma vira uma fila de rostos
 * novos em vez de uma lista que cresce pela ponta. */
/* ── O ÚLTIMO DEGRAU GIRA A LISTA EM VEZ DE ABRIR A FAIXA ─────────────────
 *
 * Uma versão anterior recuava para o BIOMA INTEIRO quando a faixa acabava, e o
 * teste reprovou com a frase certa: um comum entrou no estágio 4, que só aceita
 * as duas faixas mais raras.
 *
 *   > A faixa não é uma preferência interna: é o que a tela do estágio PROMETE
 *   > ao jogador antes de ele gastar as horas. Quebrá-la para caber é fazer a
 *   > prévia mentir com números corretos — exatamente o que o `estagios.mjs` já
 *   > registra sobre inverter a ordem das raridades.
 *
 * Girar cede coisa mais barata: os mesmos rostos, em outra ordem, produzindo
 * outro recorte de quatro. A faixa continua valendo. */
const girar = (lista, n) => {
  if (!lista.length) return lista;
  const d = ((n - 1) * COMUNS_POR_ESTAGIO) % lista.length;
  return [...lista.slice(d), ...lista.slice(0, d)];
};

function usadosAntes(pack, biomaId, estagio) {
  const s = new Set();
  for (let n = 1; n < estagio; n++)
    for (const x of todosDoEstagio(elencoDoEstagio(pack, biomaId, n))) s.add(x.dex);
  return s;
}

/* ── MONTAR UM ELENCO A PARTIR DE DUAS LISTAS, OU DIZER QUE NÃO DÁ ────────
 *
 * Duas listas, e não uma, porque as duas perguntas têm respostas diferentes
 * quando o bioma fica magro:
 *
 *     poolComuns   quem pode ser MOB — aqui rosto repetido é ruim
 *     poolChefes   quem pode ser CHEFE — aqui repetir o apex do bioma é OK
 *
 * Devolve `null` em vez de meio elenco. Um estágio com um chefe só, ou com
 * nenhum, é uma décima wave que não acontece — e ela é o clímax da run.
 *
 *   > Meia resposta a quem pediu uma lista completa é pior que recusa: a
 *   > recusa tem para onde ir, a meia resposta segue adiante. */
function montar(pack, poolComuns, poolChefes = poolComuns) {
  const comuns = poolComuns.slice(0, COMUNS_POR_ESTAGIO);
  if (comuns.length < COMUNS_POR_ESTAGIO) return null;
  const jaUsado = new Set(comuns.map(x => x.dex));
  const teto = Math.max(...comuns.map(x => x.forca));

  const chefes = [];
  const juntar = x => {
    if (!x || chefes.some(c => c.dex === x.dex)) return;
    /* Chefe abaixo do mob faria a nona wave ser mais dura que a décima, e o
       jogador leria isso como defeito — com razão.

       E esta linha SOZINHA já exclui todo comum: `teto` é o máximo da força
       deles, então nenhum passa por um `<=`. Havia uma segunda guarda
       (`jaUsado.has`) fazendo o mesmo trabalho, e o Q2 a denunciou do jeito
       mais claro possível — a sabotagem que a apagava passava VERDE.

         > Guarda que nenhuma sabotagem consegue reprovar não está guardando
         > nada. Ou o teste não olha, ou a guarda é sombra de outra. */
    if (x.forca <= teto) return;
    chefes.push(x);
  };

  /* Primeiro os que são EVOLUÇÃO de um comum: é a regra do bloco, e o reserva
     abaixo só existe para onde ela não alcança. */
  const porDex = new Map(poolChefes.map(x => [x.dex, x]));
  for (const c of comuns)
    for (const aresta of saidasDe(pack, c.dex)) juntar(porDex.get(aresta.para));
  /* Do mais forte para o mais fraco: se a linha se abre em três, o chefe é o
     que dá mais trabalho — senão a décima wave seria escolhida por ordem de
     índice, que é uma decisão que ninguém tomou. */
  chefes.sort((a, b) => b.forca - a.forca);

  /* O RESERVA: o mais forte que sobrou. No fundo do bioma ele é o normal, e
     não a exceção — ali muita linha evolutiva já terminou. */
  for (const x of [...poolChefes].sort((a, b) => b.forca - a.forca)) {
    if (chefes.length >= CHEFES_POR_ESTAGIO) break;
    juntar(x);
  }

  /* MAIOR OU IGUAL, e não igual. Quatro comuns podem produzir TRÊS candidatos
     a chefe — basta uma linha que se abre, ou um comum sem evolução ao lado de
     três que têm. Exigindo exatamente dois, o estágio inteiro voltava `null` e
     caía no reserva por ter candidatos DEMAIS.

       > "Exatamente N" onde o produtor pode passar de N é uma recusa escrita
       > como conferência. E ela reprova o caso BOM. */
  return chefes.length >= CHEFES_POR_ESTAGIO
    ? { comuns, chefes: chefes.slice(0, CHEFES_POR_ESTAGIO) } : null;
}
export function elencoDoEstagio(pack, biomaId, estagio) {
  /* Apertado para dentro da escada, como o `faixasDoEstagio` já faz. Duas
     regras diferentes para o mesmo número seriam duas verdades sobre ele. */
  const n = Math.min(ESTAGIOS_POR_BIOMA, Math.max(1, Math.floor(Number(estagio) || 1)));
  const faixa = dentroDaFaixa(elencoDoBioma(pack, biomaId), n);
  const antes = usadosAntes(pack, biomaId, n);
  const frescoFaixa = faixa.filter(x => !antes.has(x.dex));

  /* ── E QUANDO O FUNDO DO BIOMA FICA SEM ROSTO NOVO ──────────────────────
   *
   * O estágio 4 só aceita as duas faixas mais raras, e depois de três estágios
   * consumirem dezoito espécies sobram quatro — não dá 4 + 2. Medido na mata:
   * o fundo ficava LITERALMENTE SEM CHEFE, e o teste apontou.
   *
   * Aí a regra afrouxa numa direção só: o estágio volta a olhar a FAIXA
   * inteira, inclusive quem já apareceu antes. E o resultado é melhor do que
   * a regra que ele substitui — o fundo do bioma passa a ser guardado pelas
   * DUAS CRIATURAS MAIS FORTES QUE MORAM ALI.
   *
   *   > "Repetir um rosto" e "não ter clímax" não são o mesmo tamanho de
   *   > problema, e a escolha entre os dois não podia ficar implícita. */
  /* ── A ESCADA DE RECUO, E CADA DEGRAU CEDE UMA COISA SÓ ────────────────
   *
   *   1  rosto novo, chefe da faixa           o caso bom
   *   2  rosto novo, chefe da faixa toda    cede o rosto novo do CHEFE
   *
   * O chefe NUNCA sai da faixa do estagio. Uma versao anterior deixava, e o
   * teste devolveu um lendario guardando o estagio 2 — que quebra a promessa da
   * prévia e o §8.12 ao mesmo tempo: lendario nao e conteudo de rotina.
   *   4  faixa GIRADA, com repetição        cede o rosto novo
   *   5  faixa em ordem, com repetição      cede a variedade — o último recurso
   *
   * O giro vem ANTES da ordem, e essa ordem entre eles importa: girado dá
   * elencos distintos onde o bioma é magro; em ordem dá o unico recorte possivel
   * onde a faixa tem teto baixo — na mata funda, os quatro mais fracos sao os
   * unicos que deixam alguem acima deles para ser chefe. Um dos dois resolve
   * cada caso, e nenhum resolve os dois.
   *
   * A ordem não é arbitrária: **repetir um MOB é pior que repetir um CHEFE**.
   * O mob aparece nove waves seguidas; o chefe aparece uma vez, e ser o apex do
   * bioma duas vezes é quase um traço de identidade do lugar. */
  return montar(pack, frescoFaixa)
      ?? montar(pack, frescoFaixa, faixa)
      ?? montar(pack, girar(faixa, n), faixa)
      ?? montar(pack, faixa)
      ?? { comuns: frescoFaixa.slice(0, COMUNS_POR_ESTAGIO), chefes: [] };
}

/* ── QUANTOS ESTÁGIOS UM BIOMA CONSEGUE SUSTENTAR DE VERDADE ──────────────
 *
 * O `ESTAGIOS_POR_BIOMA` promete quatro. Quatro estágios pedem VINTE E QUATRO
 * vagas de elenco, e nem todo bioma tem gente para isso: medido, o vulcão tem
 * catorze espécies, e nenhuma na faixa "raro" — as faixas do estágio 2 acabam
 * sendo as mesmas do 1.
 *
 * Esta função responde a pergunta com o dado, e não com a promessa:
 *
 *   > Um bioma raso não é um defeito do algoritmo. É um fato do conteúdo, e
 *   > esconder um fato do conteúdo dentro de uma repetição silenciosa é como
 *   > o número de um documento envelhece — sem ninguém notar.
 *
 * Ela devolve até onde os elencos ainda são DISTINTOS. O que a tela faz com
 * isso é do bloco A3; aqui o motor só se recusa a mentir. Ver a L-143. */
export function estagiosDoBioma(pack, biomaId) {
  const vistos = new Set();
  let n = 0;
  for (let i = 1; i <= ESTAGIOS_POR_BIOMA; i++) {
    const e = elencoDoEstagio(pack, biomaId, i);
    if (e.comuns.length < COMUNS_POR_ESTAGIO || e.chefes.length < CHEFES_POR_ESTAGIO) break;
    const chave = todosDoEstagio(e).map(x => x.dex).sort((a, b) => a - b).join(',');
    if (vistos.has(chave)) break;
    vistos.add(chave);
    n = i;
  }
  return n;
}
