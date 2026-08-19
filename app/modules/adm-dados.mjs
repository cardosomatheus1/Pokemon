/* PAINEL DE ADM — configuração e as regras que ele NÃO pode quebrar.
 *
 * Puro: guarda e valida. Quem desenha é `adm.mjs`.
 *
 * ==========================================================================
 * O PIN NÃO É CONTROLE DE ACESSO, e dizer isso alto é parte da entrega.
 * ==========================================================================
 *
 * O projeto é um arquivo que roda no navegador, sem servidor. O PIN está no
 * código-fonte e qualquer pessoa que abrir o HTML o encontra em dez segundos.
 * Ele existe para não abrir sem querer — não para impedir ninguém. Quando
 * existir servidor (F1.11), isto vira rota autenticada de verdade, com
 * autorização por papel e registro de operador.
 *
 * O aviso aparece em vermelho no topo da tela, e o teste do portão Q6 afirma
 * que ele continua lá. Painel que finge ser seguro é pior que painel aberto:
 * o segundo ninguém confia, o primeiro alguém confia.
 *
 * ==========================================================================
 * A MARGEM DO PAINEL É A MESMA QUE A TELA DECLARA.
 * ==========================================================================
 *
 * Mexer aqui NÃO cria odd secreta: o valor vai para o registro de
 * precificação do §4.4.5 (`margemConfigurada`) e é o mesmo que aparece ao lado
 * das odds. Odd auditável é a promessa escrita na tela de Regras, e um painel
 * que a quebrasse em silêncio tornaria a página mentirosa.
 *
 * É por isso que a margem virou parâmetro da rodada em `engine/preco.mjs` em
 * vez de uma escrita em `CONF`: constante congelada mutável em tempo de
 * execução faria a fixture `margem.json` medir uma coisa e a rodada valer
 * outra, sem nada avisando.
 */
import { MARGEM_MAX, margemValida } from '../../engine/preco.mjs';

export const CHAVE_ADM = 'ar_adm';
export const ADM_PIN = '7777';
export const PADRAO = { margem: null };

export { MARGEM_MAX };

/* `margem: null` significa "use a do motor". É diferente de `margem: 0`, que é
   uma casa sem margem nenhuma — e alguém pode querer isso para medir. */
export function lerConf(bruto) {
  let c = {};
  try { c = JSON.parse(bruto) || {}; } catch { c = {}; }
  const margem = (c.margem === null || c.margem === undefined)
    ? null
    : margemValida(c.margem, null);
  return { ...PADRAO, margem };
}

/* A margem que a rodada vai usar. Devolve `undefined` quando o painel não
   declarou nada, para que `precificar` caia no padrão do motor sozinho. */
export const margemDaRodada = conf =>
  (conf && typeof conf.margem === 'number') ? conf.margem : undefined;
