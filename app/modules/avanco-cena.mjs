/* A BATALHA DENTRO DO CENÁRIO — bloco A4b (camada 4).
 *
 * Os mobs da wave, desenhados no MESMO mundo em que o treinador já passeia.
 *
 * ── POR QUE ELES ENTRAM NO CENÁRIO, E NÃO NUM PALCO PRÓPRIO ──────────────
 *
 * A prévia aprovada desenhou a cena sobre uma foto do bioma, e foto foi o
 * certo para PERGUNTAR. Para construir, seria a resposta errada: o cenário do
 * idle tem relevo, fauna, partículas, cachoeira, clima, treinador andando e
 * companheiro junto — tudo vivo, tudo já pronto. Uma cena de batalha ao lado
 * disso seria uma segunda tela do mesmo lugar, e a regra permanente do
 * `CLAUDE.md` diz o contrário:
 *
 *   > O cenário do idle nunca está pronto. Todo bloco que passa perto dele
 *   > procura uma melhoria.
 *
 * Então a wave acontece ONDE o jogador já estava olhando. O que este arquivo
 * acrescenta é o elenco que faltava.
 *
 * ── ELES ENTRAM ANDANDO, E DEPOIS DUELAM ────────────────────────────────
 *
 * O mob não nasce no posto: ele **entra pela borda e vem andando** até a
 * frente do treinador, com a folha de caminhada e a direção certa das oito. Aí
 * ele PARA, e os dois trocam golpes.
 *
 * A primeira versão recalculava o posto a cada quadro em volta do treinador, e
 * o efeito foi o que o dono viu e cortou na hora:
 *
 *   > "os pokémon selvagem são pra BATALHAR e não acompanhar"
 *
 * Um bando que anda atrás de você não é uma emboscada — é uma comitiva.
 *
 * ── E O FORMATO DO COMBATE É O DA ARENA, PORQUE ELE JÁ É NOSSO ──────────
 *
 * Pedido literal do dono, e ele poupa uma linguagem visual inteira:
 *
 *     o BALÃO do golpe em cima     a classe `bubble`, a mesma da arena
 *     o DANO subindo no alvo       a classe `dmg`, a mesma da arena
 *     o NOME e o HP embaixo        aqui embaixo, e não num HUD lateral: a
 *                                  arena tem doze lutadores e uma coluna;
 *                                  aqui há UM, e o lugar de ler quem ele é
 *                                  fica onde ele está
 *
 * O balão fica em cima e a placa embaixo, e os dois não trocam de lugar: o
 * balão é o que ACONTECE agora e precisa estar no caminho do olhar; a placa é
 * quem ele É, e ela ancora.
 */
import { PMD, ANIM_FILE } from './sprites-dados.mjs';
/* O ÍCONE DO BALÃO — a cara do bicho que falou. Só a URL: a imagem é
   reaproveitada por balão, e trocar o conteúdo a cada golpe reanimaria a
   opacidade do zero e o balão piscaria entre dois golpes seguidos. */
/* A PLACA, O BALÃO E O NÚMERO saíram para `avanco-hud.mjs` quando este
   arquivo passou de 600 linhas — ver o cabeçalho de lá. */
import { pintarPlaca, balao, flutuar, placas, baloes,
         separarPlacas } from './avanco-hud.mjs';
/* ── O EFEITO DO GOLPE, E O CARREGADOR É O DA ARENA (L-171) ──────────────
   A costura mora aqui, e não dentro do `avanco-efeito.mjs`, porque carregar
   imagem precisa de navegador e a ESCOLHA da folha não — separadas, a escolha
   ganhou teste sem Chromium. É a mesma divisão que este bloco fez cinco vezes.

   A MESMA `fxSheet`, e não uma cópia: duas maneiras de recortar a mesma folha
   divergem no dia em que alguém arrumar uma. */
import { fxSheet } from './efeitos.mjs';
import { estourar, desenharEstouros, limparEstouros,
         usarCarregador } from './avanco-efeito.mjs';
/* A ESCOLHA DA FOLHA saiu daqui e virou camada 0 — ver `folha-viva.mjs`. Ela
   morava numa linha ao lado do `style.backgroundImage`, e por isso nenhum
   teste sem navegador podia afirmá-la. Foi o D-091. */
