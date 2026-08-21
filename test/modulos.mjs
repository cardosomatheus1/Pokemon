/* Q1/Q3 · GRAFO DE MÓDULOS — fronteiras explícitas e numa direção só.
 *
 * O F0.3 separa a interface em módulos. Dois modos de falha justificam um teste
 * em vez de disciplina: um módulo que volta a crescer sem limite, e uma
 * dependência que aponta para o lado errado — apresentação puxando rodada, ou
 * qualquer coisa puxando o motor de volta para a UI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const DIR = new URL('../app/modules/', import.meta.url);
const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const LIMITE = 600;

/* Camadas, da base para o topo. Um módulo importa da mesma camada ou de uma
   anterior, nunca de uma posterior.

   A camada 4 é a aplicação, e ali os módulos se importam entre si de
   propósito: fases chama carteira, carteira abre modal de navegação,
   navegação lê perfil. Isso é acoplamento real do produto, não bagunça — o
   que NÃO pode é infraestrutura (0 a 3) depender de aplicação. É essa a
   inversão que o teste procura. */
const CAMADA = {
  /* A ligação com o motor é a base de tudo: ela instancia o ContentPack e
     nenhum módulo do app pode ficar abaixo dela. Não importa nada de ./ — só
     do motor e do pack, que vivem fora desta pasta. */
  'motor.mjs': 0,
  /* Fluxo visual da rodada. Depende só da ligação do motor e da árvore de
     sementes, então mora na base junto com ela. */
  'sorte.mjs': 0,
  /* Fachada da carteira: só depende do estado e do motor de carteira. */
  'banco.mjs': 0,
  'dom.mjs': 0,
  /* O número de simulações, lido do motor e escrito nos marcadores da página.
     Camada 0 porque só depende de `motor.mjs`: quem precisa dele é o boot, e o
     boot é a primeira coisa que roda. Ver o D-011. */
  'sims.mjs': 0,
  'estado.mjs': 0,
  /* F1.13. `api.mjs` é a única porta do app para o servidor: monta requisição,
     declara a versão do contrato e devolve `{ok, corpo}`. Camada 0 porque não
     depende de módulo nenhum do app — só do `contrato.mjs`, que vive fora desta
     pasta, do mesmo jeito que `motor.mjs` só depende do motor.

     Ele NÃO decide regra nenhuma, e a camada é o que sustenta isso: se um dia
     ele precisar importar `banco.mjs` ou `estado.mjs` para "resolver" alguma
     coisa, o teste de camadas reprova — e a reprovação é a pergunta certa.
     Regra que migra para o cliente é regra que o jogador controla. */
  'api.mjs': 0,
  /* O fluxo da sala: `fetch` e `ReadableStream`, e mais nada. Não conhece
     rodada, aposta nem saldo — entrega evento e diz em que estado está a
     conexão. Camada 0 porque quem interpreta o evento é quem escuta, e um
     transporte que soubesse o que transporta seria o lugar errado para a
     regra. */
  'sala.mjs': 0,
  /* O texto da conexão: puro, e importa só os NOMES dos estados da sala. Fica
     na camada 0 junto com ela — o §5.9 exige coisas sobre texto, e texto se
     confere sem abrir navegador. Mesma razão do `protecao-texto.mjs`. */
  'conexao-texto.mjs': 0,
  /* O modo servidor: importa a sala (camada 0) e mais nada do app. Não desenha,
     não decide regra, não conhece DOM — traduz o que a sala entrega e guarda a
     última rodada. Camada 0 porque quem interpreta é quem escuta. */
  'modo-servidor.mjs': 0,
  /* Rótulos e a frase da recusa do §28.3. Puro: nada de DOM, nada de rede.
     Separado da tela porque o §28.3 exige coisas sobre TEXTO, e texto se
     confere sem abrir navegador. */
  'protecao-texto.mjs': 0,
  /* Dados puros de arte e a cascata de endereço: nenhum dos dois toca o DOM. */
  'sprites-dados.mjs': 0,
  'assets.mjs': 0,
  'efeitos-dados.mjs': 0,
  'telemetria.mjs': 0,
  /* Curva de nível: aritmética pura, sem import nenhum. */
  'progressao.mjs': 0,
  /* Tema: mexe no <html> e no localStorage, não depende de módulo nenhum. */
  'tema.mjs': 0,
  /* Aritmética das posições: pura, sem DOM. Quem desenha é o killfeed, que já
     é dono do placar da rodada — a ordem de quedas precisa vir do MESMO gancho
     que credita o abate. */
  'colocacao.mjs': 0,
  /* Catálogo de cosméticos do banner: dez cenários e oito efeitos, todos
     gradiente e sombra. Dado puro, sem DOM. */
  'banner-dados.mjs': 0,
  /* Os 24 modelos de pokébola e o sorteio da rodada: dado e aritmética, sem
     canvas. Quem pinta é o render. */
  'bolas-dados.mjs': 0,
  /* Catálogo de avatares de treinador. Puro porque o baixador de assets, que
     roda no Node, precisa saber o que baixar — ver o vazamento que o portão de
     egresso fechado pegou no V1.15. */
  'avatares-dados.mjs': 0,
  /* Estado dos cosméticos shiny e a regra de desbloqueio. Puro: recebe o
     perfil e responde, sem importar de onde ele veio. Fica na base porque
     `sprites.mjs` (camada 1) precisa do caminho do recolor. */
  'shiny-dados.mjs': 0,
  /* Configuração do painel e a validação da margem. Puro; a tela é adm.mjs. */
  'adm-dados.mjs': 0,
  /* Catálogo de arenas: escolhe a arena da rodada a partir da árvore de
     sementes. Não desenha e não toca o DOM, então mora na base — é o que
     permite testá-lo no Node. */
  'arenas-dados.mjs': 0,
  'sprites.mjs': 1,
  'audio.mjs': 1,
  'render.mjs': 2,
  'efeitos.mjs': 2,
  'clima.mjs': 2,
  'odds.mjs': 2,
  'killfeed.mjs': 2,
  /* O cartão do seu lutador durante a luta. Lê estado, colocação e sprites e
     devolve HTML — nada acima da camada 1. Fica em 2 e não em 4 porque
     `eventos.mjs` (3) o redesenha a cada evento do replay, e a dependência
     precisa apontar para baixo. */
  'meu-lutador.mjs': 2,
  /* Pintura das arenas: usa a geometria do render para desenhar, então fica
     ACIMA dele. A direção importa — o render recebe o cenário por injeção e
     não importa o catálogo, senão os dois se fechariam num ciclo. */
  'arenas.mjs': 3,
  'rodada.mjs': 3,
  'coreografia.mjs': 3,
  'eventos.mjs': 3,
  'perfil.mjs': 4,
  'desafios.mjs': 4,
  'medalhas.mjs': 4,
  'customizacao.mjs': 4,
  'carteira.mjs': 4,
  /* A tela de limites e pausa (§28.7). Camada 4 — aplicação — porque desenha,
     ouve clique e fala com o servidor. Nenhuma regra de proteção mora nela: a
     assimetria, o cooldown e a irreversibilidade são do servidor, e a tela só
     as EXPLICA antes do clique. Um limite que valesse aqui sumiria quando o
     jogador abrisse outra aba. */
  'protecao-tela.mjs': 4,
  /* A faixa de conexão do §5.9: lê o texto do módulo puro e pinta no `body`.
     Mesma camada da tela de proteção — toca DOM, não decide nada. */
  'conexao-tela.mjs': 4,
  /* A tela de resultado: saiu do `fases.mjs` no F1.14. O `fases` decide QUANDO
     cada coisa acontece; isto decide COMO o fim da rodada aparece. Camada 5,
     acima do `fases` — ele é quem ela consulta, não o contrário. */
  'resultado-tela.mjs': 5,
  'navegacao.mjs': 4,
  'controles.mjs': 4,
  /* A aposta saiu de `fases.mjs` no V1.15: as fases são a máquina de estados
     da rodada, a aposta é onde o dinheiro do jogador encontra o teto do §4.4.6.
     Mesma camada — `fases` chama `aposta`, nunca o contrário. */
  /* Vitrine da rodada: lê perfil e estado, devolve HTML. Não decide nada. */
  /* A faixa de estado: lê fase, relógio e perfil e escreve no topo da tela.
     Não decide nada da rodada. */
  'faixa.mjs': 4,
  'banner.mjs': 4,
  /* Painel de ADM: lê tudo e escreve na configuração dele. Camada mais alta,
     porque toca perfil, carteira, telemetria e navegação. */
  'adm.mjs': 4,
  'aposta.mjs': 4,
  'fases.mjs': 4,
  'loop.mjs': 5,
};

