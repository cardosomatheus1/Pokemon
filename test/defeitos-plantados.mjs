/* A LISTA DE DEFEITOS PLANTADOS — Q2.
 *
 * Separada de `sabotagem.mjs` para que ela possa ser LIDA sem ser EXECUTADA.
 * O runner é um script com efeito colateral (monta caixas de areia, roda a
 * suíte, apaga tudo); importá-lo de um teste rodaria o portão inteiro.
 *
 * Quem lê esta lista sem executá-la:
 *   test/ancoras.mjs   confere que cada defeito ainda tem onde ser plantado
 *   test/portao.mjs    roda essa conferência como teste, a cada suíte
 *
 * Antes desta separação, defeito com âncora perdida só aparecia depois de doze
 * minutos de sandbox — e apareceu, no V1.14, com o S15.
 *
 * REGRAS DE UM DEFEITO (BUILD_BLOCKS §4):
 *   1. plausível — trocar um sinal, inverter uma comparação, remover uma
 *      checagem. Apagar função inteira não prova nada.
 *   2. `de` tem que existir EXATAMENTE UMA VEZ no arquivo. Zero vezes é
 *      defeito decorativo; duas vezes planta no lugar errado sem avisar.
 *   3. `de` e `para` diferentes — senão a suíte roda inteira para provar zero.
 */
const MOTOR  = 'engine/engine.mjs';
const APP    = 'app/index.html';
const ESTADO = 'app/modules/estado.mjs';
const RENDER = 'app/modules/render.mjs';
const DOM    = 'app/modules/dom.mjs';
const EFEITOS= 'app/modules/efeitos.mjs';
const COREO  = 'app/modules/coreografia.mjs';
const SPRITES= 'app/modules/sprites.mjs';
const LIGACAO= 'app/modules/motor.mjs';
const PACK   = 'content/pokemon_kanto_v1.mjs';
const VALID  = 'engine/pack.mjs';
const SEMENTE= 'engine/seed.mjs';
const FASES  = 'app/modules/fases.mjs';
const PRECO  = 'engine/preco.mjs';
const CLIMA  = 'app/modules/clima.mjs';
const EXPO   = 'engine/exposicao.mjs';
const PAINEL = 'app/modules/odds.mjs';
const BOLSO  = 'engine/carteira.mjs';
const BANCO  = 'app/modules/banco.mjs';
const INFO   = 'test/informacao.mjs';
const ASSETS = 'app/modules/assets.mjs';
const FX     = 'app/modules/efeitos.mjs';
const COMMIT = 'engine/commit.mjs';
const TELEM  = 'app/modules/telemetria.mjs';
const PROGR  = 'app/modules/progressao.mjs';
const TEMA   = 'app/modules/tema.mjs';
const ARENAD = 'app/modules/arenas-dados.mjs';
const ANCORAS= 'test/ancoras.mjs';
const ODDS   = 'app/modules/odds.mjs';
const APOSTA = 'app/modules/aposta.mjs';
const EXPOENG= 'engine/exposicao.mjs';
const KILLF  = 'app/modules/killfeed.mjs';
const COLOC  = 'app/modules/colocacao.mjs';
const BANNERD= 'app/modules/banner-dados.mjs';
const SHINYD = 'app/modules/shiny-dados.mjs';
const ADMD   = 'app/modules/adm-dados.mjs';
const SIMS   = 'app/modules/sims.mjs';
const VISUAL = 'test/visual.mjs';
const RUNNER = 'test/run.mjs';
const ARENAP = 'app/modules/arenas.mjs';

