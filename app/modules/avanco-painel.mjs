/* A LEITURA DA RUN — a coluna da esquerda (blocos A4f/A4g, camada 4).
 *
 * Saiu do `avanco-tela.mjs` quando ele passou de 600 linhas, e a divisão é por
 * RESPONSABILIDADE — que aqui cai numa linha limpa, porque são duas perguntas
 * diferentes que o jogador faz em tempos diferentes:
 *
 *     avanco-painel   O QUE ESTÁ ACONTECENDO — stamina, vínculo, log, análise.
 *                     Ele LÊ. Nada aqui pede a mão dele.
 *     avanco-tela     O QUE ELE FAZ — a poção, a bola, recuar, colher, e a
 *                     ligação dos cliques. Ele AGE.
 *
 * A prova de que a linha é de responsabilidade e não de tamanho: este arquivo
 * não tem um único ouvinte de evento, e o outro tem todos.
 *
 * ── E ELE É A METADE QUE O DONO COBROU TRÊS VEZES ────────────────────────
 *
 * A L-141 — o quadro de log — voltou em três sessões seguidas, e na terceira
 * com endereço: *"estou sentindo falta da box do Hunt Analyzer que tinha na
 * prévia, com tempo da run, xp etc."*. Ela está desenhada e aprovada em
 * `app/previa-avanco.html`, e chegou aqui pela metade.
 *
 * O mesmo quadro serve aos DOIS modos (§7.22.16): o relatório de quando o
 * jogador volta de uma Vigília é esta caixa vista do outro lado. Duas peças
 * para "como está indo" e "como foi" divergiriam no primeiro bloco que
 * mexesse numa só.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { criaturasDe, acharCriatura } from './idle-dados.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { nomesDe } from './itens-nome.mjs';
import { estiloItem } from './itens-icone.mjs';
import { estiloIcone } from './icones.mjs';
import { PERFIL_DO_AVANCO } from './avanco-estado.mjs';
import { WAVES } from '../../engine/wave.mjs';
import { STAMINA_DO_AVANCO, staminaAteWave, ganhoDaRun } from '../../engine/avanco.mjs';
import { staminaAgora } from '../../engine/expedicao.mjs';
import { leituraDoFoco } from './avanco-foco.mjs';

const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };
const nome = dex => nomeExibido(esp(dex).n);

/* O relógio da coluna: mm:ss enquanto couber, h:mm:ss quando passar da hora. */
const relogio = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dois = n => String(n).padStart(2, '0');
  return h ? `${h}:${dois(m)}:${dois(r)}` : `${dois(m)}:${dois(r)}`;
};

/* ── A STAMINA DA EQUIPE ──────────────────────────────────────────────────
 *
 * O relógio ENTRE avanços, ao lado do HP que é o relógio DENTRO deles. Duas
 * barras para dois horizontes, e é o que faz a decisão existir nos dois:
 * gastar a poção agora, ou guardar a criatura para o próximo avanço. */
function pintarStamina(E, run, agora) {
  const alvo = $('#avStamina');
  if (!alvo) return;
  const custo = staminaAteWave(run.wave);
  alvo.innerHTML = (run.equipe ?? []).map(id => {
    const c = acharCriatura(E, id);
    if (!c) return '';
    const s = Math.round(staminaAgora(c, agora));
    /* ── A CARA, E NÃO SÓ O NOME ─────────────────────────────────────
       Pedido do dono: *"adiciona um gif animado do pokémon selecionado"*.

       O GIF e não o PNG porque esta é a criatura que está LUTANDO agora, e
       um sprite parado ao lado de uma barra que desce lê como retrato de
       ficha. `retratoAnimado` já cai no estático sozinho se a animação não
       responder — perder o movimento é detalhe, perder o bicho não é. */
    return `<div class="avQuem">` +
      retratoAnimado(esp(c.dex), 'class="avQuemArte"', !!c.shiny) +
      `<div class="avQuemTxt">` +
      `<div class="avLinha"><span>${nome(c.dex)}</span>` +
      `<span>${s} / 100</span></div>` +
      `<div class="avBarra"><i style="width:${s}%"></i></div>` +
      `</div></div>`;
  }).join('') +
    `<div class="avLinha"><span>esta run já custou</span><span>${custo}</span></div>` +
    `<div class="avLinha"><span>o estágio inteiro custa</span>` +
    `<span>${STAMINA_DO_AVANCO}</span></div>`;
}

