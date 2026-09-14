/* Q1/Q3/Q4/Q6 · O QUE A EXPEDIÇÃO PAGA EM DINHEIRO (bloco 1.11, camada 0).
 *
 * ── AS SEIS AFIRMAÇÕES ───────────────────────────────────────────────────
 *
 * 1. **O PAGAMENTO É DETERMINÍSTICO A PARTIR DA SEMENTE.** Mesma colheita,
 *    mesmo valor. É o que torna o saque auditável (§25.2) — e o que impede
 *    "recarregar a página até o saque melhorar".
 *
 * 2. **O ENCONTRO RARO PAGA MAIS.** A Vigília rende mais POR ENCONTRO, e não
 *    só mais no total. Sem isso, oito horas viram "mais vezes" e o perfil
 *    deixa de ser uma troca.
 *
 * 3. **A FAIXA PROMETIDA CONTÉM O PAGO.** A tela promete antes de o jogador
 *    mandar; prometer uma faixa e pagar fora dela é a forma mais barata de
 *    perder confiança num jogo de aposta.
 *
 * 4. **NENHUMA CHAVE DE FORA MUDA O PAGAMENTO.** A mesma guarda do teto
 *    (§P5): pagamento que vem de fora é pagamento que a loja pode vender.
 *
 * 5. **ZERO ENCONTROS PAGAM ZERO**, e não `NaN` — a expedição que volta vazia
 *    existe, e ela não pode envenenar a bolsa.
 *
 * 6. **A SOMA É DE SORTEIOS INDEPENDENTES**, e não `n × média`. A variação é
 *    o que o jogador sente como "hoje rendeu"; achatar tira isso sem devolver
 *    nada em troca.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  PC_POR_ENCONTRO, moedasDa, faixaDa, idDaMoeda, idDoMaterial,
} from '../engine/economia-idle.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import original from '../content/original_v1.mjs';

/* Um gerador reprodutível e ruim de propósito: o teste afirma o CONTRATO da
   função, não a qualidade do gerador — essa é do `seed.mjs`, e tem suíte lá. */
const fonte = (semente = 1) => {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
};

