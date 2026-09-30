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
 * E O SERVIDOR REVOGA (ST-1.2b, DEC-07): com conta real, o Sair pede
 * `POST /api/sair` COM o token antigo — antes de esquecê-lo, senão o pedido
 * sairia sem credencial. Quem copiou o token antes do Sair deixa de entrar.
 * Sem rede, o aparelho esquece do mesmo jeito: o Sair local não pode depender
 * do servidor responder. Só ESTE token — "sair de todos" é pedido explícito. */
export const CHAVE_PIN = 'ar_session';
/* A chave do save do idle — a mesma de `idle-dados.mjs`, repetida aqui porque
   esta é camada 0 e aquele não; o teste confere que as duas não se separam. */
export const CHAVE_DO_IDLE = 'ar_idle';

/* Devolve se havia CONTA REAL: quem chama precisa saber, porque as projeções
   que vieram do servidor (carteira, perfil) estão em memória e não podem
   sobreviver ao sair — a tela as recarrega do zero. */
export function sair({ api, armazem = globalThis.localStorage } = {}) {
  const tinhaConta = !!api?.temSessao?.();
  /* O pedido monta o cabeçalho ANTES do primeiro `await` do `chamar`, então o
     token vai nele mesmo sendo esquecido na linha seguinte. `revogacao` volta
     para a tela esperar antes de recarregar — recarregar cancela o pedido. */
  const revogacao = tinhaConta && api?.post
    ? api.post('/api/sair').catch(() => null)
    : Promise.resolve(null);
  api?.esquecerSessao?.();
  try { armazem?.removeItem(CHAVE_PIN); } catch { /* modo privativo */ }
  /* O CACHE DA COLEÇÃO DA CONTA sai junto (ST-13.5e · DEC-17): com conta, o
     save do idle no aparelho é cópia da coleção dela, e deixá-lo depois do
     Sair entregaria a coleção de uma conta a quem usar o navegador em
     seguida — e o jogo sem conta continuaria em cima dela. O save de quem
     nunca entrou (sem `conta`) fica: ele é do aparelho. */
  try { if (tinhaConta && JSON.parse(armazem?.getItem(CHAVE_DO_IDLE) ?? 'null')?.conta) armazem.removeItem(CHAVE_DO_IDLE); }
  catch { /* save ilegível ou modo privativo: nada a limpar */ }
  return { tinhaConta, revogacao };
}
