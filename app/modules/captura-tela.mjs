/* A LINHA DO TEMPO DA CAPTURA (bloco 1.23, camada 4 — pura).
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA CONSERTAR ──────────────────────────────
 *
 * Palavra do dono (L-115):
 *
 *   > "hoje a mensagem de captura é muito vaga, ela só aparece embaixo do
 *   >  'mandar expedição' e some rapidamente"
 *
 * O momento mais importante do idle — a criatura entrou ou fugiu — era uma
 * linha de texto que aparecia longe do olho e sumia em quatro segundos. **É o
 * oposto de onde a atenção está**: o jogador acabou de clicar numa bola e está
 * olhando o cartão do encontro.
 *
 * ── A REFERÊNCIA FOI VISTA, E ELA NÃO É O QUE EU IMAGINAVA ────────────────
 *
 * O dono plantou `catchpokeball.gif` na pasta sem avisar. Montei a folha de
 * contato e OLHEI os 119 quadros:
 *
 *     abre  ->  achata em três linhas  ->  remonta  ->  fecha
 *
 * **Não há chacoalhada e não há final.** Ele dá o movimento da bola; o resto é
 * nosso. E é bom que seja, porque a captura tem DOIS finais e um gif tem um.
 *
 * ── AS SEIS FASES, E A QUARTA É A ANIMAÇÃO INTEIRA ───────────────────────
 *
 *     voo         a bola vai do cartão até a criatura, num arco
 *     abrir       ela abre; a criatura vira luz e é puxada para dentro
 *     fechar      fecha e cai
 *     chacoalhar  TRÊS balanços, com PAUSA CRESCENTE entre eles
 *     veredito    trava com estrelas, ou abre e devolve a criatura
 *     laudo       o popup, que ESPERA ser lido
 *
 * > **A pausa entre os balanços é o suspense.** Sem ela o resto é decoração —
 * > é a mesma lição da evolução do 1.21, onde a alternância acelerando é o que
 * > separa "está chegando" de "está travando".
 *
 * E as pausas CRESCEM — 200, 280, 360 — porque tensão que não aperta não é
 * tensão. Constante lê como relógio; crescente lê como decisão sendo tomada.
 *
 * ── TRÊS BALANÇOS SEMPRE, E ISSO É DECISÃO ───────────────────────────────
 *
 * A série varia o número de balanços conforme o quanto faltou. Aqui **são
 * sempre três**, e o motivo é de jogo, não de arte:
 *
 *   > Um número de balanços que depende do resultado ENTREGA o resultado
 *   > antes da hora — e o jogador aprende a parar de assistir no primeiro.
 *
 * A informação que a série dá no balanço, a nossa dá DEPOIS, no laudo: a chance
 * que estava em jogo. Informação depois do fato não mata a tensão; informação
 * durante mata.
 *
 * ── E ELA CABE EM 3,8 s, QUE É PERTO DO PRÓPRIO GIF ──────────────────────
 *
 * A evolução do 1.21 leva 5,8 s e isso está certo: evolução é rara. **Captura
 * acontece a cada encontro.** Uma espera de 5 s repetida vinte vezes numa
 * expedição vira imposto, e o dono deixa esta aba aberta por horas.
 *
 * Por isso ela é curta e **pulável** — clique ou Esc, como a evolução. O laudo
 * fica de pé depois, porque é ele que carrega a informação.
 */
import { PACK } from './motor.mjs';
import { corDaBola } from './bola-cores.mjs';

/* As casas da tira `assets/icones/bola-captura.png`, medidas pelo
   `tools/folha-captura.mjs`: 24 colunas × 3 linhas (poke, great, ultra). */
export const CASAS = 24;
export const LINHAS = ['poke', 'great', 'ultra'];
export const CASA_FECHADA = 0;
export const CASA_ABERTA = 12;      /* a bola achatada — a criatura está dentro */
export const CASA_TRAVADA = CASAS - 1;

/* ── A CRIATURA PRECISA SER VISTA ANTES DA BOLA ────────────────────────
   Medido olhando a captura: sem esta fase a criatura aparecia durante o VOO —
   380 ms — e sumia. O jogador mal registrava em QUEM estava jogando, e a cena
   que escurece a página inteira gastava esse escuro sem apresentar ninguém.

   Meio segundo parado é o que separa "uma bola apareceu" de "eu estou tentando
   pegar ESTE bicho". */