/* ── O FOCO — e o que ele vale AQUI (item 1 da ordem do dono) ─────────────
 *
 * Esta coluna nasceu para o VÍNCULO, na L-145, e a razão era boa: ele decidia
 * combate desde o A2 — até +25% de poder — e não aparecia em lugar nenhum.
 *
 * ── E AÍ O DONO TIROU O VÍNCULO DO COMBATE ──────────────────────────────
 *
 *   > "O vínculo não ia ficar pra GEN 2? Porque ele aparece, tem muita coisa
 *   >  confusa, papo reto."
 *
 * `POR_VINCULO` foi a zero, e a coluna passou a mostrar uma barra somando
 * **+0% de poder**. Isso é pior que não mostrar nada: ela ocupava a atenção de
 * quem assiste por horas para dizer que não fazia diferença.
 *
 * ── O QUE ELE PEDIU NO LUGAR, e o pedido é o mesmo ──────────────────────
 *
 *   > "mas é necessário alguma outra forma de se visualizar o futuro foco do
 *   >  pokémon que é escolhido no lv 12"
 *
 * O foco é a única coisa da criatura que sai do JOGADOR — sorte, tempo e
 * escolha, e ele é a escolha. Aqui ele decide o baú (trilheiro, sortudo) e o
 * poder (guia). É exatamente o que esta coluna existe para dizer.
 *
 * ── E ELE DIZ O QUE VALE *AQUI*, E NÃO O QUE VALE EM GERAL ──────────────
 *
 * Dois dos cinco não fazem nada no Avanço: o Batedor é da Batida e o Vigia é
 * da Vigília, e o efeito INTEIRO é neutro fora do perfil deles. Há ainda uma
 * segunda camada, que é do Avanço: o elenco do estágio é FIXO em seis, então
 * `encontros` não muda nada — não há encontro a mais para achar.
 *
 *   > Tela que promete o que não acontece é a tela discordando do motor, e
 *   > numa tela aberta por horas o jogador tem tempo de perceber.
 *
 * Quem sabe separar isso é o `efeitoVivo` do motor. Esta coluna só escolhe as
 * palavras.
 *
 * ── E O "FUTURO" É A METADE QUE IMPORTA ─────────────────────────────────
 *
 * Quem não chegou ao nível 12 não tem foco. Sem dizer QUANDO ele chega, o
 * jogador de nível 7 lê uma linha vazia e conclui que aquilo não é para ele —
 * e o foco é justamente o sistema que precisa ser DESCOBERTO para existir. */

function pintarBuffs(E, run, agora) {
  const alvo = $('#avBuffs');
  if (!alvo) return;
  const vivas = criaturasDe(E);
  alvo.innerHTML = (run.equipe ?? []).map(id => {
    const c = vivas.find(x => x.id === id);
    if (!c) return '';
    /* A LEITURA VEM PRONTA, e este arquivo só a veste. Ver o cabeçalho do
       `avanco-foco.mjs`: enquanto as frases moravam aqui dentro, dois defeitos
       plantados passaram por não haver como afirmá-las sem um navegador. */
    const l = leituraDoFoco(c, { perfil: PERFIL_DO_AVANCO, agora });
    const estilo = l.cor ? ` style="--corFoco:${l.cor}"` : '';

    /* O ÍCONE PADRÃO, e não o gif: aqui a pergunta é "de quem é este foco", e
       ela se responde com a mesma cara que o jogador vê na Pokédex e na
       equipe. Duas artes para a mesma identidade obrigariam ele a aprender
       duas. */
    return `<div class="avBuff">` +
      `<b class="avBuffQuem">` +
      dexImg(c.dex, esp(c.dex).n, 'class="avBuffArte"', !!c.shiny) +
      `${nome(c.dex)} <u>lv ${Math.floor(Number(c.nivel) || 1)}</u></b>` +
      `<div class="avFocoLinha">` +
      `<b class="avFoco ${l.estado}"${estilo}>${l.selo}</b>` +
      `<span>${l.linha}</span></div></div>`;
  }).join('');
}

/* ── O LOG DA RUN — a L-141 ───────────────────────────────────────────────
 *
 * A dívida que o dono cobrou duas vezes. A diferença para o painel da
 * referência é o ÍCONE DE CRIATURA, e não só o de item: o jogador não está
 * assistindo "mobs", está esperando o casulo que falta na linha dele.
 *
 * E ele lê da MESMA lista que o relatório de volta vai ler (§7.22.16) — as
 * duas peças são uma, e não duas que precisam concordar.
 *
 * O MAIS NOVO EM CIMA. Numa tela que fica aberta por horas, o olho volta
 * sempre ao mesmo canto; um log que cresce para baixo obriga a rolar para
 * saber o que mudou, e quem está vendo um filme ao lado simplesmente não rola. */
/* ── O QUE CADA EVENTO VIRA NA TELA ──────────────────────────────────────
 *
 * Uma tabela e não um `switch`: o log precisa aceitar tipo novo sem que
 * ninguém mexa no laço que desenha. Hoje a run emite quatro; o baú (1.29) e o
 * treinador na run (1.27) entram aqui com uma linha cada.
 *
 * Cada entrada devolve `{ classe, icone, texto, qtd }`. `icone` é HTML —
 * pode ser um glifo ou um `<img>`, e é por isso que o item e a criatura cabem
 * na mesma coluna sem dois desenhos diferentes. */
