/* O FOCO — a única coisa da criatura que sai do JOGADOR (bloco 1.16, camada 0).
 *
 * ── AS TRÊS ORIGENS, E POR QUE ESTA FALTAVA ──────────────────────────────
 *
 * Desde o bloco 1.1 a criatura se define por três coisas de origens diferentes:
 *
 *     SORTE     o potencial, sorteado no nascimento    — pronto desde o 1.1
 *     TEMPO     nível e vínculo, que sobem farmando    — pronto no 1.14
 *     ESCOLHA   o foco                                 — esta gaveta, vazia
 *
 * `criar()` gravava `foco: null` e nada nunca escrevia nela. O comentário
 * original já dizia o porquê: *"escolhidos DEPOIS, pelo jogador e pelo tempo —
 * não sorteados"*. Nível e vínculo vêm do tempo e chegaram com a expedição. O
 * foco vem da escolha, e escolha precisa de uma tela que a ofereça.
 *
 * Sem ele, duas criaturas da mesma espécie com o mesmo potencial são idênticas
 * para sempre, e não existe nada que o jogador decida sobre elas.
 *
 * ── QUANDO SE ESCOLHE: NÍVEL 12, E NÃO ANTES NEM DEPOIS ──────────────────
 *
 *     na CAPTURA          escolher sem saber nada não é decisão — é sorteio
 *                         com passos a mais
 *     na EVOLUÇÃO FINAL   tarde demais: o jogador já farmou quarenta horas e já
 *                         decidiu sozinho para que aquele bicho serve; o jogo
 *                         só carimbaria
 *   > no NÍVEL 12         é onde o ESTÁGIO 2 abre. Ele já viu o bicho render,
 *                         já sabe se é rápido ou resistente, e ainda tem
 *                         oitenta e oito níveis para aproveitar a escolha
 *
 * E a escolha ESPERA. Passar do 12 não trava nada: aparece a marca no cartão, e
 * o jogador escolhe quando quiser — inclusive nunca. Um bicho sem foco farma
 * como sempre farmou; ele só não tem o bônus.
 *
 * ── A TROCA CUSTA TEMPO, E O TEMPO É DA CRIATURA ─────────────────────────
 *
 * Quarenta e oito horas sem ir a campo. Grátis em moeda, e as três alternativas
 * foram descartadas por motivo, não por gosto:
 *
 *     grátis e instantâneo   o foco deixa de ser escolha e vira um botão que se
 *                            aperta antes de cada expedição
 *     caro em DINHEIRO       cai no §25.1 e vira pay-to-win: quem paga testa
 *                            todos, quem não paga escolhe uma vez e reza
 *   > caro em TEMPO          experimenta-se, mas planeja-se antes — e o custo é
 *                            exatamente o mesmo para todo mundo
 *
 * ── ONDE ELE MORA ─────────────────────────────────────────────────────────
 *
 * Camada 0, sem DOM e sem `Date.now()`. `agora` entra por parâmetro pelo mesmo
 * motivo da stamina: relógio lido aqui dentro é teste que só passa às vezes.
 *
 * E sem identificador de franquia: "batedor" e "vigia" são papéis de equipe, do
 * mesmo jeito que "clareira" é forma de paisagem. O pack dá o tema; este arquivo
 * dá a função.
 */

/* ── OS CINCO ────────────────────────────────────────────────────────────
 *
 * Três saem do pedido do dono — um por perfil de farm. Os dois últimos são
 * recomendação minha, e cada um resolve uma coisa que hoje não tem resposta:
 *
 *   o SORTUDO   separa "achar bicho raro" de "achar ITEM raro". Hoje as duas
 *               andam coladas, e quem quer a Pedra do Fogo é obrigado a jogar
 *               como quem quer criatura rara.
 *
 *   o GUIA      é o único que NÃO FUNCIONA SOZINHO, e é isso que o torna o mais
 *               importante da lista. Com ele a pergunta deixa de ser "que bicho
 *               é esse?" e vira "com quem ele vai?" — que é onde "build" existe
 *               de verdade, em vez de ser um adjetivo.
 *
 *               Efeito de lado, e é o argumento do dono sobre o mercado: um Guia
 *               de nível alto é INÚTIL para quem já tem um e valioso para quem
 *               não tem. Isso é exatamente o que faz uma coisa ter preço.
 */
export const FOCOS = ['batedor', 'trilheiro', 'vigia', 'sortudo', 'guia'];

export const NIVEL_PARA_ESCOLHER = 12;
export const HORAS_DE_TROCA = 48;
export const MS_DE_TROCA = HORAS_DE_TROCA * 3600 * 1000;

