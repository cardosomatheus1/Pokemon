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
const ELENCO = 'engine/elenco-estagio.mjs';
const AVANCO = 'engine/avanco.mjs';
const BOLA   = 'engine/avanco-bola.mjs';
const AUSENTE= 'engine/ausente.mjs';
const ITENS  = 'content/itens_v1.mjs';
const WAVE   = 'engine/wave.mjs';
const ROTEIRO= 'engine/roteiro-wave.mjs';
const RUNAV  = 'engine/run-avanco.mjs';
const AVEST  = 'app/modules/avanco-estado.mjs';
const AVCENA = 'app/modules/avanco-cena.mjs';
const FOLHAVIVA = 'app/modules/folha-viva.mjs';
const CLIMAENG = 'engine/clima-idle.mjs';
const CLIMACOLA = 'app/modules/avanco-clima.mjs';
const CLIMAPART = 'app/modules/clima-particulas.mjs';
const COMPANHEIRO = 'app/modules/idle-companheiro.mjs';
const BAIXADOR = 'tools/baixar-assets.mjs';
const AVTELA = 'app/modules/avanco-tela.mjs';
const AVPAINEL = 'app/modules/avanco-painel.mjs';
/* REALVADOS: as frases do foco saíram do painel para camada 0 quando o portão
   provou que frase dentro de `innerHTML` não tem como ser afirmada. */
const AVFOCO = 'app/modules/avanco-foco.mjs';
/* O que a tela de ESCOLHA responde — o cartão e a sala (L-164), camada 0. */
const ESCOLHA = 'app/modules/idle-escolha.mjs';
const HORA = 'app/modules/hora-do-dia.mjs';
const TELA_IDLE_134 = 'app/modules/idle-tela.mjs';
const PARTIC_134 = 'app/modules/particulas.mjs';
const COND_133 = 'app/modules/elenco-condicao.mjs';
const BIOMAS_133 = 'app/modules/idle-biomas.mjs';
const KANTO_133 = 'content/pokemon_kanto_v1.mjs';

/* Os golpes liberados por NÍVEL (L-168) e o anúncio do chefe (L-170). */
const REPERT = 'engine/repertorio.mjs';
const BOSS = 'app/modules/avanco-boss.mjs';
/* O efeito do golpe SOBRE o alvo — a metade que faltava (L-171). */
const AVEFX = 'app/modules/avanco-efeito.mjs';
const ESTAGIOS_TELA = 'app/modules/idle-estagios.mjs';
const FOCO2 = 'engine/foco.mjs';
/* A placa, o balão e o número saíram para cá quando a cena passou de 600 linhas. */
const AVHUD  = 'app/modules/avanco-hud.mjs';
/* A conta da separação mudou de casa quando o S934 escapou: enquanto ela morava
   junto do `style.transform`, nenhum teste podia afirmá-la sem montar um DOM.
   REALVE, e nunca apague — a âncora perdida quase sempre quer dizer que um
   bloco moveu o trecho. */
const AVGEO2 = 'app/modules/avanco-geometria.mjs';
const ROTWAVE = 'engine/roteiro-wave.mjs';
/* O quadro "quem apareceu" passou a servir aos DOIS modos no L-166. */
const PAINEIS = 'app/modules/idle-paineis.mjs';
/* A COLUNA DA ESQUERDA saiu do AVTELA no A4g. Os defeitos ancorados nela são
   REALVADOS para onde o comportamento mora hoje — nunca apagados: âncora
   perdida quase sempre significa que um bloco moveu o trecho, e apagar o
   defeito é perder a cobertura sem ninguém decidir isso. */
const AVPAIN = 'app/modules/avanco-painel.mjs';
const AVGEO  = 'app/modules/avanco-geometria.mjs';
const VITRINE = 'engine/vitrine.mjs';
const ESTILH  = 'engine/estilhaco.mjs';
/* O MOTOR da carteira, e nao a tela: `CARTEIRA` ja existia apontando para
   `app/modules/carteira.mjs`, que e outra coisa. Dois nomes parecidos para
   arquivos diferentes e como se planta defeito no lugar errado. */
const CARTEIRA_MOTOR = 'engine/carteira.mjs';
const COSMET  = 'app/modules/cosmeticos.mjs';
const IDADOS = 'app/modules/idle-dados.mjs';
/* REALVADOS no L-162: a COLHEITA saiu do `idle-dados.mjs` quando ele passou das
   600 linhas. Os cinco defeitos ancorados nela mudam de endereço — nunca de
   existência: âncora perdida quase sempre quer dizer que um bloco moveu o
   trecho, e apagar o defeito é perder a cobertura sem ninguém decidir isso. */
const IDCOLH = 'app/modules/idle-colheita.mjs';
/* O LANCE MUDOU DE CASA no 1.29, quando o `idle-dados` passou de 600 linhas
   pela terceira vez. Os defeitos ancorados nele são REALVADOS para onde o
   comportamento mora hoje — nunca apagados. */
const ILANCE = 'app/modules/idle-lance.mjs';
/* A BOLSA MUDOU DE CASA no A4e, e o defeito foi REALVADO para onde o
   comportamento mora hoje — a regra do pré-voo: âncora perdida quase sempre é
   um bloco que moveu o trecho, e apagar o defeito é perder a cobertura. */
const IBOLSA = 'app/modules/idle-bolsa.mjs';
const APP    = 'app/index.html';
const ESTADO = 'app/modules/estado.mjs';
const RENDER = 'app/modules/render.mjs';
const PORTAO = 'test/portao.mjs';
const DOM    = 'app/modules/dom.mjs';
const TICKER = 'app/modules/ticker.mjs';
const BNTEXTO= 'app/modules/banner-texto.mjs';
const ZONA   = 'app/modules/zona-acao.mjs';
const EFEITOS= 'app/modules/efeitos.mjs';
const COREO  = 'app/modules/coreografia.mjs';
const SPRITES= 'app/modules/sprites.mjs';
const BAIXA  = 'tools/baixar-assets.mjs';
const PACKORIG='content/original_v1.mjs';
const SCHED  = 'server/scheduler.mjs';
const FILTRO = 'app/modules/filtro-cor.mjs';
const DISTR  = 'engine/distribuicao.mjs';
const POLIT  = 'server/politica.mjs';
const GRAF   = 'app/modules/grafico.mjs';
const ADMCLI = 'app/modules/adm.mjs';
const LIGACAO= 'app/modules/motor.mjs';
const LIGA    = 'server/liga.mjs';
const PACK   = 'content/pokemon_kanto_v1.mjs';
const VALID  = 'engine/pack.mjs';
const SEMENTE= 'engine/seed.mjs';
const FASES  = 'app/modules/fases.mjs';
const LACO   = 'app/modules/loop.mjs';
const BOLAS  = 'app/modules/bolas-dados.mjs';
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
/* REALVADO NO BLOCO 0.1. A aritmética de progressão saiu de
   `app/modules/progressao.mjs` para `engine/progressao.mjs`, porque passou a
   ter dois donos — a tela de resultado e a liquidação no servidor (D-045). O
   que restou em `app/` é uma reexportação sem regra nenhuma.

   Os cinco defeitos que apontam para cá (S67, S394 a S397) ancoram em trechos
   que foram JUNTO, então o realve é só o caminho. `CLAUDE.md`: âncora perdida
   quase sempre significa que um bloco moveu o trecho — realve o defeito para
   onde o comportamento mora hoje, não apague o defeito. */
const PROGR  = 'engine/progressao.mjs';
const TEMA   = 'app/modules/tema.mjs';
const ARENAD = 'app/modules/arenas-dados.mjs';
const ANCORAS= 'test/ancoras.mjs';
const ODDS   = 'app/modules/odds.mjs';
const APOSTA = 'app/modules/aposta.mjs';
const EXPOENG= 'engine/exposicao.mjs';
const KILLF  = 'app/modules/killfeed.mjs';
/* REALVADO NO BLOCO 0.1, e SÓ EM PARTE — por isso são duas constantes.

   `ordemDeQuedas`, `colocacaoDe` e `abatesDe` foram para `engine/colocacao.mjs`
   porque a liquidação no servidor passou a precisar delas (D-045). `realceDoPodio`
   e `rankingColocacao` ficaram em `app/`: respondem como a coisa APARECE, e o
   servidor não tem tela.

   Os quatro defeitos daqui seguiram o comportamento que cada um afirma: o S87 e
   o S88 ancoram na travessia dos eventos e foram junto; o S314 e o S315 ancoram
   no pódio e ficaram. Realvar em bloco os quatro teria feito dois deles apontar
   para um arquivo que não tem mais o trecho — e âncora perdida aborta o portão
   no pré-voo, que é como este realve foi conferido. */
/* REALVADO NO BLOCO 0.1, e SÓ EM PARTE — por isso são duas constantes.

   `ordemDeQuedas`, `colocacaoDe` e `abatesDe` foram para `engine/colocacao.mjs`
   porque a liquidação no servidor passou a precisar delas (D-045).
   `realceDoPodio` e `rankingColocacao` ficaram em `app/`: elas respondem como a
   coisa APARECE, e o servidor não tem tela.

   Os quatro defeitos daqui seguiram o comportamento que cada um afirma — o S87
   e o S88 ancoram na travessia dos eventos e foram junto; o S314 e o S315
   ancoram no pódio e ficaram. Realvar os quatro em bloco teria feito dois deles
   apontar para um arquivo que não tem mais o trecho, e âncora perdida aborta o
   portão no pré-voo. */
const COLOC  = 'app/modules/colocacao.mjs';   // o que é da tela
const COLOCE = 'engine/colocacao.mjs';        // a aritmética que o servidor usa
const MARCA  = 'app/modules/marca.mjs';
const MINILOG= 'app/modules/mini-log.mjs';
const CUSTOM = 'app/modules/customizacao.mjs';
const ADMTELA= 'app/modules/adm.mjs';
const BANNERD= 'app/modules/banner-dados.mjs';
const LIGAD  = 'app/modules/liga-dados.mjs';
const ARTESD = 'app/modules/artes-dados.mjs';
const SERVIR = 'tools/servir.mjs';
const PERFIL = 'app/modules/perfil.mjs';
const PERFDAD= 'app/modules/perfil-dados.mjs';
const BANNER = 'app/modules/banner.mjs';
const SHINYD = 'app/modules/shiny-dados.mjs';
const ADMD   = 'app/modules/adm-dados.mjs';
const SIMS   = 'app/modules/sims.mjs';
const VISUAL = 'test/visual.mjs';
const RUNNER = 'test/run.mjs';
/* D-101: o contrato de execução saiu da sabotagem para `execucao.mjs`, que é o
   único pedaço do portão que fica no ARNES. Os defeitos que protegem esse
   contrato mudam de endereço junto — realvar, nunca apagar. */
const EXECUCAO = 'test/execucao.mjs';
const SABOT  = 'test/sabotagem.mjs';
const MODULOS= 'test/modulos.mjs';
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
const BANCOC = 'app/modules/banco.mjs';
const ADMAUTH= 'server/admin-auth.mjs';
const ROTASSRV2 = 'server/rotas.mjs';
const TELESRV= 'server/telemetria.mjs';
const PACKV  = 'engine/pack.mjs';
const ORIGV1 = 'content/original_v1.mjs';
const ESCOLH = 'content/escolhido.mjs';
const ADMSRV = 'server/admin.mjs';
const CARTEIRA= 'app/modules/carteira.mjs';
const CEDULA = 'app/modules/cedula.mjs';
const CALIBRACAO = 'engine/calibracao.mjs';
const NAVEG  = 'app/modules/navegacao.mjs';
const RODADA = 'app/modules/rodada.mjs';
const SRVLAC = 'server/laco.mjs';
const SALAC  = 'app/modules/sala.mjs';
const CONTXT = 'app/modules/conexao-texto.mjs';
const MODOSRV= 'app/modules/modo-servidor.mjs';
const INST   = 'engine/instancia.mjs';
const BIOMA  = 'engine/bioma.mjs';
const EVO    = 'engine/evolucao.mjs';
const CRIAT  = 'server/criaturas.mjs';
const EXPED  = 'engine/expedicao.mjs';
const CAPT   = 'engine/captura.mjs';
const DROPS  = 'engine/drops.mjs';
const IDLE   = 'server/idle.mjs';
const MUNDO  = 'app/modules/mundo.mjs';
const ECON = 'engine/economia-idle.mjs';
const NIV  = 'engine/nivel-criatura.mjs';
const EST  = 'engine/estagios.mjs';
const NPC  = 'engine/npc.mjs';
const CAT  = 'content/itens_v1.mjs';
const ITELA  = 'app/modules/idle-tela.mjs';
/* A CENA saiu da aba no 1.5c. Os defeitos que moravam no codigo movido vieram
   junto: eles afirmam o mesmo comportamento, que so mudou de arquivo. */
const IMUNDO = 'app/modules/idle-mundo.mjs';
const ICOMP  = 'app/modules/idle-companheiro.mjs';
const VIDA   = 'app/modules/vida.mjs';
const PART   = 'app/modules/particulas.mjs';
const RELEVO = 'app/modules/relevo.mjs';
const COMPOS = 'app/modules/composicao.mjs';
const FOCO   = 'engine/foco.mjs';
const HUD    = 'app/modules/idle-hud.mjs';
const PAGINA = 'app/index.html';
const CAMPO  = 'app/modules/idle-campo.mjs';
const PDXD   = 'app/modules/pokedex-dados.mjs';
const PDX    = 'app/modules/pokedex.mjs';
const EVOI   = 'app/modules/evolucao-idle.mjs';
const INOME  = 'app/modules/itens-nome.mjs';
const ORIGEM = 'test/origem.mjs';
const CAPTEL = 'app/modules/captura-tela.mjs';
const RARI   = 'app/modules/raridade.mjs';
const AUDIO2 = 'app/modules/audio.mjs';
const CAPCEN = 'app/modules/captura-cena.mjs';
const RESUMO = 'app/modules/expedicao-resumo.mjs';
const LOJA   = 'engine/loja.mjs';
const BANCO2 = 'app/modules/banco.mjs';
const CTRL   = 'app/modules/controles.mjs';
const LOJAT  = 'app/modules/loja-tela.mjs';
const APPH   = 'app/index.html';
const CONFIR = 'app/modules/idle-confirma.mjs';
const EQUIPE = 'app/modules/idle-equipe.mjs';
const EVOT   = 'app/modules/evolucao-tela.mjs';
const TELA   = 'app/modules/idle-tela.mjs';
const IDLED  = 'app/modules/idle-dados.mjs';
const FAUNAM = 'app/modules/fauna.mjs';
const ROTAS  = 'engine/rotas.mjs';
const BIOMA2 = 'engine/bioma.mjs';
const HTML   = 'app/index.html';
const PACKO  = 'content/original_v1.mjs';

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
    /* REALVADO no 1.26: o balde `comprado` entrou na ordem, logo depois do
       bonus — restrito antes de livre, para o cadeado se dissolver com o uso. */
    de:"export const ORDEM_CONSUMO = ['bonus', 'comprado', 'competitivo', 'transferivel'];",
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
  /* REALVADO NO D-023: as sondas de navegador passaram de `Promise.all` para
     fila, e cada uma virou uma função. O defeito segue o comportamento — uma
     sonda que some da lista —, não o formato antigo da linha. */
  /* REALVADO no T9 (D-098): a fila passou a ser condicional (`se(...)`), então
     o trecho antigo deixou de existir. O comportamento protegido é o MESMO —
     uma sonda sumir da fila em silêncio — e por isso o defeito muda de
     endereço em vez de sair da lista. É a regra do pré-voo no CLAUDE.md, e foi
     o próprio pré-voo que pegou a âncora perdida. */
  { id:'S82', arquivo:RUNNER, nome:'uma execução de navegador some da fila',
    real:'linha comentada para "testar mais rápido" e esquecida — o portão encolhe em silêncio',
    de:"    se('temaCedo',       () => visual.rodarTemaSemModulos()),",
    para:'    () => Promise.resolve(null),' },

  /* ---------- T10: a luta em sonda própria ---------------------------------- */

  /* O corte tira ~31 s de espera de cada mutante de navegador. Estes defendem
     que ele não tirou COBERTURA junto. */

  { id:'S997', arquivo:'test/bandeiras.mjs', nome:'a suite da luta perde a sonda dela',
    real:'visual-luta sai do recorte em silencio e os quatro testes nunca rodam — o S109',
    de:"  'visual-luta':     'luta',",
    para:"  'visual-luta':     'rodar'," },

  { id:'S998', arquivo:'test/bandeiras.mjs', nome:'sonda pedida que nao devolveu resultado deixa de abortar',
    real:'a suite a jusante le null e passa por VAZIA — o S109 por dentro',
    de:"  return [...sondas].filter(s => s in (resultados || {}) && !resultados[s]);",
    para:'  return [];' },

  { id:'S999', arquivo:'test/execucao.mjs', nome:'a luta sai da lista que o portao passa no --so',
    real:'o portao deixa de rodar a suite da luta na passada de navegador — cobertura ausente com relatorio verde',
    de:"export const SUITES_NAVEGADOR = 'visual,visual-luta,",
    para:"export const SUITES_NAVEGADOR = 'visual," },

  /* ---------- T9: o corte das sondas, e as guardas que o tornam seguro ------ */

  /* O corte é a maior economia do portão E a forma mais fácil de uma suíte
     sumir calada. Cada um destes derruba uma das decisões do bloco. */

  { id:'S993', arquivo:'test/bandeiras.mjs', nome:'o conjunto de sondas volta a ser tudo ou nada',
    real:'o corte some e `--so=visual` volta a subir as sete sondas — 226 s onde bastavam 82',
    de:'  const pedidas = (!so || !so.length) ? Object.keys(SONDA_DA_SUITE) : so;',
    para:'  const pedidas = Object.keys(SONDA_DA_SUITE);' },

  { id:'S994', arquivo:'test/bandeiras.mjs', nome:'a recusa do --sem-navegador para de valer para as sondas',
    real:'`npm run rapido` volta a subir Chromium que ninguém lê — o D-059 inteiro de volta',
    de:"  if (!precisaNavegador({ so, semNavegador, comNavegador })) return new Set();",
    para:'  if (false) return new Set();' },

  { id:'S995', arquivo:'test/bandeiras.mjs', nome:'contraste e rodada-viva ganham sonda propria',
    real:'duas sondas a mais por mutante, para ler o que a `rodar()` ja tinha capturado',
    de:"  'contraste':       'rodar',",
    para:"  'contraste':       'contrastePropria'," },

  /* REALVADOS no D-103. Os dois moravam no `run.mjs` e ESCAPARAM no Q2 de
     15/09 — ponto de entrada não se importa de um teste, então ninguém os
     observava. As decisões foram para `bandeiras.mjs`, camada 0, e o defeito
     muda de endereço junto. */
  { id:'S996', arquivo:'test/bandeiras.mjs', nome:'sonda que subiu e nao virou suite passa em silencio',
    real:'a guarda do S109 cai, e o portao fica VERDE tendo olhado menos do que promete',
    de:'    .filter(n => !feitas.has(n));',
    para:'    .filter(() => false);' },

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

  { id:'S87', arquivo:COLOCE, nome:'killstreak volta a contar como queda',
    real:'a checagem some numa simplificação — e alguém "cai" duas vezes, deslocando a colocação inteira',
    de:'    if (ev.streak) continue;\n', para:'' },

  { id:'S88', arquivo:COLOCE, nome:'a queda por tempestade deixa de contar',
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
    /* REALVADO no 1.13: a ficha virou a NOTA que o dono desenhou, e o valor
       passou a ser um selo no canto. A regra nao mudou uma virgula — o §28
       protege o jogador de sentir a perda em reais, e um "R$ 5,00" na ficha
       de aposta e exatamente isso. */
    de:"        <b>${v.toLocaleString('pt-BR')}</b>",
    para:"        <b>R$ ${(v/PC_POR_REAL).toFixed(2)}</b>" },

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
  { id:'S113', arquivo:EXECUCAO, nome:'a passada com navegador deixa de rodar uma suíte de navegador',
    real:'lista encolhida numa limpeza — defeito que só aquela suíte pega volta como PASSOU',
    /* REALVADO no 1.5: a lista ganhou  e a âncora antiga morreu.
       O defeito NÃO foi apagado — o comportamento continua o mesmo, só mudou de
       texto, e apagar aqui seria exatamente a falha que o pré-voo existe para
       impedir. Removo a suíte NOVA de propósito: é a que um esquecimento real
       deixaria de fora, porque é a última da lista. */
    de: "export const SUITES_NAVEGADOR = 'visual,visual-luta,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,sem-backend,rodada-completa,contraste,outfit-canvas';",
    para:"const SUITES_NAVEGADOR = 'visual,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,sem-backend,rodada-completa,contraste';" },
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

  { id:'S239', arquivo:EXECUCAO, nome:'o portão perde o teto por mutante',
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
    /* REALVADO NO F1.17: `registrar()` virou `registrarAuditoria`, extraída
       porque o login de operador também precisa dela. O defeito segue o
       COMPORTAMENTO — registrar ANTES de executar —, e não o nome antigo. */
    de:'  registrarAuditoria(db, { operadorId: op.id, acao, alvo, de, para, motivo, agora });\n  return executar ? executar(op) : { ok: true };',
    para:'  const r = executar ? executar(op) : { ok: true };\n  registrarAuditoria(db, { operadorId: op.id, acao, alvo, de, para, motivo, agora });\n  return r;' },

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

  /* ── F1.17 · O OPERADOR PROVA QUEM É ──────────────────────────────────── */

  { id:'S291', arquivo:ROTASSRV2, nome:'o painel volta a aceitar o id do operador como credencial',
    real:'"o cabeçalho antigo por compatibilidade" — e o id, que aparece em toda linha de auditoria, abre tudo de novo',
    de:"  const sessao = lerSessaoAdmin(db, { token, agora, girar: true });\n  if (!sessao) return erro(401, ERROS.NAO_AUTORIZADO, 'sessão de operador ausente, expirada ou inválida');",
    para:"  const sessao = lerSessaoAdmin(db, { token, agora, girar: true }) || { operadorId: token };" },

  { id:'S292', arquivo:ADMAUTH, nome:'a sessão administrativa deixa de expirar',
    real:'"o operador reclama de ser deslogado" — e um terminal esquecido vira acesso permanente ao painel',
    de:'  if (agora >= s.expira_em) return null;',
    para:'' },

  { id:'S293', arquivo:ADMAUTH, nome:'a rotação deixa o token anterior vivo',
    real:'"não invalidar para não quebrar o pedido em voo" — e passa a haver dois tokens válidos onde havia um',
    de:'  db.prepare(`UPDATE admin_sessoes SET encerrada_em = ? WHERE token = ?`).run(agora, token);\n  db.prepare(`INSERT INTO admin_sessoes (token, operador_id, criada_em, expira_em,',
    para:'  db.prepare(`INSERT INTO admin_sessoes (token, operador_id, criada_em, expira_em,' },

  { id:'S294', arquivo:ADMAUTH, nome:'o login de operador sai da auditoria',
    real:'"login não é ação administrativa" — e "quem entrou", a primeira pergunta de qualquer investigação, fica sem resposta',
    de:"  registrarAuditoria(db, { operadorId: op.id, acao: 'operador.entrou',\n    alvo: op.email, motivo: '', agora });",
    para:'' },

  { id:'S295', arquivo:ADMAUTH, nome:'a recusa distingue senha errada de operador inexistente',
    real:'"a mensagem ajuda o operador" — e a tela de login vira consulta de quem tem acesso',
    de:"    throw erro(ERRO_ADMIN_AUTH.CREDENCIAL, 'credenciais inválidas');\n  }\n\n  /* O CÓDIGO NÃO SE REUSA.",
    para:"    throw erro(ERRO_ADMIN_AUTH.CREDENCIAL, op ? 'senha ou código inválidos' : 'operador não encontrado');\n  }\n\n  /* O CÓDIGO NÃO SE REUSA." },

  { id:'S296', arquivo:ADMAUTH, nome:'o hash fantasma some, e o relógio vira o enumerador',
    real:'"não faz sentido rodar scrypt sem operador" — e a resposta instantânea diz que o e-mail não existe',
    de:"  const senhaOk = confere(String(senha ?? ''), op?.senha_hash ?? HASH_FANTASMA);",
    para:"  const senhaOk = op?.senha_hash ? confere(String(senha ?? ''), op.senha_hash) : false;" },

  { id:'S297', arquivo:ADMAUTH, nome:'o código do segundo fator pode ser reusado',
    real:'"ele é de 30 segundos, já expira" — e quem viu o número por cima do ombro o digita dentro da janela',
    de:'  if (jaUsado) {',
    para:'  if (false) {' },

  /* ── F1.16 · O CLIENTE NÃO É FONTE DE DINHEIRO ────────────────────────── */

  { id:'S298', arquivo:BANCOC, nome:'o boot volta a criar carteira local em modo servidor',
    real:'"é só a projeção inicial" — e nasce um WELCOME_GRANT órfão que a próxima exceção de teste esconde',
    de:'  if (modoServidor()) {\n    S.carteira = carteiraVazia();\n    S.carteira.projecao = true;',
    para:'  if (false) {\n    S.carteira = carteiraVazia();\n    S.carteira.projecao = true;' },

  { id:'S299', arquivo:BANCOC, nome:'a fachada volta a gravar no armazenamento com sessão',
    real:'"salvar não faz mal" — e o cliente vira segunda contabilidade para o mesmo dinheiro',
    de:'  if (modoServidor()) return;',
    para:'' },

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
  /* ── OS NOVE DO 1.34: DIA, TARDE E NOITE ──────────────────────────────
     SETE são de Node, e isso é a regra de custo do CLAUDE.md funcionando: toda
     decisão da hora mora em camada 0. Os dois de CSS também são pegos em Node,
     pelo teste estrutural do `idle-tela`. ZERO mutantes de navegador. */

  { id:'S1011', arquivo:HORA, nome:'o brilho noturno deixa de ser zero de dia',
    real:'"um pouco de brilho de dia não faz mal" — e o cenário diurno que o dono já aprovou olhando passa a mudar',
    de:'  return Math.round(clamp((f - 1) / (FORCA_NOITE - 1)) * 1000) / 1000;',
    para:'  return Math.round(clamp((f - 0.8) / (FORCA_NOITE - 1)) * 1000) / 1000;' },

  { id:'S1012', arquivo:HORA, nome:'a lua passa a nascer do lado oposto ao do sol',
    real:'"lado oposto" lido ao pé da letra — e contradiz a outra frase do dono: "onde sol nasce e se põe e o mesmo para lua"',
    de:'export const ARCO_INVERTE_PARA_LUA = false;',
    para:'export const ARCO_INVERTE_PARA_LUA = true;' },

  { id:'S1013', arquivo:HORA, nome:'a luz do meio-dia deixa de ser branca',
    real:'"um leve tom azulado dá clima" — e o multiply passa a mexer na cena de dia inteira, o tempo todo',
    de:'  dia:    [255, 255, 255],   // a cena como foi pintada',
    para:'  dia:    [240, 240, 255],   // a cena como foi pintada' },

  { id:'S1014', arquivo:HORA, nome:'a noite escurece sem ficar azul',
    real:'"escuro é escuro" — e a noite vira tela apagada, e não luar',
    de:'  noite:  [58, 80, 170],     // luar: pouco, e azul',
    para:'  noite:  [120, 120, 120],   // luar: pouco, e azul' },

  { id:'S1015', arquivo:HORA, nome:'as estrelas acendem ao meio-dia',
    real:'"as estrelas são sutis" — e há estrela na janela com o sol no alto',
    de:'  const t = suave((alfa - 0.18) / (0.62 - 0.18));',
    para:'  const t = suave((alfa + 0.18) / (0.62 - 0.18));' },

  { id:'S1016', arquivo:PARTIC_134, nome:'a brasa deixa de brilhar a noite',
    real:'"a brasa ja e vermelha" — e o exemplo que o dono deu pelo nome, a brasa do vulcao acesa, escurece junto com a cena',
    de:"export const VIDA_QUE_BRILHA = new Set(['brasa', 'neve', 'vagalume', 'plancton', 'esporo', 'arco']);",
    para:"export const VIDA_QUE_BRILHA = new Set(['neve', 'vagalume', 'plancton', 'esporo', 'arco']);" },

  { id:'S1017', arquivo:TELA_IDLE_134, nome:'o relogio de 1 s para de repintar o banner da expedicao',
    real:'"o painel ja atualiza" — e o banner EXPEDICAO 1h40 fica parado, que e exatamente o que o dono pegou olhando em 02/09',
    de:'    desenharHud(E, biomaEscolhido, agora());\n  }, 1000);',
    para:'  }, 1000);' },

  { id:'S1018', arquivo:APP, nome:'a luz da hora volta a pintar por cima em vez de multiplicar',
    real:'"normal e mais previsivel" — e a noite vira neblina cinza, a primeira tentativa reprovada',
    de:'  mix-blend-mode:multiply;border-radius:inherit}',
    para:'  mix-blend-mode:normal;border-radius:inherit}' },

  { id:'S1019', arquivo:APP, nome:'o brilho da noite deixa de somar sobre o escuro',
    real:'"normal basta" — e a brasa e o vaga-lume ficam escurecidos junto com a cena',
    de:'  pointer-events:none;mix-blend-mode:screen;image-rendering:pixelated}',
    para:'  pointer-events:none;mix-blend-mode:normal;image-rendering:pixelated}' },

  { id:'S1020', arquivo:HORA, nome:'o relogio de parede soma o fuso em vez de subtrair',
    real:'"e so um sinal" — e a Bahia passa a ter a cena seis horas errada em vez de tres',
    de:'export const relogioDeParede = (agora, fusoMin = 0) => agora - (Number(fusoMin) || 0) * 60000;',
    para:'export const relogioDeParede = (agora, fusoMin = 0) => agora + (Number(fusoMin) || 0) * 60000;' },

  { id:'S1021', arquivo:'app/modules/idle-mundo.mjs', nome:'a cena volta a ler o UTC cru',
    real:'"Date.now() ja e a hora" — e o sol do jogo nasce tres horas antes do sol do Brasil (DEC-10)',
    de:'    const agoraDoMundo = relogioDoMundo(Date.now());',
    para:'    const agoraDoMundo = Date.now();' },

  { id:'S1022', arquivo:HORA, nome:'o mundo deixa de rodar no horario de Brasilia',
    real:'"UTC e mais simples" — e contraria a DEC-10 do dono: o mundo inteiro tres horas adiantado para quem joga',
    de:'export const FUSO_DO_MUNDO_MIN = 180;',
    para:'export const FUSO_DO_MUNDO_MIN = 0;' },

  /* ── 1.33 · O ELENCO MUDA COM A HORA E O CLIMA ────────────────────────
     Todos pegos em Node: a decisão mora no motor e na camada 0, e a sala de
     rotas só pinta o que eles devolveram. Zero de navegador. */
  { id:'S1023', arquivo:ELENCO, nome:'a troca da noite deixa de manter a raridade do slot',
    real:'"o candidato favorito e bom, a faixa tanto faz" — e o estagio vira outro estagio de noite',
    de:'if (s.x.raridade !== c.raridade) continue;',
    para:'if (false) continue;' },
  { id:'S1024', arquivo:ELENCO, nome:'a noite traz de volta quem um estagio anterior ja usou',
    real:'filtrar so os ocupados parece suficiente; a exclusao entre estagios e o que faz o estagio ser novo',
    de:'.filter(x => !antes.has(x.dex) && !ocupados.has(x.dex))',
    para:'.filter(x => !ocupados.has(x.dex))' },
  { id:'S1025', arquivo:ELENCO, nome:'tipo duplo passa a neutralizar a noite',
    real:'a regra da proposta original — e com ela a Floresta nunca muda de noite',
    de:'if (tipos.some(t => (pref.favorece ?? []).includes(t))) return 1;',
    para:'if (tipos.some(t => (pref.favorece ?? []).includes(t))) return tipos.some(t => (pref.desfavorece ?? []).includes(t)) ? 0 : 1;' },
  { id:'S1026', arquivo:ELENCO, nome:'a noite escolhe o candidato mais FORTE',
    real:'"o mais forte da mais emocao" — e come o degrau ate o chefe',
    de:'.sort((a, b) => a.forca - b.forca || a.dex - b.dex);',
    para:'.sort((a, b) => b.forca - a.forca || a.dex - b.dex);' },
  { id:'S1027', arquivo:ELENCO, nome:'a troca deixa de recalcular os chefes',
    real:'"so mudou um comum, os chefes ficam" — e o chefe deixa de ser a evolucao de quem esta ali',
    de:'const novo = montar(pack, comuns, faixa);',
    para:'const novo = { comuns, chefes: atual.chefes };' },
  { id:'S1028', arquivo:ELENCO, nome:'a troca perde a fonte',
    real:'a fonte parece so log; e ela que a sala usa para pintar a lua',
    de:'trocas.push({ fonte: pref.fonte ?? null,',
    para:'trocas.push({ fonte: null,' },
  { id:'S1029', arquivo:COND_133, nome:'a run antiga passa a receber a condicao',
    real:'"toda run merece a noite" — e o elenco muda no meio da wave de quem ja estava jogando',
    de:'if (!run || !(Number(run.regraElenco) >= REGRA_DO_ELENCO)) return [];',
    para:'if (!run) return [];' },
  { id:'S1030', arquivo:COND_133, nome:'a noite do elenco passa a ler UTC cru',
    real:'o mesmo defeito do fuso do 1.34, agora no elenco: a cena escura e o elenco de dia',
    de:"return periodoEm(relogioDoMundo(Number(instante))) === 'noite'",
    para:"return periodoEm(Number(instante)) === 'noite'" },
  { id:'S1031', arquivo:COND_133, nome:'a run deixa de aplicar a noite',
    real:'apagar uma linha e o elenco inteiro fica o de dia, sem nenhum erro',
    de:'if (n) fora.push(n);',
    para:'' },
  { id:'S1032', arquivo:RUNAV, nome:'a run nova nasce sem a versao da regra',
    real:'o campo parece redundante; sem ele toda run nova e tratada como antiga e o 1.33 vira codigo morto',
    de:'    regraElenco: REGRA_DO_ELENCO,',
    para:'' },
  { id:'S1033', arquivo:AVEST, nome:'o elenco da run ignora a condicao',
    real:'a ligacao que some num refactor — o motor sabe trocar, e ninguem pede',
    de:'run.estagio, preferenciasDaRun(pack, run))',
    para:'run.estagio)' },
  { id:'S1034', arquivo:ESCOLHA, nome:'a sala deixa de saber quem e noturno',
    real:'um filtro errado e a lua some do cartao, com a lista mudando sem explicacao',
    de:"filter(t => t.fonte === 'noite')",
    para:"filter(t => t.fonte === 'dia')" },
  { id:'S1035', arquivo:BIOMAS_133, nome:'a sala volta a pedir o elenco sem o periodo',
    real:'a regua e os cartoes voltam a mostrar sempre o elenco de dia',
    de:'const r = resumoDaRota(PACK, b.id, vivas, { preferencias });',
    para:'const r = resumoDaRota(PACK, b.id, vivas);' },
  { id:'S1036', arquivo:KANTO_133, nome:'o pack deixa de favorecer alguem a noite',
    real:'uma tabela vazia e a noite existe no codigo e nao na tela',
    de:"favorece: ['ghost', 'poison', 'psychic', 'fairy'],",   /* realvado no ST-2.3 */
    para:'favorece: [],' },
  { id:'S1037', arquivo:APP, nome:'um fecho de comentario sobrando engole a regra do anel noturno',
    real:'aconteceu no proprio 1.33: CSS nao da erro, a pagina nao da erro, e o anel nao aparece',
    de:`é o que diz POR QUÊ.

   O ícone`,
    para:`é o que diz POR QUÊ. */
   O ícone` },

  /* ── T14 · A SUÍTE EM PARALELO ────────────────────────────────────────
     A decisão de paralelizar e a conferência da agregação moram na camada 0
     (bandeiras.mjs). Cada defeito abaixo é uma forma de a execução em paralelo
     mentir: rodar onde não pode (sabotagem), ou devolver VERDE sem ter olhado. */
  { id:'S1038', arquivo:'test/bandeiras.mjs', nome:'a sabotagem passa a rodar em paralelo',
    real:'PARAR_CEDO deixa de depender da ordem por custo, e o captor do indice muda de nome sem o comportamento mudar',
    de:'  if (serial || pararCedo || emSandbox) return 0;',
    para:'  if (serial || emSandbox) return 0;' },
  { id:'S1039', arquivo:'test/bandeiras.mjs', nome:'a caixa de areia do Q2 ganha trabalhadores',
    real:'o D-100 de volta: caixas em paralelo com trabalhadores em paralelo afogam a maquina, e afogamento vira PEGOU falso',
    de:'  if (serial || pararCedo || emSandbox) return 0;',
    para:'  if (serial || pararCedo) return 0;' },
  { id:'S1040', arquivo:'test/bandeiras.mjs', nome:'o principal perde o nucleo do Chromium',
    real:'as sondas de navegador disputam CPU com as suites e ficam lentas justamente onde custam mais',
    de:'  const teto = Math.max(0, (nucleos | 0) - 1);',
    para:'  const teto = Math.max(0, nucleos | 0);' },
  { id:'S1041', arquivo:'test/bandeiras.mjs', nome:'suite que nao voltou do trabalhador deixa de abortar',
    real:'o S109 pela porta do paralelo: trabalhador morre e a execucao sai VERDE tendo olhado menos',
    de:'  const faltando = (esperadas || []).filter(n => !vieram.has(n));',
    para:'  const faltando = [];' },
  { id:'S1042', arquivo:'test/bandeiras.mjs', nome:'resultado repetido passa a contar',
    real:'a mesma suite contada duas vezes infla o total e esconde a que faltou',
    de:'  const repetidas = [...vieram].filter(([, k]) => k > 1).map(([n]) => n);',
    para:'  const repetidas = [];' },
  /* ── ST-1.1 · O TETO SENTE A RUN COLHIDA (D-107) ─────────────────────
     Cada um devolve uma forma do furo: a soma que esquece as runs, o disco que
     as perde, a reserva que some antes da colheita, a poda que não poda, e o
     disco que aceita encontro negativo. */
  { id:'S1044', arquivo:'app/modules/idle-dados.mjs', nome:'o teto volta a somar so as expedicoes',
    real:'o D-107 de volta: Avanco atras de Avanco, a captura nao tem teto',
    de:'  [...e.expedicoes, ...(e.avancos ?? [])]',
    para:'  [...e.expedicoes]' },
  { id:'S1045', arquivo:'app/modules/idle-dados.mjs', nome:'o carregar volta a esquecer as runs colhidas',
    real:'recarregar a pagina devolve os encontros do dia',
    de:'  e.avancos = avancosDoDisco(cru.avancos, problemas);',
    para:'  e.avancos = [];' },
  { id:'S1046', arquivo:'app/modules/idle-dados.mjs', nome:'a reserva volta a sumir no fim da run',
    real:'entre o fim e a colheita o jogador usa os mesmos encontros duas vezes',
    de:'  reservas: e.run ? [ENCONTROS_POR_AVANCO] : [],',
    para:'  reservas: (e.run && !e.run.fim) ? [ENCONTROS_POR_AVANCO] : [],' },
  { id:'S1047', arquivo:'app/modules/idle-dados.mjs', nome:'o historico do teto para de ser podado',
    real:'o localStorage cresce a cada run numa aba aberta por semanas',
    de:'    ...(e.avancos ?? []).filter(x => x.colhidaEm > agora - DIA_MS),',
    para:'    ...(e.avancos ?? []),' },
  { id:'S1048', arquivo:'app/modules/idle-dados.mjs', nome:'o disco aceita encontro negativo',
    real:'um -40 gravado a mao da quarenta encontros a mais no dia',
    de:'    && Number.isInteger(x.encontros) && x.encontros >= 0);',
    para:'    && Number.isFinite(x.encontros));' },
  { id:'S1049', arquivo:'app/modules/avanco-estado.mjs', nome:'a colheita deixa de lancar a run no teto',
    real:'a run colhida some sem pesar em nada',
    de:'  lancarRunNoTeto(e, run);',
    para:'  e.avancos = e.avancos ?? [];' },

  /* ── ST-1.2 · O ⏻ DESLOGA A CONTA REAL (D-109) ──────────────────────── */
  { id:'S1050', arquivo:'app/modules/sair.mjs', nome:'sair volta a esquecer so o PIN',
    real:'o D-109 de volta: a conta real continua aberta depois do Sair',
    de:'  api?.esquecerSessao?.();',
    para:'  /* token intocado */' },
  { id:'S1051', arquivo:'app/modules/sair.mjs', nome:'sair deixa o PIN da fachada',
    real:'sem conta real, o botao Sair nao sai de nada',
    de:'  try { armazem?.removeItem(CHAVE_PIN); } catch { /* modo privativo */ }',
    para:'  /* PIN intocado */' },
  { id:'S1052', arquivo:'app/modules/sair.mjs', nome:'sair mente que nao havia conta',
    real:'a tela nao recarrega, e a carteira e o perfil do servidor ficam na memoria para quem sentar depois',
    de:'  const tinhaConta = !!api?.temSessao?.();',
    para:'  const tinhaConta = false;' },
  { id:'S1053', arquivo:'app/modules/navegacao.mjs', nome:'o botao volta a apagar o PIN a mao',
    real:'a decisao testada nao e a que roda — a forma exata do D-109',
    de:'      const { tinhaConta, revogacao } = sair({ api });',
    para:"      localStorage.removeItem('ar_session'); const tinhaConta = false, revogacao = null;" },

  /* ── ST-1.3 → E4 · O D-108 FECHADO PELO SERVIDOR ──────────────────────
     Até o E4 estes três travavam a boutique FECHADA com conta online. O E4
     abriu a compra do lado certo; eles foram realinhados para onde o
     comportamento mora hoje (regra do pré-voo: realinhar, não apagar). */
  { id:'S1054', arquivo:'app/modules/loja-cash.mjs', nome:'com conta real a compra deixa de ir ao servidor',
    real:'o D-108 de volta: debita a carteira local, e o servidor devolve o saldo — peca de graca',
    de:'  if (modoServidor()) { comprarNoServidor(r.peca); return { pode: true, pendente: true, peca: r.peca }; }',
    para:'  if (false) { comprarNoServidor(r.peca); return { pode: true, pendente: true, peca: r.peca }; }' },
  { id:'S1055', arquivo:'app/modules/loja-cash.mjs', nome:'a boutique volta a ler a posse do navegador',
    real:'com conta real a boutique mostra o que o navegador lembra, e nao o que a conta tem',
    de:'let lerPosse = () => posseAtual();',
    para:'let lerPosse = () => [];' },
  { id:'S1056', arquivo:'app/modules/customizacao.mjs', nome:'o clique da customizacao equipa sem posse',
    real:'tudo o que a boutique vende sai de graca pela tela de perfil',
    de:'  if (escolha && !podeEquipar(catalogoCosmetico(), posseAtual(), escolha.familia, escolha.id)) {',
    para:'  if (false) {' },

  /* ── E4 · metade B, o cliente ───────────────────────────────────────── */
  { id:'S1120', arquivo:'app/modules/posse-atual.mjs', nome:'toda peca do catalogo passa a ser equipavel',
    real:'a vitrine vira enfeite: veste-se sem comprar',
    de:'  return (posse ?? []).includes(`${familia}:${id}`);',
    para:'  return true;' },
  { id:'S1121', arquivo:'app/modules/posse-atual.mjs', nome:'o avatar da galeria deixa de ser peca do catalogo',
    real:'o avatar vendido na boutique vira escolha livre — de graca pela customizacao',
    de:"  if (d.av) return { familia: 'avatar', id: d.av === 'galeria' || d.av === 'trainer' ? d.id : null };",
    para:"  if (d.av) return { familia: 'avatar', id: d.av === 'trainer' ? d.id : null };" },
  { id:'S1122', arquivo:'app/modules/outfit-acervo.mjs', nome:'com conta real o traje volta a seguir o modo vitrine',
    real:'a posse do servidor e ignorada no traje: veste-se o que a conta nao tem',
    de:'  if (externa) return externa(id);\n',
    para:'' },
  { id:'S1123', arquivo:'app/modules/perfil-dados.mjs', nome:'o login deixa de hidratar a posse',
    real:'limpar o navegador perde o que foi comprado (L-055) e a outra maquina nao ve a compra',
    de:'  const posse = await hidratarPosse(api);',
    para:'  const posse = null;' },
  { id:'S1124', arquivo:'app/modules/cosmeticos.mjs', nome:'a base de graca volta a dar o que se ganha por missao',
    real:'a peca de missao ou de fragmento sai de graca no dia em que existir',
    de:"  cat.filter(p => p.procedencia === 'padrao').map(p => `${p.familia}:${p.id}`);",
    para:"  cat.filter(p => p.procedencia !== 'loja' && p.procedencia !== 'npc').map(p => `${p.familia}:${p.id}`);" },
  { id:'S1125', arquivo:'app/modules/posse-atual.mjs', nome:'o avatar da galeria volta do servidor como treinador',
    real:'o avatar comprado some no outro aparelho — a tela procura um treinador com aquele id',
    de:"    p.avatar = { kind: daGaleria ? 'galeria' : 'trainer', id: equipados.avatar };",
    para:"    p.avatar = { kind: 'trainer', id: equipados.avatar };" },
  { id:'S1126', arquivo:'app/modules/posse-atual.mjs', nome:'sem resposta do servidor a posse vira vazia',
    real:'uma queda de rede no login tira do jogador tudo o que ele tem na tela',
    de:'  if (r?.ok) adotarDoServidor(r.corpo);',
    para:'  adotarDoServidor(r?.corpo ?? { posse: [] });' },

  /* ── 1.32b · OS CLIMAS À VISTA (ST-2.1, ST-2.2) ──────────────────────
     A legenda mente de três jeitos (lista própria, frase fixa, estágio
     errado) e vaza de um (ler a run); a linha da run mente de dois. */
  { id:'S1057', arquivo:'app/modules/climas-legenda.mjs', nome:'a legenda para de perguntar ao motor e promete troca',
    real:'o Sol diz que traz rosto novo e nao traz nenhum, em estagio nenhum',
    de:"  if (!item.rotasQueMudam) return 'não muda quem aparece no seu estágio';",
    para:"  if (false) return 'não muda quem aparece no seu estágio';" },
  { id:'S1058', arquivo:'app/modules/climas-legenda.mjs', nome:'a legenda ignora o estagio do jogador',
    real:'a Nevasca diz o mesmo no estagio 1 e no 3 — a frase deixa de ser sobre onde o jogador esta',
    de:'        if ((elencoDoEstagio(pack, b, estagio, pref)?.trocas ?? []).length) rotasQueMudam++;',
    para:'        if ((elencoDoEstagio(pack, b, 1, pref)?.trocas ?? []).length) rotasQueMudam++;' },
  { id:'S1059', arquivo:'app/modules/climas-legenda.mjs', nome:'a legenda corta o clima raro',
    real:'a Nevasca some da tabela — o bonus mais raro vira sorte sem motivo quando cai',
    de:'  return lista.map(c => {',
    para:'  return lista.filter(c => c.w > 2).map(c => {' },
  { id:'S1060', arquivo:'app/modules/climas-legenda.mjs', nome:'a faixa de frequencia perde o raríssimo',
    real:'a Nevasca aparece como rara, ao lado do Pólen — o jogador espera o que nao vai vir',
    de:"  if (p >= 0.03) return 'raro';",
    para:"  if (p >= 0.0) return 'raro';" },
  { id:'S1061', arquivo:'app/modules/elenco-condicao.mjs', nome:'a linha da run anuncia sem a troca do motor',
    real:'a run diz que o clima trouxe alguem quando o elenco nao mudou',
    de:'  const trocas = elencoDoEstagio(pack, run.bioma, run.estagio, prefs)?.trocas ?? [];',
    para:'  const trocas = prefs.map(p => ({ fonte: p.fonte, entrou: 0, saiu: 0 }));' },
  { id:'S1062', arquivo:'app/modules/elenco-condicao.mjs', nome:'a troca da noite sai sem nome',
    real:'a linha diz "noite trouxe" com a chave crua — a esteira ja pegou "para quem e water"',
    de:"             fonteNome: daNoite ? 'A noite' : (clima?.key === t.fonte ? clima.name : t.fonte),",
    para:'             fonteNome: t.fonte,' },
  { id:'S1063', arquivo:'app/modules/avanco-estado.mjs', nome:'o comeco da run para de gravar a linha do elenco',
    real:'o rosto novo aparece na wave e parece sorte — a regra da legenda nunca e vista acontecendo',
    de:'  e.run.eventos = [...(e.run.eventos ?? []), ...eventosDoElenco(pack, e.run, agora)];',
    para:'  e.run.eventos = [...(e.run.eventos ?? [])];' },

  /* ── ST-2.3 · O VETERANO VÊ A NOITE (L-183) ───────────────────────── */
  { id:'S1064', arquivo:'content/pokemon_kanto_v1.mjs', nome:'a fada sai da noite',
    real:'o estagio 4 volta a mudar 2 de 11 rotas: quem mais fica na sala quase nao ve a regra',
    de:"  preferenciasDaNoite: { favorece: ['ghost', 'poison', 'psychic', 'fairy'],",
    para:"  preferenciasDaNoite: { favorece: ['ghost', 'poison', 'psychic'],"},

  /* ── ST-3.1 · O BAÚ CAI EM ESTILHAÇO (L-159) e L-160 ────────────────── */
  { id:'S1065', arquivo:'engine/estilhaco.mjs', nome:'o estagio 4 tambem vira partes',
    real:'o veterano abre o bau do estagio 4 e recebe partes — o item inteiro deixa de existir no Avanco',
    de:'  if (!cad || !PORTAS.includes(cad.porta) || !cad.fonte || estagio >= ESTAGIO_DO_ITEM_INTEIRO)',
    para:'  if (!cad || !PORTAS.includes(cad.porta) || !cad.fonte)' },
  { id:'S1066', arquivo:'engine/estilhaco.mjs', nome:'essencia e moeda viram estilhaco',
    real:'"Estilhaco de Essencia" na bolsa — uma parte que nao monta nada, no lugar do recurso que se gasta',
    de:'  if (!cad || !PORTAS.includes(cad.porta) || !cad.fonte || estagio >= ESTAGIO_DO_ITEM_INTEIRO)',
    para:'  if (!cad || !PORTAS.includes(cad.porta) || estagio >= ESTAGIO_DO_ITEM_INTEIRO)' },
  { id:'S1067', arquivo:'engine/estilhaco.mjs', nome:'as partes deixam de crescer com o estagio',
    real:'o bau do estagio 3 paga o mesmo que o do 1 — ir fundo deixa de valer',
    de:'  const partes = Math.min(PARTES - 1, Math.max(1, Math.floor(estagio)));',
    para:'  const partes = 1;' },
  { id:'S1068', arquivo:'app/modules/avanco-estado.mjs', nome:'a colheita volta a creditar o item inteiro',
    real:'a regra existe no motor e a colheita a contorna — a L-159 de volta',
    de:"      : lancamentoDoBau(it, { estagio: run.estagio, catalogo: pack.catalogo })",
    para:"      : lancamentoDoBau(it, { estagio: 99, catalogo: pack.catalogo })" },
  { id:'S1069', arquivo:'app/modules/avanco-estado.mjs', nome:'o saque guardado mostra o item e a bolsa recebe partes',
    real:'o quadro diz "Pedra das Folhas" e o jogador procura uma pedra que nao tem',
    de:'    if (l.estilhaco) itens[k] = { ...it, id: l.chave, quantidade: l.quantidade, estilhaco: true };',
    para:'    /* saque guardado intocado */' },
  { id:'S1070', arquivo:'app/modules/itens-nome.mjs', nome:'a parte de estilhaco volta a sair com o id cru',
    real:'"est:folha" na tela — o defeito que o 1.12 corrigiu para os itens',
    de:"  if (chave.startsWith('est:')) return `Estilhaço de ${nomeDoItem(pack, chave.slice(4))}`;",
    para:'  /* sem nome para parte */' },
  { id:'S1071', arquivo:'app/modules/itens-icone.mjs', nome:'a parte de estilhaco fica sem icone',
    real:'um quadrado vazio na mochila no lugar da pedra que a parte monta',
    de:"  if (String(id ?? '').startsWith('est:')) id = String(id).slice(4);",
    para:'  /* sem icone para parte */' },

  /* ── ST-3.2 · DUAS ABAS NÃO COLHEM DUAS VEZES ─────────────────────── */
  { id:'S1072', arquivo:'app/modules/idle-dados.mjs', nome:'o save volta a gravar por cima da outra aba',
    real:'a mesma expedicao colhida em duas abas credita duas vezes',
    de:'    if (noDisco !== revDe(e.rev)) { ultimoConflito = true; return false; }',
    para:'    if (false) { ultimoConflito = true; return false; }' },
  { id:'S1073', arquivo:'app/modules/idle-dados.mjs', nome:'a revisao deixa de andar',
    real:'duas abas ficam sempre na mesma revisao e a guarda nao ve o cruzamento',
    de:'    const proxima = revDe(e.rev) + 1;',
    para:'    const proxima = revDe(e.rev);' },
  { id:'S1074', arquivo:'app/modules/idle-dados.mjs', nome:'a revisao sobe sem deposito',
    real:'em Node o save seguinte num deposito de verdade e recusado por um conflito que nunca houve',
    de:'  if (!deposito) return true;',
    para:'  if (!deposito) { e.rev = revDe(e.rev) + 1; return true; }' },
  { id:'S1075', arquivo:'app/modules/idle-abas.mjs', nome:'a tela recarrega com qualquer chave',
    real:'a carteira muda e o idle inteiro repinta — numa tela aberta por horas',
    de:'  alvo.addEventListener(\'storage\', ev => { if (ev?.key === chave) aoMudar(); });',
    para:'  alvo.addEventListener(\'storage\', ev => { aoMudar(); });' },
  { id:'S1076', arquivo:'app/modules/idle-tela.mjs', nome:'a tela ignora o save recusado',
    real:'a tela segue mostrando a colheita que nao ficou no disco',
    de:'const salvarE = () => { const g = salvar(E); if (!g) {',
    para:'const salvarE = () => { const g = salvar(E); if (false) {' },

  /* ── T14c · TOCADO É O TRECHO ─────────────────────────────────────── */
  { id:'S1077', arquivo:'test/ancoras.mjs', nome:'o trecho deixa de olhar a vizinhanca',
    real:'o defeito ao lado da mudanca e adiado — o Q2 do bloco deixa de testar o que o bloco mudou',
    de:'  return t.some(([i, f]) => a[0] <= f + MARGEM_DO_TRECHO && a[1] >= i - MARGEM_DO_TRECHO);',
    para:'  return false;' },
  { id:'S1078', arquivo:'test/ancoras.mjs', nome:'arquivo novo deixa de contar inteiro',
    real:'os defeitos de um modulo recem-criado sao adiados — justamente os que o bloco acabou de escrever',
    de:"  if (t === 'todo') return true;",
    para:"  if (t === 'todo') return false;" },

  /* ── ST-3.4 · DEC-08: A CAPTURA ENTREGA A ESPÉCIE MOSTRADA ─────────── */
  { id:'S1079', arquivo:'app/modules/idle-lance.mjs', nome:'a captura passa a entregar outra especie',
    real:'o jogador lanca a bola num Butterfree e recebe um Caterpie — a DEC-08 mudando sem decisao',
    de:"    criatura = criar(pack, en.dex, 'captura', agora, novaRaiz());",
    para:"    criatura = criar(pack, 10, 'captura', agora, novaRaiz());" },

  /* ── ST-3.5 · DEC-09: O CUSTO DA NOVA TENTATIVA ────────────────────── */
  { id:'S1080', arquivo:'engine/avanco.mjs', nome:'a frase do custo perde a nova tentativa',
    real:'o jogador cai na sexta wave e descobre so ao tentar de novo que paga tudo outra vez',
    de:"  `tentar de novo é outra run, com o mesmo custo.`;",
    para:"  ``;" },
  { id:'S1081', arquivo:'app/modules/avanco-tela.mjs', nome:'a tela deixa de escrever o custo',
    real:'a frase existe no motor e nunca chega ao botao',
    de:'  if (custo) custo.textContent = [falaDoCusto(), ',
    para:'  if (custo) custo.textContent = [' },

  /* ── ST-3.3 · O MAPA DE EMISSÃO ──────────────────────────────────────
     Mudança silenciosa de economia: nenhuma regra quebra, nenhuma tela muda,
     e o jogador passa a ganhar mais. Só o mapa de emissão vê. */
  { id:'S1082', arquivo:'engine/economia-idle.mjs', nome:'a moeda da colheita paga um encontro a mais',
    real:'a economia infla dez por cento sem ninguem ter decidido — o tipo de mudanca que so aparece meses depois',
    de:'  for (let i = 0; i < n; i++) total += pagamentoDe(rnd, perfil);',
    para:'  for (let i = 0; i <= n; i++) total += pagamentoDe(rnd, perfil);' },
  { id:'S1083', arquivo:'engine/estilhaco.mjs', nome:'o bau do estagio 3 paga partes a mais',
    real:'o item montavel sai mais facil do que a curva calibrou',
    de:'  const partes = Math.min(PARTES - 1, Math.max(1, Math.floor(estagio)));',
    para:'  const partes = Math.min(PARTES - 1, Math.max(1, Math.floor(estagio) + 1));' },

  /* ── ST-5.2 · D-082: O RODAPÉ DO BANNER NÃO CRUZA O POKÉMON ────────── */
  { id:'S1084', arquivo:'app/modules/banner.mjs', nome:'o rodape do idle esquece a reserva do Pokemon',
    real:'"NENHUMA EXPEDICAO EM CAMPO" volta a atravessar o bicho — o D-082',
    de:"    `${avatar}<div class=\"bnRodape${esp ? ' comMon' : ''}\">${rodapeIdle(situacao)}</div>`;",
    para:"    `${avatar}<div class=\"bnRodape\">${rodapeIdle(situacao)}</div>`;" },
  { id:'S1085', arquivo:'app/index.html', nome:'o rodape com Pokemon so reserva a direita',
    real:'o texto estreitado quebra e cai em cima do avatar — foi a primeira correcao do D-082',
    de:'.bnRodape.comMon{left:84px;right:114px}',
    para:'.bnRodape.comMon{right:114px}' },

  /* ── ST-5.7 · D-093: COMPARAÇÃO NÃO EXECUTADA NÃO É VERDE ─────────── */
  { id:'S1086', arquivo:'test/bandeiras.mjs', nome:'o veredito final esquece a lacuna',
    real:'o clone novo cria a base, nao compara nada, e a linha final diz VERDE — o D-093',
    de:"  if (naoExecutadas.length) return { palavra: 'VERDE COM LACUNA', saida: 0 };",
    para:"  if (naoExecutadas.length) return { palavra: 'VERDE', saida: 0 };" },
  { id:'S1087', arquivo:'test/bandeiras.mjs', nome:'o portao fecha com comparacao nao executada',
    real:'npm run portoes fecha o bloco sem ter comparado a tela',
    de:"  if (naoExecutadas.length && exigeVisual) return { palavra: 'NÃO FECHA', saida: 1 };",
    para:"  if (false) return { palavra: 'NÃO FECHA', saida: 1 };" },
  { id:'S1088', arquivo:'test/visual.mjs', nome:'a base recem-criada volta a comparar consigo mesma',
    real:'a captura contra ela mesma: VERDE sem ter olhado',
    de:'  if (criadaAgora)\n    s.naoExecutada =',
    para:'  if (false)\n    s.naoExecutada =' },

  { id:'S1043', arquivo:'test/bandeiras.mjs', nome:'as caras passam a ser entregues por ultimo',
    real:'a fila termina quando a ultima termina: a mais cara no fim deixa tres trabalhadores ociosos',
    de:'    ((custo[b] ?? 0) - (custo[a] ?? 0)) || (pos.get(a) - pos.get(b)));',
    para:'    ((custo[a] ?? 0) - (custo[b] ?? 0)) || (pos.get(a) - pos.get(b)));' },

  /* ── OS TRÊS DO T11a: QUEM AVANÇA OS QUADROS ──────────────────────────
     O defeito que estes guardam ficou 30 s por largura escondido atrás de uma
     linha de base VERDE. Nenhum deles deixa a base vermelha — eles deixam a
     captura CARA e dependente de relógio de parede, e é por isso que precisam
     de teste próprio. */

  { id:'S1008', arquivo:VISUAL, nome:'o laco para de avancar quadros e a captura volta ao relogio de parede',
    real:'"o waitForFunction ja avanca" — e nao avanca: o agendador do Playwright depende do rAF que o RELOGIO_QUADROS substituiu, entao a sondagem fica presa na fila que ela mesma deveria drenar (medido: sondas=1, quadro=2 em 30 s)',
    de:'        globalThis.__passoQuadros?.(k);',
    para:'        globalThis.__passoQuadros?.(0);' },

  { id:'S1009', arquivo:VISUAL, nome:'a afinacao dos quadros por sondagem volta a ser pequena',
    real:'"dois quadros bastam" — medido: 2 -> 21,3 s, 32 -> 8,4 s. Nao fica vermelho, so devolve 13 s por largura calado',
    de:'const QUADROS_POR_SONDA = 32;',
    para:'const QUADROS_POR_SONDA = 2;' },

  { id:'S1010', arquivo:VISUAL, nome:'o contador de quadros passa a mentir um numero fixo',
    real:'"o numero esta certo" — diagnostico que mente e pior que nenhum: ele faz a asercao de cima passar sem que nada esteja sendo guiado. Este defeito escapou da primeira versao do teste',
    de:'      quadrosDaEspera = await pg.evaluate(() => globalThis.__quadroAtual?.() ?? 0);',
    para:'      quadrosDaEspera = 999;' },

  /* ── OS QUATRO DO T13 ──────────────────────────────────────────────────
     Cada um devolve o D-106 por um caminho diferente, e os dois sentidos de
     errar estão cobertos: excluir de MENOS custa 114 reavaliações por bloco,
     excluir de MAIS produz `PEGOU` falso — que é pior, porque manda seguir em
     frente E esconde o que de fato escapa. */

  { id:'S1004', arquivo:FECHO, nome:'a exclusao volta a valer so para fecho resolvido',
    real:'"TUDO e TUDO" — e e exatamente o D-106: as 22 suites de fecho universal pegam 114 defeitos, e acrescentar um defeito plantado passa a custar as 114 reavaliacoes caras',
    de:'  const casa = caminho => !FORA_DA_DIGITAL.has(caminho) &&',
    para:'  const casa = caminho => (fecho === TUDO) ||' },

  { id:'S1005', arquivo:FECHO, nome:'a digital para de ver qualquer arquivo',
    real:'"excluir mais e mais seguro" — e a peneira deixa passar tudo: o portao reaproveita veredito de codigo que mudou, e PEGOU falso e pior que PASSOU falso',
    de:'  for (const caminho of [...hashes.keys()].sort())',
    para:'  for (const caminho of [])' },

  { id:'S1006', arquivo:FECHO, nome:'a linha de base visual entra na lista do que nao invalida',
    real:'"fixture e fixture" — e a visual-base e ENTRADA de verdade: e contra ela que a suite visual julga, e excluí-la faz reaproveitar veredito de uma linha de base que mudou',
    de:"  'test/defeitos-plantados.mjs',",
    para:"  'test/defeitos-plantados.mjs',\n  'test/fixtures/visual-base.json'," },

  { id:'S1007', arquivo:FECHO, nome:'o arquivo que executa a suite entra na lista',
    real:'"run.mjs muda a cada suite nova" — e TIRAR uma suite dele transforma um PEGOU em PASSOU: reaproveitar o PEGOU velho e o sentido ruim de errar',
    de:"  'test/fixtures/captura.json',",
    para:"  'test/fixtures/captura.json',\n  'test/run.mjs'," },

  /* ---------- R1: os três botões que não faziam o que diziam ---------- */

  /* O botão fora do modal vira IRMÃO dele no flex do backdrop, e disputa a
     largura — era o perfil espremido contra a esquerda. */
  { id:'S300', arquivo:APP, nome:'o botao de protecao volta para fora do modal do perfil',
    real:'"um </div> a mais nao muda nada" — e o perfil perde metade da tela para um botao',
    de:'    <button class="btn ghost" data-abrir="#protecaoModal" id="btnProtecaoPerfil"',
    para:'  </div>\n    <button class="btn ghost" data-abrir="#protecaoModal" id="btnProtecaoPerfil"' },

  /* Trocar a ficha mudava S.chipVal e mais nada: o valor e o retorno na tela
     continuavam os do valor ANTIGO ate alguem reclicar no lutador. */
  { id:'S301', arquivo:CARTEIRA, nome:'trocar a ficha deixa de reaplicar a aposta',
    real:'"a ficha so guarda a escolha" — e a tela mostra o retorno do valor antigo',
    de:'    atualizarFichas();\n    reaplicarAposta();',
    para:'    atualizarFichas();' },

  /* window.confirm devolve false na hora onde o navegador suprime dialogo, e
     false e exatamente "o usuario cancelou": o botao de sair fica inerte. */
  { id:'S302', arquivo:NAVEG, nome:'o logout volta para o confirm nativo',
    real:'"confirm sempre existiu" — e onde ele e suprimido o botao de sair nao faz nada',
    de:"      if (!await confirmar('Sair da conta? O treinador continua salvo neste navegador.',",
    para:"      if (!confirm('Sair da conta? O treinador continua salvo neste navegador.'," },

  /* ---------- R2: o log da batalha ---------- */

  /* O defeito original, e o mais silencioso do bloco: escrever `scrollTop` num
     elemento que cresce em vez de rolar. Nao lanca, nao avisa, e o feed fica
     parado na primeira linha a batalha inteira. */
  { id:'S303', arquivo:DOM, nome:'o log volta a rolar o elemento que nao rola',
    real:'"a linha nomeia o log e fala de rolagem" — e é atribuicao nula: o feed nao anda',
    /* Realocado no R27: o `log()` ganhou a chamada do mini logo depois do
       `acompanhar()`, entao a ancora precisou incluir a linha nova. O
       comportamento sabotado e o mesmo. */
    de:'  acompanhar();\n  espelharMini();',
    para:'  logBox.scrollTop = logBox.scrollHeight;\n  espelharMini();' },

  /* Sem a guarda, cada golpe novo arranca de volta ao fim quem subiu para
     reler — o log fica ilegivel justamente durante a luta. */
  { id:'S304', arquivo:DOM, nome:'a rolagem automatica volta a atropelar quem subiu para ler',
    real:'"acompanhar e sempre ir ao fim" — e quem foi reler um golpe perde a linha',
    de:'  if (grudado) e.scrollTop = e.scrollHeight;',
    para:'  e.scrollTop = e.scrollHeight;' },

  /* Soltar a alca do resize e um `click`. Sem a guarda, toda tentativa de
     aumentar o log fecha o log. */
  { id:'S305', arquivo:TICKER, nome:'soltar a alca do resize volta a fechar a caixa',
    real:'"arrastar nao e clicar" — e no DOM e: o click chega depois de soltar',
    de:'    if (arrastou) return;',
    para:'    if (false) return;' },

  /* A alca so existe porque o CSS a declara: sem `resize:vertical` a caixa
     volta a ter tamanho unico, que e metade do pedido do bloco. */
  { id:'S306', arquivo:APP, nome:'a caixa do log perde a alca de redimensionamento',
    real:'"o overflow ja deixa ver tudo" — e ver tudo de duzentos pixels nao e ver tudo',
    de:'  overflow:auto;resize:vertical;padding-right:14px}',
    para:'  overflow:auto;padding-right:14px}' },

  /* ---------- R3: o banner sai do perfil e vai para a rodada ---------- */

  /* O pagamento usa piso. Mostrar o arredondado promete um valor que o ledger
     nao paga — a tela e o dinheiro discordando, a pior classe daqui. */
  { id:'S307', arquivo:BNTEXTO, nome:'o retorno mostrado volta a ser arredondado',
    real:'"meio real nao muda nada" — e a tela promete o que o ledger nao paga',
    de:'const din = n => `${CUR} ${Math.floor(n).toLocaleString(\'pt-BR\')}`;',
    para:'const din = n => `${CUR} ${Math.round(n).toLocaleString(\'pt-BR\')}`;' },

  /* Sem o retorno possivel o banner nao herdou o que a aba SEU LUTADOR dizia,
     que e metade do pedido do bloco. */
  { id:'S308', arquivo:BNTEXTO, nome:'o rodape perde o retorno possivel',
    real:'"valor e odd bastam, e so multiplicar" — e ninguem multiplica de cabeca assistindo',
    de:'  ` · se vencer <b class="ganho">${din(valor * odd)}</b>` +',
    para:'  `` +' },

  /* A batalha ja esta resolvida em memoria: ler a lista inteira mostra a
     colocacao FINAL durante o replay. O banner entrega o final. */
  { id:'S309', arquivo:BANNER, nome:'a colocacao ao vivo volta a ler a batalha inteira',
    real:'"a funcao de colocacao ja existe, e so reusar" — e ela sabe o fim',
    de:'  const jogados = S.battle.events.slice(0, S.evPtr);',
    para:'  const jogados = S.battle.events;' },

  /* Preso ao id, o CSS alcanca o banner da rodada e deixa a previa do perfil
     sem desenho — o jogador escolhe cena e efeito as cegas. */
  { id:'S310', arquivo:APP, nome:'o desenho do banner volta a ficar preso ao id',
    real:'"id e mais especifico, e melhor" — e ele so alcanca UM dos dois banners',
    de:'.battle-banner{position:relative;border-radius:14px;overflow:hidden;',
    para:'#battleBanner{position:relative;border-radius:14px;overflow:hidden;' },

  /* `className =` apaga a lista inteira, e agora e a lista que carrega o
     desenho: o banner perde borda, altura e cena de uma vez. */
  { id:'S311', arquivo:BANNER, nome:'o banner volta a sobrescrever a lista de classes',
    real:'"so estou marcando vitoria e derrota" — e apago a classe que desenha o banner',
    de:"    box.classList.toggle('ko', perdeu);",
    para:"    box.className = perdeu ? 'ko' : '';" },

  /* Controle morto ocupando a coluna nobre durante a luta: as fichas de aposta
     nao fazem nada com a rodada travada. */
  /* Contagem propria: para quem esta de pe ele cai em "quantos continuam
     vivos" e escreve 10º ao lado de um painel que diz 6º para o mesmo lutador. */
  { id:'S313', arquivo:BANNER, nome:'o banner volta a contar a colocacao sozinho',
    real:'"contar os vivos e a mesma coisa" — e o painel ao lado diz outro numero',
    de:'  const quadro = rankingColocacao(S.fighters.length, ordemDeQuedas(jogados),',
    para:'  const quadro = [];  const _ = (S.fighters.length, ordemDeQuedas(jogados),' },

  /* ---------- R4: colocacao, abates e o que sai da tela ---------- */

  /* O podio so no fim: as doze linhas ficam iguais justamente enquanto "quem
     esta ganhando" e a unica pergunta viva. */
  { id:'S314', arquivo:COLOC, nome:'o podio volta a valer so no fim da rodada',
    real:'"medalha e coisa de resultado" — e durante a luta nao da para ver quem lidera',
    de:"  return vivo && pos >= 1 && pos <= 3 ? 'pod' + pos : '';",
    para:"  return '';" },

  /* Um caido brilhando como lider e a tela dizendo que o morto vence. */
  { id:'S315', arquivo:COLOC, nome:'o derrotado volta a poder brilhar como lider',
    real:'"a posicao e a posicao" — e a linha de quem caiu ganha o brilho do 1º lugar',
    de:'export function realceDoPodio(pos, vivo) {',
    para:'export function realceDoPodio(pos, vivo = true) {\n  vivo = true;' },

  /* Opacidade sozinha nao diz "este caiu": diz "este importa menos". */
  { id:'S316', arquivo:APP, nome:'o derrotado perde o risco no nome',
    real:'"a opacidade ja mostra" — e opacidade e importancia, nao morte',
    de:'.pick.viva.fechado .n{text-decoration:line-through;color:var(--dim)}',
    para:'.pick.viva.fechado .n{color:var(--dim)}' },

  /* Vermelho e a cor do K.O. Sem ele, "K.O." e so mais um texto na coluna
     onde antes havia uma porcentagem. */
  { id:'S317', arquivo:APP, nome:'o K.O. deixa de sair em vermelho',
    real:'"vermelho demais na tela" — e o K.O. vira um texto qualquer',
    de:'.pick.viva.fechado .p{color:var(--red);font-weight:700}',
    para:'.pick.viva.fechado .p{font-weight:700}' },

  /* A regra vermelha atravessando os DOIS sentidos de `fechado`: o placar de
     abates de quem caiu sai pintado de alarme. */
  { id:'S318', arquivo:APP, nome:'o vermelho de mercado fechado volta a pintar os abates',
    real:'"e a mesma classe, e a mesma regra" — e nao e o mesmo significado',
    de:'.pick.fechado:not(.viva) .lim{color:var(--red)}',
    para:'.pick.fechado .lim{color:var(--red)}' },

  /* Doze zeros dourados brilhando tanto quanto o lider: o neon vira papel de
     parede e a coluna deixa de destacar o que aconteceu. */
  { id:'S320', arquivo:APP, nome:'o zero de abates volta a acender junto com os outros',
    real:'"o neon e da coluna inteira" — e o neon so vale se ele distinguir',
    de:'.pick.viva .lim.zero{color:var(--dim);text-shadow:none}',
    para:'.pick.viva .lim.zero{text-shadow:none}' },

  /* A barra ciano ao lado da caixa de apostas, marcada com X no mockup. */
  { id:'S319', arquivo:APP, nome:'a barra de volume volta para a zona de aposta',
    real:'"e so um controle de som" — e e o segundo controle mais proeminente da coluna',
    de:'        <button class="btn" id="btnSound" style="flex:0 0 46px" title="Som">🔊</button>\n      </div>',
    para:'        <button class="btn" id="btnSound" style="flex:0 0 46px" title="Som">🔊</button>\n        <input type="range" id="vol" min="0" max="1" step="0.02" value="0.5">\n      </div>' },

  /* ---------- R5: o resultado volta para o centro ---------- */

  /* A classe que joga o overlay para o canto atravessando a fase: a contagem,
     o K.O., o XP e o vencedor no canto inferior direito. So para quem apostou. */
  { id:'S321', arquivo:APOSTA, nome:'a classe de aposta volta a atravessar a fase',
    real:'"a classe e da fase de aposta, ela nao atrapalha" — e ela nao sai sozinha',
    de:"  if (S.state !== 'betting'){ overlay.classList.remove('on', 'apostado'); return; }",
    para:"  if (S.state !== 'betting'){ overlay.classList.remove('on'); return; }" },

  /* A remocao escrita e nunca executada: a `atualizarCTA` so era chamada de
     dentro da fase de aposta, entao o ramo que limpa a classe nunca rodava. */
  { id:'S322', arquivo:FASES, nome:'a troca de fase deixa de reavaliar o CTA',
    real:'"o CTA e da aposta, quem mexe nele e a aposta" — e a limpeza dele nunca roda',
    de:'  atualizarCTA();\n  renderZonaAcao();',
    para:'  renderZonaAcao();' },

  /* `imgTag` nao conhece shiny: o GIF do vencedor nunca alterna. */
  { id:'S323', arquivo:RESTELA, nome:'o retrato do vencedor volta ao caminho sem shiny',
    real:'"imgTag ja desenha o Pokemon" — e ele nunca desenha a variante shiny',
    /* Realvado no R13 e de novo no R42: o retrato do campeao deixou de ser
       `dexImg` estatico, virou `retratoAnimado`, e agora pergunta a ESCOLHA
       alem da posse. O comportamento que o defeito ataca e o mesmo nas tres
       versoes; so o trecho mudou de forma. */
    de:"  return retratoAnimado(f, '', shinyNaArena(S.profile, f.dex, meuCampeao));",
    para:'  return imgTag(f);' },

  /* Shiny para todo mundo: entrega de graca a recompensa que o guarda-roupa
     vende por conquista. */
  { id:'S324', arquivo:RESTELA, nome:'o vencedor sai shiny para quem nao tem a skin',
    real:'"o shiny e mais bonito, todo mundo merece ver" — e ai ele deixa de ser recompensa',
    /* Realvado no R13 e de novo no R42: o retrato do campeao deixou de ser
       `dexImg` estatico, virou `retratoAnimado`, e agora pergunta a ESCOLHA
       alem da posse. O comportamento que o defeito ataca e o mesmo nas tres
       versoes; so o trecho mudou de forma. */
    de:"  return retratoAnimado(f, '', shinyNaArena(S.profile, f.dex, meuCampeao));",
    para:"  return retratoAnimado(f, '', true);" },

  /* Sem o canto, a dica da aposta volta a tapar os doze lutadores que o
     jogador esta olhando para escolher. */
  { id:'S325', arquivo:APP, nome:'a dica da aposta volta a tapar a arena',
    real:'"centralizar e sempre melhor" — e no meio da escolha ela tapa a escolha',
    de:'  align-items:flex-end;justify-content:flex-end;pointer-events:none}',
    para:'  pointer-events:none}' },

  /* Festa por uma rodada que ele pulou — a familia de mensagem do §28.7. */
  { id:'S326', arquivo:RESTELA, nome:'o confete chega a quem nao apostou',
    real:'"confete e comemoracao da rodada" — e quem nao apostou nao ganhou nada',
    de:'    /* SEM CONFETE AQUI, e é decisão do F1.9.',
    para:"    dropConfetti($('#winBox'));\n    /* SEM CONFETE AQUI, e é decisão do F1.9." },

  /* ---------- R6: o que se le dentro da arena ---------- */

  /* O nome na barra e o que identifica de quem e aquela vida durante a luta. */
  { id:'S327', arquivo:APP, nome:'o nome na barra de vida volta a ser ilegivel',
    real:'"e so um rotulo, o sprite ja identifica" — e o sprite tem 22px na lista',
    de:'  font-family:var(--px);font-size:9px;color:#1a2410;text-shadow:0 1px 0 rgba(255,255,255,.35);',
    para:'  font-family:var(--px);font-size:6px;color:#1a2410;text-shadow:0 1px 0 rgba(255,255,255,.35);' },

  /* Fonte maior em caixa da mesma altura: o texto sai cortado ao meio. */
  { id:'S328', arquivo:APP, nome:'a barra de vida volta a altura antiga e corta o nome',
    real:'"a grade fica mais compacta" — e compacta cortando texto nao e compacta',
    de:'.plate{position:relative;height:21px;border:1px solid #0d1420;border-radius:2px;',
    para:'.plate{position:relative;height:16px;border:1px solid #0d1420;border-radius:2px;' },

  /* O nome do golpe e a unica coisa que o balao diz. */
  { id:'S329', arquivo:APP, nome:'o nome do golpe volta a ser um borrao',
    real:'"o balao e pequeno de proposito, para nao tapar a luta" — e ai ele nao diz nada',
    de:'  font-family:var(--px);font-size:10px;line-height:1;padding:5px 7px;white-space:nowrap;',
    para:'  font-family:var(--px);font-size:7px;line-height:1;padding:4px 5px;white-space:nowrap;' },

  /* Preto sobre barra escurecida pelo proprio filter: o unico nome ilegivel
     da grade e justamente o de quem caiu. */
  { id:'S330', arquivo:APP, nome:'o nome de quem caiu volta a ser preto no preto',
    real:'"preto e o contraste maximo" — sobre fundo claro, e a barra do morto nao e clara',
    de:'.plate.dead .nm{color:#e6eaf2;text-shadow:0 1px 2px rgba(0,0,0,.9);',
    para:'.plate.dead .nm{color:#000;text-shadow:0 1px 2px rgba(0,0,0,.9);' },

  /* ---------- R7: a identidade visual chega a tela ---------- */

  /* O emoji de espadas no lugar da marca: o CSS do letrado existe completo e
     nao alcanca nada. */
  { id:'S331', arquivo:APP, nome:'a topbar volta ao emoji no lugar da marca',
    real:'"uma espada diz arena" — e nao diz a marca, que e o que a topbar mostra',
    de:'    <span class="letrado vivo" id="marcaNome"><i></i><b></b></span>',
    para:'    <span id="marcaNome">⚔️</span>' },

  /* A pokebola cyber ao lado do nome, em CSS puro, que o porte perdeu. */
  { id:'S332', arquivo:APP, nome:'a pokebola ao lado do nome some de novo',
    real:'"e so um enfeite" — e enfeite de marca e a marca',
    de:'    <span class="pokemark" aria-hidden="true"></span>\n',
    para:'' },

  /* A arte de fundo da tela de entrada, declarada e sem dono. */
  { id:'S333', arquivo:APP, nome:'a tela de entrada volta a abrir sem arte',
    real:'"o fundo liso e mais limpo" — e a regra da arte fica no CSS sem alcancar nada',
    de:'    <div class="hero-art" aria-hidden="true"></div>\n',
    para:'' },

  /* `textContent` apaga o <i>/<b> e leva o desenho do letrado junto. */
  /* REALOCADO NO R26: o desenho do letrado saiu do boot do `index.html` e foi
     para `pintarMarca`, em `marca.mjs`. O comportamento e o mesmo; mudou o
     endereco. A regra do CLAUDE.md e explicita — realve o defeito para onde o
     comportamento mora hoje, nao apague o defeito. */
  /* Realocado DUAS vezes, e a segunda tem licao. No R26 o desenho do letrado
     saiu do boot do `index.html` para `pintarMarca`. No R27 ele virou
     `marcaEmLetrado`, que devolve STRING — porque enquanto era escrita direta
     no elemento este defeito PASSAVA: o caminho so roda com pack SEM arte, e o
     pack em uso tem arte, entao nenhum teste o alcancava. */
  { id:'S334', arquivo:MARCA, nome:'o nome da marca volta a ser escrito sem as duas pecas',
    real:'"e so o texto do nome" — e o texto mora dentro das duas pecas do letrado',
    de:'  return `<i>${escapar(p.um)}</i><b>${escapar(p.dois)}</b>`;',
    para:'  return escapar(p.um) + escapar(p.dois);' },

  /* O identificador da franquia de volta para dentro do app. */
  { id:'S335', arquivo:MARCA, nome:'a marca deixa de ser partida e volta inteira',
    real:'"o letrado tem duas pecas, entao escreva as duas" — e ai o nome vira nosso',
    de:"    ? { um: s.slice(0, corte), dois: s.slice(corte) }",
    para:"    ? { um: 'Poké', dois: 'Arena' }" },

  /* ---------- R8: o guarda-roupa chega a tela ---------- */

  /* A grade existe, a regra existe, e ninguem a desenha: e o modo de falha do
     D-028 e do R7, na aba que o R8 pedia. */
  { id:'S336', arquivo:APP, nome:'a grade do guarda-roupa some do HTML',
    real:'"o guarda-roupa e do perfil, e o perfil ja tem cosmeticos" — e a aba deixa de existir',
    de:'      <div class="pick-grid" id="pickShiny"></div>',
    para:'      <div class="pick-grid"></div>' },

  /* Desbloquear da os dois juntos; equipar cada um e escolha separada. Fundir
     os botoes tira do jogador metade da personalizacao. */
  { id:'S337', arquivo:CUSTOM, nome:'os dois cosmeticos shiny deixam de ser separaveis',
    real:'"desbloqueou, usa os dois" — e ai o GIF e a arena viram um interruptor so',
    de:'          <button class="sbtn ${k ? \'on\' : \'\'}" data-shiny-skin="${m.dex}">Arena</button>',
    para:'' },

  /* A promessa escrita e o que faz alguem se arriscar a desequipar. */
  { id:'S338', arquivo:CUSTOM, nome:'a tela deixa de prometer que desequipar e seguro',
    real:'"a nota e longa demais" — e sem ela ninguem testa desequipar',
    de:'      `equipar cada um é separado, e desequipar não perde a conquista.`',
    para:'      `equipar cada um é separado.`' },

  /* ---------- R9: um caminho so para o painel de ADM ---------- */

  /* O endereco volta a abrir o painel direto, sem passar pelo servidor. */
  { id:'S339', arquivo:ADMTELA, nome:'o endereco volta a abrir o painel sem servidor',
    real:'"o login atrapalha quem so quer ver" — e ai qualquer um so quer ver',
    de:"  if (location.hash.toLowerCase() === '#adm') admLogin();",
    para:"  if (location.hash.toLowerCase() === '#adm') admAbrir();" },

  /* O painel desenha sem consultar o servidor: volta a ser painel local. */
  { id:'S340', arquivo:ADMTELA, nome:'o painel volta a abrir sem consultar o servidor',
    real:'"o painel ja tem os dados do estado local" — e ai o papel nao decide nada',
    de:"  const r = await apiAdm.get('/api/admin/painel');",
    para:'  const r = { ok: true, corpo: null };' },

  /* O token de operador persistido: legivel por qualquer script e vivo depois
     de fechar a aba, desfazendo a expiracao e a rotacao do servidor. */
  { id:'S341', arquivo:ADMTELA, nome:'o token de operador passa a ser guardado no navegador',
    real:'"assim o operador nao reentra a cada aba" — e o token dele fica no disco',
    de:'const apiAdm = criarApi({ armazem: null });',
    para:'const apiAdm = criarApi({});' },

  /* Sem o segundo fator, uma senha vazada basta. */
  { id:'S342', arquivo:ADMTELA, nome:'o login de operador dispensa o segundo fator',
    real:'"a senha ja e forte" — e o segundo fator existe justamente para quando ela nao for',
    de:"  const r = await apiAdm.post('/api/admin/entrar', { email, senha, codigo });",
    para:"  const r = await apiAdm.post('/api/admin/entrar', { email, senha });" },

  /* ---------- R10: uma arte, tres enquadramentos ---------- */

  /* O segundo catalogo volta: duas escolhas para a mesma pergunta, com listas
     diferentes, e um jogador com dois visuais que nunca combinam. */
  { id:'S343', arquivo:CUSTOM, nome:'o banner do perfil volta a ter cenario proprio',
    real:'"o perfil e outro enquadramento, entao pede outra arte" — enquadramento nao e arte',
    de:"    `<div class=\"scene cn-${cosmeticoValido('cena', bt.cena)}\"></div>",
    para:"    `<div class=\"scene sc-${(S.profile.banner||{}).scene}\"></div>" },

  /* Cena invalida sem guarda vira `class=\"cn-undefined\"`: banner sem desenho
     nenhum para quem tem perfil de versao antiga. */
  { id:'S344', arquivo:CUSTOM, nome:'o banner do perfil deixa de validar a cena',
    real:'"a cena ja foi validada quando ele escolheu" — e perfil antigo nunca escolheu',
    de:"cn-${cosmeticoValido('cena', bt.cena)}",
    para:'cn-${bt.cena}' },

  /* ---------- R11: o dimensionamento da arena ---------- */

  /* Duas ordens discordantes: largura 100% e altura cortada pelo teto. A caixa
     deixa de ser 3:4 e o canvas, que a preenche, estica. Circulo vira elipse. */
  { id:'S345', arquivo:APP, nome:'a arena volta a receber duas ordens de tamanho',
    real:'"largura cheia e um teto de altura" — e as duas juntas quebram a proporcao',
    de:'  width:min(100%, calc(var(--arena-teto) * 3 / 4));\n  aspect-ratio:3/4;overflow:hidden;',
    para:'  width:100%;max-height:var(--arena-teto);\n  aspect-ratio:3/4;overflow:hidden;' },

  /* Em coluna unica o teto e outro, e a mesma briga volta so naquela largura —
     foi exatamente o caso que escapou na primeira passada do bloco. */
  { id:'S346', arquivo:APP, nome:'a coluna unica volta a cortar a altura da arena',
    real:'"em coluna unica o teto precisa ser outro" — o teto sim, a construcao nao',
    de:'  #arena{--arena-teto:42vh}',
    para:'  #arena{max-height:42vh}' },

  /* Buffer do tamanho logico numa caixa maior: ampliacao nao inteira, e o
     serrilhado irregular volta. */
  { id:'S347', arquivo:RENDER, nome:'o buffer da arena volta ao tamanho logico',
    real:'"300x400 e o espaco do jogo, o canvas e isso" — espaco logico nao e resolucao',
    de:'const ESCALA = 2;',
    para:'const ESCALA = 1;' },

  /* ---------- R12: o portao de fechamento volta a poder ficar verde ---------- */

  /* O D-029: o filho herda a marca de fechamento, e o `run.mjs` o recusa antes
     de rodar. Os dois testes do recorte quebram dentro do proprio portao —
     medido, VERMELHO 2/793 nas duas execucoes do `repetir`. */
  { id:'S348', arquivo:PORTAO, nome:'o filho volta a herdar a marca de fechamento',
    real:'"o filho precisa do ambiente do pai" — e o ambiente do pai proibe o que ele testa',
    de:"    const env = { ...process.env, SEM_VISUAL: '1' };\n    delete env.EXIGE_VISUAL;",
    para:"    const env = { ...process.env, SEM_VISUAL: '1' };" },

  /* ---------- R13: o campeao comemora animado ---------- */

  /* O retrato volta ao PNG estatico: o campeao comemora imovel. Foi a
     regressao que o R5 introduziu sem perceber, ao trocar `imgTag` por
     `dexImg` para poder consultar a posse da skin. */
  { id:'S349', arquivo:SPRITES, nome:'o retrato animado volta a cadeia de PNG estatico',
    real:'"o dexImg ja resolve o retrato" — e a cadeia inteira dele e imagem parada',
    de:'  const url = shiny ? enderecoShiny(especie) : enderecoSprite(especie);',
    para:'  const url = DEX_MIRRORS[0](especie.dex, shiny);' },

  /* Sem a cascata local, o retrato sai direto para a rede: reabre o egresso
     que o F0.12 fechou, e o jogador offline ve retangulo vazio. */
  { id:'S350', arquivo:SPRITES, nome:'o retrato animado deixa de tentar a copia local',
    real:'"o endereco de origem sempre funcionou" — e offline nao existe origem',
    de:'  const lista = candidatos(url, null);',
    para:'  const lista = [url];' },

  /* O baixador deixa de cobrir o shiny animado: quem equipar a skin fica sem
     retrato com a rede desligada. */
  { id:'S351', arquivo:BAIXA, nome:'o baixador deixa de cobrir o retrato shiny animado',
    real:'"o shiny e o mesmo desenho, ja esta baixado" — recolor e outro arquivo',
    de:'    lista.push({ url: pack.spriteShiny(esp), espelho: null });',
    para:'' },

  /* O pack sem arte shiny inventando um caminho: o retrato some da tela em vez
     de so nao ser shiny. */
  { id:'S352', arquivo:PACKORIG, nome:'o pack sem arte shiny inventa um caminho que nao existe',
    real:'"basta acrescentar -shiny ao nome" — e o arquivo nao existe naquela pasta',
    de:'function spriteShiny(especie) { return sprite(especie); }',
    para:"function spriteShiny(especie) { return `arte/original/${slugExterno(especie.n)}-shiny.png`; }" },

  /* ---------- R14: a ortografia do tema chega ao menu ---------- */

  /* O menu volta a ser o unico texto de chrome apagado da casa. */
  { id:'S353', arquivo:APP, nome:'o menu perde o brilho do tema',
    real:'"menu e navegacao, nao decoracao" — e ai ele lê como interface generica',
    de:'  text-shadow:0 0 7px rgba(var(--neon2RGB),.30)}',
    para:'}' },

  /* Cor fixa no brilho: continua ciano na variante roxa. E o S68 pela porta
     do brilho. */
  { id:'S354', arquivo:APP, nome:'o brilho dos titulos volta a ter cor fixa',
    real:'"e a cor do tema mesmo, so escrever direto" — e o tema tem duas variantes',
    de:'  text-shadow:0 0 10px rgba(var(--neon2RGB),.45)}',
    para:'  text-shadow:0 0 10px rgba(160,107,255,.45)}' },

  /* ---------- R15/R16: os avisos da arena ---------- */

  /* O aviso volta a 7,5px: o unico momento em que a arena fala direto com quem
     apostou, no tamanho em que nao se le. */
  { id:'S355', arquivo:APP, nome:'o aviso de nocaute volta a ser ilegivel',
    real:'"o aviso e rapido, nao precisa ser grande" — rapido e ilegivel nao se le duas vezes',
    /* A ancora mudou no R25: o aviso saiu da fonte de pixel e do tamanho fixo.
       O defeito agora e voltar ao que ele era — pixel e 9,5px —, que e a forma
       em que o dono disse, com razao, que nao se le. */
    de:'  font-size:clamp(14px,3.2cqw,22px);line-height:1.5;',
    para:'  font-size:9.5px;line-height:1.7;' },

  /* A contagem volta a sombra chapada de console 8 bits, em cor literal. */
  { id:'S356', arquivo:APP, nome:'a contagem volta a ter cor fixa no letrado',
    real:'"o azul fica bonito no 3,2,1" — e continua azul na variante roxa',
    de:'  text-shadow:0 0 8px rgba(var(--neon2RGB),.95),',
    para:'  text-shadow:4px 4px 0 #3b4cca, 0 0 0 rgba(0,0,0,0),' },

  /* ---------- R17: o Rayquaza ao fundo da arena ---------- */

  /* O mockup CRU de volta: com ele voltam `Home`, `About Us` e
     `ENTER THE ARENA` atras da luta. */
  { id:'S357', arquivo:APP, nome:'a arena volta a vestir o mockup com interface falsa',
    real:'"e a mesma arte, so que inteira" — inteira ela tem navegacao falsa embutida',
    /* REALVADO NO R41: o enquadramento saiu de `center 42% / cover` para
       `50,5% 53% / 188% auto`, porque a arte deixou de ser papel de parede e
       passou a CONTORNAR o layout. O defeito continua sendo o mesmo — trocar a
       arte preparada pelo mockup cru — e por isso ele muda de âncora em vez de
       ser apagado. */
    de:"  background:url('../arte/arena-rayquaza.png') 50.5% 53% / 188% auto no-repeat;\n  opacity:.24;filter:saturate(1.2)}",
    para:"  background:url('../arte/Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg') 50.5% 53% / 188% auto no-repeat;\n  opacity:.24;filter:saturate(1.2)}" },

  /* Sem o veu, a cidade neon acende atras dos paineis e come o contraste. */
  { id:'S358', arquivo:APP, nome:'a arte da arena perde o veu',
    real:'"a arte ja esta com opacidade baixa" — baixa nao e o mesmo que velada',
    de:'#viewArena::after{\n  content:\'\';position:fixed;inset:0;z-index:-1;pointer-events:none;',
    para:'#viewArena::after{\n  content:none;' },

  /* ---------- R18: a margem da casa tem caminho ---------- */

  /* Margem invalida GRAVADA: o painel mostra um numero que a rodada nao usa. */
  { id:'S359', arquivo:ADMSRV, nome:'a margem invalida deixa de ser recusada na escrita',
    real:'"o precificar ja ignora valor invalido" — e ai o painel mostra o que a odd nao usa',
    de:'  const limpo = valor === null ? null : margemValida(valor, undefined);',
    para:'  const limpo = valor === null ? null : valor;' },

  /* Grava por fora do `agir`: sem papel, sem confirmacao, sem auditoria. */
  { id:'S360', arquivo:ADMSRV, nome:'definir margem passa por fora do agir',
    real:'"e so um UPDATE, o agir e burocracia" — a burocracia e o papel e o registro',
    de:'  return agir(db, {\n    operadorId, acao: \'margem.definir\', alvo: \'casa\',',
    para:'  db.prepare(`UPDATE casa_config SET margem = ? WHERE id = 1`).run(limpo);\n  return agir(db, {\n    operadorId, acao: \'margem.definir\', alvo: \'casa\',' },

  /* A rodada deixa de usar a margem: configuracao decorativa, alavanca
     desligada, e o operador decidindo sobre nada. */
  { id:'S361', arquivo:SCHED, nome:'a rodada deixa de usar a margem da casa',
    real:'"a margem esta gravada, entao vale" — gravar nao e o mesmo que precificar',
    de:'    const preco = montarRodadaServidor(raiz, sims, { margem: margemDaCasa(db) ?? undefined });',
    para:'    const preco = montarRodadaServidor(raiz, sims);' },

  /* ---------- R19: o portao de contraste enxerga filter ---------- */

  /* A conta do filtro some e o portao volta a medir a cor declarada. */
  { id:'S362', arquivo:FILTRO, nome:'o filtro volta a ser ignorado na conta da cor',
    real:'"a cor declarada e a cor" — e o filter a muda depois de declarada',
    de:'    if (fn) saida = fn(saida, fator(m[2]));',
    para:'    if (fn) saida = saida;' },

  /* Porcentagem tratada como fator: `brightness(62%)` viraria brightness(62). */
  { id:'S363', arquivo:FILTRO, nome:'a porcentagem deixa de ser convertida em fator',
    real:'"parseFloat resolve" — e resolve 62% como 62, que é sessenta e duas vezes mais claro',
    de:"  if (t.endsWith('%')) return parseFloat(t) / 100;",
    para:'  ' },

  /* Canal fora da faixa: a razao de contraste sai de um numero que nao existe
     em tela nenhuma. */
  { id:'S364', arquivo:FILTRO, nome:'os canais deixam de ser travados em 0..255',
    real:'"o navegador trava sozinho" — o navegador sim, esta conta nao',
    de:'const trava = v => Math.max(0, Math.min(255, v));',
    para:'const trava = v => v;' },

  { id:'S312', arquivo:ZONA, nome:'as fichas de aposta ficam na tela durante a luta',
    real:'"esconder confunde, melhor deixar" — e o jogador clica no que nao responde',
    de:"  if (aposta) aposta.hidden = S.state === 'fighting' || S.state === 'result';",
    para:'  if (aposta) aposta.hidden = false;' },

  /* ---------- R20: o painel de politica monetaria (P1.1, §10.9) ----------
   *
   * A familia inteira aqui e de defeito que MENTE COM APARENCIA DE SAUDE: o
   * numero continua plausivel, a tela continua bonita, e a conclusao inverte.
   * Num painel de auditoria isso e pior que quadro em branco — quadro em branco
   * ninguem usa para decidir. */

  /* --- a aritmetica --- */

  /* Gini sem o termo de correcao: todo valor sobe, e uma economia igualitaria
     passa a parecer concentrada. */
  { id:'S365', arquivo:DISTR, nome:'o Gini perde o termo de correcao',
    real:'"a soma ponderada ja e o Gini" — sem (n+1)/n ela nem comeca em zero',
    de:'  return (2 * ponderado) / (n * total) - (n + 1) / n;',
    para:'  return (2 * ponderado) / (n * total);' },

  /* Percentil deslocado em um. Erra pouco, e sempre — que e o jeito de errar
     que ninguem confere. */
  { id:'S366', arquivo:DISTR, nome:'o percentil desloca o posto em um',
    real:'"indice zero-based, entao subtrai" — subtrair duas vezes e o classico',
    de:'  return v[posto - 1];',
    para:'  return v[Math.max(0, posto - 2)];' },

  /* O topo somado a partir dos MENORES. O numero fica plausivel e diz o
     contrario: "o topo tem 4% do dinheiro". */
  { id:'S367', arquivo:DISTR, nome:'o share do topo soma as menores carteiras',
    real:'"ordenei, esta ordenado" — ordenado ao contrario do que a conta pede',
    de:'  const v = limpos(valores).sort((a, b) => b - a);',
    para:'  const v = limpos(valores).sort((a, b) => a - b);' },

  /* Divisao por zero devolvendo Infinity: a barra do FSR vira infinita no
     primeiro dia de operacao, quando ainda nao houve sink nenhum. */
  { id:'S368', arquivo:DISTR, nome:'a razao volta a devolver infinito',
    real:'"Infinity e o valor correto" — correto e inutil sao coisas diferentes',
    de:'  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;',
    para:'  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;' },

  /* Populacao sem dinheiro devolvendo NaN. O painel quebra exatamente no dia
     em que alguem foi olha-lo. */
  { id:'S369', arquivo:DISTR, nome:'o Gini de uma economia zerada volta a ser NaN',
    real:'"nunca vai acontecer" — acontece no primeiro dia e depois de todo reset',
    de:'  if (total <= 0) return 0;\n  let ponderado = 0;',
    para:'  let ponderado = 0;' },

  /* --- as series do servidor --- */

  /* DAU contando LINHAS. Um jogador de vinte rodadas vira vinte usuarios, o
     denominador infla, e M/DAU parece saudavel quando a base encolheu. */
  { id:'S370', arquivo:POLIT, nome:'o DAU conta lancamentos em vez de pessoas',
    real:'"COUNT(*) e mais rapido" — e responde outra pergunta',
    de:'    `SELECT COUNT(DISTINCT user_id) AS n FROM player_activity',
    para:'    `SELECT COUNT(*) AS n FROM player_activity' },

  /* FSR invertido. Diz "drenando" quando esta inflando, com o mesmo ar de
     precisao. */
  { id:'S371', arquivo:POLIT, nome:'o FSR inverte faucets e sinks',
    real:'"e uma razao, tanto faz a ordem" — tanto faz para quem nao vai decidir nada',
    de:'  for (const b of BUCKETS) fsr[b] = razao(fluxo[b].entrou, fluxo[b].saiu);',
    para:'  for (const b of BUCKETS) fsr[b] = razao(fluxo[b].saiu, fluxo[b].entrou);' },

  /* Edge realizado somando aposta ABERTA: conta como lucro da casa o dinheiro
     que ainda pode virar premio. */
  { id:'S372', arquivo:POLIT, nome:'o edge realizado passa a contar aposta aberta',
    real:'"todas as apostas sao volume" — volume sim, edge nao',
    de:'      WHERE settled_at IS NOT NULL AND settled_at >= ? AND settled_at <= ?`)',
    para:'      WHERE created_at >= ? AND created_at <= ?`)' },

  /* A janela perde a ponta de baixo. Some uma linha de N, e ninguem confere. */
  { id:'S373', arquivo:POLIT, nome:'a janela deixa de incluir a borda inicial',
    real:'">= ou > da quase no mesmo" — da no mesmo ate o dia em que nao da',
    de:'       FROM wallet_ledger WHERE created_at >= ? AND created_at <= ?',
    para:'       FROM wallet_ledger WHERE created_at > ? AND created_at <= ?' },

  /* A distribuicao lendo o CACHE. E a sabotagem mais perigosa do bloco: um
     Gini calculado sobre saldos adulterados CERTIFICA a adulteracao. */
  { id:'S374', arquivo:POLIT, nome:'a distribuicao passa a sair da tabela de saldos',
    real:'"carteiras ja tem o saldo pronto" — pronto e a palavra; correto e outra',
    de:'    `SELECT user_id, COALESCE(SUM(amount), 0) AS saldo\n       FROM wallet_ledger',
    para:'    `SELECT user_id, COALESCE(SUM(saldo), 0) AS saldo\n       FROM carteiras' },

  /* Sem rodada liquidada, o edge vira zero em vez de ausente: "a casa nao ficou
     com nada" no lugar de "nao houve rodada". */
  { id:'S375', arquivo:POLIT, nome:'o edge sem rodada liquidada vira zero',
    real:'"zero e mais amigavel que traco" — e afirma uma coisa que ninguem mediu',
    de:'    edgeRealizado: a.n === 0 ? null : razao(a.volume - a.pago, a.volume),',
    para:'    edgeRealizado: a.n === 0 ? 0 : razao(a.volume - a.pago, a.volume),' },

  /* As tres series sem fonte, inventadas como zero. */
  { id:'S376', arquivo:POLIT, nome:'as series da V2 aparecem zeradas no painel da V1',
    real:'"melhor mostrar o campo vazio que esconder" — vazio le-se como medido',
    de:'  return { ...base, dau, wau, porDau, porWau, fsr, fluxo, velocidade, arena,',
    para:'  return { league: 0, p2p: 0, exchange: 0, ...base, dau, wau, porDau, porWau, fsr, fluxo, velocidade, arena,' },

  /* --- o desenho --- */

  /* `null` virando barra rasteira: "nao houve sink nenhum" fica identico a "a
     economia drenou tudo". */
  { id:'S377', arquivo:GRAF, nome:'o valor ausente volta a virar barra de altura zero',
    real:'"null e zero, na pratica" — na pratica sao conclusoes opostas',
    de:'  const vivos = (dados || []).filter(d => d && Number.isFinite(d.valor));',
    para:'  const vivos = (dados || []).map(d => ({ ...d, valor: Number(d?.valor) || 0 }));' },

  /* Rotulo do banco entrando cru no markup, no painel de maior valor do
     sistema (§5.11). */
  { id:'S378', arquivo:GRAF, nome:'o rotulo deixa de ser escapado antes do markup',
    real:'"o type do ledger e nosso, nao e entrada de usuario" — hoje',
    de:'  return String(s ?? \'\').replace(ESCAPAVEIS, c => MAPA[c]);',
    para:'  return String(s ?? \'\');' },

  /* A escala saindo do primeiro valor em vez do maior: barras estouram o quadro
     e a comparacao entre elas deixa de significar coisa alguma. */
  { id:'S379', arquivo:GRAF, nome:'a escala do grafico deixa de sair do maior valor',
    real:'"o primeiro serve de referencia" — serve, quando por acaso e o maior',
    de:'  const maior = Math.max(...vivos.map(d => d.valor), 0);',
    para:'  const maior = vivos[0].valor;' },

  /* Ponteiro sem trava: o SVG desenha fora do quadro e o operador ve um
     medidor vazio justamente quando o edge estourou. */
  /* A PRIMEIRA VERSAO DESTE DEFEITO PASSOU, e o motivo valia a licao: o codigo
     travava DUAS vezes — em `pos` e de novo num `Math.min(98, …)` na hora de
     posicionar. Remover uma nao mudava nada observavel. Trava duplicada e
     codigo que nenhum teste consegue defender; hoje ha uma so, e ela cai. */
  { id:'S380', arquivo:GRAF, nome:'o ponteiro do medidor perde a trava nas bordas',
    real:'"o valor nunca passa do maximo" — passa, e e exatamente o caso de alerta',
    de:'  const pos = (v, largura = 0) =>\n    Math.min(100 - largura, Math.max(0, (v / teto) * 100));',
    para:'  const pos = (v, largura = 0) => (v / teto) * 100;' },

  /* A classe de alerta somada ao PONTEIRO: quem procura `class="g-val"` deixa
     de acha-lo justamente no caso em que ele mais importa. */
  { id:'S381', arquivo:GRAF, nome:'o alerta passa a ser somado a classe do ponteiro',
    real:'"a classe tem que estar no elemento que muda de cor" — e o seletor descendente existe para isso',
    de:'    ? `<rect class="g-val" x="${n2(pos(valor, 2))}" y="4" width="2" height="20">`',
    para:'    ? `<rect class="g-val${acima ? \' g-acima\' : \'\'}" x="${n2(pos(valor, 2))}" y="4" width="2" height="20">`' },

  /* --- a tela --- */

  /* O painel de auditoria voltando a ler o auditado. */
  { id:'S382', arquivo:ADMCLI, nome:'o painel volta a mostrar a carteira do cliente como circulacao',
    real:'"o saldo local e o mesmo numero" — e quando nao for, e justamente o que se queria ver',
    de:'    Object.entries(p.emCirculacao || {})',
    para:'    Object.entries(S.carteira?.saldos || {})' },

  /* A divergencia perdendo o destaque: o numero certo que ninguem ve. */
  { id:'S383', arquivo:ADMCLI, nome:'a divergencia vira uma linha igual as outras',
    real:'"a informacao esta la" — estar na tela e ser vista sao coisas diferentes',
    de:'      ? `<div class="admAlerta"><b>Divergência entre ledger e cache</b>`',
    para:'      ? `<div><b>Divergência entre ledger e cache</b>`' },

  /* ---------- R21: o §4.7 passa a ser EMITIDO (P1.2, fecha o D-034) --------
   *
   * A familia aqui e de DESLIGAMENTO SILENCIOSO. Nenhum destes defeitos quebra
   * funcionalidade nenhuma: a pausa continua pausando, o limite continua
   * limitando, o resgate continua saindo. So o REGISTRO some — e um registro
   * ausente nao tem quem sinta falta dele, que e exatamente como o D-034 durou
   * quatro blocos. */

  /* A traducao inteira some. Os dois registros deixam de andar juntos. */
  { id:'S384', arquivo:SRVPRO, nome:'a protecao para de emitir o evento do §4.7',
    real:'"o responsible_play_events ja registra" — registra no NOSSO formato, nao no do §4.7',
    de:'  const par = EQUIVALENTE_47[tipo];\n  if (par) { const e = par(detalhe || {}); anotar(db, { ...e, userId, agora }); }',
    para:'  ' },

  /* O mesmo nos limites. */
  { id:'S385', arquivo:SRVLIM, nome:'os limites param de emitir o evento do §4.7',
    real:'"limite bloqueado ja aparece no evento nosso" — e a auditoria le o padronizado',
    de:'  const par = EQUIVALENTE_47[tipo];\n  if (par) { const e = par(detalhe || {}); anotar(db, { ...e, userId, agora }); }',
    para:'  ' },

  /* SO A RECUSA some. O caminho feliz continua registrado, e o painel parece
     saudavel: cem resgates concedidos, zero negados. */
  { id:'S386', arquivo:PROGSRV, nome:'a recusa de resgate deixa de ser registrada',
    real:'"o que importa e o que foi concedido" — "por que este jogador nao recebeu" fica sem resposta',
    de:"    : { nome: 'rescue_grant_blocked_by_policy', userId,\n        campos: { action_blocked: v.motivo, semana }, agora });",
    para:'    : null);' },

  /* A tentativa BARRADA de reentrada some. Quem tentou voltar antes da hora
     deixa de existir no registro — e e o padrao que mais importa numa revisao
     de protecao. */
  { id:'S387', arquivo:SRVPRO, nome:'a reentrada barrada deixa de ser registrada',
    real:'"a excecao ja diz nao" — dizer nao e provar que disse nao sao coisas diferentes',
    de:"    anotar(db, { nome: 'self_exclusion_reentry_blocked', userId,\n                 campos: { action_blocked: 'reentrada', ate: p.ate }, agora });",
    para:'    ' },

  /* O sinal de risco vira UM evento com a lista, em vez de um por sinal. O
     campo obrigatorio `signal_type` teria que escolher um, e os outros
     deixariam de ser contaveis. */
  { id:'S388', arquivo:SRVPRO, nome:'os sinais de risco viram um evento so',
    real:'"e a mesma informacao, agrupada" — agrupada, dois dos tres somem da contagem',
    de:"  for (const sinal of acesos)\n    anotar(db, { nome: 'risk_signal_raised', userId, campos: { signal_type: sinal }, agora });",
    para:"  if (acesos.length) anotar(db, { nome: 'risk_signal_raised', userId, campos: { signal_type: acesos[0] }, agora });" },

  /* O `anotar` volta a LANCAR. A protecao passa a depender do registro dela:
     falhou o insert, falhou a pausa. E o pior desenho possivel. */
  { id:'S389', arquivo:TELESRV, nome:'a telemetria volta a poder derrubar a protecao',
    real:'"erro tem que aparecer" — tem, menos quando o preco e a pausa nao valer',
    de:'  try { return emitir(db, args); }\n  catch { return null; }',
    para:'  return emitir(db, args);' },

  /* O evento de protecao passa a ser amostravel: some do registro por sorteio,
     e some justamente o que nao pode faltar. */
  { id:'S390', arquivo:TELESRV, nome:'o evento de protecao volta a poder ser amostrado',
    real:'"amostragem economiza banco" — economiza no unico lugar onde nao pode',
    de:'  const protecao = ehDeProtecao(nome);',
    para:'  const protecao = false;' },

  /* A verificacao de idade que FALHA deixa de ser registrada: sobra so o
     denominador, e "quantos barramos" vira zero. */
  { id:'S391', arquivo:SRVAUT, nome:'a barreira de idade para de registrar a recusa',
    real:'"a conta congelada ja e o registro" — e o §4.7 pede o evento, que e o que sai daqui',
    de:"    anotar(db, { nome: 'age_verification_failed', userId: congelado?.id,\n                 campos: { idade_declarada: idade, minima: IDADE_MINIMA }, agora });",
    para:'    ' },

  /* ---------- R21: o D-035, a semana que era NaN ---------------------------
   *
   * Os dois lados do defeito, plantados separados, porque so juntos ele volta:
   * a tolerancia ao instante ISO e a recusa de data invalida. */

  /* Sem o corte, o instante ISO completo volta a produzir data invalida — e
     como agora a funcao LANCA, o defeito aparece em vez de virar NaN. */
  { id:'S392', arquivo:EMISSAO, nome:'a semana volta a nao aceitar o instante ISO completo',
    real:'"o servidor manda a data" — o servidor manda o instante, e sempre mandou',
    de:"  const dia0 = String(dataISO ?? '').slice(0, 10);",
    para:'  const dia0 = dataISO;' },

  /* O RETORNO SILENCIOSO. Este e o defeito original inteiro: `NaN-WNaN` e
     comparavel a si mesmo, entao "mesma semana?" continua respondendo certo e
     a vida do jogador cabe numa semana so. */
  { id:'S393', arquivo:EMISSAO, nome:'a semana invalida volta a devolver uma string em vez de lancar',
    real:'"devolver algo e mais gentil que quebrar" — e o algo se compara igual a si mesmo',
    de:'  if (Number.isNaN(d.getTime()))\n    throw Object.assign(new Error(`data inválida para semana ISO: ${String(dataISO)}`),\n                        { codigo: \'semana_invalida\' });',
    para:'  ' },

  /* ---------- R22: o XP por abate volta -----------------------------------
   *
   * A familia e de PERDA SILENCIOSA: a soma do XP continua subindo, a barra
   * continua andando, e so a parcela de abate deixa de existir — que e
   * exatamente como ela se perdeu na migracao sem ninguem notar. */

  /* A parcela some da lista. Nada quebra; o jogador so para de ser premiado
     por lutar, e a barra continua se mexendo. */
  { id:'S394', arquivo:PROGR, nome:'a parcela de abate some do XP da rodada outra vez',
    real:'"a soma continua certa" — continua, e para de recompensar quem lutou',
    de:'  const xpAb = xpDeAbates(abates);',
    para:'  const xpAb = 0;' },

  /* A CURVA VIRA LINEAR. Retornos decrescentes existem para o jogador nao
     perseguir abate; sem eles, matar vira a estrategia. */
  { id:'S395', arquivo:PROGR, nome:'a curva de abate vira linear',
    real:'"mais abate, mais XP, e justo" — justo ate matar valer mais que apostar certo',
    de:'  return Math.round((XP_ABATE_ANTIGO[k] / XP_VITORIA_ANTIGA) * XP_RODADA.vitoria);',
    para:'  return k * XP_RODADA.vitoria;' },

  /* O TETO SOME. Uma tempestade que zerasse a arena pagaria XP sem limite, e
     tempestade nao e merito de ninguem. */
  { id:'S396', arquivo:PROGR, nome:'a curva de abate perde o teto',
    real:'"ninguem faz onze abates" — a tempestade faz',
    de:'  const k = Math.min(Math.max(0, Math.floor(n || 0)), XP_ABATE_ANTIGO.length - 1);',
    para:'  const k = Math.max(0, Math.floor(n || 0));' },

  /* A parcela de ZERO volta a entrar na lista: "0 abates: 0 XP" ocupando uma
     linha para dizer que nada aconteceu. */
  { id:'S397', arquivo:PROGR, nome:'a parcela de abate aparece zerada',
    real:'"melhor mostrar sempre, fica consistente" — consistente e ruidoso',
    de:'  if (xpAb > 0) {',
    para:'  if (xpAb >= 0) {' },

  /* A CONTAGEM PASSA A INCLUIR TEMPESTADE. O numero fica plausivel e paga XP
     por sorte — e sorte e o oposto do que a parcela existe para premiar. */
  { id:'S398', arquivo:RESTELA, nome:'o abate por tempestade passa a contar como abate do lutador',
    real:'"morreu na minha rodada, foi abate" — a arena matou, nao o lutador',
    de:'      e => !e.storm && !e.streak && e.ko && e.a === S.myBet.idx).length;',
    para:'      e => e.ko).length;' },

  /* ---------- R23: as pokebolas abrem em sentido horario -------------------
   *
   * Os defeitos aqui NAO quebram nada: as doze bolas continuam abrindo, uma a
   * uma, no mesmo ritmo. So a ORDEM deixa de ser uma volta — e foi assim que
   * ela se perdeu na migracao sem ninguem notar. */

  /* A VOLTA VIRA ANTI-HORARIA. Some o `+ PI/2` e o sentido do eixo faz o
     resto: continua ordenado, continua bonito, e vai para o lado errado. */
  { id:'S399', arquivo:BOLAS, nome:'a volta das bolas inverte o sentido',
    real:'"e uma volta, tanto faz o lado" — tanto faz para quem nao esta olhando',
    de:'      ((Math.atan2(e.y - cy, e.x - cx) + Math.PI / 2) % TAU + TAU) % TAU;',
    para:'      ((-Math.atan2(e.y - cy, e.x - cx) + Math.PI / 2) % TAU + TAU) % TAU;' },

  /* A VOLTA COMECA AS 3 H. Ainda e horaria, ainda e uma volta — so nao comeca
     onde o olho esta quando a contagem termina. */
  { id:'S400', arquivo:BOLAS, nome:'a volta deixa de comecar as 12 h',
    real:'"o angulo zero e as 3 h, e o padrao" — o padrao do radiano, nao o do olho',
    de:'      ((Math.atan2(e.y - cy, e.x - cx) + Math.PI / 2) % TAU + TAU) % TAU;',
    para:'      ((Math.atan2(e.y - cy, e.x - cx)) % TAU + TAU) % TAU;' },

  /* O CENTRO E IGNORADO e a volta passa a ser medida da origem do canvas. Com
     a arena centrada em (W/2, H/2), todos os lutadores caem no mesmo quadrante
     e a ordem vira quase aleatoria de novo. */
  { id:'S401', arquivo:BOLAS, nome:'a volta passa a ser medida da origem, e nao do centro',
    real:'"a arena esta centrada mesmo" — centrada em W/2, que nao e zero',
    de:'      ((Math.atan2(e.y - cy, e.x - cx) + Math.PI / 2) % TAU + TAU) % TAU;',
    para:'      ((Math.atan2(e.y, e.x) + Math.PI / 2) % TAU + TAU) % TAU;' },

  /* A LISTA VIVA E MUTADA. `S.ents` e a lista da arena e o indice de cada
     lutador e a identidade dele: reordenar ali troca quem e quem, e o abate
     passa a ser creditado a outro. */
  { id:'S402', arquivo:BOLAS, nome:'a ordem passa a reordenar a lista viva da arena',
    real:'"copiar array e desperdicio" — o desperdicio e nao trocar a identidade de doze lutadores',
    de:'  return [...(ents || [])].sort((a, b) => {',
    para:'  return (ents || []).sort((a, b) => {' },

  /* O EMBARALHAMENTO VOLTA na chamada — a funcao continua certa e ninguem a
     usa. E a familia do D-028: a peca correta, desligada. */
  { id:'S403', arquivo:FASES, nome:'a entrada volta a ser embaralhada em vez de horaria',
    real:'"sorteado e mais divertido" — e o olho nao acompanha doze aberturas espalhadas',
    de:'  const order = ordemHoraria(S.ents, CX, CY);',
    para:'  const order = S.ents.slice().sort(() => enfeite() - 0.5);' },

  /* ---------- R24: o shiny so aparece para quem o possui -------------------
   *
   * Estes defeitos DAO cosmetico de graca. Nada quebra, ninguem reclama, e o
   * guarda-roupa que vende skin por conquista para de vender: o que aparece
   * sozinho deixa de ser recompensa. */

  /* A REGRA VOLTA A SER SO A POSSE. Pinta de shiny todo bicho cujo dex eu
     tenha, inclusive o que outro jogador escolheu. E o defeito original. */
  { id:'S404', arquivo:RODADA, nome:'o shiny volta a aparecer em bicho que nao e meu',
    real:'"tenho a skin, entao mostro" — mostra no Charizard de outra pessoa',
    de:'  const escolhido = !!S.myBet && S.ents[S.myBet.idx] === e;',
    para:'  const escolhido = true;' },

  /* A COMPARACAO POR DEX em vez de por ENTIDADE. Aposto num Charizard e todos
     os Charizard da arena ficam shiny — plausivel, e errado. */
  { id:'S405', arquivo:RODADA, nome:'o shiny passa a valer para toda a especie, e nao para o meu lutador',
    real:'"e o mesmo Pokemon" — sao lutadores diferentes, e um so e meu',
    de:'  const escolhido = !!S.myBet && S.ents[S.myBet.idx] === e;',
    para:'  const escolhido = !!S.myBet && S.fighters[S.myBet.idx]?.dex === e.f.dex;' },

  /* A REGRA IGNORA A POSSE e passa a bastar ter escolhido: quem nunca
     desbloqueou nada ganha shiny por apostar. */
  { id:'S406', arquivo:SHINYD, nome:'escolher o lutador passa a dar a skin de graca',
    real:'"se escolheu, e dele" — dele e a aposta, nao o cosmetico',
    de:'  return !!escolhido && skinShinyAtiva(perfil, dex);',
    para:'  return !!escolhido;' },

  /* O PRELOAD VOLTA A PEDIR SO A SHINY para os dex possuidos. A arena pisca o
     quadro vazio justamente na especie que o jogador colecionou. */
  { id:'S407', arquivo:RODADA, nome:'o preload deixa de pedir a folha normal da especie possuida',
    real:'"ela sempre aparece shiny mesmo" — nao mais: so quando eu escolher',
    de:'      conferirFolha(sheetURL(f.dex, k, false));\n      if (skinShinyAtiva(S.profile, f.dex)) conferirFolha(sheetURL(f.dex, k, true));',
    para:'      conferirFolha(sheetURL(f.dex, k, skinShinyAtiva(S.profile, f.dex)));' },

  /* ---------- R25: o letrado do tema chega a tela (D-037) ------------------
   *
   * O defeito original nao quebrava NADA: a pagina abria, tudo funcionava, e o
   * tema inteiro caia para a fonte do sistema. Passou por tres blocos de
   * letrado seguidos sem ninguem ver — e a suite ficou verde o tempo todo,
   * porque a linha de base comparava a tela com ela mesma, e ela estava
   * consistentemente errada. */

  /* A EXTENSAO SOME e a folha volta a ser servida como binario. E o D-037 em
     estado puro: nada quebra, e as duas fontes do tema desaparecem. */
  { id:'S408', arquivo:APP, nome:'a folha de fontes volta a nao ter extensao',
    real:'"o espelho copia o caminho da URL, e a URL nao tem extensao" — e o navegador recusa o que nao souber classificar',
    de:'<link rel="stylesheet" href="../assets/fonts_googleapis_com/css2.css"',
    para:'<link rel="stylesheet" href="../assets/fonts_googleapis_com/css2"' },

  /* O SERVIDOR DE TESTE esquece o `.css`. A linha de base volta a ser gravada
     com o tema caido, e o portao Q5 continua verde comparando errado com
     errado. */
  { id:'S409', arquivo:VISUAL, nome:'o servidor da linha de base esquece o tipo CSS',
    real:'"e so uma captura, o MIME nao importa" — importa: sem ele a captura nao tem tema',
    de:"               '.js':'text/javascript', '.css':'text/css', '.png':'image/png',",
    para:"               '.js':'text/javascript', '.png':'image/png'," },

  /* A CONTAGEM VOLTA A FONTE DE PIXEL. A cor continua no tema e a forma volta
     ao fliperama de 8 bits — duas nostalgias diferentes, e a fonte decide qual. */
  { id:'S410', arquivo:APP, nome:'a contagem volta ao letrado de fliperama',
    real:'"pixel tambem e retro" — retro e cyber sao coisas diferentes',
    de:'#count{font-family:var(--dsp);font-weight:900;font-size:58px;color:#fff;',
    para:'#count{font-family:var(--px);font-size:52px;color:#fff;' },

  /* A ARENA DEIXA DE SER CONTEINER. Os `cqw` param de resolver contra ela e
     caem para a janela — o aviso passa a medir contra a largura errada. */
  { id:'S411', arquivo:APP, nome:'a arena deixa de ser conteiner de consulta',
    real:'"cqw cai para vw, da quase no mesmo" — a arena e 3:4 e nunca ocupa a largura toda',
    de:'#arena{--arena-teto:min(72vh,760px);margin:0 auto;container-type:inline-size}',
    para:'#arena{--arena-teto:min(72vh,760px);margin:0 auto}' },

  /* O AVISO VOLTA A NAO QUEBRAR LINHA. Com o tamanho legivel, um nome
     comprido passa da borda da arena estreita. */
  { id:'S412', arquivo:APP, nome:'o aviso de nocaute volta a estourar em vez de quebrar linha',
    real:'"nowrap fica mais limpo" — fica, ate o nome nao caber',
    de:'  white-space:normal;max-width:86cqw;',
    para:'  white-space:nowrap;' },

  /* ---------- R26: a marca do dono chega a tela ---------------------------
   *
   * A familia e a do R13 e do D-028: a arte existe no disco e nao existe para
   * quem joga. Nenhum destes defeitos quebra nada — a pagina abre, o nome
   * aparece (em CSS), e a arte que o dono desenhou fica num diretorio. */

  /* O PACK PARA DE DECLARAR. `pintarMarca` cai no letrado em CSS, que e o
     caminho de reserva legitimo — entao nada quebra e a arte some. */
  { id:'S413', arquivo:PACK, nome:'o pack deixa de declarar a arte da marca',
    real:'"o letrado em CSS ja desenha o nome" — desenha, e nao e a marca do dono',
    de:'  marca:   MARCA,',
    para:'  ' },

  /* O CAMINHO VAI PARA O HTML. Funciona hoje e quebra a camada de conteudo:
     trocar de pack deixa a marca antiga na tela. */
  { id:'S414', arquivo:MARCA, nome:'a marca deixa de sair do pack',
    real:'"e sempre o mesmo caminho mesmo" — ate o pack mudar, e ai e a marca errada',
    de:'  const src = marca[peça] ?? marca.letrado ?? marca.logo;',
    para:"  const src = 'arte/marca/letrado.png';" },

  /* SEM RESERVA. Um pack sem arte de marca fica sem nome nenhum na tela — e o
     `original_v1` e um pack sem arte de marca. */
  { id:'S415', arquivo:MARCA, nome:'a marca perde o caminho de reserva',
    real:'"todo pack vai ter arte" — o original_v1 nao tem, e e o proximo',
    de:'  if (arte) { el.innerHTML = arte; return \'arte\'; }',
    para:'  el.innerHTML = arte; return \'arte\';' },

  /* O SIMBOLO EM CSS FICA junto com a arte: dois simbolos lado a lado. */
  { id:'S416', arquivo:APP, nome:'a pokebola em CSS sobra ao lado da marca desenhada',
    real:'"um a mais nao atrapalha" — atrapalha: sao dois simbolos dizendo a mesma coisa',
    de:"  if (comArte) document.querySelector('.brand .pokemark')?.remove();",
    para:'  ' },

  /* A ALTURA SOME e o PNG de 528px de largura decide o layout da barra. */
  { id:'S417', arquivo:APP, nome:'a marca perde a altura declarada e estoura a barra',
    real:'"a imagem tem o tamanho que tem" — tem 528px, e a barra nao',
    de:'.brand .marcaArte{height:clamp(26px,3.4vw,38px)}',
    para:'.brand .marcaArte{}' },

  /* ---------- R27: o mini log dentro da arena -----------------------------
   *
   * O pedido do dono trouxe uma restricao junto: "que nao interfira na
   * visualizacao do combate". Estes defeitos NAO quebram o log — eles o fazem
   * atrapalhar, que e o unico jeito de errar neste bloco. */

  /* O TETO SOME e o mini log vira o log inteiro em cima da luta. */
  { id:'S418', arquivo:MINILOG, nome:'o mini log perde o teto de linhas',
    real:'"mais contexto e melhor" — melhor ate cobrir a arena que ele comenta',
    de:'  return combate.slice(-teto);',
    para:'  return combate;' },

  /* AS PRIMEIRAS EM VEZ DAS ULTIMAS: o mini log passa a mostrar o comeco da
     luta para sempre, e o golpe que acabou de acontecer nunca aparece. */
  { id:'S419', arquivo:MINILOG, nome:'o mini log mostra as primeiras linhas, e nao as ultimas',
    real:'"slice(0, teto) e mais direto" — e mostra a luta que ja passou',
    de:'  return combate.slice(-teto);',
    para:'  return combate.slice(0, teto);' },

  /* O FILTRO SOME e "aguardando…" ocupa uma das tres vagas durante a luta. */
  { id:'S420', arquivo:MINILOG, nome:'a linha de sistema volta a ocupar vaga no mini log',
    real:'"e informacao tambem" — e sao tres vagas, e a luta tem prioridade',
    de:'  const combate = (linhas || []).filter(ehDeCombate);',
    para:'  const combate = (linhas || []);' },

  /* ELE CAPTURA O CLIQUE. Flutua sobre a arena inteira: sem
     `pointer-events:none`, engole a selecao de lutador. */
  { id:'S421', arquivo:APP, nome:'o mini log passa a engolir o clique na arena',
    real:'"e so texto, nao clica em nada" — nao clica, mas esta na frente',
    de:'  pointer-events:none;\n  display:flex;flex-direction:column;justify-content:flex-end;gap:1px;',
    para:'  display:flex;flex-direction:column;justify-content:flex-end;gap:1px;' },

  /* ELE VAI PARA O MEIO — exatamente o que o dono disse que atrapalha. */
  { id:'S422', arquivo:APP, nome:'o mini log volta para o centro da arena',
    real:'"no centro le-se melhor" — e cobre a luta, que foi o pedido explicito',
    de:'  position:absolute;left:0;right:0;bottom:0;z-index:4;',
    para:'  position:absolute;left:0;right:0;top:42%;z-index:4;' },

  /* ELE SOBE NA PILHA e passa a cobrir o aviso de nocaute, que e sobre o
     lutador DO JOGADOR. */
  { id:'S423', arquivo:APP, nome:'o mini log passa a cobrir o aviso de nocaute',
    real:'"z-index maior aparece melhor" — aparece por cima do que importa mais',
    de:'  position:absolute;left:0;right:0;bottom:0;z-index:4;',
    para:'  position:absolute;left:0;right:0;bottom:0;z-index:7;' },

  /* A rodada nova herda os golpes da anterior por cima da arena vazia. */
  { id:'S424', arquivo:FASES, nome:'o mini log carrega os golpes da rodada anterior',
    real:'"ele se sobrescreve sozinho" — so quando a luta comeca, e a aposta vem antes',
    de:'  limparMini();   // o mini log não pode levar os golpes da rodada anterior',
    para:'  ' },

  /* ---------- R28: as cedulas de PokeCash -------------------------------
   *
   * A familia aqui e de CARTEIRA QUE MENTE: as notas continuam bonitas, o
   * saldo continua certo no topo, e o maco embaixo passa a nao corresponder a
   * ele. Cada nota, sozinha, parece certa — e e por isso que a soma e o que
   * precisa ser cobrado. */

  /* O RESTO SOME. Saldo de 1.437 mostra mil e quatro centos, e os 37 evaporam:
     a soma das notas passa a discordar do saldo logo acima. */
  { id:'S425', arquivo:CEDULA, nome:'a decomposicao engole o que nao fecha em nota',
    real:'"resto e detalhe" — e a diferenca entre a carteira somar o saldo e nao somar',
    de:'  return { notas, resto };',
    para:'  return { notas, resto: 0 };' },

  /* DEIXA DE SER GULOSO: dez notas de cem onde cabe uma de mil. A carteira
     passa a mostrar o troco em vez do saldo. */
  { id:'S426', arquivo:CEDULA, nome:'a carteira quebra o saldo em notas pequenas',
    real:'"a soma da no mesmo" — da, e o maco deixa de ser legivel de relance',
    de:'  for (const v of [...(valores || [])].sort((a, b) => b - a)) {',
    para:'  for (const v of [...(valores || [])].sort((a, b) => a - b)) {' },

  /* SALDO NEGATIVO VIRA DINHEIRO. `Math.floor(-500)` sem o piso daria notas
     negativas, e a carteira mostraria maco onde ha divida. */
  { id:'S427', arquivo:CEDULA, nome:'saldo negativo passa a produzir notas',
    real:'"saldo nunca e negativo" — o invariante existe justamente porque poderia',
    de:'  let resto = Math.max(0, Math.floor(saldo || 0));',
    para:'  let resto = Math.floor(saldo || 0);' },

  /* OS IDS DO SVG COLIDEM. Sao globais no documento: duas notas com os mesmos
     ids fazem a segunda usar o gradiente e o recorte da primeira — e a
     carteira mostra varias ao mesmo tempo. */
  { id:'S428', arquivo:CEDULA, nome:'as notas passam a compartilhar os ids do SVG',
    real:'"id fixo e mais simples" — e simples ate haver duas notas na tela',
    de:'  const id = `c${valor}`;',
    para:"  const id = 'cd';" },

  /* A SERIE VIRA SORTEADA: numero novo a cada abertura da carteira, e numero
     que muda sozinho e numero em que ninguem confia. */
  { id:'S429', arquivo:CEDULA, nome:'a serie da nota passa a ser sorteada',
    real:'"serie unica por nota parece mais real" — parece, ate o jogador reabrir a carteira',
    de:'  for (const c of `${valor}|${dex}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }',
    para:'  h = (Math.random() * 4294967295) | 0;' },

  /* O NOME DA MOEDA ENTRA CRU no SVG, que vai para a pagina por innerHTML. */
  { id:'S430', arquivo:CEDULA, nome:'a cedula deixa de escapar o que vem do pack',
    real:'"o nome da moeda e nosso" — hoje, e o pack e trocavel por desenho',
    de:'const esc = s => String(s ?? \'\').replace(ESCAPAVEIS, c => MAPA[c]);',
    para:'const esc = s => String(s ?? \'\');' },

  /* A LISTA DE NOTAS VEM DO APP, e nao do pack: identificador de tema volta
     para dentro do cliente, que e o que o F1.12 existe para impedir. */
  { id:'S431', arquivo:CARTEIRA, nome:'a carteira decide sozinha quais notas existem',
    real:'"e sempre a mesma escada" — ate o tema mudar, e ai sao notas de outro jogo',
    de:'  const declaradas = PACK?.moeda?.notas;',
    para:'  const declaradas = [{ valor: 50, dex: 1 }, { valor: 100, dex: 4 }];' },

  /* ═══ R30 · ACERVO DE ARTE ═══════════════════════════════════════════════
   *
   * Os seis abaixo plantam as seis formas de o acervo existir inteiro e mesmo
   * assim nao chegar a tela — que e o defeito que este projeto ja cometeu seis
   * vezes por outros caminhos. */

  /* A FAIXA DO TOPO VOLTA A LER A POSICAO DO BANNER. E o defeito ORIGINAL do
     R30: nada quebra, a cena desenha, e todo valor de `--tira` do arquivo vira
     comentario. Foi o dono do projeto quem viu isso a olho nu. */
  { id:'S432', arquivo:APP, nome:'as tres caixas voltam a dividir uma posicao so',
    real:'"a cena e a mesma, a posicao pode ser a mesma" — proporcoes 1,27 e 31 dizem que nao',
    de:'#profBanner .scene,.fa-cena{background-position:var(--tira, var(--foco, center 38%))}',
    para:'#profBanner .scene,.fa-cena{background-position:var(--foco, center 38%)}' },

  /* O ABREVIADO VOLTA numa cena. A forma curta reescreve `background-position`
     para o padrao e apaga o enquadramento — sem erro, sem aviso. */
  { id:'S433', arquivo:APP, nome:'uma cena volta a usar `background` abreviado',
    real:'"uma linha em vez de duas" — e a linha zera a posicao das outras duas caixas',
    de:".cn-coliseu{--foco:45% 50%;--tira:50% 55%;background-image:url('../arte/acervo/cn-coliseu.jpg')}",
    para:".cn-coliseu{background:url('../arte/acervo/cn-coliseu.jpg') center 38%/cover no-repeat}" },

  /* O CSS DIVERGE DO CATALOGO. E o erro que de fato aconteceu na construcao do
     R30: uma substituicao em massa acertou o catalogo e errou o CSS. */
  { id:'S434', arquivo:APP, nome:'o enquadramento do CSS diverge do catalogo',
    real:'"ajustei o numero" — num dos dois lugares onde ele mora',
    de:'.cn-bosque{--foco:48% 50%;--tira:50% 32%',
    para:'.cn-bosque{--foco:48% 50%;--tira:50% 62%' },

  /* O AVATAR DO ACERVO SAI PIXELADO. A tela abre, o avatar aparece, a suite
     fica verde — e o retrato pintado esta serrilhado. */
  { id:'S435', arquivo:APP, nome:'o avatar do acervo volta a ser desenhado como sprite',
    real:'"as outras imagens usam pixelated" — usam, porque sao ampliadas; esta e reduzida',
    de:'.opt img.avArte{image-rendering:auto}',
    para:'.opt img.avArte{image-rendering:pixelated}' },

  /* A GUARDA DO ID SOME. Perfil de versao antiga e `localStorage` adulterado
     caem num caminho de arquivo que nao existe, e o avatar some sem erro. */
  { id:'S436', arquivo:'app/modules/perfil.mjs',
    nome:'o avatar de arte deixa de cair no padrao quando o id nao existe',
    real:'"o id vem do nosso proprio catalogo" — vem do localStorage, que e do jogador',
    de:'const arteURL = id => `../${arquivoAvatar(avatarArteValido(id))}`;',
    para:'const arteURL = id => `../${arquivoAvatar(id)}`;' },

  /* A SONDA VOLTA A CONFUNDIR semitransparente com recortado — o erro que
     produziu um avatar com caixa cinza atras do personagem. */
  { id:'S437', arquivo:'tools/preparar-acervo.mjs',
    nome:'a sonda volta a contar opacidade parcial como transparencia',
    real:'"alfa abaixo do maximo ja e transparencia" — nao e, e um PNG inteiro provou',
    de:'      for (let i = 3; i < p.length; i += 4) if (p[i] < 16) transp++;',
    para:'      for (let i = 3; i < p.length; i += 4) if (p[i] < 250) transp++;' },

  /* ═══ R31 · LIGA DE PREVISAO — a aritmetica da calibracao ════════════════
   *
   * A Liga nao movimenta valor, entao nenhum destes e defeito de dinheiro. Sao
   * defeitos de MERITO: cada um deles deixa o ranking premiar a coisa errada,
   * e um ranking que premia a coisa errada ensina a coisa errada. */

  /* O RANKING VOLTA A SOMAR. E a metade obvia do "volume nao substitui
     qualidade" do §6.8, e a que todo mundo lembra de nao fazer. */
  { id:'S438', arquivo:CALIBRACAO, nome:'o ranking passa a somar em vez de tirar a media',
    real:'"quem preve mais tem mais dados" — tem mais dados, nao mais merito',
    de:'    const media = amostra ? e.soma / amostra : null;',
    para:'    const media = amostra ? e.soma : null;' },

  /* O ENCOLHIMENTO SOME. Esta e a metade DIFICIL da mesma regra: sem ele, vinte
     previsoes com sorte batem quinhentas boas e o topo do ranking vira uma
     lista de amostras pequenas. */
  { id:'S439', arquivo:CALIBRACAO, nome:'o ranking passa a usar a media crua',
    real:'"a media ja e a media, encolher e distorcer" — encolher e admitir a incerteza',
    de:'      nota: populacao === null ? null : mediaEncolhida(media, amostra, populacao),',
    para:'      nota: media,' },

  /* O ENCOLHIMENTO FICA DECORATIVO. Mais sutil que remove-lo: com peso 0 a
     formula continua la, o teste de "existe encolhimento" continua verde, e o
     efeito e zero. */
  { id:'S440', arquivo:CALIBRACAO, nome:'o peso do encolhimento vai a zero',
    real:'"deixa o dado do jogador falar por si" — com 3 previsoes ele nao fala',
    de:'export const PESO_ENCOLHIMENTO = AMOSTRA_MINIMA;',
    para:'export const PESO_ENCOLHIMENTO = 0.001;' },

  /* A ORDEM INVERTE. Brier e MENOR-melhor; ordenar decrescente poe o pior
     calibrador em primeiro e a lista continua parecendo uma lista. */
  { id:'S441', arquivo:CALIBRACAO, nome:'o ranking passa a ordenar do maior para o menor',
    real:'"nota maior, posicao melhor" — em Brier, nota maior e erro maior',
    de:'    (a.nota ?? Infinity) - (b.nota ?? Infinity) ||',
    para:'    (b.nota ?? -Infinity) - (a.nota ?? -Infinity) ||' },

  /* QUEM NAO PREVIU NADA RECEBE ZERO — que e a nota PERFEITA em Brier. O
     jogador sem uma unica previsao lidera a temporada. */
  { id:'S442', arquivo:CALIBRACAO, nome:'amostra zero passa a valer a nota perfeita',
    real:'"sem dado, nota neutra" — zero nao e neutro em Brier, e o topo',
    de:'  if (!n) return populacao;',
    para:'  if (!n) return 0;' },

  /* A DISTRIBUICAO INVALIDA PASSA A SER NORMALIZADA. O jogador e pontuado por
     uma opiniao que ele nao teve. */
  { id:'S443', arquivo:CALIBRACAO, nome:'a distribuicao invalida passa a ser normalizada',
    real:'"o jogador quis dizer isso" — quis, ou o cliente esta velho, ou alguem mexeu',
    de:'  if (!Array.isArray(d) || erros(d, d.length).length) return null;',
    para:'  if (!Array.isArray(d)) return null;\n  const _s = d.reduce((a, b) => a + b, 0);\n  if (_s > 0) d = d.map(x => x / _s);' },

  /* A TOLERANCIA VIRA PERMISSAO. Ela existe para o erro do ponto flutuante;
     alargada, aceita distribuicao que soma 1,04 e pontua por ela. */
  { id:'S444', arquivo:CALIBRACAO, nome:'a tolerancia da soma vira permissao',
    real:'"1e-9 e apertado demais, da falso negativo" — da, e e para dar',
    de:'const TOL_SOMA = 1e-9;',
    para:'const TOL_SOMA = 0.05;' },

  /* MODELO PERFEITO VIRA Infinity NA HABILIDADE, e o painel do §6.9 mostra
     `-Infinity` para o jogador exatamente no dia em que a casa acertou tudo. */
  { id:'S445', arquivo:CALIBRACAO, nome:'a habilidade volta a dividir por zero',
    real:'"a conta e a conta" — e o resultado dela e uma tela quebrada',
    de:'  if (brierModelo <= 0) return null;',
    para:'  if (brierModelo < 0) return null;' },

  /* A POPULACAO VIRA MEDIA DAS MEDIAS: um jogador de tres previsoes passa a
     pesar tanto quanto um de quinhentas na definicao do centro para o qual
     todo mundo e puxado — que e o vies que o encolhimento existe para corrigir. */
  { id:'S446', arquivo:CALIBRACAO, nome:'a media da populacao passa a ser media das medias',
    real:'"cada jogador conta uma vez" — na hora de achar o centro, nao conta',
    de:'  return amostra > 0 ? soma / amostra : null;',
    para:'  const ms = lista.filter(e => e.amostra > 0).map(e => e.soma / e.amostra);\n  return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;' },

  /* O EMPATE PASSA A SER SORTEADO: a mesma temporada sai em ordens diferentes
     entre duas leituras, e ninguem consegue conferir a propria posicao. */
  { id:'S447', arquivo:CALIBRACAO, nome:'o empate do ranking passa a ser sorteado',
    real:'"empate e empate, tanto faz a ordem" — nao faz para quem esta empatado',
    de:'    b.amostra - a.amostra ||',
    para:'    (Math.random() - 0.5) ||' },

  /* ═══ R32 · MOVIMENTO REDUZIDO NAO APAGA CONTEUDO ════════════════════════
   *
   * Os dois lados da mesma regra. O primeiro e a regressao que o R30 cometeu; o
   * segundo e o "conserto" preguicoso dela — apagar a guarda inteira. */

  /* O RESET PADRAO DE ACESSIBILIDADE VOLTA. Ele parte de que animacao e
     decoracao; aqui ela e o ciclo de vida dos avisos, e com `forwards` a
     duracao zerada prende cada um no quadro final, que e o estado escondido. */
  { id:'S448', arquivo:APP, nome:'movimento reduzido volta a zerar a duracao das animacoes',
    real:'"e o reset padrao de acessibilidade" — e parte de uma premissa que este arquivo nao cumpre',
    de:'    animation-iteration-count:1 !important;\n    transition-duration:.01ms !important;',
    para:'    animation-duration:.01ms !important;\n    animation-iteration-count:1 !important;\n    transition-duration:.01ms !important;' },

  /* A GUARDA SOME. Trinta animacoes `infinite` voltam a rodar para quem pediu
     que o movimento parasse. */
  { id:'S449', arquivo:APP, nome:'movimento reduzido deixa de limitar a repeticao',
    real:'"os avisos voltaram a funcionar sem isso" — voltaram, e o resto voltou a girar para sempre',
    de:'    animation-iteration-count:1 !important;',
    para:'    animation-play-state:running !important;' },

  /* ═══ R33 · A COLUNA DE ACAO E A PAUSA DAS POKEBOLAS ═════════════════════ */

  /* O CARTAO DE APOSTA VOLTA PARA A COLUNA DE ACAO. Ele some e volta com a
     fase, e ali cada aparicao empurra o log e o banner de batalha para baixo —
     com o log expandido, o banner sai da dobra na hora em que passa a valer. */
  { id:'S450', arquivo:APP, nome:'o cartao de aposta volta para a coluna de acao',
    real:'"aposta e acao, o lugar dela e na coluna de acao" — e ali ela desloca tudo que vem depois',
    de:'  <div class="zona acao">',
    para:'  <div class="zona acao">\n    <div class="card" id="cardAposta"><h3>Sua aposta</h3></div>' },

  /* A PAUSA SOME DO COMECO: o veu sai e a primeira bola abre no mesmo instante,
     que e o estado em que o dono do projeto pediu a correcao. */
  { id:'S451', arquivo:LACO, nome:'a entrada volta a comecar junto com o fim do veu',
    real:'"o RING_LEAD ja e a pausa" — sao 0,35s com o anel ja desenhando',
    de:'    if (S.released) passoEntrada(3.9 + PAUSA_BOLAS);',
    para:'    if (S.released) passoEntrada(3.9);' },

  /* A PAUSA ENTRA SO NUM LADO — o defeito sutil. A entrada atrasa, o fim da
     fase nao: o jogador ve onze bolas abrirem e a decima segunda aparecer ja
     aberta, porque a fase virou por baixo dela. */
  { id:'S452', arquivo:LACO, nome:'a pausa entra no comeco e nao no fim da contagem',
    real:'"a pausa e do comeco da entrada" — e o fim da fase conta a partir do mesmo zero',
    de:'    if (S.clock >= 3.9 + PAUSA_BOLAS + entryTotalTime(S.ents.length)){',
    para:'    if (S.clock >= 3.9 + entryTotalTime(S.ents.length)){' },

  /* A PAUSA VIRA DECORATIVA: a constante continua la, exportada e respeitada
     nas duas contas, e o efeito e zero. */
  { id:'S453', arquivo:FASES, nome:'a pausa das pokebolas vai a quase zero',
    real:'"nao deixa a rodada mais lenta" — meio segundo e o que separa uma volta de um piscar',
    de:'const PAUSA_BOLAS = 0.6;',
    para:'const PAUSA_BOLAS = 0.02;' },

  /* ═══ R34 · O SHINY SE ANUNCIA ═══════════════════════════════════════════
   *
   * Um cosmetico que ninguem nota nao e recompensa. Ate o R34 o shiny mudava a
   * paleta de um sprite de 22 px no meio de doze, e so isso. */

  /* A MARCA VISUAL SOME: volta a ser so a paleta, que e o estado anterior. */
  { id:'S454', arquivo:RODADA, nome:'a arena deixa de marcar quem esta shiny',
    real:'"a folha shiny ja e a diferenca" — a 22 px, no meio de doze, nao e',
    de:"  e.el.classList.toggle('shiny', ehShiny);",
    para:'  ;' },

  /* BRILHO E PALETA SE SEPARAM: duas chamadas, e no dia em que alguem mudar
     uma e esquecer a outra, um lutador brilha sem estar shiny — ou o contrario. */
  { id:'S455', arquivo:RODADA, nome:'brilho e paleta passam a sair de decisoes separadas',
    real:'"a funcao e pura, chamar duas vezes da o mesmo" — da, ate uma das duas mudar',
    de:'  e.folha = sheetURL(e.f.dex, key, ehShiny);',
    para:'  e.folha = sheetURL(e.f.dex, key, skinShinyAtiva(S.profile, e.f.dex));' },

  /* O BRILHO VIRA TINTA: `hue-rotate` repinta a paleta que o autor da arte
     escolheu. E a mesma classe de erro que trocar a fonte da arte (v0.6.1). */
  { id:'S456', arquivo:APP, nome:'o brilho do shiny passa a repintar o sprite',
    real:'"fica mais vistoso" — e a paleta deixa de ser a que o autor desenhou',
    de:'.mon.shiny .body{\n  --contorno:drop-shadow(0 0 1px rgba(0,0,0,.9))\n             drop-shadow(0 0 5px rgba(255,214,90,.55))\n             drop-shadow(0 3px 4px rgba(0,0,0,.45))}',
    para:'.mon.shiny .body{filter:hue-rotate(40deg) saturate(1.8)}' },

  /* O RETRATO PERDE A MARCA: os gifs do banner e do resultado voltam a ser
     indistinguiveis do normal. */
  { id:'S457', arquivo:SPRITES, nome:'o retrato animado deixa de dizer que e shiny',
    real:'"o proprio gif ja e o shiny" — e ninguem sabe disso olhando um gif so',
    de:'${extra || \'\'}${shiny ? \' data-shiny="1"\' : \'\'} `',
    para:'${extra || \'\'} `' },

  /* O SIMBOLO DO BANNER DISPUTA O `::after` DA MARCA DE K.O. — e os dois somem
     justamente na rodada em que o lutador caiu, que e quando se esta olhando. */
  { id:'S458', arquivo:APP, nome:'o simbolo shiny do banner vira pseudo-elemento',
    real:'"um elemento a menos no HTML" — e o `::after` do banner ja e o K.O.',
    de:'.bnShiny{position:absolute;right:14px;bottom:118px;z-index:3;',
    para:'.battle-banner.shiny::after{content:"✦";position:absolute;right:14px;bottom:118px;z-index:3;' },

  /* A GRADE VOLTA AO RETRATO PARADO: o jogador escolhe olhando um PNG e recebe
     um GIF no banner. E o defeito do R13 voltando por outra tela. */
  { id:'S459', arquivo:CUSTOM, nome:'a grade do lutador do banner volta ao PNG parado',
    real:'"a grade e so para escolher" — escolher vendo outra coisa e escolher as cegas',
    de:"      ${retratoAnimado(m, 'loading=\"lazy\"', sh)}",
    para:"      ${dexImg(m.dex, m.n, 'loading=\"lazy\"')}" },

  /* ═══ R35 · AS TRES MEDALHAS SAO TRES MATIZES ════════════════════════════ */

  /* O TOKEN DO TEMA VOLTA PARA A MEDALHA. `--gold` e o ACENTO, e neste tema ele
     vale #00e5ff — ciano. Foi assim que o primeiro lugar deixou de ser dourado
     sem ninguem notar: o nome do token dizia uma coisa e o valor era outra. */
  { id:'S460', arquivo:APP, nome:'o primeiro lugar volta a usar o acento do tema',
    real:'"e o token de dourado do projeto" — o nome e dourado, o valor e ciano',
    de:'  border-bottom-color:#ffd633;position:relative;overflow:hidden}',
    para:'  border-bottom-color:var(--gold);position:relative;overflow:hidden}' },

  /* OURO E BRONZE SE APROXIMAM ate virarem a mesma cor um pouco diferente — que
     e o estado de que o dono do projeto reclamou, com nome e sobrenome. */
  { id:'S461', arquivo:APP, nome:'o bronze se aproxima do ouro ate se confundirem',
    real:'"bronze e um dourado escuro" — a 19 graus de matiz ninguem separa os dois',
    de:'border-bottom-color:#c85d24}',
    para:'border-bottom-color:#e0a845}' },

  /* A PRATA DESSATURA e volta a ser cinza de painel: nao identifica medalha
     nenhuma, que e o "sem graca e morta" do relato. */
  { id:'S462', arquivo:APP, nome:'a prata volta a ser um cinza de painel',
    real:'"prata e cinza" — prata tem croma, cinza e ausencia dela',
    de:'border-bottom-color:#cfe0f2}',
    para:'border-bottom-color:#b4b9c0}' },

  /* O OURO ESCURECE ate deixar de ser "mais brilhante e amarelado", que foi o
     pedido literal. */
  { id:'S463', arquivo:APP, nome:'o ouro volta a ser ambar apagado',
    real:'"fica mais elegante escuro" — e deixa de se ler numa lista em movimento',
    de:'border-bottom-color:#ffd633;',
    para:'border-bottom-color:#8a6f10;' },

  /* ═══ R36 · A LIGA NO SERVIDOR ═══════════════════════════════════════════
   *
   * Nenhum destes e defeito de dinheiro — a Liga nao move valor. Sao defeitos
   * de MERITO, e cada um falha em silencio: a tabela continua com o mesmo
   * numero de linhas e a tela continua bonita. */

  /* A JANELA ABRE DEPOIS DO FATO. Prever com a rodada travada nao mede leitura:
     mede quem consegue mandar um POST depois de o elenco e as odds sairem. */
  { id:'S464', arquivo:LIGA, nome:'a previsao passa a ser aceita com a rodada travada',
    real:'"a rodada ainda nao lutou" — nao lutou, mas ja foi decidida pelo commit da semente',
    de:"  if (rodada.status !== 'aberta')",
    para:"  if (rodada.status === 'encerrada')" },

  /* A FRESTA ENTRE O RELOGIO E O STATUS. O scheduler pode nao ter passado
     ainda; sem a segunda conferencia, existe uma janela de milissegundos em que
     a rodada esta `aberta` no banco e fechada no relogio. */
  { id:'S465', arquivo:LIGA, nome:'a janela passa a ser conferida so pelo status',
    real:'"o status ja diz tudo" — diz, quando o scheduler ja passou',
    de:'  if (agora >= rodada.betting_locks_at)',
    para:'  if (false)' },

  /* A DISTRIBUICAO INVALIDA PASSA A SER NORMALIZADA, e o jogador e pontuado por
     uma opiniao que ele nao teve. */
  { id:'S466', arquivo:LIGA, nome:'a distribuicao invalida passa a ser aceita',
    real:'"o cliente que se vire com o formato" — e quem paga a nota e o jogador',
    de:'  if (problemas.length)',
    para:'  if (false)' },

  /* A LIQUIDACAO DEIXA DE SER IDEMPOTENTE: reprocessar a rodada reescreve as
     notas, e a classificacao de uma temporada fechada muda por baixo. */
  { id:'S467', arquivo:LIGA, nome:'reprocessar a rodada passa a reescrever as notas',
    real:'"a conta e a mesma, o resultado e o mesmo" — ate a formula mudar de versao',
    de:'      WHERE round_id = ? AND score IS NULL`).all(roundId);',
    para:'      WHERE round_id = ?`).all(roundId);' },

  /* A GUARDA DO UPDATE SOME. Sozinha ela ja seguraria o reprocessamento; as
     duas existem porque cada uma cobre um caminho. */
  { id:'S468', arquivo:LIGA, nome:'a gravacao da nota deixa de exigir que ela esteja vazia',
    real:'"o SELECT ja filtrou" — filtrou naquele instante, e duas chamadas se cruzam',
    de:'      WHERE id = ? AND score IS NULL`);',
    para:'      WHERE id = ?`);' },

  /* CONTAS LIGADAS VOLTAM A SOMAR: cada conta vira um competidor, e abrir cinco
     contas vira estrategia. */
  { id:'S469', arquivo:LIGA, nome:'o ranking deixa de colapsar contas ligadas',
    real:'"cada conta e um jogador" — cinco contas nao sao cinco pessoas',
    de:'    const grupo = [l.user_id, ...contasLigadas(db, l.user_id)];',
    para:'    const grupo = [l.user_id];' },

  /* O GRUPO PASSA A SER REPRESENTADO PELA MELHOR NOTA — e ai multi-conta vira
     VANTAGEM: abrir cinco, prever com todas, ficar com a que deu sorte. E o
     farm que o §6.8 proibe, com a mecanica de defesa virada do avesso. */
  { id:'S470', arquivo:LIGA, nome:'o grupo passa a ser representado pela melhor nota',
    real:'"o melhor da pessoa e o melhor dela" — e abrir contas passa a melhorar o melhor',
    de:'      b.amostra - a.amostra || String(a.user_id).localeCompare(String(b.user_id)))[0];',
    para:'      (a.soma / a.amostra) - (b.soma / b.amostra))[0];' },

  /* A LIGA PASSA A MEXER EM DINHEIRO. E o que a tira de fora do §25.1 — e a
     linha que faz isso deixar de ser verdade cabe num commit distraido. */
  { id:'S471', arquivo:LIGA, nome:'a liquidacao da Liga passa a creditar a carteira',
    real:'"recompensar a boa previsao engaja" — e muda o enquadramento do produto inteiro',
    de:'    pontuadas += gravar.run(nota, agora, VERSAO_PONTUACAO, p.id).changes;',
    para:'    pontuadas += gravar.run(nota, agora, VERSAO_PONTUACAO, p.id).changes;\n    db.prepare(`INSERT INTO wallet_ledger (id, user_id, tipo, bucket, valor, criado_em, idem) VALUES (?,?,?,?,?,?,?)`).run(randomUUID(), p.id, \'LIGA\', \'bonus\', 1, agora, p.id);' },

  /* ═══ R37a · A BOLA SAI DO CHAO QUANDO ELA ABRE ══════════════════════════
   *
   * O catalogo de 24 pokebolas existe desde o V1.15 e nunca aparecia: o desenho
   * era decidido por uma bandeira UNICA, ligada quando a fila de entrada e
   * montada — com o veu ainda cobrindo. As doze sumiam de uma vez e a arena
   * aparecia vazia. */

  { id:'S472', arquivo:RENDER, nome:'as doze bolas voltam a sumir de uma vez',
    real:'"a bandeira ja diz que a entrada comecou" — comecou a FILA, nao a abertura',
    de:'    if (!e.aberta){ drawBall(map, e.x|0, (e.y-7)|0, e.bola); continue; }',
    para:'    if (!S.released){ drawBall(map, e.x|0, (e.y-7)|0, e.bola); continue; }' },

  /* A MARCACAO SAI DA FILA: sem ela `!e.aberta` e sempre verdadeiro, e a bola
     fica no chao para sempre — por baixo do proprio Pokemon. */
  { id:'S473', arquivo:FASES, nome:'a fila deixa de marcar a bola como aberta',
    real:'"a classe CSS ja marca" — a classe e do elemento, o desenho e do canvas',
    de:'      e.aberta = true;',
    para:'      ;' },

  /* ═══ R37b · O TAMANHO DO RETRATO NO BANNER ═════════════════════════════ */

  /* O TAMANHO FIXO VOLTA. Com `object-fit:contain`, tamanho fixo faz toda
     imagem preencher a caixa — e a ampliacao passa a variar de 1x a 3,4x
     conforme o sprite. O bicho de 35 px vira o maior da tela, em pixel grosso. */
  { id:'S474', arquivo:APP, nome:'o retrato do banner volta a ter tamanho fixo',
    real:'"assim todos ficam do mesmo tamanho" — do mesmo tamanho e com ampliacao diferente',
    de:'  max-width:100px;max-height:100px;',
    para:'  width:118px;height:118px;' },

  /* O TETO SOBE de volta: o retrato volta a disputar a caixa com o rodape, que
     e a segunda metade do relato. */
  { id:'S475', arquivo:BANNER, nome:'o teto do retrato volta a 118px',
    real:'"cabe na caixa" — cabe, e ocupa a caixa inteira',
    de:'const RETRATO_CAIXA = 100;',
    para:'const RETRATO_CAIXA = 118;' },

  /* A AMPLIACAO DEIXA DE TER LIMITE: so o teto sobra, e o teto sozinho e o
     `contain` outra vez — todo sprite esticado ate preencher. */
  { id:'S476', arquivo:BANNER, nome:'a ampliacao do retrato deixa de ter limite',
    real:'"o teto ja resolve" — o teto sozinho e o contain de novo',
    de:'      const f = Math.min(RETRATO_FATOR, RETRATO_CAIXA / Math.max(w, h));',
    para:'      const f = RETRATO_CAIXA / Math.max(w, h);' },

  /* A IMAGEM EM CACHE FICA SEM MEDICAO. O defeito volta so para quem ja tem o
     GIF em disco — ou seja, para quem joga ha mais tempo. */
  { id:'S477', arquivo:BANNER, nome:'a medicao do retrato deixa de alcancar o cache',
    real:'"o load sempre dispara" — nao dispara para imagem que ja estava carregada',
    de:"    if (img.complete) medir(); else img.addEventListener('load', medir, { once: true });",
    para:"    img.addEventListener('load', medir, { once: true });" },

  /* ═══ R38 · O COSMETICO ESCOLHIDO CONTINUA ANIMANDO ═════════════════════ */

  /* O CONGELAMENTO VOLTA. E a regressao que o R29 cometeu e que o dono do
     projeto relatou: os doze efeitos de nome com as cores paradas. */
  { id:'S478', arquivo:APP, nome:'os efeitos de nome voltam a ser congelados',
    real:'"movimento reduzido pede que o movimento pare" — pede, para o movimento AMBIENTE',
    de:'  .bnMold>.mdFio::after{animation-iteration-count:infinite !important}',
    para:'  .bnMold>.mdFio::after{animation:none !important}' },

  /* A ISENCAO PERDE OS PSEUDO-ELEMENTOS: o Holograma anima num `::after` e
     volta a ser o unico dos doze parado — um defeito que so aparece num
     cosmetico especifico, que e como ele passaria despercebido. */
  { id:'S479', arquivo:APP, nome:'a isencao dos efeitos deixa de cobrir os pseudo-elementos',
    real:'"a classe ja cobre o elemento" — cobre o elemento, e o reset alcanca o pseudo',
    de:'  [class*="ef-"],\n  [class*="ef-"]::before,\n  [class*="ef-"]::after,',
    para:'  [class*="ef-"],' },

  /* O OURO PERDE O RECORTE NO GLIFO e vira mais uma caixa acesa — que e
     exatamente o "outra cor do mesmo efeito" que o pedido excluia. */
  { id:'S480', arquivo:APP, nome:'o efeito Ouro perde o recorte no texto',
    real:'"o gradiente ja aparece" — aparece na caixa, e o efeito era no metal da letra',
    de:'  background-size:250% 100%;\n  -webkit-background-clip:text;background-clip:text;\n  color:transparent;-webkit-text-fill-color:transparent;',
    para:'  background-size:250% 100%;' },

  /* OS CONTROLES SOBEM POR CSS em vez de subirem pelo documento. E a correcao
     que parece igual e nao e: a propriedade `order` move o DESENHO e deixa a
     ordem de leitura e a de tabulacao onde estavam, entao quem navega por
     teclado ou por leitor de tela recebe "iniciar rodada" ANTES de "sua
     aposta" — exatamente a ordem que o dono do projeto pediu para desfazer.
     A coluna ja tem a ordem certa no HTML; usar `order` por cima devolve o
     problema so para quem nao ve a tela, que e a pior forma de devolver. */
  { id:'S481', arquivo:APP, nome:'os controles sobem por CSS em vez de pelo documento',
    real:'"na tela fica no mesmo lugar" — fica, e a ordem de teclado volta a errada',
    de:'    <div class="card" id="cardControles">',
    para:'    <div class="card" id="cardControles" style="order:-1">' },

  /* ═══ R40 · AS MOLDURAS DE AVATAR ═══════════════════════════════════════
     Nove defeitos, e nenhum derruba o app: todos deixam a tela de pé e
     entregam a coisa errada. E a classe de falha que este bloco tem. */

  /* COSMETICO ENTRA NO CATALOGO SEM DESENHO. O jogador ve "Prisma" na grade,
     clica, salva, e o avatar fica sem moldura nenhuma — nada quebra, nada
     avisa. E a falha mais provavel deste catalogo, porque adicionar uma linha
     na lista custa cinco segundos e escrever o CSS custa uma tarde.

     A PRIMEIRA VERSAO DESTE DEFEITO ERA FRACA e escapou: ela renomeava
     `.md-campeao{` e deixava `.md-campeao::before` para tras, entao a classe
     continuava existindo no arquivo e o teste seguia verde. Renomear UM
     seletor nao apaga um cosmetico; acrescentar um id sem seletor nenhum,
     sim. */
  { id:'S482', arquivo:BANNERD, nome:'uma moldura entra no catalogo sem desenho no CSS',
    real:'"e so mais uma linha na lista" — e uma opcao que nao faz nada ao ser clicada',
    de:"  { id:'bola',     nm:'Pokébola',   ico:'⚪' },",
    para:"  { id:'bola',     nm:'Pokébola',   ico:'⚪' },\n  { id:'prisma',   nm:'Prisma',     ico:'🔷' }," },

  /* A MOLDURA MEXE NO RETRATO. E a regressao cara: o R37b calculou o
     enquadramento medindo a dimensao natural do GIF, e um tema que declare
     tamanho desfaz aquele calculo em silencio — a foto continua aparecendo,
     so que esticada. */
  { id:'S483', arquivo:APP, nome:'uma moldura volta a mandar no tamanho do retrato',
    real:'"e so um ajuste fino" — e o enquadramento do R37b indo embora',
    de:'.md-ouro>.bnTreinador{border-radius:8px}',
    para:'.md-ouro>.bnTreinador{border-radius:8px;object-fit:cover}' },

  /* A ANCORA FICA NOS DOIS. O retrato sai do lugar DENTRO da moldura, e
     nenhum teste de comportamento ve isso. */
  { id:'S484', arquivo:APP, nome:'o retrato volta a se ancorar sozinho dentro da moldura',
    real:'"na tela parece igual" — parece, ate a moldura mudar de tema',
    de:'.bnMold>.bnTreinador{position:static;',
    para:'.bnMold>.bnTreinador{position:absolute;' },

  /* A MOLDURA PERDE A ISENCAO DO MOVIMENTO REDUZIDO. Quem marcou a preferencia
     recebe a moldura CONGELADA em vez da estatica que podia ter equipado — e
     o catalogo tem seis estaticas justamente para nao precisar disso. */
  { id:'S485', arquivo:APP, nome:'a moldura escolhida volta a congelar com movimento reduzido',
    real:'"a preferencia manda" — manda no movimento ambiente, nao na escolha',
    de:'  .bnMold,\n  .bnMold::before,',
    para:'  .bnMoldX,\n  .bnMoldX::before,' },

  /* O ANGULO DEIXA DE SER DECLARADO. Sem `@property` a variavel e TEXTO: salta
     de 0deg para 360deg num passo, e Holograma, Trovao, Marquise e Circuito
     Vivo ficam parados — parados e VERDES em qualquer teste estatico. */
  { id:'S486', arquivo:APP, nome:'o angulo das molduras que giram deixa de ser declarado',
    real:'"a variavel esta la" — esta, como texto, e texto nao interpola',
    de:'@property --mdAng2 { syntax:"<angle>"; initial-value:0deg; inherits:false }',
    para:'/* --mdAng2 */' },

  /* A MOLDURA VAI PARA O LADO EM VEZ DE EM VOLTA. O HTML fica valido, a
     moldura aparece, e o retrato fica de fora dela. */
  { id:'S487', arquivo:BANNER, nome:'a moldura passa a ficar ao lado do retrato',
    real:'"os dois aparecem" — aparecem, um dentro e outro fora',
    de:'`<span class="bnMold md-${moldura}">${retratoTreinador}${fioDaMoldura}</span>`',
    para:'`<span class="bnMold md-${moldura}"></span>${retratoTreinador}`' },

  /* O GUARDA-ROUPA PERDE A GRADE. Dezoito molduras desenhadas e nenhuma
     equipavel — cosmetico sem onde equipar e cosmetico que nao existe. */
  { id:'S488', arquivo:CUSTOM, nome:'o guarda-roupa perde a grade de molduras',
    real:'"da para trocar no perfil" — nao da: nao ha onde clicar',
    de:"  $('#pickMoldura').innerHTML",
    para:"  $('#pickMolduraX').innerHTML" },

  /* A AMOSTRA MOSTRA A MOLDURA VAZIA. Mesmo defeito do R34 no lutador do
     banner: escolher olhando uma coisa e receber outra. E a Pokebola corta as
     orelhas de quem estiver dentro, o que precisa aparecer ANTES de equipar. */
  { id:'S489', arquivo:CUSTOM, nome:'a amostra da moldura fica vazia no guarda-roupa',
    real:'"da para ver a moldura" — da, e nao da para ver o que ela faz com o rosto',
    de:'          <img class="bnTreinador${avatarEhArte() ? \' avArte\' : \'\'}" src="${avatarURL()}" alt=""\n            onerror="this.onerror=null;this.src=\'${trainerURL(\'red\')}\'">${',
    para:'          ${' },

  /* A GUARDA DO ID SOME. Perfil salvo antes do R40 chega SEM moldura, e essa
     linha e a unica coisa entre ele e um `class="md-undefined"` sem desenho.
     E o S70 outra vez, agora no terceiro cosmetico do banner. */
  { id:'S490', arquivo:BANNERD, nome:'a moldura deixa de guardar contra id que nao existe',
    real:'"o id sempre vem da nossa lista" — vem do disco de quem jogou antes',
    de:"  const lista = tipo === 'cena' ? BN_CENAS : tipo === 'moldura' ? BN_MOLDURAS : BN_EFEITOS;",
    para:"  const lista = tipo === 'cena' ? BN_CENAS : BN_EFEITOS;" },

  /* ═══ R41 · O RAYQUAZA CONTORNANDO O LAYOUT ═════════════════════════════
     Cinco defeitos. O tema deles e o mesmo: a arte deixou de ser papel de
     parede e passou a ser MOLDURA, e moldura depende de enquadramento — um
     numero errado nao quebra nada, so devolve o papel de parede. */

  /* O ENQUADRAMENTO VOLTA A SER `cover`. E a versao anterior, e ela nao esta
     errada por feiura: `cover` corta o corpo do bicho nas quatro bordas, entao
     ele deixa de contornar qualquer coisa. O pedido do dono do projeto era
     exatamente o contorno. */
  { id:'S491', arquivo:APP, nome:'a arte da arena volta a ser papel de parede em vez de moldura',
    real:'"cover preenche a tela" — preenche, e corta o bicho nas quatro bordas',
    /* A ancora carrega a linha ANTERIOR porque a mesma arte aparece duas
       vezes no arquivo — no fundo e na camada do rosto, que precisam do MESMO
       enquadramento para nao aparecerem desalinhadas. `z-index:-1` no seletor
       de cima e o que distingue a de baixo. */
    de:"  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;\n  background:url('../arte/arena-rayquaza.png') 50.5% 53% / 188% auto no-repeat;",
    para:"  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;\n  background:url('../arte/arena-rayquaza.png') center center / cover no-repeat;" },

  /* O CENTRO DO VISOR VIRA O CENTRO DA IMAGEM. Parece a mesma coisa e nao e:
     o bicho ocupa mais o lado direito da arte, entao o visor NAO fica no meio
     dela. Centrar a imagem joga o layout para fora da abertura. */
  { id:'S492', arquivo:APP, nome:'a moldura passa a centrar a imagem em vez do visor',
    real:'"50% e o centro" — e o centro da IMAGEM, e o visor nao mora la',
    de:'auto no-repeat;\n  opacity:.24;filter:saturate(1.2)}',
    para:'auto no-repeat;\n  background-position-x:50%;\n  opacity:.24;filter:saturate(1.2)}' },

  /* A MASCARA PERDE O RAIO. Em CSS, `radial-gradient(circle at ...)` sem raio
     significa `farthest-corner`: a mascara cobre a tela inteira e o `screen`
     lava a interface toda. Foi o defeito real que apareceu ao OLHAR a primeira
     aplicacao, e ele passa por qualquer teste estatico. */
  { id:'S493', arquivo:APP, nome:'a mascara do rosto perde o raio e cobre a tela inteira',
    real:'"o gradiente ja tem centro" — tem centro e nao tem raio, e o padrao e a tela toda',
    de:'  mask-image:radial-gradient(ellipse 11.5% 29.3% at 39.5% 21.5%,',
    para:'  mask-image:radial-gradient(ellipse at 39.5% 21.5%,' },

  /* A CAMADA DO ROSTO SOBE PARA CIMA DO CONTEUDO. Medido: dali ela altera
     #arena em 10,1% dos bytes, #log em 131% e o banner em 3,8% — e como o
     nosso texto e CLARO sobre fundo ESCURO, clarear o fundo REDUZ o contraste.
     A suite `contraste` passa 12/12 mesmo assim, porque ela mede cor
     declarada e nao resultado de composicao. */
  { id:'S494', arquivo:APP, nome:'a camada do rosto volta para cima da interface',
    real:'"screen so clareia, entao e seguro" — clarear fundo escuro sob texto claro derruba o contraste',
    de:'#rqRosto{position:fixed;inset:0;z-index:-1;pointer-events:none}',
    para:'#rqRosto{position:fixed;inset:0;z-index:3;pointer-events:none}' },

  /* O OLHO PASSA A PISCAR RAPIDO. Seis segundos e meio de ciclo, com o olho
     APAGADO na maior parte dele, e o que separa "o bicho esta vivo" de "tem
     uma luz piscando na tela". Perto da arena, luz rapida disputa o olho com a
     luta — e um K.O. que o jogador nao viu custa mais que o charme vale. */
  { id:'S495', arquivo:APP, nome:'o olho do Rayquaza passa a piscar rapido perto da arena',
    real:'"e so um brilho" — e um brilho competindo com a luta pelo olho de quem apostou',
    de:'  animation:rqOlho 6.5s ease-in-out infinite}',
    para:'  animation:rqOlho 1.1s ease-in-out infinite}' },

  /* ═══ R37 · A LIGA DE PREVISAO NO LADO DO JOGADOR ═══════════════════════
     Sete defeitos. Nenhum derruba a tela: todos entregam um NUMERO errado
     sobre a habilidade de alguem, que e pior — ninguem desconfia de numero. */

  /* A LIGA PASSA A MEXER EM DINHEIRO. E o unico defeito deste arquivo que nao
     e sobre precisao: e sobre o que a Liga E. A Spec a antecipou da V5 para a
     V2 porque ela NAO move dinheiro, e por isso nao tem risco regulatorio
     (§6.8, e o aviso do §25.1 que trava os mercados mutuos). Uma linha assim
     devolve o risco em silencio: a tela continua funcionando, a media continua
     sendo calculada, e o produto passa a ter valor economico numa feature
     aprovada por nao ter. */
  { id:'S496', arquivo:LIGAD, nome:'a Liga passa a mexer em dinheiro',
    real:'"e so um bonus por acertar" — e o risco regulatorio que o §25.1 trava, de volta',
    de:'  estado.soma += b;\n  estado.amostra += 1;',
    para:'  estado.soma += b;\n  estado.amostra += 1;\n  if (b < 0.2) globalThis.creditarSaldo?.(50);' },

  /* A DISTRIBUICAO DEIXA DE SER VALIDADA. Um palpite que soma 3 da um Brier
     que parece otimo e nao significa nada — e a media de todo mundo passa a
     ser comparavel com a de quem escreveu numero maior. */
  { id:'S497', arquivo:LIGAD, nome:'a Liga aceita palpite que nao e uma distribuicao',
    real:'"o jogador nao vai digitar errado" — a tela digita por ele, e arredondamento existe',
    de:"  const problemas = d ? erros(d, d.length) : ['a distribuição não é uma lista'];\n  if (problemas.length) return { erro: ERRO_PREVISAO.DISTRIBUICAO, problemas };",
    para:"  const problemas = [];" },

  /* PONTUAR DEIXA DE SER IDEMPOTENTE. O jogo pontua a mesma rodada mais de uma
     vez com facilidade: o laco redesenha, o jogador volta para a aba, a
     conexao reenvia. Sem a retirada ANTES da soma, cada repeticao infla a
     amostra e a media. */
  /* A PRIMEIRA VERSAO DESTE DEFEITO ERA INERTE e escapou: ela mandava a busca
     cair no historico, mas entrada de historico nao guarda `distribuicao` —
     `brier(undefined)` devolvia null e a funcao recusava do mesmo jeito. Um
     mutante que nao muda comportamento nao testa nada.
     O que DE FATO quebra a idempotencia e a pendente nao sair: aí a segunda
     chamada encontra o mesmo palpite e soma tudo de novo. */
  { id:'S498', arquivo:LIGAD, nome:'pontuar a mesma rodada duas vezes passa a contar duas vezes',
    real:'"so pontuamos uma vez" — o laco redesenha, e a aba volta',
    de:'  delete estado.pendentes[roundId];\n  estado.soma += b;',
    para:'  estado.soma += b;' },

  /* "ACIMA DO ACASO" VOLTA A COMPARACAO CRUA. E um defeito REAL, achado ao
     rodar os testes deste bloco: quem chuta uniforme tira EXATAMENTE a nota do
     acaso, e `media < acaso` em ponto flutuante vira cara-ou-coroa. Medido:
     com cinco rodadas uniformes o `<` devolvia `true`, e a tela elogiava o
     chute. Empate tem de resolver para "nao superou". */
  { id:'S499', arquivo:LIGAD, nome:'a Liga volta a elogiar quem so chutou uniforme',
    real:'"empate nao acontece" — acontece exatamente com quem chuta igual, que e o caso comum',
    de:'? (acaso - media) > MARGEM_ACASO : null,',
    para:'? media < acaso : null,' },

  /* O DISCO PASSA A SER CONFIADO. `localStorage` e editavel por quem quiser, e
     um `amostra: -5` gravado a mao faz a media virar negativa e o ranking
     inteiro mentir. Mesma guarda do `cosmeticoValido` (S70). */
  { id:'S500', arquivo:LIGAD, nome:'o estado da Liga no disco passa a ser confiado sem normalizar',
    real:'"o dado e nosso" — o disco e do jogador, e ele abre o console tambem',
    de:'  try { return normalizar(JSON.parse(armazem.getItem(CHAVE_LIGA))); }',
    para:'  try { return JSON.parse(armazem.getItem(CHAVE_LIGA)) ?? vazio(); }' },

  /* A CHAVE PERDE A VERSAO DA PONTUACAO. Duas reguas somadas no mesmo
     historico e a forma mais silenciosa de o numero mentir: as somas continuam
     batendo e o significado nao. */
  { id:'S501', arquivo:LIGAD, nome:'a chave do disco perde a versao da pontuacao',
    real:'"a conta nunca muda" — ela ja tem uma constante de versao justamente porque muda',
    de:'export const CHAVE_LIGA = `ar_liga_v${VERSAO_PONTUACAO}`;',
    para:"export const CHAVE_LIGA = 'ar_liga';" },

  /* PREVER DEPOIS DE SABER O VENCEDOR. A troca de palpite com a rodada aberta
     e permitida de proposito; o que ela nao pode abrir e escrever a nota
     depois da prova. */
  { id:'S502', arquivo:LIGAD, nome:'prever uma rodada ja pontuada passa a ser aceito',
    real:'"trocar o palpite e permitido" — antes de correr, nao depois de saber',
    de:'  if (estado.historico.some(h => h.roundId === roundId))\n    return { erro: ERRO_PREVISAO.DUPLICADA };',
    para:'' },

  /* ═══ R42 · OS DOIS ULTIMOS LUGARES DA REGRA DO SHINY ════════════════════
     Tres defeitos, e os tres sao a mesma familia do D-028: a regra existe,
     esta certa, e alguem nao a chama — ou chama com o argumento errado. */

  /* A TELA DE VENCEDOR VOLTA A PERGUNTAR SO A POSSE. Foi o defeito relatado
     pelo dono do projeto: um shiny que ele possui venceu uma rodada em que ele
     NAO apostou, e o campeao apareceu vestindo a skin dele. A tela mais vista
     da rodada dizendo "seu bicho ganhou" com nada dele em jogo. */
  { id:'S503', arquivo:RESTELA, nome:'a tela de vencedor volta a pintar shiny por posse solta',
    real:'"eu tenho essa skin" — tem, e o campeao nao era seu',
    de:'  const meuCampeao = !!S.myBet && S.fighters[S.myBet.idx] === f;\n  return retratoAnimado(f, \x27\x27, shinyNaArena(S.profile, f.dex, meuCampeao));',
    para:'  return retratoAnimado(f, \x27\x27, gifShinyAtivo(S.profile, f.dex));' },

  /* A GUARDA FICA E DEIXA DE GUARDAR. E a versao que parece corrigida: a
     funcao certa e chamada, com o terceiro argumento fixo em `true`. Passaria
     por qualquer leitura apressada do diff. */
  { id:'S504', arquivo:RESTELA, nome:'a escolha do vencedor vira `true` fixo',
    real:'"esta chamando shinyNaArena" — esta, e respondendo sempre que sim',
    de:'shinyNaArena(S.profile, f.dex, meuCampeao)',
    para:'shinyNaArena(S.profile, f.dex, true)' },

  /* O BANNER DO PERFIL PERDE O SHINY OUTRA VEZ. `dexImg` aceita o quarto
     argumento desde sempre; ele so nunca era dado, e a chamada pedia a folha
     normal em silencio — ao lado do guarda-roupa que acabou de dizer que a
     skin esta ativa. */
  { id:'S505', arquivo:CUSTOM, nome:'o banner do perfil volta a ignorar a skin equipada',
    real:'"o banner de batalha mostra" — mostra, e sao dois banners diferentes',
    de:"${dexImg(b.dex, slugDoDex(b.dex), 'class=\"mon\"', gifShinyAtivo(S.profile, b.dex))}",
    para:"${dexImg(b.dex, slugDoDex(b.dex), 'class=\"mon\"')}" },

  /* ═══ R43 · AS VINTE ARTES NOVAS ════════════════════════════════════════
     Cinco defeitos, e nenhum derruba a tela: a arte simplesmente nao aparece,
     ou aparece cortada no lugar errado. E a classe de falha de catalogo. */

  /* UMA CENA FICA SEM DESENHO. O jogador ve o nome na lista, clica, salva, e o
     banner fica vazio — sem nada no console. */
  { id:'S506', arquivo:APP, nome:'uma cena escolhivel perde a regra no CSS',
    real:'"o arquivo esta la" — esta, e nada aponta para ele',
    de:'.cn-chopechoke{',
    para:'.cn-chopechokeX{' },

  /* O ENQUADRAMENTO DIVERGE ENTRE O CSS E O CATALOGO. As regras sao GERADAS do
     catalogo; ajustar uma sem a outra faz a previa e o jogo mostrarem coisas
     diferentes — e a previa e onde as decisoes sao tomadas. */
  { id:'S507', arquivo:APP, nome:'o enquadramento do CSS diverge do catalogo',
    real:'"e so uns pontos percentuais" — e a previa deixando de descrever o jogo',
    de:'.cn-moltres{--foco:50% 24%;',
    para:'.cn-moltres{--foco:50% 62%;' },

  /* A GALERIA DEIXA DE SER RESOLVIDA. O avatar aponta para lugar nenhum e a
     cascata de resgate leva ao sprite padrao — o jogador perde a arte que
     escolheu sem entender por que. */
  { id:'S508', arquivo:PERFIL, nome:'o perfil deixa de resolver o avatar da galeria',
    real:'"kind e kind" — e o acervo monta o caminho pelo id, a galeria pelo arquivo',
    de:"  if (a.kind === 'galeria') return galeriaURL(a.id);",
    para:'' },

  /* O ENQUADRAMENTO NAO CHEGA AO BANNER. O avatar aparece com o corte padrao
     ali e com o corte escolhido na faixa — duas versoes do mesmo rosto na
     mesma pagina. */
  { id:'S509', arquivo:BANNER, nome:'o banner de batalha ignora o enquadramento do avatar',
    real:'"o CSS ja enquadra" — enquadra igual para todas, e elas vao de 0,71 a 1,92',
    de:'src="${avatarURL()}" alt="" style="${avatarEnquadramento()}"',
    para:'src="${avatarURL()}" alt=""' },

  /* O CATALOGO OFERECE UMA ARTE QUE NAO EXISTE EM DISCO. E o erro mais provavel
     ao acrescentar arte: a linha na lista custa cinco segundos, copiar o
     arquivo e outro passo — e o `<img>` nao lanca, so fica vazio. */
  { id:'S510', arquivo:ARTESD, nome:'o catalogo oferece uma arte que nao esta em disco',
    real:'"eu copiei o arquivo" — e o teste e o unico que confere isso',
    de:"  { id:'chopechoke',     nm:'Guardiões da Colina', arq:'banner_chopechoke.jpg',    y:0.50 },",
    para:"  { id:'chopechoke',     nm:'Guardiões da Colina', arq:'banner_chopechoke.jpg',    y:0.50 },\n  { id:'fantasmagoria', nm:'Fantasmagoria', arq:'banner_naoexiste.jpg', y:0.50 }," },

  /* ═══ R44 · A RAIZ DO SERVIDOR LOCAL ════════════════════════════════════

     A RAIZ VOLTA A SERVIR O APP POR BAIXO. E o defeito que foi entregue ao
     dono do projeto junto com o link, e ele nao produz erro nenhum: a pagina
     certa e servida com a BASE errada, todo import relativo resolve para fora
     do lugar, e a tela de entrada — que e HTML estatico — desenha normalmente.
     O jogo so nunca da boot.

     Medido: 0 linhas de odds e 34 requisicoes 404 na raiz, contra 12 e 1 no
     caminho do app. */
  { id:'S511', arquivo:SERVIR, nome:'a raiz volta a servir o app por baixo em vez de redirecionar',
    real:'"entrega a mesma pagina" — entrega, com a base errada, e nada carrega',
    de:"    if (p === '/' || p === '/app' || p === '/app/') {\n      res.writeHead(302, { location: '/app/index.html' }).end();\n      return;\n    }",
    para:"    if (p === '/') p = '/app/index.html';" },

  /* O REDIRECIONAMENTO APONTA PARA A PASTA, e nao para o arquivo. Parece igual
     e nao e: `/app/` sem arquivo cai no `index.html` por dentro do servidor, e
     a base do documento volta a ser a pasta — o mesmo defeito com outra roupa,
     agora com um `302` na frente para parecer resolvido. */
  { id:'S512', arquivo:SERVIR, nome:'o redirecionamento aponta para a pasta e o defeito volta',
    real:'"redireciona, entao esta certo" — redireciona para o mesmo lugar errado',
    de:"      res.writeHead(302, { location: '/app/index.html' }).end();",
    para:"      res.writeHead(302, { location: '/app/' }).end();" },


  /* ── BLOCO 0.1 · O CIRCUITO DA PROGRESSÃO (D-045) ──────────────────────
   *
   * Seis defeitos, tres de cada ponta. A maquina do F1.10 ja tinha sabotagem
   * para as REGRAS dela (S261 a S266); o que nunca teve foi sabotagem para a
   * LIGACAO — e foi exatamente a ligacao que faltava. */

  /* A LIQUIDACAO PARA DE CONCEDER. E o D-045 voltando inteiro pela ponta do
     servidor: a rota continua respondendo, o perfil so nunca cresce. */
  { id:'S513', arquivo:SRVAPO, nome:'a liquidacao para de conceder XP e desafio',
    real:'"progressao nao e coisa da aposta" — e o perfil volta a nunca crescer',
    de:'    if (t.settled_at == null) {',
    para:'    if (false) {' },

  /* A CONFERENCIA DO `dex` SOME. Hoje `slot` coincide com o indice na pool
     porque `precificar` preserva a ordem; no dia em que alguem ordenar por odd,
     o XP e o desafio vao para o lutador errado, calados. */
  { id:'S514', arquivo:SRVAPO, nome:'a liquidacao deixa de conferir o lutador antes de conceder',
    real:'"o slot e o indice, sempre foi" — ate alguem ordenar a lista de precos',
    de:'      if (meu && meu.dex === t.species_id) {',
    para:'      if (meu) {' },

  /* A IDEMPOTENCIA DO XP SOME. O saldo sobrevive pela chave da carteira; o XP
     e uma coluna que so sobe, e um reprocessamento infla o nivel. */
  { id:'S515', arquivo:SRVAPO, nome:'o XP passa a ser concedido de novo a cada reprocessamento',
    real:'"o filtro de status ja basta" — nao basta com a coluna revertida a mao',
    de:"        darXP(db, { userId: t.user_id, quanto: partes.reduce((a, p) => a + p.xp, 0),\n                    motivo: `rodada:${roundId}`, agora });",
    para:"        darXP(db, { userId: t.user_id, quanto: partes.reduce((a, p) => a + p.xp, 0),\n                    motivo: `rodada:${roundId}`, agora });\n        darXP(db, { userId: t.user_id, quanto: 1, motivo: 'duplicado', agora });" },

  /* A HIDRATACAO ATROPELA O PERFIL INTEIRO. E o jeito mais facil de este bloco
     apagar do R24 ao R43: uma linha, e o cosmetico some no primeiro boot. */
  { id:'S516', arquivo:PERFDAD, nome:'a hidratacao substitui o perfil inteiro e apaga o cosmetico',
    real:'"o servidor e a fonte, entao ele manda no objeto" — manda nos CAMPOS dele',
    de:'  S.profile.xp = r.corpo?.perfil?.xp ?? 0;',
    para:'  S.profile = { ...(r.corpo?.perfil ?? {}) };' },

  /* A ORDEM INVERTE. Ler antes de registrar devolve a trilha de ontem por uma
     chamada, e o jogador ve a sequencia errada no primeiro quadro do dia. */
  { id:'S517', arquivo:PERFDAD, nome:'a trilha e lida antes de o dia ser registrado',
    real:'"ler primeiro e mais barato" — e devolve a sequencia de ontem',
    de:"  await api.post('/api/perfil/entrar', {});\n  const r = await api.get('/api/perfil');",
    para:"  const r = await api.get('/api/perfil');\n  await api.post('/api/perfil/entrar', {});" },

  /* O BOOT PARA DE HIDRATAR. A ponta do cliente do D-045, de volta — e verde
     em toda suite que nao olhe o boot. */
  { id:'S518', arquivo:APP, nome:'o boot volta a hidratar so a carteira, e nao o perfil',
    real:'"a carteira ja hidrata, o resto vem junto" — nao vem, e o nivel zera',
    de:'  await hidratarPerfil();',
    para:'' },


  /* ── BLOCO 0.3 · HIGIENE DE ARNÊS ──────────────────────────────────────── */

  /* O SQLITE NAO CRIA DIRETORIO. Sem esta linha, um clone limpo nao sobe, e a
     mensagem que sai — "unable to open database file" — e a mesma de permissao
     negada e disco cheio. E o D-030. */
  { id:'S519', arquivo:SRVDB, nome:'o banco volta a nao criar o diretorio que falta',
    real:'"o SQLite cria o arquivo, entao cria a pasta" — cria o arquivo, e so',
    de:"  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });",
    para:'' },

  /* O `recursive` SOME. Passa com um nivel e quebra com dois — e `dados/` vira
     `var/dados/` no dia em que alguem mexer no config. */
  { id:'S520', arquivo:SRVDB, nome:'a criacao do diretorio deixa de ser recursiva',
    real:'"e uma pasta so" — ate o caminho ter duas',
    de:"  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });",
    para:"  if (caminho !== ':memory:') mkdirSync(dirname(caminho));" },


  /* O GANCHO DE SAIDA SOME. A limpeza volta a acontecer so no fim do caminho
     feliz, e todo aborto passa a deixar N+1 caixas para tras. E o D-036: foram
     120 caixas e 3,25 GB medidos em 29/08. */
  { id:'S521', arquivo:SABOT, nome:'as caixas voltam a sobreviver ao aborto do portao',
    real:'"a limpeza no fim ja resolve" — resolve quando o portao TERMINA',
    de:"process.on('exit', limpar);",
    para:'' },

  /* A CAIXA_BASE SAI DA LISTA DO LIMPADOR. E o vazamento silencioso: uma caixa
     por execucao BEM-SUCEDIDA, porque ela sai de CAIXAS num `pop()`. */
  { id:'S522', arquivo:SABOT, nome:'a caixa base volta a vazar no caminho feliz',
    real:'"CAIXAS ja tem todas" — tem todas menos a que o pop() tirou',
    de:'const limpar = () => limparCaixas([...CAIXAS, CAIXA_BASE_REF.atual], PRESERVADAS);',
    para:'const limpar = () => limparCaixas([...CAIXAS], PRESERVADAS);' },


  /* O MASCARADOR VOLTA A COMER A INTERPOLACAO. E o D-046: simbolo usado so
     dentro de `${...}` fica invisivel, e todo import ausente que so apareca ali
     passa pela rede. */
  { id:'S523', arquivo:MODULOS, nome:'o mascarador volta a tratar o template como texto inteiro',
    real:'"crase e aspas, e aspas viram espaco" — o miolo de ${} e CODIGO',
    de:"      if (c === '`') { emTemplate(); continue; }",
    para:"      if (c === '`') { aspas('`'); continue; }" },

  /* A CHAVE DA INTERPOLACAO DEIXA DE SER CONTADA. `${ g({a:b}) }` fecha na
     chave do OBJETO, e o resto do miolo vira texto. */
  { id:'S524', arquivo:MODULOS, nome:'a interpolacao fecha na primeira chave que aparecer',
    real:'"a primeira } fecha" — nao fecha quando ha um objeto no meio',
    de:"          if (chaves === 0) { out[k++] = ' '; return; }   // fecha a interpolação",
    para:"          { out[k++] = ' '; return; }" },

  /* ── BLOCO 1.1 ──────────────────────────────────────────────────────────
     Os sete defeitos abaixo tem uma coisa em comum: NENHUM deles derruba o
     jogo. Todos deixam a partida rodando e mentem sobre o numero pelo qual o
     mercado paga. E por isso que eles existem. */

  /* O PISO DO EXEMPLAR SOME. A raridade de 4% continua sendo sorteada e
     anunciada, e o exemplar passa a sair igual a qualquer outro. Vender
     "exemplar" que nao e exemplar e a fraude mais barata que este jogo pode ter. */
  { id:'S525', arquivo:INST, nome:'o exemplar deixa de ter piso nos ocultos',
    real:'"o sorteio ja e o mesmo" — o que muda o exemplar e o PISO, nao o sorteio',
    de:'  const piso = exemplar ? (exemplarConf?.piso ?? 0) : 0;',
    para:'  const piso = 0;' },

  /* O DENOMINADOR DO POTENCIAL ERRA POR UM. Todo mundo fica ~20% melhor, para
     sempre, e nada reprova: 100 vira um numero comum em vez de excepcional. */
  { id:'S526', arquivo:INST, nome:'o potencial passa a ser dividido por cinco ocultos',
    real:'"sao seis ocultos, e seis esta escrito ali" — N_OCULTOS - 1 nao e seis',
    de:'  Math.round((iv.reduce((a, b) => a + b, 0) / (N_OCULTOS * OCULTO_MAX)) * 100);',
    para:'  Math.round((iv.reduce((a, b) => a + b, 0) / ((N_OCULTOS - 1) * OCULTO_MAX)) * 100);' },

  /* O BIOMA PASSA A EXIGIR TODOS OS TIPOS. Tipo duplo e a regra, entao a maioria
     do elenco some de todas as rotas — e some em silencio: o bioma continua
     abrindo, so que com menos gente dentro. */
  { id:'S527', arquivo:BIOMA, nome:'o bioma exige TODOS os tipos em vez de pelo menos um',
    real:'"quem e de agua E voador mora na praia" — e quem e so de agua?',
    /* REALOCADO no bloco 1.4. O comportamento saiu de `especiesDoBioma` para
       `moraEm` quando a regra de moradia ficou mais estrita — e a regra do
       projeto é clara: âncora perdida se REALVE para onde o comportamento mora
       hoje, nunca se apaga. O defeito continua sendo o mesmo: exigir TODOS os
       tipos em vez do principal, o que expulsa a maioria do elenco. */
    de:'export const moraEm = (e, tipos) => tipos.has((e.t ?? [])[0]) || (e.t ?? []).filter(t => tipos.has(t)).length >= 2;',
    para:'export const moraEm = (e, tipos) => (e.t ?? []).every(t => tipos.has(t));' },

  /* EVOLUIR PASSA A EMPURRAR OS OCULTOS PARA CIMA. E a quebra economica: quem
     compra um filhote bom recebe um sorteio que nao viu acontecer, e o preco de
     tudo que ja foi vendido deixa de ter explicacao. */
  { id:'S528', arquivo:EVO, nome:'evoluir melhora os ocultos em vez de preserva-los',
    real:'"evoluir e ficar mais forte" — mais forte pela ESPECIE, nunca pelo sorteio',
    de:'  return { ...inst, especie: aresta.para };',
    para:'  return { ...inst, especie: aresta.para, iv: inst.iv.map(v => Math.min(31, v + 5)) };' },

  /* A CONDICAO DE NIVEL ERRA POR UM. A evolucao acontece um nivel depois do que
     o material de origem manda, em toda a dex, e ninguem percebe sem conferir
     linha a linha. */
  { id:'S529', arquivo:EVO, nome:'a evolucao por nivel exige passar do nivel',
    real:'"evolui NO nivel 16" — >= e no, > e depois',
    de:'  nivel:   (inst, alvo) => (inst?.nivel ?? 0) >= alvo,',
    para:'  nivel:   (inst, alvo) => (inst?.nivel ?? 0) > alvo,' },

  /* `exige` VIRA DISJUNCAO. Uma evolucao que pede nivel E item passa a acontecer
     so com o nivel — e a raridade do item, que e o que da preco a linha, some. */
  { id:'S530', arquivo:EVO, nome:'a exigencia passa a bastar UMA condicao',
    real:'"as condicoes estao todas ali" — estar ali nao e ter de valer',
    de:'      .every(([k, v]) => CONDICOES[k](inst, v, ctx));',
    para:'      .some(([k, v]) => CONDICOES[k](inst, v, ctx));' },

  /* A CHAVE DESCONHECIDA PASSA A SER IGNORADA. `vinculoo` no dado vira evolucao
     de graca, porque uma conjuncao vazia e verdadeira. */
  { id:'S531', arquivo:EVO, nome:'exigencia que o motor nao conhece deixa de barrar',
    real:'"o que ele nao conhece ele nao checa" — nao checar e liberar',
    de:'    if (exigenciasDesconhecidas(e.exige).length) return false;',
    para:'' },

  /* ── BLOCO 1.1, A METADE DO SERVIDOR ────────────────────────────────────
     Os cinco primeiros mentem sobre a criatura; os tres ultimos tiram a rede
     que o BANCO estica. A diferenca importa: os primeiros dependem de o codigo
     estar certo, e os ultimos valem mesmo quando ele nao esta. */

  /* A GUARDA DE DEX SOME. Passa a nascer criatura de qualquer numero — os cinco
     lendarios inclusive, que sao bosses de raid e nao podem ser capturados. */
  { id:'S532', arquivo:CRIAT, nome:'gera-se criatura de dex que o pack nao tem',
    real:'"o dex vem da tela, e a tela so mostra o que existe" — vem do CLIENTE',
    de:"  if (!existe) throw new Error(`dex ${dex} não existe no pack ${pack.id}`);",
    para:'' },

  /* A AUDITORIA PASSA A COMPARAR O TAMANHO, E NAO O CONTEUDO. Ela aprova tudo,
     e continua respondendo `confere: true` com a mesma cara de sempre — o pior
     tipo de portao: o que existe e nao mede. */
  { id:'S533', arquivo:CRIAT, nome:'conferir() compara o tamanho dos ocultos, nao os valores',
    real:'"seis contra seis, esta conferido" — seis SEMPRE sao seis',
    de:"    confere: esperado.join(',') === gravado.join(','),",
    para:'    confere: esperado.length === gravado.length,' },

  /* O UPDATE DE EVOLUIR DEIXA DE TOCAR SO NO `dex`. E a quebra economica pela
     porta do banco: o potencial muda na venda sem ninguem decidir que mudaria. */
  { id:'S534', arquivo:CRIAT, nome:'evoluir mexe nos ocultos junto com a especie',
    real:'"e um UPDATE so" — um UPDATE so pode escrever em quantas colunas quiser',
    de:'  db.prepare(`UPDATE criaturas SET dex = ? WHERE id = ?`).run(disponiveis[0].para, id);',
    para:'  db.prepare(`UPDATE criaturas SET dex = ?, o_atq = 31 WHERE id = ?`).run(disponiveis[0].para, id);' },

  /* O DESTINO DO CLIENTE DEIXA DE SER VALIDADO. "Escolher o ramo" vira
     "escolher a especie", e a linha evolutiva inteira deixa de valer. */
  { id:'S535', arquivo:CRIAT, nome:'o ramo escolhido pelo cliente entra sem conferencia',
    real:'"o cliente so escolhe entre os que existem" — o cliente escolhe o que quiser',
    de:"  const aresta = evolucoesDisponiveis(pack, atual, { itens }).find(e => e.para === destino);",
    para:'  const aresta = { de: atual.especie, para: destino };' },

  /* A RAMIFICACAO PASSA A SER RESOLVIDA PELO SERVIDOR. Ele escolhe o primeiro,
     e a escolha que era do jogador — e que decide o valor da criatura dele —
     acontece sem ele. */
  { id:'S536', arquivo:CRIAT, nome:'o servidor escolhe sozinho quando a linha ramifica',
    real:'"tem tres, pega o primeiro" — qual dos tres e problema de quem e dono',
    de:"  if (disponiveis.length > 1) throw new Error('a linha ramifica — o destino tem de ser escolhido');",
    para:'' },

  /* O POTENCIAL VIRA COLUNA. Passa a existir um estado em que ele e os ocultos
     DISCORDAM — e esse estado e a fraude inteira, num UPDATE de uma linha. */
  { id:'S537', arquivo:SRVDB, nome:'o potencial vira coluna do banco',
    real:'"e so cache, poupa a conta" — cache que ninguem invalida e outra verdade',
    de:'          nivel         INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1),',
    para:'          nivel         INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1),\n          potencial     INTEGER,' },

  /* O CHECK DO OCULTO SOME. A ultima linha de defesa volta a ser o codigo de
     aplicacao — que e exatamente quem o CHECK existe para nao depender. */
  { id:'S538', arquivo:SRVDB, nome:'o banco volta a aceitar oculto fora de 0..31',
    real:'"o motor nunca gera fora da faixa" — o motor nao e quem escreve no banco',
    de:'          o_atq         INTEGER NOT NULL CHECK (o_atq BETWEEN 0 AND 31),',
    para:'          o_atq         INTEGER NOT NULL,' },

  /* `mercado` ENTRA NA LISTA DE ORIGENS ANTES DO CHECKPOINT DO §25.1. E o modo
     como uma feature de valor economico real nasce por acidente: um INSERT que
     alguem escreveu antes da hora, e nada recusando. */
  { id:'S539', arquivo:SRVDB, nome:'a origem mercado entra antes do checkpoint do §25.1',
    real:'"vai precisar mesmo, ja deixa" — §25.1 e checkpoint, nao formalidade',
    de:"          origem        TEXT NOT NULL CHECK (origem IN ('captura','inicial','raid')),",
    para:"          origem        TEXT NOT NULL CHECK (origem IN ('captura','inicial','raid','mercado'))," },

  /* ── BLOCO 1.2a · A EXPEDICAO ───────────────────────────────────────────
     Dois destes sao os mais caros do bloco: o S540 apaga setenta especies do
     jogo sem erro nenhum aparecer, e o S542 abre a porta do pay-to-win. */

  /* O SORTEIO PASSA A OLHAR O ELENCO DA ARENA. Caterpie, Weedle, Paras e
     Bellsprout somem do jogo inteiro — 70 especies que so existem no idle e na
     Torre. Nada quebra: as expedicoes continuam voltando cheias. */
  { id:'S540', arquivo:EXPED, nome:'o encontro passa a sortear so o elenco da Arena',
    real:'"elenco e elenco" — a regra dos 76 e da Arena e so dela',
    /* REALVADO no 1.10: a leitura do elenco virou `elencoDoEstagio`, num lugar
       so, quando o portao apontou que a linha antiga passara a aparecer duas
       vezes — no sorteio e na previa. A ancora acompanhou o comportamento. */
    de:'  (elenco ?? elencoDoBioma(pack, bioma)).filter(e => cabeNoEstagio(e.raridade, estagio));',
    para:'  (elenco ?? elencoDoBioma(pack, bioma)).filter(e => (pack.elenco ?? []).includes(e.dex));' },

  /* O TETO DIARIO GANHA UM PARAMETRO. E a porta do pay-to-win: a loja da L-066
     passa a poder vender teto, e num jogo onde o farm e vendavel isso e
     dinheiro comprando dinheiro. */
  { id:'S542', arquivo:EXPED, nome:'o teto diario passa a aceitar override do estado',
    real:'"e so para o VIP" — §P5 nao tem excecao de VIP',
    /* REALVADO no 1.6a: o teto passou a contar ENCONTROS, e a guarda mudou de
       linha. O veneno e o mesmo — o limite vindo de FORA — e continua sendo o
       unico jeito de abrir a porta que o §P5 tranca. */
    de:'  if (!cabeExpedicao(estado, perfil))',
    para:'  if (comprometido(estado) + maximoDo(perfil) > (estado.teto ?? TETO_ENCONTROS))' },

  /* A STAMINA DEIXA DE SATURAR. Quem some por uma semana volta com estoque para
     queimar o teto diario de uma vez, todos os dias. */
  { id:'S541', arquivo:EXPED, nome:'a stamina passa a acumular acima do teto',
    real:'"acumular e justo com quem some" — e o teto diario que deixa de valer',
    de:'  return Math.min(STAMINA_MAX, base + horas * REGEN_POR_HORA);',
    para:'  return base + horas * REGEN_POR_HORA;' },

  /* UM MEMBRO CANSADO DEIXA DE REPROVAR A EQUIPE. A stamina vira sugestao:
     basta por o cansado no meio de dois descansados. */
  { id:'S543', arquivo:EXPED, nome:'a equipe passa com um membro sem stamina',
    real:'"a maioria tinha" — a expedicao leva os tres, e nao a maioria',
    de:'  return { pode: semStamina.length === 0, semStamina, custo: p.custo };',
    para:'  return { pode: semStamina.length < equipe.length, semStamina, custo: p.custo };' },

  /* O CUSTO VIRA POR EXPEDICAO. A equipe cheia sai de graca, e mandar tres
     deixa de ser decisao — que e decisao nenhuma. */
  { id:'S544', arquivo:EXPED, nome:'o custo passa a ser por expedicao, nao por criatura',
    real:'"e uma expedicao so" — sao tres criaturas cansando',
    de:'export const custoDe = (perfil, tamanho) => (PERFIS[perfil]?.custo ?? 0) * tamanho;',
    para:'export const custoDe = (perfil) => (PERFIS[perfil]?.custo ?? 0);' },

  /* O VIES PERDE O INDICE DA FAIXA. Ele passa a deslocar todas as faixas
     igualmente, entao a proporcao entre elas NAO MUDA — a Vigilia deixa de
     cacar raro e escolher a duracao volta a ser clicar no maior. */
  { id:'S545', arquivo:EXPED, nome:'o vies desloca todas as faixas igualmente',
    real:'"o vies esta aplicado" — aplicado igual em todas nao muda proporcao',
    de:'  return base * Math.pow(FATOR_VIES, i * vies);',
    para:'  return base * Math.pow(FATOR_VIES, vies);' },

  /* A EXPEDICAO FICA PRONTA UM MILISSEGUNDO DEPOIS. Erro por um no relogio —
     invisivel em qualquer tela, e o tipo de coisa que so teste pega. */
  { id:'S546', arquivo:EXPED, nome:'a expedicao exige passar da hora para ficar pronta',
    real:'"terminou quando passou" — terminou quando CHEGOU',
    de:'export const pronta = (exp, agora) => agora >= exp.terminaEm;',
    para:'export const pronta = (exp, agora) => agora > exp.terminaEm;' },

  /* ── BLOCO 1.2b · A CAPTURA ─────────────────────────────────────────────
     Os dois primeiros sao da familia do §28: nenhum quebra o jogo, os dois
     ligam progressao de colecao a dinheiro. E a classe de defeito que o
     checkpoint do §25.1 vai procurar primeiro. */

  /* A CHANCE PASSA A OLHAR SE O JOGADOR APOSTOU. Quem aposta captura melhor —
     e colecionar passa a ter um motivo para apostar que nao e apostar. */
  { id:'S547', arquivo:CAPT, nome:'a chance de captura passa a premiar quem apostou',
    real:'"e so um bonusinho de engajamento" — §28 nao tem bonusinho',
    de:'export function chanceDe(pack, { raridade, bola }) {',
    para:'export function chanceDe(pack, { raridade, bola, apostou = false }) {\n  if (apostou) return Math.min(TETO_CAPTURA, baseDaRaridade(pack, raridade) * (bolaDe(pack, bola)?.mult ?? 0) * 1.5);' },

  /* O BONUS DA ARENA PASSA A VALER PARA TODO MUNDO. A especie apostada deixa
     de ser a apostada, e o bonus vira ruido — pior: some a razao de escolher. */
  { id:'S553', arquivo:CAPT, nome:'o bonus da arena pesa todas as especies',
    real:'"o bonus esta aplicado" — aplicado em todos nao distingue ninguem',
    de:'  return bonus.dex === dex ? peso * PESO_APOSTADA : peso;',
    para:'  return peso * PESO_APOSTADA;' },

  /* O TETO SOME. Comum com bola ultra vira 99%, e a sorte sai da conta — o
     farm vira planilha, que e exatamente o que o teto existe para impedir. */
  { id:'S548', arquivo:CAPT, nome:'a chance de captura perde o teto de 85%',
    real:'"ninguem chega perto do teto mesmo" — comum com ultra da 99%',
    de:'  return Math.min(TETO_CAPTURA, base * b.mult);',
    para:'  return base * b.mult;' },

  /* BOLA DESCONHECIDA VIRA MULTIPLICADOR NEUTRO. Passa a capturar com uma bola
     que nao existe — captura sem consumir nada, que e criatura de graca. */
  { id:'S549', arquivo:CAPT, nome:'bola inexistente passa a funcionar como poke',
    real:'"o padrao razoavel e 1" — o padrao razoavel para dado errado e ZERO',
    de:'  if (!base || !b) return 0;',
    para:'  if (!base) return 0;\n  if (!b) return Math.min(TETO_CAPTURA, base);' },

  /* A BOLA VOLTA PARA A BOLSA QUANDO A CAPTURA FALHA. O lance deixa de ter
     custo, e escolher a bola deixa de ser decisao: usa-se a melhor sempre. */
  { id:'S550', arquivo:CAPT, nome:'a bola so e consumida quando a captura da certo',
    real:'"nao pegou, nao gastou" — o consumo E o custo do lance',
    de:'    consumiu: true,',
    para:'    consumiu: sorteio < chance,' },

  /* O FRAGMENTO DE POKEDEX PASSA A CAIR SO NA CAPTURA. Com o teto em 85%, a
     falha volta a nao dar NADA — e o farm vira frustracao pura. */
  { id:'S551', arquivo:CAPT, nome:'o fragmento de registro passa a exigir a captura',
    real:'"fragmento e premio de captura" — ele e premio de ENCONTRO',
    de:'    fragmentos: FRAGMENTOS_POR_ENCONTRO,',
    para:'    fragmentos: sorteio < chance ? FRAGMENTOS_POR_ENCONTRO : 0,' },

  /* O BONUS NAO EXPIRA NO INSTANTE MARCADO. Erro por um no relogio: invisivel
     em qualquer tela, e o tipo de coisa que so teste pega. */
  { id:'S552', arquivo:CAPT, nome:'o bonus da arena vive um instante a mais',
    real:'"vale ate a hora marcada" — ate a hora marcada e ANTES dela',
    de:'  !!bonus && agora < (bonus.ate ?? 0);',
    para:'  !!bonus && agora <= (bonus.ate ?? 0);' },

  /* A BARRA DO POKEDEX PASSA DE CHEIA. Numero que a tela nao sabe desenhar, e
     que so aparece meses depois, no jogador que farmou demais. */
  /* A CHANCE PASSA A SAIR DA COLUNA ERRADA DA FAIXA. Indice 1 e o TETO DE FORCA
     (340, 420, 490...) e nao a chance; multiplicado pela bola e cortado pelo
     teto, TUDO passa a capturar em 85%. A raridade some do jogo, e nada quebra:
     as capturas continuam acontecendo, so que todas.
     E o preco de por quatro campos numa linha so — vale a pena, e por isso o
     defeito existe. */
  { id:'S555', arquivo:CAPT, nome:'a chance de captura sai do teto de forca da faixa',
    real:'"e a coluna da faixa" — e a coluna 2, e nao a 1',
    de:'export const baseDaRaridade = (pack, id) => faixa(pack, id)?.[2] ?? 0;',
    para:'export const baseDaRaridade = (pack, id) => faixa(pack, id)?.[1] ?? 0;' },

  { id:'S554', arquivo:CAPT, nome:'a barra do registro passa de 100%',
    real:'"e so uma divisao" — divisao sem teto nao para em cheia',
    de:'  return Math.min(1, Math.max(0, quantos) / alvo);',
    para:'  return Math.max(0, quantos) / alvo;' },

  /* ── BLOCO 1.2c · OS DROPS ──────────────────────────────────────────────
     Nenhum destes quebra o jogo. Todos deixam a expedicao voltando cheia e
     mudam o que ela significa — que e a assinatura desta fase inteira. */

  /* O PESO DA CLASSE IMPOSSIVEL DEIXA DE SER REDISTRIBUIDO. Os cinco biomas
     sem pedra passam a render MENOS por um motivo que nenhuma tela explica, e
     o jogador aprende a evita-los sem nunca saber por que. */
  { id:'S556', arquivo:DROPS, nome:'bioma sem pedra passa a render menos',
    real:'"nao tem pedra, nao cai pedra" — nao pode cair NADA no lugar dela',
    de:'  const fator = cheio / total;',
    para:'  const fator = 1;' },

  /* A ORDEM DAS BOLAS PASSA A SER A ORDEM ESCRITA. No dia em que alguem
     reordenar a lista do pack, a bola BOA cai no lugar da barata — e a
     escassez que faz a escolha existir vai embora. */
  { id:'S557', arquivo:DROPS, nome:'a ordem das bolas passa a ser a ordem escrita no pack',
    real:'"ja estao em ordem" — estao hoje, e ninguem garante amanha',
    de:'  [...(pack?.bolas ?? [])].sort((a, b) => a.mult - b.mult);',
    para:'  [...(pack?.bolas ?? [])];' },

  /* A PEDRA DEIXA DE SER DO BIOMA. Todo bioma passa a dar a mesma pedra, e
     escolher a rota vira escolher a cor do fundo. */
  { id:'S558', arquivo:DROPS, nome:'a pedra deixa de depender do bioma',
    real:'"pedra e pedra" — a fonte e o que da endereco no mapa a evolucao',
    de:"  (pack?.itens ?? []).filter(i => i.fonte === bioma && !i.nosso);",
    para:"  (pack?.itens ?? []).filter(i => !i.nosso);" },

  /* O ELO DEIXA DE EXIGIR A MARCA DE AUTORIA. Toda pedra passa a cair tambem
     no peso do elo, que e um decimo — e a pedra fica mais rara sem motivo. */
  { id:'S559', arquivo:DROPS, nome:'toda pedra passa a contar como elo',
    real:'"e um item do bioma" — o elo tem peso proprio porque e outro item',
    de:"  (pack?.itens ?? []).filter(i => i.fonte === bioma && i.nosso);",
    para:"  (pack?.itens ?? []).filter(i => i.fonte === bioma);" },

  /* A EXPEDICAO PASSA A RENDER UM ITEM SO. A bola some, a captura para, e a
     expedicao continua voltando — com uma linha de saque. */
  { id:'S560', arquivo:DROPS, nome:'toda expedicao rende um item so',
    real:'"um item ja e um saque" — o saque e o que paga as bolas do dia',
    de:'  const quantos = quantosItens(rnd, perfil);',
    para:'  const quantos = 1;' },

  /* A ESSENCIA CAI SEMPRE NA MESMA QUANTIDADE. Moeda sem textura, e o tipo de
     coisa que ninguem nota e que deixa o saque com cara de planilha. */
  { id:'S561', arquivo:DROPS, nome:'a essencia passa a cair sempre no minimo',
    real:'"a faixa esta declarada" — declarada e usada sao coisas diferentes',
    de:'      item.quantidade = Math.max(1, Math.round(bruto * (Number(focoMaterial) || 1)));',
    para:'      item.quantidade = min;' },

  /* O AGRUPAMENTO PASSA A SER POR CLASSE. A Poke Ball e a Ultra Ball viram uma
     linha so: a soma continua certa e a bolsa fica errada. */
  { id:'S562', arquivo:DROPS, nome:'o saque agrupa por classe em vez de por id',
    real:'"e tudo bola" — a bola boa e a barata nao sao a mesma coisa',
    de:"    const chave = i.classe === 'essencia' ? 'essencia' : `${i.classe}:${i.id}`;",
    para:'    const chave = i.classe;' },

  /* A BOLA BOA DEIXA DE SER RARA. Guardar a boa para o raro para de ser
     decisao, porque guardar so e decisao quando falta. */
  { id:'S563', arquivo:DROPS, nome:'a bola boa cai tanto quanto a barata',
    real:'"todas sao bolas" — a escassez da boa E a mecanica',
    de:"  { classe: 'bolaBoa',    peso:  3 },",
    para:"  { classe: 'bolaBoa',    peso: 34 }," },

  /* ── BLOCO 1.2d · O SERVIDOR DO IDLE ────────────────────────────────────
     Os tres primeiros custam dinheiro de verdade: saque dobrado, bola de graca
     e criatura de graca. Nenhum deles quebra o jogo. */

  /* A COLHEITA DEIXA DE SER IDEMPOTENTE. Dois cliques, dois requests em voo ou
     uma reconexao no meio dobram o saque — e a expedicao continua parecendo
     uma expedicao. */
  { id:'S564', arquivo:IDLE, nome:'a colheita deixa de decidir o vencedor no banco',
    real:'"eu confiro antes se ja foi colhida" — entre conferir e escrever cabe outra',
    de:'                           WHERE id = ? AND colhida_em IS NULL`)',
    para:'                           WHERE id = ?`)' },

  /* A GUARDA DO DEBITO SAI DA CLAUSULA. A bolsa passa a depender do CHECK
     explodir depois, em vez de a operacao simplesmente nao acontecer. */
  { id:'S565', arquivo:IDLE, nome:'o debito da bolsa perde a guarda de saldo',
    real:'"o CHECK pega" — pegar com excecao e diferente de recusar',
    de:'                         WHERE user_id = ? AND item_id = ? AND quantidade >= ?`)',
    para:'                         WHERE user_id = ? AND item_id = ?`)' },

  /* A BOLA VOLTA A SER COBRADA SO NA CAPTURA. Falhar deixa de custar, e
     escolher a bola vira reflexo em vez de decisao. */
  { id:'S566', arquivo:IDLE, nome:'a bola so e cobrada quando a captura da certo',
    real:'"nao pegou, nao gastou" — o consumo E o custo do lance',
    de:"  if (!debitarBolsa(db, userId, bola, 1))\n    throw new Error(`não há ${bola} na bolsa`);",
    para:"  if (quantosNaBolsa(db, userId, bola) < 1)\n    throw new Error(`não há ${bola} na bolsa`);" },

  /* A STAMINA DEIXA DE SER DEBITADA. O teto do farm passa a ser so o teto
     diario, e a colecao — que era a razao de colecionar — vira enfeite. */
  { id:'S567', arquivo:IDLE, nome:'a expedicao deixa de gastar stamina',
    real:'"a expedicao ja foi conferida" — conferir nao e cobrar',
    de:"      db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`)\n        .run(Math.round(restante), agora, c.id);",
    para:'      void restante;' },

  /* A JANELA DE 24 H SOME. O teto diario passa a ser teto PARA SEMPRE: quem
     completou quatro expedicoes nunca mais joga. */
  /* REALVADO no 1.6a: a consulta do teto virou a de ENCONTROS, e a antiga
     continua existindo para outras contas — o WHERE ficou ambiguo, casando duas
     vezes. A ancora passa a citar a linha do SUM, que e a que o teto usa. */
  { id:'S568', arquivo:IDLE, nome:'o teto diario deixa de ter janela e vira teto para sempre',
    real:'"conta os encontros" — conta os encontros DE HOJE',
    de: 'SUM(encontros), 0) AS n FROM expedicoes\n' +
        '               WHERE user_id = ? AND colhida_em IS NOT NULL AND colhida_em > ?`)\n' +
        '    .get(userId, agora - DIA_MS).n;',
    para: 'SUM(encontros), 0) AS n FROM expedicoes\n' +
          '               WHERE user_id = ? AND colhida_em IS NOT NULL`)\n' +
          '    .get(userId).n;' },

  /* A EQUIPE DEIXA DE SER CONFERIDA CONTRA O DONO. Mandar o id da criatura de
     outro jogador passa a funcionar — e num jogo onde criatura e vendavel isso
     nao e trapaca, e dinheiro. */
  { id:'S569', arquivo:IDLE, nome:'a equipe aceita criatura de outro jogador',
    real:'"o id veio da tela dele" — o id vem do CLIENTE',
    de:'  const q = db.prepare(`SELECT id, stamina, stamina_em FROM criaturas\n                          WHERE user_id = ? AND id = ?`);\n  return ids.map(id => {\n    const l = q.get(userId, id);',
    para:'  const q = db.prepare(`SELECT id, stamina, stamina_em FROM criaturas\n                          WHERE id = ?`);\n  return ids.map(id => {\n    const l = q.get(id);' },

  /* O POKEDEX PASSA A SOBRESCREVER EM VEZ DE SOMAR. A ficha nunca completa, e o
     jogador farma para sempre sem nunca chegar. */
  { id:'S572', arquivo:IDLE, nome:'o registro sobrescreve os fragmentos em vez de somar',
    real:'"o UPSERT atualiza" — atualizar nao e acumular',
    de:'    DO UPDATE SET fragmentos = fragmentos + excluded.fragmentos, visto_em = excluded.visto_em`)',
    para:'    DO UPDATE SET fragmentos = excluded.fragmentos, visto_em = excluded.visto_em`)' },

  /* O CHECK QUE AMARRA SEMENTE E COLHEITA SOME. Volta a ser possivel gravar a
     semente antes da colheita — e o resultado passa a existir horas antes de o
     jogador colher, com janela para cancelar a expedicao ruim. */
  { id:'S570', arquivo:SRVDB, nome:'a semente do saque pode voltar a existir antes da colheita',
    real:'"o codigo so grava junto" — o CHECK existe para nao depender do codigo',
    de:'          CHECK ((colhida_em IS NULL) = (semente IS NULL))',
    para:'          CHECK (1 = 1)' },

  /* O CHECK DE NAO NEGATIVO DA BOLSA SOME. Bolsa negativa e bola de graca, e
     bola de graca e criatura de graca. */
  { id:'S571', arquivo:SRVDB, nome:'a bolsa volta a poder ficar negativa',
    real:'"o debito ja confere" — o CHECK e a ULTIMA defesa, nao a primeira',
    de:'          quantidade INTEGER NOT NULL CHECK (quantidade >= 0),',
    para:'          quantidade INTEGER NOT NULL,' },

  /* ── BLOCO 1.3a · O MUNDO DESENHADO ─────────────────────────────────────
     Nenhum destes derruba a tela. Todos deixam o cenario abrindo, e tiram
     dele a coisa que faz um lugar ser um lugar. */

  /* A SEMENTE PASSA A VIR DO RELOGIO. O bioma se redesenha a cada abertura, e
     deixa de ser um LUGAR — escolher a rota vira trocar a cor do fundo. */
  { id:'S573', arquivo:MUNDO, nome:'o cenario passa a mudar a cada abertura',
    real:'"variar e mais bonito" — variar entre visitas apaga a nocao de lugar',
    de:'  let sd = [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 31, 11) >>> 0;',
    para:'  let sd = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;' },

  /* OS DETALHES PASSAM A CAIR NO CAMINHO. O chao pisado deixa de ser limpo, e
     o caminho — que e a leitura de por onde se anda — some no ruido. */
  { id:'S574', arquivo:MUNDO, nome:'o detalhe cai em cima do caminho',
    real:'"e so um pixel" — o caminho e o unico lugar que a cena promete limpo',
    /* REALVADO no 1.15: a trilha passou a curvar, e a guarda deixou de
       comparar com o EIXO para consultar a linha daquela coluna. O defeito e
       o mesmo — o detalhe cair no unico lugar que a cena promete limpo. */
    de:'    if (pisado(lx, ly)) continue;',
    para:'' },

  /* A AGUA VOLTA A COMER UM TERCO DA CENA. O terreno que importa e aquele em
     que o personagem anda, e ele encolhe pela metade. */
  { id:'S575', arquivo:MUNDO, nome:'a agua volta a comer a cena',
    real:'"mar grande e bonito" — bonito e o chao em que se joga',
    de:'  const margem = rows - 2;',
    para:'  const margem = rows - 4;' },

  /* A PALETA DE RESERVA SOME. Um id de bioma errado passa a derrubar a aba
     inteira — e id errado e a coisa mais facil de acontecer quando o pack
     troca. */
  { id:'S576', arquivo:MUNDO, nome:'bioma desconhecido derruba a tela em vez de cair na reserva',
    real:'"o id sempre existe" — o id vem do pack, e pack se troca',
    de:'export const paletaDe = (pack, id) => biomaDe(pack, id)?.paleta ?? PALETA_RESERVA;',
    para:'export const paletaDe = (pack, id) => biomaDe(pack, id).paleta;' },

  /* O CAMINHO ENCOSTA NA AGUA. O jogador andaria dentro do mar, e a cena
     continuaria desenhando sem reclamar de nada. */
  { id:'S577', arquivo:MUNDO, nome:'o caminho encosta na agua',
    real:'"o caminho fica no meio" — no meio de uma cena que encolheu e no mar',
    de:'  const caminho = Math.max(1, Math.min(margem - 3, Math.round(rows * 0.6) - 1));',
    para:'  const caminho = Math.max(1, Math.round(rows * 0.6) - 1);' },

  /* A CAMERA SE AFASTA DE NOVO. Foi o que o dono viu e reclamou: "o pixel do
     boneco fica MUITO pequeno". O problema nunca foi o boneco. */
  /* REALVADO no 1.5c. O mundo cresceu POR DECISÃO do dono — mundo vivo precisa
     de lugar para vagar — então o defeito deixou de ser "a câmera se afastou".
     Ele virou o inverso: alguém ENCOLHER a grade de volta ao tamanho do
     cartucho, e o boneco não ter mais para onde ir. O defeito não foi apagado;
     o que mudou foi qual lado é o perigoso. */
  { id:'S578', arquivo:MUNDO, nome:'a grade encolhe e a caminhada vira tremor',
    real:'"a tela do cartucho era 15x10" — e com 10 fileiras nao ha para onde vagar',
    de:'export const COLS_PADRAO = 44, ROWS_PADRAO = 28;',
    para:'export const COLS_PADRAO = 15, ROWS_PADRAO = 10;' },

  /* UM BIOMA PERDE A PALETA. Ele abre com a cor de reserva e fica parecido com
     outro — o jogador nao ve um defeito, ve um lugar sem personalidade, que e
     pior porque ninguem reporta. */
  { id:'S579', arquivo:PACK, nome:'um bioma perde a paleta e cai na reserva',
    real:'"cinza tambem e cor" — cinza e o aviso de que faltou cor',
    de:"    detalhe:90, paleta:{ base:'#5c5a5e'",
    para:"    detalhe:90, paletaX:{ base:'#5c5a5e'" },

  /* ── BLOCO 1.3b · O ESTADO DO IDLE NO NAVEGADOR ─────────────────────────
     No navegador o estado esta a um F12 de distancia, entao cada um destes
     custa mais do que custaria no servidor. */

  /* A SEMENTE NASCE COM A EXPEDICAO. O resultado fica horas no localStorage
     antes de o jogador colher — e quem o ler pode cancelar a expedicao ruim. */
  { id:'S580', arquivo:IDADOS, nome:'a semente do saque volta a nascer no inicio',
    real:'"ja sorteia logo" — sorteado antes e sorteado a vista de quem abrir o F12',
    de:'    colhidaEm: null, semente: null,',
    para:'    colhidaEm: null, semente: String(novaRaiz()),' },

  /* A GUARDA DE COLHEITA DUPLA SOME. Dois cliques dobram o saque, e a expedicao
     continua parecendo uma expedicao. */
  { id:'S581', arquivo:IDCOLH, nome:'colher duas vezes volta a dobrar o saque',
    real:'"a tela some com o botao" — a tela nao e a guarda',
    de:"  if (x.colhidaEm) throw new Error('esta expedição já foi colhida');",
    para:'' },

  /* A BOLSA VOLTA A PODER FICAR NEGATIVA. Bola de graca, criatura de graca. */
  { id:'S582', arquivo:IBOLSA, nome:'a bolsa perde a guarda de saldo',
    real:'"quem chama ja confere" — quem chama muda, a guarda fica',
    de:'  if ((e.bolsa[item] ?? 0) < quantos) return false;',
    para:'' },

  /* A LEITURA DEIXA DE CONSERTAR QUANTIDADE INVALIDA. Um numero negativo
     editado a mao no localStorage sobrevive e vira bola infinita. */
  { id:'S583', arquivo:IDADOS, nome:'quantidade invalida na bolsa sobrevive a leitura',
    real:'"o codigo nunca grava negativo" — o codigo nao e o unico que grava',
    de:'    if (!(n >= 0)) { e.bolsa[k] = 0; problemas.push(`a bolsa tinha "${k}" inválido`); }',
    para:'    if (false) { }' },

  /* A INICIAL PASSA A PODER SER ESCOLHIDA DE NOVO. O jogo paga varias vezes
     por uma decisao que se toma uma vez — e cada F5 vira uma criatura. */
  { id:'S584', arquivo:IDADOS, nome:'a criatura inicial pode ser escolhida de novo',
    real:'"a tela so mostra uma vez" — a tela nao e a guarda',
    de:"  if (e.criaturas.length)\n    throw new Error('a criatura inicial só se escolhe uma vez');",
    para:'' },

  /* QUALQUER DEX VIRA INICIAL. Comeca-se o jogo com a criatura mais forte do
     pack, e o mercado inteiro nasce sem sentido. */
  { id:'S585', arquivo:IDADOS, nome:'qualquer especie pode ser a inicial',
    real:'"a tela so oferece as tres" — o argumento vem de fora da tela',
    de:'  if (!(pack?.iniciais ?? []).includes(dex))',
    para:'  if (false)' },

  /* A STAMINA DEIXA DE SER DEBITADA. O teto do farm passa a ser so o diario, e
     a colecao — que era a razao de colecionar — vira enfeite. */
  { id:'S586', arquivo:IDADOS, nome:'a expedicao local deixa de gastar stamina',
    real:'"ja foi conferida" — conferir nao e cobrar',
    de:'    c.stamina = Math.round(Math.max(0, staminaAgora(c, agora) - p.custo));',
    para:'    c.stamina = Math.round(staminaAgora(c, agora));' },

  /* A JANELA DE 24 H SOME. O teto diario vira teto para sempre: quem completou
     quatro expedicoes nunca mais joga. */
  { id:'S587', arquivo:IDADOS, nome:'o teto diario local vira teto para sempre',
    real:'"conta as concluidas" — conta as concluidas HOJE',
    de:'  e.expedicoes.filter(x => x.colhidaEm && x.colhidaEm > agora - DIA_MS).length;',
    para:'  e.expedicoes.filter(x => x.colhidaEm).length;' },

  /* JSON QUEBRADO VOLTA A DERRUBAR A ABA. Perder uma expedicao e ruim; perder a
     aba e irreversivel para quem nao sabe abrir o console. */
  { id:'S588', arquivo:IDADOS, nome:'estado ilegivel volta a derrubar a aba',
    real:'"o JSON e nosso" — o localStorage e de quem tem o navegador',
    de:"  try { cru = JSON.parse(deposito?.getItem(CHAVE) ?? 'null'); }\n  catch { problemas.push('o texto guardado não era JSON'); }",
    para:"  cru = JSON.parse(deposito?.getItem(CHAVE) ?? 'null');" },

  /* AS FAIXAS DO PACK ORIGINAL VOLTAM A SER AS DE KANTO. E o D-051: uma especie
     comum em 76, e o farm daquele pack vira loteria — com a suite verde. */
  { id:'S589', arquivo:PACKO, nome:'o pack original volta a usar as faixas do outro',
    real:'"as faixas sao as mesmas" — as DISTRIBUICOES de forca nao sao',
    de:"  ['comum',      460, 0.450,  8],",
    para:"  ['comum',      340, 0.450,  8]," },

  /* ── BLOCO 1.3c · A ABA DO IDLE ─────────────────────────────────────────
     Defeitos de TELA nao aparecem verdes nem vermelhos: eles aparecem para
     quem olha, e as vezes so meses depois. Por isso os testes desta aba leem o
     codigo em vez de abrir navegador. */

  /* A TELA PASSA A CONHECER DINHEIRO. O idle produz e a Arena consome; ligar os
     dois aqui amarra progressao de colecao a volume apostado, que e o §28. */
  { id:'S590', arquivo:ITELA, nome:'a aba do idle passa a importar a carteira',
    real:'"so para mostrar o saldo no canto" — mostrar e ligar',
    /* REALVADO no 1.6b: a linha ganhou `retratoAnimado` junto, quando a equipe
       passou a usar GIF animado (L-080). A regra não mudou uma vírgula — a aba
       do idle NÃO conhece dinheiro, e importar a carteira é o §28 entrando pela
       porta dos fundos. */
    de:"import { dexImg, retratoAnimado } from './sprites.mjs';",
    para:"import { dexImg, retratoAnimado } from './sprites.mjs';\nimport { saldo } from './banco.mjs';" },

  /* A TELA GANHA A PROPRIA TABELA DE PERFIS. Duas tabelas discordam no dia em
     que uma mudar, e a que o jogador ve e a errada. */
  /* D-054 · o defeito que apagava o contorno de todo outfit. A guarda e uma
     linha, e sem ela a chave de cor le o canto TRANSPARENTE da folha nossa,
     conclui que o fundo e (0,0,0), e apaga todo pixel preto do traje. */
  { id:'S612', arquivo:IMUNDO, nome:'a chave de cor volta a agir em folha com alfa',
    real:'"a guarda e redundante" — e ela e a unica coisa entre a folha e o contorno apagado',
    de:'if (p[3] > 8) {', para:'if (true) {' },

  { id:'S591', arquivo:IMUNDO, nome:'a aba passa a ter a propria tabela de perfis',
    real:'"e so para nao importar" — e uma segunda verdade sobre a mesma regra',
    /* REALVADO no 1.5c: o `ESC` morreu quando a tela virou câmera com zoom — a
       ampliação deixou de ser uma constante e passou a ser escolha do jogador.
       O defeito continua sendo o mesmo (a aba ter a própria tabela de perfis) e
       só mudou de linha; apagá-lo seria perder a guarda junto com a âncora. */
    de:"const CHAVE_ZOOM = 'pa.idle.zoom';",
    para:"const CHAVE_ZOOM = 'pa.idle.zoom';\nconst PERFIS = { batida:{rotulo:'Batida',minutos:45,custo:20} };" },

  /* A LARGURA DO PALCO VOLTA A SER CRAVADA EM PIXEL. Pixel fixo dentro de
     coluna fluida e rolagem horizontal garantida — e rolagem horizontal e
     defeito de LEITURA, a classe que a suite inteira nao pega. */
  { id:'S592', arquivo:IMUNDO, nome:'a cena volta a IMPOR a caixa em vez de LER',
    real:'"assim fica exato" — exato numa largura e errado em todas as outras',
    /* REALVADO duas vezes. O palco teve TETO em pixel, depois PROPORCAO
       publicada pelo JS, e agora tem proporcao no CSS mais uma ALTURA que e do
       jogador (a alca do resize). A afirmacao atravessou as tres formas sem
       mudar: a tela LE a caixa, nunca a IMPOE. Cravar de volta anula a alca e
       traz a rolagem lateral de volta junto. */
    de:"  const r = palco.getBoundingClientRect();",
    para:'  const r = { width: 960, height: 560 };' },

  /* A FASE DO PASSO VOLTA AO RELOGIO. A perna e o chao andam em ritmos
     independentes e o boneco desliza — foi o defeito que o dono viu. */
  /* REALVADO no 1.5c: a fase do passo saiu da tela e virou `quadroDe` no
     `vida.mjs`. O defeito continua sendo o mesmo — trocar a distancia pelo
     relogio faz a perna e o chao andarem em ritmos independentes, e o boneco
     desliza. So mudou de arquivo, e agora ele mora onde ha teste em Node. */
  { id:'S593', arquivo:VIDA, nome:'o passo do ator volta a sair do relogio',
    real:'"o tempo e mais simples" — mais simples e deslizando',
    de:'  const fase = Math.floor(distancia / PASSO_PX) % 4;',
    para:'  const fase = Math.floor(Date.now() / 180) % 4;' },

  /* A TELA PASSA A SORTEAR. Sorteio na tela e sorteio que o servidor nao
     reproduz, e a auditoria do §25.2 morre ali. */
  { id:'S594', arquivo:ITELA, nome:'a aba passa a sortear por conta propria',
    real:'"e so para variar a cena" — variar sem semente e variar sem auditoria',
    de:'const agora = () => Date.now();',
    para:'const agora = () => Date.now();\nconst sorteio = () => Math.random();' },

  /* A VIEW PERDE O `grid-template-areas:none`. Os cartoes caem nas tres areas
     nomeadas da Arena, lado a lado, e a pagina rola de lado. */
  /* A ANCORA GANHOU CONTEXTO no A4e: a Rota OFF nasceu com a mesma grade, e a
     linha sozinha passou a casar duas vezes. O pre-voo pegou na hora — e a
     regra dele e clara: ancora ambigua planta na primeira ocorrencia e cala
     sobre a segunda, que e um defeito avaliado no lugar errado. */
  { id:'S595', arquivo:PAGINA, nome:'a aba do idle volta a cair nas areas da Arena',
    real:'"eu ja troquei as colunas" — trocar coluna nao apaga area nomeada',
    de:'override e nunca expôs isto porque ela tem um cartão só. -->\n  <div class="app" style="grid-template-columns:min(1180px,100%);grid-template-areas:none;justify-content:center">',
    para:'override e nunca expôs isto porque ela tem um cartão só. -->\n  <div class="app" style="grid-template-columns:min(1180px,100%);justify-content:center">' },

  /* O BOTAO DO MENU SOME. A aba existe e nao ha caminho ate ela — o pior tipo
     de feature: pronta, testada, e inalcancavel. */
  { id:'S596', arquivo:PAGINA, nome:'a aba do idle perde o botao do menu',
    real:'"da para chegar pelo link" — nao ha link nenhum',
    de:'    <button class="nav" data-view="viewIdle">Rotas</button>\n',
    para:'' },

  /* O CANVAS DO ATOR PERDE O ALINHAMENTO COM O CHAO. Duas densidades de pixel
     na mesma cena — o defeito nº 1 das previas, reprovado duas vezes pelo dono. */
  { id:'S597', arquivo:PAGINA, nome:'o ator sai do alinhamento com o chao',
    real:'"esta por cima" — por cima e no MESMO tamanho sao coisas diferentes',
    de:'#idleAtor{position:absolute;inset:0;width:100%;height:100%;',
    para:'#idleAtor{position:absolute;left:0;top:0;' },

  /* ── BLOCO 1.4 · AS ROTAS POR NÍVEL ─────────────────────────────────────
     Todos deixam o idle rodando e desfazem a fidelidade que o dono pediu:
     nidoking na praia rasa, caterpie na rota de nivel 50. */

  /* O NIVEL MINIMO DEIXA DE OLHAR A LINHA EVOLUTIVA. Todo mundo passa a poder
     existir no nivel 2 — butterfree na rota rasa, dragonite na praia de
     iniciante. E a fidelidade inteira que o dono pediu, desfeita numa linha. */
  { id:'S598', arquivo:ROTAS, nome:'toda especie passa a existir desde o nivel 2',
    real:'"o nivel base e 2" — para QUEM NAO EVOLUI de ninguem',
    de:'  if (ent) v = ent.exige?.nivel ?? (nivelMinimo(pack, ent.de) + FOLGA_POR_ITEM);',
    para:'  void ent;' },

  /* QUEM JA EVOLUIU VOLTA A APARECER. Caterpie na rota de nivel 50, ao lado do
     proprio Butterfree — e a escada de niveis deixa de significar alguma coisa. */
  { id:'S599', arquivo:ROTAS, nome:'a rota alta volta a ter quem ja evoluiu',
    real:'"ele ainda existe no mundo" — nao naquela rota, ele ja virou outro',
    de:'    if (nivelDeSaida(pack, e.dex) <= lo) return false;',
    para:'' },

  /* A JANELA DE FORCA SOME DA FAIXA NATURAL. Um Lapras de 535 volta para a
     rota de nivel 2 — ele nao evolui de ninguem, entao so o teto o segurava. */
  { id:'S600', arquivo:ROTAS, nome:'o forte volta a aparecer na rota rasa',
    real:'"ele pode existir no nivel 2" — poder existir nao e pertencer ali',
    de:'    if (nm <= faixa.nivel[1] && f <= (faixa.teto ?? Infinity)) return faixa;',
    para:'    if (nm <= faixa.nivel[1]) return faixa;' },

  /* O PESO DA ASSINATURA SOME. Caverna de gelo e praia voltam a ser o mesmo
     lugar, e escolher a rota vira escolher a cor do fundo. */
  { id:'S601', arquivo:ROTAS, nome:'os biomas voltam a ser o mesmo lugar',
    real:'"o elenco e o mesmo mesmo" — o que separa e a FREQUENCIA',
    de:'  return (especie?.t ?? []).some(t => assinatura.includes(t)) ? BOOST_ASSINATURA : 1;',
    para:'  return 1;' },

  /* O NIVEL DO ENCONTRO IGNORA O MINIMO DA ESPECIE. Sai Dragonair de nivel 9,
     que e impossivel pela propria linha evolutiva dele. */
  { id:'S602', arquivo:ROTAS, nome:'o encontro sorteia nivel impossivel para a especie',
    real:'"esta dentro da faixa" — dentro da faixa e fora da vida dela',
    de:'  const piso = Math.max(lo, nivelMinimo(pack, dex));',
    para:'  const piso = lo;' },

  /* A REGRA DE MORADIA AFROUXA. Charizard volta para a praia: ele e fogo/voador
     e a praia hospeda voador — bastava um tipo bater. */
  { id:'S603', arquivo:BIOMA2, nome:'basta um tipo bater para morar no bioma',
    real:'"ele tem um tipo de la" — um tipo de la nao e ser de la',
    de:'export const moraEm = (e, tipos) => tipos.has((e.t ?? [])[0]) || (e.t ?? []).filter(t => tipos.has(t)).length >= 2;',
    para:'export const moraEm = (e, tipos) => (e.t ?? []).some(t => tipos.has(t));' },

  /* AS FAIXAS DO PACK ORIGINAL VOLTAM A SER AS DE KANTO. Cinco das seis rotas
     rasas ficam VAZIAS — o jogador escolhe e nao acontece nada. E o D-051 pela
     terceira vez, agora nas rotas. */
  { id:'S604', arquivo:PACKO, nome:'as rotas do pack original voltam a janela do outro',
    real:'"os niveis sao os mesmos" — os NIVEIS sim; a FORCA nao',
    de:"  { id: 'f1', rotulo: 'Rota rasa',   nivel: [ 2,  8], piso:   0, teto:  500 },",
    para:"  { id: 'f1', rotulo: 'Rota rasa',   nivel: [ 2,  8], piso:   0, teto:  350 }," },
/* ---------- 1.5c–1.5f: a vida do mundo do idle ---------- */

  /* O PLÂNCTON É O ÚNICO QUE NÃO PODE SAIR DE ONDE ESTÁ. Ele pulsa DENTRO da
     água; solto, vira vaga-lume azul boiando sobre a areia — e aí praia e
     floresta passam a ter a mesma vida, que é justamente o teste que o
     `particulas.mjs` aplica para aceitar um bioma. */
  { id:'S605', arquivo:PART, nome:'o plancton escapa da agua',
    real:'"e so uma particula" — e a unica que define o bioma pela posicao',
    de:'        p.y = marg + 6 + p.f * Math.max(0, alt - marg - 12);',
    para:'        p.y = p.f * alt;' },

  /* O ARCO NÃO BRILHA: ESTALA. Ficar aceso o tempo todo transforma o
     ferro-velho de perigoso em festivo, e é a ausência que faz o efeito. */
  { id:'S606', arquivo:PART, nome:'o arco eletrico passa a brilhar sempre',
    real:'"assim aparece mais" — aparece mais e deixa de ser eletricidade',
    de:"    case 'arco':     return ((t / 1000 + p.f * 7) % 3) < 0.12 ? 1 : 0;",
    para:"    case 'arco':     return 1;" },

  /* A BRASA SOBE. Descendo, ela vira chuva de fogo — e o vulcão passa a ter a
     vida do gelo com outra cor. */
  { id:'S607', arquivo:PART, nome:'a brasa desce em vez de subir',
    real:'"o sinal e detalhe" — o sinal E o comportamento',
    de:"        p.y -= p.v * 0.85 * dt;",
    para:"        p.y += p.v * 0.85 * dt;" },

  /* A GRAMA EXCLUI A TRILHA. Incluindo-a, os habitantes se enfileiram no
     caminho — e bicho parado no meio da estrada lê como obstáculo, não como
     morador. Foi o defeito que a prévia da decoração mostrou. */
  { id:'S608', arquivo:FAUNAM, nome:'os habitantes voltam a cair na trilha',
    real:'"a grama vai ate a agua" — vai, e a trilha esta no meio dela',
    de:'  grama:  pl => [Math.round(pl.rows * 0.18), Math.max(2, pl.caminho - 1)],',
    para:'  grama:  pl => [Math.round(pl.rows * 0.18), Math.max(1, pl.margem - 3)],' },

  /* CADA HABITANTE TEM FASE PRÓPRIA. Sem ela, o bioma inteiro pisca junto e
     vira letreiro — e a diferença entre um lugar e um painel de LED é
     exatamente essa. */
  { id:'S609', arquivo:FAUNAM, nome:'o bioma inteiro pisca junto',
    real:'"a fase e enfeite" — sem ela o cenario vira letreiro',
    /* REALVADO no mesmo bloco: a fase deixou de ser SORTEADA e passou a ser
       ESPALHADA pelo indice, porque sorteada ela colidia — com tres habitantes
       e tres quadros o acaso punha dois no mesmo lugar do ciclo, e o teste novo
       flagrou isso no vulcao. O defeito continua sendo o mesmo: tirar a
       separacao faz o bioma piscar junto. */
    /* REALVADO DE NOVO no 1.5j(b): a expressao subiu para antes do ramo, para
       servir tambem a quem boia no lago — e com isso a linha antiga passou a
       casar duas vezes e o pre-voo abortou, que e exatamente o trabalho dele.
       O defeito nao mudou: zerar a separacao faz o bioma piscar junto, e agora
       faz os dois moradores de lago boiarem no mesmo compasso tambem. */
    de:'    const fase = (i + mistura(semente + i * 41, 19) * 0.6) / Math.max(1, lista.length);',
    para:'    const fase = 0;' },

  /* O QUADRO DO COMPANHEIRO VEM DA DISTÂNCIA. No relógio, a pata e o chão
     andam em ritmos independentes e ele patina — é o defeito dos "pulinhos"
     do treinador, do outro lado da cena. */
  { id:'S610', arquivo:ICOMP, nome:'a pata do companheiro volta ao relogio',
    real:'"o tempo e mais simples" — mais simples e patinando',
    de:'    ? Math.floor(p.distancia / PASSO_BICHO) % colunas',
    para:'    ? Math.floor(Date.now() / 160) % colunas' },

  /* O ALINHAMENTO É PELOS PÉS, e não pelo fundo do quadro. O quadro do PMD tem
     folga embaixo — pelo fundo, o bicho flutua e a sombra fica solta lá em
     baixo, que foi o que o dono viu e apontou. */
  { id:'S611', arquivo:ICOMP, nome:'o companheiro volta a flutuar sobre a sombra',
    real:'"o quadro ja e o tamanho certo" — o quadro tem folga, o desenho nao',
    de:'    `${(p.y - cam.y) * escala - (pes.base + 1) * escala}px)`;',
    para:'    `${(p.y - cam.y) * escala - At}px)`;' },

  /* ---------- 1.5i–1.5j: a tela ajustavel e o relevo ---------- */

  /* O LAGO E O UNICO QUE BLOQUEIA, e bloquear e o que o separa de textura.
     Sem ele na lista, o treinador atravessa agua parada como se fosse grama. */
  { id:'S612b', arquivo:RELEVO, nome:'o lago deixa de bloquear o passo',
    real:'"e so decoracao" — decoracao que o personagem atravessa e textura',
    de:"    .filter(a => a.forma === 'lago')",
    para:"    .filter(a => false)" },

  /* A FOLGA existe para o pe nao ficar na agua: parar exatamente na borda le
     como afundando. */
  { id:'S613', arquivo:RELEVO, nome:'a folga do lago some e o pe fica na agua',
    real:'"a borda ja e o limite" — a borda e onde o pe encosta',
    de:'export const FOLGA_LAGO = 6;',
    para:'export const FOLGA_LAGO = 0;' },

  /* O LAGO NASCE LONGE DA BORDA para o empurrao nao jogar o treinador para
     fora da area andavel — e o limite da area traze-lo de volta para dentro. */
  { id:'S614', arquivo:RELEVO, nome:'o lago volta a nascer colado na borda',
    real:'"cabe do mesmo jeito" — cabe, e o desvio para de funcionar na beirada',
    de:'        const folga = rx + 2 * T;',
    para:'        const folga = 1;' },

  /* O TRAJETO desvia, e nao so os destinos: dois pontos fora do lago podem ter
     uma reta entre eles que atravessa a agua. */
  { id:'S615', arquivo:VIDA, nome:'o trajeto volta a cortar o lago em linha reta',
    real:'"os destinos ja estao fora" — os destinos sim; a reta entre eles nao',
    de:'      const pos = empurrarPraFora(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, bloqueios);',
    para:'      const pos = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };' },

  /* A PROPORCAO DA JANELA sai da caixa; um numero solto traz o esticado de
     volta, que foi o que o dono chamou de "esticadona". */
  { id:'S616', arquivo:'app/modules/viewport.mjs', nome:'o zoom perde o piso e a imagem estica',
    real:'"o zoom e do jogador" — e, e abaixo do piso ele estica a imagem',
    /* REALVADO no 1.5k: a conta saiu de `ajustarViewport` e virou
       `app/modules/viewport.mjs`, camada 0. Foi a extracao que tornou o defeito
       PEGAVEL — cercado de getBoundingClientRect ele passou pela suite inteira,
       porque nao havia como afirmar sobre a conta sem subir navegador. */
    de:'  const usar = Math.max(zoom || 1, piso);',
    para:'  const usar = zoom || 1;' },

  /* ---------- 1.6: a captura ao vivo, a equipe e a caixa ---------- */

  /* UM LANCE POR ENCONTRO e A diferenca nomeada do projeto frente ao material
     de origem. Encontro que sobrevive ao lance apaga a decisao inteira: com
     bolsa cheia, jogar ate pegar torna a escolha da bola irrelevante. */
  { id:'S617', arquivo:ILANCE, nome:'o encontro sobrevive ao lance',
    real:'"assim ele pode tentar de novo" — e ai a escolha da bola nao vale nada',
    de:'  e.encontros.splice(i, 1);',
    para:'  if (r.capturou) e.encontros.splice(i, 1);' },

  /* A CAIXA EXISTE PARA A CAPTURA NUNCA SER RECUSADA. Gastar a bola boa,
     acertar o raro e ouvir "nao" e o pior momento que este jogo poderia ter. */
  { id:'S618', arquivo:ILANCE, nome:'a captura com equipe cheia some com a criatura',
    real:'"a equipe esta cheia" — e por isso existe a caixa',
    de:'    criatura.naCaixa = equipeCheia(e);',
    para:'    if (equipeCheia(e)) return { ...r, dex: en.dex, criatura: null };' },

  /* A EXPEDICAO SO LEVA QUEM ESTA NA EQUIPE. Sem isso a caixa vira um segundo
     bolso sem custo, e os seis deixam de significar alguma coisa. */
  { id:'S619', arquivo:IDADOS, nome:'a expedicao passa a levar quem esta na caixa',
    real:'"e criatura do jogador do mesmo jeito" — e, e guardada',
    de:'  const guardadas = membros.filter(c => c.naCaixa);',
    para:'  const guardadas = [];' },

  /* A EQUIPE NUNCA FICA VAZIA: sem ninguem ativo nao ha expedicao possivel, e o
     jogador se tranca fora do proprio jogo sem nenhum aviso. */
  { id:'S620', arquivo:IDADOS, nome:'a equipe pode ficar vazia',
    real:'"ele que sabe o que faz" — ele nao sabe que vai se trancar',
    de:'  if (paraCaixa && naEquipe(e).length <= 1)',
    para:'  if (false)' },

  /* A SEMENTE DO LANCE SAI DA EXPEDICAO GRAVADA. Sorteada na hora, o lance
     deixa de ser reproduzivel e o §25.2 cai. */
  { id:'S621', arquivo:ILANCE, nome:'o lance passa a sortear semente nova',
    real:'"e mais simples" — e mais simples e nao auditavel',
    de:"  const raiz = semente(derivar(Number(exp?.semente ?? 1), 'lance:' + chave));",
    para:'  const raiz = semente(novaRaiz());' },

  /* ---------- 1.5j(b): quem mora dentro do lago ---------- */

  /* O MORADOR DE LAGO CAI NA GRAMA QUANDO NAO HA LAGO. E a regra do dono no
     caso dificil — "nada de Staryu no meio da floresta" —, e um `?? FAIXAS.grama`
     descuidado a quebra sem sintoma nenhum: o bicho aparece, a suite fica verde,
     e so quem olha ve um Psyduck em pe no capim. */
  { id:'S622', arquivo:FAUNAM, nome:'sem lago, o morador de agua desce para a grama',
    real:'"melhor ele aparecer do que sumir" — nao, e pior; aparece no lugar errado',
    de:'      if (!lagos.length) return;',
    para:'      if (!lagos.length) lagos = [{ x: 8 * T, y: 8 * T, rx: 2 * T, ry: T }];' },

  /* O BICHO NO CENTRO EXATO DO LAGO. Centralizado ele le como alfinete no mapa,
     e nao como morador — a mesma diferenca entre um bicho posto na cena e um
     bicho que estava la. */
  { id:'S623', arquivo:FAUNAM, nome:'o morador do lago volta ao centro exato',
    real:'"o centro e o meio da agua" — e por isso mesmo le como marcacao',
    de:'      const r = Math.sqrt(mistura(semente + i * 71, 29)) * LAGO_FOLGA;',
    para:'      const r = 0;' },

  /* A ONDA EM FASE COM O CORPO. Juntos os dois viram um pulso so e a agua some
     da leitura: e o afundar que empurra a agua para fora. Sem a contrafase o
     bicho parece PULANDO sobre a agua, que e exatamente a leitura que o dono
     reprovou quatro vezes no companheiro. */
  { id:'S624', arquivo:FAUNAM, nome:'a onda do lago entra em fase com a boia',
    real:'"os dois sao o mesmo movimento" — sao opostos, e e a oposicao que le',
    de:'    raio: ONDA_RAIO * (1 - ONDA_VARIA * s),   // e o anel no mais estreito',
    para:'    raio: ONDA_RAIO * (1 + ONDA_VARIA * s),' },

  /* ---------- T6: a bandeira que nao recusava nada ---------- */

  /* O D-059 DE VOLTA. A recusa passa a valer so quando ha `--so`, que e
     exatamente a forma antiga: `npm run rapido` volta a subir os cinco Chromium
     e a descartar o que eles mediram. O defeito nao tem sintoma — a suite fica
     verde, com a contagem certa — e por isso ele sobreviveu a quatro blocos.
     Sem esta afirmacao, a correcao e verde dos dois lados. */
  { id:'S625', arquivo:'test/bandeiras.mjs', nome:'--sem-navegador volta a nao recusar nada',
    real:'"sem --so roda tudo" — roda tudo MENOS o que a bandeira acabou de recusar',
    de:'  if (semNavegador) return false;',
    para:'  if (semNavegador && so) return false;' },

  /* ---------- 1.5L: o relevo que parece relevo ---------- */

  /* A TRINCA VOLTA A SER UM TRACEJADO. O desvio perpendicular some e a
     rachadura vira uma reta — e rachadura reta e CORTE, nao rachadura. Foi o
     olho que pegou a versao anterior desta forma, com a suite verde. */
  { id:'S626', arquivo:RELEVO, nome:'a trinca volta a ser uma reta',
    real:'"a diagonal ja basta" — basta para um corte, nao para uma rachadura',
    de:'    const desvio = Math.sin(t * 7.3 + (a.giro ?? 0) * 9) * comp * 0.11 * env;',
    para:'    const desvio = 0;' },

  /* A ESPESSURA CONSTANTE. Sem o envelope a trinca tem a mesma grossura do
     comeco ao fim, e le como risco de caneta em vez de fenda que abriu. */
  { id:'S627', arquivo:RELEVO, nome:'a trinca perde a espessura que varia',
    real:'"a linha ja aparece" — aparece, e aparece como risco desenhado',
    de:'      w: 1 + env * 2,',
    para:'      w: 2,' },

  /* A QUEDA VOLTA A SER UM CANO. Sem abertura, a coluna tem largura constante
     — e coluna de largura constante nao le como agua caindo. */
  { id:'S628', arquivo:RELEVO, nome:'a cachoeira para de abrir ao cair',
    real:'"e uma queda vertical" — e, e a agua se espalha enquanto cai',
    de:'export const VEIO_ABERTURA = 0.35;',
    para:'export const VEIO_ABERTURA = 0;' },

  /* O CEU ABERTO GANHA TETO. Escurecer floresta, praia e campo "para ficarem
     diferentes" e enfeite pelo enfeite, e o teste afirma a ausencia deles de
     proposito — a diferenca tem de vir do que o lugar E. */
  { id:'S629', arquivo:RELEVO, nome:'o ceu aberto ganha teto',
    real:'"quanto mais atmosfera melhor" — nao: floresta com teto le como noite',
    de:"  deserto:    { onde: 'chao',   de: 0.72, para: 0.44, forca: 0.20, tom: 'claro' },",
    para:"  deserto:    { onde: 'chao',   de: 0.72, para: 0.44, forca: 0.20, tom: 'claro' },\n  floresta:   { onde: 'teto',   de: 0.00, para: 0.30, forca: 0.40, tom: 'escuro' }," },

  /* A AGUA DA CACHOEIRA VOLTA A SER A MASSA DO BIOMA. Na montanha a massa e
     sombra, e a queda sai MARROM: um pilar de pedra no meio da cena. */
  { id:'S630', arquivo:'content/pokemon_kanto_v1.mjs',
    nome:'a cachoeira da montanha volta a usar a massa do bioma',
    real:'"a massa ja e a agua do bioma" — na montanha ela e sombra, nao agua',
    de:"cascata:'#2f6b8c', cascataEsc:'#1d4a63', cascataClaro:'#7bc0da', cascataEspuma:'#d8f2fb'",
    para:"cascataEspuma:'#d8f2fb'" },

  /* ---------- 1.5o / 1.5p: os dois controles que desobedeciam ---------- */

  /* A LISTA DE ZOOM VOLTA A SER FIXA. Fixa, ela oferece niveis que o piso engole
     em silencio — e foi exatamente o que o dono viu: "o zoom do 1x e 2x nao
     mudam". Ele clica, nada muda, e conclui que o jogo esta quebrado. */
  { id:'S631', arquivo:'app/modules/viewport.mjs', nome:'a lista de zoom volta a ignorar o piso',
    real:'"os niveis sao 1 a 5" — sao, e abaixo do piso dois deles sao o mesmo',
    de:'  const acima = ZOOMS_INTEIROS.filter(z => z > p + 0.02);',
    para:'  const acima = ZOOMS_INTEIROS;' },

  /* O PISO SOME DA LISTA. Sem ele o jogador perde o "mapa inteiro cabendo", que
     e a posicao mais util da cena, e o botao de afastar para no penultimo. */
  { id:'S632', arquivo:'app/modules/viewport.mjs', nome:'o piso deixa de ser um nivel escolhivel',
    real:'"piso nao e zoom" — e sim: e o mais longe que faz sentido existir',
    de:'  return [Math.ceil(p * 20) / 20, ...acima];',
    para:'  return acima.length ? acima : [p];' },

  /* O SOM VOLTA A COMECAR LIGADO. Um produto que abre numa aba do navegador e
     faz barulho sem ninguem pedir e a pior surpresa que ele pode dar. */
  { id:'S633', arquivo:'app/modules/audio.mjs', nome:'o som volta a comecar ligado',
    real:'"som e parte do jogo" — e, e comecar ligado nao foi escolha do jogador',
    /* REALVADO no mesmo bloco: o dono cortou a memoria entre visitas — "o
       botao do som fica mutado, o player ativa se quiser, ponto final" —, e a
       ancora antiga apontava para o codigo que a memoria usava. O defeito nao
       mudou: som que comeca ligado nao foi escolha de ninguem. */
    de:'let ac = null, musicOn = false, soundEnabled = false;',
    para:'let ac = null, musicOn = false, soundEnabled = true;' },

  /* A MUSICA DA ARENA VOLTA A TOCAR FORA DA ARENA. E o defeito de verdade por
     tras da queixa do dono: mutar o inicio sozinho so o adia ate ele ligar o
     som de novo. */
  { id:'S634', arquivo:'app/modules/navegacao.mjs', nome:'a musica da arena toca fora da arena',
    real:'"a trilha e do jogo" — e da ARENA, e a arena saiu da tela',
    /* REALVADO no mesmo bloco: a trava saiu da navegacao e virou `verArena`
       no proprio audio.mjs, porque hitbox e SFX e nao trilha — parar so a
       musica na navegacao deixaria os efeitos da luta tocando na aba das
       rotas. O defeito e o mesmo, um nivel abaixo. */
    /* REALVADO no 1.23: a trava deixou de se chamar "arena" quando a captura
       ganhou som — o nome tinha virado mentira. O comportamento e o defeito
       sao os mesmos; so o simbolo mudou de lugar. */
    de:'  verVista(id);',
    para:"  verVista('viewArena');" },

  /* ---------- 1.5q: a vida dos biomas e a cachoeira que corre ---------- */

  /* A DENSIDADE VOLTA A SER UM NUMERO FIXO. Foi assim que dezoito vaga-lumes
     que enchiam a previa de 240x160 viraram dezoito pontos perdidos num campo
     oito vezes maior — o dono viu como "a previa tinha mais riqueza de
     detalhes", e nao era enfeite a menos: era o MESMO enfeite diluido. */
  { id:'S635', arquivo:'app/modules/particulas.mjs', nome:'a densidade da vida para de acompanhar a area',
    real:'"o numero ja esta calibrado" — para a cena de 15x10, que nao existe mais',
    de:'  return Math.max(4, Math.round(base * Math.sqrt(a / AREA_REF)));',
    para:'  return base;' },

  /* A CACHOEIRA CONGELA. Agua parada nao le como agua mal desenhada: le como
     PEDRA AZUL. "uma cachoeira estatica nao e uma cachoeira" — palavra do dono. */
  { id:'S636', arquivo:RELEVO, nome:'a cachoeira volta a ficar parada',
    real:'"ela ja tem veia clara" — tem, e veia parada e listra, nao agua',
    /* REALVADO no mesmo bloco: a geometria da veia saiu do pincel e virou
        em relevo.mjs, camada 0 — foi a extracao que a tornou afirmavel,
       do mesmo jeito que o piso do zoom. */
    de:'export const faseVeia = (k, t) => (((t / VEIA_MS) + k * VEIA_DESLOC) % 1 + 1) % 1;',
    para:'export const faseVeia = (k, t) => 0.5;' },

  /* AS VEIAS EM FASE. Juntas elas viram uma barra unica descendo — um elevador,
     e nao uma queda. E a mesma familia do anel do lago em fase com a boia. */
  { id:'S637', arquivo:RELEVO, nome:'as veias da cachoeira descem juntas',
    real:'"e tudo a mesma agua" — e, e agua nao desce em bloco',
    de:'export const VEIA_DESLOC = 0.37;     // quanto uma veia sai da fase da anterior',
    para:'export const VEIA_DESLOC = 0;' },

  /* A QUEDA VOLTA A ALCANCAR O MAR. Como a unica agua do mapa e a ultima faixa,
     alcanca-la obriga a queda a atravessar a cena inteira: 78% da altura,
     medido. Deixa de ser marco e vira parede, cortando o caminho ao meio. */
  { id:'S638', arquivo:'app/modules/relevo.mjs', nome:'a cachoeira volta a virar parede',
    real:'"agua tem que cair na agua" — nao a este preco: a poca dela JA e agua',
    de:'        const queda = Math.max(5, Math.round(planta.margem * 0.34));',
    para:'        const queda = planta.margem - alto + 2;' },

  /* ---------- 1.6c: o banner no idle ---------- */

  /* O BANNER DO IDLE MOSTRA O LUTADOR DA ARENA. O dono foi explicito: no idle
     e SEMPRE o Pokemon do perfil, e no banner nao entra odd nem colocacao. */
  { id:'S639', arquivo:'app/modules/banner.mjs', nome:'o banner do idle vira o banner da arena',
    real:'"e o mesmo banner" — o mesmo COMPONENTE, com outro corpo',
    de:"    ${box.dataset.modo === 'idle' ? corpoIdle() : corpo}`;",
    para:'    ${corpo}`;' },

  /* A VITRINE VOLTA A SER ESTATICA. E a regra permanente L-080: todo sprite de
     Pokemon mostrado ao jogador e GIF animado, normal e shiny. E a grade de
     escolha, ao lado na customizacao, ja e animada — escolher vendo o GIF e
     receber um PNG e a pior ordem possivel. */
  { id:'S640', arquivo:'app/modules/banner.mjs', nome:'a vitrine do banner volta a ser um PNG',
    real:'"parada ela pesa menos" — e mente sobre o que o jogador escolheu',
    de:"      ? retratoAnimado(esp, 'class=\"bnMon\"', gifShinyAtivo(perfil, vitrineDex))",
    para:"      ? dexImg(vitrineDex, '', 'class=\"bnMon\"', gifShinyAtivo(perfil, vitrineDex))" },

  /* O ZERO FALSY APAGA A OPCAO NENHUM. Com `||`, a escolha "sem Pokemon" cai no
     padrao e o bicho volta sozinho: a opcao existe na grade e nao tem efeito. */
  { id:'S641', arquivo:'app/modules/banner-dados.mjs', nome:'a opcao NENHUM deixa de valer',
    real:'"dex zero nao e escolha" — e sim, e foi pedida de proposito',
    /* REALVADO no proprio bloco: a escolha saiu do banner e virou ,
       camada 0 — foi a extracao que a tornou afirmavel sem navegador. */
    de:'  if (d === 0) return 0;                 // NENHUM, e é escolha',
    para:'  if (d === 0) return padrao;' },

  /* A ABA VOLTA A ABRIR NO PRIMEIRO BIOMA DA LISTA. O jogador com uma expedicao
     no gelo abre na floresta vazia e conclui que o jogo esqueceu quem ele
     mandou — foi o relato do dono, literal. */
  { id:'S642', arquivo:'app/modules/idle-quem.mjs', nome:'a aba do idle abre longe de onde a acao esta',
    real:'"o primeiro da lista e o padrao" — o padrao e onde ha algo acontecendo',
    /* REALVADO no 1.6b: a regra saiu do DOM e virou  em
       idle-quem.mjs, camada 0. Foi a extracao que o tornou pegavel — dentro da
       tela ele escapava do Q2, e quem o pegava era o dono, olhando (L-091). */
    de:'  return maisRecente?.bioma ?? (biomas ?? [])[0]?.id ?? null;',
    para:'  return (biomas ?? [])[0]?.id ?? null;' },

  /* BIOMA VAZIO GANHA UM COMPANHEIRO DE MENTIRA. A reserva e pior que a
     ausencia: faz a cena parecer informativa sendo decorativa, e apaga a
     pergunta que a tela responde — quem esta farmando AQUI. */
  { id:'S643', arquivo:'app/modules/idle-quem.mjs', nome:'bioma sem ninguem em campo mostra o primeiro da caixa',
    real:'"a cena nao pode ficar vazia" — pode: o treinador anda sozinho',
    /* REALVADO DUAS VEZES. Primeiro para camada 0 (era o que o tornava
       pegavel). Agora de novo: o dono refinou a regra — a previa passa a seguir
       a SELECAO ao vivo, e nao so quando o mundo esta vazio. O defeito nao
       mudou: cair no primeiro da caixa e a tela INVENTANDO um bicho, nem fato
       nem intencao, e continua proibido. */
    de:'  return escolhido ?? null;',
    para:'  return escolhido ?? (criaturas ?? [])[0] ?? null;' },

  /* O SELETOR VOLTA A OFERECER QUEM ESTA NA CAIXA. O jogador escolhe uma
     guardada, clica em mandar, e so ai ouve "estao na caixa — tire-as antes".
     O dono leu essa recusa como uma regra que nao existe: *"dizia que so podia
     o inicial"*. E o comentario do proprio arquivo ja dizia a regra que o
     codigo quebrava — a recusa depois de clicar e a pior forma de ensinar. */
  { id:'S644', arquivo:'app/modules/idle-quem.mjs', nome:'o seletor oferece criatura que esta na caixa',
    real:'"mostrar tudo e mais informativo" — e oferecer o que nao da',
    /* REALVADO no mesmo bloco: virou  em idle-quem.mjs, camada 0. A
       afirmacao de navegador que eu tinha escrito passou VAZIA — a caixa do
       portao abre sem ninguem guardado, e ali o defeito nao pode aparecer. */
    de:'  return (criaturas ?? []).filter(c => c && !c.naCaixa);',
    para:'  return criaturas ?? [];' },

  /* ---------- 1.6b: os icones de cabeca ---------- */

  /* A CONTA DO RECORTE INVERTE LINHA E COLUNA. Icone trocado e o defeito mais
     silencioso desta tela: nada quebra, a lista aparece, e o jogador ve um
     bicho onde apareceu outro — so descobre ao jogar a bola, quando ja gastou.
     Barra do dono: "se atente a colocar cada icone no pokemon correto". */
  { id:'S645', arquivo:'app/modules/icones.mjs', nome:'a conta do recorte inverte linha e coluna',
    real:'"linha e coluna sao simetricas" — sao, e trocadas dao outro bicho',
    de:'  return { x: (i % f.colunas) * f.lado, y: Math.floor(i / f.colunas) * f.lado, lado: f.lado };',
    para:'  return { x: Math.floor(i / f.colunas) * f.lado, y: (i % f.colunas) * f.lado, lado: f.lado };' },

  /* A POSICAO PARA DE ACOMPANHAR A ESCALA. E o erro classico deste recorte: os
     icones aparecem, e o desvio cresce a cada linha — so a primeira casa fica
     certa, e as outras 150 mostram o vizinho. */
  { id:'S646', arquivo:'app/modules/icones.mjs', nome:'a posicao do icone ignora a escala da folha',
    real:'"a posicao e em px da folha" — da folha ORIGINAL, e ela foi reduzida',
    de:'         `background-position:${-r.x * k}px ${-r.y * k}px;` +',
    para:'         `background-position:${-r.x}px ${-r.y}px;` +' },

  /* D-064 · A EQUIPE VOLTA A VIR CRUA. `potencial` e derivado do IV e nao
     guardado; sem hidratar, a tela do Centro escreve "potencial undefined" em
     cada ficha. Duas portas para a mesma coisa, uma fazendo um passo a mais. */
  { id:'S647', arquivo:IDADOS, nome:'a equipe volta a ser devolvida sem hidratar',
    real:'"filtrar ja basta" — basta para filtrar, e nao para MOSTRAR',
    de:'export const naEquipe = e => e.criaturas.filter(c => !c.naCaixa).map(hidratar);',
    para:'export const naEquipe = e => e.criaturas.filter(c => !c.naCaixa);' },

  /* ---------- 1.5r: a decoracao dos biomas ---------- */

  /* A ESCALA DO RECORTE VOLTA A USAR COLUNAS*PASSO. A folha tem 396 px e nao
     330 — a ultima coluna e sobra vazia. Com o divisor errado cada peca sai
     deslocada, e o desvio CRESCE com a coluna: a primeira quase acerta e a
     ultima mostra o vizinho. Foi o que apareceu na primeira aplicacao. */
  { id:'S648', arquivo:'app/modules/decoracao.mjs', nome:'a escala do recorte ignora a largura real da folha',
    real:'"cinco colunas de 66" — sao seis, e a sexta e sobra',
    de:'export const LARGURA_FOLHA = 396;',
    para:'export const LARGURA_FOLHA = 330;' },

  /* PECA NO MEIO DA TRILHA. Chao pisado e chao limpo, e o personagem passa por
     DENTRO da peca — a coisa mais visivel que esta cena pode fazer errado. */
  { id:'S649', arquivo:'app/modules/decoracao.mjs', nome:'a decoracao volta a cair na trilha',
    real:'"a faixa ja exclui" — exclui por sorteio, e o arredondamento nao',
    /* REALVADO no proprio bloco: a guarda dentro de `decorar` era
       inalcancavel — quem mantem o chao pisado limpo e o TETO da faixa `grama`. Plantado na
       guarda morta, o defeito PASSAVA; plantado aqui, ele espalha peca no meio
       do caminho, que e a coisa mais visivel que esta cena pode fazer errado. */
    de:'  grama:  pl => [Math.round(pl.rows * 0.14), Math.max(2, pl.caminho - 1)],',
    para:'  grama:  pl => [Math.round(pl.rows * 0.14), pl.margem - 1],' },

  /* D-065 · O SELETOR DO INICIAL VOLTA A ENGOLIR O CLIQUE DA EQUIPE. Um
     seletor de atributo solto num ouvinte de documento inteiro e um contrato
     invisivel com toda a pagina: quem acrescenta o atributo noutro lugar nao
     tem como saber que existia um dono. O jogador so conseguia selecionar o
     inicial — que ja vem selecionado. */
  { id:'S650', arquivo:ITELA, nome:'o seletor do inicial engole o clique da equipe',
    real:'"data-dex e do inicial" — era, ate outro cartao ganhar o atributo',
    de:"  const ini = ev.target.closest('#idleIniciais [data-dex]');",
    para:"  const ini = ev.target.closest('[data-dex]');" },

  /* ---------- 1.6b: o painel do idle ---------- */

  /* A FORMA VOLTA A SER CALCULADA SO NA CRIACAO. Ela vivia dentro de
     \`gerarInstancia\` e nao chegava a tela: a criatura salva guarda o IV, nao a
     forma. Derivada no \`hidratar\`, ela existe em todo lugar; guardada, seriam
     duas verdades que divergem no dia em que a formula mudar. */
  { id:'S651', arquivo:IDADOS, nome:'a forma some da criatura hidratada',
    real:'"a forma e da instancia" — e derivada do IV, e o IV esta salvo',
    /* REALVADO no 1.14: `hidratar` passou a derivar tambem `nivel` e `barra`, e
       a linha inteira mudou. A ancora encolheu para o pedaco que carrega a
       forma — que e o comportamento que este defeito ataca. Ancora perdida se
       realva onde o comportamento mora hoje; nunca se apaga. */
    de:'{ ...c, potencial: potencialDe(c.iv), forma: formaDe(c.iv),',
    para:'{ ...c, potencial: potencialDe(c.iv),' },

  /* AS TRES LEITURAS VIRAM A MESMA. \`formaDe\` agrupa os seis ocultos em
     ofensiva, defesa e velocidade — se as tres saem do mesmo numero, o cartao
     mostra tres barras iguais e o jogador deixa de distinguir duas criaturas. */
  { id:'S652', arquivo:'engine/instancia.mjs', nome:'as tres leituras da forma viram a mesma',
    real:'"e tudo potencial" — e, e o agrupamento e o que o torna legivel',
    de:'    velocidade: Math.round((vel / OCULTO_MAX) * 100),',
    para:'    velocidade: Math.round(((atq + spa) / (2 * OCULTO_MAX)) * 100),' },

  /* O ITEM DA MOCHILA PERDE O ICONE. O icone e o SUJEITO da linha: uma lista de
     itens se le pela forma antes do nome, e sem ele o jogador volta a ler cada
     linha para achar a bola. */
  { id:'S653', arquivo:'app/modules/itens-icone.mjs', nome:'a mochila perde os icones',
    real:'"o nome ja diz" — diz depois de ler; o desenho diz antes',
    de:'export const temIcone = id => Object.prototype.hasOwnProperty.call(CASA, id);',
    para:'export const temIcone = id => false;' },

  /* A POSICAO TEM DE ESCALAR JUNTO COM A FOLHA. E o erro classico do recorte por
     CSS e ele ja custou uma rodada inteira na folha de decoracao: escalar a
     folha e esquecer a posicao desloca cada peca um pouco mais que a anterior,
     entao a primeira parece certa e o defeito so aparece no fim da fileira. */
  { id:'S654', arquivo:'app/modules/itens-icone.mjs', nome:'a posicao para de escalar com a folha',
    real:'"a folha e a posicao vem do mesmo numero" - vem, ate alguem separar os dois',
    /* REALVADO no 1.12: o modulo foi reescrito quando a folha passou a ser
       nativa de 32 px e o indice passou a vir do catalogo do pack. O
       comportamento e o mesmo — a posicao escala junto com a folha — e a ancora
       o acompanhou. */
    de:'  const k = t / LADO;',
    para:'  const k = 1;' },

  /* DUAS COISAS DIFERENTES COM O MESMO DESENHO. E exatamente o que um icone
     existe para impedir, e o unico jeito de acontecer e uma casa repetida - que
     e um erro de digitacao, nao de logica, e por isso passa despercebido. */
  /* REALVADO no 1.12: o mapa id -> icone saiu do modulo e foi para o CATALOGO
     do pack, quando o portao `conteudo` cobrou que nome e posicao de item sao
     nomenclatura de tema. O defeito foi junto — dois itens apontando para a
     mesma celula continuam sendo duas coisas com o mesmo desenho, que e
     exatamente o que um icone existe para impedir. */
  { id:'S655', arquivo:CAT, nome:'duas casas apontam para o mesmo desenho',
    real:'bola comum e bola boa com o mesmo icone: o jogador gasta a errada',
    de:"  { id: 'great', nome: 'Great Ball', en: 'Great Ball', icone: 2, comoAchei: 'olhado',",
    /* REALVADO DUAS VEZES no 1.25, e a segunda desfez a primeira: a Poke Ball
       voltou para a casa 3 quando o dono corrigiu que a 15 nao e uma Poke Ball.
       Com a 3 ocupada de novo, esta sabotagem volta a colidir — que e o que ela
       existe para provar. */
    para:"  { id: 'great', nome: 'Great Ball', en: 'Great Ball', icone: 3, comoAchei: 'olhado'," },

  /* ── A ECONOMIA DO IDLE (bloco 1.11) ─────────────────────────────────────
     O dinheiro do PvE saiu da tabela de sorteio e virou pagamento POR ENCONTRO.
     Os defeitos abaixo atacam as quatro propriedades que fazem isso valer a
     pena: a variacao, a troca entre perfis, a porta fechada do §P5, e a
     promessa que a tela faz antes de o jogador gastar oito horas. */

  /* A SOMA VIRA n x MEDIA. Some a variacao — e some junto o motivo de o jogador
     voltar para VER o saque em vez de so coleta-lo. */
  { id:'S656', arquivo:ECON, nome:'o pagamento vira media fixa',
    real:'"a media da no mesmo" — da no mesmo NUMERO, nao na mesma SENSACAO',
    de:'  for (let i = 0; i < n; i++) total += pagamentoDe(rnd, perfil);',
    para:'  return Math.round(n * (PC_POR_ENCONTRO[perfil] ?? FAIXA_PADRAO).reduce((a, b) => a + b, 0) / 2);' },

  /* A VIGILIA DEIXA DE PAGAR MAIS POR ENCONTRO. Oito horas viram "mais vezes",
     e o perfil deixa de ser uma troca para virar uma escala. */
  { id:'S657', arquivo:ECON, nome:'a Vigilia deixa de pagar mais por encontro',
    real:'"todo encontro vale o mesmo" — entao a duracao nao compra nada',
    de:'  vigilia: [65, 130],', para:'  vigilia: [25, 45],' },

  /* §P5 · UMA CHAVE DE FORA MUDA O PAGAMENTO. Mesma porta que o teto ja teve
     fechada: pagamento que vem de fora e pagamento que a loja pode vender. */
  { id:'S658', arquivo:ECON, nome:'o pagamento aceita chave de fora',
    real:'"e so um bonus" — bonus com porta e o §P5 caindo',
    de:'export function moedasDa(rnd, { perfil, encontros }) {',
    para:'export function moedasDa(rnd, { perfil, encontros, bonus = 0 }) {' },

  /* A FAIXA PROMETIDA DEIXA DE CONTER O PAGO. A tela promete antes de o jogador
     gastar a stamina; pagar fora da faixa quebra a unica promessa do idle. */
  { id:'S659', arquivo:ECON, nome:'a faixa prometida deixa de conter o pago',
    real:'"a faixa e so uma estimativa" — estimativa que erra para menos e promessa quebrada',
    de:'  return [min * Math.max(0, minEnc), max * Math.max(0, maxEnc)];',
    para:'  return [min * Math.max(0, minEnc), min * Math.max(0, maxEnc)];' },

  /* A MOEDA E O MATERIAL DIVIDEM A CHAVE DA BOLSA. Dinheiro compra o que ja tem
     preco; material compra o que nao devia ter — misturar desfaz a distincao, e
     desfaz junto a razao de o material existir (L-092, L-095). */
  /* REALVADO no proprio 1.11: o portao `conteudo` reprovou a primeira versao,
     que guardava o id da moeda numa constante DO MOTOR. O nome foi para o pack,
     e o defeito foi junto — porque e la que o comportamento mora agora.
     Ancora perdida se REALVA; nunca se apaga (CLAUDE.md, o pre-voo). */
  { id:'S660', arquivo:'content/pokemon_kanto_v1.mjs',
    nome:'a moeda divide a chave da bolsa com o material',
    real:'"as duas sao moeda" — uma e moeda, a outra e o que a moeda nao pode comprar',
    de:'const MOEDA_PVE = { id: "pokecoin",',
    para:'const MOEDA_PVE = { id: "essencia",' },

  /* UM PACK COM UM QUARTO PERFIL PARA DE PAGAR, em silencio. Recusar seria pior
     que a faixa padrao: o pack novo funcionaria em tudo, menos no dinheiro. */
  { id:'S661', arquivo:ECON, nome:'o perfil desconhecido para de pagar',
    real:'"perfil que nao existe nao paga" — nao existe AQUI; existe no pack de outro',
    de:'export const faixaDo = perfil => PC_POR_ENCONTRO[perfil] ?? FAIXA_PADRAO;',
    para:'export const faixaDo = perfil => PC_POR_ENCONTRO[perfil] ?? [0, 0];' },

  /* ── AS VAGAS SIMULTANEAS (bloco 1.9) ────────────────────────────────────
     Vaga e TEMPO: quatro expedicoes rendem o dia inteiro mais cedo. Num jogo em
     que o que se farma e vendavel, vaga vendida — ou forjavel — e o §P5 pela
     porta dos fundos, e sem nem precisar de loja. */

  /* AS VAGAS DEIXAM DE DEPENDER DO POKEDEX e viram todas de graca. O paralelismo
     era a recompensa de uma coleta longa; passa a ser o estado inicial. */
  { id:'S662', arquivo:'engine/expedicao.mjs', nome:'as vagas nascem todas abertas',
    real:'"e so conveniencia" — conveniencia que chega antes do esforco e o esforco',
    de:'export const MARCOS_VAGAS = [0, 10, 25, 45];',
    para:'export const MARCOS_VAGAS = [0, 0, 0, 0];' },

  /* VER MAIS ESPECIES PASSA A TIRAR VAGA. Progressao nao-monotona e a forma mais
     rapida de ensinar ao jogador que o numero da tela nao significa nada. */
  { id:'S663', arquivo:'engine/expedicao.mjs', nome:'a progressao de vagas deixa de ser monotona',
    real:'"o ultimo marco vence" — vence, inclusive quando ele esta abaixo do atual',
    de:'    if (n >= MARCOS_VAGAS[i]) vagas = SIMULTANEAS_INICIAIS + i;',
    para:'    vagas = n >= MARCOS_VAGAS[i] ? SIMULTANEAS_INICIAIS + i : SIMULTANEAS_INICIAIS;' },

  /* UM MARCO A MAIS QUE O TETO. O quinto marco existe, o jogador farma ate ele,
     e a vaga nunca abre — porque SIMULTANEAS_MAX continua em quatro. E a pior
     forma de uma progressao falhar: ela ANUNCIA a recompensa e nao entrega.

     (O `Math.min` do derivador nao serve como defeito plantado: com a lista de
      marcos amarrada ao teto por teste, ele nunca dispara — e mutante
      equivalente. O que de fato pode dar errado e a lista e o teto DISCORDAREM,
      e e isso que se planta aqui.) */
  { id:'S664', arquivo:'engine/expedicao.mjs', nome:'um marco a mais que o teto de vagas',
    real:'"um marco extra nao faz mal" — faz: e uma promessa que o motor recusa',
    de:'export const MARCOS_VAGAS = [0, 10, 25, 45];',
    para:'export const MARCOS_VAGAS = [0, 10, 25, 45, 70];' },

  /* A PROXIMA VAGA MENTE QUANDO ACABOU. "faltam 0" e "nao ha mais" viram a mesma
     coisa, e a tela perde como distinguir convite de encerramento. */
  { id:'S665', arquivo:'engine/expedicao.mjs', nome:'a proxima vaga nao sabe dizer que acabou',
    real:'"zero ja diz" — zero diz que falta pouco, nao que nao ha mais',
    de:'  if (atual >= SIMULTANEAS_MAX) return null;',
    para:'  if (false) return null;' },

  /* O POKEDEX NEGATIVO OU INVALIDO ZERA AS VAGAS. O jogador fica sem poder mandar
     expedicao nenhuma, e sem nada na tela explicando por que. */
  { id:'S666', arquivo:'engine/expedicao.mjs', nome:'registro invalido tira a vaga inicial',
    real:'"nao vai acontecer" — o estado vem de localStorage, entao vai',
    de:'  const n = Math.max(0, Math.floor(Number(especiesVistas) || 0));\n  let vagas = SIMULTANEAS_INICIAIS;',
    para:'  const n = Number(especiesVistas);\n  let vagas = n > 0 ? SIMULTANEAS_INICIAIS : 0;' },

  /* ── O NIVEL E O VINCULO DA CRIATURA (bloco 1.14, fecha a L-099) ─────────
     Tres numeros existiam desde o 1.1 e nunca andavam. Agora andam, e o que os
     defeitos abaixo protegem e o que a L-099 dizia: um numero que anda errado e
     pior que um numero parado, porque o jogador confia nele. */

  /* A CURVA VOLTA A COMECAR ACIMA DE ZERO. E o D-006 do treinador chegando
     aqui: a barra do nivel 1 nasce NEGATIVA, e fica assim ate alguem olhar. */
  { id:'S667', arquivo:NIV, nome:'a curva de nivel volta a nascer negativa',
    real:'"e so o primeiro nivel" — e o primeiro que TODO jogador ve',
    de:'export const xpParaNivel = n => (n <= 1 ? 0 : Math.round(4 * Math.pow(n, 2.2)));',
    para:'export const xpParaNivel = n => Math.round(4 * Math.pow(n, 2.2));' },

  /* O XP VIRA SORTEIO. Experiencia deixa de ser planejavel, e "mais duas
     Vigilias e ele evolui" deixa de ser uma frase que o jogador pode dizer. */
  { id:'S668', arquivo:NIV, nome:'o XP da expedicao passa a ser sorteado',
    real:'"varia pouco" — varia o bastante para nao dar para contar com ele',
    de:'  return n * xpPorEncontroDe(perfil);',
    para:'  return Math.round(n * xpPorEncontroDe(perfil) * (0.6 + Math.random() * 0.8));' },

  /* A VIGILIA DEIXA DE PAGAR MAIS XP POR ENCONTRO, e a duracao para de comprar
     qualquer coisa: oito horas viram so "mais vezes". */
  { id:'S669', arquivo:NIV, nome:'a duracao para de valer XP por encontro',
    real:'"todo encontro ensina o mesmo" — entao escolher a duracao nao e escolha',
    de:'export const XP_POR_ENCONTRO = { batida: 8, trilha: 14, vigilia: 20 };',
    para:'export const XP_POR_ENCONTRO = { batida: 14, trilha: 14, vigilia: 14 };' },

  /* O VINCULO VIRA UM SEGUNDO XP. Duas barras que sobem juntas sao uma barra
     com duas cores, e a evolucao por afinidade da Gen 2 perde o eixo dela. */
  { id:'S670', arquivo:NIV, nome:'o vinculo passa a contar encontros',
    real:'"e tudo progressao" — e progressao de coisas diferentes',
    de:'export function vinculoDaExpedicao({ minutos }) {',
    para:'export function vinculoDaExpedicao({ minutos, encontros = 0 }) {\n  if (encontros) return encontros;' },

  /* O TETO DO VINCULO SOME, e ele deixa de significar laco para significar
     quanto tempo a aba ficou aberta. */
  { id:'S671', arquivo:NIV, nome:'o vinculo perde o teto',
    real:'"ninguem chega la" — chega quem deixa a aba aberta, que e o publico',
    de:'    vinculo: Math.min(VINCULO_MAX, vAntes + Math.max(0, Math.floor(Number(vinculo) || 0))),',
    para:'    vinculo: vAntes + Math.max(0, Math.floor(Number(vinculo) || 0)),' },

  /* §P5 · O CREDITO ACEITA VALOR NEGATIVO, e passa a ser possivel PERDER nivel
     por um estado editado. Ritmo de progressao que vem de fora e ritmo que a
     loja pode vender — e aqui nem loja e preciso. */
  { id:'S672', arquivo:NIV, nome:'creditar aceita XP negativo',
    real:'"o chamador nao manda negativo" — o chamador le do localStorage',
    de:'  const xpDepois = xpAntes + Math.max(0, Math.floor(Number(xp) || 0));',
    para:'  const xpDepois = xpAntes + Math.floor(Number(xp) || 0);' },

  /* ── OS ESTAGIOS DE UM BIOMA (bloco 1.10) ───────────────────────────────
     O modo de falha que o dono mandou resolver e a PAREDE: um desbloqueio por
     nivel que o jogador nao consegue enxergar de onde esta. Os defeitos abaixo
     atacam as tres coisas que a contem — a proporcao entre as portas, a lista
     que muda com a profundidade, e a ordem das faixas que nao pode inverter. */

  /* A PAREDE VOLTA. A ultima porta salta para muito longe, e quem chegou ao
     estagio 3 para de enxergar o 4 de onde esta. */
  { id:'S673', arquivo:EST, nome:'a ultima porta vira parede',
    real:'"e o estagio final, tem de custar" — custar sim; sumir do horizonte nao',
    de:'export const NIVEL_DO_ESTAGIO = [1, 12, 19, 31];',
    para:'export const NIVEL_DO_ESTAGIO = [1, 12, 19, 64];' },

  /* O PRIMEIRO ESTAGIO NASCE TRANCADO, e ha bioma inacessivel na tela inicial —
     um mapa com portas que nunca se abriram e um mapa que mente. */
  { id:'S674', arquivo:EST, nome:'o primeiro estagio nasce trancado',
    real:'"o jogador comeca com uma criatura de nivel 1" — exatamente por isso',
    de:'export const NIVEL_DO_ESTAGIO = [1, 12, 19, 31];',
    para:'export const NIVEL_DO_ESTAGIO = [3, 12, 19, 31];' },

  /* O FUNDO VOLTA A TER COMUM, e o muito raro deixa de ser provavel la. A unica
     forma de premiar o fundo passa a ser inverter a tabela — que e o erro de
     significado que este bloco existe para nao cometer. */
  { id:'S675', arquivo:EST, nome:'o estagio final volta a ter comuns',
    real:'"mais opcoes e melhor" — mais opcoes dilui o que so existe la',
    de:"  ['raro', 'muitoRaro'],", para:"  ['comum', 'raro', 'muitoRaro']," },

  /* DOIS ESTAGIOS PASSAM A OFERECER A MESMA COISA: um deles vira um botao a mais
     sem nada atras, e as semanas gastas para abri-lo nao compraram nada. */
  { id:'S676', arquivo:EST, nome:'dois estagios oferecem as mesmas faixas',
    real:'"a diferenca esta no vies" — vies de 0,1 nao e uma diferenca que se ve',
    de:"  ['incomum', 'raro', 'muitoRaro'],", para:"  ['comum', 'incomum', 'raro']," },

  /* O TETO DO VIES SOME, e a ordem das faixas INVERTE: o muito raro fica mais
     provavel que o comum. Numeros corretos, significado quebrado — a previa da
     tela passa a mentir com aritmetica certa. */
  { id:'S677', arquivo:EST, nome:'o vies do estagio sobe e a raridade inverte',
    real:'"quanto mais vies, melhor o premio" — ate as palavras trocarem de sentido',
    de:'export const VIES_DO_ESTAGIO = [0, 0.1, 0.2, 0.3];',
    para:'export const VIES_DO_ESTAGIO = [0, 0.5, 1.0, 1.6];' },

  /* A EQUIPE INTEIRA PASSA A PRECISAR DO NIVEL. Pegar criatura nova ATRASA o
     progresso, e o sistema pune a atividade que ele quer incentivar. */
  { id:'S678', arquivo:EST, nome:'o estagio passa a exigir a equipe inteira',
    real:'"e mais justo" — e injusto com quem coleciona, que e o publico do idle',
    de:'  (m, c) => Math.max(m, Math.floor(Number(c?.nivel) || 1)), 1);',
    para:'  (m, c) => Math.min(m, Math.floor(Number(c?.nivel) || 1)), 99);' },

  /* ── A BATALHA CONTRA O TREINADOR (bloco 1.7b) ──────────────────────────
     E a unica mecanica do idle que ACRESCENTA recompensa, e por isso a que mais
     perto chega do §P5. O que a mantem do lado certo e uma decisao so: o NPC
     OCUPA o encontro. Os tres primeiros defeitos atacam exatamente isso. */

  /* A BATALHA DEIXA DE OCUPAR O ENCONTRO e vira renda paralela. O teto de
     encontros para de ser o unico limite do farm, e nada na tela avisa. */
  { id:'S679', arquivo:IDCOLH, nome:'a batalha deixa de ocupar o encontro',
    real:'"o encontro aconteceu, a batalha tambem" — dois premios por um encontro',
    de:'  const selvagens = npc.quantas ? encontros.slice(0, encontros.length - npc.quantas) : encontros;',
    para:'  const selvagens = encontros;' },

  /* O XP EXTRA PASSA A SER O TOTAL, e o encontro e pago duas vezes. Num jogo em
     que o farm e vendavel, pagar duas vezes e imprimir dinheiro. */
  { id:'S680', arquivo:NPC, nome:'a batalha paga o encontro duas vezes',
    real:'"a vitoria vale 2,5x" — vale; o encontro ja pagou 1x antes dela',
    de:'    xpExtra += Math.round(base * (r.xp - 1));',
    para:'    xpExtra += Math.round(base * r.xp);' },

  /* TODOS OS ENCONTROS VIRAM BATALHA. A expedicao volta sem uma unica criatura
     para capturar, e o idle deixa de ser o que e. */
  { id:'S681', arquivo:NPC, nome:'a colheita inteira vira batalha',
    real:'"e so um dia de sorte" — e um dia em que nao ha nada para pegar',
    de:'  return Math.min(quantos, n - 1);',
    para:'  return quantos;' },

  /* A DERROTA PASSA A TIRAR XP. Um idle que castiga o jogador por estar ausente
     esta castigando o jogador por usar o produto como ele foi feito. */
  { id:'S682', arquivo:NPC, nome:'a derrota tira do que o encontro ja valia',
    real:'"perder tem de doer" — doer para quem? o jogador estava dormindo',
    de:'export const XP_DA_DERROTA = 1.2;',
    para:'export const XP_DA_DERROTA = 0.5;' },

  /* A CHANCE DEIXA DE DEPENDER DO NIVEL. Subir de nivel para de comprar
     qualquer coisa, e o bloco 1.14 inteiro perde o motivo. */
  { id:'S683', arquivo:NPC, nome:'o nivel da equipe para de valer na batalha',
    real:'"e sorte, como tudo" — nao: e a unica coisa que o nivel COMPRA',
    de:'    Math.max(CHANCE_MINIMA, 0.5 + (meu - dele) * PONTO_POR_NIVEL));',
    para:'    Math.max(CHANCE_MINIMA, 0.5));' },

  /* A VITORIA VIRA CERTEZA. Batalha que nao se pode perder e uma animacao com
     um numero no fim — e a prevbia passa a prometer um risco que nao existe. */
  { id:'S684', arquivo:NPC, nome:'a vitoria vira certeza',
    real:'"o jogador forte merece ganhar" — merece ganhar quase sempre, nao sempre',
    de:'export const CHANCE_MAXIMA = 0.95;',
    para:'export const CHANCE_MAXIMA = 1;' },

  /* ── O CATALOGO DE ITENS E AS QUATRO PORTAS (bloco 1.12) ────────────────
     Estes sao os defeitos mais caros do projeto ate aqui, e nao por serem
     dificeis: e porque um deles, sozinho, transforma a loja num produto que o
     §25.1 nao pode aprovar e que a base abandona. */

  /* §P5 · UM ITEM DE PODER VAI PARA A LOJA DE DINHEIRO REAL. Uma Choice Band
     por cinco reais e 50% de ataque comprado — e num jogo em que o que se farma
     e vendavel, isso e dinheiro comprando dinheiro. */
  { id:'S685', arquivo:CAT, nome:'um item de poder e vendido por dinheiro real',
    real:'"e so um item" — e o item que decide a batalha, e a loja inteira muda de categoria',
    de:"    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 4,",
    para:"    faixa: 'muitoRaro', porta: 'dinheiro', andarMinimo: 4," },

  /* A PEDRA PASSA A SER COMPRAVEL. Decisao do dono desfeita em silencio: com a
     pedra na loja, escolher a rota deixa de importar e o mapa vira decoracao. */
  { id:'S686', arquivo:CAT, nome:'a pedra evolutiva vira compravel',
    real:'"e so mais uma porta" — e a porta que tira o mapa da decisao',
    de:"    faixa: 'raro', porta: 'drop', fonte: 'vulcao',",
    para:"    faixa: 'raro', porta: 'loja', fonte: 'vulcao'," },

  /* O QUE MAIS DECIDE BATALHA PASSA A CAIR POR SORTE. Um jogador azarado fica
     atras de um sortudo naquilo que decide o combate, e nenhum dos dois fez
     nada diferente. */
  { id:'S687', arquivo:CAT, nome:'o Focus Sash passa a cair por sorte',
    real:'"mais chance de achar coisa boa" — para quem tem sorte, e so',
    de:"    faixa: 'muitoRaro', porta: 'bau', andarMinimo: 10,",
    para:"    faixa: 'muitoRaro', porta: 'drop', fonte: 'gelo'," },

  /* O TETO DE USO SOME DO EXP. SHARE. Ele deixa de ser escolha e vira
     obrigacao — e quem nao o tem joga um jogo mais lento por nao ter sorte. */
  { id:'S688', arquivo:CAT, nome:'o Exp. Share perde o teto de uso',
    real:'"o jogador merece usar o que conquistou" — merece; sem teto ele PRECISA',
    /* O `custoEssencia` saiu do catálogo no 1.29 — o preço passou a vir da
       FAIXA, no motor do Estilhaço. O defeito continua o mesmo: sem o teto, o
       Exp. Share deixa de ser escolha e vira obrigação. */
    de:"    faixa: 'raro', porta: 'troca', fonte: 'floresta', /* o bioma INICIAL leva o item que o novato mais usa */ usosPorRun: 1,",
    para:"    faixa: 'raro', porta: 'troca', fonte: 'floresta', /* o bioma INICIAL leva o item que o novato mais usa */" },

  /* AS PEDRAS SE AMONTOAM NUM BIOMA SO. Sobram lugares sem razao nenhuma para
     serem escolhidos, e o mapa deixa de ser uma decisao. */
  { id:'S689', arquivo:CAT, nome:'duas pedras caem no mesmo bioma',
    real:'"o jogador acha as duas de uma vez" — e nunca mais visita o outro lugar',
    de:"    faixa: 'raro', porta: 'drop', fonte: 'praia',",
    para:"    faixa: 'raro', porta: 'drop', fonte: 'vulcao'," },

  /* O ITEM DEIXA DE RESPEITAR O ESTAGIO. A pedra volta a cair no estagio 1, e o
     laco entre nivel, profundidade e evolucao — que tres blocos construiram —
     se desfaz numa linha. */
  { id:'S690', arquivo:'engine/drops.mjs', nome:'o item para de respeitar o estagio',
    real:'"o bioma ja filtra" — filtra ONDE, e nao QUAO FUNDO',
    de:'    (!cabe || cabe(i.faixa, estagio)) &&',
    para:'    true &&' },

  /* ══ 1.15 · A COMPOSIÇÃO DO BIOMA ══════════════════════════════════════
     A L-101. O que estes catorze protegem não é "a trilha curva" — é o conjunto
     de coisas que a curva podia quebrar sem ninguém ver: a estrada partida, a
     estrada na água, a peça em cima do chão pisado, e o detalhe que some.

     Três deles (S692, S697, S704) são defeitos que EU cometi durante o bloco e
     que um teste pegou. Defeito que já aconteceu uma vez é o que mais merece
     guarda: ele já provou que é alcançável. */

  /* A ESTRADA PARTE EM DOIS. O passeio da esquerda para a direita não é uma
     suavização — é a GARANTIA de que a faixa de duas linhas sempre se sobrepõe
     entre colunas vizinhas. Sem ele, um degrau de dois separa a trilha em
     pedaços que só se tocam pela quina. */
  { id:'S691', arquivo:COMPOS, nome:'a trilha volta a poder partir em dois',
    real:'"o passeio é só uma suavização" — ele é a garantia, e não o acabamento',
    de:'    const passo = Math.max(-1, Math.min(1, preso - anterior));\n    anterior += passo;',
    para:'    anterior = preso;' },

  /* O TETO ESTÉTICO VENCE O PISO DA ÁGUA. Em grade pequena a segunda linha da
     trilha cai DENTRO do mar. Foi defeito de verdade, achado pelo teste que
     varre alturas de 5 a 14 — a mesma classe do S577. */
  { id:'S692', arquivo:COMPOS, nome:'o teto estético volta a vencer o piso da água',
    real:'em grade pequena o jogador andaria dentro do mar',
    de:'  const piso = Math.max(0, (Math.floor(margem) || 0) - 2);\n  const teto = Math.min(2, piso);',
    para:'  const teto = 2;\n  const piso = Math.max(teto, (Math.floor(margem) || 0) - 2);' },

  /* A RÉGUA VOLTA. É o defeito ORIGINAL da L-101: uma faixa bege perfeitamente
     reta cruzando 1830 px de ponta a ponta. */
  { id:'S693', arquivo:COMPOS, nome:'a trilha volta a ser uma régua',
    real:'nada na natureza atravessa 44 tiles sem desviar de nada',
    de:'export const DESVIO_MAX = 3;',
    para:'export const DESVIO_MAX = 0;' },

  /* AS CURVAS PARAM DE CRESCER COM A LARGURA. Era metade da lacuna: "convocada
     em função da largura, e não só do bioma". */
  { id:'S694', arquivo:COMPOS, nome:'as curvas param de crescer com a largura',
    real:'no panorâmico a curva some numa ponta e o resto volta a ser campo liso',
    de:'export const curvasDe = cols => Math.max(1, Math.round(Math.max(1, cols) / COLUNAS_POR_CURVA));',
    para:'export const curvasDe = () => 1;' },

  /* SÓ MATA, OU SÓ CLAREIRA. Sem os dois extremos não há contraste — só um mapa
     mais cheio, que é a resposta que a lacuna mandou não dar. */
  { id:'S695', arquivo:COMPOS, nome:'as regiões param de alternar, e o contraste some',
    real:'"denso" e "vazio" deixam de existir como palavras quando só há um deles',
    de:"      tipo: i % 2 === 0 ? 'clareira' : 'mata',",
    para:"      tipo: 'mata'," },

  /* AS REGIÕES ENCOLHEM. Foi a PRIMEIRA versão: cobria 12% do chão e a razão
     entre a oitava mais cheia e a mais vazia deu 1,13 — praticamente liso. */
  { id:'S696', arquivo:COMPOS, nome:'as regiões encolhem e o chão volta a ser uniforme',
    real:'três manchinhas do mesmo tamanho num panorâmico são três manchinhas',
    de:'      raio: faixa * (0.62 + r(3) * 0.34),',
    para:'      raio: faixa * (0.30 + r(3) * 0.22),' },

  /* A COMPENSAÇÃO VOLTA A SER CONSTANTE. Constante escolhida por raciocínio é
     uma medição que ninguém fez: o oásis perdeu 43% do detalhe do chão, e um
     bioma menos denso não parece quebrado — parece pobre. */
  { id:'S697', arquivo:COMPOS, nome:'a compensação volta a ser constante em vez de medida',
    real:'"as regiões se alternam, uma puxa o quanto a outra puxa" — e não puxam',
    de:'export const quantosCandidatos = (quantos, media = PESO_BASE) =>\n  Math.round(Math.max(0, quantos) * SOBRA / Math.max(0.05, media));',
    para:'export const quantosCandidatos = quantos => Math.round(Math.max(0, quantos) * SOBRA);' },

  /* A CLAREIRA VIRA BURACO. Chão inteiramente limpo lê como falta de textura, e
     não como clareira. */
  { id:'S698', arquivo:COMPOS, nome:'a clareira vira buraco em vez de respiro',
    real:'"clareira é onde não tem nada" — e aí ela lê como bug, não como lugar',
    de:'export const PESO_CLAREIRA = 0.18;',
    para:'export const PESO_CLAREIRA = 0;' },

  /* A PEÇA SOBRE A TRILHA É DESCARTADA. Descartar esvazia a beira da curva, que
     é justamente onde o olho está. */
  { id:'S699', arquivo:COMPOS, nome:'a peça sobre a trilha é descartada em vez de assentada',
    real:'"basta não deixar na estrada" — e a curva fica sem acostamento',
    de:'  return Math.max(1, t - 1);',
    para:'  return ly;' },

  /* A PEÇA DE TRILHA PARA DE SEGUIR A CURVA. Uma pedra de beira de estrada
     parada na linha reta antiga aparece no meio do mato. */
  { id:'S700', arquivo:COMPOS, nome:'a peça de trilha para de seguir a curva',
    real:'a faixa da decoração ainda fala em eixo, e o eixo deixou de ser a estrada',
    de:"  if (onde === 'trilha') return t + (ly - eixo >= 1 ? 1 : 0);",
    para:"  if (onde === 'trilha') return ly;" },

  /* A ESTRADA VOLTA A SER PINTADA COMO ESCADA. Passava em TODOS os testes e era
     feia: degraus de 16 px em ângulo reto. É o defeito que só o olho pega, e por
     isso ele tem de ter guarda — o portão visual mede a impressão digital. */
  { id:'S701', arquivo:COMPOS, nome:'a estrada volta a ser pintada como escada',
    real:'a curva contínua já existia; o desenho usava o arredondamento dela',
    de:'  return a + (b - a) * (f * f * (3 - 2 * f));',
    para:'  return a;' },

  /* A BEIRA VIRA UMA CURVA MATEMÁTICA LIMPA. Traço perfeito num pixel art de
     16 px lê como vetor, e o mundo aqui é GBA. */
  { id:'S702', arquivo:COMPOS, nome:'a beira da estrada perde o esfarelado',
    real:'"a curva já está suave" — suave demais denuncia que ninguém desenhou',
    de:'export const ESFARELA = 2;',
    para:'export const ESFARELA = 0;' },

  /* A MÉDIA VOLTA A SER MEDIDA NO VALOR CRU. `aceita` satura em 1: duas matas
     sobrepostas dão peso 3,8 e continuam aceitando 100%, não 158%.
     Medir o que não é usado é não medir. */
  { id:'S703', arquivo:COMPOS, nome:'a média do peso volta a ser medida no valor cru',
    real:'a média infla, o fator encolhe, e o chão sai mais pobre que o pedido',
    de:'      soma += Math.min(PESO_MATA, pesoEm(lista, lx, ly));',
    para:'      soma += pesoEm(lista, lx, ly);' },

  /* A RECUSA VOLTA A BEBER DO MESMO LCG QUE SORTEIA A LINHA. Valores
     consecutivos de um congruencial andam numa rede, e `ly` é justo o que decide
     o peso. Três biomas devolveram 62%, 85% e 95% do detalhe pedido — com a
     mesma fórmula de compensação. */
  { id:'S704', arquivo:MUNDO, nome:'a recusa volta a beber do mesmo gerador que a linha',
    real:'"é aleatório dos dois lados" — e correlacionado entre os dois',
    de:'    if (!aceita(pesoEm(mapa, lx, ly), mistura(sementeAceite + i * 397, lx * 31 + ly)))\n      continue;',
    para:'    if (!aceita(pesoEm(mapa, lx, ly), rnd())) continue;' },

  /* ══ 1.16 · O FOCO ═══════════════════════════════════════════════════════
     A L-102. O que estes protegem é o DESENHO, e não a aritmética — a conta é
     fácil, e o que se perde numa refatoração é o MOTIVO de cada número.

     Quatro deles (S708, S711, S713, S714) são defeitos que eu cometi durante o
     bloco e que a sabotagem dirigida pegou. Defeito que já aconteceu uma vez é
     o que mais merece guarda: ele já provou que é alcançável. */

  { id:'S705', arquivo:FOCO, nome:'o Guia passa a ajudar a si mesmo',
    real:'"ele esta na equipe tambem" — e ai ele deixa de ser suporte e vira bonus',
    de:"const guiasQueMeAjudam = guias - (c?.foco === 'guia' ? 1 : 0);",
    para:'const guiasQueMeAjudam = guias;' },

  { id:'S706', arquivo:FOCO, nome:'o bonus da equipe vira SOMA em vez de media',
    real:'tres iguais dariam +90%, e "leve tres iguais" e o contrario de build',
    de:'    encontros: encontros / n,',
    para:'    encontros: encontros - n + 1,' },

  { id:'S707', arquivo:FOCO, nome:'a troca de foco sai de graca',
    real:'gratis, o foco deixa de ser escolha e vira botao que se aperta antes de sair',
    de:'descansaAte: trocando ? Number(agora || 0) + MS_DE_TROCA : (criatura.descansaAte ?? 0),',
    para:'descansaAte: criatura.descansaAte ?? 0,' },

  /* CASTIGO FORA DO PERFIL. Foi defeito meu: o Batedor na Vigilia levava o custo
     sem o bonus. Mesmo erro que a L-108 descarta para a tipagem. */
  { id:'S708', arquivo:FOCO, nome:'o foco de perfil volta a castigar fora dele',
    real:'"o custo e do foco, vale sempre" — e ai o jogador mantem uma equipe por perfil',
    de:'const e = (bruto?.perfil && bruto.perfil !== perfil) ? null : bruto;',
    para:'const e = bruto;' },

  { id:'S709', arquivo:FOCO, nome:'a garantia do Vigia vira media em vez da maior',
    real:'meia garantia nao existe: ou vem um raro, ou nao vem',
    de:'garantido = Math.max(garantido, e?.garantido ?? 0);',
    para:'garantido += (e?.garantido ?? 0) / 3;' },

  { id:'S710', arquivo:FOCO, nome:'o nivel minimo do foco cai para zero',
    real:'escolher sem saber nada nao e decisao — e sorteio com passos a mais',
    de:'export const NIVEL_PARA_ESCOLHER = 12;',
    para:'export const NIVEL_PARA_ESCOLHER = 0;' },

  /* A COLHEITA PARA DE PASSAR A EQUIPE. Escapou na primeira leva: o teste de
     integracao media um campo que era sempre zero. */
  { id:'S711', arquivo:IDCOLH, nome:'a colheita para de passar a equipe ao foco',
    real:'a conta do foco fica certa e ninguem a usa — o sistema inteiro desligado',
    de:'const efeitos = efeitosDa(equipeFoco, x.perfil);',
    para:'const efeitos = efeitosDa([], x.perfil);' },

  { id:'S712', arquivo:'engine/expedicao.mjs', nome:'o sorteio ignora o foco nos encontros',
    real:'"o foco ja esta na planta" — esta, e o sorteio nao le',
    /* Renomeado no 1.27: a variável virou `comFoco`, e `quantos` passou a ser
       ela vezes o fator da equipe. O defeito é o mesmo — apagar o foco. */
    de:'const comFoco = efeitos ? encontrosCom(base, efeitos) : base;',
    para:'const comFoco = base;' },

  /* O S713 — "o vies do foco some do sorteio" — FOI REMOVIDO no proprio 1.16.
     Nao por ser chato de pegar: por deixar de existir. Quando o vies saiu do
     sistema de foco (ver a nota longa no `engine/foco.mjs`), a soma que ele
     apagava virou soma de zero, e o Q2 marcou na hora: PASSOU, porque nao
     havia como aparecer.

         Um defeito que nao pode ser observado nao e defeito.

     E o codigo que ele guardava saiu junto — guardar caminho morto e pagar
     manutencao por uma protecao que nao protege. */
  { id:'S714', arquivo:'engine/expedicao.mjs', nome:'a garantia do Vigia some do sorteio',
    real:'o Vigia fica so com o custo — e o D-073 de volta',
    de:'  const garantidos = Math.min(quantos, raros.length ? pedidos : 0);',
    para:'  const garantidos = 0;' },

  { id:'S715', arquivo:IDCOLH, nome:'o material do foco nao chega no saque',
    real:'o Trilheiro e o Batedor perdem a metade que os define',
    de:'focoItemRaro: efeitos.itemRaro, focoMaterial: efeitos.material,',
    para:'focoItemRaro: efeitos.itemRaro,' },

  { id:'S716', arquivo:IDCOLH, nome:'o item raro do foco nao chega no saque',
    real:'o Sortudo vira um foco que so custa material',
    de:'focoItemRaro: efeitos.itemRaro, focoMaterial: efeitos.material,',
    para:'focoMaterial: efeitos.material,' },

  { id:'S717', arquivo:'engine/drops.mjs', nome:'o saque ignora o material do foco',
    real:'"a quantidade e do sorteio" — e o foco multiplica depois, de proposito',
    de:'item.quantidade = Math.max(1, Math.round(bruto * (Number(focoMaterial) || 1)));',
    para:'item.quantidade = bruto;' },

  { id:'S718', arquivo:'engine/drops.mjs', nome:'o Sortudo passa a trazer mais de TUDO',
    real:'mais de tudo nao e escolha — a Essencia e volume, e volume nao e sorte',
    de:"    : cru.map(l => (l.classe === 'essencia' ? l : { ...l, peso: l.peso * f }));",
    para:'    : cru.map(l => ({ ...l, peso: l.peso * f }));' },

  /* ══ 1.17 · O PAINEL E O HUD ═════════════════════════════════════════════
     Duas queixas do dono que eram UMA correcao: "a tela esta muito grande" e
     "quero mais zoom out". O piso do zoom e `largura_do_palco / 704`, entao um
     palco de 1841 px nao tem zoom out para dar. */

  { id:'S719', arquivo:HUD, nome:'a barra de progresso aparece ZERADA sem expedicao',
    real:'medidor parado em zero ensina que o medidor e enfeite',
    de:'  if (!x || !x.iniciadaEm || !x.terminaEm) return null;',
    para:'  if (!x) return { pct: 0 } && 0;' },

  { id:'S720', arquivo:HUD, nome:'o progresso passa de 1 e a barra sai do trilho',
    real:'expedicao vencida ha muito tempo desenha uma barra maior que a caixa',
    de:'  return Math.max(0, Math.min(1, (agora - x.iniciadaEm) / total));',
    para:'  return (agora - x.iniciadaEm) / total;' },

  { id:'S721', arquivo:HUD, nome:'a mochila do HUD volta a ser a ordem de insercao',
    real:'a ordem da bolsa e acidente de implementacao; a quantidade e informacao',
    de:'  todos.sort((a, b) => b[1] - a[1]);',
    para:'' },

  { id:'S722', arquivo:HUD, nome:'o HUD mostra item com quantidade ZERO',
    real:'"tem zero" nao e ter — e ocupa o canto com a informacao menos util que existe',
    de:'    .filter(([id, n]) => n > 0 && id !== moeda);',
    para:'    .filter(([id]) => id !== moeda);' },

  { id:'S723', arquivo:HUD, nome:'a equipe do HUD perde o teto e vira parede',
    real:'seis cabecas em fila encostam no meio, e o meio e por onde o treinador anda',
    de:'  const fila = (equipe ?? []).slice(0, EQUIPE_NO_HUD).map(c => {',
    para:'  const fila = (equipe ?? []).map(c => {' },

  { id:'S724', arquivo:HUD, nome:'a mochila do HUD perde o teto',
    real:'quarenta icones no canto cobrem metade da cena',
    de:'  return [...fora, ...todos].slice(0, quantos);',
    para:'  return [...fora, ...todos];' },

  /* O TETO DE LARGURA DO PALCO. E a correcao inteira do bloco: sem ele o piso
     do zoom sobe com a tela e os niveis baixos somem de novo. */
  { id:'S725', arquivo:PAGINA, nome:'o palco volta a tomar a tela inteira',
    real:'"e so um max-width" — e o piso do zoom sobe junto e come os niveis baixos',
    de:'  width:min(100%, 1041px, 91vh);aspect-ratio:704 / 448;',
    para:'  width:100%;aspect-ratio:704 / 448;' },

  { id:'S726', arquivo:PAGINA, nome:'a alca do palco volta a ser so vertical',
    real:'"ela so fecha espremendo pra cima ou pra baixo" — queixa textual do dono',
    de:'  resize:both;overflow:hidden;',
    para:'  resize:vertical;overflow:hidden;' },

  { id:'S727', arquivo:PAGINA, nome:'o HUD passa a capturar o clique',
    real:'ele fica por cima do palco inteiro e come o arraste da alca',
    de:'#idleHud{position:absolute;inset:0;z-index:5;pointer-events:none;',
    para:'#idleHud{position:absolute;inset:0;z-index:5;' },

  { id:'S728', arquivo:PAGINA, nome:'a caixa do HUD desancora e cai no meio da cena',
    real:'"sem atrapalhar em nada" — e atrapalhar tem endereco: o meio e do treinador',
    de:'.hudBaixoD{right:10px;bottom:10px}',
    para:'.hudBaixoD{}' },

  /* ══ 1.19 · O REGISTRO VIRA POKÉDEX, E A ESCADA GANHA SEGUNDA METADE ═════
     As vagas param nas 45 especies. O elenco tem muito mais, e depois do 45
     completar o registro nao pagava nada — o mesmo defeito que a L-105 mediu no
     nivel: a escada acaba e o numero continua andando. */

  { id:'S729', arquivo:EXPED, nome:'a escada de encontros some do teto',
    real:'"o teto e constante" — era, ate 101 especies ficarem sem recompensa',
    de:'export const tetoDeEncontros = (vistas, total) =>\n  TETO_ENCONTROS + bonusDeEncontros(vistas, total);',
    para:'export const tetoDeEncontros = () => TETO_ENCONTROS;' },

  { id:'S730', arquivo:EXPED, nome:'o bonus do marco vale ANTES do marco',
    real:'a escada perde os degraus e vira rampa — e ninguem persegue uma rampa',
    de:'  const porMarco = MARCOS_ENCONTROS.reduce((a, m) => a + (n >= m.em ? m.ganho : 0), 0);',
    para:'  const porMarco = MARCOS_ENCONTROS.reduce((a, m) => a + (n >= m.em - 10 ? m.ganho : 0), 0);' },

  { id:'S731', arquivo:EXPED, nome:'completar rende o mesmo que um degrau qualquer',
    real:'terminar deixa de ser diferente de progredir, e o fim deixa de ser um fim',
    /* O número mudou no 1.27 (L-132): +2 num teto de 30 era 6%, e completar a
       dex é o feito mais difícil do jogo. O defeito é o mesmo — igualar o fim
       a mais um degrau qualquer. */
    de:'export const GANHO_COMPLETO = 6;',
    para:'export const GANHO_COMPLETO = 4;' },

  /* O TETO DA DEX VOLTA A SER CONSTANTE NO MOTOR. E o §Gen2, e ele pegou a
     primeira versao deste bloco: `{ em: 146 }` estava escrito aqui. */
  { id:'S732', arquivo:EXPED, nome:'completar volta a ser um numero, e nao uma relacao',
    real:'o tamanho da dex e DADO do pack — no motor, a Gen 2 vira cacada a numeros',
    de:'  const completo = Number.isFinite(T) && T > 0 && n >= T ? GANHO_COMPLETO : 0;',
    para:'  const completo = n >= 146 ? GANHO_COMPLETO : 0;' },

  { id:'S733', arquivo:EXPED, nome:'o fim da escada vira "faltam zero"',
    real:'a tela precisa distinguir "faltam zero" de "nao ha mais", e o zero confunde',
    de:'    return { em: T, faltam: T - n, ganho: GANHO_COMPLETO, completo: true };\n  return null;',
    para:'    return { em: T, faltam: T - n, ganho: GANHO_COMPLETO, completo: true };\n  return { em: 0, faltam: 0, ganho: 0 };' },

  { id:'S734', arquivo:CAMPO, nome:'a tela volta a mostrar o teto FIXO',
    real:'quem passou de marco ve o numero errado — mentira por omissao num contador',
    de:'  const tetoHoje = tetoDeEncontros(vistas, total);',
    para:'  const tetoHoje = TETO_ENCONTROS;' },

  { id:'S735', arquivo:CAMPO, nome:'a tela para de dizer o proximo degrau',
    real:'sem isso as especies depois da ultima vaga nao tem motivo visivel para existir',
    de:'  const px = proximoEncontro(vistas, total);',
    para:'  const px = null;' },

  /* O NOME DO REGISTRO CRAVADO NA TELA. O motor nao pode nomear o tema (§0.3),
     e a tela nao pode inventar o nome — ele vem do pack. */
  { id:'S736', arquivo:CAMPO, nome:'o nome do registro e cravado em vez de vir do pack',
    real:'trocar o tema deixaria a tela dizendo o nome do tema antigo',
    de:"const nomeDoRegistro = () => PACK.rotulos?.registro ?? 'registro';",
    para:"const nomeDoRegistro = () => 'Pokedex';" },

  /* ══ 1.20 · A POKEDEX ═══════════════════════════════════════════════════
     A referencia e a do Black/White, que o dono mandou. O CONTEUDO e outro, e a
     diferenca tem nome: a do cartucho diz o que a criatura E; a nossa diz
     tambem ONDE ELA MORA E COMO PEGA-LA. */

  { id:'S737', arquivo:PDXD, nome:'a busca por nome vaza especie nao vista',
    real:'achar pelo nome revela a especie sem te-la encontrado, e mata a silhueta',
    de:'    return viu(e.dex) && normal(e.n).includes(q);',
    para:'    return normal(e.n).includes(q);' },

  { id:'S738', arquivo:PDXD, nome:'a caixa para de contar como capturada',
    real:'guardar na caixa nao desfaz a captura',
    de:'  new Set((e?.criaturas ?? []).map(c => Number(c?.dex)).filter(Number.isFinite));',
    para:'  new Set((e?.criaturas ?? []).filter(c => !c?.naCaixa).map(c => Number(c?.dex)));' },

  { id:'S739', arquivo:PDXD, nome:'capturadas passa de vistas',
    real:'quem tem a criatura viu a especie — a segunda barra sairia do trilho',
    de:'    pegos: Math.min(p, n, total),',
    para:'    pegos: p,' },

  /* A CONDICAO DESCONHECIDA SOME. Sumir e a tela prometer que basta o nivel
     quando o pack pede outra coisa — e o jogador farma a toa ate desistir. */
  { id:'S740', arquivo:PDXD, nome:'a exigencia desconhecida some em silencio',
    real:'"so nivel e item importam" — e o pack pode declarar o que quiser',
    de:"    if (!['nivel', 'item', 'vinculo'].includes(k)) partes.push(`${k}: ${exige[k]}`);",
    para:'    ;' },

  { id:'S741', arquivo:PDXD, nome:'a linha evolutiva perde a exigencia',
    real:'a linha vira enfeite: o jogador ve que evolui e nao sabe COMO',
    de:'    return { dex: d, estagio: estagioDe(pack, d), exige: aresta?.exige ?? null };',
    para:'    return { dex: d, estagio: estagioDe(pack, d), exige: null };' },

  { id:'S742', arquivo:PDXD, nome:'o teto da barra volta a ser o teto teorico da serie',
    real:'255 e o teto da SERIE; num pack onde ninguem passa de 250 metade da regua nao distingue',
    de:'  let maior = 1;\n  for (const e of pack?.especies ?? [])\n    for (const v of e.s ?? []) if (v > maior) maior = v;\n  return maior;',
    para:'  return 255;' },

  /* A POKEDEX VOLTA A DEPENDER DE OUTRA ABA. Foi defeito de verdade, achado
     OLHANDO: abrir direto mostrava "0 de 146" com o registro cheio. */
  { id:'S743', arquivo:PDX, nome:'a Pokedex volta a depender de outra aba ter aberto',
    real:'tela que depende de outra ter sido visitada mente para quem entrou pela porta errada',
    de:'let lerEstado = () => carregar();',
    para:'let lerEstado = () => ({ registro: {} });' },

  { id:'S744', arquivo:PAGINA, nome:'o selo da pokebola perde a pausa de reduced-motion',
    real:'o selo carrega INFORMACAO, e informacao nao pode depender de animacao',
    de:'@media (prefers-reduced-motion:reduce){.pdxBola{animation:none}}',
    para:'' },

  /* O DESLOCAMENTO VOLTA A SER PORCENTAGEM. `background-position` em % nao e
     deslocamento: o CSS calcula `(caixa - imagem) x pct`, e com a imagem 24x
     maior a tira some da tela. Aconteceu. */
  { id:'S745', arquivo:PAGINA, nome:'o selo volta a se deslocar em porcentagem',
    real:'"% e px dao no mesmo" — nao dao, e a tira some',
    de:'@keyframes pdxGira{to{background-position-x:calc(var(--lado) * var(--n) * -1)}}',
    para:'@keyframes pdxGira{to{background-position-x:-2400%}}' },

  /* ══ 1.21 · A EVOLUÇÃO ═══════════════════════════════════════════════════
     A L-114, e ela corrige um erro MEU: eu disse ao dono que a evolução não
     existia. O motor tinha 130 linhas funcionando e o pack, 72 arestas.

         o motor le `inst.especie` · o save guarda `dex`

     Duas metades certas que nunca se encontraram nao produzem erro. Produzem
     SILENCIO, que e mais dificil de achar que um vermelho. */

  { id:'S746', arquivo:EVOI, nome:'a ponte dex->especie quebra',
    real:'o sintoma seria "esta criatura nao evolui", sem erro nenhum',
    de:'export const paraMotor = c => ({ ...c, especie: Number(c?.dex ?? c?.especie) });',
    para:'export const paraMotor = c => ({ ...c });' },

  { id:'S747', arquivo:EVOI, nome:'o item com ZERO na bolsa conta como ter',
    real:'um item com zero nao e um item que se tem',
    de:'  Object.entries(bolsa ?? {}).filter(([, n]) => n > 0).map(([id]) => id);',
    para:'  Object.keys(bolsa ?? {});' },

  /* DUAS VERDADES PARA O MESMO NUMERO. `especie` e `dex` no mesmo objeto e
     como eles divergem no dia em que alguem escrever so num deles. */
  { id:'S748', arquivo:EVOI, nome:'a criatura volta com especie E dex',
    real:'"deixa os dois, nao custa nada" — custa no dia em que discordarem',
    de:'  const { especie, ...resto } = nova;\n  return { criatura: { ...resto, dex: especie }, de: antes, para: especie, aresta };',
    para:'  return { criatura: { ...nova, dex: nova.especie }, de: antes, para: nova.especie, aresta };' },

  { id:'S749', arquivo:EVOI, nome:'aplicar MUTA a criatura de entrada',
    real:'a tela precisa do ANTES e do DEPOIS, e meia-evolucao gravada e pior que nenhuma',
    de:'  const antes = Number(criatura.dex);',
    para:'  const antes = Number(criatura.dex); criatura.dex = -1;' },

  { id:'S750', arquivo:EVOI, nome:'a recusa perde o QUE falta',
    real:'recusa sem endereco e o D-067, que ja custou um bloco a este projeto',
    de:"  return { evolui: true, falta: melhor?.falta ?? '?', para: melhor?.para ?? null };",
    para:"  return { evolui: true, falta: '?', para: null };" },

  /* A ALTERNANCIA E A ANIMACAO INTEIRA. Sem acelerar, o resto e um flash com o
     sprite trocado — e e por isso que as animacoes antigas da serie, que o dono
     dispensou, parecem pobres: elas piscam, nao aceleram. */
  { id:'S751', arquivo:EVOT, nome:'a alternancia para de acelerar',
    real:'"piscar ja e animacao" — piscar e o que a serie antiga fazia',
    de:'export const RAZAO = 0.82;',
    para:'export const RAZAO = 1;' },

  { id:'S752', arquivo:EVOT, nome:'as trocas caem para tres',
    real:'com poucas trocas a aceleracao nao se percebe como aceleracao',
    de:'export const TROCAS = 12;',
    para:'export const TROCAS = 3;' },

  { id:'S753', arquivo:EVOT, nome:'os aneis viram cor fixa',
    real:'a transicao deixa de pertencer aquela criatura e vira cartao generico',
    de:"  return PACK.tipos?.cores?.[t] ?? 'var(--ac, #5ee7ff)';",
    para:"  return '#5ee7ff';" },

  /* A PEDRA DEIXA DE SER CONSUMIDA. Uma so evoluiria a caixa inteira, e o
     gargalo do requisito do dono — "a pedra cobra presenca" — sumiria na
     primeira evolucao por item. */
  { id:'S754', arquivo:TELA, nome:'a pedra deixa de ser consumida',
    real:'uma Pedra do Fogo evoluiria a caixa inteira',
    de:'    if (item && (E.bolsa[item] ?? 0) > 0) E.bolsa[item] -= 1;',
    para:'' },

  { id:'S755', arquivo:TELA, nome:'a animacao toca ANTES de gravar',
    real:'quem fechar a aba no meio perde a evolucao — e ela aconteceu no JOGO',
    de:'    salvarE();\n    ligarEvolucao();\n    tocarEvolucao(r.de, r.para',
    para:'    ligarEvolucao();\n    tocarEvolucao(r.de, r.para' },

  /* ══ 1.22 · O NOME DO ITEM, E A PENEIRA QUE FALTAVA ══════════════════════
     O bloco nasceu de um defeito MEU no 1.21: `nomeDoItemPack` — um nome que
     eu inventei escrevendo a linha e nunca declarei. A suite fechou VERDE em
     1724 testes e a aba de Rotas do dono parou de desenhar, com o console
     limpo para quem nao abrisse o inspetor. E o D-074.

     A causa de fundo nao foi a falta de portao: foi um portao que MENTIA. O
     cabecalho de `ligacao.mjs` prometia "PEGA simbolo usado como funcao sem
     origem no arquivo", e o corpo nunca fez isso. Eu li a promessa e deixei de
     escrever o teste porque "ja estava coberto". */

  { id:'S756', arquivo:INOME, nome:'o nome do item vira o id cru',
    real:'id na tela nao e um nome faltando: e um nome ERRADO, e quem le acha que aquilo e o nome',
    de:'  return (pack?.catalogo ?? []).find(i => i.id === chave)?.nome',
    para:'  return chave;' },

  { id:'S757', arquivo:INOME, nome:'a forma curried ignora o pack',
    real:'a mochila e o cartao mostrariam nomes diferentes para o mesmo item',
    de:'export const nomesDe = pack => id => nomeDoItem(pack, id);',
    para:'export const nomesDe = () => id => String(id ?? \'\');' },

  /* O ULTIMO RECURSO E O ID, E NAO O SILENCIO. Linha em branco na mochila e
     pior que id feio: ela some, e o jogador nao sabe que tem algo ali. */
  { id:'S758', arquivo:INOME, nome:'item sem cadastro some da tela',
    real:'"melhor nada do que id feio" — nada e um item invisivel que o jogador possui',
    de:'      ?? chave;', para:'      ?? \'\';' },

  /* TER E UMA FORMA DE TER VISTO. A invariante ja estava escrita em
     `progresso` e aplicada so num `Math.min` sobre o CONTADOR — e um `min`
     faz o numero parar de acusar sem fazer o fato parar de existir. */
  { id:'S759', arquivo:PDXD, nome:'ter deixa de contar como ter visto',
    real:'a linha da inicial saia "007 ? ???" COM o selo de capturada ao lado',
    de:'  for (const d of capturados(e)) s.add(d);', para:'' },

  { id:'S760', arquivo:PDXD, nome:'a uniao aceita chave que nao e numero',
    real:'save adulterado empurraria lixo para a contagem que move a escada de vagas',
    de:'  const s = new Set(Object.keys(e?.registro ?? {}).map(Number).filter(Number.isFinite));',
    para:'  const s = new Set(Object.keys(e?.registro ?? {}).map(Number));' },

  { id:'S761', arquivo:PDX, nome:'a Pokedex volta a resolver o nome sozinha',
    real:'foi a duplicacao que produziu os dois defeitos deste bloco, cada um por uma porta',
    de:"import { nomesDe } from './itens-nome.mjs';",
    para:'const nomesDe = () => id => id;' },

  /* A PENEIRA NOVA, SABOTADA NELA MESMA. Sem isto ela e uma suite que passa
     verde sobre qualquer coisa — que e exatamente o que a `ligacao` era para
     esta classe de defeito. */
  { id:'S762', arquivo:ORIGEM, nome:'a peneira de origem para de olhar a chamada',
    real:'o D-074 volta a passar: 1724 testes verdes e a aba do dono em branco',
    de:'    if (GLOBAIS.has(nome) || tem.has(nome)) continue;',
    para:'    continue;' },

  /* A SUBSTITUICAO DO TEMPLATE E CODIGO, e apaga-la cega a peneira no lugar
     exato onde o D-074 morava: a tela inteira deste projeto e escrita em
     template, e a chamada quebrada estava dentro de um ${…}. A versao
     anterior deste defeito era INOCUA — ela punha um `replace` de crase
     DEPOIS do `soCodigo`, que ja tinha tirado as crases. Sabotagem que nao
     muda comportamento nenhum e um defeito que nao existe. */
  { id:'S763', arquivo:ORIGEM, nome:'a substituicao do template vira texto',
    real:'o HTML deste projeto e escrito em template: cega ali, ela cega onde a tela nasce',
    de:"      if (c === '$' && d === '{') { i += 2; pilha[pilha.length - 1] = 0; continue; }",
    para:'' },

  /* O IDENTIFICADOR E UNICODE. Com ASCII a peneira lia `oDoAtor` — o pedaco
     depois da cedilha de `lacoDoAtor` — e acusava de orfa uma funcao
     declarada tres linhas acima. Alarme falso e o unico modo de falha que mata
     uma peneira: desligada, ela nao pega mais nada. */
  { id:'S764', arquivo:ORIGEM, nome:'a peneira volta ao identificador ASCII',
    real:'nome acentuado e legal em JS, e este projeto escreve em portugues',
    de:'  for (const m of limpo.matchAll(/(?<![.\\p{L}\\p{N}_$?])([\\p{L}_$][\\p{L}\\p{N}_$]*)\\s*\\(/gu)) {',
    para:'  for (const m of limpo.matchAll(/(?<![.\\w$?])([A-Za-z_$][\\w$]*)\\s*\\(/g)) {' },

  /* O JEITO SILENCIOSO DE DESLIGAR UMA PENEIRA E ENCOLHER O ALCANCE DELA. A
     suite continua VERDE, so que sobre menos codigo — e ninguem percebe que o
     `server/` parou de ser varrido. E o S109 chegando por outra porta. */
  { id:'S765', arquivo:ORIGEM, nome:'a peneira varre so uma pasta',
    real:'verde sobre um terco do repositorio le igual a verde sobre o repositorio',
    de:"export const PASTAS = ['app/modules', 'engine', 'server'];",
    para:"export const PASTAS = ['app/modules'];" },

  /* ══ 1.23 · A CAPTURA VIRA UM MOMENTO, E AS FAIXAS PASSAM A SE VER ═══════
     Dois pedidos do dono no mesmo bloco, e eles sao a mesma coisa em dois
     tempos: a faixa e o que se le ANTES de jogar a bola; a animacao e o que
     acontece QUANDO se joga.

     A referencia foi VISTA — `tools/contato-gif.mjs` monta a folha de contato
     dos 119 quadros do gif que o dono plantou. Ela nao tem chacoalhada e nao
     tem final: da o movimento da bola, e o resto e nosso. */

  /* A INVARIANTE DE JOGO DESTE BLOCO. Um numero de balancos que depende do
     resultado entrega o final antes da hora, e o jogador aprende a parar de
     assistir no primeiro. */
  { id:'S766', arquivo:CAPTEL, nome:'a animacao entrega o resultado antes da hora',
    real:'"mostrar antes e mais emocionante" — e o oposto: mata a espera',
    de:'  if (c < msDoChacoalho()) return CASA_TRAVADA;',
    para:'  if (c < msDoChacoalho()) return pegou ? CASA_TRAVADA : CASA_ABERTA;' },

  { id:'S767', arquivo:CAPTEL, nome:'as pausas param de crescer',
    real:'pausa constante le como relogio; crescente le como decisao sendo tomada',
    de:'export const PAUSAS = [200, 280, 360];',
    para:'export const PAUSAS = [280, 280, 280];' },

  { id:'S768', arquivo:CAPTEL, nome:'a entrada some e a criatura nao e vista',
    real:'a cena escurece a pagina inteira e nao apresenta ninguem',
    de:'export const MS_ENTRADA = 420;', para:'export const MS_ENTRADA = 0;' },

  /* A BOLA DESENHADA E A BOLA USADA. Palavra do dono: "jogar uma Great e ver a
     animacao da Ultra e pior que nao ter animacao nenhuma". */
  { id:'S769', arquivo:CAPTEL, nome:'a animacao usa sempre a mesma bola',
    real:'a arte deixa de casar com o objeto que o jogador gastou',
    de:'export const linhaDaBola = id => {\n  const i = LINHAS.indexOf(String(id));\n  return i < 0 ? 0 : i;\n};',
    para:'export const linhaDaBola = () => 0;' },

  /* MENTIRA NUM LAUDO ensina o jogador a ignorar o laudo. */
  { id:'S770', arquivo:CAPTEL, nome:'o laudo diz "faltou pouco" com 4%',
    real:'um laudo que exagera vira um laudo que ninguem le',
    de:'  const quase = pc != null && pc >= 55;', para:'  const quase = pc != null;' },

  { id:'S771', arquivo:CAPTEL, nome:'o laudo esquece a CAIXA',
    real:'capturar com a equipe cheia parece que nao aconteceu nada',
    de:"        ? 'A equipe estava cheia — ele foi para a CAIXA.'\n        : 'Ele entrou na sua equipe.',",
    para:"        ? 'Ele entrou na sua equipe.'\n        : 'Ele entrou na sua equipe.'," },

  { id:'S772', arquivo:CAPTEL, nome:'a fuga termina com a bola travada',
    real:'um final que e a ausencia do outro ensina que o jogo travou',
    /* REALVADO: o expoente 0.55 entrou quando a fuga foi sincronizada — a bola
       passava metade do veredito quase FECHADA enquanto a criatura ja estava de
       volta na tela. O comportamento e o defeito sao os mesmos. */
    de:'  const v = Math.min(1, (c - msDoChacoalho()) / MS_VEREDITO) ** 0.55;\n  return Math.round(CASA_TRAVADA - v * (CASA_TRAVADA - CASA_ABERTA));',
    para:'  return CASA_TRAVADA;' },

  /* ── AS CINCO FAIXAS ─────────────────────────────────────────────────
     Tres telas definiam as cores e as tres discordavam. E a mais rara usava
     `var(--gold)`, que MUDA COM O TEMA: ciano no padrao, roxo no shadow — a
     coisa mais rara do jogo vestia a cor de outra faixa. */
  { id:'S773', arquivo:RARI, nome:'a faixa mais rara volta para a cor do tema',
    real:'raridade e informacao: ela nao pode mudar de significado com o tema',
    de:"  lendario:  { cor: '#ff5a4d', brilho: 22, pulso: true,  rotulo: 'lendário' },",
    para:"  lendario:  { cor: '#00e5ff', brilho: 22, pulso: true,  rotulo: 'lendário' }," },

  { id:'S774', arquivo:RARI, nome:'o comum ganha brilho',
    real:'a AUSENCIA de brilho no comum e o fundo contra o qual o resto aparece',
    de:"  comum:     { cor: '#a2adb8', brilho: 0,  pulso: false, rotulo: 'comum' },",
    para:"  comum:     { cor: '#a2adb8', brilho: 14, pulso: false, rotulo: 'comum' }," },

  { id:'S775', arquivo:RARI, nome:'tudo pulsa',
    real:'movimento em toda parte e movimento em lugar nenhum',
    de:"  raro:      { cor: '#4d9dff', brilho: 13, pulso: false, rotulo: 'raro' },",
    para:"  raro:      { cor: '#4d9dff', brilho: 13, pulso: true, rotulo: 'raro' }," },

  { id:'S776', arquivo:RARI, nome:'faixa desconhecida devolve nada',
    real:'faixa nova no pack apareceria sem cor — o estado do qual o lendario saiu',
    de:'export const daFaixa = f => RARIDADE[f] ?? RARIDADE.comum;',
    para:'export const daFaixa = f => RARIDADE[f];' },

  { id:'S777', arquivo:RARI, nome:'os canais divergem do hex',
    real:'o fundo suave e a borda passariam a ser cores diferentes da MESMA faixa',
    de:'  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));',
    para:'  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) >> 1);' },

  /* ── O SOM DA CAPTURA, E A TRAVA QUE EU QUEBREI AO ACRESCENTA-LO ───────
     A trava era um booleano de vista. Ao dar som a captura eu a abri para as
     duas telas de uma vez — e o HITBOX DA ARENA voltou a tocar na aba das
     rotas, que e a queixa que fez a trava existir. O Q5 pegou.

       A pergunta certa nunca foi "esta vista toca som?". E "este som pertence
       a esta vista?". */
  { id:'S778', arquivo:AUDIO2, nome:'a trava do som volta a ser por VISTA',
    real:'"e a mesma coisa" — nao e: o hitbox da arena vaza para a aba das rotas',
    /* REALVADO: a decisao virou UM predicado, `podeSoar`, e a sonda do Q5
       passou a perguntar por ele. Antes havia dois caminhos para a mesma
       pergunta, e o teste media o que o defeito nao tocava. */
    de:'const podeSoar = kind => soundEnabled && casaDe(kind) === vistaAtual;',
    para:"const podeSoar = () => soundEnabled && (vistaAtual === 'viewArena' || vistaAtual === 'viewIdle');" },

  { id:'S779', arquivo:AUDIO2, nome:'som nao classificado deixa de cair na arena',
    real:'efeito novo sem casa passaria a tocar em TODA tela — o lado inseguro do erro',
    de:"const casaDe = kind => CASA_DO_SOM[kind] ?? 'viewArena';",
    para: 'const casaDe = kind => CASA_DO_SOM[kind] ?? vistaAtual;' },

  /* O SOM DO RESULTADO TEM UMA BOCA SO. Com tres `sfx` espalhados, apagar um
     deles nao reprovava nada — os outros dois soavam nos testes que existiam. */

  { id:'S780', arquivo:CAPCEN, nome:'o balanco fica mudo',
    real:'sem som, tres balancos sao mimica — a pausa vira ausencia',
    de:"            if (f.nome.startsWith('balanco')) sfx('balanco');",
    para:'' },

  { id:'S781', arquivo:CAPCEN, nome:'o som do resultado emudece',
    real:'reduced-motion e sobre MOVIMENTO, e som nao se move',
    de:"    sfx(res?.capturou ? 'capturou' : 'fugiu');\n  };",
    para:'  };' },

  { id:'S782', arquivo:CAPCEN, nome:'o final nao e marcado no palco',
    real:'a onda de choque e o retorno da criatura perdem a cor e a diferenca',
    de:"  cx.querySelector('.capCena')?.setAttribute('data-fim', res?.capturou ? 'pegou' : 'fugiu');",
    para:'' },

  /* == 1.24 · OS MOMENTOS QUE FALTAVAM ===================================
     Dois pedidos do dono, e os dois nasceram da mesma critica que um amigo
     fez ao projeto: *"muito linear, site de velho, anos 2000"*.

       Uma interface sem momentos e uma lista de formularios. */

  /* O CUSTO E POR CRIATURA. `custoDe(perfil, tamanho)` cobra a EQUIPE, e
     chamado sem o tamanho devolve NaN — o cartao desenhou "89 -> NaN", e
     nenhum teste falava sobre ele porque o arquivo nao abria em Node. */
  { id:'S783', arquivo:RESUMO, nome:'o custo da barra vira o da equipe inteira',
    real:'o numero existe, esta errado, e so aparece na tela',
    de:'  const custo = perfis[perfil]?.custo ?? 0;',
    para:'  const custo = (perfis[perfil]?.custo ?? 0) * (equipe ?? []).length;' },

  { id:'S784', arquivo:RESUMO, nome:'a stamina do DEPOIS fica negativa',
    real:'barra negativa desenha para fora da caixa',
    de:'      antes, depois: Math.max(0, antes - custo),',
    para:'      antes, depois: antes - custo,' },

  /* O PISO SAI DO MOTOR, e nao de um numero escrito aqui: 20 na mao envelhece
     em silencio no dia em que a Batida mudar de preco. */
  { id:'S785', arquivo:RESUMO, nome:'o piso do aviso vira numero escrito a mao',
    real:'numero em documento tem data; numero em codigo nao avisa quando vence',
    /* REALVADO: a tabela de perfis passou a entrar por ARGUMENTO, para o
       teste conseguir provar que o piso segue o motor. */
    de:'  const piso = Math.min(...Object.values(perfis).map(x => x.custo));',
    para:'  const piso = 20;' },

  /* UM AVISO QUE DISPARA SEMPRE NAO AVISA NADA. A Vigilia custa 90 de 100:
     depois dela ninguem sai de novo, sempre. O que muda nao e a cor — e o
     SUJEITO da frase. */
  { id:'S786', arquivo:RESUMO, nome:'o aviso perde o caso de TODOS presos',
    real:'listar os mesmos nomes em toda Vigilia vira papel de parede',
    de:'  const todos = membros.length > 0 && travados.length === membros.length;',
    para:'  const todos = false;' },

  { id:'S787', arquivo:RESUMO, nome:'id inexistente vira linha no cartao',
    real:'o cartao desenharia o retrato de `undefined`',
    de:'  }).filter(Boolean);',
    para:'  });' },

  { id:'S788', arquivo:RESUMO, nome:'a duracao volta a ser minuto acumulado',
    real:'"180 min" nao responde se da tempo de fazer outra coisa',
    de:"  if (m < 60) return `${m} min`;",
    para:"  return `${m} min`;" },

  /* A CONFIRMACAO VEM ANTES DE `iniciarExpedicao`: cancelar nao pode deixar
     rastro. E ela e o primeiro MOMENTO do caminho da expedicao. */
  { id:'S789', arquivo:TELA, nome:'a expedicao sai sem confirmacao',
    real:'o clique errado manda tres criaturas para oito horas de Vigilia',
    de:'    if (!await confirmarExpedicao(E, escolha)) return;',
    para:'' },

  /* A POKEBOLA E INTERRUPTOR, e nao um segundo botao: o clique dela e o do
     cartao. Um interruptor que faz algo diferente do cartao que o cerca seria
     duas acoes onde o jogador ve uma. */
  { id:'S790', arquivo:EQUIPE, nome:'a pokebola acende sem a criatura estar escolhida',
    real:'o selo passa a dizer o contrario do cartao em que ele mora',
    de:'        <i class="criaBola${sel ? \' acesa\' : \'\'}" aria-hidden="true"',
    para:'        <i class="criaBola acesa" aria-hidden="true"' },

  /* O CARTAO recebe a escolha por ARGUMENTO. Guardada aqui, ela seria um
     segundo dono do estado — e quem desenha nao guarda. */
  { id:'S791', arquivo:EQUIPE, nome:'o cartao ignora a selecao que recebeu',
    real:'a escolha do jogador para de aparecer no cartao que ele clicou',
    de:'    const sel = selecao.includes(c.id);',
    para:'    const sel = false;' },
  /* == 1.25 · A LOJA PvE ================================================
     Ela mexe em SALDO, que e a coisa que este projeto mais protege. E o
     NPC saiu de um video com os DOIS no mesmo quadro — o corte e da janela,
     e ele e aritmetica, nao gosto. */

  /* A INVARIANTE QUE SUSTENTA A LOJA INTEIRA. Sem ela o jogador farma moeda
     clicando duas vezes, e nenhuma outra afirmacao importa. */
  { id:'S792', arquivo:LOJA, nome:'a loja vira torneira de moeda',
    real:'comprar e vender o mesmo item passa a dar lucro',
    de:'export const FRACAO_DE_VENDA = 0.4;',
    para:'export const FRACAO_DE_VENDA = 1.2;' },

  { id:'S793', arquivo:LOJA, nome:'a compra corrige em silencio em vez de recusar',
    real:'corrigir sem avisar faz o jogador desconfiar do proprio saldo',
    de:'  if (saldo < total)\n    throw new Error(`faltam ${total - saldo} para levar ${n}`);',
    para:'  if (saldo < total) n = Math.floor(saldo / preco);' },

  { id:'S794', arquivo:LOJA, nome:'a venda aceita mais do que o jogador tem',
    real:'a bolsa fica negativa e a moeda sai do nada',
    de:'  if (tem < n) throw new Error(`você tem ${tem}, e não ${n}`);',
    para:'' },

  { id:'S795', arquivo:LOJA, nome:'a moeda passa a se vender',
    real:'um laco de dinheiro infinito com dois cliques',
    de:"  if (id === moeda) throw new Error('não dá para vender a própria moeda');",
    para:'' },

  /* A LOJA MUTA O ESTADO QUE RECEBEU. Meia-compra gravada e pior que nenhuma. */
  { id:'S796', arquivo:LOJA, nome:'a compra escreve no estado recebido',
    real:'meia-compra gravada se algo falhar no meio',
    de:'  const bolsa = { ...(estado?.bolsa ?? {}) };\n  bolsa[moeda] = saldo - total;',
    para:'  const bolsa = estado.bolsa;\n  bolsa[moeda] = saldo - total;' },

  /* O BALCAO MOSTRA O QUE O JOGADOR NAO TEM. Esconder faz a lista encolher
     justamente para quem mais precisa de direcao — o jogador novo. */
  { id:'S797', arquivo:LOJA, nome:'o balcao esconde o que o jogador nao tem',
    real:'o mapa de objetivos some, e a loja vira so uma vitrine',
    de:'    .filter(i => i.valor != null)',
    para:'    .filter(i => i.valor != null && false)' },

  { id:'S798', arquivo:LOJA, nome:'item desconhecido volta valendo zero',
    real:'"nao compro isto" e "compro por zero" sao frases diferentes',
    de:'  return Number.isFinite(v) ? v : null;',
    para:'  return Number.isFinite(v) ? v : 0;' },

  /* O CORTE DO VIDEO E ARITMETICA. A caixa precisa da proporcao da METADE, ou
     a metade nao cabe sozinha nela — medido: com 1.15 sobravam ~300 px do
     outro NPC, e com foco 75% sobravam 160. */
  { id:'S799', arquivo:APPH, nome:'a loja PvE mostra o NPC errado',
    real:'e a falha que o dono nomeou: a arte deixa de casar com o lugar',
    /* REALVADO: a NPC deixou de esticar (`align-self`) quando o painel passou
       a ter altura FIXA — antes ela crescia com a aba e perdia a proporcao. */
    de:"  <div class=\"lojaNpc\" style=\"--foco:100%\">",
    para:'  <div class="lojaNpc" style="--foco:0%">' },

  { id:'S800', arquivo:APPH, nome:'a caixa do NPC perde a proporcao da metade',
    real:'sem 8:9 o corte deixa de ser exato e o outro NPC aparece de lado',
    /* REALVADO: a proporcao era escrita DUAS vezes, e este defeito estava na
       copia estreita enquanto a sonda media a 1440 — escapava por medir onde o
       defeito nao mora. A copia saiu; ele mora agora na regra que decide. */
    de:'  aspect-ratio:8/9;--foco:100%}',
    para:'  aspect-ratio:16/9;--foco:100%}' },

  /* O SOM: na abertura sim, ao fechar nunca. Regra literal do dono. */
  { id:'S801', arquivo:LOJAT, nome:'a loja abre muda',
    real:'o dono pediu o som na abertura de cada loja',
    de:'  if (v) { v.muted = false; v.currentTime = 0; v.play?.().catch(() => {}); }',
    para:'  if (v) { v.currentTime = 0; v.play?.().catch(() => {}); }' },

  { id:'S802', arquivo:LOJAT, nome:'fechar a loja nao emudece',
    real:'"ao fechar o som nao e permitido ouvir, em aba alguma do site"',
    de:'  if (v) { v.muted = true; v.pause?.(); }',
    para:'  if (v) { v.pause?.(); }' },

  /* A VENDEDORA FALA. Uma loja que abre com uma tabela de precos e um
     formulario; uma que abre com alguem falando e um lugar. */
  { id:'S803', arquivo:LOJAT, nome:'a vendedora fica muda',
    real:'a loja volta a ser um formulario com precos',
    de:'  fala = falaSorteada();',
    para:"  fala = '';" },
  /* == 1.26 · O CADEADO DO SALDO COMPRADO ================================
     A regra mais importante da economia ate agora. O medo do dono, e ele esta
     certo: doar e no primeiro dia ter a criatura boostada.

       O cadeado se abre GANHANDO. Comprar da TENTATIVAS; o poder vem do que
       se ganhou — e ganhar tem risco, que e o que impede isto de virar casa
       de cambio. */

  { id:'S804', arquivo:BOLSO, nome:'o saldo comprado volta a comprar poder',
    real:'e o cenario exato que o dono descreveu — doar e boostar no dia um',
    de:"  poder:     BUCKETS_LIVRES,   /* NUNCA o comprado */",
    para:'  poder:     BUCKETS,' },

  /* O LUCRO CAI LIVRE, e a APOSTA volta presa. Sem a segunda metade, quem
     apostou e recuperou estaria lavando o cadeado sem risco nenhum. */
  { id:'S805', arquivo:BOLSO, nome:'a aposta comprada volta LIVRE inteira',
    real:'lavar o cadeado com uma aposta em odd baixa, sem risco',
    de:"        { disponivel: { comprado: n, transferivel: lucro }, reservado: { comprado: -n } }, ref);",
    para:'        { disponivel: { transferivel: retorno }, reservado: { comprado: -n } }, ref);' },

  { id:'S806', arquivo:BOLSO, nome:'o lucro do comprado fica preso',
    real:'o cadeado nunca se abre, e comprar vira punicao permanente',
    de:"    if (b === 'comprado' && retorno > n) {",
    para:"    if (false) {" },

  /* A ORDEM: restrito antes de livre, ou o jogador acaba com uma bolsa so de
     trancado e se sente PUNIDO por ter comprado. */
  { id:'S807', arquivo:BOLSO, nome:'a ordem gasta o livre antes do restrito',
    real:'a bolsa vira so trancado, e comprar passa a parecer castigo',
    de:"export const ORDEM_CONSUMO = ['bonus', 'comprado', 'competitivo', 'transferivel'];",
    para:"export const ORDEM_CONSUMO = ['bonus', 'competitivo', 'transferivel', 'comprado'];" },

  /* O BONUS NAO PODE virar saldo livre — e a brecha que o §5.5 fecha, e o
     cadeado do 1.26 nao pode abri-la de carona. */
  { id:'S808', arquivo:BOLSO, nome:'o bonus passa a virar saldo livre tambem',
    real:'a arena vira conversor de dinheiro da casa em dinheiro do jogador',
    de:"    if (b === 'comprado' && retorno > n) {",
    para:"    if ((b === 'comprado' || b === 'bonus') && retorno > n) {" },

  /* O DEPOSITO CAI NO BALDE CERTO. Uma linha, e ela e o cadeado inteiro. */
  { id:'S809', arquivo:BANCO2, nome:'a compra volta a cair no balde livre',
    real:'sem ela ali, dinheiro real compra poder no primeiro dia',
    de:"  aplicar(() => creditar(S.carteira, 'PC_T_PURCHASE_CLEARED', 'comprado', valor, ref));",
    para:"  aplicar(() => creditar(S.carteira, 'PC_T_PURCHASE_CLEARED', 'transferivel', valor, ref));" },

  /* A RECUSA DIZ O PORQUE. Ter 900 na tela e ouvir "saldo insuficiente" e o
     D-067 na porta do dinheiro. */
  { id:'S810', arquivo:BOLSO, nome:'a recusa do cadeado vira \'saldo insuficiente\'',
    real:'recusa sem endereco, e no pior lugar possivel',
    de:"      ? \`\${trancado} do seu saldo foi COMPRADO, e comprado não vira poder — \` +",
    para:"      ? 'saldo insuficiente' +" },

  /* O CADEADO PRECISA APARECER. Saldo trancado que nao se ve e saldo que o
     jogador acha que PERDEU. */
  { id:'S811', arquivo:CTRL, nome:'o cadeado some da tela',
    real:'a primeira recusa de boost vira um relato de bug',
    de:'    cad.hidden = t <= 0;',
    para:'    cad.hidden = true;' },
  /* == D-076 · "MENOS MOVIMENTO" NAO E "SEM CENA" ========================
     Achado pelo DONO, jogando. A cena inteira ficava atras de um
     `if (!menosMovimento())` e era pulada — e o caminho reduzido nao punha
     nem o quadro final: a bola ficava FECHADA numa fuga.

       `prefers-reduced-motion` pede menos MOVIMENTO. Apagar o acontecimento
       inteiro e responder outra pergunta. */

  { id:'S812', arquivo:CAPCEN, nome:'a cena volta a ser pulada por reduced-motion',
    real:'o dono ficou sem animacao nenhuma, e os dois finais viraram um so',
    de:'      const veloz = animacaoCheia() ? 1 : FATOR_CURTO;',
    para:'      if (!animacaoCheia()) throw new Error("pulou"); const veloz = 1;' },

  /* O QUADRO FINAL E POSTO SEMPRE. Sem ele, quem pula ou esta no modo curto
     ve um final que nao e o dele. */
  /* REALVADO: fase, grupo, quadro e som viraram UMA boca, `porVeredito`.
     Estavam escritos em DOIS lugares, e apagar um nao reprovava nada porque o
     outro punha o quadro do mesmo jeito. E a licao das tres copias, que eu
     escrevi ontem sobre o som e reescrevi errado hoje ao consertar o D-076. */
  { id:'S813', arquivo:CAPCEN, nome:'o quadro final nao e posto',
    real:'bola FECHADA numa fuga — foi o que a captura do dono mostrou',
    de:"    cena.style.setProperty('--casa',\n      String(casaEm(msTotal(), { pegou: !!res?.capturou })));",
    para:'' },

  /* A ESCOLHA DO JOGADOR VENCE O SISTEMA, nos dois sentidos. Pedido literal:
     "quero opcao com animacao". */
  { id:'S814', arquivo:CAPCEN, nome:'a escolha do jogador para de vencer o sistema',
    real:'quem tem reduzir-animacoes ligado sem querer fica sem a cena',
    de:"    if (v === 'cheia') return true;",
    para:'' },

  /* OS DOIS FINAIS DIFEREM POR NATUREZA, e nao por matiz. */
  { id:'S815', arquivo:APPH, nome:'a fuga deixa de arrebentar a bola',
    real:'"ambas parecem a mesma coisa" — a queixa do dono, de volta',
    de:'  animation:capPerde .66s cubic-bezier(.3,.1,.5,1) both;',
    para:'  animation:capGanha .66s cubic-bezier(.3,.1,.5,1) both;' },

  { id:'S816', arquivo:APPH, nome:'a criatura capturada fica desenhada FORA da bola',
    real:'um final que desenha os dois estados sobrepostos nao e um final',
    de:'.capCena[data-fim="pegou"][data-fase="veredito"] .capAlvo,\n.capCena[data-fim="pegou"][data-fase="laudo"] .capAlvo{opacity:0;transform:scale(.1)}',
    para:'' },

  /* == A1 · O ELENCO DO ESTAGIO ==========================================
     Cada um destes ataca UMA decisao do bloco, e nao a sintaxe. O elenco e
     DERIVADO do pack — se qualquer perna da derivacao ceder, o cartao da tela
     de escolha passa a prometer um estagio que nao existe. */

  { id:'S817', arquivo:ELENCO, nome:'o chefe deixa de ser a evolucao do mob',
    real:'a decima wave vira "o mais forte da lista" — um numero, e nao alguem que o jogador reconhece',
    de:"  for (const c of comuns)\n    for (const aresta of saidasDe(pack, c.dex)) juntar(porDex.get(aresta.para));",
    para:'' },

  { id:'S818', arquivo:ELENCO, nome:'o chefe pode ser mais fraco que o mob',
    real:'a decima wave fica mais facil que a nona, e o climax vira alivio',
    de:'    if (x.forca <= teto) return;',
    para:'' },

  /* REALVADO: a mira original era a guarda `jaUsado`, e ela era REDUNDANTE —
     o `forca <= teto` logo abaixo ja exclui todo comum. A sabotagem passava
     verde porque nao mudava comportamento nenhum, e foi assim que o Q2 achou
     duas guardas para a mesma decisao. A guarda saiu; o defeito mira agora a
     deduplicacao, que faz trabalho de verdade. */
  { id:'S819', arquivo:ELENCO, nome:'o MESMO chefe pode entrar duas vezes',
    real:'a decima wave vira dois clones em vez de dois chefes',
    de:'    if (!x || chefes.some(c => c.dex === x.dex)) return;',
    para:'    if (!x) return;' },

  { id:'S820', arquivo:ELENCO, nome:'os estagios voltam a mostrar os mesmos rostos',
    real:'descer deixa de mostrar coisa nova, e "quao fundo ir" deixa de ser escolha',
    de:'  const frescoFaixa = faixa.filter(x => !antes.has(x.dex));',
    para:'  const frescoFaixa = faixa;' },

  { id:'S821', arquivo:ELENCO, nome:'o elenco deixa de respeitar a faixa do estagio',
    real:'a previa do estagio mente sobre quem mora la',
    de:'  const faixas = faixasDoEstagio(estagio);\n  return elenco.filter(x => faixas.includes(x.raridade));',
    para:'  return elenco;' },

  { id:'S822', arquivo:ELENCO, nome:'"exatamente dois chefes" volta a recusar tres candidatos',
    real:'o estagio com linha que se abre cai no reserva por ter candidatos DEMAIS',
    de:'  return chefes.length >= CHEFES_POR_ESTAGIO',
    para:'  return chefes.length === CHEFES_POR_ESTAGIO' },

  /* == A2 · A RESOLUCAO DA WAVE ==========================================
     A economia inteira do modo novo sai destes numeros. Cada sabotagem aqui
     e uma forma de o avanco parecer funcionar e estar desequilibrado. */

  { id:'S823', arquivo:WAVE, nome:'a chance deixa de ser escala-livre',
    real:'o equilibrio medido no nivel 10 para de valer no 40, e cada estagio pede calibracao propria',
    de:'  const razao = Math.pow(p / a, EXPOENTE);',
    para:'  const razao = Math.pow(Math.max(1e-6, p - a + 100) / 100, EXPOENTE);' },

  { id:'S824', arquivo:WAVE, nome:'a wave passa a poder ser CERTA',
    real:'um idle onde a wave e garantida nao pede a mao do jogador',
    de:'  return Math.min(CHANCE_MAX, Math.max(CHANCE_MIN, Number.isFinite(c) ? c : 0.5));',
    para:'  return Number.isFinite(c) ? c : 0.5;' },

  { id:'S825', arquivo:WAVE, nome:'a vaga extra volta a valer o dobro',
    real:'o teto do farm passa a ser quantas vagas se tem, e nao o quao boa e a equipe',
    de:'export const PESO_DA_VAGA = [1, 0.55, 0.35, 0.2];',
    para:'export const PESO_DA_VAGA = [1, 1, 1, 1];' },

  { id:'S826', arquivo:WAVE, nome:'perder a wave passa a doer o mesmo que vencer',
    real:'a derrota deixa de ser um acontecimento, e a pocao deixa de ser decisao',
    de:'export const DANO_DERROTA = 22;',
    para:'export const DANO_DERROTA = 8;' },

  { id:'S827', arquivo:WAVE, nome:'a wave passa a CURAR',
    real:'a barra de HP deixa de ser o relogio da run',
    de:'    hpFinal: Math.max(0, hpAtual - dano),',
    para:'    hpFinal: Math.min(HP_MAX, hpAtual - dano + 12),' },

  { id:'S828', arquivo:WAVE, nome:'a run que falha perde o que farmou',
    real:'castigar quem estava ausente e castigar quem usa o produto como ele foi feito',
    de:'    if (r.venceu) wave++;',
    para:'    if (r.venceu) wave++; else abates.length = 0;' },

  /* REALVADO: este defeito ESCAPOU, e ao investigar por que apareceu o achado
     mais caro do bloco — 19 dos 44 estagios tinham a decima wave MAIS FACIL que
     a rotina, porque vem QUATRO chefes contra SEIS mobs. A minha unica
     afirmacao media a mata no estagio 1, um dos 25 lugares onde o defeito nao
     aparece.

     A correcao trocou uma esperanca por uma garantia, e o defeito mudou de
     lugar junto: ele mora agora no piso que torna o climax mais duro POR
     CONSTRUCAO. Ancora perdida se REALVA, nunca se apaga. */
  { id:'S829', arquivo:WAVE, nome:'a wave do chefe deixa de ser mais dura',
    real:'medido: 19 dos 44 estagios com a decima wave mais facil que a rotina',
    de:'  return Math.max(ameacaCrua(chefes, MOBS_DO_CHEFE) * PESO_DO_DUELO,',
    para:'  return ameacaCrua(chefes, MOBS_DO_CHEFE);' },

  { id:'S830', arquivo:WAVE, nome:'a wave comum traz SEIS da mesma especie',
    real:'a tela que fica aberta por horas passa a mostrar um bicho so',
    de:'    saiu.push(pool.splice(Math.floor(sorte() * pool.length) % pool.length, 1)[0]);',
    para:'    saiu.push(pool[0]);' },

  /* ── S831 REALVADO, e a premissa dele INVERTEU ────────────────────────
     Ele guardava "o chefe é FIXO na décima" — decisão do dono de 07/09. Em
     09/09 ele a reverteu: o chefe passou a ser sorteado, de propósito, porque
     duas runs do mesmo lugar precisam ter finais diferentes.

     O defeito não some com a decisão: o que ele protegia de verdade é que a
     décima traga um CHEFE, e não um comum com nome de chefe. Essa metade
     continua valendo, e é ela que ele planta agora. */
  { id:'S831', arquivo:WAVE, nome:'a decima passa a sortear entre TODOS, e nao entre os chefes',
    real:'o clímax do estagio viraria um comum qualquer — e o anuncio no meio da tela estaria mentindo',
    de:'    ? [fonte[Math.floor(sorte() * fonte.length) % fonte.length]]',
    para:'    ? [sortearDois(sorte, [...fonte, ...(elenco?.comuns ?? [])])[0]]' },

  { id:'S832', arquivo:WAVE, nome:'abate quem nao estava na wave',
    real:'o log e o painel "quem apareceu" passam a mentir sobre a run',
    de:'    abates: venceu ? comp.map(x => ({ dex: x.dex, quantos: x.quantos })) : [],',
    para:'    abates: venceu ? (elenco?.comuns ?? []).map(x => ({ dex: x.dex, quantos: 1 })) : [],' },

  { id:'S833', arquivo:WAVE, nome:'a ameaca volta a contar a profundidade DUAS vezes',
    real:'medido: a taxa de limpeza do estagio 2 no nivel da porta cai para ZERO',
    de:'export const AMEACA_BASE = 0.18;',
    para:'export const AMEACA_BASE = 0.42;' },

  { id:'S834', arquivo:WAVE, nome:'o nivel para de acompanhar a forca dos biomas',
    real:'o jogador fica para tras sem ter feito nada errado',
    de:'export const POR_NIVEL = 22;',
    para:'export const POR_NIVEL = 60;' },


  /* == A5 · AS TRES UNIDADES =============================================
     Cada uma destas e uma forma de o teto do §P5 vazar em silencio: o avanco
     continua funcionando, e o farm diario dobra sem ninguem notar. */

  { id:'S835', arquivo:AVANCO, nome:'o ENCONTRO volta a contar o individuo',
    real:'tres da mesma especie viram tres encontros, e o teto some em duas waves',
    de:'export const encontrosDe = r => [...new Set(lista(r).map(x => x?.dex).filter(d => d != null))];',
    para:'export const encontrosDe = r => lista(r).flatMap(x => Array(x.quantos ?? 1).fill(x?.dex));' },

  { id:'S836', arquivo:AVANCO, nome:'o avanco sai sem RESERVAR nada',
    real:'o teto nao ve quem esta em campo, e cinco runs simultaneas cabem',
    de:'  return { ...e, reservas: [...(e.reservas ?? []), ENCONTROS_POR_AVANCO] };',
    para:'  return { ...e };' },

  { id:'S837', arquivo:AVANCO, nome:'a colheita nao devolve a reserva',
    real:'o teto do dia se fecha depois de UM avanco, e o jogador fica travado',
    de:'  if (i >= 0) reservas.splice(i, 1);',
    para:'' },

  { id:'S838', arquivo:AVANCO, nome:'a colheita nao credita os encontros',
    real:'o teto nunca anda, e o avanco vira farm sem limite',
    de:'    encontrosHoje: (e.encontrosHoje ?? 0) + encontrosDe(resultado).length,',
    para:'    encontrosHoje: (e.encontrosHoje ?? 0),' },

  { id:'S839', arquivo:EXPED, nome:'o teto para de enxergar quem nao e expedicao',
    real:'os dois modos deixam de dividir o teto, e viram dois farms empilhados',
    de:'  const outras = (e.reservas ?? []).reduce((a, n) => a + (Number(n) || 0), 0);\n  return colhidos + reservado + outras;',
    para:'  return colhidos + reservado;' },

  /* == A3 · O QUE A RUN COBRA ============================================ */

  { id:'S840', arquivo:AVANCO, nome:'a wave do chefe custa a mesma stamina',
    real:'o climax sai de graca, e a run longa deixa de pesar no dia',
    /* REALVADO: o dono corrigiu os numeros (2 e 5, somando 23) porque 35
       travava o novato em duas runs. O defeito continua sendo o mesmo — o
       climax sair de graca — e mudou de valor junto com a regra. */
    de:'export const STAMINA_DO_CHEFE = 5;',
    para:'export const STAMINA_DO_CHEFE = 2;' },

  { id:'S841', arquivo:AVANCO, nome:'uma criatura passa a fazer o dia inteiro',
    real:'o teto do farm deixa de ser o tamanho da colecao — a regra do §7.13 cai',
    de:'export const STAMINA_POR_WAVE = 2;',
    para:'export const STAMINA_POR_WAVE = 1;' },

  { id:'S842', arquivo:AVANCO, nome:'a run que cai paga o estagio inteiro de stamina',
    real:'cobrar por wave que nao aconteceu e punir duas vezes a mesma derrota',
    de:'  return w >= WAVES\n    ? STAMINA_DO_AVANCO\n    : w * STAMINA_POR_WAVE;',
    para:'  return STAMINA_DO_AVANCO;' },

  { id:'S843', arquivo:AVANCO, nome:'a criatura cansada passa no meio de duas boas',
    real:'a stamina vira sugestao: basta por um cansado no meio',
    de:'    .filter(c => staminaAgora(c, agora) < STAMINA_DO_AVANCO)',
    para:'    .filter(() => false)' },

  { id:'S844', arquivo:AVANCO, nome:'a cura passa do HP cheio',
    real:'sobra de cura e HP inventado, e a run fica de graca para quem carrega pocao',
    de:'    hp: Math.min(HP_MAX, atual + cura),',
    para:'    hp: atual + cura,' },

  { id:'S845', arquivo:AVANCO, nome:'a pocao cura sem sair da bolsa',
    real:'uma pocao vira infinitas, e nenhuma run pode ser perdida',
    de:'    bolsa: { ...bolsa, [item]: tem - 1 },',
    para:'    bolsa: { ...bolsa },' },

  { id:'S846', arquivo:AVANCO, nome:'curar passa a nao exigir o item',
    real:'a bolsa deixa de importar, e a pocao deixa de ser decisao',
    de:'  if (tem < 1) throw new Error(`você não tem ${item}`);',
    para:'' },

  /* REALVADO no A4c: o `encontros` ganhou a condição do teto no meio (L-151),
     e a ancora de duas linhas deixou de existir. O comportamento protegido e
     o mesmo — falhar nao confisca o farm —, e ele mora hoje na primeira das
     duas linhas. Ancora perdida se REALVA, nunca se apaga. */
  { id:'S847', arquivo:AVANCO, nome:'a run que FALHA perde o que farmou',
    real:'castigar quem estava ausente e castigar quem usa o produto como ele foi feito',
    de:'    abates: abatesDe(r),',
    para:'    abates: limpou ? abatesDe(r) : 0,' },

  { id:'S848', arquivo:AVANCO, nome:'a run que cai abre o estagio seguinte',
    real:'o climax deixa de valer: a porta abre sem passar pela decima wave',
    de:'    bau: limpou,\n    desbloqueia: limpou,',
    para:'    bau: limpou,\n    desbloqueia: true,' },

  { id:'S849', arquivo:ITENS, nome:'a Pocao deixa de desfazer uma derrota',
    real:'medido: a wave perdida custa ~15, e a pocao vira decoracao de bolsa',
    de:"faixa: 'comum', porta: 'loja', preco: 150, cura: 20,",
    para:"faixa: 'comum', porta: 'loja', preco: 150, cura: 8," },

  { id:'S850', arquivo:ITENS, nome:'a Pocao passa a carregar a run sozinha',
    real:'a preparacao passa a valer menos que o inventario',
    de:"faixa: 'incomum', porta: 'loja', preco: 500, cura: 50,",
    para:"faixa: 'incomum', porta: 'loja', preco: 500, cura: 20," },


  /* == A6 · A BOLA DURANTE O AVANCO ======================================
     Cada uma destas e uma forma de o teto do §P5 vazar pela porta da captura:
     58 mobs numa run viram 58 tentativas, e o teto deixa de significar algo. */

  { id:'S851', arquivo:BOLA, nome:'a bola volta a poder ser jogada DUAS vezes na mesma especie',
    real:'58 mobs viram 58 tentativas, e o teto de encontros nao significa mais nada',
    de:"  if ((tentadas ?? []).includes(dex))\n    throw new Error('você já jogou uma bola nessa espécie neste avanço');",
    para:'' },

  { id:'S852', arquivo:BOLA, nome:'a bola alcanca quem ainda NAO apareceu',
    real:'da para capturar o chefe na wave 1, e a decima wave deixa de ser o climax',
    de:"  if (!(apareceram ?? []).includes(dex))\n    throw new Error('essa espécie ainda não apareceu nesta run');",
    para:'' },

  { id:'S853', arquivo:BOLA, nome:'a especie NAO fica queimada quando a captura falha',
    real:'da para insistir ate acertar, e a bola deixa de ser uma decisao',
    de:'    tentadas: [...(tentadas ?? []), dex],',
    para:'    tentadas: r.capturou ? [...(tentadas ?? []), dex] : (tentadas ?? []),' },

  { id:'S854', arquivo:BOLA, nome:'a recusa fala do problema ERRADO',
    real:'"sem bola" para quem ja tentou manda consertar o que nao esta quebrado (D-067)',
    de:"  const tem = Number(bolsa?.[bola]) || 0;\n  if (tem < 1) throw new Error(`você não tem ${bola}`);\n\n  const r = tentar(rnd, pack, { raridade, bola });",
    para:"  const tem = Number(bolsa?.[bola]) || 0;\n  const r = tentar(rnd, pack, { raridade, bola });\n  if (tem < 1) throw new Error(`você não tem ${bola}`);" },

  { id:'S855', arquivo:BOLA, nome:'os lances que restam passam a contar a bolsa',
    /* A descricao dizia "a bolsa passa a contar", e nao e isso que a mutacao
       faz: ela apaga a SUBTRACAO, e o contador nunca desce. Descricao que nao
       casa com a mutacao e a proxima que me faz medir o lugar errado. */
    real:'o contador nunca desce, e a tela promete lances que nao existem',
    de:'  for (const d of tentadas ?? []) total.delete(d);\n  return total.size;',
    para:'  return total.size;' },

  /* == A7 · A RESERVA E O TREINO ========================================= */

  { id:'S856', arquivo:AUSENTE, nome:'a reserva deixa de ter TETO',
    real:'quem jogou um fim de semana fica um mes fora colhendo',
    de:'  return Math.max(0, Math.min(RESERVA_MAX_H, ganho - horas(msGastos)));',
    para:'  return Math.max(0, ganho - horas(msGastos));' },

  { id:'S857', arquivo:AUSENTE, nome:'uma hora de tela passa a pagar TRES fora',
    real:'o modo ausente deixa de ser recompensa por jogar e vira farm paralelo',
    de:'export const RESERVA_POR_HORA_JOGADA = 1;',
    para:'export const RESERVA_POR_HORA_JOGADA = 3;' },

  { id:'S858', arquivo:AUSENTE, nome:'o gasto para de sair da reserva',
    real:'a reserva nunca desce, e ficar fora passa a ser de graca',
    de:'  return { ...(estado ?? {}), msGastos: numero(estado?.msGastos) + numero(minutos) * 60_000 };',
    para:'  return { ...(estado ?? {}) };' },

  { id:'S859', arquivo:AUSENTE, nome:'a recusa da reserva perde o NUMERO',
    real:'sem dizer quanto falta, o jogador adivinha quanto tempo de tela ele deve',
    de:"      `a reserva tem ${r.tem.toFixed(1)} h e esta expedição pede ` +\n      `${r.pede.toFixed(1)} h — faltam ${r.faltam.toFixed(1)} h. Ela enche ` +\n      'jogando: 1 h de tela vale 1 h de reserva.');",
    para:"      'reserva insuficiente');" },

  { id:'S860', arquivo:AUSENTE, nome:'o modo ausente ganha o CHEFE e o BAU',
    real:'o que exige a mao do jogador passa a acontecer sem ninguem la',
    de:"  ausente: { encontros: true, item: true, xp: true, vinculo: true,\n             bola: false, pocao: false, chefe: false, bau: false },",
    para:"  ausente: { encontros: true, item: true, xp: true, vinculo: true,\n             bola: true, pocao: true, chefe: true, bau: true }," },

  { id:'S861', arquivo:AUSENTE, nome:'o TREINO passa a produzir encontro',
    real:'ele come o teto do §P5 e vira um terceiro farm',
    de:'    encontros: 0,\n    itens: 0,',
    para:'    encontros: Math.floor(h),\n    itens: 0,' },

  { id:'S862', arquivo:AUSENTE, nome:'treinar fica melhor que aventurar',
    real:'ninguem aventura com a segunda criatura, e o modo substitui o que devia viabilizar',
    de:'export const XP_POR_HORA_TREINO = 3;',
    para:'export const XP_POR_HORA_TREINO = 30;' },

  { id:'S863', arquivo:AUSENTE, nome:'a criatura em aventura entra no treino tambem',
    real:'a mesma criatura rende nos dois lugares, e o dia dobra por uma porta que ninguem abriu',
    de:'  const ocupada = (emAventura ?? []).some(c => (c?.id ?? c) === id);',
    para:'  const ocupada = false;' },


  /* == A4a · O ROTEIRO DA WAVE ===========================================
     A linha que este bloco nao pode atravessar e uma so: o roteiro DISTRIBUI
     o que a wave decidiu, e nao decide nada. Toda sabotagem daqui e uma forma
     de a tela contar uma historia diferente da que o motor resolveu. */

  { id:'S864', arquivo:ROTEIRO, nome:'o roteiro INVENTA dano',
    real:'a barra da tela desce mais do que a wave cobrou, e a run encenada deixa de ser a run resolvida',
    de:'  partes.push(resta);',
    para:'  partes.push(resta + 1);' },

  { id:'S865', arquivo:ROTEIRO, nome:'a wave PERDIDA passa a derrubar todo mundo',
    real:'o saque conta abates que nao houve, e o teto de encontros vaza pela porta da encenacao',
    de:'  if (venceu === true) {',
    para:'  if (venceu !== null) {' },

  /* REALVADO na reescrita do duelo (A4b). O trecho antigo — o piso de oito
     segundos entre entrar e cair — sumiu junto com o modelo de cerco. O
     COMPORTAMENTO que ele protegia continua existindo e mudou de lugar: agora
     quem garante que ninguem apanha antes de chegar e a caminhada, e ela mora
     no comeco do duelo.

     Ancora perdida se REALVA, nunca se apaga — a regra do CLAUDE.md. */
  { id:'S866', arquivo:ROTEIRO, nome:'o mob apanha antes de terminar de chegar',
    real:'o bicho leva golpe enquanto ainda caminha, e a luta comeca sem os dois estarem frente a frente',
    de:'    let t = inicio + APROXIMACAO_MS;',
    para:'    let t = inicio;' },

  /* REALVADO no A4d, quando a duracao passou a responder ao RITMO. A linha
     ganhou o fator no meio; o comportamento protegido e o mesmo — a wave nao
     pode durar o que quiser. Ancora perdida se REALVA, nunca se apaga. */
  { id:'S867', arquivo:ROTEIRO, nome:'a wave passa a durar o que quiser',
    real:'dez waves de dez segundos devolvem o idle que se olha por 2 minutos, e o modo perde a razao de existir',
    de:'  const duracao = Math.round(entre(r, DURACAO_MIN_MS, DURACAO_MAX_MS) * passo / 1000) * 1000;',
    para:'  const duracao = Math.round(entre(r, 5_000, DURACAO_MAX_MS) * passo / 1000) * 1000;' },

  /* == A4d · A FORCA NO RELOGIO, E O FOCO NO COMBATE ======================
     Duas correcoes do dono, medidas: a run do nivel 50 levava 31,9 min contra
     35,9 do nivel 4, e o foco nao entrava no Avanco. */

  { id:'S900', arquivo:WAVE, nome:'a forca volta a nao mexer no relogio',
    real:'medido: nivel 50 levava 31,9 min contra 35,9 do nivel 4 — ficar forte nao encurtava nada',
    de:'  return Math.min(RITMO_TETO, Math.max(RITMO_PISO, RITMO_NEUTRO / (p / a)));',
    para:'  return 1;' },

  { id:'S901', arquivo:WAVE, nome:'o ritmo perde o PISO e a wave vira um piscar',
    real:'esta e a tela que fica aberta por horas: sem nada para assistir, ela deixa de ser o que e',
    /* O piso subiu para 0,65 em 09/09 quando a wave encolheu para 45-90 s:
       com 0,35 a wave mais rapida virava 16 s, que e um piscar e nao uma cena. */
    de:'export const RITMO_PISO = 0.65;',
    para:'export const RITMO_PISO = 0.02;' },

  { id:'S902', arquivo:WAVE, nome:'o ritmo passa a usar a DIFERENCA, e nao a razao',
    real:'o equilibrio medido no nivel 10 para de valer no 40, e cada estagio novo pede calibracao propria',
    de:'  return Math.min(RITMO_TETO, Math.max(RITMO_PISO, RITMO_NEUTRO / (p / a)));',
    para:'  return Math.min(RITMO_TETO, Math.max(RITMO_PISO, RITMO_NEUTRO / Math.max(0.1, (p - a) / 100)));' },

  { id:'S903', arquivo:WAVE, nome:'o guia passa a se beneficiar do proprio bonus',
    real:'ele deixa de ser escolha de EQUIPE e vira um foco de ataque com nome bonito',
    de:"      const doGuia = 1 + BONUS_DO_GUIA * (guias - (c?.foco === 'guia' ? 1 : 0));",
    para:'      const doGuia = 1 + BONUS_DO_GUIA * guias;' },

  { id:'S904', arquivo:WAVE, nome:'o foco de expedicao passa a bater mais forte',
    real:'o batedor e o trilheiro ganham de graca no combate o que ja cobram noutra moeda',
    de:"  const guias = membros.filter(c => c?.foco === 'guia').length;",
    para:'  const guias = membros.filter(c => !!c?.foco).length;' },

  { id:'S905', arquivo:ROTEIRO, nome:'o ritmo corta o TETO da wave, e ela vira metronomo',
    real:'uma wave sempre do mesmo tamanho perde a variacao que faz a tela nao ser previsivel',
    de:'  const duracao = Math.round(entre(r, DURACAO_MIN_MS, DURACAO_MAX_MS) * passo / 1000) * 1000;',
    para:'  const duracao = Math.round(DURACAO_MIN_MS * passo / 1000) * 1000;' },

  { id:'S868', arquivo:ROTEIRO, nome:'a ordem dos momentos deixa de ser estavel',
    real:'a mesma semente devolve roteiros diferentes conforme o motor de ordenacao, e o §P3 vale ate trocar de navegador',
    de:'  comOrdem.sort((a, b) => (a.m.t - b.m.t) || (a.k - b.k));',
    para:'  comOrdem.sort((a, b) => (a.m.t - b.m.t) || (b.k - a.k));' },

  { id:'S869', arquivo:ROTEIRO, nome:'o relogio adianta momentos que ainda nao aconteceram',
    real:'a reconexao mostra a wave adiantada, e quem esta olhando ve o futuro antes do presente',
    de:'  (roteiro?.momentos ?? []).filter(m => m.t <= t);',
    para:'  (roteiro?.momentos ?? []).filter(m => m.t <= t + 30_000);' },


  /* == A4a · A RUN NO RELOGIO ============================================
     A afirmacao central do bloco e que quem fecha a aba recebe a mesma run de
     quem fica olhando. Cada sabotagem daqui e uma forma de os dois modos
     virarem dois jogos sem ninguem perceber. */

  { id:'S870', arquivo:RUNAV, nome:'perder a wave passa a AVANCAR do mesmo jeito',
    real:'o muro do genero some, a pocao deixa de comprar tentativas e o HP para de ser o relogio da run',
    de:'    if (venceu) { r.wave += 1; r.tentativa = 0; } else { r.tentativa += 1; }',
    para:'    r.wave += 1; r.tentativa = 0;' },

  { id:'S871', arquivo:RUNAV, nome:'a tentativa some da semente, e o muro vira eterno',
    real:'repetir a wave 7 devolve a MESMA derrota para sempre — nao e sorte nem decisao, e um numero congelado',
    de:'export const rotuloDaWave = (wave, tentativa) => `avanco:${wave}:${tentativa}`;',
    para:'export const rotuloDaWave = (wave) => `avanco:${wave}`;' },

  { id:'S872', arquivo:RUNAV, nome:'a run continua depois de a barra zerar no meio da wave',
    real:'o jogo encena a luta de quem ja caiu, e a run rende alem do que o §7.22.8 deixa',
    de:'    if (queda !== null && queda <= t) {',
    para:'    if (false) {' },

  { id:'S873', arquivo:RUNAV, nome:'a cura passa a ser guardada INTEIRA, sem aparar',
    real:'a pocao gasta com a barra cheia volta a curar na wave seguinte — uma pocao que rende mais por ser lida depois',
    de:'  const efetiva = Math.max(0, Math.min(HP_MAX - hpEm(run, roteiro, t), inteiro(cura)));',
    para:'  const efetiva = Math.max(0, inteiro(cura));' },

  { id:'S874', arquivo:RUNAV, nome:'recuar passa a confiscar o farm',
    real:'castigar quem escolheu parar e o oposto da regra herdada do 1.7b',
    de:'  return { ...run, fim: { em: inteiro(agora), completou: false, motivo: \'recuou\' } };',
    para:'  return { ...run, abates: [], fim: { em: inteiro(agora), completou: false, motivo: \'recuou\' } };' },

  { id:'S875', arquivo:RUNAV, nome:'a wave alcancada passa a contar a seguinte',
    real:'o relatorio conta uma wave que nao aconteceu, e a stamina cobra por ela',
    de:'  waves: run?.fim?.completou === true ? WAVES : Math.max(1, inteiro(run?.wave, 1)),',
    para:'  waves: run?.fim?.completou === true ? WAVES : Math.max(1, inteiro(run?.wave, 1) + 1),' },

  { id:'S876', arquivo:RUNAV, nome:'quem apareceu passa a entrar repetido',
    real:'o teto de encontros do §P5 vaza pela porta da lista: a mesma especie conta seis vezes',
    de:'      if (m.tipo !== \'entra\' || m.dex == null || r.apareceram.includes(m.dex)) continue;',
    para:'      if (m.tipo !== \'entra\' || m.dex == null) continue;' },

  { id:'S877', arquivo:RUNAV, nome:'a run terminada volta a andar',
    real:'uma run morta continua farmando enquanto a aba fica aberta',
    de:'  if (!emCurso(run)) return { run, aconteceu: [] };',
    para:'  if (!run) return { run, aconteceu: [] };' },

  { id:'S878', arquivo:WAVE, nome:'a composicao devolvida deixa de ser a que lutou',
    real:'a tela desenha especies que nao estao na wave, e o log discorda do saque',
    de:'    comp,\n    hpFinal: Math.max(0, hpAtual - dano),',
    para:'    comp: (elenco?.comuns ?? []).slice(0, 2).map(x => ({ dex: x.dex, forca: x.forca, quantos: 3 })),\n    hpFinal: Math.max(0, hpAtual - dano),' },


  /* == A4b · A TELA DA RUN ===============================================
     A tela nao pode inventar nem esconder. Cada sabotagem daqui e uma forma
     de o jogador ver uma run diferente da que o motor esta calculando — ou de
     uma peca que o dono pediu por escrito sumir do arranjo. */

  { id:'S879', arquivo:IDADOS, nome:'a run em curso deixa de reservar encontros',
    real:'dormir com uma Vigilia E avancar o dia inteiro viram dois farms empilhados, e o teto do §P5 vale metade',
    de:'  reservas: e.run ? [ENCONTROS_POR_AVANCO] : [],',
    para:'  reservas: [],' },   /* realvado no ST-1.1: a reserva vai até a colheita */

  { id:'S880', arquivo:IDADOS, nome:'a run nao volta do disco',
    real:'fechar a aba encerra o avanco em silencio, e o §7.22.16 deixa de valer para metade dos jogadores',
    de:'  e.run = runDoDisco(cru.run);',
    para:'  e.run = null;' },

  { id:'S881', arquivo:AVEST, nome:'a guarda do avanco vira um booleano mudo',
    real:'a recusa para de dizer o que consertar — e o D-067 ja custou duas telas neste projeto',
    de:"  if (avancoEmCurso(e)) return 'Você já está num avanço';",
    para:'  if (avancoEmCurso(e)) return null;' },

  { id:'S882', arquivo:AVEST, nome:'a equipe da run congela no nivel de quando ela comecou',
    real:'a criatura que subiu de nivel no meio da run continua lutando com a forca de ontem',
    de:'  const vivas = criaturasDe(e);',
    para:'  const vivas = (e.criaturas ?? []).map(c => ({ ...c, nivel: 1 }));' },

  { id:'S883', arquivo:AVGEO, nome:'o mob nasce no posto, em vez de vir andando',
    real:'os primeiros segundos da wave ficam vazios, e as oito direcoes da folha viram uma so',
    /* O 210 virou 96 no A4g — a entrada era mais longe que a vista, e "entrar"
       e "aparecer" ficavam idênticos. O defeito continua o mesmo: nascer NO
       posto apaga a aproximação e as oito direções da folha viram uma só. */
    de:'export const RAIO_ENTRADA = 150;',
    para:'export const RAIO_ENTRADA = 8;' },

  { id:'S884', arquivo:AVGEO, nome:'a direcao do sprite volta a ser espelhada',
    real:'medido: SEIS das oito direcoes erradas — o bicho que vem pela direita anda de costas',
    de:'  const oitavo = ((Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;',
    para:'  const oitavo = ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;' },

  { id:'S885', arquivo:AVGEO, nome:'o quadro deixa de respeitar a duracao de cada um',
    real:'o bicho perde o ritmo proprio que a folha declara, e todos passam a andar igual',
    de:'    resto -= lista[i] * MS_POR_TICK;',
    para:'    resto -= (total / lista.length);' },

  { id:'S886', arquivo:AVCENA, nome:'a chave do mob perde a wave',
    real:'o bando da wave seguinte nasce ja postado, herdando a posicao dos mortos da anterior',
    de:"    const chave = 'mob' + cena.wave + '_' + m.i;",
    para:"    const chave = 'mob' + m.i;" },

  { id:'S887', arquivo:AVCENA, nome:'quem caiu continua na cena',
    real:'a tela mostra mobs que o motor ja abateu, e o log passa a discordar do que se ve',
    /* A varredura mudou de forma no 1.27: o mob virou FUNDO, e a limpeza
       passou a ser `limparFundos`. O defeito é o mesmo — deixar de comparar
       com quem foi visto neste quadro faz nada nunca sair da cena. */
    de:"  limparFundos(k => !k.startsWith('mob') || vistos.has(k));",
    para:"  limparFundos(k => true);" },

  /* == A4b(2) · O DUELO ==================================================
     A reescrita de 08/09, pedida pelo dono depois de ver o cerco na tela.
     Cada sabotagem daqui devolve o bulbassauro-deus. */

  { id:'S892', arquivo:ROTEIRO, nome:'a leva volta a ser a wave inteira',
    real:'o dono viu e cortou: uma criatura de nivel baixo cercada por seis e ganhando desmente a stamina, o HP e a pocao',
    de:'export const POR_LEVA = 2;',
    para:'export const POR_LEVA = 6;' },

  { id:'S893', arquivo:ROTEIRO, nome:'a wave perdida passa a trazer todo mundo',
    real:'uma wave que ninguem vence enche a tela de gente que nao cai',
    de:'  const entram = venceu === true ? atores : atores.slice(0, POR_LEVA);',
    para:'  const entram = atores;' },

  { id:'S894', arquivo:ROTEIRO, nome:'o mob para de revidar quando nao ha dano a distribuir',
    real:'medido na tela: numa wave vencida o inimigo virava saco de pancada, e o balao do ataque quase nunca aparecia',
    de:'        dano: fatia < fatias.length ? fatias[fatia++] : 0,',
    para:'        dano: fatias[fatia++] ?? -1,' },

  { id:'S895', arquivo:ROTEIRO, nome:'os dois da leva entram no mesmo quadro',
    real:'dois sprites que surgem juntos leem como um elemento so — o olho nao os separa',
    de:'    const inicio = inicioDaLeva + posicao * 500;',
    para:'    const inicio = inicioDaLeva;' },

  /* REALVADO no A4g. A cena deixou de pedir uma folha FIXA e passou a escolher
     a do momento — mas a pergunta que este defeito faz continua sendo a mesma,
     e continua sendo a que mata: qual folha entra quando a do momento falta.
     Medido: 146 especies tem Walk-Anim e so 75 tem Idle-Anim; com a de parado
     como reserva, 71 mobs somem inteiros da cena. */
  /* REALVADO no D-091: a escolha da folha saiu da cena e virou camada 0
     (`folha-viva.mjs`), porque colada ao `style.backgroundImage` ela nao podia
     ser afirmada sem navegador — e foi por ali que 70 especies passaram a sumir
     no golpe. O DEFEITO e o mesmo; mudou o endereco dele. */
  { id:'S896', arquivo:FOLHAVIVA, nome:'a folha de RESERVA do mob vira a de parado',
    real:'medido: 146 especies tem Walk-Anim, e so 75 tem Idle-Anim — para 71 delas o mob sumia inteiro',
    de:"export const FOLHA_BASE = 'w';",
    para:"export const FOLHA_BASE = 'i';" },

  /* REALVADO quando o "parar no posto" virou o movimento de combate da arena,
     por correcao do dono: o congelado estava feio. O comportamento protegido e
     o mesmo — ele ENFRENTA em vez de acompanhar —, e hoje ele mora no recuo
     depois do golpe. Sem recuo, o mob gruda no treinador e volta a parecer que
     esta seguindo. */
  { id:'S897', arquivo:AVCENA, nome:'o mob gruda no treinador e volta a parecer que o segue',
    real:'"os pokemon selvagem sao pra BATALHAR e nao acompanhar" — sem o vaivem, a luta vira uma comitiva colada',
    de:'    if (batendo) { s.recuo = COMBATE.RECUO; s.investe = true; }',
    para:'    if (batendo) { s.investe = true; }' },

  { id:'S898', arquivo:AVCENA, nome:'o numero do dano so aparece na primeira wave',
    real:'o instante do golpe recomeca do zero a cada wave, e o registro de "ja mostrei" barra todos a partir da segunda',
    de:"                '-' + golpe.dano, cena.wave + ':' + golpe.i + ':' + golpe.t, 'meu');",
    para:"                '-' + golpe.dano, golpe.t, 'meu');" },

  { id:'S899', arquivo:AVGEO, nome:'o treinador teleporta ao fim de cada duelo',
    real:'sem descontar a pausa, o passeio salta para onde estaria se nunca tivesse parado',
    de:'  if (pausadoDesde) { pausaAcumulada += t - pausadoDesde; pausadoDesde = 0; }',
    para:'  if (pausadoDesde) { pausadoDesde = 0; }' },

  { id:'S888', arquivo:AVTELA, nome:'o palco nao vai para a tela da run',
    real:'a batalha acontece num quadro vazio: o cenario fica no cartao escondido',
    de:'  if (palco.parentElement !== destino) destino.appendChild(palco);',
    para:'  ;' },

  { id:'S889', arquivo:AVTELA, nome:'a altura da outra tela vem junto com o palco',
    real:'medido a 1920: palco de 546x899 num mundo 704x448, e a barra de acao a 1067 numa dobra de 1080',
    de:'      alturaDaCasa = palco.style.height;      // guardada para quando ela voltar\n      palco.style.height = \'\';',
    para:'      alturaDaCasa = palco.style.height;' },

  /* ── S890 REALVADO no item 1 da ordem do dono ────────────────────────
     Ele guardava "a coluna da run calcula o vínculo com número próprio". O
     vínculo SAIU do combate por decisão do dono — foi inteiro para a Gen 2 —,
     e com ele a fórmula que este defeito vigiava.

     A âncora perdida não vira defeito apagado: o que ele protegia era a tela
     ter conta PRÓPRIA em vez de perguntar ao motor, e essa doença mudou de
     endereço junto com a coluna. Hoje ela mora no `efeitoVivo`. */
  { id:'S890', arquivo:AVFOCO, nome:'a leitura do foco volta a ter conta propria',
    real:'a tela anuncia o efeito da EXPEDICAO num modo onde ele nao acontece — e o Batedor promete encontros num elenco fixo em seis',
    de:'  const vivo = efeitoVivo(foco, perfil, { inertes: INERTES_NO_AVANCO });',
    para:'  const vivo = EFEITO_ESCRITO_A_MAO[foco] ?? null;' },

  { id:'S891', arquivo:APP, nome:'o banner some da tela da run',
    real:'regra do dono (L-147): toda tela que o jogador habita mostra o banner dele',
    de:'        <div id="battleBannerRun" class="battle-banner" data-modo="idle"></div>',
    para:'        <div id="battleBannerRun" data-modo="idle"></div>' },


  /* ═══ A LOJA DE POKÉCASH — bloco 1.31 ═══════════════════════════════════
     Ela é a primeira porta de RECEITA do projeto. Isso não muda o método;
     muda o custo do erro — e os quatro defeitos abaixo são as quatro formas
     de a loja tirar dinheiro do jogador sem entregar o que prometeu. */
  { id:'S906', arquivo:VITRINE, nome:'peca sem procedencia declarada vai a venda',
    real:'"o campo esta faltando, deixa passar" — e a loja passa a vender o que ninguem decidiu vender',
    de:"      const procedencia = procedenciaValida(p.procedencia) ? p.procedencia : 'padrao';",
    para:"      const procedencia = p.procedencia ?? 'loja';" },

  { id:'S907', arquivo:VITRINE, nome:'a loja cobra duas vezes pela mesma peca',
    real:'a guarda de posse parece redundante porque a tela ja esconde o botao',
    de:'  if (temNaConta(posse, peca))',
    para:'  if (false && temNaConta(posse, peca))' },

  { id:'S908', arquivo:VITRINE, nome:'o que nao e da loja passa a ser comprado',
    real:'"se aparece na lista, e porque esta a venda" — peca de missao vendida por moeda',
    de:"  if (peca.procedencia !== 'loja')",
    para:"  if (false && peca.procedencia !== 'loja')" },

  { id:'S909', arquivo:VITRINE, nome:'o preco deixa de crescer com a superficie',
    real:'"um cosmetico e um cosmetico" — e o traje que ocupa a tela por horas custa o mesmo que um retrato',
    de:'export const precoDe = familia =>\n  Math.round(PRECO_BASE * (PESO_DA_FAMILIA[familia] ?? 1));',
    para:'export const precoDe = () => PRECO_BASE;' },

  { id:'S910', arquivo:CARTEIRA_MOTOR, nome:'a compra de cosmetico volta a ser uma perda de aposta',
    real:'"o saldo sai igual" — e o livro passa a mentir sobre para onde o dinheiro do jogador foi',
    de:"  'COSMETIC_PURCHASE',", para:'' },

  { id:'S911', arquivo:COSMET, nome:'a boutique vende TUDO, inclusive o que veio de graca',
    real:'"filtre tudo que temos de cosmetico" lido como "ponha tudo a venda"',
    de:'  ...p, procedencia: ehNossa(p) ? \'loja\' : \'padrao\',',
    para:'  ...p, procedencia: \'loja\',' },

  /* ═══ O ESTILHAÇO — bloco 1.29 ══════════════════════════════════════════
     A Essência era 52,85% de tudo que caía e não tinha porta. Estes cinco são
     as cinco formas de a porta existir e não valer nada. */
  { id:'S912', arquivo:ESTILH, nome:'o bolo do sorteio vira o do jogo inteiro',
    real:'"mais itens, mais chance de gostar" — e sete iguais vira o colecionador de figurinhas',
    de:'  (itens ?? []).filter(i => PORTAS.includes(i?.porta) && i.fonte === bioma);',
    para:'  (itens ?? []).filter(i => PORTAS.includes(i?.porta));' },

  { id:'S913', arquivo:ESTILH, nome:'o sorteio deixa de sortear',
    real:'"o primeiro serve" — e a decisao do dono de SORTEAR vira um comentario',
    de:'  const i = Math.min(bolso.length - 1, Math.floor(Math.abs(r) * bolso.length));',
    para:'  const i = 0;' },

  { id:'S914', arquivo:ESTILH, nome:'partes de itens diferentes passam a se somar',
    real:'"sete estilhacos sao sete estilhacos" — e o bioma para de importar',
    de:'  const [id, n] = Object.entries(conta).find(([, q]) => q >= PARTES) ?? [];',
    para:'  const total = (lista ?? []).length;\n  const [id, n] = total >= PARTES ? [Object.keys(conta)[0], total] : [];' },

  { id:'S915', arquivo:ESTILH, nome:'a curva do estilhaco vira plana',
    real:'"um item e um item" — e a faixa deixa de valer alguma coisa no preco',
    de:'  comum: 10, incomum: 15, raro: 25, muitoRaro: 45, lendario: 80,',
    para:'  comum: 25, incomum: 25, raro: 25, muitoRaro: 25, lendario: 25,' },

  { id:'S916', arquivo:IDADOS, nome:'o contador do sorteio nao volta do disco',
    real:'"campo novo, o carregar ignora" — e recarregar a pagina devolve a mesma parte',
    de:'  e.estilhacos = Math.max(0, Math.floor(Number(cru.estilhacos) || 0));',
    para:'' },

  /* ═══ A ARENA QUE SE LÊ E A APOSTA QUE SE CONFIRMA — bloco 1.27 ═════════
     Cinco defeitos, e os cinco desfazem uma correção que o dono pediu olhando
     a tela. */
  { id:'S917', arquivo:PAGINA, nome:'a odd volta a ser menor que o nome na ficha',
    real:'"o nome e o que identifica" — identifica, e nao e o que decide',
    de:'.pick .o{font-family:var(--px);font-size:16px;font-weight:700}',
    para:'.pick .o{font-family:var(--px);font-size:11px}' },

  { id:'S918', arquivo:PAGINA, nome:'o teto de aposta volta ao corpo miudo',
    real:'"e so um detalhe" — e o numero que diz quanto cabe naquele lutador',
    de:'.pick .lim{opacity:.8;font-size:11.5px}',
    para:'.pick .lim{opacity:.8;font-size:9.6px}' },

  { id:'S919', arquivo:PAGINA, nome:'a arte da ficha volta ao tamanho de marcador',
    real:'"22 px ja da pra ver" — nao da: e o tamanho de um bullet, nao de um retrato',
    de:'.pick img{width:34px;height:34px;object-fit:contain;image-rendering:pixelated}',
    para:'.pick img{width:22px;height:22px;object-fit:contain;image-rendering:pixelated}' },

  { id:'S920', arquivo:MOTOR, nome:'a janela de aposta volta a 30 s',
    real:'"trinta sempre bastou" — a H2 era hipotese, e o dono a reprovou olhando a tela',
    de:'  BET_WINDOW:   40,     // segundos de aposta',
    para:'  BET_WINDOW:   30,     // segundos de aposta' },

  { id:'S921', arquivo:FASES, nome:'o clique no lutador volta a apostar direto',
    real:'"um clique a menos e melhor" — e o clique errado passa a custar o saldo',
    de:'    selecionarLutador(+row.dataset.i, row);',
    para:'    placeBet(+row.dataset.i, row);' },

  { id:'S922', arquivo:EXPED, nome:'concentrar volta a render igual a mandar um',
    real:'"a tabela ja diz quantos vem" — diz, e ignora quem foi',
    de:'  const quantos = Math.round(comFoco * fatorDaEquipe(membros));',
    para:'  const quantos = comFoco;' },

  { id:'S923', arquivo:EXPED, nome:'a curva da equipe vira linear',
    real:'"dois valem dois" — e concentrar passa a ser identico a espalhar',
    de:'export const FATOR_DA_EQUIPE = [1, 1, 1.55, 2];',
    para:'export const FATOR_DA_EQUIPE = [1, 1, 2, 3];' },

  { id:'S924', arquivo:EXPED, nome:'o teto reserva pelo perfil e ignora a equipe',
    real:'"a reserva sempre foi do perfil" — e o multiplicador vira furo no §P5',
    de:'    return a + Math.round(maximoDo(perfil) * fatorDaEquipe(membros));',
    para:'    return a + maximoDo(perfil);' },


  /* ── L-162: A MESMA CRIATURA NOS DOIS MODOS ────────────────────────────
     Tres defeitos, porque a recusa tem tres pecas independentes: ver o campo,
     ver a run, e ser consultada nos DOIS lados. Um defeito so cobriria uma
     delas e deixaria as outras duas sem quem as segure. */
  { id:'S925', arquivo:IDADOS, nome:'a criatura em campo deixa de ocupar lugar',
    real:'"quem esta em campo ja e recusado pela stamina" — recusado, e dizendo a coisa errada',
    de:"    return 'expedicao';",
    para:'    return null;' },

  { id:'S926', arquivo:IDADOS, nome:'a run em curso deixa de ocupar a criatura',
    real:'"a run ja reserva encontros" — reserva o teto do dia, e nao a criatura',
    de:"    return 'avanco';",
    para:'    return null;' },

  { id:'S927', arquivo:IDADOS, nome:'a expedicao para de perguntar quem ja esta fora',
    real:'"o avanco ja pergunta" — e a porta fica aberta pelo outro lado',
    de:'  if (ocupada) throw new Error(ocupada);',
    para:'  if (false) throw new Error(ocupada);' },

  { id:'S928', arquivo:EQUIPE, nome:'o cartao volta a ofertar quem ja esta fora',
    real:'"o dado recusa" — recusa depois do clique, que e o D-062 de volta',
    de:'    const pode = st >= custo && !fora;',
    para:'    const pode = st >= custo;' },

  /* ── L-166: A BOLA SAIU DA RUN, E O QUADRO DO FIM E O MOMENTO ──────────
     Quatro pecas independentes: a barra da wave, a marca de origem, a limpeza
     ao comecar, e a loja dentro do quadro. Cada uma cai sozinha. */
  { id:'S929', arquivo:AVTELA, nome:'a bola volta para a barra da wave',
    real:'"o botao estava la antes" — e a captura volta a ser decidida no reflexo',
    de:"    botao('pocao', '🧪 Poção', pocoes[0]?.quantidade ?? '', porquePocao, 'destaque') +",
    para:"    botao('bola', '⚪ Bola', 1, null, 'destaque') +" },

  { id:'S930', arquivo:AVEST, nome:'o quadro da run anterior vira estoque',
    real:'"apagar o que apareceu e perder coisa do jogador" — e o momento perde o custo',
    de:"  e.encontros = (e.encontros ?? []).filter(x => x?.origem !== 'avanco');",
    para:'  e.encontros = e.encontros ?? [];' },

  { id:'S931', arquivo:AVEST, nome:'a limpeza leva junto o que a Rota OFF trouxe',
    real:'"quadro novo, lista nova" — e a expedicao que voltou de madrugada some',
    de:"  e.encontros = (e.encontros ?? []).filter(x => x?.origem !== 'avanco');",
    para:'  e.encontros = [];' },

  { id:'S932', arquivo:PAINEIS, nome:'o quadro perde o acesso a loja',
    real:'"a loja esta na pagina" — esta, e o momento acaba enquanto ele a procura',
    de:'        <button class="btn ljAbrir" data-loja-abrir>🪙 Loja</button></h3>',
    para:'        </h3>' },

  /* ── ITEM 4 DA ORDEM DO DONO: o hitbox, o icone do log, o gif da equipe ─
     Mais os dois defeitos que a MEDICAO achou junto (D-083 e D-084) — e cada
     um deles tem peca propria, porque cada um cai sozinho. */
  { id:'S933', arquivo:AVHUD, nome:'o numero do dano volta a animar no proprio elemento posicionado',
    real:'"e um elemento a menos" — e a posicao inline perde para o transform da animacao',
    de:"  ponto.className = 'avDmgPonto';",
    para:"  ponto.className = 'dmg avDmg ' + lado;" },

  { id:'S934', arquivo:AVGEO2, nome:'a separacao devolve os pontos sem separar nada',
    real:'"o passo existe e e chamado" — e nao move ninguem: as placas voltam a empilhar',
    de:'      y = bateu.y + A;',
    para:'      y = bateu.y;' },

  { id:'S934b', arquivo:AVGEO2, nome:'a separacao ESCONDE em vez de separar',
    real:'"sem sobreposicao" — e some justamente a placa de quem esta apanhando',
    de:'    postos.push({ ...p, y });',
    para:'    if (y === p.y) postos.push({ ...p, y });' },

  { id:'S935', arquivo:AVHUD, nome:'a altura da placa volta a ser um numero escrito de cabeca',
    real:'"33 é perto de 28" — cinco px a menos e a separacao roda sem separar nada',
    de:'  if (!alturaDaPlaca) alturaDaPlaca = Math.round(el.offsetHeight) || 0;',
    para:'  if (!alturaDaPlaca) alturaDaPlaca = 28;' },

  { id:'S936', arquivo:ROTWAVE, nome:'o duelo volta a caber num soco so',
    real:'"a wave curta é decisao do dono" — e o hitbox volta a ser sempre -100',
    de:'    const meusGolpes = Math.max(GOLPES_MIN, cabem);',
    para:'    const meusGolpes = Math.max(1, cabem);' },

  { id:'S937', arquivo:ROTWAVE, nome:'o piso de golpes vira piso de TEMPO',
    real:'"o passo confortavel é 2 s" — e os seis golpes empilham no instante final da wave',
    de:'      ? Math.max(GOLPE_MIN_MS, (fimDoDuelo - t) / (meusGolpes * 2))',
    para:'      ? GOLPE_MS' },

  { id:'S938', arquivo:IDADOS, nome:'o quadro perde a marca de quem veio da run',
    real:'"a lista é uma so" — e o aviso de prazo some para quem acabou de correr',
    de:"  (e?.encontros ?? []).filter(x => x?.origem === 'avanco').length;",
    para:'  0;' },

  { id:'S939', arquivo:IDADOS, nome:'a contagem da run passa a incluir a Rota OFF',
    real:'"todo pendente esta esperando bola" — e o aviso de prazo mente sobre a limpeza',
    de:"  (e?.encontros ?? []).filter(x => x?.origem === 'avanco').length;",
    para:'  (e?.encontros ?? []).length;' },

  /* ── ITEM 1 DA ORDEM DO DONO: o FOCO no lugar do vinculo ───────────────
     Quatro pecas, e cada uma cai sozinha: a regra de perfil, a lista de
     inertes, a diferenca entre "nao existe" e "neutro", e o aviso do
     FUTURO foco — que foi o pedido literal dele. */
  { id:'S940', arquivo:FOCO2, nome:'o foco de perfil passa a valer em todo perfil',
    real:'"bonus é bonus" — e o Batedor promete encontros num elenco fixo em seis',
    de:'  if (bruto.perfil && bruto.perfil !== perfil) return {};',
    para:'  if (false) return {};' },

  { id:'S941', arquivo:FOCO2, nome:'o que esta inerte no lugar volta a ser anunciado',
    real:'"o efeito é o efeito" — e a tela cobra um custo de encontros que o motor nao cobra',
    de:"    if (chave !== 'perfil' && !inertes.includes(chave)) vivo[chave] = valor;",
    para:"    if (chave !== 'perfil') vivo[chave] = valor;" },

  { id:'S942', arquivo:FOCO2, nome:'foco inexistente vira foco neutro',
    real:'"os dois nao tem o que dizer" — e um foco escrito errado passa por neutro na tela',
    de:'  if (!bruto) return null;',
    para:'  if (!bruto) return {};' },

  { id:'S943', arquivo:AVFOCO, nome:'a coluna cala sobre o FUTURO foco',
    real:'pedido literal do dono — sem o aviso, quem esta no nivel 7 le uma linha vazia e conclui que aquilo nao e pra ele',
    de:"  return { estado: 'futuro', selo: `no nível ${NIVEL_PARA_ESCOLHER}`, cor: null,",
    para:"  return { estado: 'futuro', selo: '', cor: null," },

  { id:'S943b', arquivo:AVFOCO, nome:'o aviso do futuro foco perde a conta do que falta',
    real:'"ainda nao" sem numero e uma parede sem placa — e o D-067 ja custou duas telas',
    de:'  const faltam = NIVEL_PARA_ESCOLHER - nivel;',
    para:'  const faltam = 0;' },

  { id:'S944', arquivo:AVFOCO, nome:'o foco neutro no Avanco e escondido em vez de dito',
    real:'o jogador escolheu aquele foco e precisa saber que ele esta guardado para outro modo, nao quebrado',
    de:"  return partes.length ? partes.join(' · ') : 'nada aqui — ele rende na Rota OFF';",
    para:"  return partes.join(' · ');" },

  { id:'S945', arquivo:AVFOCO, nome:'o Avanco volta a anunciar o custo de encontros',
    real:'o elenco do estagio e FIXO em seis — a tela cobraria um preco que o motor nao cobra',
    de:"  'encontros',   /* o elenco do estágio é FIXO em seis: não há o que achar a mais */",
    para:'' },

  /* ── L-164: a sala de rotas e o cartao dobrado ─────────────────────────
     Cinco pecas independentes: o padrao do cartao, o que cada modo mostra,
     a lista da sala, o recorte que ela corta, e o estagio que ela responde. */
  { id:'S946', arquivo:ESCOLHA, nome:'o cartao volta a abrir na ficha completa',
    real:'"o jogador quer ver tudo" — e sao dez informacoes em 90 px, que e o que foi reprovado',
    de:"export const MODO_PADRAO = 'compacto';",
    para:"export const MODO_PADRAO = 'ficha';" },

  /* REALVADO no 1.27f, e nao apagado: o 1.27f devolveu `forma` e `evolucao` ao
     compacto e a ancora antiga deixou de existir. O defeito e o MESMO — os dois
     modos virarem um so, e a dobra deixar de dobrar —, mudou o endereco. E a
     regra do pre-voo do Q2 no CLAUDE.md: ancora perdida quase sempre significa
     que um bloco moveu o trecho. */
  { id:'S947', arquivo:ESCOLHA, nome:'o compacto volta a carregar a ficha inteira',
    real:'"os dois modos sao iguais" — e a dobra deixa de existir sem ninguem notar',
    de:"  compacto: ['nivel', 'foco', 'forma', 'evolucao'],",
    para:"  compacto: ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao']," },

  /* ── OS QUATRO DO 1.27f ────────────────────────────────────────────────
     Cada um protege uma decisao do bloco que refez o cartao, e as quatro sao
     de LEITURA: nenhuma quebra o jogo, e as quatro o deixam ilegivel. */

  { id:'S1000', arquivo:ESCOLHA, nome:'o recorte da evolucao volta a ser a frase inteira',
    real:'"a frase por extenso e mais clara" — e "evolui com nivel 32" quebra em TRES linhas em 104 px, deixando o selo maior que o retrato',
    de:'  if (!numeros.length) return frase;',
    para:'  return frase;' },

  { id:'S1001', arquivo:ESCOLHA, nome:'o NIVEL some do recorte da evolucao',
    real:'"o simbolo basta" — e "o lv que evolui" foi literalmente o que o dono pediu de volta em 10/09',
    de:"  { palavra: 'nivel',   escrever: n => `NV ${n}` },",
    para:"  { palavra: 'nivel',   escrever: () => 'NV' }," },

  /* EM CAMADA 0 DE PROPOSITO. Colado na `innerHTML` do `idle-equipe` este
     defeito seria um mutante de NAVEGADOR (~30 s); aqui e um de Node (~0,1 s).
     E a regra "Logica fora da tela e decisao de CUSTO" do CLAUDE.md, e o
     unico jeito de o portao ficar mais barato conforme o produto cresce. */
  { id:'S1003', arquivo:ESCOLHA, nome:'o nivel volta a aparecer duas vezes na ficha',
    real:'"mostrar o nivel sempre e mais seguro" — e na ficha ele sai repetido a quatro pixels de si mesmo, o que le como erro de montagem',
    de:"export const mostraNivelSolto = modo => mostra(modo, 'nivel') && !mostra(modo, 'xp');",
    para:"export const mostraNivelSolto = modo => mostra(modo, 'nivel');" },

  { id:'S1002', arquivo:ESCOLHA, nome:'um requisito desconhecido vira um losango mudo',
    real:'"o losango serve para tudo" — e um simbolo que serve para tudo nao diz nada: a pedra sozinha fica indistinguivel de um requisito que o codigo nao le',
    de:"  return temItem ? [...numeros, '◆'].join(' ') : numeros.join(' ');",
    para:"  return [...numeros, '◆'].join(' ');" },

  { id:'S948', arquivo:ESCOLHA, nome:'a ficha perde o que o dono pediu em blocos anteriores',
    real:'esconder e apagar nao sao a mesma coisa — e apagar aqui seria desfazer tres blocos',
    de:"  ficha:    ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao'],",
    para:"  ficha:    ['nivel', 'foco']," },

  { id:'S949', arquivo:ESCOLHA, nome:'a sala corta moradores em silencio',
    real:'mostrar quatro de seis e calar faz o jogador achar que o bioma tem quatro',
    de:'    resto: Math.max(0, dex.length - Math.max(0, ate)),',
    para:'    resto: 0,' },

  { id:'S950', arquivo:ESCOLHA, nome:'a sala responde sempre pelo estagio 1',
    real:'"o estagio 1 e a porta" — e quem esta no nivel 90 le a rota como se fosse novato',
    de:'  const estagio = Math.max(1, estagioMaximo(criaturas ?? []) || 1);',
    para:'  const estagio = 1;' },

  { id:'S951', arquivo:ESCOLHA, nome:'a sala perde a faixa, que e a unica linha que DIFERE',
    real:'sem ela os onze cartoes voltam a dizer a mesma coisa, e informacao repetida e ruido',
    de:"    if (x?.raridade && !faixas.includes(x.raridade)) faixas.push(x.raridade);",
    para:'    if (false) faixas.push(1);' },

  /* ── L-168: os golpes sao liberados pelo NIVEL ─────────────────────────
     Queixa do dono, e e defeito e nao pedido: um nivel 1 anunciando o golpe
     mais forte da linha e a tela desmentindo o resto do sistema. */
  { id:'S952', arquivo:REPERT, nome:'o nivel 1 volta a conhecer a lista inteira',
    real:'"o balao é enfeite" — e o nivel decide o poder em todo lugar menos onde o jogador VE',
  de:'  const abertos = todos.filter(g => nivelDoGolpe(g, todos) <= n);',
    para:'  const abertos = todos;' },

  { id:'S953', arquivo:REPERT, nome:'a gradacao vira um degrau so',
    real:'o golpe do meio passa a abrir na mesma hora que o mais forte — nao ha o que sentir subindo de nivel',
    de:'  const t = (poder(golpe) - min) / (max - min);',
    para:'  const t = poder(golpe) >= max ? 1 : 0;' },

  { id:'S954', arquivo:REPERT, nome:'a escala passa a ser global, e nao da lista',
    real:'o tipo pesado deixaria a criatura muda metade da vida por ter nascido nele',
    de:'  const { min, max } = limites(lista);',
    para:'  const { min, max } = { min: 0, max: 150 };' },

  /* ── S955 TROCADO: o alvo anterior era INÓCUO ─────────────────────────
     Ele removia o socorro do repertório vazio, e passou — a escala sai da
     PRÓPRIA lista, então o mais fraco dela sempre abre no nível 1 e o ramo
     nunca roda. Defeito que não pode ser pego ocupa o lugar de um que pegaria.

     O alvo novo é o outro lado da mesma função, e esse é alcançável: espécie
     sem golpe declarado no pack chega aqui com lista vazia, e inventar um
     golpe para ela seria a tela nomeando o que não existe. */
  { id:'S955', arquivo:REPERT, nome:'uma especie sem golpe declarado ganha um golpe inventado',
    real:'a tela nomearia um ataque que o pack nao tem — e o jogador leria como se fosse o certo',
    de:'  if (!todos.length) return [];',
    para:'  if (!todos.length) return [{ n: "?", p: 0 }];' },

  /* ── L-169 e L-170: quatro por wave, e o chefe 1x1 sorteado ───────────── */
  { id:'S956', arquivo:WAVE, nome:'a densidade da ameaca volta a seguir quantos aparecem',
    real:'medido: o estagio 1 passa a ser limpo 100% das vezes ja no nivel que o abre',
    de:'  const rotina = ameacaCrua(comuns, DENSIDADE_DA_AMEACA);',
    para:'  const rotina = ameacaCrua(comuns, MOBS_POR_WAVE);' },

  { id:'S957', arquivo:BOSS, nome:'o anuncio do chefe deixa de ter prazo',
    real:'nome parado no meio da tela vira moldura, e esta e a tela que fica aberta por horas',
    de:'    anunciando: idade >= 0 && idade < ANUNCIO_MS,',
    para:'    anunciando: true,' },

  { id:'S958', arquivo:BOSS, nome:'a barra do chefe some junto com o anuncio',
    real:'"quanto falta" e a pergunta que decide a pocao, e ela vale o duelo inteiro',
    de:'  const m = chefeEmCena(cena);',
    para:'  const m = null;' },

  { id:'S959', arquivo:BOSS, nome:'a beira da queda acende sempre',
    real:'um alarme que toca o duelo inteiro nao e alarme — e a ultima decisao do duelo se perde',
    de:'    naBeira: vida > 0 && vida <= BEIRA_DA_QUEDA,',
    para:'    naBeira: true,' },

  /* ── L-172: os numeros do dano nao se atropelam ───────────────────────
     Medido antes de mexer: 5 pares sobrepostos numa wave comum de 25
     numeros, e 2 fora da janela a 420 px. */
  { id:'S960', arquivo:AVGEO2, nome:'o numero do dano volta a nascer em cima do anterior',
    real:'"o hitbox ta meio zoado, os numeros aparecem de forma confusa" — a queixa do dono, com endereco',
    de:'    candidatos.push({ x: x0, y: y0 - volta * PASSO_DO_DANO });',   /* realvado na ST-5.4 */
    para:'    candidatos.push({ x: x0, y: y0 });' },

  { id:'S961', arquivo:AVGEO2, nome:'o desvio do dano passa a ser para o LADO',
    real:'a cor diz de quem e o dano, mas a POSICAO diz de qual golpe — de lado ele desgruda do lutador',
    de:'  for (let volta = 0; volta <= VOLTAS_DO_DANO; volta++)\n    candidatos.push({ x: x0, y: y0 - volta * PASSO_DO_DANO });',   /* realvado na ST-5.4: o lado vem ANTES da coluna */
    para:'  for (let volta = 0; volta <= VOLTAS_DO_DANO; volta++)\n    candidatos.push({ x: x0 + L, y: y0 });' },

  { id:'S962', arquivo:AVGEO2, nome:'o numero volta a poder nascer fora da janela',
    real:'medido a 420 px: dois dos vinte e cinco nasciam a esquerda do mundo — e o D-083 volta pela porta estreita',
    de:'    return { x: Math.min(Math.max(p.x, meia), maxX - meia), y: Math.max(p.y, A) };',   /* realvado na ST-5.4 */
    para:'    return { x: p.x, y: Math.max(p.y, A) };' },

  /* ── ST-5.4 · L-172: as duas portas que sobravam ─────────────────── */
  { id:'S1089', arquivo:AVGEO2, nome:'a colisao volta a ser conferida ANTES do grampo',
    real:'o grampo do topo devolve o numero em cima de quem ele desviou — a segunda porta do L-172',
    de:'    const p = grampear(c);\n    if (!bate(p)) return p;',
    para:'    const p = grampear(c);\n    if (!bate(c)) return p;' },
  { id:'S1090', arquivo:AVGEO2, nome:'a coluna cheia deixa de ir para o lado',
    real:'depois de seis subidas o numero e aceito em cima de outro — a primeira porta do L-172',
    de:'  for (const lado of [1, -1, 2, -2])',
    para:'  for (const lado of [])' },

  /* ── ST-5.5 · a carga e o projétil do golpe (L-171) ─────────────────── */
  { id:'S1091', arquivo:AVEFX, nome:'o projetil fica parado no atacante',
    real:'a folha acende em quem lancou e nunca anda — o golpe nao chega ao alvo',
    de:'  const q = Math.max(0, Math.min(1, Number(k) || 0));',
    para:'  const q = 0;' },
  { id:'S1092', arquivo:AVEFX, nome:'o lancamento agendado e descartado antes de sair',
    real:'todo projetil e apagado no primeiro quadro, porque ainda nao era a hora dele',
    de:'    if (idade < 0) { if (idade < -2000) vivos.splice(i, 1); continue; }',
    para:'    if (idade < 0) { vivos.splice(i, 1); continue; }' },
  { id:'S1093', arquivo:AVEFX, nome:'o projetil viaja do alvo para o atacante',
    real:'a folha sai de quem LEVOU e chega em quem bateu — o golpe ao contrario',
    de:'                       x0: a.x, y0: a.y, x1: b.x, y1: b.y, arco: ARCO, dir,',
    para:'                       x0: b.x, y0: b.y, x1: a.x, y1: a.y, arco: ARCO, dir,' },
  { id:'S1094', arquivo:AVEFX, nome:'o projetil sai no instante do dano, e chega depois',
    real:'o numero sobe antes de a folha chegar — o efeito conta outra historia que o dano',
    de:'                       em: fim - enc.viagemMs, dur: enc.viagemMs };',
    para:'                       em: fim, dur: enc.viagemMs };' },
  { id:'S1095', arquivo:AVEFX, nome:'a viagem perde o teto da Arena',
    real:'um alvo longe leva segundos para ser atingido, e o motor so avisa 900 ms antes',
    de:'Math.max(VIAGEM_MIN_MS, Math.min(VIAGEM_MAX_MS,',
    para:'Math.max(VIAGEM_MIN_MS, Math.min(Infinity,' },
  { id:'S1096', arquivo:AVEFX, nome:'a carga acende no alvo e nao no atacante',
    real:'a carga do golpe aparece em quem vai apanhar',
    de:'                    x: a.x, y: a.y, dir, em: fim - antecedencia(enc), dur: enc.cargaMs };',
    para:'                    x: b.x, y: b.y, dir, em: fim - antecedencia(enc), dur: enc.cargaMs };' },
  { id:'S1097', arquivo:AVEFX, nome:'a linha da folha Dir8 sai espelhada',
    real:'o projetil voa de lado para a direita e de costas para a esquerda',
    de:'  return ((Math.round((90 - graus) / 45) % 8) + 8) % 8;',
    para:'  return ((Math.round((graus - 90) / 45) % 8) + 8) % 8;' },
  { id:'S1098', arquivo:RUNAV, nome:'os golpes a caminho incluem os que ja cairam',
    real:'um golpe que ja acertou e lancado de novo, e o projetil chega depois do numero',
    de:'      m.tipo === \'golpe\' && m.t > t && m.t <= t + ANTECIPACAO_MS),',
    para:'      m.tipo === \'golpe\' && m.t > t - ANTECIPACAO_MS && m.t <= t + ANTECIPACAO_MS),' },
  { id:'S1099', arquivo:AVCENA, nome:'a cena lanca para chegar AGORA e nao no instante do golpe',
    real:'o projetil chega quando o golpe entra na janela, quase um segundo antes do dano',
    de:"             'lc' + cena.wave + ':' + golpe.de + golpe.i + ':' + golpe.t, t + (golpe.t - cena.t));",
    para:"             'lc' + cena.wave + ':' + golpe.de + golpe.i + ':' + golpe.t, t);" },

  { id:'S1119', arquivo:'.github/workflows/testes.yml', nome:'a CI deixa de guardar a base visual local',
    real:'todo runner cria a base e nunca compara — verde com lacuna para sempre (o D-093 na CI)',
    de:'            test/fixtures/visual-base-local.json\n',
    para:'' },

  /* ── E4 · a posse de cosmético no servidor (ST-4.1 a 4.4) ───────────── */
  { id:'S1113', arquivo:'server/cosmeticos.mjs', nome:'a compra deixa de cobrar o preco do catalogo',
    real:'toda peca sai por 1 — o cliente, ou um erro, escolhe quanto pagar',
    de:"  const plano = planoDoGasto(disp, peca.preco, 'cosmetico');",
    para:"  const plano = planoDoGasto(disp, 1, 'cosmetico');" },
  { id:'S1114', arquivo:'server/carteira.mjs', nome:'a posse e gravada DEPOIS do commit do debito',
    real:'se gravar a posse falhar, o dinheiro ja saiu — meia transacao',
    de:"    if (depois) depois(db);\n    db.exec('COMMIT');",
    para:"    db.exec('COMMIT');\n    if (depois) depois(db);" },
  { id:'S1115', arquivo:'server/cosmeticos.mjs', nome:'o servidor vende o que nao e da loja',
    real:'a peca padrao, ou a de missao, passa a ser cobrada',
    de:"  if (peca.procedencia !== 'loja') return recusa(",
    para:"  if (false) return recusa(" },
  { id:'S1116', arquivo:'server/cosmeticos.mjs', nome:'equipar deixa de exigir posse',
    real:'o jogador veste o que nunca comprou — a vitrine vira enfeite',
    de:'  if (!posseDe(db, userId, cat).includes(chave(peca)))',
    para:'  if (false)' },
  { id:'S1117', arquivo:'server/cosmeticos.mjs', nome:'a base de graca passa a incluir o que nao e padrao',
    real:'a roupa do NPC vira do jogador, e o que se ganha por missao sai de graca',
    de:"const base = cat => cat.filter(p => p.procedencia === 'padrao').map(chave);",
    para:"const base = cat => cat.filter(p => p.procedencia !== 'loja').map(chave);" },
  { id:'S1118', arquivo:'engine/carteira.mjs', nome:'o plano do gasto tira de um balde mais do que ele tem',
    real:'o bonus fica negativo e o transferivel nao e tocado — a ordem de consumo quebra',
    de:'    const usa = Math.min(falta, Math.max(0, d[b] ?? 0));',
    para:'    const usa = falta;' },

  /* ── D-110 · a fila de abas do perfil a 420 px ─────────────────────── */
  { id:'S1148', arquivo:'app/index.html', nome:'a fila de abas volta a nao quebrar linha',
    real:'a aba Boutique empurra a pagina 16 px para o lado a 420 px (D-110)',
    de:'  flex-wrap:wrap}', para:'  flex-wrap:nowrap}' },

  { id:'S1149', arquivo:'app/index.html', nome:'o nome da lista de apostas volta a nao encolher',
    real:'a 420 px a arena rola 16 px para o lado — a tela principal (D-110)',
    de:'  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    para:'  overflow:hidden;white-space:nowrap}' },
  { id:'S1150', arquivo:'app/index.html', nome:'a margem de erro volta a ocupar a linha estreita',
    real:'os nomes voltam a ser cortados em cinco letras — Kan..., Oma...',
    de:'  .pick .p i{display:none}\n', para:'' },

  /* ── ST-7.1a · a telemetria mínima do piloto ─────────────────────────── */
  { id:'S1151', arquivo:TELESRV, nome:'o cliente passa a relatar qualquer evento',
    real:'o navegador diz quanto apostou (bet_placed) e o painel do piloto conta aposta que nao existiu',
    de:'    if (!DO_CLIENTE.includes(ev?.nome) || !chave) { recusados++; continue; }',
    para:'    if (!chave) { recusados++; continue; }' },
  { id:'S1152', arquivo:TELESRV, nome:'o user_id do corpo passa a entrar nos campos',
    real:'o evento carrega o usuario que o cliente disse ser, ao lado do que a sessao disse',
    de:"      .filter(([k, v]) => k !== 'user_id' && k.length <= 30 && CAMPO_OK(v)).slice(0, 12));",
    para:"      .filter(([k, v]) => k.length <= 30).slice(0, 12));" },
  { id:'S1153', arquivo:TELESRV, nome:'o lote do cliente perde o teto',
    real:'um cliente manda mil eventos por pedido e enche o banco do piloto',
    de:'  if (lista.length > LOTE_MAXIMO)\n', para:'  if (false)\n' },
  { id:'S1154', arquivo:TELESRV, nome:'o evento sem chave passa a ser aceito',
    real:'o cliente reenvia o dia a cada colheita, e sem chave cada reenvio conta de novo',
    de:"    const chave = typeof ev?.chave === 'string' && ev.chave.length <= 80 ? ev.chave : null;",
    para:"    const chave = typeof ev?.chave === 'string' && ev.chave.length <= 80 ? ev.chave : 'sem';" },
  { id:'S1155', arquivo:'server/banco.mjs', nome:'o indice da chave deixa de ser unico',
    real:'o mesmo run_harvested conta tantas vezes quantas o cliente relatou o dia',
    de:'      db.exec(`CREATE UNIQUE INDEX idx_telemetria_chave', para:'      db.exec(`CREATE INDEX idx_telemetria_chave' },
  { id:'S1156', arquivo:'server/cosmeticos.mjs', nome:'a compra deixa de ser anotada',
    real:'o piloto nao sabe se alguem comprou alguma coisa na boutique',
    de:"  if (!r.repetida) anotar(db, { nome: 'cosmetic_purchased'", para:"  if (false) anotar(db, { nome: 'cosmetic_purchased'" },
  { id:'S1157', arquivo:'server/coorte.mjs', nome:'o D7 imaturo sai como zero',
    real:'a coorte de ontem aparece com retencao D7 de 0% — o painel diz que ninguem voltou quando ainda nao deu tempo',
    de:'    d7: hoje >= dia + 7 ? voltou(lista, 7) : null,', para:'    d7: voltou(lista, 7),' },
  { id:'S1158', arquivo:'server/coorte.mjs', nome:'o D1 passa a olhar o proprio dia do cadastro',
    real:'todo mundo que se cadastrou conta como quem voltou — D1 de 100% sempre',
    de:'    d1: hoje >= dia + 1 ? voltou(lista, 1) : null,', para:'    d1: hoje >= dia + 1 ? voltou(lista, 0) : null,' },
  { id:'S1159', arquivo:'app/modules/telemetria-servidor.mjs', nome:'a expedicao em campo passa a ser relatada',
    real:'o painel conta expedicao colhida que o jogador ainda nao colheu',
    de:'    .filter(x => x?.id && recente(x.colhidaEm, agora))', para:'    .filter(x => x?.id)' },
  { id:'S1160', arquivo:'app/modules/telemetria-servidor.mjs', nome:'o relato sai sem conta',
    real:'o jogo local faz pedido ao servidor sem sessao, e cada um volta 401',
    de:'  if (!api?.temSessao?.() || !eventos?.length) return false;', para:'  if (!eventos?.length) return false;' },
  { id:'S1161', arquivo:'app/modules/telemetria-servidor.mjs', nome:'a falha de rede do relato sobe para quem chamou',
    real:'sem rede, a colheita da run quebra por causa da telemetria',
    de:'  } catch { return false; }\n', para:'  } finally { /* nada */ }\n' },
  { id:'S1162', arquivo:'app/modules/perfil-dados.mjs', nome:'o login deixa de relatar a presenca do dia',
    real:'o piloto nao ve quem entrou so para olhar o idle',
    de:"  relatar(api, [{ nome: 'session_started'", para:"  void (api, [{ nome: 'session_started'" },
  { id:'S1163', arquivo:'app/modules/avanco-tela.mjs', nome:'a colheita da run deixa de relatar o dia',
    real:'o idle volta a morrer no navegador — a parte do jogo que fica aberta por horas nao aparece no piloto',
    de:'      relatar(api, eventosDoEstado(E, agora));', para:'      void eventosDoEstado(E, agora);' },

  /* ── ST-12.1 · o motor de apuração mútua (F2.1) ─────────────────────── */
  { id:'S1217', arquivo:'engine/mutuo.mjs', nome:'o rateio sai do bruto e nao do liquido',
    real:'a casa paga a taxa do proprio caixa: passivo estrutural maior que zero, que o 6.4 fixa em zero',
    de:'    const v = proporcao(liquido, x.valor, somaBase);', para:'    const v = proporcao(bruto, x.valor, somaBase);' },
  { id:'S1218', arquivo:'engine/mutuo.mjs', nome:'a taxa sai duas vezes',
    real:'o bolo paga menos do que a taxa exibida promete, e a diferenca nao tem lancamento',
    de:'  const liquido = bruto - taxaV;', para:'  const liquido = bruto - 2 * taxaV;' },
  { id:'S1219', arquivo:'engine/mutuo.mjs', nome:'o residuo da divisao some',
    real:'moedas saem do bolo sem destino no ledger — o 6.4 exige destino declarado',
    de:'  return { bruto, taxa: taxaV, liquido, pagamentos, residuo: liquido - pago, tesouraria: 0,',
    para:'  return { bruto, taxa: taxaV, liquido, pagamentos, residuo: 0, tesouraria: 0,' },
  { id:'S1220', arquivo:'engine/mutuo.mjs', nome:'o rateio arredonda para cima',
    real:'com tres acertadores a soma passa do liquido: a casa cobre a diferenca',
    de:'const proporcao = (a, b, c) => Number(BigInt(a) * BigInt(b) / BigInt(c));',
    para:'const proporcao = (a, b, c) => Math.ceil(a * b / c);' },
  { id:'S1221', arquivo:'engine/mutuo.mjs', nome:'o destino "sem acerto" e ignorado',
    real:'o jogador leu "vai a tesouraria" antes de entrar e recebeu devolucao, ou o contrario',
    de:'  else if (semAcerto === SEM_ACERTO.DEVOLVER) { destino = ',
    para:'  else if (true) { destino = ' },
  { id:'S1222', arquivo:'engine/mutuo.mjs', nome:'a taxa sai do ponto flutuante',
    real:'29% na tela e 28 cobrados: a taxa exibida deixa de ser a cobrada',
    de:'  const taxaV = Math.floor(bruto * pontosBase(taxa) / BP);', para:'  const taxaV = Math.floor(bruto * taxa);' },
  { id:'S1223', arquivo:'engine/mutuo.mjs', nome:'valor fracionario passa',
    real:'meia moeda entra no bolo e o ledger, que e inteiro, nao fecha',
    de:'!Number.isSafeInteger(x.valor) || x.valor <= 0)', para:'!Number.isFinite(x.valor) || x.valor <= 0)' },
  { id:'S1224', arquivo:'engine/mutuo.mjs', nome:'quem perdeu tambem divide o bolo',
    real:'o bolo vira loteria de volta garantida: ler melhor que os outros deixa de pagar, que era a razao da fase',
    de:"  if (certas.length) { destino = 'acertadores'; base = certas; }",
    para:"  if (certas.length) { destino = 'acertadores'; base = entradas; }" },

  /* ── ST-0.9 · o ensaio do piloto na CI ──────────────────────────────── */
  { id:'S1216', arquivo:'.github/workflows/testes.yml', nome:'a CI deixa de rodar o ensaio',
    real:'a CI volta a ficar verde com a aposta sem pagamento — o D-112 passou assim pela suite inteira',
    de:'          node tools/ensaio-piloto.mjs http://127.0.0.1:8080\n', para:'' },

  /* ── D-117 · a chave solta que matava o padding de todo cartão ───────── */
  { id:'S1214', arquivo:'app/index.html', nome:'a chave solta volta depois do ticker',
    real:'a regra .card inteira e descartada: todo cartao do app perde o padding e o texto encosta na borda (medido: 0 px em toda largura)',
    de:'  overflow:auto;resize:vertical;padding-right:14px}\n\n\n/* O padding da direita',
    para:'  overflow:auto;resize:vertical;padding-right:14px}\n\n}\n/* O padding da direita' },
  { id:'S1215', arquivo:'app/index.html', nome:'a lista de odds ganha o respiro lateral do cartao',
    real:'a 1440 "Kangaskhan" e "Hitmonchan" viram "Kangask…" — o nome e a primeira coisa que o apostador le',
    de:'#cardLista{padding-left:0;padding-right:0}\n', para:'' },

  /* ── D-116 · a primeira escolha estourava o painel a 420 px ─────────── */
  { id:'S1212', arquivo:'app/index.html', nome:'a grade das iniciais volta a nao encolher',
    real:'a 420 px a terceira carta sai 12 px do painel — na primeira tela do idle de todo jogador novo',
    de:'#idleIniciais{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));',
    para:'#idleIniciais{display:grid;grid-template-columns:repeat(3,1fr);' },
  { id:'S1213', arquivo:'app/index.html', nome:'a arte das iniciais deixa de caber na coluna',
    real:'a coluna encolhe e a arte de 104 px transborda por cima da carta vizinha',
    de:'.idleInicialArte{width:104px;height:104px;max-width:100%;', para:'.idleInicialArte{width:104px;height:104px;' },

  /* ── D-115 · a aba Boutique esvaziava o perfil ───────────────────────── */
  { id:'S1210', arquivo:'app/modules/controles.mjs', nome:'as abas do perfil voltam a pegar a que nao tem painel',
    real:'clicar em Boutique dispara erro de pagina e o perfil volta da boutique sem conteudo (medido no ensaio)',
    de:"document.querySelectorAll('#profileModal .tab[data-pane]').forEach(b => b.onclick = () => {",
    para:"document.querySelectorAll('#profileModal .tab').forEach(b => b.onclick = () => {" },
  { id:'S1211', arquivo:'app/modules/controles.mjs', nome:'trocar de aba volta a apagar o destaque de todas',
    real:'a Boutique pode ficar acesa ao lado da aba de verdade — dois destaques, um so painel',
    de:"  document.querySelectorAll('#profileModal .tab[data-pane]').forEach(x => x.classList.remove('on'));",
    para:"  document.querySelectorAll('#profileModal .tab').forEach(x => x.classList.remove('on'));" },

  /* ── D-114 · "Iniciar rodada" no modo servidor travava a aposta ─────────── */
  { id:'S1207', arquivo:'app/index.html', nome:'os controles do modo local voltam a aparecer com conta',
    real:'o botao vermelho "Iniciar rodada" leva a tela a contagem no meio da janela e o jogador perde a aposta',
    de:'.modo-servidor #btnStart, .modo-servidor #btnAuto{display:none}\n', para:'' },
  { id:'S1208', arquivo:'app/modules/carteira.mjs', nome:'o clique em "Iniciar rodada" volta a agir no modo servidor',
    real:'um atalho de teclado ou um clique antes do CSS carregar volta a travar a aposta',
    de:'  if (modoServidor()) return;\n  if (S.state === \'betting\') startFight();', para:'  if (S.state === \'betting\') startFight();' },
  { id:'S1209', arquivo:'app/index.html', nome:'a pagina deixa de saber o modo',
    real:'a regra do CSS existe e nunca casa — os botoes do modo local seguem a mostra',
    de:"  document.body.classList.toggle('modo-servidor', modoServidor());\n", para:'' },

  /* ── D-113 · quem entra no meio da luta ficava preso no carregamento ──── */
  { id:'S1203', arquivo:'app/index.html', nome:'o boot volta a esperar a proxima rodada',
    real:'com conta real, abrir o jogo durante a luta prende a tela de carregamento por ate 54 s (medido)',
    de:'  if (!modoServidor()) await primeira;\n', para:'  await primeira;\n' },
  { id:'S1204', arquivo:'app/modules/espera-rodada.mjs', nome:'a espera passa a contar do fim da janela, e nao da luta',
    real:'a arena promete a proxima rodada 48 s antes de ela abrir',
    de:'  const segundos = Math.max(0, Math.ceil((rodada.proximaEm - agora) / 1000));',
    para:'  const segundos = Math.max(0, Math.ceil((rodada.proximaEm - 48000 - agora) / 1000));' },
  { id:'S1205', arquivo:'server/scheduler.mjs', nome:'o servidor deixa de dizer quando a proxima abre',
    real:'a arena de quem chega no meio da luta fica em "Conectando à arena…" sem numero',
    de:'      proximaEm: atual.travaEm + FASE_MS.PREPARO + FASE_MS.LUTA,\n', para:'' },
  { id:'S1206', arquivo:'app/modules/espera-rodada.mjs', nome:'a janela aberta passa a mostrar espera',
    real:'quem chega com a aposta aberta le "a proxima abre em N s" por cima da lista que pode apostar agora',
    de:"  if (rodada?.fase === 'aberta') return null;", para:"  if (false) return null;" },

  /* ── D-112 · a aposta do servidor nunca era liquidada ─────────────────── */
  { id:'S1198', arquivo:'server/servidor.mjs', nome:'o laco volta a nao liquidar as rodadas',
    real:'a rodada fecha, a aposta fica travada para sempre e o dinheiro reservado nao volta (achado no ensaio do piloto)',
    de:'    aoEncerrar: () => liquidarPendentes(db, { sched, agora: relogio() }),\n', para:'' },
  { id:'S1199', arquivo:'server/laco.mjs', nome:'a liquidacao passa a acontecer depois do anuncio',
    real:'o cliente recarrega o saldo ao ouvir "encerrada" e le o saldo de antes do pagamento',
    de:'      if (aoEncerrar && r.status === ESTADOS.ENCERRADA && liquidada !== r.id) {',
    para:'      if (aoEncerrar && r.status === ESTADOS.ENCERRADA && liquidada !== r.id && ultimo?.fase === r.status) {' },
  { id:'S1200', arquivo:'server/laco.mjs', nome:'uma liquidacao que falha segura o anuncio',
    real:'o jogo para numa rodada encerrada que a sala nunca ouve — o desligamento silencioso',
    de:"        catch (e) { ultimoErro = e; if (aoErro) aoErro(e); else console.error('[laço · liquidação]', e); }",
    para:'        catch (e) { throw e; }' },
  { id:'S1201', arquivo:'server/aposta.mjs', nome:'as pendencias deixam de ser achadas',
    real:'o servidor que caiu entre fechar e liquidar deixa as apostas daquela rodada presas',
    de:"                          WHERE b.status = 'travada' AND r.status = ? AND r.champion_species_id IS NOT NULL`)",
    para:"                          WHERE b.status = 'ganha' AND r.status = ? AND r.champion_species_id IS NOT NULL`)" },
  { id:'S1202', arquivo:'server/servidor.mjs', nome:'ao ligar, o servidor deixa de liquidar o que ficou para tras',
    real:'depois de uma queda, a rodada interrompida so e paga quando outra rodada encerrar — ou nunca, se o servidor cair de novo',
    de:'        try { liquidarPendentes(db, { sched, agora: relogio() }); }\n', para:'        try { }\n' },

  /* ── ST-7.2c · o relatório do piloto ─────────────────────────────────── */
  { id:'S1187', arquivo:'server/piloto.mjs', nome:'o perfil mais proximo passa a ser linear',
    real:'um dia de 26 runs e contado como diario, e a razao da maratona contra a ST-3.3 sai de um grupo errado',
    de:'    const d = Math.abs(Math.log(Math.max(runs, 0.5)) - Math.log(alvo));', para:'    const d = Math.abs(runs - alvo);' },
  { id:'S1188', arquivo:'server/coorte.mjs', nome:'o instante do cliente passa a valer mesmo no futuro',
    real:'um cliente adulterado empurra runs para dias que ainda nao aconteceram e infla o D1 e o D7',
    de:'  return Number.isFinite(em) && em <= linha.criado_em ? em : linha.criado_em;',
    para:'  return Number.isFinite(em) ? em : linha.criado_em;' },
  { id:'S1189', arquivo:'server/coorte.mjs', nome:'o dia do fato volta a ser o do relato',
    real:'a run relatada no login do dia seguinte conta no dia errado, e o relatorio inventa jogador-dia',
    de:"  try { em = JSON.parse(linha.campos ?? '{}')?.em ?? null; } catch { em = null; }",
    para:'  em = null;' },
  { id:'S1190', arquivo:'server/piloto.mjs', nome:'o relatorio deixa de cortar o periodo',
    real:'a aposta de um mes atras entra na conta do piloto',
    de:'    .filter(l => noPeriodo(l.dia));', para:'    ;' },
  { id:'S1191', arquivo:'server/piloto.mjs', nome:'a coorte volta a sair como numero de dia',
    real:'"dia 20721" — ninguem sabe que dia e esse',
    de:'.coortes.map(c => ({ ...c, data: dataDoDia(c.dia) })),', para:'.coortes,' },
  { id:'S1192', arquivo:'app/modules/telemetria-servidor.mjs', nome:'a run deixa de relatar quando foi colhida',
    real:'toda run passa a contar no dia do relato — o login da manha seguinte leva a noite inteira para o dia errado',
    de:'                 campos: { em: r.colhidaEm, bioma:', para:'                 campos: { bioma:' },
  { id:'S1193', arquivo:'app/modules/idle-dados.mjs', nome:'o teto deixa de guardar as moedas da run',
    real:'o relatorio compara moedas por dia contra a ST-3.3 com zero em todo jogador-dia',
    de:'      moedas: run.rendeu?.moedas ?? 0, xp: run.rendeu?.xp ?? 0 },', para:'    },' },

  /* ── ST-7.2b · a conta real na tela ───────────────────────────────────── */
  { id:'S1179', arquivo:'app/modules/conta-real.mjs', nome:'qualquer resposta vira servidor no ar',
    real:'no modo local o modal pede e-mail e senha para um servidor que nao existe, e o jogador nao entra',
    de:'    return !!(r?.ok && r.corpo?.ok === true);', para:'    return true;' },
  { id:'S1180', arquivo:'app/modules/conta-real.mjs', nome:'a tela aceita senha curta',
    real:'o jogador espera a rede para ouvir o que a tela ja sabia',
    de:'  if (String(c.senha ?? \'\').length < SENHA_MINIMA) return falha(', para:'  if (String(c.senha ?? \'\').length < 4) return falha(' },
  { id:'S1181', arquivo:'app/modules/conta-real.mjs', nome:'o login errado passa a dizer outra coisa',
    real:'a tela deixa de repetir a resposta unica do servidor, e a mensagem vira pista sobre a conta',
    de:"  if (modo === 'login') return 'E-mail ou senha não conferem.';\n", para:'' },
  { id:'S1182', arquivo:'app/modules/conta-real.mjs', nome:'o cadastro espalha o formulario',
    real:'o corpo leva o que o servidor nao pediu — o mesmo buraco que a rota fecha campo a campo',
    de:'export const corpoDoCadastro = c => ({', para:'export const corpoDoCadastro = c => ({ ...c,' },
  { id:'S1183', arquivo:'app/modules/conta-real.mjs', nome:'o e-mail do cadastro deixa de ser normalizado',
    real:'Ash@X e ash@x viram duas contas na tela e uma so no servidor — o segundo cadastro falha sem motivo visivel',
    de:"  email: String(c.email ?? '').trim().toLowerCase(),", para:"  email: String(c.email ?? '').trim()," },
  { id:'S1184', arquivo:'app/modules/conta-real.mjs', nome:'a declaracao deixa de ser exigida',
    real:'a conta nasce sem a declaracao de idade e de moeda simulada que o §28 pede',
    de:'  if (!c.declarou) return falha(', para:'  if (false) return falha(' },
  { id:'S1185', arquivo:'app/modules/conta-real.mjs', nome:'a data de nascimento no futuro passa',
    real:'erro de digitacao vai ao servidor e volta como recusa generica',
    de:'    && a >= 1900 && t <= agora;', para:'    && a >= 1900;' },
  { id:'S1186', arquivo:'server/rotas.mjs', nome:'o perfil deixa de dizer o nome do treinador',
    real:'quem entra noutro aparelho aparece sem nome',
    de:"      nome: db.prepare('SELECT username FROM users WHERE id = ?').get(userId)?.username ?? null,",
    para:'      nome: null,' },

  /* ── ST-7.2a · um endereço: o servidor serve o jogo e a API ──────────── */
  { id:'S1172', arquivo:'server/estatico.mjs', nome:'a lista do estatico vira tudo',
    real:'um amigo baixa dados/pokearena.db — o saldo e o e-mail de todo mundo',
    de:"  const ok = PERMITIDOS.some(p => relativo === p || relativo.startsWith(p + '/'));",
    para:'  const ok = true;' },
  { id:'S1173', arquivo:'server/estatico.mjs', nome:'a pagina sai com a CSP do JSON',
    real:'o jogo abre em branco pelo servidor: default-src none bloqueia script, estilo e imagem',
    de:"  'content-security-policy': CSP_DO_JOGO,", para:"  'content-security-policy': \"default-src 'none'; frame-ancestors 'none'\"," },
  { id:'S1174', arquivo:'server/estatico.mjs', nome:'a pagina passa a conversar com qualquer origem',
    real:'um script injetado manda a sessao do jogador para fora sem a CSP impedir',
    de:"  \"connect-src 'self'\",", para:'  "connect-src *",' },
  { id:'S1175', arquivo:'server/estatico.mjs', nome:'o byte nulo passa pela resolucao',
    real:'caminho com NUL chega ao sistema de arquivos — a classe de truncamento que ja abriu arquivo errado em outros servidores',
    de:"  if (rel.includes('\\0')) return null;\n", para:'' },
  { id:'S1176', arquivo:'server/estatico.mjs', nome:'a raiz deixa de levar ao jogo',
    real:'o amigo abre o link que recebeu e ve "nao encontrado"',
    de:"  if (caminho === '/' || caminho === '/app' || caminho === '/app/') {", para:"  if (caminho === '/app' || caminho === '/app/') {" },
  { id:'S1177', arquivo:'server/servidor.mjs', nome:'o estatico passa a engolir a API',
    real:'toda chamada /api vira 404 de arquivo, e o jogo cai no modo local sem dizer por que',
    de:"      if (config.servirJogo && !caminho.startsWith('/api/') && !SEM_VERSAO.includes(caminho)",
    para:'      if (config.servirJogo && !SEM_VERSAO.includes(caminho)' },
  { id:'S1178', arquivo:'server/config.mjs', nome:'SERVIR_JOGO=0 deixa de desligar',
    real:'quem poe uma CDN na frente continua servindo o repositorio pela porta da API',
    de:"    servirJogo: env.SERVIR_JOGO !== '0',", para:'    servirJogo: true,' },

  /* ── ST-7.1b · a cópia e a restauração do banco ─────────────────────── */
  { id:'S1164', arquivo:'server/copia.mjs', nome:'copiar passa a sobrescrever a copia anterior',
    real:'a copia de hoje, do banco ja estragado, apaga a de ontem, que era a boa',
    de:'  if (existsSync(destino)) throw erro(ERRO_COPIA.EXISTE', para:'  if (false) throw erro(ERRO_COPIA.EXISTE' },
  { id:'S1165', arquivo:'server/copia.mjs', nome:'a conferencia deixa de reconciliar ledger e saldo',
    real:'uma copia com saldo adulterado e restaurada como se fosse boa — o piloto volta com dinheiro que ninguem ganhou',
    de:'      for (const p of reconciliarNoBanco(db, id)) problemas.push(', para:'      for (const p of []) problemas.push(' },
  { id:'S1166', arquivo:'server/copia.mjs', nome:'restaurar deixa de conferir antes',
    real:'a restauracao poe no lugar do banco vivo um arquivo que nao reconcilia',
    de:'  if (!c.ok) return { ok: false, codigo: ERRO_COPIA.CONFERENCIA', para:'  if (false) return { ok: false, codigo: ERRO_COPIA.CONFERENCIA' },
  { id:'S1167', arquivo:'server/copia.mjs', nome:'restaurar passa a sobrescrever sem pedir',
    real:'um erro de digitacao no destino apaga o banco vivo',
    de:'  if (existsSync(destino) && !sobrescrever)', para:'  if (false)' },
  { id:'S1168', arquivo:'server/copia.mjs', nome:'a copia antiga deixa de subir ate o esquema atual',
    real:'o servidor abre um banco sem as tabelas que o codigo de hoje le — e cai na primeira compra',
    de:'  try { db.exec(\'PRAGMA foreign_keys = ON\'); versao = migrar(db); }',
    para:'  try { db.exec(\'PRAGMA foreign_keys = ON\'); versao = versaoLida(db); }' },

  /* ── L-187 · na luta, a câmera centra no trio ──────────────────────── */
  { id:'S1169', arquivo:'app/modules/vida.mjs', nome:'a luta volta a descer ate a borda do mundo',
    real:'a 420 px a camera fica presa 35 px acima do fundo e o bando encosta na borda da janela (L-187)',
    de:'  return { ...area, y1: Math.round(Math.max(piso, Math.min(area.y1, limite))) };',
    para:'  return { ...area, y1: Math.round(Math.max(piso, area.y1)) };' },
  { id:'S1170', arquivo:'app/modules/vida.mjs', nome:'a area da luta perde o piso',
    real:'com a janela maior que o mundo o passeio vira uma linha rente ao topo',
    de:'  const piso = area.y0 + (area.y1 - area.y0) / 2;', para:'  const piso = area.y0;' },
  { id:'S1171', arquivo:'app/modules/idle-mundo.mjs', nome:'a run deixa de aplicar a area da luta',
    real:'o corte existe e ninguem o chama — a luta volta ao ultimo quarto do mapa',
    de:'      ? areaDaLuta(trechoDaWave(areaCheia, cenaAgora.wave, WAVES), { mundoH, viewH: H })',
    para:'      ? trechoDaWave(areaCheia, cenaAgora.wave, WAVES)' },
  { id:'S1145', arquivo:'app/modules/avanco-geometria.mjs', nome:'na luta a camera volta a seguir so o treinador',
    real:'o bando mora no fundo da janela, com a placa encostando na borda (L-187)',
    de:'  (emLuta ? centroDaLuta(eu, mundo) : { x: eu.x, y: eu.y });',
    para:'  ({ x: eu.x, y: eu.y });' },
  { id:'S1194', arquivo:'app/modules/avanco-geometria.mjs', nome:'o foco da luta volta a ser o posto',
    real:'no panoramico o bando volta a 88% da janela, rente ao fundo (L-188)',
    de:'  return { x: p.x, y: (topo + base) / 2 };', para:'  return { x: p.x, y: p.y };' },
  { id:'S1195', arquivo:'app/modules/avanco-geometria.mjs', nome:'o campo virado para cima deixa de espelhar o foco',
    real:'encostado embaixo, a camera mira abaixo do mundo e o bando, que esta em cima, sai pelo topo',
    de:'  const fundo = p.y + (p.y >= eu.y ? CABE_O_CAMPO : -CABE_O_CAMPO);', para:'  const fundo = p.y + CABE_O_CAMPO;' },
  { id:'S1146', arquivo:'app/modules/avanco-geometria.mjs', nome:'a camera pula para o foco novo',
    real:'o mob entra e a tela da um tranco de vinte pixels de mundo',
    de:'  const k = dt > 0 ? 1 - Math.exp(-dt / tau) : 0;', para:'  const k = 1;' },
  { id:'S1147', arquivo:'app/modules/idle-mundo.mjs', nome:'a camera ignora o foco calculado',
    real:'a conta do foco existe e a camera segue o treinador do mesmo jeito',
    de:'    const alvo = camera(focoCam, W, H, mundoW, mundoH);',
    para:'    const alvo = camera(eu, W, H, mundoW, mundoH);' },

  /* ── ST-2.4 · a fauna sabe que é noite (L-184) ──────────────────────── */
  { id:'S1139', arquivo:'app/modules/fauna.mjs', nome:'o morador da noite dorme porque tambem e de um tipo do dia',
    real:'o Oddish (planta e veneno) dorme — a fauna e o elenco discordam sobre quem e da noite',
    de:'  if (tipos.some(t => (p.favorece ?? []).includes(t))) return false;\n', para:'' },
  { id:'S1140', arquivo:'app/modules/fauna.mjs', nome:'o morador de terra nasce sem tipo',
    real:'so quem mora no lago dorme; o resto da fauna fica acordado sob a lua',
    de:"      arq: f.arq, onde: f.onde, qw, qh, tipos: tiposDoMorador(pack, f.arq),\n      x: lx",
    para:"      arq: f.arq, onde: f.onde, qw, qh,\n      x: lx" },
  { id:'S1141', arquivo:'app/modules/fauna.mjs', nome:'quem dorme continua piscando',
    real:'o Zz sobe sobre um bicho batendo asa — o sono nao se le',
    de:'  if (dormindo || quadros <= 1) return 0;', para:'  if (quadros <= 1) return 0;' },
  { id:'S1142', arquivo:'app/modules/idle-mundo.mjs', nome:'a noite da fauna le o relogio de Greenwich',
    real:'no Brasil a fauna dorme tres horas antes da noite da luz',
    de:"desenharHabitantes(g, alvo, escala, t, eu.y, periodoEm(agoraDoMundo) === 'noite');",
    para:"desenharHabitantes(g, alvo, escala, t, eu.y, periodoEm(Date.now()) === 'noite');" },
  { id:'S1143', arquivo:'app/modules/idle-mundo.mjs', nome:'o Zz deixa de ser desenhado',
    real:'a fauna para, mas nada diz que ela dorme — parece travada',
    de:"      if (periodoEm(agoraDoMundo) === 'noite') desenharSono(gb, alvo, t);", para:'' },
  { id:'S1144', arquivo:'app/modules/fauna.mjs', nome:'o Zz fica parado no lugar',
    real:'um z fixo sobre a cabeca le como marca de erro, nao como sono',
    de:'  return { dy: -k * 7, alfa:', para:'  return { dy: 0, alfa:' },

  /* ── ST-5.6 · na run, a luta cabe (DEC-15, L-175) ─────────────────── */
  { id:'S1135', arquivo:'app/modules/viewport.mjs', nome:'o minimo da luta volta a caber tres criaturas',
    real:'em 420 px a run mostra 130 px de mundo e a luta sai da janela (L-175)',
    de:'export const MUNDO_DA_LUTA = 260;', para:'export const MUNDO_DA_LUTA = 130;' },
  { id:'S1136', arquivo:'app/modules/viewport.mjs', nome:'o zoom da run ignora o escolhido',
    real:'no panoramico a run troca o zoom que o jogador escolheu — a regra dele passa por cima',
    de:'  Math.min(escolhido || 1, Math.max(1, Number(largura) || 1) / MUNDO_DA_LUTA,',
    para:'  Math.min(Math.max(1, Number(largura) || 1) / MUNDO_DA_LUTA,' },
  { id:'S1137', arquivo:'app/modules/idle-mundo.mjs', nome:'o zoom da luta vale fora da run tambem',
    real:'a aba de escolha perde o zoom do jogador na tela estreita, sem luta nenhuma',
    de:'  const pedido = cenaDaVez() ? zoomDaRun(zoom, cx, cy) : zoom;',
    para:'  const pedido = zoomDaRun(zoom, cx, cy);' },
  { id:'S1196', arquivo:'app/modules/viewport.mjs', nome:'o zoom da run volta a ignorar a altura',
    real:'no panoramico o bando volta a 88% da janela: a luta cabe na largura e nao na altura (L-188)',
    de:'           Number(altura) > 0 ? Number(altura) / ALTURA_DA_LUTA : Infinity);', para:'           Infinity);' },
  { id:'S1197', arquivo:'app/modules/idle-mundo.mjs', nome:'o mundo deixa de mandar a altura do palco',
    real:'a regra da altura existe e ninguem a chama — o panoramico continua com o bando no fundo',
    de:'  const pedido = cenaDaVez() ? zoomDaRun(zoom, cx, cy) : zoom;\n', para:'  const pedido = cenaDaVez() ? zoomDaRun(zoom, cx) : zoom;\n' },
  { id:'S1138', arquivo:'app/modules/idle-mundo.mjs', nome:'o rotulo do zoom volta a mostrar o escolhido',
    real:'"3x" escrito sobre uma cena em 1,5x — o jogador clica e nada muda',
    de:'  if (rot) rot.textContent = rotuloZoom(zoomEfetivo);',
    para:'  if (rot) rot.textContent = rotuloZoom(zoom);' },

  /* ── ST-3.6 · o rendimento decrescente do Avanço (DEC-14) ───────────── */
  { id:'S1127', arquivo:'engine/avanco.mjs', nome:'so a primeira run do dia paga inteira',
    real:'o casual passa a sentir o rendimento — a DEC-14 prometeu que ele nao sente',
    de:'export const RUNS_CHEIAS = 6;', para:'export const RUNS_CHEIAS = 1;' },
  { id:'S1128', arquivo:'engine/avanco.mjs', nome:'o rendimento perde o piso',
    real:'a run tardia paga quase zero — ensina a nao jogar',
    de:'  return Math.max(PISO_DO_RENDIMENTO, QUEDA_POR_RUN ** alem);',
    para:'  return QUEDA_POR_RUN ** alem;' },
  { id:'S1129', arquivo:'engine/avanco.mjs', nome:'o dia do rendimento vira o dia de Greenwich',
    real:'o dia vira as 21h de Brasilia — metade da noite paga como amanha',
    de:'((Number(agora) || 0) - FUSO_DO_RENDIMENTO_MIN * 60000) / DIA_MS',
    para:'(Number(agora) || 0) / DIA_MS' },
  { id:'S1130', arquivo:'engine/avanco.mjs', nome:'o dia volta a ser a janela movel de 24 h',
    real:'quem joga todo dia no mesmo horario paga pelas runs de ontem',
    de:'diaDoMundo(x.colhidaEm) === diaDoMundo(agora)).length;',
    para:'x.colhidaEm > agora - DIA_MS).length;' },
  { id:'S1131', arquivo:'engine/avanco.mjs', nome:'o arredondamento perde o sorteio e sempre corta',
    real:'uma Essencia com rendimento de 80% vira zero toda vez — o rendimento morde o dobro',
    de:'  Math.floor((Number(quantidade) || 0) * fator + (Number(u) || 0));',
    para:'  Math.floor((Number(quantidade) || 0) * fator);' },
  { id:'S1132', arquivo:'app/modules/avanco-estado.mjs', nome:'a moeda da run ignora o rendimento',
    real:'a maratona volta a tirar a moeda inteira — a L-185 reabre pela moeda',
    de:'  }), fator, sorteioR());', para:'  }), 1, sorteioR());' },
  { id:'S1133', arquivo:'app/modules/avanco-estado.mjs', nome:'a Essencia do bau ignora o rendimento',
    real:'a maratona volta a tirar 8,7x a Essencia calibrada',
    de:'quantidade: comRendimento(it.quantidade, fator, sorteioR()) }',
    para:'quantidade: it.quantidade }' },
  { id:'S1134', arquivo:'app/modules/avanco-tela.mjs', nome:'a tela deixa de avisar o rendimento antes da run',
    real:'a run paga menos sem aviso — o D-067 na porta do Avancar',
    de:'falaDoRendimento(runsNoDia(E.avancos, agora) + 1)', para:'null' },

  /* ── ST-0.6 · a CI no GitHub (DEC-13) ───────────────────────────────── */
  { id:'S1111', arquivo:'.github/workflows/testes.yml', nome:'a CI roda o recorte sem navegador',
    real:'o GitHub mostra verde sem ter aberto o jogo — o S109 com selo',
    de:'        run: npm test',
    para:'        run: npm run rapido' },
  { id:'S1112', arquivo:'.github/workflows/testes.yml', nome:'a CI perde o endereco do Chromium',
    real:'a suite pula o Q5 com aviso e fica verde sem ter aberto o jogo',
    de:'          echo "PW_CHROME=$CHROME" >> "$GITHUB_ENV"\n\n      # A LINHA DE BASE VISUAL LOCAL',
    para:'          echo "CHROME=$CHROME" >> "$GITHUB_ENV"\n\n      # A LINHA DE BASE VISUAL LOCAL' },

  /* ── ST-1.2b · o Sair revoga no servidor (DEC-07) ──────────────────── */
  { id:'S1106', arquivo:SRVROT, nome:'o token revogado volta a abrir a conta',
    real:'quem copiou o token antes do Sair continua dentro por 7 dias',
    de:'  if (s && db && sessaoRevogada(db, s.nonce)) return null;',
    para:'  if (false) return null;' },
  { id:'S1107', arquivo:SRVAUT, nome:'a lista de revogados nunca se limpa',
    real:'a tabela cresce a cada Sair para sempre, e toda rota privada a consulta',
    de:'  db.prepare(`DELETE FROM sessoes_revogadas WHERE expira_em <= ?`).run(agora);\n',
    para:'' },
  { id:'S1108', arquivo:SRV, nome:'o despacho deixa de passar o banco para a sessao',
    real:'a conferencia de revogados existe e nunca roda — o Sair volta a valer so no aparelho',
    de:'        userId = usuarioDa(req, config, relogio(), db);',
    para:'        userId = usuarioDa(req, config, relogio());' },
  { id:'S1109', arquivo:'app/modules/sair.mjs', nome:'o Sair esquece o token antes de pedir a revogacao',
    real:'o pedido sai sem credencial, o servidor recusa, e o token segue vivo',
    de:"    ? api.post('/api/sair').catch(() => null)",
    para:"    ? Promise.resolve().then(() => api.post('/api/sair')).catch(() => null)" },
  { id:'S1110', arquivo:SRVAUT, nome:'token forjado consegue revogar',
    real:'qualquer um dispara escrita no banco com um token inventado',
    de:'  if (!s?.nonce) return false;',
    para:'  if (!s?.nonce) return !!token;' },

  /* ── ST-6.3 · as fichas dizem o próprio estado ─────────────────────────
     O "produto" aqui é o documento: a fila e o estado do projeto moram nele. */
  { id:'S1104', arquivo:'docs/LACUNAS.md', nome:'uma ficha perde a linha de Estado',
    real:'ninguem sabe se a L-186 esta aberta ou fechada sem ler a ficha inteira',
    de:'**ST-5.5b**. **Estado:** ✅ **FECHADA no mesmo dia (ST-5.5b).**',
    para:'**ST-5.5b**. ✅ **FECHADA no mesmo dia (ST-5.5b).**' },
  { id:'S1105', arquivo:'docs/LACUNAS.md', nome:'duas fichas com o mesmo id',
    real:'o bloco dono fecha a L-184 e nao se sabe qual das duas fechou',
    de:'### L-185 — o Avanço emite',
    para:'### L-184 — o Avanço emite' },

  /* ── ST-5.5b · o jato (L-186) ───────────────────────────────────────── */
  { id:'S1100', arquivo:AVEFX, nome:'o golpe de jato volta a sair sem jato',
    real:'Surf, Flamethrower e Thunderbolt saem so com o impacto — a linha entre os dois fica vazia',
    de:'  if (!fx || (!fx.cast && !fx.proj && !fx.beam)) return null;',
    para:'  if (!fx || (!fx.cast && !fx.proj)) return null;' },
  { id:'S1101', arquivo:AVEFX, nome:'a ponta do jato deixa de avancar',
    real:'o jato nasce cobrindo a linha inteira, e le como um bastao parado e nao como um jato',
    de:'    if (q > k * 1.6) break;',
    para:'    if (q > 1) break;' },
  { id:'S1102', arquivo:AVEFX, nome:'o jato sai no instante do dano',
    real:'o numero sobe antes de o jato sair do atacante',
    de:'                   em: fim - JATO_ATE_IMPACTO_MS, dur: JATO_MS };',
    para:'                   em: fim, dur: JATO_MS };' },
  { id:'S1103', arquivo:AVEFX, nome:'o jato vira um segmento so',
    real:'um jato de um ponto e um estouro no atacante',
    de:'  const seg = Math.max(3, Math.round(len / (Math.max(1, lado) * (escala || 1) * 0.55)));',
    para:'  const seg = 0;' },

  /* REALVADO para a geometria: enquanto a limpeza morava junto do desenho, o
     defeito passou — não havia como afirmar a lista sem montar um DOM. */
  { id:'S963', arquivo:AVGEO2, nome:'a lista dos numeros no ar nunca se limpa',
    real:'vetor que so cresce numa aba aberta por horas e um vazamento com aparencia de cache; e cada numero novo sobe mais ate bater no teto',
    de:'                            (Number(agora) || 0) - o.em < vida);',
    para:'                            true);' },

  /* ── L-171: o EFEITO do golpe, desenhado sobre o alvo ──────────────────
     "olha a diferença das sprites de ataque da arena. Eu quero que seja assim".
     O Avanço tinha o que BATE e nunca teve o que ACERTA. */
  { id:'S964', arquivo:AVEFX, nome:'o efeito volta a ser uma tabela propria',
    real:'o mesmo golpe sairia com dois estouros diferentes em duas telas do mesmo jogo',
    de:'  const fx = MOVE_FX[nome];',
    para:'  const fx = { hit: \'Particle/Inventado.png\', hsc: 1 };' },

  { id:'S965', arquivo:AVEFX, nome:'um golpe sem efeito declarado ganha um estouro generico',
    real:'o jogador aprenderia que aquele brilho nao quer dizer nada — e ai ele para de olhar',
    de:'  return fx?.hit ? { folha: fx.hit, escala: Number(fx.hsc) || 1 } : null;',
    para:'  return { folha: fx?.hit ?? \'x\', escala: 1 };' },

  { id:'S966', arquivo:AVEFX, nome:'o mesmo golpe estoura a cada quadro',
    real:'a cena repinta a 60 quadros — a tela viraria fogo solido em meio segundo',
    de:'  if (jaEstourou.has(chave)) return null;',
    para:'  if (false) return null;' },

  { id:'S967', arquivo:AVEFX, nome:'o estouro deixa de ter prazo',
    real:'a lista so cresce numa aba aberta por horas, e o desenho custa por quadro',
    de:'    if (idade >= dur) { vivos.splice(i, 1); continue; }',
    para:'    if (false) { vivos.splice(i, 1); continue; }' },

  { id:'S968', arquivo:AVEFX, nome:'a cena ESPERA a folha carregar em vez de pular',
    real:'esperar pela folha foi o defeito que fez o mob sumir no meio do golpe, no A4g',
    de:'    if (!rec?.ok) continue;',
    para:'    if (!rec) continue;' },

  /* ── L-164: a previa das especies volta para a ROTA OFF ──────────────── */
  { id:'S969', arquivo:ESTAGIOS_TELA, nome:'a previa volta a existir so em ROTAS',
    real:'queixa do dono: "hoje nao aparece os do bioma" — e na Rota OFF ele escolhe as cegas por oito horas',
    de:"  const alvos = nosDois('Previa');",
    para:"  const alvos = [$('#idlePrevia')].filter(Boolean);" },

  /* ── L-164 v2: o AVANCO PROGRESSIVO — o trecho da wave ─────────────────
     "o boneco vai avançando e batalhando de forma progressiva". A batalha
     continua ancorada no treinador parado (A4g); o que anda e a ANCORA. */
  { id:'S970', arquivo:AVGEO2, nome:'a jornada para de avancar — todas as waves no mesmo trecho',
    real:'volta a ser "duas criaturas brigando num quadro estatico", e nao uma travessia',
    de:'  const a = inicio + passo * (w - 1);',
    para:'  const a = inicio;' },

  { id:'S971', arquivo:AVGEO2, nome:'os trechos deixam de se sobrepor',
    real:'vencer uma wave TELEPORTA o boneco — e teleporte e o defeito que o relogio do passeio existe para evitar',
    de:'  const tamanho = total / (1 + (n - 1) * (1 - sob));',
    para:'  const tamanho = total / n;' },

  { id:'S972', arquivo:AVGEO2, nome:'a jornada fixa o eixo horizontal',
    real:'um bioma mais alto que largo atravessaria em tres passos e ficaria parado no resto',
    de:'  const horizontal = largura >= altura;',
    para:'  const horizontal = true;' },

  { id:'S973', arquivo:AVGEO2, nome:'a wave nao e apertada para dentro do total',
    real:'uma run alem da decima, ou um save adulterado, pede um trecho que nao existe e poe o boneco fora do mapa',
    de:'  const w = Math.min(n, Math.max(1, Math.floor(Number(wave) || 1)));',
    para:'  const w = Math.floor(Number(wave) || 1);' },

  /* ── 1.27e: O SUMICO DA SPRITE E O EFEITO FORA DA TELA ──────────────────
     Tres dias na mesma tela, e as duas causas sao a mesma classe: a conta
     morava onde so navegador alcanca. Ver D-090, D-091 e D-092. */
  { id:'S974', arquivo:FOLHAVIVA, nome:'a folha do momento e usada sem saber se ela carregou',
    real:'e o D-091 inteiro — 70 especies trocavam para uma folha que nao existe e SUMIAM no golpe, com a placa de nome no ar',
    de:"  return saber(urlDe(querida)) === true ? querida : FOLHA_BASE;",
    para:"  return querida;" },

  { id:'S975', arquivo:FOLHAVIVA, nome:'o veredito desconhecido passa a valer como aprovado',
    real:'um quadro vazio a cada sonda que ainda nao voltou — o bicho pisca fora da cena no primeiro golpe de cada wave',
    de:"  return saber(urlDe(querida)) === true ? querida : FOLHA_BASE;",
    para:"  return saber(urlDe(querida)) !== false ? querida : FOLHA_BASE;" },

  { id:'S976', arquivo:FOLHAVIVA, nome:'apanhar passa a vencer bater no mesmo quadro',
    real:'o golpe do bicho desaparece toda vez que ele leva um no mesmo instante — que e o caso comum de um duelo, e nao a excecao',
    de:'  const querida = batendo ? \'a\' : apanhando ? \'h\' : FOLHA_BASE;',
    para:'  const querida = apanhando ? \'h\' : batendo ? \'a\' : FOLHA_BASE;' },

  { id:'S977', arquivo:FOLHAVIVA, nome:'a sonda repete o endereco que ja tem veredito',
    real:'sessenta quadros por segundo criam sessenta sondas do mesmo arquivo — e o Set de controle deixa de servir para nada',
    de:"    if (saber(url) === undefined) fila.push(url);",
    para:"    fila.push(url);" },

  { id:'S978', arquivo:AVEFX, nome:'o estouro volta a ignorar a camera',
    real:'e o D-092: o ponto do mundo entra como se fosse ponto de tela, e todo estouro cai deslocado pela posicao da camera',
    de:"  const ponto = noCanvas(mundoX, mundoY, cam);",
    para:"  const ponto = { x: Number(mundoX) || 0, y: Number(mundoY) || 0 };" },

  { id:'S979', arquivo:AVEFX, nome:'a camera ausente vira NaN em vez de zero',
    real:'um quadro antes de a camera existir manda todo estouro para NaN — e drawImage com NaN nao desenha e nao avisa',
    de:'  y: (Number(y) || 0) - (Number(cam?.y) || 0),',
    para:'  y: (Number(y) || 0) - Number(cam?.y),' },

  { id:'S980', arquivo:BAIXADOR, nome:'o baixador volta a cobrir so o elenco da ARENA',
    real:'e o D-090: 70 das 146 especies entram na wave sem folha de ataque em disco, e o baixador ainda relata falhou: 0',
    de:"  const elenco = pack.especies;",
    para:"  const elenco = pack.especies.filter(p => pack.elenco.includes(p.dex));" },

  { id:'S981', arquivo:COMPANHEIRO, nome:'o companheiro volta a escolher a folha pela traducao',
    real:'o bicho que o JOGADOR escolheu some no golpe DELE — mesmo D-091, do lado de ca da luta',
    de:"  const anim = ANIM_DO_COMBATE[chave] ?? 'Walk';",
    para:"  const anim = ANIM_DO_COMBATE[p.anim] ?? 'Walk';" },

  /* ── 1.32: O CLIMA DO AVANCO (L-119) ──────────────────────────────────
     O eixo do idle nao e o da Arena: la o clima muda DANO, aqui ele muda o
     FARM. E o dono fixou a regra que a metade destes defeitos protege:
     o que importa e a criatura ENVIADA, e nao a que aparece na cena. */
  { id:'S982', arquivo:CLIMAENG, nome:'o clima passa a pagar quem esta na CENA, e nao quem foi enviado',
    real:'o bonus vira sorteio sobre sorteio — nao ha decisao de equipe para o jogador tomar, que e a regra que o dono nomeou',
    de:'  const quais = quemAproveita(equipe, tipos);',
    para:'  const quais = quemAproveita(especies, tipos);' },

  { id:'S983', arquivo:CLIMAENG, nome:'a raridade do tipo deixa de decidir o passo',
    real:'o Gelo (4 especies de 146) passa a pagar igual ao Veneno (33) — a tabela volta a precisar de excecao escrita a mao a cada mudanca de elenco',
    de:'  const passo = PASSO_BASE * Math.sqrt(FRACAO_REF / fracao);',
    para:'  const passo = PASSO_BASE;' },

  { id:'S984', arquivo:CLIMAENG, nome:'levar quatro do tipo passa a pagar quatro vezes',
    real:'e o "surreal e quebrado" que o dono cortou quando o poder da equipe foi calibrado — o teto do farm vira quantas vagas se tem',
    de:'    (a, i) => a + (PESO_DA_VAGA[i] ?? PESO_DA_VAGA[PESO_DA_VAGA.length - 1]), 0);',
    para:'    (a, i) => a + 1, 0);' },

  { id:'S985', arquivo:CLIMAENG, nome:'o canal ritmo passa a MULTIPLICAR como os outros quatro',
    real:'a Chuva deixa o farm mais LENTO — exatamente o contrario do pedido, e o tipo de inversao que aparece como "esta estranho" tres blocos depois',
    de:"  return canal === 'ritmo' ? v / bonus.fator : v * bonus.fator;",
    para:'  return v * bonus.fator;' },

  { id:'S986', arquivo:CLIMAENG, nome:'um canal desconhecido passa a valer como bonus',
    real:'um save adulterado ou um pack de terceiro vira multiplicador livre sobre XP, moeda e bau',
    de:'  if (!clima || !tipos.length || !ehCanal(clima.rende)) return vazio;',
    para:'  if (!clima || !tipos.length) return vazio;' },

  { id:'S987', arquivo:CLIMAENG, nome:'tipo duplo passa a contar duas vezes na cobertura',
    real:'a Tempestade cobre terra E pedra, e quem e os dois inflaria a cobertura — o clima pagaria menos do que devia por uma soma errada',
    de:'    if (meus.some(t => alvo.has(t))) n++;',
    para:'    for (const t of meus) if (alvo.has(t)) n++;' },

  { id:'S988', arquivo:CLIMACOLA, nome:'o clima passa a ser sorteado sem a raiz da run',
    real:'o clima muda a cada repintura — a tela troca de tempo sessenta vezes por segundo, e o §P3 deixa de valer para o unico campo que a run nao guarda',
    de:"  return sortearClimaIdle(semente(derivar(String(run.raiz), RAMO)), lista);",
    para:'  return sortearClimaIdle(Math.random, lista);' },

  { id:'S989', arquivo:CLIMACOLA, nome:'a linha do log sai mesmo quando ninguem aproveitou',
    real:'o jogador le que ganhou algo que nao ganhou — e o log e a peca que existe justamente para ele saber que o bonus aconteceu',
    de:'  if (!c || !c.canal || !c.quantos) return null;',
    para:'  if (!c || !c.canal) return null;' },

  { id:'S990', arquivo:CLIMAPART, nome:'a densidade das particulas deixa de acompanhar a janela',
    real:'medido: 403x207 no panoramico e 130x207 no estreito — com numero absoluto a mesma chuva vira garoa num e temporal no outro',
    de:'  return Math.min(MAX_POR_TIPO, Math.max(1, Math.round(d * area / AREA_REF)));',
    para:'  return Math.min(MAX_POR_TIPO, Math.max(1, Math.round(d)));' },

  { id:'S991', arquivo:CLIMAPART, nome:'a particula deixa de recomecar e cai para fora da janela',
    real:'a cena esvazia sozinha numa aba que fica aberta por horas — que e a unica tela do produto feita para ficar aberta por horas',
    de:'    const y = ((ms / 1000 * vel + espalhar(i, 13) * ciclo) % ciclo) - tam;',
    para:'    const y = ms / 1000 * vel + espalhar(i, 13) * ciclo - tam;' },

  { id:'S992', arquivo:CLIMAPART, nome:'o sol passa a cair como chuva',
    real:'sol chovendo e o tipo de coisa que ninguem revisa e todo mundo ve',
    de:"  if (tipo === 'sol') {",
    para:'  if (false) {' },
];
