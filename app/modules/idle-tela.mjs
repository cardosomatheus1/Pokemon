/* A ABA DO IDLE (bloco 1.3c, camada 4).
 *
 * É a primeira tela de tudo que os blocos 1.1 a 1.3b construíram: a criatura, a
 * expedição, o encontro, o saque e o Pokédex existiam e ninguém via nenhum.
 *
 * ── O DESENHO CENTRAL ─────────────────────────────────────────────────────
 *
 * **O MUNDO É GBA. A INTERFACE É NEON.**
 *
 * Decisão do dono do projeto, e ela resolve sozinha quase todas as perguntas de
 * arranjo desta tela. O canvas do bioma é pixel de 16, ampliado inteiro, sem
 * suavização e sem nada de neon por cima. Tudo em volta — os chips, os botões,
 * a contagem — é a linguagem da Arena.
 *
 * A fronteira entre os dois é dura de propósito: onde o neon encosta no mundo,
 * o mundo perde a era. É o mesmo defeito que o dono já reprovou duas vezes nas
 * prévias ("parecem estar sobre o cenário").
 *
 * ── A TELA MOSTRA O BIOMA ANTES DE COBRAR OITO HORAS ─────────────────────
 *
 * Escolher a rota é a decisão do idle, e ela é cega se o jogador só descobrir o
 * lugar depois de mandar. Clicar num bioma REDESENHA o mundo na hora — o preço
 * é um canvas de 240×160, e o que se compra é a decisão deixar de ser um chute.
 *
 * ── O PERFIL DIZ O QUE ELE FAZ, E NÃO QUANTO TEMPO DEMORA ────────────────
 *
 * "45 min" não é informação: informação é "muitos encontros, quase todos
 * comuns". A escolha de duração só é escolha quando os dois lados da troca
 * estão na tela — e eles estão, medidos, em `docs/DESENHO_FASE1.md`.
 *
 * ── ESTA TELA NÃO SABE O QUE É DINHEIRO ──────────────────────────────────
 *
 * Nem saldo, nem aposta, nem carteira — do mesmo jeito que a aba da Liga. O
 * idle produz; a Arena consome. Ligar os dois aqui seria o §28 pela porta dos
 * fundos, e há teste que afirma a ausência.
 */
import { $, nosDois, nasAbasDoFarm } from './dom.mjs';
/* Os avisos sairam para `idle-avisos.mjs` quando este arquivo passou de 600
   linhas. A divisao e por assunto: la vive tudo que a tela DIZ fora dos
   paineis — o banner, quem acompanha, e a faixa de recado. */
import { avisarBanner, avisarCompanheiro, avisar } from './idle-avisos.mjs';
import { vigiarOutraAba, AVISO_OUTRA_ABA } from './idle-abas.mjs';
import {
  VAZIO, carregar, salvar, iniciaisDo, escolherInicial, criaturasDe,
  staminaDe, iniciarExpedicao, emCampo, concluidasHoje, pronta, colher,
  TETO_DIARIO, TETO_ENCONTROS, EQUIPE_MAX,
  STAMINA_MAX, PERFIS, encontrosHoje, estadoDoTeto, cabeExpedicao,
  lancarBola, naEquipe, naCaixa, mover, PARTY_MAX, restamEncontros, comprometido,
  vagasDe, proximaVagaDe, estagioMaximoDe, CHAVE_DO_IDLE,
} from './idle-dados.mjs';
import { PACK, nomeExibido } from './motor.mjs';
import { dexImg, retratoAnimado } from './sprites.mjs';
import { estiloIcone } from './icones.mjs';
import { seloDoFoco, seloDaEvolucao, desenharHud, pintarCartoes } from './idle-equipe.mjs';
import { modoGuardado, guardarModo, proximoModo, MODO_PADRAO } from './idle-escolha.mjs';
import { aplicar as aplicarEvolucao } from './evolucao-idle.mjs';
import { nomesDe } from './itens-nome.mjs';
import { confirmarExpedicao } from './idle-confirma.mjs';
import { ligarLoja, usarEstado as lojaUsaEstado } from './loja-tela.mjs';
/* A BOUTIQUE — a loja de PokéCash (1.31). Ela é irmã da loja PvE: o mesmo
   quadro, o mesmo vídeo, o outro NPC. Ver `loja-cash.mjs`. */
