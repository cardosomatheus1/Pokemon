/* Q1/Q6/Q9 · ADMIN, TELEMETRIA E PAINEL (F1.11).
 *
 * O §5.11 diz que o painel admin é a superfície de MAIOR VALOR do sistema: quem
 * entra vê saldo de todo mundo, muda a margem da casa e pode bloquear conta.
 *
 * Estes testes cobram as três camadas que o bloco declara — papel, registro,
 * confirmação — e mais duas coisas que não são de segurança e sim de verdade:
 * que evento de proteção NUNCA é amostrado, e que o painel lê o LEDGER e não o
 * saldo guardado.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, reservarNoBanco } from '../server/carteira.mjs';
import { emitir, eventosDe, PROTECAO, OBRIGATORIOS, ehDeProtecao,
         ERRO_TELEMETRIA } from '../server/telemetria.mjs';
import { criarOperador, podeFazer, agir, painelEconomico, PAPEIS, EXIGE,
         DESTRUTIVAS, ERRO_ADMIN } from '../server/admin.mjs';

const AGORA = Date.parse('2026-03-02T12:00:00Z');
const spec = () => readFileSync(
  new URL('../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md', import.meta.url).pathname, 'utf8');

function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'j', email: 'j@exemplo.test',
    senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA });
  return { db, u };
}
const pegar = fn => { try { fn(); return null; } catch (e) { return e.codigo || e.message; } };

export function suite() {
  const s = criarSuite('admin');

  /* ── A LISTA DE EVENTOS SAI DO DOCUMENTO ───────────────────────────────*/

  s.teste('a lista de eventos de proteção é a do §4.7, inteira', () => {
    /* LÊ O DOCUMENTO, e não uma cópia. Encolher a lista é o defeito — um
       evento que sai dela passa a poder ser amostrado, e amostrar registro de
       conformidade é o que este bloco existe para impedir. É a mesma razão de
       `test/emissao.mjs` ler o Estudo em vez de copiar o orçamento. */
    const txt = spec();
    const bloco = txt.slice(txt.indexOf('## Proteção do jogador'));
    const listados = bloco.slice(bloco.indexOf('```text') + 7, bloco.indexOf('```', bloco.indexOf('```text') + 7))
      .split('\n').map(l => l.trim()).filter(Boolean);
    for (const e of listados)
      ok(PROTECAO.includes(e),
        `o §4.7 lista \`${e}\` entre os eventos de proteção e o módulo não o conhece. ` +
        `Evento fora da lista pode ser amostrado — e o documento diz que nenhum pode.`);
    igual(PROTECAO.length, listados.length,
      `a lista do módulo tem ${PROTECAO.length} eventos e o documento tem ${listados.length}`);
  });

  /* ── O QUE NÃO SE AMOSTRA ──────────────────────────────────────────────*/

  s.teste('evento de proteção grava mesmo com amostragem em ZERO', () => {
    const c = cenario();
    for (const nome of PROTECAO) {
      const campos = {};
      for (const k of (OBRIGATORIOS[nome] || [])) if (k !== 'user_id') campos[k] = 'x';
      /* `amostra: 0` significa "não guarde nada". Um evento de proteção tem que
         ignorar isso — e `sorteio: () => 0` garante que, se ele CONSULTAR o
         sorteio, o resultado seria descartar. */
      const id = emitir(c.db, { nome, userId: c.u.id, campos, amostra: 0,
                                sorteio: () => 0.999999, agora: AGORA });
      ok(id,
        `\`${nome}\` foi amostrado. O §4.7: "nenhum destes eventos pode ser ` +
        `amostrado — são registro de conformidade, não métrica de produto". ` +
        `Amostrar aqui é a diferença entre responder "este jogador recebeu o ` +
        `aviso?" e ter que dizer "provavelmente".`);
    }
    igual(c.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE amostravel = 1`).get().n, 0,
      'algum evento de proteção foi gravado como amostrável');
  });

  s.teste('métrica de produto CONTINUA amostrável', () => {
    /* O CONTRAPESO. Sem ele, o teste acima é satisfeito por uma telemetria que
       nunca amostra nada — e aí a regra do §4.7 não estaria sendo respeitada,
       estaria sendo ignorada junto com o resto. */
    const c = cenario();
    ok(!ehDeProtecao('round_viewed'), 'round_viewed foi tratado como evento de proteção');
    const id = emitir(c.db, { nome: 'round_viewed', userId: c.u.id,
                              amostra: 0.01, sorteio: () => 0.9, agora: AGORA });
    igual(id, null,
      'a amostragem não funciona para métrica de produto. A assimetria é o ' +
      'bloco inteiro: um lado é custo, o outro é conformidade.');
  });

  s.teste('evento de proteção sem campo obrigatório é RECUSADO', () => {
    const c = cenario();
    igual(pegar(() => emitir(c.db, { nome: 'limit_set', userId: c.u.id,
                                     campos: { limit_type: 'max_loss_dia' }, agora: AGORA })),
      ERRO_TELEMETRIA.CAMPO,
      'um `limit_set` entrou sem `limit_value` e sem `window`. Campo obrigatório ' +
      'ausente é pior que evento ausente: o painel soma zero e ninguém percebe.');
    igual(pegar(() => emitir(c.db, { nome: 'risk_signal_raised', userId: c.u.id,
                                     campos: { signal_type: '' }, agora: AGORA })),
      ERRO_TELEMETRIA.CAMPO, 'campo obrigatório VAZIO passou');
  });

  /* ── AS TRÊS CAMADAS DO §5.11 ──────────────────────────────────────────*/

  s.teste('ação sem operador não acontece', () => {
    const c = cenario();
    igual(pegar(() => agir(c.db, { operadorId: 'nao-existe', acao: 'painel.ver',
                                   motivo: 'x', agora: AGORA })),
      ERRO_ADMIN.SEM_OPERADOR, 'uma ação rodou sem operador identificado');
  });

  s.teste('cada ação exige o papel dela', () => {
    const c = cenario();
    const leitor = criarOperador(c.db, { email: 'l@x.test', papel: 'leitura', agora: AGORA });
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    ok(podeFazer(leitor, 'painel.ver'), 'leitura não alcança o painel');
    ok(!podeFazer(leitor, 'margem.definir'), 'leitura alcançou definir margem');
    ok(podeFazer(dono, 'margem.definir'), 'dono não alcança definir margem');
    igual(pegar(() => agir(c.db, { operadorId: leitor.id, acao: 'margem.definir',
                                   motivo: 'x', confirmado: true, agora: AGORA })),
      ERRO_ADMIN.SEM_PAPEL, 'um operador de leitura mudou a margem da casa');
  });

  s.teste('ação DESCONHECIDA é negada, e não liberada', () => {
    const c = cenario();
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    ok(!podeFazer(dono, 'acao.que.ninguem.declarou'),
      'uma ação fora da tabela foi permitida ao dono. Ação nova precisa nascer ' +
      'PROIBIDA — senão a escrita de amanhã fica liberada para o papel mais ' +
      'fraco até alguém lembrar de declará-la. É a regra de `ROTAS_PUBLICAS`.');
    igual(pegar(() => agir(c.db, { operadorId: dono.id, acao: 'inventada',
                                   motivo: 'x', agora: AGORA })), ERRO_ADMIN.ACAO);
  });

  s.teste('nenhuma ação sem motivo escrito', () => {
    const c = cenario();
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    for (const motivo of ['', '   ', undefined])
      igual(pegar(() => agir(c.db, { operadorId: dono.id, acao: 'painel.ver',
                                     motivo, agora: AGORA })),
        ERRO_ADMIN.SEM_MOTIVO, `motivo ${JSON.stringify(motivo)} foi aceito`);
  });

  s.teste('ação destrutiva exige confirmação EXPLÍCITA', () => {
    const c = cenario();
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    for (const acao of DESTRUTIVAS) {
      igual(pegar(() => agir(c.db, { operadorId: dono.id, acao, motivo: 'teste', agora: AGORA })),
        ERRO_ADMIN.SEM_CONFIRMAR, `\`${acao}\` rodou sem confirmação`);
      for (const truthy of ['true', 1, 'sim'])
        igual(pegar(() => agir(c.db, { operadorId: dono.id, acao, motivo: 'teste',
                                       confirmado: truthy, agora: AGORA })),
          ERRO_ADMIN.SEM_CONFIRMAR,
          `\`${acao}\` aceitou ${JSON.stringify(truthy)} como confirmação. Só ` +
          `\`true\` vale — string vinda de query é sempre truthy, e "false" ` +
          `confirmaria.`);
    }
  });

  s.teste('a auditoria guarda o ANTES e o DEPOIS', () => {
    const c = cenario();
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    agir(c.db, { operadorId: dono.id, acao: 'margem.definir', alvo: 'casa',
                 de: 0.08, para: 0.12, motivo: 'ajuste do trimestre',
                 confirmado: true, agora: AGORA });
    const a = c.db.prepare(`SELECT * FROM admin_auditoria ORDER BY criado_em DESC LIMIT 1`).get();
    igual(a.operador_id, dono.id, 'a auditoria não guardou quem fez');
    igual(a.de, '0.08', 'a auditoria não guardou o valor ANTERIOR');
    igual(a.para, '0.12', 'a auditoria não guardou o valor novo');
    ok(a.motivo, 'a auditoria não guardou o motivo');
  });

  s.teste('a auditoria registra a ação que FALHA no meio', () => {
    /* Gravar só o sucesso não registra exatamente o que mais interessa depois. */
    const c = cenario();
    const dono = criarOperador(c.db, { email: 'd@x.test', papel: 'dono', agora: AGORA });
    try {
      agir(c.db, { operadorId: dono.id, acao: 'jogador.pausar', alvo: c.u.id,
                   motivo: 'suspeita', confirmado: true, agora: AGORA },
           () => { throw new Error('a ação explodiu'); });
    } catch { /* esperado */ }
    igual(c.db.prepare(`SELECT COUNT(*) n FROM admin_auditoria WHERE acao = 'jogador.pausar'`).get().n, 1,
      'a ação falhou e não deixou registro de ter sido TENTADA');
  });

  /* ── O PAINEL LÊ O LEDGER ──────────────────────────────────────────────*/

  s.teste('o painel NÃO consulta a tabela de saldos', () => {
    const fonte = readFileSync(new URL('../server/admin.mjs', import.meta.url).pathname, 'utf8');
    const painel = fonte.slice(fonte.indexOf('export function painelEconomico'));
    const somaCache = [...painel.matchAll(/FROM carteiras/g)].length;
    igual(somaCache, 1,
      `o painel consulta \`carteiras\` ${somaCache} vezes. Exatamente UMA é ` +
      `permitida — a que COMPARA cache e ledger para expor divergência. ` +
      `Qualquer outra é o painel lendo cache: ele mostraria a mesma resposta ` +
      `errada que o cache tem, e o critério de saída do bloco é "dá para ` +
      `responder se a economia está saudável olhando uma tela".`);
  });

  s.teste('faucets, sinks e circulação saem do ledger', () => {
    const c = cenario();
    creditar(c.db, { userId: c.u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                     valor: 1000, idem: 'a', agora: AGORA });
    creditar(c.db, { userId: c.u.id, tipo: 'RESCUE_GRANT', bucket: 'bonus',
                     valor: 20, idem: 'b', agora: AGORA });
    /* A RESERVA É O SINK que existe hoje: ela tira do disponível e põe no
       reservado, na mesma linha do ledger — é o desenho do §5.5. */
    reservarNoBanco(c.db, { userId: c.u.id, valor: 300, ref: 'r1', agora: AGORA });

    const p = painelEconomico(c.db);
    igual(p.faucets.WELCOME_GRANT, 1000, 'o faucet de boas-vindas não apareceu');
    igual(p.faucets.RESCUE_GRANT, 20, 'o resgate não apareceu como faucet');
    ok(Object.values(p.sinks).some(v => v === 300),
      `a reserva de 300 não apareceu como sink: ${JSON.stringify(p.sinks)}`);
    /* A ORDEM DE CONSUMO DO §5.5 GASTA BÔNUS PRIMEIRO, então a reserva de 300
       tira os 20 de bônus e 280 do transferível. A primeira versão deste teste
       esperava 700 e 20 — ela estava medindo a minha expectativa, e não a
       regra. O painel estava certo. */
    igual(p.emCirculacao.transferivel, 720, 'a circulação não bate com o ledger');
    igual(p.emCirculacao.bonus, 0,
      'o bônus não foi consumido primeiro — a ordem do §5.5 é o que impede a ' +
      'Arena de virar conversor de bônus em transferível');
    igual(Object.keys(p.divergencia).length, 0,
      `cache e ledger divergem: ${JSON.stringify(p.divergencia)}`);
  });

  s.teste('o painel DENUNCIA divergência entre cache e ledger', () => {
    /* O teste mais importante do painel, e o único jeito de provar que ele lê a
       fonte: adulterar o CACHE e ver o painel acusar. Um painel que lesse o
       cache mostraria o número adulterado como verdade. */
    const c = cenario();
    creditar(c.db, { userId: c.u.id, tipo: 'WELCOME_GRANT', bucket: 'transferivel',
                     valor: 1000, idem: 'a', agora: AGORA });
    c.db.prepare(`UPDATE carteiras SET saldo = 999999 WHERE user_id = ? AND bucket = 'transferivel'`)
      .run(c.u.id);
    const p = painelEconomico(c.db);
    igual(p.emCirculacao.transferivel, 1000,
      'a circulação seguiu o cache adulterado — o painel não lê o ledger');
    igual(p.divergencia.transferivel, 999999 - 1000,
      'o painel não acusou a divergência entre cache e ledger');
  });

  return s;
}
