/* A RUN DO AVANÇO NO TEMPO — bloco A4a (Spec §7.22.4 a §7.22.8).
 *
 * O A2 provou a wave; este arquivo prova as DEZ acontecendo no relógio, com a
 * aba fechando no meio.
 *
 * ── AS TRÊS AFIRMAÇÕES QUE SUSTENTAM O MODO ───────────────────────────────
 *
 *   O RELÓGIO É CONSULTADO   quem fechou a aba por meia hora recebe EXATAMENTE
 *                            a run de quem ficou olhando. Se as duas divergirem,
 *                            o modo ausente e o assistido são dois jogos.
 *   PERDER NÃO AVANÇA        a wave se repete, e o dano acumula. É o que faz o
 *                            HP ser o relógio da run.
 *   FALHAR NÃO CONFISCA      o §7.22.8 — fica tudo que caiu; perde-se o baú.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  novaRun, avancarRun, cenaDaRun, curarRun, recuarRun, resultadoDa, waveAtual,
  emCurso, WAVES, HP_MAX,
} from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { premioDo } from '../engine/avanco.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const EQUIPE = nivel => [{ nivel, forca: 318, vinculo: 0, foco: null }];
const T0 = 1_700_000_000_000;

/* Faixa se afirma com faixa — ver a nota longa na `test/roteiro-wave.mjs`: o
   `dentro` do arnês é valor ± tolerância, e usá-lo como faixa deixou uma
   sabotagem escapar. */
const naFaixa = (v, min, max, msg) => ok(v >= min && v <= max,
  msg + ' — ' + v + ' fora de [' + min + ', ' + max + ']');

const NIVEL = 5;   /* o nível de quem está no estágio 1: a curva do A2 mede ~50% aqui */
const comecar = (raiz = 'a4a') =>
  novaRun({ bioma: 'floresta', estagio: 1, equipe: ['c1'], raiz, agora: T0 });

/* Roda a run até ela acabar, consultando o relógio de tantos em tantos ms. O
   passo é o parâmetro que interessa: com passo pequeno é quem está olhando;
   com passo enorme é quem voltou depois de dormir. */
function ateOFim(run, { nivel = NIVEL, passo = 30_000, tetoMs = 6 * 3600_000 } = {}) {
  let r = run, t = T0, voltas = 0;
  while (emCurso(r) && t - T0 < tetoMs && voltas++ < 5000) {
    t += passo;
    r = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(nivel), agora: t }).run;
  }
  return r;
}

