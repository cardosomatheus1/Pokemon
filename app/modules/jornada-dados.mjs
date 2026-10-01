/* O MAPA DE KANTO — os dados da tela (ST-10.12 · F4.5 · Spec §8.7, §12 tela 22).
 *
 * Camada 0. Cada nó da jornada com o ESTADO que o motor diz (`noAtual`: só o
 * primeiro não vencido está aberto) e a POSIÇÃO no caminho que a tela desenha.
 * A tela não decide o que está aberto — decide só a cor.
 *
 *   vencido    já vencido (pode lutar de novo: a insígnia não repete)
 *   atual      o próximo a vencer — o único que pulsa
 *   trancado   um anterior ainda não foi vencido
 *
 * ── O CAMINHO ─────────────────────────────────────────────────────────────
 *
 * Um zigue-zague em S, da esquerda para a direita, em porcentagem da caixa: a
 * mesma forma em qualquer largura larga. Posição é dado, e não CSS solto, para
 * o teste poder cobrar que nenhum nó cai fora da caixa.
 *
 * Em tela ESTREITA o caminho é o MESMO transposto (x ↔ y): desce em vez de
 * andar para o lado. Medido na primeira captura: deitado em 420 px, o nome
 * "Caminho da Pedra" saía da caixa — o nome é mais largo que o passo entre
 * nós. Em pé, o passo é a altura, e a altura cresce com o número de nós.
 *
 * ── O MUNDO EM VOLTA ──────────────────────────────────────────────────────
 *
 * O caminho é o mundo GBA, e um campo liso com uma linha é protótipo. Três
 * coisas o tornam lugar: o TREINADOR de pé no nó (a folha de andar do pack,
 * quadro de frente — o mesmo formato da gente dos biomas), a PAREDE de
 * árvores nas bordas, como as rotas da era, e a CENA do nó (árvores na
 * floresta, rochas no caminho da pedra) nas diagonais de cima, onde nem o
 * caminho deitado nem o em pé passam, e longe do nome, que fica embaixo.
 */
import { especieDe } from '../../engine/especie.mjs';
import { nosDa, noAtual } from '../../engine/jornada.mjs';
import { montarLutador, danoEsperado, simular } from '../../engine/treino-batalha.mjs';
import { efeito } from '../../engine/primitivas.mjs';
import { recompensaPve } from '../../engine/recompensa-pve.mjs';

export const INSIGNIAS_DO_CAMINHO = 8;
export const ARTE_DO_MAPA = '../assets/raw_githubusercontent_com/pret/pokeemerald/alfa';
/* A arte da insígnia é NOSSA (`arte/insignias/<id>.svg`, ST-10.13 · L-202). */
export const arteDaInsignia = id => (id ? `../arte/insignias/${id}.svg` : null);

/* A partir de 7 nós os vizinhos ALTERNAM acima e abaixo da curva: com 8 nós
   em 1100 px o passo é ~125 px e o nome de dois andares do ginásio tem ~120 —
   três pares se cobriam (medido na captura da ST-10.16). Com o zigue-zague, o
   nome de um vizinho nunca está na mesma altura que o do outro. */
export const ZIGUE_A_PARTIR_DE = 7;
/* L-203 (ST-10.19c): a partir de 15 nós o caminho faz DUAS VOLTAS — a
   primeira para a direita, em cima, e a segunda de volta, embaixo, como o
   tabuleiro de um jogo de trilha. Numa volta só, com os 18 da Liga, o passo em
   1100 px caía a ~50 px, menos que meio nome. Em duas, é o dobro, e o
   zigue-zague de ±7,5 põe os vizinhos em alturas diferentes. */
export const DUAS_VOLTAS_A_PARTIR_DE = 15;
export const voltasDoCaminho = n => (n >= DUAS_VOLTAS_A_PARTIR_DE ? 2 : 1);
/* `voltas` explícito (ST-10.22c): no celular o caminho é UMA estrada de cima a
   baixo — com duas voltas, em pé, ele virava duas colunas que o olho não segue
   (Q7 da ST-10.22b). O deitado continua escolhendo pelo tamanho. */
