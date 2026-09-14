/* O MODO AUSENTE (bloco A7, §7.22.9, camada 0).
 *
 * Fronteira: entra quanto tempo o jogador ficou de olho na tela e quanto ficou
 * fora; sai o que ele pode fazer estando fora. Puro, sem DOM, sem estado e sem
 * tema.
 *
 * ── O QUE O §7.13 VIRA ───────────────────────────────────────────────────
 *
 * As três expedições — 45 min, 3 h, 8 h — continuam inteiras. O que muda é o
 * ENQUADRAMENTO: elas passam a ser o modo de quem vai FECHAR o jogo, e o
 * Avanço é o de quem vai ficar olhando.
 *
 * Palavra do dono, 08/09/2026:
 *
 *   > o modo ROTAS vira a aba AUSENTE, e ela funciona mesmo com a criatura
 *   > de stamina zerada — as três opções de farm continuam disponíveis
 *
 * (A frase dele está inteira na L-145; aqui ela vem parafraseada de propósito —
 *  o original nomeia a franquia, e o motor não pode citá-la nem em comentário.
 *  Sétima vez que o portão `conteudo` me pega nisto, e ele continua certo.)
 *
 * ── E ISSO OBRIGA A TROCAR O QUE ELE COBRA ──────────────────────────────
 *
 * Hoje a expedição custa STAMINA, e stamina é da criatura. Se o modo ausente
 * tem de funcionar com a criatura zerada, então stamina não pode ser o preço
 * dele — senão a frase do dono e a regra do §7.13 se contradizem, e uma das
 * duas vai perder em silêncio.
 *
 * O preço passa a ser a RESERVA, que é a ideia que a referência do dono trouxe
 * e que ele aprovou:
 *
 *     A reserva ENCHE enquanto você joga — 1 h de tela vale 1 h de reserva —
 *     e é GASTA enquanto você está fora. Teto de 12 h.
 *
 * ── POR QUE ELA É MELHOR QUE UM TETO NOVO ───────────────────────────────
 *
 * Ela responde sozinha a pergunta que ficava aberta: *o que impede alguém de
 * só farmar ausente e nunca olhar a tela?*
 *
 *   > O modo ausente passa a ser uma RECOMPENSA POR JOGAR, e não um farm
 *   > paralelo.
 *
 * E ela empilha com o que já existe sem conflito, porque as duas limitam
 * coisas diferentes:
 *
 *     a RESERVA        limita o TEMPO fora
 *     o TETO (§7.13)   limita o RENDIMENTO
 *
 * Nenhum teto novo, nenhuma regra nova de economia. Só um recurso que se ganha
 * fazendo exatamente o que o produto quer que se faça.
 *
 * ── E O RITMO JÁ DIFERENCIA OS DOIS MODOS, MEDIDO ───────────────────────
 *
 * O dono pediu que o ausente rendesse menos que o online. Medido, ele já
 * rende — e por bastante:
 *
 *     Vigília    1,50 encontro/h
 *     Trilha     2,33 encontro/h
 *     Batida     5,33 encontro/h
 *     AVANÇO     9,00 encontro/h
 *
 * Seis vezes a Vigília, quatro vezes a Trilha. **A diferença não precisa ser
 * inventada: ela já vem de o online custar ATENÇÃO.** Cortar números por cima
 * disso puniria duas vezes a mesma escolha.
 *
 * O que diferencia de verdade é QUALITATIVO, e está no `RENDE`, abaixo.
 */

export const RESERVA_MAX_H = 12;
export const RESERVA_POR_HORA_JOGADA = 1;

const numero = (v, p = 0) => (Number.isFinite(Number(v)) ? Number(v) : p);
const horas = ms => Math.max(0, numero(ms) / 3_600_000);

/* Quanto de reserva o jogador tem AGORA. Derivada do que ele jogou e do que já
   gastou — e não guardada como um saldo, pelo mesmo motivo das vagas
   simultâneas do §7.13: enquanto não houver onde escrever, não há o que forjar. */
export function reservaAgora({ msJogados = 0, msGastos = 0 } = {}) {
  const ganho = horas(msJogados) * RESERVA_POR_HORA_JOGADA;
  return Math.max(0, Math.min(RESERVA_MAX_H, ganho - horas(msGastos)));
}

/* Se cabe uma expedição de N minutos. A recusa acontece no CLIQUE, e a tela
   precisa saber quanto falta para poder dizer — "não cabe" sem número manda o
   jogador adivinhar quanto tempo de tela ele deve. */
export function cabeAusente(estado, minutos) {
  const pede = Math.max(0, numero(minutos) / 60);
  const tem = reservaAgora(estado);
  return { cabe: tem >= pede, tem, pede, faltam: Math.max(0, pede - tem) };
}

