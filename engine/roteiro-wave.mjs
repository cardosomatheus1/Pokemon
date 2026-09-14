/* O ROTEIRO DE UMA WAVE — blocos A4a e A4b (Spec §7.22.5, §7.22.6 e §7.22.18).
 *
 * Fronteira: entra a wave JÁ RESOLVIDA — quem apareceu, se venceu, quanto
 * custou — e sai a linha do tempo em que isso acontece na tela. Puro, sem DOM,
 * sem estado guardado e sem tema.
 *
 * ── A LINHA QUE ESTE ARQUIVO NÃO ATRAVESSA ────────────────────────────────
 *
 *   > **O roteiro DISTRIBUI o que a wave já decidiu. Ele não decide nada.**
 *
 * É a mesma divisão que a arena usa desde o começo, e é ela que dá de graça as
 * quatro coisas do §7.22.6: reconexão, determinismo, auditoria e medição. Se
 * este arquivo pudesse mudar um abate ou um ponto de dano, a run encenada e a
 * run resolvida seriam duas — e duas verdades sobre a mesma coisa é o defeito
 * que este projeto mais paga.
 *
 * O teste afirma isso por soma: os golpes RECEBIDOS somam exatamente o dano da
 * wave.
 *
 * ── A REESCRITA DE 08/09/2026: DUELO, E NÃO CERCO ────────────────────────
 *
 * A primeira versão soltava os seis mobs nos primeiros 45% da wave e os
 * derrubava espalhados. O dono viu na tela e cortou, com a razão inteira numa
 * frase:
 *
 *   > "o que NÃO pode acontecer é o bulbassauro ficar brigando com 4-5-6 de
 *   >  vez, que aí ele não ia ser um bulbassauro e sim um DEUS kkk"
 *
 * Ele está certo, e o erro não era de arranjo: era de LEITURA DO JOGO. Uma
 * criatura de nível baixo cercada por seis selvagens e ganhando não conta a
 * história que o resto do sistema conta — a stamina, o HP que é relógio, a
 * poção que salva. Ela conta que o bicho é invencível.
 *
 * O modelo agora é o duelo, e ele vem em LEVAS:
 *
 *     até DOIS mobs entram, vêm andando, e PARAM de frente para você
 *     vocês trocam golpes, com balão, dano e barra descendo
 *     eles caem; há um respiro; a leva seguinte entra
 *
 * O dois é ajuste do próprio dono, depois de ver o duelo de um só rodando:
 *
 *   > "não precisa necessariamente ser 1 só, pode vir pelo menos 2, pra também
 *   >  as waves não demorarem tanto"
 *
 * É a linha certa: um por vez respeita a leitura, mas faz seis duelos numa
 * wave de dois a quatro minutos ficarem apertados. Dois de cada vez são três
 * levas em vez de seis, e o Bulbasaur continua não sendo um deus.
 *
 * E há uma consequência boa que não foi pedida: com poucos em cena, cada queda
 * é um ACONTECIMENTO. Seis caindo ao mesmo tempo é um número mudando.
 */

/* Quantos entram juntos. O teto é do dono, e é o que separa "duelo" de
   "cerco": dois é uma dupla, e a partir de três a leitura vira multidão. */
export const POR_LEVA = 2;

/* O §7.22.5 escreve a faixa, e ela vira constante aqui para o teste poder
   afirmá-la: dez waves nesta faixa dão os ~40 min de um avanço, medidos. */
/* ── A WAVE ENCOLHEU PELA METADE E MAIS UM POUCO (09/09/2026) ────────────
 *
 * Era de 2 a 4 minutos, e o dono mandou a tela: **28:25 na wave 6 de 10**.
 *
 *   > "os combates estão MUITO demorados e muitas vezes nem se completa wave.
 *   >  Quem joga um idle não tem 1 hr pra passar UM MAPA."
 *
 * Medido no motor, com o ritmo real da run, ANTES de mexer:
 *
 *     lv7  x1    44,7 min      lv20 x3    13,5 min
 *     lv20 x1    25,6 min      lv50 x3    11,7 min
 *
 * Quarenta e cinco minutos não é uma sessão: é um turno. E o pior é que a
 * derrota REPETE a wave inteira — com equipe de começo, três repetições.
 *
 * ── DE ONDE SAI O NÚMERO NOVO ───────────────────────────────────────────
 *
 * Do que o modo É. O Avanço é a tela que se ASSISTE, e o §7.22 nasceu da
 * crítica *"você literalmente não vê NADA acontecendo"*: a wave precisa durar
 * o bastante para ser uma cena, e pouco o bastante para dez delas caberem numa
 * sessão.
 *
 *     45 a 90 s      dez waves = 7 a 15 min, e o ritmo modula em volta disso
 *
 * Uma wave de 45 s ainda tem entrada, duelo e queda — a leva de dois entra em
 * 3,5 s e os golpes vêm a cada 2 s. O que sai é o tempo morto. */
