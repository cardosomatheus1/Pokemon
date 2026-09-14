/* GERA O PDF DE PATCHNOTES.
 *
 * O Chromium do portão Q5 imprime — então o PDF sai sem dependência nenhuma, do
 * mesmo jeito que as capturas saem. Uso:
 *
 *     node tools/patchnotes.mjs
 *
 * A fonte é este arquivo, e não o `git log`. Foi escolha: o log é escrito para
 * quem conhece o código, e este documento é para quem NÃO conhece — ele conta o
 * que mudou no JOGO, não no repositório. Traduzir um do outro automaticamente
 * daria um texto que ninguém entende, com a aparência de ter sido escrito.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
if (!PW || !CHROME) { console.error('PW_MODULO e PW_CHROME não definidos.'); process.exit(1); }
const { chromium } = await import(pathToFileURL(PW).href);

const RAIZ = join(dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const SAIDA = join(RAIZ, 'docs', 'PATCHNOTES.pdf');

const HTML = String.raw`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>PokéArena — o que mudou</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box }
  body { margin:0; font:11.5pt/1.55 Georgia, 'Times New Roman', serif; color:#1a1d24 }
  h1 { font:600 26pt/1.15 'Segoe UI', system-ui, sans-serif; margin:0 0 4px; letter-spacing:-.5px }
  .sub { font:11pt/1.4 'Segoe UI', system-ui, sans-serif; color:#5b6472; margin:0 0 26px }
  h2 { font:600 15pt/1.25 'Segoe UI', system-ui, sans-serif; color:#0d3b66;
       margin:26px 0 8px; padding-bottom:5px; border-bottom:2px solid #d7e3f0;
       break-after:avoid }
  h3 { font:600 12pt/1.3 'Segoe UI', system-ui, sans-serif; margin:16px 0 4px;
       break-after:avoid }
  p { margin:0 0 10px }
  ul { margin:0 0 12px; padding-left:19px }
  li { margin:0 0 5px }
  b { color:#0d3b66 }
  .lead { background:#f3f7fb; border-left:3px solid #0d3b66; padding:11px 14px;
          margin:0 0 18px; font-size:11pt }
  .porque { background:#fbf7ee; border-left:3px solid #b8892b; padding:9px 13px;
            margin:8px 0 14px; font-size:10.5pt }
  .porque b { color:#8a6416 }
  table { width:100%; border-collapse:collapse; margin:8px 0 16px; font-size:10pt;
          font-family:'Segoe UI', system-ui, sans-serif }
  th { text-align:left; background:#eef4fa; padding:6px 9px; border-bottom:2px solid #d7e3f0;
       font-weight:600; color:#0d3b66 }
  td { padding:6px 9px; border-bottom:1px solid #e8edf3; vertical-align:top }
  .num { font-variant-numeric:tabular-nums; white-space:nowrap }
  code { font:10pt 'Consolas', 'Courier New', monospace; background:#f1f3f6;
         padding:1px 4px; border-radius:3px }
  .fim { margin-top:30px; padding-top:12px; border-top:1px solid #d7e3f0;
         font-size:9.5pt; color:#5b6472 }
  .quebra { break-before:page }
</style></head><body>

<h1>PokéArena — o que mudou</h1>
<p class="sub">Resumo desta rodada de trabalho · 26 de agosto de 2026</p>

<div class="lead">
  <b>Para quem está lendo isto sem conhecer o projeto:</b> o PokéArena é um jogo
  de apostas com <b>moeda simulada</b> — nenhum dinheiro de verdade entra ou sai.
  Doze lutadores são sorteados, o jogo calcula a chance de cada um simulando
  154&nbsp;mil batalhas, o jogador tem trinta segundos para apostar, e a batalha
  corre sozinha. Este documento conta o que ganhou de novo e o que foi
  consertado.
</div>

<h2>O resumo em uma tabela</h2>
<table>
  <tr><th>O quê</th><th>Estado</th></tr>
  <tr><td><b>Liga de Previsão</b> — uma aba nova, para acertar sem apostar</td><td>novo</td></tr>
  <tr><td><b>18 molduras de avatar</b> — o retrato deixa de ser um quadrado solto</td><td>novo</td></tr>
  <tr><td><b>20 artes novas</b> — cenários e avatares, sete deles animados</td><td>novo</td></tr>
  <tr><td><b>Rayquaza contornando a tela</b> — a arte passa a abraçar o jogo</td><td>novo</td></tr>
  <tr><td><b>4 efeitos de nome</b> — Aurora, Pulso, Ouro e Abismo</td><td>novo</td></tr>
  <tr><td>Os efeitos de nome tinham parado de animar</td><td>consertado</td></tr>
  <tr><td>O botão "Iniciar rodada" estava na coluna errada</td><td>consertado</td></tr>
  <tr><td>O shiny aparecia em bicho que não era seu</td><td>consertado</td></tr>
  <tr><td>O shiny <i>não</i> aparecia no banner do perfil</td><td>consertado</td></tr>
</table>

<h2>1 · A Liga de Previsão</h2>

<p>A maior novidade, e a que muda o que dá para fazer no jogo. Até agora só
existia uma forma de participar: <b>apostar</b>. Agora existe uma segunda —
<b>acertar</b>.</p>

<p>Na aba <b>Liga</b>, você distribui um palpite entre os doze lutadores da
rodada que está correndo. Não custa nada, não move seu saldo, e no fim da rodada
o jogo mede o quanto você acertou.</p>

<h3>O que é medido</h3>
<p>A pontuação é de <b>acurácia</b>, não de lucro. Ela usa uma conta padrão de
estatística chamada <i>Brier</i> — quanto <b>menor</b>, melhor. A tela mostra
três números que só fazem sentido juntos:</p>
<ul>
  <li><b>Sua nota</b> — o quanto seus palpites acertaram</li>
  <li><b>O acaso</b> — a nota de quem chuta igual para todos. É a régua</li>
  <li><b>Contra a casa</b> — o quanto você leu melhor (ou pior) que o próprio jogo</li>
</ul>

<div class="porque">
  <b>Por que a grade já vem preenchida:</b> ela começa na leitura da casa, e você
  empurra quem acha que ela subestimou. Pedir doze porcentagens em branco seria
  um formulário que ninguém preenche — e, mais importante, é a <b>discordância</b>
  que interessa. Cada clique é um "aqui o jogo errou", e o desvio ao lado da
  linha registra isso.
</div>

<p>Quem não mexer em nada registra exatamente a leitura da casa. Isso é de
propósito: concordar é um palpite legítimo, e empatar com a casa é o piso
honesto. A Liga premia quem lê <b>melhor</b>.</p>

<p>E ela <b>nunca inventa número</b>: sem rodadas suficientes, a nota aparece
como um traço e o rodapé diz quantas faltam. Um zero ali pareceria "empatei com
a casa", que é muito diferente de "ainda não há o que dizer".</p>

<h2 class="quebra">2 · As 18 molduras de avatar</h2>

<p>O retrato do jogador no banner de batalha era a <b>única foto sem moldura</b>
do jogo — imagem crua largada no canto, com o recorte quadrado à mostra. Agora
ele tem dezoito opções.</p>

<p>Doze delas seguem os doze efeitos de nome que já existiam, então dá para
montar conjunto: quem usa "Chama" no nome tem a moldura Chama. As outras seis são
novas — Placa, Marquise, Campeão, Circuito, Circuito Vivo e Pokébola.</p>

<div class="porque">
  <b>Por que seis são paradas:</b> a estática não é a versão pobre. Gelo parado
  é gelo; gelo animado vira água. E o Abismo <i>é</i> a ausência de luz — piscar
  seria negar o próprio tema. Ter as duas versões também resolve outra coisa:
  quem prefere menos movimento na tela escolhe uma das paradas, em vez de
  receber a animada estragada.
</div>

<h2>3 · As 20 artes novas</h2>

<p>Sete avatares e treze cenários entraram de uma vez, e <b>sete deles são
animados</b> — os primeiros do guarda-roupa que se mexem.</p>

<p>Cada arte passou pela mesma esteira: medir, escolher o corte, olhar no
tamanho real. Isso importa porque <b>onze das treze artes de cenário são
retratos</b>, e os três lugares onde elas aparecem são todos deitados:</p>

<table>
  <tr><th>Onde a arte aparece</th><th class="num">Formato</th></tr>
  <tr><td>faixa do topo da tela</td><td class="num">~32:1 — uma tira</td></tr>
  <tr><td>banner do perfil</td><td class="num">~3,4:1</td></tr>
  <tr><td>banner de batalha</td><td class="num">~1,8:1</td></tr>
</table>

<p>Uma arte muito alta num espaço deitado mostra <b>um quarto</b> da altura
dela. Nesses casos o corte não é ajuste fino — é a decisão inteira. Por isso
cada uma foi apresentada em três recortes (topo, meio e base) e escolhida uma a
uma.</p>

<div class="porque">
  <b>Uma arte virou duas:</b> a base do cenário do Moltres tinha um Machoke e um
  Machop que ninguém tinha notado. Eles apareceram ao olhar a arte inteira antes
  de cortar, e viraram um cenário próprio.
</div>

<h2>4 · O Rayquaza contornando a tela</h2>

<p>A arte do Rayquaza já era o fundo da arena, mas como papel de parede — o
corpo dele ficava cortado nas quatro bordas. Agora ela <b>contorna a página</b>,
como contorna o painel na arte original.</p>

<p>O que destravou isso foi medir a coisa certa: o "visor" da arte e a nossa
página têm <b>exatamente a mesma proporção</b> (1,85:1). Encaixar a arena
sozinha era impossível; encaixar a página inteira é natural.</p>

<p>O olho do bicho <b>acende e apaga devagar</b>, em âmbar — a cor do olho dele
no desenho original. Um ciclo de seis segundos e meio, com o olho apagado a
maior parte do tempo: perto da arena, luz que pisca rápido disputa a atenção com
a luta.</p>

<h2 class="quebra">5 · Os consertos</h2>

<h3>Os efeitos de nome tinham congelado</h3>
<p>As cores ficavam, o movimento não. A causa foi uma linha posta meses antes
para deixar uma medição estável, que sem querer congelou os doze efeitos — mas
só para quem tem "reduzir movimento" ligado no sistema.</p>

<h3>O "Iniciar rodada" estava longe da aposta</h3>
<p>Ele morava na coluna da esquerda. Agora a coluna da direita responde três
perguntas em ordem: <b>quem</b> vence, <b>quanto</b> apostar, <b>quando</b>
começar.</p>

<h3>O shiny aparecia onde não era seu</h3>
<p>Um Pokémon shiny que o jogador possui vencia uma rodada em que ele
<b>não</b> tinha apostado, e a tela de vencedor mostrava o campeão vestindo a
skin dele. Parecia dizer "seu bicho ganhou" com nada dele em jogo.</p>

<h3>E não aparecia onde era</h3>
<p>O contrário, na mesma rodada de consertos: quem desbloqueava a skin, equipava
e escolhia o bicho para o banner do perfil via o Pokémon comum — ao lado do
guarda-roupa que acabava de dizer que a skin estava ativa.</p>

<h2>Como isso é verificado</h2>

<p>Cada mudança destas passou por um processo fixo antes de entrar. O número que
melhor resume:</p>

<table>
  <tr><th>Verificação</th><th class="num">Estado</th></tr>
  <tr><td>testes automáticos</td><td class="num">1113, todos passando</td></tr>
  <tr><td>defeitos plantados de propósito</td><td class="num">503, todos detectados</td></tr>
</table>

<div class="porque">
  <b>O que são "defeitos plantados":</b> o projeto quebra o próprio código de
  propósito, de 503 formas diferentes, e confere que os testes ficam
  <b>vermelhos</b> em cada uma. Um teste que não reprova quando o código quebra
  é decoração — e essa checagem é o que impede a suíte de virar decoração.
</div>

<p>Nesta rodada esse processo pegou <b>quatro testes decorativos</b> escritos
por engano, e um deles é instrutivo: três verificações passavam sobre uma
proteção que já não existia, porque doze das dezoito molduras têm o mesmo nome
dos efeitos, e a função caía na lista errada devolvendo as mesmas respostas.</p>

<div class="fim">
  PokéArena · moeda simulada, sem valor real · este documento cobre a rodada de
  trabalho de 26 de agosto de 2026 · o histórico completo, com o motivo de cada
  decisão, está nas mensagens de commit do repositório
</div>
</body></html>`;

const nav = await chromium.launch({ executablePath: CHROME });
const pg = await nav.newPage();
await pg.setContent(HTML, { waitUntil: 'load' });
await pg.pdf({ path: SAIDA, format: 'A4', printBackground: true });
await nav.close();
console.log(`  ${SAIDA}`);
