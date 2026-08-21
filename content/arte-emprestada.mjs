/* ARTE EMPRESTADA — o pack original vestindo a arte do pack de desenvolvimento.
 *
 * ── A DECISÃO, E DE QUEM ELA É ─────────────────────────────────────────────
 *
 * O dono do projeto decidiu: enquanto o build for PRIVADO — jogado por amigos,
 * sem aquisição paga, sem monetização e sem telemetria de retenção sendo usada
 * para decisão de negócio —, o pack original usa a arte que o pack de
 * desenvolvimento já baixa, em vez das silhuetas.
 *
 * Isso é razoável e é reversível. O que o §0.3.1 proíbe é PUBLICAR um produto
 * com stake econômico sobre assets de terceiros; um build entre amigos não é
 * isso. Mas a distância entre os dois estados é uma linha de configuração, e é
 * exatamente por isso que este arquivo existe separado e grita o que faz.
 *
 * ── POR QUE ISTO NÃO MORA DENTRO DO PACK ORIGINAL ──────────────────────────
 *
 * `content/original_v1.mjs` não menciona o outro pack — nem para cair, nem
 * para comparar —, e há um teste cobrando isso. A razão é a lição da v0.6.1:
 * **o dia em que houver uma referência, haverá um caminho.** Um `catch` que
 * caísse para a arte da franquia faria o jogo "original" mostrar sprites dela
 * no primeiro erro de rede, e ninguém perceberia, porque a tela continuaria
 * bonita.
 *
 * Emprestar arte é COMPOSIÇÃO, e composição mora em `escolhido.mjs`. Aqui está
 * a função; lá está a decisão de usá-la. Tirar o empréstimo é apagar uma
 * chamada, não caçar referências espalhadas.
 *
 * ── O QUE A LACUNA L-042 CONTINUA PEDINDO ──────────────────────────────────
 *
 * Isto NÃO fecha a L-042. O pack original continua sem arte própria, e o dia do
 * lançamento continua exigindo os 76 desenhos. O que muda é que o build de hoje
 * dá para jogar e mostrar, o que é o que ele precisa ser.
 */

/* O MAPA É POSICIONAL, e isso não é preguiça — é a propriedade que faz o
 * empréstimo ficar coerente.
 *
 * O elenco original foi gerado com os MESMOS percentis de força do elenco de
 * desenvolvimento: a criatura de índice `i` tem exatamente o mesmo total de
 * base stats que o lutador `i` de lá. Emprestar por posição faz o mais fraco
 * vestir o mais fraco e o mais forte vestir o mais forte — a arte acompanha o
 * poder, que é o que o jogador lê sem ler número nenhum.
 *
 * Um mapa por nome ou por sorteio quebraria isso e daria um bicho imponente
 * para o lutador de 288 de total. */
export function comArteEmprestada(pack, fonte) {
  const doadores = fonte.elenco
    .map(dex => fonte.especies.find(e => e.dex === dex))
    .filter(Boolean);

  if (doadores.length < pack.especies.length)
    throw new Error(
      `arte emprestada: o pack fonte tem ${doadores.length} lutadores e o ` +
      `destino tem ${pack.especies.length}. Emprestar com sobra viraria repetição ` +
      `silenciosa — dois lutadores com o mesmo retrato, e o jogador não ` +
      `distinguindo em quem apostou.`);

  /* Por POSIÇÃO no elenco, e não por `dex`: o `dex` do pack original é
     sequencial (1..76) e o do doador não é. */
  const porPosicao = new Map(pack.especies.map((e, i) => [e.dex, doadores[i]]));

  return {
    ...pack,
    /* O ID MUDA, e ele precisa mudar. `engine_version` e `content_version` vão
       gravados em toda rodada; duas instâncias com arte diferente jogando o
       "mesmo" pack tornariam a auditoria ambígua meses depois. */
    id: `${pack.id}+arte:${fonte.id}`,
    arteEmprestadaDe: fonte.id,
    sprite(especie) {
      const doador = porPosicao.get(especie.dex);
      /* SEM DOADOR, A SILHUETA — nunca um endereço inventado. A ausência de
         arte é um estado legítimo e a silhueta o representa; um 404 na tela
         não representa nada. */
      return doador ? fonte.sprite(doador) : pack.silhuetaDe(especie);
    },
  };
}
