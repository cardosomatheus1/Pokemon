/* O ESTADO DO IDLE NO NAVEGADOR (bloco 1.3b, camada 0).
 *
 * Fronteira: guarda e devolve. A REGRA não mora aqui — ela é `engine/expedicao`,
 * `engine/captura` e `engine/drops`, os mesmos módulos que `server/idle.mjs`
 * usa. Este arquivo não decide teto, custo, chance nem raridade; ele pergunta.
 *
 * ── POR QUE EXISTE UMA VERSÃO LOCAL SE O SERVIDOR JÁ ESTÁ PRONTO ─────────
 *
 * É a mesma escolha que o `banco.mjs` fez com a carteira, e pelo mesmo motivo:
 * *"fazer local agora é o que torna aquele bloco uma troca de implementação em
 * vez de uma reescrita"*.
 *
 * O servidor do idle existe desde o 1.2d e está testado. O que não existe é
 * caminho do navegador até ele — é o D-047, e o dono do projeto decidiu que por
 * ora se joga local. Como as duas metades chamam **as mesmas funções puras**, o
 * dia em que o servidor for ligado troca a persistência e mais nada.
 *
 * ── O QUE É DAQUI E O QUE NÃO É ──────────────────────────────────────────
 *
 *     É DAQUI       o formato guardado, a leitura tolerante, o instante
 *     NÃO É DAQUI   teto diário, custo de stamina, chance de captura, raridade
 *
 * ── A LEITURA É TOLERANTE, E ISSO É DECISÃO ──────────────────────────────
 *
 * `localStorage` é editável por quem quiser, e some quando o navegador limpa.
 * Um estado corrompido não pode derrubar a aba: ele volta ao que dá para
 * aproveitar, e o que não dá vira lista vazia. Perder uma expedição é ruim;
 * perder a aba é pior, e é irreversível para quem não sabe abrir o console.
 */
import { novaRaiz, derivar } from '../../engine/seed.mjs';
import { efeitosDa } from '../../engine/foco.mjs';
import { semente, gerarInstancia, potencialDe, formaDe } from '../../engine/instancia.mjs';
import {
  PERFIS, TETO_DIARIO, TETO_ENCONTROS, cabeExpedicao, restamEncontros, comprometido,
  tetoDeEncontros, proximoEncontro, bonusDeEncontros, MARCOS_ENCONTROS,
  vagasPor, proximaVaga, MARCOS_VAGAS,
  SIMULTANEAS_INICIAIS, SIMULTANEAS_MAX, EQUIPE_MAX,
  STAMINA_MAX, staminaAgora, podeEnviar, custoDe, sortearEncontros, pesoDaRaridade,
} from '../../engine/expedicao.mjs';
import { sortearItens, agrupar } from '../../engine/drops.mjs';
import { moedasDa, idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';
import { estagioMaximo, estagioAberto, proximoEstagio, viesFinal, cabeNoEstagio,
         ESTAGIOS_POR_BIOMA, nivelDoEstagio } from '../../engine/estagios.mjs';
import { batalhasDa } from '../../engine/npc.mjs';
import { ENCONTROS_POR_AVANCO } from '../../engine/avanco.mjs';
import { runDoDisco } from '../../engine/run-avanco.mjs';
import { nivelDoTopo } from '../../engine/estagios.mjs';
import { creditarTreino } from './idle-banco.mjs';
import { vistosDe } from './pokedex-dados.mjs';
import { xpDaExpedicao, vinculoDaExpedicao, creditar, nivelDe, progresso as progressoNivel } from '../../engine/nivel-criatura.mjs';
import { FRAGMENTOS_POR_ENCONTRO, chanceDe, tentar } from '../../engine/captura.mjs';

const CHAVE = 'ar_idle';
const VERSAO = 1;
const DIA_MS = 24 * 3600_000;

export const VAZIO = () => ({
  /* A REVISÃO DO SAVE (ST-3.2): quantas vezes ESTE estado foi gravado. Duas
     abas que carregaram a mesma revisão não gravam uma por cima da outra — ver
     `salvar`. */
  rev: 0,
  v: VERSAO, criaturas: [], expedicoes: [], bolsa: {}, registro: {},
  encontros: [],
  /* As runs colhidas nas últimas 24 h, só com o que o TETO precisa (D-107).
     Ver `lancarRunNoTeto`. */
  avancos: [],
  /* A run do Avanço: uma só, `null` quando não há. Ela sobrevive a fechar a
     aba porque o §7.22.16 se apoia nisso — quem fecha recebe a MESMA run de
     quem fica olhando. */
  run: null,
  /* ── O CONTADOR DE ESTILHAÇOS (1.29) ────────────────────────────────
     Ele é a SEMENTE do sorteio da parte, e por isso mora no estado em vez de
     sair do relógio ou de `Math.random`.

       > Um sorteio que se pode repetir de graça não é um sorteio: é um menu.

     Sem ele gravado, recarregar a página traria a mesma parte de novo — e o
     jogador aprenderia a recarregar até vir a que falta. Foi assim que o
     defeito apareceu na primeira medição: oito trocas seguidas devolveram o
     mesmo item, porque o contador nascia em 1 a cada leitura. */
  estilhacos: 0,
});

/* Diagnóstico do último carregamento, para a interface poder DIZER algo em vez
   de corrigir em silêncio — mesma ideia do `banco.mjs`. */
export let ultimoDiagnostico = { origem: 'novo', problemas: [] };

const arrayOu = (v, nome, problemas) => {
  if (Array.isArray(v)) return v;
  if (v !== undefined) problemas.push(`${nome} não era lista`);
  return [];
};
const objetoOu = (v, nome, problemas) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (v !== undefined) problemas.push(`${nome} não era objeto`);
  return {};
};

