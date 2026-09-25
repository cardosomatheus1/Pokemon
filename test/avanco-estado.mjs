/* A COLA ENTRE O MOTOR DA RUN E O ESTADO DO JOGADOR — bloco A4b.
 *
 * Este arquivo defende TRÊS coisas, e nenhuma delas é sobre desenho:
 *
 *   A RUN SOBREVIVE     fechar o navegador não pode encerrar um avanço. O modo
 *                       inteiro se apoia nisso (§7.22.16).
 *   O TETO É UM SÓ      a run em curso RESERVA encontros, e é o que faz os dois
 *                       modos dividirem o mesmo orçamento (§7.22.3). Sem isso,
 *                       dormir com uma Vigília e avançar o dia inteiro seriam
 *                       dois farms empilhados.
 *   A RECUSA DIZ O QUÊ  a guarda devolve MOTIVO, e não um booleano — é o D-067,
 *                       que já custou duas telas neste projeto.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
import { VAZIO, carregar, salvar, escolherInicial, estadoDoTeto,
         iniciarExpedicao, emCampo, encontrosDaRun, lancarRunNoTeto,
         ultimoDiagnostico } from '../app/modules/idle-dados.mjs';
import {
  comecarAvanco, porQueNaoAvancar, avancoEmCurso, sincronizar, cena, recuar,
  avisoDoTeto, encontrosValemNa, colherAvancoDaRun, equipeDaRun,
} from '../app/modules/avanco-estado.mjs';
import { comprometido, restamEncontros } from '../engine/expedicao.mjs';
import { ENCONTROS_POR_AVANCO } from '../engine/avanco.mjs';
import { poderDaEquipe } from '../engine/wave.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const AGORA = Date.UTC(2026, 8, 8, 12, 0, 0);

const deposito = (inicial = null) => {
  let v = inicial;
  return { getItem: () => v, setItem: (_, x) => { v = x; } };
};

/* Um jogador com uma criatura pronta para avançar. A stamina nasce cheia, e é
   o bastante para os 23 de um estágio inteiro. */
function jogador() {
  const e = VAZIO();
  escolherInicial(e, kanto, 1, AGORA);
  return e;
}