import { animDoMomento, aSondar, marcarFolha } from './folha-viva.mjs';
usarCarregador(fxSheet);
import { POR_LEVA } from '../../engine/roteiro-wave.mjs';
import { vivos, molduraDe, camadaViva,
         fundoDe, usarFolha, quadroDaFolha, limparFundos, sondarFolha } from './vivos.mjs';

/* Quantas LINHAS cada folha tem. A de caminhada traz as oito direções; as de
   efeito, no pack do PMD, variam — e pedir a linha 4 de uma folha de uma linha
   mostra vazio, que numa cena é o bicho sumindo sem motivo. */
const LINHAS_DA_FOLHA = { w: 8, i: 8, a: 8, h: 8 };
/* A GEOMETRIA MORA FORA, e sem DOM: foi lá que o defeito das direções estava,
   e é lá que ele tem teste. Ver o cabeçalho do `avanco-geometria.mjs`. */
import {
  linhaDe, quadroDe, entrada, alvoDoCombate, pontoDeBatalha, COMBATE,
} from './avanco-geometria.mjs';

/* A MESMA PASTA QUE A ARENA E O COMPANHEIRO USAM. Endereço de arte é tema, e
   usar o mesmo é o que garante que o bicho da wave e o bicho da arena sejam o
   mesmo desenho. */
const PMD_SPRITE = '../assets/raw_githubusercontent_com/PMDCollab/SpriteCollab/master/sprite';

/* O tamanho do mundo do bioma de agora. Guardado e não perguntado: a cena não
   conhece `plantaAtual`, e não deve. */
let mundoAtual = null;

const estados = new Map();    /* chave -> onde o mob está e para onde vai */

export function limparCena() {
  /* Um estouro sobrevivendo ao fim da wave apareceria por cima da tela de
     escolha, onde não há luta nenhuma acontecendo. */
  limparEstouros();
  limparFundos(k => !k.startsWith('mob'));
  for (const el of placas.values()) el.remove();
  placas.clear();
  for (const el of baloes.values()) el.remove();
  baloes.clear();
  estados.clear();
}

const folhaDe = (dex, anim) =>
  `${PMD_SPRITE}/${String(dex).padStart(4, '0')}/${ANIM_FILE[anim]}-Anim.png`;

/* ── O DESENHO ────────────────────────────────────────────────────────────
 *
 * Mesma divisão do resto da cena, e ela não é arbitrária:
 *
 *     quem tem animação PRÓPRIA vira elemento   (o mob, com a folha do PMD)
 *     o que EU animo fica no canvas             (a sombra, a barra, o dano)
 *
 * `cena` é o retrato que o motor devolveu (`cenaDaRun`): quem está de pé, há
 * quanto tempo, e quanto sobrou da barra. Este arquivo não pergunta nada ao
 * motor — ele desenha o que recebeu. */
