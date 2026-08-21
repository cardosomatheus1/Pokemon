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
const LOOPC  = 'app/modules/loop.mjs';
const APOSTAC= 'app/modules/aposta.mjs';
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
const SABOT  = 'test/sabotagem.mjs';
const ARNES  = 'test/harness.mjs';
const ARENAP = 'app/modules/arenas.mjs';
const SRV    = 'server/servidor.mjs';
const SRVROD = 'server/rodada.mjs';
const SRVCFG = 'server/config.mjs';
const SRVDB  = 'server/banco.mjs';
const SRVAUT = 'server/auth.mjs';
const SRVCAR = 'server/carteira.mjs';
const EMISSAO= 'engine/emissao.mjs';
const DESAF  = 'app/modules/desafios.mjs';
const SRVSCH = 'server/scheduler.mjs';
const SRVTRA = 'server/transporte.mjs';
const SRVAPO = 'server/aposta.mjs';
const SRVLIM = 'server/limites.mjs';
const SRVPRO = 'server/protecao.mjs';
const SRVROT = 'server/rotas.mjs';
const APIC   = 'app/modules/api.mjs';
const PTXT   = 'app/modules/protecao-texto.mjs';
const FECHO  = 'test/fecho.mjs';
const RESULT = 'engine/resultado.mjs';
const RESTELA= 'app/modules/resultado-tela.mjs';
const PROGSRV= 'server/progressao.mjs';
const TELESRV= 'server/telemetria.mjs';
const PACKV  = 'engine/pack.mjs';
const ORIGV1 = 'content/original_v1.mjs';
const ESCOLH = 'content/escolhido.mjs';
const ADMSRV = 'server/admin.mjs';
const CARTEIRA= 'app/modules/carteira.mjs';
const NAVEG  = 'app/modules/navegacao.mjs';
const RODADA = 'app/modules/rodada.mjs';
const SRVLAC = 'server/laco.mjs';
const SALAC  = 'app/modules/sala.mjs';
const CONTXT = 'app/modules/conexao-texto.mjs';
const MODOSRV= 'app/modules/modo-servidor.mjs';

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

  /* REALVADO NO F1.15: a raiz passou de 32 para 128 bits, e o trecho mudou de
     forma. O defeito segue o COMPORTAMENTO — raiz saindo do relógio — e não o
     endereço antigo. O `para` produz hex de 32 caracteres para que o defeito
     seja pego pela imprevisibilidade, e não por um erro de formato. */
  { id:'S28', arquivo:SEMENTE, nome:'a raiz passa a sair do relógio',
    real:'CSPRNG trocado por algo "que sempre existe" — e a raiz vira adivinhável',
    de:'  const p = c.getRandomValues(new Uint32Array(PALAVRAS_RAIZ));',
    para:'  const p = [Date.now() >>> 0, 0, 0, 0];' },

  { id:'S242', arquivo:SEMENTE, nome:'a raiz larga volta a caber em 32 bits',
    real:'"um número basta" — e o D-018 inteiro volta: a pool publicada determina a raiz de novo',
    de:'const PALAVRAS_RAIZ = BITS_RAIZ / 32;',
    para:'const PALAVRAS_RAIZ = 1;' },

  { id:'S243', arquivo:SEMENTE, nome:'a raiz larga é estreitada na árvore de sementes',
    real:'`raiz >>> 0` numa raiz em hex devolve 0 — toda rodada nasce com a mesma árvore',
    de:"  const out = { raiz: typeof raiz === 'string' ? raiz : raiz >>> 0 };",
    para:'  const out = { raiz: raiz >>> 0 };' },

  { id:'S244', arquivo:SEMENTE, nome:'o ramo largo deixa de ser hash e volta a ser bijetivo',
    real:'"misturar é mais barato" — e publicar um ramo devolve a raiz em O(1)',
    de:'  const v = sha256Palavras(chave)[0] >>> 0;',
    para:'  const v = misturar(misturar(raiz.length) ^ hashRotulo(chave));' },

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

  /* REALVADO NO V1.20: a coluna continua no mesmo lugar, o texto é que mudou —
     `até 9.505` virou `stake máx 9.505` porque "até" lia como teto de PRÊMIO.
     O defeito é o mesmo (a coluna some), a âncora é que acompanhou o texto. */
  { id:'S47', arquivo:PAINEL, nome:'o limite some da lista de apostas',
    real:'coluna removida por "poluir a tela" — e o teto passa a existir só na recusa',
    de:"        fechado ? 'mercado fechado'\n        : `máx ${cabe.toLocaleString('pt-BR')}`}</span>\n",
    para:"        ''}</span>\n" },

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
    de:'    rodada: S.rodadaId ?? (S.seeds?.raiz != null ? S.seeds.raiz.toString(16) : null),', para:'' },

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
  /* ---------- V1.20: o acabamento da tela principal (L-030, L-027) ---------- */

  { id:'S99', arquivo:APOSTA, nome:'a chamada central ignora a aposta confirmada',
    real:'"é só um texto fixo" — e a tela manda escolher com a aposta já feita',
    de:'  if (S.myBet){\n    const f = S.fighters[S.myBet.idx];',
    para:'  if (false){\n    const f = S.fighters[S.myBet.idx];' },

  { id:'S100', arquivo:FASES, nome:'a grade de vida fica acesa na fase de aposta',
    real:'condição invertida — doze barras verdes em 100% roubam a primeira fixação',
    de:"  $('#hud')?.classList.toggle('dormindo', s === 'betting');",
    para:"  $('#hud')?.classList.toggle('dormindo', s !== 'betting');" },

  /* A faixa de coluna é UMA, com dois textos. Os dois defeitos apagam um lado
     cada: com a faixa vazia numa fase, `17,5 %` de chance e `91 %` de vida
     voltam a ocupar o mesmo lugar sem nada dizendo qual é qual. */
  { id:'S101', arquivo:ODDS, nome:'a faixa de coluna some da fase de aposta',
    real:'"o título já diz quem vence" — e 17,5% de chance vira irmão de 91% de vida',
    de:'<span class="c2">chance</span>', para:'<span class="c2"></span>' },

  { id:'S102', arquivo:ODDS, nome:'a faixa de coluna some da luta',
    real:'idem, do outro lado — e é o lado em que a leitura otimista acontece',
    de:'<span class="c2">vida</span>', para:'<span class="c2"></span>' },

  { id:'S103', arquivo:ARENAD, nome:'o véu da arena passa do teto',
    real:'"assim une melhor" — e come o contraste entre o lutador e o piso',
    de:"brilho:'#ff8a4a', veu:0.09", para:"brilho:'#ff8a4a', veu:0.55" },

  { id:'S104', arquivo:ARENAP, nome:'o véu é declarado e não aplicado',
    real:'exatamente a forma da L-027: o campo existe no catálogo e ninguém o lê',
    de:"    arena.style.setProperty('--veuAlfa', String(a.veu ?? 0));",
    para:"    arena.style.setProperty('--veuAlfa', '0');" },

  { id:'S105', arquivo:APP, nome:'um estado do lutador apaga o contorno',
    real:'`filter` substituído inteiro em vez de composto — foi como ele nasceu ausente',
    de:'.mon.mine .body{filter:var(--contorno) drop-shadow(0 0 5px rgba(var(--goldRGB),.85))}',
    para:'.mon.mine .body{filter:drop-shadow(0 0 5px rgba(var(--goldRGB),.85))}' },

  { id:'S106', arquivo:APP, nome:'o texto auxiliar volta a reprovar no contraste',
    real:'"o cinza mais escuro fica mais elegante" — e some a frase da auditoria',
    de:'.tiny{font-size:.66rem;color:var(--dim);line-height:1.5;margin-top:8px}',
    para:'.tiny{font-size:.66rem;color:#69718a;line-height:1.5;margin-top:8px}' },

  { id:'S107', arquivo:CARTEIRA, nome:'o R$ volta a anotar cada valor em PokéCash',
    real:'"ajuda a dimensionar" — e a perda passa a ser sentida em reais (§P1, cap. 28)',
    de:"        <b>${v.toLocaleString('pt-BR')}</b><span>${MOEDA}</span>",
    para:"        <b>${v.toLocaleString('pt-BR')}</b><span>R$ ${(v/PC_POR_REAL).toFixed(2)}</span>" },

  { id:'S108', arquivo:NAVEG, nome:'o cartão da home volta a chamar aposta de rodada',
    real:'rótulo restaurado sem olhar o campo — NV 54 com 0 rodadas de novo',
    de:'<span>apostas</span>', para:'<span>rodadas</span>' },
  /* ---------- T3: o recorte da suíte e do gerador ---------- */

  { id:'S109', arquivo:RUNNER, nome:'o recorte aceita nome inexistente e roda vazio',
    real:'"filtra o que casar" — e `--so=cartira` sai VERDE com zero testes',
    de:'    console.error(`\\n--so não conhece a suíte: ${orfas.join(\', \')}.\\n` +\n                  `Disponíveis: ${todas.map(x => x.nome).join(\', \')}`);\n    process.exit(2);\n',
    para:'' },

  { id:'S110', arquivo:RUNNER, nome:'a execução parcial deixa de se anunciar',
    real:'"o aviso polui a saída" — e portão parcial passa a parecer portão inteiro',
    de:"  console.log(`\\n⚠  EXECUÇÃO PARCIAL — só ${oQue}.`);",
    para:'  ;' },

  { id:'S111', arquivo:RUNNER, nome:'o portão de fechamento passa a aceitar o recorte',
    real:'"é a mesma suíte" — e o bloco fecha com um sexto dela',
    de:"if (SO && process.env.EXIGE_VISUAL === '1') {",
    para:'if (false) {' },

  { id:'S112', arquivo:ARNES, nome:'a suíte deixa de expor o próprio nome',
    real:'campo removido por "não é usado" — e o recorte casa com nada',
    de:'    nome,\n    teste:', para:'    teste:' },

  /* REALVADO no próprio T3: a versão anterior deste defeito ancorava no caminho
     "navegador primeiro", que foi MEDIDO e DESCARTADO no mesmo bloco (ver a nota
     em sabotagem.mjs). O risco novo é o que sobrou da ideia: a passada com
     navegador roda só as suítes que precisam dele, e a lista pode divergir da do
     runner sem ninguém notar. */
  { id:'S113', arquivo:SABOT, nome:'a passada com navegador deixa de rodar uma suíte de navegador',
    real:'lista encolhida numa limpeza — defeito que só aquela suíte pega volta como PASSOU',
    de:"const SUITES_NAVEGADOR = 'visual,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,sem-backend,rodada-completa,contraste';",
    para:"const SUITES_NAVEGADOR = 'visual,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,sem-backend,contraste';" },
  /* ---------- F1.1: o esqueleto do backend ---------- */

  { id:'S114', arquivo:SRV, nome:'a versão da API deixa de ser conferida',
    real:'"o cliente sempre manda" — e cliente antigo numa aba passa a apostar com contrato velho',
    de:'      if (!SEM_VERSAO.includes(caminho)) {', para:'      if (false) {' },

  { id:'S115', arquivo:SRV, nome:'o CORS ecoa a origem que pediu',
    real:'"assim funciona em qualquer ambiente" — e é `*` escrito de outro jeito',
    de:'  if (!origem || !config.origens.includes(origem)) return;',
    para:'  if (!origem) return;' },

  { id:'S116', arquivo:SRV, nome:'o erro interno devolve o stack trace',
    real:'"ajuda a depurar" — entrega caminho de arquivo, versão de runtime e nome de função',
    de:"      return responder(res, 500, { codigo: ERROS.INTERNO, erro: 'erro interno' });",
    para:'      return responder(res, 500, { codigo: ERROS.INTERNO, erro: e.stack });' },

  { id:'S117', arquivo:SRV, nome:'a raiz aceita as formas que o Number() engole calado',
    real:'validação afrouxada — `?raiz=1e3` vira 1000 e é outra rodada, sem erro nenhum',
    de:"  if (typeof v !== 'string' || !/^\\d{1,10}$/.test(v)) return null;",
    para:"  if (typeof v !== 'string') return null;" },

  { id:'S118', arquivo:SRV, nome:'um cabeçalho de segurança some da resposta',
    real:'limpeza de objeto literal — e a API passa a poder ser posta num iframe',
    de:"  'x-frame-options': 'DENY',\n", para:'' },

  { id:'S119', arquivo:SRV, nome:'o 404 ecoa o caminho pedido',
    real:'"assim fica mais fácil achar o erro de digitação" — é eco de entrada do usuário',
    de:"erro: 'caminho desconhecido' }", para:"erro: 'caminho desconhecido: ' + caminho }" },

  { id:'S120', arquivo:SRVROD, nome:'o servidor precifica com margem própria',
    real:'ajuste "de servidor" — e o jogador vê uma odd na tela e outra no ticket',
    de:'  const preco = precificar(wins, sims, M, opcoes);',
    para:'  const preco = precificar(wins, sims, M, { ...opcoes, margem: 0.2 });' },

  { id:'S121', arquivo:SRVROD, nome:'o servidor sorteia o elenco de outro ramo da árvore',
    real:'rótulo trocado — mesma raiz, doze lutadores diferentes dos que o cliente mostra',
    de:'  return M.sortearPool(s.elenco);', para:'  return M.sortearPool(s.batalha);' },

  { id:'S122', arquivo:SRVROD, nome:'servidor e cliente em versões diferentes do motor',
    real:'instância velha no pool — e ninguém percebe até uma odd sair errada',
    de:'export const VERSAO_MOTOR = VERSAO;', para:"export const VERSAO_MOTOR = '0.9.0-OUTRA';" },

  { id:'S123', arquivo:SRVCFG, nome:'produção sobe sem segredo de sessão',
    real:'"o padrão serve" — é como quase toda sessão forjável começa',
    de:"      throw new Error('SEGREDO_SESSAO ausente. Em produção o segredo não tem padrão — ' +",
    para:"      segredoSessao = 'padrao'.repeat(8); if (false) throw new Error('' +" },

  { id:'S124', arquivo:SRVCFG, nome:'o segredo de desenvolvimento é fixo no código',
    real:'"assim a sessão sobrevive ao reinício" — segredo em repositório é segredo publicado',
    de:"    segredoSessao = randomBytes(32).toString('hex');",
    para:"    segredoSessao = 'a'.repeat(64);" },
  /* O DEFEITO MUDOU DE ALVO porque o anterior era INSABOTÁVEL: a caixa de areia
     é montada antes de qualquer defeito ser plantado, então sabotar a derivação
     dentro da caixa não muda a caixa que já existe. Ele passou no Q2 do F1.4 por
     isso, e a prova virou teste estático em `test/portao.mjs`.
     O que se sabota agora é o que aquele teste lê: a bandeira que faz o `git
     ls-files` enxergar pasta ainda não commitada. */
  { id:'S125', arquivo:SABOT, nome:'a caixa de areia deixa de enxergar pasta não commitada',
    real:'`ls-files` puro só vê o que já foi commitado — e a pasta do bloco em construção não foi',
    de:"  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],",
    para:"  execFileSync('git', ['ls-files'']," },
  /* ---------- F1.2: o banco ---------- */

  { id:'S126', arquivo:SRVDB, nome:'a chave estrangeira do SQLite fica desligada',
    real:'o padrão do SQLite é OFF — sem a linha, toda REFERENCES vira documentação',
    de:"  db.exec('PRAGMA foreign_keys = ON');", para:"  db.exec('PRAGMA foreign_keys = OFF');" },

  { id:'S127', arquivo:SRVDB, nome:'o esquema passa a aceitar saldo negativo',
    real:'"a aplicação já valida" — e a invariante do §4.6 vira promessa que um caminho novo esquece',
    de:'          saldo   INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),',
    para:'          saldo   INTEGER NOT NULL DEFAULT 0,' },

  { id:'S128', arquivo:SRVDB, nome:'o ledger passa a aceitar lançamento de zero',
    real:'CHECK removido — linha nula no registro que existe para ser auditado',
    de:'          amount         INTEGER NOT NULL CHECK (amount <> 0),',
    para:'          amount         INTEGER NOT NULL,' },

  { id:'S129', arquivo:SRVDB, nome:'o mesmo usuário passa a poder ter duas apostas na rodada',
    real:'UNIQUE afrouxado — o §5.6 diz UMA posição, e trocar de lutador vira INSERT',
    de:'          UNIQUE (user_id, round_id)', para:'          UNIQUE (user_id, round_id, id)' },

  { id:'S130', arquivo:SRVDB, nome:'o ledger deixa de ser append-only',
    real:'"o gatilho atrapalha a correção manual" — e é o registro que existe para ser confiável',
    de:"        CREATE TRIGGER ledger_sem_update BEFORE UPDATE ON wallet_ledger\n        BEGIN SELECT RAISE(ABORT, 'wallet_ledger é append-only'); END",
    para:'        CREATE TABLE _sem_gatilho_update (x INT)' },

  { id:'S131', arquivo:SRVDB, nome:'a data de nascimento vira opcional',
    real:'NOT NULL removido — usuário sem idade declarada entra pela porta de trás (§28.2)',
    de:'          birth_date    TEXT NOT NULL', para:'          birth_date    TEXT' },

  { id:'S132', arquivo:SRVDB, nome:'o status da aposta aceita qualquer texto',
    real:'CHECK removido — enum sem CHECK é comentário, e o settlement lê status',
    de:"          status     TEXT NOT NULL\n                       CHECK (status IN ('aberta','travada','ganha','perdida','cancelada')),",
    para:'          status     TEXT NOT NULL,' },

  { id:'S133', arquivo:SRVDB, nome:'a migração deixa de derrubar uma tabela ao descer',
    real:'esquecimento na lista inversa — e "reversível" passa a ser meia verdade',
    de:"      for (const t of ['responsible_play_events', 'self_exclusions', 'player_limits',",
    para:"      for (const t of ['responsible_play_events', 'self_exclusions'," },

  { id:'S134', arquivo:SRVDB, nome:'a data de nascimento vira editável',
    real:'gatilho removido — §28.2 exige imutabilidade, e CHECK não vê o valor antigo',
    de:"        CREATE TRIGGER nascimento_imutavel BEFORE UPDATE OF birth_date ON users\n        WHEN OLD.birth_date <> NEW.birth_date\n        BEGIN SELECT RAISE(ABORT, 'data de nascimento é imutável (§28.2)'); END",
    para:'        CREATE TABLE _sem_gatilho_nascimento (x INT)' },

  { id:'S135', arquivo:SRVDB, nome:'a migração roda fora de transação',
    real:'"é só um exec" — falha no meio deixa o banco entre dois esquemas e a versão mentindo',
    de:"    db.exec('BEGIN');\n    try { m.sobe(db); db.prepare(`INSERT INTO schema_versao VALUES (?, ?)`)",
    para:"    db.exec('-- sem transacao');\n    try { m.sobe(db); db.prepare(`INSERT INTO schema_versao VALUES (?, ?)`)" },
  /* ---------- F1.3: autenticação ---------- */

  { id:'S136', arquivo:SRVAUT, nome:'a idade deixa de contar o aniversário que não veio',
    real:'"é só subtrair os anos" — e entra gente de 17 durante um ano inteiro',
    de:'  if (mesHoje < m || (mesHoje === m && diaHoje < d)) anos--;', para:'  ' },

  { id:'S137', arquivo:SRVAUT, nome:'a conta bloqueada por idade é apagada em vez de congelada',
    real:'"não faz sentido guardar cadastro recusado" — apagar É o contorno (§28.2)',
    de:"    db.prepare(`INSERT INTO users (id, username, email, password_hash, status, birth_date, created_at)\n                VALUES (?, ?, ?, ?, 'congelado', ?, ?)`)",
    para:"    if (false) db.prepare(`INSERT INTO users (id, username, email, password_hash, status, birth_date, created_at)\n                VALUES (?, ?, ?, ?, 'congelado', ?, ?)`)" },

  { id:'S138', arquivo:SRVAUT, nome:'o hash é pulado quando o e-mail não existe',
    real:'"economiza CPU" — e o relógio passa a responder quais e-mails têm conta',
    de:"  const ok = confereSenha(String(senha || ''), u ? u.password_hash : HASH_FANTASMA);",
    para:"  const ok = u ? confereSenha(String(senha || ''), u.password_hash) : false;" },

  { id:'S139', arquivo:SRVAUT, nome:'a mensagem distingue e-mail inexistente de senha errada',
    real:'"ajuda o usuário" — e transforma a tela de login numa consulta de contas',
    de:'  if (!u || !ok) {',
    para:"  if (!u) throw erro(ERRO_AUTH.DADOS, 'e-mail não encontrado');\n  if (!ok) {" },

  { id:'S140', arquivo:SRVAUT, nome:'a senha volta a ser hash cru, sem sal nem custo',
    real:'"scrypt é lento" — é uma tabela arco-íris esperando acontecer',
    de:"  return `scrypt$${params.N}$${params.r}$${params.p}$${sal.toString('base64')}$${h.toString('base64')}`;",
    para:"  return h.toString('base64');" },

  { id:'S141', arquivo:SRVAUT, nome:'a assinatura da sessão é comparada com ===',
    real:'vaza byte a byte quantos caracteres o atacante já acertou',
    de:'  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;',
    para:'  if (assinatura !== esperada) return null;' },

  { id:'S142', arquivo:SRVAUT, nome:'a sessão perde o prazo de validade',
    real:'checagem removida — token sem prazo é token eterno, inclusive o roubado',
    de:"  if (!dados || typeof dados.exp !== 'number' || dados.exp <= agora) return null;",
    para:'  if (!dados) return null;' },

  { id:'S143', arquivo:SRVAUT, nome:'o token de recuperação vira reutilizável',
    real:'"o UPDATE atrapalha o teste" — quem achar o e-mail antigo entra depois',
    de:"    db.prepare(`UPDATE responsible_play_events SET tipo='recuperacao_usada', detalhe='{}' WHERE id=?`)\n      .run(linha.id);",
    para:'    ;' },

  { id:'S144', arquivo:SRVAUT, nome:'a força bruta deixa de ser limitada',
    real:'"o limite atrapalha o teste manual" — e a senha vale o tempo de um laço',
    de:'  if (bloqueado(emailNorm, agora))', para:'  if (false)' },
  /* ---------- F1.4: a carteira no servidor ---------- */

  { id:'S145', arquivo:SRVCAR, nome:'o payout deixa de herdar a origem da stake',
    real:'"é tudo dinheiro" — e a Arena vira conversor de bônus gratuito em saldo real (§5.5)',
    de:'    ? { bucket, tipo: TIPO_PAYOUT[bucket], delta: Math.floor(n * odd), reservaDelta: -n }',
    para:"    ? { bucket: 'transferivel', tipo: 'BET_PAYOUT_TRANSFERABLE', delta: Math.floor(n * odd), reservaDelta: -n }" },

  { id:'S146', arquivo:SRVCAR, nome:'o saldo é escrito em vez de somado',
    real:'"fica mais legível" — e é o TOCTOU com outra roupa: duas reservas do mesmo dinheiro',
    de:'          `UPDATE carteiras SET saldo = saldo + ? WHERE user_id = ? AND bucket = ?`)',
    para:'          `UPDATE carteiras SET saldo = ? WHERE user_id = ? AND bucket = ?`)' },

  { id:'S147', arquivo:SRVCAR, nome:'a ordem de consumo é invertida',
    real:'gasta o saldo do jogador antes do bônus — o §5.5 escolheu o contrário de propósito',
    de:'  for (const b of ORDEM_CONSUMO) {', para:'  for (const b of [...ORDEM_CONSUMO].reverse()) {' },

  { id:'S148', arquivo:SRVCAR, nome:'a reconciliação para de somar o ledger',
    real:'"o laço não faz nada útil" — e saldo adulterado passa a ser saldo adulterado E ACEITO',
    de:"    calc[l.bucket] += l.type === 'BET_RESERVE' ? -Math.abs(l.amount) : l.amount;",
    para:'    ;' },

  { id:'S149', arquivo:SRVCAR, nome:'liberar devolve o VALOR e não a COMPOSIÇÃO',
    real:'"é o mesmo total" — e cancelar aposta vira conversor de bônus em transferível',
    de:"    linhas: Object.entries(composicao).map(([bucket, n]) =>\n      ({ bucket, tipo: 'BET_RELEASE', delta: n, reservaDelta: -n })) });",
    para:"    linhas: [{ bucket: 'transferivel', tipo: 'BET_RELEASE', delta: Object.values(composicao).reduce((a,b)=>a+b,0), reservaDelta: -Object.values(composicao).reduce((a,b)=>a+b,0) }] });" },

  /* SABOTA O PONTO ÚNICO, e não uma das duas redes.
     A idempotência tem duas defesas — a consulta prévia e o UNIQUE do esquema —
     e num processo só elas são redundantes: remover uma deixa a outra cobrindo,
     e o defeito passaria (medido; ver a L-032). O que derruba as DUAS com uma
     linha é a chave nunca ser GRAVADA: sem ela, a consulta não acha nada e o
     UNIQUE nunca dispara. */
  { id:'S150', arquivo:SRVCAR, nome:'a idempotência do ledger cai por inteiro',
    real:'"o cliente reenviou" vira "o jogador ganhou cinco vezes" (§16.4.1)',
    de:'             i === 0 ? (idem ?? null) : null,', para:'             null,' },

  { id:'S151', arquivo:SRVCAR, nome:'o movimento de carteira sai de dentro da transação',
    real:'"é só um UPDATE e um INSERT" — falha no meio deixa o ledger contando outra história',
    de:"  db.exec('BEGIN IMMEDIATE');", para:"  db.exec('-- sem transacao');" },
  /* ---------- F1.5: o scheduler autoritativo ---------- */

  { id:'S152', arquivo:SRVSCH, nome:'o servidor aceita a semente que o cliente mandar',
    real:'"o campo já vem no pedido" — quem escolhe a semente escolhe a luta',
    de:'    const raiz = novaRaiz();', para:'    const raiz = _pedido.raiz ?? novaRaiz();' },

  { id:'S153', arquivo:SRVSCH, nome:'a semente é revelada com as apostas ABERTAS',
    real:'condição afrouxada — e o §4.5 vira letra morta na hora de provar que vale',
    de:'    if (atual.status !== ESTADOS.ABERTA) {', para:'    if (true) {' },

  /* REALVADO NO F1.15: a linha morava duplicada no scheduler, e virou fonte
     única em `engine/commit.mjs`. O defeito segue o comportamento, não o
     endereço antigo — é a regra do pré-voo. */
  { id:'S154', arquivo:COMMIT, nome:'o commit deixa de conferir com o reveal',
    real:'mensagem "equivalente" — e o compromisso publicado não se valida',
    de:"export const mensagemCommit = (raiz, sal) =>\n  `pokearena|v1|${typeof raiz === 'string' ? raiz : (raiz >>> 0).toString(16)}|${sal}`;",
    para:"export const mensagemCommit = (raiz, sal) => `${raiz}|${sal}`;" },

  { id:'S241', arquivo:COMMIT, nome:'a raiz larga é estreitada na mensagem do commit',
    real:'`raiz >>> 0` numa raiz de 128 bits devolve 0 — todo commit sai igual, sobre a raiz zero',
    de:"  `pokearena|v1|${typeof raiz === 'string' ? raiz : (raiz >>> 0).toString(16)}|${sal}`;",
    para:'  `pokearena|v1|${(raiz >>> 0).toString(16)}|${sal}`;' },

  { id:'S155', arquivo:SRVSCH, nome:'duas rodadas passam a existir ao mesmo tempo',
    real:'guarda removida — o cliente pediria a próxima até sair uma que lhe agrade',
    de:'    if (atual && atual.status !== ESTADOS.ENCERRADA && atual.status !== ESTADOS.CANCELADA)',
    para:'    if (false)' },

  { id:'S156', arquivo:SRVSCH, nome:'os prazos de fase voltam a ser relativos ao tick',
    real:'"calcula na transição" — e um tick atrasado empurra o cronograma inteiro',
    de:'              terminaEm: agora + FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA,',
    para:'              terminaEm: agora + FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 9999999,' },

  { id:'S157', arquivo:SRVSCH, nome:'o campeão não é gravado no fecho da rodada',
    real:'"está em memória" — e o processo que reinicia perde o resultado da rodada',
    de:'        .run(ESTADOS.ENCERRADA, atual.batalha.campeaoDex, agora, atual.id);',
    para:'        .run(ESTADOS.ENCERRADA, null, agora, atual.id);' },

  { id:'S158', arquivo:SRVSCH, nome:'o registro de preço do §4.4.5 não é gravado',
    real:'"dá para recalcular depois" — com o código de amanhã, que pode não ser o de hoje',
    de:'      preco.lutadores.forEach((l, slot) =>\n        ins.run(id, slot, l.dex, l.prob, l.erroRelativo, l.fair, l.odd));',
    para:'      ;' },

  { id:'S159', arquivo:PRECO, nome:'o viés de convexidade volta à escala errada',
    real:'(1-p)/(n·p²) é o viés em PONTOS de odd, não em fração dela — erra por ~60x na cauda',
    de:'    const viesConvexidade = (1 - prob) / (sims * prob);',
    para:'    const viesConvexidade = (1 - prob) / (sims * prob * prob);' },
  /* ---------- F1.6: transporte, sala e reconexão ---------- */

  { id:'S160', arquivo:SRVTRA, nome:'evento dirigido a um usuário vai para a sala inteira',
    real:'filtro ignorado — todo mundo vê quanto cada um ganhou',
    de:'      if (filtro && !filtro(con)) continue;', para:'      ;' },

  { id:'S161', arquivo:SRVTRA, nome:'evento dirigido entra no histórico da retomada',
    real:'"é só um histórico" — o vazamento entra pela porta dos fundos, na reconexão',
    de:'    if (!filtro) {\n      historico.push(evento);',
    para:'    if (true) {\n      historico.push(evento);' },

  { id:'S162', arquivo:SRVTRA, nome:'um socket morto congela a sala',
    real:'try removido — quem estiver DEPOIS dele na lista para de receber tudo',
    de:'    } catch { conexoes.delete(con.id); return false; }',
    para:'    } catch (e) { throw e; }' },

  { id:'S163', arquivo:SRVTRA, nome:'quem chega atrasado recebe deltas em vez do estado',
    real:'"o histórico já está aí" — e quem entra no segundo 22 reconstrói a rodada por partes',
    de:'    if (faltando && faltando.length > 0 && faltando.length < HISTORICO_MAX) {',
    para:'    if (historico.length > 0) { for (const e of historico) escrever(con, e); } else if (false) {' },

  { id:'S164', arquivo:SRVTRA, nome:'a conexão que cai continua na sala',
    real:'listener vazio — vazamento de socket, e a sala cresce até o processo cair',
    de:"    req.on('close', () => { conexoes.delete(id); });",
    para:"    req.on('close', () => {});" },

  { id:'S165', arquivo:SRVTRA, nome:'a retomada repete o evento que o cliente já viu',
    real:'comparação virou >= — o jogador vê o mesmo KO duas vezes',
    de:'      ? historico.filter(e => e.id > ultimoVisto) : null;',
    para:'      ? historico.filter(e => e.id >= ultimoVisto) : null;' },
  /* ---------- F1.7: aposta, lock e settlement ---------- */

  { id:'S166', arquivo:SRVAPO, nome:'a aposta é aceita depois do lock',
    real:'guarda de fase removida — a semente já foi revelada, é apostar no passado',
    de:"  if (rodada.status !== ESTADOS.ABERTA)\n    throw erro(ERRO_APOSTA.JANELA_FECHADA, 'a janela de apostas está fechada');\n\n  const conta",
    para:"  if (false)\n    throw erro(ERRO_APOSTA.JANELA_FECHADA, 'a janela de apostas está fechada');\n\n  const conta" },

  { id:'S167', arquivo:SRVAPO, nome:'trocar de lutador cria uma SEGUNDA posição',
    real:'"é mais simples inserir" — com duas, o jogador cobre os doze e sai sempre no lucro',
    de:"  const jaTem = db.prepare(\n    `SELECT * FROM bets WHERE user_id = ? AND round_id = ? AND status = 'aberta'`)\n    .get(userId, rodada.id);",
    para:'  const jaTem = null;' },

  { id:'S168', arquivo:SRVAPO, nome:'o settlement paga com odd diferente da do ticket',
    real:'ajuste no cálculo — pagar com a odd de hoje uma aposta de ontem é inventar preço',
    de:'    liquidarNoBanco(db, { userId: t.user_id, composicao, ganhou, odd: t.odd,',
    para:'    liquidarNoBanco(db, { userId: t.user_id, composicao, ganhou, odd: t.odd * 2,' },

  { id:'S169', arquivo:SRVAPO, nome:'o teto de payout deixa de ser aplicado no servidor',
    real:'"o cliente já valida" — e o cliente é do jogador (§4.4.6)',
    de:'  if (Math.floor(valor * oferta.offered_odd) > CONF.MAX_PAYOUT_POR_TICKET)',
    para:'  if (false)' },

  { id:'S170', arquivo:SRVAPO, nome:'conta congelada volta a poder apostar',
    real:'checagem de status afrouxada — a barreira do §28.2 não alcança a aposta',
    de:"  if (!conta || conta.status !== 'ativo')", para:'  if (!conta)' },

  { id:'S171', arquivo:SRVAPO, nome:'a rodada é liquidada antes de terminar',
    real:'guarda de fase removida — liquida uma rodada cujo campeão ainda não existe',
    de:'  if (rodada.status !== ESTADOS.ENCERRADA)', para:'  if (false)' },

  /* SABOTA A CHAVE, e não o filtro de status. As duas são redes do mesmo
     risco — pagar duas vezes — e num caminho feliz são redundantes, como na
     L-032. A chave é a que não depende de uma COLUNA estar certa, e o teste
     "reverter o status à mão" existe para isolá-la. */
  { id:'S172', arquivo:SRVAPO, nome:'o settlement perde a chave de idempotência',
    real:'"o status já filtra" — e um reprocessamento depois de mexer numa coluna paga de novo',
    de:'                          ref: t.id, idem: `settle-${t.id}`, agora });',
    para:'                          ref: t.id, agora });' },

  { id:'S173', arquivo:SRVAPO, nome:'a liberação da troca ganha chave de idempotência',
    real:'"toda operação tem chave" — e a SEGUNDA troca não devolve o dinheiro da primeira',
    de:'  if (jaTem) liberarNoBanco(db, { userId, composicao: JSON.parse(jaTem.stake_breakdown),\n                                  ref: jaTem.id, agora });',
    para:'  if (jaTem) liberarNoBanco(db, { userId, composicao: JSON.parse(jaTem.stake_breakdown),\n                                  ref: jaTem.id, idem: `lib-${jaTem.id}`, agora });' },
  /* ---------- L-032: o que o arnês de dois processos achou ---------- */

  /* `BEGIN IMMEDIATE` NÃO É DETALHE DE ESTILO, e não tinha defeito plantado.
     Medido com oito processos de verdade contra o mesmo arquivo: com
     `BEGIN DEFERRED` eles não competem — eles TRAVAM. Quatro dos oito voltam
     com "database is locked", porque dois leitores tentando virar escritor no
     mesmo instante é um impasse que o `busy_timeout` não resolve.
     O S151 sabota a transação INTEIRA; este sabota o modo dela, que é o erro
     que alguém comete de verdade ao "simplificar" a linha. */
  { id:'S174', arquivo:SRVCAR, nome:'a transação da carteira vira BEGIN DEFERRED',
    real:'"IMMEDIATE é agressivo demais" — e dois processos travam em vez de esperar a vez',
    de:"  db.exec('BEGIN IMMEDIATE');", para:"  db.exec('BEGIN DEFERRED');" },
  /* ---------- D-007: a emissão de PC-B ---------- */

  { id:'S175', arquivo:EMISSAO, nome:'o orçamento de emissão é inflado no código',
    real:'"o número do Estudo é conservador demais" — e o código volta a discordar do documento',
    de:'export const ORCAMENTO_AGREGADO_SEMANAL = 80;',
    para:'export const ORCAMENTO_AGREGADO_SEMANAL = 800;' },

  { id:'S176', arquivo:EMISSAO, nome:'o teto de saldo é desligado',
    real:'"o jogador reclama que parou de receber" — é o que estabiliza a oferta em 5,35M',
    de:'  if (saldoPcB >= TETO_SALDO_PC_B)', para:'  if (false)' },

  { id:'S177', arquivo:EMISSAO, nome:'o teto de saldo passa a vir DEPOIS do orçamento',
    real:'reordenação inocente — quem acumula volta a receber, e é ele que o teto para',
    de:"  if (saldoPcB >= TETO_SALDO_PC_B)\n    return { pcB: 0, substituto: SUBSTITUTOS[0], motivo: 'teto_de_saldo' };\n\n  const cabe",
    para:'  const cabe' },

  { id:'S178', arquivo:EMISSAO, nome:'o marco semanal passa a pagar mais de uma vez',
    real:'o que já saiu deixa de ser descontado — e o orçamento vira por conclusão de novo',
    de:'  const cabe = ORCAMENTO_DESAFIOS_SEMANAL - jaEmitidoNaSemana;',
    para:'  const cabe = ORCAMENTO_DESAFIOS_SEMANAL;' },

  { id:'S179', arquivo:EMISSAO, nome:'a recompensa SOME em vez de virar substituto',
    real:'"não tem o que pagar" — o Estudo pede substituição, não supressão',
    de:"    return { pcB: 0, substituto: SUBSTITUTOS[0], motivo: 'orcamento_da_semana' };",
    para:"    return { pcB: 0, substituto: null, motivo: 'orcamento_da_semana' };" },

  { id:'S180', arquivo:EMISSAO, nome:'a semana vira janela deslizante de sete dias',
    real:'"é mais simples contar sete dias" — quem joga fim de semana fecha dois marcos em três dias',
    de:'  const dia = (d.getUTCDay() + 6) % 7;              // segunda = 0',
    para:'  const dia = 0;' },

  { id:'S181', arquivo:DESAF, nome:'o campo de recompensa por desafio volta ao pool',
    real:'"falta o valor da recompensa nesta lista" — é o D-007 inteiro de volta, x21 por semana',
    de:"{id:'rodadas',  txt:'Participe de {n} rodada{s}',            metas:[3,5,8], xp:60}",
    para:"{id:'rodadas',  txt:'Participe de {n} rodada{s}',            metas:[3,5,8], xp:60, dia:25}" },

  /* ---------- F1.8: os limites do §28.3 ----------
     A assimetria é o bloco inteiro, e cada linha dela ganha um defeito. Todos
     são erros que alguém comete DE VERDADE: "reduzir e aumentar é a mesma
     operação", "depois do prazo pode entrar sozinho", "remover não é aumento",
     "o cooldown é parâmetro". Nenhum deles é erro de execução — todos passariam
     por uma revisão distraída e por qualquer teste que só olhe o valor final. */

  { id:'S182', arquivo:SRVLIM, nome:'aumentar limite passa a valer na hora',
    real:'"por que só a redução é imediata?" — é o jogador em perseguição de perda elevando o teto no pior momento',
    de:'  if (!aumento) {', para:'  if (true) {' },

  { id:'S183', arquivo:SRVLIM, nome:'reduzir limite passa a esperar 24 h',
    real:'a assimetria invertida — quem está se protegendo espera um dia para se proteger',
    de:'  const aumento = permissividade(valor) > permissividade(atual);',
    para:'  const aumento = permissividade(valor) !== permissividade(atual);' },

  { id:'S184', arquivo:SRVLIM, nome:'remover limite deixa de ser tratado como aumento',
    real:'`null` vira zero numa comparação numérica — e a porta dos fundos abre: remove e recria no valor que quiser',
    de:'const permissividade = v => (v === null || v === undefined ? Infinity : v);',
    para:'const permissividade = v => (v === undefined ? Infinity : v ?? 0);' },

  { id:'S185', arquivo:SRVLIM, nome:'o cooldown vira parâmetro de fora',
    real:'"o suporte precisa liberar em casos excepcionais" — a Spec proíbe, e a única garantia é não ter por onde receber',
    de:'  const efetivoEm = agora + COOLDOWN_MS;',
    para:'  const efetivoEm = agora + (arguments[1].cooldownMs ?? COOLDOWN_MS);' },

  { id:'S186', arquivo:SRVLIM, nome:'o cooldown encolhe para vinte e quatro minutos',
    real:'`60 * 1000` no lugar de `60 * 60 * 1000` — separa o impulso da decisão por tempo nenhum',
    de:'export const COOLDOWN_MS = 24 * 60 * 60 * 1000;',
    para:'export const COOLDOWN_MS = 24 * 60 * 1000;' },

  { id:'S187', arquivo:SRVLIM, nome:'repedir o mesmo aumento reinicia o prazo',
    real:'"pedido novo, prazo novo" — insistir passa a castigar, e o prazo deixa de ser do pedido',
    de:'  if (pend && permissividade(pend.valor) === permissividade(valor)) {',
    para:'  if (false) {' },

  { id:'S188', arquivo:SRVLIM, nome:'a perda passa a contar VOLUME apostado',
    real:'"soma o que ele apostou" — quem apostou 1000 e recebeu 950 perdeu 50, e seria bloqueado por 1000',
    de:"    const perdido = Math.max(0, somaNaJanela(db, userId, 'perda', JANELA[tipo], agora));",
    para:"    const perdido = db.prepare(`SELECT COALESCE(SUM(MAX(valor,0)),0) AS s FROM player_activity WHERE user_id = ? AND tipo = 'perda'`).get(userId).s;" },

  { id:'S189', arquivo:SRVLIM, nome:'a janela de perda deixa de virar',
    real:'"o limite é do jogador, não do dia" — limite que não solta é autoexclusão disfarçada, e ela tem outro fluxo',
    de:"  if (janela === 'dia')\n    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());",
    para:'  if (janela === \'dia\') return 0;' },

  { id:'S190', arquivo:SRVLIM, nome:'a recusa vira um `false` seco',
    real:'"o cliente monta a mensagem" — a Spec pede QUAL, QUANTO e QUANDO, e nada disso sobrevive à viagem',
    de:'const bloqueio = (limite, usado, teto, voltaEm, comoLiberar) => ({\n  ok: false, limite, usado, teto, restante: Math.max(0, teto - usado), voltaEm, comoLiberar,\n});',
    para:'const bloqueio = () => ({ ok: false });' },

  { id:'S191', arquivo:SRVAPO, nome:'o limite deixa de ser conferido ao apostar',
    real:'"a tela já não deixa passar" — e a tela é do jogador; proteção que mora no cliente é opcional',
    de:'  if (!veredito.ok)', para:'  if (false)' },

  { id:'S192', arquivo:SRVLIM, nome:'o limite por rodada erra a própria fronteira',
    real:'`>=` no lugar de `>` — apostar exatamente o limite escolhido é recusado',
    de:'  if (porRodada !== undefined && typeof valor === \'number\' && valor > porRodada)',
    para:'  if (porRodada !== undefined && typeof valor === \'number\' && valor >= porRodada)' },

  { id:'S194', arquivo:SRVAPO, nome:'o evento de bloqueio passa a ser amostrado',
    real:'"cinco recusas iguais seguidas, um evento basta" — o §17 pede o bloco de proteção sem amostragem',
    de:"    registrarBloqueio(db, { userId, veredito, contexto: 'aposta', agora });",
    para:"    if (Math.random() < 0.2) registrarBloqueio(db, { userId, veredito, contexto: 'aposta', agora });" },

  { id:'S193', arquivo:SRVAPO, nome:'o settlement lança o stake em vez da perda líquida',
    real:'"o que ele arriscou foi o stake" — é o S188 pela outra ponta, e some do módulo de limites',
    de:'    registrarPerda(db, { userId: t.user_id, valor: t.stake - retorno, agora });',
    para:'    registrarPerda(db, { userId: t.user_id, valor: t.stake, agora });' },

  /* ---------- F1.9: pausa, autoexclusão e honestidade do resultado ----------
     A lista de sabotagem deste bloco é, segundo o próprio BUILD_BLOCKS, "a mais
     importante da fase". Cada item dela vira um defeito aqui, e nenhum é
     rebuscado: são as seis formas de a proteção cair sozinha. */

  /* REALVADO NO F1.14: a tela de resultado saiu do `fases.mjs` para
     `resultado-tela.mjs` — o `fases` decide QUANDO, a tela decide COMO. O
     defeito segue o comportamento, não o endereço antigo. */
  { id:'S195', arquivo:RESTELA, nome:'a tela comemora retorno menor que a aposta',
    real:'a condição volta a ser "acertei o campeão?" — é a perda disfarçada de ganho, e é o §28.5 inteiro',
    de:'    if (res.comemora){', para:'    if (acertou){' },

  { id:'S196', arquivo:RESULT, nome:'a fronteira da festa vira `>= 0`',
    real:'"empate também é vitória" — confete em dinheiro de volta é a mesma mentira em dose menor',
    de:'    comemora: liquido > 0,', para:'    comemora: liquido >= 0,' },

  { id:'S197', arquivo:RESULT, nome:'a tela de resultado passa a destacar o BRUTO',
    real:'"o número grande vende melhor" — a Spec pede o líquido em destaque e o bruto em segundo plano',
    de:'    liquido,\n    bruto: retorno,', para:'    bruto: retorno,\n    liquido,' },

  { id:'S198', arquivo:SRVPRO, nome:'a autoexclusão cai sozinha ao vencer o prazo',
    real:'"o prazo acabou, ele pode voltar" — a Spec pede reentrada ATIVA, e voltar sozinho decide pelo jogador',
    de:"    return tipo === 'self_exclusion';                      // vencida, à espera do pedido",
    para:'    return false;' },

  { id:'S199', arquivo:SRVPRO, nome:'a pausa passa a ser a mais RECENTE, e não a mais longa',
    real:'ordenação inocente — um cool-off de 24 h por cima encurta uma autoexclusão de 180 dias',
    de:'  vigentes.sort((x, y) => (y.ate === null) - (x.ate === null) || y.ate - x.ate);',
    para:'  vigentes.sort((x, y) => y.de - x.de);' },

  { id:'S200', arquivo:SRVPRO, nome:'a autoexclusão deixa de propagar para contas ligadas',
    real:'"cada conta é uma conta" — a segunda conta é o contorno mais usado que existe',
    de:'  const grupo = [userId, ...contasLigadas(db, userId)];',
    para:'  const grupo = [userId];' },

  { id:'S201', arquivo:SRVPRO, nome:'a reentrada pode ser concedida antes do prazo',
    real:'"o suporte precisa poder liberar" — a Spec: nenhum canal encurta autoexclusão',
    de:'  if (p.ate === null || agora < p.ate)', para:'  if (false)' },

  { id:'S202', arquivo:SRVPRO, nome:'a reentrada entra sem o jogador ter pedido',
    real:'"o prazo venceu, libera" — reentrada automática é o produto decidindo por quem pediu para parar',
    de:'  if (!p.reentrada_pedida_em)', para:'  if (false)' },

  { id:'S203', arquivo:SRVPRO, nome:'marketing volta a chegar a conta em pausa',
    real:'"é só um lembrete, não é oferta" — a Spec pede NENHUMA comunicação, em nenhum canal',
    de:'  if (!podeReceberMarketing(db, userId, agora)) {', para:'  if (false) {' },

  { id:'S204', arquivo:SRVPRO, nome:'ação não classificada é LIBERADA durante a pausa',
    real:'"não está na lista, então pode" — feature nova nasce furando a autoexclusão',
    de:"    return { ok: false, motivo: 'acao_nao_classificada', pausa: p };",
    para:'    return { ok: true };' },

  { id:'S205', arquivo:SRVPRO, nome:'`chasing` passa a acusar stake alta em vez de aumento',
    real:'trocar a conjunção por um limiar de valor — o sistema intervém em quem não mudou nada',
    de:'    seguidos = perdeuAntes && apostas[i].stake > apostas[i - 1].stake ? seguidos + 1 : 0;',
    para:'    seguidos = apostas[i].stake >= 500 ? seguidos + 1 : 0;' },

  { id:'S206', arquivo:SRVPRO, nome:'a intervenção deixa de registrar o sinal que a disparou',
    real:'"o nível já diz o bastante" — sem o sinal não há como demonstrar depois que o sistema agiu',
    de:"  evento(db, userId, 'intervencao', { intervencaoId, nivel, sinal, desfecho }, agora);",
    para:"  evento(db, userId, 'intervencao', { intervencaoId, nivel }, agora);" },

  { id:'S207', arquivo:SRVPRO, nome:'o reality check nunca reinicia depois de confirmado',
    real:'"o intervalo é da sessão" — o aviso vira um laço e o jogador aprende a fechá-lo sem ler',
    de:"      WHERE user_id = ? AND tipo = 'reality_check_confirmado' AND criado_em >= ?`)\n    .get(userId, s.inicio).q ?? s.inicio;",
    para:"      WHERE user_id = ? AND tipo = 'reality_check_confirmado' AND criado_em < ?`)\n    .get(userId, s.inicio).q ?? s.inicio;" },

  { id:'S208', arquivo:SRVAPO, nome:'a aposta deixa de conferir a pausa',
    real:'"a tela não deixa entrar" — autoexclusão que mora no cliente cai no primeiro logout',
    de:'  if (!pausa.ok)', para:'  if (false)' },

  /* ---------- F1.13: a montagem do serviço ----------
     Rota nova é caminho novo, e é o caminho que perde a regra. Cada defeito
     aqui é uma garantia que o domínio JÁ tinha e que a rota pode desfazer sem
     tocar no domínio — que é exatamente por que eles precisam existir. */

  { id:'S209', arquivo:SRV, nome:'a sessão deixa de ser conferida no despacho',
    real:'"cada rota confere a sua" — e a rota NOVA nasce aberta, porque quem a escreveu não sabia que precisava lembrar',
    de:'      if (!ROTAS_PUBLICAS.includes(chave) && !ROTAS_ADMIN.includes(chave)',
    para:'      if (false && !ROTAS_ADMIN.includes(chave)' },

  { id:'S210', arquivo:SRVROT, nome:'o usuário passa a vir do corpo do pedido',
    real:'"o admin precisa consultar outra conta" — é a carteira de qualquer um para quem souber um id',
    de:"  'GET /api/carteira': ({ db, userId }) =>\n    ({ corpo: { userId, saldos: saldos(db, userId) } }),",
    para:"  'GET /api/carteira': ({ db, userId, query }) =>\n    ({ corpo: { userId: query.get('userId') || userId,\n                saldos: saldos(db, query.get('userId') || userId) } })," },

  /* O S211 NASCEU EQUIVALENTE, E A INVESTIGAÇÃO ACHOU UM DEFEITO DE VERDADE.
   *
   * Ele trocava a leitura campo a campo por `...corpo`, com o dano declarado
   * "`cooldownMs` do cliente encurta o cooldown". Medido: `definirLimite` lê
   * apenas `{ userId, tipo, valor, agora }` e `validar()` já recusa valor não
   * inteiro — os campos a mais são ignorados, e o mutante ficava IDÊNTICO.
   * Quarta ocorrência da forma da L-038: guarda redundante sobre guarda que já
   * basta.
   *
   * Mas a medição mostrou o mutante ficando MELHOR que o original em três
   * entradas (`'500'`, `12.5`, corpo sem `valor`), e isso é sinal de que o
   * código limpo é que estava errado — era o **D-020**, corrigido.
   *
   * Reapontado para o que a rota de fato passou a garantir. */
  { id:'S211', arquivo:SRVROT, nome:'valor ilegível de limite volta a virar remoção',
    real:'"`inteiro()` já devolve null, e null é remoção" — e o corpo truncado afrouxa o limite de quem foi se proteger',
    de:"        if (valor === null)\n          return erro(400, ERRO_LIMITE.VALOR,\n            'valor precisa ser inteiro positivo; use null para remover o limite');",
    para:'        if (false) return null;' },


  /* A PRIMEIRA VERSÃO DESTE DEFEITO ERA DECORATIVA, e a medição pegou.
     Ela trocava os campos por `...corpo`, esperando que a odd do cliente
     chegasse ao domínio. Não chega: `apostar()` desestrutura só nomes
     conhecidos, e `odd` não é um deles — a defesa do F1.7 é ESTRUTURAL, e o
     mutante não tinha efeito nenhum. Pior: o portão devolveu PEGOU mesmo assim,
     por uma suíte de navegador instável (ver D-015).

     O defeito real é a rota SOBRESCREVER a odd na resposta, que é o erro que
     alguém comete de verdade ao "devolver o que o cliente mandou". */
  { id:'S212', arquivo:SRVROT, nome:'a rota devolve a odd do cliente no lugar da publicada',
    real:'"o cliente já calculou, é só ecoar" — e o ticket exibido deixa de ser o ticket gravado',
    de:'      return { corpo: t };',
    para:'      return { corpo: { ...t, odd: corpo?.odd ?? t.odd } };' },

  { id:'S213', arquivo:SRVROT, nome:'o login distingue conta que existe de conta que não existe',
    real:'"a mensagem ajuda o usuário" — e transforma a tela de login numa consulta de clientes',
    de:"    } catch {",
    para:"    } catch (e) {\n      if (e?.codigo) return erro(401, ERROS.NAO_AUTORIZADO, e.message);" },

  { id:'S214', arquivo:SRVROT, nome:'a rota de rodada devolve o estado interno inteiro',
    real:'"é mais simples mandar tudo" — e a semente vai junto antes do lock',
    de:'    return { corpo: { rodada: sched.paraCliente() } };',
    para:'    return { corpo: { rodada: r } };' },

  /* A PRIMEIRA VERSÃO DESTE DEFEITO ERA DECORATIVA, e o portão corrigido pegou.
     Ela tirava a idempotência da chave (`welcome-<id>-<agora>`) esperando
     emissão dupla. Não há: o id do usuário é novo a cada cadastro, então a
     chave já era única e a rede de idempotência aqui é cinto de segurança, não
     estrutura. Mutante sem efeito não mede cobertura nenhuma.

     O defeito real é o BOLSO. O payout herda a origem da stake (§5.5): nascer
     em `bonus` faria todo ganho da conta nova voltar como bônus, e o jogador
     nunca teria saldo transferível — outra economia, sem ninguém ter decidido. */
  { id:'S215', arquivo:SRVROT, nome:'o grant de boas-vindas cai no bolso errado',
    real:'"bônus é mais seguro" — e o §5.5 faz todo ganho da conta voltar como bônus, para sempre',
    de:"      creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',",
    para:"      creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'bonus'," },

  { id:'S216', arquivo:SRVROT, nome:'nasce uma rota que encerra a pausa',
    real:'"o suporte precisa poder liberar" — é a irreversibilidade do §28.4 desfeita por um caminho novo',
    de:"  'POST /api/protecao/reentrada/confirmar': ({ db, userId, agora }) => {",
    para:"  'POST /api/protecao/encerrar': ({ db, userId, agora }) => {\n    return { corpo: { encerrada: true } };\n  },\n\n  'POST /api/protecao/reentrada/confirmar': ({ db, userId, agora }) => {" },

  { id:'S217', arquivo:SRVROT, nome:'o saldo inicial da rota diverge do motor',
    real:'número copiado no lugar do importado — cliente e servidor discordam de quanto vale começar',
    de:'                     valor: SALDO_INICIAL, idem: `welcome-${u.id}`, agora });',
    para:'                     valor: 5000, idem: `welcome-${u.id}`, agora });' },

  /* ---------- F1.13: a tela de proteção (§28.7) ----------
     O capítulo 28 tem uma seção que não é sobre regra de negócio: é sobre o que
     a interface pode e não pode fazer. Ela existe porque as regras de proteção
     sobrevivem ou morrem na tela — um limite que o jogador não acha é um limite
     que ele não usa. */

  { id:'S218', arquivo:PTXT, nome:'a recusa por limite passa a oferecer depósito',
    real:'"a tela de saldo insuficiente tem esse botão" — é o padrão escuro que o §28.7 nomeia',
    de:'  return `${nome} (${v.limite}): você usou ${v.usado} de ${v.teto}.${volta}${como}`.trim();',
    para:'  return `${nome}: limite atingido. Depositar mais para continuar jogando.`;' },

  { id:'S219', arquivo:PTXT, nome:'a recusa deixa de dizer quando o limite volta',
    real:'"a mensagem fica mais curta" — e vira uma parede sem porta',
    de:"  const volta = v.voltaEm ? ` Volta em ${quando(v.voltaEm)}.` : '';",
    para:"  const volta = '';" },

  { id:'S220', arquivo:APIC, nome:'a falha de rede volta a virar exceção',
    real:'"o try/catch atrapalha o diagnóstico" — e uma promessa rejeitada no clique derruba a tela',
    de:"      return { ok: false, indisponivel: true, status: 0, corpo: null, motivo: String(e?.message || e) };",
    para:'      throw e;' },

  { id:'S221', arquivo:APIC, nome:'o cliente para de declarar a versão do contrato',
    real:'"o servidor aceita mesmo assim" — e o handshake que o F1.1 criou deixa de existir',
    de:'          [CABECALHO_VERSAO]: API_VERSAO,',
    para:'' },

  /* ---------- T4: o fecho segue o filho ----------
     Este bloco faz o fecho ENCOLHER, que é a direção errada de errar: errar
     para mais custa uma reavaliação, errar para menos faz o portão reaproveitar
     um veredito morto. Os defeitos aqui guardam o que TEM que continuar
     universal, e não o que encolheu. */

  /* A primeira versão do S222 trocava o `return null` por `if (false)` e PASSOU
     por 226 defeitos: o `existsSync` logo abaixo devolvia `null` do mesmo jeito,
     porque nome de variável fatiado não é caminho que exista. Mutante
     equivalente — os dois guardas só divergem quando o fatiado EXISTE, e aí o
     mutante acerta. Reapontado para o erro que de fato quebra o portão, o mesmo
     do S223: dúvida virar SILÊNCIO em vez de virar TUDO. */
  { id:'S222', arquivo:FECHO, nome:'caminho de script por variável some do fecho',
    real:'"não sei ler, então ignoro" — e o fecho encolhe para o que ele conseguiu ler',
    de:"    if (!/^['\"][^'\"]+['\"]$/.test(primeiro)) return null;            // caminho por variável",
    para:"    if (!/^['\"][^'\"]+['\"]$/.test(primeiro)) continue;" },

  { id:'S223', arquivo:FECHO, nome:'comando desconhecido deixa de virar fecho universal',
    real:'"se não é `node`, ignora" — e um `deno`/`python` disparado some do fecho inteiro',
    de:"    if (comando !== 'node') return null;                            // comando que não sei classificar",
    para:'    if (comando !== \'node\') continue;' },

  /* ── F1.14 · O LAÇO DO SERVIDOR ────────────────────────────────────────── */

  { id:'S227', arquivo:SRVLAC, nome:'o laço transmite a cada passo, e não quando muda',
    real:'"na dúvida, avisa" — quatro eventos por segundo por conexão dizendo o que ela já sabe',
    de:"      if (ultimo?.id !== r.id || ultimo.fase !== r.status) anunciar('fase', r);",
    para:"      anunciar('fase', r);" },

  { id:'S228', arquivo:SRVLAC, nome:'a rodada nova abre por cima da que está em luta',
    real:'esquecer a condição de fim — e quem apostou apostou numa rodada que já não existe',
    de:'      if (!r || (fim(r.status) && ultimo?.id === r.id && ultimo.fase === r.status)) {',
    para:'      if (!r || true) {' },

  { id:'S229', arquivo:SRVLAC, nome:'o anúncio manda a rodada por dentro',
    real:'"o objeto já está aqui" — e a semente vai junto com a janela de aposta aberta',
    de:"    sala.transmitir(tipo, sched.paraCliente());",
    para:"    sala.transmitir(tipo, sched.rodadaAtual());" },

  { id:'S230', arquivo:SRVLAC, nome:'a exceção do passo sobe para o temporizador',
    real:'sem try, um erro derruba o setInterval e o jogo para de pé, respondendo a tudo',
    de:'      ultimoErro = e;',
    para:'      ultimoErro = e; throw e;' },

  { id:'S231', arquivo:SRVLAC, nome:'iniciar duas vezes deixa dois laços girando',
    real:'"iniciar é idempotente, óbvio" — e cada fase é transmitida em dobro',
    de:'    if (timer) return timer;              // idempotente: dois laços no mesmo',
    para:'    if (false) return timer;' },

  /* ── F1.14 · A SALA DO LADO DO CLIENTE ────────────────────────────────── */

  { id:'S232', arquivo:SALAC, nome:'a espera entre tentativas deixa de crescer',
    real:'"250 ms está bom" — e mil abas voltando juntas derrubam o servidor que acabou de subir',
    de:'export const esperaPadrao = n => Math.min(ESPERA_BASE * 2 ** n, ESPERA_TETO);',
    para:'export const esperaPadrao = n => ESPERA_BASE;' },

  { id:'S233', arquivo:SALAC, nome:'a espera perde o teto',
    real:'crescer é bom, então crescer sempre é melhor — e quem ficou 10 min fora espera mais 10',
    de:'export const esperaPadrao = n => Math.min(ESPERA_BASE * 2 ** n, ESPERA_TETO);',
    para:'export const esperaPadrao = n => ESPERA_BASE * 2 ** n;' },

  /* A primeira versão do S234 tirava o `clearTimeout` do `sair()` e PASSOU: o
     `conectar()` confere `ligada` na entrada e o `recuar()` confere de novo, e
     o temporizador vazado acorda para não fazer nada. Três guardas
     independentes é defesa em profundidade boa — e mutante equivalente para
     qualquer uma delas sozinha. Reapontado para o erro que de fato produz sala
     fantasma, e que é o mais plausível dos três: "sair é abortar e limpar o
     temporizador", esquecendo que o abort volta pelo `catch`. */
  { id:'S234', arquivo:SALAC, nome:'sair esquece de baixar a bandeira',
    real:'"sair é abortar e limpar o timer" — e o abort volta pelo catch, que reconecta',
    de:'      ligada = false;\n      if (agendado) clearTimeout(agendado);',
    para:'      if (agendado) clearTimeout(agendado);' },

  { id:'S235', arquivo:SALAC, nome:'a reconexão esquece o último id visto',
    real:'"o estado inteiro resolve" — e o histórico do §5.9 deixa de servir para o que foi construído',
    de:"          ...(ultimoId ? { 'last-event-id': String(ultimoId) } : {}),",
    para:'          ...({}),' },

  { id:'S236', arquivo:SALAC, nome:'o quadro é entregue por chegada de pacote',
    real:'"chegou, entrega" — e o JSON cortado no meio pela rede quebra por um motivo que não é o verdadeiro',
    de:"      while ((i = resto.indexOf('\\n\\n')) >= 0) {",
    para:"      while (resto.length && (i = resto.length) >= 0) {" },

  { id:'S237', arquivo:SALAC, nome:'conectar não zera a contagem de tentativas',
    real:'esquecer o reset — e a queda seguinte já nasce esperando o teto do recuo',
    de:'      tentativas = 0;                       // conectou: o recuo recomeça do zero',
    para:'      tentativas = tentativas;' },

  /* O S238 nasceu apontado para o `startsWith(':')` e PASSOU: um batimento não
     casa `event:` nem `data:`, então o guarda logo abaixo o descarta do mesmo
     jeito. Terceiro mutante equivalente deste bloco, e os três têm a mesma
     forma — guarda redundante sobre guarda que já basta. Ver o registro em
     `docs/LACUNAS.md`, L-038. Reapontado para o guarda que de fato segura
     alguma coisa. */
  { id:'S238', arquivo:SALAC, nome:'um quadro ilegível derruba a leitura',
    real:'"se o JSON quebrar, quebrou" — e o evento bom que vinha atrás na mesma conexão some',
    de:'    try { corpo = JSON.parse(dados[1]); } catch { return; }',
    para:'    corpo = JSON.parse(dados[1]);' },

  { id:'S239', arquivo:SABOT, nome:'o portão perde o teto por mutante',
    real:'"nenhum defeito trava" — e o primeiro que travar pendura o portão sem veredito',
    de:'                             timeout: TETO_MUTANTE_MS, killSignal: \'SIGKILL\' },',
    para:'                             },' },

  { id:'S240', arquivo:SRVROT, nome:'a remoção explícita de limite deixa de existir',
    real:'"ilegível é erro, então null também" — e o §28.3 desenha a remoção, não a impossibilidade',
    de:'      if (bruto !== null) {',
    para:'      if (true) {' },

  /* ── F1.14 · AS SEMENTES COSMÉTICAS NA ABERTURA ───────────────────────── */

  { id:'S245', arquivo:SRVSCH, nome:'a semente do AMBIENTE vaza na abertura',
    real:'"publicamos elenco e visual, o ambiente é parecido" — e o clima dá bônus de stat antes da aposta fechar',
    de:"      sementeVisual: derivar(atual.raiz, 'visual'),",
    para:"      sementeVisual: derivar(atual.raiz, 'visual'),\n      sementeAmbiente: derivar(atual.raiz, 'ambiente')," },

  { id:'S246', arquivo:SRVSCH, nome:'a semente publicada não é a da rodada',
    real:'derivar de outra coisa — e o cliente monta uma pool que o settlement não conhece',
    de:"      sementeElenco: derivar(atual.raiz, 'elenco'),",
    para:"      sementeElenco: derivar(atual.abreEm, 'elenco')," },

  /* ── F1.14 · O TEXTO DA CONEXÃO (§5.9) ────────────────────────────────── */

  { id:'S247', arquivo:CONTXT, nome:'a queda de rede passa a falar em aposta perdida',
    real:'"melhor avisar" — e o jogador aposta de novo achando que a primeira sumiu',
    de:"    frase: 'Não conseguimos falar com o servidor. Continuamos tentando — sua ' +\n           'aposta e seu saldo estão guardados lá, e voltam com a conexão.',",
    para:"    frase: 'Conexão perdida. Sua aposta pode ter sido cancelada.'," },

  { id:'S248', arquivo:CONTXT, nome:'conectando e sem rede dizem a mesma coisa',
    real:'"os dois são falta de conexão" — e some a diferença entre esperar e desistir',
    de:"    titulo: 'Sem conexão',",
    para:"    titulo: 'Conectando'," },

  { id:'S249', arquivo:CONTXT, nome:'estado desconhecido deixa a tela muda',
    real:'"não vai acontecer" — e a tela fica em branco no momento em que ele mais precisa de uma palavra',
    de:'export const textoDaConexao = estado => TEXTOS[estado] ?? DESCONHECIDO;',
    para:'export const textoDaConexao = estado => TEXTOS[estado] ?? { frase: "", visivel: false };' },

  { id:'S250', arquivo:CONTXT, nome:'o estado normal passa a ocupar a tela',
    real:'"o jogador gosta de saber que está conectado" — e o aviso permanente rouba espaço da rodada',
    de:"    visivel: false,\n    tentando: false,\n  },\n\n  [ESTADO_SALA.CONECTANDO]:",
    para:"    visivel: true,\n    tentando: false,\n  },\n\n  [ESTADO_SALA.CONECTANDO]:" },

  /* ── F1.14 · O MODO SERVIDOR DO CLIENTE ───────────────────────────────── */

  { id:'S251', arquivo:MODOSRV, nome:'a espera pela rodada desiste e devolve nada',
    real:'"não veio, segue o jogo" — e o app cai para o sorteio local, que é o defeito que o bloco existe para impedir',
    de:'  return new Promise(res => esperandoAbertura.push(res));',
    para:'  return Promise.resolve(ultima);' },

  { id:'S252', arquivo:MODOSRV, nome:'desligar entrega uma rodada a quem esperava',
    real:'"limpar a fila é resolver a fila" — e o app desenha a rodada de um modo que já foi desligado',
    de:'  esperandoAbertura.length = 0;',
    para:'  while (esperandoAbertura.length) esperandoAbertura.shift()(ultima);' },

  { id:'S253', arquivo:MODOSRV, nome:'o índice do lutador deixa de ser o slot do servidor',
    real:'renumerar na tradução — e o jogador aposta num lutador e recebe por outro',
    de:'      idx: l.slot, dex: l.dex, nome: l.nome,',
    para:'      idx: i, dex: l.dex, nome: l.nome,' },

  { id:'S254', arquivo:MODOSRV, nome:'a tela passa a mostrar a margem configurada',
    real:'"o nome do campo é esse" — e a tela mostra a intenção em vez do preço que o §4.4.5 manda auditar',
    de:'    margemConfigurada: rodada.margemEfetiva,',
    para:'    margemConfigurada: rodada.margemConfigurada,' },

  /* ── F1.14 · O LAÇO DE JOGO CONTRA O SERVIDOR ─────────────────────────── */

  { id:'S255', arquivo:FASES, nome:'rede caída faz o app cair para o sorteio local',
    real:'"melhor jogar do que travar" — e o jogador aposta numa rodada que o settlement não conhece',
    /* A PRIMEIRA VERSÃO DESTE MUTANTE ERA INÓCUA, e vale registrar por quê:
       ela punha `|| {…}` depois de um `await` numa promessa que NUNCA resolve,
       então o ramo alternativo jamais rodava. Mutante que não muda
       comportamento não é defeito — é ruído que volta PASSOU e faz o portão
       mentir. Este aqui desiste de verdade, com relógio, que é exatamente a
       forma que a queda tem no mundo real. */
    de:'    const r = await esperarAbertura();',
    para:"    const r = await Promise.race([esperarAbertura(), new Promise(z => setTimeout(() => z(null), 300))]);\n    if (!r) { S.rodadaId = null; S.commit = { commit: 'local' }; S.seeds = sementes(novaRaiz()); S.fighters = sortearPool(S.seeds.elenco); S.weather = null; S.odds = await computeOdds(S.fighters, 400, undefined, S.seeds.raiz, margemConfigurada()); S.passivo = passivoVazio(S.odds, CONF); return montarCena(); }" },

  { id:'S256', arquivo:MODOSRV, nome:'o cliente deixa de conferir a raiz revelada contra a pool que desenhou',
    real:'"a raiz é do servidor, é confiável" — e uma rodada mostrada diferente da jogada passa sem ninguém ver',
    de:'  if (completa.elenco !== sementeElencoUsada) return null;',
    para:'  return completa;' },

  { id:'S257', arquivo:LOOPC, nome:'a janela de aposta volta a fechar pelo relógio local',
    real:'"o relógio é o mesmo" — e a aposta fica aberta aqui e fechada lá, ou o contrário',
    de:'    if (!modoServidor() && CONF.BET_WINDOW - S.clock <= 0) startFight();',
    para:'    if (CONF.BET_WINDOW - S.clock <= 0) startFight();' },

  { id:'S258', arquivo:APOSTAC, nome:'falha de rede vira aposta recusada',
    real:'"o jogador precisa saber que não deu" — e ele aposta de novo, com a primeira possivelmente registrada',
    de:"  if (r.indisponivel) {\n    $('#betInfo').innerHTML =\n      `<b>Não consegui falar com o servidor.</b><br>` +\n      `<span class=\"tiny\">A aposta pode ou não ter sido registrada — não repita. `",
    para:"  if (false) {\n    $('#betInfo').innerHTML =\n      `<b>Não consegui falar com o servidor.</b><br>` +\n      `<span class=\"tiny\">A aposta pode ou não ter sido registrada — não repita. `" },

  { id:'S259', arquivo:RESTELA, nome:'a carteira deixa de voltar do settlement',
    real:'"o saldo já está na tela" — e o número congela na projeção de antes da rodada',
    de:'  if (modoServidor()) hidratar().then(atualizarSaldo);',
    para:'  if (false) hidratar().then(atualizarSaldo);' },

  { id:'S260', arquivo:RESTELA, nome:'o cliente liquida a aposta que o servidor já liquidou',
    real:'duplo lançamento — os números coincidem quase sempre, e o defeito só aparece no dia em que divergem',
    de:'    if (modoServidor()) {',
    para:'    if (false) {' },

  /* ── F1.10 · PROGRESSÃO, TRILHA E RESGATE ─────────────────────────────── */

  { id:'S261', arquivo:EMISSAO, nome:'o resgate passa a escalar com a perda',
    real:'"quem perdeu mais precisa de mais" — e o produto ensina que perder rende',
    de:'  return { conceder: true, motivo: \'concedido\', valor: RESGATE_VALOR };',
    para:'  return { conceder: true, motivo: \'concedido\', valor: RESGATE_VALOR + Math.floor((arguments[0].perdaRecente || 0) / 10) };' },

  { id:'S262', arquivo:EMISSAO, nome:'o resgate ganha orçamento próprio',
    real:'"são coisas diferentes" — e a emissão agregada passa de 80 sem ninguém mexer em número',
    de:'export const ORCAMENTO_ROTINEIRO_SEMANAL = ORCAMENTO_DESAFIOS_SEMANAL;',
    para:'export const ORCAMENTO_ROTINEIRO_SEMANAL = ORCAMENTO_DESAFIOS_SEMANAL + 30;' },

  { id:'S263', arquivo:EMISSAO, nome:'conta em pausa volta a poder receber resgate',
    real:'"ele está zerado, é proteção" — e o presente desfaz o pedido de parar',
    de:"  if (protecaoAtiva) return { conceder: false, motivo: RESGATE_RECUSA.PROTECAO, valor: 0 };",
    para:'' },

  { id:'S264', arquivo:EMISSAO, nome:'o cooldown do resgate conta do PEDIDO',
    real:'"24 h desde que ele pediu" — e dá para pedir tarde e receber na hora',
    de:'  if (!Number.isFinite(ruinaEm) || agora - ruinaEm < RESGATE_COOLDOWN_MS)',
    para:'  if (false)' },

  { id:'S265', arquivo:PROGSRV, nome:'a ruína é remarcada a cada consulta',
    real:'"atualizar o carimbo" — e o cooldown reinicia para sempre, porque quem zerou consulta o tempo todo',
    de:'  if (u?.ruina_em != null) return u.ruina_em;',
    para:'' },

  { id:'S266', arquivo:PROGSRV, nome:'o desafio já concluído conclui de novo',
    real:'condição afrouxada — e o mesmo desafio pode ser pago duas vezes',
    de:"    `SELECT * FROM challenges WHERE user_id = ? AND dia = ? AND tipo = ? AND concluido_em IS NULL`)",
    para:"    `SELECT * FROM challenges WHERE user_id = ? AND dia = ? AND tipo = ?`)" },

  { id:'S267', arquivo:PROGSRV, nome:'o dia da trilha passa a vir do relógio local',
    real:'`toLocaleDateString` no lugar do UTC — e trocar o fuso vira um dia novo',
    de:"export const diaDe = agora => new Date(agora).toISOString().slice(0, 10);",
    para:"export const diaDe = agora => new Date(agora).toLocaleDateString('en-CA');" },

  { id:'S268', arquivo:PROGSRV, nome:'a sequência de login vira contador',
    real:'"somar um por login" — e sete logins no mesmo dia fecham a trilha de sete dias',
    de:'  let n = 0, cursor = diaDe(agora);\n  while (dias.has(cursor)) { n++; cursor = diaAnterior(cursor); }',
    para:'  const n = db.prepare(`SELECT COUNT(*) c FROM login_streak WHERE user_id = ?`).get(userId).c;' },

  /* REAPONTADO: a primeira versão tirava o clamp de `registrarLogin`, e era
     MUTANTE EQUIVALENTE — com 7 PC-B/dia × 7 dias = 49 contra um teto de 50, o
     clamp nunca morde. O que de fato protege o orçamento é o valor diário sair
     da divisão dele, e é para aí que o defeito aponta agora. */
  { id:'S269', arquivo:PROGSRV, nome:'a recompensa diária de login vira número escolhido à mão',
    real:'"10 por dia é mais redondo" — e a trilha passa a emitir 70 contra um orçamento de 50',
    de:'export const LOGIN_POR_DIA = Math.floor(ORCAMENTO_LOGIN_SEMANAL / TRILHA_DIAS);',
    para:'export const LOGIN_POR_DIA = 10;' },

  { id:'S270', arquivo:PROGSRV, nome:'o XP entra sem motivo',
    real:'"o motivo é opcional" — e a curva de progressão vira número sem origem',
    de:"  if (!motivo) throw erro('xp_invalido', 'XP sem motivo não é auditável');",
    para:'' },

  /* ── F1.11 · TELEMETRIA E ADMIN ───────────────────────────────────────── */

  { id:'S271', arquivo:TELESRV, nome:'evento de proteção passa a ser amostrável',
    real:'"a conta de telemetria explodiu" — e some o registro de conformidade que responde "este jogador recebeu o aviso?"',
    de:'  } else if (amostra < 1 && sorteio() >= amostra) {',
    para:'  }\n  if (amostra < 1 && sorteio() >= amostra) {' },

  { id:'S272', arquivo:TELESRV, nome:'a lista de eventos de proteção encolhe',
    real:'"esse é métrica de produto" — e um evento sai da conformidade sem ninguém decidir',
    de:"  'rescue_grant_issued', 'rescue_grant_blocked_by_policy',",
    para:"  'rescue_grant_issued'," },

  { id:'S273', arquivo:TELESRV, nome:'campo obrigatório vazio passa a valer',
    real:'"veio o campo" — e o painel soma zero sem ninguém perceber',
    de:"      if (presentes[c] === undefined || presentes[c] === null || presentes[c] === '')",
    para:'      if (presentes[c] === undefined)' },

  { id:'S274', arquivo:ADMSRV, nome:'ação desconhecida passa a ser permitida',
    real:'"se não está na tabela, não é restrita" — e a ação escrita amanhã nasce liberada',
    de:'  if (!minimo) return false;',
    para:'  if (!minimo) return true;' },

  { id:'S275', arquivo:ADMSRV, nome:'a auditoria passa a ser gravada só no sucesso',
    real:'inverter a ordem — e a ação que falha no meio não deixa rastro, que é a que mais interessa depois',
    de:'  registrar();\n  return executar ? executar(op) : { ok: true };',
    para:'  const r = executar ? executar(op) : { ok: true };\n  registrar();\n  return r;' },

  { id:'S276', arquivo:ADMSRV, nome:'confirmação aceita qualquer coisa verdadeira',
    real:'`if (!confirmado)` — e a string "false" vinda de query confirma',
    de:"  if (DESTRUTIVAS.has(acao) && confirmado !== true)",
    para:'  if (DESTRUTIVAS.has(acao) && !confirmado)' },

  { id:'S277', arquivo:ADMSRV, nome:'o painel passa a somar o saldo guardado',
    real:'"é a mesma conta e é mais rápida" — e o painel mostra a mesma resposta errada que o cache tem',
    de:"    `SELECT bucket, COALESCE(SUM(amount), 0) AS s FROM wallet_ledger\n      WHERE created_at <= ? GROUP BY bucket`).all(ate))",
    para:"    `SELECT bucket, COALESCE(SUM(saldo), 0) AS s FROM carteiras GROUP BY bucket`).all())" },

  { id:'S278', arquivo:ADMSRV, nome:'a ação administrativa dispensa motivo',
    real:'"o operador está identificado, basta" — e seis meses depois ninguém sabe por que a margem mudou',
    de:"  if (!String(motivo).trim())",
    para:'  if (false)' },

  /* ── F1.12 · O CONTENTPACK ORIGINAL ───────────────────────────────────── */

  { id:'S279', arquivo:ORIGV1, nome:'o pack original cai para a arte do outro pack',
    real:'"melhor uma imagem que uma silhueta" — e o jogo original mostra arte da franquia; é a lição da v0.6.1',
    de:'  return COM_ARTE.has(slug) ? `arte/original/${slug}.png` : silhuetaDe(especie);',
    para:'  return COM_ARTE.has(slug) ? `arte/original/${slug}.png` : `https://play.pokemonshowdown.com/sprites/gen5ani/${slug}.gif`;' },

  { id:'S280', arquivo:ORIGV1, nome:'duas criaturas passam a ter a mesma silhueta',
    real:'derivar de menos coisa — e o jogador não distingue em quem está apostando',
    de:'  const a = 18 + (especie.dex * 7) % 22;\n  const b = 30 + (especie.dex * 13) % 30;\n  const c = 8 + (especie.dex * 5) % 14;',
    para:'  const a = 18 + (especie.dex % 3);\n  const b = 30 + (especie.dex % 3);\n  const c = 8 + (especie.dex % 3);' },

  { id:'S281', arquivo:ORIGV1, nome:'a distribuição de força do elenco muda',
    real:'"os números são feios" — e margem, ruína e precisão de odd deixam de valer no dia do lançamento',
    de:"  {dex:1,n:'lufaito',t:['seiva'],s:[40,",
    para:"  {dex:1,n:'lufaito',t:['seiva'],s:[70," },

  { id:'S282', arquivo:ESCOLH, nome:'a escolha de pack ganha um fallback',
    real:'"se não carregar, usa o outro" — e faltou-um-arquivo vira o-jogo-inteiro-saiu-errado, sem ninguém perceber',
    de:'  const p = PACKS[id];',
    para:'  const p = PACKS[id] ?? PACKS[Object.keys(PACKS)[0]];' },

  { id:'S283', arquivo:PACKV, nome:'o pack deixa de precisar declarar os rótulos',
    real:'"quase todo pack tem" — e o cliente volta a escrever o nome de uma franquia',
    de:"  if (exigir(eObj(pack.rotulos), 'rotulos ausente: a interface não tem como nomear as criaturas'))",
    para:'  if (false)' },

  { id:'S224', arquivo:FECHO, nome:'o fecho para de seguir os imports do filho',
    real:'somar só o arquivo do script — mudar o que ele importa deixa de invalidar',
    de:'    for (const d of [...importsDe(a), ...din, ...filhos]) if (!vistos.has(d)) fila.push(d);',
    para:'    for (const d of [...importsDe(a), ...din]) if (!vistos.has(d)) fila.push(d);' },

  { id:'S225', arquivo:FECHO, nome:'o defeito que não carrega perde o arquivo do fecho',
    real:'"o arnês basta" — e editar o arquivo mutado deixa de invalidar o veredito dele',
    de:'    return new Set([...ARNES, arquivoMutado]);',
    para:'    return new Set([...ARNES]);' },

  { id:'S226', arquivo:FECHO, nome:'um binário externo entra na lista errada',
    real:'"`node` é externo também" — e disparar o próprio runner deixa de contar',
    de:"const BINARIOS_EXTERNOS = new Set(['git', 'sh', 'bash', 'npm', 'npx', 'chmod', 'cp', 'rm']);",
    para:"const BINARIOS_EXTERNOS = new Set(['git', 'sh', 'bash', 'npm', 'npx', 'chmod', 'cp', 'rm', 'node']);" },
];
