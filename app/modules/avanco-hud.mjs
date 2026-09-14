/* O QUE A CENA DIZ SOBRE CADA LUTADOR — placa, balão e número (camada 4).
 *
 * Saiu do `avanco-cena.mjs` quando ele passou de 600 linhas, e a divisão é por
 * RESPONSABILIDADE:
 *
 *     avanco-cena    ONDE cada um está e QUAL quadro ele mostra
 *     avanco-hud     O QUE SE LÊ sobre ele — nome, vida, golpe, dano
 *
 * A prova de que a linha está no lugar: nada aqui sabe de posição de mundo,
 * de câmera ou de folha. Tudo entra em coordenadas de TELA, já convertidas.
 *
 * E ela é a metade que o dono cobrou mais vezes — o balão, o número do dano e
 * a barra de vida foram reprovados três vezes cada. Ter isso num arquivo só,
 * com o porquê ao lado, é o que impede a próxima correção de ser procurada em
 * dois lugares.
 */
import { dexURL } from './sprites.mjs';
import { camadaViva } from './vivos.mjs';
/* A conta da separação é geometria pura, e mora com as outras — ver D-081. */
import { separarPontos, pontoLivre, aindaNoAr,
         VIDA_DO_DANO } from './avanco-geometria.mjs';

/* Os elementos vivem aqui, junto de quem os desenha. Eles moravam no
   `avanco-cena.mjs` porque a limpeza estava lá — e a limpeza continua lá, mas
   pedindo a este arquivo em vez de mexer no mapa dele. */
export const placas = new Map();   /* chave -> a plaquinha de nome e vida */
export const baloes = new Map();   /* chave -> o balão do golpe que ele deu */

function placaDe(chave, camada) {
  let el = placas.get(chave);
  if (el) return el;
  el = document.createElement('span');
  el.className = 'avPlacaMob';
  /* NOME, barra, e o NÚMERO do HP — pedido do dono: *"a barra de HP precisa
     ter número de HP"*. A barra responde de relance; o número responde quando
     o jogador decide olhar de perto para saber se a poção vale a pena. */
  el.innerHTML = '<b></b><i><s></s></i><u></u>';
  camada.appendChild(el);
  placas.set(chave, el);
  return el;
}


/* ── O BALÃO DO GOLPE ─────────────────────────────────────────────────────
 *
 * A classe `bubble` é a MESMA da arena, e isso não é economia de CSS: é o
 * jogador reconhecendo o gesto. Ele já viu aquele balão branco de borda escura
 * dizer o nome de um golpe — aqui ele diz a mesma coisa, e não precisa
 * aprender nada.
 *
 * UM balão por mob, reaproveitado. Criar e destruir a cada golpe faria o
 * navegador reanimar a opacidade do zero e o balão piscaria entre dois golpes
 * seguidos. */
export function balao(chave, camada, x, y, golpe, dex) {
  if (!camada || !golpe?.nome) return;
  const texto = golpe.nome;
  let el = baloes.get(chave);
  if (!el) {
    el = document.createElement('div');
    el.className = 'bubble avBubble';
    /* ── O ÍCONE DIZ QUEM FALOU ────────────────────────────────────────
       Pedido do dono: *"é interessante você fazer uma forma de marcar o
       pokémon sendo usado com um ícone pequeno no balão dele"*.

       Com quatro lutadores em cena — dois selvagens, o companheiro, e o
       treinador olhando — um balão solto com o nome de um golpe não diz de
       quem ele saiu. A seta do balão aponta para baixo, e "para baixo" é
       ambíguo quando dois sprites se encostam.

       O ícone é a cara do bicho, e não uma cor: cor exigiria uma legenda, e
       a cara ele já reconhece da Pokédex. */
    el.innerHTML = '<img class="avBalaoQuem" alt=""><span></span>';
    camada.appendChild(el);
    baloes.set(chave, el);
  }
  const arte = el.firstChild, fala = el.lastChild;
  if (dex != null) {
    const url = dexURL(dex);
    if (arte.getAttribute('src') !== url) arte.setAttribute('src', url);
    arte.style.display = '';
  } else arte.style.display = 'none';
  if (fala.textContent !== texto) fala.textContent = texto;
  /* A BORDA É A COR DO TIPO, exatamente como a arena faz. Ver a nota no
     `avanco-tema.mjs`: a tabela é a mesma, então o azul da água é o mesmo
     azul nos dois lugares. */
  if (golpe.cor) el.style.borderColor = golpe.cor;
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  el.classList.add('on');
}

/* ── O NÚMERO DO DANO ─────────────────────────────────────────────────────
 *
 * `dmg` é a classe da arena, com a mesma animação de subir e sumir. Cada golpe
 * gera UM, e ele se remove sozinho — a chave é o instante do golpe, então
 * repintar o mesmo quadro sessenta vezes por segundo não cria sessenta
 * números. */
const jaFlutuou = new Set();

