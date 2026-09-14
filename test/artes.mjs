/* Q1 · O CATÁLOGO DE ARTES DE BANNER E AVATAR (R43)
 *
 * Vinte artes entraram de uma vez, e o modo de falha delas não é erro de
 * execução: é a arte não aparecer. O jogador escolhe "Cachoeira" na lista,
 * salva, volta amanhã, e o banner está vazio — sem nada no console.
 *
 * ── O QUE ESTE ARQUIVO GUARDA ─────────────────────────────────────────────
 *
 *   · que toda arte oferecida TENHA arquivo, e que o arquivo exista em disco;
 *   · que toda cena oferecida tenha REGRA de CSS, nos dois sentidos;
 *   · que o enquadramento esteja declarado e dentro da imagem;
 *   · que nenhum nome da franquia tenha entrado junto com as artes.
 *
 * O último merece nota. Dois arquivos chegaram com identificador da franquia no
 * nome, e o `test/pack-original.mjs` recusa isso em código de produção — o §0.3
 * é "Engine != Pokémon". Eles foram renomeados ao entrar. A varredura aqui é a
 * segunda rede: ela olha o CATÁLOGO, que é onde um nome desses voltaria a
 * aparecer se alguém acrescentasse uma arte sem lembrar da regra.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { AVATARES, BANNERS, DIR_ARTES, arquivoArte, arteValida } from '../app/modules/artes-dados.mjs';
import { BN_CENAS } from '../app/modules/banner-dados.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');
const RAIZ = new URL('../', import.meta.url);

export function suite() {
  const s = criarSuite('artes');

  const todas = [...AVATARES, ...BANNERS];

  s.teste('toda arte do catálogo existe em disco', () => {
    /* A falha que este teste pega é silenciosa dos dois lados: o `<img>` não
       lança, ele só fica vazio. E `assets/` está no `.gitignore` de muitos
       projetos — aqui não está, por decisão do dono, mas um arquivo esquecido
       no `git add` daria exatamente este sintoma para quem clona. */
    const faltando = todas.filter(a => !existsSync(new URL(arquivoArte(a), RAIZ)));
    igual(faltando.length, 0,
      `${faltando.length} arte(s) no catálogo e não em disco: ` +
      `${faltando.map(a => a.arq).join(', ')}`);
  });

  s.teste('nenhuma arte fica órfã em disco', () => {
    /* A DIREÇÃO CONTRÁRIA. Arquivo em disco e fora do catálogo é peso que
       ninguém consegue escolher — e, num pacote de 25 MB, peso que ninguém
       nota. */
    const nomes = new Set(todas.map(a => a.arq));
    const lista = readdirSync(new URL(DIR_ARTES + '/', RAIZ));
    const orfas = lista.filter(f => !nomes.has(f));
    igual(orfas.length, 0,
      `${orfas.length} arquivo(s) em disco e fora do catálogo: ${orfas.join(', ')}`);
  });

  s.teste('toda cena nova tem regra .cn- no CSS', () => {
    const semCSS = BANNERS.filter(b => !new RegExp(`^\\.cn-${b.id}\\{`, 'm').test(APP));
    igual(semCSS.length, 0,
      `${semCSS.length} cena(s) escolhíveis e sem desenho: ${semCSS.map(b => b.id).join(', ')}. ` +
      `O jogador salva e o banner fica vazio.`);
  });

  s.teste('toda cena nova está oferecida no catálogo do banner', () => {
    /* A arte pode ter arquivo, ter CSS, e ninguém conseguir escolhê-la. É a
       família do D-028, e neste projeto ela já apareceu sete vezes. */
    const ids = new Set(BN_CENAS.map(c => c.id));
    const fora = BANNERS.filter(b => !ids.has(b.id));
    igual(fora.length, 0,
      `${fora.length} cena(s) desenhadas e não escolhíveis: ${fora.map(b => b.id).join(', ')}`);
  });

  s.teste('o enquadramento do CSS bate com o do catálogo', () => {
    /* As regras `.cn-*` são GERADAS do catálogo. Se alguém ajustar uma no CSS
       e esquecer a outra, a prévia e o jogo passam a mostrar coisas
       diferentes — e a prévia é onde as decisões são tomadas. */
    const divergentes = [];
    for (const b of BANNERS) {
      const m = APP.match(new RegExp(`^\\.cn-${b.id}\\{--foco:50% (\\d+)%`, 'm'));
      if (!m || Number(m[1]) !== Math.round(b.y * 100)) divergentes.push(b.id);
    }
    igual(divergentes.length, 0,
      `${divergentes.length} cena(s) com enquadramento divergente entre CSS e catálogo: ` +
      divergentes.join(', '));
  });

  s.teste('todo enquadramento está dentro da imagem', () => {
    const fora = todas.filter(a => !(a.y >= 0 && a.y <= 1));
    igual(fora.length, 0,
      `${fora.length} arte(s) com enquadramento fora de [0,1]: ${fora.map(a => a.id).join(', ')}`);
  });

  s.teste('o catálogo não carrega identificador da franquia', () => {
    /* Segunda rede do `test/pack-original.mjs`. Dois arquivos chegaram com
       nome da franquia e foram renomeados ao entrar; esta varredura pega o
       próximo que vier. Sobre o CÓDIGO sem comentário — o cabeçalho explica a
       regra citando a regra, e proibir o termo proibiria a explicação. */
    const fonte = ler('../app/modules/artes-dados.mjs')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const PROIBIDOS = [/pok[ée]mon/i, /pikachu/i, /charizard/i, /bulbasaur/i,
                       /kanto/i, /pok[ée]ball/i, /nintendo/i, /showdown/i];
    const achados = PROIBIDOS.map(re => fonte.match(re)).filter(Boolean).map(m => m[0]);
    igual(achados.length, 0,
      `identificador da franquia no catálogo de artes: ${achados.join(', ')}`);
  });

  s.teste('id desconhecido cai no padrão em vez de deixar a tela sem arte', () => {
    /* Mesma guarda do S70. `localStorage` é editável, e uma arte retirada da
       lista deixaria o avatar apontando para lugar nenhum. */
    igual(arteValida(AVATARES, 'nao-existe').id, AVATARES[0].id);
    igual(arteValida(BANNERS, 'nao-existe').id, BANNERS[0].id);
    igual(arteValida(AVATARES, AVATARES[2].id).id, AVATARES[2].id,
      'id válido não pode ser trocado');
  });

  s.teste('a galeria é uma coleção separada, com kind próprio', () => {
    /* O acervo e a galeria moram em pastas diferentes por uma razão que o
       `CLAUDE.md` governa — `arte/` é nossa, `assets/` é de terceiros — e a
       galeria mistura JPG com GIF animado, então ela guarda o nome do arquivo
       em vez de montá-lo pelo id. Juntar as duas apagaria as duas coisas. */
    const PERFIL = ler('../app/modules/perfil.mjs');
    ok(/kind === 'galeria'/.test(PERFIL),
      'o perfil não sabe resolver um avatar da galeria');
    const CUST = ler('../app/modules/customizacao.mjs');
    ok(/data-av="galeria"/.test(CUST), 'a grade da galeria não marca o kind');
    ok(/id="pickGaleria"/.test(APP), 'o HTML não tem onde a grade da galeria mora');
  });

  s.teste('o enquadramento do avatar chega aos três lugares que o desenham', () => {
    /* O avatar aparece em TRÊS telas — banner de batalha, faixa do topo e
       perfil — e o enquadramento escolhido precisa valer nas três. Uma que
       fique de fora mostra outro corte da mesma arte, e o jogador vê duas
       versões de si mesmo na mesma página. */
    for (const [arq, onde] of [['../app/modules/banner.mjs', 'banner de batalha'],
                               ['../app/modules/faixa.mjs', 'faixa do topo'],
                               ['../app/modules/customizacao.mjs', 'perfil']])
      ok(/avatarEnquadramento\(\)/.test(ler(arq)),
        `o ${onde} desenha o avatar sem aplicar o enquadramento do catálogo`);
  });

  return s;
}
