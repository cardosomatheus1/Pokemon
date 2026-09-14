/* A BATALHA CONTRA O TREINADOR (bloco 1.7b, camada 0).
 *
 * Fronteira: entram os encontros de uma expedição e o nível da equipe; sai
 * quantos viraram batalha e o que elas renderam. Puro, sem DOM, sem estado.
 *
 * ── DE ONDE VÊM ESTES NÚMEROS ────────────────────────────────────────────
 *
 * A decisão é do dono (DEC-095 a DEC-097) e eu não tenho o texto dela no
 * repositório — só a frase que sobreviveu na L-084: *a batalha de NPC rende
 * essência e XP MELHORES*. Ele corrigiu duas vezes que está decidido, e mandou
 * seguir.
 *
 * Então vale a outra metade da regra da divisão de trabalho: **recomendação
 * minha é o padrão, e ela está escrita antes** — na L-078, por extenso. As
 * quatro constantes que a implementam ficam juntas, logo abaixo, com o nome do
 * que decidem: se o mapa dele disser outra coisa, o custo é trocar números.
 *
 * ── A PEÇA QUE FAZ O DESENHO FECHAR: O NPC OCUPA O ENCONTRO ──────────────
 *
 * Em vez de uma criatura para capturar, veio um treinador. Isso é o custo, e é
 * o que resolve três problemas de uma vez:
 *
 *     NÃO PRECISA de teto novo — o teto de encontros já limita, e a batalha
 *                 acontece DENTRO dele
 *     NÃO PRECISA de custo de stamina — a expedição já pagou
 *     É UMA TROCA de verdade: abre-se mão de uma chance de CAPTURA em troca de
 *                 XP e material melhores
 *
 * Sem isso, a batalha seria renda extra pendurada no farm, e o §P5 voltaria à
 * mesa. Com isso, é uma moeda trocando por outra dentro do mesmo orçamento.
 *
 * ── E ELA NÃO PUNE QUEM NÃO ESTÁ OLHANDO ────────────────────────────────
 *
 * O resultado ESCALA a recompensa; nunca tira nada. Ganhar rende o bônus cheio,
 * perder rende um consolo.
 *
 *   > Um idle que castiga o jogador por estar ausente está castigando o jogador
 *   > por usar o produto como ele foi feito.
 *
 * De brinde, isso dá um portão SUAVE que complementa o duro dos estágios: o
 * estágio no limite do seu nível continua valendo, e só rende menos.
 */
import { NIVEL_DO_ESTAGIO, ESTAGIOS_POR_BIOMA } from './estagios.mjs';

/* ── AS QUATRO DECISÕES, EM QUATRO CONSTANTES ─────────────────────────────
   Juntas de propósito. Se o mapa do dono disser outra coisa, é aqui que muda,
   e nada mais precisa ser tocado. */

/* QUANDO APARECE — a chance de um encontro virar batalha, por estágio. Sobe com
   a profundidade, e é o número que a L-084 pediu que a prévia mostrasse. */
export const CHANCE_POR_ESTAGIO = [0.06, 0.10, 0.16, 0.24];

/* O QUE RENDE — quanto o XP do encontro é multiplicado numa vitória. */
export const XP_DA_VITORIA = 2.5;

/* E o consolo da derrota. Não é zero: o jogador não estava lá para jogar
   melhor, e zerar seria cobrar dele a ausência que o produto vende. */
export const XP_DA_DERROTA = 1.2;

/* O material que a vitória entrega, além do XP. Faixa, e não valor fixo: é o
   único pedaço sorteado desta mecânica, e ele existe para o log da colheita ter
   uma linha que vale a pena ler. */
export const MATERIAL_DA_VITORIA = [1, 3];

const dentro = n => Math.min(ESTAGIOS_POR_BIOMA, Math.max(1, Math.floor(Number(n) || 1)));

export const chanceDoEstagio = n => CHANCE_POR_ESTAGIO[dentro(n) - 1];

