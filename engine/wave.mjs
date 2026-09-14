/* A RESOLUÇÃO DA WAVE (bloco A2, §7.22.6, camada 0).
 *
 * Fronteira: entra um elenco de estágio, uma equipe e uma semente; sai o que
 * acontece numa wave. Puro, sem DOM, sem estado e sem tema.
 *
 * ── RESOLVE PRIMEIRO, ENCENA DEPOIS ──────────────────────────────────────
 *
 * É o modelo da Arena, que já está construído e provado: a batalha inteira sai
 * da semente antes do primeiro quadro, e a coreografia lê o roteiro pronto.
 * Quatro coisas vêm de graça com isso, e nenhuma delas vem de um combate
 * decidido ao vivo:
 *
 *     RECONEXÃO      dá para avançar rápido até onde o relógio chegou
 *     DETERMINISMO   §P3 — a run inteira sai de um número
 *     AUDITORIA      §25.2 — o saque tem de poder ser refeito depois
 *     MEDIÇÃO        Q4 — dá para rodar mil runs e ver a curva
 *
 * ── E O ROTEIRO É POR WAVE, E NÃO DA RUN INTEIRA ────────────────────────
 *
 * Se as dez waves fossem resolvidas de uma vez, a mão do jogador não teria
 * onde entrar: a poção que ele gastasse na wave 6 não mudaria nada, porque a
 * wave 7 já estaria escrita.
 *
 * Cada wave é resolvida a partir da semente MAIS o estado de agora — o HP, a
 * equipe, o que foi usado. Determinístico dadas as entradas, e ainda assim
 * reativo. É a diferença entre um filme e uma partida.
 *
 * ── A CHANCE É ESCALA-LIVRE, E ISSO É O QUE DISPENSA CALIBRAÇÃO ─────────
 *
 * A chance sai da RAZÃO entre poder e ameaça, e não da diferença. Uma equipe
 * de 200 contra 150 tem exatamente a mesma chance que uma de 2000 contra 1500.
 *
 *   > Com diferença, o equilíbrio medido no nível 10 não diria nada sobre o
 *   > nível 40, e cada estágio novo pediria calibração própria. Com razão, uma
 *   > medição vale para a escada inteira.
 *
 * ── E NADA É CERTO, NOS DOIS SENTIDOS ───────────────────────────────────
 *
 * A chance é aparada nas duas pontas. Um idle onde a wave é garantida não pede
 * a mão do jogador; um onde ela é impossível não pede nada. E o teto também
 * fecha a porta do save adulterado: poder de um bilhão não compra certeza.
 */

/* O bônus do guia vem da TABELA DO FOCO, e não de um número escrito aqui: ele
   é a mesma coisa nos dois modos, e duas fontes para o mesmo bônus divergem no
   dia em que alguém calibrar uma. */
import { BONUS_DO_GUIA } from './foco.mjs';

/* ── A ESTRUTURA, E ELA MUDOU DUAS VEZES ──────────────────────────────────
 *
 * Era nove waves de 3+3 e uma de 2+2 — 58 mobs, o número que o dono deu em
 * 07/09. Ele mesmo o revisou em 09/09, depois de ver a run rodando:
 *
 *   > "seis por wave está muito, vamos reduzir para quatro"
 *
 * (a frase dele nomeia a franquia, e o §0.3 não a quer no motor — nem em
 * comentário; ela está inteira na L-169)
 *
 * ── E ISSO É A OUTRA METADE DE UMA CORREÇÃO, E NÃO UMA TROCA ────────────
 *
 * A wave encurtou de 2–4 min para 45–90 s no item 5 da ordem dele, e passou a
 * espremer seis duelos nesse tempo. Foi exatamente isso que produziu o D-084:
 * cabia UM golpe por duelo, e todo hitbox saía "-100". Quatro devolve ar a
 * cada duelo sem devolver o tempo morto que ele mandou cortar.
 *
 * ── O CHEFE VIROU UM SÓ, E É OUTRA DECISÃO DELE ─────────────────────────
 *
 *   > "no final podem vir os boss em forma de luta 1x1 (…) como um boss só,
 *   >  ele é mais difícil (…) essa questão de aparecer um ou outro vai ocorrer
 *   >  de forma RNG"
 *
 * Nove waves de fila e uma de DUELO. É o que dá ao fim do estágio uma forma
 * diferente do meio — e sem isso a décima wave é a nona com nomes melhores. */
