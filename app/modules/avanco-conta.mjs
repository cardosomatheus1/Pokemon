/* A RUN DO AVANÇO É UMA CONTA SÓ (ST-13.2c1 · E13 · Spec §7.22) — camada 0.
 *
 * Puro: sem save, sem DOM, sem relógio. Entra a run, a equipe e o instante;
 * sai a run nova — ou, na colheita, TUDO que ela paga. O cliente
 * (`avanco-estado.mjs`) chama estas funções e escreve no save; o servidor
 * (`server/run.mjs`) chama as MESMAS e escreve no banco. É a regra do E13, a
 * mesma da colheita da expedição (`engine/colheita.mjs`): duas runs escritas à
 * mão seriam o jogador com conta recebendo uma e o sem conta outra.
 *
 * Mora em `app/modules` e não em `engine/` porque o clima e o elenco da noite
 * (`avanco-clima.mjs`, `elenco-condicao.mjs`) já moram aqui, em camada 0.
 *
 * `test/run-servidor.mjs` afirma a identidade: a mesma run, com as mesmas
 * poções e o mesmo recuo nos mesmos instantes, termina igual nos dois lados e
 * paga igual.
 */
import { forcaDe, raridadeDe } from '../../engine/bioma.mjs';
import { elencoDoEstagio } from '../../engine/elenco-estagio.mjs';
import { novaRun, avancarRun, curarRun, cenaDaRun, resultadoDa } from '../../engine/run-avanco.mjs';
import { premioDo, ganhoDaRun, POR_ABATE, fatorDoRendimento, XP_DA_RUN, MOEDA_DA_RUN, MOEDA_DOS_VISTOS_NO_TETO, runsNoDia, comRendimento, encontrosDe } from '../../engine/avanco.mjs';
import { creditar } from '../../engine/nivel-criatura.mjs';
import { moedasDa, idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';
import { sortearItens, agrupar } from '../../engine/drops.mjs';
import { lancamentoDoBau } from '../../engine/estilhaco.mjs';
import { viesFinal, cabeNoEstagio, formaDoEstagio } from '../../engine/estagios.mjs';
import { PERFIS, pesoDaRaridade, staminaAgora } from '../../engine/expedicao.mjs';
import { FRAGMENTOS_POR_ENCONTRO } from '../../engine/captura.mjs';
import { efeitosDa } from '../../engine/foco.mjs';
import { aplicarClima } from '../../engine/clima-idle.mjs';
import { semente } from '../../engine/instancia.mjs';
import { derivar } from '../../engine/seed.mjs';
import { leituraDoClima, ritmoDoClima, falaDoClima } from './avanco-clima.mjs';
import { preferenciasDaRun, eventosDoElenco } from './elenco-condicao.mjs';
import { armarCombateDaRun } from './avanco-combate.mjs';
import { golpesDaCriatura } from './moveset-dados.mjs';

/* ── QUAL PERFIL O AVANÇO USA PARA PAGAR ─────────────────────────────────
 * A TRILHA, a do meio das três — e reusar um perfil existente em vez de criar
 * um quarto é o que mantém UMA régua de economia. */
export const PERFIL_DO_AVANCO = 'trilha';

/* O vínculo de uma run inteira: um ponto, como uma Vigília curta. Ele cresce
   com TEMPO JUNTOS; contar encontros faria dele um segundo XP. */
export const VINCULO_DA_RUN = 1;

/* A criatura na forma que o motor da wave lê. A FORÇA e os TIPOS são
   derivados do pack, e não guardados: seriam uma segunda verdade envelhecendo
   ao lado da primeira.

   OS TIPOS ENTRARAM NA ST-2.5 (D-127). Sem eles, `quemAproveita` não achava
   ninguém e o bônus de clima do Avanço saía com fator 1 em todas as runs desde
   o 1.32 — a tela anunciava o clima, e a run não pagava nada por ele. O campo
   é `tipos`, e não `t`: na run, `t` é instante. E o NOME, pela mesma razão:
   o cartão do clima diz "graças a Charmeleon" (`falaDoClima`), e sem nome a
   frase saía sem dizer de quem era o bônus. O nome é o de exibição do pack. */
const exibido = (pack, n) => (pack?.nomeExibido ?? (x => (x ? x[0].toUpperCase() + x.slice(1) : '')))(n ?? '');
export const paraOMotor = (pack, c) => {
  const especie = (pack?.especies ?? []).find(e => e.dex === c.dex) ?? {};
  return {
    id: c.id, dex: c.dex, nivel: c.nivel ?? 1, vinculo: c.vinculo ?? 0, foco: c.foco ?? null,
    forca: forcaDe(especie), tipos: [...(especie.t ?? [])], nome: exibido(pack, especie.n),
    iv: c.iv ? [...c.iv] : null, natureza: c.natureza ?? null,
    golpes: golpesDaCriatura(pack,c), exclusivos: c.exclusivos ? [...c.exclusivos] : [],
  };
};

/* A equipe da run, a partir das criaturas HIDRATADAS (nível do XP). Sai das
   criaturas a cada consulta, e não de uma cópia na run: o nível pode ter
   subido no meio, e uma cópia congelada lutaria com a criatura de ontem. */
export const equipeDoMotor = (pack, run, vivas) => (run?.equipe ?? [])
  .map(id => (vivas ?? []).find(c => c.id === id))
  .filter(Boolean)
  .map(c => paraOMotor(pack, c));

/* COM A CONDIÇÃO DA RUN (1.33): a noite e o clima dela. Run antiga, sem
   `regraElenco`, recebe lista vazia — e a lista vazia devolve o elenco-base. */
export const elencoDaRun = (pack, run) =>
  run ? elencoDoEstagio(pack, run.bioma, run.estagio, preferenciasDaRun(pack, run))
      : { comuns: [], chefes: [] };

/* ── COMEÇAR ──────────────────────────────────────────────────────────────
 *
 * `semEncontros` é o CONTRATO do momento em que o jogador entrou (L-151):
 * guardado na run, e não recalculado ao colher — a run que começou sem teto
 * não ganha espécies porque o dia virou no meio dela.
 *
 * O CLIMA ENTRA NO LOG NO PRIMEIRO SEGUNDO (1.32), e não no fim: bônus que só
 * se descobre no extrato não é bônus sentido. O evento guarda a chave (para
 * filtrar) e o nome (o histórico é lido meses depois). Depois dele, quem a
 * noite ou o clima trouxe (1.32b). */
export function runComecada(pack, { bioma, estagio, equipe, motor, raiz, agora, semEncontros }) {
  const run = novaRun({ bioma, estagio, equipe: [...equipe], raiz, agora });
  run.semEncontros = semEncontros;
  const clima = leituraDoClima(pack, run, motor);
  if (clima) {
    const f = falaDoClima(clima);
    run.eventos = [...(run.eventos ?? []), {
      tipo: 'clima', em: agora, key: clima.clima.key,
      nome: f.nome, emoji: f.emoji, estado: f.estado, frase: f.frase, pct: f.pct,
    }];
  }
  run.eventos = [...(run.eventos ?? []), ...eventosDoElenco(pack, run, agora)];
  return armarCombateDaRun(pack,run,motor,elencoDaRun(pack,run),ritmoDoClima(pack,run,motor));
}

/* ── O RELÓGIO ────────────────────────────────────────────────────────────
 * A CHUVA DA TELA É A MESMA QUE ENCURTA A WAVE (1.32): o ritmo do clima entra
 * no mesmo contexto que o elenco e a equipe. */
export const runNoInstante = (pack, run, motor, agora) => avancarRun(run, {
  elenco: elencoDaRun(pack, run), equipe: motor, agora, pack, climaRitmo: ritmoDoClima(pack, run, motor) });

/* ── A POÇÃO ──────────────────────────────────────────────────────────────
 * Curar com a barra cheia é RECUSADO: um clique errado gastaria a poção que
 * salvaria a run três waves adiante. A leitura da barra é a do motor sem o
 * ritmo do clima — é como o aparelho sempre curou (ver a D-127). */
export function runCurada(pack, run, motor, { cura, agora }) {
  if (run.combate) run = runNoInstante(pack, run, motor, agora).run;
  const ctx = { elenco: elencoDaRun(pack, run), equipe: motor, pack };
  const antes = cenaDaRun(run, { ...ctx, agora });
  if (antes.hp >= antes.hpMax) throw new Error('a vida já está cheia — guarde a poção');
  return curarRun(run, { cura, agora, ...ctx });
}

/* ── O QUE A RUN COBRA E PAGA ────────────────────────────────────────────
 *
 * `criaturas` são as da EQUIPE, no formato do save (xp, vínculo, stamina);
 * `motor`, a mesma equipe hidratada para o motor, lida ANTES do crédito;
 * `avancos`, as runs colhidas (para o rendimento do dia, ST-3.6).
 *
 * A ORDEM é a de sempre, e é contrato: `bolsa` sai com a moeda primeiro e o
 * baú depois, porque a ordem das chaves aparece no save; e os sorteios do
 * rendimento (`sorteioR`) são consumidos na mesma sequência — a moeda, depois
 * cada Essência do baú. */
/* ── O TIME APRENDE JUNTO (ST-2.26) ───────────────────────────────────────
 * O dono: "só quem está em campo sobe de nível; com um slot só, o XP vai
 * quase todo pro Bulbasaur, e nenhum inseto chega ao nível 10 pra evoluir".
 * Quem está no time e não foi à run aprende METADE do XP dela — sem stamina,
 * sem vínculo e sem encontro, que são de quem foi. A caixa não aprende: o
 * time é a escolha, e a caixa é o arquivo. */
export const XP_DO_BANCO = 0.5;
export const bancoDaRun = (colecao, run) => (colecao ?? []).filter(c => !c.naCaixa && !(run?.equipe ?? []).includes(c.id));

export const xpPagoDaRun = (ganhoCru, bonusClima) => Math.round(aplicarClima(Math.round(ganhoCru.xp * XP_DA_RUN), bonusClima, 'xp'));

/* A barra mostra o mesmo crédito da liquidação, incluindo estágio e clima. */
export function xpAteAqui(pack,run,motor) {
  const abates=(run.abates??[]).reduce((n,a)=>n+(Number(a.quantos)||0),0);
  const ganhoCru=ganhoDaRun({abates,encontros:encontrosDe(resultadoDa(run)).length,perfil:PERFIL_DO_AVANCO,estagio:run.estagio});
  return xpPagoDaRun(ganhoCru,leituraDoClima(pack,run,motor)?.bonus??null);
}

export function contaDaRun(pack, { run, criaturas, banco = [], motor, avancos, raiz, agora }) {
  const premio = premioDo(resultadoDa(run), { encontrosValem: run?.semEncontros !== true });
  /* D-148 · DEC-27: o XP é do que ACONTECEU na run — os encontros vistos,
     valendo para o teto ou não. Com o teto batido a conta pagava o XP pelos
     encontros que valem, zero, e a run rendia "+2 XP": a progressão parava
     no meio da tarde. A MOEDA segue pelos encontros que valem, como a
     emissão foi calibrada (DEC-14): medido, pagá-la cheia depois do teto
     triplicava a moeda do maratona (1.536 → 4.668 por dia). */
  const vistos = encontrosDe(resultadoDa(run)).length;
  /* O RENDIMENTO DO DIA (ST-3.6, DEC-14): a posição desta run no dia do mundo. */
  const naJanela = runsNoDia(avancos, agora) + 1;
  /* DEC-29d: a stamina a 30/h equilibrada no valor de TODA run (96%). */
  const fator = fatorDoRendimento(naJanela) * MOEDA_DA_RUN;
  const sorteioR = semente(derivar(raiz, 'avanco:rendimento'));

  /* O CLIMA, LIDO UMA VEZ (1.32) para os quatro canais que se pagam aqui. */
  const climaAqui = leituraDoClima(pack, run, motor);
  const bonusClima = climaAqui?.bonus ?? null;

  /* A STAMINA, pelas waves ALCANÇADAS — cobrada no fim, porque o §7.22.7
     cobra 2 por wave e 5 na do chefe, e o preço só existe no fim. */
  const stamina = [];
  for (const c of criaturas) stamina.push({ id: c.id,
    stamina: Math.round(Math.max(0, staminaAgora(c, agora) - premio.stamina)), staminaEm: agora });

  /* O XP pela MESMA função da expedição; o clima entra DEPOIS da conta, e não
     dentro dela — `ganhoDaRun` é a régua partilhada com a expedição. */
  const ganhoCru = ganhoDaRun({ abates: premio.abates, encontros: vistos, perfil: PERFIL_DO_AVANCO, estagio: run.estagio });
  /* DEC-29d: toda run paga 88% do XP — a stamina a 30/h dá mais runs, e o
     XP do dia, na média, fica onde estava. Sem corte por run do dia. Antes
     do clima, como a moeda. */
  const ganho = { ...ganhoCru, xp: xpPagoDaRun(ganhoCru, bonusClima) };
  const credito = [], subiram = [];
  for (const c of criaturas) {
    const novo = creditar(c, { xp: ganho.xp, vinculo: VINCULO_DA_RUN });
    credito.push({ id: c.id, xp: novo.xp, nivel: novo.nivel, vinculo: novo.vinculo });
    if (novo.subiu > 0) subiram.push({ id: c.id, para: novo.nivel, quantos: novo.subiu });
  }
  for (const c of banco) {
    const novo = creditar(c, { xp: Math.round(ganho.xp * XP_DO_BANCO) });
    credito.push({ id: c.id, xp: novo.xp, nivel: novo.nivel, vinculo: novo.vinculo });
    if (novo.subiu > 0) subiram.push({ id: c.id, para: novo.nivel, quantos: novo.subiu });
  }

  const bolsa = {};
  const somar = (chave, n) => { bolsa[chave] = (bolsa[chave] ?? 0) + n; };
  /* A MOEDA: ramo próprio da semente; o abate paga moeda pela mesma régua do
     XP; o rendimento entra ANTES do clima, e o "+52 por clima" continua
     dizendo o que o clima de fato somou. */
  /* DEC-31: com o teto batido, os encontros vistos pagam 35% — antes não
     pagavam nada, e a run caía a 16% de uma cheia. */
  const vistosNoTeto = run?.semEncontros === true ? comRendimento(vistos, MOEDA_DOS_VISTOS_NO_TETO, sorteioR()) : 0;
  const moedas = comRendimento(moedasDa(semente(derivar(raiz, 'avanco:moeda')), {
    perfil: PERFIL_DO_AVANCO, encontros: premio.encontros.length + vistosNoTeto + Math.round(premio.abates * POR_ABATE),
  }), fator, sorteioR());
  const moedasComClima = Math.round(aplicarClima(moedas, bonusClima, 'moeda'));
  somar(idDaMoeda(pack), moedasComClima);

  /* O BAÚ, e ele só existe se a run limpou (§7.22.8: falhar custa o baú, nunca
     o farm). O foco e o clima montam no MESMO canal do baú da expedição: uma
     tabela de foco para os dois modos. */
  const efeitos = efeitosDa(motor, PERFIL_DO_AVANCO);
  const itens = premio.bau
    ? agrupar(sortearItens(semente(derivar(raiz, 'avanco:bau')), {
        pack, bioma: run.bioma, perfil: PERFIL_DO_AVANCO, estagio: run.estagio,
        vies: viesFinal(PERFIS[PERFIL_DO_AVANCO]?.vies ?? 0, run.estagio),
        cabe: cabeNoEstagio, peso: pesoDaRaridade,
        focoItemRaro: aplicarClima(efeitos.itemRaro, bonusClima, 'itemRaro'),
        focoMaterial: aplicarClima(efeitos.material, bonusClima, 'material'),
      }))
    : [];
  /* O que entra na bolsa é o que o baú VIRA (ST-3.1): até o estágio 3, o item
     de porta de estilhaço vira partes — e a lista passa a dizer o que entrou. */
  for (let k = 0; k < itens.length; k++) {
    const it = itens[k];
    const l = it.classe === 'essencia'
      ? { chave: idDoMaterial(pack), quantidade: comRendimento(it.quantidade, fator, sorteioR()) }
      : lancamentoDoBau(it, { estagio: run.estagio, catalogo: pack.catalogo })
        ?? { chave: it.id, quantidade: it.quantidade };
    somar(l.chave, l.quantidade);
    if (l.estilhaco) itens[k] = { ...it, id: l.chave, quantidade: l.quantidade, estilhaco: true };
    else if (it.classe === 'essencia') itens[k] = { ...it, quantidade: l.quantidade };
  }
  /* "Essência ×0" no quadro seria o saque mentindo em outra direção. */
  for (let k = itens.length - 1; k >= 0; k--) if (!itens[k].quantidade) itens.splice(k, 1);

  /* OS ENCONTROS FICAM PENDENTES, esperando bola, com a ORIGEM marcada (L-166)
     — começar outra run limpa o quadro DESTA sem encostar na Rota OFF. */
  /* A FORMA DO ESTÁGIO (ST-2.13): o chefe evoluído do estágio 1 deixa a
     forma jovem dele — a mesma contagem, e nenhuma evoluída antes do nível. */
  const pendentes = premio.encontros.map((visto, i) => {
    const dex = formaDoEstagio(pack, visto, run.estagio);
    return { chave: `${run.raiz}:${i}`, expedicao: null, origem: 'avanco', dex,
             raridade: raridadeDe(pack, (pack.especies ?? []).find(x => x.dex === dex) ?? {}),
             bioma: run.bioma, estagio: run.estagio, em: agora };
  });

  /* O QUE O CLIMA PAGOU, em número ABSOLUTO (1.32): "+52 por clima" é a
     frase do dono, e "x1,15" obrigaria quem lê a fazer a conta. */
  const rendeu = {
    xp: ganho.xp, moedas: moedasComClima, itens, subiram, bau: premio.bau,
    rendimento: { run: naJanela, fator },
    clima: climaAqui ? {
      key: climaAqui.clima.key,
      nome: climaAqui.clima.name ?? climaAqui.clima.key,
      emoji: climaAqui.clima.emoji ?? '',
      canal: bonusClima?.canal ?? null,
      fator: bonusClima?.fator ?? 1,
      quantos: bonusClima?.quantos ?? 0,
      gracas: climaAqui.gracas.map(c => c.dex),
      ganhou: { xp: ganho.xp - ganhoCru.xp, moedas: moedasComClima - moedas },
    } : null,
  };
  return {
    stamina, credito, subiram, bolsa, itens, pendentes,
    fragmentos: premio.encontros.map(dex => ({ dex, n: FRAGMENTOS_POR_ENCONTRO })),
    /* O que o teto conta: zero numa run sem encontros. */
    encontros: premio.encontros.length, rendeu,
  };
}