export function carregar(deposito = globalThis.localStorage) {
  const problemas = [];
  let cru = null;
  try { cru = JSON.parse(deposito?.getItem(CHAVE) ?? 'null'); }
  catch { problemas.push('o texto guardado não era JSON'); }

  if (!cru) {
    ultimoDiagnostico = { origem: 'novo', problemas };
    return VAZIO();
  }
  const e = VAZIO();
  e.criaturas  = arrayOu(cru.criaturas,  'criaturas',  problemas);
  e.expedicoes = arrayOu(cru.expedicoes, 'expedicoes', problemas);
  e.encontros  = arrayOu(cru.encontros,  'encontros',  problemas);
  e.bolsa      = objetoOu(cru.bolsa,     'bolsa',      problemas);
  e.registro     = objetoOu(cru.registro,    'registro',     problemas);
  /* ── `simultaneas` NAO E LIDO DO DISCO, E ISSO E A CORRECAO (D-072) ────
     A versao anterior aceitava o numero salvo e o apertava no maximo. Parecia
     defensivo — o clamp esta la — e nao era: `localStorage` esta a um F12 de
     distancia, e escrever `simultaneas: 4` dava quatro vagas a quem nunca viu
     uma especie.

     Nao era exploracao teorica: era um campo de VANTAGEM lido de onde o
     jogador escreve. Hoje as vagas sao derivadas do registro, e o campo
     simplesmente nao existe mais — **enquanto nao houver onde escrever, nao ha
     o que forjar.** Mesma forma do teto diario e do `potencial` do 1.1.

     Um estado antigo com `simultaneas` gravado nao quebra: o campo e ignorado,
     e nada precisa ser migrado. */
  if (cru.simultaneas !== undefined)
    problemas.push('a bolsa trazia um numero de vagas gravado; hoje ele e derivado');

  /* A DEFINIÇÃO de "run válida" mora no motor que a lê (`runDoDisco`), e não
     aqui: duas definições da mesma coisa divergem no dia em que uma ganhar um
     campo, e o lado que só guarda seria o que não sabe o que ele significa. */
  e.avancos = avancosDoDisco(cru.avancos, problemas);
  /* Revisão ilegível vira 0 — e 0 casa com o disco pelo mesmo `revDoDisco`,
     então um valor forjado não trava todo save seguinte. */
  e.rev = revDe(cru.rev);
  e.run = runDoDisco(cru.run);
  if (cru.run != null && !e.run) problemas.push('a run guardada não era objeto');

  /* O contador do sorteio do Estilhaço. Ele só pode CRESCER: um contador que
     volta atrás devolve a sequência de partes já vista, e é o mesmo furo de
     não gravá-lo. */
  e.estilhacos = Math.max(0, Math.floor(Number(cru.estilhacos) || 0));

  /* QUANTIDADE NEGATIVA NA BOLSA VIRA ZERO, e não some da lista.
     Zerar deixa o rastro; apagar esconde que houve conserto. */
  for (const [k, v] of Object.entries(e.bolsa)) {
    const n = Math.floor(Number(v));
    if (!(n >= 0)) { e.bolsa[k] = 0; problemas.push(`a bolsa tinha "${k}" inválido`); }
    else e.bolsa[k] = n;
  }
  ultimoDiagnostico = { origem: problemas.length ? 'consertado' : 'disco', problemas };
  return e;
}