export const WAVES = 10;
export const MOBS_POR_WAVE = 4;
export const MOBS_DO_CHEFE = 1;
export const ESPECIES_POR_WAVE = 2;
/* ── QUANTO O CHEFE PESA A MAIS ───────────────────────────────────────────
 *
 * Um sozinho com a ameaça de um comum tornaria o FIM do estágio o momento mais
 * fácil dele — e o anúncio no meio da tela viraria piada. O peso sai daqui, e
 * não de um número na tela: *tela que promete o que o motor não entrega* é o
 * defeito que este projeto mais paga.
 *
 * 1,6 sobre a ameaça crua dele. Com a força de chefe já sendo ~2× a de um
 * comum, o duelo pesa mais que os quatro da rotina sem virar muro — o §7.22.8
 * diz que falhar custa o baú, e não a run. */
export const PESO_DO_DUELO = 1.6;

/* ── QUANTOS APARECEM E QUANTO A WAVE PESA SÃO DOIS NÚMEROS ───────────────
 *
 * Ao cair de seis para quatro, a suíte estatística reprovou na hora — e com o
 * número na mão:
 *
 *     o estágio 1 passou a ser limpo 100% das vezes JÁ NO NÍVEL QUE O ABRE
 *
 * Acima de 85% o estágio novo não pede nada de quem chegou nele, e a escada
 * deixa de ser escada. **O dono pediu menos poluição na tela, e não um jogo
 * mais fácil** — atender ao pedido pela letra teria entregue a coisa errada.
 *
 * Então o que ele mudou (quantos aparecem) fica separado do que ele não mudou
 * (quanto a wave pede). Quatro selvagens mais duros, e não seis fracos.
 *
 *   > Um número que serve a duas perguntas responde mal a uma delas no dia em
 *   > que a outra mudar. Aqui elas se separaram, e a que estava calibrada
 *   > continua onde estava.
 *
 * A DENSIDADE é a régua de balanço, calibrada nos estudos de economia e presa
 * aos limiares de nível do §7.22. Mexer nela é recalibrar a escada inteira, e
 * a suíte §Q4 cobra isso na mesma execução. */
export const DENSIDADE_DA_AMEACA = 6;
export const MOBS_TOTAIS = (WAVES - 1) * MOBS_POR_WAVE + MOBS_DO_CHEFE;

export const ehWaveDeChefe = w => Math.floor(Number(w) || 1) >= WAVES;

/* ── O QUE VEM EM CADA WAVE ───────────────────────────────────────────────
 *
 * DUAS espécies por wave, e não uma nem seis. Uma só seria monótona — e a tela
 * fica aberta por horas. Seis viraria um amontoado onde nada se reconhece, e
 * reconhecer é o ponto: o jogador está assistindo esperando um bicho
 * específico aparecer.
 *
 * O sorteio é SEM REPOSIÇÃO dentro da wave: 3+3 de duas espécies diferentes, e
 * nunca 6 da mesma disfarçados de 3+3. */
function sortearDois(sorte, lista) {
  const pool = [...lista];
  const saiu = [];
  for (let i = 0; i < ESPECIES_POR_WAVE && pool.length; i++)
    saiu.push(pool.splice(Math.floor(sorte() * pool.length) % pool.length, 1)[0]);
  return saiu;
}

