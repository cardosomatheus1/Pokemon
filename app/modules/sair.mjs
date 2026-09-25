/* O QUE O ⏻ LIMPA — camada 0 (ST-1.2, fecha o D-109).
 *
 * Havia duas "sessões" no navegador, e o botão Sair só sabia de uma:
 *
 *     ar_session   o PIN da fachada local, "1" quando se entra sem conta
 *     ar_sessao    o TOKEN da conta real, que o `api.mjs` guarda e envia
 *
 * O Sair apagava `ar_session`. Com conta real, `sessaoAtiva()` continuava
 * verdadeira pelo token, e o jogador que clicava em Sair num aparelho
 * compartilhado deixava a conta aberta para o próximo. `api.esquecerSessao`
 * existia desde o F1.13 e ninguém chamava.
 *
 * A DECISÃO MORA AQUI, e não no handler do botão, pelo motivo de sempre: dentro
 * de um `onclick` ela só se testa abrindo o jogo num navegador, e foi por isso
 * que o defeito passou pela suíte inteira. Aqui entram a api e o armazém, e o
 * teste é de Node.
 *
 * O QUE ELE NÃO FAZ: revogar o token no servidor. O token dura 7 dias e o
 * servidor não guarda estado de sessão (`server/auth.mjs`); revogar é a
 * ST-1.2b, e depende da DEC-07. Esquecer NESTE aparelho é o que o botão
 * promete, e é o que ele passa a cumprir. */
export const CHAVE_PIN = 'ar_session';

/* Devolve se havia CONTA REAL: quem chama precisa saber, porque as projeções
   que vieram do servidor (carteira, perfil) estão em memória e não podem
   sobreviver ao sair — a tela as recarrega do zero. */
export function sair({ api, armazem = globalThis.localStorage } = {}) {
  const tinhaConta = !!api?.temSessao?.();
  api?.esquecerSessao?.();
  try { armazem?.removeItem(CHAVE_PIN); } catch { /* modo privativo */ }
  return { tinhaConta };
}
