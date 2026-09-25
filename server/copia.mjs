/* A CÓPIA E A RESTAURAÇÃO DO BANCO (ST-7.1b, OBS-01).
 *
 * O piloto põe num arquivo SQLite o saldo, a posse e o histórico de gente de
 * verdade. Até aqui não havia cópia — e o `CRUZAMENTO` de 25/09 anotou o pior
 * tipo de ausência: nenhum documento dizia como voltar de um disco perdido.
 *
 * ── CÓPIA QUE NUNCA FOI RESTAURADA É ESPERANÇA ─────────────────────────────
 *
 * Por isso este arquivo tem as três metades, e o teste roda o ciclo inteiro:
 *
 *   copiar     `VACUUM INTO`: um instante consistente do banco, tirado com o
 *              servidor ligado. Não é `cp` do arquivo — com WAL, o `.db`
 *              sozinho pode estar sem as últimas transações, e copiar no meio
 *              de uma escrita dá um arquivo que abre e mente.
 *   conferir   integridade do SQLite, versão do esquema, e o ledger de cada
 *              conta contra o saldo materializado — a mesma reconciliação que
 *              o servidor usa. Cópia que abre mas não reconcilia não é cópia.
 *   restaurar  confere ANTES de tocar no destino; monta ao lado e só troca no
 *              fim (`rename`), para que uma restauração que falha no meio não
 *              deixe meio banco no lugar do inteiro. Cópia de esquema antigo
 *              sobe pelas migrações de sempre.
 *
 * NADA É SOBRESCRITO SEM PEDIR. Copiar duas vezes no mesmo nome apagaria a
 * cópia boa com a nova — que pode ser justamente a do banco já estragado. */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, statSync, copyFileSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrar, MIGRACOES } from './banco.mjs';
import { reconciliarNoBanco } from './carteira.mjs';

export const ERRO_COPIA = {
  EXISTE:      'destino_ja_existe',
  CONFERENCIA: 'copia_nao_confere',
};
const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

export function copiar(db, destino) {
  if (existsSync(destino)) throw erro(ERRO_COPIA.EXISTE, `já existe uma cópia em ${destino}`);
  mkdirSync(dirname(destino), { recursive: true });
  db.prepare('VACUUM INTO ?').run(destino);
  return { destino, bytes: statSync(destino).size, versao: versaoLida(db) };
}

/* Lê a versão sem criar a tabela: a conferência abre só para leitura. */
const versaoLida = db => {
  const t = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_versao'`).get();
  return t ? (db.prepare('SELECT MAX(versao) AS v FROM schema_versao').get()?.v ?? 0) : 0;
};

export function conferirCopia(caminho) {
  if (!existsSync(caminho)) return { ok: false, problemas: [`não existe: ${caminho}`], versao: null };
  let db;
  try {
    db = new DatabaseSync(caminho, { readOnly: true });
    const integro = db.prepare('PRAGMA integrity_check').all().map(r => Object.values(r)[0]);
    if (integro.length !== 1 || integro[0] !== 'ok')
      return { ok: false, problemas: integro.map(p => `integridade: ${p}`), versao: null };
    const versao = versaoLida(db);
    const problemas = [];
    if (versao === 0) problemas.push('sem versão de esquema — não é um banco do PokéArena');
    if (versao > MIGRACOES.length)
      problemas.push(`esquema ${versao} é mais novo que este código (${MIGRACOES.length})`);
    const usuarios = versao ? db.prepare('SELECT id FROM users').all().map(r => r.id) : [];
    for (const id of usuarios)
      for (const p of reconciliarNoBanco(db, id)) problemas.push(`conta ${id}: ${p} (ledger × saldo)`);
    return { ok: problemas.length === 0, problemas, versao, contas: usuarios.length };
  } catch (e) {
    return { ok: false, problemas: [`não abre como banco: ${e.message}`], versao: null };
  } finally { try { db?.close(); } catch { /* já fechado */ } }
}

export function restaurar(origem, destino, { sobrescrever = false } = {}) {
  if (existsSync(destino) && !sobrescrever)
    return { ok: false, codigo: ERRO_COPIA.EXISTE, problemas: [`${destino} já existe — peça para sobrescrever`] };
  const c = conferirCopia(origem);
  if (!c.ok) return { ok: false, codigo: ERRO_COPIA.CONFERENCIA, problemas: c.problemas };

  const montando = `${destino}.restaurando`;
  rmSync(montando, { force: true });
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(origem, montando);
  const db = new DatabaseSync(montando);
  let versao;
  try { db.exec('PRAGMA foreign_keys = ON'); versao = migrar(db); }
  finally { db.close(); }
  /* O WAL e o índice compartilhado do banco ANTIGO descreveriam páginas que
     não existem no novo — e o SQLite os aplicaria ao abrir. */
  for (const f of [`${destino}-wal`, `${destino}-shm`]) rmSync(f, { force: true });
  renameSync(montando, destino);
  return { ok: true, destino, versao, contas: c.contas };
}
