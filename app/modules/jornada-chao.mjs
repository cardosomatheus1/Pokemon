/* O MAPA COMO GRADE DE TILES (ST-10.22e) — camada 0, sem DOM.
 *
 * Cinco rodadas de Q7 (barra: o mapa do SMW) descreveram o mesmo teto: o
 * mundo eram regiões pousadas sobre um tapete de grama — manchas, e não um
 * lugar. O chão passa a ser uma GRADE decidida aqui, e a tela só pinta. A
 * célula tem 16 px — um quarto do tile de 32 (o 16 × 16 em 2×) —: com a
 * célula do tamanho do tile, a borda saía em degraus de 32 px, e o crítico
 * leu "retângulos em escada" (1ª rodada da ST-10.22e).
 *
 *   o chão       o do nó mais perto, dentro de um raio (0,7 da distância
 *                típica entre nós seguidos); a distância leva ruído SUAVE
 *                (valor interpolado numa rede de 64 px), para a fronteira
 *                sair em curva, e não em círculo de compasso nem em serrote
 *   as manchas   o que a tela pôs no chão reclama o chão dele: a poça de
 *                lava é vulcão em volta, e não lava boiando na grama; o
 *                ginásio é PRAÇA em volta (ST-10.22f), e não um pedestal
 *   a grama      fora de todo raio — é o que liga as regiões
 *   o mar        a grama perto do vulcão vira água, e o mar desce até a
 *                borda de baixo: Cinnabar é ilha num mar que sai do mapa
 *   a transição  o chão de mais precedência invade a borda do vizinho
 *                (`transicoes`), como a borda de tile do GBA
 *   o canto      onde os dois vizinhos de um canto são o mesmo chão de mais
 *                precedência, ele toma o canto em diagonal (`cantos`) — o
 *                degrau de 16 px vira rampa, e a região perde o contorno de
 *                "retângulo colado" (2ª rodada do Q7 da ST-10.22e)
 *   a margem     a água encontra a terra numa linha de espuma (`margens`)
 *   a face       o chão mais alto sobre o mais baixo mostra o penhasco
 *                (`temFace`)
 *
 * Tudo em pixels da caixa que a tela mede: o mesmo código serve o mapa
 * deitado e o em pé. */
export const CELULA = 16;
export const TILE = 32;
export const MATERIAIS = Object.freeze(['grama', 'agua', 'campo', 'jardim', 'praia', 'pantano', 'floresta', 'bosque', 'pedra', 'praca', 'cidade', 'usina', 'vulcao', 'planalto']);
/* Quem invade a borda de quem: o mais "construído" sobre o mais natural. */
export const PRECEDENCIA = Object.freeze({ grama: 0, agua: 1, campo: 2, jardim: 2, praia: 3, pantano: 3, floresta: 4, bosque: 4, pedra: 5, praca: 5, cidade: 6, usina: 6, vulcao: 6, planalto: 7 });
/* A altura do chão: onde um mais alto encontra um mais baixo embaixo dele, há face. */
export const ALTURA = Object.freeze({ agua: -1, planalto: 3, pedra: 2, vulcao: 2, floresta: 1, bosque: 1, cidade: 1, usina: 1 });
/* A cor de cada chão para a borda em xadrez e a face do penhasco. */
export const COR_DO_CHAO = Object.freeze({
  grama: '#5e9e43', agua: '#3a86c8', campo: '#7cbd57', jardim: '#86c65c', praia: '#e3d294', pantano: '#4b6b45', floresta: '#2f6a28',
  bosque: '#1f5444', pedra: '#bf9a62', praca: '#d9cfae', cidade: '#a4aab5', usina: '#6b6f76', vulcao: '#5a382e', planalto: '#9a917f',
});
export const COR_DA_FACE = Object.freeze({ planalto: '#4e463c', pedra: '#76552d', vulcao: '#241210', floresta: '#173816', bosque: '#0f2c26', cidade: '#50555f', usina: '#2e3138' });

const hash = (x, y, s) => {
  let v = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0;
  return ((v ^ (v >>> 16)) & 0xffff) / 65535;
};
/* Ruído SUAVE: o valor do hash nos cantos de uma rede de 64 px, interpolado
   (smoothstep), mais uma oitava de 32 px com metade do peso. O ruído cru por
   célula dava uma fronteira em sal e pimenta; a média das vizinhas, em
   serrote quando a célula encolheu para 16 px. */