import { ligarCash, usarEstado as cashUsaEstado } from './loja-cash.mjs';
import { gravarPosse } from './cosmeticos.mjs';
import { tocar as tocarCaptura, ligarCaptura } from './captura-cena.mjs';
import { tocar as tocarEvolucao, ligarEvolucao } from './evolucao-cena.mjs';
import { pintarPerfis } from './idle-perfis.mjs';
import { renderPokedex } from './pokedex.mjs';
import { FALA as FALA_DO_FOCO, abrir as abrirFoco, ligar as ligarFoco,
         usarCriaturas as focoUsaCriaturas, pintar as pintarFoco } from './idle-foco.mjs';
import { NIVEL_PARA_ESCOLHER as NIVEL_DO_FOCO, descansando as descansandoFoco }
  from '../../engine/foco.mjs';
import { chanceDe } from '../../engine/captura.mjs';
import { mostrarBioma, acompanhar, trocarZoom } from './idle-mundo.mjs';
import { quemMostrar, expedicaoEm, biomaDeAbertura, podemIr } from './idle-quem.mjs';
import { pintarSaque, pintarEncontros, pintarCentro, pintarBolsa } from './idle-paineis.mjs';
import { pintarEstagios, pintarPrevia } from './idle-estagios.mjs';
import { pintarCampo } from './idle-campo.mjs';
import { pintarTreino } from './idle-treino.mjs';
/* O MAPA saiu daqui quando este arquivo passou de 600 linhas — ver o
   cabeçalho de `idle-biomas.mjs`. Ele responde a primeira pergunta da aba
   (*para onde eu mando?*) e não conhece mais nada. */
import { pintarBiomas, usarEstado as biomasUsam } from './idle-biomas.mjs';
import { pintarRun, ligarLaco as ligarLacoRun, pararLaco as pararLacoRun,
         ligarAvanco, atualizarBotaoAvancar } from './avanco-tela.mjs';
import { avancoEmCurso } from './avanco-estado.mjs';

let E = VAZIO();
let biomaEscolhido = null;
/* ── O MODO DO CARTÃO (L-164) ───────────────────────────────────────────
   Preferência de LEITURA, guardada fora do estado do jogo — ver o comentário
   no `idle-escolha.mjs`. Lida uma vez, na carga da aba: relê-la a cada
   repintura seria tocar o `localStorage` sessenta vezes por minuto numa tela
   que fica aberta por horas. */
let modoDoCartao = modoGuardado();
let perfilEscolhido = 'trilha';
let estagioEscolhido = 1;
let equipeEscolhida = [];
let ultimaColheita = null;
let relogio = null;

/* A espécie pelo dex. Uma função e não uma busca solta: ela é chamada dentro
   de template, e busca solta ali vira `undefined.n` no dia em que o pack mudar. */
const esp = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

const agora = () => Date.now();

/* A ROTA ESCOLHIDA, num lugar só. Ela é lida pelo botão, pelo clique e pela
   tela do avanço, e três cópias das mesmas três variáveis são três lugares
   onde elas podem divergir. */
const escolhaDaRota = () => ({
  bioma: biomaEscolhido, estagio: estagioEscolhido, equipe: equipeEscolhida,
});
const salvarE = () => { const g = salvar(E); if (!g) { avisar(AVISO_OUTRA_ABA); ultimaColheita = null; renderIdle(); } return g; };  // ST-3.2, ver idle-abas

/* ── O MUNDO ───────────────────────────────────────────────────────────────
 *
 * Uma tela só, redesenhada quando o bioma muda. O ator anda por cima, num
 * canvas separado — misturar os dois obrigaria a repintar o chão a cada quadro,
 * e o chão não muda. */
/* ── A PRIMEIRA VEZ: as três iniciais ─────────────────────────────────────
 *
 * A única tela do jogo inteiro em que não há nada a perder e há uma decisão a
 * tomar. Ela é grande de propósito. */