export function gastarReserva(estado, minutos) {
  const r = cabeAusente(estado, minutos);
  if (!r.cabe)
    throw new Error(
      `a reserva tem ${r.tem.toFixed(1)} h e esta expedição pede ` +
      `${r.pede.toFixed(1)} h — faltam ${r.faltam.toFixed(1)} h. Ela enche ` +
      'jogando: 1 h de tela vale 1 h de reserva.');
  return { ...(estado ?? {}), msGastos: numero(estado?.msGastos) + numero(minutos) * 60_000 };
}

/* ── O QUE CADA MODO RENDE, E É AQUI QUE ELES DIFEREM ────────────────────
 *
 * A diferença é de NATUREZA, e não de multiplicador. Um corte de números diria
 * "o ausente é o mesmo jogo, pior"; a lista abaixo diz que são dois jogos.
 *
 * O que só o ONLINE tem é exatamente o que exige a presença do jogador — e
 * essa coerência é o que faz a escolha ser honesta em vez de arbitrária:
 *
 *     a BOLA na mão      escolher em quem gastar é uma decisão (A6)
 *     a POÇÃO            reagir ao HP caindo é uma decisão (A3)
 *     o CHEFE            a décima wave é um acontecimento que se assiste
 *     o BAÚ              e ele paga o item que salva a run seguinte
 *
 * Tirar qualquer um destes do ausente não é nerf: é reconhecer que ninguém
 * está lá para tomar a decisão. */
export const RENDE = {
  ausente: { encontros: true, item: true, xp: true, vinculo: true,
             bola: false, pocao: false, chefe: false, bau: false },
  avanco:  { encontros: true, item: true, xp: true, vinculo: true,
             bola: true,  pocao: true,  chefe: true,  bau: true },
};

export const rendeNo = modo => RENDE[modo] ?? RENDE.ausente;

/* ── E A REDUÇÃO LEVE QUE O DONO PEDIU ───────────────────────────────────
 *
 * Ele leu a medição acima, concordou com ela, e mesmo assim manteve o pedido:
 *
 *   > "eu ainda acho que a HUNT OFF deve render um pouco menos do que o online
 *   >  [...] não precisa ser nada discrepante, leve redução, quase
 *   >  imperceptível, e mantendo claro o que você já falou"
 *
 * Ele está certo, e o motivo é de PERCEPÇÃO, não de aritmética. A diferença de
 * ritmo (9,0 contra 1,5 por hora) é real, mas ela só existe para quem senta e
 * compara duas tabelas. O jogador que volta de uma Vigília não compara nada —
 * ele vê o que recebeu, e nada naquela tela diz que ele escolheu o modo menor.
 *
 *   > Uma diferença que só aparece na planilha não é uma diferença que o
 *   > jogador sente. Ela é verdadeira e muda; sentir é outra coisa.
 *
 * ── ONDE ELA ENTRA, E ONDE NÃO ENTRA ────────────────────────────────────
 *
 * Nos números CONTÍNUOS — XP e moeda. Ali 10% é exatamente 10%: some no dia a
 * dia e aparece na semana, que é a definição de "quase imperceptível".
 *
 * NÃO entra nos ENCONTROS, e isso é decisão minha com o motivo escrito:
 *
 *     a Batida rende de 3 a 5 encontros. Cortar 10% de 4 dá 3,6 — que ou
 *     arredonda de volta para 4 (não fez nada) ou cai para 3 (tirou 25%).
 *
 * Um corte de 25% é exatamente o "discrepante" que ele pediu para evitar. E há
 * um segundo motivo, mais forte: o encontro é a unidade que o teto do §P5
 * vigia. Mexer nele muda a economia inteira do jogo para resolver uma questão
 * de percepção — que é usar o martelo errado.
 *
 * ── E ELA NÃO PODE VIRAR NERF SEM ALGUÉM DECIDIR ────────────────────────
 *
 * O teste prende o fator entre 0,85 e 0,95. Abaixo disso deixa de ser leve e
 * vira punição por escolher o modo que existe para quem não pode ficar; acima,
 * some por arredondamento e não faz nada. Quem quiser sair da faixa tem de
 * mexer no teste, e aí é decisão em vez de deslize. */
export const FATOR_AUSENTE = 0.9;

/* Aplica a redução no que é contínuo. Devolve inteiro porque XP e moeda são
   contados assim em todo o resto do projeto — e um `4,5 XP` na tela seria a
   primeira fração de um jogo que não tem nenhuma. */
export const rendimentoAusente = v =>
  Math.max(0, Math.round((Number(v) || 0) * FATOR_AUSENTE));

