/* GERAR O DOSSIÊ DA ARENA — content/dossie_<pack>.mjs (ST-9.1 · F3.9).
 *
 *   node tools/gerar-dossie.mjs [rodadas=200000]
 *
 * Offline, de raiz fixa: regerar dá o arquivo idêntico byte a byte. Regere
 * quando o motor ou o elenco mudarem — a suíte recusa um dossiê de outra
 * versão (`dossieValido`), então a necessidade aparece sozinha. */
import { writeFileSync } from 'node:fs';
import { criarMotor } from '../engine/engine.mjs';
import pack from '../content/escolhido.mjs';
import { medirDossie, finalizarDossie, impressaoDoElenco } from '../engine/dossie.mjs';

export const RAIZ_DOSSIE = 'dossie-v1';

export function gerarDossie(M, rodadas) {
  return { engineVersion: M.versao, contentVersion: impressaoDoElenco(M), pack: M.pack?.id ?? null,
           raiz: RAIZ_DOSSIE, rodadas, especies: finalizarDossie(medirDossie(M, { raiz: RAIZ_DOSSIE, rodadas })) };
}

export const comoModulo = d =>
  `/* GERADO por tools/gerar-dossie.mjs — não edite à mão. Ver engine/dossie.mjs. */\n` +
  `export default ${JSON.stringify(d)};\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const M = criarMotor(pack);
  const d = gerarDossie(M, Number(process.argv[2]) || 200000);
  writeFileSync(new URL(`../content/dossie_${d.pack}.mjs`, import.meta.url), comoModulo(d));
  console.log(`dossiê ${d.pack}: ${d.rodadas} rodadas, ${Object.keys(d.especies).length} espécies, motor ${d.engineVersion}, elenco ${d.contentVersion}`);
}
