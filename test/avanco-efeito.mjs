/* Q1/Q5 · O EFEITO DO GOLPE SOBRE O ALVO (L-171).
 *
 *   > "olha a diferença das sprites de ataque da arena. Eu quero que seja assim"
 *
 * ── O QUE FALTAVA, E A METADE QUE FALTAVA É A QUE SE VÊ ───────────────────
 *
 *     o QUE BATE     a folha de ataque do atacante      — o A4g trouxe
 *     o QUE ACERTA   o efeito desenhado SOBRE o alvo    — nunca existiu aqui
 *
 * Sem a segunda, o golpe acontece e nada toca o alvo. É a mesma classe do
 * D-083, onde o número existia e não chegava aos olhos.
 *
 * ── E A FONTE É A DA ARENA, e isso é o ponto ─────────────────────────────
 *
 * `MOVE_FX` e `fxSheet` já eram exportados; nunca tinham sido chamados daqui. O
 * trabalho era LIGAR, e não construir — e é literalmente o que o dono escreveu:
 * *"na arena SAEM TODOS OS SPRITES, É SÓ VOCÊ COPIAR E TRAZER PRA CÁ"*.
 *
 * Duas tabelas de efeito para o mesmo golpe fariam o Flamethrower ter dois
 * estouros diferentes em duas telas do mesmo jogo.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { noCanvas, estourar, usarCarregador, desenharEstouros,
         limparEstouros, contagem } from '../app/modules/avanco-efeito.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('avanco-efeito');

  s.teste('o efeito vem da MESMA tabela da Arena, e não de uma cópia', () => {
    const t = ler('../app/modules/avanco-efeito.mjs');
    ok(/from '\.\/efeitos-dados\.mjs'/.test(t),
      'o Avanço não lê a tabela de efeitos da Arena — ele teria uma própria, e ' +
      'o mesmo golpe sairia com dois estouros diferentes em duas telas');
    ok(/MOVE_FX/.test(t), 'a tabela dos golpes não é a da Arena');
    /* O CARREGADOR também é o de lá, e ele entra por injeção: carregar imagem
       precisa de navegador, e a ESCOLHA da folha não. Sem a costura, o módulo
       inteiro só poderia ser afirmado com Chromium. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    const mundo = ler('../app/modules/idle-mundo.mjs');
    ok(/fxSheet/.test(cena + mundo),
      'ninguém liga o carregador de folha da Arena — o estouro seria escolhido ' +
      'e nunca carregado');

    /* E ele NÃO tem uma tabela própria escondida: um mapa de nome -> arquivo
       aqui dentro seria a segunda fonte com outra cara. */
    ok(!/\.png['"]/.test(t),
      'há caminho de arquivo escrito neste módulo — a fonte da folha é o ' +
      '`efeitos-dados.mjs`, e um endereço aqui é uma segunda fonte');
  });

  /* ── O `hit` É A METADE QUE O DONO COBROU ────────────────────────────
     `cast` e `proj` pedem a posição do ATACANTE e a linha entre os dois, e a
     cena do Avanço ainda não publica isso. Trazer o que não dá para posicionar
     seria pôr o estouro no lugar errado — que foi o D-083. */
  s.teste('a folha escolhida é a do IMPACTO, e ausência é resposta normal', async () => {
    const { folhaDoImpacto } = await import('../app/modules/avanco-efeito.mjs');

    const flame = folhaDoImpacto('Flamethrower');
    ok(flame && flame.folha,
      'o Flamethrower não tem folha de impacto — e ele tem uma declarada na ' +
      'tabela da Arena, que é a mesma que este módulo lê');
    ok(Number.isFinite(flame.escala) && flame.escala > 0,
      `a escala do impacto saiu ${flame.escala} — um sprite com escala zero ` +
      'existe e não aparece, que é o defeito exato que se está corrigindo');

    /* AUSÊNCIA É COMUM, e não é erro: a tabela cobre os golpes que valem a
       pena encenar, e o resto sai só com o balão. Inventar um estouro genérico
       ensinaria o jogador que aquele brilho não quer dizer nada. */
    igual(folhaDoImpacto('Golpe Que Nao Existe'), null,
      'um golpe sem efeito declarado ganhou uma folha inventada');
    igual(folhaDoImpacto(null), null, 'golpe ausente derrubou a busca');
    igual(folhaDoImpacto(undefined), null, 'golpe indefinido derrubou a busca');
    igual(folhaDoImpacto(''), null, 'nome vazio virou uma folha');
  });

  /* ── UM ESTOURO POR GOLPE, e não sessenta ────────────────────────────
     A cena repinta a 60 quadros. Sem a chave, cada quadro criaria um estouro
     novo do mesmo golpe — e a tela viraria fogo sólido. É a mesma proteção que
     o número do dano tem desde o A4g. */
  s.teste('o mesmo golpe não estoura duas vezes', async () => {
    const m = await import('../app/modules/avanco-efeito.mjs');
    /* Um carregador de mentira: o que se afirma aqui é o CICLO — quantos
       entram, quando saem —, e não o recorte da folha, que precisa de
       navegador e tem teste na Arena. */
    m.usarCarregador(() => ({ ok: true, side: 32, n: 4, rows: 1, img: {} }));
    m.limparEstouros();
    const antes = m.quantosNoAr();

    /* A CÂMERA entrou na assinatura no D-092: o módulo passou a converter o
       ponto do mundo ele mesmo, para que o espaço da posição e o espaço do
       desenho não pudessem discordar. Aqui ela é a origem — o que se afirma
       nesta função é o CICLO, e não a conversão. */
    const um = m.estourar('Flamethrower', 100, 100, { x: 0, y: 0 }, 'w1:0:500', 1000);
    ok(um, 'o primeiro estouro não aconteceu');
    igual(m.quantosNoAr(), antes + 1, 'o estouro não entrou na lista');

    /* O MESMO golpe, repintado: nada de novo. */
    for (let q = 0; q < 30; q++) m.estourar('Flamethrower', 100, 100, { x: 0, y: 0 }, 'w1:0:500', 1000 + q);
    igual(m.quantosNoAr(), antes + 1,
      'trinta repinturas do mesmo golpe criaram trinta estouros — a cena roda ' +
      'a 60 quadros, e a tela viraria fogo sólido');

    /* Outro golpe, outra chave: esse entra. */
    ok(m.estourar('Flamethrower', 100, 100, { x: 0, y: 0 }, 'w1:0:900', 1400),
      'um golpe NOVO no mesmo lugar foi engolido pela chave do anterior');
    igual(m.quantosNoAr(), antes + 2, 'o segundo golpe não entrou');
    m.limparEstouros();
  });

  s.teste('o estouro tem prazo, e a limpeza da run leva todos', async () => {
    const m = await import('../app/modules/avanco-efeito.mjs');
    m.usarCarregador(() => ({ ok: true, side: 32, n: 4, rows: 1, img: {} }));
    m.limparEstouros();
    igual(m.quantosNoAr(), 0, 'a limpeza não esvaziou a lista');

    m.estourar('Flamethrower', 10, 10, { x: 0, y: 0 }, 'prazo:1', 0);
    igual(m.quantosNoAr(), 1, 'o estouro não entrou');

    /* Um contexto de mentira: o que importa é a contagem, e não o desenho —
       desenhar exige navegador, e a poda não. */
    const g = { globalAlpha: 1, drawImage() {} };
    m.desenharEstouros(g, 10);
    igual(m.quantosNoAr(), 1, 'o estouro morreu antes do prazo');

    m.desenharEstouros(g, m.DURACAO_MS);
    igual(m.quantosNoAr(), 0,
      `o estouro sobreviveu aos ${m.DURACAO_MS} ms. Sem poda a lista só cresce ` +
      'numa aba aberta por horas, e o desenho custa por quadro');

    /* E a limpeza da run leva TODOS: um estouro sobrevivendo ao fim da wave
       apareceria por cima da tela de escolha. */
    m.estourar('Flamethrower', 10, 10, { x: 0, y: 0 }, 'prazo:2', 0);
    m.limparEstouros();
    igual(m.quantosNoAr(), 0, 'a limpeza da run deixou estouro para trás');
  });

  s.teste('o desenho não estoura sem contexto nem com folha ausente', async () => {
    const m = await import('../app/modules/avanco-efeito.mjs');
    /* Aqui o carregador devolve uma folha que NÃO carregou — é o caso que
       importa: esperar por ela foi o defeito que fez o mob sumir no A4g. */
    m.usarCarregador(() => ({ ok: false, side: 0, n: 1, rows: 1, img: {} }));
    m.limparEstouros();
    igual(m.desenharEstouros(null, 0), 0, 'sem canvas, o desenho derrubou a cena');
    igual(m.desenharEstouros(undefined, 0), 0, 'canvas ausente derrubou a cena');

    /* A FOLHA QUE AINDA NÃO CARREGOU é PULADA, e não esperada. Esperar foi
       exatamente o defeito que fez o mob sumir no meio do golpe no A4g — o
       `<img>` remedido a cada troca de folha. */
    m.estourar('Flamethrower', 10, 10, { x: 0, y: 0 }, 'sem-folha:1', 0);
    const g = { globalAlpha: 1, drawImage() { throw new Error('desenhou sem folha'); } };
    igual(m.desenharEstouros(g, 10), 0,
      'a cena desenhou com a folha ainda não carregada — e esperar por ela é o ' +
      'defeito que fez o mob sumir no meio do golpe');
    m.limparEstouros();
  });

  /* A cena precisa CHAMAR os dois. Um efeito escrito e não chamado é a mesma
     tela de antes com um módulo a mais — e passou por esta suíte antes. */
  s.teste('a cena agenda o estouro e o desenha', () => {
    const cena = ler('../app/modules/avanco-cena.mjs');
    ok(/estourar\s*\(/.test(cena),
      'a cena não agenda estouro nenhum — o efeito existe e não roda');
    ok(/desenharEstouros\s*\(/.test(cena),
      'a cena não desenha os estouros — eles seriam agendados e nunca vistos');
    ok(/limparEstouros\s*\(/.test(cena),
      'a cena não limpa os estouros ao acabar — um deles apareceria por cima ' +
      'da tela de escolha');
  });

  /* ══ O D-092 — E ELE É A RAZÃO DE O CONTADOR TER MENTIDO ══════════════
   *
   * O bloco 1.27c fechou dizendo "14 estouros agendados, 413 desenhos". Os dois
   * números estavam certos, e a tela continuava sem efeito nenhum:
   *
   *   > Contador conta CHAMADA. Ele não olha para a tela, e por isso não sabe
   *   > se o que foi desenhado caiu no lugar — ou se caiu fora dela.
   *
   * A cena do idle desenha em dois espaços ao mesmo tempo:
   *
   *     o CANVAS   W x H pixels de MUNDO, esticados pelo CSS
   *     o HTML     molduras vivas, em pixels de TELA — `(x - cam.x) * escala`
   *
   * O estouro nascia com a conta do HTML e era pintado no CANVAS. Com o zoom
   * em 2x — o das capturas do dono — cada um caía ao DOBRO da distância da
   * borda da câmera. Fora do alvo quando ainda cabia; fora da tela quase
   * sempre.
   *
   * A correção estrutural é esta: o módulo passou a RECEBER o ponto do mundo e
   * a câmera, e a converter sozinho. Um espaço só, decidido num arquivo só. */
  s.teste('o estouro é posto em coordenada de CANVAS, e não de tela', () => {
    const p = noCanvas(500, 300, { x: 200, y: 100 });
    igual(p.x, 300, 'a conversão do X não é a da câmera');
    igual(p.y, 200, 'a conversão do Y não é a da câmera');
    /* A asserção que É o defeito: nenhuma escala entra aqui. Se alguém
       reintroduzir o `* escala`, este número deixa de ser 300. */
    ok(!Number.isNaN(p.x), 'a conversão devolveu lixo');
  });

  s.teste('a câmera ausente não desloca nada, e não vira NaN', () => {
    /* Um quadro antes de a câmera existir mandaria todo estouro para `NaN`, e
       `drawImage` com NaN não desenha e não avisa — mais um silêncio. */
    const p = noCanvas(120, 80, null);
    igual(p.x, 120, 'sem câmera o ponto do mundo deixou de ser o próprio ponto');
    igual(p.y, 80, 'idem no Y');
  });

  s.teste('a cena manda MUNDO e CÂMERA, e não pixel de tela', () => {
    const t = ler('../app/modules/avanco-cena.mjs');
    const chamadas = [...t.matchAll(/estourar\(([\s\S]{0,320}?)\);/g)].map(m => m[1]);
    ok(chamadas.length >= 2,
      `achei ${chamadas.length} chamada(s) de \`estourar\` — eram duas: o golpe ` +
      `dele no meu, e o meu no dele`);
    for (const c of chamadas) {
      ok(/\bcam\b/.test(c),
        `uma chamada de \`estourar\` não passa a câmera:\n${c}\nSem ela o módulo ` +
        `não tem como converter, e o ponto volta a ser o de outro espaço`);
      ok(!/\* escala/.test(c),
        `uma chamada de \`estourar\` ainda multiplica pela escala:\n${c}\nEsse ` +
        `fator é do HTML; o estouro é pintado no CANVAS, que não o conhece. ` +
        `Era o D-092, e com zoom 2x ele punha todo estouro fora da tela.`);
    }
  });

  /* ── E O ESTOURO CHEGA A DESENHAR NO PONTO CERTO ────────────────────── */
  s.teste('o que é agendado é o que é desenhado, e no ponto convertido', () => {
    limparEstouros();
    /* Um carregador de mentira: diz que a folha está pronta sem navegador
       nenhum. É a costura que o `usarCarregador` existe para permitir. */
    usarCarregador(() => ({ ok: true, side: 16, n: 4, img: {} }));
    const pintados = [];
    const g = { globalAlpha: 1, drawImage: (...a) => pintados.push(a) };
    estourar('Fire Punch', 500, 300, { x: 200, y: 100 }, 'k1', 1000);
    desenharEstouros(g, 1100);
    igual(pintados.length, 1, 'o estouro agendado não chegou a ser desenhado');
    /* destino x,y são os argumentos 5 e 6 do `drawImage` de nove. */
    const [, , , , , dx, dy] = pintados[0];
    const esc = 0.55;                     // `hsc` do golpe na tabela da Arena
    igual(dx, Math.round(300 - 16 * esc / 2), 'o X pintado não é o do canvas');
    igual(dy, Math.round(200 - 16 * esc / 2), 'o Y pintado não é o do canvas');
  });

  /* ── E O NÚMERO QUE FALTAVA: quantos caíram FORA DA TELA ────────────
     O bloco anterior fechou com "14 agendados, 413 desenhos" e a tela sem
     efeito nenhum. Os dois números estavam certos — nenhum dos dois olhava
     para ONDE o desenho caiu. Este olha. */
  s.teste('o estouro pintado fora do canvas é CONTADO como fora', () => {
    limparEstouros();
    usarCarregador(() => ({ ok: true, side: 16, n: 1, img: {} }));
    const g = { globalAlpha: 1, canvas: { width: 700, height: 400 },
                drawImage: () => {} };
    const antes = contagem().fora;
    /* A câmera põe o alvo a 2000 px da borda: desenhado, e invisível. */
    estourar('Fire Punch', 2500, 300, { x: 0, y: 0 }, 'fora:1', 10);
    desenharEstouros(g, 100);
    ok(contagem().fora === antes + 1,
      'um estouro caiu a 2500 px num canvas de 700 e não foi contado como fora. ' +
      'Sem esse número, "desenhado" continua parecendo "visto" — e foi assim ' +
      'que o D-092 atravessou um bloco inteiro com o portão verde.');
    limparEstouros();
  });

  return s;
}
