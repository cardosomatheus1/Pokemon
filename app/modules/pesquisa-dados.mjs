/* A EXPEDIÇÃO VOLTA COM PESQUISA (ST-9.14 · F3.11 · Spec §7.13 · R9).
 *
 * Camada 0. A "pesquisa" é o registro que já existe (R9): o fragmento que cai
 * no ENCONTRO. O que falta é dizer ao jogador o que aqueles fragmentos fazem
 * pela escada da Pokédex (ST-9.2) — "+2 fichas do Charizard: faltam 3 para
 * completar o registro (dominar libera: Onde termina)".
 *
 * Só promete dossiê a quem LUTA: uma linha sem forma na Arena não tem o que
 * dominar, e a frase dela não fala de dossiê. O texto sai da escada — nunca
 * de uma conta paralela —, e cada encontro conta UMA vez.
 */
import { FRAGMENTOS_POR_ENCONTRO } from '../../engine/captura.mjs';
import { escadaDe, registroDaLinha, LIBERA } from './pokedex-estado.mjs';
import { tituloDaSecao } from './dossie-ficha.mjs';
import { formaDaArena } from './comparador-golpes.mjs';
import { baseDe } from '../../engine/evolucao.mjs';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* `encontros`: os da colheita ({dex}); `estado`: o save DEPOIS da colheita. */
export function pesquisaDaColheita(pack, estado, encontros, { marcas, naArena, nomeDe = n => n } = {}) {
  const porLinha = new Map();
  for (const en of encontros ?? []) {
    const linha = baseDe(pack, en.dex);
    porLinha.set(linha, (porLinha.get(linha) ?? 0) + FRAGMENTOS_POR_ENCONTRO);
  }
  const libera = LIBERA.dominada.map(tituloDaSecao).join(', ');
  const linhas = [];
  for (const [linha, ganhos] of porLinha) {
    const forma = formaDaArena(pack, linha, naArena);
    if (forma == null) continue;
    const nomeDo = d => nomeDe(pack.especies.find(e => e.dex === d)?.n ?? '?');
    const { degrau } = escadaDe(pack, estado, forma, marcas);
    const reg = registroDaLinha(pack, estado, forma);
    /* A LINHA pelo nome da base, e a forma que luta ao lado: "+1 ficha do
       Venomoth" logo depois de encontrar um Venonat foi lido como engano (Q5). */
    const cabeca = `+${plural(ganhos, 'ficha', 'fichas')} da linha do ${nomeDo(linha)}` +
      (forma !== linha ? ` (${nomeDo(forma)} na Arena)` : '');
    if (degrau === 'dominada') { linhas.push({ forma, texto: `${cabeca}: dominado — o dossiê inteiro está aberto` }); continue; }
    const faltam = Math.max(0, reg.alvo - reg.fragmentos);
    linhas.push({ forma, texto: faltam > 0
      ? `${cabeca}: faltam ${faltam} para completar o registro (dominar libera: ${libera})`
      : `${cabeca}: registro completo — tenha um para dominar (libera: ${libera})` });
  }
  return linhas;
}
