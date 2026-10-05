/* O STAKE DA LIGA NA TELA — a confirmação honesta (ST-11.11) — camada 0.
 *
 * Spec §9.6: "o rake é explícito na UI antes de confirmar a partida. Não
 * criar taxa escondida." E §28.5: o resultado é dito como é. Este módulo
 * responde, antes do clique, as quatro perguntas de quem arrisca:
 *
 *   quanto eu ponho        e de que dinheiro (só bônus e competitivo)
 *   quanto posso ganhar    o pot MENOS o rake — nunca o pot sozinho
 *   quanto a casa leva     o rake, em número e em porcentagem
 *   quanto posso perder    o stake inteiro, dito com o sinal de menos
 *
 * E o que devolve: empate e partida fora do ranking. Os números vêm da
 * resposta do servidor (`GET /api/equipe/stake`), que os lê do motor — a tela
 * não tem tabela de stake própria.
 *
 * Com a bandeira desligada (o estado de hoje — ligar é a D2, do dono), não há
 * nada: a seção não existe para o jogador, em vez de aparecer apagada.
 */
import { POLITICA_ARENA } from '../../engine/arena-treinadores.mjs';
const milhar = n => String(Math.max(0, Math.trunc(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function stakeNaTela(s, { confirmando = false } = {}) {
  if (!s || !s.ligado) return null;
  const falta = Math.max(0, (s.stake ?? 0) - (s.elegivel ?? 0));
  const porcento = s.pot ? Math.round((s.rake / s.pot) * 100) : 0;
  const lucro = (s.payout ?? 0) - (s.stake ?? 0);
  const motivo = s.acesso && !s.acesso.ok ? s.acesso.motivo : s.pausa ? 'a sua conta está em pausa — o stake volta quando a pausa acabar'
    : falta > 0 ? `faltam ${milhar(falta)} PC de bônus ou competitivo — o transferível nunca entra no stake`
    : null;
  return {
    /* O lema da aba dizia "sem aposta" em cima desta seção (Q7 da 11.11). */
    lema: 'o seu time publicado contra os de outros jogadores — valendo só quando você confirma',
    titulo: `Arena de Treinadores · ${s.tier}`,
    /* O ESTADO em primeiro lugar, e grande: estar na fila quer dizer que o seu
       time pode ser desafiado valendo sem você apertar nada — isso não pode
       ser a menor frase da seção (Q7 da 11.11). */
    estado: s.inscrito
      ? { texto: 'Defesa automática autorizada', explica: `restam ${s.defesa?.restantes ?? 0} defesas e ${milhar(s.defesa?.orcamento)} PC de orçamento; vence em ${new Date(s.defesa?.expiraEm).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}. Ganhar não renova a autorização.`, classe: 'dentro' }
      : { texto: 'Defesa automática desligada', explica: 'você pode buscar uma partida sem autorizar cobranças quando estiver fora', classe: 'fora' },
    numeros: [
      { rotulo: 'você põe', valor: `${milhar(s.stake)} PC`, sub: 'do bônus e do competitivo', classe: '' },
      /* O LÍQUIDO ao lado do bruto: "recebe 90" sozinho lia como 90 de lucro. */
      { rotulo: 'se vencer, recebe', valor: `${milhar(s.payout)} PC`, sub: `lucro de ${milhar(lucro)}`, classe: 'ganha' },
      /* A perda no RÓTULO, e o número limpo: o "−" na fonte pixelada lia como um 50 riscado. */
      { rotulo: 'se perder, você perde', valor: `${milhar(s.stake)} PC`, sub: 'o stake inteiro', classe: 'perde' },
      { rotulo: 'a casa leva', valor: `${milhar(s.rake)} PC`, sub: `${porcento}% do pot, tirado do prêmio`, classe: 'casa' },
    ],
    conta: `pot ${milhar(s.pot)} = ${milhar(s.stake)} seu + ${milhar(s.stake)} do adversário · a casa tira ${milhar(s.rake)} · o vencedor leva ${milhar(s.payout)}`,
    regras: [
      'sai do seu bônus e do competitivo — nunca do transferível',
      'o que você ganhar volta como bônus',
      'empate, ou partida anulada pelo sistema, devolve tudo, sem taxa',
    ],
    saldo: `bônus ${milhar(s.bonus)} · competitivo ${milhar(s.competitivo)}`,
    inscrito: !!s.inscrito,
    inscricao: s.inscrito ? { rotulo: 'Desligar defesa automática', ativo: false }
      : { rotulo: `Autorizar ${POLITICA_ARENA.defesas} defesas · até ${milhar(POLITICA_ARENA.defesas * s.stake)} PC por ${POLITICA_ARENA.validadeMs/3600000} h`, ativo: true },
    acao: { rotulo: `Buscar partida valendo ${milhar(s.stake)} PC`, habilitada: !motivo },
    motivo,
    confirmacao: confirmando && !motivo ? {
      titulo: 'Confirme antes de lutar',
      texto: `Você põe ${milhar(s.stake)} PC do seu bônus e competitivo. Se vencer, recebe ${milhar(s.payout)} PC — lucro de ${milhar(lucro)}, depois de ${milhar(s.rake)} da casa — e o que ganhar volta como bônus. Se perder, perde os ${milhar(s.stake)} PC. Empate, ou partida anulada pelo sistema, devolve tudo.`,
      confirmar: `Confirmar e buscar valendo ${milhar(s.stake)} PC`,
      cancelar: 'Voltar',
    } : null,
  };
}
