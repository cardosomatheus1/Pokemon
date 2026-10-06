/* A LUTA NO PALCO CLÁSSICO (ST-10.27 · L-245) — camada 0.
 *
 * O dono, com a captura de uma luta de FireRed contra a Elite Four: "e as
 * batalhas lá, imagino algo mais próximo disso, mas com gráficos melhores".
 *
 * ── O QUE A REFERÊNCIA FAZ BEM, E FICA ─────────────────────────────────────
 * A perspectiva diz quem é quem sem legenda: o rival DE FRENTE, em cima à
 * direita, longe; o nosso DE COSTAS, embaixo à esquerda, perto — cada lado na
 * sua plataforma. As placas de HP se leem num olhar. A caixa de texto embaixo
 * narra UM acontecimento por vez.
 *
 * ── O QUE É NOSSO ──────────────────────────────────────────────────────────
 * A caixa narra o PORQUÊ, e não só o golpe: o tipo que bateu forte, quem
 * resiste a quê, quem é imune, quem foi mais rápido. A jornada é uma escola
 * de tipos (ST-10.13 a 10.19); a referência conta o que aconteceu, a nossa
 * conta o que ensinar. E o texto anda sozinho — o ponto fraco do original é o
 * texto que trava a luta até o jogador apertar A.
 *
 * ── A DIFERENÇA DO MOTOR, DITA ────────────────────────────────────────────
 * A nossa luta é de TIMES, todos em campo ao mesmo tempo (3 contra 3 na
 * jornada, até 6 no Time). O arranjo põe até três na fileira da frente e o
 * resto atrás, menor; com mais de três por lado as placas saem do palco para
 * uma faixa, porque seis placas empilhadas cobririam os sprites.
 *
 * Aqui só se DECIDE: onde cada um fica, e o que a caixa diz. A tela pinta.
 */
import { especieDe } from '../../engine/especie.mjs';

/* O texto precisa de tempo para ser lido: cada acontecimento dura 1,35× o
   passo da linha do tempo (900 ms → ~1,2 s). Mais que isso arrasta — o dono
   já reclamou das waves longas —, e "pular" segue ali. */
export const RITMO_CLASSICO = 1.35;

/* Posições em % do palco: x é o centro do sprite, y é onde ficam os pés. O
   rival em cima à direita; o nosso embaixo à esquerda, com os pés abaixo da
   borda, como no cartucho — é o que faz o nosso parecer PERTO. A escala é
   absoluta entre os dois lados: o nosso da frente é maior que o rival. */
/* Q7 da ST-10.27: os pés do nosso encostam na borda de baixo (98%), e não
   passam dela — abaixo disso o crítico via "o Rhyhorn cortado ao meio". O
   rival desceu um pouco do horizonte: colado nele, as peças do fundo
   pareciam saindo da cabeça dele. */
/* A largura do sprite, a mesma do CSS (`--base:clamp(68px,15.5cqw,176px)`):
   é com ela que se confere que ninguém sai do palco (ST-2.33). */
export const LARGURA_DO_SPRITE = Object.freeze({ pct: 15.5, minPx: 68 });

/* ST-2.33: o segundo da frente saiu de 10% para 14%. Em 10%, com a escala de
   lado (1,25) e o mínimo de 68 px num palco de celular, metade dele ficava
   fora — o 7º relato viu "o Beedrill cortado na borda esquerda". */
const POSICOES = {
  B: { frente: [[70, 56], [85, 51], [56, 51]], tras: [[78, 44], [63, 44], [92, 43]],
       escala: { lider: 1, lado: 0.86, tras: 0.7 } },
  A: { frente: [[28, 98], [14, 95], [44, 95]], tras: [[18, 80], [34, 80], [50, 79]],
       escala: { lider: 1.45, lado: 1.25, tras: 1 } },
};

/* Com mais de três por lado (o Time de seis, a Liga), seis sprites no tamanho
   de três se empilhavam embaixo à esquerda (Q5): todos encolhem juntos, e a
   perspectiva entre os lados continua a mesma. */
const ENCOLHE_ALEM_DE_TRES = 0.7;

function posicionar(lado, lista, n) {
  const P = POSICOES[lado], k = n > 3 ? ENCOLHE_ALEM_DE_TRES : 1;
  return lista.map((f, i) => {
    const naFrente = i < 3;
    const [x, y] = naFrente ? P.frente[i] : P.tras[i - 3];
    const escala = +((i === 0 ? P.escala.lider : naFrente ? P.escala.lado : P.escala.tras) * k).toFixed(3);
    return { slot: f.slot, x, y, escala, z: Math.round(y), costas: lado === 'A' };
  });
}

