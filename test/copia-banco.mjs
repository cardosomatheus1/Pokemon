/* Q1/Q3/Q6 · A CÓPIA E A RESTAURAÇÃO DO BANCO, DEMONSTRADAS (ST-7.1b, OBS-01).
 *
 * O piloto põe saldo, posse e histórico de amigos num arquivo SQLite. Cópia
 * que nunca foi restaurada é esperança, não cópia: o que este arquivo trava é
 * o CICLO inteiro — copiar com o servidor escrevendo, conferir, restaurar
 * noutro lugar, e o restaurado reconciliar centavo a centavo.
 *
 *   a cópia é um instante      o que acontece depois dela não entra nela
 *   a cópia se confere         integridade, versão de esquema e ledger × saldo
 *   cópia adulterada não entra restaurar recusa antes de tocar no destino
 *   não se sobrescreve nada    nem a cópia (copiar duas vezes no mesmo nome),
 *                              nem o banco vivo sem pedir
 *   cópia antiga sobe          a restauração migra até a versão atual
 */
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar, desmigrar, versaoDoBanco, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { comprar } from '../server/cosmeticos.mjs';
import { catalogo } from '../app/modules/cosmeticos.mjs';
import { copiar, conferirCopia, restaurar, ERRO_COPIA } from '../server/copia.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);
const pasta = () => mkdtempSync(join(tmpdir(), 'pa-copia-'));

function bancoVivo(dir) {
  const db = abrirBanco(join(dir, 'vivo.db')); migrar(db);
  const u = cadastrar(db, { username: 'amigo', email: 'amigo@x.test', senha: 'senha-longa-o-bastante-1',
                            nascimento: '1990-01-01', agora: T0 }).id;
  creditar(db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: 'w', agora: T0 });
  const peca = catalogo().find(p => p.familia === 'moldura' && p.procedencia === 'loja');
  comprar(db, { userId: u, familia: 'moldura', id: peca.id, chaveIdem: 'k1', agora: T0 });
  return { db, u, peca };
}
const falha = f => { try { f(); return null; } catch (e) { return e; } };

export function suite() {
  const s = criarSuite('copia-banco');

  s.teste('copiar, restaurar noutro lugar, e o restaurado é o instante da cópia', () => {
    const dir = pasta();
    const { db, u } = bancoVivo(dir);
    const antes = saldos(db, u);
    const r = copiar(db, join(dir, 'copia.db'));
    ok(r.bytes > 0 && existsSync(r.destino), 'a cópia não gerou arquivo');
    /* O servidor continua escrevendo depois da cópia: isto NÃO pode entrar nela. */
    creditar(db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: 77, idem: 'depois', agora: T0 + 1 });

    const destino = join(dir, 'restaurado.db');
    const rr = restaurar(join(dir, 'copia.db'), destino);
    igual(rr.ok, true, `a restauração recusou uma cópia boa: ${JSON.stringify(rr)}`);
    const db2 = abrirBanco(destino);
    igual(JSON.stringify(saldos(db2, u)), JSON.stringify(antes), 'o restaurado não é o saldo do instante da cópia');
    igual(db2.prepare('SELECT COUNT(*) AS n FROM cosmetic_ownership').get().n, 1, 'a posse não voltou com a cópia');
    igual(versaoDoBanco(db2), MIGRACOES.length, 'o restaurado não está na versão atual do esquema');
    db2.close(); db.close();
  });

  s.teste('a conferência pega saldo que não bate com o ledger, e a restauração recusa', () => {
    const dir = pasta();
    const { db, u } = bancoVivo(dir);
    const caminho = join(dir, 'copia.db');
    copiar(db, caminho); db.close();
    igual(conferirCopia(caminho).ok, true, 'uma cópia boa foi reprovada');

    const adulterar = abrirBanco(caminho);
    adulterar.prepare(`UPDATE carteiras SET saldo = saldo + 5000 WHERE user_id = ? AND bucket = 'transferivel'`).run(u);
    adulterar.close();
    const c = conferirCopia(caminho);
    igual(c.ok, false, 'saldo adulterado passou pela conferência');
    ok(c.problemas.some(p => /ledger/.test(p)), `o problema não diz o que diverge: ${c.problemas.join(' | ')}`);

    const destino = join(dir, 'restaurado.db');
    const rr = restaurar(caminho, destino);
    igual(rr.codigo, ERRO_COPIA.CONFERENCIA, 'a restauração aceitou uma cópia que não confere');
    ok(!existsSync(destino), 'a restauração recusada deixou arquivo no destino');
  });

  s.teste('não sobrescreve: nem a cópia, nem o banco vivo sem pedir', () => {
    const dir = pasta();
    const { db } = bancoVivo(dir);
    const caminho = join(dir, 'copia.db');
    copiar(db, caminho);
    igual(falha(() => copiar(db, caminho))?.codigo, ERRO_COPIA.EXISTE, 'a segunda cópia no mesmo nome apagou a primeira');

    const destino = join(dir, 'ocupado.db');
    writeFileSync(destino, 'o banco de alguém');
    igual(restaurar(caminho, destino).codigo, ERRO_COPIA.EXISTE, 'a restauração sobrescreveu sem pedir');
    igual(readFileSync(destino, 'utf8'), 'o banco de alguém', 'o destino foi tocado antes da recusa');
    igual(restaurar(caminho, destino, { sobrescrever: true }).ok, true, 'pedindo, a restauração não sobrescreveu');
    db.close();
  });

  s.teste('arquivo que não é banco é reprovado, e cópia de esquema antigo sobe até o atual', () => {
    const dir = pasta();
    const lixo = join(dir, 'lixo.db');
    writeFileSync(lixo, 'isto não é sqlite');
    igual(conferirCopia(lixo).ok, false, 'um arquivo qualquer passou como cópia');

    const { db } = bancoVivo(dir);
    const antigo = join(dir, 'antigo.db');
    copiar(db, antigo); db.close();
    const a = abrirBanco(antigo); desmigrar(a, MIGRACOES.length - 1); a.close();
    const c = conferirCopia(antigo);
    igual(c.ok, true, `a cópia de uma versão atrás foi reprovada: ${c.problemas?.join(' | ')}`);
    igual(c.versao, MIGRACOES.length - 1, 'a conferência não disse a versão da cópia');
    const destino = join(dir, 'subiu.db');
    igual(restaurar(antigo, destino).versao, MIGRACOES.length, 'a restauração não migrou a cópia antiga');
  });

  s.teste('a ferramenta de linha de comando faz o ciclo inteiro', () => {
    const dir = pasta();
    const { db } = bancoVivo(dir); db.close();
    const ferramenta = new URL('../tools/banco-copia.mjs', import.meta.url).pathname;
    const rodar = (...a) => execFileSync(process.execPath, ['--no-warnings', ferramenta, ...a], { encoding: 'utf8' });
    ok(/cópia/.test(rodar('copiar', join(dir, 'vivo.db'), join(dir, 'c.db'))), 'copiar não relatou');
    ok(/confere/.test(rodar('conferir', join(dir, 'c.db'))), 'conferir não relatou');
    ok(/restaurad/.test(rodar('restaurar', join(dir, 'c.db'), join(dir, 'r.db'))), 'restaurar não relatou');
    igual(conferirCopia(join(dir, 'r.db')).ok, true, 'o restaurado pela ferramenta não confere');
  });

  return s;
}
