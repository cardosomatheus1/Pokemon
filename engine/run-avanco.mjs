/* A RUN DO AVANÇO — bloco A4a (Spec §7.22.4 a §7.22.8).
 *
 * Fronteira: entra uma run guardada e um instante do relógio; sai onde ela
 * está agora. Puro, sem DOM, sem estado guardado e sem tema.
 *
 * ── O QUE ESTE ARQUIVO RESOLVE, E QUE NENHUM OUTRO RESOLVIA ───────────────
 *
 * O A2 resolve UMA wave. O A3 diz o que a run cobra. Faltava o meio-campo: as
 * dez waves acontecendo NO TEMPO, com a mão do jogador entrando entre elas.
 *
 * E o desenho todo sai de uma exigência do §7.22.6, que é a mesma da arena:
 *
 *   > **O relógio é CONSULTADO, nunca esperado.**
 *
 * A run não é uma fila de temporizadores. Ela é uma função do instante. Fechar
 * a aba por meia hora e voltar custa uma conta — e é a mesma conta que o modo
 * ausente usa, o que faz os dois modos serem o mesmo código visto de dois
 * lugares (§7.22.9, e é o que a L-141 pede).
 *
 * ── PERDER A WAVE NÃO AVANÇA, E ISSO É O RELÓGIO DA RUN ───────────────────
 *
 * Repete-se a mesma wave, pagando dano. O jogador não morre por uma derrota;
 * morre por acumular derrotas — e é isso que transforma o HP num relógio e a
 * poção numa decisão em vez de um botão.
 *
 * ── A POÇÃO NÃO MUDA O QUE A WAVE DECIDIU ─────────────────────────────────
 *
 * Ela muda quanto sobra da barra, e nada mais. Se mudasse o resultado, o
 * roteiro já encenado passaria a mentir no meio da encenação — o jogador veria
 * uma wave perdida virar ganha depois de ter visto a derrota acontecer.
 *
 * Por isso a cura é um EVENTO DATADO dentro da wave: ao reabrir a aba, ela é
 * reaplicada no mesmo instante em que aconteceu, e a barra recalculada bate.
 */
import { WAVES, HP_MAX, resolverWave, ehWaveDeChefe, fatorDoRitmo,
         poderDaEquipe, ameacaDa } from './wave.mjs';
import { roteiroDaWave, estadoEm, APROXIMACAO_MS, HP_MOB } from './roteiro-wave.mjs';
import { derivar } from './seed.mjs';
import { semente } from './instancia.mjs';
import { REGRA_DO_ELENCO } from './elenco-estagio.mjs';

/* Quanto tempo um golpe fica "acontecendo" para a tela. É a vida do balão na
   arena (1,9 s) arredondada: mais curto e o jogador não lê o nome do golpe;
   mais longo e dois balões se sobrepõem. */
const JANELA_GOLPE_MS = 1_900;

/* ── E O QUE ESTÁ PARA ACONTECER (ST-5.5, L-171) ─────────────────────────
   A carga no atacante e o projétil até o alvo têm de SAIR antes do impacto,
   para chegar no instante em que o motor derruba o HP. O roteiro é
   determinístico e o futuro dele já existe: a cena só precisa saber dos
   golpes da próxima fração de segundo. 900 ms cobre a carga mais longa da
   Arena (380) mais a viagem mais longa (500) — e o teste do efeito confere
   isso golpe a golpe. Mais longo anunciaria a luta antes da hora. */
export const ANTECIPACAO_MS = 900;

/* Um teto de voltas por chamada. Uma run parada por três dias é aritmética, e
   não um laço infinito — mas laço sem teto num caminho que lê relógio de
   sistema é exatamente como uma aba trava. O número é folgado: dez waves com
   repetição cabem muito abaixo dele. */
const VOLTAS_MAX = 400;

const inteiro = (v, padrao = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : padrao);

