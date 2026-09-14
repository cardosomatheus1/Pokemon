/* CONSERTA o `app/index.html`, reconstruindo-o a partir do commit + o 1.32.
 *
 * ── O QUE ACONTECEU ──────────────────────────────────────────────────────
 *
 * Ao separar o bloco do clima do bloco do cartão em dois commits, um script de
 * reversão cortou o arquivo por ÍNDICE DE STRING (`indexOf` + `slice`) e
 * remontou as partes. Uma das âncoras casou no lugar errado, e o resultado foi
 * **3 725 linhas duplicadas**: de 7 861 para 11 586, com zero remoções.
 *
 * O portão pegou, e pegou pelo caminho certo: trinta defeitos plantados
 * passaram a ter ÂNCORA AMBÍGUA, porque o trecho que cada um procura passou a
 * existir duas vezes.
 *
 *   > Editar um arquivo de 8 000 linhas por recorte de string é uma operação
 *   > sem rede. Ela não falha com erro: ela falha com um arquivo que abre,
 *   > roda, e tem metade do conteúdo duas vezes.
 *
 * ── POR QUE A RECONSTRUÇÃO É MAIS SEGURA QUE O CONSERTO ──────────────────
 *
 * Procurar e apagar o trecho duplicado exigiria acertar as mesmas fronteiras
 * que já erraram uma vez. Reconstruir parte de uma base que o git garante —
 * `HEAD:app/index.html` — e reaplica as DUAS inserções do bloco 1.32, que são
 * pequenas e verificáveis uma a uma.
 *
 * Ao fim ele CONFERE: o arquivo tem de ter exatamente o tamanho da base mais o
 * que foi inserido, e nenhum marcador pode aparecer duas vezes.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const ALVO = 'app/index.html';
const base = execSync('git show HEAD:app/index.html', { maxBuffer: 1e9 }).toString();

/* ── 1 · O CSS DO CLIMA, antes do da barra do chefe ────────────────────── */
const CSS = `/* ── O CLIMA DA RUN (1.32) ───────────────────────────────────────────────
   Três estados, três cores, e a diferença entre eles tem de ser legível SEM
   ler o texto — é a mesma exigência do teste dos 3 segundos que o Q7 usa.
     ativo   dourado, a cor do ganho neste projeto (a moeda, o baú, o dano que
             eu dou). O jogador já aprendeu essa cor
     ocioso  ciano apagado: acontecendo, e não é para você
     nenhum  cinza, e continua na tela — ver o comentário no HTML */
.avClima{display:flex; align-items:center; gap:10px}
.avClimaEmoji{font-size:26px; line-height:1; flex:0 0 auto;
  filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}
.avClimaTxt{min-width:0}
/* BLOCO, e não inline. A primeira versão usava dois <span> soltos com um
   margin-top na frase — e margin vertical não vale em elemento inline, então
   os dois saíram COLADOS: a foto do portão mostrou "CHUVAninguém da equipe".
     > O estilo não falhou: ele foi ignorado, que é diferente e mais silencioso.
   É a segunda metade do Q5 fazendo o trabalho dela — nenhum teste verde teria
   dito isso, porque nada estava errado do ponto de vista do código. */
.avClimaNome{display:block; font:800 12px/1.2 var(--dsp); letter-spacing:.06em; text-transform:uppercase}
.avClimaFrase{display:block; margin-top:4px; font-size:11.5px; line-height:1.35; opacity:.86}
.avClima[data-estado="ativo"] .avClimaNome{color:#ffd24a}
.avClima[data-estado="ativo"] .avClimaFrase{opacity:1}
.avClima[data-estado="ocioso"] .avClimaNome{color:#7fd8e8}
.avClima[data-estado="nenhum"] .avClimaNome{color:rgba(255,255,255,.55)}
.avClima[data-estado="nenhum"] .avClimaEmoji{opacity:.55}
/* O SELO DO PORCENTO é o número que o dono pediu para ser sentido. Ele fica
   grande e sozinho: enterrado no meio da frase, ninguém o lê. */
.avClimaPct{margin-left:auto; flex:0 0 auto; padding:3px 9px; border-radius:999px;
  font:800 13px/1 var(--dsp); letter-spacing:.04em;
  color:#1a1206; background:linear-gradient(180deg,#ffd970,#f0b429);
  box-shadow:0 2px 8px rgba(240,180,41,.35)}
`;

/* ── 2 · O CARTÃO, acima do da equipe ──────────────────────────────────── */
const HTML = `        <!-- ── O CLIMA DA RUN (1.32) ────────────────────────────────────
             ACIMA da equipe, e não abaixo: o clima é sobre QUEM você trouxe, e
             a leitura natural é ler a condição e depois olhar o time que a
             aproveita (ou não). Invertido, o jogador lê a equipe, esquece, e
             tem de subir os olhos de volta.

             A linha NÃO SOME quando não há bônus. Some a linha e o jogador
             nunca aprende que clima existe — e o estado mais valioso dos três
             é justamente "caiu um clima e ninguém da sua equipe aproveita",
             que é o que ensina a próxima escolha. -->
        <div class="card avClimaCard" id="avClimaCard" hidden>
          <h3>O clima <span class="tiny" id="avClimaSub"></span></h3>
          <div id="avClima" class="avClima"></div>
        </div>

`;

const ancoraCss = '.avChefe{position:absolute;';
const ancoraHtml = `        <div class="card">
          <h3>Equipe <span class="tiny" id="avEquipeSub"></span></h3>
          <div id="avEquipe"></div>`;

const umaVez = (texto, agulha, nome) => {
  const n = texto.split(agulha).length - 1;
  if (n !== 1) throw new Error(`a âncora "${nome}" casa ${n} vez(es) — esperado 1`);
};

umaVez(base, ancoraCss, 'css do chefe');
umaVez(base, ancoraHtml, 'cartão da equipe');

let saida = base.replace(ancoraCss, CSS + ancoraCss);
saida = saida.replace(ancoraHtml, HTML + ancoraHtml);

/* ── E A CONFERÊNCIA, que é a metade que faltava da primeira vez ───────── */
const linhasBase = base.split('\n').length;
const linhasSaida = saida.split('\n').length;
const esperado = linhasBase + CSS.split('\n').length - 1 + HTML.split('\n').length - 1;
if (linhasSaida !== esperado)
  throw new Error(`saiu com ${linhasSaida} linhas; esperado ${esperado} (base ${linhasBase})`);
for (const marca of ['.avClima{display:flex', 'id="avClimaCard"', '.battle-banner{position:relative',
                     '.criaForma{display:flex', '#idleEquipe,#offEquipe{'])
  umaVez(saida, marca, marca);

writeFileSync(ALVO, saida);
console.log(`ok — ${linhasBase} -> ${linhasSaida} linhas (base + ${linhasSaida - linhasBase} do 1.32)`);