/* ── É O ÍCONE DO "QUEM APARECEU", e o pedido foi literal ────────────────
 *
 *   > "no log da run os pokémon eu quero aquele ícone que usamos no
 *   >  'QUEM APARECEU' e não o que você colocou"
 *
 * O motivo é o mesmo que fez aquele ícone existir: o quadro de encontros
 * trocou o retrato grande pelo recorte de cabeça porque aquela tela é uma
 * LISTA. O log é a mesma coisa — uma linha por evento, dezoito px de altura —
 * e retrato inteiro em dezoito px vira mancha. A coluna existe para
 * reconhecer o bicho, e ela estava impedindo isso.
 *
 * A MESMA `estiloIcone`, e não uma cópia: duas maneiras de desenhar a mesma
 * cabeça terminam com uma folha nova num lugar e a antiga no outro, e o
 * jogador aprende que os dois ícones são coisas diferentes.
 *
 * O RECUO PARA O RETRATO FICA. `estiloIcone` devolve `null` para quem está
 * fora da folha, e um recorte fora dela desenharia um quadrado transparente —
 * um buraco silencioso na lista, que é pior que um retrato feio. */
const carinha = dex => {
  const est = estiloIcone(PACK, dex, 18);
  return est
    ? `<i class="avPastIcone" style="${est}" aria-hidden="true"></i>`
    : dexImg(dex, esp(dex).n, 'class="avPastArte"');
};

const ROTULO = {
  apareceu: ev => ({ icone: carinha(ev.dex), texto: `${nome(ev.dex)} apareceu` }),
  caiu: () => ({ classe: 'perdeu', icone: '✖', texto: 'a sua equipe caiu' }),
  limpou: () => ({ classe: 'venceu', icone: '👑', texto: 'estágio limpo — o baú é seu' }),

  /* ── O ITEM E O TREINADOR JÁ TÊM LUGAR, e ainda não têm quem os emita ──
     Pedido do dono, e ele está certo sobre o desenho: *"qualquer item que
     aparecer ali também deve aparecer ícone; para batalhas com treinador NPC,
     o nome do treinador e algum ícone pra diferenciar"*.

     Hoje a run não produz nem um nem outro — o item cai no BAÚ, na colheita, e
     o treinador só existe na expedição. As duas metades que faltam estão
     registradas na L-155, com bloco dono.

     A linha fica escrita porque o custo dela é uma entrada de tabela, e o
     custo de NÃO escrevê-la é o próximo bloco redesenhar o log inteiro. */
  item: ev => ({ classe: ev.raro ? 'raro' : 'bom',
                 icone: `<i class="avPastItem" style="${estiloItem(ev.item) || ''}"></i>`,
                 texto: nomesDe(ev.item)?.nome ?? ev.item,
                 qtd: ev.quantos ? '×' + ev.quantos : '' }),
  /* ── O CLIMA DA RUN (1.32) ──────────────────────────────────────────
     Três estados, e o do MEIO é o que mais ensina: caiu um clima que paga e
     ninguém da equipe é do tipo. Ele sai em cinza e diz PARA QUEM o bônus
     seria — é o que faz o jogador escolher diferente na run seguinte.

     A frase vem pronta do `avanco-clima.mjs`, camada 0. Montá-la aqui
     dentro da tabela a deixaria colada na `innerHTML` do log, e conta que só
     o navegador confere acaba conferida por ninguém. */
  clima: ev => ({ classe: ev.estado === 'ativo' ? 'venceu' : '',
                  icone: ev.emoji || '🌤',
                  texto: `${ev.nome} — ${ev.frase}`,
                  qtd: ev.pct > 0 ? '+' + ev.pct + '%' : '' }),
  npc: ev => ({ classe: ev.venceu ? 'venceu' : 'perdeu', icone: '👤',
                texto: `${ev.nome ?? 'Treinador'} — ${ev.venceu ? 'vitória' : 'derrota'}`,
                qtd: ev.xp ? '+' + ev.xp + ' XP' : '' }),
};

