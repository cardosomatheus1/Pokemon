/* Executor dos portões Q1, Q3 e Q4 do bloco F0.1.
 * Uso:  node test/run.mjs           roda a suíte
 *       node test/run.mjs --gerar   regrava as fixtures (só quando a mudança é intencional)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as golden from './golden.mjs';
import * as invariantes from './invariantes.mjs';
import * as estatistica from './estatistica.mjs';
import * as fonteUnica from './fonte-unica.mjs';
import * as paridade from './paridade.mjs';
import * as estado from './estado.mjs';
import * as modulos from './modulos.mjs';
import * as conteudo from './conteudo.mjs';
import * as semente from './semente.mjs';
import * as margem from './margem.mjs';
import * as precisao from './precisao.mjs';
import * as exposicao from './exposicao.mjs';
import * as carteira from './carteira.mjs';
import * as banco from './banco.mjs';
import * as informacao from './informacao.mjs';
import * as assets from './assets.mjs';
import * as telemetria from './telemetria.mjs';
import * as commit from './commit.mjs';
import * as saida from './saida-v09.mjs';
import * as progressao from './progressao.mjs';
import * as tema from './tema.mjs';
import * as arenas from './arenas.mjs';
import * as portao from './portao.mjs';
import * as contraste from './contraste.mjs';
import * as servidor from './servidor.mjs';
import * as bancoServidor from './banco-servidor.mjs';
import * as auth from './auth.mjs';
import * as carteiraServidor from './carteira-servidor.mjs';
import * as scheduler from './scheduler.mjs';
import * as transporte from './transporte.mjs';
import * as apostaServidor from './aposta-servidor.mjs';
import * as concorrencia from './concorrencia.mjs';
import * as emissao from './emissao.mjs';
import * as limites from './limites.mjs';
import * as protecao from './protecao.mjs';
import * as resultado from './resultado.mjs';
import * as rotas from './rotas.mjs';
import * as protecaoTela from './protecao-tela.mjs';
import * as logBatalha from './log.mjs';
import * as painelRodada from './painel-rodada.mjs';
import * as resultadoCentro from './resultado-centro.mjs';
import * as arenaLegivel from './arena-legivel.mjs';
import * as vencedorAnimado from './vencedor-animado.mjs';
import * as ortografia from './ortografia.mjs';
import * as arteArena from './arte-arena.mjs';
import * as margemCasa from './margem-casa.mjs';
import * as filtroCor from './filtro-cor.mjs';
import * as distribuicao from './distribuicao.mjs';
import * as grafico from './grafico.mjs';
import * as politica from './politica.mjs';
import * as telemetriaLigada from './telemetria-ligada.mjs';
import * as xpRodada from './xp-rodada.mjs';
import * as ordemBolas from './ordem-bolas.mjs';
import * as shinyArena from './shiny-arena.mjs';
import * as marcaArte from './marca-arte.mjs';
import * as miniLog from './mini-log.mjs';
import * as cedula from './cedula.mjs';
import * as marca from './marca.mjs';
import * as hash from './hash.mjs';
import * as laco from './laco.mjs';
import * as adminAuth from './admin-auth.mjs';
import * as salaCliente from './sala-cliente.mjs';
import * as conexaoTexto from './conexao-texto.mjs';
import * as modoServidor from './modo-servidor.mjs';
import * as progressaoServidor from './progressao-servidor.mjs';
import * as adminServidor from './admin.mjs';
import * as packOriginal from './pack-original.mjs';
import * as lacoServidor from './laco-servidor.mjs';
import * as progressaoLigada from './progressao-ligada.mjs';
import * as caixas from './caixas-teste.mjs';
import * as instancia from './instancia.mjs';
import * as bioma from './bioma.mjs';
import * as evolucao from './evolucao.mjs';
import * as criaturasServidor from './criaturas-servidor.mjs';
import * as expedicao from './expedicao.mjs';
import * as captura from './captura.mjs';
import * as drops from './drops.mjs';
import * as idleServidor from './idle-servidor.mjs';
import * as mundo from './mundo.mjs';
import * as outfit from './outfit.mjs';
import * as vida from './vida.mjs';
import * as particulas from './particulas.mjs';
import * as relevo from './relevo.mjs';
import * as faunaTeste from './fauna.mjs';
import * as bandeiras from './bandeiras-suite.mjs';
import * as viewport from './viewport.mjs';
import * as idleQuem from './idle-quem.mjs';
import * as idleEscolha from './idle-escolha.mjs';
import * as repertorioSuite from './repertorio.mjs';
import * as avancoBossSuite from './avanco-boss.mjs';
import * as avancoEfeitoSuite from './avanco-efeito.mjs';
import * as folhaVivaSuite from './folha-viva.mjs';
import * as climaIdleSuite from './clima-idle.mjs';
import * as icones from './icones.mjs';
import * as decoracao from './decoracao.mjs';
import * as itensIcone from './itens-icone.mjs';
import * as economiaIdle from './economia-idle.mjs';
import * as vagasSuite from './vagas.mjs';
import * as nivelCriatura from './nivel-criatura.mjs';
import * as estagiosSuite from './estagios.mjs';
import * as elencoEstagioSuite from './elenco-estagio.mjs';
import * as waveSuite from './wave.mjs';
import * as roteiroWaveSuite from './roteiro-wave.mjs';
import * as runAvancoSuite from './run-avanco.mjs';
import * as avancoTelaSuite from './avanco-tela.mjs';
import * as avancoEstadoSuite from './avanco-estado.mjs';
import * as avancoPagaSuite from './avanco-paga.mjs';
import * as avancoForcaSuite from './avanco-forca.mjs';
import * as rotaOffSuite from './rota-off.mjs';
import * as vitrineSuite from './vitrine.mjs';
import * as estilhacoSuite from './estilhaco.mjs';
import * as avancoSuite from './avanco.mjs';
import * as ausenteSuite from './ausente.mjs';
import * as npcSuite from './npc.mjs';
import * as itensCatalogo from './itens-catalogo.mjs';
import * as ligacaoSuite from './ligacao.mjs';
import * as origemSuite from './origem.mjs';
import * as itensNomeSuite from './itens-nome.mjs';
import * as raridadeSuite from './raridade.mjs';
import * as capturaTelaSuite from './captura-tela.mjs';
import * as idleConfirmaSuite from './idle-confirma.mjs';
import * as lojaSuite from './loja.mjs';
import * as composicaoSuite from './composicao.mjs';
import * as focoSuite from './foco.mjs';
import * as idleHudSuite from './idle-hud.mjs';
import * as pokedexSuite from './pokedex.mjs';
import * as evoIdleSuite from './evolucao-idle.mjs';
import * as idleDados from './idle-dados.mjs';
import * as idleTela from './idle-tela.mjs';
import * as rotasIdle from './rotas-idle.mjs';
import * as colocacao from './colocacao.mjs';
import * as banner from './banner.mjs';
import * as shiny from './shiny.mjs';
import * as adm from './adm.mjs';
import * as visual from './visual.mjs';
import { precisaNavegador as precisaDeNavegador } from './bandeiras.mjs';
import * as acervo from './acervo.mjs';
import * as calibracao from './calibracao.mjs';
import * as ligaServidor from './liga-servidor.mjs';
import * as ligaLocal from './liga-local.mjs';
import * as artes from './artes.mjs';
import * as servir from './servir.mjs';

/* `--so=a,b,c` — o RECORTE (T3).
 *
 * O V1.20 mediu o custo do ciclo e achou dois desperdícios estruturais. Este
 * resolve o maior deles: `--gerar` regravava TUDO — golden, precisão
 * (154.000 x 8), informação (300 rodadas), margem (300 x 8.000) e a linha de
 * base de 10.000 rodadas — quatro minutos de Monte Carlo para reescrever UM
 * arquivo. Um bloco que mexe só em tela precisava só da linha de base visual, e
 * pagou os quatro minutos quatro vezes.
 *
 * A MESMA BANDEIRA recorta a suíte: `node test/run.mjs --so=contraste,visual`
 * roda só o que interessa enquanto se constrói.
 *
 * E ELE GRITA QUE FOI PARCIAL, nas duas pontas. Portão que parece inteiro sem
 * ser é pior que portão ausente — é a mesma lição do `sabotagem:tocados`, e é
 * por isso que o `npm run portoes` recusa a bandeira. */