/* ── O NÍVEL DO TREINADOR É O DA PORTA ────────────────────────────────────
 *
 * Sem constante nova: o treinador do estágio 3 está no nível que abre o estágio
 * 3. É a leitura mais simples possível — *"o treinador daqui está no nível
 * daqui"* — e ela produz sozinha o gradiente certo:
 *
 *     quem ACABOU de abrir a porta      empata, e ganha metade das vezes
 *     quem passou muito do nível        ganha quase sempre
 *
 * Um número inventado por cima disso só teria a função de ser ajustado depois. */
export const nivelDoNpc = estagio => NIVEL_DO_ESTAGIO[dentro(estagio) - 1];

/* Quanto cada nível de diferença vale na chance. 6 pontos por nível põe o
   empate em 50% e a folga de oito níveis em ~98% — e os dois extremos ficam
   presos, porque nem certeza nem impossibilidade fazem uma batalha valer a pena
   ser lida no log. */
export const PONTO_POR_NIVEL = 0.06;
export const CHANCE_MINIMA = 0.10;
export const CHANCE_MAXIMA = 0.95;

export function chanceDeVencer(nivelEquipe, nivelNpc) {
  const meu = Math.max(1, Math.floor(Number(nivelEquipe) || 1));
  const dele = Math.max(1, Math.floor(Number(nivelNpc) || 1));
  return Math.min(CHANCE_MAXIMA,
    Math.max(CHANCE_MINIMA, 0.5 + (meu - dele) * PONTO_POR_NIVEL));
}

/* ── QUANTOS DOS ENCONTROS VIRARAM BATALHA ────────────────────────────────
 *
 * Sorteado encontro a encontro, e não `round(n × chance)`: a média achatada
 * tiraria a variação que faz uma colheita ser diferente da outra — a mesma
 * decisão do dinheiro no 1.11, pelo mesmo motivo.
 *
 * Nunca todos: pelo menos um encontro continua sendo uma criatura. Uma colheita
 * inteira sem nada para capturar é o idle deixando de ser o que ele é, e num dia
 * de azar isso aconteceria sem ninguém ter feito nada errado. */
export function quantosNpcs(rnd, { encontros, estagio }) {
  const n = Math.max(0, Math.floor(Number(encontros) || 0));
  if (n <= 1) return 0;
  const chance = chanceDoEstagio(estagio);
  let quantos = 0;
  for (let i = 0; i < n; i++) if (rnd() < chance) quantos++;
  return Math.min(quantos, n - 1);
}

/* O resultado de UMA batalha. Devolve o multiplicador de XP e o material — e
   nunca um valor negativo, em nenhum campo. */
export function batalhar(rnd, { nivelEquipe, estagio }) {
  const nivel = nivelDoNpc(estagio);
  const chance = chanceDeVencer(nivelEquipe, nivel);
  const venceu = rnd() < chance;
  const [min, max] = MATERIAL_DA_VITORIA;
  return {
    venceu, nivelNpc: nivel, chance,
    xp: venceu ? XP_DA_VITORIA : XP_DA_DERROTA,
    material: venceu ? min + Math.floor(rnd() * (max - min + 1)) : 0,
  };
}

/* A colheita inteira: quantas batalhas, quantas vitórias, e o que somam.
 *
 * `xpBase` é o XP que UM encontro renderia — quem sabe isso é a curva do 1.14,
 * e este arquivo não a reimplementa. Ele multiplica o que recebeu, que é a
 * única coisa que ele tem o direito de saber. */
export function batalhasDa(rnd, { encontros, estagio, nivelEquipe, xpBase }) {
  const quantas = quantosNpcs(rnd, { encontros, estagio });
  const base = Math.max(0, Math.floor(Number(xpBase) || 0));
  const lista = [];
  let xpExtra = 0, material = 0, vitorias = 0;
  for (let i = 0; i < quantas; i++) {
    const r = batalhar(rnd, { nivelEquipe, estagio });
    lista.push(r);
    /* O EXTRA É O QUE PASSA DO ENCONTRO NORMAL. O encontro já pagou `base`
       quando foi contado; a batalha acrescenta a diferença. Somar o total
       pagaria duas vezes pelo mesmo encontro. */
    xpExtra += Math.round(base * (r.xp - 1));
    material += r.material;
    if (r.venceu) vitorias++;
  }
  return { quantas, vitorias, xpExtra, material, lista };
}