export function composicaoDaWave(sorte, { elenco, wave }) {
  const chefe = ehWaveDeChefe(wave);
  const fonte = chefe ? (elenco?.chefes ?? []) : (elenco?.comuns ?? []);
  if (!fonte.length) return [];
  const total = chefe ? MOBS_DO_CHEFE : MOBS_POR_WAVE;
  /* ── O CHEFE É UM SÓ, E QUAL DELES É SORTEADO (L-170) ────────────────
   *
   * A decisão de 07/09 era os DOIS fixos na wave 10, para o jogador saber para
   * o que estava guardando a poção. O dono a revisou em 09/09:
   *
   *   > "coloca exemplo primeiro mapa beedrill e butterfree, como um boss só
   *   >  (…) essa questão de aparecer um ou outro vai ocorrer de forma RNG"
   *
   * E a revisão é melhor pelo motivo que ele não escreveu: com os dois fixos, a
   * décima wave é a mesma em toda run daquele estágio. Com um sorteado, duas
   * runs do mesmo lugar têm finais diferentes — e o jogador volta para ver
   * qual sai.
   *
   * O que se perde é a preparação exata, e o que se ganha é a razão de repetir.
   * Num modo que se joga por horas, a segunda vale mais.
   *
   * O SORTEIO PASSA PELA SEMENTE como todo o resto (§P3): a run é auditável, e
   * o chefe que saiu pode ser reproduzido. */
  const escolhidas = chefe
    ? [fonte[Math.floor(sorte() * fonte.length) % fonte.length]]
    : sortearDois(sorte, fonte);
  const quantos = Math.round(total / escolhidas.length);
  return escolhidas.map(x => ({ dex: x.dex, forca: x.forca, quantos }));
}

/* ── O PODER DA EQUIPE ────────────────────────────────────────────────────
 *
 * A vaga extra rende MENOS que a anterior, e isso é pedido literal do dono
 * sobre mandar mais de uma criatura: *"o jogador precisa sentir a recompensa,
 * mas não pode ser nada surreal e quebrado"*.
 *
 * Linear seria surreal. Com quatro vagas valendo quatro vezes, o teto do farm
 * passaria a ser quantas vagas se tem — e vaga vem do registro, que é
 * progressão, não força. A equipe deixaria de importar.
 *
 *     1ª  100%      a criatura que você escolheu
 *     2ª   55%      ajuda de verdade, e não substitui
 *     3ª   35%
 *     4ª   20%      soma 2,1 no total, e não 4
 *
 * Somando 2,1, quatro criaturas valem pouco mais que o dobro de uma. É
 * sensível na tela e não quebra a escada. */
export const PESO_DA_VAGA = [1, 0.55, 0.35, 0.2];

/* ── QUANTO O NÍVEL MULTIPLICA, E POR QUE 22 ─────────────────────────────

   A inclinação não é gosto: ela tem de acompanhar a FORÇA DOS BIOMAS ao longo
   da escada, senão o jogador fica para trás sem ter feito nada errado.

   Medido na mata: a média do elenco vai de 200 no estágio 1 para 466 no 4 —
   2,3 vezes. As portas dos estágios são nos níveis 1, 12, 19 e 31.

       /60  no nível 31 a criatura vale 1,52x  ->  fica 35% para trás
       /22  no nível 31 ela vale 2,41x         ->  acompanha

   Com /60, a taxa de limpeza do estágio 2 no nível da porta era ZERO. */
export const POR_NIVEL = 22;

/* ── O VÍNCULO SAIU DO COMBATE — decisão do dono, 09/09/2026 ─────────────
 *
 * Ele era o eixo de PRESENÇA: até 25% a mais para a criatura que anda com
 * você. E ele era INVISÍVEL — o jogador entrava na wave com um quarto a mais
 * de força e não tinha como saber por quê.
 *
 * A minha correção foi MOSTRÁ-LO, e ela pôs mais um painel numa tela que o
 * dono já tinha achado confusa. A decisão dele desfaz o nó em vez de decorá-lo:
 *
 *   > o vínculo é a chave da evolução por AFINIDADE, e o pack de origem não
 *   > tem nenhuma. Ele vai INTEIRO para a geração seguinte — a evolução e o
 *   > combate juntos.
 *
 * O zero fica ESCRITO em vez de a linha sumir: uma constante que desaparece
 * some do grep, e no dia em que a Gen 2 chegar ninguém acha por onde ligar. O
 * que sobra no combate é o FOCO, que é o que ele escolhe no nível 12. */
export const POR_VINCULO = 0;

const numero = (v, padrao = 0) => (Number.isFinite(Number(v)) ? Number(v) : padrao);

