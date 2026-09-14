/* O QUE A EXPEDIÇÃO TRAZ ALÉM DAS CRIATURAS (bloco 1.2c, §7.13, §0.3).
 *
 * Fronteira: entra um pack, um bioma e um perfil; sai a lista de itens. Puro,
 * sem DOM, sem estado e sem tema — os nomes das bolas e das pedras vêm do pack,
 * e este arquivo só conhece CLASSES.
 *
 * ── A DESCOBERTA QUE DEU SENTIDO AO BLOCO ─────────────────────────────────
 *
 * Medindo antes de escrever, como manda o método, apareceu um número que muda
 * o desenho inteiro:
 *
 *     27 encontros por dia   ·   ~14 bolas por dia   ·   cobre 53%
 *
 * **A bola não cobre os encontros, e isso é a mecânica.** Você vê vinte e sete
 * criaturas e tem tiro para catorze. Qual delas merece a bola boa vira A decisão
 * do idle — e o fragmento de registro, que cai no encontro, é o consolo de quem
 * ficou para trás.
 *
 * Fosse um para um, a captura viraria uma fila de cliques sem escolha. É o mesmo
 * princípio da duração da expedição: o que faz um idle valer a atenção não é a
 * quantidade, é a decisão.
 *
 * ── O MOTOR NÃO SABE O NOME DE NENHUMA BOLA ──────────────────────────────
 *
 * A tabela sorteia CLASSES: bola barata, bola média, bola boa, essência, pedra,
 * elo. Quem transforma "bola barata" num id é o pack, ordenando as dele por
 * multiplicador. Foi assim que o portão `conteudo` do 1.2b obrigou a fazer, e
 * de novo ficou melhor: um pack com cinco bolas em vez de três continua
 * funcionando sem tocar aqui.
 *
 * ── A PEDRA É DO BIOMA, E ISSO É A RAZÃO DE ESCOLHER A ROTA ──────────────
 *
 * `itens[].fonte` já dizia, desde o 1.1, onde cada pedra cai. Aqui isso vira
 * consequência: farmar no Vulcão é como se consegue a Pedra do Fogo, e farmar
 * na Ruína é como se consegue o Elo de Ligação.
 *
 * Sem isso, todo bioma daria tudo e escolher a rota seria escolher a cor do
 * fundo. Com isso, a linha evolutiva do 1.1 passa a ter endereço no mapa.
 *
 * O PESO DE UMA CLASSE IMPOSSÍVEL É REDISTRIBUÍDO, e não perdido: um bioma sem
 * pedra não pode dar "nada" no lugar dela, senão farmar lá renderia menos por
 * um motivo que a tela não explica.
 */

/* Quantos saques por expedição. Mesmo eixo da expedição: o jogo ATIVO rende
   mais por hora, o IDLE rende mais por sessão.

     batida    3 saques /  45 min  =  4,0/h
     trilha    6,5      / 180 min  =  2,2/h
     vigilia  13        / 480 min  =  1,6/h  */
export const ITENS_POR_PERFIL = {
  batida:  [ 2,  4],
  trilha:  [ 5,  8],
  vigilia: [10, 16],
};

/* As classes que a tabela sorteia. `bolaBarata/Media/Boa` são POSIÇÕES na lista
   de bolas do pack, ordenada por multiplicador — nunca ids. */
export const TABELA = [
  { classe: 'bolaBarata', peso: 34 },
  { classe: 'bolaMedia',  peso: 12 },
  { classe: 'bolaBoa',    peso:  3 },
  { classe: 'essencia',   peso: 30, min: 1, max: 3 },
  { classe: 'pedra',      peso:  9 },
  { classe: 'elo',        peso:  1 },
];

const POSICAO = { bolaBarata: 0, bolaMedia: 1, bolaBoa: 2 };

/* As bolas do pack, da mais fraca para a mais forte. Ordenar aqui e não confiar
   na ordem escrita é decisão: um pack que liste as dele em outra ordem não pode
   fazer a bola boa cair no lugar da barata. */
export const bolasOrdenadas = pack =>
  [...(pack?.bolas ?? [])].sort((a, b) => a.mult - b.mult);

/* As pedras que caem NESTE bioma. `nosso: true` marca o item de autoria do
   projeto — o Elo, que substituiu a troca — e ele sai da lista das pedras
   porque tem peso próprio, muito menor. */
export const pedrasDo = (pack, bioma) =>
  (pack?.itens ?? []).filter(i => i.fonte === bioma && !i.nosso);

export const elosDo = (pack, bioma) =>
  (pack?.itens ?? []).filter(i => i.fonte === bioma && i.nosso);