/* ── OS QUE AINDA ESTÃO NO AR (L-172) ────────────────────────────────────
 *
 * O número vive 1,2 s, então o "conjunto" de um número que está nascendo são
 * os que couberam nesse último instante e meio. A lista é curta por
 * construção — uma wave inteira tem algumas dezenas de golpes espalhados —, e
 * ela se limpa a cada nascimento em vez de por temporizador: laço que roda
 * sozinho numa aba aberta por horas é o que se paga sem notar.
 *
 * As MEDIDAS são as do CSS, e elas são aproximadas de propósito: medir o
 * elemento exigiria criá-lo antes de saber onde pô-lo, e forçaria um cálculo
 * de layout por golpe. Errar dois pixels aqui custa dois pixels; forçar layout
 * a cada golpe custa quadros. */
/* MEDIDO no navegador, 09/09/2026, com o observador da esteira: a caixa nasce
   com 21 a 33 px de largura e 9 de altura — ela é lida no instante do
   nascimento, quando o `floatUp` ainda está em `scale(.6)`. Em tamanho cheio
   dá ~35 a 55 por ~15.

   Os números aqui são o TETO da faixa, e o teto é o certo: separar de menos
   deixa dois se tocando, e separar de mais custa quinze pixels de altura numa
   cena de 448. */
const LARGURA_DO_DANO = 55;
const ALTURA_DO_DANO = 16;
const vivosDoDano = [];
export function flutuar(camada, x, y, texto, chaveDoGolpe, lado = '') {
  if (!camada || jaFlutuou.has(chaveDoGolpe)) return;
  jaFlutuou.add(chaveDoGolpe);
  /* O conjunto não pode crescer para sempre numa aba aberta por horas: uma run
     inteira tem algumas centenas de golpes, e este teto é folgado o bastante
     para nunca reaparecer um número já mostrado. */
  if (jaFlutuou.size > 500) jaFlutuou.clear();
  /* ── DOIS ELEMENTOS, E É A CORREÇÃO DO D-083 ──────────────────────────
   *
   * A versão anterior era UM `<div class="dmg avDmg">` com o `transform`
   * inline. Ela desenhava o número no CANTO da camada, e não sobre o
   * lutador — os dez números de uma wave nasciam todos no mesmo pixel.
   *
   * A causa é uma regra do navegador, e não um erro de conta: `.dmg` traz
   * `animation: floatUp`, e TODO quadro-chave do `floatUp` define
   * `transform`. **Propriedade animada vence `style` inline.** O
   * `translate(x, y)` era descartado antes de o primeiro quadro rodar.
   *
   *     medido em 1920   todo "-1" em x = -19, todo "-100" em x = -32
   *     medido em 420    os dez fora da janela, à esquerda do mundo
   *
   * É o "hitbox de -31" que o dono cobrou QUATRO vezes, e as três primeiras
   * eu respondi que o código estava lá. Estava. Ele não estava errado — os
   * números não chegavam aos olhos dele.
   *
   * Agora a POSIÇÃO mora num elemento e o MOVIMENTO no filho. Dois
   * `transform` em dois elementos não competem: eles se compõem, que é o que
   * se queria desde o começo. */
  /* ── E ELE DESVIA DO QUE AINDA ESTÁ NO AR (L-172) ────────────────────
   *
   * Queixa do dono: *"o hitbox tá meio zoado, os números aparecem de forma
   * confusa"*. Medido antes de mexer, com o observador da esteira ligado por
   * 28 s de wave 1:
   *
   *     5 pares sobrepostos    numa wave comum, de 25 nascidos
   *     0 pares                no duelo do chefe, de 12 — porque é 1x1
   *     2 fora da janela       a 420 px, à esquerda do mundo
   *
   * A causa é a mesma das placas (D-081) chegando por outra porta: dois
   * selvagens e o companheiro trocam golpes no mesmo canto, e cada número
   * nasce sem saber dos outros.
   *
   * A conta é pura e mora na geometria — ver `pontoLivre`. Aqui fica só a
   * lista do que ainda está no ar, que é a única parte que precisa de relógio. */
  const agora = Date.now();
  /* Só os que ainda estão VIVOS. A lista se limpa a cada número novo — um
     vetor que só cresce numa aba aberta por horas é um vazamento com aparência
     de cache —, e QUEM decide o que é vivo é a geometria, que tem teste. */
  const vivos = aindaNoAr(vivosDoDano, agora);
  vivosDoDano.length = 0;
  vivosDoDano.push(...vivos);

  const caixa = camada.getBoundingClientRect?.();
  const posto = pontoLivre(x, y, vivos, {
    largura: LARGURA_DO_DANO, altura: ALTURA_DO_DANO,
    /* O LIMITE é a caixa da camada. Sem ele nada é grampeado: quem não sabe o
       tamanho da tela não pode inventar um. */
    limite: caixa?.width ? { w: caixa.width } : null,
  });
  vivosDoDano.push({ x: posto.x, y: posto.y, em: agora });

  const ponto = document.createElement('div');
  ponto.className = 'avDmgPonto';
  ponto.style.transform = `translate(${Math.round(posto.x)}px, ${Math.round(posto.y)}px)`;

  const d = document.createElement('span');
  /* O LADO É A INFORMAÇÃO. O dano que EU dou e o que EU levo são as duas
     leituras opostas da luta, e num quadro com quatro sprites o jogador não
     tem tempo de ler de qual sprite o número saiu — ele lê a COR. */
  d.className = 'dmg avDmg ' + lado;
  d.textContent = texto;
  ponto.appendChild(d);
  camada.appendChild(ponto);
  setTimeout(() => ponto.remove(), 1200);
}