export function posicaoNoCaminho(i, n, voltas = voltasDoCaminho(n)) {
  if (voltas === 2) {
    const h = Math.ceil(n / 2), volta = i < h ? 0 : 1, k = volta ? h - 1 - (i - h) : i;
    const x = 8 + (84 * k) / (h - 1), y = (volta ? 72 : 30) + (k % 2 ? 7.5 : -7.5);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }
  const x = n <= 1 ? 50 : 8 + (84 * i) / (n - 1);
  const zigue = n >= ZIGUE_A_PARTIR_DE ? (i % 2 ? 13 : -13) : 0;
  const y = 52 + (zigue ? 5 : 24) * Math.sin((i / Math.max(1, n - 1)) * Math.PI * 1.5) + zigue;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export function mapaDaJornada(pack, prog, { emPe = false } = {}) {
  const nos = nosDa(pack), atual = noAtual(pack, prog);
  const voltas = emPe ? 1 : voltasDoCaminho(nos.length);
  const vencidos = new Set(prog?.vencidos ?? []);
  const lista = nos.map((no, i) => ({
    id: no.id, nome: no.nome ?? no.id, rival: no.rival, insignia: no.insignia ?? null,
    tipo: no.chefe ? 'chefe' : no.insignia ? 'ginasio' : no.liga ? 'liga' : 'rota', cena: no.cena ?? null, regiao: no.regiao ?? null, marco: no.marco ?? null, licao: no.licao ?? null,
    /* ST-10.19c: a Liga não ensina — REVISA um ginásio, e o mapa desenha a
       insígnia dele ao lado da lição. `selo` é o nome do degrau, do pack. */
    selo: no.selo ?? null, final: !!no.final, rio: !!no.rio,
    /* ST-10.19d: o nome CURTO, para a faixa do celular — "Ginásio de …" cortado
       perdia justamente a palavra que distingue um ginásio do outro. */
    curto: no.curto ?? no.nome ?? no.id,
    revisa: no.licao?.revisa ? (g => (g ? { id: g.id, nome: g.nome ?? g.id, insignia: g.insignia ?? null } : null))(nos.find(x => x.id === no.licao.revisa)) : null,
    /* ST-10.18: o chefe é um lendário sozinho — o mapa desenha ELE, e não um
       treinador; e o que ele paga é a essência dele. */
    lendario: no.chefe ? (pack.treinadores ?? []).find(t => t.id === no.rival)?.time?.[0]?.dex ?? null : null,
    essencia: no.chefe ? (pack.treinadores ?? []).find(t => t.id === no.rival)?.essencia ?? null : null,
    ow: (pack.treinadores ?? []).find(t => t.id === no.rival)?.ow ?? null,
    lider: no.insignia || no.liga ? (pack.treinadores ?? []).find(t => t.id === no.rival)?.nome ?? null : null,
    estado: vencidos.has(no.id) ? 'vencido' : atual?.id === no.id ? 'atual' : 'trancado',
    ...posicaoNoCaminho(i, nos.length, voltas),
  }));
  const ginasios = nos.filter(n => n.insignia);
  return {
    nos: lista,
    atual: atual?.id ?? null,
    feitos: lista.filter(n => n.estado === 'vencido').length,
    total: lista.length,
    voltas, emPe,
    insignias: Array.from({ length: Math.max(INSIGNIAS_DO_CAMINHO, ginasios.length) }, (_, i) => {
      const g = ginasios[i];
      return g ? { id: g.insignia, nome: g.insigniaNome ?? `insígnia de ${g.nome ?? g.id}`, onde: g.nome ?? g.id, arte: arteDaInsignia(g.insignia),
                   ganha: (prog?.insignias ?? []).includes(g.insignia) }
               : { id: null, nome: null, onde: null, arte: null, ganha: false };
    }),
  };
}

/* A frase do nó escolhido, para o painel de baixo: o que fazer com ele, e
   contra quem (o crítico cego da ST-10.12 leu "o próximo passo do caminho"
   como texto de enchimento — e era). */
export function fraseDoNo(no, nome = 'o rival') {
  const rival = nome.replace(/^(O|A) /, m => m.toLowerCase());   /* "Vença o Rival", e não "Vença O Rival" */
  if (no.estado === 'trancado') return 'Trancado: vença o caminho antes dele.';
  if (no.estado === 'vencido' && no.tipo === 'chefe') return `Vencido — a essência dele sai uma vez por dia; lutar de novo amanhã rende outra.`;
  if (no.estado === 'vencido') return no.tipo === 'ginasio' ? 'Vencido — a insígnia já é sua. Lutar de novo não a dá de novo.' : 'Vencido. Dá para lutar de novo, para treinar.';
  if (no.tipo === 'chefe') return `O chefe: vença ${rival} para ganhar a essência dele — uma por dia. Ele nunca vira criatura sua.`;
  /* ST-10.19c: a Liga não dá insígnia — dá o caminho até o Campeão. */
  if (no.tipo === 'liga' && no.final) return `O Campeão: vença ${rival} e a jornada está completa.`;
  if (no.tipo === 'liga') return `A Liga: vença ${rival} para seguir até o Campeão. Aqui não há insígnia — há a prova do que os ginásios ensinaram.`;
  return no.tipo === 'ginasio' ? `Vença ${rival} para ganhar a insígnia.` : `Vença ${rival} para abrir o caminho.`;
}

/* A FAIXA DA CHANCE, para a cor do número e o aviso ao lado do "lutar": 7% e
   99% na mesma cor não avisam nada (Q7 da ST-10.12). O botão continua lá — a
   decisão é do jogador —, mas abaixo de 30% ele lê o risco antes. */
/* ST-10.21: o AVISO diz o tamanho do risco — a 2%, "arriscado" era pouco (Q7). */
export const avisoDoRisco = p => (!Number.isFinite(p) || p >= 0.3 ? null : p < 0.1 ? 'derrota quase certa' : 'arriscado');
export const faixaDaChance = p => (p < 0.3 ? 'baixa' : p < 0.7 ? 'media' : 'alta');

/* O CAMINHO ANDADO: do começo até o nó atual, o resto é por andar — como o
   mapa-múndi que só pinta a trilha até onde o jogador chegou. Jornada acabada:
   tudo andado. Os dois pedaços dividem o nó atual. */
export function caminhoAndado(mapa) {
  const i = mapa.atual ? mapa.nos.findIndex(n => n.id === mapa.atual) : mapa.nos.length - 1;
  return { andado: mapa.nos.slice(0, i + 1), resto: mapa.atual ? mapa.nos.slice(i) : [] };
}

/* ONDE VOCÊ ESTÁ: na trilha, a 60% do nó vencido para o próximo — de frente
   para o desafio, e não em cima do marcador (que o treinador ocupa). Com 75%,
   no caminho em pé, você ficava em cima do treinador do nó (medido em 420).
   Antes do primeiro, um passo antes dele. Com tudo vencido, NO último, com
   `fim` — a tela o põe AO LADO do marcador. "Um passo depois" era para baixo
   no caminho em pé, e em 420 px você caía em cima do nome e do treinador
   (achado na captura da ST-10.13). */
export function ondeEstou(mapa) {
  const nos = mapa.nos;
  if (!nos.length) return null;
  const r = v => Math.round(v * 10) / 10;
  const i = mapa.atual ? nos.findIndex(n => n.id === mapa.atual) : -1;
  /* `ao`: o nó de referência. No caminho EM PÉ a tela usa ele, e não a trilha:
     com 6 nós, a 60% da trilha você caía no nome de dois andares do ginásio
     de cima (captura da ST-10.14, 420 px). Ao lado do nó não há nome nem
     treinador — o nome fica embaixo e o treinador em cima. */
  if (i < 0) return { x: nos.at(-1).x, y: nos.at(-1).y, fim: true, ao: { x: nos.at(-1).x, y: nos.at(-1).y } };
  if (i === 0) return { x: r(Math.max(3, nos[0].x - 4)), y: nos[0].y, ao: { x: nos[0].x, y: nos[0].y } };
  const a = nos[i - 1], b = nos[i];
  /* ST-10.19c: na segunda volta o caminho vem da DIREITA — você fica do lado
     de onde chegou, e não em cima do nome do próximo (medido em 1100). */
  const lado = voltasDoCaminho(nos.length) === 2 && i >= Math.ceil(nos.length / 2) ? 'direita' : 'esquerda';
  return { x: r(a.x + (b.x - a.x) * 0.6), y: r(a.y + (b.y - a.y) * 0.6), ao: { x: b.x, y: b.y }, lado };
}

/* ── ST-10.19d · O SENTIDO E A FAIXA (Q7 da Liga) ──────────────────────────
   Com tudo vencido, a segunda volta não dizia que VOLTA: uma seta no meio de
   cada trecho, com o sentido em que a trilha anda (a tela gira pelo `dir`, e
   no celular, que transpõe o mapa, gira de novo). E no celular o mapa fica
   abaixo do painel: a faixa do anterior, do escolhido e do próximo vai antes. */
export function setasDoCaminho(mapa) {
  const nos = mapa?.nos ?? [], r = v => Math.round(v * 100) / 100;
  /* ST-10.21: e se o trecho já foi ANDADO — a seta do por andar é a que
     precisa aparecer sobre a trilha tracejada (Q7 da 10.19d). */
  const ate = mapa?.atual ? nos.findIndex(n => n.id === mapa.atual) : nos.length - 1;
  return nos.slice(1).map((b, i) => {
    const a = nos[i], dx = b.x - a.x;
    /* E OUTROS PONTOS do mesmo trecho, para a tela tentar quando o meio cai
       sobre um nome — esconder a seta apagou a fileira inteira em 1100 (Q7). */
    const em = t => ({ x: r(a.x + (b.x - a.x) * t), y: r(a.y + (b.y - a.y) * t) });
    return { ...em(0.5), dir: Math.abs(dx) < 1 ? 'baixo' : dx > 0 ? 'dir' : 'esq', andado: i + 1 <= ate,
             outros: [0.38, 0.62, 0.3, 0.7].map(em) };
  });
}
export function faixaDoCaminho(mapa, id) {
  const nos = mapa?.nos ?? [];
  const i = Math.max(0, nos.findIndex(n => n.id === (id ?? mapa?.atual ?? nos.at(-1)?.id)));
  return { antes: nos[i - 1] ?? null, este: nos[i] ?? null, depois: nos[i + 1] ?? null };
}

/* A PAREDE DE ÁRVORES das bordas, em porcentagem: uma fileira em cima e uma
   embaixo (à esquerda e à direita, no caminho em pé). O desvio de cada árvore
   é fixo pelo índice — a parede não dança a cada repintura. */
export function bordaDoMapa(passo = 4.2) {
  const lista = [];
  for (let i = 0, x = 1; x <= 99; i++, x = 1 + i * passo) {
    const d = ((i * 37) % 11) / 10;
    /* ST-10.22b: a parede MISTURA a árvore do `pret` com a redonda e o
       pinheiro nossos, e varia o tamanho — a mesma árvore em fileira era o
       "carimbo" que o crítico cego apontou nas bordas. Fixo pelo índice. */
    const tipo = k => [null, 'pinheiro', null, 'arvore', 'pinheiro', null, 'arvore'][(i * 3 + k) % 7];
    const escala = k => [0, 2, 0, 3, 0][(i + k * 2) % 5];
    const peca = (px, py, k) => ({ x: px, y: py, ...(tipo(k) ? { arte: tipo(k) } : {}), ...(escala(k) ? { escala: escala(k) } : {}) });
    lista.push(peca(Math.round((x + d) * 10) / 10, 3 + (i % 2) * 1.5, 0), peca(Math.round((x + passo / 2 - d) * 10) / 10, 97 - (i % 2) * 1.5, 1));
    /* A fileira de TRÁS, meio cortada pela borda: a parede vira mata, e não uma
       fileira contada (Q7, 2ª rodada: "uma fila só, espaçada por igual"). */
    lista.push({ x: Math.min(99.5, Math.round((x + passo / 2 + d) * 10) / 10), y: 0.4, fundo: true, ...(tipo(2) ? { arte: tipo(2) } : {}) },
               { x: Math.round((x + d / 2) * 10) / 10, y: 99.6, fundo: true, ...(tipo(3) ? { arte: tipo(3) } : {}) });
  }
  return lista;
}

/* A CENA DE UM NÓ, em pixels a partir dele: nas diagonais de CIMA (o caminho
   deitado passa dos lados, o em pé passa por cima e por baixo, e o nome fica
   embaixo). O quadro é o da folha de 16×16 do `pret` — o zero, inteiro. */
const CENAS = {
  arvores: { folha: 'cuttable_tree', pos: [[-44, -30], [44, -34], [-70, -52], [72, -56], [-40, -70], [40, -74]] },
  rochas:  { folha: 'breakable_rock', pos: [[-42, -26], [46, -30], [-64, -44], [66, -48]] },
  /* A água não tem folha no `pret` que já usamos: são dois lagos desenhados
     em CSS (`forma`), nas mesmas diagonais de cima (ST-10.14). */
  agua:    { forma: 'lago', pos: [[-54, -36], [56, -42]] },
};
/* ST-10.22b · L-209: a arte NOSSA (`arte/mapa/`, de `tools/pixel-arte.mjs`) e
   as três poças desenhadas em CSS — água, lava e brejo, cada uma com a borda
   do seu chão. */
Object.assign(CENAS, {
  flores:  { arte: 'flores',        pos: [[-46, -30], [48, -34], [-38, -62], [40, -66]] },
  casas:   { arte: 'casa_vermelha', alterna: 'casa_azul', pos: [[-44, -30], [44, -34], [-70, -52], [72, -56]] },
  braseiros: { arte: 'braseiro',    pos: [[-44, -30], [44, -34]], um: true },
  junco:   { arte: 'junco',         pos: [[-44, -30], [44, -34]] },
  torres:  { arte: 'torre',         pos: [[-48, -34], [50, -38]] },
  pilares: { arte: 'pilar',         pos: [[-44, -30], [44, -34]] },
  lava:    { forma: 'lava',         pos: [[-54, -36], [56, -42]] },
  brejo:   { forma: 'brejo',        pos: [[-54, -36], [56, -42]] },
});
export const ARTE_NOSSA_DO_MAPA = '../arte/mapa';
/* Numa LISTA, cada tipo ganha um ANEL próprio — o de dentro, o de cima e o de
   fora —, para a casa não cair em cima do lago. Todos nas diagonais de CIMA,
   como sempre (longe do nome, do caminho e do treinador). */
const ANEIS = [[[-50, -34], [52, -38]], [[-40, -72], [42, -76]], [[-78, -50], [80, -54]]];
/* As casas mudam de cor de CIDADE para cidade (Q7: "o mesmo par em todos os
   ginásios"), pelo nome do nó — fixo, sem sortear a cada repintura. */
const CORES_DA_CASA = ['casa_vermelha', 'casa_azul', 'casa_verde', 'casa_roxa'];
const semente = id => [...String(id ?? '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const peca = (c, dx, dy, i = 0, id = null) => (c.forma ? { forma: c.forma, dx, dy }
  : c.arte === 'casa_vermelha' ? { arte: CORES_DA_CASA[(semente(id) + i) % 4], dx, dy }
  : c.arte ? { arte: c.arte, dx, dy } : { folha: c.folha, dx, dy });
/* Um tipo `um` põe UMA peça, do lado que o nome do nó sorteia — o par
   espelhado em todo nó era o "carimbo" (Q7). E o MARCO da cidade entra no
   lugar de uma das casas, do lado oposto ao da que fica. */
export function cenaDoNo(no) {
  const lado = semente(no?.id) % 2;
  const poe = (c, pos, k) => pos.map(([dx, dy], i) => (c.um && i !== lado ? null
    : no?.marco && c.arte === 'casa_vermelha' && i === 1 - lado && !poe.marcou ? (poe.marcou = true, { marco: no.marco, dx, dy })
    : peca(c, dx, dy, i + k * 2, no?.id))).filter(Boolean);
  if (Array.isArray(no?.cena))
    return no.cena.flatMap((tipo, k) => (CENAS[tipo] && ANEIS[k] ? poe(CENAS[tipo], ANEIS[k], k) : []));
  const c = CENAS[no?.cena];
  return c ? poe(c, c.pos, 0) : [];
}

/* As regiões que o pack pode nomear num nó (ST-10.22b · L-209). O chão de
   cada uma deixou de ser mancha: é a grade de tiles de `jornada-chao.mjs`
   (ST-10.22e), que decide célula por célula. */
export const REGIOES = Object.freeze(['campo', 'floresta', 'bosque', 'pedra', 'praia', 'jardim', 'pantano', 'cidade', 'vulcao', 'usina', 'planalto']);

/* A LIÇÃO DA VELOCIDADE NA TELA (ST-10.14): o seu mais rápido contra cada
   rival, com a velocidade que o MOTOR monta (`montarLutador` — nível, oculto
   e natureza), e quantos dele o seu passa. Empate não passa: o motor sorteia. */
export function comparaVelocidade(pack, A, B) {
  const meus = (A ?? []).map((c, i) => montarLutador(pack, c, 'A', i));
  const seu = meus.length ? meus.reduce((m, f) => (f.spe > m.spe ? f : m)) : null;
  const deles = (B ?? []).map((c, i) => { const f = montarLutador(pack, c, 'B', i); return { dex: f.dex, nivel: f.nivel, spe: f.spe }; });
  const alvo = deles.length ? Math.max(...deles.map(x => x.spe)) : 0;
  /* A ALAVANCA (Q7 da ST-10.14): em que nível o seu mais rápido passa o mais
     rápido deles — o motor monta de novo, nível a nível, até 10 acima. */
  let passaNoNivel = null;
  if (seu && seu.spe <= alvo) {
    const c = A[seu.i];
    for (let n = seu.nivel + 1; n <= Math.min(100, seu.nivel + 10); n++)
      if (montarLutador(pack, { ...c, nivel: n }, 'A', 0).spe > alvo) { passaNoNivel = n; break; }
  }
  return { seu: seu && { dex: seu.dex, nivel: seu.nivel, spe: seu.spe }, deles, alvo,
           passa: seu ? deles.filter(x => seu.spe > x.spe).length : 0, falta: seu ? Math.max(0, alvo - seu.spe + 1) : 0, passaNoNivel };
}

/* A LIÇÃO DA IMUNIDADE NA TELA (ST-10.15): quem do seu time o tipo do líder
   não toca — pela MESMA tabela que a luta usa (`efeito`). */
export const imunesNoTime = (pack, A, tipo) =>
  (A ?? []).filter(c => efeito(pack.tipos.efetividade, tipo, especieDe(pack, c.dex)?.t ?? []) === 0);

/* Os tipos que um tipo de golpe NÃO toca — para o painel dizer o que levar
   ("leve um Terrestre"), e não só que falta (Q7 da ST-10.15). */
export const tiposImunes = (pack, tipo) => Object.keys(pack.tipos.efetividade[tipo] ?? {}).filter(t => pack.tipos.efetividade[tipo][t] === 0);

/* A PROVA da imunidade no fim da luta: quantos golpes do tipo cada imune
   levou, e o dano deles — contados dos EVENTOS da luta. "Não levou dano"
   afirmado, com a barra de vida do imune pela metade (o dano veio de outro
   tipo), parecia mentira ao crítico cego. */
export function provaDaImunidade(pack, A, eventos, tipo) {
  const tipoDe = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.t;
  return imunesNoTime(pack, A, tipo).map(c => {
    const slot = `A${A.indexOf(c)}`, nele = (eventos ?? []).filter(e => e.para === slot);
    const doTipo = nele.filter(e => tipoDe(e.golpe) === tipo), outros = nele.filter(e => tipoDe(e.golpe) !== tipo);
    /* O rival que escolhe pelo dano esperado nem TENTA o tipo contra o imune:
       troca para o que sobra. É a lição acontecendo, e a frase conta isso. */
    return { dex: c.dex, golpes: doTipo.length, dano: doTipo.reduce((a, e) => a + (e.dano ?? 0), 0),
             outros: [...new Set(outros.map(e => e.golpe))], danoOutros: outros.reduce((a, e) => a + (e.dano ?? 0), 0) };
  });
}

/* A LIÇÃO FÍSICO × ESPECIAL NA TELA (ST-10.16): as duas defesas de cada rival
   (como o motor as monta), o lado FRACO da maioria, e quantos dos seus golpes
   são de cada categoria. */
export function ladoFraco(pack, A, B) {
  const deles = (B ?? []).map((c, i) => { const f = montarLutador(pack, c, 'B', i); return { dex: f.dex, def: f.def, spd: f.spd }; });
  const fis = deles.filter(x => x.def < x.spd).length;
  const cat = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.cat;
  const fraco = fis * 2 >= deles.length ? 'fis' : 'esp', forte = fraco === 'fis' ? 'esp' : 'fis';
  /* POR CRIATURA, e não o time somado: com o Arcanine só de especiais e o
     Snorlax de físicos, a soma dizia "3 físicos, bate no lado fraco" em verde
     com 8% na tela (captura da ST-10.16). Quem bate MAIS pelo lado forte é
     nomeado. */
  const seus = (A ?? []).map(c => ({ dex: c.dex, fis: (c.golpes ?? []).filter(n => cat(n) === 'fis').length, esp: (c.golpes ?? []).filter(n => cat(n) === 'esp').length }));
  return { deles, fraco, seus, pelaForte: seus.filter(x => x[forte] > x[fraco]) };
}

/* O dano do SEU lado por categoria, dos eventos da luta — a prova da lição. */
export function danoPorCategoria(pack, eventos) {
  const cat = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.cat;
  const saida = { fis: { golpes: 0, dano: 0 }, esp: { golpes: 0, dano: 0 } };
  for (const e of eventos ?? []) {
    const c = cat(e.golpe);
    if (e.de?.[0] !== 'A' || !saida[c]) continue;
    saida[c].golpes++; saida[c].dano += e.dano ?? 0;
  }
  return saida;
}

/* O QUE O NÓ PAGA, antes da luta (ST-10.17): a mesma conta que a vitória vai
   fazer (`recompensaPve`), com o dia de hoje do save — a tela não promete um
   número que a luta não paga. */
export function pagamentoDoNo(no, hoje, dia) {
  if (!no || no.estado === 'trancado') return null;
  return recompensaPve({ no: { id: no.id, ginasio: no.tipo === 'ginasio', chefe: no.tipo === 'chefe', liga: no.tipo === 'liga', essencia: no.essencia }, venceu: true, primeiraVez: no.estado !== 'vencido', dia, hoje, linhas: ['?'] });
}

/* A frase do pagamento — antes (o que paga) e depois (o que pagou). */
export function fraseDoPagamento(pack, r, { depois = false } = {}) {
  if (!r) return '';
  const moeda = pack.moedaPve?.nome ?? 'moeda';
  const bolas = Object.entries(r.bolas ?? {}).map(([b, n]) => `${n} ${(pack.bolas ?? []).find(x => x.id === b)?.rotulo ?? b}`);
  const nomeDe = d => { const n = especieDe(pack, d)?.n ?? String(d); return (pack.nomeExibido ?? (x => x[0].toUpperCase() + x.slice(1)))(n); };
  const essencias = Object.entries(r.essencias ?? {}).map(([d, n]) => `${n} essência de ${nomeDe(d)}`);
  if (r.motivo === 'derrota') return depois ? 'A derrota não tira nada.' : '';
  if (r.motivo === 'teto') return depois ? `O teto de hoje (${r.teto} ${moeda}) já foi: esta valeu como treino.` : `o teto de hoje (${r.teto}) já foi — a revanche vale como treino`;
  if (r.motivo === 'primeira') {
    const doce = Object.keys(r.doces).length || !depois ? [depois ? `${Object.keys(r.doces).length} doce${Object.keys(r.doces).length === 1 ? '' : 's'}` : 'um doce por criatura do time'] : [];
    /* o PC-T da jornada (ST-14.0E) só existe com conta: o servidor diz quanto pagou */
    const pct = depois && r.pct > 0 ? [`${r.pct} PC-T`] : [];
    /* ST-2.23: a luta ensina — o XP de cada um que lutou. */
    const xp = depois && r.xp > 0 ? [`+${r.xp} XP para cada um que lutou`] : [];
    const partes = [`${r.pokecoin} ${moeda}`, ...pct, ...bolas, ...(essencias.length ? essencias : doce), ...xp];
    return depois ? `Ganhou: ${partes.join(' · ')}.` : `a primeira vitória paga ${partes.join(' · ')}`;
  }
  const mais = essencias.length ? ` + ${essencias.join(' · ')}` : '';
  return depois ? `Ganhou ${r.pokecoin} ${moeda}${mais}${r.xp > 0 ? ` · +${r.xp} XP` : ''} (hoje: ${r.hoje.pago} de ${r.teto}).`
                : `a revanche paga ${r.pokecoin} ${moeda}${mais} (hoje: ${r.hoje.pago - r.pokecoin} de ${r.teto})`;
}

/* ── ST-10.19a · A LIÇÃO DA RESISTÊNCIA ────────────────────────────────────
   Quanto os tipos de golpe da líder machucam cada criatura sua (o PIOR dos
   tipos, pela tabela da luta), quais tipos resistem a todos, e a PROVA no fim:
   os golpes desses tipos no resistente, e o dano deles. */
export const resistenciaNoTime = (pack, A, tipos) => (A ?? []).map(c => ({
  dex: c.dex, mult: Math.max(...tipos.map(t => efeito(pack.tipos.efetividade, t, especieDe(pack, c.dex)?.t ?? []))) }));

export const tiposQueResistem = (pack, tipos) =>
  Object.keys(pack.tipos.efetividade).filter(d => tipos.every(t => efeito(pack.tipos.efetividade, t, [d]) <= 0.5));

/* O CHEFE NA TELA (ST-10.22a · L-209). O chefe não é ginásio e não tem lição
   MEDIDA — e por isso era o único nó sem leitura, justamente onde ela mais
   faria falta. A leitura sai do que ele É, sem inventar lição: os TIPOS dos
   golpes que ele usa (os do motor, `rival[0].golpes`), quanto eles machucam
   cada criatura sua (a regra da Erika) e quantas vezes a vida dele vale. */
const golpeDoPack = (pack, n) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n) ?? null;
export function leituraDoChefe(pack, A, rival) {
  const b = rival?.[0];
  if (!b) return null;
  const tipos = [...new Set((b.golpes ?? []).map(n => golpeDoPack(pack, n)?.t).filter(Boolean))];
  return { dex: b.dex, nivel: b.nivel, vidaX: b.vidaX ?? 1, tipos,
           machuca: tipos.length ? resistenciaNoTime(pack, A, tipos) : [], resistem: tipos.length ? tiposQueResistem(pack, tipos) : [] };
}

export function provaDaResistencia(pack, A, eventos, tipos) {
  const tipoDe = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.t;
  return resistenciaNoTime(pack, A, tipos).map((x, i) => ({ ...x, i })).filter(x => x.mult <= 0.5).map(x => {
    const nele = (eventos ?? []).filter(e => e.para === `A${x.i}` && tipos.includes(tipoDe(e.golpe)));
    return { dex: x.dex, mult: x.mult, golpes: nele.length, dano: nele.reduce((a, e) => a + (e.dano ?? 0), 0) };
  });
}

/* ── ST-10.19a · A LIÇÃO DO PRESET ─────────────────────────────────────────
   A AMEAÇA do rival: quem dele tem o maior dano esperado contra alguém do seu
   time — a mesma conta que o preset Defensivo usa para escolher o alvo. E o
   turno em que ela caiu, dos eventos da luta. */
export function ameacaDoRival(pack, A, B) {
  const chart = pack.tipos.efetividade;
  const nossos = (A ?? []).map((c, i) => montarLutador(pack, c, 'A', i)), deles = (B ?? []).map((c, i) => montarLutador(pack, c, 'B', i));
  let melhor = null, maior = -1;
  for (const D of deles) {
    const v = Math.max(0, ...nossos.map(N => Math.max(...D.golpes.map(g => danoEsperado(chart, D, N, g)))));
    if (v > maior) { maior = v; melhor = D; }
  }
  return melhor?.dex ?? null;
}
export const quandoCaiu = (eventos, slot) => (eventos ?? []).find(e => e.para === slot && e.caiu)?.turno ?? null;

/* A PROVA DO PRESET (Q7 da ST-10.19a): a MESMA luta — mesma semente, mesmos
   times — com o outro preset, e o turno em que a ameaça caiu em cada uma. O
   motor é determinístico pela semente, então a comparação é exata, e não uma
   estimativa. Mora aqui, e não na tela: a tela nunca roda luta. */
export function turnosDaAmeaca(pack, { timeA, timeB, semente, eventos, usado, certo }) {
  const ameaca = ameacaDoRival(pack, timeA, timeB), slot = `B${timeB.findIndex(c => c.dex === ameaca)}`;
  const outro = usado === certo ? 'balanced' : certo;
  return { ameaca, usado, outro, noUsado: quandoCaiu(eventos, slot),
           noOutro: quandoCaiu(simular(pack, timeA, timeB, semente, { preset: outro }).eventos, slot) };
}

/* ── ST-10.19b · A LIÇÃO DO AGRESSIVO ──────────────────────────────────────
   "Um a menos bate a menos": a prova é quantos golpes o rival ACERTOU em você
   (dano > 0), na luta que houve e na MESMA luta com o outro preset. */
export const rivaisDerrubados = eventos => new Set((eventos ?? []).filter(e => e.para?.startsWith('B') && e.caiu).map(e => e.para)).size;
export const golpesLevados = eventos => (eventos ?? []).filter(e => e.para?.startsWith('A') && e.dano > 0).length;

export function provaDoPreset(pack, { timeA, timeB, semente, eventos, usado, certo, errado = 'balanced' }) {
  /* Quem usou o certo compara com o ERRADO da lição (o Campeão: o Agressivo
     que venceu o Blaine); quem usou outro, com o certo. */
  const outro = usado === certo ? errado : certo;
  const r = simular(pack, timeA, timeB, semente, { preset: outro });
  /* ST-10.19c: e os rivais DERRUBADOS — a medida do Campeão. "Golpes levados"
     é a lição do Blaine (um a menos bate a menos); contra seis, o Equilibrado
     vence por derrubar mais, e pode até levar mais golpes numa luta longa (o
     crítico cego achou 10 × 9 contra a lição). A lição declara a sua. */
  return { usado, outro, levadosUsado: golpesLevados(eventos), levadosOutro: golpesLevados(r.eventos), venceuOutro: r.vencedor === 'A',
           derrubadosUsado: rivaisDerrubados(eventos), derrubadosOutro: rivaisDerrubados(r.eventos), rivais: timeB.length };
}

/* ── ST-10.19b · A LIÇÃO DO TIPO DUPLO ─────────────────────────────────────
   O MELHOR multiplicador de tipo de cada criatura sua (pelos golpes dela) em
   cada criatura do rival — pelos DOIS tipos de quem apanha, que é a lição:
   Lutador bate Pedra, e o Venenoso do mesmo alvo corta pela metade. */
const tipoDoGolpe = (pack, n) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.t;
export const multiplicadoresNoRival = (pack, A, B) => (A ?? []).map(c => {
  const contra = (B ?? []).map(D => ({ dex: D.dex,
    mult: Math.max(0, ...(c.golpes ?? []).map(n => efeito(pack.tipos.efetividade, tipoDoGolpe(pack, n), especieDe(pack, D.dex)?.t ?? []))) }));
  return { dex: c.dex, contra, todos: contra.length > 0 && contra.every(x => x.mult >= 2) };
});

/* Os tipos de golpe que batem ≥ 2× em TODOS do rival — a saída em tipo. */
export const tiposQueBatemEmTodos = (pack, B) =>
  Object.keys(pack.tipos.efetividade).filter(t => (B ?? []).every(D => efeito(pack.tipos.efetividade, t, especieDe(pack, D.dex)?.t ?? []) >= 2));

/* A prova no fim: por criatura sua, os golpes que ACERTARAM super-efetivos
   (e quantos de 4×) e os que o segundo tipo cortou (entre 0 e 1). */
export const provaDoDuplo = (pack, A, eventos) => (A ?? []).map((c, i) => {
  const dela = (eventos ?? []).filter(e => e.de === `A${i}` && !e.errou);
  return { dex: c.dex, fortes: dela.filter(e => e.eff >= 2).length, quadruplos: dela.filter(e => e.eff >= 4).length,
           cortados: dela.filter(e => e.eff > 0 && e.eff < 1).length };
});

/* A LEITURA da tabela, para a causa: quem bate forte em todos, o exemplo do
   CORTE (quem bate ≥ 2× num e < 1× noutro — o que a tabela sozinha não diz) e
   o pior (o menor multiplicador), que é quem a troca da caixa substitui. */
export function leituraDoDuplo(mm) {
  const corte = (mm ?? []).find(x => x.contra.some(c => c.mult >= 2) && x.contra.some(c => c.mult < 1));
  const menor = x => Math.min(...x.contra.map(c => c.mult));
  return { bons: (mm ?? []).filter(x => x.todos),
           corte: corte ? { dex: corte.dex, alto: corte.contra.find(c => c.mult >= 2), baixo: corte.contra.find(c => c.mult < 1) } : null,
           pior: [...(mm ?? [])].sort((a, b) => menor(a) - menor(b))[0] ?? null };
}

/* A ESTRADA NÃO ATRAVESSA O LAGO (ST-10.22c3; Q7 da c2: "a estrada entra
   nos lagos sem ponte", em 1920, 1440 e 1100). A caixa da peça contra a
   estrada, as duas em pixels: medir é do navegador, e a decisão de "cruza"
   mora aqui, testável sem ele. `meia` é a meia largura da estrada — o lago
   que encosta na BEIRA já está em cima dela. */
export function cruzaOCaminho(caixa, pontos, meia = 5) {
  const l = caixa.left - meia, r = caixa.right + meia, t = caixa.top - meia, b = caixa.bottom + meia;
  const dentro = (x, y) => x > l && x < r && y > t && y < b;
  for (let i = 1; i < (pontos?.length ?? 0); i++) {
    const a = pontos[i - 1], c = pontos[i], n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 3));
    for (let k = 0; k <= n; k++) if (dentro(a.x + ((c.x - a.x) * k) / n, a.y + ((c.y - a.y) * k) / n)) return true;
  }
  return false;
}