const argSo = process.argv.find(a => a.startsWith('--so='));
/* `--sem-navegador` — TODAS as suítes menos as que precisam de Chromium (D-017).
 *
 * O `npm run rapido` carregava a lista à mão, e ela cobria 21 das 35 suítes que
 * não precisam de navegador: catorze ficaram de fora porque ninguém lembrou de
 * acrescentá-las quando nasceram. Uma lista escrita à mão de coisas que crescem
 * dessincroniza — é a mesma razão de as pastas da caixa de areia virem do `git`
 * e não de um `ARQUIVOS` manual.
 *
 * Aqui a lista é DERIVADA: tudo que não está em `COM_NAVEGADOR`. Suíte nova
 * entra sozinha, e não há como esquecer. */
const semNavegador = process.argv.includes('--sem-navegador');
const SO = argSo ? argSo.slice(5).split(',').map(x => x.trim()).filter(Boolean) : null;
const querSo = nome => !SO || SO.includes(nome);

if (SO && process.env.EXIGE_VISUAL === '1') {
  console.error('\n--so não vale no portão de fechamento. Rode npm run portoes inteiro.');
  process.exit(2);
}

function avisoParcial(oQue) {
  console.log(`\n⚠  EXECUÇÃO PARCIAL — só ${oQue}.`);
  console.log('   Isto NÃO é a suíte. Rode sem --so antes de fechar o bloco.\n');
}

