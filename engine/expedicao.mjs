/* A EXPEDIÇÃO — o farm do idle (bloco 1.2a, §7.13, §P3, §P5).
 *
 * Fronteira: entra um pack, um bioma, um perfil e uma equipe; sai quando a
 * expedição termina e o que ela encontrou. Puro, sem DOM, sem estado e sem
 * tema — os biomas, as espécies e a escala de raridade vêm do pack (§0.3).
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A duração muda O QUE se recebe, e não só o quanto.**
 *
 * O jeito óbvio de fazer um idle é "mais tempo, mais tudo". Ele tem um defeito
 * que não aparece em teste nenhum: se o maior é sempre melhor, a escolha não é
 * escolha. Todo jogador clica no maior e a tela de seleção vira um botão só.
 *
 * O EIXO DA TROCA É RITMO CONTRA SESSÃO, e não quantidade contra raridade.
 *
 *     jogo ATIVO  rende mais POR HORA
 *     jogo IDLE   rende mais POR SESSÃO
 *
 *     Batida    45 min   4,0 encontros   5,35/h   comum      XP/h 1,33
 *     Trilha     3 h     7,0 encontros   2,34/h   o meio     XP/h 1,17
 *     Vigília    8 h    12,0 encontros   1,50/h   RARO 16%   XP/h 1,00
 *
 * Com três horas na frente do computador, quatro Batidas rendem mais que uma
 * Trilha. Dormindo, a Vigília é a única que existe. As duas respostas são certas
 * em momentos diferentes, e é isso que faz a escolha existir.
 *
 * A PRIMEIRA VERSÃO DISTO ESTAVA ERRADA, e o dono do projeto pegou. Eu tinha
 * feito quantidade trocada por raridade: a Vigília devolvia 1,5 encontros, que
 * depois ainda passavam pela peneira da captura — **menos de meia criatura por
 * noite de oito horas.** Parecia troca honesta no papel e era um jogo que pune
 * quem dorme, o que num idle é o avesso do produto.
 *
 * Ficam DOIS testes por causa disso, e o segundo é a trava: um mede o ritmo
 * (`§Q4 · o ritmo por hora cai`), o outro exige que uma noite de Vigília devolva
 * pelo menos oito encontros (`§Q4 · acorda com criatura na mão`).
 *
 * ENCONTRO NÃO É CAPTURA, e é por isso que o mínimo precisa de folga: cada
 * encontro ainda passa pela peneira da bola, no bloco 1.2b.
 *
 * ── A STAMINA É DA CRIATURA, E NÃO DO JOGADOR ─────────────────────────────
 *
 * Barra de energia do jogador é a mecânica que todo mundo odeia, e pelo motivo
 * certo: ela diz "você não pode jogar agora". Stamina na criatura diz outra
 * coisa — "esta equipe está cansada, mande outra".
 *
 * A consequência é o que interessa: **o teto do farm passa a ser o tamanho da
 * coleção**, que é justamente o que o jogo quer que cresça. A coleção deixa de
 * ser enfeite e vira ferramenta.
 *
 * ── O TETO DIÁRIO NÃO TEM PARÂMETRO, E ISSO É O §P5 ───────────────────────
 *
 * A loja da L-066 vai vender boost de stamina por dinheiro real. Num jogo onde
 * o que se farma é VENDÁVEL, boost que levantasse o teto seria dinheiro
 * comprando dinheiro.
 *
 * `TETO_DIARIO` é constante, e `iniciar()` não aceita nada que o mude. Não é
 * disciplina, é ausência de porta: enquanto não houver por onde levantar, não
 * há como vender vantagem. O teste tenta cinco parâmetros venenosos e exige que
 * os cinco sejam recusados.
 *
 * O que a loja pode vender, então, é HORÁRIO: quem tem coleção pequena chega ao
 * teto hoje em vez de daqui a duas semanas. Para quem já está no teto, o boost
 * não faz nada — e é essa a prova de que ele não é vantagem.
 */

import { elencoDoBioma } from './bioma.mjs';
import { encontrosCom } from './foco.mjs';
import { viesFinal, cabeNoEstagio, VIES_TETO, faixasDoEstagio } from './estagios.mjs';

export const STAMINA_MAX = 100;
export const REGEN_POR_HORA = 8;          /* cheia em ~12 h a partir do zero */
export const EQUIPE_MAX = 3;
export const SIMULTANEAS_INICIAIS = 1;
export const SIMULTANEAS_MAX = 4;

