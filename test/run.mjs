/* Executor dos portões Q1, Q3 e Q4 do bloco F0.1.
 * Uso:  node test/run.mjs           roda a suíte
 *       node test/run.mjs --gerar   regrava as fixtures (só quando a mudança é intencional)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
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
import * as horaDoDia from './hora-do-dia.mjs';
import * as elencoCondicao from './elenco-condicao.mjs';
import * as climasLegenda from './climas-legenda.mjs';
import * as fichasSuite from './fichas.mjs';
import * as ciSuite from './ci.mjs';
import * as cosmeticosServidor from './cosmeticos-servidor.mjs';
import * as posseAtualSuite from './posse-atual.mjs';
import * as telemetriaProduto from './telemetria-produto.mjs';
import * as copiaBanco from './copia-banco.mjs';
import * as estaticoSuite from './estatico.mjs';
import * as contaRealSuite from './conta-real.mjs';
import * as pilotoSuite from './piloto.mjs';
import * as liquidacaoLigada from './liquidacao-ligada.mjs';
import * as esperaRodada from './espera-rodada.mjs';
import * as emissaoIdle from './emissao-idle.mjs';
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
import { precisaNavegador as precisaDeNavegador, sondasNecessarias,
         SONDA_DA_SUITE, suitesPrometidasENaoEntregues,
         sondasSemResultado, trabalhadoresDaSuite, ordemDeEntrega,
         agregacaoIncompleta, vereditoFinal } from './bandeiras.mjs';
import * as acervo from './acervo.mjs';
import * as calibracao from './calibracao.mjs';
import * as mutuo from './mutuo.mjs';
import * as mercadoAbates from './mercado-abates.mjs';
import * as mercadoServidor from './mercado-servidor.mjs';
import * as mercadoLiquidacao from './mercado-liquidacao.mjs';
import * as mercadoPreco from './mercado-preco.mjs';
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
/* `--trabalhador` — este processo é FILHO de uma execução em paralelo (T14).
   Ele monta as mesmas suítes, nunca sobe navegador (quem dirige o Chromium é o
   pai), e roda só o que o pai mandar, uma suíte por vez. Não é bandeira para
   uso à mão: sem o pai do outro lado do canal ele não tem o que fazer. */
