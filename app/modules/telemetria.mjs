/* Telemetria — os 14 eventos do §4.7.
 *
 * Em V1 isto vira envio para o servidor. Na v0.9 os eventos ficam num anel na
 * memória e no console em modo Dev, e isso é de propósito: o §P7 da Spec diz
 * que uma versão só está entregue quando *"funcionalidade existe; telemetria
 * existe"*. Deixar a telemetria para o backend seria fechar a v0.9 sem ela e
 * descobrir no F1.11 que metade dos eventos não tinha onde nascer.
 *
 * O QUE ESTE MÓDULO GARANTE, e é o que o teste cobra: **todo evento sai com os
 * campos comuns obrigatórios**. Evento sem `round id` ou sem versão de motor é
 * evento que não responde nenhuma pergunta depois.
 *
 * O que ele NÃO faz: identificar pessoa. `sessao` é um id efêmero por aba, não
 * uma identidade — proteção do jogador é requisito (cap. 28), não conformidade
 * a posteriori.
 */
import { S } from './estado.mjs';
import { CONF, VERSAO_MOTOR, pack } from './motor.mjs';

/* Os 14 do §4.7, na ordem do documento. Emitir nome fora desta lista é erro:
   telemetria com vocabulário livre vira lixo em três meses. */
export const EVENTOS = [
  'session_started', 'round_viewed', 'bet_selected', 'bet_changed', 'bet_confirmed',
  'bet_skipped', 'battle_started', 'player_pick_ko', 'battle_completed',
  'result_viewed', 'profile_opened', 'wallet_opened', 'challenge_completed',
  'session_ended',
];

const LIMITE = 500;
const buffer = [];
let sessao = null;

/* Id de sessão efêmero: some ao fechar a aba, não atravessa sessões e não é
   ligado a nenhuma conta. */
function idSessao() {
  if (sessao) return sessao;
  const b = new Uint8Array(8);
  globalThis.crypto.getRandomValues(b);
  return sessao = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* Classe de dispositivo pela largura, não pelo user-agent: user-agent é
   impressão digital, largura é o que de fato muda a interface. */
function classeDispositivo() {
  const w = globalThis.innerWidth || 0;
  return w === 0 ? 'desconhecido' : w < 760 ? 'estreito' : w < 1200 ? 'medio' : 'largo';
}

export function emitir(nome, extra = {}) {
  if (!EVENTOS.includes(nome)) throw new Error(`evento fora do §4.7: ${nome}`);
  const ev = {
    evento: nome,
    sessao: idSessao(),
    rodada: S.seeds ? S.seeds.raiz.toString(16) : null,
    versaoMotor: VERSAO_MOTOR,
    versaoPack: pack.id,
    ts: Date.now(),
    dispositivo: classeDispositivo(),
    experimentos: [],          // sem experimentos na v0.9; o campo existe para não faltar depois
    ...extra,
  };
  buffer.push(ev);
  if (buffer.length > LIMITE) buffer.shift();
  return ev;
}

export const eventos = () => buffer.slice();
export const limpar = () => { buffer.length = 0; };
export const CAMPOS_COMUNS = ['evento', 'sessao', 'rodada', 'versaoMotor', 'versaoPack',
                              'ts', 'dispositivo', 'experimentos'];
export { CONF as CONF_TELEMETRIA };