/* ── A GRAVAÇÃO OTIMISTA (ST-3.2) ─────────────────────────────────────────
 *
 * Duas abas carregavam o mesmo `ar_idle` e gravavam por cima uma da outra: a
 * aba A colhia uma expedição e gravava; a aba B, carregada antes, colhia a
 * MESMA expedição e gravava de novo. O crédito entrava duas vezes.
 *
 * Agora cada save leva a revisão. Quem vai gravar confere a do disco: se ela
 * não é a que esta aba carregou (ou gravou por último), outra aba gravou no
 * meio — e ESTA não grava. O disco vence, a função devolve `false`, e a tela
 * recarrega (ela escuta o evento `storage`). O que esta aba fez em memória e
 * não gravou é descartado, e é o certo: foi feito sobre um estado que já não
 * existia.
 *
 * O limite, dito: é o máximo honesto enquanto o idle morar no navegador. Duas
 * abas no mesmo instante exato ainda podem se cruzar entre ler e gravar; a
 * garantia de verdade é o idle no servidor (E8). */
const revDe = v => (Number.isInteger(v) && v >= 0 ? v : 0);
export let ultimoConflito = false;

export function salvar(e, deposito = globalThis.localStorage) {
  /* SEM DEPÓSITO NÃO HÁ O QUE GRAVAR, e a revisão não anda. Em Node (teste)
     não existe `localStorage`: subir a revisão sem gravar faria o save
     seguinte, num depósito de verdade, ser recusado por um conflito que nunca
     houve. O `true` é o de sempre — nada falhou, só não havia onde guardar. */
  if (!deposito) return true;
  try {
    let noDisco = 0;
    try { noDisco = revDe(JSON.parse(deposito?.getItem(CHAVE) ?? 'null')?.rev); } catch { noDisco = 0; }
    if (noDisco !== revDe(e.rev)) { ultimoConflito = true; return false; }
    const proxima = revDe(e.rev) + 1;
    deposito?.setItem(CHAVE, JSON.stringify({ ...e, rev: proxima, v: VERSAO }));
    e.rev = proxima;
    ultimoConflito = false;
    return true;
  }
  catch { return false; }
}

/* A chave do depósito, para a tela escutar o evento `storage` da outra aba. */
export const CHAVE_DO_IDLE = CHAVE;

/* ── A CRIATURA INICIAL ────────────────────────────────────────────────────
 *
 * SEM ELA A ABA NÃO ABRE, e isso não é figura de linguagem: a stamina é da
 * criatura (bloco 1.2a), então quem não tem nenhuma não pode mandar expedição —
 * e sem expedição não há encontro, não há captura, não há primeira criatura.
 * O laço fecha em si mesmo.
 *
 * A ESCOLHA É DO JOGADOR, entre três. Dar uma sorteada seria mais simples e
 * perderia a única coisa que a primeira tela tem para oferecer: uma decisão que
 * é dele antes de o jogo cobrar qualquer coisa.
 *
 * Quais três é DADO DO PACK (`pack.iniciais`), como tudo que é tema (§0.3). */
export const iniciaisDo = pack => (pack?.iniciais ?? [])
  .map(dex => (pack.especies ?? []).find(e => e.dex === dex))
  .filter(Boolean);

export function escolherInicial(e, pack, dex, agora, raiz = novaRaiz()) {
  if (e.criaturas.length)
    throw new Error('a criatura inicial só se escolhe uma vez');
  if (!(pack?.iniciais ?? []).includes(dex))
    throw new Error(`o dex ${dex} não é uma das iniciais deste pack`);
  const c = criar(pack, dex, 'inicial', agora, raiz);
  e.criaturas.push(c);
  return c;
}

function criar(pack, dex, origem, agora, raiz) {
  const inst = gerarInstancia(semente(derivar(raiz, 'criatura')), {
    especie: dex, naturezas: pack.naturezas ?? [],
  });
  return {
    id: 'c' + String(raiz).slice(0, 12) + '-' + dex,
    dex, iv: inst.iv, natureza: inst.natureza.nome, exemplar: inst.exemplar,
    nivel: inst.nivel, vinculo: inst.vinculo, foco: inst.foco,
    stamina: STAMINA_MAX, staminaEm: agora,
    origem, semente: String(raiz), criadaEm: agora,
  };
}
export { criar as criarCriatura };