export function suite() {
  const s = criarSuite('avanco-estado');

  s.teste('a run sobrevive a fechar o navegador', () => {
    const d = deposito();
    const e = jogador();
    salvar(e, d);
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'persiste' });
    salvar(e, d);

    const voltou = carregar(d);
    ok(avancoEmCurso(voltou), 'a run não sobreviveu ao recarregamento');
    igual(voltou.run.bioma, 'floresta');
    igual(voltou.run.raiz, 'persiste', 'a semente da run não voltou do disco');
  });

  s.teste('a run em curso RESERVA encontros — os dois modos dividem o teto', () => {
    const e = jogador();
    const antes = comprometido(estadoDoTeto(e, AGORA, kanto));
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'teto' });
    const depois = comprometido(estadoDoTeto(e, AGORA, kanto));
    igual(depois - antes, ENCONTROS_POR_AVANCO,
      'a run não reservou o elenco do estágio — o teto do §P5 vazaria por aqui');
    ok(restamEncontros(estadoDoTeto(e, AGORA, kanto)) < restamEncontros(estadoDoTeto(jogador(), AGORA, kanto)),
      'o teto do dia não sentiu a run');
  });

  /* ══ D-107 · O TETO SENTE A RUN COLHIDA (ST-1.1, 25/09/2026) ═══════════
   *
   * Até aqui a run RESERVAVA 6 encontros enquanto estava de pé, e ao ser
   * colhida ia para `e.avancos` — que `encontrosHoje` não somava e o
   * `carregar` nem lia. O teto voltava cheio:
   *
   *     livre 30  ->  durante a run 24  ->  depois de colher 4 encontros: 30
   *
   * Avanço atrás de Avanço, a captura não tinha teto. Os quatro testes abaixo
   * são o comportamento certo, e o primeiro é o antigo "afirma o defeito"
   * invertido — ele ficou vermelho no conserto, que é como se sabe que caiu. */
  const colhida = (e, raiz = 'teto') => {
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz });
    const T = AGORA + 60 * 60_000;
    sincronizar(e, { pack: kanto, agora: T });
    colherAvancoDaRun(e, { pack: kanto, agora: T, raiz });
    return T;
  };

  s.teste('D-107: colher a run desconta do teto os encontros que ela rendeu', () => {
    const e = jogador();
    const livre = restamEncontros(estadoDoTeto(e, AGORA, kanto));
    const T = colhida(e);
    const vistos = e.encontros.filter(x => x.origem === 'avanco').length;
    ok(vistos > 0, 'a run desta semente não rendeu encontro — o teste perdeu o que medir');
    igual(restamEncontros(estadoDoTeto(e, T, kanto)), livre - vistos,
      'o teto voltou cheio depois de colher: é o D-107, Avanço atrás de Avanço sem teto');
  });

  s.teste('D-107: o desconto sobrevive a fechar o navegador', () => {
    const d = deposito();
    const e = jogador();
    const T = colhida(e);
    const antes = restamEncontros(estadoDoTeto(e, T, kanto));
    salvar(e, d);
    igual(restamEncontros(estadoDoTeto(carregar(d), T, kanto)), antes,
      'recarregar a página devolveu os encontros — o carregar esqueceu as runs colhidas');
  });

  s.teste('D-107: a janela é móvel — 24 h depois de colher, os encontros voltam', () => {
    const e = jogador();
    const livre = restamEncontros(estadoDoTeto(e, AGORA, kanto));
    const T = colhida(e);
    igual(restamEncontros(estadoDoTeto(e, T + 24 * 3600_000 + 1, kanto)), livre,
      'a run colhida ficou pesando para sempre — o teto é diário (D-052)');
  });

  s.teste('D-107: entre o fim da run e a colheita, a reserva continua de pé', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'teto' });
    const durante = restamEncontros(estadoDoTeto(e, AGORA, kanto));
    const T = AGORA + 60 * 60_000;
    sincronizar(e, { pack: kanto, agora: T });
    ok(e.run?.fim, 'a run desta semente não acabou em uma hora — o teste perdeu o que medir');
    igual(restamEncontros(estadoDoTeto(e, T, kanto)), durante,
      'a run acabou, ainda não foi colhida, e a reserva sumiu: o jogador manda ' +
      'expedições com esses encontros e a colheita entrega os da run por cima do teto');
  });

  s.teste('D-107: o histórico do teto é podado — não cresce para sempre no disco', () => {
    const e = jogador();
    colhida(e, 'a');
    lancarRunNoTeto(e, { colhidaEm: AGORA + 3 * 24 * 3600_000, encontros: 2 });
    igual(e.avancos.length, 1,
      'a run de três dias atrás continuou no disco: o localStorage tem 5 MB e a ' +
      'aba fica aberta por semanas');
  });

  s.teste('D-107: registro forjado no disco é descartado, e o diagnóstico diz', () => {
    const d = deposito(JSON.stringify({ ...VAZIO(), avancos: [
      { colhidaEm: AGORA, encontros: 3 }, { colhidaEm: 'ontem', encontros: 2 },
      { colhidaEm: AGORA, encontros: -40 }, null ] }));
    const e = carregar(d);
    igual(e.avancos.length, 1, 'entrada inválida entrou no teto');
    ok(ultimoDiagnostico.problemas.some(p => /avan/.test(p)),
      'o conserto do disco foi calado');
  });

  s.teste('a segunda run é recusada enquanto a primeira está de pé', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'dupla' });
    const motivo = porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA });
    ok(motivo && /avanço/i.test(motivo), `a recusa não fala do avanço: ${motivo}`);
  });

  /* ══ O QUADRO É O DA RUN QUE ACABOU DE ACONTECER (L-166) ═══════════════
   *
   * Decisão do dono, e ela tem duas metades que precisam ser lidas juntas:
   *
   *   > "ao final da run aparece o quadro com 'quem apareceu' e o jogador tem
   *   >  AQUELE MOMENTO pra decidir suas capturas (…) ao fechar e iniciar
   *   >  outra RUN, esse quadro vai sumir e será atualizado com o da nova run"
   *
   * ── O QUE ISSO COBRA, E POR QUE É BOM ────────────────────────────────
   *
   * Sem a limpeza, os aparecidos empilhariam run após run e o "momento" viraria
   * um estoque: o jogador guardaria trinta espécies esperando a bola boa, e a
   * decisão que o §7.22.12 chama de central deixaria de ter custo. Com ela,
   * entrar noutra run é DESISTIR do que sobrou — e isso é uma escolha.
   *
   * ── E ELA NÃO PODE ENCOSTAR NA ROTA OFF ──────────────────────────────
   *
   * Os dois modos dividem a mesma lista `e.encontros`. A expedição volta
   * quando o jogador não está olhando — apagar o que ela trouxe porque uma run
   * começou seria cobrar dele o preço de uma decisão que ele não tomou. Por
   * isso a limpeza é por ORIGEM, e não pela lista inteira. */
  s.teste('o que a run trouxe fica marcado, e a expedição não se mistura', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'marca' });
    sincronizar(e, { pack: kanto, agora: AGORA + 60 * 60_000 });
    colherAvancoDaRun(e, { pack: kanto, agora: AGORA + 60 * 60_000, raiz: 'marca' });
    const meus = e.encontros.filter(x => x.origem === 'avanco');
    ok(meus.length === e.encontros.length && meus.length >= 0,
      'a run deixou encontros sem origem marcada — a limpeza não saberia quais são dela');
  });

  /* ── E QUEM CONTA OS DA RUN É UMA FUNÇÃO, E NÃO A TELA (S938) ─────────
   *
   * O aviso de prazo do quadro — *"N vieram da run que acabou"* — nascia de um
   * filtro escrito dentro da `innerHTML`. O defeito plantado que o zerava
   * **passou** no portão: não havia como afirmar o número sem montar um DOM.
   *
   *   > Conta que só existe dentro de uma string de HTML é conta que ninguém
   *   > consegue verificar. Tirá-la de lá é o que a torna afirmável.
   *
   * E é a MESMA marca que `comecarAvanco` usa para limpar o quadro: duas
   * leituras da mesma marca divergiriam no dia em que uma terceira origem
   * aparecesse. */
  s.teste('a contagem do quadro separa a run da Rota OFF', () => {
    const e = jogador();
    igual(encontrosDaRun(e), 0, 'sem encontro nenhum, alguém veio da run');

    e.encontros.push({ chave: 'exp:1', dex: 16, origem: 'expedicao' });
    igual(encontrosDaRun(e), 0,
      'o que a expedição trouxe foi contado como da run — o aviso de prazo ' +
      'apareceria para quem não correu nenhuma, e mentiria sobre a limpeza');

    e.encontros.push({ chave: 'run:0', dex: 10, origem: 'avanco' });
    e.encontros.push({ chave: 'run:1', dex: 11, origem: 'avanco' });
    igual(encontrosDaRun(e), 2,
      'os que vieram da run não foram contados — o quadro deixa de avisar que ' +
      'tem prazo, e o jogador perde a captura sem saber que havia um relógio');

    igual(encontrosDaRun(null), 0, 'estado a meio carregar chega assim');
    igual(encontrosDaRun({}), 0, 'estado sem lista de encontros derruba a conta');
  });

  s.teste('começar outra run limpa o quadro da anterior, e SÓ o dela', () => {
    const e = jogador();
    /* Um encontro de expedição, posto à mão: o que importa aqui é a ORIGEM,
       e montar uma Vigília inteira só para produzi-lo mediria outra coisa. */
    e.encontros.push({ chave: 'exp:1', expedicao: 'x1', dex: 16, raridade: 'comum',
                       bioma: 'floresta', em: AGORA, origem: 'expedicao' });
    e.encontros.push({ chave: 'run-velha:0', expedicao: null, dex: 10, raridade: 'comum',
                       bioma: 'floresta', em: AGORA, origem: 'avanco' });

    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'limpa' });

    ok(!e.encontros.some(x => x.chave === 'run-velha:0'),
      'o quadro da run anterior sobreviveu ao começo da nova — ele viraria estoque, ' +
      'e o "momento" que o dono desenhou deixaria de ter custo');
    ok(e.encontros.some(x => x.chave === 'exp:1'),
      'a limpeza levou junto o que a EXPEDIÇÃO trouxe. Ela volta quando o jogador ' +
      'não está olhando — cobrar dele uma decisão que não tomou é o oposto da regra');
  });

  /* ── UMA CRIATURA NÃO ESTÁ EM DOIS LUGARES (L-162) ────────────────────
   *
   * Os dois sentidos, e os dois são o mesmo teste: o que se defende não é uma
   * função, é a soma. Uma recusa só de um lado deixaria a porta aberta pelo
   * outro, e quem descobre é quem está tentando dobrar o dia.
   *
   * A recusa NOMEIA onde a criatura está — D-067. "Não pode" manda o jogador
   * adivinhar qual das três ele precisa recolher. */
  s.teste('quem está em expedição não avança', () => {
    const e = jogador();
    const id = e.criaturas[0].id;
    iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
      equipe: [id], agora: AGORA });
    igual(emCampo(e).length, 1, 'a expedição não foi para o campo');

    const m = porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [id], agora: AGORA });
    ok(m, 'a mesma criatura foi aceita no avanço estando em campo');
    ok(/expedi/i.test(m), `a recusa não diz ONDE ela está: ${m}`);
  });

  s.teste('quem está avançando não sai em expedição', () => {
    const e = jogador();
    const id = e.criaturas[0].id;
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [id], agora: AGORA, raiz: 'dois-lugares' });

    let erro = null;
    try {
      iniciarExpedicao(e, { pack: kanto, bioma: 'floresta', perfil: 'vigilia',
        equipe: [id], agora: AGORA });
    } catch (x) { erro = x.message; }
    ok(erro, 'a mesma criatura foi aceita na expedição estando no avanço');
    ok(/avanç/i.test(erro), `a recusa não diz ONDE ela está: ${erro}`);
    igual(emCampo(e).length, 0, 'a expedição recusada deixou rastro no campo');
  });

  /* ── E A RECUSA APARECE ANTES DO CLIQUE ───────────────────────────────
     É a lição do D-062, escrita no próprio `idle-equipe.mjs`: *a recusa
     depois de clicar é a pior forma de ensinar uma regra*. O jogador clicou,
     ouviu "não pode", e leu como uma regra que não existe.

     O cartão pergunta `ondeAventura` e fecha a criatura ocupada — mas ela
     CONTINUA na lista. Uma criatura que some do painel é procurada na caixa,
     onde ela não está. */
  s.teste('o cartão fecha quem já está fora, e diz onde ela está', () => {
    const t = ler('../app/modules/idle-equipe.mjs');
    ok(t.includes('ondeAventura'),
      'o painel da equipe não pergunta quem já está fora — a recusa voltaria a ' +
      'acontecer só depois do clique, que é o D-062');
    ok(/const fora = ondeAventura/.test(t) && /!fora/.test(t),
      'o painel pergunta e não usa a resposta para fechar o cartão');
    ok(t.includes('criaFora'),
      'o cartão fecha sem DIZER onde a criatura está — parede sem placa, D-067');
    ok(!/podemIr([^)]*)s*.filter[^;]*ondeAventura/.test(t),
      'a criatura ocupada foi REMOVIDA da lista em vez de fechada — quem some do ' +
      'painel é procurado na caixa, onde ela não está');
  });

  s.teste('a recusa diz o QUÊ, e não só que não', () => {
    const e = jogador();
    /* Estágio fechado: a criatura recém-escolhida não abre o 4. */
    const m = porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio: 4,
      equipe: [e.criaturas[0].id], agora: AGORA });
    ok(m && /nível/i.test(m), `a recusa do estágio não diz o nível: ${m}`);
    ok(porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [], agora: AGORA }), 'equipe vazia foi aceita');
    ok(porQueNaoAvancar(e, { pack: kanto, bioma: 'lugar-nenhum', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA }), 'um bioma inexistente foi aceito');
  });

  s.teste('o relógio anda no estado, e a cena responde sobre ele', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'relogio' });
    const c0 = cena(e, { pack: kanto, agora: AGORA });
    ok(c0 && c0.wave === 1, 'a cena não começou na wave 1');
    const r = sincronizar(e, { pack: kanto, agora: AGORA + 40 * 60_000 });
    ok(r.aconteceu.length > 0, 'quarenta minutos não produziram acontecimento nenhum');
    ok(e.run.wave > 1 || e.run.fim, 'a run não andou em quarenta minutos');
  });

  s.teste('recuar encerra a run e ela para de reservar quando colhida', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'recuo' });
    sincronizar(e, { pack: kanto, agora: AGORA + 6 * 60_000 });
    recuar(e, AGORA + 6 * 60_000);
    ok(!avancoEmCurso(e), 'recuar não encerrou a run');
    /* ATÉ 25/09 ESTA LINHA COBRAVA 0 AQUI, antes da colheita — e era a
       metade do D-107: a reserva sumia no recuo, e a colheita entregava os
       encontros da run por cima do que as expedições já tinham usado. O título
       do teste sempre disse "quando colhida"; a asserção agora concorda. */
    igual(comprometido(estadoDoTeto(e, AGORA, kanto)), ENCONTROS_POR_AVANCO,
      'a run encerrada e ainda não colhida soltou a reserva (D-107)');
    colherAvancoDaRun(e, { pack: kanto, agora: AGORA + 7 * 60_000, raiz: 'recuo' });
    const vistos = e.encontros.filter(x => x.origem === 'avanco').length;
    igual(comprometido(estadoDoTeto(e, AGORA + 7 * 60_000, kanto)), vistos,
      'colhida, a run deixa de RESERVAR 6 e passa a pesar só o que de fato rendeu');
  });

  /* ── O TETO AVISA, E NÃO RECUSA (L-151) ────────────────────────────────
     Decisão do dono em 08/09, e ela mudou o papel desta guarda: o teto limita
     o que a run RENDE em espécies, não o direito de rodá-la. */
  s.teste('com o teto estourado a run COMEÇA, e ela sabe que não dá espécie', () => {
    const e = jogador();
    /* Enche o dia com colheitas de expedição. */
    e.expedicoes = [{ id: 'x', perfil: 'vigilia', colhidaEm: AGORA - 1000, encontros: 30 }];

    const motivo = porQueNaoAvancar(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA });
    igual(motivo, null,
      'o teto ainda RECUSA a run — ele deveria só avisar (L-151)');

    const aviso = avisoDoTeto(e, { pack: kanto, agora: AGORA });
    ok(aviso && /espécie/i.test(aviso),
      'a tela não tem o que dizer sobre a run render menos: uma run que rende ' +
      'menos e não avisa é pior que uma recusada');

    const run = comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'semteto' });
    igual(run.semEncontros, true, 'a run não guardou que começou sem teto');
    igual(encontrosValemNa(run), false);
  });

  s.teste('com teto de sobra, a run nasce valendo espécies', () => {
    const e = jogador();
    igual(avisoDoTeto(e, { pack: kanto, agora: AGORA }), null,
      'avisou do teto num dia inteiro livre');
    const run = comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'comteto' });
    igual(run.semEncontros, false);
    igual(encontrosValemNa(run), true);
  });

  /* ── A COLHEITA (A4c) ──────────────────────────────────────────────────
     Ela cobra e paga UMA vez. Colher duas vezes não pode dobrar o saque nem
     pela metade — é a mesma guarda da expedição, e pelo mesmo motivo. */
  s.teste('a run colhida cobra stamina e paga XP, moeda e o baú', () => {
    const e = jogador();
    const id = e.criaturas[0].id;
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [id], agora: AGORA, raiz: 'colheita' });
    /* Roda a run inteira. */
    let t = AGORA;
    while (avancoEmCurso(e) && t - AGORA < 6 * 3600_000) {
      t += 60_000; sincronizar(e, { pack: kanto, agora: t });
    }
    const staminaAntes = e.criaturas.find(c => c.id === id).stamina ?? 100;
    const xpAntes = e.criaturas.find(c => c.id === id).xp ?? 0;
    const moedaAntes = Object.values(e.bolsa).reduce((a, b) => a + b, 0);

    const run = colherAvancoDaRun(e, { pack: kanto, agora: t, raiz: 'saque' });

    const c = e.criaturas.find(x => x.id === id);
    ok(c.xp > xpAntes, 'a run não pagou XP nenhum');
    ok(c.stamina < staminaAntes, 'a run não cobrou stamina');
    ok(Object.values(e.bolsa).reduce((a, b) => a + b, 0) > moedaAntes,
      'a run não pagou moeda nem item');
    igual(e.run, null, 'a run colhida continuou pendurada em e.run');
    igual((e.avancos ?? []).length, 1, 'a run colhida não entrou no histórico');
    ok(run.rendeu, 'a run não guardou o que rendeu — o log de volta leria o quê?');
  });

  s.teste('colher duas vezes é recusado', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'dobro' });
    recuar(e, AGORA + 60_000);
    colherAvancoDaRun(e, { pack: kanto, agora: AGORA + 60_000, raiz: 'a' });
    let erro = null;
    try { colherAvancoDaRun(e, { pack: kanto, agora: AGORA + 61_000, raiz: 'b' }); }
    catch (x) { erro = x; }
    ok(erro, 'colher a run duas vezes foi aceito — o saque dobraria');
  });

  s.teste('a run em curso não pode ser colhida', () => {
    const e = jogador();
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [e.criaturas[0].id], agora: AGORA, raiz: 'cedo' });
    let erro = null;
    try { colherAvancoDaRun(e, { pack: kanto, agora: AGORA + 1000, raiz: 'x' }); }
    catch (x) { erro = x; }
    ok(erro && /acontecendo/.test(erro.message),
      'colher no meio da run foi aceito');
  });

  s.teste('sincronizar uma aba sem run não faz nada, e não explode', () => {
    const e = jogador();
    const r = sincronizar(e, { pack: kanto, agora: AGORA });
    igual(r.aconteceu.length, 0);
    igual(cena(e, { pack: kanto, agora: AGORA }), null);
  });

  /* ── A EQUIPE DA RUN É LIDA VIVA, E NÃO CONGELADA ─────────────────────
   *
   * `S882` voltou `PASSOU` no Q2: trocar `criaturasDe(e)` por uma cópia com
   * todos no nível 1 não reprovava nada. E a consequência é de jogo, não de
   * organização: a criatura que sobe de nível no meio da run continuaria
   * lutando com a força de ontem, e o jogador veria a wave ficar mais difícil
   * depois de ele ter ficado mais forte.
   *
   *   > A run dura ~30 minutos, e é DENTRO dela que o XP chega. Ler a equipe
   *   > uma vez, no começo, é ler a versão que já não existe.
   */
  s.teste('a equipe da run acompanha o nível de AGORA', () => {
    const e = jogador();
    const id = e.criaturas[0].id;
    comecarAvanco(e, { pack: kanto, bioma: 'floresta', estagio: 1,
      equipe: [id], agora: AGORA, raiz: 'nivel' });

    const antes = equipeDaRun(e, kanto, e.run);
    igual(antes.length, 1, 'a equipe da run veio vazia');

    /* ── SUBIR DE NÍVEL É GANHAR XP, e não escrever no campo `nivel` ────
       A primeira versão deste teste escrevia `cria.nivel = 26` e não mudava
       nada — porque `hidratar` DERIVA o nível do XP, e o campo é ignorado.

       O código estava certo, e melhor do que eu supunha: guardar o nível ao
       lado do XP faria os dois divergirem no dia em que a curva mudasse, e
       nenhum dos dois ficaria obviamente errado.

         > Duas vezes seguidas eu afirmei o campo que imaginei em vez do que o
         > código usa. O teste que nasce assim reprova o inocente — e reprova
         > com uma frase convincente, que é o que o torna caro. */
    const cria = e.criaturas.find(c => c.id === id);
    cria.xp = (cria.xp ?? 0) + 20000;
    const depois = equipeDaRun(e, kanto, e.run);

    /* ── O QUE MUDA É O NÍVEL, E NÃO A FORÇA ──────────────────────────
       A primeira versão deste teste cobrava a `forca`, e ela NÃO muda com o
       nível: `forcaDe` é da ESPÉCIE. O código estava certo e a minha
       expectativa, errada — de novo.

         > Afirmar o campo errado reprova o inocente, e o pior é que ele
         > reprova com uma frase convincente.

       O que carrega o nível é `nivel`, e quem o transforma em combate é o
       `poderDaEquipe`. Então a afirmação é feita nos DOIS: o campo chegou, e
       ele MEXE no poder. Só o primeiro deixaria passar um motor que o ignora. */
    ok((depois[0].nivel ?? 0) > (antes[0].nivel ?? 0),
      `o nível era ${antes[0].nivel} e continuou ${depois[0].nivel} depois de ` +
      '25 níveis: a equipe da run está congelada no nível de quando ela começou');
    ok(poderDaEquipe(depois) > poderDaEquipe(antes),
      `o poder era ${poderDaEquipe(antes).toFixed(1)} e continuou ` +
      `${poderDaEquipe(depois).toFixed(1)}: o nível chegou ao motor e não pesa nada`);
  });

  return s;
}
