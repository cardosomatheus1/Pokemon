/* Q1/Q3 · O DOSSIÊ NA FICHA DA POKÉDEX (ST-9.3 · F3.10 · Spec §7.4, §7.12)
 *
 * A seção "Na Arena" abre até o degrau da escada: cada número com o seu n, a
 * seção trancada diz o que falta e não mostra nada do que esconde, e a
 * pré-evolução aponta para a forma que luta. E a escada é ALIMENTADA: a
 * rodada marca vista, a aposta e a Liga marcam encontrada.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import DOSSIE from '../content/dossie_pokemon_kanto_v1.mjs';
import { secoesDoDossie, N_MINIMO_CLIMA, veredito } from '../app/modules/dossie-ficha.mjs';
import { escadaDe, marcasVazias, marcarVistas, marcarEncontrada, dossieDoPack, DEGRAUS, LIBERA } from '../app/modules/pokedex-estado.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { linhaDe } from '../engine/evolucao.mjs';

const CHARIZARD = 6, CHARMANDER = 4;
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/* Todo número de porcentagem ou média numa linha aberta vem com "(N rodada(s))". */
const numeroSemN = l => /\d+%|\d,\d/.test(l) && !/\(\d[\d.]* rodadas?( — poucas)?\)/.test(l);

function ficha(degrau) {
  const e = VAZIO(), m = marcasVazias();
  if (DEGRAUS.indexOf(degrau) >= 1) marcarVistas(m, [CHARIZARD]);
  if (DEGRAUS.indexOf(degrau) >= 2) marcarEncontrada(m, CHARIZARD);
  if (DEGRAUS.indexOf(degrau) >= 3) e.criaturas.push({ id: 'c', dex: CHARIZARD });
  if (DEGRAUS.indexOf(degrau) >= 4) e.registro[CHARMANDER] = 9999;
  const escada = escadaDe(pack, e, CHARIZARD, m);
  igual(escada.degrau, degrau, `a montagem do teste não chegou em ${degrau}`);
  return secoesDoDossie({ dossie: DOSSIE, escada, dex: CHARIZARD, linha: linhaDe(pack, CHARIZARD), climas: pack.clima });
}

