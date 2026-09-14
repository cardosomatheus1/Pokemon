/* O QUE A RUN COBRA E O QUE ELA PAGA — bloco A4c (Spec §7.22.2 e §7.22.19).
 *
 * O A4b pôs a batalha na tela. Faltava a metade que faz ela valer alguma
 * coisa: a stamina cobrada, o XP e a moeda pagos, o saque, o baú, e o
 * desbloqueio do estágio seguinte.
 *
 * ── AS DUAS AFIRMAÇÕES QUE SUSTENTAM O BLOCO ──────────────────────────────
 *
 *   O TETO LIMITA O RENDIMENTO, E NÃO O DIREITO DE JOGAR
 *     Decisão do dono, 08/09/2026, e ela nasceu de uma pergunta dele: *"isso
 *     não vai acabar limitando muito?"*. Esgotado o teto, a run acontece
 *     igual — abates, XP, moeda, drops e baú — e só para de dar ESPÉCIES.
 *     O §P5 continua inteiro, porque o que ele protege é a economia de
 *     espécies, e a parede de três horas morre.
 *
 *   O ABATE É TEMPERO, E NÃO SALÁRIO
 *     Ele paga 1/30 do que um encontro paga. Com 58 abates por run isso é
 *     +32% — sensível, e longe de dobrar. Um décimo, que foi a primeira
 *     proposta, DOBRAVA a run e contradizia a paridade com a expedição no
 *     mesmo fôlego.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  ENCONTROS_POR_AVANCO, cabeAvanco, premioDo, staminaAteWave,
  POR_ABATE, ganhoDaRun,
} from '../engine/avanco.mjs';
import { WAVES } from '../engine/wave.mjs';
import { xpDaExpedicao } from '../engine/nivel-criatura.mjs';

const naFaixa = (v, min, max, msg) => ok(v >= min && v <= max,
  `${msg} — ${v} fora de [${min}, ${max}]`);

/* Um estado de teto com N encontros já comprometidos hoje. */
const teto = (usados, vistas = 1) => ({ encontrosHoje: usados, emCampo: [], reservas: [], vistas });

export function suite() {
  const s = criarSuite('avanco-paga');

  /* ── O TETO ────────────────────────────────────────────────────────────
     `cabeAvanco` continua respondendo a mesma pergunta de sempre: cabem mais
     seis encontros hoje? O que muda é quem PERGUNTA — a tela deixa de usá-la
     como porta e passa a usá-la como aviso. */
  s.teste('o teto ainda sabe dizer quando os encontros acabaram', () => {
    ok(cabeAvanco(teto(0)), 'com o dia inteiro livre, o avanço não coube');
    ok(!cabeAvanco(teto(30)), 'com o teto estourado, ele ainda disse que cabe');
    ok(cabeAvanco(teto(24)), 'faltando exatamente um elenco, ele recusou');
    ok(!cabeAvanco(teto(25)), 'faltando menos que um elenco, ele aceitou');
  });

  s.teste('SEM teto a run ainda paga tudo, menos espécie', () => {
    const r = { completou: true, waves: WAVES, hp: 40,
                abates: [{ dex: 10, quantos: 30 }, { dex: 13, quantos: 28 }] };
    const com = premioDo(r, { encontrosValem: true });
    const sem = premioDo(r, { encontrosValem: false });

    igual(sem.abates, com.abates, 'os abates mudaram por causa do teto');
    igual(sem.bau, com.bau, 'o baú mudou por causa do teto');
    igual(sem.desbloqueia, com.desbloqueia, 'o desbloqueio mudou por causa do teto');
    igual(sem.stamina, com.stamina, 'a stamina cobrada mudou por causa do teto');

    /* O que o teto tira, e SÓ ele. */
    ok(com.encontros.length > 0, 'com teto, a run não deu espécie nenhuma');
    igual(sem.encontros.length, 0,
      'sem teto, a run ainda deu espécies — o §P5 vazaria por aqui');
  });

  s.teste('a run sem teto ainda declara que aconteceu', () => {
    const r = { completou: false, waves: 6, hp: 0, abates: [{ dex: 10, quantos: 20 }] };
    const sem = premioDo(r, { encontrosValem: false });
    ok(sem.abates === 20, 'a run sem teto confiscou os abates');
    ok(sem.stamina > 0, 'a run sem teto saiu de graça');
  });

  /* ── O QUE A RUN PAGA ──────────────────────────────────────────────────
     O ENCONTRO paga pela MESMA função da expedição. O ABATE é o único número
     novo do bloco, e ele é pequeno de propósito. */
  s.teste('o abate paga um trinta avos do que um encontro paga', () => {
    igual(POR_ABATE, 1 / 30);
  });

  s.teste('58 abates somam cerca de um terço do que 6 encontros pagam', () => {
    const g = ganhoDaRun({ abates: 58, encontros: 6, perfil: 'trilha' });
    const soEncontros = xpDaExpedicao({ perfil: 'trilha', encontros: 6 });
    const extra = (g.xp - soEncontros) / soEncontros;
    /* +32% é a conta: 58/30 = 1,93 encontros de valor contra 6. A faixa é
       larga o bastante para o arredondamento e estreita o bastante para
       reprovar o 1/10 da primeira proposta, que DOBRAVA a run. */
    naFaixa(extra, 0.20, 0.45,
      'o abate deixou de ser tempero — ele não pode chegar perto do encontro');
  });

  s.teste('a run sem teto paga só a parte dos abates', () => {
    const com = ganhoDaRun({ abates: 58, encontros: 6, perfil: 'trilha' });
    const sem = ganhoDaRun({ abates: 58, encontros: 0, perfil: 'trilha' });
    ok(sem.xp > 0, 'a run sem encontros não pagou XP nenhum — ela ainda aconteceu');
    ok(sem.xp < com.xp, 'a run sem encontros pagou o mesmo que a com');
    /* E ela vale a pena o bastante para a decisão existir: cerca de um quarto
       do que a run cheia rende. Menos que isso e ninguém rodaria; mais e o
       teto deixaria de significar alguma coisa. */
    naFaixa(sem.xp / com.xp, 0.15, 0.35,
      'a run sem encontros rende de menos (ninguém a faria) ou de mais (o teto ' +
      'deixaria de importar)');
  });

  s.teste('a stamina cobrada é a das waves ALCANÇADAS', () => {
    igual(premioDo({ completou: true, waves: WAVES, abates: [] }).stamina,
          staminaAteWave(WAVES));
    igual(premioDo({ completou: false, waves: 3, abates: [] }).stamina,
          staminaAteWave(3), 'quem caiu na terceira pagou pelo estágio inteiro');
    ok(staminaAteWave(3) < staminaAteWave(WAVES),
      'parar cedo custou o mesmo que limpar');
  });

  s.teste('nada disso paga por uma run que não teve nada', () => {
    const vazia = premioDo({ completou: false, waves: 0, abates: [] });
    igual(vazia.abates, 0);
    igual(vazia.stamina, 0, 'uma run de zero waves cobrou stamina');
    igual(ganhoDaRun({ abates: 0, encontros: 0, perfil: 'trilha' }).xp, 0);
  });

  return s;
}
