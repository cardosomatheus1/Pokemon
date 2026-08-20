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
import {
  carteiraVazia, creditar, liberar, liquidarGanho, liquidarPerda,
  reconciliar, reconstruir, reservar, totalDisponivel, SALDO_INICIAL } from '../../engine/carteira.mjs';

const CHAVE = 'ar_carteira';
const CHAVE_ANTIGA = 'ar_bal';
/* Veio para `engine/carteira.mjs` no F1.13: o servidor passou a ser o segundo
   leitor, e cópia entre cliente e servidor é a forma mais barata de os dois
   discordarem sobre quanto vale começar a jogar. */

/* Diagnóstico do último carregamento, para a interface poder dizer algo em vez
   de corrigir em silêncio. */
export let ultimoDiagnostico = { origem: 'novo', problemas: [] };

export function carregar() {
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
