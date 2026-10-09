/* O NOME DO TREINADOR NÃO VIRA CÓDIGO (ST-2.41, D-177).
 *
 * O avaliador cego (09/10): um treinador cadastrado pela API com o nome
 * `<img src=x onerror=alert(document.domain)>` disparou o alerta 8 vezes ao
 * entrar, e `<b>Zé</b>` pelo formulário virou negrito em 5 lugares. O nome é
 * lido por OUTROS jogadores (Liga, Mercado, Trocas) — o ataque alcançava
 * terceiros.
 *
 * Três pontas, e esta suíte trava as três: o cadastro recusa; o servidor
 * limpa todo nome que entrega (a conta maliciosa que JÁ existe no banco não
 * volta crua); a tela limpa o que digita, guarda e recebe.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { nomeValido, nomeExibivel, NOME_MAX } from '../engine/nome-treinador.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';
import { validarConta, enviarConta } from '../app/modules/conta-real.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const AGORA = Date.UTC(2026, 9, 9, 15);
const ATAQUES = ['<img src=x onerror=alert(document.domain)>', '<b>Zé</b>', '"><svg onload=alert(1)>', "Ash' onmouseover='x", 'a&lt;b'];
const PERIGO = /[<>"'&=()]/;
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

export async function suite() {
  const s = criarSuite('nome-treinador');

  s.teste('a regra: letras com acento, números, espaço, ponto, hífen e sublinhado — de 2 a 18', () => {
    for (const n of ['Ash', 'Zé Ninguém', 'treinador_01', 'Mr. Mime-2', 'Ñandú']) ok(nomeValido(n), `"${n}" foi recusado`);
    for (const n of [...ATAQUES, 'a', 'x'.repeat(NOME_MAX + 1), '', null, 42]) ok(!nomeValido(n), `"${n}" passou`);
    ok(nomeValido('a', 1), 'o servidor (mínimo 1) recusou um nome de uma letra — não é perigo, e os testes do servidor usam');
  });

  s.teste('o que vai para a tela nunca leva caractere de marcação, e nunca sai vazio', () => {
    for (const a of ATAQUES) { const e = nomeExibivel(a); ok(!PERIGO.test(e), `"${a}" virou "${e}"`); ok(e.length >= 1 && e.length <= NOME_MAX); }
    igual(nomeExibivel('<b>Zé</b>'), 'bZéb');
    igual(nomeExibivel('<>'), 'Treinador', 'nome que não sobra não caiu na reserva');
    igual(nomeExibivel('Ash'), 'Ash', 'um nome bom foi mexido');
  });

  s.teste('o cadastro recusa o nome fora da regra — pelo servidor, mesmo sem passar pela tela', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    for (const [i, a] of ATAQUES.entries()) {
      let e = null;
      try { cadastrar(db, { username: a, email: `x${i}@x.test`, senha: 'senha-longa-o-bastante', nascimento: '1990-01-01', agora: AGORA }); } catch (x) { e = x; }
      ok(e && /nome de treinador/.test(e.message), `o servidor aceitou "${a}"`);
    }
    igual(db.prepare('SELECT COUNT(*) n FROM users').get().n, 0, 'nome recusado deixou conta (nem congelada pode ficar)');
    ok(!validarConta('signup', { nome: '<b>Zé</b>', email: 'a@b.test', senha: 'x'.repeat(12), nascimento: '1990-01-01', declarou: true }, AGORA).ok,
      'a tela deixou enviar o nome com marcação');
  });

  s.teste('a conta maliciosa que JÁ existe no banco chega limpa ao perfil', async () => {
    const sv = criarServidor({ config: { ambiente: 'teste', silencioso: true } });
    await new Promise(r => sv.servidor.listen(0, '127.0.0.1', r));
    try {
      const base = `http://127.0.0.1:${sv.servidor.address().port}`;
      const a = criarApi({ base, armazem: memoria() });
      const r = await enviarConta(a, 'signup', { nome: 'Ash', email: 'ash@x.test', senha: 'senha-longa-o-bastante', nascimento: '1990-05-01', declarou: true }, AGORA);
      igual(r.ok, true, `o cadastro falhou: ${r.msg}`);
      sv.db.prepare('UPDATE users SET username = ? WHERE email = ?').run(ATAQUES[0], 'ash@x.test');   // o que pode estar em produção
      const p = await a.get('/api/perfil');
      ok(p.corpo?.nome && !PERIGO.test(p.corpo.nome), `o perfil entregou o nome cru: ${p.corpo?.nome}`);
    } finally { await sv.fechar(); }
  });

  s.teste('todo lugar que entrega o nome de um jogador a outro passa pela limpeza', () => {
    for (const f of ['liga-equipe', 'mercado-jogadores', 'trocas'])
      ok(/const nomeDe = \(db, id\) => nomeExibivel\(/.test(fonte(`../server/${f}.mjs`)), `server/${f}.mjs entrega o nome cru a outro jogador`);
    const brutos = ['liga-equipe', 'mercado-jogadores', 'trocas', 'rotas'].flatMap(f =>
      fonte(`../server/${f}.mjs`).split('\n').filter(l => /SELECT username/.test(l) && !/nomeExibivel|nomeOuNada/.test(l)).map(l => `${f}: ${l.trim()}`));
    igual(brutos.join(' | '), '', 'sobrou nome lido do banco sem limpeza');
  });

  s.teste('a tela limpa o nome que guarda, que digita e que recebe', () => {
    const p = fonte('../app/modules/perfil-dados.mjs');
    ok(/p\.name = nomeExibivel\(p\.name\);/.test(p), 'o perfil guardado volta cru');
    ok(/S\.profile\.name = nomeExibivel\(r\.corpo\.nome\)/.test(p), 'o nome do servidor entra cru');
    ok(/const v = nomeExibivel\(\$\('#profName'\)\.value\)/.test(fonte('../app/modules/controles.mjs')), 'renomear grava cru');
    const nv = fonte('../app/modules/navegacao.mjs');
    ok(!/S\.profile\.name = nome[;)\s]/.test(nv), 'o cadastro grava o nome cru');
  });

  return s;
}
