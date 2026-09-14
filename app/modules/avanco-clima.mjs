/* O CLIMA DA RUN, do lado do jogo — camada 0.
 *
 * O motor (`engine/clima-idle.mjs`) sabe a aritmética e não sabe o que é um
 * pack. O estado (`avanco-estado.mjs`) sabe quem é a equipe e não deve saber a
 * aritmética. Este arquivo é a costura: recebe o pack, a run e a equipe JÁ
 * RESOLVIDA, e devolve o que a tela precisa mostrar e o que a colheita precisa
 * multiplicar.
 *
 * ── POR QUE ELE SAIU DO `avanco-estado.mjs` ──────────────────────────────
 *
 * Porque aquele arquivo chegou a 567 linhas com o clima dentro, e o teto é 600.
 * A divisão é por RESPONSABILIDADE e não por tamanho — a regra do CLAUDE.md —,
 * e a fronteira aqui é limpa: lá é o que a run FAZ, aqui é o que o tempo faz
 * com ela.
 *
 * E a equipe entra por ARGUMENTO em vez de ser buscada. Buscar exigiria
 * importar o estado, e o estado importa este — seria um ciclo. Foi o D-074, e
 * ele já derrubou a aba inteira uma vez.
 *
 * ── E POR QUE O CLIMA NÃO É GUARDADO ─────────────────────────────────────
 *
 * Ele é DERIVADO da raiz da run (§P3). A raiz já está no save; uma pergunta que
 * se responde com a raiz não precisa de um campo próprio.
 *
 *   > Campo guardado é campo que pode divergir do que aconteceu. Campo derivado
 *   > responde sempre a mesma coisa — inclusive na aba que o jogador reabriu
 *   > oito horas depois.
 *
 * E foi por aí que o D-087 nasceu, do outro lado: uma ferramenta ESCREVEU à mão
 * um campo derivado, e a captura saiu afirmando o que era falso. A regra que
 * ficou vale para os dois sentidos: **campo derivado se pergunta à função que o
 * deriva.**
 *
 * ── QUANDO O JOGADOR DESCOBRE: AO ENTRAR, E NÃO ANTES ────────────────────
 *
 * Mesma decisão que a Arena já tomou e documenta em `clima.mjs`: lá o clima só
 * é revelado com a contagem, depois de as apostas fecharem, porque *chove no
 * dia do jogo* — não é informação que se tem na hora de decidir.
 *
 * Aqui vale o mesmo e há um motivo a mais. Se o clima fosse sabido antes, a
 * escolha de equipe viraria uma conta — "hoje deu Nevasca, levo os quatro de
 * gelo" — e o resto do time deixaria de existir. Sabendo depois, o jogador leva
 * quem ele quer e às vezes é premiado, que é a diferença entre um bônus e uma
 * obrigação.
 */
import { sortearClimaIdle, bonusDoClima } from '../../engine/clima-idle.mjs';
import { semente } from '../../engine/instancia.mjs';
import { derivar } from '../../engine/seed.mjs';

/* O RAMO DA SEMENTE é próprio, como todo ramo neste projeto: "que clima caiu"
   e "quem apareceu" são perguntas diferentes, e amarrá-las faria mexer numa
   mexer na outra sem que ninguém quisesse. */
export const RAMO = 'avanco:clima';

export function climaDaRun(pack, run) {
  const lista = pack?.climaIdle ?? [];
  if (!run?.raiz || !lista.length) return null;
  return sortearClimaIdle(semente(derivar(String(run.raiz), RAMO)), lista);
}

/* O clima MAIS quem o aproveita, e os dois juntos de propósito: separados,
   alguém acabaria mostrando um sem o outro — que é a tela do bônus que não diz
   de quem ele é, e não ensina nada sobre a próxima escolha de equipe. */
export function leituraDoClima(pack, run, equipe = []) {
  const clima = climaDaRun(pack, run);
  if (!clima) return null;
  const bonus = bonusDoClima(clima, { equipe, especies: pack?.especies ?? [] });
  const tipos = new Set(bonus.tipos ?? []);
  const gracas = (equipe ?? []).filter(c => (c?.t ?? []).some(t => tipos.has(t)));
  return { clima, bonus, gracas };
}

/* O fator que o motor consome no canal `ritmo`. UM lugar decide, e é este: o
   motor não sabe o que é clima, e a tela não pode refazer a conta — duas contas
   para o mesmo número divergem no dia em que uma das duas for ajustada. */
export function ritmoDoClima(pack, run, equipe = []) {
  const l = leituraDoClima(pack, run, equipe);
  return l && l.bonus.canal === 'ritmo' ? l.bonus.fator : 1;
}

