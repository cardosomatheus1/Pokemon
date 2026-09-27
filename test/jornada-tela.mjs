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
import { mapaDaJornada, posicaoNoCaminho, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, arteDaInsignia, comparaVelocidade, imunesNoTime, tiposImunes, provaDaImunidade, INSIGNIAS_DO_CAMINHO } from '../app/modules/jornada-dados.mjs';

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
      for (let i = 1; i < n; i++) ok(pos[i].x > pos[i - 1].x, `${n} nós: o caminho volta para trás no ${i}`);
    }
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
    ok(!ondeEstou(meio).fim && !ondeEstou(vazio).fim, 'fim antes do fim');
    igual(ondeEstou({ nos: [] }), null, 'sem nós');
  });

  s.teste('a tela: pinta o mapa, luta pela gravação e encena pelo caminho da 10.9', () => {
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/mapaDaJornada\(PACK, estado\.jornada\)/.test(tela), 'o mapa não é o da camada 0');
    ok(/lutarNaJornadaLocal\(\{ pack: PACK, id, preset: presetDoJogador\(\) \}\)/.test(tela), 'a luta não é a gravada');
    ok(!/simular\(|lutarNo\(|\.vencidos\.push|insignias\.push|salvar\(/.test(tela), 'a tela decide ou grava progresso por conta própria');
    ok(/encenar\(\{ alvo: \$\('#jnLuta'\), A: r\.timeA, B: r\.timeB, r: r\.resultado/.test(tela), 'a luta não é encenada pelo caminho da 10.9');
    ok(/lote\(PACK, A, rival, RAIZ, acum\.sims/.test(tela) && /const RAIZ = 1;/.test(tela), 'a chance do mapa não é a do Team Builder');
    ok(/disabled>\$\{no\.estado === 'trancado' \? 'trancado' : vencido \? 'revanche \(treino\)' : `lutar contra \$\{t\.nome\}`\}/.test(tela) && /if \(pronto\) \{ chanceNaTela = r; if \(b && no\.estado !== 'trancado'\) b\.disabled = false; \}/.test(tela),
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
    igual(m.nos.map(n => n.ow).join(), 'youngster,lass,camper,hiker,expert_m,swimmer_f,sailor', 'a folha de cada treinador');
    igual(m.nos.map(n => n.cena ?? '-').join(), '-,arvores,-,rochas,rochas,agua,agua', 'a cena de cada nó');
    const b = bordaDoMapa();
    ok(b.length >= 40 && b.every(p => p.x >= 0 && p.x <= 100 && (p.y <= 6 || p.y >= 94)), 'a parede não é borda');
    igual(JSON.stringify(b), JSON.stringify(bordaDoMapa()), 'a parede dança a cada repintura');
    igual(cenaDoNo({ cena: null }).length, 0, 'nó sem cena ganhou enfeite');
    /* As diagonais de CIMA: longe do nome (embaixo), do caminho deitado (dos
       lados) e do em pé (em cima e embaixo), e fora do treinador (±16 px). */
    ok(cenaDoNo({ cena: 'agua' }).every(c => c.forma === 'lago' && !c.folha), 'o lago virou folha que não existe');
    for (const c of [...cenaDoNo({ cena: 'arvores' }), ...cenaDoNo({ cena: 'rochas' }), ...cenaDoNo({ cena: 'agua' })]) {
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
    ok(/comparaVelocidade\(PACK, r\.timeA, r\.timeB\)/.test(tela) && /extraNoFim: licaoNoFim \+ extra/.test(tela), 'o fim da luta não fecha a lição da velocidade');
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
    ok(/@media \(max-width:520px\)\{[^}]*#jnMapaArea\{display:flex;flex-direction:column\}/.test(fonte('../app/index.html')) && /\.jnPainel\{order:1\}/.test(fonte('../app/index.html')),
      'no estreito o painel do nó continua abaixo de um mapa de 1.000 px');
    ok(/no\.licao\?\.mostra === 'imune'/.test(tela) && /imunesNoTime\(PACK, A, no\.licao\.tipoGolpe\)/.test(tela), 'o painel da imunidade não mostra quem é imune');
    ok(/if \(lic\?\.mostra === 'imune'\) \{/.test(tela), 'o fim da luta não fecha a lição da imunidade');
  });

  /* D-125 — o inicial sozinho perdia o primeiro nó — foi consertado na ST-10.13;
     o aceite mora em `ginasios` ("D-125 consertado"). */

  return s;
}
