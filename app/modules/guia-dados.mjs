/* O GUIA DO JOGO — o que cada coisa faz (ST-2.24) — camada 0, puro.
 *
 * O dono, jogando como quem chega: "os nomes [das moedas] foi decisão nossa,
 * talvez só tenha que ficar mais claro o que cada uma faz; não vi direito a
 * parte dos [bichos], IVs etc., o mercado entre jogadores etc."
 *
 * Olhado antes: a página "Como funciona" explicava UMA coisa — a aposta da
 * Arena. Nada das Rotas, das moedas, da criatura, da Jornada, das Trocas nem
 * do Mercado; e o Mercado abria num formulário de busca sem uma frase sobre o
 * que ele é. Quem chega aprende cinco sistemas por tentativa e erro.
 *
 * Cada seção responde três perguntas, nesta ordem: o que é, como funciona
 * (em itens curtos), e onde fica (o botão "ir para"). Os nomes das moedas e do
 * material saem do pack — escritos à mão aqui, o guia mentiria no dia em que
 * o pack trocasse. Os números saem das mesmas constantes que as regras usam.
 */
import { POLITICA_PILOTO } from '../../engine/taxas-mercado.mjs';
import { PCT_JORNADA } from '../../engine/pct-jornada.mjs';
import { PVE } from '../../engine/recompensa-pve.mjs';
import { NIVEL_DO_ESTAGIO, NASCE_ACIMA_DA_PORTA } from '../../engine/estagios.mjs';
import { STAMINA_MAX } from '../../engine/expedicao.mjs';
import { EXEMPLAR } from '../../engine/instancia.mjs';

export const SECOES = Object.freeze(['moedas', 'rotas', 'criatura', 'jornada', 'trocas', 'mercado', 'arena']);

const pct = bps => `${String(bps / 100).replace('.', ',')}%`;
const nomes = pack => ({
  cash: pack?.moeda?.nome ?? 'moeda da Arena', cashS: pack?.moeda?.simbolo ?? '',
  coin: pack?.moedaPve?.nome ?? 'moeda das Rotas', coinS: pack?.moedaPve?.simbolo ?? '',
  material: pack?.material?.nome ?? 'material',
});

/* O papel de cada moeda em poucas palavras — o que vai ao lado do nome. */
export function papelDaMoeda(pack, qual) {
  const n = nomes(pack);
  return qual === 'arena'
    ? `${n.cash}: a moeda da Arena — aposta, Boutique e (a parte transferível) Trocas e Mercado`
    : `${n.coin}: a moeda das Rotas — ganha nas runs e na Jornada, gasta na Loja`;
}

