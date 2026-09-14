/* AS FOLHAS DE CAMINHADA DO IDLE — `Walk-Anim.png` do PMDCollab.
 *
 * ── POR QUE UMA FERRAMENTA SEPARADA ───────────────────────────────────────
 *
 * O `baixar-assets.mjs` já traz folhas do PMDCollab, mas só para o ELENCO DA
 * ARENA (76 espécies) e só as animações que a batalha usa, guiado pela tabela
 * `PMD` — que diz, por espécie, quais animações existem.
 *
 * O idle tem outro elenco: **146 espécies**, porque o dono decidiu que os modos
 * idle e Torre não se prendem aos 76. E ele precisa de UMA animação que a
 * batalha nem sempre pede: a caminhada.
 *
 * Misturar as duas listas no mesmo arquivo faria a Arena baixar folhas que ela
 * não usa e o idle depender de uma tabela feita para outro propósito.
 *
 * ── O FORMATO, e por que ele resolve tudo ────────────────────────────────
 *
 * `Walk-Anim.png` é uma folha de **8 linhas × 4 colunas**: cada linha é uma
 * direção (baixo, baixo-direita, direita, cima-direita, cima, cima-esquerda,
 * esquerda, baixo-esquerda) e cada coluna é um quadro do passo.
 *
 * Isto é o que o dono vinha pedindo desde ontem, e que eu insisti em não ouvir:
 *
 *   "A SPRITE DO POKÉMON QUE ACOMPANHA O TREINADOR PRECISA SER A MESMA QUE É
 *    USADA NA ARENA [...] VOCÊ CONTINUA TRAZENDO UM GIF SE BALANÇANDO"
 *
 * Um GIF de batalha respira no lugar — ele foi desenhado para uma criatura
 * parada num campo de batalha. A folha de caminhada foi desenhada para uma
 * criatura ANDANDO, vista de cima, com direção. É a diferença entre um retrato
 * que balança e um bicho que caminha, e nenhum ajuste de tamanho corrige isso.
 *
 * O tamanho do quadro NÃO precisa de tabela: sai da própria folha, dividindo a
 * largura por 4 e a altura por 8. A prévia tinha uma tabela com setenta linhas
 * escritas à mão, e uma tabela dessas dessincroniza no dia em que uma folha
 * nova chegar com outro tamanho.
 *
 * Uso:  node tools/baixar-caminhada.mjs
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';
const ESPELHO = 'https://cdn.jsdelivr.net/gh/PMDCollab/SpriteCollab@master/sprite/';
const DESTINO = join(RAIZ, 'assets/raw_githubusercontent_com/PMDCollab/SpriteCollab/master/sprite');

const pack = (await import('../content/pokemon_kanto_v1.mjs')).default;
const dexes = [...new Set((pack.especies ?? []).map(e => e.dex))].sort((a, b) => a - b);

console.log(`${dexes.length} espécies no pack; conferindo Walk-Anim.png de cada uma`);

const conta = {};
for (const dex of dexes) {
  const id = String(dex).padStart(4, '0');
  const arq = join(DESTINO, id, 'Walk-Anim.png');
  if (existsSync(arq) && statSync(arq).size > 0) {
    conta['já tinha'] = (conta['já tinha'] || 0) + 1;
    continue;
  }
  let ok = false;
  for (const raiz of [BASE, ESPELHO]) {
    try {
      const r = await fetch(`${raiz}${id}/Walk-Anim.png`);
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      if (!b.length) continue;
      mkdirSync(dirname(arq), { recursive: true });
      writeFileSync(arq, b);
      conta[raiz === BASE ? 'origem' : 'espelho'] = (conta[raiz === BASE ? 'origem' : 'espelho'] || 0) + 1;
      ok = true;
      break;
    } catch { /* tenta o espelho */ }
  }
  /* SEM FOLHA NÃO É ERRO: nem toda espécie tem caminhada no PMDCollab, e o
     jogo tem de continuar mostrando a criatura. A cena cai no sprite de
     batalha — feio e presente vence bonito e ausente. Ver L-076. */
  if (!ok) {
    conta['sem folha'] = (conta['sem folha'] || 0) + 1;
    console.log(`  sem Walk-Anim: dex ${dex}`);
  }
}

console.log('\n' + Object.entries(conta).map(([k, v]) => `${k}: ${v}`).join(' · '));

