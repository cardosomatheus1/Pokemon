/* Q1/Q6 · PAINEL DE ADM — UM caminho, e ele é o do servidor (R9).
 *
 * ── O QUE MUDOU, E POR QUE ────────────────────────────────────────────────
 *
 * Havia DOIS caminhos para a mesma capacidade:
 *
 *   o antigo    `#adm` no endereço + um PIN de quatro dígitos que o próprio
 *               código declarava não proteger nada, abrindo um painel LOCAL
 *               que escrevia a margem em `localStorage` — e a margem é o preço
 *               que o jogador vê;
 *   o novo      `/api/admin/*` no servidor, com senha, segundo fator, papel
 *               por ação e registro de auditoria (F1.11 e F1.17).
 *
 * Dois caminhos para a mesma porta é o desenho em que **o mais fraco decide**.
 * O aviso que ficava na própria tela do painel já dizia isto com todas as
 * letras — "quando existir servidor, isto precisa virar rota autenticada de
 * verdade, com autorização por papel e registro de operador (F1.11)". O
 * servidor existe. Este bloco fecha o pendente.
 *
 * ── AS TRÊS AUSÊNCIAS QUE ESTE ARQUIVO GUARDA ─────────────────────────────
 *
 * Garantia de segurança se prova por ausência, e ausência não tem quem a
 * defenda: ninguém sente falta de uma função que não existe. Por isso os três
 * testes centrais aqui cobram que **não exista**:
 *
 *   · nenhum PIN em lugar nenhum do app;
 *   · nenhum caminho que abra o painel sem passar pelo servidor;
 *   · nenhuma escrita local da margem.
 *
 * ── O QUE NÃO FOI FEITO, E ESTÁ REGISTRADO ────────────────────────────────
 *
 * `margem.definir` existe no servidor como ação destrutiva, com papel exigido
 * e auditoria — e **não tem rota**. Ou seja: hoje ninguém define margem por
 * caminho nenhum, e a rodada usa a do motor. Isso é mais seguro do que era e
 * menos capaz do que será; ver `L-047`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { MARGEM_MAX, lerConf, margemDaRodada } from '../app/modules/adm-dados.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const DIR_MODULOS = new URL('../app/modules/', import.meta.url);
const ADM = readFileSync(new URL('adm.mjs', DIR_MODULOS), 'utf8');

/* Todo o código do app, para as perguntas de ausência. Uma ausência que só vale
   num arquivo não é uma ausência. */
const TODO_APP = readdirSync(DIR_MODULOS)
  .filter(f => f.endsWith('.mjs'))
  .map(f => readFileSync(new URL(f, DIR_MODULOS), 'utf8'))
  .join('\n') + '\n' + APP;

