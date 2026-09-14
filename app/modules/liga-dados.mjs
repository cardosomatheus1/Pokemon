/* LIGA DE PREVISÃO — o lado do jogador (R37, Spec §6.8).
 *
 * ── O QUE A LIGA É, E O QUE ELA NÃO É ─────────────────────────────────────
 *
 * O jogador registra um PALPITE sobre quem vence, sem apostar nada, e acumula
 * uma pontuação de ACURÁCIA — não de lucro. O ranking é de quem lê melhor o
 * motor, não de quem ganhou mais.
 *
 * A Spec antecipou isto da V5 para a V2 por uma razão específica, e ela governa
 * este arquivo inteiro: **a Liga não move dinheiro**. É por isso que ela não
 * tem risco regulatório e pôde vir antes dos mercados mútuos. Uma linha aqui
 * que toque saldo, aposta ou ledger destrói a única propriedade que justifica a
 * Liga existir agora — e é o defeito `S498`, plantado de propósito.
 *
 * ── POR QUE ESTE MÓDULO EXISTE, SE O SERVIDOR JÁ TEM `server/liga.mjs` ────
 *
 * Porque o jogo abre com a rede desligada (F0.12), e a Liga não pode ser a
 * única tela que quebra offline. O servidor guarda a temporada COMPARTILHADA —
 * o ranking entre pessoas; este módulo guarda a temporada DE QUEM ESTÁ AQUI.
 *
 * Os dois usam a MESMA conta, importada de `engine/calibracao.mjs`. Isso não é
 * organização: é o que impede o número da tela de divergir do número do
 * ranking. Duas implementações de Brier seriam duas Ligas.
 *
 * ── A DECISÃO DE GUARDAR PREVISÃO PENDENTE SEPARADA DA PONTUADA ───────────
 *
 * Uma previsão nasce PENDENTE e vira PONTUADA quando a rodada termina. São dois
 * estados e não um campo opcional, porque a diferença importa na tela: pendente
 * é promessa, pontuada é resultado, e misturar as duas faria o jogador ver uma
 * média que ainda vai mudar como se fosse final.
 */

import { brier, brierUniforme, erros, habilidade, mediaEncolhida,
         AMOSTRA_MINIMA, VERSAO_PONTUACAO } from '../../engine/calibracao.mjs';

/* A chave segue o prefixo `ar_` do resto do produto (`ar_profile`). O sufixo
   carrega a VERSÃO DA PONTUAÇÃO: se a conta mudar, o histórico antigo não pode
   ser somado com o novo como se fosse a mesma régua — ele fica onde está, e a
   temporada recomeça. Misturar duas réguas num mesmo ranking é a forma mais
   silenciosa de o número mentir. */
export const CHAVE_LIGA = `ar_liga_v${VERSAO_PONTUACAO}`;

/* Teto do histórico guardado. Não é economia de espaço: é a promessa de que a
   tela abre rápido depois de mil rodadas. A MÉDIA não se perde ao podar —
   `soma` e `amostra` são acumuladores, e só as LINHAS do histórico caem. */
export const HISTORICO_MAX = 200;

export const ERRO_PREVISAO = {
  DISTRIBUICAO: 'distribuicao-invalida',
  DUPLICADA:    'ja-previu-esta-rodada',
  SEM_RODADA:   'rodada-desconhecida',
};

const vazio = () => ({
  versao: VERSAO_PONTUACAO,
  soma: 0,          /* soma dos Brier pontuados */
  amostra: 0,       /* quantas rodadas já foram pontuadas */
  somaModelo: 0,    /* o mesmo, para o modelo, na MESMA amostra */
  pendentes: {},    /* roundId → { distribuicao, quando } */
  historico: [],    /* mais recente primeiro */
});

/* ─── persistência ────────────────────────────────────────────────────────
 *
 * Tudo que sai do disco passa por uma normalização, e não por um `JSON.parse`
 * confiante. `localStorage` é editável por quem quiser, e um `amostra: -5`
 * gravado à mão faria a média virar negativa e o ranking inteiro mentir. É a
 * mesma guarda que o `cosmeticoValido` faz para os cosméticos (S70). */