/* O NOME NO MAPA (ST-10.22c): só onde ele responde alguma coisa — o nó atual
   (para onde eu vou) e o escolhido (o que estou lendo). Os dezoito nomes fixos cobriam a arte; o trancado mostra o nome ao
   passar o dedo, e a faixa do caminho diz o próximo. E o FIM (ST-10.22c2):
   o nome dele fica sempre — o SMW nunca esconde onde fica o castelo. E o
   VENCIDO sai (ST-10.22c2, crítico cego): cinco nomes de por onde passei
   enterravam o trecho andado; quem nomeia o passado é a faixa do caminho,
   e o disco vencido já leva a insígnia ganha. */
export const mostraNome = (no, escolhido = null) => no.estado === 'atual' || no.id === escolhido || !!no.final;

/* A COR DO NÓ TRANCADO (ST-10.22c): o ponto do nível na cor da região em que
   ele fica, e não o mesmo disco cinza em todo lugar — como o mapa do SMW, onde
   o ponto amarelo e o vermelho dizem o que há ali antes de se chegar. */
export const COR_DA_REGIAO = Object.freeze({
  campo: '120,170,70', floresta: '46,120,60', bosque: '70,140,90', pedra: '150,110,70', praia: '220,190,120', jardim: '200,120,170',
  pantano: '80,110,90', cidade: '150,150,170', vulcao: '200,80,50', usina: '120,120,140', planalto: '150,120,210',
});
export const corDoNo = no => COR_DA_REGIAO[no?.regiao] ?? '140,140,140';

/* QUEM LUTA, DITO NA TELA (ST-2.16): só quando sobra alguém — o time inteiro
   lutando não precisa de frase. */
export function fraseDosLutadores(nomes, { sobram = 0, rival = 0 } = {}) {
  if (!sobram || !nomes?.length) return null;
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
  return `Lutam ${nomes.length} contra ${rival}: ${lista} — os mais fortes do seu time (${sobram} ${sobram === 1 ? 'fica' : 'ficam'} de fora).`;
}