function pintarIniciais() {
  const alvo = $('#idleIniciais');
  if (!alvo) return;
  alvo.innerHTML = iniciaisDo(PACK).map(e => `
    <button class="idleInicial" data-dex="${e.dex}">
      ${dexImg(e.dex, e.n, 'class=\"idleInicialArte\"')}
      <b>${nomeExibido(e.n)}</b>
      <span class="tiny">${(e.t ?? []).map(t => PACK.tipos?.nomes?.[t] ?? t).join(' · ')}</span>
    </button>`).join('');
}

/* ── OS PAINÉIS ────────────────────────────────────────────────────────── */

/* O ESTAGIO ESCOLHIDO NUNCA PASSA DO ABERTO. Ele e memoria da tela, e memoria
   de tela sobrevive a mudancas de estado: sem esta redoma, quem abriu o 4,
   trocou de conta e voltou continuaria com o 4 selecionado — e levaria uma
   recusa que a propria tela ofereceu. */
function pintarFundo() {
  const cri = criaturasDe(E);
  estagioEscolhido = Math.min(estagioEscolhido, estagioMaximoDe(E));
  pintarEstagios(cri, { escolhido: estagioEscolhido, bioma: biomaEscolhido });
  pintarPrevia(biomaEscolhido, perfilEscolhido, estagioEscolhido);
}


/* Os cartões de perfil saíram para `idle-perfis.mjs` quando este arquivo passou
   de 600 linhas. A divisão é por assunto: lá vive a ESCOLHA DE DURAÇÃO. */
const desenharPerfis = () => pintarPerfis(PERFIS, perfilEscolhido);

/* A EQUIPE MOSTRA A STAMINA COMO BARRA, e o custo do perfil escolhido como uma
   marca dentro dela. Sem a marca, "tem stamina?" vira conta de cabeça — e a
   recusa depois de clicar é a pior forma de ensinar uma regra. */
/* ── QUEM ANDA COM VOCÊ NA CENA ─────────────────────────────────────────────
 *
 * A cena desenha, não escolhe: ela precisa que alguém lhe diga quem é.
 *
 * ── O DEFEITO QUE ISTO CORRIGE (D-061) ────────────────────────────────────
 *
 * A versão anterior lia `equipeEscolhida[0]` — a seleção do SELETOR. Mandada a
 * expedição, a seleção limpa, e a linha caía em `lista[0]`: o primeiro da
 * caixa, que é o inicial. Relato do dono, exato:
 *
 *   > "eu mandei um vulpix pra expedição e quem me acompanha é um squirtle"
 *
 * A regra certa não é "o primeiro selecionado", é OUTRA COISA: quem anda com
 * você é quem está EM CAMPO NAQUELE BIOMA. A seleção do seletor é uma intenção;
 * a expedição é um fato, e a cena mostra fatos.
 *
 * ── E ISTO É O PRIMEIRO DEGRAU DA L-082 ───────────────────────────────────
 *
 * O desenho do dono é quatro expedições simultâneas, cada uma com o seu bicho
 * no seu bioma, e clicar num bioma mostra quem farma ALI. A ordem de precedência
 * abaixo já é essa regra, com uma expedição só. Quando forem quatro, muda o
 * número de acompanhantes desenhados — não muda quem é escolhido.
 */
/* ── O QUE O BANNER PRECISA SABER (1.6c) ─────────────────────────────────
 *
 * O banner desenha e nao descobre — mesma fronteira do companheiro logo
 * abaixo. A aba sabe onde o treinador esta; ela avisa.
 *
 * QUAL EXPEDICAO: a do bioma que esta na tela, e nao "a primeira". Palavra do
 * dono: *"no banner de batalha so ira aparecer de fato oque estiver com o
 * treinador"*. Quando as quatro expedicoes existirem (L-082), os outros tres
 * aparecem no quadro da L-083 — nao aqui.
 *
 * O STAGE ainda nao existe (bloco 1.10) e por isso nao e passado: `rodapeIdle`
 * simplesmente nao escreve o trecho, em vez de inventar "Stage 1". */

/* O CARTÃO DA CRIATURA mudou de casa no 1.24: ele mora em `idle-equipe.mjs`,
   junto dos selos que já eram dele. A escolha (perfil, seleção) continua aqui —
   o cartão recebe os dois e não os guarda. */