/* ── A SEMENTE DE CADA WAVE ───────────────────────────────────────────────
 *
 * Por RÓTULO, e o rótulo inclui a TENTATIVA. Sem ela, repetir a wave 7 daria
 * exatamente a mesma derrota para sempre: o jogador ficaria preso num muro que
 * não é decisão dele nem sorte, e sim um número congelado.
 *
 * Com ela, cada tentativa é um sorteio novo sobre a mesma dificuldade — que é
 * o muro clássico do gênero, e é o que faz a poção comprar TENTATIVAS. */
export const rotuloDaWave = (wave, tentativa) => `avanco:${wave}:${tentativa}`;

/* ── UMA RUN NOVA ─────────────────────────────────────────────────────────
 *
 * Guarda o mínimo, e o mínimo é o que não dá para recalcular: o lugar, a
 * equipe, a raiz e os instantes. Todo o resto — quem apareceu, quanto caiu,
 * onde a wave está — é DERIVADO, e o que é derivado não diverge do que
 * aconteceu. */
export function novaRun({ bioma, estagio = 1, equipe = [], raiz, agora }) {
  return {
    bioma, estagio: inteiro(estagio, 1),
    equipe: [...equipe],
    raiz: String(raiz),
    iniciadaEm: inteiro(agora),
    /* A VERSÃO DA REGRA DO ELENCO (1.33). A run guarda qual regra a gerou, e não
       o elenco inteiro — o elenco continua DERIVADO. A run sem este campo
       nasceu antes do 1.33 e fica no elenco-base até acabar: trocar os mobs no
       meio da wave é o que o cartão proíbe. */
    regraElenco: REGRA_DO_ELENCO,
    wave: 1,
    tentativa: 0,
    waveComecouEm: inteiro(agora),
    /* O HP com que a wave ATUAL começou. As curas desta wave ficam ao lado,
       datadas; a soma das duas é a barra de agora. */
    hpNaWave: HP_MAX,
    curas: [],
    abates: [],
    apareceram: [],
    tentadas: [],
    eventos: [],
    fim: null,
  };
}

export const emCurso = run => !!run && !run.fim;

/* ── O QUE ESTÁ ACONTECENDO NA WAVE DE AGORA ──────────────────────────────
 *
 * O A2 decide; o roteiro encena. Duas sementes irmãs do mesmo rótulo — uma
 * para o resultado, outra para a cena — e a separação tem uma razão prática:
 * mexer na encenação (mais entradas, outro ritmo) não pode mover o equilíbrio
 * de lugar, e com uma semente só qualquer ajuste visual reescreveria a curva. */
export function waveAtual(run, { elenco, equipe, golpesMeus = 1, golpesDele = 1,
                                climaRitmo = 1 }) {
  const r = resolverWave(semente(derivar(run.raiz, rotuloDaWave(run.wave, run.tentativa))),
    { elenco, wave: run.wave, estagio: run.estagio, hp: run.hpNaWave, equipe });
  /* O RITMO SAI DA MESMA CONTA QUE A CHANCE: poder contra ameaça. É por isso
     que ele não precisa de calibração própria — quando o A2 for recalibrado,
     o relógio acompanha sozinho. */
  /* ── E O CLIMA ENCURTA A WAVE POR CIMA DISSO (1.32) ─────────────────
   *
   * `climaRitmo` é 1 quando não há clima, e maior que 1 quando a equipe
   * enviada aproveita um clima que paga no canal `ritmo`. Ele DIVIDE, porque
   * ritmo aqui é DURAÇÃO: render mais é durar menos.
   *
   * Entra DEPOIS do `fatorDoRitmo`, e não dentro dele. Dentro, ele passaria
   * pelo mesmo grampo [PISO, TETO] que existe para o par poder-contra-ameaça
   * não fugir — e o clima seria engolido justamente nas equipes que já estão
   * no grampo, que são as mais fortes e as mais fracas. O jogador veria o
   * bônus funcionar no meio da escada e sumir nas pontas, sem nenhum aviso.
   *
   * Fora, ele é um fator próprio e limitado: o teto do bônus é o teto do
   * `passoDoClima`, medido em ~30% com equipe cheia do tipo mais raro.
   *
   * Quem decide o número é a cola (`avanco-estado.mjs`), que conhece o pack e
   * a equipe. Este arquivo continua sem saber o que é clima. */
  const ritmo = fatorDoRitmo(poderDaEquipe(equipe),
                             ameacaDa({ elenco, wave: run.wave, estagio: run.estagio }))
              / Math.max(1e-6, Number(climaRitmo) || 1);
  const roteiro = roteiroDaWave(
    semente(derivar(run.raiz, `${rotuloDaWave(run.wave, run.tentativa)}:cena`)),
    { comp: r.comp, venceu: r.venceu, dano: r.dano, golpesMeus, golpesDele, ritmo });
  return { ...r, roteiro };
}