const liso = t => t * t * (3 - 2 * t);
function valor(x, y, passo, s) {
  const gx = Math.floor(x / passo), gy = Math.floor(y / passo), fx = liso(x / passo - gx), fy = liso(y / passo - gy);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
const suave = (x, y) => (valor(x, y, 64, 7) * 2 + valor(x, y, 32, 11)) / 3;

function raioTipico(nos) {
  const d = nos.slice(1).map((n, i) => Math.hypot(n.x - nos[i].x, n.y - nos[i].y)).sort((a, b) => a - b);
  return d.length ? 0.7 * d[Math.floor(d.length / 2)] : 120;
}

export function gradeDoChao(nos, { largura, altura, celula = CELULA, raio = raioTipico(nos), manchas = [] } = {}) {
  const col = Math.ceil(largura / celula), lin = Math.ceil(altura / celula);
  const vulcoes = nos.filter(n => n.regiao === 'vulcao');
  const grade = [];
  for (let l = 0; l < lin; l++) {
    const linha = [];
    for (let c = 0; c < col; c++) {
      const x = (c + 0.5) * celula, y = (l + 0.5) * celula, ruido = 1 + 0.4 * (suave(x, y) - 0.5);
      let melhor = null, dm = Infinity;
      for (const n of nos) { const d = Math.hypot(x - n.x, y - n.y) * ruido; if (d < dm) { dm = d; melhor = n; } }
      let mat = melhor && dm < raio && MATERIAIS.includes(melhor.regiao) ? melhor.regiao : 'grama';
      const m = manchas.find(k => MATERIAIS.includes(k.regiao) && Math.hypot(x - k.x, y - k.y) * ruido < k.raio);
      if (m) mat = m.regiao;
      /* O mar: o anel em volta do vulcão, e um braço dele que desce até a
         borda de baixo — poças soltas na borda não liam como mar (L-216). */
      if (mat === 'grama' && vulcoes.some(v => Math.hypot(x - v.x, y - v.y) * ruido < raio * 1.4 || (y > v.y && Math.abs(x - v.x) * ruido < raio))) mat = 'agua';
      linha.push(mat);
    }
    grade.push(linha);
  }
  /* A água sem vizinha d'água vira grama: o braço do mar, cortado pelo ruído,
     deixava casas soltas de água no meio da terra ("tile órfão", Q7 da 10.22f). */
  const orfa = (l, c) => grade[l][c] === 'agua' && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dl, dc]) => grade[l + dl]?.[c + dc] !== 'agua');
  const orfas = grade.flatMap((linha, l) => linha.map((_, c) => [l, c])).filter(([l, c]) => orfa(l, c));
  for (const [l, c] of orfas) grade[l][c] = 'grama';
  return grade;
}

/* Quem invade a borda desta célula: o vizinho de MAIS precedência. Uma
   borda só é pintada de um lado — o do chão mais baixo na ordem. */
export function transicoes(grade, c, l) {
  const eu = grade[l]?.[c], out = {};
  for (const [lado, dc, dl] of [['cima', 0, -1], ['baixo', 0, 1], ['esq', -1, 0], ['dir', 1, 0]]) {
    const v = grade[l + dl]?.[c + dc];
    if (v === 'agua' || eu === 'agua') continue;   // a água tem margem, e não franja
    if (v && v !== eu && (PRECEDENCIA[v] ?? 0) > (PRECEDENCIA[eu] ?? 0)) out[lado] = v;
  }
  return out;
}

/* Os cantos que o vizinho toma: 'ce' (cima-esquerda), 'cd', 'be', 'bd' —
   quando os DOIS vizinhos daquele canto são o mesmo chão, de mais
   precedência que este. A água fica de fora: ela tem margem. */
export function cantos(grade, c, l) {
  const eu = grade[l]?.[c], out = {};
  if (eu === undefined || eu === 'agua') return out;
  for (const [qual, dc, dl] of [['ce', -1, -1], ['cd', 1, -1], ['be', -1, 1], ['bd', 1, 1]]) {
    const a = grade[l + dl]?.[c], b = grade[l]?.[c + dc];
    if (a && a === b && a !== eu && a !== 'agua' && (PRECEDENCIA[a] ?? 0) > (PRECEDENCIA[eu] ?? 0)) out[qual] = a;
  }
  return out;
}

/* A margem: os lados em que esta célula de água encosta em terra — a tela
   pinta a espuma ali. Pontilhado azul na grama lia como mancha, e não costa. */
export function margens(grade, c, l) {
  if (grade[l]?.[c] !== 'agua') return [];
  return [['cima', 0, -1], ['baixo', 0, 1], ['esq', -1, 0], ['dir', 1, 0]]
    .filter(([, dc, dl]) => { const v = grade[l + dl]?.[c + dc]; return v !== undefined && v !== 'agua'; }).map(([lado]) => lado);
}

/* O penhasco: o chão desta célula é mais alto que o da de baixo. */
export const temFace = (grade, c, l) => {
  const abaixo = grade[l + 1]?.[c];
  return abaixo !== undefined && (ALTURA[grade[l][c]] ?? 0) > (ALTURA[abaixo] ?? 0);
};
