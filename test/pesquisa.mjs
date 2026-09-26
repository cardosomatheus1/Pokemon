/* Q1 · A EXPEDIÇÃO VOLTA COM PESQUISA (ST-9.14 · F3.11 · Spec §7.13 · R9)
 *
 * A colheita traduz fragmentos em progresso da escada: o texto bate com
 * `pokedex-estado`, cada encontro conta uma vez, e a linha que não luta na
 * Arena não promete dossiê.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import * as motor from '../app/modules/motor.mjs';
import { pesquisaDaColheita } from '../app/modules/pesquisa-dados.mjs';
import { registroDaLinha, marcasVazias } from '../app/modules/pokedex-estado.mjs';
import { formaDaArena } from '../app/modules/comparador-golpes.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { FRAGMENTOS_POR_ENCONTRO } from '../engine/captura.mjs';
import { baseDe } from '../engine/evolucao.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const CHARMANDER = 4, CHARIZARD = 6;

export function suite() {
  const s = criarSuite('pesquisa');
  const opc = { marcas: marcasVazias(), naArena: motor.elenco, nomeDe: motor.nomeExibido };

  s.teste('o texto bate com a escada: fichas ganhas, quanto falta, e o que dominar libera', () => {
    const e = VAZIO();
    e.registro = { [CHARMANDER]: 2 * FRAGMENTOS_POR_ENCONTRO };
    const linhas = pesquisaDaColheita(pack, e, [{ dex: CHARMANDER }, { dex: CHARMANDER }], opc);
    igual(linhas.length, 1, 'duas fichas da mesma linha viraram duas linhas');
    const { fragmentos, alvo } = registroDaLinha(pack, e, CHARIZARD);
    const t = linhas[0].texto;
    ok(t.startsWith(`+${2 * FRAGMENTOS_POR_ENCONTRO} fichas da linha do Charmander (Charizard na Arena)`), `cabeça: ${t}`);
    ok(t.includes(`faltam ${alvo - fragmentos} para completar o registro`), `falta: ${t} (registro ${fragmentos}/${alvo})`);
    ok(/dominar libera: Onde termina/.test(t), `libera: ${t}`);
  });

  s.teste('registro completo sem a criatura, e dominada', () => {
    const e = VAZIO();
    const { alvo } = registroDaLinha(pack, e, CHARIZARD);
    e.registro = { [CHARMANDER]: alvo };
    ok(/registro completo — tenha um para dominar/.test(pesquisaDaColheita(pack, e, [{ dex: CHARMANDER }], opc)[0].texto), 'completo');
    e.criaturas = [{ id: 'x', dex: CHARIZARD }];
    ok(/dominado/.test(pesquisaDaColheita(pack, e, [{ dex: CHARMANDER }], opc)[0].texto), 'dominada');
  });

  /* Neste pack TODA linha tem uma forma no elenco (medido: nenhuma de fora).
     O caso se prova com uma Arena sem a linha do Caterpie — é o pack de
     amanhã, ou um elenco menor. */
  s.teste('quem não luta na Arena não promete dossiê', () => {
    const CATERPIE = 10;
    const semCaterpie = motor.elenco.filter(x => baseDe(pack, x.dex) !== CATERPIE);
    igual(formaDaArena(pack, CATERPIE, semCaterpie), null, 'a linha fora do elenco achou forma');
    igual(pesquisaDaColheita(pack, VAZIO(), [{ dex: CATERPIE }], { ...opc, naArena: semCaterpie }).length, 0,
      'a linha que não luta prometeu dossiê');
    igual(pesquisaDaColheita(pack, VAZIO(), [{ dex: CATERPIE }], opc).length, 1, 'com a linha no elenco, a pesquisa sumiu');
  });

  s.teste('a colheita mostra a pesquisa', () => {
    ok(/pesquisaDaColheita\(PACK, E, encontros, \{ marcas: carregarMarcas\(\), naArena: elenco, nomeDe: nomeExibido \}\)/
      .test(fonte('../app/modules/idle-paineis.mjs')), 'o painel da colheita não pede a pesquisa');
  });

  return s;
}
