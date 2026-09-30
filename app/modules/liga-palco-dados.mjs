/* A PARTIDA DA LIGA NO PALCO DA ARENA — a coreografia (ST-11.6d) — camada 0.
 *
 * Pedido do dono, 30/09/2026: "a liga de times deveria ter a imagem e estilo
 * de jogo da arena dos 6 vs 6 lutando na arena, estilo o da aposta".
 *
 * Puro: entra a linha do tempo do LOG (`linhaDoLog`, ST-11.6b) e sai o palco
 * em números — onde cada um dos doze fica, quando cada golpe começa, acerta e
 * termina, e a POSE de cada lutador em qualquer instante (onde está, que
 * animação, para onde olha, quanta vida tem, se caiu). A tela só pinta o que
 * `poseNoInstante` devolve: pular, voltar ou parar no meio dão o MESMO quadro,
 * porque o quadro é uma função do tempo e não um estado acumulado.
 *
 * Um caminho só: o dano, a vida e quem cai são os do log (a vida do fim é a do
 * `replayDoLog`, cobrada no teste). O palco escolhe só o COMO — o avanço de
 * quem bate de perto, o golpe que sai de longe, o tremor de quem leva.
 *
 * O espaço é o da Arena: 300 × 400 unidades, a ilha centrada em (150, 200).
 * Os números são repetidos aqui porque o `render.mjs` pega o canvas no import
 * e não roda em Node; o teste confere que continuam os mesmos de lá.
 */
import { MOVE_FX } from './efeitos-dados.mjs';
import { PMD } from './sprites-dados.mjs';

export const PALCO = Object.freeze({ W: 300, H: 400, CX: 150, CY: 200, spriteMaxH: 76 });

/* Quanto dura cada golpe no palco. O impacto no meio do passo deixa tempo para
   a carga e o projétil CHEGAREM (a Arena: carga 380 ms + viagem até 500 ms), e
   o resto do passo é a volta de quem avançou. */
/* OS GOLPES SE SOBREPÕEM: um começa a cada `intervaloMs`, e cada um dura
   `passoMs` — dois ou três no ar ao mesmo tempo, como na Arena (Q7 da ST-11.6d:
   "um balão por quadro" era o que fazia o palco parecer depuração). A ORDEM
   continua a do log, e a vida muda no impacto de cada um, na ordem dele. */
export const TEMPO = Object.freeze({ intervaloMs: 620, passoMs: 1100, impactoMs: 640, voltaMs: 360, levaMs: 320, ataqueAntesMs: 260, ataqueDepoisMs: 160 });

/* A FORMAÇÃO: dois times de seis, frente a frente, em duas fileiras de três.
   O jogador embaixo (de costas para quem olha, como o treinador nos jogos da
   franquia) e o rival em cima; a fileira da frente mais perto do centro. */
const FILEIRAS = Object.freeze({ A: [258, 318], B: [142, 82] });
const COLUNAS = Object.freeze([82, 150, 218]);
export function formacao(lado, i) {
  const fileira = FILEIRAS[lado] ?? FILEIRAS.A, n = Math.max(0, i | 0);
  /* A fileira de trás fica meio passo para o lado: ninguém se esconde atrás de ninguém. */
  const atras = n >= 3;
  return { x: COLUNAS[n % 3] + (atras ? (lado === 'A' ? 18 : -18) : 0), y: fileira[atras ? 1 : 0] };
}

/* O golpe que não tem carga, projétil nem jato é de CONTATO: quem bate avança
   até o alvo e volta — a mesma leitura do `encenacao` do Avanço. */
export const deContato = golpe => { const efeito = MOVE_FX[golpe]; return !efeito || !(efeito.cast || efeito.proj || efeito.beam); };

/* A direção da folha (.Dir8): 0 de frente para baixo, girando baixo → direita
   → cima → esquerda — a mesma conta do `dirOf` da Arena. */
export function direcao8(dx, dy) {
  const graus = Math.atan2(dy, dx) * 180 / Math.PI;
  return ((Math.round((90 - graus) / 45) % 8) + 8) % 8;
}

/* O tamanho de um lutador no palco: a folha de ANDAR não passa de 76 de altura,
   como na Arena. Sem folha animada (cinco espécies), o sprite parado. */
export function escalaDe(dex) {
  const m = PMD[dex];
  return m ? Math.min(1, PALCO.spriteMaxH / m.w[1]) : null;
}

export function coreografiaDoPalco(linha, t = TEMPO) {
  const lutadores = ['A', 'B'].flatMap(lado => (linha?.lados?.[lado] ?? []).map((f, i) => ({
    slot: f.slot, lado, dex: f.dex, nivel: f.nivel, nome: f.nome, maxHp: f.maxHp, ...formacao(lado, i), animado: !!PMD[f.dex] })));
  const atos = (linha?.passos ?? []).map((p, n) => {
    const inicio = n * t.intervaloMs;
    return { n, de: p.de, para: p.para, golpe: p.golpe, contato: deContato(p.golpe), inicio, impacto: inicio + t.impactoMs,
             fim: inicio + t.passoMs, dano: p.dano, vidaDoAlvo: p.vidaDoAlvo, fracaoDoAlvo: p.fracaoDoAlvo, caiu: !!p.caiu,
             errou: !!p.errou, eff: p.eff, crit: !!p.crit, texto: p.texto };
  });
  return { lutadores, atos, duracao: (atos.at(-1)?.fim ?? 0) + 400, vencedor: linha?.vencedor ?? 'empate' };
}

const suave = k => k * k * (3 - 2 * k);
const olharPara = (a, b) => direcao8(b.x - a.x, b.y - a.y);

