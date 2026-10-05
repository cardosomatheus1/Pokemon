/* OS GINÁSIOS COMO AULAS — a medição (ST-10.13 · F4.6 · Spec §8.1.2).
 *
 *   node tools/medir-ginasios.mjs      grava test/fixtures/ginasios.json
 *
 * "Dificuldade de cada ginásio é MEDIDA, não estimada." Para cada ginásio, dois
 * times de referência que diferem em UM membro — o que ignora a lição e o que
 * a aplica —, 2.000 lutas cada pela mesma conta da chance exibida (`lote`,
 * raiz fixa). A Spec §8.17 substitui as antigas metas 70%/60%: nos ginásios,
 * ignorar a lição vence menos de 50%; aplicá-la melhora pelo menos 20 pp
 * e mais de três erros padrão. Na Liga cobra-se o ganho relativo. O teste
 * refaz a conta contra o NÚMERO GRAVADO.
 *
 * E o primeiro nó (D-125): o inicial SOZINHO, no nível 5, contra o primeiro
 * rival do caminho — quem acabou de chegar tem de conseguir dar o primeiro
 * passo.
 *
 * O jogador luta com o padrão do moveset (o que ele tem sem escolher); o
 * rival, com `rivalDe` (o moveset pela força de quem bate). Fixture de
 * MEDIÇÃO: regrava quando a medição muda de propósito, com o número novo ao
 * lado do antigo na mensagem do commit. */
import { writeFileSync } from 'node:fs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { VERSAO_TBE } from '../engine/treino-batalha.mjs';

export const RAIZ = 20260928, SIMS = 2000, INICIAIS = [1, 4, 7], NIVEL_INICIAL = 5;
/* Cada membro: [dex, nível] ou [dex, nível, { iv, natureza }] — o terceiro é o
   que a Misty precisa para variar SÓ a velocidade (o oculto de velocidade). */
export const time = l => l.map(([dex, nivel, extra]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel), ...(extra ?? {}) }));
const IV = vel => [15, 15, 15, 15, 15, vel];

/* Os times de referência de cada ginásio. `ignora` e `aplica` diferem num
   membro só: a diferença de chance É a lição, e nada mais. */