export function desenharMobs(g, cam, escala, t, eu, cena, sombra, nomeDe, golpeDe, mundo) {
  /* O TAMANHO DO MUNDO entra por argumento, como tudo aqui: este arquivo
     desenha, não consulta. É ele que deixa o campo virar para dentro quando o
     treinador para encostado numa borda — ver `postoDoCompanheiro`. */
  mundoAtual = mundo ?? mundoAtual;
  if (!cena) { limparCena(); return; }
  const vistos = new Set();

  /* ── ELES LUTAM COM O MEU POKÉMON, E NÃO COM O TREINADOR ──────────────
     Correção do dono, e ela conserta duas coisas de uma vez: a poluição em
     cima do boneco e a leitura errada de "mobs brigando entre eles".

     O adversário é o companheiro; o treinador só assiste. Enquanto o
     companheiro não chegou ao campo, o alvo é o CAMPO — assim os mobs vêm
     para o lugar certo em vez de esperarem parados na borda. */
  /* ── O ALVO É O POSTO, E NÃO O COMPANHEIRO ────────────────────────────
     Correção do dono: *"não ficar correndo mapa parecendo pega-pega"*.

     Mirar o companheiro fechava um LAÇO — ele se posicionava em relação ao
     mob, o mob em relação a ele, e o par derivava pelo cenário sem convergir.
     O posto é fixo em relação ao treinador, então há sempre um ponto de
     equilíbrio para onde os dois lados voltam.

     Na hora de BATER o mob mira o corpo, e não o posto: um golpe que acerta o
     lugar onde o inimigo deveria estar não tem peso nenhum. */
  const campo = pontoDeBatalha(eu, mundoAtual);
  const corpoDele = meu.pronto ? { x: meu.x, y: meu.y } : campo;
  const alvoDeles = campo;

  for (const [k, m] of cena.emCena.entries()) {
    /* A CHAVE CARREGA A WAVE, e não só o índice. Sem isso, o mob 0 da wave 5
       herdaria a posição do mob 0 da wave 4 — o bando novo nasceria já
       postado, e a aproximação (que é o que dá vida aos primeiros segundos)
       simplesmente não aconteceria da segunda wave em diante. */
    const chave = 'mob' + cena.wave + '_' + m.i;
    const grade = PMD[m.dex];
    if (!grade) continue;

    /* O ESTADO DE CADA MOB PERSISTE ENTRE QUADROS, porque a aproximação é um
       movimento e movimento tem memória. Nasce na borda, num ângulo derivado
       do índice — derivado, e não sorteado, para o bando não se reorganizar a
       cada repintura. */
    if (!estados.has(chave))
      estados.set(chave, { ...entrada(m.i, campo), dir: 0, andando: true, recuo: 0 });
    const s = estados.get(chave);

    /* ── O MOVIMENTO É O DA ARENA ───────────────────────────────────────
       Ele vem, ronda, investe para bater e recua depois. Nunca congela.

       A primeira versão o fazia parar de vez no posto, e o dono cortou:
       *"esse parado, ele para e simplesmente congela, está feio"*. Estava
       certo — e a resposta não era inventar um movimento, era usar o que a
       arena já faz há vinte blocos. As constantes vêm de lá inteiras. */
    const golpesDele = (cena.golpes ?? []).filter(x => x.i === m.i);
    const batendo = golpesDele.some(x => x.de === 'dele');
    const apanhando = golpesDele.some(x => x.de === 'meu');

    if (batendo) { s.recuo = COMBATE.RECUO; s.investe = true; }
    else if (s.recuo > 0) s.recuo = Math.max(0, s.recuo - 1 / 60);

    /* A INVESTIDA: quem vai bater de perto atravessa a distância em vez de
       chegar andando. É o `dash` da arena, e é o que faz o golpe ter peso. */
    const alvo = batendo
      ? { x: corpoDele.x, y: corpoDele.y }
      : alvoDoCombate(m.i % POR_LEVA, POR_LEVA, alvoDeles,
                      { recuando: s.recuo > 0, t: t + m.i * 700 });

    const dx = alvo.x - s.x, dy = alvo.y - s.y;
    const dist = Math.hypot(dx, dy);
    /* Enquanto CHEGA ele anda depressa; em combate, no passo da arena. */
    const vel = (m.chegando !== false ? COMBATE.WALK * 2.2
                : batendo && dist > COMBATE.DASH_D ? COMBATE.WALK * COMBATE.CHARGE
                : COMBATE.WALK);
    s.andando = dist > 1.2;
    if (s.andando) {
      s.x += dx / dist * Math.min(vel, dist);
      s.y += dy / dist * Math.min(vel, dist);
    }
    /* ELE ENCARA QUEM ESTÁ ENFRENTANDO, e não a direção em que anda: recuando
       de costas, um bicho que vira as costas some da luta. É o `faceLock` da
       arena, dito de outro jeito. */
    s.dir = linhaDe(corpoDele.x - s.x, corpoDele.y - s.y);

    /* ── A FOLHA DO MOMENTO, COM A BASE SEMPRE ATRÁS ────────────────────
       Bater usa a folha de ATAQUE; apanhar, a de DANO — as duas da arena.

       Só 82 das 146 espécies têm essas folhas em disco (contra 146 com a de
       caminhada), então elas NÃO podem ser a base: a moldura de caminhada
       continua sendo o corpo do bicho, e a de efeito entra por cima quando
       existe. Quem não tem simplesmente não pisca — degrada para o que já
       estava certo, em vez de sumir. */
    /* ── A FOLHA DO MOMENTO SUBSTITUI A BASE, E NÃO SE SOMA A ELA ──────
       Correção do dono, terceira volta na mesma tela:

         > "as sprites de ataque não consigo ver ainda, eles se movimentam e
         >  aparece os balões porém não vejo a sprite de ataque"

       Eu MEDI antes de mexer, e a folha estava lá: `Attack-Anim.png` com 896
       px de largura, `complete=true`, moldura visível em z-index 4. O que não
       estava era LEGÍVEL — porque ela era pintada POR CIMA da de caminhada, e
       o que aparecia eram DOIS bichos sobrepostos com meio quadro de
       diferença. Isso não lê como golpe; lê como borrão.

         > Código que roda não é funcionalidade entregue. A entrega é o que
         > chega aos olhos.

       A razão original da sobreposição era honesta — só 82 das 146 espécies
       têm folha de ataque em disco, e eu não queria que as outras 64 sumissem
       ao golpear. A resposta certa para isso não é somar: é ESCOLHER, e cair
       na de caminhada quando a do momento não existe. */
    /* ── A FOLHA DO MOMENTO SÓ ENTRA SE ELA CARREGOU (D-091) ──────────
       Aqui morava `batendo && grade.a ? 'a' : ...` — e `grade` é a TABELA do
       PMD, que promete `a` e `h` para as 146 espécies. Em disco havia 76, e
       o bicho trocava para uma folha inexistente: `background-image` vazio, e
       ele SUMIA no instante exato do golpe, com a placa de nome continuando no
       ar. É o "pokémon selvagem sumindo a sprite" que o dono viu.

       A tabela diz o que a arte PODERIA ter; só o carregamento diz o que ela
       TEM. A decisão inteira mora em `folha-viva.mjs`, camada 0, e o que
       sobrou aqui é a pergunta. */
    const urlDaAnim = k => folhaDe(m.dex, k);
    for (const u of aSondar(grade, urlDaAnim)) sondarFolha(u, marcarFolha);
    const anim = animDoMomento({ batendo, apanhando }, grade, urlDaAnim);
    const [fw, fh, duracoes] = grade[anim] ?? grade.w;
    /* ── DESENHADO COMO NA ARENA, e a diferença era a raiz do defeito ────
       O `<img>` medido no `onload` funcionava enquanto a folha nunca mudava.
       Quando o A4g fez a folha trocar a cada golpe, cada troca zerava a medida
       e esperava o carregamento — e o mob SUMIA ou saía CORTADO no ataque.

         > Uma técnica que só funciona enquanto nada muda não é uma técnica: é
         > uma coincidência que ainda não foi cobrada.

       Aqui é fundo em porcentagem, como a arena faz desde sempre: trocar de
       folha é trocar uma string, e o número de quadros vem da TABELA do PMD,
       que está em memória desde o boot. Nada é medido, nada espera. */
    const v = fundoDe(chave);
    vistos.add(chave);
    if (!v) continue;

    /* AS COLUNAS SÃO AS DURAÇÕES. É o `dur.length` da arena, e ele não
       depende de nenhuma imagem estar carregada. As linhas são as oito
       direções da folha do PMD — e as de efeito às vezes têm só uma. */
    const colunas = Math.max(1, duracoes.length);
    const linhas = anim === 'w' ? 8 : LINHAS_DA_FOLHA[anim] ?? 8;
    /* ANDANDO troca de pata pelo relógio; POSTADO fica no quadro 0.
       ATACANDO corre a folha do golpe UMA vez, do começo — um ataque em laço
       lê como tique nervoso, e é o que faz a diferença entre "ele bateu" e
       "ele está tremendo". */
    const quadro = anim !== 'w' ? quadroDe(duracoes, t) % colunas
                 : s.andando ? quadroDe(duracoes, t) % colunas : 0;
    /* A folha de parado às vezes tem UMA linha só. Pedir a linha 4 dela
       mostraria vazio — e vazio numa cena é o bicho sumindo sem motivo. */
    const linha = Math.min(s.dir, linhas - 1);

    const Lt = fw * escala, At = fh * escala;
    sombra(g, Math.round(s.x - cam.x), Math.round(s.y - cam.y), fw * 0.30);

    usarFolha(v, folhaDe(m.dex, anim), colunas, linhas);
    v.el.style.width = Lt + 'px';
    v.el.style.height = At + 'px';
    v.el.style.transform =
      `translate(${(s.x - cam.x) * escala - Lt / 2}px, ${(s.y - cam.y) * escala - At}px)`;
    /* PROFUNDIDADE contra o treinador, como a fauna já faz: quem está mais ao
       fundo passa atrás. Sem isso o mob flutua na frente dele metade do tempo
       e some atrás na outra metade, sem que nada tenha mudado na cena. */
    v.el.style.zIndex = s.y <= alvoDeles.y ? 1 : 3;
    quadroDaFolha(v, quadro, linha, colunas, linhas);

    /* A PLACA POR CIMA, em coordenadas de TELA. O nome vem de fora: este
       arquivo não conhece o pack, e não deve — ele desenha criaturas, e QUEM
       elas são é tema (§0.3). */
    const px = (s.x - cam.x) * escala;
    const py = (s.y - cam.y) * escala;

    pintarPlaca(chave, v.el.parentElement, {
      x: px, y: py + 3,
      texto: nomeDe ? nomeDe(m.dex) : '',
      vida: m.vida ?? 1, hp: m.hp, hpMax: m.hpMax, chefe: !!m.chefe,
    });

    /* O BALÃO E O DANO saem dos golpes que o motor publicou nos últimos
       instantes. A cena não decide que houve golpe — ela desenha o que
       aconteceu, e é a mesma regra do resto do arquivo.

       O balão APAGA sozinho quando o golpe sai da janela: um balão permanente
       deixa de dizer "agora". */
    for (const golpe of golpesDele) {
      /* Quem BATE mostra o balão; quem APANHA mostra o número. Os dois no
         mesmo bicho seriam duas leituras disputando o mesmo lugar. */
      if (golpe.de === 'dele') {
        /* O BALÃO SOBE MAIS QUANDO SÃO DOIS. Com a leva de dois, dois balões
           na mesma altura se sobrepunham e viravam um borrão — foi o que o
           dono viu: *"olha que poluição visual"*. O deslocamento é por índice,
           e não por ordem na lista, para não pular quando o vizinho cai. */
        balao(chave, v.el.parentElement, px,
              py - At - 6 - (m.i % POR_LEVA) * 17,
              /* O NÍVEL DELES é o do ESTÁGIO — a régua do lugar (L-168). */
              golpeDe ? golpeDe(m.dex, golpe.golpe, cena.nivelDeles) : null);
        /* ── E O EFEITO CAI EM QUEM LEVOU (L-171) ───────────────────
           O golpe DELE acerta o meu companheiro. É a metade do golpe que o
           Avanço nunca teve: sem ela, o atacante se mexe, o balão fala, e nada
           toca o alvo. Ver o cabeçalho do `avanco-efeito.mjs`. */
        if (golpe.dano && meu.pronto)
          /* MUNDO e CÂMERA, e não pixel de tela: o estouro é pintado no
             CANVAS, que não conhece a escala do zoom. Era o D-092 — a conta
             saía daqui em espaço de HTML e chegava lá em espaço de canvas. */
          estourar(golpeDe ? golpeDe(m.dex, golpe.golpe, cena.nivelDeles)?.nome : null,
                   meu.x, meu.y - 14, cam,
                   'fx' + cena.wave + ':e' + golpe.i + ':' + golpe.t, t);

        /* O ataque dele que não tira nada é um ERRO, e a arena já tem palavra
           para isso. Sem ela, um balão sem consequência lê como número que
           sumiu — e o jogador procura o defeito onde não há. */
        if (!golpe.dano)
          flutuar(v.el.parentElement, px, py - At * 0.9, 'ERROU',
                  cena.wave + ':e' + golpe.i + ':' + golpe.t);
      } else {
        /* A CHAVE CARREGA A WAVE. `golpe.t` é o instante DENTRO da wave, e ele
           recomeça do zero na wave seguinte: sem a wave junto, o registro de
           "este número já subiu" barra todos os danos a partir da segunda. */
        /* `'meu'` é o LADO: este número é o dano que EU dou, e ele sai dourado
           — a cor do ganho, a mesma da moeda e do baú. Sem o lado ele caía na
           regra do "ERROU": 11 px, branco, e invisível sobre pixel art clara.
           Medido no navegador, e foi assim que apareceu. */
        flutuar(v.el.parentElement, px, py - At * 0.55,
                '-' + golpe.dano, cena.wave + ':' + golpe.i + ':' + golpe.t, 'meu');
        /* E o EFEITO no mob, que é quem levou (L-171). */
        estourar(golpeDe && meu.dex != null
                   ? golpeDe(meu.dex, golpe.golpe, cena.nivelMeu)?.nome : null,
                 s.x, s.y - fh * 0.45, cam,
                 'fx' + cena.wave + ':' + golpe.i + ':' + golpe.t, t);
      }
    }
    if (!batendo) baloes.get(chave)?.classList.remove('on');
  }

  /* ── E O MEU POKÉMON TAMBÉM LUTA NA TELA, E NÃO SÓ NO MOTOR ──────────
   *
   * Correção do dono, e ela é a mais direta das três:
   *
   *   > "não consigo visualizar os ataques do meu pokémon"
   *
   * Ele estava certo, e o motivo é constrangedor: o companheiro era o único
   * lutador da cena SEM placa, SEM balão e SEM número de dano. Ele batia, o
   * mob perdia HP, e nada na tela dizia que tinha sido ele.
   *
   *   > Metade de um combate desenhada é pior que nenhum: o jogador vê o
   *   > inimigo agir e o próprio bicho ficar parado, e conclui que o dele
   *   > não faz nada.
   *
   * O HP dele é o HP DA RUN (`cena.hp`) — a barra do topo, a mesma que decide
   * a poção. Duas barras com números diferentes para a mesma vida seriam duas
   * verdades, e o jogador acreditaria na errada. */
  if (meu.pronto && cena.emCena.length) {
    const camada = camadaViva();
    const mx = (meu.x - cam.x) * escala;
    const my = (meu.y - cam.y) * escala;
    const meusGolpes = (cena.golpes ?? []).filter(x => x.de === 'meu');
    const levei = (cena.golpes ?? []).filter(x => x.de === 'dele' && x.dano > 0);

    if (camada) {
      pintarPlaca('meu', camada, {
        x: mx, y: my + 3,
        texto: nomeDe && meu.dex != null ? nomeDe(meu.dex) : 'você',
        vida: (cena.hpMax ? cena.hp / cena.hpMax : 1), hp: cena.hp, hpMax: cena.hpMax,
        chefe: false, meu: true,
      });

      /* O BALÃO DELE SOBE MAIS ALTO que o dos mobs: ele está à frente, e um
         balão na mesma altura ficaria por baixo do deles na ordem de pilha. */
      for (const golpe of meusGolpes) {
        balao('meu', camada, mx, my - 52,
              /* E o MEU é o da criatura que foi — ela sobe no meio da run. */
              golpeDe && meu.dex != null
                ? golpeDe(meu.dex, golpe.golpe, cena.nivelMeu) : null,
              meu.dex);
        if (!golpe.dano)
          flutuar(camada, mx, my - 46, 'ERROU', 'm' + cena.wave + ':e:' + golpe.t, 'meu');
      }
      if (!meusGolpes.length) baloes.get('meu')?.classList.remove('on');

      /* O DANO QUE EU LEVO sobe SOBRE MIM, e em vermelho. Antes ele não
         existia em lugar nenhum: o HP do topo caía e nada dizia por quê. */
      for (const golpe of levei)
        flutuar(camada, mx, my - 30, '-' + golpe.dano,
                'm' + cena.wave + ':' + golpe.i + ':' + golpe.t, 'dele');
    }
  } else {
    placas.get('meu')?.remove(); placas.delete('meu');
    baloes.get('meu')?.remove(); baloes.delete('meu');
  }

  /* QUEM CAIU SAI DA CENA. Remover em vez de esconder: um mob que volta na
     wave seguinte é outro indivíduo, e reaproveitar o elemento traria a
     posição do morto junto. */
  /* O MOB agora é um FUNDO e não uma moldura — a varredura mudou de mapa
     junto. Deixá-la no antigo faria os mobs nunca saírem da cena, que é
     exatamente o S887. */
  limparFundos(k => !k.startsWith('mob') || vistos.has(k));
  for (const k of [...estados.keys()]) {
    if (vistos.has(k)) continue;
    estados.delete(k);
    placas.get(k)?.remove();
    placas.delete(k);
    baloes.get(k)?.remove();
    baloes.delete(k);
  }

  /* ── E POR ÚLTIMO, AS PLACAS QUE SE ENCOSTAM (D-081) ─────────────────
     Depois da limpeza de propósito: separar incluindo placas que vão sair
     no mesmo quadro faria as vivas desviarem de fantasmas. */
  separarPlacas();

  /* ── E OS ESTOUROS POR CIMA DE TUDO (L-171) ─────────────────────────
     Depois dos mobs e do companheiro: o efeito é o que ACONTECE, e o que
     acontece fica na frente de quem está. */
  desenharEstouros(g, t);
}