export const MS_ENTRADA = 420;
export const MS_VOO = 380;
export const MS_ABRIR = 700;
export const MS_FECHAR = 520;
export const MS_BALANCO = 240;
export const PAUSAS = [200, 280, 360];
export const MS_VEREDITO = 620;

export const BALANCOS = PAUSAS.length;

/* O tempo da chacoalhada inteira. Existe como função e não como constante
   porque ele é a SOMA de duas listas, e uma soma escrita à mão envelhece na
   primeira vez que alguém mexe numa das duas. */
export const msDoChacoalho = () =>
  BALANCOS * MS_BALANCO + PAUSAS.reduce((a, b) => a + b, 0);

export const msTotal = () =>
  MS_ENTRADA + MS_VOO + MS_ABRIR + MS_FECHAR + msDoChacoalho() + MS_VEREDITO;

/* ── AS FASES, COM INÍCIO E FIM ──────────────────────────────────────────
 *
 * Devolve a linha do tempo inteira, e não "a fase agora": assim o teste
 * consegue afirmar a ORDEM e a DURAÇÃO sem relógio, e a cena só precisa agendar.
 * Foi o que faltou na primeira versão da transição de evolução, e o teste dela
 * teve de medir com `setTimeout` — que é medir o relógio, não o desenho. */
export function fases() {
  const out = [];
  let t = 0;
  const por = (nome, ms) => { out.push({ nome, de: t, ate: t + ms, ms }); t += ms; };
  por('entrada', MS_ENTRADA);
  por('voo', MS_VOO);
  por('abrir', MS_ABRIR);
  por('fechar', MS_FECHAR);
  for (let i = 0; i < BALANCOS; i++) {
    por(`balanco${i + 1}`, MS_BALANCO);
    por(`pausa${i + 1}`, PAUSAS[i]);
  }
  por('veredito', MS_VEREDITO);
  return out;
}

/* ── QUAL CASA DA TIRA, EM CADA INSTANTE ─────────────────────────────────
 *
 * A tira é simétrica de propósito: 0→12 abre, 12→23 fecha. A fuga percorre
 * 23→12 de volta, e é por isso que a mesma folha serve aos dois finais — a
 * economia não é de bytes, é de COERÊNCIA: a bola que abre para soltar é
 * literalmente a mesma que abriu para engolir. */
export function casaEm(ms, { pegou = true } = {}) {
  const t = Math.max(0, ms);
  if (t < MS_ENTRADA + MS_VOO) return CASA_FECHADA;
  const a = t - MS_ENTRADA - MS_VOO;
  if (a < MS_ABRIR)
    return Math.min(CASA_ABERTA, Math.floor(a / MS_ABRIR * (CASA_ABERTA + 1)));
  const f = a - MS_ABRIR;
  if (f < MS_FECHAR)
    return CASA_ABERTA + Math.min(CASAS - 1 - CASA_ABERTA,
      Math.floor(f / MS_FECHAR * (CASAS - CASA_ABERTA)));
  const c = f - MS_FECHAR;
  if (c < msDoChacoalho()) return CASA_TRAVADA;
  /* O VEREDITO. Quem pegou fica na bola travada; quem fugiu vê a bola abrir de
     novo, e a criatura volta de dentro dela. */
  if (pegou) return CASA_TRAVADA;
  /* A ABERTURA DA FUGA E ADIANTADA — expoente < 1 joga o movimento para o
     comeco. Linear, a bola passava metade do veredito quase FECHADA enquanto a
     criatura ja estava de volta na tela: as duas metades da mesma frase fora de
     ordem. Medido olhando um quadro em 3.720 ms.

     A bola arrebenta, E ENTAO o bicho sai dela. */
  const v = Math.min(1, (c - msDoChacoalho()) / MS_VEREDITO) ** 0.55;
  return Math.round(CASA_TRAVADA - v * (CASA_TRAVADA - CASA_ABERTA));
}

/* A linha da tira, pela bola usada. Bola desconhecida cai na primeira — e cair
   na primeira é melhor que não desenhar: uma bola nova no pack apareceria como
   captura sem animação nenhuma, que é o defeito que este bloco existe para
   tirar. */
export const linhaDaBola = id => {
  const i = LINHAS.indexOf(String(id));
  return i < 0 ? 0 : i;
};

