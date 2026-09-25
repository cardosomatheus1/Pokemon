/* Q1/Q9 · O RELATÓRIO DO PILOTO (ST-7.2c, PILOTO-01).
 *
 * O piloto é 5–10 amigos por 14 dias, e o aceite é "problemas priorizados por
 * evidência; saldos e emissão medidos contra a ST-3.3". Evidência que ninguém
 * consegue ler não prioriza nada: este arquivo trava o relatório que o dono
 * roda com UM comando, sobre o banco do piloto.
 *
 *   quem voltou         retenção D1/D7 por coorte (a mesma do painel)
 *   quem jogou quando   ativos por dia, no dia de Brasília
 *   quanto o idle pagou runs, encontros e moedas por jogador-dia — e cada
 *                       jogador-dia é posto ao lado do perfil da ST-3.3 que ele
 *                       mais parece (casual 2 runs, diário 8, maratona 48)
 *   quanto há na mão    saldos por balde: mediana, p90, máximo
 *   o que se fez com    apostas e compras, anotadas pelo servidor
 *
 * O dia do fato é o do FATO: a run relatada no login do dia seguinte conta no
 * dia em que foi colhida, e não no dia em que o servidor ouviu falar dela.
 */
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { anotar, receberDoCliente } from '../server/telemetria.mjs';
import { relatorioDoPiloto, perfilMaisProximo } from '../server/piloto.mjs';
import { eventosDoEstado } from '../app/modules/telemetria-servidor.mjs';

const DIA = 86400e3;
const T0 = Date.UTC(2026, 8, 1, 15);   // meio-dia de Brasília
const REF = JSON.parse(readFileSync(new URL('./fixtures/emissao-idle.json', import.meta.url), 'utf8'));

function montar(caminho = ':memory:') {
  const db = abrirBanco(caminho); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1',
                                      nascimento: '1990-01-01', agora: T0 }).id;
  const [a, b, c] = ['casual', 'diario', 'maratona'].map(conta);
  for (const u of [a, b, c])
    creditar(db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: 'w' + u, agora: T0 });
  creditar(db, { userId: c, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: 500, idem: 'b' + c, agora: T0 });
  /* Dois dias de runs: a quantidade de cada perfil da ST-3.3. */
  const runs = (u, n, dia) => Array.from({ length: n }, (_, i) => ({
    nome: 'run_harvested', chave: `run:${T0 + dia * DIA + i * 1000}`,
    campos: { em: T0 + dia * DIA + i * 1000, encontros: 2, moedas: 100, estagio: 1, bioma: 'floresta' } }));
  for (const dia of [0, 1]) {
    receberDoCliente(db, { userId: a, agora: T0 + dia * DIA, eventos: runs(a, 2, dia) });
    receberDoCliente(db, { userId: b, agora: T0 + dia * DIA, eventos: runs(b, 8, dia) });
    for (let k = 0; k < 48; k += 40)
      receberDoCliente(db, { userId: c, agora: T0 + dia * DIA, eventos: runs(c, 48, dia).slice(k, k + 40) });
  }
  /* A run do dia 1 do casual relatada só no dia 3: conta no dia 1. */
  receberDoCliente(db, { userId: a, agora: T0 + 3 * DIA, eventos: [{ nome: 'session_started', chave: 'dia:3', campos: {} }] });
  anotar(db, { nome: 'bet_placed', userId: b, chave: 't1', agora: T0, campos: { valor: 50, slot: 1 } });
  anotar(db, { nome: 'bet_placed', userId: b, chave: 't2', agora: T0 + DIA, campos: { valor: 30, slot: 2 } });
  anotar(db, { nome: 'cosmetic_purchased', userId: c, chave: 'k', agora: T0, campos: { familia: 'moldura', id: 'x', preco: 400 } });
  /* E um evento de ANTES do período, que não entra. */
  anotar(db, { nome: 'bet_placed', userId: b, chave: 'velho', agora: T0 - 40 * DIA, campos: { valor: 999 } });
  return { db, a, b, c };
}

