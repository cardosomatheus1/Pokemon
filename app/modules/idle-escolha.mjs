/* O QUE A TELA DE ESCOLHA PRECISA RESPONDER (camada 0).
 *
 * Puro: sem DOM, sem relógio, sem `innerHTML`. Ele decide O QUE se lê; as telas
 * decidem como pintar. É a mesma linha que o `avanco-foco.mjs` traçou no bloco
 * anterior, e pelo mesmo motivo — quatro defeitos plantados escaparam por a
 * resposta morar dentro de uma string de HTML.
 *
 * ── DE ONDE ISTO VEIO — a L-164, e ela é o dono reprovando a tela ────────
 *
 *   > "olha o último vídeo do nosso layout pra pré-selecionar: uma loucura,
 *   >  bagunça total, muito feio e confuso"
 *
 * E, sobre a referência que ele mandou:
 *
 *   > "o cara só clica, já informa o nível, quais criaturas tem lá e etc."
 *
 * São as duas metades da mesma queixa. A tela mostra DEMAIS onde a escolha é
 * simples (o cartão da criatura) e DE MENOS onde a escolha é difícil (a rota).
 *
 * ── O CARTÃO: QUATRO PERGUNTAS, E O RESTO É FICHA ────────────────────────
 *
 * O cartão da criatura acumulou dez informações em 90 px — retrato, nome,
 * nível, energia, XP, ATQ/DEF/VEL, potencial, natureza, foco e evolução. A
 * causa é acúmulo: cada bloco acrescentou um dado porque cabia, e ninguém
 * perguntou o que a tela precisa responder NA HORA DE ESCOLHER.
 *
 *     QUEM É        a arte e o nome
 *     PODE IR?      a energia contra o custo, e onde ela já está
 *     O QUE SOMA    o nível, o foco e a FORMA
 *     QUANDO MUDA   o selo da evolução
 *
 * O resto é ficha, e ficha se consulta — não se atravessa onze vezes seguidas.
 *
 * ── AS DUAS QUEIXAS SÃO VERDADEIRAS, E A CONTRADIÇÃO É MINHA (1.27f) ─────
 *
 * O dono reprovou este mesmo cartão duas vezes, em sentidos opostos:
 *
 *   04/09  "uma loucura, bagunça total, muito feio e confuso"
 *   10/09  "você removeu as informações de stats, lv que evolui etc."
 *
 * A primeira me fez cortar de dez campos para dois e esconder o resto atrás de
 * um botão. Foi a resposta errada à queixa certa:
 *
 *   > O problema nunca foi a QUANTIDADE de informação: era a FORMA dela — dez
 *   > rótulos de texto empilhados em 90 px, cada um numa linha própria.
 *   > **Esconder não é organizar. Organizar é o que eu não tinha feito.**
 *
 * `forma` e `evolucao` voltam ao compacto porque são as duas perguntas que a
 * ESCOLHA faz e a ficha não respondia a tempo. O que fica só na ficha é o que
 * não decide nada agora: `xp` é progresso dentro do nível, e `potencial` e
 * `natureza` não mudam entre uma run e a seguinte.
 *
 * A dobra continua existindo — `compacto.length < ficha.length` tem teste. O
 * que mudou é o critério: ela dobra o que se CONSULTA, e não o que se lê.
 *
 * ── E NADA É APAGADO ─────────────────────────────────────────────────────
 *
 * O dono pediu a forma, o potencial e a natureza em blocos anteriores, e todos
 * continuam a um clique. **Esconder e apagar não são a mesma coisa**, e a
 * diferença é exatamente o que a regra de escopo deste projeto protege: o modo
 * `ficha` devolve a tela de antes, inteira.
 *
 * ── A ROTA: A SALA RESPONDE ANTES DO CLIQUE ──────────────────────────────
 *
 * Hoje a rota é um CHIP com o nome do bioma. O nome não diz quem mora lá nem o
 * que ele pede — o jogador tem de clicar nos onze para descobrir, e depois
 * lembrar. A referência responde as três coisas de uma vez, e sem clique
 * nenhum: quem mora, que nível pede, e quantas opções existem.
 *
 *   > A diferença entre um mapa e uma lista de botões é que o mapa diz o que
 *   > há em cada lugar.
 */
