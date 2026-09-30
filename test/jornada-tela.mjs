/* Q1/Q3 · O MAPA DE KANTO NA TELA (ST-10.12 · F4.5 · Spec §8.7, §12 tela 22)
 *
 * O estado de cada nó é o do motor (vencido, o atual que pulsa, trancado); a
 * posição cabe na caixa e nenhum nó cai em cima de outro; o estojo mostra as
 * oito insígnias do caminho, ganhas as do save. A tela não decide o que abriu
 * e não grava progresso: a luta é a do `jornada-local`, encenada pelo mesmo
 * caminho da batalha do Team Builder.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { aberto, noAtual, progressoVazio } from '../engine/jornada.mjs';
import { montarLutador, simular } from '../engine/treino-batalha.mjs';
import { movesetDoRival, padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { treinador } from '../app/modules/treino-dados.mjs';
import { correcaoDaLicao, aplicarCorrecao } from '../app/modules/jornada-correcao.mjs';
import { mapaDaJornada, posicaoNoCaminho, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, arteDaInsignia, comparaVelocidade, imunesNoTime, tiposImunes, provaDaImunidade, ladoFraco, danoPorCategoria, resistenciaNoTime, tiposQueResistem, provaDaResistencia, ameacaDoRival, quandoCaiu, turnosDaAmeaca, golpesLevados, provaDoPreset, multiplicadoresNoRival, tiposQueBatemEmTodos, provaDoDuplo, leituraDoDuplo, rivaisDerrubados, setasDoCaminho, faixaDoCaminho, avisoDoRisco, leituraDoChefe, pagamentoDoNo, fraseDoPagamento, DUAS_VOLTAS_A_PARTIR_DE, ZIGUE_A_PARTIR_DE, INSIGNIAS_DO_CAMINHO, mostraNome, corDoNo, COR_DA_REGIAO, cruzaOCaminho } from '../app/modules/jornada-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/* Um pack de teste com dois ginásios no meio. */
const P = { ...pack, jornada: [{ id: 'a', nome: 'A', rival: 'rota1' }, { id: 'g', nome: 'G', rival: 'pedra', insignia: 'rocha' },
                               { id: 'c', rival: 'rival1' }, { id: 'h', nome: 'H', rival: 'pedra', insignia: 'cascata' }] };