const TRABALHADOR = process.argv.includes('--trabalhador');
const semNavegador = process.argv.includes('--sem-navegador') || TRABALHADOR;
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
  if (querSo('emissao-idle')) {                             // ~1 s
    const m = emissaoIdle.gerar();
    const ma = m.perfis.maratona.estagio1.porDia;
    console.log(`  emissão do idle: ${m.dias} dias · maratona (estágio 1) ${ma.essencia} de Essência ` +
                `e ${ma.pokecoin} de moeda por dia`);
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
  const CONHECIDAS = ['golden','precisao','informacao','margem','estatistica','visual','emissao-idle'];
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
let sondasPedidas = new Set(), temAssets = false, baseCriadaAgora = false;
let rLuta = null;
let rVisual = null, baseAtual = null, baseGravada = null, digitaisNav = null, rSemRede = null, rTemaCedo = null, rSemBackend, rRodadaCompleta;
/* Q3 do F0.5 pede a mesma rodada reproduzida em dois ambientes JS. Estas são as
   raízes comparadas — fixas, para que a falha seja reproduzível. */
const RAIZES_Q3 = [1, 42, 0xC0FFEE, 0xFFFFFFFF, 987654321];
/* AS SUÍTES QUE PRECISAM DE NAVEGADOR. Com `--so` fora desta lista, as cinco
   partidas de Chromium não acontecem — é o que faz `--so=carteira` custar 0,2 s
   em vez de 95 s. */
const COM_NAVEGADOR = ['visual','visual-luta','visual-base','ambientes','rodada-viva','tema-cedo','sem-rede','sem-backend','rodada-completa','contraste','outfit-canvas'];
/* A DECISAO MORA EM `bandeiras.mjs`, e nao aqui — D-059. Ela consultava o
   `--so` e esquecia o `--sem-navegador`, entao o `npm run rapido` subia os
   cinco Chromium e descartava o resultado deles trinta e sete linhas abaixo:
   3 min 30 s onde a documentacao prometia 7 s, sem sintoma nenhum na saida.
   Extraida, a regra virou tabela-verdade com teste; no lugar, ela continuaria
   sem forma de ser observada de fora que nao fosse o cronometro. */
const precisaNavegador = precisaDeNavegador(
  { so: SO, semNavegador, comNavegador: COM_NAVEGADOR });

/* ── A SUÍTE EM PARALELO (T14, 25/09/2026) ────────────────────────────────
 *
 * MEDIDO antes: 190 s sem navegador, num núcleo, com três olhando; ~7 min com
 * navegador, porque as sondas do Chromium e as suítes de CPU esperavam umas
 * pelas outras sem nenhuma razão — as de CPU não leem nada das sondas.
 *
 * Os trabalhadores sobem AQUI, antes das sondas, e rodam as suítes de CPU
 * enquanto o processo principal dirige o Chromium. A fila é dinâmica: cada um
 * pede a próxima quando termina, as caras primeiro (`ordemDeEntrega`).
 *
 * NADA É PULADO NEM AFROUXADO: as mesmas suítes, com os mesmos dados. O que
 * muda é que elas deixam de esperar umas pelas outras. E quando não pode ser
 * assim — sabotagem, recorte, `TESTE_SERIAL=1` —, `trabalhadoresDaSuite`
 * devolve zero e a execução é a fila de sempre. */
const N_TRAB = TRABALHADOR ? 0 : trabalhadoresDaSuite({
  nucleos: cpus().length, pararCedo: process.env.PARAR_CEDO === '1',
  emSandbox: process.env.EM_SANDBOX === '1', so: SO,
  serial: process.env.TESTE_SERIAL === '1', pedido: Number(process.env.TESTE_TRAB) });
const paralelo = N_TRAB ? iniciarTrabalhadores(N_TRAB) : null;
if (paralelo) console.log(`  · ${N_TRAB} trabalhadores rodando as suítes de CPU em paralelo ` +
                          `(TESTE_SERIAL=1 para a fila de antes)\n`);

function iniciarTrabalhadores(n) {
  const recebidos = [], erros = [];
  let fila = null, catalogo = null, vivos = n, divergiu = null, resolver;
  const fim = new Promise(r => { resolver = r; });
  const proxima = f => {
    const nome = fila.shift();
    if (nome) f.send({ rodar: nome }); else f.send({ sair: true });
  };
  for (let i = 0; i < n; i++) {
    /* stdout do filho é descartado: ele só teria os pontinhos do arnês. O
       resultado de cada suíte volta pelo canal, inteiro. O stderr passa, para
       que um filho que morre diga por quê. */
    const f = fork(fileURLToPath(import.meta.url), ['--trabalhador'],
      { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
    f.on('message', m => {
      if (m.pronto) {
        if (!fila) { catalogo = m.nomes; fila = ordemDeEntrega(m.nomes); }
        else if (m.nomes.join() !== catalogo.join()) divergiu = m.nomes;
        proxima(f);
      } else if (m.resultado) { recebidos.push(m.resultado); proxima(f); }
    });
    f.on('exit', codigo => {
      if (codigo) erros.push(`trabalhador ${i + 1} saiu com código ${codigo}`);
      if (--vivos === 0) resolver({ recebidos, erros, catalogo: catalogo ?? [], divergiu });
    });
  }
  return { fim };
}

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
  /* ── E EM DUAS FILAS QUANDO A SUÍTE JÁ ESTÁ EM PARALELO (T14) ──────────
   *
   * O D-023 continua valendo onde ele nasceu: DENTRO da caixa do Q2, com
   * outros mutantes na máquina. Lá `N_TRAB` é zero e a fila é uma só.
   *
   * Fora dela — o `npm test` de quem está construindo —, a memória sobra
   * (15 GB medidos) e as sondas passavam 176 s esperando umas pelas outras.
   * Duas filas, puxando a mais cara primeiro, é o pico de DOIS navegadores em
   * vez de sete: o meio-termo entre o D-023 e o relógio. Medido em 25/09:
   *
   *     base 62 · semBackend 31 · rodar 29 · luta 25 · rodadaCompleta 16 ·
   *     semRede 10 · temaCedo 0,7 · digitais 0,4       (segundos, uma fila)
   *
   * O resultado volta na MESMA posição de antes: quem consome não sabe que
   * as sondas rodaram fora de ordem. */
  const emDuasFilas = async (lista, custo) => {
    const fora = new Array(lista.length);
    const ordem = lista.map((_, i) => i).sort((a, b) => custo[b] - custo[a]);
    const puxar = async () => { for (let i; (i = ordem.shift()) !== undefined;) fora[i] = await lista[i](); };
    await Promise.all([puxar(), puxar()]);
    return fora;
  };
  const CUSTO_SONDA = [29, 25, 62, 0.4, 0.7, 10, 31, 16];   /* na ordem da lista abaixo */
  /* ── E SÓ AS SONDAS QUE ESTA EXECUÇÃO VAI LER (D-098, bloco T9) ─────────
   *
   * A fila acima resolveu a MEMÓRIA. Faltava a outra metade: quantas sondas
   * entram nela. Era sempre sete, porque a decisão que as governa era um
   * booleano — "precisa de navegador?" — e o "sim" virava "sobe todas".
   *
   *     --so=visual    ->  7 sondas subiam, 1 era lida
   *     medido          226 s com 4 larguras · 152 s com 1
   *                     cortar 3 larguras poupa 33%; as 6 sondas mortas são o resto
   *
   * O portão paga isso por mutante de navegador, e são 294 dos 981.
   *
   * `sondasNecessarias` devolve o CONJUNTO, derivado das suítes pedidas. Sonda
   * que ninguém vai ler não sobe, e o que ela devolveria fica `null` — o que é
   * seguro porque a montagem das suítes lá embaixo passou a exigir a sonda de
   * CADA UMA, em vez de exigir todas para montar qualquer uma. */
  const sondas = sondasNecessarias({ so: SO, semNavegador, comNavegador: COM_NAVEGADOR });
  sondasPedidas = sondas; temAssets = temLocal;
  const se = (nome, fn) => () => (sondas.has(nome) ? fn() : Promise.resolve(null));
  const filas = paralelo ? l => emDuasFilas(l, CUSTO_SONDA) : emFila;
  [rVisual, rLuta, baseAtual, digitaisNav, rTemaCedo, rSemRede, rSemBackend, rRodadaCompleta] = await filas([
    se('rodar',          () => visual.rodar()),
    se('luta',           () => visual.rodarLuta()),
    se('base',           () => visual.capturarBase()),
    se('digitais',       () => visual.digitaisNoNavegador(RAIZES_Q3)),
    se('temaCedo',       () => visual.rodarTemaSemModulos()),
    se('semRede',        () => (temLocal ? visual.rodarSemRede() : Promise.resolve(null))),
    se('semBackend',     () => visual.rodarSemBackend()),
    se('rodadaCompleta', () => visual.rodarRodadaCompleta()),
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
    baseCriadaAgora = true;
    /* D-093 · O CARIMBO: quando e sobre que commit a base local nasceu. Base
       local envelhece calada — o carimbo é o que deixa a idade dela à vista. */
    try {
      const { execFileSync } = await import('node:child_process');
      const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
      writeFileSync(new URL('./fixtures/visual-base-local.meta.json', import.meta.url),
        JSON.stringify({ criadaEm: new Date().toISOString(), commit }) + '\n');
    } catch { /* sem git (caixa de areia): sem carimbo, e a base continua */ }
    console.log('  · linha de base visual LOCAL criada (' +
                visual.chaveAmbiente(visual.ambienteAtual()) + ') — esta execução não comparou nada.');
    console.log('    A versionada é de outro ambiente e digital de pixel não viaja.\n');
  }
  if (escolha.origem === 'local') {
    const meta = ler(new URL('./fixtures/visual-base-local.meta.json', import.meta.url));
    console.log('  · Q5 comparando contra a base LOCAL desta máquina, não a do projeto' +
      (meta ? ` — criada em ${meta.criadaEm.slice(0, 10)}, commit ${meta.commit}.` : ' — sem carimbo (anterior ao D-093).') + '\n');
  }
  baseGravada = escolha.origem === 'local' ? baseLocal : escolha.base;
  if (!temLocal) console.log('  · teste de egresso fechado pulado (sem assets locais) — use npm run assets\n');

  /* RESULTADO AUSENTE NÃO PODE VIRAR SUÍTE AUSENTE.
     Antes, cada `await` alimentava uma variável e a lista de suítes montava o
     que existisse. Em paralelo, um erro engolido daria `undefined` e a suíte
     correspondente simplesmente não apareceria no relatório — portão que some
     em silêncio é a definição de portão decorativo.

     D-098: a cobrança passa a ser sobre a sonda que FOI PEDIDA. Antes ela
     exigia as quatro sempre, o que era certo quando as sete subiam sempre — e
     viraria um aborto falso agora que `--so=visual` sobe uma. O que não muda é
     a regra: sonda que SUBIU e não devolveu resultado aborta. */
  /* D-103: idem — a lista virava literal solto e ninguém a observava. */
  const faltando = sondasSemResultado({ sondas, resultados: {
    rodar: rVisual, luta: rLuta, base: baseAtual,
    digitais: digitaisNav, temaCedo: rTemaCedo } });
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
  fonteUnica.suite(), estado.suite(), modulos.suite(), bandeiras.suite(), viewport.suite(), idleQuem.suite(), idleEscolha.suite(), horaDoDia.suite(), elencoCondicao.suite(), climasLegenda.suite(), fichasSuite.suite(), ciSuite.suite(), cosmeticosServidor.suite(), posseAtualSuite.suite(), telemetriaProduto.suite(), copiaBanco.suite(), pilotoSuite.suite(), esperaRodada.suite(), emissaoIdle.suite(), repertorioSuite.suite(), avancoBossSuite.suite(), avancoEfeitoSuite.suite(), folhaVivaSuite.suite(), climaIdleSuite.suite(), icones.suite(), decoracao.suite(), itensIcone.suite(), economiaIdle.suite(), vagasSuite.suite(), nivelCriatura.suite(), estagiosSuite.suite(), elencoEstagioSuite.suite(), waveSuite.suite(), roteiroWaveSuite.suite(), runAvancoSuite.suite(), avancoTelaSuite.suite(), avancoEstadoSuite.suite(), avancoPagaSuite.suite(), avancoForcaSuite.suite(), rotaOffSuite.suite(), vitrineSuite.suite(), estilhacoSuite.suite(), avancoSuite.suite(), ausenteSuite.suite(), npcSuite.suite(), itensCatalogo.suite(), ligacaoSuite.suite(), origemSuite.suite(), itensNomeSuite.suite(), raridadeSuite.suite(), capturaTelaSuite.suite(), idleConfirmaSuite.suite(), lojaSuite.suite(), composicaoSuite.suite(), focoSuite.suite(), idleHudSuite.suite(), pokedexSuite.suite(), evoIdleSuite.suite(), conteudo.suite(), emissao.suite(),
  carteira.suite(), banco.suite(), exposicao.suite(), assets.suite(), telemetria.suite(), commit.suite(), saida.suite(), progressao.suite(), tema.suite(), arenas.suite(), portao.suite(), colocacao.suite(), banner.suite(), logBatalha.suite(), painelRodada.suite(), resultadoCentro.suite(), arenaLegivel.suite(), marca.suite(), vencedorAnimado.suite(), ortografia.suite(), arteArena.suite(), filtroCor.suite(), xpRodada.suite(), cedula.suite(), ordemBolas.suite(), shinyArena.suite(), marcaArte.suite(), miniLog.suite(), distribuicao.suite(), grafico.suite(), acervo.suite(), calibracao.suite(), mutuo.suite(), mercadoAbates.suite(), ligaServidor.suite(), ligaLocal.suite(), artes.suite(), servir.suite(), shiny.suite(), adm.suite(),
  /* médias: lotes de simulação curtos */
  await servidor.suite(), await estaticoSuite.suite(), await contaRealSuite.suite(), await liquidacaoLigada.suite(), await mercadoServidor.suite(), await mercadoLiquidacao.suite(), await mercadoPreco.suite(), bancoServidor.suite(), auth.suite(), carteiraServidor.suite(), scheduler.suite(), transporte.suite(), apostaServidor.suite(), concorrencia.suite(), limites.suite(), protecao.suite(), resultado.suite(), await rotas.suite(), await protecaoTela.suite(), await hash.suite(), laco.suite(), salaCliente.suite(), conexaoTexto.suite(), modoServidor.suite(), progressaoServidor.suite(), adminServidor.suite(), adminAuth.suite(), margemCasa.suite(), politica.suite(), await telemetriaLigada.suite(), packOriginal.suite(), await lacoServidor.suite(), await progressaoLigada.suite(), caixas.suite(), instancia.suite(), bioma.suite(), evolucao.suite(), criaturasServidor.suite(), expedicao.suite(), captura.suite(), drops.suite(), idleServidor.suite(), mundo.suite(), outfit.suite(), vida.suite(), particulas.suite(), relevo.suite(), faunaTeste.suite(), idleDados.suite(), idleTela.suite(), rotasIdle.suite(),
  /* A metade de canvas do outfit é MONTADA sob demanda: montá-la sobe um
     Chromium, e subi-lo no `npm run rapido` custaria os 7 s que essa execução
     inteira leva. Fora do recorte, ela nem é construída; sem navegador, ela se
     monta como um teste de aviso e não abre nada. */
  ...(!semNavegador && querSo('outfit-canvas') && !semVisual ? [await outfit.suiteCanvas()] : []),
  semente.suite(), estatistica.suite(), precisao.suite(), invariantes.suite(),
  /* `rVisual` e não `visual.disponivel()`: com `--so` fora das suítes de
     navegador o Chromium nem sobe, e a condição antiga montaria suítes com
     resultado nulo. */
  /* CADA SUÍTE SOBRE A SONDA DELA (D-098). Era um `if` só, exigindo `rVisual`
     E `baseAtual` para montar QUALQUER UMA — o que obrigava as sete sondas a
     subir sempre. Agora cada uma pergunta pela sua, e o recorte chega até aqui.
     Quem garante que nenhuma some em silêncio é a conferência logo abaixo. */
  ...(!semVisual ? [
    ...(rLuta     ? [visual.suiteLuta(rLuta)] : []),
    ...(rVisual   ? [visual.suite(rVisual), visual.suiteRodadaViva(rVisual),
                     /* O contraste é medido no navegador e julgado por aritmética
                        pura — por isso a suíte mora fora do visual.mjs. */
                     contraste.suite(rVisual.contrastes)] : []),
    ...(baseAtual ? [visual.suiteBase(baseAtual, baseGravada, { criadaAgora: baseCriadaAgora })] : []),
    ...(digitaisNav     ? [visual.suiteAmbientes(digitaisNav, RAIZES_Q3)] : []),
    ...(rTemaCedo       ? [visual.suiteTemaCedo(rTemaCedo)] : []),
    ...(rSemBackend     ? [visual.suiteSemBackend(rSemBackend)] : []),
    ...(rRodadaCompleta ? [visual.suiteRodadaCompleta(rRodadaCompleta)] : []),
    ...(rSemRede        ? [visual.suiteSemRede(rSemRede)] : []),
  ] : []),
  await paridade.suite(),
  /* caras: medições estatísticas grandes, por último de propósito */
  informacao.suite(), margem.suite(),
];

/* ── SONDA QUE SUBIU TEM DE VIRAR SUÍTE (D-098, e a guarda é o S109) ───────
 *
 * Montar cada suíte sobre a sonda dela é o que barateia o portão — e é também
 * a forma mais fácil de uma suíte sumir sem ninguém notar. Basta a tabela
 * `SONDA_DA_SUITE` discordar do que o `run.mjs` monta, e a execução fica VERDE
 * tendo olhado menos do que prometeu.
 *
 * Execução vazia com a palavra VERDE é a falha mais silenciosa deste arnês, e
 * já tem nome: S109. Então a conferência é DERIVADA das mesmas duas fontes que
 * poderiam divergir, e ela ABORTA — não avisa e segue.
 *
 * A acusação nomeia a SONDA, e não a suíte. Errar isso seria repetir o D-097,
 * onde a mensagem mandou procurar defeito no cenário por meia hora. */
if (sondasPedidas.size) {
  /* Duas ausências são legítimas e por isso declaradas aqui, e não silenciosas:
       sem-rede       precisa dos assets locais; sem eles a sonda não roda e o
                      motivo já é anunciado acima
       outfit-canvas  não está na fila: ela tem gatilho próprio, algumas linhas
                      acima, porque subir Chromium para ela no `rapido` custaria
                      a execução inteira */
  /* D-103: a decisão mora em `bandeiras.mjs`, camada 0, porque aqui ela era
     indetectável — `run.mjs` é ponto de entrada e nenhum teste o importa. Os
     defeitos S996 e S998 desligavam estas duas guardas sem nada ficar vermelho. */
  const sumidas = suitesPrometidasENaoEntregues({
    sondas: sondasPedidas, montadas: todas.map(x => x.nome),
    temAssets, comNavegador: COM_NAVEGADOR });
  if (sumidas.length) {
    console.error(`\na sonda subiu e a suíte não foi montada: ${sumidas.join(', ')}.\n` +
      `  Não é nome errado no --so: a sonda de cada uma dessas foi pedida e\n` +
      `  executada, e o resultado não virou suíte. Verde aqui seria verde sem\n` +
      `  ter olhado — o S109. Confira SONDA_DA_SUITE contra a montagem em run.mjs.`);
    process.exit(2);
  }
}

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
/* O TRABALHADOR NÃO RODA A FILA: ele avisa o que montou e espera ordens. */
if (TRABALHADOR) {
  const porNome = new Map(suites.map(s => [s.nome, s]));
  process.on('message', async m => {
    if (m.sair) process.exit(0);
    const r = await porNome.get(m.rodar).rodar();
    process.send({ resultado: { nome: r.nome, total: r.total, falhas: r.falhas } });
  });
  process.send({ pronto: true, nomes: suites.map(s => s.nome) });
  await new Promise(() => {});           /* o canal mantém o processo; `sair` encerra */
}
/* Em paralelo, o principal roda só as suítes de navegador — as que leem as
   sondas que ele mesmo subiu. As outras já estão com os trabalhadores. */
const remotas = paralelo ? suites.filter(s => !COM_NAVEGADOR.includes(s.nome)) : [];
const locais = paralelo ? suites.filter(s => COM_NAVEGADOR.includes(s.nome)) : suites;
let total = 0, falhas = [];
for (const s of locais) {
  const r = await s.rodar();
  total += r.total;
  falhas.push(...r.falhas.map(f => ({ ...f, suite: r.nome })));
  console.log(`  ${r.nome}: ${r.total - r.falhas.length}/${r.total}`);
  if (pararCedo && r.falhas.length) { console.log('  · parada antecipada (PARAR_CEDO=1)'); break; }
}
if (paralelo) {
  const ag = await paralelo.fim;
  /* A CONFERÊNCIA QUE IMPEDE O VERDE SEM TER OLHADO (S109). O que o principal
     montou é a referência; o que voltou dos filhos tem de casar com ela, nos
     dois sentidos, sem repetição. Filho que morreu, catálogo que divergiu ou
     suíte que não voltou ABORTAM — não avisam e seguem. */
  const conf = agregacaoIncompleta({ esperadas: remotas.map(s => s.nome),
                                     recebidas: ag.recebidos.map(r => r.nome) });
  if (!conf.ok || ag.erros.length || ag.divergiu) {
    console.error('\nEXECUÇÃO EM PARALELO INCOMPLETA — o resultado não vale.');
    if (conf.faltando.length) console.error(`  sem resultado: ${conf.faltando.join(', ')}`);
    if (conf.intrusas.length) console.error(`  resultado de suíte não esperada: ${conf.intrusas.join(', ')}`);
    if (conf.repetidas.length) console.error(`  resultado repetido: ${conf.repetidas.join(', ')}`);
    if (ag.divergiu) console.error('  os trabalhadores montaram listas de suítes diferentes');
    for (const e of ag.erros) console.error(`  ${e}`);
    console.error('  Rode com TESTE_SERIAL=1 para ver a fila de antes.');
    process.exit(2);
  }
  const porNome = new Map(ag.recebidos.map(r => [r.nome, r]));
  for (const s of remotas) {
    const r = porNome.get(s.nome);
    total += r.total;
    falhas.push(...r.falhas.map(f => ({ ...f, suite: r.nome })));
    console.log(`  ${r.nome}: ${r.total - r.falhas.length}/${r.total}`);
  }
}
console.log('');
/* D-093: suíte que existe mas não comparou nada é dita, e não escondida. */
const naoExecutadas = locais.filter(s => s.naoExecutada);
const veredito = vereditoFinal({ falhas: falhas.length, naoExecutadas: naoExecutadas.map(s => s.nome), exigeVisual });
if (falhas.length) {
  console.log(`VERMELHO — ${falhas.length}/${total} falharam`);
  for (const f of falhas) console.log(`  [${f.suite}] ${f.titulo}\n      ${f.erro}`);
  process.exit(1);
}
for (const s of naoExecutadas) console.log(`⚠  NÃO EXECUTADA: ${s.nome} — ${s.naoExecutada}`);
if (veredito.saida) {
  console.log(`\n${veredito.palavra} — o portão não fecha com comparação não executada.`);
  process.exit(veredito.saida);
}
console.log(naoExecutadas.length
  ? `${veredito.palavra} — ${total}/${total} passaram, e ${naoExecutadas.length} comparação(ões) NÃO foram executadas`
  : `VERDE — ${total}/${total} passaram`);
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
