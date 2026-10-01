/* Q1 · A TROCA NA TELA, DECIDIDA FORA DELA (ST-14.7b) — camada 0, em Node.
 *
 * A etapa de cada ponto de vista, o botão que a tela oferece, o relógio do
 * lock, as linhas de cada lado e a recusa em palavras. A tela só pinta isto.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { etapaDaTroca, linhasDoLado, textoDaRecusa, ofertaDaSelecao, linhaDaLista, relogio, contarLado,
         separarOfertaveis, itensNegociaveis } from '../app/modules/trocas-dados.mjs';

const T = Date.UTC(2026, 0, 15, 12);
const lado = (x = {}) => ({ criaturas: [], itens: [], moeda: 0, taxa: 0, pronto: false, confirmado: false, ...x });
const troca = (x = {}) => ({ estado: 'OFFERED', revisao: 1, outro: 'Misty', conviteExpiraEm: T + 3_600_000, lockExpiraEm: null,
                            meu: lado({ criaturas: [{ id: 'c', dex: 16, nivel: 5 }] }), dele: lado(), ...x });

export async function suite() {
  const s = criarSuite('trocas-dados');

  s.teste('a etapa e o botão, de cada ponto de vista', () => {
    igual(etapaDaTroca(null).etapa, 'nenhuma', 'sem troca');
    igual(etapaDaTroca(troca({ meu: lado() }), T).acao, 'editar', 'a troca vazia pede para montar');
    igual(etapaDaTroca(troca(), T).acao, 'pronto', 'a troca montada pede pronto');
    const esp = etapaDaTroca(troca({ meu: lado({ criaturas: [{ id: 'c', dex: 16, nivel: 5 }], pronto: true }) }), T);
    ok(esp.acao === null && /Misty/.test(esp.titulo) && /Nada seu está preso/.test(esp.aviso), `esperando o outro: ${JSON.stringify(esp)}`);
    ok(/Misty está pronto/.test(etapaDaTroca(troca({ dele: lado({ pronto: true }) }), T).titulo), 'o outro pronto não é dito');
    igual(etapaDaTroca(troca({ conviteExpiraEm: T }), T).final, 'EXPIRED', 'o convite vencido no relógio de quem olha');
    const lock = troca({ estado: 'LOCKED', lockExpiraEm: T + 125_000 });
    const c = etapaDaTroca(lock, T);
    igual(`${c.acao}|${c.resta}|${relogio(c.resta)}`, 'confirmar|125|2:05', 'o lock conta para trás');
    igual(etapaDaTroca({ ...lock, meu: { ...lock.meu, confirmado: true } }, T).acao, null, 'quem já confirmou não confirma de novo');
    igual(etapaDaTroca(lock, T + 125_000).final, 'EXPIRED', 'o lock acabou na tela');
    for (const [e, t] of [['SETTLED', 'concluída'], ['CANCELLED', 'cancelada'], ['EXPIRED', 'vencida']])
      ok(new RegExp(t).test(etapaDaTroca(troca({ estado: e }), T).titulo), `o fim ${e}`);
  });

  s.teste('as linhas de cada lado: o que entra no hash é o que se lê', () => {
    const l = linhasDoLado(lado({ criaturas: [{ id: 'a', dex: 25, nivel: 12, natureza: 'Firme', shiny: true }, { id: 'b', sumiu: true }],
                                   itens: [{ itemId: 'poke', quantidade: 3 }], moeda: 200, taxa: 2 }),
                           { nomeDaEspecie: d => (d === 25 ? 'Pikachu' : '?'), nomeDoItem: id => (id === 'poke' ? 'Poké Ball' : id) });
    igual(l.map(x => x.texto).join(' | '), '✦ Pikachu · nv 12 · Firme | uma criatura que não está mais na conta | 3× Poké Ball | 200 PC-T', 'as linhas');
    ok(l[1].alerta && l[3].nota === '+2 de taxa (queima)', 'o alerta e a taxa');
    igual(contarLado(lado({ itens: [{}], moeda: 5 })), 2, 'contar o lado');
  });

  s.teste('a recusa em palavras: o quê e quando', () => {
    const quando = new Date(2026, 0, 15, 14, 32).getTime();
    igual(textoDaRecusa({ corpo: { reason_code: 'ASSET_COOLDOWN', available_at: quando } }), 'Chegou numa troca há pouco — livre às 14:32.', 'o cooldown com a hora');
    ok(/desligadas/.test(textoDaRecusa({ corpo: { reason_code: 'FEATURE_DISABLED' } })), 'a bandeira desligada');
    ok(/ligada à sua/.test(textoDaRecusa({ corpo: { reason_code: 'ACCOUNT_RESTRICTED', erro: 'a contraparte não pode: conta_ligada' } })), 'a conta ligada');
    ok(/em revisão/.test(textoDaRecusa({ corpo: { reason_code: 'ACCOUNT_RESTRICTED', erro: 'x: ACCOUNT_RESTRICTED (congelada)' } })), 'a congelada');
    ok(/20 coisas/.test(textoDaRecusa({ corpo: { reason_code: 'CAPACITY_EXCEEDED', erro: 'limite da oferta: ativos_por_lado' } })), 'os ativos por lado');
    ok(/troca aberta/.test(textoDaRecusa({ corpo: { reason_code: 'CAPACITY_EXCEEDED', erro: 'esta conta já tem uma troca aberta' } })), 'a troca aberta');
    ok(/mudou enquanto/.test(textoDaRecusa({ corpo: { codigo: 'TROCA_REVISAO_VELHA' } })), 'a revisão velha');
    ok(/não é o que você viu/.test(textoDaRecusa({ corpo: { codigo: 'TROCA_HASH' } })), 'o hash');
    ok(/Sem conexão/.test(textoDaRecusa({ indisponivel: true })), 'sem conversa não é recusa');
    igual(textoDaRecusa({ corpo: { erro: 'outra coisa' } }), 'outra coisa', 'a mensagem do servidor como último recurso');
  });

  s.teste('a seleção vira o corpo da API, e a lista diz para quem', () => {
    igual(JSON.stringify(ofertaDaSelecao({ criaturas: ['a', 'a', 'b'], itens: { poke: 2, great: 0, x: -1 }, moeda: 150 })),
          JSON.stringify({ criaturas: ['a', 'b'], itens: [{ itemId: 'poke', quantidade: 2 }], moeda: 150 }), 'a seleção');
    igual(ofertaDaSelecao({ moeda: 1.5 }).moeda, 0, 'PC-T quebrado');
    const l = linhaDaLista({ id: 't', papel: 'contraparte', outro: 'Brock', estado: 'LOCKED' });
    igual(`${l.texto}|${l.estado}|${l.aberta}`, 'de Brock|travada — confirmar|true', 'a linha da lista');
  });

  s.teste('o que a tela oferece para montar: sem o preso pela origem, e só o livre que negocia', () => {
    const { ofertaveis, presas } = separarOfertaveis([
      { id: 'a', origem: 'captura', proveniencia: 'verified_earned' }, { id: 'b', origem: 'inicial', proveniencia: 'verified_earned' },
      { id: 'c', origem: 'captura', proveniencia: 'promotional_bound' }, { id: 'd', origem: 'raid' }, { id: 'e', origem: 'captura', proveniencia: 'p2p_verified' }]);
    igual(`${ofertaveis.map(c => c.id).join()}|${presas.map(c => c.id).join()}`, 'a,e|b,c,d', 'as ofertáveis e as presas');
    igual(JSON.stringify(itensNegociaveis({ poke: [{ classe: 'verified_earned', quantidade: 2 }, { classe: 'promotional_bound', quantidade: 4 }, { classe: 'p2p_verified', quantidade: 1 }],
                                            great: [{ classe: 'promotional_bound', quantidade: 3 }] })),
          JSON.stringify([{ itemId: 'poke', livre: 3 }]), 'os itens que negociam');
  });

  return s;
}