/* A barra no instante `t` da wave. As curas entram no instante em que foram
   dadas, e é por isso que elas são guardadas com hora: reabrir a aba tem de
   devolver a MESMA barra, e não uma recalculada por outro caminho. */
function hpEm(run, roteiro, t) {
  const perdido = run.hpNaWave - estadoEm(roteiro, t, run.hpNaWave).hp;
  const curado = (run.curas ?? [])
    .filter(c => c.t <= t)
    .reduce((a, c) => a + inteiro(c.quanto), 0);
  return Math.max(0, Math.min(HP_MAX, run.hpNaWave + curado - perdido));
}

/* Em que instante da wave a barra chegou a zero, ou `null` se não chegou.
 *
 * É a pergunta que decide se a run acabou NO MEIO da wave, e ela precisa ser
 * respondida por recálculo — nunca por quem estava olhando. Quem fechou a aba
 * e voltou tem de receber a mesma resposta de quem ficou. */
function instanteDaQueda(run, roteiro) {
  let hp = run.hpNaWave;
  const curas = [...(run.curas ?? [])].sort((a, b) => a.t - b.t);
  let i = 0;
  for (const m of (roteiro.momentos ?? [])) {
    while (i < curas.length && curas[i].t <= m.t) {
      hp = Math.min(HP_MAX, hp + inteiro(curas[i].quanto)); i++;
    }
    if (m.tipo !== 'golpe' || m.de !== 'dele') continue;
    hp -= inteiro(m.dano);
    if (hp <= 0) return m.t;
  }
  return null;
}

const somar = (lista, dex, quantos) => {
  const j = lista.find(x => x.dex === dex);
  if (j) j.quantos += quantos; else lista.push({ dex, quantos });
};

/* ── O AVANÇO PELO RELÓGIO ────────────────────────────────────────────────
 *
 * Devolve uma run NOVA — não muta — e a lista do que aconteceu desde a última
 * consulta. Essa lista é o que alimenta o log e as animações de quem está
 * olhando; quem voltou depois de meia hora recebe a mesma lista de uma vez.
 *
 * **É por isso que o quadro de log e o relatório de volta são uma peça só.** A
 * L-141 pedia o quadro; o §7.22.9 pedia o relatório. Os dois leem daqui. */
