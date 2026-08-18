/* Arnês mínimo, sem dependências — o protótipo é zero-dependência e o arnês
 * não vai ser a primeira coisa a quebrar isso. */
export function criarSuite(nome) {
  const casos = [];
  return {
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
   reproduzível. O protótipo ainda usa Math.random em pickLineup; consertar
   isso é o bloco F0.5, não este. */
export function rngTeste(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function elencoDeterministico(KANTO_DEX, buildRoster, seed, n = 12) {
  const R = rngTeste(seed);
  const src = KANTO_DEX.slice();
  for (let i = src.length - 1; i > 0; i--) {
    const j = (R() * (i + 1)) | 0;
    [src[i], src[j]] = [src[j], src[i]];
  }
  return buildRoster(src.slice(0, n));
}