/* ── AS VAGAS SIMULTÂNEAS SÃO DERIVADAS, E NUNCA GUARDADAS ────────────────
 *
 * Pedido do dono, e ele perguntou se valia a pena: manter a mecânica de enviar
 * outra criatura separada, para outro lugar, sem que o farm ficasse pesado
 * demais.
 *
 * (A frase dele é citada inteira em `docs/LACUNAS.md`, L-082, e aqui ela vem
 *  parafraseada de propósito: o original nomeia a franquia, e o motor não pode
 *  citá-la nem em comentário. O portão `conteudo` reprovou a primeira versão
 *  deste bloco por isso — pela QUINTA vez no projeto — e ele está certo:
 *  comentário conta. Quem lê o motor não pode descobrir por ele de que jogo o
 *  pack é, senão a fronteira do §0.3 é só uma convenção de nomes.)
 *
 * Vale, e o motivo está no código e não na opinião: **o paralelismo ficou de
 * graça no dia em que o teto passou a contar ENCONTROS.**
 *
 *     ANTES  teto por envio (4/dia) — quatro vagas eram 4× o farm. Paralelismo
 *            era PODER, e caro de equilibrar.
 *     HOJE   a expedição RESERVA o máximo do perfil ao sair (`comprometido`),
 *            e devolve a sobra ao colher. Quatro Trilhas juntas reservam 32,
 *            o teto é 30, e a quarta é recusada no clique.
 *
 * Paralelismo passou a mudar QUANDO você colhe, nunca QUANTO. O que ele
 * entrega é escolha e presença: quatro biomas ao mesmo tempo, a Batida de 45
 * min ao lado da Vigília de 8 h, e gente no mapa.
 *
 * ── DE ONDE VÊM AS VAGAS, E POR QUE NÃO DA LOJA (§P5) ────────────────────
 *
 * Vaga vendida é tempo vendido, e num jogo em que o que se farma é vendável
 * isso é dinheiro comprando dinheiro. Elas vêm do REGISTRO — quantas espécies o
 * jogador já viu.
 *
 * O registro é o eixo certo por três razões, e a terceira é a que decide:
 *
 *     não se compra   fragmento de registro cai no encontro, e só ali
 *     mede VARIEDADE  e variedade vem de rodar biomas diferentes
 *     o laço fecha    mais biomas ao mesmo tempo -> mais variedade -> mais
 *                     vagas. A recompensa alimenta a atividade que a gera.
 *
 * ── E ELAS SÃO DERIVADAS, NÃO GUARDADAS ──────────────────────────────────
 *
 * A versão anterior lia `simultaneas` do estado salvo e apertava no máximo.
 * `localStorage` está a um F12 de distância: quem editasse o número ganhava as
 * vagas sem ter visto uma espécie. Não era exploração teórica — era um campo
 * de vantagem lido de onde o jogador escreve.
 *
 * Derivar fecha isso sem guarda nenhuma, que é sempre melhor que guardar bem:
 * **enquanto não houver onde escrever, não há o que forjar.** É a mesma forma
 * do teto diário, algumas linhas acima, e da `potencial` no bloco 1.1. */
export const MARCOS_VAGAS = [0, 10, 25, 45];

export function vagasPor(especiesVistas) {
  const n = Math.max(0, Math.floor(Number(especiesVistas) || 0));
  let vagas = SIMULTANEAS_INICIAIS;
  for (let i = 1; i < MARCOS_VAGAS.length; i++)
    if (n >= MARCOS_VAGAS[i]) vagas = SIMULTANEAS_INICIAIS + i;
  return Math.min(vagas, SIMULTANEAS_MAX);
}

/* Quantas espécies faltam para a próxima vaga, e quantas ela vale. `null`
   quando não há próxima — a tela precisa saber a diferença entre "faltam 12" e
   "acabou", e um zero não distingue as duas. */
export function proximaVaga(especiesVistas) {
  const n = Math.max(0, Math.floor(Number(especiesVistas) || 0));
  const atual = vagasPor(n);
  if (atual >= SIMULTANEAS_MAX) return null;
  const alvo = MARCOS_VAGAS[atual - SIMULTANEAS_INICIAIS + 1];
  return { vaga: atual + 1, em: alvo, faltam: Math.max(0, alvo - n) };
}

/* O TETO DIÁRIO. Ver o comentário de cabeça — ele é constante de propósito.
 *
 * Quatro é o dia cheio desenhado: Vigília dormindo, Trilha à noite e duas
 * Batidas entre rodadas da Arena. Uma coleção madura bate isso sem comprar
 * nada, que é a regra 3 da L-066. */
export const TETO_DIARIO = 4;

