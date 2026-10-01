/* A FONTE DO PC-T: A JORNADA VERIFICADA (ST-14.0E · E14 · DEC-22) — camada 0.
 *
 * O PC-T — a moeda que passa entre jogadores — precisa nascer de algum lugar
 * que um farm não repete. A DEC-22 escolheu a PRIMEIRA vitória em cada nó
 * que dá marca da jornada: a insígnia do ginásio, o selo da Liga e o título
 * do campeão. É finita por construção (a soma dos nós), decidida no servidor
 * (a luta da ST-13.7) e uma vez por conta, a vida inteira.
 *
 *   insígnia   50   (oito ginásios)
 *   selo       75   (a Liga)
 *   final     150   (o campeão — que também tem selo, e vale o final)
 *
 * MATURIDADE: o PC-T da jornada não troca antes de 7 dias de conta. Conta
 * criada para farmar a jornada e despejar no Market espera uma semana com o
 * dinheiro parado — e a antifraude de contas ligadas (ST-14.14) tem a semana
 * para olhar. O relógio é o do SERVIDOR: a data da conta é a do cadastro.
 *
 * Os campos (`insignia`, `selo`, `final`) são do pack; o motor não sabe o
 * nome de ginásio nenhum.
 */
export const PCT_JORNADA = Object.freeze({ versao: 'pct-jornada-v1', insignia: 50, selo: 75, final: 150, maturidadeDias: 7 });
const DIA_MS = 86_400_000;

export function pcTDoNo(no, regra = PCT_JORNADA) {
  if (!no) return 0;
  if (no.final) return regra.final;
  if (no.selo) return regra.selo;
  if (no.insignia) return regra.insignia;
  return 0;
}

/* O teto por conta: a soma de todos os nós do pack. */
export const tetoDaJornada = (nos, regra = PCT_JORNADA) => (nos ?? []).reduce((a, n) => a + pcTDoNo(n, regra), 0);

/* Quanto do PC-T da conta ainda está em maturação: tudo o que veio da
   jornada, enquanto a conta tem menos de `maturidadeDias`; depois, nada. */
export function pcTEmMaturacao({ criadaEm, agora, daJornada, regra = PCT_JORNADA }) {
  if (!Number.isFinite(criadaEm) || !Number.isFinite(agora)) return Math.max(0, daJornada);
  return agora - criadaEm < regra.maturidadeDias * DIA_MS ? Math.max(0, daJornada) : 0;
}
