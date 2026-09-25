/* A HORA DO DIA — o que a luz faz com a cena (camada 0).
 *
 * ── DE ONDE ISTO VEIO ────────────────────────────────────────────────────
 *
 * L-124, pedido do dono em 02/09/2026:
 *
 *   DIA      sol num canto, tela mais clara
 *   TARDE    alaranjado, sol se pondo
 *   NOITE    estrelas, lua NO LADO OPOSTO de onde o sol nasceu
 *
 *   > "se atente a esse pequeno detalhe. Onde sol nasce e se põe e o mesmo
 *   >  para lua"
 *
 * E a metade que ele fez questão de destacar: **à noite os efeitos do cenário
 * ficam mais fortes** — a brasa do vulcão acesa, o floco brilhando ao
 * entardecer.
 *
 * ── POR QUE CAMADA 0, E NÃO DENTRO DO CANVAS ─────────────────────────────
 *
 * Regra do `CLAUDE.md`: mutante de navegador custa ~30 s, o mesmo mutante num
 * módulo puro custa ~0,1 s. Tudo que é DECISÃO — que período é, quanto escurece,
 * onde está o astro — mora aqui e é pego em Node. O canvas pinta o que este
 * arquivo devolveu, e mais nada.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  PERIODOS, fracaoDoDia, periodoEm, luzEm, astroEm, forcaDoEfeito, estrelasEm,
  brilhoNoturno, ceuEm, estrelasNaJanela, ESTRELAS_NA_JANELA, luzRestanteEm,
  relogioDeParede,
} from '../app/modules/hora-do-dia.mjs';
import { VIDA_QUE_BRILHA } from '../app/modules/particulas.mjs';

/* Luminância perceptual, para comparar céus sem depender de uma cor só. */
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* Um instante do dia, em horas decimais, como epoch UTC. Os testes falam em
   horas porque o pedido do dono fala em horas. */
const aos = h => Date.UTC(2026, 8, 16, 0, 0, 0) + h * 3600_000;
const cada = (passo = 0.25) => {
  const fora = [];
  for (let h = 0; h < 24; h += passo) fora.push(h);
  return fora;
};

