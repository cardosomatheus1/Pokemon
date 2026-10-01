/* Q1 · OS TEXTOS DIZEM A MESMA COISA QUE O SITE FAZ (ST-2.19c)
 *
 * Um jogador, no primeiro teste: "os textos se contradizem sobre a conta. O
 * cadastro diz que a conta fica salva no servidor, mas a página de Regras diz
 * que o treinador fica só no navegador, sem servidor nem e-mail. A página
 * inicial também fala 'Nada de e-mail', mas o formulário pede um." E: falta
 * espaço em "Aposte na arena.Assista à batalha.", "A rota escolha o lugar
 * antes de gastar as horas" é frase estranha, e o português se mistura com
 * inglês ("Market", "Trainer OFF").
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { textoDoModoDaConta } from '../app/modules/conta-real.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const texto = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

export function suite() {
  const s = criarSuite('textos-site');
  const html = semComentario(fonte('../app/index.html'));

  s.teste('a regra da conta diz o que o site faz: conta no servidor, com e-mail', () => {
    const regra = /<h4>10\. Conta e dados<\/h4>\s*<p>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    ok(regra, 'a regra 10 sumiu');
    ok(!/Não há\s+servidor/.test(regra) && !/não há e-mail/i.test(regra), `a regra 10 ainda diz que não há servidor nem e-mail: ${texto(regra)}`);
    ok(/servidor/.test(regra) && /e-mail/.test(regra) && /senha/.test(regra), 'a regra 10 não diz onde a conta fica');
    ok(/navegador/.test(regra), 'a regra 10 não diz o que vale sem servidor (o jogo rodando no próprio computador)');
  });

  s.teste('o convite da Início não promete "nada de e-mail" a quem vai digitar um', () => {
    ok(!/Nada de e-mail/i.test(html), 'a Início ainda diz "Nada de e-mail"');
    const cta = /<section class="cta">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
    ok(/e-mail/.test(cta) && /senha/.test(cta), `o convite não diz o que o cadastro pede: ${texto(cta)}`);
  });

  s.teste('o formulário nasce com o texto do site, e não com o do teste local', () => {
    const info = /<div class="tiny" id="authInfo"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    igual(texto(info).trim(), textoDoModoDaConta({ real: true }), 'o aviso inicial do cadastro');
  });

  s.teste('ponto antes de quebra de linha tem espaço (o texto lido não emenda as frases)', () => {
    const emendas = [...html.matchAll(/[.!?]<br\s*\/?>/g)].map(m => html.slice(Math.max(0, m.index - 30), m.index + 12));
    igual(emendas.length, 0, `frase emendada: ${emendas[0]}`);
  });

  s.teste('a frase da rota lê inteira, e o título e o subtítulo não emendam em frase quebrada', () => {
    ok(!/escolha o lugar antes de gastar as horas/.test(html), 'a frase estranha da rota voltou');
    const h3 = /<h3>A rota <span class="tiny">([^<]+)<\/span><\/h3>/.exec(html)?.[1];
    ok(h3 && /^onde/.test(h3), `"A rota" + subtítulo não lê como uma frase: "A rota ${h3}"`);
  });

  s.teste('a interface fala português: Mercado, e não Market; Treino OFF, e não Trainer OFF', () => {
    ok(!/>\s*Market\s*</.test(html) && !/Trainer OFF/.test(html), 'a página ainda mostra "Market" ou "Trainer OFF"');
    for (const f of ['mercado-jogadores-dados.mjs', 'mercado-jogadores-tela.mjs', 'prende-dados.mjs']) {
      const t = semComentario(fonte(`../app/modules/${f}`)).replace(/\/\/.*$/gm, '');
      const visiveis = [...t.matchAll(/(['`])((?:(?!\1).)*)\1/g)].map(m => m[2]).filter(x => /\bMarket\b/.test(x));
      igual(visiveis.length, 0, `${f}: texto da tela com "Market": ${visiveis[0]}`);
    }
  });

  return s;
}
