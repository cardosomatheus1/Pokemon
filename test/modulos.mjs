/* Q1/Q3 · GRAFO DE MÓDULOS — fronteiras explícitas e numa direção só.
 *
 * O F0.3 separa a interface em módulos. Dois modos de falha justificam um teste
 * em vez de disciplina: um módulo que volta a crescer sem limite, e uma
 * dependência que aponta para o lado errado — apresentação puxando rodada, ou
 * qualquer coisa puxando o motor de volta para a UI.
 */
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const DIR = new URL('../app/modules/', import.meta.url);
/* ── O CSS SAI ANTES DE PROCURAR SÍMBOLO DE JS (1.23) ─────────────────────
 *
 * As duas peneiras abaixo procuram nomes exportados dentro do `index.html`, e
 * elas liam a folha de estilo junto. Uma propriedade CSS com o nome de um
 * export nosso vira acusação:
 *
 *     place-items:center   ->  "app/index.html usa `place` sem importar"
 *
 * Não é um caso raro nem exótico — `place`, `order`, `filter`, `content`,
 * `grid`, `mask` e `all` são propriedades CSS **e** nomes de função plausíveis.
 * E a acusação chega com endereço errado, que é o pior tipo: manda procurar um
 * import que nunca existiu.
 *
 *   > **Procurar símbolo de JS dentro de CSS é erro de categoria.** Nenhum
 *   > `<style>` deste projeto contém JavaScript, então nada se perde tirando-o.
 *
 * O `<script>` continua inteiro — é lá que o defeito que estas peneiras existem
 * para pegar de fato mora. */
const semEstilo = h => h.replace(/<style[\s\S]*?<\/style>/gi,
  m => m.replace(/[^\n]/g, ' '));