export function poderDaEquipe(equipe) {
  const membros = Array.isArray(equipe) ? equipe : [];

  /* ── O GUIA ENTRA AQUI, E ELE JÁ PROMETIA ISSO ────────────────────────
   *
   * Correção do dono, 08/09/2026: *"o foco deve ser aplicado nesse novo
   * modo"*. Conferido, e ele estava certo — esta função usava força, nível e
   * vínculo, e ignorava o foco.
   *
   * Dos cinco focos, QUATRO são de expedição: eles falam de encontros, de
   * material e de item raro, e nenhum deles bate mais forte. Aplicá-los no
   * combate seria dar de graça o que eles já cobram noutra moeda.
   *
   * O `guia` é o único que sempre foi de combate — a tabela dele diz
   * literalmente `aliados: 0.25` — e ele não era aplicado em lugar nenhum. O
   * Avanço é o primeiro modo onde isso tem onde acontecer.
   *
   * ── O BÔNUS É DOS ALIADOS, E NÃO DELE MESMO ─────────────────────────
   *
   * É o que a tabela declara, e é o que faz o guia ser uma escolha de EQUIPE
   * em vez de um upgrade individual: sozinho ele não vale nada, e com três
   * companheiros ele vale por quase um a mais. Um guia que se beneficiasse do
   * próprio bônus seria só um foco de ataque com nome bonito. */
  const guias = membros.filter(c => c?.foco === 'guia').length;

  const lista = membros
    .map(c => {
      const forca = Math.max(1, numero(c?.forca, 1));
      const nivel = Math.max(1, numero(c?.nivel, 1));
      const vinculo = Math.max(0, numero(c?.vinculo, 0));
      /* Quem é guia não recebe o próprio bônus; recebe o dos OUTROS guias, se
         houver — dois guias na mesma equipe ajudam um ao outro, e isso é
         coerente com "aliados". */
      const doGuia = 1 + BONUS_DO_GUIA * (guias - (c?.foco === 'guia' ? 1 : 0));
      return forca * (1 + nivel / POR_NIVEL)
        * (1 + POR_VINCULO * Math.min(1, vinculo / 255)) * doGuia;
    })
    /* Do mais forte para o mais fraco: o peso da primeira vaga é o maior, e
       quem escolhe a ordem é a força — senão mandar o campeão na terceira vaga
       o desperdiçaria, e o jogador seria punido por não saber de uma regra
       que a tela não conta. */
    .sort((a, b) => b - a);
  return lista.reduce((a, v, i) => a + v * (PESO_DA_VAGA[i] ?? 0), 0);
}

/* ── A AMEAÇA DA WAVE ─────────────────────────────────────────────────────
 *
 * A força MÉDIA dos mobs que estão na wave, vezes quantos são. E MAIS NADA.
 *
 * A primeira versão multiplicava também pela curva de profundidade do estágio,
 * e a medição mostrou o erro na hora: no estágio 2, com a criatura no nível que
 * ABRE o estágio, a taxa de limpeza era ZERO.
 *
 *   > A profundidade já está no elenco. O estágio 2 é mais duro porque quem
 *   > mora nele é mais forte — média 302 contra 200 —, e multiplicar por cima
 *   > disso é cobrar a mesma profundidade duas vezes.
 *
 * É o mesmo erro que o `estagios.mjs` registra sobre somar viés em cima de
 * troca de faixa: quando duas coisas já dizem a mesma verdade, aplicá-las
 * juntas não reforça a verdade — ela deixa de valer.
 *
 * A wave do chefe leva um multiplicador POR CIMA. Sem ele, quatro chefes
 * somariam menos que seis mobs em alguns estágios, e a décima wave seria mais
 * fácil que a nona — que é o oposto de um clímax. */
