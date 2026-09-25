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
         limparEstouros, contagem, encenacao, antecedencia, trajetoria,
         direcao8, lancar, quantosNoAr, CARGA_MS, pontosDoJato,
         JATO_ATE_IMPACTO_MS, JATO_MS } from '../app/modules/avanco-efeito.mjs';
import { MOVE_FX } from '../app/modules/efeitos-dados.mjs';
import { ANTECIPACAO_MS } from '../engine/run-avanco.mjs';

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

  /* ══ ST-5.5 · A CARGA NO ATACANTE E O PROJÉTIL ATÉ O ALVO (L-171) ══════
   *
   * A outra metade do golpe da Arena: `cast` é tocado no atacante antes de o
   * golpe sair, `proj` VIAJA do atacante até o alvo. Os dois pedem o PAR — de
   * onde sai e onde chega —, e o par é o que a cena passou a publicar.
   *
   * E o tempo corre ao contrário do da Arena: lá o golpe é lançado e o dano cai
   * quando o projétil chega; aqui o motor já decidiu QUANDO o dano cai, e o
   * projétil tem de sair cedo o bastante para chegar nesse instante. */
  s.teste('a encenação lê cast e proj da tabela da Arena, e o resto é null', () => {
    const sombra = encenacao('Shadow Ball', 100);
    ok(sombra?.projetil?.folha, 'a Shadow Ball tem `proj` na tabela e saiu sem projétil');
    igual(sombra.carga, null, 'a Shadow Ball não tem `cast` e ganhou uma carga');
    ok(sombra.projetil.giro, 'a Shadow Ball GIRA na Arena (`spin`) e aqui não');
    const volt = encenacao('Volt Tackle', 100);
    ok(volt?.carga?.folha, 'o Volt Tackle tem `cast` e saiu sem carga');
    igual(volt.carga.escala, 0.7, 'a escala da carga não é o `csc` da tabela');
    igual(volt.projetil, null, 'o Volt Tackle não tem `proj` e ganhou um');
    igual(volt.cargaMs, CARGA_MS, 'a carga não dura o que dura na Arena');
    /* Só impacto: nada a lançar. O impacto continua sendo o `estourar`. */
    igual(encenacao('Fire Punch', 100), null, 'golpe só de impacto ganhou lançamento');
    igual(encenacao(null, 100), null, 'golpe ausente virou encenação');
    igual(encenacao('Golpe Que Nao Existe', 100), null, 'golpe inventado virou encenação');
  });

  s.teste('a viagem é a da Arena: distância a 420 px/s, entre 160 e 500 ms', () => {
    igual(encenacao('Shadow Ball', 0).viagemMs, 160, 'viagem de distância zero não tem o piso');
    igual(encenacao('Shadow Ball', 105).viagemMs, 250, '105 px a 420 px/s não deu 250 ms');
    igual(encenacao('Shadow Ball', 1e6).viagemMs, 500, 'a viagem longa não tem o teto');
    igual(encenacao('Volt Tackle', 300).viagemMs, 0, 'golpe sem projétil ganhou tempo de viagem');
  });

  /* O MOTOR avisa com ANTECIPACAO_MS de folga. Um golpe cuja carga + viagem
     passasse disso sairia atrasado — o projétil chegaria DEPOIS do número. */
  s.teste('nenhum golpe da tabela pede mais antecedência que a que o motor dá', () => {
    const longos = Object.keys(MOVE_FX)
      .filter(n => antecedencia(encenacao(n, 1e6)) > ANTECIPACAO_MS);
    igual(longos.join(', '), '',
      `estes golpes precisam de mais que ${ANTECIPACAO_MS} ms de aviso, e o projétil ` +
      'chegaria depois do dano');
  });

  s.teste('a trajetória começa no atacante e termina no alvo', () => {
    const o = { x0: 10, y0: 200, x1: 310, y1: 100, arco: 16 };
    const a = trajetoria(o, 0), b = trajetoria(o, 1), m = trajetoria(o, 0.5);
    igual(a.x, 10, 'o projétil não sai do X do atacante');
    igual(a.y, 200, 'o projétil não sai do Y do atacante');
    igual(b.x, 310, 'o projétil não chega ao X do alvo');
    ok(Math.abs(b.y - 100) < 1e-9, `o projétil chega em y=${b.y}, e o alvo está em 100`);
    igual(m.x, 160, 'no meio do caminho o X não é o meio');
    ok(Math.abs(m.y - (150 - 16)) < 1e-9, `o arco não levanta o meio do caminho (y=${m.y})`);
    /* Fora de [0, 1] é grampeado: nunca desenhado atrás do atacante nem além do alvo. */
    igual(trajetoria(o, -1).x, 10, 'k negativo saiu atrás do atacante');
    igual(trajetoria(o, 2).x, 310, 'k acima de 1 passou do alvo');
  });

  s.teste('a direção da folha segue a convenção da Arena (0 baixo, 2 direita, 4 cima, 6 esquerda)', () => {
    igual(direcao8(0, 1), 0, 'para baixo não é a linha 0');
    igual(direcao8(1, 0), 2, 'para a direita não é a linha 2');
    igual(direcao8(0, -1), 4, 'para cima não é a linha 4');
    igual(direcao8(-1, 0), 6, 'para a esquerda não é a linha 6');
    igual(direcao8(1, 1), 1, 'diagonal baixo-direita não é a linha 1');
  });

  s.teste('o projétil sai cedo, VIAJA, e chega no instante do dano', () => {
    limparEstouros();
    usarCarregador(() => ({ ok: true, side: 20, n: 4, rows: 1, img: {} }));
    const pintados = [];
    const g = { globalAlpha: 1, drawImage: (...a) => pintados.push(a) };
    const ACERTA = 10_000;
    const l = lancar('Shadow Ball', { x: 100, y: 100 }, { x: 310, y: 100 },
                     { x: 0, y: 0 }, 'p1', ACERTA);
    ok(l?.projetil, 'o lançamento da Shadow Ball não agendou projétil');
    const via = encenacao('Shadow Ball', 210).viagemMs;
    igual(l.projetil.em, ACERTA - via, 'o projétil não sai `viagem` ms antes do impacto');

    /* ANTES de sair: nada na tela, mas ele continua agendado. */
    desenharEstouros(g, ACERTA - via - 50);
    igual(pintados.length, 0, 'o projétil foi desenhado antes da hora de sair');
    ok(quantosNoAr() >= 1, 'o projétil agendado para daqui a pouco foi DESCARTADO');

    const centro = a => a[5] + a[7] / 2;        // dx + d/2
    desenharEstouros(g, ACERTA - via + 1);
    ok(pintados.length === 1 && Math.abs(centro(pintados[0]) - 100) < 3,
      `no começo da viagem o projétil não está no atacante (x=${pintados[0] && centro(pintados[0])})`);
    desenharEstouros(g, ACERTA - 1);
    ok(pintados.length === 2 && Math.abs(centro(pintados[1]) - 310) < 3,
      `no fim da viagem o projétil não está no alvo (x=${pintados[1] && centro(pintados[1])})`);
    desenharEstouros(g, ACERTA + 1);
    igual(pintados.length, 2, 'o projétil continuou no ar depois do impacto');
    igual(lancar('Shadow Ball', { x: 100, y: 100 }, { x: 310, y: 100 }, { x: 0, y: 0 }, 'p1', ACERTA),
      null, 'o mesmo golpe foi lançado duas vezes — a cena repinta a 60 quadros');
    limparEstouros();
  });

  s.teste('a carga acende NO ATACANTE antes da viagem', () => {
    limparEstouros();
    usarCarregador(() => ({ ok: true, side: 20, n: 4, rows: 1, img: {} }));
    const pintados = [];
    const g = { globalAlpha: 1, drawImage: (...a) => pintados.push(a) };
    const ACERTA = 5_000;
    const l = lancar('Volt Tackle', { x: 40, y: 60 }, { x: 400, y: 60 },
                     { x: 10, y: 20 }, 'c1', ACERTA);
    ok(l?.carga, 'o Volt Tackle não agendou carga');
    igual(l.carga.em, ACERTA - CARGA_MS, 'a carga não começa `CARGA_MS` antes do impacto');
    desenharEstouros(g, ACERTA - CARGA_MS / 2);
    igual(pintados.length, 1, 'a carga não foi desenhada no meio do tempo dela');
    const d = pintados[0][7];
    igual(pintados[0][5] + d / 2, 30, 'a carga não está no X do ATACANTE, no canvas');
    igual(pintados[0][6] + d / 2, 40, 'a carga não está no Y do ATACANTE, no canvas');
    desenharEstouros(g, ACERTA + 1);
    igual(pintados.length, 1, 'a carga continuou acesa depois do impacto');
    igual(lancar('Fire Punch', { x: 0, y: 0 }, { x: 9, y: 9 }, null, 'c2', ACERTA), null,
      'golpe só de impacto foi lançado');
    limparEstouros();
  });

  s.teste('a cena lança os golpes A CAMINHO com o par e a hora do impacto', () => {
    const t = ler('../app/modules/avanco-cena.mjs');
    ok(/cena\.aCaminho/.test(t), 'a cena não lê os golpes a caminho — nada é lançado antes do impacto');
    const chamadas = [...t.matchAll(/lancar\(([\s\S]{0,360}?)\);/g)].map(m => m[1]);
    ok(chamadas.length >= 1, 'a cena não chama `lancar`');
    for (const c of chamadas) {
      ok(/\bcam\b/.test(c), `uma chamada de \`lancar\` não passa a câmera:\n${c}`);
      ok(!/\* escala/.test(c), `uma chamada de \`lancar\` multiplica pela escala (o D-092):\n${c}`);
    }
    ok(/golpe\.t\s*-\s*cena\.t/.test(t),
      'a hora do impacto não sai de `golpe.t - cena.t` — o projétil chegaria em outro instante');
  });

  /* ══ ST-5.5b · O JATO (L-186) ══════════════════════════════════════════
   *
   * O terceiro desenho da Arena entre atacante e alvo: a folha REPETIDA ao
   * longo da linha, com a ponta avançando. Na Arena o dano cai 300 ms depois
   * de o jato sair, e ele dura 550 — continua um instante depois do impacto,
   * que é o que faz ele ler como jato e não como tiro. */
  s.teste('o jato vem da tabela da Arena: Surf sai com jato, sem projétil', () => {
    const surf = encenacao('Surf', 100);
    ok(surf?.jato?.folha, 'o Surf tem `beam` na tabela e saiu sem jato');
    igual(surf.jato.escala, 1.3, 'a escala do jato não é o `sc` da tabela');
    igual(surf.projetil, null, 'o Surf ganhou um projétil');
    igual(surf.viagemMs, JATO_ATE_IMPACTO_MS, 'o jato não leva o tempo da Arena até o impacto');
    /* Carga + jato: o Solar Beam e o Hyper Beam. */
    const solar = encenacao('Solar Beam', 100);
    ok(solar?.carga && solar?.jato, 'o Solar Beam perdeu a carga ou o jato');
    igual(antecedencia(solar), CARGA_MS + JATO_ATE_IMPACTO_MS, 'a antecedência do Solar Beam não soma carga e jato');
  });

  s.teste('os pontos do jato vão do atacante ao alvo, e a ponta avança com o tempo', () => {
    const o = { x0: 0, y0: 0, x1: 100, y1: 0 };
    const cheio = pontosDoJato(o, 1, 20, 1);
    /* 100 px de linha, sprite de 20 × 0,55 de passo: nove segmentos, dez pontos. */
    igual(cheio.length, 10, `o jato cheio tem ${cheio.length} pontos, e a conta da Arena dá 10`);
    igual(cheio[0].x, 0, 'o jato não sai do atacante');
    igual(cheio[cheio.length - 1].x, 100, 'o jato não chega ao alvo');
    igual(pontosDoJato(o, 0.1, 20, 1).length, 2, 'no começo a ponta já estava longe demais');
    igual(pontosDoJato(o, 0.7, 20, 1).length, 10, 'a 70% do tempo o jato ainda não cobria a linha');
    /* Linha curta ainda desenha três segmentos: um jato de um ponto é um estouro. */
    igual(pontosDoJato({ x0: 0, y0: 0, x1: 5, y1: 0 }, 1, 20, 1).length, 4,
      'uma linha curta virou menos de três segmentos');
  });

  s.teste('o jato sai antes do impacto e continua um instante depois', () => {
    limparEstouros();
    usarCarregador(() => ({ ok: true, side: 20, n: 4, rows: 1, img: {} }));
    const pintados = [];
    const g = { globalAlpha: 1, drawImage: (...a) => pintados.push(a) };
    const ACERTA = 20_000;
    const l = lancar('Surf', { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 0, y: 0 }, 'j1', ACERTA);
    ok(l?.jato, 'o Surf não agendou jato');
    igual(l.jato.em, ACERTA - JATO_ATE_IMPACTO_MS, 'o jato não sai 300 ms antes do impacto');
    desenharEstouros(g, ACERTA - JATO_ATE_IMPACTO_MS - 10);
    igual(pintados.length, 0, 'o jato foi desenhado antes de sair');
    desenharEstouros(g, ACERTA + 50);
    ok(pintados.length >= 3, `no impacto o jato desenhou ${pintados.length} segmento(s) — ele cobre a linha`);
    const n = pintados.length;
    desenharEstouros(g, ACERTA - JATO_ATE_IMPACTO_MS + JATO_MS + 1);
    igual(pintados.length, n, 'o jato ficou no ar depois da vida dele');
    limparEstouros();
  });

  return s;
}