const APP = semEstilo(
  readFileSync(new URL('../app/index.html', import.meta.url), 'utf8'));
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
  /* Diálogos do app. Camada 0 porque só depende do DOM: quem os chama são
     navegação, customização e ADM (camada 4), e um diálogo que soubesse o que
     é carteira ou perfil fecharia ciclo com eles. */
  'dialogo.mjs': 0,
  /* A caixa do log: abre, fecha e cresce. Camada 0 porque só conhece o
     retângulo — nada de rodada, aposta ou motor. O comportamento saiu de um
     ouvinte solto no `index.html` quando ganhou a alça de redimensionamento,
     porque arrastar termina num clique e o ouvinte cru fechava a caixa. */
  'ticker.mjs': 0,
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
  /* O pintor do cenário do idle. Camada 0 porque só conhece o PACK e o canvas:
     nada de estado, de expedição, de criatura. A decisão (a planta) é pura e
     roda em Node; o traço é fino e não decide nada — é essa divisão que faz um
     pintor de cenário ser testável sem navegador. */
  'mundo.mjs': 0,
  /* A ESTEIRA DE OUTFIT. Camada 0 porque a conversão é aritmética sobre pixel:
     ela recebe imagens já carregadas e devolve um canvas, e não sabe de onde
     veio nem para onde vai. É o que permite a MESMA conversão servir três
     chamadores — a bancada do navegador, a ferramenta de linha de comando, e a
     aba do idle. Antes disso existiam três cópias, e elas já divergiram uma vez.
     Só o `passo` e o `montarFolha` tocam canvas, e canvas não é DOM: o
     `OffscreenCanvas` do Node roda os dois sem navegador. */
  'outfit.mjs': 0,
  /* O GUARDA-ROUPA. Camada 0 porque só guarda dado e lê o depósito: catálogo,
     posse, e qual traje está vestido. É a mesma posição do , e
     pelo mesmo motivo — no dia em que a posse vier do servidor, troca-se a
     persistência e mais nada. A LOJA vai perguntar a este arquivo o que pode
     vender, e loja não pergunta para tela. */
  'outfit-acervo.mjs': 0,
  /* A REGRA do que se vende, e ela só depende de listas (camada 0). Ela é
     camada 0 porque não conhece DOM nem estado: recebe inventário, devolve
     catálogo. Quem a põe na tela é a loja, camada 4. */
  'cosmeticos.mjs': 0,
  /* E4: a posse que a tela lê — servidor com conta, navegador sem. Pura. */
  'posse-atual.mjs': 0,
  /* A VIDA NO MUNDO: passeio, direcao, quadro da folha e camera. Camada 0
     porque e aritmetica sobre coordenadas — nao conhece canvas, DOM nem pack.
     E o que permite percorrer onze horas de caminhada num teste de Node e
     afirmar que ninguem entra na agua em nenhum quadro. */
  'vida.mjs': 0,
  /* A VIDA DO AR de cada bioma — vagalume, brasa, plancton, arco. Camada 0:
     aritmetica sobre coordenadas, sem canvas e sem DOM. Portado da previa que
     o dono aprovou, e que morreu num HTML solto por nao ter casa. */
  /* O RELEVO: os acidentes do chao de cada bioma. Camada 0 e abaixo do
     mundo.mjs, que o importa — a decisao de onde cai um lago e aritmetica, e
     roda em Node junto com o resto da planta. */
  'relevo.mjs': 0,
  /* Onde a paisagem tem LUGARES: a curva da trilha e as regioes de densidade.
     Camada 0 pelo mesmo motivo do relevo — "clareira" e forma de paisagem, e
     nao identificador de franquia. O relevo, a decoracao e a fauna a importam
     para saber onde a estrada esta NAQUELA coluna. */
  'composicao.mjs': 0,
  /* So o TRACO do relevo: `acidentes()` ja decidia onde cada coisa cai, e
     continua no relevo.mjs. Saiu do mundo.mjs quando a trilha curva empurrou
     aquele arquivo para 603 linhas. */
  'relevo-pincel.mjs': 0,
  /* Quem esta onde: entra estado, sai resposta. Camada 0 porque nao toca DOM
     nem  global — e foi por sair do DOM que virou testavel, que e a razao
     inteira de ele existir separado. */
  'idle-quem.mjs': 0,
  /* O recorte da folha de icones: uma conta, sem DOM. */
  'icones.mjs': 0,
  /* O icone de cada item do jogo: tabela e recorte, sem DOM. */
  'itens-icone.mjs': 0,
  /* O NOME de cada item, ao lado do ícone dele e pela mesma razão: os dois
     respondem "como este id vira algo que uma pessoa reconhece". Camada 0 —
     entra pack e id, sai texto — e essa é a metade que importa: enquanto a
     resolução morava dentro de `pintarBolsa` (camada 4) ela não tinha teste de
     Node possível, e foi assim que dois chamadores inventaram cada um a sua
     saída. Um pôs id cru na Pokédex; o outro chamou um nome que não existia e
     derrubou a aba de Rotas. Ver o D-074. */
  'itens-nome.mjs': 0,
  /* A decoracao de cada bioma: tabela e colocacao, sem DOM. */
  'decoracao.mjs': 0,
  /* A conta da janela de mundo: caixa + zoom -> tamanho do canvas. Camada 0
     porque nao toca DOM nenhum — e foi por SAIR do DOM que ela virou testavel,
     que e a razao inteira de ela existir separada. Ver S616. */
  'viewport.mjs': 0,
  'particulas.mjs': 0,
  /* A FAUNA DE CENARIO: onde cada habitante cai e qual quadro ele mostra.
     Camada 0 e sem nome de franquia — QUEM decora vem do ContentPack (§0.3),
     que foi o que o portao conteudo cobrou da primeira versao. */
  'fauna.mjs': 0,
  /* GERADO por tools/baixar-caminhada.mjs: a grade de cada folha de caminhada.
     Camada 0 porque e dado puro — numeros por dex, sem identificador nenhum. */
  'caminhada-dados.mjs': 0,
  /* O estado do idle no navegador. Camada 0 porque só depende do MOTOR e do
     depósito — não conhece DOM, nem tela, nem navegação. É a mesma posição do
     `banco.mjs`, e pelo mesmo motivo: o dia em que o servidor do idle for
     ligado, troca-se a persistência e mais nada. */
  'idle-dados.mjs': 0,
  'idle-bolsa.mjs': 0,
  'idle-lance.mjs': 0,
  'idle-banco.mjs': 0,
  'idle-colheita.mjs': 0,
  /* Duas abas no mesmo idle (ST-3.2): o evento `storage` e o aviso. */
  'idle-abas.mjs': 0,
  /* A leitura do foco e a fala dele: DADO e CONTA, sem DOM. As duas saíram de
     camada 4 quando o portão Q2 provou que frase dentro de `innerHTML` não tem
     como ser afirmada — ver o cabeçalho do `avanco-foco.mjs`. */
  'avanco-foco.mjs': 0,
  'foco-fala.mjs': 0,
  /* O que a tela de ESCOLHA responde — o cartão e a sala (L-164). Camada 0
     pela mesma razão dos dois acima: resposta dentro de `innerHTML` não tem
     como ser afirmada, e o portão já cobrou isso quatro vezes. */
  'idle-escolha.mjs': 0,
  /* A HORA DO DIA (L-124, bloco 1.34). Camada 0, e aqui a razão tem um número:
     tudo que é DECISÃO — que período é, quanto escurece, onde está o astro,
     quantas estrelas acendem — é pego em Node a ~0,1 s por mutante. Colado no
     canvas, o mesmo defeito custaria ~30 s. E a cena passa a PINTAR o que este
     módulo devolveu, e mais nada.

     Ele não importa nada: a hora entra por argumento, sempre. Chamar
     `Date.now()` por dentro faria a linha de base visual mudar de resultado
     conforme a hora em que a suíte roda — o portão viraria sorte. */
  'hora-do-dia.mjs': 0,
  'elenco-condicao.mjs': 0,
  /* O que o ⏻ limpa (ST-1.2, D-109): a api e o armazém entram por argumento. */
  'sair.mjs': 0,
  /* A legenda dos climas (1.32b): entra o pack e o estágio, sai a tabela. */
  'climas-legenda.mjs': 0,
  /* O anúncio do chefe: o que a tela LÊ sobre ele, sem DOM (L-170). */
  'avanco-boss.mjs': 0,
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
  /* Catálogo de cosméticos do banner: os cenários e os oito efeitos. Dado puro,
     sem DOM. Importa `acervo-dados.mjs`, que é a MESMA camada — as dez cenas de
     arquivo entram por concatenação em vez de copiadas (ver o comentário lá). */
  'banner-dados.mjs': 0,
  /* A LIGA DE PREVISÃO no lado do jogador (R37). Camada 0 e sem DOM: ela guarda
     a temporada de quem está aqui e faz a conta, e nada mais.
     Importa `engine/calibracao.mjs` — o motor é BASE de todas as camadas, e a
     conta precisa ser a MESMA que o `server/liga.mjs` usa. Duas implementações
     de Brier seriam duas Ligas, com o número da tela divergindo do número do
     ranking.
     E ela NÃO importa carteira, banco nem aposta — de propósito, e com teste
     que afirma a ausência. A Spec antecipou a Liga da V5 para a V2 porque ela
     não move dinheiro; a camada é o que sustenta isso estruturalmente. */
  'liga-dados.mjs': 0,
  /* O catálogo das artes de banner e avatar (R43). Camada 0 e sem import
     nenhum: ele é uma lista de id, nome, arquivo e ENQUADRAMENTO, e mais nada.
     Lido pela customização (que escolhe), pelos três banners (que desenham) e
     pela grade de avatar. Fosse mais alto, quem desenha teria de importar quem
     escolhe. */
  'artes-dados.mjs': 0,
  /* A ABA da Liga (R37). Camada 4 — aplicação: desenha, escuta clique e lê o
     estado compartilhado. Importa `liga-dados.mjs` (camada 0), que faz a conta,
     e é o `resultado-tela.mjs` que a chama quando o campeão fica conhecido.
     A separação entre as duas é o que deixa a conta ser testada sem DOM: o
     `test/liga-local.mjs` roda inteiro em Node. */
  'liga-tela.mjs': 4,
  /* A aba do idle. Camada 4: ela desenha, e para desenhar precisa do motor, do
     estado local do idle e dos sprites. Não decide regra nenhuma — teto, custo e
     raridade continuam vindo do motor, e é o que mantém a troca pelo servidor
     sendo troca de implementação. */
  'idle-tela.mjs': 4,
  /* Os paineis de RESULTADO, separados da aba quando ela passou de 600 linhas.
     Camada 4 como ela: tocam DOM e leem o pack. A linha entre os dois nao e
     tamanho — a aba e a ESCOLHA, este e o RESULTADO. */
  'idle-paineis.mjs': 4,
  'nivel-criatura.mjs': 0,
  'estagios.mjs': 0,
  'npc.mjs': 0,
  'idle-campo.mjs': 4,
  'idle-biomas.mjs': 4,
  'idle-treino.mjs': 4,
  'idle-estagios.mjs': 4,
  'wiki-itens.mjs': 4,
  /* A CENA do idle: camara, zoom e quem anda. Mesma camada da aba, e separado
     dela por RESPONSABILIDADE — este roda requestAnimationFrame e conhece
     pixel; a aba monta formulario e nao roda quadro nenhum. */
  'idle-mundo.mjs': 4,
  /* ── O AVANÇO (A4b, §7.22) ────────────────────────────────────────────
     Quatro arquivos e TRÊS camadas, e a divisão é a mesma que o resto do idle
     já usa: por RESPONSABILIDADE, e não por tamanho.

     A GEOMETRIA é camada 0 porque não toca DOM — onde o mob nasce, para onde
     ele anda, e qual linha da folha corresponde a cada direção. Ela morava
     dentro da cena, e enquanto morou lá a conta da direção só podia ser
     conferida abrindo um navegador: foi exatamente ali que um defeito de SEIS
     das oito direções ficou escondido.

     O ESTADO é camada 3: é a única cola que conhece as duas pontas — o motor
     puro do §7.22 e o `localStorage` do idle. Nem o motor pode saber de disco,
     nem a tela pode saber de semente.

     A CENA e a TELA são camada 4, como toda tela do idle. */
  'avanco-geometria.mjs': 0,
  'avanco-tema.mjs': 4,
  'avanco-estado.mjs': 3,
  'avanco-cena.mjs': 4,
  'avanco-tela.mjs': 4,
  'avanco-painel.mjs': 4,
  /* A coluna da DIREITA da run — quem foi e o que ele carrega. Saiu do
     `avanco-tela.mjs` pela mesma razão que a esquerda saiu no A4g. */
  'avanco-direita.mjs': 4,
  /* O efeito do golpe sobre o alvo (L-171): ele desenha, e desenha no canvas
     do mundo. Camada 4 como o resto da cena. */
  'avanco-efeito.mjs': 4,
  /* CAMADA 0: decide QUAL folha usar a partir de dados. Quem CARREGA a folha é
     o `vivos.mjs` (camada 3), e a separação é o conserto do D-091 — a decisão
     morava colada ao `style.backgroundImage` e por isso nenhum teste sem
     navegador podia afirmá-la. */
  'folha-viva.mjs': 0,
  /* CAMADA 0: a costura do clima recebe pack, run e a equipe JA RESOLVIDA e
     devolve numero e frase. A equipe entra por argumento de proposito — buscar
     estado exigiria importar o avanco-estado.mjs, que importa este, e o
     ciclo ja derrubou a aba inteira uma vez (D-074). */
  'avanco-clima.mjs': 0,
  /* CAMADA 0: a posicao de cada particula e funcao pura de (t, i, W, H).
     Sem estado de modulo de proposito — foi uma let de modulo deixada para
     tras numa divisao que matou a cena inteira com a suite verde (D-089). */
  'clima-particulas.mjs': 0,
  /* CAMADA 3: so desenho. A conta mora na camada 0 acima, porque conta colada
     em canvas so pode ser conferida com navegador — e o que so o navegador
     confere acaba conferido por ninguem. */
  'idle-clima.mjs': 3,
  /* O CÉU do idle (1.34) — o astro, as estrelas e a luz da hora. Camada 3 pelo
     mesmo motivo que o clima logo acima: aqui é SÓ desenho, e toda a conta —
     que período é, quanto escurece, onde está o astro, quantas estrelas — mora
     no `hora-do-dia.mjs`, camada 0, pega em Node a ~0,1 s por mutante. */
  'idle-ceu.mjs': 3,
  /* O que o BIOMA faz sozinho — cachoeira, luz, detalhe vivo. Saiu do
     `idle-mundo.mjs` na quarta vez que ele passou de 600 linhas. */
  'idle-bioma-vivo.mjs': 4,
  'avanco-hud.mjs': 4,
  /* A janela de escolha do foco. Camada 4 como as outras telas do idle: ela
     desenha e escuta clique. A DECISAO — quem pode, quanto custa — mora no
     `engine/foco.mjs`, camada 0, e e testavel sem navegador. */
  'idle-foco.mjs': 4,
  /* O HUD que mora DENTRO da cena. Camada 4: recebe tudo pronto e so
     desenha — a coleta do que mostrar fica no `idle-tela`. */
  'idle-hud.mjs': 4,
  /* O selo do foco e a coleta do HUD: as duas respondem "quem esta comigo,
     e como esta?". Sairam do idle-tela quando ele passou de 600 linhas. */
  'idle-equipe.mjs': 4,
  /* Os tres cartoes de perfil: o que e, o que rende, o que custa. */
  'idle-perfis.mjs': 4,
  /* Tudo que a tela DIZ fora dos paineis: o banner, quem acompanha, e a
     faixa de recado. As tres respondem "o que esta acontecendo agora?". */
  'idle-avisos.mjs': 4,
  /* A ficha de uma especie: as perguntas, sem o desenho. Camada 0, pura —
     recebe o pack e devolve dados, entao a ficha inteira e conferivel sem
     navegador. */
  'pokedex-dados.mjs': 0,
  /* A tela da Pokedex. Camada 4: lista, busca e ficha. */
  'pokedex.mjs': 4,
  /* Quem TOCA a transicao. So `setTimeout` e troca de classe. */
  'evolucao-cena.mjs': 4,
  /* O QUE a transicao e, e quanto dura cada fase. Sem DOM: os tempos
     sao conferiveis em Node. */
  'evolucao-tela.mjs': 4,
  /* A LINHA DO TEMPO DA CAPTURA (1.23). Camada 4 e pura, como a da evolucao:
     ela recebe o resultado e devolve fases, casas da tira e o texto do laudo.
     Nao toca DOM e nao le estado — e por isso o teste consegue afirmar que a
     casa mostrada e a MESMA nos dois finais ate o veredito, que e a regra que
     impede a animacao de entregar o resultado antes da hora. */
  'captura-tela.mjs': 4,
  'captura-cena.mjs': 4,
  /* A CONFIRMACAO DA EXPEDICAO (1.24). Camada 4: ela le PACK, criatura e
     stamina, e monta um NO que o `dialogo.mjs` (camada 0) so anexa. A divisao e
     o que preserva a garantia do dialogo — texto vira no de TEXTO, nunca
     marcacao — enquanto a tela ganha sprite e barra. */
  'idle-confirma.mjs': 4,
  /* A LOJA PvE (1.25). Camada 4: desenha a vitrine, o balcao e a vendedora, e
     recebe COMO ler e COMO salvar em vez de importar o estado. A regra —
     preco, recusa, e a garantia de que comprar-e-vender da prejuizo — mora em
     `engine/loja.mjs`, porque ela mexe em SALDO. */
  'loja-tela.mjs': 4,
  /* A BOUTIQUE — irmã da loja PvE, e na mesma camada: o mesmo quadro, o
     mesmo vídeo, o outro NPC. Ver o cabeçalho de `loja-cash.mjs`. */
  'loja-cash.mjs': 4,
  /* O RESUMO DA EXPEDICAO. Camada 0 — entra estado e escolha, sai o que a tela
     vai desenhar. Ele saiu do `idle-confirma` porque aquele importa o dialogo,
     que importa o DOM: o modulo inteiro nao abria em Node, e por isso o resumo
     nao tinha teste. E ele estava errado — o cartao desenhava "89 -> NaN". */
  'expedicao-resumo.mjs': 0,
  /* AS CINCO FAIXAS DE RARIDADE. Camada 0 e sem import nenhum: entra a faixa,
     sai cor, brilho e pulso. Ela existe separada porque TRES telas definiam as
     cores por conta propria e as tres discordavam — e a mais rara usava
     'var(--gold)', que muda com o TEMA. Raridade e informacao, e informacao nao
     pode mudar de significado quando o jogador troca de tema. */
  'raridade.mjs': 0,
  /* GERADO por tools/folha-captura.mjs: a cor de cada bola, amostrada do icone
     que o jogo ja usa. Camada 0 e sem import — e ele e escrito pela mesma
     ferramenta que corta a tira, para nao existirem duas verdades sobre a
     mesma cor. */
  'bola-cores.mjs': 0,
  /* A ponte entre o motor (`especie`) e o save (`dex`). Camada 0, pura. */
  'evolucao-idle.mjs': 0,
  /* OS TREINADORES QUE MORAM NO BIOMA. Mesma camada da cena. Usam o MESMO
     passeio e o MESMO quadroDe do jogador — nao ha um segundo codigo de andar,
     e por isso nao ha como um ficar bom e o outro travado. */
  'idle-npc.mjs': 4,
  /* O POKEMON QUE ANDA COM O JOGADOR. Mesma camada da cena, separado por
     responsabilidade: este arquivo trocou de fonte de arte quatro vezes sem que
     a camera precisasse saber de nada. */
  'idle-companheiro.mjs': 4,
  /* O ELENCO DE FUNDO do bioma. Mesma camada da cena e separado dela por
     responsabilidade: a camera funciona sem este arquivo, e este nao sabe o
     que e zoom. */
  'idle-habitantes.mjs': 4,
  /* A CAMADA VIVA: o que tem animacao PROPRIA e vira elemento HTML sobre o
     canvas. Mesma camada da cena, separado por responsabilidade — a cena decide
     O QUE aparece, este sabe COMO uma coisa que se anima sozinha vive ali. */
  'vivos.mjs': 4,
  /* A ABA DE OUTFITS. Camada 4, como a do idle: toca DOM e canvas, e lê o
     acervo (camada 0). Ela não decide posse nenhuma — só desenha o que o
     acervo respondeu. */
  'outfit-tela.mjs': 4,
  /* O acervo de arte (R30): que arquivo cada avatar e cada cena usam, onde cada
     um se corta, e as DUAS posições de enquadramento de cada cena. Camada 0 sem
     import nenhum — é lido pela customização (que escolhe), pelo perfil (que
     resolve o avatar atual) e por `tools/preparar-acervo.mjs`, que roda no Node.
     Fosse mais alto, a ferramenta arrastaria DOM para dentro do Node. */
  'acervo-dados.mjs': 0,
  /* O texto do rodapé do banner: recebe números e devolve HTML. Camada 0 porque
     só importa `motor.mjs` (o símbolo da moeda). Ele existe separado do
     `banner.mjs` porque é a única parte do banner que afirma um NÚMERO SOBRE
     DINHEIRO — o retorno possível — e isso precisa de teste sem navegador. */
  'banner-texto.mjs': 0,
  /* A marca partida em duas peças para o letrado. Camada 0 e sem import
     nenhum: ela recebe o nome que o ContentPack declara e devolve as duas
     metades. Existe como função, e não como `<i>Poké</i><b>Arena</b>` no HTML,
     porque o identificador da franquia não pode morar fora do pack. */
  'marca.mjs': 0,
  /* O efeito de um `filter` de CSS sobre uma cor. Camada 0 e sem import
     nenhum: entra cor e cadeia, sai cor. Existe porque o portão de contraste
     lia a cor DECLARADA e era cego para `filter` — ver L-045. Fica no app, e
     não em `test/`, porque é conta de produto: qualquer tela que precise saber
     a cor resultante de um elemento filtrado usa a mesma. */
  /* Quais linhas da luta cabem na faixa dentro da arena (R27). Camada 0 e sem
     import: entra lista de linhas, sai lista curta. O `dom.mjs` a importa para
     desenhar, e é o único import que o `dom.mjs` tem. */
  /* A cédula desenhada em SVG (R28): entra valor e espécie, sai string. Camada
     0 e sem import — a nota é conferível num teste de Node, e quem resolve o
     endereço do retrato é quem a chama, porque cascata de asset é camada 1. */
  'cedula.mjs': 0,
  'mini-log.mjs': 0,
  'filtro-cor.mjs': 0,
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
  /* Os gráficos do painel, como TEXTO: entra lista de números, sai string SVG.
     Camada 0 e sem import nenhum — é o que permite ao teste MEDIR a geometria
     no Node em vez de olhar para ela. Quem desenha na tela é o adm.mjs. */
  'grafico.mjs': 0,
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
  /* A zona de ação troca de modo com a fase. Camada 4 porque chama o banner,
     que é camada 4 — o `meu-lutador.mjs` que ela substitui era camada 2 porque
     desenhava sozinho; este só coordena. */
  'zona-acao.mjs': 4,
  /* Pintura das arenas: usa a geometria do render para desenhar, então fica
     ACIMA dele. A direção importa — o render recebe o cenário por injeção e
     não importa o catálogo, senão os dois se fechariam num ciclo. */
  'arenas.mjs': 3,
  'rodada.mjs': 3,
  'coreografia.mjs': 3,
  'eventos.mjs': 3,
  /* O PERFIL COMO DADO (bloco 0.1). Camada 0: importa `estado.mjs` e `api.mjs`,
     e mais nada do app. Não desenha, não resolve endereço de arte, não conhece
     DOM — carrega, grava, e projeta o que o servidor disse.
     A camada é o que sustenta a fronteira: no dia em que alguém precisar de um
     sprite ou de um elemento aqui dentro, o teste de camadas reprova, e a
     reprovação é a pergunta certa — porque foi exatamente o acoplamento com
     `sprites.mjs` e `desafios.mjs` que deixou o critério de saída do F1.10
     impossível de medir, e o D-045 vivo por semanas. */
  'perfil-dados.mjs': 0,
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
/* SOME O QUE É TEXTO, FICA O QUE É CÓDIGO.
 *
 * ── O TEMPLATE NÃO É TEXTO INTEIRO (D-046) ────────────────────────────────
 *
 * A versão anterior tratava a crase como as aspas: mascarava do abre ao fecha.
 * Só que `${…}` no meio de um template É CÓDIGO, e apagá-lo deixava invisível
 * todo símbolo que só aparecesse ali.
 *
 * Medido: tirar `tituloDe` do import de `app/modules/faixa.mjs` — onde ele só
 * aparece em `` `NV ${np.nivel} · ${tituloDe(np.nivel)}` `` — deixava o portão
 * VERDE. Um import genuinamente ausente, que derruba o módulo em execução,
 * passando pela rede que existe exatamente para isso. E interpolação é o jeito
 * normal de escrever texto de tela neste projeto, então a cegueira valia para
 * muita coisa.
 *
 * Agora o percurso é mútuo: `emCodigo` anda pelo código e entrega o comando ao
 * `emTemplate` na crase; `emTemplate` mascara as partes literais e devolve o
 * comando ao `emCodigo` dentro de `${…}`. Aninha nos dois sentidos — template
 * dentro de interpolação dentro de template — porque é recursão de verdade e
 * não um contador.
 *
 * A CHAVE QUE FECHA A INTERPOLAÇÃO PRECISA SER CONTADA, e não a primeira que
 * aparecer: `` `${ g({ a: b }) }` `` tem duas, e parar na do objeto faria o
 * resto do miolo virar texto.
 *
 * ── O QUE ELE CONTINUA NÃO SABENDO, E É O D-032 ───────────────────────────
 *
 * Literal de expressão regular com aspas dentro. Distinguir `/` que abre regex
 * de `/` que divide exige contexto que este percurso não tem, e a ficha do
 * D-032 registra o sintoma. Fica aberto de propósito: é um problema de risco
 * diferente, e resolvê-lo junto faria um bloco entregar duas coisas. */
