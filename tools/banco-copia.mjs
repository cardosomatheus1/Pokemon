/* COPIAR, CONFERIR E RESTAURAR O BANCO — a ferramenta do operador (ST-7.1b).
 *
 *   node tools/banco-copia.mjs copiar    [banco] [destino]
 *   node tools/banco-copia.mjs conferir  <arquivo>
 *   node tools/banco-copia.mjs restaurar <copia> <destino> [--sobrescrever]
 *
 * `banco` é `dados/pokearena.db` quando omitido (o mesmo do `config.mjs`), e o
 * destino da cópia é `dados/copias/pokearena-<instante>.db`. Copiar funciona
 * com o servidor LIGADO — é um instante consistente, não um `cp`.
 *
 * RESTAURAR SOBRE O BANCO VIVO EXIGE O SERVIDOR DESLIGADO: o processo que está
 * com o arquivo aberto continuaria escrevendo no inode antigo. A ferramenta
 * não tem como saber disso por você; por isso sobrescrever pede a bandeira.
 *
 * A lógica mora em `server/copia.mjs`; aqui só se lê a linha de comando. */
import { abrirBanco } from '../server/banco.mjs';
import { copiar, conferirCopia, restaurar } from '../server/copia.mjs';

const [cmd, a, b] = process.argv.slice(2).filter(x => !x.startsWith('--'));
const sobrescrever = process.argv.includes('--sobrescrever');
const instante = () => new Date().toISOString().replace(/[:.]/g, '-');
const sair = (msg, codigo = 1) => { console.log(msg); process.exit(codigo); };

if (cmd === 'copiar') {
  const banco = a ?? 'dados/pokearena.db';
  const destino = b ?? `dados/copias/pokearena-${instante()}.db`;
  const db = abrirBanco(banco);
  try {
    const r = copiar(db, destino);
    const c = conferirCopia(destino);
    console.log(`cópia em ${r.destino} · ${(r.bytes / 1024).toFixed(1)} KiB · esquema ${r.versao}`);
    if (!c.ok) sair(`ATENÇÃO: a cópia NÃO confere — o banco de origem já tem problema:\n  ${c.problemas.join('\n  ')}`);
  } catch (e) { sair(`não copiou: ${e.message}`); }
  finally { db.close(); }
} else if (cmd === 'conferir' && a) {
  const c = conferirCopia(a);
  if (!c.ok) sair(`NÃO confere:\n  ${c.problemas.join('\n  ')}`);
  console.log(`confere · esquema ${c.versao} · ${c.contas} conta(s), ledger e saldo batem em todas`);
} else if (cmd === 'restaurar' && a && b) {
  const r = restaurar(a, b, { sobrescrever });
  if (!r.ok) sair(`NÃO restaurou (${r.codigo}):\n  ${r.problemas.join('\n  ')}`);
  console.log(`restaurado em ${r.destino} · esquema ${r.versao} · ${r.contas} conta(s)`);
} else {
  sair('uso: copiar [banco] [destino] | conferir <arquivo> | restaurar <copia> <destino> [--sobrescrever]', 2);
}
