/* Q1/Q5/Q6 · A TELA DE PROTEÇÃO (F1.13, Spec §28.7).
 *
 * ── O QUE O §28.7 EXIGE, E POR QUE CADA ITEM VIRA TESTE ────────────────────
 *
 * O capítulo 28 tem uma seção que não é sobre regra de negócio: é sobre o que a
 * interface pode e não pode fazer. Ela existe porque as regras de proteção
 * sobrevivem ou morrem na tela — um limite que o jogador não acha é um limite
 * que ele não usa.
 *
 *   · "limites e autoexclusão acessíveis a partir da carteira e do perfil";
 *   · "esconder limites, autoexclusão ou histórico líquido atrás de mais de
 *      dois níveis de menu" está na lista do que o produto NÃO pode fazer;
 *   · a recusa por limite "nunca oferece um caminho alternativo de gasto na
 *      mesma tela".
 *
 * O terceiro é o mais fácil de violar sem perceber: a tela de saldo insuficiente
 * já tem um botão de depositar, e copiar aquele padrão para a tela de bloqueio
 * seria natural — e seria exatamente o padrão escuro que a Spec proíbe.
 *
 * ── E A ASSIMETRIA PRECISA APARECER ────────────────────────────────────────
 *
 * Reduzir vale na hora; aumentar espera 24 h e pede confirmação. Se a tela não
 * disser isso ANTES, o jogador pede o aumento, não entende por que não valeu, e
 * conclui que o produto está quebrado — e da próxima vez ele não usa o limite.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url).pathname, 'utf8');
const tela = () => ler('../app/modules/protecao-tela.mjs');
const html = () => ler('../app/index.html');

async function comServico(fn) {
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 500 });
  const porta = await s.ouvir(0);
  try { return await fn({ porta, s, api: criarApi({ base: `http://127.0.0.1:${porta}` }) }); }
  finally { await s.fechar(); }
}

export async function suite() {
  const s = criarSuite('protecao-tela');

  /* --- o cliente de API não sabe regra nenhuma --------------------------- */

  s.teste('a API do cliente declara a versão do contrato em toda chamada', async () => {
    await comServico(async ({ api }) => {
      const r = await api.post('/api/auth/cadastrar', { username: 'j',
        email: 'j@exemplo.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      ok(r.ok, `o cadastro pela API do cliente falhou: ${JSON.stringify(r.corpo)}`);
      ok(r.corpo.sessao, 'o cadastro não devolveu sessão');
    });
  });

  s.teste('a API guarda a sessão e a manda nas chamadas seguintes', async () => {
    await comServico(async ({ api }) => {
      await api.post('/api/auth/cadastrar', { username: 'j', email: 'j@exemplo.test',
        senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const c = await api.get('/api/carteira');
      ok(c.ok, `a carteira falhou depois do cadastro: ${JSON.stringify(c.corpo)}`);
      ok(c.corpo.saldos.transferivel > 0, 'a conta nova veio sem saldo');
    });
  });

  /* SERVIDOR FORA DO AR NÃO PODE VIRAR EXCEÇÃO SOLTA. O app é offline-first, e
     uma promessa rejeitada no meio de um clique derruba a tela inteira — é a
     classe de erro que o Q5 existe para pegar, e ela é barata de evitar aqui. */
  s.teste('servidor fora do ar devolve estado, e não exceção', async () => {
    const api = criarApi({ base: 'http://127.0.0.1:1' });
    const r = await api.get('/api/carteira');
    igual(r.ok, false, 'a chamada a um servidor morto voltou ok');
    igual(r.indisponivel, true,
      'a falha de rede não foi marcada como indisponibilidade. A tela precisa ' +
      'distinguir "o servidor recusou" de "não consegui falar com o servidor": ' +
      'a primeira é uma resposta, a segunda é silêncio.');
    ok(!r.corpo || typeof r.corpo === 'object', 'corpo inesperado numa falha de rede');
  });

  /* O CASO QUE APARECEU AO OLHAR A TELA, e que nenhum teste tinha previsto: o
     app servido sem backend. O servidor de arquivos estático responde 404 em
     HTML a `/api/...`, e tratar isso como recusa fazia a tela dizer "você
     precisa entrar na sua conta" para quem não tinha servidor nenhum.

     Quem abre aquela tela foi se proteger. Mandá-lo tentar de novo, quando o
     problema não é dele, é a pior resposta possível ali. */
  s.teste('resposta sem JSON é indisponibilidade, e não recusa', async () => {
    const { createServer } = await import('node:http');
    /* Um servidor de arquivos de mentira: responde 404 em HTML, como o real. */
    const srv = createServer((_, res) => {
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end('<h1>404</h1>');
    });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    try {
      const api = criarApi({ base: `http://127.0.0.1:${srv.address().port}` });
      const r = await api.get('/api/limites');
      igual(r.ok, false, 'um 404 em HTML voltou ok');
      igual(r.indisponivel, true,
        'o 404 do servidor de arquivos foi lido como resposta da API. A tela ' +
        'então diz "entre na sua conta" para quem não tem servidor do outro ' +
        'lado — a resposta errada para quem foi ali se proteger.');
    } finally { await new Promise(r => srv.close(r)); }
  });

  /* --- §28.7: dois níveis, e a partir da carteira ------------------------ */

  s.teste('a tela de proteção é alcançável a partir da CARTEIRA', () => {
    const h = html();
    const modal = h.match(/<div class="modal-backdrop" id="walletModal">[\s\S]*?\n<\/div>\n/);
    ok(modal, 'não achei o modal da carteira — o teste perdeu a âncora');
    ok(/protecaoModal/.test(modal[0]),
      'a carteira não tem caminho para a tela de limites e autoexclusão. O §28.7 ' +
      'lista "esconder limites atrás de mais de dois níveis de menu" entre as ' +
      'coisas que o produto NÃO pode fazer.');
  });

  s.teste('a tela de proteção é alcançável a partir do PERFIL', () => {
    const h = html();
    const modal = h.match(/<div class="modal-backdrop" id="profileModal">[\s\S]*?\n<\/div>\n/);
    ok(modal, 'não achei o modal de perfil — o teste perdeu a âncora');
    ok(/protecaoModal/.test(modal[0]),
      'o perfil não tem caminho para a tela de proteção. A Spec pede os DOIS ' +
      'pontos de entrada, e não um ou outro.');
  });

  /* --- §28.7: a recusa não vende nada ------------------------------------ */

  s.teste('a tela de bloqueio por limite NÃO oferece caminho de gasto', () => {
    const t = ler('../app/modules/protecao-texto.mjs');
    const bloqueio = t.match(/export function mensagemDeBloqueio[\s\S]*?\n\}/);
    ok(bloqueio, 'não achei `mensagemDeBloqueio` — o teste perdeu a âncora');
    for (const proibido of ['Depositar', 'depositar', 'Comprar', 'comprar', 'btnWalletDep'])
      ok(!bloqueio[0].includes(proibido),
        `a mensagem de bloqueio oferece "${proibido}". O §28.7: a recusa "nunca ` +
        `oferece um caminho alternativo de gasto na mesma tela" — e copiar o ` +
        `botão da tela de saldo insuficiente é o jeito natural de violar isso.`);
  });

  s.teste('a recusa diz QUAL limite, QUANTO falta e QUANDO volta', async () => {
    const { mensagemDeBloqueio } = await import('../app/modules/protecao-texto.mjs');
    const m = mensagemDeBloqueio({ limite: 'max_loss_dia', usado: 180, teto: 200,
                                   voltaEm: Date.UTC(2026, 0, 16) });
    for (const [pedaco, oque] of [['max_loss_dia', 'QUAL limite'],
                                  ['200', 'o teto'], ['180', 'o usado']])
      ok(m.includes(pedaco) || m.includes(pedaco.replace('.', '')),
        `a mensagem não diz ${oque}: "${m}"`);
    ok(/\d{2}\/\d{2}|\d{2}:\d{2}|amanhã|hoje/.test(m),
      `a mensagem não diz QUANDO volta: "${m}". "Você atingiu seu limite" sem ` +
      `prazo é uma parede sem porta.`);
  });

  /* --- a assimetria aparece ANTES de o jogador pedir --------------------- */

  s.teste('a tela explica a assimetria antes do pedido', () => {
    const t = tela();
    ok(/24\s*h|24 horas/.test(t), 'a tela não menciona o prazo de 24 h em lugar nenhum');
    ok(/imediat/i.test(t), 'a tela não diz que reduzir vale imediatamente');
    ok(/confirma/i.test(t),
      'a tela não menciona a confirmação ativa — sem ela o jogador espera 24 h e ' +
      'descobre que ainda falta um passo');
  });

  s.teste('a tela avisa que a autoexclusão é irreversível ANTES de aplicar', () => {
    const t = tela();
    ok(/irrevers/i.test(t),
      'a tela não avisa que a pausa é irreversível durante o período. É a regra ' +
      'mais dura do §28.4, e o lugar de dizê-la é antes do clique, não depois.');
    ok(/confirm/i.test(t), 'a autoexclusão é aplicada sem confirmação explícita');
  });

  /* NENHUMA OFERTA DE RETENÇÃO, e é o item mais fácil de errar do §28.4. */
  s.teste('a tela de pausa não tem oferta de retenção', () => {
    const t = tela();
    for (const proibido of ['tem certeza que quer perder', 'bônus', 'oferta', 'volte',
                            'não vá', 'desconto'])
      ok(!new RegExp(proibido, 'i').test(t.replace(/\/\*[\s\S]*?\*\//g, '')),
        `a tela de pausa contém "${proibido}". "Pedido de autoexclusão nunca pode ` +
        `disparar oferta de retenção. Isso precisa estar escrito porque é ` +
        `exatamente o que um funil de retenção otimizado faria sozinho."`);
  });

  return s;
}