/* ── O DESENHO INTEIRO ─────────────────────────────────────────────────── */
/* A tela do foco le a lista por funcao, e nao por import do estado: assim ela
   e desenhavel num teste sem save nenhum. Ligado uma vez, aqui. */
focoUsaCriaturas(() => E.criaturas ?? []);

/* ── A LOJA (1.25) ────────────────────────────────────────────────────────
 *
 * Mesma costura da Pokédex e do foco: ela recebe COMO ler, COMO salvar e o que
 * fazer quando algo muda — e não importa o estado nem sabe gravar.
 *
 * Isso não é formalidade. É o que permite a loja ser desenhada num teste sem
 * save nenhum, e é o que impede que ela vire um segundo dono do saldo — que é
 * a coisa que este projeto menos pode ter em duas mãos. */
/* A boutique guarda a posse dela num depósito próprio — ver a nota longa em
   `cosmeticos.mjs` sobre por que o traje continua sendo do acervo. */
cashUsaEstado({
  salvar: posse => gravarPosse(posse),
  mudou: () => renderIdle(),
});
ligarCash();

lojaUsaEstado({
  /* O ESTILHAÇO precisa saber a ROTA: o bolso do sorteio é dela, e é isso
     que faz ONDE farmar ser a decisão. Ver o motor do Estilhaço. */
  bioma: () => biomaEscolhido,
  ler: () => E,
  salvar: novo => { Object.assign(E, novo); salvarE(); },
  mudou: () => renderIdle(),
});
ligarLoja();

/* ── A POKÉDEX LÊ O SAVE SOZINHA, E ESTE ARQUIVO NÃO A ATRAPALHA ─────────
   A primeira versão fazia `pokedexUsaEstado(() => E)` aqui, na carga do
   módulo — e `E` só é preenchido quando a aba das Rotas abre. Quem entrasse
   direto na Pokédex via **0 de 146** com o registro cheio no armazenamento.

   A sobrescrita saiu. O que fica é o AVISO: depois de colher, a Pokédex
   redesenha se estiver aberta, e assim ela acompanha sem depender de nada. */
const avisarPokedex = () => { try { renderPokedex(); } catch { /* aba fechada */ } };

/* Os ouvintes do avanço nascem uma vez, como os do foco. A aba passa o que
   só ela sabe — a rota escolhida e como se redesenha. */
let avancoLigado = false;

export function renderIdle() {
  ligarFoco();
  if (!avancoLigado) {
    avancoLigado = true; vigiarOutraAba({ chave: CHAVE_DO_IDLE, aoMudar: () => { ultimaColheita = null; renderIdle(); } });
    ligarAvanco({ estado: () => E, escolha: escolhaDaRota,
                  recarregar: () => { ultimaColheita = null; renderIdle(); },
                  avisar, agora });
  }
  const vista = $('#viewIdle');
  if (!vista) return;
  E = carregar();

  const temCriatura = E.criaturas.length > 0;
  vista.classList.toggle('primeiraVez', !temCriatura);
  if (!temCriatura) { pintarIniciais(); return; }

  /* A ABA ABRE ONDE A ACAO ESTA. Abrindo sempre no primeiro bioma da lista, o
     jogador com uma expedicao no gelo via a floresta vazia — e concluia que o
     jogo esqueceu quem ele mandou. A tela mostra primeiro o que ESTA
     acontecendo; o resto e um clique. */
  if (!biomaEscolhido)
    biomaEscolhido = biomaDeAbertura(emCampo(E), PACK.biomas);
  if (!equipeEscolhida.length) equipeEscolhida = [E.criaturas[0].id];

  /* ── A RUN TOMA A ABA QUANDO EXISTE (A4b, §7.22) ───────────────────────
     Ela não é uma aba nova: o arranjo que o dono aprovou mostra "Rotas" aceso
     na barra de cima, e um nome a mais faria o jogador escolher entre dois
     rótulos para a mesma coisa.

     O `return` é o ponto: com run em curso, a tela da ESCOLHA não é pintada.
     Pintar as duas custaria o dobro a cada segundo para desenhar uma que está
     escondida — e esta é a aba que fica aberta a tarde inteira. */
  if (avancoEmCurso(E)) {
    pintarRun(E, { agora: agora() });
    /* O laço repinta o `E` QUE JÁ ESTÁ EM MEMÓRIA. Recarregar do disco a cada
       segundo custaria um `JSON.parse` do estado inteiro para reler o que este
       próprio processo acabou de escrever. Quem muta a run é o `sincronizar`,
       no mesmo objeto. */
    ligarLacoRun(() => pintarRun(E, { agora: agora() }));
    return;
  }
  pararLacoRun();
  /* Sem run: a chamada devolve o palco ao cartão da rota e esconde o painel. */
  pintarRun(E, { agora: agora() });

  avisarCompanheiro(E, biomaEscolhido, equipeEscolhida, agora());
  mostrarBioma(biomaEscolhido);
  biomasUsam(E, biomaEscolhido, equipeEscolhida);
  pintarBiomas();
  pintarFundo();
  desenharPerfis();
  cartoes();
  pintarEncontros(E);
  pintarCentro(E);
  pintarCampo(E);
  pintarTreino(E);
  pintarSaque(E, ultimaColheita);
  pintarBolsa(E);
  desenharHud(E, biomaEscolhido, agora());
  atualizarBotao();
  ligarRelogio();
}

