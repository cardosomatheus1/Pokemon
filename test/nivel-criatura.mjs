/* Q1/Q3/Q4/Q6 · O NÍVEL E O VÍNCULO DA CRIATURA (bloco 1.14, camada 0).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ──────────────────────────────────────────
 *
 * A L-099 registrou que `nivel`, `vinculo` e `foco` eram gravados na criação e
 * nunca escritos depois. Três números parados desde o bloco 1.1, e dois deles
 * bloqueando coisas de verdade: a evolução (`exige: { nivel: 16 }`) e os stages
 * (L-084, que desbloqueia por nível).
 *
 * ── AS SEIS AFIRMAÇÕES ───────────────────────────────────────────────────
 *
 * 1. **A CURVA COMEÇA EM ZERO.** O nível 1 exige 0 XP. É o D-006 do treinador
 *    chegando aqui: lá, `100·n^1,5` fazia a barra do nível 1 nascer NEGATIVA e
 *    ficou assim desde sempre, porque ninguém olhou.
 *
 * 2. **O XP NÃO É SORTEADO.** Experiência não é loteria. O saque varia porque
 *    a graça dele é abrir e ver; o XP não varia porque o jogador precisa poder
 *    planejar "mais duas Vigílias e ele evolui".
 *
 * 3. **AS DUAS LEITURAS SE OPÕEM.** Por encontro o XP sobe com a duração; por
 *    hora ele desce. Mesma forma do dinheiro, e pela mesma razão: sem isso um
 *    perfil domina os outros e a escolha morre.
 *
 * 4. **O VÍNCULO NÃO É UM SEGUNDO XP.** Ele conta TEMPO JUNTOS, não encontros.
 *    Duas barras que sobem juntas são uma barra com duas cores.
 *
 * 5. **A PRIMEIRA EVOLUÇÃO CABE EM POUCOS DIAS.** Calibragem, e ela é o que
 *    separa um idle de uma planilha: um mês até o primeiro marco perde o
 *    jogador antes de mostrar o que o jogo é.
 *
 * 6. **NADA DISSO TEM PORTA (§P5).** Nem XP, nem vínculo, nem nível aceitam
 *    valor de fora.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  xpParaNivel, nivelDe, progresso, NIVEL_MAX,
  XP_POR_ENCONTRO, xpPorEncontroDe, xpDaExpedicao,
  VINCULO_MAX, vinculoDaExpedicao, creditar,
} from '../engine/nivel-criatura.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* O teto de encontros num dia cheio do perfil mais rendoso — a régua de
   "quantos dias até". Vem do motor, e não de uma constante escrita aqui: se o
   teto mudar, a calibragem tem de ser reconferida, não silenciosamente aceita. */
const XP_POR_DIA = 30 * XP_POR_ENCONTRO.vigilia;

