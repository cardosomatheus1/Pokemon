/* A COLHEITA DE UMA EXPEDIÇÃO (camada 3).
 *
 * Saiu do `idle-dados.mjs` no L-162, quando aquele arquivo passou das 600
 * linhas — e a divisão foi por RESPONSABILIDADE, e não por tamanho, que é o
 * que o portão dos módulos cobra.
 *
 * ── AS DUAS RESPONSABILIDADES QUE ESTAVAM JUNTAS ─────────────────────────
 *
 *     GUARDAR E CONSULTAR   o formato no disco, a leitura tolerante, quem
 *                           existe, quanta stamina tem, quem está em campo
 *     LIQUIDAR              o que uma expedição terminada PAGA: encontros,
 *                           itens, moeda, XP, vínculo, treino do banco
 *
 * A primeira responde perguntas e a segunda credita. Ficaram juntas porque
 * nasceram no mesmo bloco, não porque sejam a mesma coisa — e a segunda é a
 * que cresce a cada bloco de economia, porque toda porta nova de ganho passa
 * por aqui. Era ela que ia empurrar o arquivo para fora do teto de novo.
 *
 * ── O CICLO COM O `idle-dados.mjs` É DE PROPÓSITO ─────────────────────────
 *
 * Este arquivo importa de lá (`pronta`, `acharCriatura`, `hidratar`) e é
 * reexportado por lá. É a mesma forma do `idle-lance.mjs` e do
 * `idle-bolsa.mjs`, e existe pelo mesmo motivo: o resto do jogo continua
 * conhecendo `colher` pelo endereço de sempre. Uma divisão interna que obriga
 * doze arquivos a trocar de `import` não é divisão, é mudança de API.
 *
 * O QUE NÃO MUDOU: a regra continua fora daqui. Teto, chance, raridade e
 * curva são `engine/`; este arquivo pergunta e credita.
 */
import { novaRaiz, derivar } from '../../engine/seed.mjs';
import { efeitosDa } from '../../engine/foco.mjs';
import { semente } from '../../engine/instancia.mjs';
import { PERFIS, sortearEncontros, pesoDaRaridade } from '../../engine/expedicao.mjs';
import { sortearItens, agrupar } from '../../engine/drops.mjs';
import { moedasDa, idDaMoeda, idDoMaterial } from '../../engine/economia-idle.mjs';
import { viesFinal, cabeNoEstagio, ESTAGIOS_POR_BIOMA,
         nivelDoTopo } from '../../engine/estagios.mjs';
import { batalhasDa } from '../../engine/npc.mjs';
import { xpDaExpedicao, vinculoDaExpedicao, creditar } from '../../engine/nivel-criatura.mjs';
import { FRAGMENTOS_POR_ENCONTRO } from '../../engine/captura.mjs';
import { creditarTreino } from './idle-banco.mjs';
import { pronta, acharCriatura, hidratar } from './idle-dados.mjs';

/* ── A COLHEITA ────────────────────────────────────────────────────────────
 *
 * A SEMENTE NASCE AQUI, e não no início — a mesma decisão do 1.2d. Se ela
 * existisse desde o começo, o resultado ficaria horas guardado antes de o
 * jogador colher, e quem o lesse poderia cancelar a expedição ruim. No
 * navegador isso é ainda mais fácil: `localStorage` está a um F12 de distância.
 *
 * A recusa vem ANTES de qualquer crédito. Colher duas vezes não pode dobrar o
 * saque nem pela metade. */