/* ── O QUE CADA UM FAZ ────────────────────────────────────────────────────
 *
 * Os números são multiplicadores sobre o que a expedição já entrega, e todos os
 * pares têm CUSTO. Um foco que só some é um bônus com nome bonito: ele não faz
 * ninguém escolher nada, porque não há o que perder.
 *
 *   BATEDOR    +30% de encontros na Batida, −20% de material
 *              corre, e nao para para catar — e o farm de quem esta online
 *   TRILHEIRO  +35% de material, −15% de encontros
 *              para para catar, e a Essencia e o que se troca por item
 *   VIGIA      −20% de encontros na Vigília, e UM encontro garantido da
 *              faixa mais rara do estágio — pouco, e raro. Ver o D-073 abaixo:
 *              a primeira versão dava viés, e o teto engolia.
 *   SORTUDO    +40% de peso nos itens raros, −15% de material
 *              não mexe em criatura nenhuma: só no que cai no chão
 *   GUIA       +25% de encontros PARA OS OUTROS, e zero para si
 *
 * O par do Batedor e do Vigia é simétrico de propósito: eles não são "melhor" e
 * "pior", são as duas pontas da mesma troca que os PERFIS já oferecem. O foco
 * deixa o jogador exagerar a ponta que ele já escolheu.
 *
 * ── DUAS CORREÇÕES QUE A PRIMEIRA MEDIÇÃO OBRIGOU ────────────────────────
 *
 * Rodei a tabela antes de escrever teste, e ela mostrou duas coisas erradas:
 *
 *   1. O BATEDOR NA VIGÍLIA levava o −0,15 de viés SEM o +30% de encontros —
 *      castigo puro por usar a criatura fora do lugar dela. Está errado pelo
 *      mesmo motivo que a penalidade de tipagem está (ver L-108): o jogador
 *      passa a manter uma equipe por perfil ou a se sentir jogando errado.
 *
 *      Agora o foco de perfil é NEUTRO fora do perfil dele — nem bônus, nem
 *      custo. Uma regra em vez de duas: *o foco de perfil só vale no perfil
 *      dele; os outros valem sempre*.
 *
 *   2. O TRILHEIRO E O SORTUDO eram PURO GANHO, contra a regra escrita três
 *      parágrafos acima. Foco sem custo não faz ninguém escolher nada — não há
 *      o que perder, então pega-se o maior número. Cada um ganhou o custo que
 *      a própria fantasia dele já sugeria: quem cata material presta menos
 *      atenção em quem passa, e quem caça a coisa rara ignora o volume.
 *
 * ── E UMA TERCEIRA, QUE A SABOTAGEM DIRIGIDA ACHOU (D-073) ───────────────
 *
 * O Vigia trocava −20% de encontros por +0,30 de viés. **O viés era comido pelo
 * teto**, e o foco ficava só com o custo:
 *
 *     vigilia estágio 1   1,00 -> 1,30
 *     vigilia estágio 2   1,10 -> 1,30   comido
 *     vigilia estágio 4   1,30 -> 1,30   comido por inteiro
 *
 * `VIES_TETO` é 1,3 e existe porque acima de ~1,4 a raridade INVERTE. Subir o
 * teto para caber o foco quebraria o que o teto protege.
 *
 * Então o benefício sai de onde há folga: o Vigia GARANTE um encontro da faixa
 * mais rara do estágio. Funciona em todo estágio, não encosta no teto, e é
 * melhor que o original por um motivo que não é técnico — **viés é uma
 * probabilidade que o jogador não vê; a garantia ele vê acontecer.**
 *
 * ── E A RAIZ DAS TRÊS: O VIÉS É A ALAVANCA ERRADA PARA O FOCO ────────────
 *
 * Medido, depois de o D-073 aparecer, em 40 colheitas de cada lado:
 *
 *     Batida sem foco      86,9% de comuns
 *     Batida com Batedor   88,2% de comuns   (o -0,15 de vies dele)
 *
 * 1,3 ponto. E ruido, nao custo. E o motivo e estrutural: o PERFIL ja empurra
 * o vies ate perto das duas pontas — a Batida em -1,0, a Vigilia em +1,0 com
 * teto em 1,3. Nas pontas a curva de peso e chata, e somar 0,15 nao move nada.
 *
 *     Uma alavanca que o perfil ja saturou nao serve para o foco.
 *
 * Entao o vies SAIU do sistema de foco inteiro, e todo custo passou a ser algo
 * que se CONTA — encontro ou material. Contagem se mede, se testa e se ve na
 * tela; probabilidade em regiao chata nao faz nenhuma das tres.
 *
 * E o CAMPO saiu junto, e nao so os valores. Enquanto `efeitosDa` devolvia um
 * `vies` que ninguem produzia, o `sortearEncontros` somava um zero eterno — e
 * o Q2 marcou isso na hora: o defeito S713, que apagava essa soma, PASSOU,
 * porque nao havia como ele aparecer.
 *
 *     Um defeito que nao pode ser observado nao e defeito, e o codigo que ele
 *     tentava proteger nao esta protegendo nada.
 */
