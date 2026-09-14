/* A INSTÂNCIA DO JOGADOR — a geração de uma criatura possuída (§7.9, §7.17).
 *
 * Fronteira: entra uma fonte de sorteio, sai uma instância. Não sabe o que é
 * captura, não sabe o que é bioma, não sabe o que é mercado. Puro, sem DOM e
 * sem dependência — mesmo lugar de `engine/progressao.mjs` e pelo mesmo motivo.
 *
 * ── DE ONDE ESTE ARQUIVO VEIO ─────────────────────────────────────────────
 *
 * De `tools/previas/instancia-proposta.mjs`, escrito para o dono do projeto
 * SENTIR os números antes de eles existirem. A prévia rodou 20.000 sorteios e
 * REPROVOU o desenho original antes de ele virar código — ver o EXEMPLAR
 * abaixo. Os valores aqui são os que ele aprovou, não os que eu propus.
 *
 * ── AS TRÊS TRAVAS DA SPEC QUE ESTE DESENHO OBEDECE ───────────────────────
 *
 *   §7.5  a taxa não pode depender de saldo, de valor apostado nem de compra —
 *         e a forma mais segura de garantir isso é a função não ter como saber
 *   §7.9  três eixos rasos: se o jogador não explica para um amigo o que o
 *         treino fez, está complexo demais
 *   §22   RNG próprio, separado do de batalha. Quem chama passa a fonte.
 *
 * ── O QUE NÃO ESTÁ AQUI, E É DECISÃO ──────────────────────────────────────
 *
 * Captura, encontro e evolução são do bloco 1.2, e continuam em
 * `tools/previas/captura-proposta.mjs` até lá. Trazê-las junto faria este
 * bloco entregar mais do que a mensagem do commit diz — que é a regra central
 * do `CLAUDE.md`, e a que custou três versões ao projeto quando faltou.
 */

/* ── O SORTEADOR ───────────────────────────────────────────────────────────
 *
 * Semeado, e isso não é conveniência de teste: é o §P3. A instância precisa ser
 * reproduzível a partir de um número, do mesmo jeito que a rodada é.
 *
 * QUEM CHAMA PASSA A FONTE, e é assim que o §22 fica cumprido por construção:
 * esta função não tem acesso ao RNG da batalha, então não há como misturá-los
 * por descuido. */