if (process.argv.includes('--gerar')) {
  if (SO) avisoParcial(SO.join(', '));
  console.log('gerando fixtures a partir do motor atual...');
  /* Cada fixture atrás do seu nome. O custo entre parênteses é medido e está
     aqui para quem for escolher o recorte saber o que está comprando. */
  if (querSo('golden')) {                                   // ~0,1 s
    const g = golden.gerar();
    console.log(`  golden: ${g.length} rodadas`);
  }
  if (querSo('precisao')) {                                 // ~37 s
    const pr = precisao.gerar();
    console.log(`  precisão: ${pr.sims} sims x ${pr.repeticoes} cálculos · ` +
                `${(pr.msPorCalculo/1000).toFixed(2)}s cada · erro previsto do pior ` +
                `${(pr.erroPrevistoPior*100).toFixed(2)}% · dispersão ${(pr.dispersaoPior*100).toFixed(2)}%`);
  }
  if (querSo('informacao')) {                               // ~60 s
    const inf = informacao.gerar();
    console.log(`  informação: ${inf.rodadas} rodadas · vantagem do apostador informado ` +
                `${(inf.vantagem.ev*100).toFixed(2)}% ± ${(inf.vantagem.ic95*100).toFixed(2)} · ` +
                `mudou a aposta em ${inf.vantagem.rodadasEmQueMudou} rodadas`);
  }
  if (querSo('margem')) {                                   // ~70 s
    const mg = margem.gerar();
    console.log(`  margem: ${mg.rodadas} rodadas x ${mg.sims} sims · buffável ${(mg.buffavel.margem*100).toFixed(2)}% · ` +
                `resto ${(mg.neutro.margem*100).toFixed(2)}% · diferença ${(mg.diferenca*100).toFixed(2)} pontos`);
  }
  if (querSo('estatistica')) {                              // ~50 s
    const b = estatistica.gerar();
    console.log(`  baseline: ${b.rodadas} rodadas · duração média ${b.duracaoMedia.toFixed(2)}s · ` +
                `melhor ${b.melhor.nome} ${(b.melhor.taxa*100).toFixed(2)}% · amplitude ${b.amplitude.toFixed(1)}x`);
  }
  if (querSo('visual')) {                                   // ~40 s
    if (visual.disponivel()) {
      const base = await visual.capturarBase();
      const amb = visual.ambienteAtual();
      const lerA = () => { try { return JSON.parse(readFileSync(
        new URL('./fixtures/visual-base-ambiente.json', import.meta.url), 'utf8')); } catch { return null; } };
      const ref = lerA();
      if (visual.baseQueVale(null, ref, {}).origem === 'referência') {
        writeFileSync(new URL('./fixtures/visual-base.json', import.meta.url), JSON.stringify(base));
        writeFileSync(new URL('./fixtures/visual-base-ambiente.json', import.meta.url), JSON.stringify(amb ?? {}));
        console.log('  linha de base visual (REFERÊNCIA, ' + visual.chaveAmbiente(amb) + ')');
      } else {
        writeFileSync(new URL('./fixtures/visual-base-local.json', import.meta.url), JSON.stringify(base));
        console.log('  linha de base visual LOCAL (' + visual.chaveAmbiente(amb) + ') — a REFERÊNCIA não foi tocada.');
      }
      console.log(`  linha de base visual: ${Object.keys(base).length} telas`);
    } else {
      console.log('  linha de base visual NÃO regravada — sem navegador');
    }
  }
  /* Nome que não casa com fixture nenhuma sai com zero regravado e VERDE, que é
     a forma mais silenciosa de não fazer nada. */
  const CONHECIDAS = ['golden','precisao','informacao','margem','estatistica','visual'];
  const orfas = (SO || []).filter(n => !CONHECIDAS.includes(n));
  if (orfas.length) {
    console.error(`\n--so não conhece: ${orfas.join(', ')}. Fixtures: ${CONHECIDAS.join(', ')}`);
    process.exit(2);
  }
  if (SO) avisoParcial(SO.join(', '));
  process.exit(0);
}

