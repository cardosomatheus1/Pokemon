/* Q1 · A LIGA DE PREVISÃO NO LADO DO JOGADOR (R37, Spec §6.8)
 *
 * A Liga acumula ACURÁCIA, não lucro. O que pode dar errado aqui não derruba
 * nada — dá um número. Um número errado sobre a habilidade de alguém é pior que
 * uma tela quebrada, porque ninguém desconfia dele.
 *
 * ── A ASSERÇÃO MAIS IMPORTANTE DESTE ARQUIVO É UMA AUSÊNCIA ────────────────
 *
 * A Spec antecipou a Liga da V5 para a V2 por UMA razão: ela não move dinheiro,
 * e por isso não tem risco regulatório (§6.8, e o aviso de dependência do §25.1
 * que trava os mercados mútuos). Essa propriedade não é um detalhe de
 * implementação — é o que permite a Liga existir agora.
 *
 * Uma linha que toque saldo, aposta ou ledger a destrói em silêncio: a tela
 * continua funcionando, a média continua sendo calculada, e o produto passa a
 * ter valor econômico numa feature que foi aprovada por não ter. O teste "a
 * Liga não toca dinheiro" é o guarda disso, e ele é uma varredura de código
 * porque nenhum teste de comportamento consegue provar uma ausência.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import { AMOSTRA_MINIMA, brierUniforme, VERSAO_PONTUACAO } from '../engine/calibracao.mjs';
import { CHAVE_LIGA, ERRO_PREVISAO, HISTORICO_MAX,
         carregar, historico, pontuar, registrar, resumo, salvar } from '../app/modules/liga-dados.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const FONTE = ler('../app/modules/liga-dados.mjs');

/* Um armazém de mentira, para não depender de `localStorage` num teste que roda
   em Node. Ele também é o único jeito de exercer a normalização com lixo
   gravado à mão, que é metade do que este arquivo protege. */
const armazemFalso = (inicial = null) => {
  let v = inicial;
  return { getItem: () => v, setItem: (_, x) => { v = x; } };
};

const uniforme = n => Array(n).fill(1 / n);
const certeiro = (n, i) => { const d = Array(n).fill(0); d[i] = 1; return d; };
const novo = () => carregar(armazemFalso(null));