export const DURACAO_MIN_MS = 45_000;
export const DURACAO_MAX_MS = 90_000;

/* Quanto o mob leva vindo da borda até parar de frente para você. É o único
   pedaço da wave em que ninguém apanha, e ele existe por isso: sem respiro
   entre duelos, a wave lê como uma barra de progresso com sprites. */
export const APROXIMACAO_MS = 3_500;

/* O intervalo entre golpes. Dois segundos é o que a arena usa entre ações e é
   o que dá tempo de LER o balão — mais rápido vira pisca-pisca, mais lento
   vira espera. A folga sorteada em volta evita o metrônomo. */
const GOLPE_MS = 2_000;
const GOLPE_FOLGA = 700;

/* ── QUANTOS GOLPES UM DUELO TEM, NO MÍNIMO — D-084 ──────────────────────
 *
 * `meusGolpes` saía SÓ de quanto tempo cabia no duelo. Quando a wave encurtou
 * (de 2–4 min para 45–90 s, mais o piso de ritmo), passou a caber UM — e
 * `repartir(HP_MOB, 1)` devolve `[100]`. Medido no navegador, com um
 * observador ligado por 28 s de wave 1:
 *
 *     que eu dou     -100  -100  -100  -100
 *     que eu levo      -1    -1    -1
 *
 * Quatro selvagens, quatro socos, nenhum duelo.
 *
 * ── É POR ISSO QUE O "-31" DO DONO NUNCA CHEGOU ─────────────────────────
 *
 * Ele pediu o hitbox quatro vezes escrevendo *"-13"*, *"-35"*, *"-31"* — três
 * números DIFERENTES, porque o que ele quer ver é a troca. Um "-100" fixo
 * cumpre a letra do pedido e nega o espírito dele.
 *
 * ── O PISO É SOBRE A CONTAGEM, E NUNCA SOBRE O TEMPO ────────────────────
 *
 * Encurtar a wave continua valendo — foi decisão do dono e está medido. O que
 * muda é que os golpes se APROXIMAM em vez de sumirem: com pouco tempo, o
 * passo encolhe até o mínimo legível. Um piso de tempo desfaria o item 5 pela
 * porta dos fundos, e sem ninguém decidir isso.
 *
 * Três porque é o menor número em que a troca se lê: bate, apanha, bate. Com
 * dois, metade dos duelos ainda sai com números iguais. */
export const GOLPES_MIN = 3;

/* E o passo nunca fica menor que isto, mesmo espremido: abaixo de meio segundo
   os balões se atropelam e o que se vê é pisca-pisca, não luta. */
const GOLPE_MIN_MS = 500;

/* O respiro depois de uma queda, antes de o próximo entrar. Curto de
   propósito: é pontuação, não pausa. */
const RESPIRO_MS = 1_200;

/* O HP de encenação de um mob. Não é dado do motor — o A2 decide a WAVE, e
   não a vida de cada bicho. É a escala em que a barra dele desce, e ela é a
   mesma para todos: quem dura mais é quem tem duelo mais longo, porque leva
   mais golpes, cada um tirando menos.
 *
 * Cem é escolhido para casar com a barra do jogador, que também é 100 (§7.22.7).
 * Duas barras na mesma tela com escalas diferentes seriam duas leituras para o
 * mesmo gesto. */
export const HP_MOB = 100;

const inteiro = n => Math.max(0, Math.round(Number(n) || 0));
const entre = (r, a, b) => a + r() * (b - a);

/* Reparte um inteiro em `n` pedaços que SOMAM ele. O último recebe a sobra de
   propósito: arredondar cada pedaço e torcer para fechar é como um ponto de
   dano some, e um ponto de dano que some é a tela discordando do motor. */
function repartir(r, total, n) {
  const partes = [];
  let resta = total;
  for (let i = 0; i < n - 1; i++) {
    /* Ninguém leva tudo antes do fim: cada pedaço deixa pelo menos um ponto
       para cada golpe que ainda falta. */
    const teto = Math.max(1, resta - (n - 1 - i));
    const p = Math.max(1, Math.min(teto,
      Math.round(entre(r, resta / (n - i) * 0.6, resta / (n - i) * 1.4))));
    partes.push(p);
    resta -= p;
  }
  partes.push(resta);
  return partes;
}

/* ── O ROTEIRO ────────────────────────────────────────────────────────────
 *
 * `comp` é a composição da wave (`composicaoDaWave`), e cada mob vira um duelo
 * com índice próprio — é o índice que amarra a entrada dele, os golpes dele e
 * a queda dele, e é por isso que a tela consegue mostrar QUEM caiu em vez de
 * um contador.
 *
 * `golpesMeus` e `golpesDele` são QUANTOS golpes cada lado tem disponível. O
 * roteiro devolve o ÍNDICE sorteado, e quem chama resolve o nome — este módulo
 * não pode conhecer o tema (§0.3), e nome de golpe é tema. */
