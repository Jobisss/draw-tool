import { select, execute } from "./db";

/** Lê um valor de `setting` (null se ausente). */
export async function getSetting(key: string): Promise<string | null> {
  const rows = await select<{ value: string | null }>(
    "SELECT value FROM setting WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

/** Grava (upsert) um valor em `setting`. */
export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    "INSERT INTO setting (key, value) VALUES ($1, $2) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export const VAULT_PATH_KEY = "vault_path";