/* ── O QUE A TELA ESCREVE ─────────────────────────────────────────────────
 *
 * Sai daqui, e não de dentro de uma `innerHTML`. Seis defeitos plantados
 * escaparam do portão Q2 no bloco 1.27 exatamente por isso:
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * Aqui a frase é dado, e um teste sem Chromium afirma cada uma delas.
 */
export const ROTULO_DO_CANAL = {
  xp:       'XP',
  moeda:    'moeda',
  material: 'material',
  itemRaro: 'chance de item raro',
  ritmo:    'velocidade das waves',
};

/* Quanto ele está pagando, em por cento, já arredondado como a tela mostra. */
export const porCento = bonus =>
  Math.round(((Number(bonus?.fator) || 1) - 1) * 100);

/* ── A FRASE, E ELA TEM TRÊS ESTADOS ──────────────────────────────────────
 *
 *     'nenhum'    caiu o neutro — não há bônus nesta run, e dizer isso é
 *                 melhor que esconder a linha: some a linha, e o jogador nunca
 *                 aprende que clima existe
 *     'ocioso'    caiu um clima que paga, e NINGUÉM da equipe é do tipo. É a
 *                 leitura mais valiosa das três: ela ensina a próxima escolha
 *     'ativo'     está pagando, e diz quanto e graças a quem
 */
export function falaDoClima(leitura) {
  if (!leitura?.clima) return null;
  const { clima, bonus, gracas } = leitura;
  const nome = clima.name ?? clima.key;
  const emoji = clima.emoji ?? '';

  if (!bonus.canal)
    return { estado: 'nenhum', nome, emoji, titulo: nome,
             frase: 'sem bônus de clima nesta run', pct: 0 };

  const rotulo = ROTULO_DO_CANAL[bonus.canal] ?? bonus.canal;
  if (!bonus.quantos)
    return { estado: 'ocioso', nome, emoji, titulo: nome, pct: 0,
             /* ── A FRASE DO PACK, e não os tipos crus ────────────────────
                A primeira versão montava "ele rende X para quem é " mais
                `bonus.tipos`, e a esteira mostrou o resultado: **"para quem é
                water"**. `water` é a CHAVE do tipo, não o nome dele — e nome de
                tipo é tema, que mora no pack.

                O pack já escreve a frase certa no `desc`, no idioma do produto:
                "Quem é de Água acelera as waves desta run." Usar o que já
                existe é melhor que montar de novo aqui, e pior.

                  > O dado que a tela precisa já estava escrito. Eu remontei
                  > uma versão dele com as chaves internas, e só a FOTO contou.

                E este é o estado mais valioso dos três: caiu um clima que paga
                e ninguém da equipe é do tipo. É ele que ensina a próxima
                escolha de equipe. */
             frase: `ninguém da equipe aproveita — ` +
                    `${clima.desc ?? 'ele rende ' + rotulo}` };

  const pct = porCento(bonus);
  const quem = gracas.map(c => c?.nome ?? c?.n ?? '').filter(Boolean);
  return {
    estado: 'ativo', nome, emoji, titulo: nome, pct,
    frase: `+${pct}% de ${rotulo}` + (quem.length ? ` graças a ${quem.join(', ')}` : ''),
  };
}

/* ── E A LINHA DO LOG, QUANDO A RUN FECHA ─────────────────────────────────
 *
 * O pedido do dono, na forma dele: *"+52 [moeda] por buff de clima: Vendaval"*.
 *
 *   > Bônus que não aparece não é bônus: é ruído no gerador de números.
 *
 * O jogador não compara duas runs de cabeça. Se o jogo não disser o que o clima
 * rendeu, não houve melhoria nenhuma do ponto de vista dele — e era "sentir a
 * melhoria na prática" o que ele pediu.
 *
 * Em ABSOLUTO, e não em fator: "+52" é a frase dele, e "x1,15" obrigaria quem
 * lê a fazer a conta com um número que ele não tem na mão. */
export function linhaDoLogDoClima(rendeu, { moeda = 'moeda' } = {}) {
  const c = rendeu?.clima;
  if (!c || !c.canal || !c.quantos) return null;
  const ganhou = c.ganhou ?? {};
  const partes = [];
  if (Math.round(ganhou.xp || 0) > 0) partes.push(`+${Math.round(ganhou.xp)} XP`);
  if (Math.round(ganhou.moedas || 0) > 0) partes.push(`+${Math.round(ganhou.moedas)} ${moeda}`);
  /* Canais que não pagam número — material, item raro, ritmo — não têm um "+52"
     para mostrar: eles mexem numa CHANCE ou num RELÓGIO. Dizer "+15%" ali é
     honesto; inventar um absoluto seria número bonito e falso. */
  if (!partes.length) partes.push(`+${porCento(c)}% de ${ROTULO_DO_CANAL[c.canal] ?? c.canal}`);
  return `${partes.join(' e ')} por clima: ${c.nome}`;
}
