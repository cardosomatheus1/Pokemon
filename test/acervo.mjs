/* Q1/Q3/Q5 · ACERVO DE ARTE — avatares, cenários e os dois enquadramentos (R30)
 *
 * ── O QUE ESTE ARQUIVO GUARDA ─────────────────────────────────────────────
 *
 * O acervo é a sexta vez que este projeto constrói algo que pode passar em toda
 * a suíte e NÃO chegar à tela — foi assim no D-028 (classes sem CSS), no R7
 * (CSS sem elemento), no R13 (arte baixada e nunca usada), no R20 (painel
 * calculado e descartado) e no R21 (`emitir()` nunca chamado). A forma do
 * defeito é sempre a mesma: as duas pontas existem e ninguém afirma que elas se
 * encontram.
 *
 * Aqui as pontas são quatro — catálogo, arquivo derivado, CSS e os três
 * enquadramentos — e cada teste abaixo amarra um par delas.
 *
 * ── A DUPLICAÇÃO QUE ESTE ARQUIVO EXISTE PARA VIGIAR ──────────────────────
 *
 * `foco` e `faixa` vivem em DOIS lugares: no catálogo, onde está escrito por
 * que cada valor é aquele, e no CSS, que é quem de fato desenha. Não há passo
 * de build neste projeto para gerar um do outro, e não vai haver — então a
 * única coisa que impede os dois de divergirem é o teste `os valores do CSS
 * batem com os do catálogo`.
 *
 * Ele não é decorativo: durante a construção do R30 os dois JÁ divergiram uma
 * vez, porque uma substituição em massa casou o catálogo e errou o CSS. O
 * sintoma seria o enquadramento certo no comentário e o errado na tela.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import {
  AVATARES_ARTE, CENAS_ARTE, DIR_ACERVO, TAM_AVATAR, TAM_BANNER,
  arquivoAvatar, arquivoCena, avatarArteValido,
} from '../app/modules/acervo-dados.mjs';
import { BN_CENAS } from '../app/modules/banner-dados.mjs';
import { FONTES_AVATAR, FONTES_CENA } from '../tools/acervo-fontes.mjs';

/* A procedência mora em `tools/` desde que o Q2 reprovou tê-la em
   `app/modules/` (identificador da franquia em código de produção). O teste
   junta as duas pontas porque é ele quem afirma que elas continuam casando. */
const PROC = id => FONTES_AVATAR[id] || FONTES_CENA[id];

const RAIZ = new URL('../', import.meta.url);
const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');

/* Dimensão de PNG e JPEG a partir do cabeçalho. Doze linhas em vez de uma
   dependência de imagem — o projeto não tem nenhuma e a regra é dura. */
function dimensao(caminho) {
  const b = readFileSync(new URL(caminho, RAIZ));
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 1) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/* `--foco:45% 50%` -> [45, 50] */
function varDaCena(id, nome) {
  const re = new RegExp(`^\\.cn-${id}\\s*\\{([^}]*)\\}`, 'm');
  const bloco = APP.match(re);
  if (!bloco) return null;
  const v = bloco[1].match(new RegExp(`--${nome}:\\s*(\\d+)%\\s+(\\d+)%`));
  return v ? [+v[1], +v[2]] : null;
}

