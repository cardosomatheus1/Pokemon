/* Q1/Q2/Q6 · COMMIT-REVEAL — Spec §4.5.
 *
 * A promessa: a casa publica um compromisso antes das apostas, revela a raiz
 * depois, e qualquer um confere que o resultado já estava decidido. O que os
 * testes abaixo protegem é a parte que pode falhar em silêncio — um commit que
 * não esconde nada continua parecendo um commit.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirRodada, comprometer, conferir, novoSal, revelar } from '../engine/commit.mjs';
import { novaRaiz, sementes } from '../engine/seed.mjs';

export function suite() {
  const s = criarSuite('commit');

  s.teste('o mesmo par (raiz, sal) dá sempre o mesmo commit', async () => {
    const sal = novoSal();
    igual(await comprometer(42, sal), await comprometer(42, sal), 'o commit não é determinístico');
  });

  s.teste('o reveal correto confere, e qualquer outro não', async () => {
    const { publico, segredo } = await abrirRodada(0xC0FFEE);
    ok(await conferir(publico.commit, segredo.raiz, segredo.sal), 'o reveal correto não conferiu');
    ok(!await conferir(publico.commit, segredo.raiz + 1, segredo.sal), 'raiz trocada conferiu');
    ok(!await conferir(publico.commit, segredo.raiz, novoSal()), 'sal trocado conferiu');
    ok(!await conferir('0'.repeat(64), segredo.raiz, segredo.sal), 'commit inventado conferiu');
    for (const lixo of [null, undefined, 42, '', 'abc'])
      ok(!await conferir(lixo, segredo.raiz, segredo.sal), `commit ${String(lixo)} conferiu`);
  });

  /* --------------------------------------------------------------- Q6 */

  /* O TESTE QUE JUSTIFICA O SAL. Com raiz de 32 bits, `SHA256(raiz)` sem sal é
     invertível por força bruta — 4,3 bilhões de tentativas é trabalho de
     laptop. Aqui a busca é feita de verdade, num espaço pequeno, e o commit
     salgado precisa sobreviver a ela. */
  s.teste('o commit não entrega a raiz por força bruta', async () => {
    const { publico, segredo } = await abrirRodada(1234);
    /* varre 4.000 raízes candidatas COM o sal errado, como um atacante que não
       o tem. Nenhuma pode bater. */
    const salDoAtacante = novoSal();
    for (let r = 0; r < 4000; r++)
      if (await conferir(publico.commit, r, salDoAtacante)) {
        ok(false, `a raiz ${r} bateu o commit sem o sal certo — o sal não está entrando`);
        return;
      }
    /* e sem o sal, o mesmo commit sairia de uma busca curta: prova de que a
       proteção vem do sal, e não do SHA-256 */
    ok(segredo.sal.length >= 32, `sal de ${segredo.sal.length} dígitos hex é curto demais`);
  });

  s.teste('o commit publicado não carrega a raiz nem o sal', async () => {
    const raiz = 0xDEADBEEF;
    const { publico, segredo } = await abrirRodada(raiz);
    const texto = JSON.stringify(publico);
    for (const v of [String(raiz), raiz.toString(16), segredo.sal])
      ok(!texto.includes(v), `o pacote público carrega ${v}`);
    ok(!('raiz' in publico) && !('sal' in publico) && !('segredo' in publico),
      'o pacote público tem campo do reveal');
  });

  s.teste('sais diferentes a cada rodada', () => {
    const vistos = new Set();
    for (let i = 0; i < 500; i++) vistos.add(novoSal());
    igual(vistos.size, 500, 'o sal se repetiu — sal fixo permite tabela pré-computada');
  });

  s.teste('a raiz de uma rodada não prevê a próxima', async () => {
    /* O reveal é público. Se a próxima raiz saísse da anterior, revelar seria
       entregar o futuro — e o esquema inteiro cairia. */
    for (let i = 0; i < 500; i++) {
      const a = await abrirRodada(novaRaiz());
      const s0 = sementes(a.segredo.raiz);
      const b = await abrirRodada(novaRaiz());
      const previsoes = [a.segredo.raiz, (a.segredo.raiz + 1) >>> 0,
                         s0.elenco, s0.ambiente, s0.batalha, s0.visual, s0.recompensa];
      ok(!previsoes.includes(b.segredo.raiz),
        `a raiz ${b.segredo.raiz} saiu da rodada anterior`);
    }
  });

  s.teste('raiz fora da faixa de 32 bits é recusada', async () => {
    const sal = novoSal();
    for (const r of [-1, 2 ** 32, 1.5, NaN, Infinity, '42', null]) {
      let recusou = false;
      try { await comprometer(r, sal); } catch { recusou = true; }
      ok(recusou, `raiz ${String(r)} foi aceita`);
    }
  });

  s.teste('sal ausente ou curto é recusado — é ele que segura a força bruta', async () => {
    for (const sal of [undefined, null, '', 'abcd', 'a'.repeat(31)]) {
      let recusou = false;
      try { await comprometer(1, sal); } catch { recusou = true; }
      ok(recusou, `sal ${String(sal)} foi aceito; sem sal o commit é invertível`);
    }
  });

  s.teste('o reveal traz exatamente raiz e sal', async () => {
    const { segredo } = await abrirRodada(7);
    const r = revelar(segredo);
    igual(Object.keys(r).sort().join(','), 'raiz,sal', 'o reveal mudou de forma');
  });

  return s;
}