export function colher(e, { pack, id, agora, raiz = novaRaiz() }) {
  const x = e.expedicoes.find(y => y.id === id);
  if (!x) throw new Error('expedição não existe');
  if (!pronta(x, agora)) throw new Error('a expedição ainda não terminou');
  if (x.colhidaEm) throw new Error('esta expedição já foi colhida');

  x.colhidaEm = agora;
  x.semente = String(raiz);

  /* ── O FOCO DA EQUIPE (1.16) ────────────────────────────────────────
     Calculado UMA vez e passado aos tres sorteios. Recalcular em cada um
     abriria a porta para os tres discordarem no dia em que a conta mudasse —
     e o jogador veria encontros de uma equipe com o saque de outra. */
  const equipeFoco = (x.equipe ?? []).map(id => acharCriatura(e, id)).filter(Boolean);
  const efeitos = efeitosDa(equipeFoco, x.perfil);

  /* `membros` é o que faz concentrar valer a pena (L-140): mandar dois no
     mesmo bioma custava o dobro de stamina e trazia os mesmos itens. */
  const quantosForam = (x.equipe ?? []).length || 1;
  const encontros = sortearEncontros(semente(derivar(raiz, 'encontro')),
    { pack, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio ?? 1, efeitos,
      membros: quantosForam });
  /* O SAQUE TAMBEM CONHECE O ESTAGIO (1.12). Sem isso o catalogo novo seria
     filtrado por um estagio fixo em 1, e nenhuma pedra cairia nunca — as
     pedras sao `raro`, e o estagio 1 so tem comum e incomum. */
  const itens = agrupar(sortearItens(semente(derivar(raiz, 'saque')), {
    pack, bioma: x.bioma, perfil: x.perfil, estagio: x.estagio ?? 1,
    vies: viesFinal(PERFIS[x.perfil]?.vies ?? 0, x.estagio ?? 1),
    cabe: cabeNoEstagio, peso: pesoDaRaridade,
    /* O Sortudo pesa mais o item raro; o Trilheiro rende mais material. Sao
       DUAS perguntas diferentes — "o que caiu" e "quanto caiu" — e por isso
       dois numeros, e nao um so multiplicando tudo. */
    focoItemRaro: efeitos.itemRaro, focoMaterial: efeitos.material,
  }));

  for (const it of itens) {
    /* A classe `essencia` do motor guarda sob o id que o PACK dá ao material —
       que hoje é `essencia` e continua sendo, porque a Essência mudou de PAPEL
       e não de nome (L-095). É essa igualdade que faz nenhum saldo salvo
       precisar ser convertido, e é a razão de este bloco vir ANTES da loja. */
    const chave = it.classe === 'essencia' ? idDoMaterial(pack) : it.id;
    e.bolsa[chave] = (e.bolsa[chave] ?? 0) + it.quantidade;
  }
  /* ── O DINHEIRO NÃO É SORTEADO NA TABELA: É PAGO POR ENCONTRO ──────────
   *
   * Ramo próprio da semente da colheita, e não um pedaço do saque. Os dois
   * respondem perguntas diferentes — "quantos itens caíram" e "quanto você
   * ganhou" — e amarrá-los faria um mexer no outro sem que ninguém quisesse.
   *
   * Auditável do mesmo jeito (§25.2): a semente nasce AQUI, na colheita, e não
   * na partida. Guardada antes, ela seria o resultado exposto a um F12 de
   * distância.
   *
   * A CHAVE VEM DO PACK. O motor devolve um número; o nome sob o qual ele é
   * guardado é do tema, e o portão `conteudo` já cobrou isso quatro vezes. */
  const moedas = moedasDa(semente(derivar(raiz, 'moeda')),
    { perfil: x.perfil, encontros: encontros.length });
  if (moedas > 0) {
    const chave = idDaMoeda(pack);
    e.bolsa[chave] = (e.bolsa[chave] ?? 0) + moedas;
  }
  x.moedas = moedas;


  /* ── E A CRIATURA VOLTA DIFERENTE (bloco 1.14, fecha a L-099) ──────────
   *
   * `nivel` e `vinculo` eram gravados na criacao e nunca escritos depois. Tres
   * numeros parados desde o 1.1, e dois deles bloqueando coisa de verdade: a
   * evolucao (`exige: { nivel: 16 }`) e os stages (L-084).
   *
   * So quem FOI ganha. Deixar a caixa inteira subir junto tiraria a razao de
   * escolher quem vai — e escolher e o coracao do idle.
   *
   * O XP e DETERMINISTICO (nao usa a semente): experiencia nao e loteria. O
   * saque varia porque a graca dele e abrir e ver; o XP nao varia porque o
   * jogador precisa poder planejar "mais duas Vigilias e ele evolui". */
  /* ── ALGUNS ENCONTROS ERAM TREINADORES (bloco 1.7b) ────────────────────
   *
   * A batalha OCUPA o encontro: em vez de uma criatura para capturar, veio um
   * treinador. Por isso ela e resolvida ANTES de os pendentes serem gravados —
   * o que virou batalha nao vira bola.
   *
   * Ramo proprio da semente, como o dinheiro e os encontros: tres perguntas
   * diferentes, tres ramos. Amarrar dois faria um mexer no outro sem que
   * ninguem quisesse. */
  const membrosDaEquipe = (x.equipe ?? []).map(id => acharCriatura(e, id)).filter(Boolean);
  const xpUnitario = xpDaExpedicao({ perfil: x.perfil, encontros: 1 });
  const npc = batalhasDa(semente(derivar(raiz, 'treinador')), {
    encontros: encontros.length, estagio: x.estagio ?? 1,
    nivelEquipe: nivelDoTopo(membrosDaEquipe.map(hidratar)), xpBase: xpUnitario,
  });
  /* Os que viraram batalha saem da fila de captura, e saem do FIM — a ordem do
     sorteio ja e aleatoria, entao cortar do fim nao vicia nada e mantem a
     colheita reproduzivel a partir da mesma semente. */
  const selvagens = npc.quantas ? encontros.slice(0, encontros.length - npc.quantas) : encontros;
/* O material da vitoria vai para a MESMA chave do material do saque: a
     Essencia nao muda de nome por ter vindo de uma batalha. */
  if (npc.material > 0) {
    const km = idDoMaterial(pack);
    e.bolsa[km] = (e.bolsa[km] ?? 0) + npc.material;
  }
  x.npc = { quantas: npc.quantas, vitorias: npc.vitorias, material: npc.material };

  const ganhoXp = xpDaExpedicao({ perfil: x.perfil, encontros: selvagens.length }) + npc.xpExtra;
  const ganhoVinculo = vinculoDaExpedicao({ minutos: PERFIS[x.perfil]?.minutos ?? 0 });
  const subiram = [];
  for (const id of x.equipe ?? []) {
    const c = e.criaturas.find(y => y.id === id);
    if (!c) continue;
    const novo = creditar(c, { xp: ganhoXp, vinculo: ganhoVinculo });
    c.xp = novo.xp; c.nivel = novo.nivel; c.vinculo = novo.vinculo;
    if (novo.subiu > 0) subiram.push({ id, para: novo.nivel, quantos: novo.subiu });
  }
  x.xp = ganhoXp;

  /* E QUEM FICOU NO BANCO TREINOU — o TRAINER OFF, a outra metade do nome que
     o dono deu à aba. A conta e o porquê moram em `idle-banco.mjs`; aqui só se
     registra o que ele devolveu, para o relatório da colheita poder mostrar. */
  const banco = creditarTreino(e, x);
  subiram.push(...banco.subiram);
  x.treino = banco.treino;

  /* O FRAGMENTO DE POKÉDEX CAI NO ENCONTRO, e não na captura (bloco 1.2b). */
  for (const en of selvagens)
    e.registro[en.dex] = (e.registro[en.dex] ?? 0) + FRAGMENTOS_POR_ENCONTRO;

  /* Os encontros ficam PENDENTES: eles ainda precisam de bola, e a bola é do
     bloco 1.3c. Guardar aqui é o que impede a colheita de ser destrutiva — o
     jogador pode fechar a aba e voltar sem perder o que apareceu. */
  const pendentes = selvagens.map((en, i) => ({
    chave: `${x.id}:${i}`, expedicao: x.id, dex: en.dex, raridade: en.raridade,
    bioma: x.bioma, em: agora,
  }));
  e.encontros.push(...pendentes);

  /* QUANTOS ENCONTROS ESTA COLHEITA RENDEU. É o que o teto diário conta a
     partir do D-052 — guardado na própria expedição para a soma do dia ser uma
     leitura, e não uma reconstrução a partir da lista de pendentes (que o
     jogador esvazia jogando bola).

     ── E CONTA O TOTAL SORTEADO, NÃO OS SELVAGENS (bloco 1.7b) ─────────────
     A primeira versão do 1.7b contava `pendentes.length`, e isso ABRIA um
     vazamento que o desenho inteiro existia para fechar: uma Vigília no estágio
     4 com três batalhas contaria 9 em vez de 12, e quem vai fundo ganharia
     encontros a mais por dia. O §P5 pela porta dos fundos, sem loja nenhuma.

     "O NPC ocupa o encontro" quer dizer exatamente isto: o encontro FOI GASTO —
     ele só entregou um treinador em vez de uma criatura. Achado pela sabotagem
     dirigida, e não por mim: o defeito S679 passou, e ao investigar por que a
     suíte não o pegava eu encontrei o defeito de verdade ao lado dele. */
  x.encontros = encontros.length;

  return { expedicao: x.id, semente: String(raiz), encontros: pendentes, itens,
           moedas, xp: ganhoXp, vinculo: ganhoVinculo, subiram, npc,
           treino: x.treino };
}
