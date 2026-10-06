/* O 8º RELATO, O QUE NÃO ERA O CHEFE (ST-2.37).
 *
 * O chefe-paredão foi a ST-2.35 (`dano-time`). Ficaram três coisas de tela:
 *
 *   "em 432 px, a barra de baixo cobre o fim da página"              (D-171)
 *   "os cards do time ficam apagados depois de uma run, mesmo com
 *    37 de stamina — e uma run custa 23"                             (D-172)
 *   "não consegui ver o número da versão na tela"
 *
 * A primeira é CSS e se confere a regra; a segunda é uma decisão e mora em
 * camada 0; a terceira é a marca do código que o servidor já mandava em todo
 * pedido (`x-build`) e a tela nunca mostrou.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { staminaParaSair } from '../app/modules/volta-dados.mjs';
import { criarApi } from '../app/modules/api.mjs';
import { STAMINA_DO_AVANCO } from '../engine/avanco.mjs';
import { PERFIS } from '../engine/expedicao.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('relato8');

  s.teste('D-172: com 37 de stamina o cartão sai — o Avanço custa 23, mesmo com a Trilha (45) escolhida', () => {
    igual(STAMINA_DO_AVANCO, 23, 'o custo da run mudou — reveja o relato');
    igual(staminaParaSair('trilha'), 23, 'o cartão ainda compara com a Trilha');
    ok(37 >= staminaParaSair('trilha'), 'com 37 o cartão segue apagado');
    for (const [p, { custo }] of Object.entries(PERFIS))
      igual(staminaParaSair(p), Math.min(custo, STAMINA_DO_AVANCO), `${p}: o cartão não apaga só quando não sai por nenhum dos dois`);
    igual(staminaParaSair('nenhum'), STAMINA_DO_AVANCO, 'perfil desconhecido apagou o cartão de vez');
  });

  s.teste('D-172: a tela do cartão usa a regra, e a expedição segue recusando no botão dela', () => {
    const tela = fonte('../app/modules/idle-equipe.mjs');
    ok(/const pode = st >= staminaParaSair\(perfil\) && !fora;/.test(tela), 'o cartão ainda compara a stamina com a expedição escolhida');
    ok(!/const pode = st >= custo/.test(tela), 'sobrou a comparação velha');
  });

  s.teste('D-171: no celular, o body cresce com o conteúdo — a folga da barra cai no fim da página, e não no fim da tela', () => {
    const css = fonte('../app/index.html');
    /* a regra mora no @media do celular que abre a folga da barra */
    const i = css.indexOf('o rodapé da página abre espaço para a barra');
    ok(i > 0 && css.lastIndexOf('@media (max-width:640px){', i) > css.lastIndexOf('}\n}', i), 'a folga da barra saiu do @media do celular');
    const bloco = css.slice(i, i + 900);
    ok(/body\{padding:10px 10px calc\(84px \+ env\(safe-area-inset-bottom\)\);height:auto;min-height:100%\}/.test(bloco),
      'o body do celular ficou do tamanho da tela, e o fim do conteúdo passa sob a barra');
  });

  s.teste('a versão do código aparece na tela: no topo, e no "Mais" do celular', () => {
    const html = fonte('../app/index.html');
    ok(/<small class="versaoApp" id="marcaVersao"><\/small>/.test(html), 'o topo não tem onde mostrar a versão');
    ok(/<small class="versaoApp navVersao"><\/small>\s*<\/div>\s*<\/nav>/.test(html), 'a folha do "Mais" não mostra a versão — no celular o topo a esconde');
    ok(/api\.get\('\/saude'\)\.then\(\(\) => pintarVersao\(api\.versaoVista\(\)\)\)/.test(html), 'a tela não pinta a versão depois do primeiro pedido');
    ok(/el\.textContent = `versão \$\{String\(b\)\.slice\(0, 12\)\}`/.test(html), 'a versão não é escrita');
    /* a captura (Q5): solta, ela entrava na barra do desktop entre as abas e
       dobrava a barra do visitante no celular — só a folha aberta a mostra */
    ok(/\.navVersao\{display:none;/.test(html), 'a versão da folha aparece fora dela');
    ok(/\.mainnav\.mais:not\(\.visitante\) \.navVersao\{display:block/.test(html), 'a folha aberta não mostra a versão');
  });

  s.teste('a api guarda a primeira marca do código que viu, e a entrega', async () => {
    const velho = globalThis.fetch;
    globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json', 'x-build': '60f19c00c15b' } });
    try {
      const api = criarApi({ armazem: null });
      igual(api.versaoVista(), null, 'versão antes de qualquer pedido');
      await api.get('/saude');
      igual(api.versaoVista(), '60f19c00c15b', 'a api não entrega a marca vista');
    } finally { globalThis.fetch = velho; }
  });

  return s;
}
