/* A CONVERSÃO DE UM OUTFIT (bloco 1.5, camada 0).
 *
 * De uma arte gerada por IA — em qualquer tamanho, com fundo liso — para a folha
 * de nove quadros no formato do cartucho.
 *
 * Fronteira: entra imagem, sai imagem. Não conhece DOM além do `canvas`, não
 * conhece estado, não conhece o jogo.
 *
 * ── POR QUE ISTO É UM MÓDULO, E NÃO CÓDIGO DA BANCADA ─────────────────────
 *
 * A bancada (`tools/previas/outfits-bancada.html`) nasceu com esta lógica
 * dentro. Funcionava para o dono arrastar um arquivo por vez — e parou de
 * funcionar no dia em que ele mandou um outfit em TRÊS ARQUIVOS SEPARADOS, um
 * por vista, em vez de uma folha só.
 *
 * Extraído, o mesmo código serve a bancada, a uma ferramenta de linha de
 * comando que converte em lote, e ao jogo. Duplicá-lo seria criar a segunda
 * verdade sobre a mesma conversão — que é como as duas divergem em silêncio.
 *
 * ── AS QUATRO ETAPAS ──────────────────────────────────────────────────────
 *
 *   1. CHAVEAR      tirar o fundo. A cor sai do canto, e a lista aceita mais —
 *                   uma folha do cartucho tem o próprio fundo opaco dentro do
 *                   magenta, e uma chave só não bastava.
 *   2. ACHAR A GRADE  arte "pixel art" gerada a 2048 px não tem 2048 pixels de
 *                   arte: tem uns cem, desenhados em blocos. Descobrir o bloco
 *                   é o que separa uma redução honesta de um borrão.
 *   3. REDUZIR      pela MODA de cada bloco, nunca pela média. Média inventa
 *                   cor fora da paleta, e é o que faz arte reduzida parecer
 *                   lavada.
 *   4. DERIVAR      os seis passos, a partir das três vistas.
 */

/* ── 1 · A CHAVE DE COR ──────────────────────────────────────────────────── */

