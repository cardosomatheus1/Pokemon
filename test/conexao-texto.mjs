/* Q1/Q5 · O QUE A TELA DIZ QUANDO A CONEXÃO CAI (F1.14, §5.9).
 *
 * ── POR QUE ISTO É UM TESTE DE TEXTO, E NÃO DE NAVEGADOR ───────────────────
 *
 * O §5.9 pede que "queda e volta recuperem o estado". O que ele NÃO diz, e o
 * produto exige, é que o jogador saiba em qual dos três momentos ele está —
 * porque a ação dele muda em cada um:
 *
 *     conectando   espere, está vindo          → não mexa
 *     no ar        está tudo certo             → jogue
 *     sem rede     não é você, e vamos voltar  → espere, ou saia sem medo
 *
 * A diferença entre "conectando" e "sem rede" é a diferença entre esperança e
 * diagnóstico, e um jogador que não a tem fecha a aba achando que o produto
 * travou. Isso é uma afirmação sobre TEXTO, e texto se confere em
 * milissegundos — a mesma razão de `protecao-texto.mjs` existir separado.
 *
 * ── A REGRA QUE O F1.13 JÁ PAGOU PARA APRENDER ─────────────────────────────
 *
 * **Silêncio não é recusa.** O `api.mjs` distingue as duas porque a tela de
 * proteção dizia "você precisa entrar na sua conta" para quem não tinha
 * servidor nenhum do outro lado. A tela de conexão tem o mesmo risco na versão
 * mais grave: dizer que o jogador perdeu a aposta quando o que caiu foi a rede.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { ESTADO_SALA } from '../app/modules/sala.mjs';
import { textoDaConexao, ESTADOS_VISIVEIS } from '../app/modules/conexao-texto.mjs';

export function suite() {
  const s = criarSuite('conexao-texto');

  /* A COMPARAÇÃO É SOBRE TUDO QUE O JOGADOR LÊ, e não só sobre a frase.
     A primeira versão comparava `frase`, e um defeito plantado que trocava só o
     TÍTULO de "Sem conexão" para "Conectando" passou verde — o jogador leria
     dois estados com o mesmo cabeçalho, que é justamente o que ele lê primeiro. */
  const lido = t => `${t.titulo} · ${t.frase}`;

  s.teste('cada estado da sala tem texto próprio', () => {
    const vistos = new Map();
    for (const e of Object.values(ESTADO_SALA)) {
      const t = textoDaConexao(e);
      ok(t && t.titulo && t.frase, `o estado \`${e}\` não tem título ou frase`);
      const anterior = vistos.get(lido(t));
      ok(!anterior,
        `os estados \`${anterior}\` e \`${e}\` mostram a MESMA coisa: ` +
        `"${lido(t)}". O jogador precisa distinguir esperar de desistir, e o ` +
        `título é o que ele lê primeiro.`);
      vistos.set(lido(t), e);
    }
  });

  s.teste('o título separa os estados visíveis entre si', () => {
    const titulos = ESTADOS_VISIVEIS.map(e => textoDaConexao(e).titulo);
    igual(new Set(titulos).size, titulos.length,
      `dois estados visíveis têm o mesmo título: ${titulos.join(' / ')}. ` +
      `A tela troca de estado e o cabeçalho não muda — para o jogador, nada ` +
      `aconteceu.`);
  });

  s.teste('"sem rede" não culpa o jogador nem fala em aposta perdida', () => {
    const t = textoDaConexao(ESTADO_SALA.SEM_REDE);
    const f = (t.titulo + ' ' + t.frase).toLowerCase();
    for (const proibido of ['perdeu', 'perdida', 'cancelada', 'sua conexão está',
                            'entre na sua conta', 'faça login', 'tente novamente mais tarde']) {
      ok(!f.includes(proibido),
        `a tela de queda diz "${proibido}". Quem caiu não perdeu nada — a aposta ` +
        `está no servidor, e o §5.9 manda recuperar o estado. Dizer o contrário ` +
        `faz o jogador apostar de novo achando que a primeira sumiu.`);
    }
    ok(/aposta|dinheiro|saldo|guardad/.test(f),
      `a tela de queda não diz nada sobre o dinheiro. É a primeira pergunta de ` +
      `quem cai no meio de uma rodada, e não respondê-la é deixar o jogador ` +
      `com a pior resposta possível: a que ele imagina.`);
  });

  s.teste('"conectando" promete volta e "sem rede" diagnostica', () => {
    const c = textoDaConexao(ESTADO_SALA.CONECTANDO);
    const r = textoDaConexao(ESTADO_SALA.SEM_REDE);
    ok(c.frase !== r.frase, 'conectando e sem rede dizem a mesma coisa');
    ok(/reconect|conect|volta|instante/i.test(c.frase),
      `"conectando" precisa soar como movimento: "${c.frase}"`);
    ok(r.tentando === true,
      '"sem rede" precisa dizer que a tentativa continua — senão o jogador ' +
      'fecha a aba achando que o produto desistiu');
  });

  s.teste('"no ar" não ocupa a tela', () => {
    const t = textoDaConexao(ESTADO_SALA.NO_AR);
    igual(t.visivel, false,
      'o estado normal aparece na tela. Aviso que fica sempre é aviso que ' +
      'ninguém lê — e ele rouba espaço da rodada, que é o produto.');
  });

  s.teste('só os estados que EXIGEM ação do jogador são visíveis', () => {
    const visiveis = Object.values(ESTADO_SALA).filter(e => textoDaConexao(e).visivel);
    igual(visiveis.sort().join(','), ESTADOS_VISIVEIS.slice().sort().join(','),
      `a lista de estados visíveis e o que a função devolve discordam. Derivar ` +
      `não pode dessincronizar — quem acrescentar um estado de sala amanhã ` +
      `encontra este teste vermelho.`);
  });

  s.teste('estado desconhecido não deixa a tela muda', () => {
    /* Um estado novo na sala e ninguém lembrou do texto: a tela não pode
       ficar em branco no meio de uma queda. */
    const t = textoDaConexao('estado-que-nao-existe');
    ok(t && t.frase && t.frase.length > 0,
      'estado desconhecido devolveu texto vazio — a tela fica muda exatamente ' +
      'quando o jogador mais precisa de uma palavra');
  });

  return s;
}