export function suite() {
  const s = criarSuite('dossie-ficha');

  s.teste('cada degrau abre exatamente o que a escada libera, e o resto fica trancado', () => {
    for (const degrau of DEGRAUS) {
      const d = ficha(degrau);
      ok(d.luta, 'o Charizard luta na Arena');
      const abertas = d.secoes.filter(x => !x.trancada).map(x => x.id).sort();
      const esperado = DEGRAUS.slice(1, DEGRAUS.indexOf(degrau) + 1).flatMap(g => LIBERA[g]).sort();
      igual(JSON.stringify(abertas), JSON.stringify(esperado), `${degrau}: seções abertas erradas`);
    }
  });

  s.teste('nenhum número sem n; o clima some abaixo do mínimo', () => {
    const d = ficha('dominada');
    for (const sec of d.secoes) for (const l of sec.linhas)
      ok(!numeroSemN(l), `${sec.id}: número sem n — "${l}"`);
    const v = d.secoes.find(x => x.id === 'vitoria').linhas[0];
    /* O veredito em palavra, com a régua ao lado (Q7). */
    ok(/— acima da média, que numa arena de 12 é 8%/.test(v), `a vitória não traz o veredito e a régua: ${v}`);
    ok(/primeiros a cair .* — (acima|abaixo) da média|na média, que é 25%/.test(d.secoes.find(x => x.id === 'caiCedo').linhas[0]), 'o cai cedo não traz a régua');
    igual(veredito(0.12, 0.0833), 'acima da média', 'veredito'); igual(veredito(0.085, 0.0833), 'na média', 'faixa da média');
    igual(veredito(0.3, 0.25, { maiorEhMelhor: false }), 'abaixo da média', 'cair cedo mais que a média é pior');
    const rival = d.secoes.find(x => x.id === 'rival').linhas.join(' ');
    ok(/— poucas\)/.test(rival), `o n pequeno do rival não está marcado: ${rival}`);
    ok(!/— poucas/.test(v), 'n grande marcado como pouco');
    ok(v.includes(`(${DOSSIE.especies[CHARIZARD].vitoria.n.toLocaleString('pt-BR')} rodadas)`), `a vitória não traz o n do dossiê: ${v}`);
    /* Um clima com n abaixo do mínimo não aparece — e nem um "0%" vazio. */
    const raso = { ...DOSSIE, especies: { [CHARIZARD]: { ...DOSSIE.especies[CHARIZARD],
      porClima: { sol: { n: N_MINIMO_CLIMA - 1, taxa: 0.9 }, chuva: { n: N_MINIMO_CLIMA, taxa: 0.1 } } } } };
    const escada = { degrau: 'capturada', liberado: [...LIBERA.vista, ...LIBERA.encontrada, ...LIBERA.capturada] };
    const clima = secoesDoDossie({ dossie: raso, escada, dex: CHARIZARD, climas: pack.clima }).secoes.find(x => x.id === 'porClima');
    const porClima = clima.linhas.filter(l => !/^▲ ▼/.test(l));
    igual(porClima.length, 1, 'o clima raso apareceu');
    ok(/Chuva/.test(porClima[0]) && !/90%/.test(clima.linhas.join()), `clima: ${clima.linhas.join(' | ')}`);
  });

  s.teste('a seção trancada diz o requisito e não vaza nenhum número', () => {
    const d = ficha('vista');
    for (const sec of d.secoes.filter(x => x.trancada)) {
      igual(sec.linhas, null, `${sec.id}: trancada com conteúdo`);
      ok(/^Para ver: /.test(sec.requisito), `${sec.id}: sem requisito escrito`);
      ok(!/\d/.test(sec.requisito), `${sec.id}: o requisito vaza um número — "${sec.requisito}"`);
    }
    /* Na tela, uma linha por degrau — nunca a mesma frase duas vezes. */
    igual(d.trancadas.map(t => t.degrau).join(), 'encontrada,capturada,dominada', 'trancadas fora da ordem da escada');
    igual(d.trancadas.flatMap(t => t.titulos).length, d.secoes.filter(x => x.trancada).length, 'uma trancada sumiu do agrupamento');
    igual(new Set(d.trancadas.map(t => t.requisito)).size, d.trancadas.length, 'o mesmo requisito repetido');
    const abates = d.secoes.find(x => x.id === 'abates');
    ok(/aposte/.test(abates.requisito), `abates não diz que falta apostar: ${abates.requisito}`);
    ok(/capture|evolua/.test(d.secoes.find(x => x.id === 'porClima').requisito), 'o clima não diz que falta ter');
  });

  s.teste('a pré-evolução não inventa dossiê: aponta para a forma que luta', () => {
    const d = secoesDoDossie({ dossie: DOSSIE, escada: { liberado: [] }, dex: CHARMANDER, linha: linhaDe(pack, CHARMANDER) });
    ok(!d.luta && d.secoes.length === 0, 'o Charmander ganhou dossiê');
    igual(JSON.stringify(d.formasQueLutam), `[${CHARIZARD}]`, 'não apontou para o Charizard');
    igual(dossieDoPack(pack), DOSSIE, 'o pack Kanto não achou o próprio dossiê');
    igual(dossieDoPack({ id: 'outro' }), null, 'pack sem dossiê inventou um');
  });

  s.teste('a escada é alimentada: a rodada marca vista, a aposta e a Liga marcam encontrada', () => {
    const fases = semComentario(fonte('../app/modules/fases.mjs'));
    igual((fases.match(/S\.fighters = sortearPool\(S\.seeds\.elenco\);\s*registrarVistas\(S\.fighters\.map\(f => f\.dex\)\)/g) ?? []).length, 2,
      'uma das duas rodadas (servidor e local) não marca as vistas');
    ok(/S\.myBet\?\.idx === idx[^\n]*registrarEncontrada\(S\.fighters\[idx\]\.dex\)/.test(semComentario(fonte('../app/modules/aposta.mjs'))),
      'a aposta não marca encontrada, ou marca sem conferir que a aposta ficou');
    ok(/Math\.max\(\.\.\.pesos\)[\s\S]{0,120}registrarEncontrada\(S\.fighters\[topo\]\.dex\)/.test(semComentario(fonte('../app/modules/liga-tela.mjs'))),
      'a Liga não marca encontrada a escolha de maior peso');
    const pdx = semComentario(fonte('../app/modules/pokedex.mjs'));
    ok(/vistosNaPokedex\(estado, marcas\)/.test(pdx) && /ficha\(alvoEsp, estado, marcas\)/.test(pdx),
      'a Pokédex não lê as marcas da Arena');
    /* A tela só pinta: nenhuma estatística do dossiê é lida ou refeita nela. */
    ok(!/\.taxa\b|\.vitorias?\b|\.contagem\b|\.porClima\b/.test(pdx), 'a Pokédex recalcula o dossiê por conta própria');
  });

  return s;
}