/* O CARTAO recebe a escolha por argumento; este atalho existe para a escolha
   nao ser repetida em cada chamador — tres copias sao tres lugares onde ela
   pode divergir. */
const cartoes = () =>
  pintarCartoes(E, { perfil: perfilEscolhido, selecao: equipeEscolhida, agora: agora(),
                     modo: modoDoCartao });

function atualizarBotao() {
  const b = $('#idleMandar');
  if (!b) return;
  const t = agora();

  atualizarBotaoAvancar(E, escolhaDaRota, t);
  const motivo = porQueNao(t);
  b.disabled = !!motivo;
  b.textContent = motivo ?? 'Mandar a expedição';
  b.classList.toggle('pri', !motivo);
}

function porQueNao(t) {
  if (!equipeEscolhida.length) return 'Escolha ao menos uma criatura';
  if (equipeEscolhida.length > EQUIPE_MAX) return `A equipe tem teto de ${EQUIPE_MAX}`;
  const custo = PERFIS[perfilEscolhido]?.custo ?? 0;
  const secas = equipeEscolhida.filter(id => staminaDe(E, id, t) < custo).length;
  if (secas) return `${secas} criatura(s) sem stamina para isto`;
  /* A PERGUNTA VAI AO MOTOR, com o estado do momento. A tela não recalcula o
     teto: ela pergunta, pelo mesmo motivo que não recalcula custo nem raridade. */
  /* A RECUSA DIZ A CONTA, e não só o limite. "Teto de 30 encontros hoje" é
     verdade e não ajuda: ao lado de um contador em 15/30 ela parece erro. O que
     falta ao jogador é o que a expedição em campo já reservou — ver o comentário
     longo em `pintarCampo`. */
  if (!cabeExpedicao(estadoDoTeto(E, t, PACK), perfilEscolhido)) {
    const livres = restamEncontros(estadoDoTeto(E, t, PACK));
    const pede = PERFIS[perfilEscolhido]?.encontros?.[1] ?? 0;
    return emCampo(E).length
      ? `Só restam ${livres} encontros — a ${PERFIS[perfilEscolhido]?.rotulo} ` +
        `reserva até ${pede}. Colha o que está em campo para liberar o resto.`
      : `Só restam ${livres} encontros no dia, e a ` +
        `${PERFIS[perfilEscolhido]?.rotulo} reserva até ${pede}.`;
  }
  /* A RECUSA POR VAGA DIZ O CAMINHO, e não só o limite — mesma correção do
     D-067, que era sobre o teto. "Já há uma expedição em campo" está certo e
     não ajuda: o jogador não descobre por ali que existe uma segunda vaga, nem
     como abri-la. Uma parede sem placa é lida como o fim do jogo. */
  const vagas = vagasDe(E);
  if (emCampo(E).length >= vagas) {
    const prox = proximaVagaDe(E);
    return prox
      ? `Suas ${vagas} vaga(s) estão ocupadas. A ${prox.vaga}ª abre com ` +
        `${prox.em} espécies no Pokédex — faltam ${prox.faltam}.`
      : `Suas ${vagas} vagas estão ocupadas. Colha uma para mandar outra.`;
  }
  return null;
}