function importsDe(txt) {
  return [...txt.matchAll(/from\s+['"]\.\/([\w.-]+\.mjs)['"]/g)].map(m => m[1]);
}

/* Remove strings, comentários e template literals, para que a varredura de
   símbolos não confunda texto com código. Exportado desde o F0.10: a varredura
   de dinheiro em test/carteira.mjs precisa da mesma máscara, e duas
   implementações da mesma coisa divergem. */
export function semTexto(src) {
  const out = [...src]; const n = src.length; let k = 0;
  while (k < n) {
    const c = src[k], nx = src[k + 1] ?? '';
    if (c === '/' && nx === '/')      { while (k < n && src[k] !== '\n') out[k++] = ' '; }
    else if (c === '/' && nx === '*') { while (k < n && !(src[k] === '*' && src[k+1] === '/')) out[k++] = ' '; out[k]=' '; out[k+1]=' '; k += 2; }
    else if (c === '"' || c === "'" || c === '`') {
      const q = c; out[k++] = ' ';
      while (k < n && src[k] !== q) { if (src[k] === '\\') out[k++] = ' '; if (k < n) out[k++] = ' '; }
      if (k < n) out[k++] = ' ';
    } else k++;
  }
  return out.join('');
}

const nomesImportados = txt =>
  new Set([...txt.matchAll(/import\s*\{([^}]*)\}/g)]
    .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)));