export function suite() {
  const s = criarSuite('adm');

  /* --- as três ausências ------------------------------------------------- */

  s.teste('não existe PIN em lugar nenhum do app', () => {
    ok(!/ADM_PIN/.test(TODO_APP),
      'o PIN do painel voltou — um segredo no código-fonte não é controle de acesso');
    ok(!/\b7777\b/.test(TODO_APP),
      'o valor do PIN antigo reapareceu no código');
  });

  /* O `#adm` no endereço não é o problema — endereço não protege nada e nunca
     protegeu. O problema era o que havia ATRÁS dele: um painel com capacidade
     real, destrancado por um segredo público. Agora atrás dele há um formulário
     que só o servidor pode aceitar. */
  s.teste('o endereço do painel abre o login do servidor, e não o painel', () => {
    ok(/admChecarHash/.test(ADM), 'o caminho de entrada do painel sumiu inteiro');
    const fn = ADM.match(/export function admChecarHash\(\)\{[\s\S]*?\n\}/);
    ok(fn, 'a `admChecarHash` mudou de forma — este teste precisa ser refeito');
    ok(!/admAbrir\(\)/.test(fn[0]),
      'o endereço volta a abrir o painel direto, sem passar pelo servidor');
    ok(/admLogin\(\)/.test(fn[0]),
      'o endereço não leva ao login de operador');
  });

  /* A ASSERÇÃO É SOBRE A ESCRITA, e não sobre a palavra.
     `margemConfigurada` também é o NOME DE UM CAMPO do registro de precificação
     que vem do motor (`S.odds.margemConfigurada`), e o painel continua tendo o
     direito de LER e mostrar esse número — é ele que torna a odd auditável.
     Proibir a palavra proibiria a leitura junto. O que não pode voltar é a
     função que decide a margem no cliente, e a gravação dela no navegador. */
  s.teste('o app não escreve mais a margem localmente', () => {
    ok(!/(export )?(const|function) margemConfigurada/.test(TODO_APP),
      'a margem local voltou: preço decidido no cliente, sem papel e sem auditoria');
    ok(!/CHAVE_ADM|'ar_adm'/.test(TODO_APP),
      'o painel voltou a gravar configuração no navegador');
    ok(!/setItem\([^)]*adm/i.test(TODO_APP),
      'alguém voltou a gravar configuração de ADM no armazenamento local');
  });

  /* --- e o caminho que ficou é mesmo o do servidor ----------------------- */

  /* A ASSERÇÃO É SOBRE O QUE VAI NO CORPO DA CHAMADA, e não sobre a palavra
     aparecer no arquivo. A primeira versão procurava `codigo` em qualquer
     lugar do `adm.mjs`, e o defeito plantado `S342` — que tira o segundo fator
     do corpo do POST — passou por ela: a palavra continua no
     `const codigo = await pedirTexto(...)` logo acima, e no comentário que
     explica por que ele existe.
     Terceira vez que esta lição aparece neste trabalho (S320, o catálogo do
     R10, e agora): **cobre a construção, nunca a palavra.** */
  s.teste('entrar no painel exige senha E segundo fator', () => {
    const chamada = ADM.match(/apiAdm\.post\('\/api\/admin\/entrar',\s*\{[^}]*\}/);
    ok(chamada, 'o login não fala com a rota de operador do servidor');
    for (const campo of ['email', 'senha', 'codigo'])
      ok(new RegExp(`\\b${campo}\\b`).test(chamada[0]),
        `o login não MANDA \`${campo}\` ao servidor: ${chamada[0]}`);
  });

  /* O token de operador abre o saldo de todo mundo. Guardá-lo em
     `localStorage` o deixaria legível por qualquer script da página e vivo
     depois de fechar a aba — a sessão do servidor já expira e gira sozinha, e
     persistir o token no cliente desfaria os dois. */
  s.teste('o token de operador não é guardado no navegador', () => {
    ok(!/localStorage[^\n]*admin|admin[^\n]*localStorage/i.test(ADM),
      'o token de operador foi parar no `localStorage`');
    /* A CHAMADA, e não a palavra. O defeito `S341` troca
       `criarApi({ armazem: null })` por `criarApi({})`, e a primeira versão
       deste teste procurava `armazem: null` no arquivo inteiro — o comentário
       logo acima, que explica por que ele é `null`, mantinha a asserção verde
       com o token indo para o `localStorage`. */
    ok(/criarApi\(\{\s*armazem:\s*null\s*\}\)/.test(ADM),
      'a sessão de operador não é criada como só-em-memória: o token vai para o navegador');
  });

  s.teste('o painel é desenhado com o que o servidor devolve', () => {
    ok(/\/api\/admin\/painel/.test(ADM),
      'o painel não consulta a rota do servidor — voltou a ser um painel local');
  });

  /* --- o que continua valendo do bloco anterior -------------------------- */

  s.teste('o painel não é alcançável pelo menu', () => {
    ok(!/data-view="viewAdm"/.test(APP),
      'o painel ganhou entrada no menu — ele não se anuncia');
  });

  /* O §25.1 não mudou, e o aviso na tela é parte da entrega — o que mudou é o
     que ele diz. Não pode mais dizer que não há servidor: há. */
  s.teste('o aviso da tela conta a verdade de hoje', () => {
    ok(/admAviso/.test(APP), 'o aviso sumiu do painel');
    ok(!/o PIN está no código-fonte/.test(APP),
      'o aviso ainda fala de um PIN que não existe mais — aviso desatualizado é pior que nenhum');
    ok(/§?\s*25\.1|checkpoint/i.test(APP),
      'o aviso deixou de amarrar o painel ao checkpoint do §25.1');
    /* R20 — a segunda desatualização, achada ao levantar o terreno. O R18 criou
       `POST /api/admin/margem`, o painel JÁ a usa em `pedirMargem()`, e o aviso
       continuou dizendo que ela não existe. Um aviso que subestima a própria
       tela é tão ruim quanto um que a superestima: ele ensina o operador a não
       acreditar no que está lendo. */
    ok(!/margem ainda não tem rota|não tem rota/i.test(APP),
      'o aviso diz que definir a margem não tem rota. O R18 criou a rota e o ' +
      'painel a usa — o aviso está desatualizado, e a regra deste teste é que ' +
      'aviso desatualizado é pior que nenhum.');
  });

  /* A margem continua sendo dado validado: o servidor a usará quando a rota
     existir, e o teto protege o preço em qualquer caminho. */
  s.teste('a configuração inválida cai no padrão, e nunca em preço absurdo', () => {
    igual(lerConf('lixo{{').margem, null, 'JSON quebrado não caiu no padrão');
    igual(lerConf('null').margem, null, 'null não caiu no padrão');
    igual(lerConf(JSON.stringify({ margem: -0.5 })).margem, null, 'margem negativa passou');
    igual(lerConf(JSON.stringify({ margem: MARGEM_MAX + 0.01 })).margem, null, 'margem acima do teto passou');
    igual(lerConf(JSON.stringify({ margem: '0.1' })).margem, null, 'margem em texto passou');
    igual(lerConf(JSON.stringify({ margem: 0.12 })).margem, 0.12, 'margem válida foi rejeitada');
  });

  s.teste('margem ausente e margem zero não se confundem', () => {
    igual(margemDaRodada({ margem: null }), undefined, 'ausente virou valor');
    igual(margemDaRodada({ margem: 0 }), 0, 'zero virou ausente');
    igual(margemDaRodada(null), undefined, 'conf ausente não devolveu undefined');
  });

  /* A margem em uso vai no registro de precificação do §4.4.5 e é a mesma que a
     tela mostra. Nenhum módulo pode contornar isso escrevendo na constante. */
  s.teste('nenhum módulo do app escreve em CONF.MARGIN', () => {
    ok(!/CONF\.MARGIN\s*=/.test(TODO_APP),
      'alguém escreve em CONF.MARGIN — a fixture mediria uma coisa e a rodada valeria outra');
  });

  /* ── R20 · O PAINEL DE POLÍTICA MONETÁRIA CHEGA À TELA ─────────────────
   *
   * Estes testes existem por causa do `D-028`, do R7, do R8 e do R13: quatro
   * vezes uma coisa foi construída, passou na suíte e não chegou à tela.
   *
   * O caso desta vez é o mais desconfortável dos cinco, porque o cálculo já
   * estava certo. `painelEconomico` computava faucets, sinks, circulação e
   * divergência desde o F1.11, e o cliente jogava tudo fora. A suíte inteira
   * ficava verde sobre uma tela que não mostrava nada disso.
   *
   * Por isso a cobrança aqui é em TRÊS PONTAS, e as três precisam existir: o
   * dado é buscado, o lugar de desenhá-lo existe no HTML, e o estilo alcança
   * esse lugar. Faltando qualquer uma, o resto não chega ao olho de ninguém. */

  s.teste('o painel DESENHA as séries que o servidor calcula', () => {
    /* Não basta o objeto chegar: as chaves precisam ser LIDAS. O F1.11 já
       mandava `faucets` e `divergencia` no corpo, e nenhuma das duas era
       tocada pelo cliente. */
    for (const chave of ['faucets', 'sinks', 'emCirculacao', 'divergencia']) {
      ok(new RegExp(`\\b${chave}\\b`).test(ADM),
        `o cliente nunca lê \`${chave}\`. O servidor calcula essa série a cada ` +
        `chamada e ela é descartada — que é exatamente o defeito que o R20 fecha.`);
    }
  });

  s.teste('as seções novas têm lugar no HTML e estilo que as alcance', () => {
    for (const id of ['admPolitica', 'admDistribuicao', 'admFavorecimento']) {
      ok(new RegExp(`id="${id}"`).test(APP), `o HTML não tem onde desenhar \`${id}\``);
      ok(new RegExp(`#${id}\\b`).test(ADM), `o cliente não escreve em \`${id}\``);
    }
    /* A pergunta do D-028, na letra: a classe existe no CSS? Seis classes sem
       CSS nenhum foi como aquele cartão ficou invisível passando na suíte. */
    for (const classe of ['g-barra', 'g-val', 'g-ref']) {
      ok(new RegExp(`\\.${classe}\\b`).test(APP),
        `\`.${classe}\` é usada no SVG e não existe no CSS — o gráfico sai sem cor nenhuma`);
    }
  });

  /* O PAINEL DE AUDITORIA NÃO PODE LER O AUDITADO.
     `admSaldos` mostrava `S.carteira`, que é estado do CLIENTE. O F1.16 tirou o
     cliente de ser fonte de dinheiro no caminho da aposta; aqui ele continuava
     sendo a fonte do que o operador lê para conferir se há divergência — o que
     torna a conferência circular. */
  s.teste('os saldos do painel vêm do servidor, e não do estado do cliente', () => {
    const bloco = ADM.slice(ADM.indexOf('function admSaldos'),
                            ADM.indexOf('function admMargem'));
    ok(bloco.length > 40, 'não achei o bloco de saldos para conferir');
    ok(!/S\.carteira/.test(bloco),
      'o painel de auditoria lê `S.carteira` — estado do cliente. A conferência ' +
      'de divergência entre ledger e cache fica circular: ele compara o servidor ' +
      'com um número que o próprio navegador pode ter inventado.');
  });

  /* A DIVERGÊNCIA PRECISA GRITAR. Zero é o esperado; qualquer outro valor é a
     pergunta mais importante da tela. Numa linha igual às outras, ela some. */
  /* A BUSCA PRECISA SER NO BLOCO CERTO. A primeira versão procurava `admAlerta`
     no arquivo inteiro — e a classe também é usada pelo alerta de
     favorecimento, então a sabotagem que a removia DA DIVERGÊNCIA continuava
     achando a palavra alguns blocos abaixo. Uma ausência que só vale num
     trecho tem que ser cobrada naquele trecho. */
  s.teste('a divergência tem destaque próprio, e não uma linha igual às outras', () => {
    const bloco = ADM.slice(ADM.indexOf('function admSaldos'),
                            ADM.indexOf('function admMargem'));
    ok(bloco.length > 40, 'não achei o bloco de saldos para conferir');
    ok(/admAlerta/.test(bloco),
      'a divergência é exibida sem destaque — o número certo que ninguém vê');
    ok(/\.admAlerta\b/.test(APP), '`.admAlerta` não existe no CSS: destaque sem cor não destaca');
  });

  return s;
}