/* O RELÓGIO. Um segundo é o passo certo: a contagem é em minutos, e um passo
   maior faria o "pronta" demorar a aparecer depois de já estar pronta. */
function ligarRelogio() {
  if (relogio) return;
  relogio = setInterval(() => {
    /* AS DUAS ABAS, e não só a de ROTAS (A4e) — o porquê está no `dom.mjs`. */
    if (!nasAbasDoFarm()) return;
    pintarCampo(E);
    pintarTreino(E);
    atualizarBotao();
    /* O BANNER ANDA A CADA SEGUNDO (L-124): parado, ele ensinava que o número
       é falso — o dono pegou olhando, "não atualiza de forma contínua". */
    desenharHud(E, biomaEscolhido, agora());
  }, 1000);
}

/* ── OS CLIQUES ────────────────────────────────────────────────────────── */

/* As duas abas do farm, e o par escrito por extenso para cada seletor de
   dentro. É a regra do D-065 obedecida sem copiar dois ids vinte vezes. */
const ABAS_DO_FARM = '#viewIdle, #viewRotaOff';
const nasDuas = sel => '#viewIdle ' + sel + ', #viewRotaOff ' + sel;
document.addEventListener('click', async ev => {
  /* ── AS DUAS ABAS DO FARM, E NÃO SÓ ROTAS (A4e) ───────────────────────
   *
   * O portão visual pegou isto, e a falha era completa: com o guarda em
   * `#viewIdle`, NENHUM clique da Rota OFF chegava aqui. A aba abria, pintava
   * os painéis certos, e não respondia a nada — escolher criatura, trocar de
   * bioma, mandar a expedição, tudo inerte.
   *
   *   > Uma aba que desenha e não responde é pior que uma aba que falta: ela
   *   > promete um caminho e o interrompe sem dizer nada.
   *
   * E os seletores de dentro passam pelo `nasDuas`, que escreve o par por
   * extenso. Repetir os dois ids em vinte `closest` seria vinte lugares para
   * esquecer o segundo; deixá-los SOLTOS seria o D-065 de novo — seletor de
   * atributo num ouvinte de documento é um contrato invisível com a página
   * inteira, e o próximo elemento que ganhar o atributo perde o próprio
   * clique em silêncio. O par explícito é a saída que não abre nem uma porta
   * nem a outra. */
  const dentro = ev.target.closest(ABAS_DO_FARM);
  if (!dentro) return;

  /* ESCOPADO A `#idleIniciais`, e nao `[data-dex]` solto.

     O cartao da criatura ganhou `data-dex` (para a sonda do Q5 saber QUEM foi
     mandado), e este seletor passou a casar com ele primeiro: clicar numa
     criatura chamava , que lanca "a criatura inicial so se
     escolhe uma vez", e o  matava o clique. O jogador so conseguia
     selecionar o inicial — que ja vem selecionado.

     A licao e sobre DELEGACAO: um seletor de atributo solto num ouvinte de
     documento inteiro e um contrato invisivel com toda a pagina. Quem
     acrescenta o atributo noutro lugar — eu, por um teste — nao tem como
     saber que existia um dono. O escopo torna o contrato visivel. */
  const ini = ev.target.closest('#idleIniciais [data-dex]');
  if (ini) {
    try {
      escolherInicial(E, PACK, Number(ini.dataset.dex), agora());
      salvarE(); renderIdle(); avisarPokedex();
    } catch (e) { avisar(e.message); }
    return;
  }

  const lance = ev.target.closest(nasDuas('[data-lance]'));
  if (lance) {
    try {
      /* ── A CHANCE É LIDA ANTES DO LANCE, E ISSO IMPORTA ────────────────
         Depois do lance o encontro já saiu da lista, e a raridade dele com ele.
         O laudo precisa do número para poder dizer *"faltou pouco"* com
         honestidade — e uma frase dessas apoiada num número recalculado errado
         seria pior que não dizer nada. */
      const antes = (E.encontros ?? []).find(x => x.chave === lance.dataset.lance);
      const chance = antes
        ? chanceDe(PACK, { raridade: antes.raridade, bola: lance.dataset.bola })
        : null;

      const r = lancarBola(E, { pack: PACK, chave: lance.dataset.lance,
                                bola: lance.dataset.bola, agora: agora() });
      /* GRAVA ANTES DE ANIMAR, como a evolução do 1.21: o que aconteceu no jogo
         aconteceu, e a tela é o relato. Quem fechar a aba no meio da animação
         não perde a captura. */
      salvarE();
      renderIdle();

      /* ── E A CENA SUBSTITUI A FAIXA QUE SUMIA (L-115) ──────────────────
         Queixa do dono: *"a mensagem de captura é muito vaga, ela só aparece
         embaixo do 'mandar expedição' e some rapidamente"*. O momento mais
         importante do idle era um texto longe do olho, com quatro segundos de
         vida.

         A faixa continua sendo a RESERVA: se a cena não puder tocar — outra
         animação no ar, ou a caixa ausente —, o jogador ainda é avisado. Uma
         captura silenciosa seria pior que a faixa que ele reclamou. */
      const nome = nomeExibido(esp(r.dex).n);
      ligarCaptura();
      const tocou = await tocarCaptura(
        { ...r, nome, chance, bola: lance.dataset.bola },
        () => renderIdle());
      if (!tocou) avisar(r.capturou
        ? `${nome} entrou${r.foiParaCaixa ? ' na CAIXA' : ' na equipe'}!`
        : `${nome} escapou — a bola foi embora com ele.`);
    } catch (e) { avisar(e.message); }
    return;
  }

  /* ── A DOBRA DO CARTÃO (L-164) ──────────────────────────────────────
     Alterna entre compacto e ficha, guarda a escolha, e repinta. Ele NÃO
     salva o estado do jogo: é preferência de leitura, e mistura-las faria uma
     escolha de tela viajar com a coleção. */
  if (ev.target.closest(nasDuas('[data-modo-cartao]'))) {
    modoDoCartao = guardarModo(proximoModo(modoDoCartao));
    renderIdle();
    return;
  }

  const mv = ev.target.closest(nasDuas('[data-mover]'));
  if (mv) {
    try { mover(E, mv.dataset.mover, mv.dataset.para === '1'); salvarE(); renderIdle(); }
    catch (e) { avisar(e.message); }
    return;
  }

  const z = ev.target.closest(nasDuas('[data-zoom]'));
  if (z) { trocarZoom(Number(z.dataset.zoom)); return; }

  const b = ev.target.closest(nasDuas('[data-bioma]'));
  if (b) {
    biomaEscolhido = b.dataset.bioma;
    mostrarBioma(biomaEscolhido);
    pintarBiomas();
    /* TROCAR DE BIOMA TROCA QUEM ESTA NELE. Sem esta linha o cenario mudava e
       o companheiro ficava o do bioma anterior — a cena passava a afirmar que
       um Pokemon estava num lugar onde ele nao esta. Foi o teste do 1.6c que
       pegou, e e a metade que faltava da regra: clicar num bioma mostra quem
       farma ALI (L-082). */
    avisarCompanheiro(E, biomaEscolhido, equipeEscolhida, agora());
    /* O ESTAGIO E DO LUGAR: trocar de bioma repinta a previa, senao ela ficaria
       mostrando quem mora no bioma anterior. */
    pintarFundo();
    return;
  }

  const est = ev.target.closest(nasDuas('[data-estagio]'));
  if (est) { estagioEscolhido = Number(est.dataset.estagio) || 1; pintarFundo(); atualizarBotao(); return; }

  const p = ev.target.closest(nasDuas('[data-perfil]'));
  if (p) { perfilEscolhido = p.dataset.perfil; desenharPerfis(); cartoes(); pintarFundo(); atualizarBotao(); return; }

  /* O SELO DO FOCO VEM ANTES DO CARTAO DA CRIATURA, e a ordem e o que faz a
     coisa funcionar: o selo esta DENTRO do botao, entao o `closest` de baixo
     tambem casaria. Tratado primeiro e com `return`, escolher foco nunca
     seleciona a criatura para a expedicao sem querer. */
  /* ── EVOLUIR: GRAVA PRIMEIRO, TOCA DEPOIS (1.21) ───────────────────────
     A criatura e gravada ANTES da animacao. Se a aba fechar no meio, a
     evolucao aconteceu — porque ela aconteceu no JOGO, e a tela e so o relato.
     Gravar no fim faria o resultado depender de o jogador assistir. */
  const ev2 = ev.target.closest(nasDuas('[data-evoluir]'));
  if (ev2) {
    ev.stopPropagation();
    const id = ev2.dataset.evoluir;
    const i = E.criaturas.findIndex(x => x.id === id);
    if (i < 0) return;
    let r;
    try { r = aplicarEvolucao(PACK, E.criaturas[i], E.bolsa); }
    catch { return; }
    /* A PEDRA E CONSUMIDA. Sem isto, uma pedra evoluiria a caixa inteira — e o
       gargalo que o requisito do dono cria ("a pedra cobra presenca") deixaria
       de existir na primeira evolucao por item. */
    const item = r.aresta?.exige?.item;
    if (item && (E.bolsa[item] ?? 0) > 0) E.bolsa[item] -= 1;
    E.criaturas[i] = r.criatura;
    salvarE();
    ligarEvolucao();
    tocarEvolucao(r.de, r.para, () => { renderIdle(); avisarPokedex(); });
    return;
  }

  const fb = ev.target.closest(nasDuas('[data-foco-abrir]'));
  if (fb) {
    ev.stopPropagation();
    abrirFoco(fb.dataset.focoAbrir, nova => {
      const i = E.criaturas.findIndex(x => x.id === nova.id);
      if (i < 0) return;
      E.criaturas[i] = nova;
      salvarE(); renderIdle();
    });
    return;
  }

  const c = ev.target.closest(nasDuas('[data-cria]'));
  if (c) {
    const id = c.dataset.cria;
    equipeEscolhida = equipeEscolhida.includes(id)
      ? equipeEscolhida.filter(x => x !== id)
      : (equipeEscolhida.length < EQUIPE_MAX ? [...equipeEscolhida, id] : equipeEscolhida);
    cartoes(); atualizarBotao(); avisarCompanheiro(E, biomaEscolhido, equipeEscolhida, agora());
    return;
  }

  const col = ev.target.closest(nasDuas('[data-colher]'));
  if (col) {
    try {
      ultimaColheita = colher(E, { pack: PACK, id: col.dataset.colher, agora: agora() });
      salvarE(); renderIdle();
    } catch (e) { avisar(e.message); }
    return;
  }

  if (ev.target.closest('#idleMandar')) {
    /* ── O PRIMEIRO MOMENTO DO CAMINHO DA EXPEDIÇÃO (L-120) ──────────────
       Pedido do dono, e ele veio junto da crítica que um amigo fez ao projeto:
       *"muito linear, site de velho, anos 2000"*. Hoje quase tudo acontece em
       linha — clica, muda, segue —, e uma interface sem momentos é uma lista de
       formulários.

       A confirmação NÃO é só proteção contra o clique errado: ela mostra quem
       vai e quanta stamina sobra, que é a decisão de verdade. Ver a barra cair
       é o que a transforma numa escolha.

       Ela vem ANTES de `iniciarExpedicao`: cancelar não pode deixar rastro. */
    const escolha = { bioma: biomaEscolhido, perfil: perfilEscolhido,
                      equipe: equipeEscolhida, agora: agora() };
    if (!await confirmarExpedicao(E, escolha)) return;
    try {
      iniciarExpedicao(E, { pack: PACK, bioma: biomaEscolhido,
        perfil: perfilEscolhido, equipe: equipeEscolhida, estagio: estagioEscolhido, agora: agora() });
      ultimaColheita = null;
      salvarE(); renderIdle();
    } catch (e) { avisar(e.message); }
  }
});

/* A aba se liga sozinha, como a da Liga: escuta o clique no menu. */
/* AS DUAS ABAS CHAMAM O MESMO RENDER. Elas mostram painéis diferentes do MESMO
   estado — e um render por aba seria duas verdades sobre a mesma expedição. */
document.addEventListener('click', ev => {
  if (ev.target.closest('.nav[data-view="viewIdle"], [data-goto="viewIdle"],' +
                        '.nav[data-view="viewRotaOff"], [data-goto="viewRotaOff"]'))
    setTimeout(renderIdle, 0);
});