export function chavear(fonte, { tolerancia = 40, chaves = [] } = {}) {
  const c = document.createElement('canvas');
  c.width = fonte.width; c.height = fonte.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(fonte, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const todas = [[p[0], p[1], p[2]], ...chaves];
  for (let i = 0; i < p.length; i += 4)
    for (const [kr, kg, kb] of todas)
      if (Math.abs(p[i]-kr) + Math.abs(p[i+1]-kg) + Math.abs(p[i+2]-kb) <= tolerancia * 3) {
        p[i+3] = 0; break;
      }
  /* A FRANJA SAI JUNTO, e não como etapa opcional. Deixar para quem chama
     garantiria que um dos três chamadores esqueceria — e o esquecimento aparece
     como halo rosa numa arte só, que é o tipo de coisa que ninguém liga ao
     código. */
  limparFranja(d, todas, { tolerancia, forca: 2 });
  g.putImageData(d, 0, 0);
  return { canvas: c, dados: d, chaves: todas };
}

/* ── 1b · A FRANJA ───────────────────────────────────────────────────────────
 *
 * A chave de cor tira o fundo CHAPADO. Ela não tira a borda — e a borda é onde
 * o rosa fica visível, que foi o que o dono pediu para cuidar.
 *
 * De onde vem a franja: quatro dos arquivos são JPEG. JPEG não guarda cor por
 * pixel, guarda blocos transformados, e no encontro do magenta com o preto do
 * contorno ele inventa uma fileira de pixels intermediários — rosa escuro,
 * roxo, cinza-arroxeado. Nenhum deles está perto o bastante do magenta para a
 * chave apagar, e todos estão longe o bastante da roupa para aparecer.
 *
 * Aumentar a tolerância da chave não resolve: ela é global, e o traje tem rosa
 * de verdade — o `femurbangirl` é azul COM rosa, e uma chave larga come a
 * jaqueta dela. Franja e roupa têm a mesma cor; o que as separa é a POSIÇÃO.
 *
 * Duas passadas, as duas ancoradas em "encostar no vazio":
 *
 *   1. APAGAR   pixel vizinho de transparência e razoavelmente perto da chave
 *               sai. Só na borda, e por isso a jaqueta rosa do meio da figura
 *               nunca é candidata.
 *   2. DESPILL  o que sobra na borda perde o excesso das cores da chave. Num
 *               magenta (R e B altos, G baixo), R e B são puxados para perto do
 *               G — o pixel deixa de ser rosa e vira a versão neutra dele
 *               mesmo, em vez de virar um buraco.
 *
 * Apagar sem despill deixa serrilha; despill sem apagar deixa halo. As duas
 * juntas é o que faz o recorte parecer natural em cima de qualquer fundo. */
export const FRANJA_TOLERANCIA = 2.2;   // sobre a tolerância da chave

export function limparFranja(dados, chaves, { tolerancia = 40, forca = 1 } = {}) {
  const p = dados.data, w = dados.width, h = dados.height;
  const limite = tolerancia * 3 * FRANJA_TOLERANCIA;
  const perto = i => {
    for (const [kr, kg, kb] of chaves)
      if (Math.abs(p[i] - kr) + Math.abs(p[i+1] - kg) + Math.abs(p[i+2] - kb) <= limite)
        return true;
    return false;
  };
  const vazio = (x, y) =>
    x < 0 || y < 0 || x >= w || y >= h || p[(y * w + x) * 4 + 3] < 8;
  const naBorda = (x, y) =>
    vazio(x-1, y) || vazio(x+1, y) || vazio(x, y-1) || vazio(x, y+1);

  /* a decisão é lida do ORIGINAL e escrita numa cópia: apagar em cima faria a
     borda avançar para dentro da figura a cada pixel, comendo o contorno */
  const saida = new Uint8ClampedArray(p);

  for (let n = 0; n < forca; n++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (p[i+3] < 8 || !naBorda(x, y)) continue;
      if (perto(i)) { saida[i+3] = 0; continue; }

      /* DESPILL: cada canal em que a chave é forte cai até no máximo o canal
         em que ela é fraca. É o mínimo que tira o rosa sem inventar cor. */
      for (const [kr, kg, kb] of chaves) {
        const k = [kr, kg, kb];
        const fraco = k.indexOf(Math.min(...k));
        const piso = p[i + fraco];
        for (let c = 0; c < 3; c++)
          if (c !== fraco && k[c] > k[fraco] + 40 && p[i + c] > piso)
            saida[i + c] = Math.max(piso, Math.round((p[i + c] + piso) / 2));
      }
    }
    p.set(saida);
  }
  return dados;
}

/* ── 2 · A GRADE NATIVA ──────────────────────────────────────────────────── */

/* A grade não começa no zero, e cada célula tem a própria fase — as duas coisas
   custaram uma medição errada cada. A origem é o canto do CONTEÚDO. */
export function acharGrade(dados, w, h, limX = null, limY = null) {
  const p = dados.data;
  const cor = (x, y) => {
    const i = (y * w + x) * 4;
    return p[i+3] === 0 ? -1 : (p[i] << 16 | p[i+1] << 8 | p[i+2]);
  };
  const lx0 = limX ? limX[0] : 0, lx1 = limX ? limX[1] : w - 1;
  const ly0 = limY ? limY[0] : 0, ly1 = limY ? limY[1] : h - 1;
  /* o canto do CONTEÚDO, e não o da imagem: a grade não começa no zero.
     Nomes por extenso de propósito — `fx` colidia com o `fx` do render.mjs e o
     conferidor de módulos leu como símbolo global não importado (D-053). */
  let iniX = lx1, iniY = ly1, fimX = -1, fimY = -1;
  for (let y = ly0; y <= ly1; y++) for (let x = lx0; x <= lx1; x++)
    if (p[(y*w+x)*4+3] > 8) {
      if (x < iniX) iniX = x; if (y < iniY) iniY = y;
      if (x > fimX) fimX = x; if (y > fimY) fimY = y;
    }
  if (fimX < 0) return 1;

  let melhor = 1;
  for (let n = 2; n <= 32; n++) {
    let iguais = 0, total = 0;
    for (let y = iniY; y <= fimY; y++) for (let x = iniX; x <= fimX; x++) {
      total++;
      const bx = iniX + Math.floor((x - iniX) / n) * n;
      const by = iniY + Math.floor((y - iniY) / n) * n;
      if (cor(x, y) === cor(bx, by)) iguais++;
    }
    if (total && iguais / total >= 0.985) melhor = n;
  }
  return melhor;
}

