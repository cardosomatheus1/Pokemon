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
} from '../app/modules/hora-do-dia.mjs';

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

  /* ══ NADA AQUI LÊ O RELÓGIO SOZINHO ══════════════════════════════════════ */

  s.teste('o instante entra por ARGUMENTO, e a mesma hora dá sempre a mesma cena', () => {
    const t = aos(20.25);
    for (const f of [periodoEm, luzEm, astroEm, forcaDoEfeito, estrelasEm])
      igual(JSON.stringify(f(t)), JSON.stringify(f(t)),
        `${f.name} devolveu coisas diferentes para o MESMO instante. Se ele lê o ` +
        'relógio por dentro, a captura da linha de base muda de resultado ' +
        'conforme a hora em que a suíte roda — e o portão vira sorte.');
  });

  return s;
}