export function suite() {
  const s = criarSuite('jornada-tela');

  s.teste('o estado de cada nó é o do motor, em todo ponto do caminho', () => {
    const passos = [progressoVazio(), { vencidos: ['a'], insignias: [] }, { vencidos: ['a', 'g'], insignias: ['rocha'] },
                    { vencidos: ['a', 'g', 'c'], insignias: ['rocha'] }, { vencidos: ['a', 'g', 'c', 'h'], insignias: ['rocha', 'cascata'] }];
    for (const prog of passos) {
      const m = mapaDaJornada(P, prog);
      igual(m.atual, noAtual(P, prog)?.id ?? null, 'o nó atual não é o do motor');
      for (const n of m.nos) {
        const esperado = prog.vencidos.includes(n.id) ? 'vencido' : aberto(P, prog, n.id) ? 'atual' : 'trancado';
        igual(n.estado, esperado, `${prog.vencidos.join('+') || 'vazio'}: o nó ${n.id}`);
      }
      igual(m.nos.filter(n => n.estado === 'atual').length, m.atual ? 1 : 0, 'mais de um nó pulsa');
      igual(m.feitos, prog.vencidos.length, 'os passos feitos');
      igual(m.total, 4, 'o total');
    }
    igual(mapaDaJornada(P, undefined).atual, 'a', 'save sem jornada não começa do começo');
  });

  s.teste('o tipo e o nome: ginásio é quem dá insígnia; sem nome, o id', () => {
    const m = mapaDaJornada(P, progressoVazio());
    igual(m.nos.map(n => n.tipo).join(), 'rota,ginasio,rota,ginasio', 'o tipo');
    igual(m.nos[2].nome, 'c', 'o nome de quem não tem nome');
    igual(m.nos[1].rival, 'pedra', 'o rival do nó');
  });

  s.teste('o estojo: oito insígnias do caminho, ganhas as do save e só elas', () => {
    const m = mapaDaJornada(P, { vencidos: ['a', 'g'], insignias: ['rocha'] });
    igual(m.insignias.length, INSIGNIAS_DO_CAMINHO, 'o estojo não tem as oito');
    igual(m.insignias.map(x => x.ganha ? 1 : 0).join(''), '10000000', 'as ganhas');
    igual(m.insignias[1].onde, 'H', 'o segundo ginásio não é o segundo do estojo');
    igual(m.insignias[1].nome, 'insígnia de H', 'o nome de quem não tem nome de insígnia');
    igual(mapaDaJornada(pack, progressoVazio()).insignias[0].nome, 'Insígnia Rocha', 'o nome da insígnia do pack');
    igual(m.insignias[2].id, null, 'lugar sem ginásio ganhou insígnia');
    /* Insígnia no save sem ginásio no pack não acende nada. */
    igual(mapaDaJornada(P, { vencidos: [], insignias: ['alheia'] }).insignias.filter(x => x.ganha).length, 0, 'insígnia estranha acendeu');
    igual(mapaDaJornada(pack, progressoVazio()).insignias.length, INSIGNIAS_DO_CAMINHO, 'o pack de Kanto');
  });

  s.teste('o caminho cabe na caixa e anda sempre para a frente', () => {
    for (let n = 1; n <= 24; n++) {
      const pos = Array.from({ length: n }, (_, i) => posicaoNoCaminho(i, n));
      for (const p of pos) ok(p.x >= 5 && p.x <= 95 && p.y >= 15 && p.y <= 85, `${n} nós: (${p.x}, ${p.y}) fora da caixa`);
      /* Até DUAS_VOLTAS a trilha anda sempre para a direita; a partir dela, a
         primeira volta vai para a direita e a segunda VOLTA, embaixo (L-203). */
      const h = n >= DUAS_VOLTAS_A_PARTIR_DE ? Math.ceil(n / 2) : n;
      for (let i = 1; i < n; i++) {
        if (i < h) ok(pos[i].x > pos[i - 1].x, `${n} nós: a primeira volta anda para trás no ${i}`);
        else if (i > h) ok(pos[i].x < pos[i - 1].x, `${n} nós: a segunda volta não volta no ${i}`);
        else ok(pos[i].y > pos[i - 1].y + 25 && Math.abs(pos[i].x - pos[i - 1].x) < 1, `${n} nós: a curva entre as voltas não desce`);
      }
      /* E o que conta para os nomes: dois nós na mesma faixa de altura (menos
         de 14 de diferença) nunca a menos de 9 um do outro em x. */
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++)
        if (Math.abs(pos[a].y - pos[b].y) < 14) ok(Math.abs(pos[a].x - pos[b].x) >= 9, `${n} nós: ${a} e ${b} se cobrem (${JSON.stringify(pos[a])} ${JSON.stringify(pos[b])})`);
    }
    igual(mapaDaJornada(pack, progressoVazio()).voltas, 2, 'a jornada inteira não está em duas voltas');
    igual(mapaDaJornada(P, progressoVazio()).voltas, 1, 'quatro nós em duas voltas');
    /* Com muitos nós, vizinhos em alturas diferentes o bastante para os
       nomes não se cobrirem (ST-10.16). */
    for (let n = ZIGUE_A_PARTIR_DE; n < DUAS_VOLTAS_A_PARTIR_DE; n++) for (let i = 1; i < n; i++)
      ok(Math.abs(posicaoNoCaminho(i, n).y - posicaoNoCaminho(i - 1, n).y) >= 14, `${n} nós: os vizinhos ${i - 1} e ${i} estão na mesma altura`);
    const q = posicaoNoCaminho(0, 4), u = posicaoNoCaminho(3, 4);
    ok(q.x < 10 && u.x > 90, 'o caminho não atravessa a caixa');
    const m = mapaDaJornada(pack, progressoVazio());
    igual(JSON.stringify(m.nos.map(({ x, y }) => ({ x, y }))), JSON.stringify(m.nos.map((_, i) => posicaoNoCaminho(i, m.nos.length))), 'a posição não é a do caminho');
  });

  s.teste('a frase do nó: o que fazer com ele', () => {
    ok(/Trancado/.test(fraseDoNo({ estado: 'trancado', tipo: 'rota' })), 'trancado');
    ok(/insígnia já é sua/.test(fraseDoNo({ estado: 'vencido', tipo: 'ginasio' })), 'ginásio vencido');
    ok(/treinar/.test(fraseDoNo({ estado: 'vencido', tipo: 'rota' })), 'rota vencida');
    igual(fraseDoNo({ estado: 'atual', tipo: 'ginasio' }, 'Brock'), 'Vença Brock para ganhar a insígnia.', 'ginásio atual');
    igual(fraseDoNo({ estado: 'atual', tipo: 'rota' }, 'Caçador da Rota 1'), 'Vença Caçador da Rota 1 para abrir o caminho.', 'rota atual');
    igual(fraseDoNo({ estado: 'atual', tipo: 'rota' }, 'O Rival'), 'Vença o Rival para abrir o caminho.', 'o artigo no meio da frase');
  });

  s.teste('a faixa da chance: o risco tem cor antes do clique', () => {
    igual([0, 0.07, 0.299, 0.3, 0.69, 0.7, 0.99, 1].map(faixaDaChance).join(), 'baixa,baixa,baixa,media,media,alta,alta,alta', 'as faixas');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/n\.dataset\.faixa = pronto \? faixaDaChance\(r\.p\) : ''/.test(tela), 'o número não ganha a faixa');
    ok(/aviso\.hidden = !\(pronto && no\.estado !== 'trancado' && faixaDaChance\(r\.p\) === 'baixa'\)/.test(tela), 'o aviso de risco');
  });

  s.teste('a trilha andada e onde você está: até o nó atual, e na trilha, a caminho dele', () => {
    const vazio = mapaDaJornada(P, progressoVazio()), meio = mapaDaJornada(P, { vencidos: ['a', 'g'], insignias: [] }),
          fim = mapaDaJornada(P, { vencidos: ['a', 'g', 'c', 'h'], insignias: [] });
    igual(caminhoAndado(vazio).andado.map(n => n.id).join(), 'a', 'no começo, só o primeiro');
    igual(caminhoAndado(vazio).resto.map(n => n.id).join(), 'a,g,c,h', 'o resto parte do atual');
    igual(caminhoAndado(meio).andado.map(n => n.id).join(), 'a,g,c', 'no meio');
    igual(caminhoAndado(meio).resto.map(n => n.id).join(), 'c,h', 'o resto no meio');
    igual(caminhoAndado(fim).andado.length, 4, 'no fim, tudo andado');
    igual(caminhoAndado(fim).resto.length, 0, 'no fim, nada por andar');
    const [g, c] = [meio.nos[1], meio.nos[2]], v = ondeEstou(meio);
    ok(Math.abs(v.x - (g.x + (c.x - g.x) * 0.6)) < 0.11 && Math.abs(v.y - (g.y + (c.y - g.y) * 0.6)) < 0.11, 'você não está na trilha, a caminho do atual');
    ok(ondeEstou(vazio).x < vazio.nos[0].x && ondeEstou(vazio).x >= 3, 'antes do primeiro');
    igual(JSON.stringify(ondeEstou(fim)), JSON.stringify({ x: fim.nos[3].x, y: fim.nos[3].y, fim: true, ao: { x: fim.nos[3].x, y: fim.nos[3].y } }), 'no fim, no último — a tela põe ao lado');
    igual(JSON.stringify(ondeEstou(meio).ao), JSON.stringify({ x: c.x, y: c.y }), 'o nó de referência é o atual (o caminho em pé usa ele)');
    ok(/\.jnPos\.jnVoce\{left:calc\(var\(--ay\) \* 1%\)/.test(fonte('../app/index.html')), 'o caminho em pé põe você na trilha, em cima dos nomes');
    ok(/\.jnPos\.jnVoce\{left:calc\(var\(--ax\) \* 1%\);top:calc\(var\(--ay\) \* 1%\)\}/.test(fonte('../app/index.html')), 'no caminho deitado você volta para a trilha, em cima dos nomes do zigue-zague');
    ok(!ondeEstou(meio).fim && !ondeEstou(vazio).fim, 'fim antes do fim');
    igual(ondeEstou({ nos: [] }), null, 'sem nós');
  });

  s.teste('a tela: pinta o mapa, luta pela gravação e encena pelo caminho da 10.9', () => {
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/mapaDaJornada\(PACK, estado\.jornada, \{ emPe: pintadoEmPe \}\)/.test(tela), 'o mapa não é o da camada 0');
    ok(/lutarNaJornadaLocal\(\{ pack: PACK, id, preset: presetDoJogador\(\) \}\)/.test(tela), 'a luta não é a gravada');
    ok(!/simular\(|lutarNo\(|\.vencidos\.push|insignias\.push|salvar\(/.test(tela), 'a tela decide ou grava progresso por conta própria');
    ok(/encenar\(\{ alvo: \$\('#jnLuta'\), A: r\.timeA, B: r\.timeB, r: r\.resultado/.test(tela), 'a luta não é encenada pelo caminho da 10.9');
    /* ST-13.7: a raiz mora na conta da luta, que o servidor também lê. */
    ok(/lote\(PACK, A, rival, RAIZ, acum\.sims/.test(tela) && /RAIZ_DA_CHANCE as RAIZ \} from '\.\/jornada-conta\.mjs'/.test(tela)
       && /export const RAIZ_DA_CHANCE = 1;/.test(fonte('../app/modules/jornada-conta.mjs')), 'a chance do mapa não é a do Team Builder');
    ok(/disabled>\$\{no\.estado === 'trancado' \? 'trancado' : vencido \? 'revanche \(treino\)' : `lutar contra \$\{t\.nome\.replace/.test(tela) && /if \(pronto\) \{ chanceNaTela = r; if \(b && no\.estado !== 'trancado'\) b\.disabled = false; projetar\(r\);/.test(tela),
      'lutar acende antes da chance ou num nó trancado');
    ok(/if \(!lutar \|\| lutar\.disabled \|\| !chanceNaTela\) return;/.test(tela), 'a luta sai sem a chance');
    const pve = semComentario(fonte('../app/modules/pve-tela.mjs'));
    ok(/encenar\(\{ alvo: \$\('#pveArea'\), A, B, r, antes/.test(pve), 'o Team Builder tem uma segunda encenação');
    const html = fonte('../app/index.html');
    ok(/import '\.\/modules\/jornada-tela\.mjs';/.test(html), 'o módulo não é carregado');
    ok(/data-treino-aba="jornada"/.test(html) && /<div id="jornadaCorpo" hidden>/.test(html) && /id="jnLuta" class="pveArea"/.test(html), 'a aba da jornada não está na tela');
    ok(!/data-view="viewTreino"/.test(semComentario(fonte('../app/modules/treino-tela.mjs'))), 'duas telas disputam o clique do Time');
  });

  s.teste('o mundo em volta: o treinador do nó, a parede de árvores, a cena longe do caminho e do nome', () => {
    const m = mapaDaJornada(pack, progressoVazio());
    igual(m.nos.map(n => n.ow).join(), 'youngster,lass,camper,hiker,expert_m,swimmer_f,sailor,picnicker,black_belt,beauty,psychic_m,gentleman,,may_walking,swimmer_m,psychic_m,brendan_walking,camper', 'a folha de cada treinador');
    /* ST-10.22b: a cidade do ginásio é casas mais o que a cerca — a cena vira lista. */
    igual(m.nos.map(n => [n.cena ?? '-'].flat().join('+')).join(), 'flores,arvores,flores,rochas,rochas+casas,agua+casas,agua+casas,flores+casas+arvores,brejo+casas+junco,casas+casas,casas+lava,arvores+casas,torres,braseiros,braseiros,braseiros,braseiros,braseiros+casas', 'a cena de cada nó');
    const b = bordaDoMapa();
    ok(b.length >= 40 && b.every(p => p.x >= 0 && p.x <= 100 && (p.y <= 6 || p.y >= 94)), 'a parede não é borda');
    igual(JSON.stringify(b), JSON.stringify(bordaDoMapa()), 'a parede dança a cada repintura');
    igual(cenaDoNo({ cena: null }).length, 0, 'nó sem cena ganhou enfeite');
    /* As diagonais de CIMA: longe do nome (embaixo), do caminho deitado (dos
       lados) e do em pé (em cima e embaixo), e fora do treinador (±16 px). */
    ok(cenaDoNo({ cena: 'agua' }).every(c => c.forma === 'lago' && !c.folha), 'o lago virou folha que não existe');
    for (const c of [...cenaDoNo({ cena: 'arvores' }), ...cenaDoNo({ cena: 'rochas' }), ...cenaDoNo({ cena: 'agua' }), ...m.nos.flatMap(n => cenaDoNo(n))]) {
      ok(c.dy <= -24, `a cena (${c.dx}, ${c.dy}) desce até o nome`);
      ok(Math.abs(c.dx) >= 36, `a cena (${c.dx}, ${c.dy}) cai no caminho em pé ou no treinador`);
      ok(Math.abs(c.dy) >= 24, `a cena (${c.dx}, ${c.dy}) cai no caminho deitado`);
    }
  });

  s.teste('o fim da luta de jornada volta ao MAPA e não oferece um "lutar de novo" que não faz nada', () => {
    const pve = semComentario(fonte('../app/modules/pve-tela.mjs'));
    ok(/\$\{deNovo \? '<button class="btn gold" data-pve-de-novo>lutar de novo<\/button>' : ''\}/.test(pve), 'o botão aparece sem ação');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/voltar: 'voltar ao mapa'/.test(tela) && !/deNovo:/.test(tela), 'a jornada volta ao time ou repete o nó velho');
    ok(/classList\.add\('emLuta'\)/.test(tela) && /#jnLuta \[data-pve-fechar\]'\)\) \$\('#jornadaCorpo'\)\?\.classList\.remove\('emLuta'\);\n\}, true\);/.test(tela)
      && /#jornadaCorpo\.emLuta #jnPainel\{display:none\}/.test(fonte('../app/index.html')), 'o resultado e o painel do próximo nó aparecem juntos');
  });

  s.teste('a insígnia tem forma (L-202): silhueta até ser ganha, e entra quando a luta a dá', () => {
    const m = mapaDaJornada(P, { vencidos: ['a', 'g'], insignias: ['rocha'] });
    igual(m.insignias[0].arte, '../arte/insignias/rocha.svg', 'a arte da insígnia ganha');
    igual(m.insignias[1].arte, '../arte/insignias/cascata.svg', 'a arte da que ainda não é sua (a silhueta)');
    igual(m.insignias[2].arte, null, 'lugar sem ginásio ganhou arte');
    igual(arteDaInsignia(null), null, 'sem id');
    igual(m.nos[1].licao, null, 'nó sem lição inventou uma');
    igual(mapaDaJornada(pack, progressoVazio()).nos.find(n => n.tipo === 'ginasio').licao.ensina, 'fraqueza de tipo', 'a lição do ginásio do pack');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/renderJornada\(\{ nova: r\.ganhouInsignia \}\)/.test(tela) && /x\.id && x\.id === nova \? ' nova' : ''/.test(tela), 'a insígnia nova não entra animada');
    ok(/\$\{x\.ganha \? ' ganha' : ''\}/.test(tela) && /\.jnInsignia\.conhecida:not\(\.ganha\) img\{filter:brightness\(0\)/.test(fonte('../app/index.html')), 'a silhueta');
    ok(/no\.licao \? `<p class="jnLicao">/.test(tela), 'o painel não mostra a lição');
    ok(/r\.ganhouInsignia \? `<span class="jnTrofeu"><img class="jnInsigniaFim" src="\$\{arteDaInsignia\(r\.ganhouInsignia\)\}"/.test(tela)
      && /\$\{ganha\?\.nome \?\? 'A insígnia'\} é sua\./.test(tela), 'o resultado da luta não mostra a insígnia ganha, com o nome');
    ok(/const vencido = no\.estado === 'vencido';/.test(tela) && /<button class="btn\$\{vencido \? '' : ' gold'\} jnCta"/.test(tela), 'o nó vencido continua pedindo a mesma luta como ação principal');
  });

  s.teste('a lição da velocidade mostra a velocidade (ST-10.14): o seu mais rápido contra os deles', () => {
    const A = [{ dex: 26, nivel: 22, golpes: ['Thunderbolt'], iv: [15, 15, 15, 15, 15, 31] }, { dex: 19, nivel: 10, golpes: ['Quick Attack'] }];
    const B = [{ dex: 120, nivel: 18, golpes: ['Surf'] }, { dex: 121, nivel: 21, golpes: ['Surf'] }];
    const v = comparaVelocidade(pack, A, B);
    igual(v.seu.dex, 26, 'o seu mais rápido');
    igual(v.seu.spe, montarLutador(pack, A[0], 'A', 0).spe, 'a velocidade não é a do motor');
    igual(v.deles.map(x => x.spe).join(), B.map((b, i) => montarLutador(pack, b, 'B', i).spe).join(), 'a velocidade dos rivais');
    igual(v.passa, v.deles.filter(x => v.seu.spe > x.spe).length, 'quantos o seu mais rápido passa');
    igual(comparaVelocidade(pack, [], B).seu, null, 'time vazio');
    /* A causa e a alavanca: o Raichu lento (oculto 0) não passa o Starmie 59;
       falta a diferença + 1, e o nível em que ele passa é o do motor. */
    const lento = [{ ...A[0], iv: [15, 15, 15, 15, 15, 0] }], vl = comparaVelocidade(pack, lento, B);
    igual(vl.alvo, Math.max(...vl.deles.map(x => x.spe)), 'o alvo é o mais rápido deles');
    igual(vl.falta, vl.alvo - vl.seu.spe + 1, 'quanto falta');
    ok(vl.passaNoNivel > 22, 'o nível em que passa');
    /* Todo oculto de velocidade e vários níveis: o nível dito PASSA (empate
       não passa — o motor sorteia), e o anterior não. Um só caso não pega a
       promessa do empate: empate exato é raro num ponto só. */
    let empates = 0;
    for (let ov = 0; ov <= 31; ov++) for (const nv of [14, 18, 20, 22]) {
      const c = { ...A[0], nivel: nv, iv: [15, 15, 15, 15, 15, ov] }, w = comparaVelocidade(pack, [c], B);
      if (!w.passaNoNivel) continue;
      ok(montarLutador(pack, { ...c, nivel: w.passaNoNivel }, 'A', 0).spe > w.alvo, `oculto ${ov}, nível ${nv}: no nível dito ele não passa`);
      ok(montarLutador(pack, { ...c, nivel: w.passaNoNivel - 1 }, 'A', 0).spe <= w.alvo, `oculto ${ov}, nível ${nv}: passava antes do nível dito`);
      for (let n = nv; n < w.passaNoNivel + 1; n++) if (montarLutador(pack, { ...c, nivel: n }, 'A', 0).spe === w.alvo) empates++;
    }
    ok(empates > 0, 'nenhum empate no varrido — o teste não cobre a promessa do empate');
    igual(v.falta, 0, 'o rápido não tem falta');
    igual(v.passaNoNivel, null, 'o rápido não precisa de nível');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/no\.licao\?\.mostra === 'vel'/.test(tela) && /comparaVelocidade\(PACK, A, rival\)/.test(tela), 'o painel da lição da velocidade não mostra a velocidade');
    ok(/causa\.textContent = v\.falta/.test(tela) && /<span class="tiny jnCausa" id="jnCausa" hidden><\/span>/.test(tela), 'a causa não vai para baixo do número');
    ok(/comparaVelocidade\(PACK, r\.timeA, r\.timeB\)/.test(tela) && /extraNoFim: \[licaoNoFim\.trim\(\), fraseDoPagamento/.test(tela), 'o fim da luta não fecha a lição da velocidade');
    ok(/venceu \? ': a lição deste ginásio\.' : ', e desta vez não bastou\.'/.test(tela), 'agir antes e perder é contado como a lição');
  });

  s.teste('a lição da imunidade mostra quem é imune (ST-10.15)', () => {
    const A = [{ dex: 111, nivel: 22, golpes: ['Rock Tomb'] }, { dex: 20, nivel: 22, golpes: ['Quick Attack'] }, { dex: 50, nivel: 20, golpes: ['Dig'] }];
    const im = imunesNoTime(pack, A, 'electric');
    igual(im.map(x => x.dex).join(), '111,50', 'os imunes a Elétrico do time');
    igual(imunesNoTime(pack, [A[1]], 'electric').length, 0, 'imune inventado');
    igual(imunesNoTime(pack, A, 'ghost').map(x => x.dex).join(), '20', 'o tipo é parâmetro, e não Elétrico fixo');
    igual(tiposImunes(pack, 'electric').join(), 'ground', 'quem o Elétrico não toca');
    igual(tiposImunes(pack, 'normal').join(), 'ghost', 'o tipo é parâmetro');
    /* A PROVA no fim da luta: os golpes do tipo em cada imune, e o dano deles
       — contado dos eventos da luta, e não afirmado. */
    const Bs = treinador(pack, 'surge').time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    const As = [{ dex: 111, nivel: 22, golpes: padraoDoMoveset(pack, 111, 22) }, { dex: 20, nivel: 22, golpes: padraoDoMoveset(pack, 20, 22) }];
    for (let k = 1; k <= 12; k++) {
      const r = simular(pack, As, Bs, k), pv = provaDaImunidade(pack, As, r.eventos, 'electric');
      igual(pv.map(x => x.dex).join(), '111', `semente ${k}: quem é imune`);
      const golpes = r.eventos.filter(e => e.para === 'A0' && Object.values(pack.golpes).flat().find(g => g.n === e.golpe)?.t === 'electric');
      igual(pv[0].golpes, golpes.length, `semente ${k}: a contagem dos golpes elétricos no imune`);
      igual(pv[0].dano, 0, `semente ${k}: o imune levou dano elétrico`);
    }
    /* O caso forçado: um rival que SÓ tem Elétrico, contra o imune sozinho. */
    const Bf = [{ dex: 25, nivel: 30, golpes: ['Discharge'] }], Af = [As[0]];
    const rf = simular(pack, Af, Bf, 3), pf = provaDaImunidade(pack, Af, rf.eventos, 'electric');
    ok(pf[0].golpes > 0, 'o rival só de Elétrico não usou Elétrico — a prova não foi exercida');
    igual(pf[0].dano, 0, 'o imune levou dano do tipo que não o toca');
    igual(pf[0].outros.length, 0, 'golpe de outro tipo inventado');
    const semTentar = provaDaImunidade(pack, As, simular(pack, As, Bs, 1).eventos, 'electric')[0];
    ok(semTentar.golpes === 0 ? semTentar.outros.length > 0 && semTentar.danoOutros >= 0 : true, 'sem tentar o tipo, a prova não diz o que o rival usou');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/provaDaImunidade\(PACK, r\.timeA, r\.resultado\.eventos, lic\.tipoGolpe\)/.test(tela), 'o fim da luta afirma a imunidade sem a prova');
    /* ST-10.22c: o mapa vem primeiro, mas numa JANELA de altura limitada que abre no nó —
       a lição continua perto da dobra, que era o motivo da ordem antiga (ST-10.15). */
    ok(/@media \(max-width:520px\)\{[^}]*#jnMapaArea\{display:flex;flex-direction:column\}/.test(fonte('../app/index.html')) && /\.jnFaixa\{order:1;/.test(fonte('../app/index.html'))
       && /\.jnPainel\{order:3\}/.test(fonte('../app/index.html')) && /\.jnJanela\{order:2;[^}]*max-height:min\(58vh,560px\);overflow-y:auto/.test(fonte('../app/index.html')),
      'no estreito o mapa não está numa janela limitada antes do painel');
    ok(/centrarJanela\(alvo, escolhido \?\? mapa\.atual\)/.test(tela), 'a janela não abre no nó');
    ok(/no\.licao\?\.mostra === 'imune'/.test(tela) && /imunesNoTime\(PACK, A, no\.licao\.tipoGolpe\)/.test(tela), 'o painel da imunidade não mostra quem é imune');
    ok(/if \(lic\?\.mostra === 'imune'\) \{/.test(tela), 'o fim da luta não fecha a lição da imunidade');
  });

  s.teste('a lição físico × especial mostra o lado fraco (ST-10.16)', () => {
    const B = treinador(pack, 'sabrina').time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    const fis = [{ dex: 59, nivel: 42, golpes: ['Fire Punch', 'Body Slam'] }], esp = [{ dex: 59, nivel: 42, golpes: ['Flamethrower', 'Hyper Voice'] }];
    const lf = ladoFraco(pack, fis, B);
    igual(lf.fraco, 'fis', 'o lado fraco do time da Sabrina');
    igual(lf.deles.map(x => `${x.def}/${x.spd}`).join(), B.map((b, i) => { const f = montarLutador(pack, b, 'B', i); return `${f.def}/${f.spd}`; }).join(), 'as defesas não são as do motor');
    igual(JSON.stringify(lf.seus), '[{"dex":59,"fis":2,"esp":0}]', 'os seus golpes por categoria');
    igual(lf.pelaForte.length, 0, 'o físico não bate pelo lado forte');
    /* O caso da captura: o Arcanine só de especiais AO LADO de um Snorlax de
       físicos — a soma do time escondia o Arcanine. */
    const misto = ladoFraco(pack, [...esp, { dex: 143, nivel: 36, golpes: ['Body Slam', 'Extreme Speed', 'Quick Attack'] }], B);
    igual(misto.pelaForte.map(x => x.dex).join(), '59', 'quem bate pelo lado forte some na soma do time');
    /* O fim da luta: o dano de cada categoria, contado dos eventos do lado A. */
    const r = simular(pack, [{ ...fis[0], golpes: ['Fire Punch', 'Flamethrower'] }], B, 5), d = danoPorCategoria(pack, r.eventos);
    const cat = n => Object.values(pack.golpes).flat().find(g => g.n === n).cat;
    igual(d.fis.dano, r.eventos.filter(e => e.de[0] === 'A' && cat(e.golpe) === 'fis').reduce((a, e) => a + e.dano, 0), 'o dano físico');
    igual(d.esp.golpes, r.eventos.filter(e => e.de[0] === 'A' && cat(e.golpe) === 'esp').length, 'os golpes especiais');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/no\.licao\?\.mostra === 'categoria'/.test(tela) && /ladoFraco\(PACK, A, rival\)/.test(tela), 'o painel não mostra o lado fraco');
    ok(/lf\.pelaForte\.includes\(x\) \? ' ruim' : ''/.test(tela), 'o seu time não aparece ao lado das defesas delas, com quem bate errado marcado');
    ok(/causa\.dataset\.licao = lf\.pelaForte\.length \? 'golpes' : ''/.test(tela) && /\$\('#jnCausa'\)\?\.dataset\.licao === 'golpes'/.test(tela), 'o "reforce o time" genérico contradiz a lição dos golpes');
    ok(/troque \$\{A\.find\(c => c\.dex === x\.dex\)\.golpes\.filter\(n => catDe\(n\) !== lf\.fraco\)/.test(tela), 'a saída não nomeia os golpes a trocar');
    ok(/if \(lic\?\.mostra === 'categoria'\) \{/.test(tela) && /danoPorCategoria\(PACK, r\.resultado\.eventos\)/.test(tela), 'o fim da luta não mostra o dano por categoria');
  });

  s.teste('ST-10.19a: a lição da resistência e a do preset aparecem no painel e no fim da luta', () => {
    const tipos = ['grass', 'poison'];
    const A = [{ dex: 24, nivel: 36, golpes: ['Poison Jab'] }, { dex: 53, nivel: 36, golpes: ['Body Slam'] }];
    const rs = resistenciaNoTime(pack, A, tipos);
    igual(rs.map(x => `${x.dex}:${x.mult}`).join(), '24:0.5,53:1', 'quanto a líder machuca cada um');
    ok(tiposQueResistem(pack, tipos).includes('poison') && !tiposQueResistem(pack, tipos).includes('normal'), 'quem resiste a Planta e Veneno');
    ok(!tiposQueResistem(pack, tipos).includes('fire'), 'o Fogo resiste só à Planta — não aos DOIS');
    /* A prova: os golpes dos tipos da líder no resistente, e o dano deles. */
    const B = treinador(pack, 'erika').time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    const r = simular(pack, [{ ...A[0], golpes: padraoDoMoveset(pack, 24, 36) }], B, 4);
    const pr = provaDaResistencia(pack, [{ ...A[0], golpes: padraoDoMoveset(pack, 24, 36) }], r.eventos, tipos);
    const tipoDe = n => Object.values(pack.golpes).flat().find(g => g.n === n)?.t;
    const nele = r.eventos.filter(e => e.para === 'A0' && tipos.includes(tipoDe(e.golpe)));
    igual(pr[0].golpes, nele.length, 'a contagem dos golpes da líder no resistente');
    igual(pr[0].dano, nele.reduce((a, e) => a + e.dano, 0), 'o dano deles');
    /* A ameaça do Koga: a Venomoth (a que mais machuca o time). */
    const K = treinador(pack, 'koga').time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    igual(ameacaDoRival(pack, [{ dex: 112, nivel: 42, golpes: padraoDoMoveset(pack, 112, 42) }, { dex: 135, nivel: 38, golpes: padraoDoMoveset(pack, 135, 38) }], K), 49, 'a ameaça do Koga');
    const rk = simular(pack, [{ dex: 112, nivel: 42, golpes: padraoDoMoveset(pack, 112, 42) }], K, 3);
    const q = quandoCaiu(rk.eventos, 'B1');
    const esperado = rk.eventos.find(e => e.para === 'B1' && e.caiu)?.turno ?? null;
    igual(q, esperado, 'o turno em que a ameaça caiu');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/no\.licao\?\.mostra === 'resiste'/.test(tela) && /resistenciaNoTime\(PACK, A, no\.licao\.tiposGolpe\)/.test(tela), 'o painel da resistência');
    ok(/no\.licao\?\.mostra === 'preset'/.test(tela) && /no\.licao\.presetCerto/.test(tela), 'o painel do preset');
    ok(/if \(lic\?\.mostra === 'resiste'\) \{/.test(tela) && /provaDaResistencia\(PACK, r\.timeA, r\.resultado\.eventos, lic\.tiposGolpe\)/.test(tela), 'o fim da luta da resistência');
    ok(/if \(lic\?\.mostra === 'preset'\) \{/.test(tela) && /turnosDaAmeaca\(PACK, \{ timeA: r\.timeA, timeB: r\.timeB, semente: r\.semente/.test(tela), 'o fim da luta do preset');
    /* A prova do preset é a MESMA luta com o outro preset: mesma semente. */
    const As = [{ dex: 112, nivel: 42, golpes: padraoDoMoveset(pack, 112, 42) }, { dex: 135, nivel: 38, golpes: padraoDoMoveset(pack, 135, 38) }];
    const r1 = simular(pack, As, K, 11, { preset: 'balanced' });
    const tt = turnosDaAmeaca(pack, { timeA: As, timeB: K, semente: 11, eventos: r1.eventos, usado: 'balanced', certo: 'defensive' });
    igual(tt.outro, 'defensive', 'o outro preset');
    igual(tt.noUsado, quandoCaiu(r1.eventos, 'B1'), 'o turno no preset usado');
    igual(tt.noOutro, quandoCaiu(simular(pack, As, K, 11, { preset: 'defensive' }).eventos, 'B1'), 'o turno no outro preset (mesma semente)');
    /* Várias sementes: um caso só não distingue "a mesma luta" de "outra luta
       que calhou de dar o mesmo turno" (o S1531 escapou assim). */
    for (let k = 1; k <= 25; k++) {
      const rk2 = simular(pack, As, K, k, { preset: 'balanced' });
      igual(turnosDaAmeaca(pack, { timeA: As, timeB: K, semente: k, eventos: rk2.eventos, usado: 'balanced', certo: 'defensive' }).noOutro,
        quandoCaiu(simular(pack, As, K, k, { preset: 'defensive' }).eventos, 'B1'), `semente ${k}: a prova não é a mesma luta`);
    }
    igual(turnosDaAmeaca(pack, { timeA: As, timeB: K, semente: 11, eventos: r1.eventos, usado: 'defensive', certo: 'defensive' }).outro, 'balanced', 'no certo, compara com o Equilibrado');
  });

  s.teste('ST-10.19b: o preset Agressivo (Blaine) e o tipo duplo (Giovanni), no painel e no fim da luta', () => {
    const mk = (dex, nivel) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) });
    const rivalDo = id => treinador(pack, id).time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    /* A prova do Agressivo: os golpes que o rival ACERTOU em você (dano > 0),
       nos dois presets, na MESMA luta (mesma semente). */
    const Bl = rivalDo('blaine'), Ab = [mk(117, 40), mk(121, 40)];
    const r1 = simular(pack, Ab, Bl, 5, { preset: 'balanced' });
    igual(golpesLevados(r1.eventos), r1.eventos.filter(e => e.para.startsWith('A') && e.dano > 0).length, 'os golpes levados');
    igual(golpesLevados([{ para: 'A0', dano: 0 }, { para: 'B0', dano: 9 }, { para: 'A1', dano: 3 }]), 1, 'golpe que errou ou no rival contou');
    let menos = 0, soma = { b: 0, a: 0 };
    for (let k = 1; k <= 25; k++) {
      const rb = simular(pack, Ab, Bl, k, { preset: 'balanced' });
      const pv = provaDoPreset(pack, { timeA: Ab, timeB: Bl, semente: k, eventos: rb.eventos, usado: 'balanced', certo: 'aggressive' });
      const ra = simular(pack, Ab, Bl, k, { preset: 'aggressive' });
      igual(pv.outro, 'aggressive', 'o outro preset');
      igual(pv.levadosUsado, golpesLevados(rb.eventos), `semente ${k}: os levados no preset usado`);
      igual(pv.levadosOutro, golpesLevados(ra.eventos), `semente ${k}: a prova não é a mesma luta`);
      igual(pv.venceuOutro, ra.vencedor === 'A', `semente ${k}: quem venceria com o outro`);
      soma.b += pv.levadosUsado; soma.a += pv.levadosOutro; if (pv.levadosOutro < pv.levadosUsado) menos++;
    }
    /* A lição é verdadeira na média: um a menos bate a menos. */
    ok(soma.a < soma.b, `no Agressivo você levou ${soma.a} golpes, e no Equilibrado ${soma.b} — a lição não é verdade`);
    igual(provaDoPreset(pack, { timeA: Ab, timeB: Bl, semente: 5, eventos: r1.eventos, usado: 'aggressive', certo: 'aggressive' }).outro, 'balanced', 'no certo, compara com o Equilibrado');
    /* O tipo duplo: o MELHOR multiplicador de cada criatura sua em cada uma
       dele, pelos DOIS tipos de quem apanha. */
    const G = rivalDo('giovanni');
    const m = multiplicadoresNoRival(pack, [mk(68, 50), mk(55, 50)], G);
    igual(m[0].contra.map(x => `${x.dex}:${x.mult}`).join(), '111:2,51:1,31:0.5,34:0.5,112:2', 'o Lutador: bate Pedra, e o Venenoso corta');
    igual(m[1].contra.map(x => `${x.dex}:${x.mult}`).join(), '111:4,51:2,31:2,34:2,112:4', 'a Água: os dois lados');
    ok(!m[0].todos && m[1].todos, 'quem bate forte em todos');
    igual(multiplicadoresNoRival(pack, [{ dex: 68, nivel: 50, golpes: ['Body Slam'] }], G)[0].contra.map(x => x.mult).join(), '0.5,1,1,1,0.5', 'o golpe Normal (a Pedra resiste)');
    /* Água e Gelo batem em todos; a Planta NÃO — o Venenoso dos Nidos corta
       (½ × 2 = 1): o mesmo corte do Lutador, pelo outro lado. */
    igual(tiposQueBatemEmTodos(pack, G).join(), 'water,ice', 'quem bate em todos');
    /* A leitura, para a causa: quem bate em todos, o CORTE e o pior. */
    const lt = leituraDoDuplo(m);
    igual(lt.bons.map(x => x.dex).join(), '55', 'quem bate forte em todos');
    igual(`${lt.corte.dex}:${lt.corte.alto.dex}:${lt.corte.baixo.dex}`, '68:111:31', 'o exemplo do corte');
    igual(lt.pior.dex, 68, 'o pior');
    igual(leituraDoDuplo(multiplicadoresNoRival(pack, [mk(55, 50)], G)).corte, null, 'corte onde não há');
    /* A prova do duplo: dos eventos, por criatura sua. */
    const rg = simular(pack, [mk(55, 50), mk(68, 50)], G, 3);
    const pd = provaDoDuplo(pack, [mk(55, 50), mk(68, 50)], rg.eventos);
    const deA = i => rg.eventos.filter(e => e.de === `A${i}` && !e.errou);
    igual(pd[0].fortes, deA(0).filter(e => e.eff >= 2).length, 'os super-efetivos');
    igual(pd[0].quadruplos, deA(0).filter(e => e.eff >= 4).length, 'os de 4×');
    igual(pd[1].cortados, deA(1).filter(e => e.eff > 0 && e.eff < 1).length, 'os cortados');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/no\.licao\.presetCerto !== 'defensive'/.test(tela), 'o painel do Agressivo');
    ok(/if \(lic\?\.mostra === 'preset' && lic\.presetCerto !== 'defensive'\) \{/.test(tela)
      && /provaDoPreset\(PACK, \{ timeA: r\.timeA, timeB: r\.timeB, semente: r\.semente/.test(tela), 'o fim da luta do Agressivo');
    /* Q7 da ST-10.19b: vencer sem a lição é dito como a fatia da chance. */
    ok(/\(semLicao && venceu \? ` Você venceu sem a lição: foi a fatia dos \$\{porcentagemExibida\(antes\.p\)\}\.`/.test(tela), 'a vitória sem a lição não é dita');
    ok(/no\.licao\?\.mostra === 'duplo'/.test(tela) && /multiplicadoresNoRival\(PACK, A, rival\)/.test(tela), 'o painel do tipo duplo');
    ok(/if \(lic\?\.mostra === 'duplo'\) \{/.test(tela) && /provaDoDuplo\(PACK, r\.timeA, r\.resultado\.eventos\)/.test(tela), 'o fim da luta do tipo duplo');
  });

  s.teste('ST-10.19c: a Liga — o nó, a frase, a revisão, e o preset que não é receita', () => {
    const m = mapaDaJornada(pack, progressoVazio()), liga = m.nos.filter(n => n.tipo === 'liga');
    igual(liga.map(n => n.id).join(), 'lorelei,bruno,agatha,lance,campeao', 'os nós da Liga, em ordem');
    igual(m.nos.at(-1).id, 'campeao', 'o Campeão não é o último nó');
    igual(liga.map(n => n.lider).join(), 'Lorelei,Bruno,Agatha,Lance,O Rival, Campeão', 'o nome de cada um no mapa');
    /* A revisão aponta o ginásio que ensinou — a insígnia dele desenha a lição. */
    igual(liga.map(n => n.revisa?.insignia ?? '-').join(), 'alma,trovao,pantano,arcoiris,-', 'a insígnia do ginásio revisado');
    ok(liga.every(n => !n.insignia), 'a Liga dando insígnia');
    /* A promessa da Liga é a da Liga (achado na captura: prometia a de rota). */
    ok(/800 PokéCoin · 2 Ultra Ball/.test(fraseDoPagamento(pack, pagamentoDoNo({ ...liga[0], estado: 'atual' }, null, 1))), 'a promessa da Liga');
    /* Na segunda volta você fica à DIREITA do nó — do lado de onde chegou. */
    const antesDe = id => ({ vencidos: pack.jornada.slice(0, pack.jornada.findIndex(n => n.id === id)).map(n => n.id), insignias: [] });
    igual(ondeEstou(mapaDaJornada(pack, antesDe('bruno'))).lado, 'direita', 'na segunda volta, você do lado errado');
    igual(ondeEstou(mapaDaJornada(pack, antesDe('floresta'))).lado, 'esquerda', 'na primeira volta, você do lado errado');
    const f = { ...liga[0], estado: 'atual' };
    ok(/Liga/.test(fraseDoNo(f, 'Lorelei')) && !/ganhar a insígnia/.test(fraseDoNo(f, 'Lorelei')), `a frase da Liga: ${fraseDoNo(f, 'Lorelei')}`);
    ok(/Campeão/.test(fraseDoNo({ ...liga[4], estado: 'atual' }, 'O Rival, Campeão')), 'a frase do Campeão');
    /* O Campeão: o preset certo é o Equilibrado, e o errado — o que venceu o
       Blaine — é o Agressivo. Quem usa o certo compara com o ERRADO da lição. */
    const mk = (dex, nivel) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) });
    const C = treinador(pack, 'campeao').time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    const A6 = [3, 6, 9, 143, 65, 149].map(d => mk(d, 58));
    const r = simular(pack, A6, C, 4, { preset: 'balanced' });
    const pv = provaDoPreset(pack, { timeA: A6, timeB: C, semente: 4, eventos: r.eventos, usado: 'balanced', certo: 'balanced', errado: 'aggressive' });
    igual(pv.outro, 'aggressive', 'no certo, o Campeão compara com o Agressivo');
    igual(pv.levadosOutro, golpesLevados(simular(pack, A6, C, 4, { preset: 'aggressive' }).eventos), 'a prova não é a mesma luta');
    /* A prova do Campeão é a que a lição declara (rivais derrubados), e ela é
       VERDADEIRA na média: o crítico cego achou uma luta em que o certo levou
       mais golpes (10 × 9) — a medida do Blaine não serve aqui. */
    igual(pack.jornada.find(n => n.id === 'campeao').licao.prova, 'derrubados', 'a prova do Campeão');
    igual(pv.derrubadosUsado, rivaisDerrubados(r.eventos), 'os derrubados no preset usado');
    igual(rivaisDerrubados([{ para: 'B0', caiu: true }, { para: 'B0', caiu: true }, { para: 'A1', caiu: true }, { para: 'B2', caiu: false }]), 1, 'contou queda repetida, do lado A ou sem queda');
    let certo = 0, errado = 0;
    for (let k = 1; k <= 20; k++) {
      const rk = simular(pack, A6, C, k, { preset: 'balanced' });
      const p2 = provaDoPreset(pack, { timeA: A6, timeB: C, semente: k, eventos: rk.eventos, usado: 'balanced', certo: 'balanced', errado: 'aggressive' });
      certo += p2.derrubadosUsado; errado += p2.derrubadosOutro;
    }
    ok(certo > errado, `o Equilibrado derrubou ${certo} e o Agressivo ${errado} em 20 lutas — a prova depõe contra a lição`);
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/errado: lic\.presetErrado/.test(tela), 'o fim da luta ignora o preset errado da lição');
    ok(/lic\.prova === 'derrubados'/.test(tela), 'o fim da luta ignora a medida da lição');
    ok(/n\.tipo === 'liga'/.test(tela), 'o mapa não desenha a Liga');
  });

  s.teste('ST-10.19d (L-205): a correção da lição — o que trocar, e o time que ela dá', () => {
    const mk = (id, dex, nivel) => ({ id, power: dex, entrada: { dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) } });
    const no = id => pack.jornada.find(n => n.id === id);
    const rivalDo = id => treinador(pack, id).time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: movesetDoRival(pack, x.dex, x.nivel) }));
    /* PRESET: errado → o certo da lição, o MESMO time. */
    const eq = [mk('a', 117, 40), mk('b', 121, 40)];
    const c1 = correcaoDaLicao(pack, { licao: no('cinnabar').licao, membros: eq, caixa: [], preset: 'balanced', rival: rivalDo('blaine') });
    igual(`${c1.tipo}:${c1.preset}`, 'preset:aggressive', 'a correção do Blaine');
    igual(JSON.stringify(c1.timeA), JSON.stringify(eq.map(x => x.entrada)), 'a correção de preset mexeu no time');
    igual(correcaoDaLicao(pack, { licao: no('cinnabar').licao, membros: eq, caixa: [], preset: 'aggressive', rival: rivalDo('blaine') }), null, 'correção com o preset certo');
    /* IMUNIDADE: ninguém imune no time, um imune na caixa → troca o mais fraco
       por ele (o de maior power, se houver dois). */
    const surge = [mk('x', 59, 22), mk('y', 20, 22)], caixa = [mk('p', 95, 22), mk('q', 111, 22), mk('r', 50, 22), mk('s', 16, 22)];
    const c2 = correcaoDaLicao(pack, { licao: no('vermilion').licao, membros: surge, caixa, preset: 'balanced', rival: rivalDo('surge') });
    igual(`${c2.tipo}:${c2.sai.id}>${c2.entra.id}`, 'troca:y>q', 'a troca da imunidade (sai o de menor power, entra o imune de maior power)');
    igual(c2.timeA.map(x => x.dex).join(), '59,111', 'o time corrigido');
    igual(correcaoDaLicao(pack, { licao: no('vermilion').licao, membros: [mk('x', 59, 22), mk('q', 111, 22)], caixa, preset: 'balanced', rival: rivalDo('surge') }), null, 'correção com um imune no time');
    igual(correcaoDaLicao(pack, { licao: no('vermilion').licao, membros: surge, caixa: [mk('s', 16, 22)], preset: 'balanced', rival: rivalDo('surge') }), null, 'correção sem imune na caixa');
    /* RESISTÊNCIA: sai quem apanha MAIS; entra quem resiste a tudo. */
    const c3 = correcaoDaLicao(pack, { licao: no('celadon').licao, membros: [mk('t', 128, 36), mk('u', 20, 30)], caixa: [mk('v', 24, 36), mk('w', 6, 36)], preset: 'balanced', rival: rivalDo('erika') });
    igual(`${c3.tipo}:${c3.entra.id}`, 'troca:v', 'a troca da resistência (o Charizard não resiste a Venenoso)');
    /* TIPO DUPLO: sai o pior (menor multiplicador), entra quem bate em todos. */
    const c4 = correcaoDaLicao(pack, { licao: no('viridian').licao, membros: [mk('m', 68, 50), mk('n', 143, 50)], caixa: [mk('o', 55, 50)], preset: 'balanced', rival: rivalDo('giovanni') });
    igual(`${c4.tipo}:${c4.sai.id}>${c4.entra.id}`, 'troca:n>o', 'a troca do tipo duplo (sai o Snorlax, que bate ½ nas Pedras)');
    /* Sem correção nomeável (velocidade, categoria, sem lição): nada. */
    for (const id of ['cerulean', 'saffron', 'rota1']) igual(correcaoDaLicao(pack, { licao: no(id).licao, membros: eq, caixa, preset: 'balanced', rival: [] }), null, `${id}: correção inventada`);
    /* A tela aplica o que a camada 0 decidiu, e mais nada. */
    const d = { preset: null, trocas: [] };
    aplicarCorrecao(c1, { preset: p => { d.preset = p; }, trocar: t => d.trocas.push(`${t.sai}>${t.entra}`) });
    aplicarCorrecao(c2, { preset: p => { d.preset += `/${p}`; }, trocar: t => d.trocas.push(`${t.sai}>${t.entra}`) });
    igual(`${d.preset}|${d.trocas.join()}`, 'aggressive|y>q', 'o que a correção aplicou');
    /* O SENTIDO do caminho (Q7 da Liga): uma seta no meio de cada trecho —
       para a direita na primeira volta, para baixo na curva, para a esquerda
       na segunda. */
    const m = mapaDaJornada(pack, progressoVazio()), setas = setasDoCaminho(m);
    igual(setas.length, m.nos.length - 1, 'uma seta por trecho');
    const h = Math.ceil(m.nos.length / 2);
    igual(setas.map(x => x.dir[0]).join(''), 'd'.repeat(h - 1) + 'b' + 'e'.repeat(m.nos.length - h - 1), 'o sentido de cada trecho');
    ok(setas.every((x, i) => Math.abs(x.x - (m.nos[i].x + m.nos[i + 1].x) / 2) < 0.06 && Math.abs(x.y - (m.nos[i].y + m.nos[i + 1].y) / 2) < 0.06), 'a seta fora do meio do trecho');
    igual(setasDoCaminho(mapaDaJornada(P, progressoVazio())).map(x => x.dir).join(), 'dir,dir,dir', 'numa volta só, tudo para a direita');
    /* A FAIXA do celular: o anterior, o escolhido e o próximo, na ordem. */
    const f = faixaDoCaminho(m, 'pewter');
    igual([f.antes?.id, f.este.id, f.depois?.id].join(), 'pedra,pewter,cerulean', 'a faixa do caminho');
    /* O nome CURTO (Q7 da 10.19d): "Ginásio de …" cortado perdia o que distingue. */
    igual([f.antes.curto, f.este.curto, f.depois.curto].join(), 'Caminho da Pedra,Pewter,Cerulean', 'o nome curto na faixa');
    ok(m.nos.every(n => n.curto && n.curto.length <= 16), 'nó sem nome curto, ou longo demais para a faixa');
    igual(faixaDoCaminho(m, 'rota1').antes, null, 'antes do primeiro');
    igual(faixaDoCaminho(m, 'campeao').depois, null, 'depois do último');
    igual(faixaDoCaminho(m, null).este.id, m.atual, 'sem escolha, a faixa é a do nó atual');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/setasDoCaminho\(mapa\)/.test(tela) && /faixaDoCaminho\(mapa, escolhido\)/.test(tela), 'a tela não desenha o sentido nem a faixa');
    ok(/correcaoDaLicao\(PACK, \{/.test(tela) && /data-jn-corrige/.test(tela), 'a tela não mostra a correção');
    ok(/lote\(PACK, corr\.timeA, rival, RAIZ/.test(tela), 'a chance projetada não é a do time corrigido');
    ok(/era \$\{porcentagemExibida\(aplicada\.antes\)\}, agora \$\{porcentagemExibida\(r\.p\)\}/.test(tela), 'a correção aplicada não diz de onde veio o número');
    ok(/\$\('#jnCausa \.lnk'\)\?\.remove\(\)/.test(tela), 'duas ações para a mesma correção');
  });

  s.teste('ST-10.21 (L-206): o acabamento — o nó atual, as setas, o risco, o título, a cena longe de você', () => {
    /* O RISCO diz o tamanho do risco: 2% não é "arriscado". */
    igual([0.02, 0.09, 0.1, 0.29, 0.3, 0.8].map(avisoDoRisco).map(x => x ?? '-').join('|'), 'derrota quase certa|derrota quase certa|arriscado|arriscado|-|-', 'o aviso de cada faixa');
    /* As SETAS sabem se o trecho já foi andado: as do por andar são as que
       precisam aparecer sobre a trilha tracejada. */
    const m = mapaDaJornada(pack, { vencidos: ['rota1', 'floresta', 'rota22'], insignias: [] }), sx = setasDoCaminho(m);
    igual(sx.map(x => (x.andado ? 'a' : 'p')).join('').slice(0, 5), 'aaapp', 'o trecho andado e o por andar');
    igual(setasDoCaminho(mapaDaJornada(pack, progressoVazio())).filter(x => x.andado).length, 0, 'seta andada antes do primeiro passo');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), html = fonte('../app/index.html');
    ok(/n\.estado === 'atual' \? '<b class="jnAnel"><\/b>' : ''/.test(tela), 'o nó atual sem o anel');
    ok(/jn-\$\{sx\.dir\}\$\{sx\.andado \? ' andado' : ''\}/.test(tela), 'a seta não sabe se foi andada');
    ok(/avisoDoRisco\(r\.p\)/.test(tela), 'o aviso de risco não é o da camada 0');
    /* ST-11.6a: as abas do Time viraram tabela (a terceira é a Liga de times); cada uma com o seu título. */
    ok(/jornada: \{ corpo: '#jornadaCorpo', titulo: 'Jornada'/.test(tela) && /titulo\.textContent = a\.titulo/.test(tela) && /id="treinoTitulo"/.test(html), 'o título diz "Time" na aba Jornada');
    ok(/\.jnEu/.test(tela.slice(tela.indexOf('function afastarCena'), tela.indexOf('let reafastar'))), 'a cena não desvia de você');
    const afastar = tela.slice(tela.indexOf('function afastarCena'), tela.indexOf('let reafastar'));
    ok(/querySelectorAll\('\.jnSetaPos'\)/.test(afastar) && /\.jnLend/.test(afastar), 'a seta não procura outro ponto, ou você fica sob o lendário');
    /* A seta tem para onde ir: outros pontos do MESMO trecho, entre os nós. */
    const s1 = setasDoCaminho(mapaDaJornada(pack, progressoVazio()))[3], a1 = mapaDaJornada(pack, progressoVazio()).nos[3], b1 = mapaDaJornada(pack, progressoVazio()).nos[4];
    ok(s1.outros.length >= 4 && s1.outros.every(p => p.x >= Math.min(a1.x, b1.x) && p.x <= Math.max(a1.x, b1.x)), 'os outros pontos saem do trecho');
    ok(/lutar contra \$\{t\.nome\.replace\(\/\^\(O\|A\) \//.test(tela), '"lutar contra O Rival" com maiúscula no meio da frase');
    ok(/\.jnPainel\{[^}]*max-width:1240px/.test(html), 'o painel sem largura máxima em 1920');
    ok(/cz\.innerHTML = cz\.innerHTML\.replace\(\/\\s\*—\\s\*\$\/, ''\)/.test(tela), 'o travessão fica pendurado quando o link sai');
  });

  s.teste('ST-10.22a (L-209): a leitura do chefe, o "próximo", a faixa em trecho e o título junto do lema', () => {
    /* O CHEFE: os tipos dos golpes que ele usa, sem repetir, a vida de chefe,
       e quanto machuca cada um seu — o pior dos tipos. */
    const rival = [{ dex: 145, nivel: 50, vidaX: 3, golpes: movesetDoRival(pack, 145, 50) }];
    const A = [[76, 45], [65, 45], [91, 45], [135, 45]].map(([dex, nivel]) => ({ dex, nivel }));
    const lc = leituraDoChefe(pack, A, rival);
    igual(JSON.stringify(lc.tipos), '["electric","flying"]', 'os tipos do chefe');
    igual(`${lc.vidaX}|${lc.nivel}|${lc.dex}`, '3|50|145', 'a vida, o nível e a espécie do chefe');
    igual(lc.machuca.map(x => `${x.dex}:${x.mult}`).join(' '), '76:0.5 65:1 91:2 135:0.5', 'quanto machuca: Golem ½, Alakazam cheio, Cloyster 2×, Jolteon ½');
    igual(JSON.stringify(lc.resistem), '["electric"]', 'quem resiste a todos');
    igual(leituraDoChefe(pack, A, []), null, 'sem chefe, leitura inventada');
    igual(leituraDoChefe(pack, A, [{ dex: 145, nivel: 50 }]).vidaX, 1, 'sem vidaX, a vida não é a de um');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), html = fonte('../app/index.html');
    ok(/const chefe = no\.tipo === 'chefe' && !no\.licao \? leituraDoChefe\(PACK, \[\], rival\) : null;/.test(tela), 'o painel do chefe não pergunta à camada 0');
    ok(/if \(chefe\) \{\s*const lc = leituraDoChefe\(PACK, A, rival\)/.test(tela), 'o quanto machuca do chefe não usa o seu time');
    /* "próximo" só no nó que falta vencer. */
    ok(/\$\{n\.estado === 'atual' \? '<strong class="jnProx">próximo<\/strong>' : ''\}<\/span>/.test(tela), 'a etiqueta "próximo" não é só do nó atual');
    /* A faixa do celular é um trecho: o marco na cor do estado, e a insígnia do ginásio aberto. */
    ok(/<i class="jnFaixaMarco"\$\{n\.tipo === 'ginasio' && n\.estado !== 'trancado' \? ` style="background-image:url\(\$\{arteDaInsignia\(n\.insignia\)\}\)"` : ''\}><\/i>/.test(tela), 'a faixa sem o marco do nó');
    ok(/\.jnFaixa::before\{[^}]*dashed/.test(html) && /\.jnFaixaNo\.jn-atual \.jnFaixaMarco\{[^}]*var\(--neon\)/.test(html), 'a faixa sem a trilha ou sem a cor do atual');
    ok(/#viewTreino > \.card > h3\{justify-content:flex-start/.test(html), 'o lema volta ao canto oposto do título');
  });

  s.teste('ST-10.22b (L-209): o mundo — regiões que se fundem, a cena em anéis, a nossa arte e as poças', () => {
    const m = mapaDaJornada(pack, progressoVazio());
    /* ST-10.22e: o chão das regiões virou a grade de `jornada-chao.mjs` — a
       fusão, o planalto de uma peça só e o nó dentro do próprio chão são
       testados lá, sobre a grade. Aqui fica a cena. */
    /* A cena em lista: um ANEL por tipo — a casa não cai no lago. */
    const cer = cenaDoNo({ cena: ['agua', 'casas'] });
    igual(cer.map(c => c.forma ?? c.arte).join(), 'lago,lago,casa_azul,casa_verde', 'a cena de Cerulean');
    /* As casas mudam de cor de cidade para cidade (Q7: "o mesmo par em todo ginásio"), e não a cada repintura. */
    const par = id => cenaDoNo(m.nos.find(n => n.id === id)).filter(c => /^casa_/.test(c.arte ?? '')).map(c => c.arte).join('+');
    const pares = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'cinnabar', 'viridian'].map(par);
    ok(new Set(pares).size >= 4, `as cidades repetem o mesmo par de casas: ${pares.join(' ')}`);
    igual(par('pewter'), par('pewter'), 'a cor da casa dança a cada repintura');
    /* A parede mistura a árvore do pret com as nossas, e varia o tamanho. */
    const parede = bordaDoMapa();
    ok(parede.filter(p => p.arte === 'pinheiro').length >= 8 && parede.filter(p => p.arte === 'arvore').length >= 8 && parede.filter(p => !p.arte).length >= 12, 'a parede é uma árvore só');
    ok(parede.some(p => p.escala === 2) && parede.some(p => p.escala === 3), 'a parede sem variação de tamanho');
    const lagos = cer.filter(c => c.forma), casas = cer.filter(c => c.arte);
    ok(casas.every(c => lagos.every(l => Math.abs(c.dy - l.dy) >= 34 || Math.abs(c.dx - l.dx) >= 48)), 'a casa cai em cima do lago');
    igual(cenaDoNo({ cena: ['casas', 'lava'] }).filter(c => c.forma === 'lava').length, 2, 'Cinnabar sem lava');
    igual(cenaDoNo({ cena: ['nada'] }).length, 0, 'tipo desconhecido virou enfeite');
    /* O MARCO: cada cidade com o seu, no lugar de UMA casa — e nunca o par espelhado. */
    const marcos = m.nos.filter(n => n.marco).map(n => n.marco);
    igual(new Set(marcos).size, marcos.length, 'duas cidades com o mesmo marco');
    ok(marcos.length >= 6, `cidades sem marco: só ${marcos.length}`);
    for (const n of m.nos.filter(x => x.marco)) {
      const c = cenaDoNo(n), mc = c.filter(x => x.marco);
      igual(mc.length, 1, `o marco de ${n.id} aparece ${mc.length} vezes`);
      ok(/^<svg [^>]*shape-rendering="crispEdges"/.test(fonte(`../arte/mapa/${n.marco}.svg`)), `o marco ${n.marco} não existe`);
    }
    /* O braseiro da Liga é UM por nó, do lado que o nome sorteia — doze em pares era carimbo. */
    igual(m.nos.filter(n => n.tipo === 'liga').map(n => cenaDoNo(n).filter(c => c.arte === 'braseiro').length).join(), '1,1,1,1,1', 'os braseiros da Liga em par');
    ok(new Set(m.nos.filter(n => n.tipo === 'liga').map(n => Math.sign(cenaDoNo(n).find(c => c.arte === 'braseiro').dx))).size === 2, 'todo braseiro do mesmo lado');
    /* A nossa arte: cada peça pedida existe em `arte/mapa/`, e o gerador a refaz igual. */
    for (const a of new Set(m.nos.flatMap(n => cenaDoNo(n)).map(c => c.arte).filter(Boolean)))
      ok(/^<svg [^>]*shape-rendering="crispEdges"/.test(fonte(`../arte/mapa/${a}.svg`)), `a arte ${a} não existe ou não é pixel`);
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), html = fonte('../app/index.html');
    /* O rótulo do trancado é SÓ o nome (Q7, 3ª rodada: "sopa de rótulos" em 1100): o líder e o tipo ficam no aberto, no vencido e no escolhido. */
    ok(/<span>\$\{n\.nome\}\$\{n\.estado === 'trancado' && n\.id !== escolhido \? '' :/.test(tela), 'o trancado ainda leva o rótulo de duas linhas');
    ok(tela.indexOf('<canvas class="jnChao"') > 0 && tela.indexOf('<canvas class="jnChao"') < tela.indexOf('<svg class="jnCaminho jnDeitado"'), 'o chão é pintado por cima do caminho');
    ok(/background-image:url\(\$\{ARTE_NOSSA_DO_MAPA\}\/\$\{c\.arte\}\.svg\)/.test(tela), 'a nossa arte não vem de arte/mapa');
    /* A arte de 16 × 16 não herda a folha de quatro quadros (o bug da primeira captura: esticada ×4, só a borda vazia aparecia). */
    ok(/\.jnProp\.jnArte\{background-size:32px 32px\}/.test(html), 'a nossa arte esticada na folha de 128 px');
    ok(/\.jnLago\.jn-lava::after\{/.test(html) && /\.jnLago\.jn-brejo::after\{/.test(html), 'a lava ou o brejo sem poça própria');
    ok(/@media \(prefers-reduced-motion:reduce\)\{ \.jnLago::after,\.jnLago i\{animation:none\} \}/.test(html), 'a água anda para quem pediu menos movimento');
    ok(/\.jnMapa\.jnVoltas2\{height:calc\(var\(--n\) \* 165px \+ 60px\)\}/.test(html), 'o passo em pé voltou a 150 px — o rótulo com "próximo" encosta no treinador de baixo');
    const afastar = tela.slice(tela.indexOf('function afastarCena'), tela.indexOf('let reafastar'));
    ok(/querySelectorAll\('\.jnB \.jnProp'\)/.test(afastar), 'a árvore da parede fica sob a casa');
    /* O marco é <img>: o afastamento roda de novo quando ele carrega — com 0 × 0 ele ficava em cima de um nome (medido). */
    ok(/querySelectorAll\('\.jnMarco'\)\.forEach\(im => \{ if \(!im\.complete\) im\.addEventListener\('load', \(\) => afastarCena\(alvo\), \{ once: true \}\); \}\)/.test(tela)
       && /\.jnPos:not\(\.jnB\) \.jnMarco'\)\) \{/.test(afastar), 'o marco fica fora do afastamento');
  });

  /* D-125 — o inicial sozinho perdia o primeiro nó — foi consertado na ST-10.13;
     o aceite mora em `ginasios` ("D-125 consertado"). */

  s.teste('10.22c · em pé, UMA estrada: o caminho de 18 nós não dobra em duas voltas no celular', () => {
    const deitado = mapaDaJornada(pack, { vencidos: [] });
    const emPe = mapaDaJornada(pack, { vencidos: [] }, { emPe: true });
    igual(`${deitado.voltas}|${emPe.voltas}|${emPe.emPe}`, `${deitado.nos.length >= DUAS_VOLTAS_A_PARTIR_DE ? 2 : 1}|1|true`, 'as voltas');
    const xs = emPe.nos.map(n => n.x);
    ok(xs.every((x, i) => i === 0 || x > xs[i - 1]), 'a estrada em pé volta para trás — não é uma estrada só');
    igual(`${posicaoNoCaminho(0, 18, 1).x}|${posicaoNoCaminho(17, 18, 1).x}`, '8|92', 'a estrada em pé vai de ponta a ponta');
    ok(posicaoNoCaminho(12, 18, 2).y !== posicaoNoCaminho(12, 18, 1).y || posicaoNoCaminho(12, 18, 2).x !== posicaoNoCaminho(12, 18, 1).x, 'uma volta e duas voltas dão a mesma posição');
  });

  s.teste('10.22c · o nome só no atual, no escolhido e no vencido; o trancado na cor da região', () => {
    const m = mapaDaJornada(pack, { vencidos: ['rota1'] });
    const [venc, atual, tranc] = [m.nos.find(n => n.estado === 'vencido'), m.nos.find(n => n.estado === 'atual'), m.nos.find(n => n.estado === 'trancado')];
    igual([mostraNome(venc), mostraNome(atual), mostraNome(tranc), mostraNome(tranc, tranc.id), mostraNome(venc, venc.id)].join(), 'false,true,false,true,true', 'o nome no mapa');
    /* O atual e o FIM (ST-10.22c2) — e mais nenhum: o vencido fica com a faixa. */
    igual(m.nos.filter(n => mostraNome(n)).map(n => n.id).join(), `${atual.id},${m.nos.find(n => n.final).id}`, 'com um vencido, nomes demais no mapa');
    ok(m.nos.every(n => !n.regiao || COR_DA_REGIAO[n.regiao]), 'uma região do pack sem cor');
    igual(`${corDoNo({ regiao: 'vulcao' })}|${corDoNo({ regiao: 'nada' })}`, '200,80,50|140,140,140', 'a cor do nó');
    ok(new Set(m.nos.map(corDoNo)).size >= 5, 'o trancado continua de uma cor só');
    ok(/jnSemNome/.test(semComentario(fonte('../app/modules/jornada-tela.mjs'))) && /\.jnNo\.jnSemNome span\{display:none\}/.test(fonte('../app/index.html')), 'a tela não esconde o nome');
    ok(/rgb\(var\(--rg/.test(fonte('../app/index.html')), 'o trancado não usa a cor da região');    /* ST-10.22c2: o ginásio futuro leva a silhueta da insígnia, e o fim tem o
       rótulo dourado — o crítico cego leu os dois como os piores do mapa. */
    const css = fonte('../app/index.html'), tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/n\.tipo === 'ginasio' && arteDaInsignia\(n\.insignia\) \? ` class="jnSilhueta" style="--ins:url\(\$\{arteDaInsignia\(n\.insignia\)\}/.test(tela) && /i\.jnSilhueta::after\{[^}]*var\(--ins\)[^}]*grayscale\(1\)/.test(css), 'o ginásio futuro sem a silhueta da insígnia');
    ok(/\.jnFinal \.jnNo\.jn-trancado span\{opacity:1;color:#ffe9a8/.test(css), 'o rótulo do fim herdou o apagado do trancado');
    ok(/n\.final \? ' jnFinal'/.test(tela) && /\.jnFinal \.jnMarco\{[^}]*scale\(2\.1\)/.test(css), 'o castelo do fim não está no nó do Campeão');
  });

  s.teste('10.22c3 · a estrada não atravessa o lago; a Elite mostra o que revisa; o líder vencido sai de cena', () => {
    /* A caixa em pixels contra a estrada em pixels: a mesma conta que a tela faz. */
    const estrada = [{ x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 300 }];
    const caixa = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h });
    ok(cruzaOCaminho(caixa(80, 80, 40, 40), estrada), 'o lago em cima da estrada não cruza');
    ok(cruzaOCaminho(caixa(180, 180, 40, 40), estrada), 'o lago no trecho vertical não cruza');
    ok(!cruzaOCaminho(caixa(80, 20, 40, 40), estrada), 'o lago longe cruza');
    /* A meia largura da estrada conta: o lago a 3 px da linha está na beira. */
    ok(cruzaOCaminho(caixa(80, 103, 40, 40), estrada), 'a beira da estrada não conta');
    ok(!cruzaOCaminho(caixa(80, 112, 40, 40), estrada), 'folga demais: o lago ao lado vira ponte');
    ok(!cruzaOCaminho(caixa(80, 80, 40, 40), [{ x: 0, y: 100 }]), 'um ponto só é estrada');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs')), css = fonte('../app/index.html');
    ok(/cruzaOCaminho\(r, estrada\)/.test(tela), 'a tela não afasta a cena da estrada');
    /* A Elite trancada com a insígnia do ginásio que ela revisa, apagada. */
    const m = mapaDaJornada(pack, { vencidos: [] });
    ok(m.nos.filter(n => n.tipo === 'liga' && !n.final).every(n => n.revisa?.insignia), 'um membro da Elite sem a insígnia que revisa');
    ok(/n\.tipo === 'liga' && n\.revisa\?\.insignia/.test(tela) && /\.jnNo\.jn-liga i\.jnSilhueta::after\{[^}]*rotate\(-45deg\)/.test(css), 'a Elite trancada sem a insígnia que revisa');
    ok(/\.jnPos\.jn-vencido \.jnOw\{display:none\}/.test(css), 'o líder vencido continua de pé como antes');
    ok(/\.jnPos\.jn-trancado \.jnOw\{filter:brightness\(0\)/.test(css), 'o rival do nó futuro aparece colorido — entrega quem espera ali');
  });

  return s;
}