/* ── AS CÉLULAS, EM DOIS EIXOS ───────────────────────────────────────────── */

function cortes(vazio, n, vaoMin) {
  const out = []; let ini = -1, corrido = 0;
  for (let i = 0; i < n; i++) {
    if (!vazio(i)) { if (ini < 0) ini = i; corrido = 0; }
    else if (ini >= 0 && ++corrido >= vaoMin) { out.push([ini, i - corrido]); ini = -1; corrido = 0; }
  }
  if (ini >= 0) out.push([ini, n - 1]);
  return out;
}

/* AS LINHAS DENTRO DE UMA COLUNA, e não na imagem inteira.
 *
 * `celulas` procura faixas vazias que atravessem a largura toda. Numa grade de
 * gente isso falha, e falha em silêncio: no `trainer_femurbangirl` o rabo de
 * cavalo da fileira do meio sobe até quase os pés da de cima, e em ALGUMA
 * coluna sempre há pixel — a imagem inteira nunca tem uma linha vazia, e as
 * três fileiras voltam como uma só.
 *
 * O resultado era uma tira vertical de 287×1813 no lugar da frente. Não deu
 * erro, não ficou vermelho: gravou um retrato com três bonecos empilhados.
 *
 * Restringindo a busca à faixa X de UMA coluna, o vão volta a existir — porque
 * dentro de uma coluna as figuras estão de fato separadas.
 *
 * ── O LIMIAR DO VÃO NÃO PODE SER FIXO ────────────────────────────────────
 *
 * Medido nas sete grades do dono: os separadores entre fileiras vão de 21 px
 * (`femurbangirl`, rabo de cavalo subindo até quase os pés de cima) a 411 px
 * (`scrapscavengerboy`). Um limiar de 1,5% da altura — 31 px em 2048 — acerta
 * cinco e perde duas; baixá-lo para pegar as duas parte figura ao meio nas
 * outras cinco, porque dentro de um boneco também há vãos.
 *
 * O que separa os dois casos não é o TAMANHO do vão, é o resultado: numa grade
 * as fileiras têm altura PARECIDA. Cortar no lugar certo devolve três faixas
 * quase iguais; cortar dentro de um boneco devolve uma faixa grande e uma
 * miúda. Então o limiar desce até o corte parar de fazer sentido, e o último
 * que ainda fez sentido é o escolhido.
 */
export const UNIFORMIDADE = 1.4;   // a maior fileira sobre a menor

export function linhasEm(dados, w, h, [x0, x1]) {
  const p = dados.data;
  /* mesmo critério de densidade do `celulas`: adereço fino não separa nada,
     mas também não pode IMPEDIR uma separação — ver DENSIDADE_VAZIO. */
  const teto = Math.max(1, Math.round((x1 - x0 + 1) * DENSIDADE_VAZIO));
  const vazia = y => {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (p[(y * w + x) * 4 + 3] > 8 && ++n > teto) return false;
    return true;
  };
  const uniforme = bandas => {
    if (bandas.length < 2) return false;
    const alturas = bandas.map(([a, b]) => b - a + 1);
    return Math.max(...alturas) / Math.max(1, Math.min(...alturas)) <= UNIFORMIDADE;
  };

  let melhor = cortes(vazia, h, Math.max(3, Math.round(h * 0.015)));
  /* Do vão largo para o estreito. Parar no PRIMEIRO uniforme seria parar cedo
     demais — o limiar largo devolve uma faixa só, que é "uniforme" por vacuidade
     e por isso `uniforme` exige duas. Seguir até o fim e ficar com o de mais
     fileiras é o que acha as três do `femurbangirl` sem partir as do resto. */
  for (const frac of [0.015, 0.012, 0.010, 0.008, 0.006]) {
    const c = cortes(vazia, h, Math.max(3, Math.round(h * frac)));
    if (uniforme(c) && c.length > melhor.length) melhor = c;
  }
  return melhor;
}

