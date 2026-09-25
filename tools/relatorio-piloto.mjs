/* O RELATÓRIO DO PILOTO, IMPRESSO (ST-7.2c).
 *
 *   node tools/relatorio-piloto.mjs [banco] [--dias=14] [--agora=<ms>]
 *
 * `banco` é `dados/pokearena.db` quando omitido. Lê só — abre o banco em modo
 * leitura, e pode rodar com o servidor ligado. A conta mora em
 * `server/piloto.mjs`; aqui só se formata, e a referência da ST-3.3 vem da
 * fixture de medição (`test/fixtures/emissao-idle.json`). */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { relatorioDoPiloto } from '../server/piloto.mjs';

const args = process.argv.slice(2);
const opc = n => args.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
const banco = args.find(a => !a.startsWith('--')) ?? 'dados/pokearena.db';
if (!existsSync(banco)) { console.log(`não existe: ${banco}`); process.exit(1); }

const referencia = JSON.parse(readFileSync(new URL('../test/fixtures/emissao-idle.json', import.meta.url), 'utf8'));
const db = new DatabaseSync(banco, { readOnly: true });
const r = relatorioDoPiloto(db, { agora: Number(opc('agora')) || Date.now(), dias: Number(opc('dias')) || 14, referencia });
db.close();

const n = x => (x === null || x === undefined ? '—' : Number.isInteger(x) ? x.toLocaleString('pt-BR') : x.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
const linha = (...c) => console.log('  ' + c.join('  '));
const secao = t => console.log(`\n${t}\n${'─'.repeat(t.length)}`);

console.log(`PILOTO · ${r.periodo.de} a ${r.periodo.ate} (${r.periodo.dias} dias)`);

secao('CONTAS');
linha(`total ${n(r.contas.total)}`, `ativas ${n(r.contas.ativas)}`, `congeladas ${n(r.contas.congeladas)}`,
      `novas no período ${n(r.contas.novasNoPeriodo)}`);

secao('RETENÇÃO (coorte = dia do cadastro)');
for (const c of r.retencao) linha(c.data, `cadastros ${n(c.n)}`, `voltaram no D1 ${c.d1 ?? 'ainda não'}`, `no D7 ${c.d7 ?? 'ainda não'}`);
if (!r.retencao.length) linha('(nenhum cadastro no período)');

secao('ATIVOS POR DIA');
for (const d of r.ativosPorDia) linha(d.data, '█'.repeat(d.jogadores) || '·', n(d.jogadores));

secao('IDLE — cada jogador-dia ao lado do perfil da ST-3.3');
linha(`jogador-dias ${n(r.idle.jogadorDias)}`, `expedições colhidas ${n(r.idle.expedicoes)}`,
      `casual ${n(r.idle.perfis.casual)} · diário ${n(r.idle.perfis.diario)} · maratona ${n(r.idle.perfis.maratona)}`);
for (const [p, c] of Object.entries(r.idle.contraReferencia))
  linha(p.padEnd(9), `runs/dia ${n(c.medido.runsPorDia)}`,
        `moedas/dia ${n(c.medido.moedasPorDia)} (ref ${n(c.referencia?.moedasPorDia)}, razão ${n(c.razao?.moedas)})`,
        `encontros/dia ${n(c.medido.encontrosPorDia)} (ref ${n(c.referencia?.encontrosPorDia)}, razão ${n(c.razao?.encontros)})`);

secao('SALDOS (agora, por balde)');
for (const [b, q] of Object.entries(r.saldos))
  linha(b.padEnd(12), `contas ${n(q.contas)}`, `mediana ${n(q.mediana)}`, `p90 ${n(q.p90)}`, `máx ${n(q.maximo)}`, `total ${n(q.total)}`);

secao('ARENA E BOUTIQUE');
linha(`apostas ${n(r.arena.apostas)} de ${n(r.arena.apostadores)} jogador(es)`, `apostado ${n(r.arena.apostado)}`,
      `compras ${n(r.arena.compras)}`, `gasto ${n(r.arena.gasto)}`);