/* ── O QUE A TELA DIZ, EM CADA FASE ──────────────────────────────────────
 *
 * Curto e presente. O texto acompanha o desenho em vez de explicá-lo — quem
 * está olhando uma bola balançar não lê uma frase de duas linhas. */
export function falaDe(fase, nome) {
  /* O NOME APARECE NA ENTRADA, que é a fase que existe para apresentá-lo. */
  if (fase === 'entrada') return `${nome}`;
  if (fase === 'voo') return `${nome}`;
  if (fase === 'abrir') return `${nome}!`;
  if (fase === 'fechar') return '';
  if (fase?.startsWith?.('balanco') || fase?.startsWith?.('pausa')) return '…';
  return '';
}

/* ── O PALCO, EM TEXTO ───────────────────────────────────────────────────
 *
 * String, e não DOM: assim o teste confere o que a tela promete sem abrir
 * navegador. A criatura entra depois, na cena — `sprites.mjs` toca `document`
 * na carga, e importá-lo aqui tiraria a pureza que torna este arquivo
 * conferível. Mesma divisão da transição de evolução.
 *
 * `--linha` é a bola usada; `--casa` é o quadro. Os dois em VARIÁVEL e não em
 * `background-position` escrito à mão, porque em porcentagem o CSS calcula
 * `(caixa − imagem) × pct` e a tira some da tela — foi o defeito do selo da
 * Pokébola no 1.20, e ele custou uma rodada inteira de "está invisível". */
export function montar(dex, bola) {
  return `
    <div class="capCena" data-fase="voo" data-dex="${dex}"
         style="--linha:${linhaDaBola(bola)};--casa:0;--bolaCor:${corDaBola(bola)}">
      <div class="capPalco">
        <img class="capAlvo" alt="" aria-hidden="true">
        <i class="capChao" aria-hidden="true"></i>
        <i class="capOnda" aria-hidden="true"></i>
        <i class="capBola" aria-hidden="true"></i>
        <i class="capFaisca" aria-hidden="true"></i>
      </div>
      <span class="capFala" aria-live="polite"></span>
      <button type="button" class="capPular" data-cap-pular>pular</button>
    </div>`;
}

/* O laudo desenhado. Ele **espera ser lido** — pedido literal do dono —, então
   tem botão e não tem relógio. A faixa colorida diz o tom antes da frase. */
export function laudoHtml(l) {
  return `
    <div class="capLaudo cap-${l.tom}" role="dialog" aria-live="assertive">
      <b class="capTitulo">${l.titulo}</b>
      <span class="capLinha">${l.linha}</span>
      ${l.nota ? `<i class="capNota">${l.nota}</i>` : ''}
      <button type="button" class="btn capOk" data-cap-fechar>continuar</button>
    </div>`;
}

/* ── O LAUDO, QUE É O QUE FICA ───────────────────────────────────────────
 *
 * O popup espera ser lido — pedido literal do dono. E ele carrega a informação
 * que a chacoalhada de propósito NÃO entrega: a chance que estava em jogo.
 *
 * A frase da falha é escolhida pela chance, e não é enfeite: *"faltou pouco"*
 * com 4% seria mentira, e mentira num laudo ensina o jogador a ignorá-lo. */
export function laudo({ pegou, nome, chance = null, foiParaCaixa = false, bola = null }) {
  const pc = Number.isFinite(chance) ? Math.round(chance * 100) : null;
  const rotuloBola = (PACK.bolas ?? []).find(b => b.id === bola)?.rotulo ?? null;
  if (pegou) {
    return {
      tom: 'pegou',
      titulo: `${nome} foi capturado!`,
      linha: foiParaCaixa
        ? 'A equipe estava cheia — ele foi para a CAIXA.'
        : 'Ele entrou na sua equipe.',
      nota: pc == null ? null : `a chance era de ${pc}%`,
    };
  }
  const quase = pc != null && pc >= 55;
  return {
    tom: 'fugiu',
    titulo: `${nome} escapou.`,
    linha: rotuloBola
      ? `A ${rotuloBola} foi embora com ele.`
      : 'A bola foi embora com ele.',
    nota: pc == null ? null
      : quase ? `a chance era de ${pc}% — faltou pouco`
              : `a chance era de ${pc}%`,
  };
}
