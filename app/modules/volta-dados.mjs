/* QUANDO VOLTA O QUE VALE (ST-2.27a · DEC-28 · DEC-30 · L-243 · L-244) — camada 0.
 *
 * O dono: "não quero o cara entrando no jogo por 1h e deixando 23h parado".
 * O teto de encontros continua a janela de 24 h (a DEC-30 mediu o balde e o
 * recusou: nenhum ritmo deixava o dia como estava). O que muda é que o "não"
 * passa a ter HORA: o próximo encontro volta quando o mais antigo sai da
 * janela, e a equipe sai quando o mais cansado tiver a stamina da run.
 *
 * Só contas de tempo, e a frase. A tela pinta.
 */
import { staminaAgora, REGEN_POR_HORA, TETO_ENCONTROS, PERFIS, comprometido } from '../../engine/expedicao.mjs';
import { STAMINA_DO_AVANCO } from '../../engine/avanco.mjs';
import { XP_POR_HORA_TREINO } from '../../engine/ausente.mjs';
import { relogioDoMundo } from './hora-do-dia.mjs';

const H = 3600_000, DIA = 24 * H;

/* A primeira hora, de agora em diante, em que o teto comporta `precisa`
   encontros. A janela é a do teto: cada lançamento sai dela 24 h depois de
   colhido. `reservado` é o que já está comprometido e ainda não foi colhido
   (a run aberta, as expedições em campo). `null` quando nunca cabe. */
export function quandoVoltaEncontro(lancamentos, agora, { teto = TETO_ENCONTROS, reservado = 0, precisa = 1 } = {}) {
  const dentro = (lancamentos ?? []).filter(x => Number.isFinite(x?.colhidaEm) && x.colhidaEm > agora - DIA && x.colhidaEm <= agora
    && Number.isFinite(x.encontros) && x.encontros > 0);
  let usados = dentro.reduce((a, x) => a + x.encontros, 0);
  const cabe = () => teto - reservado - usados >= precisa;
  if (cabe()) return agora;
  for (const x of [...dentro].sort((a, b) => a.colhidaEm - b.colhidaEm)) {
    usados -= x.encontros;
    if (cabe()) return x.colhidaEm + DIA;
  }
  return null;
}

/* D-157: o que está reservado FORA da run aberta. Durante a run o teto
   reserva os encontros dela (D-107) — e a hora da volta contava essa reserva:
   a rota dizia 17:50 antes da run e a run dizia 21:04. A pergunta "quando
   volta o próximo encontro" é sobre o que vem DEPOIS desta run. */
export const reservadoForaDaRun = t => comprometido({ ...t, reservas: [] }) - (t?.encontrosHoje ?? 0);

/* A hora em que TODOS da equipe têm a stamina da run: a do mais cansado. */
export function quandoCabeRun(membros, agora, { custo = STAMINA_DO_AVANCO, regen = REGEN_POR_HORA } = {}) {
  if (!membros?.length) return null;
  const falta = Math.max(...membros.map(m => Math.max(0, custo - staminaAgora(m, agora))));
  return falta <= 0 ? agora : agora + Math.ceil(falta / regen * H);
}

/* A hora no relógio do mundo (Brasília), e "amanhã" quando passa do dia. */
function hora(ts, agora) {
  const d = new Date(relogioDoMundo(ts)), hoje = new Date(relogioDoMundo(agora));
  const hm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return d.getUTCDate() !== hoje.getUTCDate() ? `amanhã às ${hm}` : `às ${hm}`;
}

/* A frase: só o que ainda NÃO está disponível. `null` quando tudo já está. */
export function fraseDaVolta({ encontro = null, run = null } = {}, agora) {
  const partes = [];
  if (Number.isFinite(encontro) && encontro > agora) partes.push(`o próximo encontro volta ${hora(encontro, agora)}`);
  if (Number.isFinite(run) && run > agora) partes.push(`a equipe pode sair de novo ${hora(run, agora)}`);
  if (!partes.length) return null;
  const f = partes.join(' · ');
  return f[0].toUpperCase() + f.slice(1) + '.';
}

/* ── SEM STAMINA, O QUE AINDA VALE (ST-2.27c · L-244) ────────────────────
 *
 * A hora da volta (acima) diz QUANDO voltar; ela não diz o que fazer ATÉ lá.
 * E há o que fazer, que a tela calava: outra criatura da coleção com stamina
 * sai agora, e uma expedição na ROTA OFF põe quem fica no banco para treinar
 * (`XP_POR_HORA_TREINO`). Nada disto é renda nova — o treino já existia; o
 * que muda é que o jogador sem stamina passa a VER que ele existe.
 *
 * Só dados planos: a criatura com `stamina/staminaEm/naCaixa`, as expedições
 * em campo com `equipe`, e `cabeNoTeto` já decidido por quem conhece o teto. */