/* ── A WAVE DO CHEFE É MAIS DURA POR CONSTRUÇÃO, E NÃO POR SORTE ─────────
 *
 * A primeira versão multiplicava a conta do chefe por um fator e torcia para
 * dar. **Não dava:** medido, 19 dos 44 estágios tinham a décima wave MAIS FÁCIL
 * que a rotina — porque vêm QUATRO chefes contra SEIS mobs, e quatro vezes uma
 * força grande nem sempre passa seis vezes uma força média.
 *
 * O Q2 é que apontou, e do jeito mais claro: a sabotagem que apagava o fator
 * passou VERDE, porque a única afirmação que eu tinha media a mata no estágio
 * 1 — um dos 25 lugares onde o defeito não aparece.
 *
 *   > É a mesma lição pela quarta vez neste projeto: a afirmação passava por um
 *   > caminho que o defeito não toca.
 *
 * A correção não é um fator maior. É trocar uma ESPERANÇA por uma GARANTIA: a
 * ameaça do chefe é, no mínimo, a da wave comum daquele estágio vezes o passo.
 * Assim o clímax é mais duro em TODO bioma e TODO estágio, inclusive nos que
 * ainda não existem — e nenhum passe de conteúdo futuro pode desfazer isso sem
 * a suíte reclamar. */
export const PESO_DO_CHEFE = 1.35;
export const AMEACA_BASE = 0.18;

const ameacaCrua = (fonte, quantos) => {
  if (!fonte.length) return 1;
  /* A força MÉDIA do grupo vezes quantos vêm — e não a soma do elenco inteiro:
     numa wave vêm dois dos quatro, e cobrar pelos quatro seria cobrar por quem
     não está lá. */
  const media = fonte.reduce((a, x) => a + Math.max(1, numero(x.forca, 1)), 0) / fonte.length;
  return AMEACA_BASE * media * quantos;
};

export function ameacaDa({ elenco, wave, estagio }) {
  const comuns = elenco?.comuns ?? [];
  /* A DENSIDADE, e não quantos aparecem: ver o comentário longo lá em cima.
     Quatro na tela, o peso de seis. */
  const rotina = ameacaCrua(comuns, DENSIDADE_DA_AMEACA);
  if (!ehWaveDeChefe(wave)) return rotina;
  const chefes = elenco?.chefes ?? [];
  if (!chefes.length) return rotina * PESO_DO_CHEFE;
  /* ── O DUELO PESA MAIS QUE A FILA (L-170) ─────────────────────────────
     Um chefe sozinho tem ameaça crua de UM mob; a rotina tem de quatro. Sem o
     `PESO_DO_DUELO`, o fim do estágio seria o momento mais FÁCIL dele — e o
     nome no meio da tela estaria anunciando o contrário do que acontece. */
  return Math.max(ameacaCrua(chefes, MOBS_DO_CHEFE) * PESO_DO_DUELO,
                  rotina * PESO_DO_CHEFE);
}

/* ── A CHANCE ─────────────────────────────────────────────────────────────
 *
 * Logística sobre o log da razão, que é a mesma forma de um Elo: em pé de
 * igualdade dá exatamente 50%, e o expoente controla quão rápido a vantagem
 * vira certeza.
 *
 *     razão 1,0 -> 50%        razão 1,3 ->  65%
 *     razão 0,7 -> 32%        razão 2,0 ->  84%
 *
 * `2,2` foi escolhido para que DOBRAR o poder não garanta a wave: 84% ainda
 * perde uma em seis, e é o que mantém a poção valendo alguma coisa mesmo para
 * quem está bem à frente do estágio. */