/* A criatura como o resto do jogo a lê — com o potencial CALCULADO agora, pela
   mesma função do motor. Guardá-lo seria abrir a porta para os dois
   discordarem, que é a fraude que o 1.1 fechou no banco. */
/* A criatura salva guarda o IV; `potencial` e `forma` sao DERIVADOS dele. Os
   dois saem da mesma fonte do motor — guardar qualquer um dos dois criaria uma
   segunda verdade que diverge no dia em que a formula mudar. */
export const hidratar = c => ({ ...c, potencial: potencialDe(c.iv), forma: formaDe(c.iv),
  /* O nivel e DERIVADO do XP, e nao lido do campo — pelo mesmo motivo do
     `potencial`: guardado ao lado da fonte, os dois divergem no dia em que a
     curva mudar, e nenhum dos dois fica obviamente errado. */
  nivel: nivelDe(c.xp), barra: progressoNivel(c.xp) });
export const criaturasDe = e => e.criaturas.map(hidratar);
export const acharCriatura = (e, id) => e.criaturas.find(c => c.id === id) ?? null;

export const staminaDe = (e, id, agora) => {
  const c = acharCriatura(e, id);
  return c ? staminaAgora(c, agora) : 0;
};

/* ── A EXPEDIÇÃO ───────────────────────────────────────────────────────────
 *
 * As guardas são as MESMAS do servidor, e de propósito: quem confere é o motor,
 * e as duas metades perguntam a ele. O teto diário não tem parâmetro aqui pelo
 * mesmo motivo que não tem lá (§P5). */
export const emCampo = e => e.expedicoes.filter(x => !x.colhidaEm);

/* ── UMA CRIATURA NÃO ESTÁ EM DOIS LUGARES (L-162) ────────────────────────
 *
 * A pergunta é do dono, e ela é boa: *"como eu consigo mandar 1 avançar e o
 * mesmo na expedição?"* — hoje conseguia, e nada no jogo dizia que não podia.
 *
 * A regra já existia, escrita no `podeTreinar` do motor ausente: *quem está em
 * aventura NÃO pode estar em treino, senão o dia dobraria por uma porta que
 * ninguém abriu de propósito*. O avanço e a expedição são dois modos de
 * aventura, e a porta é a mesma — só que entre eles ninguém a tinha fechado.
 *
 * ── POR QUE AQUI, E NÃO NO MOTOR ─────────────────────────────────────────
 *
 * Porque a resposta precisa dos DOIS lados do estado guardado: `expedicoes` e
 * `run`. O motor da expedição não pode conhecer o avanço — ele é a camada de
 * baixo, e a seta aponta para cá; foi a mesma razão de `reservas` ser montado
 * neste arquivo e chegar lá como uma lista de números.
 *
 * ── E ELA DEVOLVE ONDE, E NÃO SE ─────────────────────────────────────────
 *
 * D-067. "Esta criatura não pode" manda o jogador procurar em três telas qual
 * delas recolher. "Ela está numa expedição" manda ele à tela certa. */
/* ── E A MESMA RESPOSTA SERVE À FRASE E AO SELO ───────────────────────────
 *
 * A recusa precisa de uma FRASE — "já está numa expedição" — e o cartão precisa
 * de um SELO curto, porque ele tem 104 px de largura e a frase inteira o
 * atravessa. A primeira versão devolvia só a frase, e o cartão a estampava:
 * lida na proporção real, "NUMA EXPEDIÇÃO" ocupava o cartão de ponta a ponta e
 * empurrava a arte.
 *
 * Uma tabela, e não duas funções: escritos em lugares diferentes, o selo e a
 * frase acabariam falando de coisas diferentes no dia em que um terceiro modo
 * aparecesse. */
export const AVENTURAS = {
  avanco:    { onde: 'no avanço',      selo: 'NA RUN' },
  expedicao: { onde: 'numa expedição', selo: 'EM CAMPO' },
};

/* Quantos dos pendentes vieram da RUN, e não da Rota OFF. Função, e não um
   filtro escrito na tela: é a MESMA marca que `comecarAvanco` usa para limpar
   o quadro, e duas leituras da mesma marca divergiriam no dia em que uma
   terceira origem aparecesse.

   E ela é o que torna o aviso de prazo AFIRMÁVEL sem montar um DOM — o
   defeito plantado que zerava a contagem escapou justamente por ela morar
   dentro de uma `innerHTML`. */
