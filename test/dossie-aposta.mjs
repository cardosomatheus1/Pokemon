/* Q1/Q3 · O DOSSIÊ AO LADO DA APOSTA (ST-9.4 · F3.12 · Spec §7.3, §7.15, §28.7)
 *
 * "No histórico vence 11% (n)" sob o nome de quem o jogador já ENCONTROU, e
 * nada além disso: a odd, o registro do preço, a semente e os eventos da luta
 * são os mesmos com a nota ligada ou desligada, em qualquer estado da
 * Pokédex. E a nota não recebe o clima — não tem como vazá-lo.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import DOSSIE from '../content/dossie_pokemon_kanto_v1.mjs';
import { notaDaAposta, legendaDasNotas } from '../app/modules/dossie-ficha.mjs';
import { DEGRAUS, marcasVazias, marcarVistas, marcarEncontrada } from '../app/modules/pokedex-estado.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { sementes } from '../engine/seed.mjs';
import { simularLote, precificar } from '../engine/preco.mjs';
import { lutaDaRodada } from '../engine/luta-rodada.mjs';
import { notasDaRodada } from '../app/modules/historico-aposta.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const CHARIZARD = 6;

/* A rodada inteira que o jogador recebe, como texto: preço e luta. */
function rodada(raiz) {
  const t = sementes(raiz);
  const pool = E.sortearPool(t.elenco);
  const wins = new Array(pool.length).fill(0);
  simularLote(E.M, pool, raiz, 0, 300, wins);
  const registro = precificar(wins, 300, E.M);
  const luta = lutaDaRodada(E.M, { pool, ambiente: t.ambiente, batalha: t.batalha });
  return { pool, texto: JSON.stringify({ pool: pool.map(f => f.dex), registro, clima: luta.clima.key, batalha: luta.batalha }) };
}