/* ── O RITMO: A FORÇA APARECE NO RELÓGIO ─────────────────────────────────
 *
 * Correção do dono, e ela nasceu de ele ler a medição e desconfiar dela:
 *
 *   > "o cara tá com as criaturas no nível 30, tudo evoluído — ele vai levar
 *   >  40 min pra fazer a floresta no estágio 1?"
 *
 * (A frase dele vem parafraseada: o original nomeia a franquia, e o motor não
 *  pode citá-la nem em comentário. Oitava vez que o portão `conteudo` me pega
 *  nisto, e ele continua certo — §0.3.)
 *
 * Levava — 31,9 min contra 35,9 do nível 4, onze por cento. A causa é que a
 * força só tinha UM lugar para aparecer, a chance de vencer, e ela satura por
 * decisão do §7.22.6 (*nada é certo, nos dois sentidos*):
 *
 *     razão 1,74  ->  chance 77%
 *     razão 4,82  ->  chance 95%   (o teto)
 *
 * Quase três vezes mais forte, dezoito pontos de chance, e para. O jogador
 * ficava forte e o relógio não sabia.
 *
 *   > Ficar forte tem de ENCURTAR o caminho já andado. Se não encurta, o
 *   > progresso não se sente — ele só se lê na ficha.
 *
 * O duelo é uma troca de golpes: quem bate mais forte precisa de menos. O
 * número de golpes já sai do tempo (`golpesPorLeva`, no roteiro), então basta
 * o tempo responder à razão.
 *
 * ── E OS DOIS LIMITES EXISTEM POR MOTIVOS DIFERENTES ────────────────────
 *
 *     o PISO   uma equipe absurda não pode transformar a wave num piscar.
 *              Esta é a tela que fica aberta por horas: sem nada para
 *              assistir, ela deixa de ser o que é
 *     o TETO   quem está abaixo do estágio sente o peso, e a run não vira
 *              castigo. Uma wave interminável não ensina nada — só cansa
 *
 * E há uma consequência boa que não foi pedida: o teto de encontros deixa de
 * ser a única razão para subir de estágio. Farmar o estágio 1 era seguro e
 * rendia igual; agora ele fica rápido E pobre, e o 2 passa a valer o risco. */
/* ── O PISO SUBIU JUNTO COM A WAVE (09/09/2026) ──────────────────────────
 *
 * Ele era 0,35, e isso estava certo enquanto a wave era de 2 a 4 minutos:
 * esmagada ao máximo, ela ainda dava 42 s.
 *
 * Com a wave em 45–90 s, o mesmo 0,35 dá **16 segundos** — e uma wave de
 * dezesseis segundos não é uma wave: é um piscar. O portão `avanco-forca`
 * pegou na primeira execução, e ele existe exatamente para isto.
 *
 *   > Encurtar a base e deixar o piso onde estava é encurtar duas vezes, e a
 *   > segunda ninguém pediu.
 *
 * 0,65 põe a wave mais rápida em ~30 s: continua sendo uma cena que se
 * assiste, e o estágio inteiro da equipe forte cai para ~7 min. */
export const RITMO_PISO = 0.65;
export const RITMO_TETO = 1.30;

/* A razão em que o ritmo é o normal: equipe à altura do estágio. */
const RITMO_NEUTRO = 1.6;

export function fatorDoRitmo(poder, ameaca) {
  const p = Math.max(1e-6, numero(poder, 1));
  const a = Math.max(1e-6, numero(ameaca, 1));
  /* Inversamente à RAZÃO, e não à diferença — a mesma escolha do `chanceDe`, e
     pelo mesmo motivo: com diferença, o ritmo medido no nível 10 não diria
     nada sobre o nível 40, e cada estágio novo pediria calibração própria. */
  return Math.min(RITMO_TETO, Math.max(RITMO_PISO, RITMO_NEUTRO / (p / a)));
}

export const EXPOENTE = 2.2;
export const CHANCE_MIN = 0.05;
export const CHANCE_MAX = 0.95;

export function chanceDe(poder, ameaca) {
  const p = Math.max(1e-6, numero(poder, 0));
  const a = Math.max(1e-6, numero(ameaca, 0));
  const razao = Math.pow(p / a, EXPOENTE);
  const c = razao / (razao + 1);
  return Math.min(CHANCE_MAX, Math.max(CHANCE_MIN, Number.isFinite(c) ? c : 0.5));
}

/* ── O QUE UMA WAVE COBRA ─────────────────────────────────────────────────
 *
 * O dano é proporcional a quão apertada ela foi — a mesma razão que decide a
 * chance decide o preço. Uma equipe folgada atravessa arranhada; uma no limite
 * chega ao chefe sem barra.
 *
 * Medido com equipe em pé de igualdade (razão 1): ~8 por wave vencida, ~80 nas
 * dez. Com 100 de HP e sem poção, o avanço fecha por pouco — e é essa margem
 * que faz a poção ser uma DECISÃO em vez de um item de bolsa.
 *
 * Perder cobra quase o triplo, e não zera nada: o §7.22.8 e o bloco 1.7b dizem
 * a mesma coisa, e ela não se negocia —
 *
 *   > Um idle que castiga o jogador por estar ausente está castigando o
 *   > jogador por usar o produto como ele foi feito.
 */
