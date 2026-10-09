/* O NOME DO TREINADOR (ST-2.41, D-177) — camada 0, a mesma regra no
 * servidor e na tela.
 *
 * O avaliador cego cadastrou pela API um treinador chamado
 * `<img src=x onerror=alert(document.domain)>` e o alerta disparou 8 vezes ao
 * entrar; `<b>Zé</b>`, pelo formulário, virou negrito em 5 lugares. O nome é
 * o único texto do jogador que OUTROS jogadores leem (Liga, Mercado, Trocas),
 * então o defeito alcançava terceiros.
 *
 * A defesa é em três pontos, todos com esta regra:
 *   o cadastro RECUSA o nome fora do padrão (`nomeValido`);
 *   todo nome que o servidor ENTREGA passa por `nomeExibivel` — é o que
 *     neutraliza uma conta maliciosa que já exista no banco, sem migração;
 *   a tela limpa o nome que digita, que guarda e que recebe.
 *
 * O padrão é de lista branca, e não de lista negra: letras (com acento),
 * números, espaço, ponto, hífen e sublinhado. Lista negra de `<` e `>` deixaria
 * passar aspas, que quebram atributo — e é o tipo de esquecimento que este
 * defeito já provou acontecer.
 */
export const NOME_MIN = 2;
export const NOME_MAX = 18;
const VALIDO = /^[\p{L}\p{N} ._-]+$/u;
const FORA = /[^\p{L}\p{N} ._-]/gu;

/* `minimo` é da TELA: o formulário pede 2 letras por legibilidade. O que o
   servidor exige é o que importa para a segurança — o alfabeto e o teto —, e
   um nome de 1 letra não é perigo nenhum. */
export const nomeValido = (s, minimo = NOME_MIN) => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length >= minimo && t.length <= NOME_MAX && VALIDO.test(t);
};

/* O que pode ir para a tela: o que sobra do nome depois de tirar tudo que o
   padrão não aceita. Nome que não sobrevive vira a reserva — nunca vazio, que
   numa placa é um buraco. */
export function nomeExibivel(s, reserva = 'Treinador') {
  const t = String(s ?? '').replace(FORA, '').replace(/\s+/g, ' ').trim().slice(0, NOME_MAX).trim();
  return t.length >= 1 ? t : reserva;
}