/* O que cada classe pode virar neste bioma. Devolve `null` quando a classe é
   impossível aqui — e é esse `null` que dispara a redistribuição do peso. */
function resolver(pack, bioma, classe, ctx = {}) {
  const { estagio = 1, vies = 0, cabe = null, peso: pesoDe = () => 1, rnd = () => 0.5 } = ctx;
  if (classe in POSICAO) {
    const bolas = bolasOrdenadas(pack);
    const b = bolas[POSICAO[classe]] ?? bolas[bolas.length - 1];
    return b ? { classe: 'bola', id: b.id, rotulo: b.rotulo, quantidade: 1 } : null;
  }
  if (classe === 'essencia') return { classe: 'essencia', quantidade: 1 };
  if (classe === 'pedra') {
    /* ── O CATALOGO MANDA, E O PACK ANTIGO E A RESERVA (bloco 1.12) ──────
       Ate aqui a classe `pedra` devolvia a primeira pedra do bioma, sempre a
       mesma. Com o catalogo, ela devolve QUALQUER item de porta `drop` que
       caiba no bioma e no estagio — pedras e held items juntos, pesados pela
       MESMA raridade das criaturas.

       O caminho antigo fica como reserva: um pack sem catalogo continua
       funcionando, e o dia de escrever o segundo pack nao vira reescrita. */
    const doCat = itensQueCaem(pack, { bioma, estagio, cabe });
    if (doCat.length) {
      const ordem = (pack?.raridade ?? []).map(([id]) => id);
      const pesos = doCat.map(i => pesoDe(i.faixa, vies, ordem));
      const tot = pesos.reduce((a, b) => a + b, 0);
      if (tot > 0) {
        let r = rnd() * tot, esc = doCat[doCat.length - 1];
        for (let k = 0; k < doCat.length; k++) { r -= pesos[k]; if (r <= 0) { esc = doCat[k]; break; } }
        return { classe: 'item', id: esc.id, rotulo: esc.nome, quantidade: 1 };
      }
    }
    const p = pedrasDo(pack, bioma);
    return p.length ? { classe: 'item', id: p[0].id, rotulo: p[0].rotulo, quantidade: 1 } : null;
  }
  if (classe === 'elo') {
    const e = elosDo(pack, bioma);
    return e.length ? { classe: 'item', id: e[0].id, rotulo: e[0].rotulo, quantidade: 1 } : null;
  }
  return null;
}

/* ── O QUE CAI AQUI, NESTA PROFUNDIDADE (bloco 1.12) ──────────────────────
 *
 * O dono mandou o catalogo inteiro e pediu a analise:
 *
 *   > "com a variedade nova de stages por bioma, voce deve fazer analise de
 *   >  possivel drop baseado em rate % com raridade do item"
 *
 * A resposta e nao inventar escala nenhuma: **o item usa a MESMA raridade da
 * criatura.** `comum`, `incomum`, `raro`, `muitoRaro` — os nomes que o pack ja
 * declara, os mesmos que o estagio ja filtra, os mesmos pesos.
 *
 * Com isso, tres coisas caem no lugar sem codigo novo:
 *
 *     o ESTAGIO filtra item pelo mesmo criterio que filtra criatura
 *     o PERFIL enviesa o saque como ja enviesa o encontro
 *     a TELA mostra a chance do item pela mesma funcao que mostra a da criatura
 *
 * Duas escalas de raridade no mesmo jogo seriam duas tabelas para manter, duas
 * telas para explicar, e a palavra "raro" querendo dizer coisas diferentes em
 * lugares diferentes.
 *
 * ── E SO CAI O QUE TEM A PORTA `drop` ────────────────────────────────────
 *
 * O catalogo declara por qual porta cada item entra no jogo. O que se troca por
 * Essencia, o que vem do bau da Torre e o que se compra em PokeCoin NAO caem —
 * e essa e a distincao economica inteira do bloco, expressa num filtro de uma
 * linha. Um item que caisse E fosse vendido teria a porta mais barata vencendo,
 * e a outra viraria decoracao. */
export function itensQueCaem(pack, { bioma, estagio = 1, cabe = null }) {
  const cat = pack?.catalogo ?? [];
  return cat.filter(i =>
    i.porta === 'drop' &&
    (!cabe || cabe(i.faixa, estagio)) &&
    (!i.fonte || i.fonte === bioma));
}

/* A chance de cada item, para a tela mostrar ANTES de gastar as horas. Mesma
   forma da `previaDeEncontros`: devolve PORCENTAGEM, porque peso e um numero
   interno que nao significa nada sozinho. */