export function semTexto(src) {
  const out = [...src];
  const n = src.length;
  let k = 0;

  const aspas = q => {
    out[k++] = ' ';
    while (k < n && src[k] !== q) {
      if (src[k] === '\\') out[k++] = ' ';
      if (k < n) out[k++] = ' ';
    }
    if (k < n) out[k++] = ' ';
  };

  function emTemplate() {
    out[k++] = ' ';                                   // a crase de abertura
    while (k < n) {
      if (src[k] === '\\') { out[k] = ' '; if (k + 1 < n) out[k + 1] = ' '; k += 2; continue; }
      if (src[k] === '`') { out[k++] = ' '; return; } // fecha o template
      if (src[k] === '$' && src[k + 1] === '{') {
        out[k] = ' '; out[k + 1] = ' '; k += 2;       // o `${` some
        emCodigo(true);                               // o miolo FICA
        continue;
      }
      out[k++] = ' ';                                 // parte literal: some
    }
  }

  function emCodigo(dentroDeInterpolacao) {
    let chaves = 0;
    while (k < n) {
      const c = src[k], nx = src[k + 1] ?? '';
      if (c === '/' && nx === '/') { while (k < n && src[k] !== '\n') out[k++] = ' '; continue; }
      if (c === '/' && nx === '*') {
        while (k < n && !(src[k] === '*' && src[k + 1] === '/')) out[k++] = ' ';
        if (k < n) { out[k] = ' '; out[k + 1] = ' '; k += 2; }
        continue;
      }
      if (c === '"' || c === "'") { aspas(c); continue; }
      if (c === '`') { emTemplate(); continue; }
      if (dentroDeInterpolacao) {
        if (c === '{') { chaves++; k++; continue; }
        if (c === '}') {
          if (chaves === 0) { out[k++] = ' '; return; }   // fecha a interpolação
          chaves--; k++; continue;
        }
      }
      k++;
    }
  }

  emCodigo(false);
  return out.join('');
}