import { elencoDoEstagio } from '../../engine/elenco-estagio.mjs';
import { nivelDoEstagio, estagioMaximo } from '../../engine/estagios.mjs';

/* ── OS DOIS MODOS DO CARTÃO ──────────────────────────────────────────────
 *
 * `compacto` é o padrão porque é o que a ESCOLHA pede. `ficha` é a tela de
 * antes, inteira — e ela existe para que a redução seja uma dobra e não uma
 * perda. */
export const MODOS = ['compacto', 'ficha'];
export const MODO_PADRAO = 'compacto';

/* ── O QUE CADA MODO MOSTRA ───────────────────────────────────────────────
 *
 * Uma tabela e não um punhado de `if`: quem lê descobre a regra inteira num
 * lugar, e um bloco que quiser acrescentar um dado ao cartão tem de DECIDIR em
 * qual dos dois ele entra. Foi a ausência dessa decisão que produziu os dez.
 *
 * `nome`, `arte` e `energia` não aparecem aqui de propósito: eles são o cartão.
 * Um cartão sem eles não é um cartão reduzido — é outra coisa. */
const CAMPOS = {
  compacto: ['nivel', 'foco', 'forma', 'evolucao'],
  ficha:    ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao'],
};

export const modoValido = m => MODOS.includes(m) ? m : MODO_PADRAO;
export const camposDoCartao = modo => [...CAMPOS[modoValido(modo)]];
export const mostra = (modo, campo) => camposDoCartao(modo).includes(campo);

/* ── O NÍVEL APARECE UMA VEZ SÓ (1.27f) ───────────────────────────────────
 *
 * A barra de XP já traz `NV 36 · 58%` na frente dela. Com as duas, o número
 * saía repetido a quatro pixels de si mesmo — e repetição num cartão de 104 px
 * lê como erro de montagem, não como ênfase.
 *
 * Na FICHA manda a barra, que diz mais (o nível e o quanto falta para o
 * próximo). No COMPACTO manda esta linha, que é o que sobra.
 *
 * Isto é uma DECISÃO, e por isso mora aqui e não dentro da `innerHTML`: colada
 * ao HTML ela viraria um mutante de navegador de ~30 s; aqui é um de ~0,1 s.
 * Ver `CLAUDE.md`, "Lógica fora da tela é decisão de CUSTO". */
export const mostraNivelSolto = modo => mostra(modo, 'nivel') && !mostra(modo, 'xp');

/* ── O RECORTE DA EVOLUÇÃO — A FICHA CURTA DO SELO (1.27f) ────────────────
 *
 * `oQueFalta` devolve a frase inteira: `"nível 32"`, `"Pedra do Fogo"`,
 * `"nível 16 e Pedra da Água"`, `"vínculo 40"`. Ela é a frase certa para o
 * `title` — o D-067 pede que a recusa diga O QUE consertar —, e é longa demais
 * para os 104 px do cartão: `"evolui com nível 32"` tem 19 caracteres e quebra
 * em TRÊS linhas em Press Start 2P, deixando o selo maior que o retrato.
 *
 * Então o selo recebe o recorte e o `title` continua com a frase por extenso.
 * O que mudou não é o que ele diz: é que ele deixou de gritar.
 *
 *     "nível 32"                 ->  "NV 32"
 *     "vínculo 40"               ->  "♥ 40"
 *     "nível 20 e vínculo 30"    ->  "NV 20 ♥ 30"
 *     "nível 16 e Pedra da Água" ->  "NV 16 ◆"
 *     "Pedra do Fogo"            ->  "Pedra do Fogo"   <- POR EXTENSO
 *     ""  ou  null               ->  ""
 *     algo que este código não lê ->  a frase inteira
 *
 * ── A REGRA DO LOSANGO, E ELA TEM TESTE ─────────────────────────────────
 *
 * `◆` só substitui um requisito quando há um NÚMERO ao lado. Ali a manchete é
 * o número, e o símbolo é só o aviso de que falta mais uma coisa. **Sozinho, o
 * requisito volta por extenso.**
 *
 *   > A primeira versão devolvia `◆` em todos os casos, e o custo apareceu no
 *   > teste: uma frase que este código não sabe ler — um requisito que algum
 *   > bloco futuro invente — virava um losango mudo, indistinguível de "falta
 *   > uma pedra".
 *   >
 *   > **Um símbolo que serve para tudo não diz nada.**
 *
 * ── E POR QUE ISTO MORA AQUI, E NÃO DENTRO DA `innerHTML` ───────────────
 *
 * Seis defeitos plantados escaparam do portão Q2 num bloco só, todos por a
 * decisão morar colada ao HTML. Mutante de navegador custa ~30 s; o mesmo
 * mutante num módulo puro custa ~0,1 s. Ver `CLAUDE.md`, e os exemplos em
 * `folha-viva.mjs` e `avanco-clima.mjs`. */
