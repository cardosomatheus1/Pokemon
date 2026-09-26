/* O DOSSIÊ NA FICHA DA POKÉDEX — o que a seção "Na Arena" diz (ST-9.3 · §7.4, §7.12).
 *
 * Camada 0: recebe o dossiê (ST-9.1) e a escada (ST-9.2), devolve as seções
 * já em texto — abertas, com o n de cada número, ou trancadas com o requisito
 * escrito. A tela só pinta.
 *
 *   NENHUM NÚMERO SEM n      "vence 11% (1.842 rodadas)", nunca "vence 11%"
 *   SÓ O QUE O DEGRAU ABRE   a seção trancada diz o que falta, e não mostra
 *                            nada do que esconde — nem uma prévia
 *   A FORMA QUE LUTA         a pré-evolução não tem dossiê: ela aponta para a
 *                            forma que luta na Arena
 */
import { DEGRAUS, LIBERA } from './pokedex-estado.mjs';
import { CAI_CEDO } from '../../engine/dossie.mjs';

const pct = x => `${Math.round(x * 100)}%`;
/* Quantos lugares a arena tem — o maior colocado que o dossiê registrou. */
const lugaresDe = e => Math.max(...Object.keys(e.posicoes?.contagem ?? {}).map(Number).filter(Number.isFinite), 0);
const num = n => Number(n).toLocaleString('pt-BR');
const dec = x => x.toFixed(1).replace('.', ',');
/* Abaixo disto uma taxa por clima é ruído, e mostrá-la seria a tela inventando
   uma tendência — ela some, e o n que falta aparece. */
export const N_MINIMO_CLIMA = 50;
/* Abaixo disto o número aparece, mas marcado: "260 rodadas" e "31.555
   rodadas" entre parênteses iguais pareciam a mesma confiança (Q7). */
export const N_POUCO = 1000;
const ctx = n => `${num(n)} ${n === 1 ? 'rodada' : 'rodadas'}${n < N_POUCO ? ' — poucas' : ''}`;

/* O VEREDITO, em palavra. O número sozinho obrigava o jogador a fazer a conta
   contra a média (Q7: "a leitura sempre pede aritmética"). A faixa de 10% em
   volta da média é "na média": diferença menor que isso não é leitura. */
export function veredito(x, media, { maiorEhMelhor = true } = {}) {
  if (!(media > 0) || !Number.isFinite(x)) return '';
  const r = x / media;
  if (r >= 0.9 && r <= 1.1) return 'na média';
  return (r > 1) === maiorEhMelhor ? 'acima da média' : 'abaixo da média';
}

/* Qual degrau abre cada seção, e como se chega nele — em palavras que o jogador
   novo já conhece (Q7: "maior peso" e "registro da linha" eram jargão). */
const ABRE = Object.fromEntries(Object.entries(LIBERA).flatMap(([g, secoes]) => secoes.map(s => [s, g])));
const COMO = {
  vista: 'veja-a numa rodada da Arena',
  encontrada: 'aposte nela uma vez (ou faça dela a favorita numa previsão da Liga)',
  capturada: 'tenha uma: capture ou evolua até ela',
  dominada: 'junte os fragmentos da linha dela nos encontros do idle',
};

const TITULOS = {
  vitoria: 'Vitórias', abates: 'Abates', caiCedo: 'Cai cedo', porClima: 'Por clima', rival: 'Contra rival de tipo', posicoes: 'Onde termina',
};

/* As médias do elenco inteiro, do próprio dossiê — a régua de cada número. */
function mediasDo(dossie) {
  let n = 0, abates = 0, lugares = 0;
  for (const e of Object.values(dossie?.especies ?? {})) {
    n += e.n; abates += (e.abates?.media ?? 0) * e.n; lugares = Math.max(lugares, lugaresDe(e));
  }
  return { abates: n ? abates / n : 0, lugares };
}