/* `estreito`: no celular o palco tem ~320 px de altura, e três placas de cada
   lado cobriam o rival (Q5 da ST-10.27) — lá as placas saem SEMPRE para a
   faixa, acima e abaixo do palco, e o palco fica inteiro para a luta. */
export function arranjoClassico(lados, { estreito = false } = {}) {
  const n = Math.max(lados.A?.length ?? 0, lados.B?.length ?? 0);
  const A = posicionar('A', lados.A ?? [], n), B = posicionar('B', lados.B ?? [], n);
  /* A ORDEM DAS PLACAS é a dos sprites, da esquerda para a direita (Q7: "a
     placa do Pidgey ia parar no Squirtle"). */
  const ordem = lista => [...lista].sort((a, b) => a.x - b.x).map(f => f.slot);
  return { A, B, ordem: { A: ordem(A), B: ordem(B) }, modo: n <= 3 && !estreito ? 'palco' : 'faixa' };
}

/* ── A NARRAÇÃO ────────────────────────────────────────────────────────── */
const tipoDoGolpe = (pack, nome) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === nome)?.t ?? null;
const nomeDoTipo = (pack, t) => pack.tipos?.nomes?.[t] ?? t;
const juntar = (pack, lista) => lista.map(t => nomeDoTipo(pack, t)).join('/');

export function narrar(pack, passo, L) {
  const todos = [...(L.lados.A ?? []), ...(L.lados.B ?? [])];
  const achar = slot => todos.find(x => x.slot === slot);
  /* No espelho (Snorlax contra Snorlax, a Liga) o nome não diz de quem é: o
     de baixo é "seu", o de cima é "rival" — a mesma regra do replay. */
  const nomes = new Set(), repetidos = new Set();
  for (const f of todos) (nomes.has(f.nome) ? repetidos : nomes).add(f.nome);
  const nomeDe = slot => {
    const f = achar(slot), n = f?.nome ?? slot;
    if (!repetidos.has(n)) return n;
    return (L.lados.A ?? []).some(x => x.slot === slot) ? `seu ${n}` : `${n} rival`;
  };
  const quem = nomeDe(passo.de), alvo = nomeDe(passo.para);
  const gt = tipoDoGolpe(pack, passo.golpe);
  const tiposAlvo = especieDe(pack, achar(passo.para)?.dex)?.t ?? [];
  const mult = t => pack.tipos?.efetividade?.[gt]?.[t] ?? 1;
  const partes = [];
  /* A velocidade decide quem bate primeiro — e só o primeiro golpe da luta
     diz isso; repetir a cada turno viraria ruído. */
  if (passo.n === 0) partes.push(`${quem} é o mais rápido e ataca primeiro.`);
  if (passo.errou) partes.push(`${quem} usou ${passo.golpe}… mas errou!`);
  else if (passo.eff === 0) {
    const imunes = tiposAlvo.filter(t => mult(t) === 0);
    partes.push(`${quem} usou ${passo.golpe}… não afeta ${alvo}!`
      + (gt && imunes.length ? ` ${juntar(pack, imunes)} é imune a ${nomeDoTipo(pack, gt)}.` : ''));
  } else if (passo.eff > 1) {
    const fortes = tiposAlvo.filter(t => mult(t) > 1);
    /* "Foi", e não "É": a letra de pixel da caixa não tem o É maiúsculo, e
       ele saía minúsculo no meio da frase (Q5). */
    partes.push(`${quem} usou ${passo.golpe}! Foi super efetivo`
      + (gt && fortes.length ? ` — ${nomeDoTipo(pack, gt)} bate forte em ${juntar(pack, fortes)}.` : '!'));
  } else if (passo.eff < 1) {
    const resistem = tiposAlvo.filter(t => mult(t) < 1 && mult(t) > 0);
    partes.push(`${quem} usou ${passo.golpe}. Não é muito efetivo`
      + (gt && resistem.length ? ` — ${juntar(pack, resistem)} resiste a ${nomeDoTipo(pack, gt)}.` : '…'));
  } else partes.push(`${quem} usou ${passo.golpe}!`);
  if (passo.crit && !passo.errou) partes.push('Um golpe crítico!');
  if (passo.caiu) partes.push(`${alvo} caiu!`);
  return partes.join(' ');
}
