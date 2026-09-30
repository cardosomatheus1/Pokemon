/* O HISTÓRICO DAS EXPEDIÇÕES E DAS RUNS (1.28 · L-141 · L-109) — camada 0.
 *
 * Pedido do dono, duas vezes: "um quadro na aba do IDLE informando o seu
 * histórico de expedição, quem enfrentou, o que farmou, quanto de XP, quanto
 * tempo, quais itens [...] com seus respectivos ícones e quantias". Até aqui a
 * colheita mostrava a ÚLTIMA volta, e ela sumia na próxima: quem volta depois
 * de oito horas lia um saldo que mudou sozinho.
 *
 * Uma LINHA por colheita, no MESMO formato para os dois modos — é o quadro dos
 * dois (§7.22.9), e dois formatos seriam duas telas que discordam. A linha é
 * montada do que a colheita JÁ devolve (a resposta gravada no servidor, ou a
 * run colhida): nada é sorteado de novo aqui.
 *
 * Com conta, o servidor monta as linhas a partir das colheitas gravadas
 * (`resultado_json`) e manda no `GET /api/idle`; sem conta, o aparelho guarda
 * as suas. As duas pontas chamam as MESMAS funções deste arquivo.
 */
import { premioDo } from '../../engine/avanco.mjs';
import { resultadoDa } from '../../engine/run-avanco.mjs';
import { idDoMaterial } from '../../engine/economia-idle.mjs';

/* Vinte linhas: um dia cheio de Batidas e runs cabe, e o save de uma aba que
   fica aberta por semanas não cresce sem fim. */
export const HISTORICO_MAX = 20;
export const TIPOS_DO_HISTORICO = Object.freeze(['expedicao', 'run']);

const inteiro = v => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
const texto = v => (typeof v === 'string' && v.length <= 64 ? v : null);

/* ── OS NOMES DOS TREINADORES SÃO PROVISÓRIOS, e dizem isso ───────────────
 * Combinado com o dono (L-109): "você pode teorizar os nomes e quando
 * definirmos os outfits de npc [...] faz a distribuição". A tabela nasce
 * declarada como teoria — nome inventado que se passa por definitivo é a
 * armadilha do ícone errado. O nome sai da semente da colheita e da posição
 * da luta: o mesmo treinador em toda leitura, no aparelho e no servidor. */
