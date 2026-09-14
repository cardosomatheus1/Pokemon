/* OS TREINADORES QUE MORAM NO BIOMA (camada 4).
 *
 * ── POR QUE ELES EXISTEM ──────────────────────────────────────────────────
 *
 * Um bioma com bichos e sem gente é um zoológico. O dono pediu mundo vivo
 * várias vezes, e a última coisa que faltava para a cena parecer habitada é
 * OUTRA PESSOA andando por ela — alguém que não é você e que também está ali
 * fazendo alguma coisa.
 *
 * Eles ainda não batalham. A batalha é o resto do 1.7, e está no mapa de
 * decisões do dono; construí-la antes de reler o desenho dele seria inventar
 * regra que já tem dono. O que este bloco entrega é a PRESENÇA — que é a metade
 * que serve ao mundo vivo, e a que faz os outfits de NPC (L-070) terem casa.
 *
 * ── O FORMATO É O MESMO DO JOGADOR, E ISSO NÃO É COINCIDÊNCIA ────────────
 *
 * As folhas do `pret/pokeemerald` são 144×32: NOVE quadros de 16×32, na mesma
 * ordem que a nossa esteira produz — 0 frente · 1 costas · 2 perfil · 3-8 os
 * passos. Foi de propósito: a esteira de outfit nasceu copiando esse formato
 * justamente para o dia em que os dois tipos de gente andassem na mesma cena.
 *
 * Consequência: NPC e jogador usam o MESMO `quadroDe` e o MESMO `passeio`. Não
 * há um segundo código de andar, e por isso não há como um deles ficar bom e o
 * outro ficar travado.
 *
 * ── A DIFERENÇA QUE OS SEPARA ────────────────────────────────────────────
 *
 * A SEMENTE. O jogador tem a do bioma; cada NPC tem a do bioma misturada com a
 * própria posição na lista. Mesma coreografia, caminhos diferentes — e é isso
 * que faz três pessoas na mesma tela não parecerem uma dançando com espelhos.
 *
 * E a VELOCIDADE, um pouco menor: quem mora ali não tem pressa, e o jogador
 * precisa se destacar na cena que é dele.
 */
import { $ } from './dom.mjs';
import { T } from './mundo.mjs';
import { areaAndavel, passeio, quadroDe } from './vida.mjs';
import { vivos, molduraDe } from './vivos.mjs';

const OW_ARTE = '../assets/raw_githubusercontent_com/pret/pokeemerald/alfa';

/* QUEM MORA ONDE. Aqui e não no ContentPack porque estes são nomes de ARQUIVO
   DE ARTE, e não de espécie — a mesma fronteira que separou `fauna.mjs` da
   lista do pack. O dia em que os NPCs vestirem os outfits autorais (L-070),
   esta tabela vira a lista de trajes e o resto não muda. */
export const GENTE_POR_BIOMA = {
  floresta:   ['bug_catcher', 'lass'],
  praia:      ['swimmer_f', 'sailor'],
  campo:      ['youngster', 'picnicker'],
  montanha:   ['hiker', 'black_belt'],
  gelo:       ['hiker'],
  vulcao:     ['expert_m'],
  deserto:    ['hiker', 'camper'],
  oasis:      ['picnicker', 'beauty'],
  ruina:      ['psychic_m'],
  estufa:     ['bug_catcher', 'beauty'],
  ferrovelho: ['black_belt', 'gentleman'],
};

export const genteDe = biomaId => GENTE_POR_BIOMA[biomaId] ?? [];

/* Mais devagar que o jogador. Quem mora ali não tem pressa, e a cena é dele. */
export const VELOCIDADE_NPC = 26;

const QW = 16, QH = 32;
let atuais = [];

const sementeDe = (id, i) =>
  ([...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 89, 41) + i * 7919) >>> 0;

export function prepararNpcs(planta) {
  /* some com os do bioma anterior; sem isto a praia herda o hiker da montanha */
  for (const [k, v] of vivos) {
    if (!k.startsWith('npc')) continue;
    v.moldura.remove();
    vivos.delete(k);
  }
  atuais = genteDe(planta.bioma).map((arq, i) => ({
    arq, semente: sementeDe(planta.bioma, i),
  }));
}

export function desenharNpcs(g, planta, cam, escala, t, sombra, yJogador) {
  if (!atuais.length || !planta) return;
  const area = areaAndavel(planta, { qw: QW, qh: QH, T });
  atuais.forEach((n, i) => {
    const v = molduraDe('npc' + i, `${OW_ARTE}/${n.arq}.png`);
    if (!v || !v.folha) return;
    const p = passeio(n.semente, area, t, { velocidade: VELOCIDADE_NPC });
    const { quadro, espelhar } = quadroDe(p.dir, p.distancia, p.andando);

    const Lt = QW * escala, At = QH * escala;
    sombra(g, Math.round(p.x - cam.x), Math.round(p.y - cam.y), QW * 0.34);

    v.moldura.style.display = '';
    v.moldura.style.width = Lt + 'px';
    v.moldura.style.height = At + 'px';
    v.moldura.style.transform =
      `translate(${(p.x - cam.x) * escala - Lt / 2}px, ` +
      `${(p.y - cam.y) * escala - At}px)` + (espelhar ? ' scaleX(-1)' : '');
    /* PROFUNDIDADE PELO Y, como todo o resto da cena: quem está mais embaixo
       está mais perto e passa na frente. */
    v.moldura.style.zIndex = p.y <= yJogador ? 1 : 3;
    v.img.style.width = (Lt * 9) + 'px';
    v.img.style.height = At + 'px';
    v.img.style.marginLeft = (-quadro * Lt) + 'px';
    v.img.style.marginTop = '0px';
    v.img.style.animation = 'none';
  });
}