export function enquantoDescansa({ criaturas = [], equipe = [], expedicoes = [], vagas = 1, agora,
  cabeNoTeto = true, custoRun = STAMINA_DO_AVANCO, custoExp = PERFIS.batida.custo, regen = REGEN_POR_HORA } = {}) {
  const emCampo = new Set((expedicoes ?? []).flatMap(x => x?.equipe ?? []));
  const escolhidos = new Set(equipe ?? []);
  const todas = (criaturas ?? []).filter(c => c?.id != null);
  /* quem pode SAIR: fora da caixa e fora de campo — a mesma guarda da run */
  const livres = todas.filter(c => !c.naCaixa && !emCampo.has(c.id));
  const troca = livres.filter(c => !escolhidos.has(c.id) && staminaAgora(c, agora) >= custoRun).map(c => c.id);
  /* o banco do treino é quem NÃO está em campo, caixa incluída (`treinoDaJanela`) */
  const treinando = emCampo.size ? todas.filter(c => !emCampo.has(c.id)).length : 0;

  let expedicao = null;
  if (cabeNoTeto && (expedicoes ?? []).length < vagas && livres.length) {
    const falta = Math.min(...livres.map(c => Math.max(0, custoExp - staminaAgora(c, agora))));
    expedicao = falta <= 0 ? agora : agora + Math.ceil(falta / regen * H);
  }
  /* quem fica no banco se UMA criatura sair na expedição */
  const banco = Math.max(0, todas.length - emCampo.size - 1);
  return { troca, treinando, expedicao, banco };
}

const lista = nomes => nomes.length < 2 ? nomes.join('')
  : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`;

/* As linhas, na ordem do que rende mais: sair agora com outra, depois o
   treino. `null` quando não há nada — o "não" com hora já está ao lado. */
export function fraseDoEnquanto(r, agora, nome = id => id) {
  const linhas = [];
  const treino = `+${XP_POR_HORA_TREINO} XP por hora`;
  if (r?.troca?.length) {
    const ns = r.troca.slice(0, 3).map(nome), mais = r.troca.length - ns.length;
    linhas.push(`${lista(mais > 0 ? [...ns, `mais ${mais}`] : ns)} ${r.troca.length > 1 ? 'têm' : 'tem'} ` +
      'stamina para a run agora.');
  }
  if (r?.treinando > 0)
    linhas.push(`${r.treinando} no banco treinando agora: ${treino} cada, enquanto a expedição corre.`);
  else if (Number.isFinite(r?.expedicao) && r.expedicao <= agora)
    linhas.push(r.banco > 0
      ? `Mande uma Batida na ROTA OFF: quem fica no banco treina ${treino} enquanto ela corre.`
      : 'Mande uma Batida na ROTA OFF: ela traz encontros enquanto a equipe descansa.');
  else if (Number.isFinite(r?.expedicao))
    linhas.push(`A próxima expedição cabe ${hora(r.expedicao, agora)}` +
      (r.banco > 0 ? ` — e enquanto ela corre o banco treina ${treino}.` : '.'));
  return linhas.length ? linhas : null;
}

/* O rótulo do botão NO PALCO: curto, porque ele mora sobre a cena e, no
   celular, numa linha só. A frase inteira vai embaixo da cena. */
export const rotuloDaVolta = (run, agora) =>
  Number.isFinite(run) && run > agora ? `Equipe descansando · ${hora(run, agora).replace('às ', '')}` : null;

/* O painel inteiro, como texto: a tela só o põe na página. O botão "sair com"
   leva os ids da troca — um clique troca a equipe da run (ST-2.27c). */
export function painelDoEnquanto(r, nome = id => id) {
  if (!r?.linhas?.length) return null;
  const troca = r.troca ?? [];
  return '<b class="enqTit">Enquanto a equipe descansa</b>' +
    r.linhas.map(l => `<span class="enqLinha">${l}</span>`).join('') +
    (troca.length ? `<button type="button" class="enqSair" data-sair-com="${troca.join(',')}">⚔ Sair com ` +
      `${lista(troca.map(nome))}</button>` : '');
}

/* ── O CUSTO DA EQUIPE PELOS DOIS CAMINHOS (ST-2.32, D-161) ───────────────
 *
 * O 7º relato: *"diz que 3 juntos custam 135 de stamina, mas também diz até 23
 * por criatura, o que dá 69"*. As duas contas estavam certas e eram de coisas
 * diferentes — a da expedição escolhida (Trilha, 45 cada) e a do Avanço (23
 * cada) — e a frase só dizia o total de uma, sem nome. A mesma equipe sai pelos
 * dois botões, então a frase diz os dois, cada um com o seu "cada". */
export function custoDaEquipe(quantos, perfil) {
  const n = Math.max(0, Math.floor(Number(quantos) || 0));
  const p = PERFIS[perfil];
  return {
    expedicao: p ? { rotulo: p.rotulo, cada: p.custo, total: p.custo * n } : null,
    run: { cada: STAMINA_DO_AVANCO, total: STAMINA_DO_AVANCO * n },
  };
}
export function fraseDoCusto(quantos, perfil) {
  const c = custoDaEquipe(quantos, perfil);
  const run = `${c.run.total} no Avanço (${c.run.cada} cada)`;
  return c.expedicao
    ? `custam <b>${c.expedicao.total}</b> de stamina na ${c.expedicao.rotulo} (${c.expedicao.cada} cada), ou <b>${run.replace(/^(\d+)/, '$1</b>')}`
    : `custam <b>${run.replace(/^(\d+)/, '$1</b>')} de stamina`;
}
