/* Q1/Q6 · O CIRCUITO DA PROGRESSÃO, FECHADO (bloco 0.1, fecha o F1.10).
 *
 * ── O CRITÉRIO DE SAÍDA DO F1.10 É UMA FRASE ───────────────────────────────
 *
 *     progressão sobrevive a limpar o navegador
 *
 * Quando este arquivo nasceu ela era falsa, e o `D-045` mede por quê: a máquina
 * do F1.10 estava pronta e ISOLADA NAS DUAS PONTAS.
 *
 *     o cliente     calculava XP e desafio, e guardava em `ar_profile`
 *     o servidor    sabia calcular os dois, e ninguém chamava nem lia
 *
 * `darXP` e `registrarFeito` existiam em `server/progressao.mjs` com um único
 * chamador cada: os próprios testes. Nenhuma rota de aposta, liquidação ou laço
 * os acionava. E `app/` não citava `/api/perfil` em lugar nenhum.
 *
 * Então mesmo que o cliente passasse a LER a rota, ele leria `xp = 0` para
 * sempre. Ligar não era hidratar o cliente — era fechar o circuito:
 *
 *     o cliente diz o que FEZ   ->   o servidor deriva XP e desafio
 *     o servidor é a fonte      ->   o cliente projeta, como a carteira
 *
 * ── O QUE ESTE ARQUIVO NÃO MEDE, E É DECISÃO ───────────────────────────────
 *
 * Cosmético não entra. `avatar`, `banner`, `battle` e `shiny` nasceram na V1.15,
 * depois do F1.10, e o esquema do servidor não tem coluna para eles — limpar o
 * navegador ainda os apaga. Isso é real e está registrado como lacuna própria;
 * fingir que o F1.10 os cobre seria fechar o bloco medindo outra coisa, que é a
 * lição do R40 e a causa do próprio D-045.
 *
 * O que o F1.10 possui, e o que este arquivo mede: XP, nível, desafios do dia e
 * trilha de login.
 */
import { fileURLToPath } from 'node:url';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';

const SENHA = 'senha-longa-o-bastante-1';

function armazemFalso() {
  const dados = new Map();
  return {
    getItem: k => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: k => dados.delete(k),
    clear: () => dados.clear(),
  };
}

async function comServico(fn) {
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true },
                            banco: ':memory:', sims: 500 });
  const porta = await s.ouvir(0);
  const armazem = armazemFalso();
  const api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem });

  /* Empresta o `localStorage` e a api SINGLETON ao módulo — o testado é o mesmo
     que o navegador carrega, sem adaptação. Mesma forma do `laco-servidor`. */
  const ligar = async () => {
    globalThis.localStorage = armazem;
    const mod = await import('../app/modules/api.mjs');
    const apiApp = mod.configurarApi({ base: `http://127.0.0.1:${porta}`, armazem });
    return {
      /* O MÓDULO DE DADOS, e não o `perfil.mjs`: este é o ponto da extração.
         O `perfil.mjs` importa `sprites.mjs` e `desafios.mjs`, que tocam o DOM
         na carga — e o critério de saída deste bloco tem de ser mediável no
         Node. A reexportação de lá é conferida pelo portão estático `modulos`. */
      perfil: await import('../app/modules/perfil-dados.mjs'),
      S: (await import('../app/modules/estado.mjs')).S,
      banco: await import('../app/modules/banco.mjs'),
      api: apiApp,
    };
  };
  const antes = globalThis.localStorage;
  try { return await fn({ porta, s, api, armazem, ligar }); }
  finally { globalThis.localStorage = antes; await s.fechar(); }
}

const cadastrar = (api, n = 'j') => api.post('/api/auth/cadastrar', {
  username: n, email: `${n}@exemplo.test`, senha: SENHA, nascimento: '1990-01-01' });