export const EFEITO = {
  batedor:   { perfil: 'batida',  encontros:  0.30, material: -0.20 },
  vigia:     { perfil: 'vigilia', encontros: -0.20, garantido: 1 },
  trilheiro: { material:  0.35, encontros: -0.15 },
  sortudo:   { itemRaro:  0.40, material:  -0.15 },
  guia:      { aliados:   0.25 },
};

export const BONUS_DO_GUIA = EFEITO.guia.aliados;
export const existe = f => Object.prototype.hasOwnProperty.call(EFEITO, f);

/* ── PODE ESCOLHER? ───────────────────────────────────────────────────────
 *
 * Devolve um motivo, e não só `false`. Recusa sem endereço é o que produziu o
 * D-067: a tela dizia "não dá" e escondia a aritmética que explicava. */
export function podeEscolher(criatura, agora = 0) {
  const nivel = Math.floor(Number(criatura?.nivel) || 1);
  if (nivel < NIVEL_PARA_ESCOLHER)
    return { pode: false, motivo: 'nivelBaixo', falta: NIVEL_PARA_ESCOLHER - nivel };
  if (descansando(criatura, agora))
    return { pode: false, motivo: 'descansando', ate: criatura.descansaAte };
  return { pode: true, trocando: !!criatura?.foco };
}

/* ── DESCANSANDO ──────────────────────────────────────────────────────────
 *
 * Só a TROCA cobra descanso. A primeira escolha é grátis, e isso é decisão: a
 * primeira não desfaz nada — não há o que reaprender. Cobrar por ela seria
 * cobrar por participar. */
export const descansando = (criatura, agora = 0) =>
  Number(criatura?.descansaAte || 0) > Number(agora || 0);

export const faltaDoDescanso = (criatura, agora = 0) =>
  Math.max(0, Number(criatura?.descansaAte || 0) - Number(agora || 0));

/* Aplica a escolha. NÃO MUTA — devolve uma criatura nova, como o `creditar` do
   1.14. É o que deixa a tela desenhar o "antes" e o "depois" lado a lado sem
   ter de desfazer nada, e é o que impede meia-escolha gravada quando algo falha
   no meio. */
export function escolher(criatura, foco, agora = 0) {
  if (!existe(foco)) throw new Error(`foco desconhecido: ${foco}`);
  const { pode, motivo, trocando } = podeEscolher(criatura, agora);
  if (!pode) throw new Error(`não pode escolher agora: ${motivo}`);
  if (criatura.foco === foco) return { ...criatura };
  return {
    ...criatura,
    foco,
    focoEm: agora,
    /* A troca cobra; a primeira escolha, não. */
    descansaAte: trocando ? Number(agora || 0) + MS_DE_TROCA : (criatura.descansaAte ?? 0),
  };
}

/* ── O BÔNUS DA EQUIPE ────────────────────────────────────────────────────
 *
 * A conta é a MÉDIA dos multiplicadores pessoais, e não a soma. Com soma, três
 * Batedores dariam +90% e a decisão viraria "leve três iguais" — que é o
 * contrário de build. Com média, uma equipe toda especializada entrega o efeito
 * cheio do foco (+30%) e uma equipe misturada entrega menos, sem que o tamanho
 * da equipe infle nada.
 *
 * ── O GUIA NÃO SE BENEFICIA DE SI MESMO, E SÓ CONTA UMA VEZ ─────────────
 *
 * Cada membro recebe o bônus de Guia NO MÁXIMO uma vez, por mais Guias que
 * haja. Sem esse teto, empilhar Guias venceria, e o foco cujo ponto inteiro é
 * "leve companheiros diferentes" premiaria levar cópias.
 *
 * Medido, numa Batida com equipe de três:
 *
 *     Batedor · Batedor · Batedor       1,30
 *     Guia    · Guia    · Batedor       1,35
 *   > Guia    · Batedor · Batedor       1,37   <- o melhor
 *     Guia sozinho                      1,00   <- não faz nada
 *
 * Exatamente UM Guia é o ótimo, e isso é ensinável numa frase. */
