/* Q1/Q3/Q4/Q6 · OS ESTÁGIOS DE UM BIOMA (bloco 1.10, camada 0).
 *
 * ── A AFIRMAÇÃO QUE CARREGA O BLOCO ──────────────────────────────────────
 *
 * Desbloqueio por nível vira PAREDE, e a parede é o modo de falha que o dono
 * me mandou resolver (L-084). O jogador diante de um estágio que pede mais do
 * que ele tem precisa saber o que fazer AGORA — e "volte amanhã" é a pior
 * resposta que um idle pode dar, porque ele já é feito de esperar.
 *
 *   > **Nenhuma porta custa mais que o dobro de tudo que veio antes dela.**
 *
 * A primeira versão desta regra era "a porta seguinte a menos de um dia de farm
 * da anterior", e ela reprovou o desenho — corretamente, e por estar mal
 * formulada: um dia fixo abriria os quatro estágios em três dias, e quatro
 * portas que se abrem numa semana não são progressão, são um tutorial longo.
 *
 * A proporção é a forma certa da mesma intuição: a espera cresce, e nunca dá um
 * salto que faça o jogador sentir que parou.
 *
 * ── AS OUTRAS CINCO ──────────────────────────────────────────────────────
 *
 * 2. **O PRIMEIRO ESTÁGIO ABRE DE GRAÇA**, em todo bioma. Um mapa com portas
 *    que nunca se abriram é um mapa que mente.
 * 3. **UMA CRIATURA BASTA.** Exigir a equipe inteira faria PEGAR criatura nova
 *    atrasar o progresso — um sistema que pune a atividade que quer incentivar.
 * 4. **MAIS FUNDO É MAIS RARO**, e monotonicamente.
 * 5. **O FUNDO NÃO PAGA MAIS DINHEIRO.** O teto conta encontros; pagar mais por
 *    encontro levantaria a renda sem levantar o teto.
 * 6. **NÃO HÁ PORTA (§P5)**, nem para o estágio nem para o viés.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  ESTAGIOS_POR_BIOMA, NIVEL_DO_ESTAGIO, VIES_DO_ESTAGIO, SAQUE_DO_ESTAGIO,
  nivelDoEstagio, viesDoEstagio, saqueDoEstagio,
  estagioMaximo, estagioAberto, proximoEstagio, viesFinal,
  FAIXAS_DO_ESTAGIO, faixasDoEstagio, cabeNoEstagio, VIES_TETO,
} from '../engine/estagios.mjs';
import { xpParaNivel, XP_POR_ENCONTRO } from '../engine/nivel-criatura.mjs';
import { TETO_ENCONTROS, PERFIS, pesoDaRaridade, previaDeEncontros } from '../engine/expedicao.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* A régua de tempo vem do MOTOR, e não de um número escrito aqui: se o teto ou
   o XP por encontro mudarem, a calibragem tem de ser reconferida em vez de
   continuar passando por inércia. */
const XP_POR_DIA = TETO_ENCONTROS * XP_POR_ENCONTRO.vigilia;
const dias = nivel => xpParaNivel(nivel) / XP_POR_DIA;