export function semente(n) {
  let s = n >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ── AS NATUREZAS VÊM DO PACK, E ISSO FOI O PORTÃO QUE ENSINOU ─────────────
 *
 * A primeira versão deste arquivo trazia a tabela das 25 escrita aqui dentro. O
 * portão `conteudo` reprovou na primeira execução do bloco, e estava certo:
 * nome de natureza é nomenclatura de TEMA, e o §0.3 manda tema morar em
 * `content/`. O motor tem de rodar contra qualquer pack.
 *
 * Serve também ao critério da Gen 2 que o dono do projeto fixou: pack novo traz
 * as naturezas dele, e nem o motor nem o servidor mudam uma linha.
 *
 * FORMA ESPERADA: `[nome, eixoQueSobe, eixoQueDesce]`, com `null` nos dois para
 * neutra. O motor não valida os nomes — ele só sorteia. Quem garante que a
 * tabela é coerente é o teste do pack.
 *
 * O PADRÃO É VAZIO DE PROPÓSITO: gerar sem pack devolve natureza nula em vez de
 * inventar uma. Inventar seria o motor conhecendo tema pela porta dos fundos. */
export const SEM_NATUREZA = { nome: null, sobe: null, desce: null };

/* ── OS SEIS VALORES OCULTOS ───────────────────────────────────────────────
 *
 * Seis, de 0 a 31, como o gênero consagrou. O jogador NUNCA vê os seis.
 *
 * POR QUE UM NÚMERO E NÃO SEIS. O mercado precisa de algo comparável — ninguém
 * compara seis números, todo mundo compara "87 · Adamant". Mas o Potencial
 * sozinho mente: um 87 com os pontos no lugar errado vale menos que um 78 no
 * lugar certo. Daí a FORMA, que dá o significado sem virar planilha e passa no
 * critério do §7.9.
 *
 * A ordem é a mesma dos stats do pack: vida, ataque, defesa, ataque especial,
 * defesa especial, velocidade. */
export const OCULTO_MAX = 31;
export const N_OCULTOS = 6;

/* ── A FORMA, e por que ela e funcao e nao campo guardado ─────────────────
 *
 * Ela agrupa os seis ocultos em tres leituras que o jogador usa de verdade.
 * Tres e nao seis porque e o que cabe num cartao — e e agrupamento, nao
 * perda: o Potencial continua sendo a soma dos seis.
 *
 * DERIVADA e nao guardada, pelo mesmo motivo do `potencial`: guardar dois
 * numeros que saem do mesmo IV e criar duas verdades que divergem no dia em
 * que a formula mudar. Ela vivia dentro de `gerarInstancia` e por isso a tela
 * do idle nao tinha como chegar nela — a criatura salva guarda o IV, e nao a
 * forma. */
export const formaDe = iv => {
  const [hp, atq, def, spa, spd, vel] = iv ?? [0, 0, 0, 0, 0, 0];
  return {
    ofensiva:   Math.round(((atq + spa) / (2 * OCULTO_MAX)) * 100),
    defesa:     Math.round(((hp + def + spd) / (3 * OCULTO_MAX)) * 100),
    velocidade: Math.round((vel / OCULTO_MAX) * 100),
  };
};

export const potencialDe = iv =>
  Math.round((iv.reduce((a, b) => a + b, 0) / (N_OCULTOS * OCULTO_MAX)) * 100);

/* ── O ENCONTRO EXEMPLAR, E A MEDIÇÃO QUE O OBRIGOU A EXISTIR ──────────────
 *
 * O desenho original era seis uniformes e pronto. A PRÉVIA reprovou antes de
 * virar código, e o número é o argumento inteiro:
 *
 *     Potencial ≥ 90     0,01%     um em dez mil
 *     30 dias jogando    melhor = 81, nenhum acima de 90
 *
 * Soma de seis uniformes é uma sineta estreita: quase tudo cai perto de 50 e a
 * cauda é fina demais. A consequência é de produto — **o topo do mercado nunca
 * ganha estoque**, a faixa "excepcional" vira rótulo decorativo, e o jogador
 * nunca sente a virada que o faz voltar amanhã.
 *
 * A saída é a mesma que jogos do gênero usam em encontros especiais: uma fração
 * é EXEMPLAR e nasce com PISO garantido em cada valor oculto. A curva deixa de
 * ser uma sineta e passa a ter duas bocas — a do dia a dia e a do prêmio.
 *
 *     com exemplar 4% / piso 20
 *     p99                85     (era 78)
 *     90+ sai 1 em      690     (era 1 em 10.000)
 *
 * O PISO É POR VALOR OCULTO, e não no Potencial final. Se fosse no total, todo
 * exemplar sairia igual e o mercado teria UM item em vez de uma faixa — dois
 * exemplares precisam poder ser diferentes, um ofensivo e outro veloz.
 *
 * Aprovado pelo dono do projeto em 30/08/2026. */
export const EXEMPLAR = { chance: 0.04, piso: 20 };

export function gerarInstancia(rnd, { especie = null, exemplarConf = EXEMPLAR,
                                      naturezas = [] } = {}) {
  const exemplar = rnd() < (exemplarConf?.chance ?? 0);
  const piso = exemplar ? (exemplarConf?.piso ?? 0) : 0;
  const iv = Array.from({ length: N_OCULTOS },
    () => piso + Math.floor(rnd() * (OCULTO_MAX + 1 - piso)));
  const [hp, atq, def, spa, spd, vel] = iv;
  /* O sorteio da natureza acontece SEMPRE, mesmo com a tabela vazia, para a
     sequência do gerador não mudar de forma quando o pack entra. Sem isto a
     mesma semente daria instâncias diferentes com e sem pack, e a
     reprodutibilidade do §P3 valeria só num dos dois casos. */
  const iN = Math.floor(rnd() * Math.max(1, naturezas.length));
  const nat = naturezas[iN] ?? null;

  return {
    especie,
    iv,                    // oculto do jogador; existe para o servidor
    exemplar,
    potencial: potencialDe(iv),
    natureza: nat ? { nome: nat[0], sobe: nat[1], desce: nat[2] } : { ...SEM_NATUREZA },
    /* Ver `formaDe`, logo acima: uma fonte para os dois lados. */
    forma: formaDe(iv),
    /* Escolhidos DEPOIS, pelo jogador e pelo tempo — não sorteados.
       E são exatamente os que NÃO viajam na venda: é a regra que quebra o laço
       exponencial, e ela vive no bloco do mercado, não aqui. */
    nivel: 1,
    foco: null,
    vinculo: 0,
  };
}
