/* Q2 · SABOTAGEM — o portão que faz os outros valerem.
 *
 * Uma suíte que nunca ficou vermelha não prova nada. Aqui plantamos defeitos
 * de propósito e exigimos que a suíte fique vermelha para cada um. Defeito
 * que passa = teste decorativo = bloco não fecha.
 *
 * Regras (BUILD_BLOCKS §4):
 *   1. o defeito precisa ser plausível — trocar um sinal, inverter uma
 *      comparação, remover uma checagem. Apagar função inteira não prova nada.
 *   2. precisa falhar no teste CERTO — registramos qual pegou qual.
 *
 * Refinamento do F0.2 (lacuna L-007): cada defeito roda DUAS vezes, com e sem
 * os golden tests. Golden byte-exato pega qualquer mudança de comportamento,
 * então ele sozinho não prova cobertura. O que interessa é a coluna "sem
 * golden": defeito que só o golden pega revela área com propriedade fraca.
 *
 * A execução acontece numa CÓPIA do repositório, fora da árvore de trabalho.
 * As duas primeiras versões plantavam o defeito no lugar e restauravam depois,
 * e isso deu errado duas vezes no F0.3d: um timeout matou o processo no meio e
 * deixou defeito plantado, e o gancho de commit pediu para commitar enquanto a
 * execução estava no meio — o que teria gravado o defeito no repositório.
 *
 * O handler de restauração que eu havia escrito não resolve, e vale registrar
 * por quê: enquanto a execução está parada dentro do `execFileSync` que roda a
 * suíte, o laço de eventos do Node não gira e o handler não dispara.
 *
 * Copiar é a resposta certa. A árvore de trabalho fica intocada do começo ao
 * fim, e matar este processo a qualquer momento não deixa rastro.
 *
 * Uso: node test/sabotagem.mjs
 */
