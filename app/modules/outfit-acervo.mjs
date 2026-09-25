/* O GUARDA-ROUPA DE FARM — catálogo, posse e o que está vestido.
 *
 * ── POR QUE ISTO É UM MÓDULO, E NÃO TRÊS LINHAS NA ABA ────────────────────
 *
 * Porque a pergunta "de onde veio este outfit" vai ser feita por quatro
 * lugares diferentes, e nenhum deles é a aba:
 *
 *     a loja      precisa saber o que pode VENDER — e o que jamais pode
 *     o baú       precisa da tabela de sorteio, sem os de loja dentro
 *     a missão    precisa de um traje que nenhuma outra porta conceda
 *     o market    precisa RECUSAR o que veio da loja (regra do dono, 30/08)
 *
 * Por isso `procedencia` nasce AGORA, com todos valendo `padrao`, e não no dia
 * da separação. É uma linha hoje; depois seriam dezessete peças na tela sem
 * lugar para escrever a resposta. Ver L-070 e L-072.
 *
 * ── A LIBERAÇÃO DE HOJE É UMA CHAVE, e não a ausência de trava ────────────
 *
 * O dono está em desenvolvimento e precisa vestir tudo para ver o que fica
 * bom. `MODO_VITRINE` responde "tem" a qualquer consulta — mas o caminho de
 * posse continua existindo e sendo exercido por trás. O dia de desligar é uma
 * linha. Se em vez disso a posse nunca fosse escrita, o dia de desligar seria
 * um bloco, e ele chegaria junto com a loja.
 *
 * Camada 0: guarda dado e lê `localStorage`. Não conhece DOM, nem tela, nem a
 * aba do idle — é a mesma posição do `idle-dados.mjs`, e pelo mesmo motivo.
 */

/* AS QUATRO PORTAS. `npc` é a única com regra dura: nenhuma delas concede.
   Se o traje do adversário puder ser vestido, o mundo do idle deixa de ter
   gente própria e vira um espelho do jogador. */
/* ── A PROCEDÊNCIA SUBIU PARA O MOTOR NO 1.31 ───────────────────────────
 *
 * Ela nasceu aqui, e por um tempo o acervo de trajes foi o único lugar que
 * sabia dizer "isto se compra". Com a loja, quatro outras famílias passaram a
 * precisar da mesma resposta — e a L-148 já tinha escrito o que fazer:
 *
 *   > Uma segunda forma de dizer "isto se compra" seria a sexta ocorrência do
 *   > padrão que este projeto mais paga: duas verdades sobre a mesma coisa.
 *
 * Então ela MUDOU DE CASA em vez de ser copiada, e é reexportada daqui para
 * quem já a importava não precisar saber que ela se mudou. */
export { PROCEDENCIAS, CONCEDIVEIS } from '../../engine/vitrine.mjs';

/* Hoje ligado, por decisão do dono: "EU DEV tenho tudo liberado até pra ir
   testando e ver oque fica bom ou não". Estado temporário, não produto. */
export const MODO_VITRINE = true;

/* O CATÁLOGO.
 *
 * `folha` é o PNG de nove quadros que a esteira (`tools/outfit-folha.mjs`)
 * gravou. Enquanto uma arte não passou pela esteira ela NÃO entra aqui — meia
 * conversão na tela é pior que ausência, porque parece pronta. */
/* ── DUAS ARTES POR TRAJE, e elas fazem trabalhos diferentes ───────────────
 *
 *   retrato   a VITRINE. A arte original, em alta, parada, sem o fundo. É o
 *             que a aba mostra, porque escolher roupa é olhar a roupa.
 *   folha     o MUNDO. Nove quadros de ~25×52, onde o boneco de fato anda.
 *
 * Ideia do dono, 31/08/2026: mostrar a folha reduzida na hora de escolher era
 * gastar uma arte de 683 px para desenhar um selo de 78 px — e o ANDAR vai ser
 * igual em todos os trajes, então ver o movimento ali não informa nada. O que
 * muda de um traje para o outro é a roupa, e roupa se lê parada e em alta.
 *
 * `vistas` diz quantas vistas a arte de origem tinha. Três outfits vieram só de
 * frente: a folha deles repete a frente nos nove quadros, e no mundo eles vão
 * parecer estar sempre virados para a tela. Está registrado em L-074, e o que
 * destrava é arte, não código. */
