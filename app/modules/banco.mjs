/* Fachada da carteira no app — o ÚNICO lugar que move dinheiro.
 *
 * A regra do §5.5 é curta e vale mais que o código: *"`balance` nunca deve ser
 * editado diretamente sem ledger"*. Antes do F0.9 o saldo era `S.bal`, um
 * número que oito lugares diferentes somavam e subtraíam. Agora ninguém soma
 * nada: pede-se a esta fachada, ela lança no ledger, e o saldo é consequência.
 *
 * O que é DAQUI: persistência, o formato guardado, a reconciliação no boot, e
 * traduzir "o jogador ganhou a aposta" em lançamentos.
 * O que NÃO é daqui: a regra de proveniência, que vive em engine/carteira.mjs,
 * é pura e roda no servidor em F1.4. Fazer local agora é o que torna aquele
 * bloco uma troca de implementação em vez de uma reescrita.
 */
import { S } from './estado.mjs';
import { api } from './api.mjs';
import {
  carteiraVazia, creditar, liberar, liquidarGanho, liquidarPerda,
  reconciliar, reconstruir, reservar, totalDisponivel, SALDO_INICIAL,
  carteiraDeSaldos } from '../../engine/carteira.mjs';

const CHAVE = 'ar_carteira';
const CHAVE_ANTIGA = 'ar_bal';
/* Veio para `engine/carteira.mjs` no F1.13: o servidor passou a ser o segundo
   leitor, e cópia entre cliente e servidor é a forma mais barata de os dois
   discordarem sobre quanto vale começar a jogar. */

/* Diagnóstico do último carregamento, para a interface poder dizer algo em vez
   de corrigir em silêncio. */
export let ultimoDiagnostico = { origem: 'novo', problemas: [] };

/* ── O MODO SERVIDOR (F1.14) ────────────────────────────────────────────────
 *
 * Com sessão, o cliente deixa de ser fonte de qualquer verdade econômica: a
 * carteira é uma PROJEÇÃO do que o servidor diz, e `localStorage` guarda no
 * máximo a credencial. É o critério de saída do bloco, e ele é uma frase:
 *
 *     `localStorage.clear()` não muda nada do que o jogador tem.
 *
 * ── OS DOIS MODOS SÃO COMPLETOS, E ISSO É DECISÃO ──────────────────────────
 *
 * Sem sessão o app continua jogando sozinho, com a carteira local — ele nasceu
 * offline-first e não há motivo para deixar de sê-lo. O que não pode existir é
 * o meio-termo: saldo vindo do servidor e aposta ainda local seriam duas fontes
 * para o mesmo dinheiro, que é pior que qualquer um dos dois modos inteiros.
 *
 * Por isso `modoServidor()` é uma pergunta só, feita num lugar só, e o resto do
 * módulo obedece a ela.
 *
 * ── A LEITURA CONTINUA SÍNCRONA, E ISSO NÃO É PREGUIÇA ─────────────────────
 *
 * `saldo()` é chamado no meio de desenho de tela por dez módulos. Torná-lo
 * assíncrono espalharia `await` por toda a interface para responder uma
 * pergunta que ela faz dezenas de vezes por quadro. A projeção resolve: quem
 * escreve fala com o servidor e reidrata; quem lê lê a projeção. */

export const modoServidor = () => api.temSessao();

/* Traz a carteira do servidor para a projeção. Devolve `false` quando não deu —
   e NÃO inventa saldo: uma projeção vazia é honesta, um saldo chutado não. */
export async function hidratar() {
  if (!modoServidor()) return false;
  const r = await api.get('/api/carteira');
  if (!r.ok) return false;
  /* A FORMA DA CARTEIRA É DO MOTOR, e montá-la aqui seria a fachada conhecendo
     o formato interno — o que `test/carteira.mjs` proíbe, e com razão: foi
     assim que a regra vazou para dez lugares na v0.7.

     O ledger não vem junto: ele está no servidor e pode ter milhares de linhas.
     A tela de histórico o busca por conta quando precisa. */
  S.carteira = carteiraDeSaldos(r.corpo.saldos);
  ultimoDiagnostico = { origem: 'servidor', problemas: [] };
  return true;
}

