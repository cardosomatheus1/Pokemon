/* Baixa a arte que o jogo usa para um diretório LOCAL e não versionado.
 *
 * Por que existe: o jogo pedia ~200 folhas de sprite por sessão a um CDN de
 * terceiros. Isso é risco de disponibilidade (limite de requisições já derrubou
 * os sprites uma vez, na v0.6.1) e impede rodar com egresso restrito.
 *
 * O que ele NÃO faz: substituir arte. Cada arquivo é baixado do mesmo endereço
 * que o jogo usaria, e o resgate pelo espelho busca o MESMO arquivo em outro
 * lugar — nunca outro arquivo. É a lição registrada da v0.6.1.
 *
 * O diretório fica fora do versionamento: arte de terceiros não entra no
 * repositório, mesma razão do battle-theme.mp3.
 *
 * Uso: node tools/baixar-assets.mjs
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caminhoLocal } from '../app/modules/assets.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const { PMD, ANIM_FILE, IDLE_USES_WALK, PMD_BASE, PMD_ESPELHO } =
  await import('../app/modules/sprites-dados.mjs');
const { MOVE_FX, FX_BASE, FX_ESPELHO } = await import('../app/modules/efeitos-dados.mjs');
const pack = (await import('../content/pokemon_kanto_v1.mjs')).default;

/* DUAS famílias desde o V1.13, e a divisão é deliberada: Orbitron veste a
   plataforma (letrado, topbar, títulos, botões) e Press Start 2P veste o jogo
   (HUD de vida, odds, contagem, killfeed, log). A pixelada continua sendo a
   alma da arena; a outra é o chrome em volta dela.

   Baixar a folha de estilo E os .woff2 que ela aponta é o que permite abrir com
   egresso fechado sem trocar a tipografia — e tipografia trocada em silêncio é
   o erro da v0.6.1 noutra roupa. */
const FONTE_CSS = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@500;700;900&display=swap';

/* Todo endereço que o jogo pode pedir, com o espelho de cada um. */
function alvos() {
  const lista = [];
  const elenco = pack.especies.filter(p => pack.elenco.includes(p.dex));
  for (const esp of pack.especies) {
    lista.push({ url: pack.sprite(esp), espelho: null });
    /* retrato do dex, usado na customização e no pódio */
    lista.push({ url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${esp.dex}.png`,
                 espelho: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${esp.dex}.png` });
  }
  /* folhas de EFEITO: outro repositório, mesma história. Foi o portão de
     egresso fechado que mostrou que elas existiam — 70 requisições saíam para
     fora mesmo com todas as folhas de sprite em disco. */
  for (const fx of Object.values(MOVE_FX))
    for (const k of ['cast', 'proj', 'beam', 'hit'])
      if (fx[k]) lista.push({ url: FX_BASE + fx[k], espelho: FX_ESPELHO + fx[k] });
  for (const esp of elenco) {
    const meta = PMD[esp.dex];
    if (!meta) continue;
    for (const k of ['w', 'i', 'a', 'h']) {
      if (!meta[k]) continue;
      const chave = (k === 'i' && IDLE_USES_WALK.has(esp.dex)) ? 'w' : k;
      const path = String(esp.dex).padStart(4, '0') + '/' + ANIM_FILE[chave] + '-Anim.png';
      lista.push({ url: PMD_BASE + path, espelho: PMD_ESPELHO + path });
    }
  }
  /* dedup por url: a mesma folha serve mais de uma animação */
  return [...new Map(lista.map(a => [a.url, a])).values()];
}

async function baixar(a) {
  const destino = join(RAIZ, caminhoLocal(a.url));
  if (existsSync(destino) && statSync(destino).size > 0) return 'já tinha';
  for (const url of [a.url, a.espelho].filter(Boolean)) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) continue;
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, buf);
      return url === a.url ? 'origem' : 'espelho';
    } catch { /* tenta o próximo endereço do MESMO arquivo */ }
  }
  return 'falhou';
}

const lista = alvos();

/* A fonte tem duas etapas: baixar o CSS, ler os endereços de .woff2 de dentro
   dele, reescrever o CSS para apontar para as cópias locais. */
async function baixarFonte() {
  const destinoCss = join(RAIZ, caminhoLocal(FONTE_CSS));
  try {
    const r = await fetch(FONTE_CSS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return 'falhou';
    let css = await r.text();
    for (const m of [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)]) {
      const url = m[1];
      const res = await baixar({ url, espelho: null });
      if (res === 'falhou') return 'falhou';
      /* o CSS local mora em assets/fonts_googleapis_com/, e o .woff2 em
         assets/fonts_gstatic_com/ — o caminho relativo sobe um nível */
      css = css.replace(url, '../' + caminhoLocal(url).replace(/^assets\//, ''));
    }
    mkdirSync(dirname(destinoCss), { recursive: true });
    writeFileSync(destinoCss, css);
    return 'origem';
  } catch { return 'falhou'; }
}
console.log(`${lista.length} arquivos a conferir em ${caminhoLocal(lista[0].url).split('/')[0]}/`);
const conta = { 'já tinha': 0, origem: 0, espelho: 0, falhou: 0 };
const falhas = [];
const LOTE = 8;
for (let i = 0; i < lista.length; i += LOTE) {
  const r = await Promise.all(lista.slice(i, i + LOTE).map(baixar));
  r.forEach((res, k) => { conta[res]++; if (res === 'falhou') falhas.push(lista[i + k].url); });
  process.stdout.write(`\r  ${Math.min(i + LOTE, lista.length)}/${lista.length}`);
}
const fonte = await baixarFonte();
console.log(`\n${Object.entries(conta).map(([k, v]) => `${k}: ${v}`).join(' · ')} · fonte: ${fonte}`);
if (fonte === 'falhou') falhas.push(FONTE_CSS);
if (falhas.length) {
  console.log('\nsem resposta de nenhuma das fontes:');
  for (const f of falhas.slice(0, 10)) console.log('  ' + f);
  process.exit(1);
}
