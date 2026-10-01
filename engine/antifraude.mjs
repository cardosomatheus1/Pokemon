/* A ANTIFRAUDE MÍNIMA DA CAPTURA (ST-13.6 · Spec §7.19, §7.21 · L-050, L-197).
 *
 * Puro: entram tempos e contagens que o servidor JÁ guarda; saem suspeitas com
 * o número que as sustenta. Nada aqui pune — quem decide é um operador, e a
 * suspeita fica registrada (auditada, nunca silenciosa).
 *
 * ── OS QUATRO VETORES DO §7.19, E ONDE CADA UM FECHOU ─────────────────────
 *
 *   captura forjada pelo cliente     ESTRUTURAL: o sorteio e o lance são do
 *                                    servidor, pela chave do encontro (13.2b)
 *   relógio manipulado                ESTRUTURAL: o relógio é o do servidor
 *   reivindicação repetida            ESTRUTURAL: colheitas idempotentes
 *   farm por contas ligadas           AQUI — pelo PADRÃO DE HORÁRIO
 *
 * ── POR QUE SÓ O HORÁRIO ─────────────────────────────────────────────────
 *
 * A L-050 registra a fronteira: dispositivo e rede são SINAIS NOVOS a coletar,
 * e o que se coleta, por quanto tempo e o que acontece com o falso positivo é
 * decisão do dono (§28 é proteção, não vigilância). O horário das ações já
 * está no banco — iniciar expedição, começar run, jogar bola — e basta: uma
 * pessoa operando várias contas age nelas em rajada, segundos uma da outra,
 * dia após dia. Dois jogadores de verdade coincidem por acaso, e pouco.
 *
 * ── A BANDA DE CAPTURA (L-197) ───────────────────────────────────────────
 *
 * Medida na simulação do idle (`test/fixtures/antifraude.json`, o mesmo
 * método da fixture de emissão, pela captura ESPERADA de cada lance): o casual
 * no estágio 3 captura 3,69 por dia e o maratona, 17,1. A banda abre meio
 * abaixo do menor e um quarto acima do maior — o teste confere que ela
 * continua saindo da medição. (Remedida na ST-2.13: era 3,64 e 16,99, teto
 * 21,3; sem as evoluídas fora da faixa, sobra mais da faixa comum, que se pega
 * mais fácil.)
 */
export const BANDA_DE_CAPTURA = Object.freeze({ min: 1.8, max: 21.4 });

/* O detector de horário. Medido com fraude plantada (`test/antifraude.mjs`):
   a TAXA DE DETECÇÃO e a de FALSO POSITIVO estão na fixture, e o gate 3→4 as
   lê — é a "taxa de detecção conhecida" do §7.21. */
export const DETECTOR = Object.freeze({ janelaMs: 60_000, minimo: 12, fracao: 0.5 });

/* A TAXA MEDIDA, por grau de rajada da fazenda (quantas das ações das contas
   seguem a primeira em até 40 s), e o falso positivo — que é ZERO, inclusive
   para os casais que jogam na mesma rotina. O limiar é conservador de
   propósito: quem paga o falso positivo é um jogador de verdade (§28), e a
   fazenda espaçada escapa, o que está escrito aqui e não escondido. */
export const DETECCAO_MEDIDA = Object.freeze({ rajada80: 0.908, rajada50: 0.4, rajada30: 0.008, falsoPositivo: 0 });

/* Quantas ações de `a` têm uma de `b` a menos de `janela` — dois ponteiros
   sobre as listas ordenadas. */
export function coincidencias(a, b, janelaMs = DETECTOR.janelaMs) {
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  let j = 0, n = 0;
  for (const t of x) {
    while (j < y.length && y[j] < t - janelaMs) j++;
    if (j < y.length && Math.abs(y[j] - t) <= janelaMs) n++;
  }
  return n;
}

/* Os pares suspeitos: coincidências demais, e demais em FRAÇÃO da conta com
   menos ações — as duas, porque uma conta muito ativa coincide com todo mundo
   em número, e duas contas quase paradas coincidem em fração com uma ação. */
export function suspeitas(contas, { janelaMs, minimo, fracao } = DETECTOR) {
  const lista = (contas ?? []).filter(c => (c.tempos ?? []).length);
  const fora = [];
  for (let i = 0; i < lista.length; i++) for (let k = i + 1; k < lista.length; k++) {
    const [a, b] = [lista[i], lista[k]];
    const menor = Math.min(a.tempos.length, b.tempos.length);
    const n = a.tempos.length <= b.tempos.length ? coincidencias(a.tempos, b.tempos, janelaMs) : coincidencias(b.tempos, a.tempos, janelaMs);
    if (n >= minimo && n / menor >= fracao)
      fora.push({ a: a.user, b: b.user, coincidem: n, fracao: +(n / menor).toFixed(3) });
  }
  return fora;
}

/* A captura de uma conta contra a banda — por jogador-dia. Acima do teto não é
   "sorte": o sorteio é do servidor e o teto de encontros limita, então acima
   da banda é defeito ou fraude, e alguém tem de olhar. */
export function capturaNaBanda({ capturas, dias }, banda = BANDA_DE_CAPTURA) {
  const valor = dias > 0 ? capturas / dias : 0;
  return { valor: +valor.toFixed(2), acima: valor > banda.max, teto: banda.max };
}