export function carregar() {
  /* ── EM MODO SERVIDOR A FACHADA NÃO É FONTE (F1.16) ──────────────────────
   *
   * O boot chama `atualizarSaldo()` antes de `ligarModoServidor()`, e
   * `atualizarSaldo` chama isto — que criava a carteira local com o
   * `WELCOME_GRANT` de boas-vindas. A projeção do servidor sobrescrevia tudo em
   * seguida, então nunca custou dinheiro; o que custava era uma EXCEÇÃO no
   * teste, e toda exceção dessas é uma janela por onde o próximo lançamento de
   * boot passa sem ninguém notar.
   *
   * A BIFURCAÇÃO MORA AQUI, num lugar só — e não em cada chamador lembrando de
   * perguntar. É a mesma forma do `modoServidor()` no `aposta.mjs`: quem
   * esquece de perguntar não cria um caminho meio-migrado, porque não há o que
   * perguntar.
   *
   * A CARTEIRA VAZIA E NÃO NULA: a tela desenha antes de o `hidratar()` voltar,
   * e uma carteira nula derrubaria o primeiro `saldo()`. Vazia ela mostra zero
   * por um instante e o número certo logo depois — honesto, e sem inventar
   * dinheiro que o servidor não confirmou. */
  if (modoServidor()) {
    S.carteira = carteiraVazia();
    S.carteira.projecao = true;
    ultimoDiagnostico = { origem: 'servidor', problemas: [] };
    return S.carteira;
  }

  const bruto = localStorage.getItem(CHAVE);
  if (!bruto) {
    /* Migração do saldo antigo: quem já jogava tinha um número em `ar_bal`.
       Ele entra como PC-T comprado, com lançamento — não dá para ter saldo sem
       linha no ledger, nem para o histórico de quem já estava aqui. */
    const antigo = Number(localStorage.getItem(CHAVE_ANTIGA));
    const w = carteiraVazia();
    const valor = Number.isInteger(antigo) && antigo > 0 ? antigo : SALDO_INICIAL;
    creditar(w, antigo > 0 ? 'PC_T_PURCHASE_CLEARED' : 'WELCOME_GRANT',
             'transferivel', valor, 'migracao');
    S.carteira = w;
    ultimoDiagnostico = { origem: antigo > 0 ? 'migrado' : 'novo', problemas: [] };
    salvar();
    return w;
  }

  let w;
  try { w = JSON.parse(bruto); } catch { w = null; }
  if (!w || !Array.isArray(w.ledger)) {
    S.carteira = carteiraVazia();
    creditar(S.carteira, 'WELCOME_GRANT', 'transferivel', SALDO_INICIAL, 'reinicio');
    ultimoDiagnostico = { origem: 'corrompido', problemas: ['carteira ilegível'] };
    salvar();
    return S.carteira;
  }

  /* RECONCILIAÇÃO NO BOOT (§4.6, portão Q6 deste bloco).
     Saldo adulterado não pode ser aceito em silêncio. O ledger é a fonte; o
     saldo guardado é cache. Divergiu, o cache perde.

     Um atacante local determinado reescreve o ledger junto, e nenhuma
     reconciliação resolve isso — a defesa de verdade é o ledger viver no
     servidor, em F1.4. O que se entrega aqui é que a adulteração ingênua não
     passe calada. */
  const rec = reconciliar(w);
  if (!rec.ok) reconstruir(w);
  ultimoDiagnostico = { origem: rec.ok ? 'ok' : 'reconstruido', problemas: rec.problemas };
  S.carteira = w;
  if (!rec.ok) salvar();
  return w;
}

export function salvar() {
  /* F1.16 · EM MODO SERVIDOR NÃO SE ESCREVE. `carregar()` já não cria carteira
     local, mas `salvar()` é chamado por toda operação da fachada — e uma delas
     escapando gravaria de volta o que o bloco tirou. A garantia é a ausência de
     escrita, e ela precisa valer nas duas pontas. */
  if (modoServidor()) return;
  localStorage.setItem(CHAVE, JSON.stringify(S.carteira));
}

export const saldo = () => (S.carteira ? totalDisponivel(S.carteira) : 0);

/* O saldo de PC-B sozinho. Existe para o teto de saldo do §6 do Estudo
   (`soft_issuance_ceiling`), que é sobre BÔNUS e não sobre o total — somar os
   quatro baldes faria quem comprou PokéCash parar de receber recompensa, que é
   o contrário do que o teto quer. */
export const saldoBonus = () => (S.carteira ? S.carteira.disponivel.bonus : 0);

/* A APOSTA MÍNIMA E O VALOR EFETIVO DA APOSTA.
 *
 * Desceram de `carteira.mjs` (camada 4) para cá (camada 0) no F1.9, e por
 * necessidade de grafo: o §28.7 pede que a LISTA DE ODDS mostre o retorno
 * líquido ao lado da odd, e `odds.mjs` é camada 2 — importar a carteira dali
 * seria dependência invertida, e o teste de camadas pegou na primeira execução.
 *
 * A alternativa era recalcular o valor em `odds.mjs`. Seria a mesma regra em
 * dois lugares, e a lista prometeria um retorno que a caixa de aposta não
 * confirma no dia em que uma das duas mudasse. */
export const APOSTA_MIN = 50;

/* Valor efetivo da aposta, já limitado ao saldo. */
export const valorAposta = () => {
  const v = S.chipVal === 'max' ? saldo() : S.chipVal;
  return Math.max(0, Math.min(v, saldo()));
};

function aplicar(fn) {
  const r = fn();
  if (r && r.ok !== false) salvar();
  return r;
}

export const creditarRecompensa = (tipo, valor, ref) =>
  aplicar(() => creditar(S.carteira, tipo, 'bonus', valor, ref));

export const creditarCompra = (valor, ref) =>
  aplicar(() => creditar(S.carteira, 'PC_T_PURCHASE_CLEARED', 'transferivel', valor, ref));

export const reservarAposta = (valor, ref) => aplicar(() => reservar(S.carteira, valor, ref));
export const devolverAposta  = (comp, ref)  => aplicar(() => liberar(S.carteira, comp, ref));
export const perderAposta    = (comp, ref)  => aplicar(() => liquidarPerda(S.carteira, comp, ref));
export const pagarAposta = (comp, odd, ref) => aplicar(() => liquidarGanho(S.carteira, comp, odd, ref));

/* Só o painel Dev usa. Zera de verdade: carteira nova, ledger novo. */
export function reiniciarCarteira() {
  S.carteira = carteiraVazia();
  creditar(S.carteira, 'WELCOME_GRANT', 'transferivel', SALDO_INICIAL, 'reset');
  salvar();
}
