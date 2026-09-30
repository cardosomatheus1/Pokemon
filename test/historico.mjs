/* Q1/Q3 · O HISTÓRICO DAS EXPEDIÇÕES E DAS RUNS (1.28 · L-141 · L-109)
 *
 * Uma linha por colheita, no mesmo formato para os dois modos, montada do que
 * a colheita já devolveu. Com conta, o servidor a monta da resposta GRAVADA e
 * a manda no `GET /api/idle`; sem conta, o aparelho guarda a sua. O disco é
 * lido com desconfiança, e a tela só pinta o cartão que a camada 0 decidiu.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { colher } from '../app/modules/idle-colheita.mjs';
import { inicialNa, expedicaoNa, colherNa, comecarNa, recuarNa, colherRunNa } from '../app/modules/idle-acoes.mjs';
import { idleDaConta } from '../app/modules/idle-conta.mjs';
import { idDoMaterial } from '../engine/economia-idle.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import {
  HISTORICO_MAX, TREINADORES_PROVISORIOS, nomeDoTreinador, linhaDaExpedicao, linhaDaRun, noHistorico,
  historicoDoDisco, textoDaDuracao, textoDeQuando, cartaoDoHistorico, resumoDoHistorico,
} from '../app/modules/historico-dados.mjs';

const T0 = Date.UTC(2026, 9, 1, 12), H = 3600e3, MIN = 60e3;
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const armazemFalso = () => {
  const dados = new Map();
  return { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), clear: () => dados.clear() };
};

/* Uma resposta de colheita escrita à mão, no formato de `engine/colheita`. */
const RESPOSTA = {
  expedicao: 'x-1', semente: '777', encontros: [{ dex: 16, raridade: 'comum' }, { dex: 19, raridade: 'comum' }],
  itens: [{ id: 'poke', classe: 'bola', quantidade: 2 }, { classe: 'essencia', quantidade: 3 }, { id: 'poke', classe: 'bola', quantidade: 1 }],
  moedas: 40, xp: 120,
  npc: { quantas: 2, vitorias: 1, xpExtra: 30, material: 4, lista: [{ venceu: true, nivelNpc: 9 }, { venceu: false, nivelNpc: 14 }] },
};
const EXPEDICAO = { id: 'x-1', bioma: 'floresta', perfil: 'trilha', estagio: 2, equipe: ['a', 'b', 'sumiu'], iniciadaEm: T0, terminaEm: T0 + 3 * H, colhidaEm: T0 + 5 * H };
const DEX = { a: 4, b: 7 };