export function guiaDoJogo(pack) {
  const n = nomes(pack);
  const portas = NIVEL_DO_ESTAGIO.map(x => x + NASCE_ACIMA_DA_PORTA).join(', ');
  return [
    { id: 'moedas', titulo: 'As duas moedas', resumo: `Uma é da aposta, a outra é da aventura. Elas não se convertem uma na outra.`,
      itens: [
        { termo: `${n.cashS} ${n.cash}`, texto: `A moeda da Arena. Você aposta com ela nos lutadores, recebe aposta × odd quando acerta, e compra cosméticos na Boutique. Ela tem duas partes: o bônus (do cadastro, do login e dos desafios), que nunca sai da sua conta, e a parte transferível (PC-T), a única que passa entre jogadores — nas Trocas e no Mercado.` },
        { termo: `${n.coinS} ${n.coin}`, texto: `A moeda das Rotas. Cai nas runs, nas expedições da Rota OFF e na Jornada (a primeira vitória em cada nó paga ${PVE.PRIMEIRA.rota} numa rota e ${PVE.PRIMEIRA.ginasio} num ginásio), e compra bolas, poções e o resto da Loja. Não aposta e não passa para outro jogador.` },
        { termo: 'PC-T, de onde vem', texto: `A primeira vitória em cada ginásio da Jornada dá ${PCT_JORNADA.insignia} PC-T; cada selo da Liga, ${PCT_JORNADA.selo}; o título de campeão, ${PCT_JORNADA.final} — uma vez na vida da conta. Depois disso, ele vem de vender no Mercado e de trocar. O da Jornada só pode ser usado depois de ${PCT_JORNADA.maturidadeDias} dias de conta.` },
        { termo: n.material, texto: `Não é dinheiro: é material. Junta-se nas Rotas e troca-se por itens que dinheiro não compra.` },
      ],
      ir: [{ rotulo: 'ver a Loja das Rotas', view: 'viewIdle' }, { rotulo: 'apostar na Arena', view: 'viewArena' }] },

    { id: 'rotas', titulo: 'As Rotas', resumo: 'Onde a sua equipe luta, ganha XP e encontra criaturas para capturar.',
      itens: [
        { termo: 'A run', texto: 'Dez waves seguidas num bioma, que você assiste. Cada wave rende XP, moeda e encontros; a décima tem um chefe. Se a equipe cair, você fica com tudo o que farmou e perde só o baú do estágio.' },
        { termo: 'A stamina', texto: `Cada wave gasta energia de quem foi lutar (até ${STAMINA_MAX}), e ela volta sozinha com o tempo. A vida da luta é outra barra, o HP — a poção cura o HP.` },
        { termo: 'Os estágios', texto: `Cada bioma tem quatro estágios; o seguinte abre quando a sua melhor criatura chega ao nível da porta (${NIVEL_DO_ESTAGIO.join(', ')}). Estágio mais fundo traz criaturas mais raras.` },
        { termo: 'A captura', texto: `Os encontros esperam a bola no quadro "quem apareceu". Cada bola tem a chance escrita no botão. A captura nasce no nível do estágio (${portas}) — nunca abaixo do nível em que a forma dela existe.` },
        { termo: 'A Rota OFF', texto: 'A expedição de quem vai sair: manda a equipe por 45 min, 3 h ou 8 h, e colhe na volta.' },
      ],
      ir: [{ rotulo: 'ir para as Rotas', view: 'viewIdle' }, { rotulo: 'ir para a Rota OFF', view: 'viewRotaOff' }] },

    { id: 'criatura', titulo: 'A criatura: nível, potencial, natureza', resumo: 'Duas criaturas da mesma espécie não são iguais — e você vê por quê.',
      itens: [
        { termo: 'Nível e XP', texto: 'Sobe lutando: nas runs, nas expedições e na Jornada. Muitas espécies evoluem num nível certo.' },
        { termo: 'Potencial (0 a 100)', texto: 'Toda criatura nasce com seis valores escondidos — vida, ataque, defesa, ataque especial, defesa especial e velocidade. O potencial é a soma deles, de 0 a 100: o teto do que ela pode virar. Ele não muda nunca.' },
        { termo: 'Forma', texto: 'Os mesmos seis valores lidos por lado: ofensiva, defesa e velocidade, cada um de 0 a 100. Duas criaturas de potencial igual podem ter formas opostas.' },
        { termo: 'Natureza', texto: 'Sobe um atributo e desce outro (algumas são neutras). Escolha a natureza que combina com os golpes dela.' },
        { termo: '✦ Exemplar', texto: `Cerca de ${Math.round(EXEMPLAR.chance * 100)} em cada 100 nascem com os seis valores altos de saída — o ✦ ao lado do potencial.` },
        { termo: 'Brilhante', texto: 'Muito rara: a mesma espécie com outra cor. Vale mais no Mercado; luta igual.' },
        { termo: 'No Time: o poder', texto: 'O poder do cartão do Time soma quatro partes: nível, espécie, golpes e potencial. Ali o potencial pesa de 0 a 10 — o "potencial +6 (68/100)" quer dizer que um potencial 68 vale 6 pontos de poder.' },
      ],
      ir: [{ rotulo: 'ver o Time', view: 'viewTreino', aba: 'treino:time' }, { rotulo: 'ver o Centro nas Rotas', view: 'viewIdle' }] },

    { id: 'jornada', titulo: 'A Jornada e o Time', resumo: 'Treinadores e ginásios em sequência — sem aposta, só o seu time.',
      itens: [
        { termo: 'Quem luta', texto: 'Lutam três (ou tantos quantos o treinador trouxer), os mais fortes do seu time. A chance aparece antes da luta.' },
        { termo: 'O que paga', texto: `A primeira vitória em cada nó paga moeda das Rotas, bolas, um doce por linha, e ${PVE.XP_POR_NIVEL_DO_RIVAL} de XP por nível do rival a cada um que lutou. Repetir paga uma fração.` },
        { termo: 'Os ginásios', texto: 'Cada ginásio ensina uma coisa (fraqueza de tipo, velocidade, imunidade…), e a dica aparece no painel do nó. Dão a insígnia e PC-T.' },
        { termo: 'A Liga de times', texto: 'O seu time publicado luta contra os de outros jogadores, sem aposta, por pontos de Liga.' },
      ],
      ir: [{ rotulo: 'abrir a Jornada', view: 'viewTreino', aba: 'treino:jornada' }] },

    { id: 'trocas', titulo: 'Trocas entre jogadores', resumo: 'Troca direta com um amigo, pelo nome de treinador dele.',
      itens: [
        { termo: 'Como', texto: 'Escreva o nome do outro treinador e monte o seu lado: criaturas, itens e PC-T (no mínimo 100). Os dois dizem "pronto", tudo trava por 5 minutos, e os dois confirmam — os dois lados mudam de dono juntos. Uma troca aberta por vez; o convite vence em 24 h.' },
        { termo: 'Taxa', texto: `Quem manda PC-T paga ${pct(POLITICA_PILOTO.tradeBps)} por cima (mandar 1.000 custa 1.010), e a taxa sai do jogo. Criatura por criatura não paga nada. Criatura recebida espera 10 minutos para ser trocada de novo.` },
        { termo: 'O que não passa', texto: 'O que veio de bônus fica preso à conta, e o que se faz com ele também (a criatura pega com uma bola presa nasce presa) — a tela avisa "prende" antes de você gastar.' },
      ],
      ir: [{ rotulo: 'abrir as Trocas', view: 'viewPokedex', aba: 'pdx:trocas' }] },

    { id: 'mercado', titulo: 'O Mercado entre jogadores', resumo: 'Compra e venda com preço fixo, em PC-T, entre todos os jogadores.',
      itens: [
        { termo: 'O que se vende', texto: 'Criaturas, bolas, essências, materiais e itens — um anúncio é uma criatura ou um lote, e dura 24 h. A busca filtra por espécie, nível, natureza, potencial mínimo e preço. Não se vendem a inicial, os lendários, nem o que veio de bônus.' },
        { termo: 'Taxas', texto: `Anunciar custa ${pct(POLITICA_PILOTO.anuncioBps)} do preço (não volta se você cancelar); vender custa ${pct(POLITICA_PILOTO.vendaBps)}, descontado de quem vende. As duas saem do jogo. Anúncio mínimo: ${POLITICA_PILOTO.brutoMinimoAnuncio} PC-T.` },
        { termo: 'Ordens de compra', texto: 'Diga o que você quer e quanto paga — por exemplo "uma criatura desta espécie com potencial 70 ou mais" — e quem tiver vende direto para você.' },
      ],
      ir: [{ rotulo: 'abrir o Mercado', view: 'viewPokedex', aba: 'pdx:mercado' }] },

    { id: 'arena', titulo: 'A Arena', resumo: 'Doze lutadores, odds calculadas, trinta segundos para apostar.',
      itens: [
        { termo: 'A pool e as odds', texto: 'Doze lutadores são sorteados, e o servidor simula milhares de batalhas para transformar a chance de cada um em odd, já com a margem da casa.' },
        { termo: 'A aposta', texto: 'Trinta segundos para escolher; dá para trocar de lutador até o tempo acabar. Acertou, recebe aposta × odd.' },
        { termo: 'A luta', texto: 'O clima é revelado depois das apostas, e a batalha que você assiste é a gravação de um resultado já decidido.' },
      ],
      ir: [{ rotulo: 'ir para a Arena', view: 'viewArena' }] },
  ];
}

/* A linha do topo do Mercado: o que ele é, em que se paga, e quanto custa —
   antes, a aba abria direto num formulário de busca. */
export function introDoMercado(pack) {
  const n = nomes(pack);
  return `Compra e venda com preço fixo entre jogadores, paga em PC-T — a parte transferível do ${n.cash}. ` +
         `Anunciar custa ${pct(POLITICA_PILOTO.anuncioBps)} do preço; vender, ${pct(POLITICA_PILOTO.vendaBps)}.`;
}