export function avancarRun(run, { elenco, equipe, agora, climaRitmo = 1 }) {
  if (!emCurso(run)) return { run, aconteceu: [] };

  let r = {
    ...run,
    abates: (run.abates ?? []).map(a => ({ ...a })),
    apareceram: [...(run.apareceram ?? [])],
    curas: [...(run.curas ?? [])],
    eventos: [...(run.eventos ?? [])],
  };
  const aconteceu = [];
  let voltas = 0;

  while (voltas++ < VOLTAS_MAX) {
    const { venceu, comp, roteiro } = waveAtual(r, { elenco, equipe , climaRitmo });
    const t = inteiro(agora) - r.waveComecouEm;

    /* QUEM APARECEU ENTRA NA LISTA ASSIM QUE ENTRA EM CENA, e não no fim da
       wave: é o que a bola precisa saber (A6), e a bola é jogada DURANTE. */
    for (const m of roteiro.momentos) {
      if (m.t > t) break;
      if (m.tipo !== 'entra' || m.dex == null || r.apareceram.includes(m.dex)) continue;
      r.apareceram.push(m.dex);
      aconteceu.push({ tipo: 'apareceu', dex: m.dex, wave: r.wave, em: r.waveComecouEm + m.t });
    }

    /* A QUEDA NO MEIO DA WAVE. A run acaba no instante em que a barra zera, e
       não no fim da wave — esperar o resto seria encenar a luta de quem já
       caiu. */
    const queda = instanteDaQueda(r, roteiro);
    if (queda !== null && queda <= t) {
      r.hpNaWave = 0;
      r.fim = { em: r.waveComecouEm + queda, completou: false, motivo: 'hp' };
      aconteceu.push({ tipo: 'caiu', wave: r.wave, em: r.fim.em });
      break;
    }

    /* A WAVE AINDA ESTÁ ACONTECENDO — o caso comum de quem está olhando. */
    if (t < roteiro.duracao) break;

    /* A WAVE TERMINOU. Aplica o que ela decidiu, e só então anda.

       Os abates saem dos MOMENTOS, e não da composição: é o roteiro que diz
       quem caiu, e contar pela composição daria o total certo com os nomes
       errados no dia em que a encenação mudar. */
    if (venceu) {
      for (const m of roteiro.momentos)
        if (m.tipo === 'abate') somar(r.abates, m.dex, 1);
    }
    aconteceu.push({
      tipo: 'wave', wave: r.wave, venceu, comp,
      em: r.waveComecouEm + roteiro.duracao,
    });

    r.hpNaWave = hpEm(r, roteiro, roteiro.duracao);
    r.curas = [];
    r.waveComecouEm += roteiro.duracao;

    if (venceu) { r.wave += 1; r.tentativa = 0; } else { r.tentativa += 1; }

    if (r.wave > WAVES) {
      r.wave = WAVES;
      r.fim = { em: r.waveComecouEm, completou: true, motivo: 'limpou' };
      aconteceu.push({ tipo: 'limpou', em: r.fim.em });
      break;
    }
    if (r.hpNaWave <= 0) {
      r.fim = { em: r.waveComecouEm, completou: false, motivo: 'hp' };
      aconteceu.push({ tipo: 'caiu', wave: r.wave, em: r.fim.em });
      break;
    }
  }

  r.eventos = [...r.eventos, ...aconteceu];
  return { run: r, aconteceu };
}

/* ── O RETRATO DA CENA ────────────────────────────────────────────────────
 *
 * O que a tela desenha num instante: quem está de pé, quanto sobrou da barra,
 * quanto falta da wave. Nada aqui decide — se decidisse, a tela e o motor
 * teriam de concordar sobre alguma coisa, e um dia não concordariam. */
/* ── QUANTO FALTA DAQUELE MOB, DE 1 A 0 ──────────────────────────────────
 *
 * O motor não modela HP por mob: ele decide a WAVE. O que isto devolve é o que
 * o roteiro JÁ decidiu — quanto falta para aquele cair, entre a entrada dele e
 * a queda dele.
 *
 * Sem queda marcada ele está inteiro, e isso não é um caso de borda: numa wave
 * PERDIDA ninguém cai, e as barras ficam cheias. É a leitura certa, porque a
 * wave foi perdida justamente por os mobs não terem sido derrubados.
 *
 *   > Encenar é distribuir o que já foi decidido. Uma barra que descesse por
 *   > conta própria seria a tela contando outra história. */
const vidaDoMob = (cai, entrou, t) =>
  cai == null ? 1 : Math.max(0, Math.min(1, 1 - (t - entrou) / Math.max(1, cai - entrou)));

