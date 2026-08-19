/* Q1/Q3 · ESTADO COMPARTILHADO — a fronteira é explícita e curta.
 *
 * O F0.3a moveu para `S` as 19 variáveis mutáveis que eram escritas de mais de
 * uma parte do script. Em módulos ES não se atribui a um binding importado,
 * então cada uma delas bloquearia a separação.
 *
 * O valor não é o objeto, é a LISTA. Se ela crescer sem justificativa, a
 * fronteira entre módulos está errada e o teste é onde isso aparece.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';
import { S } from '../app/modules/estado.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/* A lista é fechada de propósito. Acrescentar exige mexer aqui, e mexer aqui
   exige responder: quem escreve, quando, e o que mais depende disso. */
const ESPERADO = [
  /* F0.5: a árvore de sementes, num campo só. Justificativa no próprio
     estado.mjs — reatribuída por rodada, lida por precificação, montagem e
     batalha. */
  'seeds','passivo','commit','segredoRodada','reveal',
  'state','clock','battleT','fighters','odds','battle','evPtr','champ','weather','released',
  'shake','ents',
  'carteira','chipVal','myBet',
  'auto','speed','musicVol','profile',
];

export function suite() {
  const s = criarSuite('estado');

  s.teste('S contém exatamente a superfície declarada', () => {
    const tem = Object.keys(S).sort(), quer = [...ESPERADO].sort();
    const sobra = tem.filter(k => !quer.includes(k));
    const falta = quer.filter(k => !tem.includes(k));
    ok(sobra.length === 0, `S ganhou campo não declarado: ${sobra.join(', ')}. ` +
       `Se é estado que cruza fronteira, declare em ESPERADO e justifique; se não é, ele é local do módulo.`);
    ok(falta.length === 0, `S perdeu campo declarado: ${falta.join(', ')}`);
  });

  s.teste('o app não redeclara nenhum campo de S como variável de topo', () => {
    for (const nome of ESPERADO) {
      const re = new RegExp(`^\\s*(?:let|var|const)\\s+${nome}\\b`, 'm');
      ok(!re.test(APP), `${nome} voltou a ser variável de topo no app — a separação quebra de novo`);
    }
  });

  s.teste('o app importa o estado do módulo', () => {
    ok(/import\s*\{\s*S\s*\}\s*from\s*['"]\.\/modules\/estado\.mjs['"]/.test(APP),
      'o app não importa S de ./modules/estado.mjs');
  });

  s.teste('estado.mjs guarda só valores inertes', () => {
    const mod = readFileSync(new URL('../app/modules/estado.mjs', import.meta.url), 'utf8');
    for (const proibido of ['document', 'window', 'localStorage', 'require(', 'import ']) {
      ok(!mod.includes(proibido),
        `estado.mjs referencia ${proibido} — deixa de ser inerte e passa a impor ordem de carga`);
    }
    ok(S.carteira === null && S.profile === null && S.seeds === null && S.passivo === null
       && S.commit === null && S.segredoRodada === null && S.reveal === null,
      'campos que dependem de função precisam nascer inertes e ser preenchidos no boot');
  });

  s.teste('a superfície compartilhada não cresceu', () => {
    /* O teto ficou em 20 no F0.5 — `seeds` entrou e `moveRng` saiu — e subiu
       para 21 no F0.8, com `passivo`. A entrada é obrigatória e não tinha como
       ficar local: a aposta ESCREVE o passivo e a interface LÊ, duas fronteiras
       diferentes, e em módulo ES não se atribui a binding importado. Subir o
       teto é decisão, e ela fica escrita aqui.

       Subiu de novo no F0.10, para 23: `commit` e `segredoRodada`, exigidos
       pelo §4.5. São dois campos e não um porque a separação É a garantia — o
       que se publica antes da aposta não pode carregar o que o reveal traz. */
    ok(ESPERADO.length <= 24,
      `a superfície tem ${ESPERADO.length} campos. Cada entrada precisa ser REATRIBUÍDA por ` +
      `mais de um módulo — mutação de conteúdo (push num array const) atravessa binding ` +
      `importado e não justifica entrar aqui.`);
  });

  return s;
}