const REQUISITOS = [
  { palavra: 'nivel',   escrever: n => `NV ${n}` },
  { palavra: 'vinculo', escrever: n => `♥ ${n}` },
];

/* Sem expressão regular de propósito, e a razão é dupla. A primeira é leitura:
   `"palavra número"` é o formato inteiro, e duas linhas de `split` dizem isso
   mais claramente que `/^n[íi]vel\s+(\d+)$/i`. A segunda está registrada no
   D-105 — o `test/modulos.mjs` mascara texto sem entender literal de expressão
   regular, e o `$` de uma âncora volta como uso do `$` do `dom.mjs`. */
const semAcento = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const soDigitos = t => t.length > 0 && [...t].every(c => c >= '0' && c <= '9');

function recortarParte(parte) {
  const p = parte.split(/\s+/);
  if (p.length !== 2 || !soDigitos(p[1])) return null;
  const r = REQUISITOS.find(x => x.palavra === semAcento(p[0]));
  return r ? r.escrever(p[1]) : null;
}

export function resumoDaEvolucao(falta) {
  const frase = typeof falta === 'string' ? falta.trim() : '';
  if (!frase) return '';

  /* A frase é montada com `' e '` no `oQueFalta`, e é por ali que ela se
     desmonta. Nada de tentar entender a frase inteira de uma vez: cada parte
     se reconhece sozinha, ou não se reconhece. */
  const partes = frase.split(' e ').map(p => p.trim()).filter(Boolean);
  const numeros = [];
  let temItem = false;
  for (const parte of partes) {
    const achou = recortarParte(parte);
    if (achou) numeros.push(achou); else temItem = true;
  }

  /* NENHUM NÚMERO — a frase volta inteira. É o caso da pedra sozinha, e é
     também o caso do requisito que este código não conhece: nos dois, o
     losango seria mudo e a frase por extenso é o que diz alguma coisa. */
  if (!numeros.length) return frase;

  return temItem ? [...numeros, '◆'].join(' ') : numeros.join(' ');
}

/* ── A SALA: O QUE UMA ROTA DIZ DE SI ─────────────────────────────────────
 *
 * `moradores` são os dex do elenco do estágio, na ordem em que o motor os
 * devolve — a mesma ordem que a prévia usa, para as duas telas não discordarem
 * sobre quem mora ali.
 *
 * `quantos` é o TOTAL, e `moradores` é o recorte que cabe no cartão: mostrar
 * três de seis e calar sobre isso faria o jogador achar que o bioma tem três.
 *
 * ── O ESTÁGIO MOSTRADO É O QUE ELE PODE ENTRAR ──────────────────────────
 *
 * E não o primeiro: um jogador de nível 40 lendo "pede nível 5" em todas as
 * onze rotas não recebe informação nenhuma. Ele lê o estágio mais fundo que a
 * coleção dele abre, que é a pergunta que ele realmente faz — *"até onde eu
 * consigo ir aqui?"*.
 *
 * Quem não abriu nada ainda vê o estágio 1, que é onde ele está. */
export const MOSTRA_ATE = 4;

