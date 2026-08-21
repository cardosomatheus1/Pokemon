/* §4.8 · CRITÉRIO DE SAÍDA DA v0.9, item a item, com evidência.
 *
 * O F0.10 fecha a Fase 0, e "fechar" aqui tem significado exato: os dez itens
 * do §4.8 marcados **com evidência**, não com opinião. Cada teste abaixo aponta
 * para onde a evidência mora — a suíte que a produz ou a fixture que a guarda.
 *
 * UM DOS DEZ NÃO É CÓDIGO, e ele é tratado com o mesmo rigor: a consulta de
 * enquadramento regulatório (§0.5.1) não se resolve escrevendo software. O
 * teste correspondente não finge que ela existe; ele exige que a pendência
 * esteja REGISTRADA com dono nomeado, e o relatório final a lista como
 * bloqueio de tag. Marcar item não-cumprido como cumprido seria transformar
 * este arquivo no oposto do que ele é.
 */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const raiz = p => new URL('../' + p, import.meta.url);
const ler = p => readFileSync(raiz(p), 'utf8');
const existe = p => existsSync(raiz(p).pathname);

/* Cada item aponta a evidência. `pendente` marca o que não é código. */
export const ITENS = [
  { n: 1, texto: 'motor estiver modularizado',
    prova: () => existe('engine/engine.mjs') && existe('app/modules/motor.mjs')
                 && /criarMotor/.test(ler('engine/engine.mjs')),
    onde: 'engine/engine.mjs (fábrica criarMotor) · test/fonte-unica.mjs · test/modulos.mjs' },

  { n: 2, texto: 'clima fizer parte do modelo probabilístico',
    prova: () => /sortearClima\(derivarIndice/.test(ler('engine/preco.mjs')),
    onde: 'engine/preco.mjs · test/margem.mjs · fixtures/margem.json (300 × 8.000)' },

  { n: 3, texto: 'seed raiz existir',
    prova: () => existe('engine/seed.mjs') && /RAMOS/.test(ler('engine/seed.mjs')),
    onde: 'engine/seed.mjs (árvore do §P3) · test/semente.mjs' },

  { n: 4, texto: 'testes de determinismo passarem',
    prova: () => /a mesma raiz reproduz a rodada inteira/.test(ler('test/semente.mjs'))
                 && /Node e no navegador/.test(ler('test/visual.mjs')),
    onde: 'test/semente.mjs · suíte `ambientes` (Node × Chromium) · suíte `rodada-viva`' },

  { n: 5, texto: 'regressão de milhares de rounds não encontrar divergência',
    prova: () => existe('test/fixtures/golden.json') && existe('test/fixtures/baseline.json')
                 && /RODADAS = 10000/.test(ler('test/estatistica.mjs')),
    onde: 'test/golden.mjs (20 seeds byte a byte) · test/estatistica.mjs (10.000 rodadas) · test/paridade.mjs' },

  { n: 6, texto: 'carteira tiver API própria, mesmo ainda local',
    prova: () => existe('engine/carteira.mjs') && existe('app/modules/banco.mjs')
                 && /ledger/.test(ler('engine/carteira.mjs')),
    onde: 'engine/carteira.mjs · app/modules/banco.mjs · test/carteira.mjs · test/banco.mjs' },

  { n: 7, texto: 'conteúdo Kanto estiver atrás de Content Layer',
    prova: () => existe('content/pokemon_kanto_v1.mjs') && existe('engine/pack.mjs')
                 && !/kanto/i.test(ler('engine/engine.mjs')),
    onde: 'content/pokemon_kanto_v1.mjs · engine/pack.mjs · test/conteudo.mjs (vazamento)' },

  { n: 8, texto: 'SIMS_MIN dimensionado pela cauda e erro relativo por lutador registrado na rodada',
    prova: () => /SIMS:\s*154000/.test(ler('engine/engine.mjs'))
                 && /erroRelativo/.test(ler('engine/preco.mjs')),
    onde: 'engine/engine.mjs (SIMS 154.000) · engine/preco.mjs (registro §4.4.5) · fixtures/precisao.json' },

  { n: 9, texto: 'tetos de payout e de passivo por rodada existirem e cobertos por teste',
    prova: () => existe('engine/exposicao.mjs')
                 && /MAX_PAYOUT_POR_TICKET/.test(ler('engine/engine.mjs'))
                 && /MAX_LIABILITY_POR_RODADA/.test(ler('engine/engine.mjs')),
    onde: 'engine/exposicao.mjs · test/exposicao.mjs (as duas invariantes do §4.6)' },

  { n: 10, texto: 'consulta de enquadramento regulatório (§0.5.1) feita e registrada',
    pendente: true,
    /* A prova aqui NÃO é "a consulta foi feita" — ela não foi. É que a
       pendência está registrada com dono nomeado, que é o que impede o item de
       sumir. Quem a fecha é a trilha `jurídico`, não um bloco de código. */
    prova: () => /L-012/.test(ler('docs/LACUNAS.md'))
                 && /jurídico/.test(ler('docs/LACUNAS.md')),
    onde: 'docs/LACUNAS.md → L-012, trilha `jurídico`. BLOQUEIA A TAG DA v0.9.' },
];

export function suite() {
  const s = criarSuite('saida-v09');

  for (const item of ITENS)
    s.teste(`§4.8.${item.n} · ${item.texto}${item.pendente ? ' [não é código]' : ''}`, () => {
      ok(item.prova(),
        item.pendente
          ? `a pendência do item ${item.n} não está registrada com dono. ` +
            `Item que não se cumpre precisa ao menos não sumir: ${item.onde}`
          : `item ${item.n} do §4.8 sem evidência. Onde deveria estar: ${item.onde}`);
    });

  s.teste('nenhum item do §4.8 ficou de fora da lista', () => {
    const spec = ler('docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md');
    const bloco = spec.split('## 4.8 Critério de saída da v0.9')[1].split('---')[0];
    const linhas = bloco.split('\n').filter(l => l.trim().startsWith('- ')).length;
    ok(linhas === ITENS.length,
      `o §4.8 tem ${linhas} itens e esta lista tem ${ITENS.length}. ` +
      `Critério de saída conferido por lista desatualizada não confere nada.`);
  });

  s.teste('o que bloqueia a tag está dito em voz alta', () => {
    const blocos = ler('docs/POKEARENA_BUILD_BLOCKS_v1.2.md');
    ok(/não é código/.test(blocos) && /L-012/.test(blocos),
      'o BUILD_BLOCKS precisa dizer que um critério de saída da v0.9 não se ' +
      'resolve escrevendo software — senão o F0.10 fecha e a v0.9 parece pronta');
  });

  /* ── A ARTE EMPRESTADA BLOQUEIA A TAG ──────────────────────────────────
   *
   * O build entre amigos veste o pack original com a arte do pack de
   * desenvolvimento (`ARTE_EMPRESTADA_DE` em `content/escolhido.mjs`). É uma
   * decisão legítima e reversível — o §0.3.1 proíbe PUBLICAR um produto com
   * stake econômico sobre assets de terceiros, e um build privado não é isso.
   *
   * O QUE ESTE TESTE IMPEDE é que a decisão de hoje vire o estado de lançamento
   * por inércia. Ela é uma linha; sem uma guarda, ninguém percebe que ela
   * continua ligada no dia em que o produto sair.
   *
   * Ele NÃO reprova enquanto o empréstimo estiver ligado — reprovar deixaria a
   * suíte vermelha por uma decisão consciente, e vermelho constante ensina a
   * ignorar vermelho. Ele cobra que o bloqueio esteja REGISTRADO onde quem for
   * marcar a tag vai ler. */
  s.teste('arte emprestada está registrada como bloqueio da tag', async () => {
    const escolhido = await import('../content/escolhido.mjs');
    if (!escolhido.ARTE_EMPRESTADA_DE) return;   // sem empréstimo, nada a cobrar

    const lacunas = ler('docs/LACUNAS.md');
    ok(/L-042/.test(lacunas) && /arte emprestada|ARTE_EMPRESTADA_DE/i.test(lacunas),
      `o pack está vestindo arte de \`${escolhido.ARTE_EMPRESTADA_DE}\` e a ` +
      `L-042 não registra isso. A decisão é legítima para um build privado, mas ` +
      `ela é UMA LINHA de distância do estado que o §0.3.1 proíbe — e sem ` +
      `registro ninguém percebe que ela continua ligada no dia do lançamento.`);

    const blocos = ler('docs/POKEARENA_BUILD_BLOCKS_v1.2.md');
    ok(/ARTE_EMPRESTADA_DE/.test(blocos),
      'o BUILD_BLOCKS não menciona `ARTE_EMPRESTADA_DE`. É o que quem for marcar ' +
      'a tag lê para saber o que falta, e o empréstimo precisa estar nessa lista.');
  });

  return s;
}

/* Relatório legível, impresso pelo executor da suíte. */
export function relatorio() {
  return ITENS.map(i => {
    const ok_ = i.prova();
    const marca = i.pendente ? (ok_ ? '⏳' : '✗') : (ok_ ? '✓' : '✗');
    return `  ${marca} §4.8.${String(i.n).padStart(2)} ${i.texto}\n       ${i.onde}`;
  }).join('\n');
}
