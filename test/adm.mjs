/* Q1/Q6 · PAINEL DE ADM — o que ele pode mexer, e o que ele não pode esconder.
 *
 * Duas garantias, e as duas já existiam antes do painel:
 *
 *   §4.4.5  a margem em uso vai gravada no registro de precificação, e é a
 *           mesma que a tela mostra ao lado das odds. O painel pode MUDAR a
 *           margem; não pode criar uma odd secreta.
 *   §25.1   nada de valor econômico real sem o checkpoint. O painel é
 *           ferramenta de desenvolvimento, e o aviso disso é parte da entrega.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { ADM_PIN, MARGEM_MAX, lerConf, margemDaRodada } from '../app/modules/adm-dados.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const MODULOS = new URL('../app/modules/', import.meta.url);

export function suite() {
  const s = criarSuite('adm');

  /* Q6 · O AVISO É A ENTREGA. Um PIN no código-fonte não impede ninguém; o que
     ele não pode é passar por segurança. Este teste existe porque a tentação de
     "limpar" o aviso numa revisão de texto é real. */
  s.teste('o aviso de que o PIN não é controle de acesso está na tela', () => {
    ok(/Isto não é controle de acesso/i.test(APP),
      'o aviso sumiu do painel — PIN no código-fonte sem aviso é segurança de mentira');
    ok(/admAviso/.test(APP), 'o aviso perdeu a classe que o destaca em vermelho');
    ok(/sem servidor|no navegador/i.test(APP),
      'o aviso deixou de explicar POR QUE o PIN não protege');
  });

  s.teste('o painel não é alcançável pelo menu — só pelo endereço', () => {
    /* Nada no menu aponta para lá de propósito: quem chega ao painel chegou
       porque quis. Um botão no menu convidaria a mexer sem entender. */
    ok(!/data-view="viewAdm"/.test(APP),
      'o painel de ADM ganhou entrada no menu — ele abre por #adm e mais nada');
  });

  s.teste('a configuração inválida cai no padrão, e nunca em preço absurdo', () => {
    igual(lerConf('lixo{{').margem, null, 'JSON quebrado não caiu no padrão');
    igual(lerConf('null').margem, null, 'null não caiu no padrão');
    igual(lerConf(JSON.stringify({ margem: -0.5 })).margem, null, 'margem negativa passou');
    igual(lerConf(JSON.stringify({ margem: 2 })).margem, null, 'margem acima de 1 passou');
    igual(lerConf(JSON.stringify({ margem: MARGEM_MAX + 0.01 })).margem, null, 'margem acima do teto passou');
    igual(lerConf(JSON.stringify({ margem: '0.1' })).margem, null, 'margem em texto passou');
    igual(lerConf(JSON.stringify({ margem: 0.12 })).margem, 0.12, 'margem válida foi rejeitada');
    igual(lerConf(JSON.stringify({ margem: 0 })).margem, 0, 'margem zero foi confundida com ausente');
  });

  /* `null` e `0` são coisas diferentes: o primeiro é "use a do motor", o
     segundo é "casa sem margem". Confundi-los faria o painel zerar a margem
     sem ninguém pedir. */
  s.teste('margem ausente e margem zero não se confundem', () => {
    igual(margemDaRodada({ margem: null }), undefined, 'ausente virou valor');
    igual(margemDaRodada({ margem: 0 }), 0, 'zero virou ausente');
    igual(margemDaRodada(null), undefined, 'conf ausente não devolveu undefined');
  });

  /* O painel mexe em margem, e margem é preço. Se ele passar a escrever direto
     em `CONF`, a fixture `margem.json` mede uma coisa e a rodada vale outra —
     é o conflito C1 do porte, e ele foi resolvido tornando a margem parâmetro
     da rodada. Este teste impede a volta. */
  s.teste('nenhum módulo do app escreve em CONF.MARGIN', () => {
    for (const f of readdirSync(MODULOS).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, MODULOS), 'utf8');
      ok(!/CONF\.MARGIN\s*=/.test(txt),
        `${f} escreve em CONF.MARGIN. A margem é parâmetro da rodada desde o V1.15 — ` +
        `escrever na constante do motor faz a fixture margem.json medir outra coisa.`);
    }
    ok(!/CONF\.MARGIN\s*=/.test(APP), 'app/index.html escreve em CONF.MARGIN');
  });

  s.teste('o PIN é declarado num lugar só', () => {
    igual(typeof ADM_PIN, 'string', 'o PIN deixou de ser texto');
    const soltos = [...APP.matchAll(/['"]7777['"]/g)].length;
    igual(soltos, 0, `o PIN aparece ${soltos}x solto no HTML — ele é do módulo, não da página`);
  });

  return s;
}