/* SEM_GOLDEN=1 roda tudo menos os golden tests. Serve ao portão Q2: um
   defeito que só o golden pega indica cobertura de propriedade fraca naquela
   área, porque golden byte-exato pega qualquer mudança de comportamento. */
const semGolden = process.env.SEM_GOLDEN === '1';
/* Q5 exige navegador. `npm test` pula com aviso; `npm run portoes` exige,
   porque portão que pula em silêncio é decorativo. */
const exigeVisual = process.env.EXIGE_VISUAL === '1';
/* EXIGE_LOCAL=1 obriga a cópia local dos assets a existir. `npm run portoes`
   exige; `npm test` avisa e segue. Portão que pula em silêncio é decorativo —
   mesmo argumento do Q5. */
const exigeLocal = process.env.EXIGE_LOCAL === '1';
const semVisual = process.env.SEM_VISUAL === '1';   // usado pela sabotagem
let rVisual = null, baseAtual = null, baseGravada = null, digitaisNav = null, rSemRede = null, rTemaCedo = null, rSemBackend, rRodadaCompleta;
/* Q3 do F0.5 pede a mesma rodada reproduzida em dois ambientes JS. Estas são as
   raízes comparadas — fixas, para que a falha seja reproduzível. */
const RAIZES_Q3 = [1, 42, 0xC0FFEE, 0xFFFFFFFF, 987654321];
/* AS SUÍTES QUE PRECISAM DE NAVEGADOR. Com `--so` fora desta lista, as cinco
   partidas de Chromium não acontecem — é o que faz `--so=carteira` custar 0,2 s
   em vez de 95 s. */
