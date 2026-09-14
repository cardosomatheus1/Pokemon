/* CATÁLOGO DAS ARTES DE BANNER E AVATAR (R43).
 *
 * ── O CORTE É DECLARADO, NÃO RECORTADO ────────────────────────────────────
 *
 * Cada arte guarda UMA posição de enquadramento, e o CSS a aplica com
 * `object-position`. O arquivo em disco é sempre a arte inteira.
 *
 * Isso começou como necessidade e virou a decisão certa. A necessidade: oito
 * destas artes são GIF ANIMADO, e recortar um GIF exigiria reescrever os
 * quadros — o que precisa de um codificador, e o projeto tem zero dependências.
 *
 * A decisão: o mesmo arquivo serve os TRÊS encaixes, que têm proporções muito
 * diferentes, com o mesmo enquadramento respondendo bem nos três. Recortar em
 * disco obrigaria a manter três cópias de cada arte, e a terceira sempre seria
 * a que ninguém lembra de atualizar.
 *
 * ── POR QUE SÓ A POSIÇÃO VERTICAL IMPORTA ────────────────────────────────
 *
 * Onze das catorze artes de banner são RETRATOS (proporção de 0,46 a 0,80) e os
 * três encaixes são DEITADOS:
 *
 *     faixa da topbar    ~32:1      banner do perfil  ~3,4:1
 *     banner de batalha  ~1,8:1     avatar             1:1
 *
 * Com `object-fit:cover`, uma imagem em pé numa caixa deitada tem a LARGURA
 * preenchida e a altura cortada. A posição horizontal não muda nada; a vertical
 * decide o que se vê. Uma arte de 0,46 num encaixe de 1,8 mostra **um quarto**
 * da altura dela — nesse caso o corte não é ajuste fino, é a decisão inteira.
 *
 * ── OS VALORES SAÍRAM DE MEDIÇÃO E DE ESCOLHA, NÃO DE PADRÃO ─────────────
 *
 * Cada arte foi desenhada em três cortes — topo, meio e base — e o dono do
 * projeto escolheu um por um vendo os três lado a lado, nos encaixes reais.
 * Onde ele pediu algo entre dois cortes, o número saiu de conta: mede-se onde
 * o assunto está na arte, mede-se que fatia o encaixe mostra, e escolhe-se o
 * centro que faz as duas coisas caberem.
 *
 * `nm` é o nome exibido; `y` é a posição vertical do enquadramento.
 */

/* Onde as artes moram. Em `assets/` e não em `arte/`: `arte/` é a arte NOSSA, e
   estas vêm de terceiros — a distinção é do `CLAUDE.md` e ela governa a tag de
   saída (`ARTE_EMPRESTADA_DE` no `content/escolhido.mjs`). */
export const DIR_ARTES = 'assets/artes';

/* ── AVATARES ─────────────────────────────────────────────────────────────
 *
 * Num quadrado de 66 px, o rosto quase sempre está no terço de cima — daí os
 * valores baixos. As duas exceções são deitadas e o corte quadrado joga fora
 * metade da largura; elas estão marcadas.
 *
 * O `lutadorderaio` mudou de nome ao entrar. O nome original trazia um
 * identificador da franquia, e o `test/pack-original.mjs` recusa isso em código
 * de produção — o §0.3 é "Engine != Pokémon". O arquivo em `assets/` poderia
 * manter o nome, mas o id vive AQUI, e coerência entre os dois vale mais que a
 * lembrança do nome antigo. Mesma história do `trioinicial`. */
export const AVATARES = [
  { id:'articuno',      nm:'Ave do Gelo',        arq:'avatar_articuno.jpg',      y:0.22 },
  { id:'moltres',       nm:'Ave do Fogo',        arq:'avatar_moltres.jpg',       y:0.30, deitada:true },
  { id:'zapdos',        nm:'Ave do Raio',        arq:'avatar_zapdos.jpg',        y:0.24 },
  { id:'trioaves',      nm:'As Três Aves',       arq:'avatar_trioaves.jpg',      y:0.28 },
  { id:'iniciais',      nm:'Os Três Iniciais',   arq:'avatar_iniciais.gif',      y:0.42, vivo:true },
  { id:'mewrindo',      nm:'Sorriso Ancestral',  arq:'avatar_mewrindo.gif',      y:0.34, vivo:true, deitada:true },
  { id:'lutadorderaio', nm:'Lutador de Raio',    arq:'avatar_lutadorderaio.gif', y:0.30, vivo:true, deitada:true },
];