import { existsSync, readFileSync, symlinkSync, writeFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

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

const DEFEITOS = [
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
  { id:'S15', arquivo:RENDER, nome:'módulo usa símbolo do motor sem importar',
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
];

/* --- COMO A SABOTAGEM RODA, E POR QUE ASSIM -----------------------------
 *
 * Ela roda sem o portão de navegador: ele custa ~40 s por execução e são duas
 * execuções por defeito. Defeito que escapa das duas é reexecutado COM o
 * navegador, porque aí a pergunta muda — não é mais "a suíte pega?", é "alguém
 * pega?".
 *
 * TRÊS COISAS QUE TIRARAM ESTE PORTÃO DE ~95 min:
 *
 * 1. PARADA ANTECIPADA (`PARAR_CEDO=1`). Aqui a pergunta é binária: a suíte
 *    fica vermelha ou não. Rodar as dez suítes seguintes depois da primeira
 *    falha é trabalho jogado fora, 56 vezes. As suítes também passaram a rodar
 *    em ordem de CUSTO, da mais barata para a mais cara — um defeito que a
 *    carteira pega custa 0,3 s em vez de 40 s.
 *
 * 2. SEGUNDA EXECUÇÃO POR DEDUÇÃO. A coluna "sem golden" existe para revelar
 *    defeito que só o golden byte-exato pega. Mas se a suíte ficou vermelha por
 *    uma suíte QUE NÃO É o golden, então rodar de novo sem o golden dá vermelho
 *    de novo — é dedução, não estimativa. A segunda execução só acontece quando
 *    quem pegou foi o golden.
 *
 * 3. EM PARALELO, uma caixa de areia por trabalhador. Nada disso enfraquece o
 *    portão: as mesmas suítes rodam, com os mesmos dados, na mesma máquina.
 */
function rodar(caixa, semGolden, comVisual) {
  const env = { ...process.env,
    PARAR_CEDO: comVisual ? '' : '1',
    ...(semGolden ? { SEM_GOLDEN: '1' } : {}),
    ...(comVisual ? {} : { SEM_VISUAL: '1' }) };
  return new Promise(res => {
    execFile('node', ['test/run.mjs'], { encoding:'utf8', env, cwd:caixa, maxBuffer: 32*1024*1024 },
      (err, stdout, stderr) => res({ vermelha: !!err, saida: (stdout||'') + (stderr||'') }));
  });
}

const suitesQuePegaram = saida => {
  const nomes = [...new Set(saida.split('\n').filter(l => /^\s{2}\[/.test(l))
    .map(l => l.match(/^\s{2}\[([\w-]+)\]/)?.[1]).filter(Boolean))];
  /* Defeito que impede o módulo de carregar derruba a execução inteira em vez
     de reprovar um teste. Continua sendo vermelho, mas é outra coisa e o
     relatório não deve fingir que foi uma suíte que pegou. */
  return nomes.length ? nomes : ['(não carrega)'];
};

const ARQUIVOS = [MOTOR, APP, ESTADO, RENDER, DOM, EFEITOS, COREO, SPRITES, LIGACAO, PACK, VALID,
                  SEMENTE, FASES, PRECO, CLIMA, EXPO, PAINEL, BOLSO, BANCO, INFO, ASSETS, COMMIT, TELEM, PROGR, TEMA];
const originais = new Map();
for (const f of ARQUIVOS) originais.set(f, readFileSync(f, 'utf8'));

/* Uma caixa por trabalhador. A árvore de trabalho fica intocada do começo ao
   fim, e matar este processo a qualquer momento não deixa rastro. */
const N_TRAB = Math.max(1, Math.min(cpus().length, 4));
const CAIXAS = [];
for (let i = 0; i < N_TRAB; i++) {
  const c = mkdtempSync(join(tmpdir(), 'pokearena-sabotagem-'));
  /* `docs/` entra desde o F0.10 (test/saida-v09.mjs confere o §4.8 contra a
     Spec e o registro das lacunas) e `arte/` desde o V1.13 (test/tema.mjs
     confere que a arte referenciada pelo CSS existe). Sem eles a suíte nem
     roda na caixa — e caixa que não roda a suíte reprova tudo por igual. */
  for (const dir of ['engine', 'app', 'test', 'prototype', 'content', 'tools', 'docs', 'arte'])
    cpSync(dir, join(c, dir), { recursive: true });
  cpSync('package.json', join(c, 'package.json'));
  /* `.gitignore` entra porque test/assets.mjs afirma que a arte não é
     versionada, e essa afirmação se lê nele. `assets/` entra por link
     simbólico: são ~10 MB e copiá-los quatro vezes por execução é desperdício
     puro — nenhum defeito plantado mexe em arte. */
  cpSync('.gitignore', join(c, '.gitignore'));
  if (existsSync('assets')) symlinkSync(join(process.cwd(), 'assets'), join(c, 'assets'), 'dir');
  CAIXAS.push(c);
}
console.log(`${N_TRAB} caixa(s) de areia em ${tmpdir()}\n`);

console.log('Q2 · SABOTAGEM\n');
if ((await rodar(CAIXAS[0], false, false)).vermelha) {
  console.error('ABORTADO: a suíte já está vermelha.'); process.exit(2);
}
console.log('linha de base: VERDE\n');

async function avaliar(d, caixa) {
  const src = originais.get(d.arquivo);
  if (!src.includes(d.de)) return { ...d, status:'ÂNCORA PERDIDA', com:'-', sem:'-' };
  const alvo = join(caixa, d.arquivo);
  writeFileSync(alvo, src.replace(d.de, d.para));
  try {
    let comG = await rodar(caixa, false, false);
    let pegouPor = comG.vermelha ? suitesQuePegaram(comG.saida) : [];

    /* Dedução: vermelho por suíte que não é o golden => vermelho sem o golden
       também. Só quando o golden é o único que pega é preciso confirmar. */
    let semVermelha = comG.vermelha && pegouPor.some(n => n !== 'golden');
    let semPor = pegouPor.filter(n => n !== 'golden');
    let instavel = false;

    if (comG.vermelha && !semVermelha) {
      const semG = await rodar(caixa, true, false);
      semVermelha = semG.vermelha;
      semPor = semG.vermelha ? suitesQuePegaram(semG.saida) : [];
      /* CONFIRMAÇÃO DO CASO SUSPEITO. "Vermelho com golden, verde sem" é o sinal
         que este relatório existe para dar — e é TAMBÉM o que uma falha
         transitória produz. Aconteceu no F0.9 com o S35, que em caixa limpa
         passa nos dois modos. Como o caso é raro, confirmar custa pouco. */
      if (!semG.vermelha) {
        const comG2 = await rodar(caixa, false, false);
        if (!comG2.vermelha) { instavel = true; comG = comG2; pegouPor = []; }
      }
    }

    let navegador = '';
    if (!comG.vermelha) {
      navegador = (await rodar(caixa, false, true)).vermelha ? 'só o navegador' : '';
    }
    return { ...d, instavel,
      status: instavel ? 'INSTÁVEL' : (comG.vermelha || navegador ? 'PEGOU' : 'PASSOU'),
      com: comG.vermelha ? pegouPor.join(',') : navegador,
      sem: comG.vermelha ? (semVermelha ? semPor.join(',') : 'NADA') : navegador };
  } finally {
    writeFileSync(alvo, src);   // desfaz dentro da caixa
  }
}

/* Fila simples: cada caixa puxa o próximo defeito quando termina o seu. */
const fila = DEFEITOS.slice();
const res = [];
let feitos = 0;
await Promise.all(CAIXAS.map(async caixa => {
  for (;;) {
    const d = fila.shift();
    if (!d) return;
    res.push(await avaliar(d, caixa));
    process.stdout.write(`\r  ${++feitos}/${DEFEITOS.length} avaliados`);
  }
}));
console.log('\n');
/* A fila devolve fora de ordem; o relatório é lido por id. */
const ordem = new Map(DEFEITOS.map((d, i) => [d.id, i]));
res.sort((a, b) => ordem.get(a.id) - ordem.get(b.id));

for (const c of CAIXAS) rmSync(c, { recursive:true, force:true });

console.log('id   defeito                                 status    sem golden, pego por');
console.log('─'.repeat(96));
for (const r of res)
  console.log(`${r.id.padEnd(4)} ${r.nome.padEnd(39)} ${(r.status==='PEGOU'?'✓':'✗')} ${r.status.padEnd(8)} ${r.sem}`);

const escaparam = res.filter(r => r.status !== 'PEGOU');
const instaveis = res.filter(r => r.instavel);
const soGolden  = res.filter(r => r.status === 'PEGOU' && r.sem === 'NADA');

console.log('');
if (escaparam.length) {
  console.log(`Q2 VERMELHO — ${escaparam.length}/${DEFEITOS.length} passaram despercebidos:`);
  for (const r of escaparam) console.log(`  · ${r.id} ${r.nome} — ${r.real}`);
}
if (soGolden.length) {
  console.log(`\n⚠ ${soGolden.length} defeito(s) só o golden pega — cobertura de propriedade fraca:`);
  for (const r of soGolden) console.log(`  · ${r.id} ${r.nome}`);
}
if (instaveis.length) {
  console.log(`\n⚠ ${instaveis.length} defeito(s) com resultado INSTÁVEL entre execuções.`);
  console.log('  Não contam como pegos: dúvida sobre cobertura tem que aparecer como dúvida.');
  for (const r of instaveis) console.log(`  · ${r.id} ${r.nome}`);
}
if (escaparam.length) process.exit(1);
console.log(`Q2 VERDE — ${DEFEITOS.length}/${DEFEITOS.length} detectados` +
            (soGolden.length ? `, mas ${soGolden.length} dependem do golden.` : ', nenhum dependente só do golden.'));
console.log(`caixas de areia removidas; a árvore de trabalho não foi tocada.`);