function pintarLog(run, agora) {
  const alvo = $('#avLog');
  if (!alvo) return;
  const eventos = [...(run.eventos ?? [])].reverse().slice(0, 60);
  alvo.innerHTML = eventos.map(ev => {
    const quando = relogio(Math.max(0, agora - ev.em));
    if (ev.tipo === 'wave') {
      /* ── VERDE E VERMELHO, e não uma cor só ────────────────────────
         Pedido do dono: *"wave vencida fica marcado em verde, perdida fica em
         vermelho, pode ser estilo neon no nosso tema"*.

         São as duas linhas que mais se repetem no log — dez waves, e cada
         derrota repete a wave. Sem cor, o jogador tem de LER cada uma para
         saber como a run está indo; com cor, ele responde de relance, que é
         a única coisa que uma tela de fundo consegue pedir de quem está
         vendo um filme ao lado. */
      const quantos = (ev.comp ?? []).reduce((a, x) => a + x.quantos, 0);
      return ev.venceu
        ? linha('venceu', quando, '⚔', `wave ${ev.wave} vencida`, `${quantos} abates`)
        : linha('perdeu', quando, '✖', `wave ${ev.wave} perdida — ela repete`, '');
    }
    const r = (ROTULO[ev.tipo] ?? (e => ({ texto: e.tipo })))(ev);
    return linha(r.classe ?? '', quando, r.icone || '👣', r.texto, r.qtd ?? '');
  }).join('');
}

const linha = (classe, quando, icone, texto, qtd) =>
  `<div class="avEvt ${classe}"><span class="quando">${quando}</span>` +
  `<span class="avPast">${icone}</span><span>${texto}</span>` +
  `<span class="qtd">${qtd}</span></div>`;

/* ── O HUNT ANALYZER — a L-141, cobrada três vezes ───────────────────────
 *
 * O dono, com a tela na mão:
 *
 *   > "estou sentindo falta também da box do Hunt Analyzer que tinha na
 *   >  prévia, com tempo da run, xp etc."
 *
 * Ele tem razão e o endereço: a caixa está desenhada em `previa-avanco.html`,
 * foi aprovada ali, e chegou aqui pela metade — só abates e espécies.
 *
 * ── E ELE SERVE AOS DOIS MODOS ─────────────────────────────────────────
 *
 * É a mesma peça que o relatório de volta da Rota OFF vai mostrar (§7.22.16).
 * Uma tela para "como está indo" e outra para "como foi" seriam duas peças que
 * precisam concordar — e elas divergem no primeiro bloco que mexer numa só.
 *
 * ── O QUE ELE NÃO MOSTRA, E POR QUE NÃO É ESQUECIMENTO ─────────────────
 *
 * A MOEDA. Ela nasce de um ramo da semente que só existe na COLHEITA (§25.2):
 * guardada antes, o resultado ficaria horas legível a um F12 de distância.
 * Mostrar uma estimativa aqui seria inventar um número que o fecho vai
 * desmentir — e um painel que desmente a si mesmo é pior que um campo a menos.
 * Ela entra nesta mesma caixa quando a run fecha. */
function pintarResumo(run, agora) {
  const alvo = $('#avResumo');
  if (!alvo) return;
  const abates = (run.abates ?? []).reduce((a, x) => a + x.quantos, 0);
  const vistas = (run.apareceram ?? []).length;

  /* O TEMPO É O DA RUN, e não o do relógio de parede: a run começou quando o
     jogador clicou, e é essa a duração que ele compara entre estágios. */
  const decorrido = Math.max(0, (run.fim?.em ?? agora) - (run.iniciadaEm ?? agora));

  /* ── O XP SAI DA MESMA FUNÇÃO QUE PAGA ─────────────────────────────
     `ganhoDaRun` é a que credita no fecho. Uma conta parecida escrita aqui
     divergiria dela no dia em que o abate fosse recalibrado — e a que mente
     seria sempre a da tela, porque é a que ninguém testa contra o bolso. */
  const xp = ganhoDaRun({ abates, encontros: vistas, perfil: PERFIL_DO_AVANCO }).xp;

  alvo.innerHTML =
    `<div class="avLinha"><span>tempo da run</span><span>${relogio(decorrido)}</span></div>` +
    `<div class="avLinha"><span>XP até aqui</span><span>${xp.toLocaleString('pt-BR')}</span></div>` +
    `<div class="avLinha"><span>abates</span><span>${abates} de ~58</span></div>` +
    `<div class="avLinha"><span>espécies vistas</span><span>${vistas} de 6</span></div>` +
    /* O BAÚ É UM ESTADO, e não um número: §7.22.8 — falhar custa o baú e
       nunca o farm, e o jogador precisa saber disso ANTES de recuar. */
    `<div class="avLinha"><span>o baú do estágio</span><span class="${run.fim?.completou ? 'avBom' : ''}">` +
    `${run.fim?.completou ? 'aberto' : run.fim ? 'perdido' : `abre na wave ${WAVES}`}</span></div>`;
}

/* A COLUNA INTEIRA, numa chamada. Quem desenha a run não precisa saber que ela
   tem quatro painéis — e no dia em que tiver cinco, quem chama não muda. */
export function pintarColunaDaRun(E, run, agora) {
  pintarStamina(E, run, agora);
  pintarBuffs(E, run);
  pintarLog(run, agora);
  pintarResumo(run, agora);
}