/* ═══════════════════════════════════════════════════════════════════════════
   O TREINO AUSENTE — E ELE TREINA O BANCO
   ═══════════════════════════════════════════════════════════════════════════

   Pergunta do dono, e ele delegou a resposta:

     > "o trainer poderia ser algo diferente, não pode ser sobre upar stats
     >  pois isso será futuramente no laboratório"

   Concordo com a restrição, e ela tem endereço: stats são do laboratório, que
   está CONVERSADO e ainda sem bloco (**L-144**). O custo dele é o lucro da
   arena mais as pedras, e a escada vai de B1 a B7.

   ── A MINHA RECOMENDAÇÃO: ELE TREINA QUEM NÃO SAIU ───────────────────────

   O treino ausente recebe as criaturas que NÃO estão em aventura, e paga em
   VÍNCULO e XP — os dois eixos que já existem e que não são stat.

   O motivo não é temático, é estrutural, e ele resolve um problema que este
   projeto acabou de criar:

     > O idle inteiro se apoia em "o teto do farm é o tamanho da coleção". Mas
     > a segunda criatura nasce no nível 1, e levá-la a um nível útil exige
     > gastar nela os avanços que o jogador queria gastar na primeira.
     >
     > A regra pedia uma coleção, e o jogo não dava por onde criá-la.

   O treino ausente é por onde. Ele não produz encontro — então **não toca o
   teto do §P5** — e não produz item. Produz só o que faz a criatura de banco
   virar criatura de equipe.

   ── E ELE É DE PROPÓSITO MAIS LENTO QUE AVENTURAR ────────────────────────

   Um terço do XP por hora da Batida. Se fosse igual, ninguém aventuraria com a
   segunda criatura — e o modo que existe para viabilizar a coleção passaria a
   substituí-la. */
export const XP_POR_HORA_TREINO = 3;
export const VINCULO_POR_HORA_TREINO = 1;

/* Quem está em aventura NÃO pode estar em treino. Sem esta recusa, a mesma
   criatura renderia nos dois lugares ao mesmo tempo — e o dia dobraria por
   uma porta que ninguém abriu de propósito. */
export function podeTreinar(criatura, emAventura) {
  const id = criatura?.id;
  const ocupada = (emAventura ?? []).some(c => (c?.id ?? c) === id);
  return { pode: !ocupada && id != null,
           motivo: id == null ? 'criatura sem id'
                 : ocupada ? 'esta criatura está em aventura' : null };
}

/* ── A JANELA DO TREINO É A DA EXPEDIÇÃO ─────────────────────────────────
 *
 * O treino do banco é o gêmeo do farm ausente: o jogador manda a expedição e
 * FECHA o jogo. A janela em que o banco treina é exatamente essa.
 *
 * A alternativa seria um saldo de tempo próprio — e ela custa um segundo
 * relógio para responder o que o primeiro já responde. Pior: "desde sempre"
 * pagaria XP infinito a quem nunca abre o jogo, e o modo que existe para
 * viabilizar a coleção viraria a razão de não jogar.
 *
 * ── E POR QUE CADA UM CARREGA A PRÓPRIA MARCA ───────────────────────────
 *
 * Com duas vagas em campo as janelas se CRUZAM, e a hora coberta pelas duas
 * seria paga duas vezes. `treinadoAte` é onde já se pagou; a janela nova
 * começa no maior entre ela e o início da expedição.
 *
 * O teto de XP do dia não pode ser o número de vagas — é o mesmo vazamento
 * que o teto de encontros fecha do outro lado.
 */
export function treinoDaJanela({ criaturas = [], equipe = [], de = 0, ate = 0 } = {}) {
  const fim = numero(ate);
  const abertura = numero(de);
  const foram = new Set((equipe ?? []).map(c => c?.id ?? c));
  const saida = [];
  for (const c of criaturas ?? []) {
    if (c?.id == null || foram.has(c.id)) continue;
    const inicio = Math.max(abertura, numero(c.treinadoAte, abertura));
    /* Zero e negativo caem no mesmo lugar de propósito: janela invertida é
       colheita fora de ordem, e ela não pode creditar nem um NaN — que é pior
       que um zero porque contamina o nível da criatura em silêncio. */
    if (!(fim > inicio)) continue;
    const ganho = treinoDe({ minutos: (fim - inicio) / 60_000 });
    if (ganho.xp <= 0 && ganho.vinculo <= 0) continue;
    saida.push({ id: c.id, minutos: (fim - inicio) / 60_000,
                 xp: ganho.xp, vinculo: ganho.vinculo, ate: fim });
  }
  return saida;
}

export function treinoDe({ minutos } = {}) {
  const h = Math.max(0, numero(minutos) / 60);
  return {
    xp: Math.floor(h * XP_POR_HORA_TREINO),
    vinculo: Math.floor(h * VINCULO_POR_HORA_TREINO),
    /* Explícito, e não omitido: quem ler este objeto tem de VER que o treino
       não faz estas duas coisas. Ausência se lê como esquecimento; zero se lê
       como decisão. */
    encontros: 0,
    itens: 0,
  };
}
