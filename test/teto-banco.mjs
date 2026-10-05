/* O BANCO ALCANÇA, NÃO ULTRAPASSA (ST-2.31, L-251).
 *
 * Medido no b2a1354: só no banco, com duas voltas por dia, uma criatura nível 5
 * chegava ao 60 (o Campeão) no 4º dia e ao 100 no 10º — a caixa inteira, sem
 * jogar. Jogando sem o banco, o mesmo nível 60 leva 34 dias no casual, 22 no
 * diário e 7 no maratona (`node tools/estudo-ritmo-xp.mjs`). O XP de quem joga
 * já estava calibrado; o banco é que passava por cima dele.
 *
 * A regra: o banco leva a criatura até FOLGA_DO_BANCO níveis abaixo da mais
 * forte da coleção, e para. A mais forte nunca sobe pelo banco — só jogando.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { contaTreinoOffline, ritmoTreinoOffline, nivelTetoDoBanco, xpTetoDoBanco,
         FOLGA_DO_BANCO, xpPorHoraTreino } from '../engine/treino-offline.mjs';
import { treinoDaJanela } from '../engine/ausente.mjs';
import { xpParaNivel, nivelDe } from '../engine/nivel-criatura.mjs';
import { contaDaColheita } from '../engine/colheita.mjs';
import PACK from '../content/escolhido.mjs';

const H = 3600000, T = Date.UTC(2026, 9, 5, 10);
const cria = (id, nivel, extra = {}) => ({ id, xp: xpParaNivel(nivel), ...extra });
/* Treina de verdade: o primeiro contato arma o relógio, o segundo paga. */
function treinar(criaturas, horas, estagio = 1) {
  const r = contaTreinoOffline({ estado: { em: T, restos: {}, estagio }, criaturas, agora: T + horas * H });
  return Object.fromEntries(r.credito.map(c => [c.id, c]));
}

export function suite() {
  const s = criarSuite('teto-banco');

  s.teste('o teto é o mais forte da coleção menos a folga, e nunca abaixo do nível 1', () => {
    igual(FOLGA_DO_BANCO, 3);
    igual(nivelTetoDoBanco([cria('a', 20), cria('b', 5)]), 17);
    igual(nivelTetoDoBanco([cria('a', 3)]), 1);
    igual(nivelTetoDoBanco([]), 1);
    igual(xpTetoDoBanco([cria('a', 40), cria('b', 2)]), xpParaNivel(37));
  });

  s.teste('a criatura do banco para exatamente no teto, sem sobra guardada para depois', () => {
    const c = treinar([cria('forte', 20), cria('reserva', 5)], 12, 3);
    igual(c.reserva.xp, xpParaNivel(17), 'o banco passou do teto ou parou antes');
    igual(c.reserva.nivel, 17);
    /* 7 h e 30 s a 300/h são 2.102,5 XP: passa do teto (1.898) E deixa meio
       XP de fração — que é o que não pode sobrar. Em horas cheias a sobra
       seria zero de qualquer jeito, e o teste não morderia. */
    const r = contaTreinoOffline({ estado: { em: T, restos: {}, estagio: 3 },
      criaturas: [cria('forte', 20), cria('reserva', 5)], agora: T + 7 * H + 30000 });
    igual(r.credito.find(c => c.id === 'reserva').xp, xpParaNivel(17));
    igual(r.estado.restos.reserva.xp, 0, 'a fração cortada pelo teto ficou guardada');
  });

  s.teste('abaixo do teto o banco paga a taxa cheia — o teto não encolhe o ritmo', () => {
    const c = treinar([cria('forte', 60), cria('reserva', 10)], 8, 1);
    igual(c.reserva.xp - xpParaNivel(10), 8 * xpPorHoraTreino(1));
  });

  s.teste('a mais forte não ganha XP do banco, e o vínculo continua correndo', () => {
    const c = treinar([cria('forte', 20, { vinculo: 0 }), cria('reserva', 5)], 6, 2);
    igual(c.forte.xp, xpParaNivel(20), 'a mais forte subiu sem jogar');
    igual(c.forte.vinculo, 6, 'o teto cortou o vínculo junto com o XP');
  });

  s.teste('quem já está acima do teto não perde XP', () => {
    const c = treinar([cria('forte', 20), cria('quase', 19)], 12, 3);
    igual(c.quase.xp, xpParaNivel(19));
  });

  s.teste('trinta dias só de banco não levam a coleção a lugar nenhum', () => {
    let criaturas = [cria('forte', 25), cria('a', 5), cria('b', 12)], estado = { em: T, restos: {}, estagio: 3 };
    for (let v = 1; v <= 60; v++) {
      const r = contaTreinoOffline({ estado, criaturas, agora: T + v * 12 * H });
      estado = r.estado;
      criaturas = criaturas.map(c => ({ ...c, ...(r.credito.find(x => x.id === c.id) ?? {}) }));
    }
    igual(Math.max(...criaturas.map(c => nivelDe(c.xp))), 25, 'o banco subiu a mais forte');
    for (const c of criaturas.filter(c => c.id !== 'forte')) igual(nivelDe(c.xp), 22);
  });

  s.teste('a colheita da expedição respeita o mesmo teto para quem ficou no banco', () => {
    treinoDaJanela.length;   // o caminho existe
    const t = treinoDaJanela({ criaturas: [cria('forte', 20), cria('reserva', 16)], equipe: ['forte'],
      de: T, ate: T + 10 * H, xpPorHora: 300, xpTeto: xpParaNivel(17) });
    igual(t.length, 1);
    igual(t[0].xp, xpParaNivel(17) - xpParaNivel(16), 'a janela da expedição passou do teto');
    igual(t[0].vinculo, 10);
  });

  s.teste('a conta da colheita passa o teto da coleção para o treino do banco', () => {
    const fonte = readFileSync(new URL('../engine/colheita.mjs', import.meta.url), 'utf8');
    ok(/treinoDaJanela\(\{[^}]*xpTeto: xpTetoDoBanco\(criaturas\)/.test(fonte), 'a colheita treina o banco sem teto');
    const ex = PACK.biomas?.[0]?.id;
    ok(ex, 'o pack não tem bioma para a prova');
  });

  s.teste('o ritmo devolve o nível do teto, e o painel mostra até onde o banco leva', () => {
    const r = ritmoTreinoOffline({ em: T, estagio: 2 }, [cria('forte', 30), cria('b', 4)]);
    igual(r.nivelTeto, 27);
    const tela = readFileSync(new URL('../app/modules/idle-treino.mjs', import.meta.url), 'utf8');
    ok(/até o nível <b class="trTeto">\$\{ritmo\.nivelTeto\}<\/b>/.test(tela), 'o painel não diz até onde o banco leva');
    ok(/só sobe jogando/.test(tela), 'o painel não diz que a mais forte só sobe jogando');
  });

  return s;
}