/* ── O TETO DIÁRIO É DE ENCONTROS, E NÃO DE EXPEDIÇÕES (D-052) ────────────
 *
 * Contava expedições, e o que o jogador leva para casa não são expedições:
 *
 *   perfil      encontros por expedição    4 expedições rendiam
 *   batida            3 a 5                    12 a 20
 *   trilha            6 a 8                    24 a 32
 *   vigília          10 a 14                   40 a 56
 *
 * O dia CHEIO desenhado — uma Vigília dormindo, uma Trilha à noite e duas
 * Batidas entre rodadas — rende de 22 a 32, com meio em 27. Quatro Vigílias
 * rendiam 56: o dobro, com a mesma contagem de "quatro expedições".
 *
 * Isso não era um número mal calibrado; era o teto medindo a coisa errada. Ele
 * existe pelo §P5 — num jogo em que o que se farma é VENDÁVEL, o teto é o que
 * impede tempo virar dinheiro sem limite. Contando expedições, ele limitava
 * quantas vezes se CLICA, e quem descobrisse a Vigília ganhava o dobro pelo
 * mesmo teto. Também arruinava o desenho dos perfis, que deveriam ser uma
 * TROCA: com teto por expedição a Vigília dominava em tudo.
 *
 * ── A RESERVA, e por que ela é necessária ────────────────────────────────
 *
 * O número de encontros só existe na COLHEITA: a semente é sorteada ali, e é
 * isso que torna o saque auditável (§25.2, bloco 1.2d). No início ninguém sabe
 * quantos serão.
 *
 *   ao INICIAR   reserva o MÁXIMO do perfil, e recusa se
 *                colhido hoje + reservado em campo + máximo do perfil > teto
 *   ao COLHER    desconta o REAL; a diferença volta sozinha, porque a reserva
 *                é derivada das expedições em campo e não guardada
 *
 * Assim o teto nunca é ultrapassado, a recusa acontece no clique — onde o
 * jogador consegue entender — e a semente continua nascendo na colheita.
 *
 * 30 é o teto, e não 27: o meio do dia desenhado é 27, mas o teto tem de deixar
 * o dia CHEIO caber inclusive quando a sorte vem alta. Cortar em 27 faria o
 * jogador que teve sorte na Vigília perder a última Batida — punido por sorte,
 * que é a pior forma de um limite aparecer. */
export const TETO_ENCONTROS = 30;

/* ── E O REGISTRO DE ESPÉCIES LEVANTA ESSE TETO (1.19) ────────────────────
 *
 * As VAGAS de expedição param nas 45 espécies (`MARCOS_VAGAS`), e param por
 * decisão do dono: quatro paralelas é o que uma pessoa gerencia; mais que isso
 * ela só clica. Mas o elenco inteiro é bem maior, e depois do 45 completar o registro não
 * pagava mais nada.
 *
 *     Cento e uma espécies sem recompensa, e é o mesmo defeito que a L-105
 *     mediu no nível: a escada acaba e o número continua andando. Um registro
 *     que para de importar em 30% do caminho ensina o jogador a parar de olhar.
 *
 * Então a segunda metade do registro paga em ENCONTROS, e não em vagas:
 *
 *     45 espécies    a 4ª vaga           (`MARCOS_VAGAS`, como antes)
 *     60 · 80        +1 encontro cada
 *    100 · 120       +1 encontro cada
 *    o elenco INTEIRO +2                  — a marca de quem terminou
 *
 * Seis encontros a mais ao fim do elenco: **30 -> 36, 20% de farm**.
 * Sensível, e nada quebrado — o passo por marco é um só, então a diferença
 * entre quem tem 60 e quem tem 120 nunca é grande o bastante para o segundo
 * ficar inalcançável.
 *
 * O último marco vale DOIS de propósito: completar não pode render o mesmo que
 * mais um degrau qualquer, ou o degrau final deixa de ser um fim. */
/* ── A ESCADA REDESENHADA NO 1.27 (L-132) ────────────────────────────────
 *
 * A anterior era `60·80·100·120`, +1 cada, e tinha dois erros que o dono viu
 * antes de mim:
 *
 *     o MEIO ERA MORTO      as quatro vagas fecham aos 45, e o primeiro degrau
 *                           do teto só chegava aos 60. Quinze espécies andadas
 *                           sem nenhuma das duas escadas responder
 *     o FIM ERA MESQUINHO   completar a dex — o feito mais difícil do jogo —
 *                           valia +2 num teto de 30. Seis por cento.
 *
 * A nova começa CEDO (25, antes de as vagas fecharem), não dorme em vão nenhum
 * maior que 25, e o passo CRESCE em vez de ficar plano:
 *
 *     25 → 32   +2      50 → 34   +2      75 → 37   +3
 *    100 → 40   +3     125 → 44   +4     COMPLETO → 50   +6
 *
 * **30 → 50 é +67% para quem terminou**, contra +20% de antes, e o degrau final
 * passa a valer 12% do teto em vez de 6%.
 *
 * ── E O CRITÉRIO DO TAMANHO É DELE, NÃO MEU ────────────────────────────
 *
 *   > "não precisa ser algo desenfreado, mas pode dar uma melhorada sobre a
 *   >  questão do teto atual"
 *
 * O teto diário é o que limita a renda de um dia, e com o RMT vivo isso tem
 * dimensão de dinheiro real — o jogador com mais horas é justamente o que mais
 * se aproxima de vender. A medição está no relatório do bloco e na L-132. */