function normalizar(bruto) {
  const b = bruto && typeof bruto === 'object' ? bruto : {};
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const e = vazio();
  /* Versão diferente é temporada diferente: começa do zero em vez de somar
     Brier calculado com outra régua. */
  if (b.versao !== VERSAO_PONTUACAO) return e;
  e.soma = num(b.soma);
  e.amostra = Math.floor(num(b.amostra));
  e.somaModelo = num(b.somaModelo);
  if (b.pendentes && typeof b.pendentes === 'object') {
    for (const [id, p] of Object.entries(b.pendentes)) {
      if (p && Array.isArray(p.distribuicao) && !erros(p.distribuicao, p.distribuicao.length).length)
        e.pendentes[id] = { distribuicao: p.distribuicao.slice(), quando: num(p.quando) };
    }
  }
  if (Array.isArray(b.historico))
    e.historico = b.historico.filter(h => h && Number.isFinite(h.brier)).slice(0, HISTORICO_MAX);
  return e;
}

export function carregar(armazem = globalThis.localStorage) {
  try { return normalizar(JSON.parse(armazem.getItem(CHAVE_LIGA))); }
  catch { return vazio(); }
}

export function salvar(estado, armazem = globalThis.localStorage) {
  try { armazem.setItem(CHAVE_LIGA, JSON.stringify(estado)); } catch { /* cota cheia */ }
  return estado;
}

/* ─── registrar ──────────────────────────────────────────────────────────── */

/* TROCAR O PALPITE ANTES DA RODADA CORRER É PERMITIDO, e isso é decisão, não
 * descuido: enquanto o mercado está aberto o jogador ainda está lendo a rodada,
 * e travar o primeiro clique puniria quem pensou mais. O que NÃO se pode é
 * prever uma rodada já pontuada — daí a checagem no histórico, e não só nas
 * pendentes. */
export function registrar(estado, { roundId, distribuicao }) {
  if (roundId == null || roundId === '') return { erro: ERRO_PREVISAO.SEM_RODADA };
  const d = Array.isArray(distribuicao) ? distribuicao : null;
  const problemas = d ? erros(d, d.length) : ['a distribuição não é uma lista'];
  if (problemas.length) return { erro: ERRO_PREVISAO.DISTRIBUICAO, problemas };
  if (estado.historico.some(h => h.roundId === roundId))
    return { erro: ERRO_PREVISAO.DUPLICADA };

  estado.pendentes[roundId] = { distribuicao: d.slice(), quando: Date.now() };
  return { ok: true, trocou: true };
}

/* ─── pontuar ────────────────────────────────────────────────────────────── */

/* IDEMPOTENTE POR CONSTRUÇÃO. A rodada é retirada de `pendentes` ANTES de a
 * soma ser mexida, então uma segunda chamada não encontra nada e devolve
 * `{ ok:false }` sem tocar em número nenhum. É a mesma disciplina do
 * `pontuarRodada` do servidor, que usa `score IS NULL` nas duas pontas.
 *
 * O jogo pontua a mesma rodada mais de uma vez com facilidade — o laço redesenha,
 * o jogador volta para a aba, a conexão reenvia. Idempotência aqui não é
 * elegância, é a diferença entre uma média correta e uma inflada. */