export async function suite() {
  const s = criarSuite('progressao-ligada');

  /* --- O CRITÉRIO DE SAÍDA ------------------------------------------------ */

  s.teste('limpar o armazenamento local não muda a progressão do jogador', async () => {
    await comServico(async ({ armazem, porta, ligar }) => {
      const { perfil, api } = await ligar();
      const c = await cadastrar(api);
      ok(c.ok, `cadastro falhou: ${JSON.stringify(c.corpo)}`);

      /* O jogador entra: a trilha do dia é um FATO do servidor, e ela acontece
         quando a sessão aparece — não quando o cliente pede. */
      await perfil.hidratarPerfil();
      const antes = { xp: perfil.xpDoPerfil(), nivel: perfil.nivelDoPerfil(),
                      sequencia: perfil.sequenciaDeLogin() };
      igual(antes.sequencia, 1,
        'entrar com sessão não registrou o dia na trilha. O `POST /api/perfil/entrar` ' +
        'não está sendo chamado no boot — é a metade cliente do D-045.');

      /* O JOGADOR LIMPA O NAVEGADOR. Some a sessão, e é só isso que ela deveria
         custar: sessão é credencial, não progresso. */
      armazem.clear();
      igual(criarApi({ base: `http://127.0.0.1:${porta}`, armazem }).temSessao(), false,
        'a sessão sobreviveu ao clear — não é sessão, é cache');

      const entrou = await api.post('/api/auth/entrar', { email: 'j@exemplo.test', senha: SENHA });
      ok(entrou.ok, `não deu para entrar de novo: ${JSON.stringify(entrou.corpo)}`);
      await perfil.hidratarPerfil();

      igual(perfil.xpDoPerfil(), antes.xp,
        `o jogador tinha ${antes.xp} de XP e depois de limpar o navegador tem ` +
        `${perfil.xpDoPerfil()}. É o critério de saída do F1.10, e ele é uma frase: ` +
        `progressão sobrevive a limpar o navegador.`);
      igual(perfil.nivelDoPerfil(), antes.nivel, 'o nível voltou diferente');
      igual(perfil.sequenciaDeLogin(), antes.sequencia,
        'a trilha de login zerou com o navegador. Sete dias de trilha ficariam ' +
        'impossíveis para quem troca de máquina ou limpa o cache.');
    });
  });

  /* --- A PONTA DO SERVIDOR, MEDIDA NA FONTE ------------------------------- */

  /* O COMPORTAMENTO desta ponta — liquidar uma aposta faz o XP subir e conta o
     desafio — é medido em `test/aposta-servidor.mjs`, e não aqui. Lá o relógio
     é controlável e a rodada se liquida à mão; aqui haveria de esperar uma
     rodada real terminar em tempo de parede, e teste que espera relógio é a
     origem do D-033 e do D-044.
     O que fica aqui é a AUSÊNCIA DE CHAMADOR, que é a forma exata do D-045. */

  /* O teste acima mede o comportamento; este mede a AUSÊNCIA DE CHAMADOR, que
     é a forma exata do D-045. Os dois existem porque o primeiro pode ficar
     verde por um atalho — alguém dando XP na própria rota, por exemplo — e o
     segundo diz onde a regra tem de morar. */
  s.teste('`darXP` e `registrarFeito` têm chamador em produção', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const dir = fileURLToPath(new URL('../server/', import.meta.url));
    const fontes = readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'progressao.mjs')
      .map(f => [f, readFileSync(dir + f, 'utf8')]);

    for (const nome of ['darXP', 'registrarFeito']) {
      const quem = fontes.filter(([, txt]) => new RegExp(`\\b${nome}\\s*\\(`).test(txt))
        .map(([f]) => f);
      ok(quem.length > 0,
        `\`${nome}\` não é chamado por nenhum módulo de \`server/\` fora da ` +
        `própria definição. É o D-045: a máquina do F1.10 existe, passa na ` +
        `suíte, e nada a alimenta.`);
    }
  });

  /* --- A PONTA DO CLIENTE, MEDIDA NA FONTE -------------------------------- */

  /* O ESPELHO DO TESTE ACIMA, e ele existe pela mesma razão.
   *
   * O D-045 não foi um erro de cálculo: foi uma máquina inteira pronta, testada,
   * com sabotagem provada, e SEM CHAMADOR nas duas pontas. Um bloco que a liga e
   * não deixa rede para isso está a um refactor de recriá-la — e a próxima vez
   * seria a sétima ocorrência do padrão que abre o ROADMAP.
   *
   * Mede o BOOT, e não um módulo: `hidratarPerfil` chamado de dentro de um
   * módulo que ninguém carrega é exatamente o defeito de novo. Mesma forma do
   * `em modo servidor, as três fontes são o servidor`, do `laco-servidor`. */
  s.teste('o boot chama `hidratarPerfil`, e não só a carteira', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

    ok(/hidratarPerfil\s*\}?\s*from\s*'\.\/modules\/perfil\.mjs'/.test(html)
       || /import\s*\{[^}]*hidratarPerfil[^}]*\}\s*from\s*'\.\/modules\/perfil\.mjs'/.test(html),
      'o boot não importa `hidratarPerfil`. Com a carteira hidratada e a ' +
      'progressão não, o jogador teria o dinheiro de volta e o nível zerado ' +
      'depois de limpar o navegador — que é metade do D-045 de pé.');

    ok(/await\s+hidratarPerfil\s*\(\s*\)/.test(html),
      'o boot importa `hidratarPerfil` e não a chama. Importação sem chamada é ' +
      'a forma mais silenciosa deste defeito: o portão estático de módulos fica ' +
      'verde, e a tela continua sem a progressão do servidor.');

    /* A ORDEM: dentro do `ligarModoServidor`, junto com a carteira. Solta no
       `boot`, ela rodaria sem sessão também — uma ida à rede por carregamento
       para um jogador que escolheu jogar offline. */
    const bloco = html.slice(html.indexOf('async function ligarModoServidor'),
                             html.indexOf('(async function boot'));
    ok(/await\s+hidratarPerfil\s*\(\s*\)/.test(bloco),
      '`hidratarPerfil` é chamada fora do `ligarModoServidor`. Ali ela roda ' +
      'sem sessão também, e o modo local passa a depender de rede — que é a ' +
      'metade do contrato que o `banco.mjs` protege com `if (!modoServidor())`.');
  });

  /* --- O COSMÉTICO NÃO PODE SER ATROPELADO POR ESTE BLOCO ----------------- */

  /* A ARMADILHA QUE ESTE TESTE EXISTE PARA FECHAR.
   *
   * O contrato de modo servidor da carteira tem uma regra forte: COM SESSÃO NÃO
   * SE ESCREVE (`banco.mjs`, `salvar()` devolve cedo). Ela é certa lá, porque o
   * servidor é dono de cada centavo.
   *
   * Copiá-la inteira para o perfil apagaria trabalho entregue. O servidor tem
   * coluna para `xp`, `nome`, `avatar` e `banner_dex` — e NÃO tem para `battle`
   * (cena, efeito de nome, moldura) nem para `shiny` (gifs e skins,
   * desbloqueados e equipados). Esses nasceram na V1.15, do R24 ao R43, depois
   * do F1.10. Um `saveProfile` que devolvesse cedo com sessão faria o jogador
   * perder moldura, skin equipada e desbloqueio shiny no primeiro reload.
   *
   * Então a regra deste bloco é DIVIDIDA, e é isto que se mede aqui:
   *
   *     servidor é dono de   xp · desafios do dia · trilha de login
   *     localStorage é dono  avatar · banner · battle · shiny
   *
   * Enquanto o servidor não tiver onde guardar cosmético — e isso é uma lacuna
   * registrada, não um esquecimento — o cliente continua sendo a fonte dele,
   * COM ou SEM sessão. */
  s.teste('com sessão, o cosmético continua sendo gravado localmente', async () => {
    await comServico(async ({ armazem, ligar }) => {
      const { perfil, api, S } = await ligar();
      ok((await cadastrar(api)).ok, 'cadastro falhou');
      await perfil.hidratarPerfil();
      igual(perfil.modoServidor(), true, 'com sessão o perfil não entrou em modo servidor');

      /* O CAMINHO É O DA TELA, e não uma função escrita para o teste: a
         customização muta `S.profile` e chama `saveProfile` — ver
         `customizacao.mjs`, onde as três opções de banner e o guarda-roupa
         shiny fazem exatamente isto. Um atalho aqui mediria código que só o
         teste percorre, que é a lição do R40. */
      S.profile.battle = { cena: 'praia', efeito: 'aurora', moldura: 'trovao' };
      S.profile.shiny = { gifs: [6], skins: [6], onGif: { 6: true }, onSkin: { 6: true } };
      perfil.saveProfile(S.profile);

      /* ── HIDRATAR DE NOVO, E ESTA LINHA É O QUE O Q2 EXIGIU ───────────────
       *
       * A primeira versão deste teste escrevia o cosmético DEPOIS da única
       * hidratação, e por isso o `S516` — a hidratação substituindo o perfil
       * inteiro — passava por baixo dele: o teste escrevia por cima do estrago
       * e media a própria escrita.
       *
       * O cenário real é o contrário e é o de todo boot: o jogador JÁ TEM
       * moldura e skin no armazenamento, abre o jogo, e a hidratação acontece
       * por cima. Se ela mandar no objeto em vez de mandar nos CAMPOS dela, o
       * cosmético do R24 ao R43 some — e é isto que a segunda hidratação mede. */
      await perfil.hidratarPerfil();
      igual(S.profile.battle?.moldura, 'trovao',
        'a hidratação apagou a moldura equipada. O servidor é dono de xp, ' +
        'desafios e trilha — e de mais nada. Substituir `S.profile` pelo que a ' +
        'rota devolve joga fora cosmético e estatística, que ela não conhece.');
      ok(S.profile.shiny?.onSkin?.[6], 'a hidratação apagou a skin shiny equipada');
      ok(S.profile.xp !== undefined, 'a hidratação não trouxe o xp do servidor');

      const cru = armazem.getItem('ar_profile');
      ok(cru, 'com sessão, `ar_profile` deixou de ser gravado. O cosmético do ' +
              'R24 ao R43 não tem coluna no servidor — sem esta escrita ele some ' +
              'no primeiro reload, e o bloco 0.1 teria apagado trabalho entregue.');
      const p = JSON.parse(cru);
      igual(p.battle?.moldura, 'trovao', 'a moldura equipada não sobreviveu à gravação');
      igual(p.battle?.efeito, 'aurora', 'o efeito de nome equipado não sobreviveu');
      igual(p.battle?.cena, 'praia', 'a cena do banner de batalha não sobreviveu');
      ok(p.shiny?.onSkin?.[6], 'a skin shiny equipada não sobreviveu');
      ok(p.shiny?.gifs?.includes(6), 'o desbloqueio shiny não sobreviveu');
    });
  });

  /* --- O CONTRAPESO: O MODO LOCAL CONTINUA INTEIRO ------------------------ */

  /* A metade que se esquece. Um app que só progredisse com servidor teria
     trocado um modo completo por outro, e o produto nasceu offline-first. */
  s.teste('sem sessão, a progressão continua local e inteira', async () => {
    await comServico(async ({ ligar }) => {
      const { perfil } = await ligar();
      igual(perfil.modoServidor(), false,
        'sem sessão o perfil se declarou em modo servidor');
      igual(await perfil.hidratarPerfil(), false,
        '`hidratarPerfil()` tentou falar com o servidor sem sessão — e o modo ' +
        'local não pode depender de rede para nada');
      ok(perfil.nivelDoPerfil() >= 1, 'o modo local deixou de ter perfil');
    });
  });

  return s;
}