export const encontrosDaRun = e =>
  (e?.encontros ?? []).filter(x => x?.origem === 'avanco').length;

export function ondeAventura(e, id) {
  if (id == null) return null;
  if (e?.run && !e.run.fim && (e.run.equipe ?? []).some(x => x === id))
    return 'avanco';
  if (emCampo(e ?? { expedicoes: [] }).some(x => (x.equipe ?? []).some(y => y === id)))
    return 'expedicao';
  return null;
}

/* O motivo pronto, para os dois lados escreverem a MESMA frase. Duas redações
   para a mesma recusa é o começo de duas regras.

   CURTO DE PROPÓSITO: esta frase vira o RÓTULO do botão de avançar, e um botão
   com duas linhas de explicação deixa de parecer botão. O "por que" longo mora
   no comentário acima de `AVENTURAS`, e não na cara do jogador. */
export const motivoDaOcupada = (e, equipe = []) => {
  for (const id of equipe) {
    const k = ondeAventura(e, id);
    if (k) return `${acharCriatura(e, id) ? 'esta criatura' : 'uma das escolhidas'} ` +
      `já está ${AVENTURAS[k].onde} — recolha-a antes`;
  }
  return null;
};
export const concluidasHoje = (e, agora) =>
  e.expedicoes.filter(x => x.colhidaEm && x.colhidaEm > agora - DIA_MS).length;
/* ── QUANTOS ENCONTROS JÁ SAÍRAM HOJE (D-052) ─────────────────────────────
 *
 * A colheita guarda quantos encontros rendeu, e é essa soma — não a contagem de
 * expedições — que o teto limita. Ver o §P5 no `engine/expedicao.mjs`.
 *
 * JANELA MÓVEL, e não meia-noite de calendário: uma virada fixa dá a todo mundo
 * um instante em que o teto zera, e quem descobre passa a jogar em volta dela,
 * que é o oposto de um idle. */
/* AS RUNS COLHIDAS ENTRAM NA MESMA SOMA (D-107). Elas saíam de `e.run` para
   `e.avancos`, que esta soma não lia — e o teto voltava cheio a cada colheita:
   30 -> 24 durante a run -> 30 depois de colher 4. Avanço atrás de Avanço, a
   captura não tinha teto. Os dois registros têm os mesmos dois campos, e é de
   propósito: o teto não precisa saber de que modo o encontro veio. */
export const encontrosHoje = (e, agora) =>
  [...e.expedicoes, ...(e.avancos ?? [])]
    .filter(x => x.colhidaEm && x.colhidaEm > agora - DIA_MS)
    .reduce((a, x) => a + (x.encontros ?? 0), 0);

/* ── O LANÇAMENTO DA RUN COLHIDA NO TETO (D-107) ──────────────────────────
 *
 * Guarda SÓ o que o teto lê — quando foi colhida e quantos encontros rendeu —
 * mais bioma e estágio para quem for ler depois. Guardar a run inteira (com os
 * eventos de cada wave) encheria o `localStorage` numa aba que fica aberta por
 * semanas; o histórico completo que a L-141 pede é outra peça, com desenho
 * próprio, e não pode nascer por acidente aqui.
 *
 * PODA o que saiu da janela: fora das 24 h o registro não pesa em nada, e
 * mantê-lo seria só crescer. */
export function lancarRunNoTeto(e, run) {
  const agora = run.colhidaEm;
  e.avancos = [
    ...(e.avancos ?? []).filter(x => x.colhidaEm > agora - DIA_MS),
    { colhidaEm: run.colhidaEm, encontros: run.encontros ?? 0,
      bioma: run.bioma, estagio: run.estagio },
  ];
  return e.avancos;
}

/* O que volta do disco precisa ser um lançamento de verdade: número finito e
   encontros inteiros não negativos. Um `encontros: -40` gravado à mão daria
   quarenta encontros a mais no dia — é campo de VANTAGEM lido de onde o
   jogador escreve, a mesma forma do D-072. */
function avancosDoDisco(v, problemas) {
  const lista = arrayOu(v, 'avancos', problemas);
  const bons = lista.filter(x => x && Number.isFinite(x.colhidaEm)
    && Number.isInteger(x.encontros) && x.encontros >= 0);
  if (bons.length !== lista.length)
    problemas.push(`${lista.length - bons.length} registro(s) de avanço inválido(s) descartado(s)`);
  return bons;
}

