/* Q1/Q2/Q5 · O RESULTADO VOLTA PARA O CENTRO (R5)
 *
 * ── O RELATO, E O QUE ELE REVELOU ──────────────────────────────────────────
 *
 * "Com lutador escolhido, a contagem 3, 2, 1 e o K.O. aparecem no canto
 *  inferior direito, pequenos demais para ler. Sem lutador escolhido, a
 *  contagem aparece no centro, normal."
 *
 * A diferença entre os dois casos é uma classe de CSS:
 *
 *     #overlay.apostado{ align-items:flex-end; justify-content:flex-end }
 *
 * E ela está CERTA onde nasceu. Durante a aposta, a dica "Blastoise é a sua
 * aposta · toque em outro para trocar" tem de sair da frente da arena — o
 * jogador está olhando os doze lutadores, e um cartaz no meio da tela taparia
 * justamente o que ele veio ver.
 *
 * O defeito é que ninguém a TIRA:
 *
 *     if (S.state !== 'betting'){ overlay.classList.remove('on'); return; }
 *
 * `on` sai, `apostado` fica. A classe atravessa a contagem, a luta e o
 * resultado, levando para o canto inferior direito o momento mais importante da
 * rodada — e só para quem apostou, que é exatamente quem tem dinheiro nela.
 *
 * ── E ISSO MUDA O ESCOPO DO BLOCO ──────────────────────────────────────────
 *
 * O troféu, o saco de dinheiro e o confete JÁ EXISTEM no `#winBox`, com
 * animação e tudo. Eles não estavam faltando: estavam sendo desenhados a
 * 96 px no canto inferior direito. A maior parte deste bloco é fazer o que já
 * existe aparecer onde deve.
 *
 * O que de fato falta é o GIF SHINY DO VENCEDOR — e ele tem uma regra que o
 * teste precisa cobrar nos DOIS sentidos: sai shiny quando o jogador tem a
 * skin, e **não sai** quando não tem. Mostrar shiny a quem não desbloqueou é
 * entregar de graça a recompensa que o guarda-roupa do R8 vende por conquista.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');
const APOSTA = ler('../app/modules/aposta.mjs');
const RESULTADO = ler('../app/modules/resultado-tela.mjs');

export function suite() {
  const s = criarSuite('resultado-centro');

  /* --- a classe não atravessa a fase ------------------------------------- */

  /* A asserção é sobre a REMOÇÃO, e não sobre a regra de CSS. Apagar
     `#overlay.apostado` centralizaria o resultado e quebraria a dica da aposta
     junto — os dois casos precisam continuar existindo, cada um na sua fase. */
  s.teste('a classe de aposta não sobrevive ao fim da fase de aposta', () => {
    const fn = APOSTA.match(/function atualizarCTA\(\)\s*\{[\s\S]*?\n\}/);
    ok(fn, 'a `atualizarCTA` sumiu do aposta.mjs — este teste precisa ser refeito');
    /* O ramo que trata "não estamos mais apostando" tem de limpar `apostado`. */
    const saida = fn[0].match(/if \(S\.state !== 'betting'\)\{[^}]*\}/);
    ok(saida, 'o ramo de saída da fase de aposta mudou de forma');
    ok(/remove\([^)]*'apostado'/.test(saida[0]),
      `a classe \`apostado\` fica para trás e leva a contagem e o K.O. para o canto: ${saida[0]}`);
  });

  /* A REMOÇÃO SÓ VALE SE ALGUÉM A EXECUTAR, e essa era a segunda metade do
     defeito. A `atualizarCTA` era chamada apenas de dentro da fase de aposta —
     ao colocar, trocar e cancelar aposta —, então o ramo que limpa a classe
     nunca rodava na transição para a contagem. Quem tem de reavaliá-la é o
     `setPhase`, pelo motivo que o comentário dele já dava antes deste bloco:
     é o único lugar que conhece TODAS as transições, inclusive a volta. */
  s.teste('a troca de fase reavalia o CTA da arena', () => {
    const FASES = ler('../app/modules/fases.mjs');
    const fn = FASES.match(/function setPhase\(s\)\s*\{[\s\S]*?\n\}/);
    ok(fn, 'a `setPhase` mudou de forma — este teste precisa ser refeito');
    ok(/atualizarCTA\(\)/.test(fn[0]),
      'a troca de fase não reavalia o CTA: a classe de aposta fica para trás mesmo com a remoção escrita');
  });

  s.teste('a regra que joga a dica para o canto continua existindo', () => {
    const r = APP.match(/#overlay\.apostado\{[^}]*\}/);
    ok(r, 'a regra `#overlay.apostado` sumiu — a dica da aposta volta a tapar a arena');
    ok(/flex-end/.test(r[0]),
      `a dica da aposta deixou o canto: ${r[0]}`);
  });

  /* --- o vencedor sai shiny SÓ para quem tem a skin ---------------------- */

  /* Os dois sentidos, e o segundo é o que importa: shiny para quem não
     desbloqueou entrega de graça a recompensa que o R8 vende por conquista.
     `gifShinyAtivo` já responde a pergunta certa — o teste cobra que a tela a
     FAÇA, em vez de decidir por conta própria. */
  s.teste('o vencedor consulta a posse da skin antes de sair shiny', () => {
    /* A ASSERÇÃO É DENTRO DA FUNÇÃO, e não no arquivo. Perguntar só se
       `gifShinyAtivo` aparece no arquivo seria satisfeito pela linha de
       `import` — e um `dexImg(..., true)` passaria: shiny para todo mundo, com
       o nome da função de posse presente no texto e nenhuma consulta feita. */
    const fn = RESULTADO.match(/function vencedorImg\([\s\S]*?\n\}/);
    ok(fn, 'a `vencedorImg` sumiu do resultado-tela.mjs — este teste precisa ser refeito');
    /* ── A PERGUNTA MUDOU NO R42, E ESTE TESTE MUDOU COM ELA ──────────────
     *
     * Aqui se exigia `gifShinyAtivo`, que pergunta só a POSSE. Estava certo
     * quando foi escrito e ficou errado depois: o dono do projeto relatou um
     * shiny que ele possui vencendo uma rodada em que ele NÃO apostou, e o
     * campeão apareceu vestindo a skin dele.
     *
     * `shinyNaArena` é a pergunta completa — ter a skin E o lutador ser o
     * escolhido. O teste passa a exigir ELA, e não a antiga; deixar o antigo
     * de pé travaria a correção, que é o pior serviço que um teste presta. */
    ok(/shinyNaArena\(/.test(fn[0]),
      `o retrato do vencedor decide o shiny pela posse solta: ${fn[0]}`);
    ok(!/,\s*true\s*\)/.test(fn[0]),
      'o shiny do vencedor está fixado em verdadeiro: sai para quem não desbloqueou');
    /* `imgTag` não conhece shiny: ele monta o endereço do sprite normal, e com
       ele o GIF nunca alternaria por mais skins que o jogador tivesse.
       `f` é o CAMPEÃO em toda parte deste arquivo — nenhum retrato dele pode
       sair pelo caminho que ignora a skin. São três janelas de fim de rodada
       que o desenham: vitória, retorno devolvido, e vitória sem aposta.
       O `imgTag(meu)` FICA: aquele é o seu lutador CAÍDO, e o comentário do
       código diz isso — "o que interessa aqui é o que aconteceu com o meu".
       Shiny num K.O. não é a comemoração que o bloco pede. */
    ok(!/imgTag\(f\)/.test(RESULTADO),
      'um retrato do campeão ainda sai por `imgTag`: ali o GIF nunca fica shiny');
    ok(/vencedorImg\(f\)/.test(RESULTADO),
      'nenhuma janela usa o retrato que consulta a skin');
  });

  /* --- o que já existia e não pode sumir na mudança ---------------------- */

  /* O bloco anterior mostrou que "mover" é onde as coisas se perdem: o cartão
     `SEU LUTADOR` foi movido uma vez e chegou sem CSS (D-028). Aqui a
     coreografia da vitória já existe e o R5 mexe em volta dela. */
  s.teste('a vitória mantém troféu, saco de dinheiro e confete', () => {
    ok(/class="trophy"/.test(RESULTADO), 'o troféu sumiu da janela de vitória');
    ok(/class="moneybag"/.test(RESULTADO), 'o saco de dinheiro sumiu da janela de vitória');
    ok(/dropConfetti\(/.test(RESULTADO), 'o confete sumiu da vitória');
  });

  /* Decisão do F1.9, e ela não é economia de efeito: quem não apostou não
     ganhou nada, e festa depois de uma rodada pulada é o produto dizendo
     "você perdeu a festa" — a família de mensagem que o §28.7 proíbe. */
  s.teste('quem não apostou não recebe confete', () => {
    /* A FATIA TERMINA NO FIM DO RAMO, e não no fim do arquivo. A primeira
       versão ia até o fim e engolia a própria DEFINIÇÃO de `dropConfetti`, que
       mora abaixo — falso vermelho, e do tipo que se acredita: a mensagem de
       erro estava perfeitamente plausível. */
    const i = RESULTADO.indexOf('SEM APOSTA');
    const fim = RESULTADO.indexOf('refreshOddsTable()', i);
    ok(i > 0 && fim > i, 'o ramo "sem aposta" mudou de forma — refaça este teste');
    const semAposta = RESULTADO.slice(i, fim);
    ok(!/dropConfetti\(/.test(semAposta),
      'o confete chegou ao ramo de quem não apostou: festa por uma rodada que ele pulou');
  });

  return s;
}
