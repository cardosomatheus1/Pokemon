/* AS CRIATURAS DO JOGADOR, DO LADO DO SERVIDOR (bloco 1.1, §7.9, §P2, §P3).
 *
 * Fronteira: este arquivo é o ÚNICO caminho pelo qual uma criatura nasce, muda
 * de espécie ou é lida. A conta não mora aqui — ela é `engine/instancia.mjs` e
 * `engine/evolucao.mjs`, puros e testados sozinhos. Aqui fica o que precisa de
 * banco: quem é de quem, e o registro de como cada uma nasceu.
 *
 * ── O SORTEIO É DO SERVIDOR, E NÃO É NEGOCIÁVEL (§P2) ─────────────────────
 *
 * O cliente NUNCA manda os ocultos. Ele nem manda o resultado da captura: manda
 * a intenção, e recebe o que saiu. Se o sorteio acontecesse no navegador, um
 * `fetch` forjado bastaria para nascer com potencial 100 — e como a criatura é
 * vendável, isso não é trapaça num jogo, é dinheiro.
 *
 * É a mesma razão pela qual a aposta é liquidada no servidor. A diferença é que
 * ali o valor é óbvio, e aqui ele passa despercebido até o mercado abrir.
 *
 * ── A CAPTURA É AUDITÁVEL PELA MESMA PORTA QUE A RODADA (§25.2) ───────────
 *
 * Cada criatura guarda a RAIZ que a gerou. Dado esse número, qualquer um refaz
 * o sorteio e confere que os seis ocultos gravados são os que ele produz —
 * `conferir()` faz exatamente isso, e o teste chama.
 *
 * Sem a raiz, "esta criatura foi sorteada honestamente" seria uma afirmação que
 * só a casa poderia fazer. Com ela, um jogador que desconfie do próprio exemplar
 * de potencial 12 pode conferir; e, mais importante, um comprador pode conferir
 * o que está comprando.
 *
 * ── O POTENCIAL É CALCULADO NA LEITURA, SEMPRE ───────────────────────────
 *
 * Ele não é coluna (ver a migração `criaturas-do-jogador-1.1`). Sai dos ocultos
 * toda vez que a linha é lida, pela MESMA função que o cliente usa. Uma segunda
 * implementação aqui seria a armadilha do §7.11: duas contas que concordam hoje
 * e divergem no dia em que uma delas mudar.
 */
import { randomUUID } from 'node:crypto';
import { novaRaiz, derivar } from '../engine/seed.mjs';
import { semente, gerarInstancia, potencialDe, EXEMPLAR } from '../engine/instancia.mjs';
import { evolucoesDisponiveis } from '../engine/evolucao.mjs';

export const ORIGENS = ['captura', 'inicial', 'raid'];

/* O sorteio de UMA criatura a partir de uma raiz. Separado do banco de
   propósito: é esta função que `conferir()` reexecuta, e ela não pode depender
   de nada que a linha gravada não carregue. */
export function sortear(raiz, pack, dex) {
  return gerarInstancia(semente(derivar(raiz, 'criatura')), {
    especie: dex,
    naturezas: pack.naturezas ?? [],
    exemplarConf: EXEMPLAR,
  });
}

const COLUNAS_OCULTAS = ['o_hp', 'o_atq', 'o_def', 'o_spa', 'o_spd', 'o_vel'];

/* Nasce uma criatura. A raiz vem do CSPRNG — imprevisível de propósito: uma
   raiz derivada do relógio ou de um contador deixaria o jogador escolher a hora
   de capturar para pegar o potencial que ele quer. */
export function gerar(db, { userId, pack, dex, origem = 'captura', raiz = novaRaiz() }) {
  if (!ORIGENS.includes(origem)) throw new Error(`origem inválida: ${origem}`);
  const existe = (pack.especies ?? []).some(e => e.dex === dex);
  if (!existe) throw new Error(`dex ${dex} não existe no pack ${pack.id}`);

  const inst = sortear(raiz, pack, dex);
  const id = randomUUID();
  db.prepare(`
    INSERT INTO criaturas (id, user_id, pack_id, dex,
                           o_hp, o_atq, o_def, o_spa, o_spd, o_vel,
                           natureza, exemplar, nivel, vinculo, foco,
                           semente, origem, criada_em)
    VALUES (?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?, ?,?,?)`)
    .run(id, userId, pack.id, dex,
         ...inst.iv,
         inst.natureza.nome, inst.exemplar ? 1 : 0, inst.nivel, inst.vinculo, inst.foco,
         String(raiz), origem, Date.now());
  return ler(db, id, pack);
}

