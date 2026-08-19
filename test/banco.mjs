/* Q6 · O BOOT DA CARTEIRA — reconciliação onde ela de fato acontece.
 *
 * `test/carteira.mjs` prova que `reconciliar` funciona. Isso não é a mesma
 * coisa que provar que ALGUÉM CHAMA. O defeito S53 removeu a reconciliação do
 * boot e passou por toda a suíte: a função continuava correta, e ninguém a
 * exercitava no caminho real.
 *
 * É a mesma lição do S30 no F0.5 — a árvore de sementes estava certa e o app
 * não estava ligado nela. Regra que aparece duas vezes deixa de ser azar:
 * **testar a peça não testa o encaixe.**
 *
 * `banco.mjs` usa `localStorage`, que não existe no Node. Em vez de mover a
 * lógica para outro lugar só para poder testá-la — o que mudaria o desenho
 * para agradar ao teste — o teste traz um `localStorage` mínimo. O módulo
 * testado é o que o navegador carrega, sem adaptação.
 */
import { criarSuite, ok, igual } from './harness.mjs';

/* `async`, e o `await fn` importa: com `fn` retornando promessa, o `finally`
   restauraria o `localStorage` ANTES do corpo do teste rodar — e todos os seis
   testes falhavam com "localStorage is not defined". */
async function comLocalStorage(fn) {
  const dados = new Map();
  const antes = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: k => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: k => dados.delete(k),
    clear: () => dados.clear(),
  };
  try { return await fn(dados); } finally {
    if (antes === undefined) delete globalThis.localStorage; else globalThis.localStorage = antes;
  }
}

/* Import novo a cada teste: o módulo guarda `ultimoDiagnostico` e escreve em
   `S`, então reaproveitar instância misturaria os casos. */
const carregarModulo = async () => import('../app/modules/banco.mjs?t=' + Math.random());

export function suite() {
  const s = criarSuite('banco');

  s.teste('carteira nova nasce com o crédito de boas-vindas no ledger', async () => {
    await comLocalStorage(async () => {
      const banco = await carregarModulo();
      const w = banco.carregar();
      igual(banco.saldo(), 1000, 'o saldo inicial mudou');
      igual(w.ledger.length, 1, 'o saldo inicial não veio de um lançamento');
      igual(w.ledger[0].tipo, 'WELCOME_GRANT', 'o crédito inicial não é WELCOME_GRANT');
    });
  });

  s.teste('o saldo antigo de `ar_bal` é migrado com lançamento', async () => {
    await comLocalStorage(async dados => {
      dados.set('ar_bal', '2500');
      const banco = await carregarModulo();
      const w = banco.carregar();
      igual(banco.saldo(), 2500, 'a migração perdeu o saldo de quem já jogava');
      igual(w.ledger.length, 1, 'a migração não deixou lançamento');
      ok(banco.ultimoDiagnostico.origem === 'migrado', 'a migração não foi diagnosticada');
    });
  });

  /* O TESTE QUE O S53 EXIGE. */
  s.teste('saldo adulterado no armazenamento é reconstruído no boot', async () => {
    await comLocalStorage(async dados => {
      const banco = await carregarModulo();
      banco.carregar();
      igual(banco.saldo(), 1000, 'partiu do saldo errado');

      /* o ataque: abrir o console e inflar o número guardado */
      const w = JSON.parse(dados.get('ar_carteira'));
      w.disponivel.transferivel = 999999;
      dados.set('ar_carteira', JSON.stringify(w));

      const banco2 = await carregarModulo();
      banco2.carregar();
      igual(banco2.saldo(), 1000,
        'o saldo inflado no armazenamento foi aceito. A reconciliação do boot ' +
        'sumiu — o ledger é a fonte, o saldo guardado é cache.');
      ok(banco2.ultimoDiagnostico.origem === 'reconstruido',
        'a adulteração foi corrigida em silêncio, sem diagnóstico');
      ok(banco2.ultimoDiagnostico.problemas.length > 0,
        'a reconstrução não disse o que estava errado');
    });
  });

  s.teste('ledger com entrada apagada é reconstruído no boot', async () => {
    await comLocalStorage(async dados => {
      const banco = await carregarModulo();
      banco.carregar();
      banco.creditarCompra(500, 'teste');
      const w = JSON.parse(dados.get('ar_carteira'));
      w.ledger.splice(0, 1);                     // some com o WELCOME_GRANT
      dados.set('ar_carteira', JSON.stringify(w));

      const banco2 = await carregarModulo();
      banco2.carregar();
      ok(banco2.ultimoDiagnostico.origem === 'reconstruido',
        'apagar entrada do ledger passou pelo boot sem diagnóstico');
      igual(banco2.saldo(), 500,
        'o saldo não foi recalculado pelo ledger que sobrou');
    });
  });

  s.teste('armazenamento corrompido não derruba o jogo', async () => {
    await comLocalStorage(async dados => {
      dados.set('ar_carteira', '{isto não é json');
      const banco = await carregarModulo();
      banco.carregar();
      igual(banco.saldo(), 1000, 'carteira ilegível não voltou ao saldo inicial');
      ok(banco.ultimoDiagnostico.origem === 'corrompido', 'a corrupção não foi diagnosticada');
    });
  });

  s.teste('cada operação da fachada persiste', async () => {
    await comLocalStorage(async dados => {
      const banco = await carregarModulo();
      banco.carregar();
      banco.creditarCompra(300, 'x');
      const gravado = JSON.parse(dados.get('ar_carteira'));
      igual(gravado.disponivel.transferivel, 1300,
        'a compra não chegou ao armazenamento — recarregar a página perderia o crédito');
      const r = banco.reservarAposta(200, 'x');
      ok(r.ok, 'a reserva falhou');
      const gravado2 = JSON.parse(dados.get('ar_carteira'));
      igual(gravado2.reservado.transferivel, 200, 'a reserva não foi persistida');
    });
  });

  return s;
}
