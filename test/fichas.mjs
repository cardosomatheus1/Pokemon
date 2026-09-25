/* GOV · AS FICHAS DE LACUNAS E DEFEITOS (ST-6.3).
 *
 * A Revisão 2.0 achou fichas "abertas" que estavam feitas e feitas que estavam
 * abertas, e a contagem do ROADMAP era um número que ninguém conseguia refazer
 * ("128 sem marca, 57 sem linha de Estado" — medido de novo em 25/09, eram 85).
 *
 *   > Número que ninguém consegue refazer não é medição: é opinião com
 *   > algarismos.
 *
 * Duas regras, e só duas — porque cada uma é binária e barata:
 *
 *   toda ficha da LACUNAS diz o ESTADO numa linha própria, no bloco de
 *   metadados dela (a primeira `**Estado:**` do corpo é a que vale)
 *   nenhum id aparece duas vezes (a L-098 e a L-119 apareciam)
 *
 * O que a linha diz não é conferido aqui: "aberta" ou "fechada em" é juízo, e
 * juízo se confere lendo o código — foi o que a ST-6.3 fez, ficha a ficha. */
import { readFileSync } from 'node:fs';
import { criarSuite, igual } from './harness.mjs';

const ler = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

export function fichas(texto, nivel, letra) {
  const re = new RegExp(`^${'#'.repeat(nivel)} (${letra}-\\d+)[^\\n]*$`, 'gm');
  const achadas = [...texto.matchAll(re)];
  return achadas.map((m, i) => {
    const fim = achadas[i + 1]?.index ?? texto.length;
    const corpo = texto.slice(m.index + m[0].length, fim);
    /* O CORPO VAI ATÉ A PRÓXIMA FICHA, e não um número de linhas: a primeira
       versão da ST-6.3 contou 14 linhas e, nas fichas curtas, leu o Estado da
       ficha seguinte como se fosse o dela. */
    return { id: m[1], titulo: m[0], corpo };
  });
}

/* A contagem que o ROADMAP cita, refeita: `node test/fichas.mjs`. */
export function contar() {
  const l = fichas(ler('docs/LACUNAS.md'), 3, 'L');
  const estado = f => (/\*\*Estado:\*\*\s*([^\n]*)/.exec(f.corpo)?.[1] ?? '');
  /* ✅ fechada · 🟡 parcial · o resto está aberto, com a nuance que a ficha
     escrever ("especificada", "decidida, falta construir", "bloqueada"…). */
  const fechadas = l.filter(f => /✅|obsolet/i.test(estado(f)));
  const parciais = l.filter(f => !fechadas.includes(f) && /🟡/.test(estado(f)));
  const abertas = l.filter(f => !fechadas.includes(f) && !parciais.includes(f));
  return { lacunas: l.length, fechadas: fechadas.length, parciais: parciais.length,
           abertas: abertas.length, ids: abertas.map(f => f.id) };
}

export function suite() {
  const s = criarSuite('fichas');

  s.teste('toda ficha da LACUNAS tem a linha de Estado', () => {
    const sem = fichas(ler('docs/LACUNAS.md'), 3, 'L')
      .filter(f => !/\*\*Estado:\*\*/.test(f.corpo)).map(f => f.id);
    igual(sem.join(', '), '',
      'ficha sem `**Estado:**` — aberta ou fechada, ela tem de dizer');
  });

  s.teste('nenhum id de LACUNAS ou DEFEITOS aparece duas vezes', () => {
    for (const [arq, nivel, letra] of [['docs/LACUNAS.md', 3, 'L'], ['docs/DEFEITOS.md', 2, 'D']]) {
      const ids = fichas(ler(arq), nivel, letra).map(f => f.id);
      const repetidos = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
      igual(repetidos.join(', '), '', `${arq}: o mesmo id em duas fichas — qual das duas o bloco dono fecha?`);
    }
  });

  return s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = contar();
  console.log(`LACUNAS: ${c.lacunas} fichas · ${c.fechadas} fechadas · ${c.parciais} parciais · ${c.abertas} abertas`);
}