export const DEFEITOS = [
  /* Desde o F0.4 a tabela de tipos é DADO DO PACK, não do motor. O defeito é o
     mesmo; o arquivo mudou de lado, e é isso que a Content Layer significa. */
  { id:'S1', arquivo:PACK, nome:'tabela de tipos invertida',
    real:'alguém "corrige" uma entrada e inverte a relação Fogo/Água',
    de:'fire:{fire:.5,water:.5', para:'fire:{fire:.5,water:2' },

  { id:'S2', arquivo:MOTOR, nome:'taxa de crítico 8x maior',
    real:'constante de balanceamento trocada por engano',
    de:'CRIT:         0.0625', para:'CRIT:         0.5' },

  { id:'S3', arquivo:MOTOR, nome:'golpe nunca erra',
    real:'checagem de precisão removida numa refatoração',
    de:'const miss = R() >', para:'const miss = false && R() >' },

  { id:'S4', arquivo:MOTOR, nome:'dano fixo em vez de calculado',
    real:'valor de teste esquecido no lugar da fórmula',
    de:'return {dmg: Math.max(1, Math.round(dmg)), eff, crit};',
    para:'return {dmg: 42, eff, crit};' },

  { id:'S5', arquivo:MOTOR, nome:'último lutador da pool nunca age',
    real:'erro de limite em laço',
    de:'let k = -1, best = Infinity;\n    for (let i=0;i<n;i++)',
    para:'let k = -1, best = Infinity;\n    for (let i=0;i<n-1;i++)' },

  { id:'S6', arquivo:MOTOR, nome:'multiplicador de vida alterado',
    real:'ajuste de ritmo aplicado sem medir',
    de:'HP_MULT:      2.1', para:'HP_MULT:      2.6' },

  /* --- defeitos novos do F0.2 ------------------------------------------- */
  { id:'S7', arquivo:MOTOR, nome:'D-001 revertido',
    real:'alguém "simplifica" o desempate de volta para dentro de hits',
    de:'          if (beforePct > ultimoPct){ ultimoPct = beforePct; ultimoIdx = i; }\n',
    para:'' },

  { id:'S8', arquivo:MOTOR, nome:'desempate da tempestade escolhe o mais ferido',
    real:'comparação invertida no desempate',
    de:'if (beforePct > ultimoPct)', para:'if (beforePct < ultimoPct)' },

  { id:'S9', arquivo:APP, nome:'cópia divergente do motor no app',
    real:'alguém cola de volta uma função do motor "só para testar"',
    de:'<script type="module">',
    para:'<script type="module">\nfunction damageOf(A,D,mv,R){ return {dmg:1,eff:1,crit:false}; }' },

  { id:'S10', arquivo:LIGACAO, nome:'a ligação deixa de importar o motor',
    real:'import removido durante um merge',
    de:"} from '../../engine/engine.mjs';", para:"} from '../../engine/copia-local.mjs';" },

  /* --- defeitos do F0.3a: a fronteira de estado ------------------------- */
  { id:'S11', arquivo:APP, nome:'estado compartilhado volta a ser variável de topo',
    real:'alguém "simplifica" S.champ de volta para uma variável solta',
    de:"import { S } from './modules/estado.mjs';",
    para:"import { S } from './modules/estado.mjs';\nlet champ = -1;" },

  { id:'S12', arquivo:ESTADO, nome:'estado.mjs deixa de ser inerte',
    real:'alguém inicializa a carteira direto no módulo de estado',
    de:'  carteira: null,', para:"  carteira: JSON.parse(localStorage.getItem('ar_carteira') || 'null')," },

  { id:'S13', arquivo:ESTADO, nome:'campo some da superfície declarada',
    real:'remoção de campo durante refatoração, sem atualizar quem lê',
    de:'  champ:    -1,', para:'' },

  { id:'S14', arquivo:ESTADO, nome:'superfície cresce sem justificativa',
    real:'estado local promovido a global "só por enquanto"',
    de:'  profile:  null,', para:'  profile:  null,\n  cacheQualquer: {},' },

  /* --- defeitos do F0.3b: o grafo de módulos ---------------------------- */
  /* Este defeito morava no `render.mjs` até o V1.14, que tirou de lá o desenho
     semeado — a ilha virou uma das cinco pinturas de `arenas.mjs`, e com ela o
     `rng`. O bloco quase deixou um defeito sem âncora: ele continuaria na
     lista, verde, provando nada. Realvo para o módulo que hoje usa o símbolo. */
  { id:'S15', arquivo:ARENAP, nome:'módulo usa símbolo do motor sem importar',
    real:'import perdido num merge — foi exatamente o que aconteceu ao extrair',
    de:"import { rng } from './motor.mjs';\n", para:'' },

  { id:'S16', arquivo:DOM, nome:'dependência invertida entre camadas',
    real:'utilidade de DOM passa a puxar render "só para uma coisinha"',
    de:'/* Utilidades de DOM.',
    para:"import { W } from './render.mjs';\n/* Utilidades de DOM." },

  { id:'S17', arquivo:APP, nome:'app deixa de importar um módulo de apresentação',
    real:'linha de import removida sem querer',
    de:"} from './modules/clima.mjs';", para:"} from './modules/clima-antigo.mjs';" },

  /* --- defeitos do F0.3c: mutação através de fronteira ------------------ */
  { id:'S18', arquivo:EFEITOS, nome:'módulo atribui a símbolo importado',
    real:'atalho para "guardar" estado de outro módulo — TypeError em execução',
    de:"function pushFx(o){", para:"function pushFx(o){\n  W = 1;" },

  { id:'S19', arquivo:SPRITES, nome:'infraestrutura passa a depender de aplicação',
    real:'import de conveniência que inverte o grafo e some no code review',
    de:"import { S } from './estado.mjs';",
    para:"import { S } from './estado.mjs';\nimport { valorAposta } from './carteira.mjs';" },

  /* --- defeito do F0.3d: mudança visual não intencional ------------------ */
  { id:'S20', arquivo:APP, nome:'cor do tema alterada sem intenção',
    real:'ajuste de CSS que ninguém revisou; nenhuma suíte de lógica vê',
    de:'  --gold:     #00e5ff;', para:'  --gold:     #7f4dff;' },

  /* --- defeitos do F0.4: a Content Layer -------------------------------- */
  { id:'S21', arquivo:PACK, nome:'espécie perde um tipo',
    real:'edição de dado do pack — a classe de erro que a Content Layer cria',
    de:"{dex:6,n:'charizard',t:['fire','flying']", para:"{dex:6,n:'charizard',t:[]" },

  { id:'S22', arquivo:VALID, nome:'espécie sem moveset possível passa pela validação',
    real:'checagem "toda espécie alcança um pool" removida por parecer redundante',
    de:"    for (const p of pack.especies ?? [])\n      exigir(p.t?.some(",
    para:"    for (const p of pack.especies ?? [])\n      exigir(true || p.t?.some(" },

  { id:'S23', arquivo:MOTOR, nome:'identificador da franquia hard-coded fora do pack',
    real:'atalho para um caso especial: "só este Pokémon precisa disso"',
    de:'function sortearPool(pack, elenco, sementeElenco){',
    para:"function sortearPool(pack, elenco, sementeElenco){\n  const favorito = 'pikachu';" },

  { id:'S24', arquivo:VALID, nome:'validação de pack aceita elenco menor que a arena',
    real:'limite afrouxado para deixar um pack de teste passar',
    de:'exigir(pack.elenco.length >= 12,', para:'exigir(pack.elenco.length >= 1,' },

  /* --- defeitos do F0.5: a árvore de sementes --------------------------- */
  { id:'S25', arquivo:MOTOR, nome:'um Math.random volta ao caminho da rodada',
    real:'"só um embaralhamento, não muda nada" — foi assim que o protótipo ficou irreconstituível',
    de:'  for (let i=src.length-1;i>0;i--){ const j = R()*(i+1)|0;',
    para:'  for (let i=src.length-1;i>0;i--){ const j = Math.random()*(i+1)|0;' },

  { id:'S26', arquivo:SEMENTE, nome:'duas derivações caem na mesma sub-seed',
    real:'rótulo ignorado numa refatoração — elenco e batalha passam a correlacionar',
    de:'  return misturar(misturar(raiz >>> 0) ^ hashRotulo(String(rotulo)));',
    para:'  return misturar(misturar(raiz >>> 0));' },

  { id:'S27', arquivo:SEMENTE, nome:'a árvore passa a derivar por posição',
    real:'"o índice é mais barato que o hash do rótulo" — e aí um ramo novo reescreve as rodadas antigas',
    de:'  for (const r of RAMOS) out[r] = derivar(raiz, r);',
    para:'  RAMOS.forEach((r, i) => { out[r] = derivar(raiz, String(i)); });' },

  { id:'S28', arquivo:SEMENTE, nome:'a raiz passa a sair do relógio',
    real:'CSPRNG trocado por algo "que sempre existe" — e a raiz vira adivinhável',
    de:'  return c.getRandomValues(new Uint32Array(1))[0] >>> 0;',
    para:'  return (Date.now() * 65537) >>> 0;' },

  { id:'S29', arquivo:PRECO, nome:'o Monte Carlo volta a sortear sozinho',
    real:'sub-seed derivada trocada por semente solta — o preço deixa de ser auditável',
    de:"    const w = M.simular(f, derivarIndice(raiz, 'simulacao', i), false);",
    para:'    const w = M.simular(f, (Math.random()*4294967296)>>>0, false);' },

  { id:'S31', arquivo:PRECO, nome:'a sub-seed da simulação vem da posição no lote',
    real:'"o índice do laço serve" — e aí o preço passa a depender do tamanho da fatia',
    de:"    const w = M.simular(f, derivarIndice(raiz, 'simulacao', i), false);\n    if (w >= 0) wins[w]++;",
    para:"    const w = M.simular(f, derivarIndice(raiz, 'simulacao', i - de), false);\n    if (w >= 0) wins[w]++;" },

  { id:'S32', arquivo:PRECO, nome:'a suavização de Laplace some',
    real:'"o +1 não faz diferença com 20.000 simulações" — até alguém não vencer nenhuma',
    de:'    const prob = (wins[i] + 1) / (sims + n);', para:'    const prob = wins[i] / sims;' },

  { id:'S30', arquivo:FASES, nome:'a batalha usa a sub-seed do elenco',
    real:'ramo trocado por engano — batalha e sorteio deixam de ser independentes',
    de:'  const seed = S.seeds.batalha;', para:'  const seed = S.seeds.elenco;' },

  /* --- defeitos do F0.6: o clima dentro do preço ------------------------ */
  { id:'S33', arquivo:PRECO, nome:'o preço volta a sair de stats crus',
    real:'"o clima é surpresa, não deve entrar no preço" — o argumento que custou 15 pontos de margem',
    de:'    const f = clima.type ? M.aplicarClima(fighters, clima) : fighters;',
    para:'    const f = fighters;' },

  { id:'S34', arquivo:PRECO, nome:'o preço usa uma distribuição de clima diferente da luta',
    real:'sub-seed de ambiente fixa numa refatoração — todas as simulações veem o mesmo clima',
    de:"    const clima = M.sortearClima(derivarIndice(raiz, 'ambiente', i), tipos);",
    para:"    const clima = M.sortearClima(derivarIndice(raiz, 'ambiente', 0), tipos);" },

  { id:'S35', arquivo:CLIMA, nome:'o clima é revelado antes de as apostas fecharem',
    real:'selo mostrado cedo demais — o apostador passa a ver o bônus antes de escolher',
    de:"function hideWeatherBadge(){ $('#weatherBadge').classList.remove('show','pop'); }",
    para:"function hideWeatherBadge(){ $('#weatherBadge').classList.add('show'); }" },

  { id:'S36', arquivo:MOTOR, nome:'D-003 revertido: o corte duro volta a ser suave',
    real:'alguém "simplifica" o descarte da ação agendada além do corte',
    de:'    if (best >= CONF.MAX_TIME){ t = CONF.MAX_TIME; break; }\n\n',
    para:'' },

  /* --- defeitos do F0.7: o estimador ------------------------------------ */
  { id:'S37', arquivo:MOTOR, nome:'a amostra do Monte Carlo volta a 20.000',
    real:'"150 mil é exagero, ninguém vai notar" — o argumento que subdimensiona a cauda em 8x',
    de:'  SIMS:         154000,', para:'  SIMS:         20000, ' },

  { id:'S38', arquivo:PRECO, nome:'a odd é arredondada para cima em vez de receber a margem',
    real:'"arredondar para cima é mais generoso" — e a margem da casa vira negativa',
    de:'    const bruta = justa * (1 - margem);', para:'    const bruta = Math.ceil(justa);' },

  { id:'S39', arquivo:PRECO, nome:'o erro relativo é publicado com a fórmula errada',
    real:'sqrt esquecido — o campo continua existindo e passa a mentir',
    de:'    const erroRelativo = Math.sqrt((1 - prob) / (sims * prob));',
    para:'    const erroRelativo = (1 - prob) / (sims * prob);' },

  { id:'S40', arquivo:PRECO, nome:'o registro perde a versão do motor',
    real:'campo removido por parecer inútil — e o preço deixa de ser auditável meses depois',
    de:'    versaoMotor: M.versao,', para:'    versaoMotor: null,' },

  { id:'S41', arquivo:MOTOR, nome:'volta um teto de odd, sem aparecer na interface',
    real:'"limita o passivo" — e transforma 8% de margem em 68% no azarão, calado',
    de:'  ODD_MAX:      null,', para:'  ODD_MAX:      20,  ' },

  /* --- defeitos do F0.8: os tetos de exposição -------------------------- */
  { id:'S42', arquivo:EXPO, nome:'o teto por ticket é afrouxado em 1',
    real:'"um a mais não faz diferença" — o clássico erro de limite, e o passivo estoura',
    de:'  if (valor <= limite)', para:'  if (valor <= limite + 1)' },

  { id:'S43', arquivo:EXPO, nome:'a confirmação deixa de reconferir o passivo',
    real:'"a avaliação já checou" — e duas confirmações no último instante furam o teto',
    de:'  if (passivo[idx] + payout > passivo.teto) return false;', para:'' },

  { id:'S44', arquivo:EXPO, nome:'o corte vira recusa silenciosa',
    real:'mensagem esvaziada numa limpeza — o jogador vê a aposta encolher sem saber por quê',
    de:'  return { aceito: true, valor: limite, cortado: true, motivo, mensagem, limite };',
    para:"  return { aceito: true, valor: limite, cortado: false, motivo, mensagem: '', limite };" },

  { id:'S45', arquivo:PRECO, nome:'o stake máximo é arredondado para cima',
    real:'"floor perde centavos" — e cada ticket passa alguns PC do teto',
    de:'      stakeMax: Math.floor(M.CONF.MAX_PAYOUT_POR_TICKET / (+comTeto.toFixed(2))),',
    para:'      stakeMax: Math.ceil(M.CONF.MAX_PAYOUT_POR_TICKET / (+comTeto.toFixed(2))),' },

  { id:'S46', arquivo:EXPO, nome:'o passivo da rodada vira soma em vez de pior caso',
    real:'"somar é mais conservador" — fecha mercado sem necessidade e mede risco errado',
    de:'  let pior = 0;\n  for (const v of passivo) if (v > pior) pior = v;\n  return pior;',
    para:'  let soma = 0;\n  for (const v of passivo) soma += v;\n  return soma;' },

  { id:'S47', arquivo:PAINEL, nome:'o limite some da lista de apostas',
    real:'coluna removida por "poluir a tela" — e o teto passa a existir só na recusa',
    de:"      <span class=\"lim tiny\">${fechado ? 'mercado fechado'\n        : `até ${CUR} ${cabe.toLocaleString('pt-BR')}`}</span>\n",
    para:'' },

  /* --- defeitos do F0.9: a carteira e o ledger -------------------------- */
  { id:'S48', arquivo:BOLSO, nome:'payout de aposta em bônus cai no bucket transferível',
    real:'"é tudo saldo" — e a Arena vira conversor de bônus gratuito em dinheiro sacável',
    de:"    bonus:        'BET_PAYOUT_BONUS',", para:"    bonus:        'BET_PAYOUT_TRANSFERABLE'," },

  { id:'S49', arquivo:BOLSO, nome:'saldo pode ficar negativo',
    real:'checagem removida por "nunca acontece" — e acontece na primeira troca de aposta',
    de:'        return { ok: false, motivo: `${conta}.${b} ficaria em ${proposta[conta][b]}` };',
    para:'        void 0;' },

  { id:'S50', arquivo:BOLSO, nome:'o saldo muda sem entrada no ledger',
    real:'atalho de performance — e a reconciliação deixa de significar qualquer coisa',
    de:'  w.ledger.push(entrada);', para:'  void entrada;' },

  { id:'S51', arquivo:BOLSO, nome:'a reconciliação para de conferir a sequência',
    real:'"a sequência é redundante" — e apagar uma entrada do ledger passa a ser invisível',
    de:"    if (e.seq !== ++seq) problemas.push(`sequência quebrada: esperava ${seq}, veio ${e.seq}`);",
    para:'    ++seq;' },

  { id:'S52', arquivo:BOLSO, nome:'a ordem de consumo gasta o transferível primeiro',
    real:'ordem invertida numa refatoração — o saldo do jogador queima antes do bônus',
    de:"export const ORDEM_CONSUMO = ['bonus', 'competitivo', 'transferivel'];",
    para:"export const ORDEM_CONSUMO = ['transferivel', 'competitivo', 'bonus'];" },

  { id:'S53', arquivo:BANCO, nome:'o boot deixa de reconciliar a carteira',
    real:'"o arquivo é nosso, confia" — e saldo adulterado entra sem ninguém ver',
    de:'  if (!rec.ok) reconstruir(w);', para:'' },

  /* --- defeitos do F0.11: o canal de informação ------------------------- */
  { id:'S54', arquivo:MOTOR, nome:'o clima deixa de ser filtrado pela pool',
    real:'filtro removido por "a tabela já é a distribuição certa" — e volta a sair clima sem ninguém para buffar',
    de:"  const elegiveis = tiposPresentes\n    ? tabela.filter(c => !c.type || tiposPresentes.has(c.type))\n    : tabela;",
    para:'  const elegiveis = tabela;' },

  { id:'S55', arquivo:PRECO, nome:'o preço deixa de condicionar o clima à pool',
    real:'parâmetro esquecido — preço e luta voltam a ver distribuições diferentes',
    de:"    const clima = M.sortearClima(derivarIndice(raiz, 'ambiente', i), tipos);",
    para:"    const clima = M.sortearClima(derivarIndice(raiz, 'ambiente', i));" },

  { id:'S56', arquivo:INFO, nome:'o apostador bayesiano recebe o clima real',
    real:'atalho no teste — a medição passa a provar o oposto do que diz medir',
    de:'    const post = posterior(tabela, pool);',
    para:'    const post = CLIMAS.map(c => ({ key: c.key, p: c.key === climaReal.key ? 1 : 0 }));' },

  /* --- defeitos do F0.12: a cascata de asset ---------------------------- */
  { id:'S57', arquivo:ASSETS, nome:'a cascata começa pela rede, não pelo disco',
    real:'ordem invertida numa arrumação — o jogo sai para fora com o arquivo em disco',
    de:'  return [base + caminhoLocal(url), url, ...(espelho ? [espelho] : [])];',
    para:'  return [url, base + caminhoLocal(url), ...(espelho ? [espelho] : [])];' },

  { id:'S58', arquivo:ASSETS, nome:'o resgate busca OUTRA arte',
    real:'"qualquer sprite serve, é só um efeito" — foi o erro que custou três versões na v0.6.1',
    de:'export function candidatos(url, espelho, base = \'../\') {',
    para:"export function candidatos(url, espelho, base = '../') {\n  espelho = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/0001/Walk-Anim.png';" },

  { id:'S59', arquivo:FX, nome:'a folha de efeito volta a ir direto para a rede',
    real:'cascata desfeita ao mexer no CORS — 70 requisições por rodada voltam a sair',
    de:'  const lista = candidatos(FX_BASE + path, FX_ESPELHO + path);',
    para:'  const lista = [FX_BASE + path, FX_ESPELHO + path];' },

  /* --- defeitos do F0.10: commit-reveal, telemetria, critério de saída --- */
  { id:'S60', arquivo:COMMIT, nome:'o commit é publicado sem sal',
    real:'"o SHA-256 já protege" — e com raiz de 32 bits ele é invertível em segundos',
    de:"  if (typeof sal !== 'string' || sal.length < TAM_SAL * 2)",
    para:"  if (false && typeof sal !== 'string')" },

  { id:'S61', arquivo:COMMIT, nome:'o pacote público carrega a raiz',
    real:'campo a mais "para facilitar o debug" — e o compromisso entrega o que devia esconder',
    de:"  return { publico: { commit: await comprometer(raiz, sal), esquema: 'SHA256|v1' },",
    para:"  return { publico: { commit: await comprometer(raiz, sal), esquema: 'SHA256|v1', raiz }," },

  { id:'S62', arquivo:COMMIT, nome:'o sal é fixo entre rodadas',
    real:'"gerar sal toda rodada é caro" — e uma tabela pré-computada quebra todos os commits',
    de:'  return hex(c.getRandomValues(new Uint8Array(TAM_SAL)));',
    para:"  return 'a'.repeat(TAM_SAL * 2);" },

  { id:'S63', arquivo:COMMIT, nome:'a conferência aceita qualquer commit',
    real:'comparação frouxa numa refatoração — o reveal deixa de provar coisa alguma',
    de:'  return dif === 0;', para:'  return true;' },

  { id:'S64', arquivo:TELEM, nome:'um evento do §4.7 some da lista',
    real:'limpeza de "evento que ninguém usa" — e a pergunta que ele responderia fica sem dado',
    de:"  'result_viewed', 'profile_opened', 'wallet_opened', 'challenge_completed',",
    para:"  'result_viewed', 'profile_opened', 'wallet_opened'," },

  { id:'S65', arquivo:TELEM, nome:'o evento sai sem a rodada',
    real:'campo comum esquecido — o evento existe e não responde nada',
    de:'    rodada: S.seeds ? S.seeds.raiz.toString(16) : null,', para:'' },

  { id:'S66', arquivo:TELEM, nome:'a telemetria passa a identificar o dispositivo',
    real:'"é só para segmentar melhor" — e classe de dispositivo vira impressão digital',
    de:"  const w = globalThis.innerWidth || 0;",
    para:"  const w = globalThis.innerWidth || 0; const ua = globalThis.navigator?.userAgent;" },

  /* --- defeito do porte da v1.0 ----------------------------------------- */
  { id:'S67', arquivo:PROGR, nome:'D-006 revertido: a barra do treinador novo volta a ser negativa',
    real:'alguém "simplifica" o piso do nível 1 de volta para a fórmula pura',
    de:'const xpParaNivel = n => (n <= 1 ? 0 : Math.floor(100 * Math.pow(n, 1.5)));',
    para:'const xpParaNivel = n => Math.floor(100 * Math.pow(n, 1.5));' },

  /* --- defeitos do V1.13: a identidade visual --------------------------- */
  { id:'S68', arquivo:APP, nome:'cor de acento volta a ser hex solto',
    real:'"é só um brilho, não vale token" — e a peça fica amarela no tema ciano',
    de:'.pick.sel{background:rgba(var(--goldRGB),.16);',
    para:'.pick.sel{background:rgba(245,197,66,.16);' },

  { id:'S69', arquivo:APP, nome:'o tema deixa de ser aplicado antes da primeira pintura',
    real:'script inline movido para o fim do body numa arrumação — e a página pisca',
    de:"  if (t === 'hyper' || t === 'shadow') document.documentElement.dataset.tema = t;",
    para:'  void t;' },

  { id:'S70', arquivo:TEMA, nome:'tema desconhecido deixa o site sem cor',
    real:'validação removida — localStorage adulterado ou tema retirado da lista derruba a pele',
    de:"export const temaValido = id => (TEMAS.some(t => t.id === id) ? id : PADRAO);",
    para:'export const temaValido = id => id;' },

  { id:'S71', arquivo:APP, nome:'uma variante para de definir um token',
    real:'token novo entra só no tema padrão — a outra variante herda em silêncio',
    de:'  --onAccent: #150826;', para:'' },

  { id:'S72', arquivo:TEMA, nome:'a escolha de tema deixa de ser guardada',
    real:'"salvar depois" — e o tema volta ao padrão a cada recarga',
    de:"  try { localStorage.setItem(CHAVE, t); } catch { /* modo privado: aplica sem guardar */ }",
    para:'  /* nada */' },

  { id:'S73', arquivo:ARENAD, nome:'a arena volta a sair de Math.random',
    real:'"é só cenário, não precisa de semente" — e a rodada deixa de ser reproduzível pela metade',
    de:"  const R = rng(derivar(sementeVisual, 'arena'));", para:'  const R = Math.random;' },

  { id:'S74', arquivo:ARENAD, nome:'a arena passa a andar junto com o enfeite',
    real:'rótulo trocado numa cópia — e acrescentar uma partícula muda a arena da rodada',
    de:"derivar(sementeVisual, 'arena')", para:"derivar(sementeVisual, 'enfeite')" },

  { id:'S75', arquivo:ARENAD, nome:'uma arena fica inalcançável',
    real:'peso zerado para "desativar temporariamente" — e ninguém nota que sumiu',
    de:"emoji:'🏛️', peso:20,", para:"emoji:'🏛️', peso:0," },

  { id:'S76', arquivo:ARENAP, nome:'uma arena fica sem pintura',
    real:'entrada apagada numa arrumação do mapa — a rodada abre com o cenário em branco',
    de:'  praia:    { estatico: praiaAreia,     fundo: marPraia     },', para:'' },

  /* Os dois seguintes são de LIGAÇÃO, e nenhum teste estático os alcança:
     o catálogo continua perfeito, o desenho continua correto, e o que quebra
     é o encaixe. É a lição do S30/S53/S65/S69 — quem pega é o navegador. */
  { id:'S77', arquivo:ARENAP, nome:'o selo de arena não acende',
    real:'linha perdida numa refatoração — a arena muda e o jogador não é avisado',
    de:"    b.classList.add('show');", para:'    /* nada */' },

  { id:'S78', arquivo:FASES, nome:'a arena sai do ramo errado da árvore',
    real:'`visual` trocado por `elenco` num autocompletar — tudo continua determinístico, e errado',
    de:'  arenaDaRodada(S.seeds.visual);', para:'  arenaDaRodada(S.seeds.elenco);' },

  /* O pré-voo é o portão do portão. Se ele deixar passar, a sabotagem inteira
     mente sobre a própria cobertura — e mente em VERDE, que é o pior jeito. */
  { id:'S79', arquivo:ANCORAS, nome:'o pré-voo deixa de contar as ocorrências da âncora',
    real:'"basta saber se existe" — e âncora que casa duas vezes planta no lugar errado calada',
    de:'    const n = src.split(d.de).length - 1;',
    para:'    const n = src.includes(d.de) ? 1 : 0;' },

  { id:'S80', arquivo:ANCORAS, nome:'o pré-voo aceita defeito que não altera nada',
    real:'checagem removida por parecer redundante — e a suíte roda duas vezes para provar zero',
    de:'    if (d.de === d.para) {', para:'    if (false && d.de === d.para) {' },

  { id:'S81', arquivo:ANCORAS, nome:'o filtro incremental esvazia em vez de devolver tudo',
    real:'"sem arquivo tocado, nada a testar" — e `git diff` vazio vira portão vazio, em verde',
    de:'  if (!arquivos || arquivos.length === 0) return defeitos.slice();',
    para:'  if (!arquivos || arquivos.length === 0) return [];' },

  /* Só o navegador pega: em paralelo, uma execução que some não reprova nada —
     ela simplesmente deixa de aparecer no relatório. */
  { id:'S82', arquivo:RUNNER, nome:'uma execução de navegador some do paralelo',
    real:'linha comentada para "testar mais rápido" e esquecida — o portão encolhe em silêncio',
    de:'    visual.rodarTemaSemModulos(),', para:'    Promise.resolve(null),' },

  /* ---------- V1.15: cancelar aposta ---------- */

  { id:'S83', arquivo:EXPOENG, nome:'liberar o passivo deixa saldo negativo',
    real:'`Math.max` removido por parecer defensivo demais — e passivo negativo é espaço que não existe',
    de:'  passivo[idx] = Math.max(0, passivo[idx] - valor * odd);',
    para:'  passivo[idx] = passivo[idx] - valor * odd;' },

  { id:'S84', arquivo:APOSTA, nome:'cancelar devolve o dinheiro e esquece o passivo',
    real:'"o passivo zera na próxima rodada" — e o mercado daquele lutador trava até lá',
    de:'  liberarTicket(S.passivo, idx, amount, odd);\n', para:'' },

  { id:'S85', arquivo:APOSTA, nome:'cancelar devolve o VALOR, não a composição',
    real:'assinatura confundida numa refatoração — e bônus vira transferível a cada cancelamento',
    de:"  devolverAposta(composicao, 'cancelamento');",
    para:"  devolverAposta([{ balde: 'transferivel', valor: amount }], 'cancelamento');" },

  { id:'S86', arquivo:FASES, nome:'a aposta volta a ser contada no clique',
    real:'D-008 revertido — trocar de lutador três vezes conta três apostas, e cancelada conta também',
    de:'  if (S.myBet) recordBetPlaced(S.myBet.amount, S.fighters[S.myBet.idx]);\n', para:'' },

  /* ---------- V1.15: colocação ---------- */

  { id:'S87', arquivo:COLOC, nome:'killstreak volta a contar como queda',
    real:'a checagem some numa simplificação — e alguém "cai" duas vezes, deslocando a colocação inteira',
    de:'    if (ev.streak) continue;\n', para:'' },

  { id:'S88', arquivo:COLOC, nome:'a queda por tempestade deixa de contar',
    real:'"morte sem autor não é queda" — e a colocação fica com buraco',
    de:'    if (ev.storm) { for (const h of ev.hits) if (h.ko) poe(h.i); continue; }',
    para:'    if (ev.storm) continue;' },

  /* REALVADO NO V1.16, e o motivo é o desenho ter melhorado. O defeito original
     tirava a ordem de quedas do gancho do abate, contando com a conferência do
     fim para "corrigir" — mas a lista única passou a derivar a colocação
     diretamente dos eventos, e o alvo deixou de existir.
     O risco NOVO é pior: derivar dos eventos INTEIROS em vez de só os já
     reproduzidos faz a lista mostrar a colocação FINAL durante a luta. Não é
     desalinhamento de tela — é vazar o vencedor antes da hora, no produto cujo
     §4.5 existe para provar que o resultado não é conhecido antes. */
  { id:'S89', arquivo:ODDS, nome:'a colocação ao vivo revela o resultado final',
    real:'`slice` esquecido numa simplificação — e a lista entrega o vencedor no primeiro segundo',
    de:'  const ordem = ordemDeQuedas(S.battle ? S.battle.events.slice(0, S.evPtr) : []);',
    para:'  const ordem = ordemDeQuedas(S.battle ? S.battle.events : []);' },

  /* ---------- V1.15: cosméticos ---------- */

  { id:'S90', arquivo:BANNERD, nome:'cosmético desconhecido deixa o banner sem pele',
    real:'validação removida — perfil de versão antiga abre com cenário inexistente',
    de:'  return lista.some(x => x.id === id) ? id : lista[0].id;',
    para:'  return id;' },

  { id:'S91', arquivo:SHINYD, nome:'desbloquear o mesmo shiny duas vezes gasta duas vagas',
    real:'checagem de duplicata removida — o jogador perde uma conquista sem nada avisar',
    de:'  if (s.gifs.includes(d)) return false;\n', para:'' },

  { id:'S92', arquivo:SHINYD, nome:'o shiny deixa de exigir vaga',
    real:'"é só cosmético" — e a progressão que o desbloqueio representa some',
    de:'  if (vagasLivres(perfil, nivel) < 1) return false;\n', para:'' },

  /* ---------- V1.15: painel de ADM e a margem da rodada (C1) ---------- */

  { id:'S93', arquivo:PRECO, nome:'a margem da rodada aceita qualquer número',
    real:'validação removida — um dedo a mais no campo do painel vira preço publicado',
    de:'  const margem = margemValida(opcoes?.margem, M.CONF.MARGIN);',
    para:'  const margem = opcoes?.margem ?? M.CONF.MARGIN;' },

  { id:'S94', arquivo:ADMD, nome:'margem ausente e margem zero se confundem',
    real:'`typeof` trocado por verdade/falsidade — e o painel zera a margem sem ninguém pedir',
    de:"  (conf && typeof conf.margem === 'number') ? conf.margem : undefined;",
    para:'  (conf && conf.margem) ? conf.margem : undefined;' },
  /* ---------- T2: a linha de base visual por região ---------- */

  { id:'S95', arquivo:VISUAL, nome:'a linha de base volta a comparar a tela inteira',
    real:'"uma região só é mais simples" — e um componente em paleta harmônica some na média',
    de:'export const GRADE = 8;', para:'export const GRADE = 1;' },

  { id:'S96', arquivo:VISUAL, nome:'o limite da linha de base é afrouxado em vez de afinado',
    real:'a saída mais fácil quando o portão reprova: subir o número até calar',
    de:'export const LIM_MEDIA_REGIAO = 2;', para:'export const LIM_MEDIA_REGIAO = 40;' },

  /* ---------- D-011: o número de simulações ---------- */

  { id:'S97', arquivo:SIMS, nome:'o número de simulações da tela vira constante redigitada',
    real:'foi exatamente assim que o D-011 nasceu — o F0.7 mudou CONF.SIMS e o texto ficou',
    de:'export const simsLongo = () => CONF.SIMS.toLocaleString(\'pt-BR\');',
    para:"export const simsLongo = () => '20.000';" },

  { id:'S98', arquivo:SIMS, nome:'o marcador do número de simulações nunca é preenchido',
    real:'laço removido numa limpeza — e a promessa de auditoria fica um buraco na página',
    de:'  for (const el of alvos)\n', para:'  for (const el of [])\n' },
];
