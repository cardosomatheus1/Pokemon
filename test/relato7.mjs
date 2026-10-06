/* O 7º RELATO DO DONO (05/10/2026) — os defeitos de lógica (ST-2.32).
 *
 * Cada teste nomeia a frase do relato que o originou. As decisões moram em
 * camada 0 (volta-dados, avanco-relogio, idle-escolha, conta-real); a tela só
 * pinta, e o que se confere da tela é que ela pinta pela função certa.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { custoDaEquipe, fraseDoCusto } from '../app/modules/volta-dados.mjs';
import { quandoNoLog, relogioDaRun } from '../app/modules/avanco-relogio.mjs';
import { estagioDaEscolha, resumoDaRota, rotuloDoResto, MOSTRA_ATE } from '../app/modules/idle-escolha.mjs';
import { abaDeAbertura } from '../app/modules/conta-real.mjs';
import { STAMINA_DO_AVANCO } from '../engine/avanco.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import PACK from '../content/escolhido.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const T = Date.UTC(2026, 9, 5, 12);

export function suite() {
  const s = criarSuite('relato7');

  s.teste('D-161: "3 juntos custam 135" e "23 por criatura" — a frase diz os dois caminhos, cada um com a sua conta', () => {
    const c = custoDaEquipe(3, 'trilha');
    igual(c.expedicao.total, 3 * PERFIS.trilha.custo);
    igual(c.run.total, 3 * STAMINA_DO_AVANCO);
    const f = fraseDoCusto(3, 'trilha');
    ok(f.includes(`${3 * PERFIS.trilha.custo}`) && f.includes(`${PERFIS.trilha.custo} cada`) && f.includes('Trilha'),
      `a frase não diz o custo da expedição com a conta: ${f}`);
    ok(f.includes(`${3 * STAMINA_DO_AVANCO}`) && f.includes(`${STAMINA_DO_AVANCO} cada`) && /Avanço/.test(f),
      `a frase não diz o custo do Avanço: ${f}`);
    const tela = fonte('../app/modules/idle-equipe.mjs');
    ok(/fraseDoCusto\(quantos, perfil\)/.test(tela), 'o rodapé da equipe não usa a frase dos dois caminhos');
    ok(!/custoPorCriatura \* quantos/.test(tela), 'o rodapé ainda multiplica só o custo da expedição');
  });

  s.teste('D-162: o FOCO mostra o mesmo nível da EQUIPE — o projetado com o XP que a run já rendeu', () => {
    const painel = fonte('../app/modules/avanco-painel.mjs');
    const buffs = painel.slice(painel.indexOf('function pintarBuffs'), painel.indexOf('/* ── O LOG DA RUN'));
    ok(/xpNaRun\(c\.xp, ganho\)\.nivel/.test(buffs), 'o FOCO não projeta o nível com o XP da run');
    ok(!/c\.nivel/.test(buffs), 'o FOCO ainda lê o nível guardado');
    ok(/xpNaRun\(c\.xp, ganho\)/.test(fonte('../app/modules/avanco-direita.mjs')), 'a EQUIPE deixou de projetar — os dois têm de concordar');
  });

  s.teste('D-163: "00:10 Geodude virou 01:21" — o log marca o tempo DA RUN, que não anda depois de escrito', () => {
    const run = { iniciadaEm: T };
    const ev = { tipo: 'encontro', em: T + 70_000 };
    igual(quandoNoLog(ev, run), '01:10');
    igual(quandoNoLog(ev, run), quandoNoLog(ev, { ...run }), 'o mesmo evento deu dois horários');
    igual(quandoNoLog({ em: T - 5000 }, run), '00:00', 'evento antes do começo virou negativo');
    igual(relogioDaRun(3_725_000), '1:02:05');
    const painel = fonte('../app/modules/avanco-painel.mjs');
    const log = painel.slice(painel.indexOf('function pintarLog'), painel.indexOf('const linha ='));
    ok(/quandoNoLog\(ev, run\)/.test(log), 'o log não usa o tempo da run');
    ok(!/agora - ev\.em/.test(log), 'o log ainda conta "há quanto tempo", que muda a cada pintura');
  });

  s.teste('D-164: "a run começou no estágio 1 com o 2 liberado" — sem escolha do jogador, vale o maior aberto', () => {
    igual(estagioDaEscolha(null, 2), 2, 'sem escolha, não abriu no maior');
    igual(estagioDaEscolha(1, 2), 1, 'a escolha do jogador foi atropelada');
    igual(estagioDaEscolha(4, 2), 2, 'a escolha passou do que está aberto');
    igual(estagioDaEscolha(null, 0), 1);
    const tela = fonte('../app/modules/idle-tela.mjs');
    ok(/estagioManual = null;/.test(tela), 'a tela não separa a escolha do jogador do padrão');
    ok(/estagioEscolhido = estagioDaEscolha\(estagioManual, estagioMaximoDe\(E\)\)/.test(tela), 'a tela não decide o estágio pela regra');
    ok(/estagioManual = estagioEscolhido = Number\(est\.dataset\.estagio\)/.test(tela), 'o clique no estágio não vira escolha do jogador');
  });

  s.teste('D-165: "o Recarregar me jogou na aba Arenas" — a recarga volta para a aba em que estava', () => {
    igual(abaDeAbertura({ sessao: true, temCriatura: true, recarregada: 'viewIdle' }), 'viewIdle');
    igual(abaDeAbertura({ sessao: true, temCriatura: true, recarregada: 'viewNaoExiste' }), 'viewArena', 'aba inventada foi aceita');
    igual(abaDeAbertura({ sessao: false, recarregada: 'viewIdle' }), 'viewHome', 'sem sessão, a recarga furou a vitrine');
    const html = fonte('../app/index.html');
    ok(/\$\('#btnNovaVersao'\)\?\.addEventListener\('click', recarregarNaMesmaAba\)/.test(html), 'o botão recarrega sem guardar a aba');
    ok(/\) recarregarNaMesmaAba\(\);/.test(html), 'a recarga automática da run não guarda a aba');
    ok(!/location\.reload\(\)\);/.test(html), 'sobrou um reload que esquece a aba');
    ok(/recarregada: abaDaRecarga\(\)/.test(html), 'o boot não lê a aba guardada');
  });

  s.teste('L-253: o "+2" do cartão da rota diz o que é e quem são', () => {
    const vivas = [{ id: 'a', dex: 1, xp: xpParaNivel(40) }];
    let achou = null;
    for (const b of PACK.biomas ?? []) {
      const r = resumoDaRota(PACK, b.id, vivas);
      igual(r.foraDaLista.length, r.resto, `${b.id}: a lista de fora não bate com o +N`);
      ok(!r.foraDaLista.some(d => r.moradores.includes(d)), `${b.id}: quem aparece no cartão também foi contado no +N`);
      igual(r.moradores.length + r.foraDaLista.length, r.quantos, `${b.id}: moradores e resto não somam as espécies`);
      if (r.resto) achou = r;
    }
    ok(achou, 'nenhuma rota tem mais espécies que o cartão mostra — o caso não mede nada');
    igual(achou.moradores.length, MOSTRA_ATE);
    igual(rotuloDoResto(1), '+1 outra');
    igual(rotuloDoResto(2), '+2 outras');
    igual(rotuloDoResto(0), '');
    const tela = fonte('../app/modules/idle-biomas.mjs');
    ok(/rotuloDoResto\(r\.resto\)/.test(tela), 'o cartão não usa o rótulo do resto');
    ok(/r\.foraDaLista\.map/.test(tela), 'o cartão não nomeia quem ficou de fora');
  });

  return s;
}