export const MARCOS_ENCONTROS = [
  /* 30 e nao 25: as vagas abrem em 0/10/25/45, e um degrau em cima de outro
     faria as DUAS escadas responderem no mesmo ponto — o jogador deixaria de
     ter dois objetivos e passaria a ter um so, com premio dobrado. */
  { em: 30,  ganho: 2 },
  { em: 50,  ganho: 2 },
  { em: 75,  ganho: 3 },
  { em: 100, ganho: 3 },
  { em: 125, ganho: 4 },
];

/* ── E O ÚLTIMO MARCO É "COMPLETO", QUE NÃO É UM NÚMERO ────────────────────
 *
 * A primeira versão escreveu o tamanho do elenco de hoje como constante. O
 * portão §Gen2 reprovou na hora, e com razão:
 *
 *     O tamanho da dex é DADO do pack. Escrito no motor, acrescentar uma
 *     geração deixa de ser editar um arquivo e passa a ser caçar números em
 *     lugares que ninguém lembra.
 *
 * "Completar" é uma RELAÇÃO entre o que se viu e o que existe — e relação não
 * se escreve como constante. O total entra por parâmetro, do pack. */
/* O DOBRO DO MAIOR DEGRAU, e não mais um degrau qualquer. A regra já estava
   escrita aqui antes do 1.27, e ela continua valendo — o que mudou é o número
   que a cumpre: era +2 contra degraus de +1, e agora é +6 contra degraus de
   +4, que é o único passo que DOBRA. */
export const GANHO_COMPLETO = 6;

export const bonusDeEncontros = (vistas, total = Infinity) => {
  const n = Math.max(0, Math.floor(Number(vistas) || 0));
  const T = Number(total);
  const porMarco = MARCOS_ENCONTROS.reduce((a, m) => a + (n >= m.em ? m.ganho : 0), 0);
  const completo = Number.isFinite(T) && T > 0 && n >= T ? GANHO_COMPLETO : 0;
  return porMarco + completo;
};

/* O teto REAL de hoje. `TETO_ENCONTROS` continua sendo o piso — quem não passou
   de marco nenhum vê exatamente o número de antes, e nada muda para ele. */
export const tetoDeEncontros = (vistas, total) =>
  TETO_ENCONTROS + bonusDeEncontros(vistas, total);

/* Qual é o próximo marco de encontro, e quanto falta. `null` quando acabou — a
   tela precisa distinguir "faltam 14" de "não há mais", e um zero confunde os
   dois. É a mesma forma da `proximaVaga`, e de propósito: duas escadas que se
   leem do mesmo jeito são uma escada só na cabeça do jogador. */
export function proximoEncontro(vistas, total) {
  const n = Math.max(0, Math.floor(Number(vistas) || 0));
  const m = MARCOS_ENCONTROS.find(x => n < x.em);
  if (m) return { em: m.em, faltam: m.em - n, ganho: m.ganho, completo: false };
  /* Passados os marcos, o que resta é COMPLETAR — e o alvo vem do pack. */
  const T = Number(total);
  if (Number.isFinite(T) && T > 0 && n < T)
    return { em: T, faltam: T - n, ganho: GANHO_COMPLETO, completo: true };
  return null;
}

/* O máximo que um perfil pode render. É o que se reserva ao iniciar. */
export const maximoDo = perfil => (PERFIS[perfil]?.encontros ?? [0, 0])[1];

/* Quanto já está comprometido: o que foi colhido hoje mais o máximo de tudo que
   está em campo. `emCampo` é a lista de perfis das expedições ainda não
   colhidas — quem chama sabe disso, e este módulo não guarda estado. */