/* ── VAZIO NÃO É "ZERO PIXEL", É "QUASE NENHUM" ──────────────────────────────
 *
 * O `trainer_fisherman` ensinou isto. São três vistas legítimas lado a lado —
 * frente, perfil, costas — e a esteira leu DUAS: o perfil e as costas saíram
 * grudados numa célula só, de 47 px, e no mundo o jogador via dois pescadores
 * um ao lado do outro dentro do mesmo quadro.
 *
 * A culpa é da VARA DE PESCAR. Ela sobe em diagonal e cruza o vão entre as duas
 * figuras. Nenhuma coluna daquele vão fica completamente vazia — sobra um ou
 * dois pixels de linha de nylon — e "completamente vazia" era o critério.
 *
 * O que separa uma figura de um adereço não é existir, é a DENSIDADE. Um corpo
 * ocupa centenas de pixels na coluna dele; uma vara ocupa dois. Então o vão
 * passa a ser medido, e não constatado.
 *
 * O limiar é deliberadamente baixo. Ele precisa passar por vara, cabo e cana de
 * pesca, e precisa NÃO passar pela perna mais fina de um boneco — que, mesmo
 * fina, cobre a altura inteira da figura. Entre os dois há duas ordens de
 * grandeza, e é por isso que 2% funciona sem ajuste por arquivo. */
export const DENSIDADE_VAZIO = 0.02;

export function celulas(dados, w, h) {
  const p = dados.data;
  const opaco = (x, y) => p[(y*w+x)*4+3] > 8;
  const tetoCol = Math.max(1, Math.round(h * DENSIDADE_VAZIO));
  const tetoLin = Math.max(1, Math.round(w * DENSIDADE_VAZIO));
  const colVazia = x => {
    let n = 0;
    for (let y = 0; y < h; y++) if (opaco(x, y) && ++n > tetoCol) return false;
    return true;
  };
  const linVazia = y => {
    let n = 0;
    for (let x = 0; x < w; x++) if (opaco(x, y) && ++n > tetoLin) return false;
    return true;
  };
  return {
    cols: cortes(colVazia, w, Math.max(3, Math.round(w * 0.015))),
    lins: cortes(linVazia, h, Math.max(3, Math.round(h * 0.015))),
  };
}

/* ── 3 · A REDUÇÃO ───────────────────────────────────────────────────────── */

export function reduzir(dados, w, [x0, x1], altAlvo, limY = null) {
  const p = dados.data;
  const yIni = limY ? limY[0] : 0, yFim = limY ? limY[1] : dados.height - 1;
  let y0 = 1e9, y1 = -1;
  for (let y = yIni; y <= yFim; y++)
    for (let x = x0; x <= x1; x++)
      if (p[(y*w+x)*4+3] > 8) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
  if (y1 < 0) return null;
  let ax = x1, bx = x0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    if (p[(y*w+x)*4+3] > 8) { if (x < ax) ax = x; if (x > bx) bx = x; }
  x0 = ax; x1 = bx;

  const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
  const escala = lh / altAlvo;
  const nw = Math.max(1, Math.round(lw / escala)), nh = altAlvo;

  const c = document.createElement('canvas');
  c.width = nw; c.height = nh;
  const g = c.getContext('2d', { willReadFrequently: true });
  const saida = g.createImageData(nw, nh);

  for (let ny = 0; ny < nh; ny++) for (let nx = 0; nx < nw; nx++) {
    const sx0 = x0 + Math.floor(nx*escala), sx1 = Math.min(x1+1, x0 + Math.ceil((nx+1)*escala));
    const sy0 = y0 + Math.floor(ny*escala), sy1 = Math.min(y1+1, y0 + Math.ceil((ny+1)*escala));
    const conta = new Map();
    let vazios = 0, cheios = 0;
    for (let y = sy0; y < Math.max(sy0+1, sy1); y++)
      for (let x = sx0; x < Math.max(sx0+1, sx1); x++) {
        const i = (y*w+x)*4;
        if (p[i+3] < 8) { vazios++; continue; }
        cheios++;
        const k = p[i] << 16 | p[i+1] << 8 | p[i+2];
        conta.set(k, (conta.get(k) ?? 0) + 1);
      }
    const j = (ny*nw+nx)*4;
    /* Bloco majoritariamente vazio FICA vazio: sem esta regra a silhueta
       engorda um pixel em toda a volta, e num boneco de 52 px isso é muito. */
    if (cheios === 0 || vazios > cheios) { saida.data[j+3] = 0; continue; }
    let moda = 0, max = -1;
    for (const [k, n] of conta) if (n > max) { max = n; moda = k; }
    saida.data[j] = (moda>>16)&255; saida.data[j+1] = (moda>>8)&255;
    saida.data[j+2] = moda&255;     saida.data[j+3] = 255;
  }
  g.putImageData(saida, 0, 0);
  return c;
}

