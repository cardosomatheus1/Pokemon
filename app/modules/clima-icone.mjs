/* O ÍCONE DO CLIMA (ST-5.16 · L-194) — camada 0.
 *
 * Os climas chegavam à tela como emoji de sistema (☀️ 🌬️ ⛅ ❄️ 🌧️): destoavam
 * do tema pixel/neon, e cada sistema os desenha de um jeito — o mesmo "Sol
 * Forte" era outro desenho em cada aparelho. O ícone agora é arte NOSSA, em
 * `arte/clima/`, gerada pela `tools/pixel-arte.mjs` (a grade é o que se edita).
 *
 * A chave é a do clima no pack; os climas do idle e os da Arena que são o
 * mesmo tempo dividem o ícone (vendaval/vento, nevasca/neve). Chave sem
 * arte cai no emoji do pack — nunca some. */
export const ARTE_DO_CLIMA = '../arte/clima';
export const ICONE_DO_CLIMA = Object.freeze({
  neutro: 'neutro', sol: 'sol', chuva: 'chuva', vento: 'vento', vendaval: 'vento',
  neve: 'neve', nevasca: 'neve', tempestade: 'tempestade', nevoa: 'nevoa', polen: 'polen',
});

export function iconeDoClima(key, emoji = '') {
  const arq = ICONE_DO_CLIMA[key];
  return arq ? `<img class="clIco" src="${ARTE_DO_CLIMA}/${arq}.svg" alt="">` : (emoji ?? '');
}