export const ACERVO = [
  { id: 'boystandard', nome: 'Urbano', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/boystandard-retrato.png',
    folha:   '../arte/outfits/boystandard.png',
    nota: 'Jaqueta escura e boné. O primeiro traje autoral do projeto.' },

  { id: 'femurbangirl', nome: 'Urbana', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/femurbangirl-retrato.png',
    folha:   '../arte/outfits/femurbangirl.png',
    nota: 'Corta-vento azul e rosa, rabo de cavalo.' },

  { id: 'militarcamper', nome: 'Campista', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/militarcamper-retrato.png',
    folha:   '../arte/outfits/militarcamper.png',
    nota: 'Mochila de expedição e lanterna no peito.' },

  { id: 'scrapscavengergirl', nome: 'Ferro-Velha', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/scrapscavengergirl-retrato.png',
    folha:   '../arte/outfits/scrapscavengergirl.png',
    nota: 'Gorro laranja e exoesqueleto improvisado.' },

  { id: 'scrapscavengerboy', nome: 'Ferro-Velho', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/scrapscavengerboy-retrato.png',
    folha:   '../arte/outfits/scrapscavengerboy.png',
    nota: 'Sucata vestida como armadura.' },

  { id: 'youngster', nome: 'Novato', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/youngster-retrato.png',
    folha:   '../arte/outfits/youngster.png',
    nota: 'O uniforme de quem está começando.' },

  /* ── SÓ COM A FRENTE (L-074) ────────────────────────────────────────────
     A arte de origem tem uma vista só. Entram porque o retrato — que é o que a
     aba mostra — está perfeito; o que falta aparece no mundo, e é arte que
     resolve. Esconder um traje bonito por causa das costas seria pior. */
  { id: 'femgirl', nome: 'Neon', procedencia: 'padrao', vistas: 1,
    retrato: '../arte/outfits/femgirl-retrato.png',
    folha:   '../arte/outfits/femgirl.png',
    nota: 'Boné ao contrário, jaqueta ciano e roxo.' },

  { id: 'bugcatcher', nome: 'Caçador', procedencia: 'padrao', vistas: 1,
    retrato: '../arte/outfits/bugcatcher-retrato.png',
    folha:   '../arte/outfits/bugcatcher.png',
    nota: 'Colete de bolsos, óculos na testa, cabos na mão.' },

  { id: 'fisherman', nome: 'Pescador', procedencia: 'padrao', vistas: 3,
    retrato: '../arte/outfits/fisherman-retrato.png',
    folha:   '../arte/outfits/fisherman.png',
    nota: 'Para quem passa a Vigília na beira da água.' },
];

export const porId = id => ACERVO.find(o => o.id === id) ?? null;

/* ── POSSE E EQUIPADO, separados ────────────────────────────────────────────
   O desenho é o do `shiny-dados.mjs`: uma lista guarda o que foi DESBLOQUEADO,
   um campo guarda o que está VESTIDO. Vestir o que não se tem é o que a trava
   impede — e é a trava que hoje a vitrine desliga. */

const CHAVE = 'pa.outfit.v1';
const PADRAO = () => ({ posse: ACERVO.filter(o => o.procedencia === 'padrao')
                                     .map(o => o.id), vestido: ACERVO[0]?.id ?? null });

export function carregar(deposito = globalThis.localStorage) {
  try {
    const cru = deposito?.getItem(CHAVE);
    if (!cru) return PADRAO();
    const v = JSON.parse(cru);
    const posse = Array.isArray(v.posse) ? v.posse.filter(porId) : PADRAO().posse;
    /* Um outfit removido do catálogo não pode deixar o jogador pelado: cai no
       primeiro do acervo, e a aba abre normal. */
    const vestido = porId(v.vestido) ? v.vestido : (posse[0] ?? ACERVO[0]?.id ?? null);
    return { posse, vestido };
  } catch { return PADRAO(); }
}

export function gravar(estado, deposito = globalThis.localStorage) {
  try { deposito?.setItem(CHAVE, JSON.stringify(estado)); } catch { /* modo privado */ }
  return estado;
}

/* TEM? A vitrine responde por cima — mas repare que ela não mente sobre `npc`.
   Nem o dono veste o traje do adversário, porque o dia em que ele testar o
   mundo vivo com o próprio traje de NPC, o mundo vai parecer certo e estar
   errado. */
/* ── COM CONTA REAL, A POSSE É DO SERVIDOR (E4, ST-4.3/4.4) ─────────────
   `posse-atual.mjs` injeta a pergunta quando o login hidrata; aí o traje
   segue a MESMA lista das outras famílias (L-157), e o `MODO_VITRINE` — que é
   estado de desenvolvimento, não produto — deixa de valer. Injetada, e não
   importada, porque `cosmeticos.mjs` já importa este arquivo. */
let externa = null;
export function usarPosseExterna(fn) { externa = typeof fn === 'function' ? fn : null; }

export function tem(estado, id) {
  const o = porId(id);
  if (!o || o.procedencia === 'npc') return false;
  if (externa) return externa(id);
  return MODO_VITRINE || (estado?.posse ?? []).includes(id);
}

/* OS QUE O JOGADOR PODE VESTIR AGORA. É o que a aba lista. */
export const vestiveis = estado => ACERVO.filter(o => tem(estado, o.id));

/* OS QUE ELE VÊ MAS NÃO TEM — a vitrine, no sentido literal.
   Existe porque cosmético trancado precisa APARECER trancado: um item que
   simplesmente não está na lista não desperta vontade nenhuma, e é a vontade
   que faz a loja e o baú valerem alguma coisa. */
export const bloqueados = estado =>
  ACERVO.filter(o => o.procedencia !== 'npc' &&
                     !(externa ? externa(o.id) : (estado?.posse ?? []).includes(o.id)));

export function vestir(estado, id, deposito = globalThis.localStorage) {
  if (!tem(estado, id)) return estado;
  return gravar({ ...estado, vestido: id }, deposito);
}

/* A FOLHA DO QUE ESTÁ VESTIDO. É o único ponto por onde a aba do idle pergunta
   qual arte desenhar — e por isso trocar de traje na aba de outfits aparece no
   farm sem nenhum outro fio entre os dois. */
export function folhaVestida(estado) {
  return porId(estado?.vestido)?.folha ?? ACERVO[0]?.folha ?? null;
}