export function comprometido(estado) {
  const e = estado ?? {};
  const colhidos = e.encontrosHoje ?? 0;
  /* ── A RESERVA CONHECE O TAMANHO DA EQUIPE (L-140, bloco 1.27) ─────────
     Com o multiplicador de concentração, reservar só pelo perfil vira FURO no
     §P5: uma Vigília de três reserva 14 e entrega 28, e o teto do dia é
     ultrapassado sem que nada recuse.

       > Um teto que reserva menos do que a coisa entrega não é um teto: é uma
       > sugestão que o próprio jogo desmente na hora de pagar.

     A FORMA ANTIGA CONTINUA VALENDO. `emCampo` era uma lista de perfis, e um
     save gravado antes deste bloco traz strings — quebrar nele seria trocar um
     furo por uma tela que não abre. String vale um membro, que é o que ela
     sempre quis dizer. */
  const reservado = (e.emCampo ?? []).reduce((a, x) => {
    const perfil = typeof x === 'string' ? x : x?.perfil;
    const membros = typeof x === 'string' ? 1 : x?.membros;
    return a + Math.round(maximoDo(perfil) * fatorDaEquipe(membros));
  }, 0);
  /* ── E RESERVAS DE QUALQUER OUTRA FONTE (§7.22.3) ──────────────────────
     O teto conta ENCONTROS, e quem os produz não precisa ser expedição. O
     Avanço reserva aqui, e é isso que faz os DOIS MODOS DIVIDIREM O MESMO
     TETO — a decisão que transforma "onde vão os encontros de hoje: no meu
     sono ou na minha tela?" numa pergunta de jogo.

       > Se cada modo tivesse o seu teto, não haveria escolha nenhuma: seriam
       > dois farms empilhados, e o §P5 valeria metade.

     Lista de NÚMEROS, e não de perfis: este módulo não pode conhecer o
     Avanço — ele é a camada de baixo, e a seta aponta para cá. */
  const outras = (e.reservas ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  return colhidos + reservado + outras;
}

/* O teto usado e sempre o de HOJE — `TETO_ENCONTROS` e so o piso. `estado.vistas`
   ausente cai no piso, e isso e de proposito: um save velho, ou um chamador que
   nao conhece o registro, ve exatamente o comportamento de antes. */
export const restamEncontros = estado =>
  Math.max(0, tetoDeEncontros(estado?.vistas, estado?.total) - comprometido(estado));

/* `membros` entra com padrão 1: quem chamava antes continua perguntando o
   mesmo, e quem manda equipe pergunta pelo que vai de fato acontecer. */
export const cabeExpedicao = (estado, perfil, membros = 1) =>
  comprometido(estado) + Math.round(maximoDo(perfil) * fatorDaEquipe(membros))
    <= tetoDeEncontros(estado?.vistas, estado?.total);


/* Os perfis. `vies` desloca a curva de raridade: -1 puxa para comum, +1 para
   raro. `encontros` é [mínimo, máximo] inclusive. */
export const PERFIS = {
  batida:  { rotulo: 'Batida',  minutos:  45, custo: 20, encontros: [ 3,  5], vies: -1, xp: 1.0 },
  trilha:  { rotulo: 'Trilha',  minutos: 180, custo: 45, encontros: [ 6,  8], vies:  0, xp: 3.5 },
  vigilia: { rotulo: 'Vigília', minutos: 480, custo: 90, encontros: [10, 14], vies: +1, xp: 8.0 },
};

/* ── CONCENTRAR TEM DE VALER A PENA, E NÃO PODE DOMINAR (L-140) ──────────
 *
 * Cobrança do dono, e medida no motor antes de mexer:
 *
 * Ele descreveu assim, e a citação vai parafraseada porque o §0.3 não deixa
 * identificador de franquia entrar no motor: se o jogador manda DUAS criaturas
 * para o mesmo bioma, é porque ele quer farmar mais ali — e essa distribuição
 * a mais precisa existir e ser equilibrada.
 *
 *     custo       escalava ×2, ×3      pela equipe
 *     encontros   NÃO escalava         só do perfil
 *     itens       NÃO escalava         só do perfil
 *
 * Botar dois no mesmo bioma custava o dobro de stamina e trazia exatamente os
 * mesmos itens. O único ganho era nivelar duas de uma vez — o oposto do pedido.
 *
 * ── E A CURVA NÃO É LINEAR, E É AQUI QUE ELA SE DECIDE ──────────────────
 *
 *     1 membro   ×1,00
 *     2 membros  ×1,55
 *     3 membros  ×2,00
 *
 * Com ×2 EXATO para dois, concentrar seria idêntico a espalhar: mandar dois
 * num bioma daria o mesmo que mandar um em dois, e a escolha de rota — que é a
 * mecânica inteira do idle — deixaria de existir.
 *
 *   > Retorno decrescente é o que faz as duas estratégias valerem e serem
 *   > DIFERENTES: concentrar traz mais do MESMO lugar, para quem caça uma
 *   > pedra específica; espalhar traz variedade, para quem monta linhas
 *   > evolutivas. Nenhuma domina.
 *
 * O critério é do dono, e ele o disse assim: *"o jogador precisa sentir a
 * recompensa, claro, mas não pode ser nada surreal e quebrado"*.
 *
 * A LISTA É EXPLÍCITA e não uma fórmula: com teto de três, uma potência
 * fracionária seria três números escondidos atrás de um expoente que ninguém
 * consegue conferir de cabeça. */
export const FATOR_DA_EQUIPE = [1, 1, 1.55, 2];

export const fatorDaEquipe = n => {
  const q = Math.max(1, Math.floor(Number(n) || 1));
  /* Acima do teto, o último fator vale. Passar mais que `EQUIPE_MAX` já é
     recusado no envio; aqui a conta segura de qualquer forma, porque uma
     função de economia que confia na guarda de outra é uma função que quebra
     no dia em que a guarda mudar de lugar. */
  return FATOR_DA_EQUIPE[Math.min(q, FATOR_DA_EQUIPE.length - 1)];
};

/* ── A CURVA DE RARIDADE ───────────────────────────────────────────────────
 *
 * O peso base cai por faixa, e o viés o move por POTÊNCIA e não por soma:
 *
 *     peso = base[i] * FATOR ^ (i * vies)
 *
 * Potência porque o efeito precisa CRESCER conforme a faixa fica rara. Somar
 * um bônus fixo daria quase nada no muito raro, que é exatamente onde a Vigília
 * precisa se diferenciar — e a escolha de duração voltaria a não importar.
 *
 * O comum é a ÂNCORA: `i = 0` faz o expoente zerar, então o peso dele nunca
 * muda. Mover os dois lados faria a conta depender da ordem em que as faixas
 * foram escritas no pack, e o teste reprova isso.
 *
 * A ORDEM DAS FAIXAS VEM DO PACK. Este arquivo não sabe que existe "comum" nem
 * "lendário": ele sabe que a primeira faixa é a mais fraca, porque foi assim
 * que `engine/bioma.mjs` as declarou. */
export const PESO_BASE = [100, 40, 12, 3, 1];
export const FATOR_VIES = 2;

/* A ordem canônica das faixas, dada por um pack. Fora daqui ninguém precisa
   saber que ela é um array. */
const ordemDe = pack => (pack.raridade ?? []).map(([id]) => id);

/* O peso de uma faixa. `ordem` é opcional para o uso mais comum — o teste e a
   tela chamam com o nome só, e a ordem padrão é a do índice conhecido. */
export function pesoDaRaridade(raridade, vies = 0, ordem = ORDEM_PADRAO) {
  const i = ordem.indexOf(raridade);
  if (i < 0) return 0;
  const base = PESO_BASE[i] ?? PESO_BASE[PESO_BASE.length - 1];
  return base * Math.pow(FATOR_VIES, i * vies);
}

/* A ordem que o pack de referência usa. Existe só para a assinatura curta
   acima; o sorteio de verdade lê a ordem DO PACK que recebeu. */
const ORDEM_PADRAO = ['comum', 'incomum', 'raro', 'muitoRaro', 'lendario'];

/* ── A STAMINA ─────────────────────────────────────────────────────────────
 *
 * Guardada como (valor, instante) e DERIVADA no presente. Guardar o valor
 * atualizado exigiria alguém rodando um relógio; derivar funciona mesmo com o
 * servidor desligado a semana inteira.
 *
 * SATURA NO TETO, e isso é decisão: sem saturação, quem some por uma semana
 * volta com estoque para queimar o dia inteiro de uma vez — e o teto diário,
 * que é o §P5, deixaria de significar coisa alguma. */
export function staminaAgora(criatura, agora) {
  const base = criatura?.stamina ?? 0;
  const desde = criatura?.staminaEm ?? agora;
  const horas = Math.max(0, agora - desde) / 3600_000;
  return Math.min(STAMINA_MAX, base + horas * REGEN_POR_HORA);
}

/* O custo é POR CRIATURA. Custo por expedição faria a equipe cheia sair de
   graça, e mandar três deixaria de ser decisão. */
export const custoDe = (perfil, tamanho) => (PERFIS[perfil]?.custo ?? 0) * tamanho;

/* UMA CRIATURA SEM STAMINA REPROVA A EQUIPE INTEIRA — e a recusa diz quem.
   Deixar passar transformaria a stamina em sugestão: bastaria pôr um cansado
   no meio de dois descansados. */
export function podeEnviar(equipe, perfil, agora) {
  const p = PERFIS[perfil];
  if (!p) return { pode: false, motivo: 'perfil inexistente', semStamina: [] };
  const semStamina = equipe
    .filter(c => staminaAgora(c, agora) < p.custo)
    .map(c => c.id);
  return { pode: semStamina.length === 0, semStamina, custo: p.custo };
}

/* ── INICIAR ───────────────────────────────────────────────────────────────
 *
 * A assinatura NÃO tem gancho para teto. Ver o comentário de cabeça: é o §P5
 * escrito como ausência de porta, e não como disciplina de quem chama. */
export function iniciar({ equipe, perfil, bioma, agora, estado = {} }) {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);
  if (!equipe?.length) throw new Error('expedição sem equipe');
  if (equipe.length > EQUIPE_MAX)
    throw new Error(`a equipe tem ${equipe.length}, e o teto é ${EQUIPE_MAX}`);

  const { pode, semStamina } = podeEnviar(equipe, perfil, agora);
  if (!pode) throw new Error(`sem stamina: ${semStamina.join(', ')}`);

  /* O TETO LIDO DA CONSTANTE, sempre. `estado` traz o que já aconteceu hoje;
     ele não traz, e não pode trazer, qual é o limite. */
  if (!cabeExpedicao(estado, perfil))
    throw new Error(
      `o teto diário de ${TETO_ENCONTROS} encontros não comporta mais uma ` +
      `${p.rotulo}: ${comprometido(estado)} já comprometidos, e ela reserva ` +
      `${maximoDo(perfil)}`);

  const vagas = Math.min(estado.limiteSimultaneas ?? SIMULTANEAS_INICIAIS, SIMULTANEAS_MAX);
  if ((estado.simultaneas ?? 0) >= vagas)
    throw new Error(`já há ${estado.simultaneas} expedição(ões) em campo, e o limite é ${vagas}`);

  return {
    perfil, bioma,
    equipe: equipe.map(c => c.id),
    custo: custoDe(perfil, equipe.length),
    iniciadaEm: agora,
    terminaEm: agora + p.minutos * 60_000,
  };
}

