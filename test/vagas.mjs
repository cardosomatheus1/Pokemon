/* Q1/Q3/Q6 · AS VAGAS SIMULTÂNEAS (bloco 1.9, camada 0).
 *
 * ── O QUE ESTE ARQUIVO GUARDA ────────────────────────────────────────────
 *
 * O dono pediu quatro expedições ao mesmo tempo, e perguntou se valia a pena:
 *
 *   > "essa mecânica eu queria ver de manter [...] até pela questão do farm
 *   >  não ficar muito pesado, o que você recomenda?"
 *
 * Vale — e o motivo não é opinião. O teto conta ENCONTROS, e a expedição
 * RESERVA o máximo do perfil ao sair. Quatro Trilhas juntas reservam 32 num
 * teto de 30, e a quarta é recusada no clique. **Paralelismo mudou QUANDO se
 * colhe, nunca QUANTO.** A primeira afirmação abaixo é exatamente essa, e ela
 * é a que autoriza o resto do bloco.
 *
 * ── AS QUATRO AFIRMAÇÕES ─────────────────────────────────────────────────
 *
 * 1. **O TETO SEGURA O PARALELISMO SOZINHO.** Com todas as vagas abertas, o
 *    dia não rende mais encontros do que com uma. Se render, o paralelismo
 *    virou poder e o §P5 caiu junto.
 *
 * 2. **AS VAGAS VÊM DO POKÉDEX, E O POKÉDEX NÃO SE COMPRA.** Fragmento cai no
 *    encontro, e só ali. Vaga vendida é tempo vendido.
 *
 * 3. **NÃO HÁ ONDE ESCREVER O NÚMERO DE VAGAS.** Elas são DERIVADAS. A versão
 *    anterior lia `simultaneas` do estado salvo, e `localStorage` está a um F12
 *    de distância — era um campo de vantagem lido de onde o jogador escreve.
 *
 * 4. **A PROGRESSÃO É MONÓTONA E TEM FIM.** Ver mais espécies nunca tira uma
 *    vaga, e `proximaVaga` sabe dizer que acabou — "faltam 0" e "não há mais"
 *    são coisas diferentes, e a tela precisa das duas.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  MARCOS_VAGAS, vagasPor, proximaVaga,
  SIMULTANEAS_INICIAIS, SIMULTANEAS_MAX, PERFIS, TETO_ENCONTROS, maximoDo,
  MARCOS_ENCONTROS, GANHO_COMPLETO, tetoDeEncontros, proximoEncontro,
} from '../engine/expedicao.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ler = p => readFileSync(join(dirname(fileURLToPath(import.meta.url)), p), 'utf8');

export function suite() {
  const s = criarSuite('vagas');

  /* --- 1 · O TETO SEGURA O PARALELISMO ------------------------------------ */

  s.teste('§P5 · quatro vagas não rendem mais encontros que uma', () => {
    /* Com TODAS as vagas cheias do perfil mais gordo, a reserva ultrapassa o
       teto — e é isso que impede o paralelismo de ser farm extra. */
    const gordo = Object.keys(PERFIS)
      .reduce((a, p) => (maximoDo(p) > maximoDo(a) ? p : a), Object.keys(PERFIS)[0]);
    const reservaCheia = maximoDo(gordo) * SIMULTANEAS_MAX;
    ok(reservaCheia > TETO_ENCONTROS,
      `${SIMULTANEAS_MAX} ${gordo}s reservam ${reservaCheia} e o teto é ` +
      `${TETO_ENCONTROS}. Se coubessem todas, abrir vagas seria multiplicar o ` +
      'farm — e aí o paralelismo deixaria de ser conveniência e viraria poder, ' +
      'que é exatamente o que o §P5 proíbe vender e o que torna caro equilibrar.');
  });

  s.teste('mas duas vagas do perfil mais curto CABEM — senão a mecânica é decorativa', () => {
    const curto = Object.keys(PERFIS)
      .reduce((a, p) => (PERFIS[p].minutos < PERFIS[a].minutos ? p : a), Object.keys(PERFIS)[0]);
    ok(maximoDo(curto) * 2 <= TETO_ENCONTROS,
      `duas ${curto}s reservam ${maximoDo(curto) * 2} e não cabem em ` +
      `${TETO_ENCONTROS}. O teto tem de segurar o ABUSO sem impedir o USO: uma ` +
      'segunda vaga que nunca pode ser usada é uma recompensa que não existe.');
  });

  /* --- 2 · AS VAGAS VÊM DO POKÉDEX ----------------------------------------- */

  s.teste('sem registro nenhum, uma vaga — e ela existe desde o começo', () => {
    igual(vagasPor(0), SIMULTANEAS_INICIAIS);
    igual(vagasPor(-5), SIMULTANEAS_INICIAIS, 'registro negativo não pode tirar a vaga inicial');
    igual(vagasPor('nada'), SIMULTANEAS_INICIAIS);
    igual(vagasPor(undefined), SIMULTANEAS_INICIAIS);
    igual(vagasPor(NaN), SIMULTANEAS_INICIAIS,
      'um NaN no registro zerou as vagas. O jogador ficaria sem poder mandar ' +
      'expedição nenhuma, e sem nada na tela dizendo por quê.');
  });

  s.teste('cada marco abre exatamente uma vaga, e nem uma antes', () => {
    for (let i = 1; i < MARCOS_VAGAS.length; i++) {
      const alvo = MARCOS_VAGAS[i];
      igual(vagasPor(alvo - 1), SIMULTANEAS_INICIAIS + i - 1,
        `com ${alvo - 1} espécies a vaga ${SIMULTANEAS_INICIAIS + i} já estava aberta`);
      igual(vagasPor(alvo), SIMULTANEAS_INICIAIS + i,
        `com ${alvo} espécies a vaga ${SIMULTANEAS_INICIAIS + i} não abriu`);
    }
  });

  s.teste('os marcos sobem, e o último cabe num elenco de verdade', () => {
    for (let i = 1; i < MARCOS_VAGAS.length; i++)
      ok(MARCOS_VAGAS[i] > MARCOS_VAGAS[i - 1],
        `o marco ${i} (${MARCOS_VAGAS[i]}) não é maior que o anterior`);
    ok(MARCOS_VAGAS[MARCOS_VAGAS.length - 1] <= 60,
      `o último marco é ${MARCOS_VAGAS.at(-1)} espécies. Recompensa que quase ` +
      'ninguém alcança é conteúdo que quase ninguém tem — e a quarta vaga é ' +
      'justamente o que faz o mapa parecer habitado.');
    igual(MARCOS_VAGAS.length, SIMULTANEAS_MAX,
      'a lista de marcos e o número de vagas discordam: alguma vaga nunca abre, ' +
      'ou algum marco não leva a nada.');
  });

  /* --- 3 · A PROGRESSÃO É MONÓTONA E TEM FIM ------------------------------ */

  s.teste('ver mais espécies nunca tira uma vaga', () => {
    let anterior = 0;
    for (let n = 0; n <= 200; n++) {
      const v = vagasPor(n);
      ok(v >= anterior, `de ${n - 1} para ${n} espécies as vagas caíram de ${anterior} para ${v}`);
      ok(v <= SIMULTANEAS_MAX, `${n} espécies deram ${v} vagas, acima do máximo`);
      anterior = v;
    }
  });

  s.teste('a próxima vaga diz quantas faltam, e diz quando acabou', () => {
    const p = proximaVaga(0);
    ok(p && p.faltam === MARCOS_VAGAS[1],
      `com registro vazio faltariam ${MARCOS_VAGAS[1]}, veio ${JSON.stringify(p)}`);
    igual(proximaVaga(MARCOS_VAGAS.at(-1)), null,
      'no último marco ainda há "próxima vaga". "Faltam 0" e "não há mais" são ' +
      'coisas diferentes: a primeira convida a continuar, a segunda encerra — e ' +
      'a tela precisa escrever frases diferentes para as duas.');
    igual(proximaVaga(9999), null);
    for (let n = 0; n < MARCOS_VAGAS.at(-1); n++) {
      const q = proximaVaga(n);
      ok(q && q.faltam > 0, `com ${n} espécies a próxima vaga já estaria completa`);
      igual(q.vaga, vagasPor(n) + 1, `a próxima vaga anunciada não é a seguinte à atual`);
    }
  });

  /* --- 4 · NÃO HÁ PORTA (§P5) --------------------------------------------- */

  s.teste('§P5 · nenhum argumento extra abre vaga', () => {
    const base = vagasPor(0);
    for (const veneno of [{ vagas: 9 }, { simultaneas: 4 }, { bonus: 3 }, 4, '4'])
      igual(vagasPor(veneno), base,
        `${JSON.stringify(veneno)} como registro devolveu vagas a mais. A função ` +
        'recebe UM número — quantas espécies foram vistas — e qualquer outra ' +
        'coisa é zero. Vaga que vem de fora é vaga que a loja pode vender, e ' +
        'vaga vendida é tempo vendido.');
  });

  /* ── A SEGUNDA METADE DO REGISTRO PAGA EM ENCONTROS (1.19) ─────────────
   *
   * As vagas param nas 45 espécies, e param por decisão. Mas o elenco tem 146,
   * e depois do 45 completar o registro não pagava mais nada — 101 espécies sem
   * recompensa, que é o mesmo defeito que a L-105 mediu no nível: a escada
   * acaba e o número continua andando.
   */

  s.teste('o teto de encontros SOBE com o registro, e o piso não muda', () => {
    /* Quem não chegou a marco nenhum vê exatamente o número de antes. É a
       condição que faz esta mudança não mexer com ninguém que já joga. */
    igual(tetoDeEncontros(0), TETO_ENCONTROS, 'o piso mudou para quem tem zero');
    /* ── OS NÚMEROS SAEM DA LISTA, e não estão escritos aqui (1.27) ─────
       A primeira versão cravava 45, 59 e 60. Quando a L-132 redesenhou a
       escada, ela reprovou por dizer o que ERA em vez do que a lista DIZ — e
       o defeito estaria em mim, não no desenho.

         > Teste que copia o dado que ele testa vira uma segunda cópia do
         > dado, e ela envelhece calada.

       As duas escadas continuam SEPARADAS, e é isso que se afirma: o degrau
       do teto não cai numa marca de vaga. */
    const primeiro = MARCOS_ENCONTROS[0].em;
    igual(tetoDeEncontros(primeiro - 1), TETO_ENCONTROS, 'subiu antes do primeiro marco');
    igual(tetoDeEncontros(primeiro), TETO_ENCONTROS + MARCOS_ENCONTROS[0].ganho,
      'o primeiro marco não pagou');
    for (const v of MARCOS_VAGAS.map(m => m.em ?? m))
      ok(!MARCOS_ENCONTROS.some(m => m.em === v),
        `a marca ${v} abre vaga E sobe o teto no mesmo ponto: as duas escadas ` +
        'viraram uma, e o jogador deixa de ter dois objetivos');
    /* COMPLETAR é uma RELAÇÃO, e não um número: o total vem do PACK. O portão
       §Gen2 reprovou a primeira versão, que cravou 146 no motor — e estava
       certo: o tamanho da dex é dado do tema, e escrito no motor a Gen 2 vira
       caçada a números em lugares que ninguém lembra. */
    const todosOsMarcos = MARCOS_ENCONTROS.reduce((a, m) => a + m.ganho, 0);
    igual(tetoDeEncontros(146), TETO_ENCONTROS + todosOsMarcos,
      'sem saber o total, só os marcos fixos podem valer');
    igual(tetoDeEncontros(146, 146), TETO_ENCONTROS + todosOsMarcos + GANHO_COMPLETO,
      'completar o elenco devia render o bônus final');
    igual(tetoDeEncontros(999, 146), TETO_ENCONTROS + todosOsMarcos + GANHO_COMPLETO,
      'passou do fim e continuou subindo — a escada tem fim');
    /* Os marcos que 80 espécies já passaram, somados da LISTA — o número
       estava escrito à mão e envelheceu quando a escada mudou. */
    const ate80 = MARCOS_ENCONTROS.filter(m => m.em <= 80).reduce((a, m) => a + m.ganho, 0);
    igual(tetoDeEncontros(80, 80), TETO_ENCONTROS + ate80 + GANHO_COMPLETO,
      'num elenco PEQUENO, completar tem de pagar do mesmo jeito');
  });

  s.teste('a escada é MONÓTONA e o último degrau vale mais', () => {
    /* Monótona: mais espécies nunca podem render menos. Um degrau que descesse
       ensinaria o jogador a não completar, que é o oposto do ponto. */
    let ant = -1;
    for (let n = 0; n <= 160; n++) {
      const v = tetoDeEncontros(n, 146);
      ok(v >= ant, `o teto caiu de ${ant} para ${v} em ${n} espécies`);
      ant = v;
    }
    /* O último vale DOIS: completar não pode render o mesmo que mais um degrau
       qualquer, ou o degrau final deixa de ser um fim. */
    /* COMPLETAR vale mais que qualquer degrau: terminar não pode render o
       mesmo que progredir, ou o fim deixa de ser um fim. */
    for (const m of MARCOS_ENCONTROS)
      ok(GANHO_COMPLETO > m.ganho,
        `completar rende ${GANHO_COMPLETO}, igual ao marco de ${m.em} — ` +
        'terminar deixou de ser diferente de progredir');
  });

  s.teste('o próximo marco é dito, e o fim se distingue de "faltam zero"', () => {
    /* Mesma forma da `proximaVaga`, de propósito: duas escadas que se leem do
       mesmo jeito são uma escada só na cabeça do jogador. */
    const primeiro = MARCOS_ENCONTROS[0].em;
    const p = proximoEncontro(0);
    igual(p.em, primeiro, 'o próximo marco não é o primeiro da lista');
    igual(p.faltam, primeiro, 'a conta do que falta está errada');
    igual(proximoEncontro(primeiro - 1).faltam, 1, 'faltando um, devia dizer um');
    igual(proximoEncontro(146, 146), null,
      'registro completo devia devolver nulo — a tela precisa distinguir ' +
      '"faltam zero" de "não há mais", e um zero confunde os dois');
    const fim = proximoEncontro(130, 146);
    igual(fim.completo, true, 'depois dos marcos, o alvo passa a ser COMPLETAR');
    igual(fim.em, 146, 'o alvo de completar não veio do pack');
    igual(fim.faltam, 16, 'a conta do que falta para completar está errada');
  });

  s.teste('a tela MOSTRA o teto de hoje e o próximo degrau', () => {
    /* Uma escada que só existe no motor é uma escada que ninguém sobe. E
       mostrar o PISO quando o jogador já subiu seria mentira por omissão num
       contador — que é o D-067 outra vez. */
    const campo = ler('../app/modules/idle-campo.mjs');
    ok(/tetoDeEncontros\(/.test(campo),
      'a tela ainda usa o teto fixo — quem passou de marco vê o número errado');
    ok(/proximoEncontro\(/.test(campo),
      'a tela não diz qual é o próximo degrau, e sem isso as 101 espécies ' +
      'depois da última vaga não têm motivo visível para existir');
    ok(/rotulos\?\.registro/.test(campo),
      'o nome do registro está cravado na tela em vez de vir do pack — o motor ' +
      'não pode nomear o tema (§0.3), e a tela não pode inventar o nome');
  });


  /* ═══ A ESCADA DA DEX — L-132, bloco 1.27 ═══════════════════════════════
   *
   * Levantada pelo dono, e a pergunta dele era melhor que a minha:
   *
   *   > "é complicado achar todos [...] então acho justo manter a premiação;
   *   >  não precisa ser algo desenfreado, mas pode dar uma melhorada sobre a
   *   >  questão do teto atual"
   *
   * ── O RETRATO DE ANTES, E OS DOIS ERROS ─────────────────────────────────
   *
   *     30 de base · +1 com 60, 80, 100 e 120 · +2 ao COMPLETAR · máximo 36
   *
   *     o MEIO ERA MORTO      quem chega a 45 já tem as quatro vagas, e passa
   *                           QUINZE espécies sem ganhar nada em escada nenhuma
   *     o FIM ERA MESQUINHO   completar a dex — o feito mais difícil do jogo —
   *                           valia +2 num teto de 30. Seis por cento.
   */
  s.teste('a escada não dorme no meio: nenhum vão passa de 30 espécies', () => {
    const degraus = [0, ...MARCOS_ENCONTROS.map(m => m.em)];
    for (let i = 1; i < degraus.length; i++) {
      const vao = degraus[i] - degraus[i - 1];
      ok(vao <= 30,
        `entre ${degraus[i - 1]} e ${degraus[i]} há ${vao} espécies sem degrau ` +
        'nenhum. Era o buraco de 45→60 que o dono viu: o jogador anda quinze ' +
        'espécies e a escada não responde');
    }
  });

  s.teste('o primeiro degrau chega CEDO, e não depois das vagas', () => {
    /* Ele chegava aos 60, e as quatro vagas fecham aos 45. A escada só começava
       depois de a outra escada acabar — e entre as duas havia o vazio. */
    ok(MARCOS_ENCONTROS[0].em <= 45,
      `o primeiro degrau do teto está em ${MARCOS_ENCONTROS[0].em} espécies, e as ` +
      'vagas fecham em 45: a escada começa depois de a outra acabar');
  });

  s.teste('COMPLETAR vale mais que qualquer degrau, e dobra o passo', () => {
    /* A regra já estava escrita no motor antes deste bloco, e ela continua:
       completar não pode render o mesmo que mais um degrau qualquer, ou o
       degrau final deixa de ser um fim. */
    /* ── E EU EXAGEREI NA PRIMEIRA VERSÃO DESTE TESTE ──────────────────
       Escrevi `>= maior * 2` e a curva dá 1,5×. A regra que está escrita no
       motor desde antes deste bloco diz outra coisa, e é a certa:

         > completar não pode render o MESMO que mais um degrau qualquer, ou o
         > degrau final deixa de ser um fim.

       "Mais que", e não "o dobro". Um teste que cobra mais do que a regra
       pede reprova o desenho por uma exigência que ninguém tomou — e o
       conserto é apertá-lo até o tamanho da regra, nunca afrouxá-lo até
       sumir. O 1,5× fica como piso porque ele é o que separa "outro degrau"
       de "o fim". */
    const maior = Math.max(...MARCOS_ENCONTROS.map(m => m.ganho));
    ok(GANHO_COMPLETO >= maior * 1.5,
      `completar vale ${GANHO_COMPLETO} e o maior degrau vale ${maior}: o fim ` +
      'virou mais um degrau, e deixou de ser um fim');
  });

  s.teste('a melhora é SENTIDA e não é desenfreada — o critério do dono', () => {
    const base = TETO_ENCONTROS;
    const cheio = tetoDeEncontros(999, 151);
    const ganho = (cheio - base) / base;
    ok(ganho >= 0.5,
      `quem completou a dex ganha ${(ganho * 100).toFixed(0)}% de teto. Era 20%, ` +
      'e o dono pediu "uma melhorada" — abaixo de metade não se sente');
    ok(ganho <= 0.8,
      `quem completou ganha ${(ganho * 100).toFixed(0)}% de teto. O dono foi ` +
      'explícito: "não precisa ser algo desenfreado", e o teto diário é o que ' +
      'limita a renda de um dia — com o RMT vivo, isso tem dimensão de dinheiro');
  });

  s.teste('a escada SOBE o tempo todo, e o passo nunca encolhe', () => {
    /* Uma escada cujo degrau diminui ensina que persistir rende menos — o
       contrário do que ela existe para dizer. */
    let anterior = 0;
    for (const m of MARCOS_ENCONTROS) {
      ok(m.ganho >= anterior,
        `o degrau de ${m.em} vale ${m.ganho} e o anterior valia ${anterior}: ` +
        'a escada encolhe no meio do caminho');
      anterior = m.ganho;
    }
  });

  return s;
}
