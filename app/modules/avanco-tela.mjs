/* A TELA DA RUN — bloco A4b (camada 4).
 *
 * As três colunas do arranjo que o dono aprovou em 08/09/2026, ligadas ao
 * motor do §7.22. Este arquivo DESENHA; ele não decide nada.
 *
 * ── O QUE MUDOU DA PRÉVIA PARA CÁ, E POR QUÊ ─────────────────────────────
 *
 * Uma coisa, e ela é grande: **a cena é o cenário do idle, e não uma foto
 * dele**. Ver o comentário longo no CSS e no `avanco-cena.mjs`.
 *
 * ── E A TELA NÃO SABE O QUE É SEMENTE ────────────────────────────────────
 *
 * Ela pergunta ao `avanco-estado.mjs` onde a run está e desenha a resposta.
 * Se recalculasse qualquer coisa — a chance, o dano, quem caiu — passaria a
 * existir uma segunda verdade sobre a run, e um dia as duas discordariam. É a
 * mesma divisão que o `idle-paineis.mjs` registra: quem desenha não guarda, e
 * quem desenha não decide.
 */
import { $ } from './dom.mjs';
import { PACK, nomeExibido } from './motor.mjs';

import { criaturasDe, acharCriatura, vagasDe, proximaVagaDe,
         bolsaEmLista } from './idle-dados.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { FALA as FALA_DO_FOCO } from './idle-foco.mjs';
import { NIVEL_PARA_ESCOLHER as NIVEL_DO_FOCO,
         descansando as descansandoFoco } from '../../engine/foco.mjs';
import { nomesDe } from './itens-nome.mjs';
import { estiloItem, usarCatalogo } from './itens-icone.mjs';
import { PERFIL_DO_AVANCO } from './avanco-estado.mjs';
import { runDe, avancoEmCurso, sincronizar, cena, comecarAvanco, recuar,
         porQueNaoAvancar, avisoDoTeto, usarPocao,
         colherAvancoDaRun, equipeDaRun } from './avanco-estado.mjs';
import { usarCena } from './avanco-cena.mjs';
import { pintarColunaDaRun } from './avanco-painel.mjs';
import { mostrarBioma, acompanhar } from './idle-mundo.mjs';
import { WAVES } from '../../engine/wave.mjs';
import { STAMINA_DO_AVANCO, staminaAteWave, curaDe, ganhoDaRun, falaDoCusto,
         falaDoRendimento, runsNoDia } from '../../engine/avanco.mjs';
import { staminaAgora } from '../../engine/expedicao.mjs';

/* O catálogo do PACK alimenta os ícones, uma vez na carga: o mapa id -> índice
   é do TEMA, e este arquivo só o consome. Mesma linha do `idle-paineis.mjs`. */
usarCatalogo(PACK.catalogo);


const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };
/* O `nomeExibido` recebe o SLUG, e não a espécie — `esp(dex).n`. Passar o
   objeto derruba a aba inteira com `slug.split is not a function`, e a suíte
   fica verde: é exatamente a classe de erro que o portão Q5 existe para pegar,
   e ela me pegou aqui. */
const nome = dex => nomeExibido(esp(dex).n);

/* mm:ss. A run dura ~40 min e a wave 2 a 4; hora cheia seria ruído, e segundos
   sem minutos deixariam de responder "quanto falta". */
const relogio = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* ── A TIRA DAS WAVES ─────────────────────────────────────────────────────
 *
 * O mostrador central da tela: onde estou, quanto falta, e o que vem no fim.
 * A décima se anuncia desde a primeira — é o que faz o jogador saber para o
 * que está guardando a poção, e é a diferença que o §8.1 chama de "onde se
 * aprende a ler o motor". */