export const pronta = (exp, agora) => agora >= exp.terminaEm;

/* ── O SORTEIO DOS ENCONTROS ───────────────────────────────────────────────
 *
 * O ELENCO É O DO BIOMA, que é o do PACK INTEIRO — e não o da Arena.
 *
 * Isto é decisão do dono do projeto, e é a coisa mais fácil de quebrar por
 * distração deste arquivo: `pack.elenco` está ali do lado, tem nome parecido e
 * é o que a Arena usa. Trocar um pelo outro apagaria setenta espécies do jogo —
 * Caterpie, Weedle, Paras, Bellsprout — sem erro nenhum aparecer. O teste
 * `§idle` existe só para isso.
 *
 * A quantidade sai do perfil; a espécie sai do peso da raridade deslocado pelo
 * viés do perfil. */
/* QUEM MORA NESTE LUGAR, NESTA PROFUNDIDADE — num lugar so.
 *
 * O sorteio e a previa liam o elenco cada um por si, com a mesma linha escrita
 * duas vezes, e o portao apontou: ancora ambigua no defeito plantado. E a
 * terceira vez neste bloco que uma duplicata vira um problema de ferramenta
 * antes de virar um problema de jogo — e a divergencia aqui seria a pior de
 * todas: a tela PROMETERIA uma lista e a colheita sortearia outra.
 *
 * O estagio FILTRA. Fora da faixa, a especie nao esta la — e e isso que faz a
 * previa de dois estagios ser duas listas diferentes, e nao a mesma lista com
 * outros numeros. */