export function pontuar(estado, { roundId, vencedor, distribuicaoModelo }) {
  const p = estado.pendentes[roundId];
  if (!p) return { ok: false };

  const b = brier(p.distribuicao, vencedor);
  if (b == null) { delete estado.pendentes[roundId]; return { ok: false }; }

  /* O Brier DO MODELO é medido na MESMA rodada e com o MESMO vencedor. Sem ele
     não existe `habilidade` — e habilidade contra o acaso seria fácil demais
     para significar alguma coisa. Quando o modelo não vem, a rodada ainda conta
     para a média do jogador; o que não conta é para a comparação. */
  const bm = Array.isArray(distribuicaoModelo) ? brier(distribuicaoModelo, vencedor) : null;

  delete estado.pendentes[roundId];
  estado.soma += b;
  estado.amostra += 1;
  if (Number.isFinite(bm)) estado.somaModelo += bm;

  estado.historico.unshift({
    roundId, brier: b, brierModelo: Number.isFinite(bm) ? bm : null,
    vencedor, n: p.distribuicao.length, quando: Date.now(),
  });
  if (estado.historico.length > HISTORICO_MAX) estado.historico.length = HISTORICO_MAX;

  return { ok: true, brier: b, brierModelo: bm };
}

/* ─── o que a tela mostra ────────────────────────────────────────────────── */

/* NENHUM NÚMERO É INVENTADO QUANDO FALTA AMOSTRA. `habilidade` volta `null`, e
 * a tela precisa dizer "faltam N rodadas" em vez de mostrar um zero que parece
 * empate com o modelo. É a regra do §28.5 — o tamanho da amostra fica visível,
 * e a ausência é explicada em vez de simulada.
 *
 * `acimaDoAcaso` compara com `brierUniforme(n)`, que é a nota de quem não sabe
 * nada. Ele existe porque é a única frase que se pode dizer com amostra pequena
 * sem mentir: bater o acaso é fácil, e é justamente por ser fácil que serve de
 * primeiro degrau.
 *
 * ── O EMPATE PRECISA DE MARGEM, E ISSO NÃO É PREGUIÇA DE PONTO FLUTUANTE ──
 *
 * Quem chuta uniforme tira EXATAMENTE a nota do acaso — é a mesma conta. Com
 * `media < acaso` cru, o veredito daquele jogador vira cara-ou-coroa: cinco
 * médias somadas em ponto flutuante caem um bilionésimo abaixo da régua, e a
 * tela passa a elogiar quem apenas chutou igual. Medido: com cinco rodadas
 * uniformes o `<` devolvia `true`.
 *
 * A margem é a mesma ordem de grandeza da tolerância de soma do
 * `calibracao.mjs` (1e-9): grande o bastante para o acúmulo de algumas dezenas
 * de somas, pequena o bastante para que qualquer vantagem REAL continue
 * contando. Empate resolve para "não superou" — a favor da modéstia, porque o
 * custo de elogiar um chute é maior que o de calar sobre uma vantagem
 * minúscula. */
const MARGEM_ACASO = 1e-9;
export function resumo(estado, { n = 12 } = {}) {
  const amostra = estado.amostra;
  const media = amostra > 0 ? estado.soma / amostra : null;
  const mediaModelo = amostra > 0 ? estado.somaModelo / amostra : null;
  const acaso = brierUniforme(n);

  return {
    amostra,
    pendentes: Object.keys(estado.pendentes).length,
    media,
    mediaModelo,
    acaso,
    /* Só compara com o modelo quando há modelo: `somaModelo` zerado com amostra
       positiva significaria "o modelo acertou tudo", que é diferente de "não
       recebemos o modelo". */
    habilidade: (media != null && mediaModelo > 0) ? habilidade(media, mediaModelo) : null,
    acimaDoAcaso: (media != null && acaso != null) ? (acaso - media) > MARGEM_ACASO : null,
    falta: Math.max(0, AMOSTRA_MINIMA - amostra),
    ranqueavel: amostra >= AMOSTRA_MINIMA,
    /* A nota encolhida é a MESMA que o ranking do servidor usa. Mostrá-la aqui
       evita a surpresa de o jogador ver 0,42 na sua tela e outro número na
       lista compartilhada. */
    encolhida: media != null ? mediaEncolhida(media, amostra, mediaModelo ?? acaso) : null,
  };
}

export function historico(estado, limite = 20) {
  return estado.historico.slice(0, Math.max(0, limite));
}