export function suite() {
  const s = criarSuite('run-avanco');

  s.teste('a run nasce na wave 1, com a barra cheia e sem fim', () => {
    const r = comecar();
    igual(r.wave, 1);
    igual(r.hpNaWave, HP_MAX);
    igual(r.fim, null);
    ok(emCurso(r), 'a run recém-criada não estava em curso');
  });

  s.teste('nada acontece antes da primeira wave terminar', () => {
    const r = comecar();
    const { run, aconteceu } = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: T0 + 1_000 });
    igual(run.wave, 1, 'a wave andou antes de acontecer');
    ok(!aconteceu.some(x => x.tipo === 'wave'), 'uma wave terminou em um segundo');
  });

  /* ── A AFIRMAÇÃO CENTRAL DO BLOCO ───────────────────────────────────────
     Se ela cair, o modo ausente e o assistido deixam de ser o mesmo jogo. */
  s.teste('quem fecha a aba recebe a MESMA run de quem fica olhando', () => {
    for (let i = 0; i < 25; i++) {
      const semente = `paralelo-${i}`;
      const olhando = ateOFim(comecar(semente), { passo: 5_000 });
      const dormindo = ateOFim(comecar(semente), { passo: 3 * 3600_000 });
      igual(JSON.stringify(resultadoDa(olhando)), JSON.stringify(resultadoDa(dormindo)),
        `a run ${semente} terminou diferente conforme quem estava olhando`);
      igual(olhando.fim.em, dormindo.fim.em,
        'as duas runs acabaram em instantes diferentes');
    }
  });

  s.teste('a run inteira acaba: ou limpa as dez, ou cai', () => {
    let limpou = 0, caiu = 0;
    for (let i = 0; i < 30; i++) {
      const r = ateOFim(comecar(`fim-${i}`));
      ok(r.fim, `a run ${i} não terminou em seis horas`);
      if (r.fim.completou) { limpou++; igual(r.wave, WAVES, 'limpou sem chegar à décima'); }
      else { caiu++; ok(r.hpNaWave === 0, 'caiu com a barra acima de zero'); }
    }
    ok(limpou > 0 && caiu > 0,
      `a amostra não teve os dois desfechos (${limpou} limparam, ${caiu} caíram)`);
  });

  s.teste('perder a wave NÃO avança, e o dano acumula', () => {
    /* Uma equipe fraca contra o estágio: a maioria das waves é perdida, e a
       run tem de morrer sem nunca passar da primeira. */
    let viuRepeticao = false;
    for (let i = 0; i < 20 && !viuRepeticao; i++) {
      const r = ateOFim(comecar(`muro-${i}`), { nivel: 1 });
      if (r.tentativa > 0 || (r.fim && !r.fim.completou && r.wave <= 3)) viuRepeticao = true;
    }
    ok(viuRepeticao, 'uma equipe de nível 1 limpou o estágio sem repetir wave nenhuma');
  });

  /* ── A TERCEIRA SABOTAGEM QUE ESCAPOU NESTE BLOCO ──────────────────────
     O `S872` desliga a queda no meio da wave: a run passa a acabar só quando
     a wave termina, encenando a luta de quem já caiu. A suíte ficou verde
     porque as minhas afirmações comparavam a run consigo mesma — os dois
     caminhos (olhando e dormindo) davam o MESMO resultado errado.

       > Comparar duas execuções não afirma nada sobre a regra: afirma que ela
       > é a mesma nas duas. Uma regra errada também é.

     O que amarra a regra é o INSTANTE: quem cai, cai num golpe. Se o fim da
     run não coincide com um revide do roteiro, a barra zerou num lugar que a
     wave não decidiu. */
  s.teste('quem cai, cai num GOLPE — e não no fim da wave', () => {
    let quedas = 0;
    for (let i = 0; i < 40 && quedas < 12; i++) {
      let r = comecar(`golpe-${i}`), t = T0, antes = r;
      while (emCurso(r) && t - T0 < 6 * 3600_000) {
        antes = r;
        t += 20_000;
        r = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: t }).run;
      }
      if (r.fim?.motivo !== 'hp') continue;
      quedas++;
      /* O roteiro da wave em que ela caiu, reconstruído do estado anterior. */
      const w = waveAtual(antes, { elenco: ELENCO, equipe: EQUIPE(NIVEL) });
      const rel = r.fim.em - antes.waveComecouEm;
      const golpes = w.roteiro.momentos
        .filter(m => m.tipo === 'golpe' && m.de === 'dele').map(m => m.t);
      ok(golpes.includes(rel),
        `a run caiu em ${rel} ms da wave, e não há golpe nesse instante ` +
        `(golpes: ${golpes.join(', ')}) — a barra zerou fora do que a wave decidiu`);
    }
    ok(quedas > 0, 'nenhuma das quarenta runs caiu por HP — a amostra não afirma nada');
  });

  s.teste('a wave ALCANÇADA é a que a run parou, e nunca a seguinte', () => {
    for (let i = 0; i < 20; i++) {
      const r = ateOFim(comecar(`alcance-${i}`));
      naFaixa(resultadoDa(r).waves, 1, WAVES, 'a wave alcançada saiu da escada');
      if (!r.fim.completou)
        ok(resultadoDa(r).waves === r.wave, 'o resultado contou uma wave que não houve');
    }
  });

  s.teste('falhar guarda o que caiu e perde o baú — §7.22.8', () => {
    for (let i = 0; i < 40; i++) {
      const r = ateOFim(comecar(`bau-${i}`));
      const premio = premioDo(resultadoDa(r));
      if (r.fim.completou) { ok(premio.bau, 'limpou e não pagou o baú'); continue; }
      ok(!premio.bau, 'a run falhou e ainda assim pagou o baú');
      if (r.wave > 1)
        ok(premio.abates > 0,
          `a run caiu na wave ${r.wave} e não guardou abate nenhum — falhar ` +
          'custa o baú, nunca o farm');
    }
  });

  s.teste('quem apareceu entra na lista DURANTE a wave, e sem repetir', () => {
    const r = ateOFim(comecar('apareceu'), { passo: 10_000 });
    ok(r.apareceram.length > 0, 'ninguém apareceu na run inteira');
    igual(new Set(r.apareceram).size, r.apareceram.length,
      'a mesma espécie entrou duas vezes em "quem apareceu"');
    /* O teto do §7.22.2: no máximo o elenco do estágio. */
    ok(r.apareceram.length <= 6,
      `apareceram ${r.apareceram.length} espécies num estágio de 6 — o teto vazou`);
  });

  s.teste('a poção levanta a barra e NÃO muda o que a wave decidiu', () => {
    const base = comecar('pocao');
    const antes = waveAtual(base, { elenco: ELENCO, equipe: EQUIPE(NIVEL) });
    const { run, curou } = curarRun(base, { cura: 40, agora: T0 + 30_000, elenco: ELENCO, equipe: EQUIPE(NIVEL) });
    const depois = waveAtual(run, { elenco: ELENCO, equipe: EQUIPE(NIVEL) });
    igual(antes.venceu, depois.venceu, 'a poção mudou o resultado da wave');
    igual(antes.dano, depois.dano, 'a poção mudou o dano da wave');
    /* A barra estava cheia: a cura efetiva é só o que coube. */
    ok(curou <= HP_MAX, 'a poção curou mais que a barra inteira');
  });

  s.teste('a poção com a barra cheia não guarda cura para depois', () => {
    const { run, curou } = curarRun(comecar('cheia'), { cura: 40, agora: T0, elenco: ELENCO, equipe: EQUIPE(NIVEL) });
    igual(curou, 0, 'curou com a barra cheia');
    igual(run.curas[0].quanto, 0,
      'a cura foi guardada inteira e vazaria para a wave seguinte');
  });

  s.teste('a poção salva a run: a mesma semente, com e sem ela', () => {
    /* Procura uma semente em que a run cai, e confere que curando no meio ela
       chega mais longe. Se não achar nenhuma, é a própria amostra que está
       errada — e o teste diz isso em vez de passar calado. */
    let achou = false;
    for (let i = 0; i < 60 && !achou; i++) {
      const seco = ateOFim(comecar(`salva-${i}`), { nivel: NIVEL });
      if (seco.fim.completou || seco.wave < 2) continue;
      let r = comecar(`salva-${i}`), t = T0;
      while (emCurso(r) && t - T0 < 6 * 3600_000) {
        t += 20_000;
        r = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: t }).run;
        if (emCurso(r) && r.hpNaWave < 60)
          r = curarRun(r, { cura: 40, agora: t, elenco: ELENCO, equipe: EQUIPE(NIVEL) }).run;
      }
      if (r.wave > seco.wave || r.fim.completou) achou = true;
    }
    ok(achou, 'em sessenta runs, curar no meio nunca fez diferença nenhuma');
  });

  s.teste('recuar guarda o farm e perde o baú', () => {
    let r = comecar('recuo');
    r = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: T0 + 10 * 60_000 }).run;
    const abatesAntes = r.abates.reduce((a, x) => a + x.quantos, 0);
    const fim = recuarRun(r, T0 + 10 * 60_000);
    ok(!emCurso(fim), 'recuar não encerrou a run');
    igual(fim.fim.motivo, 'recuou');
    igual(premioDo(resultadoDa(fim)).bau, false, 'recuar pagou o baú');
    igual(premioDo(resultadoDa(fim)).abates, abatesAntes, 'recuar confiscou o farm');
  });

  s.teste('a cena responde sobre qualquer instante, e ela nunca inventa gente', () => {
    const r = comecar('cena');
    for (const dt of [0, 1_000, 45_000, 120_000, 240_000]) {
      const c = cenaDaRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: T0 + dt });
      naFaixa(c.hp, 0, HP_MAX, 'a barra saiu da faixa');
      naFaixa(c.t, 0, c.duracao, 'o instante da cena saiu da wave');
      const total = c.comp.reduce((a, x) => a + x.quantos, 0);
      ok(c.emCena.length + c.caidos <= total,
        'a cena mostrou mais mobs do que a wave tem');
      naFaixa(c.chance, 0.05, 0.95, 'a chance da wave saiu da faixa aparada do A2');
    }
  });

  /* ── ESTA AFIRMAÇÃO FALTAVA, E A SABOTAGEM MOSTROU ─────────────────────
     O `S878` troca a composição que `resolverWave` devolve por outra lista, e
     a suíte inteira ficou verde: eu conferia a cena CONTRA a própria `comp`,
     que é circular — se ela mentir, os dois lados mentem juntos.

     Quem sabe a verdade são os ABATES: eles saem da composição de dentro do
     motor. Se a `comp` publicada não for a mesma que lutou, a tela desenha
     uma espécie e o log conta outra — que é exatamente o defeito. */
  s.teste('a composição publicada é a que de fato lutou', () => {
    for (let i = 0; i < 30; i++) {
      let r = comecar(`comp-${i}`), t = T0;
      while (emCurso(r) && t - T0 < 3600_000) {
        t += 30_000;
        const passo = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: t });
        for (const ev of passo.aconteceu) {
          if (ev.tipo !== 'wave' || !ev.venceu) continue;
          /* Depois de uma wave vencida, TODA espécie da composição publicada
             tem de aparecer entre os abates acumulados. */
          for (const c of ev.comp)
            ok(passo.run.abates.some(a => a.dex === c.dex),
              `a wave ${ev.wave} publicou a espécie ${c.dex} e não abateu nenhuma dela`);
        }
        r = passo.run;
      }
      /* E o total abatido nunca passa o que as waves vencidas comportam. */
      const total = r.abates.reduce((a, x) => a + x.quantos, 0);
      ok(total <= 58, `a run acumulou ${total} abates num estágio de 58`);
    }
  });

  /* ── A BARRA DO MOB NÃO É INVENTADA ────────────────────────────────────
     O motor não modela HP por mob — ele decide a WAVE. O que a `vida` diz é o
     que o roteiro já decidiu: quanto falta para aquele cair.

     A afirmação que importa é a segunda: numa wave PERDIDA as barras ficam
     CHEIAS. Não é um caso de borda simpático — é a leitura certa, porque a
     wave foi perdida justamente por os mobs não terem sido derrubados. Uma
     barra que descesse sozinha seria a tela contando outra história. */
  s.teste('a vida do mob desce até a queda dele, e nunca sozinha', () => {
    let vencidas = 0, perdidas = 0;
    for (let i = 0; i < 25; i++) {
      const r = comecar(`vida-${i}`);
      const w = waveAtual(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL) });
      const anterior = new Map();
      for (let t = 0; t <= w.roteiro.duracao; t += 10_000) {
        const c = cenaDaRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: T0 + t });
        for (const m of c.emCena) {
          naFaixa(m.vida, 0, 1, 'a vida do mob saiu da faixa');
          if (anterior.has(m.i))
            ok(m.vida <= anterior.get(m.i) + 1e-9,
              `a vida do mob ${m.i} SUBIU no meio da wave`);
          anterior.set(m.i, m.vida);
        }
      }
      if (w.venceu) { vencidas++; continue; }
      perdidas++;
      const fim = cenaDaRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL),
        agora: T0 + w.roteiro.duracao });
      ok(fim.emCena.every(m => m.vida === 1),
        'a wave foi PERDIDA e as barras dos mobs desceram assim mesmo');
      ok(fim.emCena.length > 0,
        'a wave foi perdida e não sobrou mob nenhum em pé');
    }
    ok(vencidas > 0 && perdidas > 0,
      `a amostra não teve os dois casos (${vencidas} vencidas, ${perdidas} perdidas)`);
  });

  s.teste('a run terminada não anda mais, aconteça o que acontecer no relógio', () => {
    const r = ateOFim(comecar('parada'));
    const depois = avancarRun(r, { elenco: ELENCO, equipe: EQUIPE(NIVEL), agora: T0 + 48 * 3600_000 });
    igual(JSON.stringify(depois.run), JSON.stringify(r), 'a run terminada continuou andando');
    igual(depois.aconteceu.length, 0, 'a run terminada produziu eventos novos');
  });

  s.teste('curar uma run terminada é recusado, e a recusa diz o quê', () => {
    const r = ateOFim(comecar('recusa'));
    let erro = null;
    try { curarRun(r, { cura: 20, agora: T0, elenco: ELENCO, equipe: EQUIPE(NIVEL) }); }
    catch (e) { erro = e; }
    ok(erro && /run em curso/.test(erro.message), 'curar run terminada não foi recusado');
  });

  s.teste('elenco vazio não derruba a run', () => {
    /* Um save que cita bioma removido do pack. Ver o mesmo caso na wave e no
       roteiro: o jogo tem de continuar de pé para quem voltou depois de uma
       semana. */
    const vazio = { comuns: [], chefes: [] };
    let r = novaRun({ bioma: 'sumiu', estagio: 1, equipe: ['c1'], raiz: 'vazio', agora: T0 });
    for (let i = 0; i < 20; i++)
      r = avancarRun(r, { elenco: vazio, equipe: EQUIPE(10), agora: T0 + i * 300_000 }).run;
    ok(Number.isFinite(r.wave), 'a run de elenco vazio perdeu a conta da wave');
    const c = cenaDaRun(r, { elenco: vazio, equipe: EQUIPE(10), agora: T0 });
    ok(c && Array.isArray(c.emCena), 'a cena de elenco vazio não devolveu lista');
  });

  s.teste('o log da run guarda o que aconteceu, em ordem', () => {
    const r = ateOFim(comecar('log'), { passo: 15_000 });
    ok(r.eventos.length > 0, 'a run inteira não gerou evento nenhum');
    let ultimo = 0;
    for (const e of r.eventos) {
      ok(e.em >= ultimo, 'os eventos do log saíram fora de ordem');
      ultimo = e.em;
    }
    ok(r.eventos.some(e => e.tipo === 'wave'), 'nenhuma wave entrou no log');
    ok(r.eventos.some(e => e.tipo === 'apareceu'), 'nenhuma espécie entrou no log');
  });

  return s;
}