const nomesImportados = txt =>
  new Set([...txt.matchAll(/import\s*\{([^}]*)\}/g)]
    .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)));

/* ── UM `const` DECLARA VÁRIOS, E SÓ O PRIMEIRO ERA VISTO ─────────────────
 *
 * `const W = cv.width, H = cv.height;` declara DOIS nomes. A varredura pegava
 * só o `W` — e o `H` passava a parecer uso do `H` exportado pelo `render.mjs`.
 *
 * Ele não reprovava nada enquanto o mesmo arquivo tivesse um parâmetro chamado
 * `H` em qualquer outra função: a lista de parâmetros o declarava por acidente.
 * Apareceu quando o `idle-mundo.mjs` foi dividido e a função que tinha esse
 * parâmetro mudou de arquivo — o falso positivo estava lá o tempo todo,
 * escondido atrás de uma coincidência.
 *
 *   > É o quarto falso positivo desta varredura, depois de chave de objeto,
 *   > artefato de mascaramento e o primeiro campo de um destructure. A lição é
 *   > a mesma das três: **varredura por texto tem teto**, e quem pega de
 *   > verdade é o portão de navegador. Esta continua como rede barata.
 *
 * A cauda do `const` é lida até o fim do comando, e cada declarador contribui
 * o nome antes do `=`. Destructure na cauda entra pela mesma porta que o
 * `nomesDeParametro` já abriu. */
