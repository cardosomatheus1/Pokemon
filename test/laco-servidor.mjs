/* Q1/Q6 · O LAÇO DE JOGO CONTRA O SERVIDOR (F1.14).
 *
 * ── O CRITÉRIO DE SAÍDA DO BLOCO É UMA FRASE ───────────────────────────────
 *
 *     `localStorage.clear()` não muda nada do que o jogador tem.
 *
 * Hoje ela é falsa: `app/modules/banco.mjs` guarda a carteira em
 * `localStorage`, a rodada é sorteada no cliente e a aposta é local. O servidor
 * sabe fazer as três coisas desde o F1.4, F1.5 e F1.7, e desde o F1.13 tem rota
 * para elas — e ninguém as chama. É a **L-036**.
 *
 * ── O QUE ESTE ARQUIVO MEDE, E POR QUE ASSIM ───────────────────────────────
 *
 * O app é offline-first e vai continuar sendo: sem sessão, ele joga sozinho com
 * a carteira local. O que o F1.14 acrescenta é o MODO SERVIDOR — com sessão, o
 * cliente deixa de ser fonte de qualquer verdade econômica.
 *
 * Os dois modos precisam ser COMPLETOS. Um app meio migrado, com o saldo vindo
 * do servidor e a aposta ainda local, teria duas fontes para o mesmo dinheiro —
 * que é pior que qualquer um dos dois modos inteiros.
 *
 * O teste roda no Node com um `localStorage` de mentira e um servidor de
 * verdade. É o mesmo desenho de `test/banco.mjs`: o módulo testado é o que o
 * navegador carrega, sem adaptação.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';

const SENHA = 'senha-longa-o-bastante-1';

/* Um `localStorage` mínimo, e a possibilidade de limpá-lo no meio do teste —
   que é a coisa toda que este arquivo existe para medir. */
function armazemFalso() {
  const dados = new Map();
  return {
    getItem: k => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: k => dados.delete(k),
    clear: () => dados.clear(),
    _tamanho: () => dados.size,
  };
}

async function comServico(fn) {
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                            banco: ':memory:', sims: 500 });
  const porta = await s.ouvir(0);
  const armazem = armazemFalso();
  const api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem });
  /* `banco.mjs` usa `localStorage` e o cliente de API singleton. O teste
     empresta os dois — o módulo carregado é o mesmo que o navegador carrega. */
  /* Devolve o banco E a api SINGLETON — a mesma que o `banco.mjs` usa. A
     primeira versão cadastrava numa instância própria do teste, e o módulo
     ficava sem sessão: o teste media duas apis diferentes. */
  const ligar = async () => {
    globalThis.localStorage = armazem;
    const mod = await import('../app/modules/api.mjs');
    const apiApp = mod.configurarApi({ base: `http://127.0.0.1:${porta}`, armazem });
    return { banco: await import('../app/modules/banco.mjs'), api: apiApp };
  };
  const antes = globalThis.localStorage;
  try { return await fn({ porta, s, api, armazem, ligar }); }
  finally { globalThis.localStorage = antes; await s.fechar(); }
}

const cadastrar = (api, n = 'j') => api.post('/api/auth/cadastrar', {
  username: n, email: `${n}@exemplo.test`, senha: SENHA, nascimento: '1990-01-01' });

export async function suite() {
  const s = criarSuite('laco-servidor');

  /* --- O CRITÉRIO DE SAÍDA ------------------------------------------------ */

  s.teste('limpar o armazenamento local não muda o saldo do jogador', async () => {
    await comServico(async ({ armazem, porta, ligar }) => {
      const { banco, api } = await ligar();
      const c = await cadastrar(api);
      ok(c.ok, `cadastro falhou: ${JSON.stringify(c.corpo)}`);

      /* A CARTEIRA VEM DO SERVIDOR, e o teste mede pelo MÓDULO que o app usa.
         Medir pela rota provaria que o servidor guarda o dinheiro — que já é
         verdade desde o F1.4 — e não que o jogador o tem pelo app. */
      await banco.hidratar();
      igual(banco.modoServidor(), true, 'com sessão, o app continua em modo local');
      const antes = banco.saldo();
      ok(antes > 0, `o app leu saldo ${antes} depois de hidratar do servidor`);

      /* O JOGADOR LIMPA O NAVEGADOR. Some a sessão, e é isso que tem que
         acontecer: sessão é credencial, não dinheiro. O dinheiro fica. */
      armazem.clear();
      igual(criarApi({ base: `http://127.0.0.1:${porta}`, armazem }).temSessao(), false,
        'a sessão sobreviveu ao clear — não é sessão, é cache');

      /* Ele entra de novo — e é só isso que a limpeza deveria custar. */
      const entrou = await api.post('/api/auth/entrar', { email: 'j@exemplo.test', senha: SENHA });
      ok(entrou.ok, `não deu para entrar de novo: ${JSON.stringify(entrou.corpo)}`);
      await banco.hidratar();

      igual(banco.saldo(), antes,
        `o jogador tinha ${antes} e depois de limpar o navegador tem ${banco.saldo()}. ` +
        `É o critério de saída do F1.14, e ele é uma frase: limpar o ` +
        `armazenamento local não muda nada do que o jogador tem.`);
    });
  });

  s.teste('sem sessão o app continua jogando sozinho, com a carteira local', async () => {
    await comServico(async ({ ligar }) => {
      const { banco } = await ligar();
      igual(banco.modoServidor(), false,
        'sem sessão o app se declarou em modo servidor. Os dois modos precisam ' +
        'ser COMPLETOS: um app meio migrado teria duas fontes para o mesmo ' +
        'dinheiro, que é pior que qualquer um dos dois inteiros.');
      banco.carregar();
      ok(banco.saldo() > 0, 'o modo local deixou de dar saldo inicial ao jogador');
    });
  });

  /* ── O QUE AINDA NÃO ESTÁ LIGADO, AFIRMADO DE PROPÓSITO ──────────────────
   *
   * A carteira já sabe vir do servidor. O app ainda NÃO a liga: nada no boot
   * chama `hidratar()`, a rodada continua sendo sorteada no cliente e a aposta
   * continua local. Isso é metade do F1.14, e a metade que falta é a que muda
   * toda tela que mostra saldo.
   *
   * O teste afirma a ausência DE PROPÓSITO, no molde do `D-001`: quem ligar o
   * modo servidor no boot encontra este teste vermelho, e o vermelho é o
   * lembrete de que a rodada e a aposta precisam ir junto. Ligar só a carteira
   * daria duas fontes para o mesmo dinheiro — pior que qualquer um dos dois
   * modos inteiros.
   *
   * Quando o resto do F1.14 fechar, este teste some no mesmo commit. */
  s.teste('o app ainda NÃO liga o modo servidor no boot (metade do F1.14)', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const dir = new URL('../app/modules/', import.meta.url).pathname;
    const chamam = readdirSync(dir).filter(f => f.endsWith('.mjs'))
      .filter(f => /\bhidratar\s*\(/.test(readFileSync(dir + f, 'utf8')));
    igual(chamam.join(','), 'banco.mjs',
      `\`hidratar()\` passou a ser chamada por: ${chamam.join(', ')}. Se o modo ` +
      `servidor foi ligado, a RODADA e a APOSTA precisam ter ido junto — senão o ` +
      `saldo vem do servidor e a aposta continua local, e o mesmo dinheiro passa ` +
      `a ter duas fontes. Apague este teste no commit que fechar o F1.14.`);
  });

  return s;
}