export const REFERENCIAS = {
  pewter: { ignora: [[4, 14], [16, 13], [19, 13]], aplica: [[7, 14], [16, 13], [19, 13]] },
  /* "Mesmo time, só a velocidade invertida" (plano, ST-10.14): o mesmo Raichu
     22, o oculto de velocidade 0 × 31 — 57 contra 63, com o Starmie em 59. */
  cerulean: { varia: 'vel', ignora: [[26, 22, { iv: IV(0) }]], aplica: [[26, 22, { iv: IV(31) }]] },
  /* Imunidade (ST-10.15): o mesmo Raticate 22 ao lado, e o membro que muda é
     um Arcanine 22 (neutro, e MAIS forte no papel) × um Rhyhorn 22 (Terrestre,
     imune a Elétrico). O teste cobra as três coisas: imune de um lado, não do
     outro, e o que ignora não é mais fraco. */
  vermilion: { varia: 'imune', tipo: 'electric', ignora: [[59, 22], [20, 22]], aplica: [[111, 22], [20, 22]] },
  /* Físico × especial (ST-10.16): o MESMO Arcanine 42 (ataque 110, especial
     100 — equilibrado, para a diferença ser o lado fraco de quem apanha, e não
     o atacante), só golpes especiais × só físicos, com um Snorlax 36 ao lado. */
  /* Resistência (ST-10.19a): o mesmo Raticate 30 ao lado; o membro que muda é
     um Tauros 36 (Normal: apanha cheio de Planta e de Veneno, e é MAIS forte
     no papel — 490 contra 448) × um Arbok 36 (Veneno: resiste aos dois). O
     Persian foi a primeira escolha e o teste o recusou: 440, mais fraco. */
  celadon: { varia: 'resiste', ignora: [[128, 36], [20, 30]], aplica: [[24, 36], [20, 30]] },
  /* O preset (ST-10.19a): o MESMO time (Rhydon 42, Jolteon 38), só o preset
     muda — Balanced espalha dano, Defensive derruba a ameaça primeiro. */
  fuchsia: { varia: 'preset', presets: { ignora: 'balanced', aplica: 'defensive' }, ignora: [[112, 42], [135, 38]], aplica: [[112, 42], [135, 38]] },
  /* O preset Agressivo (ST-10.19b): o MESMO time — dois de Água, o tipo certo
     contra Fogo — e só o preset muda. Equilibrado espalha dano e os quatro do
     Blaine seguem batendo; Agressivo termina o ferido. Medido na busca: o
     Defensivo e o Foco ficam onde o Equilibrado fica — a lição é esta.
     ST-10.19c (L-201): com o rival especialista, Blastoise e Starmie 44
     passaram a vencer 100% nos dois presets; a busca refeita deu o Seadra e o
     Starmie 40 (24% × 88%; o Defensivo 13%, o Foco 24%). */
  cinnabar: { varia: 'preset', presets: { ignora: 'balanced', aplica: 'aggressive' }, ignora: [[117, 40], [121, 40]], aplica: [[117, 40], [121, 40]] },
  /* O tipo duplo (ST-10.19b): o mesmo Snorlax e o mesmo Arcanine ao lado; o
     membro que muda é um Machamp 50 (Lutador: 2× nos Rhyhorn/Rhydon, e ½ nos
     Nidos — o Venenoso corta) × um Golduck 50 (Água: 4× nos Pedra/Terrestre,
     2× nos outros). O Machamp é o mais forte no papel: 505 contra 500. */
  viridian: { varia: 'duplo', ignora: [[68, 50], [143, 50], [59, 50]], aplica: [[55, 50], [143, 50], [59, 50]] },
  /* ── A LIGA (ST-10.19c): cada um revisa um ginásio, em nível de fim de
     jogo, e o Campeão pede o time cheio. Medido na busca, 2.000 lutas aqui. */
  /* Lorelei revisa o Koga: o MESMO trio, Equilibrado × Defensivo — a Jynx é
     a ameaça. O Agressivo e o Foco ficam onde o Equilibrado fica. */
  lorelei: { varia: 'preset', presets: { ignora: 'balanced', aplica: 'defensive' }, ignora: [[26, 60], [97, 60], [3, 60]], aplica: [[26, 60], [97, 60], [3, 60]] },
  /* Bruno revisa o Surge: o Gengar (imune a Lutador E a Normal) × um
     Arcanine, mais forte no papel (555 × 500), com o mesmo Snorlax e Charizard. */
  bruno: { varia: 'imune', tipo: 'fighting', ignora: [[59, 58], [143, 58], [6, 58]], aplica: [[94, 58], [143, 58], [6, 58]] },
  /* Agatha revisa a Sabrina: o MESMO Raichu 55 (90 × 90), só especiais × só
     físicos, com o Rhydon e o Alakazam ao lado. */
  agatha: { varia: 'categoria', ignora: [[26, 55, { golpes: ['Thunderbolt', 'Discharge'] }], [112, 55], [65, 55]],
                                aplica: [[26, 55, { golpes: ['Volt Tackle', 'Thunder Fang'] }], [112, 55], [65, 55]] },
  /* Lance revisa a Erika: o Magneton (Aço: resiste a Dragão; Elétrico e Aço:
     ¼ de Voador) × um Arcanine (555 × 465), com o mesmo Snorlax e Lapras. */
  lance: { varia: 'resiste', ignora: [[59, 65], [143, 65], [131, 65]], aplica: [[82, 65], [143, 65], [131, 65]] },
  /* O Campeão: o MESMO time de seis, Agressivo × Equilibrado — o preset que
     venceu o Blaine perde aqui. */
  campeao: { varia: 'preset', presets: { ignora: 'aggressive', aplica: 'balanced' },
             ignora: [[3, 58], [6, 58], [9, 58], [143, 58], [65, 58], [149, 58]], aplica: [[3, 58], [6, 58], [9, 58], [143, 58], [65, 58], [149, 58]] },
  saffron: { varia: 'categoria', ignora: [[59, 42, { golpes: ['Flamethrower', 'Hyper Voice'] }], [143, 36]],
                                 aplica: [[59, 42, { golpes: ['Fire Punch', 'Body Slam', 'Extreme Speed', 'Quick Attack'] }], [143, 36]] },
};

export const medida = (A, idRival, preset = 'balanced') => resumo(lote(pack, A, rivalDe(pack, treinador(pack, idRival)), RAIZ, 0, SIMS, undefined, preset));
export const chance = (A, idRival) => medida(A, idRival).p;

export function medir() {
  /* ST-10.19c: todo nó com lição — os ginásios e a Liga. */
  const ginasios = (pack.jornada ?? []).filter(n => n.licao).map(n => {
    const ref = REFERENCIAS[n.id];
    if (!ref) return { id: n.id, rival: n.rival, semReferencia: true };
    const ig = medida(time(ref.ignora), n.rival, ref.presets?.ignora), ap = medida(time(ref.aplica), n.rival, ref.presets?.aplica);
    return { id: n.id, rival: n.rival, ensina: n.licao?.ensina ?? null,
             ignora: +ig.p.toFixed(4), aplica: +ap.p.toFixed(4), erro: +Math.max(ig.erro, ap.erro).toFixed(4) };
  });
  const primeiro = (pack.jornada ?? [])[0];
  const inicial = INICIAIS.map(dex => ({ dex, p: +chance(time([[dex, NIVEL_INICIAL]]), primeiro.rival).toFixed(4) }));
  return { medidoEm: '2026-10-04', versaoMotor: VERSAO_TBE, raiz: RAIZ, sims: SIMS, primeiroNo: { id: primeiro.id, rival: primeiro.rival, inicial }, ginasios };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  const saida = medir();
  writeFileSync(new URL('../test/fixtures/ginasios.json', import.meta.url), JSON.stringify(saida, null, 1) + '\n');
  console.log(`primeiro nó (${saida.primeiroNo.id}):`, saida.primeiroNo.inicial.map(x => `${x.dex}: ${(x.p * 100).toFixed(1)}%`).join(' · '));
  for (const g of saida.ginasios) console.log(g.id.padEnd(8), g.semReferencia ? 'SEM REFERÊNCIA' : `ignora ${(g.ignora * 100).toFixed(1)}% · aplica ${(g.aplica * 100).toFixed(1)}%`);
  console.log(((performance.now() - t0) / 1000).toFixed(1), 's');
}
