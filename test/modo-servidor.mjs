/* Q1/Q6 · O MODO SERVIDOR DO CLIENTE (F1.14).
 *
 * Servidor de verdade, sala de verdade, e o módulo que o app carrega — sem
 * adaptação. É o mesmo desenho de `test/banco.mjs`: o que se mede é o encaixe,
 * e testar a peça não testa o encaixe.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync as lerArquivo } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { FASE_MS } from '../server/scheduler.mjs';
import { ESTADO_SALA } from '../app/modules/sala.mjs';
import * as modo from '../app/modules/modo-servidor.mjs';

const SENHA = 'senha-longa-o-bastante-1';

async function comServico(fn) {
  let t = 1_700_000_000_000;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                            banco: ':memory:', sims: 500, relogio: () => t });
  const porta = await s.ouvir(0);
  const base = `http://127.0.0.1:${porta}`;
  const r = await fetch(base + '/api/auth/cadastrar', {
    method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'j', email: 'j@exemplo.test', senha: SENHA,
                           nascimento: '1990-01-01' }) });
  const { sessao } = await r.json();
  try { return await fn({ base, sessao, s, avancar: ms => { t += ms; } }); }
  finally { modo.desligar(); await s.fechar(); }
}

async function ate(cond, oQue, teto = 5000) {
  const fim = Date.now() + teto;
  while (!cond() && Date.now() < fim) await new Promise(r => setTimeout(r, 10));
  ok(cond(), `esperei ${oQue} e não veio`);
}

export function suite() {
  const s = criarSuite('modo-servidor');

  s.teste('a rodada aberta chega pela sala', async () => {
    await comServico(async ({ base, sessao }) => {
      modo.ligar({ base, token: () => sessao });
      const r = await modo.esperarAbertura();
      igual(r.fase, 'aberta', 'a rodada que chegou não estava aberta');
      igual(r.lutadores.length, 12, 'a rodada veio sem os doze lutadores');
      ok(Number.isInteger(r.sementeElenco),
        'a rodada veio sem a semente de elenco — o cliente não tem o que montar');
    });
  });

  /* ── O QUE A REDE CAÍDA NÃO PODE FAZER ─────────────────────────────────── */

  s.teste('sem servidor, esperar a abertura ESPERA — e não inventa rodada', async () => {
    modo.ligar({ base: 'http://127.0.0.1:1', token: () => 'x' });
    let resolveu = false;
    modo.esperarAbertura().then(() => { resolveu = true; });
    await ate(() => modo.conexao() === ESTADO_SALA.SEM_REDE, 'o estado sem rede');
    await new Promise(r => setTimeout(r, 120));
    igual(resolveu, false,
      'a espera resolveu sem servidor nenhum do outro lado. Rede caída não é ' +
      'permissão para inventar rodada — quem apostar nela aposta contra ' +
      'números que ninguém publicou.');
    igual(modo.rodadaViva(), null, 'apareceu uma rodada do nada');
    modo.desligar();
  });

  s.teste('desligar não resolve as esperas com uma rodada falsa', async () => {
    modo.ligar({ base: 'http://127.0.0.1:1', token: () => 'x' });
    let recebeu = 'nada';
    modo.esperarAbertura().then(r => { recebeu = r; });
    await ate(() => modo.esperando() > 0, 'a espera entrar na fila');
    modo.desligar();
    await new Promise(r => setTimeout(r, 60));
    igual(recebeu, 'nada',
      'desligar o modo servidor entregou uma rodada a quem esperava. Quem ' +
      'esperava e teve o modo desligado não deve receber rodada nenhuma — ' +
      'receber uma faria o app desenhar o que não existe.');
  });

  /* ── A TRADUÇÃO PARA A FORMA QUE O APP LÊ ──────────────────────────────── */

  s.teste('as odds traduzidas têm TODO campo que o app lê', async () => {
    /* A LISTA SAI DO PRÓPRIO APP, e não de uma cópia escrita aqui. Um módulo
       que passe a ler `S.odds.overround` amanhã encontra este teste vermelho —
       derivar não pode dessincronizar. */
    const { readFileSync, readdirSync } = await import('node:fs');
    const dir = fileURLToPath(new URL('../app/modules/', import.meta.url));
    const fontes = readdirSync(dir).filter(f => f.endsWith('.mjs'))
      .map(f => readFileSync(dir + f, 'utf8'))
      .concat(readFileSync(new URL('../app/index.html', import.meta.url), 'utf8'));
    const campos = new Set();
    for (const txt of fontes)
      for (const m of txt.matchAll(/\bS\.odds\.(\w+)/g)) campos.add(m[1]);
    ok(campos.size > 0, 'nenhum campo de `S.odds` foi encontrado no app — o varredor quebrou');

    await comServico(async ({ base, sessao }) => {
      modo.ligar({ base, token: () => sessao });
      const r = await modo.esperarAbertura();
      const o = modo.oddsDoServidor(r);
      for (const c of campos)
        ok(o[c] !== undefined,
          `o app lê \`S.odds.${c}\` e o modo servidor não preenche esse campo. ` +
          `A tela mostraria \`undefined\` onde deveria haver preço.`);
    });
  });

  s.teste('as odds traduzidas são as MESMAS que o servidor publicou', async () => {
    await comServico(async ({ base, sessao }) => {
      modo.ligar({ base, token: () => sessao });
      const r = await modo.esperarAbertura();
      const o = modo.oddsDoServidor(r);
      for (const l of r.lutadores) {
        const meu = o.lutadores[l.slot];
        igual(meu.odd, l.odd, `a odd do slot ${l.slot} mudou na tradução`);
        igual(meu.idx, l.slot,
          `o índice do lutador não é o slot do servidor. O app encontra o ` +
          `lutador por \`idx\`, e o settlement paga pelo \`slot\` — se os dois ` +
          `discordarem, o jogador aposta num e recebe por outro.`);
      }
      igual(o.margemConfigurada, r.margemEfetiva,
        'a tela mostraria uma margem que não é a que o preço tem');
    });
  });

  /* O SLOT NÃO É A POSIÇÃO NO ARRAY, e o teste precisa montar o caso em que
     os dois diferem.
   *
   * O servidor publica os doze em ordem de slot, então `posição === slot` e um
   * defeito que trocasse um pelo outro passaria despercebido — foi o que
   * aconteceu com o S253 na primeira passada. É a forma da L-038 numa roupa
   * conhecida: **equivalente sob o estado que o teste monta**.
   *
   * Aqui a rodada é montada à mão, fora de ordem. Não é artificial: o dia em
   * que a rota ordenar por odd para a tela — que é uma mudança plausível e
   * inofensiva — a posição deixa de ser o slot, e o settlement continua pagando
   * pelo slot. */
  s.teste('o índice sai do SLOT, e não da posição na lista', () => {
    const foraDeOrdem = {
      id: 'x', sims: 500, margemEfetiva: 0.08, erroPior: 0.01,
      lutadores: [
        { slot: 7, dex: 25, nome: 'a', prob: 0.1, erroRelativo: 0.01, odd: 9.2, stakeMax: 100, limite: 1 },
        { slot: 2, dex: 6,  nome: 'b', prob: 0.3, erroRelativo: 0.01, odd: 3.1, stakeMax: 100, limite: 1 },
        { slot: 0, dex: 9,  nome: 'c', prob: 0.6, erroRelativo: 0.01, odd: 1.5, stakeMax: 100, limite: 1 },
      ],
    };
    const o = modo.oddsDoServidor(foraDeOrdem);
    igual(o.lutadores.map(l => l.idx).join(','), '7,2,0',
      `os índices saíram ${o.lutadores.map(l => l.idx).join(',')} — vieram da ` +
      `POSIÇÃO na lista, e não do slot do servidor. O jogador clica num lutador ` +
      `e a aposta vai para outro, porque o settlement paga pelo slot.`);
    igual(o.lutadores.find(l => l.idx === 7).odd, 9.2,
      'procurar pelo índice devolveu a odd de outro lutador');
  });

  s.teste('a troca de fase é anunciada uma vez por fase', async () => {
    await comServico(async ({ base, sessao, avancar }) => {
      const fases = [];
      modo.ligar({ base, token: () => sessao, aoFase: r => fases.push(r.fase) });
      await modo.esperarAbertura();
      avancar(FASE_MS.APOSTA + 1);
      await ate(() => fases.includes('travada'), 'a fase travada');
      igual(fases.filter(f => f === 'travada').length, 1,
        `a fase travada foi anunciada ${fases.filter(f => f === 'travada').length} vezes — ` +
        `o cliente remontaria a cena mais de uma vez`);
      ok(fases[0] === 'aberta', `a primeira fase anunciada foi \`${fases[0]}\``);
    });
  });

  s.teste('a raiz revelada chega, e só depois do fechamento', async () => {
    await comServico(async ({ base, sessao, avancar }) => {
      modo.ligar({ base, token: () => sessao });
      const aberta = await modo.esperarAbertura();
      igual(aberta.revelado, undefined,
        'a raiz chegou ao cliente com a janela de aposta ABERTA — quem a lê ' +
        'reproduz a batalha antes de apostar');
      avancar(FASE_MS.APOSTA + 1);
      await ate(() => modo.rodadaViva()?.fase === 'travada', 'o fechamento');
      ok(modo.rodadaViva().revelado?.raiz,
        'a raiz não chegou depois do fechamento — sem ela o cliente não tem ' +
        'como reproduzir a batalha, e o §P3 inteiro depende disso');
    });
  });

  /* ── A CONFERÊNCIA DO REVEAL ───────────────────────────────────────────
   *
   * A auditoria do §25.2 confere que a raiz bate com o commit — e bateria
   * mesmo se o servidor tivesse MOSTRADO uma rodada e JOGADO outra, porque o
   * que ela audita é a raiz, não o que apareceu na tela. Esta é a checagem que
   * falta, e o fechamento é a única hora em que ela é possível.
   */
  s.teste('a raiz que reproduz a pool desenhada devolve a árvore inteira', async () => {
    const { novaRaiz, sementes, derivar } = await import('../engine/seed.mjs');
    const raiz = novaRaiz();
    const a = modo.arvoreConferida(raiz, derivar(raiz, 'elenco'));
    ok(a, 'a raiz correta foi recusada');
    igual(a.batalha, sementes(raiz).batalha, 'a árvore devolvida não é a da raiz');
  });

  s.teste('raiz que NÃO reproduz a pool desenhada é recusada', async () => {
    const { novaRaiz, derivar } = await import('../engine/seed.mjs');
    const mostrada = novaRaiz(), jogada = novaRaiz();
    igual(modo.arvoreConferida(jogada, derivar(mostrada, 'elenco')), null,
      'o cliente aceitou uma raiz que não produz a pool que ele desenhou. O ' +
      'servidor mostrou uma rodada e jogou outra, e a auditoria do §25.2 não ' +
      'pegaria: ela confere a raiz contra o commit, e essa parte bate.');
  });

  s.teste('a conferência não lança, ela devolve `null`', () => {
    for (const ruim of [null, undefined, '', 'nao-e-raiz'])
      igual(modo.arvoreConferida(ruim, 123), null,
        `\`${ruim}\` fez a conferência lançar em vez de recusar. Uma exceção no ` +
        `meio do fechamento derruba a tela em vez de explicá-la ao jogador.`);
  });

  /* ══ D-108 e D-109 · ESTES TESTES AFIRMAM OS DEFEITOS, DE PROPÓSITO ══════
   *
   * Achados no cruzamento documentos × código de 25/09/2026. Os dois só
   * existem COM conta real (modo servidor), que é justamente o modo que a
   * suíte de navegador não joga até o fim. São testes de TEXTO porque o
   * comportamento pede a tela inteira; ficam VERDES enquanto o defeito existir
   * e VERMELHOS no dia em que o bloco dono consertar — sinal para marcar a
   * ficha em docs/DEFEITOS.md e trocar o teste por um de comportamento. */
  const fonte = f => lerArquivo(new URL(f, import.meta.url), 'utf8');

  /* D-108 · o teste que afirmava o defeito (a boutique debitava só na tela
     com conta real) ficou vermelho na ST-1.3, que é a mitigação: com conta
     online a boutique não vende. Os testes de comportamento moram em
     `test/vitrine.mjs`, onde a regra mora (`podeComprar`). O conserto de
     verdade — posse no servidor — é o E4. */

  /* ══ D-109 · O ⏻ DESLOGA A CONTA REAL (ST-1.2, 25/09/2026) ═══════════
     O teste de texto que afirmava o defeito ficou vermelho no conserto e virou
     estes três: comportamento em Node, com a api de verdade sobre um armazém
     falso, e uma guarda estrutural de que o botão usa a decisão. */
  const armazemFalso = inicial => {
    const m = new Map(Object.entries(inicial));
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
             removeItem: k => m.delete(k), tem: k => m.has(k) };
  };

  s.teste('D-109: com conta real, sair esquece o token e a sessão acaba', async () => {
    const { criarApi } = await import('../app/modules/api.mjs');
    const { sair } = await import('../app/modules/sair.mjs');
    const armazem = armazemFalso({ ar_sessao: 'token-de-verdade', ar_session: '1' });
    const api = criarApi({ armazem });
    ok(api.temSessao(), 'a api não leu o token do armazém — o teste perdeu o que medir');
    const r = sair({ api, armazem });
    igual(r.tinhaConta, true, 'sair não percebeu que havia conta real');
    igual(api.temSessao(), false,
      'o token continuou na api: a próxima chamada sai autenticada como o jogador que saiu');
    ok(!armazem.tem('ar_sessao'), 'o token continuou no armazém: recarregar a página religa a conta');
    ok(!armazem.tem('ar_session'), 'o PIN da fachada continuou');
  });

  s.teste('D-109: sem conta real, sair é o de sempre — apaga o PIN e mais nada', async () => {
    const { criarApi } = await import('../app/modules/api.mjs');
    const { sair } = await import('../app/modules/sair.mjs');
    const armazem = armazemFalso({ ar_session: '1', ar_carteira: '{"x":1}' });
    const r = sair({ api: criarApi({ armazem }), armazem });
    igual(r.tinhaConta, false, 'sem token não há conta real, e a tela não pode recarregar à toa');
    ok(!armazem.tem('ar_session'), 'o PIN continuou');
    ok(armazem.tem('ar_carteira'),
      'sair apagou a carteira LOCAL — o aviso diz "o treinador continua salvo neste navegador"');
  });

  s.teste('D-109: o botão ⏻ passa pela decisão, e não por uma cópia dela', () => {
    const nav = fonte('../app/modules/navegacao.mjs');
    const at = nav.indexOf("$('#btnLogout').onclick");
    ok(at > 0, 'o handler do Sair sumiu — o teste perdeu a âncora');
    const corpo = nav.slice(at, at + 1200);
    ok(/sair\(\{ api \}\)/.test(corpo),
      'o botão deixou de chamar sair({ api }): a decisão testada acima não é a que roda');
    ok(!/removeItem\('ar_session'\)/.test(corpo),
      'o botão voltou a apagar o PIN à mão — é a forma exata do D-109');
  });

  return s;
}
