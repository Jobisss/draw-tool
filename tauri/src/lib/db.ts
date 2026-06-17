import Database from "@tauri-apps/plugin-sql";

// Mesma URL registrada no lib.rs (add_migrations). A migration roda no primeiro load.
const DB_URL = "sqlite:draw-study.db";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load(DB_URL);
  return _db;
}

/** SELECT tipado. Ex: select<Plan>("SELECT * FROM plan WHERE active = $1", [1]) */
export async function select<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

/** INSERT/UPDATE/DELETE. Retorna { rowsAffected, lastInsertId }. */
export async function execute(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.execute(sql, params);
}

/**
 * Reset geral: apaga TODOS os dados das tabelas de usuário (mantém o schema).
 * Não toca em tabelas internas (sqlite_*, _sqlx_*). Uso: testes/debug.
 * Retorna a lista de tabelas limpas.
 */
export async function resetDatabase(): Promise<string[]> {
  const tables = await select<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%'",
  );
  const db = await getDb();
  await db.execute("PRAGMA foreign_keys = OFF");
  for (const { name } of tables) {
    await db.execute(`DELETE FROM "${name}"`);
  }
  // zera autoincrement se a tabela existir
  try {
    await db.execute("DELETE FROM sqlite_sequence");
  } catch {
    /* sem sqlite_sequence — ok */
  }
  await db.execute("PRAGMA foreign_keys = ON");
  return tables.map((t) => t.name);
}

/** Nº de tabelas de usuário — verificação de boot (M0-T3). */
export async function countTables(): Promise<number> {
  const rows = await select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%'",
  );
  return rows[0]?.n ?? 0;
}