/* ── O CONTORNO ──────────────────────────────────────────────────────────── */

/* Escurece a PRÓPRIA cor da borda, e não pinta preto: contorno preto vira
   adesivo, e o escurecido continua pertencendo ao desenho. */
export function reforcarContorno(src) {
  const w = src.width, h = src.height;
  const g0 = src.getContext('2d', { willReadFrequently: true });
  const d = g0.getImageData(0, 0, w, h), p = d.data;
  const alfa = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : p[(y*w+x)*4+3];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const out = g.createImageData(w, h);
  out.data.set(p);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y*w+x)*4;
    if (p[i+3] === 0) continue;
    if (alfa(x-1,y) && alfa(x+1,y) && alfa(x,y-1) && alfa(x,y+1)) continue;
    for (let k = 0; k < 3; k++) out.data[i+k] = Math.round(p[i+k] * 0.28);
  }
  g.putImageData(out, 0, 0);
  return c;
}

/* ── 4 · OS SEIS PASSOS DERIVADOS ────────────────────────────────────────── */

/* O TRONCO NÃO SE MEXE.
 *
 * A primeira versão subia o tronco um pixel nos DOIS quadros de passo, e o
 * corpo ia sobe-desce-sobe-desce — o dono viu e chamou de "pulinhos". Balanço
 * de corpo só funciona numa fase só do ciclo; nas duas, vira salto. */
export function passo(base, lado) {
  const w = base.width, h = base.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  const corte = Math.round(h * 0.72);
  const meio = Math.round(w / 2);
  const alt = Math.max(1, Math.round(h / 26));
  const sx0 = lado === 0 ? 0 : meio, sw = lado === 0 ? meio : w - meio;
  const px0 = lado === 0 ? meio : 0, pw = lado === 0 ? w - meio : meio;
  g.drawImage(base, 0, 0, w, corte, 0, 0, w, corte);
  g.drawImage(base, px0, corte, pw, h - corte, px0, corte, pw, h - corte);
  g.drawImage(base, sx0, corte, sw, h - corte, sx0, corte - alt, sw, h - corte);
  return c;
}

/* ── A ORDENAÇÃO DAS TRÊS VISTAS ─────────────────────────────────────────── */

/* A ORDEM VEM DE QUEM CHAMA, E NÃO DE PALPITE.
 *
 * A primeira versão adivinhava: "o mais estreito é o perfil". A ideia era
 * funcionar para as duas ordens que aparecem na prática. Ela quebrou no
 * primeiro outfit de verdade — o perfil estava em MEIO-PASSO, com as pernas
 * abertas, e saiu mais largo que as costas. O resultado foram os quadros 1 e 2
 * trocados: o "costas" mostrando o perfil, e vice-versa.
 *
 * A ordem nunca foi ambígua: quem manda os arquivos sabe qual é qual, e numa
 * folha lado a lado a ordem é a da esquerda para a direita. Adivinhar era
 * inventar um problema para resolver mal.
 *
 * `ordem` diz em que sequência as vistas CHEGAM; a saída é sempre a do
 * cartucho — frente, costas, perfil. */
export const ORDEM_PADRAO = ['frente', 'perfil', 'costas'];

export function ordenarVistas(tres, ordem = ORDEM_PADRAO) {
  const onde = nome => {
    const i = ordem.indexOf(nome);
    return tres[i >= 0 && i < tres.length ? i : 0];
  };
  return [onde('frente'), onde('costas'), onde('perfil')];
}

/* ── A FOLHA COMPLETA ────────────────────────────────────────────────────── */

/* Recebe as três vistas já reduzidas e devolve os nove quadros na ordem do
   cartucho: 0 frente · 1 costas · 2 perfil · 3-4 passo de frente · 5-6 de
   costas · 7-8 de perfil. A direita não existe: é o perfil espelhado. */
