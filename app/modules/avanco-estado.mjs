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
import { golpesDaCriatura } from './moveset-dados.mjs';
import { acharCriatura, criaturasDe, estadoDoTeto, salvar,
         motivoDaOcupada, lancarRunNoTeto } from './idle-dados.mjs';
import { estagioAberto, estagioMaximo, nivelDoEstagio } from '../../engine/estagios.mjs';
import { podeAvancar, cabeAvanco, STAMINA_DO_AVANCO, curaDe, ENCONTROS_POR_AVANCO } from '../../engine/avanco.mjs';
import { quandoVoltaEncontro, quandoCabeRun, fraseDaVolta } from './volta-dados.mjs';
/* A COSTURA DO CLIMA mora em `avanco-clima.mjs`: aqui é o que a run FAZ, lá é o
   que o tempo faz com ela. */
import { climaDaRun, ritmoDoClima } from './avanco-clima.mjs';
import { repertorio } from '../../engine/repertorio.mjs';
import { restamEncontros, tetoDeEncontros, comprometido } from '../../engine/expedicao.mjs';
import { cenaDaRun, recuarRun, emCurso } from '../../engine/run-avanco.mjs';
import { novaRaiz } from '../../engine/seed.mjs';
import { linhaDaRun, noHistorico } from './historico-dados.mjs';
/* A CONTA DA RUN MORA EM `avanco-conta.mjs` (ST-13.2c1): camada 0, a MESMA
   que o servidor chama. Reexportadas aqui porque é por este endereço que o
   resto do jogo as conhece. */
import { PERFIL_DO_AVANCO, paraOMotor, elencoDaRun, equipeDoMotor,
         runComecada, runNoInstante, runCurada, contaDaRun, bancoDaRun } from './avanco-conta.mjs';
export { PERFIL_DO_AVANCO, paraOMotor, elencoDaRun };

export const runDe = e => e?.run ?? null;
export const avancoEmCurso = e => emCurso(runDe(e));

/* A equipe da run, hidratada do save — a conta mora em `equipeDoMotor`. */
export const equipeDaRun = (e, pack, run) => equipeDoMotor(pack, run, criaturasDe(e));

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
  /* ST-2.27a: o "não" diz QUANDO — sem hora, o jogador fecha a aba e não volta. */
  if (!pode)
    return `${semStamina.length} criatura(s) sem os ${STAMINA_DO_AVANCO} de ` +
      'stamina que um avanço custa. ' + (fraseDaVolta({ run: quandoCabeRun(membros, agora) }, agora) ?? '');

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
    'espécie nova entra no registro e a bola não terá em quem ser usada. ' +
    (fraseDaVolta({ encontro: voltaDoEncontro(e, { pack, agora }) }, agora) ?? '');
}

/* QUANDO VOLTA O ENCONTRO (ST-2.27a): a conta do aparelho, com os lançamentos
   que ele tem; com conta, a do servidor (que vê as expedições colhidas, que
   não descem) — vale a mais tarde das duas. */
export function voltaDoEncontro(e, { pack, agora }) {
  const t = estadoDoTeto(e, agora, pack);
  const local = quandoVoltaEncontro([...(e.expedicoes ?? []), ...(e.avancos ?? [])], agora,
    { teto: tetoDeEncontros(t.vistas, t.total), reservado: comprometido(t) - t.encontrosHoje, precisa: ENCONTROS_POR_AVANCO });
  const doServidor = e.conta?.teto?.voltaEm;
  return Number.isFinite(doServidor) ? Math.max(doServidor, local ?? 0) : local;
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
  /* O CONTRATO DO MOMENTO EM QUE ELE ENTROU (L-151): se os encontros cabem
     no teto, perguntado AGORA e guardado na run. A pergunta é a MESMA do
     `avisoDoTeto` que a tela mostra antes — `cabeAvanco` já soma a reserva da
     run que vai nascer. A versão antiga perguntava com a run nova já no
     estado, e a reserva contava duas vezes (D-128, ST-2.5): o aviso dizia
     "cabe" e a run nascia sem encontros. */
  const semEncontros = !cabeAvanco(estadoDoTeto({ ...e, run: null }, agora, pack));
  e.run = runComecada(pack, { bioma, estagio, equipe, raiz, agora, semEncontros,
                              motor: equipeDoMotor(pack, { equipe }, criaturasDe(e)) });
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
  const r = runNoInstante(pack, run, equipeDaRun(e, pack, run), agora);
  if (r.aconteceu.length) { e.run = r.run; salvar(e); }
  return r;
}

/* Quantos golpes cada lado tem para sortear. O motor só devolve o ÍNDICE — ele
   não pode conhecer o tema (§0.3) —, então quem sabe o tamanho da lista é
   quem conhece o pack. Um piso de 1 porque uma espécie sem golpe declarado não
   pode zerar a conta e apagar o balão de todo mundo. */
const quantosGolpes = (pack, dex, nivel = null, escolhidos = null) => {
  /* ST-9.12: com moveset escolhido, o tamanho é o DELE — a mesma lista que o
     balão vai peneirar (a regra de cima, L-168, continua valendo). */
  if (escolhidos?.length) return escolhidos.length;
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
  const meusGolpes = equipe[0] ? golpesDaCriatura(pack, equipe[0]) : null;
  const c = cenaDaRun(run, {
    elenco, equipe, agora, climaRitmo: ritmoDoClima(pack, run, equipe),
    golpesMeus: quantosGolpes(pack, equipe[0]?.dex, equipe[0]?.nivel, meusGolpes),
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
  return { ...c, nivelMeu: Math.floor(Number(equipe[0]?.nivel) || 1), golpesMeu: meusGolpes,
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

  /* A CONTA é `contaDaRun` (ST-13.2c1), a mesma do servidor; aqui só se
     escreve no save — a stamina e o XP de quem foi, a bolsa na ordem da
     conta, os pendentes (com a origem marcada, L-166) e os fragmentos. */
  const c = contaDaRun(pack, {
    run, motor: equipeDaRun(e, pack, run), avancos: e.avancos, raiz, agora,
    criaturas: (run.equipe ?? []).map(id => acharCriatura(e, id)).filter(Boolean),
    banco: bancoDaRun(e.criaturas, run),   // ST-2.26: o time aprende junto
  });
  for (const k of c.stamina) Object.assign(acharCriatura(e, k.id), { stamina: k.stamina, staminaEm: k.staminaEm });
  for (const k of c.credito) Object.assign(acharCriatura(e, k.id), { xp: k.xp, nivel: k.nivel, vinculo: k.vinculo });
  for (const [chave, n] of Object.entries(c.bolsa)) e.bolsa[chave] = (e.bolsa[chave] ?? 0) + n;
  e.encontros.push(...c.pendentes);
  for (const f of c.fragmentos) e.registro[f.dex] = (e.registro[f.dex] ?? 0) + f.n;
  /* O QUE O TETO CONTA, e o que a run pagou (o clima em número absoluto). */
  run.encontros = c.encontros;
  run.rendeu = c.rendeu;

  /* ── A RUN COLHIDA SAI DE `e.run` E ENTRA NO TETO (D-107) ──────────── */
  lancarRunNoTeto(e, run);
  e.historico = noHistorico(e.historico, linhaDaRun(run, { pack, dexDe: id => acharCriatura(e, id)?.dex }));   // 1.28
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

  const { run: nova, curou } = runCurada(pack, run, equipeDaRun(e, pack, run), { cura, agora });
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