export const TREINADORES_PROVISORIOS = Object.freeze([
  'Campista Léo', 'Escoteira Bia', 'Montanhista Rui', 'Pescador Téo',
  'Estudante Nina', 'Andarilho Caio', 'Guarda Iara', 'Caçadora Lia',
]);
export function nomeDoTreinador(semente, i) {
  let h = 2166136261;
  for (const ch of `${semente}:${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return TREINADORES_PROVISORIOS[(h >>> 0) % TREINADORES_PROVISORIOS.length];
}

/* Os itens agrupados por id, com a quantia. A essência não tem id no sorteio:
   ela entra como o material do pack, que é o que foi para a bolsa. */
function itensDe(lista, pack) {
  const soma = new Map();
  for (const it of lista ?? []) {
    const id = it?.classe === 'essencia' ? idDoMaterial(pack) : texto(it?.id);
    if (id && inteiro(it.quantidade) > 0) soma.set(id, (soma.get(id) ?? 0) + inteiro(it.quantidade));
  }
  return [...soma].map(([id, n]) => ({ id, n }));
}

/* `dexDe(id)` responde a espécie de uma criatura da equipe — a linha guarda a
   ESPÉCIE, e não o id: quem foi solta depois continua no histórico. */
export function linhaDaExpedicao(x, r, { pack, dexDe = () => null }) {
  const semente = r?.semente ?? x.semente ?? x.id;
  return {
    tipo: 'expedicao', id: String(x.id), bioma: texto(x.bioma), estagio: inteiro(x.estagio) || 1,
    perfil: texto(x.perfil), inicio: inteiro(x.iniciadaEm), fim: inteiro(x.terminaEm), colhidaEm: inteiro(x.colhidaEm),
    equipe: (x.equipe ?? []).map(dexDe).filter(Number.isInteger),
    encontros: (r?.encontros ?? []).map(e => inteiro(e?.dex)).filter(Boolean),
    itens: itensDe(r?.itens, pack), moedas: inteiro(r?.moedas), xp: inteiro(r?.xp),
    /* O VS (L-109): quem enfrentou, o nível dele, e quem venceu. O material
       da batalha vai à parte — ele não está nos itens do sorteio. */
    lutas: (r?.npc?.lista ?? []).map((b, i) => ({ nome: nomeDoTreinador(semente, i), nivel: inteiro(b?.nivelNpc), venceu: b?.venceu === true })),
    material: inteiro(r?.npc?.material),
  };
}

/* A run colhida já traz tudo: o que ela pagou em `rendeu`, e o que apareceu
   é DERIVADO dela pela mesma conta que a colheita usou (`premioDo`) — guardar
   a lista de novo seria uma segunda fonte para a mesma coisa. */
export function linhaDaRun(run, { pack, dexDe = () => null }) {
  const premio = premioDo(resultadoDa(run), { encontrosValem: run?.semEncontros !== true });
  return {
    tipo: 'run', id: String(run.raiz), bioma: texto(run.bioma), estagio: inteiro(run.estagio) || 1,
    perfil: null, inicio: inteiro(run.iniciadaEm), fim: inteiro(run.fim?.em ?? run.colhidaEm), colhidaEm: inteiro(run.colhidaEm),
    equipe: (run.equipe ?? []).map(dexDe).filter(Number.isInteger),
    encontros: premio.encontros.map(inteiro).filter(Boolean),
    itens: itensDe(run.rendeu?.itens, pack), moedas: inteiro(run.rendeu?.moedas), xp: inteiro(run.rendeu?.xp),
    lutas: [], material: 0,
    waves: resultadoDa(run).waves, abates: premio.abates, desfecho: texto(run.fim?.motivo),
    clima: texto(run.rendeu?.clima?.nome),
  };
}

/* A linha nova entra no topo; a mesma colheita não entra duas vezes (a
   resposta repetida da rota idempotente é a mesma linha). */
export function noHistorico(lista, linha, max = HISTORICO_MAX) {
  const chave = l => `${l.tipo}:${l.id}`;
  return [linha, ...(lista ?? []).filter(l => chave(l) !== chave(linha))]
    .sort((a, b) => b.colhidaEm - a.colhidaEm).slice(0, max);
}

/* ── O QUE VOLTA DO DISCO (ou do servidor) É UMA LINHA, OU NÃO É NADA ─────
 * O save está a um F12 de distância; a linha não dá vantagem nenhuma, mas é
 * pintada — e um campo torto no disco não pode quebrar a aba inteira. */
export function historicoDoDisco(cru) {
  if (!Array.isArray(cru)) return [];
  const listaDe = (v, f) => (Array.isArray(v) ? v.map(f) : []);
  const linhas = cru.filter(l => l && typeof l === 'object' && TIPOS_DO_HISTORICO.includes(l.tipo) && texto(String(l.id ?? '')))
    .map(l => ({
      tipo: l.tipo, id: String(l.id), bioma: texto(l.bioma), estagio: inteiro(l.estagio) || 1, perfil: texto(l.perfil),
      inicio: inteiro(l.inicio), fim: inteiro(l.fim), colhidaEm: inteiro(l.colhidaEm),
      equipe: listaDe(l.equipe, inteiro).filter(Boolean), encontros: listaDe(l.encontros, inteiro).filter(Boolean),
      itens: listaDe(l.itens, i => ({ id: texto(i?.id), n: inteiro(i?.n) })).filter(i => i.id && i.n),
      moedas: inteiro(l.moedas), xp: inteiro(l.xp),
      lutas: listaDe(l.lutas, b => ({ nome: texto(b?.nome) ?? 'Treinador', nivel: inteiro(b?.nivel), venceu: b?.venceu === true })),
      material: inteiro(l.material),
      ...(l.tipo === 'run' ? { waves: inteiro(l.waves), abates: inteiro(l.abates), desfecho: texto(l.desfecho), clima: texto(l.clima) } : {}),
    }));
  return linhas.sort((a, b) => b.colhidaEm - a.colhidaEm).slice(0, HISTORICO_MAX);
}
export const camposDoHistorico = cru => ({ historico: historicoDoDisco(cru?.historico) });

/* ── O QUE A TELA PINTA ────────────────────────────────────────────────── */

/* "45 min", "3 h", "3 h 15 min" — o tempo que a volta levou, do começo ao
   fim (a espera até a colheita não conta: ela não rendeu nada). */
export function textoDaDuracao(ms) {
  const min = Math.max(0, Math.round((ms ?? 0) / 60_000)), h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

/* "há 5 min", "há 3 h", "ontem", "há 4 dias" — quando voltou. */
export function textoDeQuando(em, agora) {
  const min = Math.max(0, Math.floor((agora - em) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

const comMaterial = (itens, id, n) => (itens.some(i => i.id === id)
  ? itens.map(i => (i.id === id ? { ...i, n: i.n + n, daBatalha: n } : i))
  : [...itens, { id, n, daBatalha: n }]);

const DESFECHOS = Object.freeze({ limpou: 'limpou as 10 waves', hp: 'caiu', recuou: 'recuou' });

/* O cartão de uma linha: o que a tela escreve, já decidido. `nomeDoBioma`,
   `rotuloDoPerfil` e o id do material vêm do pack pela tela; aqui não há DOM. */
export function cartaoDoHistorico(l, { agora, nomeDoBioma = id => id ?? '?', rotuloDoPerfil = p => p ?? '', material = 'material' } = {}) {
  const vitorias = l.lutas.filter(b => b.venceu).length;
  const modo = l.tipo === 'run' ? 'Avanço' : `Rota OFF${l.perfil ? ` · ${rotuloDoPerfil(l.perfil)}` : ''}`;
  const detalheRun = l.tipo === 'run'
    ? `wave ${l.waves} · ${l.abates} abate${l.abates === 1 ? '' : 's'}${DESFECHOS[l.desfecho] ? ` · ${DESFECHOS[l.desfecho]}` : ''}${l.clima ? ` · ${l.clima}` : ''}`
    : null;
  return {
    chave: `${l.tipo}:${l.id}`, tipo: l.tipo,
    titulo: `${nomeDoBioma(l.bioma)} · estágio ${l.estagio}`, modo,
    quando: textoDeQuando(l.colhidaEm, agora), duracao: textoDaDuracao(l.fim - l.inicio),
    encontros: l.encontros.length, xp: l.xp, moedas: l.moedas,
    /* O material das batalhas SOMA ao do sorteio: dois chips do mesmo cristal
       ("×15 … ×4") liam como dois itens diferentes (Q5 do 1.28). */
    itens: l.material ? comMaterial(l.itens, material, l.material) : l.itens,
    lutas: l.lutas.length ? `${l.lutas.length} treinador${l.lutas.length === 1 ? '' : 'es'} · ${vitorias} vitória${vitorias === 1 ? '' : 's'}` : null,
    vs: l.lutas.map(b => ({ nome: b.nome, nivel: `nv ${b.nivel}`, resultado: b.venceu ? 'vitória' : 'derrota', venceu: b.venceu })),
    detalheRun, equipe: l.equipe, especies: l.encontros,
  };
}

/* O somatório do quadro: o que as linhas guardadas renderam juntas. */
export function resumoDoHistorico(linhas) {
  const s = { voltas: 0, encontros: 0, xp: 0, moedas: 0, vitorias: 0, lutas: 0 };
  for (const l of linhas ?? []) {
    s.voltas++; s.encontros += l.encontros.length; s.xp += l.xp; s.moedas += l.moedas;
    s.lutas += l.lutas.length; s.vitorias += l.lutas.filter(b => b.venceu).length;
  }
  return s;
}
