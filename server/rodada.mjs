/* A RODADA, DO LADO DO SERVIDOR (F1.1).
 *
 * Fronteira: monta elenco e preço a partir de uma raiz. Não serve HTTP, não
 * conhece sessão, não guarda nada.
 *
 * A REGRA MAIS IMPORTANTE DESTE ARQUIVO É O QUE ELE **NÃO** TEM.
 *
 * Não há aqui uma linha de simulação, de sorteio ou de precificação. Tudo vem
 * de `engine/`, que é o mesmo módulo que o cliente carrega. É essa a promessa
 * do F1.1: o servidor não tem "a sua versão" do motor.
 *
 * A tentação é grande e o custo é invisível até o dia em que aparece — o
 * jogador assiste uma luta no navegador e recebe o resultado de outra, calculada
 * no servidor, com a mesma semente. O portão que impede isso é o teste de
 * paridade em `test/servidor.mjs`, e ele compara a DIGITAL da rodada inteira:
 * dois motores podem concordar no vencedor e discordar em cada golpe.
 */
import { criarMotor, CONF, VERSAO } from '../engine/engine.mjs';
/* O pack vem do ESCOLHIDO, e não nomeado aqui: `content/escolhido.mjs` é o
   único lugar fora de `content/` que pode nomear um pack (§0.3, F1.12). */
import pack from '../content/escolhido.mjs';
import { sementes } from '../engine/seed.mjs';
import { precificar, simularLote } from '../engine/preco.mjs';

/* UMA instância, no processo inteiro. `criarMotor` monta tabelas derivadas do
   pack; refazê-las por requisição é trabalho puro jogado fora, e o motor é
   imutável depois de criado. */
export const M = criarMotor(pack);
export const VERSAO_MOTOR = VERSAO;

/* O elenco da rodada sai do ramo `elenco` da árvore do §P3 — o MESMO ramo que o
   cliente usa. Derivar de outro ramo daria doze lutadores diferentes com a
   mesma raiz, que é a forma mais silenciosa de quebrar a paridade. */
export function elencoDaRaiz(raiz) {
  const s = sementes(raiz);
  return M.sortearPool(s.elenco);
}

/* Preço da rodada. `sims` é parâmetro porque o teste precisa de um lote curto e
   a produção precisa dos 154.000 do F0.7 — e porque a Spec §4.4.4 exige que o
   número usado vá GRAVADO no registro, não presumido. */
export function montarRodadaServidor(raiz, sims = CONF.SIMS, opcoes = {}) {
  const lutadores = elencoDaRaiz(raiz);
  const wins = new Uint32Array(lutadores.length);
  simularLote(M, lutadores, raiz, 0, sims, wins);
  const preco = precificar(wins, sims, M, opcoes);
  return {
    raiz,
    versaoMotor: VERSAO,
    /* O COMMIT-REVEAL DO §4.5 NÃO ENTRA AQUI, e a omissão é decisão.
       `abrirRodada` sorteia um sal, então o compromisso NÃO é derivável da raiz
       — duas chamadas com a mesma raiz dariam commits diferentes, e esta função
       precisa ser pura para o teste de paridade poder comparar servidor e
       cliente. O commit é do CICLO da rodada, e o ciclo é do F1.5. */
    ...preco,
    lutadores: preco.lutadores.map(o => ({
      ...o,
      nome: lutadores[o.idx].n,
      dex: lutadores[o.idx].dex,
    })),
  };
}