export function pintarPlaca(chave, camada, { x, y, texto, vida, hp, hpMax, chefe, meu }) {
  if (!camada) return;
  const el = placaDe(chave, camada);
  const b = el.children[0], barra = el.children[1].firstChild, num = el.children[2];
  if (b.textContent !== texto) b.textContent = texto;
  const rotulo = Number.isFinite(hp) ? hp + ' / ' + hpMax : '';
  if (num.textContent !== rotulo) num.textContent = rotulo;
  el.classList.toggle('chefe', !!chefe);
  /* A PLACA DELE É A MINHA, e ela se anuncia: o jogador precisa achar o
     próprio bicho de relance num quadro com quatro sprites. */
  el.classList.toggle('meu', !!meu);
  const v = Math.max(0, Math.min(1, vida));
  barra.style.width = (v * 100) + '%';
  /* Verde -> âmbar -> vermelho. A cor é a informação periférica: quem está
     com um filme ao lado registra a cor antes de registrar o tamanho. */
  const cor = v > 0.55 ? 'var(--ok)' : (v > 0.25 ? 'var(--aviso)' : 'var(--perigo)');
  barra.style.background = cor;
  /* `color` alimenta o `currentColor` do brilho no CSS: assim o halo é da
     mesma cor da barra sem repetir o valor em dois lugares. */
  barra.style.color = cor;
  /* O PONTO PEDIDO fica guardado no elemento, e o `transform` é escrito aqui
     mesmo assim: a `separarPlacas` roda depois e reescreve quem precisar, e
     enquanto ela não roda a placa já está no lugar certo. Guardar sem
     desenhar deixaria um quadro de atraso em toda placa nova. */
  el._x = x; el._y = y;
  el.style.transform = `translate(${x}px, ${y}px)`;
}

/* ── AS PLACAS QUE SE ENCOSTAM SÃO SEPARADAS — D-081 ──────────────────────
 *
 * Medido no passo OLHAR, em 28 s de wave 1: um par de placas sobrepostas,
 * "Charmander 97/100" desenhada por cima de "Metapod 0/100". Nenhuma das duas
 * se lia — e é literalmente a queixa do dono, *"uma confusão, não dá pra ver
 * nada"*, com endereço.
 *
 * ── A CONTA MORA NA GEOMETRIA, E AQUI SÓ FICA A APLICAÇÃO ────────────────
 *
 * `separarPontos` é pura e tem teste sem navegador. A primeira versão fazia a
 * conta aqui dentro, misturada com `style.transform`, e o portão Q2 cobrou:
 * o defeito plantado que DESLIGA a aplicação **passou**, porque nenhum teste
 * conseguia olhar o resultado sem montar um DOM.
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém. Separar a conta do desenho é o que a torna afirmável.
 *
 * ── A ALTURA É MEDIDA, E NÃO ESCRITA ────────────────────────────────────
 *
 * A primeira versão escreveu 28 px "somando o CSS de cabeça". Errado por cinco
 * pixels — a placa mede 33 —, e o efeito foi o pior possível: a separação
 * RODAVA, empurrava, e as duas continuavam encostadas. Portão verde, conserto
 * aplicado, defeito de pé.
 *
 * Uma leitura força o layout; uma por sessão é grátis, e uma por quadro numa
 * tela aberta por horas não seria. O 33 é só o socorro para antes da primeira
 * medida — nunca a fonte da verdade. */
const LARGURA_DA_PLACA = 68;  /* o `width` da `.avPlacaMob`, e ela se centra */
let alturaDaPlaca = 0;
const alturaDe = el => {
  if (!alturaDaPlaca) alturaDaPlaca = Math.round(el.offsetHeight) || 0;
  return alturaDaPlaca || 33;
};

export function separarPlacas() {
  const vivas = [...placas.entries()]
    .filter(([, el]) => el && el.isConnected && Number.isFinite(el._y));
  if (!vivas.length) return;

  const altura = alturaDe(vivas[0][1]) + 2;
  const postos = separarPontos(
    vivas.map(([chave, el]) => ({ chave, x: el._x, y: el._y })),
    { largura: LARGURA_DA_PLACA, altura });

  const porChave = new Map(vivas);
  for (const p of postos) {
    const el = porChave.get(p.chave);
    if (el && p.y !== el._y) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }
}