/* A POSE de um lutador no instante `ms`. */
export function poseNoInstante(palco, slot, ms, t = TEMPO) {
  const eu = palco.lutadores.find(l => l.slot === slot);
  if (!eu) return null;
  const porSlot = s => palco.lutadores.find(l => l.slot === s);
  let vida = eu.maxHp, caiuEm = null;
  for (const a of palco.atos) {
    if (a.para !== slot || a.impacto > ms) continue;
    vida = a.vidaDoAlvo;
    if (a.caiu && caiuEm == null) caiuEm = a.impacto;
  }
  /* De frente para o lado de lá, parado. */
  const pose = { slot, x: eu.x, y: eu.y, anim: 'i', dir: eu.lado === 'A' ? 4 : 0, vida, fracao: vida / (eu.maxHp || 1), caido: caiuEm != null };
  if (pose.caido) return { ...pose, anim: 'i' };
  const ato = palco.atos.find(a => a.inicio <= ms && ms < a.fim && (a.de === slot || a.para === slot));
  /* PARADO NÃO É ESTÁTUA: fora da vez, um balanço leve e próprio de cada um
     (a fase sai do lugar dele na lista) — a Arena nunca tem ninguém congelado. */
  if (!ato) {
    const k = palco.lutadores.indexOf(eu);
    return { ...pose, x: eu.x + Math.sin(ms / 900 + k * 1.7) * 2.5, y: eu.y + Math.cos(ms / 1150 + k * 2.3) * 1.5 };
  }
  if (ato.de === slot) {
    const alvo = porSlot(ato.para);
    const dir = alvo ? olharPara(eu, alvo) : pose.dir;
    let x = eu.x, y = eu.y;
    if (alvo) {
      /* De perto: avança até quase encostar e volta. De longe: um passo à frente. */
      const alcance = ato.contato ? 0.78 : 0.12;
      const ida = suave(Math.min(1, Math.max(0, (ms - ato.inicio) / (ato.impacto - ato.inicio))));
      const volta = ms > ato.impacto ? suave(Math.min(1, (ms - ato.impacto) / t.voltaMs)) : 0;
      const k = alcance * ida * (1 - volta);
      x = eu.x + (alvo.x - eu.x) * k; y = eu.y + (alvo.y - eu.y) * k;
    }
    const atacando = ms >= ato.impacto - t.ataqueAntesMs && ms <= ato.impacto + t.ataqueDepoisMs;
    const andando = ato.contato && !atacando && ms < ato.impacto + t.voltaMs;
    return { ...pose, x, y, dir, anim: atacando ? 'a' : andando ? 'w' : 'i' };
  }
  /* O alvo: leva o golpe no impacto, e treme para trás um instante. */
  if (ms >= ato.impacto && ms < ato.impacto + t.levaMs && !ato.errou && ato.dano > 0) {
    const de = porSlot(ato.de), k = 1 - (ms - ato.impacto) / t.levaMs;
    const d = de ? Math.hypot(eu.x - de.x, eu.y - de.y) || 1 : 1;
    return { ...pose, anim: 'h', x: eu.x + (de ? (eu.x - de.x) / d : 0) * 5 * k, y: eu.y + (de ? (eu.y - de.y) / d : 0) * 5 * k,
             dir: de ? olharPara(eu, de) : pose.dir };
  }
  return pose;
}

/* O que acontece ENTRE dois instantes: os impactos que a tela precisa estourar
   (número de dano, efeito no alvo, queda). Um golpe só entra uma vez: o
   intervalo é meio aberto, (de, ate]. */
export const impactosEntre = (palco, de, ate) => palco.atos.filter(a => a.impacto > de && a.impacto <= ate);

/* O texto do número que sobe, com a classe da Arena. */
export function numeroDoGolpe(a) {
  if (a.errou) return { texto: 'errou', classe: 'miss' };
  if (a.eff === 0) return { texto: 'imune', classe: 'miss' };
  return { texto: `-${a.dano}`, classe: a.crit ? 'crit' : a.eff > 1 ? 'super' : a.eff < 1 ? 'weak' : '' };
}

/* A frase do rodapé no instante: a do último golpe que já acertou. */
export function fraseNoInstante(palco, ms) {
  let ultimo = null;
  for (const a of palco.atos) if (a.impacto <= ms) ultimo = a;
  return ultimo?.texto ?? 'a luta vai começar…';
}

/* O BALÃO com o nome do golpe, sobre quem ataca — o da Arena: do começo do
   golpe até pouco depois do acerto. */
export function balaoNoInstante(palco, slot, ms, t = TEMPO) {
  const a = palco.atos.find(x => x.de === slot && x.inicio <= ms && ms < x.impacto + t.levaMs);
  return a ? a.golpe : null;
}

/* O MINI LOG da Arena: as últimas linhas, a mais nova embaixo, com a marca do
   crítico e da queda. */
export function logNoInstante(palco, ms, n = 3) {
  return palco.atos.filter(a => a.impacto <= ms).slice(-n).map(a => ({ texto: a.texto, classe: a.caiu ? 'l-ko' : a.crit ? 'l-crit' : '' }));
}

/* QUANTOS DE PÉ de cada lado, no instante: o placar vivo da partida. */
export function vivosNoInstante(palco, ms) {
  const caidos = new Set(palco.atos.filter(a => a.caiu && a.impacto <= ms).map(a => a.para));
  const conta = lado => palco.lutadores.filter(l => l.lado === lado && !caidos.has(l.slot)).length;
  return { A: conta('A'), B: conta('B') };
}