export function resumoDaRota(pack, biomaId, criaturas = [], { ate = MOSTRA_ATE, preferencias = null } = {}) {
  const estagio = Math.max(1, estagioMaximo(criaturas ?? []) || 1);
  /* O ELENCO VEM EM DOIS BALDES — `comuns` e `chefes` —, e a ordem entre eles
     é informação: o chefe é o fundo do bioma, e ele fecha a lista na prévia
     também. Achatar na ordem em que o motor os entrega é o que mantém as duas
     telas contando a mesma história sobre o mesmo lugar. */
  /* COM O PERÍODO, E SÓ COM ELE (1.33). Quem monta as preferências da prévia
     é o `preferenciasDaPrevia`, que cala sobre o clima — ele é oculto até a run
     começar (L-177). */
  const elenco = elencoDoEstagio(pack, biomaId, estagio, preferencias) ?? {};
  const dex = [...(elenco.comuns ?? []), ...(elenco.chefes ?? [])]
    .map(x => x?.dex).filter(d => Number.isInteger(d));
  /* ── O QUE DIFERE ENTRE AS ROTAS, e o nível NÃO difere ────────────────
   *
   * Lido na proporção real, o primeiro desenho da sala mostrou onze cartões
   * dizendo exatamente "pede nv 31". E tinha de dizer: `nivelDoEstagio` é do
   * ESTÁGIO, e o estágio é da COLEÇÃO — não do lugar. O número é verdadeiro e
   * é igual nos onze, então ele não ajuda a escolher nada.
   *
   *   > Eu escrevi o aviso contra isso no comentário deste arquivo e construí
   *   > o mesmo defeito com outro número. Informação repetida em todas as
   *   > opções não é informação: é ruído com aparência de dado.
   *
   * O que DIFERE é quem mora e de que faixa eles são. O nível continua sendo
   * devolvido — ele é verdade e a tela o mostra UMA vez, no cabeçalho da
   * seção, onde uma frase serve as onze. */
  const faixas = [];
  for (const x of [...(elenco.comuns ?? []), ...(elenco.chefes ?? [])])
    if (x?.raridade && !faixas.includes(x.raridade)) faixas.push(x.raridade);

  return {
    estagio,
    nivelPedido: nivelDoEstagio(estagio),
    quantos: dex.length,
    moradores: dex.slice(0, Math.max(0, ate)),
    /* QUANTOS FICARAM DE FORA, para o cartão poder dizer "+N" em vez de
       simplesmente cortar. Cortar em silêncio é mentir por omissão. */
    resto: Math.max(0, dex.length - Math.max(0, ate)),
    /* AS FAIXAS na ordem em que o motor as entrega — do comum ao raro. É o que
       responde "vale a pena vir aqui?", e é a única linha do cartão que muda
       de rota para rota. */
    faixas,
    /* QUEM ESTÁ AQUI SÓ PORQUE É NOITE (1.33). O cartão marca esses rostos: é
       o efeito VISÍVEL que o dono pede, e é honesto sobre ser condição — de dia
       eles não estão ali. */
    noturnos: (elenco.trocas ?? []).filter(t => t.fonte === 'noite').map(t => t.entrou),
  };
}

/* ── ONDE O MODO É GUARDADO ───────────────────────────────────────────────
 *
 * `localStorage`, e não o estado do jogo: isto é PREFERÊNCIA DE LEITURA, e não
 * dado do jogador. Guardá-lo em `ar_idle` faria uma escolha de tela viajar
 * junto com a coleção — e a coleção tem formato versionado, migração e teste.
 * Uma preferência que quebra uma migração é o pior negócio possível.
 *
 * A leitura é TOLERANTE pelo mesmo motivo do `carregar`: `localStorage` está a
 * um F12 de distância, e uma string inventada não pode deixar o cartão sem
 * campo nenhum. Ela cai no padrão, que é o compacto. */
const CHAVE_DO_MODO = 'ar_cartao';

export function modoGuardado(deposito = globalThis.localStorage) {
  try { return modoValido(deposito?.getItem(CHAVE_DO_MODO)); }
  catch { return MODO_PADRAO; }
}

export function guardarModo(modo, deposito = globalThis.localStorage) {
  const bom = modoValido(modo);
  try { deposito?.setItem(CHAVE_DO_MODO, bom); } catch { /* aba privada: só não guarda */ }
  return bom;
}

/* O outro modo, para o botão que alterna. Uma função e não um `?:` na tela:
   com um terceiro modo um dia, o botão não precisa saber contar. */
export const proximoModo = modo =>
  MODOS[(MODOS.indexOf(modoValido(modo)) + 1) % MODOS.length];