/* ── BANNERS ──────────────────────────────────────────────────────────────
 *
 * Os cortes abaixo foram escolhidos pelo dono do projeto, um por um. Três
 * merecem nota porque não vieram da lista de três:
 *
 *   moltresash    ele pediu "um intermediário entre topo e meio, onde dê para
 *                 ver o Ash com o Charizard E um pouco do Moltres". Medido: o
 *                 par está em y 12%–45%, o Moltres grande começa em 55%, e o
 *                 banner de batalha mostra 45% da altura. A faixa 14,5%–59,5%
 *                 pega os dois, e o centro dela é 0,37.
 *
 *   moltres       "topo", e o topo cru (0,12) mostrava só o rastro de fogo. O
 *                 corpo do bicho está em y 5%–50%, centrado em 28% — então o
 *                 topo que de fato enquadra o Moltres é 0,24. É refinamento
 *                 DENTRO da escolha dele, não outra escolha.
 *
 *   chopechoke    não existia. A base da arte do Moltres tinha um Machoke e um
 *                 Machop que ninguém tinha notado; o dono os viu na prévia e
 *                 pediu uma arte à parte. Ela é a única DERIVADA do lote — o
 *                 recorte está registrado em `tools/derivar-artes.mjs`.
 *
 * O `trioaveslend` foi descartado: nenhum dos três cortes ficou bom, e uma arte
 * que não funciona em corte nenhum é uma arte que não entra. */
export const BANNERS = [
  { id:'articunosea',    nm:'Mar de Gelo',        arq:'banner_articunosea.jpg',    y:0.12 },
  { id:'cybermewtwo',    nm:'Cyber',              arq:'banner_cybermewtwo.jpg',    y:0.12 },
  { id:'forestmewtwo',   nm:'Floresta',           arq:'banner_forestmewtwo.jpg',   y:0.12 },
  { id:'moltres',        nm:'Voo de Fogo',        arq:'banner_moltres.jpg',        y:0.24 },
  { id:'triomewtwo',     nm:'Escadaria',          arq:'banner_triomewtwo.jpg',     y:0.12 },
  { id:'trioinicial',    nm:'Os Iniciais',        arq:'banner_trioinicial.gif',    y:0.12, vivo:true },
  { id:'moltresash',     nm:'Céu em Chamas',      arq:'banner_moltresash.jpg',     y:0.37 },
  { id:'evee',           nm:'Campo Dourado',      arq:'banner_evee.gif',           y:0.50, vivo:true },
  { id:'gengarbus',      nm:'Chuva na Floresta',  arq:'banner_gengarbus.gif',      y:0.50, vivo:true },
  { id:'gengarquadro',   nm:'Cidade Assombrada',  arq:'banner_gengarquadro.gif',   y:0.50, vivo:true },
  { id:'gyradoscachoeira', nm:'Cachoeira',        arq:'banner_gyradoscachoeira.jpg', y:0.50 },
  { id:'trioaveslend2',  nm:'As Três em Voo',     arq:'banner_trioaveslend2.gif',  y:0.50, vivo:true },
  { id:'zapdos',         nm:'Tempestade',         arq:'banner_zapdos.jpg',         y:0.50 },
  { id:'chopechoke',     nm:'Guardiões da Colina', arq:'banner_chopechoke.jpg',    y:0.50 },
];

/* A PARTIR DA RAIZ DO REPOSITÓRIO, sem `../`. Quem resolve contra o documento é
   quem monta o `src`, porque só ele sabe de onde está resolvendo — é o mesmo
   contrato do `arquivoAvatar` no `acervo-dados.mjs`, e misturar os dois deu um
   caminho com `../../` na primeira tentativa. */
export const arquivoArte = a => `${DIR_ARTES}/${a.arq}`;

/* Mesma guarda dos outros catálogos (S70): id que não existe mais cai no padrão
   em vez de deixar a tela sem arte. Chega aqui perfil de versão antiga e
   `localStorage` adulterado. */
export function arteValida(lista, id) {
  return lista.find(x => x.id === id) ?? lista[0];
}