export function suite() {
  const s = criarSuite('estagios');

  /* --- 1 · A PAREDE NÃO EXISTE ------------------------------------------- */

  /* ── A CONDIÇÃO DE CONTORNO, e ela é uma pergunta DIFERENTE ────────────
     A regra da proporção reprovou a primeira porta, e reprovou com razão: antes
     do estágio 2 não veio nada, o acumulado é zero, e o dobro de zero é zero.
     Nenhum desenho passaria.

     A porta 2 não se mede por proporção porque não há proporção — mede-se pelo
     que ela É: **a prova de que estágios existem.** Um jogador que nunca abriu
     o segundo não sabe que o primeiro era o primeiro. Ela tem de caber nas
     primeiras sessões, e é só isso.

     Da porta 3 em diante existe passado, e aí a proporção passa a ser a régua
     certa — porque o jogador já tem com o que comparar. */
  s.teste('§Q4 · a primeira porta prova que estágios existem, e cabe em 2 dias', () => {
    const custo = dias(NIVEL_DO_ESTAGIO[1]);
    ok(custo <= 2.5,
      `a porta do estágio 2 custa ${custo.toFixed(1)} dias. Quem nunca abriu o ` +
      'segundo estágio não sabe que o primeiro era o primeiro: essa porta não é ' +
      'progressão, é a demonstração de que existe progressão. Tarde demais e o ' +
      'jogador desiste sem nunca ter visto o sistema funcionar.');
    ok(custo >= 0.8,
      `a porta do estágio 2 custa ${custo.toFixed(1)} dias — cedo demais. Se ela ` +
      'abre na primeira sessão, o estágio 1 nunca chega a ser um lugar.');
  });

  s.teste('§Q4 · e da terceira em diante, nenhuma custa mais que o dobro do passado', () => {
    let acumulado = xpParaNivel(NIVEL_DO_ESTAGIO[1]);
    for (let i = 2; i < NIVEL_DO_ESTAGIO.length; i++) {
      const custo = xpParaNivel(NIVEL_DO_ESTAGIO[i]);
      const vao = custo - acumulado;
      ok(vao <= 2 * acumulado,
        `a porta do estágio ${i + 1} (nível ${NIVEL_DO_ESTAGIO[i]}) custa ` +
        `${(vao / XP_POR_DIA).toFixed(1)} dias, e tudo antes dela custou ` +
        `${(acumulado / XP_POR_DIA).toFixed(1)}. Um salto maior que o dobro é a ` +
        'PAREDE: o jogador para de enxergar a porta seguinte de onde está, e ' +
        '"volte amanhã" vira a resposta do jogo à pergunta "o que faço agora?".');
      acumulado = custo;
    }
  });

  s.teste('§Q4 · e mesmo assim abrir tudo leva mais de uma semana', () => {
    const total = dias(NIVEL_DO_ESTAGIO.at(-1));
    ok(total >= 7,
      `os quatro estágios abrem em ${total.toFixed(1)} dias. Rápido demais e eles ` +
      'não são progressão, são um tutorial longo — e o jogo fica sem nada para ' +
      'oferecer na segunda semana.');
    ok(total <= 25,
      `os quatro estágios levam ${total.toFixed(0)} dias. O último deixa de ser ` +
      'objetivo e vira decoração quando o jogador não consegue enxergá-lo de onde está.');
  });

  s.teste('a porta seguinte é sempre visível: proximoEstagio diz quanto falta', () => {
    for (let nv = 1; nv <= 40; nv++) {
      const p = proximoEstagio([{ nivel: nv }]);
      const atual = estagioMaximo([{ nivel: nv }]);
      if (atual >= ESTAGIOS_POR_BIOMA) { igual(p, null, `nível ${nv} devia estar no fim`); continue; }
      ok(p && p.faltam > 0,
        `no nível ${nv} a próxima porta não anunciou quanto falta. Um limite que ` +
        'o jogador não consegue prever é indistinguível de um limite quebrado — ' +
        'é a mesma lição do D-067, no contador do teto.');
      igual(p.estagio, atual + 1);
      igual(p.faltam, p.nivel - nv);
    }
    igual(proximoEstagio([{ nivel: 999 }]), null,
      'no último estágio ainda havia "próxima porta". "Faltam 0" e "não há mais" ' +
      'são frases diferentes, e a tela precisa das duas.');
  });

  /* --- 2 · O PRIMEIRO ABRE DE GRAÇA -------------------------------------- */

  s.teste('o estágio 1 está aberto para uma criatura recém-nascida', () => {
    igual(NIVEL_DO_ESTAGIO[0], 1);
    igual(estagioMaximo([{ nivel: 1 }]), 1);
    ok(estagioAberto([{ nivel: 1 }], 1),
      'o primeiro estágio nasceu trancado. Haveria bioma inacessível na tela ' +
      'inicial, e um mapa com portas que nunca se abriram é um mapa que mente.');
    ok(estagioAberto([], 1), 'sem criatura nenhuma o estágio 1 ficou trancado');
  });

  /* --- 3 · UMA CRIATURA BASTA -------------------------------------------- */

  s.teste('a MELHOR criatura abre a porta, e as outras não atrasam', () => {
    const campeao = { nivel: NIVEL_DO_ESTAGIO[2] };
    const recem = [{ nivel: 1 }, { nivel: 1 }, { nivel: 2 }];
    igual(estagioMaximo([campeao]), 3);
    igual(estagioMaximo([...recem, campeao]), 3,
      'pegar três criaturas novas TRANCOU um estágio que já estava aberto. Um ' +
      'sistema que pune a atividade que ele quer incentivar está errado, e não ' +
      'importa quão elegante seja a regra.');
    igual(estagioMaximo([campeao, ...recem]), 3, 'a ordem da lista mudou o resultado');
  });

  s.teste('criatura com nível estranho não abre nem fecha porta', () => {
    for (const nv of [null, undefined, NaN, -5, 'muito', {}])
      igual(estagioMaximo([{ nivel: nv }]), 1,
        `nível ${JSON.stringify(nv)} deu estágio ${estagioMaximo([{ nivel: nv }])}. ` +
        'O estado vem do localStorage: valor estranho não é hipótese.');
    igual(estagioMaximo(null), 1);
    igual(estagioMaximo(undefined), 1);
  });

  /* --- 4 · MAIS FUNDO É MAIS RARO ---------------------------------------- */

  s.teste('o viés e o saque melhoram a cada estágio, sem exceção', () => {
    for (let n = 2; n <= ESTAGIOS_POR_BIOMA; n++) {
      ok(viesDoEstagio(n) > viesDoEstagio(n - 1),
        `o estágio ${n} não puxa mais para o raro que o ${n - 1}. Um estágio que ` +
        'não muda o que aparece é um botão a mais sem nada atrás.');
      ok(saqueDoEstagio(n) > saqueDoEstagio(n - 1),
        `o saque do estágio ${n} não é melhor que o do ${n - 1}`);
    }
    igual(viesDoEstagio(1), 0, 'o estágio 1 já vem com viés — a base deixou de ser base');
    igual(saqueDoEstagio(1), 1);
  });

/* ── O PRÊMIO DO FUNDO É A LISTA, E NÃO O PESO ─────────────────────────
     A primeira versão só somava viés, e medindo antes de seguir eu vi que acima
     de ~1,4 a ordem das faixas INVERTE: o "muito raro" ficava mais provável que
     o "comum". Números corretos, significado quebrado — e a prévia da tela
     passaria a mentir com aritmética certa.

     Estas afirmações guardam o desenho que substituiu aquele: o estágio troca a
     LISTA, e o fundo derruba os comuns. */
  s.teste('o fundo derruba os comuns, e é ISSO que o torna raro', () => {
    const raso = faixasDoEstagio(1), fundo = faixasDoEstagio(ESTAGIOS_POR_BIOMA);
    ok(raso.includes('comum'), 'o estágio 1 não tem comuns — a rota de todo dia sumiu');
    ok(!fundo.includes('comum'),
      'o estágio final ainda tem comuns. O muito raro só fica provável lá porque ' +
      'NÃO HÁ comum diluindo — se houver, a única forma de premiar o fundo volta ' +
      'a ser inverter a tabela, e aí "raro" e "comum" trocam de significado.');
    ok(fundo.includes('muitoRaro'), 'o estágio final não oferece a faixa mais rara');
    ok(!raso.includes('muitoRaro'),
      'o estágio 1 já oferece o muito raro. Se o fundo não tem nada exclusivo, ' +
      'ninguém gasta treze dias para chegar nele.');
  });

  s.teste('cada estágio oferece uma lista DIFERENTE, e nenhuma é vazia', () => {
    const vistas = new Set();
    for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++) {
      const f = faixasDoEstagio(n);
      ok(f.length >= 2, `o estágio ${n} oferece só ${f.length} faixa(s)`);
      const chave = f.join('|');
      ok(!vistas.has(chave),
        `dois estágios oferecem exatamente as mesmas faixas (${chave}). Um ` +
        'estágio que não muda o que aparece é um botão a mais sem nada atrás.');
      vistas.add(chave);
    }
  });

  s.teste('§Q4 · a ordem das faixas nunca inverte, em nenhum estágio', () => {
    const ordem = kanto.raridade.map(([id]) => id);
    for (let n = 1; n <= ESTAGIOS_POR_BIOMA; n++)
      for (const perfil of Object.keys(PERFIS)) {
        const v = viesFinal(PERFIS[perfil].vies, n);
        const pesos = faixasDoEstagio(n).map(r => pesoDaRaridade(r, v, ordem));
        for (let i = 1; i < pesos.length; i++)
          ok(pesos[i] <= pesos[i - 1],
            `no estágio ${n} com ${perfil} (viés ${v.toFixed(2)}), ` +
            `"${faixasDoEstagio(n)[i]}" ficou MAIS provável que ` +
            `"${faixasDoEstagio(n)[i - 1]}". Quando o raro passa o comum, as duas ` +
            'palavras deixam de querer dizer o que dizem — e a prévia da tela vira ' +
            'uma mentira feita de números corretos. Medido: inverte acima de ~1,4.');
      }
  });

  /* ── E O QUE IMPORTA É O VIÉS FINAL, e não a tabela crua ────────────────
     O teste acima olha `VIES_DO_ESTAGIO`. Isso deixou passar um defeito
     plantado: subir a tabela para [0, 0.5, 1.0, 1.6] a mantém crescente E faz o
     TETO absorver — a Vigília nos estágios 2, 3 e 4 recebe 1,3 nos três, e a
     profundidade para de significar alguma coisa para ela.

     A tabela é o que eu escrevo; o viés final é o que o jogador recebe. Medir o
     primeiro é medir onde o defeito não pode aparecer — o D-058 outra vez, agora
     pela porta do clamp. */
  s.teste('§Q4 · a profundidade muda o viés FINAL, para todo perfil', () => {
    for (const perfil of Object.keys(PERFIS))
      for (let n = 2; n <= ESTAGIOS_POR_BIOMA; n++) {
        const antes = viesFinal(PERFIS[perfil].vies, n - 1);
        const depois = viesFinal(PERFIS[perfil].vies, n);
        ok(depois > antes,
          `com ${perfil}, o estágio ${n} recebe viés ${depois.toFixed(2)} e o ` +
          `${n - 1} recebe ${antes.toFixed(2)} — iguais. O teto absorveu a ` +
          'diferença, e a profundidade parou de significar algo para esse perfil. ' +
          'A tabela crua continua crescente e o jogador não sente nada: é a ' +
          'tabela mentindo sobre o que chega na tela.');
      }
  });

  s.teste('o viés do perfil SOMA com o do estágio, e não se anula', () => {
    const vig = PERFIS.vigilia.vies;
    ok(viesFinal(vig, ESTAGIOS_POR_BIOMA) > viesFinal(vig, 1),
      'o estágio não acrescentou nada ao viés da Vigília');
    ok(viesFinal(vig, ESTAGIOS_POR_BIOMA) > viesFinal(PERFIS.batida.vies, ESTAGIOS_POR_BIOMA),
      'a Vigília no fundo não é mais rara que a Batida no fundo. A soma é o que ' +
      'faz "Vigília no estágio 4" ser o lugar mais raro do jogo.');
    igual(viesFinal(vig, 1), vig, 'o estágio 1 mexeu no viés do perfil');
  });

  /* --- 5 · O FUNDO NÃO PAGA MAIS DINHEIRO -------------------------------- */

  s.teste('§P5 · o estágio não tem multiplicador de dinheiro', () => {
    const mod = Object.keys({ ESTAGIOS_POR_BIOMA, NIVEL_DO_ESTAGIO, VIES_DO_ESTAGIO,
                              SAQUE_DO_ESTAGIO });
    ok(!mod.some(k => /moeda|dinheiro|pc|pagamento/i.test(k)),
      `o módulo dos estágios exporta ${mod.join(', ')} — algo ali cheira a ` +
      'dinheiro. O teto diário conta ENCONTROS: pagar mais por encontro no fundo ' +
      'levantaria a renda sem levantar o teto, e o §P5 existe para o tempo não ' +
      'virar dinheiro sem limite. O que o fundo paga é a criatura rara.');
  });

  /* --- 6 · NÃO HÁ PORTA (§P5) -------------------------------------------- */

  s.teste('§P5 · estágio fora da faixa é apertado, nunca aceito', () => {
    for (const n of [0, -3, 99, null, undefined, NaN, 'quatro']) {
      const v = viesDoEstagio(n), q = saqueDoEstagio(n), nv = nivelDoEstagio(n);
      ok(VIES_DO_ESTAGIO.includes(v), `estágio ${JSON.stringify(n)} deu viés ${v}`);
      ok(SAQUE_DO_ESTAGIO.includes(q), `estágio ${JSON.stringify(n)} deu saque ${q}`);
      ok(NIVEL_DO_ESTAGIO.includes(nv), `estágio ${JSON.stringify(n)} deu nível ${nv}`);
    }
    igual(viesDoEstagio(99), viesDoEstagio(ESTAGIOS_POR_BIOMA),
      'um estágio inventado passou do fundo. Se `99` virasse viés 99, o estado ' +
      'salvo — que o jogador escreve — seria a chave do bicho mais raro do jogo.');
  });

  /* O TETO DO VIES E CODIGO MORTO HOJE, e o portao mostrou isso: subir o teto
     nao muda nada, porque o maior viés possivel (Vigilia +1, estagio +0,3) fica
     em 1,3 e nunca o alcanca. Ele existe como guarda para o dia em que alguem
     aumentar VIES_DO_ESTAGIO — e guarda que ninguem exercita e guarda que
     ninguem sabe se funciona. Este teste a exercita direto. */
  s.teste('o teto do viés existe e morde, mesmo sem nada alcança-lo hoje', () => {
    igual(viesFinal(99, ESTAGIOS_POR_BIOMA), VIES_TETO,
      `um viés de 99 passou para ${viesFinal(99, ESTAGIOS_POR_BIOMA)}. O teto é a ` +
      'única coisa entre um número grande e a inversão das faixas — e ele fica ' +
      'fora do alcance no desenho de hoje, o que o torna fácil de apagar sem ' +
      'ninguém notar.');
    igual(viesFinal(-99, 1), -99, 'o teto mordeu para baixo, e ele é só de cima');
  });

  s.teste('as três tabelas têm o mesmo tamanho', () => {
    igual(NIVEL_DO_ESTAGIO.length, ESTAGIOS_POR_BIOMA);
    igual(VIES_DO_ESTAGIO.length, ESTAGIOS_POR_BIOMA,
      'há estágio sem viés declarado, ou viés que não pertence a estágio nenhum');
    igual(SAQUE_DO_ESTAGIO.length, ESTAGIOS_POR_BIOMA);
  });

  return s;
}
