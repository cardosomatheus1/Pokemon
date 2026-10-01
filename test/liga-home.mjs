/* Q1/Q6 · A LEAGUE HOME (ST-11.6a · Spec §12 telas 25–26, §9.5, §9.7, §9.15)
 *
 * O que a tela diz é da camada 0 (`homeDaLiga`), e é aqui que se cobra:
 *
 *   cada ESTADO com a sua ação — sem conta, sem rede, em manutenção, sem time
 *     na conta, a publicar, desatualizado, pronto
 *   o TIER, nunca o número (§9.7) — nem na tela, nem na resposta
 *   o BOT com o rótulo, sempre (§9.5)
 *   a partida fora do ranking DIZ que ficou fora
 *
 * E no servidor: a leitura inteira numa chamada, as partidas do MEU lado
 * (desafiante ou defensor), e publicar congela o time da CONTA.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarPartida } from '../server/partida.mjs';
import { ligaDaConta, publicarTime, minhasPartidas } from '../server/liga-equipe.mjs';
import { criarOperador } from '../server/admin.mjs';
import { mudarBandeira } from '../server/feature-flags.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { homeDaLiga, barraDaTemporada, linhaDaPartida, haQuanto, escadaDoTier, PASSOS, ROTULO_BOT } from '../app/modules/liga-equipe-dados.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const DIA = 86_400_000, H = 3_600_000;
const T0 = Date.UTC(2026, 9, 8, 12);                  // temporada 1, dia 11 (competição)
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('Home0'), conta('Home1')];
  const cria = (dono, dex, nivel, caixa = false) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = ? WHERE id = ?`).run(xpParaNivel(nivel), caixa ? 1 : 0, c.id);
    return c.id;
  };
  return { db, u, v, cria };
}
const dadosBase = (x = {}) => ({ ligada: true, temporada: temporadaDe(T0), tier: 'Silver', partidas: 3, equipe: [{ id: 'c1', dex: 4, nivel: 10 }], meuTime: null, recentes: [], ...x });

export async function suite() {
  const s = criarSuite('liga-home');

  s.teste('a barra da temporada: três fases que somam 28 dias, a de hoje acesa, e o que falta', () => {
    const b = barraDaTemporada(temporadaDe(T0), T0);
    igual(`${b.titulo}|${b.fase}|${b.dia}`, 'Temporada 1|Competição|dia 11 de 28', 'o topo da barra');
    igual(b.fatias.map(f => `${f.id}:${f.largura}${f.atual ? '*' : ''}`).join(), 'colocacao:25,competicao:50*,fechamento:25', 'as fatias');
    igual(b.hoje, 37.5, 'o hoje fora do lugar');
    igual(b.resta, 'termina em 18 dias', 'o que falta');
    igual(barraDaTemporada(temporadaDe(T0), temporadaDe(T0).fim - H).resta, 'termina hoje', 'o último dia');
  });

  s.teste('cada estado com a sua ação: sem conta, sem rede, manutenção, sem time, publicar, desatualizado, pronto', () => {
    const h = x => homeDaLiga({ conta: true, pack: PACK, agora: T0, ...x });
    igual(homeDaLiga({ conta: false, pack: PACK, agora: T0 }).acao.tipo, 'entrar', 'sem conta não pede para entrar');
    igual(h({ dados: null }).estado, 'sem-rede', 'sem rede');
    const off = h({ dados: dadosBase({ ligada: false }) });
    igual(`${off.estado}|${off.acao.habilitada}`, 'desligada|false', 'a Liga em manutenção deixa buscar');
    const vazio = h({ dados: dadosBase({ equipe: [] }) });
    igual(`${vazio.estado}|${vazio.acao}|${vazio.passos}|${vazio.semHistorico}|${vazio.titulo}`, 'sem-equipe|null|null|false|Ainda não dá para jogar a Liga', 'o time vazio promete o que não pode');
    ok(/não tem time na sua conta/.test(vazio.aviso) && /inicial/.test(vazio.aviso) && /farm/.test(vazio.aviso), 'o time vazio não diz por que está vazio, nem por onde sair');
    ok(!/próxima versão|aparelho/.test(vazio.aviso), 'o aviso promete trazer as do aparelho — a DEC-17 decidiu que não (L-211)');
    igual(h({ dados: dadosBase() }).acao.tipo, 'publicar', 'sem time publicado não pede para publicar');
    const snap = (x = {}) => ({ id: 's1', preset: 'aggressive', power: 321, time: [{ id: 'c1', dex: 4, nivel: 10 }], versaoMotor: 'x', versaoConteudo: 'y', ...x });
    igual(h({ dados: dadosBase({ meuTime: snap() }) }).estado, 'desatualizado', 'o time de regras velhas foi para a fila');
  });

  s.teste('pronto: buscar, publicar de novo, e o aviso quando o time da conta mudou', async () => {
    const { VERSAO_TBE } = await import('../engine/treino-batalha.mjs');
    const { conteudoDaLuta } = await import('../app/modules/snapshot-dados.mjs');
    const snap = { id: 's1', preset: 'aggressive', power: 321, time: [{ id: 'c1', dex: 4, nivel: 10 }], versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(PACK) };
    const h = homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase({ meuTime: snap }) });
    igual(`${h.estado}|${h.acao.tipo}|${h.secundaria?.tipo}|${h.aviso}`, 'pronto|buscar|publicar|null', 'o pronto');
    igual(`${h.time.preset}|${h.time.power}|${h.time.membros.length}`, 'Agressivo|321|1', 'o time publicado');
    const mudou = homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase({ meuTime: snap, equipe: [{ id: 'c2', dex: 7, nivel: 9 }] }) });
    ok(/mudou/.test(mudou.aviso ?? ''), 'o time que mudou não avisa que a Liga luta com o publicado');
  });

  s.teste('o tier, nunca o número; o bot sempre rotulado; o fora do ranking diz que ficou fora', () => {
    const h = homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase({ partidas: 1 }) });
    igual(`${h.tier.nome}|${h.tier.nota}`, 'Silver|1 partida no ranking', 'o tier');
    const bot = linhaDaPartida({ id: 'b', resultado: 'perdeu', rated: false, turnos: 9, contra: { tipo: 'bot', nome: 'Brock' } });
    igual(`${bot.titulo}|${bot.contra}|${bot.bot}|${bot.ranking}`, `Derrota|contra Brock|${ROTULO_BOT}|não conta no ranking — é bot`, 'a linha do bot');
    const fora = linhaDaPartida({ id: 'f', resultado: 'venceu', rated: false, turnos: 7, contra: { tipo: 'jogador', nome: 'Ana' } });
    igual(`${fora.titulo}|${fora.bot}|${fora.ranking}`, 'Vitória|null|fora do ranking: padrão de partidas entre as mesmas contas', 'a linha fora do ranking');
    igual(linhaDaPartida({ id: 'c', resultado: 'empate', rated: true, turnos: 30, contra: { tipo: 'jogador', nome: 'Bia' } }).ranking, 'contou no ranking', 'a linha que contou');
    const conta = linhaDaPartida({ id: 'c', resultado: 'empate', rated: true, turnos: 30, contra: { tipo: 'jogador', nome: 'Bia' } });
    igual(JSON.stringify([bot.selo, fora.selo, conta.selo]), '[{"texto":"não contou · bot","tipo":"fora"},{"texto":"fora do ranking","tipo":"fora"},{"texto":"contou","tipo":"ok"}]', 'os selos');
    igual(`${bot.explica}|${fora.explica}|${conta.explica}`, 'ninguém da sua faixa na fila — por isso um bot|padrão de partidas entre as mesmas contas|null', 'a explicação da partida que não contou');
    const efeito = t => linhaDaPartida({ id: 'x', resultado: 'venceu', rated: true, turnos: 3, tier: t, contra: { tipo: 'jogador', nome: 'Z' } }).selo.texto.replace('contou · ', '');
    igual([{ antes: 'Bronze', depois: 'Silver' }, { antes: 'Gold', depois: 'Silver' }, { antes: 'Gold', depois: 'Gold' }].map(efeito).join('|'), 'subiu para Silver|desceu para Silver|tier mantido: Gold', 'o efeito no tier');
    const com = homeDaLiga({ conta: true, pack: PACK, agora: T0, acabou: 'b', dados: dadosBase({ recentes: [{ id: 'b', resultado: 'perdeu', rated: false, turnos: 9, contra: { tipo: 'bot', nome: 'Brock' } }] }) });
    igual(com.resultado?.bot, ROTULO_BOT, 'o resultado da busca perdeu o rótulo do bot');
  });

  s.teste('os detalhes da leitura: a escada, o "há quanto", a partida que acabou uma vez só, o preset do publicado', () => {
    igual(escadaDoTier('Gold').map(x => x.estado[0]).join(''), 'ppoffff', 'a escada do Gold');
    igual([0, H - 1, H, 23 * H, 24 * H, 49 * H].map(haQuanto).join('|'), 'agora há pouco|agora há pouco|há 1 h|há 23 h|há 1 dia|há 2 dias', 'o há quanto');
    const p = (id, q) => ({ id, resultado: 'venceu', rated: true, turnos: 5, quando: q, contra: { tipo: 'jogador', nome: 'Ana' } });
    const h = homeDaLiga({ conta: true, pack: PACK, agora: T0, acabou: 'n', dados: dadosBase({ recentes: [p('n', T0 - 1000), p('v', T0 - 3 * H)] }) });
    igual(`${h.resultado.id}|${h.recentes.map(r => r.id).join()}|${h.recentes[0].quando}`, 'n|v|há 3 h', 'a partida que acabou apareceu duas vezes');
    const so = homeDaLiga({ conta: true, pack: PACK, agora: T0, acabou: 'n', dados: dadosBase({ recentes: [p('n', T0)] }) });
    igual(`${so.semHistorico}|${homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase() }).semHistorico}`, 'false|true', 'o "nenhuma partida" embaixo de uma partida');
    const snap = { id: 's', preset: 'defensive', power: 1, time: [], versaoMotor: 'x', versaoConteudo: 'y' };
    igual(homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase({ meuTime: snap }) }).presets.find(x => x.on).id, 'defensive', 'sem escolha, o preset aceso não é o do publicado');
    igual(homeDaLiga({ conta: true, pack: PACK, agora: T0, preset: 'focus', dados: dadosBase({ meuTime: snap }) }).presets.find(x => x.on).id, 'focus', 'a escolha feita perdeu para o publicado');
    igual(['sem-conta', 'sem-equipe', 'publicar'].map(e => homeDaLiga({ conta: e !== 'sem-conta', pack: PACK, agora: T0, dados: dadosBase(e === 'sem-equipe' ? { equipe: [] } : {}) }).mostraPresets).join(), 'false,false,true', 'o preset aparece onde não há o que publicar');
    igual(`${homeDaLiga({ conta: false, pack: PACK, agora: T0 }).passos?.length}|${homeDaLiga({ conta: true, pack: PACK, agora: T0, dados: dadosBase({ meuTime: snap }) }).passos}`, `${PASSOS.length}|undefined`, 'os passos de quem não jogou');
  });

  s.teste('no servidor: uma leitura, as partidas do MEU lado, o bot pelo nome do treinador, e nenhum número', () => {
    const c = cena();
    const [a1, a2] = [c.cria(c.u, 6, 60), c.cria(c.u, 9, 60)];
    c.cria(c.u, 3, 60, true);                                    // na caixa: fora do time
    const v1 = c.cria(c.v, 10, 5);
    const forte = publicarTime(c.db, { userId: c.u, preset: 'aggressive', agora: T0 });
    /* Como CONJUNTO: duas criaturas no mesmo milissegundo saem na ordem do id, que é sorteado. */
    igual(forte.time.map(x => x.id).sort().join(), [a1, a2].sort().join(), 'publicar pegou a caixa ou largou o time');
    const fraco = publicarTime(c.db, { userId: c.v, preset: 'balanced', agora: T0 });
    igual(fraco.time.map(x => x.id).join(), v1, 'o time do outro');
    criarPartida(c.db, { userId: c.v, meu: fraco.id, adversario: forte.id, chaveIdem: 'home-000001', agora: T0 + H });
    const eu = ligaDaConta(c.db, { userId: c.u, agora: T0 + 2 * H }), ele = ligaDaConta(c.db, { userId: c.v, agora: T0 + 2 * H });
    igual(`${eu.recentes[0].resultado}|${eu.recentes[0].contra.nome}|${ele.recentes[0].resultado}|${ele.recentes[0].contra.nome}`, 'venceu|Home1|perdeu|Home0', 'o lado de cada um');
    igual(`${eu.tier}|${eu.partidas}|${eu.temporada.numero}|${eu.meuTime.id}|${eu.equipe.length}`, `Bronze|1|1|${forte.id}|2`, 'a leitura');
    igual(JSON.stringify([eu.recentes[0].tier, ele.recentes[0].tier]), '[{"antes":"Bronze","depois":"Bronze"},{"antes":"Bronze","depois":"Bronze"}]', 'o efeito no tier pelos nomes');
    ok(!/"rating"|"mmr"|"delta"|"antes_/i.test(JSON.stringify(eu)), 'o número do rating vazou na leitura');
    c.db.prepare(`INSERT INTO league_bot_matches (id, idem_key, bot_id, snap_b, user_b, raiz, sal, commit_hash, semente, versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
                  VALUES ('bm1', 'k-bot', 'bot:brock', ?, ?, 'r', 's', 'c', 1, 'x', 'y', 'B', 12, '[]', ?)`).run(fraco.id, c.v, T0 + 3 * H);
    const r = minhasPartidas(c.db, c.v);
    igual(r.map(x => `${x.contra.tipo}:${x.resultado}:${x.rated}`).join(), 'bot:venceu:false,jogador:perdeu:true', 'a mistura de gente e bot, da mais nova');
    ok(r[0].contra.nome && r[0].contra.nome !== 'bot:brock', `o bot saiu sem o nome do treinador: ${r[0].contra.nome}`);
  });

  s.teste('no servidor: o efeito no tier, do lado de cada um, quando a partida cruza a borda', () => {
    const c = cena();
    c.cria(c.u, 6, 60); c.cria(c.v, 10, 5);
    const forte = publicarTime(c.db, { userId: c.u, preset: 'balanced', agora: T0 });
    const fraco = publicarTime(c.db, { userId: c.v, preset: 'balanced', agora: T0 });
    /* O desafiante (B) começa no Silver, logo acima da borda, e perde. */
    c.db.prepare(`INSERT INTO liga_mmr (user_id, rating, partidas, atualizado_em) VALUES (?, 1105, 3, ?)`).run(c.v, T0);
    criarPartida(c.db, { userId: c.v, meu: fraco.id, adversario: forte.id, chaveIdem: 'home-borda-1', agora: T0 + H });
    const dele = minhasPartidas(c.db, c.v)[0], meu = minhasPartidas(c.db, c.u)[0];
    igual(`${dele.resultado}|${linhaDaPartida(dele).selo.texto}|${meu.resultado}|${linhaDaPartida(meu).selo.texto}`, 'perdeu|contou · desceu para Bronze|venceu|contou · tier mantido: Bronze', 'o efeito de cada lado');
  });

  s.teste('no servidor: a partida com sinal chega à tela como FORA do ranking', () => {
    const c = cena();
    c.cria(c.u, 6, 60); c.cria(c.v, 10, 5);
    const forte = publicarTime(c.db, { userId: c.u, preset: 'balanced', agora: T0 });
    const fraco = publicarTime(c.db, { userId: c.v, preset: 'balanced', agora: T0 });
    for (let k = 1; k <= 5; k++) criarPartida(c.db, { userId: c.v, meu: fraco.id, adversario: forte.id, chaveIdem: `home-sinal-${k}`, agora: T0 + (k - 1) * 7 * H });
    const r = minhasPartidas(c.db, c.u);
    igual(r.map(x => x.rated).join(), 'false,true,true,true,true', 'o quinto confronto não chegou fora do ranking');
    igual(linhaDaPartida(r[0]).ranking, 'fora do ranking: padrão de partidas entre as mesmas contas', 'a linha da partida fora');
  });

  s.teste('publicar: a Liga desligada recusa, e o time vazio também', () => {
    const c = cena();
    igual(recusa(() => publicarTime(c.db, { userId: c.u, preset: 'balanced', agora: T0 }))?.codigo, 'EQUIPE_TIME_INVALIDO', 'o time vazio publicou');
    c.cria(c.u, 4, 10);
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: T0 });
    mudarBandeira(c.db, { operadorId: dono.id, nome: 'league_enabled', ligada: false, motivo: 'manutenção', confirmado: true, agora: T0 });
    igual(recusa(() => publicarTime(c.db, { userId: c.u, preset: 'balanced', agora: T0 }))?.codigo, 'feature_desligada', 'publicou com a Liga desligada');
    igual(ligaDaConta(c.db, { userId: c.u, agora: T0 }).ligada, false, 'a leitura não diz que está desligada');
  });

  s.teste('a tela: a aba mora no Time, longe da Liga de previsão, e só pinta o que a camada 0 disse', () => {
    const html = fonte('../app/index.html'), tela = fonte('../app/modules/liga-equipe-tela.mjs');
    ok(/data-treino-aba="liga"/.test(html) && /id="ligaEqCorpo"/.test(html), 'a aba da Liga de times não está no Time');
    const liga = html.slice(html.indexOf('id="viewLiga"'), html.indexOf('id="viewLiga"') + 3000);
    ok(!/ligaEqCorpo|Liga de times/.test(liga), 'a Liga de times entrou na tela da previsão');
    ok(/homeDaLiga\(/.test(tela) && !/rating|Vitória|Derrota|ROTULO|não é um jogador/.test(tela), 'a tela decide texto que é da camada 0');
    ok(/chaveDaBusca \?\?=/.test(tela), 'a busca não guarda a chave para o reenvio');
  });

  s.teste('pela porta: ler, publicar e buscar — sozinho na fila, o bot rotulado', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Porta0', email: 'porta0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H2 = { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', authorization: `Bearer ${cad.sessao}` };
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Porta0'`).get().id;
      const c = gerar(srv.db, { userId: uid, pack: PACK, dex: 6, origem: 'captura' });
      srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(30), c.id);
      igual((await fetch(url('/api/equipe/liga'), { headers: { [CABECALHO_VERSAO]: API_VERSAO } })).status, 401, 'a leitura sem sessão');
      const pub = await fetch(url('/api/equipe/publicar'), { method: 'POST', headers: H2, body: JSON.stringify({ preset: 'focus' }) }).then(r => r.json());
      igual(pub.snapshot?.preset, 'focus', 'publicar pela porta');
      const busca = await fetch(url('/api/equipe/buscar'), { method: 'POST', headers: H2, body: JSON.stringify({ meu: pub.snapshot.id, chaveIdem: 'porta-000001' }) }).then(r => r.json());
      ok(busca.partida?.bot, 'sozinho na fila não caiu no bot');
      const liga = await fetch(url('/api/equipe/liga'), { headers: H2 }).then(r => r.json());
      igual(`${liga.recentes[0].id}|${liga.recentes[0].contra.tipo}`, `${busca.partida.id}|bot`, 'a partida da busca não está no topo da leitura');
    } finally { await srv.fechar(); }
  });

  return s;
}
