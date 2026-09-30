/* OS SINAIS DE APARELHO E REDE (ST-13.8 · L-050 · DEC-19 · Spec §7.19, §28) — camada 0.
 *
 * A política é do dono (DEC-19, 30/09): o número aleatório do navegador e o
 * IP de onde a conta fala, guardados SÓ como assinatura, por 30 dias; duas
 * contas com a mesma assinatura viram suspeita para o operador, e nada é
 * punido nem ligado sozinho. O §28 é requisito de PROTEÇÃO, e não de
 * vigilância: a tabela de sinais não pode virar o alvo que ela protege — por
 * isso o valor em claro não entra no banco, e o que venceu sai.
 *
 * Puro: a forma do número, o IP normalizado e os pares. A assinatura (HMAC
 * com o segredo) mora no servidor, que é quem tem o segredo.
 */
export const RETENCAO_DIAS = 30;
export const CLASSES = Object.freeze(['aparelho', 'rede']);
const DIA = 86400e3;

/* O número do aparelho: o `crypto.randomUUID` do navegador, ou algo da mesma
   família — só letras, números e hífen, de 16 a 64. Qualquer outra coisa é
   lixo de quem forja o cabeçalho, e não se grava. */
export const aparelhoValido = v => typeof v === 'string' && /^[a-z0-9-]{16,64}$/i.test(v);

/* O IP como o socket entrega: o IPv4 mapeado em IPv6 volta a ser IPv4 — o
   mesmo endereço não pode render duas assinaturas. */
export const ipNormalizado = v => String(v ?? '').trim().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, '$1').toLowerCase();

/* Os pares: contas diferentes com a mesma classe e a mesma assinatura, vistas
   nos últimos 30 dias. Um par por classe, em ordem canônica. */
export function paresComMesmoSinal(linhas, agora) {
  const de = agora - RETENCAO_DIAS * DIA, por = new Map();
  for (const l of linhas) {
    if (l.visto < de) continue;
    const k = `${l.classe}|${l.assinatura}`;
    if (!por.has(k)) por.set(k, new Set());
    por.get(k).add(l.user);
  }
  const pares = new Map();
  for (const [k, contas] of por) {
    const classe = k.split('|')[0], lista = [...contas].sort();
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) pares.set(`${lista[i]}|${lista[j]}|${classe}`, { a: lista[i], b: lista[j], classe });
  }
  return [...pares.values()];
}
