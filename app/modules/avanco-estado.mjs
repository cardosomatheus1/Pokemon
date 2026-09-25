/* O AVANÇO DENTRO DO ESTADO DO JOGADOR — bloco A4b (camada 3).
 *
 * A cola entre o motor puro do §7.22 e o estado guardado do idle. Ela conhece
 * os dois lados de propósito, e é o ÚNICO lugar que conhece: o motor não pode
 * saber de `localStorage`, e a tela não pode saber de semente.
 *
 * ── AS GUARDAS SÃO AS MESMAS DA EXPEDIÇÃO, E ISSO NÃO É PREGUIÇA ──────────
 *
 * Stamina, estágio aberto, criatura na caixa, teto de encontros. Guardas
 * próprias aqui dariam DUAS respostas para "esta equipe pode sair?" — e no dia
 * em que uma mudasse, o jogador veria a tela oferecer o que o dado recusa.
 * Quem confere é o motor, e as duas metades perguntam a ele.
 *
 * ── E A RESERVA DE ENCONTROS É O QUE FAZ OS DOIS MODOS DIVIDIREM O TETO ───
 *
 * O §7.22.3 é explícito: a pergunta *"onde vão os encontros de hoje: no meu
 * sono ou na minha tela?"* só existe porque os dois modos gastam o mesmo
 * orçamento. A run reserva o elenco inteiro ao sair e devolve a sobra ao
 * colher — a mesma forma da expedição, e pelo mesmo motivo: assim o teto nunca
 * é ultrapassado, e a recusa acontece no CLIQUE, onde o jogador entende.
 */
import { acharCriatura, criaturasDe, estadoDoTeto, salvar,
         criarCriatura, motivoDaOcupada, lancarRunNoTeto } from './idle-dados.mjs';