export function efeitosDa(equipe, perfil) {
  const membros = (equipe ?? []).filter(Boolean);
  const neutro = { encontros: 1, material: 1, itemRaro: 1, garantido: 0 };
  if (!membros.length) return neutro;

  const guias = membros.filter(c => c?.foco === 'guia').length;

  let encontros = 0, material = 0, itemRaro = 0, garantido = 0;
  for (const c of membros) {
    /* O FOCO DE PERFIL É NEUTRO FORA DO PERFIL DELE — o efeito INTEIRO, e não
       só a metade boa. Aplicar o custo e engolir o bônus seria castigo por usar
       a criatura onde o jogador quis usá-la. */
    const bruto = EFEITO[c?.foco] ?? null;
    const e = (bruto?.perfil && bruto.perfil !== perfil) ? null : bruto;

    let meu = 1;
    if (e?.encontros != null) meu += e.encontros;

    /* O Guia levanta os OUTROS. Um Guia só recebe de outro Guia, e uma vez. */
    const guiasQueMeAjudam = guias - (c?.foco === 'guia' ? 1 : 0);
    if (guiasQueMeAjudam > 0) meu += BONUS_DO_GUIA;
    encontros += meu;

    /* VIÉS, MATERIAL e ITEM não passam pelo Guia — ele traz gente, não sorte.
       Somados e divididos pelo mesmo tamanho, pela razão da média acima. */
    material += 1 + (e?.material ?? 0);
    itemRaro += 1 + (e?.itemRaro ?? 0);
    /* A GARANTIA NAO E MEDIA: ela e a MAIOR da equipe.
       Media daria meia garantia com meia equipe, e meio encontro garantido
       nao existe — ou vem um raro, ou nao vem. Um Vigia na equipe garante
       um; tres Vigias continuam garantindo um, pela mesma razao que o Guia
       nao empilha: o foco premia levar DIFERENTES. */
    garantido = Math.max(garantido, e?.garantido ?? 0);
  }

  const n = membros.length;
  return {
    encontros: encontros / n,
    material: material / n,
    itemRaro: itemRaro / n,
    garantido,
  };
}

/* Quantos encontros a equipe entrega, dado o número que a expedição sorteou.
   Arredonda para baixo com piso de 1: um bônus que zera o encontro seria uma
   expedição de oito horas voltando vazia, e nenhum número explica isso na tela. */
export const encontrosCom = (base, efeitos) =>
  Math.max(1, Math.round(Math.max(0, Number(base) || 0) * (efeitos?.encontros ?? 1)));

/* ── O QUE UM FOCO REALMENTE FAZ, NAQUELE LUGAR ───────────────────────────
 *
 * `efeitosDa` responde pela EQUIPE inteira, em números somados e divididos. É
 * o que a colheita precisa. Não é o que uma TELA precisa: ela mostra uma
 * criatura por vez, e a pergunta dela é outra —
 *
 *   > *"este foco, nesta criatura, aqui onde ela está: faz alguma coisa?"*
 *
 * Duas respostas diferentes para duas perguntas diferentes, e nenhuma delas
 * derivável da outra sem desfazer a média.
 *
 * ── POR QUE ISSO PRECISOU EXISTIR ────────────────────────────────────────
 *
 * A coluna da run ia anunciar o foco pelo que ele faz na EXPEDIÇÃO, e dois dos
 * cinco não fazem nada ali:
 *
 *     batedor   `perfil: 'batida'`   — neutro fora da Batida
 *     vigia     `perfil: 'vigilia'`  — neutro fora da Vigília
 *
 * E há uma segunda camada, que é do Avanço e não do motor: o elenco do estágio
 * é FIXO em seis, então `encontros` não muda nada lá — não há encontro a mais
 * para achar. Quem chama diz o que está inerte no lugar dele; este arquivo não
 * conhece o Avanço, e não deve.
 *
 *   > Tela que promete o que não acontece é a tela discordando do motor, e
 *   > numa tela que fica aberta por horas o jogador tem tempo de perceber.
 *
 * Devolve `null` para foco que não existe, `{}` para foco NEUTRO ali, e os
 * pares vivos quando há o que dizer. Os três casos são diferentes de propósito:
 * "não existe" é erro de quem chamou, e "neutro" é resposta legítima. */
export function efeitoVivo(foco, perfil, { inertes = [] } = {}) {
  const bruto = EFEITO[foco];
  if (!bruto) return null;
  /* O FOCO DE PERFIL É NEUTRO FORA DO PERFIL DELE — o efeito INTEIRO, e não só
     a metade boa. É a mesma regra do `efeitosDa`, e ela mora nos dois porque é
     a MESMA linha de código lendo o mesmo campo, não duas cópias de uma ideia. */
  if (bruto.perfil && bruto.perfil !== perfil) return {};
  const vivo = {};
  for (const [chave, valor] of Object.entries(bruto))
    if (chave !== 'perfil' && !inertes.includes(chave)) vivo[chave] = valor;
  return vivo;
}
