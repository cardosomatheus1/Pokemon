/* Arnês mínimo, sem dependências — o protótipo é zero-dependência e o arnês
 * não vai ser a primeira coisa a quebrar isso. */
export function criarSuite(nome) {
  const casos = [];
  return {
    /* O nome fica exposto no objeto, e não só no resultado: o recorte `--so`
       (T3) precisa saber quem é cada suíte ANTES de rodá-la. */
    nome,
    teste: (titulo, fn) => casos.push({ titulo, fn }),
    async rodar() {
      const falhas = [];
      for (const c of casos) {
        try { await c.fn(); process.stdout.write('.'); }
        catch (e) { process.stdout.write('F'); falhas.push({ titulo: c.titulo, erro: e.message }); }
      }
      process.stdout.write('\n');
      return { nome, total: casos.length, falhas };
    },
  };
}

export function ok(cond, msg) { if (!cond) throw new Error(msg); }
export function igual(a, b, msg) {
  if (a !== b) throw new Error(`${msg} — esperado ${b}, veio ${a}`);
}
export function dentro(v, alvo, tol, msg) {
  if (Math.abs(v - alvo) > tol)
    throw new Error(`${msg} — ${v.toFixed(4)} fora de ${alvo.toFixed(4)} ± ${tol}`);
}

/* PRNG próprio do arnês, para que a seleção de elenco nos testes seja
   reproduzível. Continua existindo depois do F0.5, que deu semente ao
   `sortearPool` do motor: as fixtures foram gravadas com ESTE embaralhamento, e
   trocá-lo por outro reescreveria todos os goldens sem nenhuma mudança real de
   comportamento. */
export function rngTeste(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function elencoDeterministico(elenco, montarElenco, seed, n = 12) {
  const R = rngTeste(seed);
  const src = elenco.slice();
  for (let i = src.length - 1; i > 0; i--) {
    const j = (R() * (i + 1)) | 0;
    [src[i], src[j]] = [src[j], src[i]];
  }
  return montarElenco(src.slice(0, n));
}

/* ── D-021 · QUANTO A RODADA ACEITA NESTE SLOT ─────────────────────────────
 *
 * O teto de payout do §4.4.6 depende da ODD, a odd depende da raiz, e a raiz é
 * sorteada a cada rodada. Um teste que aposta valor fixo está apostando contra
 * o sorteio — e às vezes perde:
 *
 *     valor    rodadas recusadas por `teto_de_payout` (de 300)
 *       300      0    0,0%
 *       500      2    0,7%
 *     1.000     21    7,0%
 *
 * Foi essa a instabilidade que deixou a linha de base do portão vermelha uma
 * vez em onze — e linha de base instável aborta o Q2 inteiro, que é o pior
 * lugar possível para um teste escolher quando falhar.
 *
 * Perguntar à rodada quanto cabe torna o teste determinístico sem mudar o que
 * ele mede: `stakeMax` é publicado por `paraCliente()`, e é exatamente o número
 * que o §4.4.6 usa para recusar. */
export const stakeQueCabe = (sched, slot, desejado) =>
  Math.min(desejado, sched.paraCliente().lutadores[slot].stakeMax);