const declaradosNoTopo = txt => {
  const out = new Set();
  for (const m of txt.matchAll(
    /^[ \t]*(?:export\s+)?(?:const|let|var)\s+([^;\n]*)/gm)) {
    for (const pedaco of m[1].split(','))
      for (const nome of pedaco.replace(/[{}[\]]/g, ' ')
                              .split(/[=:\s]/).filter(Boolean))
        if (/^[A-Za-z_$][\w$]*$/.test(nome)) { out.add(nome); break; }
  }
  for (const m of txt.matchAll(
    /^\s*(?:export\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  return out;
};

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
  /* ── O PRIMEIRO CAMPO DE UM PARÂMETRO DESESTRUTURADO ────────────────────
     `function f(e, { pack, chave })` — ao quebrar por vírgula, o segundo
     pedaço vem como `{ pack`, e o `split` devolvia `{`, que não casa com o
     teste de identificador. Resultado: **o primeiro campo de todo destructure
     era invisível** para este portão.

     Ele não reprovava nada por isso — só deixava de proteger. Apareceu quando
     um módulo novo teve `pack` SÓ nessa posição, e o portão o acusou de usar
     sem importar um símbolo que era parâmetro dele.

       > Um portão com um ponto cego não avisa que tem um ponto cego. Ele
       > acusa o inocente no dia em que o cego encontra alguém.

     Trocar as chaves e colchetes por espaço antes de partir resolve os dois
     lados: o primeiro campo passa a contar, e nada mais muda. */
  for (const l of listas)
    for (const n of l.replace(/[{}[\]]/g, ' ')
                     .split(',').map(x => x.trim().split(/[=:\s]/)[0]).filter(Boolean))
      if (/^[A-Za-z_$][\w$]*$/.test(n)) out.add(n);
  return out;
};

export function suite() {
  const s = criarSuite('modulos');
  const arquivos = readdirSync(DIR).filter(f => f.endsWith('.mjs'));
  const fonte = Object.fromEntries(arquivos.map(f => [f, readFileSync(new URL(f, DIR), 'utf8')]));

  /* ── O MASCARADOR, MEDIDO DIRETAMENTE (D-046) ───────────────────────────
   *
   * `semTexto` não tinha teste nenhum, e TRÊS suítes dependem dele — esta, a
   * `carteira` e a `tema`. Um mascarador sem teste é a fundação silenciosa de
   * toda varredura estática deste projeto.
   *
   * O defeito que trouxe estes testes: ele mascarava o template literal
   * INTEIRO, incluindo o que está dentro de `${…}` — que é código, e não texto.
   * Consequência medida: tirar `tituloDe` do import de `app/modules/faixa.mjs`,
   * onde ele só aparece dentro de uma interpolação, deixava o portão VERDE. Um
   * import genuinamente ausente, que derruba o módulo em execução, invisível.
   *
   * A regra que os testes abaixo fixam: **some o que é texto, fica o que é
   * código** — e o miolo de `${…}` é código.
   *
   * O `D-032` continua aberto de propósito: literal de expressão regular com
   * aspas exige saber se `/` abre regex ou é divisão, e isso não se resolve
   * sem contexto. Misturar as duas coisas num bloco faria a mensagem do commit
   * falar de duas correções de risco muito diferente. */
  const vivo = (codigo, nome) => new RegExp(`(?<![.\\w$])${nome}(?![\\w$])`).test(codigo);

  s.teste('semTexto apaga comentário de linha e de bloco', () => {
    const c = semTexto('const a = 1; // some\n/* some tambem */ const b = 2;');
    ok(vivo(c, 'const'), 'apagou código junto com o comentário');
    ok(!vivo(c, 'some'), 'o comentário sobreviveu ao mascaramento');
  });

  s.teste('semTexto apaga o conteúdo de aspas simples e duplas', () => {
    const c = semTexto(`const a = "segredo"; const b = 'outro';`);
    ok(!vivo(c, 'segredo') && !vivo(c, 'outro'), 'texto entre aspas sobreviveu');
    ok(vivo(c, 'const'), 'apagou código junto');
  });

  /* O CASO DO D-046, E ELE É O MOTIVO DESTA SEÇÃO EXISTIR. */
  s.teste('semTexto PRESERVA o código dentro de `${…}` num template', () => {
    const c = semTexto('const x = `NV ${nivel} · ${tituloDe(nivel)}`;');
    ok(vivo(c, 'tituloDe'),
      'o símbolo usado dentro de `${…}` sumiu no mascaramento. É o D-046: a ' +
      'interpolação é CÓDIGO, e apagá-la deixa invisível todo import que só ' +
      'apareça ali — foi assim que `tituloDe` sumiu de `faixa.mjs` sem o ' +
      'portão notar.');
    ok(vivo(c, 'nivel'), 'a variável interpolada sumiu junto');
    ok(!vivo(c, 'NV'), 'a parte LITERAL do template sobreviveu — ela é texto');
  });

  s.teste('semTexto lida com template dentro de interpolação', () => {
    const c = semTexto('const x = `a ${ f(`b ${dentro} c`) } d`;');
    ok(vivo(c, 'dentro') && vivo(c, 'f'), 'template aninhado comeu o código do miolo');
    ok(!vivo(c, 'd'), 'a parte literal externa sobreviveu');
  });

  /* O SÍMBOLO PRECISA VIR DEPOIS DA CHAVE DO OBJETO, e isto é uma correção
     deste próprio teste.
     A primeira versão usava `${ g({ a: usado }) }`, com o símbolo ANTES da
     chave que fecha o objeto — e ele sobrevive dos dois jeitos, porque o
     mascaramento errado só começa DEPOIS dela. O defeito plantado `S524`
     escapou por isso, e foi o Q2 que mostrou. */
  s.teste('semTexto não confunde chave de objeto com o fim da interpolação', () => {
    const c = semTexto('const x = `${ g({ a: 1 }, depoisDaChave) } fim`;');
    ok(vivo(c, 'depoisDaChave'),
      'a `}` do objeto foi lida como fim da interpolação, e o resto do código ' +
      'do miolo virou texto. A chave que fecha a interpolação precisa ser ' +
      'CONTADA, e não a primeira que aparecer.');
    ok(!vivo(c, 'fim'), 'a parte literal depois da interpolação sobreviveu');
  });

  s.teste('semTexto respeita crase escapada dentro do template', () => {
    const c = semTexto('const x = `a \\` ainda texto ${vivo1} `;');
    ok(vivo(c, 'vivo1'), 'a crase escapada foi lida como fim do template');
  });

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
    /* REEXPORTAÇÃO NÃO É POSSE, e a distinção entrou no bloco 0.1.
     *
     * `export { x } from './outro.mjs'` diz "x passa por aqui", não "x é meu".
     * Sem separar os dois, o módulo que DEFINE x é acusado de usá-lo sem
     * importar — e a saída óbvia seria desfazer a extração, que é justamente o
     * que este arquivo existe para incentivar.
     *
     * Apareceu quando `perfil-dados.mjs` nasceu e o `perfil.mjs` passou a
     * reexportá-lo para não mexer nos onze módulos que dependem dele. Não
     * apareceu antes porque as outras reexportações do projeto
     * (`progressao.mjs`, `colocacao.mjs`) apontam para `engine/`, que esta
     * varredura não percorre.
     *
     * Também passa a ler TODOS os blocos `export {` do arquivo, e não só o
     * primeiro: com uma reexportação no topo, o `split` antigo lia só ela e
     * perdia a lista de exportação de verdade lá embaixo. */
    const exportados = txt =>
      [...txt.matchAll(/export\s*\{([^}]*)\}\s*(from\s*['"][^'"]+['"])?/g)]
        .filter(m => !m[2])                       // reexportação não conta
        .flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean));
    const dono = new Map();
    for (const n of exportados(motor)) dono.set(n, 'engine');
    for (const [f, txt] of Object.entries(fonte))
      for (const n of exportados(txt)) dono.set(n, f);

    const alvos = [...Object.entries(fonte), ['app/index.html', APP]];
    for (const [f, txt] of alvos) {
      const codigo = semTexto(txt);
      /* O NOME NUMA LINHA DE REEXPORTAÇÃO NÃO É USO, e é a outra metade da
         distinção acima. `export { x } from './outro.mjs'` cita `x` sem nunca
         o trazer para o escopo — não há o que importar ali, e exigir o import
         faria a reexportação virar erro por existir.
         Entra em `local` e não numa exceção à parte porque é exatamente isso
         que ele é para este teste: um nome que o arquivo pode citar. */
      const reexportados = [...txt.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)]
        .flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean));
      const local = new Set([...declaradosNoTopo(txt), ...nomesImportados(txt),
                             ...nomesDeParametro(txt), ...reexportados]);
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
      const base = fileURLToPath(new URL(`../${dir}/`, import.meta.url));
      for (const f of readdirSync(base)) {
        if (!f.endsWith('.mjs')) continue;
        const txt = readFileSync(base + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
        for (const m of txt.matchAll(/from\s+['"]([^'"]*\/test\/[^'"]*)['"]/g))
          achados.push(`${dir}/${f} → ${m[1]}`);
      }
    }
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of html.matchAll(/from\s+['"]([^'"]*\/test\/[^'"]*)['"]/g))
      achados.push(`app/index.html → ${m[1]}`);

    igual(achados.length, 0,
      `código de produção importando de \`test/\`:\n      ${achados.join('\n      ')}\n` +
      `      Um deploy que empacote só \`server/\`, \`engine/\`, \`content/\` e ` +
      `\`app/\` falha no import antes de abrir a porta — e o sintoma aparece no ` +
      `primeiro deploy real, que é o pior momento para descobri-lo.`);
  });

  /* TODO MÓDULO DO APP PRECISA AO MENOS *ANALISAR* (R1).
   *
   * Este arnês varre os módulos de tela como TEXTO — nenhuma suíte de Node os
   * executa, porque eles falam com o DOM. Consequência: **um erro de sintaxe
   * neles passa a suíte inteira verde.**
   *
   * Aconteceu no R1: uma quebra de linha literal dentro de uma string deixou
   * `customizacao.mjs` inválido, 667 testes passaram, e o app não bootava —
   * `sessionBox` vazio e 327 elementos na página. Quem pegou foi abrir o jogo.
   *
   * O Q5 pega isso, e é o argumento dele. Mas o Q5 custa Chromium e não roda no
   * `--sem-navegador`, que é o atalho usado durante a construção — então o erro
   * sobrevive exatamente no laço em que se escreve código. Analisar custa
   * milissegundos e fecha o buraco onde ele dói.
   *
   * COMO SE ANALISA SEM EXECUTAR, e por que não é o `vm`. `new Function` não
   * aceita `import`/`export`, e `vm.SourceTextModule` exige
   * `--experimental-vm-modules` — sem a bandeira ele nem é construtor, e o
   * teste reprovaria os 53 módulos por uma razão que não é a deles. Teste que
   * dá falso vermelho é pior que teste ausente: ele treina quem lê a ignorá-lo.
   *
   * `import()` resolve, e a distinção é exata: **`SyntaxError` acontece na
   * ANÁLISE**, antes de qualquer linha rodar. Tudo o mais — `document is not
   * defined`, `localStorage` ausente — é execução, e é esperado aqui. Capturar
   * só o primeiro é perguntar exatamente "isto analisa?". */
  s.teste('todo módulo do app tem sintaxe válida', async () => {
    const ruins = [];
    for (const f of readdirSync(DIR).filter(n => n.endsWith('.mjs'))) {
      try { await import(new URL(f, DIR).href); }
      catch (e) { if (e instanceof SyntaxError) ruins.push(`app/modules/${f}: ${e.message}`); }
    }
    igual(ruins.length, 0,
      `${ruins.length} módulo(s) que nem analisam:\n      ` + ruins.join('\n      ') +
      `\n      A suíte de Node varre estes arquivos como TEXTO e não os executa: ` +
      `sem esta conferência, sintaxe quebrada passa VERDE e o app não boota.`);
  });

  /* O BOTÃO DE PROTEÇÃO VIVE DENTRO DO MODAL (R1, S300).
   *
   * `.modal-backdrop` é `display:flex` quando aberto. Um filho DIRETO dele vira
   * irmão do `.modal` e disputa a largura — o perfil ficava espremido contra a
   * esquerda, com metade da tela ocupada por um botão.
   *
   * A ASSERÇÃO É ESTREITA DE PROPÓSITO, e vale dizer por quê. Contar filhos
   * diretos do backdrop exigiria analisar o HTML — o `</div>` que fecha o
   * `.modal` não se distingue dos outros por indentação, e a primeira versão
   * deste teste acusou 42 "elementos soltos" no perfil, todos internos.
   *
   * O que ela cobra é exato: o botão não pode vir logo depois de um `</div>`
   * que feche o modal. Pega a regressão real — que é textualmente essa — sem
   * fingir uma análise que não faz. Um teste estreito e honesto vale mais que
   * um largo que erra. */
  s.teste('o botão de proteção fica DENTRO do modal do perfil', () => {
    const linhas = APP.split('\n');
    const i = linhas.findIndex(l => l.includes('id="btnProtecaoPerfil"'));
    ok(i > 0, 'não achei o botão de proteção no perfil — o teste perdeu a âncora');
    /* Sobe as linhas em branco e comentários até a última linha de marcação. */
    let j = i - 1;
    while (j > 0 && (linhas[j].trim() === '' || /^\s*(<!--|[^<]*-->)/.test(linhas[j]))) j--;
    ok(!/^\s*<\/div>\s*$/.test(linhas[j]),
      `o botão vem logo depois de \`${linhas[j].trim()}\`, que fecha o \`.modal\`. ` +
      `Ele passa a ser filho DIRETO do \`.modal-backdrop\`, que é flex — vira ` +
      `irmão do perfil e rouba a largura dele. Era o perfil espremido contra a ` +
      `esquerda, com metade da tela ocupada por um botão.`);
  });

  /* TROCAR O VALOR REAPLICA A APOSTA (R1, S301).
   *
   * As fichas mudavam `S.chipVal` e mais nada; o valor e o retorno exibidos vêm
   * de `placeBet`, que só roda ao clicar no LUTADOR. Trocar de ficha mostrava os
   * números do valor ANTIGO até alguém reclicar no Pokémon.
   *
   * Teste de texto porque `carteira.mjs` fala com o DOM e não roda no Node — e
   * porque o defeito É textual: a chamada existe ou não existe. Os DOIS caminhos
   * que mudam o valor precisam dela, senão o defeito volta por uma porta só. */
  s.teste('mudar o valor da aposta reaplica a aposta viva', () => {
    const src = readFileSync(new URL('carteira.mjs', DIR), 'utf8');
    ok(/function reaplicarAposta/.test(src),
      '`reaplicarAposta` sumiu de carteira.mjs — sem ela, trocar de ficha deixa a ' +
      'tela mostrando o retorno do valor antigo até alguém reclicar no lutador');
    /* Os dois caminhos: a ficha e o valor digitado. */
    const chamadas = (src.match(/reaplicarAposta\(\)/g) || []).length;
    ok(chamadas >= 3,
      `\`reaplicarAposta\` aparece ${chamadas}x (1 definição + as chamadas). Os DOIS ` +
      `caminhos que mudam o valor — a ficha e o valor personalizado — precisam ` +
      `chamá-la; corrigir só um deixa o defeito voltar pela outra porta.`);
  });

  /* NENHUMA AÇÃO ATRÁS DE DIÁLOGO NATIVO (R1).
   *
   * `confirm`, `prompt` e `alert` não são garantidos. Em iframe sem
   * `allow-modals`, em navegador embutido, em WebView e em automação eles
   * devolvem `false`/`null` na hora, sem mostrar nada. E `false` é exatamente
   * "o usuário cancelou":
   *
   *     if (!confirm('Sair da conta?')) return;   // volta SEMPRE
   *
   * Seis ações do jogo estavam assim, entre elas SAIR DA CONTA — botão
   * clicável, bonito e inerte. Foi encontrado por alguém tentando deslogar.
   *
   * O teste é de texto porque o defeito é de texto: a chamada some do código ou
   * não some, e não há como um teste em Node exercer um diálogo de navegador. */
  s.teste('nenhuma ação fica atrás de confirm, prompt ou alert', () => {
    const NATIVOS = /(?:^|[^.\w])(confirm|prompt|alert)\s*\(/;
    const ruins = [];
    for (const f of readdirSync(DIR).filter(n => n.endsWith('.mjs'))) {
      readFileSync(new URL(f, DIR), 'utf8').split('\n').forEach((linha, i) => {
        /* Comentário citando o nome não é chamada — e este projeto comenta
           muito, inclusive explicando por que estes não se usam. */
        const codigo = linha.replace(/\/\*.*?\*\//g, '')
                            .replace(/^\s*\*.*$/, '')
                            .replace(/\/\/.*$/, '');
        const m = codigo.match(NATIVOS);
        if (m) ruins.push(`app/modules/${f}:${i + 1}  ${m[1]}(`);
      });
    }
    igual(ruins.length, 0,
      `${ruins.length} diálogo(s) nativo(s):\n      ` + ruins.join('\n      ') +
      `\n      Onde o navegador suprime diálogo, \`confirm\` devolve false e ` +
      `\`prompt\` devolve null — a ação nunca acontece e o botão fica inerte.\n` +
      `      Use \`confirmar\`, \`pedirTexto\` ou \`avisar\` de \`dialogo.mjs\`.`);
  });

  return s;
}
