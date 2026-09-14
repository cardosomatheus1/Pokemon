/* Q1/Q3 · A VIDA NO MUNDO DO IDLE (bloco 1.5c).
 *
 * ── POR QUE ESTE MÓDULO É TESTÁVEL, E O ANTERIOR NÃO ERA ──────────────────
 *
 * O passeio antigo morava dentro do laço de desenho: uma linha de `sin` entre
 * um `clearRect` e um `drawImage`. Para saber se o boneco entrava na água era
 * preciso abrir o navegador e olhar — e "olhar" não pega o caso que acontece
 * aos 40 minutos de aba aberta.
 *
 * Separado, o passeio é aritmética sobre coordenadas: dá para percorrer onze
 * horas de caminhada em milissegundos e afirmar coisas sobre TODAS elas.
 *
 * ── AS QUATRO AFIRMAÇÕES ──────────────────────────────────────────────────
 *
 * 1. **NINGUÉM ENTRA NA ÁGUA.** Nem num quadro. O pé na espuma é o defeito que
 *    o dono chamaria de "parece que está flutuando", e ele aparece uma vez a
 *    cada muitos minutos — que é o pior tipo, porque não reproduz.
 *
 * 2. **O PASSEIO É REPRODUZÍVEL.** Mesma semente, mesmo caminho. Sem isso não
 *    há teste possível, e o §25.2 perde o argumento de auditabilidade.
 *
 * 3. **O PASSEIO NÃO É UM CORREDOR.** Foi a crítica do dono: ir e voltar em
 *    linha reta é um relógio, não exploração. Mede-se a área coberta.
 *
 * 4. **TRAJE SEM PERFIL NÃO ANDA DE LADO.** É a promessa que fiz sobre o
 *    caranguejo. Sem desenho de perfil, o movimento tem de ser vertical.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  mistura, areaAndavel, destino, passeio, direcaoDe, quadroDe, camera,
  companheiro, ladoDe,
  VIES_HORIZONTAL, PASSO_PX, FAIXA_SEM_PERFIL,
} from '../app/modules/vida.mjs';

const T = 16;
const PLANTA = { cols: 44, rows: 28, margem: 26, caminho: 15 };
const AREA = areaAndavel(PLANTA, { qw: 24, qh: 52, T });
const MUNDO_W = PLANTA.cols * T, MUNDO_H = PLANTA.rows * T;

export function suite() {
  const s = criarSuite('vida');

  /* ── 1 · NINGUÉM ENTRA NA ÁGUA ────────────────────────────────────────── */

  s.teste('onze horas de passeio, e o pé nunca toca a água', () => {
    const limiteAgua = PLANTA.margem * T;
    let pior = -1, quando = 0;
    for (let t = 0; t < 40 * 60 * 1000; t += 137) {
      const p = passeio(7, AREA, t);
      if (p.y > pior) { pior = p.y; quando = t; }
    }
    ok(pior < limiteAgua,
      `o pé chegou a y=${pior} aos ${Math.round(quando / 1000)}s, e a areia começa ` +
      `em ${limiteAgua}. Um boneco com o pé na espuma parece afundando — e o ` +
      `defeito aparece uma vez a cada muitos minutos, que é o pior tipo: quem ` +
      `abre a aba para conferir nunca vê.`);
  });

  s.teste('ninguém sai pela borda de cima nem pelos lados', () => {
    for (let t = 0; t < 20 * 60 * 1000; t += 211) {
      const p = passeio(99, AREA, t);
      ok(p.x >= AREA.x0 - 1 && p.x <= AREA.x1 + 1,
        `x=${p.x} fora de [${AREA.x0}, ${AREA.x1}] aos ${t}ms — meio boneco ` +
        'sairia pela borda do mundo');
      ok(p.y >= AREA.y0 - 1,
        `y=${p.y} acima de ${AREA.y0} aos ${t}ms — a cabeça sai pelo topo`);
    }
  });

  /* ── 2 · REPRODUZÍVEL ─────────────────────────────────────────────────── */

  s.teste('mesma semente, mesmo caminho', () => {
    for (const t of [0, 1234, 91000, 600000]) {
      const a = passeio(42, AREA, t), b = passeio(42, AREA, t);
      igual(`${a.x},${a.y},${a.dir}`, `${b.x},${b.y},${b.dir}`,
        `o passeio divergiu em t=${t}. Sem reprodutibilidade não há teste, e o ` +
        '§25.2 perde o argumento de auditabilidade.');
    }
  });

  s.teste('sementes diferentes andam por lugares diferentes', () => {
    const a = passeio(1, AREA, 30000), b = passeio(2, AREA, 30000);
    ok(Math.hypot(a.x - b.x, a.y - b.y) > 8,
      'dois passeios de sementes diferentes coincidiram. A semente existe para ' +
      'que dois biomas não tenham a mesma coreografia — repetida, ela vira ' +
      'papel de parede.');
  });

  s.teste('a mistura devolve [0,1) e não repete de graça', () => {
    const vistos = new Set();
    for (let i = 0; i < 2000; i++) {
      const v = mistura(5, i);
      ok(v >= 0 && v < 1, `mistura(5,${i}) = ${v}, fora de [0,1)`);
      vistos.add(Math.floor(v * 100));
    }
    ok(vistos.size > 80,
      `2000 amostras caíram em ${vistos.size} centésimos de 100. Uma mistura que ` +
      'agrupa faz o boneco visitar sempre a mesma faixa do mapa.');
  });

  /* ── 3 · NÃO É UM CORREDOR ────────────────────────────────────────────── */

  s.teste('o passeio cobre o mapa, e não uma faixa', () => {
    /* 12×8 casas sobre a área andável; conta quantas foram pisadas em 20 min */
    const CX = 12, CY = 8, casas = new Set();
    for (let t = 0; t < 20 * 60 * 1000; t += 250) {
      const p = passeio(3, AREA, t);
      const cx = Math.min(CX - 1, Math.floor((p.x - AREA.x0) / ((AREA.x1 - AREA.x0) / CX)));
      const cy = Math.min(CY - 1, Math.floor((p.y - AREA.y0) / ((AREA.y1 - AREA.y0) / CY)));
      casas.add(cy * CX + cx);
    }
    ok(casas.size >= CX * CY * 0.6,
      `o passeio pisou em ${casas.size} de ${CX * CY} casas. Ir e voltar em linha ` +
      'reta é um relógio, não exploração — depois de dez segundos o jogador já ' +
      'sabe onde o boneco vai estar, e a cena para de ser um lugar. Foi a ' +
      'crítica do dono ao passeio antigo.');
  });

  s.teste('há pausas — quem explora para para olhar', () => {
    let parado = 0, total = 0;
    for (let t = 0; t < 5 * 60 * 1000; t += 100) {
      total++;
      if (!passeio(11, AREA, t).andando) parado++;
    }
    ok(parado / total > 0.06 && parado / total < 0.6,
      `o boneco ficou parado em ${(100 * parado / total).toFixed(0)}% do tempo. ` +
      'Zero pausa lê como patrulha; pausa demais lê como travado.');
  });

  /* ── 4 · O TRAJE SEM PERFIL NÃO ANDA DE LADO ──────────────────────────── */

  s.teste('sem perfil, a direção nunca é lateral', () => {
    for (let t = 0; t < 15 * 60 * 1000; t += 173) {
      const p = passeio(5, AREA, t, { semPerfil: true });
      ok(p.dir !== 'esq' && p.dir !== 'dir',
        `direção "${p.dir}" aos ${t}ms num traje sem perfil. Sem desenho de lado, ` +
        'a vista de frente deslizando na horizontal é o que o dono chamou de ' +
        '"andando de lado igual caranguejo".');
    }
  });

  s.teste('sem perfil, o trajeto é vertical de verdade, e não só a vista', () => {
    /* Travar apenas a direção deixaria o caranguejo de pé: ele andaria na
       horizontal mostrando a frente. O que muda é o TRAJETO. */
    let horizontal = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const a = destino(5, i, AREA, { semPerfil: true });
      const b = destino(5, i + 1, AREA, { semPerfil: true });
      n++;
      if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) horizontal++;
    }
    ok(horizontal / n < 0.2,
      `${(100 * horizontal / n).toFixed(0)}% dos trechos são horizontais mesmo com ` +
      `semPerfil. A faixa útil é ${FAIXA_SEM_PERFIL} da largura justamente para ` +
      'que o dy domine o dx.');
  });

  s.teste('com perfil, o boneco USA as quatro direções', () => {
    const vistas = new Set();
    for (let t = 0; t < 10 * 60 * 1000; t += 149) vistas.add(passeio(8, AREA, t).dir);
    ok(vistas.size === 4,
      `só ${vistas.size} direções apareceram (${[...vistas].join(', ')}). A folha ` +
      'tem frente, costas e perfil, e o perfil espelhado dá a quarta — não usar ' +
      'todas joga fora metade da conversão.');
  });

  /* ── a direção e o quadro ─────────────────────────────────────────────── */

  s.teste('a horizontal só ganha quando é claramente horizontal', () => {
    igual(direcaoDe(10, 9), 'baixo',
      'com limiar em 1:1 exato, um trajeto quase diagonal troca de vista a cada ' +
      'quadro e o boneco treme');
    igual(direcaoDe(10 * VIES_HORIZONTAL + 1, 9.9), 'dir');
    igual(direcaoDe(-30, 1), 'esq');
    igual(direcaoDe(1, -30), 'cima');
  });

  s.teste('a fase do passo vem da DISTÂNCIA, e volta ao quadro parado', () => {
    const seq = [];
    for (let d = 0; d < PASSO_PX * 8; d += PASSO_PX) seq.push(quadroDe('baixo', d, true).quadro);
    igual(seq.join(','), '0,3,0,4,0,3,0,4',
      'a sequência do passo devia ser parado·A·parado·B. Sem a volta ao quadro ' +
      'parado, a caminhada lê como corrida — e se a fase vier do relógio em vez ' +
      'da distância, a perna e o chão andam em ritmos independentes e o boneco ' +
      'desliza. Foi o defeito dos "pulinhos".');
  });

  s.teste('a direita é o perfil espelhado, e não um quadro próprio', () => {
    const d = quadroDe('dir', 0, false), e = quadroDe('esq', 0, false);
    igual(d.quadro, e.quadro, 'direita e esquerda usam o MESMO quadro');
    ok(d.espelhar && !e.espelhar,
      'a folha tem nove quadros e a direita não é um deles — o cartucho ' +
      'economizava espelhando, e reproduzir a economia é o que mantém a ' +
      'fidelidade');
  });

  s.teste('parado mostra a vista da direção, e não um passo', () => {
    for (const dir of ['baixo', 'cima', 'esq', 'dir'])
      ok(quadroDe(dir, 12345, false).quadro < 3,
        `parado na direção "${dir}" mostrou um quadro de passo. Parar com a perna ` +
        'no ar é a diferença entre um boneco que descansa e um que congelou.');
  });

  /* ── o companheiro ────────────────────────────────────────────────────── */

  /* REESCRITO no 1.5c. Antes o companheiro seguia o caminho ATRASADO, e o
     teste tolerava 25% de sobreposição. Tolerar era o erro: qualquer pausa
     maior que o atraso junta os dois, e as pausas variam até 3,1 s. O dono viu
     na tela antes de o teste ver. Agora a separação é GARANTIDA, e o teste
     afirma isso em todo quadro em vez de na média. */
  s.teste('o Pokémon NUNCA se sobrepõe ao treinador', () => {
    let pior = 1e9, quando = 0;
    for (let t = 0; t < 10 * 60 * 1000; t += 91) {
      const a = passeio(4, AREA, t), b = companheiro(4, AREA, t);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < pior) { pior = d; quando = t; }
    }
    ok(pior >= 12,
      `a menor distância entre os dois foi ${pior.toFixed(1)} px, aos ${Math.round(quando/1000)}s. ` +
      'Sobrepostos, viram um borrão de duas cabeças — o dono descreveu como o ' +
      'Pokémon estar "preso na bota" do treinador. Não basta ser raro: parado é ' +
      'justamente quando o jogador olha a cena com calma.');
  });

  s.teste('o companheiro fica ao lado nos quatro rumos', () => {
    for (const dir of ['baixo', 'cima', 'esq', 'dir']) {
      const l = ladoDe(dir);
      ok(Math.hypot(l.dx, l.dy) >= 12,
        `no rumo "${dir}" o desvio é de ${Math.hypot(l.dx, l.dy).toFixed(1)} px — perto ` +
        'demais para lerem como duas figuras');
    }
  });

  s.teste('o companheiro também respeita a água', () => {
    const limite = PLANTA.margem * T;
    for (let t = 0; t < 10 * 60 * 1000; t += 197)
      ok(companheiro(4, AREA, t).y < limite,
        'o Pokémon entrou na água. Ele anda pelo mesmo passeio do treinador, ' +
        'atrasado — se ele pode entrar, a área andável é que está errada.');
  });

  /* ── a câmera ─────────────────────────────────────────────────────────── */

  s.teste('a câmera segue, mas para nas bordas', () => {
    const vw = 320, vh = 200;
    const c1 = camera({ x: 0, y: 0 }, vw, vh, MUNDO_W, MUNDO_H);
    igual(`${c1.x},${c1.y}`, '0,0',
      'no canto do mapa a câmera não pode mostrar o vazio de fora — ver o nada ' +
      'quebra a ilusão mais do que a câmera não centralizar');
    const c2 = camera({ x: MUNDO_W, y: MUNDO_H }, vw, vh, MUNDO_W, MUNDO_H);
    igual(`${c2.x},${c2.y}`, `${MUNDO_W - vw},${MUNDO_H - vh}`);
    const c3 = camera({ x: MUNDO_W / 2, y: MUNDO_H / 2 }, vw, vh, MUNDO_W, MUNDO_H);
    igual(c3.x, Math.round(MUNDO_W / 2 - vw / 2), 'no meio, a câmera centraliza');
  });

  s.teste('viewport maior que o mundo não gera deslocamento negativo', () => {
    const c = camera({ x: 10, y: 10 }, MUNDO_W + 200, MUNDO_H + 200, MUNDO_W, MUNDO_H);
    igual(`${c.x},${c.y}`, '0,0',
      'com zoom bem afastado a viewport passa do mundo. Deslocamento negativo ' +
      'desenharia o mapa deslocado para dentro da tela, com faixa vazia à ' +
      'esquerda — e o zoom máximo é justamente o que o jogador vai testar primeiro.');
  });

  /* ── a área andável ───────────────────────────────────────────────────── */

  s.teste('a área andável para antes da areia', () => {
    ok(AREA.y1 < PLANTA.margem * T,
      'o limite de baixo tem de ficar acima da fileira de areia');
    ok(AREA.y0 > 0 && AREA.y1 > AREA.y0,
      'a área andável ficou vazia ou invertida — o boneco não teria para onde ir');
    ok(AREA.x1 > AREA.x0,
      'a área andável ficou sem largura');
  });

  return s;
}
