/* AVATARES DE TREINADOR — catálogo puro e o endereço de cada um.
 *
 * Separado da tela de customização porque três lados precisam dele e nenhum
 * deles pode arrastar DOM: a customização (que escolhe), o perfil (que resolve
 * o avatar atual) e `tools/baixar-assets.mjs`, que roda no Node e precisa saber
 * o que baixar.
 *
 * FOI O PORTÃO DE EGRESSO FECHADO QUE FORÇOU ISTO, e vale registrar como.
 * Até o V1.15 `trainerURL` devolvia o endereço do Showdown cru, sem cascata, e
 * o baixador não conhecia esta família. O vazamento existia desde sempre, mas
 * só era alcançável depois do login — o teste do F0.12 abre o jogo sem sessão,
 * então nunca chegava a pedir um avatar. O banner de batalha do V1.15 passou a
 * desenhar o avatar já no boot, e as quatro requisições apareceram.
 *
 * É a lição do F0.12 outra vez: dependência que ninguém exercita não é
 * dependência ausente, é dependência que ainda não foi vista.
 */
/* D-009 · TRÊS DESTES DEZESSEIS NUNCA EXISTIRAM no endereço usado.
 * `leaf`, `agatha` e `lorelei` respondem 404 no Showdown; os arquivos estão lá
 * sob `leaf-gen3`, `agatha-gen1` e `lorelei-gen1`. O código antigo escondia
 * isso: o `<img>` tinha `onerror="this.closest('.opt').remove()"`, então a
 * opção quebrada simplesmente sumia da grade. Ninguém via erro, e ninguém via
 * os três avatares — a tela mostrava treze e prometia dezesseis.
 *
 * Corrigido para o MESMO personagem em outro endereço, nunca outro personagem:
 * é a regra do resgate do CLAUDE.md, e a diferença aqui é literal.
 */
export const TRAINER_AVATARS = [
  {id:'red',      nm:'Red'},      {id:'blue',     nm:'Blue'},
  {id:'leaf-gen3',nm:'Leaf'},     {id:'lance',    nm:'Lance'},
  {id:'brock',    nm:'Brock'},    {id:'misty',    nm:'Misty'},
  {id:'erika',    nm:'Erika'},    {id:'sabrina',  nm:'Sabrina'},
  {id:'koga',     nm:'Koga'},     {id:'blaine',   nm:'Blaine'},
  {id:'giovanni', nm:'Giovanni'}, {id:'ltsurge',  nm:'Surge'},
  {id:'oak',      nm:'Oak'},      {id:'agatha-gen1',nm:'Agatha'},
  {id:'bruno',    nm:'Bruno'},    {id:'lorelei-gen1',nm:'Lorelei'},
];

/* O endereço de ORIGEM. Quem monta o `<img>` passa por `candidatos()` para pôr
   a cópia local na frente — ver `assets.mjs`. */
export const urlTreinadorOrigem = id =>
  `https://play.pokemonshowdown.com/sprites/trainers/${id}.png`;
