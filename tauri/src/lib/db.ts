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

/** Nº de tabelas de usuário — verificação de boot (M0-T3). */
export async function countTables(): Promise<number> {
  const rows = await select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%'",
  );
  return rows[0]?.n ?? 0;
}