/* ── A CENA CHEGA POR SETTER, E ISSO EVITA UM CICLO ──────────────────────
 *
 * Quem sabe onde a run está é a tela (`avanco-tela.mjs`); quem desenha o mundo
 * é o `idle-mundo.mjs`, e ele roda a 60 quadros. Se o mundo perguntasse à tela,
 * o par viraria um ciclo de importação — e ciclo de módulo neste projeto já
 * derrubou a aba inteira uma vez (D-074).
 *
 * Com o setter, a seta aponta num sentido só: a tela publica o retrato, o
 * mundo consome. E `null` é resposta legítima — quer dizer "não há run", que é
 * o estado normal da aba. */
let cenaAtual = null;
export const usarCena = c => { cenaAtual = c; };
export const cenaDaVez = () => cenaAtual;

/* ── A PLACA E A BARRA DO MOB ─────────────────────────────────────────────
 *
 * ELEMENTO, e não desenho no canvas — e aqui a divisão de sempre ("o que eu
 * animo fica no canvas") perde para uma razão mais forte:
 *
 *   > O canvas do mundo é ampliado 3× com alisamento DESLIGADO, porque é assim
 *   > que pixel art se mostra. Texto desenhado nele sai ampliado do mesmo
 *   > jeito: uma fonte de 10 px vira um borrão de 30. A cena é GBA; a interface
 *   > é neon — e o nome de quem está lutando é interface.
 *
 * É a mesma fronteira dura que o `idle-tela.mjs` registra desde o 1.3c: onde o
 * neon encosta no mundo, o mundo perde a era. Aqui ela é atravessada no
 * sentido certo — o texto fica FORA do canvas, por cima dele.
 *
 * ── E A BARRA NÃO É INVENTADA ────────────────────────────────────────────
 *
 * O motor não modela HP por mob: ele decide a WAVE. O que a barra mostra é o
 * que o roteiro já decidiu — quanto falta para AQUELE mob cair. Numa wave
 * perdida ninguém cai, e as barras ficam cheias: é a leitura certa, porque a
 * wave foi perdida justamente por os mobs não terem sido derrubados.
 */