export const HP_MAX = 100;
export const DANO_VITORIA = 8;
export const DANO_DERROTA = 22;
export const DANO_MIN = 2;
export const DANO_MAX = 45;

const danoDe = (venceu, razaoInversa) => Math.min(DANO_MAX, Math.max(DANO_MIN,
  Math.round((venceu ? DANO_VITORIA : DANO_DERROTA) * razaoInversa)));

export function resolverWave(sorte, { elenco, wave, estagio, hp, equipe }) {
  const comp = composicaoDaWave(sorte, { elenco, wave });
  const poder = poderDaEquipe(equipe);
  const ameaca = ameacaDa({ elenco, wave, estagio });
  const p = chanceDe(poder, ameaca);
  const venceu = sorte() < p;
  /* A razão INVERSA é quanto a wave pesa para esta equipe. Aparada em 2,5 para
     que uma equipe muito abaixo do estágio perca rápido em vez de morrer numa
     wave só — perder é informação; ser apagado é confusão. */
  const inversa = Math.min(2.5, ameaca / Math.max(1e-6, poder));
  const dano = danoDe(venceu, inversa);
  const hpAtual = Math.max(0, numero(hp, HP_MAX));
  return {
    venceu, p, dano,
    /* ── A COMPOSIÇÃO SAI JUNTO, E ISSO É LIGAÇÃO, NÃO ENFEITE (A4a) ──────
       A tela precisa saber QUEM está na wave mesmo quando ela é perdida — e
       perdida não tem abate, então os `abates` não respondem. Derivar de novo
       lá fora exigiria repetir o sorteio com a mesma semente e na mesma ordem,
       e no dia em que alguém acrescentasse um sorteio aqui a tela passaria a
       desenhar espécies que não estão lutando.

         > Uma segunda derivação da mesma coisa é uma segunda verdade
         > esperando a primeira mudar. */
    comp,
    hpFinal: Math.max(0, hpAtual - dano),
    /* Só quem foi derrubado entra no saque. Perder a wave não abate ninguém —
       e é isso que faz o log da run contar uma história em vez de um total. */
    abates: venceu ? comp.map(x => ({ dex: x.dex, quantos: x.quantos })) : [],
  };
}

/* ── O AVANÇO INTEIRO ─────────────────────────────────────────────────────
 *
 * Sem poção e sem intervenção: é a medição, e não o jogo. O A3 é quem põe a
 * mão do jogador no meio; aqui o que se quer saber é como a curva se comporta
 * sozinha, para o Q4 poder afirmar alguma coisa sobre ela.
 *
 * PERDER A WAVE NÃO AVANÇA. Repete-se a mesma, pagando dano — é o muro clássico
 * de idle, e é o que transforma o HP no relógio da run: você não morre por
 * uma derrota, morre por acumular derrotas. */
export function simularAvanco(sorte, { elenco, estagio, equipe, hp = HP_MAX, tentativasMax = 200 }) {
  let vida = Math.max(0, numero(hp, HP_MAX));
  let wave = 1;
  const abates = [];
  let tentativas = 0;
  while (wave <= WAVES && vida > 0 && tentativas < tentativasMax) {
    tentativas++;
    const r = resolverWave(sorte, { elenco, wave, estagio, hp: vida, equipe });
    vida = r.hpFinal;
    for (const a of r.abates) {
      const j = abates.find(x => x.dex === a.dex);
      if (j) j.quantos += a.quantos; else abates.push({ ...a });
    }
    if (r.venceu) wave++;
  }
  return {
    completou: wave > WAVES,
    /* A wave ALCANÇADA, e não a próxima: quem morreu tentando a 7ª parou na 7ª,
       e o relatório que dissesse 8 estaria contando uma wave que não houve. */
    waves: Math.min(WAVES, wave),
    hp: vida, abates, tentativas,
  };
}