export function suite() {
  const s = criarSuite('acervo');

  /* ═══ o arquivo existe, e no tamanho declarado ═══════════════════════════ */

  s.teste('todo avatar do catálogo tem arquivo derivado quadrado', () => {
    for (const a of AVATARES_ARTE) {
      const arq = arquivoAvatar(a.id);
      ok(existsSync(new URL(arq, RAIZ)),
        `${arq} não existe — rode \`node tools/preparar-acervo.mjs\``);
      const d = dimensao(arq);
      ok(d, `${arq} não é PNG/JPEG legível`);
      igual(d[0], TAM_AVATAR, `${arq} tem largura ${d[0]}, esperado ${TAM_AVATAR}`);
      igual(d[1], TAM_AVATAR, `${arq} tem altura ${d[1]}, esperado ${TAM_AVATAR}`);
    }
  });

  s.teste('toda cena do acervo tem arquivo derivado 16:9', () => {
    for (const c of CENAS_ARTE) {
      const arq = arquivoCena(c.id);
      ok(existsSync(new URL(arq, RAIZ)),
        `${arq} não existe — rode \`node tools/preparar-acervo.mjs\``);
      const d = dimensao(arq);
      ok(d, `${arq} não é PNG/JPEG legível`);
      igual(d[0], TAM_BANNER[0], `${arq} tem largura ${d[0]}, esperado ${TAM_BANNER[0]}`);
      igual(d[1], TAM_BANNER[1], `${arq} tem altura ${d[1]}, esperado ${TAM_BANNER[1]}`);
    }
  });

  /* A esteira sem as fontes é uma esteira que ninguém consegue rodar de novo.
     `arte/acervo/origem/` é o que torna a derivação REPRODUTÍVEL num clone —
     mesma lição do `preparar-arte-arena.mjs` no R17. */
  s.teste('as fontes estão versionadas, com nome em ASCII', () => {
    for (const x of [...AVATARES_ARTE, ...CENAS_ARTE]) {
      const p = PROC(x.id);
      ok(p && p.fonte, `${x.id} não tem procedência em tools/acervo-fontes.mjs`);
      ok(existsSync(new URL(`${DIR_ACERVO}/origem/${p.fonte}`, RAIZ)),
        `a fonte ${p.fonte} não está em ${DIR_ACERVO}/origem — a derivação não é reprodutível`);
      ok(!/[^\x20-\x7e]/.test(p.fonte),
        `a fonte ${p.fonte} tem caractere fora do ASCII: o mesmo arquivo vira dois ` +
        `bytes diferentes dependendo de quem copiou`);
    }
  });

  /* O §0.3 é "Engine != tema". O catálogo do app foi separado da procedência
     justamente porque os nomes dos arquivos entregues carregam identificadores
     da franquia — e `test/pack-original.mjs` reprovou quando eles estavam
     juntos. Este teste guarda a separação pelo lado de cá: se alguém trouxer o
     campo `fonte` de volta para o app, o Q2 reprova de novo, e agora com uma
     mensagem que diz por quê. */
  s.teste('o catálogo do app não carrega procedência de arquivo', () => {
    for (const x of [...AVATARES_ARTE, ...CENAS_ARTE])
      ok(!('fonte' in x) && !('recorte' in x),
        `${x.id} voltou a declarar \`fonte\`/\`recorte\` em app/modules — ` +
        `isso traz nome de arquivo da franquia para código de produção`);
  });

  /* ═══ catálogo íntegro ═══════════════════════════════════════════════════ */

  s.teste('os ids são únicos, minúsculos, e todo item tem nome', () => {
    const ids = [...AVATARES_ARTE, ...CENAS_ARTE].map(x => x.id);
    igual(new Set(ids).size, ids.length, 'id repetido no acervo');
    for (const x of [...AVATARES_ARTE, ...CENAS_ARTE])
      ok(x.nm && x.nm.length, `${x.id} sem nome exibível`);
    /* `test/banner.mjs` varre as classes órfãs com `^\.(cn|ef)-([a-z]+)[{:]` —
       só letras minúsculas. Um id com número ou hífen entraria no catálogo e
       SAIRIA daquela varredura: CSS órfão deixaria de ser detectável. */
    for (const c of CENAS_ARTE)
      ok(/^[a-z]+$/.test(c.id),
        `o cenário "${c.id}" tem caractere fora de [a-z] — ele escapa da varredura ` +
        `de classes órfãs do test/banner.mjs`);
  });

  s.teste('todo recorte declarado é um dos três conhecidos', () => {
    for (const a of AVATARES_ARTE) {
      const p = PROC(a.id);
      ok(['alfa', 'fundo', 'cena'].includes(p && p.recorte),
        `${a.id} tem recorte "${p && p.recorte}", que a esteira não sabe executar`);
    }
  });

  /* Mesma guarda do S70 e do `cosmeticoValido`: id gravado que não existe mais
     cai no padrão em vez de deixar a tela sem avatar. */
  s.teste('avatar de arte desconhecido cai no padrão, não no vazio', () => {
    igual(avatarArteValido('nao-existe'), AVATARES_ARTE[0].id, 'id inválido não caiu no padrão');
    igual(avatarArteValido(''), AVATARES_ARTE[0].id, 'id vazio não caiu no padrão');
    igual(avatarArteValido('mewbebe'), 'mewbebe', 'id válido foi trocado');
  });

  /* ═══ as duas pontas se encontram ════════════════════════════════════════ */

  s.teste('toda cena do acervo é oferecida ao jogador', () => {
    for (const c of CENAS_ARTE)
      ok(BN_CENAS.some(x => x.id === c.id),
        `o cenário ${c.id} tem arquivo e CSS e NÃO está em BN_CENAS — ` +
        `ninguém consegue escolhê-lo`);
  });

  s.teste('toda cena do acervo aponta para o arquivo derivado no CSS', () => {
    for (const c of CENAS_ARTE) {
      const re = new RegExp(`^\\.cn-${c.id}\\s*\\{[^}]*url\\('\\.\\./${arquivoCena(c.id)}'\\)`, 'm');
      ok(re.test(APP),
        `.cn-${c.id} não aponta para ../${arquivoCena(c.id)} — a cena aparece vazia`);
    }
  });

  /* O TESTE CENTRAL DO BLOCO. Ver o cabeçalho: os números vivem em dois lugares
     e nada além disto impede que divirjam. */
  s.teste('os valores do CSS batem com os do catálogo', () => {
    for (const c of CENAS_ARTE) {
      for (const [campo, nome] of [['foco', 'foco'], ['faixa', 'tira']]) {
        const noCSS = varDaCena(c.id, nome);
        ok(noCSS, `.cn-${c.id} não declara --${nome}`);
        igual(noCSS[0], c[campo][0],
          `.cn-${c.id} --${nome} tem X=${noCSS[0]}, o catálogo diz ${c[campo][0]}`);
        igual(noCSS[1], c[campo][1],
          `.cn-${c.id} --${nome} tem Y=${noCSS[1]}, o catálogo diz ${c[campo][1]}`);
      }
    }
  });

  /* As três cenas de imagem que já existiam ganharam os dois enquadramentos no
     R30 — foi justamente a faixa do topo delas que o dono do projeto viu
     errada. Sem este teste, uma delas pode voltar a ter só uma posição. */
  s.teste('as três cenas antigas também declaram os dois enquadramentos', () => {
    for (const id of ['cidade', 'portal', 'nucleo']) {
      ok(varDaCena(id, 'foco'), `.cn-${id} perdeu o --foco`);
      ok(varDaCena(id, 'tira'), `.cn-${id} perdeu o --tira`);
    }
  });

  /* ═══ o enquadramento é DOIS, e não um ═══════════════════════════════════ */

  /* A asserção é sobre a CONSTRUÇÃO. O defeito que o R30 corrige não é um
     número errado — é os três lugares lendo a MESMA posição. Se a faixa do topo
     voltar a ler `--foco`, todo valor de `--tira` do arquivo vira decoração. */
  s.teste('a caixa alta lê --foco e as duas largas leem --tira', () => {
    const alto = APP.match(/^\.bnCena\{background-position:([^}]*)\}/m);
    ok(alto, 'a regra de posição do `.bnCena` sumiu');
    ok(/--foco/.test(alto[1]) && !/--tira/.test(alto[1]),
      `o banner da rodada não lê --foco: ${alto[1]}`);

    const largo = APP.match(/^#profBanner \.scene,\.fa-cena\{background-position:([^}]*)\}/m);
    ok(largo, 'a regra de posição das duas caixas largas sumiu');
    ok(/--tira/.test(largo[1]),
      `a faixa do topo e a tira do perfil não leem --tira: ${largo[1]} — ` +
      `é o defeito que o R30 existe para corrigir`);
  });

  /* `background` abreviado reescreve `background-position` para o padrão, e as
     regras de enquadramento acima seriam apagadas em silêncio pela cena que o
     usasse. O sintoma é sutil: a cena desenha, só que sempre no mesmo lugar. */
  s.teste('nenhuma cena de imagem usa `background` abreviado', () => {
    const maus = [];
    for (const c of [...CENAS_ARTE.map(x => x.id), 'cidade', 'portal', 'nucleo']) {
      const bloco = APP.match(new RegExp(`^\\.cn-${c}\\s*\\{([^}]*)\\}`, 'm'));
      if (bloco && /(^|;)\s*background\s*:/.test(bloco[1])) maus.push(c);
    }
    ok(maus.length === 0,
      `${maus.join(', ')} usam \`background:\` abreviado — a forma curta zera o ` +
      `background-position e apaga o enquadramento sem erro nenhum`);
  });

  /* ═══ o avatar do acervo chega à tela, e desenhado certo ═════════════════ */

  s.teste('o perfil resolve o avatar de arte pelo caminho do acervo', () => {
    const src = ler('../app/modules/perfil.mjs');
    ok(/kind === 'arte'/.test(src),
      'o `avatarURL` não conhece o tipo `arte` — escolher um do acervo não muda nada');
    ok(/arquivoAvatar\(avatarArteValido\(/.test(src),
      'o endereço do avatar de arte não passa pela guarda `avatarArteValido`');
  });

  s.teste('a grade de escolha do acervo existe e é preenchida', () => {
    ok(/id="pickArte"/.test(APP), 'a grade `#pickArte` não está no index.html');
    const src = ler('../app/modules/customizacao.mjs');
    ok(/\$\('#pickArte'\)\.innerHTML/.test(src),
      'ninguém preenche o `#pickArte` — a grade fica vazia na tela');
    ok(/data-av="arte"/.test(src),
      'as opções do acervo não carregam `data-av="arte"`; o clique não salva nada');
  });

  /* O AVATAR DO ACERVO NÃO PODE HERDAR `pixelated`.
   *
   * São dezessete regras `image-rendering:pixelated` no index.html, e elas estão
   * certas para sprite: 96 px AMPLIADO precisa de pixel duro. O avatar do acervo
   * é o caso oposto — 256 px REDUZIDO a 66 — e `pixelated` numa redução descarta
   * amostras em vez de mediá-las.
   *
   * Não dá para ver isso em teste de comportamento nem em linha de base visual:
   * a tela abre, o avatar aparece, e a suíte fica verde com a imagem serrilhada.
   * Por isso o teste é sobre a REGRA. */
  s.teste('o avatar de arte desliga o pixelated nos quatro lugares que o desenham', () => {
    const bloco = APP.match(/^#profAvatar\.avArte,[\s\S]*?\{image-rendering:auto\}/m);
    ok(bloco, 'a regra `.avArte` sumiu do CSS — o retrato do acervo volta a serrilhar');
    for (const alvo of ['#profAvatar.avArte', '.fa-eu img.avArte', '.bnTreinador.avArte', '.opt img.avArte'])
      ok(bloco[0].includes(alvo), `a regra .avArte nao cobre ${alvo}`);
  });

  s.teste('os três lugares que desenham o avatar marcam a classe', () => {
    for (const [arq, oque] of [
      ['../app/modules/customizacao.mjs', 'o avatar do perfil'],
      ['../app/modules/faixa.mjs',        'o avatar da faixa do topo'],
      ['../app/modules/banner.mjs',       'o avatar do banner de batalha'],
    ]) {
      const src = ler(arq);
      ok(/avatarEhArte\(/.test(src),
        `${oque} não pergunta se o avatar é do acervo — ele sai com \`pixelated\``);
      ok(/avArte/.test(src), `${oque} não aplica a classe \`avArte\``);
    }
  });

  /* ═══ D-041 · movimento reduzido ═════════════════════════════════════════ */

  s.teste('a varredura das cenas para sob movimento reduzido', () => {
    const guardas = [...APP.matchAll(/@media \(prefers-reduced-motion:\s*reduce\)\{([\s\S]*?)\n\}/g)]
      .map(m => m[1]).join('\n');
    ok(/\[class\*="cn-"\]::after\{animation:none\}/.test(guardas),
      'as cenas `.cn-*` voltaram a varrer com movimento reduzido ligado (D-041)');
  });

  /* ═══ a esteira continua reprodutível ════════════════════════════════════ */

  s.teste('a esteira que deriva o acervo está versionada', () => {
    for (const t of ['tools/preparar-acervo.mjs', 'tools/folha-acervo.mjs'])
      ok(existsSync(new URL(t, RAIZ)),
        `${t} sumiu — sem ele ninguém sabe como a arte derivada foi feita`);
  });

  /* A sonda classificou um PNG semitransparente como "já recortado" porque
     contava `alfa < 250`. Transparente é alfa ~0; "não totalmente opaco" é
     outra coisa, e a diferença custou um avatar com caixa cinza atrás. */
  s.teste('a sonda mede transparência de verdade, e não opacidade parcial', () => {
    const src = readFileSync(new URL('tools/preparar-acervo.mjs', RAIZ), 'utf8');
    const linha = src.match(/if \(p\[i\] < (\d+)\) transp\+\+/);
    ok(linha, 'a contagem de pixels transparentes sumiu da sonda');
    ok(+linha[1] <= 16,
      `a sonda conta alfa < ${linha[1]} como transparente. Acima de ~16 isso mede ` +
      `"não totalmente opaco", e um PNG semitransparente inteiro passa por recortado.`);
  });

  /* Alcance alto sozinho não prova que existe fundo: o preenchimento acompanha
     degradê de propósito, e num pôr do sol ele caminha pelo CÉU. Quem separa os
     dois casos é o desvio do anel de borda. */
  s.teste('a sonda exige borda uniforme antes de sugerir remoção de fundo', () => {
    const src = readFileSync(new URL('tools/preparar-acervo.mjs', RAIZ), 'utf8');
    const v = src.match(/const sugerido = [\s\S]{0,220}?;/);
    ok(v, 'o veredito da sonda sumiu');
    ok(/r\.dp\s*<\s*\d+\s*&&/.test(v[0]),
      `o veredito voltou a decidir só pelo alcance: ${v[0].replace(/\s+/g, ' ')}`);
  });

  return s;
}