/* ── A MOLDURA DE EFEITO ─────────────────────────────────────────────────
 *
 * Um segundo elemento por mob, com a folha de ATAQUE ou de DANO, desenhado
 * exatamente sobre o corpo. Ele aparece pelo tempo do golpe e some.
 *
 * ── POR QUE POR CIMA, E NÃO NO LUGAR ────────────────────────────────────
 *
 * Porque as folhas de efeito faltam para 64 das 146 espécies em disco. Se
 * elas substituíssem o corpo, essas 64 sumiriam da tela toda vez que
 * batessem — e sumir é pior que não ter efeito. Por cima, quem não tem folha
 * simplesmente não ganha o floreio, e o resto da cena não sabe da diferença.
 *
 *   > Um recurso que falta em metade dos casos não pode estar no caminho
 *   > crítico do desenho. */


/* ── ONDE O MEU POKÉMON LUTA ─────────────────────────────────────────────
 *
 * O companheiro é desenhado pelo `idle-companheiro.mjs`, que recebe a posição
 * de fora. Durante o duelo, quem manda nessa posição é esta função — e é ela
 * que faz a correção que o dono pediu:
 *
 *   > "os mobs que aparecem é pra BATALHAR COM O MEU POKÉMON"
 *
 * Ele vai até o campo, encara quem está lá, e faz o mesmo vaivém dos mobs:
 * investe ao golpear, recua depois. É o combate da arena, do lado de cá.
 *
 * Devolve `null` quando não há duelo — e aí o companheiro volta a passear
 * atrás do treinador, como sempre fez. */
