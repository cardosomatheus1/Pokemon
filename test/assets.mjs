/* Q1/Q2 · A CASCATA DE ASSET — e a regra que ela precisa obedecer.
 *
 * Do CLAUDE.md, e é lição registrada da v0.6.1:
 * **o resgate busca a MESMA coisa em outro endereço, nunca outra coisa.**
 *
 * Uma correção de sprites virou troca de fonte de arte e o jogo inteiro saiu
 * errado. O teste central deste arquivo transforma essa frase em asserção:
 * todos os candidatos de um asset precisam terminar no MESMO arquivo.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { candidatos, caminhoLocal, PASTA_LOCAL } from '../app/modules/assets.mjs';
import { PMD_BASE, PMD_ESPELHO } from '../app/modules/sprites-dados.mjs';
import { FX_BASE, FX_ESPELHO, MOVE_FX } from '../app/modules/efeitos-dados.mjs';
import { criarSuite, ok, igual } from './harness.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;

export function suite() {
  const s = criarSuite('assets');

  s.teste('a cópia local é o PRIMEIRO candidato', () => {
    const u = PMD_BASE + '0001/Walk-Anim.png';
    const lista = candidatos(u, PMD_ESPELHO + '0001/Walk-Anim.png');
    ok(lista[0].includes(PASTA_LOCAL),
      `o primeiro candidato é ${lista[0]}, e não a cópia local. Com a ordem ` +
      `invertida o jogo sai para a rede tendo o arquivo em disco — e não abre ` +
      `com egresso fechado.`);
    igual(lista[1], u, 'a origem não é o segundo candidato');
    ok(lista[2].includes('jsdelivr'), 'o espelho não é o último candidato');
  });

  /* A REGRA DA v0.6.1, COMO ASSERÇÃO. */
  s.teste('todo candidato aponta para o MESMO arquivo', () => {
    const pares = [
      ['0001/Walk-Anim.png', PMD_BASE, PMD_ESPELHO],
      ['0006/Attack-Anim.png', PMD_BASE, PMD_ESPELHO],
      ...Object.values(MOVE_FX).slice(0, 12).flatMap(fx =>
        ['cast', 'proj', 'beam', 'hit'].filter(k => fx[k]).map(k => [fx[k], FX_BASE, FX_ESPELHO])),
    ];
    for (const [caminho, base, espelho] of pares) {
      const lista = candidatos(base + caminho, espelho + caminho);
      const nomes = lista.map(u => u.split('/').slice(-2).join('/'));
      ok(new Set(nomes).size === 1,
        `os candidatos de ${caminho} terminam em arquivos diferentes: ${nomes.join(' | ')}. ` +
        `O resgate busca a MESMA coisa em outro endereço, nunca outra coisa — ` +
        `foi essa troca que custou três versões ao projeto na v0.6.1.`);
    }
  });

  s.teste('o caminho local é determinístico e sem host solto', () => {
    const p = caminhoLocal('https://raw.githubusercontent.com/a/b/c.png');
    igual(p, 'assets/raw_githubusercontent_com/a/b/c.png', 'o mapeamento mudou');
    igual(caminhoLocal('https://raw.githubusercontent.com/a/b/c.png'), p, 'não é determinístico');
    ok(!p.includes('//') && !p.includes(':'), `o caminho local tem lixo de URL: ${p}`);
  });

  s.teste('a arte não entra no versionamento', () => {
    const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
    ok(/^assets\/$/m.test(ignore),
      '`assets/` não está no .gitignore. É arte de terceiros — mesma razão pela ' +
      'qual o battle-theme.mp3 ficou de fora. O script baixa; o repositório não guarda.');
  });

  /* Se a cópia local existe, ela precisa cobrir o que o jogo pede. Cobertura
     parcial é pior que nenhuma: o jogo abre, e alguns golpes saem sem animação
     só quando a rede cai. */
  s.teste('a cópia local cobre as folhas de efeito', () => {
    if (!existsSync(RAIZ + PASTA_LOCAL)) return;   // sem assets, nada a cobrar
    const faltando = [];
    for (const fx of Object.values(MOVE_FX))
      for (const k of ['cast', 'proj', 'beam', 'hit'])
        if (fx[k] && !existsSync(RAIZ + caminhoLocal(FX_BASE + fx[k]))) faltando.push(fx[k]);
    ok(faltando.length === 0,
      `${faltando.length} folha(s) de efeito fora da cópia local, a começar por ` +
      `${faltando[0]}. Foi o portão de egresso fechado que revelou que elas existiam: ` +
      `70 requisições saíam para fora com todas as folhas de SPRITE já em disco.`);
  });

  return s;
}