export function cenaDaRun(run, { elenco, equipe, agora, golpesMeus = 1, golpesDele = 1,
                                 climaRitmo = 1 }) {
  if (!run) return null;
  const { comp, roteiro, venceu, p } = waveAtual(run, { elenco, equipe, golpesMeus, golpesDele , climaRitmo });
  const t = Math.max(0, Math.min(roteiro.duracao, inteiro(agora) - run.waveComecouEm));
  const caidos = new Set(roteiro.momentos
    .filter(m => m.tipo === 'abate' && m.t <= t).map(m => m.i));
  const quedaDe = new Map(roteiro.momentos
    .filter(m => m.tipo === 'abate').map(m => [m.i, m.t]));
  const chefe = ehWaveDeChefe(run.wave);
  return {
    wave: run.wave, tentativa: run.tentativa, chance: p, venceu,
    duracao: roteiro.duracao, t, restam: roteiro.duracao - t,
    hp: hpEm(run, roteiro, t), hpMax: HP_MAX,
    comp,
    /* Quem está DE PÉ agora: entrou e ainda não caiu. Depois da reescrita do
       duelo (§7.22.18) esta lista tem NO MÁXIMO UM — e o teste do roteiro
       afirma isso —, mas ela continua sendo lista: a forma é a mesma para o
       dia em que uma wave especial trouxer dois, e o índice continua sendo o
       que amarra o ator ao log. */
    emCena: roteiro.momentos
      .filter(m => m.tipo === 'entra' && m.t <= t && !caidos.has(m.i))
      .map(m => ({
        i: m.i, dex: m.dex, desde: m.t, chefe,
        /* CHEGANDO enquanto a caminhada não termina. É o que diz à cena se ela
           anda ou se ela luta — sem isso o mob pararia no meio do caminho ou
           bateria de longe. */
        chegando: t < m.t + APROXIMACAO_MS,
        vida: vidaDoMob(quedaDe.get(m.i), m.t, t),
        /* O HP EM NÚMERO, e não só a fração. Pedido do dono: *"a barra de HP
           precisa ter número de HP"*. Ele sai do último golpe que já caiu
           sobre este mob — o roteiro carrega o restante em cada golpe, então
           a tela não recalcula nada. */
        hp: hpDoMob(roteiro, m.i, t),
        hpMax: HP_MOB,
      })),
    caidos: caidos.size,
    /* ── HÁ ALGUÉM DE PÉ, E ELE JÁ CHEGOU ───────────────────────────────
       É o que diz à cena se o treinador para de andar. Enquanto o mob está a
       caminho, os dois ainda se aproximam; a partir do encontro, ninguém sai
       do lugar até a queda.

       Mora aqui e não na tela porque é uma pergunta sobre o ROTEIRO — quem
       entrou, quando, e se já caiu. A tela que a recalculasse teria a própria
       ideia de quando a luta começa. */
    duelando: roteiro.momentos.some(m =>
      m.tipo === 'entra' && m.t + APROXIMACAO_MS <= t && !caidos.has(m.i)),
    /* ── O QUE ACABOU DE ACONTECER ──────────────────────────────────────
       Os golpes dos últimos instantes, para a tela poder mostrar o balão do
       ataque e o número do dano subindo. A janela é curta de propósito: quem
       reabre a aba depois de uma hora não deve ver um golpe antigo piscando
       como se fosse agora. */
    golpes: roteiro.momentos.filter(m =>
      m.tipo === 'golpe' && m.t <= t && m.t > t - JANELA_GOLPE_MS),
    aCaminho: roteiro.momentos.filter(m =>
      m.tipo === 'golpe' && m.t > t && m.t <= t + ANTECIPACAO_MS),
    fim: run.fim ?? null,
  };
}

/* Quanto sobrou daquele mob, em pontos. Sai do `hpAlvo` que o roteiro grava em
   cada golpe meu — a tela não refaz a conta, e por isso não tem como divergir
   dela. Sem golpe ainda, ele está inteiro. */
