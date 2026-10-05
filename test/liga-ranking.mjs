/* Q1/Q6 · O RANKING DA LIGA DE TIMES (ST-11.6c · Spec §12 tela 28, §9.7, §9.15)
 *
 *   A TEMPORADA DE AGORA é viva: a mesma ordem que a virada grava, só com quem
 *                        já jogou
 *   A FECHADA            é a gravada na virada, e não se recalcula
 *   O NÚMERO             nunca sai — nem na resposta, nem na tela
 *   EU                   destacado; fora do topo, depois do "…", com a minha
 *                        posição de verdade
 *   SÓ DA LIGA DE TIMES  a previsão tem a tabela dela (§9.15)
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { rankingDaLiga } from '../server/liga-equipe.mjs';
import { sincronizarTemporada } from '../server/temporada.mjs';
import { rankingNaTela } from '../app/modules/liga-equipe-dados.mjs';
import { temporadaDe, TEMPORADA } from '../engine/temporada.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { registrarAtividade } from './fixtures/atividade-ranking.mjs';

const DIA = 86_400_000, T1 = Date.UTC(2026, 9, 5, 12);
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

function cena(n = 25) {
  const db = abrirBanco(':memory:'); migrar(db);
  const ids = Array.from({ length: n }, (_, i) => cadastrar(db, { username: `Rk${String(i).padStart(2, '0')}`, email: `rk${i}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T1 }).id);
  /* Ratings de 1500 para baixo, de 20 em 20; a última conta nunca jogou. */
  ids.slice(0, n - 1).forEach((id, i) => db.prepare(`INSERT INTO liga_mmr (user_id, rating, partidas, atualizado_em) VALUES (?, ?, ?, ?)`).run(id, 1500 - i * 20, 3 + i, T1));
  const outro = cadastrar(db,{username:'RkReserva',email:'rk-reserva@x.test',senha:'senha-longa-o-bastante-1',nascimento:'1990-01-01',agora:T1}).id;
  ids.slice(0,n-1).forEach((id,i)=>registrarAtividade(db,id,outro,3+i,T1));
  return { db, ids };
}

export async function suite() {
  const s = criarSuite('liga-ranking');

  s.teste('a temporada de agora: a ordem do rating, só quem jogou, o topo de 20 e eu fora dele', () => {
    const c = cena();
    const r = rankingDaLiga(c.db, { userId: c.ids[22], agora: T1 });
    igual(`${r.atual}|${r.total}|${r.linhas.length}|${r.linhas[0].nome}|${r.linhas[0].tier}|${r.linhas[19].posicao}`, 'true|24|20|Rk00|Platinum|20', 'o ranking vivo');
    igual(`${r.eu.posicao}|${r.eu.nome}|${r.eu.eu}`, '23|Rk22|true', 'a minha linha fora do topo');
    ok(!r.linhas.some(x => x.nome === 'Rk24'), 'quem nunca jogou entrou no ranking');
    /* A linha com zero partidas (um reset, uma importação) também não entra — nem no topo. */
    c.db.prepare(`INSERT INTO liga_mmr (user_id, rating, partidas, atualizado_em) VALUES (?, 2000, 0, ?)`).run(c.ids[24], T1);
    igual(rankingDaLiga(c.db, { userId: c.ids[0], agora: T1 }).linhas[0].nome, 'Rk00', 'a conta sem partida tomou o 1º lugar');
    ok(!/"rating"|1500|1480/.test(JSON.stringify(r)), 'o número vazou no ranking');
    igual(rankingDaLiga(c.db, { userId: c.ids[24], agora: T1 }).eu, null, 'quem nunca jogou tem posição');
  });

  s.teste('a temporada fechada: a gravada na virada, com as abas', () => {
    const c = cena(6);
    sincronizarTemporada(c.db, { agora: T1 });
    const t2 = temporadaDe(T1).fim + DIA;
    const r = rankingDaLiga(c.db, { userId: c.ids[0], agora: t2, temporada: 1 });
    igual(`${r.atual}|${r.temporada}|${r.fechadas.join()}|${r.linhas.map(x => x.nome).join()}`, 'false|1|1|Rk00,Rk01,Rk02,Rk03,Rk04', 'o ranking final da temporada 1');
    igual(rankingDaLiga(c.db, { userId: c.ids[0], agora: t2, temporada: 9 }), null, 'a temporada que não existe devolveu tabela');
    void TEMPORADA;
  });

  s.teste('na tela: medalha no pódio, eu aceso, o "…" antes de mim, as abas, e nenhum número de rating', () => {
    const c = cena();
    const k = rankingNaTela(rankingDaLiga(c.db, { userId: c.ids[22], agora: T1 }));
    igual(`${k.titulo}|${k.linhas.slice(0, 4).map(x => x.medalha).join()}|${k.foraDoTopo.posicao}|${k.foraDoTopo.eu}|${k.suaPosicao}`, 'Temporada 1 · ao vivo|ouro,prata,bronze,|23º|true|você: 23º de 24', 'a tela do ranking');
    const noTopo = rankingNaTela(rankingDaLiga(c.db, { userId: c.ids[1], agora: T1 }));
    igual(`${noTopo.foraDoTopo}|${noTopo.linhas.filter(x => x.eu).map(x => x.posicao).join()}`, 'null|2º', 'eu no topo apareci duas vezes, ou apagado');
    igual(rankingNaTela({ temporada: 2, atual: true, fechadas: [1], total: 0, linhas: [], eu: null }).abas.map(a => `${a.rotulo}${a.on ? '*' : ''}`).join(), 'agora*,T1', 'as abas');
    const primeira = rankingNaTela({ temporada: 1, atual: true, fechadas: [], total: 0, linhas: [], eu: null });
    igual(`${primeira.abas.length}|${primeira.semAnteriores}`, '0|primeira temporada — ainda sem anteriores', 'sem temporada fechada ainda há aba para escolher');
    ok(/primeira partida abre/.test(rankingNaTela({ temporada: 2, atual: true, fechadas: [], total: 0, linhas: [], eu: null }).vazio), 'o ranking vazio não explica');
    ok(!/rating/.test(fonte('../app/modules/liga-equipe-tela.mjs')), 'a tela fala de rating');
  });

  s.teste('a tabela é só da Liga de times: a de previsão é outra rota e outra tela', () => {
    const tela = fonte('../app/modules/liga-equipe-tela.mjs');
    ok(/\/api\/equipe\/ranking/.test(tela) && !/\/api\/liga\//.test(tela), 'a Liga de times lê a tabela da previsão');
    ok(!/liga_mmr/.test(fonte('../server/liga.mjs')), 'a previsão lê o Liga MMR');
  });

  s.teste('pela porta: a de agora, a fechada, a inválida e a que não existe', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T1 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'RkPorta', email: 'rkporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H = { [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${cad.sessao}` };
      const agora = await fetch(url('/api/equipe/ranking'), { headers: H });
      igual(`${agora.status}|${(await agora.json()).atual}`, '200|true', 'a de agora pela porta');
      igual((await fetch(url('/api/equipe/ranking?temporada=abc'), { headers: H })).status, 400, 'a temporada inválida');
      igual((await fetch(url('/api/equipe/ranking?temporada=7'), { headers: H })).status, 404, 'a que não existe');
      igual((await fetch(url('/api/equipe/ranking'), { headers: { [CABECALHO_VERSAO]: API_VERSAO } })).status, 401, 'o ranking sem sessão');
    } finally { await srv.fechar(); }
  });

  return s;
}
