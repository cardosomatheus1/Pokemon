/* A LUTA DA JORNADA É UMA CONTA SÓ (ST-13.7 · E13 · L-208) — camada 0.
 *
 * Puro: entram as criaturas, o progresso, o nó, o preset, a semente e o dia;
 * sai a luta, o progresso novo e o que ela CREDITA — sem gravar nada. O
 * aparelho (`jornada-local.mjs`) e o servidor (`server/jornada.mjs`) chamam
 * esta função, e a identidade é cobrada byte a byte (`test/jornada-servidor`).
 *
 * O time é a EQUIPE (quem não está na caixa), com os golpes escolhidos; o
 * rival, o do nó com o padrão do moveset. A recompensa é a da ST-10.17: a
 * vitória e o pagamento saem da MESMA conta, e quem grava grava os dois.
 *
 * A CHANCE EXIBIDA também mora aqui (`chanceDaLuta`): a tela a fatia por
 * quadro com a mesma raiz, e o servidor a refaz inteira — é assim que o
 * evento `pve_iniciado` do servidor leva a chance que a tela mostrou, sem que
 * o cliente a declare.
 */
import { entradasDoTime, rivalDe, treinador } from './treino-dados.mjs';
import { lutarNo, nosDa } from '../../engine/jornada.mjs';
import { recompensaPve } from '../../engine/recompensa-pve.mjs';
import { chaveDoDoce } from '../../engine/doce.mjs';
import { idDaMoeda } from '../../engine/economia-idle.mjs';
import { chanceDeVencer } from '../../engine/treino-preco.mjs';

/* A raiz do lote da chance: FIXA, para o mesmo time mostrar o mesmo número a
   cada visita — e para o servidor refazer o que a tela mostrou. */
export const RAIZ_DA_CHANCE = 1;

const noDa = (pack, id) => nosDa(pack).find(n => n.id === id) ?? null;
const timesDa = (pack, criaturas, no) => ({
  timeA: entradasDoTime(pack, { criaturas: criaturas ?? [] }),
  timeB: rivalDe(pack, treinador(pack, no.rival)),
});

export function chanceDaLuta({ pack, criaturas, id, preset = 'balanced' }) {
  const no = noDa(pack, id);
  if (!no) return null;
  const { timeA, timeB } = timesDa(pack, criaturas, no);
  return timeA.length ? chanceDeVencer(pack, timeA, timeB, { raiz: RAIZ_DA_CHANCE, preset }) : null;
}

export function contaDaLuta({ pack, criaturas, jornada, id, preset = 'balanced', semente, dia }) {
  const no = noDa(pack, id);
  if (!no) return { ok: false, motivo: `nó desconhecido: ${id}` };
  const { timeA, timeB } = timesDa(pack, criaturas, no);
  if (!timeA.length) return { ok: false, motivo: 'o time está vazio' };
  let saida;
  try { saida = lutarNo(pack, jornada, id, timeA, timeB, { semente, preset }); }
  catch (x) { return { ok: false, motivo: x.message }; }
  const linhas = [...new Set(timeA.map(c => chaveDoDoce(pack, c.dex)))];
  const chefe = no.chefe ? treinador(pack, no.rival) : null;
  const recompensa = recompensaPve({
    no: { id, ginasio: !!no.insignia, chefe: !!no.chefe, liga: !!no.liga, essencia: chefe?.essencia },
    venceu: saida.resultado.vencedor === 'A', primeiraVez: saida.primeiraVez, dia, hoje: jornada?.pve, linhas });
  /* O que entra na bolsa, na ordem em que o aparelho sempre creditou: a
     moeda, as bolas, e a essência do chefe com a espécie na chave — nunca a
     criatura (L-057). */
  const bolsa = {};
  const somar = (k, n) => { if (n) bolsa[k] = (bolsa[k] ?? 0) + n; };
  somar(idDaMoeda(pack), recompensa.pokecoin);
  for (const [b, n] of Object.entries(recompensa.bolas)) somar(b, n);
  for (const [d, n] of Object.entries(recompensa.essencias ?? {})) somar(`essencia:${d}`, n);
  return { ok: true, ...saida, semente, timeA, timeB, recompensa,
           jornada: { ...saida.progresso, pve: recompensa.hoje },
           credito: { bolsa, doces: { ...recompensa.doces } } };
}
