/* O BOLO NA TELA — a conta e os textos, sem DOM (ST-12.6 · F2.3 · §6.3, §6.13).
 *
 * Camada 0: a tela (`bolo-tela.mjs`) pinta o que isto devolve, e mais nada.
 * Cada decisão aqui seria um mutante de navegador (30 s) se morasse colada ao
 * HTML; aqui é de Node (0,1 s) — a regra de custo do `CLAUDE.md`.
 *
 * ── A DIFERENÇA QUE ESTA TELA TEM DE DEIXAR ÓBVIA ─────────────────────────
 *
 * Na aposta principal a odd é FIXA: o que está escrito é o que paga. No bolo o
 * retorno é formado por quem entra, e muda até o lock. Por isso:
 *
 *   A ESTIMATIVA DIZ "SE FECHASSE AGORA"   nunca "você recebe" (§6.13)
 *   NUNCA PASSA DO POSSÍVEL                 o maior retorno é o bolo inteiro
 *                                           menos a taxa, com você nele
 *   A REGRA VEM ANTES                       empate, zero abate e a taxa são
 *                                           lidos antes de entrar (§6.4)
 *   PERDER POUCO NÃO É FESTA                receber menos do que entrou nunca
 *                                           comemora (§28.5)
 */

import { decodificar, codificar } from '../../engine/mercado-podio.mjs';
import { ROTULOS_DURACAO } from '../../engine/mercado-duracao.mjs';

const pct = x => `${Math.round(x * 100)}%`;
/* O NOME DE UMA SELEÇÃO. `nomes` é a lista dos lutadores (abates) ou uma
   função (pódio: a trinca vira "A › B › C"). */
const rotuloDe = nomes => typeof nomes === 'function' ? nomes : i => nomes?.[i] ?? `#${i + 1}`;
export const rotuloDaTrinca = nomes => x => decodificar(x).map(i => nomes?.[i] ?? `#${i + 1}`).join(' › ');
/* O rótulo das seleções de CADA mercado, num lugar: lutador, trinca ou faixa. */
export const rotuloDoMercado = (kind, nomes) =>
  kind === 'podio' ? rotuloDaTrinca(nomes) : kind === 'duracao' ? [...ROTULOS_DURACAO] : nomes;
const mult = x => `x${x.toFixed(2).replace('.', ',')}`;

/* O bolo como ficaria com a MINHA entrada hipotética: `valor` em `selecao`,
   substituindo a entrada que eu já tenho (trocar não soma — é UPDATE no
   servidor). */
function comMinha(mercado, selecao, valor) {
  const antiga = mercado.minha;
  const tot = new Map(mercado.selecoes.map(s => [s.selecao, s.total]));
  let bruto = mercado.bruto;
  if (antiga) { tot.set(antiga.selecao, tot.get(antiga.selecao) - antiga.valor); bruto -= antiga.valor; }
  if (selecao !== null && valor > 0) { tot.set(selecao, (tot.get(selecao) ?? 0) + valor); bruto += valor; }
  return { tot, bruto };
}

/* Quanto o bolo pagaria POR MOEDA a quem está em `i`, se fechasse agora e `i`
   fosse o único no topo. Empate paga menos (divide entre os empatados), e o
   texto diz "até". `null` quando ninguém está em `i`. */
function multiplicador(tot, bruto, taxa, i) {
  const t = tot.get(i) ?? 0;
  if (t <= 0) return null;
  return (bruto - Math.floor(bruto * Math.round(taxa * 10000) / 10000)) / t;
}

export function linhasDoBolo(mercado, nomes, { selecao = null, valor = 0 } = {}) {
  if (!mercado?.selecoes) return null;
  const minhaSel = selecao ?? mercado.minha?.selecao ?? null;
  const meuValor = selecao !== null ? valor : (mercado.minha?.valor ?? 0);
  const { tot, bruto } = comMinha(mercado, minhaSel, meuValor);
  const nome = rotuloDe(nomes);
  /* No pódio a lista só tem as trincas com entrada: a trinca que EU estou
     montando entra como linha, senão a estimativa não teria onde aparecer. */
  const lista = minhaSel !== null && !mercado.selecoes.some(s => s.selecao === minhaSel)
    ? [...mercado.selecoes, { selecao: minhaSel, total: 0, entradas: 0 }] : mercado.selecoes;
  const linhas = lista.map(s => {
    const total = tot.get(s.selecao) ?? 0;
    const minha = s.selecao === minhaSel && meuValor > 0;
    return {
      selecao: s.selecao,
      nome: nome(s.selecao),
      total,
      /* A parte que é MINHA dentro do total — dita na linha. O crítico cego
         leu "180" como o bolo sem a minha entrada e concluiu que a estimativa
         estava inflada: o número estava certo, a linha é que não dizia. */
      meu: minha ? meuValor : 0,
      entradas: s.entradas,
      fatia: bruto ? total / bruto : 0,
      paga: multiplicador(tot, bruto, mercado.taxa, s.selecao),
      minha,
    };
  });
  /* `topo` é o bolo DE VERDADE: a lista mostra como ficaria com a sua entrada,
     o total diz o que já está lá (achado no OLHAR: o topo somava o hipotético). */
  const topo = mercado.bruto ? `bolo: ${mercado.bruto}` : 'vazio';
  return { bruto, taxa: mercado.taxa, linhas, topo, vazio: bruto === 0, aberto: mercado.fase === 'aberto' };
}

