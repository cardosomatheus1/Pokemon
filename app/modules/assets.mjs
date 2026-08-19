/* Resolução de endereço de asset — a ordem `local → origem → espelho`.
 *
 * O jogo busca ~200 folhas de sprite por sessão de `raw.githubusercontent.com`.
 * Isso já custou três versões ao projeto (v0.6.1 a v0.6.3), e a hipótese
 * registrada para os sprites terem sumido "sem nada ter mudado no código" —
 * acúmulo de limite de requisições — continua válida. Também impede o jogo de
 * abrir com egresso restrito: até o F0.12 o portão Q5 só funcionava porque o
 * arnês interceptava as requisições e as servia pelo Node.
 *
 * A REGRA QUE GOVERNA ESTE ARQUIVO, e ela é do CLAUDE.md, não minha:
 * **o resgate busca a MESMA coisa em outro endereço, nunca outra coisa.**
 * Cada candidato abaixo é o mesmo arquivo em outro lugar. Trocar por arte
 * parecida quando a original falha foi o erro da v0.6.1, e não se repete.
 *
 * O diretório local NÃO é versionado: é arte de terceiros, mesma razão pela
 * qual `battle-theme.mp3` ficou de fora. O script baixa; o repositório não
 * guarda. Ver tools/baixar-assets.mjs.
 */

export const PASTA_LOCAL = 'assets';

/* Mapeia um endereço remoto para o caminho local, de forma determinística —
 * o downloader e o app usam ESTA função, então não há como as duas metades
 * discordarem sobre onde o arquivo está. */
export function caminhoLocal(url) {
  const u = new URL(url);
  return `${PASTA_LOCAL}/${u.hostname.replace(/\./g, '_')}${u.pathname}`;
}

/* A cascata. `base` é o prefixo até a raiz do projeto visto pela página —
 * `app/index.html` está um nível abaixo, então o padrão é '../'. */
export function candidatos(url, espelho, base = '../') {
  return [base + caminhoLocal(url), url, ...(espelho ? [espelho] : [])];
}

/* Liga uma imagem à cascata: tenta o primeiro, cai para o próximo no erro.
 * Devolve o primeiro candidato, para quem precisa do `src` inicial. */
export function comCascata(img, url, espelho, aoResolver, base) {
  const lista = candidatos(url, espelho, base);
  let i = 0;
  img.onerror = () => {
    if (++i < lista.length) img.src = lista[i];
    else if (aoResolver) aoResolver(null);
  };
  img.onload = () => { if (aoResolver) aoResolver(lista[i]); };
  img.src = lista[0];
  return lista[0];
}

/* Versão para `<img>` escrito em HTML, onde não há objeto para pendurar
 * handler. Gera o atributo `onerror` que percorre a mesma lista. */
export function atributoCascata(url, espelho, base = '../') {
  const lista = candidatos(url, espelho, base).slice(1);
  if (!lista.length) return '';
  const passos = lista.map((u, i) =>
    `if(this.dataset.p=='${i}'){this.dataset.p='${i+1}';this.src='${u}';return;}`).join('');
  return ` data-p="0" onerror="${passos}this.onerror=null"`;
}