export function roteiroDaWave(sorte, { comp, venceu, dano, golpesMeus = 1,
                                       golpesDele = 1, ritmo = 1 } = {}) {
  const r = typeof sorte === 'function' ? sorte : Math.random;
  const lista = Array.isArray(comp) ? comp : [];

  /* ── O RITMO ENCURTA A WAVE INTEIRA ──────────────────────────────────
     Ele vem de fora (`fatorDoRitmo`, no A2) porque quem sabe comparar poder
     com ameaça é quem resolve a wave — este arquivo só distribui.

     Multiplica a faixa toda, e não corta o fim: uma wave "de 2 a 4 min vezes
     0,5" é de 1 a 2 min, e continua tendo variação. Cortar o teto daria
     sempre o mesmo minuto, e a wave viraria metrônomo.

     Segundo cheio: a duração aparece no relógio da tela e no log, e um número
     quebrado ali não informa mais — só polui. */
  const passo = Math.max(0.05, Number(ritmo) || 1);
  const duracao = Math.round(entre(r, DURACAO_MIN_MS, DURACAO_MAX_MS) * passo / 1000) * 1000;

  const atores = [];
  for (const g of lista)
    for (let k = 0; k < inteiro(g?.quantos); k++)
      atores.push({ i: atores.length, dex: g?.dex });

  const momentos = [];
  const total = inteiro(dano);

  if (!atores.length) {
    /* Sem ninguém em cena o dano ainda tem de sair: um elenco vazio é um save
       que cita bioma removido do pack, e o jogo continua de pé. */
    if (total > 0) momentos.push({ t: Math.round(duracao / 2), tipo: 'golpe', de: 'dele', dano: total, golpe: 0 });
    return { duracao, momentos, duelos: [] };
  }

  /* ── AS LEVAS ───────────────────────────────────────────────────────────
     Numa wave PERDIDA entra UMA leva e ela não cai: é a leitura certa — você
     não conseguiu derrubar aqueles, e é por isso que a wave repete. Trazer os
     seis para uma wave que ninguém vence seria encher a tela de gente que não
     morre. */
  const entram = venceu === true ? atores : atores.slice(0, POR_LEVA);
  const levas = [];
  for (let i = 0; i < entram.length; i += POR_LEVA)
    levas.push(entram.slice(i, i + POR_LEVA));
  const duracaoDaLeva = duracao / levas.length;

  /* O dano da wave é repartido entre TODOS os golpes que eu vou receber, e o
     número de golpes sai do tempo — não do contrário. */
  const golpesPorLeva = Math.max(1,
    Math.floor((duracaoDaLeva - APROXIMACAO_MS - RESPIRO_MS) / (GOLPE_MS * 2)));
  const golpesRecebidos = golpesPorLeva * levas.length;
  const fatias = total > 0 ? repartir(r, total, Math.min(total, golpesRecebidos)) : [];

  const duelos = [];
  let fatia = 0;
  let relogio = 0;

  for (const leva of levas) {
   const inicioDaLeva = Math.round(relogio);
   for (const [posicao, a] of leva.entries()) {
    /* Os da mesma leva entram com meio segundo de diferença. Ao mesmo tempo
       eles leriam como um elemento só, e o olho não separa dois sprites que
       surgem no mesmo quadro. */
    const inicio = inicioDaLeva + posicao * 500;
    momentos.push({ t: inicio, tipo: 'entra', i: a.i, dex: a.dex });

    /* A LUTA COMEÇA DEPOIS DA CAMINHADA. O mob que apanha antes de chegar
       lê como um bicho apanhando do nada. */
    let t = inicio + APROXIMACAO_MS;
    const fimDoDuelo = inicioDaLeva + duracaoDaLeva - RESPIRO_MS;

    /* O HP dele desce em passos iguais até a queda. Quem dura mais é quem tem
       duelo mais longo — mais golpes, cada um tirando menos. */
    /* ── E NUNCA MENOS QUE `GOLPES_MIN` (D-084) ────────────────────────
       O piso é sobre a CONTAGEM. Quando o tempo não dá para tantos golpes no
       passo confortável, o PASSO encolhe — até o mínimo legível — em vez de a
       troca desaparecer. Ver o comentário longo em `GOLPES_MIN`. */
    const cabem = Math.floor((fimDoDuelo - t) / (GOLPE_MS * 2));
    const meusGolpes = Math.max(GOLPES_MIN, cabem);
    const passoDoGolpe = meusGolpes > cabem
      ? Math.max(GOLPE_MIN_MS, (fimDoDuelo - t) / (meusGolpes * 2))
      : GOLPE_MS;
    const tirados = repartir(r, HP_MOB, meusGolpes);
    let hpDele = HP_MOB;
    const golpes = [];

    for (let k = 0; k < meusGolpes; k++) {
      /* EU BATO PRIMEIRO. Não é vantagem: é leitura. O jogador precisa ver a
         barra do inimigo descer antes de ver a dele, senão o primeiro golpe da
         wave parece uma emboscada. */
      const tMeu = Math.round(t + entre(r, -GOLPE_FOLGA, GOLPE_FOLGA) / 2);
      hpDele = Math.max(0, hpDele - tirados[k]);
      golpes.push({
        t: tMeu, tipo: 'golpe', de: 'meu', i: a.i, dex: a.dex,
        dano: tirados[k], hpAlvo: hpDele,
        golpe: Math.floor(r() * Math.max(1, golpesMeus)),
      });
      t += passoDoGolpe;

      /* ── ELE REVIDA SEMPRE, E ÀS VEZES ERRA ──────────────────────────
         A primeira versão só o fazia atacar quando ainda havia dano da wave
         para distribuir. Medido na tela: numa wave vencida o dano total é ~5,
         e o duelo virava seis golpes meus contra um dele — o inimigo parecia
         um saco de pancada, e o balão do ataque quase nunca aparecia.

         O dano continua sendo EXATAMENTE o que a wave cobrou: o que muda é
         que os golpes sem fatia viram ERRO, e erro é um acontecimento que a
         arena já sabe mostrar. Vencer fácil passa a se PARECER com vencer
         fácil — ele tenta, e não acerta — em vez de parecer que ele desistiu. */
      golpes.push({
        t: Math.round(t + entre(r, -GOLPE_FOLGA, GOLPE_FOLGA) / 2),
        tipo: 'golpe', de: 'dele', i: a.i, dex: a.dex,
        dano: fatia < fatias.length ? fatias[fatia++] : 0,
        golpe: Math.floor(r() * Math.max(1, golpesDele)),
      });
      t += passoDoGolpe;
    }

    for (const g of golpes) momentos.push(g);

    /* A QUEDA. Só existe se a wave foi vencida — o §7.22.6 é explícito: perder
       não abate ninguém, e é isso que faz o log contar uma história em vez de
       um total. */
    if (venceu === true) {
      const tQueda = Math.round(Math.min(fimDoDuelo, t));
      momentos.push({ t: tQueda, tipo: 'abate', i: a.i, dex: a.dex });
      duelos.push({ i: a.i, dex: a.dex, de: inicio, ate: tQueda });
    } else {
      duelos.push({ i: a.i, dex: a.dex, de: inicio, ate: null });
    }
   }
   relogio += duracaoDaLeva;
  }

  /* Sobra de dano: numa wave em que o tempo não coube em golpes, o resto sai
     num golpe final. Nem um ponto pode sumir — é a invariante do arquivo. */
  if (fatia < fatias.length) {
    const resto = fatias.slice(fatia).reduce((a, b) => a + b, 0);
    momentos.push({ t: Math.round(duracao * 0.97), tipo: 'golpe', de: 'dele',
                    i: entram[entram.length - 1].i, dano: resto, golpe: 0 });
  }

  /* Ordem estável: por instante, e o empate resolve pela ordem em que o
     momento nasceu. Sem o desempate, dois motores de ordenação diferentes
     dariam roteiros diferentes para a mesma semente, e o determinismo do §P3
     valeria só até alguém trocar de navegador. */
  const comOrdem = momentos
    .map((m, k) => ({ m: { ...m, t: Math.max(0, Math.min(duracao, m.t)) }, k }));
  comOrdem.sort((a, b) => (a.m.t - b.m.t) || (a.k - b.k));

  return { duracao, momentos: comOrdem.map(x => x.m), duelos };
}

/* O que já aconteceu até o instante `t`. */
export const momentosAte = (roteiro, t) =>
  (roteiro?.momentos ?? []).filter(m => m.t <= t);

/* O retrato da cena num instante: quem caiu, quantos estão em pé e quanto
   sobrou da barra. É o que a tela desenha, e é o que a reconexão recalcula. */
export function estadoEm(roteiro, t, hpInicial = 100) {
  let caidos = 0, entraram = 0, perdido = 0;
  for (const m of (roteiro?.momentos ?? [])) {
    if (m.t > t) break;
    if (m.tipo === 'entra') entraram++;
    else if (m.tipo === 'abate') caidos++;
    else if (m.tipo === 'golpe' && m.de === 'dele') perdido += inteiro(m.dano);
  }
  return {
    caidos, entraram, emCena: entraram - caidos,
    hp: Math.max(0, inteiro(hpInicial) - perdido),
  };
}