/* A linha crua vira a criatura que o resto do jogo entende — com o potencial e
   a forma CALCULADOS agora, pelas funções do motor. */
function hidratar(linha, pack) {
  if (!linha) return null;
  const iv = COLUNAS_OCULTAS.map(c => linha[c]);
  const nat = (pack?.naturezas ?? []).find(n => n[0] === linha.natureza);
  return {
    id: linha.id, dono: linha.user_id, pack: linha.pack_id,
    especie: linha.dex, iv,
    potencial: potencialDe(iv),
    exemplar: linha.exemplar === 1,
    natureza: nat ? { nome: nat[0], sobe: nat[1], desce: nat[2] }
                  : { nome: linha.natureza, sobe: null, desce: null },
    nivel: linha.nivel, vinculo: linha.vinculo, foco: linha.foco,
    origem: linha.origem, semente: linha.semente, criadaEm: linha.criada_em,
  };
}

export const ler = (db, id, pack) =>
  hidratar(db.prepare(`SELECT * FROM criaturas WHERE id = ?`).get(id), pack);

export const doJogador = (db, userId, pack) =>
  db.prepare(`SELECT * FROM criaturas WHERE user_id = ? ORDER BY criada_em`)
    .all(userId).map(l => hidratar(l, pack));

/* A AUDITORIA. Refaz o sorteio a partir da raiz gravada e compara oculto a
   oculto. Devolve `{ confere, esperado, gravado }` — e nunca lança, porque quem
   chama isto está justamente investigando se algo está errado. */
export function conferir(db, id, pack) {
  const linha = db.prepare(`SELECT * FROM criaturas WHERE id = ?`).get(id);
  if (!linha) return { confere: false, motivo: 'não existe' };
  const esperado = sortear(linha.semente, pack, linha.dex).iv;
  const gravado = COLUNAS_OCULTAS.map(c => linha[c]);
  return {
    confere: esperado.join(',') === gravado.join(','),
    esperado, gravado,
  };
}

/* EVOLUIR MUDA `dex` E MAIS NADA.
 *
 * O UPDATE toca uma coluna só, e isso é escrito assim de propósito: um `UPDATE
 * criaturas SET ...` genérico aqui seria a porta por onde os ocultos mudariam
 * um dia, sem ninguém decidir que mudariam.
 *
 * A condição é reconferida NO SERVIDOR mesmo que o cliente já a tenha conferido.
 * O cliente confere para desenhar o botão; quem decide é este arquivo. */
export function evoluir(db, { id, pack, itens = [] }) {
  const atual = ler(db, id, pack);
  if (!atual) throw new Error('criatura não existe');
  const disponiveis = evolucoesDisponiveis(pack, atual, { itens });
  if (!disponiveis.length) throw new Error('nenhuma evolução disponível');
  if (disponiveis.length > 1) throw new Error('a linha ramifica — o destino tem de ser escolhido');
  db.prepare(`UPDATE criaturas SET dex = ? WHERE id = ?`).run(disponiveis[0].para, id);
  return ler(db, id, pack);
}

/* O ramo escolhido, quando a linha se abre em mais de um. O destino é
   VALIDADO contra as evoluções disponíveis — aceitar o que o cliente mandou
   sem conferir transformaria "escolher o ramo" em "escolher a espécie". */
export function evoluirPara(db, { id, pack, destino, itens = [] }) {
  const atual = ler(db, id, pack);
  if (!atual) throw new Error('criatura não existe');
  const aresta = evolucoesDisponiveis(pack, atual, { itens }).find(e => e.para === destino);
  if (!aresta) throw new Error(`evolução para ${destino} não está disponível`);
  db.prepare(`UPDATE criaturas SET dex = ? WHERE id = ?`).run(aresta.para, id);
  return ler(db, id, pack);
}