const COM_NAVEGADOR = ['visual','visual-base','ambientes','rodada-viva','tema-cedo','sem-rede','sem-backend','rodada-completa','contraste','outfit-canvas'];
/* A DECISAO MORA EM `bandeiras.mjs`, e nao aqui — D-059. Ela consultava o
   `--so` e esquecia o `--sem-navegador`, entao o `npm run rapido` subia os
   cinco Chromium e descartava o resultado deles trinta e sete linhas abaixo:
   3 min 30 s onde a documentacao prometia 7 s, sem sintoma nenhum na saida.
   Extraida, a regra virou tabela-verdade com teste; no lugar, ela continuaria
   sem forma de ser observada de fora que nao fosse o cronometro. */
const precisaNavegador = precisaDeNavegador(
  { so: SO, semNavegador, comNavegador: COM_NAVEGADOR });

if (visual.disponivel() && !semVisual && precisaNavegador) {
  const temLocal = visual.temAssetsLocais();
  if (!temLocal && exigeLocal) {
    console.error('\nassets locais ausentes: rode npm run assets (ver tools/README.md)'); process.exit(2);
  }
  /* AS CINCO EXECUÇÕES DE NAVEGADOR SÃO INDEPENDENTES, E ROLAVAM EM FILA.
   *
   * Cada uma sobe o seu próprio servidor em porta efêmera e o seu próprio
   * Chromium; nenhuma lê o resultado da outra. Medido antes desta mudança:
   * suíte 122 s com navegador, 55 s sem — os 67 s de diferença eram quase
   * todos partida a frio, cinco vezes, uma depois da outra, numa máquina de
   * quatro núcleos.
   *
   * Nada é pulado nem afrouxado: as mesmas cinco execuções, com os mesmos
   * dados, na mesma máquina. Só deixam de esperar umas pelas outras.
   *
   * `Promise.all` e não `allSettled` de propósito: falha de navegador tem que
   * derrubar a execução, e não virar um `null` que a suíte lê como "pulado". */
  /* ── AS SONDAS DE NAVEGADOR RODAM EM FILA, E NÃO TODAS DE UMA VEZ ────────
   *
   * Eram sete `Promise.all`, e cada uma sobe um Chromium próprio. O F1.14
   * acrescentou duas — `sem-backend` e `rodada-completa` — e o custo passou de
   * caro para insustentável: o portão roda esta passada DENTRO de uma caixa de
   * areia, com até quatro mutantes em paralelo, e o limite deixou de ser CPU e
   * passou a ser MEMÓRIA.
   *
   * O sintoma era enganoso. A sonda `sem-rede` voltava "esperei 30,0 s" com um
   * teto de 240 s — número impossível para um estouro de tempo. Trinta segundos
   * não é o teto: é o renderer sendo morto. `waitForFunction` REJEITA quando o
   * alvo cai, e a rejeição virava `pronto = false` como se fosse demora.
   *
   * Em fila, o pico de memória é de um navegador em vez de sete. A execução
   * fica um pouco mais longa e passa a terminar — e portão que não termina não
   * julga nada. É o D-023. */
  const emFila = async lista => {
    const fora = [];
    for (const fn of lista) fora.push(await fn());
    return fora;
  };
  [rVisual, baseAtual, digitaisNav, rTemaCedo, rSemRede, rSemBackend, rRodadaCompleta] = await emFila([
    () => visual.rodar(),
    () => visual.capturarBase(),
    () => visual.digitaisNoNavegador(RAIZES_Q3),
    () => visual.rodarTemaSemModulos(),
    () => (temLocal ? visual.rodarSemRede() : Promise.resolve(null)),
    () => visual.rodarSemBackend(),
    () => visual.rodarRodadaCompleta(),
  ]);
  const ler = u => { try { return JSON.parse(readFileSync(u, 'utf8')); } catch { return null; } };
  const ambienteRef = ler(new URL('./fixtures/visual-base-ambiente.json', import.meta.url));

  /* A BASE LOCAL, FORA DO VERSIONAMENTO.
     A digital de pixels responde "mudou nesta maquina", e e so isso. No
     ambiente que gravou a versionada ela continua valendo; em qualquer outro,
     vale a local — e a primeira execucao CRIA e nao compara nada, dizendo isso
     em voz alta. Mesmo desenho do cache de vereditos do Q2. */
  const ARQ_LOCAL = new URL('./fixtures/visual-base-local.json', import.meta.url);
  let baseLocal = ler(ARQ_LOCAL);
  const escolha = visual.baseQueVale(ler(new URL('./fixtures/visual-base.json', import.meta.url)),
                                     ambienteRef, baseLocal);
  if (escolha.origem === 'local' && !baseLocal) {
    /* D-096 · UMA PASSADA REDUZIDA NÃO ESCREVE A REFERÊNCIA.
       A base local nasce da primeira passada que não a encontra, e num clone
       novo essa passada é a do próprio Q2 — estreita, uma largura só. O arquivo
       nasceria com 4 entradas onde o teste de cobertura cobra 16, e o portão
       passaria a abortar para sempre culpando a configuração. Ver visual.mjs. */
    if (!visual.passadaCompleta()) {
      console.error('\nlinha de base visual LOCAL ausente, e esta passada é ESTREITA ' +
                    '(SABOTAGEM_ESTREITA=1).\n' +
                    '  Uma largura não pode escrever a referência das quatro — ela nasceria\n' +
                    '  com 4 entradas onde a cobertura cobra 16, e o portão abortaria para\n' +
                    '  sempre culpando a configuração com navegador (D-096).\n\n' +
                    '  Rode `npm run gerar:visual` uma vez nesta máquina e repita o portão.');
      process.exit(2);
    }
    writeFileSync(ARQ_LOCAL, JSON.stringify(baseAtual));
    baseLocal = baseAtual;
    console.log('  · linha de base visual LOCAL criada (' +
                visual.chaveAmbiente(visual.ambienteAtual()) + ') — esta execução não comparou nada.');
    console.log('    A versionada é de outro ambiente e digital de pixel não viaja.\n');
  }
  if (escolha.origem === 'local')
    console.log('  · Q5 comparando contra a base LOCAL desta máquina, não a do projeto.\n');
  baseGravada = escolha.origem === 'local' ? baseLocal : escolha.base;
  if (!temLocal) console.log('  · teste de egresso fechado pulado (sem assets locais) — use npm run assets\n');

  /* RESULTADO AUSENTE NÃO PODE VIRAR SUÍTE AUSENTE.
     Antes, cada `await` alimentava uma variável e a lista de suítes montava o
     que existisse. Em paralelo, um erro engolido daria `undefined` e a suíte
     correspondente simplesmente não apareceria no relatório — portão que some
     em silêncio é a definição de portão decorativo. */
  const faltando = [['visual', rVisual], ['linha de base', baseAtual],
                    ['ambientes', digitaisNav], ['tema-cedo', rTemaCedo]]
    .filter(([, v]) => !v).map(([n]) => n);
  if (faltando.length) {
    console.error(`\nQ5 incompleto: sem resultado de ${faltando.join(', ')}.`); process.exit(2);
  }
}
else if (!precisaNavegador) console.log('  · navegador não iniciado — o recorte não pediu suíte que precise dele\n');
else if (exigeVisual && !semVisual) { console.error('\nQ5 indisponível: instale playwright-core (ver tools/README.md)'); process.exit(2); }
else console.log('  · Q5 visual pulado (sem navegador) — use npm run portoes para exigir\n');