export function suite() {
  const s = criarSuite('nivel-criatura');

  /* --- 1 · A CURVA -------------------------------------------------------- */

  s.teste('o nível 1 começa em ZERO, e a barra nunca nasce negativa', () => {
    igual(xpParaNivel(1), 0);
    igual(xpParaNivel(0), 0);
    const p = progresso(0);
    igual(p.nivel, 1);
    igual(p.atual, 0,
      `uma criatura recém-criada mostraria ${p.atual} XP na barra. É o D-006 ` +
      'chegando aqui: no treinador, a mesma curva sem piso deixou a barra do ' +
      'nível 1 NEGATIVA desde sempre, e ninguém viu porque ninguém olhou.');
    ok(p.pct >= 0 && p.pct <= 100, `a barra saiu em ${p.pct}%`);
  });

  s.teste('a curva sobe sempre, e o nível cresce com o XP', () => {
    for (let n = 2; n <= NIVEL_MAX; n++)
      ok(xpParaNivel(n) > xpParaNivel(n - 1),
        `o nível ${n} não exige mais XP que o ${n - 1}. Uma curva que anda para ` +
        'trás faz um ganho de XP BAIXAR o nível — e nenhum jogador perdoa isso.');
    let anterior = 1;
    for (let xp = 0; xp < 120000; xp += 137) {
      const n = nivelDe(xp);
      ok(n >= anterior, `de ${xp - 137} para ${xp} de XP o nível caiu`);
      anterior = n;
    }
  });

  s.teste('o nível é limitado, e a barra sabe dizer que chegou', () => {
    igual(nivelDe(99999999), NIVEL_MAX);
    const p = progresso(99999999);
    ok(p.maximo, 'no nível máximo a barra não se declarou completa');
    igual(p.falta, 0);
    igual(p.pct, 100);
    ok(Number.isFinite(p.pct),
      'a porcentagem virou NaN no topo — é o que acontece quando o denominador ' +
      'da barra é `fim - ini` e não há próximo nível.');
  });

  s.teste('XP inválido não quebra nem promove', () => {
    for (const v of [null, undefined, NaN, -50, 'muito', {}]) {
      igual(nivelDe(v), 1, `${JSON.stringify(v)} de XP deu nível ${nivelDe(v)}`);
      const p = progresso(v);
      ok(Number.isFinite(p.pct) && p.pct >= 0,
        `${JSON.stringify(v)} de XP deu barra em ${p.pct}%. O estado vem do ` +
        'localStorage: valor estranho não é hipótese, é quinta-feira.');
    }
  });

  /* --- 2 · O XP NÃO É SORTEADO ------------------------------------------- */

  s.teste('a mesma expedição rende sempre o mesmo XP', () => {
    for (const perfil of Object.keys(PERFIS))
      for (const encontros of [0, 3, 7, 14]) {
        const a = xpDaExpedicao({ perfil, encontros });
        const b = xpDaExpedicao({ perfil, encontros });
        igual(a, b);
        igual(a, encontros * xpPorEncontroDe(perfil),
          `${perfil} com ${encontros} encontros rendeu ${a}, e não ` +
          `${encontros * xpPorEncontroDe(perfil)}. Experiência não é loteria: o ` +
          'saque varia porque a graça dele é abrir e ver; o XP não varia porque ' +
          'o jogador precisa poder planejar "mais duas Vigílias e ele evolui".');
      }
  });

  /* --- 3 · AS DUAS LEITURAS SE OPÕEM ------------------------------------- */

  s.teste('nenhum perfil é dominado: XP por HORA desce quando a duração sobe', () => {
    const porHora = p => {
      const [eMin, eMax] = PERFIS[p].encontros;
      return xpPorEncontroDe(p) * ((eMin + eMax) / 2) / (PERFIS[p].minutos / 60);
    };
    const ordem = Object.keys(PERFIS).sort((a, b) => PERFIS[a].minutos - PERFIS[b].minutos);
    for (let i = 1; i < ordem.length; i++) {
      const curto = ordem[i - 1], longo = ordem[i];
      ok(porHora(curto) > porHora(longo),
        `${curto} rende ${porHora(curto).toFixed(0)} XP/h e ${longo} rende ` +
        `${porHora(longo).toFixed(0)}. O perfil longo não pode ganhar também no ` +
        'ritmo — se ganhasse, não haveria motivo para jogar acordado.');
      ok(xpPorEncontroDe(curto) < xpPorEncontroDe(longo),
        `${curto} paga ${xpPorEncontroDe(curto)} por encontro e ${longo} paga ` +
        `${xpPorEncontroDe(longo)}. O perfil longo tem de ganhar POR ENCONTRO: é ` +
        'o que compra as oito horas. A troca só existe quando as duas leituras ' +
        'se opõem.');
    }
  });

  /* --- 4 · O VÍNCULO NÃO É UM SEGUNDO XP --------------------------------- */

  s.teste('o vínculo conta TEMPO junto, e não encontros', () => {
    const a = vinculoDaExpedicao({ minutos: PERFIS.vigilia.minutos });
    const b = vinculoDaExpedicao({ minutos: PERFIS.batida.minutos });
    ok(a > b,
      `a Vigília de 8 h rendeu ${a} de vínculo e a Batida de 45 min rendeu ${b}. ` +
      'Oito horas ao lado do treinador constroem mais laço que quarenta e cinco ' +
      'minutos, e é só isso que a fórmula precisa dizer.');
    /* E ele NÃO responde a encontros: se respondesse, seria um segundo XP, e
       duas barras que sobem juntas são uma barra com duas cores. */
    igual(vinculoDaExpedicao({ minutos: 45, encontros: 99 }),
          vinculoDaExpedicao({ minutos: 45 }),
      'os encontros mexeram no vínculo. Ele mede outra coisa — e no dia em que ' +
      'a Gen 2 entrar, `exige: { vinculo: 220 }` precisa de um número que não ' +
      'seja só o XP com outro nome.');
  });

  s.teste('o vínculo tem teto, e ele não vira contador de tempo de jogo', () => {
    let c = { xp: 0, vinculo: 0 };
    for (let i = 0; i < 500; i++) c = creditar(c, { vinculo: 5 });
    igual(c.vinculo, VINCULO_MAX,
      `quinhentas expedições deram ${c.vinculo} de vínculo. Sem teto ele deixa ` +
      'de significar laço e passa a significar quanto tempo a aba ficou aberta.');
  });

  /* --- 5 · A CALIBRAGEM -------------------------------------------------- */

  /* ── A CALIBRAGEM MEDE A FORMA DA CURVA, e não um limite que eu escolhi ──
   *
   * A primeira versão destas duas afirmações reprovou, e a curva estava certa:
   * eu tinha escrito limites arbitrários ("a primeira evolução entre 1 e 5
   * dias") sem olhar a distribuição do pack. Ela é esta:
   *
   *     nível  7   0,5 dia    ×2      Caterpie e Weedle
   *     nível 16   3,0 dias   ×6      as iniciais, e o grosso do começo
   *     nível 28  10,2 dias   ×5      a mediana
   *     nível 55  44,9 dias   ×1      Dragonite, e só ele
   *
   * Isso não é defeito — é um material de origem bem desenhado, e o trabalho da
   * curva é PRESERVAR essa forma, não achatá-la. Duas evoluções no primeiro dia
   * são o gancho do iniciante; a de 45 dias é a meta que ainda existe depois de
   * um mês. Reprovar qualquer uma das duas seria pedir que o pack fosse pior.
   *
   * Então o que se afirma é a forma: **um marco cedo, um pelotão em poucos dias,
   * uma mediana de semana, e uma cauda longa que ainda cabe numa temporada.** */
  s.teste('§Q4 · a curva preserva a forma das evoluções do pack', () => {
    /* Os níveis vêm do PACK. Se as linhas mudarem, a calibragem é reconferida
       em vez de continuar passando por inércia. */
    const niveis = (kanto.evolucoes ?? [])
      .map(e => e.exige?.nivel).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
    ok(niveis.length >= 10, `o pack só declara ${niveis.length} evolução(ões) por nível`);
    const dias = n => xpParaNivel(n) / XP_POR_DIA;

    ok(dias(niveis[0]) <= 1.5,
      `a evolução mais cedo é no nível ${niveis[0]} e leva ${dias(niveis[0]).toFixed(1)} ` +
      'dias. Ela é o GANCHO: o jogador precisa ver uma criatura mudar na primeira ' +
      'sessão, senão nada na tela prova que a progressão existe.');

    /* O nível MAIS COMUM é onde o grosso dos jogadores encosta primeiro. */
    const conta = {};
    for (const n of niveis) conta[n] = (conta[n] ?? 0) + 1;
    const comum = Number(Object.keys(conta).reduce((a, b) => (conta[b] > conta[a] ? b : a)));
    ok(dias(comum) >= 2 && dias(comum) <= 6,
      `o nível mais comum do pack é ${comum} (${conta[comum]} linhas) e leva ` +
      `${dias(comum).toFixed(1)} dias. É onde a maioria encosta primeiro: cedo ` +
      'demais e o marco não é marco; tarde demais e a maioria desiste antes.');

    const mediana = niveis[Math.floor(niveis.length / 2)];
    ok(dias(mediana) >= 6 && dias(mediana) <= 20,
      `a mediana é o nível ${mediana}, a ${dias(mediana).toFixed(0)} dias. Ela ` +
      'define o ritmo do meio do jogo, que é onde o jogador passa mais tempo.');
  });

  s.teste('§Q4 · e a cauda longa ainda cabe numa temporada', () => {
    const niveis = (kanto.evolucoes ?? [])
      .map(e => e.exige?.nivel).filter(n => Number.isFinite(n));
    const ultimo = Math.max(...niveis), primeiro = Math.min(...niveis);
    const dias = n => xpParaNivel(n) / XP_POR_DIA;

    ok(dias(ultimo) <= 60,
      `a evolução mais tarde é no nível ${ultimo} e leva ${dias(ultimo).toFixed(0)} ` +
      'dias. Acima disso ela deixa de ser objetivo e vira decoração de tabela — ' +
      'ninguém persegue o que não consegue enxergar de onde está.');
    ok(dias(ultimo) >= 25,
      `a mais tarde leva só ${dias(ultimo).toFixed(0)} dias. Um jogo em que tudo ` +
      'acaba em três semanas não tem por que ficar aberto ao lado de um filme.');
    ok(dias(ultimo) / Math.max(0.1, dias(primeiro)) >= 10,
      'a distância entre o primeiro marco e o último é pequena demais: a curva ' +
      'achatou a progressão que o pack desenhou, e todos os marcos passam a ' +
      'valer a mesma espera.');
  });

  /* --- 6 · NÃO HÁ PORTA (§P5) -------------------------------------------- */

  s.teste('§P5 · nenhuma chave de fora acelera a criatura', () => {
    const base = xpDaExpedicao({ perfil: 'trilha', encontros: 7 });
    for (const veneno of [{ xp: 9999 }, { multiplicador: 9 }, { bonus: 500 },
                          { nivel: 50 }, { xpPorEncontro: 999 }]) {
      igual(xpDaExpedicao({ perfil: 'trilha', encontros: 7, ...veneno }), base,
        `a chave ${JSON.stringify(veneno)} mudou o XP. Ritmo de progressão que ` +
        'vem de fora é ritmo que a loja pode vender — e num jogo onde o que se ' +
        'farma é vendável, isso é dinheiro comprando dinheiro.');
    }
    const c = creditar({ xp: 0, vinculo: 0 }, { xp: -100, vinculo: -100 });
    igual(c.xp, 0, 'XP negativo baixou o total — dá para PERDER nível de fora');
    igual(c.vinculo, 0);
  });

  s.teste('creditar não muta a criatura que recebeu', () => {
    const antes = { xp: 100, vinculo: 3, nivel: 5 };
    const copia = JSON.parse(JSON.stringify(antes));
    creditar(antes, { xp: 500, vinculo: 2 });
    igual(JSON.stringify(antes), JSON.stringify(copia),
      'a função escreveu na criatura. Quem guarda estado é o dono dele; um ' +
      'módulo puro que muta o argumento cria um segundo dono em silêncio.');
  });

  s.teste('creditar avisa quantos níveis subiu — a tela precisa do momento', () => {
    const c = creditar({ xp: xpParaNivel(9) - 1 }, { xp: 2000 });
    ok(c.subiu > 0,
      'subir de nível não foi anunciado. É o único instante do idle em que algo ' +
      'ACONTECE com a criatura, e um idle sem instante é uma planilha.');
    igual(creditar({ xp: 100 }, { xp: 0 }).subiu, 0);
  });

  return s;
}
