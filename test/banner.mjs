/* Q1 · BANNER DE BATALHA — catálogo de cosméticos, e o que a tela diz.
 *
 * O banner é vitrine, não regra: nada aqui muda preço, batalha ou saldo. O que
 * PODE estar errado, e errado em silêncio, é a ligação entre o que o jogador
 * escolheu e o que o CSS sabe desenhar.
 *
 * Cosmético escolhido sem classe correspondente não quebra o app — ele só não
 * aparece. O jogador salva "Chama", volta amanhã, e o nome dele está sem
 * efeito nenhum. É o modo de falha que nenhum teste de comportamento pega e
 * que o portão visual dilui, porque a diferença é um brilho num canto.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { BN_CENAS, BN_EFEITOS, cosmeticoValido } from '../app/modules/banner-dados.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('banner');

  s.teste('todo cenário do catálogo tem classe .cn- no CSS', () => {
    const semCSS = BN_CENAS.filter(c => !new RegExp(`^\\.cn-${c.id}[{:]`, 'm').test(APP));
    ok(semCSS.length === 0,
      `${semCSS.length} cenário(s) escolhíveis e sem desenho: ${semCSS.map(c => c.id).join(', ')}. ` +
      `O jogador salva e o banner fica sem cenário.`);
  });

  s.teste('todo efeito de nome do catálogo tem classe .ef- no CSS', () => {
    const semCSS = BN_EFEITOS.filter(e => !new RegExp(`^\\.ef-${e.id}[{:]`, 'm').test(APP));
    ok(semCSS.length === 0,
      `${semCSS.length} efeito(s) escolhíveis e sem desenho: ${semCSS.map(e => e.id).join(', ')}`);
  });

  /* O outro sentido: classe sem entrada no catálogo é CSS que ninguém alcança.
     Não quebra nada, e é exatamente por isso que fica lá para sempre. */
  s.teste('nenhuma classe .cn-/.ef- sobra sem entrada no catálogo', () => {
    const noCSS = new Set([...APP.matchAll(/^\.(cn|ef)-([a-z]+)[{:]/gm)].map(m => m[1] + ':' + m[2]));
    const noCat = new Set([...BN_CENAS.map(c => 'cn:' + c.id), ...BN_EFEITOS.map(e => 'ef:' + e.id)]);
    const orfas = [...noCSS].filter(k => !noCat.has(k));
    ok(orfas.length === 0, `CSS sem entrada no catálogo: ${orfas.join(', ')}`);
  });

  s.teste('os ids são únicos e todo cosmético tem nome', () => {
    igual(new Set(BN_CENAS.map(c => c.id)).size, BN_CENAS.length, 'cenário com id repetido');
    igual(new Set(BN_EFEITOS.map(e => e.id)).size, BN_EFEITOS.length, 'efeito com id repetido');
    for (const c of [...BN_CENAS, ...BN_EFEITOS]) ok(c.nm && c.nm.length, `cosmético ${c.id} sem nome`);
  });

  /* Mesma lição do tema (S70): valor guardado que não existe mais não pode
     deixar a tela sem pele. Perfil de uma versão antiga, `localStorage`
     adulterado ou cosmético retirado da lista caem todos aqui. */
  s.teste('cosmético desconhecido cai no padrão, não no vazio', () => {
    igual(cosmeticoValido('cena', 'nao-existe'), BN_CENAS[0].id, 'cenário inválido não caiu no padrão');
    igual(cosmeticoValido('efeito', ''), BN_EFEITOS[0].id, 'efeito vazio não caiu no padrão');
    igual(cosmeticoValido('cena', 'poente'), 'poente', 'cenário válido foi trocado');
    igual(cosmeticoValido('efeito', 'trovao'), 'trovao', 'efeito válido foi trocado');
  });

  s.teste('os quatro cenários neon do V1.13 continuam no catálogo', () => {
    /* Eles chegaram com a identidade visual; sumir daqui seria perder arte
       nossa que já está no repositório. */
    for (const id of ['cidade', 'portal', 'nucleo', 'grade'])
      ok(BN_CENAS.some(c => c.id === id), `o cenário neon ${id} sumiu do catálogo`);
  });

  return s;
}