function pintarTira(run) {
  const alvo = $('#avTira');
  if (!alvo) return;
  let html = '';
  for (let w = 1; w < WAVES; w++) {
    const classe = w < run.wave ? 'feita' : (w === run.wave ? 'agora' : '');
    html += `<i class="avWv ${classe}"></i>`;
  }
  const chefe = run.wave >= WAVES ? 'agora' : (run.fim?.completou ? 'feita' : '');
  html += `<i class="avWv chefe ${chefe}" title="a décima é dos chefes">👑</i>`;
  alvo.innerHTML = html;
}

/* ── A BARRA DE AÇÃO ──────────────────────────────────────────────────────
 *
 * A POÇÃO e a SAÍDA. A bola saiu daqui no L-166, e a decisão é do dono:
 *
 *   > "a poção pode e deve ser usada durante as waves, porém as bolas, não.
 *   >  Quando você clica em bola simplesmente não avisa nada no log — se
 *   >  capturou, se fugiu, você não sabe o que aconteceu com suas bolas."
 *
 * ── E TIRAR FOI MELHOR QUE CONSERTAR O AVISO ─────────────────────────────
 *
 * Escrever no log "a bola falhou" resolveria a queixa literal e deixaria o
 * problema de pé: durante a wave a tela ANDA, o botão joga a primeira bola da
 * bolsa no primeiro alvo da lista, e não há como comparar nada. A decisão que
 * o §7.22.12 chama de central estava sendo tomada no reflexo.
 *
 * No quadro do fim ela é tomada olhando — todas as espécies, todas as bolas,
 * a chance de cada uma escrita no botão. É a mesma tela que a Rota OFF já usa,
 * então não há uma segunda a aprender.
 *
 * Botão que existe e não faz nada é pior que botão ausente; o que fica é o
 * que ainda se decide DURANTE a wave, e ele diz por que está apagado quando
 * está. */
function pintarAcoes(E, run, cn) {
  const alvo = $('#avAcoes');
  if (!alvo) return;
  /* ── O BOTÃO APAGADO DIZ POR QUE ESTÁ APAGADO ──────────────────────────
     Um ícone cinza sem motivo não ensina nada: o jogador não descobre se
     falta item, se falta alvo, ou se a run não dá espécie hoje. Cada recusa
     aqui tem texto próprio, e é o mesmo princípio do D-067 — uma parede sem
     placa é lida como o fim do jogo. */
  const pocoes = pocoesNaBolsa(E);
  const cheio = cn && cn.hp >= cn.hpMax;

  const porquePocao = !pocoes.length ? 'você não tem poção'
    : cheio ? 'a vida está cheia — guarde a poção'
    : null;

  /* QUANTOS JÁ APARECERAM, e é LEITURA — não botão. O jogador precisa saber
     que a lista está crescendo para querer chegar ao fim; o que ele NÃO pode
     é agir nela agora. Um número que sobe é convite; um botão seria a decisão
     no reflexo de novo.

     ── E ELE CALA QUANDO NÃO HÁ QUADRO (L-151) ──────────────────────────
     Numa run sem teto NINGUÉM vai para o quadro, e o contador dizia
     "1 espécie(s) para o quadro do fim" ao lado da dica que dizia "sem
     encontros hoje". Duas frases verdadeiras que se contradizem valem menos
     que uma só: o jogador acredita na que promete, e descobre a outra no fim.
     Achado no passo OLHAR, e não por teste — a foto tinha as duas na mesma
     linha, a três centímetros uma da outra. */
  const vistos = run.semEncontros ? 0 : (run.apareceram ?? []).length;

  alvo.innerHTML =
    botao('pocao', '🧪 Poção', pocoes[0]?.quantidade ?? '', porquePocao, 'destaque') +
    `<button class="avAcao perigo" data-av="recuar">↩ Recuar</button>` +
    (run.semEncontros ? '' :
      `<span class="avVistos" title="a captura acontece no quadro do fim da run">` +
      `⚪ <b>${vistos}</b> espécie(s) para o quadro do fim</span>`) +
    `<span class="dica">${run.semEncontros
        ? 'sem encontros hoje: a run ainda paga XP, moeda, drops e o baú'
        : 'recuar guarda o que já caiu — só o baú do estágio se perde'}</span>`;
}