/* O que o jogador receberia pela SUA entrada, se fechasse agora e ela
   vencesse sozinha. O teto é o bolo inteiro menos a taxa — nenhum texto desta
   tela pode prometer mais que isso. */
export function estimativaDaMinha(estado, valor) {
  const l = estado?.linhas.find(x => x.minha);
  if (!l || !l.paga || !(valor > 0)) return null;
  const teto = estado.bruto - Math.floor(estado.bruto * Math.round(estado.taxa * 10000) / 10000);
  return Math.min(Math.floor(valor * l.paga), teto);
}

export function textoDaEstimativa(estado, valor) {
  const r = estimativaDaMinha(estado, valor);
  if (r === null) return null;
  /* RETORNO, e o lucro ao lado: "306" sozinho não dizia se a entrada voltava. */
  return `se fechasse agora e ele vencesse sozinho: ${r} de volta (lucro ${r - valor}) — muda até o fechamento`;
}

/* "Paga x3,07 agora", e não "até": "até" soa a teto, e no bolo o
   multiplicador SOBE quando entra dinheiro nos outros (crítico cego, Q7). O
   empate, que paga menos, está nas regras. Linha vazia é um traço — dez
   "ninguém ainda" diluíam as duas linhas que importam. */
export function textoDaLinha(l) {
  if (!l.total) return '—';
  const quanto = l.meu && l.meu < l.total ? `${l.total - l.meu} +${l.meu} seus`
               : l.meu ? `${l.meu} seus` : `${l.total}`;
  return `${quanto} · paga ${mult(l.paga)} agora`;
}

/* As regras que o §6.4 manda mostrar ANTES: a pergunta, o empate, o zero, a
   taxa e o destino "sem acerto". Vêm do servidor (`regra`), e não daqui: a
   regra que paga é a que o mercado gravou. */
export function textoDasRegras(mercado) {
  if (!mercado?.regra) return [];
  const destino = mercado.semAcerto === 'devolver'
    ? 'se ninguém acertar, o bolo volta a todos, menos a taxa'
    : 'se ninguém acertar, o bolo vai para a tesouraria';
  return [
    /* A duração não tem empate: "divide pela entrada" ali seria texto de
       outra regra (achado no OLHAR da ST-12.8). */
    mercado.regra.empateDivide === false
      ? `${mercado.regra.empate[0].toUpperCase()}${mercado.regra.empate.slice(1)}.`
      : `Empate: ${mercado.regra.empate} (na proporção de quanto cada um pôs) — por isso paga menos que o da linha.`,
    `Taxa de ${pct(mercado.taxa)} sobre o bolo; ${destino}.`,
    `${mercado.regra.zero[0].toUpperCase()}${mercado.regra.zero.slice(1).replace('vale o destino "sem acerto" do bolo', 'vale a regra acima')}.`,
    'O retorno é formado por quem entra e muda até o fechamento.',
  ];
}

/* A validação da entrada, antes de pedir ao servidor. A regra que vale é a
   do servidor; esta só evita um pedido que se sabe que volta recusado. */
export function erroDaEntrada({ selecao, valor, saldo }) {
  if (selecao === null || selecao === undefined) return 'escolha em quem';
  if (!Number.isInteger(valor) || valor <= 0) return 'valor inválido';
  if (Number.isFinite(saldo) && valor > saldo) return 'saldo insuficiente';
  return null;
}

/* ── O RESULTADO, DEPOIS DE PAGO (§6.6, §6.9) ──────────────────────────── */

/* O que o vencedor FEZ, por mercado — o resto do texto é o mesmo. */
const FEZ = { abates: 'liderou os abates', podio: 'foi o pódio', duracao: 'foi a duração' };