export function previaDeItens(pack, { bioma, estagio = 1, vies = 0, cabe = null, peso }) {
  const lista = itensQueCaem(pack, { bioma, estagio, cabe });
  if (!lista.length) return [];
  const ordem = (pack?.raridade ?? []).map(([id]) => id);
  const pesos = lista.map(i => peso(i.faixa, vies, ordem));
  const total = pesos.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return lista.map((i, n) => ({ ...i, chance: (pesos[n] / total) * 100 }))
    .sort((a, b) => b.chance - a.chance);
}

/* A tabela já filtrada para um bioma, com os pesos das classes impossíveis
   REDISTRIBUÍDOS proporcionalmente entre as que sobraram.
   Exportada porque o teste mede a distribuição, e porque a tela do 1.3 vai
   querer mostrar "o que cai aqui" antes de o jogador gastar oito horas. */
export function tabelaDo(pack, bioma, ctx = {}) {
  const viva = TABELA.filter(l => resolver(pack, bioma, l.classe, ctx));
  const total = viva.reduce((a, l) => a + l.peso, 0);
  if (!total) return [];
  const cheio = TABELA.reduce((a, l) => a + l.peso, 0);
  const fator = cheio / total;
  return viva.map(l => ({ ...l, peso: l.peso * fator }));
}

/* Quantos saques esta expedição rende. */
export function quantosItens(rnd, perfil) {
  const faixa = ITENS_POR_PERFIL[perfil];
  if (!faixa) return 0;
  const [min, max] = faixa;
  return min + Math.floor(rnd() * (max - min + 1));
}

/* O saque de UMA expedição.
 *
 * A essência sai em quantidade variável e as outras classes em uma unidade: é a
 * moeda, e moeda que cai sempre igual não tem textura nenhuma. */
/* ── O FOCO DA EQUIPE MEXE EM DUAS COISAS, E NAO NUMA (1.16) ──────────────
 *
 *     focoItemRaro   o SORTUDO pesa mais as classes raras da tabela
 *     focoMaterial   o TRILHEIRO rende mais Essencia por queda
 *
 * Dois numeros porque sao duas perguntas — "o QUE caiu" e "QUANTO caiu". Um so
 * multiplicando tudo faria o Sortudo tambem trazer mais material, e aí ele e o
 * Trilheiro deixariam de ser uma escolha entre dois.
 *
 * Os dois vem com padrao 1: quem chamava antes chama igual e recebe igual. */
export function sortearItens(rnd, { pack, bioma, perfil, estagio = 1, vies = 0, cabe = null,
                                    peso = null, focoItemRaro = 1, focoMaterial = 1 }) {
  const ctx = { estagio, vies, cabe, peso: peso ?? (() => 1), rnd };
  const cru = tabelaDo(pack, bioma, ctx);
  if (!cru.length) return [];
  /* O Sortudo levanta as classes que NAO sao material — a Essencia e o volume,
     e volume nao e sorte. Sem esta separacao, "mais sorte" viraria "mais de
     tudo", que e o mesmo que nada. */
  const f = Number(focoItemRaro) || 1;
  const tabela = f === 1 ? cru
    : cru.map(l => (l.classe === 'essencia' ? l : { ...l, peso: l.peso * f }));
  const total = tabela.reduce((a, l) => a + l.peso, 0);
  const quantos = quantosItens(rnd, perfil);

  const saida = [];
  for (let n = 0; n < quantos; n++) {
    let r = rnd() * total, escolhida = tabela[tabela.length - 1];
    for (const l of tabela) { r -= l.peso; if (r <= 0) { escolhida = l; break; } }
    const item = resolver(pack, bioma, escolhida.classe, ctx);
    if (!item) continue;
    if (escolhida.classe === 'essencia') {
      const { min = 1, max = 1 } = escolhida;
      const bruto = min + Math.floor(rnd() * (max - min + 1));
      /* O sorteio vem PRIMEIRO e o foco multiplica depois, pela mesma razao
         que nos encontros: mexer na faixa consumiria o gerador de forma
         diferente e a semente deixaria de reproduzir a colheita (§25.2). */
      item.quantidade = Math.max(1, Math.round(bruto * (Number(focoMaterial) || 1)));
    }
    saida.push(item);
  }
  return saida;
}

/* O saque agrupado, que é o formato que a tela e o banco querem: uma linha por
   id, com a soma. Guardar vinte linhas de "uma bola barata" seria vinte escritas
   onde cabe uma. */
export function agrupar(itens) {
  const mapa = new Map();
  for (const i of itens) {
    const chave = i.classe === 'essencia' ? 'essencia' : `${i.classe}:${i.id}`;
    const antes = mapa.get(chave);
    if (antes) antes.quantidade += i.quantidade;
    else mapa.set(chave, { ...i });
  }
  return [...mapa.values()];
}
