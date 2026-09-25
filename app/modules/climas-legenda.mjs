/* A LEGENDA DOS CLIMAS — camada 0 (1.32b / ST-2.1, fecha a L-177).
 *
 * O jogador monta a equipe sem saber QUE climas existem. Saber QUAL vai cair
 * estragaria a escolha — "hoje dá Nevasca, levo os quatro de gelo" —, e por
 * isso o clima da run continua oculto até ela começar (L-177, cartão 1.33).
 * Saber a TABELA não estraga nada: é o que faz o bônus, quando cai, ser
 * reconhecido em vez de parecer sorte sem motivo.
 *
 * ── A DIFERENÇA QUE A NOSSA LEGENDA TEM ──────────────────────────────────
 *
 * Toda legenda de clima diz o que o clima dá. Esta diz também o que ele muda
 * NO LUGAR ONDE O JOGADOR ESTÁ: em quantas das rotas do estágio dele o elenco
 * troca um rosto. E ela pergunta ao MOTOR, rota por rota — não escreve uma
 * frase fixa. Medido em 25/09, rotas que mudam por estágio (1..4):
 *
 *     névoa 6·7·3·1   pólen 3·3·2·1   chuva 2·3·1·2   vendaval 2·0·1·1
 *     tempestade 1·0·0·0   nevasca 0·0·2·0   SOL 0·0·0·0
 *
 * Uma frase fixa "o clima muda quem aparece" mentiria para o Sol em todo
 * estágio, e para a Nevasca em três de quatro.
 *
 * ── O SIGILO ESTÁ NA ASSINATURA ──────────────────────────────────────────
 *
 * Esta função não recebe run, estado nem semente: entra o pack e o estágio,
 * sai a tabela. Não há como o clima sorteado vazar por aqui, porque ele não
 * entra. Há teste que cobra isso no texto do módulo. */
import { elencoDoEstagio } from '../../engine/elenco-estagio.mjs';

/* Faixas de frequência, e não porcentagem: o primeiro corte não publica o
   número exato (cartão 1.33), e "raríssimo" diz o que o jogador precisa — que
   a Nevasca é história quando cai, e não plano. */
export function frequencia(w, total) {
  const p = total > 0 ? w / total : 0;
  if (p >= 0.3) return 'o mais comum';
  if (p >= 0.08) return 'comum';
  if (p >= 0.03) return 'raro';
  return 'raríssimo';
}

export function legendaDosClimas(pack, { estagio = 1 } = {}) {
  const lista = pack?.climaIdle ?? [];
  const total = lista.reduce((a, c) => a + (Number(c.w) || 0), 0);
  const biomas = (pack?.biomas ?? []).map(b => b.id);
  return lista.map(c => {
    const tipos = [...(c.tipos ?? [])];
    let rotasQueMudam = 0;
    if (tipos.length) {
      const pref = [{ fonte: c.key, favorece: tipos, desfavorece: [] }];
      for (const b of biomas)
        if ((elencoDoEstagio(pack, b, estagio, pref)?.trocas ?? []).length) rotasQueMudam++;
    }
    return {
      key: c.key, emoji: c.emoji, nome: c.name, desc: c.desc, tipos,
      frequencia: frequencia(Number(c.w) || 0, total),
      rotasQueMudam, rotas: biomas.length,
    };
  });
}

/* A frase do elenco, uma por clima. Mora aqui pelo mesmo motivo da tabela:
   frase dentro de `innerHTML` não se afirma em Node, e é a frase que pode
   mentir. */
export function fraseDoElenco(item) {
  if (!item.tipos.length) return '';
  if (!item.rotasQueMudam) return 'não muda quem aparece no seu estágio';
  return `traz outro rosto a ${item.rotasQueMudam} de ${item.rotas} rotas do seu estágio`;
}