export function noveQuadros(vistas, { contorno = true, ordem } = {}) {
  let ord = ordenarVistas(vistas, ordem);
  if (contorno) ord = ord.map(reforcarContorno);
  const q = [
    ord[0], ord[1], ord[2],
    passo(ord[0], 0), passo(ord[0], 1),
    passo(ord[1], 0), passo(ord[1], 1),
    passo(ord[2], 0), passo(ord[2], 1),
  ];
  return contorno ? q.map(reforcarContorno) : q;
}

/* A folha num canvas só, alinhada pela BASE — os pés na linha de baixo, que é
   de onde a sombra e a oclusão do cenário são calculadas. */
export function montarFolha(quadros) {
  const w = Math.max(...quadros.map(q => q.width));
  const h = Math.max(...quadros.map(q => q.height));
  const c = document.createElement('canvas');
  c.width = w * 9; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  quadros.forEach((q, i) =>
    g.drawImage(q, i * w + ((w - q.width) >> 1), h - q.height));
  return { canvas: c, quadro: { w, h } };
}

/* ── O CAMINHO INTEIRO, de imagens a folha ───────────────────────────────── */

/* Aceita UMA imagem com as vistas lado a lado, ou VÁRIAS imagens de uma vista
   cada. A segunda forma existe porque o dono mandou assim — e uma esteira que
   só aceita o formato que eu previ é uma esteira que ele não usa. */
export function converter(imagens, { altura = 52, tolerancia = 40,
                                     chaves = [], contorno = true,
                                     ordem = ORDEM_PADRAO } = {}) {
  const vistas = [];
  let gradeVista = 1;
  let ordemReal = ordem, arranjo = 'fila';

  for (const img of imagens) {
    const { dados } = chavear(img, { tolerancia, chaves });
    const w = img.width, h = img.height;
    const { cols } = celulas(dados, w, h);
    if (!cols.length) continue;
    const lins = linhasEm(dados, w, h, cols[0]);
    gradeVista = Math.max(gradeVista, acharGrade(dados, w, h, cols[0], lins[0] ?? null));

    /* ── DUAS ARRUMAÇÕES, e a diferença importa ──────────────────────────
     *
     * FILA      três vistas lado a lado, uma fileira. É como o dono mandou os
     *           arquivos separados, e a ordem é a que `ordem` declara.
     * GRADE     três ou mais fileiras: linha 0 frente, linha 1 perfil ANDANDO,
     *           linha 2 costas. É o formato que o gerador dele produz sozinho.
     *
     * Ler a grade como fila pegava as três primeiras colunas da fileira de cima
     * — três frentes quase idênticas — e o boneco andava de frente para todo
     * lado. Não dava erro: dava um outfit sem costas. */
    if (lins.length >= 3) {
      const pega = (li, ci) => reduzir(dados, w, cols[Math.min(ci, cols.length - 1)],
                                       altura, lins[li]);
      /* a coluna do MEIO na fileira do perfil: numa grade de andar, as colunas
         são fases do passo, e a do meio é a de passada mais aberta — a que
         melhor mostra que aquilo é um perfil e não uma frente estreita */
      const meio = Math.min(1, cols.length - 1);
      for (const v of [pega(0, 0), pega(1, meio), pega(2, 0)]) if (v) vistas.push(v);
      /* empurradas na ordem frente·perfil·costas, que é exatamente a ORDEM_PADRAO —
         a grade tem posição fixa, então o `ordem` de quem chamou não vale aqui */
      ordemReal = ORDEM_PADRAO; arranjo = 'grade';
      continue;
    }

    const limY = lins.length === 1 ? lins[0] : null;
    for (const cx of cols.slice(0, 3)) {
      const v = reduzir(dados, w, cx, altura, limY);
      if (v) vistas.push(v);
    }
  }
  if (!vistas.length) return null;
  while (vistas.length < 3) vistas.push(vistas[0]);

  const quadros = noveQuadros(vistas.slice(0, 3), { contorno, ordem: ordemReal });
  const folha = montarFolha(quadros);
  return { ...folha, quadros, vistas: vistas.slice(0, 3), grade: gradeVista,
           arranjo };
}
