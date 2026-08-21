/* Q1/Q6 · O MODO SERVIDOR DO CLIENTE (F1.14).
 *
 * Servidor de verdade, sala de verdade, e o módulo que o app carrega — sem
 * adaptação. É o mesmo desenho de `test/banco.mjs`: o que se mede é o encaixe,
 * e testar a peça não testa o encaixe.
 */
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
    const dir = new URL('../app/modules/', import.meta.url).pathname;
    const fontes = readdirSync(dir).filter(f => f.endsWith('.mjs'))
      .map(f => readFileSync(dir + f, 'utf8'))
      .concat(readFileSync(new URL('../app/index.html', import.meta.url).pathname, 'utf8'));
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

  return s;
}
