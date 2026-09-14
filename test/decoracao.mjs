/* Q1/Q3 · A DECORAÇÃO DOS BIOMAS (bloco 1.5r).
 *
 * O dono nomeou o destino de metade das peças e deixou o resto por minha conta,
 * com um critério só: *"aplique essas decorações em seus biomas corretos de
 * forma mais natural e harmônica possível"*.
 *
 * O que esta suíte guarda não é o gosto — gosto se olha. É o que o gosto não
 * alcança: peça no bioma errado, peça no meio da trilha, peça recortada fora da
 * folha, e — o mais silencioso de todos — o ENDEREÇO da célula mudar sem
 * ninguém notar. A folha tem 177 células ocupadas, e trocar um `[6,0]` por um
 * `[6,1]` põe uma concha rosa onde devia estar uma creme sem quebrar nada.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  DECOR_POR_BIOMA, decorDe, decorar, recorteCel, FAIXAS,
  LADO, PASSO, BORDA, COLUNAS_FOLHA, LARGURA_FOLHA, ALTURA_FOLHA,
  barra, bloqueiosDecor,
} from '../app/modules/decoracao.mjs';
import { plantaDo } from '../app/modules/mundo.mjs';
import { areaAndavel, passeio } from '../app/modules/vida.mjs';
import { dentroDe } from '../app/modules/relevo.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { existsSync, readFileSync } from 'node:fs';

const T = 16;
const plantas = () => (kanto.biomas ?? []).map(b => plantaDo(kanto, b.id, {}));

export function suite() {
  const s = criarSuite('decoracao');

  /* ── 1 · O QUE O DONO NOMEOU ────────────────────────────────────────── */

  s.teste('as peças que o dono destinou estão nos biomas dele', () => {
    /* A lista dele, célula a célula. Se alguém mexer na tabela e mover uma
       destas, o teste diz QUAL — e diz que foi um pedido explícito, não uma
       escolha minha que se possa refazer sem perguntar. */
    const pedidas = {
      praia:      [[6, 0], [6, 1], [6, 4], [10, 0], [10, 1]],   // conchas e boias
      vulcao:     [[5, 2], [5, 3], [5, 4]],                     // pedras e fogueira
      gelo:       [[9, 0], [9, 1], [9, 4]],                     // pisos e boneco
      estufa:     [[11, 0], [11, 3], [11, 4]],                  // gosmas e fumaça
      ferrovelho: [[22, 0], [22, 2]],                           // prego e placa
      deserto:    [[12, 4]],                                    // o cacto
      oasis:      [[12, 4]],                                    // o cacto
    };
    for (const [bioma, celulas] of Object.entries(pedidas)) {
      const tem = decorDe(bioma).map(d => `${d.cel[0]},${d.cel[1]}`);
      for (const [l, c] of celulas)
        ok(tem.includes(`${l},${c}`),
          `a célula [${l},${c}] foi destinada a "${bioma}" pelo dono e não está ` +
          `lá. As dele são pedido explícito — o resto da tabela é escolha minha ` +
          'e pode ser refeita; estas não.');
    }
  });

  /* ── 2 · O QUE O GOSTO NÃO ALCANÇA ──────────────────────────────────── */

  s.teste('nenhuma peça cai na trilha', () => {
    for (const pl of plantas())
      for (const d of decorar(pl, T)) {
        const linha = d.y / T - 1;
        ok(Math.round(linha) !== pl.caminho && Math.round(linha) !== pl.caminho + 1,
          `em "${pl.bioma}" uma peça caiu na linha ${Math.round(linha)}, que é a ` +
          'trilha. Chão pisado é chão limpo — e o personagem passa por dentro ' +
          'da peça, que é a coisa mais visível que esta cena pode fazer errado.');
      }
  });

  s.teste('nenhum recorte sai da folha', () => {
    const folha = new URL('../assets/icones/decor-amie.png', import.meta.url);
    ok(existsSync(folha),
      'a folha de decoração não está em `assets/icones/`. Sem ela cada peça vira ' +
      'um quadrado vazio, e a suíte fica verde porque a conta continua certa.');
    const b = readFileSync(folha);
    const larg = b.readUInt32BE(16), alt = b.readUInt32BE(20);
    igual(larg, LARGURA_FOLHA,
      `a folha tem ${larg}px de largura e o modulo declara ${LARGURA_FOLHA}. Este ` +
      'numero e o DIVISOR da escala do recorte: errado, cada peca sai deslocada ' +
      'e o desvio cresce com a coluna — a primeira quase acerta e a ultima ' +
      `mostra o vizinho. Trocar a folha por uma de outro tamanho move TODAS as ` +
      'peças de uma vez, e cada bioma ganha a decoração do vizinho.');
    for (const [bioma, lista] of Object.entries(DECOR_POR_BIOMA))
      for (const d of lista) {
        const r = recorteCel(d.cel);
        ok(r.x >= 0 && r.x + LADO <= larg,
          `em "${bioma}" a célula [${d.cel}] recorta em x=${r.x}, fora da folha`);
        ok(r.y >= 0 && r.y + LADO <= alt,
          `em "${bioma}" a célula [${d.cel}] recorta em y=${r.y}, e a folha tem ` +
          `${alt}px. Recorte fora da folha desenha um quadrado vazio.`);
      }
  });

  s.teste('toda peça declara uma faixa que existe', () => {
    for (const [bioma, lista] of Object.entries(DECOR_POR_BIOMA))
      for (const d of lista)
        ok(FAIXAS[d.onde],
          `em "${bioma}", a célula [${d.cel}] declara a faixa "${d.onde}", que ` +
          'não existe. Sem faixa válida ela cai na grama e a intenção se perde.');
  });

  /* ── 3 · A ESCALA, QUE É O QUE RESOLVE A DIFERENÇA DE ERA ───────────── */

  s.teste('nenhuma peça é grande a ponto de denunciar a outra era', () => {
    /* A folha é 3DS: 64 px, sombreado suave. O cenário é GBA, 16 px, pixel
       duro. O que denuncia arte de outra era não é ela ser suave — é ela ser
       GRANDE o bastante para a suavidade aparecer. Um tile é 16; até uns
       2,5 tiles a peça lê como prop pré-renderizado, que a era GBA usava. */
    for (const [bioma, lista] of Object.entries(DECOR_POR_BIOMA))
      for (const d of lista) {
        const tam = d.tam ?? 20;
        ok(tam <= 40,
          `em "${bioma}" a célula [${d.cel}] sai com ${tam}px, ${(tam / T).toFixed(1)} ` +
          'tiles. Acima disso a suavidade do 3DS aparece e a cena perde a era — ' +
          'é a mesma regra do "onde o neon encosta no mundo".');
        ok(tam >= 12,
          `em "${bioma}" a célula [${d.cel}] sai com ${tam}px — menor que um tile, ` +
          'e some do cenário sem enfeitar nada.');
      }
  });

  /* ── 4 · O LUGAR É SEMPRE O MESMO LUGAR ─────────────────────────────── */

  s.teste('o mesmo bioma abre com a mesma decoração', () => {
    for (const pl of plantas()) {
      const a = decorar(pl, T), b = decorar(plantaDo(kanto, pl.bioma, {}), T);
      igual(JSON.stringify(a), JSON.stringify(b),
        `"${pl.bioma}" decorou diferente em duas aberturas. Um lugar que se ` +
        'redesenha a cada visita não é um lugar — é o mesmo argumento que já ' +
        'governa o chão, a fauna e o relevo.');
    }
  });

  s.teste('biomas diferentes não decoram nas mesmas posições', () => {
    const chave = pl => decorar(pl, T).map(d => `${d.x},${d.y}`).join('|');
    const vistas = new Map();
    for (const pl of plantas()) {
      const c = chave(pl);
      if (!c) continue;
      ok(!vistas.has(c),
        `"${pl.bioma}" e "${vistas.get(c)}" espalharam nas mesmas posições. ` +
        'Duas cenas com o mesmo desenho de enfeite leem como a mesma cena ' +
        'repintada, que é exatamente a queixa que este trabalho existe para tirar.');
      vistas.set(c, pl.bioma);
    }
  });

  /* ── 5 · TODO BIOMA GANHOU ALGUMA COISA ─────────────────────────────── */

  s.teste('nenhum bioma ficou sem decoração nenhuma', () => {
    for (const b of (kanto.biomas ?? []))
      ok(decorDe(b.id).length > 0,
        `"${b.id}" não tem decoração. Onze cenários e um sem nada é justamente ` +
        'o que faz o jogador achar que aquele lugar está inacabado.');
  });

  s.teste('cada bioma decora com peças próprias, e não com as de todos', () => {
    /* Uma peça pode repetir entre dois biomas quando faz sentido nos dois (a
       pedra solta na montanha e na ruína, o cacto no deserto e no oásis). O que
       não pode é a tabela ser a mesma lista em toda parte. */
    for (const [bioma, lista] of Object.entries(DECOR_POR_BIOMA)) {
      const minhas = new Set(lista.map(d => `${d.cel}`));
      let exclusivas = 0;
      for (const cel of minhas) {
        const noutros = Object.entries(DECOR_POR_BIOMA)
          .filter(([b]) => b !== bioma)
          .some(([, l]) => l.some(d => `${d.cel}` === cel));
        if (!noutros) exclusivas++;
      }
      ok(exclusivas >= 1,
        `"${bioma}" não tem nenhuma peça só dele — todas aparecem noutro lugar. ` +
        'Decoração compartilhada por todos volta a ser o mesmo cenário repintado.');
    }
  });


  /* ── O QUE BARRA O PASSO ────────────────────────────────────────────────
   *
   * Queixa do dono: *"o boneco e o pokémon passam pelo meio das coisas, como se
   * fossem fantasmas"*. Peça que se atravessa deixa de ser objeto e vira
   * textura pintada — a mesma leitura que o lago tinha antes de bloquear.
   *
   * Mas nem tudo barra, e essa é a metade que importa: desviar de uma folha
   * caída é mais feio que atravessá-la. O boneco faria uma curva grande em
   * volta de nada e a cena viraria um labirinto de miudezas — o mesmo critério
   * que fez só o lago bloquear no relevo.
   */

  s.teste('o que é grande barra; o que é miudeza não', () => {
    igual(barra({ tam: 30 }), true, 'a fogueira, o boneco de neve, o toco: barram');
    igual(barra({ tam: 14 }), false,
      'um prego de 14px barrando faz o boneco desviar de nada, e a cena vira ' +
      'um labirinto de miudezas.');
    igual(barra({ tam: 16, frente: true }), true,
      'peça marcada como `frente` é marco do lugar e barra mesmo sendo pequena');
    igual(barra({ tam: 40, chao: true }), false,
      'peça de CHÃO nunca barra — ela É o chão. Um piso de gelo que estorva o ' +
      'passo é a coisa mais absurda que esta cena poderia fazer.');
  });

  s.teste('a pegada fica na BASE da peça, e não cobre o desenho todo', () => {
    for (const pl of plantas())
      for (const b of bloqueiosDecor(pl, T)) {
        ok(b.rx > 0 && b.ry > 0, 'pegada de raio zero não bloqueia nada');
        ok(b.ry < b.rx,
          `pegada ${b.rx.toFixed(1)}×${b.ry.toFixed(1)} — mais alta que larga. ` +
          'A pegada é o CHÃO que a peça ocupa, vista de cima: elipse baixa. ' +
          'Redonda, o topo de um cacto passa a estorvar quem anda atrás dele.');
      }
  });

  s.teste('o passeio não entra nas peças que barram', () => {
    for (const pl of plantas()) {
      const bl = bloqueiosDecor(pl, T);
      if (!bl.length) continue;
      const area = areaAndavel(pl, { qw: 24, qh: 52, T });
      for (const sem of [7, 91, 1337]) {
        for (let t = 0; t < 4 * 60 * 1000; t += 611) {
          const p = passeio(sem, area, t, { bloqueios: bl });
          for (const b of bl)
            ok(!dentroDe(b, p.x, p.y),
              `em "${pl.bioma}", semente ${sem}, aos ${Math.round(t / 1000)}s o ` +
              'treinador estava DENTRO de uma peça de decoração.');
        }
      }
    }
  });

  s.teste('nenhum bioma fica tão bloqueado que o passeio trave', () => {
    /* O risco do outro lado: barrar demais e o boneco ficar preso num canto.
       A área andável é grande; as pegadas somadas não podem comer parte
       relevante dela. */
    for (const pl of plantas()) {
      const bl = bloqueiosDecor(pl, T);
      const area = Math.PI * bl.reduce((a, b) => a + b.rx * b.ry, 0);
      const mapa = pl.cols * T * pl.margem * T;
      ok(area / mapa < 0.06,
        `"${pl.bioma}" tem ${(area / mapa * 100).toFixed(1)}% da área andável ` +
        'bloqueada por decoração. Acima disso o passeio deixa de ser passeio e ' +
        'vira desvio contínuo — e o dono pediu o oposto de um labirinto.');
    }
  });
  return s;
}
