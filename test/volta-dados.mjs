/* Q1/Q3 · QUANDO VOLTA O QUE VALE (ST-2.27a · DEC-28 · L-243 · L-244)
 *
 * O dono: "não quero o cara entrando no jogo por 1h e deixando 23h parado".
 * A primeira alavanca medida — o teto de encontros como balde que enche — foi
 * RECUSADA pela medição (DEC-30): nenhum ritmo de enchimento deixava o dia
 * como estava (moeda +20% a +46% em 24 h; encontros −28% em 42 h). Então o
 * teto continua a janela de 24 h, e o que muda é que a tela DIZ quando volta:
 * a hora do próximo encontro e a hora em que a equipe pode sair de novo. Sem
 * isso, depois do teto ou sem stamina o jogador só vê "não", sem hora — e
 * quem não sabe quando voltar não volta.
 *
 * Camada 0 (`volta-dados.mjs`): só contas de tempo. A tela pinta.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { quandoVoltaEncontro, quandoCabeRun, fraseDaVolta } from '../app/modules/volta-dados.mjs';
import { STAMINA_DO_AVANCO } from '../engine/avanco.mjs';
import { REGEN_POR_HORA, TETO_ENCONTROS } from '../engine/expedicao.mjs';

const H = 3600_000, T0 = Date.UTC(2026, 9, 5, 15);   // 12:00 em Brasília
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('volta-dados');

  s.teste('o próximo encontro volta quando o mais antigo sai da janela de 24 h', () => {
    const lanc = [{ colhidaEm: T0 - 5 * H, encontros: 10 }, { colhidaEm: T0 - 2 * H, encontros: 20 }];
    /* teto 30, tudo usado: precisa de 5 → volta quando os 10 de 5 h atrás saem (19 h a partir de agora) */
    igual(quandoVoltaEncontro(lanc, T0, { teto: TETO_ENCONTROS, precisa: 5 }), T0 - 5 * H + 24 * H, 'a hora do próximo encontro');
    /* com folga, já é agora */
    igual(quandoVoltaEncontro([{ colhidaEm: T0 - H, encontros: 10 }], T0, { teto: 30, precisa: 5 }), T0, 'com folga, não é agora');
    /* a reserva de uma run aberta conta: 20 usados + 10 reservados, precisa de 5 → quando os 20 saem */
    igual(quandoVoltaEncontro([{ colhidaEm: T0 - H, encontros: 20 }], T0, { teto: 30, reservado: 10, precisa: 5 }), T0 - H + 24 * H, 'a reserva não entrou na conta');
    /* o que nunca cabe (reserva maior que o teto) não inventa hora */
    igual(quandoVoltaEncontro([], T0, { teto: 30, reservado: 40, precisa: 5 }), null, 'inventou hora para o que não cabe');
  });

  s.teste('a equipe sai quando o MAIS cansado tiver a stamina da run', () => {
    const m = (st) => ({ stamina: st, staminaEm: T0 });
    igual(quandoCabeRun([m(100), m(STAMINA_DO_AVANCO)], T0), T0, 'com stamina, não é agora');
    const falta = STAMINA_DO_AVANCO - 8;
    igual(quandoCabeRun([m(100), m(8)], T0), T0 + Math.ceil(falta / REGEN_POR_HORA * H), 'a hora não é a do mais cansado');
    igual(quandoCabeRun([], T0), null, 'equipe vazia ganhou hora');
  });

  s.teste('a frase diz a hora no relógio do mundo (Brasília), e só o que falta', () => {
    const f = fraseDaVolta({ encontro: T0 + 2 * H + 32 * 60_000, run: T0 + 3 * H + 10 * 60_000 }, T0);
    ok(/encontro.*14:32/.test(f) && /15:10/.test(f), `a frase sem as horas de Brasília: ${f}`);
    ok(fraseDaVolta({ encontro: T0, run: T0 }, T0) === null, 'falou de volta com tudo disponível agora');
    ok(!/encontro/.test(fraseDaVolta({ encontro: T0, run: T0 + H }, T0) ?? ''), 'falou do encontro, que já está disponível');
    ok(/amanhã/.test(fraseDaVolta({ encontro: T0 + 13 * H, run: T0 }, T0) ?? ''), 'a hora de amanhã sem dizer "amanhã"');
  });

  s.teste('a tela diz a volta onde o "não" aparece: o aviso do teto, a recusa por stamina e a run sem encontros', async () => {
    const D = await import('../app/modules/idle-dados.mjs');
    const { avisoDoTeto, porQueNaoAvancar } = await import('../app/modules/avanco-estado.mjs');
    const PACK = (await import('../content/escolhido.mjs')).default;
    const e = D.VAZIO();
    const c = D.criarCriatura(PACK, 1, 'captura', T0, 'volta'.padStart(12, 'v') + 'm0');
    c.xp = 10_000; c.stamina = 8; c.staminaEm = T0;
    e.criaturas.push(c);
    e.avancos = [{ colhidaEm: T0 - 5 * H, encontros: 10 }, { colhidaEm: T0 - 2 * H, encontros: 20 }];
    const aviso = avisoDoTeto(e, { pack: PACK, agora: T0 }) ?? '';
    ok(/acabaram/.test(aviso) && /volta (amanhã )?às \d\d:\d\d/.test(aviso), `o aviso do teto não diz quando volta: ${aviso}`);
    const porque = porQueNaoAvancar(e, { pack: PACK, bioma: 'floresta', estagio: 1, equipe: [c.id], agora: T0 }) ?? '';
    ok(/stamina/.test(porque) && /pode sair de novo (amanhã )?às \d\d:\d\d/.test(porque), `a recusa por stamina não diz quando a equipe sai: ${porque}`);
    ok(/voltaEm/.test(fonte('server/colecao-rotas.mjs')), 'com conta, o servidor não manda a hora do próximo encontro');
    ok(/voltaEm/.test(fonte('app/modules/idle-conta.mjs')), 'a hora do servidor não volta do disco');
  });

  return s;
}