export function suite() {
  const s = criarSuite('dossie-aposta');

  s.teste('a nota só aparece de ENCONTRADA para cima, e traz o n', () => {
    for (const degrau of DEGRAUS) {
      const n = notaDaAposta({ dossie: DOSSIE, degrau, dex: CHARIZARD });
      if (DEGRAUS.indexOf(degrau) < DEGRAUS.indexOf('encontrada')) igual(n, null, `a nota apareceu para ${degrau}`);
      else {
        ok(n && /^histórico \d+%$/.test(n.texto), `${degrau}: nota fora do formato — ${n?.texto}`);
        igual(n.n, DOSSIE.especies[CHARIZARD].vitoria.n, 'a nota não carrega o n');
        ok(n.titulo.includes(DOSSIE.especies[CHARIZARD].vitoria.n.toLocaleString('pt-BR')), 'o título perdeu o n exato');
        ok(/não nesta rodada/.test(n.titulo), 'o título não separa o histórico da chance desta rodada');
      }
    }
    igual(notaDaAposta({ dossie: DOSSIE, degrau: 'dominada', dex: 4 }), null, 'quem não luta ganhou nota');
    /* Amostra pequena: aí o n é a informação, e ele volta para a linha. */
    const raso = { especies: { 6: { ...DOSSIE.especies[6], vitoria: { n: 260, taxa: 0.32 } } } };
    igual(notaDaAposta({ dossie: raso, degrau: 'encontrada', dex: 6 }).texto, 'histórico 32% (260 — poucas)', 'n pequeno sem marca');
    /* O n comum vai uma vez, na legenda — e ela só existe se há nota. */
    igual(legendaDasNotas([null, null]), null, 'legenda sem nota');
    const leg = legendaDasNotas([null, { n: 31555 }, { n: 31800 }]);
    ok(/31,6 mil rodadas ou mais/.test(leg) && /não é a chance desta rodada/.test(leg), `legenda: ${leg}`);
  });

  s.teste('a nota não recebe o clima, a odd nem a pool — e é a mesma em qualquer rodada', () => {
    const corpo = semComentario(fonte('../app/modules/dossie-ficha.mjs')).split('export function notaDaAposta')[1].split('\n}')[0];
    ok(!/clima|odd|prob|pool|weather/.test(corpo), 'a nota lê algo da rodada');
    const liga = semComentario(fonte('../app/modules/historico-aposta.mjs'));
    ok(!/\bS\b|clima|weather|odds/.test(liga), 'a ligação lê algo da rodada');
    const e = VAZIO(), m = marcasVazias();
    const r = rodada('nota-mesma');
    marcarVistas(m, r.pool.map(f => f.dex)); r.pool.forEach(f => marcarEncontrada(m, f.dex));
    const a = JSON.stringify(notasDaRodada(r.pool, { estado: e, marcas: m }));
    /* A mesma pool em rodadas de clima diferente: a nota não muda. */
    for (const clima of ['sol', 'chuva', 'neve'])
      igual(JSON.stringify(notasDaRodada(r.pool, { estado: e, marcas: m, clima })), a, `a nota mudou com ${clima}`);
  });

  s.teste('informação não é probabilidade: preço, semente e luta idênticos com a nota ligada, em qualquer estado', () => {
    for (const raiz of ['info-1', 'info-2', 'info-3']) {
      const antes = rodada(raiz).texto;
      /* Liga a nota em três estados diferentes da Pokédex e reprecifica. */
      for (const monta of [() => marcasVazias(), m => { marcarVistas(m, rodada(raiz).pool.map(f => f.dex)); return m; },
                           m => { rodada(raiz).pool.forEach(f => marcarEncontrada(m, f.dex)); return m; }]) {
        const m = monta(marcasVazias()) ?? marcasVazias();
        notasDaRodada(rodada(raiz).pool, { estado: VAZIO(), marcas: m });
        igual(rodada(raiz).texto, antes, `${raiz}: a rodada mudou com a Pokédex`);
      }
    }
    for (const f of ['../app/modules/odds.mjs', '../engine/preco.mjs', '../engine/engine.mjs'])
      ok(!/from '[^']*(historico-aposta|dossie|pokedex-estado)[^']*'/.test(fonte(f)), `${f} importa a escada ou o dossiê`);
    /* A rodada ESCREVE na escada (marca as vistas, ST-9.3) e nunca a lê. */
    ok(/import \{ registrarVistas \} from '\.\/pokedex-estado\.mjs';/.test(fonte('../app/modules/fases.mjs')) &&
       !/from '[^']*(historico-aposta|dossie)[^']*'/.test(fonte('../app/modules/fases.mjs')), 'a rodada lê a escada ou o dossiê');
  });

  s.teste('a lista de apostas pinta a nota que recebe, de quem ENCONTROU', () => {
    const e = VAZIO(), m = marcasVazias();
    const r = rodada('nota-lista');
    marcarVistas(m, r.pool.map(f => f.dex));
    marcarEncontrada(m, r.pool[4].dex);
    const notas = notasDaRodada(r.pool, { estado: e, marcas: m });
    igual(notas.map((x, i) => (x ? i : -1)).filter(i => i >= 0).join(), '4', 'a nota caiu em outro lutador');
    const odds = semComentario(fonte('../app/modules/odds.mjs'));
    ok(/const notas = notasDaLinha\(S\.fighters\)/.test(odds), 'a lista não pede as notas');
    ok(/notas\.legenda \? `<p class="histLeg tiny">\$\{notas\.legenda\}<\/p>`/.test(odds), 'a lista não pinta a legenda');
    ok(/31,\d mil rodadas ou mais/.test(notas.legenda), `a rodada não trouxe a legenda com o n: ${notas.legenda}`);
    ok(/<span class="n">\$\{f\.n\}\$\{notas\[o\.idx\] \? `<i class="hist" title="\$\{notas\[o\.idx\]\.titulo\}">\$\{notas\[o\.idx\]\.texto\}<\/i>`/.test(odds),
      'a lista não pinta o texto da nota como veio');
    ok(/\nusarNotasDaLinha\(lutadores => notasDaRodada\(lutadores\)\);/.test(fonte('../app/index.html')),
      'o app não liga a nota ao painel');
  });

  return s;
}