/* PARAR_CEDO=1 encerra na primeira suíte que falhar.
 *
 * Serve à sabotagem, e só a ela: lá a pergunta é binária — "a suíte fica
 * vermelha?" — e rodar as outras dez depois da primeira falha é trabalho
 * jogado fora, 56 vezes. Numa execução normal a lista inteira de falhas é o
 * que interessa, então o modo fica desligado por padrão.
 *
 * A ORDEM ABAIXO É POR CUSTO, do mais barato para o mais caro. Medido:
 * golden 0,07 s, conteudo 0,14 s, carteira 0,16 s, exposicao 0,26 s,
 * semente 0,6 s, estatistica 0,8 s, precisao 1,9 s, invariantes 4,1 s,
 * informacao 12,9 s, margem 13,2 s. Com parada antecipada, um defeito que a
 * carteira pega custa 0,3 s em vez de 40 s. Isso não enfraquece nada: as
 * mesmas suítes rodam, na mesma máquina, com os mesmos dados. */
const pararCedo = process.env.PARAR_CEDO === '1';

/* O recorte da SUÍTE. Cada suíte já sabe o próprio nome (`criarSuite`), então o
   filtro é uma linha — e ele vem DEPOIS da montagem, para que um nome errado
   não passe como execução vazia e verde. */