export function linhasDoResultado(res, nomes, { kind = 'abates' } = {}) {
  if (!res?.selecoes) return null;
  const nome = rotuloDe(nomes);
  /* Chance, e não multiplicador: "x1,94" do modelo ao lado de um bolo que
     pagou outra coisa se lia como odd do bolo (crítico cego, Q7). */
  const modeloDe = s => (s?.modelo !== null && s?.modelo !== undefined)
    ? ` — o modelo dava ${pct(s.modelo)} de chance` : '';
  const linhas = res.vencedoras.map(i => {
    const s = res.selecoes.find(x => x.selecao === i);
    /* O CASO QUE O §6.9 QUER: o líder sem ninguém nele. O bolo inteiro errou,
       e a linha diz quem era e quanto o modelo dava. */
    return s?.pagou ? `${nome(i)}: o bolo pagou ${mult(s.pagou)}${modeloDe(s)}`
                    : `${nome(i)} ${FEZ[kind] ?? 'venceu'} e ninguém estava nele${modeloDe(s)}`;
  });
  const alguemPago = res.vencedoras.some(i => res.selecoes.find(x => x.selecao === i)?.pagou);
  if (!res.vencedoras.length) linhas.push('Nenhum abate na rodada: ninguém venceu o bolo.');
  /* Bolo vazio não "volta a todos": não havia ninguém (achado no OLHAR). */
  if (!res.bruto) linhas.push('Ninguém entrou neste bolo.');
  else if (!alguemPago)
    linhas.push(res.semAcerto === 'tesouraria' ? 'Sem acerto: o bolo foi para a tesouraria.'
                                               : 'Sem acerto: o bolo voltou a todos, menos a taxa.');
  /* ONDE ESTAVA O BOLO: a história que o resultado contava sem números — a
     multidão inteira noutro lutador enquanto o líder tinha zero. */
  const onde = res.bruto ? res.selecoes.filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 3)
    .map(x => `${nome(x.selecao)} ${pct(x.total / res.bruto)}`).join(' · ') : '';
  if (onde) linhas.push(`O bolo estava em: ${onde}.`);
  return { bruto: res.bruto, linhas, simulacoes: res.simulacoes };
}

/* A MINHA entrada depois de paga. Receber menos do que entrou é dito como
   fato, sem tom de vitória: "voltaram 92 de 100" não é ganho (§28.5). */
export function textoDaMinhaPaga({ entrou, recebeu }) {
  if (!(entrou > 0)) return null;
  if (!recebeu) return { tom: 'perdeu', texto: `não voltou nada dos ${entrou}` };
  if (recebeu < entrou) return { tom: 'neutro', texto: `voltaram ${recebeu} dos ${entrou}` };
  return { tom: 'ganhou', texto: `recebeu ${recebeu} pelos ${entrou}` };
}

/* O título do cartão e o nome da aba, por mercado (ST-12.7). */
export const TITULO_DO_BOLO = Object.freeze({ abates: 'Bolo · quem faz mais abates?', podio: 'Bolo · 1º, 2º e 3º, em ordem',
                                              duracao: 'Bolo · quanto tempo dura a luta?' });
export const ABA_DO_BOLO = Object.freeze({ abates: 'Mais abates', podio: 'Pódio', duracao: 'Duração' });

/* A trinca que o jogador monta nos três seletores: só vira seleção quando os
   três estão escolhidos e são lutadores diferentes. */
export function trincaEscolhida(casas) {
  if (!Array.isArray(casas) || casas.length !== 3 || casas.some(x => !Number.isInteger(x))) return { selecao: null, erro: 'escolha 1º, 2º e 3º' };
  if (new Set(casas).size !== 3) return { selecao: null, erro: 'três lutadores diferentes' };
  return { selecao: codificar(casas), erro: null };
}

/* A RESPOSTA SERVE À ABA? Só se foi pedida pela aba que está na tela e é
   do mesmo bolo. Uma busca em voo quando o jogador troca de aba chegava
   depois e era pintada como a outra (achado no OLHAR do pódio). */
export const respostaServe = (pedido, atual, corpo) =>
  !!corpo?.selecoes && pedido === atual && (!corpo.kind || corpo.kind === atual);

export const TEXTO_SEM_CONTA =
  'O bolo é entre jogadores: o retorno sai do que os outros põem. Entre com uma conta para participar.';

/* ── A LEITURA NO BOLO, NO PERFIL (ST-12.9 · §6.9) ───────────────────────
 *
 * Cada discordância com os TRÊS desfechos na mesma linha e no mesmo tom — você
 * acertou, o outro lado acertou, ninguém — e o n sempre. Uma frase sobre os
 * acertos sozinha seria a tela que o §6.9 proíbe. */
export function textoDaLeitura(l, { amostraPequena = 10 } = {}) {
  if (!l?.n) return ['Você ainda não tem bolo pago. A leitura aparece a partir do primeiro.'];
  const lado = (acc, quem) => acc.n
    ? `Contra ${quem}: ${acc.n} ${acc.n === 1 ? 'vez' : 'vezes'} — você acertou ${acc.eu} · ${quem === 'o bolo' ? 'o bolo' : 'o modelo'} acertou ${acc.outro} · ninguém ${acc.ninguem}.`
    : `Você ainda não foi contra ${quem}.`;
  return [
    `Em ${l.n} ${l.n === 1 ? 'bolo pago' : 'bolos pagos'}, você acertou ${l.acertos}.` +
      (l.n < amostraPequena ? ' Amostra pequena: ainda não diz muito.' : ''),
    lado(l.contraBolo, 'o bolo'),
    lado(l.contraModelo, 'o modelo'),
  ];
}
