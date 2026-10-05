/* A JORNADA — motor e progresso (ST-10.11 · F4.5 · Spec §8.7).
 *
 * Os nós do caminho, EM ORDEM. Um nó só abre quando o anterior foi vencido; o
 * ginásio dá a INSÍGNIA, e a insígnia é o que o caminho cobra para seguir. O
 * resultado de uma luta de nó vem SEMPRE da simulação semeada (`simular`), e
 * de lugar nenhum mais: o progresso é consequência da luta, nunca um campo que
 * a tela escreve.
 *
 * ── O PROGRESSO É ADITIVO ─────────────────────────────────────────────────
 *
 * `{ vencidos: [ids], insignias: [ids] }` no save, e só cresce. Vencer de novo
 * um nó não dá a insígnia de novo (ela já está), e perder nunca tira nada — a
 * jornada é um caminho, e não uma escada que desce.
 *
 * O motor é puro: recebe o time do jogador e o do rival já resolvidos (os
 * golpes do rival são da camada de cima), e devolve o progresso NOVO sem mexer
 * no que recebeu.
 */
import { simular } from './treino-batalha.mjs';
import { estadoXpRepetido } from './xp-jornada-repeticao.mjs';

export const nosDa = pack => pack?.jornada ?? [];
export const progressoVazio = () => ({ vencidos: [], insignias: [] });

/* O progresso de um save — aditivo: campo ausente ou torto vira vazio. */
export function camposDaJornada(cru) {
  const j = cru?.jornada;
  const lista = v => (Array.isArray(v) ? [...new Set(v.map(String))] : []);
  /* ST-10.17: o dia do PvE (o que a repetição já pagou hoje) — aditivo. */
  const pve = j?.pve;
  const dia = Number.isInteger(pve?.dia) ? pve.dia : null;
  return { jornada: { vencidos: lista(j?.vencidos), insignias: lista(j?.insignias),
                      xpRepeticao: estadoXpRepetido(j?.xpRepeticao, j?.xpRepeticao?.dia ?? null),
                      pve: { dia, pago: dia !== null && Number.isFinite(pve?.pago) && pve.pago > 0 ? Math.floor(pve.pago) : 0, nos: dia !== null ? lista(pve?.nos) : [],
                             chefes: dia !== null ? lista(pve?.chefes) : [] } } };
}

/* Aberto: todos os nós ANTES dele vencidos. */
export function aberto(pack, prog, id) {
  const nos = nosDa(pack), i = nos.findIndex(n => n.id === id);
  if (i < 0) return false;
  const vencidos = new Set(prog?.vencidos ?? []);
  return nos.slice(0, i).every(n => vencidos.has(n.id));
}

/* O próximo nó a vencer; `null` quando a jornada acabou. */
export const noAtual = (pack, prog) => nosDa(pack).find(n => !(prog?.vencidos ?? []).includes(n.id)) ?? null;

/* A luta de um nó. `timeA`/`timeB` resolvidos; `semente` é a da luta. */
export function lutarNo(pack, prog, id, timeA, timeB, { semente, preset = 'balanced' }) {
  const no = nosDa(pack).find(n => n.id === id);
  if (!no) throw new Error(`nó desconhecido: ${id}`);
  if (!aberto(pack, prog, id)) throw new Error(`fora de ordem: ${id} ainda não abriu`);
  if (!Number.isInteger(semente)) throw new Error('a luta de jornada precisa de semente');
  const resultado = simular(pack, timeA, timeB, semente >>> 0, { preset });
  const antes = prog ?? progressoVazio();
  const novo = { vencidos: [...(antes.vencidos ?? [])], insignias: [...(antes.insignias ?? [])] };
  let ganhouInsignia = null;
  if (resultado.vencedor === 'A') {
    if (!novo.vencidos.includes(id)) novo.vencidos.push(id);
    if (no.insignia && !novo.insignias.includes(no.insignia)) { novo.insignias.push(no.insignia); ganhouInsignia = no.insignia; }
  }
  return { resultado, progresso: novo, ganhouInsignia, primeiraVez: resultado.vencedor === 'A' && !(antes.vencidos ?? []).includes(id) };
}

/* ── QUANTOS LUTAM (ST-2.16) ──────────────────────────────────────────────
 * O time de seis lutava INTEIRO, e todo lutador bate a cada turno: seis
 * contra os dois do Brock é o triplo do dano por turno, e seis bases no nível
 * 8 o venciam em 100% (medido). Agora lutam no mínimo 3, ou tantos quantos o
 * treinador trouxer se forem mais. Três é o tamanho dos times de referência
 * com que os ginásios foram calibrados — nenhuma medição deles muda. */
export const LUTAM_NO_MINIMO = 3;
export const quantosLutam = nRival => Math.max(LUTAM_NO_MINIMO, Math.floor(Number(nRival) || 0));