import { forcaDe } from '../../engine/bioma.mjs';
import { elencoDoEstagio } from '../../engine/elenco-estagio.mjs';
import { estagioAberto, estagioMaximo, nivelDoEstagio } from '../../engine/estagios.mjs';
import {
  podeAvancar, cabeAvanco, STAMINA_DO_AVANCO, ENCONTROS_POR_AVANCO,
  premioDo, ganhoDaRun, POR_ABATE, curaDe,
} from '../../engine/avanco.mjs';
import { creditar } from '../../engine/nivel-criatura.mjs';
import { moedasDa, idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';
import { sortearItens, agrupar } from '../../engine/drops.mjs';
import { lancamentoDoBau } from '../../engine/estilhaco.mjs';
import { viesFinal, cabeNoEstagio } from '../../engine/estagios.mjs';
import { PERFIS, pesoDaRaridade, staminaAgora } from '../../engine/expedicao.mjs';
import { FRAGMENTOS_POR_ENCONTRO } from '../../engine/captura.mjs';
import { raridadeDe } from '../../engine/bioma.mjs';
import { efeitosDa } from '../../engine/foco.mjs';
import { aplicarClima } from '../../engine/clima-idle.mjs';
/* A COSTURA DO CLIMA mora em `avanco-clima.mjs` desde que este arquivo chegou
   a 567 das 600 linhas. A divisão é por responsabilidade: aqui é o que a run
   FAZ, lá é o que o tempo faz com ela. */
import { climaDaRun, leituraDoClima, ritmoDoClima, falaDoClima } from './avanco-clima.mjs';
import { preferenciasDaRun, eventosDoElenco } from './elenco-condicao.mjs';
import { semente } from '../../engine/instancia.mjs';
import { repertorio } from '../../engine/repertorio.mjs';

/* ── QUAL PERFIL O AVANÇO USA PARA PAGAR ─────────────────────────────────
 *
 * A TRILHA, e a escolha não é arbitrária: ela é a do meio das três, e o
 * avanço é o modo do meio em quase tudo — rende mais por hora que a Vigília e
 * menos por envio que a Batida.
 *
 * Reusar um perfil existente em vez de criar um quarto é o que mantém UMA
 * régua de economia. Um perfil próprio seria uma segunda tabela de XP, moeda
 * e viés de raridade para calibrar em paralelo, e elas divergiriam. */
/* EXPORTADO a partir do A4f: o Hunt Analyzer mostra o XP acumulado da run, e
   ele tem de sair da MESMA `ganhoDaRun` que credita no fecho — com o mesmo
   perfil. Uma tela que calcula o próprio XP com um perfil escolhido à parte
   divergiria do bolso, e a que mente é sempre a da tela. */
export const PERFIL_DO_AVANCO = 'trilha';

/* O vínculo de uma run inteira. Um ponto, como uma Vigília curta: o vínculo
   cresce com TEMPO JUNTOS (§7.22, nivel-criatura), e ~37 min de avanço são
   isso. Ele não conta encontros de propósito — se contasse, viraria um
   segundo XP, e duas barras que sobem juntas são uma barra com duas cores. */
const VINCULO_DA_RUN = 1;
import { restamEncontros } from '../../engine/expedicao.mjs';
import {
  novaRun, avancarRun, cenaDaRun, recuarRun, emCurso, resultadoDa, curarRun,
} from '../../engine/run-avanco.mjs';
import { novaRaiz, derivar } from '../../engine/seed.mjs';

/* A criatura na forma que o motor da wave lê. A FORÇA é DERIVADA do pack, e
   não guardada na criatura: guardá-la seria uma segunda verdade envelhecendo
   ao lado da primeira — o mesmo motivo de `potencial` e `nivel` serem
   derivados no `hidratar`. */
export const paraOMotor = (pack, c) => ({
  id: c.id, dex: c.dex, nivel: c.nivel ?? 1, vinculo: c.vinculo ?? 0, foco: c.foco ?? null,
  forca: forcaDe((pack?.especies ?? []).find(e => e.dex === c.dex) ?? {}),
});

export const runDe = e => e?.run ?? null;
export const avancoEmCurso = e => emCurso(runDe(e));

/* COM A CONDIÇÃO DA RUN (1.33): a noite em que ela começou, no relógio do
   mundo, e o clima dela. Quem traduz é o `elenco-condicao.mjs`, em camada 0; o
   motor só vê tipos. Run antiga, sem `regraElenco`, recebe lista vazia — e a
   lista vazia devolve o elenco-base intacto. */
export const elencoDaRun = (pack, run) =>
  run ? elencoDoEstagio(pack, run.bioma, run.estagio, preferenciasDaRun(pack, run))
      : { comuns: [], chefes: [] };

/* A equipe da run, hidratada. Ela sai do estado a cada consulta em vez de ser
   guardada na run: o nível pode ter subido no meio, e uma cópia congelada
   lutaria com a criatura de ontem. */
export const equipeDaRun = (e, pack, run) => {
  const vivas = criaturasDe(e);
  return (run?.equipe ?? [])
    .map(id => vivas.find(c => c.id === id))
    .filter(Boolean)
    .map(c => paraOMotor(pack, c));
};

/* ── PODE COMEÇAR? ────────────────────────────────────────────────────────
 *
 * Devolve o MOTIVO, e não um booleano. A recusa que só diz "não" manda o
 * jogador adivinhar o que consertar — é o D-067, e ele já custou duas telas
 * neste projeto. */
export function porQueNaoAvancar(e, { pack, bioma, estagio, equipe, agora }) {
  if (avancoEmCurso(e)) return 'Você já está num avanço';
  if (!equipe?.length) return 'Escolha ao menos uma criatura';
  if (!(pack?.biomas ?? []).some(b => b.id === bioma)) return 'Escolha uma rota';

  const est = Math.max(1, Math.floor(Number(estagio) || 1));
  if (!estagioAberto(criaturasDe(e), est))
    return `O estágio ${est} pede uma criatura no nível ${nivelDoEstagio(est)}, ` +
      `e a sua melhor está no ${estagioMaximo(criaturasDe(e))}º`;

  const membros = equipe.map(id => acharCriatura(e, id)).filter(Boolean);
  if (membros.length !== equipe.length) return 'Criatura que não existe na equipe';
  const guardadas = membros.filter(c => c.naCaixa).length;
  if (guardadas) return `${guardadas} criatura(s) estão na caixa — tire-as antes`;

  /* ── ANTES DA STAMINA, E ISSO IMPORTA (L-162) ─────────────────────────
     Quem está em campo já pagou a stamina da expedição, então a guarda de
     stamina recusaria primeiro — e diria "sem os 23 de stamina", que é
     verdade e não é o problema. O jogador ficaria esperando a barra encher
     por uma criatura que não vai poder sair de qualquer jeito. */
  const ocupada = motivoDaOcupada(e, equipe);
  if (ocupada) return ocupada;

  const { pode, semStamina } = podeAvancar(membros, agora);
  if (!pode)
    return `${semStamina.length} criatura(s) sem os ${STAMINA_DO_AVANCO} de ` +
      'stamina que um avanço custa';

  /* ── O TETO NÃO RECUSA MAIS: ELE AVISA (L-151) ────────────────────────
   *
   * Antes esta função devolvia o teto como MOTIVO, e a run nem começava. A
   * decisão do dono em 08/09 mudou isso: o teto limita o que a run RENDE em
   * espécies, e não o direito de rodá-la. Ver o comentário longo no
   * `premioDo`.
   *
   * Então a pergunta some daqui — e vira `avisoDoTeto`, que a tela mostra
   * ANTES de o jogador entrar. Uma run que rende menos e não avisa é pior que
   * uma run recusada. */
  return null;
}

/* O que a tela DIZ antes de o jogador entrar, quando os encontros do dia
   acabaram. Devolve `null` quando não há o que avisar — e a ausência é a
   resposta normal, não um caso de borda. */
export function avisoDoTeto(e, { pack, agora }) {
  if (cabeAvanco(estadoDoTeto(e, agora, pack))) return null;
  return `Os encontros de hoje acabaram (restam ${restamEncontros(estadoDoTeto(e, agora, pack))}). ` +
    'A run acontece igual — abates, XP, moeda, drops e o baú —, mas nenhuma ' +
    'espécie nova entra no registro e a bola não terá em quem ser usada.';
}

/* ── COMEÇAR ──────────────────────────────────────────────────────────────
 *
 * A STAMINA É COBRADA NO FIM, e não aqui — diferente da expedição, e a
 * diferença tem motivo: o §7.22.7 cobra 2 por wave e 5 na do chefe, então o
 * preço só existe quando se sabe até onde a run foi. Cobrar 23 adiantado e
 * devolver a sobra daria o mesmo número e uma tela pior: quem recua na wave 3
 * veria a barra despencar e voltar. */
export function comecarAvanco(e, { pack, bioma, estagio, equipe, agora, raiz = novaRaiz() }) {
  const motivo = porQueNaoAvancar(e, { pack, bioma, estagio, equipe, agora });
  if (motivo) throw new Error(motivo);
  /* ── O QUADRO DA RUN ANTERIOR SAI AQUI (L-166) ────────────────────────
   *
   * Decisão do dono: *"ao fechar e iniciar outra RUN, esse quadro de 'quem
   * apareceu' vai sumir e será atualizado com o da nova run"*.
   *
   * O que ela compra: o fim da run vira um MOMENTO com custo. Sem isto os
   * aparecidos empilhariam, o jogador guardaria trinta espécies esperando a
   * bola boa, e a decisão que o §7.22.12 chama de central deixaria de custar
   * alguma coisa. Entrar noutra run passa a ser desistir do que sobrou.
   *
   * ── POR ORIGEM, E NUNCA A LISTA INTEIRA ─────────────────────────────
   *
   * Os dois modos dividem `e.encontros`. A expedição volta enquanto o jogador
   * está longe — apagar o que ela trouxe porque uma run começou seria cobrar
   * dele o preço de uma decisão que ele não tomou. O filtro é pela marca que
   * a colheita da run põe, e o que não tem marca fica. */
  e.encontros = (e.encontros ?? []).filter(x => x?.origem !== 'avanco');
  e.run = novaRun({ bioma, estagio, equipe: [...equipe], raiz, agora });
  /* ── O CONTRATO DO MOMENTO EM QUE ELE ENTROU ─────────────────────────
     Guardado na run, e não recalculado ao colher: uma run que começou sem
     teto não pode ganhar espécies porque o dia virou no meio dela, nem
     perdê-las porque outra run consumiu o orçamento enquanto esta acontecia. */
  e.run.semEncontros = !cabeAvanco(estadoDoTeto(e, agora, pack));

  /* ── O CLIMA ENTRA NO LOG NO PRIMEIRO SEGUNDO (1.32) ────────────────
   *
   * E não no fim. O pedido do dono era que o jogador SENTISSE o bônus, e uma
   * linha que só aparece quando a run acaba chega tarde para isso: ele passou
   * dezesseis minutos vendo a tela sem saber que havia algo diferente.
   *
   *   > Bônus que só se descobre no extrato não é bônus sentido: é bônus
   *   > conferido.
   *
   * No topo do log, ele é a primeira coisa que se lê ao entrar — junto do
   * cartão da direita, que diz a mesma coisa com o número grande. Duas peças
   * dizendo o mesmo é redundância de propósito: uma o jogador vê, a outra ele
   * relê depois, e a run dura horas.
   *
   * O evento guarda a CHAVE e o NOME. A chave para quem for filtrar o
   * histórico um dia; o nome porque o histórico é lido meses depois, e uma
   * chave crua não diz nada a ninguém. */
  const climaInicial = leituraDoClima(pack, e.run, equipeDaRun(e, pack, e.run));
  if (climaInicial) {
    const f = falaDoClima(climaInicial);
    e.run.eventos = [...(e.run.eventos ?? []), {
      tipo: 'clima', em: agora,
      key: climaInicial.clima.key,
      nome: f.nome, emoji: f.emoji, estado: f.estado,
      frase: f.frase, pct: f.pct,
    }];
  }
  /* E QUEM A NOITE OU O CLIMA TROUXE (1.32b): uma linha por troca, logo depois
     da do clima — é ela que liga o bônus revelado ao rosto novo na wave. */
  e.run.eventos = [...(e.run.eventos ?? []), ...eventosDoElenco(pack, e.run, agora)];

  salvar(e);
  return e.run;
}

/* ── O RELÓGIO ────────────────────────────────────────────────────────────
 *
 * Chamada de todo quadro e do carregamento da aba, e é a MESMA chamada nos
 * dois casos. É isso que faz reabrir depois de oito horas cair no mesmo
 * caminho de quem nunca fechou. */
export function sincronizar(e, { pack, agora }) {
  const run = runDe(e);
  if (!emCurso(run)) return { run, aconteceu: [] };
  const ctx = { elenco: elencoDaRun(pack, run), equipe: equipeDaRun(e, pack, run), agora,
                /* A CHUVA DA TELA É A MESMA QUE ENCURTA A WAVE (1.32). O dono
                   foi explícito sobre isso quando pediu clima e dia/noite:
                   efeito tem de ser VISÍVEL na wave, e não um número que
                   ninguém vê. Este é o canal que se vê sem ler nada. */
                climaRitmo: ritmoDoClima(pack, run, equipeDaRun(e, pack, run)) };
  const r = avancarRun(run, ctx);
  if (r.aconteceu.length) { e.run = r.run; salvar(e); }
  return r;
}

/* Quantos golpes cada lado tem para sortear. O motor só devolve o ÍNDICE — ele
   não pode conhecer o tema (§0.3) —, então quem sabe o tamanho da lista é
   quem conhece o pack. Um piso de 1 porque uma espécie sem golpe declarado não
   pode zerar a conta e apagar o balão de todo mundo. */
const quantosGolpes = (pack, dex, nivel = null) => {
  const e = (pack?.especies ?? []).find(x => x.dex === dex);
  const todos = (pack?.golpes ?? {})[(e?.t ?? [])[0]] ?? [];
  /* ── O TAMANHO É O DO REPERTÓRIO, E NÃO O DA LISTA (L-168) ──────────
     O motor sorteia um índice; se ele sortear dentro da lista INTEIRA e a
     tela peneirar depois, o índice cai fora e o `% lista.length` traz um
     golpe qualquer — a peneira existiria e não valeria nada. Os dois lados
     têm de contar a mesma coisa. */
  return Math.max(1, (nivel == null ? todos : repertorio(nivel, todos)).length);
};

export function cena(e, { pack, agora }) {
  const run = runDe(e);
  if (!run) return null;
  const equipe = equipeDaRun(e, pack, run);
  const elenco = elencoDaRun(pack, run);
  const c = cenaDaRun(run, {
    elenco, equipe, agora, climaRitmo: ritmoDoClima(pack, run, equipe),
    golpesMeus: quantosGolpes(pack, equipe[0]?.dex, equipe[0]?.nivel),
    golpesDele: quantosGolpes(pack, (elenco.comuns ?? [])[0]?.dex,
                              nivelDoEstagio(run.estagio)),
  });
  if (!c) return c;
  /* ── OS DOIS NÍVEIS VÃO JUNTO COM A CENA (L-168) ──────────────────────
   *
   * O balão precisa saber QUEM bate para peneirar o repertório, e nem o motor
   * nem a cena têm essa informação: o motor não conhece o tema, e a cena não
   * conhece o estado. A cola conhece os dois lados, que é o trabalho dela.
   *
   * O nível dos selvagens é o do ESTÁGIO, e não de cada um: o elenco do
   * estágio é a régua daquele lugar, e é ela que o §7.22 usa para tudo. Dar um
   * nível por mob criaria uma segunda régua para a mesma pergunta.
   *
   * Espalhado sobre o retrato do motor em vez de dentro dele: `cenaDaRun` é
   * puro e agnóstico, e um campo de nível lá dentro seria o motor começando a
   * saber de repertório. */
  /* ── E QUAL CLIMA A CENA DESENHA (1.32) ───────────────────────────────
     Vai junto do retrato porque o mundo desenha a 60 quadros e não pode
     perguntar nada a ninguém: quem sabe o clima é quem conhece o pack, e é
     este arquivo. O campo é o `fx` — o VOCABULÁRIO de desenho —, e não a
     chave do clima: o app sabe desenhar chuva, e não sabe o que é Nevasca. */
  const cl = climaDaRun(pack, run);
  return { ...c, nivelMeu: Math.floor(Number(equipe[0]?.nivel) || 1),
           nivelDeles: nivelDoEstagio(run.estagio),
           climaFx: cl?.fx ?? null };
}

/* ── RECUAR ───────────────────────────────────────────────────────────────
 *
 * A saída escolhida, e ela paga igual à sofrida: fica o que caiu, perde-se o
 * baú (§7.22.8). É o que torna a decisão honesta — quem está com a barra em 12
 * na wave 8 pode guardar a criatura para a run seguinte, e isso é jogo.
 *
 * A run RECUADA não some: ela fica com `fim` marcado até ser colhida, e é a
 * colheita que paga e limpa. Apagar aqui perderia o saque de quem clicou. */
export function recuar(e, agora) {
  if (!avancoEmCurso(e)) return null;
  e.run = recuarRun(runDe(e), agora);
  salvar(e);
  return e.run;
}

/* ── A RUN TEM TETO PARA ESPÉCIES? ───────────────────────────────────────
 *
 * Perguntada ao COMEÇAR e guardada na run, e não recalculada ao colher. O
 * motivo é o mesmo da semente: uma run que começou sem teto não pode ganhar
 * espécies porque o dia virou no meio dela, nem perdê-las porque outra run
 * consumiu o orçamento enquanto esta acontecia.
 *
 *   > O que vale é o contrato do momento em que o jogador entrou. */
export const encontrosValemNa = run => run?.semEncontros !== true;

/* ── O QUE A RUN COBRA E PAGA ────────────────────────────────────────────
 *
 * Uma vez só, e a guarda é o `colhidaEm`: colher duas vezes não pode dobrar o
 * saque nem pela metade. É a mesma forma da expedição, e pelo mesmo motivo.
 *
 * A ORDEM importa e é a da expedição: cobra primeiro, credita depois. Se algo
 * falhar no meio, o jogador fica sem o prêmio — nunca com o prêmio e sem o
 * custo. */
export function colherAvancoDaRun(e, { pack, agora, raiz = novaRaiz() }) {
  const run = runDe(e);
  if (!run) throw new Error('não há run para colher');
  if (emCurso(run)) throw new Error('a run ainda está acontecendo');
  if (run.colhidaEm) throw new Error('esta run já foi colhida');

  run.colhidaEm = agora;
  run.semente = String(raiz);

  const valem = encontrosValemNa(run);
  const premio = premioDo(resultadoDa(run), { encontrosValem: valem });

  /* ── O CLIMA, LIDO UMA VEZ (1.32) ──────────────────────────────────────
   *
   * Uma leitura só para os quatro canais que se pagam aqui. Ler de novo em
   * cada um daria a MESMA resposta — a função é derivada da raiz — e ainda
   * assim seria errado: quatro chamadas são quatro lugares onde alguém pode
   * esquecer de passar a mesma equipe, e aí o mesmo clima pagaria diferente em
   * dois canais da mesma run. */
  const climaAqui = leituraDoClima(pack, run, equipeDaRun(e, pack, run));
  const bonusClima = climaAqui?.bonus ?? null;

  /* ── A STAMINA, PELAS WAVES ALCANÇADAS ─────────────────────────────────
     Cobrada no FIM, e não ao começar: o §7.22.7 cobra 2 por wave e 5 na do
     chefe, então o preço só existe quando se sabe até onde a run foi. Cobrar
     23 adiantado e devolver a sobra daria o mesmo número e uma tela pior —
     quem recua na wave 3 veria a barra despencar e voltar. */
  for (const id of run.equipe ?? []) {
    const c = acharCriatura(e, id);
    if (!c) continue;
    c.stamina = Math.round(Math.max(0, staminaAgora(c, agora) - premio.stamina));
    c.staminaEm = agora;
  }

  /* ── O XP, PELA MESMA FUNÇÃO DA EXPEDIÇÃO ──────────────────────────────
     O abate entra como fração do encontro (`ganhoDaRun`), então recalibrar o
     XP por encontro um dia arrasta o abate junto. */
  const ganhoCru = ganhoDaRun({
    abates: premio.abates, encontros: premio.encontros.length, perfil: PERFIL_DO_AVANCO,
  });
  /* O CLIMA ENTRA DEPOIS DA CONTA, e não dentro dela: `ganhoDaRun` é a régua
     partilhada com a expedição, e um fator de clima lá dentro faria o Avanço
     mexer no rendimento de um modo que não tem clima nenhum. */
  const ganho = { ...ganhoCru, xp: Math.round(aplicarClima(ganhoCru.xp, bonusClima, 'xp')) };
  const subiram = [];
  for (const id of run.equipe ?? []) {
    const c = e.criaturas.find(y => y.id === id);
    if (!c) continue;
    const novo = creditar(c, { xp: ganho.xp, vinculo: VINCULO_DA_RUN });
    c.xp = novo.xp; c.nivel = novo.nivel; c.vinculo = novo.vinculo;
    if (novo.subiu > 0) subiram.push({ id, para: novo.nivel, quantos: novo.subiu });
  }

  /* ── A MOEDA ───────────────────────────────────────────────────────────
     Ramo próprio da semente, como na colheita da expedição: "quantos itens
     caíram" e "quanto você ganhou" são perguntas diferentes, e amarrá-las
     faria uma mexer na outra sem que ninguém quisesse. */
  const moedas = moedasDa(semente(derivar(raiz, 'avanco:moeda')), {
    perfil: PERFIL_DO_AVANCO,
    /* O abate paga moeda pela mesma régua com que paga XP. */
    encontros: premio.encontros.length + Math.round(premio.abates * POR_ABATE),
  });
  const moedasComClima = Math.round(aplicarClima(moedas, bonusClima, 'moeda'));
  const km = idDaMoeda(pack);
  e.bolsa[km] = (e.bolsa[km] ?? 0) + moedasComClima;

  /* ── O BAÚ, E ELE SÓ EXISTE SE A RUN LIMPOU ────────────────────────────
     §7.22.8: falhar custa o baú e nunca o farm. O sorteio é o MESMO da
     expedição, com o viés do estágio — uma segunda tabela de drops seria uma
     segunda economia. */
  /* ── O FOCO ENTRA NO BAÚ, PELA MESMA FUNÇÃO DA EXPEDIÇÃO ─────────────
     Correção do dono: *"o foco deve ser aplicado nesse novo modo"*, e
     *"mantém também para ROTA OFF"*. É literalmente a mesma `efeitosDa` que a
     colheita da expedição usa, com o mesmo perfil que o Avanço paga.

     Assim UMA tabela de foco serve aos dois modos:

         guia        entra no PODER (engine/wave.mjs) — é o único de combate
         trilheiro   mais material aqui
         sortudo     melhor item raro aqui
         batedor     neutro no Avanço, e não por esquecimento: o elenco do
         vigia       estágio é FIXO em seis, então não há o que "achar mais".
                     Eles seguem valendo inteiros na Rota OFF, que é onde o
                     encontro é sorteado

     Um foco que faz coisas diferentes em cada modo seria duas tabelas com um
     nome só, e o jogador teria de aprender duas. */
  const efeitos = efeitosDa(equipeDaRun(e, pack, run), PERFIL_DO_AVANCO);
  const itens = premio.bau
    ? agrupar(sortearItens(semente(derivar(raiz, 'avanco:bau')), {
        pack, bioma: run.bioma, perfil: PERFIL_DO_AVANCO, estagio: run.estagio,
        vies: viesFinal(PERFIS[PERFIL_DO_AVANCO]?.vies ?? 0, run.estagio),
        cabe: cabeNoEstagio, peso: pesoDaRaridade,
        /* ── O CLIMA MONTA NO CANAL DO FOCO, e não abre um segundo ──────
           O baú já sabe receber um viés de material e um de item raro: é por
           ali que o Trilheiro e o Sortudo pagam. O clima multiplica o MESMO
           número em vez de somar um caminho novo.

           Duas vantagens, e a segunda é a que importa: uma tabela só continua
           valendo para os dois modos, e o dia em que o baú for recalibrado o
           clima acompanha sozinho — que é a mesma razão pela qual o abate paga
           XP pela função da expedição. */
        focoItemRaro: aplicarClima(efeitos.itemRaro, bonusClima, 'itemRaro'),
        focoMaterial: aplicarClima(efeitos.material, bonusClima, 'material'),
      }))
    : [];
  /* ── O QUE ENTRA NA BOLSA É O QUE O BAÚ VIRA (ST-3.1, L-159) ─────────
     Até o estágio 3, o item de porta de estilhaço vira PARTES — a regra mora
     em `lancamentoDoBau`, no motor. A lista `itens` que a run guarda passa a
     ser a do que ENTROU: mostrar "Pedra do Fogo" quando a bolsa recebeu duas
     partes seria o quadro mentindo sobre o próprio saque. */
  for (let k = 0; k < itens.length; k++) {
    const it = itens[k];
    const l = it.classe === 'essencia'
      ? { chave: idDoMaterial(pack), quantidade: it.quantidade }
      : lancamentoDoBau(it, { estagio: run.estagio, catalogo: pack.catalogo })
        ?? { chave: it.id, quantidade: it.quantidade };
    e.bolsa[l.chave] = (e.bolsa[l.chave] ?? 0) + l.quantidade;
    if (l.estilhaco) itens[k] = { ...it, id: l.chave, quantidade: l.quantidade, estilhaco: true };
  }

  /* ── OS ENCONTROS FICAM PENDENTES, esperando bola ──────────────────────
     Mesma forma da expedição (1.2b): guardar aqui é o que impede a colheita
     de ser destrutiva — o jogador fecha a aba e volta sem perder o que
     apareceu. Numa run sem teto a lista é vazia, e é só isso que muda. */
  const pendentes = premio.encontros.map((dex, i) => ({
    /* A ORIGEM É MARCADA (L-166) para que começar outra run possa limpar o
       quadro DESTA sem encostar no que a Rota OFF trouxe. Ver o comentário
       longo em `comecarAvanco`. */
    chave: `${run.raiz}:${i}`, expedicao: null, origem: 'avanco', dex,
    raridade: raridadeDe(pack, (pack.especies ?? []).find(x => x.dex === dex) ?? {}),
    bioma: run.bioma, em: agora,
  }));
  e.encontros.push(...pendentes);
  for (const dex of premio.encontros)
    e.registro[dex] = (e.registro[dex] ?? 0) + FRAGMENTOS_POR_ENCONTRO;

  /* O QUE O TETO CONTA. Zero numa run sem encontros — que é justamente o que
     faz ela não empurrar o dia de ninguém. */
  run.encontros = premio.encontros.length;
  /* ── E O QUE O CLIMA PAGOU FICA GRAVADO, EM NÚMERO ABSOLUTO (1.32) ─────
   *
   * O dono pediu a linha, e a frase dele diz por quê:
   *
   *   > "+52 [moeda] por buff de clima: Vendaval" — sem isso o buff acontece
   *   >  e o jogador não sabe que aconteceu.
   *
   * Ele está certo, e a regra é maior que o clima: **bônus que não aparece não
   * é bônus, é ruído no gerador de números.** O jogador não tem como comparar
   * uma run com a anterior de cabeça; se o jogo não disser, não houve melhoria
   * nenhuma do ponto de vista dele — e era exatamente "sentir a melhoria na
   * prática" o que ele pediu.
   *
   * Guardado em ABSOLUTO, e não em fator: "+52" é a frase que ele escreveu, e
   * "x1,15" obrigaria quem lê a fazer a conta com um número que ele não tem.
   * O `ganhou` é o que ENTROU a mais — a diferença contra a run sem clima. */
  const semClima = {
    xp: ganhoCru.xp,
    moedas,
  };
  run.rendeu = {
    xp: ganho.xp, moedas: moedasComClima, itens, subiram, bau: premio.bau,
    clima: climaAqui ? {
      key: climaAqui.clima.key,
      /* O NOME VEM DO PACK, e é ele que fica gravado: o histórico é lido meses
         depois, e uma chave crua como "nevoa" não diz nada a ninguém. */
      nome: climaAqui.clima.name ?? climaAqui.clima.key,
      emoji: climaAqui.clima.emoji ?? '',
      canal: bonusClima?.canal ?? null,
      fator: bonusClima?.fator ?? 1,
      quantos: bonusClima?.quantos ?? 0,
      gracas: climaAqui.gracas.map(c => c.dex),
      ganhou: {
        xp: ganho.xp - semClima.xp,
        moedas: moedasComClima - semClima.moedas,
      },
    } : null,
  };

  /* ── A RUN COLHIDA SAI DE `e.run` E ENTRA NO TETO ──────────────────────
     Antes ela ia inteira para `e.avancos`, que o teto não lia e o `carregar`
     não guardava — o D-107. Agora vai só o lançamento do teto; o histórico
     completo que a L-141 pede é outra peça. */
  lancarRunNoTeto(e, run);
  e.run = null;
  salvar(e);
  return run;
}

/* ── A POÇÃO ─────────────────────────────────────────────────────────────
 *
 * Uma das duas decisões que esta tela pede da mão do jogador (§7.22.10). A
 * outra é a bola.
 *
 * O item sai da bolsa ANTES de a cura ser registrada: se algo falhasse no
 * meio, o jogador ficaria com a poção e com a vida — e é sempre nessa ordem
 * que o projeto cobra.
 *
 * Curar com a barra cheia é RECUSADO, e a recusa é o serviço: sem ela, um
 * clique errado gasta a poção que salvaria a run três waves adiante. */
export function usarPocao(e, { pack, item, agora }) {
  const run = runDe(e);
  if (!emCurso(run)) throw new Error('não há run em curso');
  const cura = curaDe(pack, item);
  if (!cura) throw new Error('esse item não restaura vida');
  if ((e.bolsa[item] ?? 0) < 1) throw new Error('você não tem esse item');

  const ctx = { elenco: elencoDaRun(pack, run), equipe: equipeDaRun(e, pack, run) };
  const antes = cenaDaRun(run, { ...ctx, agora });
  if (antes.hp >= antes.hpMax)
    throw new Error('a vida já está cheia — guarde a poção');

  const { run: nova, curou } = curarRun(run, { cura, agora, ...ctx });
  e.bolsa[item] = e.bolsa[item] - 1;
  e.run = nova;
  salvar(e);
  return { curou, item };
}

/* ── A BOLA SAIU DAQUI (L-166) ────────────────────────────────────────────
 *
 * Havia `jogarBolaNaRun` e `alvosDaBolaNa`, e a run era onde a bola era
 * jogada. Decisão do dono, e a queixa que a originou é literal:
 *
 *   > "as bolas, não. Quando você clica em bola simplesmente não avisa nada no
 *   >  log — se capturou, se fugiu, você não sabe o que aconteceu."
 *
 * ── A REGRA NÃO FOI PERDIDA: ELA MUDOU DE GUARDIÃO ───────────────────────
 *
 * O §7.22.12 pede UMA tentativa por espécie por run, e era `avanco-bola` quem
 * a segurava, com a lista `tentadas`. Hoje quem a segura é a FORMA do quadro:
 * `premio.encontros` é uma lista de ESPÉCIES, cada uma vira um cartão, e o
 * cartão sai da lista quando recebe a bola. Uma espécie, um cartão, uma bola —
 * a regra virou estrutura, e estrutura não tem como ser esquecida.
 *
 * A porta que isso fecha: sem a regra, 58 mobs seriam 58 tentativas, e o teto
 * do §P5 vazaria inteiro pela captura.
 *
 * O que ficou de pé: `engine/avanco-bola.mjs` continua no repositório e
 * testado, sem chamador. É a L-167, com bloco dono nomeado — apagar motor
 * testado no mesmo commit que muda uma tela é o tipo de arrasto que a regra
 * central deste projeto existe para impedir. */