export function suite() {
  const s = criarSuite('liga-local');

  /* ═══ A FRONTEIRA ═══════════════════════════════════════════════════════ */

  s.teste('a Liga não toca dinheiro em lugar nenhum', () => {
    /* A varredura é por PALAVRA e sobre o código sem comentários — o cabeçalho
       deste módulo EXPLICA que ele não move dinheiro, e proibir o termo
       proibiria a explicação. É a quinta vez que este projeto tropeça nessa
       armadilha (R10, R34, R35, R38, R41), e agora ela já entra resolvida. */
    const codigo = FONTE.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const proibidos = ['saldo', 'carteira', 'aposta', 'ledger', 'payout',
                       'creditar', 'debitar', 'PokéCash', 'banco.mjs'];
    const achados = proibidos.filter(p => codigo.includes(p));
    ok(achados.length === 0,
      `a Liga passou a mencionar ${achados.join(', ')}. Ela foi antecipada da V5 ` +
      `para a V2 porque NÃO move dinheiro (§6.8); uma linha assim devolve o risco ` +
      `regulatório que o §25.1 trava, e devolve em silêncio.`);
  });

  /* ═══ REGISTRAR ═════════════════════════════════════════════════════════ */

  s.teste('distribuição que não soma 1 é recusada, e o problema é nomeado', () => {
    const e = novo();
    const r = registrar(e, { roundId: 'r1', distribuicao: [0.5, 0.4] });
    igual(r.erro, ERRO_PREVISAO.DISTRIBUICAO, 'uma distribuição que soma 0,9 tinha de ser recusada');
    ok(r.problemas && r.problemas.some(p => /soma/.test(p)),
      'a recusa precisa dizer QUAL é o problema — "inválida" não ajuda ninguém a corrigir');
    igual(Object.keys(e.pendentes).length, 0, 'nada pode ter sido guardado');
  });

  s.teste('probabilidade fora de [0,1] é recusada', () => {
    const e = novo();
    igual(registrar(e, { roundId: 'r1', distribuicao: [1.4, -0.4] }).erro,
      ERRO_PREVISAO.DISTRIBUICAO,
      'uma "probabilidade" de 140% tinha de ser recusada mesmo somando 1');
  });

  s.teste('trocar o palpite antes da rodada correr é permitido', () => {
    /* Decisão, não descuido: enquanto o mercado está aberto o jogador ainda
       está lendo a rodada, e travar o primeiro clique puniria quem pensou
       mais. */
    const e = novo();
    registrar(e, { roundId: 'r1', distribuicao: uniforme(12) });
    const r = registrar(e, { roundId: 'r1', distribuicao: certeiro(12, 5) });
    ok(r.ok, 'trocar o palpite com a rodada ainda aberta tinha de ser aceito');
    igual(e.pendentes.r1.distribuicao[5], 1, 'o palpite guardado tem de ser o SEGUNDO');
  });

  s.teste('prever uma rodada JÁ PONTUADA é recusado', () => {
    /* O caso que a troca acima não pode abrir: depois de saber o vencedor,
       registrar um palpite seria escrever a nota depois da prova. */
    const e = novo();
    registrar(e, { roundId: 'r1', distribuicao: uniforme(12) });
    pontuar(e, { roundId: 'r1', vencedor: 0, distribuicaoModelo: uniforme(12) });
    igual(registrar(e, { roundId: 'r1', distribuicao: certeiro(12, 0) }).erro,
      ERRO_PREVISAO.DUPLICADA,
      'prever uma rodada já pontuada é escrever a nota depois da prova');
  });

  /* ═══ PONTUAR ═══════════════════════════════════════════════════════════ */

  s.teste('a previsão certeira dá Brier zero, e a errada dá 2', () => {
    /* Os dois extremos da escala, para a régua ficar afirmada em algum lugar.
       Faixa [0,2] na forma somada de Brier, MENOR É MELHOR. */
    const a = novo();
    registrar(a, { roundId: 'r1', distribuicao: certeiro(12, 7) });
    dentro(pontuar(a, { roundId: 'r1', vencedor: 7 }).brier, 0, 1e-9,
      'acertar com certeza total tinha de dar Brier zero');

    const b = novo();
    registrar(b, { roundId: 'r2', distribuicao: certeiro(12, 7) });
    dentro(pontuar(b, { roundId: 'r2', vencedor: 0 }).brier, 2, 1e-9,
      'errar com certeza total tinha de dar Brier 2, o teto da escala');
  });

  s.teste('a previsão uniforme dá exatamente a nota do acaso', () => {
    /* `brierUniforme(n)` é a RÉGUA da Liga inteira: a nota de quem não sabe
       nada. Se as duas contas divergirem, a tela passa a dizer "acima do acaso"
       para quem apenas chutou igual. */
    const e = novo();
    registrar(e, { roundId: 'r1', distribuicao: uniforme(12) });
    dentro(pontuar(e, { roundId: 'r1', vencedor: 3 }).brier, brierUniforme(12), 1e-9,
      'o palpite uniforme tem de dar a nota do acaso, e não uma próxima dela');
  });

  s.teste('pontuar duas vezes não move a média', () => {
    /* O jogo pontua a mesma rodada mais de uma vez com facilidade: o laço
       redesenha, o jogador volta para a aba, a conexão reenvia. Idempotência
       aqui é a diferença entre uma média correta e uma inflada. */
    const e = novo();
    registrar(e, { roundId: 'r1', distribuicao: uniforme(12) });
    pontuar(e, { roundId: 'r1', vencedor: 3, distribuicaoModelo: uniforme(12) });
    const antes = { soma: e.soma, amostra: e.amostra, somaModelo: e.somaModelo };

    const r = pontuar(e, { roundId: 'r1', vencedor: 3, distribuicaoModelo: uniforme(12) });
    ok(!r.ok, 'a segunda pontuação tinha de recusar');
    igual(e.amostra, antes.amostra, 'a amostra foi contada duas vezes');
    igual(e.soma, antes.soma, 'o Brier foi somado duas vezes');
    igual(e.somaModelo, antes.somaModelo, 'o Brier do modelo foi somado duas vezes');
    igual(e.historico.length, 1, 'a rodada entrou duas vezes no histórico');
  });

  s.teste('pontuar uma rodada sem previsão não faz nada', () => {
    const e = novo();
    ok(!pontuar(e, { roundId: 'nunca-previ', vencedor: 0 }).ok, 'tinha de recusar');
    igual(e.amostra, 0, 'uma rodada não prevista não pode entrar na amostra');
  });

  /* ═══ O RESUMO NÃO INVENTA ══════════════════════════════════════════════ */

  s.teste('sem amostra nenhuma, o resumo não devolve nota nenhuma', () => {
    /* Zero não é "empatou com o modelo": é "não há o que dizer". A regra do
       §28.5 — a ausência é explicada, nunca simulada. */
    const r = resumo(novo());
    igual(r.amostra, 0);
    igual(r.media, null, 'média inventada com amostra zero');
    igual(r.habilidade, null, 'habilidade inventada com amostra zero');
    igual(r.acimaDoAcaso, null, '"acima do acaso" afirmado sem uma única rodada');
    igual(r.falta, AMOSTRA_MINIMA, 'a tela precisa saber quantas rodadas faltam');
    ok(!r.ranqueavel, 'ninguém é ranqueável com amostra zero');
  });

  s.teste('sem o modelo, a habilidade fica em aberto em vez de virar zero', () => {
    /* `somaModelo` zerado com amostra positiva significaria "o modelo acertou
       tudo", que é MUITO diferente de "não recebemos o modelo". */
    const e = novo();
    registrar(e, { roundId: 'r1', distribuicao: uniforme(12) });
    pontuar(e, { roundId: 'r1', vencedor: 3 });          /* sem distribuicaoModelo */
    const r = resumo(e);
    ok(r.media != null, 'a rodada ainda conta para a média do jogador');
    igual(r.habilidade, null,
      'sem o Brier do modelo, "habilidade" seria uma comparação com o nada');
  });

  s.teste('quem chuta uniforme não fica acima do acaso', () => {
    const e = novo();
    for (let i = 0; i < 5; i++) {
      registrar(e, { roundId: `r${i}`, distribuicao: uniforme(12) });
      pontuar(e, { roundId: `r${i}`, vencedor: i, distribuicaoModelo: uniforme(12) });
    }
    igual(resumo(e).acimaDoAcaso, false,
      'o palpite uniforme É o acaso; dizer que ele o supera seria elogiar o chute');
  });

  s.teste('quem acerta fica acima do acaso', () => {
    const e = novo();
    for (let i = 0; i < 5; i++) {
      registrar(e, { roundId: `r${i}`, distribuicao: certeiro(12, i) });
      pontuar(e, { roundId: `r${i}`, vencedor: i, distribuicaoModelo: uniforme(12) });
    }
    const r = resumo(e);
    igual(r.acimaDoAcaso, true);
    ok(r.habilidade > 0, 'acertar tudo tinha de dar habilidade positiva contra o modelo');
  });

  /* ═══ O DISCO É HOSTIL ══════════════════════════════════════════════════ */

  s.teste('estado adulterado no disco é normalizado, não confiado', () => {
    /* `localStorage` é editável por quem quiser. Um `amostra: -5` gravado à mão
       faria a média virar negativa e o ranking inteiro mentir — é a mesma
       guarda que o `cosmeticoValido` faz para os cosméticos (S70). */
    const sujo = JSON.stringify({
      versao: VERSAO_PONTUACAO, soma: -99, amostra: -5, somaModelo: 'muito',
      pendentes: { r1: { distribuicao: [2, -1] } }, historico: 'nada disso',
    });
    const e = carregar(armazemFalso(sujo));
    igual(e.soma, 0, 'soma negativa aceita do disco');
    igual(e.amostra, 0, 'amostra negativa aceita do disco');
    igual(e.somaModelo, 0, 'texto aceito onde tinha de haver número');
    igual(Object.keys(e.pendentes).length, 0, 'distribuição inválida aceita do disco');
    ok(Array.isArray(e.historico), 'histórico não-lista aceito do disco');
  });

  s.teste('temporada de outra versão de pontuação não é somada com esta', () => {
    /* Duas réguas num mesmo ranking é a forma mais silenciosa de o número
       mentir: as somas continuam batendo, e o significado não. */
    const antiga = JSON.stringify({ versao: VERSAO_PONTUACAO + 1, soma: 5, amostra: 10 });
    igual(carregar(armazemFalso(antiga)).amostra, 0,
      'histórico calculado com outra régua foi somado como se fosse o mesmo');
  });

  s.teste('o ciclo de gravar e ler devolve o mesmo estado', () => {
    const a = novo();
    registrar(a, { roundId: 'r1', distribuicao: certeiro(12, 2) });
    pontuar(a, { roundId: 'r1', vencedor: 2, distribuicaoModelo: uniforme(12) });
    const arm = armazemFalso(null);
    salvar(a, arm);
    const b = carregar(arm);
    igual(b.amostra, a.amostra);
    dentro(b.soma, a.soma, 1e-12);
    igual(b.historico.length, a.historico.length);
  });

  s.teste('o histórico é podado, e a média NÃO muda com a poda', () => {
    /* O teto existe para a tela abrir rápido depois de mil rodadas. Se a poda
       mexesse na média, ela deixaria de ser um teto de exibição e viraria uma
       reescrita silenciosa do passado. */
    const e = novo();
    for (let i = 0; i < HISTORICO_MAX + 30; i++) {
      registrar(e, { roundId: `r${i}`, distribuicao: uniforme(12) });
      pontuar(e, { roundId: `r${i}`, vencedor: i % 12, distribuicaoModelo: uniforme(12) });
    }
    igual(e.historico.length, HISTORICO_MAX, 'o histórico passou do teto');
    igual(e.amostra, HISTORICO_MAX + 30, 'a amostra foi podada junto com as linhas');
    dentro(resumo(e).media, brierUniforme(12), 1e-9,
      'a média mudou por causa da poda — ela tem de vir dos acumuladores, não das linhas');
    igual(historico(e, 5).length, 5, 'o recorte para a tela não respeitou o limite pedido');
  });

  s.teste('a chave do disco carrega a versão da pontuação', () => {
    ok(CHAVE_LIGA.includes(String(VERSAO_PONTUACAO)),
      'sem a versão na chave, mudar a conta mistura duas réguas no mesmo histórico');
  });

  return s;
}