/* O estado que o motor lê: só o que JÁ ACONTECEU. `emCampo` vai como lista de
   PERFIS porque é o máximo de cada um que fica reservado — o motor não precisa
   saber de mais nada, e não pode. */
export const estadoDoTeto = (e, agora, pack = null) => ({
  encontrosHoje: encontrosHoje(e, agora),
  /* O PERFIL E O TAMANHO DA EQUIPE (L-140). A reserva do teto passou a
     depender dos dois: concentrar rende mais, e o que rende mais tem de
     reservar mais — senão o multiplicador vira furo no §P5. */
  emCampo: emCampo(e).map(x => ({ perfil: x.perfil, membros: (x.equipe ?? []).length })),
  /* AS ESPECIES VISTAS ENTRAM AQUI (1.19), e nao num parametro novo em cada
     chamada: `estadoDoTeto` ja e o retrato do teto, e o registro passou a
     fazer parte dele. Um parametro a mais em `cabeExpedicao` e `restamEncontros`
     seria dois lugares para esquecer o mesmo numero. */
  vistas: especiesVistas(e),
  /* O TOTAL VEM DO PACK, e nao de uma constante no motor. O portao §Gen2
     obrigou: o tamanho da dex e DADO do tema, e escrito no motor a proxima
     geracao vira cacada a numeros. Sem pack, `undefined` — e ai `completar`
     simplesmente nao paga, que e melhor que pagar por um total inventado. */
  total: (pack?.especies ?? []).length || undefined,
  /* A RUN EM CURSO RESERVA, e é o que faz os dois modos dividirem o teto
     (§7.22.3). Lista de NÚMEROS: o `comprometido` do motor não pode conhecer
     o Avanço — ele é a camada de baixo, e a seta aponta para cá. */
  /* ATÉ A COLHEITA, e não até o fim (D-107). Uma run que acabou entrega os
     encontros dela só ao ser colhida; soltar a reserva no `fim` deixava o
     jogador mandar expedições com esses mesmos encontros no intervalo, e a
     colheita os entregava por cima do teto. Colhida, a run sai de `e.run` e
     passa a pesar por `e.avancos`. */
  reservas: e.run ? [ENCONTROS_POR_AVANCO] : [],
});

export const pronta = (x, agora) => agora >= x.terminaEm;

export function iniciarExpedicao(e, { pack, bioma, perfil, equipe, agora, estagio = 1 }) {
  const p = PERFIS[perfil];
  if (!p) throw new Error(`perfil desconhecido: ${perfil}`);
  if (!(pack?.biomas ?? []).some(b => b.id === bioma))
    throw new Error(`o bioma "${bioma}" não existe`);
  if (!equipe?.length) throw new Error('escolha ao menos uma criatura');
  if (equipe.length > EQUIPE_MAX) throw new Error(`a equipe tem teto de ${EQUIPE_MAX}`);

  /* ── O ESTAGIO E CONFERIDO AQUI, e nao so oferecido na tela (bloco 1.10) ──
     A tela mostra os estagios abertos, e isso e conveniencia. A guarda e esta:
     um estagio pedido acima do que a colecao abre e RECUSADO, venha o pedido de
     onde vier. E a mesma forma do teto e das vagas — quem confere e o dado, nao
     o botao, porque o botao e do lado que o jogador controla. */
  const est = Math.max(1, Math.floor(Number(estagio) || 1));
  if (!estagioAberto(criaturasDe(e), est))
    throw new Error(`o estagio ${est} pede uma criatura no nivel ` +
      `${nivelDoEstagio(est)}, e a sua melhor esta no ${estagioMaximo(criaturasDe(e))}º`);

  const membros = equipe.map(id => acharCriatura(e, id)).filter(Boolean);
  if (membros.length !== equipe.length) throw new Error('criatura que não existe na equipe');
  /* SÓ QUEM ESTÁ NA EQUIPE ATIVA VAI A CAMPO. Mandar da caixa faria os seis
     deixarem de significar alguma coisa — a caixa viraria um segundo bolso sem
     custo, e a escolha de quem fica ativo desapareceria. */
  const guardadas = membros.filter(c => c.naCaixa);
  if (guardadas.length)
    throw new Error(`${guardadas.length} criatura(s) estão na caixa — tire-as antes`);

  /* O OUTRO SENTIDO DA MESMA RECUSA (L-162), e ele vem antes da stamina e do
     teto de propósito: a run em curso já reservou encontros, então o teto
     recusaria primeiro e falaria de encontros — quando o que o jogador
     precisa ouvir é que a criatura está avançando. */
  const ocupada = motivoDaOcupada(e, equipe);
  if (ocupada) throw new Error(ocupada);

  const { pode, semStamina } = podeEnviar(membros, perfil, agora);
  if (!pode) throw new Error(`sem stamina: ${semStamina.length} criatura(s)`);

  if (!cabeExpedicao(estadoDoTeto(e, agora, pack), perfil, membros.length))
    throw new Error(
      `o teto de ${TETO_ENCONTROS} encontros por dia não comporta mais uma ` +
      `${p.rotulo} — restam ${restamEncontros(estadoDoTeto(e, agora, pack))}`);
  const vagas = vagasDe(e);
  if (emCampo(e).length >= vagas)
    throw new Error(emCampo(e).length + ' expedicao(oes) em campo, e voce tem ' +
      vagas + ' vaga(s)');

  for (const c of membros) {
    c.stamina = Math.round(Math.max(0, staminaAgora(c, agora) - p.custo));
    c.staminaEm = agora;
  }
  const x = {
    id: 'x' + agora.toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    pack: pack.id, bioma, perfil, estagio: est, equipe: [...equipe],
    custo: custoDe(perfil, membros.length),
    iniciadaEm: agora, terminaEm: agora + p.minutos * 60_000,
    colhidaEm: null, semente: null,
  };
  e.expedicoes.push(x);
  return x;
}

