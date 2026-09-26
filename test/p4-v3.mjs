/* Q3 · P4 COM TUDO LIGADO (ST-9.18 · Spec §7.21, P4 "Arena normalizada")
 *
 * "Nenhum atributo do Pokémon de coleção altera a Arena." Com a V3 inteira
 * ligada — doce, evolução, moveset, dossiê consultado, capturas — o que o
 * servidor GRAVOU de uma rodada (as odds e o campeão) continua sendo função
 * só da raiz revelada: recalculado do zero, sem banco, dá o mesmo. E o fecho
 * dos módulos que decidem luta e preço não alcança nenhum módulo que carregue
 * estado de coleção.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { apostar } from '../server/aposta.mjs';
import { receberDoCliente } from '../server/telemetria.mjs';
import { montarRodadaServidor, M } from '../server/rodada.mjs';
import { lutaDaRodada } from '../engine/luta-rodada.mjs';
import { sementes, lerRaiz } from '../engine/seed.mjs';

const RAIZ_DO_REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.UTC(2026, 8, 1, 15);

/* O fecho de importação, seguindo os `import`/`export ... from` relativos. */
function fecho(inicios) {
  const vistos = new Set();
  const andar = f => {
    if (vistos.has(f)) return;
    vistos.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\s+['"](\.[^'"]+)['"]/g))
      andar(resolve(dirname(f), m[1] ?? m[2]));
  };
  for (const i of inicios) andar(resolve(RAIZ_DO_REPO, i));
  return [...vistos].map(f => f.slice(RAIZ_DO_REPO.length + 1));
}

/* Quem DECIDE a Arena: o elenco, o preço, a luta, a colocação e os mercados. */
const DECIDEM = ['server/rodada.mjs', 'engine/luta-rodada.mjs', 'engine/preco.mjs', 'engine/colocacao.mjs', 'engine/mercado-abates.mjs'];
/* O que carrega estado de coleção — nenhum pode estar no fecho. */
const COLECAO = /^(app\/|server\/(?!rodada\.mjs)|engine\/(doce|instancia|evolucao|captura|repertorio|gate-v3|dossie|exclusivos)\.mjs)/;

export async function suite() {
  const s = criarSuite('p4-v3');

  s.teste('o fecho de quem decide a Arena não alcança a coleção', () => {
    const f = fecho(DECIDEM);
    ok(f.includes('engine/engine.mjs') && f.includes('server/rodada.mjs'), `o fecho não andou: ${f.join(', ')}`);
    const fora = f.filter(x => COLECAO.test(x));
    igual(fora.join(', '), '', 'a Arena importa estado de coleção');
  });

  s.teste('com a V3 inteira ligada, o que o servidor gravou se refaz só pela raiz', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    try {
      const encerrar = () => { for (let i = 0; i < 300 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); } };
      const u = cadastrar(srv.db, { username: 'p4', email: 'p4@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: t }).id;
      creditar(srv.db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 20000, idem: 'p4', agora: t });
      /* TUDO LIGADO: uma rodada paga (o doce credita), e a coleção inteira relatada. */
      for (let k = 0; k < 3; k++) {
        const r = srv.sched.abrirRodada();
        const fav = srv.db.prepare(`SELECT slot FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(r.id);
        apostar(srv.db, { sched: srv.sched, userId: u, slot: fav.slot, valor: 500, agora: t });
        receberDoCliente(srv.db, { userId: u, agora: t, eventos: [
          { nome: 'dossie_consultado', chave: `d:${k}`, campos: { em: t, dex: 6, antesDeApostar: true } },
          { nome: 'moveset_comparado', chave: `m:${k}`, campos: { em: t, dex: 6 } },
          { nome: 'doce_gasto', chave: `g:${k}`, campos: { em: t, dex: 4, quantidade: 3 } },
          { nome: 'evolucao_feita', chave: `e:${k}`, campos: { em: t, de: 4, para: 5 } },
          { nome: 'creature_captured', chave: `c:${k}`, campos: { em: t, dex: 25 } }] });
        encerrar(); srv.laco.passo();
        const doces = srv.db.prepare(`SELECT COALESCE(SUM(quantidade), 0) AS n FROM species_candy WHERE user_id = ?`).get(u).n;
        ok(k === 0 || doces > 0, 'o doce não foi creditado — a V3 não está ligada');
        /* Refeito do zero: as odds oferecidas e o campeão. */
        const lida = srv.db.prepare(`SELECT round_seed_reveal, champion_species_id FROM rounds WHERE id = ?`).get(r.id);
        const raiz = lerRaiz(lida.round_seed_reveal);
        const principal = montarRodadaServidor(raiz, 40);
        const gravado = srv.db.prepare(`SELECT offered_odd FROM round_fighters WHERE round_id = ? ORDER BY slot`).all(r.id);
        igual(JSON.stringify(gravado.map(x => x.offered_odd)), JSON.stringify(principal.lutadores.map(l => l.odd)),
          `rodada ${k}: a odd gravada não se refaz pela raiz — algo além dela entrou no preço`);
        const sm = sementes(raiz), pool = M.sortearPool(sm.elenco);
        const { batalha } = lutaDaRodada(M, { pool, ambiente: sm.ambiente, batalha: sm.batalha });
        igual(lida.champion_species_id, pool[batalha.winner].dex, `rodada ${k}: o campeão não se refaz pela raiz`);
      }
    } finally { srv.fechar?.(); }
  });

  return s;
}
