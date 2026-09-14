/* Q1/Q3/Q4/Q6 · A BATALHA CONTRA O TREINADOR (bloco 1.7b, camada 0).
 *
 * ── A AFIRMAÇÃO QUE CARREGA O BLOCO ──────────────────────────────────────
 *
 * A batalha de NPC é a única mecânica do idle que ACRESCENTA recompensa, e por
 * isso ela é a que mais perto chega do §P5. O desenho a mantém do lado certo
 * com uma decisão só:
 *
 *   > **O NPC OCUPA O ENCONTRO.** Em vez de uma criatura para capturar, veio um
 *   > treinador.
 *
 * Sem isso, seria renda extra pendurada no farm, e faria falta um teto novo, um
 * custo de stamina, e uma discussão inteira sobre o que a loja pode vender. Com
 * isso, é uma moeda trocando por outra dentro do mesmo orçamento — e o teto de
 * encontros, que já existe, continua sendo o único.
 *
 * As afirmações 1 e 2 guardam exatamente isso.
 *
 * ── AS OUTRAS ────────────────────────────────────────────────────────────
 *
 * 3. **NUNCA TODOS.** Pelo menos um encontro continua sendo uma criatura. Uma
 *    colheita inteira sem nada para capturar é o idle deixando de ser o que é.
 * 4. **A DERROTA NÃO TIRA NADA.** Um idle que castiga o jogador por estar
 *    ausente está castigando o jogador por usar o produto como ele foi feito.
 * 5. **O NÍVEL IMPORTA, e nem certeza nem impossibilidade.** Uma batalha que
 *    sempre se ganha não é uma batalha; uma que nunca se ganha é uma parede.
 * 6. **NÃO HÁ PORTA (§P5).**
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  CHANCE_POR_ESTAGIO, XP_DA_VITORIA, XP_DA_DERROTA, MATERIAL_DA_VITORIA,
  CHANCE_MINIMA, CHANCE_MAXIMA,
  chanceDoEstagio, nivelDoNpc, chanceDeVencer, quantosNpcs, batalhar, batalhasDa,
} from '../engine/npc.mjs';
import { NIVEL_DO_ESTAGIO, ESTAGIOS_POR_BIOMA } from '../engine/estagios.mjs';
import { TETO_ENCONTROS } from '../engine/expedicao.mjs';

const fonte = (semente = 1) => {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
};

export function suite() {
  const s = criarSuite('npc');

  /* --- 1 · O NPC OCUPA O ENCONTRO --------------------------------------- */

  s.teste('§P5 · a batalha nunca acrescenta encontros ao dia', () => {
    for (let e = 1; e <= ESTAGIOS_POR_BIOMA; e++)
      for (let i = 0; i < 200; i++) {
        const enc = 1 + (i % 14);
        const n = quantosNpcs(fonte(i + 1), { encontros: enc, estagio: e });
        ok(n <= enc,
          `com ${enc} encontros no estágio ${e} saíram ${n} batalhas. A batalha ` +
          'OCUPA um encontro — se ela pudesse acrescentar, o teto diário deixaria ' +
          'de ser o único limite do farm, e o §P5 voltaria à mesa junto com um ' +
          'teto novo, um custo de stamina e uma discussão sobre o que a loja vende.');
      }
  });

  s.teste('§P5 · e o XP extra é o que PASSA do encontro, não o total', () => {
    const base = 20;
    const r = batalhasDa(fonte(7), { encontros: 12, estagio: 4, nivelEquipe: 99, xpBase: base });
    ok(r.quantas > 0, 'a cena não produziu batalha nenhuma — o teste passaria por vazio');
    const teto = Math.round(base * (XP_DA_VITORIA - 1)) * r.quantas;
    ok(r.xpExtra <= teto,
      `${r.quantas} batalhas renderam ${r.xpExtra} de XP extra, e o máximo é ${teto}. ` +
      'O encontro já pagou `base` quando foi contado; a batalha acrescenta a ' +
      'DIFERENÇA. Somar o total pagaria duas vezes pelo mesmo encontro — e num ' +
      'jogo em que o farm é vendável, pagar duas vezes é imprimir dinheiro.');
  });

  /* --- 2 · MAIS FUNDO, MAIS TREINADOR ----------------------------------- */

  s.teste('a chance sobe com o estágio, e nenhum estágio fica sem', () => {
    for (let e = 2; e <= ESTAGIOS_POR_BIOMA; e++)
      ok(chanceDoEstagio(e) > chanceDoEstagio(e - 1),
        `o estágio ${e} não tem mais treinador que o ${e - 1}. É a chance que a ` +
        'prévia mostra: se ela não muda, o número na tela vira enfeite.');
    ok(chanceDoEstagio(1) > 0,
      'o estágio 1 nunca tem batalha. O jogador levaria dias até descobrir que a ' +
      'mecânica existe — e o que não se vê não se persegue.');
    ok(chanceDoEstagio(ESTAGIOS_POR_BIOMA) < 0.5,
      `o fundo tem ${(chanceDoEstagio(ESTAGIOS_POR_BIOMA) * 100).toFixed(0)}% de ` +
      'batalha. Acima da metade a rota deixa de ser caçada e vira campeonato — e ' +
      'quem foi ao estágio 4 foi atrás da criatura rara que só mora lá.');
  });

  /* --- 3 · NUNCA TODOS -------------------------------------------------- */

  s.teste('sempre sobra ao menos um encontro para capturar', () => {
    for (let i = 0; i < 400; i++) {
      const enc = 2 + (i % 13);
      const n = quantosNpcs(fonte(i + 1), { encontros: enc, estagio: ESTAGIOS_POR_BIOMA });
      ok(n <= enc - 1,
        `${enc} encontros viraram ${n} batalhas — não sobrou criatura nenhuma. ` +
        'Uma colheita inteira sem nada para capturar é o idle deixando de ser o ' +
        'que ele é, e num dia de azar isso aconteceria sem ninguém ter errado.');
    }
    igual(quantosNpcs(fonte(1), { encontros: 1, estagio: 4 }), 0,
      'com UM encontro, ele virou batalha. O jogador voltaria de uma expedição ' +
      'inteira sem uma única criatura na tela.');
    igual(quantosNpcs(fonte(1), { encontros: 0, estagio: 4 }), 0);
  });

  s.teste('a variação existe: não é `n × chance` arredondado', () => {
    const vistos = new Set();
    for (let i = 0; i < 60; i++)
      vistos.add(quantosNpcs(fonte(i + 1), { encontros: 12, estagio: 3 }));
    ok(vistos.size >= 3,
      `60 sementes deram só ${vistos.size} resultado(s) distinto(s). Média achatada ` +
      'tira o que faz uma colheita ser diferente da outra — mesma decisão do ' +
      'dinheiro no 1.11, pelo mesmo motivo.');
  });

  /* --- 4 · A DERROTA NÃO TIRA NADA -------------------------------------- */

  s.teste('perder rende MENOS, e nunca menos que um encontro comum', () => {
    ok(XP_DA_DERROTA >= 1,
      `a derrota multiplica o XP por ${XP_DA_DERROTA} — abaixo de 1 ela TIRA do ` +
      'que o encontro já valia. Um idle que castiga o jogador por estar ausente ' +
      'está castigando o jogador por usar o produto como ele foi feito.');
    ok(XP_DA_VITORIA > XP_DA_DERROTA,
      'ganhar e perder rendem o mesmo — então o nível da equipe não compra nada, ' +
      'e a batalha vira uma animação.');
    for (let i = 0; i < 300; i++) {
      const r = batalhar(fonte(i + 1), { nivelEquipe: 1, estagio: ESTAGIOS_POR_BIOMA });
      ok(r.xp >= 1 && r.material >= 0,
        `uma derrota devolveu xp ${r.xp} e material ${r.material}. Nada pode ser ` +
        'negativo: o jogador não estava lá para jogar melhor.');
    }
  });

  s.teste('o material só vem da vitória, e cabe na faixa', () => {
    const [min, max] = MATERIAL_DA_VITORIA;
    for (let i = 0; i < 400; i++) {
      const r = batalhar(fonte(i + 1), { nivelEquipe: 50, estagio: 2 });
      if (r.venceu) ok(r.material >= min && r.material <= max,
        `a vitória rendeu ${r.material} de material, fora de [${min}, ${max}]`);
      else igual(r.material, 0, 'a derrota rendeu material');
    }
  });

  /* --- 5 · O NÍVEL IMPORTA, E OS DOIS EXTREMOS SÃO PRESOS --------------- */

  s.teste('o treinador está no nível da porta que ele guarda', () => {
    for (let e = 1; e <= ESTAGIOS_POR_BIOMA; e++)
      igual(nivelDoNpc(e), NIVEL_DO_ESTAGIO[e - 1],
        `o treinador do estágio ${e} não está no nível que abre o estágio ${e}. ` +
        'Um número inventado por cima disso só teria a função de ser ajustado ' +
        'depois — e a leitura "o treinador daqui está no nível daqui" é a mais ' +
        'simples que existe.');
  });

  s.teste('§Q4 · quem acaba de abrir a porta empata; quem passou dela ganha', () => {
    for (let e = 1; e <= ESTAGIOS_POR_BIOMA; e++) {
      const nv = nivelDoNpc(e);
      const naPorta = chanceDeVencer(nv, nv);
      ok(naPorta >= 0.45 && naPorta <= 0.55,
        `no nível exato da porta do estágio ${e} a chance é ${(naPorta * 100).toFixed(0)}%. ` +
        'O empate tem de ser empate: quem acaba de abrir a porta precisa sentir ' +
        'que a batalha é dele para ganhar ou perder.');
      ok(chanceDeVencer(nv + 8, nv) > naPorta,
        'passar do nível não melhorou a chance — então subir de nível não compra ' +
        'nada, e o 1.14 inteiro perde o motivo.');
      ok(chanceDeVencer(nv, nv + 20) < naPorta);
    }
  });

  /* ── AFIRMAR O VALOR, E NÃO A CONSTANTE ────────────────────────────────
     A primeira versão comparava `chanceDeVencer(999, 1)` com `CHANCE_MAXIMA`.
     Isso deixou o S684 passar: mudar a constante para 1 mudava OS DOIS LADOS da
     igualdade, e ela continuava verdadeira enquanto a batalha virava certeza.

     Comparar um resultado com a constante que o produziu não prova nada — é o
     D-058 numa roupa nova: medir onde o defeito não pode aparecer. O que
     importa não é "o teto foi aplicado", é **qual é o teto**. */
  s.teste('nem certeza nem impossibilidade', () => {
    ok(CHANCE_MAXIMA < 1,
      `a chance máxima é ${CHANCE_MAXIMA}. Batalha que não se pode perder não é ` +
      'batalha — é uma animação com um número no fim, e a prévia passa a prometer ' +
      'um risco que não existe.');
    ok(CHANCE_MINIMA > 0,
      `a chance mínima é ${CHANCE_MINIMA}. Uma batalha que nunca se ganha faz do ` +
      'estágio acima do nível uma segunda parede, e a primeira já basta.');
    igual(chanceDeVencer(999, 1), CHANCE_MAXIMA, 'o teto de cima não foi aplicado');
    igual(chanceDeVencer(1, 999), CHANCE_MINIMA, 'o piso não foi aplicado');
    for (const v of [null, undefined, NaN, -5, 'muito'])
      ok(chanceDeVencer(v, 10) >= CHANCE_MINIMA && chanceDeVencer(10, v) <= CHANCE_MAXIMA,
        `nível ${JSON.stringify(v)} produziu chance fora da faixa`);
  });

  /* --- 6 · NÃO HÁ PORTA (§P5) ------------------------------------------- */

  s.teste('§P5 · nenhuma chave de fora muda a batalha', () => {
    const base = batalhasDa(fonte(5), { encontros: 10, estagio: 2, nivelEquipe: 12, xpBase: 20 });
    for (const veneno of [{ chance: 1 }, { xp: 999 }, { multiplicador: 9 },
                          { material: 99 }, { vitorias: 10 }]) {
      const v = batalhasDa(fonte(5), { encontros: 10, estagio: 2, nivelEquipe: 12,
                                       xpBase: 20, ...veneno });
      igual(v.xpExtra, base.xpExtra,
        `a chave ${JSON.stringify(veneno)} mudou o XP extra. Recompensa que vem de ` +
        'fora é recompensa que a loja pode vender.');
      igual(v.material, base.material);
      igual(v.quantas, base.quantas);
    }
  });

  s.teste('§Q4 · o dia inteiro de batalhas ainda cabe no teto de encontros', () => {
    /* A soma de batalhas num dia cheio não pode passar do teto — e não passa por
       construção, porque cada uma OCUPA um encontro. Este teste existe para o
       dia em que alguém tentar "só mais um bônus". */
    let total = 0;
    const rnd = fonte(11);
    for (let i = 0; i < 3; i++)
      total += quantosNpcs(rnd, { encontros: 10, estagio: ESTAGIOS_POR_BIOMA });
    ok(total <= TETO_ENCONTROS,
      `três expedições cheias renderam ${total} batalhas, e o teto do dia é ` +
      `${TETO_ENCONTROS} ENCONTROS. Se a soma passar, é porque a batalha deixou ` +
      'de ocupar o encontro — e aí ela virou renda paralela sem limite.');
  });

  return s;
}