/* A COLHEITA MORA NO `idle-colheita.mjs` a partir do L-162 — ver o cabeçalho
   de lá para o porquê da divisão. Reexportada aqui porque o nome pelo qual o
   resto do jogo a conhece é este, e mudar o endereço de uma função por causa
   de uma divisão interna faria a divisão vazar para quem não pediu por ela. */
export { colher } from './idle-colheita.mjs';

/* ── A EQUIPE ATIVA E A CAIXA ──────────────────────────────────────────────
 *
 * Pergunta do dono, e ela tem resposta no material de origem:
 *
 *   "quando jogador estiver com uma equipe com 6? Esse Pokémon capturado vai
 *    para onde? Teremos um pokecenter, com computador"
 *
 * SEIS na equipe ativa, e o resto na caixa. Não é homenagem: é o número que faz
 * a equipe ser uma ESCOLHA. Com equipe infinita, capturar nunca custa nada e a
 * coleção vira uma lista; com seis, cada captura nova é uma pergunta — quem sai.
 *
 * A CAPTURA NUNCA É RECUSADA por equipe cheia. O que aconteceria se fosse: o
 * jogador gasta a bola boa, acerta o raro, e o jogo diz "não". A caixa existe
 * exatamente para essa recusa não existir — e é por isso que ela é uma resposta,
 * e não um armazém.
 *
 * A EXPEDIÇÃO SÓ LEVA QUEM ESTÁ NA EQUIPE. Mandar da caixa faria a caixa ser um
 * segundo bolso sem custo, e aí os seis deixariam de significar alguma coisa. */
export const PARTY_MAX = 6;

/* HIDRATADAS, como `criaturasDe`. Sem isto elas devolvem a criatura CRUA — sem
   `potencial`, que e derivado do IV e nao guardado —, e a tela do Centro
   escrevia "potencial undefined" em cada ficha.

   O defeito e da familia mais chata: duas portas para a mesma coisa, uma delas
   fazendo um passo a mais. Quem escreveu a tela usou a porta errada, e nao ha
   como saber qual e a certa olhando a chamada. */
export const naEquipe = e => e.criaturas.filter(c => !c.naCaixa).map(hidratar);
export const naCaixa  = e => e.criaturas.filter(c => c.naCaixa).map(hidratar);
export const equipeCheia = e => naEquipe(e).length >= PARTY_MAX;

/* MOVER ENTRE OS DOIS. A única regra é o teto da equipe — a caixa não tem teto,
   porque um teto de caixa transformaria a coleção num problema de logística, e
   o que se quer dela é que ela seja um lugar para onde as coisas vão. */
