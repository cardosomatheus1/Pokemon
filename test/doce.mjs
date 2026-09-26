/* Q1/Q3 · O DOCE: A REGRA (ST-9.7 · F3.8 · Spec §7.8, §7.6, §22, §28.4)
 *
 * "O doce é função de a espécie venceu e houve aposta, e de nada mais." O
 * teste obrigatório do §7.8 — variar o stake do mínimo ao máximo e exigir o
 * mesmo doce — é feito aqui com um espião: a função recebe um `Proxy` e
 * qualquer leitura de campo fora da lista reprova.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { doceDaAposta, doceDaDuplicata, chaveDoDoce, apostasComDoceNoDia,
         DOCE_VITORIA, DOCE_DERROTA, TETO_APOSTAS_COM_DOCE } from '../engine/doce.mjs';

const PERMITIDOS = new Set(['venceu', 'houveAposta', 'protecaoAtiva', 'comDoceHoje']);
/* O espião: devolve o doce e a lista do que a função LEU. */
function espiar(campos) {
  const lidos = new Set();
  const p = new Proxy(campos, { get(alvo, k) { if (typeof k === 'string') lidos.add(k); return alvo[k]; } });
  return { doce: doceDaAposta(p), lidos: [...lidos] };
}

export function suite() {
  const s = criarSuite('doce');

  s.teste('50 e 5.000 dão o mesmo doce — e a função não lê valor, stake nem odd', () => {
    for (const venceu of [true, false]) {
      const doces = [1, 50, 500, 5000, 50000].map(stake => {
        const r = espiar({ venceu, houveAposta: true, protecaoAtiva: false, comDoceHoje: 0, stake, valor: stake, odd: 3.2 });
        const fora = r.lidos.filter(k => !PERMITIDOS.has(k));
        igual(fora.join(), '', `a função leu ${fora.join()} — o doce passou a depender de outra coisa`);
        return r.doce;
      });
      igual(new Set(doces).size, 1, `stakes diferentes deram doces diferentes: ${doces}`);
      igual(doces[0], venceu ? DOCE_VITORIA : DOCE_DERROTA, 'o valor do doce');
    }
    ok(DOCE_VITORIA > DOCE_DERROTA && DOCE_DERROTA > 0, 'a derrota tem de render doce REDUZIDO, e não zero (§7.8)');
  });

  s.teste('a 11ª aposta do dia rende 0; aposta cancelada e proteção ativa rendem 0', () => {
    const base = { venceu: true, houveAposta: true, protecaoAtiva: false };
    igual(doceDaAposta({ ...base, comDoceHoje: TETO_APOSTAS_COM_DOCE - 1 }), DOCE_VITORIA, 'a 10ª não rendeu');
    igual(doceDaAposta({ ...base, comDoceHoje: TETO_APOSTAS_COM_DOCE }), 0, 'a 11ª rendeu');
    igual(TETO_APOSTAS_COM_DOCE, 10, 'o teto é 10 por dia');
    igual(doceDaAposta({ ...base, houveAposta: false, comDoceHoje: 0 }), 0, 'aposta cancelada rendeu');
    igual(doceDaAposta({ ...base, protecaoAtiva: true, comDoceHoje: 0 }), 0, 'conta em pausa rendeu (§28.4)');
  });

  s.teste('o dia é de calendário em Brasília (DEC-10), e não uma janela de 24 h', () => {
    const meiaNoiteBR = Date.UTC(2026, 8, 2, 3);   // 00:00 em Brasília
    const ontem = [meiaNoiteBR - 30 * 60_000, meiaNoiteBR - 60 * 60_000];   // 23:30 e 23:00
    const hoje = [meiaNoiteBR + 30 * 60_000];
    igual(apostasComDoceNoDia([...ontem, ...hoje], meiaNoiteBR + 3600_000), 1, 'o dia não virou à meia-noite de Brasília');
    igual(apostasComDoceNoDia([...ontem, ...hoje], meiaNoiteBR - 1), 2, 'ontem contou errado');
  });

  s.teste('a chave é a LINHA; a duplicata rende mais quanto mais rara', () => {
    igual(chaveDoDoce(pack, 6), 4, 'doce do Charizard não é da linha do Charmander');
    igual(chaveDoDoce(pack, 4), 4, 'a base não é a própria chave');
    const ordem = pack.raridade.map(r => r[0]);
    const doces = ordem.map(r => doceDaDuplicata(pack, r));
    ok(doces.every((d, i) => d > 0 && (i === 0 || d > doces[i - 1])), `a duplicata não cresce com a raridade: ${doces}`);
    igual(doceDaDuplicata(pack, 'inventada'), 0, 'raridade desconhecida rendeu doce');
  });

  return s;
}