const botao = (chave, rotulo, contagem, porque, classe) =>
  `<button class="avAcao ${classe}" data-av="${chave}"${porque ? ' disabled' : ''}` +
  ` title="${porque ?? ''}">${rotulo}` +
  `<b>${porque ? '—' : contagem}</b></button>`;

/* As poções que a bolsa tem AGORA. Saem do catálogo do pack, e não de uma
   lista escrita aqui: um item de cura novo entra sozinho.

   A gêmea das bolas saiu com o botão (L-166) — quem precisa saber quantas
   bolas existem é o quadro do fim, e ele já pergunta à bolsa por conta. */
const pocoesNaBolsa = E => bolsaEmLista(E)
  .filter(x => x.quantidade > 0 && curaDe(PACK, x.id) > 0);

/* ── O CABEÇALHO ──────────────────────────────────────────────────────────
 *
 * Onde estou, em que wave, e quanto falta dela. O relógio conta o que FALTA e
 * não o que passou: numa tela de fundo, "quanto falta" é a única pergunta que
 * o olho faz de passagem. */
function pintarCabeca(run, cn) {
  const onde = $('#avOnde');
  const rel = $('#avRelogio');
  const bioma = (PACK.biomas ?? []).find(b => b.id === run.bioma);
  if (onde) onde.innerHTML =
    `${(bioma?.rotulo ?? run.bioma).toUpperCase()} <u>· estágio ${run.estagio}</u>`;
  if (rel) rel.textContent = cn ? relogio(cn.restam) : '--:--';
}

/* ── O LAÇO ───────────────────────────────────────────────────────────────
 *
 * Um segundo. A cena tem o próprio laço, que é o do mundo e roda a 60; este
 * aqui é o dos NÚMEROS — o relógio, a tira, o log. Repintar texto sessenta
 * vezes por segundo gastaria bateria para redesenhar o mesmo pixel, e numa
 * tela feita para ficar aberta por horas isso não é detalhe. */
let laco = null;
let biomaNaTela = null;
/* O que a última run rendeu, para a tela de escolha poder mostrar. Mora aqui
   e não no estado porque é MENSAGEM, e não dado: some quando a aba fecha, e
   `e.avancos` é só o lançamento do teto das últimas 24 h (D-107); o
   histórico permanente é a L-141, ainda por construir. */
let ultimoSaque = null;
export const saqueDaUltimaRun = () => ultimoSaque;

export function pararLaco() {
  if (laco) { clearInterval(laco); laco = null; }
}

/* ── O DESENHO INTEIRO ────────────────────────────────────────────────────
 *
 * Chamado pelo `renderIdle` e pelo laço. As duas entradas caem no MESMO
 * caminho — é a mesma regra do motor: reabrir a aba e nunca ter fechado
 * precisam produzir a mesma tela, ou existem duas telas do mesmo estado. */
/* Leva o olho ao quadro do fim da run. Fora do `pintarRun` porque ele roda a
   cada segundo e isto acontece UMA vez — misturar as duas cadências no mesmo
   corpo é como um efeito de uma vez vira um efeito de sempre. */