function texto(secao, e, climas, medias) {
  const L = medias.lugares;
  switch (secao) {
    case 'vitoria': {
      const m = L > 1 ? 1 / L : null;
      return [`Vence ${pct(e.vitoria.taxa)} das rodadas em que aparece (${ctx(e.vitoria.n)})` +
              (m ? ` — ${veredito(e.vitoria.taxa, m)}, que numa arena de ${L} é ${pct(m)}.` : '.')];
    }
    case 'abates': return [`${dec(e.abates.media)} abates por rodada (${ctx(e.abates.n)}) — ` +
      `${veredito(e.abates.media, medias.abates)}, que é ${dec(medias.abates)}. Tempestade não conta.`];
    case 'caiCedo': {
      const m = L > CAI_CEDO ? CAI_CEDO / L : null;
      return [`Está entre os ${CAI_CEDO} primeiros a cair em ${pct(e.caiCedo.taxa)} delas (${ctx(e.caiCedo.n)})` +
              (m ? ` — ${veredito(e.caiCedo.taxa, m, { maiorEhMelhor: false })}, que é ${pct(m)}.` : '.')];
    }
    case 'porClima': {
      const base = e.vitoria.taxa;
      const linhas = Object.entries(e.porClima).filter(([, c]) => c.n >= N_MINIMO_CLIMA)
        .sort(([, a], [, b]) => b.taxa - a.taxa)
        .map(([k, c]) => {
          const cl = climas?.find(x => x.key === k);
          const seta = { 'acima da média': ' ▲', 'abaixo da média': ' ▼' }[veredito(c.taxa, base)] ?? '';
          return `${cl?.emoji ?? ''} ${cl?.name ?? k}: vence ${pct(c.taxa)}${seta} (${ctx(c.n)})`.trim();
        });
      return linhas.length ? [`▲ ▼ contra a taxa dela em todos os climas: ${pct(base)} (${ctx(e.vitoria.n)}).`, ...linhas]
                           : [`Ainda sem ${N_MINIMO_CLIMA} rodadas em nenhum clima.`];
    }
    case 'rival': return [
      `Quando há na arena alguém com vantagem de tipo sobre ela: vence ${pct(e.rival.com.taxa)} (${ctx(e.rival.com.n)}).`,
      `Quando não há: vence ${pct(e.rival.sem.taxa)} (${ctx(e.rival.sem.n)}).`];
    case 'posicoes': {
      /* Pódio e colocação média — a lista das 12 posições era um bloco de
         "8% · 8% · 8%" que a leitura tomou por dado de mentira (Q7). */
      const c = e.posicoes.contagem, n = e.posicoes.n;
      const podio = [1, 2, 3].reduce((a, p) => a + (c[p] ?? 0), 0) / n;
      const media = Object.entries(c).reduce((a, [p, k]) => a + Number(p) * k, 0) / n;
      const mPodio = L > 3 ? 3 / L : null, mPos = (L + 1) / 2;
      return [`No pódio (1º a 3º) em ${pct(podio)} (${ctx(n)})` + (mPodio ? ` — ${veredito(podio, mPodio)}, que é ${pct(mPodio)}.` : '.'),
              `Termina, em média, em ${dec(media)}º lugar (${ctx(n)}) — ${veredito(media, mPos, { maiorEhMelhor: false })}, que é ${dec(mPos)}º.`];
    }
  }
  return [];
}

/* `dossie`: o arquivo de content/dossie_*.mjs; `escada`: `escadaDe(...)`;
   `linha`: a linha evolutiva do dex (para achar a forma que luta). */
export function secoesDoDossie({ dossie, escada, dex, linha = [], climas = [] }) {
  const e = dossie?.especies?.[dex];
  if (!e) {
    const lutam = linha.filter(d => d !== dex && dossie?.especies?.[d]);
    return { luta: false, formasQueLutam: lutam, secoes: [] };
  }
  const liberado = new Set(escada?.liberado ?? []);
  const medias = mediasDo(dossie);
  const secoes = Object.keys(TITULOS).map(id => {
    if (liberado.has(id)) return { id, titulo: TITULOS[id], trancada: false, linhas: texto(id, e, climas, medias) };
    const g = ABRE[id];
    return { id, titulo: TITULOS[id], trancada: true, linhas: null, requisito: `Para ver: ${COMO[g]}.`,
             degrau: g, ordem: DEGRAUS.indexOf(g) };
  });
  /* Na tela, as trancadas se AGRUPAM pelo degrau que as abre: a mesma frase
     repetida sob "Abates" e "Cai cedo" foi o que a leitura do Q5 achou — uma
     linha por degrau diz o mesmo com metade do texto. */
  const trancadas = DEGRAUS.filter(g => secoes.some(x => x.trancada && x.degrau === g)).map(g => ({
    degrau: g, titulos: secoes.filter(x => x.trancada && x.degrau === g).map(x => x.titulo), requisito: `Para ver: ${COMO[g]}.` }));
  return { luta: true, formasQueLutam: [], secoes, trancadas };
}
