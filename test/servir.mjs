/* Q1 · O SERVIDOR LOCAL — o que ele entrega, e de qual endereço.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ───────────────────────────────────────────
 *
 * O `tools/servir.mjs` é o que o dono do projeto abre para JOGAR. Ele não é
 * produção, mas é a única porta pela qual o jogo chega a alguém — e um defeito
 * nele parece defeito no jogo.
 *
 * E ele teve um, entregue junto com o link: a raiz `/` REESCREVIA o caminho
 * para `/app/index.html` em vez de redirecionar. A página certa era servida com
 * a BASE errada, então todo caminho relativo do documento resolvia contra a
 * raiz — `./modules/motor.mjs` virava `/modules/motor.mjs`, que não existe.
 *
 * MEDIDO, e a diferença é o teste inteiro:
 *
 *     http://localhost:8099/                 0 linhas de odds · 34 erros 404
 *     http://localhost:8099/app/index.html  12 linhas de odds ·  1 erro 404
 *
 * O SINTOMA É O QUE TORNA ISTO GRAVE. A tela de entrada é HTML estático e
 * desenha normalmente; o jogo só nunca dá boot. Quem abre vê "simulando
 * batalhas" para sempre, sem nada visível de errado. Não há erro de execução
 * para um portão pegar — há trinta e quatro requisições que não voltam, e nada
 * mais.
 *
 * ── POR QUE O TESTE SOBE O SERVIDOR DE VERDADE ───────────────────────────
 *
 * Ler o código e procurar a linha do redirecionamento provaria que a linha
 * existe, não que ela funciona. Este defeito nasceu de uma linha que existia e
 * fazia a coisa errada. A única pergunta que importa é a que um navegador faz:
 * "o que volta quando eu peço a raiz?".
 *
 * A porta é escolhida alta e o servidor morre no fim — o teste não pode
 * depender de nada estar rodando, nem deixar coisa rodando.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { criarSuite, ok, igual } from './harness.mjs';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
/* Porta alta e improvável, para não brigar com o servidor que o dono do projeto
   possa ter aberto na 8099 enquanto a suíte roda. */
const PORTA = 8791;

function subir() {
  const p = spawn(process.execPath, ['tools/servir.mjs', '--porta', String(PORTA)],
    { cwd: RAIZ, stdio: 'ignore' });
  return p;
}

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

/* `redirect: 'manual'` é o ponto: seguir o redirecionamento devolveria 200 nos
   dois casos e apagaria justamente a diferença que se quer medir. */
const pedir = (caminho) =>
  fetch(`http://127.0.0.1:${PORTA}${caminho}`, { redirect: 'manual' });

export function suite() {
  const s = criarSuite('servir');

  s.teste('a raiz REDIRECIONA para o app, e não o serve por baixo', async () => {
    const proc = subir();
    try {
      /* Espera curta em laço em vez de um `sleep` generoso: um tempo fixo é
         chute que fica lento na máquina rápida e frágil na lenta. */
      let r = null;
      for (let i = 0; i < 60 && !r; i++) {
        await esperar(100);
        try { r = await pedir('/'); } catch { /* ainda subindo */ }
      }
      ok(r, `o servidor não subiu na porta ${PORTA} em 6 s`);
      igual(r.status, 302,
        `a raiz respondeu ${r.status} em vez de redirecionar. Servir o app por ` +
        `baixo entrega a página certa com a BASE errada, e todo import relativo ` +
        `resolve para fora do lugar — o jogo trava na tela de entrada.`);
      const destino = r.headers.get('location');
      ok(destino && destino.endsWith('/app/index.html'),
        `o redirecionamento aponta para "${destino}", e não para o app`);

      /* As duas outras portas do mesmo engano. `/app` sem barra é o que alguém
         digita; `/app/` é o que um autocompletar oferece. */
      for (const c of ['/app', '/app/'])
        igual((await pedir(c)).status, 302,
          `"${c}" precisa redirecionar como a raiz — é o mesmo engano`);
    } finally { proc.kill(); }
  });

  s.teste('o app continua sendo servido no caminho dele', async () => {
    const proc = subir();
    try {
      let r = null;
      for (let i = 0; i < 60 && !r; i++) {
        await esperar(100);
        try { r = await pedir('/app/index.html'); } catch { /* ainda subindo */ }
      }
      ok(r, `o servidor não subiu na porta ${PORTA} em 6 s`);
      igual(r.status, 200, 'o app deixou de ser servido no próprio caminho');
      const txt = await r.text();
      ok(/id="viewArena"/.test(txt), 'a resposta não é a página do jogo');
      ok((r.headers.get('content-type') || '').includes('text/html'),
        'o tipo do conteúdo não é HTML — foi assim que o R25 quebrou uma entrega');
    } finally { proc.kill(); }
  });

  s.teste('sair da raiz continua sendo recusado', async () => {
    /* A guarda de travessia é a única coisa deste servidor que protege alguma
       coisa: sem ela, `..%2f..%2f` entrega o disco de quem o rodou. Ela existia
       antes deste bloco e o teste entra junto — mexer no roteamento é
       exatamente quando ela pode ser derrubada por acidente. */
    const proc = subir();
    try {
      let r = null;
      for (let i = 0; i < 60 && !r; i++) {
        await esperar(100);
        try { r = await pedir('/..%2f..%2fWindows%2fwin.ini'); } catch { /* subindo */ }
      }
      ok(r, `o servidor não subiu na porta ${PORTA} em 6 s`);
      ok(r.status === 403 || r.status === 404,
        `travessia de diretório respondeu ${r.status} — ela precisa ser recusada`);
    } finally { proc.kill(); }
  });

  return s;
}