export async function suite() {
  const s = criarSuite('historico');

  s.teste('camada 0: a linha da expedição tem quem foi, o que apareceu, os itens com quantia e o VS', () => {
    const l = linhaDaExpedicao(EXPEDICAO, RESPOSTA, { pack: PACK, dexDe: id => DEX[id] });
    igual(`${l.tipo}|${l.id}|${l.bioma}|${l.estagio}|${l.perfil}`, 'expedicao|x-1|floresta|2|trilha', 'o cabeçalho da linha');
    igual(l.equipe.join(','), '4,7', 'a equipe pela espécie (quem foi solta sai, a linha fica)');
    igual(l.encontros.join(','), '16,19', 'as espécies que apareceram');
    igual(JSON.stringify(l.itens), JSON.stringify([{ id: 'poke', n: 3 }, { id: idDoMaterial(PACK), n: 3 }]), 'os itens agrupados, com a essência como o material do pack');
    igual(`${l.xp}|${l.moedas}|${l.material}|${l.fim - l.inicio}|${l.colhidaEm}`, `120|40|4|${3 * H}|${T0 + 5 * H}`, 'XP, moeda, material da batalha e tempo');
    igual(l.lutas.map(b => `${b.nivel}:${b.venceu}`).join(','), '9:true,14:false', 'o VS: o nível de cada treinador e quem venceu');
    ok(l.lutas.every(b => TREINADORES_PROVISORIOS.includes(b.nome)), 'o treinador sem nome da tabela provisória');
  });

  s.teste('camada 0: o nome do treinador é da semente e da posição, e é o mesmo em toda leitura', () => {
    igual(nomeDoTreinador('777', 0), nomeDoTreinador('777', 0), 'o mesmo treinador muda de nome entre leituras');
    const nomes = new Set(Array.from({ length: 40 }, (_, i) => nomeDoTreinador('s' + i, 0)));
    ok(nomes.size >= 5, `a tabela provisória não se distribui: ${nomes.size} nomes em 40 sementes`);
    ok(/PROVIS[ÓO]RI/.test(fonte('app/modules/historico-dados.mjs')), 'a tabela de nomes não se declara provisória (L-109)');
  });

  s.teste('camada 0: a linha da run deriva quem apareceu da própria run, e diz como ela acabou', () => {
    const run = {
      raiz: '99', bioma: 'praia', estagio: 3, equipe: ['a'], iniciadaEm: T0, colhidaEm: T0 + 50 * MIN, wave: 6,
      fim: { em: T0 + 40 * MIN, completou: false, motivo: 'hp' },
      abates: [{ dex: 72, quantos: 2 }, { dex: 90, quantos: 1 }],
      rendeu: { xp: 300, moedas: 55, itens: [{ id: 'ultra', quantidade: 1 }], clima: { nome: 'Chuva' } },
    };
    const l = linhaDaRun(run, { pack: PACK, dexDe: id => DEX[id] });
    igual(`${l.tipo}|${l.id}|${l.bioma}|${l.estagio}|${l.equipe}`, 'run|99|praia|3|4', 'o cabeçalho da run');
    igual(`${l.xp}|${l.moedas}|${JSON.stringify(l.itens)}|${l.fim - l.inicio}`, `300|55|[{"id":"ultra","n":1}]|${40 * MIN}`, 'o que a run pagou e quanto durou até o fim (não até a colheita)');
    igual(`${l.waves}|${l.abates}|${l.desfecho}|${l.clima}`, '6|3|hp|Chuva', 'a wave alcançada, os abates, o desfecho e o clima');
    igual(l.encontros.join(','), '72,90', 'as espécies que apareceram na run (distintas, pela conta da colheita)');
    igual(linhaDaRun({ ...run, semEncontros: true }, { pack: PACK }).encontros.length, 0, 'a run sem encontros (teto esgotado) mostra encontros');
  });

  s.teste('camada 0: a lista — a nova no topo, a mesma colheita uma vez só, e o teto de linhas', () => {
    let lista = [];
    for (let i = 0; i < HISTORICO_MAX + 5; i++) lista = noHistorico(lista, { tipo: 'expedicao', id: 'e' + i, colhidaEm: T0 + i * H });
    igual(`${lista.length}|${lista[0].id}|${lista.at(-1).id}`, `${HISTORICO_MAX}|e${HISTORICO_MAX + 4}|e5`, 'a lista não ficou nas últimas, da mais nova para a mais velha');
    lista = noHistorico(lista, { tipo: 'expedicao', id: 'e24', colhidaEm: T0 + 24 * H });
    igual(lista.filter(l => l.id === 'e24').length, 1, 'a resposta repetida da rota entrou duas vezes');
    igual(noHistorico([{ tipo: 'run', id: '1', colhidaEm: 1 }], { tipo: 'expedicao', id: '1', colhidaEm: 2 }).length, 2, 'uma run e uma expedição com o mesmo id se engolem');
  });

  s.teste('camada 0: o disco torto não quebra a aba e não entra como está', () => {
    const boa = linhaDaExpedicao(EXPEDICAO, RESPOSTA, { pack: PACK, dexDe: id => DEX[id] });
    const cru = [boa, null, 'x', { tipo: 'hack', id: 'z' }, { tipo: 'run', id: 'r', xp: -50, moedas: 'muito', itens: [{ id: 'poke', n: -3 }, { id: 'ultra', n: 2 }], lutas: [{ nome: 5, venceu: 'sim' }], colhidaEm: T0 }];
    const h = historicoDoDisco(cru);
    igual(h.map(l => l.tipo).join(','), 'expedicao,run', 'linha inválida entrou (ou a válida saiu)');
    const r = h.find(l => l.tipo === 'run');
    igual(`${r.xp}|${r.moedas}|${JSON.stringify(r.itens)}|${r.lutas[0].nome}|${r.lutas[0].venceu}`, '0|0|[{"id":"ultra","n":2}]|Treinador|false', 'número negativo, texto no lugar de número ou item de quantia negativa passaram');
    igual(historicoDoDisco(Array.from({ length: 60 }, (_, i) => ({ tipo: 'run', id: 'r' + i, colhidaEm: i }))).length, HISTORICO_MAX, 'o disco com mais linhas que o teto passa inteiro');
    igual(JSON.stringify(historicoDoDisco({ nao: 'lista' })), '[]', 'um histórico que não é lista quebra a leitura');
  });

  s.teste('camada 0: o cartão — tempo, quando, modo, os números, o material da batalha e o VS', () => {
    igual([45 * MIN, 3 * H, 3 * H + 5 * MIN, 0].map(textoDaDuracao).join('|'), '45 min|3 h|3 h 05 min|0 min', 'a duração');
    igual([T0, T0 - 5 * MIN, T0 - 3 * H, T0 - 30 * H, T0 - 80 * H].map(em => textoDeQuando(em, T0)).join('|'), 'agora|há 5 min|há 3 h|ontem|há 3 dias', 'quando voltou');
    const l = linhaDaExpedicao(EXPEDICAO, RESPOSTA, { pack: PACK, dexDe: id => DEX[id] });
    const c = cartaoDoHistorico(l, { agora: T0 + 6 * H, nomeDoBioma: id => id.toUpperCase(), rotuloDoPerfil: p => PERFIS[p].rotulo, material: 'MAT' });
    igual(`${c.titulo}|${c.modo}|${c.quando}|${c.duracao}`, 'FLORESTA · estágio 2|Rota OFF · Trilha|há 1 h|3 h', 'o cabeçalho do cartão');
    igual(`${c.xp}|${c.moedas}|${c.encontros}|${c.lutas}`, '120|40|2|2 treinadores · 1 vitória', 'os números do cartão');
    igual(JSON.stringify(c.itens.at(-1)), JSON.stringify({ id: 'MAT', n: 4, daBatalha: 4 }), 'o material das batalhas não aparece como item');
    const soma = cartaoDoHistorico(l, { agora: T0, material: idDoMaterial(PACK) }).itens.filter(i => i.id === idDoMaterial(PACK));
    igual(JSON.stringify(soma), JSON.stringify([{ id: idDoMaterial(PACK), n: 7, daBatalha: 4 }]), 'o material das batalhas em chip separado do mesmo item');
    igual(c.vs.map(b => `${b.nivel}:${b.resultado}`).join(','), 'nv 9:vitória,nv 14:derrota', 'o VS do cartão');
    const run = cartaoDoHistorico({ ...l, tipo: 'run', lutas: [], material: 0, waves: 10, abates: 1, desfecho: 'limpou', clima: null }, { agora: T0 + 6 * H });
    igual(`${run.modo}|${run.detalheRun}|${run.lutas}`, 'Avanço|wave 10 · 1 abate · limpou as 10 waves|null', 'o cartão da run');
    const r = resumoDoHistorico([l, { ...l, id: 'x-2', xp: 10, moedas: 1, encontros: [], lutas: [] }]);
    igual(`${r.voltas}|${r.xp}|${r.moedas}|${r.encontros}|${r.vitorias}/${r.lutas}`, '2|130|41|2|1/2', 'o somatório do quadro');
  });

  s.teste('sem conta: a colheita guarda a linha, e ela volta do disco', () => {
    const deposito = armazemFalso();
    const E = D.carregar(deposito);
    igual(JSON.stringify(E.historico), '[]', 'o save novo sem histórico vazio');
    const c = D.escolherInicial(E, PACK, PACK.iniciais[0], T0);
    const x = D.iniciarExpedicao(E, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.id], agora: T0 });
    const r = colher(E, { pack: PACK, id: x.id, agora: T0 + 2 * H, raiz: 12345, bonus: null });
    igual(`${E.historico.length}|${E.historico[0].id}|${E.historico[0].equipe}`, `1|${x.id}|${c.dex}`, 'a colheita do aparelho não entrou no histórico');
    igual(`${E.historico[0].xp}|${E.historico[0].moedas}|${E.historico[0].encontros.length}|${E.historico[0].lutas.length}`, `${r.xp}|${r.moedas}|${r.encontros.length}|${r.npc.quantas}`, 'a linha não é a colheita que a tela mostrou');
    ok(D.salvar(E, deposito), 'o save com histórico foi recusado');
    igual(JSON.stringify(D.carregar(deposito).historico), JSON.stringify(E.historico), 'o histórico não voltou do disco');
  });

  s.teste('sem conta: a run colhida entra no topo do histórico', async () => {
    const api = { temSessao: () => false };
    const deposito = armazemFalso(), E = D.carregar(deposito), o = { api, deposito };
    const ini = await inicialNa(E, PACK, PACK.iniciais[0], T0, o);
    await comecarNa(E, { pack: PACK, bioma: 'praia', estagio: 1, equipe: [ini.id], agora: T0 }, o);
    await recuarNa(E, T0 + 60e3, o);
    const run = colherRunNa(E, { pack: PACK, agora: T0 + 61e3 }, o);
    igual(`${E.historico.length}|${E.historico[0]?.tipo}|${E.historico[0]?.bioma}|${E.historico[0]?.desfecho}|${E.historico[0]?.xp}`,
      `1|run|praia|recuou|${run.rendeu.xp}`, 'a run colhida no aparelho não entrou no histórico');
  });

  s.teste('contra o servidor de verdade: a expedição e a run colhidas descem no histórico da conta', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const deposito = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: deposito });
      const o = { api, deposito, conta: true };
      await api.post('/api/auth/cadastrar', { username: 'Hist1', email: 'hist1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const E = D.carregar(deposito);
      const ini = await inicialNa(E, PACK, PACK.iniciais[0], t, o);
      igual(E.historico.length, 0, 'a conta nova começou com histórico');

      const x = await expedicaoNa(E, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [ini.id], agora: t }, o);
      t += 2 * H;
      const col = await colherNa(E, { pack: PACK, id: x.id, agora: t }, o);
      const l = E.historico[0];
      igual(`${E.historico.length}|${l?.tipo}|${l?.id}|${l?.equipe}`, `1|expedicao|${x.id}|${ini.dex}`, 'a expedição colhida não desceu no histórico');
      igual(`${l.xp}|${l.moedas}|${l.encontros.join(',')}|${l.lutas.length}|${l.fim - l.inicio}`,
        `${col.xp}|${col.moedas}|${col.encontros.map(e => e.dex).join(',')}|${col.npc.quantas}|${PERFIS.batida.minutos * MIN}`, 'a linha da conta não é a colheita que ela devolveu');

      await comecarNa(E, { pack: PACK, bioma: 'praia', estagio: 1, equipe: [ini.id], agora: t }, o);
      t += 1000;
      await recuarNa(E, t, o);
      t += 1000;
      const run = await colherRunNa(E, { pack: PACK, agora: t }, o);
      igual(`${E.historico.length}|${E.historico[0].tipo}|${E.historico[0].bioma}|${E.historico[0].desfecho}|${E.historico[1].tipo}`, '2|run|praia|recuou|expedicao', 'a run colhida não desceu no topo do histórico');
      igual(`${E.historico[0].xp}|${E.historico[0].moedas}`, `${run.rendeu.xp}|${run.rendeu.moedas}`, 'a linha da run não é o que ela rendeu');

      /* A resposta velha e torta não derruba a leitura: a linha fica de fora. */
      srv.db.prepare(`UPDATE expedicoes SET resultado_json = '{torto' WHERE id = ?`).run(x.id);
      const g = await api.get('/api/idle');
      igual(`${g.ok}|${g.corpo?.historico?.length}`, 'true|1', 'uma resposta gravada torta derrubou o GET /api/idle (ou entrou)');
    } finally { await srv.fechar(); }
  });

  s.teste('a conta manda o histórico já saneado, e a tela pinta as duas abas', () => {
    const e = idleDaConta(D.VAZIO(), { agora: T0, pack: 'kanto', historico: [{ tipo: 'run', id: 'r', xp: -1, colhidaEm: T0 }, { tipo: 'nada' }] });
    igual(`${e.historico.length}|${e.historico[0].xp}`, '1|0', 'o histórico da conta entrou sem passar pelo saneamento');
    const t = fonte('app/modules/historico-tela.mjs');
    ok(/nosDois\('Historico'\)/.test(t) && /cartaoDoHistorico\(/.test(t), 'a tela não pinta o cartão da camada 0 nas duas abas');
    const html = fonte('app/index.html');
    ok(html.includes('id="idleHistorico"') && html.includes('id="offHistorico"'), 'o quadro não está nas duas abas');
    ok(/pintarHistorico\(E, agora\(\)\)/.test(fonte('app/modules/idle-tela.mjs')), 'a aba não pinta o histórico');
  });

  return s;
}
