/* A FORÇA APARECE NO RELÓGIO, E O FOCO ENTRA NO COMBATE — bloco A4d.
 *
 * Duas correções do dono, e as duas nasceram de ele ler a medição do fecho da
 * trilha A e desconfiar dela.
 *
 * ── POR QUE A FORÇA PRECISAVA DE UM SEGUNDO LUGAR ─────────────────────────
 *
 *   > "o cara tá com os pokémon level 30 tudo evoluído, ele vai levar 40min
 *   >  pra fazer a floresta no stage 1?"
 *
 * Levava: 31,9 min contra 35,9 do nível 4 — onze por cento, medido. A força só
 * mexia na CHANCE de vencer, e ela satura cedo por decisão do §7.22.6 (*nada é
 * certo, nos dois sentidos*): da razão 1,74 para 4,82 a chance sobe 18 pontos e
 * bate no teto.
 *
 *   > A força tinha UM lugar para aparecer, e esse lugar tem teto. Ela
 *   > precisava de um segundo, e o segundo é o RELÓGIO.
 *
 * ── E O FOCO NÃO ENTRAVA NO AVANÇO ────────────────────────────────────────
 *
 * `poderDaEquipe` usava força, nível e vínculo. O `guia` — que diz "+25% para
 * os aliados" e é a única coisa de combate na tabela — não era aplicado em
 * lugar nenhum.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
import {
  poderDaEquipe, ameacaDa, fatorDoRitmo, RITMO_PISO, RITMO_TETO,
} from '../engine/wave.mjs';
import { roteiroDaWave, DURACAO_MIN_MS, DURACAO_MAX_MS } from '../engine/roteiro-wave.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { BONUS_DO_GUIA } from '../engine/foco.mjs';
import { rngTeste } from './harness.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const dado = (s = 7) => rngTeste(s);
const bicho = (nivel, extra = {}) => ({ nivel, forca: 318, vinculo: 0, foco: null, ...extra });
const naFaixa = (v, min, max, msg) => ok(v >= min && v <= max,
  `${msg} — ${v} fora de [${min}, ${max}]`);

export function suite() {
  const s = criarSuite('avanco-forca');

  /* ── A DURAÇÃO RESPONDE À FORÇA ────────────────────────────────────────── */
  s.teste('a folga de poder ENCURTA a wave, e a falta dela alonga', () => {
    const a = ameacaDa({ elenco: ELENCO, wave: 1, estagio: 1 });
    const fraco = fatorDoRitmo(poderDaEquipe([bicho(4)]), a);
    const forte = fatorDoRitmo(poderDaEquipe([bicho(50)]), a);
    ok(forte < fraco,
      `o nível 50 não encurtou a wave (fator ${forte}) contra o nível 4 (${fraco})`);
    /* E encurta de verdade: não vale um por cento. */
    ok(forte < fraco * 0.75,
      'a diferença entre um novato e um time evoluído ficou pequena demais ' +
      'para alguém notar — era esse o defeito');
  });

  s.teste('o ritmo tem piso e teto, e os dois existem por um motivo', () => {
    const a = ameacaDa({ elenco: ELENCO, wave: 1, estagio: 1 });
    /* Uma equipe absurda não pode fazer a wave virar um piscar: abaixo do piso
       não há o que assistir, e a tela existe para ser assistida. */
    igual(fatorDoRitmo(poderDaEquipe([bicho(200)]), a), RITMO_PISO,
      'sem piso, o time forte transforma a wave num flash');
    /* E quem está muito abaixo sente o peso sem a run virar castigo. */
    igual(fatorDoRitmo(1, a * 100), RITMO_TETO,
      'sem teto, o time fraco fica preso numa wave interminável');
    ok(RITMO_PISO > 0.2 && RITMO_TETO < 2,
      'os limites do ritmo saíram do que se consegue assistir');
  });

  /* ── O RITMO É A RAZÃO, E NÃO A DIFERENÇA (S902 escapou por isso) ───────
   *
   * O defeito plantado troca `RITMO_NEUTRO / (p / a)` por uma conta sobre
   * `p - a`, e ele PASSOU no portão Q2 — depois de o item 5 subir o
   * `RITMO_PISO` de 0,35 para 0,65.
   *
   * A causa é fina e vale escrever: as afirmações que existiam mediam os
   * EXTREMOS, e extremo é onde os dois clamps mandam. Estreitar a faixa
   * aproximou os dois lados do grampo, e as duas fórmulas passaram a devolver
   * os mesmos valores nos pontos medidos.
   *
   *   > Calibrar não é mexer só no produto: uma constante mais apertada pode
   *   > apagar a diferença que um teste usava para enxergar. O teste continua
   *   > verde, e passou a não afirmar nada.
   *
   * O que distingue as duas fórmulas é a INVARIÂNCIA DE ESCALA — que é o
   * motivo inteiro de a razão ter sido escolhida. Dobrar poder e ameaça juntos
   * não pode mudar o ritmo; com diferença, muda tudo. E ela se mede DENTRO da
   * faixa, longe dos grampos, que é onde a fórmula ainda fala. */
  s.teste('o ritmo não muda quando poder e ameaça crescem juntos', () => {
    /* p/a = 2 cai no meio da faixa: 1,6 / 2 = 0,8, longe do piso e do teto. */
    const meio = fatorDoRitmo(20, 10);
    naFaixa(meio, RITMO_PISO + 0.01, RITMO_TETO - 0.01,
      'o ponto de medida encostou num grampo — ali as duas fórmulas empatam, ' +
      'e o teste deixa de distinguir uma da outra');

    for (const escala of [10, 100, 1000, 10_000])
      igual(fatorDoRitmo(20 * escala, 10 * escala), meio,
        `multiplicar os dois lados por ${escala} mudou o ritmo. O fator é a ` +
        'RAZÃO entre poder e ameaça — se ele responder à diferença, o ' +
        'equilíbrio medido no nível 10 não diz nada sobre o 40, e cada ' +
        'estágio novo passa a pedir calibração própria');

    /* E A FORMA DA CONTA, e não só a direção dela: sem isto, qualquer função
       decrescente passaria. O fator é INVERSAMENTE proporcional à razão, então
       o produto `fator × razão` é o mesmo em qualquer ponto da faixa.

       DOIS PONTOS INTERIORES, e não um dobrado: dobrar a razão de 2 para 4 sai
       da faixa e cai no piso — e no piso as duas fórmulas empatam de novo, que
       é exatamente a armadilha que deixou o S902 escapar. 1,4 e 2,0 estão os
       dois dentro. */
    for (const razao of [1.4, 2.0]) {
      const f = fatorDoRitmo(10 * razao, 10);
      naFaixa(f, RITMO_PISO + 0.01, RITMO_TETO - 0.01,
        `a razão ${razao} encostou num grampo — o ponto não distingue nada`);
      ok(Math.abs(f * razao - meio * 2) < 1e-9,
        `na razão ${razao} o produto fator × razão deu ${(f * razao).toFixed(4)} ` +
        `e no ponto do meio deu ${(meio * 2).toFixed(4)}. O fator deixou de ser ` +
        'inversamente proporcional à razão, e os grampos escondem isso nos extremos');
    }
  });

  s.teste('a wave encurtada continua sendo uma wave', () => {
    /* O piso vale sobre a faixa inteira: mesmo esmagando, ela não pode ficar
       mais curta que o tempo de ler o que aconteceu. */
    for (let i = 0; i < 30; i++) {
      const r = roteiroDaWave(dado(100 + i), {
        comp: [{ dex: 10, quantos: 3 }, { dex: 13, quantos: 3 }],
        venceu: true, dano: 6, ritmo: RITMO_PISO,
      });
      naFaixa(r.duracao, DURACAO_MIN_MS * RITMO_PISO, DURACAO_MAX_MS * RITMO_PISO,
        'a wave encurtada saiu da faixa');
      /* ── O PISO CAIU DE 40 s PARA 28 s EM 09/09/2026 ──────────────────
         A wave base passou de 2–4 min para 45–90 s, porque o dono mandou a
         tela com 28:25 na wave 6 de 10 e a frase que serve de régua: *"quem
         joga um idle não tem 1 hr pra passar UM MAPA"*.

         Com a base menor, 40 s deixou de caber embaixo do piso do ritmo — e
         este teste reprovou primeiro, que é o trabalho dele. O número novo
         continua sendo uma CENA: 28 s dá entrada da leva, dois duelos e a
         queda. Abaixo disso vira piscar. */
      ok(r.duracao >= 28_000,
        `uma wave de ${Math.round(r.duracao / 1000)}s é curta demais para ser vista`);
    }
  });

  s.teste('sem ritmo declarado, a wave dura o de sempre', () => {
    /* Um chamador antigo — ou um save de antes — não pode mudar de ritmo por
       acidente. O padrão é 1, e ele é o comportamento que já estava medido. */
    for (let i = 0; i < 20; i++) {
      const r = roteiroDaWave(dado(200 + i), {
        comp: [{ dex: 10, quantos: 3 }], venceu: true, dano: 4,
      });
      naFaixa(r.duracao, DURACAO_MIN_MS, DURACAO_MAX_MS,
        'sem ritmo, a wave mudou de duração');
    }
  });

  /* ── O FOCO ENTRA NO COMBATE ───────────────────────────────────────────── */
  s.teste('o GUIA soma poder à equipe, e é o que ele sempre prometeu', () => {
    const sem = poderDaEquipe([bicho(15), bicho(12)]);
    const com = poderDaEquipe([bicho(15, { foco: 'guia' }), bicho(12)]);
    ok(com > sem, 'o guia não somou nada — ele diz "+25% para os aliados"');
    /* O bônus é dos ALIADOS, e não dele mesmo: é isso que a tabela do foco
       declara, e é o que faz o guia ser uma escolha de EQUIPE. */
    const soZinho = poderDaEquipe([bicho(15, { foco: 'guia' })]);
    igual(soZinho, poderDaEquipe([bicho(15)]),
      'o guia sozinho se beneficiou do próprio bônus');
  });

  s.teste('o bônus do guia é o MESMO número da tabela do foco', () => {
    const sem = poderDaEquipe([bicho(15), bicho(15)]);
    const com = poderDaEquipe([bicho(15, { foco: 'guia' }), bicho(15)]);
    /* Só o aliado ganha, e o peso da vaga já está aplicado nos dois — então a
       razão entre eles é o bônus vezes a fatia daquela vaga. Não conferimos o
       número exato: conferimos que ele SAI da tabela, e não de um literal. */
    ok(com > sem && com < sem * (1 + BONUS_DO_GUIA),
      'o ganho do guia não bate com o BONUS_DO_GUIA da tabela do foco');
  });

  s.teste('os focos de expedição continuam neutros no combate', () => {
    /* O `batedor` acha mais espécies; o `trilheiro` traz mais material. Nenhum
       dos dois bate mais forte, e aplicá-los no poder seria dar de graça o que
       eles já cobram noutra moeda. */
    const base = poderDaEquipe([bicho(15)]);
    for (const foco of ['batedor', 'vigia', 'trilheiro', 'sortudo'])
      igual(poderDaEquipe([bicho(15, { foco })]), base,
        `o foco "${foco}" mexeu no poder de combate, e ele é de expedição`);
  });

  /* ── O FOCO SERVE AOS DOIS MODOS, COM UMA TABELA SÓ ────────────────────
     Pedido do dono: *"faz o reaproveitamento do foco para nova rota, e mantém
     também para ROTA OFF"*. A afirmação é sobre a FONTE: se o Avanço tivesse
     uma tabela própria, elas divergiriam na primeira calibração. */
  s.teste('a colheita da run usa a MESMA função de foco da expedição', () => {
    const cola = ler('../app/modules/avanco-estado.mjs');
    ok(cola.includes('efeitosDa('),
      'a run não aplica o foco no baú — o trilheiro e o sortudo não valem nela');
    ok(cola.includes('focoItemRaro') && cola.includes('focoMaterial'),
      'a run não passa os efeitos do foco ao sorteio de itens');
    /* E a expedição continua usando a mesma. A colheita mudou de arquivo no
       L-162 (o `idle-dados.mjs` passou das 600 linhas), e o teste segue o
       comportamento para onde ele foi morar — a afirmação não mudou. */
    ok(ler('../app/modules/idle-colheita.mjs').includes('efeitosDa('),
      'a expedição parou de aplicar o foco — a Rota OFF perderia o que já tinha');
  });

  s.teste('o poder do guia sai da tabela, e não de um número no motor da wave', () => {
    const w = ler('../engine/wave.mjs');
    ok(w.includes('BONUS_DO_GUIA'),
      'o motor da wave calcula o bônus do guia com número próprio');
    ok(!/aliados:s*0.25/.test(w),
      'a tabela do foco foi copiada para dentro do motor da wave');
  });

  return s;
}
