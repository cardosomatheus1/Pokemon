/* OS LIMITES E A CONTRAPARTE DE UMA OFERTA ENTRE JOGADORES (ST-14.14 · E14 · spec E14 §§7, 13) — camada 0.
 *
 * A política de negociabilidade (ST-14.5) diz se UM ATIVO pode ir para a
 * troca. Aqui mora o que diz se a OFERTA pode existir: quantas a conta já tem
 * abertas, quantos ativos de cada lado, e com quem. Baselines da spec §7 para
 * o piloto: uma troca aberta por conta, dez anúncios ativos, vinte ativos por
 * lado. Limitam CIRCULAÇÃO — nenhum deles valida origem, e nenhum tira
 * patrimônio de ninguém.
 *
 * A contraparte: nunca a própria conta, nunca uma conta LIGADA (o mesmo
 * aparelho, a mesma rede declarada, o grafo da ST-13.8) — a troca com a
 * outra conta da mesma pessoa é o atalho do bônus para o PC-T.
 */
export const LIMITES_P2P = Object.freeze({ trade: 1, market: 10, ativosPorLado: 20 });

const nao = (reason_code, detalhe) => ({ allowed: false, reason_code, available_at: null, detalhe });
const sim = Object.freeze({ allowed: true, reason_code: null, available_at: null, detalhe: null });

export function avaliarLimites({ tipo, abertas, ativosNaOferta, limites = LIMITES_P2P }) {
  if (!(tipo in limites) || tipo === 'ativosPorLado') throw new Error(`tipo de oferta sem limite: ${tipo}`);
  if (ativosNaOferta > limites.ativosPorLado) return nao('CAPACITY_EXCEEDED', 'ativos_por_lado');
  if (abertas >= limites[tipo]) return nao('CAPACITY_EXCEEDED', `${tipo}_abertas`);
  return sim;
}

export function avaliarContraparte({ userId, outroId, ligadas = [] }) {
  if (!outroId) return sim;   // o anúncio não tem contraparte até a compra
  if (outroId === userId) return nao('ACCOUNT_RESTRICTED', 'mesma_conta');
  if (ligadas.includes(outroId)) return nao('ACCOUNT_RESTRICTED', 'conta_ligada');
  return sim;
}
