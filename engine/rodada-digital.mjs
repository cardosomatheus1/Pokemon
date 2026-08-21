/* Reconstrução de uma rodada a partir da raiz, e a impressão digital dela.
 *
 * MORAVA EM `test/` ATÉ O D-019, e o endereço estava errado: `server/servidor.mjs`
 * o importava para servir `GET /api/rodada/digital`, e era a única ocorrência de
 * código de PRODUÇÃO importando da pasta de teste em todo o projeto.
 *
 * Não quebrava nada hoje — o repositório inteiro é a unidade de entrega —, mas
 * um deploy que empacotasse o conjunto natural (`server/`, `engine/`,
 * `content/`, `app/`) falharia no import antes de abrir a porta, no primeiro
 * deploy real. E já custava algo: `test/` entrava no fecho do `servidor.mjs`,
 * então mexer num teste invalidava veredito de defeito plantado no servidor.
 *
 * Reconstruir a rodada a partir da raiz é MOTOR, não teste.
 *
 * Mora num arquivo próprio porque roda nos DOIS ambientes: no Node, importado
 * pela suíte; no Chromium, importado pela página do portão Q5. É a mesma fonte
 * dos dois lados — se fosse código duplicado, o teste de determinismo entre
 * ambientes estaria comparando duas coisas escritas separadamente, e provaria
 * bem menos do que parece.
 */
import { criarMotor, tiposDaPool } from './engine.mjs';
import { sementes } from './seed.mjs';

/* ── FÁBRICA, E NÃO MÓDULO LIGADO A UM PACK ────────────────────────────────
 *
 * A primeira versão deste arquivo em `engine/` importava o ContentPack
 * escolhido, e a suíte reprovou na hora: **o motor não importa nada de
 * `content/`** — a dependência é ao contrário, e é o §0.3 inteiro.
 *
 * A forma certa já existia no projeto: `criarMotor(pack)`. Aqui é a mesma —
 * quem chama liga o pack, e este módulo continua sem saber de tema nenhum. */
export function criarDigital(pack) {
  const E = criarMotor(pack);

  function rodada(raiz) {
    const s = sementes(raiz);
    /* Pool primeiro, clima depois (F0.11): a pool não conhece o clima, então
       não carrega informação sobre ele. */
    const elenco = E.sortearPool(s.elenco);
    const clima  = E.sortearClima(s.ambiente, tiposDaPool(elenco));
    const batalha = E.simular(E.aplicarClima(elenco, clima), s.batalha, true);
    return { sementes: s, clima, elenco, batalha };
  }

/* Texto, e não objeto: comparar campo a campo esconde o campo que ninguém
   lembrou de comparar. */
  function digital(raiz) {
    const r = rodada(raiz);
    return JSON.stringify({
      sementes: r.sementes,
      clima: r.clima.key,
      elenco: r.elenco.map(f => [f.dex, f.n, f.maxHp, f.atk, f.def, f.spa, f.spd, f.spe,
                                 f.moves.map(m => m.n)]),
      vencedor: r.batalha.winner,
      duracao: r.batalha.duration,
      eventos: r.batalha.events,
    });
  }

  return { rodada, digital };
}