export function suite() {
  const s = criarSuite('economia-idle');

  /* --- 1 · DETERMINISMO --------------------------------------------------- */

  s.teste('a mesma semente paga o mesmo valor', () => {
    for (const perfil of Object.keys(PERFIS)) {
      const a = moedasDa(fonte(7), { perfil, encontros: 9 });
      const b = moedasDa(fonte(7), { perfil, encontros: 9 });
      igual(a, b,
        `${perfil} pagou ${a} e depois ${b} com a MESMA semente. O saque tem de ` +
        'ser auditável (§25.2): valor que muda sem a semente mudar é valor que o ' +
        'jogador consegue re-sortear recarregando a página.');
    }
  });

  s.teste('sementes diferentes pagam valores diferentes', () => {
    const vistos = new Set();
    for (let i = 0; i < 40; i++)
      vistos.add(moedasDa(fonte(i + 1), { perfil: 'trilha', encontros: 7 }));
    ok(vistos.size > 20,
      `40 sementes deram só ${vistos.size} valores distintos. Um pagamento que ` +
      'quase não varia é uma média com etapas extras — e a variação é o que o ' +
      'jogador sente como "hoje rendeu".');
  });

  /* --- 2 · O RARO PAGA MAIS ---------------------------------------------- */

  s.teste('o encontro da Vigília vale mais que o da Batida', () => {
    const [bMin, bMax] = PC_POR_ENCONTRO.batida;
    const [tMin, tMax] = PC_POR_ENCONTRO.trilha;
    const [vMin, vMax] = PC_POR_ENCONTRO.vigilia;
    ok(tMin > bMin && tMax > bMax, 'a Trilha não paga mais por encontro que a Batida');
    ok(vMin > tMin && vMax > tMax,
      'a Vigília não paga mais por encontro que a Trilha. Sem isso, oito horas ' +
      'são só "mais vezes" — e o perfil deixa de ser uma troca para virar escala.');
  });

  /* ── AS DUAS LEITURAS ANDAM EM DIREÇÕES OPOSTAS, E NENHUM PERFIL É PIOR
       EM AMBAS ────────────────────────────────────────────────────────────
     Por ENCONTRO o valor sobe com a duração; por HORA ele desce. A primeira
     versão destes números falhava aqui e eu só vi porque calculei: a Trilha
     rendia 140 PC/h contra 158 da Vigília, então era pior nas duas pontas.

     Um perfil dominado não é uma opção — é uma armadilha para quem ainda não
     fez a conta. E "três opções, uma delas armadilha" é pior que duas opções,
     porque o jogo cobra a descoberta em horas de expedição. */
  s.teste('nenhum perfil é dominado: o PC por HORA desce quando a duração sobe', () => {
    const porHora = p => {
      const [min, max] = PC_POR_ENCONTRO[p];
      const [eMin, eMax] = PERFIS[p].encontros;
      return ((min + max) / 2) * ((eMin + eMax) / 2) / (PERFIS[p].minutos / 60);
    };
    const ordem = Object.keys(PERFIS).sort((a, b) => PERFIS[a].minutos - PERFIS[b].minutos);
    for (let i = 1; i < ordem.length; i++) {
      const curto = ordem[i - 1], longo = ordem[i];
      ok(porHora(curto) > porHora(longo),
        `${curto} rende ${porHora(curto).toFixed(0)} PC/h e ${longo} rende ` +
        `${porHora(longo).toFixed(0)} PC/h. O perfil mais longo não pode ganhar ` +
        'também no ritmo: se ganhasse, não haveria motivo para jogar acordado, e ' +
        'o idle perderia a única sessão ativa que tem.');
      const m = p => (PC_POR_ENCONTRO[p][0] + PC_POR_ENCONTRO[p][1]) / 2;
      ok(m(curto) < m(longo),
        `${curto} paga ${m(curto)} por encontro e ${longo} paga ${m(longo)}. ` +
        'O perfil mais longo tem de ganhar POR ENCONTRO — é o que compra as oito ' +
        'horas. Ganhar nos dois eixos seria dominar; perder nos dois seria ser ' +
        'armadilha. A troca só existe quando as duas leituras se opõem.');
    }
  });

  /* --- 3 · A PROMESSA CONTÉM O PAGO --------------------------------------- */

  s.teste('o pago cabe sempre na faixa daquele número de encontros', () => {
    for (const perfil of Object.keys(PERFIS)) {
      const [eMin, eMax] = PERFIS[perfil].encontros;
      for (let i = 0; i < 200; i++) {
        const enc = eMin + (i % (eMax - eMin + 1));
        const [pMin, pMax] = faixaDa(perfil, [enc, enc]);
        const v = moedasDa(fonte(i + 1), { perfil, encontros: enc });
        ok(v >= pMin && v <= pMax,
          `${perfil} com ${enc} encontros pagou ${v}, fora de [${pMin}, ${pMax}]. ` +
          'A tela promete a faixa ANTES de o jogador gastar oito horas de stamina; ' +
          'pagar fora dela quebra a única promessa que o idle faz.');
      }
    }
  });

  /* --- 4 · A PORTA ESTÁ FECHADA (§P5) ------------------------------------- */

  s.teste('§P5 · nenhuma chave de fora muda o pagamento', () => {
    const base = moedasDa(fonte(3), { perfil: 'trilha', encontros: 7 });
    for (const veneno of [{ multiplicador: 99 }, { bonus: 9999 }, { pc: 5000 },
                          { min: 900, max: 900 }, { faixa: [999, 999] }]) {
      const v = moedasDa(fonte(3), { perfil: 'trilha', encontros: 7, ...veneno });
      igual(v, base,
        `a chave ${JSON.stringify(veneno)} mudou o pagamento de ${base} para ${v}. ` +
        'Pagamento que vem de fora é pagamento que a loja pode vender — é o §P5 ' +
        'caindo pela mesma porta que o teto já teve fechada.');
    }
  });

  /* --- 5 · OS EXTREMOS ---------------------------------------------------- */

  s.teste('a expedição vazia paga zero, e zero é um número', () => {
    for (const enc of [0, -1, null, undefined, NaN, 'oito']) {
      const v = moedasDa(fonte(1), { perfil: 'trilha', encontros: enc });
      igual(v, 0, `${JSON.stringify(enc)} encontros pagou ${v}`);
      ok(Number.isFinite(v),
        `${JSON.stringify(enc)} encontros deu um valor não-finito. Um NaN na ` +
        'bolsa não some: ele contamina toda soma futura, e o jogador perde o ' +
        'saldo inteiro sem nada na tela dizendo o que houve.');
    }
  });

  s.teste('um perfil desconhecido paga a faixa padrão, e não quebra', () => {
    const v = moedasDa(fonte(1), { perfil: 'nao-existe', encontros: 5 });
    ok(Number.isFinite(v) && v > 0,
      `perfil desconhecido pagou ${v}. Recusar seria pior: um pack novo com um ` +
      'quarto perfil deixaria de pagar em silêncio.');
  });

  /* --- 6 · A SOMA É DE SORTEIOS ------------------------------------------- */

  s.teste('a soma varia como soma de sorteios, e não como média', () => {
    const vals = [];
    for (let i = 0; i < 300; i++)
      vals.push(moedasDa(fonte(i + 1), { perfil: 'trilha', encontros: 7 }));
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    const dp = Math.sqrt(vals.reduce((a, b) => a + (b - media) ** 2, 0) / vals.length);
    ok(dp > 10,
      `desvio padrão ${dp.toFixed(1)} em 300 colheitas de Trilha. Baixo demais ` +
      'significa que a soma virou n × média em algum ponto — e a variação é o ' +
      'que faz o jogador voltar para VER o saque em vez de só coletá-lo.');
    const [min, max] = faixaDa('trilha', [7, 7]);
    ok(media > min && media < max,
      `a média ${media.toFixed(0)} caiu fora de [${min}, ${max}]`);
  });

  /* ── E O NOME DA MOEDA MORA NO PACK, NÃO NO MOTOR ──────────────────────
     O portão `conteudo` reprovou a primeira versão deste bloco: o motor
     escrevia o nome do tema numa constante `CHAVE_MOEDA`. É a QUARTA vez que
     ele empurra nomenclatura para o ContentPack neste projeto, e as quatro
     vezes o resultado ficou melhor.

     **Um id é nome tanto quanto um rótulo.** Quem lê a chave da bolsa num
     arquivo do motor já sabe de que franquia é o jogo — e o §0.3 existe para
     que um pack sem uma linha da franquia dentro continue pagando o jogador. */
  s.teste('todo pack declara a moeda do PvE e o material, com ids distintos', () => {
    for (const [nome, pack] of [['kanto', kanto], ['original', original]]) {
      const m = idDaMoeda(pack), mat = idDoMaterial(pack);
      ok(m && m !== 'moeda',
        `[${nome}] não declara moedaPve — o idle pagaria numa chave genérica, e ` +
        'dois packs diferentes passariam a dividir o mesmo saldo.');
      ok(mat && mat !== 'material', `[${nome}] não declara material`);
      ok(m !== mat,
        `[${nome}] a moeda e o material dividem a chave "${m}". São coisas ` +
        'diferentes desde a L-095: dinheiro compra o que já tem preço, material ' +
        'compra o que não devia ter — misturar as duas na bolsa desfaz a ' +
        'distinção, e desfaz junto a razão de o material existir.');
      ok(pack.moedaPve?.nome,
        `[${nome}] a moeda do PvE não tem nome, e a tela precisa escrever algum`);
    }
  });

  s.teste('um pack sem moeda declarada não quebra — devolve chave genérica', () => {
    igual(idDaMoeda({}), 'moeda');
    igual(idDaMoeda(null), 'moeda');
    igual(idDoMaterial(undefined), 'material');
  });

  return s;
}