const todas = [
  ...(semGolden ? [] : [golden.suite()]),
  /* baratas: varredura de texto e lotes pequenos */
  fonteUnica.suite(), estado.suite(), modulos.suite(), bandeiras.suite(), viewport.suite(), idleQuem.suite(), idleEscolha.suite(), repertorioSuite.suite(), avancoBossSuite.suite(), avancoEfeitoSuite.suite(), folhaVivaSuite.suite(), climaIdleSuite.suite(), icones.suite(), decoracao.suite(), itensIcone.suite(), economiaIdle.suite(), vagasSuite.suite(), nivelCriatura.suite(), estagiosSuite.suite(), elencoEstagioSuite.suite(), waveSuite.suite(), roteiroWaveSuite.suite(), runAvancoSuite.suite(), avancoTelaSuite.suite(), avancoEstadoSuite.suite(), avancoPagaSuite.suite(), avancoForcaSuite.suite(), rotaOffSuite.suite(), vitrineSuite.suite(), estilhacoSuite.suite(), avancoSuite.suite(), ausenteSuite.suite(), npcSuite.suite(), itensCatalogo.suite(), ligacaoSuite.suite(), origemSuite.suite(), itensNomeSuite.suite(), raridadeSuite.suite(), capturaTelaSuite.suite(), idleConfirmaSuite.suite(), lojaSuite.suite(), composicaoSuite.suite(), focoSuite.suite(), idleHudSuite.suite(), pokedexSuite.suite(), evoIdleSuite.suite(), conteudo.suite(), emissao.suite(),
  carteira.suite(), banco.suite(), exposicao.suite(), assets.suite(), telemetria.suite(), commit.suite(), saida.suite(), progressao.suite(), tema.suite(), arenas.suite(), portao.suite(), colocacao.suite(), banner.suite(), logBatalha.suite(), painelRodada.suite(), resultadoCentro.suite(), arenaLegivel.suite(), marca.suite(), vencedorAnimado.suite(), ortografia.suite(), arteArena.suite(), filtroCor.suite(), xpRodada.suite(), cedula.suite(), ordemBolas.suite(), shinyArena.suite(), marcaArte.suite(), miniLog.suite(), distribuicao.suite(), grafico.suite(), acervo.suite(), calibracao.suite(), ligaServidor.suite(), ligaLocal.suite(), artes.suite(), servir.suite(), shiny.suite(), adm.suite(),
  /* médias: lotes de simulação curtos */
  await servidor.suite(), bancoServidor.suite(), auth.suite(), carteiraServidor.suite(), scheduler.suite(), transporte.suite(), apostaServidor.suite(), concorrencia.suite(), limites.suite(), protecao.suite(), resultado.suite(), await rotas.suite(), await protecaoTela.suite(), await hash.suite(), laco.suite(), salaCliente.suite(), conexaoTexto.suite(), modoServidor.suite(), progressaoServidor.suite(), adminServidor.suite(), adminAuth.suite(), margemCasa.suite(), politica.suite(), await telemetriaLigada.suite(), packOriginal.suite(), await lacoServidor.suite(), await progressaoLigada.suite(), caixas.suite(), instancia.suite(), bioma.suite(), evolucao.suite(), criaturasServidor.suite(), expedicao.suite(), captura.suite(), drops.suite(), idleServidor.suite(), mundo.suite(), outfit.suite(), vida.suite(), particulas.suite(), relevo.suite(), faunaTeste.suite(), idleDados.suite(), idleTela.suite(), rotasIdle.suite(),
  /* A metade de canvas do outfit é MONTADA sob demanda: montá-la sobe um
     Chromium, e subi-lo no `npm run rapido` custaria os 7 s que essa execução
     inteira leva. Fora do recorte, ela nem é construída; sem navegador, ela se
     monta como um teste de aviso e não abre nada. */
  ...(!semNavegador && querSo('outfit-canvas') && !semVisual ? [await outfit.suiteCanvas()] : []),
  semente.suite(), estatistica.suite(), precisao.suite(), invariantes.suite(),
  /* `rVisual` e não `visual.disponivel()`: com `--so` fora das suítes de
     navegador o Chromium nem sobe, e a condição antiga montaria suítes com
     resultado nulo. */
  ...(rVisual && baseAtual && !semVisual
     ? [visual.suite(rVisual), visual.suiteBase(baseAtual, baseGravada),
        visual.suiteAmbientes(digitaisNav, RAIZES_Q3), visual.suiteRodadaViva(rVisual),
        visual.suiteTemaCedo(rTemaCedo),
        /* O contraste é medido no navegador e julgado por aritmética pura —
           por isso a suíte mora fora do visual.mjs e recebe as medidas. */
        contraste.suite(rVisual.contrastes),
        visual.suiteSemBackend(rSemBackend), visual.suiteRodadaCompleta(rRodadaCompleta),
        ...(rSemRede ? [visual.suiteSemRede(rSemRede)] : [])]
     : []),
  await paridade.suite(),
  /* caras: medições estatísticas grandes, por último de propósito */
  informacao.suite(), margem.suite(),
];