export function mover(e, id, paraCaixa) {
  const c = acharCriatura(e, id);
  if (!c) throw new Error('essa criatura não existe');
  if (!paraCaixa && equipeCheia(e) && c.naCaixa)
    throw new Error(`a equipe já tem ${PARTY_MAX} — guarde uma antes de tirar outra`);
  /* NÃO SE ESVAZIA A EQUIPE. Sem ninguém ativo não há expedição possível, e o
     jogador se tranca fora do próprio jogo sem nenhum aviso. */
  if (paraCaixa && naEquipe(e).length <= 1)
    throw new Error('a equipe não pode ficar vazia');
  c.naCaixa = !!paraCaixa;
  return c;
}

/* O LANCE MUDOU DE CASA — ver `idle-lance.mjs` e o porquê lá. Reexportado
   daqui porque quem já o importava não precisa saber que ele se mudou. */
export { lancarBola } from './idle-lance.mjs';

/* A BOLSA MUDOU DE CASA — ver `idle-bolsa.mjs` e o porquê lá. Reexportada
   aqui porque ela nunca foi da expedição, e quem já a importava daqui não
   precisa saber que ela se mudou. */
export { quantosNaBolsa, debitarBolsa, creditarBolsa, bolsaEmLista } from './idle-bolsa.mjs';

/* ── QUANTAS VAGAS ESTE JOGADOR TEM ───────────────────────────────────────
 *
 * Do POKEDEX, e o registro nao se compra: fragmento cai no encontro, e so ali.
 * Conta ESPECIES vistas, e nao fragmentos — senao farmar a mesma criatura mil
 * vezes abriria vaga, e o que a vaga premia e VARIEDADE: rodar biomas
 * diferentes. O laco fecha em si mesmo, do lado bom: mais biomas ao mesmo
 * tempo dao mais variedade, que da mais vagas. */
/* ── QUANTAS ESPÉCIES O JOGADOR DESCOBRIU (L-128, decidida pelo dono) ──────
 *
 * Este número move DUAS escadas — o teto diário de encontros e as vagas
 * simultâneas —, e ele era `Object.keys(registro).length`: só os fragmentos, e
 * fragmento cai no ENCONTRO.
 *
 * A inicial é **dada**. Nunca teve encontro, e não contava. A Pokédex, corrigida
 * no 1.22, passou a contá-la — e ficaram **dois números com o mesmo nome**.
 *
 * O dono decidiu que conta. E o argumento que decidiu não foi generosidade:
 *
 *   > A inicial é +1 para TODO jogador, sempre. Contar ou não contar é
 *   > equivalente a deslocar todos os marcos em um — não desequilibra nada, e
 *   > tira a contradição de duas contagens com o mesmo nome.
 *
 * A conta mora em `vistosDe`, e é a MESMA que a Pokédex desenha. Duas
 * implementações da mesma pergunta foi o que produziu o D-074 e o D-075 no
 * mesmo dia; aqui a pergunta tem uma resposta só. */
export const especiesVistas = e => vistosDe(e).size;
export const vagasDe = e => vagasPor(especiesVistas(e));
export const proximaVagaDe = e => proximaVaga(especiesVistas(e));

/* Ate onde a colecao deste jogador chega, e quanto falta para a proxima porta. */
export const estagioMaximoDe = e => estagioMaximo(criaturasDe(e));
export const proximoEstagioDe = e => proximoEstagio(criaturasDe(e));

/* Quantas espécies o pack inteiro tem. Sai daqui e nao do motor: o tamanho da
   dex e DADO do tema, e escrito no motor a Gen 2 vira cacada a numeros. */
export const totalDeEspecies = pack => (pack?.especies ?? []).length;

export const registroEmLista = e => Object.entries(e.registro)
  .map(([dex, fragmentos]) => ({ dex: Number(dex), fragmentos }))
  .sort((a, b) => a.dex - b.dex);

/* `comprometido` e `restamEncontros` atravessam para a tela porque a tela
   precisa MOSTRAR a reserva, e não só ser recusada por ela. Continuam sendo
   regra do motor: aqui elas só passam, como tudo neste arquivo. */
export { TETO_DIARIO, TETO_ENCONTROS, EQUIPE_MAX, STAMINA_MAX, PERFIS,
         cabeExpedicao, restamEncontros, comprometido,
         tetoDeEncontros, proximoEncontro, bonusDeEncontros, MARCOS_ENCONTROS,
         SIMULTANEAS_MAX, MARCOS_VAGAS, ESTAGIOS_POR_BIOMA, nivelDoEstagio };