function chamarOQuadro() {
  const q = $('#idleEncontros');
  if (!q) return;
  /* O quadro só ganha conteúdo no próximo desenho: rolar agora levaria a um
     cartão vazio de altura zero. */
  setTimeout(() => {
    try {
      if (!q.children.length) return;
      q.classList.remove('chegou');
      /* Reinicia a animação — sem isto ela só toca na primeira run da sessão,
         porque a classe já estaria lá. */
      void q.offsetWidth;
      q.classList.add('chegou');
      q.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch { /* navegador sem scrollIntoView suave: o quadro está lá do mesmo jeito */ }
  }, 60);
}

export function pintarRun(E, { agora }) {
  const vista = $('#viewIdle');
  const painel = $('#idleRun');
  if (!vista || !painel) return null;

  /* ── A RUN QUE ACABOU É COLHIDA NA HORA ────────────────────────────────
     E não por um botão. A expedição tem botão porque ela termina enquanto o
     jogador está longe — colher é o reencontro. O avanço acaba COM ELE
     OLHANDO: pedir um clique para receber o que ele acabou de ver acontecer
     seria cobrar pedágio de uma porta aberta.

     O saque aparece no log, que é a mesma peça do relatório de volta. */
  const parada = runDe(E);
  if (parada && !avancoEmCurso(E) && !parada.colhidaEm) {
    try {
      const r = colherAvancoDaRun(E, { pack: PACK, agora });
      ultimoSaque = r;
      /* ── E O QUADRO CHAMA (L-166) ────────────────────────────────────
         O jogador acabou de ver a run terminar no meio da tela, e o quadro
         "quem apareceu" nasce ABAIXO da dobra. Sem isto ele fecharia a aba
         sem saber que teve uma decisão a tomar — e o dono chamou esse
         instante de *"AQUELE MOMENTO pra decidir suas capturas"*.

         Rola até ele e pisca duas vezes. Não é enfeite: o quadro tem prazo,
         e prazo que ninguém vê é prazo que ninguém aproveita. Falha em
         silêncio de propósito — o `scrollIntoView` não existe em todo
         navegador antigo, e um erro aqui derrubaria a colheita. */
      chamarOQuadro();
    } catch { /* já colhida noutra aba: nada a fazer, e nada a dizer */ }
  }

  const emRun = avancoEmCurso(E);
  vista.classList.toggle('emRun', emRun);
  painel.hidden = !emRun;
  if (!emRun) { usarCena(null); levarPalco(false); pararLaco(); biomaNaTela = null; return null; }
  levarPalco(true);

  /* O CENÁRIO É O DA RUN, e quem acompanha é quem foi lutar. Sem isto, a run
     da praia aconteceria na floresta que a aba mostrava antes — os bichos
     certos no lugar errado.

     SÓ QUANDO MUDA: `mostrarBioma` repinta o mundo inteiro, e esta função roda
     a cada segundo. Repintar o chão sessenta vezes por minuto para desenhar o
     mesmo chão é o tipo de gasto que só aparece na bateria de quem deixou a
     aba aberta a tarde toda — que é exatamente o nosso jogador. */
  if (biomaNaTela !== runDe(E).bioma) {
    biomaNaTela = runDe(E).bioma;
    mostrarBioma(biomaNaTela);
    acompanhar(acharCriatura(E, runDe(E).equipe[0])?.dex ?? null);
  }

  /* O RELÓGIO ANDA AQUI, e não num lugar próprio: a tela é o único lugar que
     sabe que horas são, e o motor é o único que sabe o que fazer com isso. */
  sincronizar(E, { pack: PACK, agora });
  const run = runDe(E);
  const cn = cena(E, { pack: PACK, agora });

  /* A CENA VAI PARA O LAÇO DO MUNDO, que roda a 60 e desenha os atores. Passar
     por um setter em vez de o mundo perguntar à tela evita o ciclo
     `idle-mundo -> avanco-tela -> idle-mundo`. */
  usarCena(cn);

  pintarCabeca(run, cn);
  pintarHp(cn);
  { const t = $("#avLogTitulo"); if (t) t.textContent = `wave ${run.wave} de ${WAVES}`; }
  pintarTira(run);
  /* A COLUNA DA ESQUERDA mora em `avanco-painel.mjs` — ela LÊ, e este
     arquivo AGE. Ver o cabeçalho de lá. */
  pintarColunaDaRun(E, run, agora);
  /* O CLIMA ANTES DA EQUIPE, na mesma ordem em que a tela os empilha — quem lê
     o código lê a coluna de cima para baixo. */
  pintarClima(leituraDoClima(PACK, run, equipeDaRun(E, PACK, run)));
  pintarEquipe(E, run, agora);
  pintarBolsaDaRun(E);
  pintarChefe(cn, run);
  pintarAcoes(E, run, cn);
  return run;
}

export function ligarLaco(recarregar) {
  pararLaco();
  laco = setInterval(recarregar, 1000);
}

/* ── O PALCO É MOVIDO, E NÃO DUPLICADO ────────────────────────────────────
 *
 * O cenário vive em `#idlePalco`, dentro do cartão da rota. Na run ele precisa
 * estar no meio das três colunas. As duas saídas ruins:
 *
 *     um SEGUNDO palco    dois canvas do mesmo mundo, dois laços, e a certeza
 *                         de que um dia eles mostram lugares diferentes
 *     um palco RECRIADO   o canvas perde o mundo já pintado, e a cena pisca a
 *                         cada entrada na aba
 *
 * Mover o nó não faz nem uma coisa nem outra: o canvas continua o mesmo, com o
 * mesmo conteúdo, e volta para o lugar quando a run acaba. */
let casaDoPalco = null;
let alturaDaCasa = '';

function levarPalco(paraRun) {
  const palco = $('#idlePalco');
  const destino = paraRun ? $('#avPalcoCena') : casaDoPalco;
  if (!palco || !destino) return;
  if (!casaDoPalco) casaDoPalco = palco.parentElement;

  /* ── A ALTURA GUARDADA É DA OUTRA TELA, E ELA NÃO VEM JUNTO ────────────
   *
   * O palco tem uma alça: o jogador arrasta e a altura fica salva como fração
   * da janela (`restaurarAltura`, 1.17). Ela é gravada na tela de ESCOLHA,
   * onde o palco ocupa 96vw.
   *
   * Trazida para a coluna do meio, que tem um terço disso, aquela fração vira
   * um palco VERTICAL: medido a 1920, 546 de largura por 899 de altura, num
   * mundo que é 704×448. E a barra de ação — a poção e a bola, as duas únicas
   * coisas que esta tela pede da mão do jogador — foi para 1067px numa dobra
   * de 1080.
   *
   *   > Uma preferência é de uma tela, não do elemento. Levá-la junto é levar
   *   > a resposta certa para a pergunta errada.
   *
   * É o mesmo defeito que a prévia já tinha pego a 1920 e que o passo OLHAR
   * pegou de novo aqui, agora por outra causa. Na run quem manda é o CSS: a
   * cena é limitada por `vh`, e a barra fica na dobra. */
  /* A LIMPEZA VALE A CADA PINTURA, e não só na mudança de pai: o
     `restaurarAltura` do idle regrava o `style.height` toda vez que o bioma é
     mostrado, e ele roda DEPOIS desta função. Limpar uma vez só devolveria o
     palco vertical no primeiro redesenho. */
  if (paraRun) {
    if (palco.style.height) {
      alturaDaCasa = palco.style.height;      // guardada para quando ela voltar
      palco.style.height = '';
    }
  } else if (palco.parentElement !== destino) {
    palco.style.height = alturaDaCasa;
  }
  if (palco.parentElement !== destino) destino.appendChild(palco);
}

/* ── O HP É O RELÓGIO DA RUN, E ELE PRECISA SER O MAIOR NÚMERO DA TELA ────
 *
 * A primeira versão desta tela não o mostrava em lugar nenhum — e o §7.22.7
 * diz, em uma linha, que ele é o relógio DENTRO do avanço. Sem ele à vista, a
 * poção não é uma decisão: é um botão que o jogador aperta quando lembra.
 *
 *   > Uma barra que decide quando a run acaba não pode ser menor que o nome do
 *   > bioma.
 *
 * Fica no cabeçalho da cena, larga, com o número ao lado. É o que o olho pega
 * de passagem, que é o único jeito que ele pega qualquer coisa nesta tela. */
function pintarHp(cn) {
  const alvo = $('#avHp');
  if (!alvo || !cn) return;
  const pct = Math.max(0, Math.min(100, (cn.hp / cn.hpMax) * 100));
  /* A COR MUDA ANTES DO NÚMERO FICAR FEIO. Verde até 55, âmbar até 25,
     vermelho abaixo — os mesmos cortes da barra do mob, de propósito: duas
     barras da mesma tela mudando de cor em pontos diferentes ensinariam o olho
     a desconfiar das duas. */
  const cor = pct > 55 ? 'var(--ok)' : (pct > 25 ? 'var(--aviso)' : 'var(--perigo)');
  alvo.innerHTML =
    `<span class="avHpRot">HP</span>` +
    `<span class="avBarra avHpBarra"><i style="width:${pct}%;background:${cor}"></i></span>` +
    `<b style="color:${cor}">${cn.hp}</b><em>/ ${cn.hpMax}</em>`;
  alvo.classList.toggle('perigo', pct <= 25);
}

/* ── A EQUIPE, À DIREITA ──────────────────────────────────────────────────
 *
 * A coluna que responde *"quem sou eu nesta run"* — e é por isso que o banner
 * fica no topo dela (L-147): ele é a mesma pergunta um nível acima.
 *
 * A duplicação com a coluna da esquerda é DE PROPÓSITO, e estava na prévia que
 * o dono aprovou: à esquerda está o ESTADO DE COMBATE (quanto de stamina
 * sobrou, quanto o vínculo soma); aqui está o TIME (quem foi, e quantas vagas
 * existem). São duas perguntas, e quem olha uma raramente quer a outra.
 *
 * ── E A VAGA ABRE PELA PÓKEDEX, NUNCA POR MOEDA ──────────────────────────
 *
 * Na referência a vaga extra se compra. Aqui ela abre por espécies
 * registradas, e isso não é preferência: vaga vendida é tempo vendido, e num
 * jogo em que o que se farma é vendável, isso é dinheiro comprando dinheiro.
 * O §P5 fecha essa porta, e a tela precisa DIZER isso — senão o jogador
 * procura o botão de compra. */
/* O foco em duas palavras, para a linha da vaga. A coluna do meio explica o
   que ele RENDE; aqui só se responde "qual é", que é a pergunta que cabe num
   cartão de 3 linhas. Sem foco, a resposta é QUANDO — o dono pediu justamente
   isso: *ver o futuro foco, que é escolhido no nível 12*. *//* A COLUNA DA DIREITA mora em `avanco-direita.mjs` desde que este arquivo
   passou de 600 linhas — a mesma divisão que a esquerda fez no A4g. Ver o
   cabeçalho de lá: aqui é a MÃO do jogador, e lá é o que ele LÊ. */
import { pintarEquipe, pintarBolsaDaRun, pintarChefe, pintarClima } from './avanco-direita.mjs';
import { leituraDoClima } from './avanco-clima.mjs';


/* ── OS CLIQUES DESTA TELA MORAM NESTA TELA ───────────────────────────────
 *
 * Mesmo padrão do `idle-foco.mjs`, do `loja-tela.mjs` e do `captura-cena.mjs`:
 * cada tela liga os próprios ouvintes. A aba não precisa saber que existe um
 * botão de recuar, do mesmo jeito que não sabe do botão de fechar da loja.
 *
 * ── E A ESCOLHA CHEGA POR FUNÇÃO, NÃO POR VALOR ──────────────────────────
 *
 * `escolha()` é chamada no INSTANTE do clique, e não no da ligação. Guardar o
 * bioma no momento em que o ouvinte nasce congelaria a primeira escolha do
 * jogador para sempre — ele trocaria de rota na tela e sairia na antiga.
 *
 * É o mesmo motivo pelo qual `recarregar` também é função: quem redesenha é a
 * aba, e esta tela não pode conhecê-la sem inverter a seta do grafo. */
export function ligarAvanco({ estado, escolha, recarregar, avisar, agora }) {
  document.addEventListener('click', ev => {
    /* COMEÇAR. Sem confirmação, ao contrário da expedição: aquela cobra HORAS
       e o jogador some da tela, então o momento do 1.24 existe para ele ver a
       stamina cair antes de decidir. O avanço é o oposto — ele COMEÇA a tela,
       e recuar devolve tudo menos o baú. Um diálogo aqui pediria confirmação
       para entrar no jogo. */
    if (ev.target.closest('#idleAvancar')) {
      try {
        comecarAvanco(estado(), { pack: PACK, agora: agora(), ...escolha() });
        recarregar();
      } catch (e) { avisar(e.message); }
      return;
    }
    if (ev.target.closest('#avAcoes [data-av="recuar"]')) {
      recuar(estado(), agora());
      recarregar();
      return;
    }

    /* ── A POÇÃO ────────────────────────────────────────────────────────
       Usa a PRIMEIRA da bolsa, e não a melhor: gastar a Máxima para curar
       doze pontos é a decisão errada mais fácil de tomar por engano, e a
       ordem do catálogo já traz a mais fraca antes. Escolher QUAL poção é
       decisão que merece tela própria, e ela não é deste bloco. */
    if (ev.target.closest('#avAcoes [data-av="pocao"]')) {
      try {
        const E = estado();
        const item = bolsaEmLista(E).find(x => x.quantidade > 0 && curaDe(PACK, x.id) > 0);
        if (!item) throw new Error('você não tem poção');
        const r = usarPocao(E, { pack: PACK, item: item.id, agora: agora() });
        avisar(`curou ${r.curou} de vida`);
        recarregar();
      } catch (e) { avisar(e.message); }
      return;
    }

    /* A BOLA NÃO TEM OUVINTE AQUI (L-166). Ela é jogada no quadro "quem
       apareceu", ao fim da run — o mesmo quadro e o mesmo ouvinte que a Rota
       OFF já usa, em `idle-tela.mjs`. */
  });
}

/* O botão de começar DIZ O MOTIVO quando não dá, e não só "não". A recusa muda
   conforme o que falta — stamina, estágio fechado, ou o teto que a Vigília de
   ontem já comprometeu. Uma parede sem placa é lida como o fim do jogo, e é o
   D-067. */
export function atualizarBotaoAvancar(E, escolha, agora) {
  const av = $('#idleAvancar');
  if (!av) return;
  const porque = porQueNaoAvancar(E, { pack: PACK, agora, ...escolha() });
  av.disabled = !!porque;
  av.title = porque ?? 'dez waves, chefe na décima — e você assiste';
  av.textContent = porque ?? '⚔ Avançar (assistido)';
  av.classList.toggle('pri', !porque);
  const custo = $('#idleCustoRun');
  /* E O QUE ELA PAGA HOJE (ST-3.6): a partir da 7ª run do dia, a frase diz a
     porcentagem ANTES de começar — rendimento que cai sem aviso é o D-067. */
  if (custo) custo.textContent = [falaDoCusto(), falaDoRendimento(runsNoDia(E.avancos, agora) + 1)]
    .filter(Boolean).join(' ');

  /* ── O AVISO DO TETO VEM ANTES, E NÃO DEPOIS (L-151) ──────────────────
     O teto deixou de recusar a run e passou a mudar o que ela rende. Isso só
     é honesto se o jogador souber ANTES de entrar:

       > Uma run que rende menos e não avisa é pior que uma run recusada.

     Ele fica junto do botão, e não numa faixa no alto: a decisão é ali. */
  const cx = $('#idleAvisoTeto');
  if (!cx) return;
  const aviso = porque ? null : avisoDoTeto(E, { pack: PACK, agora });
  cx.hidden = !aviso;
  if (aviso) cx.textContent = aviso;
}