const declaradosNoTopo = txt =>
  new Set([...txt.matchAll(/^\s*(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));

/* Parâmetros também são nomes locais. Sem isso, um parâmetro chamado `frame`
   parece uso do `frame` exportado por loop.mjs — foi o terceiro falso positivo
   desta varredura, depois de chave de objeto e artefato de mascaramento.
   A lição é que varredura por texto tem teto; quem pega de verdade é o portão
   de navegador. Esta continua como rede barata e rápida. */
const nomesDeParametro = txt => {
  const out = new Set();
  const listas = [
    ...[...txt.matchAll(/function\s*[\w$]*\s*\(([^)]*)\)/g)].map(m => m[1]),
    ...[...txt.matchAll(/\(([^)]*)\)\s*=>/g)].map(m => m[1]),
    ...[...txt.matchAll(/(?:^|[\s(,])([A-Za-z_$][\w$]*)\s*=>/g)].map(m => m[1]),
  ];
  for (const l of listas)
    for (const n of l.split(',').map(x => x.trim().split(/[=:\s]/)[0]).filter(Boolean))
      if (/^[A-Za-z_$][\w$]*$/.test(n)) out.add(n);
  return out;
};

export function suite() {
  const s = criarSuite('modulos');
  const arquivos = readdirSync(DIR).filter(f => f.endsWith('.mjs'));
  const fonte = Object.fromEntries(arquivos.map(f => [f, readFileSync(new URL(f, DIR), 'utf8')]));

  s.teste(`nenhum módulo passa de ${LIMITE} linhas`, () => {
    for (const [f, txt] of Object.entries(fonte)) {
      const n = txt.split('\n').length;
      ok(n <= LIMITE, `${f} tem ${n} linhas. Passou do limite — dividir por responsabilidade, não por tamanho.`);
    }
  });

  s.teste('todo módulo está na tabela de camadas', () => {
    for (const f of arquivos)
      ok(f in CAMADA, `${f} não tem camada declarada. Módulo novo exige decidir onde ele entra no grafo.`);
  });

  s.teste('dependências apontam numa direção só', () => {
    for (const [f, txt] of Object.entries(fonte)) {
      for (const alvo of importsDe(txt)) {
        ok(alvo in CAMADA, `${f} importa ${alvo}, que não está na tabela de camadas`);
        ok(CAMADA[alvo] <= CAMADA[f],
          `${f} (camada ${CAMADA[f]}) importa ${alvo} (camada ${CAMADA[alvo]}) — dependência invertida`);
      }
    }
  });

  s.teste('nenhum módulo importa de volta o app', () => {
    for (const [f, txt] of Object.entries(fonte))
      ok(!/from\s+['"][^'"]*index\.html/.test(txt) && !/\.\.\/index/.test(txt),
        `${f} importa do app — a interface não pode ser dependência dos módulos`);
  });

  s.teste('nenhum módulo redeclara símbolo do motor', () => {
    const doMotor = ['CONF','rng','statAt','stormRate','efetividade','simular',
                     'montarElenco','dano','sortearPool','efeito','atribuirGolpes',
                     'derivar','sementes','novaRaiz','precificar','simularLote'];
    for (const [f, txt] of Object.entries(fonte))
      for (const nome of doMotor)
        ok(!new RegExp(`^\\s*(?:const|let|var|function)\\s+${nome}\\b`, 'm').test(txt),
          `${f} redeclara ${nome}, que é do motor`);
  });

  /* Este é o teste que faltava no F0.3b e que custou três erros de import em
     sequência: rng, o endereço de sprite e o par $/log. Ele não é um verificador de
     escopo completo — checa apenas SÍMBOLOS CONHECIDOS, os que algum módulo do
     projeto exporta. É exatamente a classe de erro que a extração produz. */
  s.teste('nenhum módulo usa símbolo conhecido sem importar', () => {
    const motor = readFileSync(new URL('../engine/engine.mjs', import.meta.url), 'utf8');
    /* O dono de um símbolo é quem o EXPORTA. Ler declarações não serve: a
       varredura por linha não distingue topo de corpo de função, e uma
       variável local do motor viraria "símbolo conhecido" por engano. */
    const exportados = txt => (txt.split('export {')[1] ?? '').split('}')[0]
      .split(',').map(x => x.trim()).filter(Boolean);
    const dono = new Map();
    for (const n of exportados(motor)) dono.set(n, 'engine');
    for (const [f, txt] of Object.entries(fonte))
      for (const m of (txt.split('export {')[1] ?? '').split('}')[0].split(','))
        { const n = m.trim(); if (n) dono.set(n, f); }

    const alvos = [...Object.entries(fonte), ['app/index.html', APP]];
    for (const [f, txt] of alvos) {
      const codigo = semTexto(txt);
      const local = new Set([...declaradosNoTopo(txt), ...nomesImportados(txt), ...nomesDeParametro(txt)]);
      const faltando = new Set();
      for (const [nome, quem] of dono) {
        if (quem === f || local.has(nome)) continue;
        /* Duas condições, e a segunda existe porque `semTexto` não entende
           literal de expressão regular e pode inventar uma ocorrência ao
           mascarar. Exigir que o símbolo apareça solto NO CÓDIGO MASCARADO e
           TAMBÉM no texto cru elimina os dois lados: menção só em comentário
           some no mascarado, artefato de mascaramento some no cru. */
        const re = new RegExp(`(?<![.\\w$])${nome.replace(/\$/g,'\\$')}(?![\\w$])(?!\\s*:)`);
        if (re.test(codigo) && re.test(txt)) faltando.add(`${nome} (de ${quem})`);
      }
      ok(faltando.size === 0,
        `${f} usa sem importar: ${[...faltando].join(', ')}`);
    }
  });

  /* Este teste nasceu no F0.3c, depois de três defeitos seguidos da mesma
     família: um módulo atribuía a algo que importou. Em módulo ES isso é
     TypeError em tempo de execução, e nenhum teste estático anterior via.
     A regra que ele impõe é a mesma do estado.mjs: quem precisa MUTAR estado
     de outro módulo pede uma função ao dono, não escreve no binding. */
  s.teste('ninguém atribui a um símbolo importado', () => {
    const alvos = [...Object.entries(fonte), ['app/index.html', APP]];
    for (const [f, txt] of alvos) {
      const codigo = semTexto(txt);
      const importados = nomesImportados(txt);
      const ruins = [];
      for (const nome of importados) {
        const esc = nome.replace(/\$/g, '\\$');
        const re = new RegExp(`(?<![.\\w$])${esc}\\s*(?:=[^=>]|\\+\\+|--|\\+=|-=|\\*=|/=)`);
        if (re.test(codigo) && re.test(txt)) ruins.push(nome);
      }
      ok(ruins.length === 0,
        `${f} atribui a símbolo importado: ${ruins.join(', ')}. ` +
        `Peça uma função ao módulo dono — binding importado é somente leitura.`);
    }
  });

  s.teste('o app importa a apresentação em vez de contê-la', () => {
    for (const mod of ['sprites', 'render', 'efeitos', 'clima'])
      ok(new RegExp(`from ['"]\\./modules/${mod}\\.mjs['"]`).test(APP),
        `o app não importa ./modules/${mod}.mjs`);
  });

  /* ── D-019 · PRODUÇÃO NÃO IMPORTA DE `test/` ───────────────────────────
   *
   * Havia uma ocorrência: `server/servidor.mjs` importava
   * `test/rodada-digital.mjs` para servir a rota da digital. Não quebrava nada
   * — o repositório inteiro é a unidade de entrega —, mas um deploy que
   * empacotasse o conjunto natural falharia no import antes de abrir a porta,
   * no primeiro deploy real.
   *
   * A guarda existe porque a próxima ocorrência nasceria igual: o arquivo de
   * teste está ali, exporta o que se precisa, e importar dele parece
   * inofensivo. */
  s.teste('nada de produção importa de `test/`', () => {
    const achados = [];
    for (const dir of ['engine', 'server', 'content', 'app/modules']) {
      const base = new URL(`../${dir}/`, import.meta.url).pathname;
      for (const f of readdirSync(base)) {
        if (!f.endsWith('.mjs')) continue;
        const txt = readFileSync(base + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
        for (const m of txt.matchAll(/from\s+['"]([^'"]*\/test\/[^'"]*)['"]/g))
          achados.push(`${dir}/${f} → ${m[1]}`);
      }
    }
    const html = readFileSync(new URL('../app/index.html', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of html.matchAll(/from\s+['"]([^'"]*\/test\/[^'"]*)['"]/g))
      achados.push(`app/index.html → ${m[1]}`);

    igual(achados.length, 0,
      `código de produção importando de \`test/\`:\n      ${achados.join('\n      ')}\n` +
      `      Um deploy que empacote só \`server/\`, \`engine/\`, \`content/\` e ` +
      `\`app/\` falha no import antes de abrir a porta — e o sintoma aparece no ` +
      `primeiro deploy real, que é o pior momento para descobri-lo.`);
  });

  return s;
}
