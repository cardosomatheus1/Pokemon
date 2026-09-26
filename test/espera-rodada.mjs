/* Q1 · QUEM ENTRA NO MEIO DA LUTA NÃO FICA PRESO NA TELA DE CARREGAMENTO (D-113).
 *
 * Medido no ensaio do piloto (26/09): com conta real, abrir o jogo durante a
 * luta prendia a tela de carregamento por 40 a 54 s — três de quatro recargas —,
 * e ela dizia "simulando 154.000 batalhas", o que no modo servidor é falso: as
 * odds são do servidor. A causa era o boot esperar (`await newRound()`) a
 * PRÓXIMA rodada abrir antes de tirar a tela, e a rodada tem 88 s.
 *
 *   o app abre já           o boot não espera a rodada no modo servidor
 *   a arena diz a verdade   "a próxima abre em N s", com a conta do servidor
 *   a conta é do servidor   `proximaEm` vem na rodada; o cliente não chuta
 *                           duração de fase (as constantes moram lá)
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { textoDaEspera } from '../app/modules/espera-rodada.mjs';
import { criarScheduler, FASE_MS } from '../server/scheduler.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('espera-rodada');

  s.teste('com a janela aberta não há espera; em luta, a arena diz quanto falta', () => {
    igual(textoDaEspera({ fase: 'aberta', proximaEm: 99e9 }, 0), null, 'a janela aberta mostrou espera');
    const e = textoDaEspera({ fase: 'emLuta', proximaEm: 60_500 }, 26_000);
    igual(e.segundos, 35, 'os segundos até a próxima rodada estão errados');
    ok(/35 s/.test(e.texto) && /próxima/i.test(e.texto), `o texto não diz quanto falta: ${e.texto}`);
    ok(!/simulando/i.test(e.texto), 'a espera fala em simular — no modo servidor quem simula é o servidor');
    igual(textoDaEspera({ fase: 'encerrada', proximaEm: 1000 }, 5000).segundos, 0, 'espera negativa');
    ok(/instantes/.test(textoDaEspera({ fase: 'encerrada', proximaEm: 1000 }, 5000).texto), 'o zero não virou "em instantes"');
    igual(textoDaEspera(null, 0).segundos, null, 'sem rodada ainda, inventou um número');
  });

  s.teste('o servidor diz quando a próxima rodada abre', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    let t = Date.UTC(2026, 8, 1, 15);
    const sched = criarScheduler({ db, sims: 200, relogio: () => t });
    sched.abrirRodada();
    const r = sched.paraCliente();
    igual(r.proximaEm, r.travaEm + FASE_MS.PREPARO + FASE_MS.LUTA,
      'proximaEm não é o fim da luta — o cliente contaria errado');
  });

  s.teste('o boot não prende o app na próxima rodada, e a arena mostra a espera', () => {
    const html = fonte('../app/index.html'), fases = fonte('../app/modules/fases.mjs');
    ok(/const primeira = newRound\(\);\s*\n\s*if \(!modoServidor\(\)\) await primeira;/.test(html),
      'o boot ainda espera a rodada abrir antes de tirar a tela de carregamento');
    ok(/mostrarEspera\(\);\s*\n\s*const r = await esperarAbertura\(\);/.test(fases),
      'a arena não mostra a espera antes de esperar a rodada');
    ok(/conectando à arena/.test(html), 'no modo servidor a tela de carregamento ainda diz que simula');
  });

  /* D-114: no modo servidor o botão "Iniciar rodada" chamava `startFight`
     local no meio da janela — a tela ia para a contagem, a aposta ficava
     impossível e a luta saía fora de hora. Quem decide a rodada é o servidor. */
  s.teste('D-114: no modo servidor, "Iniciar rodada" e "Auto" somem e não agem', () => {
    const html = fonte('../app/index.html'), cart = fonte('../app/modules/carteira.mjs');
    ok(/document\.body\.classList\.toggle\('modo-servidor', modoServidor\(\)\)/.test(html),
      'o boot não marca o modo servidor na página');
    ok(/\.modo-servidor #btnStart,\s*\.modo-servidor #btnAuto\s*\{\s*display:\s*none/.test(html),
      'os dois botões continuam à mostra no modo servidor');
    ok(/\$\('#btnStart'\)\.onclick = \(\) => \{[\s\S]{0,400}?if \(modoServidor\(\)\) return;\s*\n\s*if \(S\.state === 'betting'\)/.test(cart),
      'o clique em "Iniciar rodada" ainda age no modo servidor');
  });

  return s;
}