export function suite() {
  const s = criarSuite('piloto');

  s.teste('contas, ativos por dia e eventos do período', () => {
    const { db } = montar();
    const r = relatorioDoPiloto(db, { agora: T0 + 4 * DIA, dias: 14, referencia: REF });
    igual(r.contas.total, 3, 'contas');
    const d0 = r.ativosPorDia.find(d => d.data === '2026-09-01');
    igual(d0?.jogadores, 3, `ativos no primeiro dia: ${JSON.stringify(r.ativosPorDia)}`);
    igual(r.eventos.bet_placed, 2, 'a aposta de antes do período entrou');
    igual(r.arena.apostas, 2); igual(r.arena.apostado, 80, 'o total apostado');
    igual(r.arena.compras, 1); igual(r.arena.gasto, 400, 'o total gasto na boutique');
    ok(Array.isArray(r.retencao) && r.retencao[0]?.n === 3, 'a retenção não veio');
    igual(r.retencao[0].data, '2026-09-01', 'a coorte sai como número de dia, que ninguém lê');
  });

  s.teste('cada jogador-dia do idle é posto ao lado do perfil da ST-3.3', () => {
    const { db } = montar();
    const r = relatorioDoPiloto(db, { agora: T0 + 4 * DIA, dias: 14, referencia: REF });
    igual(r.idle.jogadorDias, 6, `jogador-dias: ${r.idle.jogadorDias}`);
    igual(JSON.stringify(r.idle.perfis), JSON.stringify({ casual: 2, diario: 2, maratona: 2 }),
      `a classificação errou: ${JSON.stringify(r.idle.perfis)}`);
    const casual = r.idle.contraReferencia.casual;
    igual(casual.medido.moedasPorDia, 200, 'moedas por dia do casual');
    igual(casual.referencia.moedasPorDia, REF.perfis.casual.estagio1.porDia.pokecoin, 'a referência não é a da ST-3.3');
    ok(Math.abs(casual.razao.moedas - 200 / REF.perfis.casual.estagio1.porDia.pokecoin) < 1e-9, 'a razão está errada');
  });

  s.teste('o perfil mais próximo é medido em escala log', () => {
    /* 26 runs: linear diria diário (18 de 8, 22 de 48); em razão, 26 está
       mais perto de 48 (1,8×) do que de 8 (3,25×). E 5 está mais perto de 8. */
    igual(perfilMaisProximo(26), 'maratona', '26 runs caiu no diário — a distância é linear');
    igual(perfilMaisProximo(5), 'diario', '5 runs caiu no casual');
    igual(perfilMaisProximo(2), 'casual'); igual(perfilMaisProximo(48), 'maratona');
  });

  s.teste('o dia do fato é o da colheita, não o do relato', () => {
    const { db, a } = montar();
    receberDoCliente(db, { userId: a, agora: T0 + 3 * DIA, eventos: [{ nome: 'run_harvested', chave: `run:${T0 + DIA + 5e5}`,
      campos: { em: T0 + DIA + 5e5, encontros: 2, moedas: 100 } }] });
    const r = relatorioDoPiloto(db, { agora: T0 + 4 * DIA, dias: 14, referencia: REF });
    const d3 = r.ativosPorDia.find(d => d.data === '2026-09-04');
    igual(d3?.jogadores ?? 0, 1, 'o dia 3 tem só a sessão do casual');
    igual(r.idle.jogadorDias, 6, 'a run relatada tarde abriu um jogador-dia novo no dia do relato');
    /* O instante vem do CLIENTE: um `em` no futuro do relato não pode mover o
       fato para um dia que ainda não aconteceu. */
    receberDoCliente(db, { userId: a, agora: T0 + DIA + 6e5, eventos: [{ nome: 'run_harvested', chave: 'run:futuro',
      campos: { em: T0 + 2 * DIA, encontros: 1, moedas: 1 } }] });
    const r2 = relatorioDoPiloto(db, { agora: T0 + 4 * DIA, dias: 14, referencia: REF });
    igual(r2.idle.jogadorDias, 6, 'um `em` do futuro abriu um jogador-dia no dia seguinte ao relato');
  });

  s.teste('saldos por balde: mediana, p90 e máximo', () => {
    const { db } = montar();
    const r = relatorioDoPiloto(db, { agora: T0 + 4 * DIA, dias: 14, referencia: REF });
    const t = r.saldos.transferivel;
    igual(t.contas, 3); igual(t.mediana, 1000); igual(t.maximo, 1000);
    igual(r.saldos.bonus.maximo, 500, 'o bônus do maratona sumiu');
  });

  s.teste('o cliente relata moedas, encontros e o instante de cada run', () => {
    const e = { avancos: [{ colhidaEm: T0 - 1000, encontros: 3, moedas: 120, xp: 40, bioma: 'praia', estagio: 2 }], expedicoes: [] };
    const [ev] = eventosDoEstado(e, T0);
    igual(ev.campos.moedas, 120, 'a run não relata as moedas');
    igual(ev.campos.em, T0 - 1000, 'a run não relata quando foi colhida');
    const teto = readFileSync(new URL('../app/modules/idle-dados.mjs', import.meta.url), 'utf8');
    ok(/moedas: run\.rendeu\?\.moedas/.test(teto), 'o lançamento do teto não guarda as moedas da run');
  });

  s.teste('a ferramenta imprime o relatório de um banco em disco', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pa-piloto-'));
    const { db } = montar(join(dir, 'p.db')); db.close();
    const ferramenta = new URL('../tools/relatorio-piloto.mjs', import.meta.url).pathname;
    const saida = execFileSync(process.execPath, ['--no-warnings', ferramenta, join(dir, 'p.db'), '--dias=14', `--agora=${T0 + 4 * DIA}`], { encoding: 'utf8' });
    for (const secao of ['CONTAS', 'RETENÇÃO', 'ATIVOS POR DIA', 'IDLE', 'SALDOS', 'ARENA'])
      ok(saida.includes(secao), `o relatório não tem a seção ${secao}`);
  });

  return s;
}
