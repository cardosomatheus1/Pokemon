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
import { mapaDaJornada, posicaoNoCaminho, fraseDoNo, bordaDoMapa, cenaDoNo, caminhoAndado, ondeEstou, faixaDaChance, INSIGNIAS_DO_CAMINHO } from '../app/modules/jornada-dados.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

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
    igual(m.insignias[1].nome, 'H', 'o segundo ginásio não é o segundo do estojo');
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
    ok(ondeEstou(fim).x > fim.nos[3].x && ondeEstou(fim).x <= 97, 'depois do último');
    igual(ondeEstou({ nos: [] }), null, 'sem nós');
  });

  s.teste('a tela: pinta o mapa, luta pela gravação e encena pelo caminho da 10.9', () => {
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/mapaDaJornada\(PACK, estado\.jornada\)/.test(tela), 'o mapa não é o da camada 0');
    ok(/lutarNaJornadaLocal\(\{ pack: PACK, id, preset: presetDoJogador\(\) \}\)/.test(tela), 'a luta não é a gravada');
    ok(!/simular\(|lutarNo\(|\.vencidos\.push|insignias\.push|salvar\(/.test(tela), 'a tela decide ou grava progresso por conta própria');
    ok(/encenar\(\{ alvo: \$\('#jnLuta'\), A: r\.timeA, B: r\.timeB, r: r\.resultado/.test(tela), 'a luta não é encenada pelo caminho da 10.9');
    ok(/lote\(PACK, A, rival, RAIZ, acum\.sims/.test(tela) && /const RAIZ = 1;/.test(tela), 'a chance do mapa não é a do Team Builder');
    ok(/disabled>\$\{no\.estado === 'trancado' \? 'trancado' : `lutar contra \$\{t\.nome\}`\}/.test(tela) && /if \(pronto\) \{ chanceNaTela = r; if \(b && no\.estado !== 'trancado'\) b\.disabled = false; \}/.test(tela),
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
    igual(m.nos.map(n => n.ow).join(), 'youngster,lass,camper,hiker', 'a folha de cada treinador');
    igual(m.nos.map(n => n.cena ?? '-').join(), '-,arvores,-,rochas', 'a cena de cada nó');
    const b = bordaDoMapa();
    ok(b.length >= 40 && b.every(p => p.x >= 0 && p.x <= 100 && (p.y <= 6 || p.y >= 94)), 'a parede não é borda');
    igual(JSON.stringify(b), JSON.stringify(bordaDoMapa()), 'a parede dança a cada repintura');
    igual(cenaDoNo({ cena: null }).length, 0, 'nó sem cena ganhou enfeite');
    /* As diagonais de CIMA: longe do nome (embaixo), do caminho deitado (dos
       lados) e do em pé (em cima e embaixo), e fora do treinador (±16 px). */
    for (const c of [...cenaDoNo({ cena: 'arvores' }), ...cenaDoNo({ cena: 'rochas' })]) {
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
    ok(/classList\.add\('emLuta'\)/.test(tela) && /#jnLuta \[data-pve-fechar\]'\)\) \{ \$\('#jornadaCorpo'\)\?\.classList\.remove\('emLuta'\)/.test(tela)
      && /#jornadaCorpo\.emLuta #jnPainel\{display:none\}/.test(fonte('../app/index.html')), 'o resultado e o painel do próximo nó aparecem juntos');
  });

  s.teste('D-125 (afirma o defeito): o inicial sozinho no nível 5 perde o primeiro nó', () => {
    const B = rivalDe(pack, treinador(pack, pack.jornada[0].rival));
    for (const dex of [1, 4, 7]) {
      const p = resumo(lote(pack, [{ dex, nivel: 5, golpes: padraoDoMoveset(pack, dex, 5) }], B, 1, 0, 400)).p;
      ok(p < 0.2, `D-125 CONSERTADO? o inicial ${dex} no nível 5 vence ${Math.round(p * 100)}% — mova este teste para o aceite da ST-10.13`);
    }
  });

  return s;
}