export const elencoDoEstagio = (pack, bioma, elenco = null, estagio = 1) =>
  (elenco ?? elencoDoBioma(pack, bioma)).filter(e => cabeNoEstagio(e.raridade, estagio));

/* ── O QUE APARECE AQUI, ANTES DE GASTAR AS HORAS (bloco 1.10) ────────────
 *
 * Pedido do dono na L-084: clicar no estagio mostra quais criaturas aparecem e
 * com que chance. E a mesma ideia que ja governa a tela do bioma — *escolher a
 * rota e a decisao do idle, e ela e cega se o jogador so descobrir o lugar
 * depois de mandar*.
 *
 * Devolve CHANCE, e nao peso. Peso e um numero interno que nao significa nada
 * sozinho: 3,4 nao diz se e muito ou pouco. Porcentagem diz.
 *
 * E a soma bate 100 por construcao, porque a lista e o espaco amostral inteiro
 * — o que faz a prevbia ser conferivel a olho, e nao so plausivel. */
export function previaDeEncontros({ pack, bioma, perfil, estagio = 1, elenco = null,
                                    efeitos = null }) {
  const p = PERFIS[perfil];
  if (!p) return [];
  const lista = elencoDoEstagio(pack, bioma, elenco, estagio);
  if (!lista.length) return [];
  const ordem = ordemDe(pack);
  const vies = viesFinal(p.vies, estagio);
  const pesos = lista.map(e => pesoDaRaridade(e.raridade, vies, ordem));
  const total = pesos.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return lista.map((e, i) => ({ ...e, chance: (pesos[i] / total) * 100 }))
    .sort((a, b) => b.chance - a.chance);
}

/* ── O FOCO DA EQUIPE ENTRA AQUI (1.16) ────────────────────────────────────
 *
 * `efeitos` e opcional e o padrao e o neutro, de proposito: quem chamava antes
 * continua chamando igual e recebe exatamente o que recebia. Um parametro novo
 * obrigatorio faria todos os chamadores mudarem juntos, e o que muda junto
 * quebra junto.
 *
 * Ele mexe em DUAS coisas e nao numa: quantos encontros vem, e quao raro cada
 * um pode ser. Sao os dois lados da mesma troca — o Batedor traz muitos e
 * comuns, o Vigia traz poucos e raros —, e mexer so num deixaria um dos dois
 * focos sem a metade que o justifica. */
