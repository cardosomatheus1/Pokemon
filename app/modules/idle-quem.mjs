/* QUEM ESTÁ ONDE — o que a cena e o banner precisam saber (camada 0).
 *
 * ── POR QUE ISTO VIROU MÓDULO ────────────────────────────────────────────
 *
 * Porque é a pergunta que o dono do projeto fez errar quatro vezes seguidas, e
 * todas as quatro eram a mesma pergunta com respostas diferentes:
 *
 *   > "eu mandei um vulpix pra expedição e quem me acompanha é um squirtle"
 *   > "o Pokémon sprite do bioma continua sem mudar, ele manda o primeiro
 *   >  Pokémon base"
 *   > "nem fica setado qual Pokémon você está usando, onde ele está"
 *   > "quando acabou eu mandei outro pokémon do time [...] e não atualizou"
 *
 * Enquanto a resposta morava dentro de `idle-tela.mjs`, cercada de DOM, nenhum
 * teste conseguia falar sobre ela: os defeitos plantados passavam, e quem
 * pegava era ele, olhando. É a mesma extração que o `viewport.mjs` recebeu pelo
 * mesmo motivo — e ali ela transformou um defeito que escapava em um defeito
 * que reprova em milissegundos.
 *
 * Aqui não há DOM, não há `E` global, não há relógio implícito. Entra estado,
 * sai resposta.
 *
 * ── AS DUAS PERGUNTAS, E ELAS NÃO SÃO A MESMA ────────────────────────────
 *
 *   quemFarmaEm()   QUEM está naquele bioma agora. É fato, e pode ser ninguém.
 *   quemMostrar()   quem a CENA desenha. É o fato, com uma exceção nomeada.
 *
 * A diferença é a exceção: quem nunca mandou ninguém a lugar nenhum vê a
 * seleção do seletor como prévia do que vai acontecer. A partir da primeira
 * expedição, a cena só afirma fatos — bioma sem ninguém mostra o treinador
 * sozinho, porque essa é a verdade daquele lugar.
 */

/* A MAIS RECENTE VENCE.
 *
 * `find` devolvia a primeira expedição do bioma — e expedição PRONTA e não
 * colhida continua em campo. Terminada uma e mandada outra no mesmo lugar, a
 * cena seguia desenhando o bicho da antiga.
 *
 * A regra que o dono deu junto do relato é a que vale: *"a mudança da sprite do
 * pokémon em um campo de bioma precisa ser atualizada a toda nova expedição"*.
 * A mais recente é a que ele acabou de mandar, e é nela que ele está pensando.
 */
export function expedicaoEm(emCampo, bioma) {
  return (emCampo ?? [])
    .filter(x => x && x.bioma === bioma)
    .reduce((a, b) => (!a || (b.iniciadaEm ?? 0) > (a.iniciadaEm ?? 0) ? b : a), null);
}

/* Quem está farmando naquele bioma, em criaturas. Lista, e não uma só: as
   quatro expedições da L-082 vão devolver várias, e quem chama já lida com
   lista desde hoje — assim o dia de ligar aquilo não mexe aqui. */
export function quemFarmaEm({ emCampo, criaturas, bioma }) {
  const exp = expedicaoEm(emCampo, bioma);
  if (!exp) return [];
  const ids = exp.equipe ?? [];
  return (criaturas ?? []).filter(c => ids.includes(c.id));
}

/* Quem a cena desenha ao lado do treinador. `null` é resposta legítima. */
export function quemMostrar({ emCampo, criaturas, bioma, selecao }) {
  const [aqui] = quemFarmaEm({ emCampo, criaturas, bioma });
  if (aqui) return aqui;

  /* SEM NINGUÉM EM CAMPO AQUI, a cena mostra A SELEÇÃO — e ela muda a cada
     clique, sem recarregar nada.

     A versão anterior só permitia isso quando NENHUMA expedição existia no
     mundo inteiro. O dono pediu o refinamento, e ele é mais correto do que a
     regra que eu tinha:

       > "ao clicar no pokémon do time pra simular que vai mandá-lo para uma
       >  expedição, ao selecionar já é possível ver sua sprite no bioma [...] a
       >  troca precisa agir de forma simultânea"

     Um bioma sem ninguém em campo é o bioma para onde ele está PRESTES a
     mandar. Mostrar quem ele acabou de escolher não é inventar um fato: é
     mostrar a consequência da escolha dele, antes de ela custar horas. É a
     mesma razão de a tela desenhar o bioma antes de cobrar as oito horas.

     O QUE CONTINUA PROIBIDO é o que estava errado antes: cair no primeiro da
     caixa quando não há seleção nenhuma. Aquilo não era fato nem intenção —
     era a tela inventando um bicho. Sem seleção, o treinador anda sozinho. */
  /* O ULTIMO ESCOLHIDO, e nao o primeiro.

     Com dois na equipe, mostrar  faz o jogador clicar no segundo e
     a cena nao mudar — que e exatamente a sensacao de que ele reclamou, "a
     troca nao esta simultanea", mesmo com tudo funcionando.

     A selecao cresce por acrescimo, entao o ultimo da lista e o que ele acabou
     de clicar. Mostrar esse e responder ao gesto; mostrar o primeiro e
     responder a uma ordem que ele nao ve. */
  const sel = selecao ?? [];
  const escolhido = (criaturas ?? []).find(c => c.id === sel[sel.length - 1]);
  return escolhido ?? null;
}

/* Onde a aba abre. A ação primeiro; o resto é um clique.
 *
 * Abrindo sempre no primeiro bioma da lista, o jogador com uma expedição no
 * gelo via a floresta vazia — e concluía que o jogo esqueceu quem ele mandou. */
export function biomaDeAbertura(emCampo, biomas) {
  const maisRecente = (emCampo ?? [])
    .reduce((a, b) => (!a || (b.iniciadaEm ?? 0) > (a.iniciadaEm ?? 0) ? b : a), null);
  return maisRecente?.bioma ?? (biomas ?? [])[0]?.id ?? null;
}

/* ── QUEM PODE IR A CAMPO ──────────────────────────────────────────────────
 *
 * A equipe, e nunca a caixa.
 *
 * O seletor listava TODAS as criaturas. O jogador escolhia uma guardada,
 * clicava em mandar, e só aí ouvia *"N criatura(s) estão na caixa — tire-as
 * antes"*. Relato do dono: *"tentei enviar outro pokémon do meu time e dizia que
 * só podia o inicial"* — ele leu a recusa como uma regra que não existe.
 *
 * O próprio arquivo da tela já tinha a regra escrita, duas funções acima: *a
 * recusa depois de clicar é a pior forma de ensinar uma regra*. Oferecer o que
 * não dá é a versão dela que "quase funciona".
 *
 * ── POR QUE AQUI, E NÃO UM `filter` NA TELA ──────────────────────────────
 *
 * Porque a versão errada é indistinguível da certa sem alguém na caixa — e a
 * caixa do portão abre com estado zerado, sem nenhuma. A afirmação de navegador
 * que escrevi para isto passou VAZIA, e foi a sexta vez neste projeto que medi
 * onde o defeito não podia aparecer. Como função, ela responde com uma lista de
 * mentira em microssegundos.
 */
export function podemIr(criaturas) {
  return (criaturas ?? []).filter(c => c && !c.naCaixa);
}