/* ══ A GRADE DE CADA FOLHA, GERADA E NÃO ESCRITA ═══════════════════════════
 *
 * A folha NÃO é 4×8 para todos. Foi o que me custou uma rodada inteira: o
 * Bulbasaur tem quadro de 40×40 numa folha de 240×320 — SEIS colunas, e não
 * quatro. Fatiando em quatro, cada janela mostrava um quadro e meio, e a cena
 * exibia dois Bulbasaurs colados.
 *
 * A prévia resolvia isso com uma tabela de setenta linhas escrita à mão. Ela
 * funcionava e era frágil pelo motivo de sempre: no dia em que uma folha nova
 * chegasse com outra grade, ninguém lembraria de acrescentar a linha.
 *
 * A verdade está no `AnimData.xml` que acompanha cada pasta do PMDCollab, e é
 * de lá que esta tabela sai. Escrita por ferramenta, conferível a qualquer
 * momento rodando a ferramenta de novo.
 *
 * `Durations` são as durações de cada quadro em unidades de 1/60 s. A soma dá o
 * tempo do ciclo — que varia por espécie, e é o que faz um Onix arrastar e um
 * Rattata correr. Uma velocidade única para todos seria a mesma classe de erro
 * do pulo que o dono já cortou. */
async function anim(dex) {
  const id = String(dex).padStart(4, '0');
  for (const raiz of [BASE, ESPELHO]) {
    try {
      const r = await fetch(`${raiz}${id}/AnimData.xml`);
      if (!r.ok) continue;
      const xml = await r.text();
      /* o bloco <Anim> cujo <Name> é Walk — e não o primeiro FrameWidth do
         arquivo, que pertence a outra animação */
      const bloco = xml.split('<Anim>').find(b => /<Name>\s*Walk\s*<\/Name>/.test(b));
      if (!bloco) return null;
      const num = tag => {
        const m = bloco.match(new RegExp('<' + tag + '>\\s*(\\d+)\\s*</' + tag + '>'));
        return m ? +m[1] : null;
      };
      const fw = num('FrameWidth'), fh = num('FrameHeight');
      if (!fw || !fh) return null;
      const dur = [...bloco.matchAll(/<Duration>\s*(\d+)\s*<\/Duration>/g)].map(m => +m[1]);
      return { fw, fh, ticks: dur.reduce((a, b) => a + b, 0) || 24 };
    } catch { /* tenta o espelho */ }
  }
  return null;
}

const grade = {};
for (const dex of dexes) {
  const a = await anim(dex);
  if (a) grade[dex] = a;
  else console.log(`  sem AnimData: dex ${dex}`);
}

const linhas = Object.entries(grade)
  .map(([d, a]) => `  ${d}: { fw: ${a.fw}, fh: ${a.fh}, ticks: ${a.ticks} },`)
  .join('\n');

writeFileSync(join(RAIZ, 'app/modules/caminhada-dados.mjs'),
`/* A GRADE DAS FOLHAS DE CAMINHADA — GERADO POR \`tools/baixar-caminhada.mjs\`.
 *
 * NÃO EDITE À MÃO. Rode a ferramenta de novo.
 *
 * Cada folha \`Walk-Anim.png\` do PMDCollab tem OITO LINHAS (as direções) e um
 * número de colunas que VARIA POR ESPÉCIE. Bulbasaur tem seis quadros de 40×40;
 * Charizard tem quadros de 40×48. Fatiar tudo em quatro colunas — que foi o meu
 * erro — mostra um quadro e meio por janela, e a cena exibe dois bichos colados.
 *
 *   fw, fh   o tamanho de UM quadro, em pixels da arte
 *   ticks    a soma das durações do ciclo, em unidades de 1/60 s
 *
 * \`ticks\` é o que faz um Onix arrastar e um Rattata correr. Uma velocidade
 * única para todos seria a mesma classe de erro do pulo genérico que o dono
 * cortou: impor um movimento a criaturas que têm o próprio.
 *
 * O número de colunas não está aqui de propósito — ele sai de
 * \`largura da folha / fw\` no momento em que a folha carrega, e assim uma folha
 * regravada com mais quadros passa a animar melhor sem tocar neste arquivo. */
export const CAMINHADA = {
${linhas}
};

export const gradeDe = dex => CAMINHADA[dex] ?? null;
`);
console.log(`\ngrade gravada: ${Object.keys(grade).length} espécies em app/modules/caminhada-dados.mjs`);