export function suite() {
  const s = criarSuite('hora-do-dia');

  /* ══ O DIA INTEIRO ESTÁ COBERTO, E UMA VEZ SÓ ═════════════════════════ */

  s.teste('as 24 horas caem num período, e os períodos são os TRÊS que o dono pediu', () => {
    igual(PERIODOS.join(','), 'dia,tarde,noite',
      'os períodos mudaram. O dono pediu três e os nomeou: DIA, TARDE, NOITE. ' +
      'Um quarto período inventado é uma tela que ele não pediu e não reconhece.');

    for (const h of cada()) {
      const p = periodoEm(aos(h));
      ok(PERIODOS.includes(p),
        `às ${h}h o período é ${JSON.stringify(p)}, que não está na lista. ` +
        'Hora sem período é uma cena sem luz definida — e o canvas pinta o que ' +
        'este módulo devolver, inclusive undefined.');
    }
  });

  s.teste('a fração do dia dá a volta, e volta ao começo', () => {
    igual(fracaoDoDia(aos(0)), 0, 'meia-noite não é o zero da volta');
    ok(Math.abs(fracaoDoDia(aos(12)) - 0.5) < 1e-9, 'meio-dia não é a metade da volta');
    ok(Math.abs(fracaoDoDia(aos(24)) - 0) < 1e-9,
      'a volta não fecha: 24h tinha de cair no mesmo ponto que 0h. Sem isso a ' +
      'cena dá um salto de luz na virada do dia, toda noite, na frente de quem ' +
      'deixou a tela aberta.');
    for (const h of cada(0.5)) {
      const f = fracaoDoDia(aos(h));
      ok(f >= 0 && f < 1, `às ${h}h a fração saiu de [0,1): ${f}`);
    }
  });

  /* ══ A LUZ NÃO DÁ SALTO — É A INVARIANTE QUE PROTEGE A TELA DE FUNDO ══
     Esta é a única tela do produto que fica aberta por horas. Um degrau de
     luz numa tela atravessada passa despercebido; nesta, o olho pega. */

  s.teste('a luz varia SEM DEGRAU ao longo do dia inteiro, inclusive na virada', () => {
    const passo = 1 / 60;   /* um minuto */
    let pior = 0, ondePior = 0;
    for (let h = 0; h < 24; h += passo) {
      const a = luzEm(aos(h)), b = luzEm(aos(h + passo));
      const d = Math.abs(a.alfa - b.alfa);
      if (d > pior) { pior = d; ondePior = h; }
    }
    ok(pior < 0.02,
      `a luz deu um degrau de ${pior.toFixed(4)} em um minuto, às ` +
      `${ondePior.toFixed(2)}h. A cena do idle fica aberta por HORAS ao lado de ` +
      'um filme: um degrau aqui é a coisa que faz a pessoa olhar e fechar.');
  });

  s.teste('a luz é mais clara ao meio-dia e mais escura no meio da noite', () => {
    const meioDia = luzEm(aos(12)), meiaNoite = luzEm(aos(0));
    ok(meioDia.alfa < meiaNoite.alfa,
      `meio-dia (alfa ${meioDia.alfa}) não está mais claro que meia-noite ` +
      `(alfa ${meiaNoite.alfa}). A tinta é o que escurece a cena — mais alfa é ` +
      'mais escuro, e o dia não pode ser o mais escuro dos dois.');
    ok(meiaNoite.alfa > 0,
      'a noite não escurece nada: a cena fica igual às 3h e às 15h, e o ciclo ' +
      'inteiro deixa de existir para quem olha.');
  });

  /* ══ O SOL E A LUA COMPARTILHAM O ARCO ═══════════════════════════════════
     Detalhe que o dono pediu nominalmente: "onde sol nasce e se põe e o mesmo
     para lua". */

  s.teste('o sol e a lua nascem do MESMO lado e se põem do MESMO lado', () => {
    /* Nasce = o começo da travessia dele; põe = o fim. */
    const solNasce = astroEm(aos(6.5)), solPoe = astroEm(aos(17.5));
    const luaNasce = astroEm(aos(19.5)), luaPoe = astroEm(aos(4.5));

    igual(solNasce.qual, 'sol', 'às 6,5h quem está no céu não é o sol');
    igual(luaNasce.qual, 'lua', 'às 19,5h quem está no céu não é a lua');

    ok(Math.sign(solNasce.x - 0.5) === Math.sign(luaNasce.x - 0.5),
      `o sol nasce em x=${solNasce.x.toFixed(2)} e a lua em ` +
      `x=${luaNasce.x.toFixed(2)} — lados opostos da tela. O dono pediu este ` +
      'detalhe com todas as letras: "onde sol nasce e se põe e o mesmo para lua".');
    ok(Math.sign(solPoe.x - 0.5) === Math.sign(luaPoe.x - 0.5),
      `o sol se põe em x=${solPoe.x.toFixed(2)} e a lua em x=${luaPoe.x.toFixed(2)}`);
  });

  s.teste('nunca há sol e lua no céu ao mesmo tempo', () => {
    for (const h of cada(0.25)) {
      const a = astroEm(aos(h));
      ok(a.qual === 'sol' || a.qual === 'lua',
        `às ${h}h o astro é ${JSON.stringify(a.qual)} — o céu ficou sem nenhum, ` +
        'e o canto da tela vazio é o que o dono chamou de "protótipo"');
      ok(a.x >= 0 && a.x <= 1 && a.y >= 0 && a.y <= 1,
        `às ${h}h o astro saiu da tela: x=${a.x}, y=${a.y}`);
    }
  });

  s.teste('o astro SOBE e DESCE, e não anda em linha reta', () => {
    /* No meio da travessia ele tem de estar mais alto que nas pontas — senão o
       "sol num canto" vira um adesivo deslizando na borda de cima. */
    const inicio = astroEm(aos(6.5)), meio = astroEm(aos(12)), fim = astroEm(aos(17.5));
    ok(meio.y < inicio.y && meio.y < fim.y,
      `o sol não faz arco: y vai de ${inicio.y.toFixed(2)} a ${meio.y.toFixed(2)} ` +
      `a ${fim.y.toFixed(2)} (y menor = mais alto). Sem arco ele desliza reto na ` +
      'borda, e lê como adesivo e não como astro.');
  });

  /* ══ A NOITE DEIXA O CENÁRIO MAIS FORTE ══════════════════════════════════
     É a metade do pedido que o dono destacou, e a que a regra do "cenário do
     idle nunca está pronto" cobra em dobro. */

  s.teste('à noite os efeitos do cenário ficam MAIS FORTES', () => {
    const dia = forcaDoEfeito(aos(12)), noite = forcaDoEfeito(aos(0));
    ok(noite > dia,
      `a brasa e o brilho valem ${noite} à noite contra ${dia} de dia — e o ` +
      'pedido era o contrário: "à noite os efeitos do cenário ficam mais fortes". ' +
      'Sem isso a noite é só uma tela escura, que é a versão preguiçosa dela.');
    ok(dia >= 1,
      `de dia a força caiu para ${dia}: o efeito ENFRAQUECEU em vez de a noite ` +
      'o fortalecer, e o cenário de dia ficou pior do que era antes do bloco.');
    /* E sem degrau, pelo mesmo motivo da luz. */
    let pior = 0;
    for (let h = 0; h < 24; h += 1 / 60)
      pior = Math.max(pior, Math.abs(forcaDoEfeito(aos(h)) - forcaDoEfeito(aos(h + 1 / 60))));
    ok(pior < 0.02, `a força do efeito deu um degrau de ${pior.toFixed(4)} em um minuto`);
  });

  s.teste('as estrelas só aparecem quando escurece, e somem quando clareia', () => {
    igual(estrelasEm(aos(12)), 0,
      'há estrelas ao meio-dia. A tela mais clara com estrela em cima é o tipo ' +
      'de erro que nenhum teste pega e todo jogador vê.');
    ok(estrelasEm(aos(0)) > 0, 'a meia-noite não tem estrela nenhuma');
    ok(estrelasEm(aos(0)) >= estrelasEm(aos(19)),
      'o meio da noite não tem mais estrela que o comecinho dela — elas têm de ' +
      'ACENDER conforme escurece, e não aparecer todas de uma vez');
  });

  /* ══ A LUZ DO CENÁRIO ATRAVESSA O ESCURO (a segunda tentativa) ══════════
     A primeira noite foi REPROVADA olhando, e um dos motivos era este: a tinta
     da hora cobria TUDO, inclusive os vaga-lumes. A noite escurecia justamente
     a luz que devia brilhar. Luz de verdade atravessa o escuro. */

  s.teste('o brilho noturno é ZERO de dia — o cenário de dia continua o de antes', () => {
    for (const h of [9, 12, 15])
      igual(brilhoNoturno(aos(h)), 0,
        `às ${h}h a passada de brilho vale ${brilhoNoturno(aos(h))}. De dia ela ` +
        'tem de ser zero: o bloco acrescenta à noite, e não mexe no dia que o ' +
        'dono já aprovou olhando.');
    ok(brilhoNoturno(aos(1)) > 0.9,
      `à 1h o brilho vale ${brilhoNoturno(aos(1))}. É a metade do pedido que o ` +
      'dono destacou — "à noite os efeitos do cenário ficam mais fortes" —, e ' +
      'na primeira tentativa ela estava calculada e ligada em nada.');
    let pior = 0;
    for (let h = 0; h < 24; h += 1 / 60)
      pior = Math.max(pior, Math.abs(brilhoNoturno(aos(h)) - brilhoNoturno(aos(h + 1 / 60))));
    ok(pior < 0.03, `o brilho deu um degrau de ${pior.toFixed(4)} em um minuto`);
  });

  s.teste('as partículas que brilham são as que o dono citou, e a poeira não', () => {
    /* "a brasa do vulcão acesa, o floco de neve brilhando" — L-124. */
    for (const t of ['brasa', 'neve', 'vagalume'])
      ok(VIDA_QUE_BRILHA.has(t),
        `"${t}" não está entre as que brilham à noite. O dono citou a brasa e o ` +
        'floco pelo nome, e o vaga-lume é a luz da floresta.');
    for (const t of ['poeira', 'bolha'])
      ok(!VIDA_QUE_BRILHA.has(t),
        `"${t}" brilha à noite. Poeira acesa no escuro não é luz: é a tela ` +
        'suja com halo, e a regra do tema pede que cada peça escolha de propósito.');
  });

  /* ══ A JANELA DO CÉU ═════════════════════════════════════════════════════
     Um mundo top-down não tem céu. Estrela espalhada na grama lê como poeira —
     foi a primeira tentativa, reprovada. O céu mora numa JANELA no canto, e é
     dentro dela que o astro anda e as estrelas acendem. */

  s.teste('a janela do céu é clara de dia e escura de noite, sem degrau', () => {
    const dia = ceuEm(aos(12)), noite = ceuEm(aos(1));
    ok(lum(dia.topo) > lum(noite.topo) * 2,
      `o céu do meio-dia (lum ${lum(dia.topo).toFixed(0)}) não é bem mais claro ` +
      `que o da 1h (lum ${lum(noite.topo).toFixed(0)}).`);
    const tarde = ceuEm(aos(18));
    ok(tarde.base[0] > tarde.base[2],
      `a base do céu às 18h não puxa para o laranja (rgb ${tarde.base}). O dono ` +
      'nomeou a TARDE pela cor: "alaranjado, sol se pondo".');
    let pior = 0;
    for (let h = 0; h < 24; h += 1 / 60) {
      const a = ceuEm(aos(h)), b = ceuEm(aos(h + 1 / 60));
      for (const k of ['topo', 'base'])
        for (let i = 0; i < 3; i++) pior = Math.max(pior, Math.abs(a[k][i] - b[k][i]));
    }
    ok(pior <= 6,
      `a cor da janela saltou ${pior} numa componente em um minuto — um corte ` +
      'no canto de uma tela que fica aberta por horas.');
  });

  /* ══ A LUZ MULTIPLICA, E NÃO PINTA POR CIMA ══════════════════════════════
     Segunda reprovação olhando, e ela não era de desenho: era de COMPOSIÇÃO.
     Uma cor escura misturada por cima da grama verde vira véu cinza-leitoso —
     a noite lia como neblina, e o ocaso como barro verde-oliva. Luz de verdade
     não pinta por cima: ela TIRA do que existe. `multiply` pela luz que resta. */

  s.teste('ao meio-dia a luz restante é branca — o dia fica exatamente como era', () => {
    igual(luzRestanteEm(aos(12)).join(','), '255,255,255',
      'ao meio-dia a luz restante não é branca, então o multiply mexe na cena de ' +
      'dia — e o dia é o cenário que o dono já aprovou olhando.');
  });

  s.teste('à noite a luz restante é escura e AZUL; na tarde, laranja', () => {
    const [r, g, b] = luzRestanteEm(aos(1));
    ok(b > r && b > g,
      `a luz da noite é rgb(${r},${g},${b}) e não puxa para o azul. Noite que ` +
      'escurece sem mudar de tom é tela apagada, e não luar.');
    ok(lum([r, g, b]) < 110,
      `a luz da noite (lum ${lum([r, g, b]).toFixed(0)}) é clara demais: a cena ` +
      'não escurece o bastante para ler como noite.');
    const t = luzRestanteEm(aos(18.25));
    ok(t[0] > t[2] + 60,
      `às 18h15 a luz é rgb(${t}) — não é alaranjada. O dono nomeou a TARDE pela ` +
      'cor: "alaranjado, sol se pondo".');
  });

  s.teste('a luz restante varia sem degrau, e dá a volta', () => {
    let pior = 0;
    for (let h = 0; h < 24; h += 1 / 60) {
      const a = luzRestanteEm(aos(h)), b = luzRestanteEm(aos(h + 1 / 60));
      for (let i = 0; i < 3; i++) pior = Math.max(pior, Math.abs(a[i] - b[i]));
    }
    ok(pior <= 5,
      `a luz restante saltou ${pior} numa componente em um minuto. Sob multiply o ` +
      'salto cai na cena INTEIRA de uma vez — é o degrau mais visível que há.');
  });

  s.teste('as estrelas da janela acendem à noite e cabem nela', () => {
    igual(estrelasNaJanela(aos(12)), 0, 'há estrela na janela ao meio-dia');
    const n = estrelasNaJanela(aos(1));
    ok(n > 0 && n <= ESTRELAS_NA_JANELA,
      `à 1h a janela tem ${n} estrelas, e o teto dela é ${ESTRELAS_NA_JANELA}.`);
  });

  /* ══ A HORA É A DO JOGADOR, E NÃO A DE GREENWICH ════════════════════════
     Achado pela revisão externa de 24/09 (DEC-10: "qual fuso governa o
     mundo?"). O módulo lia `getUTCHours()` e ninguém convertia: para o dono,
     na Bahia (UTC−3), a cena ficava TRÊS HORAS adiantada — às 5h da madrugada
     dele, já era dia claro. Todos os testes rodavam em UTC, e por isso nenhum
     via. */
  s.teste('o relógio de parede converte o instante para a hora LOCAL do jogador', () => {
    /* `getTimezoneOffset()` devolve +180 na Bahia: minutos a SOMAR à hora
       local para chegar ao UTC. Às 08h UTC são 05h lá — ainda noite. */
    const oitoUtc = aos(8);
    igual(periodoEm(relogioDeParede(oitoUtc, 180)), 'noite',
      'às 08h UTC — 05h na Bahia — a cena diz que é dia. O sol do jogo nasce ' +
      'três horas antes do sol da janela dele.');
    igual(periodoEm(relogioDeParede(oitoUtc, 0)), 'dia',
      'em UTC, 08h tem de continuar sendo dia — a conversão não pode mexer em ' +
      'quem mora em Greenwich');
    /* E o outro lado do mundo: Tóquio é −540. Às 00h UTC são 09h lá. */
    igual(periodoEm(relogioDeParede(aos(0), -540)), 'dia',
      'à 00h UTC, 09h em Tóquio, a cena diz noite — o fuso a leste do ' +
      'meridiano entra com o sinal trocado');
  });

  /* ══ NADA AQUI LÊ O RELÓGIO SOZINHO ══════════════════════════════════════ */

  s.teste('o instante entra por ARGUMENTO, e a mesma hora dá sempre a mesma cena', () => {
    const t = aos(20.25);
    for (const f of [periodoEm, luzEm, astroEm, forcaDoEfeito, estrelasEm,
                     brilhoNoturno, ceuEm, estrelasNaJanela, luzRestanteEm])
      igual(JSON.stringify(f(t)), JSON.stringify(f(t)),
        `${f.name} devolveu coisas diferentes para o MESMO instante. Se ele lê o ` +
        'relógio por dentro, a captura da linha de base muda de resultado ' +
        'conforme a hora em que a suíte roda — e o portão vira sorte.');
  });

  return s;
}