const meu = { x: 0, y: 0, dir: 0, andando: false, recuo: 0, pronto: false,
              dex: null, anim: 'w' };

export function posicaoDoMeu(eu, cena, t, dexDoMeu = null) {
  if (!cena || !cena.emCena.length) { meu.pronto = false; meu.anim = 'w'; return null; }
  meu.dex = dexDoMeu;

  const campo = pontoDeBatalha(eu, mundoAtual);
  if (!meu.pronto) { meu.x = eu.x; meu.y = eu.y; meu.pronto = true; }

  /* O ALVO É O MOB MAIS PRÓXIMO, e não o primeiro da lista: com dois em cena,
     mirar sempre no índice menor faria o companheiro atravessar a frente de um
     para bater no outro. */
  const alvos = cena.emCena.map(m => estados.get('mob' + cena.wave + '_' + m.i))
    .filter(Boolean);
  const perto = alvos.reduce((a, s) =>
    (!a || Math.hypot(s.x - meu.x, s.y - meu.y) < Math.hypot(a.x - meu.x, a.y - meu.y)) ? s : a, null);

  const batendo = (cena.golpes ?? []).some(g => g.de === 'meu');
  /* ── A FOLHA DELE TAMBÉM TROCA ─────────────────────────────────────
     Mesma correção dos mobs, do lado de cá: batendo ele usa a folha de
     ataque; apanhando, a de dano. Sem isto o companheiro passava a luta
     inteira na folha de CAMINHADA — e o dono via um bicho andando no lugar
     enquanto o HP do topo caía. */
  const apanhando = (cena.golpes ?? []).some(g => g.de === 'dele' && g.dano > 0);
  meu.anim = batendo ? 'a' : (apanhando ? 'h' : 'w');
  if (batendo) meu.recuo = COMBATE.RECUO;
  else if (meu.recuo > 0) meu.recuo = Math.max(0, meu.recuo - 1 / 60);

  /* ── ELE VOLTA AO POSTO, E O POSTO NÃO PERSEGUE NINGUÉM ─────────────
     A versão anterior punha o companheiro "do lado oposto ao mob, à distância
     de combate" — e como o mob se punha em relação a ELE, os dois formavam a
     realimentação que o dono viu como pega-pega.

     Agora: para BATER ele investe no corpo do inimigo; RECUANDO ele dá um
     passo atrás na direção do treinador; e no resto do tempo ele está no
     posto, respirando. Movimento não faltou — o que saiu foi a perseguição. */
  const respiro = Math.sin(t / 1000 * COMBATE.RONDA_HZ * Math.PI * 2) * COMBATE.RONDA;
  const destino = batendo && perto ? { x: perto.x, y: perto.y }
    : meu.recuo > 0 ? { x: campo.x, y: campo.y - COMBATE.RONDA * 4 }
    : { x: campo.x + respiro, y: campo.y + respiro * 0.6 };

  const dx = destino.x - meu.x, dy = destino.y - meu.y;
  const dist = Math.hypot(dx, dy);
  const vel = batendo && dist > COMBATE.DASH_D
    ? COMBATE.WALK * COMBATE.CHARGE
    : COMBATE.WALK * 1.4;
  meu.andando = dist > 1.2;
  if (meu.andando) {
    meu.x += dx / dist * Math.min(vel, dist);
    meu.y += dy / dist * Math.min(vel, dist);
  }
  /* Ele encara o adversário, e não a direção em que anda — recuando de costas,
     um bicho que vira as costas sai da luta. */
  if (perto) meu.dir = linhaDe(perto.x - meu.x, perto.y - meu.y);

  return { x: meu.x, y: meu.y, dir: meu.dir, andando: meu.andando,
           /* `distancia` alimenta o quadro da caminhada no companheiro, que
              anda pela DISTÂNCIA percorrida e não pelo relógio. */
           distancia: (meu.distancia = (meu.distancia ?? 0) + (meu.andando ? vel : 0)) };
}