export function sortearEncontros(rnd, { pack, bioma, perfil, estagio = 1, elenco = null,
                                        efeitos = null, membros = 1 }) {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);

  const lista = elencoDoEstagio(pack, bioma, elenco, estagio);
  if (!lista.length) return [];

  const ordem = ordemDe(pack);
  /* O foco da equipe soma DEPOIS do teto do estagio: o teto existe para a
     raridade nao inverter (ver `VIES_TETO`), e vale para toda fonte de vies —
     inclusive esta. Somar antes deixaria um foco furar o teto.

     ESTA LINHA FOI PARAR NA `previaDeEncontros` na primeira tentativa, porque
     a ancora do meu recorte aparecia nas DUAS funcoes e eu troquei a primeira.
     Resultado: a previa quebrou em execucao (o portao visual pegou) e o
     sorteio ficou sem o vies (a sabotagem dirigida pegou). Dois defeitos de
     um recorte so. */
  /* O ESTAGIO SOMA AO VIES DO PERFIL (bloco 1.10). Uma soma, e nao um maximo: e
     o que faz "Vigilia no estagio 4" ser o lugar mais raro do jogo, e faz
     sentido que seja — o perfil escolhe quanto tempo, o estagio escolhe quao
     fundo, e as duas decisoes sao independentes. */
  const vies = viesFinal(p.vies, estagio);
  const pesos = lista.map(e => pesoDaRaridade(e.raridade, vies, ordem));
  const total = pesos.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const [min, max] = p.encontros;
  const base = min + Math.floor(rnd() * (max - min + 1));
  /* O SORTEIO VEM PRIMEIRO, e o foco multiplica depois. Se o foco entrasse na
     faixa do sorteio, ele consumiria uma quantidade diferente do gerador e a
     mesma semente daria saques diferentes conforme a equipe — e a colheita
     deixaria de ser auditavel pela semente, que e o §25.2. */
  const comFoco = efeitos ? encontrosCom(base, efeitos) : base;
  /* ── E A EQUIPE MULTIPLICA POR ÚLTIMO (L-140, bloco 1.27) ──────────────
     Depois do sorteio E depois do foco, pela MESMA razão que o foco entra
     depois do sorteio: mexer na faixa consumiria uma quantidade diferente do
     gerador, e a mesma semente daria saques diferentes conforme a equipe — a
     colheita deixaria de ser auditável pela semente, que é o §25.2.

     `round` e não `floor`: com dois membros o fator é 1,55, e cortar para
     baixo devolveria o mesmo número que um membro em metade dos casos — o
     jogador pagaria o dobro de stamina por nada, que é o defeito de novo. */
  const quantos = Math.round(comFoco * fatorDaEquipe(membros));

  /* ── O ENCONTRO GARANTIDO DO VIGIA (1.16, D-073) ─────────────────────────
   *
   * O foco `vigia` nao empurra o vies — o teto o engolia. Ele reserva as
   * primeiras vagas para a faixa MAIS RARA que este estagio oferece.
   *
   * Reservado no COMECO e nao trocado no fim de proposito: trocar depois
   * consumiria o gerador de forma diferente conforme o resultado, e a mesma
   * semente deixaria de reproduzir a colheita (§25.2). Aqui o gerador e
   * consumido a mesma quantidade de vezes, com equipe ou sem. */
  const faixas = faixasDoEstagio(estagio);
  const maisRara = faixas[faixas.length - 1];
  const raros = lista.filter(e => e.raridade === maisRara);
  /* `floor` de proposito, e nao por gosto: sem ele um `garantido` fracionario
     (0,33, por exemplo) ainda rodaria o laco UMA vez, porque `0 < 0,33`. A
     garantia funcionaria por acidente da comparacao, e uma sabotagem que
     trocasse o `Math.max` da equipe por uma media passaria despercebida —
     passou, na primeira versao. Meia garantia nao existe: ou vem um raro, ou
     nao vem. */
  const pedidos = Math.floor(Number(efeitos?.garantido) || 0);
  const garantidos = Math.min(quantos, raros.length ? pedidos : 0);

  const saida = [];
  for (let g = 0; g < garantidos; g++)
    saida.push(raros[Math.floor(rnd() * raros.length)]);

  for (let n = garantidos; n < quantos; n++) {
    let r = rnd() * total;
    for (let i = 0; i < lista.length; i++) {
      r -= pesos[i];
      if (r <= 0) { saida.push(lista[i]); break; }
    }
    if (saida.length === n) saida.push(lista[lista.length - 1]);
  }
  return saida;
}