function hpDoMob(roteiro, i, t) {
  let hp = HP_MOB;
  for (const m of roteiro.momentos) {
    if (m.t > t) break;
    if (m.tipo === 'golpe' && m.de === 'meu' && m.i === i) hp = m.hpAlvo;
  }
  return hp;
}

/* ── A POÇÃO ──────────────────────────────────────────────────────────────
 *
 * Registrada com o instante, e o quanto JÁ VEM APARADO: quem gastou uma poção
 * de 40 com a barra em 80 curou 20, e é 20 que fica gravado. Guardar 40 e
 * aparar na leitura devolveria os 40 na wave seguinte, quando a barra tivesse
 * espaço — uma poção que rende mais por ser lida mais tarde. */
export function curarRun(run, { cura, agora, elenco, equipe, climaRitmo = 1 }) {
  if (!emCurso(run)) throw new Error('não há run em curso');
  const { roteiro } = waveAtual(run, { elenco, equipe , climaRitmo });
  const t = Math.max(0, Math.min(roteiro.duracao, inteiro(agora) - run.waveComecouEm));
  const efetiva = Math.max(0, Math.min(HP_MAX - hpEm(run, roteiro, t), inteiro(cura)));
  return {
    run: { ...run, curas: [...(run.curas ?? []), { t, quanto: efetiva }] },
    curou: efetiva,
  };
}

/* ── RECUAR ───────────────────────────────────────────────────────────────
 *
 * O §7.22.8 diz que falhar custa o baú e nunca o farm. Recuar é a mesma coisa
 * escolhida em vez de sofrida: fica tudo que caiu, perde-se o baú. Ter as duas
 * saídas pagando igual é o que torna a decisão honesta — quem está com a barra
 * em 12 na wave 8 pode guardar a criatura para a próxima run. */
export function recuarRun(run, agora) {
  if (!emCurso(run)) return run;
  return { ...run, fim: { em: inteiro(agora), completou: false, motivo: 'recuou' } };
}

/* ── O QUE A RUN VIROU ────────────────────────────────────────────────────
 *
 * Na forma que o `premioDo` do A3 já consome, montada aqui e em nenhum outro
 * lugar: dois lugares montando o resultado da run é a porta pela qual o saque
 * e o log passam a discordar. */
export const resultadoDa = run => ({
  completou: run?.fim?.completou === true,
  /* A wave ALCANÇADA. Quem limpou alcançou as dez; quem caiu parou onde
     parou — e o relatório que dissesse a seguinte contaria uma wave que não
     aconteceu. */
  waves: run?.fim?.completou === true ? WAVES : Math.max(1, inteiro(run?.wave, 1)),
  hp: inteiro(run?.hpNaWave),
  abates: (run?.abates ?? []).map(a => ({ ...a })),
});

export { WAVES, HP_MAX };

/* ── O QUE VOLTA DO DISCO É UMA RUN, OU NÃO É NADA ────────────────────────
 *
 * A definição de "run válida" mora AQUI, junto do motor que a lê, e não no
 * arquivo que guarda o estado do jogador. Duas definições da mesma coisa
 * divergem no dia em que uma delas ganhar um campo — e o lado que guarda
 * seria justamente o que não sabe o que o campo significa.
 *
 * Nada é validado campo a campo de propósito: tudo que este módulo lê já é
 * aparado na leitura (`inteiro`, `Math.max`, `?? []`). O que se recusa é só o
 * que quebraria a leitura inteira.
 *
 * E adulterar a run no `localStorage` não compra nada: o resultado de cada
 * wave sai da SEMENTE mais o rótulo, então mexer no HP só antecipa o próprio
 * fim, e mexer na wave pula o farm das que foram puladas. */
export const runDoDisco = cru =>
  (cru && typeof cru === 'object' && !Array.isArray(cru)) ? cru : null;