/* D-017 · `--sem-navegador` é DERIVADO, e por isso não dessincroniza: suíte
   nova que não precise de Chromium entra sozinha. */
const suites = SO ? todas.filter(x => querSo(x.nome))
  : semNavegador ? todas.filter(x => !COM_NAVEGADOR.includes(x.nome))
  : todas;
if (SO) {
  const orfas = SO.filter(n => !todas.some(x => x.nome === n));
  if (orfas.length) {
    console.error(`\n--so não conhece a suíte: ${orfas.join(', ')}.\n` +
                  `Disponíveis: ${todas.map(x => x.nome).join(', ')}`);
    process.exit(2);
  }
  avisoParcial(`${suites.length} de ${todas.length} suítes — ${SO.join(', ')}`);
}
let total = 0, falhas = [];
for (const s of suites) {
  const r = await s.rodar();
  total += r.total;
  falhas.push(...r.falhas.map(f => ({ ...f, suite: r.nome })));
  console.log(`  ${r.nome}: ${r.total - r.falhas.length}/${r.total}`);
  if (pararCedo && r.falhas.length) { console.log('  · parada antecipada (PARAR_CEDO=1)'); break; }
}
console.log('');
if (falhas.length) {
  console.log(`VERMELHO — ${falhas.length}/${total} falharam`);
  for (const f of falhas) console.log(`  [${f.suite}] ${f.titulo}\n      ${f.erro}`);
  process.exit(1);
}
console.log(`VERDE — ${total}/${total} passaram`);
console.log('\n§4.8 — critério de saída da v0.9, item a item:');
console.log(saida.relatorio());
console.log('  ⏳ = registrado e pendente; não se resolve escrevendo software.');

console.log('\nInvariantes da Spec §4.6 já verificadas:');
for (const n of invariantes.JA_VERIFICADAS) console.log('  ✓ ' + n);
if (invariantes.NAO_APLICAVEIS_AINDA.length) {
  console.log('\nInvariantes da Spec §4.6 ainda não verificáveis neste bloco:');
  for (const n of invariantes.NAO_APLICAVEIS_AINDA) console.log('  · ' + n);
} else {
  console.log('\nInvariantes da Spec §4.6: todas verificáveis desde o F1.7.');
}
